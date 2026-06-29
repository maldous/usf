export const API_ROUTE_CLASSIFICATIONS = Object.freeze([
  "public",
  "authenticated",
  "tenant-scoped",
  "system-internal",
  "operator-only",
  "break-glass",
  "audit-sensitive",
  "security-sensitive",
  "health-readiness",
  "future-ui-surface",
  "deprecated",
] as const);

export type ApiRouteClassification = (typeof API_ROUTE_CLASSIFICATIONS)[number];

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRouteContract {
  readonly routeId: string;
  readonly method: ApiMethod;
  readonly path: string;
  readonly openapiPath: string;
  readonly routeClassification: ApiRouteClassification;
  readonly owningDomain: string;
  readonly owningCapability: string;
  readonly requiredAction: string | null;
  readonly tenantScope:
    | "none"
    | "tenant-header-query"
    | "tenant-header-body"
    | "tenant-header-query-param"
    | "system-internal";
  readonly authScheme: "none" | "dev-header-keycloak-bearer-future" | "service-actor";
  readonly pdpPolicy: string;
  readonly auditPolicy: string;
  readonly idempotencyPolicy: {
    readonly required: boolean;
    readonly header: "Idempotency-Key" | null;
    readonly scope: string;
    readonly window: string;
    readonly replayPolicy: string;
    readonly conflictPolicy: string;
    readonly exception: string | null;
  };
  readonly paginationPolicy: {
    readonly type: "none" | "cursor";
    readonly cursorScope: string;
    readonly defaultLimit: number | null;
    readonly maxLimit: number | null;
    readonly filterAllowList: readonly string[];
    readonly sortAllowList: readonly string[];
  };
  readonly rateLimitPolicy: string;
  readonly correlationPolicy: string;
  readonly dataClassification:
    "public" | "internal" | "confidential" | "restricted" | "security-sensitive";
  readonly requestSchema: string | null;
  readonly responseSchemas: Readonly<Record<string, string>>;
  readonly errorSchema: "ApiErrorResponse";
  readonly openapiOperationId: string;
  readonly sourceUseDisposition:
    "source-derived-rewrite" | "new-with-rationale" | "evidence-only-support";
  readonly apiVersion: "v1" | "local";
  readonly contractVersion: string;
  readonly schemaVersion: string;
  readonly operationVersion: string;
  readonly lifecycle:
    "draft" | "experimental" | "stable" | "deprecated" | "sunset" | "removed" | "internal-only";
  readonly deprecationStatus: "active" | "deprecated" | "sunset" | "removed";
  readonly sunsetAt: string | null;
  readonly replacementOperationId: string | null;
  readonly compatibilityPolicy: string;
  readonly corsPolicy: string;
  readonly csrfPolicy: string;
  readonly securityHeadersPolicy: string;
  readonly fieldExposurePolicy: string;
  readonly observabilityPolicy: string;
  readonly gatewayPolicy: string;
  readonly implementation: string;
  readonly examples: readonly ApiRouteExample[];
}

export interface ApiRouteExample {
  readonly name: string;
  readonly summary: string;
  readonly request?: unknown;
  readonly response: unknown;
}

const noIdempotency = (exception: string): ApiRouteContract["idempotencyPolicy"] =>
  Object.freeze({
    required: false,
    header: null,
    scope: "not-side-effecting",
    window: "not-applicable",
    replayPolicy: "not-applicable",
    conflictPolicy: "not-applicable",
    exception,
  });

const idempotencyRequired = (scope: string): ApiRouteContract["idempotencyPolicy"] =>
  Object.freeze({
    required: true,
    header: "Idempotency-Key",
    scope,
    window: "24h-local-dev-test",
    replayPolicy: "deterministic-safe-replay",
    conflictPolicy: "same-key-different-payload-conflict",
    exception: null,
  });

const explicitException = (exception: string): ApiRouteContract["idempotencyPolicy"] =>
  Object.freeze({
    required: false,
    header: null,
    scope: "explicit-exception",
    window: "not-applicable",
    replayPolicy: "not-applicable",
    conflictPolicy: "not-applicable",
    exception,
  });

const noPagination: ApiRouteContract["paginationPolicy"] = Object.freeze({
  type: "none",
  cursorScope: "not-applicable",
  defaultLimit: null,
  maxLimit: null,
  filterAllowList: Object.freeze([]),
  sortAllowList: Object.freeze([]),
});

const cursorPagination = (
  filterAllowList: readonly string[] = [],
): ApiRouteContract["paginationPolicy"] =>
  Object.freeze({
    type: "cursor",
    cursorScope: "tenant-scoped-opaque-cursor",
    defaultLimit: 50,
    maxLimit: 200,
    filterAllowList: Object.freeze([...filterAllowList]),
    sortAllowList: Object.freeze(["createdAt", "eventId", "fileId", "jobId", "notificationId"]),
  });

const defaultCors = "explicit-local-dev-no-wildcard-credentialed-cors";
const defaultCsrf = "browser-session-routes-deferred-no-browser-credential-state-in-this-surface";
const defaultHeaders =
  "no-store-sensitive-responses x-content-type-options-nosniff referrer-policy-no-referrer permissions-policy-minimal";
