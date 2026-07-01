import {
  assertTenantMatch,
  createAuditEventDraft,
  createNotificationDeliveryEvidence,
  createNotificationTemplateDefinition,
  DEFAULT_NOTIFICATION_CHANNEL_POLICIES,
  evaluateNotificationDeliveryPolicy,
  isServiceActor,
  notificationAddressHash,
  notificationDedupeKey,
  notificationDeliveryIdempotencyKey,
  renderNotificationTemplate,
  safeFailureMessage,
  stableId,
  toSafeNotificationView,
  validateNotificationProviderConfig,
  type NotificationChannel,
  type NotificationClassification,
  type NotificationDeliveryEvidence,
  type NotificationDeliveryStatus,
  type NotificationIntent,
  type NotificationPreference,
  type NotificationProviderConfig,
  type NotificationRecipient,
  type RenderedNotificationMessage,
  type NotificationSuppression,
  type NotificationTemplateDefinition,
  type SafeNotificationView,
  type TenantContext,
} from "@foundation/core";
import type {
  AuditRecorder,
  MailProvider,
  NotificationProvider,
  NotificationProviderSendResult,
} from "@foundation/ports";

type NotificationOutcome =
  | {
      readonly ok: true;
      readonly view: SafeNotificationView;
      readonly evidence?: NotificationDeliveryEvidence;
      readonly jobId?: string;
      readonly deduplicated?: boolean;
    }
  | {
      readonly ok: false;
      readonly reasonCode: string;
      readonly evidence?: NotificationDeliveryEvidence;
    };

export interface NotificationJobScheduler {
  submit(input: {
    context: TenantContext;
    classification: "notification-job";
    jobType: "notification.delivery";
    payload?: Readonly<Record<string, unknown>>;
    idempotencyKey?: string;
    maxRetries?: number;
    priority?: number;
    runAfterSec?: number;
  }): Promise<
    | {
        readonly ok: true;
        readonly job: { readonly jobId: string };
        readonly deduplicated: boolean;
      }
    | { readonly ok: false; readonly reasonCode: string }
  >;
}

export interface NotificationCapabilityDeps {
  readonly provider: NotificationProvider;
  readonly pdp: {
    decide(input: {
      context: TenantContext;
      action: string;
      resource: {
        type: string;
        id: string;
        tenantId: string;
        attributes: Readonly<Record<string, string>>;
      };
    }): { effect: "permit" | "deny"; reasonCode: string };
  };
  readonly audit: AuditRecorder;
  readonly jobs?: NotificationJobScheduler;
  readonly now?: () => string;
}

export interface CreateNotificationInput {
  readonly recipient: NotificationRecipient;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly templateId: string;
  readonly correlationId?: string;
  readonly causationId?: string | null;
  readonly traceId?: string | null;
  readonly requestId?: string | null;
  readonly scheduledFor?: string | null;
  readonly retentionPolicy?: string;
  readonly legalHold?: boolean;
  readonly messageBodyRetentionPolicy?: string;
  readonly renderedPayloadRetentionPolicy?: string;
  readonly deliveryEvidenceRetentionPolicy?: string;
  readonly purgeAllowedAt?: string | null;
}

export interface DeliveryOptions {
  readonly allowMandatoryOptOutBypass?: boolean;
  readonly allowUnverifiedSensitiveRecipient?: boolean;
  readonly testRecipientAuthorised?: boolean;
}

export class NotificationCapability {
  readonly #templates = new Map<string, NotificationTemplateDefinition>();
  readonly #templateTenants = new Map<string, string>();
  readonly #recipients = new Map<string, NotificationRecipient>();
  readonly #preferences = new Map<string, NotificationPreference>();
  readonly #suppressions = new Map<string, NotificationSuppression>();
  readonly #notifications = new Map<string, NotificationIntent>();
  readonly #evidence = new Map<string, NotificationDeliveryEvidence[]>();
  readonly #provider: NotificationProvider;
  readonly #pdp: NotificationCapabilityDeps["pdp"];
  readonly #audit: AuditRecorder;
  readonly #jobs: NotificationJobScheduler | undefined;
  readonly #now: () => string;
  #providerConfig: NotificationProviderConfig | undefined;
  #seq = 0;

