import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LOCALSTACK_ENDPOINT_REF,
  LOCALSTACK_PROVIDER_REGISTRY_ID,
  LOCALSTACK_RUNTIME_PROVIDER_BINDING_ID,
  LOCALSTACK_SDK_PACKAGES,
  LOCALSTACK_SDK_VERSION,
  LOCALSTACK_SERVICE_CATALOGUE_ID,
  LocalStackCloudEmulatorProofAdapter,
  type LocalStackCloudEmulatorEvidence,
} from "@foundation/adapter-resources";
import {
  allocateFetchSafeLoopbackPort,
  assertFetchSafeLoopbackPort,
} from "./safe-loopback-port.ts";

interface LocalStackComposedProofResult {
  readonly status: "pass";
  readonly proof: "localstack-cloud-emulator-composed";
  readonly issueId: "USF-208";
  readonly parentIssueId: "USF-133";
  readonly predecessorIssueIds: readonly ["USF-201", "USF-209", "USF-210"];
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "provider-emulation";
  readonly composeService: "localstack";
  readonly proofCommand: "corepack pnpm proof:localstack";
  readonly implementedServiceIds: readonly ["localstack"];
  readonly deferredServiceIds: readonly [];
  readonly followUpIssueRefs: readonly [];
  readonly resolvedIssueRefs: readonly ["USF-208"];
  readonly serviceCatalogueServiceId: typeof LOCALSTACK_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof LOCALSTACK_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof LOCALSTACK_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackages: typeof LOCALSTACK_SDK_PACKAGES;
  readonly sdkVersion: typeof LOCALSTACK_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof LOCALSTACK_ENDPOINT_REF;
  readonly sourceUse: "official-aws-sdk-v3-localstack-compatible-clients";
  readonly evidence: LocalStackCloudEmulatorEvidence;
  readonly unavailableEvidence: LocalStackCloudEmulatorEvidence;
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
    "no-full-product-readiness",
    "no-usf-133-closure",
  ];
}

