import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLAMAV_PROVIDER_REGISTRY_ID,
  CLAMAV_RUNTIME_PROVIDER_BINDING_ID,
  CLAMAV_SDK_PACKAGE,
  CLAMAV_SDK_VERSION,
  CLAMAV_SERVICE_CATALOGUE_ID,
  ClamAvScanProvider,
  InMemoryFileMetadataStore,
  InMemoryObjectStore,
  eicarTestPayload,
  type ClamAvComposedScanEvidence,
} from "@foundation/adapter-store";
import { InMemoryAuditEventStore, createAuditRecorder } from "@foundation/capability-audit";
import { FileAccessDeniedError, createFileService } from "@foundation/capability-files";
import {
  InMemoryTenantMembershipDirectory,
  createPolicyDecisionPoint,
} from "@foundation/capability-tenant";
import { createTenantContext, type TenantContext } from "@foundation/core";
import {
  allocateFetchSafeLoopbackPort,
  assertFetchSafeLoopbackPort,
} from "./safe-loopback-port.ts";

interface ClamAvComposedProofResult {
  readonly status: "pass";
  readonly proof: "clamav-composed-scanner-provider";
  readonly issueId: "USF-200";
  readonly parentIssueId: "USF-133";
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "scanning";
  readonly proofCommand: "corepack pnpm proof:scanner:clamav";
  readonly serviceCatalogueServiceId: typeof CLAMAV_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof CLAMAV_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof CLAMAV_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackage: typeof CLAMAV_SDK_PACKAGE;
  readonly sdkVersion: typeof CLAMAV_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly sourceUse: "de-facto-clamscan-tcp-client";
  readonly evidence: ClamAvComposedScanEvidence;
  readonly fileServiceEvidence: {
    readonly cleanUploadAvailable: boolean;
    readonly infectedUploadQuarantined: boolean;
    readonly providerUnavailableQuarantined: boolean;
    readonly quarantinedDownloadDenied: boolean;
    readonly cleanDeleteBoundaryChecked: boolean;
    readonly tenantIsolationChecked: boolean;
    readonly auditEvidenceCaptured: boolean;
    readonly auditRedactionChecked: boolean;
    readonly releaseBoundary: "not-implemented-not-claimed";
  };
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
const COMPOSE_PROFILE = "scanning";
const COMPOSE_SERVICE = "clamav";
const PROOF_COMMAND = "corepack pnpm proof:scanner:clamav";
const FORBIDDEN_EVIDENCE_PATTERN =
  /https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|token|password|stack|connection_string|EICAR|synthetic clean/i;
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

async function unusedPort(): Promise<number> {
  return allocateFetchSafeLoopbackPort("clamav-unavailable-proof");
}

async function writeComposeOverride(): Promise<{
  readonly dir: string;
  readonly path: string;
  readonly publishedPort: number;
}> {
  const dir = await mkdtemp(join(tmpdir(), "usf-clamav-proof-"));
  const path = join(dir, "compose.override.yaml");
  const publishedPort = await allocateFetchSafeLoopbackPort("clamav-proof");
  await writeFile(
    path,
    [
      "services:",
      "  clamav:",
      "    ports: !override",
      "      - target: 3310",
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
  return [
    "compose",
    "-p",
    projectName,
    "-f",
    COMPOSE_TARGET,
    "-f",
    overridePath,
    "--profile",
    COMPOSE_PROFILE,
  ];
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
    "3310",
  ]);
  const match = output.trim().match(/:(\d+)$/);
  if (!match) {
    throw new Error("clamav-proof-port-discovery-failed");
  }
  return Number(match[1]);
}

async function composeDown(projectName: string, overridePath: string): Promise<void> {
  const child = spawn(
    "docker",
    [...composeArgs(projectName, overridePath), "down", "--remove-orphans"],
    { cwd: process.cwd(), stdio: ["ignore", "ignore", "ignore"] },
  );
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 20000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

function context(actorId = "actor-clamav-proof", tenantId = "tenant-clamav-proof"): TenantContext {
  return createTenantContext({
    tenantId,
    actorId,
    roles: ["tenant-admin"],
    providerMode: "local-composed-real-service",
    environment: "integration",
  });
}

function fileStack(scanProvider: ClamAvScanProvider) {
  const tenant = context();
  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "membership-clamav-proof",
    tenantId: tenant.tenantId,
    actorId: tenant.actorId,
    status: "active",
    roles: ["tenant-admin"],
  });
  const auditStore = new InMemoryAuditEventStore();
  const audit = createAuditRecorder({ ledger: auditStore, component: "clamav-proof" });
  const metadataStore = new InMemoryFileMetadataStore();
  const objectStore = new InMemoryObjectStore();
  const fileService = createFileService({
    objectStore,
    metadataStore,
    scanProvider,
    pdp: createPolicyDecisionPoint({ memberships }),
    audit,
    objectKeySalt: "clamav-proof-object-key-salt",
  });
  return { auditStore, fileService, metadataStore, tenant };
}

