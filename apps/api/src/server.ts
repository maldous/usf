import {
  ActionResultResponseSchema,
  AuditEventsResponseSchema,
  AuditEventViewSchema,
  AuditVerifyRequestSchema,
  AuditVerifyResponseSchema,
  AuthorizeCheckRequestSchema,
  AuthorizeDecisionResponseSchema,
  ConfigCurrentResponseSchema,
  ErrorResponseSchema,
  FeatureFlagsResponseSchema,
  FileDownloadResponseSchema,
  FilesListResponseSchema,
  FileUploadRequestSchema,
  FileVerifyResponseSchema,
  FileViewSchema,
  ForbiddenResponseSchema,
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
  ObservabilityReadinessResponseSchema,
  ObservabilitySignalsResponseSchema,
  PermissionsResponseSchema,
  ProviderDetailResponseSchema,
  ProviderStatusResponseSchema,
  ProvidersListResponseSchema,
  ReadyResponseSchema,
  TenantActionRequestSchema,
  TenantContextResponseSchema,
} from "@foundation/contracts";
import {
  DEFAULT_NOTIFICATION_BACKOFF,
  FileValidationError,
  JOB_CLASSIFICATIONS,
  NOTIFICATION_CLASSIFICATIONS,
  NOTIFICATION_CHANNELS,
  TenantMismatchError,
  createAuditRecord,
  findProvider,
  opaqueHash,
  providerStatusViews,
  stableId,
  toSafeJobView,
  toSafeProviderStatus,
  type GuardrailDecision,
  type TelemetrySignal,
  type AuditCategory,
  type AuditEventOutcome,
  type AuthorizationRequest,
  type IdentityClaims,
  type JobClassification,
  type NotificationChannel,
  type NotificationClassification,
  type NotificationRecipient,
  type NotificationTemplateVariableDefinition,
  type TenantContext,
} from "@foundation/core";
import { AuditAccessDeniedError, toSafeAuditEventView } from "@foundation/capability-audit";
import { FEATURE_FLAG_REGISTRY } from "@foundation/capability-config";
import { FileAccessDeniedError } from "@foundation/capability-files";
import {
  contextFromClaims,
  permissionsForRoles,
  requireRequestTenant,
} from "@foundation/capability-tenant";
import type { AuditAccessContext } from "@foundation/capability-audit";
import type { AuditQueryCriteria } from "@foundation/ports";
import { buildOpenApiDocument } from "@foundation/openapi";
import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { createDevRuntime, type DevRuntime } from "./runtime.ts";

export interface BuildApiOptions {
  readonly runtime?: DevRuntime;
}

