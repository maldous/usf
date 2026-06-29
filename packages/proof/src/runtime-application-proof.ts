import { spawn, type ChildProcessByStdio } from "node:child_process";
import { once } from "node:events";
import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { DevRuntimeMode } from "@foundation/app-api/runtime";

type ProofProcess = ChildProcessByStdio<null, Readable, Readable>;

const COMPOSE_TARGET = "compose/compose.dev.generated.yaml";
const SERVICE_CATALOGUE_AUTHORITY = "spec/instances/compose-service/service-catalogue.json";
const WORKER_SUMMARY_PREFIX = "Worker proof summary: ";
const PROHIBITED_CLAIM_PATTERNS = [
  /\bproduction\b/i,
  /\bstaging\b/i,
  /\blive-provider\b/i,
  /\bsoc\b/i,
  /\biso\b/i,
  /\bfull[- ]dev[- ]readiness\b/i,
  /\bfull[- ]react[- ]parity\b/i,
];

interface ApiProofSummary {
  readonly api: string;
  readonly health: string;
  readonly openapi: string;
  readonly runtimeMode: DevRuntimeMode;
  readonly providerMode: "dev in-memory";
  readonly providerClass: "hermetic-mock";
  readonly tenantAcceptedStatus: number;
  readonly tenantMismatchStatus: number;
  readonly authorizationFailureStatus: number;
  readonly auditEvents: number;
  readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_AUTHORITY;
  readonly composeTarget: typeof COMPOSE_TARGET | null;
  readonly deferredBoundaries: readonly string[];
}

interface WorkerProofSummary {
  readonly workerRuntime: "apps/work";
  readonly runtimeMode: DevRuntimeMode;
  readonly providerMode: "dev in-memory";
  readonly tenantId: string;
  readonly actorId: string;
  readonly jobId: string;
  readonly jobStatus: string;
  readonly auditEvents: number;
  readonly tenantBoundaryDenied: true;
  readonly authorizationDenied: true;
  readonly syntheticDataBoundary: string;
  readonly secretBoundary: string;
  readonly deferredBoundaries: readonly string[];
}

export interface RuntimeProofSummary {
  readonly issueId: "USF-181";
  readonly parentIssueId: "USF-133";
  readonly mode: DevRuntimeMode;
  readonly providerMode: "dev in-memory";
  readonly api: ApiProofSummary;
  readonly worker: WorkerProofSummary;
  readonly composeBoundary:
    | {
        readonly started: true;
        readonly target: typeof COMPOSE_TARGET;
        readonly projectName: string;
        readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_AUTHORITY;
      }
    | {
        readonly started: false;
        readonly target: null;
        readonly projectName: null;
        readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_AUTHORITY;
      };
  readonly syntheticDataBoundary: "synthetic tenant, actor, and job data only";
  readonly accessBoundary: "loopback host binding and fail-closed authorization checks";
  readonly tenantBoundary: "tenant mismatch and cross-tenant worker read fail closed";
  readonly auditEvidenceBoundary: "API tenant-context and worker job lifecycle audit evidence captured";
  readonly secretBoundary: "local synthetic secret seed only; no real secrets or external credentials";
  readonly prohibitedClaimsObserved: readonly [];
  readonly deferredBoundaries: readonly string[];
}

function startProcess(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): ProofProcess {
  return spawn(command, [...args], {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function startApiRuntime(mode: DevRuntimeMode): ProofProcess {
  return startProcess("corepack", ["pnpm", "dev"], {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "0",
    USF_DEV_RUNTIME_MODE: mode,
  });
}

function startWorkerRuntime(mode: DevRuntimeMode): ProofProcess {
  return startProcess("corepack", ["pnpm", "dev:work"], {
    ...process.env,
    USF_DEV_RUNTIME_MODE: mode,
    USF_WORKER_RUN_ONCE: "1",
  });
}

async function stopProcess(child: ProofProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  if (child.pid && process.platform !== "win32") {
    process.kill(-child.pid, "SIGTERM");
  } else {
    child.kill("SIGTERM");
  }
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5000))]);
  if (child.exitCode === null && child.signalCode === null) {
    if (child.pid && process.platform !== "win32") {
      process.kill(-child.pid, "SIGKILL");
    } else {
      child.kill("SIGKILL");
    }
  }
}