const defaultCorrelation = "x-request-id and x-correlation-id accepted; generated when missing";
const defaultGateway = "local-dev-test-only gateway-edge-waf-tls-production-posture-deferred";
const defaultCompatibility = "breaking changes require route or contract version change";

const API_BASE_ROUTE_CONTRACTS: readonly ApiRouteContract[] = Object.freeze([
  {
    routeId: "healthz.get",
    method: "GET",
    path: "/healthz",
    openapiPath: "/healthz",
    routeClassification: "health-readiness",
    owningDomain: "platform-health",
    owningCapability: "runtime-health",
    requiredAction: null,
    tenantScope: "none",
    authScheme: "none",
    pdpPolicy: "public health/readiness route; no tenant or PDP input",
    auditPolicy: "not audited; no tenant or sensitive data",
    idempotencyPolicy: noIdempotency("safe-read"),
    paginationPolicy: noPagination,
    rateLimitPolicy: "local-dev-test health probe; live edge rate limit deferred",
    correlationPolicy: defaultCorrelation,
    dataClassification: "public",
    requestSchema: null,
    responseSchemas: { "200": "HealthResponse" },
    errorSchema: "ApiErrorResponse",
    openapiOperationId: "getHealthz",
    sourceUseDisposition: "source-derived-rewrite",
    apiVersion: "local",
    contractVersion: "api-contracts-1",
    schemaVersion: "health-response-1",
    operationVersion: "1",
    lifecycle: "stable",
    deprecationStatus: "active",
    sunsetAt: null,
    replacementOperationId: null,
    compatibilityPolicy: defaultCompatibility,
    corsPolicy: defaultCors,
    csrfPolicy: defaultCsrf,
    securityHeadersPolicy: defaultHeaders,
    fieldExposurePolicy: "public runtime posture only; no internals",
    observabilityPolicy: "request_count error_count latency local counters only",
    gatewayPolicy: defaultGateway,
    implementation: "apps/api/src/server.ts",
    examples: [
      {
        name: "healthy",
        summary: "Local dev/test runtime is alive",
        response: {
          status: "ok",
          service: "foundation-api",
          providerMode: "dev in-memory",
          providerClass: "hermetic-mock",
          environment: "local",
        },
      },
    ],
  },
  {
    routeId: "readyz.get",
    method: "GET",
    path: "/readyz",
    openapiPath: "/readyz",
    routeClassification: "health-readiness",
    owningDomain: "platform-health",
    owningCapability: "runtime-readiness",
    requiredAction: null,
    tenantScope: "none",
    authScheme: "none",
    pdpPolicy: "public health/readiness route; no tenant or PDP input",
    auditPolicy: "not audited; provider modes only",
    idempotencyPolicy: noIdempotency("safe-read"),
    paginationPolicy: noPagination,
    rateLimitPolicy: "local-dev-test readiness probe; live edge rate limit deferred",
    correlationPolicy: defaultCorrelation,
    dataClassification: "public",
    requestSchema: null,
    responseSchemas: { "200": "ReadyResponse" },
    errorSchema: "ApiErrorResponse",
    openapiOperationId: "getReadyz",
    sourceUseDisposition: "source-derived-rewrite",
    apiVersion: "local",
    contractVersion: "api-contracts-1",
    schemaVersion: "ready-response-1",
    operationVersion: "1",
    lifecycle: "stable",
    deprecationStatus: "active",
    sunsetAt: null,
    replacementOperationId: null,
    compatibilityPolicy: defaultCompatibility,
    corsPolicy: defaultCors,
    csrfPolicy: defaultCsrf,
    securityHeadersPolicy: defaultHeaders,
    fieldExposurePolicy: "provider mode summary only; no credentials",
    observabilityPolicy: "request_count error_count latency local counters only",
    gatewayPolicy: defaultGateway,
    implementation: "apps/api/src/server.ts",
    examples: [
      {
        name: "ready",
        summary: "Local dev/test runtime dependencies are initialised",
        response: {
          status: "ready",
          service: "foundation-api",
          providerMode: "dev in-memory",
          providerClass: "hermetic-mock",
          environment: "local",
          providers: { identity: "hermetic-mock", jobs: "in-memory", notifications: "in-memory" },
        },
      },
    ],
  },
  {
    routeId: "openapi.get",
    method: "GET",
    path: "/openapi.json",
    openapiPath: "/openapi.json",
    routeClassification: "public",
    owningDomain: "api-contracts",
    owningCapability: "openapi-document",
    requiredAction: null,
    tenantScope: "none",
    authScheme: "none",
    pdpPolicy: "explicit public local contract document",
    auditPolicy: "not audited; contains synthetic examples only",
    idempotencyPolicy: noIdempotency("safe-read"),
    paginationPolicy: noPagination,
    rateLimitPolicy: "local-dev-test route; live edge rate limit deferred",
    correlationPolicy: defaultCorrelation,
    dataClassification: "public",
    requestSchema: null,
    responseSchemas: { "200": "OpenApiDocument" },
    errorSchema: "ApiErrorResponse",
    openapiOperationId: "getOpenApiDocument",
    sourceUseDisposition: "source-derived-rewrite",
    apiVersion: "local",
    contractVersion: "api-contracts-1",
    schemaVersion: "openapi-3.1",
    operationVersion: "1",
    lifecycle: "stable",
    deprecationStatus: "active",
    sunsetAt: null,
    replacementOperationId: null,
    compatibilityPolicy: "OpenAPI diff must be reviewed before compatibility claim changes",
    corsPolicy: defaultCors,
    csrfPolicy: defaultCsrf,
    securityHeadersPolicy: defaultHeaders,
    fieldExposurePolicy: "contract metadata and synthetic examples only",
    observabilityPolicy: "request_count error_count latency local counters only",
    gatewayPolicy: defaultGateway,
    implementation: "apps/api/src/server.ts",
    examples: [{ name: "document", summary: "OpenAPI 3.1 contract document", response: {} }],
  },
]);

