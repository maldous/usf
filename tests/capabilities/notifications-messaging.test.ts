import { InMemoryNotificationProvider } from "@foundation/adapter-mail";
import { InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createJobService } from "@foundation/capability-jobs";
import {
  NotificationCapability,
  createEnterpriseNotificationControlPlane,
} from "@foundation/capability-notify";
import {
  createPolicyDecisionPoint,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import {
  createNotificationTemplateDefinition,
  createTenantContext,
  type BackoffPolicy,
  type NotificationProviderConfig,
  type NotificationRecipient,
  type NotificationTemplateDefinition,
  type SecretReference,
} from "@foundation/core";
import { beforeEach, describe, expect, it } from "vitest";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
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
    secretRef: `secret://${tenantId}/mail-api-key`,
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

function recipient(tenantId: string, id = "recipient-a"): NotificationRecipient {
  return Object.freeze({
    recipientId: id,
    recipientActorId: "actor-a",
    recipientTenantId: tenantId,
    recipientType: "actor",
    addressRef: `${id}@example.test`,
    addressType: "email",
    addressVerified: true,
    addressStatus: "active",
    addressSource: "test-fixture",
    addressLastVerifiedAt: "2026-01-01T00:00:00Z",
  });
}

function template(partial: Partial<Omit<NotificationTemplateDefinition, "templateHash">> = {}) {
  return {
    templateId: partial.templateId ?? "tmpl-transactional",
    templateKey: partial.templateKey ?? "transactional.notice",
    templateVersion: partial.templateVersion ?? "1",
    templateStatus: partial.templateStatus ?? "approved",
    templateOwner: partial.templateOwner ?? "platform",
    templateClassification: partial.templateClassification ?? "transactional",
    allowedChannels: partial.allowedChannels ?? ["email", "test"],
    allowedNotificationClasses: partial.allowedNotificationClasses ?? [
      "transactional",
      "security",
      "marketing",
      "bulk",
      "test",
    ],
    subjectTemplate: partial.subjectTemplate ?? "Notice {{displayName}}",
    bodyTemplate: partial.bodyTemplate ?? "Hello {{displayName}}",
    subjectClassification: partial.subjectClassification ?? "internal",
    bodyClassification: partial.bodyClassification ?? "confidential",
    payloadClassification: partial.payloadClassification ?? "confidential",
    renderContextSchema: partial.renderContextSchema ?? { type: "object" },
    allowedVariables: partial.allowedVariables ?? [
      { name: "displayName", required: true, dataClassification: "confidential" },
    ],
    createdBy: partial.createdBy ?? "admin-a",
    approvedBy: partial.approvedBy ?? "admin-a",
    approvedAt: partial.approvedAt ?? "2026-01-01T00:00:00Z",
    deprecatedAt: partial.deprecatedAt ?? null,
    immutableAfterFirstUse: partial.immutableAfterFirstUse ?? true,
    firstUsedAt: partial.firstUsedAt ?? null,
  } satisfies Omit<NotificationTemplateDefinition, "templateHash">;
}

async function harness() {
  let clockMs = Date.parse("2026-01-01T00:00:00Z");
  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "m-admin-a",
    tenantId: A,
    actorId: "admin-a",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "m-member-a",
    tenantId: A,
    actorId: "member-a",
    status: "active",
    roles: ["tenant-member"],
  });
  memberships.upsert({
    membershipId: "m-admin-b",
    tenantId: B,
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
    now: () => Math.floor(clockMs / 1000),
    defaultBackoff: BACKOFF,
  });
  const provider = new InMemoryNotificationProvider();
  const notify = new NotificationCapability(provider, {
    pdp,
    audit,
    jobs,
    now: () => new Date(clockMs).toISOString(),
  });
  const ctx = (tenantId: string, actorId: string, roles: string[]) =>
    createTenantContext({ tenantId, actorId, roles });
  const adminA = ctx(A, "admin-a", ["tenant-admin"]);
  const memberA = ctx(A, "member-a", ["tenant-member"]);
  const adminB = ctx(B, "admin-b", ["tenant-admin"]);
  await notify.configureProvider(adminA, providerConfig(A));
  await notify.createTemplate(adminA, template());
  return {
    audit,
    notify,
    provider,
    adminA,
    memberA,
    adminB,
    advance: (ms: number) => {
      clockMs += ms;
    },
  };
}

