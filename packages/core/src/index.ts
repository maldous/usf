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
  "job",
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
  "file.uploaded": { category: "file", severity: "info", reserved: true },
  "file.downloaded": { category: "file", severity: "info", reserved: true },
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
  "session_token",
  "access_key",
  "client_secret",
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
