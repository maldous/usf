import { InMemoryImportExportStore } from "@foundation/adapter-bulk";
import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import { InMemoryFileMetadataStore } from "@foundation/adapter-store";
import { InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createBulkOperationService } from "@foundation/capability-bulk";
import {
  BulkOperationPolicyError,
  assertBulkFileFormatSafety,
  createBulkEndpointRef,
  createBulkItemOutcome,
  createBulkValidationError,
  createEvidencePackageManifest,
  createFileMetadata,
  createTenantContext,
  type AuthorizationRequest,
  type BulkEndpointRef,
  type BulkOperationClassification,
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
    const decision = (effect: PolicyDecision["effect"], reasonCode: string): PolicyDecision => ({
      decisionId: `decision-${request.context.tenantId}-${request.action}`,
      policyVersion: "test-policy",
      actorId: request.context.actorId,
      tenantId: request.context.tenantId,
      action: request.action,
      resourceType: request.resource.type,
      resourceId: request.resource.id,
      effect,
      reasonCode,
      safeMessage: effect === "permit" ? "permitted" : "denied",
      obligations: [],
      matchedPolicyIds: ["test-policy"],
      evaluationContextHash: "test-context-hash",
      correlationId: "corr-test",
      causationId: null,
      traceId: null,
      evaluatedAt: NOW.toISOString(),
    });
    if (request.resource.tenantId !== request.context.tenantId) {
      return decision("deny", "tenant-mismatch");
    }
    return this.allowed.has(request.action)
      ? decision("permit", "permitted")
      : decision("deny", "missing-permission");
  }
}

