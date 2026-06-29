// Search/indexing/discovery proof (parity-search-indexing, USF-164).
//
// Hermetic proof for local/dev/test tenant-safe search: classified index
// documents, PDP, guardrails, opaque cursors, facet/count non-leakage,
// file-derived safety, reindex jobs, audit, telemetry, and no live search/vector/
// AI/RAG/public API/production readiness claim.
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

interface SearchIndexingProofResult {
  readonly status: "pass";
  readonly proof: "search-indexing";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly searchProviderPosture: "in-memory-local-dev-test";
  readonly liveSearchProviderReadinessClaim: false;
  readonly liveVectorDatabaseReadinessClaim: false;
  readonly aiRagReadinessClaim: false;
  readonly publicSearchApiReadinessClaim: false;
  readonly productionLiveClaim: false;
  readonly indexedDocumentCount: number;
  readonly auditEventCount: number;
  readonly signalCount: number;
  readonly checks: readonly string[];
}

const NOW = new Date("2026-01-01T00:00:00.000Z");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class ProofPdp implements PolicyDecisionPoint {
  decide(request: AuthorizationRequest): PolicyDecision {
    const denied = request.context.actorId === "actor-denied";
    const effect =
      request.resource.tenantId === request.context.tenantId && !denied ? "permit" : "deny";
    return Object.freeze({
      decisionId: `decision-${request.context.tenantId}-${request.action}`,
      policyVersion: "search-proof-policy",
      actorId: request.context.actorId,
      tenantId: request.context.tenantId,
      action: request.action,
      resourceType: request.resource.type,
      resourceId: request.resource.id,
      effect,
      reasonCode: effect === "permit" ? "permitted" : "missing-permission",
      safeMessage: effect === "permit" ? "permitted" : "denied",
      obligations: Object.freeze([]),
      matchedPolicyIds: Object.freeze(["search-proof-policy"]),
      evaluationContextHash: "search-proof-context",
      correlationId: "corr-search-proof",
      causationId: null,
      traceId: null,
      evaluatedAt: NOW.toISOString(),
    });
  }
}

function context(actorId = "actor-alpha", tenantId = "tenant-alpha"): TenantContext {
  return createTenantContext({
    tenantId,
    actorId,
    roles: ["admin"],
    providerMode: "hermetic-mock",
    environment: "hermetic",
  });
}

function guardrailPolicy(): GuardrailPolicy {
  return Object.freeze({
    policyId: "proof.search.guardrail",
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
    limit: 0,
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
    changeReason: "local dev and test search guardrail proof",
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
  });
}

