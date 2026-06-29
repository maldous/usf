import { randomUUID } from "node:crypto";
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
      reasonCode: "legacy-observability-record",
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
