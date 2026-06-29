// Rate limits / quotas / abuse controls proof (parity-rate-limits-abuse, USF-160).
//
// Hermetic proof for local/dev/test guardrails: fixed-window rate limits,
// tenant-isolated quotas, fail-closed policy validation, idempotent accounting,
// safe denial evidence, observability signals, and no live WAF/edge/gateway,
// bot, fraud, abuse-provider, SOC, ISO, or production readiness claim.
import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import {
  GuardrailValidationError,
  createAuditEventDraft,
  type GuardrailPolicy,
} from "@foundation/core";

interface RateLimitsAbuseControlsProofResult {
  readonly status: "pass";
  readonly proof: "rate-limits-abuse-controls";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly enforcementPosture: "single-node-in-memory-local-dev-test";
  readonly liveWafReadinessClaim: false;
  readonly liveEdgeReadinessClaim: false;
  readonly liveGatewayReadinessClaim: false;
  readonly liveAbuseProviderReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly productionLiveClaim: false;
  readonly policyCount: number;
  readonly signalCount: number;
  readonly checks: readonly string[];
}

const NOW = Date.parse("2026-01-01T00:00:00.000Z");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function policy(overrides: Partial<GuardrailPolicy> = {}): GuardrailPolicy {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return Object.freeze({
    policyId: "proof.api.jobs.create",
    policyType: "rate-limit",
    classification: "availability-protection",
    scope: "route",
    scopeRef: "jobs.create",
    tenantId: null,
    actorId: null,
    serviceActorId: null,
    routeId: "jobs.create",
    operationId: "postJobCreateV1",
    resourceType: "job",
    providerId: null,
    limit: 1,
    windowSeconds: 60,
    burstLimit: null,
    lifecycle: "active",
    policyOwner: "platform",
    owningCapability: "jobs-workflows",
    riskLevel: "medium",
    createdBy: "system",
    approvedBy: "system",
    lastReviewedAt: null,
    reviewExpiresAt: null,
    changeReason: "local dev and test guardrail proof",
    retryAfterPolicy: "safe-window-reset",
    denialPolicy: "rate-limit-exceeded",
    telemetryPolicy: "tenant-safe guardrail signal",
    auditPolicy: "value-free guardrail evidence",
    environmentScope: "local-dev",
    dataClassification: "security-sensitive",
    distributedEnforcement: "single-node-in-memory",
    liveWafReadinessClaim: false,
    liveEdgeReadinessClaim: false,
    productionReadinessClaim: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  });
}

function expectGuardrailValidation(fn: () => void, reasonCode: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof GuardrailValidationError, "expected guardrail validation error");
    assert(error.reasonCode === reasonCode, `unexpected guardrail reason ${error.reasonCode}`);
    return;
  }
  throw new Error(`expected guardrail validation failure ${reasonCode}`);
}

