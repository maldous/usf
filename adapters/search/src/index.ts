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
import type { SearchIndexPort } from "@foundation/ports";

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
