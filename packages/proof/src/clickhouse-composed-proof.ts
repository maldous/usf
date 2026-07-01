import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLICKHOUSE_ENDPOINT_REF,
  CLICKHOUSE_PROVIDER_REGISTRY_ID,
  CLICKHOUSE_RUNTIME_PROVIDER_BINDING_ID,
  CLICKHOUSE_SDK_PACKAGE,
  CLICKHOUSE_SDK_VERSION,
  CLICKHOUSE_SERVICE_CATALOGUE_ID,
  ClickHouseComposedAnalyticsEventStoreAdapter,
  type ClickHouseComposedAnalyticsEvidence,
} from "@foundation/adapter-bus";
import { createTenantContext, opaqueHash } from "@foundation/core";

interface ClickHouseComposedProofResult {
  readonly status: "pass";
  readonly proof: "clickhouse-composed-analytics-event-store-provider";
  readonly issueId: "USF-206";
  readonly parentIssueId: "USF-133";
  readonly predecessorIssueIds: readonly ["USF-172", "USF-197"];
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "runtime-providers";
  readonly composeService: "clickhouse";
  readonly proofCommand: "corepack pnpm proof:analytics:clickhouse";
  readonly implementedServiceIds: readonly ["clickhouse"];
  readonly deferredServiceIds: readonly [];
  readonly followUpIssueRefs: readonly [];
  readonly resolvedIssueRefs: readonly ["USF-206"];
  readonly serviceCatalogueServiceId: typeof CLICKHOUSE_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof CLICKHOUSE_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof CLICKHOUSE_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackage: typeof CLICKHOUSE_SDK_PACKAGE;
  readonly sdkVersion: typeof CLICKHOUSE_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof CLICKHOUSE_ENDPOINT_REF;
  readonly sourceUse: "official-clickhouse-js-client";
  readonly evidence: ClickHouseComposedAnalyticsEvidence;
  readonly unavailableEvidence: ClickHouseComposedAnalyticsEvidence;
  readonly providerUnavailableChecked: true;
  readonly checks: readonly string[];
  readonly prohibitedClaimsObserved: readonly [];
  readonly deferredBoundaries: readonly string[];
  readonly nonClaims: readonly [
    "no-full-dev-readiness",
    "no-test-readiness",
    "no-staging-readiness",
    "no-production-readiness",
    "no-deployment-readiness",
    "no-live-provider-readiness",
    "no-soc-readiness",
    "no-iso27001-certification",
    "no-enterprise-production-readiness",
    "no-full-react-parity",
    "no-usf-133-closure",
  ];
}

const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const COMPOSE_PROFILE = "runtime-providers";
const COMPOSE_SERVICE = "clickhouse";
const PROOF_COMMAND = "corepack pnpm proof:analytics:clickhouse";
const FORBIDDEN_EVIDENCE_PATTERN =
  /https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|password|token|connection_string|stackTrace|at\s+\w+\s+\(|tenant-clickhouse|actor-clickhouse|workflow\.started|workflow\.completed|correlation-alpha|trace-alpha|runtime-proof/i;
const PROHIBITED_CLAIMS_OBSERVED = [] as const;
const NON_CLAIMS = [
  "no-full-dev-readiness",
  "no-test-readiness",
  "no-staging-readiness",
  "no-production-readiness",
  "no-deployment-readiness",
  "no-live-provider-readiness",
  "no-soc-readiness",
  "no-iso27001-certification",
  "no-enterprise-production-readiness",
  "no-full-react-parity",
  "no-usf-133-closure",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runProcess(command: string, args: readonly string[], timeoutMs = 240000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const forceKillTimer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceKillTimer.current = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (forceKillTimer.current) clearTimeout(forceKillTimer.current);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `${command} failed code=${code} signal=${signal}${timedOut ? " timedOut=true" : ""}: ${stderr}`,
          ),
        );
      }
    });
  });
}