function document(input: {
  readonly tenantId?: string;
  readonly id: string;
  readonly title: string;
  readonly staleAt?: string | null;
}) {
  return createSearchIndexDocument({
    indexDocumentId: input.id,
    resourceType: "tenant-record",
    resourceId: input.id,
    tenantId: input.tenantId ?? "tenant-alpha",
    classification: "tenant-data",
    sourceRef: `source-${input.id}`,
    sourceVersion: "1",
    title: input.title,
    snippet: "synthetic search proof summary",
    fieldValues: {
      title: input.title,
      category: "proof",
      restricted_note: "redacted proof detail",
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
    staleAt: input.staleAt ?? null,
    now: NOW.toISOString(),
  });
}

export async function runSearchIndexingProof(): Promise<SearchIndexingProofResult> {
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
    pdp: new ProofPdp(),
    now: () => NOW,
  });
  const alpha = context();
  const beta = context("actor-beta", "tenant-beta");
  const checks: string[] = [];

  await service.index(alpha, document({ id: "idx-alpha-1", title: "blue widget" }));
  await service.index(alpha, document({ id: "idx-alpha-2", title: "blue widget second" }));
  await service.index(
    beta,
    document({ tenantId: beta.tenantId, id: "idx-beta-1", title: "blue widget" }),
  );
  checks.push("tenant-scoped indexing");

  const page = await service.query(alpha, {
    tenantId: alpha.tenantId,
    queryText: "blue",
    facets: ["category"],
    limit: 1,
    policy: createSearchQueryPolicy({
      filterAllowList: ["category"],
      sortAllowList: ["title"],
      facetAllowList: ["category"],
      facetsEnabled: true,
    }),
  });
  assert(page.ok, "tenant query failed");
  assert(page.value.total === 2, "tenant count leaked or lost documents");
  assert(page.value.facets[0]?.count === 2, "tenant facet leaked or lost documents");
  assert(!JSON.stringify(page.value).includes("restricted_note"), "restricted field leaked");
  checks.push("tenant count/facet/result redaction");

  const crossTenantCursor = await service.query(beta, {
    tenantId: beta.tenantId,
    queryText: "blue",
    cursor: page.value.nextCursor,
    policy: createSearchQueryPolicy({ sortAllowList: ["title"] }),
  });
  assert(
    !crossTenantCursor.ok && crossTenantCursor.reasonCode === "cursor-invalid",
    "cursor was not tenant-bound",
  );
  checks.push("opaque tenant-bound cursor");

  const denied = await service.query(context("actor-denied"), {
    tenantId: alpha.tenantId,
    queryText: "blue",
  });
  assert(!denied.ok, "PDP denial did not fail closed");
  checks.push("PDP denial");

  guardrails.upsertPolicy(guardrailPolicy());
  const guarded = await service.query(alpha, {
    tenantId: alpha.tenantId,
    queryText: "blue",
    guardrailPolicyId: "proof.search.guardrail",
  });
  assert(
    !guarded.ok && guarded.reasonCode === "rate-limit-exceeded",
    "guardrail did not deny safely",
  );
  checks.push("guardrail denial");

  await files.insert(
    Object.freeze({
      ...createFileMetadata({
        fileId: "file-search-proof",
        tenantId: alpha.tenantId,
        ownerActorId: alpha.actorId,
        salt: "search-proof-salt",
        filenameOriginal: "proof.txt",
        contentType: "text/plain",
        sizeBytes: 17,
        body: "search proof file",
        classification: "confidential",
        correlationId: "corr-search-proof",
      }),
      scanStatus: "clean" as const,
      status: "available" as const,
    }),
  );
  const fileDoc = createSearchIndexDocument({
    ...document({ id: "idx-file", title: "file proof" }),
    classification: "file-derived",
    sourceFileId: "file-search-proof",
    fileStatus: "available",
    fileScanStatus: "clean",
  });
  assert((await service.index(alpha, fileDoc)).ok, "clean file-derived content was not indexed");
  try {
    createSearchIndexDocument({
      ...document({ id: "idx-bad-file", title: "bad file" }),
      classification: "file-derived",
      sourceFileId: "file-search-proof",
      fileStatus: "available",
      fileScanStatus: "quarantined",
    });
    throw new Error("quarantined file-derived document accepted");
  } catch (error) {
    assert(
      error instanceof SearchPolicyError,
      "quarantined file error was not a search policy error",
    );
  }
  checks.push("file-derived scan gate");

  await service.index(
    alpha,
    document({ id: "idx-stale", title: "stale proof", staleAt: "2025-01-01T00:00:00.000Z" }),
  );
  const stale = await service.query(alpha, { tenantId: alpha.tenantId, queryText: "stale" });
  assert(stale.ok && stale.value.total === 0, "stale result was not denied");
  checks.push("stale result denied");

  const reindex = await service.reindex(alpha, {
    tenantId: alpha.tenantId,
    idempotencyKey: "idem-search-proof",
  });
  assert(reindex.ok && reindex.value.jobId.includes("search-reindex"), "reindex job missing");
  assert(
    jobs.forTenant(alpha.tenantId)[0]?.serviceActorId === "urn:usf:service:search-indexing",
    "service actor missing",
  );
  const replay = await service.reindex(alpha, {
    tenantId: alpha.tenantId,
    idempotencyKey: "idem-search-proof",
  });
  assert(replay.ok && replay.value.reindexed === 0, "reindex was not idempotent");
  checks.push("tenant-scoped idempotent reindex job");

  const output = JSON.stringify({
    page: page.value,
    audit: await audit.query(alpha, { tenantId: alpha.tenantId }),
    telemetry: telemetry.query({ tenantId: alpha.tenantId }),
  });
  assert(
    !/token|secret|object_key|recipient_address|provider_response|stack_trace/i.test(output),
    "search output leaked a blocked value",
  );
  const status = service.status();
  assert(status.liveSearchReadinessClaim === false, "live search readiness claim present");
  assert(status.liveVectorReadinessClaim === false, "live vector readiness claim present");
  assert(status.aiRagReadinessClaim === false, "AI/RAG readiness claim present");
  assert(
    status.publicSearchApiReadinessClaim === false,
    "public search API readiness claim present",
  );
  assert(status.productionReadinessClaim === false, "production readiness claim present");
  checks.push("non-leakage and no live readiness claims");

  return Object.freeze({
    status: "pass",
    proof: "search-indexing",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    searchProviderPosture: "in-memory-local-dev-test",
    liveSearchProviderReadinessClaim: false,
    liveVectorDatabaseReadinessClaim: false,
    aiRagReadinessClaim: false,
    publicSearchApiReadinessClaim: false,
    productionLiveClaim: false,
    indexedDocumentCount: status.documentCount,
    auditEventCount: (await audit.query(alpha, { tenantId: alpha.tenantId, limit: 100 })).events
      .length,
    signalCount: telemetry.query({ tenantId: alpha.tenantId, limit: 100 }).signals.length,
    checks: Object.freeze(checks),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSearchIndexingProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
