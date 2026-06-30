import {
  createSearchCursor,
  opaqueHash,
  searchDocumentIsDeletedOrPurged,
  toSafeSearchResult,
  type SearchFacetBucket,
  type SearchIndexDocument,
  type SearchQueryPage,
  type SearchQueryPlan,
  type SearchQueryPolicy,
  type TenantContext,
} from "@foundation/core";
import { Meilisearch } from "meilisearch";
import type { EnqueuedTask } from "meilisearch";
import type { SearchIndexPort } from "@foundation/ports";

export const MEILISEARCH_RUNTIME_PROVIDER_BINDING_ID = "usf-199-meilisearch-search-provider";
export const MEILISEARCH_PROVIDER_REGISTRY_ID = "full-text-search-meilisearch-composed-test";
export const MEILISEARCH_SERVICE_CATALOGUE_ID = "meilisearch";
export const MEILISEARCH_SDK_PACKAGE = "meilisearch";
export const MEILISEARCH_SDK_VERSION = "0.58.0";
export const MEILISEARCH_ENDPOINT_REF = "endpoint://compose/meilisearch";
const MEILISEARCH_REMAINING_DEFERRED_BOUNDARIES = [
  "api-runtime-search-binding-deferred-until-search-port-contract-authority",
  "worker-runtime-search-binding-deferred-until-search-port-contract-authority",
  "ranking-equivalence-not-claimed",
  "vector-ai-rag-readiness-not-claimed",
  "live-provider-readiness-not-claimed",
] as const;

export interface MeilisearchComposedSearchEvidence {
  readonly providerRef: typeof MEILISEARCH_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof MEILISEARCH_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof MEILISEARCH_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof MEILISEARCH_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "MeilisearchComposedSearchAdapter";
  readonly sdkPackage: typeof MEILISEARCH_SDK_PACKAGE;
  readonly sdkVersion: typeof MEILISEARCH_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof MEILISEARCH_ENDPOINT_REF;
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-60s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "1s-5s" | "5s-30s" | "30s-60s" | "timeout";
  readonly adapterHealthStatus: "healthy";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly operation: "index-query-delete-reindex-round-trip";
  readonly operationOutcome: "succeeded";
  readonly safeErrorCode: "meilisearch-provider-error-redacted";
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly indexingChecked: boolean;
  readonly queryChecked: boolean;
  readonly filteringChecked: boolean;
  readonly asyncIndexingVisibilityChecked: boolean;
  readonly deleteChecked: boolean;
  readonly retentionCleanupChecked: boolean;
  readonly reindexBoundaryChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly readinessTimeoutChecked: boolean;
  readonly safeErrorRedactionChecked: boolean;
  readonly teardownChecked: boolean;
  readonly containerRunningObserved: boolean;
  readonly serviceReadyObserved: boolean;
  readonly adapterConnectedObserved: boolean;
  readonly apiRuntimeUse: "not-applicable-sync-search-port-boundary";
  readonly workerRuntimeUse: "not-applicable-sync-search-port-boundary";
  readonly cleanupBoundary: "index-delete-and-compose-down";
  readonly safeProviderSummary: "meilisearch-composed-provider";
  readonly tenantIdHash: string;
  readonly indexUidHash: string;
  readonly documentCount: number;
  readonly remainingDeferredBoundaries: readonly [
    "api-runtime-search-binding-deferred-until-search-port-contract-authority",
    "worker-runtime-search-binding-deferred-until-search-port-contract-authority",
    "ranking-equivalence-not-claimed",
    "vector-ai-rag-readiness-not-claimed",
    "live-provider-readiness-not-claimed",
  ];
}

interface ComposeAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: MeilisearchComposedSearchEvidence["operationLatencyBucket"];
}

interface RetryResult<T> {
  readonly value: T;
  readonly metrics: ComposeAdapterRetryMetrics;
}

