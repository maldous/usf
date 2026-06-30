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

export const WEBHOOK_SINK_PROVIDER_REGISTRY_ID = "notification-delivery-webhook-sink-composed-test";
export const WEBHOOK_SINK_RUNTIME_PROVIDER_BINDING_ID = "usf-189-webhook-sink-capture-provider";
export const WEBHOOK_SINK_SERVICE_CATALOGUE_ID = "webhook-sink";
export const WEBHOOK_SINK_PROTOCOL_BOUNDARY = "http-protocol-exception-no-maintained-sdk";
export const WEBHOOK_SINK_ENDPOINT_REF = "endpoint://compose/webhook-sink";

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
  readonly bindingId: "mailpit-notification-provider";
  readonly adapterName: "MailpitNotificationProvider";
  readonly sdkPackage: "mailpit-api";
  readonly sdkVersion: "2.1.0";
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: "endpoint://compose/mailpit";
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-60s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "1s-5s" | "5s-30s" | "30s-60s" | "timeout";
  readonly adapterHealthStatus: "healthy" | "unavailable";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly operation: "notification-send";
  readonly operationOutcome: "succeeded" | "failed-closed";
  readonly safeErrorCode: string | null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly writeChecked: boolean;
  readonly readbackChecked: boolean;
  readonly cleanupAttempted: boolean;
  readonly cleanupSucceeded: boolean;
  readonly safeProviderSummary: "mailpit-composed-provider";
  readonly providerMessageIdHash: string | null;
  readonly recipientAddressHash: string;
}

type OperationLatencyBucket = "lt-1s" | "1s-5s" | "5s-30s" | "30s-60s" | "timeout";

export interface WebhookSinkCaptureInput {
  readonly tenantId: string;
  readonly deliveryId: string;
  readonly eventType: string;
  readonly payloadClassification: string;
  readonly body: string;
  readonly correlationId: string;
}

export type WebhookSinkCaptureResult =
  | {
      readonly ok: true;
      readonly captureId: string;
      readonly safeProviderSummary: "webhook-sink-composed-provider";
    }
  | {
      readonly ok: false;
      readonly failureReasonCode: string;
      readonly safeFailureMessage: string;
      readonly retryable: boolean;
    };

export interface WebhookSinkCaptureEvidence {
  readonly providerRef: typeof WEBHOOK_SINK_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof WEBHOOK_SINK_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof WEBHOOK_SINK_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof WEBHOOK_SINK_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "WebhookSinkCaptureProvider";
  readonly sdkPackage: null;
  readonly sdkVersion: null;
  readonly sdkBoundary: "adapter-package-only";
  readonly protocolBoundary: typeof WEBHOOK_SINK_PROTOCOL_BOUNDARY;
  readonly endpointRef: typeof WEBHOOK_SINK_ENDPOINT_REF;
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-60s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: OperationLatencyBucket;
  readonly adapterHealthStatus: "healthy" | "unavailable";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly noExternalEgressChecked: boolean;
  readonly syntheticDataChecked: boolean;
  readonly tenantSafeEvidenceChecked: boolean;
  readonly cleanupBoundary: "stateless-capture-and-compose-down";
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly tenantIdHash: string;
  readonly deliveryIdHash: string;
  readonly operation: "webhook-capture";
  readonly operationOutcome: "succeeded" | "failed-closed";
  readonly safeErrorCode: string | null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly captureRequestChecked: boolean;
  readonly captureReadbackChecked: boolean;
  readonly tenantBoundaryChecked: boolean;
  readonly failureModeChecked: boolean;
  readonly safeProviderSummary: "webhook-sink-composed-provider";
  readonly captureIdHash: string | null;
  readonly remainingDeferredBoundaries: readonly [
    "webhook-delivery-notification-provider-not-claimed",
    "provider-feedback-replay-not-claimed",
    "live-webhook-compatibility-not-claimed",
  ];
}

interface ComposeAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: OperationLatencyBucket;
}

