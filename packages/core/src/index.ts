import { createHash, createHmac } from "node:crypto";

export type ProviderMode = "hermetic-mock" | "local-composed-real-service";

export type ExecutionEnvironment = "hermetic" | "local" | "integration";

export type PersistentObjectClassification =
  | "tenant-scoped"
  | "global-reference"
  | "system-internal"
  | "cross-tenant-aggregate"
  | "audit-evidence"
  | "migration-control-plane";

export interface TenantContext {
  readonly tenantId: string;
  readonly actorId: string;
  readonly roles: readonly string[];
  readonly providerMode: ProviderMode;
  readonly environment: ExecutionEnvironment;
}

export interface IdentityClaims {
  readonly subject: string;
  readonly tenantId: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly providerMode: ProviderMode;
}

export interface AuditRecord {
  readonly id: string;
  readonly action: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly subject: string;
  readonly occurredAt: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export class TenantMismatchError extends Error {
  constructor(expectedTenant: string, observedTenant: string, location: string) {
    super(`Tenant mismatch at ${location}: expected ${expectedTenant}, observed ${observedTenant}`);
    this.name = "TenantMismatchError";
  }
}

export class MissingTenantContextError extends Error {
  constructor(location: string) {
    super(`Missing tenant context at ${location}`);
    this.name = "MissingTenantContextError";
  }
}

export function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} must be non-empty`);
  }
  return trimmed;
}

export function assertTenantMatch(
  context: TenantContext,
  observedTenantId: string,
  location: string,
): void {
  const observed = assertNonEmpty(observedTenantId, `${location}.tenantId`);
  if (context.tenantId !== observed) {
    throw new TenantMismatchError(context.tenantId, observed, location);
  }
}

export function createTenantContext(input: {
  tenantId: string;
  actorId: string;
  roles?: readonly string[];
  providerMode?: ProviderMode;
  environment?: ExecutionEnvironment;
}): TenantContext {
  return Object.freeze({
    tenantId: assertNonEmpty(input.tenantId, "tenantId"),
    actorId: assertNonEmpty(input.actorId, "actorId"),
    roles: Object.freeze([...(input.roles ?? [])]),
    providerMode: input.providerMode ?? "hermetic-mock",
    environment: input.environment ?? "hermetic",
  });
}

export function createAuditRecord(input: {
  id: string;
  action: string;
  tenantId: string;
  actorId: string;
  subject: string;
  metadata?: Readonly<Record<string, string>>;
  occurredAt?: string;
}): AuditRecord {
  return Object.freeze({
    id: assertNonEmpty(input.id, "id"),
    action: assertNonEmpty(input.action, "action"),
    tenantId: assertNonEmpty(input.tenantId, "tenantId"),
    actorId: assertNonEmpty(input.actorId, "actorId"),
    subject: assertNonEmpty(input.subject, "subject"),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

export function stableId(prefix: string, parts: readonly string[]): string {
  return `${assertNonEmpty(prefix, "prefix")}_${parts.map((part) => assertNonEmpty(part, "idPart")).join("_")}`;
}

// ---------------------------------------------------------------------------
// Authorization model (parity-tenant-authz, USF-140).
// Identity is not authorization: IdP/claims supply identity inputs; the USF PDP
// makes the final application-layer decision; Postgres RLS is the DB backstop.
// ---------------------------------------------------------------------------

export type AuthorizationEffect = "permit" | "deny";

export type MembershipStatus =
  "pending" | "invited" | "active" | "suspended" | "revoked" | "expired" | "deleted";

/** A stable internal actor, mapped from an external IdP subject + provider. */
export interface ActorIdentity {
  readonly actorId: string;
  readonly externalSubject: string;
  readonly identityProvider: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly enabled: boolean;
}

export interface TenantMembership {
  readonly membershipId: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly status: MembershipStatus;
  readonly roles: readonly string[];
}

export interface AuthorizationResource {
  readonly type: string;
  readonly id: string;
  readonly tenantId: string;
  readonly attributes: Readonly<Record<string, string>>;
}

export interface AuthorizationRequest {
  readonly context: TenantContext;
  readonly action: string;
  readonly resource: AuthorizationResource;
  readonly requestContext?: Readonly<Record<string, string>>;
  readonly breakGlassGrantId?: string;
}

/** Structured policy decision (ADR 0010). Permit is explicit; deny is default. */
export interface PolicyDecision {
  readonly decisionId: string;
  readonly policyVersion: string;
  readonly actorId: string;
  readonly tenantId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly effect: AuthorizationEffect;
  readonly reasonCode: string;
  readonly safeMessage: string;
  readonly obligations: readonly string[];
  readonly matchedPolicyIds: readonly string[];
  readonly evaluationContextHash: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly traceId: string | null;
  readonly evaluatedAt: string;
}

export function isActiveMembership(membership: TenantMembership | undefined): boolean {
  return membership?.status === "active";
}

// ---------------------------------------------------------------------------
// Audit / evidence model (parity-audit, USF-142).
//
// Audit is tenant-safe, tamper-evident, queryable EVIDENCE, not logging: every
// event is structured, classified, append-only (corrections are compensating
// records), and chained. This is ISO 27001-supporting technical control evidence
// only; it makes no certification claim. See
// docs/architecture/audit-evidence-standard.md. The DB substrate (USF-138,
// adapters/db/migrations/0002) carries the same fields and an independent
// Postgres-side append-only hash chain; this is the application-layer model.
// ---------------------------------------------------------------------------

export const AUDIT_SCHEMA_VERSION = "audit-event-1";

/** Five-value sensitivity scale, aligned with the DB data_classification CHECK. */
export type DataSensitivity =
  "public" | "internal" | "confidential" | "restricted" | "security-sensitive";

export const AUDIT_CATEGORIES = Object.freeze([
  "authentication",
  "authorization",
  "tenant-context",
  "break-glass",
  "data-access",
  "data-mutation",
  "configuration",
  "file",
  "notification",
  "job",
  "guardrail",
  "bulk-operation",
  "search",
  "integration",
  "security",
  "admin",
  "system",
  "audit-system",
] as const);
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_SEVERITIES = Object.freeze([
  "debug",
  "info",
  "notice",
  "warning",
  "high",
  "critical",
] as const);
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_EVENT_OUTCOMES = Object.freeze([
  "success",
  "denied",
  "failed",
  "error",
  "partial",
  "compensated",
] as const);
export type AuditEventOutcome = (typeof AUDIT_EVENT_OUTCOMES)[number];

export interface AuditEventTypeDef {
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  /** Defined for stability/forward-compat but not emitted by this slice. */
  readonly reserved?: boolean;
}

// Canonical event taxonomy. Event-type names are stable; reserved types are
// schema-reserved future definitions (the model accepts them; this slice does not
// emit them). Detection-hook classes are reserved future event definitions.
export const AUDIT_EVENT_TYPES: Readonly<Record<string, AuditEventTypeDef>> = Object.freeze({
  "authentication.login": { category: "authentication", severity: "info" },
  "authorization.decision": { category: "authorization", severity: "notice" },
  "tenant.context.accepted": { category: "tenant-context", severity: "info" },
  "tenant.context.denied": { category: "tenant-context", severity: "warning" },
  "break_glass.requested": { category: "break-glass", severity: "high", reserved: true },
  "break_glass.approved": { category: "break-glass", severity: "high", reserved: true },
  "break_glass.used": { category: "break-glass", severity: "high" },
  "break_glass.denied": { category: "break-glass", severity: "warning" },
  "data.created": { category: "data-mutation", severity: "info", reserved: true },
  "data.updated": { category: "data-mutation", severity: "info", reserved: true },
  "data.deleted": { category: "data-mutation", severity: "warning", reserved: true },
  "data.restored": { category: "data-mutation", severity: "warning", reserved: true },
  "data.purged": { category: "data-mutation", severity: "high", reserved: true },
  "data.read": { category: "data-access", severity: "info", reserved: true },
  "configuration.changed": { category: "configuration", severity: "warning", reserved: true },
  // Provider trust boundaries (parity-provider-adapters-modes, USF-133). These
  // events are value-free: no raw endpoint, credential, token, request/response
  // body, private provider detail, or stack trace is permitted in metadata.
  "provider.registered": { category: "integration", severity: "notice", reserved: true },
  "provider.configured": { category: "integration", severity: "warning", reserved: true },
  "provider.enabled": { category: "integration", severity: "warning", reserved: true },
  "provider.disabled": { category: "integration", severity: "warning", reserved: true },
  "provider.suspended": { category: "integration", severity: "high", reserved: true },
  "provider.revoked": { category: "integration", severity: "high", reserved: true },
  "provider.mode.changed": { category: "integration", severity: "high", reserved: true },
  "provider.health.checked": { category: "integration", severity: "info" },
  "provider.readiness.checked": { category: "integration", severity: "info" },
  "provider.call.started": { category: "integration", severity: "info", reserved: true },
  "provider.call.succeeded": { category: "integration", severity: "info", reserved: true },
  "provider.call.failed": { category: "integration", severity: "warning" },
  "provider.secret_ref.used": { category: "integration", severity: "notice", reserved: true },
  "provider.drift.detected": { category: "integration", severity: "warning", reserved: true },
  "provider.failover.started": { category: "integration", severity: "high", reserved: true },
  "provider.failover.completed": { category: "integration", severity: "high", reserved: true },
  "provider.circuit.opened": { category: "integration", severity: "warning", reserved: true },
  "provider.circuit.closed": { category: "integration", severity: "notice", reserved: true },
  "provider.deferred": { category: "integration", severity: "notice" },
  "file.uploaded": { category: "file", severity: "info", reserved: true },
  "file.downloaded": { category: "file", severity: "info", reserved: true },
  // Notifications and messaging (parity-notifications-messaging, USF-133).
  // Emitted by this slice (value-free; never a raw recipient address, rendered body,
  // provider credential, provider internals, stack trace, token, or object key):
  "notification.created": { category: "notification", severity: "info" },
  "notification.rendered": { category: "notification", severity: "info" },
  "notification.queued": { category: "notification", severity: "info" },
  "notification.scheduled": { category: "notification", severity: "info" },
  "notification.sent": { category: "notification", severity: "notice" },
  "notification.delivered": { category: "notification", severity: "notice", reserved: true },
  "notification.failed": { category: "notification", severity: "warning" },
  "notification.retrying": { category: "notification", severity: "notice" },
  "notification.dead_lettered": { category: "notification", severity: "warning" },
  "notification.suppressed": { category: "notification", severity: "notice" },
  "notification.cancelled": { category: "notification", severity: "notice" },
  "notification.denied": { category: "notification", severity: "warning" },
  "notification.read": { category: "notification", severity: "info" },
  "notification.template.created": { category: "notification", severity: "notice" },
  "notification.template.changed": { category: "notification", severity: "warning" },
  "notification.template.approved": { category: "notification", severity: "warning" },
  "notification.preference.changed": { category: "notification", severity: "notice" },
  "notification.suppression.changed": { category: "notification", severity: "warning" },
  "notification.provider.changed": { category: "notification", severity: "warning" },
  "notification.bulk.started": { category: "notification", severity: "warning", reserved: true },
  "notification.bulk.completed": { category: "notification", severity: "warning", reserved: true },
  "notification.bulk.failed": { category: "notification", severity: "high", reserved: true },
  // Jobs & workflows (parity-jobs-workflows, USF-133). Emitted by this slice
  // (value-free; never a raw payload/secret/credential/stack-trace):
  "job.created": { category: "job", severity: "info" },
  "job.scheduled": { category: "job", severity: "info" },
  "job.started": { category: "job", severity: "info" },
  "job.leased": { category: "job", severity: "info" },
  "job.completed": { category: "job", severity: "info" },
  "job.failed": { category: "job", severity: "warning" },
  "job.retrying": { category: "job", severity: "notice" },
  "job.dead_lettered": { category: "job", severity: "warning" },
  "job.cancelled": { category: "job", severity: "notice" },
  "job.denied": { category: "job", severity: "warning" },
  "job.expired": { category: "job", severity: "notice", reserved: true },
  "job.heartbeat_missed": { category: "job", severity: "warning", reserved: true },
  "schedule.created": { category: "job", severity: "notice" },
  "schedule.changed": { category: "job", severity: "warning" },
  "schedule.disabled": { category: "job", severity: "warning" },
  "workflow.started": { category: "job", severity: "info" },
  "workflow.signalled": { category: "job", severity: "info" },
  "workflow.completed": { category: "job", severity: "info" },
  "workflow.failed": { category: "job", severity: "warning" },
  "workflow.cancelled": { category: "job", severity: "notice" },
  "workflow.approval.requested": { category: "job", severity: "notice" },
  "workflow.approval.approved": { category: "job", severity: "warning" },
  "workflow.approval.rejected": { category: "job", severity: "warning" },
  "workflow.admin.override": { category: "job", severity: "high", reserved: true },
  // Guardrails / rate limits / abuse controls (parity-rate-limits-abuse, USF-160).
  // Emitted by this slice as value-free control evidence: no raw payload, raw IP,
  // credential, token, object key, recipient address, provider internals, or stack trace.
  "guardrail.policy.created": { category: "guardrail", severity: "notice", reserved: true },
  "guardrail.policy.changed": { category: "guardrail", severity: "warning", reserved: true },
  "guardrail.policy.evaluated": { category: "guardrail", severity: "info" },
  "guardrail.limit.exceeded": { category: "guardrail", severity: "warning" },
  "guardrail.quota.exceeded": { category: "guardrail", severity: "warning" },
  "guardrail.admission.denied": { category: "guardrail", severity: "warning" },
  "guardrail.backpressure.applied": { category: "guardrail", severity: "warning" },
  "guardrail.abuse.suspected": { category: "security", severity: "high", reserved: true },
  "guardrail.policy.unknown_denied": { category: "security", severity: "warning" },
  // Import/export/bulk operations (parity-import-export-bulk, USF-162).
  // Emitted by this slice as value-free data-movement evidence: no raw rows,
  // payloads, object keys, secrets, provider internals, or stack traces.
  "bulk.operation.created": { category: "bulk-operation", severity: "notice" },
  "bulk.operation.validated": { category: "bulk-operation", severity: "notice" },
  "bulk.operation.previewed": { category: "bulk-operation", severity: "notice" },
  "bulk.operation.approved": { category: "bulk-operation", severity: "warning" },
  "bulk.operation.started": { category: "bulk-operation", severity: "warning" },
  "bulk.operation.completed": { category: "bulk-operation", severity: "notice" },
  "bulk.operation.failed": { category: "bulk-operation", severity: "warning" },
  "bulk.operation.cancelled": { category: "bulk-operation", severity: "notice" },
  "bulk.operation.denied": { category: "bulk-operation", severity: "warning" },
  "import.created": { category: "bulk-operation", severity: "notice" },
  "import.validated": { category: "bulk-operation", severity: "notice" },
  "import.started": { category: "bulk-operation", severity: "warning" },
  "import.completed": { category: "bulk-operation", severity: "notice" },
  "import.failed": { category: "bulk-operation", severity: "warning" },
  "export.created": { category: "bulk-operation", severity: "notice" },
  "export.started": { category: "bulk-operation", severity: "warning" },
  "export.completed": { category: "bulk-operation", severity: "notice" },
  "export.failed": { category: "bulk-operation", severity: "warning" },
  "evidence_package.created": { category: "bulk-operation", severity: "warning" },
  "security.denied": { category: "security", severity: "high" },
  "system.error": { category: "system", severity: "high" },
  // Audit-of-audit access (reading/exporting/verifying audit evidence is itself audited).
  "audit.query.started": { category: "audit-system", severity: "info" },
  "audit.query.completed": { category: "audit-system", severity: "info" },
  "audit.query.denied": { category: "audit-system", severity: "warning" },
  "audit.event.viewed": { category: "audit-system", severity: "notice" },
  "audit.export.requested": { category: "audit-system", severity: "notice", reserved: true },
  "audit.export.completed": { category: "audit-system", severity: "notice", reserved: true },
  "audit.export.denied": { category: "audit-system", severity: "warning", reserved: true },
  "audit.integrity.verified": { category: "audit-system", severity: "notice" },
  "audit.integrity.failed": { category: "audit-system", severity: "critical" },
  "audit.correction.recorded": { category: "audit-system", severity: "notice" },
  // Security detection hooks: reserved future event definitions (no live monitoring here).
  "security.repeated_denial": { category: "security", severity: "high", reserved: true },
  "security.tenant_mismatch": { category: "security", severity: "high", reserved: true },
  "security.impossible_tenant_switch": {
    category: "security",
    severity: "critical",
    reserved: true,
  },
  "security.audit_integrity_failed": { category: "security", severity: "critical", reserved: true },
  "security.suspicious_export": { category: "security", severity: "high", reserved: true },
  // Config/secrets events (parity-config-secrets, USF-144). Emitted by this slice;
  // reserved ones are defined for forward-compat but not emitted yet.
  "config.read": { category: "configuration", severity: "info" },
  "config.changed": { category: "configuration", severity: "warning" },
  "config.denied": { category: "configuration", severity: "warning" },
  "config.validation_failed": { category: "configuration", severity: "high" },
  "config.override.created": { category: "configuration", severity: "warning", reserved: true },
  "config.override.expired": { category: "configuration", severity: "notice", reserved: true },
  "config.drift.detected": { category: "configuration", severity: "high" },
  "secret.accessed": { category: "configuration", severity: "notice" },
  "secret.denied": { category: "configuration", severity: "warning" },
  "secret.rotated": { category: "configuration", severity: "warning", reserved: true },
  "secret.revoked": { category: "configuration", severity: "high", reserved: true },
  "feature_flag.evaluated": { category: "configuration", severity: "debug" },
  "feature_flag.changed": { category: "configuration", severity: "warning", reserved: true },
  "provider_config.changed": { category: "configuration", severity: "warning", reserved: true },
  // Keycloak-brokered authentication/identity (parity-auth-keycloak-broker, USF-133).
  // Emitted by this slice (value-free; never a token/cookie/secret):
  "authentication.login.failed": { category: "authentication", severity: "warning" },
  "authentication.logout": { category: "authentication", severity: "info" },
  "authentication.session.created": { category: "authentication", severity: "info" },
  "authentication.session.revoked": { category: "authentication", severity: "warning" },
  "authentication.session.expired": { category: "authentication", severity: "notice" },
  "authentication.token.denied": { category: "security", severity: "warning" },
  "authentication.keycloak.denied": { category: "security", severity: "warning" },
  "authentication.brokered_identity.denied": { category: "security", severity: "warning" },
  "authentication.tenant_selection.denied": { category: "tenant-context", severity: "warning" },
  // Identity lifecycle / deprovisioning — defined now, deprovisioning runtime DEFERRED:
  "authentication.identity.linked": { category: "admin", severity: "warning", reserved: true },
  "authentication.identity.unlinked": { category: "admin", severity: "warning", reserved: true },
  "authentication.identity.disabled": { category: "admin", severity: "warning", reserved: true },
  "authentication.identity.suspended": { category: "admin", severity: "warning", reserved: true },
  // Tenant self-service SSO control plane — DEFINED for forward-compat; the governed
  // request/approve/verify/activate runtime is DEFERRED to a Linear blocker.
  "tenant_sso.requested": { category: "admin", severity: "notice", reserved: true },
  "tenant_sso.configured": { category: "admin", severity: "warning", reserved: true },
  "tenant_sso.domain_verified": { category: "admin", severity: "notice", reserved: true },
  "tenant_sso.activated": { category: "admin", severity: "warning", reserved: true },
  "tenant_sso.suspended": { category: "admin", severity: "warning", reserved: true },
  "tenant_sso.revoked": { category: "admin", severity: "high", reserved: true },
  "tenant_sso.denied": { category: "security", severity: "warning", reserved: true },
  // Identity threat/abuse detection hooks — reserved (no live SIEM in this slice):
  "security.broker_link_collision": { category: "security", severity: "high", reserved: true },
  "security.domain_claim_conflict": { category: "security", severity: "high", reserved: true },
  "security.stale_session_used": { category: "security", severity: "high", reserved: true },
  "security.revoked_membership_used": { category: "security", severity: "high", reserved: true },
  "security.token_replay_suspected": { category: "security", severity: "critical", reserved: true },
  // Observability/telemetry access (parity-observability-telemetry, USF-133).
  // Telemetry is not audit: these audit events record privileged observability
  // access or readiness checks only, and their metadata is value-free.
  "observability.read": { category: "system", severity: "info" },
  "observability.readiness.checked": { category: "system", severity: "info" },
  "observability.security_signal.read": { category: "security", severity: "warning" },
  "observability.export.requested": { category: "system", severity: "warning", reserved: true },
  "observability.configure.changed": {
    category: "configuration",
    severity: "warning",
    reserved: true,
  },
  "observability.alert.configure.changed": {
    category: "configuration",
    severity: "warning",
    reserved: true,
  },
  "search.query.executed": { category: "search", severity: "info" },
  "search.query.denied": { category: "search", severity: "warning" },
  "search.result.access_denied": { category: "search", severity: "warning" },
  "search.index.updated": { category: "search", severity: "info" },
  "search.index.deleted": { category: "search", severity: "notice" },
  "search.reindex.started": { category: "search", severity: "notice" },
  "search.reindex.completed": { category: "search", severity: "info" },
  "search.reindex.failed": { category: "search", severity: "warning" },
  "search.provider.denied": { category: "search", severity: "warning", reserved: true },
  "search.autocomplete.denied": { category: "search", severity: "warning" },
});

// Metadata keys (matched case-insensitively as substrings) that MUST NEVER appear
// in audit metadata: no passwords, tokens, secrets, cookies, credentials, keys.
// redactAuditMetadata masks these; validate-audit blocks regressions statically.
export const BLOCKED_METADATA_KEYS = Object.freeze([
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "cookie",
  "authorization",
  "private_key",
  "privatekey",
  "credential",
  "connection_string",
  "bearer",
  "jwt",
  "object_key",
  "objectkey",
  "session_token",
  "access_key",
  "client_secret",
  "provider_response",
  "raw_payload",
  "raw_response",
  "stack_trace",
  "ssn",
] as const);

export const REDACTED_VALUE = "[redacted]";
export const AUDIT_METADATA_MAX_KEYS = 32;
export const AUDIT_METADATA_MAX_VALUE_LENGTH = 1024;

/** Returns true if a metadata key looks like a secret/credential and must be redacted. */
export function isBlockedMetadataKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return BLOCKED_METADATA_KEYS.some((blocked) => lowered.includes(blocked));
}

// Audit must not become a secret dump. Blocked keys are masked (kept as evidence of
// an attempt, never the value); oversized values are truncated; key count is bounded.
// Records references/identifiers, never full object snapshots.
export function redactAuditMetadata(
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  let count = 0;
  for (const [key, value] of Object.entries(metadata)) {
    if (count >= AUDIT_METADATA_MAX_KEYS) {
      break;
    }
    count += 1;
    if (isBlockedMetadataKey(key)) {
      out[key] = REDACTED_VALUE;
      continue;
    }
    const asString = typeof value === "string" ? value : JSON.stringify(value);
    out[key] =
      asString.length > AUDIT_METADATA_MAX_VALUE_LENGTH
        ? `${asString.slice(0, AUDIT_METADATA_MAX_VALUE_LENGTH)}…[truncated]`
        : asString;
  }
  return Object.freeze(out);
}

/** The semantic fields a caller supplies. Chain/storage fields are store-assigned. */
export interface AuditEventDraft {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: string;
  readonly schemaVersion: string;
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly occurredAt: string;
  readonly actorId: string;
  readonly actorType: string;
  readonly effectiveActorId: string;
  readonly tenantId: string;
  readonly scopeType: string;
  readonly scopeId: string;
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly outcome: AuditEventOutcome;
  readonly reasonCode: string;
  readonly safeMessage: string;
  readonly policyVersion: string | null;
  readonly decisionId: string | null;
  readonly obligations: readonly string[];
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly traceId: string | null;
  readonly requestId: string | null;
  readonly sourceSystem: string;
  readonly sourceEventId: string | null;
  readonly recordedBy: string;
  readonly recordedByComponent: string;
  readonly collectorVersion: string;
  readonly clockSource: string;
  readonly dataClassification: DataSensitivity;
  readonly retentionPolicy: string;
  readonly legalHold: boolean;
  readonly correctsEventId: string | null;
  readonly metadata: Readonly<Record<string, string>>;
  // Forensic fields (defined now; request/session capture deferred — see USF-143).
  readonly sourceIp: string | null;
  readonly userAgent: string | null;
  readonly deviceId: string | null;
  readonly sessionId: string | null;
}

/** A recorded, chained audit event. Chain fields are assigned by the store. */
export interface AuditEvent extends AuditEventDraft {
  readonly recordedAt: string;
  readonly ingestedAt: string;
  readonly chainScope: string;
  readonly sequence: number;
  readonly previousHash: string | null;
  readonly eventHash: string;
  // Signature-ready (no signer in this slice — see USF-143). Null until signed.
  readonly signature: string | null;
  readonly chainKeyId: string | null;
  readonly verificationStatus: "recorded" | "verified" | "tamper-detected";
}

export interface CreateAuditEventInput {
  readonly eventId: string;
  readonly eventType: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly action: string;
  readonly outcome: AuditEventOutcome;
  readonly category?: AuditCategory;
  readonly severity?: AuditSeverity;
  readonly eventVersion?: string;
  readonly occurredAt?: string;
  readonly actorType?: string;
  readonly effectiveActorId?: string;
  readonly scopeType?: string;
  readonly scopeId?: string;
  readonly subjectType?: string;
  readonly subjectId?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly reasonCode?: string;
  readonly safeMessage?: string;
  readonly policyVersion?: string | null;
  readonly decisionId?: string | null;
  readonly obligations?: readonly string[];
  readonly correlationId?: string;
  readonly causationId?: string | null;
  readonly traceId?: string | null;
  readonly requestId?: string | null;
  readonly sourceSystem?: string;
  readonly sourceEventId?: string | null;
  readonly recordedBy?: string;
  readonly recordedByComponent?: string;
  readonly collectorVersion?: string;
  readonly dataClassification?: DataSensitivity;
  readonly retentionPolicy?: string;
  readonly legalHold?: boolean;
  readonly correctsEventId?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly sourceIp?: string | null;
  readonly userAgent?: string | null;
  readonly deviceId?: string | null;
  readonly sessionId?: string | null;
}

// Builds a validated, redacted audit event draft. Fails closed on a missing or
// non-canonical category/event_type/outcome/severity, or a missing actor/tenant/
// action/event_version (audit-system actions are themselves audited, so the model
// must hold for every event). The store assigns chain fields at record time.
export function createAuditEventDraft(input: CreateAuditEventInput): AuditEventDraft {
  const known = AUDIT_EVENT_TYPES[input.eventType];
  const category = input.category ?? known?.category;
  const severity = input.severity ?? known?.severity ?? "info";
  if (!category) {
    throw new Error(`audit event ${input.eventType} has no category`);
  }
  if (!AUDIT_CATEGORIES.includes(category)) {
    throw new Error(`audit event category is not canonical: ${category}`);
  }
  if (!AUDIT_SEVERITIES.includes(severity)) {
    throw new Error(`audit event severity is not canonical: ${severity}`);
  }
  if (!AUDIT_EVENT_OUTCOMES.includes(input.outcome)) {
    throw new Error(`audit event outcome is not canonical: ${input.outcome}`);
  }
  const eventVersion = input.eventVersion ?? "1";
  return Object.freeze({
    eventId: assertNonEmpty(input.eventId, "eventId"),
    eventType: assertNonEmpty(input.eventType, "eventType"),
    eventVersion: assertNonEmpty(eventVersion, "eventVersion"),
    schemaVersion: AUDIT_SCHEMA_VERSION,
    category,
    severity,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    actorId: assertNonEmpty(input.actorId, "actorId"),
    actorType: input.actorType ?? "user",
    effectiveActorId: input.effectiveActorId ?? input.actorId,
    tenantId: assertNonEmpty(input.tenantId, "tenantId"),
    scopeType: input.scopeType ?? "tenant",
    scopeId: input.scopeId ?? input.tenantId,
    action: assertNonEmpty(input.action, "action"),
    subjectType: input.subjectType ?? "unspecified",
    subjectId: input.subjectId ?? "unspecified",
    resourceType: input.resourceType ?? "unspecified",
    resourceId: input.resourceId ?? "unspecified",
    outcome: input.outcome,
    reasonCode: input.reasonCode ?? "ok",
    safeMessage: input.safeMessage ?? "",
    policyVersion: input.policyVersion ?? null,
    decisionId: input.decisionId ?? null,
    obligations: Object.freeze([...(input.obligations ?? [])]),
    correlationId: input.correlationId ?? input.eventId,
    causationId: input.causationId ?? null,
    traceId: input.traceId ?? null,
    requestId: input.requestId ?? null,
    sourceSystem: input.sourceSystem ?? "usf-foundation",
    sourceEventId: input.sourceEventId ?? null,
    recordedBy: input.recordedBy ?? "usf-foundation",
    recordedByComponent: input.recordedByComponent ?? "unspecified",
    collectorVersion: input.collectorVersion ?? AUDIT_SCHEMA_VERSION,
    clockSource: "server",
    dataClassification: input.dataClassification ?? "security-sensitive",
    retentionPolicy: input.retentionPolicy ?? "audit",
    legalHold: input.legalHold ?? false,
    correctsEventId: input.correctsEventId ?? null,
    metadata: redactAuditMetadata(input.metadata ?? {}),
    sourceIp: input.sourceIp ?? null,
    userAgent: input.userAgent ?? null,
    deviceId: input.deviceId ?? null,
    sessionId: input.sessionId ?? null,
  });
}

// Canonical, deterministic hash input for the per-chain tamper-evident hash. Keys
// are emitted in a fixed order with metadata sorted, so the hash is reproducible by
// any verifier. recordedAt and sequence are included so reordering or backdating is
// detectable. This is the application-layer chain; the DB has its own (USF-138).
export function canonicalAuditEventHash(
  event: AuditEventDraft,
  recordedAt: string,
  sequence: number,
  previousHash: string | null,
): string {
  const canonical = JSON.stringify([
    event.eventId,
    event.eventType,
    event.eventVersion,
    event.schemaVersion,
    event.category,
    event.severity,
    event.occurredAt,
    recordedAt,
    event.actorId,
    event.effectiveActorId,
    event.tenantId,
    event.scopeType,
    event.scopeId,
    event.action,
    event.subjectType,
    event.subjectId,
    event.resourceType,
    event.resourceId,
    event.outcome,
    event.reasonCode,
    event.safeMessage,
    event.policyVersion,
    event.decisionId,
    [...event.obligations],
    event.correlationId,
    event.causationId,
    event.traceId,
    event.requestId,
    event.sourceSystem,
    event.sourceEventId,
    event.dataClassification,
    event.retentionPolicy,
    event.legalHold,
    event.correctsEventId,
    Object.entries(event.metadata).sort(([a], [b]) => a.localeCompare(b)),
    sequence,
    previousHash,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export interface AuditIntegrityResult {
  readonly ok: boolean;
  readonly chainScope: string;
  readonly count: number;
  readonly verifiedAt: string;
  readonly brokenAtSequence: number | null;
  readonly reason: string | null;
}

// Recomputes the hash chain for an ordered list of recorded events and reports the
// first break. Detects changed event content (hash mismatch), a broken previous_hash
// link, and reordered/missing sequence numbers. The input MUST already be a single
// chain scope (e.g. one tenant) ordered by sequence ascending.
export function verifyAuditChain(
  events: readonly AuditEvent[],
  chainScope = "unknown",
): AuditIntegrityResult {
  const verifiedAt = new Date().toISOString();
  let previousHash: string | null = null;
  let expectedSequence = 0;
  for (const event of events) {
    if (event.sequence !== expectedSequence) {
      return {
        ok: false,
        chainScope,
        count: events.length,
        verifiedAt,
        brokenAtSequence: event.sequence,
        reason: `sequence gap or reorder: expected ${expectedSequence}, saw ${event.sequence}`,
      };
    }
    if (event.previousHash !== previousHash) {
      return {
        ok: false,
        chainScope,
        count: events.length,
        verifiedAt,
        brokenAtSequence: event.sequence,
        reason: "previous_hash does not link to the prior event",
      };
    }
    const recomputed = canonicalAuditEventHash(
      event,
      event.recordedAt,
      event.sequence,
      event.previousHash,
    );
    if (recomputed !== event.eventHash) {
      return {
        ok: false,
        chainScope,
        count: events.length,
        verifiedAt,
        brokenAtSequence: event.sequence,
        reason: "event content does not match its recorded hash (tamper detected)",
      };
    }
    previousHash = event.eventHash;
    expectedSequence += 1;
  }
  return {
    ok: true,
    chainScope,
    count: events.length,
    verifiedAt,
    brokenAtSequence: null,
    reason: null,
  };
}

// ---------------------------------------------------------------------------
// Configuration / secrets model (parity-config-secrets, USF-144).
//
// Configuration is a typed, classified, validated CONTROL PLANE. Secrets are
// credentials referenced by opaque pointers, never embedded. Required/invalid
// config fails closed; secret VALUES never leave the secret adapter and never
// appear in API responses, audit metadata, errors, validation findings, OpenAPI,
// fixtures, or generated evidence. ISO 27001-supporting technical control evidence
// only; no certification claim. See docs/architecture/config-and-secrets-standard.md.
// ---------------------------------------------------------------------------

export const CONFIG_SCHEMA_VERSION = "config-1";

export const CONFIG_CLASSIFICATIONS = Object.freeze([
  "public-config",
  "internal-config",
  "security-control",
  "tenant-config",
  "environment-config",
  "provider-config",
  "feature-flag",
  "secret-reference",
  "credential-metadata",
  "runtime-ephemeral",
  "deprecated-config",
] as const);
export type ConfigClassification = (typeof CONFIG_CLASSIFICATIONS)[number];

// Deterministic precedence, lowest trust first. A later (higher-trust) layer wins,
// except a lower-trust layer MUST NOT override a security-control key (override policy).
export const CONFIG_SCOPES = Object.freeze([
  "compiled-default",
  "repository-default",
  "environment",
  "deployment",
  "tenant",
  "runtime-override",
  "break-glass-override",
] as const);
export type ConfigScope = (typeof CONFIG_SCOPES)[number];

export const ENVIRONMENT_CLASSES = Object.freeze([
  "local-dev",
  "local-composed-test",
  "ci",
  "staging",
  "production",
] as const);
export type EnvironmentClass = (typeof ENVIRONMENT_CLASSES)[number];

export const SECRET_LIFECYCLE_STATES = Object.freeze([
  "created",
  "active",
  "deprecated",
  "rotating",
  "revoked",
  "expired",
  "destroyed",
  "unknown",
] as const);
export type SecretLifecycleState = (typeof SECRET_LIFECYCLE_STATES)[number];

export type ConfigValueType = "string" | "number" | "boolean" | "enum";

export type OverridePolicy =
  | "immutable" // only compiled/repository defaults
  | "environment-only" // environment/deployment layers may set
  | "tenant-allowed" // a tenant may override
  | "operator-only" // runtime operator override only
  | "break-glass-only"; // only a break-glass override

export interface ConfigKeyDefinition {
  readonly key: string;
  readonly classification: ConfigClassification;
  readonly scope: ConfigScope;
  readonly owner: string;
  readonly type: ConfigValueType;
  readonly required: boolean;
  readonly sensitive: boolean;
  readonly securityControl: boolean;
  readonly secretReferenceAllowed: boolean;
  readonly overridePolicy: OverridePolicy;
  readonly allowedEnvironments: readonly EnvironmentClass[];
  readonly defaultValue: string | null;
  readonly enumValues: readonly string[] | null;
  readonly auditPolicy: "always" | "on-change" | "none";
  readonly deprecated: boolean;
  readonly schemaVersion: string;
}

export interface FeatureFlagDefinition {
  readonly flagKey: string;
  readonly defaultValue: boolean;
  readonly safeDefault: boolean;
  readonly scope: "global" | "tenant" | "environment";
  readonly owner: string;
  readonly expiresAt: string | null;
  readonly securityControl: boolean;
}

// An opaque pointer to a secret value held by a secrets provider. This is NOT the
// secret: it carries no value field and is safe to pass around / describe.
export interface SecretReference {
  readonly secretRef: string;
  readonly secretProvider: string;
  readonly scope: string;
  readonly version: string;
  readonly status: SecretLifecycleState;
  readonly rotationPolicy: string;
  readonly lastRotatedAt: string | null;
  readonly nextRotationDueAt: string | null;
  readonly owner: string;
}

export function isSecretClassification(classification: ConfigClassification): boolean {
  return classification === "secret-reference" || classification === "credential-metadata";
}

// Secret-leak prevention. Block by key name (substring, case-insensitive) and by
// obvious value shape (bearer/jwt/private-key/connection-string prefixes). Used to
// keep secret values out of every outward channel.
export const SECRET_KEY_PATTERNS = Object.freeze([
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "client_secret",
  "private_key",
  "credential",
  "connection_string",
  "dsn",
  "sas",
  "bearer",
  "jwt",
  "object_key",
] as const);

// Separator-insensitive: api-key, api_key, apiKey, api.key all match "apikey".
function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[-_.\s]/g, "");
}

export function isSecretLikeKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return SECRET_KEY_PATTERNS.some((pattern) => normalized.includes(normalizeKey(pattern)));
}

// Best-effort value-shape detection (key names are the primary signal; this catches
// values that escaped a non-obvious key). Pragmatic, not exhaustive.
export function looksLikeSecretValue(value: string): boolean {
  const v = value.trim();
  return (
    /^Bearer\s+/i.test(v) ||
    /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(v) || // JWT
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v) ||
    /^(sk|rk|pk)_[A-Za-z0-9]{16,}/.test(v) || // provider key prefixes
    /(postgres|postgresql|mysql|mongodb|amqp|redis):\/\/[^@\s]+:[^@\s]+@/.test(v) // dsn with creds
  );
}

export const CONFIG_REDACTED = "[redacted-secret]";

// Returns a copy of a config map with secret-like keys masked and secret-shaped
// values masked. Safe for API output, audit metadata, errors, and evidence.
export function redactConfigMap(
  map: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    out[key] = isSecretLikeKey(key) || looksLikeSecretValue(value) ? CONFIG_REDACTED : value;
  }
  return Object.freeze(out);
}

// ---------------------------------------------------------------------------
// Provider adapters / modes model (parity-provider-adapters-modes, USF-133).
//
// Providers are controlled trust boundaries behind USF ports. A provider registry
// entry records mode, owner, config/secret posture, risk, health/readiness,
// lifecycle, egress, and supplier posture without exposing raw endpoints or
// credentials. This is local/dev/test control evidence only. It makes no live
// provider, production, supplier approval, or certification claim.
// ---------------------------------------------------------------------------

export const PROVIDER_CATEGORIES = Object.freeze([
  "database",
  "cache",
  "object-storage",
  "file-scan",
  "identity",
  "config",
  "secrets",
  "audit-ledger",
  "event-bus",
  "workflow-engine",
  "operational-job-engine",
  "notification-delivery",
  "api-gateway",
  "observability",
  "search-index",
  "full-text-search",
  "autocomplete",
  "vector-search",
] as const);
export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const PROVIDER_MODES = Object.freeze([
  "in-memory",
  "local-test",
  "mock",
  "composed-test",
  "live-external-deferred",
  "live-external-authorised",
  "disabled",
  "unavailable",
] as const);
export type ProviderAdapterMode = (typeof PROVIDER_MODES)[number];

export const PROVIDER_LIFECYCLE_STATES = Object.freeze([
  "proposed",
  "approved-for-local-test",
  "approved-for-composed-test",
  "approved-for-live",
  "suspended",
  "deprecated",
  "retired",
  "revoked",
] as const);
export type ProviderLifecycleState = (typeof PROVIDER_LIFECYCLE_STATES)[number];

export const PROVIDER_RISK_CLASSIFICATIONS = Object.freeze([
  "low",
  "medium",
  "high",
  "critical",
  "regulated",
  "security-sensitive",
] as const);
export type ProviderRiskClassification = (typeof PROVIDER_RISK_CLASSIFICATIONS)[number];

export const PROVIDER_OPERATIONAL_STATUSES = Object.freeze([
  "healthy",
  "degraded",
  "unavailable",
  "disabled",
  "not-configured",
  "deferred",
  "unauthorised",
  "unknown",
] as const);
export type ProviderOperationalStatus = (typeof PROVIDER_OPERATIONAL_STATUSES)[number];

export const PROVIDER_CRITICALITIES = Object.freeze(["low", "medium", "high", "critical"] as const);
export type ProviderCriticality = (typeof PROVIDER_CRITICALITIES)[number];

export interface ProviderCredentialPosture {
  readonly credentialRef: SecretReference | null;
  readonly secretRef: SecretReference | null;
  readonly secretClassification: "none" | "secret-reference" | "credential-metadata";
  readonly rotationPolicy: string;
  readonly lastRotatedAt: string | null;
  readonly rotationDueAt: string | null;
  readonly revokedAt: string | null;
  readonly credentialScope: string;
  readonly leastPrivilegePolicy: string;
}

export interface ProviderTransportPosture {
  readonly tlsRequired: boolean;
  readonly minTlsVersion: string | null;
  readonly certificateValidationRequired: boolean;
  readonly mtlsRequired: boolean;
  readonly caBundleRef: string | null;
  readonly certificatePinningPolicy: string;
  readonly insecureSkipVerifyAllowed: boolean;
}

export interface ProviderResiliencePosture {
  readonly connectTimeout: string;
  readonly requestTimeout: string;
  readonly retryPolicy: string;
  readonly circuitBreakerPolicy: string;
  readonly fallbackPolicy: string;
  readonly degradedModePolicy: string;
  readonly bulkheadPolicy: string;
}

export interface ProviderFailoverPosture {
  readonly primaryProviderRef: string | null;
  readonly secondaryProviderRef: string | null;
  readonly failoverPolicy: string;
  readonly failbackPolicy: string;
  readonly dataConsistencyPolicy: string;
  readonly reconciliationPolicy: string;
  readonly rpoTarget: string | null;
  readonly rtoTarget: string | null;
}

export interface ProviderDriftPosture {
  readonly expectedConfigHash: string | null;
  readonly observedConfigHash: string | null;
  readonly lastDriftCheckAt: string | null;
  readonly driftStatus: "not-checked" | "in-sync" | "drifted" | "deferred";
  readonly driftReasonCode: string | null;
  readonly approvedExceptionRef: string | null;
}

export interface ProviderPermissionGrant {
  readonly providerAction: string;
  readonly providerPermission: "read" | "write" | "delete" | "admin" | "send" | "execute";
  readonly credentialScope: string;
  readonly allowedResourceScope: string;
  readonly tenantScope: "none" | "single-tenant" | "tenant-scoped" | "multi-tenant";
}

export interface ProviderIncidentPosture {
  readonly incidentRef: string | null;
  readonly providerIncidentStatus: "none" | "open" | "monitoring" | "closed" | "deferred";
  readonly lastIncidentAt: string | null;
  readonly securityContactRef: string | null;
  readonly escalationPolicyRef: string | null;
  readonly customerImpactPolicy: string;
}

export interface ProviderSupplierPosture {
  readonly supplierNameRef: string | null;
  readonly subprocessorStatus: string;
  readonly dataProcessingRole: string;
  readonly contractStatus: string;
  readonly securityReviewStatus: string;
  readonly privacyReviewStatus: string;
  readonly lastReviewedAt: string | null;
  readonly reviewExpiresAt: string | null;
}

export interface ProviderRegistryEntry {
  readonly providerId: string;
  readonly providerName: string;
  readonly providerCategory: ProviderCategory;
  readonly providerMode: ProviderAdapterMode;
  readonly owningCapability: string;
  readonly owningTeamOrRole: string;
  readonly portName: string;
  readonly adapterName: string;
  readonly businessPurpose: string;
  readonly configRef: string;
  readonly credentialRef: SecretReference | null;
  readonly secretRef: SecretReference | null;
  readonly endpointRef: string | null;
  readonly providerRegion: string;
  readonly allowedRegions: readonly string[];
  readonly egressAllowed: boolean;
  readonly egressDestinationAllowlist: readonly string[];
  readonly crossRegionAllowed: boolean;
  readonly crossBorderTransferPolicy: string;
  readonly dataResidencyPolicy: string;
  readonly dataResidencyStatus: string;
  readonly subprocessorStatus: string;
  readonly lifecycleState: ProviderLifecycleState;
  readonly riskClassification: ProviderRiskClassification;
  readonly riskDrivers: readonly string[];
  readonly criticality: ProviderCriticality;
  readonly availabilityDependency: string;
  readonly configuredBy: string;
  readonly approvedBy: string | null;
  readonly lastReviewedAt: string | null;
  readonly reviewExpiresAt: string | null;
  readonly healthStatus: ProviderOperationalStatus;
  readonly readinessStatus: ProviderOperationalStatus;
  readonly livenessStatus: ProviderOperationalStatus;
  readonly capabilityStatus: ProviderOperationalStatus;
  readonly lastCheckedAt: string | null;
  readonly failureReasonCode: string | null;
  readonly safeFailureMessage: string | null;
  readonly dataClassification: DataSensitivity;
  readonly environmentScope: "local-dev" | "local-composed-test" | "ci" | "staging" | "production";
  readonly tenantScope: "none" | "single-tenant" | "tenant-scoped" | "multi-tenant";
  readonly liveReadinessClaim: boolean;
  readonly productionReadinessClaim: boolean;
  readonly explicitAuthorityRef: string | null;
  readonly sourceUseDisposition:
    "source-derived-rewrite" | "new-with-rationale" | "evidence-only-support";
  readonly credentialPosture: ProviderCredentialPosture;
  readonly transportPosture: ProviderTransportPosture;
  readonly resiliencePosture: ProviderResiliencePosture;
  readonly failoverPosture: ProviderFailoverPosture;
  readonly driftPosture: ProviderDriftPosture;
  readonly permissionGrants: readonly ProviderPermissionGrant[];
  readonly incidentPosture: ProviderIncidentPosture;
  readonly supplierPosture: ProviderSupplierPosture;
}

export interface SafeProviderStatusView {
  readonly providerId: string;
  readonly providerName: string;
  readonly providerCategory: ProviderCategory;
  readonly providerMode: ProviderAdapterMode;
  readonly owningCapability: string;
  readonly owningTeamOrRole: string;
  readonly businessPurpose: string;
  readonly dataClassification: DataSensitivity;
  readonly tenantScope: string;
  readonly environmentScope: string;
  readonly lifecycleState: ProviderLifecycleState;
  readonly riskClassification: ProviderRiskClassification;
  readonly criticality: ProviderCriticality;
  readonly healthStatus: ProviderOperationalStatus;
  readonly readinessStatus: ProviderOperationalStatus;
  readonly livenessStatus: ProviderOperationalStatus;
  readonly capabilityStatus: ProviderOperationalStatus;
  readonly providerRegion: string;
  readonly dataResidencyStatus: string;
  readonly egressAllowed: boolean;
  readonly tlsRequired: boolean;
  readonly credentialPosture: "none" | "secret-reference-present" | "secret-reference-revoked";
  readonly endpointPosture: "none" | "reference-redacted" | "local-or-composed-reference";
  readonly driftStatus: ProviderDriftPosture["driftStatus"];
  readonly resiliencePosture: string;
  readonly failoverPosture: string;
  readonly supplierPosture: string;
  readonly liveReadinessClaim: boolean;
  readonly productionReadinessClaim: boolean;
  readonly lastReviewedAt: string | null;
  readonly reviewExpiresAt: string | null;
  readonly safeFailureMessage: string | null;
  readonly sourceUseDisposition: ProviderRegistryEntry["sourceUseDisposition"];
}

export interface ProviderRegistryFinding {
  readonly providerId: string;
  readonly ruleId: string;
  readonly message: string;
}

export interface ProviderRegistryValidationResult {
  readonly ok: boolean;
  readonly findings: readonly ProviderRegistryFinding[];
}

export class ProviderUnavailableError extends Error {
  readonly reasonCode: string;
  readonly providerId: string;

  constructor(providerId: string, reasonCode: string, message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
    this.providerId = providerId;
    this.reasonCode = reasonCode;
  }
}

function localSecretReference(name: string): SecretReference {
  return Object.freeze({
    secretRef: `secret://local-dev/${name}`,
    secretProvider: "in-memory",
    scope: "local-dev-test",
    version: "1",
    status: "active",
    rotationPolicy: "local-dev-test-only",
    lastRotatedAt: null,
    nextRotationDueAt: null,
    owner: "platform",
  });
}

