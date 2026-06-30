import { spawn, type ChildProcessByStdio } from "node:child_process";
import { once } from "node:events";
import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  DEV_ACTOR_ID,
  DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL,
  DEV_IN_MEMORY_PROVIDER_MODE_LABEL,
  DEV_SECURITY_ACTOR_ID,
  DEV_TENANT_ID,
  MAILPIT_PROVIDER_REGISTRY_ID,
  type DevProviderClass,
  type DevProviderModeLabel,
  type DevRuntimeMode,
} from "@foundation/app-api/runtime";
import {
  PG_SDK_PACKAGE,
  PG_SDK_VERSION,
  POSTGRES_PROVIDER_REGISTRY_ID,
  POSTGRES_RUNTIME_PROVIDER_BINDING_ID,
  preparePostgresRuntimeProofDatabase,
  type PostgresComposedMembershipEvidence,
} from "@foundation/adapter-db";
import {
  NATS_PROVIDER_REGISTRY_ID,
  NATS_RUNTIME_PROVIDER_BINDING_ID,
  NATS_SDK_PACKAGE,
  NATS_SDK_VERSION,
  type NatsComposedEventBusEvidence,
} from "@foundation/adapter-bus";
import {
  KEYCLOAK_ADMIN_SDK_PACKAGE,
  KEYCLOAK_ADMIN_SDK_VERSION,
  KEYCLOAK_PROVIDER_REGISTRY_ID,
  KEYCLOAK_RUNTIME_PROVIDER_BINDING_ID,
  type KeycloakComposedIdentityEvidence,
} from "@foundation/adapter-idp";
import type { MailpitComposedDeliveryEvidence } from "@foundation/adapter-mail";
import {
  OPENBAO_PROVIDER_REGISTRY_ID,
  OPENBAO_SDK_PACKAGE,
  OPENBAO_SDK_VERSION,
  OPENBAO_SECRET_BINDING_ID,
  type OpenBaoSecretEvidence,
} from "@foundation/adapter-secrets";
import {
  MINIO_PROVIDER_REGISTRY_ID,
  MINIO_RUNTIME_PROVIDER_BINDING_ID,
  MINIO_SDK_PACKAGE,
  MINIO_SDK_VERSION,
  type MinioComposedObjectStoreEvidence,
} from "@foundation/adapter-store";
import {
  TEMPORAL_CLIENT_SDK_PACKAGE,
  TEMPORAL_CLIENT_SDK_VERSION,
  TEMPORAL_PROVIDER_REGISTRY_ID,
  TEMPORAL_RUNTIME_PROVIDER_BINDING_ID,
  type TemporalComposedWorkflowEvidence,
} from "@foundation/adapter-wf";

type ProofProcess = ChildProcessByStdio<null, Readable, Readable>;

const COMPOSE_TARGET = "compose/compose.dev.generated.yaml";
const SERVICE_CATALOGUE_AUTHORITY = "spec/instances/compose-service/service-catalogue.json";
const POSTGRES_PROOF_OTHER_TENANT_ID = "22222222-2222-4222-8222-222222222222";
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

type RuntimeComposedProviderEvidence =
  | MailpitComposedDeliveryEvidence
  | NatsComposedEventBusEvidence
  | MinioComposedObjectStoreEvidence
  | KeycloakComposedIdentityEvidence
  | OpenBaoSecretEvidence
  | TemporalComposedWorkflowEvidence;

interface ApiProofSummary {
  readonly api: string;
  readonly health: string;
  readonly openapi: string;
  readonly runtimeMode: DevRuntimeMode;
  readonly providerMode: DevProviderModeLabel;
  readonly providerClass: DevProviderClass;
  readonly tenantAcceptedStatus: number;
  readonly tenantMismatchStatus: number;
  readonly authorizationFailureStatus: number;
  readonly notificationProviderMode: "in-memory" | "composed-test";
  readonly notificationProviderRef: "notify-in-memory" | typeof MAILPIT_PROVIDER_REGISTRY_ID;
  readonly notificationQueuedStatus: number;
  readonly composedProviderBindingsActive: number;
  readonly databasePermissionStatus: number | null;
  readonly databaseProviderEvidence: PostgresComposedMembershipEvidence | null;
  readonly eventBusProviderEvidence: NatsComposedEventBusEvidence | null;
  readonly objectStoreProviderEvidence: MinioComposedObjectStoreEvidence | null;
  readonly identityProviderEvidence: KeycloakComposedIdentityEvidence | null;
  readonly auditEvents: number;
  readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_AUTHORITY;
  readonly composeTarget: typeof COMPOSE_TARGET | null;
  readonly deferredBoundaries: readonly string[];
}

