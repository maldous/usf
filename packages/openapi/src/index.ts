import {
  API_ROUTE_CONTRACTS,
  ActionResultResponseSchema,
  ApiErrorResponseSchema,
  AuditEventsResponseSchema,
  AuditEventViewSchema,
  AuditVerifyRequestSchema,
  AuditVerifyResponseSchema,
  AuthorizeCheckRequestSchema,
  AuthorizeDecisionResponseSchema,
  ConfigCurrentResponseSchema,
  FeatureFlagsResponseSchema,
  FileDownloadResponseSchema,
  FileUploadRequestSchema,
  FileVerifyResponseSchema,
  FileViewSchema,
  FilesListResponseSchema,
  HealthResponseSchema,
  JobCreateRequestSchema,
  JobCreateResponseSchema,
  JobViewSchema,
  JobsListResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  NotificationCreateRequestSchema,
  NotificationCreateResponseSchema,
  NotificationSendResponseSchema,
  NotificationTemplateCreateRequestSchema,
  NotificationTemplateResponseSchema,
  NotificationViewSchema,
  NotificationsListResponseSchema,
  ObservabilityCollectorStatusViewSchema,
  ObservabilityReadinessResponseSchema,
  ObservabilitySignalViewSchema,
  ObservabilitySignalsResponseSchema,
  PermissionsResponseSchema,
  ProviderDetailResponseSchema,
  ProviderRegistryStatusViewSchema,
  ProviderStatusResponseSchema,
  ProvidersListResponseSchema,
  ReadyResponseSchema,
  TenantActionRequestSchema,
  TenantContextResponseSchema,
  type ApiRouteContract,
} from "@foundation/contracts";

const SCHEMAS: Readonly<Record<string, unknown>> = Object.freeze({
  ActionResultResponse: ActionResultResponseSchema,
  ApiErrorResponse: ApiErrorResponseSchema,
  AuditEventsResponse: AuditEventsResponseSchema,
  AuditEventView: AuditEventViewSchema,
  AuditVerifyRequest: AuditVerifyRequestSchema,
  AuditVerifyResponse: AuditVerifyResponseSchema,
  AuthorizeCheckRequest: AuthorizeCheckRequestSchema,
  AuthorizeDecisionResponse: AuthorizeDecisionResponseSchema,
  ConfigCurrentResponse: ConfigCurrentResponseSchema,
  FeatureFlagsResponse: FeatureFlagsResponseSchema,
  FileDownloadResponse: FileDownloadResponseSchema,
  FileUploadRequest: FileUploadRequestSchema,
  FileVerifyResponse: FileVerifyResponseSchema,
  FileView: FileViewSchema,
  FilesListResponse: FilesListResponseSchema,
  HealthResponse: HealthResponseSchema,
  JobCreateRequest: JobCreateRequestSchema,
  JobCreateResponse: JobCreateResponseSchema,
  JobView: JobViewSchema,
  JobsListResponse: JobsListResponseSchema,
  LoginRequest: LoginRequestSchema,
  LoginResponse: LoginResponseSchema,
  NotificationCreateRequest: NotificationCreateRequestSchema,
  NotificationCreateResponse: NotificationCreateResponseSchema,
  NotificationSendResponse: NotificationSendResponseSchema,
  NotificationTemplateCreateRequest: NotificationTemplateCreateRequestSchema,
  NotificationTemplateResponse: NotificationTemplateResponseSchema,
  NotificationView: NotificationViewSchema,
  NotificationsListResponse: NotificationsListResponseSchema,
  ObservabilityCollectorStatusView: ObservabilityCollectorStatusViewSchema,
  ObservabilityReadinessResponse: ObservabilityReadinessResponseSchema,
  ObservabilitySignalView: ObservabilitySignalViewSchema,
  ObservabilitySignalsResponse: ObservabilitySignalsResponseSchema,
  PermissionsResponse: PermissionsResponseSchema,
  ProviderDetailResponse: ProviderDetailResponseSchema,
  ProviderRegistryStatusView: ProviderRegistryStatusViewSchema,
  ProviderStatusResponse: ProviderStatusResponseSchema,
  ProvidersListResponse: ProvidersListResponseSchema,
  ReadyResponse: ReadyResponseSchema,
  TenantActionRequest: TenantActionRequestSchema,
  TenantContextResponse: TenantContextResponseSchema,
});

