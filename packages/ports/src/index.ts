import type {
  ActorIdentity,
  AuditCategory,
  AuditEvent,
  AuditEventDraft,
  AuditEventOutcome,
  AuditIntegrityResult,
  AuditRecord,
  AuthorizationRequest,
  ConfigLayer,
  FileMetadata,
  FileScanStatusValue,
  FileStatusValue,
  IdentityClaims,
  PolicyDecision,
  SecretReference,
  Session,
  TenantContext,
  TenantMembership,
  VerifiedKeycloakToken,
} from "@foundation/core";

export interface IdentityProvider {
  readonly mode: "hermetic-mock" | "local-composed-real-service";
  issueLogin(input: { tenantId: string; email: string }): Promise<IdentityClaims>;
}

export interface AuditLedger {
  append(record: AuditRecord): Promise<void>;
  list(tenantId: string): readonly AuditRecord[];
}

export interface ObjectStore {
  putObject(input: { tenantId: string; key: string; body: string }): Promise<void>;
  getObject(input: { tenantId: string; key: string }): Promise<string | undefined>;
  deleteObject(input: { tenantId: string; key: string }): Promise<void>;
  headObject(input: {
    tenantId: string;
    key: string;
  }): Promise<{ exists: boolean; sizeBytes: number } | undefined>;
}

export interface EventBus {
  publish(input: { tenantId: string; subject: string; payload: unknown }): Promise<void>;
  drain(tenantId: string): readonly unknown[];
}

export interface WorkflowEngine {
  schedule(input: { tenantId: string; workflow: string; payload: unknown }): Promise<string>;
}

export interface MailProvider {
  send(input: { tenantId: string; to: string; subject: string; body: string }): Promise<void>;
}

export interface SecretStore {
  writeSecret(input: { tenantId: string; name: string; value: string }): Promise<void>;
  readSecret(input: { tenantId: string; name: string }): Promise<string | undefined>;
}

export interface ObservabilitySink {
  record(input: { tenantId: string; signal: string; attributes: Record<string, string> }): void;
  list(tenantId: string): readonly string[];
}

export interface TenantScopedRepository<T> {
  insert(context: TenantContext, value: T): Promise<void>;
  list(context: TenantContext, tenantId: string): Promise<readonly T[]>;
}

// Authorization ports (parity-tenant-authz, USF-140). Capabilities depend on these
// ports, never on an IdP, database, or provider implementation, for authorization.

export interface PolicyDecisionPoint {
  decide(request: AuthorizationRequest): PolicyDecision;
}

export interface TenantMembershipDirectory {
  membership(input: { actorId: string; tenantId: string }): TenantMembership | undefined;
  activeTenants(actorId: string): readonly string[];
}

/** Maps a stable internal actor from an external IdP subject + provider. */
export interface IdentityDirectory {
  resolveActor(input: {
    externalSubject: string;
    identityProvider: string;
  }): ActorIdentity | undefined;
}

// Keycloak-brokered identity ports (parity-auth-keycloak-broker, USF-133 / ADR 0012).
// Keycloak is the only USF-facing issuer; USF validates Keycloak-issued tokens only.

/** Validates a Keycloak-issued compact JWT and returns a VerifiedKeycloakToken.
 *  MUST fail closed by throwing KeycloakTokenError on any invalid issuer (incl. a
 *  brokered-upstream issuer presented directly), audience, signature, algorithm,
 *  key, expiry, or not-before. Never returns an unverified token. */
export interface KeycloakTokenVerifier {
  verify(token: string): VerifiedKeycloakToken;
}

/** A tenant-bound session store. Holds only opaque-hashed identifiers (never raw
 *  tokens/cookies). Capabilities depend on this port, not a concrete store. */
export interface SessionStore {
  create(session: Session): void;
  get(sessionId: string): Session | undefined;
  put(session: Session): void;
  forActor(actorId: string): readonly Session[];
}

// Audit / evidence ports (parity-audit, USF-142). Capabilities depend on these
// ports, never on a database or provider implementation, to record or read audit
// evidence. The rich AuditEvent path supersedes the thin AuditRecord path for new
// work; AuditLedger is retained for already-wired thin call sites.

/** Records structured, append-only audit evidence. Components hold this, not the store. */
export interface AuditRecorder {
  record(draft: AuditEventDraft): Promise<AuditEvent>;
}

export interface AuditQueryCriteria {
  readonly tenantId: string;
  readonly category?: AuditCategory;
  readonly eventType?: string;
  readonly action?: string;
  readonly outcome?: AuditEventOutcome;
  readonly correlationId?: string;
  readonly limit?: number;
  /** Opaque forward cursor. Filters never accept another tenant's id. */
  readonly cursor?: string;
}