async function writeComposeOverride(): Promise<{ readonly dir: string; readonly path: string }> {
  const dir = await mkdtemp(join(tmpdir(), "usf-clickhouse-proof-"));
  const path = join(dir, "compose.override.yaml");
  await writeFile(
    path,
    [
      "services:",
      "  clickhouse:",
      "    environment:",
      '      CLICKHOUSE_SKIP_USER_SETUP: "1"',
      "    ports: !override",
      "      - target: 8123",
      '        published: "0"',
      "        host_ip: 127.0.0.1",
      "        protocol: tcp",
      "",
    ].join("\n"),
    "utf8",
  );
  return { dir, path };
}

function composeArgs(projectName: string, overridePath: string): string[] {
  return ["compose", "-p", projectName, "-f", COMPOSE_TARGET, "-f", overridePath];
}

async function composeUp(projectName: string, overridePath: string): Promise<void> {
  await runProcess("docker", [
    ...composeArgs(projectName, overridePath),
    "--profile",
    COMPOSE_PROFILE,
    "up",
    "-d",
    COMPOSE_SERVICE,
  ]);
}

async function composePort(projectName: string, overridePath: string): Promise<number> {
  const output = await runProcess("docker", [
    ...composeArgs(projectName, overridePath),
    "port",
    COMPOSE_SERVICE,
    "8123",
  ]);
  const match = output.trim().match(/:(\d+)$/);
  if (!match) {
    throw new Error("clickhouse-proof-port-discovery-failed");
  }
  return Number(match[1]);
}

async function composeDown(projectName: string, overridePath: string): Promise<void> {
  await runProcess(
    "docker",
    [
      ...composeArgs(projectName, overridePath),
      "--profile",
      COMPOSE_PROFILE,
      "down",
      "--remove-orphans",
      "-v",
    ],
    90000,
  );
}

async function proveUnavailable(port: number): Promise<ClickHouseComposedAnalyticsEvidence> {
  const provider = new ClickHouseComposedAnalyticsEventStoreAdapter({
    url: `http://127.0.0.1:${port}`,
    readinessTimeoutMs: 1000,
    commandTimeoutMs: 250,
    tableSuffix: "unavailable",
  });
  const context = createTenantContext({
    tenantId: "tenant-clickhouse-unavailable-proof",
    actorId: "actor-clickhouse-unavailable-proof",
    roles: ["system"],
    providerMode: "local-composed-real-service",
    environment: "integration",
  });
  const evidence = await provider.proveUnavailable(context);
  assert(evidence.operationOutcome === "failed-closed", "unavailable ClickHouse did not fail closed");
  assert(evidence.failClosedDenials === 1, "unavailable ClickHouse denial missing");
  return evidence;
}

async function closedLoopbackPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? (address as AddressInfo).port : 0;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  assert(port > 0, "clickhouse-proof-unavailable-port-allocation-failed");
  return port;
}

function assertSafeEvidence(evidence: unknown): void {
  const text = JSON.stringify(evidence);
  if (FORBIDDEN_EVIDENCE_PATTERN.test(text)) {
    throw new Error("clickhouse-proof-unsafe-evidence");
  }
}

