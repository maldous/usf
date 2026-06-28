import {
  createAuditEventDraft,
  createFileMetadata,
  isDownloadable,
  isSensitiveFileClassification,
  sha256Hex,
  stableId,
  toSafeFileView,
  type AuthorizationRequest,
  type FileClassification,
  type FileMetadata,
  type SafeFileView,
  type TenantContext,
} from "@foundation/core";
import type {
  AuditRecorder,
  FileMetadataStore,
  FilePage,
  FileQueryCriteria,
  ObjectStore,
  PolicyDecisionPoint,
  ScanProvider,
} from "@foundation/ports";

const COMPONENT = "file-service";

export class FileAccessDeniedError extends Error {
  readonly reasonCode: string;
  constructor(reasonCode: string) {
    super("Not authorized");
    this.name = "FileAccessDeniedError";
    this.reasonCode = reasonCode;
  }
}

export interface UploadFileInput {
  readonly fileId: string;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly body: string;
  readonly classification?: FileClassification;
  readonly declaredChecksum?: string;
  readonly legalHold?: boolean;
}

export interface FileAccessContext {
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly traceId?: string;
}

export interface FileService {
  upload(
    context: TenantContext,
    input: UploadFileInput,
    access?: FileAccessContext,
  ): Promise<SafeFileView>;
  download(
    context: TenantContext,
    fileId: string,
    access?: FileAccessContext,
  ): Promise<{ body: string; view: SafeFileView }>;
  get(
    context: TenantContext,
    fileId: string,
    access?: FileAccessContext,
  ): Promise<SafeFileView | undefined>;
  list(
    context: TenantContext,
    criteria: FileQueryCriteria,
    access?: FileAccessContext,
  ): Promise<{ files: readonly SafeFileView[]; nextCursor: string | null }>;
  remove(context: TenantContext, fileId: string, access?: FileAccessContext): Promise<SafeFileView>;
  restore(
    context: TenantContext,
    fileId: string,
    access?: FileAccessContext,
  ): Promise<SafeFileView>;
  purge(context: TenantContext, fileId: string, access?: FileAccessContext): Promise<void>;
  verify(
    context: TenantContext,
    fileId: string,
    access?: FileAccessContext,
  ): Promise<{ ok: boolean; reasonCode: string }>;
}