interface WorkerProofSummary {
  readonly workerRuntime: "apps/work";
  readonly runtimeMode: DevRuntimeMode;
  readonly providerMode: DevProviderModeLabel;
  readonly tenantId: string;
  readonly actorId: string;
  readonly jobId: string;
  readonly jobStatus: string;
  readonly notificationProviderMode: "in-memory" | "composed-test";
  readonly notificationDeliveryStatus: "sent";
  readonly notificationProviderMessageIdPresent: boolean;
  readonly composedProviderEvidence: readonly MailpitComposedDeliveryEvidence[];
  readonly databaseProviderEvidence: readonly PostgresComposedMembershipEvidence[];
  readonly eventBusProviderEvidence: readonly NatsComposedEventBusEvidence[];
  readonly objectStoreProviderEvidence: readonly MinioComposedObjectStoreEvidence[];
  readonly identityProviderEvidence: readonly KeycloakComposedIdentityEvidence[];
  readonly secretProviderEvidence: readonly OpenBaoSecretEvidence[];
  readonly workflowProviderEvidence: readonly TemporalComposedWorkflowEvidence[];
  readonly auditEvents: number;
  readonly tenantBoundaryDenied: true;
  readonly authorizationDenied: true;
  readonly syntheticDataBoundary: string;
  readonly secretBoundary: string;
  readonly deferredBoundaries: readonly string[];
}

export interface RuntimeProofSummary {
  readonly issueId: "USF-183";
  readonly parentIssueId: "USF-133";
  readonly mode: DevRuntimeMode;
  readonly providerMode: DevProviderModeLabel;
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
  readonly composedProviderEvidence: readonly RuntimeComposedProviderEvidence[];
  readonly databaseProviderEvidence: readonly PostgresComposedMembershipEvidence[];
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

async function runApiNotificationProof(
  baseUrl: string,
  mode: DevRuntimeMode,
): Promise<{
  readonly providerMode: "in-memory" | "composed-test";
  readonly providerRef: "notify-in-memory" | typeof MAILPIT_PROVIDER_REGISTRY_ID;
  readonly queuedStatus: number;
}> {
  const headers = {
    "content-type": "application/json",
    "x-dev-tenant-id": DEV_TENANT_ID,
    "x-dev-actor-id": DEV_ACTOR_ID,
    "x-dev-roles": "tenant-admin",
  };
  const template = await fetchJson(`${baseUrl}/v1/notification-templates`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tenantId: DEV_TENANT_ID,
      templateId: `runtime-proof-api-template-${mode}`,
      templateKey: "runtime-proof-api",
      templateVersion: "1",
      templateClassification: "test",
      subjectTemplate: "USF runtime proof notification",
      bodyTemplate: "Synthetic runtime proof notification body",
      allowedVariables: [],
    }),
  });
  if (template.status !== 200) {
    throw new Error(`notification template proof failed with status ${template.status}`);
  }

  const created = await fetchJson(`${baseUrl}/v1/notifications`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tenantId: DEV_TENANT_ID,
      recipient: {
        recipientId: "runtime-proof-api-recipient",
        recipientActorId: DEV_ACTOR_ID,
        recipientTenantId: DEV_TENANT_ID,
        recipientType: "test",
        addressRef: "runtime-proof-api-recipient@example.test",
        addressType: "test",
        addressVerified: true,
        addressStatus: "active",
        addressSource: "runtime-proof",
        addressLastVerifiedAt: new Date().toISOString(),
      },
      channel: "test",
      classification: "test",
      templateId: `runtime-proof-api-template-${mode}`,
      correlationId: `runtime-proof-api-${mode}`,
    }),
  });
  assertObject(created.body, "notification create");
  assertObject(created.body.notification, "notification create body");
  const expectedProviderMode = expectedNotificationProviderMode(mode);
  const expectedProviderRef = expectedNotificationProviderRef(mode);
  if (
    created.status !== 200 ||
    created.body.notification.providerMode !== expectedProviderMode ||
    created.body.notification.providerRef !== expectedProviderRef
  ) {
    throw new Error("notification API did not use the expected runtime provider binding");
  }

  const notificationId = String(created.body.notification.notificationId);
  const queued = await fetchJson(
    `${baseUrl}/v1/notifications/${encodeURIComponent(notificationId)}/send`,
    {
      method: "POST",
      headers: { ...headers, "idempotency-key": `runtime-proof-api-send-${mode}` },
      body: JSON.stringify({ tenantId: DEV_TENANT_ID }),
    },
  );
  assertObject(queued.body, "notification send");
  assertObject(queued.body.notification, "notification send body");
  if (
    queued.status !== 200 ||
    queued.body.notification.providerMode !== expectedProviderMode ||
    queued.body.notification.providerRef !== expectedProviderRef ||
    queued.body.notification.deliveryStatus !== "queued"
  ) {
    throw new Error("notification API send proof did not preserve provider binding metadata");
  }

  return {
    providerMode: expectedProviderMode,
    providerRef: expectedProviderRef,
    queuedStatus: queued.status,
  };
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
  if (
    value.providerMode !== DEV_IN_MEMORY_PROVIDER_MODE_LABEL &&
    value.providerMode !== DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL
  ) {
    throw new Error("worker proof summary did not report an approved runtime provider mode");
  }
  if (value.jobStatus !== "succeeded") {
    throw new Error("worker proof summary did not report a succeeded job");
  }
  if (
    value.notificationProviderMode !== "in-memory" &&
    value.notificationProviderMode !== "composed-test"
  ) {
    throw new Error("worker proof summary did not report a notification provider mode");
  }
  if (value.notificationDeliveryStatus !== "sent" || !value.notificationProviderMessageIdPresent) {
    throw new Error("worker proof summary did not report notification delivery evidence");
  }
  if (typeof value.auditEvents !== "number" || value.auditEvents < 5) {
    throw new Error("worker proof summary did not report audit evidence");
  }
  if (value.tenantBoundaryDenied !== true || value.authorizationDenied !== true) {
    throw new Error("worker proof summary did not record fail-closed boundaries");
  }
  if (!Array.isArray(value.databaseProviderEvidence)) {
    throw new Error("worker proof summary did not report database provider evidence shape");
  }
  for (const key of [
    "eventBusProviderEvidence",
    "objectStoreProviderEvidence",
    "identityProviderEvidence",
    "secretProviderEvidence",
    "workflowProviderEvidence",
  ]) {
    if (!Array.isArray(value[key])) {
      throw new Error(`worker proof summary did not report ${key} shape`);
    }
  }
}