const tenantReadRoutes: readonly ApiRouteContract[] = Object.freeze([
  route("tenant-context.get", "GET", "/v1/tenant-context", "getTenantContextV1", {
    domain: "tenant-context",
    capability: "tenant-context",
    action: "tenant.context.read",
    classification: "tenant-scoped",
    tenantScope: "tenant-header-query",
    requestSchema: "TenantContextQuery",
    responses: { "200": "TenantContextResponse", "400": "ApiErrorResponse" },
    audit: "records tenant.context.read when accepted",
    pdp: "tenant-context establishment route uses tenant guard; PDP applies to downstream routes",
    exampleResponse: {
      tenantId: "tenant-alpha",
      actorId: "actor-alpha",
      roles: ["tenant-admin"],
      providerMode: "dev in-memory",
      providerClass: "hermetic-mock",
      environment: "local",
      auditEvents: 1,
    },
  }),
  route("auth-login.post", "POST", "/auth/login", "postAuthLogin", {
    domain: "auth-identity",
    capability: "auth-service",
    action: "auth.login",
    classification: "public",
    tenantScope: "tenant-header-body",
    requestSchema: "LoginRequest",
    responses: { "200": "LoginResponse", "400": "ApiErrorResponse" },
    idempotency: explicitException("local hermetic login creates no live external side effect"),
    audit: "auth service records value-free login evidence",
    pdp: "login establishes identity; authorization is downstream",
    exampleRequest: { tenantId: "tenant-alpha", email: "person.example.invalid" },
    exampleResponse: {
      tenantId: "tenant-alpha",
      actorId: "actor-alpha",
      providerMode: "hermetic-mock",
      roles: ["tenant-admin"],
    },
  }),
  route("authz-check.post", "POST", "/v1/authz/check", "postAuthzCheckV1", {
    domain: "authorization",
    capability: "policy-decision-point",
    action: "authorization.check",
    classification: "security-sensitive",
    tenantScope: "tenant-header-body",
    requestSchema: "AuthorizeCheckRequest",
    responses: {
      "200": "AuthorizeDecisionResponse",
      "400": "ApiErrorResponse",
      "403": "ApiErrorResponse",
    },
    idempotency: explicitException(
      "PDP decision is a value-free check; audit-of-decision is append-only evidence",
    ),
    audit: "authorization decision is audited",
    pdp: "route calls PDP through the authorizer",
    exampleRequest: {
      tenantId: "tenant-alpha",
      action: "file.list",
      resourceType: "file",
      resourceId: "file-alpha",
    },
    exampleResponse: {
      effect: "permit",
      action: "file.list",
      reasonCode: "explicit-permit",
      obligations: [],
      policyVersion: "authz-policy-1",
    },
  }),
  route("authz-permissions.get", "GET", "/v1/authz/permissions", "getAuthzPermissionsV1", {
    domain: "authorization",
    capability: "permission-discovery",
    action: "tenant.members.read",
    classification: "tenant-scoped",
    tenantScope: "tenant-header-query",
    requestSchema: "TenantContextQuery",
    responses: {
      "200": "PermissionsResponse",
      "400": "ApiErrorResponse",
      "403": "ApiErrorResponse",
    },
    audit: "permission discovery denial is audited through PDP",
    pdp: "route authorizes tenant.members.read before returning permissions",
    exampleResponse: {
      tenantId: "tenant-alpha",
      actorId: "actor-alpha",
      active: true,
      permissions: ["audit.read", "file.list"],
    },
  }),
]);

export const API_ROUTE_CONTRACTS: readonly ApiRouteContract[] = Object.freeze([
  ...API_BASE_ROUTE_CONTRACTS,
  ...tenantReadRoutes,
  ...auditRoutes(),
  ...configRoutes(),
  ...providerRoutes(),
  ...observabilityRoutes(),
  ...fileRoutes(),
  ...jobRoutes(),
  ...notificationRoutes(),
]);

export function apiRouteById(routeId: string): ApiRouteContract | undefined {
  return API_ROUTE_CONTRACTS.find((route) => route.routeId === routeId);
}

