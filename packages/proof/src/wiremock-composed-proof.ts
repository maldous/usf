import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WIREMOCK_ENDPOINT_REF,
  WIREMOCK_PROVIDER_REGISTRY_ID,
  WIREMOCK_RUNTIME_PROVIDER_BINDING_ID,
  WIREMOCK_SDK_PACKAGE,
  WIREMOCK_SDK_VERSION,
  WIREMOCK_SERVICE_CATALOGUE_ID,
  WireMockHttpProviderMock,
  type WireMockHttpProviderMockEvidence,
} from "@foundation/adapter-mail";

interface WireMockComposedProofResult {
  readonly status: "pass";
  readonly proof: "wiremock-http-provider-mock-composed";
  readonly issueId: "USF-209";
  readonly parentIssueId: "USF-133";
  readonly predecessorIssueId: "USF-201";
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeService: "wiremock";
  readonly proofCommand: "corepack pnpm proof:wiremock";
  readonly implementedServiceIds: readonly ["wiremock"];
  readonly deferredServiceIds: readonly ["localstack"];
  readonly followUpIssueRefs: readonly ["USF-208"];
  readonly resolvedIssueRefs: readonly ["USF-209"];
  readonly serviceCatalogueServiceId: typeof WIREMOCK_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof WIREMOCK_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof WIREMOCK_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackage: typeof WIREMOCK_SDK_PACKAGE;
  readonly sdkVersion: typeof WIREMOCK_SDK_VERSION;
  readonly endpointRef: typeof WIREMOCK_ENDPOINT_REF;
  readonly evidence: WireMockHttpProviderMockEvidence;
  readonly unavailableEvidence: WireMockHttpProviderMockEvidence;
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
const COMPOSE_SERVICE = "wiremock";
const PROOF_COMMAND = "corepack pnpm proof:wiremock";
const FORBIDDEN_EVIDENCE_PATTERN =
  /https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|token|password|secret|connection_string|stackTrace|at\s+\w+\s+\(|tenant-wiremock|fixture-wiremock|corr-wiremock/i;
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
  const dir = await mkdtemp(join(tmpdir(), "usf-wiremock-proof-"));
  const path = join(dir, "compose.override.yaml");
  await writeFile(
    path,
    [
      "services:",
      "  wiremock:",
      "    ports: !override",
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
    "--profile",
    "provider-mocks",
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
    throw new Error("wiremock-proof-port-discovery-failed");
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

async function proveUnavailable(): Promise<WireMockHttpProviderMockEvidence> {
  const provider = new WireMockHttpProviderMock({
    endpoint: "http://127.0.0.1:9",
    readinessTimeoutMs: 1000,
    requestTimeoutMs: 250,
  });
  const evidence = await provider.proveUnavailable();
  assert(evidence.operationOutcome === "failed-closed", "unavailable WireMock did not fail closed");
  assert(evidence.failClosedDenials === 1, "unavailable WireMock denial missing");
  return evidence;
}

function assertSafeEvidence(evidence: unknown): void {
  const text = JSON.stringify(evidence);
  if (FORBIDDEN_EVIDENCE_PATTERN.test(text)) {
    throw new Error("wiremock-proof-unsafe-evidence");
  }
}

export async function runWireMockComposedProof(): Promise<WireMockComposedProofResult> {
  const projectName = `usf-wiremock-proof-${process.pid}`;
  const override = await writeComposeOverride();
  let evidence: WireMockHttpProviderMockEvidence | undefined;
  let unavailableEvidence: WireMockHttpProviderMockEvidence | undefined;
  try {
    await composeUp(projectName, override.path);
    const port = await composePort(projectName, override.path);
    const provider = new WireMockHttpProviderMock({
      endpoint: `http://127.0.0.1:${port}`,
    });
    evidence = await provider.proveConfiguredMockBehaviour();
    unavailableEvidence = await proveUnavailable();
  } finally {
    await composeDown(projectName, override.path);
    await rm(override.dir, { recursive: true, force: true });
  }

  if (!evidence || !unavailableEvidence) {
    throw new Error("wiremock-proof-missing-evidence");
  }
  assert(evidence.sdkBackedAdminClientChecked, "WireMock SDK-backed admin client missing");
  assert(evidence.readinessChecked, "WireMock readiness was not checked");
  assert(evidence.deterministicMatchingChecked, "WireMock deterministic matching missing");
  assert(evidence.responseTemplatingChecked, "WireMock response templating missing");
  assert(evidence.negativeMatchingChecked, "WireMock negative matching missing");
  assert(evidence.requestJournalChecked, "WireMock request journal missing");
  assert(evidence.cleanupAttempted && evidence.cleanupSucceeded, "WireMock cleanup missing");
  assert(evidence.noExternalEgressChecked, "WireMock no-egress boundary missing");
  assert(evidence.syntheticDataChecked, "WireMock synthetic-data boundary missing");
  assert(evidence.tenantSafeEvidenceChecked, "WireMock tenant-safe evidence missing");
  assert(evidence.redactionChecked, "WireMock redaction evidence missing");
  assert(
    unavailableEvidence.operationOutcome === "failed-closed",
    "WireMock failure did not fail closed",
  );
  assertSafeEvidence(evidence);
  assertSafeEvidence(unavailableEvidence);

  return Object.freeze({
    status: "pass",
    proof: "wiremock-http-provider-mock-composed",
    issueId: "USF-209",
    parentIssueId: "USF-133",
    predecessorIssueId: "USF-201",
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeService: COMPOSE_SERVICE,
    proofCommand: PROOF_COMMAND,
    implementedServiceIds: ["wiremock"] as const,
    deferredServiceIds: ["localstack"] as const,
    followUpIssueRefs: ["USF-208"] as const,
    resolvedIssueRefs: ["USF-209"] as const,
    serviceCatalogueServiceId: WIREMOCK_SERVICE_CATALOGUE_ID,
    providerRegistryId: WIREMOCK_PROVIDER_REGISTRY_ID,
    bindingId: WIREMOCK_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackage: WIREMOCK_SDK_PACKAGE,
    sdkVersion: WIREMOCK_SDK_VERSION,
    endpointRef: WIREMOCK_ENDPOINT_REF,
    evidence,
    unavailableEvidence,
    providerUnavailableChecked: true,
    checks: [
      "WireMock container started from canonical test Compose with provider-mocks profile",
      "WireMock host exposure used an ephemeral loopback port",
      "WireMock readiness used bounded retry through wiremock-captain",
      "wiremock-captain registered a synthetic tenant-safe fixture",
      "deterministic request matching was exercised",
      "response templating was exercised without retaining raw provider payload evidence",
      "negative matching and request-journal evidence were checked",
      "unavailable endpoint failed closed with safe reason code",
      "tenant, synthetic-data, no-egress, audit, metric, trace, cleanup, and redaction evidence captured",
      "LocalStack remains deferred to USF-208",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: [
      "localstack-service-semantics-deferred-to-USF-208",
      "live-external-provider-compatibility-not-claimed",
      "provider-contract-certification-not-claimed",
      "staging-production-provider-readiness-not-claimed",
    ],
    nonClaims: NON_CLAIMS,
  });
}

if (process.argv[1]?.endsWith("wiremock-composed-proof.ts")) {
  runWireMockComposedProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      const safeMessage = error instanceof Error ? error.message : "wiremock proof failed";
      console.error(JSON.stringify({ status: "fail", error: safeMessage }, null, 2));
      process.exitCode = 1;
    });
}
