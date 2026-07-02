import { spawn } from "node:child_process";
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
import {
  allocateFetchSafeLoopbackPort,
  assertFetchSafeLoopbackPort,
} from "./safe-loopback-port.ts";

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
  readonly deferredServiceIds: readonly [];
  readonly followUpIssueRefs: readonly [];
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
  const dir = await mkdtemp(join(tmpdir(), "usf-wiremock-proof-"));
  const path = join(dir, "compose.override.yaml");
  const publishedPort = await allocateFetchSafeLoopbackPort("wiremock-proof");
  await writeFile(
    path,
    [
      "services:",
      "  wiremock:",
      "    ports: !override",
      "      - target: 8080",
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
  await runProcess(
    "docker",
    [
      ...composeArgs(projectName, overridePath),
      "--profile",
      "provider-mocks",
      "down",
      "--remove-orphans",
    ],
    60000,
  );
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
    assert(
      port === override.publishedPort,
      "WireMock proof port did not match the safe published port",
    );
    assertFetchSafeLoopbackPort(port, "wiremock-proof-selected-fetch-forbidden-port");
    const provider = new WireMockHttpProviderMock({
      endpoint: `http://127.0.0.1:${port}`,
    });
    evidence = await provider.proveConfiguredMockBehaviour();
    unavailableEvidence = await proveUnavailable();
  } finally {
    try {
      await composeDown(projectName, override.path);
    } finally {
      await rm(override.dir, { recursive: true, force: true });
    }
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
    deferredServiceIds: [] as const,
    followUpIssueRefs: [] as const,
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
      "WireMock host exposure used a preselected Fetch-safe ephemeral loopback port",
      "WireMock readiness used bounded retry through wiremock-captain",
      "wiremock-captain registered a synthetic tenant-safe fixture",
      "deterministic request matching was exercised",
      "response templating was exercised without retaining raw provider payload evidence",
      "negative matching and request-journal evidence were checked",
      "unavailable endpoint failed closed with safe reason code",
      "tenant, synthetic-data, no-egress, audit, metric, trace, cleanup, and redaction evidence captured",
      "LocalStack service semantics are outside this WireMock proof and are resolved separately by USF-208",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: [
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