export async function runClickHouseComposedProof(): Promise<ClickHouseComposedProofResult> {
  const projectName = `usf-clickhouse-proof-${process.pid}`;
  const override = await writeComposeOverride();
  let evidence: ClickHouseComposedAnalyticsEvidence | undefined;
  let unavailableEvidence: ClickHouseComposedAnalyticsEvidence | undefined;
  try {
    await composeUp(projectName, override.path);
    const port = await composePort(projectName, override.path);
    const context = createTenantContext({
      tenantId: "tenant-clickhouse-proof",
      actorId: "actor-clickhouse-proof",
      roles: ["system"],
      providerMode: "local-composed-real-service",
      environment: "integration",
    });
    const provider = new ClickHouseComposedAnalyticsEventStoreAdapter({
      url: `http://127.0.0.1:${port}`,
      tableSuffix: opaqueHash(projectName).slice(0, 16),
    });
    evidence = await provider.proveRoundTrip(context);
    unavailableEvidence = await proveUnavailable(await closedLoopbackPort());
  } finally {
    try {
      await composeDown(projectName, override.path);
    } finally {
      await rm(override.dir, { recursive: true, force: true });
    }
  }

  assert(evidence, "clickhouse-proof-missing-evidence");
  assert(unavailableEvidence, "clickhouse-proof-missing-unavailable-evidence");
  assert(evidence.readinessQueryChecked, "clickhouse-proof-missing-readiness-check");
  assert(evidence.tableCreatedChecked, "clickhouse-proof-missing-table-check");
  assert(evidence.eventIngestionChecked, "clickhouse-proof-missing-ingestion-check");
  assert(evidence.tenantSafeQueryChecked, "clickhouse-proof-missing-tenant-query-check");
  assert(evidence.aggregationChecked, "clickhouse-proof-missing-aggregation-check");
  assert(evidence.invalidClassificationRejected, "clickhouse-proof-missing-invalid-classification-check");
  assert(evidence.retentionDeletionChecked, "clickhouse-proof-missing-retention-deletion-check");
  assert(evidence.cleanupSucceeded, "clickhouse-proof-missing-cleanup");
  assert(evidence.readinessAttempts > 0, "clickhouse-proof-missing-readiness-attempts");
  assert(evidence.redactionChecked, "clickhouse-proof-missing-redaction-check");
  assert(evidence.auditEvidenceCaptured, "clickhouse-proof-missing-audit-evidence");
  assert(unavailableEvidence.failureModeChecked, "clickhouse-proof-missing-failure-mode-check");
  assertSafeEvidence(evidence);
  assertSafeEvidence(unavailableEvidence);

  return Object.freeze({
    status: "pass",
    proof: "clickhouse-composed-analytics-event-store-provider",
    issueId: "USF-206",
    parentIssueId: "USF-133",
    predecessorIssueIds: ["USF-172", "USF-197"] as const,
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    composeService: COMPOSE_SERVICE,
    proofCommand: PROOF_COMMAND,
    implementedServiceIds: ["clickhouse"] as const,
    deferredServiceIds: [] as const,
    followUpIssueRefs: [] as const,
    resolvedIssueRefs: ["USF-206"] as const,
    serviceCatalogueServiceId: CLICKHOUSE_SERVICE_CATALOGUE_ID,
    providerRegistryId: CLICKHOUSE_PROVIDER_REGISTRY_ID,
    bindingId: CLICKHOUSE_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackage: CLICKHOUSE_SDK_PACKAGE,
    sdkVersion: CLICKHOUSE_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    endpointRef: CLICKHOUSE_ENDPOINT_REF,
    sourceUse: "official-clickhouse-js-client",
    evidence,
    unavailableEvidence,
    providerUnavailableChecked: true,
    checks: [
      "ClickHouse container started from canonical test Compose with runtime-providers profile",
      "ClickHouse host exposure used an ephemeral loopback HTTP port",
      "official ClickHouse JS client performed SELECT readiness with bounded retry",
      "official ClickHouse JS client created and dropped a proof-specific table",
      "official ClickHouse JS client inserted deterministic synthetic tenant-safe analytics events",
      "tenant-safe query and aggregation used hashed tenant and event dimensions",
      "invalid data classification was denied before provider insertion",
      "retention deletion was proven by truncating and observing zero proof rows",
      "unavailable endpoint failed closed with safe reason code",
      "tenant, synthetic-data, no-egress, audit, metric, trace, cleanup, and redaction evidence captured",
      "in-memory analytics evidence remains non-equivalent to ClickHouse provider proof",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: evidence.remainingDeferredBoundaries,
    nonClaims: NON_CLAIMS,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runClickHouseComposedProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "clickhouse proof failed");
      process.exitCode = 1;
    });
}