function expectedRuntimeProviderMode(mode: DevRuntimeMode): DevProviderModeLabel {
  return mode === "dev-compose-backed"
    ? DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL
    : DEV_IN_MEMORY_PROVIDER_MODE_LABEL;
}

function expectedRuntimeProviderClass(mode: DevRuntimeMode): DevProviderClass {
  return mode === "dev-compose-backed" ? "local-composed-real-service" : "hermetic-mock";
}

function expectedNotificationProviderMode(mode: DevRuntimeMode): "in-memory" | "composed-test" {
  return mode === "dev-compose-backed" ? "composed-test" : "in-memory";
}

function expectedNotificationProviderRef(
  mode: DevRuntimeMode,
): "notify-in-memory" | typeof MAILPIT_PROVIDER_REGISTRY_ID {
  return mode === "dev-compose-backed" ? MAILPIT_PROVIDER_REGISTRY_ID : "notify-in-memory";
}

function assertPostgresEvidence(
  value: unknown,
  surface: "api" | "worker",
): asserts value is PostgresComposedMembershipEvidence {
  assertObject(value, `${surface} postgres provider evidence`);
  if (
    value.providerRef !== POSTGRES_PROVIDER_REGISTRY_ID ||
    value.providerRegistryId !== POSTGRES_PROVIDER_REGISTRY_ID ||
    value.bindingId !== POSTGRES_RUNTIME_PROVIDER_BINDING_ID ||
    value.sdkPackage !== PG_SDK_PACKAGE ||
    value.sdkVersion !== PG_SDK_VERSION ||
    value.sdkBoundary !== "adapter-package-only" ||
    value.endpointRef !== "endpoint://compose/postgres" ||
    value.readinessChecked !== true ||
    value.readinessRetryPolicy !== "bounded-exponential-backoff-60s" ||
    typeof value.readinessAttempts !== "number" ||
    value.readinessAttempts < 1 ||
    typeof value.retryCount !== "number" ||
    value.retryCount < 0 ||
    typeof value.connectionFailureCount !== "number" ||
    value.connectionFailureCount < 0 ||
    typeof value.operationLatencyBucket !== "string" ||
    value.adapterHealthStatus !== "healthy" ||
    value.structuredLogEvidenceCaptured !== true ||
    value.traceEvidenceCaptured !== true ||
    value.metricEvidenceCaptured !== true ||
    value.auditEvidenceCaptured !== true ||
    value.redactionChecked !== true ||
    !isSafeHashString(value.traceIdHash) ||
    !isSafeHashString(value.correlationIdHash) ||
    typeof value.operation !== "string" ||
    value.operationOutcome !== "succeeded" ||
    value.safeErrorCode !== null ||
    typeof value.failClosedDenials !== "number" ||
    value.failClosedDenials < 0 ||
    value.iso27001Support !== "asset-inventory-control-evidence-only-no-certification-claim" ||
    value.readbackChecked !== true ||
    value.tenantIsolationChecked !== true ||
    value.safeProviderSummary !== "postgres-composed-provider"
  ) {
    throw new Error(`${surface} postgres provider evidence is incomplete`);
  }
  assertNoRawProviderMaterial(value, `${surface} postgres provider evidence`);
  if (surface === "worker" && value.writeChecked !== true) {
    throw new Error("worker postgres provider evidence did not prove write behavior");
  }
  if (typeof value.membershipCount !== "number" || value.membershipCount < 1) {
    throw new Error(`${surface} postgres provider evidence did not report memberships`);
  }
}

function assertNoRawProviderMaterial(value: unknown, label: string): void {
  const text = JSON.stringify(value).toLowerCase();
  for (const forbidden of [
    "http://",
    "https://",
    "postgres://",
    "postgresql://",
    "nats://",
    "redis://",
    "bearer ",
    "admin_password",
    "dev-root-token",
    "minio_password",
    "minioadmin",
    "127.0.0.1",
    "localhost",
    "connection_string",
    "stack trace",
    "stacktrace",
  ]) {
    if (text.includes(forbidden)) {
      throw new Error(`${label} leaked raw provider material: ${forbidden}`);
    }
  }
}