const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const COMPOSE_PROFILE = "provider-emulation";
const COMPOSE_SERVICE = "localstack";
const PROOF_COMMAND = "corepack pnpm proof:localstack";
const FORBIDDEN_EVIDENCE_PATTERN =
  /https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|accessKeyId|secretAccessKey|connection_string|stackTrace|at\s+\w+\s+\(|tenant-localstack|corr-localstack|usf-localstack-proof|synthetic-localstack-secret-value|synthetic localstack proof object|synthetic localstack sqs proof|synthetic localstack sns proof/i;
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
  "no-full-product-readiness",
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
  const dir = await mkdtemp(join(tmpdir(), "usf-localstack-proof-"));
  const path = join(dir, "compose.override.yaml");
  const publishedPort = await allocateFetchSafeLoopbackPort("localstack-proof");
  await writeFile(
    path,
    [
      "services:",
      "  localstack:",
      "    ports: !override",
      "      - target: 4566",
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
    "4566",
  ]);
  const match = output.trim().match(/:(\d+)$/);
  if (!match) {
    throw new Error("localstack-proof-port-discovery-failed");
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

async function proveUnavailable(): Promise<LocalStackCloudEmulatorEvidence> {
  const provider = new LocalStackCloudEmulatorProofAdapter({
    endpoint: "http://127.0.0.1:9",
    readinessTimeoutMs: 1000,
    requestTimeoutMs: 250,
  });
  const evidence = await provider.proveUnavailable();
  assert(
    evidence.operationOutcome === "failed-closed",
    "unavailable LocalStack did not fail closed",
  );
  assert(evidence.failClosedDenials === 1, "unavailable LocalStack denial missing");
  return evidence;
}

function assertSafeEvidence(evidence: unknown): void {
  const text = JSON.stringify(evidence);
  if (FORBIDDEN_EVIDENCE_PATTERN.test(text)) {
    throw new Error("localstack-proof-unsafe-evidence");
  }
}

export async function runLocalStackComposedProof(): Promise<LocalStackComposedProofResult> {
  const projectName = `usf-localstack-proof-${process.pid}`;
  const override = await writeComposeOverride();
  let evidence: LocalStackCloudEmulatorEvidence | undefined;
  let unavailableEvidence: LocalStackCloudEmulatorEvidence | undefined;
  try {
    await composeUp(projectName, override.path);
    const port = await composePort(projectName, override.path);
    assert(
      port === override.publishedPort,
      "LocalStack proof port did not match the safe published port",
    );
    assertFetchSafeLoopbackPort(port, "localstack-proof-selected-fetch-forbidden-port");
    const provider = new LocalStackCloudEmulatorProofAdapter({
      endpoint: `http://127.0.0.1:${port}`,
    });
    evidence = await provider.proveConfiguredCloudEmulatorBehaviour();
    unavailableEvidence = await proveUnavailable();
  } finally {
    try {
      await composeDown(projectName, override.path);
    } finally {
      await rm(override.dir, { recursive: true, force: true });
    }
  }

  if (!evidence || !unavailableEvidence) {
    throw new Error("localstack-proof-missing-evidence");
  }
  assert(evidence.readinessChecked, "LocalStack readiness was not checked");
  assert(
    evidence.readinessRetryPolicy === "bounded-exponential-backoff-60s",
    "readiness retry missing",
  );
  assert(evidence.s3RoundTripChecked, "LocalStack S3 round trip missing");
  assert(evidence.sqsRoundTripChecked, "LocalStack SQS round trip missing");
  assert(evidence.snsPublishChecked, "LocalStack SNS publish missing");
  assert(evidence.secretsManagerRoundTripChecked, "LocalStack Secrets Manager round trip missing");
  assert(evidence.cleanupAttempted && evidence.cleanupSucceeded, "LocalStack cleanup missing");
  assert(evidence.noExternalEgressChecked, "LocalStack no-egress boundary missing");
  assert(evidence.syntheticDataChecked, "LocalStack synthetic-data boundary missing");
  assert(evidence.tenantSafeEvidenceChecked, "LocalStack tenant-safe evidence missing");
  assert(evidence.redactionChecked, "LocalStack redaction evidence missing");
  assert(evidence.auditEvidenceCaptured, "LocalStack audit evidence missing");
  assert(evidence.metricEvidenceCaptured, "LocalStack metric evidence missing");
  assert(evidence.traceEvidenceCaptured, "LocalStack trace evidence missing");
  assert(
    unavailableEvidence.operationOutcome === "failed-closed",
    "LocalStack failure did not fail closed",
  );
  assertSafeEvidence(evidence);
  assertSafeEvidence(unavailableEvidence);

  return Object.freeze({
    status: "pass",
    proof: "localstack-cloud-emulator-composed",
    issueId: "USF-208",
    parentIssueId: "USF-133",
    predecessorIssueIds: ["USF-201", "USF-209", "USF-210"] as const,
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    composeService: COMPOSE_SERVICE,
    proofCommand: PROOF_COMMAND,
    implementedServiceIds: ["localstack"] as const,
    deferredServiceIds: [] as const,
    followUpIssueRefs: [] as const,
    resolvedIssueRefs: ["USF-208"] as const,
    serviceCatalogueServiceId: LOCALSTACK_SERVICE_CATALOGUE_ID,
    providerRegistryId: LOCALSTACK_PROVIDER_REGISTRY_ID,
    bindingId: LOCALSTACK_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackages: LOCALSTACK_SDK_PACKAGES,
    sdkVersion: LOCALSTACK_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    endpointRef: LOCALSTACK_ENDPOINT_REF,
    sourceUse: "official-aws-sdk-v3-localstack-compatible-clients",
    evidence,
    unavailableEvidence,
    providerUnavailableChecked: true,
    checks: [
      "LocalStack container started from canonical test Compose with provider-emulation profile",
      "LocalStack host exposure used a preselected Fetch-safe ephemeral loopback port",
      "LocalStack readiness used bounded SDK-backed S3 ListBuckets retry",
      "official AWS SDK v3 S3 client performed synthetic bucket object write read and cleanup",
      "official AWS SDK v3 SQS client performed synthetic queue send receive and cleanup",
      "official AWS SDK v3 SNS client performed synthetic topic publish and cleanup",
      "official AWS SDK v3 Secrets Manager client performed synthetic secret write read and cleanup",
      "unavailable endpoint failed closed with safe reason code",
      "tenant, synthetic-data, no-egress, audit, metric, trace, cleanup, and redaction evidence captured",
      "no live cloud-provider compatibility or provider certification claim emitted",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: [
      "live-cloud-provider-compatibility-not-claimed",
      "provider-contract-certification-not-claimed",
      "api-worker-runtime-binding-not-claimed",
      "staging-production-provider-readiness-not-claimed",
    ],
    nonClaims: NON_CLAIMS,
  });
}

if (process.argv[1]?.endsWith("localstack-composed-proof.ts")) {
  runLocalStackComposedProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      const safeMessage = error instanceof Error ? error.message : "localstack proof failed";
      console.error(JSON.stringify({ status: "fail", error: safeMessage }, null, 2));
      process.exitCode = 1;
    });
}
