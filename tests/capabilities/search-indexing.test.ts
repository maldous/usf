import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import { InMemorySearchIndex } from "@foundation/adapter-search";
import { InMemoryFileMetadataStore } from "@foundation/adapter-store";
import { InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createSearchService } from "@foundation/capability-search";
import {
  SearchPolicyError,
  createFileMetadata,
  createSearchIndexDocument,
  createSearchQueryPolicy,
  createTenantContext,
  type AuthorizationRequest,
  type GuardrailPolicy,
  type PolicyDecision,
  type TenantContext,
} from "@foundation/core";
import type { PolicyDecisionPoint } from "@foundation/ports";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-01-01T00:00:00.000Z");

class TestPdp implements PolicyDecisionPoint {
  constructor(private readonly allowed: ReadonlySet<string>) {}

  decide(request: AuthorizationRequest): PolicyDecision {
    const permitted =
      request.resource.tenantId === request.context.tenantId && this.allowed.has(request.action);
    return {
      decisionId: `decision-${request.context.tenantId}-${request.action}`,
      policyVersion: "search-test-policy",
      actorId: request.context.actorId,
      tenantId: request.context.tenantId,
      action: request.action,
      resourceType: request.resource.type,
      resourceId: request.resource.id,
      effect: permitted ? "permit" : "deny",
      reasonCode: permitted ? "permitted" : "missing-permission",
      safeMessage: permitted ? "permitted" : "denied",
      obligations: [],
      matchedPolicyIds: ["search-test-policy"],
      evaluationContextHash: "search-test-context",
      correlationId: "corr-search-test",
      causationId: null,
      traceId: null,
      evaluatedAt: NOW.toISOString(),
    };
  }
}

const allActions = new Set([
  "search.query",
  "search.read",
  "search.index",
  "search.reindex",
  "search.delete",
  "search.facet",
  "search.autocomplete",
]);

function tenant(actorId = "actor-alpha", tenantId = "tenant-alpha"): TenantContext {
  return createTenantContext({
    tenantId,
    actorId,
    roles: ["admin"],
    providerMode: "hermetic-mock",
    environment: "hermetic",
  });
}