function assertProviderEvidenceBase(
  value: unknown,
  label: string,
  expected: {
    readonly providerRegistryId: string;
    readonly bindingId: string;
    readonly adapterName: string;
    readonly endpointRef: string;
    readonly safeProviderSummary: string;
    readonly readinessRetryPolicy?: string;
  },
): asserts value is Record<string, unknown> {
  assertObject(value, label);
  const defects = [
    value.providerMode === "composed-test" ? null : "providerMode",
    value.providerRef === expected.providerRegistryId ? null : "providerRef",
    value.providerRegistryId === expected.providerRegistryId ? null : "providerRegistryId",
    value.bindingId === expected.bindingId ? null : "bindingId",
    value.adapterName === expected.adapterName ? null : "adapterName",
    value.sdkBoundary === "adapter-package-only" ? null : "sdkBoundary",
    value.endpointRef === expected.endpointRef ? null : "endpointRef",
    value.safeProviderSummary === expected.safeProviderSummary ? null : "safeProviderSummary",
    value.readinessChecked === true ? null : "readinessChecked",
    expected.readinessRetryPolicy === undefined ||
    value.readinessRetryPolicy === expected.readinessRetryPolicy
      ? null
      : "readinessRetryPolicy",
    typeof value.readinessAttempts === "number" && value.readinessAttempts >= 1
      ? null
      : "readinessAttempts",
    typeof value.retryCount === "number" && value.retryCount >= 0 ? null : "retryCount",
    typeof value.connectionFailureCount === "number" && value.connectionFailureCount >= 0
      ? null
      : "connectionFailureCount",
    typeof value.operationLatencyBucket === "string" ? null : "operationLatencyBucket",
    value.adapterHealthStatus === "healthy" ? null : "adapterHealthStatus",
    value.structuredLogEvidenceCaptured === true ? null : "structuredLogEvidenceCaptured",
    value.traceEvidenceCaptured === true ? null : "traceEvidenceCaptured",
    value.metricEvidenceCaptured === true ? null : "metricEvidenceCaptured",
    value.auditEvidenceCaptured === true ? null : "auditEvidenceCaptured",
    value.redactionChecked === true ? null : "redactionChecked",
    isSafeHashString(value.traceIdHash) ? null : "traceIdHash",
    isSafeHashString(value.correlationIdHash) ? null : "correlationIdHash",
    typeof value.operation === "string" ? null : "operation",
    value.operationOutcome === "succeeded" ? null : "operationOutcome",
    value.safeErrorCode === null ? null : "safeErrorCode",
    typeof value.failClosedDenials === "number" && value.failClosedDenials >= 0
      ? null
      : "failClosedDenials",
    value.iso27001Support === "asset-inventory-control-evidence-only-no-certification-claim"
      ? null
      : "iso27001Support",
  ].filter((item): item is string => item !== null);
  if (defects.length > 0) {
    throw new Error(`${label} base evidence is incomplete: ${defects.join(", ")}`);
  }
  assertNoRawProviderMaterial(value, label);
}

function assertMailpitEvidence(
  value: unknown,
  surface: "api" | "worker",
): asserts value is MailpitComposedDeliveryEvidence {
  assertProviderEvidenceBase(value, `${surface} Mailpit provider evidence`, {
    providerRegistryId: MAILPIT_PROVIDER_REGISTRY_ID,
    bindingId: "mailpit-notification-provider",
    adapterName: "MailpitNotificationProvider",
    endpointRef: "endpoint://compose/mailpit",
    safeProviderSummary: "mailpit-composed-provider",
    readinessRetryPolicy: "bounded-exponential-backoff-60s",
  });
  if (
    value.serviceCatalogueServiceId !== "mailpit" ||
    value.sdkPackage !== "mailpit-api" ||
    value.sdkVersion !== "2.1.0" ||
    value.writeChecked !== true ||
    value.readbackChecked !== true ||
    value.cleanupAttempted !== true ||
    value.cleanupSucceeded !== true
  ) {
    throw new Error(`${surface} Mailpit provider evidence did not prove notification delivery`);
  }
}

function isSafeHashString(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{48,64}$|^sha256_[a-f0-9]{24,64}$/.test(value);
}

function assertNatsEvidence(
  value: unknown,
  surface: "api" | "worker",
): asserts value is NatsComposedEventBusEvidence {
  assertProviderEvidenceBase(value, `${surface} NATS provider evidence`, {
    providerRegistryId: NATS_PROVIDER_REGISTRY_ID,
    bindingId: NATS_RUNTIME_PROVIDER_BINDING_ID,
    adapterName: "NatsEventBus",
    endpointRef: "endpoint://compose/nats",
    safeProviderSummary: "nats-composed-provider",
    readinessRetryPolicy: "bounded-exponential-backoff-60s",
  });
  if (
    value.sdkPackage !== NATS_SDK_PACKAGE ||
    value.sdkVersion !== NATS_SDK_VERSION ||
    value.publishChecked !== true ||
    (surface === "worker" &&
      (value.readbackChecked !== true || value.tenantIsolationChecked !== true))
  ) {
    throw new Error(`${surface} NATS provider evidence did not prove publish/readback`);
  }
}

