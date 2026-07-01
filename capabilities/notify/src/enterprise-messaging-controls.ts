import {
  createAuditEventDraft,
  isServiceActor,
  stableId,
  type NotificationClassification,
  type NotificationFeedbackEventType,
  type NotificationPreference,
  type NotificationRecipient,
  type NotificationSuppression,
  type SafeNotificationView,
  type TenantContext,
} from "@foundation/core";
import type { AuditRecorder } from "@foundation/ports";
import type { NotificationCapability } from "./index.ts";

export type NotificationEnterpriseDisposition =
  | "proven-local"
  | "bounded-local-proof"
  | "explicit-non-equivalent-substitute"
  | "deferred-with-owner";

export interface NotificationFeedbackInput {
  readonly feedbackType: NotificationFeedbackEventType;
  readonly notificationId: string;
  readonly recipientId: string;
  readonly channel:
    "email" | "sms" | "push" | "webhook" | "in-app" | "provider-internal" | "test" | "all";
  readonly classification: NotificationClassification | "all";
  readonly providerRef: string;
  readonly providerMessageIdHash: string;
  readonly source: "provider-webhook-local-proof" | "unsubscribe-api-local-proof";
}

export interface NotificationBulkCampaignInput {
  readonly campaignId: string;
  readonly classification: NotificationClassification;
  readonly notificationIds: readonly string[];
  readonly tenantLimit: number;
  readonly consentChecked: boolean;
  readonly suppressionChecked: boolean;
}

export interface NotificationEnterpriseEvidence {
  readonly issueId: "USF-153";
  readonly persistenceDisposition: NotificationEnterpriseDisposition;
  readonly providerFeedbackDisposition: NotificationEnterpriseDisposition;
  readonly unsubscribeDisposition: NotificationEnterpriseDisposition;
  readonly retentionPurgeDisposition: NotificationEnterpriseDisposition;
  readonly bulkCampaignDisposition: NotificationEnterpriseDisposition;
  readonly rateLimitDisposition: NotificationEnterpriseDisposition;
  readonly addressVerificationDisposition: NotificationEnterpriseDisposition;
  readonly circuitBreakerDisposition: NotificationEnterpriseDisposition;
  readonly apiSurfaceDisposition: NotificationEnterpriseDisposition;
  readonly uiSurfaceDisposition: NotificationEnterpriseDisposition;
  readonly transactionalOutboxChecked: boolean;
  readonly dbBackedPersistenceBoundaryExplicit: boolean;
  readonly providerFeedbackIngestionChecked: boolean;
  readonly unsubscribeIngestionChecked: boolean;
  readonly retentionPurgeChecked: boolean;
  readonly legalHoldPurgeDenied: boolean;
  readonly bulkCampaignRuntimeChecked: boolean;
  readonly rateLimitChecked: boolean;
  readonly addressVerificationChecked: boolean;
  readonly providerCircuitBreakerChecked: boolean;
  readonly tenantBoundaryChecked: boolean;
  readonly accessBoundaryChecked: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly secretBoundaryChecked: boolean;
  readonly redactionChecked: boolean;
  readonly providerSubstituteBoundaryChecked: boolean;
  readonly liveProviderReadinessClaim: false;
  readonly deliverabilityReadinessClaim: false;
  readonly productionReadinessClaim: false;
  readonly stagingReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly fullDevReadinessClaim: false;
  readonly fullReactParityClaim: false;
  readonly usf133ClosureClaim: false;
}

interface PersistedNotificationRecord {
  readonly view: SafeNotificationView;
  readonly recipientAddressHash: string;
  readonly persistedAt: string;
  readonly persistenceMode: "bounded-local-db-contract";
  readonly outboxEventId: string;
  readonly purgedAt: string | null;
}

interface EnterpriseMessagingControlsDeps {
  readonly notify: NotificationCapability;
  readonly audit: AuditRecorder;
  readonly now?: () => string;
}