async function proveFileServiceBoundary(scanProvider: ClamAvScanProvider) {
  const stack = fileStack(scanProvider);
  const cleanBody = "clean body";
  const clean = await stack.fileService.upload(stack.tenant, {
    fileId: "clamav-clean-file",
    filename: "clean.txt",
    contentType: "text/plain",
    sizeBytes: Buffer.byteLength(cleanBody),
    body: cleanBody,
  });
  const infected = await stack.fileService.upload(stack.tenant, {
    fileId: "clamav-infected-file",
    filename: "infected.txt",
    contentType: "text/plain",
    sizeBytes: eicarTestPayload().length,
    body: eicarTestPayload(),
  });
  let quarantinedDownloadDenied = false;
  try {
    await stack.fileService.download(stack.tenant, "clamav-infected-file");
  } catch (error) {
    quarantinedDownloadDenied =
      error instanceof FileAccessDeniedError && error.reasonCode === "status-quarantined";
  }
  const deleted = await stack.fileService.remove(stack.tenant, "clamav-clean-file");
  const otherTenantRead = await stack.metadataStore.get(
    context("actor-other", "tenant-clamav-proof-other"),
    "clamav-clean-file",
  );
  const auditPage = await stack.auditStore.query(stack.tenant, {
    tenantId: stack.tenant.tenantId,
    limit: 200,
  });
  const auditJson = JSON.stringify(auditPage.events);
  assert(!FORBIDDEN_EVIDENCE_PATTERN.test(auditJson), "clamav-proof-audit-leaked-unsafe-data");

  const unavailable = new ClamAvScanProvider({
    port: await unusedPort(),
    scanTimeoutMs: 500,
    readinessTimeoutMs: 1000,
  });
  const unavailableStack = fileStack(unavailable);
  const failedClosed = await unavailableStack.fileService.upload(unavailableStack.tenant, {
    fileId: "clamav-unavailable-file",
    filename: "unavailable.txt",
    contentType: "text/plain",
    sizeBytes: 16,
    body: "provider failure",
  });

  return Object.freeze({
    cleanUploadAvailable: clean.status === "available" && clean.scanStatus === "clean",
    infectedUploadQuarantined:
      infected.status === "quarantined" && infected.scanStatus === "infected",
    providerUnavailableQuarantined:
      failedClosed.status === "quarantined" && failedClosed.scanStatus === "provider-unavailable",
    quarantinedDownloadDenied,
    cleanDeleteBoundaryChecked: deleted.status === "deleted",
    tenantIsolationChecked: otherTenantRead === undefined,
    auditEvidenceCaptured: auditPage.events.some((event) => event.eventType === "file.quarantined"),
    auditRedactionChecked: true,
    releaseBoundary: "not-implemented-not-claimed" as const,
  });
}

export async function runClamAvComposedProof(): Promise<ClamAvComposedProofResult> {
  const projectName = `usf-clamav-proof-${process.pid}`;
  const override = await writeComposeOverride();
  let evidence: ClamAvComposedScanEvidence | undefined;
  let fileServiceEvidence: Awaited<ReturnType<typeof proveFileServiceBoundary>> | undefined;
  try {
    await composeUp(projectName, override.path);
    const port = await composePort(projectName, override.path);
    assert(
      port === override.publishedPort,
      "ClamAV proof port did not match the safe published port",
    );
    assertFetchSafeLoopbackPort(port, "clamav-proof-selected-fetch-forbidden-port");
    const adapter = new ClamAvScanProvider({ port });
    evidence = await adapter.proveRoundTrip(context());
    fileServiceEvidence = await proveFileServiceBoundary(adapter);
  } finally {
    await composeDown(projectName, override.path);
    await rm(override.dir, { recursive: true, force: true });
  }

  if (!evidence || !fileServiceEvidence) {
    throw new Error("clamav-proof-missing-evidence");
  }
  for (const [field, value] of Object.entries(evidence)) {
    if (typeof value === "string" && FORBIDDEN_EVIDENCE_PATTERN.test(value)) {
      throw new Error(`clamav-proof-unsafe-evidence-field-${field}`);
    }
  }
  assert(fileServiceEvidence.cleanUploadAvailable, "clamav-clean-file-service-proof-missing");
  assert(fileServiceEvidence.infectedUploadQuarantined, "clamav-infected-quarantine-proof-missing");
  assert(
    fileServiceEvidence.providerUnavailableQuarantined,
    "clamav-unavailable-quarantine-proof-missing",
  );
  assert(fileServiceEvidence.quarantinedDownloadDenied, "clamav-quarantine-denial-proof-missing");
  assert(fileServiceEvidence.cleanDeleteBoundaryChecked, "clamav-delete-boundary-proof-missing");
  assert(fileServiceEvidence.tenantIsolationChecked, "clamav-tenant-boundary-proof-missing");
  assert(fileServiceEvidence.auditEvidenceCaptured, "clamav-audit-proof-missing");

  return Object.freeze({
    status: "pass",
    proof: "clamav-composed-scanner-provider",
    issueId: "USF-200",
    parentIssueId: "USF-133",
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    proofCommand: PROOF_COMMAND,
    serviceCatalogueServiceId: CLAMAV_SERVICE_CATALOGUE_ID,
    providerRegistryId: CLAMAV_PROVIDER_REGISTRY_ID,
    bindingId: CLAMAV_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackage: CLAMAV_SDK_PACKAGE,
    sdkVersion: CLAMAV_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    sourceUse: "de-facto-clamscan-tcp-client",
    evidence,
    fileServiceEvidence,
    checks: [
      "container running observed by Compose startup",
      "service ready through clamscan TCP ping readiness retry",
      "adapter connected through de-facto ClamAV client",
      "clean payload scanned as clean",
      "EICAR test payload scanned as infected without retaining the payload as evidence",
      "file service quarantined infected scan result",
      "file service quarantined provider-unavailable scan result",
      "quarantined download denied fail closed",
      "clean file delete boundary observed",
      "tenant-scoped metadata read remained isolated",
      "audit evidence was value-free and redacted",
      "release boundary remains explicitly not implemented or claimed",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: evidence.remainingDeferredBoundaries,
    nonClaims: NON_CLAIMS,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runClamAvComposedProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "clamav proof failed");
      process.exitCode = 1;
    });
}
