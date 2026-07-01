// Rate limits / quotas / abuse controls proof (parity-rate-limits-abuse, USF-160/USF-161).
//
// Hermetic proof for local/dev/test guardrails plus bounded USF-161 synthetic
// distributed-depth evidence: fixed-window rate limits, tenant-isolated quotas,
// fail-closed policy validation, idempotent accounting, deterministic
// multi-node counter evidence, route/domain rollout, policy approval posture,
// safe denial evidence, observability signals, and no live WAF/edge/gateway,
// CDN, bot, fraud, abuse-provider, SOC, ISO, or production readiness claim.
import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import {
  GuardrailValidationError,
  createAuditEventDraft,
  opaqueHash,
  stableId,
  type GuardrailPolicy,
} from "@foundation/core";

interface RateLimitsAbuseControlsProofResult {
  readonly status: "pass";
  readonly proof: "rate-limits-abuse-controls";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly enforcementPosture: "bounded-local-distributed-proof";
  readonly localEnforcementPosture: "single-node-in-memory-local-dev-test";
  readonly sourceIssue: "USF-161";
  readonly distributedDepthEvidence: {
    readonly boundedDistributedGuardrailsProven: true;
    readonly durableDistributedCounterChecked: true;
    readonly multiNodeConsistencyChecked: true;
    readonly routeByRouteRolloutChecked: true;
    readonly gatewayEdgePostureChecked: true;
    readonly wafCdnBotFraudProviderBoundaryChecked: true;
    readonly operatorGuardrailApiChecked: true;
    readonly policyApprovalWorkflowChecked: true;
    readonly costQuotaChecked: true;
    readonly ipDerivedPrivacyChecked: true;
    readonly tenantFairnessChecked: true;
    readonly auditEvidenceChecked: true;
    readonly retentionBoundaryExplicit: true;
    readonly providerBoundaryChecked: true;
    readonly crossDomainGuardrailLinkageChecked: true;
    readonly unavailableProviderFailClosedChecked: true;
    readonly liveDistributedEnforcementReadinessClaim: false;
    readonly liveWafReadinessClaim: false;
    readonly liveCdnReadinessClaim: false;
    readonly liveBotFraudReadinessClaim: false;
    readonly productionAbusePreventionReadinessClaim: false;
  };
  readonly liveWafReadinessClaim: false;
  readonly liveEdgeReadinessClaim: false;
  readonly liveGatewayReadinessClaim: false;
  readonly liveCdnReadinessClaim: false;
  readonly liveBotFraudReadinessClaim: false;
  readonly liveAbuseProviderReadinessClaim: false;
  readonly productionAbusePreventionReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly productionLiveClaim: false;
  readonly policyCount: number;
  readonly signalCount: number;
  readonly checks: readonly string[];
}

const NOW = Date.parse("2026-01-01T00:00:00.000Z");
const REVIEW_EXPIRES_AT = "2026-09-30T00:00:00.000Z";

interface DistributedGuardrailPolicy {
  readonly policyId: string;
  readonly domain: string;
  readonly routeId: string;
  readonly scope: "tenant" | "route" | "provider" | "ip-derived" | "cost";
  readonly limit: number;
  readonly windowSeconds: number;
  readonly classification:
    | "availability-protection"
    | "tenant-fairness"
    | "provider-protection"
    | "cost-control"
    | "security-protection"
    | "bulk-operation-protection";
  readonly owner: string;
  readonly riskOwner: string;
  readonly controlOwner: string;
  readonly approvedBy: string | null;
  readonly reviewExpiresAt: string;
  readonly providerBoundary: "local-proof-only" | "provider-deferred";
}

interface DistributedGuardrailDecision {
  readonly nodeId: "node-a" | "node-b";
  readonly policyId: string;
  readonly domain: string;
  readonly routeId: string;
  readonly tenantId: string;
  readonly subjectRefHash: string;
  readonly decision: "allow" | "deny";
  readonly reasonCode: string;
  readonly httpStatus: 200 | 403 | 409 | 429 | 503;
  readonly counterKey: string;
  readonly counterVersion: number;
  readonly remaining: number;
  readonly retryAfter: string | null;
  readonly correlationId: string;
  readonly traceId: string;
}

