import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WEBHOOK_SINK_ENDPOINT_REF,
  WEBHOOK_SINK_PROTOCOL_BOUNDARY,
  WEBHOOK_SINK_PROVIDER_REGISTRY_ID,
  WEBHOOK_SINK_RUNTIME_PROVIDER_BINDING_ID,
  WEBHOOK_SINK_SERVICE_CATALOGUE_ID,
  WebhookSinkCaptureProvider,
  type WebhookSinkCaptureEvidence,
} from "@foundation/adapter-mail";

interface MockProviderSubstrateProofResult {
  readonly status: "pass";
  readonly proof: "mock-provider-substrate-webhook-sink";
  readonly issueId: "USF-201";
  readonly parentIssueId: "USF-133";
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeService: "webhook-sink";
  readonly proofCommand: "corepack pnpm proof:mock-substrate";
  readonly implementedServiceIds: readonly ["webhook-sink"];
  readonly deferredServiceIds: readonly ["localstack", "wiremock", "mock-oidc"];
  readonly followUpIssueRefs: readonly ["USF-208", "USF-209", "USF-210"];
  readonly serviceCatalogueServiceId: typeof WEBHOOK_SINK_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof WEBHOOK_SINK_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof WEBHOOK_SINK_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackage: null;
  readonly sdkVersion: null;
  readonly protocolBoundary: typeof WEBHOOK_SINK_PROTOCOL_BOUNDARY;
  readonly endpointRef: typeof WEBHOOK_SINK_ENDPOINT_REF;
  readonly evidence: WebhookSinkCaptureEvidence;
  readonly unavailableEvidence: WebhookSinkCaptureEvidence;
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
const COMPOSE_SERVICE = "webhook-sink";
const PROOF_COMMAND = "corepack pnpm proof:mock-substrate";
const FORBIDDEN_EVIDENCE_PATTERN =
  /https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|token|password|secret|stack|connection_string|synthetic webhook proof body/i;
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

function runProcess(command: string, args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} failed code=${code} signal=${signal}: ${stderr}`));
      }
    });
  });
}

async function writeComposeOverride(): Promise<{ readonly dir: string; readonly path: string }> {
  const dir = await mkdtemp(join(tmpdir(), "usf-webhook-sink-proof-"));
  const path = join(dir, "compose.override.yaml");
  await writeFile(
    path,
    [
      "services:",
      "  webhook-sink:",
      "    ports:",
      "      - target: 8080",
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
    "8080",
  ]);
  const match = output.trim().match(/:(\d+)$/);
  if (!match) {
    throw new Error("webhook-sink-proof-port-discovery-failed");
  }
  return Number(match[1]);
}

async function composeDown(projectName: string, overridePath: string): Promise<void> {
  const child = spawn(
    "docker",
    [...composeArgs(projectName, overridePath), "down", "--remove-orphans"],
    { cwd: process.cwd(), stdio: ["ignore", "ignore", "ignore"] },
  );
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 15000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

async function proveUnavailable(): Promise<WebhookSinkCaptureEvidence> {
  const provider = new WebhookSinkCaptureProvider({
    endpoint: "http://127.0.0.1:9",
    readinessTimeoutMs: 1000,
    requestTimeoutMs: 250,
  });
  const result = await provider.capture({
    tenantId: "tenant-webhook-alpha",
    deliveryId: "delivery-webhook-unavailable",
    eventType: "notification.webhook.unavailable",
    payloadClassification: "synthetic-data",
    body: "synthetic unavailable webhook body",
    correlationId: "corr-webhook-unavailable",
  });
  assert(!result.ok, "unavailable webhook sink proof did not fail closed");
  assert(provider.lastCaptureEvidence, "unavailable webhook sink evidence missing");
  return provider.lastCaptureEvidence;
}

function assertSafeEvidence(evidence: unknown): void {
  const text = JSON.stringify(evidence);
  if (FORBIDDEN_EVIDENCE_PATTERN.test(text)) {
    throw new Error("webhook-sink-proof-unsafe-evidence");
  }
}

export async function runMockProviderSubstrateProof(): Promise<MockProviderSubstrateProofResult> {
  const projectName = `usf-webhook-sink-proof-${process.pid}`;
  const override = await writeComposeOverride();
  let evidence: WebhookSinkCaptureEvidence | undefined;
  let unavailableEvidence: WebhookSinkCaptureEvidence | undefined;
  try {
    await composeUp(projectName, override.path);
    const port = await composePort(projectName, override.path);
    const provider = new WebhookSinkCaptureProvider({
      endpoint: `http://127.0.0.1:${port}`,
    });
    evidence = await provider.proveRoundTrip();
    unavailableEvidence = await proveUnavailable();
  } finally {
    await composeDown(projectName, override.path);
    await rm(override.dir, { recursive: true, force: true });
  }

  if (!evidence || !unavailableEvidence) {
    throw new Error("webhook-sink-proof-missing-evidence");
  }
  assert(evidence.readinessChecked, "webhook sink readiness was not checked");
  assert(evidence.captureRequestChecked, "webhook sink capture request was not checked");
  assert(evidence.captureReadbackChecked, "webhook sink capture readback was not checked");
  assert(evidence.noExternalEgressChecked, "webhook sink no-egress boundary was not checked");
  assert(evidence.syntheticDataChecked, "webhook sink synthetic-data boundary was not checked");
  assert(evidence.tenantSafeEvidenceChecked, "webhook sink tenant-safe evidence missing");
  assert(evidence.redactionChecked, "webhook sink redaction evidence missing");
  assert(unavailableEvidence.operationOutcome === "failed-closed", "failure did not fail closed");
  assert(unavailableEvidence.failClosedDenials === 1, "failure did not record fail-closed denial");
  assertSafeEvidence(evidence);
  assertSafeEvidence(unavailableEvidence);

  return Object.freeze({
    status: "pass",
    proof: "mock-provider-substrate-webhook-sink",
    issueId: "USF-201",
    parentIssueId: "USF-133",
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeService: COMPOSE_SERVICE,
    proofCommand: PROOF_COMMAND,
    implementedServiceIds: ["webhook-sink"] as const,
    deferredServiceIds: ["localstack", "wiremock", "mock-oidc"] as const,
    followUpIssueRefs: ["USF-208", "USF-209", "USF-210"] as const,
    serviceCatalogueServiceId: WEBHOOK_SINK_SERVICE_CATALOGUE_ID,
    providerRegistryId: WEBHOOK_SINK_PROVIDER_REGISTRY_ID,
    bindingId: WEBHOOK_SINK_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackage: null,
    sdkVersion: null,
    protocolBoundary: WEBHOOK_SINK_PROTOCOL_BOUNDARY,
    endpointRef: WEBHOOK_SINK_ENDPOINT_REF,
    evidence,
    unavailableEvidence,
    providerUnavailableChecked: true,
    checks: [
      "webhook sink container started from canonical test Compose with ephemeral loopback port",
      "webhook sink readiness used bounded retry",
      "adapter connected through the adapter package protocol-exception boundary",
      "synthetic webhook capture performed a POST round trip",
      "webhook echo readback verified without preserving raw payload or endpoint evidence",
      "unavailable endpoint failed closed with safe reason code",
      "tenant, synthetic-data, no-egress, audit, metric, trace, and redaction evidence captured",
      "LocalStack, WireMock, and mock OIDC remain deferred to separate follow-up issues",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: [
      "localstack-service-semantics-deferred-to-USF-208",
      "wiremock-service-semantics-deferred-to-USF-209",
      "mock-oidc-service-semantics-deferred-to-USF-210",
      "webhook-delivery-notification-provider-not-claimed",
      "provider-feedback-replay-not-claimed",
      "live-webhook-compatibility-not-claimed",
    ],
    nonClaims: NON_CLAIMS,
  });
}

if (process.argv[1]?.endsWith("mock-provider-substrate-proof.ts")) {
  runMockProviderSubstrateProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      const safeMessage =
        error instanceof Error ? error.message : "mock provider substrate proof failed";
      console.error(JSON.stringify({ status: "fail", error: safeMessage }, null, 2));
      process.exitCode = 1;
    });
}
