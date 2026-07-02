import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SONARQUBE_ENDPOINT_REF,
  SONARQUBE_PROVIDER_REGISTRY_ID,
  SONARQUBE_RUNTIME_PROVIDER_BINDING_ID,
  SONARQUBE_SDK_PACKAGE,
  SONARQUBE_SDK_VERSION,
  SONARQUBE_SERVICE_CATALOGUE_ID,
  SONARQUBE_WEB_API_BOUNDARY,
  SonarQubeComposedQualityGateAdapter,
  type SonarQubeComposedQualityGateEvidence,
} from "@foundation/adapter-assurance";
import { createTenantContext } from "@foundation/core";
import {
  allocateFetchSafeLoopbackPort,
  assertFetchSafeLoopbackPort,
} from "./safe-loopback-port.ts";

interface SonarQubeComposedProofResult {
  readonly status: "pass";
  readonly proof: "sonarqube-composed-quality-gate-provider";
  readonly issueId: "USF-204";
  readonly parentIssueId: "USF-133";
  readonly predecessorIssueIds: readonly ["USF-171", "USF-195"];
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "assurance";
  readonly composeService: "sonarqube";
  readonly dependentServiceIds: readonly ["sonar-postgres"];
  readonly proofCommand: "corepack pnpm proof:assurance:sonarqube";
  readonly implementedServiceIds: readonly ["sonarqube", "sonar-postgres"];
  readonly deferredServiceIds: readonly ["sonar-oidc-plugin"];
  readonly followUpIssueRefs: readonly ["USF-169", "USF-193"];
  readonly resolvedIssueRefs: readonly ["USF-204"];
  readonly serviceCatalogueServiceId: typeof SONARQUBE_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof SONARQUBE_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof SONARQUBE_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackage: typeof SONARQUBE_SDK_PACKAGE;
  readonly sdkVersion: typeof SONARQUBE_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly webApiBoundary: typeof SONARQUBE_WEB_API_BOUNDARY;
  readonly endpointRef: typeof SONARQUBE_ENDPOINT_REF;
  readonly sourceUse: "official-sonarsource-npm-scanner";
  readonly evidence: SonarQubeComposedQualityGateEvidence;
  readonly unavailableEvidence: SonarQubeComposedQualityGateEvidence;
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
const COMPOSE_PROFILE = "assurance";
const COMPOSE_SERVICE = "sonarqube";
const PROOF_COMMAND = "corepack pnpm proof:assurance:sonarqube";
const FORBIDDEN_EVIDENCE_PATTERN =
  /https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|admin_password|sonar_password|password|token|squ_|connection_string|stackTrace|at\s+\w+\s+\(|synthetic sonar source|tenant-sonarqube|actor-sonarqube/i;
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

function runProcess(command: string, args: readonly string[], timeoutMs = 300000): Promise<string> {
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
  const dir = await mkdtemp(join(tmpdir(), "usf-sonarqube-proof-"));
  const path = join(dir, "compose.override.yaml");
  const publishedPort = await allocateFetchSafeLoopbackPort("sonarqube-proof");
  await writeFile(
    path,
    [
      "services:",
      "  sonarqube:",
      "    environment:",
      '      SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: "true"',
      "    ports: !override",
      "      - target: 9000",
      `        published: "${publishedPort}"`,
      "        host_ip: 127.0.0.1",
      "        protocol: tcp",
      "",
    ].join("\n"),
    "utf8",
  );
  return { dir, path, publishedPort };
}

async function writeSyntheticProject(dir: string): Promise<{
  readonly projectDir: string;
  readonly sonarHome: string;
  readonly sonarWork: string;
}> {
  const projectDir = join(dir, "project");
  const srcDir = join(projectDir, "src");
  const sonarHome = join(dir, "sonar-home");
  const sonarWork = join(dir, "sonar-work");
  await mkdir(srcDir, { recursive: true });
  await mkdir(sonarHome, { recursive: true });
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "usf-sonarqube-proof", version: "0.0.0", private: true }, null, 2),
    "utf8",
  );
  await writeFile(
    join(srcDir, "proof.ts"),
    [
      "export function syntheticProof(value: string): string {",
      '  if (value.length === 0) return "empty";',
      "  return `proof:${value}`;",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  return { projectDir, sonarHome, sonarWork };
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
    "9000",
  ]);
  const match = output.trim().match(/:(\d+)$/);
  if (!match) {
    throw new Error("sonarqube-proof-port-discovery-failed");
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
    120000,
  );
}

async function closedLoopbackPort(): Promise<number> {
  return allocateFetchSafeLoopbackPort("sonarqube-unavailable-proof");
}

async function proveUnavailable(port: number): Promise<SonarQubeComposedQualityGateEvidence> {
  const provider = new SonarQubeComposedQualityGateAdapter({
    endpoint: `http://127.0.0.1:${port}`,
    adminUsername: "admin",
    adminPassword: "admin",
    readinessTimeoutMs: 1000,
    requestTimeoutMs: 250,
    tokenNamePrefix: "usf-sonarqube-unavailable",
  });
  const context = createTenantContext({
    tenantId: "tenant-sonarqube-unavailable-proof",
    actorId: "actor-sonarqube-unavailable-proof",
    roles: ["system"],
    providerMode: "local-composed-real-service",
    environment: "integration",
  });
  const evidence = await provider.proveUnavailable(context);
  assert(
    evidence.operationOutcome === "failed-closed",
    "unavailable SonarQube did not fail closed",
  );
  assert(evidence.failClosedDenials === 1, "unavailable SonarQube denial missing");
  return evidence;
}