describe("notifications tenant isolation and PDP", () => {
  let h: Awaited<ReturnType<typeof harness>>;
  beforeEach(async () => {
    h = await harness();
  });

  it("denies missing tenant context and notification actions without PDP permission", async () => {
    const created = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!created.ok) throw new Error("setup");

    expect(
      await h.notify.enqueueDelivery(undefined as never, created.view.notificationId),
    ).toMatchObject({
      ok: false,
      reasonCode: "missing-tenant-context",
    });
    expect(
      await h.notify.deliverNotification(h.memberA, created.view.notificationId, {
        displayName: "Ada",
      }),
    ).toMatchObject({
      ok: false,
    });
  });

  it("prevents tenant A from read/list/retry/cancel/send against tenant B notifications", async () => {
    await h.notify.configureProvider(h.adminB, providerConfig(B));
    await h.notify.createTemplate(
      h.adminB,
      template({ templateId: "tmpl-b", createdBy: "admin-b", approvedBy: "admin-b" }),
    );
    const b = await h.notify.createNotification(h.adminB, {
      recipient: recipient(B, "recipient-b"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-b",
    });
    if (!b.ok) throw new Error("setup");

    expect(await h.notify.readNotification(h.adminA, b.view.notificationId)).toMatchObject({
      ok: false,
    });
    expect(await h.notify.enqueueDelivery(h.adminA, b.view.notificationId)).toMatchObject({
      ok: false,
    });
    expect(await h.notify.cancelNotification(h.adminA, b.view.notificationId)).toMatchObject({
      ok: false,
    });
    expect(
      await h.notify.retryNotification(h.adminA, b.view.notificationId, { displayName: "Ada" }),
    ).toMatchObject({
      ok: false,
    });
    const list = await h.notify.listNotifications(h.adminA);
    expect(list.ok && list.views.every((view) => view.tenantId === A)).toBe(true);
  });
});

