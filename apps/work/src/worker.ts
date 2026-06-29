import { createTenantContext } from "@foundation/core";
import {
  DEV_ACTOR_ID,
  DEV_TENANT_ID,
  configureRuntimeNotificationProvider,
  createDevRuntime,
  mailpitDeliveryEvidence,
  runtimeModeFromEnv,
  type DevProviderModeLabel,
  type DevRuntime,
  type DevRuntimeMode,
} from "@foundation/app-api/runtime";
import type { PostgresComposedMembershipEvidence } from "@foundation/adapter-db";
import type { MailpitComposedDeliveryEvidence } from "@foundation/adapter-mail";
import type { TenantContext } from "@foundation/core";

interface WorkerNotificationProof {
  readonly providerMode: "in-memory" | "composed-test";
  readonly providerRef: "notify-in-memory" | "notification-delivery-mailpit-composed-test";
  readonly deliveryStatus: "sent";
  readonly providerMessageIdPresent: boolean;
  readonly composedProviderEvidence: readonly MailpitComposedDeliveryEvidence[];
}

export interface WorkerSmokeSummary {
  readonly workerRuntime: "apps/work";
  readonly runtimeMode: DevRuntimeMode;
  readonly providerMode: DevProviderModeLabel;
  readonly tenantId: typeof DEV_TENANT_ID;
  readonly actorId: typeof DEV_ACTOR_ID;
  readonly jobId: string;
  readonly jobStatus: string;
  readonly notificationProviderMode: "in-memory" | "composed-test";
  readonly notificationDeliveryStatus: "sent";
  readonly notificationProviderMessageIdPresent: boolean;
  readonly composedProviderEvidence: readonly MailpitComposedDeliveryEvidence[];
  readonly databaseProviderEvidence: readonly PostgresComposedMembershipEvidence[];
  readonly auditEvents: number;
  readonly tenantBoundaryDenied: true;
  readonly authorizationDenied: true;
  readonly syntheticDataBoundary: "synthetic tenant, actor, and job payload only";
  readonly secretBoundary: "no real secrets or external provider credentials";
  readonly deferredBoundaries: readonly string[];
}

export async function runWorkerSmoke(
  options: { readonly runtimeMode?: DevRuntimeMode } = {},
): Promise<WorkerSmokeSummary> {
  const runtime = createDevRuntime({ runtimeMode: options.runtimeMode ?? runtimeModeFromEnv() });
  try {
    const context = createTenantContext({
      tenantId: DEV_TENANT_ID,
      actorId: DEV_ACTOR_ID,
      roles: ["tenant-admin"],
    });

    const databaseEvidence = await runtime.proveDatabaseProviderRoundTrip(context, {
      tenantId: DEV_TENANT_ID,
      actorId: "runtime-proof-worker-db-actor",
      email: "runtime-proof-worker-db-actor@example.test",
      roles: ["tenant-member"],
    });

    const submitted = await runtime.jobService.submit({
      context,
      classification: "scheduled-maintenance-job",
      jobType: "runtime-proof.synthetic-maintenance",
      payload: {
        proofMode: runtime.runtimeMode,
        synthetic: true,
      },
      idempotencyKey: `runtime-proof-${runtime.runtimeMode}`,
    });
    if (!submitted.ok) {
      throw new Error(`worker smoke job submission denied: ${submitted.reasonCode}`);
    }

    const completed = await runtime.jobService.claimAndRun("runtime-proof-worker", () => ({
      ok: true,
    }));
    if (!completed || completed.status !== "succeeded") {
      throw new Error("worker smoke job did not execute to succeeded status");
    }

    const otherTenant = createTenantContext({
      tenantId: "other-dev-tenant",
      actorId: "other-dev-actor",
      roles: ["tenant-admin"],
    });
    const crossTenantRead = await runtime.jobService.read(otherTenant, submitted.job.jobId);
    if (crossTenantRead.ok) {
      throw new Error("worker smoke cross-tenant read did not fail closed");
    }

    const unauthorized = createTenantContext({
      tenantId: DEV_TENANT_ID,
      actorId: "unauthorized-worker-actor",
      roles: ["tenant-member"],
    });
    const denied = await runtime.jobService.submit({
      context: unauthorized,
      classification: "scheduled-maintenance-job",
      jobType: "runtime-proof.synthetic-denied",
      payload: {
        proofMode: runtime.runtimeMode,
        synthetic: true,
      },
    });
    if (denied.ok) {
      throw new Error("worker smoke authorization failure did not fail closed");
    }

    const notification = await proveNotificationDelivery(runtime, context);

    const audit = await runtime.auditEvents.query(context, {
      tenantId: context.tenantId,
      limit: 100,
    });
    if (audit.events.length < 5) {
      throw new Error("worker smoke did not capture expected audit events");
    }

    return {
      workerRuntime: "apps/work",
      runtimeMode: runtime.runtimeMode,
      providerMode: runtime.providerModeLabel,
      tenantId: DEV_TENANT_ID,
      actorId: DEV_ACTOR_ID,
      jobId: submitted.job.jobId,
      jobStatus: completed.status,
      notificationProviderMode: notification.providerMode,
      notificationDeliveryStatus: notification.deliveryStatus,
      notificationProviderMessageIdPresent: notification.providerMessageIdPresent,
      composedProviderEvidence: notification.composedProviderEvidence,
      databaseProviderEvidence: databaseEvidence ? Object.freeze([databaseEvidence]) : [],
      auditEvents: audit.events.length,
      tenantBoundaryDenied: true,
      authorizationDenied: true,
      syntheticDataBoundary: "synthetic tenant, actor, and job payload only",
      secretBoundary: "no real secrets or external provider credentials",
      deferredBoundaries: runtime.deferredBoundaries,
    };
  } finally {
    await runtime.close();
  }
}

