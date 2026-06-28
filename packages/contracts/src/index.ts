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