function assertMinioEvidence(
  value: unknown,
  surface: "api" | "worker",
): asserts value is MinioComposedObjectStoreEvidence {
  assertProviderEvidenceBase(value, `${surface} MinIO provider evidence`, {
    providerRegistryId: MINIO_PROVIDER_REGISTRY_ID,
    bindingId: MINIO_RUNTIME_PROVIDER_BINDING_ID,
    adapterName: "MinioObjectStore",
    endpointRef: "endpoint://compose/minio",
    safeProviderSummary: "minio-composed-provider",
    readinessRetryPolicy: "bounded-exponential-backoff-60s",
  });
  if (
    value.sdkPackage !== MINIO_SDK_PACKAGE ||
    value.sdkVersion !== MINIO_SDK_VERSION ||
    value.writeChecked !== true ||
    value.readbackChecked !== true ||
    (surface === "worker" &&
      (value.deleteChecked !== true || value.tenantIsolationChecked !== true))
  ) {
    throw new Error(`${surface} MinIO provider evidence did not prove object round trip`);
  }
}

function assertKeycloakEvidence(
  value: unknown,
  surface: "api" | "worker",
): asserts value is KeycloakComposedIdentityEvidence {
  assertProviderEvidenceBase(value, `${surface} Keycloak provider evidence`, {
    providerRegistryId: KEYCLOAK_PROVIDER_REGISTRY_ID,
    bindingId: KEYCLOAK_RUNTIME_PROVIDER_BINDING_ID,
    adapterName: "KeycloakComposedIdentityProvider",
    endpointRef: "endpoint://compose/keycloak",
    safeProviderSummary: "keycloak-composed-provider",
    readinessRetryPolicy: "bounded-exponential-backoff-120s-keycloak",
  });
  if (
    value.sdkPackage !== KEYCLOAK_ADMIN_SDK_PACKAGE ||
    value.sdkVersion !== KEYCLOAK_ADMIN_SDK_VERSION ||
    value.realmChecked !== true ||
    value.syntheticIdentityChecked !== true ||
    value.readbackChecked !== true ||
    (surface === "worker" &&
      (value.tenantBoundaryChecked !== true || value.failClosedChecked !== true))
  ) {
    throw new Error(`${surface} Keycloak provider evidence did not prove identity round trip`);
  }
}

function assertOpenBaoEvidence(
  value: unknown,
  surface: "api" | "worker",
): asserts value is OpenBaoSecretEvidence {
  assertProviderEvidenceBase(value, `${surface} OpenBao provider evidence`, {
    providerRegistryId: OPENBAO_PROVIDER_REGISTRY_ID,
    bindingId: OPENBAO_SECRET_BINDING_ID,
    adapterName: "OpenBaoSecretStore",
    endpointRef: "endpoint://compose/openbao",
    safeProviderSummary: "openbao-composed-secret-provider",
    readinessRetryPolicy: "bounded-exponential-backoff-60s",
  });
  if (
    value.sdkPackage !== OPENBAO_SDK_PACKAGE ||
    value.sdkVersion !== OPENBAO_SDK_VERSION ||
    value.writeChecked !== true ||
    value.describeChecked !== true ||
    value.resolveChecked !== true ||
    value.tenantIsolationChecked !== true
  ) {
    throw new Error(`${surface} OpenBao provider evidence did not prove secret round trip`);
  }
}

