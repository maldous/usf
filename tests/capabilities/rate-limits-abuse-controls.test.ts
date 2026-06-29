import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import {
  GuardrailValidationError,
  validateGuardrailPolicy,
  type GuardrailPolicy,
} from "@foundation/core";
import { describe, expect, it } from "vitest";

const now = Date.parse("2026-01-01T00:00:00.000Z");

function policy(overrides: Partial<GuardrailPolicy> = {}): GuardrailPolicy {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return {
    policyId: "guardrail.test.rate",
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
    limit: 2,
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
    changeReason: "local dev and test guardrail",
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
  };
}

function evaluate(store: InMemoryGuardrailStore, overrides: Record<string, unknown> = {}) {
  return store.evaluate({
    policyId: "guardrail.test.rate",
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    actorId: "actor-alpha",
    routeId: "jobs.create",
    operationId: "postJobCreateV1",
    resourceType: "job",
    nowMs: now,
    ...overrides,
  });
}

describe("rate limits, quotas, and abuse controls", () => {
  it("allows within the window and denies over the limit with a safe retry-after", () => {
    const store = new InMemoryGuardrailStore();
    store.upsertPolicy(policy({ limit: 1 }));

    expect(evaluate(store)).toMatchObject({
      decision: "allow",
      reasonCode: "within-limit",
      httpStatus: 200,
    });
    const denied = evaluate(store);
    expect(denied).toMatchObject({
      decision: "deny",
      reasonCode: "rate-limit-exceeded",
      httpStatus: 429,
      retryAfter: "60",
      safeMessage: "Rate limit exceeded",
    });
    expect(denied.subjectRef).toMatch(/^subj_/);
    expect(denied.subjectRef).not.toContain("actor-alpha");
  });

  it("fails closed for unknown policies, unknown scopes, and sensitive policy config", () => {
    const store = new InMemoryGuardrailStore();
    const unknown = store.evaluate({
      policyId: "missing-policy",
      tenantId: "tenant-alpha",
      subjectRef: "actor-alpha",
      nowMs: now,
    });
    expect(unknown).toMatchObject({
      decision: "deny",
      reasonCode: "policy-unknown-denied",
      httpStatus: 403,
      retryAfter: null,
    });

    expect(() =>
      store.upsertPolicy(policy({ scope: "unknown-scope" as GuardrailPolicy["scope"] })),
    ).toThrow(GuardrailValidationError);
    expect(() =>
      validateGuardrailPolicy(policy({ changeReason: "contains api_key fixture" })),
    ).toThrow(GuardrailValidationError);
  });

  it("keeps tenant quota accounting isolated and non-enumerating", () => {
    const store = new InMemoryGuardrailStore();
    store.upsertPolicy(
      policy({
        policyId: "tenant.quota",
        policyType: "quota",
        classification: "tenant-fairness",
        scope: "tenant",
        scopeRef: "tenant.storage",
        routeId: null,
        operationId: "tenantQuota",
        resourceType: "storage",
        limit: 1,
        denialPolicy: "quota-conflict",
      }),
    );

    const alpha = store.evaluate({
      policyId: "tenant.quota",
      tenantId: "tenant-alpha",
      subjectRef: "actor-alpha",
      nowMs: now,
    });
    const beta = store.evaluate({
      policyId: "tenant.quota",
      tenantId: "tenant-beta",
      subjectRef: "actor-beta",
      nowMs: now,
    });
    const alphaDenied = store.evaluate({
      policyId: "tenant.quota",
      tenantId: "tenant-alpha",
      subjectRef: "actor-other",
      nowMs: now,
    });

    expect(alpha.decision).toBe("allow");
    expect(beta.decision).toBe("allow");
    expect(alphaDenied).toMatchObject({ decision: "deny", httpStatus: 409 });
    expect(store.usage({ tenantId: "tenant-alpha" })).toHaveLength(1);
    expect(store.usage({ tenantId: "tenant-alpha" })[0]?.tenantId).toBe("tenant-alpha");
    expect(JSON.stringify(store.usage({ tenantId: "tenant-alpha" }))).not.toContain("tenant-beta");
  });

  it("does not double count idempotent replays and detects conflicting replays", () => {
    const store = new InMemoryGuardrailStore();
    store.upsertPolicy(policy({ limit: 1 }));
    const first = evaluate(store, {
      idempotencyKey: "idem-alpha",
      requestFingerprint: "fingerprint-a",
    });
    const replay = evaluate(store, {
      idempotencyKey: "idem-alpha",
      requestFingerprint: "fingerprint-a",
    });
    const conflict = evaluate(store, {
      idempotencyKey: "idem-alpha",
      requestFingerprint: "fingerprint-b",
    });

    expect(first.decision).toBe("allow");
    expect(replay).toEqual(first);
    expect(
      store.usage({ policyId: "guardrail.test.rate", tenantId: "tenant-alpha" })[0]?.used,
    ).toBe(1);
    expect(conflict).toMatchObject({
      decision: "deny",
      reasonCode: "idempotency-conflict",
      httpStatus: 409,
      retryAfter: null,
    });
  });

  it("represents security, bulk, provider backpressure, and distributed enforcement posture without live claims", () => {
    const store = new InMemoryGuardrailStore();
    store.upsertPolicy(
      policy({
        policyId: "security.identity.action",
        policyType: "abuse-detection",
        classification: "security-protection",
        scope: "identity-action",
        scopeRef: "tenant-switch",
        operationId: "switchTenant",
        resourceType: "identity-action",
        limit: 0,
        denialPolicy: "policy-denied",
      }),
    );
    store.upsertPolicy(
      policy({
        policyId: "bulk.notification.quota",
        policyType: "quota",
        classification: "bulk-operation-protection",
        scope: "notification",
        scopeRef: "bulk-send",
        operationId: "bulkNotificationSend",
        resourceType: "notification",
        limit: 10,
        denialPolicy: "quota-conflict",
      }),
    );
    store.upsertPolicy(
      policy({
        policyId: "provider.call.backpressure",
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

    const securityDenied = store.evaluate({
      policyId: "security.identity.action",
      tenantId: "tenant-alpha",
      subjectRef: "actor-alpha",
      nowMs: now,
    });
    const backpressure = store.evaluate({
      policyId: "provider.call.backpressure",
      tenantId: "tenant-alpha",
      subjectRef: "actor-alpha",
      providerId: "notification-delivery-in-memory",
      nowMs: now,
    });

    expect(securityDenied).toMatchObject({ httpStatus: 403, reasonCode: "policy-denied" });
    expect(backpressure).toMatchObject({
      httpStatus: 503,
      reasonCode: "backpressure-applied",
      retryAfter: "60",
    });
    expect(store.getPolicy("bulk.notification.quota")).toMatchObject({
      classification: "bulk-operation-protection",
      policyType: "quota",
    });
    expect(store.safeStatusView()).toMatchObject({
      distributedEnforcement: "single-node-in-memory",
      liveWafReadinessClaim: false,
      liveEdgeReadinessClaim: false,
      productionReadinessClaim: false,
    });
  });
});