export async function runRateLimitsAbuseControlsProof(): Promise<RateLimitsAbuseControlsProofResult> {
  const store = new InMemoryGuardrailStore();
  const collector = new InMemoryTelemetryCollector();
  store.upsertPolicy(policy());

  const first = store.evaluate({
    policyId: "proof.api.jobs.create",
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    actorId: "actor-alpha",
    routeId: "jobs.create",
    operationId: "postJobCreateV1",
    resourceType: "job",
    idempotencyKey: "idem-proof-a",
    requestFingerprint: "fingerprint-a",
    nowMs: NOW,
  });
  const replay = store.evaluate({
    policyId: "proof.api.jobs.create",
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    actorId: "actor-alpha",
    routeId: "jobs.create",
    operationId: "postJobCreateV1",
    resourceType: "job",
    idempotencyKey: "idem-proof-a",
    requestFingerprint: "fingerprint-a",
    nowMs: NOW,
  });
  const usageAfterReplay = store.usage({
    policyId: "proof.api.jobs.create",
    tenantId: "tenant-alpha",
  });
  const denied = store.evaluate({
    policyId: "proof.api.jobs.create",
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    actorId: "actor-alpha",
    routeId: "jobs.create",
    operationId: "postJobCreateV1",
    resourceType: "job",
    idempotencyKey: "idem-proof-b",
    requestFingerprint: "fingerprint-b",
    nowMs: NOW,
  });
  assert(first.decision === "allow", "first request was not allowed");
  assert(replay.decisionId === first.decisionId, "idempotent replay was not deterministic");
  assert(usageAfterReplay[0]?.used === 1, "idempotent replay double-counted usage");
  assert(denied.httpStatus === 429, "rate limit denial did not use 429");
  assert(denied.retryAfter === "60", "safe retry-after was not calculated");

  const unknown = store.evaluate({
    policyId: "unknown-policy",
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    nowMs: NOW,
  });
  assert(unknown.reasonCode === "policy-unknown-denied", "unknown policy did not fail closed");
  assert(unknown.httpStatus === 403, "unknown policy was retryable");

  expectGuardrailValidation(
    () => store.upsertPolicy(policy({ scope: "unknown" as GuardrailPolicy["scope"] })),
    "unknown-policy-scope",
  );
  expectGuardrailValidation(
    () => store.upsertPolicy(policy({ changeReason: "contains bearer token fixture" })),
    "policy-config-sensitive-value",
  );

  store.upsertPolicy(
    policy({
      policyId: "proof.tenant.quota",
      policyType: "quota",
      classification: "tenant-fairness",
      scope: "tenant",
      scopeRef: "tenant-quota",
      limit: 1,
      routeId: null,
      operationId: "tenantQuota",
      resourceType: "quota",
      denialPolicy: "quota-conflict",
    }),
  );
  const quotaAlpha = store.evaluate({
    policyId: "proof.tenant.quota",
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    nowMs: NOW,
  });
  const quotaBeta = store.evaluate({
    policyId: "proof.tenant.quota",
    tenantId: "tenant-beta",
    subjectRef: "actor-beta",
    nowMs: NOW,
  });
  const quotaAlphaDenied = store.evaluate({
    policyId: "proof.tenant.quota",
    tenantId: "tenant-alpha",
    subjectRef: "actor-other",
    nowMs: NOW,
  });
  assert(quotaAlpha.decision === "allow", "tenant alpha quota first use denied");
  assert(quotaBeta.decision === "allow", "tenant beta quota first use denied");
  assert(quotaAlphaDenied.httpStatus === 409, "tenant quota denial did not use 409");
  assert(
    !JSON.stringify(store.usage({ tenantId: "tenant-alpha" })).includes("tenant-beta"),
    "quota usage leaked another tenant",
  );

  store.upsertPolicy(
    policy({
      policyId: "proof.provider.backpressure",
      policyType: "backpressure",
      classification: "provider-protection",
      scope: "provider",
      scopeRef: "notification-delivery-in-memory",
      providerId: "notification-delivery-in-memory",
      operationId: "providerCall",
      resourceType: "provider",
      limit: 0,
      denialPolicy: "backpressure-applied",
      distributedEnforcement: "distributed-deferred",
    }),
  );
  const backpressure = store.evaluate({
    policyId: "proof.provider.backpressure",
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    providerId: "notification-delivery-in-memory",
    nowMs: NOW,
  });
  assert(backpressure.httpStatus === 503, "backpressure did not use 503");

  collector.recordSecuritySignal({
    eventName: "rate_limit.exceeded",
    severity: "security",
    reasonCode: denied.reasonCode,
    safeSummary: denied.safeMessage,
    attributes: {
      policy_id: denied.policyId,
      policy_type: denied.policyType,
      route_id: denied.routeId ?? "unknown",
    },
    context: {
      tenantId: denied.tenantId,
      actorId: "actor-alpha",
      routeId: denied.routeId ?? "unknown",
      operationId: denied.operationId ?? "unknown",
      capability: "guardrails",
      requestId: "req-proof",
      correlationId: "corr-proof",
      traceId: "trace-proof",
    },
  });

  const audit = createAuditEventDraft({
    eventId: "guardrail-proof-audit",
    eventType: "guardrail.limit.exceeded",
    tenantId: denied.tenantId,
    actorId: "actor-alpha",
    action: "guardrail.policy.evaluated",
    outcome: "denied",
    subjectType: "actor",
    subjectId: denied.subjectRef,
    resourceType: "guardrail-policy",
    resourceId: denied.policyId,
    reasonCode: denied.reasonCode,
    safeMessage: denied.safeMessage,
    decisionId: denied.decisionId,
    correlationId: "corr-proof",
    requestId: "req-proof",
    traceId: "trace-proof",
    metadata: {
      token: "Bearer synthetic-proof-token",
      object_key: "tenant-alpha/object/proof-key",
      provider_response: "raw provider payload",
      retry_after: denied.retryAfter ?? "none",
    },
  });

  const output = JSON.stringify({
    denied,
    unknown,
    quotaAlphaDenied,
    backpressure,
    telemetry: collector.query({ tenantId: "tenant-alpha" }),
    audit,
    status: store.safeStatusView(),
  }).toLowerCase();
  for (const forbidden of [
    "bearer synthetic-proof-token",
    "tenant-alpha/object/proof-key",
    "raw provider payload",
    "recipient@",
    "secret://",
    "live waf readiness",
    "live edge readiness",
    "live gateway readiness",
  ]) {
    assert(!output.includes(forbidden), `guardrail proof leaked or overclaimed ${forbidden}`);
  }
  assert(output.includes("[redacted]"), "redacted guardrail audit value missing");
  assert(store.safeStatusView().liveWafReadinessClaim === false, "store made live WAF claim");
  assert(store.safeStatusView().liveEdgeReadinessClaim === false, "store made live edge claim");
  assert(
    store.safeStatusView().productionReadinessClaim === false,
    "store made production readiness claim",
  );

  return Object.freeze({
    status: "pass",
    proof: "rate-limits-abuse-controls",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    enforcementPosture: "single-node-in-memory-local-dev-test",
    liveWafReadinessClaim: false,
    liveEdgeReadinessClaim: false,
    liveGatewayReadinessClaim: false,
    liveAbuseProviderReadinessClaim: false,
    socReadinessClaim: false,
    iso27001CertificationClaim: false,
    productionLiveClaim: false,
    policyCount: store.safeStatusView().policyCount,
    signalCount: collector.query({ tenantId: "tenant-alpha" }).signals.length,
    checks: Object.freeze([
      "rate limit allows within window and denies over limit",
      "retry-after is calculated only for safe retryable denials",
      "unknown policy and unknown scope fail closed",
      "secret-looking policy config is rejected",
      "tenant quotas are isolated and non-enumerating",
      "idempotent replay does not double-count usage",
      "provider backpressure is represented without live enforcement claims",
      "guardrail telemetry is tenant-safe",
      "guardrail audit evidence is value-free and redacted",
      "in-memory enforcement does not claim distributed or production readiness",
    ]),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRateLimitsAbuseControlsProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