function assertTemporalEvidence(
  value: unknown,
  surface: "api" | "worker",
): asserts value is TemporalComposedWorkflowEvidence {
  assertProviderEvidenceBase(value, `${surface} Temporal provider evidence`, {
    providerRegistryId: TEMPORAL_PROVIDER_REGISTRY_ID,
    bindingId: TEMPORAL_RUNTIME_PROVIDER_BINDING_ID,
    adapterName: "TemporalComposedWorkflowEngine",
    endpointRef: "endpoint://compose/temporal",
    safeProviderSummary: "temporal-composed-provider",
    readinessRetryPolicy: "bounded-exponential-backoff-60s",
  });
  if (
    value.clientSdkPackage !== TEMPORAL_CLIENT_SDK_PACKAGE ||
    value.clientSdkVersion !== TEMPORAL_CLIENT_SDK_VERSION ||
    value.workerStarted !== true ||
    value.workflowScheduled !== true ||
    value.executionCompleted !== true ||
    value.readbackChecked !== true ||
    value.tenantBoundaryChecked !== true ||
    value.failClosedChecked !== true ||
    value.cleanupAttempted !== true ||
    value.cleanupSucceeded !== true
  ) {
    throw new Error(`${surface} Temporal provider evidence did not prove workflow execution`);
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
    if (
      health.body.providerMode !== expectedRuntimeProviderMode(mode) ||
      health.body.providerClass !== expectedRuntimeProviderClass(mode)
    ) {
      throw new Error("/healthz did not report the expected provider binding mode");
    }

    const ready = await fetchJson(`${baseUrl}/readyz`);
    assertObject(ready.body, "ready");
    if (ready.status !== 200 || ready.body.runtimeMode !== mode) {
      throw new Error(`/readyz did not report runtime mode ${mode}`);
    }
    if (ready.body.serviceCatalogueAuthority !== SERVICE_CATALOGUE_AUTHORITY) {
      throw new Error("/readyz did not report the service catalogue authority");
    }
    const composedProviderBindings = Array.isArray(ready.body.composedProviderBindings)
      ? ready.body.composedProviderBindings
      : [];
    if (mode === "dev-compose-backed") {
      const requiredBindings = new Set([
        POSTGRES_RUNTIME_PROVIDER_BINDING_ID,
        "mailpit-notification-provider",
        NATS_RUNTIME_PROVIDER_BINDING_ID,
        MINIO_RUNTIME_PROVIDER_BINDING_ID,
        KEYCLOAK_RUNTIME_PROVIDER_BINDING_ID,
        OPENBAO_SECRET_BINDING_ID,
        TEMPORAL_RUNTIME_PROVIDER_BINDING_ID,
      ]);
      for (const bindingId of requiredBindings) {
        const present = composedProviderBindings.some(
          (binding) =>
            binding &&
            typeof binding === "object" &&
            "bindingId" in binding &&
            binding.bindingId === bindingId,
        );
        if (!present) {
          throw new Error(`/readyz did not report active composed provider binding ${bindingId}`);
        }
      }
      const hasPostgresBinding = composedProviderBindings.some(
        (binding) =>
          binding &&
          typeof binding === "object" &&
          "bindingId" in binding &&
          binding.bindingId === POSTGRES_RUNTIME_PROVIDER_BINDING_ID,
      );
      const hasMailpitBinding = composedProviderBindings.some(
        (binding) =>
          binding &&
          typeof binding === "object" &&
          "bindingId" in binding &&
          binding.bindingId === "mailpit-notification-provider",
      );
      if (!hasPostgresBinding) {
        throw new Error("/readyz did not report the active Postgres composed provider binding");
      }
      if (!hasMailpitBinding) {
        throw new Error("/readyz did not report the active Mailpit composed provider binding");
      }
      const deferredProviderBindings = Array.isArray(ready.body.deferredProviderBindings)
        ? ready.body.deferredProviderBindings
        : [];
      if (deferredProviderBindings.length !== 0) {
        throw new Error("/readyz still reported deferred provider bindings");
      }
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

    let eventBusProviderEvidence: NatsComposedEventBusEvidence | null = null;
    let objectStoreProviderEvidence: MinioComposedObjectStoreEvidence | null = null;
    let identityProviderEvidence: KeycloakComposedIdentityEvidence | null = null;
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

    let databasePermissionStatus: number | null = null;
    let databaseProviderEvidence: PostgresComposedMembershipEvidence | null = null;
    if (mode === "dev-compose-backed") {
      const readyAfterTenantContext = await fetchJson(`${baseUrl}/readyz`);
      assertObject(readyAfterTenantContext.body, "ready after tenant context");
      assertNatsEvidence(readyAfterTenantContext.body.eventBusProviderEvidence, "api");
      eventBusProviderEvidence = readyAfterTenantContext.body.eventBusProviderEvidence;

      const login = await fetchJson(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantId: DEV_TENANT_ID,
          email: "runtime-proof-api-keycloak@example.test",
        }),
      });
      assertObject(login.body, "login proof");
      if (
        login.status !== 200 ||
        login.body.providerMode !== "local-composed-real-service" ||
        login.body.tenantId !== DEV_TENANT_ID
      ) {
        throw new Error(
          `Keycloak API login proof did not use composed identity provider: status=${login.status} body=${JSON.stringify(login.body)}`,
        );
      }
      const readyAfterLogin = await fetchJson(`${baseUrl}/readyz`);
      assertObject(readyAfterLogin.body, "ready after identity provider read");
      assertKeycloakEvidence(readyAfterLogin.body.identityProviderEvidence, "api");
      identityProviderEvidence = readyAfterLogin.body.identityProviderEvidence;

      const fileId = `runtime-proof-api-file-${mode}`;
      const fileBody = "synthetic minio API runtime proof payload";
      const fileUpload = await fetchJson(`${baseUrl}/v1/files`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dev-tenant-id": DEV_TENANT_ID,
          "x-dev-actor-id": DEV_ACTOR_ID,
          "x-dev-roles": "tenant-admin",
        },
        body: JSON.stringify({
          tenantId: DEV_TENANT_ID,
          fileId,
          filename: "runtime-proof.txt",
          contentType: "text/plain",
          sizeBytes: Buffer.byteLength(fileBody),
          body: fileBody,
          classification: "confidential",
        }),
      });
      if (fileUpload.status !== 200) {
        throw new Error(`MinIO API upload proof failed with status ${fileUpload.status}`);
      }
      const fileDownload = await fetchJson(
        `${baseUrl}/v1/files/${encodeURIComponent(fileId)}/download?tenantId=${DEV_TENANT_ID}`,
        {
          method: "POST",
          headers: {
            "x-dev-tenant-id": DEV_TENANT_ID,
            "x-dev-actor-id": DEV_ACTOR_ID,
            "x-dev-roles": "tenant-admin",
          },
        },
      );
      assertObject(fileDownload.body, "file download proof");
      if (fileDownload.status !== 200 || fileDownload.body.body !== fileBody) {
        throw new Error("MinIO API download proof did not read back the synthetic object");
      }
      const readyAfterFile = await fetchJson(`${baseUrl}/readyz`);
      assertObject(readyAfterFile.body, "ready after object-store read");
      assertMinioEvidence(readyAfterFile.body.objectStoreProviderEvidence, "api");
      objectStoreProviderEvidence = readyAfterFile.body.objectStoreProviderEvidence;

      const permissions = await fetchJson(
        `${baseUrl}/v1/authz/permissions?tenantId=${DEV_TENANT_ID}`,
        {
          headers: {
            "x-dev-tenant-id": DEV_TENANT_ID,
            "x-dev-actor-id": DEV_ACTOR_ID,
            "x-dev-roles": "tenant-member",
          },
        },
      );
      databasePermissionStatus = permissions.status;
      if (permissions.status !== 200) {
        throw new Error(
          `database-backed permission proof failed with status ${permissions.status}`,
        );
      }
      const readyAfterDatabaseRead = await fetchJson(`${baseUrl}/readyz`);
      assertObject(readyAfterDatabaseRead.body, "ready after database provider read");
      const rawDatabaseProviderEvidence = readyAfterDatabaseRead.body.databaseProviderEvidence;
      assertPostgresEvidence(rawDatabaseProviderEvidence, "api");
      databaseProviderEvidence = rawDatabaseProviderEvidence;
    }

    const notification = await runApiNotificationProof(baseUrl, mode);

    const summary: ApiProofSummary = {
      api: baseUrl,
      health: `${baseUrl}/healthz`,
      openapi: `${baseUrl}/openapi.json`,
      runtimeMode: mode,
      providerMode: expectedRuntimeProviderMode(mode),
      providerClass: expectedRuntimeProviderClass(mode),
      tenantAcceptedStatus: accepted.status,
      tenantMismatchStatus: mismatch.status,
      authorizationFailureStatus: authorizationFailure.status,
      notificationProviderMode: notification.providerMode,
      notificationProviderRef: notification.providerRef,
      notificationQueuedStatus: notification.queuedStatus,
      composedProviderBindingsActive: composedProviderBindings.length,
      databasePermissionStatus,
      databaseProviderEvidence,
      eventBusProviderEvidence,
      objectStoreProviderEvidence,
      identityProviderEvidence,
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
      notificationProviderMode: summary.notificationProviderMode,
      notificationQueuedStatus: summary.notificationQueuedStatus,
      composedProviderBindingsActive: summary.composedProviderBindingsActive,
      databasePermissionStatus: summary.databasePermissionStatus,
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
    if (
      summary.providerMode !== expectedRuntimeProviderMode(mode) ||
      summary.notificationProviderMode !== expectedNotificationProviderMode(mode)
    ) {
      throw new Error("worker proof did not report expected provider binding mode");
    }
    if (mode === "dev-compose-backed") {
      if (summary.composedProviderEvidence.length === 0) {
        throw new Error("worker compose proof did not report composed provider evidence");
      }
      for (const evidence of summary.composedProviderEvidence) {
        assertMailpitEvidence(evidence, "worker");
      }
      if (summary.databaseProviderEvidence.length === 0) {
        throw new Error("worker compose proof did not report Postgres provider evidence");
      }
      for (const evidence of summary.databaseProviderEvidence) {
        assertPostgresEvidence(evidence, "worker");
      }
      if (summary.eventBusProviderEvidence.length === 0) {
        throw new Error("worker compose proof did not report NATS provider evidence");
      }
      for (const evidence of summary.eventBusProviderEvidence) {
        assertNatsEvidence(evidence, "worker");
      }
      if (summary.objectStoreProviderEvidence.length === 0) {
        throw new Error("worker compose proof did not report MinIO provider evidence");
      }
      for (const evidence of summary.objectStoreProviderEvidence) {
        assertMinioEvidence(evidence, "worker");
      }
      if (summary.identityProviderEvidence.length === 0) {
        throw new Error("worker compose proof did not report Keycloak provider evidence");
      }
      for (const evidence of summary.identityProviderEvidence) {
        assertKeycloakEvidence(evidence, "worker");
      }
      if (summary.secretProviderEvidence.length === 0) {
        throw new Error("worker compose proof did not report OpenBao provider evidence");
      }
      for (const evidence of summary.secretProviderEvidence) {
        assertOpenBaoEvidence(evidence, "worker");
      }
      if (summary.workflowProviderEvidence.length === 0) {
        throw new Error("worker compose proof did not report Temporal provider evidence");
      }
      for (const evidence of summary.workflowProviderEvidence) {
        assertTemporalEvidence(evidence, "worker");
      }
    }
    assertNoProhibitedClaims({
      runtimeMode: summary.runtimeMode,
      providerMode: summary.providerMode,
      notificationProviderMode: summary.notificationProviderMode,
      jobStatus: summary.jobStatus,
      notificationDeliveryStatus: summary.notificationDeliveryStatus,
      databaseProviderEvidence: summary.databaseProviderEvidence.length,
      eventBusProviderEvidence: summary.eventBusProviderEvidence.length,
      objectStoreProviderEvidence: summary.objectStoreProviderEvidence.length,
      identityProviderEvidence: summary.identityProviderEvidence.length,
      secretProviderEvidence: summary.secretProviderEvidence.length,
      workflowProviderEvidence: summary.workflowProviderEvidence.length,
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
  if (mode === "dev-compose-backed" && deferredBoundaries.length !== 0) {
    throw new Error("compose-backed proof still recorded a deferred provider-binding boundary");
  }
  if (
    mode === "dev-compose-backed" &&
    (api.providerMode === DEV_IN_MEMORY_PROVIDER_MODE_LABEL ||
      worker.providerMode === DEV_IN_MEMORY_PROVIDER_MODE_LABEL ||
      api.notificationProviderMode !== "composed-test" ||
      worker.notificationProviderMode !== "composed-test" ||
      worker.composedProviderEvidence.length === 0 ||
      api.databaseProviderEvidence === null ||
      api.eventBusProviderEvidence === null ||
      api.objectStoreProviderEvidence === null ||
      api.identityProviderEvidence === null ||
      worker.databaseProviderEvidence.length === 0 ||
      worker.eventBusProviderEvidence.length === 0 ||
      worker.objectStoreProviderEvidence.length === 0 ||
      worker.identityProviderEvidence.length === 0 ||
      worker.secretProviderEvidence.length === 0 ||
      worker.workflowProviderEvidence.length === 0)
  ) {
    throw new Error("compose-backed proof did not prove a real composed provider binding");
  }
  return {
    issueId: "USF-183",
    parentIssueId: "USF-133",
    mode,
    providerMode: expectedRuntimeProviderMode(mode),
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
    composedProviderEvidence: [
      ...worker.composedProviderEvidence,
      ...(api.eventBusProviderEvidence ? [api.eventBusProviderEvidence] : []),
      ...(api.objectStoreProviderEvidence ? [api.objectStoreProviderEvidence] : []),
      ...(api.identityProviderEvidence ? [api.identityProviderEvidence] : []),
      ...worker.eventBusProviderEvidence,
      ...worker.objectStoreProviderEvidence,
      ...worker.identityProviderEvidence,
      ...worker.secretProviderEvidence,
      ...worker.workflowProviderEvidence,
    ],
    databaseProviderEvidence: [
      ...(api.databaseProviderEvidence ? [api.databaseProviderEvidence] : []),
      ...worker.databaseProviderEvidence,
    ],
  };
}

export async function runRuntimeProofInMemory(): Promise<RuntimeProofSummary> {
  return runModeProof("dev-in-memory");
}

export async function runRuntimeProofCompose(): Promise<RuntimeProofSummary> {
  const projectName = `foundation-runtime-proof-${process.pid}`;
  return withComposeBoundary(projectName, async () => {
    await preparePostgresRuntimeProofDatabase(runtimeProofDatabaseSeed());
    return runModeProof("dev-compose-backed", projectName);
  });
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
  console.log(`API notification provider mode: ${summary.api.notificationProviderMode}`);
  console.log(`Worker notification provider mode: ${summary.worker.notificationProviderMode}`);
  console.log(
    `Composed non-database provider evidence count: ${summary.composedProviderEvidence.length}`,
  );
  console.log(`Postgres provider evidence count: ${summary.databaseProviderEvidence.length}`);
  console.log(`API audit events captured: ${summary.api.auditEvents}`);
  console.log(`Worker audit events captured: ${summary.worker.auditEvents}`);
  console.log(`Compose boundary started: ${summary.composeBoundary.started ? "yes" : "no"}`);
  console.log(`Prohibited claims observed: ${summary.prohibitedClaimsObserved.length}`);
}

function runtimeProofDatabaseSeed() {
  return Object.freeze({
    tenants: Object.freeze([
      Object.freeze({
        tenantId: DEV_TENANT_ID,
        canonicalDomain: "runtime-proof.dev.example",
        actors: Object.freeze([
          Object.freeze({
            actorId: DEV_ACTOR_ID,
            email: "dev-actor@example.test",
            roles: Object.freeze(["tenant-admin"]),
          }),
          Object.freeze({
            actorId: DEV_SECURITY_ACTOR_ID,
            email: "dev-security-actor@example.test",
            roles: Object.freeze(["security-admin"]),
          }),
        ]),
      }),
      Object.freeze({
        tenantId: POSTGRES_PROOF_OTHER_TENANT_ID,
        canonicalDomain: "runtime-proof-other.dev.example",
        actors: Object.freeze([
          Object.freeze({
            actorId: "runtime-proof-other-actor",
            email: "runtime-proof-other-actor@example.test",
            roles: Object.freeze(["tenant-admin"]),
          }),
        ]),
      }),
    ]),
  });
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