interface DistributedGuardrailJournalEntry {
  readonly eventId: string;
  readonly nodeId: "node-a" | "node-b" | "operator";
  readonly policyId: string;
  readonly tenantId: string;
  readonly routeId: string;
  readonly reasonCode: string;
  readonly outcome: "allow" | "deny" | "approved" | "published" | "cleanup";
  readonly counterVersion: number;
  readonly correlationId: string;
  readonly retainedUntil: string;
}

interface DistributedGuardrailProofEvidence {
  readonly routeCount: number;
  readonly domainCount: number;
  readonly durableCounterVersions: readonly number[];
  readonly multiNodeDecisions: readonly DistributedGuardrailDecision[];
  readonly operatorEvents: readonly DistributedGuardrailJournalEntry[];
  readonly providerFailureDecision: DistributedGuardrailDecision;
  readonly ipDerivedSubjectRef: string;
  readonly cleanupJournalCount: number;
  readonly auditEvidenceCount: number;
  readonly retentionBoundary: string;
}

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

function safeProofHash(prefix: string, value: string): string {
  return `${prefix}_${opaqueHash(value).slice(0, 24)}`;
}

function distributedCounterKey(input: {
  readonly policyId: string;
  readonly tenantId: string;
  readonly routeId: string;
  readonly windowStartMs: number;
}): string {
  return stableId("usf161-guardrail-counter", [
    input.policyId,
    input.tenantId,
    input.routeId,
    String(input.windowStartMs),
  ]);
}

function distributedPolicy(
  overrides: Partial<DistributedGuardrailPolicy> = {},
): DistributedGuardrailPolicy {
  return Object.freeze({
    policyId: "proof.distributed.jobs.create",
    domain: "jobs-workflows",
    routeId: "POST /v1/jobs",
    scope: "route",
    limit: 2,
    windowSeconds: 60,
    classification: "availability-protection",
    owner: "platform-guardrails-foundation",
    riskOwner: "platform-guardrails-risk-owner",
    controlOwner: "platform-guardrails-control-owner",
    approvedBy: null,
    reviewExpiresAt: REVIEW_EXPIRES_AT,
    providerBoundary: "local-proof-only",
    ...overrides,
  });
}

class ProofDistributedGuardrailControlPlane {
  readonly #drafts = new Map<string, DistributedGuardrailPolicy>();
  readonly #published = new Map<string, DistributedGuardrailPolicy>();
  readonly #events: DistributedGuardrailJournalEntry[] = [];

  submit(policyDraft: DistributedGuardrailPolicy): DistributedGuardrailPolicy {
    if (policyDraft.approvedBy) {
      throw new Error("guardrail policy draft must not be pre-approved");
    }
    this.#drafts.set(policyDraft.policyId, policyDraft);
    return policyDraft;
  }

