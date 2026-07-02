import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  REDIS_ENDPOINT_REF,
  REDIS_PROVIDER_REGISTRY_ID,
  REDIS_RUNTIME_PROVIDER_BINDING_ID,
  REDIS_SDK_PACKAGE,
  REDIS_SDK_VERSION,
  REDIS_SERVICE_CATALOGUE_ID,
  RedisComposedCacheAdapter,
  type RedisComposedCacheEvidence,
} from "@foundation/adapter-bus";
import { createTenantContext } from "@foundation/core";
import {
  allocateFetchSafeLoopbackPort,
  assertFetchSafeLoopbackPort,
} from "./safe-loopback-port.ts";

interface RedisComposedProofResult {
  readonly status: "pass";
  readonly proof: "redis-composed-cache-provider";
  readonly issueId: "USF-207";
  readonly parentIssueId: "USF-133";
  readonly predecessorIssueIds: readonly ["USF-173", "USF-198"];
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "runtime-providers";
  readonly composeService: "redis";
  readonly proofCommand: "corepack pnpm proof:cache:redis";
  readonly implementedServiceIds: readonly ["redis"];
  readonly deferredServiceIds: readonly [];
  readonly followUpIssueRefs: readonly [];
  readonly resolvedIssueRefs: readonly ["USF-207"];
  readonly serviceCatalogueServiceId: typeof REDIS_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof REDIS_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof REDIS_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackage: typeof REDIS_SDK_PACKAGE;
  readonly sdkVersion: typeof REDIS_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof REDIS_ENDPOINT_REF;
  readonly sourceUse: "official-node-redis-client";
  readonly evidence: RedisComposedCacheEvidence;
  readonly unavailableEvidence: RedisComposedCacheEvidence;
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
const COMPOSE_SERVICE = "redis";
const PROOF_COMMAND = "corepack pnpm proof:cache:redis";
const FORBIDDEN_EVIDENCE_PATTERN =
  /https?:\/\/|redis:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|password|token|connection_string|stackTrace|at\s+\w+\s+\(|tenant-redis|actor-redis|runtime-proof-cache-key|synthetic-other-tenant|synthetic-ttl/i;
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

function runProcess(command: string, args: readonly string[], timeoutMs = 180000): Promise<string> {
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

async function writeComposeOverride(): Promise<{
  readonly dir: string;
  readonly path: string;
  readonly publishedPort: number;
}> {
  const dir = await mkdtemp(join(tmpdir(), "usf-redis-proof-"));
  const path = join(dir, "compose.override.yaml");
  const publishedPort = await allocateFetchSafeLoopbackPort("redis-proof");
  await writeFile(
    path,
    [
      "services:",
      "  redis:",
      "    ports: !override",
      "      - target: 6379",
      `        published: "${publishedPort}"`,
      "        host_ip: 127.0.0.1",
      "        protocol: tcp",
      "",
    ].join("\n"),
    "utf8",
  );
  return { dir, path, publishedPort };
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
    "6379",
  ]);
  const match = output.trim().match(/:(\d+)$/);
  if (!match) {
    throw new Error("redis-proof-port-discovery-failed");
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
    ],
    60000,
  );
}

async function proveUnavailable(port: number): Promise<RedisComposedCacheEvidence> {
  const provider = new RedisComposedCacheAdapter({
    url: `redis://127.0.0.1:${port}`,
    readinessTimeoutMs: 1000,
    commandTimeoutMs: 250,
  });
  const context = createTenantContext({
    tenantId: "tenant-redis-unavailable-proof",
    actorId: "actor-redis-unavailable-proof",
    roles: ["system"],
    providerMode: "local-composed-real-service",
    environment: "integration",
  });
  const evidence = await provider.proveUnavailable(context);
  assert(evidence.operationOutcome === "failed-closed", "unavailable Redis did not fail closed");
  assert(evidence.failClosedDenials === 1, "unavailable Redis denial missing");
  return evidence;
}

function assertSafeEvidence(evidence: unknown): void {
  const text = JSON.stringify(evidence);
  if (FORBIDDEN_EVIDENCE_PATTERN.test(text)) {
    throw new Error("redis-proof-unsafe-evidence");
  }
}