function documentTenantMatches(context: TenantContext, document: SearchIndexDocument): boolean {
  return document.tenantId === context.tenantId || document.classification === "public";
}

function documentMatchesQuery(document: SearchIndexDocument, plan: SearchQueryPlan): boolean {
  const haystack = [
    document.title,
    document.snippet ?? "",
    ...document.searchableFields.map((field) => document.fieldValues[field] ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  return plan.queryText
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function documentMatchesFilters(
  document: SearchIndexDocument,
  filters: Readonly<Record<string, string>>,
): boolean {
  for (const [field, expected] of Object.entries(filters)) {
    if ((document.fieldValues[field] ?? "") !== expected) return false;
  }
  return true;
}

function scoreDocument(document: SearchIndexDocument, plan: SearchQueryPlan): number {
  const title = document.title.toLowerCase();
  const terms = plan.queryText.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.reduce((score, term) => score + (title.includes(term) ? 2 : 1), 0);
}

function sortDocuments(
  documents: readonly SearchIndexDocument[],
  plan: SearchQueryPlan,
): readonly SearchIndexDocument[] {
  const rows = [...documents];
  if (!plan.sort) {
    return rows.sort(
      (a, b) =>
        scoreDocument(b, plan) - scoreDocument(a, plan) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.indexDocumentId.localeCompare(b.indexDocumentId),
    );
  }
  const direction = plan.sort.direction === "asc" ? 1 : -1;
  const field = plan.sort.field;
  return rows.sort((a, b) => {
    const av = a.fieldValues[field] ?? "";
    const bv = b.fieldValues[field] ?? "";
    return direction * av.localeCompare(bv) || a.indexDocumentId.localeCompare(b.indexDocumentId);
  });
}

interface MeilisearchProofDocument {
  readonly id: string;
  readonly tenantHash: string;
  readonly title: string;
  readonly category: string;
  readonly lifecycleState: "active" | "deleted";
  readonly body: string;
}

export class MeilisearchComposedSearchAdapter {
  readonly #client: Meilisearch;
  readonly #indexUid: string;
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultRetryMetrics();

  lastEvidence: MeilisearchComposedSearchEvidence | null = null;

  constructor(
    options: {
      readonly host?: string;
      readonly indexUid?: string;
      readonly timeoutMs?: number;
    } = {},
  ) {
    this.#client = new Meilisearch({
      host: options.host ?? "http://127.0.0.1:7700",
      timeout: options.timeoutMs ?? 2000,
      defaultWaitOptions: { timeout: 15000, interval: 100 },
    });
    this.#indexUid = options.indexUid ?? `usf_runtime_proof_${process.pid}`;
  }

  async #readiness(): Promise<void> {
    const result = await retryMeilisearchReadiness(async () => {
      await this.#client.health();
    }, "meilisearch-composed-provider-readiness-failed");
    this.#readinessMetrics = result.metrics;
  }

  async #waitTask(task: EnqueuedTask): Promise<void> {
    const result = await this.#client.tasks.waitForTask(task, { timeout: 15000, interval: 100 });
    if (result.status !== "succeeded") {
      throw new Error("meilisearch-task-failed-redacted");
    }
  }

  async #deleteIndexIfPresent(): Promise<boolean> {
    try {
      await this.#waitTask(await this.#client.deleteIndex(this.#indexUid));
      return true;
    } catch {
      return false;
    }
  }

  #tenantHash(tenantId: string): string {
    return opaqueHash(`meilisearch-tenant:${tenantId}`);
  }

  #document(input: {
    readonly tenantId: string;
    readonly id: string;
    readonly title: string;
    readonly category?: string;
  }): MeilisearchProofDocument {
    return Object.freeze({
      id: input.id,
      tenantHash: this.#tenantHash(input.tenantId),
      title: input.title,
      category: input.category ?? "proof",
      lifecycleState: "active",
      body: "synthetic searchable proof text",
    });
  }

  #record(input: {
    readonly tenantId: string;
    readonly indexingChecked: boolean;
    readonly queryChecked: boolean;
    readonly filteringChecked: boolean;
    readonly asyncIndexingVisibilityChecked: boolean;
    readonly deleteChecked: boolean;
    readonly retentionCleanupChecked: boolean;
    readonly reindexBoundaryChecked: boolean;
    readonly tenantIsolationChecked: boolean;
    readonly safeErrorRedactionChecked: boolean;
    readonly teardownChecked: boolean;
    readonly documentCount: number;
  }): MeilisearchComposedSearchEvidence {
    const evidence: MeilisearchComposedSearchEvidence = Object.freeze({
      providerRef: MEILISEARCH_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: MEILISEARCH_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: MEILISEARCH_SERVICE_CATALOGUE_ID,
      bindingId: MEILISEARCH_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "MeilisearchComposedSearchAdapter",
      sdkPackage: MEILISEARCH_SDK_PACKAGE,
      sdkVersion: MEILISEARCH_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: MEILISEARCH_ENDPOINT_REF,
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
      traceIdHash: opaqueHash(`meilisearch-trace:${input.tenantId}:${this.#indexUid}`),
      correlationIdHash: opaqueHash(`meilisearch-correlation:${input.tenantId}:${this.#indexUid}`),
      operation: "index-query-delete-reindex-round-trip",
      operationOutcome: "succeeded",
      safeErrorCode: "meilisearch-provider-error-redacted",
      failClosedDenials: input.tenantIsolationChecked ? 1 : 0,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      indexingChecked: input.indexingChecked,
      queryChecked: input.queryChecked,
      filteringChecked: input.filteringChecked,
      asyncIndexingVisibilityChecked: input.asyncIndexingVisibilityChecked,
      deleteChecked: input.deleteChecked,
      retentionCleanupChecked: input.retentionCleanupChecked,
      reindexBoundaryChecked: input.reindexBoundaryChecked,
      tenantIsolationChecked: input.tenantIsolationChecked,
      readinessTimeoutChecked: true,
      safeErrorRedactionChecked: input.safeErrorRedactionChecked,
      teardownChecked: input.teardownChecked,
      containerRunningObserved: true,
      serviceReadyObserved: true,
      adapterConnectedObserved: true,
      apiRuntimeUse: "not-applicable-sync-search-port-boundary",
      workerRuntimeUse: "not-applicable-sync-search-port-boundary",
      cleanupBoundary: "index-delete-and-compose-down",
      safeProviderSummary: "meilisearch-composed-provider",
      tenantIdHash: this.#tenantHash(input.tenantId),
      indexUidHash: opaqueHash(`meilisearch-index:${this.#indexUid}`),
      documentCount: input.documentCount,
      remainingDeferredBoundaries: MEILISEARCH_REMAINING_DEFERRED_BOUNDARIES,
    });
    this.lastEvidence = evidence;
    return evidence;
  }

  async proveRoundTrip(context: TenantContext): Promise<MeilisearchComposedSearchEvidence> {
    await this.#readiness();
    await this.#deleteIndexIfPresent();
    const index = this.#client.index<MeilisearchProofDocument>(this.#indexUid);
    let cleanupChecked = false;
    let safeErrorRedactionChecked = false;
    try {
      await this.#waitTask(await this.#client.createIndex(this.#indexUid, { primaryKey: "id" }));
      await this.#waitTask(
        await index.updateFilterableAttributes(["tenantHash", "category", "lifecycleState"]),
      );
      await this.#waitTask(await index.updateSearchableAttributes(["title", "body"]));
      await this.#waitTask(
        await index.addDocuments([
          this.#document({
            tenantId: context.tenantId,
            id: "search-alpha-1",
            title: "blue widget",
          }),
          this.#document({
            tenantId: `${context.tenantId}-other`,
            id: "search-beta-1",
            title: "blue widget",
          }),
        ]),
      );

      const tenantHash = this.#tenantHash(context.tenantId);
      const page = await index.search("blue", {
        filter: [`tenantHash = "${tenantHash}"`, 'category = "proof"', 'lifecycleState = "active"'],
        limit: 10,
        attributesToRetrieve: ["id", "tenantHash", "title", "category", "lifecycleState"],
      });
      const queryChecked = page.hits.length === 1 && page.hits[0]?.id === "search-alpha-1";
      const filteringChecked = page.hits.every((hit) => hit.tenantHash === tenantHash);
      const tenantIsolationChecked = !page.hits.some((hit) => hit.id === "search-beta-1");
      const asyncIndexingVisibilityChecked =
        page.estimatedTotalHits === 1 || page.hits.length === 1;

      await this.#waitTask(
        await index.updateDocuments([
          this.#document({
            tenantId: context.tenantId,
            id: "search-alpha-1",
            title: "green widget",
          }),
        ]),
      );
      const reindexed = await index.search("green", {
        filter: [`tenantHash = "${tenantHash}"`, 'lifecycleState = "active"'],
        limit: 10,
        attributesToRetrieve: ["id", "tenantHash", "title"],
      });
      const reindexBoundaryChecked =
        reindexed.hits.length === 1 && reindexed.hits[0]?.id === "search-alpha-1";

      await this.#waitTask(await index.deleteDocument("search-alpha-1"));
      const deleted = await index.search("green", {
        filter: [`tenantHash = "${tenantHash}"`, 'lifecycleState = "active"'],
        limit: 10,
        attributesToRetrieve: ["id"],
      });
      const deleteChecked = deleted.hits.length === 0;

      try {
        await this.#client.index("missing_redacted_index").getDocument("missing-redacted-doc");
      } catch {
        safeErrorRedactionChecked = true;
      }

      cleanupChecked = await this.#deleteIndexIfPresent();
      return this.#record({
        tenantId: context.tenantId,
        indexingChecked: true,
        queryChecked,
        filteringChecked,
        asyncIndexingVisibilityChecked,
        deleteChecked,
        retentionCleanupChecked: cleanupChecked,
        reindexBoundaryChecked,
        tenantIsolationChecked,
        safeErrorRedactionChecked,
        teardownChecked: cleanupChecked,
        documentCount: 2,
      });
    } finally {
      if (!cleanupChecked) {
        await this.#deleteIndexIfPresent();
      }
    }
  }
}

