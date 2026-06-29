import {
  BULK_HIGH_RISK_CLASSIFICATIONS,
  BulkOperationPolicyError,
  createAuditEventDraft,
  createBulkOperationRecord,
  createBulkPreviewHash,
  isServiceActor,
  serviceActorId,
  stableId,
  toSafeBulkOperationView,
  type AuditEventOutcome,
  type BulkEndpointRef,
  type BulkItemOutcome,
  type BulkOperationClassification,
  type BulkOperationRecord,
  type BulkOperationStatus,
  type BulkOperationType,
  type BulkValidationError,
  type BulkValidationSummary,
  type EvidencePackageManifest,
  type GuardrailDecision,
  type JobRecord,
  type SafeBulkOperationView,
  type TenantContext,
} from "@foundation/core";
import type {
  AuditRecorder,
  FileMetadataStore,
  GuardrailPort,
  ImportExportPort,
  OperationalJobPort,
  PolicyDecisionPoint,
  TelemetryPort,
} from "@foundation/ports";

const COMPONENT = "bulk-operation-service";
const EXECUTOR_SERVICE_ACTOR = serviceActorId("bulk-operations");

export type BulkServiceOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly deduplicated?: boolean }
  | { readonly ok: false; readonly reasonCode: string; readonly guardrail?: GuardrailDecision };

export interface BulkCreateInput {
  readonly operationId: string;
  readonly operationType: string;
  readonly classification: string;
  readonly source: BulkEndpointRef;
  readonly destination: BulkEndpointRef;
  readonly fileId?: string | null;
  readonly idempotencyKey?: string;
  readonly guardrailPolicyId?: string | null;
  readonly dryRunRequired?: boolean;
  readonly noDryRunRationale?: string | null;
  readonly partialSuccessAllowed?: boolean;
  readonly maxErrorCount?: number;
  readonly maxErrorRate?: number;
  readonly rollbackSupported?: boolean;
  readonly compensationSupported?: boolean;
  readonly irreversibleOperation?: boolean;
  readonly irreversibleReason?: string | null;
  readonly exportScope?: string | null;
  readonly approvedScopeHash?: string | null;
  readonly validationSummary?: BulkValidationSummary;
  readonly itemCount?: number;
  readonly evidencePackage?: EvidencePackageManifest | null;
  readonly retentionPolicy?: string;
  readonly legalHold?: boolean;
  readonly retainUntil?: string | null;
  readonly purgeAllowedAt?: string | null;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly traceId?: string | null;
}

