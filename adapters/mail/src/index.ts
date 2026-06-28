import { createHash } from "node:crypto";
import {
  type NotificationProviderConfig,
  type NotificationProviderMode,
  safeFailureMessage,
  validateNotificationProviderConfig,
} from "@foundation/core";
import type {
  MailProvider,
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from "@foundation/ports";

export class InMemoryMailProvider implements MailProvider {
  readonly messages: Array<{ tenantId: string; to: string; subject: string; body: string }> = [];

  async send(input: {
    tenantId: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<void> {
    this.messages.push(input);
  }
}

export interface CapturedNotificationDelivery {
  readonly tenantId: string;
  readonly notificationId: string;
  readonly deliveryId: string;
  readonly channel: string;
  readonly classification: string;
  readonly providerRef: string;
  readonly providerMode: NotificationProviderMode;
  readonly recipientId: string;
  readonly recipientAddressHash: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly templateHash: string;
  readonly idempotencyKey: string;
  readonly payloadClassification: string;
  readonly subjectHash: string;
  readonly bodyHash: string;
}

export class InMemoryNotificationProvider implements NotificationProvider {
  #config: NotificationProviderConfig | undefined;
  #failNext: string | undefined;

  readonly messages: CapturedNotificationDelivery[] = [];

  get providerMode(): NotificationProviderMode {
    return this.#config?.providerMode ?? "in-memory";
  }

  configure(config: NotificationProviderConfig): void {
    this.#config = validateNotificationProviderConfig(config);
  }

  failNext(message = "provider failed"): void {
    this.#failNext = message;
  }

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    if (!this.#config) {
      return {
        ok: false,
        deliveryStatus: "failed",
        failureReasonCode: "provider-config-missing",
        safeFailureMessage: "notification provider config missing",
        retryable: false,
      };
    }
    if (this.#config.providerMode === "live-external-deferred") {
      return {
        ok: false,
        deliveryStatus: "failed",
        failureReasonCode: "live-external-provider-deferred",
        safeFailureMessage: "live external notification provider is deferred",
        retryable: false,
      };
    }
    if (
      input.providerMode !== this.#config.providerMode ||
      input.providerRef !== this.#config.providerRef
    ) {
      return {
        ok: false,
        deliveryStatus: "failed",
        failureReasonCode: "provider-config-mismatch",
        safeFailureMessage: "notification provider config mismatch",
        retryable: false,
      };
    }
    if (this.#failNext) {
      const raw = this.#failNext;
      this.#failNext = undefined;
      return {
        ok: false,
        deliveryStatus: "failed",
        failureReasonCode: "provider-error",
        safeFailureMessage: safeFailureMessage(raw),
        retryable: true,
      };
    }

    this.messages.push(
      Object.freeze({
        tenantId: input.tenantId,
        notificationId: input.notificationId,
        deliveryId: input.deliveryId,
        channel: input.channel,
        classification: input.classification,
        providerRef: input.providerRef,
        providerMode: input.providerMode,
        recipientId: input.recipientId,
        recipientAddressHash: input.recipientAddressHash,
        templateId: input.templateId,
        templateVersion: input.templateVersion,
        templateHash: input.templateHash,
        idempotencyKey: input.idempotencyKey,
        payloadClassification: input.payloadClassification,
        subjectHash: safeContentHash(input.subject),
        bodyHash: safeContentHash(input.body),
      }),
    );

    return {
      ok: true,
      deliveryStatus: "sent",
      providerMessageId: `mem_${input.deliveryId}`,
      safeProviderSummary: "captured-in-memory-provider",
    };
  }
}

function safeContentHash(value: string): string {
  return `sha256_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}