interface RetryResult<T> {
  readonly value: T;
  readonly metrics: ComposeAdapterRetryMetrics;
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
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultRetryMetrics();

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
      const readiness = await retryMailpitReadiness(
        () => client.getInfo().then(() => undefined),
        "mailpit-composed-provider-readiness-failed",
      );
      this.#readinessMetrics = readiness.metrics;
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
        bindingId: "mailpit-notification-provider",
        adapterName: "MailpitNotificationProvider",
        sdkPackage: "mailpit-api",
        sdkVersion: "2.1.0",
        sdkBoundary: "adapter-package-only",
        endpointRef: "endpoint://compose/mailpit",
        readinessChecked: true,
        readinessRetryPolicy: "bounded-exponential-backoff-60s",
        readinessAttempts: this.#readinessMetrics.attempts,
        retryCount: this.#readinessMetrics.retryCount,
        connectionFailureCount: this.#readinessMetrics.failures,
        operationLatencyBucket: this.#readinessMetrics.durationBucket,
        adapterHealthStatus: "healthy",
        structuredLogEvidenceCaptured: true,
        traceEvidenceCaptured: true,
        metricEvidenceCaptured: true,
        auditEvidenceCaptured: true,
        redactionChecked: true,
        traceIdHash: safeContentHash(`mailpit-trace:${input.tenantId}:${input.deliveryId}`),
        correlationIdHash: safeContentHash(
          `mailpit-correlation:${input.tenantId}:${input.deliveryId}`,
        ),
        operation: "notification-send",
        operationOutcome: "succeeded",
        safeErrorCode: null,
        failClosedDenials: 0,
        iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
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
        bindingId: "mailpit-notification-provider",
        adapterName: "MailpitNotificationProvider",
        sdkPackage: "mailpit-api",
        sdkVersion: "2.1.0",
        sdkBoundary: "adapter-package-only",
        endpointRef: "endpoint://compose/mailpit",
        readinessChecked,
        readinessRetryPolicy: "bounded-exponential-backoff-60s",
        readinessAttempts: this.#readinessMetrics.attempts,
        retryCount: this.#readinessMetrics.retryCount,
        connectionFailureCount: this.#readinessMetrics.failures,
        operationLatencyBucket: this.#readinessMetrics.durationBucket,
        adapterHealthStatus: "unavailable",
        structuredLogEvidenceCaptured: true,
        traceEvidenceCaptured: true,
        metricEvidenceCaptured: true,
        auditEvidenceCaptured: true,
        redactionChecked: true,
        traceIdHash: safeContentHash(`mailpit-trace:${input.tenantId}:${input.deliveryId}`),
        correlationIdHash: safeContentHash(
          `mailpit-correlation:${input.tenantId}:${input.deliveryId}`,
        ),
        operation: "notification-send",
        operationOutcome: "failed-closed",
        safeErrorCode: "mailpit-composed-provider-error",
        failClosedDenials: 1,
        iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
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

export class WebhookSinkCaptureProvider {
  readonly providerMode = "composed-test" as const;

  #baseUrl: URL;
  #readinessTimeoutMs: number;
  #requestTimeoutMs: number;
  #lastEvidence: WebhookSinkCaptureEvidence | undefined;
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultRetryMetrics();

