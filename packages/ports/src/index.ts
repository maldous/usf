import type {
  ActorIdentity,
  AuditCategory,
  AuditEvent,
  AuditEventDraft,
  AuditEventOutcome,
  AuditIntegrityResult,
  AuditRecord,
  AuthorizationRequest,
  BulkItemOutcome,
  BulkOperationRecord,
  ConfigLayer,
  FileMetadata,
  FileScanStatusValue,
  FileStatusValue,
  GuardrailDecision,
  GuardrailEvaluationInput,
  GuardrailPolicy,
  GuardrailPolicyUsage,
  IdentityClaims,
  JobRecord,
  TelemetryHealthInput,
  TelemetryMetricInput,
  TelemetryOperationalEventInput,
  TelemetrySignalPage,
  TelemetrySpanInput,
  TelemetryStructuredLogInput,
  TelemetryCollectorStatusView,
  NotificationChannel,
  NotificationClassification,
  NotificationDeliveryStatus,
  NotificationProviderConfig,
  NotificationProviderMode,
  PolicyDecision,
  SecretReference,
  Session,
  SearchFacetBucket,
  SearchIndexDocument,
  SearchQueryPage,
  SearchQueryPlan,
  SearchQueryPolicy,
  TenantContext,
  TenantMembership,
  VerifiedKeycloakToken,
  WorkflowRecord,
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

// Notification provider port (parity-notifications-messaging, USF-133). This is a
// controlled delivery boundary, not a live provider claim. Provider credentials are
// represented only by NotificationProviderConfig.credentialRef (SecretReference);
// send results are normalized and value-free.
export interface NotificationProviderSendInput {
  readonly tenantId: string;
  readonly notificationId: string;
  readonly deliveryId: string;
  readonly channel: NotificationChannel;
  readonly classification: NotificationClassification;
  readonly providerRef: string;
  readonly providerMode: NotificationProviderMode;
  readonly recipientId: string;
  readonly recipientAddressRef: string;
  readonly recipientAddressHash: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly templateHash: string;
  readonly idempotencyKey: string;
  readonly subject: string;
  readonly body: string;
  readonly payloadClassification: string;
}

export type NotificationProviderSendResult =
  | {
      readonly ok: true;
      readonly deliveryStatus: Extract<NotificationDeliveryStatus, "sent" | "provider-unknown">;
      readonly providerMessageId: string;
      readonly safeProviderSummary: string;
    }
  | {
      readonly ok: false;
      readonly deliveryStatus: Extract<NotificationDeliveryStatus, "failed" | "provider-unknown">;
      readonly failureReasonCode: string;
      readonly safeFailureMessage: string;
      readonly retryable: boolean;
    };

export interface NotificationProvider {
  readonly providerMode: NotificationProviderMode;
  configure(config: NotificationProviderConfig): void;
  send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult>;
}

export interface SecretStore {
  writeSecret(input: { tenantId: string; name: string; value: string }): Promise<void>;
  readSecret(input: { tenantId: string; name: string }): Promise<string | undefined>;
}

export interface TelemetryPort {
  recordMetric(input: TelemetryMetricInput): void;
  recordTraceSpan(input: TelemetrySpanInput): void;
  recordStructuredLog(input: TelemetryStructuredLogInput): void;
  recordOperationalEvent(input: TelemetryOperationalEventInput): void;
  recordSecuritySignal(input: TelemetryOperationalEventInput): void;
  recordHealthSignal(input: TelemetryHealthInput): void;
  recordReadinessSignal(input: TelemetryHealthInput): void;
  recordLivenessSignal(input: TelemetryHealthInput): void;
  query(input: { tenantId: string; limit?: number; cursor?: string }): TelemetrySignalPage;
  safeStatusView(): TelemetryCollectorStatusView;
}

// Guardrail port (parity-rate-limits-abuse, USF-160). This is local/dev/test
// policy enforcement and proof only; it is not live WAF, edge, gateway, bot,
// fraud, or production abuse-prevention readiness.
export interface GuardrailPort {
  upsertPolicy(policy: GuardrailPolicy): GuardrailPolicy;
  getPolicy(policyId: string): GuardrailPolicy | undefined;
  listPolicies(input?: { tenantId?: string | null }): readonly GuardrailPolicy[];
  evaluate(input: GuardrailEvaluationInput): GuardrailDecision;
  resetWindow(input: { policyId: string; tenantId: string; subjectRef?: string | null }): void;
  usage(input?: { policyId?: string; tenantId?: string }): readonly GuardrailPolicyUsage[];
  safeStatusView(): {
    readonly providerMode: "in-memory" | "local-test";
    readonly distributedEnforcement: "single-node-in-memory";
    readonly policyCount: number;
    readonly liveWafReadinessClaim: false;
    readonly liveEdgeReadinessClaim: false;
    readonly productionReadinessClaim: false;
  };
}

// Import/export/bulk operation port (parity-import-export-bulk, USF-162).
// Stores controlled data-movement metadata and item-level outcomes only. Raw rows,
// object keys, payloads, provider internals, and secrets are outside this port.
export interface ImportExportPort {
  create(record: BulkOperationRecord): BulkOperationRecord;
  get(context: TenantContext, operationId: string): BulkOperationRecord | undefined;
  put(context: TenantContext, record: BulkOperationRecord): BulkOperationRecord;
  forTenant(
    context: TenantContext,
    input?: { limit?: number; cursor?: string },
  ): {
    readonly operations: readonly BulkOperationRecord[];
    readonly nextCursor: string | null;
  };
  findByIdempotencyKey(
    context: TenantContext,
    idempotencyKey: string,
  ): BulkOperationRecord | undefined;
  appendItemOutcome(context: TenantContext, operationId: string, outcome: BulkItemOutcome): void;
  itemOutcomes(context: TenantContext, operationId: string): readonly BulkItemOutcome[];
}

// Tenant-safe search/index port (parity-search-indexing, USF-164). The index is a
// discovery projection, not source authority. It stores classified safe projections
// only; capability code performs PDP/guardrail/source-revalidation before exposing
// results. Implementations in this slice are in-memory/local dev/test only.
export interface SearchIndexPort {
  index(document: SearchIndexDocument): SearchIndexDocument;
  delete(context: TenantContext, indexDocumentId: string): boolean;
  get(context: TenantContext, indexDocumentId: string): SearchIndexDocument | undefined;
  query(context: TenantContext, plan: SearchQueryPlan, policy: SearchQueryPolicy): SearchQueryPage;
  facet(
    context: TenantContext,
    plan: SearchQueryPlan,
    policy: SearchQueryPolicy,
  ): readonly SearchFacetBucket[];
  reindexTenant(input: { tenantId: string; serviceActorId: string; idempotencyKey: string }): {
    readonly reindexed: number;
    readonly idempotent: boolean;
  };
  safeStatusView(): {
    readonly providerMode: "in-memory" | "local-test";
    readonly indexLifecycle: "active" | "degraded" | "disabled";
    readonly documentCount: number;
    readonly liveSearchReadinessClaim: false;
    readonly liveVectorReadinessClaim: false;
    readonly aiRagReadinessClaim: false;
    readonly publicSearchApiReadinessClaim: false;
    readonly productionReadinessClaim: false;
  };
}

export interface ObservabilitySink extends TelemetryPort {
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

// Workflow/job port family (parity-jobs-workflows, USF-133 / ADR 0011). Two SEPARATE
// ports: a durable workflow port and an operational job/automation port. Capabilities
// depend only on these ports — never on Temporal or Windmill directly (ADR 0011).

/** Operational job/automation store + queue. In-memory dev adapter; a composed-test
 *  adapter (Windmill-like) is deferred. Holds tenant-scoped or service-actor jobs. */
export interface OperationalJobPort {
  submit(record: JobRecord): void;
  get(jobId: string): JobRecord | undefined;
  put(record: JobRecord): void;
  /** Lease the next runnable job (status queued/scheduled/retrying whose runAfter has
   *  passed and whose lease is free/expired) for an owner; sets lease + status leased. */
  claim(input: { now: number; leaseOwner: string; leaseSeconds: number }): JobRecord | undefined;
  forTenant(tenantId: string): readonly JobRecord[];
  deadLettered(): readonly JobRecord[];
  /** True if a tenant already has a job with this idempotency key (dedupe side effects). */
  hasIdempotencyKey(tenantId: string | null, idempotencyKey: string): boolean;
}

/** Durable domain workflow store. In-memory dev adapter; Temporal is the canonical
 *  composed-test provider (deferred — no live claim). Versioned, tenant-bound. */
export interface DurableWorkflowPort {
  start(record: WorkflowRecord): void;
  get(workflowId: string): WorkflowRecord | undefined;
  put(record: WorkflowRecord): void;
  forTenant(tenantId: string): readonly WorkflowRecord[];
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
  readonly mode:
    | "in-memory"
    | "local-test"
    | "mock"
    | "composed-test"
    | "live-external-deferred"
    | "disabled"
    | "unavailable";
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