function route(
  routeId: string,
  method: ApiMethod,
  path: string,
  operationId: string,
  input: {
    domain: string;
    capability: string;
    action: string | null;
    classification: ApiRouteClassification;
    tenantScope: ApiRouteContract["tenantScope"];
    requestSchema: string | null;
    responses: Readonly<Record<string, string>>;
    idempotency?: ApiRouteContract["idempotencyPolicy"];
    pagination?: ApiRouteContract["paginationPolicy"];
    audit: string;
    pdp: string;
    dataClassification?: ApiRouteContract["dataClassification"];
    lifecycle?: ApiRouteContract["lifecycle"];
    exampleRequest?: unknown;
    exampleResponse: unknown;
  },
): ApiRouteContract {
  return Object.freeze({
    routeId,
    method,
    path,
    openapiPath: path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, "{$1}"),
    routeClassification: input.classification,
    owningDomain: input.domain,
    owningCapability: input.capability,
    requiredAction: input.action,
    tenantScope: input.tenantScope,
    authScheme:
      input.classification === "public" || input.classification === "health-readiness"
        ? "none"
        : "dev-header-keycloak-bearer-future",
    pdpPolicy: input.pdp,
    auditPolicy: input.audit,
    idempotencyPolicy: input.idempotency ?? noIdempotency("safe-read"),
    paginationPolicy: input.pagination ?? noPagination,
    rateLimitPolicy: "local-dev-test quotas represented; live enforcement deferred",
    correlationPolicy: defaultCorrelation,
    dataClassification: input.dataClassification ?? "confidential",
    requestSchema: input.requestSchema,
    responseSchemas: input.responses,
    errorSchema: "ApiErrorResponse",
    openapiOperationId: operationId,
    sourceUseDisposition: "source-derived-rewrite",
    apiVersion: path.startsWith("/v1/") ? "v1" : "local",
    contractVersion: "api-contracts-1",
    schemaVersion: `${routeId}-schema-1`,
    operationVersion: "1",
    lifecycle: input.lifecycle ?? "experimental",
    deprecationStatus: "active",
    sunsetAt: null,
    replacementOperationId: null,
    compatibilityPolicy: defaultCompatibility,
    corsPolicy: defaultCors,
    csrfPolicy: defaultCsrf,
    securityHeadersPolicy: defaultHeaders,
    fieldExposurePolicy: "minimum necessary fields; sensitive internals redacted",
    observabilityPolicy:
      "tenant-safe request_count error_count validation_failure_count auth_denial_count",
    gatewayPolicy: defaultGateway,
    implementation: "apps/api/src/server.ts",
    examples: Object.freeze([
      {
        name: "synthetic",
        summary: "Synthetic safe example",
        ...(input.exampleRequest === undefined ? {} : { request: input.exampleRequest }),
        response: input.exampleResponse,
      },
    ]),
  });
}

function auditRoutes(): readonly ApiRouteContract[] {
  return Object.freeze([
    route("audit-events.list", "GET", "/v1/audit/events", "getAuditEventsV1", {
      domain: "audit-evidence",
      capability: "audit-query",
      action: "audit.search",
      classification: "audit-sensitive",
      tenantScope: "tenant-header-query",
      requestSchema: "AuditEventsQuery",
      responses: {
        "200": "AuditEventsResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      pagination: cursorPagination(["category", "eventType", "action", "outcome", "correlationId"]),
      audit: "audit query is itself audited",
      pdp: "audit query service calls PDP",
      exampleResponse: { tenantId: "tenant-alpha", events: [], nextCursor: null },
    }),
    route("audit-events.get", "GET", "/v1/audit/events/:id", "getAuditEventByIdV1", {
      domain: "audit-evidence",
      capability: "audit-query",
      action: "audit.read",
      classification: "audit-sensitive",
      tenantScope: "tenant-header-query-param",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "AuditEventView",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
      },
      audit: "audit read is itself audited",
      pdp: "audit query service calls PDP",
      exampleResponse: safeAuditEventExample(),
    }),
    route("audit-verify.post", "POST", "/v1/audit/verify", "postAuditVerifyV1", {
      domain: "audit-evidence",
      capability: "audit-integrity-verifier",
      action: "audit.verify",
      classification: "audit-sensitive",
      tenantScope: "tenant-header-body",
      requestSchema: "AuditVerifyRequest",
      responses: {
        "200": "AuditVerifyResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      idempotency: explicitException(
        "verification is side-effect-free except value-free audit-of-access evidence",
      ),
      audit: "verification request is audited",
      pdp: "audit query service calls PDP",
      exampleRequest: { tenantId: "tenant-alpha" },
      exampleResponse: {
        ok: true,
        chainScope: "tenant-alpha",
        count: 1,
        verifiedAt: "2026-01-01T00:00:00.000Z",
        brokenAtSequence: null,
        reason: null,
      },
    }),
  ]);
}