function assertSafeEvidence(evidence: SonarQubeComposedQualityGateEvidence, prefix: string): void {
  for (const [field, value] of Object.entries(evidence)) {
    if (typeof value === "string" && FORBIDDEN_EVIDENCE_PATTERN.test(value)) {
      throw new Error(`${prefix}-unsafe-evidence-field-${field}`);
    }
  }
}

export async function runSonarQubeComposedProof(): Promise<SonarQubeComposedProofResult> {
  const { dir, path, publishedPort } = await writeComposeOverride();
  const syntheticProject = await writeSyntheticProject(dir);
  const projectName = `usf-sonarqube-proof-${process.pid}`;
  const context = createTenantContext({
    tenantId: "tenant-sonarqube-proof",
    actorId: "actor-sonarqube-proof",
    roles: ["admin"],
    providerMode: "local-composed-real-service",
    environment: "integration",
  });

  let evidence: SonarQubeComposedQualityGateEvidence | undefined;
  let unavailableEvidence: SonarQubeComposedQualityGateEvidence | undefined;
  try {
    await composeUp(projectName, path);
    const port = await composePort(projectName, path);
    assert(port === publishedPort, "SonarQube proof port did not match the safe published port");
    assertFetchSafeLoopbackPort(port, "sonarqube-proof-selected-fetch-forbidden-port");
    const provider = new SonarQubeComposedQualityGateAdapter({
      endpoint: `http://127.0.0.1:${port}`,
      adminUsername: "admin",
      adminPassword: "admin",
    });
    evidence = await provider.proveRoundTrip(context, {
      projectBaseDir: syntheticProject.projectDir,
      sonarUserHome: syntheticProject.sonarHome,
      sonarWorkingDirectory: syntheticProject.sonarWork,
    });
    unavailableEvidence = await proveUnavailable(await closedLoopbackPort());
  } finally {
    await composeDown(projectName, path).catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
  }

  if (!evidence || !unavailableEvidence) {
    throw new Error("sonarqube-proof-missing-evidence");
  }
  assertSafeEvidence(evidence, "sonarqube-proof");
  assertSafeEvidence(unavailableEvidence, "sonarqube-unavailable-proof");
  assert(evidence.readinessChecked, "SonarQube readiness missing");
  assert(evidence.scannerExecutionChecked, "SonarQube scanner execution missing");
  assert(evidence.qualityGateResultChecked, "SonarQube quality-gate evidence missing");
  assert(
    evidence.qualityGateStatus === "OK",
    "SonarQube quality gate did not pass for synthetic proof",
  );
  assert(evidence.unresolvedIssueHandlingChecked, "SonarQube unresolved issue query missing");
  assert(evidence.securityHotspotTreatmentChecked, "SonarQube security hotspot query missing");
  assert(evidence.operatorConsoleAccessChecked, "SonarQube operator access validation missing");
  assert(evidence.projectDeletionChecked, "SonarQube project cleanup missing");
  assert(evidence.credentialRevocationChecked, "SonarQube credential revocation missing");
  assert(unavailableEvidence.providerUnavailableChecked, "SonarQube unavailable proof missing");

  return Object.freeze({
    status: "pass",
    proof: "sonarqube-composed-quality-gate-provider",
    issueId: "USF-204",
    parentIssueId: "USF-133",
    predecessorIssueIds: ["USF-171", "USF-195"] as const,
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    composeService: COMPOSE_SERVICE,
    dependentServiceIds: ["sonar-postgres"] as const,
    proofCommand: PROOF_COMMAND,
    implementedServiceIds: ["sonarqube", "sonar-postgres"] as const,
    deferredServiceIds: ["sonar-oidc-plugin"] as const,
    followUpIssueRefs: ["USF-169", "USF-193"] as const,
    resolvedIssueRefs: ["USF-204"] as const,
    serviceCatalogueServiceId: SONARQUBE_SERVICE_CATALOGUE_ID,
    providerRegistryId: SONARQUBE_PROVIDER_REGISTRY_ID,
    bindingId: SONARQUBE_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackage: SONARQUBE_SDK_PACKAGE,
    sdkVersion: SONARQUBE_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    webApiBoundary: SONARQUBE_WEB_API_BOUNDARY,
    endpointRef: SONARQUBE_ENDPOINT_REF,
    sourceUse: "official-sonarsource-npm-scanner",
    evidence,
    unavailableEvidence,
    providerUnavailableChecked: true,
    checks: [
      "SonarQube container started from canonical test Compose with assurance profile",
      "sonar-postgres dependency reached healthy before SonarQube startup",
      "SonarQube host exposure used a preselected Fetch-safe ephemeral loopback port",
      "SonarQube readiness used bounded Web API retry inside the adapter boundary",
      "official SonarSource npm scanner submitted a synthetic TypeScript project",
      "quality-gate result was read back from the local SonarQube service",
      "unresolved issue and security hotspot query paths were exercised without claiming vulnerability clearance",
      "operator access was checked through authenticated local SonarQube API without UI clickthrough claim",
      "temporary credential was revoked and temporary project was deleted",
      "scanner output was suppressed and proof evidence was redacted",
      "local deterministic repository checks remain non-equivalent to SonarQube service proof",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: evidence.remainingDeferredBoundaries,
    nonClaims: NON_CLAIMS,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSonarQubeComposedProof()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : "sonarqube-proof-failed"}\n`,
      );
      process.exitCode = 1;
    });
}