interface ProviderRegistryInput {
  readonly providerId: string;
  readonly providerName: string;
  readonly providerCategory: ProviderCategory;
  readonly providerMode: ProviderAdapterMode;
  readonly owningCapability: string;
  readonly portName: string;
  readonly adapterName: string;
  readonly businessPurpose: string;
  readonly dataClassification: DataSensitivity;
  readonly environmentScope?: ProviderRegistryEntry["environmentScope"];
  readonly tenantScope?: ProviderRegistryEntry["tenantScope"];
  readonly owningTeamOrRole?: string;
  readonly configRef?: string;
  readonly credentialRef?: SecretReference | null;
  readonly secretRef?: SecretReference | null;
  readonly endpointRef?: string | null;
  readonly providerRegion?: string;
  readonly allowedRegions?: readonly string[];
  readonly egressAllowed?: boolean;
  readonly egressDestinationAllowlist?: readonly string[];
  readonly crossRegionAllowed?: boolean;
  readonly crossBorderTransferPolicy?: string;
  readonly dataResidencyPolicy?: string;
  readonly dataResidencyStatus?: string;
  readonly subprocessorStatus?: string;
  readonly lifecycleState?: ProviderLifecycleState;
  readonly riskClassification?: ProviderRiskClassification;
  readonly riskDrivers?: readonly string[];
  readonly criticality?: ProviderCriticality;
  readonly availabilityDependency?: string;
  readonly configuredBy?: string;
  readonly approvedBy?: string | null;
  readonly lastReviewedAt?: string | null;
  readonly reviewExpiresAt?: string | null;
  readonly healthStatus?: ProviderOperationalStatus;
  readonly readinessStatus?: ProviderOperationalStatus;
  readonly livenessStatus?: ProviderOperationalStatus;
  readonly capabilityStatus?: ProviderOperationalStatus;
  readonly lastCheckedAt?: string | null;
  readonly failureReasonCode?: string | null;
  readonly safeFailureMessage?: string | null;
  readonly liveReadinessClaim?: boolean;
  readonly productionReadinessClaim?: boolean;
  readonly explicitAuthorityRef?: string | null;
  readonly sourceUseDisposition?: ProviderRegistryEntry["sourceUseDisposition"];
  readonly credentialPosture?: Partial<ProviderCredentialPosture>;
  readonly transportPosture?: Partial<ProviderTransportPosture>;
  readonly resiliencePosture?: Partial<ProviderResiliencePosture>;
  readonly failoverPosture?: Partial<ProviderFailoverPosture>;
  readonly driftPosture?: Partial<ProviderDriftPosture>;
  readonly permissionGrants?: readonly ProviderPermissionGrant[];
  readonly incidentPosture?: Partial<ProviderIncidentPosture>;
  readonly supplierPosture?: Partial<ProviderSupplierPosture>;
}

function lifecycleForMode(mode: ProviderAdapterMode): ProviderLifecycleState {
  if (mode === "composed-test") return "approved-for-composed-test";
  if (mode === "in-memory" || mode === "mock" || mode === "local-test") {
    return "approved-for-local-test";
  }
  if (mode === "disabled" || mode === "unavailable") return "suspended";
  if (mode === "live-external-authorised") return "approved-for-live";
  return "proposed";
}

function statusForMode(mode: ProviderAdapterMode): ProviderOperationalStatus {
  if (mode === "disabled") return "disabled";
  if (mode === "unavailable") return "unavailable";
  if (mode === "live-external-deferred") return "deferred";
  if (mode === "live-external-authorised") return "unauthorised";
  return "healthy";
}

function makeProvider(input: ProviderRegistryInput): ProviderRegistryEntry {
  const credentialRef = input.credentialRef ?? input.credentialPosture?.credentialRef ?? null;
  const secretRef = input.secretRef ?? input.credentialPosture?.secretRef ?? credentialRef;
  const defaultStatus = statusForMode(input.providerMode);
  const credentialStatus =
    credentialRef?.status === "revoked" || secretRef?.status === "revoked" ? "revoked" : "active";
  const credentialPosture: ProviderCredentialPosture = Object.freeze({
    credentialRef,
    secretRef,
    secretClassification: credentialRef || secretRef ? "secret-reference" : "none",
    rotationPolicy: input.credentialPosture?.rotationPolicy ?? "not-required-for-local-dev-test",
    lastRotatedAt: input.credentialPosture?.lastRotatedAt ?? credentialRef?.lastRotatedAt ?? null,
    rotationDueAt:
      input.credentialPosture?.rotationDueAt ?? credentialRef?.nextRotationDueAt ?? null,
    revokedAt:
      input.credentialPosture?.revokedAt ?? (credentialStatus === "revoked" ? "revoked" : null),
    credentialScope: input.credentialPosture?.credentialScope ?? "least-privilege-local-dev-test",
    leastPrivilegePolicy:
      input.credentialPosture?.leastPrivilegePolicy ??
      "provider credential grants only the declared port action set",
  });
  const externalLike =
    input.providerMode === "live-external-authorised" ||
    input.providerMode === "live-external-deferred";
  return Object.freeze({
    providerId: assertNonEmpty(input.providerId, "providerId"),
    providerName: assertNonEmpty(input.providerName, "providerName"),
    providerCategory: input.providerCategory,
    providerMode: input.providerMode,
    owningCapability: assertNonEmpty(input.owningCapability, "owningCapability"),
    owningTeamOrRole: input.owningTeamOrRole ?? "platform-operator",
    portName: assertNonEmpty(input.portName, "portName"),
    adapterName: assertNonEmpty(input.adapterName, "adapterName"),
    businessPurpose: assertNonEmpty(input.businessPurpose, "businessPurpose"),
    configRef: input.configRef ?? `config://providers/${input.providerId}`,
    credentialRef,
    secretRef,
    endpointRef: input.endpointRef ?? null,
    providerRegion: input.providerRegion ?? "local-dev",
    allowedRegions: Object.freeze([...(input.allowedRegions ?? ["local-dev"])]),
    egressAllowed: input.egressAllowed ?? externalLike,
    egressDestinationAllowlist: Object.freeze([...(input.egressDestinationAllowlist ?? [])]),
    crossRegionAllowed: input.crossRegionAllowed ?? false,
    crossBorderTransferPolicy:
      input.crossBorderTransferPolicy ?? "not-authorised-for-local-dev-test",
    dataResidencyPolicy: input.dataResidencyPolicy ?? "local-dev-test-only",
    dataResidencyStatus: input.dataResidencyStatus ?? "local-dev-test",
    subprocessorStatus: input.subprocessorStatus ?? "not-applicable-local-dev-test",
    lifecycleState: input.lifecycleState ?? lifecycleForMode(input.providerMode),
    riskClassification: input.riskClassification ?? "medium",
    riskDrivers: Object.freeze([...(input.riskDrivers ?? [])]),
    criticality: input.criticality ?? "medium",
    availabilityDependency: input.availabilityDependency ?? "local-dev-test",
    configuredBy: input.configuredBy ?? "repository-default",
    approvedBy: input.approvedBy ?? null,
    lastReviewedAt: input.lastReviewedAt ?? null,
    reviewExpiresAt: input.reviewExpiresAt ?? null,
    healthStatus: input.healthStatus ?? defaultStatus,
    readinessStatus: input.readinessStatus ?? defaultStatus,
    livenessStatus: input.livenessStatus ?? defaultStatus,
    capabilityStatus: input.capabilityStatus ?? defaultStatus,
    lastCheckedAt: input.lastCheckedAt ?? null,
    failureReasonCode: input.failureReasonCode ?? null,
    safeFailureMessage:
      input.safeFailureMessage === undefined || input.safeFailureMessage === null
        ? null
        : safeFailureMessage(input.safeFailureMessage),
    dataClassification: input.dataClassification,
    environmentScope: input.environmentScope ?? "local-dev",
    tenantScope: input.tenantScope ?? "tenant-scoped",
    liveReadinessClaim: input.liveReadinessClaim ?? false,
    productionReadinessClaim: input.productionReadinessClaim ?? false,
    explicitAuthorityRef: input.explicitAuthorityRef ?? null,
    sourceUseDisposition: input.sourceUseDisposition ?? "source-derived-rewrite",
    credentialPosture,
    transportPosture: Object.freeze({
      tlsRequired: input.transportPosture?.tlsRequired ?? externalLike,
      minTlsVersion: input.transportPosture?.minTlsVersion ?? (externalLike ? "1.2" : null),
      certificateValidationRequired:
        input.transportPosture?.certificateValidationRequired ?? externalLike,
      mtlsRequired: input.transportPosture?.mtlsRequired ?? false,
      caBundleRef: input.transportPosture?.caBundleRef ?? null,
      certificatePinningPolicy:
        input.transportPosture?.certificatePinningPolicy ?? "defined-and-deferred",
      insecureSkipVerifyAllowed:
        input.transportPosture?.insecureSkipVerifyAllowed ??
        (input.providerMode === "local-test" || input.providerMode === "composed-test"),
    }),
    resiliencePosture: Object.freeze({
      connectTimeout: input.resiliencePosture?.connectTimeout ?? "2s-local-dev-test",
      requestTimeout: input.resiliencePosture?.requestTimeout ?? "10s-local-dev-test",
      retryPolicy: input.resiliencePosture?.retryPolicy ?? "bounded-local-dev-test",
      circuitBreakerPolicy:
        input.resiliencePosture?.circuitBreakerPolicy ?? "posture-recorded-runtime-deferred",
      fallbackPolicy:
        input.resiliencePosture?.fallbackPolicy ?? "no-authz-or-tenant-isolation-weakening",
      degradedModePolicy:
        input.resiliencePosture?.degradedModePolicy ?? "explicit-degraded-status-fail-closed",
      bulkheadPolicy:
        input.resiliencePosture?.bulkheadPolicy ?? "posture-recorded-runtime-deferred",
    }),
    failoverPosture: Object.freeze({
      primaryProviderRef: input.failoverPosture?.primaryProviderRef ?? null,
      secondaryProviderRef: input.failoverPosture?.secondaryProviderRef ?? null,
      failoverPolicy:
        input.failoverPosture?.failoverPolicy ?? "no-dr-readiness-claim-without-proof",
      failbackPolicy: input.failoverPosture?.failbackPolicy ?? "audited-when-represented",
      dataConsistencyPolicy:
        input.failoverPosture?.dataConsistencyPolicy ?? "tenant-context-preserved",
      reconciliationPolicy:
        input.failoverPosture?.reconciliationPolicy ?? "posture-recorded-runtime-deferred",
      rpoTarget: input.failoverPosture?.rpoTarget ?? null,
      rtoTarget: input.failoverPosture?.rtoTarget ?? null,
    }),
    driftPosture: Object.freeze({
      expectedConfigHash: input.driftPosture?.expectedConfigHash ?? null,
      observedConfigHash: input.driftPosture?.observedConfigHash ?? null,
      lastDriftCheckAt: input.driftPosture?.lastDriftCheckAt ?? null,
      driftStatus: input.driftPosture?.driftStatus ?? "deferred",
      driftReasonCode: input.driftPosture?.driftReasonCode ?? null,
      approvedExceptionRef: input.driftPosture?.approvedExceptionRef ?? null,
    }),
    permissionGrants: Object.freeze([...(input.permissionGrants ?? [])]),
    incidentPosture: Object.freeze({
      incidentRef: input.incidentPosture?.incidentRef ?? null,
      providerIncidentStatus: input.incidentPosture?.providerIncidentStatus ?? "none",
      lastIncidentAt: input.incidentPosture?.lastIncidentAt ?? null,
      securityContactRef: input.incidentPosture?.securityContactRef ?? null,
      escalationPolicyRef: input.incidentPosture?.escalationPolicyRef ?? null,
      customerImpactPolicy:
        input.incidentPosture?.customerImpactPolicy ??
        "structured-event-posture-only-no-live-alerting-claim",
    }),
    supplierPosture: Object.freeze({
      supplierNameRef: input.supplierPosture?.supplierNameRef ?? null,
      subprocessorStatus:
        input.supplierPosture?.subprocessorStatus ?? "not-applicable-local-dev-test",
      dataProcessingRole: input.supplierPosture?.dataProcessingRole ?? "not-applicable",
      contractStatus: input.supplierPosture?.contractStatus ?? "not-claimed",
      securityReviewStatus: input.supplierPosture?.securityReviewStatus ?? "not-claimed",
      privacyReviewStatus: input.supplierPosture?.privacyReviewStatus ?? "not-claimed",
      lastReviewedAt: input.supplierPosture?.lastReviewedAt ?? input.lastReviewedAt ?? null,
      reviewExpiresAt: input.supplierPosture?.reviewExpiresAt ?? input.reviewExpiresAt ?? null,
    }),
  });
}

const notificationSecretRef = localSecretReference("notification-mail-api-key");