function configRoutes(): readonly ApiRouteContract[] {
  return Object.freeze([
    route("config-current.get", "GET", "/v1/config/current", "getConfigCurrentV1", {
      domain: "config-secrets",
      capability: "config-service",
      action: "config.read",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "ConfigCurrentResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      audit: "config service records value-free config access",
      pdp: "config service calls PDP",
      exampleResponse: {
        tenantId: "tenant-alpha",
        schemaVersion: "config-1",
        config: { "environment.name": "local-dev" },
      },
    }),
    route("config-flags.get", "GET", "/v1/config/feature-flags", "getConfigFeatureFlagsV1", {
      domain: "config-secrets",
      capability: "feature-flag-service",
      action: "config.read",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "FeatureFlagsResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      audit: "feature flag access uses config controls",
      pdp: "config service calls PDP",
      exampleResponse: { tenantId: "tenant-alpha", flags: { "audit-retrieval-ui": true } },
    }),
    route(
      "config-provider-status.get",
      "GET",
      "/v1/config/provider-status",
      "getConfigProviderStatusV1",
      {
        domain: "config-secrets",
        capability: "provider-status",
        action: "config.read",
        classification: "security-sensitive",
        tenantScope: "tenant-header-query",
        requestSchema: "TenantContextQuery",
        responses: {
          "200": "ProviderStatusResponse",
          "400": "ApiErrorResponse",
          "403": "ApiErrorResponse",
        },
        audit: "provider mode read is controlled by config read",
        pdp: "tenant guard plus config read posture; provider credentials never exposed",
        exampleResponse: {
          tenantId: "tenant-alpha",
          providerMode: "dev in-memory",
          providers: { notifications: "in-memory" },
        },
      },
    ),
  ]);
}

function providerStatusExample() {
  return {
    providerId: "notification-delivery-in-memory",
    providerName: "In-memory notification delivery provider",
    providerCategory: "notification-delivery",
    providerMode: "in-memory",
    owningCapability: "notifications-messaging",
    owningTeamOrRole: "platform-operator",
    businessPurpose: "Hermetic notification delivery capture and evidence proof.",
    dataClassification: "restricted",
    tenantScope: "tenant-scoped",
    environmentScope: "local-dev",
    lifecycleState: "approved-for-local-test",
    riskClassification: "security-sensitive",
    criticality: "medium",
    healthStatus: "healthy",
    readinessStatus: "healthy",
    livenessStatus: "healthy",
    capabilityStatus: "healthy",
    providerRegion: "local-dev",
    dataResidencyStatus: "local-dev-test",
    egressAllowed: false,
    tlsRequired: false,
    credentialPosture: "secret-reference-present",
    endpointPosture: "none",
    driftStatus: "deferred",
    resiliencePosture: "bounded-local-dev-test",
    failoverPosture: "no-dr-readiness-claim-without-proof",
    supplierPosture: "not-applicable-local-dev-test",
    liveReadinessClaim: false,
    productionReadinessClaim: false,
    lastReviewedAt: null,
    reviewExpiresAt: null,
    safeFailureMessage: null,
    sourceUseDisposition: "source-derived-rewrite",
  };
}