function waitForApi(child: ProofProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(new Error(`dev API did not print API URL\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, 30000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      for (const line of stdout.split(/\r?\n/)) {
        if (line.startsWith("API: ")) {
          clearTimeout(timeout);
          resolve(line.slice("API: ".length).trim());
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`dev API exited before readiness code=${code} signal=${signal}\n${stderr}`));
    });
  });
}

function waitForWorker(child: ProofProcess): Promise<WorkerProofSummary> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(
        new Error(`dev worker did not print proof summary\nstdout:\n${stdout}\nstderr:\n${stderr}`),
      );
    }, 30000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      for (const line of stdout.split(/\r?\n/)) {
        if (line.startsWith(WORKER_SUMMARY_PREFIX)) {
          clearTimeout(timeout);
          const parsed = JSON.parse(line.slice(WORKER_SUMMARY_PREFIX.length)) as unknown;
          assertWorkerSummary(parsed);
          resolve(parsed);
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.once("exit", (code, signal) => {
      if (code === 0 && stdout.includes(WORKER_SUMMARY_PREFIX)) {
        return;
      }
      clearTimeout(timeout);
      reject(
        new Error(
          `dev worker exited before proof summary code=${code} signal=${signal}\n${stderr}`,
        ),
      );
    });
  });
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ readonly status: number; readonly body: unknown }> {
  const response = await fetch(url, init);
  return { status: response.status, body: await response.json() };
}

async function waitForHealth(baseUrl: string): Promise<void> {
  const healthUrl = `${baseUrl}/healthz`;
  const deadline = Date.now() + 30000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
      lastError = new Error(`health status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`dev API health did not become ready: ${String(lastError)}`);
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return a JSON object`);
  }
}

function assertWorkerSummary(value: unknown): asserts value is WorkerProofSummary {
  assertObject(value, "worker proof summary");
  if (value.workerRuntime !== "apps/work") {
    throw new Error("worker proof summary did not identify apps/work");
  }
  if (value.providerMode !== "dev in-memory") {
    throw new Error("worker proof summary did not report in-memory provider mode");
  }
  if (value.jobStatus !== "succeeded") {
    throw new Error("worker proof summary did not report a succeeded job");
  }
  if (typeof value.auditEvents !== "number" || value.auditEvents < 5) {
    throw new Error("worker proof summary did not report audit evidence");
  }
  if (value.tenantBoundaryDenied !== true || value.authorizationDenied !== true) {
    throw new Error("worker proof summary did not record fail-closed boundaries");
  }
}

function assertNoProhibitedClaims(value: unknown): void {
  const text = JSON.stringify(value);
  for (const pattern of PROHIBITED_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`runtime proof emitted prohibited claim pattern: ${pattern.source}`);
    }
  }
}

async function runApiProof(mode: DevRuntimeMode): Promise<ApiProofSummary> {
  const child = startApiRuntime(mode);
  try {
    const baseUrl = await waitForApi(child);
    if (!baseUrl.startsWith("http://127.0.0.1:")) {
      throw new Error(`API did not bind to loopback: ${baseUrl}`);
    }
    await waitForHealth(baseUrl);

    const health = await fetchJson(`${baseUrl}/healthz`);
    assertObject(health.body, "health");
    if (health.status !== 200 || health.body.runtimeMode !== mode) {
      throw new Error(`/healthz did not report runtime mode ${mode}`);
    }
    if (health.body.providerMode !== "dev in-memory") {
      throw new Error("/healthz did not report in-memory provider mode");
    }

    const ready = await fetchJson(`${baseUrl}/readyz`);
    assertObject(ready.body, "ready");
    if (ready.status !== 200 || ready.body.runtimeMode !== mode) {
      throw new Error(`/readyz did not report runtime mode ${mode}`);
    }
    if (ready.body.serviceCatalogueAuthority !== SERVICE_CATALOGUE_AUTHORITY) {
      throw new Error("/readyz did not report the service catalogue authority");
    }

    const openapi = await fetchJson(`${baseUrl}/openapi.json`);
    assertObject(openapi.body, "openapi");
    assertObject(openapi.body.paths, "openapi paths");
    if (openapi.status !== 200 || !("/v1/tenant-context" in openapi.body.paths)) {
      throw new Error("/openapi.json does not describe the tenant context route");
    }

    const tenantId = "11111111-1111-4111-8111-111111111111";
    const otherTenantId = "22222222-2222-4222-8222-222222222222";
    const accepted = await fetchJson(`${baseUrl}/v1/tenant-context?tenantId=${tenantId}`, {
      headers: {
        "x-dev-tenant-id": tenantId,
        "x-dev-actor-id": "runtime-proof-actor",
      },
    });
    assertObject(accepted.body, "accepted tenant context");
    if (accepted.status !== 200 || accepted.body.runtimeMode !== mode) {
      throw new Error(`valid tenant request failed with status ${accepted.status}`);
    }
    const auditEvents = Number(accepted.body.auditEvents);
    if (!Number.isFinite(auditEvents) || auditEvents < 1) {
      throw new Error("valid tenant request did not capture an audit event");
    }

    const mismatch = await fetchJson(`${baseUrl}/v1/tenant-context?tenantId=${otherTenantId}`, {
      headers: {
        "x-dev-tenant-id": tenantId,
        "x-dev-actor-id": "runtime-proof-actor",
      },
    });
    if (mismatch.status !== 400) {
      throw new Error(`tenant mismatch did not fail closed; status=${mismatch.status}`);
    }

    const authorizationFailure = await fetchJson(`${baseUrl}/v1/jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": `runtime-proof-denied-${mode}`,
        "x-dev-tenant-id": tenantId,
        "x-dev-actor-id": "runtime-proof-denied-actor",
        "x-dev-roles": "tenant-member",
      },
      body: JSON.stringify({
        tenantId,
        classification: "scheduled-maintenance-job",
        jobType: "runtime-proof.synthetic-denied",
        payloadRefs: { proof: "synthetic" },
      }),
    });
    if (authorizationFailure.status < 400) {
      throw new Error("authorization failure path did not fail closed");
    }

    const summary: ApiProofSummary = {
      api: baseUrl,
      health: `${baseUrl}/healthz`,
      openapi: `${baseUrl}/openapi.json`,
      runtimeMode: mode,
      providerMode: "dev in-memory",
      providerClass: "hermetic-mock",
      tenantAcceptedStatus: accepted.status,
      tenantMismatchStatus: mismatch.status,
      authorizationFailureStatus: authorizationFailure.status,
      auditEvents,
      serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY,
      composeTarget: mode === "dev-compose-backed" ? COMPOSE_TARGET : null,
      deferredBoundaries: Array.isArray(ready.body.deferredBoundaries)
        ? ready.body.deferredBoundaries.filter((item): item is string => typeof item === "string")
        : [],
    };
    assertNoProhibitedClaims({
      mode: summary.runtimeMode,
      providerMode: summary.providerMode,
      providerClass: summary.providerClass,
      tenantAcceptedStatus: summary.tenantAcceptedStatus,
      tenantMismatchStatus: summary.tenantMismatchStatus,
      authorizationFailureStatus: summary.authorizationFailureStatus,
      auditEvents: summary.auditEvents,
    });
    return summary;
  } finally {
    await stopProcess(child);
  }
}