const QUERY_SCHEMAS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  AuditEventsQuery: Object.freeze([
    "tenantId",
    "category",
    "eventType",
    "action",
    "outcome",
    "correlationId",
    "limit",
    "cursor",
  ]),
  FilesQuery: Object.freeze(["tenantId", "status", "limit", "cursor"]),
  ProvidersQuery: Object.freeze([
    "tenantId",
    "providerCategory",
    "providerMode",
    "readinessStatus",
    "limit",
    "cursor",
  ]),
  ObservabilitySignalsQuery: Object.freeze([
    "tenantId",
    "signalCategory",
    "severity",
    "limit",
    "cursor",
  ]),
  TenantContextQuery: Object.freeze(["tenantId"]),
});

export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Foundation Local Dev/Test API Contract Surface",
      version: "0.2.0",
      description:
        "USF foundation API contract readiness for local/dev/test proof. This is not a public API, production, deployment, gateway, or SDK readiness claim.",
    },
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    tags: domainTags(),
    paths: buildPaths(),
    components: {
      securitySchemes: {
        KeycloakBearerFuture: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Represents the USF-facing Keycloak-issued bearer contract. Local dev/test routes currently use synthetic dev identity headers; this is not a live Keycloak claim.",
        },
      },
      parameters: {
        RequestIdHeader: headerParameter(
          "X-Request-Id",
          "Optional synthetic request identifier. Generated when omitted.",
        ),
        CorrelationIdHeader: headerParameter(
          "X-Correlation-Id",
          "Optional synthetic correlation identifier. Request ID is used when omitted.",
        ),
        TraceIdHeader: headerParameter(
          "X-Trace-Id",
          "Optional synthetic trace identifier. It must not expose implementation internals.",
        ),
        DevTenantHeader: headerParameter(
          "X-Dev-Tenant-Id",
          "Local dev/test tenant context header. Future bearer/session tenant extraction is separate.",
        ),
        DevActorHeader: headerParameter(
          "X-Dev-Actor-Id",
          "Local dev/test actor identity header. Future bearer/session identity extraction is separate.",
        ),
        IdempotencyKeyHeader: headerParameter(
          "Idempotency-Key",
          "Tenant- and actor-scoped idempotency key for side-effecting routes that require it.",
        ),
      },
      schemas: SCHEMAS,
    },
    "x-usf-boundary": {
      readiness: "local-dev-test-contract-proof",
      publicApiReadinessClaim: false,
      productionReadinessClaim: false,
      externalSdkReadinessClaim: false,
      routeContractSource: "packages/contracts/src/api-surface.ts",
    },
  } as const;
}

function buildPaths() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of API_ROUTE_CONTRACTS) {
    const path = (paths[route.openapiPath] ??= {});
    path[route.method.toLowerCase()] = operationFor(route);
  }
  return paths;
}

function operationFor(route: ApiRouteContract) {
  return {
    operationId: route.openapiOperationId,
    tags: [route.owningDomain],
    summary: `${route.method} ${route.openapiPath}`,
    description: route.pdpPolicy,
    deprecated: route.deprecationStatus !== "active",
    security:
      route.authScheme === "none"
        ? []
        : [
            {
              KeycloakBearerFuture: [],
            },
          ],
    parameters: parametersFor(route),
    ...(requestBodyFor(route) ? { requestBody: requestBodyFor(route) } : {}),
    responses: responsesFor(route),
    "x-usf-route": {
      routeId: route.routeId,
      routeClassification: route.routeClassification,
      owningDomain: route.owningDomain,
      owningCapability: route.owningCapability,
      requiredAction: route.requiredAction,
      tenantScope: route.tenantScope,
      pdpPolicy: route.pdpPolicy,
      auditPolicy: route.auditPolicy,
      idempotencyPolicy: route.idempotencyPolicy,
      paginationPolicy: route.paginationPolicy,
      rateLimitPolicy: route.rateLimitPolicy,
      correlationPolicy: route.correlationPolicy,
      dataClassification: route.dataClassification,
      apiVersion: route.apiVersion,
      contractVersion: route.contractVersion,
      operationVersion: route.operationVersion,
      lifecycle: route.lifecycle,
      compatibilityPolicy: route.compatibilityPolicy,
      corsPolicy: route.corsPolicy,
      csrfPolicy: route.csrfPolicy,
      securityHeadersPolicy: route.securityHeadersPolicy,
      fieldExposurePolicy: route.fieldExposurePolicy,
      observabilityPolicy: route.observabilityPolicy,
      gatewayPolicy: route.gatewayPolicy,
      sourceUseDisposition: route.sourceUseDisposition,
      implementation: route.implementation,
    },
  };
}