export const PROVIDER_REGISTRY: readonly ProviderRegistryEntry[] = Object.freeze([
  makeProvider({
    providerId: "config-in-memory",
    providerName: "In-memory config provider",
    providerCategory: "config",
    providerMode: "in-memory",
    owningCapability: "config-secrets",
    portName: "ConfigLayerProvider",
    adapterName: "InMemoryConfigLayerProvider",
    businessPurpose: "Local/dev/test configuration resolution.",
    dataClassification: "confidential",
    riskClassification: "medium",
    riskDrivers: ["configuration-control-plane"],
  }),
  makeProvider({
    providerId: "secrets-in-memory",
    providerName: "In-memory secret resolver",
    providerCategory: "secrets",
    providerMode: "in-memory",
    owningCapability: "config-secrets",
    portName: "SecretResolver",
    adapterName: "InMemorySecretStore",
    businessPurpose: "Synthetic local/dev/test secret references and values.",
    dataClassification: "security-sensitive",
    riskClassification: "security-sensitive",
    riskDrivers: ["credential access"],
  }),
  makeProvider({
    providerId: "secret-store-openbao-composed-test",
    providerName: "OpenBao composed-test secret provider",
    providerCategory: "secrets",
    providerMode: "composed-test",
    owningCapability: "config-secrets",
    portName: "SecretResolver,SecretStore",
    adapterName: "OpenBaoSecretStore",
    businessPurpose:
      "SDK-backed local OpenBao secret write, describe, resolve, tenant-boundary, and cleanup proof for synthetic secrets only.",
    dataClassification: "security-sensitive",
    environmentScope: "local-composed-test",
    providerRegion: "local-compose",
    allowedRegions: ["local-compose"],
    egressAllowed: false,
    endpointRef: "endpoint://compose/openbao",
    readinessStatus: "healthy",
    capabilityStatus: "healthy",
    riskClassification: "critical",
    riskDrivers: ["credential access", "availability dependency"],
    criticality: "critical",
    availabilityDependency: "required-for-runtime-compose-provider-proof",
    explicitAuthorityRef: "spec/instances/compose-service/service-catalogue.json#openbao",
    sourceUseDisposition: "new-with-rationale",
    transportPosture: { tlsRequired: false, certificateValidationRequired: false },
    permissionGrants: [
      {
        providerAction: "write-synthetic-secret",
        providerPermission: "write",
        credentialScope: "local-compose-placeholder",
        allowedResourceScope: "synthetic-proof-secrets-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "read-synthetic-secret-reference",
        providerPermission: "read",
        credentialScope: "local-compose-placeholder",
        allowedResourceScope: "synthetic-proof-secrets-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "cleanup-synthetic-secret",
        providerPermission: "delete",
        credentialScope: "local-compose-placeholder",
        allowedResourceScope: "synthetic-proof-secrets-only",
        tenantScope: "tenant-scoped",
      },
    ],
    resiliencePosture: {
      connectTimeout: "60s-local-compose-readiness-budget",
      requestTimeout: "10s-local-compose",
      retryPolicy: "bounded-exponential-backoff-no-unbounded-retry",
      circuitBreakerPolicy: "fail-closed-proof",
    },
    driftPosture: { driftStatus: "in-sync", expectedConfigHash: "compose-openbao-pinned" },
    supplierPosture: { subprocessorStatus: "future-review-required-for-live-provider-only" },
  }),
  makeProvider({
    providerId: "audit-ledger-in-memory",
    providerName: "In-memory audit ledger",
    providerCategory: "audit-ledger",
    providerMode: "in-memory",
    owningCapability: "audit-evidence",
    portName: "AuditEventStore",
    adapterName: "InMemoryAuditEventStore",
    businessPurpose: "Local/dev/test audit event capture and hash-chain proof.",
    dataClassification: "security-sensitive",
    riskClassification: "security-sensitive",
    riskDrivers: ["audit/evidence function"],
  }),
  makeProvider({
    providerId: "database-postgres-composed-test",
    providerName: "Postgres composed-test database",
    providerCategory: "database",
    providerMode: "composed-test",
    owningCapability: "db-rls-migrations",
    portName: "TenantScopedRepository,TenantMembershipDirectory",
    adapterName: "PostgresTenantMembershipRepository",
    businessPurpose:
      "Local composed DB/RLS/migration and runtime tenant-membership provider proof substrate.",
    dataClassification: "restricted",
    environmentScope: "local-composed-test",
    providerRegion: "local-compose",
    allowedRegions: ["local-compose"],
    egressAllowed: false,
    endpointRef: "endpoint://compose/postgres",
    lifecycleState: "approved-for-composed-test",
    riskClassification: "critical",
    riskDrivers: ["tenant data access", "regulated data handling", "availability dependency"],
    criticality: "critical",
    availabilityDependency: "required-for-runtime-database-provider-proof",
    sourceUseDisposition: "new-with-rationale",
    permissionGrants: [
      {
        providerAction: "tenant_memberships.select",
        providerPermission: "read",
        credentialScope: "foundation_runtime",
        allowedResourceScope: "tenant-scoped",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "tenant_memberships.insert",
        providerPermission: "write",
        credentialScope: "foundation_runtime",
        allowedResourceScope: "tenant-scoped",
        tenantScope: "tenant-scoped",
      },
    ],
    driftPosture: { driftStatus: "in-sync", expectedConfigHash: "compose-postgres-pinned" },
  }),
  makeProvider({
    providerId: "identity-in-memory",
    providerName: "In-memory identity provider",
    providerCategory: "identity",
    providerMode: "mock",
    owningCapability: "auth-identity",
    portName: "IdentityProvider",
    adapterName: "InMemoryIdentityProvider",
    businessPurpose: "Hermetic local/dev/test identity issuance.",
    dataClassification: "confidential",
    riskClassification: "security-sensitive",
    riskDrivers: ["identity/authentication function"],
  }),
  makeProvider({
    providerId: "identity-keycloak-composed-test",
    providerName: "Keycloak composed-test identity provider",
    providerCategory: "identity",
    providerMode: "composed-test",
    owningCapability: "auth-identity",
    portName: "IdentityProvider,KeycloakVerifier",
    adapterName: "KeycloakComposedIdentityProvider",
    businessPurpose:
      "SDK-backed local Keycloak synthetic identity issue/readback and tenant-boundary proof.",
    dataClassification: "security-sensitive",
    environmentScope: "local-composed-test",
    providerRegion: "local-compose",
    endpointRef: "endpoint://compose/keycloak",
    lifecycleState: "approved-for-composed-test",
    allowedRegions: ["local-compose"],
    egressAllowed: false,
    readinessStatus: "healthy",
    capabilityStatus: "healthy",
    riskClassification: "critical",
    riskDrivers: ["identity/authentication function", "credential access"],
    criticality: "critical",
    availabilityDependency: "required-for-runtime-compose-provider-proof",
    explicitAuthorityRef: "spec/instances/compose-service/service-catalogue.json#keycloak",
    sourceUseDisposition: "new-with-rationale",
    transportPosture: { tlsRequired: false, certificateValidationRequired: false },
    permissionGrants: [
      {
        providerAction: "upsert-synthetic-identity",
        providerPermission: "write",
        credentialScope: "local-compose-placeholder-admin",
        allowedResourceScope: "synthetic-proof-identities-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "readback-synthetic-identity",
        providerPermission: "read",
        credentialScope: "local-compose-placeholder-admin",
        allowedResourceScope: "synthetic-proof-identities-only",
        tenantScope: "tenant-scoped",
      },
    ],
    resiliencePosture: {
      connectTimeout: "120s-local-compose-keycloak-readiness-budget",
      requestTimeout: "10s-local-compose",
      retryPolicy: "bounded-exponential-backoff-no-unbounded-retry",
      circuitBreakerPolicy: "fail-closed-proof",
    },
    driftPosture: { driftStatus: "in-sync", expectedConfigHash: "compose-keycloak-pinned" },
    supplierPosture: { subprocessorStatus: "future-review-required-for-live-provider-only" },
  }),
  makeProvider({
    providerId: "event-bus-in-memory",
    providerName: "In-memory event bus",
    providerCategory: "event-bus",
    providerMode: "in-memory",
    owningCapability: "jobs-workflows",
    portName: "EventBus",
    adapterName: "InMemoryEventBus",
    businessPurpose: "Hermetic event publication for local/dev/test.",
    dataClassification: "confidential",
    riskClassification: "medium",
    riskDrivers: ["workflow/job execution"],
  }),
  makeProvider({
    providerId: "event-bus-nats-composed-test",
    providerName: "NATS composed-test event bus",
    providerCategory: "event-bus",
    providerMode: "composed-test",
    owningCapability: "jobs-workflows",
    portName: "EventBus",
    adapterName: "NatsEventBus",
    businessPurpose:
      "SDK-backed local NATS event publish/readback and tenant-boundary proof for synthetic events.",
    dataClassification: "confidential",
    environmentScope: "local-composed-test",
    endpointRef: "endpoint://compose/nats",
    providerRegion: "local-compose",
    allowedRegions: ["local-compose"],
    egressAllowed: false,
    readinessStatus: "healthy",
    capabilityStatus: "healthy",
    riskClassification: "high",
    riskDrivers: ["workflow/job execution", "availability dependency"],
    availabilityDependency: "required-for-runtime-compose-provider-proof",
    explicitAuthorityRef: "spec/instances/compose-service/service-catalogue.json#nats",
    sourceUseDisposition: "new-with-rationale",
    transportPosture: { tlsRequired: false, certificateValidationRequired: false },
    permissionGrants: [
      {
        providerAction: "publish-synthetic-event",
        providerPermission: "write",
        credentialScope: "no-credential-local-compose",
        allowedResourceScope: "synthetic-proof-subjects-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "readback-synthetic-event",
        providerPermission: "read",
        credentialScope: "no-credential-local-compose",
        allowedResourceScope: "synthetic-proof-subjects-only",
        tenantScope: "tenant-scoped",
      },
    ],
    resiliencePosture: {
      connectTimeout: "60s-local-compose-readiness-budget",
      requestTimeout: "10s-local-compose",
      retryPolicy: "bounded-exponential-backoff-no-unbounded-retry",
      circuitBreakerPolicy: "fail-closed-proof",
    },
    driftPosture: { driftStatus: "in-sync", expectedConfigHash: "compose-nats-pinned" },
  }),
  makeProvider({
    providerId: "object-storage-in-memory",
    providerName: "In-memory object store",
    providerCategory: "object-storage",
    providerMode: "in-memory",
    owningCapability: "files-storage",
    portName: "ObjectStore",
    adapterName: "InMemoryObjectStore",
    businessPurpose: "Tenant-prefixed local/dev/test object storage.",
    dataClassification: "restricted",
    riskClassification: "regulated",
    riskDrivers: ["tenant data access", "file/object handling"],
  }),
  makeProvider({
    providerId: "object-storage-minio-composed-test",
    providerName: "MinIO composed-test object store",
    providerCategory: "object-storage",
    providerMode: "composed-test",
    owningCapability: "files-storage",
    portName: "ObjectStore",
    adapterName: "MinioObjectStore",
    businessPurpose:
      "SDK-backed local MinIO object write/read/delete and tenant-boundary proof for synthetic objects.",
    dataClassification: "restricted",
    environmentScope: "local-composed-test",
    endpointRef: "endpoint://compose/minio",
    providerRegion: "local-compose",
    allowedRegions: ["local-compose"],
    egressAllowed: false,
    readinessStatus: "healthy",
    capabilityStatus: "healthy",
    riskClassification: "regulated",
    riskDrivers: ["tenant data access", "file/object handling"],
    availabilityDependency: "required-for-runtime-compose-provider-proof",
    explicitAuthorityRef: "spec/instances/compose-service/service-catalogue.json#minio",
    sourceUseDisposition: "new-with-rationale",
    transportPosture: { tlsRequired: false, certificateValidationRequired: false },
    permissionGrants: [
      {
        providerAction: "write-synthetic-object",
        providerPermission: "write",
        credentialScope: "local-compose-placeholder",
        allowedResourceScope: "synthetic-proof-objects-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "readback-synthetic-object",
        providerPermission: "read",
        credentialScope: "local-compose-placeholder",
        allowedResourceScope: "synthetic-proof-objects-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "cleanup-synthetic-object",
        providerPermission: "delete",
        credentialScope: "local-compose-placeholder",
        allowedResourceScope: "synthetic-proof-objects-only",
        tenantScope: "tenant-scoped",
      },
    ],
    resiliencePosture: {
      connectTimeout: "60s-local-compose-readiness-budget",
      requestTimeout: "10s-local-compose",
      retryPolicy: "bounded-exponential-backoff-no-unbounded-retry",
      circuitBreakerPolicy: "fail-closed-proof",
    },
    driftPosture: { driftStatus: "in-sync", expectedConfigHash: "compose-minio-pinned" },
  }),
  makeProvider({
    providerId: "file-scan-in-memory",
    providerName: "In-memory scan provider",
    providerCategory: "file-scan",
    providerMode: "in-memory",
    owningCapability: "files-storage",
    portName: "ScanProvider",
    adapterName: "InMemoryScanProvider",
    businessPurpose: "Local/dev/test file scan state simulation.",
    dataClassification: "restricted",
    riskClassification: "security-sensitive",
    riskDrivers: ["file/object handling", "regulated data handling"],
  }),
  makeProvider({
    providerId: "file-scan-clamav-deferred",
    providerName: "ClamAV live/composed scan provider class",
    providerCategory: "file-scan",
    providerMode: "live-external-deferred",
    owningCapability: "files-storage",
    portName: "ScanProvider",
    adapterName: "ClamAV provider deferred",
    businessPurpose: "Recognised malware-scan provider class; not implemented or live-ready.",
    dataClassification: "restricted",
    readinessStatus: "deferred",
    healthStatus: "deferred",
    capabilityStatus: "deferred",
    riskClassification: "security-sensitive",
    riskDrivers: ["file/object handling", "egress to external network"],
    transportPosture: { tlsRequired: true, certificateValidationRequired: true },
    supplierPosture: { subprocessorStatus: "future-review-required" },
  }),
  makeProvider({
    providerId: "workflow-engine-in-memory",
    providerName: "In-memory workflow engine",
    providerCategory: "workflow-engine",
    providerMode: "in-memory",
    owningCapability: "jobs-workflows",
    portName: "WorkflowEngine",
    adapterName: "InMemoryWorkflowEngine",
    businessPurpose: "Hermetic workflow execution for local/dev/test proof.",
    dataClassification: "confidential",
    riskClassification: "high",
    riskDrivers: ["workflow/job execution", "availability dependency"],
  }),
  makeProvider({
    providerId: "workflow-engine-temporal-composed-test",
    providerName: "Temporal composed-test workflow provider",
    providerCategory: "workflow-engine",
    providerMode: "composed-test",
    owningCapability: "jobs-workflows",
    portName: "WorkflowEngine",
    adapterName: "TemporalComposedWorkflowEngine",
    businessPurpose:
      "SDK-backed local Temporal workflow schedule, worker execution, readback, and cleanup proof for synthetic workflows.",
    dataClassification: "confidential",
    environmentScope: "local-composed-test",
    endpointRef: "endpoint://compose/temporal",
    providerRegion: "local-compose",
    allowedRegions: ["local-compose"],
    egressAllowed: false,
    readinessStatus: "healthy",
    capabilityStatus: "healthy",
    riskClassification: "critical",
    criticality: "critical",
    riskDrivers: ["workflow/job execution", "availability dependency"],
    availabilityDependency: "required-for-runtime-compose-provider-proof",
    explicitAuthorityRef: "spec/instances/compose-service/service-catalogue.json#temporal",
    sourceUseDisposition: "new-with-rationale",
    transportPosture: { tlsRequired: false, certificateValidationRequired: false },
    permissionGrants: [
      {
        providerAction: "schedule-synthetic-workflow",
        providerPermission: "write",
        credentialScope: "no-credential-local-compose",
        allowedResourceScope: "synthetic-proof-workflows-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "readback-synthetic-workflow-result",
        providerPermission: "read",
        credentialScope: "no-credential-local-compose",
        allowedResourceScope: "synthetic-proof-workflows-only",
        tenantScope: "tenant-scoped",
      },
    ],
    resiliencePosture: {
      connectTimeout: "60s-local-compose-readiness-budget",
      requestTimeout: "30s-local-compose",
      retryPolicy: "bounded-exponential-backoff-no-unbounded-retry",
      circuitBreakerPolicy: "fail-closed-proof",
    },
    driftPosture: { driftStatus: "in-sync", expectedConfigHash: "compose-temporal-pinned" },
  }),
  makeProvider({
    providerId: "operational-job-engine-in-memory",
    providerName: "In-memory operational job store",
    providerCategory: "operational-job-engine",
    providerMode: "in-memory",
    owningCapability: "jobs-workflows",
    portName: "OperationalJobStore",
    adapterName: "InMemoryOperationalJobStore",
    businessPurpose: "Hermetic operational job execution and retry/dead-letter proof.",
    dataClassification: "confidential",
    riskClassification: "high",
    riskDrivers: ["workflow/job execution"],
  }),
  makeProvider({
    providerId: "operational-job-engine-windmill-deferred",
    providerName: "Windmill operational job provider class",
    providerCategory: "operational-job-engine",
    providerMode: "live-external-deferred",
    owningCapability: "jobs-workflows",
    portName: "OperationalJobEngine",
    adapterName: "Windmill provider deferred",
    businessPurpose:
      "Recognised operational automation provider class; not implemented or live-ready.",
    dataClassification: "confidential",
    healthStatus: "deferred",
    readinessStatus: "deferred",
    capabilityStatus: "deferred",
    riskClassification: "high",
    riskDrivers: ["workflow/job execution", "egress to external network"],
  }),
  makeProvider({
    providerId: "notification-delivery-in-memory",
    providerName: "In-memory notification delivery provider",
    providerCategory: "notification-delivery",
    providerMode: "in-memory",
    owningCapability: "notifications-messaging",
    portName: "NotificationProvider",
    adapterName: "InMemoryNotificationProvider",
    businessPurpose: "Hermetic notification delivery capture and evidence proof.",
    dataClassification: "restricted",
    credentialRef: notificationSecretRef,
    secretRef: notificationSecretRef,
    riskClassification: "security-sensitive",
    riskDrivers: ["notification delivery", "credential access"],
    permissionGrants: [
      {
        providerAction: "send-test-notification",
        providerPermission: "send",
        credentialScope: "local-dev-test-notification-only",
        allowedResourceScope: "synthetic-recipients-only",
        tenantScope: "tenant-scoped",
      },
    ],
  }),
  makeProvider({
    providerId: "notification-delivery-mailpit-composed-test",
    providerName: "Mailpit composed-test notification sink",
    providerCategory: "notification-delivery",
    providerMode: "composed-test",
    owningCapability: "notifications-messaging",
    portName: "NotificationProvider",
    adapterName: "MailpitNotificationProvider",
    businessPurpose:
      "SDK-backed local Mailpit notification sink for bounded composed-provider proof; not live delivery.",
    dataClassification: "restricted",
    environmentScope: "local-composed-test",
    endpointRef: "endpoint://compose/mailpit",
    providerRegion: "local-compose",
    allowedRegions: ["local-compose"],
    egressAllowed: false,
    readinessStatus: "healthy",
    capabilityStatus: "healthy",
    riskClassification: "security-sensitive",
    riskDrivers: ["notification delivery"],
    availabilityDependency: "required-for-runtime-compose-provider-proof",
    explicitAuthorityRef: "spec/instances/compose-service/service-catalogue.json#mailpit",
    sourceUseDisposition: "new-with-rationale",
    transportPosture: { tlsRequired: false, certificateValidationRequired: false },
    permissionGrants: [
      {
        providerAction: "send-synthetic-notification",
        providerPermission: "send",
        credentialScope: "no-credential-local-compose",
        allowedResourceScope: "synthetic-recipients-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "readback-synthetic-notification",
        providerPermission: "read",
        credentialScope: "no-credential-local-compose",
        allowedResourceScope: "synthetic-recipients-only",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "cleanup-synthetic-notification",
        providerPermission: "delete",
        credentialScope: "no-credential-local-compose",
        allowedResourceScope: "synthetic-proof-messages-only",
        tenantScope: "tenant-scoped",
      },
    ],
    resiliencePosture: {
      connectTimeout: "2s-local-compose",
      requestTimeout: "10s-local-compose",
      retryPolicy: "bounded-runtime-proof-no-unbounded-retry",
      circuitBreakerPolicy: "fail-closed-proof",
    },
    driftPosture: { driftStatus: "in-sync", expectedConfigHash: "compose-mailpit-pinned" },
    incidentPosture: {
      providerIncidentStatus: "none",
      customerImpactPolicy: "local-composed-proof-only-no-customer-impact-claim",
    },
    supplierPosture: {
      supplierNameRef: "supplier://mailpit",
      subprocessorStatus: "future-review-required-for-live-provider-only",
      dataProcessingRole: "local-compose-synthetic-data-sink",
      contractStatus: "not-claimed",
      securityReviewStatus: "not-claimed",
      privacyReviewStatus: "not-claimed",
    },
  }),
  makeProvider({
    providerId: "notification-delivery-live-deferred",
    providerName: "External notification delivery provider class",
    providerCategory: "notification-delivery",
    providerMode: "live-external-deferred",
    owningCapability: "notifications-messaging",
    portName: "NotificationProvider",
    adapterName: "Live notification delivery provider deferred",
    businessPurpose:
      "Recognised external notification provider class; not implemented or live-ready.",
    dataClassification: "restricted",
    healthStatus: "deferred",
    readinessStatus: "deferred",
    capabilityStatus: "deferred",
    riskClassification: "security-sensitive",
    riskDrivers: ["notification delivery", "egress to external network", "credential access"],
    supplierPosture: { subprocessorStatus: "future-review-required" },
  }),
  makeProvider({
    providerId: "api-gateway-fastify-local-test",
    providerName: "Fastify local API runtime",
    providerCategory: "api-gateway",
    providerMode: "local-test",
    owningCapability: "api-contracts",
    portName: "ApiRuntime",
    adapterName: "Fastify local runtime",
    businessPurpose: "Local/dev/test API contract proof surface.",
    dataClassification: "confidential",
    environmentScope: "local-dev",
    riskClassification: "high",
    riskDrivers: ["availability dependency", "tenant data access"],
  }),
  makeProvider({
    providerId: "observability-captured-local",
    providerName: "Captured local observability sink",
    providerCategory: "observability",
    providerMode: "local-test",
    owningCapability: "observability",
    portName: "ObservabilitySink",
    adapterName: "CapturedObservabilitySink",
    businessPurpose: "Local/dev/test captured observations without live backend.",
    dataClassification: "confidential",
    riskClassification: "medium",
    riskDrivers: ["audit/evidence function"],
  }),
  makeProvider({
    providerId: "observability-compose-stack",
    providerName: "Composed observability stack",
    providerCategory: "observability",
    providerMode: "composed-test",
    owningCapability: "observability",
    portName: "ObservabilitySink",
    adapterName: "OTel/Prometheus/Loki/Tempo composed configs",
    businessPurpose: "Declared composed observability substrate; no live monitoring claim.",
    dataClassification: "confidential",
    environmentScope: "local-composed-test",
    endpointRef: "endpoint://compose/observability-stack",
    readinessStatus: "deferred",
    capabilityStatus: "deferred",
    riskClassification: "high",
    riskDrivers: ["audit/evidence function", "availability dependency"],
  }),
  makeProvider({
    providerId: "cache-unavailable",
    providerName: "Cache provider unavailable placeholder",
    providerCategory: "cache",
    providerMode: "unavailable",
    owningCapability: "api-contracts",
    portName: "CacheProvider",
    adapterName: "No cache adapter",
    businessPurpose: "Cache provider category represented; runtime provider unavailable.",
    dataClassification: "confidential",
    healthStatus: "unavailable",
    readinessStatus: "unavailable",
    capabilityStatus: "unavailable",
    failureReasonCode: "provider-unavailable",
    safeFailureMessage: "cache provider unavailable",
    riskClassification: "medium",
    lifecycleState: "suspended",
  }),
  makeProvider({
    providerId: "search-index-in-memory",
    providerName: "In-memory search index",
    providerCategory: "search-index",
    providerMode: "in-memory",
    owningCapability: "search-indexing",
    portName: "SearchIndexPort",
    adapterName: "InMemorySearchIndex",
    businessPurpose: "Hermetic tenant-safe search/index proof for local/dev/test.",
    dataClassification: "restricted",
    riskClassification: "security-sensitive",
    riskDrivers: ["tenant data access", "data discovery", "file/object handling"],
    permissionGrants: [
      {
        providerAction: "query-safe-projection",
        providerPermission: "read",
        credentialScope: "no-credential-required",
        allowedResourceScope: "tenant-scoped-safe-index-documents",
        tenantScope: "tenant-scoped",
      },
      {
        providerAction: "reindex-tenant",
        providerPermission: "write",
        credentialScope: "no-credential-required",
        allowedResourceScope: "tenant-scoped-index-documents",
        tenantScope: "tenant-scoped",
      },
    ],
  }),
  makeProvider({
    providerId: "search-index-disabled",
    providerName: "Search index provider disabled placeholder",
    providerCategory: "search-index",
    providerMode: "disabled",
    owningCapability: "api-contracts",
    portName: "SearchIndexProvider",
    adapterName: "No search index adapter",
    businessPurpose: "Search provider category represented; runtime provider disabled.",
    dataClassification: "confidential",
    healthStatus: "disabled",
    readinessStatus: "disabled",
    capabilityStatus: "disabled",
    failureReasonCode: "provider-disabled",
    safeFailureMessage: "search index provider disabled",
    riskClassification: "medium",
    lifecycleState: "suspended",
  }),
  makeProvider({
    providerId: "full-text-search-live-deferred",
    providerName: "External full-text search provider class",
    providerCategory: "full-text-search",
    providerMode: "live-external-deferred",
    owningCapability: "search-indexing",
    portName: "SearchIndexPort",
    adapterName: "External full-text provider deferred",
    businessPurpose: "Recognised full-text search provider class; not implemented or live-ready.",
    dataClassification: "restricted",
    healthStatus: "deferred",
    readinessStatus: "deferred",
    capabilityStatus: "deferred",
    riskClassification: "regulated",
    riskDrivers: [
      "tenant data access",
      "regulated data handling",
      "egress to external network",
      "availability dependency",
    ],
    transportPosture: { tlsRequired: true, certificateValidationRequired: true },
    supplierPosture: { subprocessorStatus: "future-review-required" },
  }),
  makeProvider({
    providerId: "autocomplete-live-deferred",
    providerName: "Autocomplete provider class",
    providerCategory: "autocomplete",
    providerMode: "live-external-deferred",
    owningCapability: "search-indexing",
    portName: "SearchIndexPort",
    adapterName: "Autocomplete provider deferred",
    businessPurpose:
      "Recognised autocomplete/typeahead provider class; not implemented or live-ready.",
    dataClassification: "restricted",
    healthStatus: "deferred",
    readinessStatus: "deferred",
    capabilityStatus: "deferred",
    riskClassification: "security-sensitive",
    riskDrivers: ["tenant data access", "egress to external network", "data discovery"],
    supplierPosture: { subprocessorStatus: "future-review-required" },
  }),
  makeProvider({
    providerId: "vector-search-live-deferred",
    providerName: "Vector search and embedding provider class",
    providerCategory: "vector-search",
    providerMode: "live-external-deferred",
    owningCapability: "search-indexing",
    portName: "SearchIndexPort",
    adapterName: "Vector search provider deferred",
    businessPurpose:
      "Recognised vector/embedding/AI retrieval provider class; not implemented or live-ready.",
    dataClassification: "restricted",
    healthStatus: "deferred",
    readinessStatus: "deferred",
    capabilityStatus: "deferred",
    riskClassification: "regulated",
    riskDrivers: [
      "tenant data access",
      "regulated data handling",
      "egress to external network",
      "availability dependency",
    ],
    transportPosture: { tlsRequired: true, certificateValidationRequired: true },
    supplierPosture: { subprocessorStatus: "future-review-required" },
  }),
]);

function finding(providerId: string, ruleId: string, message: string): ProviderRegistryFinding {
  return Object.freeze({ providerId, ruleId, message });
}

function secretReferenceOk(ref: unknown): boolean {
  if (ref === null || ref === undefined) {
    return true;
  }
  if (typeof ref !== "object" || !("secretRef" in ref)) {
    return false;
  }
  const secretRef = (ref as { readonly secretRef?: unknown }).secretRef;
  if (typeof secretRef !== "string") {
    return false;
  }
  return (
    secretRef.startsWith("secret://") &&
    !looksLikeSecretValue(secretRef) &&
    !endpointLooksRawOrLive(secretRef)
  );
}

function endpointLooksRawOrLive(endpointRef: string | null): boolean {
  if (!endpointRef) return false;
  return (
    /^https?:\/\//i.test(endpointRef) ||
    /amazonaws|sendgrid|twilio|brevo|stripe|mailgun/i.test(endpointRef)
  );
}

export function validateProviderRegistry(
  registry: readonly ProviderRegistryEntry[] = PROVIDER_REGISTRY,
): ProviderRegistryValidationResult {
  const findings: ProviderRegistryFinding[] = [];
  const seen = new Set<string>();
  for (const provider of registry) {
    if (seen.has(provider.providerId)) {
      findings.push(
        finding(provider.providerId, "provider-id-duplicate", "provider id duplicated"),
      );
    }
    seen.add(provider.providerId);
    if (!PROVIDER_CATEGORIES.includes(provider.providerCategory)) {
      findings.push(
        finding(provider.providerId, "provider-category-unknown", "provider category is unknown"),
      );
    }
    if (!PROVIDER_MODES.includes(provider.providerMode)) {
      findings.push(
        finding(provider.providerId, "provider-mode-unknown", "provider mode is unknown"),
      );
    }
    if (!PROVIDER_LIFECYCLE_STATES.includes(provider.lifecycleState)) {
      findings.push(
        finding(provider.providerId, "provider-lifecycle-unknown", "provider lifecycle is unknown"),
      );
    }
    for (const [name, status] of Object.entries({
      healthStatus: provider.healthStatus,
      readinessStatus: provider.readinessStatus,
      livenessStatus: provider.livenessStatus,
      capabilityStatus: provider.capabilityStatus,
    })) {
      if (!PROVIDER_OPERATIONAL_STATUSES.includes(status as ProviderOperationalStatus)) {
        findings.push(
          finding(provider.providerId, "provider-status-unknown", `${name} is unknown`),
        );
      }
    }
    if (!assertNonEmpty(provider.owningCapability, "owningCapability")) {
      findings.push(
        finding(provider.providerId, "provider-owner-missing", "owning capability missing"),
      );
    }
    if (!secretReferenceOk(provider.credentialRef) || !secretReferenceOk(provider.secretRef)) {
      findings.push(
        finding(
          provider.providerId,
          "provider-secret-ref-invalid",
          "provider credential must be a SecretReference",
        ),
      );
    }
    if (typeof (provider as unknown as { credentialRef?: unknown }).credentialRef === "string") {
      findings.push(
        finding(provider.providerId, "provider-raw-credential", "provider credential is embedded"),
      );
    }
    if (provider.credentialRef?.status === "revoked" || provider.secretRef?.status === "revoked") {
      findings.push(
        finding(
          provider.providerId,
          "provider-credential-revoked",
          "revoked provider credential cannot be used",
        ),
      );
    }
    if (endpointLooksRawOrLive(provider.endpointRef)) {
      findings.push(
        finding(
          provider.providerId,
          "provider-endpoint-raw",
          "provider endpoint must be an endpoint_ref",
        ),
      );
    }
    if (!provider.configRef.startsWith("config://")) {
      findings.push(
        finding(
          provider.providerId,
          "provider-config-ref-invalid",
          "provider config must use a config_ref",
        ),
      );
    }
    if (provider.providerMode === "live-external-deferred" && provider.liveReadinessClaim) {
      findings.push(
        finding(
          provider.providerId,
          "deferred-provider-live-claim",
          "deferred provider claims live readiness",
        ),
      );
    }
    if (
      (provider.providerMode === "in-memory" ||
        provider.providerMode === "local-test" ||
        provider.providerMode === "mock" ||
        provider.providerMode === "composed-test") &&
      (provider.liveReadinessClaim || provider.productionReadinessClaim)
    ) {
      findings.push(
        finding(
          provider.providerId,
          "test-provider-readiness-overclaim",
          "test provider claims live/production readiness",
        ),
      );
    }
    if (provider.providerMode === "live-external-authorised") {
      if (!provider.explicitAuthorityRef || provider.lifecycleState !== "approved-for-live") {
        findings.push(
          finding(
            provider.providerId,
            "live-provider-authority-missing",
            "live external authorised provider lacks explicit authority",
          ),
        );
      }
      if (!provider.lastReviewedAt || !provider.reviewExpiresAt) {
        findings.push(
          finding(
            provider.providerId,
            "live-provider-review-missing",
            "live provider review posture missing",
          ),
        );
      }
      if (
        !provider.transportPosture.tlsRequired ||
        !provider.transportPosture.certificateValidationRequired
      ) {
        findings.push(
          finding(
            provider.providerId,
            "live-provider-transport-unsafe",
            "live provider transport security missing",
          ),
        );
      }
    }
    if (
      provider.providerMode !== "local-test" &&
      provider.providerMode !== "composed-test" &&
      provider.transportPosture.insecureSkipVerifyAllowed
    ) {
      findings.push(
        finding(
          provider.providerId,
          "provider-insecure-skip-verify",
          "insecure skip verify is not allowed outside local-test/composed-test posture",
        ),
      );
    }
    if (provider.providerMode === "composed-test" && provider.productionReadinessClaim) {
      findings.push(
        finding(
          provider.providerId,
          "composed-provider-production-claim",
          "composed-test provider claims production readiness",
        ),
      );
    }
    if (
      (provider.riskClassification === "regulated" ||
        provider.dataClassification === "restricted") &&
      provider.providerRegion === "unknown"
    ) {
      findings.push(
        finding(
          provider.providerId,
          "provider-region-unknown",
          "regulated/restricted provider has unknown region",
        ),
      );
    }
    if (provider.safeFailureMessage && looksLikeSecretValue(provider.safeFailureMessage)) {
      findings.push(
        finding(
          provider.providerId,
          "provider-failure-secret",
          "provider failure message is secret-like",
        ),
      );
    }
  }
  return Object.freeze({ ok: findings.length === 0, findings: Object.freeze(findings) });
}

export function toSafeProviderStatus(provider: ProviderRegistryEntry): SafeProviderStatusView {
  const hasCredential = provider.credentialRef !== null || provider.secretRef !== null;
  const credentialRevoked =
    provider.credentialRef?.status === "revoked" || provider.secretRef?.status === "revoked";
  return Object.freeze({
    providerId: provider.providerId,
    providerName: provider.providerName,
    providerCategory: provider.providerCategory,
    providerMode: provider.providerMode,
    owningCapability: provider.owningCapability,
    owningTeamOrRole: provider.owningTeamOrRole,
    businessPurpose: provider.businessPurpose,
    dataClassification: provider.dataClassification,
    tenantScope: provider.tenantScope,
    environmentScope: provider.environmentScope,
    lifecycleState: provider.lifecycleState,
    riskClassification: provider.riskClassification,
    criticality: provider.criticality,
    healthStatus: provider.healthStatus,
    readinessStatus: provider.readinessStatus,
    livenessStatus: provider.livenessStatus,
    capabilityStatus: provider.capabilityStatus,
    providerRegion: provider.providerRegion,
    dataResidencyStatus: provider.dataResidencyStatus,
    egressAllowed: provider.egressAllowed,
    tlsRequired: provider.transportPosture.tlsRequired,
    credentialPosture: credentialRevoked
      ? "secret-reference-revoked"
      : hasCredential
        ? "secret-reference-present"
        : "none",
    endpointPosture: provider.endpointRef
      ? provider.providerMode === "local-test" || provider.providerMode === "composed-test"
        ? "local-or-composed-reference"
        : "reference-redacted"
      : "none",
    driftStatus: provider.driftPosture.driftStatus,
    resiliencePosture: provider.resiliencePosture.retryPolicy,
    failoverPosture: provider.failoverPosture.failoverPolicy,
    supplierPosture: provider.supplierPosture.subprocessorStatus,
    liveReadinessClaim: provider.liveReadinessClaim,
    productionReadinessClaim: provider.productionReadinessClaim,
    lastReviewedAt: provider.lastReviewedAt,
    reviewExpiresAt: provider.reviewExpiresAt,
    safeFailureMessage: provider.safeFailureMessage,
    sourceUseDisposition: provider.sourceUseDisposition,
  });
}

export function providerStatusViews(
  registry: readonly ProviderRegistryEntry[] = PROVIDER_REGISTRY,
): readonly SafeProviderStatusView[] {
  return Object.freeze(
    registry
      .map((provider) => toSafeProviderStatus(provider))
      .sort((a, b) => a.providerId.localeCompare(b.providerId)),
  );
}

export function findProvider(providerId: string): ProviderRegistryEntry | undefined {
  return PROVIDER_REGISTRY.find((provider) => provider.providerId === providerId);
}

export function assertProviderUsable(
  provider: ProviderRegistryEntry,
  purpose: string,
): ProviderRegistryEntry {
  if (provider.providerMode === "disabled" || provider.lifecycleState === "revoked") {
    throw new ProviderUnavailableError(
      provider.providerId,
      "provider-disabled",
      "provider is disabled",
    );
  }
  if (provider.providerMode === "unavailable") {
    throw new ProviderUnavailableError(
      provider.providerId,
      "provider-unavailable",
      "provider is unavailable",
    );
  }
  if (provider.providerMode === "live-external-deferred") {
    throw new ProviderUnavailableError(
      provider.providerId,
      "provider-deferred",
      "live external provider is deferred",
    );
  }
  if (provider.providerMode === "live-external-authorised" && !provider.explicitAuthorityRef) {
    throw new ProviderUnavailableError(
      provider.providerId,
      "provider-unauthorised",
      "live external provider lacks authority",
    );
  }
  if (
    provider.readinessStatus === "unknown" ||
    provider.readinessStatus === "deferred" ||
    provider.readinessStatus === "disabled" ||
    provider.readinessStatus === "unavailable" ||
    provider.readinessStatus === "unauthorised" ||
    provider.readinessStatus === "not-configured"
  ) {
    throw new ProviderUnavailableError(
      provider.providerId,
      `provider-${provider.readinessStatus}`,
      `provider is not ready for ${safeFailureMessage(purpose)}`,
    );
  }
  if (provider.credentialRef?.status === "revoked" || provider.secretRef?.status === "revoked") {
    throw new ProviderUnavailableError(
      provider.providerId,
      "provider-credential-revoked",
      "provider credential is revoked",
    );
  }
  return provider;
}