function providerRoutes(): readonly ApiRouteContract[] {
  return Object.freeze([
    route("providers.list", "GET", "/v1/providers", "listProvidersV1", {
      domain: "provider-adapters",
      capability: "provider-registry",
      action: "provider.list",
      classification: "operator-only",
      tenantScope: "tenant-header-query",
      requestSchema: "ProvidersQuery",
      responses: {
        "200": "ProvidersListResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      pagination: cursorPagination(["providerCategory", "providerMode", "readinessStatus"]),
      audit:
        "provider status access is PDP guarded and value-free; audit-of-access posture is represented",
      pdp: "operator/security-admin provider.list permission required; provider credentials and endpoints never exposed",
      dataClassification: "security-sensitive",
      exampleResponse: {
        tenantId: "tenant-alpha",
        providers: [providerStatusExample()],
        nextCursor: null,
      },
    }),
    route("providers.get", "GET", "/v1/providers/:id", "getProviderByIdV1", {
      domain: "provider-adapters",
      capability: "provider-registry",
      action: "provider.read",
      classification: "operator-only",
      tenantScope: "tenant-header-query-param",
      requestSchema: "ProvidersQuery",
      responses: {
        "200": "ProviderDetailResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
      },
      audit: "provider detail access is PDP guarded and value-free",
      pdp: "operator/security-admin provider.read permission required; non-enumerating safe errors",
      dataClassification: "security-sensitive",
      exampleResponse: { tenantId: "tenant-alpha", provider: providerStatusExample() },
    }),
  ]);
}

function observabilityCollectorExample() {
  return {
    providerId: "observability-captured-local",
    providerMode: "in-memory",
    environmentScope: "local-dev",
    healthStatus: "healthy",
    readinessStatus: "healthy",
    livenessStatus: "healthy",
    signalCount: 1,
    boundedStorageLimit: 500,
    exportEnabled: false,
    liveMonitoringReadinessClaim: false,
    liveMetricsBackendClaim: false,
    liveLogBackendClaim: false,
    liveTracingBackendClaim: false,
    liveAlertingClaim: false,
    siemReadinessClaim: false,
    safeFailureMessage: null,
  };
}

function observabilitySignalExample() {
  return {
    signalId: "sig-alpha",
    signalName: "api.request.count",
    signalCategory: "metric",
    signalClassification: "performance",
    severity: "info",
    tenantId: "tenant-alpha",
    actorId: "actor-alpha",
    serviceActorId: null,
    routeId: "tenant-context.get",
    operationId: "getTenantContext",
    capability: "tenant-context",
    providerId: null,
    jobId: null,
    workflowId: null,
    notificationId: null,
    fileId: null,
    auditEventId: null,
    correlationId: "corr-alpha",
    causationId: null,
    requestId: "req-alpha",
    traceId: "trace-alpha",
    spanId: "span-alpha",
    parentSpanId: null,
    environmentScope: "local-dev",
    providerMode: "in-memory",
    dataClassification: "confidential",
    tenantScope: "tenant-scoped",
    actorScope: "actor-scoped",
    providerScope: "none",
    redactionPolicy: "redact-before-persistence-and-api-exposure",
    cardinalityPolicy: "metric-label-allow-list-and-high-cardinality-deny",
    retentionPolicy: "local-dev-test-30-days",
    accessPolicy: "pdp-protected-for-non-public-observability-access",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function observabilityRoutes(): readonly ApiRouteContract[] {
  return Object.freeze([
    route(
      "observability-readiness.get",
      "GET",
      "/v1/observability/readiness",
      "getObservabilityReadinessV1",
      {
        domain: "observability-telemetry",
        capability: "telemetry-collector",
        action: "observability.readiness.read",
        classification: "operator-only",
        tenantScope: "tenant-header-query",
        requestSchema: "TenantContextQuery",
        responses: {
          "200": "ObservabilityReadinessResponse",
          "400": "ApiErrorResponse",
          "403": "ApiErrorResponse",
        },
        audit: "observability readiness access is PDP guarded and audit-recorded value-free",
        pdp: "operator/security-admin observability.readiness.read permission required; readiness is redacted and does not imply live monitoring",
        dataClassification: "security-sensitive",
        exampleResponse: {
          tenantId: "tenant-alpha",
          status: "ready-local-dev-test",
          collector: observabilityCollectorExample(),
          providerMode: "in-memory",
          liveMonitoringReadinessClaim: false,
          productionReadinessClaim: false,
        },
      },
    ),
    route(
      "observability-signals.list",
      "GET",
      "/v1/observability/signals",
      "listObservabilitySignalsV1",
      {
        domain: "observability-telemetry",
        capability: "telemetry-collector",
        action: "observability.signal.read",
        classification: "operator-only",
        tenantScope: "tenant-header-query",
        requestSchema: "ObservabilitySignalsQuery",
        responses: {
          "200": "ObservabilitySignalsResponse",
          "400": "ApiErrorResponse",
          "403": "ApiErrorResponse",
        },
        pagination: cursorPagination(["signalCategory", "severity"]),
        audit: "observability signal access is PDP guarded and audit-recorded value-free",
        pdp: "operator/security-admin observability.signal.read permission required; tenant query cannot cross tenant boundaries",
        dataClassification: "security-sensitive",
        exampleResponse: {
          tenantId: "tenant-alpha",
          signals: [observabilitySignalExample()],
          nextCursor: null,
        },
      },
    ),
  ]);
}

function fileRoutes(): readonly ApiRouteContract[] {
  return Object.freeze([
    route("files.list", "GET", "/v1/files", "listFilesV1", {
      domain: "files-storage",
      capability: "file-service",
      action: "file.list",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query",
      requestSchema: "FilesQuery",
      responses: {
        "200": "FilesListResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      pagination: cursorPagination(["status"]),
      audit: "file list audited by file service",
      pdp: "file service calls PDP",
      exampleResponse: { tenantId: "tenant-alpha", files: [], nextCursor: null },
    }),
    route("files.upload", "POST", "/v1/files", "uploadFileV1", {
      domain: "files-storage",
      capability: "file-service",
      action: "file.create",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-body",
      requestSchema: "FileUploadRequest",
      responses: { "200": "FileView", "400": "ApiErrorResponse", "403": "ApiErrorResponse" },
      idempotency: explicitException(
        "caller supplied fileId is the current dev/test idempotency basis; dedicated header persistence deferred to files depth",
      ),
      audit: "file upload lifecycle audited by file service",
      pdp: "file service calls PDP",
      exampleRequest: {
        tenantId: "tenant-alpha",
        fileId: "file-alpha",
        filename: "report.txt",
        contentType: "text/plain",
        sizeBytes: 5,
        body: "hello",
      },
      exampleResponse: fileViewExample(),
    }),
    route("files.get", "GET", "/v1/files/:id", "getFileV1", {
      domain: "files-storage",
      capability: "file-service",
      action: "file.read",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query-param",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "FileView",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
      },
      audit: "file read audited by file service",
      pdp: "file service calls PDP",
      exampleResponse: fileViewExample(),
    }),
    route("files.download", "POST", "/v1/files/:id/download", "downloadFileV1", {
      domain: "files-storage",
      capability: "file-service",
      action: "file.download",
      classification: "security-sensitive",
      tenantScope: "tenant-header-query-param",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "FileDownloadResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      idempotency: explicitException(
        "read-like download is scan/PDP gated and does not mutate external state",
      ),
      audit: "download audited by file service",
      pdp: "file service calls PDP and scan/lifecycle gate",
      exampleResponse: {
        fileId: "file-alpha",
        contentType: "text/plain",
        sizeBytes: 5,
        body: "hello",
      },
    }),
    route("files.verify", "POST", "/v1/files/:id/verify", "verifyFileV1", {
      domain: "files-storage",
      capability: "file-integrity",
      action: "file.read",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query-param",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "FileVerifyResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      idempotency: explicitException(
        "integrity verification is side-effect-free except value-free audit evidence",
      ),
      audit: "file verification audited by file service",
      pdp: "file service calls PDP",
      exampleResponse: { fileId: "file-alpha", ok: true, reasonCode: "ok" },
    }),
  ]);
}

function jobRoutes(): readonly ApiRouteContract[] {
  return Object.freeze([
    route("jobs.list", "GET", "/v1/jobs", "listJobsV1", {
      domain: "jobs-workflows",
      capability: "job-service",
      action: "job.list",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "JobsListResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      pagination: cursorPagination(["status", "jobType"]),
      audit: "job service emits lifecycle audit; list is PDP gated",
      pdp: "job service calls PDP",
      exampleResponse: { tenantId: "tenant-alpha", jobs: [], nextCursor: null },
    }),
    route("jobs.create", "POST", "/v1/jobs", "createJobV1", {
      domain: "jobs-workflows",
      capability: "job-service",
      action: "job.create",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-body",
      requestSchema: "JobCreateRequest",
      responses: {
        "200": "JobCreateResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "409": "ApiErrorResponse",
      },
      idempotency: idempotencyRequired("tenant+actor+route+jobType"),
      audit: "job.create audited by job service",
      pdp: "job service calls PDP",
      exampleRequest: {
        tenantId: "tenant-alpha",
        classification: "operational-automation-job",
        jobType: "api-contract-proof",
        payloadRefs: { ref: "synthetic" },
      },
      exampleResponse: { tenantId: "tenant-alpha", deduplicated: false, job: jobViewExample() },
    }),
    route("jobs.get", "GET", "/v1/jobs/:id", "getJobV1", {
      domain: "jobs-workflows",
      capability: "job-service",
      action: "job.read",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query-param",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "JobView",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
      },
      audit: "job read is PDP gated and value-free",
      pdp: "job service calls PDP",
      exampleResponse: jobViewExample(),
    }),
    route("jobs.cancel", "POST", "/v1/jobs/:id/cancel", "cancelJobV1", {
      domain: "jobs-workflows",
      capability: "job-service",
      action: "job.cancel",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-body",
      requestSchema: "TenantActionRequest",
      responses: {
        "200": "ActionResultResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
      },
      idempotency: idempotencyRequired("tenant+actor+route+jobId"),
      audit: "job.cancel audited by job service",
      pdp: "job service calls PDP",
      exampleRequest: { tenantId: "tenant-alpha" },
      exampleResponse: { ok: true, reasonCode: "cancelled" },
    }),
  ]);
}

function notificationRoutes(): readonly ApiRouteContract[] {
  return Object.freeze([
    route(
      "notification-templates.create",
      "POST",
      "/v1/notification-templates",
      "createNotificationTemplateV1",
      {
        domain: "notifications-messaging",
        capability: "notification-template-service",
        action: "notification.template.create",
        classification: "tenant-scoped",
        tenantScope: "tenant-header-body",
        requestSchema: "NotificationTemplateCreateRequest",
        responses: {
          "200": "NotificationTemplateResponse",
          "400": "ApiErrorResponse",
          "403": "ApiErrorResponse",
        },
        idempotency: explicitException(
          "templateId plus version is the current immutable content identity; dedicated replay store deferred",
        ),
        audit: "template creation audited by notification capability",
        pdp: "notification capability calls PDP",
        exampleRequest: notificationTemplateRequestExample(),
        exampleResponse: notificationTemplateResponseExample(),
      },
    ),
    route("notifications.list", "GET", "/v1/notifications", "listNotificationsV1", {
      domain: "notifications-messaging",
      capability: "notification-service",
      action: "notification.list",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "NotificationsListResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      pagination: cursorPagination(["channel", "classification", "deliveryStatus"]),
      audit: "notification list is PDP gated",
      pdp: "notification capability calls PDP",
      exampleResponse: { tenantId: "tenant-alpha", notifications: [], nextCursor: null },
    }),
    route("notifications.create", "POST", "/v1/notifications", "createNotificationV1", {
      domain: "notifications-messaging",
      capability: "notification-service",
      action: "notification.create",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-body",
      requestSchema: "NotificationCreateRequest",
      responses: {
        "200": "NotificationCreateResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
      },
      idempotency: explicitException(
        "notification idempotency is computed from tenant, recipient, channel, template, and correlation; submit replay store deferred",
      ),
      audit: "notification.created audited by notification capability",
      pdp: "notification capability calls PDP",
      exampleRequest: notificationCreateRequestExample(),
      exampleResponse: { notification: notificationViewExample() },
    }),
    route("notifications.get", "GET", "/v1/notifications/:id", "getNotificationV1", {
      domain: "notifications-messaging",
      capability: "notification-service",
      action: "notification.read",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-query-param",
      requestSchema: "TenantContextQuery",
      responses: {
        "200": "NotificationView",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
      },
      audit: "notification.read audited by notification capability",
      pdp: "notification capability calls PDP",
      exampleResponse: notificationViewExample(),
    }),
    route("notifications.send", "POST", "/v1/notifications/:id/send", "sendNotificationV1", {
      domain: "notifications-messaging",
      capability: "notification-delivery-job",
      action: "notification.send",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-body",
      requestSchema: "TenantActionRequest",
      responses: {
        "200": "NotificationSendResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
        "409": "ApiErrorResponse",
      },
      idempotency: idempotencyRequired("tenant+recipient+channel+templateVersion+notificationId"),
      audit: "notification.queued audited and job.create audited",
      pdp: "notification capability and job service call PDP",
      exampleRequest: { tenantId: "tenant-alpha" },
      exampleResponse: {
        notification: notificationViewExample(),
        jobId: "job-alpha",
        deduplicated: false,
      },
    }),
    route("notifications.cancel", "POST", "/v1/notifications/:id/cancel", "cancelNotificationV1", {
      domain: "notifications-messaging",
      capability: "notification-service",
      action: "notification.cancel",
      classification: "tenant-scoped",
      tenantScope: "tenant-header-body",
      requestSchema: "TenantActionRequest",
      responses: {
        "200": "ActionResultResponse",
        "400": "ApiErrorResponse",
        "403": "ApiErrorResponse",
        "404": "ApiErrorResponse",
      },
      idempotency: idempotencyRequired("tenant+actor+route+notificationId"),
      audit: "notification.cancelled audited by notification capability",
      pdp: "notification capability calls PDP",
      exampleRequest: { tenantId: "tenant-alpha" },
      exampleResponse: { ok: true, reasonCode: "cancelled" },
    }),
  ]);
}

function safeAuditEventExample(): Record<string, unknown> {
  return {
    eventId: "evt-alpha",
    eventType: "authorization.decision",
    eventVersion: "1",
    category: "authorization",
    severity: "info",
    occurredAt: "2026-01-01T00:00:00.000Z",
    recordedAt: "2026-01-01T00:00:00.000Z",
    actorId: "actor-alpha",
    actorType: "human",
    tenantId: "tenant-alpha",
    scopeType: "tenant",
    action: "file.list",
    subjectType: "file",
    subjectId: "file-alpha",
    resourceType: "file",
    resourceId: "file-alpha",
    outcome: "success",
    reasonCode: "explicit-permit",
    policyVersion: "authz-policy-1",
    decisionId: "decision-alpha",
    correlationId: "corr-alpha",
    causationId: null,
    traceId: null,
    dataClassification: "confidential",
    retentionPolicy: "audit",
    legalHold: false,
    sequence: 1,
    eventHash: "hash-alpha",
    verificationStatus: "verified",
    metadata: {},
  };
}

function fileViewExample(): Record<string, unknown> {
  return {
    fileId: "file-alpha",
    tenantId: "tenant-alpha",
    ownerActorId: "actor-alpha",
    filenameSafe: "report.txt",
    contentType: "text/plain",
    sizeBytes: 5,
    checksumSha256: null,
    status: "available",
    scanStatus: "clean",
    classification: "confidential",
    legalHold: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    verificationStatus: "verified",
  };
}

function jobViewExample(): Record<string, unknown> {
  return {
    jobId: "job-alpha",
    tenantId: "tenant-alpha",
    classification: "operational-automation-job",
    jobType: "api-contract-proof",
    status: "queued",
    attempt: 0,
    maxRetries: 3,
    failureClass: null,
    safeFailureMessage: null,
    createdAt: 1767225600,
  };
}

function notificationViewExample(): Record<string, unknown> {
  return {
    notificationId: "ntf-alpha",
    tenantId: "tenant-alpha",
    recipientId: "recipient-alpha",
    recipientType: "user",
    recipientAddressHash: "addrhash_alpha",
    channel: "test",
    classification: "test",
    templateId: "template-alpha",
    templateVersion: "1",
    templateHash: "templatehash-alpha",
    deliveryStatus: "queued",
    providerMode: "in-memory",
    providerRef: "notify-in-memory",
    providerMessageId: null,
    idempotencyKey: "idem-alpha",
    retryCount: 0,
    maxRetries: 3,
    failureReasonCode: null,
    safeFailureMessage: null,
    dataClassification: "internal",
    retentionPolicy: "notification-evidence",
    legalHold: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function notificationTemplateRequestExample(): Record<string, unknown> {
  return {
    tenantId: "tenant-alpha",
    templateId: "template-alpha",
    templateKey: "api-contract-proof",
    templateVersion: "1",
    templateClassification: "test",
    subjectTemplate: "Hello {{displayName}}",
    bodyTemplate: "Synthetic body for {{displayName}}",
    allowedVariables: [{ name: "displayName", required: true, dataClassification: "internal" }],
  };
}

function notificationTemplateResponseExample(): Record<string, unknown> {
  return {
    templateId: "template-alpha",
    templateKey: "api-contract-proof",
    templateVersion: "1",
    templateHash: "templatehash-alpha",
    templateStatus: "approved",
    templateClassification: "test",
    allowedChannels: ["test"],
    allowedNotificationClasses: ["test"],
  };
}

function notificationCreateRequestExample(): Record<string, unknown> {
  return {
    tenantId: "tenant-alpha",
    templateId: "template-alpha",
    channel: "test",
    classification: "test",
    recipient: {
      recipientId: "recipient-alpha",
      recipientActorId: "actor-alpha",
      recipientTenantId: "tenant-alpha",
      recipientType: "user",
      addressRef: "addr-ref-alpha",
      addressType: "test",
      addressVerified: true,
      addressStatus: "active",
      addressSource: "synthetic-fixture",
      addressLastVerifiedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}