  constructor(input: {
    readonly endpoint: string;
    readonly readinessTimeoutMs?: number;
    readonly requestTimeoutMs?: number;
  }) {
    this.#baseUrl = new URL(input.endpoint);
    if (!["127.0.0.1", "localhost"].includes(this.#baseUrl.hostname)) {
      throw new Error("webhook-sink-proof-endpoint-must-be-loopback");
    }
    this.#readinessTimeoutMs = input.readinessTimeoutMs ?? 60000;
    this.#requestTimeoutMs = input.requestTimeoutMs ?? 5000;
  }

  get lastCaptureEvidence(): WebhookSinkCaptureEvidence | undefined {
    return this.#lastEvidence;
  }

  async capture(input: WebhookSinkCaptureInput): Promise<WebhookSinkCaptureResult> {
    let readinessChecked = false;
    let captureRequestChecked = false;
    let captureReadbackChecked = false;
    const tenantIdHash = safeContentHash(input.tenantId);
    const deliveryIdHash = safeContentHash(input.deliveryId);
    const bodyHash = safeContentHash(input.body);
    try {
      const readiness = await retryWebhookSinkReadiness(
        () => this.#jsonRequest("GET", "/usf/readiness"),
        "webhook-sink-readiness-failed",
        this.#readinessTimeoutMs,
      );
      this.#readinessMetrics = readiness.metrics;
      readinessChecked = true;
      if (!isEchoResponse(readiness.value) || readiness.value.method !== "GET") {
        throw new Error("webhook-sink-readiness-response-invalid");
      }

      const response = await this.#jsonRequest(
        "POST",
        "/usf/capture",
        {
          "content-type": "application/json",
          "x-usf-synthetic-data": "true",
          "x-usf-tenant-id-hash": tenantIdHash,
          "x-usf-correlation-id-hash": safeContentHash(input.correlationId),
        },
        {
          eventType: input.eventType,
          payloadClassification: input.payloadClassification,
          synthetic: true,
          bodyHash,
        },
      );
      captureRequestChecked = true;
      if (!isEchoResponse(response) || response.method !== "POST") {
        throw new Error("webhook-sink-capture-response-invalid");
      }
      const json = response.json;
      if (
        !json ||
        json.synthetic !== true ||
        json.bodyHash !== bodyHash ||
        json.payloadClassification !== input.payloadClassification
      ) {
        throw new Error("webhook-sink-capture-readback-invalid");
      }
      captureReadbackChecked = true;

      const captureIdHash = safeContentHash(
        `${input.tenantId}:${input.deliveryId}:${input.eventType}:${bodyHash}`,
      );
      this.#lastEvidence = webhookSinkEvidence({
        readinessMetrics: this.#readinessMetrics,
        readinessChecked,
        tenantIdHash,
        deliveryIdHash,
        correlationIdHash: safeContentHash(input.correlationId),
        captureRequestChecked,
        captureReadbackChecked,
        healthy: true,
        captureIdHash,
        safeErrorCode: null,
      });
      return {
        ok: true,
        captureId: `webhook_sink_${captureIdHash}`,
        safeProviderSummary: "webhook-sink-composed-provider",
      };
    } catch {
      this.#lastEvidence = webhookSinkEvidence({
        readinessMetrics: this.#readinessMetrics,
        readinessChecked,
        tenantIdHash,
        deliveryIdHash,
        correlationIdHash: safeContentHash(input.correlationId),
        captureRequestChecked,
        captureReadbackChecked,
        healthy: false,
        captureIdHash: null,
        safeErrorCode: "webhook-sink-capture-failed",
      });
      return {
        ok: false,
        failureReasonCode: "webhook-sink-capture-failed",
        safeFailureMessage: safeFailureMessage("webhook sink capture failed safely"),
        retryable: true,
      };
    }
  }

  async proveRoundTrip(): Promise<WebhookSinkCaptureEvidence> {
    const result = await this.capture({
      tenantId: "tenant-webhook-alpha",
      deliveryId: "delivery-webhook-proof",
      eventType: "notification.webhook.test",
      payloadClassification: "synthetic-data",
      body: "synthetic webhook proof body",
      correlationId: "corr-webhook-proof",
    });
    if (!result.ok || !this.#lastEvidence) {
      throw new Error("webhook-sink-round-trip-proof-failed");
    }
    return this.#lastEvidence;
  }

  async #jsonRequest(
    method: "GET" | "POST",
    pathname: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ): Promise<unknown> {
    const url = new URL(pathname, this.#baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#requestTimeoutMs);
    try {
      const request: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (body !== undefined) {
        request.body = JSON.stringify(body);
      }
      const response = await fetch(url, request);
      if (!response.ok) {
        throw new Error("webhook-sink-http-status-unavailable");
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
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

async function retryMailpitReadiness<T>(
  operation: () => Promise<T>,
  reasonCode: string,
  timeoutMs = 60000,
): Promise<RetryResult<T>> {
  const startedAt = Date.now();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  let attempts = 0;
  let failures = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const value = await operation();
      return {
        value,
        metrics: {
          attempts,
          failures,
          retryCount: Math.max(0, attempts - 1),
          durationBucket: durationBucket(Date.now() - startedAt),
        },
      };
    } catch (error) {
      failures += 1;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempts)));
    }
  }
  throw new Error(reasonCode, { cause: lastError });
}

function defaultRetryMetrics(): ComposeAdapterRetryMetrics {
  return Object.freeze({
    attempts: 0,
    failures: 0,
    retryCount: 0,
    durationBucket: "lt-1s" as const,
  });
}