async function proveNotificationDelivery(
  runtime: DevRuntime,
  context: TenantContext,
): Promise<WorkerNotificationProof> {
  await configureRuntimeNotificationProvider(runtime, context);
  const templateId = `runtime-proof-worker-template-${runtime.runtimeMode}`;
  const template = await runtime.notificationCapability.createTemplate(context, {
    templateId,
    templateKey: "runtime-proof-worker",
    templateVersion: "1",
    templateStatus: "approved",
    templateOwner: context.actorId,
    templateClassification: "test",
    allowedChannels: Object.freeze(["test"]),
    allowedNotificationClasses: Object.freeze(["test"]),
    subjectTemplate: "USF runtime proof notification",
    bodyTemplate: "Synthetic runtime proof notification body",
    subjectClassification: "internal",
    bodyClassification: "internal",
    payloadClassification: "internal",
    renderContextSchema: Object.freeze({ type: "object" }),
    allowedVariables: Object.freeze([]),
    createdBy: context.actorId,
    approvedBy: context.actorId,
    approvedAt: new Date().toISOString(),
    deprecatedAt: null,
    immutableAfterFirstUse: true,
    firstUsedAt: null,
  });
  if (!template.ok) {
    throw new Error(`worker notification template creation failed: ${template.reasonCode}`);
  }
  const created = await runtime.notificationCapability.createNotification(context, {
    recipient: {
      recipientId: "runtime-proof-worker-recipient",
      recipientActorId: context.actorId,
      recipientTenantId: context.tenantId,
      recipientType: "test",
      addressRef: "runtime-proof-worker-recipient@example.test",
      addressType: "test",
      addressVerified: true,
      addressStatus: "active",
      addressSource: "runtime-proof",
      addressLastVerifiedAt: new Date().toISOString(),
    },
    channel: "test",
    classification: "test",
    templateId,
    correlationId: `runtime-proof-worker-${runtime.runtimeMode}`,
  });
  if (!created.ok) {
    throw new Error(`worker notification creation failed: ${created.reasonCode}`);
  }
  const delivered = await runtime.notificationCapability.deliverNotification(
    context,
    created.view.notificationId,
    {},
    { testRecipientAuthorised: true },
  );
  if (!delivered.ok || delivered.view.deliveryStatus !== "sent") {
    throw new Error(
      `worker notification delivery failed: ${delivered.ok ? delivered.view.deliveryStatus : delivered.reasonCode}`,
    );
  }
  const composedEvidence = mailpitDeliveryEvidence(runtime);
  if (runtime.runtimeMode === "dev-compose-backed" && !composedEvidence) {
    throw new Error("worker compose proof did not capture Mailpit provider evidence");
  }
  return {
    providerMode: delivered.view.providerMode as "in-memory" | "composed-test",
    providerRef: delivered.view.providerRef as
      "notify-in-memory" | "notification-delivery-mailpit-composed-test",
    deliveryStatus: "sent",
    providerMessageIdPresent: delivered.view.providerMessageId !== null,
    composedProviderEvidence: composedEvidence ? Object.freeze([composedEvidence]) : [],
  };
}