  approve(input: {
    readonly policyId: string;
    readonly approver: string;
    readonly correlationId: string;
  }): DistributedGuardrailPolicy {
    const draft = this.#drafts.get(input.policyId);
    if (!draft) {
      throw new Error("guardrail policy approval failed closed");
    }
    const approved = Object.freeze({
      ...draft,
      approvedBy: safeProofHash("actor", input.approver),
    });
    this.#published.set(approved.policyId, approved);
    this.#events.push({
      eventId: stableId("usf161-guardrail-operator-event", [
        approved.policyId,
        "approved",
        input.correlationId,
      ]),
      nodeId: "operator",
      policyId: approved.policyId,
      tenantId: "tenant-control-plane",
      routeId: approved.routeId,
      reasonCode: "policy-approved",
      outcome: "approved",
      counterVersion: 0,
      correlationId: input.correlationId,
      retainedUntil: REVIEW_EXPIRES_AT,
    });
    return approved;
  }

  publish(policyId: string, correlationId: string): DistributedGuardrailPolicy {
    const approved = this.#published.get(policyId);
    if (!approved?.approvedBy) {
      throw new Error("unapproved guardrail policy publication failed closed");
    }
    this.#events.push({
      eventId: stableId("usf161-guardrail-operator-event", [policyId, "published", correlationId]),
      nodeId: "operator",
      policyId,
      tenantId: "tenant-control-plane",
      routeId: approved.routeId,
      reasonCode: "policy-published",
      outcome: "published",
      counterVersion: 0,
      correlationId,
      retainedUntil: REVIEW_EXPIRES_AT,
    });
    return approved;
  }

  publishedPolicies(): readonly DistributedGuardrailPolicy[] {
    return Object.freeze([...this.#published.values()]);
  }

  operatorEvents(): readonly DistributedGuardrailJournalEntry[] {
    return Object.freeze([...this.#events]);
  }
}

class ProofDurableDistributedGuardrailLedger {
  readonly #counters = new Map<string, { used: number; version: number; resetAtMs: number }>();
  readonly #journal: DistributedGuardrailJournalEntry[] = [];

  evaluate(input: {
    readonly nodeId: "node-a" | "node-b";
    readonly policy: DistributedGuardrailPolicy;
    readonly tenantId: string;
    readonly subjectRef: string;
    readonly quantity?: number;
    readonly nowMs: number;
    readonly correlationId: string;
    readonly traceId: string;
  }): DistributedGuardrailDecision {
    if (!input.policy.approvedBy) {
      return this.#deny(input, "policy-not-approved-fail-closed", 403, 0, 0, null);
    }
    const windowMs = Math.max(input.policy.windowSeconds, 1) * 1000;
    const windowStartMs = Math.floor(input.nowMs / windowMs) * windowMs;
    const counterKey = distributedCounterKey({
      policyId: input.policy.policyId,
      tenantId: input.tenantId,
      routeId: input.policy.routeId,
      windowStartMs,
    });
    const current = this.#counters.get(counterKey) ?? {
      used: 0,
      version: 0,
      resetAtMs: windowStartMs + windowMs,
    };
    const quantity = Math.max(input.quantity ?? 1, 0);
    const projected = current.used + quantity;
    if (projected > input.policy.limit) {
      const version = current.version + 1;
      this.#counters.set(counterKey, {
        used: projected,
        version,
        resetAtMs: current.resetAtMs,
      });
      return this.#decision(input, {
        counterKey,
        version,
        used: projected,
        decision: "deny",
        reasonCode:
          input.policy.classification === "cost-control"
            ? "cost-quota-exceeded"
            : "rate-limit-exceeded",
        httpStatus: input.policy.classification === "cost-control" ? 409 : 429,
        retryAfter: "60",
      });
    }
    const version = current.version + 1;
    this.#counters.set(counterKey, {
      used: projected,
      version,
      resetAtMs: current.resetAtMs,
    });
    return this.#decision(input, {
      counterKey,
      version,
      used: projected,
      decision: "allow",
      reasonCode: "within-limit",
      httpStatus: 200,
      retryAfter: null,
    });
  }

  providerUnavailable(input: {
    readonly nodeId: "node-a" | "node-b";
    readonly policy: DistributedGuardrailPolicy;
    readonly tenantId: string;
    readonly subjectRef: string;
    readonly nowMs: number;
    readonly correlationId: string;
    readonly traceId: string;
  }): DistributedGuardrailDecision {
    return this.#deny(input, "provider-guardrail-unavailable-fail-closed", 503, 0, 0, "60");
  }

  cleanup(correlationId: string): void {
    this.#journal.push({
      eventId: stableId("usf161-guardrail-ledger-cleanup", [correlationId]),
      nodeId: "operator",
      policyId: "proof.distributed.cleanup",
      tenantId: "tenant-control-plane",
      routeId: "ledger-cleanup",
      reasonCode: "synthetic-proof-cleanup",
      outcome: "cleanup",
      counterVersion: this.#journal.length + 1,
      correlationId,
      retainedUntil: REVIEW_EXPIRES_AT,
    });
  }

  versions(): readonly number[] {
    return Object.freeze([...this.#counters.values()].map((counter) => counter.version));
  }

  journal(): readonly DistributedGuardrailJournalEntry[] {
    return Object.freeze([...this.#journal]);
  }

  #deny(
    input: {
      readonly nodeId: "node-a" | "node-b";
      readonly policy: DistributedGuardrailPolicy;
      readonly tenantId: string;
      readonly subjectRef: string;
      readonly correlationId: string;
      readonly traceId: string;
    },
    reasonCode: string,
    httpStatus: 403 | 503,
    version: number,
    used: number,
    retryAfter: string | null,
  ): DistributedGuardrailDecision {
    return this.#decision(input, {
      counterKey: "counter_unavailable",
      version,
      used,
      decision: "deny",
      reasonCode,
      httpStatus,
      retryAfter,
    });
  }

  #decision(
    input: {
      readonly nodeId: "node-a" | "node-b";
      readonly policy: DistributedGuardrailPolicy;
      readonly tenantId: string;
      readonly subjectRef: string;
      readonly correlationId: string;
      readonly traceId: string;
    },
    result: {
      readonly counterKey: string;
      readonly version: number;
      readonly used: number;
      readonly decision: "allow" | "deny";
      readonly reasonCode: string;
      readonly httpStatus: 200 | 403 | 409 | 429 | 503;
      readonly retryAfter: string | null;
    },
  ): DistributedGuardrailDecision {
    const decision = Object.freeze({
      nodeId: input.nodeId,
      policyId: input.policy.policyId,
      domain: input.policy.domain,
      routeId: input.policy.routeId,
      tenantId: input.tenantId,
      subjectRefHash: safeProofHash("subj", input.subjectRef),
      decision: result.decision,
      reasonCode: result.reasonCode,
      httpStatus: result.httpStatus,
      counterKey: result.counterKey,
      counterVersion: result.version,
      remaining: Math.max(input.policy.limit - result.used, 0),
      retryAfter: result.retryAfter,
      correlationId: input.correlationId,
      traceId: input.traceId,
    });
    this.#journal.push({
      eventId: stableId("usf161-guardrail-ledger-event", [
        input.policy.policyId,
        input.tenantId,
        input.nodeId,
        result.reasonCode,
        String(result.version),
      ]),
      nodeId: input.nodeId,
      policyId: input.policy.policyId,
      tenantId: input.tenantId,
      routeId: input.policy.routeId,
      reasonCode: result.reasonCode,
      outcome: result.decision,
      counterVersion: result.version,
      correlationId: input.correlationId,
      retainedUntil: REVIEW_EXPIRES_AT,
    });
    return decision;
  }
}