export class ConfigValidationError extends Error {
  readonly key: string;
  readonly reasonCode: string;
  // The message is intentionally value-free (never echoes a sensitive raw value).
  constructor(key: string, reasonCode: string, detail: string) {
    super(`config ${key} invalid: ${reasonCode} (${detail})`);
    this.name = "ConfigValidationError";
    this.key = key;
    this.reasonCode = reasonCode;
  }
}

function coerceConfigValue(def: ConfigKeyDefinition, raw: string): string | number | boolean {
  switch (def.type) {
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        throw new ConfigValidationError(def.key, "not-a-number", "expected a finite number");
      }
      return n;
    }
    case "boolean": {
      if (raw !== "true" && raw !== "false") {
        throw new ConfigValidationError(def.key, "not-a-boolean", "expected true|false");
      }
      return raw === "true";
    }
    case "enum": {
      if (!def.enumValues || !def.enumValues.includes(raw)) {
        // Do not echo the raw value for a sensitive key; report the allowed set only.
        throw new ConfigValidationError(
          def.key,
          "not-in-enum",
          `allowed: ${def.enumValues?.join(",")}`,
        );
      }
      return raw;
    }
    default:
      return raw;
  }
}

// The relative trust rank of a scope (index in CONFIG_SCOPES). Higher = more trusted.
function scopeRank(scope: ConfigScope): number {
  return CONFIG_SCOPES.indexOf(scope);
}

export interface ConfigLayer {
  readonly scope: ConfigScope;
  readonly value: string;
}

// Deterministic precedence resolution with fail-closed validation and override
// policy. Required+absent fails closed; a security-control key may only be set by an
// authorised override scope (never silently broadened by a lower-trust layer).
export function resolveConfigValue(
  def: ConfigKeyDefinition,
  layers: readonly ConfigLayer[],
): string | number | boolean {
  // Highest-trust layer that is permitted to set this key wins.
  const permitted = layers
    .filter((layer) => overrideAllowed(def, layer.scope))
    .sort((a, b) => scopeRank(b.scope) - scopeRank(a.scope));
  const chosen = permitted[0];
  if (!chosen) {
    if (def.defaultValue !== null) {
      return coerceConfigValue(def, def.defaultValue);
    }
    if (def.required) {
      throw new ConfigValidationError(
        def.key,
        "required-missing",
        "no value in any permitted layer",
      );
    }
    // optional with no default → empty string is the only safe non-value
    return def.type === "boolean" ? false : def.type === "number" ? 0 : "";
  }
  return coerceConfigValue(def, chosen.value);
}

// Whether a given scope may set this key, per its override policy. A security-control
// key is never settable by the tenant layer unless its policy explicitly allows it.
export function overrideAllowed(def: ConfigKeyDefinition, scope: ConfigScope): boolean {
  const baseScopes: ConfigScope[] = ["compiled-default", "repository-default"];
  if (baseScopes.includes(scope)) {
    return true;
  }
  // Absolute invariant: a security-control key is never settable by the tenant
  // layer, regardless of its override policy. Break-glass/operator overrides remain
  // governed by the policy below (a deliberate, audited operator action).
  if (def.securityControl && scope === "tenant") {
    return false;
  }
  switch (def.overridePolicy) {
    case "immutable":
      return false;
    case "environment-only":
      return scope === "environment" || scope === "deployment";
    case "tenant-allowed":
      return scope === "environment" || scope === "deployment" || scope === "tenant";
    case "operator-only":
      return scope === "runtime-override" || scope === "break-glass-override";
    case "break-glass-only":
      return scope === "break-glass-override";
    default:
      return false;
  }
}

export interface ConfigDriftFinding {
  readonly key: string;
  readonly kind:
    | "unknown-key"
    | "missing-required"
    | "tenant-override-of-security-control"
    | "value-outside-schema";
  readonly detail: string;
}

// Detects configuration drift against the registry: unknown keys, missing required
// keys, and a tenant layer attempting to set a security-control key.
export function detectConfigDrift(
  registry: readonly ConfigKeyDefinition[],
  providedKeys: readonly { key: string; scope: ConfigScope }[],
): readonly ConfigDriftFinding[] {
  const findings: ConfigDriftFinding[] = [];
  const byKey = new Map(registry.map((d) => [d.key, d]));
  for (const p of providedKeys) {
    const def = byKey.get(p.key);
    if (!def) {
      findings.push({ key: p.key, kind: "unknown-key", detail: "not in the config registry" });
      continue;
    }
    if (def.securityControl && p.scope === "tenant" && def.overridePolicy !== "tenant-allowed") {
      findings.push({
        key: p.key,
        kind: "tenant-override-of-security-control",
        detail: "a tenant layer may not weaken a security control",
      });
    }
  }
  for (const def of registry) {
    if (def.required && def.defaultValue === null && !providedKeys.some((p) => p.key === def.key)) {
      findings.push({
        key: def.key,
        kind: "missing-required",
        detail: "required key has no value",
      });
    }
  }
  return findings;
}

// Deterministic feature-flag evaluation: a known value wins, otherwise the safe
// default. An unknown/missing flag fails to the safe default (never permissive by
// accident). A security-control flag is never disabled by an ordinary flag layer.
export function evaluateFeatureFlag(
  def: FeatureFlagDefinition | undefined,
  value: boolean | undefined,
): boolean {
  if (!def) {
    return false; // unknown flag → safe (off)
  }
  if (value === undefined) {
    return def.safeDefault;
  }
  return value;
}

// Value-free change evidence: hashes of the previous and new values (sha256), never
// the raw values. Safe for audit metadata and config-change records.
export function configChangeEvidence(input: {
  key: string;
  previousValue: string | null;
  newValue: string | null;
  changeActor: string;
  changeReason: string;
  changeSource: ConfigScope;
}): Readonly<Record<string, string>> {
  const hash = (v: string | null): string =>
    v === null ? "null" : createHash("sha256").update(v).digest("hex");
  return Object.freeze({
    key: input.key,
    changeActor: input.changeActor,
    changeReason: input.changeReason,
    changeSource: input.changeSource,
    previousValueHash: hash(input.previousValue),
    newValueHash: hash(input.newValue),
  });
}

// ---------------------------------------------------------------------------
// Files / object-storage model (parity-files-storage, USF-146).
//
// Files are tenant-scoped INFORMATION ASSETS: the metadata record is authoritative
// (ownership, classification, lifecycle, access, retention, integrity); the object
// store holds opaque blobs only. Object keys are opaque, non-guessable, and
// path-traversal-safe and never embed tenant names, emails, original filenames, or
// secrets. Uploads are untrusted input (filename/content-type/checksum verified;
// size fails closed). Downloads are privileged (PDP + scan gate). ISO 27001-
// supporting technical control evidence only; no certification claim. See
// docs/architecture/files-and-object-storage-standard.md.
// ---------------------------------------------------------------------------

export const FILE_SCHEMA_VERSION = "file-1";

// Information-asset classification (app-layer access model). Maps to the 5-value
// DB data_classification persistence scale; "regulated"/"legal-evidence" map to
// "restricted"/"security-sensitive" at rest. Unknown classification fails closed.
export const FILE_CLASSIFICATIONS = Object.freeze([
  "public",
  "internal",
  "confidential",
  "restricted",
  "security-sensitive",
  "regulated",
  "legal-evidence",
] as const);
export type FileClassification = (typeof FILE_CLASSIFICATIONS)[number];

export const FILE_OBJECT_CLASSES = Object.freeze([
  "tenant-file",
  "system-file",
  "audit-evidence-file",
  "export-package",
  "import-package",
  "temporary-upload",
  "quarantine-object",
  "derived-preview",
  "thumbnail",
  "provider-internal-object",
] as const);
export type FileObjectClass = (typeof FILE_OBJECT_CLASSES)[number];

export const FILE_STATUSES = Object.freeze([
  "pending-upload",
  "uploaded",
  "available",
  "quarantined",
  "blocked",
  "deleted",
  "restored",
  "purged",
  "failed",
] as const);
export type FileStatusValue = (typeof FILE_STATUSES)[number];

export const FILE_SCAN_STATUSES = Object.freeze([
  "not-required",
  "pending",
  "clean",
  "suspicious",
  "infected",
  "failed",
  "quarantined",
  "provider-unavailable",
] as const);
export type FileScanStatusValue = (typeof FILE_SCAN_STATUSES)[number];

/** Classifications that require the stronger sensitive-read permission to download. */
export const SENSITIVE_FILE_CLASSIFICATIONS: readonly FileClassification[] = Object.freeze([
  "restricted",
  "security-sensitive",
  "regulated",
  "legal-evidence",
]);

export function isSensitiveFileClassification(classification: FileClassification): boolean {
  return SENSITIVE_FILE_CLASSIFICATIONS.includes(classification);
}

// Upload limits (fail closed). Content-type allow-list is one of several checks, never
// the only one (content_type from the client is untrusted until verified).
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB dev/test ceiling
export const ALLOWED_CONTENT_TYPES = Object.freeze([
  "text/plain",
  "application/json",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/csv",
  "application/octet-stream",
] as const);

export class FileValidationError extends Error {
  readonly reasonCode: string;
  constructor(reasonCode: string, detail: string) {
    super(`file rejected: ${reasonCode} (${detail})`);
    this.name = "FileValidationError";
    this.reasonCode = reasonCode;
  }
}

export function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// Deterministic-in-tests, non-enumerable-in-semantics object key. A salt is required;
// without it (or with a guessable one) keys would be enumerable. The key is opaque hex
// path segments only — it embeds no tenant name, email, filename, secret, or
// business-revealing timestamp, and is path-traversal-safe by construction.
export function generateObjectKey(input: {
  tenantId: string;
  fileId: string;
  salt: string;
}): string {
  // HMAC keyed by the salt over a JSON-encoded part list: unambiguous across part
  // boundaries (no separator collision) and unguessable without the salt.
  const h = createHmac("sha256", input.salt)
    .update(JSON.stringify([input.tenantId, input.fileId]), "utf8")
    .digest("hex");
  return `o/${h.slice(0, 2)}/${h.slice(2, 4)}/${h}`;
}

// Opaque key shape: lowercase hex segments separated by single slashes; no dots, no
// traversal, no separators that could be abused. Validators/tests assert this holds.
const SAFE_OBJECT_KEY = /^[a-z0-9]{1,16}(?:\/[a-z0-9]{1,128}){1,10}$/;
const TRAVERSAL_PATTERNS = ["..", "%2e", "%2f", "%5c", "\\", " ", " ", " ", "﻿", "\0"];

export function assertSafeObjectKey(key: string): void {
  const lowered = key.toLowerCase();
  for (const bad of TRAVERSAL_PATTERNS) {
    if (lowered.includes(bad)) {
      throw new FileValidationError("unsafe-object-key", "contains a traversal/separator pattern");
    }
  }
  if (key.startsWith("/") || !SAFE_OBJECT_KEY.test(key)) {
    throw new FileValidationError("unsafe-object-key", "not an opaque hex object key");
  }
}

// True if an object key leaks sensitive identifiers (tenant id, email local-part,
// original filename stem, or a secret-like token). A generated key never does; this
// guards against hand-built keys.
export function objectKeyLeaksSensitive(
  key: string,
  context: { tenantId?: string; email?: string; filename?: string },
): boolean {
  const lowered = key.toLowerCase();
  const needles: string[] = [];
  if (context.tenantId) needles.push(context.tenantId.toLowerCase());
  if (context.email) {
    needles.push(context.email.toLowerCase(), context.email.split("@")[0]!.toLowerCase());
  }
  if (context.filename) {
    const stem = context.filename.toLowerCase().replace(/\.[a-z0-9]+$/, "");
    if (stem.length >= 3) needles.push(stem);
  }
  return needles.some((n) => n.length >= 3 && lowered.includes(n)) || isSecretLikeKey(key);
}

// A filesystem-safe display filename derived from an untrusted original. The original
// is preserved separately as metadata; this is never used as a storage key.
export function safeFilename(original: string): string {
  const base = original.replace(/^.*[\\/]/, "").trim();
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.{2,}/g, "_");
  return cleaned.slice(0, 200) || "file";
}

export interface UploadValidationInput {
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly declaredChecksum?: string;
  readonly body?: string;
  readonly allowZeroByte?: boolean;
}

// Fails closed: oversize, disallowed/empty content-type, zero-byte (unless explicitly
// allowed), and checksum mismatch when the body is available to verify. The client
// content-type is recorded as unverified; verification is the caller's responsibility.
export function validateUpload(input: UploadValidationInput): { checksum: string | null } {
  if (input.sizeBytes < 0 || input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError("size-limit", `0..${MAX_FILE_SIZE_BYTES} bytes`);
  }
  if (input.sizeBytes === 0 && !input.allowZeroByte) {
    throw new FileValidationError("zero-byte", "empty uploads are not allowed by default");
  }
  if (!input.contentType || !ALLOWED_CONTENT_TYPES.includes(input.contentType as never)) {
    throw new FileValidationError("content-type", "content type is not in the allow-list");
  }
  let checksum: string | null = null;
  if (input.body !== undefined) {
    checksum = sha256Hex(input.body);
    if (input.declaredChecksum && input.declaredChecksum !== checksum) {
      throw new FileValidationError(
        "checksum-mismatch",
        "declared checksum does not match content",
      );
    }
    if (input.body.length !== input.sizeBytes) {
      throw new FileValidationError("size-mismatch", "declared size does not match content length");
    }
  }
  return { checksum };
}

export interface FileMetadata {
  readonly fileId: string;
  readonly tenantId: string;
  readonly ownerActorId: string;
  readonly objectKey: string;
  readonly bucket: string;
  readonly providerRef: string;
  readonly storageClass: string;
  readonly objectClass: FileObjectClass;
  readonly filenameOriginal: string;
  readonly filenameSafe: string;
  readonly contentType: string;
  readonly contentTypeVerified: boolean;
  readonly sizeBytes: number;
  readonly checksumSha256: string | null;
  readonly etag: string | null;
  readonly status: FileStatusValue;
  readonly scanStatus: FileScanStatusValue;
  readonly quarantineReason: string | null;
  readonly classification: FileClassification;
  readonly dataClassification: DataSensitivity;
  readonly retentionPolicy: string;
  readonly legalHold: boolean;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly traceId: string | null;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly deletedAt: string | null;
  readonly metadataHash: string;
}

// Maps the 7-value information-asset classification onto the 5-value DB persistence
// scale (regulated→restricted, legal-evidence→security-sensitive).
function dataSensitivityFor(classification: FileClassification): DataSensitivity {
  switch (classification) {
    case "regulated":
      return "restricted";
    case "legal-evidence":
      return "security-sensitive";
    default:
      return classification;
  }
}

export function metadataHash(meta: Omit<FileMetadata, "metadataHash">): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        meta.fileId,
        meta.tenantId,
        meta.objectKey,
        meta.contentType,
        meta.sizeBytes,
        meta.checksumSha256,
        meta.status,
        meta.scanStatus,
        meta.classification,
        meta.legalHold,
      ]),
      "utf8",
    )
    .digest("hex");
}

export interface CreateFileMetadataInput {
  readonly fileId: string;
  readonly tenantId: string;
  readonly ownerActorId: string;
  readonly salt: string;
  readonly filenameOriginal: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly body?: string;
  readonly declaredChecksum?: string;
  readonly classification?: FileClassification;
  readonly objectClass?: FileObjectClass;
  readonly correlationId?: string;
  readonly causationId?: string | null;
  readonly traceId?: string | null;
  readonly legalHold?: boolean;
  readonly retentionPolicy?: string;
}

// Builds validated, classified file metadata with a safe generated object key and a
// computed checksum + metadata hash. Fails closed on a non-canonical classification or
// failed upload validation.
export function createFileMetadata(input: CreateFileMetadataInput): FileMetadata {
  const classification = input.classification ?? "confidential";
  if (!FILE_CLASSIFICATIONS.includes(classification)) {
    throw new FileValidationError("unknown-classification", `not a canonical classification`);
  }
  const { checksum } = validateUpload({
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    ...(input.declaredChecksum !== undefined ? { declaredChecksum: input.declaredChecksum } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
  });
  const objectKey = generateObjectKey({
    tenantId: input.tenantId,
    fileId: input.fileId,
    salt: input.salt,
  });
  assertSafeObjectKey(objectKey);
  const base = {
    fileId: assertNonEmpty(input.fileId, "fileId"),
    tenantId: assertNonEmpty(input.tenantId, "tenantId"),
    ownerActorId: assertNonEmpty(input.ownerActorId, "ownerActorId"),
    objectKey,
    bucket: "tenant-objects",
    providerRef: "in-memory",
    storageClass: "standard",
    objectClass: input.objectClass ?? "tenant-file",
    filenameOriginal: input.filenameOriginal,
    filenameSafe: safeFilename(input.filenameOriginal),
    contentType: input.contentType,
    contentTypeVerified: false,
    sizeBytes: input.sizeBytes,
    checksumSha256: checksum,
    etag: null,
    status: "uploaded" as FileStatusValue,
    scanStatus: "not-required" as FileScanStatusValue,
    quarantineReason: null,
    classification,
    dataClassification: dataSensitivityFor(classification),
    retentionPolicy: input.retentionPolicy ?? "standard",
    legalHold: input.legalHold ?? false,
    correlationId: input.correlationId ?? input.fileId,
    causationId: input.causationId ?? null,
    traceId: input.traceId ?? null,
    createdAt: new Date().toISOString(),
    createdBy: input.ownerActorId,
    deletedAt: null,
  };
  return Object.freeze({ ...base, metadataHash: metadataHash(base) });
}

// Download gate: a file is downloadable only when its lifecycle status and scan status
// are both safe. Deleted/purged/blocked/quarantined files and pending/suspicious/
// infected/failed/quarantined scans fail closed (privileged release is a separate path).
export function isDownloadable(meta: Pick<FileMetadata, "status" | "scanStatus">): {
  ok: boolean;
  reasonCode: string;
} {
  if (meta.status !== "available" && meta.status !== "uploaded" && meta.status !== "restored") {
    return { ok: false, reasonCode: `status-${meta.status}` };
  }
  if (!["not-required", "clean"].includes(meta.scanStatus)) {
    return { ok: false, reasonCode: `scan-${meta.scanStatus}` };
  }
  return { ok: true, reasonCode: "ok" };
}

export interface SafeFileView {
  readonly fileId: string;
  readonly tenantId: string;
  readonly ownerActorId: string;
  readonly filenameSafe: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string | null;
  readonly status: string;
  readonly scanStatus: string;
  readonly classification: string;
  readonly legalHold: boolean;
  readonly createdAt: string;
  readonly verificationStatus: string;
}

// Least-disclosure projection for API/list output: NO object key, bucket, provider
// ref, original filename (PII), correlation internals, or metadata hash internals.
export function toSafeFileView(meta: FileMetadata): SafeFileView {
  return {
    fileId: meta.fileId,
    tenantId: meta.tenantId,
    ownerActorId: meta.ownerActorId,
    filenameSafe: meta.filenameSafe,
    contentType: meta.contentType,
    sizeBytes: meta.sizeBytes,
    checksumSha256: meta.checksumSha256,
    status: meta.status,
    scanStatus: meta.scanStatus,
    classification: meta.classification,
    legalHold: meta.legalHold,
    createdAt: meta.createdAt,
    verificationStatus: meta.checksumSha256 ? "checksum-recorded" : "unverified",
  };
}

// ===========================================================================
// Keycloak-brokered authentication & identity (parity-auth-keycloak-broker,
// USF-133 / ADR 0012). Constitutional boundary (Charter §6, ADR 0010/0012):
//   * Keycloak is the ONLY USF-facing identity provider and token issuer.
//   * USF validates Keycloak-issued tokens ONLY (local OIDC/JWT validation).
//   * Upstream external IdPs exist only as opaque brokered provenance BEHIND
//     Keycloak; their tokens are never accepted, and no individual upstream
//     provider is modelled, named, configured, or special-cased in USF.
//   * Identity is authentication input; the PDP (ADR 0010) remains the sole
//     authorization authority. A Keycloak claim/role/group or a broker alias
//     never authorizes on its own.
//   * Email is never the primary actor identity (realm + subject is).
// ===========================================================================

/** Identity assurance ladder (NIST-AAL-inspired; informs PDP, never replaces it).
 *  Step-up/MFA live flow is DEFERRED — see the Auth & Identity Standard. */
export const ASSURANCE_LEVELS = Object.freeze([
  "loa0-unknown",
  "loa1-password-or-brokered-basic",
  "loa2-mfa-or-stronger",
  "loa3-phishing-resistant-or-admin-approved",
  "loa4-high-assurance-admin",
] as const);
export type AssuranceLevel = (typeof ASSURANCE_LEVELS)[number];

/** USF accepts exactly one signing algorithm family for Keycloak tokens. `none`,
 *  HS*, and anything outside this allow-list fail closed. */
export const KEYCLOAK_TOKEN_ALG_ALLOWLIST = Object.freeze(["RS256"] as const);
export type KeycloakTokenAlg = (typeof KEYCLOAK_TOKEN_ALG_ALLOWLIST)[number];

/** Why a presented token was rejected. Value-free and safe for audit/logs/errors. */
export type KeycloakDenyReason =
  | "malformed-token"
  | "unsupported-algorithm"
  | "unknown-key"
  | "invalid-signature"
  | "issuer-not-keycloak"
  | "brokered-upstream-issuer-presented-directly"
  | "audience-mismatch"
  | "expired"
  | "not-yet-valid"
  | "issued-in-future"
  | "missing-subject"
  | "missing-realm";

export class KeycloakTokenError extends Error {
  readonly reasonCode: KeycloakDenyReason;
  constructor(reasonCode: KeycloakDenyReason) {
    // Message carries only the value-free reason code; never the token.
    super(`keycloak token rejected: ${reasonCode}`);
    this.name = "KeycloakTokenError";
    this.reasonCode = reasonCode;
  }
}

/** Opaque brokered-upstream provenance carried THROUGH Keycloak. Provenance only —
 *  never an authorization input. No individual upstream provider is named/modelled. */
export interface BrokeredIdentityProvenance {
  readonly brokerAlias: string | null;
  readonly brokeredSubjectRef: string | null;
  readonly brokeredIssuerRef: string | null;
  readonly emailVerifiedUpstream: boolean;
}

/** A validated Keycloak-issued token. USF only ever holds verified tokens of this
 *  shape; raw token strings never enter the domain, audit, logs, errors, or APIs. */
export interface VerifiedKeycloakToken {
  readonly issuer: string;
  readonly keycloakRealm: string;
  readonly keycloakSubject: string;
  readonly audience: readonly string[];
  readonly email: string | null;
  readonly emailVerified: boolean;
  readonly assuranceLevel: AssuranceLevel;
  readonly issuedAt: number;
  readonly notBefore: number | null;
  readonly expiresAt: number;
  readonly keycloakSessionState: string | null;
  readonly provenance: BrokeredIdentityProvenance;
  // Claims are authentication inputs ONLY; the PDP never trusts them as grants.
  readonly realmRoleClaims: readonly string[];
  readonly groupClaims: readonly string[];
}

export const SESSION_STATUSES = Object.freeze([
  "created",
  "active",
  "expired",
  "revoked",
  "logged_out",
  "invalid",
  "unknown",
] as const);
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_RISK_LEVELS = Object.freeze(["low", "elevated", "high"] as const);
export type SessionRiskLevel = (typeof SESSION_RISK_LEVELS)[number];

/** A tenant-bound session. Holds OPAQUE hashes of the Keycloak subject/session, never
 *  raw tokens, cookies, refresh tokens, or credentials. */
export interface Session {
  readonly sessionId: string;
  readonly actorId: string;
  readonly keycloakRealm: string;
  readonly keycloakSubjectHash: string;
  readonly keycloakSessionIdHash: string | null;
  readonly selectedTenantId: string | null;
  readonly assuranceLevel: AssuranceLevel;
  readonly status: SessionStatus;
  readonly riskLevel: SessionRiskLevel;
  readonly authenticationTime: string;
  readonly lastActivityAt: string;
  readonly expiresAt: string;
  readonly idleExpiresAt: string;
  readonly revokedAt: string | null;
  readonly revocationReason: string | null;
}

/** Least-disclosure projection of a session for API output: no hashes, no realm
 *  internals, no broker internals — only what a UI safely needs. */
export interface SafeSessionView {
  readonly sessionId: string;
  readonly actorId: string;
  readonly selectedTenantId: string | null;
  readonly assuranceLevel: AssuranceLevel;
  readonly status: SessionStatus;
  readonly riskLevel: SessionRiskLevel;
  readonly authenticationTime: string;
  readonly expiresAt: string;
}

export function toSafeSessionView(session: Session): SafeSessionView {
  return Object.freeze({
    sessionId: session.sessionId,
    actorId: session.actorId,
    selectedTenantId: session.selectedTenantId,
    assuranceLevel: session.assuranceLevel,
    status: session.status,
    riskLevel: session.riskLevel,
    authenticationTime: session.authenticationTime,
    expiresAt: session.expiresAt,
  });
}

/** Opaque, stable, non-reversible hash for identifiers that must appear in
 *  evidence (subject/session) without disclosing the raw value. */
export function opaqueHash(value: string): string {
  return createHash("sha256").update(assertNonEmpty(value, "opaqueHash.value")).digest("hex");
}

/** The stable external-subject key for an actor: Keycloak realm + subject. Email is
 *  deliberately NOT part of the key (duplicate emails must not collapse actors). */
export function keycloakExternalSubject(realm: string, subject: string): string {
  return `keycloak:${assertNonEmpty(realm, "realm")}:${assertNonEmpty(subject, "subject")}`;
}

// ===========================================================================
// Jobs & workflows (parity-jobs-workflows, USF-133 / ADR 0011 / ADR 0013).
// ADR 0011 port family: a durable workflow port and a separate operational
// job/automation port (in-memory dev adapters; Temporal/Windmill are lineage-
// only, never a live claim). Jobs are controlled execution: classified, tenant-
// scoped or run by a concrete service actor, PDP-authorized, bounded-retry,
// idempotent on side effects, value-redacted on failure, and audited.
// ===========================================================================

/** Exactly-one classification for every job/workflow (ADR 0011 + jobs standard). */
export const JOB_CLASSIFICATIONS = Object.freeze([
  "durable-domain-workflow",
  "operational-automation-job",
  "scheduled-maintenance-job",
  "human-approval-flow",
  "event-triggered-job",
  "import-export-job",
  "notification-job",
  "file-processing-job",
  "audit-maintenance-job",
  "security-control-job",
  "identity-lifecycle-job",
  "provider-sync-job",
  "system-internal-job",
] as const);
export type JobClassification = (typeof JOB_CLASSIFICATIONS)[number];

export const JOB_STATUSES = Object.freeze([
  "queued",
  "scheduled",
  "leased",
  "running",
  "waiting",
  "awaiting-approval",
  "succeeded",
  "failed",
  "retrying",
  "dead-lettered",
  "cancelled",
  "expired",
  "blocked",
] as const);
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Terminal statuses never run again (cancelled/expired must not execute). */
export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = Object.freeze([
  "succeeded",
  "dead-lettered",
  "cancelled",
  "expired",
]);

export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

export const WORKFLOW_STATUSES = Object.freeze([
  "running",
  "waiting",
  "awaiting-approval",
  "completed",
  "failed",
  "cancelled",
] as const);
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

/** Canonical, structured failure taxonomy. Unknown fails closed. */
export const JOB_FAILURE_CLASSES = Object.freeze([
  "validation-failed",
  "authorization-denied",
  "tenant-context-missing",
  "tenant-context-mismatch",
  "idempotency-conflict",
  "provider-timeout",
  "provider-denied",
  "provider-error",
  "transient-error",
  "permanent-error",
  "timeout",
  "cancelled",
  "expired",
  "dead-lettered",
  "unknown",
] as const);
export type JobFailureClass = (typeof JOB_FAILURE_CLASSES)[number];

/** Only transient classes are retryable; everything else is permanent (fail closed). */
const RETRYABLE_FAILURE_CLASSES: readonly JobFailureClass[] = Object.freeze([
  "transient-error",
  "provider-timeout",
  "timeout",
]);

/** Bounded, deterministic backoff. maxRetries MUST be finite and >= 0 (no unbounded retry). */
export interface BackoffPolicy {
  readonly strategy: "fixed" | "exponential";
  readonly baseSeconds: number;
  readonly factor: number;
  readonly maxRetries: number;
  readonly maxBackoffSeconds: number;
  readonly jitter: boolean;
}

export function assertBoundedBackoff(policy: BackoffPolicy): BackoffPolicy {
  if (!Number.isFinite(policy.maxRetries) || policy.maxRetries < 0 || policy.maxRetries > 100) {
    throw new Error("backoff maxRetries must be a finite bound in [0,100] (no unbounded retry)");
  }
  if (policy.baseSeconds < 0 || policy.maxBackoffSeconds < 0) {
    throw new Error("backoff seconds must be non-negative");
  }
  return policy;
}

/** Deterministic backoff for an attempt (1-based). Jitter, when enabled, is a
 *  documented deterministic spread derived from the attempt — never Math.random. */
export function nextBackoffSeconds(policy: BackoffPolicy, attempt: number): number {
  const raw =
    policy.strategy === "fixed"
      ? policy.baseSeconds
      : policy.baseSeconds * Math.pow(policy.factor, Math.max(0, attempt - 1));
  const capped = Math.min(raw, policy.maxBackoffSeconds);
  if (!policy.jitter) {
    return capped;
  }
  // Deterministic jitter: a stable fraction in [0.5,1.0] from the attempt index.
  const fraction = 0.5 + ((attempt * 2654435761) % 1000) / 2000;
  return Math.round(capped * fraction);
}

/** Whether a failed attempt may retry: the failure class is retryable AND the
 *  bounded retry budget is not exhausted. Bounded by construction. */
export function isRetryable(
  failureClass: JobFailureClass,
  attempt: number,
  maxRetries: number,
): boolean {
  return RETRYABLE_FAILURE_CLASSES.includes(failureClass) && attempt <= maxRetries;
}

/** A concrete service-actor identity for system jobs. A service actor is NOT a
 *  global tenant bypass: it has explicit permissions and is audited. */
export const SERVICE_ACTOR_PREFIX = "urn:usf:service:";

export function serviceActorId(name: string): string {
  return `${SERVICE_ACTOR_PREFIX}${assertNonEmpty(name, "serviceActorName")}`;
}

export function isServiceActor(actorId: string): boolean {
  return actorId.startsWith(SERVICE_ACTOR_PREFIX);
}

/** Deterministic schedule. Stored execution time is UTC; tenant-local interpretation
 *  and cron are deferred (jobs standard). Missed-run policy is explicit. */
export const MISSED_RUN_POLICIES = Object.freeze(["skip", "run-once", "fail-closed"] as const);
export type MissedRunPolicy = (typeof MISSED_RUN_POLICIES)[number];

export interface ScheduleSpec {
  readonly scheduleId: string;
  readonly intervalSeconds: number;
  readonly timezone: "UTC";
  readonly anchorEpochSeconds: number;
  readonly missedRunPolicy: MissedRunPolicy;
  readonly maxCatchupRuns: number;
}

export function assertSchedule(spec: ScheduleSpec): ScheduleSpec {
  if (spec.timezone !== "UTC") {
    throw new Error("stored schedule execution must be UTC (tenant-local is deferred)");
  }
  if (!Number.isFinite(spec.intervalSeconds) || spec.intervalSeconds <= 0) {
    throw new Error("schedule intervalSeconds must be a positive finite number");
  }
  if (!MISSED_RUN_POLICIES.includes(spec.missedRunPolicy)) {
    throw new Error(`unknown missed-run policy: ${spec.missedRunPolicy}`);
  }
  if (!Number.isFinite(spec.maxCatchupRuns) || spec.maxCatchupRuns < 0) {
    throw new Error("schedule maxCatchupRuns must be a finite bound (catch-up is bounded)");
  }
  return spec;
}

/** Which scheduled window `nowSec` falls in. The same window yields the same key, so a
 *  double tick never double-enqueues (idempotent scheduling; ../react lineage). */
export function scheduleWindow(spec: ScheduleSpec, nowSec: number): number {
  return Math.floor((nowSec - spec.anchorEpochSeconds) / spec.intervalSeconds);
}

export function scheduleDueKey(spec: ScheduleSpec, nowSec: number): string {
  return `sched:${spec.scheduleId}:${scheduleWindow(spec, nowSec)}`;
}

/** Redacts a failure message so a secret-looking value never reaches a client-safe
 *  field (reuses the config-slice secret detectors). */
export function safeFailureMessage(raw: string): string {
  const tokens = raw.split(/(\s+)/);
  return tokens
    .map((t) => (isSecretLikeKey(t) || looksLikeSecretValue(t) ? CONFIG_REDACTED : t))
    .join("");
}

// ---------------------------------------------------------------------------
// Observability / telemetry model (parity-observability-telemetry, USF-133).
//
// Telemetry is a tenant-safe operational evidence surface, not audit evidence and
// not a live monitoring claim. This model is intentionally backend-neutral and
// local/dev/test oriented; provider export is disabled unless separately
// authorised. Metrics fail closed on unsafe labels; logs, spans, and events are
// normalised before capture.
// ---------------------------------------------------------------------------

export const TELEMETRY_SIGNAL_CATEGORIES = Object.freeze([
  "metric",
  "trace",
  "span",
  "structured-log",
  "operational-event",
  "health-signal",
  "readiness-signal",
  "liveness-signal",
  "security-signal",
  "audit-linked-signal",
  "provider-status-signal",
] as const);
export type TelemetrySignalCategory = (typeof TELEMETRY_SIGNAL_CATEGORIES)[number];

export const OBSERVABILITY_SIGNAL_CLASSIFICATIONS = Object.freeze([
  "operational",
  "security",
  "privacy-sensitive",
  "tenant-sensitive",
  "audit-linked",
  "provider-status",
  "performance",
  "availability",
  "debug",
  "test",
] as const);
export type ObservabilitySignalClassification =
  (typeof OBSERVABILITY_SIGNAL_CLASSIFICATIONS)[number];

export const OBSERVABILITY_SEVERITIES = Object.freeze([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "security",
] as const);
export type ObservabilitySeverity = (typeof OBSERVABILITY_SEVERITIES)[number];

export const METRIC_TYPES = Object.freeze(["counter", "gauge", "histogram", "summary"] as const);
export type MetricType = (typeof METRIC_TYPES)[number];

export const OBSERVABILITY_FORBIDDEN_PATTERNS = Object.freeze([
  "password",
  "secret",
  "token",
  "api_key",
  "authorization",
  "cookie",
  "private_key",
  "connection_string",
  "credential",
  "jwt",
  "bearer",
  "object_key",
  "recipient_address",
  "raw_email",
  "raw_phone",
  "provider_response",
  "stack_trace",
] as const);

export const OBSERVABILITY_ALLOWED_LABELS = Object.freeze([
  "tenant_id",
  "route_id",
  "operation_id",
  "capability",
  "provider_id",
  "job_id",
  "workflow_id",
  "notification_id",
  "file_id",
  "audit_event_id",
  "signal_name",
  "signal_category",
  "severity",
  "status",
  "method",
  "route",
  "status_code",
  "reason_code",
  "environment_scope",
  "provider_mode",
  "metric_type",
  "unit",
] as const);
export type ObservabilityAllowedLabel = (typeof OBSERVABILITY_ALLOWED_LABELS)[number];

const HIGH_CARDINALITY_LABELS = Object.freeze([
  "user_id",
  "actor_email",
  "email",
  "recipient",
  "recipient_address",
  "object_key",
  "raw_id",
  "stack_trace",
  "provider_response",
] as const);

export class TelemetryValidationError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "TelemetryValidationError";
    this.reasonCode = reasonCode;
  }
}

