import { Type } from "@sinclair/typebox";

const RuntimeProviderModeSchema = Type.Union([
  Type.Literal("dev in-memory"),
  Type.Literal("local-composed-real-service"),
]);
const RuntimeProviderClassSchema = Type.Union([
  Type.Literal("hermetic-mock"),
  Type.Literal("local-composed-real-service"),
]);
const RuntimeProviderBindingSchema = Type.Object({
  bindingId: Type.String({ minLength: 1 }),
  bindingStatus: Type.String({ minLength: 1 }),
  serviceCatalogueServiceIds: Type.Array(Type.String({ minLength: 1 })),
  providerRegistryIds: Type.Array(Type.String({ minLength: 1 })),
  adapterName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  portName: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  providerMode: Type.String({ minLength: 1 }),
  providerClass: Type.String({ minLength: 1 }),
  serviceCatalogueAuthority: Type.Literal("spec/instances/compose-service/service-catalogue.json"),
  composeTarget: Type.Literal("compose/compose.dev.generated.yaml"),
  endpointRef: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  sdkPackage: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  sdkVersion: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  sdkBoundary: Type.String({ minLength: 1 }),
  proofSurfaces: Type.Array(Type.String({ minLength: 1 })),
  deferredReason: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  followUpIssueRefs: Type.Array(Type.String({ minLength: 1 })),
  claimBoundary: Type.String({ minLength: 1 }),
});
const RuntimeDatabaseProviderEvidenceSchema = Type.Union([
  Type.Object({
    providerRef: Type.Literal("database-postgres-composed-test"),
    providerMode: Type.Literal("composed-test"),
    providerRegistryId: Type.Literal("database-postgres-composed-test"),
    serviceCatalogueServiceId: Type.Literal("postgres"),
    bindingId: Type.Literal("runtime-database-provider-binding"),
    adapterName: Type.Union([
      Type.Literal("PostgresTenantMembershipRepository"),
      Type.Literal("PostgresTenantMembershipDirectory"),
    ]),
    sdkPackage: Type.Literal("pg"),
    sdkVersion: Type.Literal("8.22.0"),
    sdkBoundary: Type.Literal("adapter-package-only"),
    endpointRef: Type.String({ minLength: 1 }),
    readinessChecked: Type.Boolean(),
    readinessRetryPolicy: Type.Literal("bounded-exponential-backoff-60s"),
    readinessAttempts: Type.Number({ minimum: 0 }),
    retryCount: Type.Number({ minimum: 0 }),
    connectionFailureCount: Type.Number({ minimum: 0 }),
    operationLatencyBucket: Type.Union([
      Type.Literal("lt-1s"),
      Type.Literal("1s-5s"),
      Type.Literal("5s-30s"),
      Type.Literal("30s-60s"),
      Type.Literal("timeout"),
    ]),
    adapterHealthStatus: Type.Literal("healthy"),
    structuredLogEvidenceCaptured: Type.Boolean(),
    traceEvidenceCaptured: Type.Boolean(),
    metricEvidenceCaptured: Type.Boolean(),
    auditEvidenceCaptured: Type.Boolean(),
    redactionChecked: Type.Boolean(),
    traceIdHash: Type.String({ minLength: 1 }),
    correlationIdHash: Type.String({ minLength: 1 }),
    operation: Type.Union([
      Type.Literal("membership-write"),
      Type.Literal("membership-read"),
      Type.Literal("membership-round-trip"),
      Type.Literal("schema-prepare"),
    ]),
    operationOutcome: Type.Literal("succeeded"),
    safeErrorCode: Type.Null(),
    failClosedDenials: Type.Number({ minimum: 0 }),
    iso27001Support: Type.Literal("asset-inventory-control-evidence-only-no-certification-claim"),
    writeChecked: Type.Boolean(),
    readbackChecked: Type.Boolean(),
    tenantIsolationChecked: Type.Boolean(),
    cleanupBoundary: Type.Literal("compose-down-volume-removal"),
    safeProviderSummary: Type.Literal("postgres-composed-provider"),
    tenantIdHash: Type.String({ minLength: 1 }),
    actorIdHash: Type.String({ minLength: 1 }),
    membershipCount: Type.Number({ minimum: 0 }),
  }),
  Type.Null(),
]);
const RuntimeComposedProviderEvidenceSchema = Type.Union([
  Type.Object({
    providerRef: Type.String({ minLength: 1 }),
    providerMode: Type.Literal("composed-test"),
    providerRegistryId: Type.String({ minLength: 1 }),
    serviceCatalogueServiceId: Type.Optional(Type.String({ minLength: 1 })),
    serviceCatalogueServiceIds: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    bindingId: Type.String({ minLength: 1 }),
    adapterName: Type.String({ minLength: 1 }),
    sdkPackage: Type.Optional(Type.String({ minLength: 1 })),
    sdkVersion: Type.Optional(Type.String({ minLength: 1 })),
    clientSdkPackage: Type.Optional(Type.String({ minLength: 1 })),
    clientSdkVersion: Type.Optional(Type.String({ minLength: 1 })),
    workerSdkPackage: Type.Optional(Type.String({ minLength: 1 })),
    workerSdkVersion: Type.Optional(Type.String({ minLength: 1 })),
    workflowSdkPackage: Type.Optional(Type.String({ minLength: 1 })),
    workflowSdkVersion: Type.Optional(Type.String({ minLength: 1 })),
    sdkBoundary: Type.Literal("adapter-package-only"),
    endpointRef: Type.String({ minLength: 1 }),
    readinessChecked: Type.Boolean(),
    readinessRetryPolicy: Type.Optional(
      Type.Union([
        Type.Literal("bounded-exponential-backoff-60s"),
        Type.Literal("bounded-exponential-backoff-120s-keycloak"),
      ]),
    ),
    readinessAttempts: Type.Optional(Type.Number({ minimum: 0 })),
    retryCount: Type.Optional(Type.Number({ minimum: 0 })),
    connectionFailureCount: Type.Optional(Type.Number({ minimum: 0 })),
    operationLatencyBucket: Type.Optional(
      Type.Union([
        Type.Literal("lt-1s"),
        Type.Literal("1s-5s"),
        Type.Literal("5s-30s"),
        Type.Literal("30s-60s"),
        Type.Literal("30s-120s"),
        Type.Literal("timeout"),
      ]),
    ),
    adapterHealthStatus: Type.Optional(
      Type.Union([Type.Literal("healthy"), Type.Literal("unavailable")]),
    ),
    structuredLogEvidenceCaptured: Type.Optional(Type.Boolean()),
    traceEvidenceCaptured: Type.Optional(Type.Boolean()),
    metricEvidenceCaptured: Type.Optional(Type.Boolean()),
    auditEvidenceCaptured: Type.Optional(Type.Boolean()),
    redactionChecked: Type.Optional(Type.Boolean()),
    traceIdHash: Type.Optional(Type.String({ minLength: 1 })),
    correlationIdHash: Type.Optional(Type.String({ minLength: 1 })),
    operation: Type.Optional(Type.String({ minLength: 1 })),
    operationOutcome: Type.Optional(
      Type.Union([Type.Literal("succeeded"), Type.Literal("failed-closed")]),
    ),
    safeErrorCode: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
    failClosedDenials: Type.Optional(Type.Number({ minimum: 0 })),
    iso27001Support: Type.Optional(
      Type.Literal("asset-inventory-control-evidence-only-no-certification-claim"),
    ),
    publishChecked: Type.Optional(Type.Boolean()),
    writeChecked: Type.Optional(Type.Boolean()),
    readbackChecked: Type.Optional(Type.Boolean()),
    deleteChecked: Type.Optional(Type.Boolean()),
    describeChecked: Type.Optional(Type.Boolean()),
    resolveChecked: Type.Optional(Type.Boolean()),
    pathEncoding: Type.Optional(Type.Literal("base64url-per-segment")),
    pathCollisionResistanceChecked: Type.Optional(Type.Boolean()),
    collidingTenantBoundaryChecked: Type.Optional(Type.Boolean()),
    collidingObjectKeyBoundaryChecked: Type.Optional(Type.Boolean()),
    collidingSecretNameBoundaryChecked: Type.Optional(Type.Boolean()),
    realmChecked: Type.Optional(Type.Boolean()),
    syntheticIdentityChecked: Type.Optional(Type.Boolean()),
    tenantIsolationChecked: Type.Optional(Type.Boolean()),
    tenantBoundaryChecked: Type.Optional(Type.Boolean()),
    failClosedChecked: Type.Optional(Type.Boolean()),
    workerStarted: Type.Optional(Type.Boolean()),
    workflowScheduled: Type.Optional(Type.Boolean()),
    executionCompleted: Type.Optional(Type.Boolean()),
    cleanupAttempted: Type.Optional(Type.Boolean()),
    cleanupSucceeded: Type.Optional(Type.Boolean()),
    cleanupBoundary: Type.Optional(Type.String({ minLength: 1 })),
    safeProviderSummary: Type.String({ minLength: 1 }),
    tenantIdHash: Type.Optional(Type.String({ minLength: 1 })),
    subjectHash: Type.Optional(Type.String({ minLength: 1 })),
    actorIdHash: Type.Optional(Type.String({ minLength: 1 })),
    emailHash: Type.Optional(Type.String({ minLength: 1 })),
    realmHash: Type.Optional(Type.String({ minLength: 1 })),
    storageObjectRefHash: Type.Optional(Type.String({ minLength: 1 })),
    secretNameHash: Type.Optional(Type.String({ minLength: 1 })),
    secretRefHash: Type.Optional(Type.String({ minLength: 1 })),
    workflowNameHash: Type.Optional(Type.String({ minLength: 1 })),
    workflowIdHash: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
    runIdHash: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
    taskQueueHash: Type.Optional(Type.String({ minLength: 1 })),
    messageCount: Type.Optional(Type.Number({ minimum: 0 })),
    byteCount: Type.Optional(Type.Number({ minimum: 0 })),
    failureReasonCode: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
    safeFailureMessage: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
  }),
  Type.Null(),
]);

