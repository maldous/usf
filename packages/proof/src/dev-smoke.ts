import { spawn, type ChildProcessByStdio } from "node:child_process";
import { once } from "node:events";
import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

type DevProcess = ChildProcessByStdio<null, Readable, Readable>;

interface SmokeSummary {
  readonly api: string;
  readonly health: string;
  readonly openapi: string;
  readonly providerMode: "dev in-memory";
  readonly tenantAcceptedStatus: number;
  readonly tenantMismatchStatus: number;
  readonly auditEvents: number;
}

function startDevRuntime(): DevProcess {
  return spawn("corepack", ["pnpm", "dev"], {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function stopDevRuntime(child: DevProcess): Promise<void> {
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

function waitForApi(child: DevProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(
        new Error(`dev runtime did not print API URL\nstdout:\n${stdout}\nstderr:\n${stderr}`),
      );
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
      reject(
        new Error(`dev runtime exited before readiness code=${code} signal=${signal}\n${stderr}`),
      );
    });
  });
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
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
  throw new Error(`dev runtime health did not become ready: ${String(lastError)}`);
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return a JSON object`);
  }
}

export async function runDevSmoke(): Promise<SmokeSummary> {
  const child = startDevRuntime();
  try {
    const baseUrl = await waitForApi(child);
    await waitForHealth(baseUrl);

    const health = await fetchJson(`${baseUrl}/healthz`);
    if (health.status !== 200) {
      throw new Error(`/healthz failed with status ${health.status}`);
    }

    const ready = await fetchJson(`${baseUrl}/readyz`);
    if (ready.status !== 200) {
      throw new Error(`/readyz failed with status ${ready.status}`);
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
        "x-dev-actor-id": "dev-smoke-actor",
      },
    });
    assertObject(accepted.body, "accepted tenant context");
    if (accepted.status !== 200) {
      throw new Error(`valid tenant request failed with status ${accepted.status}`);
    }
    const auditEvents = Number(accepted.body.auditEvents);
    if (!Number.isFinite(auditEvents) || auditEvents < 1) {
      throw new Error("valid tenant request did not capture an audit event");
    }

    const mismatch = await fetchJson(`${baseUrl}/v1/tenant-context?tenantId=${otherTenantId}`, {
      headers: {
        "x-dev-tenant-id": tenantId,
        "x-dev-actor-id": "dev-smoke-actor",
      },
    });
    if (mismatch.status !== 400) {
      throw new Error(`tenant mismatch did not fail closed; status=${mismatch.status}`);
    }

    return {
      api: baseUrl,
      health: `${baseUrl}/healthz`,
      openapi: `${baseUrl}/openapi.json`,
      providerMode: "dev in-memory",
      tenantAcceptedStatus: accepted.status,
      tenantMismatchStatus: mismatch.status,
      auditEvents,
    };
  } finally {
    await stopDevRuntime(child);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runDevSmoke();
  console.log("USF V2 dev-smoke passed");
  console.log(`API: ${result.api}`);
  console.log(`Health: ${result.health}`);
  console.log(`OpenAPI: ${result.openapi}`);
  console.log(`Provider mode: ${result.providerMode}`);
  console.log(`Tenant accepted: ${result.tenantAcceptedStatus}`);
  console.log(`Tenant mismatch: ${result.tenantMismatchStatus}`);
  console.log(`Audit events captured: ${result.auditEvents}`);
}