export interface AuditEventPage {
  readonly events: readonly AuditEvent[];
  readonly nextCursor: string | null;
}

// Tenant-safe audit evidence store. query/get/verify require a tenant context and
// only ever return the context tenant's events; a cross-tenant id resolves to
// undefined (non-enumerating), never an error that confirms existence.
export interface AuditEventLedger extends AuditRecorder {
  query(context: TenantContext, criteria: AuditQueryCriteria): Promise<AuditEventPage>;
  get(context: TenantContext, eventId: string): Promise<AuditEvent | undefined>;
  verify(context: TenantContext): Promise<AuditIntegrityResult>;
}

// Future ports — declared for forward-compat, NOT implemented in this slice
// (deferred, USF-143). No live KMS/HSM signing, no audit export route, and no live
// SIEM integration before separate authorisation.
export interface AuditSigner {
  sign(input: { eventHash: string; chainKeyId: string }): Promise<{ signature: string }>;
}

export interface AuditExporter {
  export(
    context: TenantContext,
    criteria: AuditQueryCriteria,
  ): Promise<{ exportId: string; events: readonly AuditEvent[]; integrity: AuditIntegrityResult }>;
}

export interface SiemForwarder {
  forward(event: AuditEvent): Promise<void>;
}

// Config / secrets ports (parity-config-secrets, USF-144). Capabilities depend on
// these ports, never on a provider/secret-manager implementation. Secret VALUES are
// resolved only through SecretResolver by an authorised internal caller.

/** Supplies the ordered config layers for a key in a tenant/environment context. */
export interface ConfigLayerProvider {
  layers(input: { tenantId: string; key: string }): readonly ConfigLayer[];
}

/** Deterministic feature-flag value source (undefined = unknown → safe default). */
export interface FeatureFlagSource {
  flagValue(input: { tenantId: string; flagKey: string }): boolean | undefined;
}

// Resolves an opaque SecretReference to its value for an authorised internal
// consumer only. Fails closed on revoked/expired/unknown-version. describe() returns
// metadata (a SecretReference) and never a value.
export interface SecretResolver {
  describe(input: { tenantId: string; name: string }): Promise<SecretReference | undefined>;
  resolveSecretValue(reference: SecretReference): Promise<string>;
}

// Future port — declared for forward-compat, NOT implemented in this slice (deferred,
// USF-145). No live external Vault/Key Vault/KMS before separate authorisation.
export interface ExternalSecretManager {
  fetch(reference: SecretReference): Promise<{ value: string }>;
}

// Files / object-storage ports (parity-files-storage, USF-146). Capabilities depend
// on these ports, never on a storage/scanner provider implementation.

export interface FileQueryCriteria {
  readonly tenantId: string;
  readonly status?: FileStatusValue;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface FilePage {
  readonly files: readonly FileMetadata[];
  readonly nextCursor: string | null;
}

export interface FileMetadataPatch {
  readonly status?: FileStatusValue;
  readonly scanStatus?: FileScanStatusValue;
  readonly quarantineReason?: string | null;
  readonly contentTypeVerified?: boolean;
  readonly legalHold?: boolean;
  readonly deletedAt?: string | null;
  readonly updatedBy: string;
}

// Authoritative tenant-scoped file metadata store. get/list/update require a tenant
// context and only ever touch the context tenant's rows; a cross-tenant id resolves to
// undefined (non-enumerating).
export interface FileMetadataStore {
  insert(meta: FileMetadata): Promise<void>;
  get(context: TenantContext, fileId: string): Promise<FileMetadata | undefined>;
  list(context: TenantContext, criteria: FileQueryCriteria): Promise<FilePage>;
  update(
    context: TenantContext,
    fileId: string,
    patch: FileMetadataPatch,
  ): Promise<FileMetadata | undefined>;
}

// Malware/DLP scan posture as a port + status model only (no live antivirus/DLP in
// this slice; live scanner is deferred — USF-147). Scanner failure must not silently
// permit a risky file: callers treat a non-clean result as deny.
export interface ScanProvider {
  readonly mode: "in-memory" | "local-composed-test" | "mock" | "live-external";
  scan(input: {
    tenantId: string;
    objectKey: string;
    body?: string;
  }): Promise<{ status: FileScanStatusValue; scannerRef: string }>;
}

// Future port — declared for forward-compat, NOT implemented in this slice (deferred,
// USF-147). A live signed/presigned URL issuer must be scoped, expiring, purpose-bound,
// tenant-bound, and audit-recorded; no live object-store signing before authorisation.
export interface SignedUrlIssuer {
  issue(input: {
    tenantId: string;
    fileId: string;
    purpose: string;
    ttlSeconds: number;
  }): Promise<{ token: string; expiresAt: string }>;
}