export const HealthResponseSchema = Type.Object({
  status: Type.Literal("ok"),
  service: Type.Literal("foundation-api"),
  runtimeMode: Type.Union([Type.Literal("dev-in-memory"), Type.Literal("dev-compose-backed")]),
  providerMode: RuntimeProviderModeSchema,
  providerClass: RuntimeProviderClassSchema,
  environment: Type.Literal("local"),
  serviceCatalogueAuthority: Type.Literal("spec/instances/compose-service/service-catalogue.json"),
  composeTarget: Type.Union([Type.Literal("compose/compose.dev.generated.yaml"), Type.Null()]),
  deferredBoundaries: Type.Array(Type.String()),
  composedProviderBindings: Type.Array(RuntimeProviderBindingSchema),
  deferredProviderBindings: Type.Array(RuntimeProviderBindingSchema),
  databaseProviderEvidence: RuntimeDatabaseProviderEvidenceSchema,
  eventBusProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  objectStoreProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  identityProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  secretProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  workflowProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  notificationProviderEvidence: RuntimeComposedProviderEvidenceSchema,
});

export const ReadyResponseSchema = Type.Object({
  status: Type.Literal("ready"),
  service: Type.Literal("foundation-api"),
  runtimeMode: Type.Union([Type.Literal("dev-in-memory"), Type.Literal("dev-compose-backed")]),
  providerMode: RuntimeProviderModeSchema,
  providerClass: RuntimeProviderClassSchema,
  environment: Type.Literal("local"),
  serviceCatalogueAuthority: Type.Literal("spec/instances/compose-service/service-catalogue.json"),
  composeTarget: Type.Union([Type.Literal("compose/compose.dev.generated.yaml"), Type.Null()]),
  deferredBoundaries: Type.Array(Type.String()),
  composedProviderBindings: Type.Array(RuntimeProviderBindingSchema),
  deferredProviderBindings: Type.Array(RuntimeProviderBindingSchema),
  databaseProviderEvidence: RuntimeDatabaseProviderEvidenceSchema,
  eventBusProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  objectStoreProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  identityProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  secretProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  workflowProviderEvidence: RuntimeComposedProviderEvidenceSchema,
  notificationProviderEvidence: RuntimeComposedProviderEvidenceSchema,
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
  runtimeMode: Type.Union([Type.Literal("dev-in-memory"), Type.Literal("dev-compose-backed")]),
  providerMode: RuntimeProviderModeSchema,
  providerClass: RuntimeProviderClassSchema,
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
  // Provider modes only (in-memory/composed-test/mock/live-external-deferred); never credentials.
  providers: Type.Record(Type.String(), Type.String()),
});