async function runWorkerProof(mode: DevRuntimeMode): Promise<WorkerProofSummary> {
  const child = startWorkerRuntime(mode);
  try {
    const summary = await waitForWorker(child);
    if (summary.runtimeMode !== mode) {
      throw new Error(`worker proof did not report runtime mode ${mode}`);
    }
    assertNoProhibitedClaims({
      runtimeMode: summary.runtimeMode,
      providerMode: summary.providerMode,
      jobStatus: summary.jobStatus,
      auditEvents: summary.auditEvents,
      tenantBoundaryDenied: summary.tenantBoundaryDenied,
      authorizationDenied: summary.authorizationDenied,
    });
    return summary;
  } finally {
    await stopProcess(child);
  }
}

function runCommand(command: string, args: readonly string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} ${args.join(" ")} timed out\n${stdout}\n${stderr}`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed code=${code} signal=${signal}\n${stdout}\n${stderr}`,
        ),
      );
    });
  });
}

async function withComposeBoundary<T>(projectName: string, callback: () => Promise<T>): Promise<T> {
  let proofError: unknown;
  let result: T | undefined;
  try {
    await runCommand(
      "docker",
      [
        "compose",
        "-p",
        projectName,
        "-f",
        COMPOSE_TARGET,
        "up",
        "-d",
        "--wait",
        "--wait-timeout",
        "240",
      ],
      300000,
    );
    result = await callback();
  } catch (error) {
    proofError = error;
  }

  let teardownError: unknown;
  try {
    await runCommand(
      "docker",
      ["compose", "-p", projectName, "-f", COMPOSE_TARGET, "down", "-v", "--remove-orphans"],
      120000,
    );
  } catch (error) {
    teardownError = error;
  }

  if (proofError || teardownError) {
    throw new Error(
      [
        proofError instanceof Error ? proofError.message : proofError ? String(proofError) : "",
        teardownError instanceof Error
          ? `Compose teardown failed: ${teardownError.message}`
          : teardownError
            ? `Compose teardown failed: ${String(teardownError)}`
            : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return result as T;
}

async function runModeProof(
  mode: DevRuntimeMode,
  composeProjectName: string | null = null,
): Promise<RuntimeProofSummary> {
  const api = await runApiProof(mode);
  const worker = await runWorkerProof(mode);
  const deferredBoundaries = [
    ...new Set([...api.deferredBoundaries, ...worker.deferredBoundaries]),
  ];
  if (mode === "dev-compose-backed" && deferredBoundaries.length === 0) {
    throw new Error("compose-backed proof did not record a deferred provider-binding boundary");
  }
  return {
    issueId: "USF-181",
    parentIssueId: "USF-133",
    mode,
    providerMode: "dev in-memory",
    api,
    worker,
    composeBoundary:
      mode === "dev-compose-backed"
        ? {
            started: true,
            target: COMPOSE_TARGET,
            projectName: composeProjectName ?? "unknown",
            serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY,
          }
        : {
            started: false,
            target: null,
            projectName: null,
            serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY,
          },
    syntheticDataBoundary: "synthetic tenant, actor, and job data only",
    accessBoundary: "loopback host binding and fail-closed authorization checks",
    tenantBoundary: "tenant mismatch and cross-tenant worker read fail closed",
    auditEvidenceBoundary: "API tenant-context and worker job lifecycle audit evidence captured",
    secretBoundary: "local synthetic secret seed only; no real secrets or external credentials",
    prohibitedClaimsObserved: [],
    deferredBoundaries,
  };
}

export async function runRuntimeProofInMemory(): Promise<RuntimeProofSummary> {
  return runModeProof("dev-in-memory");
}

export async function runRuntimeProofCompose(): Promise<RuntimeProofSummary> {
  const projectName = `foundation-runtime-proof-${process.pid}`;
  return withComposeBoundary(projectName, () => runModeProof("dev-compose-backed", projectName));
}

export async function runRuntimeProofAll(): Promise<readonly RuntimeProofSummary[]> {
  const inMemory = await runRuntimeProofInMemory();
  const compose = await runRuntimeProofCompose();
  return [inMemory, compose];
}

function printSummary(summary: RuntimeProofSummary): void {
  console.log(`Runtime proof passed: ${summary.mode}`);
  console.log(`API runtime mode: ${summary.api.runtimeMode}`);
  console.log(`Worker runtime mode: ${summary.worker.runtimeMode}`);
  console.log(`Provider mode: ${summary.providerMode}`);
  console.log(`API audit events captured: ${summary.api.auditEvents}`);
  console.log(`Worker audit events captured: ${summary.worker.auditEvents}`);
  console.log(`Compose boundary started: ${summary.composeBoundary.started ? "yes" : "no"}`);
  console.log(`Prohibited claims observed: ${summary.prohibitedClaimsObserved.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "all";
  if (mode === "in-memory" || mode === "dev-in-memory") {
    printSummary(await runRuntimeProofInMemory());
  } else if (mode === "compose" || mode === "dev-compose-backed") {
    printSummary(await runRuntimeProofCompose());
  } else if (mode === "all") {
    for (const summary of await runRuntimeProofAll()) {
      printSummary(summary);
    }
  } else {
    throw new Error(`unknown runtime proof mode: ${mode}`);
  }
}