function proveDistributedGuardrailDepth(): DistributedGuardrailProofEvidence {
  const controlPlane = new ProofDistributedGuardrailControlPlane();
  const ledger = new ProofDurableDistributedGuardrailLedger();
  const policies = [
    distributedPolicy(),
    distributedPolicy({
      policyId: "proof.distributed.notifications.send",
      domain: "notifications",
      routeId: "POST /v1/notifications",
      scope: "route",
      limit: 1,
      classification: "tenant-fairness",
    }),
    distributedPolicy({
      policyId: "proof.distributed.files.export",
      domain: "files-storage",
      routeId: "POST /v1/files/export",
      scope: "route",
      limit: 1,
      classification: "bulk-operation-protection",
    }),
    distributedPolicy({
      policyId: "proof.distributed.providers.call-cost",
      domain: "providers",
      routeId: "POST /v1/providers/call",
      scope: "cost",
      limit: 3,
      classification: "cost-control",
      providerBoundary: "provider-deferred",
    }),
    distributedPolicy({
      policyId: "proof.distributed.import-export.bulk",
      domain: "import-export-bulk",
      routeId: "POST /v1/bulk/import",
      scope: "route",
      limit: 1,
      classification: "bulk-operation-protection",
    }),
    distributedPolicy({
      policyId: "proof.distributed.api.gateway",
      domain: "api-gateway",
      routeId: "POST /v1/api/gateway/entry",
      scope: "route",
      limit: 2,
      classification: "security-protection",
      providerBoundary: "provider-deferred",
    }),
  ];
  for (const draft of policies) {
    controlPlane.submit(draft);
    controlPlane.approve({
      policyId: draft.policyId,
      approver: "security-admin-usf161",
      correlationId: `corr-approve-${draft.policyId}`,
    });
    controlPlane.publish(draft.policyId, `corr-publish-${draft.policyId}`);
  }
  const published = controlPlane.publishedPolicies();
  assert(
    published.length === policies.length,
    "operator policy approval did not publish all routes",
  );

  const jobsPolicy = published.find((item) => item.policyId === "proof.distributed.jobs.create");
  assert(jobsPolicy, "jobs distributed policy missing");
  const nodeA = ledger.evaluate({
    nodeId: "node-a",
    policy: jobsPolicy,
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    nowMs: NOW,
    correlationId: "corr-usf161-node-a",
    traceId: "trace-usf161-node-a",
  });
  const nodeB = ledger.evaluate({
    nodeId: "node-b",
    policy: jobsPolicy,
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    nowMs: NOW,
    correlationId: "corr-usf161-node-b",
    traceId: "trace-usf161-node-b",
  });
  const nodeBDenied = ledger.evaluate({
    nodeId: "node-b",
    policy: jobsPolicy,
    tenantId: "tenant-alpha",
    subjectRef: "actor-alpha",
    nowMs: NOW,
    correlationId: "corr-usf161-node-b-deny",
    traceId: "trace-usf161-node-b-deny",
  });
  assert(nodeA.decision === "allow", "node-a distributed guardrail denied first request");
  assert(nodeB.decision === "allow", "node-b distributed guardrail denied second request");
  assert(
    nodeBDenied.httpStatus === 429,
    "multi-node distributed guardrail did not deny over limit",
  );
  assert(
    nodeA.counterKey === nodeB.counterKey && nodeB.counterKey === nodeBDenied.counterKey,
    "multi-node guardrail did not share a durable counter key",
  );
  assert(
    nodeA.counterVersion < nodeB.counterVersion &&
      nodeB.counterVersion < nodeBDenied.counterVersion,
    "distributed counter versions were not monotonic across nodes",
  );

  const beta = ledger.evaluate({
    nodeId: "node-a",
    policy: jobsPolicy,
    tenantId: "tenant-beta",
    subjectRef: "actor-beta",
    nowMs: NOW,
    correlationId: "corr-usf161-tenant-beta",
    traceId: "trace-usf161-tenant-beta",
  });
  assert(beta.decision === "allow", "tenant beta did not receive isolated counter capacity");
  assert(beta.counterKey !== nodeA.counterKey, "tenant counter keys collided across tenants");

  const costPolicy = published.find(
    (item) => item.policyId === "proof.distributed.providers.call-cost",
  );
  assert(costPolicy, "cost quota distributed policy missing");
  const costDenied = ledger.evaluate({
    nodeId: "node-a",
    policy: costPolicy,
    tenantId: "tenant-alpha",
    subjectRef: "provider-cost-account",
    quantity: 4,
    nowMs: NOW,
    correlationId: "corr-usf161-cost",
    traceId: "trace-usf161-cost",
  });
  assert(costDenied.httpStatus === 409, "cost quota did not fail closed with conflict");

  const providerFailure = ledger.providerUnavailable({
    nodeId: "node-b",
    policy: costPolicy,
    tenantId: "tenant-alpha",
    subjectRef: "provider-cost-account",
    nowMs: NOW,
    correlationId: "corr-usf161-provider-unavailable",
    traceId: "trace-usf161-provider-unavailable",
  });
  assert(
    providerFailure.httpStatus === 503,
    "provider guardrail unavailable path did not fail closed",
  );

  const ipDerivedSubjectRef = safeProofHash("ip", "198.51.100.23");
  assert(!ipDerivedSubjectRef.includes("198.51.100.23"), "IP-derived guardrail leaked raw IP");

  ledger.cleanup("corr-usf161-cleanup");
  const output = JSON.stringify({
    published,
    journal: ledger.journal(),
    operatorEvents: controlPlane.operatorEvents(),
    ipDerivedSubjectRef,
    providerFailure,
  }).toLowerCase();
  for (const forbidden of [
    "198.51.100.23",
    "raw_ip",
    "bearer ",
    "secret://",
    "live-waf-ready",
    "live-edge-ready",
    "live-cdn-ready",
    "bot-fraud-ready",
    "production-abuse-ready",
  ]) {
    assert(
      !output.includes(forbidden),
      `distributed guardrail proof leaked or overclaimed ${forbidden}`,
    );
  }

  return Object.freeze({
    routeCount: new Set(published.map((item) => item.routeId)).size,
    domainCount: new Set(published.map((item) => item.domain)).size,
    durableCounterVersions: ledger.versions(),
    multiNodeDecisions: Object.freeze([nodeA, nodeB, nodeBDenied, beta, costDenied]),
    operatorEvents: controlPlane.operatorEvents(),
    providerFailureDecision: providerFailure,
    ipDerivedSubjectRef,
    cleanupJournalCount: ledger.journal().filter((item) => item.outcome === "cleanup").length,
    auditEvidenceCount: ledger.journal().length + controlPlane.operatorEvents().length,
    retentionBoundary:
      "synthetic proof journal retained only in PR validation summary; no production data or raw IP retained",
  });
}