function parametersFor(route: ApiRouteContract): unknown[] {
  const params: unknown[] = [
    { $ref: "#/components/parameters/RequestIdHeader" },
    { $ref: "#/components/parameters/CorrelationIdHeader" },
    { $ref: "#/components/parameters/TraceIdHeader" },
  ];
  if (route.authScheme !== "none" || route.tenantScope !== "none") {
    params.push({ $ref: "#/components/parameters/DevTenantHeader" });
    params.push({ $ref: "#/components/parameters/DevActorHeader" });
  }
  if (route.idempotencyPolicy.required) {
    params.push({ $ref: "#/components/parameters/IdempotencyKeyHeader" });
  }
  for (const name of route.openapiPath.matchAll(/\{([^}]+)\}/g)) {
    params.push({
      name: name[1],
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Opaque route path parameter.",
    });
  }
  const queryFields = route.requestSchema ? (QUERY_SCHEMAS[route.requestSchema] ?? []) : [];
  for (const field of queryFields) {
    params.push({
      name: field,
      in: "query",
      required: field === "tenantId",
      schema: { type: "string" },
      description:
        field === "cursor"
          ? "Opaque tenant-scoped cursor."
          : field === "limit"
            ? "Page size bounded by the route pagination policy."
            : "Synthetic safe query field.",
    });
  }
  return params;
}

function requestBodyFor(route: ApiRouteContract) {
  if (route.method === "GET" || !route.requestSchema || route.requestSchema in QUERY_SCHEMAS) {
    return null;
  }
  return {
    required: true,
    content: {
      "application/json": {
        schema: schemaRef(route.requestSchema),
        ...(route.examples[0]?.request === undefined ? {} : { example: route.examples[0].request }),
      },
    },
  };
}

function responsesFor(route: ApiRouteContract) {
  const responses: Record<string, unknown> = {};
  for (const [status, schema] of Object.entries(route.responseSchemas)) {
    const numeric = Number(status);
    responses[status] = {
      description:
        numeric >= 400 ? "Safe standard error envelope" : `${route.owningCapability} response`,
      headers: {
        "X-Request-Id": { schema: { type: "string" }, description: "Request identifier" },
        "X-Correlation-Id": {
          schema: { type: "string" },
          description: "Correlation identifier",
        },
        "Cache-Control": {
          schema: { type: "string" },
          description: "Sensitive responses use no-store",
        },
      },
      content: {
        "application/json": {
          schema: numeric >= 400 ? schemaRef("ApiErrorResponse") : schemaRef(schema),
          ...(numeric >= 400 ? {} : { example: route.examples[0]?.response ?? {} }),
        },
      },
    };
  }
  return responses;
}

function schemaRef(name: string) {
  if (name === "OpenApiDocument") {
    return { type: "object" };
  }
  return { $ref: `#/components/schemas/${name}` };
}

function headerParameter(name: string, description: string) {
  return {
    name,
    in: "header",
    required: name === "Idempotency-Key",
    schema: { type: "string" },
    description,
  };
}

function domainTags() {
  return [...new Set(API_ROUTE_CONTRACTS.map((route) => route.owningDomain))]
    .sort()
    .map((name) => ({ name }));
}