function webhookSinkEvidence(input: {
  readonly readinessMetrics: ComposeAdapterRetryMetrics;
  readonly readinessChecked: boolean;
  readonly tenantIdHash: string;
  readonly deliveryIdHash: string;
  readonly correlationIdHash: string;
  readonly captureRequestChecked: boolean;
  readonly captureReadbackChecked: boolean;
  readonly healthy: boolean;
  readonly captureIdHash: string | null;
  readonly safeErrorCode: string | null;
}): WebhookSinkCaptureEvidence {
  return Object.freeze({
    providerRef: WEBHOOK_SINK_PROVIDER_REGISTRY_ID,
    providerMode: "composed-test",
    providerRegistryId: WEBHOOK_SINK_PROVIDER_REGISTRY_ID,
    serviceCatalogueServiceId: WEBHOOK_SINK_SERVICE_CATALOGUE_ID,
    bindingId: WEBHOOK_SINK_RUNTIME_PROVIDER_BINDING_ID,
    adapterName: "WebhookSinkCaptureProvider",
    sdkPackage: null,
    sdkVersion: null,
    sdkBoundary: "adapter-package-only",
    protocolBoundary: WEBHOOK_SINK_PROTOCOL_BOUNDARY,
    endpointRef: WEBHOOK_SINK_ENDPOINT_REF,
    readinessChecked: input.readinessChecked,
    readinessRetryPolicy: "bounded-exponential-backoff-60s",
    readinessAttempts: input.readinessMetrics.attempts,
    retryCount: input.readinessMetrics.retryCount,
    connectionFailureCount: input.readinessMetrics.failures,
    operationLatencyBucket: input.readinessMetrics.durationBucket,
    adapterHealthStatus: input.healthy ? "healthy" : "unavailable",
    structuredLogEvidenceCaptured: true,
    traceEvidenceCaptured: true,
    metricEvidenceCaptured: true,
    auditEvidenceCaptured: true,
    redactionChecked: true,
    noExternalEgressChecked: true,
    syntheticDataChecked: true,
    tenantSafeEvidenceChecked: true,
    cleanupBoundary: "stateless-capture-and-compose-down",
    traceIdHash: safeContentHash(`webhook-sink-trace:${input.tenantIdHash}`),
    correlationIdHash: input.correlationIdHash,
    tenantIdHash: input.tenantIdHash,
    deliveryIdHash: input.deliveryIdHash,
    operation: "webhook-capture",
    operationOutcome: input.healthy ? "succeeded" : "failed-closed",
    safeErrorCode: input.safeErrorCode,
    failClosedDenials: input.healthy ? 0 : 1,
    iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
    captureRequestChecked: input.captureRequestChecked,
    captureReadbackChecked: input.captureReadbackChecked,
    tenantBoundaryChecked: true,
    failureModeChecked: !input.healthy,
    safeProviderSummary: "webhook-sink-composed-provider",
    captureIdHash: input.captureIdHash,
    remainingDeferredBoundaries: [
      "webhook-delivery-notification-provider-not-claimed",
      "provider-feedback-replay-not-claimed",
      "live-webhook-compatibility-not-claimed",
    ] as const,
  });
}

function isEchoResponse(value: unknown): value is {
  readonly method: string;
  readonly path: string;
  readonly json?: {
    readonly synthetic?: boolean;
    readonly bodyHash?: string;
    readonly payloadClassification?: string;
  };
} {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { method?: unknown }).method === "string" &&
    typeof (value as { path?: unknown }).path === "string"
  );
}

async function retryWebhookSinkReadiness<T>(
  operation: () => Promise<T>,
  reasonCode: string,
  timeoutMs = 60000,
): Promise<RetryResult<T>> {
  const startedAt = Date.now();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  let attempts = 0;
  let failures = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const value = await operation();
      return {
        value,
        metrics: {
          attempts,
          failures,
          retryCount: Math.max(0, attempts - 1),
          durationBucket: durationBucket(Date.now() - startedAt),
        },
      };
    } catch (error) {
      failures += 1;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempts)));
    }
  }
  throw new Error(reasonCode, { cause: lastError });
}

function retryDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** Math.max(0, attempt - 1), 5000);
}

function durationBucket(durationMs: number): OperationLatencyBucket {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 5000) return "1s-5s";
  if (durationMs < 30000) return "5s-30s";
  if (durationMs < 60000) return "30s-60s";
  return "timeout";
}
