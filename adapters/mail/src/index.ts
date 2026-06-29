import { createHash } from "node:crypto";
import { MailpitClient } from "mailpit-api";
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

export interface MailpitComposedDeliveryEvidence {
  readonly providerRef: "notification-delivery-mailpit-composed-test";
  readonly providerMode: "composed-test";
  readonly providerRegistryId: "notification-delivery-mailpit-composed-test";
  readonly serviceCatalogueServiceId: "mailpit";
  readonly adapterName: "MailpitNotificationProvider";
  readonly sdkPackage: "mailpit-api";
  readonly sdkVersion: "2.1.0";
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: "endpoint://compose/mailpit";
  readonly readinessChecked: boolean;
  readonly writeChecked: boolean;
  readonly readbackChecked: boolean;
  readonly cleanupAttempted: boolean;
  readonly cleanupSucceeded: boolean;
  readonly safeProviderSummary: "mailpit-composed-provider";
  readonly providerMessageIdHash: string | null;
  readonly recipientAddressHash: string;
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

export class MailpitNotificationProvider implements NotificationProvider {
  #config: NotificationProviderConfig | undefined;
  #client: MailpitClient | undefined;
  #lastEvidence: MailpitComposedDeliveryEvidence | undefined;

  get providerMode(): NotificationProviderMode {
    return this.#config?.providerMode ?? "composed-test";
  }

  get lastDeliveryEvidence(): MailpitComposedDeliveryEvidence | undefined {
    return this.#lastEvidence;
  }

  configure(config: NotificationProviderConfig): void {
    const validated = validateNotificationProviderConfig(config);
    if (validated.providerMode !== "composed-test") {
      throw new Error("mailpit provider requires composed-test provider mode");
    }
    if (validated.providerRef !== "notification-delivery-mailpit-composed-test") {
      throw new Error("mailpit provider ref mismatch");
    }
    if (validated.endpoint === null) {
      throw new Error("mailpit endpoint ref configuration missing");
    }
    if (validated.credentialRef !== null) {
      throw new Error("mailpit composed proof must not configure credentials");
    }
    this.#config = validated;
    this.#client = new MailpitClient(validated.endpoint);
    this.#lastEvidence = undefined;
  }

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    const config = this.#config;
    const client = this.#client;
    if (!config || !client) {
      return mailpitFailure("provider-config-missing", "mailpit provider config missing", false);
    }
    if (input.providerMode !== config.providerMode || input.providerRef !== config.providerRef) {
      return mailpitFailure("provider-config-mismatch", "mailpit provider config mismatch", false);
    }

    let confirmationId: string | null = null;
    let readinessChecked = false;
    let cleanupAttempted = false;
    let cleanupSucceeded = false;
    try {
      await client.getInfo();
      readinessChecked = true;
      const syntheticRecipient = syntheticMailpitRecipient(input.recipientAddressHash);
      const sent = await client.sendMessage({
        From: { Email: "runtime-proof@example.test", Name: "USF Runtime Proof" },
        To: [{ Email: syntheticRecipient }],
        Subject: input.subject,
        Text: input.body,
        Headers: {
          "X-USF-Provider-Ref": input.providerRef,
          "X-USF-Delivery-Id": input.deliveryId,
          "X-USF-Synthetic-Data": "true",
        },
        Tags: ["usf-runtime-proof", input.tenantId],
      });
      confirmationId = sent.ID;
      const summary = await client.getMessageSummary(confirmationId);
      if (summary.ID !== confirmationId) {
        throw new Error("mailpit readback mismatch");
      }
      cleanupAttempted = true;
      await client.deleteMessages({ IDs: [confirmationId] });
      cleanupSucceeded = true;

      const providerMessageIdHash = safeContentHash(confirmationId);
      this.#lastEvidence = Object.freeze({
        providerRef: "notification-delivery-mailpit-composed-test",
        providerMode: "composed-test",
        providerRegistryId: "notification-delivery-mailpit-composed-test",
        serviceCatalogueServiceId: "mailpit",
        adapterName: "MailpitNotificationProvider",
        sdkPackage: "mailpit-api",
        sdkVersion: "2.1.0",
        sdkBoundary: "adapter-package-only",
        endpointRef: "endpoint://compose/mailpit",
        readinessChecked: true,
        writeChecked: true,
        readbackChecked: true,
        cleanupAttempted,
        cleanupSucceeded,
        safeProviderSummary: "mailpit-composed-provider",
        providerMessageIdHash,
        recipientAddressHash: input.recipientAddressHash,
      });
      return {
        ok: true,
        deliveryStatus: "sent",
        providerMessageId: `mailpit_${providerMessageIdHash}`,
        safeProviderSummary: "mailpit-composed-provider",
      };
    } catch {
      this.#lastEvidence = Object.freeze({
        providerRef: "notification-delivery-mailpit-composed-test",
        providerMode: "composed-test",
        providerRegistryId: "notification-delivery-mailpit-composed-test",
        serviceCatalogueServiceId: "mailpit",
        adapterName: "MailpitNotificationProvider",
        sdkPackage: "mailpit-api",
        sdkVersion: "2.1.0",
        sdkBoundary: "adapter-package-only",
        endpointRef: "endpoint://compose/mailpit",
        readinessChecked,
        writeChecked: confirmationId !== null,
        readbackChecked: false,
        cleanupAttempted,
        cleanupSucceeded,
        safeProviderSummary: "mailpit-composed-provider",
        providerMessageIdHash: confirmationId ? safeContentHash(confirmationId) : null,
        recipientAddressHash: input.recipientAddressHash,
      });
      return mailpitFailure(
        "mailpit-composed-provider-error",
        "mailpit composed provider call failed safely",
        true,
      );
    }
  }
}

function safeContentHash(value: string): string {
  return `sha256_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function syntheticMailpitRecipient(recipientAddressHash: string): string {
  const localPart = createHash("sha256").update(recipientAddressHash).digest("hex").slice(0, 24);
  return `recipient-${localPart}@example.test`;
}

function mailpitFailure(
  failureReasonCode: string,
  message: string,
  retryable: boolean,
): NotificationProviderSendResult {
  return {
    ok: false,
    deliveryStatus: "failed",
    failureReasonCode,
    safeFailureMessage: safeFailureMessage(message),
    retryable,
  };
}
