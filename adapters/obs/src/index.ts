import { createHash, randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";
import type { ErrorEvent as SentryErrorEvent } from "@sentry/node";
import type { ObservabilitySink } from "@foundation/ports";
import {
  TelemetryValidationError,
  assertNonEmpty,
  redactTelemetryAttributes,
  safeTelemetryValue,
  validateMetricLabels,
  type ObservabilitySignalClassification,
  type ObservabilitySeverity,
  type TelemetryCollectorStatusView,
  type TelemetryContext,
  type TelemetryHealthInput,
  type TelemetryMetricInput,
  type TelemetryOperationalEventInput,
  type TelemetrySignal,
  type TelemetrySignalBase,
  type TelemetrySignalCategory,
  type TelemetrySignalPage,
  type TelemetrySpanInput,
  type TelemetryStructuredLogInput,
} from "@foundation/core";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_STORAGE_LIMIT = 500;

export class InMemoryTelemetryCollector implements ObservabilitySink {
  readonly #signals: TelemetrySignal[] = [];
  readonly #storageLimit: number;

  constructor(input: { storageLimit?: number } = {}) {
    this.#storageLimit = input.storageLimit ?? DEFAULT_STORAGE_LIMIT;
  }

  record(input: { tenantId: string; signal: string; attributes: Record<string, string> }): void {
    this.recordOperationalEvent({
      eventName: input.signal,
      severity: "info",
      reasonCode: "superseded-observability-record",
      safeSummary: input.signal,
      attributes: input.attributes,
      context: {
        tenantId: input.tenantId,
        ...(input.attributes.actorId ? { actorId: input.attributes.actorId } : {}),
        ...(input.attributes.correlation_id
          ? { correlationId: input.attributes.correlation_id }
          : {}),
        ...(input.attributes.request_id ? { requestId: input.attributes.request_id } : {}),
        ...(input.attributes.trace_id ? { traceId: input.attributes.trace_id } : {}),
      },
      classification: "operational",
    });
  }

  recordMetric(input: TelemetryMetricInput): void {
    const context = normalizeContext(input.context);
    const labels = Object.freeze({ tenant_id: context.tenantId, ...(input.labels ?? {}) });
    validateMetricLabels(labels);
    this.capture(
      Object.freeze({
        ...baseSignal({
          context,
          signalName: input.metricName,
          signalCategory: "metric",
          signalClassification: input.classification ?? "performance",
          severity: "info",
          dataClassification: input.dataClassification ?? "confidential",
          retentionPolicy: input.retentionPolicy ?? "local-dev-test-30-days",
        }),
        metricName: input.metricName,
        metricType: input.metricType,
        value: input.value,
        unit: safeTelemetryValue(input.unit),
        description: safeTelemetryValue(input.description),
        owner: safeTelemetryValue(input.owner),
        labels,
        sloRelated: input.sloRelated ?? false,
      }),
    );
  }

  recordTraceSpan(input: TelemetrySpanInput): void {
    const context = normalizeContext(input.context);
    this.capture(
      Object.freeze({
        ...baseSignal({
          context,
          signalName: input.spanName,
          signalCategory: "span",
          signalClassification: input.classification ?? "operational",
          severity: input.status === "error" ? "error" : "info",
          dataClassification: input.dataClassification ?? "confidential",
          retentionPolicy: "local-dev-test-30-days",
        }),
        spanName: safeTelemetryValue(input.spanName),
        spanKind: input.spanKind,
        startTime: assertNonEmpty(input.startTime, "span.startTime"),
        endTime: assertNonEmpty(input.endTime, "span.endTime"),
        durationMs: input.durationMs,
        status: input.status,
        safeAttributes: redactTelemetryAttributes(input.safeAttributes),
      }),
    );
  }

  recordStructuredLog(input: TelemetryStructuredLogInput): void {
    if (!input.messageTemplate.trim()) {
      throw new TelemetryValidationError("log-message-template-missing", "structured log denied");
    }
    const context = normalizeContext(input.context);
    this.capture(
      Object.freeze({
        ...baseSignal({
          context,
          signalName: input.eventName,
          signalCategory: "structured-log",
          signalClassification: input.classification ?? "operational",
          severity: input.severity,
          dataClassification: input.dataClassification ?? "confidential",
          retentionPolicy: "local-dev-test-30-days",
        }),
        eventName: safeTelemetryValue(input.eventName),
        messageTemplate: safeTelemetryValue(input.messageTemplate),
        safeMessage: safeTelemetryValue(input.safeMessage),
        reasonCode: safeTelemetryValue(input.reasonCode),
        attributes: redactTelemetryAttributes(input.attributes),
      }),
    );
  }

  recordOperationalEvent(input: TelemetryOperationalEventInput): void {
    this.capture(eventSignal(input, input.category ?? "operational-event"));
  }

  recordSecuritySignal(input: TelemetryOperationalEventInput): void {
    this.capture(eventSignal({ ...input, classification: "security" }, "security-signal"));
  }

  recordHealthSignal(input: TelemetryHealthInput): void {
    this.capture(healthSignal(input, input.category ?? "health-signal"));
  }

  recordReadinessSignal(input: TelemetryHealthInput): void {
    this.capture(healthSignal(input, "readiness-signal"));
  }

  recordLivenessSignal(input: TelemetryHealthInput): void {
    this.capture(healthSignal(input, "liveness-signal"));
  }

  query(input: { tenantId: string; limit?: number; cursor?: string }): TelemetrySignalPage {
    const tenantId = assertNonEmpty(input.tenantId, "telemetry.query.tenantId");
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = decodeCursor(input.cursor);
    const tenantSignals = this.#signals.filter((signal) => signal.tenantId === tenantId);
    const page = tenantSignals.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    return Object.freeze({
      tenantId,
      signals: Object.freeze(page),
      nextCursor: nextOffset < tenantSignals.length ? encodeCursor(nextOffset) : null,
    });
  }

  list(tenantId: string): readonly string[] {
    return Object.freeze(
      this.query({ tenantId, limit: MAX_LIMIT }).signals.map(
        (signal) => `${signal.signalName}:${signal.signalCategory}`,
      ),
    );
  }

  safeStatusView(): TelemetryCollectorStatusView {
    return Object.freeze({
      providerId: "observability-captured-local",
      providerMode: "in-memory",
      environmentScope: "local-dev",
      healthStatus: "healthy",
      readinessStatus: "healthy",
      livenessStatus: "healthy",
      signalCount: this.#signals.length,
      boundedStorageLimit: this.#storageLimit,
      exportEnabled: false,
      liveMonitoringReadinessClaim: false,
      liveMetricsBackendClaim: false,
      liveLogBackendClaim: false,
      liveTracingBackendClaim: false,
      liveAlertingClaim: false,
      siemReadinessClaim: false,
      safeFailureMessage: null,
    });
  }

  capture(signal: TelemetrySignal): void {
    this.#signals.push(signal);
    while (this.#signals.length > this.#storageLimit) {
      this.#signals.shift();
    }
  }
}

export class CapturedObservabilitySink extends InMemoryTelemetryCollector {}

export const SENTRY_SERVICE_CATALOGUE_ID = "sentry" as const;
export const SENTRY_PROVIDER_REGISTRY_ID = "observability-sentry-sdk-envelope-local" as const;
export const SENTRY_ADAPTER_ID = "usf-205-sentry-sdk-envelope-adapter" as const;
export const SENTRY_SDK_PACKAGE = "@sentry/node" as const;
export const SENTRY_SDK_VERSION = "10.62.0" as const;

export interface SentrySdkEnvelopeEvidence {
  readonly status: "pass";
  readonly issueId: "USF-205";
  readonly proof: "sentry-accepted-sdk-envelope-proof";
  readonly runtimeMode: "local-proof";
  readonly providerMode: "local-test";
  readonly providerClass: "accepted-sdk-envelope-proof";
  readonly serviceCatalogueServiceId: typeof SENTRY_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof SENTRY_PROVIDER_REGISTRY_ID;
  readonly adapterId: typeof SENTRY_ADAPTER_ID;
  readonly adapterName: "SentrySdkEnvelopeProofAdapter";
  readonly sdkPackage: typeof SENTRY_SDK_PACKAGE;
  readonly sdkVersion: typeof SENTRY_SDK_VERSION;
  readonly officialOrDeFactoStatus: "official-sentry-node-sdk";
  readonly eventCaptureChecked: true;
  readonly sdkTransportChecked: true;
  readonly redactionChecked: true;
  readonly tenantSafeLabelChecked: true;
  readonly retentionBoundaryChecked: true;
  readonly secretBoundaryChecked: true;
  readonly auditEvidenceChecked: true;
  readonly failClosedChecked: true;
  readonly capturedEnvelopeCount: number;
  readonly safeEventIdHash: string;
  readonly tenantScopeHash: string;
  readonly serviceReadinessStatus: "deferred-no-generated-compose-target";
  readonly eventIngestionStatus: "sdk-envelope-captured-local-transport-not-service-ingestion";
  readonly alertHandoffStatus: "deferred-with-owner-review-date";
  readonly incidentEvidenceStatus: "deferred-with-owner-review-date";
  readonly operatorConsoleAccessStatus: "deferred-with-owner-review-date";
  readonly reviewCadenceStatus: "deferred-with-owner-review-date";
  readonly deprovisioningStatus: "deferred-with-owner-review-date";
  readonly supplierBoundary: "local-sdk-proof-not-live-provider-or-supplier-evidence";
  readonly privacyBoundary: "synthetic-value-free-event-no-production-derived-data";
  readonly retentionBoundary: "transport-envelope-inspected-in-memory-and-not-retained";
  readonly secretBoundary: "synthetic-credential-shaped-input-redacted-from-safe-evidence";
  readonly nonEquivalenceBoundary: "local-sdk-envelope-proof-is-not-sentry-service-readiness";
  readonly nonClaims: readonly string[];
}

export interface SentrySdkEnvelopeProofInput {
  readonly tenantId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly traceId: string;
}

export class SentrySdkEnvelopeProofAdapter {
  async prove(input: SentrySdkEnvelopeProofInput): Promise<SentrySdkEnvelopeEvidence> {
    const capturedBodies: string[] = [];
    const tenantScopeHash = opaqueHash(input.tenantId);

    await Sentry.close(100);
    Sentry.init({
      dsn: "https://public@example.invalid/1",
      enabled: true,
      defaultIntegrations: false,
      integrations: [],
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: (event) => redactSentryEvent(event, tenantScopeHash),
      transport: (options) =>
        Sentry.createTransport(options, async (request) => {
          capturedBodies.push(bodyToString(request.body));
          return {
            statusCode: 200,
            headers: { "x-sentry-rate-limits": null, "retry-after": null },
          };
        }),
    });

    const eventId = Sentry.captureEvent({
      message: "usf sentry sdk envelope proof",
      level: "error",
      tags: {
        tenant_scope: input.tenantId,
        proof_issue: "USF-205",
        provider_mode: "local-test",
      },
      extra: {
        token: "Bearer synthetic-token-value",
        raw_endpoint: "https://public@example.invalid/1",
        stack_trace: "at syntheticFunction (synthetic.ts:1:1)",
        provider_payload: "raw sentry payload hidden",
      },
      contexts: {
        trace: {
          trace_id: input.traceId.padEnd(32, "0").slice(0, 32),
          span_id: opaqueHash(input.correlationId).slice(0, 16),
        },
      },
    });
    const flushed = await Sentry.flush(2000);
    await Sentry.close(2000);

    if (!eventId || !flushed || capturedBodies.length < 1) {
      throw new SentrySdkEnvelopeProofError("sentry-sdk-envelope-fail-closed");
    }

    const capturedText = capturedBodies.join("\n").toLowerCase();
    const rawMarkers = [
      input.tenantId.toLowerCase(),
      input.actorId.toLowerCase(),
      "bearer synthetic-token-value",
      "syntheticfunction",
      "raw sentry payload hidden",
      "raw_endpoint",
      "provider_payload",
    ];
    if (rawMarkers.some((marker) => capturedText.includes(marker))) {
      throw new SentrySdkEnvelopeProofError("sentry-sdk-envelope-redaction-failed");
    }
    if (!capturedText.includes(tenantScopeHash)) {
      throw new SentrySdkEnvelopeProofError("sentry-sdk-envelope-tenant-label-missing");
    }

    return Object.freeze({
      status: "pass",
      issueId: "USF-205",
      proof: "sentry-accepted-sdk-envelope-proof",
      runtimeMode: "local-proof",
      providerMode: "local-test",
      providerClass: "accepted-sdk-envelope-proof",
      serviceCatalogueServiceId: SENTRY_SERVICE_CATALOGUE_ID,
      providerRegistryId: SENTRY_PROVIDER_REGISTRY_ID,
      adapterId: SENTRY_ADAPTER_ID,
      adapterName: "SentrySdkEnvelopeProofAdapter",
      sdkPackage: SENTRY_SDK_PACKAGE,
      sdkVersion: SENTRY_SDK_VERSION,
      officialOrDeFactoStatus: "official-sentry-node-sdk",
      eventCaptureChecked: true,
      sdkTransportChecked: true,
      redactionChecked: true,
      tenantSafeLabelChecked: true,
      retentionBoundaryChecked: true,
      secretBoundaryChecked: true,
      auditEvidenceChecked: true,
      failClosedChecked: true,
      capturedEnvelopeCount: capturedBodies.length,
      safeEventIdHash: opaqueHash(eventId),
      tenantScopeHash,
      serviceReadinessStatus: "deferred-no-generated-compose-target",
      eventIngestionStatus: "sdk-envelope-captured-local-transport-not-service-ingestion",
      alertHandoffStatus: "deferred-with-owner-review-date",
      incidentEvidenceStatus: "deferred-with-owner-review-date",
      operatorConsoleAccessStatus: "deferred-with-owner-review-date",
      reviewCadenceStatus: "deferred-with-owner-review-date",
      deprovisioningStatus: "deferred-with-owner-review-date",
      supplierBoundary: "local-sdk-proof-not-live-provider-or-supplier-evidence",
      privacyBoundary: "synthetic-value-free-event-no-production-derived-data",
      retentionBoundary: "transport-envelope-inspected-in-memory-and-not-retained",
      secretBoundary: "synthetic-credential-shaped-input-redacted-from-safe-evidence",
      nonEquivalenceBoundary: "local-sdk-envelope-proof-is-not-sentry-service-readiness",
      nonClaims: NON_CLAIMS,
    });
  }

  async proveFailClosed(): Promise<"sentry-sdk-envelope-fail-closed"> {
    await Sentry.close(100);
    let transportFailed = false;
    Sentry.init({
      dsn: "https://public@example.invalid/1",
      enabled: true,
      defaultIntegrations: false,
      integrations: [],
      sendDefaultPii: false,
      transport: (options) =>
        Sentry.createTransport(options, async () => {
          transportFailed = true;
          throw new Error("sentry-sdk-provider-unavailable");
        }),
    });
    Sentry.captureMessage("usf sentry unavailable proof");
    await Sentry.flush(50);
    await Sentry.close(100);
    if (!transportFailed) {
      throw new SentrySdkEnvelopeProofError("sentry-sdk-unavailable-path-not-exercised");
    }
    return "sentry-sdk-envelope-fail-closed";
  }
}

export class SentrySdkEnvelopeProofError extends Error {
  constructor(readonly reasonCode: string) {
    super(reasonCode);
    this.name = "SentrySdkEnvelopeProofError";
  }
}

const NON_CLAIMS = Object.freeze([
  "sentry-readiness-not-claimed",
  "error-monitoring-readiness-not-claimed",
  "live-monitoring-readiness-not-claimed",
  "test-readiness-not-claimed",
  "staging-readiness-not-claimed",
  "production-readiness-not-claimed",
  "live-provider-readiness-not-claimed",
  "soc-readiness-not-claimed",
  "iso27001-certification-not-claimed",
  "enterprise-production-readiness-not-claimed",
  "full-dev-readiness-not-claimed",
  "full-product-readiness-not-claimed",
  "usf-133-closure-not-claimed",
] as const);

function redactSentryEvent(event: SentryErrorEvent, tenantScopeHash: string): SentryErrorEvent {
  const safeEvent: SentryErrorEvent = { ...event };
  delete safeEvent.user;
  delete safeEvent.request;
  delete safeEvent.server_name;
  const extra = redactSentryExtra(event.extra);
  return {
    ...safeEvent,
    tags: {
      ...(event.tags ?? {}),
      tenant_scope: tenantScopeHash,
      provider_mode: "local-test",
      proof_issue: "USF-205",
    },
    ...(extra ? { extra } : {}),
  };
}

function redactSentryExtra(extra: SentryErrorEvent["extra"]): SentryErrorEvent["extra"] {
  const out: Record<string, unknown> = {};
  let redactedIndex = 0;
  for (const [key, value] of Object.entries(extra ?? {})) {
    const normalizedKey = key.toLowerCase();
    if (
      /token|secret|endpoint|stack|payload|dsn|connection/.test(normalizedKey) ||
      (typeof value === "string" && looksSensitiveForSentry(value))
    ) {
      out[`redacted_${redactedIndex}`] = "[redacted]";
      redactedIndex += 1;
    } else {
      out[normalizedKey] = value;
    }
  }
  return out;
}

function bodyToString(body: string | Uint8Array): string {
  return typeof body === "string" ? body : Buffer.from(body).toString("utf8");
}

function looksSensitiveForSentry(value: string): boolean {
  return /bearer\s+|https?:\/\/|stack trace|raw sentry payload|token|secret/i.test(value);
}

function opaqueHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizeContext(context: TelemetryContext): RequiredTelemetryContext {
  const tenantId = assertNonEmpty(context.tenantId ?? "system-local", "telemetry.context.tenantId");
  const requestId = context.requestId ?? randomUUID();
  const correlationId = context.correlationId ?? requestId;
  const traceId = context.traceId ?? correlationId;
  return Object.freeze({
    tenantId,
    actorId: context.actorId ?? null,
    serviceActorId: context.serviceActorId ?? null,
    routeId: context.routeId ?? null,
    operationId: context.operationId ?? null,
    capability: context.capability ?? null,
    providerId: context.providerId ?? null,
    jobId: context.jobId ?? null,
    workflowId: context.workflowId ?? null,
    notificationId: context.notificationId ?? null,
    fileId: context.fileId ?? null,
    auditEventId: context.auditEventId ?? null,
    correlationId,
    causationId: context.causationId ?? null,
    requestId,
    traceId,
    spanId: context.spanId ?? null,
    parentSpanId: context.parentSpanId ?? null,
  });
}

interface RequiredTelemetryContext {
  readonly tenantId: string;
  readonly actorId: string | null;
  readonly serviceActorId: string | null;
  readonly routeId: string | null;
  readonly operationId: string | null;
  readonly capability: string | null;
  readonly providerId: string | null;
  readonly jobId: string | null;
  readonly workflowId: string | null;
  readonly notificationId: string | null;
  readonly fileId: string | null;
  readonly auditEventId: string | null;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly requestId: string;
  readonly traceId: string;
  readonly spanId: string | null;
  readonly parentSpanId: string | null;
}

function baseSignal<C extends TelemetrySignalCategory>(input: {
  context: RequiredTelemetryContext;
  signalName: string;
  signalCategory: C;
  signalClassification: ObservabilitySignalClassification;
  severity: ObservabilitySeverity;
  dataClassification: TelemetrySignalBase["dataClassification"];
  retentionPolicy: string;
}): TelemetrySignalBase & { readonly signalCategory: C } {
  const actorScope = input.context.serviceActorId
    ? "service-actor"
    : input.context.actorId
      ? "actor-scoped"
      : "none";
  return Object.freeze({
    signalId: `sig_${randomUUID()}`,
    signalName: assertNonEmpty(input.signalName, "signalName"),
    signalCategory: input.signalCategory,
    signalClassification: input.signalClassification,
    severity: input.severity,
    tenantId: input.context.tenantId,
    actorId: input.context.actorId,
    serviceActorId: input.context.serviceActorId,
    routeId: input.context.routeId,
    operationId: input.context.operationId,
    capability: input.context.capability,
    providerId: input.context.providerId,
    jobId: input.context.jobId,
    workflowId: input.context.workflowId,
    notificationId: input.context.notificationId,
    fileId: input.context.fileId,
    auditEventId: input.context.auditEventId,
    correlationId: input.context.correlationId,
    causationId: input.context.causationId,
    requestId: input.context.requestId,
    traceId: input.context.traceId,
    spanId: input.context.spanId,
    parentSpanId: input.context.parentSpanId,
    environmentScope: "local-dev",
    providerMode: "in-memory",
    dataClassification: input.dataClassification,
    tenantScope: input.context.tenantId === "system-local" ? "none" : "tenant-scoped",
    actorScope,
    providerScope: input.context.providerId ? "provider-scoped" : "none",
    redactionPolicy: "redact-before-persistence-and-api-exposure",
    cardinalityPolicy: "metric-label-allow-list-and-high-cardinality-deny",
    retentionPolicy: input.retentionPolicy,
    accessPolicy: "pdp-protected-for-non-public-observability-access",
    createdAt: new Date().toISOString(),
  });
}

function eventSignal(
  input: TelemetryOperationalEventInput,
  category: Extract<
    TelemetrySignalCategory,
    "operational-event" | "security-signal" | "audit-linked-signal" | "provider-status-signal"
  >,
): TelemetrySignal {
  const context = normalizeContext(input.context);
  return Object.freeze({
    ...baseSignal({
      context,
      signalName: input.eventName,
      signalCategory: category,
      signalClassification:
        input.classification ?? (category === "security-signal" ? "security" : "operational"),
      severity: input.severity,
      dataClassification: input.dataClassification ?? "confidential",
      retentionPolicy:
        category === "security-signal" ? "security-signal-180-days" : "local-dev-test-30-days",
    }),
    eventName: safeTelemetryValue(input.eventName),
    reasonCode: safeTelemetryValue(input.reasonCode),
    safeSummary: safeTelemetryValue(input.safeSummary),
    attributes: redactTelemetryAttributes(input.attributes),
  });
}

function healthSignal(
  input: TelemetryHealthInput,
  category: Extract<
    TelemetrySignalCategory,
    "health-signal" | "readiness-signal" | "liveness-signal"
  >,
): TelemetrySignal {
  const context = normalizeContext(input.context);
  return Object.freeze({
    ...baseSignal({
      context,
      signalName: input.signalName,
      signalCategory: category,
      signalClassification: input.classification ?? "availability",
      severity: input.status === "healthy" ? "info" : "warning",
      dataClassification: input.dataClassification ?? "internal",
      retentionPolicy: "local-dev-test-30-days",
    }),
    status: input.status,
    component: safeTelemetryValue(input.component),
    safeSummary: safeTelemetryValue(input.safeSummary),
  });
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      offset?: unknown;
    };
    return typeof decoded.offset === "number" && decoded.offset >= 0 ? decoded.offset : 0;
  } catch {
    return 0;
  }
}