describe("templates, provider config, recipient safety, and consent", () => {
  let h: Awaited<ReturnType<typeof harness>>;
  beforeEach(async () => {
    h = await harness();
  });

  it("requires provider credentials to be secret references and rejects live provider claims", async () => {
    const rawCredential = await h.notify.configureProvider(h.adminA, {
      ...providerConfig(A),
      credentialRef: "raw-provider-key" as never,
    });
    expect(rawCredential).toMatchObject({ ok: false, reasonCode: "provider-config-invalid" });

    const live = await h.notify.configureProvider(h.adminA, {
      ...providerConfig(A),
      providerMode: "live-external-deferred",
    });
    expect(live).toMatchObject({ ok: false, reasonCode: "provider-config-invalid" });
  });

  it("fails closed on missing, unknown, or secret-looking template values", async () => {
    const missing = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-template-missing"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!missing.ok) throw new Error("setup");
    expect(
      await h.notify.deliverNotification(h.adminA, missing.view.notificationId, {}),
    ).toMatchObject({
      ok: false,
      reasonCode: "missing-variable",
    });

    const unknown = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-template-unknown"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!unknown.ok) throw new Error("setup");
    expect(
      await h.notify.deliverNotification(h.adminA, unknown.view.notificationId, {
        displayName: "Ada",
        unexpected: "value",
      }),
    ).toMatchObject({ ok: false, reasonCode: "unknown-variable" });

    const secretValue = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-template-secret"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!secretValue.ok) throw new Error("setup");
    expect(
      await h.notify.deliverNotification(h.adminA, secretValue.view.notificationId, {
        displayName: "Bearer not-for-output",
      }),
    ).toMatchObject({ ok: false, reasonCode: "secret-like-value" });
  });

  it("records template version and hash on delivery and changes hash when content changes", async () => {
    const a = createNotificationTemplateDefinition(
      template({ bodyTemplate: "Hello {{displayName}}" }),
    );
    const b = createNotificationTemplateDefinition(
      template({ bodyTemplate: "Updated {{displayName}}" }),
    );
    expect(a.templateHash).not.toBe(b.templateHash);

    const created = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-template-hash"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!created.ok) throw new Error("setup");
    const sent = await h.notify.deliverNotification(h.adminA, created.view.notificationId, {
      displayName: "Ada",
    });
    expect(sent.ok && sent.view.templateVersion).toBe("1");
    expect(sent.ok && sent.view.templateHash).toHaveLength(64);
    expect(sent.ok && sent.view.dataClassification).toBe("confidential");
  });

  it("redacts recipient addresses from provider capture and audit evidence", async () => {
    const created = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-redacted"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!created.ok) throw new Error("setup");
    const sent = await h.notify.deliverNotification(h.adminA, created.view.notificationId, {
      displayName: "Ada",
    });
    expect(sent.ok).toBe(true);

    const providerDump = JSON.stringify(h.provider.messages);
    const audit = await h.audit.query(h.adminA, {
      tenantId: A,
      category: "notification",
      limit: 100,
    });
    const auditDump = JSON.stringify(audit.events);
    expect(providerDump).not.toContain("recipient-redacted@example.test");
    expect(auditDump).not.toContain("recipient-redacted@example.test");
    expect(providerDump).toContain("recipientAddressHash");
    expect(auditDump).toContain("recipientAddressHash");
  });

  it("fails closed for suppression and marketing/bulk consent, while explicit security bypass is policy-gated", async () => {
    await h.notify.updateSuppression(h.adminA, {
      tenantId: A,
      recipientId: "recipient-suppressed",
      channel: "all",
      classification: "all",
      suppressionStatus: "active",
      suppressionReason: "do-not-contact",
      suppressionSource: "test",
      suppressedAt: "2026-01-01T00:00:00Z",
      suppressedBy: "admin-a",
      expiresAt: null,
      bounceStatus: "none",
      complaintStatus: "none",
      doNotContact: true,
    });
    const suppressed = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-suppressed"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!suppressed.ok) throw new Error("setup");
    expect(
      await h.notify.deliverNotification(h.adminA, suppressed.view.notificationId, {
        displayName: "Ada",
      }),
    ).toMatchObject({ ok: false, reasonCode: "do-not-contact" });

    const marketing = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-marketing"),
      channel: "email",
      classification: "marketing",
      templateId: "tmpl-transactional",
    });
    if (!marketing.ok) throw new Error("setup");
    expect(
      await h.notify.deliverNotification(h.adminA, marketing.view.notificationId, {
        displayName: "Ada",
      }),
    ).toMatchObject({ ok: false, reasonCode: "consent-required" });
    await h.notify.updatePreference(h.adminA, {
      tenantId: A,
      recipientId: "recipient-marketing",
      channel: "email",
      classification: "marketing",
      preferenceScope: "recipient",
      preferenceSource: "test",
      consentStatus: "granted",
      unsubscribeStatus: "subscribed",
    });
    expect(
      await h.notify.deliverNotification(h.adminA, marketing.view.notificationId, {
        displayName: "Ada",
      }),
    ).toMatchObject({ ok: true });

    await h.notify.updateSuppression(h.adminA, {
      tenantId: A,
      recipientId: "recipient-security",
      channel: "email",
      classification: "security",
      suppressionStatus: "active",
      suppressionReason: "recipient-opted-out",
      suppressionSource: "test",
      suppressedAt: "2026-01-01T00:00:00Z",
      suppressedBy: "admin-a",
      expiresAt: null,
      bounceStatus: "none",
      complaintStatus: "none",
      doNotContact: false,
    });
    const security = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-security"),
      channel: "email",
      classification: "security",
      templateId: "tmpl-transactional",
    });
    if (!security.ok) throw new Error("setup");
    expect(
      await h.notify.deliverNotification(
        h.adminA,
        security.view.notificationId,
        { displayName: "Ada" },
        { allowMandatoryOptOutBypass: true },
      ),
    ).toMatchObject({ ok: true });
  });
});

