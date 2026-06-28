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

export const ApiErrorResponseSchema = Type.Object({
  error: Type.String(),
  error_id: Type.String(),
  status: Type.Number(),
  code: Type.String(),
  reason_code: Type.String(),
  reasonCode: Type.Optional(Type.String()),
  safe_message: Type.String(),
  correlation_id: Type.String(),
  request_id: Type.String(),
  trace_id: Type.Union([Type.String(), Type.Null()]),
  details: Type.Optional(
    Type.Array(
      Type.Object({
        path: Type.String(),
        code: Type.String(),
        safe_message: Type.String(),
      }),
    ),
  ),
  documentation_ref: Type.Union([Type.String(), Type.Null()]),
  retry_after: Type.Union([Type.String(), Type.Null()]),
});

export const ErrorResponseSchema = ApiErrorResponseSchema;

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

export const ForbiddenResponseSchema = ApiErrorResponseSchema;

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

// Jobs/workflows API surfaces (parity-api-contracts, USF-154). Safe views only:
// no payload, no lease internals, no provider internals.

export const JobViewSchema = Type.Object({
  jobId: Type.String(),
  tenantId: Type.Union([Type.String(), Type.Null()]),
  classification: Type.String(),
  jobType: Type.String(),
  status: Type.String(),
  attempt: Type.Number(),
  maxRetries: Type.Number(),
  failureClass: Type.Union([Type.String(), Type.Null()]),
  safeFailureMessage: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.Number(),
});

export const JobsListResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  jobs: Type.Array(JobViewSchema),
  nextCursor: NullableString,
});

export const JobCreateRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  classification: Type.String({ minLength: 1 }),
  jobType: Type.String({ minLength: 1 }),
  payloadRefs: Type.Optional(Type.Record(Type.String(), Type.String())),
  maxRetries: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  priority: Type.Optional(Type.Number()),
  runAfterSec: Type.Optional(Type.Number({ minimum: 0 })),
});

export const JobCreateResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  deduplicated: Type.Boolean(),
  job: JobViewSchema,
});

export const TenantActionRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
});

export const ActionResultResponseSchema = Type.Object({
  ok: Type.Boolean(),
  reasonCode: Type.String(),
});

// Notifications/messaging API surfaces (parity-api-contracts, USF-154). Safe
// notification views expose recipient hashes, not raw addresses or message bodies.

export const NotificationVariableSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  required: Type.Boolean(),
  dataClassification: Type.String({ minLength: 1 }),
});

export const NotificationTemplateCreateRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  templateId: Type.String({ minLength: 1 }),
  templateKey: Type.String({ minLength: 1 }),
  templateVersion: Type.String({ minLength: 1 }),
  templateClassification: Type.String({ minLength: 1 }),
  subjectTemplate: Type.String({ minLength: 1 }),
  bodyTemplate: Type.String({ minLength: 1 }),
  allowedVariables: Type.Array(NotificationVariableSchema),
});

export const NotificationTemplateResponseSchema = Type.Object({
  templateId: Type.String(),
  templateKey: Type.String(),
  templateVersion: Type.String(),
  templateHash: Type.String(),
  templateStatus: Type.String(),
  templateClassification: Type.String(),
  allowedChannels: Type.Array(Type.String()),
  allowedNotificationClasses: Type.Array(Type.String()),
});

export const NotificationRecipientRequestSchema = Type.Object({
  recipientId: Type.String({ minLength: 1 }),
  recipientActorId: Type.Union([Type.String(), Type.Null()]),
  recipientTenantId: Type.String({ minLength: 1 }),
  recipientType: Type.String({ minLength: 1 }),
  addressRef: Type.String({ minLength: 1 }),
  addressType: Type.String({ minLength: 1 }),
  addressVerified: Type.Boolean(),
  addressStatus: Type.String({ minLength: 1 }),
  addressSource: Type.String({ minLength: 1 }),
  addressLastVerifiedAt: Type.Union([Type.String(), Type.Null()]),
});

export const NotificationCreateRequestSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  recipient: NotificationRecipientRequestSchema,
  channel: Type.String({ minLength: 1 }),
  classification: Type.String({ minLength: 1 }),
  templateId: Type.String({ minLength: 1 }),
  correlationId: Type.Optional(Type.String()),
});

export const NotificationViewSchema = Type.Object({
  notificationId: Type.String(),
  tenantId: Type.String(),
  recipientId: Type.String(),
  recipientType: Type.String(),
  recipientAddressHash: Type.String(),
  channel: Type.String(),
  classification: Type.String(),
  templateId: Type.String(),
  templateVersion: Type.String(),
  templateHash: Type.String(),
  deliveryStatus: Type.String(),
  providerMode: Type.String(),
  providerRef: Type.String(),
  providerMessageId: NullableString,
  idempotencyKey: Type.String(),
  retryCount: Type.Number(),
  maxRetries: Type.Number(),
  failureReasonCode: NullableString,
  safeFailureMessage: NullableString,
  dataClassification: Type.String(),
  retentionPolicy: Type.String(),
  legalHold: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const NotificationCreateResponseSchema = Type.Object({
  notification: NotificationViewSchema,
});

export const NotificationsListResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  notifications: Type.Array(NotificationViewSchema),
  nextCursor: NullableString,
});

export const NotificationSendResponseSchema = Type.Object({
  notification: NotificationViewSchema,
  jobId: Type.String(),
  deduplicated: Type.Boolean(),
});

export * from "./api-surface.ts";