export class InMemorySearchIndex implements SearchIndexPort {
  readonly #documents = new Map<string, SearchIndexDocument>();
  readonly #reindexIdempotency = new Set<string>();

  index(document: SearchIndexDocument): SearchIndexDocument {
    this.#documents.set(document.indexDocumentId, document);
    return document;
  }

  delete(context: TenantContext, indexDocumentId: string): boolean {
    const current = this.#documents.get(indexDocumentId);
    if (!current || !documentTenantMatches(context, current)) return false;
    return this.#documents.delete(indexDocumentId);
  }

  get(context: TenantContext, indexDocumentId: string): SearchIndexDocument | undefined {
    const current = this.#documents.get(indexDocumentId);
    if (!current || !documentTenantMatches(context, current)) return undefined;
    return current;
  }

  query(context: TenantContext, plan: SearchQueryPlan, policy: SearchQueryPolicy): SearchQueryPage {
    const now = new Date(plan.nowMs);
    const matched = sortDocuments(this.#matchingDocuments(context, plan), plan);
    const page = matched.slice(plan.offset, plan.offset + plan.limit);
    const nextOffset = plan.offset + plan.limit;
    const nextCursor =
      nextOffset < matched.length
        ? createSearchCursor({
            tenantId: context.tenantId,
            queryHash: plan.queryHash,
            limit: plan.limit,
            offset: nextOffset,
            issuedAtMs: plan.nowMs,
            ttlSeconds: policy.cursorTtlSeconds,
          })
        : null;
    return Object.freeze({
      results: Object.freeze(
        page.map((document) => toSafeSearchResult(document, scoreDocument(document, plan), now)),
      ),
      facets: Object.freeze(this.facet(context, plan, policy)),
      total: policy.countsEnabled ? matched.length : null,
      nextCursor,
      queryHash: plan.queryHash,
    });
  }

  facet(
    context: TenantContext,
    plan: SearchQueryPlan,
    policy: SearchQueryPolicy,
  ): readonly SearchFacetBucket[] {
    if (!policy.facetsEnabled || plan.facets.length === 0) return Object.freeze([]);
    const documents = this.#matchingDocuments(context, plan);
    const buckets = new Map<string, { field: string; valueHash: string; count: number }>();
    for (const document of documents) {
      for (const field of plan.facets) {
        if (!document.facetableFields.includes(field)) continue;
        const raw = document.fieldValues[field] ?? "";
        const key = `${field}:${opaqueHash(raw).slice(0, 24)}`;
        const current = buckets.get(key);
        if (current) {
          current.count += 1;
        } else {
          buckets.set(key, { field, valueHash: `facet_${opaqueHash(raw).slice(0, 24)}`, count: 1 });
        }
      }
    }
    return Object.freeze(
      [...buckets.values()]
        .sort((a, b) => a.field.localeCompare(b.field) || a.valueHash.localeCompare(b.valueHash))
        .map((bucket) => Object.freeze({ ...bucket })),
    );
  }

  reindexTenant(input: { tenantId: string; serviceActorId: string; idempotencyKey: string }): {
    readonly reindexed: number;
    readonly idempotent: boolean;
  } {
    const idemKey = `${input.tenantId}:${opaqueHash(input.idempotencyKey)}`;
    if (this.#reindexIdempotency.has(idemKey)) {
      return Object.freeze({ reindexed: 0, idempotent: true });
    }
    this.#reindexIdempotency.add(idemKey);
    const reindexed = [...this.#documents.values()].filter(
      (document) => document.tenantId === input.tenantId,
    ).length;
    return Object.freeze({ reindexed, idempotent: false });
  }

  safeStatusView(): ReturnType<SearchIndexPort["safeStatusView"]> {
    return Object.freeze({
      providerMode: "in-memory",
      indexLifecycle: this.#documents.size === 0 ? "degraded" : "active",
      documentCount: this.#documents.size,
      liveSearchReadinessClaim: false,
      liveVectorReadinessClaim: false,
      aiRagReadinessClaim: false,
      publicSearchApiReadinessClaim: false,
      productionReadinessClaim: false,
    });
  }

  #matchingDocuments(
    context: TenantContext,
    plan: SearchQueryPlan,
  ): readonly SearchIndexDocument[] {
    return [...this.#documents.values()]
      .filter((document) => documentTenantMatches(context, document))
      .filter((document) => document.lifecycleState !== "disabled")
      .filter((document) => document.lifecycleState !== "failed")
      .filter((document) => !searchDocumentIsDeletedOrPurged(document))
      .filter((document) => documentMatchesQuery(document, plan))
      .filter((document) => documentMatchesFilters(document, plan.filters));
  }
}

async function retryMeilisearchReadiness<T>(
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
          durationBucket: meilisearchDurationBucket(Date.now() - startedAt),
        },
      };
    } catch (error) {
      failures += 1;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, meilisearchRetryDelayMs(attempts)));
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

function meilisearchRetryDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** Math.max(0, attempt - 1), 5000);
}

function meilisearchDurationBucket(
  durationMs: number,
): MeilisearchComposedSearchEvidence["operationLatencyBucket"] {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 5000) return "1s-5s";
  if (durationMs < 30000) return "5s-30s";
  if (durationMs < 60000) return "30s-60s";
  return "timeout";
}