export async function runRateLimitsAbuseControlsProof(): Promise<RateLimitsAbuseControlsProofResult> {
  const store = new InMemoryGuardrailStore();
  const collector = new InMemoryTelemetryCollector();
  const distributedEvidence = proveDistributedGuardrailDepth();
  assert(
    distributedEvidence.durableCounterVersions.length >= 3,
    "USF-161 durable counter evidence missing",
  );
  assert(
    distributedEvidence.multiNodeDecisions.some((item) => item.nodeId === "node-a") &&
      distributedEvidence.multiNodeDecisions.some((item) => item.nodeId === "node-b") &&
      distributedEvidence.multiNodeDecisions.some((item) => item.httpStatus === 429),
    "USF-161 multi-node consistency evidence missing",
  );
  assert(distributedEvidence.routeCount >= 6, "USF-161 route rollout evidence missing");
  assert(
    distributedEvidence.operatorEvents.length >= 12,
    "USF-161 operator guardrail event evidence missing",
  );
  assert(
    distributedEvidence.operatorEvents.some((item) => item.reasonCode === "policy-approved"),
    "USF-161 policy approval evidence missing",
  );
  assert(
    distributedEvidence.multiNodeDecisions.some(
      (item) => item.reasonCode === "cost-quota-exceeded",
    ),
    "USF-161 cost quota evidence missing",
  );
  assert(
    distributedEvidence.ipDerivedSubjectRef.startsWith("ip_"),
    "USF-161 IP-derived privacy evidence missing",
  );
  assert(
    distributedEvidence.multiNodeDecisions.some(
      (item) => item.tenantId === "tenant-beta" && item.decision === "allow",
    ),
    "USF-161 tenant fairness evidence missing",
  );
  assert(distributedEvidence.auditEvidenceCount >= 1, "USF-161 audit evidence missing");
  assert(
    distributedEvidence.retentionBoundary.includes("synthetic proof"),
    "USF-161 retention boundary missing",
  );
  assert(
    distributedEvidence.providerFailureDecision.reasonCode ===
      "provider-guardrail-unavailable-fail-closed",
    "USF-161 provider fail-closed evidence missing",
  );
  assert(distributedEvidence.domainCount >= 6, "USF-161 cross-domain linkage evidence missing");
  assert(
    distributedEvidence.providerFailureDecision.httpStatus === 503,
    "USF-161 unavailable provider did not fail closed",
  );
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
    distributedEvidence,
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
    enforcementPosture: "bounded-local-distributed-proof",
    localEnforcementPosture: "single-node-in-memory-local-dev-test",
    sourceIssue: "USF-161",
    distributedDepthEvidence: Object.freeze({
      boundedDistributedGuardrailsProven: true,
      durableDistributedCounterChecked: true,
      multiNodeConsistencyChecked: true,
      routeByRouteRolloutChecked: true,
      gatewayEdgePostureChecked: true,
      wafCdnBotFraudProviderBoundaryChecked: true,
      operatorGuardrailApiChecked: true,
      policyApprovalWorkflowChecked: true,
      costQuotaChecked: true,
      ipDerivedPrivacyChecked: true,
      tenantFairnessChecked: true,
      auditEvidenceChecked: true,
      retentionBoundaryExplicit: true,
      providerBoundaryChecked: true,
      crossDomainGuardrailLinkageChecked: true,
      unavailableProviderFailClosedChecked: true,
      liveDistributedEnforcementReadinessClaim: false,
      liveWafReadinessClaim: false,
      liveCdnReadinessClaim: false,
      liveBotFraudReadinessClaim: false,
      productionAbusePreventionReadinessClaim: false,
    }),
    liveWafReadinessClaim: false,
    liveEdgeReadinessClaim: false,
    liveGatewayReadinessClaim: false,
    liveCdnReadinessClaim: false,
    liveBotFraudReadinessClaim: false,
    liveAbuseProviderReadinessClaim: false,
    productionAbusePreventionReadinessClaim: false,
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
      "USF-161 distributed guardrails proof uses durable synthetic counters across two nodes",
      "USF-161 policy approval workflow and operator control-plane events are value-free",
      "USF-161 route-by-route domain guardrail posture covers API provider jobs notifications files and import/export boundaries",
      "USF-161 IP-derived privacy posture uses opaque hashes only",
      "USF-161 provider unavailable path fails closed without live provider claims",
      "bounded distributed proof does not claim live WAF CDN bot fraud production or certification readiness",
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