export interface TelemetryContext {
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly serviceActorId?: string;
  readonly routeId?: string;
  readonly operationId?: string;
  readonly capability?: string;
  readonly providerId?: string;
  readonly jobId?: string;
  readonly workflowId?: string;
  readonly notificationId?: string;
  readonly fileId?: string;
  readonly auditEventId?: string;
  readonly correlationId?: string;
  readonly causationId?: string | null;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly parentSpanId?: string | null;
}

export interface TelemetrySignalBase {
  readonly signalId: string;
  readonly signalName: string;
  readonly signalCategory: TelemetrySignalCategory;
  readonly signalClassification: ObservabilitySignalClassification;
  readonly severity: ObservabilitySeverity;
  readonly tenantId: string;
  readonly actorId: string | null;
  readonly serviceActorId: string | null;
  readonly routeId: string | null;
  readonly operationId: string | null;
  readonly capability: string | null;
  readonly providerId: string | null;
  readonly jobId: string | null;
  readonly workflowId: string | null;
  readonly notificationId: string | null;
  readonly fileId: string | null;
  readonly auditEventId: string | null;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly requestId: string;
  readonly traceId: string;
  readonly spanId: string | null;
  readonly parentSpanId: string | null;
  readonly environmentScope: "local-dev" | "local-composed-test" | "ci" | "staging" | "production";
  readonly providerMode: ProviderAdapterMode;
  readonly dataClassification: DataSensitivity;
  readonly tenantScope: "tenant-scoped" | "cross-tenant-aggregate" | "none";
  readonly actorScope: "actor-scoped" | "service-actor" | "none";
  readonly providerScope: "provider-scoped" | "none";
  readonly redactionPolicy: string;
  readonly cardinalityPolicy: string;
  readonly retentionPolicy: string;
  readonly accessPolicy: string;
  readonly createdAt: string;
}

export interface TelemetryMetricInput {
  readonly metricName: string;
  readonly metricType: MetricType;
  readonly value: number;
  readonly unit: string;
  readonly description: string;
  readonly owner: string;
  readonly labels?: Readonly<Record<string, string>>;
  readonly context: TelemetryContext;
  readonly classification?: ObservabilitySignalClassification;
  readonly dataClassification?: DataSensitivity;
  readonly retentionPolicy?: string;
  readonly sloRelated?: boolean;
}

export interface TelemetrySpanInput {
  readonly spanName: string;
  readonly spanKind: "server" | "client" | "internal" | "producer" | "consumer";
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMs: number;
  readonly status: "ok" | "error" | "unset";
  readonly safeAttributes?: Readonly<Record<string, string>>;
  readonly context: TelemetryContext;
  readonly classification?: ObservabilitySignalClassification;
  readonly dataClassification?: DataSensitivity;
}

export interface TelemetryStructuredLogInput {
  readonly eventName: string;
  readonly severity: ObservabilitySeverity;
  readonly messageTemplate: string;
  readonly safeMessage: string;
  readonly reasonCode: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly context: TelemetryContext;
  readonly classification?: ObservabilitySignalClassification;
  readonly dataClassification?: DataSensitivity;
}

export interface TelemetryOperationalEventInput {
  readonly eventName: string;
  readonly severity: ObservabilitySeverity;
  readonly reasonCode: string;
  readonly safeSummary: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly context: TelemetryContext;
  readonly classification?: ObservabilitySignalClassification;
  readonly category?: Extract<
    TelemetrySignalCategory,
    "operational-event" | "security-signal" | "audit-linked-signal" | "provider-status-signal"
  >;
  readonly dataClassification?: DataSensitivity;
}

export interface TelemetryHealthInput {
  readonly signalName: string;
  readonly status:
    "healthy" | "degraded" | "unavailable" | "disabled" | "not-configured" | "deferred" | "unknown";
  readonly component: string;
  readonly safeSummary: string;
  readonly context: TelemetryContext;
  readonly category?: Extract<
    TelemetrySignalCategory,
    "health-signal" | "readiness-signal" | "liveness-signal"
  >;
  readonly classification?: ObservabilitySignalClassification;
  readonly dataClassification?: DataSensitivity;
}

export type TelemetrySignal =
  | (TelemetrySignalBase & {
      readonly signalCategory: "metric";
      readonly metricName: string;
      readonly metricType: MetricType;
      readonly value: number;
      readonly unit: string;
      readonly description: string;
      readonly owner: string;
      readonly labels: Readonly<Record<string, string>>;
      readonly sloRelated: boolean;
    })
  | (TelemetrySignalBase & {
      readonly signalCategory: "span";
      readonly spanName: string;
      readonly spanKind: TelemetrySpanInput["spanKind"];
      readonly startTime: string;
      readonly endTime: string;
      readonly durationMs: number;
      readonly status: TelemetrySpanInput["status"];
      readonly safeAttributes: Readonly<Record<string, string>>;
    })
  | (TelemetrySignalBase & {
      readonly signalCategory: "structured-log";
      readonly eventName: string;
      readonly messageTemplate: string;
      readonly safeMessage: string;
      readonly reasonCode: string;
      readonly attributes: Readonly<Record<string, string>>;
    })
  | (TelemetrySignalBase & {
      readonly signalCategory:
        "operational-event" | "security-signal" | "audit-linked-signal" | "provider-status-signal";
      readonly eventName: string;
      readonly reasonCode: string;
      readonly safeSummary: string;
      readonly attributes: Readonly<Record<string, string>>;
    })
  | (TelemetrySignalBase & {
      readonly signalCategory: "health-signal" | "readiness-signal" | "liveness-signal";
      readonly status: TelemetryHealthInput["status"];
      readonly component: string;
      readonly safeSummary: string;
    });

export interface TelemetrySignalPage {
  readonly tenantId: string;
  readonly signals: readonly TelemetrySignal[];
  readonly nextCursor: string | null;
}

export interface TelemetryCollectorStatusView {
  readonly providerId: "observability-captured-local";
  readonly providerMode: "in-memory" | "local-test";
  readonly environmentScope: "local-dev";
  readonly healthStatus: "healthy" | "degraded" | "unavailable" | "disabled";
  readonly readinessStatus: "healthy" | "degraded" | "deferred" | "disabled" | "unavailable";
  readonly livenessStatus: "healthy";
  readonly signalCount: number;
  readonly boundedStorageLimit: number;
  readonly exportEnabled: false;
  readonly liveMonitoringReadinessClaim: false;
  readonly liveMetricsBackendClaim: false;
  readonly liveLogBackendClaim: false;
  readonly liveTracingBackendClaim: false;
  readonly liveAlertingClaim: false;
  readonly siemReadinessClaim: false;
  readonly safeFailureMessage: string | null;
}

export function telemetryKeyLooksSensitive(key: string): boolean {
  const lowered = key.toLowerCase();
  return (
    isSecretLikeKey(key) ||
    OBSERVABILITY_FORBIDDEN_PATTERNS.some((pattern) => lowered.includes(pattern))
  );
}

export function telemetryValueLooksSensitive(value: string): boolean {
  const trimmed = value.trim();
  return (
    looksLikeSecretValue(trimmed) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(trimmed) ||
    /\b\d{3}[-.]\d{3}[-.]\d{4}\b/.test(trimmed) ||
    /(?:object|bucket)[-/][A-Za-z0-9_.-]{8,}/i.test(trimmed) ||
    /stack trace|provider response|raw payload/i.test(trimmed)
  );
}

export function safeTelemetryValue(value: string): string {
  const safe = safeFailureMessage(value);
  return telemetryValueLooksSensitive(safe) ? CONFIG_REDACTED : safe;
}

export function redactTelemetryAttributes(
  attributes: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (telemetryKeyLooksSensitive(key)) {
      out[`redacted_attribute_${Object.keys(out).length}`] = CONFIG_REDACTED;
      continue;
    }
    out[key] = safeTelemetryValue(value);
  }
  return Object.freeze(out);
}

export function validateMetricLabels(labels: Readonly<Record<string, string>> = {}): void {
  for (const [key, value] of Object.entries(labels)) {
    if (!OBSERVABILITY_ALLOWED_LABELS.includes(key as ObservabilityAllowedLabel)) {
      throw new TelemetryValidationError("metric-label-not-allow-listed", "metric label denied");
    }
    if ((HIGH_CARDINALITY_LABELS as readonly string[]).includes(key)) {
      throw new TelemetryValidationError("metric-label-high-cardinality", "metric label denied");
    }
    if (telemetryKeyLooksSensitive(key) || telemetryValueLooksSensitive(value)) {
      throw new TelemetryValidationError("metric-label-sensitive", "metric label denied");
    }
  }
}

/** Redacts a job payload for evidence/audit/API: secret-like keys and secret-shaped
 *  values are masked. Payloads SHOULD carry references, not sensitive objects. */
export function redactJobPayload(
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string>> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    flat[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return redactConfigMap(flat);
}

/** An operational job record. Tenant-scoped (tenantId set) or a system job run by a
 *  concrete service actor. Payload carries redacted references, never sensitive objects. */
export interface JobRecord {
  readonly jobId: string;
  readonly tenantId: string | null;
  readonly classification: JobClassification;
  readonly jobType: string;
  readonly status: JobStatus;
  readonly actorId: string;
  readonly serviceActorId: string | null;
  readonly idempotencyKey: string | null;
  readonly correlationId: string;
  readonly priority: number;
  readonly runAfter: number;
  readonly attempt: number;
  readonly maxRetries: number;
  readonly leaseOwner: string | null;
  readonly leaseExpiresAt: number | null;
  readonly deadLetterReason: string | null;
  readonly failureClass: JobFailureClass | null;
  readonly safeFailureMessage: string | null;
  readonly payloadRefs: Readonly<Record<string, string>>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Least-disclosure projection of a job for API/list output: no payload, no lease
 *  internals, no raw failure context — only what a UI safely needs. */
export interface SafeJobView {
  readonly jobId: string;
  readonly tenantId: string | null;
  readonly classification: JobClassification;
  readonly jobType: string;
  readonly status: JobStatus;
  readonly attempt: number;
  readonly maxRetries: number;
  readonly failureClass: JobFailureClass | null;
  readonly safeFailureMessage: string | null;
  readonly createdAt: number;
}

export function toSafeJobView(job: JobRecord): SafeJobView {
  return Object.freeze({
    jobId: job.jobId,
    tenantId: job.tenantId,
    classification: job.classification,
    jobType: job.jobType,
    status: job.status,
    attempt: job.attempt,
    maxRetries: job.maxRetries,
    failureClass: job.failureClass,
    safeFailureMessage: job.safeFailureMessage,
    createdAt: job.createdAt,
  });
}

/** A durable workflow record. Versioned; tenant-bound or system-scoped. */
export interface WorkflowRecord {
  readonly workflowId: string;
  readonly tenantId: string | null;
  readonly classification: JobClassification;
  readonly workflowType: string;
  readonly workflowVersion: string;
  readonly status: WorkflowStatus;
  readonly actorId: string;
  readonly serviceActorId: string | null;
  readonly correlationId: string;
  readonly approvalRequestedBy: string | null;
  readonly approvalDecidedBy: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// ===========================================================================
// Notifications & messaging (parity-notifications-messaging, USF-133).
//
// Notifications are controlled tenant-scoped communications. A notification is
// the intent to communicate; a message is the rendered channel payload; a delivery
// is a provider/channel attempt; delivery evidence is the value-free record of the
// attempt/outcome. This is ISO 27001-supporting technical control evidence only:
// no certification, deliverability, SMTP/SMS/push/webhook-live, or production-live
// readiness claim.
// ===========================================================================

export const NOTIFICATION_SCHEMA_VERSION = "notification-1";

export const NOTIFICATION_CLASSIFICATIONS = Object.freeze([
  "security",
  "authentication",
  "authorization",
  "transactional",
  "workflow",
  "operational",
  "system",
  "file",
  "identity",
  "configuration",
  "audit",
  "maintenance",
  "marketing",
  "bulk",
  "test",
] as const);
export type NotificationClassification = (typeof NOTIFICATION_CLASSIFICATIONS)[number];

export const NOTIFICATION_CHANNELS = Object.freeze([
  "email",
  "sms",
  "push",
  "in-app",
  "webhook",
  "provider-internal",
  "test",
] as const);
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = Object.freeze([
  "draft",
  "queued",
  "scheduled",
  "rendering",
  "rendered",
  "suppressed",
  "sending",
  "sent",
  "delivered",
  "failed",
  "retrying",
  "dead-lettered",
  "cancelled",
  "expired",
  "blocked",
  "provider-unknown",
] as const);
export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATION_PROVIDER_MODES = Object.freeze([
  "in-memory",
  "local-test",
  "mock",
  "composed-test",
  "live-external-deferred",
] as const);
export type NotificationProviderMode = (typeof NOTIFICATION_PROVIDER_MODES)[number];

export const CONSENT_STATUSES = Object.freeze([
  "unknown",
  "granted",
  "denied",
  "withdrawn",
  "not-required",
  "system-mandated",
] as const);
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const SUPPRESSION_REASONS = Object.freeze([
  "recipient-opted-out",
  "tenant-disabled-channel",
  "address-unverified",
  "address-bounced",
  "complaint-received",
  "legal-hold",
  "policy-blocked",
  "rate-limited",
  "provider-blocked",
  "security-blocked",
  "do-not-contact",
] as const);
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

export const UNSUBSCRIBE_STATUSES = Object.freeze([
  "unknown",
  "subscribed",
  "unsubscribed",
  "not-applicable",
] as const);
export type UnsubscribeStatus = (typeof UNSUBSCRIBE_STATUSES)[number];

export const ADDRESS_TYPES = Object.freeze([
  "email",
  "phone",
  "push-token",
  "webhook-url",
  "actor-inbox",
  "provider-ref",
  "test",
] as const);
export type NotificationAddressType = (typeof ADDRESS_TYPES)[number];

export const ADDRESS_STATUSES = Object.freeze([
  "unknown",
  "active",
  "unverified",
  "bounced",
  "complained",
  "suppressed",
  "disabled",
] as const);
export type NotificationAddressStatus = (typeof ADDRESS_STATUSES)[number];

export const RECIPIENT_TYPES = Object.freeze([
  "actor",
  "user",
  "tenant-admin",
  "service",
  "external-contact",
  "test",
] as const);
export type NotificationRecipientType = (typeof RECIPIENT_TYPES)[number];

export const TEMPLATE_STATUSES = Object.freeze(["draft", "approved", "deprecated"] as const);
export type NotificationTemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const BOUNCE_STATUSES = Object.freeze(["none", "bounced"] as const);
export type BounceStatus = (typeof BOUNCE_STATUSES)[number];

export const COMPLAINT_STATUSES = Object.freeze(["none", "complaint-received"] as const);
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const FEEDBACK_EVENT_TYPES = Object.freeze([
  "delivery.bounced",
  "delivery.complaint.received",
  "delivery.opened",
  "delivery.clicked",
  "delivery.unsubscribed",
  "delivery.provider_failed",
  "delivery.provider_deferred",
] as const);
export type NotificationFeedbackEventType = (typeof FEEDBACK_EVENT_TYPES)[number];

export const MANDATORY_NOTIFICATION_CLASSES: readonly NotificationClassification[] = Object.freeze([
  "security",
  "authentication",
  "authorization",
]);

export const CONSENT_REQUIRED_NOTIFICATION_CLASSES: readonly NotificationClassification[] =
  Object.freeze(["marketing", "bulk"]);

const DATA_SENSITIVITY_RANK: Readonly<Record<DataSensitivity, number>> = Object.freeze({
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
  "security-sensitive": 4,
});

export class NotificationPolicyError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "NotificationPolicyError";
    this.reasonCode = reasonCode;
  }
}

export class NotificationTemplateError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "NotificationTemplateError";
    this.reasonCode = reasonCode;
  }
}

export interface NotificationChannelPolicy {
  readonly channel: NotificationChannel;
  readonly providerMode: NotificationProviderMode;
  readonly allowedNotificationClasses: readonly NotificationClassification[];
  readonly verifiedRecipientRequired: boolean;
  readonly maxPayloadBytes: number;
  readonly retryPolicy: BackoffPolicy;
  readonly redactionPolicy: "metadata-only" | "body-retained-by-classification";
}

export const DEFAULT_NOTIFICATION_BACKOFF: BackoffPolicy = Object.freeze({
  strategy: "exponential",
  baseSeconds: 5,
  factor: 2,
  maxRetries: 3,
  maxBackoffSeconds: 900,
  jitter: false,
});

export const DEFAULT_NOTIFICATION_CHANNEL_POLICIES: Readonly<
  Record<NotificationChannel, NotificationChannelPolicy>
> = Object.freeze({
  email: Object.freeze({
    channel: "email",
    providerMode: "in-memory",
    allowedNotificationClasses: NOTIFICATION_CLASSIFICATIONS,
    verifiedRecipientRequired: true,
    maxPayloadBytes: 256_000,
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    redactionPolicy: "metadata-only",
  }),
  sms: Object.freeze({
    channel: "sms",
    providerMode: "in-memory",
    allowedNotificationClasses: Object.freeze([
      "security",
      "authentication",
      "authorization",
      "transactional",
      "workflow",
      "operational",
      "test",
    ] as const),
    verifiedRecipientRequired: true,
    maxPayloadBytes: 1_600,
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    redactionPolicy: "metadata-only",
  }),
  push: Object.freeze({
    channel: "push",
    providerMode: "in-memory",
    allowedNotificationClasses: Object.freeze([
      "security",
      "authentication",
      "authorization",
      "transactional",
      "workflow",
      "operational",
      "system",
      "test",
    ] as const),
    verifiedRecipientRequired: true,
    maxPayloadBytes: 4_096,
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    redactionPolicy: "metadata-only",
  }),
  "in-app": Object.freeze({
    channel: "in-app",
    providerMode: "in-memory",
    allowedNotificationClasses: NOTIFICATION_CLASSIFICATIONS,
    verifiedRecipientRequired: false,
    maxPayloadBytes: 64_000,
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    redactionPolicy: "metadata-only",
  }),
  webhook: Object.freeze({
    channel: "webhook",
    providerMode: "in-memory",
    allowedNotificationClasses: Object.freeze([
      "transactional",
      "workflow",
      "operational",
      "system",
      "file",
      "configuration",
      "audit",
      "maintenance",
      "test",
    ] as const),
    verifiedRecipientRequired: true,
    maxPayloadBytes: 128_000,
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    redactionPolicy: "metadata-only",
  }),
  "provider-internal": Object.freeze({
    channel: "provider-internal",
    providerMode: "mock",
    allowedNotificationClasses: Object.freeze(["operational", "system", "test"] as const),
    verifiedRecipientRequired: false,
    maxPayloadBytes: 16_000,
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    redactionPolicy: "metadata-only",
  }),
  test: Object.freeze({
    channel: "test",
    providerMode: "local-test",
    allowedNotificationClasses: Object.freeze(["test"] as const),
    verifiedRecipientRequired: false,
    maxPayloadBytes: 64_000,
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    redactionPolicy: "metadata-only",
  }),
});

export interface NotificationProviderConfig {
  readonly providerRef: string;
  readonly providerType: string;
  readonly providerMode: NotificationProviderMode;
  readonly channel: NotificationChannel;
  readonly endpoint: string | null;
  readonly allowedHosts: readonly string[];
  readonly allowedSchemes: readonly string[];
  readonly tlsRequired: boolean;
  readonly credentialRef: SecretReference | null;
  readonly senderIdentityRef: string | null;
  readonly rateLimitPolicy: string;
  readonly retryPolicy: BackoffPolicy;
  readonly timeoutPolicy: string;
  readonly circuitBreakerPolicy: string;
  readonly egressPolicy: string;
}

export interface NotificationTemplateVariableDefinition {
  readonly name: string;
  readonly required: boolean;
  readonly dataClassification: DataSensitivity;
}

export interface NotificationTemplateDefinition {
  readonly templateId: string;
  readonly templateKey: string;
  readonly templateVersion: string;
  readonly templateHash: string;
  readonly templateStatus: NotificationTemplateStatus;
  readonly templateOwner: string;
  readonly templateClassification: NotificationClassification;
  readonly allowedChannels: readonly NotificationChannel[];
  readonly allowedNotificationClasses: readonly NotificationClassification[];
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
  readonly subjectClassification: DataSensitivity;
  readonly bodyClassification: DataSensitivity;
  readonly payloadClassification: DataSensitivity;
  readonly renderContextSchema: Readonly<Record<string, unknown>>;
  readonly allowedVariables: readonly NotificationTemplateVariableDefinition[];
  readonly createdBy: string;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly deprecatedAt: string | null;
  readonly immutableAfterFirstUse: boolean;
  readonly firstUsedAt: string | null;
}

export interface RenderedNotificationMessage {
  readonly notificationId: string;
  readonly tenantId: string;
  readonly recipientId: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly templateHash: string;
  readonly subject: string;
  readonly body: string;
  readonly subjectClassification: DataSensitivity;
  readonly bodyClassification: DataSensitivity;
  readonly payloadClassification: DataSensitivity;
}

export interface NotificationRecipient {
  readonly recipientId: string;
  readonly recipientActorId: string | null;
  readonly recipientTenantId: string;
  readonly recipientType: NotificationRecipientType;
  readonly addressRef: string;
  readonly addressType: NotificationAddressType;
  readonly addressVerified: boolean;
  readonly addressStatus: NotificationAddressStatus;
  readonly addressSource: string;
  readonly addressLastVerifiedAt: string | null;
}

export interface NotificationPreference {
  readonly tenantId: string;
  readonly recipientId: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification | "all";
  readonly preferenceScope: string;
  readonly preferenceSource: string;
  readonly consentStatus: ConsentStatus;
  readonly unsubscribeStatus: UnsubscribeStatus;
}

export interface NotificationSuppression {
  readonly tenantId: string;
  readonly recipientId: string;
  readonly channel: NotificationChannel | "all";
  readonly classification: NotificationClassification | "all";
  readonly suppressionStatus: "none" | "active";
  readonly suppressionReason: SuppressionReason;
  readonly suppressionSource: string;
  readonly suppressedAt: string | null;
  readonly suppressedBy: string | null;
  readonly expiresAt: string | null;
  readonly bounceStatus: BounceStatus;
  readonly complaintStatus: ComplaintStatus;
  readonly doNotContact: boolean;
}

export interface NotificationIntent {
  readonly notificationId: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly serviceActorId: string | null;
  readonly recipientId: string;
  readonly recipientType: NotificationRecipientType;
  readonly recipientAddressRef: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly templateHash: string;
  readonly subjectClassification: DataSensitivity;
  readonly bodyClassification: DataSensitivity;
  readonly payloadClassification: DataSensitivity;
  readonly deliveryStatus: NotificationDeliveryStatus;
  readonly providerMode: NotificationProviderMode;
  readonly providerRef: string;
  readonly providerMessageId: string | null;
  readonly idempotencyKey: string;
  readonly dedupeKey: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly traceId: string | null;
  readonly requestId: string | null;
  readonly scheduledFor: string | null;
  readonly sentAt: string | null;
  readonly deliveredAt: string | null;
  readonly failedAt: string | null;
  readonly suppressedAt: string | null;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly deadLetterReason: string | null;
  readonly failureReasonCode: string | null;
  readonly safeFailureMessage: string | null;
  readonly dataClassification: DataSensitivity;
  readonly retentionPolicy: string;
  readonly legalHold: boolean;
  readonly messageBodyRetentionPolicy: string;
  readonly renderedPayloadRetentionPolicy: string;
  readonly deliveryEvidenceRetentionPolicy: string;
  readonly purgeAllowedAt: string | null;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

export interface NotificationDeliveryEvidence {
  readonly notificationId: string;
  readonly tenantId: string;
  readonly deliveryId: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly deliveryStatus: NotificationDeliveryStatus;
  readonly providerMode: NotificationProviderMode;
  readonly providerRef: string;
  readonly providerMessageId: string | null;
  readonly idempotencyKey: string;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly failureReasonCode: string | null;
  readonly safeFailureMessage: string | null;
  readonly recipientAddressHash: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly templateHash: string;
  readonly recordedAt: string;
}

export interface SafeNotificationView {
  readonly notificationId: string;
  readonly tenantId: string;
  readonly recipientId: string;
  readonly recipientType: NotificationRecipientType;
  readonly recipientAddressHash: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly templateHash: string;
  readonly deliveryStatus: NotificationDeliveryStatus;
  readonly providerMode: NotificationProviderMode;
  readonly providerRef: string;
  readonly providerMessageId: string | null;
  readonly idempotencyKey: string;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly failureReasonCode: string | null;
  readonly safeFailureMessage: string | null;
  readonly dataClassification: DataSensitivity;
  readonly retentionPolicy: string;
  readonly legalHold: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function assertNotificationClassification(
  classification: string,
): NotificationClassification {
  if (!NOTIFICATION_CLASSIFICATIONS.includes(classification as NotificationClassification)) {
    throw new NotificationPolicyError(
      "unknown-classification",
      "notification classification is unknown",
    );
  }
  return classification as NotificationClassification;
}

export function assertNotificationChannel(channel: string): NotificationChannel {
  if (!NOTIFICATION_CHANNELS.includes(channel as NotificationChannel)) {
    throw new NotificationPolicyError("unknown-channel", "notification channel is unknown");
  }
  return channel as NotificationChannel;
}

export function isMandatoryNotification(classification: NotificationClassification): boolean {
  return MANDATORY_NOTIFICATION_CLASSES.includes(classification);
}

export function notificationRequiresConsent(classification: NotificationClassification): boolean {
  return CONSENT_REQUIRED_NOTIFICATION_CLASSES.includes(classification);
}

export function maxDataSensitivity(values: readonly DataSensitivity[]): DataSensitivity {
  return values.reduce<DataSensitivity>(
    (max, value) => (DATA_SENSITIVITY_RANK[value] > DATA_SENSITIVITY_RANK[max] ? value : max),
    "public",
  );
}

function isHttpLocalEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1")
    );
  } catch {
    return false;
  }
}

export function validateNotificationProviderConfig(
  config: NotificationProviderConfig,
): NotificationProviderConfig {
  assertNonEmpty(config.providerRef, "providerRef");
  assertNonEmpty(config.providerType, "providerType");
  assertNotificationChannel(config.channel);
  if (!NOTIFICATION_PROVIDER_MODES.includes(config.providerMode)) {
    throw new NotificationPolicyError(
      "unknown-provider-mode",
      "notification provider mode is unknown",
    );
  }
  assertBoundedBackoff(config.retryPolicy);
  if (config.providerMode === "live-external-deferred") {
    throw new NotificationPolicyError(
      "live-external-provider-deferred",
      "live external notification provider mode is deferred",
    );
  }
  if (typeof (config as unknown as { credentialRef?: unknown }).credentialRef === "string") {
    throw new NotificationPolicyError(
      "raw-provider-credential",
      "provider credential must be a secret_ref",
    );
  }
  if (config.credentialRef && !config.credentialRef.secretRef.startsWith("secret://")) {
    throw new NotificationPolicyError(
      "invalid-secret-ref",
      "provider credential must be a secret_ref",
    );
  }
  if (config.endpoint) {
    const endpoint = new URL(config.endpoint);
    const scheme = endpoint.protocol.slice(0, -1);
    if (!config.allowedSchemes.includes(scheme)) {
      throw new NotificationPolicyError(
        "provider-scheme-blocked",
        "provider endpoint scheme is not allowed",
      );
    }
    if (!config.allowedHosts.includes(endpoint.hostname)) {
      throw new NotificationPolicyError(
        "provider-host-blocked",
        "provider endpoint host is not allowed",
      );
    }
    if (!config.tlsRequired && !isHttpLocalEndpoint(config.endpoint)) {
      throw new NotificationPolicyError(
        "tls-required",
        "provider transport requires TLS unless local-only",
      );
    }
    if (config.tlsRequired && endpoint.protocol !== "https:") {
      throw new NotificationPolicyError("tls-required", "provider endpoint must use TLS");
    }
  }
  return Object.freeze({ ...config });
}

