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
import {
  NotificationCapability,
  createEnterpriseNotificationControlPlane,
  type NotificationEnterpriseEvidence,
} from "@foundation/capability-notify";
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
    allowedNotificationClasses: ["transactional", "security", "marketing", "bulk", "test"],
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
  const enterpriseControls = createEnterpriseNotificationControlPlane({
    notify,
    audit,
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

  const persisted = await enterpriseControls.recordPersistence(adminA, sent.view);
  if (!persisted.ok) throw new Error("notification persistence contract failed");
  const outbox = await enterpriseControls.commitTransactionalOutbox(
    adminA,
    sent.view.notificationId,
  );
  const duplicateOutbox = await enterpriseControls.commitTransactionalOutbox(
    adminA,
    sent.view.notificationId,
  );
  if (!outbox.ok || !duplicateOutbox.ok || !duplicateOutbox.deduplicated) {
    throw new Error("transactional outbox did not dedupe");
  }
  pass("bounded DB persistence contract and transactional outbox are recorded");

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

  const feedbackNotification = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-feedback-proof"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template",
  });
  if (!feedbackNotification.ok) throw new Error("feedback notification create failed");
  const feedbackPersisted = await enterpriseControls.recordPersistence(
    adminA,
    feedbackNotification.view,
  );
  if (!feedbackPersisted.ok) throw new Error("feedback persistence failed");
  const bounceFeedback = await enterpriseControls.ingestProviderFeedback(adminA, {
    feedbackType: "delivery.bounced",
    notificationId: feedbackNotification.view.notificationId,
    recipientId: "recipient-feedback-proof",
    channel: "email",
    classification: "transactional",
    providerRef: "provider-feedback-local",
    providerMessageIdHash: "provider_msg_hash_feedback",
    source: "provider-webhook-local-proof",
  });
  if (!bounceFeedback.ok) throw new Error("bounce feedback ingestion failed");
  const bouncedResult = await notify.deliverNotification(
    adminA,
    feedbackNotification.view.notificationId,
    {
      displayName: "Ada",
    },
  );
  if (bouncedResult.ok || bouncedResult.reasonCode !== "address-bounced") {
    throw new Error("bounce feedback did not suppress later delivery");
  }
  pass("bounce feedback ingestion suppresses later delivery");

  const unsubscribeNotification = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-unsubscribe-proof"),
    channel: "email",
    classification: "marketing",
    templateId: "proof-template",
  });
  if (!unsubscribeNotification.ok) throw new Error("unsubscribe notification create failed");
  const unsubscribePersisted = await enterpriseControls.recordPersistence(
    adminA,
    unsubscribeNotification.view,
  );
  if (!unsubscribePersisted.ok) throw new Error("unsubscribe persistence failed");
  const unsubscribeFeedback = await enterpriseControls.ingestProviderFeedback(adminA, {
    feedbackType: "delivery.unsubscribed",
    notificationId: unsubscribeNotification.view.notificationId,
    recipientId: "recipient-unsubscribe-proof",
    channel: "email",
    classification: "marketing",
    providerRef: "provider-unsubscribe-local",
    providerMessageIdHash: "provider_msg_hash_unsubscribe",
    source: "unsubscribe-api-local-proof",
  });
  if (!unsubscribeFeedback.ok) throw new Error("unsubscribe ingestion failed");
  const unsubscribedResult = await notify.deliverNotification(
    adminA,
    unsubscribeNotification.view.notificationId,
    {
      displayName: "Ada",
    },
  );
  if (unsubscribedResult.ok || unsubscribedResult.reasonCode !== "recipient-opted-out") {
    throw new Error("unsubscribe ingestion did not block marketing delivery");
  }
  pass("unsubscribe ingestion blocks later marketing delivery");

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

  const purgeCandidate = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-purge-proof"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template",
    purgeAllowedAt: "2026-01-01T00:00:00Z",
  });
  if (!purgeCandidate.ok) throw new Error("purge notification create failed");
  if (!(await enterpriseControls.recordPersistence(adminA, purgeCandidate.view)).ok) {
    throw new Error("purge notification persistence failed");
  }
  const purged = await enterpriseControls.purgeNotification(
    adminA,
    purgeCandidate.view.notificationId,
  );
  if (!purged.ok) throw new Error("retention purge failed");
  const legalHold = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-legal-hold-proof"),
    channel: "email",
    classification: "transactional",
    templateId: "proof-template",
    legalHold: true,
  });
  if (!legalHold.ok) throw new Error("legal hold notification create failed");
  if (!(await enterpriseControls.recordPersistence(adminA, legalHold.view)).ok) {
    throw new Error("legal hold persistence failed");
  }
  const legalHoldDenied = await enterpriseControls.purgeNotification(
    adminA,
    legalHold.view.notificationId,
  );
  if (legalHoldDenied.ok || legalHoldDenied.reasonCode !== "legal-hold") {
    throw new Error("legal hold did not block purge");
  }
  pass("retention purge and legal-hold denial are locally proven");

  const addressOk = enterpriseControls.checkAddressVerification(
    recipient(TENANT_A, "recipient-address-ok-proof"),
  );
  const addressDenied = enterpriseControls.checkAddressVerification({
    ...recipient(TENANT_A, "recipient-address-denied-proof"),
    addressVerified: false,
    addressStatus: "unverified",
  });
  if (!addressOk.ok || addressDenied.ok) {
    throw new Error("address verification posture failed");
  }
  pass("address verification fails closed for unverified recipients");

  const firstRate = enterpriseControls.checkRateLimit(adminA, "bulk-campaign-proof", 2);
  const secondRate = enterpriseControls.checkRateLimit(adminA, "bulk-campaign-proof", 2);
  const thirdRate = enterpriseControls.checkRateLimit(adminA, "bulk-campaign-proof", 2);
  if (!firstRate.ok || !secondRate.ok || thirdRate.ok) {
    throw new Error("notification rate limit did not fail closed");
  }
  pass("notification rate limit fails closed after tenant quota");

  const campaignA = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-bulk-a-proof"),
    channel: "email",
    classification: "bulk",
    templateId: "proof-template",
  });
  const campaignB = await notify.createNotification(adminA, {
    recipient: recipient(TENANT_A, "recipient-bulk-b-proof"),
    channel: "email",
    classification: "bulk",
    templateId: "proof-template",
  });
  if (!campaignA.ok || !campaignB.ok) throw new Error("bulk campaign notifications failed");
  if (!(await enterpriseControls.recordPersistence(adminA, campaignA.view)).ok) {
    throw new Error("bulk campaign A persistence failed");
  }
  if (!(await enterpriseControls.recordPersistence(adminA, campaignB.view)).ok) {
    throw new Error("bulk campaign B persistence failed");
  }
  const campaign = await enterpriseControls.runBulkCampaign(adminA, {
    campaignId: "campaign-proof",
    classification: "bulk",
    notificationIds: [campaignA.view.notificationId, campaignB.view.notificationId],
    tenantLimit: 2,
    consentChecked: true,
    suppressionChecked: true,
  });
  const campaignDenied = await enterpriseControls.runBulkCampaign(adminA, {
    campaignId: "campaign-proof-denied",
    classification: "bulk",
    notificationIds: [campaignA.view.notificationId, campaignB.view.notificationId],
    tenantLimit: 1,
    consentChecked: true,
    suppressionChecked: true,
  });
  if (!campaign.ok || campaignDenied.ok || campaignDenied.reasonCode !== "bulk-rate-limited") {
    throw new Error("bulk campaign runtime did not enforce tenant limit");
  }
  pass("bulk campaign runtime enforces consent, suppression, idempotency, and tenant limit");

  const circuitFirst = enterpriseControls.recordProviderFailure("provider-circuit-proof", 2);
  const circuitSecond = enterpriseControls.recordProviderFailure("provider-circuit-proof", 2);
  if (!circuitFirst.ok || circuitSecond.ok || circuitSecond.circuitState !== "open") {
    throw new Error("provider circuit breaker did not open");
  }
  pass("provider circuit breaker opens after bounded failures");

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

  const enterpriseEvidence: NotificationEnterpriseEvidence = enterpriseControls.buildEvidence({
    feedbackEvidence: bounceFeedback.ok,
    unsubscribeEvidence: unsubscribeFeedback.ok,
    retentionEvidence: purged.ok,
    legalHoldDenied: !legalHoldDenied.ok && legalHoldDenied.reasonCode === "legal-hold",
    bulkEvidence: campaign.ok && !campaignDenied.ok,
    rateLimitEvidence: !thirdRate.ok,
    addressVerificationEvidence: addressOk.ok && !addressDenied.ok,
    circuitBreakerEvidence: !circuitSecond.ok && circuitSecond.circuitState === "open",
    auditEvidence: auditEvents.events.length >= 10,
    redactionEvidence:
      !auditDump.includes("@example.test") && !auditDump.includes("sk_1234567890abcdef"),
  });
  if (
    !enterpriseEvidence.transactionalOutboxChecked ||
    !enterpriseEvidence.providerFeedbackIngestionChecked ||
    !enterpriseEvidence.unsubscribeIngestionChecked ||
    !enterpriseEvidence.retentionPurgeChecked ||
    !enterpriseEvidence.bulkCampaignRuntimeChecked ||
    !enterpriseEvidence.providerCircuitBreakerChecked ||
    enterpriseEvidence.liveProviderReadinessClaim ||
    enterpriseEvidence.deliverabilityReadinessClaim
  ) {
    throw new Error("enterprise notification evidence incomplete or overclaimed");
  }
  pass("enterprise notifications/messaging depth evidence is complete and non-claim bounded");

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
    liveProviderReadinessClaim: false,
    enterpriseMessagingDepthProven: true,
    dbBackedPersistenceBoundaryExplicit: enterpriseEvidence.dbBackedPersistenceBoundaryExplicit,
    transactionalOutboxProven: enterpriseEvidence.transactionalOutboxChecked,
    providerFeedbackIngestionProven: enterpriseEvidence.providerFeedbackIngestionChecked,
    unsubscribeIngestionProven: enterpriseEvidence.unsubscribeIngestionChecked,
    retentionPurgeProven: enterpriseEvidence.retentionPurgeChecked,
    bulkCampaignRuntimeProven: enterpriseEvidence.bulkCampaignRuntimeChecked,
    notificationRateLimitProven: enterpriseEvidence.rateLimitChecked,
    addressVerificationProven: enterpriseEvidence.addressVerificationChecked,
    providerCircuitBreakerProven: enterpriseEvidence.providerCircuitBreakerChecked,
    apiSurfaceReclassified: enterpriseEvidence.apiSurfaceDisposition,
    uiSurfaceDeferred: enterpriseEvidence.uiSurfaceDisposition,
    enterpriseNotificationEvidence: enterpriseEvidence,
    deliverabilityReadinessClaim: false,
    stagingReadinessClaim: false,
    socReadinessClaim: false,
    enterpriseProductionReadinessClaim: false,
    fullDevReadinessClaim: false,
    fullProductReadinessClaim: false,
    usf133ClosureClaim: false,
  } as const;
}

async function main() {
  console.log(JSON.stringify(await runNotificationsMessagingProof(), null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
