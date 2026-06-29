import {
  SearchPolicyError,
  SEARCH_DEFAULT_LIMIT,
  assertTenantMatch,
  createAuditEventDraft,
  createSearchQueryPolicy,
  serviceActorId,
  stableId,
  toSafeSearchResult,
  validateSearchQueryRequest,
  type AuditEventOutcome,
  type GuardrailDecision,
  type JobRecord,
  type SafeSearchResult,
  type SearchIndexDocument,
  type SearchQueryPage,
  type SearchQueryPolicy,
  type SearchQueryRequest,
  type TenantContext,
} from "@foundation/core";
import type {
  AuditRecorder,
  FileMetadataStore,
  GuardrailPort,
  OperationalJobPort,
  PolicyDecisionPoint,
  SearchIndexPort,
  TelemetryPort,
} from "@foundation/ports";

const COMPONENT = "search-indexing-service";
const SEARCH_SERVICE_ACTOR = serviceActorId("search-indexing");

export type SearchServiceOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reasonCode: string; readonly guardrail?: GuardrailDecision };

export interface SearchQueryInput extends SearchQueryRequest {
  readonly policy?: Partial<SearchQueryPolicy>;
  readonly guardrailPolicyId?: string | null;
  readonly correlationId?: string | null;
  readonly requestId?: string | null;
  readonly traceId?: string | null;
}

export interface SearchReindexInput {
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly guardrailPolicyId?: string | null;
  readonly correlationId?: string | null;
  readonly requestId?: string | null;
  readonly traceId?: string | null;
}

export interface SearchService {
  index(
    context: TenantContext,
    document: SearchIndexDocument,
  ): Promise<SearchServiceOutcome<SearchIndexDocument>>;
  delete(
    context: TenantContext,
    indexDocumentId: string,
  ): Promise<SearchServiceOutcome<{ deleted: boolean }>>;
  query(
    context: TenantContext,
    input: SearchQueryInput,
  ): Promise<SearchServiceOutcome<SearchQueryPage>>;
  reindex(
    context: TenantContext,
    input: SearchReindexInput,
  ): Promise<SearchServiceOutcome<{ reindexed: number; jobId: string }>>;
  status(): ReturnType<SearchIndexPort["safeStatusView"]>;
}

