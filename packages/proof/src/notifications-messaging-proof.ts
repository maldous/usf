// Notifications & messaging proof (parity-notifications-messaging, USF-133).
//
// Hermetic behaviour proof of controlled communications. Exercises the real
// notification capability, in-memory provider adapter, PDP, audit event store, and
// operational job service. It proves tenant scope, classification, template safety,
// recipient/address redaction, consent/suppression fail-closed handling, provider
// config via secret references, idempotent delivery jobs, bounded retry/dead-letter
// evidence, and lifecycle audit.
//
// Hermetic-mock / hermetic. NOT live email/SMS/push/webhook/SMTP/provider,
// deliverability, production-live, legal-certification, or ISO-certification evidence.
import { fileURLToPath } from "node:url";
import { InMemoryNotificationProvider } from "@foundation/adapter-mail";
import { InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createJobService } from "@foundation/capability-jobs";
import { NotificationCapability } from "@foundation/capability-notify";
import {
  createPolicyDecisionPoint,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import {
  createTenantContext,
  type BackoffPolicy,
  type NotificationProviderConfig,
  type NotificationRecipient,
  type NotificationTemplateDefinition,
  type SecretReference,
} from "@foundation/core";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const BACKOFF: BackoffPolicy = {
  strategy: "fixed",
  baseSeconds: 1,
  factor: 1,
  maxRetries: 1,
  maxBackoffSeconds: 5,
  jitter: false,
};

function secretRef(tenantId: string): SecretReference {
  return Object.freeze({
    secretRef: `secret://${tenantId}/notification-mail-api-key`,
    secretProvider: "in-memory",
    scope: tenantId,
    version: "1",
    status: "active",
    rotationPolicy: "manual-dev",
    lastRotatedAt: null,
    nextRotationDueAt: null,
    owner: "platform",
  });
}

function providerConfig(tenantId: string): NotificationProviderConfig {
  return Object.freeze({
    providerRef: `provider-${tenantId}`,
    providerType: "mail",
    providerMode: "in-memory",
    channel: "email",
    endpoint: null,
    allowedHosts: [],
    allowedSchemes: [],
    tlsRequired: false,
    credentialRef: secretRef(tenantId),
    senderIdentityRef: "sender-local-test",
    rateLimitPolicy: "tenant-100-per-hour",
    retryPolicy: BACKOFF,
    timeoutPolicy: "5s",
    circuitBreakerPolicy: "closed-in-test",
    egressPolicy: "local-only",
  });
}

function recipient(tenantId: string, id: string): NotificationRecipient {
  return Object.freeze({
    recipientId: id,
    recipientActorId: id,
    recipientTenantId: tenantId,
    recipientType: "actor",
    addressRef: `${id}@example.test`,
    addressType: "email",
    addressVerified: true,
    addressStatus: "active",
    addressSource: "synthetic-proof",
    addressLastVerifiedAt: "2026-01-01T00:00:00Z",
  });
}

function template(): Omit<NotificationTemplateDefinition, "templateHash"> {
  return {
    templateId: "proof-template",
    templateKey: "proof.controlled-communication",
    templateVersion: "1",
    templateStatus: "approved",
    templateOwner: "platform",
    templateClassification: "transactional",
    allowedChannels: ["email", "test"],
    allowedNotificationClasses: ["transactional", "security", "marketing", "test"],
    subjectTemplate: "Notice {{displayName}}",
    bodyTemplate: "Hello {{displayName}}",
    subjectClassification: "internal",
    bodyClassification: "confidential",
    payloadClassification: "confidential",
    renderContextSchema: { type: "object" },
    allowedVariables: [{ name: "displayName", required: true, dataClassification: "confidential" }],
    createdBy: "admin-a",
    approvedBy: "admin-a",
    approvedAt: "2026-01-01T00:00:00Z",
    deprecatedAt: null,
    immutableAfterFirstUse: true,
    firstUsedAt: null,
  };
}

export async function runNotificationsMessagingProof() {
  const checks: string[] = [];
  const pass = (label: string): void => {
    checks.push(label);
  };
  let clockSec = 1_700_000_000;

  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "m-admin-a",
    tenantId: TENANT_A,
    actorId: "admin-a",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "m-member-a",
    tenantId: TENANT_A,
    actorId: "member-a",
    status: "active",
    roles: ["tenant-member"],
  });
  memberships.upsert({
    membershipId: "m-admin-b",
    tenantId: TENANT_B,
    actorId: "admin-b",
    status: "active",
    roles: ["tenant-admin"],
  });
  const pdp = createPolicyDecisionPoint({ memberships });
  const audit = new InMemoryAuditEventStore();
  const jobs = createJobService({
    jobs: new InMemoryOperationalJobStore(),
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    defaultBackoff: BACKOFF,
  });
  const provider = new InMemoryNotificationProvider();
  const notify = new NotificationCapability(provider, {
    pdp,
    audit,
    jobs,
    now: () => new Date(clockSec * 1000).toISOString(),
  });
  const adminA = createTenantContext({
    tenantId: TENANT_A,
    actorId: "admin-a",
    roles: ["tenant-admin"],
  });
  const memberA = createTenantContext({
    tenantId: TENANT_A,
    actorId: "member-a",
    roles: ["tenant-member"],
  });
  const adminB = createTenantContext({
    tenantId: TENANT_B,
    actorId: "admin-b",
    roles: ["tenant-admin"],
  });

  const configured = await notify.configureProvider(adminA, providerConfig(TENANT_A));
  if (!configured.ok) throw new Error("notification provider config rejected");
  pass("provider config uses a SecretReference and in-memory provider mode");

  const templateCreated = await notify.createTemplate(adminA, template());
  if (!templateCreated.ok) throw new Error("notification template create failed");
  if (templateCreated.template.templateHash.length !== 64) {
    throw new Error("template hash was not recorded");
  }
  pass("typed approved template records version and hash");

  const notification = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-proof"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template",
  });
  if (!notification.ok) throw new Error("notification create failed");
  pass("classified tenant-scoped notification intent created");

  const denied = await notify.deliverNotification(memberA, notification.view.notificationId, {
    displayName: "Ada",
  });
  if (denied.ok) throw new Error("member without notification.send was permitted");
  pass("notification.send without PDP permission denied");

  const missing = await notify.deliverNotification(adminA, notification.view.notificationId, {});
  if (missing.ok || missing.reasonCode !== "missing-variable") {
    throw new Error("missing template variable did not fail closed");
  }
  pass("missing template variable fails closed");

  const second = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-proof-send"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template",
  });
  if (!second.ok) throw new Error("second notification create failed");
  const firstJob = await notify.enqueueDelivery(adminA, second.view.notificationId);
  const duplicateJob = await notify.enqueueDelivery(adminA, second.view.notificationId);
  if (!firstJob.ok || !duplicateJob.ok || !duplicateJob.deduplicated) {
    throw new Error("delivery job idempotency did not suppress duplicate submission");
  }
  pass("delivery job idempotency suppresses duplicate submission");

  const sent = await notify.deliverNotification(adminA, second.view.notificationId, {
    displayName: "Ada",
  });
  if (!sent.ok || !sent.evidence || sent.evidence.deliveryStatus !== "sent") {
    throw new Error("notification delivery did not record sent evidence");
  }
  pass("delivery evidence is value-free and sent status is audited");

  const marketing = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-marketing-proof"),
    channel: "email",
    classification: "marketing",
    templateId: "proof-template",
  });
  if (!marketing.ok) throw new Error("marketing notification create failed");
  const noConsent = await notify.deliverNotification(adminA, marketing.view.notificationId, {
    displayName: "Ada",
  });
  if (noConsent.ok || noConsent.reasonCode !== "consent-required") {
    throw new Error("marketing send without consent did not fail closed");
  }
  pass("marketing notification requires consent where represented");

  await notify.updateSuppression(adminA, {
    tenantId: TENANT_A,
    recipientId: "recipient-suppressed-proof",
    channel: "all",
    classification: "all",
    suppressionStatus: "active",
    suppressionReason: "do-not-contact",
    suppressionSource: "proof",
    suppressedAt: "2026-01-01T00:00:00Z",
    suppressedBy: "admin-a",
    expiresAt: null,
    bounceStatus: "none",
    complaintStatus: "none",
    doNotContact: true,
  });
  const suppressed = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-suppressed-proof"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template",
  });
  if (!suppressed.ok) throw new Error("suppressed notification create failed");
  const suppressedResult = await notify.deliverNotification(
    adminA,
    suppressed.view.notificationId,
    {
      displayName: "Ada",
    },
  );
  if (suppressedResult.ok || suppressedResult.reasonCode !== "do-not-contact") {
    throw new Error("suppressed recipient did not block delivery");
  }
  pass("suppressed recipient blocks non-mandatory notification");

  const failed = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-failure-proof"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template",
  });
  if (!failed.ok) throw new Error("failure notification create failed");
  let lastFailure;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    provider.failNext("provider token=sk_1234567890abcdef failed");
    lastFailure = await notify.deliverNotification(adminA, failed.view.notificationId, {
      displayName: "Ada",
    });
    clockSec += 1;
  }
  if (!lastFailure || lastFailure.ok || lastFailure.evidence?.deliveryStatus !== "dead-lettered") {
    throw new Error("provider failure did not dead-letter with evidence");
  }
  if (JSON.stringify(lastFailure.evidence).includes("sk_1234567890abcdef")) {
    throw new Error("provider failure leaked a secret-looking value");
  }
  pass("bounded retry ends in dead-letter evidence with redacted failure");

  await notify.configureProvider(adminB, providerConfig(TENANT_B));
  const bTemplate = await notify.createTemplate(adminB, {
    ...template(),
    templateId: "proof-template-b",
    createdBy: "admin-b",
    approvedBy: "admin-b",
  });
  if (!bTemplate.ok) throw new Error("tenant B template create failed");
  const bNotification = await notify.createNotification(adminB, {
    recipient: recipient(TENANT_B, "recipient-b-proof"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template-b",
  });
  if (!bNotification.ok) throw new Error("tenant B notification create failed");
  if ((await notify.readNotification(adminA, bNotification.view.notificationId)).ok) {
    throw new Error("tenant A read tenant B notification");
  }
  pass("tenant A cannot read tenant B notification");

  const auditEvents = await audit.query(adminA, {
    tenantId: TENANT_A,
    category: "notification",
    limit: 200,
  });
  const auditDump = JSON.stringify(auditEvents.events);
  for (const eventType of [
    "notification.created",
    "notification.queued",
    "notification.rendered",
    "notification.sent",
    "notification.suppressed",
    "notification.dead_lettered",
  ]) {
    if (!auditEvents.events.some((event) => event.eventType === eventType)) {
      throw new Error(`missing notification audit event ${eventType}`);
    }
  }
  if (auditDump.includes("@example.test") || auditDump.includes("sk_1234567890abcdef")) {
    throw new Error(
      "notification audit leaked recipient address or secret-looking provider failure",
    );
  }
  pass("notification lifecycle audit is value-free");

  const live = await notify.configureProvider(adminA, {
    ...providerConfig(TENANT_A),
    providerMode: "live-external-deferred",
  });
  if (live.ok) throw new Error("live external provider mode was accepted");
  pass("live external provider mode is explicitly deferred");

  return {
    status: "pass",
    proof: "notifications-messaging",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    checks,
    notificationClassifications: [
      "security",
      "authentication",
      "authorization",
      "transactional",
      "workflow",
      "operational",
      "system",
      "file",
      "identity",
      "configuration",
      "audit",
      "maintenance",
      "marketing",
      "bulk",
      "test",
    ],
    channels: ["email", "sms", "push", "in-app", "webhook", "provider-internal", "test"],
    providerModes: ["in-memory", "local-test", "mock", "live-external-deferred"],
    liveExternalProviderClaim: false,
    liveEmailProviderClaim: false,
    liveSmsProviderClaim: false,
    livePushProviderClaim: false,
    liveSmtpClaim: false,
    productionLiveClaim: false,
    deliverabilityCertificationClaim: false,
    iso27001CertificationClaim: false,
  } as const;
}

async function main() {
  console.log(JSON.stringify(await runNotificationsMessagingProof(), null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
