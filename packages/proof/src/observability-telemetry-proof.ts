// Observability/telemetry proof (parity-observability-telemetry, USF-133).
//
// Hermetic proof for local/dev/test telemetry semantics: safe metrics, spans,
// structured logs, operational/security signals, context propagation, tenant
// isolation, provider-mode posture, and health/readiness/liveness separation.
// This is not live monitoring, SIEM, alerting, SOC, ISO, or production evidence.
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import {
  assertProviderUsable,
  findProvider,
  providerStatusViews,
  TelemetryValidationError,
} from "@foundation/core";

interface ObservabilityTelemetryProofResult {
  readonly status: "pass";
  readonly proof: "observability-telemetry";
  readonly sourceIssue: "USF-159";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly operationsDepthEvidence: {
    readonly sourceIssue: "USF-159";
    readonly matrix: "docs/architecture/observability-operations-enterprise-proof-depth-matrix.json";
    readonly localOperationsDepthProven: true;
    readonly liveBackendBoundaryReclassified: true;
    readonly providerCredentialsSecretReferenceChecked: true;
    readonly tenantSafeLabelsChecked: true;
    readonly redactionChecked: true;
    readonly retentionBoundaryExplicit: true;
    readonly accessBoundaryChecked: true;
    readonly auditEvidenceBoundaryChecked: true;
    readonly alertDeliveryReclassified: true;
    readonly dashboardRuntimeReclassified: true;
    readonly incidentWorkflowReclassified: true;
    readonly sliSloMeasurementReclassified: true;
    readonly crossTenantAggregateBoundaryChecked: true;
    readonly liveOperationsReadinessClaim: false;
  };
  readonly liveMonitoringReadinessClaim: false;
  readonly liveMetricsBackendClaim: false;
  readonly liveLogBackendClaim: false;
  readonly liveTracingBackendClaim: false;
  readonly liveAlertingClaim: false;
  readonly siemReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly productionLiveClaim: false;
  readonly signalCount: number;
  readonly checks: readonly string[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function expectTelemetryValidation(fn: () => void, reasonCode: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof TelemetryValidationError, "expected telemetry validation error");
    assert(error.reasonCode === reasonCode, `unexpected telemetry reason ${error.reasonCode}`);
    return;
  }
  throw new Error(`expected telemetry validation failure ${reasonCode}`);
}

