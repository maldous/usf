import type { GuardrailPort } from "@foundation/ports";
import {
  GuardrailValidationError,
  createGuardrailDecision,
  opaqueHash,
  safeTelemetryValue,
  stableId,
  validateGuardrailPolicy,
  type GuardrailDecision,
  type GuardrailEvaluationInput,
  type GuardrailPolicy,
  type GuardrailPolicyUsage,
} from "@foundation/core";

const DEFAULT_NOW = Date.parse("2026-01-01T00:00:00.000Z");

interface UsageState {
  readonly policyId: string;
  readonly tenantId: string;
  readonly subjectRefHash: string;
  readonly scopeKey: string;
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  used: number;
}

interface IdempotencyState {
  readonly fingerprint: string | null;
  readonly decision: GuardrailDecision;
}

export class InMemoryGuardrailStore implements GuardrailPort {
  readonly #policies = new Map<string, GuardrailPolicy>();
  readonly #usage = new Map<string, UsageState>();
  readonly #idempotency = new Map<string, IdempotencyState>();

  upsertPolicy(policy: GuardrailPolicy): GuardrailPolicy {
    const validated = validateGuardrailPolicy(policy);
    this.#policies.set(validated.policyId, validated);
    return validated;
  }

  getPolicy(policyId: string): GuardrailPolicy | undefined {
    return this.#policies.get(policyId);
  }

  listPolicies(input: { tenantId?: string | null } = {}): readonly GuardrailPolicy[] {
    const tenantId = input.tenantId ?? null;
    return Object.freeze(
      [...this.#policies.values()].filter(
        (policy) => policy.tenantId === null || policy.tenantId === tenantId,
      ),
    );
  }

  evaluate(input: GuardrailEvaluationInput): GuardrailDecision {
    const nowMs = input.nowMs ?? Date.now();
    const policy = this.#policies.get(input.policyId);
    if (!policy) {
      return createGuardrailDecision({
        policy: unknownPolicy(input.policyId),
        evaluation: input,
        decision: "deny",
        reasonCode: "policy-unknown-denied",
        used: 0,
        resetAtMs: nowMs + 60_000,
        nowMs,
      });
    }

    try {
      validateGuardrailPolicy(policy);
    } catch (error) {
      if (error instanceof GuardrailValidationError) {
        return createGuardrailDecision({
          policy: unknownPolicy(input.policyId),
          evaluation: input,
          decision: "deny",
          reasonCode:
            error.reasonCode === "unknown-policy-scope"
              ? "scope-unknown-denied"
              : "policy-unknown-denied",
          used: 0,
          resetAtMs: nowMs + 60_000,
          nowMs,
        });
      }
      throw error;
    }

    const state = this.#stateFor(policy, input, nowMs);
    const idemKey = this.#idempotencyKey(policy, input);
    if (idemKey) {
      const previous = this.#idempotency.get(idemKey);
      const fingerprint = input.requestFingerprint ?? null;
      if (previous) {
        if (previous.fingerprint === fingerprint) {
          return previous.decision;
        }
        const conflict = createGuardrailDecision({
          policy,
          evaluation: input,
          decision: "deny",
          reasonCode: "idempotency-conflict",
          used: state.used,
          resetAtMs: state.windowEndMs,
          nowMs,
        });
        this.#idempotency.set(idemKey, { fingerprint, decision: conflict });
        return conflict;
      }
    }

    const quantity = Math.max(input.quantity ?? 1, 0);
    const projected = state.used + quantity;
    const lifecycleDecision = decisionForLifecycle(policy.lifecycle);
    let decision: GuardrailDecision;
    if (lifecycleDecision) {
      decision = createGuardrailDecision({
        policy,
        evaluation: input,
        decision: lifecycleDecision.decision,
        reasonCode: lifecycleDecision.reasonCode,
        used: state.used,
        resetAtMs: state.windowEndMs,
        nowMs,
      });
    } else if (projected > policy.limit) {
      decision = createGuardrailDecision({
        policy,
        evaluation: input,
        decision: exceededDecision(policy.lifecycle),
        reasonCode: exceededReason(policy),
        used: projected,
        resetAtMs: state.windowEndMs,
        nowMs,
      });
      state.used = projected;
    } else {
      state.used = projected;
      decision = createGuardrailDecision({
        policy,
        evaluation: input,
        decision: "allow",
        reasonCode: "within-limit",
        used: state.used,
        resetAtMs: state.windowEndMs,
        nowMs,
      });
    }

    if (idemKey) {
      this.#idempotency.set(idemKey, {
        fingerprint: input.requestFingerprint ?? null,
        decision,
      });
    }
    return decision;
  }

  resetWindow(input: { policyId: string; tenantId: string; subjectRef?: string | null }): void {
    for (const [key, state] of this.#usage.entries()) {
      if (state.policyId !== input.policyId || state.tenantId !== input.tenantId) continue;
      if (input.subjectRef) {
        const expected = subjectRefHash(input.subjectRef);
        if (state.subjectRefHash !== expected) continue;
      }
      this.#usage.delete(key);
    }
  }

  usage(input: { policyId?: string; tenantId?: string } = {}): readonly GuardrailPolicyUsage[] {
    return Object.freeze(
      [...this.#usage.values()]
        .filter((state) => (input.policyId ? state.policyId === input.policyId : true))
        .filter((state) => (input.tenantId ? state.tenantId === input.tenantId : true))
        .map((state) =>
          Object.freeze({
            policyId: state.policyId,
            tenantId: state.tenantId,
            subjectRefHash: state.subjectRefHash,
            windowStart: new Date(state.windowStartMs).toISOString(),
            windowEnd: new Date(state.windowEndMs).toISOString(),
            used: state.used,
            limit: this.#policies.get(state.policyId)?.limit ?? 0,
            remaining: Math.max((this.#policies.get(state.policyId)?.limit ?? 0) - state.used, 0),
          }),
        ),
    );
  }

  safeStatusView(): ReturnType<GuardrailPort["safeStatusView"]> {
    return Object.freeze({
      providerMode: "in-memory",
      distributedEnforcement: "single-node-in-memory",
      policyCount: this.#policies.size,
      liveWafReadinessClaim: false,
      liveEdgeReadinessClaim: false,
      productionReadinessClaim: false,
    });
  }

  #stateFor(policy: GuardrailPolicy, input: GuardrailEvaluationInput, nowMs: number): UsageState {
    const subjectHash = subjectRefHash(subjectRefForScope(policy, input));
    const windowMs = Math.max(policy.windowSeconds, 1) * 1000;
    const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
    const windowEndMs = windowStartMs + windowMs;
    const key = stableId("guardrail-usage", [
      policy.policyId,
      input.tenantId,
      policy.scope,
      policy.scopeRef,
      subjectHash,
      String(windowStartMs),
    ]);
    const current = this.#usage.get(key);
    if (current) return current;
    const next: UsageState = {
      policyId: policy.policyId,
      tenantId: input.tenantId,
      subjectRefHash: subjectHash,
      scopeKey: key,
      windowStartMs,
      windowEndMs,
      used: 0,
    };
    this.#usage.set(key, next);
    return next;
  }

  #idempotencyKey(policy: GuardrailPolicy, input: GuardrailEvaluationInput): string | null {
    if (!input.idempotencyKey) return null;
    return stableId("guardrail-idempotency", [
      policy.policyId,
      input.tenantId,
      subjectRefHash(input.subjectRef),
      opaqueHash(input.idempotencyKey),
    ]);
  }
}