function canonicalTemplateHashInput(
  template: Omit<NotificationTemplateDefinition, "templateHash">,
): string {
  return JSON.stringify({
    templateId: template.templateId,
    templateKey: template.templateKey,
    templateVersion: template.templateVersion,
    templateStatus: template.templateStatus,
    templateOwner: template.templateOwner,
    templateClassification: template.templateClassification,
    allowedChannels: [...template.allowedChannels].sort(),
    allowedNotificationClasses: [...template.allowedNotificationClasses].sort(),
    subjectTemplate: template.subjectTemplate,
    bodyTemplate: template.bodyTemplate,
    subjectClassification: template.subjectClassification,
    bodyClassification: template.bodyClassification,
    payloadClassification: template.payloadClassification,
    allowedVariables: [...template.allowedVariables]
      .map((v) => ({ ...v }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}

export function notificationTemplateHash(
  template: Omit<NotificationTemplateDefinition, "templateHash">,
): string {
  return createHash("sha256").update(canonicalTemplateHashInput(template)).digest("hex");
}

export function createNotificationTemplateDefinition(
  template: Omit<NotificationTemplateDefinition, "templateHash">,
): NotificationTemplateDefinition {
  assertNotificationClassification(template.templateClassification);
  for (const channel of template.allowedChannels) {
    assertNotificationChannel(channel);
  }
  for (const classification of template.allowedNotificationClasses) {
    assertNotificationClassification(classification);
  }
  const allowed = new Set<string>();
  for (const variable of template.allowedVariables) {
    if (isSecretLikeKey(variable.name)) {
      throw new NotificationTemplateError(
        "secret-variable-name",
        "template variable name is secret-like",
      );
    }
    if (allowed.has(variable.name)) {
      throw new NotificationTemplateError("duplicate-variable", "template variable is duplicated");
    }
    allowed.add(variable.name);
  }
  return Object.freeze({
    ...template,
    templateHash: notificationTemplateHash(template),
  });
}

function placeholderNames(template: string): readonly string[] {
  const names: string[] = [];
  for (const match of template.matchAll(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g)) {
    const name = match[1];
    if (name) {
      names.push(name);
    }
  }
  return Object.freeze(names);
}

export function containsSecretLikeNotificationContent(value: string): boolean {
  const tokens = value.split(/[\s:=;,]+/).filter(Boolean);
  return tokens.some((token) => isSecretLikeKey(token) || looksLikeSecretValue(token));
}

function renderTemplateString(
  template: string,
  values: Readonly<Record<string, string>>,
  allowedNames: ReadonlySet<string>,
): string {
  for (const name of placeholderNames(template)) {
    if (!allowedNames.has(name)) {
      throw new NotificationTemplateError(
        "unknown-variable",
        "template references an unknown variable",
      );
    }
    if (!(name in values)) {
      throw new NotificationTemplateError("missing-variable", "template variable is missing");
    }
  }
  return template.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_, name: string) => values[name] ?? "");
}

export function renderNotificationTemplate(input: {
  readonly notificationId: string;
  readonly tenantId: string;
  readonly recipientId: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly template: NotificationTemplateDefinition;
  readonly values: Readonly<Record<string, string>>;
}): RenderedNotificationMessage {
  const classification = assertNotificationClassification(input.classification);
  const channel = assertNotificationChannel(input.channel);
  const template = input.template;
  if (template.templateStatus !== "approved") {
    throw new NotificationTemplateError(
      "template-not-approved",
      "template must be approved before use",
    );
  }
  if (!template.allowedChannels.includes(channel)) {
    throw new NotificationTemplateError(
      "channel-not-allowed",
      "template is not allowed for this channel",
    );
  }
  if (!template.allowedNotificationClasses.includes(classification)) {
    throw new NotificationTemplateError(
      "classification-not-allowed",
      "template is not allowed for this classification",
    );
  }
  const allowedNames = new Set(template.allowedVariables.map((v) => v.name));
  for (const key of Object.keys(input.values)) {
    if (!allowedNames.has(key)) {
      throw new NotificationTemplateError(
        "unknown-variable",
        "template values include an unknown variable",
      );
    }
    const value = input.values[key];
    if (value === undefined) {
      throw new NotificationTemplateError("missing-variable", "template variable is missing");
    }
    if (isSecretLikeKey(key) || containsSecretLikeNotificationContent(value)) {
      throw new NotificationTemplateError("secret-like-value", "template value is secret-like");
    }
  }
  for (const variable of template.allowedVariables) {
    if (variable.required && !(variable.name in input.values)) {
      throw new NotificationTemplateError("missing-variable", "template variable is missing");
    }
  }
  const subject = renderTemplateString(template.subjectTemplate, input.values, allowedNames);
  const body = renderTemplateString(template.bodyTemplate, input.values, allowedNames);
  if (
    containsSecretLikeNotificationContent(subject) ||
    containsSecretLikeNotificationContent(body)
  ) {
    throw new NotificationTemplateError(
      "secret-like-render-output",
      "rendered output is secret-like",
    );
  }
  const payloadClassification = maxDataSensitivity([
    template.subjectClassification,
    template.bodyClassification,
    template.payloadClassification,
    ...template.allowedVariables.map((v) => v.dataClassification),
  ]);
  return Object.freeze({
    notificationId: assertNonEmpty(input.notificationId, "notificationId"),
    tenantId: assertNonEmpty(input.tenantId, "tenantId"),
    recipientId: assertNonEmpty(input.recipientId, "recipientId"),
    channel,
    classification,
    templateId: template.templateId,
    templateVersion: template.templateVersion,
    templateHash: template.templateHash,
    subject,
    body,
    subjectClassification: template.subjectClassification,
    bodyClassification: template.bodyClassification,
    payloadClassification,
  });
}

export function notificationAddressHash(addressRef: string): string {
  return `addr_${opaqueHash(addressRef).slice(0, 24)}`;
}

export function notificationDeliveryIdempotencyKey(input: {
  readonly tenantId: string;
  readonly notificationId: string;
  readonly channel: NotificationChannel;
  readonly recipientId: string;
  readonly templateId: string;
  readonly templateVersion: string;
}): string {
  return stableId("notifyidem", [
    input.tenantId,
    input.notificationId,
    input.channel,
    input.recipientId,
    input.templateId,
    input.templateVersion,
  ]);
}

export function notificationDedupeKey(input: {
  readonly tenantId: string;
  readonly recipientId: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly correlationId: string;
}): string {
  return stableId("notifydedupe", [
    input.tenantId,
    input.recipientId,
    input.channel,
    input.classification,
    input.templateId,
    input.templateVersion,
    input.correlationId,
  ]);
}

export function evaluateNotificationDeliveryPolicy(input: {
  readonly context: TenantContext;
  readonly recipient: NotificationRecipient;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly preference?: NotificationPreference;
  readonly suppression?: NotificationSuppression;
  readonly allowMandatoryOptOutBypass: boolean;
  readonly allowUnverifiedSensitiveRecipient: boolean;
  readonly testRecipientAuthorised: boolean;
}): { readonly allowed: true } | { readonly allowed: false; readonly reasonCode: string } {
  assertTenantMatch(input.context, input.recipient.recipientTenantId, "notification.recipient");
  const classification = assertNotificationClassification(input.classification);
  const channel = assertNotificationChannel(input.channel);
  const channelPolicy = DEFAULT_NOTIFICATION_CHANNEL_POLICIES[channel];
  if (!channelPolicy.allowedNotificationClasses.includes(classification)) {
    return { allowed: false, reasonCode: "channel-classification-blocked" };
  }
  if (
    classification === "test" &&
    input.recipient.recipientType !== "test" &&
    !input.testRecipientAuthorised
  ) {
    return { allowed: false, reasonCode: "test-recipient-not-authorised" };
  }
  if (
    (channelPolicy.verifiedRecipientRequired || isMandatoryNotification(classification)) &&
    !input.recipient.addressVerified &&
    !input.allowUnverifiedSensitiveRecipient
  ) {
    return { allowed: false, reasonCode: "address-unverified" };
  }
  if (
    input.recipient.addressStatus === "bounced" ||
    input.recipient.addressStatus === "complained" ||
    input.recipient.addressStatus === "suppressed" ||
    input.recipient.addressStatus === "disabled"
  ) {
    return { allowed: false, reasonCode: `address-${input.recipient.addressStatus}` };
  }
  const suppression = input.suppression;
  if (
    suppression &&
    (suppression.channel === channel || suppression.channel === "all") &&
    (suppression.classification === classification || suppression.classification === "all") &&
    (suppression.suppressionStatus === "active" || suppression.doNotContact)
  ) {
    const mandatoryBypass =
      isMandatoryNotification(classification) &&
      input.allowMandatoryOptOutBypass &&
      suppression.suppressionReason === "recipient-opted-out";
    if (!mandatoryBypass) {
      return { allowed: false, reasonCode: suppression.suppressionReason };
    }
  }
  const preference = input.preference;
  if (notificationRequiresConsent(classification)) {
    if (!preference || preference.consentStatus !== "granted") {
      return { allowed: false, reasonCode: "consent-required" };
    }
    if (preference.unsubscribeStatus === "unsubscribed") {
      return { allowed: false, reasonCode: "recipient-opted-out" };
    }
  }
  return { allowed: true };
}

export function toSafeNotificationView(notification: NotificationIntent): SafeNotificationView {
  return Object.freeze({
    notificationId: notification.notificationId,
    tenantId: notification.tenantId,
    recipientId: notification.recipientId,
    recipientType: notification.recipientType,
    recipientAddressHash: notificationAddressHash(notification.recipientAddressRef),
    channel: notification.channel,
    classification: notification.classification,
    templateId: notification.templateId,
    templateVersion: notification.templateVersion,
    templateHash: notification.templateHash,
    deliveryStatus: notification.deliveryStatus,
    providerMode: notification.providerMode,
    providerRef: notification.providerRef,
    providerMessageId: notification.providerMessageId,
    idempotencyKey: notification.idempotencyKey,
    retryCount: notification.retryCount,
    maxRetries: notification.maxRetries,
    failureReasonCode: notification.failureReasonCode,
    safeFailureMessage: notification.safeFailureMessage,
    dataClassification: notification.dataClassification,
    retentionPolicy: notification.retentionPolicy,
    legalHold: notification.legalHold,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  });
}

export function createNotificationDeliveryEvidence(input: {
  readonly notification: NotificationIntent;
  readonly deliveryId: string;
  readonly deliveryStatus: NotificationDeliveryStatus;
  readonly providerMessageId?: string | null;
  readonly failureReasonCode?: string | null;
  readonly safeFailureMessage?: string | null;
  readonly recordedAt?: string;
}): NotificationDeliveryEvidence {
  return Object.freeze({
    notificationId: input.notification.notificationId,
    tenantId: input.notification.tenantId,
    deliveryId: assertNonEmpty(input.deliveryId, "deliveryId"),
    channel: input.notification.channel,
    classification: input.notification.classification,
    deliveryStatus: input.deliveryStatus,
    providerMode: input.notification.providerMode,
    providerRef: input.notification.providerRef,
    providerMessageId: input.providerMessageId ?? input.notification.providerMessageId,
    idempotencyKey: input.notification.idempotencyKey,
    retryCount: input.notification.retryCount,
    maxRetries: input.notification.maxRetries,
    failureReasonCode: input.failureReasonCode ?? input.notification.failureReasonCode,
    safeFailureMessage: input.safeFailureMessage ?? input.notification.safeFailureMessage ?? null,
    recipientAddressHash: notificationAddressHash(input.notification.recipientAddressRef),
    templateId: input.notification.templateId,
    templateVersion: input.notification.templateVersion,
    templateHash: input.notification.templateHash,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Guardrails / rate limits / abuse controls (parity-rate-limits-abuse, USF-160).
//
// Guardrails are security and availability controls. They never grant
// authorization and authorization success never bypasses them. This model is
// local/dev/test enforceable with no live WAF, edge, CDN, bot, fraud, or abuse
// provider readiness claim.
// ---------------------------------------------------------------------------

export const GUARDRAIL_POLICY_TYPES = Object.freeze([
  "rate-limit",
  "quota",
  "throttle",
  "admission-control",
  "concurrency-limit",
  "burst-limit",
  "backpressure",
  "abuse-detection",
  "suppression",
  "circuit-breaker",
] as const);
export type GuardrailPolicyType = (typeof GUARDRAIL_POLICY_TYPES)[number];

export const GUARDRAIL_CLASSIFICATIONS = Object.freeze([
  "availability-protection",
  "abuse-prevention",
  "tenant-fairness",
  "cost-control",
  "provider-protection",
  "security-protection",
  "data-exfiltration-protection",
  "bulk-operation-protection",
  "operational-safety",
  "test-only",
] as const);
export type GuardrailClassification = (typeof GUARDRAIL_CLASSIFICATIONS)[number];

export const GUARDRAIL_SCOPES = Object.freeze([
  "global",
  "tenant",
  "actor",
  "service-actor",
  "session",
  "route",
  "operation",
  "resource",
  "provider",
  "job",
  "workflow",
  "notification",
  "file",
  "audit-export",
  "config-change",
  "identity-action",
  "ip-derived",
] as const);
export type GuardrailScope = (typeof GUARDRAIL_SCOPES)[number];

export const GUARDRAIL_LIFECYCLES = Object.freeze([
  "draft",
  "active",
  "disabled",
  "shadow",
  "monitor-only",
  "deprecated",
  "revoked",
] as const);
export type GuardrailLifecycle = (typeof GUARDRAIL_LIFECYCLES)[number];

export const GUARDRAIL_DECISIONS = Object.freeze([
  "allow",
  "deny",
  "delay",
  "throttle",
  "degrade",
  "monitor-only",
  "shadow-deny",
] as const);
export type GuardrailDecisionOutcome = (typeof GUARDRAIL_DECISIONS)[number];

export const GUARDRAIL_DISTRIBUTED_ENFORCEMENT_POSTURES = Object.freeze([
  "single-node-in-memory",
  "local-test",
  "composed-test",
  "distributed-deferred",
  "live-edge-deferred",
] as const);
export type GuardrailDistributedEnforcementPosture =
  (typeof GUARDRAIL_DISTRIBUTED_ENFORCEMENT_POSTURES)[number];

export const GUARDRAIL_RISK_LEVELS = Object.freeze([
  "low",
  "medium",
  "high",
  "critical",
  "regulated",
  "security-sensitive",
] as const);
export type GuardrailRiskLevel = (typeof GUARDRAIL_RISK_LEVELS)[number];

export const GUARDRAIL_FORBIDDEN_PATTERNS = Object.freeze([
  ...OBSERVABILITY_FORBIDDEN_PATTERNS,
  "raw_ip",
  "raw_actor",
  "live_waf",
  "live_edge",
  "live_gateway",
  "fraud_provider",
  "bot_provider",
] as const);

export class GuardrailValidationError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "GuardrailValidationError";
    this.reasonCode = reasonCode;
  }
}

export interface GuardrailPolicy {
  readonly policyId: string;
  readonly policyType: GuardrailPolicyType;
  readonly classification: GuardrailClassification;
  readonly scope: GuardrailScope;
  readonly scopeRef: string;
  readonly tenantId: string | null;
  readonly actorId: string | null;
  readonly serviceActorId: string | null;
  readonly routeId: string | null;
  readonly operationId: string | null;
  readonly resourceType: string | null;
  readonly providerId: string | null;
  readonly limit: number;
  readonly windowSeconds: number;
  readonly burstLimit: number | null;
  readonly lifecycle: GuardrailLifecycle;
  readonly policyOwner: string;
  readonly owningCapability: string;
  readonly riskLevel: GuardrailRiskLevel;
  readonly createdBy: string;
  readonly approvedBy: string | null;
  readonly lastReviewedAt: string | null;
  readonly reviewExpiresAt: string | null;
  readonly changeReason: string;
  readonly retryAfterPolicy: "safe-window-reset" | "none";
  readonly denialPolicy:
    "rate-limit-exceeded" | "policy-denied" | "quota-conflict" | "backpressure-applied";
  readonly telemetryPolicy: string;
  readonly auditPolicy: string;
  readonly environmentScope: "local-dev" | "local-composed-test" | "ci" | "staging" | "production";
  readonly dataClassification: DataSensitivity;
  readonly distributedEnforcement: GuardrailDistributedEnforcementPosture;
  readonly liveWafReadinessClaim: false;
  readonly liveEdgeReadinessClaim: false;
  readonly productionReadinessClaim: false;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GuardrailEvaluationInput {
  readonly policyId: string;
  readonly tenantId: string;
  readonly subjectRef: string;
  readonly actorId?: string | null;
  readonly serviceActorId?: string | null;
  readonly routeId?: string | null;
  readonly operationId?: string | null;
  readonly resourceType?: string | null;
  readonly providerId?: string | null;
  readonly quantity?: number;
  readonly idempotencyKey?: string | null;
  readonly requestFingerprint?: string | null;
  readonly correlationId?: string | null;
  readonly requestId?: string | null;
  readonly traceId?: string | null;
  readonly nowMs?: number;
}

export interface GuardrailDecision {
  readonly decisionId: string;
  readonly policyId: string;
  readonly policyType: GuardrailPolicyType;
  readonly scope: GuardrailScope;
  readonly scopeRef: string;
  readonly subjectRef: string;
  readonly tenantId: string;
  readonly actorId: string | null;
  readonly serviceActorId: string | null;
  readonly routeId: string | null;
  readonly operationId: string | null;
  readonly resourceType: string | null;
  readonly providerId: string | null;
  readonly decision: GuardrailDecisionOutcome;
  readonly httpStatus: 200 | 403 | 409 | 429 | 503;
  readonly reasonCode: string;
  readonly safeMessage: string;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: string;
  readonly retryAfter: string | null;
  readonly correlationId: string | null;
  readonly requestId: string | null;
  readonly traceId: string | null;
  readonly createdAt: string;
}

export interface GuardrailPolicyUsage {
  readonly policyId: string;
  readonly tenantId: string;
  readonly subjectRefHash: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
}

export function assertGuardrailPolicyType(value: string): GuardrailPolicyType {
  if (!GUARDRAIL_POLICY_TYPES.includes(value as GuardrailPolicyType)) {
    throw new GuardrailValidationError("unknown-policy-type", "guardrail policy type denied");
  }
  return value as GuardrailPolicyType;
}

export function assertGuardrailClassification(value: string): GuardrailClassification {
  if (!GUARDRAIL_CLASSIFICATIONS.includes(value as GuardrailClassification)) {
    throw new GuardrailValidationError(
      "unknown-policy-classification",
      "guardrail classification denied",
    );
  }
  return value as GuardrailClassification;
}

export function assertGuardrailScope(value: string): GuardrailScope {
  if (!GUARDRAIL_SCOPES.includes(value as GuardrailScope)) {
    throw new GuardrailValidationError("unknown-policy-scope", "guardrail scope denied");
  }
  return value as GuardrailScope;
}

export function assertGuardrailLifecycle(value: string): GuardrailLifecycle {
  if (!GUARDRAIL_LIFECYCLES.includes(value as GuardrailLifecycle)) {
    throw new GuardrailValidationError("unknown-policy-lifecycle", "guardrail lifecycle denied");
  }
  return value as GuardrailLifecycle;
}

export function guardrailTextLooksSensitive(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    telemetryValueLooksSensitive(value) ||
    GUARDRAIL_FORBIDDEN_PATTERNS.some((pattern) => lowered.includes(pattern))
  );
}

export function safeGuardrailMessage(value: string): string {
  const safe = safeTelemetryValue(value);
  return guardrailTextLooksSensitive(safe) ? "guardrail decision" : safe;
}

export function guardrailHttpStatus(input: {
  readonly policyType: GuardrailPolicyType;
  readonly reasonCode: string;
  readonly classification?: GuardrailClassification;
}): 403 | 409 | 429 | 503 {
  if (
    input.reasonCode === "policy-unknown-denied" ||
    input.reasonCode === "scope-unknown-denied" ||
    input.reasonCode === "policy-not-enforcing-fail-closed"
  ) {
    return 403;
  }
  if (input.reasonCode === "idempotency-conflict") return 409;
  if (input.policyType === "backpressure" || input.reasonCode === "backpressure-applied") {
    return 503;
  }
  if (input.policyType === "quota") return 409;
  if (input.policyType === "abuse-detection" || input.classification === "security-protection") {
    return 403;
  }
  return 429;
}

export function validateGuardrailPolicy(policy: GuardrailPolicy): GuardrailPolicy {
  assertNonEmpty(policy.policyId, "guardrail.policyId");
  assertGuardrailPolicyType(policy.policyType);
  assertGuardrailClassification(policy.classification);
  assertGuardrailScope(policy.scope);
  assertGuardrailLifecycle(policy.lifecycle);
  if (!GUARDRAIL_RISK_LEVELS.includes(policy.riskLevel)) {
    throw new GuardrailValidationError("unknown-risk-level", "guardrail risk level denied");
  }
  if (policy.limit < 0 || !Number.isFinite(policy.limit)) {
    throw new GuardrailValidationError("invalid-limit", "guardrail limit denied");
  }
  if (policy.windowSeconds <= 0 || !Number.isFinite(policy.windowSeconds)) {
    throw new GuardrailValidationError("invalid-window", "guardrail window denied");
  }
  if (
    policy.distributedEnforcement === "single-node-in-memory" &&
    (policy.liveWafReadinessClaim ||
      policy.liveEdgeReadinessClaim ||
      policy.productionReadinessClaim)
  ) {
    throw new GuardrailValidationError(
      "in-memory-live-readiness-overclaim",
      "guardrail readiness claim denied",
    );
  }
  for (const [key, value] of Object.entries(policy)) {
    if (typeof value === "string" && guardrailTextLooksSensitive(value)) {
      throw new GuardrailValidationError(
        "policy-config-sensitive-value",
        `guardrail policy field denied: ${key}`,
      );
    }
  }
  return Object.freeze({ ...policy });
}

export function createGuardrailDecision(input: {
  readonly policy: GuardrailPolicy;
  readonly evaluation: GuardrailEvaluationInput;
  readonly decision: GuardrailDecisionOutcome;
  readonly reasonCode: string;
  readonly used: number;
  readonly resetAtMs: number;
  readonly nowMs: number;
}): GuardrailDecision {
  const remaining = Math.max(input.policy.limit - input.used, 0);
  const retryAfterAllowed =
    input.policy.retryAfterPolicy === "safe-window-reset" &&
    (input.reasonCode === "rate-limit-exceeded" ||
      input.reasonCode === "backpressure-applied" ||
      input.decision === "throttle" ||
      input.decision === "delay");
  const retryAfterSeconds = retryAfterAllowed
    ? Math.max(Math.ceil((input.resetAtMs - input.nowMs) / 1000), 0)
    : null;
  const status =
    input.decision === "allow" ||
    input.decision === "monitor-only" ||
    input.decision === "shadow-deny"
      ? 200
      : guardrailHttpStatus({
          policyType: input.policy.policyType,
          reasonCode: input.reasonCode,
          classification: input.policy.classification,
        });
  const subjectRefHash = `subj_${opaqueHash(input.evaluation.subjectRef).slice(0, 24)}`;
  return Object.freeze({
    decisionId: stableId("guardrail", [
      input.policy.policyId,
      input.evaluation.tenantId,
      subjectRefHash,
      String(input.nowMs),
      input.reasonCode,
    ]),
    policyId: input.policy.policyId,
    policyType: input.policy.policyType,
    scope: input.policy.scope,
    scopeRef: input.policy.scopeRef,
    subjectRef: subjectRefHash,
    tenantId: input.evaluation.tenantId,
    actorId: input.evaluation.actorId ?? null,
    serviceActorId: input.evaluation.serviceActorId ?? null,
    routeId: input.evaluation.routeId ?? input.policy.routeId,
    operationId: input.evaluation.operationId ?? input.policy.operationId,
    resourceType: input.evaluation.resourceType ?? input.policy.resourceType,
    providerId: input.evaluation.providerId ?? input.policy.providerId,
    decision: input.decision,
    httpStatus: status,
    reasonCode: safeTelemetryValue(input.reasonCode),
    safeMessage: safeGuardrailMessage(reasonCodeToSafeGuardrailMessage(input.reasonCode)),
    limit: input.policy.limit,
    remaining,
    resetAt: new Date(input.resetAtMs).toISOString(),
    retryAfter: retryAfterSeconds == null ? null : String(retryAfterSeconds),
    correlationId: input.evaluation.correlationId ?? null,
    requestId: input.evaluation.requestId ?? null,
    traceId: input.evaluation.traceId ?? null,
    createdAt: new Date(input.nowMs).toISOString(),
  });
}

export function reasonCodeToSafeGuardrailMessage(reasonCode: string): string {
  switch (reasonCode) {
    case "rate-limit-exceeded":
      return "Rate limit exceeded";
    case "quota-exceeded":
      return "Quota exceeded";
    case "backpressure-applied":
      return "Service cannot safely accept more work";
    case "policy-unknown-denied":
    case "scope-unknown-denied":
    case "policy-not-enforcing-fail-closed":
      return "Request blocked by policy";
    case "idempotency-conflict":
      return "Idempotency conflict";
    default:
      return "Request blocked by guardrail";
  }
}

// ---------------------------------------------------------------------------
// Import/export/bulk operations (parity-import-export-bulk, USF-162).
//
// Import/export is governed tenant-scoped data movement. This model supports
// local/dev/test proof only: no production migration, legal export, eDiscovery,
// regulatory export, live provider transfer, or production-live readiness claim.
// ---------------------------------------------------------------------------

export const BULK_OPERATION_TYPES = Object.freeze([
  "import",
  "export",
  "bulk-create",
  "bulk-update",
  "bulk-delete",
  "bulk-notify",
  "bulk-file-export",
  "audit-export",
  "evidence-package-export",
  "migration",
  "reconciliation",
] as const);
export type BulkOperationType = (typeof BULK_OPERATION_TYPES)[number];

export const BULK_OPERATION_CLASSIFICATIONS = Object.freeze([
  "low-risk",
  "tenant-data",
  "confidential",
  "restricted",
  "security-sensitive",
  "audit-sensitive",
  "regulated",
  "destructive",
  "high-risk",
  "test-only",
] as const);
export type BulkOperationClassification = (typeof BULK_OPERATION_CLASSIFICATIONS)[number];

export const BULK_OPERATION_STATUSES = Object.freeze([
  "draft",
  "queued",
  "validating",
  "previewed",
  "awaiting-approval",
  "approved",
  "running",
  "succeeded",
  "partially-succeeded",
  "failed",
  "cancelled",
  "expired",
  "rejected",
  "quarantined",
  "dead-lettered",
  "purged",
] as const);
export type BulkOperationStatus = (typeof BULK_OPERATION_STATUSES)[number];

export const BULK_SOURCE_DESTINATION_TYPES = Object.freeze([
  "uploaded-file",
  "generated-file",
  "tenant-file",
  "evidence-package",
  "provider-source",
  "provider-destination",
  "system-internal",
  "local-test",
  "manual-operator",
] as const);
export type BulkSourceDestinationType = (typeof BULK_SOURCE_DESTINATION_TYPES)[number];

export const BULK_FILE_FORMATS = Object.freeze([
  "csv",
  "json",
  "jsonl",
  "xlsx",
  "zip",
  "evidence-package",
  "system-internal",
] as const);
export type BulkFileFormat = (typeof BULK_FILE_FORMATS)[number];

export const BULK_ITEM_OUTCOMES = Object.freeze([
  "pending",
  "succeeded",
  "failed",
  "skipped",
  "rejected",
] as const);
export type BulkItemOutcomeStatus = (typeof BULK_ITEM_OUTCOMES)[number];

export const BULK_HIGH_RISK_CLASSIFICATIONS: readonly BulkOperationClassification[] = Object.freeze(
  ["regulated", "destructive", "high-risk", "audit-sensitive"],
);

export class BulkOperationPolicyError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "BulkOperationPolicyError";
    this.reasonCode = reasonCode;
  }
}

export interface BulkEndpointRef {
  readonly refType: BulkSourceDestinationType;
  readonly ref: string;
  readonly fileId: string | null;
  readonly format: BulkFileFormat;
  readonly classification: BulkOperationClassification;
  readonly schemaId: string | null;
  readonly schemaVersion: string | null;
  readonly schemaHash: string | null;
  readonly mappingId: string | null;
  readonly mappingVersion: string | null;
  readonly mappingHash: string | null;
  readonly checksum: string | null;
  readonly scanStatus: FileScanStatusValue | null;
  readonly dataResidencyPolicy: string | null;
}

export interface BulkValidationError {
  readonly rowNumber: number | null;
  readonly recordRef: string | null;
  readonly fieldPath: string;
  readonly safeErrorCode: string;
  readonly safeErrorMessage: string;
}

export interface BulkValidationSummary {
  readonly valid: boolean;
  readonly itemCount: number;
  readonly errorCount: number;
  readonly errors: readonly BulkValidationError[];
}

export interface BulkItemOutcome {
  readonly itemId: string;
  readonly rowNumber: number | null;
  readonly sourceRecordHash: string | null;
  readonly targetRecordRef: string | null;
  readonly operation: BulkOperationType;
  readonly outcome: BulkItemOutcomeStatus;
  readonly safeErrorCode: string | null;
  readonly safeErrorMessage: string | null;
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly correlationId: string | null;
}

export interface EvidencePackageManifest {
  readonly evidencePackageId: string;
  readonly packageType: "evidence-package";
  readonly packageVersion: string;
  readonly manifestHash: string;
  readonly contentHash: string;
  readonly sourceQueryHash: string;
  readonly includedFileIds: readonly string[];
  readonly includedAuditEventIds: readonly string[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly legalHold: boolean;
  readonly retentionPolicy: string;
  readonly chainOfCustodyRef: string;
}

export interface BulkOperationRecord {
  readonly operationId: string;
  readonly operationType: BulkOperationType;
  readonly classification: BulkOperationClassification;
  readonly status: BulkOperationStatus;
  readonly tenantId: string;
  readonly actorId: string | null;
  readonly serviceActorId: string | null;
  readonly source: BulkEndpointRef;
  readonly destination: BulkEndpointRef;
  readonly fileId: string | null;
  readonly jobId: string | null;
  readonly workflowId: string | null;
  readonly idempotencyKey: string;
  readonly dedupeKey: string;
  readonly sourceFingerprint: string;
  readonly operationFingerprint: string;
  readonly guardrailPolicyId: string | null;
  readonly dryRunRequired: boolean;
  readonly dryRunHash: string | null;
  readonly previewHash: string | null;
  readonly approvedPreviewHash: string | null;
  readonly noDryRunRationale: string | null;
  readonly partialSuccessAllowed: boolean;
  readonly maxErrorCount: number;
  readonly maxErrorRate: number;
  readonly rollbackSupported: boolean;
  readonly rollbackJobId: string | null;
  readonly compensationSupported: boolean;
  readonly compensationPlanRef: string | null;
  readonly irreversibleOperation: boolean;
  readonly irreversibleReason: string | null;
  readonly exportScope: string | null;
  readonly approvedScopeHash: string | null;
  readonly validationSummary: BulkValidationSummary;
  readonly itemCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly safeFailureMessage: string | null;
  readonly evidencePackage: EvidencePackageManifest | null;
  readonly retentionPolicy: string;
  readonly legalHold: boolean;
  readonly retainUntil: string | null;
  readonly purgeAllowedAt: string | null;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly requestId: string;
  readonly traceId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SafeBulkOperationView {
  readonly operationId: string;
  readonly operationType: BulkOperationType;
  readonly classification: BulkOperationClassification;
  readonly status: BulkOperationStatus;
  readonly tenantId: string;
  readonly actorId: string | null;
  readonly serviceActorId: string | null;
  readonly sourceType: BulkSourceDestinationType;
  readonly destinationType: BulkSourceDestinationType;
  readonly sourceFileId: string | null;
  readonly destinationFileId: string | null;
  readonly format: BulkFileFormat;
  readonly jobId: string | null;
  readonly idempotencyKeyHash: string;
  readonly guardrailPolicyId: string | null;
  readonly dryRunRequired: boolean;
  readonly dryRunHash: string | null;
  readonly previewHash: string | null;
  readonly approvedPreviewHash: string | null;
  readonly validationSummary: BulkValidationSummary;
  readonly itemCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly safeFailureMessage: string | null;
  readonly evidencePackageId: string | null;
  readonly manifestHash: string | null;
  readonly contentHash: string | null;
  readonly retentionPolicy: string;
  readonly legalHold: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BulkFormatSafetyInput {
  readonly format: string;
  readonly rows?: readonly (readonly string[])[];
  readonly archiveEntries?: readonly string[];
  readonly sizeBytes?: number;
  readonly maxSizeBytes?: number;
  readonly encoding?: string;
}

export function assertBulkOperationType(value: string): BulkOperationType {
  if (!BULK_OPERATION_TYPES.includes(value as BulkOperationType)) {
    throw new BulkOperationPolicyError("unknown-operation-type", "bulk operation type denied");
  }
  return value as BulkOperationType;
}

export function assertBulkOperationClassification(value: string): BulkOperationClassification {
  if (!BULK_OPERATION_CLASSIFICATIONS.includes(value as BulkOperationClassification)) {
    throw new BulkOperationPolicyError(
      "unknown-operation-classification",
      "bulk operation classification denied",
    );
  }
  return value as BulkOperationClassification;
}

export function assertBulkOperationStatus(value: string): BulkOperationStatus {
  if (!BULK_OPERATION_STATUSES.includes(value as BulkOperationStatus)) {
    throw new BulkOperationPolicyError("unknown-operation-status", "bulk operation status denied");
  }
  return value as BulkOperationStatus;
}

export function assertBulkSourceDestinationType(value: string): BulkSourceDestinationType {
  if (!BULK_SOURCE_DESTINATION_TYPES.includes(value as BulkSourceDestinationType)) {
    throw new BulkOperationPolicyError("unknown-source-destination-type", "bulk endpoint denied");
  }
  return value as BulkSourceDestinationType;
}

export function assertBulkFileFormat(value: string): BulkFileFormat {
  if (!BULK_FILE_FORMATS.includes(value as BulkFileFormat)) {
    throw new BulkOperationPolicyError("unsupported-format", "bulk file format denied");
  }
  return value as BulkFileFormat;
}

export function bulkTextLooksSensitive(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    telemetryValueLooksSensitive(value) ||
    [
      ...OBSERVABILITY_FORBIDDEN_PATTERNS,
      "object_key",
      "object key",
      "raw_row",
      "raw payload",
      "provider_response",
      "connection_string",
      "private_key",
    ].some((token) => lowered.includes(token))
  );
}

export function safeBulkMessage(value: string): string {
  const safe = safeTelemetryValue(value);
  return bulkTextLooksSensitive(value) || bulkTextLooksSensitive(safe)
    ? "bulk operation evidence"
    : safe;
}

export function createBulkValidationError(input: {
  readonly rowNumber?: number | null;
  readonly recordRef?: string | null;
  readonly fieldPath: string;
  readonly safeErrorCode: string;
  readonly safeErrorMessage: string;
}): BulkValidationError {
  return Object.freeze({
    rowNumber: input.rowNumber ?? null,
    recordRef: input.recordRef ? `rec_${opaqueHash(input.recordRef).slice(0, 24)}` : null,
    fieldPath: safeBulkMessage(assertNonEmpty(input.fieldPath, "bulk.validation.fieldPath")),
    safeErrorCode: safeBulkMessage(assertNonEmpty(input.safeErrorCode, "bulk.validation.code")),
    safeErrorMessage: safeBulkMessage(
      assertNonEmpty(input.safeErrorMessage, "bulk.validation.message"),
    ),
  });
}

export function createBulkValidationSummary(input: {
  readonly itemCount: number;
  readonly errors?: readonly BulkValidationError[];
}): BulkValidationSummary {
  const errors = Object.freeze([...(input.errors ?? [])]);
  return Object.freeze({
    valid: errors.length === 0,
    itemCount: Math.max(0, input.itemCount),
    errorCount: errors.length,
    errors,
  });
}

export function assertBulkFileFormatSafety(input: BulkFormatSafetyInput): BulkFileFormat {
  const format = assertBulkFileFormat(input.format);
  const maxSize = input.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;
  if (input.sizeBytes !== undefined && input.sizeBytes > maxSize) {
    throw new BulkOperationPolicyError("oversized-file", "bulk file too large");
  }
  if (input.encoding && !["utf-8", "utf8"].includes(input.encoding.toLowerCase())) {
    throw new BulkOperationPolicyError("encoding-mismatch", "bulk file encoding denied");
  }
  if ((format === "csv" || format === "xlsx") && input.rows) {
    for (const row of input.rows) {
      for (const cell of row) {
        if (/^\s*[=+\-@]/u.test(cell)) {
          throw new BulkOperationPolicyError(
            "formula-injection-blocked",
            "bulk spreadsheet formula denied",
          );
        }
      }
    }
  }
  if (format === "zip" && input.archiveEntries) {
    for (const entry of input.archiveEntries) {
      const normalized = entry.replaceAll("\\", "/");
      if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
        throw new BulkOperationPolicyError("archive-traversal-blocked", "archive entry denied");
      }
    }
  }
  return format;
}

export function createBulkEndpointRef(input: {
  readonly refType: string;
  readonly ref: string;
  readonly fileId?: string | null;
  readonly format: string;
  readonly classification: string;
  readonly schemaId?: string | null;
  readonly schemaVersion?: string | null;
  readonly schemaHash?: string | null;
  readonly mappingId?: string | null;
  readonly mappingVersion?: string | null;
  readonly mappingHash?: string | null;
  readonly checksum?: string | null;
  readonly scanStatus?: FileScanStatusValue | null;
  readonly dataResidencyPolicy?: string | null;
}): BulkEndpointRef {
  const ref = assertNonEmpty(input.ref, "bulk.endpoint.ref");
  if (bulkTextLooksSensitive(ref)) {
    throw new BulkOperationPolicyError("endpoint-ref-sensitive", "bulk endpoint denied");
  }
  const refType = assertBulkSourceDestinationType(input.refType);
  const fileId = input.fileId ?? null;
  if (
    ["uploaded-file", "generated-file", "tenant-file", "evidence-package"].includes(refType) &&
    !fileId
  ) {
    throw new BulkOperationPolicyError("file-id-required", "bulk file reference required");
  }
  return Object.freeze({
    refType,
    ref: safeBulkMessage(ref),
    fileId,
    format: assertBulkFileFormat(input.format),
    classification: assertBulkOperationClassification(input.classification),
    schemaId: input.schemaId ?? null,
    schemaVersion: input.schemaVersion ?? null,
    schemaHash: input.schemaHash ?? null,
    mappingId: input.mappingId ?? null,
    mappingVersion: input.mappingVersion ?? null,
    mappingHash: input.mappingHash ?? null,
    checksum: input.checksum ?? null,
    scanStatus: input.scanStatus ?? null,
    dataResidencyPolicy: input.dataResidencyPolicy
      ? safeBulkMessage(input.dataResidencyPolicy)
      : null,
  });
}

export function createEvidencePackageManifest(input: {
  readonly evidencePackageId: string;
  readonly packageVersion: string;
  readonly sourceQueryRef: string;
  readonly includedFileIds: readonly string[];
  readonly includedAuditEventIds: readonly string[];
  readonly createdBy: string;
  readonly createdAt?: string;
  readonly legalHold?: boolean;
  readonly retentionPolicy: string;
  readonly chainOfCustodyRef: string;
}): EvidencePackageManifest {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const includedFileIds = Object.freeze([...input.includedFileIds].sort());
  const includedAuditEventIds = Object.freeze([...input.includedAuditEventIds].sort());
  const sourceQueryHash = sha256Hex(input.sourceQueryRef);
  const contentHash = sha256Hex(JSON.stringify({ includedAuditEventIds, includedFileIds }));
  const manifestHash = sha256Hex(
    JSON.stringify({
      evidencePackageId: input.evidencePackageId,
      packageVersion: input.packageVersion,
      sourceQueryHash,
      contentHash,
      includedFileIds,
      includedAuditEventIds,
    }),
  );
  return Object.freeze({
    evidencePackageId: assertNonEmpty(input.evidencePackageId, "evidencePackageId"),
    packageType: "evidence-package",
    packageVersion: assertNonEmpty(input.packageVersion, "packageVersion"),
    manifestHash,
    contentHash,
    sourceQueryHash,
    includedFileIds,
    includedAuditEventIds,
    createdBy: assertNonEmpty(input.createdBy, "evidence.createdBy"),
    createdAt,
    legalHold: input.legalHold ?? false,
    retentionPolicy: safeBulkMessage(assertNonEmpty(input.retentionPolicy, "retentionPolicy")),
    chainOfCustodyRef: `custody_${opaqueHash(input.chainOfCustodyRef).slice(0, 24)}`,
  });
}

export function bulkOperationIdempotencyKey(input: {
  readonly tenantId: string;
  readonly operationType: string;
  readonly sourceRef: string;
  readonly classification: string;
}): string {
  return stableId("bulk-idem", [
    input.tenantId,
    input.operationType,
    opaqueHash(input.sourceRef).slice(0, 24),
    input.classification,
  ]);
}

export function createBulkPreviewHash(input: {
  readonly operationId: string;
  readonly operationType: string;
  readonly classification: string;
  readonly itemCount: number;
  readonly validationSummary: BulkValidationSummary;
  readonly exportScope?: string | null;
}): string {
  return sha256Hex(
    JSON.stringify({
      operationId: input.operationId,
      operationType: input.operationType,
      classification: input.classification,
      itemCount: input.itemCount,
      errorCount: input.validationSummary.errorCount,
      exportScope: input.exportScope ?? null,
    }),
  );
}

export function createBulkDryRunHash(input: {
  readonly operationId: string;
  readonly previewHash: string;
  readonly estimatedImpact: string;
}): string {
  return sha256Hex(
    JSON.stringify({
      operationId: input.operationId,
      previewHash: input.previewHash,
      estimatedImpact: safeBulkMessage(input.estimatedImpact),
    }),
  );
}

export function createBulkOperationRecord(input: {
  readonly operationId: string;
  readonly operationType: string;
  readonly classification: string;
  readonly tenantId: string;
  readonly actorId?: string | null;
  readonly serviceActorId?: string | null;
  readonly source: BulkEndpointRef;
  readonly destination: BulkEndpointRef;
  readonly fileId?: string | null;
  readonly jobId?: string | null;
  readonly workflowId?: string | null;
  readonly idempotencyKey?: string;
  readonly guardrailPolicyId?: string | null;
  readonly dryRunRequired?: boolean;
  readonly dryRunHash?: string | null;
  readonly previewHash?: string | null;
  readonly approvedPreviewHash?: string | null;
  readonly noDryRunRationale?: string | null;
  readonly partialSuccessAllowed?: boolean;
  readonly maxErrorCount?: number;
  readonly maxErrorRate?: number;
  readonly rollbackSupported?: boolean;
  readonly rollbackJobId?: string | null;
  readonly compensationSupported?: boolean;
  readonly compensationPlanRef?: string | null;
  readonly irreversibleOperation?: boolean;
  readonly irreversibleReason?: string | null;
  readonly exportScope?: string | null;
  readonly approvedScopeHash?: string | null;
  readonly validationSummary?: BulkValidationSummary;
  readonly itemCount?: number;
  readonly successCount?: number;
  readonly failureCount?: number;
  readonly safeFailureMessage?: string | null;
  readonly evidencePackage?: EvidencePackageManifest | null;
  readonly retentionPolicy?: string;
  readonly legalHold?: boolean;
  readonly retainUntil?: string | null;
  readonly purgeAllowedAt?: string | null;
  readonly status?: string;
  readonly correlationId?: string;
  readonly causationId?: string | null;
  readonly requestId?: string;
  readonly traceId?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}): BulkOperationRecord {
  const operationType = assertBulkOperationType(input.operationType);
  const classification = assertBulkOperationClassification(input.classification);
  const status = assertBulkOperationStatus(input.status ?? "draft");
  const tenantId = assertNonEmpty(input.tenantId, "bulk.tenantId");
  const actorId = input.actorId ?? null;
  const serviceActorId = input.serviceActorId ?? null;
  if (!actorId && !serviceActorId) {
    throw new BulkOperationPolicyError("actor-or-service-actor-required", "bulk actor denied");
  }
  if (!input.idempotencyKey) {
    throw new BulkOperationPolicyError("idempotency-required", "bulk idempotency required");
  }
  const idempotencyKey = input.idempotencyKey;
  const isHighRisk = BULK_HIGH_RISK_CLASSIFICATIONS.includes(classification);
  const dryRunRequired = input.dryRunRequired ?? isHighRisk;
  const noDryRunRationale = input.noDryRunRationale ?? null;
  if (isHighRisk && !dryRunRequired && !noDryRunRationale) {
    throw new BulkOperationPolicyError("dry-run-preview-required", "bulk dry-run required");
  }
  const rollbackSupported = input.rollbackSupported ?? false;
  const compensationSupported = input.compensationSupported ?? false;
  const irreversibleOperation = input.irreversibleOperation ?? false;
  const irreversibleReason = input.irreversibleReason ?? null;
  if (
    classification === "destructive" &&
    !rollbackSupported &&
    !compensationSupported &&
    !(irreversibleOperation && irreversibleReason)
  ) {
    throw new BulkOperationPolicyError(
      "destructive-rollback-posture-required",
      "bulk rollback posture required",
    );
  }
  if (operationType === "evidence-package-export" && !input.evidencePackage) {
    throw new BulkOperationPolicyError(
      "evidence-package-required",
      "bulk evidence package required",
    );
  }
  const validationSummary =
    input.validationSummary ?? createBulkValidationSummary({ itemCount: input.itemCount ?? 0 });
  const itemCount = input.itemCount ?? validationSummary.itemCount;
  const createdAt = input.createdAt ?? new Date().toISOString();
  const updatedAt = input.updatedAt ?? createdAt;
  const sourceFingerprint = sha256Hex(
    JSON.stringify({
      source: input.source.ref,
      checksum: input.source.checksum,
      schemaHash: input.source.schemaHash,
      mappingHash: input.source.mappingHash,
    }),
  );
  const operationFingerprint = sha256Hex(
    JSON.stringify({
      operationType,
      classification,
      sourceFingerprint,
      destination: input.destination.ref,
      itemCount,
      validationErrorCount: validationSummary.errorCount,
    }),
  );
  return Object.freeze({
    operationId: assertNonEmpty(input.operationId, "operationId"),
    operationType,
    classification,
    status,
    tenantId,
    actorId,
    serviceActorId,
    source: input.source,
    destination: input.destination,
    fileId: input.fileId ?? input.source.fileId ?? input.destination.fileId ?? null,
    jobId: input.jobId ?? null,
    workflowId: input.workflowId ?? null,
    idempotencyKey: assertNonEmpty(idempotencyKey, "bulk.idempotencyKey"),
    dedupeKey: `dedupe_${opaqueHash(idempotencyKey).slice(0, 24)}`,
    sourceFingerprint,
    operationFingerprint,
    guardrailPolicyId: input.guardrailPolicyId ?? null,
    dryRunRequired,
    dryRunHash: input.dryRunHash ?? null,
    previewHash: input.previewHash ?? null,
    approvedPreviewHash: input.approvedPreviewHash ?? null,
    noDryRunRationale: noDryRunRationale ? safeBulkMessage(noDryRunRationale) : null,
    partialSuccessAllowed: input.partialSuccessAllowed ?? false,
    maxErrorCount: Math.max(0, input.maxErrorCount ?? 0),
    maxErrorRate: Math.max(0, input.maxErrorRate ?? 0),
    rollbackSupported,
    rollbackJobId: input.rollbackJobId ?? null,
    compensationSupported,
    compensationPlanRef: input.compensationPlanRef ?? null,
    irreversibleOperation,
    irreversibleReason: irreversibleReason ? safeBulkMessage(irreversibleReason) : null,
    exportScope: input.exportScope ? safeBulkMessage(input.exportScope) : null,
    approvedScopeHash: input.approvedScopeHash ?? null,
    validationSummary,
    itemCount,
    successCount: Math.max(0, input.successCount ?? 0),
    failureCount: Math.max(0, input.failureCount ?? validationSummary.errorCount),
    safeFailureMessage: input.safeFailureMessage
      ? safeFailureMessage(input.safeFailureMessage)
      : null,
    evidencePackage: input.evidencePackage ?? null,
    retentionPolicy: safeBulkMessage(
      input.retentionPolicy ?? "classification-aware-local-dev-test",
    ),
    legalHold: input.legalHold ?? input.evidencePackage?.legalHold ?? false,
    retainUntil: input.retainUntil ?? null,
    purgeAllowedAt: input.purgeAllowedAt ?? null,
    correlationId: input.correlationId ?? stableId("corr", [tenantId, input.operationId]),
    causationId: input.causationId ?? null,
    requestId: input.requestId ?? stableId("req", [tenantId, input.operationId]),
    traceId: input.traceId ?? null,
    createdAt,
    updatedAt,
  });
}

export function createBulkItemOutcome(input: {
  readonly itemId: string;
  readonly rowNumber?: number | null;
  readonly sourceRecordRef?: string | null;
  readonly targetRecordRef?: string | null;
  readonly operation: string;
  readonly outcome: BulkItemOutcomeStatus;
  readonly safeErrorCode?: string | null;
  readonly safeErrorMessage?: string | null;
  readonly beforeRef?: string | null;
  readonly afterRef?: string | null;
  readonly correlationId?: string | null;
}): BulkItemOutcome {
  if (!BULK_ITEM_OUTCOMES.includes(input.outcome)) {
    throw new BulkOperationPolicyError("unknown-item-outcome", "bulk item outcome denied");
  }
  return Object.freeze({
    itemId: assertNonEmpty(input.itemId, "bulk.itemId"),
    rowNumber: input.rowNumber ?? null,
    sourceRecordHash: input.sourceRecordRef
      ? `src_${opaqueHash(input.sourceRecordRef).slice(0, 24)}`
      : null,
    targetRecordRef: input.targetRecordRef
      ? `target_${opaqueHash(input.targetRecordRef).slice(0, 24)}`
      : null,
    operation: assertBulkOperationType(input.operation),
    outcome: input.outcome,
    safeErrorCode: input.safeErrorCode ? safeBulkMessage(input.safeErrorCode) : null,
    safeErrorMessage: input.safeErrorMessage ? safeBulkMessage(input.safeErrorMessage) : null,
    beforeHash: input.beforeRef ? sha256Hex(input.beforeRef) : null,
    afterHash: input.afterRef ? sha256Hex(input.afterRef) : null,
    correlationId: input.correlationId ?? null,
  });
}

export function toSafeBulkOperationView(operation: BulkOperationRecord): SafeBulkOperationView {
  return Object.freeze({
    operationId: operation.operationId,
    operationType: operation.operationType,
    classification: operation.classification,
    status: operation.status,
    tenantId: operation.tenantId,
    actorId: operation.actorId,
    serviceActorId: operation.serviceActorId,
    sourceType: operation.source.refType,
    destinationType: operation.destination.refType,
    sourceFileId: operation.source.fileId,
    destinationFileId: operation.destination.fileId,
    format: operation.source.format,
    jobId: operation.jobId,
    idempotencyKeyHash: `idem_${opaqueHash(operation.idempotencyKey).slice(0, 24)}`,
    guardrailPolicyId: operation.guardrailPolicyId,
    dryRunRequired: operation.dryRunRequired,
    dryRunHash: operation.dryRunHash,
    previewHash: operation.previewHash,
    approvedPreviewHash: operation.approvedPreviewHash,
    validationSummary: operation.validationSummary,
    itemCount: operation.itemCount,
    successCount: operation.successCount,
    failureCount: operation.failureCount,
    safeFailureMessage: operation.safeFailureMessage,
    evidencePackageId: operation.evidencePackage?.evidencePackageId ?? null,
    manifestHash: operation.evidencePackage?.manifestHash ?? null,
    contentHash: operation.evidencePackage?.contentHash ?? null,
    retentionPolicy: operation.retentionPolicy,
    legalHold: operation.legalHold,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
  });
}

// ---------------------------------------------------------------------------
// Tenant-safe search / indexing / discovery model (parity-search-indexing,
// USF-164).
//
// Search is a controlled discovery surface, not the source of authority. Index
// documents are classified, tenant-scoped safe projections; query results must be
// source-revalidated or safe-by-construction. This model is local/dev/test proof
// only and makes no live search provider, vector database, AI/RAG, public search
// API, or production readiness claim.
// ---------------------------------------------------------------------------

export const SEARCHABLE_RESOURCE_CLASSIFICATIONS = Object.freeze([
  "public",
  "tenant-data",
  "confidential",
  "restricted",
  "security-sensitive",
  "audit-sensitive",
  "regulated",
  "file-derived",
  "identity-derived",
  "configuration-derived",
  "notification-derived",
  "job-derived",
  "provider-derived",
  "system-internal",
  "test-only",
] as const);
export type SearchableResourceClassification = (typeof SEARCHABLE_RESOURCE_CLASSIFICATIONS)[number];

export const SEARCH_INDEX_LIFECYCLE_STATES = Object.freeze([
  "draft",
  "building",
  "active",
  "stale",
  "degraded",
  "disabled",
  "rebuilding",
  "failed",
  "retired",
  "purged",
] as const);
export type SearchIndexLifecycleState = (typeof SEARCH_INDEX_LIFECYCLE_STATES)[number];

export const SEARCH_RESOURCE_TYPES = Object.freeze([
  "tenant-record",
  "file",
  "audit-event",
  "notification",
  "job",
  "provider",
  "configuration",
  "identity",
  "bulk-operation",
  "test-resource",
] as const);
export type SearchResourceType = (typeof SEARCH_RESOURCE_TYPES)[number];

export const SEARCH_SOURCE_REVALIDATION_POLICIES = Object.freeze([
  "safe-projection-only",
  "source-revalidated",
  "hybrid",
] as const);
export type SearchSourceRevalidationPolicy = (typeof SEARCH_SOURCE_REVALIDATION_POLICIES)[number];

export const SEARCH_FIELD_CLASSIFICATIONS = Object.freeze([
  "public",
  "internal",
  "confidential",
  "restricted",
  "security-sensitive",
] as const);
export type SearchFieldClassification = (typeof SEARCH_FIELD_CLASSIFICATIONS)[number];

export const SEARCH_FORBIDDEN_PATTERNS = Object.freeze([
  ...OBSERVABILITY_FORBIDDEN_PATTERNS,
  "raw_query",
  "raw_result",
  "raw_index",
  "raw_snippet",
  "provider_payload",
  "embedding",
  "vector",
  "rag_context",
] as const);

export const SEARCH_DEFAULT_MAX_QUERY_LENGTH = 200;
export const SEARCH_DEFAULT_MAX_TERMS = 12;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 50;

export class SearchPolicyError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "SearchPolicyError";
    this.reasonCode = reasonCode;
  }
}