export interface BulkOperationService {
  create(
    context: TenantContext,
    input: BulkCreateInput,
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  read(
    context: TenantContext,
    operationId: string,
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  list(
    context: TenantContext,
    input?: { limit?: number; cursor?: string },
  ): Promise<
    BulkServiceOutcome<{ views: readonly SafeBulkOperationView[]; nextCursor: string | null }>
  >;
  validate(
    context: TenantContext,
    operationId: string,
    errors?: readonly BulkValidationError[],
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  preview(
    context: TenantContext,
    operationId: string,
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  approve(
    context: TenantContext,
    operationId: string,
    approvedPreviewHash: string,
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  start(
    context: TenantContext,
    operationId: string,
    input?: { approvedPreviewHash?: string },
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  cancel(
    context: TenantContext,
    operationId: string,
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  complete(
    context: TenantContext,
    operationId: string,
    input?: { successCount?: number; failureCount?: number; outcomes?: readonly BulkItemOutcome[] },
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
  fail(
    context: TenantContext,
    operationId: string,
    reasonCode: string,
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>>;
}

export function createBulkOperationService(deps: {
  readonly operations: ImportExportPort;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly files?: FileMetadataStore;
  readonly jobs?: OperationalJobPort;
  readonly guardrails?: GuardrailPort;
  readonly telemetry?: TelemetryPort;
  readonly now?: () => Date;
}): BulkOperationService {
  const now = deps.now ?? (() => new Date());
  let seq = 0;

  function authorize(
    context: TenantContext,
    action: string,
    resourceId: string,
    resourceTenantId: string,
    attributes: Record<string, string> = {},
  ): string | null {
    const decision = deps.pdp.decide({
      context,
      action,
      resource: {
        type: "bulk-operation",
        id: resourceId,
        tenantId: resourceTenantId,
        attributes,
      },
    });
    return decision.effect === "permit" ? null : decision.reasonCode;
  }

  async function audit(
    context: TenantContext,
    operation: BulkOperationRecord,
    input: {
      readonly eventType: string;
      readonly action: string;
      readonly outcome: AuditEventOutcome;
      readonly reasonCode: string;
      readonly status?: BulkOperationStatus;
    },
  ): Promise<void> {
    seq += 1;
    await deps.audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [
          operation.tenantId,
          operation.operationId,
          input.eventType,
          String(seq),
        ]),
        eventType: input.eventType,
        category: "bulk-operation",
        tenantId: operation.tenantId,
        actorId: context.actorId,
        action: input.action,
        outcome: input.outcome,
        reasonCode: input.reasonCode,
        subjectType: "bulk-operation",
        subjectId: operation.operationId,
        resourceType: "bulk-operation",
        resourceId: operation.operationId,
        correlationId: operation.correlationId,
        causationId: operation.causationId,
        traceId: operation.traceId,
        recordedByComponent: COMPONENT,
        metadata: {
          operationType: operation.operationType,
          classification: operation.classification,
          status: input.status ?? operation.status,
          guardrailPolicyId: operation.guardrailPolicyId ?? "none",
          jobId: operation.jobId ?? "none",
        },
      }),
    );
  }

  function recordSignal(
    eventName: string,
    operation: BulkOperationRecord,
    reasonCode = "ok",
  ): void {
    deps.telemetry?.recordSecuritySignal({
      eventName,
      severity:
        eventName.includes("large_export") || eventName.includes("denied") ? "warning" : "info",
      reasonCode,
      safeSummary: eventName,
      context: {
        tenantId: operation.tenantId,
        ...(operation.actorId ? { actorId: operation.actorId } : {}),
        ...(operation.serviceActorId ? { serviceActorId: operation.serviceActorId } : {}),
        operationId: operation.operationId,
        capability: "import-export-bulk",
        ...(operation.jobId ? { jobId: operation.jobId } : {}),
        correlationId: operation.correlationId,
        requestId: operation.requestId,
        ...(operation.traceId ? { traceId: operation.traceId } : {}),
      },
      attributes: {
        operation_id: operation.operationId,
        operation_type: operation.operationType,
        classification: operation.classification,
        status: operation.status,
      },
      classification: "security",
    });
  }

  async function denied(
    context: TenantContext,
    operation: BulkOperationRecord,
    action: string,
    reasonCode: string,
  ): Promise<BulkServiceOutcome<SafeBulkOperationView>> {
    await audit(context, operation, {
      eventType: "bulk.operation.denied",
      action,
      outcome: "denied",
      reasonCode,
    });
    recordSignal("bulk.operation.denied", operation, reasonCode);
    return { ok: false, reasonCode };
  }

  async function loadForAction(
    context: TenantContext,
    operationId: string,
    action: string,
  ): Promise<BulkServiceOutcome<BulkOperationRecord>> {
    const denyReason = authorize(context, action, operationId, context.tenantId);
    if (denyReason) {
      const skeleton = skeletonOperation(context, operationId);
      await audit(context, skeleton, {
        eventType: "bulk.operation.denied",
        action,
        outcome: "denied",
        reasonCode: denyReason,
      });
      return { ok: false, reasonCode: denyReason };
    }
    const operation = deps.operations.get(context, operationId);
    if (!operation) return { ok: false, reasonCode: "not-found" };
    return { ok: true, value: operation };
  }

  async function rejectIfSourceFileUnsafe(
    context: TenantContext,
    operation: BulkOperationRecord,
  ): Promise<string | null> {
    const fileId = operation.source.fileId;
    if (!fileId) return null;
    if (["quarantined", "infected", "pending"].includes(operation.source.scanStatus ?? "")) {
      return `scan-${operation.source.scanStatus}`;
    }
    if (!deps.files) return null;
    const file = await deps.files.get(context, fileId);
    if (!file) return "file-unavailable";
    if (file.status === "quarantined" || !["clean", "not-required"].includes(file.scanStatus)) {
      return `scan-${file.scanStatus}`;
    }
    return null;
  }

  async function applyGuardrail(
    context: TenantContext,
    operation: BulkOperationRecord,
  ): Promise<GuardrailDecision | null> {
    if (!operation.guardrailPolicyId || !deps.guardrails) return null;
    const decision = deps.guardrails.evaluate({
      policyId: operation.guardrailPolicyId,
      tenantId: context.tenantId,
      subjectRef: context.actorId,
      actorId: context.actorId,
      operationId: operation.operationId,
      resourceType: operation.operationType,
      quantity: Math.max(operation.itemCount, 1),
      idempotencyKey: operation.idempotencyKey,
      requestFingerprint: operation.operationFingerprint,
      correlationId: operation.correlationId,
      requestId: operation.requestId,
      traceId: operation.traceId,
    });
    if (["allow", "monitor-only", "shadow-deny"].includes(decision.decision)) return null;
    return decision;
  }

  function persist(
    context: TenantContext,
    operation: BulkOperationRecord,
    patch: Partial<BulkOperationRecord>,
  ): BulkOperationRecord {
    const updated = Object.freeze({
      ...operation,
      ...patch,
      updatedAt: now().toISOString(),
    }) as BulkOperationRecord;
    deps.operations.put(context, updated);
    return updated;
  }

  function enqueueJob(context: TenantContext, operation: BulkOperationRecord): string {
    const existingJobId = operation.jobId;
    if (existingJobId) return existingJobId;
    const created = Math.floor(now().getTime() / 1000);
    const jobId = stableId("job", [operation.tenantId, operation.operationId, "bulk"]);
    const job: JobRecord = Object.freeze({
      jobId,
      tenantId: operation.tenantId,
      classification: "import-export-job",
      jobType: "bulk.operation.execute",
      status: "queued",
      actorId: context.actorId,
      serviceActorId: EXECUTOR_SERVICE_ACTOR,
      idempotencyKey: operation.idempotencyKey,
      correlationId: operation.correlationId,
      priority: 0,
      runAfter: created,
      attempt: 0,
      maxRetries: 3,
      leaseOwner: null,
      leaseExpiresAt: null,
      deadLetterReason: null,
      failureClass: null,
      safeFailureMessage: null,
      payloadRefs: Object.freeze({
        operationId: operation.operationId,
        operationType: operation.operationType,
        classification: operation.classification,
      }),
      createdAt: created,
      updatedAt: created,
    });
    if (!isServiceActor(job.serviceActorId ?? "")) {
      throw new BulkOperationPolicyError("service-actor-required", "bulk job service actor denied");
    }
    deps.jobs?.submit(job);
    return jobId;
  }

  return {
    async create(context, input) {
      const operation = createBulkOperationRecord({
        ...input,
        tenantId: context.tenantId,
        actorId: context.actorId,
        serviceActorId: null,
        status: "draft",
        createdAt: now().toISOString(),
        updatedAt: now().toISOString(),
      });
      const action = createActionFor(operation.operationType);
      const denyReason = authorize(context, action, operation.operationId, context.tenantId, {
        operation_type: operation.operationType,
        classification: operation.classification,
      });
      if (denyReason) return denied(context, operation, action, denyReason);
      const existing = deps.operations.findByIdempotencyKey(context, operation.idempotencyKey);
      if (existing) {
        return {
          ok: true,
          value: toSafeBulkOperationView(existing),
          deduplicated: true,
        };
      }
      const created = deps.operations.create(operation);
      await audit(context, created, {
        eventType: eventForCreate(created.operationType),
        action,
        outcome: "success",
        reasonCode: "created",
      });
      recordSignal(signalForCreate(created.operationType), created);
      if (
        created.operationType === "export" ||
        created.operationType === "bulk-file-export" ||
        created.operationType === "audit-export"
      ) {
        recordSignal("bulk.operation.large_export", created, "large-export-posture-recorded");
      }
      return { ok: true, value: toSafeBulkOperationView(created), deduplicated: false };
    },

    async read(context, operationId) {
      const loaded = await loadForAction(context, operationId, "bulk.read");
      if (!loaded.ok) return loaded;
      return { ok: true, value: toSafeBulkOperationView(loaded.value) };
    },

    async list(context, input = {}) {
      const denyReason = authorize(
        context,
        "bulk.list",
        stableId("bulk-list", [context.tenantId]),
        context.tenantId,
      );
      if (denyReason) return { ok: false, reasonCode: denyReason };
      const page = deps.operations.forTenant(context, input);
      return {
        ok: true,
        value: {
          views: Object.freeze(page.operations.map(toSafeBulkOperationView)),
          nextCursor: page.nextCursor,
        },
      };
    },

    async validate(context, operationId, errors = []) {
      const loaded = await loadForAction(context, operationId, validateActionFor(operationId));
      if (!loaded.ok) return loaded;
      const unsafeFile = await rejectIfSourceFileUnsafe(context, loaded.value);
      if (unsafeFile) {
        const rejected = persist(context, loaded.value, {
          status: "quarantined",
          safeFailureMessage: unsafeFile,
        });
        await audit(context, rejected, {
          eventType: "bulk.operation.failed",
          action: "bulk.validate",
          outcome: "failed",
          reasonCode: unsafeFile,
          status: "quarantined",
        });
        recordSignal("bulk.quarantined", rejected, unsafeFile);
        return { ok: false, reasonCode: unsafeFile };
      }
      const validationSummary: BulkValidationSummary = Object.freeze({
        valid: errors.length === 0,
        itemCount: loaded.value.itemCount,
        errorCount: errors.length,
        errors: Object.freeze([...errors]),
      });
      const status: BulkOperationStatus = errors.length === 0 ? "validating" : "rejected";
      const updated = persist(context, loaded.value, { validationSummary, status });
      await audit(context, updated, {
        eventType: eventForValidated(updated.operationType),
        action: "bulk.validate",
        outcome: errors.length === 0 ? "success" : "failed",
        reasonCode: errors.length === 0 ? "valid" : "validation-failed",
        status,
      });
      if (errors.length > 0) recordSignal("bulk.validation.failed", updated, "validation-failed");
      return { ok: true, value: toSafeBulkOperationView(updated) };
    },

    async preview(context, operationId) {
      const loaded = await loadForAction(context, operationId, "bulk.preview");
      if (!loaded.ok) return loaded;
      const previewHash = createBulkPreviewHash({
        operationId: loaded.value.operationId,
        operationType: loaded.value.operationType,
        classification: loaded.value.classification,
        itemCount: loaded.value.itemCount,
        validationSummary: loaded.value.validationSummary,
        exportScope: loaded.value.exportScope,
      });
      const updated = persist(context, loaded.value, { previewHash, status: "previewed" });
      await audit(context, updated, {
        eventType: "bulk.operation.previewed",
        action: "bulk.preview",
        outcome: "success",
        reasonCode: "previewed",
        status: "previewed",
      });
      return { ok: true, value: toSafeBulkOperationView(updated) };
    },

    async approve(context, operationId, approvedPreviewHash) {
      const loaded = await loadForAction(context, operationId, "bulk.approve");
      if (!loaded.ok) return loaded;
      if (
        BULK_HIGH_RISK_CLASSIFICATIONS.includes(loaded.value.classification) &&
        loaded.value.actorId === context.actorId
      ) {
        return denied(context, loaded.value, "bulk.approve", "requester-cannot-self-approve");
      }
      if (!loaded.value.previewHash || loaded.value.previewHash !== approvedPreviewHash) {
        return denied(context, loaded.value, "bulk.approve", "preview-hash-mismatch");
      }
      const updated = persist(context, loaded.value, {
        approvedPreviewHash,
        status: "approved",
      });
      await audit(context, updated, {
        eventType: "bulk.operation.approved",
        action: "bulk.approve",
        outcome: "success",
        reasonCode: "approved",
        status: "approved",
      });
      return { ok: true, value: toSafeBulkOperationView(updated) };
    },

    async start(context, operationId, input = {}) {
      const loaded = await loadForAction(context, operationId, startActionFor(operationId));
      if (!loaded.ok) return loaded;
      const operation = loaded.value;
      if (["cancelled", "expired", "purged"].includes(operation.status)) {
        return denied(context, operation, "bulk.start", "operation-not-runnable");
      }
      const unsafeFile = await rejectIfSourceFileUnsafe(context, operation);
      if (unsafeFile) return denied(context, operation, "bulk.start", unsafeFile);
      if (
        operation.dryRunRequired &&
        operation.previewHash &&
        operation.approvedPreviewHash &&
        operation.approvedPreviewHash !== operation.previewHash
      ) {
        return denied(context, operation, "bulk.start", "preview-hash-mismatch");
      }
      if (
        operation.dryRunRequired &&
        !operation.approvedPreviewHash &&
        !input.approvedPreviewHash
      ) {
        return denied(context, operation, "bulk.start", "preview-approval-required");
      }
      if (input.approvedPreviewHash && operation.previewHash !== input.approvedPreviewHash) {
        return denied(context, operation, "bulk.start", "preview-hash-mismatch");
      }
      const guardrail = await applyGuardrail(context, operation);
      if (guardrail) {
        await audit(context, operation, {
          eventType: "bulk.operation.denied",
          action: "bulk.start",
          outcome: "denied",
          reasonCode: guardrail.reasonCode,
        });
        recordSignal("bulk.operation.denied", operation, guardrail.reasonCode);
        return { ok: false, reasonCode: guardrail.reasonCode, guardrail };
      }
      const jobId = enqueueJob(context, operation);
      const updated = persist(context, operation, {
        jobId,
        serviceActorId: EXECUTOR_SERVICE_ACTOR,
        status: "running",
        approvedPreviewHash: input.approvedPreviewHash ?? operation.approvedPreviewHash,
      });
      await audit(context, updated, {
        eventType: eventForStarted(updated.operationType),
        action: startActionFor(updated.operationType),
        outcome: "success",
        reasonCode: "started",
        status: "running",
      });
      recordSignal("bulk.operation.started", updated);
      return { ok: true, value: toSafeBulkOperationView(updated) };
    },

    async cancel(context, operationId) {
      const loaded = await loadForAction(context, operationId, "bulk.cancel");
      if (!loaded.ok) return loaded;
      const updated = persist(context, loaded.value, { status: "cancelled" });
      if (updated.jobId && deps.jobs) {
        const job = deps.jobs.get(updated.jobId);
        if (job)
          deps.jobs.put(
            Object.freeze({
              ...job,
              status: "cancelled",
              updatedAt: Math.floor(now().getTime() / 1000),
            }),
          );
      }
      await audit(context, updated, {
        eventType: "bulk.operation.cancelled",
        action: "bulk.cancel",
        outcome: "success",
        reasonCode: "cancelled",
        status: "cancelled",
      });
      return { ok: true, value: toSafeBulkOperationView(updated) };
    },

    async complete(context, operationId, input = {}) {
      const loaded = await loadForAction(context, operationId, "bulk.start");
      if (!loaded.ok) return loaded;
      for (const outcome of input.outcomes ?? []) {
        deps.operations.appendItemOutcome(context, operationId, outcome);
      }
      const successCount = Math.max(input.successCount ?? loaded.value.itemCount, 0);
      const failureCount = Math.max(input.failureCount ?? 0, 0);
      const status: BulkOperationStatus = failureCount > 0 ? "partially-succeeded" : "succeeded";
      const updated = persist(context, loaded.value, { successCount, failureCount, status });
      await audit(context, updated, {
        eventType: eventForCompleted(updated.operationType),
        action: "bulk.start",
        outcome: failureCount > 0 ? "partial" : "success",
        reasonCode: failureCount > 0 ? "partial-success" : "completed",
        status,
      });
      recordSignal("bulk.operation.completed", updated);
      if (failureCount > 0) recordSignal("bulk.partial_success", updated, "partial-success");
      return { ok: true, value: toSafeBulkOperationView(updated) };
    },

    async fail(context, operationId, reasonCode) {
      const loaded = await loadForAction(context, operationId, "bulk.retry");
      if (!loaded.ok) return loaded;
      const updated = persist(context, loaded.value, {
        status: "failed",
        safeFailureMessage: reasonCode,
      });
      await audit(context, updated, {
        eventType: eventForFailed(updated.operationType),
        action: "bulk.retry",
        outcome: "failed",
        reasonCode,
        status: "failed",
      });
      recordSignal("bulk.operation.failed", updated, reasonCode);
      return { ok: true, value: toSafeBulkOperationView(updated) };
    },
  };
}

function skeletonOperation(context: TenantContext, operationId: string): BulkOperationRecord {
  const endpoint = {
    refType: "system-internal",
    ref: "denied-operation",
    fileId: null,
    format: "system-internal",
    classification: "low-risk",
    schemaId: null,
    schemaVersion: null,
    schemaHash: null,
    mappingId: null,
    mappingVersion: null,
    mappingHash: null,
    checksum: null,
    scanStatus: null,
    dataResidencyPolicy: null,
  } as const;
  return createBulkOperationRecord({
    operationId,
    operationType: "import",
    classification: "low-risk",
    tenantId: context.tenantId,
    actorId: context.actorId,
    source: endpoint,
    destination: endpoint,
    idempotencyKey: stableId("bulk-denied", [context.tenantId, operationId]),
  });
}

function createActionFor(type: BulkOperationType): string {
  if (type === "import") return "import.create";
  if (type === "export" || type === "bulk-file-export") return "export.create";
  if (type === "audit-export") return "audit_export.create";
  if (type === "evidence-package-export") return "evidence_package.create";
  return "bulk.create";
}

function validateActionFor(operationId: string): string {
  return operationId.startsWith("import") ? "import.validate" : "bulk.validate";
}

function startActionFor(value: BulkOperationType | string): string {
  if (value === "import" || String(value).startsWith("import")) return "import.start";
  if (value === "export" || value === "bulk-file-export" || String(value).startsWith("export")) {
    return "export.start";
  }
  return "bulk.start";
}

function eventForCreate(type: BulkOperationType): string {
  if (type === "import") return "import.created";
  if (type === "export" || type === "bulk-file-export" || type === "audit-export")
    return "export.created";
  if (type === "evidence-package-export") return "evidence_package.created";
  return "bulk.operation.created";
}

function eventForValidated(type: BulkOperationType): string {
  return type === "import" ? "import.validated" : "bulk.operation.validated";
}

function eventForStarted(type: BulkOperationType): string {
  if (type === "import") return "import.started";
  if (type === "export" || type === "bulk-file-export" || type === "audit-export")
    return "export.started";
  return "bulk.operation.started";
}

function eventForCompleted(type: BulkOperationType): string {
  if (type === "import") return "import.completed";
  if (type === "export" || type === "bulk-file-export" || type === "audit-export")
    return "export.completed";
  return "bulk.operation.completed";
}

function eventForFailed(type: BulkOperationType): string {
  if (type === "import") return "import.failed";
  if (type === "export" || type === "bulk-file-export" || type === "audit-export")
    return "export.failed";
  return "bulk.operation.failed";
}

function signalForCreate(type: BulkOperationType): string {
  if (type === "audit-export") return "audit_export.created";
  if (type === "evidence-package-export") return "evidence_package.created";
  if (type === "export" || type === "bulk-file-export") return "export.created";
  return "bulk.operation.started";
}

export type {
  BulkEndpointRef,
  BulkItemOutcome,
  BulkOperationClassification,
  BulkOperationRecord,
  BulkOperationStatus,
  BulkOperationType,
  EvidencePackageManifest,
  SafeBulkOperationView,
};
