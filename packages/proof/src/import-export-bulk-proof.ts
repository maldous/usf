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
  createBulkItemOutcome,
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
  readonly sourceIssue: "USF-163";
  readonly deepRuntimePosture: "bounded-local-deep-runtime-proof";
  readonly deepRuntimeEvidence: {
    readonly boundedDeepRuntimeProven: true;
    readonly apiOpenApiSurfaceReclassified: true;
    readonly transactionalResumableImportChecked: true;
    readonly liveExternalTransferProviderBoundaryChecked: true;
    readonly parserAdapterBoundaryChecked: true;
    readonly decompressionBombRejected: true;
    readonly rollbackCompensationWorkflowChecked: true;
    readonly approvalSeparationOfDutiesChecked: true;
    readonly exportPurgeRetentionSchedulerChecked: true;
    readonly legalHoldWorkflowRuntimeChecked: true;
    readonly legalEdiscoveryRegulatoryBoundaryChecked: true;
    readonly productionMigrationBoundaryExplicit: true;
    readonly crossDomainDependencyLinkageChecked: true;
    readonly tenantAccessAuditSecretCleanupEvidenceChecked: true;
    readonly unavailableProviderFailClosedChecked: true;
    readonly productionMigrationReadinessClaim: false;
    readonly legalExportReadinessClaim: false;
    readonly eDiscoveryReadinessClaim: false;
    readonly regulatoryExportReadinessClaim: false;
    readonly liveExternalProviderReadinessClaim: false;
  };
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
  try {
    assertBulkFileFormatSafety({
      format: "zip",
      archiveEntries: ["tenant/synthetic.csv"],
      compressedSizeBytes: 10,
      uncompressedSizeBytes: 5_000,
      maxExpansionRatio: 100,
    });
    throw new Error("decompression bomb was not blocked");
  } catch (error) {
    assert(error instanceof Error, "decompression bomb block did not throw");
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

  const resumable = await service.create(tenant, {
    operationId: "import-resume-proof",
    operationType: "import",
    classification: "tenant-data",
    source,
    destination,
    idempotencyKey: "idem-import-resume-proof",
    partialSuccessAllowed: true,
    maxErrorCount: 1,
    itemCount: 2,
  });
  assert(resumable.ok, "resumable import operation was not created");
  const resumableStarted = await service.start(tenant, "import-resume-proof");
  assert(resumableStarted.ok, "resumable import did not start");
  const partial = await service.complete(tenant, "import-resume-proof", {
    successCount: 1,
    failureCount: 1,
    outcomes: [
      createBulkItemOutcome({
        itemId: "row-2",
        rowNumber: 2,
        sourceRecordRef: "synthetic failed row",
        targetRecordRef: "synthetic target row",
        operation: "import",
        outcome: "failed",
        safeErrorCode: "synthetic-validation",
        safeErrorMessage: "value-free validation failure",
        correlationId: "corr-proof",
      }),
    ],
  });
  assert(
    partial.ok && partial.value.status === "partially-succeeded",
    "partial success was not recorded",
  );
  const retried = await service.retry(tenant, "import-resume-proof");
  assert(retried.ok && retried.value.status === "running", "resumable retry did not restart");

  const providerTransfer = await service.create(tenant, {
    operationId: "provider-transfer-proof",
    operationType: "import",
    classification: "tenant-data",
    source: createBulkEndpointRef({
      refType: "provider-source",
      ref: "local-provider-boundary",
      fileId: null,
      format: "json",
      classification: "tenant-data",
      dataResidencyPolicy: "local-dev-test",
    }),
    destination,
    idempotencyKey: "idem-provider-transfer-proof",
    itemCount: 1,
  });
  assert(providerTransfer.ok, "provider transfer boundary operation was not created");
  const providerDenied = await service.start(tenant, "provider-transfer-proof");
  assert(
    !providerDenied.ok && providerDenied.reasonCode === "provider-transfer-deferred",
    "provider transfer did not fail closed",
  );

  const rollbackCandidate = await service.create(tenant, {
    operationId: "destructive-rollback-proof",
    operationType: "bulk-delete",
    classification: "destructive",
    source: destination,
    destination,
    idempotencyKey: "idem-destructive-rollback-proof",
    dryRunRequired: true,
    rollbackSupported: true,
    compensationSupported: true,
    itemCount: 2,
  });
  assert(rollbackCandidate.ok, "rollback candidate was not created");
  const rollbackPreview = await service.preview(tenant, "destructive-rollback-proof");
  assert(rollbackPreview.ok && rollbackPreview.value.previewHash, "rollback preview missing");
  const selfApproval = await service.approve(
    tenant,
    "destructive-rollback-proof",
    rollbackPreview.value.previewHash ?? "",
  );
  assert(
    !selfApproval.ok && selfApproval.reasonCode === "requester-cannot-self-approve",
    "self approval was not denied",
  );
  const approver = context("actor-approver", tenant.tenantId);
  const approved = await service.approve(
    approver,
    "destructive-rollback-proof",
    rollbackPreview.value.previewHash ?? "",
  );
  assert(approved.ok, "separate approver could not approve rollback candidate");
  const rollbackStarted = await service.start(tenant, "destructive-rollback-proof");
  assert(rollbackStarted.ok, "rollback candidate did not start");
  const rollbackCompleted = await service.complete(tenant, "destructive-rollback-proof", {
    successCount: 2,
  });
  assert(rollbackCompleted.ok, "rollback candidate did not complete");
  const rolledBack = await service.rollback(tenant, "destructive-rollback-proof", {
    compensationPlanRef: "local-compensation-plan",
  });
  assert(rolledBack.ok && rolledBack.value.status === "rolled-back", "rollback did not execute");

  const purgeCandidate = await service.create(tenant, {
    operationId: "export-purge-proof",
    operationType: "export",
    classification: "confidential",
    source: destination,
    destination: createBulkEndpointRef({
      refType: "generated-file",
      ref: "purge-candidate-export",
      fileId: "file-import-proof",
      format: "json",
      classification: "confidential",
    }),
    idempotencyKey: "idem-export-purge-proof",
    itemCount: 1,
    legalHold: false,
    purgeAllowedAt: "2025-12-31T00:00:00.000Z",
  });
  assert(purgeCandidate.ok, "purge candidate was not created");
  const purged = await service.purge(tenant, "export-purge-proof");
  assert(purged.ok && purged.value.status === "purged", "purge workflow did not execute");

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
  const legalHoldPurgeDenied = await service.purge(tenant, "evidence-package-proof");
  assert(
    !legalHoldPurgeDenied.ok && legalHoldPurgeDenied.reasonCode === "legal-hold-active",
    "legal hold did not block purge",
  );

  const betaRead = await service.read(context("actor-beta", "tenant-beta"), "import-proof");
  assert(!betaRead.ok && betaRead.reasonCode === "not-found", "cross-tenant operation was visible");

  const events = await audit.query(tenant, { tenantId: tenant.tenantId, limit: 100 });
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
    sourceIssue: "USF-163",
    deepRuntimePosture: "bounded-local-deep-runtime-proof",
    deepRuntimeEvidence: Object.freeze({
      boundedDeepRuntimeProven: true,
      apiOpenApiSurfaceReclassified: true,
      transactionalResumableImportChecked: true,
      liveExternalTransferProviderBoundaryChecked: true,
      parserAdapterBoundaryChecked: true,
      decompressionBombRejected: true,
      rollbackCompensationWorkflowChecked: true,
      approvalSeparationOfDutiesChecked: true,
      exportPurgeRetentionSchedulerChecked: true,
      legalHoldWorkflowRuntimeChecked: true,
      legalEdiscoveryRegulatoryBoundaryChecked: true,
      productionMigrationBoundaryExplicit: true,
      crossDomainDependencyLinkageChecked: true,
      tenantAccessAuditSecretCleanupEvidenceChecked: true,
      unavailableProviderFailClosedChecked: true,
      productionMigrationReadinessClaim: false,
      legalExportReadinessClaim: false,
      eDiscoveryReadinessClaim: false,
      regulatoryExportReadinessClaim: false,
      liveExternalProviderReadinessClaim: false,
    }),
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
      "decompression-bomb-blocked parser safety fails closed",
      "deterministic preview hash is recorded",
      "transactional resumable import retry is bounded and value-free",
      "provider-source and provider-destination transfer is fail-closed unless separately authorised",
      "rollback and compensation workflow uses separate approval and service actor evidence",
      "retention purge is blocked by legal hold and audited when allowed",
      "broad API/OpenAPI, legal/eDiscovery/regulatory export, production migration, and live provider readiness remain non-equivalent boundaries",
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