export interface SearchIndexDocument {
  readonly indexDocumentId: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly tenantId: string | null;
  readonly classification: SearchableResourceClassification;
  readonly sourceRef: string;
  readonly sourceVersion: string;
  readonly sourceHash: string;
  readonly schemaVersion: string;
  readonly indexVersion: string;
  readonly indexedFields: readonly string[];
  readonly redactedFields: readonly string[];
  readonly searchableFields: readonly string[];
  readonly sortableFields: readonly string[];
  readonly filterableFields: readonly string[];
  readonly facetableFields: readonly string[];
  readonly fieldValues: Readonly<Record<string, string>>;
  readonly fieldClassifications: Readonly<Record<string, SearchFieldClassification>>;
  readonly title: string;
  readonly snippet: string | null;
  readonly requiredAction: string | null;
  readonly sourceRevalidationPolicy: SearchSourceRevalidationPolicy;
  readonly lifecycleState: SearchIndexLifecycleState;
  readonly sourceFileId: string | null;
  readonly fileStatus: FileStatusValue | null;
  readonly fileScanStatus: FileScanStatusValue | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly indexedAt: string;
  readonly expiresAt: string | null;
  readonly staleAt: string | null;
  readonly deletedAt: string | null;
  readonly purgedAt: string | null;
  readonly legalHold: boolean;
  readonly retentionPolicy: string;
}

export interface SafeSearchResult {
  readonly indexDocumentId: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly tenantId: string | null;
  readonly classification: SearchableResourceClassification;
  readonly title: string;
  readonly snippet: string | null;
  readonly score: number;
  readonly fields: Readonly<Record<string, string>>;
  readonly sourceVersion: string;
  readonly indexVersion: string;
  readonly lifecycleState: SearchIndexLifecycleState;
  readonly stale: boolean;
}

export interface SearchFacetBucket {
  readonly field: string;
  readonly valueHash: string;
  readonly count: number;
}

export interface SearchQueryPolicy {
  readonly filterAllowList: readonly string[];
  readonly sortAllowList: readonly string[];
  readonly facetAllowList: readonly string[];
  readonly searchableFieldAllowList: readonly string[];
  readonly defaultLimit: number;
  readonly maxLimit: number;
  readonly maxQueryLength: number;
  readonly maxTerms: number;
  readonly countsEnabled: boolean;
  readonly facetsEnabled: boolean;
  readonly autocompleteEnabled: boolean;
  readonly autocompleteMinLength: number;
  readonly cursorTtlSeconds: number;
  readonly rawQueryAuditAllowed: false;
}

export interface SearchQueryRequest {
  readonly tenantId: string;
  readonly queryText: string;
  readonly filters?: Readonly<Record<string, string>>;
  readonly sort?: { readonly field: string; readonly direction: "asc" | "desc" } | null;
  readonly facets?: readonly string[];
  readonly limit?: number;
  readonly cursor?: string | null;
  readonly now?: string;
}

export interface SearchQueryPlan {
  readonly tenantId: string;
  readonly queryText: string;
  readonly queryHash: string;
  readonly filters: Readonly<Record<string, string>>;
  readonly sort: { readonly field: string; readonly direction: "asc" | "desc" } | null;
  readonly facets: readonly string[];
  readonly limit: number;
  readonly offset: number;
  readonly cursorScopeHash: string;
  readonly nowMs: number;
}

export interface SearchQueryPage {
  readonly results: readonly SafeSearchResult[];
  readonly facets: readonly SearchFacetBucket[];
  readonly total: number | null;
  readonly nextCursor: string | null;
  readonly queryHash: string;
}

export function assertSearchableResourceClassification(
  value: string,
): SearchableResourceClassification {
  if (!SEARCHABLE_RESOURCE_CLASSIFICATIONS.includes(value as SearchableResourceClassification)) {
    throw new SearchPolicyError("unknown-search-classification", "search classification denied");
  }
  return value as SearchableResourceClassification;
}

export function assertSearchLifecycleState(value: string): SearchIndexLifecycleState {
  if (!SEARCH_INDEX_LIFECYCLE_STATES.includes(value as SearchIndexLifecycleState)) {
    throw new SearchPolicyError("unknown-index-lifecycle", "search lifecycle denied");
  }
  return value as SearchIndexLifecycleState;
}

export function assertSearchResourceType(value: string): SearchResourceType {
  const safeType = assertSafeSearchText(value, "search.resourceType");
  if (!SEARCH_RESOURCE_TYPES.includes(safeType as SearchResourceType)) {
    throw new SearchPolicyError("unknown-resource-type", "search resource type denied");
  }
  return safeType as SearchResourceType;
}

export function assertSearchSourceRevalidationPolicy(
  value: string,
): SearchSourceRevalidationPolicy {
  if (!SEARCH_SOURCE_REVALIDATION_POLICIES.includes(value as SearchSourceRevalidationPolicy)) {
    throw new SearchPolicyError("unknown-source-revalidation-policy", "search policy denied");
  }
  return value as SearchSourceRevalidationPolicy;
}

export function searchTextLooksSensitive(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    telemetryValueLooksSensitive(value) ||
    SEARCH_FORBIDDEN_PATTERNS.some((pattern) => lowered.includes(pattern))
  );
}

export function safeSearchValue(value: string): string {
  const safe = safeTelemetryValue(value);
  return searchTextLooksSensitive(safe) ? CONFIG_REDACTED : safe;
}

function assertSafeSearchKey(key: string): string {
  const safeKey = assertNonEmpty(key, "search.field");
  if (searchTextLooksSensitive(safeKey)) {
    throw new SearchPolicyError("search-field-sensitive", "search field denied");
  }
  return safeKey;
}

function assertSafeSearchText(value: string, field: string): string {
  const safe = assertNonEmpty(value, field);
  if (searchTextLooksSensitive(safe)) {
    throw new SearchPolicyError("search-value-sensitive", "search value denied");
  }
  return safe;
}

function safeSearchFieldValue(value: string): string {
  if (searchTextLooksSensitive(value)) {
    throw new SearchPolicyError("search-value-sensitive", "search value denied");
  }
  return value.length > 512 ? `${value.slice(0, 512)}...[truncated]` : value;
}

function isIndexableFileSource(input: {
  readonly fileStatus: FileStatusValue | null;
  readonly fileScanStatus: FileScanStatusValue | null;
}): boolean {
  const fileStatus = input.fileStatus;
  const scan = input.fileScanStatus;
  if (
    fileStatus &&
    ["blocked", "deleted", "purged", "quarantined", "failed"].includes(fileStatus)
  ) {
    return false;
  }
  if (scan && !["clean", "not-required"].includes(scan)) {
    return false;
  }
  return true;
}

export function createSearchIndexDocument(input: {
  readonly indexDocumentId: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly tenantId?: string | null;
  readonly classification: string;
  readonly sourceRef: string;
  readonly sourceVersion: string;
  readonly schemaVersion?: string;
  readonly indexVersion?: string;
  readonly fieldValues: Readonly<Record<string, string>>;
  readonly fieldClassifications?: Readonly<Record<string, SearchFieldClassification>>;
  readonly title: string;
  readonly snippet?: string | null;
  readonly requiredAction?: string | null;
  readonly sourceRevalidationPolicy?: string;
  readonly lifecycleState?: string;
  readonly sourceFileId?: string | null;
  readonly fileStatus?: FileStatusValue | null;
  readonly fileScanStatus?: FileScanStatusValue | null;
  readonly now?: string;
  readonly expiresAt?: string | null;
  readonly staleAt?: string | null;
  readonly deletedAt?: string | null;
  readonly purgedAt?: string | null;
  readonly legalHold?: boolean;
  readonly retentionPolicy?: string;
  readonly redactedFields?: readonly string[];
  readonly sortableFields?: readonly string[];
  readonly filterableFields?: readonly string[];
  readonly facetableFields?: readonly string[];
  readonly searchableFields?: readonly string[];
}): SearchIndexDocument {
  const classification = assertSearchableResourceClassification(input.classification);
  const tenantId = input.tenantId ?? null;
  if (!tenantId && !["public", "system-internal"].includes(classification)) {
    throw new SearchPolicyError("tenant-required", "search tenant context required");
  }
  const resourceType = assertSearchResourceType(input.resourceType);
  const resourceId = assertSafeSearchText(input.resourceId, "search.resourceId");
  const indexDocumentId = assertSafeSearchText(input.indexDocumentId, "search.indexDocumentId");
  const safeSourceRef = assertSafeSearchText(input.sourceRef, "search.sourceRef");
  const sourceFileId = input.sourceFileId ?? null;
  const fileStatus = input.fileStatus ?? null;
  const fileScanStatus = input.fileScanStatus ?? null;
  if (
    (classification === "file-derived" || sourceFileId) &&
    !isIndexableFileSource({ fileStatus, fileScanStatus })
  ) {
    throw new SearchPolicyError("file-source-not-indexable", "search source denied");
  }
  const now = input.now ?? new Date().toISOString();
  const fieldValues: Record<string, string> = {};
  const fieldClassifications: Record<string, SearchFieldClassification> = {};
  const redacted = new Set((input.redactedFields ?? []).map(assertSafeSearchKey));
  for (const [key, value] of Object.entries(input.fieldValues)) {
    const safeKey = assertSafeSearchKey(key);
    const classificationForField =
      input.fieldClassifications?.[safeKey] ?? (redacted.has(safeKey) ? "restricted" : "internal");
    if (!SEARCH_FIELD_CLASSIFICATIONS.includes(classificationForField)) {
      throw new SearchPolicyError("unknown-field-classification", "search field denied");
    }
    fieldClassifications[safeKey] = classificationForField;
    fieldValues[safeKey] = safeSearchFieldValue(String(value));
  }
  const indexedFields = Object.keys(fieldValues).sort();
  const searchableFields = (input.searchableFields ?? indexedFields).map(assertSafeSearchKey);
  const sortableFields = (input.sortableFields ?? []).map(assertSafeSearchKey);
  const filterableFields = (input.filterableFields ?? []).map(assertSafeSearchKey);
  const facetableFields = (input.facetableFields ?? []).map(assertSafeSearchKey);
  return Object.freeze({
    indexDocumentId,
    resourceType,
    resourceId,
    tenantId,
    classification,
    sourceRef: safeSourceRef,
    sourceVersion: safeSearchValue(assertNonEmpty(input.sourceVersion, "search.sourceVersion")),
    sourceHash: sha256Hex(`${safeSourceRef}:${input.sourceVersion}:${JSON.stringify(fieldValues)}`),
    schemaVersion: safeSearchValue(input.schemaVersion ?? "search-schema-1"),
    indexVersion: safeSearchValue(input.indexVersion ?? "search-index-1"),
    indexedFields: Object.freeze(indexedFields),
    redactedFields: Object.freeze([...redacted].sort()),
    searchableFields: Object.freeze(searchableFields),
    sortableFields: Object.freeze(sortableFields),
    filterableFields: Object.freeze(filterableFields),
    facetableFields: Object.freeze(facetableFields),
    fieldValues: Object.freeze(fieldValues),
    fieldClassifications: Object.freeze(fieldClassifications),
    title: safeSearchFieldValue(input.title),
    snippet: input.snippet ? safeSearchFieldValue(input.snippet) : null,
    requiredAction: input.requiredAction ? safeSearchValue(input.requiredAction) : null,
    sourceRevalidationPolicy: assertSearchSourceRevalidationPolicy(
      input.sourceRevalidationPolicy ?? "safe-projection-only",
    ),
    lifecycleState: assertSearchLifecycleState(input.lifecycleState ?? "active"),
    sourceFileId: sourceFileId ? safeSearchValue(sourceFileId) : null,
    fileStatus,
    fileScanStatus,
    createdAt: now,
    updatedAt: now,
    indexedAt: now,
    expiresAt: input.expiresAt ?? null,
    staleAt: input.staleAt ?? null,
    deletedAt: input.deletedAt ?? null,
    purgedAt: input.purgedAt ?? null,
    legalHold: input.legalHold ?? false,
    retentionPolicy: safeSearchValue(
      input.retentionPolicy ?? "classification-aware-local-dev-test",
    ),
  });
}

export function searchDocumentIsStale(document: SearchIndexDocument, now = new Date()): boolean {
  if (document.lifecycleState === "stale" || document.lifecycleState === "degraded") return true;
  if (document.staleAt && Date.parse(document.staleAt) <= now.getTime()) return true;
  if (document.expiresAt && Date.parse(document.expiresAt) <= now.getTime()) return true;
  return false;
}

export function searchDocumentIsDeletedOrPurged(document: SearchIndexDocument): boolean {
  return (
    document.lifecycleState === "purged" ||
    document.deletedAt !== null ||
    document.purgedAt !== null ||
    document.fileStatus === "deleted" ||
    document.fileStatus === "purged"
  );
}

export function toSafeSearchResult(
  document: SearchIndexDocument,
  score: number,
  now = new Date(),
): SafeSearchResult {
  const fields: Record<string, string> = {};
  const redacted = new Set(document.redactedFields);
  for (const [key, value] of Object.entries(document.fieldValues)) {
    const fieldClassification = document.fieldClassifications[key] ?? "internal";
    if (
      redacted.has(key) ||
      fieldClassification === "restricted" ||
      fieldClassification === "security-sensitive"
    ) {
      continue;
    }
    fields[key] = safeSearchValue(value);
  }
  return Object.freeze({
    indexDocumentId: document.indexDocumentId,
    resourceType: document.resourceType,
    resourceId: document.resourceId,
    tenantId: document.tenantId,
    classification: document.classification,
    title: safeSearchValue(document.title),
    snippet:
      document.classification === "restricted" || document.classification === "security-sensitive"
        ? null
        : document.snippet === null
          ? null
          : safeSearchValue(document.snippet),
    score,
    fields: Object.freeze(fields),
    sourceVersion: document.sourceVersion,
    indexVersion: document.indexVersion,
    lifecycleState: document.lifecycleState,
    stale: searchDocumentIsStale(document, now),
  });
}