  constructor(
    providerOrMail: NotificationProvider | MailProvider,
    deps?: Omit<NotificationCapabilityDeps, "provider">,
  ) {
    if ("configure" in providerOrMail && "providerMode" in providerOrMail) {
      if (!deps) {
        throw new Error("NotificationCapability rich mode requires PDP and audit dependencies");
      }
      this.#provider = providerOrMail;
      this.#pdp = deps.pdp;
      this.#audit = deps.audit;
      this.#jobs = deps.jobs;
      this.#now = deps.now ?? (() => new Date().toISOString());
      return;
    }
    this.#provider = new MailProviderCompat(providerOrMail);
    this.#pdp = denyAllPdp;
    this.#audit = dropAuditRecorder;
    this.#jobs = undefined;
    this.#now = () => new Date().toISOString();
  }

  async configureProvider(
    context: TenantContext,
    config: NotificationProviderConfig,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    const deny = await this.#authorize(
      context,
      "notification.provider.configure",
      "provider",
      config.providerRef,
      context.tenantId,
      {
        channel: config.channel,
        providerMode: config.providerMode,
      },
    );
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    try {
      this.#providerConfig = validateNotificationProviderConfig(config);
      this.#provider.configure(this.#providerConfig);
      await this.#emit("notification.provider.changed", context, {
        resourceType: "notification-provider",
        resourceId: config.providerRef,
        outcome: "success",
        metadata: {
          channel: config.channel,
          providerMode: config.providerMode,
          providerRef: config.providerRef,
          credentialRef: config.credentialRef?.secretRef ?? "none",
        },
      });
      return { ok: true, reasonCode: "ok" };
    } catch (error) {
      await this.#emit("notification.provider.changed", context, {
        resourceType: "notification-provider",
        resourceId: config.providerRef,
        outcome: "failed",
        reasonCode: error instanceof Error ? "provider-config-invalid" : "provider-config-error",
        metadata: { providerRef: config.providerRef, channel: config.channel },
      });
      return { ok: false, reasonCode: "provider-config-invalid" };
    }
  }

  async createTemplate(
    context: TenantContext,
    template: Omit<NotificationTemplateDefinition, "templateHash">,
  ): Promise<
    | { readonly ok: true; readonly template: NotificationTemplateDefinition }
    | { readonly ok: false; readonly reasonCode: string }
  > {
    const deny = await this.#authorize(
      context,
      "notification.template.create",
      "notification-template",
      template.templateId,
      context.tenantId,
      { classification: template.templateClassification },
    );
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    const created = createNotificationTemplateDefinition(template);
    this.#templates.set(created.templateId, created);
    this.#templateTenants.set(created.templateId, context.tenantId);
    await this.#emit("notification.template.created", context, {
      resourceType: "notification-template",
      resourceId: created.templateId,
      outcome: "success",
      metadata: {
        templateId: created.templateId,
        templateVersion: created.templateVersion,
        templateHash: created.templateHash,
        classification: created.templateClassification,
      },
    });
    if (created.templateStatus === "approved") {
      await this.#emit("notification.template.approved", context, {
        resourceType: "notification-template",
        resourceId: created.templateId,
        outcome: "success",
        metadata: {
          templateId: created.templateId,
          templateVersion: created.templateVersion,
          approvedBy: created.approvedBy ?? "unknown",
        },
      });
    }
    return { ok: true, template: created };
  }

  async updateTemplate(
    context: TenantContext,
    templateId: string,
    template: Omit<NotificationTemplateDefinition, "templateHash">,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    const existing = this.#templates.get(templateId);
    const templateTenant = this.#templateTenants.get(templateId) ?? context.tenantId;
    const deny = await this.#authorize(
      context,
      "notification.template.update",
      "notification-template",
      templateId,
      templateTenant,
      { classification: template.templateClassification },
    );
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    if (existing?.firstUsedAt) {
      return { ok: false, reasonCode: "template-immutable-after-use" };
    }
    const changed = createNotificationTemplateDefinition(template);
    this.#templates.set(templateId, changed);
    this.#templateTenants.set(templateId, templateTenant);
    await this.#emit("notification.template.changed", context, {
      resourceType: "notification-template",
      resourceId: templateId,
      outcome: "success",
      metadata: {
        templateId,
        templateVersion: changed.templateVersion,
        templateHash: changed.templateHash,
        previousTemplateHash: existing?.templateHash ?? "none",
      },
    });
    return { ok: true, reasonCode: "ok" };
  }

  async updatePreference(
    context: TenantContext,
    preference: NotificationPreference,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    assertTenantMatch(context, preference.tenantId, "notification.preference");
    const deny = await this.#authorize(
      context,
      "notification.preference.update",
      "notification-preference",
      this.#preferenceKey(preference),
      preference.tenantId,
      { channel: preference.channel, classification: preference.classification },
    );
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    this.#preferences.set(this.#preferenceKey(preference), Object.freeze({ ...preference }));
    await this.#emit("notification.preference.changed", context, {
      resourceType: "notification-preference",
      resourceId: this.#preferenceKey(preference),
      outcome: "success",
      metadata: {
        recipientId: preference.recipientId,
        channel: preference.channel,
        classification: preference.classification,
        consentStatus: preference.consentStatus,
        unsubscribeStatus: preference.unsubscribeStatus,
      },
    });
    return { ok: true, reasonCode: "ok" };
  }

  async updateSuppression(
    context: TenantContext,
    suppression: NotificationSuppression,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    assertTenantMatch(context, suppression.tenantId, "notification.suppression");
    const deny = await this.#authorize(
      context,
      "notification.suppression.update",
      "notification-suppression",
      this.#suppressionKey(suppression),
      suppression.tenantId,
      { channel: suppression.channel, classification: suppression.classification },
    );
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    this.#suppressions.set(this.#suppressionKey(suppression), Object.freeze({ ...suppression }));
    await this.#emit("notification.suppression.changed", context, {
      resourceType: "notification-suppression",
      resourceId: this.#suppressionKey(suppression),
      outcome: "success",
      metadata: {
        recipientId: suppression.recipientId,
        channel: suppression.channel,
        classification: suppression.classification,
        suppressionStatus: suppression.suppressionStatus,
        suppressionReason: suppression.suppressionReason,
      },
    });
    return { ok: true, reasonCode: "ok" };
  }

  async createNotification(
    context: TenantContext,
    input: CreateNotificationInput,
  ): Promise<NotificationOutcome> {
    const deny = await this.#authorize(
      context,
      "notification.create",
      "notification",
      "new",
      context.tenantId,
      { channel: input.channel, classification: input.classification },
    );
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    const template = this.#templates.get(input.templateId);
    if (!template) {
      return { ok: false, reasonCode: "template-missing" };
    }
    if (this.#templateTenants.get(template.templateId) !== context.tenantId) {
      return { ok: false, reasonCode: "template-missing" };
    }
    if (!this.#providerConfig) {
      return { ok: false, reasonCode: "provider-config-missing" };
    }
    assertTenantMatch(context, input.recipient.recipientTenantId, "notification.recipient");
    const now = this.#now();
    const notificationId = stableId("ntf", [
      context.tenantId,
      input.recipient.recipientId,
      String(++this.#seq),
    ]);
    const correlationId = input.correlationId ?? notificationId;
    const idempotencyKey = notificationDeliveryIdempotencyKey({
      tenantId: context.tenantId,
      notificationId,
      channel: input.channel,
      recipientId: input.recipient.recipientId,
      templateId: template.templateId,
      templateVersion: template.templateVersion,
    });
    const notification: NotificationIntent = Object.freeze({
      notificationId,
      tenantId: context.tenantId,
      actorId: context.actorId,
      serviceActorId: isServiceActor(context.actorId) ? context.actorId : null,
      recipientId: input.recipient.recipientId,
      recipientType: input.recipient.recipientType,
      recipientAddressRef: input.recipient.addressRef,
      channel: input.channel,
      classification: input.classification,
      templateId: template.templateId,
      templateVersion: template.templateVersion,
      templateHash: template.templateHash,
      subjectClassification: template.subjectClassification,
      bodyClassification: template.bodyClassification,
      payloadClassification: template.payloadClassification,
      deliveryStatus: input.scheduledFor ? "scheduled" : "draft",
      providerMode: this.#providerConfig.providerMode,
      providerRef: this.#providerConfig.providerRef,
      providerMessageId: null,
      idempotencyKey,
      dedupeKey: notificationDedupeKey({
        tenantId: context.tenantId,
        recipientId: input.recipient.recipientId,
        channel: input.channel,
        classification: input.classification,
        templateId: template.templateId,
        templateVersion: template.templateVersion,
        correlationId,
      }),
      correlationId,
      causationId: input.causationId ?? null,
      traceId: input.traceId ?? null,
      requestId: input.requestId ?? null,
      scheduledFor: input.scheduledFor ?? null,
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      suppressedAt: null,
      retryCount: 0,
      maxRetries: DEFAULT_NOTIFICATION_CHANNEL_POLICIES[input.channel].retryPolicy.maxRetries,
      deadLetterReason: null,
      failureReasonCode: null,
      safeFailureMessage: null,
      dataClassification: template.payloadClassification,
      retentionPolicy: input.retentionPolicy ?? "notification-evidence",
      legalHold: input.legalHold ?? false,
      messageBodyRetentionPolicy: input.messageBodyRetentionPolicy ?? "not-retained",
      renderedPayloadRetentionPolicy: input.renderedPayloadRetentionPolicy ?? "not-retained",
      deliveryEvidenceRetentionPolicy: input.deliveryEvidenceRetentionPolicy ?? "audit",
      purgeAllowedAt: input.purgeAllowedAt ?? null,
      createdAt: now,
      createdBy: context.actorId,
      updatedAt: now,
      updatedBy: context.actorId,
    });
    this.#recipients.set(input.recipient.recipientId, Object.freeze({ ...input.recipient }));
    this.#notifications.set(notificationId, notification);
    await this.#emitNotification("notification.created", context, notification, "success");
    if (notification.deliveryStatus === "scheduled") {
      await this.#emitNotification("notification.scheduled", context, notification, "success");
    }
    return { ok: true, view: toSafeNotificationView(notification) };
  }

  async enqueueDelivery(
    context: TenantContext,
    notificationId: string,
  ): Promise<NotificationOutcome> {
    const notification = this.#notifications.get(notificationId);
    if (!notification) {
      return { ok: false, reasonCode: "notification-missing" };
    }
    const deny = await this.#authorizeNotification(context, "notification.send", notification);
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    if (notification.deliveryStatus === "cancelled" || notification.deliveryStatus === "expired") {
      return { ok: false, reasonCode: `notification-${notification.deliveryStatus}` };
    }
    if (!this.#jobs) {
      return { ok: false, reasonCode: "delivery-job-port-missing" };
    }
    const job = await this.#jobs.submit({
      context,
      classification: "notification-job",
      jobType: "notification.delivery",
      idempotencyKey: notification.idempotencyKey,
      maxRetries: notification.maxRetries,
      payload: {
        notificationId: notification.notificationId,
        tenantId: notification.tenantId,
        recipientId: notification.recipientId,
        recipientAddressHash: notificationAddressHash(notification.recipientAddressRef),
        channel: notification.channel,
        classification: notification.classification,
        templateId: notification.templateId,
        templateVersion: notification.templateVersion,
      },
    });
    if (!job.ok) {
      return { ok: false, reasonCode: job.reasonCode };
    }
    const queued = this.#putNotification(notification, {
      deliveryStatus: "queued",
      updatedAt: this.#now(),
      updatedBy: context.actorId,
    });
    if (!job.deduplicated) {
      await this.#emitNotification("notification.queued", context, queued, "success");
    }
    return {
      ok: true,
      view: toSafeNotificationView(queued),
      jobId: job.job.jobId,
      deduplicated: job.deduplicated,
    };
  }

  async deliverNotification(
    context: TenantContext,
    notificationId: string,
    values: Readonly<Record<string, string>>,
    options: DeliveryOptions = {},
  ): Promise<NotificationOutcome> {
    const notification = this.#notifications.get(notificationId);
    if (!notification) {
      return { ok: false, reasonCode: "notification-missing" };
    }
    const deny = await this.#authorizeNotification(context, "notification.send", notification);
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    if (notification.deliveryStatus === "cancelled" || notification.deliveryStatus === "expired") {
      return { ok: false, reasonCode: `notification-${notification.deliveryStatus}` };
    }
    if (notification.deliveryStatus === "sent" || notification.deliveryStatus === "delivered") {
      return { ok: true, view: toSafeNotificationView(notification), deduplicated: true };
    }
    const recipient = this.#recipients.get(notification.recipientId);
    const template = this.#templates.get(notification.templateId);
    if (!recipient || !template) {
      return { ok: false, reasonCode: "notification-dependency-missing" };
    }
    if (this.#templateTenants.get(template.templateId) !== context.tenantId) {
      return { ok: false, reasonCode: "template-missing" };
    }
    const preference = this.#findPreference(notification);
    const suppression = this.#findSuppression(notification);
    const policy = evaluateNotificationDeliveryPolicy({
      context,
      recipient,
      channel: notification.channel,
      classification: notification.classification,
      ...(preference ? { preference } : {}),
      ...(suppression ? { suppression } : {}),
      allowMandatoryOptOutBypass: options.allowMandatoryOptOutBypass ?? false,
      allowUnverifiedSensitiveRecipient: options.allowUnverifiedSensitiveRecipient ?? false,
      testRecipientAuthorised: options.testRecipientAuthorised ?? false,
    });
    if (!policy.allowed) {
      const suppressed = this.#putNotification(notification, {
        deliveryStatus: "suppressed",
        suppressedAt: this.#now(),
        failureReasonCode: policy.reasonCode,
        safeFailureMessage: policy.reasonCode,
        updatedAt: this.#now(),
        updatedBy: context.actorId,
      });
      const evidence = this.#recordEvidence(
        suppressed,
        "suppressed",
        policy.reasonCode,
        policy.reasonCode,
      );
      await this.#emitNotification(
        "notification.suppressed",
        context,
        suppressed,
        "success",
        policy.reasonCode,
      );
      return { ok: false, reasonCode: policy.reasonCode, evidence };
    }
    let rendered: RenderedNotificationMessage;
    let currentNotification: NotificationIntent;
    try {
      const rendering = this.#putNotification(notification, {
        deliveryStatus: "rendering",
        updatedAt: this.#now(),
        updatedBy: context.actorId,
      });
      this.#notifications.set(notification.notificationId, rendering);
      rendered = renderNotificationTemplate({
        notificationId: notification.notificationId,
        tenantId: notification.tenantId,
        recipientId: notification.recipientId,
        channel: notification.channel,
        classification: notification.classification,
        template,
        values,
      });
      this.#templates.set(
        template.templateId,
        Object.freeze({ ...template, firstUsedAt: template.firstUsedAt ?? this.#now() }),
      );
      currentNotification = this.#putNotification(rendering, {
        deliveryStatus: "rendered",
        payloadClassification: rendered.payloadClassification,
        updatedAt: this.#now(),
        updatedBy: context.actorId,
      });
      await this.#emitNotification(
        "notification.rendered",
        context,
        currentNotification,
        "success",
      );
    } catch (error) {
      const failed = this.#putNotification(notification, {
        deliveryStatus: "blocked",
        failedAt: this.#now(),
        failureReasonCode:
          error instanceof Error && "reasonCode" in error
            ? String(error.reasonCode)
            : "render-failed",
        safeFailureMessage: "notification render failed",
        updatedAt: this.#now(),
        updatedBy: context.actorId,
      });
      const evidence = this.#recordEvidence(
        failed,
        "blocked",
        failed.failureReasonCode,
        failed.safeFailureMessage,
      );
      await this.#emitNotification(
        "notification.failed",
        context,
        failed,
        "failed",
        failed.failureReasonCode ?? "render-failed",
      );
      return { ok: false, reasonCode: failed.failureReasonCode ?? "render-failed", evidence };
    }

    const sending = this.#putNotification(currentNotification, {
      deliveryStatus: "sending",
      updatedAt: this.#now(),
      updatedBy: context.actorId,
    });
    const result = await this.#provider.send({
      tenantId: sending.tenantId,
      notificationId: sending.notificationId,
      deliveryId: stableId("delivery", [sending.notificationId, String(this.#seq + 1)]),
      channel: sending.channel,
      classification: sending.classification,
      providerRef: sending.providerRef,
      providerMode: sending.providerMode,
      recipientId: sending.recipientId,
      recipientAddressRef: sending.recipientAddressRef,
      recipientAddressHash: notificationAddressHash(sending.recipientAddressRef),
      templateId: rendered.templateId,
      templateVersion: rendered.templateVersion,
      templateHash: rendered.templateHash,
      idempotencyKey: sending.idempotencyKey,
      subject: rendered.subject,
      body: rendered.body,
      payloadClassification: rendered.payloadClassification,
    });
    return this.#applyProviderResult(context, sending, result);
  }

  async cancelNotification(
    context: TenantContext,
    notificationId: string,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    const notification = this.#notifications.get(notificationId);
    if (!notification) {
      return { ok: false, reasonCode: "notification-missing" };
    }
    const deny = await this.#authorizeNotification(context, "notification.cancel", notification);
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    if (
      ["sent", "delivered", "dead-lettered", "cancelled", "expired"].includes(
        notification.deliveryStatus,
      )
    ) {
      return { ok: false, reasonCode: "already-terminal" };
    }
    const cancelled = this.#putNotification(notification, {
      deliveryStatus: "cancelled",
      updatedAt: this.#now(),
      updatedBy: context.actorId,
    });
    await this.#emitNotification("notification.cancelled", context, cancelled, "success");
    return { ok: true, reasonCode: "cancelled" };
  }

  async retryNotification(
    context: TenantContext,
    notificationId: string,
    values: Readonly<Record<string, string>>,
    options: DeliveryOptions = {},
  ): Promise<NotificationOutcome> {
    const notification = this.#notifications.get(notificationId);
    if (!notification) {
      return { ok: false, reasonCode: "notification-missing" };
    }
    const deny = await this.#authorizeNotification(context, "notification.retry", notification);
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    if (!["failed", "retrying", "dead-lettered"].includes(notification.deliveryStatus)) {
      return { ok: false, reasonCode: "not-retryable-state" };
    }
    const retrying = this.#putNotification(notification, {
      deliveryStatus: "retrying",
      updatedAt: this.#now(),
      updatedBy: context.actorId,
    });
    await this.#emitNotification(
      "notification.retrying",
      context,
      retrying,
      "success",
      "manual-retry",
    );
    return this.deliverNotification(context, notificationId, values, options);
  }

  async expireNotification(
    context: TenantContext,
    notificationId: string,
  ): Promise<{ readonly ok: boolean; readonly reasonCode: string }> {
    const notification = this.#notifications.get(notificationId);
    if (!notification) {
      return { ok: false, reasonCode: "notification-missing" };
    }
    const deny = await this.#authorizeNotification(context, "notification.cancel", notification);
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    if (
      ["sent", "delivered", "dead-lettered", "cancelled", "expired"].includes(
        notification.deliveryStatus,
      )
    ) {
      return { ok: false, reasonCode: "already-terminal" };
    }
    const expired = this.#putNotification(notification, {
      deliveryStatus: "expired",
      updatedAt: this.#now(),
      updatedBy: context.actorId,
    });
    await this.#emitNotification("notification.cancelled", context, expired, "success", "expired");
    return { ok: true, reasonCode: "expired" };
  }

  async readNotification(
    context: TenantContext,
    notificationId: string,
  ): Promise<NotificationOutcome> {
    const notification = this.#notifications.get(notificationId);
    if (!notification) {
      return { ok: false, reasonCode: "notification-missing" };
    }
    const deny = await this.#authorizeNotification(context, "notification.read", notification);
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    await this.#emitNotification("notification.read", context, notification, "success");
    return { ok: true, view: toSafeNotificationView(notification) };
  }

  async listNotifications(
    context: TenantContext,
  ): Promise<
    | { readonly ok: true; readonly views: readonly SafeNotificationView[] }
    | { readonly ok: false; readonly reasonCode: string }
  > {
    const deny = await this.#authorize(
      context,
      "notification.list",
      "notification",
      `tenant:${context.tenantId}`,
      context.tenantId,
      {},
    );
    if (deny) {
      return { ok: false, reasonCode: deny };
    }
    return {
      ok: true,
      views: [...this.#notifications.values()]
        .filter((notification) => notification.tenantId === context.tenantId)
        .map(toSafeNotificationView),
    };
  }

  deliveryEvidence(notificationId: string): readonly NotificationDeliveryEvidence[] {
    return Object.freeze([...(this.#evidence.get(notificationId) ?? [])]);
  }

  // Compatibility for USF-39 local bootstrap call sites. This path is intentionally
  // not a parity proof surface; the richer methods above are PDP/audit/proof backed.
  async sendTenantNotice(context: TenantContext, subject: string, body: string): Promise<void> {
    const recipientAddressRef = stableId("compatrecipient", [context.tenantId, context.actorId]);
    await this.#provider.send({
      tenantId: context.tenantId,
      notificationId: stableId("notice", [context.tenantId, context.actorId]),
      deliveryId: stableId("delivery", [context.tenantId, context.actorId]),
      channel: "test",
      classification: "test",
      providerRef: "compat-mail",
      providerMode: "local-test",
      recipientId: context.actorId,
      recipientAddressRef,
      recipientAddressHash: notificationAddressHash(recipientAddressRef),
      templateId: "compat",
      templateVersion: "1",
      templateHash: "compat",
      idempotencyKey: stableId("compat", [context.tenantId, context.actorId, subject]),
      subject,
      body,
      payloadClassification: "internal",
    });
  }

  async #authorizeNotification(
    context: TenantContext,
    action: string,
    notification: NotificationIntent,
  ): Promise<string | null> {
    return this.#authorize(
      context,
      action,
      "notification",
      notification.notificationId,
      notification.tenantId,
      {
        classification: notification.classification,
        channel: notification.channel,
      },
    );
  }

  async #authorize(
    context: TenantContext | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    resourceTenantId: string,
    attributes: Readonly<Record<string, string>>,
  ): Promise<string | null> {
    if (!context?.tenantId) {
      return "missing-tenant-context";
    }
    const decision = this.#pdp.decide({
      context,
      action,
      resource: { type: resourceType, id: resourceId, tenantId: resourceTenantId, attributes },
    });
    if (decision.effect === "permit") {
      return null;
    }
    await this.#emit("notification.denied", context, {
      resourceType,
      resourceId,
      outcome: "denied",
      reasonCode: decision.reasonCode,
      metadata: { action, ...attributes },
    });
    return decision.reasonCode;
  }

  async #applyProviderResult(
    context: TenantContext,
    notification: NotificationIntent,
    result: NotificationProviderSendResult,
  ): Promise<NotificationOutcome> {
    if (result.ok) {
      const sent = this.#putNotification(notification, {
        deliveryStatus: result.deliveryStatus,
        providerMessageId: result.providerMessageId,
        sentAt: this.#now(),
        failureReasonCode: null,
        safeFailureMessage: null,
        updatedAt: this.#now(),
        updatedBy: context.actorId,
      });
      const evidence = this.#recordEvidence(sent, result.deliveryStatus, null, null);
      await this.#emitNotification("notification.sent", context, sent, "success");
      return { ok: true, view: toSafeNotificationView(sent), evidence };
    }

    const nextRetry = notification.retryCount + 1;
    const terminal = !result.retryable || nextRetry > notification.maxRetries;
    const deliveryStatus: NotificationDeliveryStatus = terminal ? "dead-lettered" : "retrying";
    const failed = this.#putNotification(notification, {
      deliveryStatus,
      retryCount: nextRetry,
      failedAt: this.#now(),
      deadLetterReason: terminal ? result.failureReasonCode : null,
      failureReasonCode: result.failureReasonCode,
      safeFailureMessage: safeFailureMessage(result.safeFailureMessage),
      updatedAt: this.#now(),
      updatedBy: context.actorId,
    });
    const evidence = this.#recordEvidence(
      failed,
      deliveryStatus,
      result.failureReasonCode,
      result.safeFailureMessage,
    );
    await this.#emitNotification(
      "notification.failed",
      context,
      failed,
      "failed",
      result.failureReasonCode,
    );
    await this.#emitNotification(
      terminal ? "notification.dead_lettered" : "notification.retrying",
      context,
      failed,
      terminal ? "failed" : "success",
      result.failureReasonCode,
    );
    return { ok: false, reasonCode: result.failureReasonCode, evidence };
  }

  #putNotification(
    notification: NotificationIntent,
    patch: Partial<NotificationIntent>,
  ): NotificationIntent {
    const updated = Object.freeze({ ...notification, ...patch });
    this.#notifications.set(notification.notificationId, updated);
    return updated;
  }

  #recordEvidence(
    notification: NotificationIntent,
    status: NotificationDeliveryStatus,
    failureReasonCode: string | null,
    message: string | null,
  ): NotificationDeliveryEvidence {
    const evidence = createNotificationDeliveryEvidence({
      notification,
      deliveryId: stableId("delivery", [notification.notificationId, String(++this.#seq)]),
      deliveryStatus: status,
      failureReasonCode,
      safeFailureMessage: message ? safeFailureMessage(message) : null,
      recordedAt: this.#now(),
    });
    const existing = this.#evidence.get(notification.notificationId) ?? [];
    this.#evidence.set(notification.notificationId, [...existing, evidence]);
    return evidence;
  }

  #findPreference(notification: NotificationIntent): NotificationPreference | undefined {
    return (
      this.#preferences.get(
        [
          notification.tenantId,
          notification.recipientId,
          notification.channel,
          notification.classification,
        ].join(":"),
      ) ??
      this.#preferences.get(
        [notification.tenantId, notification.recipientId, notification.channel, "all"].join(":"),
      )
    );
  }

  #findSuppression(notification: NotificationIntent): NotificationSuppression | undefined {
    return (
      this.#suppressions.get(
        [
          notification.tenantId,
          notification.recipientId,
          notification.channel,
          notification.classification,
        ].join(":"),
      ) ??
      this.#suppressions.get(
        [notification.tenantId, notification.recipientId, notification.channel, "all"].join(":"),
      ) ??
      this.#suppressions.get(
        [notification.tenantId, notification.recipientId, "all", notification.classification].join(
          ":",
        ),
      ) ??
      this.#suppressions.get(
        [notification.tenantId, notification.recipientId, "all", "all"].join(":"),
      )
    );
  }

  #preferenceKey(preference: NotificationPreference): string {
    return [
      preference.tenantId,
      preference.recipientId,
      preference.channel,
      preference.classification,
    ].join(":");
  }

  #suppressionKey(suppression: NotificationSuppression): string {
    return [
      suppression.tenantId,
      suppression.recipientId,
      suppression.channel,
      suppression.classification,
    ].join(":");
  }

  async #emitNotification(
    eventType: string,
    context: TenantContext,
    notification: NotificationIntent,
    outcome: "success" | "denied" | "failed",
    reasonCode = "ok",
  ): Promise<void> {
    await this.#emit(eventType, context, {
      resourceType: "notification",
      resourceId: notification.notificationId,
      outcome,
      reasonCode,
      metadata: {
        notificationId: notification.notificationId,
        channel: notification.channel,
        classification: notification.classification,
        deliveryStatus: notification.deliveryStatus,
        providerMode: notification.providerMode,
        providerRef: notification.providerRef,
        recipientId: notification.recipientId,
        recipientAddressHash: notificationAddressHash(notification.recipientAddressRef),
        templateId: notification.templateId,
        templateVersion: notification.templateVersion,
        templateHash: notification.templateHash,
        retryCount: String(notification.retryCount),
        maxRetries: String(notification.maxRetries),
      },
    });
  }

  async #emit(
    eventType: string,
    context: TenantContext,
    input: {
      resourceType: string;
      resourceId: string;
      outcome: "success" | "denied" | "failed";
      reasonCode?: string;
      metadata?: Readonly<Record<string, unknown>>;
    },
  ): Promise<void> {
    this.#seq += 1;
    await this.#audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [
          context.tenantId,
          eventType,
          input.resourceId,
          String(this.#seq),
        ]),
        eventType,
        tenantId: context.tenantId,
        actorId: context.actorId,
        actorType: isServiceActor(context.actorId) ? "service" : "user",
        action: eventType,
        outcome: input.outcome,
        reasonCode: input.reasonCode ?? "ok",
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        recordedByComponent: "notification-service",
        dataClassification: "security-sensitive",
        metadata: input.metadata ?? {},
      }),
    );
  }
}

