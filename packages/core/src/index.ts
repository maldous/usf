import { createHash } from "node:crypto";

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
  "job.started": { category: "job", severity: "info", reserved: true },
  "job.completed": { category: "job", severity: "info", reserved: true },
  "job.failed": { category: "job", severity: "warning", reserved: true },
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