function unknownPolicy(policyId: string): GuardrailPolicy {
  const safePolicyId = safeTelemetryValue(policyId || "unknown-policy");
  return Object.freeze({
    policyId: stableId("unknown-guardrail-policy", [safePolicyId]),
    policyType: "admission-control",
    classification: "operational-safety",
    scope: "operation",
    scopeRef: "unknown",
    tenantId: null,
    actorId: null,
    serviceActorId: null,
    routeId: null,
    operationId: null,
    resourceType: null,
    providerId: null,
    limit: 0,
    windowSeconds: 60,
    burstLimit: null,
    lifecycle: "active",
    policyOwner: "system",
    owningCapability: "guardrails",
    riskLevel: "security-sensitive",
    createdBy: "system",
    approvedBy: null,
    lastReviewedAt: null,
    reviewExpiresAt: null,
    changeReason: "fail closed for unknown guardrail policy",
    retryAfterPolicy: "none",
    denialPolicy: "policy-denied",
    telemetryPolicy: "tenant-safe security signal",
    auditPolicy: "value-free denial evidence",
    environmentScope: "local-dev",
    dataClassification: "security-sensitive",
    distributedEnforcement: "single-node-in-memory",
    liveWafReadinessClaim: false,
    liveEdgeReadinessClaim: false,
    productionReadinessClaim: false,
    createdAt: new Date(DEFAULT_NOW).toISOString(),
    updatedAt: new Date(DEFAULT_NOW).toISOString(),
  });
}

function subjectRefHash(value: string): string {
  return `subj_${opaqueHash(value).slice(0, 24)}`;
}

function subjectRefForScope(policy: GuardrailPolicy, input: GuardrailEvaluationInput): string {
  switch (policy.scope) {
    case "global":
      return "global";
    case "tenant":
      return input.tenantId;
    case "actor":
      return input.actorId ?? input.subjectRef;
    case "service-actor":
      return input.serviceActorId ?? input.subjectRef;
    case "provider":
      return input.providerId ?? policy.providerId ?? policy.scopeRef;
    case "route":
      return `${input.tenantId}:${input.routeId ?? policy.routeId ?? policy.scopeRef}`;
    case "operation":
      return `${input.tenantId}:${input.operationId ?? policy.operationId ?? policy.scopeRef}`;
    default:
      return `${input.tenantId}:${policy.scope}:${policy.scopeRef}`;
  }
}

function decisionForLifecycle(
  lifecycle: GuardrailPolicy["lifecycle"],
): { readonly decision: "deny" | "monitor-only"; readonly reasonCode: string } | null {
  if (lifecycle === "active" || lifecycle === "shadow") return null;
  if (lifecycle === "monitor-only") {
    return { decision: "monitor-only", reasonCode: "monitor-only" };
  }
  return { decision: "deny", reasonCode: "policy-not-enforcing-fail-closed" };
}

function exceededDecision(lifecycle: GuardrailPolicy["lifecycle"]): "deny" | "shadow-deny" {
  return lifecycle === "shadow" ? "shadow-deny" : "deny";
}

function exceededReason(policy: GuardrailPolicy): string {
  if (policy.policyType === "quota") return "quota-exceeded";
  if (policy.policyType === "backpressure") return "backpressure-applied";
  if (policy.policyType === "abuse-detection" || policy.classification === "security-protection") {
    return "policy-denied";
  }
  return "rate-limit-exceeded";
}