class MailProviderCompat implements NotificationProvider {
  readonly providerMode = "local-test" as const;

  constructor(private readonly mail: MailProvider) {}

  configure(): void {
    // Compatibility shim for the historical bootstrap helper only.
  }

  async send(
    input: Parameters<NotificationProvider["send"]>[0],
  ): Promise<NotificationProviderSendResult> {
    await this.mail.send({
      tenantId: input.tenantId,
      to: input.recipientAddressHash,
      subject: "redacted-notification-subject",
      body: "[redacted-notification-body]",
    });
    return {
      ok: true,
      deliveryStatus: "sent",
      providerMessageId: stableId("mail", [input.notificationId, input.deliveryId]),
      safeProviderSummary: "compat-mail",
    };
  }
}

export {
  createEnterpriseNotificationControlPlane,
  EnterpriseNotificationControlPlane,
  type NotificationEnterpriseEvidence,
  type NotificationFeedbackInput,
  type NotificationBulkCampaignInput,
  type NotificationEnterpriseDisposition,
} from "./enterprise-messaging-controls.ts";

const denyAllPdp: NotificationCapabilityDeps["pdp"] = {
  decide: () => ({ effect: "deny", reasonCode: "compat-mode-no-pdp" }),
};

const dropAuditRecorder: AuditRecorder = {
  async record(draft) {
    return {
      ...draft,
      recordedAt: draft.occurredAt,
      ingestedAt: draft.occurredAt,
      chainScope: draft.tenantId,
      sequence: 0,
      previousHash: null,
      eventHash: "compat",
      signature: null,
      chainKeyId: null,
      verificationStatus: "recorded",
    };
  },
};