function firstHeaderValue(request: FastifyRequest, name: string): string {
  const value = request.headers[name];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

interface ApiRequestIds {
  readonly requestId: string;
  readonly correlationId: string;
  readonly traceId: string | null;
}

const REQUEST_IDS = new WeakMap<FastifyRequest, ApiRequestIds>();

function idsFor(request: FastifyRequest): ApiRequestIds {
  const existing = REQUEST_IDS.get(request);
  if (existing) return existing;
  const requestId = firstHeaderValue(request, "x-request-id") || randomUUID();
  const correlationId = firstHeaderValue(request, "x-correlation-id") || requestId;
  const traceId = firstHeaderValue(request, "x-trace-id") || null;
  const ids = Object.freeze({ requestId, correlationId, traceId });
  REQUEST_IDS.set(request, ids);
  return ids;
}

function apiError(
  request: FastifyRequest,
  status: number,
  code: string,
  reasonCode: string,
  safeMessage: string,
  details: ReadonlyArray<{ path: string; code: string; safe_message: string }> = [],
  retryAfter: string | null = null,
) {
  const ids = idsFor(request);
  return {
    error: safeMessage,
    error_id: stableId("err", [ids.requestId, String(status), code, reasonCode]),
    status,
    code,
    reason_code: reasonCode,
    reasonCode,
    safe_message: safeMessage,
    correlation_id: ids.correlationId,
    request_id: ids.requestId,
    trace_id: ids.traceId,
    ...(details.length ? { details: [...details] } : {}),
    documentation_ref: null,
    retry_after: retryAfter,
  };
}

function sendError(
  request: FastifyRequest,
  reply: { code(statusCode: number): unknown },
  status: number,
  code: string,
  reasonCode: string,
  safeMessage: string,
) {
  reply.code(status);
  return apiError(request, status, code, reasonCode, safeMessage);
}

function safeErrorMessage(value: unknown): string {
  const raw = typeof value === "string" && value.trim() ? value.trim() : "Request failed";
  if (
    /(password|secret|token|api_key|authorization|cookie|private_key|connection_string|credential|bearer|jwt|object_key)/i.test(
      raw,
    )
  ) {
    return "Request failed";
  }
  return raw;
}

function tenantContextFromRequest(request: FastifyRequest): TenantContext {
  try {
    return contextFromClaims(devClaimsFromRequest(request), "local");
  } catch {
    const error = new Error("missing or invalid tenant context") as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }
}

function tenantMismatch(request: FastifyRequest, reply: { code(statusCode: number): unknown }) {
  return sendError(
    request,
    reply,
    400,
    "tenant_context_mismatch",
    "tenant-context-mismatch",
    "tenant context mismatch",
  );
}

async function ensurePermission(
  runtime: DevRuntime,
  context: TenantContext,
  action: string,
  resourceType: string,
  resourceId: string,
  resourceTenantId = context.tenantId,
): Promise<string | null> {
  const decision = await runtime.authorizer.authorize({
    context,
    action,
    resource: { type: resourceType, id: resourceId, tenantId: resourceTenantId, attributes: {} },
    requestContext: {
      correlation_id: stableId("corr", [context.tenantId, context.actorId, action]),
    },
  });
  return decision.effect === "permit" ? null : decision.reasonCode;
}

function requireIdempotencyKey(request: FastifyRequest): string | null {
  const key = firstHeaderValue(request, "idempotency-key");
  return key.trim() || null;
}

function devClaimsFromRequest(request: FastifyRequest): IdentityClaims {
  const tenantId = firstHeaderValue(request, "x-dev-tenant-id");
  const actorId = firstHeaderValue(request, "x-dev-actor-id") || "dev-actor";
  const email = firstHeaderValue(request, "x-dev-email") || `${actorId}@example.test`;
  const rolesHeader = firstHeaderValue(request, "x-dev-roles");
  const roles = rolesHeader
    ? rolesHeader
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
    : ["tenant-admin"];
  return {
    subject: actorId,
    tenantId,
    email,
    roles: Object.freeze(roles),
    providerMode: "hermetic-mock",
  };
}

function accessFrom(request: FastifyRequest): AuditAccessContext {
  const { requestId, correlationId, traceId } = idsFor(request);
  return {
    requestId,
    correlationId,
    ...(traceId ? { traceId } : {}),
  };
}

function guardrailErrorCode(decision: GuardrailDecision): string {
  if (decision.httpStatus === 429) return "rate_limit_exceeded";
  if (decision.httpStatus === 409) return "quota_conflict";
  if (decision.httpStatus === 503) return "backpressure_applied";
  return "policy_denied";
}

function guardrailAuditEventType(decision: GuardrailDecision): string {
  if (decision.reasonCode === "policy-unknown-denied") return "guardrail.policy.unknown_denied";
  if (decision.reasonCode === "quota-exceeded") return "guardrail.quota.exceeded";
  if (decision.reasonCode === "backpressure-applied") return "guardrail.backpressure.applied";
  if (decision.reasonCode === "policy-denied") return "guardrail.admission.denied";
  return "guardrail.limit.exceeded";
}

function guardrailSignalName(decision: GuardrailDecision): string {
  if (decision.reasonCode === "quota-exceeded") return "quota.exceeded";
  if (decision.reasonCode === "backpressure-applied") return "backpressure.applied";
  if (decision.reasonCode === "policy-unknown-denied") return "guardrail.policy.unknown_denied";
  if (decision.reasonCode === "policy-denied") return "admission.denied";
  return "rate_limit.exceeded";
}

async function recordGuardrailDenial(
  runtime: DevRuntime,
  context: TenantContext,
  request: FastifyRequest,
  decision: GuardrailDecision,
): Promise<void> {
  const ids = idsFor(request);
  runtime.observability.recordSecuritySignal({
    eventName: guardrailSignalName(decision),
    severity: "security",
    reasonCode: decision.reasonCode,
    safeSummary: decision.safeMessage,
    attributes: {
      policy_id: decision.policyId,
      policy_type: decision.policyType,
      scope: decision.scope,
      route_id: decision.routeId ?? "unknown",
      operation_id: decision.operationId ?? "unknown",
    },
    context: {
      tenantId: context.tenantId,
      actorId: context.actorId,
      routeId: decision.routeId ?? "unknown",
      operationId: decision.operationId ?? "unknown",
      capability: "guardrails",
      requestId: ids.requestId,
      correlationId: ids.correlationId,
      traceId: ids.traceId ?? ids.correlationId,
    },
  });
  await runtime.auditRecorder.record({
    eventId: stableId("audit", [ids.requestId, decision.decisionId, "guardrail"]),
    eventType: guardrailAuditEventType(decision),
    tenantId: context.tenantId,
    actorId: context.actorId,
    action: "guardrail.policy.evaluated",
    outcome: "denied",
    subjectType: "actor",
    subjectId: decision.subjectRef,
    resourceType: "guardrail-policy",
    resourceId: decision.policyId,
    reasonCode: decision.reasonCode,
    safeMessage: decision.safeMessage,
    decisionId: decision.decisionId,
    correlationId: ids.correlationId,
    requestId: ids.requestId,
    traceId: ids.traceId,
    dataClassification: "security-sensitive",
    retentionPolicy: "guardrail-local-dev-test",
    metadata: {
      policy_type: decision.policyType,
      scope: decision.scope,
      route_id: decision.routeId ?? "unknown",
      operation_id: decision.operationId ?? "unknown",
      http_status: String(decision.httpStatus),
      remaining: String(decision.remaining),
    },
  });
}

async function enforceRouteGuardrail(
  runtime: DevRuntime,
  context: TenantContext,
  request: FastifyRequest,
  reply: FastifyReply,
  input: {
    readonly policyId: string;
    readonly routeId: string;
    readonly operationId: string;
    readonly resourceType: string;
    readonly idempotencyKey?: string | null;
  },
): Promise<unknown | null> {
  const ids = idsFor(request);
  const fingerprint = JSON.stringify({
    method: request.method,
    url: request.url,
    body: request.body ?? null,
  });
  const decision = runtime.guardrails.evaluate({
    policyId: input.policyId,
    tenantId: context.tenantId,
    subjectRef: context.actorId,
    actorId: context.actorId,
    routeId: input.routeId,
    operationId: input.operationId,
    resourceType: input.resourceType,
    idempotencyKey: input.idempotencyKey ?? null,
    requestFingerprint: opaqueHash(fingerprint),
    correlationId: ids.correlationId,
    requestId: ids.requestId,
    traceId: ids.traceId,
  });
  if (
    decision.decision === "allow" ||
    decision.decision === "monitor-only" ||
    decision.decision === "shadow-deny"
  ) {
    return null;
  }
  if (decision.retryAfter) {
    reply.header("retry-after", decision.retryAfter);
  }
  await recordGuardrailDenial(runtime, context, request, decision);
  reply.code(decision.httpStatus);
  return apiError(
    request,
    decision.httpStatus,
    guardrailErrorCode(decision),
    decision.reasonCode,
    decision.safeMessage,
    [],
    decision.retryAfter,
  );
}

function runtimeStatus(runtime: DevRuntime) {
  return {
    service: "foundation-api" as const,
    runtimeMode: runtime.runtimeMode,
    providerMode: runtime.providerModeLabel,
    providerClass: runtime.providerClass,
    environment: runtime.environment,
    serviceCatalogueAuthority: runtime.serviceCatalogueAuthority,
    composeTarget: runtime.composeTarget,
    deferredBoundaries: [...runtime.deferredBoundaries],
  };
}

function toSafeTelemetrySignalView(signal: TelemetrySignal) {
  return {
    signalId: signal.signalId,
    signalName: signal.signalName,
    signalCategory: signal.signalCategory,
    signalClassification: signal.signalClassification,
    severity: signal.severity,
    tenantId: signal.tenantId,
    actorId: signal.actorId,
    serviceActorId: signal.serviceActorId,
    routeId: signal.routeId,
    operationId: signal.operationId,
    capability: signal.capability,
    providerId: signal.providerId,
    jobId: signal.jobId,
    workflowId: signal.workflowId,
    notificationId: signal.notificationId,
    fileId: signal.fileId,
    auditEventId: signal.auditEventId,
    correlationId: signal.correlationId,
    causationId: signal.causationId,
    requestId: signal.requestId,
    traceId: signal.traceId,
    spanId: signal.spanId,
    parentSpanId: signal.parentSpanId,
    environmentScope: signal.environmentScope,
    providerMode: signal.providerMode,
    dataClassification: signal.dataClassification,
    tenantScope: signal.tenantScope,
    actorScope: signal.actorScope,
    providerScope: signal.providerScope,
    redactionPolicy: signal.redactionPolicy,
    cardinalityPolicy: signal.cardinalityPolicy,
    retentionPolicy: signal.retentionPolicy,
    accessPolicy: signal.accessPolicy,
    createdAt: signal.createdAt,
  };
}

const NOTIFICATION_PROVIDER_CONFIGURED = new WeakSet<DevRuntime>();

async function ensureNotificationProvider(runtime: DevRuntime, context: TenantContext) {
  if (NOTIFICATION_PROVIDER_CONFIGURED.has(runtime)) {
    return;
  }
  const result = await runtime.notificationCapability.configureProvider(context, {
    providerRef: "notify-in-memory",
    providerType: "in-memory",
    providerMode: "in-memory",
    channel: "test",
    endpoint: null,
    allowedHosts: Object.freeze([]),
    allowedSchemes: Object.freeze([]),
    tlsRequired: false,
    credentialRef: {
      secretRef: "secret://dev-tenant/mail-api-key",
      secretProvider: "in-memory",
      scope: "tenant",
      version: "1",
      status: "active",
      rotationPolicy: "local-dev-test-only",
      lastRotatedAt: null,
      nextRotationDueAt: null,
      owner: "platform",
    },
    senderIdentityRef: "sender:test",
    rateLimitPolicy: "local-dev-test-no-live-provider",
    retryPolicy: DEFAULT_NOTIFICATION_BACKOFF,
    timeoutPolicy: "local-dev-test",
    circuitBreakerPolicy: "local-dev-test",
    egressPolicy: "no-live-egress",
  });
  if (!result.ok) {
    throw new Error("notification provider configuration failed");
  }
  NOTIFICATION_PROVIDER_CONFIGURED.add(runtime);
}

export function buildApi(options: BuildApiOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const runtime = options.runtime ?? createDevRuntime();
  const idempotencyLedger = new Map<string, { fingerprint: string; response: unknown }>();

  async function idempotent(
    request: FastifyRequest,
    reply: { code(statusCode: number): unknown },
    context: TenantContext,
    routeId: string,
    handler: () => Promise<unknown>,
  ): Promise<unknown> {
    const header = requireIdempotencyKey(request);
    if (!header) {
      return sendError(
        request,
        reply,
        400,
        "idempotency_key_required",
        "idempotency-key-required",
        "Idempotency-Key header is required",
      );
    }
    const fingerprint = JSON.stringify({
      method: request.method,
      url: request.url,
      body: request.body ?? null,
    });
    const key = [context.tenantId, context.actorId, routeId, header].join(":");
    const previous = idempotencyLedger.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        return sendError(
          request,
          reply,
          409,
          "idempotency_conflict",
          "idempotency-conflict",
          "Idempotency key conflicts with a prior request",
        );
      }
      return previous.response;
    }
    const response = await handler();
    if (!(response && typeof response === "object" && "error" in response)) {
      idempotencyLedger.set(key, { fingerprint, response });
    }
    return response;
  }

  app.addHook("onRequest", async (request, reply) => {
    const ids = idsFor(request);
    reply.header("x-request-id", ids.requestId);
    reply.header("x-correlation-id", ids.correlationId);
    if (ids.traceId) reply.header("x-trace-id", ids.traceId);
    reply.header("cache-control", "no-store");
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    reply.header("permissions-policy", "geolocation=(), camera=(), microphone=()");
  });

  app.addHook("preSerialization", async (request, reply, payload) => {
    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "error" in payload &&
      !("error_id" in payload)
    ) {
      const body = payload as { error?: unknown; reasonCode?: unknown };
      const status = reply.statusCode >= 400 ? reply.statusCode : 400;
      const reasonCode =
        typeof body.reasonCode === "string" && body.reasonCode
          ? body.reasonCode
          : status === 404
            ? "not-found"
            : status === 403
              ? "forbidden"
              : "request-failed";
      return apiError(
        request,
        status,
        status === 403 ? "forbidden" : status === 404 ? "not_found" : "request_failed",
        reasonCode,
        safeErrorMessage(body.error),
      );
    }
    return payload;
  });

  app.setNotFoundHandler(async (request, reply) =>
    sendError(request, reply, 404, "not_found", "route-not-found", "Route not found"),
  );

  app.setErrorHandler(
    (
      error: Error & {
        validation?: Array<{ instancePath?: string; schemaPath?: string; keyword?: string }>;
        statusCode?: number;
      },
      request,
      reply,
    ) => {
      if (error.validation) {
        const details = error.validation.map((item) => ({
          path: item.instancePath || item.schemaPath || "request",
          code: item.keyword ?? "validation",
          safe_message: "Request validation failed",
        }));
        reply
          .code(400)
          .send(
            apiError(
              request,
              400,
              "validation_error",
              "validation-failed",
              "Request validation failed",
              details,
            ),
          );
        return;
      }
      const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
      const safeMessage = status >= 500 ? "Internal server error" : "Request failed";
      reply
        .code(status)
        .send(apiError(request, status, "request_failed", "request-failed", safeMessage));
    },
  );

  app.get(
    "/healthz",
    {
      schema: {
        response: { 200: HealthResponseSchema },
      },
    },
    async () => ({ status: "ok", ...runtimeStatus(runtime) }),
  );

  app.get(
    "/readyz",
    {
      schema: {
        response: { 200: ReadyResponseSchema },
      },
    },
    async () => ({
      status: "ready",
      ...runtimeStatus(runtime),
      providers: runtime.providers,
    }),
  );

  app.get("/openapi.json", async () => buildOpenApiDocument());

  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/tenant-context",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: { 200: TenantContextResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const context = requireRequestTenant(
          contextFromClaims(devClaimsFromRequest(request), "local"),
          request.query.tenantId ?? "",
        );
        await runtime.auditLedger.append(
          createAuditRecord({
            id: stableId("audit", [context.tenantId, context.actorId, "tenant-context"]),
            action: "tenant.context.read",
            tenantId: context.tenantId,
            actorId: context.actorId,
            subject: context.tenantId,
            metadata: {
              providerMode: runtime.providerModeLabel,
              runtimeMode: runtime.runtimeMode,
              providerClass: context.providerMode,
            },
          }),
        );
        await runtime.eventBus.publish({
          tenantId: context.tenantId,
          subject: "tenant.context.accepted",
          payload: { actorId: context.actorId },
        });
        const ids = idsFor(request);
        runtime.observability.recordMetric({
          metricName: "api.request.count",
          metricType: "counter",
          value: 1,
          unit: "request",
          description: "Local dev/test API request count",
          owner: "platform-observability",
          labels: {
            route_id: "tenant-context.get",
            operation_id: "getTenantContext",
            capability: "tenant-context",
            method: "GET",
            route: "/v1/tenant-context",
            status_code: "200",
            environment_scope: "local-dev",
            provider_mode: "in-memory",
          },
          context: {
            tenantId: context.tenantId,
            actorId: context.actorId,
            routeId: "tenant-context.get",
            operationId: "getTenantContext",
            capability: "tenant-context",
            correlationId: ids.correlationId,
            requestId: ids.requestId,
            traceId: ids.traceId ?? ids.correlationId,
          },
        });
        runtime.observability.recordTraceSpan({
          spanName: "tenant-context.accepted",
          spanKind: "server",
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: 1,
          status: "ok",
          safeAttributes: {
            route_id: "tenant-context.get",
            capability: "tenant-context",
          },
          context: {
            tenantId: context.tenantId,
            actorId: context.actorId,
            routeId: "tenant-context.get",
            operationId: "getTenantContext",
            capability: "tenant-context",
            correlationId: ids.correlationId,
            requestId: ids.requestId,
            traceId: ids.traceId ?? ids.correlationId,
          },
        });
        return {
          tenantId: context.tenantId,
          actorId: context.actorId,
          roles: [...context.roles],
          runtimeMode: runtime.runtimeMode,
          providerMode: runtime.providerModeLabel,
          providerClass: context.providerMode,
          environment: context.environment,
          auditEvents: runtime.auditLedger.list(context.tenantId).length,
        };
      } catch (error) {
        if (error instanceof TenantMismatchError) {
          return tenantMismatch(request, reply);
        }
        return sendError(
          request,
          reply,
          400,
          "tenant_context_invalid",
          "missing-or-invalid-tenant-context",
          "missing or invalid tenant context",
        );
      }
    },
  );

  app.post<{ Body: { tenantId: string; email: string } }>(
    "/auth/login",
    {
      schema: {
        body: LoginRequestSchema,
        response: { 200: LoginResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        return await runtime.authService.login(request.body);
      } catch (error) {
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.post<{
    Body: {
      tenantId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      dataClassification?: string;
      breakGlassGrantId?: string;
    };
  }>(
    "/v1/authz/check",
    {
      schema: {
        body: AuthorizeCheckRequestSchema,
        response: {
          200: AuthorizeDecisionResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      const body = request.body;
      if (context.tenantId !== body.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      const authzRequest: AuthorizationRequest = {
        context,
        action: body.action,
        resource: {
          type: body.resourceType,
          id: body.resourceId,
          tenantId: body.tenantId,
          attributes: body.dataClassification
            ? { data_classification: body.dataClassification }
            : {},
        },
        requestContext: { correlation_id: stableId("corr", [context.tenantId, context.actorId]) },
        ...(body.breakGlassGrantId ? { breakGlassGrantId: body.breakGlassGrantId } : {}),
      };
      const decision = await runtime.authorizer.authorize(authzRequest);
      if (decision.effect === "permit") {
        return {
          effect: "permit" as const,
          action: decision.action,
          reasonCode: decision.reasonCode,
          obligations: [...decision.obligations],
          policyVersion: decision.policyVersion,
        };
      }
      reply.code(403);
      return { error: decision.safeMessage, reasonCode: decision.reasonCode };
    },
  );

  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/authz/permissions",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: PermissionsResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const claims = devClaimsFromRequest(request);
      const tenantId = request.query.tenantId ?? "";
      if (claims.tenantId !== tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      const context = contextFromClaims(claims, "local");
      const deny = await ensurePermission(
        runtime,
        context,
        "tenant.members.read",
        "tenant-member",
        claims.subject,
        tenantId,
      );
      if (deny) {
        reply.code(403);
        return { error: "Not authorized", reasonCode: deny };
      }
      const membership = runtime.membershipDirectory.membership({
        actorId: claims.subject,
        tenantId,
      });
      const active = membership?.status === "active";
      const permissions =
        active && membership ? [...permissionsForRoles(membership.roles)].sort() : [];
      return { tenantId, actorId: claims.subject, active, permissions };
    },
  );

  // Audit retrieval (parity-audit, USF-142). Tenant-scoped, PDP-protected,
  // RLS-backed (DB substrate), non-enumerating, redacted. Reading audit evidence is
  // itself a privileged action and is itself audited (audit-of-audit).
  app.get<{
    Querystring: {
      tenantId?: string;
      category?: string;
      eventType?: string;
      action?: string;
      outcome?: string;
      correlationId?: string;
      limit?: string;
      cursor?: string;
    };
  }>(
    "/v1/audit/events",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
            category: { type: "string" },
            eventType: { type: "string" },
            action: { type: "string" },
            outcome: { type: "string" },
            correlationId: { type: "string" },
            limit: { type: "string" },
            cursor: { type: "string" },
          },
          required: ["tenantId"],
        },
        response: {
          200: AuditEventsResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      const query = request.query;
      if (context.tenantId !== query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      const criteria: AuditQueryCriteria = {
        tenantId: query.tenantId,
        ...(query.category ? { category: query.category as AuditCategory } : {}),
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.outcome ? { outcome: query.outcome as AuditEventOutcome } : {}),
        ...(query.correlationId ? { correlationId: query.correlationId } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
        ...(query.cursor ? { cursor: query.cursor } : {}),
      };
      try {
        const page = await runtime.auditQuery.list(context, criteria, accessFrom(request));
        return {
          tenantId: context.tenantId,
          events: page.events.map(toSafeAuditEventView),
          nextCursor: page.nextCursor,
        };
      } catch (error) {
        if (error instanceof AuditAccessDeniedError) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.get<{ Params: { id: string }; Querystring: { tenantId?: string } }>(
    "/v1/audit/events/:id",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: AuditEventViewSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      try {
        const event = await runtime.auditQuery.get(context, request.params.id, accessFrom(request));
        if (!event) {
          reply.code(404);
          return { error: "audit event not found" };
        }
        return toSafeAuditEventView(event);
      } catch (error) {
        if (error instanceof AuditAccessDeniedError) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.post<{ Body: { tenantId: string } }>(
    "/v1/audit/verify",
    {
      schema: {
        body: AuditVerifyRequestSchema,
        response: {
          200: AuditVerifyResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.body.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      try {
        return await runtime.auditQuery.verify(context, accessFrom(request));
      } catch (error) {
        if (error instanceof AuditAccessDeniedError) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  // Config surfaces (parity-config-secrets, USF-144). Tenant-scoped, PDP-protected,
  // redacted, non-enumerating. No secret values, no raw provider credentials.
  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/config/current",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: { 200: ConfigCurrentResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      const config = await runtime.configService.list(context);
      return { tenantId: context.tenantId, schemaVersion: "config-1", config };
    },
  );

  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/config/feature-flags",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: { 200: FeatureFlagsResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      const flags: Record<string, boolean> = {};
      for (const def of FEATURE_FLAG_REGISTRY) {
        flags[def.flagKey] = await runtime.configService.evaluateFlag(context, def.flagKey);
      }
      return { tenantId: context.tenantId, flags };
    },
  );

  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/config/provider-status",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: ProviderStatusResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      const deny = await ensurePermission(
        runtime,
        context,
        "config.read",
        "provider-status",
        "provider-status",
      );
      if (deny) {
        reply.code(403);
        return { error: "Not authorized", reasonCode: deny };
      }
      // Provider MODES only (never credentials); the plan is already non-secret.
      return {
        tenantId: context.tenantId,
        providerMode: runtime.providerModeLabel,
        providers: runtime.providers,
      };
    },
  );

  // Provider trust-boundary status (parity-provider-adapters-modes). This is an
  // operator/security-admin surface for redacted local/dev/test provider posture,
  // not a live provider readiness or production status API.
  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/providers",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: ProvidersListResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = tenantContextFromRequest(request);
      } catch {
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing or invalid tenant context",
        );
      }
      try {
        requireRequestTenant(context, request.query.tenantId ?? "");
      } catch (error) {
        if (error instanceof TenantMismatchError) {
          return tenantMismatch(request, reply);
        }
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing tenant context",
        );
      }
      const deny = await ensurePermission(
        runtime,
        context,
        "provider.list",
        "provider-registry",
        "all",
      );
      if (deny) {
        return sendError(request, reply, 403, "forbidden", deny, "Not authorized");
      }
      const ids = idsFor(request);
      await runtime.auditRecorder.record({
        eventId: stableId("audit", [ids.requestId, "provider-readiness-list"]),
        eventType: "provider.readiness.checked",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: "provider.readiness.checked",
        outcome: "success",
        resourceType: "provider-registry",
        resourceId: "all",
        reasonCode: "provider-status-read",
        safeMessage: "provider readiness checked",
        correlationId: ids.correlationId,
        requestId: ids.requestId,
        traceId: ids.traceId,
        metadata: { provider_count: providerStatusViews().length },
      });
      return {
        tenantId: context.tenantId,
        providers: providerStatusViews(),
        nextCursor: null,
      };
    },
  );

  app.get<{ Params: { id?: string }; Querystring: { tenantId?: string } }>(
    "/v1/providers/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: ProviderDetailResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = tenantContextFromRequest(request);
      } catch {
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing or invalid tenant context",
        );
      }
      try {
        requireRequestTenant(context, request.query.tenantId ?? "");
      } catch (error) {
        if (error instanceof TenantMismatchError) {
          return tenantMismatch(request, reply);
        }
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing tenant context",
        );
      }
      const deny = await ensurePermission(
        runtime,
        context,
        "provider.read",
        "provider-registry",
        request.params.id ?? "unknown",
      );
      if (deny) {
        return sendError(request, reply, 403, "forbidden", deny, "Not authorized");
      }
      const provider = findProvider(request.params.id ?? "");
      if (!provider) {
        return sendError(
          request,
          reply,
          404,
          "not_found",
          "provider-not-found",
          "provider not found",
        );
      }
      const ids = idsFor(request);
      await runtime.auditRecorder.record({
        eventId: stableId("audit", [ids.requestId, "provider-health", provider.providerId]),
        eventType: "provider.health.checked",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: "provider.health.checked",
        outcome: "success",
        resourceType: "provider",
        resourceId: provider.providerId,
        reasonCode: "provider-status-read",
        safeMessage: "provider health checked",
        correlationId: ids.correlationId,
        requestId: ids.requestId,
        traceId: ids.traceId,
        metadata: {
          provider_id: provider.providerId,
          provider_mode: provider.providerMode,
          readiness_status: provider.readinessStatus,
        },
      });
      return {
        tenantId: context.tenantId,
        provider: toSafeProviderStatus(provider),
      };
    },
  );

  // Observability telemetry surfaces (parity-observability-telemetry). These are
  // operator/security-admin local/dev/test views over redacted in-memory signals.
  // They are not live monitoring, SIEM, alerting, dashboard, or production status.
  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/observability/readiness",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: ObservabilityReadinessResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = tenantContextFromRequest(request);
      } catch {
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing or invalid tenant context",
        );
      }
      try {
        requireRequestTenant(context, request.query.tenantId ?? "");
      } catch (error) {
        if (error instanceof TenantMismatchError) {
          runtime.observability.recordSecuritySignal({
            eventName: "tenant.context.mismatch",
            severity: "security",
            reasonCode: "tenant-context-mismatch",
            safeSummary: "tenant context mismatch",
            context: {
              tenantId: context.tenantId,
              actorId: context.actorId,
              routeId: "observability-readiness.get",
              operationId: "getObservabilityReadinessV1",
              capability: "telemetry-collector",
              requestId: idsFor(request).requestId,
              correlationId: idsFor(request).correlationId,
              traceId: idsFor(request).traceId ?? idsFor(request).correlationId,
            },
          });
          return tenantMismatch(request, reply);
        }
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing tenant context",
        );
      }
      const deny = await ensurePermission(
        runtime,
        context,
        "observability.readiness.read",
        "telemetry-collector",
        "observability-captured-local",
      );
      const ids = idsFor(request);
      if (deny) {
        runtime.observability.recordSecuritySignal({
          eventName: "authorization.denied",
          severity: "security",
          reasonCode: deny,
          safeSummary: "observability readiness denied",
          context: {
            tenantId: context.tenantId,
            actorId: context.actorId,
            routeId: "observability-readiness.get",
            operationId: "getObservabilityReadinessV1",
            capability: "telemetry-collector",
            requestId: ids.requestId,
            correlationId: ids.correlationId,
            traceId: ids.traceId ?? ids.correlationId,
          },
        });
        return sendError(request, reply, 403, "forbidden", deny, "Not authorized");
      }
      runtime.observability.recordReadinessSignal({
        signalName: "observability.readiness",
        status: "healthy",
        component: "telemetry-collector",
        safeSummary: "local dev/test telemetry collector ready",
        context: {
          tenantId: context.tenantId,
          actorId: context.actorId,
          routeId: "observability-readiness.get",
          operationId: "getObservabilityReadinessV1",
          capability: "telemetry-collector",
          providerId: "observability-captured-local",
          requestId: ids.requestId,
          correlationId: ids.correlationId,
          traceId: ids.traceId ?? ids.correlationId,
        },
      });
      await runtime.auditRecorder.record({
        eventId: stableId("audit", [ids.requestId, "observability-readiness"]),
        eventType: "observability.readiness.checked",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: "observability.readiness.read",
        outcome: "success",
        resourceType: "telemetry-collector",
        resourceId: "observability-captured-local",
        reasonCode: "observability-readiness-read",
        safeMessage: "observability readiness checked",
        correlationId: ids.correlationId,
        requestId: ids.requestId,
        traceId: ids.traceId,
        metadata: {
          provider_mode: "in-memory",
          signal_count: runtime.observability.safeStatusView().signalCount,
        },
      });
      const status = runtime.observability.safeStatusView();
      return {
        tenantId: context.tenantId,
        status: "ready-local-dev-test",
        collector: status,
        providerMode: status.providerMode,
        liveMonitoringReadinessClaim: false,
        productionReadinessClaim: false,
      };
    },
  );

  app.get<{
    Querystring: {
      tenantId?: string;
      signalCategory?: string;
      severity?: string;
      limit?: string;
      cursor?: string;
    };
  }>(
    "/v1/observability/signals",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
            signalCategory: { type: "string" },
            severity: { type: "string" },
            limit: { type: "string" },
            cursor: { type: "string" },
          },
          required: ["tenantId"],
        },
        response: {
          200: ObservabilitySignalsResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = tenantContextFromRequest(request);
      } catch {
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing or invalid tenant context",
        );
      }
      try {
        requireRequestTenant(context, request.query.tenantId ?? "");
      } catch (error) {
        if (error instanceof TenantMismatchError) {
          return tenantMismatch(request, reply);
        }
        return sendError(
          request,
          reply,
          400,
          "tenant_context_missing",
          "tenant-context-missing",
          "missing tenant context",
        );
      }
      const deny = await ensurePermission(
        runtime,
        context,
        "observability.signal.read",
        "telemetry-collector",
        "observability-captured-local",
      );
      const ids = idsFor(request);
      if (deny) {
        runtime.observability.recordSecuritySignal({
          eventName: "authorization.denied",
          severity: "security",
          reasonCode: deny,
          safeSummary: "observability signal read denied",
          context: {
            tenantId: context.tenantId,
            actorId: context.actorId,
            routeId: "observability-signals.list",
            operationId: "listObservabilitySignalsV1",
            capability: "telemetry-collector",
            requestId: ids.requestId,
            correlationId: ids.correlationId,
            traceId: ids.traceId ?? ids.correlationId,
          },
        });
        return sendError(request, reply, 403, "forbidden", deny, "Not authorized");
      }
      await runtime.auditRecorder.record({
        eventId: stableId("audit", [ids.requestId, "observability-signals"]),
        eventType: "observability.read",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: "observability.signal.read",
        outcome: "success",
        resourceType: "telemetry-collector",
        resourceId: "observability-captured-local",
        reasonCode: "observability-signal-read",
        safeMessage: "observability signals read",
        correlationId: ids.correlationId,
        requestId: ids.requestId,
        traceId: ids.traceId,
        metadata: {
          signal_category: request.query.signalCategory ?? "all",
          severity: request.query.severity ?? "all",
        },
      });
      const queryInput: { tenantId: string; limit?: number; cursor?: string } = {
        tenantId: context.tenantId,
      };
      if (request.query.limit) {
        queryInput.limit = Number(request.query.limit);
      }
      if (request.query.cursor) {
        queryInput.cursor = request.query.cursor;
      }
      const page = runtime.observability.query(queryInput);
      const filtered = page.signals.filter(
        (signal) =>
          (!request.query.signalCategory ||
            signal.signalCategory === request.query.signalCategory) &&
          (!request.query.severity || signal.severity === request.query.severity),
      );
      return {
        tenantId: context.tenantId,
        signals: filtered.map(toSafeTelemetrySignalView),
        nextCursor: page.nextCursor,
      };
    },
  );

  // File surfaces (parity-files-storage, USF-146). Tenant-scoped, PDP-protected,
  // redacted least-disclosure, non-enumerating. No object keys, provider creds, or
  // original filenames in views; download is gated by PDP + scan/lifecycle status.
  app.get<{ Querystring: { tenantId?: string; status?: string; limit?: string; cursor?: string } }>(
    "/v1/files",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
            status: { type: "string" },
            limit: { type: "string" },
            cursor: { type: "string" },
          },
          required: ["tenantId"],
        },
        response: {
          200: FilesListResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      const q = request.query;
      if (context.tenantId !== q.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      const criteria = {
        tenantId: q.tenantId,
        ...(q.status ? { status: q.status as never } : {}),
        ...(q.limit ? { limit: Number(q.limit) } : {}),
        ...(q.cursor ? { cursor: q.cursor } : {}),
      };
      try {
        const page = await runtime.fileService.list(context, criteria, accessFrom(request));
        return { tenantId: context.tenantId, files: page.files, nextCursor: page.nextCursor };
      } catch (error) {
        if (error instanceof FileAccessDeniedError) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.post<{
    Body: {
      tenantId: string;
      fileId: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      body: string;
      classification?: string;
      declaredChecksum?: string;
    };
  }>(
    "/v1/files",
    {
      schema: {
        body: FileUploadRequestSchema,
        response: { 200: FileViewSchema, 400: ErrorResponseSchema, 403: ForbiddenResponseSchema },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      const body = request.body;
      if (context.tenantId !== body.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      try {
        return await runtime.fileService.upload(
          context,
          {
            fileId: body.fileId,
            filename: body.filename,
            contentType: body.contentType,
            sizeBytes: body.sizeBytes,
            body: body.body,
            ...(body.classification ? { classification: body.classification as never } : {}),
            ...(body.declaredChecksum ? { declaredChecksum: body.declaredChecksum } : {}),
          },
          accessFrom(request),
        );
      } catch (error) {
        if (error instanceof FileAccessDeniedError) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        if (error instanceof FileValidationError) {
          reply.code(400);
          return { error: error.message };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.get<{ Params: { id: string }; Querystring: { tenantId?: string } }>(
    "/v1/files/:id",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: FileViewSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      try {
        const view = await runtime.fileService.get(context, request.params.id, accessFrom(request));
        if (!view) {
          reply.code(404);
          return { error: "file not found" };
        }
        return view;
      } catch (error) {
        if (error instanceof FileAccessDeniedError) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.post<{ Params: { id: string }; Querystring: { tenantId?: string } }>(
    "/v1/files/:id/download",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: FileDownloadResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      try {
        const { body, view } = await runtime.fileService.download(
          context,
          request.params.id,
          accessFrom(request),
        );
        return {
          fileId: view.fileId,
          contentType: view.contentType,
          sizeBytes: view.sizeBytes,
          body,
        };
      } catch (error) {
        if (error instanceof FileAccessDeniedError) {
          // Deny covers missing/cross-tenant/quarantined/scan-gated; non-enumerating.
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.post<{ Params: { id: string }; Querystring: { tenantId?: string } }>(
    "/v1/files/:id/verify",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: FileVerifyResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let context: TenantContext;
      try {
        context = contextFromClaims(devClaimsFromRequest(request), "local");
      } catch {
        reply.code(400);
        return { error: "missing or invalid tenant context" };
      }
      if (context.tenantId !== request.query.tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
      }
      try {
        const result = await runtime.fileService.verify(
          context,
          request.params.id,
          accessFrom(request),
        );
        return { fileId: request.params.id, ok: result.ok, reasonCode: result.reasonCode };
      } catch (error) {
        if (error instanceof FileAccessDeniedError) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: error.reasonCode };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : "unknown error" };
      }
    },
  );

  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/jobs",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: JobsListResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      if (context.tenantId !== request.query.tenantId) {
        return tenantMismatch(request, reply);
      }
      const result = await runtime.jobService.list(context);
      if (!result.ok) {
        reply.code(403);
        return { error: "Not authorized", reasonCode: result.reasonCode };
      }
      return { tenantId: context.tenantId, jobs: result.views, nextCursor: null };
    },
  );

  app.post<{
    Body: {
      tenantId: string;
      classification: string;
      jobType: string;
      payloadRefs?: Record<string, string>;
      maxRetries?: number;
      priority?: number;
      runAfterSec?: number;
    };
  }>(
    "/v1/jobs",
    {
      schema: {
        body: JobCreateRequestSchema,
        response: {
          200: JobCreateResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          409: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      const body = request.body;
      if (context.tenantId !== body.tenantId) {
        return tenantMismatch(request, reply);
      }
      if (!JOB_CLASSIFICATIONS.includes(body.classification as JobClassification)) {
        return sendError(
          request,
          reply,
          400,
          "validation_error",
          "unknown-job-classification",
          "Request validation failed",
        );
      }
      return idempotent(request, reply, context, "jobs.create", async () => {
        const idempotencyKey = requireIdempotencyKey(request);
        const guardrail = await enforceRouteGuardrail(runtime, context, request, reply, {
          policyId: "api.jobs.create.local",
          routeId: "jobs.create",
          operationId: "postJobCreateV1",
          resourceType: "job",
          idempotencyKey,
        });
        if (guardrail) return guardrail;
        const outcome = await runtime.jobService.submit({
          context,
          classification: body.classification as JobClassification,
          jobType: body.jobType,
          ...(body.payloadRefs ? { payload: body.payloadRefs } : {}),
          ...(idempotencyKey ? { idempotencyKey } : {}),
          ...(body.maxRetries !== undefined ? { maxRetries: body.maxRetries } : {}),
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(body.runAfterSec !== undefined ? { runAfterSec: body.runAfterSec } : {}),
        });
        if (!outcome.ok) {
          reply.code(403);
          return { error: "Not authorized", reasonCode: outcome.reasonCode };
        }
        return {
          tenantId: context.tenantId,
          deduplicated: outcome.deduplicated,
          job: toSafeJobView(outcome.job),
        };
      });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { tenantId?: string } }>(
    "/v1/jobs/:id",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: JobViewSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      if (context.tenantId !== request.query.tenantId) {
        return tenantMismatch(request, reply);
      }
      const result = await runtime.jobService.read(context, request.params.id);
      if (!result.ok) {
        reply.code(result.reasonCode === "no-job" ? 404 : 403);
        return {
          error: result.reasonCode === "no-job" ? "job not found" : "Not authorized",
          reasonCode: result.reasonCode,
        };
      }
      return result.view;
    },
  );

  app.post<{ Params: { id: string }; Body: { tenantId: string } }>(
    "/v1/jobs/:id/cancel",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        body: TenantActionRequestSchema,
        response: {
          200: ActionResultResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      if (context.tenantId !== request.body.tenantId) {
        return tenantMismatch(request, reply);
      }
      return idempotent(request, reply, context, "jobs.cancel", async () => {
        const result = await runtime.jobService.cancel(context, request.params.id);
        if (!result.ok) {
          reply.code(
            result.reasonCode === "no-job"
              ? 404
              : result.reasonCode === "already-terminal"
                ? 409
                : 403,
          );
          return {
            error: result.reasonCode === "no-job" ? "job not found" : "job action denied",
            reasonCode: result.reasonCode,
          };
        }
        return result;
      });
    },
  );

  app.post<{
    Body: {
      tenantId: string;
      templateId: string;
      templateKey: string;
      templateVersion: string;
      templateClassification: string;
      subjectTemplate: string;
      bodyTemplate: string;
      allowedVariables: NotificationTemplateVariableDefinition[];
    };
  }>(
    "/v1/notification-templates",
    {
      schema: {
        body: NotificationTemplateCreateRequestSchema,
        response: {
          200: NotificationTemplateResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      const body = request.body;
      if (context.tenantId !== body.tenantId) {
        return tenantMismatch(request, reply);
      }
      if (
        !NOTIFICATION_CLASSIFICATIONS.includes(
          body.templateClassification as NotificationClassification,
        )
      ) {
        return sendError(
          request,
          reply,
          400,
          "validation_error",
          "unknown-notification-classification",
          "Request validation failed",
        );
      }
      await ensureNotificationProvider(runtime, context);
      const result = await runtime.notificationCapability.createTemplate(context, {
        templateId: body.templateId,
        templateKey: body.templateKey,
        templateVersion: body.templateVersion,
        templateStatus: "approved",
        templateOwner: context.actorId,
        templateClassification: body.templateClassification as NotificationClassification,
        allowedChannels: Object.freeze(["test"]),
        allowedNotificationClasses: Object.freeze([
          body.templateClassification as NotificationClassification,
        ]),
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
        subjectClassification: "internal",
        bodyClassification: "internal",
        payloadClassification: "internal",
        renderContextSchema: Object.freeze({ type: "object" }),
        allowedVariables: Object.freeze([...body.allowedVariables]),
        createdBy: context.actorId,
        approvedBy: context.actorId,
        approvedAt: new Date().toISOString(),
        deprecatedAt: null,
        immutableAfterFirstUse: true,
        firstUsedAt: null,
      });
      if (!result.ok) {
        reply.code(403);
        return { error: "Not authorized", reasonCode: result.reasonCode };
      }
      return {
        templateId: result.template.templateId,
        templateKey: result.template.templateKey,
        templateVersion: result.template.templateVersion,
        templateHash: result.template.templateHash,
        templateStatus: result.template.templateStatus,
        templateClassification: result.template.templateClassification,
        allowedChannels: [...result.template.allowedChannels],
        allowedNotificationClasses: [...result.template.allowedNotificationClasses],
      };
    },
  );

  app.get<{ Querystring: { tenantId?: string } }>(
    "/v1/notifications",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: NotificationsListResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      if (context.tenantId !== request.query.tenantId) {
        return tenantMismatch(request, reply);
      }
      const result = await runtime.notificationCapability.listNotifications(context);
      if (!result.ok) {
        reply.code(403);
        return { error: "Not authorized", reasonCode: result.reasonCode };
      }
      return { tenantId: context.tenantId, notifications: result.views, nextCursor: null };
    },
  );

  app.post<{
    Body: {
      tenantId: string;
      recipient: NotificationRecipient;
      channel: string;
      classification: string;
      templateId: string;
      correlationId?: string;
    };
  }>(
    "/v1/notifications",
    {
      schema: {
        body: NotificationCreateRequestSchema,
        response: {
          200: NotificationCreateResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      const body = request.body;
      if (
        context.tenantId !== body.tenantId ||
        context.tenantId !== body.recipient.recipientTenantId
      ) {
        return tenantMismatch(request, reply);
      }
      if (
        !NOTIFICATION_CHANNELS.includes(body.channel as NotificationChannel) ||
        !NOTIFICATION_CLASSIFICATIONS.includes(body.classification as NotificationClassification)
      ) {
        return sendError(
          request,
          reply,
          400,
          "validation_error",
          "invalid-notification-request",
          "Request validation failed",
        );
      }
      await ensureNotificationProvider(runtime, context);
      const result = await runtime.notificationCapability.createNotification(context, {
        recipient: body.recipient,
        channel: body.channel as NotificationChannel,
        classification: body.classification as NotificationClassification,
        templateId: body.templateId,
        ...(body.correlationId ? { correlationId: body.correlationId } : {}),
      });
      if (!result.ok) {
        reply.code(result.reasonCode === "template-missing" ? 400 : 403);
        return { error: "notification create failed", reasonCode: result.reasonCode };
      }
      return { notification: result.view };
    },
  );

  app.get<{ Params: { id: string }; Querystring: { tenantId?: string } }>(
    "/v1/notifications/:id",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        querystring: {
          type: "object",
          properties: { tenantId: { type: "string" } },
          required: ["tenantId"],
        },
        response: {
          200: NotificationViewSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      if (context.tenantId !== request.query.tenantId) {
        return tenantMismatch(request, reply);
      }
      const result = await runtime.notificationCapability.readNotification(
        context,
        request.params.id,
      );
      if (!result.ok) {
        reply.code(result.reasonCode === "notification-missing" ? 404 : 403);
        return {
          error:
            result.reasonCode === "notification-missing"
              ? "notification not found"
              : "Not authorized",
          reasonCode: result.reasonCode,
        };
      }
      return result.view;
    },
  );

  app.post<{ Params: { id: string }; Body: { tenantId: string } }>(
    "/v1/notifications/:id/send",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        body: TenantActionRequestSchema,
        response: {
          200: NotificationSendResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      if (context.tenantId !== request.body.tenantId) {
        return tenantMismatch(request, reply);
      }
      return idempotent(request, reply, context, "notifications.send", async () => {
        const result = await runtime.notificationCapability.enqueueDelivery(
          context,
          request.params.id,
        );
        if (!result.ok) {
          reply.code(result.reasonCode === "notification-missing" ? 404 : 403);
          return { error: "notification send failed", reasonCode: result.reasonCode };
        }
        return {
          notification: result.view,
          jobId: result.jobId ?? "job-deduplicated",
          deduplicated: result.deduplicated ?? false,
        };
      });
    },
  );

  app.post<{ Params: { id: string }; Body: { tenantId: string } }>(
    "/v1/notifications/:id/cancel",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        body: TenantActionRequestSchema,
        response: {
          200: ActionResultResponseSchema,
          400: ErrorResponseSchema,
          403: ForbiddenResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const context = tenantContextFromRequest(request);
      if (context.tenantId !== request.body.tenantId) {
        return tenantMismatch(request, reply);
      }
      return idempotent(request, reply, context, "notifications.cancel", async () => {
        const result = await runtime.notificationCapability.cancelNotification(
          context,
          request.params.id,
        );
        if (!result.ok) {
          reply.code(
            result.reasonCode === "notification-missing"
              ? 404
              : result.reasonCode === "already-terminal"
                ? 409
                : 403,
          );
          return { error: "notification cancel failed", reasonCode: result.reasonCode };
        }
        return result;
      });
    },
  );

  return app;
}