export function createSearchQueryPolicy(input: Partial<SearchQueryPolicy> = {}): SearchQueryPolicy {
  return Object.freeze({
    filterAllowList: Object.freeze([...(input.filterAllowList ?? [])]),
    sortAllowList: Object.freeze([...(input.sortAllowList ?? [])]),
    facetAllowList: Object.freeze([...(input.facetAllowList ?? [])]),
    searchableFieldAllowList: Object.freeze([...(input.searchableFieldAllowList ?? [])]),
    defaultLimit: Math.min(
      Math.max(input.defaultLimit ?? SEARCH_DEFAULT_LIMIT, 1),
      SEARCH_MAX_LIMIT,
    ),
    maxLimit: Math.min(Math.max(input.maxLimit ?? SEARCH_MAX_LIMIT, 1), SEARCH_MAX_LIMIT),
    maxQueryLength: Math.max(input.maxQueryLength ?? SEARCH_DEFAULT_MAX_QUERY_LENGTH, 1),
    maxTerms: Math.max(input.maxTerms ?? SEARCH_DEFAULT_MAX_TERMS, 1),
    countsEnabled: input.countsEnabled ?? true,
    facetsEnabled: input.facetsEnabled ?? false,
    autocompleteEnabled: input.autocompleteEnabled ?? false,
    autocompleteMinLength: Math.max(input.autocompleteMinLength ?? 3, 1),
    cursorTtlSeconds: Math.max(input.cursorTtlSeconds ?? 900, 60),
    rawQueryAuditAllowed: false,
  });
}

function normaliseSearchQueryText(queryText: string, policy: SearchQueryPolicy): string {
  const q = assertNonEmpty(queryText, "search.queryText");
  if (q.length > policy.maxQueryLength) {
    throw new SearchPolicyError("query-too-long", "search query denied");
  }
  if (q.startsWith("*") || q.includes(".*") || /^\/.*\/[a-z]*$/i.test(q)) {
    throw new SearchPolicyError("query-operator-denied", "search query denied");
  }
  if (searchTextLooksSensitive(q)) {
    throw new SearchPolicyError("query-sensitive", "search query denied");
  }
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length > policy.maxTerms) {
    throw new SearchPolicyError("too-many-query-terms", "search query denied");
  }
  return q;
}

export function createSearchQueryHash(input: {
  readonly tenantId: string;
  readonly queryText: string;
  readonly filters: Readonly<Record<string, string>>;
  readonly sort: { readonly field: string; readonly direction: "asc" | "desc" } | null;
  readonly facets: readonly string[];
}): string {
  return `search_${opaqueHash(
    JSON.stringify({
      tenantId: input.tenantId,
      queryText: input.queryText,
      filters: input.filters,
      sort: input.sort,
      facets: input.facets,
    }),
  ).slice(0, 32)}`;
}

function assertAllowListedSearchField(
  field: string,
  allowed: readonly string[],
  reasonCode: string,
): string {
  const safeField = assertSafeSearchKey(field);
  if (!allowed.includes(safeField)) {
    throw new SearchPolicyError(reasonCode, "search field denied");
  }
  return safeField;
}

function cursorScopeHash(input: {
  readonly tenantId: string;
  readonly queryHash: string;
  readonly limit: number;
}): string {
  return opaqueHash(`search-cursor:${input.tenantId}:${input.queryHash}:${input.limit}`).slice(
    0,
    32,
  );
}

export function createSearchCursor(input: {
  readonly tenantId: string;
  readonly queryHash: string;
  readonly limit: number;
  readonly offset: number;
  readonly issuedAtMs: number;
  readonly ttlSeconds: number;
}): string {
  const scope = cursorScopeHash(input);
  const expiresAtMs = input.issuedAtMs + input.ttlSeconds * 1000;
  const integrity = opaqueHash(`${scope}:${input.offset}:${expiresAtMs}`).slice(0, 32);
  return Buffer.from(
    JSON.stringify({ s: scope, n: input.offset, e: expiresAtMs, i: integrity }),
    "utf8",
  ).toString("base64url");
}

export function decodeSearchCursor(input: {
  readonly cursor: string | null | undefined;
  readonly tenantId: string;
  readonly queryHash: string;
  readonly limit: number;
  readonly nowMs: number;
}): number {
  if (!input.cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8")) as {
      s?: unknown;
      n?: unknown;
      e?: unknown;
      i?: unknown;
    };
    const scope = cursorScopeHash({
      tenantId: input.tenantId,
      queryHash: input.queryHash,
      limit: input.limit,
    });
    if (
      parsed.s !== scope ||
      typeof parsed.n !== "number" ||
      typeof parsed.e !== "number" ||
      typeof parsed.i !== "string" ||
      parsed.e <= input.nowMs ||
      parsed.i !== opaqueHash(`${scope}:${parsed.n}:${parsed.e}`).slice(0, 32)
    ) {
      throw new SearchPolicyError("cursor-invalid", "search cursor denied");
    }
    return Math.max(0, parsed.n);
  } catch (error) {
    if (error instanceof SearchPolicyError) throw error;
    throw new SearchPolicyError("cursor-invalid", "search cursor denied");
  }
}

export function validateSearchQueryRequest(
  input: SearchQueryRequest,
  policy: SearchQueryPolicy = createSearchQueryPolicy(),
): SearchQueryPlan {
  const tenantId = assertNonEmpty(input.tenantId, "search.tenantId");
  const queryText = normaliseSearchQueryText(input.queryText, policy);
  const filters: Record<string, string> = {};
  for (const [field, value] of Object.entries(input.filters ?? {})) {
    const allowed = assertAllowListedSearchField(
      field,
      policy.filterAllowList,
      "filter-not-allowed",
    );
    filters[allowed] = safeSearchFieldValue(value);
  }
  const sort = input.sort
    ? Object.freeze({
        field: assertAllowListedSearchField(
          input.sort.field,
          policy.sortAllowList,
          "sort-not-allowed",
        ),
        direction: input.sort.direction,
      })
    : null;
  const facets = Object.freeze(
    (input.facets ?? []).map((field) =>
      assertAllowListedSearchField(field, policy.facetAllowList, "facet-not-allowed"),
    ),
  );
  if (facets.length > 0 && !policy.facetsEnabled) {
    throw new SearchPolicyError("facet-disabled", "search facet denied");
  }
  const maxLimit = Math.min(policy.maxLimit, SEARCH_MAX_LIMIT);
  const limit = Math.min(Math.max(input.limit ?? policy.defaultLimit, 1), maxLimit);
  const queryHash = createSearchQueryHash({ tenantId, queryText, filters, sort, facets });
  const nowMs = input.now ? Date.parse(input.now) : Date.now();
  const offset = decodeSearchCursor({
    cursor: input.cursor,
    tenantId,
    queryHash,
    limit,
    nowMs,
  });
  return Object.freeze({
    tenantId,
    queryText,
    queryHash,
    filters: Object.freeze(filters),
    sort,
    facets,
    limit,
    offset,
    cursorScopeHash: cursorScopeHash({ tenantId, queryHash, limit }),
    nowMs,
  });
}

// ---------------------------------------------------------------------------
// Resource lifecycle, relationships, and schema-bound mutations (USF-165).
//
// Resources are governed tenant records. This model is local/dev/test parity
// foundation only: it does not claim production legal record-management,
// eDiscovery, regulatory retention, or production-live readiness.
// ---------------------------------------------------------------------------

export const RESOURCE_CLASSIFICATIONS = Object.freeze([
  "public",
  "tenant-data",
  "confidential",
  "restricted",
  "security-sensitive",
  "audit-sensitive",
  "regulated",
  "file-backed",
  "search-indexed",
  "bulk-managed",
  "identity-derived",
  "configuration-derived",
  "provider-derived",
  "system-internal",
  "test-only",
] as const);
export type ResourceClassification = (typeof RESOURCE_CLASSIFICATIONS)[number];

export const RESOURCE_TYPES = Object.freeze([
  "tenant-record",
  "file",
  "bulk-operation",
  "search-document",
  "identity",
  "configuration",
  "provider",
  "audit-event",
  "notification",
  "job",
  "workflow",
  "test-resource",
] as const);
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_LIFECYCLE_STATUSES = Object.freeze([
  "draft",
  "active",
  "suspended",
  "archived",
  "soft-deleted",
  "pending-delete",
  "purge-eligible",
  "purged",
  "locked",
  "held",
  "merged",
  "superseded",
  "rejected",
  "expired",
] as const);
export type ResourceLifecycleStatus = (typeof RESOURCE_LIFECYCLE_STATUSES)[number];

export const RESOURCE_RELATIONSHIP_TYPES = Object.freeze([
  "owns",
  "belongs-to",
  "references",
  "depends-on",
  "contains",
  "derived-from",
  "created-by",
  "assigned-to",
  "linked-to",
  "supersedes",
] as const);
export type ResourceRelationshipType = (typeof RESOURCE_RELATIONSHIP_TYPES)[number];

export const RESOURCE_MUTATION_TYPES = Object.freeze([
  "create",
  "update",
  "patch",
  "transition",
  "archive",
  "restore",
  "soft-delete",
  "purge",
  "lock",
  "unlock",
  "link",
  "unlink",
] as const);
export type ResourceMutationType = (typeof RESOURCE_MUTATION_TYPES)[number];

export const RESOURCE_FIELD_CLASSIFICATIONS = Object.freeze([
  "public",
  "internal",
  "confidential",
  "restricted",
  "security-sensitive",
] as const);
export type ResourceFieldClassification = (typeof RESOURCE_FIELD_CLASSIFICATIONS)[number];

export const RESOURCE_DEFAULT_ALLOWED_TRANSITIONS: Readonly<
  Record<ResourceLifecycleStatus, readonly ResourceLifecycleStatus[]>
> = {
  draft: ["active", "rejected", "expired"],
  active: [
    "suspended",
    "archived",
    "soft-deleted",
    "purge-eligible",
    "locked",
    "held",
    "merged",
    "superseded",
  ],
  suspended: ["active", "archived", "soft-deleted"],
  archived: ["active", "purge-eligible"],
  "soft-deleted": ["active", "purge-eligible"],
  "pending-delete": ["purge-eligible", "active"],
  "purge-eligible": ["purged", "active"],
  purged: [],
  locked: ["active", "archived"],
  held: ["active", "archived"],
  merged: ["archived"],
  superseded: ["archived"],
  rejected: ["draft", "purge-eligible"],
  expired: ["archived", "purge-eligible"],
};

export class ResourcePolicyError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string, message: string) {
    super(message);
    this.name = "ResourcePolicyError";
    this.reasonCode = reasonCode;
  }
}

export interface ResourceFieldDefinition {
  readonly fieldPath: string;
  readonly classification: ResourceFieldClassification;
  readonly required: boolean;
  readonly mutable: boolean;
  readonly visible: boolean;
  readonly allowedOnCreate: boolean;
  readonly allowedOnUpdate: boolean;
  readonly restrictedAction: string | null;
}

export interface ResourceLifecycleTransitionRule {
  readonly from: ResourceLifecycleStatus;
  readonly to: ResourceLifecycleStatus;
  readonly requiredAction: string;
  readonly approvalRequired: boolean;
  readonly requesterCannotApprove: boolean;
}

export interface ResourceSchemaDefinition {
  readonly resourceType: ResourceType;
  readonly schemaVersion: string;
  readonly schemaHash: string;
  readonly owningCapability: string;
  readonly fields: readonly ResourceFieldDefinition[];
  readonly transitions: readonly ResourceLifecycleTransitionRule[];
}

export interface ResourceRecord {
  readonly resourceId: string;
  readonly resourceType: ResourceType;
  readonly classification: ResourceClassification;
  readonly status: ResourceLifecycleStatus;
  readonly tenantId: string | null;
  readonly ownerActorId: string | null;
  readonly stewardActorId: string | null;
  readonly schemaVersion: string;
  readonly schemaHash: string;
  readonly version: number;
  readonly revision: string;
  readonly etag: string;
  readonly fields: Readonly<Record<string, string>>;
  readonly fieldClassifications: Readonly<Record<string, ResourceFieldClassification>>;
  readonly immutableFields: readonly string[];
  readonly hiddenFields: readonly string[];
  readonly sourceRef: string | null;
  readonly sourceHash: string | null;
  readonly idempotencyKey: string;
  readonly dedupeKey: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly requestId: string;
  readonly traceId: string | null;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly locked: boolean;
  readonly lockReason: string | null;
  readonly legalHold: boolean;
  readonly retentionPolicy: string;
  readonly retainUntil: string | null;
  readonly purgeAllowedAt: string | null;
  readonly archivedAt: string | null;
  readonly deletedAt: string | null;
  readonly purgedAt: string | null;
}

export interface ResourceRelationshipRecord {
  readonly relationshipId: string;
  readonly relationshipType: ResourceRelationshipType;
  readonly tenantId: string | null;
  readonly sourceResourceId: string;
  readonly targetResourceId: string;
  readonly sourceResourceType: string;
  readonly targetResourceType: string;
  readonly required: boolean;
  readonly directional: boolean;
  readonly acyclic: boolean;
  readonly cardinality: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  readonly cascadePolicy: "restrict" | "detach" | "cascade-soft-delete" | "cascade-purge";
  readonly createdBy: string;
  readonly createdAt: string;
  readonly correlationId: string;
}

export interface ResourceMutationRequest {
  readonly mutationType: ResourceMutationType;
  readonly resourceId: string;
  readonly tenantId: string | null;
  readonly expectedVersion: number;
  readonly expectedEtag: string;
  readonly idempotencyKey: string;
  readonly fieldChanges?: Readonly<Record<string, string>>;
  readonly transitionTo?: string | null;
  readonly approvedBy?: string | null;
  readonly noDryRunRationale?: string | null;
  readonly correlationId?: string | null;
  readonly requestId?: string | null;
  readonly traceId?: string | null;
}

export interface SafeResourceView {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly classification: ResourceClassification;
  readonly status: ResourceLifecycleStatus;
  readonly tenantId: string | null;
  readonly ownerActorId: string | null;
  readonly stewardActorId: string | null;
  readonly schemaVersion: string;
  readonly schemaHash: string;
  readonly version: number;
  readonly revision: string;
  readonly etag: string;
  readonly fields: Readonly<Record<string, string>>;
  readonly idempotencyKeyHash: string;
  readonly locked: boolean;
  readonly legalHold: boolean;
  readonly retentionPolicy: string;
  readonly archivedAt: string | null;
  readonly deletedAt: string | null;
  readonly purgedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function assertResourceClassification(value: string): ResourceClassification {
  if (!RESOURCE_CLASSIFICATIONS.includes(value as ResourceClassification)) {
    throw new ResourcePolicyError(
      "unknown-resource-classification",
      "resource classification denied",
    );
  }
  return value as ResourceClassification;
}

export function assertResourceType(value: string): ResourceType {
  const safeType = assertSafeResourceText(value, "resourceType");
  if (!RESOURCE_TYPES.includes(safeType as ResourceType)) {
    throw new ResourcePolicyError("unknown-resource-type", "resource type denied");
  }
  return safeType as ResourceType;
}

export function assertResourceLifecycleStatus(value: string): ResourceLifecycleStatus {
  if (!RESOURCE_LIFECYCLE_STATUSES.includes(value as ResourceLifecycleStatus)) {
    throw new ResourcePolicyError("unknown-resource-status", "resource lifecycle status denied");
  }
  return value as ResourceLifecycleStatus;
}

export function assertResourceRelationshipType(value: string): ResourceRelationshipType {
  if (!RESOURCE_RELATIONSHIP_TYPES.includes(value as ResourceRelationshipType)) {
    throw new ResourcePolicyError("unknown-relationship-type", "resource relationship denied");
  }
  return value as ResourceRelationshipType;
}

export function assertResourceMutationType(value: string): ResourceMutationType {
  if (!RESOURCE_MUTATION_TYPES.includes(value as ResourceMutationType)) {
    throw new ResourcePolicyError("unknown-mutation-type", "resource mutation denied");
  }
  return value as ResourceMutationType;
}

export function resourceTextLooksSensitive(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    telemetryValueLooksSensitive(value) ||
    [
      "object_key",
      "object key",
      "raw_payload",
      "raw payload",
      "raw_row",
      "recipient_address",
      "provider_response",
      "stack_trace",
      "connection_string",
      "private_key",
    ].some((token) => lowered.includes(token))
  );
}

export function safeResourceValue(value: string): string {
  const safe = safeTelemetryValue(value);
  return resourceTextLooksSensitive(value) || resourceTextLooksSensitive(safe)
    ? CONFIG_REDACTED
    : safe;
}

function assertSafeResourceText(value: string, field: string): string {
  const safe = assertNonEmpty(value, field);
  if (resourceTextLooksSensitive(safe)) {
    throw new ResourcePolicyError("resource-value-sensitive", "resource value denied");
  }
  return safe;
}

function assertSafeResourceField(field: string): string {
  const safe = assertNonEmpty(field, "resource.fieldPath");
  if (resourceTextLooksSensitive(safe)) {
    throw new ResourcePolicyError("resource-field-sensitive", "resource field denied");
  }
  return safe;
}

function resourceEtag(input: {
  readonly resourceId: string;
  readonly version: number;
  readonly status: ResourceLifecycleStatus;
  readonly fields: Readonly<Record<string, string>>;
}): string {
  return `etag_${sha256Hex(JSON.stringify(input)).slice(0, 32)}`;
}

export function createResourceSchemaDefinition(input: {
  readonly resourceType: string;
  readonly schemaVersion: string;
  readonly fields: readonly ResourceFieldDefinition[];
  readonly owningCapability: string;
  readonly schemaHash?: string;
  readonly transitions?: readonly ResourceLifecycleTransitionRule[];
}): ResourceSchemaDefinition {
  const fields = input.fields.map((field) => {
    const classification = field.classification;
    if (!RESOURCE_FIELD_CLASSIFICATIONS.includes(classification)) {
      throw new ResourcePolicyError("unknown-field-classification", "resource field denied");
    }
    return Object.freeze({
      ...field,
      fieldPath: assertSafeResourceField(field.fieldPath),
      restrictedAction: field.restrictedAction ? safeResourceValue(field.restrictedAction) : null,
    });
  });
  const transitions = (input.transitions ?? []).map((rule) => {
    const from = assertResourceLifecycleStatus(rule.from);
    const to = assertResourceLifecycleStatus(rule.to);
    if (!RESOURCE_DEFAULT_ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new ResourcePolicyError("transition-not-allowed", "resource transition denied");
    }
    return Object.freeze({
      ...rule,
      from,
      to,
      requiredAction: safeResourceValue(rule.requiredAction),
    });
  });
  const schemaBasis = {
    resourceType: assertResourceType(input.resourceType),
    schemaVersion: safeResourceValue(assertNonEmpty(input.schemaVersion, "resource.schemaVersion")),
    fields: fields.map((field) => ({
      fieldPath: field.fieldPath,
      classification: field.classification,
      required: field.required,
      mutable: field.mutable,
      visible: field.visible,
      allowedOnCreate: field.allowedOnCreate,
      allowedOnUpdate: field.allowedOnUpdate,
    })),
  };
  return Object.freeze({
    resourceType: schemaBasis.resourceType,
    schemaVersion: schemaBasis.schemaVersion,
    schemaHash: input.schemaHash ?? sha256Hex(JSON.stringify(schemaBasis)),
    owningCapability: safeResourceValue(assertNonEmpty(input.owningCapability, "owningCapability")),
    fields: Object.freeze(fields),
    transitions: Object.freeze(transitions),
  });
}

export function validateResourceFieldChanges(input: {
  readonly schema: ResourceSchemaDefinition;
  readonly existing?: ResourceRecord | null | undefined;
  readonly mutationType: ResourceMutationType;
  readonly changes: Readonly<Record<string, string>>;
  readonly permittedActions?: readonly string[] | undefined;
}): Readonly<Record<string, string>> {
  const permitted = new Set(input.permittedActions ?? []);
  const byPath = new Map(input.schema.fields.map((field) => [field.fieldPath, field]));
  const safeChanges: Record<string, string> = {};
  for (const [fieldPath, value] of Object.entries(input.changes)) {
    const safePath = assertSafeResourceField(fieldPath);
    const definition = byPath.get(safePath);
    if (!definition) {
      throw new ResourcePolicyError("unknown-field-denied", "resource field denied");
    }
    if (definition.visible === false) {
      throw new ResourcePolicyError("hidden-field-denied", "resource field denied");
    }
    if (input.mutationType === "create" && !definition.allowedOnCreate) {
      throw new ResourcePolicyError("field-not-allowed-on-create", "resource field denied");
    }
    if (input.mutationType !== "create" && !definition.allowedOnUpdate) {
      throw new ResourcePolicyError("field-not-allowed-on-update", "resource field denied");
    }
    if (input.existing && !definition.mutable) {
      throw new ResourcePolicyError("immutable-field-denied", "resource field denied");
    }
    if (
      (definition.classification === "restricted" ||
        definition.classification === "security-sensitive") &&
      definition.restrictedAction &&
      !permitted.has(definition.restrictedAction)
    ) {
      throw new ResourcePolicyError(
        "restricted-field-permission-required",
        "resource field denied",
      );
    }
    safeChanges[safePath] = assertSafeResourceText(String(value), `resource.field.${safePath}`);
  }
  if (input.mutationType === "create") {
    for (const field of input.schema.fields) {
      if (field.required && !(field.fieldPath in safeChanges)) {
        throw new ResourcePolicyError("required-field-missing", "resource field required");
      }
    }
  }
  return Object.freeze(safeChanges);
}

export function createResourceRecord(input: {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly classification: string;
  readonly tenantId?: string | null;
  readonly ownerActorId?: string | null;
  readonly stewardActorId?: string | null;
  readonly schema: ResourceSchemaDefinition;
  readonly fields: Readonly<Record<string, string>>;
  readonly idempotencyKey: string;
  readonly actorId?: string | null;
  readonly serviceActorId?: string | null;
  readonly status?: string;
  readonly sourceRef?: string | null;
  readonly correlationId?: string;
  readonly causationId?: string | null;
  readonly requestId?: string;
  readonly traceId?: string | null;
  readonly locked?: boolean;
  readonly lockReason?: string | null;
  readonly legalHold?: boolean;
  readonly retentionPolicy?: string;
  readonly retainUntil?: string | null;
  readonly purgeAllowedAt?: string | null;
  readonly now?: string;
}): ResourceRecord {
  const classification = assertResourceClassification(input.classification);
  const tenantId = input.tenantId ?? null;
  if (!tenantId && !["public", "system-internal"].includes(classification)) {
    throw new ResourcePolicyError("tenant-required", "resource tenant context required");
  }
  const resourceType = assertResourceType(input.resourceType);
  if (resourceType !== input.schema.resourceType) {
    throw new ResourcePolicyError("schema-resource-type-mismatch", "resource schema denied");
  }
  const actorId = input.actorId ?? null;
  const serviceActorId = input.serviceActorId ?? null;
  if (!actorId && !serviceActorId) {
    throw new ResourcePolicyError("actor-or-service-actor-required", "resource actor required");
  }
  const fields = validateResourceFieldChanges({
    schema: input.schema,
    mutationType: "create",
    changes: input.fields,
    permittedActions: input.schema.fields
      .map((field) => field.restrictedAction)
      .filter((value): value is string => Boolean(value)),
  });
  const fieldClassifications: Record<string, ResourceFieldClassification> = {};
  const immutableFields: string[] = [];
  const hiddenFields: string[] = [];
  for (const field of input.schema.fields) {
    fieldClassifications[field.fieldPath] = field.classification;
    if (!field.mutable) immutableFields.push(field.fieldPath);
    if (!field.visible) hiddenFields.push(field.fieldPath);
  }
  const createdAt = input.now ?? new Date().toISOString();
  const status = assertResourceLifecycleStatus(input.status ?? "draft");
  const version = 1;
  const resourceId = assertSafeResourceText(input.resourceId, "resourceId");
  const etag = resourceEtag({ resourceId, version, status, fields });
  const idempotencyKey = assertNonEmpty(input.idempotencyKey, "resource.idempotencyKey");
  return Object.freeze({
    resourceId,
    resourceType,
    classification,
    status,
    tenantId,
    ownerActorId: input.ownerActorId ?? actorId,
    stewardActorId: input.stewardActorId ?? null,
    schemaVersion: input.schema.schemaVersion,
    schemaHash: input.schema.schemaHash,
    version,
    revision: `rev_${opaqueHash(`${resourceId}:${version}:${etag}`).slice(0, 24)}`,
    etag,
    fields,
    fieldClassifications: Object.freeze(fieldClassifications),
    immutableFields: Object.freeze(immutableFields.sort()),
    hiddenFields: Object.freeze(hiddenFields.sort()),
    sourceRef: input.sourceRef ? safeResourceValue(input.sourceRef) : null,
    sourceHash: input.sourceRef ? sha256Hex(input.sourceRef) : null,
    idempotencyKey,
    dedupeKey: `dedupe_${opaqueHash(idempotencyKey).slice(0, 24)}`,
    correlationId: input.correlationId ?? stableId("corr", [resourceId]),
    causationId: input.causationId ?? null,
    requestId: input.requestId ?? stableId("req", [resourceId]),
    traceId: input.traceId ?? null,
    createdBy: actorId ?? serviceActorId ?? "unknown",
    updatedBy: actorId ?? serviceActorId ?? "unknown",
    createdAt,
    updatedAt: createdAt,
    locked: input.locked ?? false,
    lockReason: input.lockReason ? safeResourceValue(input.lockReason) : null,
    legalHold: input.legalHold ?? false,
    retentionPolicy: safeResourceValue(
      input.retentionPolicy ?? "classification-aware-local-dev-test",
    ),
    retainUntil: input.retainUntil ?? null,
    purgeAllowedAt: input.purgeAllowedAt ?? null,
    archivedAt: null,
    deletedAt: null,
    purgedAt: null,
  });
}

export function updateResourceRecord(input: {
  readonly record: ResourceRecord;
  readonly schema: ResourceSchemaDefinition;
  readonly mutationType: ResourceMutationType;
  readonly actorId: string;
  readonly expectedVersion: number;
  readonly expectedEtag: string;
  readonly idempotencyKey: string;
  readonly fieldChanges?: Readonly<Record<string, string>> | undefined;
  readonly transitionTo?: string | null | undefined;
  readonly permittedActions?: readonly string[] | undefined;
  readonly approvedBy?: string | null | undefined;
  readonly now?: string;
}): ResourceRecord {
  const mutationType = assertResourceMutationType(input.mutationType);
  if (input.record.version !== input.expectedVersion || input.record.etag !== input.expectedEtag) {
    throw new ResourcePolicyError("version-conflict", "resource version conflict");
  }
  if (input.record.status === "purged") {
    throw new ResourcePolicyError("resource-purged", "resource denied");
  }
  if (input.record.locked && !["unlock", "purge"].includes(mutationType)) {
    throw new ResourcePolicyError("resource-locked", "resource locked");
  }
  if (input.record.legalHold && mutationType === "purge") {
    throw new ResourcePolicyError("legal-hold-blocks-purge", "resource purge denied");
  }

  let nextStatus = input.record.status as ResourceLifecycleStatus;
  const now = input.now ?? new Date().toISOString();
  let archivedAt = input.record.archivedAt;
  let deletedAt = input.record.deletedAt;
  let purgedAt = input.record.purgedAt;
  let locked = input.record.locked;
  let lockReason = input.record.lockReason;
  if (mutationType === "archive") {
    nextStatus = "archived";
    archivedAt = now;
  } else if (mutationType === "restore") {
    nextStatus = "active";
    deletedAt = null;
  } else if (mutationType === "soft-delete") {
    nextStatus = "soft-deleted";
    deletedAt = now;
  } else if (mutationType === "purge") {
    if (input.record.status !== "purge-eligible") {
      throw new ResourcePolicyError("purge-status-required", "resource purge denied");
    }
    nextStatus = "purged";
    purgedAt = now;
  } else if (mutationType === "lock") {
    nextStatus = "locked";
    locked = true;
    lockReason = "resource lifecycle lock";
  } else if (mutationType === "unlock") {
    nextStatus = "active";
    locked = false;
    lockReason = null;
  } else if (mutationType === "transition") {
    const requested = assertResourceLifecycleStatus(input.transitionTo ?? "");
    const rule = input.schema.transitions.find(
      (candidate) => candidate.from === input.record.status && candidate.to === requested,
    );
    if (!rule && !RESOURCE_DEFAULT_ALLOWED_TRANSITIONS[input.record.status].includes(requested)) {
      throw new ResourcePolicyError("transition-not-allowed", "resource transition denied");
    }
    if (
      rule?.approvalRequired &&
      rule.requesterCannotApprove &&
      input.approvedBy === input.actorId
    ) {
      throw new ResourcePolicyError("self-approval-denied", "resource approval denied");
    }
    nextStatus = requested;
  }

  const fields =
    mutationType === "update" || mutationType === "patch"
      ? Object.freeze({
          ...input.record.fields,
          ...validateResourceFieldChanges({
            schema: input.schema,
            existing: input.record,
            mutationType,
            changes: input.fieldChanges ?? {},
            permittedActions: input.permittedActions,
          }),
        })
      : input.record.fields;
  const version = input.record.version + 1;
  const etag = resourceEtag({
    resourceId: input.record.resourceId,
    version,
    status: nextStatus,
    fields,
  });
  return Object.freeze({
    ...input.record,
    status: nextStatus,
    version,
    revision: `rev_${opaqueHash(`${input.record.resourceId}:${version}:${etag}`).slice(0, 24)}`,
    etag,
    fields,
    idempotencyKey: assertNonEmpty(input.idempotencyKey, "resource.idempotencyKey"),
    dedupeKey: `dedupe_${opaqueHash(input.idempotencyKey).slice(0, 24)}`,
    updatedBy: input.actorId,
    updatedAt: now,
    archivedAt,
    deletedAt,
    purgedAt,
    locked,
    lockReason,
  });
}

export function createResourceRelationshipRecord(input: {
  readonly relationshipId: string;
  readonly relationshipType: string;
  readonly tenantId?: string | null;
  readonly source: ResourceRecord;
  readonly target: ResourceRecord;
  readonly required?: boolean;
  readonly directional?: boolean;
  readonly acyclic?: boolean;
  readonly cardinality?: ResourceRelationshipRecord["cardinality"];
  readonly cascadePolicy?: ResourceRelationshipRecord["cascadePolicy"];
  readonly createdBy: string;
  readonly correlationId?: string;
  readonly createdAt?: string;
}): ResourceRelationshipRecord {
  const tenantId = input.tenantId ?? input.source.tenantId;
  if (input.source.tenantId !== input.target.tenantId) {
    throw new ResourcePolicyError(
      "cross-tenant-relationship-denied",
      "resource relationship denied",
    );
  }
  if (tenantId !== input.source.tenantId) {
    throw new ResourcePolicyError("relationship-tenant-mismatch", "resource relationship denied");
  }
  return Object.freeze({
    relationshipId: assertSafeResourceText(input.relationshipId, "relationshipId"),
    relationshipType: assertResourceRelationshipType(input.relationshipType),
    tenantId,
    sourceResourceId: input.source.resourceId,
    targetResourceId: input.target.resourceId,
    sourceResourceType: input.source.resourceType,
    targetResourceType: input.target.resourceType,
    required: input.required ?? false,
    directional: input.directional ?? true,
    acyclic: input.acyclic ?? true,
    cardinality: input.cardinality ?? "many-to-many",
    cascadePolicy: input.cascadePolicy ?? "restrict",
    createdBy: assertSafeResourceText(input.createdBy, "relationship.createdBy"),
    createdAt: input.createdAt ?? new Date().toISOString(),
    correlationId: input.correlationId ?? stableId("corr", [input.relationshipId]),
  });
}

export function toSafeResourceView(record: ResourceRecord): SafeResourceView {
  const fields: Record<string, string> = {};
  const hidden = new Set(record.hiddenFields);
  for (const [key, value] of Object.entries(record.fields)) {
    const classification = record.fieldClassifications[key] ?? "internal";
    if (
      hidden.has(key) ||
      classification === "restricted" ||
      classification === "security-sensitive"
    ) {
      continue;
    }
    fields[key] = safeResourceValue(value);
  }
  return Object.freeze({
    resourceId: record.resourceId,
    resourceType: record.resourceType,
    classification: record.classification,
    status: record.status,
    tenantId: record.tenantId,
    ownerActorId: record.ownerActorId,
    stewardActorId: record.stewardActorId,
    schemaVersion: record.schemaVersion,
    schemaHash: record.schemaHash,
    version: record.version,
    revision: record.revision,
    etag: record.etag,
    fields: Object.freeze(fields),
    idempotencyKeyHash: `idem_${opaqueHash(record.idempotencyKey).slice(0, 24)}`,
    locked: record.locked,
    legalHold: record.legalHold,
    retentionPolicy: record.retentionPolicy,
    archivedAt: record.archivedAt,
    deletedAt: record.deletedAt,
    purgedAt: record.purgedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