export const ProviderRegistryStatusViewSchema = Type.Object({
  providerId: Type.String({ minLength: 1 }),
  providerName: Type.String({ minLength: 1 }),
  providerCategory: Type.String({ minLength: 1 }),
  providerMode: Type.String({ minLength: 1 }),
  owningCapability: Type.String({ minLength: 1 }),
  owningTeamOrRole: Type.String({ minLength: 1 }),
  businessPurpose: Type.String({ minLength: 1 }),
  dataClassification: Type.String({ minLength: 1 }),
  tenantScope: Type.String({ minLength: 1 }),
  environmentScope: Type.String({ minLength: 1 }),
  lifecycleState: Type.String({ minLength: 1 }),
  riskClassification: Type.String({ minLength: 1 }),
  criticality: Type.String({ minLength: 1 }),
  healthStatus: Type.String({ minLength: 1 }),
  readinessStatus: Type.String({ minLength: 1 }),
  livenessStatus: Type.String({ minLength: 1 }),
  capabilityStatus: Type.String({ minLength: 1 }),
  providerRegion: Type.String({ minLength: 1 }),
  dataResidencyStatus: Type.String({ minLength: 1 }),
  egressAllowed: Type.Boolean(),
  tlsRequired: Type.Boolean(),
  credentialPosture: Type.String({ minLength: 1 }),
  endpointPosture: Type.String({ minLength: 1 }),
  driftStatus: Type.String({ minLength: 1 }),
  resiliencePosture: Type.String({ minLength: 1 }),
  failoverPosture: Type.String({ minLength: 1 }),
  supplierPosture: Type.String({ minLength: 1 }),
  liveReadinessClaim: Type.Boolean(),
  productionReadinessClaim: Type.Boolean(),
  lastReviewedAt: NullableString,
  reviewExpiresAt: NullableString,
  safeFailureMessage: NullableString,
  sourceUseDisposition: Type.String({ minLength: 1 }),
});