describe("delivery jobs, retry, dead-letter, and audit evidence", () => {
  let h: Awaited<ReturnType<typeof harness>>;
  beforeEach(async () => {
    h = await harness();
  });

  it("uses notification delivery jobs with idempotency keys and suppresses duplicate submission", async () => {
    const created = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-job"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!created.ok) throw new Error("setup");

    const first = await h.notify.enqueueDelivery(h.adminA, created.view.notificationId);
    const second = await h.notify.enqueueDelivery(h.adminA, created.view.notificationId);
    expect(first.ok && first.deduplicated).toBe(false);
    expect(second.ok && second.deduplicated).toBe(true);
    expect(first.ok && second.ok && first.jobId === second.jobId).toBe(true);
  });

  it("bounds retry then dead-letters with redacted provider failure evidence", async () => {
    const created = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-failure"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!created.ok) throw new Error("setup");

    let last;
    for (let i = 0; i < 5; i += 1) {
      h.provider.failNext("provider token=sk_1234567890abcdef failed");
      last = await h.notify.deliverNotification(h.adminA, created.view.notificationId, {
        displayName: "Ada",
      });
      h.advance(1_000);
    }
    expect(last).toMatchObject({ ok: false, reasonCode: "provider-error" });
    if (!last || last.ok) throw new Error("expected failed delivery");
    expect(last.evidence?.deliveryStatus).toBe("dead-lettered");
    expect(last.evidence?.safeFailureMessage).toContain("[redacted-secret]");
    expect(JSON.stringify(last.evidence)).not.toContain("sk_1234567890abcdef");
  });

  it("does not send cancelled or expired notifications", async () => {
    const cancelled = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-cancelled"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    const expired = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-expired"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!cancelled.ok || !expired.ok) throw new Error("setup");
    await h.notify.cancelNotification(h.adminA, cancelled.view.notificationId);
    await h.notify.expireNotification(h.adminA, expired.view.notificationId);

    expect(
      await h.notify.deliverNotification(h.adminA, cancelled.view.notificationId, {
        displayName: "Ada",
      }),
    ).toMatchObject({ ok: false, reasonCode: "notification-cancelled" });
    expect(
      await h.notify.deliverNotification(h.adminA, expired.view.notificationId, {
        displayName: "Ada",
      }),
    ).toMatchObject({ ok: false, reasonCode: "notification-expired" });
    expect(h.provider.messages).toEqual([]);
  });

  it("emits notification lifecycle audit events with value-free metadata", async () => {
    const created = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-audit"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!created.ok) throw new Error("setup");
    await h.notify.enqueueDelivery(h.adminA, created.view.notificationId);
    await h.notify.deliverNotification(h.adminA, created.view.notificationId, {
      displayName: "Ada",
    });

    const events = await h.audit.query(h.adminA, {
      tenantId: A,
      category: "notification",
      limit: 100,
    });
    const eventTypes = events.events.map((event) => event.eventType);
    expect(eventTypes).toContain("notification.created");
    expect(eventTypes).toContain("notification.queued");
    expect(eventTypes).toContain("notification.rendered");
    expect(eventTypes).toContain("notification.sent");
    expect(JSON.stringify(events.events)).not.toContain("recipient-audit@example.test");
  });
});

