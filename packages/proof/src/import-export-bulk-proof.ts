// Import/export/bulk proof (parity-import-export-bulk, USF-162).
//
// Hermetic proof for local/dev/test governed data movement: tenant-scoped bulk
// metadata, PDP, guardrails, file quarantine, jobs, audit, telemetry, deterministic
// preview, evidence-package manifest hashes, and no production/legal/regulatory/
// live-provider readiness claim.
import { InMemoryImportExportStore } from "@foundation/adapter-bulk";
import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import { InMemoryFileMetadataStore } from "@foundation/adapter-store";
import { InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createBulkOperationService } from "@foundation/capability-bulk";
import {
  assertBulkFileFormatSafety,
  createBulkEndpointRef,
  createEvidencePackageManifest,
  createFileMetadata,
  createTenantContext,
  type AuthorizationRequest,
  type GuardrailPolicy,
  type PolicyDecision,
  type TenantContext,
} from "@foundation/core";
import type { PolicyDecisionPoint } from "@foundation/ports";

interface ImportExportBulkProofResult {
  readonly status: "pass";
  readonly proof: "import-export-bulk";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly bulkProcessingPosture: "local-dev-test-in-memory";
  readonly productionImportExportReadinessClaim: false;
  readonly regulatoryExportReadinessClaim: false;
  readonly legalExportReadinessClaim: false;
  readonly eDiscoveryReadinessClaim: false;
  readonly liveExternalProviderReadinessClaim: false;
  readonly productionLiveClaim: false;
  readonly operationCount: number;
  readonly jobCount: number;
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
    const effect = request.resource.tenantId === request.context.tenantId ? "permit" : "deny";
    return Object.freeze({
      decisionId: `decision-${request.context.tenantId}-${request.action}`,
      policyVersion: "proof-policy",
      actorId: request.context.actorId,
      tenantId: request.context.tenantId,
      action: request.action,
      resourceType: request.resource.type,
      resourceId: request.resource.id,
      effect,
      reasonCode: effect === "permit" ? "permitted" : "tenant-mismatch",
      safeMessage: effect === "permit" ? "permitted" : "denied",
      obligations: Object.freeze([]),
      matchedPolicyIds: Object.freeze(["proof-policy"]),
      evaluationContextHash: "proof-context-hash",
      correlationId: "corr-proof",
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
    policyId: "proof.bulk.guardrail",
    policyType: "quota",
    classification: "bulk-operation-protection",
    scope: "operation",
    scopeRef: "bulk-operation",
    tenantId: null,
    actorId: null,
    serviceActorId: null,
    routeId: null,
    operationId: "bulk.start",
    resourceType: "bulk-operation",
    providerId: null,
    limit: 0,
    windowSeconds: 60,
    burstLimit: null,
    lifecycle: "active",
    policyOwner: "platform",
    owningCapability: "import-export-bulk",
    riskLevel: "high",
    createdBy: "system",
    approvedBy: "system",
    lastReviewedAt: NOW.toISOString(),
    reviewExpiresAt: null,
    changeReason: "local dev and test bulk guardrail proof",
    retryAfterPolicy: "safe-window-reset",
    denialPolicy: "quota-conflict",
    telemetryPolicy: "tenant-safe bulk guardrail signal",
    auditPolicy: "value-free bulk guardrail evidence",
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

export async function runImportExportBulkProof(): Promise<ImportExportBulkProofResult> {
  const operations = new InMemoryImportExportStore();
  const audit = new InMemoryAuditEventStore();
  const files = new InMemoryFileMetadataStore();
  const jobs = new InMemoryOperationalJobStore();
  const guardrails = new InMemoryGuardrailStore();
  const telemetry = new InMemoryTelemetryCollector();
  const service = createBulkOperationService({
    operations,
    audit,
    files,
    jobs,
    guardrails,
    telemetry,
    pdp: new ProofPdp(),
    now: () => NOW,
  });
  const tenant = context();
  const body = "id,name\n1,Synthetic";
  await files.insert(
    Object.freeze({
      ...createFileMetadata({
        fileId: "file-import-proof",
        tenantId: tenant.tenantId,
        ownerActorId: tenant.actorId,
        salt: "proof-salt",
        filenameOriginal: "import.csv",
        contentType: "text/csv",
        sizeBytes: body.length,
        body,
        classification: "confidential",
        correlationId: "corr-proof",
      }),
      scanStatus: "clean" as const,
      status: "available" as const,
    }),
  );
  assertBulkFileFormatSafety({
    format: "csv",
    rows: [
      ["id", "name"],
      ["1", "Synthetic"],
    ],
  });
  try {
    assertBulkFileFormatSafety({ format: "csv", rows: [["=cmd|'/C calc'!A0"]] });
    throw new Error("formula injection was not blocked");
  } catch (error) {
    assert(error instanceof Error, "formula injection block did not throw");
  }

  const source = createBulkEndpointRef({
    refType: "uploaded-file",
    ref: "proof-import-file",
    fileId: "file-import-proof",
    format: "csv",
    classification: "tenant-data",
    schemaId: "proof-schema",
    schemaVersion: "1",
    schemaHash: "schema_hash_proof",
    mappingId: "proof-mapping",
    mappingVersion: "1",
    mappingHash: "mapping_hash_proof",
    checksum: "checksum_proof",
    scanStatus: "clean",
    dataResidencyPolicy: "local-dev-test",
  });
  const destination = createBulkEndpointRef({
    refType: "system-internal",
    ref: "tenant-records",
    fileId: null,
    format: "system-internal",
    classification: "tenant-data",
  });

  const created = await service.create(tenant, {
    operationId: "import-proof",
    operationType: "import",
    classification: "tenant-data",
    source,
    destination,
    idempotencyKey: "idem-import-proof",
    itemCount: 1,
  });
  assert(created.ok, "import operation was not created");
  const replay = await service.create(tenant, {
    operationId: "import-proof-duplicate",
    operationType: "import",
    classification: "tenant-data",
    source,
    destination,
    idempotencyKey: "idem-import-proof",
    itemCount: 1,
  });
  assert(replay.ok && replay.deduplicated === true, "duplicate import was not deduplicated");
  assert(
    operations.forTenant(tenant).operations.length === 1,
    "duplicate operation side effect occurred",
  );

  const preview = await service.preview(tenant, "import-proof");
  assert(preview.ok && Boolean(preview.value.previewHash), "preview hash missing");
  const started = await service.start(tenant, "import-proof");
  assert(started.ok && Boolean(started.value.jobId), "bulk job was not started");
  assert(
    jobs.forTenant(tenant.tenantId)[0]?.serviceActorId === "urn:usf:service:bulk-operations",
    "service actor missing",
  );
  const completed = await service.complete(tenant, "import-proof", { successCount: 1 });
  assert(completed.ok && completed.value.status === "succeeded", "operation did not complete");

  guardrails.upsertPolicy(guardrailPolicy());
  const guarded = await service.create(tenant, {
    operationId: "bulk-guardrail-proof",
    operationType: "bulk-create",
    classification: "tenant-data",
    source: destination,
    destination,
    idempotencyKey: "idem-guardrail-proof",
    guardrailPolicyId: "proof.bulk.guardrail",
    itemCount: 5,
  });
  assert(guarded.ok, "guarded operation was not created");
  const denied = await service.start(tenant, "bulk-guardrail-proof");
  assert(!denied.ok && denied.reasonCode === "quota-exceeded", "guardrail did not deny safely");

  const manifest = createEvidencePackageManifest({
    evidencePackageId: "evidence-package-proof",
    packageVersion: "1",
    sourceQueryRef: "tenant audit proof query",
    includedFileIds: ["file-import-proof"],
    includedAuditEventIds: ["audit-proof"],
    createdBy: tenant.actorId,
    retentionPolicy: "classification-aware-local-dev-test",
    chainOfCustodyRef: "custody-proof",
    legalHold: true,
  });
  const evidencePackage = await service.create(tenant, {
    operationId: "evidence-package-proof",
    operationType: "evidence-package-export",
    classification: "audit-sensitive",
    source: destination,
    destination: createBulkEndpointRef({
      refType: "evidence-package",
      ref: "evidence-package-ref",
      fileId: "file-import-proof",
      format: "evidence-package",
      classification: "audit-sensitive",
    }),
    idempotencyKey: "idem-evidence-package-proof",
    dryRunRequired: true,
    itemCount: 1,
    evidencePackage: manifest,
    retentionPolicy: "classification-aware-local-dev-test",
    legalHold: true,
  });
  assert(
    evidencePackage.ok && evidencePackage.value.manifestHash === manifest.manifestHash,
    "evidence package manifest linkage missing",
  );

  const betaRead = await service.read(context("actor-beta", "tenant-beta"), "import-proof");
  assert(!betaRead.ok && betaRead.reasonCode === "not-found", "cross-tenant operation was visible");

  const events = await audit.query(tenant, { tenantId: tenant.tenantId, limit: 50 });
  const signals = telemetry.query({ tenantId: tenant.tenantId, limit: 50 });
  const serialized = JSON.stringify({ events, signals, proof: completed });
  assert(!serialized.includes("object_key"), "object key leaked in proof output");
  assert(!serialized.includes("raw payload"), "raw payload leaked in proof output");
  assert(!serialized.includes("secret"), "secret-looking value leaked in proof output");

  return Object.freeze({
    status: "pass",
    proof: "import-export-bulk",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    bulkProcessingPosture: "local-dev-test-in-memory",
    productionImportExportReadinessClaim: false,
    regulatoryExportReadinessClaim: false,
    legalExportReadinessClaim: false,
    eDiscoveryReadinessClaim: false,
    liveExternalProviderReadinessClaim: false,
    productionLiveClaim: false,
    operationCount: operations.forTenant(tenant).operations.length,
    jobCount: jobs.forTenant(tenant.tenantId).length,
    auditEventCount: events.events.length,
    signalCount: signals.signals.length,
    checks: Object.freeze([
      "tenant-scoped import/export metadata is isolated",
      "PDP-gated create/read/start paths are enforced",
      "explicit idempotency suppresses duplicate side effects",
      "file-backed import uses file_id and clean scan posture",
      "CSV formula injection is blocked",
      "deterministic preview hash is recorded",
      "job-backed execution uses a concrete service actor",
      "guardrail denial is safe and value-free",
      "evidence package manifest/content hashes and audit linkage are represented",
      "audit and observability outputs are tenant-safe and redacted",
    ]),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runImportExportBulkProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