function policy(overrides: Partial<GuardrailPolicy> = {}): GuardrailPolicy {
  return {
    policyId: "search.guardrail.policy",
    policyType: "rate-limit",
    classification: "abuse-prevention",
    scope: "operation",
    scopeRef: "search.query",
    tenantId: null,
    actorId: null,
    serviceActorId: null,
    routeId: null,
    operationId: "search.query",
    resourceType: "search",
    providerId: "search-index-in-memory",
    limit: 1,
    windowSeconds: 60,
    burstLimit: null,
    lifecycle: "active",
    policyOwner: "platform",
    owningCapability: "search-indexing",
    riskLevel: "high",
    createdBy: "system",
    approvedBy: "system",
    lastReviewedAt: NOW.toISOString(),
    reviewExpiresAt: null,
    changeReason: "local dev and test search guardrail",
    retryAfterPolicy: "safe-window-reset",
    denialPolicy: "rate-limit-exceeded",
    telemetryPolicy: "tenant-safe search guardrail signal",
    auditPolicy: "value-free search guardrail evidence",
    environmentScope: "local-dev",
    dataClassification: "security-sensitive",
    distributedEnforcement: "single-node-in-memory",
    liveWafReadinessClaim: false,
    liveEdgeReadinessClaim: false,
    productionReadinessClaim: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function setup(allowed: ReadonlySet<string> = allActions) {
  const index = new InMemorySearchIndex();
  const audit = new InMemoryAuditEventStore();
  const files = new InMemoryFileMetadataStore();
  const jobs = new InMemoryOperationalJobStore();
  const guardrails = new InMemoryGuardrailStore();
  const telemetry = new InMemoryTelemetryCollector();
  const service = createSearchService({
    index,
    audit,
    files,
    jobs,
    guardrails,
    telemetry,
    pdp: new TestPdp(allowed),
    now: () => NOW,
  });
  return { index, audit, files, jobs, guardrails, telemetry, service };
}

function document(input: {
  tenantId?: string;
  id?: string;
  title?: string;
  classification?: string;
  lifecycleState?: string;
  staleAt?: string | null;
  sourceFileId?: string | null;
  fileStatus?:
    | "uploaded"
    | "available"
    | "quarantined"
    | "blocked"
    | "deleted"
    | "restored"
    | "purged"
    | "failed"
    | null;
  fileScanStatus?:
    | "not-required"
    | "pending"
    | "clean"
    | "suspicious"
    | "infected"
    | "failed"
    | "quarantined"
    | "provider-unavailable"
    | null;
}) {
  return createSearchIndexDocument({
    indexDocumentId: input.id ?? "idx-alpha",
    resourceType: "tenant-record",
    resourceId: input.id ?? "record-alpha",
    tenantId: input.tenantId ?? "tenant-alpha",
    classification: input.classification ?? "tenant-data",
    sourceRef: `source-${input.id ?? "alpha"}`,
    sourceVersion: "1",
    title: input.title ?? "blue widget",
    snippet: "synthetic searchable summary",
    fieldValues: {
      title: input.title ?? "blue widget",
      category: "catalog",
      restricted_note: "internal-only",
    },
    fieldClassifications: {
      title: "public",
      category: "internal",
      restricted_note: "restricted",
    },
    redactedFields: ["restricted_note"],
    searchableFields: ["title", "category"],
    filterableFields: ["category"],
    sortableFields: ["title"],
    facetableFields: ["category"],
    requiredAction: "search.read",
    lifecycleState: input.lifecycleState ?? "active",
    sourceFileId: input.sourceFileId ?? null,
    fileStatus: input.fileStatus ?? null,
    fileScanStatus: input.fileScanStatus ?? null,
    staleAt: input.staleAt ?? null,
    now: NOW.toISOString(),
  });
}

async function seedCleanFile(files: InMemoryFileMetadataStore, context: TenantContext) {
  const meta = createFileMetadata({
    fileId: "file-search-alpha",
    tenantId: context.tenantId,
    ownerActorId: context.actorId,
    salt: "search-test-salt",
    filenameOriginal: "search.txt",
    contentType: "text/plain",
    sizeBytes: 18,
    body: "searchable content",
    classification: "confidential",
    correlationId: "corr-search",
  });
  await files.insert(
    Object.freeze({ ...meta, scanStatus: "clean" as const, status: "available" as const }),
  );
}

describe("tenant-safe search indexing", () => {
  it("tenant A cannot search tenant B documents or infer them through count/facet/cursor", async () => {
    const { service } = setup();
    const alpha = tenant();
    const beta = tenant("actor-beta", "tenant-beta");

    await expect(
      service.index(alpha, document({ id: "idx-a", title: "shared alpha" })),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      service.index(alpha, document({ id: "idx-a2", title: "shared alpha second" })),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      service.index(
        beta,
        document({ tenantId: "tenant-beta", id: "idx-b", title: "shared alpha" }),
      ),
    ).resolves.toMatchObject({ ok: true });

    const first = await service.query(alpha, {
      tenantId: alpha.tenantId,
      queryText: "shared",
      facets: ["category"],
      limit: 1,
      policy: createSearchQueryPolicy({
        filterAllowList: ["category"],
        sortAllowList: ["title"],
        facetAllowList: ["category"],
        facetsEnabled: true,
      }),
    });
    expect(first.ok && first.value.total).toBe(2);
    expect(first.ok && first.value.facets[0]?.count).toBe(2);
    expect(first.ok && first.value.results[0]?.resourceId).toBe("idx-a");

    const crossTenantCursor = first.ok ? first.value.nextCursor : null;
    const betaReplay = await service.query(beta, {
      tenantId: beta.tenantId,
      queryText: "shared",
      cursor: crossTenantCursor,
      policy: createSearchQueryPolicy({ sortAllowList: ["title"] }),
    });
    expect(betaReplay.ok).toBe(false);
    expect(betaReplay.ok ? "" : betaReplay.reasonCode).toBe("cursor-invalid");
  });

  it("missing tenant context and missing PDP permission fail closed", async () => {
    expect(() => tenant("actor-alpha", "")).toThrow();
    const { service } = setup(new Set(["search.read"]));
    const alpha = tenant();
    const denied = await service.query(alpha, { tenantId: alpha.tenantId, queryText: "anything" });
    expect(denied).toMatchObject({ ok: false, reasonCode: "missing-permission" });
  });

  it("unknown resource type, unknown classification, filters, sorts, facets, and oversized query fail closed", async () => {
    expect(() =>
      createSearchIndexDocument({
        indexDocumentId: "bad-resource",
        resourceType: "mystery",
        resourceId: "r",
        tenantId: "tenant-alpha",
        classification: "tenant-data",
        sourceRef: "src",
        sourceVersion: "1",
        title: "title",
        fieldValues: { title: "title" },
      }),
    ).toThrow(SearchPolicyError);
    expect(() => document({ classification: "unknown" })).toThrow(SearchPolicyError);

    const { service } = setup();
    const alpha = tenant();
    await service.index(alpha, document({ id: "idx-filter", title: "filterable" }));
    await expect(
      service.query(alpha, {
        tenantId: alpha.tenantId,
        queryText: "filterable",
        filters: { unknown: "x" },
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "filter-not-allowed" });
    await expect(
      service.query(alpha, {
        tenantId: alpha.tenantId,
        queryText: "filterable",
        sort: { field: "unknown", direction: "asc" },
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "sort-not-allowed" });
    await expect(
      service.query(alpha, {
        tenantId: alpha.tenantId,
        queryText: "filterable",
        facets: ["unknown"],
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "facet-not-allowed" });
    await expect(
      service.query(alpha, {
        tenantId: alpha.tenantId,
        queryText: "x".repeat(201),
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "query-too-long" });
  });

  it("restricted fields and object keys are absent from index results and audit/proof outputs", async () => {
    const { service, audit } = setup();
    const alpha = tenant();
    await service.index(alpha, document({ id: "idx-redact", title: "redacted widget" }));
    const page = await service.query(alpha, {
      tenantId: alpha.tenantId,
      queryText: "redacted",
      policy: createSearchQueryPolicy({ filterAllowList: ["category"], sortAllowList: ["title"] }),
    });
    expect(page.ok).toBe(true);
    const result = page.ok ? page.value.results[0] : undefined;
    expect(result?.fields).not.toHaveProperty("restricted_note");
    expect(JSON.stringify(page)).not.toMatch(/object_key|secret|recipient_address/i);
    const auditPage = await audit.query(alpha, { tenantId: alpha.tenantId, limit: 20 });
    expect(JSON.stringify(auditPage)).not.toMatch(
      /object_key|secret|recipient_address|redacted widget/i,
    );
  });

  it("quarantined file-derived content is not indexed and deleted or stale sources are hidden", async () => {
    const { service, files } = setup();
    const alpha = tenant();
    await seedCleanFile(files, alpha);
    await expect(
      service.index(
        alpha,
        createSearchIndexDocument({
          ...document({ id: "idx-file", title: "file content" }),
          classification: "file-derived",
          sourceFileId: "file-search-alpha",
          fileStatus: "available",
          fileScanStatus: "clean",
        }),
      ),
    ).resolves.toMatchObject({ ok: true });
    expect(() =>
      createSearchIndexDocument({
        ...document({ id: "idx-quarantine", title: "bad file" }),
        classification: "file-derived",
        sourceFileId: "file-search-alpha",
        fileStatus: "available",
        fileScanStatus: "quarantined",
      }),
    ).toThrow(SearchPolicyError);
    await service.index(
      alpha,
      document({ id: "idx-stale", title: "stale document", staleAt: "2025-01-01T00:00:00.000Z" }),
    );
    const stale = await service.query(alpha, { tenantId: alpha.tenantId, queryText: "stale" });
    expect(stale.ok && stale.value.total).toBe(0);
    await service.index(
      alpha,
      document({ id: "idx-delete", title: "deleted document", fileStatus: "deleted" }),
    );
    const deleted = await service.query(alpha, { tenantId: alpha.tenantId, queryText: "deleted" });
    expect(deleted.ok && deleted.value.total).toBe(0);
  });

  it("search guardrail denies safely and emits tenant-safe security signals", async () => {
    const { service, guardrails, telemetry } = setup();
    const alpha = tenant();
    guardrails.upsertPolicy(policy({ limit: 0 }));
    const denied = await service.query(alpha, {
      tenantId: alpha.tenantId,
      queryText: "anything",
      guardrailPolicyId: "search.guardrail.policy",
    });
    expect(denied.ok).toBe(false);
    expect(denied.ok ? "" : denied.reasonCode).toBe("rate-limit-exceeded");
    const signals = telemetry.query({ tenantId: alpha.tenantId }).signals;
    expect(signals.some((signal) => signal.signalName === "search.query.denied")).toBe(true);
    expect(JSON.stringify(signals)).not.toMatch(/token|secret|object_key|recipient_address/i);
  });

  it("reindex is tenant-scoped, uses a concrete service actor, and is idempotent", async () => {
    const { service, jobs, audit } = setup();
    const alpha = tenant();
    await service.index(alpha, document({ id: "idx-reindex", title: "reindex me" }));
    const first = await service.reindex(alpha, {
      tenantId: alpha.tenantId,
      idempotencyKey: "idem-reindex",
    });
    expect(first.ok && first.value.reindexed).toBe(1);
    expect(jobs.forTenant(alpha.tenantId)[0]?.serviceActorId).toBe(
      "urn:usf:service:search-indexing",
    );
    const second = await service.reindex(alpha, {
      tenantId: alpha.tenantId,
      idempotencyKey: "idem-reindex",
    });
    expect(second.ok && second.value.reindexed).toBe(0);
    const auditPage = await audit.query(alpha, {
      tenantId: alpha.tenantId,
      eventType: "search.reindex.completed",
    });
    expect(auditPage.events.length).toBeGreaterThan(0);
  });

  it("provider status is local-only and does not claim live search, vector, AI, public API, or production readiness", () => {
    const { service } = setup();
    expect(service.status()).toMatchObject({
      providerMode: "in-memory",
      liveSearchReadinessClaim: false,
      liveVectorReadinessClaim: false,
      aiRagReadinessClaim: false,
      publicSearchApiReadinessClaim: false,
      productionReadinessClaim: false,
    });
  });
});