export function createSearchService(deps: {
  readonly index: SearchIndexPort;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly files?: FileMetadataStore;
  readonly jobs?: OperationalJobPort;
  readonly guardrails?: GuardrailPort;
  readonly telemetry?: TelemetryPort;
  readonly now?: () => Date;
}): SearchService {
  const now = deps.now ?? (() => new Date());
  let seq = 0;

  function authorize(
    context: TenantContext,
    action: string,
    resource: { readonly type: string; readonly id: string; readonly tenantId: string | null },
    attributes: Record<string, string> = {},
  ): string | null {
    const decision = deps.pdp.decide({
      context,
      action,
      resource: {
        type: resource.type,
        id: resource.id,
        tenantId: resource.tenantId ?? context.tenantId,
        attributes,
      },
    });
    return decision.effect === "permit" ? null : decision.reasonCode;
  }

  async function audit(
    context: TenantContext,
    input: {
      readonly eventType: string;
      readonly action: string;
      readonly outcome: AuditEventOutcome;
      readonly reasonCode: string;
      readonly subjectId: string;
      readonly resourceType?: string;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
      readonly metadata?: Readonly<Record<string, string>>;
    },
  ): Promise<void> {
    seq += 1;
    await deps.audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [context.tenantId, input.subjectId, input.eventType, String(seq)]),
        eventType: input.eventType,
        category: "search",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: input.action,
        outcome: input.outcome,
        reasonCode: input.reasonCode,
        subjectType: "search",
        subjectId: input.subjectId,
        resourceType: input.resourceType ?? "search-index",
        resourceId: input.subjectId,
        correlationId: input.correlationId ?? stableId("corr", [context.tenantId, input.subjectId]),
        causationId: input.requestId ?? null,
        traceId: input.traceId ?? null,
        recordedByComponent: COMPONENT,
        metadata: input.metadata ?? {},
      }),
    );
  }

  function recordSecuritySignal(
    context: TenantContext,
    eventName: string,
    input: {
      readonly reasonCode: string;
      readonly queryHash?: string | null | undefined;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
    },
  ): void {
    deps.telemetry?.recordSecuritySignal({
      eventName,
      severity: "warning",
      reasonCode: input.reasonCode,
      safeSummary: eventName,
      context: {
        tenantId: context.tenantId,
        actorId: context.actorId,
        capability: "search-indexing",
        correlationId: input.correlationId ?? stableId("corr", [context.tenantId, eventName]),
        requestId: input.requestId ?? stableId("req", [context.tenantId, eventName]),
        ...(input.traceId ? { traceId: input.traceId } : {}),
      },
      attributes: {
        reason_code: input.reasonCode,
        query_hash: input.queryHash ?? "none",
      },
      classification: "security",
    });
  }

  async function deny<T>(
    context: TenantContext,
    input: {
      readonly action: string;
      readonly subjectId: string;
      readonly reasonCode: string;
      readonly eventType?: string | undefined;
      readonly guardrail?: GuardrailDecision | undefined;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
      readonly queryHash?: string | null | undefined;
    },
  ): Promise<SearchServiceOutcome<T>> {
    await audit(context, {
      eventType: input.eventType ?? "search.query.denied",
      action: input.action,
      outcome: "denied",
      reasonCode: input.reasonCode,
      subjectId: input.subjectId,
      correlationId: input.correlationId,
      requestId: input.requestId,
      traceId: input.traceId,
      metadata: { queryHash: input.queryHash ?? "none" },
    });
    recordSecuritySignal(context, "search.query.denied", {
      reasonCode: input.reasonCode,
      queryHash: input.queryHash,
      correlationId: input.correlationId,
      requestId: input.requestId,
      traceId: input.traceId,
    });
    return {
      ok: false,
      reasonCode: input.reasonCode,
      ...(input.guardrail ? { guardrail: input.guardrail } : {}),
    };
  }

  async function evaluateGuardrail(
    context: TenantContext,
    input: {
      readonly policyId?: string | null | undefined;
      readonly subjectRef: string;
      readonly quantity?: number;
      readonly operationId: string;
      readonly idempotencyKey?: string | null | undefined;
      readonly requestFingerprint?: string | null | undefined;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
    },
  ): Promise<GuardrailDecision | null> {
    if (!input.policyId || !deps.guardrails) return null;
    const decision = deps.guardrails.evaluate({
      policyId: input.policyId,
      tenantId: context.tenantId,
      subjectRef: input.subjectRef,
      actorId: context.actorId,
      operationId: input.operationId,
      resourceType: "search",
      nowMs: now().getTime(),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
      ...(input.requestFingerprint !== undefined
        ? { requestFingerprint: input.requestFingerprint }
        : {}),
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
      ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
      ...(input.traceId !== undefined ? { traceId: input.traceId } : {}),
    });
    return decision.decision === "allow" || decision.decision === "monitor-only" ? null : decision;
  }

  async function assertFileSourceSafe(
    context: TenantContext,
    document: SearchIndexDocument,
  ): Promise<string | null> {
    if (!document.sourceFileId || !deps.files) return null;
    const file = await deps.files.get(context, document.sourceFileId);
    if (!file) return "file-source-not-found";
    if (file.tenantId !== context.tenantId) return "tenant-mismatch";
    if (["blocked", "deleted", "purged", "quarantined", "failed"].includes(file.status)) {
      return "file-source-not-indexable";
    }
    if (!["clean", "not-required"].includes(file.scanStatus)) {
      return "file-source-not-indexable";
    }
    return null;
  }

  function reindexJobRecord(
    context: TenantContext,
    input: SearchReindexInput,
    jobId: string,
  ): JobRecord {
    const timestamp = now().getTime();
    return Object.freeze({
      jobId,
      tenantId: context.tenantId,
      classification: "operational-automation-job",
      jobType: "search.reindex",
      status: "queued",
      actorId: context.actorId,
      serviceActorId: SEARCH_SERVICE_ACTOR,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId ?? stableId("corr", [context.tenantId, "search.reindex"]),
      priority: 0,
      runAfter: timestamp,
      attempt: 0,
      maxRetries: 3,
      leaseOwner: null,
      leaseExpiresAt: null,
      deadLetterReason: null,
      failureClass: null,
      safeFailureMessage: null,
      payloadRefs: Object.freeze({
        tenantId: context.tenantId,
        operation: "search.reindex",
      }),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return {
    async index(context, document) {
      assertTenantMatch(context, document.tenantId ?? context.tenantId, "search.index");
      const denyReason = authorize(context, "search.index", {
        type: "search-document",
        id: document.indexDocumentId,
        tenantId: document.tenantId,
      });
      if (denyReason) {
        return deny(context, {
          action: "search.index",
          subjectId: document.indexDocumentId,
          reasonCode: denyReason,
          eventType: "search.query.denied",
        });
      }
      const fileReason = await assertFileSourceSafe(context, document);
      if (fileReason) {
        return deny(context, {
          action: "search.index",
          subjectId: document.indexDocumentId,
          reasonCode: fileReason,
          eventType: "search.query.denied",
        });
      }
      const indexed = deps.index.index(document);
      await audit(context, {
        eventType: "search.index.updated",
        action: "search.index",
        outcome: "success",
        reasonCode: "indexed",
        subjectId: document.indexDocumentId,
        metadata: {
          classification: document.classification,
          resourceType: document.resourceType,
          sourceRevalidationPolicy: document.sourceRevalidationPolicy,
        },
      });
      return { ok: true, value: indexed };
    },

    async delete(context, indexDocumentId) {
      const denyReason = authorize(context, "search.delete", {
        type: "search-document",
        id: indexDocumentId,
        tenantId: context.tenantId,
      });
      if (denyReason) {
        return deny(context, {
          action: "search.delete",
          subjectId: indexDocumentId,
          reasonCode: denyReason,
          eventType: "search.query.denied",
        });
      }
      const deleted = deps.index.delete(context, indexDocumentId);
      await audit(context, {
        eventType: "search.index.deleted",
        action: "search.delete",
        outcome: deleted ? "success" : "denied",
        reasonCode: deleted ? "deleted" : "not-found",
        subjectId: indexDocumentId,
      });
      return { ok: true, value: { deleted } };
    },

    async query(context, input) {
      if (input.tenantId !== context.tenantId) {
        return deny(context, {
          action: "search.query",
          subjectId: "tenant-mismatch",
          reasonCode: "tenant-mismatch",
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const denyReason = authorize(context, "search.query", {
        type: "search",
        id: context.tenantId,
        tenantId: context.tenantId,
      });
      if (denyReason) {
        return deny(context, {
          action: "search.query",
          subjectId: context.tenantId,
          reasonCode: denyReason,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const policy = createSearchQueryPolicy(input.policy);
      let plan: ReturnType<typeof validateSearchQueryRequest>;
      try {
        plan = validateSearchQueryRequest(input, policy);
      } catch (error) {
        const reasonCode = error instanceof SearchPolicyError ? error.reasonCode : "query-denied";
        return deny(context, {
          action: "search.query",
          subjectId: context.tenantId,
          reasonCode,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const guardrail = await evaluateGuardrail(context, {
        policyId: input.guardrailPolicyId,
        subjectRef: `search:${context.actorId}`,
        operationId: "search.query",
        quantity: 1,
        requestFingerprint: plan.queryHash,
        correlationId: input.correlationId,
        requestId: input.requestId,
        traceId: input.traceId,
      });
      if (guardrail) {
        return deny(context, {
          action: "search.query",
          subjectId: context.tenantId,
          reasonCode: guardrail.reasonCode,
          guardrail,
          queryHash: plan.queryHash,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const rawPage = deps.index.query(context, plan, policy);
      const safeResults: SafeSearchResult[] = [];
      for (const result of rawPage.results) {
        const document = deps.index.get(context, result.indexDocumentId);
        if (!document) continue;
        if (result.stale || document.sourceRevalidationPolicy !== "safe-projection-only") {
          const sourceDenyReason = authorize(context, document.requiredAction ?? "search.read", {
            type: document.resourceType,
            id: document.resourceId,
            tenantId: document.tenantId,
          });
          if (sourceDenyReason || result.stale) {
            await audit(context, {
              eventType: "search.result.access_denied",
              action: "search.read",
              outcome: "denied",
              reasonCode: result.stale ? "stale-result-denied" : (sourceDenyReason ?? "denied"),
              subjectId: document.indexDocumentId,
              metadata: { queryHash: plan.queryHash },
            });
            recordSecuritySignal(context, "search.stale_result.denied", {
              reasonCode: result.stale ? "stale-result-denied" : (sourceDenyReason ?? "denied"),
              queryHash: plan.queryHash,
              correlationId: input.correlationId,
              requestId: input.requestId,
              traceId: input.traceId,
            });
            continue;
          }
        }
        safeResults.push(toSafeSearchResult(document, result.score, new Date(plan.nowMs)));
      }
      if (plan.limit >= SEARCH_DEFAULT_LIMIT * 2) {
        deps.telemetry?.recordSecuritySignal({
          eventName: "search.high_volume_query",
          severity: "warning",
          reasonCode: "high-volume-query-posture",
          safeSummary: "search high volume query",
          context: {
            tenantId: context.tenantId,
            actorId: context.actorId,
            capability: "search-indexing",
            correlationId:
              input.correlationId ?? stableId("corr", [context.tenantId, plan.queryHash]),
            requestId: input.requestId ?? stableId("req", [context.tenantId, plan.queryHash]),
            ...(input.traceId ? { traceId: input.traceId } : {}),
          },
          attributes: { query_hash: plan.queryHash, limit: String(plan.limit) },
          classification: "security",
        });
      }
      const safeFacets = safeResults.length === rawPage.results.length ? rawPage.facets : [];
      const safeNextCursor =
        safeResults.length === rawPage.results.length ? rawPage.nextCursor : null;
      const page: SearchQueryPage = Object.freeze({
        results: Object.freeze(safeResults),
        facets: Object.freeze(safeFacets),
        total:
          policy.countsEnabled && safeResults.length === rawPage.results.length
            ? rawPage.total
            : policy.countsEnabled
              ? safeResults.length
              : null,
        nextCursor: safeNextCursor,
        queryHash: rawPage.queryHash,
      });
      await audit(context, {
        eventType: "search.query.executed",
        action: "search.query",
        outcome: "success",
        reasonCode: "query-executed",
        subjectId: context.tenantId,
        correlationId: input.correlationId,
        requestId: input.requestId,
        traceId: input.traceId,
        metadata: {
          queryHash: plan.queryHash,
          resultCount: String(page.results.length),
          facetCount: String(page.facets.length),
        },
      });
      return { ok: true, value: page };
    },

    async reindex(context, input) {
      if (input.tenantId !== context.tenantId) {
        return deny(context, {
          action: "search.reindex",
          subjectId: input.tenantId,
          reasonCode: "tenant-mismatch",
          eventType: "search.reindex.failed",
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const denyReason = authorize(context, "search.reindex", {
        type: "search-index",
        id: input.tenantId,
        tenantId: input.tenantId,
      });
      if (denyReason) {
        return deny(context, {
          action: "search.reindex",
          subjectId: input.tenantId,
          reasonCode: denyReason,
          eventType: "search.reindex.failed",
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const guardrail = await evaluateGuardrail(context, {
        policyId: input.guardrailPolicyId,
        subjectRef: `search-reindex:${context.actorId}`,
        operationId: "search.reindex",
        quantity: 1,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: input.tenantId,
        correlationId: input.correlationId,
        requestId: input.requestId,
        traceId: input.traceId,
      });
      if (guardrail) {
        return deny(context, {
          action: "search.reindex",
          subjectId: input.tenantId,
          reasonCode: guardrail.reasonCode,
          eventType: "search.reindex.failed",
          guardrail,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const jobId = stableId("job", [context.tenantId, "search-reindex", input.idempotencyKey]);
      if (!deps.jobs?.hasIdempotencyKey(context.tenantId, input.idempotencyKey)) {
        deps.jobs?.submit(reindexJobRecord(context, input, jobId));
      }
      await audit(context, {
        eventType: "search.reindex.started",
        action: "search.reindex",
        outcome: "success",
        reasonCode: "reindex-started",
        subjectId: input.tenantId,
        metadata: { jobId },
      });
      const result = deps.index.reindexTenant({
        tenantId: input.tenantId,
        serviceActorId: SEARCH_SERVICE_ACTOR,
        idempotencyKey: input.idempotencyKey,
      });
      await audit(context, {
        eventType: "search.reindex.completed",
        action: "search.reindex",
        outcome: "success",
        reasonCode: result.idempotent ? "reindex-idempotent-replay" : "reindex-completed",
        subjectId: input.tenantId,
        metadata: { jobId, reindexed: String(result.reindexed) },
      });
      return { ok: true, value: { reindexed: result.reindexed, jobId } };
    },

    status() {
      return deps.index.safeStatusView();
    },
  };
}