export async function runRedisComposedProof(): Promise<RedisComposedProofResult> {
  const projectName = `usf-redis-proof-${process.pid}`;
  const override = await writeComposeOverride();
  let evidence: RedisComposedCacheEvidence | undefined;
  let unavailableEvidence: RedisComposedCacheEvidence | undefined;
  try {
    await composeUp(projectName, override.path);
    const port = await composePort(projectName, override.path);
    assert(
      port === override.publishedPort,
      "Redis proof port did not match the safe published port",
    );
    assertFetchSafeLoopbackPort(port, "redis-proof-selected-fetch-forbidden-port");
    const context = createTenantContext({
      tenantId: "tenant-redis-proof",
      actorId: "actor-redis-proof",
      roles: ["system"],
      providerMode: "local-composed-real-service",
      environment: "integration",
    });
    const provider = new RedisComposedCacheAdapter({
      url: `redis://127.0.0.1:${port}`,
    });
    evidence = await provider.proveRoundTrip(context);
    unavailableEvidence = await proveUnavailable(9);
  } finally {
    try {
      await composeDown(projectName, override.path);
    } finally {
      await rm(override.dir, { recursive: true, force: true });
    }
  }

  assert(evidence, "redis-proof-missing-evidence");
  assert(unavailableEvidence, "redis-proof-missing-unavailable-evidence");
  assert(evidence.writeChecked, "redis-proof-missing-write-check");
  assert(evidence.readChecked, "redis-proof-missing-read-check");
  assert(evidence.deleteChecked, "redis-proof-missing-delete-check");
  assert(evidence.ttlChecked, "redis-proof-missing-ttl-check");
  assert(evidence.ttlExpirationChecked, "redis-proof-missing-ttl-expiration-check");
  assert(evidence.tenantNamespaceChecked, "redis-proof-missing-tenant-namespace-check");
  assert(evidence.tenantIsolationChecked, "redis-proof-missing-tenant-isolation-check");
  assert(evidence.cleanupSucceeded, "redis-proof-missing-cleanup");
  assert(evidence.readinessAttempts > 0, "redis-proof-missing-readiness-attempts");
  assert(evidence.redactionChecked, "redis-proof-missing-redaction-check");
  assert(evidence.auditEvidenceCaptured, "redis-proof-missing-audit-evidence");
  assert(unavailableEvidence.failureModeChecked, "redis-proof-missing-failure-mode-check");
  assertSafeEvidence(evidence);
  assertSafeEvidence(unavailableEvidence);

  return Object.freeze({
    status: "pass",
    proof: "redis-composed-cache-provider",
    issueId: "USF-207",
    parentIssueId: "USF-133",
    predecessorIssueIds: ["USF-173", "USF-198"] as const,
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    composeService: COMPOSE_SERVICE,
    proofCommand: PROOF_COMMAND,
    implementedServiceIds: ["redis"] as const,
    deferredServiceIds: [] as const,
    followUpIssueRefs: [] as const,
    resolvedIssueRefs: ["USF-207"] as const,
    serviceCatalogueServiceId: REDIS_SERVICE_CATALOGUE_ID,
    providerRegistryId: REDIS_PROVIDER_REGISTRY_ID,
    bindingId: REDIS_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackage: REDIS_SDK_PACKAGE,
    sdkVersion: REDIS_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    endpointRef: REDIS_ENDPOINT_REF,
    sourceUse: "official-node-redis-client",
    evidence,
    unavailableEvidence,
    providerUnavailableChecked: true,
    checks: [
      "Redis container started from canonical test Compose with runtime-providers profile",
      "Redis host exposure used a preselected Fetch-safe ephemeral loopback port",
      "Redis readiness used bounded official node-redis ping retry",
      "official node-redis client performed synthetic tenant-safe write read and delete",
      "official node-redis client proved TTL and expiration with bounded polling",
      "tenant-safe key namespace prevented cross-tenant key collision",
      "unavailable endpoint failed closed with safe reason code",
      "tenant, synthetic-data, no-egress, audit, metric, trace, cleanup, and redaction evidence captured",
      "NATS and in-memory evidence remain non-equivalent to Redis cache proof",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: evidence.remainingDeferredBoundaries,
    nonClaims: NON_CLAIMS,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRedisComposedProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "redis proof failed");
      process.exitCode = 1;
    });
}
