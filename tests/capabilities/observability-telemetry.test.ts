import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import { TelemetryValidationError, findProvider } from "@foundation/core";
import { describe, expect, it } from "vitest";

const context = {
  tenantId: "tenant-alpha",
  actorId: "actor-alpha",
  routeId: "tenant-context.get",
  operationId: "getTenantContext",
  capability: "tenant-context",
  requestId: "req-alpha",
  correlationId: "corr-alpha",
  traceId: "trace-alpha",
};

function expectTelemetryDenied(fn: () => void, reasonCode: string) {
  expect(fn).toThrow(TelemetryValidationError);
  try {
    fn();
  } catch (error) {
    expect((error as TelemetryValidationError).reasonCode).toBe(reasonCode);
  }
}

describe("observability telemetry", () => {
  it("records metric labels only when they are allow-listed", () => {
    const collector = new InMemoryTelemetryCollector();
    collector.recordMetric({
      metricName: "api.request.count",
      metricType: "counter",
      value: 1,
      unit: "request",
      description: "Synthetic local dev/test request count",
      owner: "platform-observability",
      labels: {
        route_id: "tenant-context.get",
        operation_id: "getTenantContext",
        capability: "tenant-context",
        status_code: "200",
      },
      context,
    });

    expect(collector.query({ tenantId: "tenant-alpha" }).signals[0]).toMatchObject({
      signalCategory: "metric",
      signalClassification: "performance",
      correlationId: "corr-alpha",
      requestId: "req-alpha",
      traceId: "trace-alpha",
    });
  });

  it("rejects high-cardinality labels and secret-looking metric label values", () => {
    const collector = new InMemoryTelemetryCollector();
    expectTelemetryDenied(
      () =>
        collector.recordMetric({
          metricName: "api.request.count",
          metricType: "counter",
          value: 1,
          unit: "request",
          description: "Synthetic local dev/test request count",
          owner: "platform-observability",
          labels: { email: "actor-alpha" },
          context,
        }),
      "metric-label-not-allow-listed",
    );
    expectTelemetryDenied(
      () =>
        collector.recordMetric({
          metricName: "api.request.count",
          metricType: "counter",
          value: 1,
          unit: "request",
          description: "Synthetic local dev/test request count",
          owner: "platform-observability",
          labels: { reason_code: "Bearer synthetic-token-value" },
          context,
        }),
      "metric-label-sensitive",
    );
  });

  it("redacts span attributes and structured log secret-looking values before persistence", () => {
    const collector = new InMemoryTelemetryCollector();
    collector.recordTraceSpan({
      spanName: "provider.call",
      spanKind: "client",
      startTime: "2026-01-01T00:00:00.000Z",
      endTime: "2026-01-01T00:00:00.010Z",
      durationMs: 10,
      status: "error",
      safeAttributes: {
        token: "Bearer synthetic-token-value",
        object_key: "tenant-alpha/object/synthetic-sensitive-key",
        provider_response: "raw payload hidden",
      },
      context,
    });
    collector.recordStructuredLog({
      eventName: "api.error",
      severity: "error",
      messageTemplate: "api request failed with safe reason",
      safeMessage: "api request failed",
      reasonCode: "synthetic-error",
      attributes: {
        cookie: "session=synthetic",
        recipient_address: "recipient@sample.invalid",
        stack_trace: "stack trace hidden",
      },
      context,
    });

    const text = JSON.stringify(collector.query({ tenantId: "tenant-alpha" })).toLowerCase();
    expect(text).toContain("[redacted-secret]");
    expect(text).not.toContain("bearer synthetic-token-value");
    expect(text).not.toContain("recipient@sample.invalid");
    expect(text).not.toContain("tenant-alpha/object/synthetic-sensitive-key");
    expect(text).not.toContain("stack trace hidden");
    expect(text).not.toContain("provider_response");
  });

  it("proves tenant A cannot query tenant B telemetry", () => {
    const collector = new InMemoryTelemetryCollector();
    collector.recordOperationalEvent({
      eventName: "tenant.context.accepted",
      severity: "info",
      reasonCode: "ok",
      safeSummary: "tenant context accepted",
      context,
    });
    collector.recordOperationalEvent({
      eventName: "tenant.context.accepted",
      severity: "info",
      reasonCode: "ok",
      safeSummary: "tenant context accepted",
      context: { ...context, tenantId: "tenant-beta", requestId: "req-beta" },
    });

    expect(collector.query({ tenantId: "tenant-alpha" }).signals).toHaveLength(1);
    expect(collector.query({ tenantId: "tenant-alpha" }).signals[0]?.tenantId).toBe("tenant-alpha");
  });

  it("keeps health and readiness are distinct and respects deferred provider mode posture", () => {
    const collector = new InMemoryTelemetryCollector();
    collector.recordHealthSignal({
      signalName: "observability.health",
      status: "healthy",
      component: "telemetry-collector",
      safeSummary: "collector can answer locally",
      context,
    });
    collector.recordReadinessSignal({
      signalName: "observability.readiness",
      status: "healthy",
      component: "telemetry-collector",
      safeSummary: "collector is safe for local dev/test",
      context,
    });

    const categories = collector
      .query({ tenantId: "tenant-alpha" })
      .signals.map((signal) => signal.signalCategory);
    expect(categories).toContain("health-signal");
    expect(categories).toContain("readiness-signal");
    expect(collector.safeStatusView()).toMatchObject({
      liveMonitoringReadinessClaim: false,
      liveMetricsBackendClaim: false,
      liveLogBackendClaim: false,
      liveTracingBackendClaim: false,
      liveAlertingClaim: false,
      siemReadinessClaim: false,
    });
    expect(findProvider("observability-compose-stack")).toMatchObject({
      providerMode: "composed-test",
      readinessStatus: "deferred",
      liveReadinessClaim: false,
      productionReadinessClaim: false,
    });
  });

  it("emits a security signal for denied authorization posture", () => {
    const collector = new InMemoryTelemetryCollector();
    collector.recordSecuritySignal({
      eventName: "authorization.denied",
      severity: "security",
      reasonCode: "pdp-denied",
      safeSummary: "authorization denied",
      context,
    });

    expect(collector.query({ tenantId: "tenant-alpha" }).signals[0]).toMatchObject({
      signalCategory: "security-signal",
      signalClassification: "security",
      reasonCode: "pdp-denied",
    });
  });
});