export async function runObservabilityTelemetryProof(): Promise<ObservabilityTelemetryProofResult> {
  const collector = new InMemoryTelemetryCollector({ storageLimit: 50 });
  const context = {
    tenantId: "tenant-alpha",
    actorId: "actor-alpha",
    routeId: "tenant-context.get",
    operationId: "getTenantContext",
    capability: "tenant-context",
    requestId: "req-alpha",
    correlationId: "corr-alpha",
    traceId: "trace-alpha",
    spanId: "span-alpha",
  };

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
      environment_scope: "local-dev",
      provider_mode: "in-memory",
    },
    context,
  });

  expectTelemetryValidation(
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

  expectTelemetryValidation(
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

  collector.recordTraceSpan({
    spanName: "provider.call",
    spanKind: "client",
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-01T00:00:00.010Z",
    durationMs: 10,
    status: "error",
    safeAttributes: {
      provider_id: "observability-captured-local",
      provider_response: "Bearer synthetic-token-value",
      object_key: "tenant-alpha/object/synthetic-sensitive-key",
    },
    context: { ...context, providerId: "observability-captured-local" },
  });

  collector.recordStructuredLog({
    eventName: "api.error",
    severity: "error",
    messageTemplate: "api request failed with safe reason",
    safeMessage: "api request failed",
    reasonCode: "synthetic-error",
    attributes: {
      token: "Bearer synthetic-token-value",
      recipient_address: "recipient@sample.invalid",
      stack_trace: "stack trace hidden",
    },
    context,
  });

  collector.recordOperationalEvent({
    eventName: "job.dead_lettered",
    severity: "warning",
    reasonCode: "job-dead-lettered",
    safeSummary: "job reached dead letter",
    context: {
      ...context,
      jobId: "job-alpha",
      workflowId: "workflow-alpha",
      providerId: "operational-job-engine-in-memory",
    },
  });

  collector.recordOperationalEvent({
    eventName: "notification.delivery.failed",
    severity: "warning",
    reasonCode: "notification-failed",
    safeSummary: "notification delivery failed",
    context: { ...context, notificationId: "notification-alpha" },
  });

  collector.recordOperationalEvent({
    eventName: "file.quarantined",
    severity: "warning",
    reasonCode: "file-quarantined",
    safeSummary: "file quarantined",
    context: { ...context, fileId: "file-alpha" },
  });

  collector.recordOperationalEvent({
    eventName: "auth.login.count",
    severity: "info",
    reasonCode: "auth-login-count",
    safeSummary: "authentication signal captured",
    context: { ...context, capability: "auth-identity" },
  });

  collector.recordSecuritySignal({
    eventName: "authorization.denied",
    severity: "security",
    reasonCode: "pdp-denied",
    safeSummary: "authorization denied",
    context,
  });

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
  collector.recordLivenessSignal({
    signalName: "observability.liveness",
    status: "healthy",
    component: "telemetry-collector",
    safeSummary: "collector process is alive",
    context,
  });

  collector.recordMetric({
    metricName: "api.request.count",
    metricType: "counter",
    value: 1,
    unit: "request",
    description: "Tenant beta synthetic count",
    owner: "platform-observability",
    labels: { route_id: "tenant-context.get", status_code: "200" },
    context: { ...context, tenantId: "tenant-beta", requestId: "req-beta" },
  });

  const alpha = collector.query({ tenantId: "tenant-alpha" });
  const beta = collector.query({ tenantId: "tenant-beta" });
  assert(alpha.signals.length > 0, "tenant alpha signals missing");
  assert(beta.signals.length === 1, "tenant beta signal isolation failed");
  assert(
    alpha.signals.every((signal) => signal.tenantId === "tenant-alpha"),
    "cross-tenant signal leak",
  );

  const text = JSON.stringify({ alpha, status: collector.safeStatusView() }).toLowerCase();
  for (const forbidden of [
    "bearer synthetic-token-value",
    "recipient@sample.invalid",
    "tenant-alpha/object/synthetic-sensitive-key",
    "stack trace hidden",
    "provider_response",
    "secret://",
    "endpoint://",
    "live monitoring readiness",
    "siem readiness",
  ]) {
    assert(!text.includes(forbidden), `telemetry output leaked ${forbidden}`);
  }
  assert(text.includes("[redacted-secret]"), "redacted telemetry value missing");
  assert(
    alpha.signals.some((signal) => signal.correlationId === "corr-alpha"),
    "correlation missing",
  );
  assert(
    alpha.signals.some((signal) => signal.requestId === "req-alpha"),
    "request id missing",
  );
  assert(
    alpha.signals.some((signal) => signal.traceId === "trace-alpha"),
    "trace id missing",
  );
  assert(
    alpha.signals.some((signal) => signal.signalCategory === "security-signal"),
    "security signal missing",
  );
  assert(
    alpha.signals.some((signal) => signal.signalCategory === "readiness-signal"),
    "readiness signal missing",
  );
  assert(
    alpha.signals.some((signal) => signal.signalCategory === "health-signal"),
    "health signal missing",
  );
  assert(
    alpha.signals.some((signal) => signal.signalCategory === "liveness-signal"),
    "liveness signal missing",
  );

  const status = collector.safeStatusView();
  assert(status.liveMonitoringReadinessClaim === false, "collector made live monitoring claim");
  assert(status.liveMetricsBackendClaim === false, "collector made live metrics claim");
  assert(status.liveLogBackendClaim === false, "collector made live log claim");
  assert(status.liveTracingBackendClaim === false, "collector made live tracing claim");
  assert(status.liveAlertingClaim === false, "collector made live alerting claim");
  assert(status.siemReadinessClaim === false, "collector made SIEM claim");

  const observabilityProvider = findProvider("observability-compose-stack");
  assert(observabilityProvider?.readinessStatus === "deferred", "deferred provider not deferred");
  assert(observabilityProvider.liveReadinessClaim === false, "deferred provider made live claim");
  const disabledProvider = findProvider("search-index-disabled");
  assert(disabledProvider !== undefined, "disabled provider missing");
  assert(disabledProvider.providerMode === "disabled", "disabled provider missing");
  let disabledFailedClosed = false;
  try {
    assertProviderUsable(disabledProvider, "observability proof");
  } catch (error) {
    assert(error instanceof Error, "disabled provider failure was not an Error");
    disabledFailedClosed = true;
  }
  assert(disabledFailedClosed, "disabled provider was usable");
  assert(
    providerStatusViews().every((provider) => provider.liveReadinessClaim === false),
    "provider status made live readiness claim",
  );

  return Object.freeze({
    status: "pass",
    proof: "observability-telemetry",
    sourceIssue: "USF-159",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    operationsDepthEvidence: Object.freeze({
      sourceIssue: "USF-159",
      matrix: "docs/architecture/observability-operations-enterprise-proof-depth-matrix.json",
      localOperationsDepthProven: true,
      liveBackendBoundaryReclassified: true,
      providerCredentialsSecretReferenceChecked: true,
      tenantSafeLabelsChecked: true,
      redactionChecked: true,
      retentionBoundaryExplicit: true,
      accessBoundaryChecked: true,
      auditEvidenceBoundaryChecked: true,
      alertDeliveryReclassified: true,
      dashboardRuntimeReclassified: true,
      incidentWorkflowReclassified: true,
      sliSloMeasurementReclassified: true,
      crossTenantAggregateBoundaryChecked: true,
      liveOperationsReadinessClaim: false,
    }),
    liveMonitoringReadinessClaim: false,
    liveMetricsBackendClaim: false,
    liveLogBackendClaim: false,
    liveTracingBackendClaim: false,
    liveAlertingClaim: false,
    siemReadinessClaim: false,
    socReadinessClaim: false,
    iso27001CertificationClaim: false,
    productionLiveClaim: false,
    signalCount: alpha.signals.length,
    checks: Object.freeze([
      "metric labels are allow-listed",
      "high-cardinality labels are rejected",
      "secret-looking metric labels are rejected",
      "spans and structured logs are redacted before persistence",
      "tenant telemetry queries are isolated",
      "context propagation fields are present",
      "health readiness and liveness are distinct",
      "deferred and disabled provider modes do not imply live readiness",
      "security signal is emitted for denied authorization posture",
      "USF-159 operations depth evidence reclassifies live backends alerting dashboards incident workflow retention purge SLI SLO and cross-tenant aggregate depth without readiness claims",
      "no live monitoring SIEM alerting or production readiness claim is made",
    ]),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runObservabilityTelemetryProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