export const ProvidersListResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  providers: Type.Array(ProviderRegistryStatusViewSchema),
  nextCursor: NullableString,
});

export const ProviderDetailResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  provider: ProviderRegistryStatusViewSchema,
});

export const ObservabilityCollectorStatusViewSchema = Type.Object({
  providerId: Type.Literal("observability-captured-local"),
  providerMode: Type.Union([Type.Literal("in-memory"), Type.Literal("local-test")]),
  environmentScope: Type.Literal("local-dev"),
  healthStatus: Type.String({ minLength: 1 }),
  readinessStatus: Type.String({ minLength: 1 }),
  livenessStatus: Type.String({ minLength: 1 }),
  signalCount: Type.Number({ minimum: 0 }),
  boundedStorageLimit: Type.Number({ minimum: 1 }),
  exportEnabled: Type.Literal(false),
  liveMonitoringReadinessClaim: Type.Literal(false),
  liveMetricsBackendClaim: Type.Literal(false),
  liveLogBackendClaim: Type.Literal(false),
  liveTracingBackendClaim: Type.Literal(false),
  liveAlertingClaim: Type.Literal(false),
  siemReadinessClaim: Type.Literal(false),
  safeFailureMessage: NullableString,
});

export const ObservabilitySignalViewSchema = Type.Object({
  signalId: Type.String({ minLength: 1 }),
  signalName: Type.String({ minLength: 1 }),
  signalCategory: Type.String({ minLength: 1 }),
  signalClassification: Type.String({ minLength: 1 }),
  severity: Type.String({ minLength: 1 }),
  tenantId: Type.String({ minLength: 1 }),
  actorId: NullableString,
  serviceActorId: NullableString,
  routeId: NullableString,
  operationId: NullableString,
  capability: NullableString,
  providerId: NullableString,
  jobId: NullableString,
  workflowId: NullableString,
  notificationId: NullableString,
  fileId: NullableString,
  auditEventId: NullableString,
  correlationId: Type.String({ minLength: 1 }),
  causationId: NullableString,
  requestId: Type.String({ minLength: 1 }),
  traceId: Type.String({ minLength: 1 }),
  spanId: NullableString,
  parentSpanId: NullableString,
  environmentScope: Type.String({ minLength: 1 }),
  providerMode: Type.String({ minLength: 1 }),
  dataClassification: Type.String({ minLength: 1 }),
  tenantScope: Type.String({ minLength: 1 }),
  actorScope: Type.String({ minLength: 1 }),
  providerScope: Type.String({ minLength: 1 }),
  redactionPolicy: Type.String({ minLength: 1 }),
  cardinalityPolicy: Type.String({ minLength: 1 }),
  retentionPolicy: Type.String({ minLength: 1 }),
  accessPolicy: Type.String({ minLength: 1 }),
  createdAt: Type.String({ minLength: 1 }),
});

export const ObservabilityReadinessResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  status: Type.String({ minLength: 1 }),
  collector: ObservabilityCollectorStatusViewSchema,
  providerMode: Type.String({ minLength: 1 }),
  liveMonitoringReadinessClaim: Type.Literal(false),
  productionReadinessClaim: Type.Literal(false),
});

export const ObservabilitySignalsResponseSchema = Type.Object({
  tenantId: Type.String({ minLength: 1 }),
  signals: Type.Array(ObservabilitySignalViewSchema),
  nextCursor: NullableString,
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