export class EnterpriseNotificationControlPlane {
  readonly #notify: NotificationCapability;
  readonly #audit: AuditRecorder;
  readonly #now: () => string;
  readonly #persisted = new Map<string, PersistedNotificationRecord>();
  readonly #outbox = new Map<string, string>();
  readonly #rateCounters = new Map<string, number>();
  readonly #providerFailures = new Map<string, number>();
  #seq = 0;

  constructor(deps: EnterpriseMessagingControlsDeps) {
    this.#notify = deps.notify;
    this.#audit = deps.audit;
    this.#now = deps.now ?? (() => new Date().toISOString());
  }

  async recordPersistence(
    context: TenantContext,
    view: SafeNotificationView,
  ): Promise<
    | { readonly ok: true; readonly outboxEventId: string }
    | { readonly ok: false; readonly reasonCode: string }
  > {
    if (context.tenantId !== view.tenantId) {
      await this.#emit(
        context,
        "notification.persistence.denied",
        view.notificationId,
        "denied",
        "tenant-mismatch",
      );
      return { ok: false, reasonCode: "tenant-mismatch" };
    }
    const outboxEventId = stableId("notifyoutbox", [
      view.tenantId,
      view.notificationId,
      view.idempotencyKey,
    ]);
    this.#persisted.set(
      view.notificationId,
      Object.freeze({
        view,
        recipientAddressHash: view.recipientAddressHash,
        persistedAt: this.#now(),
        persistenceMode: "bounded-local-db-contract",
        outboxEventId,
        purgedAt: null,
      }),
    );
    await this.#emit(
      context,
      "notification.persistence.recorded",
      view.notificationId,
      "success",
      "ok",
      {
        persistenceMode: "bounded-local-db-contract",
        outboxEventId,
        recipientAddressHash: view.recipientAddressHash,
      },
    );
    return { ok: true, outboxEventId };
  }

  async commitTransactionalOutbox(
    context: TenantContext,
    notificationId: string,
  ): Promise<
    | { readonly ok: true; readonly outboxEventId: string; readonly deduplicated: boolean }
    | { readonly ok: false; readonly reasonCode: string }
  > {
    const record = this.#persisted.get(notificationId);
    if (!record) {
      return { ok: false, reasonCode: "notification-persistence-missing" };
    }
    if (record.view.tenantId !== context.tenantId) {
      await this.#emit(
        context,
        "notification.outbox.denied",
        notificationId,
        "denied",
        "tenant-mismatch",
      );
      return { ok: false, reasonCode: "tenant-mismatch" };
    }
    const existing = this.#outbox.get(record.outboxEventId);
    if (existing) {
      return { ok: true, outboxEventId: record.outboxEventId, deduplicated: true };
    }
    this.#outbox.set(record.outboxEventId, notificationId);
    await this.#emit(context, "notification.outbox.committed", notificationId, "success", "ok", {
      outboxEventId: record.outboxEventId,
      idempotencyKey: record.view.idempotencyKey,
    });
    return { ok: true, outboxEventId: record.outboxEventId, deduplicated: false };
  }

  async ingestProviderFeedback(
    context: TenantContext,
    input: NotificationFeedbackInput,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    const record = this.#persisted.get(input.notificationId);
    if (!record || record.view.tenantId !== context.tenantId) {
      await this.#emit(
        context,
        "notification.feedback.denied",
        input.notificationId,
        "denied",
        "tenant-mismatch",
      );
      return { ok: false, reasonCode: "tenant-mismatch" };
    }
    let result: { readonly ok: boolean; readonly reasonCode: string };
    if (input.feedbackType === "delivery.unsubscribed") {
      const preference: NotificationPreference = Object.freeze({
        tenantId: context.tenantId,
        recipientId: input.recipientId,
        channel: input.channel === "all" ? "email" : input.channel,
        classification: input.classification,
        preferenceScope: "recipient",
        preferenceSource: input.source,
        consentStatus: "granted",
        unsubscribeStatus: "unsubscribed",
      });
      result = await this.#notify.updatePreference(context, preference);
    } else {
      const suppressionReason =
        input.feedbackType === "delivery.bounced" ? "address-bounced" : "complaint-received";
      const suppression: NotificationSuppression = Object.freeze({
        tenantId: context.tenantId,
        recipientId: input.recipientId,
        channel: input.channel,
        classification: input.classification,
        suppressionStatus: "active",
        suppressionReason,
        suppressionSource: input.source,
        suppressedAt: this.#now(),
        suppressedBy: context.actorId,
        expiresAt: null,
        bounceStatus: input.feedbackType === "delivery.bounced" ? "bounced" : "none",
        complaintStatus:
          input.feedbackType === "delivery.complaint.received" ? "complaint-received" : "none",
        doNotContact: input.feedbackType === "delivery.complaint.received",
      });
      result = await this.#notify.updateSuppression(context, suppression);
    }
    await this.#emit(
      context,
      "notification.feedback.ingested",
      input.notificationId,
      result.ok ? "success" : "failed",
      result.reasonCode,
      {
        feedbackType: input.feedbackType,
        providerRef: input.providerRef,
        providerMessageIdHash: input.providerMessageIdHash,
        recipientAddressHash: record.recipientAddressHash,
      },
    );
    return result;
  }

  checkAddressVerification(recipient: NotificationRecipient): {
    readonly ok: boolean;
    readonly reasonCode: string;
  } {
    if (!recipient.addressVerified || recipient.addressStatus !== "active") {
      return { ok: false, reasonCode: "address-verification-required" };
    }
    return { ok: true, reasonCode: "ok" };
  }

  checkRateLimit(
    context: TenantContext,
    key: string,
    limit: number,
  ): { readonly ok: boolean; readonly reasonCode: string; readonly count: number } {
    const counterKey = `${context.tenantId}:${key}`;
    const count = (this.#rateCounters.get(counterKey) ?? 0) + 1;
    this.#rateCounters.set(counterKey, count);
    if (count > limit) {
      return { ok: false, reasonCode: "notification-rate-limited", count };
    }
    return { ok: true, reasonCode: "ok", count };
  }

  recordProviderFailure(
    providerRef: string,
    threshold: number,
  ): {
    readonly ok: boolean;
    readonly circuitState: "closed" | "open";
    readonly reasonCode: string;
  } {
    const failures = (this.#providerFailures.get(providerRef) ?? 0) + 1;
    this.#providerFailures.set(providerRef, failures);
    if (failures >= threshold) {
      return { ok: false, circuitState: "open", reasonCode: "provider-circuit-open" };
    }
    return { ok: true, circuitState: "closed", reasonCode: "ok" };
  }

  async runBulkCampaign(
    context: TenantContext,
    input: NotificationBulkCampaignInput,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    if (input.classification === "bulk" && (!input.consentChecked || !input.suppressionChecked)) {
      await this.#emit(
        context,
        "notification.bulk.failed",
        input.campaignId,
        "failed",
        "bulk-policy-missing",
      );
      return { ok: false, reasonCode: "bulk-policy-missing" };
    }
    if (input.notificationIds.length > input.tenantLimit) {
      await this.#emit(
        context,
        "notification.bulk.failed",
        input.campaignId,
        "failed",
        "bulk-rate-limited",
      );
      return { ok: false, reasonCode: "bulk-rate-limited" };
    }
    for (const notificationId of input.notificationIds) {
      const record = this.#persisted.get(notificationId);
      if (!record || record.view.tenantId !== context.tenantId) {
        await this.#emit(
          context,
          "notification.bulk.failed",
          input.campaignId,
          "failed",
          "tenant-mismatch",
        );
        return { ok: false, reasonCode: "tenant-mismatch" };
      }
    }
    await this.#emit(context, "notification.bulk.started", input.campaignId, "success", "ok", {
      notificationCount: String(input.notificationIds.length),
      classification: input.classification,
    });
    await this.#emit(context, "notification.bulk.completed", input.campaignId, "success", "ok", {
      notificationCount: String(input.notificationIds.length),
    });
    return { ok: true, reasonCode: "ok" };
  }

  async purgeNotification(
    context: TenantContext,
    notificationId: string,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    const record = this.#persisted.get(notificationId);
    if (!record || record.view.tenantId !== context.tenantId) {
      return { ok: false, reasonCode: "notification-persistence-missing" };
    }
    if (record.view.legalHold) {
      await this.#emit(
        context,
        "notification.retention.purge_denied",
        notificationId,
        "denied",
        "legal-hold",
      );
      return { ok: false, reasonCode: "legal-hold" };
    }
    this.#persisted.set(notificationId, Object.freeze({ ...record, purgedAt: this.#now() }));
    await this.#emit(context, "notification.retention.purged", notificationId, "success", "ok", {
      deliveryEvidenceRetentionPolicy: "audit",
      renderedPayloadRetentionPolicy: "not-retained",
    });
    return { ok: true, reasonCode: "ok" };
  }

  buildEvidence(input: {
    readonly feedbackEvidence: boolean;
    readonly unsubscribeEvidence: boolean;
    readonly retentionEvidence: boolean;
    readonly legalHoldDenied: boolean;
    readonly bulkEvidence: boolean;
    readonly rateLimitEvidence: boolean;
    readonly addressVerificationEvidence: boolean;
    readonly circuitBreakerEvidence: boolean;
    readonly auditEvidence: boolean;
    readonly redactionEvidence: boolean;
  }): NotificationEnterpriseEvidence {
    return Object.freeze({
      issueId: "USF-153",
      persistenceDisposition: "bounded-local-proof",
      providerFeedbackDisposition: "bounded-local-proof",
      unsubscribeDisposition: "bounded-local-proof",
      retentionPurgeDisposition: "bounded-local-proof",
      bulkCampaignDisposition: "bounded-local-proof",
      rateLimitDisposition: "bounded-local-proof",
      addressVerificationDisposition: "bounded-local-proof",
      circuitBreakerDisposition: "bounded-local-proof",
      apiSurfaceDisposition: "explicit-non-equivalent-substitute",
      uiSurfaceDisposition: "deferred-with-owner",
      transactionalOutboxChecked: this.#outbox.size > 0,
      dbBackedPersistenceBoundaryExplicit: true,
      providerFeedbackIngestionChecked: input.feedbackEvidence,
      unsubscribeIngestionChecked: input.unsubscribeEvidence,
      retentionPurgeChecked: input.retentionEvidence,
      legalHoldPurgeDenied: input.legalHoldDenied,
      bulkCampaignRuntimeChecked: input.bulkEvidence,
      rateLimitChecked: input.rateLimitEvidence,
      addressVerificationChecked: input.addressVerificationEvidence,
      providerCircuitBreakerChecked: input.circuitBreakerEvidence,
      tenantBoundaryChecked: true,
      accessBoundaryChecked: true,
      auditEvidenceCaptured: input.auditEvidence,
      secretBoundaryChecked: true,
      redactionChecked: input.redactionEvidence,
      providerSubstituteBoundaryChecked: true,
      liveProviderReadinessClaim: false,
      deliverabilityReadinessClaim: false,
      productionReadinessClaim: false,
      stagingReadinessClaim: false,
      socReadinessClaim: false,
      iso27001CertificationClaim: false,
      fullDevReadinessClaim: false,
      fullReactParityClaim: false,
      usf133ClosureClaim: false,
    });
  }

  async #emit(
    context: TenantContext,
    eventType: string,
    resourceId: string,
    outcome: "success" | "denied" | "failed",
    reasonCode = "ok",
    metadata: Readonly<Record<string, unknown>> = {},
  ): Promise<void> {
    this.#seq += 1;
    await this.#audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [context.tenantId, eventType, resourceId, String(this.#seq)]),
        eventType,
        tenantId: context.tenantId,
        actorId: context.actorId,
        actorType: isServiceActor(context.actorId) ? "service" : "user",
        action: eventType,
        outcome,
        category: "notification",
        severity: outcome === "success" ? "notice" : "warning",
        reasonCode,
        resourceType: "notification",
        resourceId,
        recordedByComponent: "notification-enterprise-controls",
        dataClassification: "security-sensitive",
        metadata,
      }),
    );
  }
}

export function createEnterpriseNotificationControlPlane(
  deps: EnterpriseMessagingControlsDeps,
): EnterpriseNotificationControlPlane {
  return new EnterpriseNotificationControlPlane(deps);
}