const allActions = new Set([
  "bulk.create",
  "bulk.read",
  "bulk.list",
  "bulk.validate",
  "bulk.preview",
  "bulk.approve",
  "bulk.start",
  "bulk.cancel",
  "bulk.retry",
  "import.create",
  "import.validate",
  "import.start",
  "export.create",
  "export.start",
  "audit_export.create",
  "evidence_package.create",
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

function endpoint(
  input: {
    refType?: string;
    ref?: string;
    fileId?: string | null;
    format?: string;
    classification?: BulkOperationClassification;
    scanStatus?: "not-required" | "pending" | "clean" | "infected" | "failed" | "quarantined";
  } = {},
): BulkEndpointRef {
  return createBulkEndpointRef({
    refType: input.refType ?? "uploaded-file",
    ref: input.ref ?? "bulk-file-ref",
    fileId: Object.hasOwn(input, "fileId") ? (input.fileId ?? null) : "file-import-alpha",
    format: input.format ?? "csv",
    classification: input.classification ?? "tenant-data",
    schemaId: "bulk-schema",
    schemaVersion: "1",
    schemaHash: "schema_hash_alpha",
    mappingId: "bulk-mapping",
    mappingVersion: "1",
    mappingHash: "mapping_hash_alpha",
    checksum: "checksum_alpha",
    scanStatus: input.scanStatus ?? "clean",
    dataResidencyPolicy: "local-dev-test",
  });
}

function destination(input: Partial<Parameters<typeof endpoint>[0]> = {}): BulkEndpointRef {
  return endpoint({
    refType: "generated-file",
    ref: "bulk-export-ref",
    fileId: "file-export-alpha",
    format: "json",
    ...input,
  });
}

function policy(overrides: Partial<GuardrailPolicy> = {}): GuardrailPolicy {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return {
    policyId: "bulk.guardrail.policy",
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
    limit: 10,
    windowSeconds: 60,
    burstLimit: null,
    lifecycle: "active",
    policyOwner: "platform",
    owningCapability: "import-export-bulk",
    riskLevel: "high",
    createdBy: "system",
    approvedBy: "system",
    lastReviewedAt: timestamp,
    reviewExpiresAt: null,
    changeReason: "local dev and test bulk guardrail",
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
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function setup(allowed: ReadonlySet<string> = allActions) {
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
    pdp: new TestPdp(allowed),
    now: () => NOW,
  });
  return { operations, audit, files, jobs, guardrails, telemetry, service };
}

async function seedFile(files: InMemoryFileMetadataStore, context: TenantContext, input = {}) {
  const body = "id,name\n1,Synthetic";
  const meta = createFileMetadata({
    fileId: "file-import-alpha",
    tenantId: context.tenantId,
    ownerActorId: context.actorId,
    salt: "test-salt",
    filenameOriginal: "bulk.csv",
    contentType: "text/csv",
    sizeBytes: body.length,
    body,
    classification: "confidential",
    correlationId: "corr-bulk",
  });
  await files.insert(Object.freeze({ ...meta, ...input }));
}

describe("import/export/bulk operations", () => {
  it("tenant A cannot read/list/start/cancel tenant B bulk operation", async () => {
    const { service } = setup();
    const beta = tenant("actor-beta", "tenant-beta");
    const alpha = tenant();

    const created = await service.create(beta, {
      operationId: "bulk-beta",
      operationType: "bulk-create",
      classification: "tenant-data",
      source: endpoint({
        refType: "system-internal",
        ref: "synthetic-source",
        fileId: null,
        format: "system-internal",
      }),
      destination: endpoint({
        refType: "system-internal",
        ref: "synthetic-destination",
        fileId: null,
        format: "system-internal",
      }),
      idempotencyKey: "idem-beta",
      itemCount: 1,
    });
    expect(created.ok).toBe(true);

    await expect(service.read(alpha, "bulk-beta")).resolves.toMatchObject({
      ok: false,
      reasonCode: "not-found",
    });
    await expect(service.list(alpha)).resolves.toMatchObject({ ok: true });
    const listed = await service.list(alpha);
    expect(listed.ok && listed.value.views).toHaveLength(0);
    await expect(service.start(alpha, "bulk-beta")).resolves.toMatchObject({
      ok: false,
      reasonCode: "not-found",
    });
    await expect(service.cancel(alpha, "bulk-beta")).resolves.toMatchObject({
      ok: false,
      reasonCode: "not-found",
    });
  });

  it("missing tenant context and missing PDP permission fail closed", async () => {
    expect(() => tenant("actor-alpha", "")).toThrow();
    const { service } = setup(new Set(["bulk.read"]));
    await expect(
      service.create(tenant(), {
        operationId: "bulk-denied",
        operationType: "bulk-create",
        classification: "tenant-data",
        source: endpoint({
          refType: "system-internal",
          ref: "source",
          fileId: null,
          format: "system-internal",
        }),
        destination: endpoint({
          refType: "system-internal",
          ref: "destination",
          fileId: null,
          format: "system-internal",
        }),
        idempotencyKey: "idem-denied",
        itemCount: 1,
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "missing-permission" });
  });

  it("unknown operation type and classification fail closed", async () => {
    const { service } = setup();
    await expect(
      service.create(tenant(), {
        operationId: "bulk-unknown-type",
        operationType: "not-a-type",
        classification: "tenant-data",
        source: endpoint(),
        destination: destination(),
        idempotencyKey: "idem-unknown-type",
      }),
    ).rejects.toThrow(BulkOperationPolicyError);
    await expect(
      service.create(tenant(), {
        operationId: "bulk-unknown-class",
        operationType: "import",
        classification: "not-a-classification",
        source: endpoint(),
        destination: destination(),
        idempotencyKey: "idem-unknown-class",
      }),
    ).rejects.toThrow(BulkOperationPolicyError);
  });

  it("requires idempotency and suppresses duplicate side effects", async () => {
    const { service, operations } = setup();
    await expect(
      service.create(tenant(), {
        operationId: "bulk-missing-idem",
        operationType: "bulk-create",
        classification: "tenant-data",
        source: endpoint({
          refType: "system-internal",
          ref: "source",
          fileId: null,
          format: "system-internal",
        }),
        destination: endpoint({
          refType: "system-internal",
          ref: "destination",
          fileId: null,
          format: "system-internal",
        }),
        itemCount: 1,
      }),
    ).rejects.toMatchObject({ reasonCode: "idempotency-required" });

    const first = await service.create(tenant(), {
      operationId: "bulk-idempotent-a",
      operationType: "bulk-create",
      classification: "tenant-data",
      source: endpoint({
        refType: "system-internal",
        ref: "source",
        fileId: null,
        format: "system-internal",
      }),
      destination: endpoint({
        refType: "system-internal",
        ref: "destination",
        fileId: null,
        format: "system-internal",
      }),
      idempotencyKey: "idem-duplicate",
      itemCount: 1,
    });
    const replay = await service.create(tenant(), {
      operationId: "bulk-idempotent-b",
      operationType: "bulk-create",
      classification: "tenant-data",
      source: endpoint({
        refType: "system-internal",
        ref: "source",
        fileId: null,
        format: "system-internal",
      }),
      destination: endpoint({
        refType: "system-internal",
        ref: "destination",
        fileId: null,
        format: "system-internal",
      }),
      idempotencyKey: "idem-duplicate",
      itemCount: 1,
    });

    expect(first.ok).toBe(true);
    expect(replay).toMatchObject({ ok: true, deduplicated: true });
    expect(operations.forTenant(tenant()).operations).toHaveLength(1);
  });

  it("dry-run and preview are deterministic and execution fails closed on mismatched approval hash", async () => {
    const { service, jobs } = setup();
    const created = await service.create(tenant(), {
      operationId: "export-high-risk",
      operationType: "export",
      classification: "high-risk",
      source: endpoint({
        refType: "system-internal",
        ref: "narrow-scope",
        fileId: null,
        format: "system-internal",
      }),
      destination: destination({ ref: "classified-export", fileId: "file-export-alpha" }),
      idempotencyKey: "idem-high-risk",
      dryRunRequired: true,
      itemCount: 5,
      exportScope: "field-allowlist-only",
    });
    expect(created.ok).toBe(true);
    const previewA = await service.preview(tenant(), "export-high-risk");
    const previewB = await service.preview(tenant(), "export-high-risk");
    expect(previewA.ok && previewB.ok && previewA.value.previewHash).toBe(
      previewB.ok ? previewB.value.previewHash : "not-ok",
    );
    expect(jobs.forTenant("tenant-alpha")).toHaveLength(0);

    const approver = tenant("actor-approver");
    const approved = await service.approve(
      approver,
      "export-high-risk",
      previewA.ok ? (previewA.value.previewHash ?? "") : "",
    );
    expect(approved.ok).toBe(true);
    await expect(
      service.start(tenant(), "export-high-risk", { approvedPreviewHash: "mismatched-preview" }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "preview-hash-mismatch" });
  });

  it("validation errors are safe, CSV formula injection is blocked, and quarantined imports cannot process", async () => {
    const { service, files } = setup();
    await expect(() =>
      assertBulkFileFormatSafety({ format: "csv", rows: [["=cmd|'/C calc'!A0"]] }),
    ).toThrow(BulkOperationPolicyError);

    const validationError = createBulkValidationError({
      rowNumber: 7,
      recordRef: "record-with-password",
      fieldPath: "email",
      safeErrorCode: "invalid-format",
      safeErrorMessage: "contains bearer token fixture",
    });
    expect(validationError.safeErrorMessage).toBe("bulk operation evidence");
    expect(validationError.recordRef).toMatch(/^rec_/);

    const context = tenant();
    await seedFile(files, context, { status: "quarantined", scanStatus: "infected" });
    const created = await service.create(context, {
      operationId: "import-quarantined",
      operationType: "import",
      classification: "tenant-data",
      source: endpoint({ scanStatus: "infected" }),
      destination: endpoint({
        refType: "system-internal",
        ref: "tenant-records",
        fileId: null,
        format: "system-internal",
      }),
      idempotencyKey: "idem-quarantine",
      itemCount: 1,
    });
    expect(created.ok).toBe(true);
    await expect(service.validate(context, "import-quarantined")).resolves.toMatchObject({
      ok: false,
      reasonCode: "scan-infected",
    });
  });

  it("file-backed export evidence and safe views do not leak object keys", async () => {
    const { service, audit } = setup();
    const context = tenant();
    const manifest = createEvidencePackageManifest({
      evidencePackageId: "evidence-package-alpha",
      packageVersion: "1",
      sourceQueryRef: "tenant-alpha audit events since fixed test instant",
      includedFileIds: ["file-export-alpha"],
      includedAuditEventIds: ["audit-event-alpha"],
      createdBy: context.actorId,
      retentionPolicy: "classification-aware-local-dev-test",
      chainOfCustodyRef: "custody-alpha",
      legalHold: true,
    });
    const created = await service.create(context, {
      operationId: "evidence-package-export-alpha",
      operationType: "evidence-package-export",
      classification: "audit-sensitive",
      source: endpoint({
        refType: "system-internal",
        ref: "audit-query-hash",
        fileId: null,
        format: "system-internal",
        classification: "audit-sensitive",
      }),
      destination: destination({
        refType: "evidence-package",
        fileId: "file-export-alpha",
        format: "evidence-package",
        classification: "audit-sensitive",
      }),
      idempotencyKey: "idem-evidence-package",
      dryRunRequired: true,
      itemCount: 1,
      evidencePackage: manifest,
      retentionPolicy: "classification-aware-local-dev-test",
      legalHold: true,
    });
    expect(created.ok && created.value).toMatchObject({
      evidencePackageId: "evidence-package-alpha",
      manifestHash: manifest.manifestHash,
      contentHash: manifest.contentHash,
      legalHold: true,
    });
    const events = await audit.query(context, { tenantId: context.tenantId, limit: 10 });
    const serialized = JSON.stringify({ view: created, events });
    expect(serialized).not.toContain("object_key");
    expect(serialized).not.toContain("raw payload");
    expect(serialized).not.toContain("secret");
  });

  it("guardrail denial is safe and operation jobs are tenant-scoped with concrete service actors", async () => {
    const { service, guardrails, jobs, telemetry, audit } = setup();
    const context = tenant();
    guardrails.upsertPolicy(policy({ limit: 0 }));
    const guarded = await service.create(context, {
      operationId: "bulk-guarded",
      operationType: "bulk-create",
      classification: "tenant-data",
      source: endpoint({
        refType: "system-internal",
        ref: "source",
        fileId: null,
        format: "system-internal",
      }),
      destination: endpoint({
        refType: "system-internal",
        ref: "destination",
        fileId: null,
        format: "system-internal",
      }),
      idempotencyKey: "idem-guarded",
      guardrailPolicyId: "bulk.guardrail.policy",
      itemCount: 2,
    });
    expect(guarded.ok).toBe(true);
    await expect(service.start(context, "bulk-guarded")).resolves.toMatchObject({
      ok: false,
      reasonCode: "quota-exceeded",
    });

    const executable = await service.create(context, {
      operationId: "import-job-backed",
      operationType: "import",
      classification: "tenant-data",
      source: endpoint({
        refType: "system-internal",
        ref: "source",
        fileId: null,
        format: "system-internal",
      }),
      destination: endpoint({
        refType: "system-internal",
        ref: "destination",
        fileId: null,
        format: "system-internal",
      }),
      idempotencyKey: "idem-job-backed",
      itemCount: 1,
    });
    expect(executable.ok).toBe(true);
    const started = await service.start(context, "import-job-backed");
    expect(started.ok && started.value.jobId).toBe("job_tenant-alpha_import-job-backed_bulk");
    const [job] = jobs.forTenant(context.tenantId);
    expect(job).toMatchObject({
      tenantId: context.tenantId,
      classification: "import-export-job",
      serviceActorId: "urn:usf:service:bulk-operations",
      idempotencyKey: "idem-job-backed",
    });

    const completed = await service.complete(context, "import-job-backed", {
      successCount: 1,
      outcomes: [
        createBulkItemOutcome({
          itemId: "row-1",
          rowNumber: 1,
          sourceRecordRef: "row synthetic",
          targetRecordRef: "tenant record synthetic",
          operation: "import",
          outcome: "succeeded",
          beforeRef: "before synthetic",
          afterRef: "after synthetic",
          correlationId: "corr-bulk",
        }),
      ],
    });
    expect(completed.ok && completed.value.status).toBe("succeeded");
    const signals = telemetry.query({ tenantId: context.tenantId, limit: 50 });
    expect(JSON.stringify(signals)).toContain("bulk.operation.denied");
    expect(JSON.stringify(signals)).toContain("bulk.operation.completed");
    expect(JSON.stringify(signals)).not.toContain("object_key");
    const events = await audit.query(context, { tenantId: context.tenantId, limit: 50 });
    expect(events.events.some((event) => event.eventType === "bulk.operation.denied")).toBe(true);
    expect(JSON.stringify(events)).not.toContain("raw payload");
  });
});