export function createFileService(deps: {
  readonly objectStore: ObjectStore;
  readonly metadataStore: FileMetadataStore;
  readonly scanProvider: ScanProvider;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly objectKeySalt: string;
}): FileService {
  let counter = 0;
  const nextEvtId = (kind: string, context: TenantContext): string =>
    stableId("evt", [context.tenantId, context.actorId, kind, String(counter++)]);

  function authzRequest(
    context: TenantContext,
    action: string,
    fileId: string,
    dataClassification: string,
    correlationId: string,
  ): AuthorizationRequest {
    return {
      context,
      action,
      resource: {
        type: "file",
        id: fileId,
        tenantId: context.tenantId,
        attributes: { data_classification: dataClassification },
      },
      requestContext: { correlation_id: correlationId },
    };
  }

  function correlationFor(context: TenantContext, access: FileAccessContext | undefined): string {
    return access?.correlationId ?? stableId("corr", [context.tenantId, context.actorId, "file"]);
  }

  async function audit(
    context: TenantContext,
    correlationId: string,
    fields: {
      eventType: string;
      action: string;
      outcome: "success" | "denied" | "failed";
      reasonCode: string;
      fileId: string;
      classification?: string;
      severity?: "debug" | "info" | "notice" | "warning" | "high";
      access?: FileAccessContext;
    },
  ): Promise<void> {
    await deps.audit.record(
      createAuditEventDraft({
        eventId: nextEvtId(fields.eventType, context),
        eventType: fields.eventType,
        category: "file",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: fields.action,
        outcome: fields.outcome,
        reasonCode: fields.reasonCode,
        subjectType: "file",
        subjectId: fields.fileId,
        resourceType: "file",
        resourceId: fields.fileId,
        correlationId,
        causationId: fields.access?.causationId ?? null,
        traceId: fields.access?.traceId ?? null,
        recordedByComponent: COMPONENT,
        ...(fields.severity ? { severity: fields.severity } : {}),
        // Metadata carries the data classification, never file contents or the object key.
        ...(fields.classification ? { metadata: { classification: fields.classification } } : {}),
      }),
    );
  }

  // PDP gate. For a sensitive-classification file, downloads/reads additionally require
  // the ABAC-escalated file.read decision (which resolves to the stronger sensitive
  // permission), so restricted/security-sensitive files need stronger authorization.
  function decide(
    context: TenantContext,
    action: string,
    fileId: string,
    dataClassification: string,
    correlationId: string,
  ): { ok: boolean; reasonCode: string } {
    const decision = deps.pdp.decide(
      authzRequest(context, action, fileId, dataClassification, correlationId),
    );
    return { ok: decision.effect === "permit", reasonCode: decision.reasonCode };
  }

  return {
    async upload(context, input, access) {
      const correlationId = correlationFor(context, access);
      const classification = input.classification ?? "confidential";
      const gate = decide(context, "file.create", input.fileId, classification, correlationId);
      if (!gate.ok) {
        await audit(context, correlationId, {
          eventType: "file.upload.failed",
          action: "file.create",
          outcome: "denied",
          reasonCode: gate.reasonCode,
          fileId: input.fileId,
          severity: "warning",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError(gate.reasonCode);
      }
      await audit(context, correlationId, {
        eventType: "file.upload.started",
        action: "file.create",
        outcome: "success",
        reasonCode: "started",
        fileId: input.fileId,
        ...(access ? { access } : {}),
      });
      let meta: FileMetadata;
      try {
        meta = createFileMetadata({
          fileId: input.fileId,
          tenantId: context.tenantId,
          ownerActorId: context.actorId,
          salt: deps.objectKeySalt,
          filenameOriginal: input.filename,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          body: input.body,
          classification,
          correlationId,
          ...(input.declaredChecksum !== undefined
            ? { declaredChecksum: input.declaredChecksum }
            : {}),
          ...(input.legalHold !== undefined ? { legalHold: input.legalHold } : {}),
        });
      } catch (error) {
        await audit(context, correlationId, {
          eventType: "file.upload.failed",
          action: "file.create",
          outcome: "failed",
          reasonCode:
            error instanceof Error && "reasonCode" in error
              ? String((error as { reasonCode: unknown }).reasonCode)
              : "invalid",
          fileId: input.fileId,
          severity: "warning",
          ...(access ? { access } : {}),
        });
        throw error;
      }
      // Scan posture: a non-clean result quarantines the object (fail closed).
      const scan = await deps.scanProvider.scan({
        tenantId: context.tenantId,
        objectKey: meta.objectKey,
        body: input.body,
      });
      const clean = scan.status === "clean" || scan.status === "not-required";
      await deps.objectStore.putObject({
        tenantId: context.tenantId,
        key: meta.objectKey,
        body: input.body,
      });
      const stored: FileMetadata = Object.freeze({
        ...meta,
        status: clean ? "available" : "quarantined",
        scanStatus: scan.status,
        quarantineReason: clean ? null : `scan:${scan.status}`,
      });
      await deps.metadataStore.insert(stored);
      await audit(context, correlationId, {
        eventType: clean ? "file.upload.completed" : "file.quarantined",
        action: "file.create",
        outcome: "success",
        reasonCode: clean ? "stored" : `scan-${scan.status}`,
        fileId: input.fileId,
        classification,
        severity: clean ? "info" : "high",
        ...(access ? { access } : {}),
      });
      return toSafeFileView(stored);
    },

    async download(context, fileId, access) {
      const correlationId = correlationFor(context, access);
      const meta = await deps.metadataStore.get(context, fileId);
      const cls = meta?.dataClassification ?? "confidential";
      const gate = decide(context, "file.download", fileId, cls, correlationId);
      // Sensitive files additionally require the ABAC-escalated read decision.
      const sensitiveGate =
        meta && isSensitiveFileClassification(meta.classification)
          ? decide(context, "file.read", fileId, cls, correlationId)
          : { ok: true, reasonCode: "ok" };
      if (!gate.ok || !sensitiveGate.ok) {
        await audit(context, correlationId, {
          eventType: "file.download.denied",
          action: "file.download",
          outcome: "denied",
          reasonCode: gate.ok ? sensitiveGate.reasonCode : gate.reasonCode,
          fileId,
          severity: "warning",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError(gate.ok ? sensitiveGate.reasonCode : gate.reasonCode);
      }
      if (!meta) {
        // Non-enumerating: a missing/cross-tenant file is reported as denied.
        await audit(context, correlationId, {
          eventType: "file.download.denied",
          action: "file.download",
          outcome: "denied",
          reasonCode: "not-found",
          fileId,
          severity: "warning",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError("not-found");
      }
      const gateState = isDownloadable(meta);
      if (!gateState.ok) {
        await audit(context, correlationId, {
          eventType: "file.download.denied",
          action: "file.download",
          outcome: "denied",
          reasonCode: gateState.reasonCode,
          fileId,
          classification: meta.classification,
          severity: "high",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError(gateState.reasonCode);
      }
      const body = await deps.objectStore.getObject({
        tenantId: context.tenantId,
        key: meta.objectKey,
      });
      if (body === undefined) {
        throw new FileAccessDeniedError("object-missing");
      }
      await audit(context, correlationId, {
        eventType: "file.downloaded",
        action: "file.download",
        outcome: "success",
        reasonCode: "ok",
        fileId,
        classification: meta.classification,
        ...(access ? { access } : {}),
      });
      return { body, view: toSafeFileView(meta) };
    },

    async get(context, fileId, access) {
      const correlationId = correlationFor(context, access);
      const meta = await deps.metadataStore.get(context, fileId);
      const cls = meta?.dataClassification ?? "confidential";
      const gate = decide(context, "file.read", fileId, cls, correlationId);
      if (!gate.ok) {
        await audit(context, correlationId, {
          eventType: "file.download.denied",
          action: "file.read",
          outcome: "denied",
          reasonCode: gate.reasonCode,
          fileId,
          severity: "warning",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError(gate.reasonCode);
      }
      if (!meta) return undefined;
      await audit(context, correlationId, {
        eventType: "file.metadata.viewed",
        action: "file.read",
        outcome: "success",
        reasonCode: "viewed",
        fileId,
        classification: meta.classification,
        ...(access ? { access } : {}),
      });
      return toSafeFileView(meta);
    },

    async list(context, criteria, access) {
      const correlationId = correlationFor(context, access);
      const gate = decide(context, "file.list", "*", "confidential", correlationId);
      if (!gate.ok) {
        await audit(context, correlationId, {
          eventType: "file.download.denied",
          action: "file.list",
          outcome: "denied",
          reasonCode: gate.reasonCode,
          fileId: "*",
          severity: "warning",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError(gate.reasonCode);
      }
      const page: FilePage = await deps.metadataStore.list(context, criteria);
      return { files: page.files.map(toSafeFileView), nextCursor: page.nextCursor };
    },

    async remove(context, fileId, access) {
      const correlationId = correlationFor(context, access);
      const meta = await deps.metadataStore.get(context, fileId);
      const cls = meta?.dataClassification ?? "confidential";
      const gate = decide(context, "file.delete", fileId, cls, correlationId);
      if (!gate.ok || !meta) {
        await audit(context, correlationId, {
          eventType: "file.download.denied",
          action: "file.delete",
          outcome: "denied",
          reasonCode: gate.ok ? "not-found" : gate.reasonCode,
          fileId,
          severity: "warning",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError(gate.ok ? "not-found" : gate.reasonCode);
      }
      // Soft delete: the object remains tenant-isolated; purge is a separate privileged path.
      const updated = await deps.metadataStore.update(context, fileId, {
        status: "deleted",
        deletedAt: new Date().toISOString(),
        updatedBy: context.actorId,
      });
      await audit(context, correlationId, {
        eventType: "file.deleted",
        action: "file.delete",
        outcome: "success",
        reasonCode: "soft-deleted",
        fileId,
        classification: meta.classification,
        severity: "notice",
        ...(access ? { access } : {}),
      });
      return toSafeFileView(updated!);
    },

    async restore(context, fileId, access) {
      const correlationId = correlationFor(context, access);
      const meta = await deps.metadataStore.get(context, fileId);
      const cls = meta?.dataClassification ?? "confidential";
      const gate = decide(context, "file.restore", fileId, cls, correlationId);
      if (!gate.ok || !meta) {
        throw new FileAccessDeniedError(gate.ok ? "not-found" : gate.reasonCode);
      }
      const updated = await deps.metadataStore.update(context, fileId, {
        status: "restored",
        deletedAt: null,
        updatedBy: context.actorId,
      });
      await audit(context, correlationId, {
        eventType: "file.restored",
        action: "file.restore",
        outcome: "success",
        reasonCode: "restored",
        fileId,
        classification: meta.classification,
        severity: "notice",
        ...(access ? { access } : {}),
      });
      return toSafeFileView(updated!);
    },

    async purge(context, fileId, access) {
      const correlationId = correlationFor(context, access);
      const meta = await deps.metadataStore.get(context, fileId);
      const cls = meta?.dataClassification ?? "confidential";
      const gate = decide(context, "file.purge", fileId, cls, correlationId);
      if (!gate.ok || !meta) {
        throw new FileAccessDeniedError(gate.ok ? "not-found" : gate.reasonCode);
      }
      // Legal hold blocks destructive purge (fail closed), recorded.
      if (meta.legalHold) {
        await audit(context, correlationId, {
          eventType: "file.download.denied",
          action: "file.purge",
          outcome: "denied",
          reasonCode: "legal-hold",
          fileId,
          classification: meta.classification,
          severity: "high",
          ...(access ? { access } : {}),
        });
        throw new FileAccessDeniedError("legal-hold");
      }
      await deps.objectStore.deleteObject({ tenantId: context.tenantId, key: meta.objectKey });
      await deps.metadataStore.update(context, fileId, {
        status: "purged",
        updatedBy: context.actorId,
      });
      await audit(context, correlationId, {
        eventType: "file.purged",
        action: "file.purge",
        outcome: "success",
        reasonCode: "purged",
        fileId,
        classification: meta.classification,
        severity: "high",
        ...(access ? { access } : {}),
      });
    },

    async verify(context, fileId, access) {
      const correlationId = correlationFor(context, access);
      const meta = await deps.metadataStore.get(context, fileId);
      const cls = meta?.dataClassification ?? "confidential";
      const gate = decide(context, "file.read", fileId, cls, correlationId);
      if (!gate.ok || !meta) {
        throw new FileAccessDeniedError(gate.ok ? "not-found" : gate.reasonCode);
      }
      const body = await deps.objectStore.getObject({
        tenantId: context.tenantId,
        key: meta.objectKey,
      });
      const recomputed = body === undefined ? null : sha256Hex(body);
      const ok = recomputed !== null && recomputed === meta.checksumSha256;
      await audit(context, correlationId, {
        eventType: "file.metadata.viewed",
        action: "file.read",
        outcome: ok ? "success" : "failed",
        reasonCode: ok ? "integrity-ok" : "integrity-mismatch",
        fileId,
        classification: meta.classification,
        severity: ok ? "notice" : "high",
        ...(access ? { access } : {}),
      });
      return { ok, reasonCode: ok ? "integrity-ok" : "integrity-mismatch" };
    },
  };
}
