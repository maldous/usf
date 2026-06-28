import { Type } from "@sinclair/typebox";

export const HealthResponseSchema = Type.Object({
  status: Type.Literal("ok"),
  service: Type.Literal("foundation-api"),
  providerMode: Type.Literal("dev in-memory"),
  providerClass: Type.Literal("hermetic-mock"),
  environment: Type.Literal("local"),
});

export const ReadyResponseSchema = Type.Object({
  status: Type.Literal("ready"),
  service: Type.Literal("foundation-api"),
  providerMode: Type.Literal("dev in-memory"),
  providerClass: Type.Literal("hermetic-mock"),
  environment: Type.Literal("local"),
  providers: Type.Record(Type.String(), Type.String()),
});

export const LoginRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  email: Type.String({ minLength: 3 }),
});

export const LoginResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  actorId: Type.String({ minLength: 1 }),
  providerMode: Type.Union([
    Type.Literal("hermetic-mock"),
    Type.Literal("local-composed-real-service"),
  ]),
  roles: Type.Array(Type.String()),
});

export const TenantContextResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  actorId: Type.String({ minLength: 1 }),
  roles: Type.Array(Type.String()),
  providerMode: Type.Literal("dev in-memory"),
  providerClass: Type.Literal("hermetic-mock"),
  environment: Type.Literal("local"),
  auditEvents: Type.Number({ minimum: 1 }),
});

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

// Authorization surfaces (parity-tenant-authz, USF-140). UI-consumable and safe:
// deny responses carry a non-enumerating reason code, never internal policy detail.

export const AuthorizeCheckRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  action: Type.String({ minLength: 1 }),
  resourceType: Type.String({ minLength: 1 }),
  resourceId: Type.String({ minLength: 1 }),
  dataClassification: Type.Optional(Type.String()),
  breakGlassGrantId: Type.Optional(Type.String()),
});

export const AuthorizeDecisionResponseSchema = Type.Object({
  effect: Type.Literal("permit"),
  action: Type.String(),
  reasonCode: Type.String(),
  obligations: Type.Array(Type.String()),
  policyVersion: Type.String(),
});

export const ForbiddenResponseSchema = Type.Object({
  error: Type.String(),
  reasonCode: Type.String(),
});

export const PermissionsResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  actorId: Type.String({ minLength: 1 }),
  active: Type.Boolean(),
  permissions: Type.Array(Type.String()),
});

// Audit/evidence surfaces (parity-audit, USF-142). Tenant-scoped, PDP-protected,
// RLS-backed, non-enumerating, and redacted. The view exposes a safe verification
// surface (sequence, event_hash, verification_status) but no internal chain plumbing.

const NullableString = Type.Union([Type.String(), Type.Null()]);

export const AuditEventViewSchema = Type.Object({
  eventId: Type.String(),
  eventType: Type.String(),
  eventVersion: Type.String(),
  category: Type.String(),
  severity: Type.String(),
  occurredAt: Type.String(),
  recordedAt: Type.String(),
  actorId: Type.String(),
  actorType: Type.String(),
  tenantId: Type.String(),
  scopeType: Type.String(),
  action: Type.String(),
  subjectType: Type.String(),
  subjectId: Type.String(),
  resourceType: Type.String(),
  resourceId: Type.String(),
  outcome: Type.String(),
  reasonCode: Type.String(),
  policyVersion: NullableString,
  decisionId: NullableString,
  correlationId: Type.String(),
  causationId: NullableString,
  traceId: NullableString,
  dataClassification: Type.String(),
  retentionPolicy: Type.String(),
  legalHold: Type.Boolean(),
  sequence: Type.Number(),
  eventHash: Type.String(),
  verificationStatus: Type.String(),
  metadata: Type.Record(Type.String(), Type.String()),
});

export const AuditEventsResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  events: Type.Array(AuditEventViewSchema),
  nextCursor: NullableString,
});

export const AuditVerifyRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
});

export const AuditVerifyResponseSchema = Type.Object({
  ok: Type.Boolean(),
  chainScope: Type.String(),
  count: Type.Number(),
  verifiedAt: Type.String(),
  brokenAtSequence: Type.Union([Type.Number(), Type.Null()]),
  reason: NullableString,
});

// Config/secrets surfaces (parity-config-secrets, USF-144). Tenant-scoped,
// PDP-protected, redacted, non-enumerating. Secret VALUES and raw provider
// credentials are never present in any of these schemas.

export const ConfigCurrentResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  schemaVersion: Type.String(),
  config: Type.Record(Type.String(), Type.String()),
});

export const FeatureFlagsResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  flags: Type.Record(Type.String(), Type.Boolean()),
});

export const ProviderStatusResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  providerMode: Type.String(),
  // Provider modes only (in-memory/local-composed-test/mock/live-external); never credentials.
  providers: Type.Record(Type.String(), Type.String()),
});

// Files/storage surfaces (parity-files-storage, USF-146). Tenant-scoped, PDP-protected,
// RLS-backed (DB substrate), redacted least-disclosure, non-enumerating. The view
// carries NO object key, bucket, provider ref, original filename, or credentials.

export const FileViewSchema = Type.Object({
  fileId: Type.String(),
  tenantId: Type.String(),
  ownerActorId: Type.String(),
  filenameSafe: Type.String(),
  contentType: Type.String(),
  sizeBytes: Type.Number(),
  checksumSha256: NullableString,
  status: Type.String(),
  scanStatus: Type.String(),
  classification: Type.String(),
  legalHold: Type.Boolean(),
  createdAt: Type.String(),
  verificationStatus: Type.String(),
});

export const FilesListResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  files: Type.Array(FileViewSchema),
  nextCursor: NullableString,
});

export const FileUploadRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  fileId: Type.String({ minLength: 1 }),
  filename: Type.String({ minLength: 1 }),
  contentType: Type.String({ minLength: 1 }),
  sizeBytes: Type.Number({ minimum: 0 }),
  body: Type.String(),
  classification: Type.Optional(Type.String()),
  declaredChecksum: Type.Optional(Type.String()),
});

export const FileDownloadResponseSchema = Type.Object({
  fileId: Type.String(),
  contentType: Type.String(),
  sizeBytes: Type.Number(),
  body: Type.String(),
});

export const FileVerifyResponseSchema = Type.Object({
  fileId: Type.String(),
  ok: Type.Boolean(),
  reasonCode: Type.String(),
});