describe("enterprise notification depth controls", () => {
  let h: Awaited<ReturnType<typeof harness>>;
  beforeEach(async () => {
    h = await harness();
  });

  it("records bounded persistence, transactional outbox, feedback, unsubscribe, and purge evidence", async () => {
    const controls = createEnterpriseNotificationControlPlane({
      notify: h.notify,
      audit: h.audit,
      now: () => "2026-01-01T00:00:00.000Z",
    });
    const created = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-enterprise-depth"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
    });
    if (!created.ok) throw new Error("setup");
    const persisted = await controls.recordPersistence(h.adminA, created.view);
    expect(persisted.ok).toBe(true);
    const first = await controls.commitTransactionalOutbox(h.adminA, created.view.notificationId);
    const second = await controls.commitTransactionalOutbox(h.adminA, created.view.notificationId);
    expect(first).toMatchObject({ ok: true, deduplicated: false });
    expect(second).toMatchObject({ ok: true, deduplicated: true });

    const bounced = await controls.ingestProviderFeedback(h.adminA, {
      feedbackType: "delivery.bounced",
      notificationId: created.view.notificationId,
      recipientId: "recipient-enterprise-depth",
      channel: "email",
      classification: "transactional",
      providerRef: "provider-local-feedback",
      providerMessageIdHash: "provider-message-hash",
      source: "provider-webhook-local-proof",
    });
    expect(bounced.ok).toBe(true);
    await expect(
      h.notify.deliverNotification(h.adminA, created.view.notificationId, {
        displayName: "Ada",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "address-bounced" });

    const marketing = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-unsubscribe-depth"),
      channel: "email",
      classification: "marketing",
      templateId: "tmpl-transactional",
    });
    if (!marketing.ok) throw new Error("setup");
    await controls.recordPersistence(h.adminA, marketing.view);
    const unsubscribed = await controls.ingestProviderFeedback(h.adminA, {
      feedbackType: "delivery.unsubscribed",
      notificationId: marketing.view.notificationId,
      recipientId: "recipient-unsubscribe-depth",
      channel: "email",
      classification: "marketing",
      providerRef: "provider-local-unsubscribe",
      providerMessageIdHash: "provider-message-hash-unsubscribe",
      source: "unsubscribe-api-local-proof",
    });
    expect(unsubscribed.ok).toBe(true);
    await expect(
      h.notify.deliverNotification(h.adminA, marketing.view.notificationId, {
        displayName: "Ada",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "recipient-opted-out" });

    expect(await controls.purgeNotification(h.adminA, marketing.view.notificationId)).toMatchObject(
      {
        ok: true,
      },
    );
    const legalHold = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-legal-hold-depth"),
      channel: "email",
      classification: "transactional",
      templateId: "tmpl-transactional",
      legalHold: true,
    });
    if (!legalHold.ok) throw new Error("setup");
    await controls.recordPersistence(h.adminA, legalHold.view);
    expect(await controls.purgeNotification(h.adminA, legalHold.view.notificationId)).toMatchObject(
      {
        ok: false,
        reasonCode: "legal-hold",
      },
    );
  });

  it("fails closed for rate-limit, address-verification, circuit-breaker, and bulk campaign controls", async () => {
    const controls = createEnterpriseNotificationControlPlane({
      notify: h.notify,
      audit: h.audit,
      now: () => "2026-01-01T00:00:00.000Z",
    });
    expect(controls.checkRateLimit(h.adminA, "tenant-bulk", 1)).toMatchObject({ ok: true });
    expect(controls.checkRateLimit(h.adminA, "tenant-bulk", 1)).toMatchObject({
      ok: false,
      reasonCode: "notification-rate-limited",
    });
    expect(
      controls.checkAddressVerification({
        ...recipient(A, "recipient-unverified-depth"),
        addressVerified: false,
        addressStatus: "unverified",
      }),
    ).toMatchObject({ ok: false, reasonCode: "address-verification-required" });
    expect(controls.recordProviderFailure("provider-depth", 2)).toMatchObject({
      circuitState: "closed",
    });
    expect(controls.recordProviderFailure("provider-depth", 2)).toMatchObject({
      ok: false,
      circuitState: "open",
      reasonCode: "provider-circuit-open",
    });

    const bulk = await h.notify.createNotification(h.adminA, {
      recipient: recipient(A, "recipient-bulk-depth"),
      channel: "email",
      classification: "bulk",
      templateId: "tmpl-transactional",
    });
    if (!bulk.ok) throw new Error("setup");
    await controls.recordPersistence(h.adminA, bulk.view);
    expect(
      await controls.runBulkCampaign(h.adminA, {
        campaignId: "campaign-depth-denied",
        classification: "bulk",
        notificationIds: [bulk.view.notificationId],
        tenantLimit: 10,
        consentChecked: false,
        suppressionChecked: true,
      }),
    ).toMatchObject({ ok: false, reasonCode: "bulk-policy-missing" });
    expect(
      await controls.runBulkCampaign(h.adminA, {
        campaignId: "campaign-depth-ok",
        classification: "bulk",
        notificationIds: [bulk.view.notificationId],
        tenantLimit: 10,
        consentChecked: true,
        suppressionChecked: true,
      }),
    ).toMatchObject({ ok: true });
  });
});
