import {
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
  LoginRequestSchema,
  LoginResponseSchema,
  PermissionsResponseSchema,
  ProviderStatusResponseSchema,
  ReadyResponseSchema,
  TenantContextResponseSchema,
} from "@foundation/contracts";
import {
  FileValidationError,
  TenantMismatchError,
  createAuditRecord,
  stableId,
  type AuditCategory,
  type AuditEventOutcome,
  type AuthorizationRequest,
  type IdentityClaims,
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
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { DEV_PROVIDER_MODE_LABEL, createDevRuntime, type DevRuntime } from "./runtime.ts";

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

function devClaimsFromRequest(request: FastifyRequest): IdentityClaims {
  const tenantId = firstHeaderValue(request, "x-dev-tenant-id");
  const actorId = firstHeaderValue(request, "x-dev-actor-id") || "dev-actor";
  const email = firstHeaderValue(request, "x-dev-email") || `${actorId}@example.test`;
  return {
    subject: actorId,
    tenantId,
    email,
    roles: Object.freeze(["tenant-admin"]),
    providerMode: "hermetic-mock",
  };
}

function accessFrom(request: FastifyRequest): AuditAccessContext {
  const requestId = firstHeaderValue(request, "x-request-id");
  const correlationId = firstHeaderValue(request, "x-correlation-id");
  const traceId = firstHeaderValue(request, "x-trace-id");
  return {
    ...(requestId ? { requestId } : {}),
    ...(correlationId ? { correlationId } : {}),
    ...(traceId ? { traceId } : {}),
  };
}

function runtimeStatus(runtime: DevRuntime) {
  return {
    service: "foundation-api" as const,
    providerMode: DEV_PROVIDER_MODE_LABEL,
    providerClass: runtime.providerClass,
    environment: runtime.environment,
  };
}

export function buildApi(options: BuildApiOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const runtime = options.runtime ?? createDevRuntime();

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
              providerMode: DEV_PROVIDER_MODE_LABEL,
              providerClass: context.providerMode,
            },
          }),
        );
        await runtime.eventBus.publish({
          tenantId: context.tenantId,
          subject: "tenant.context.accepted",
          payload: { actorId: context.actorId },
        });
        runtime.observability.record({
          tenantId: context.tenantId,
          signal: "tenant.context.accepted",
          attributes: { actorId: context.actorId },
        });
        return {
          tenantId: context.tenantId,
          actorId: context.actorId,
          roles: [...context.roles],
          providerMode: DEV_PROVIDER_MODE_LABEL,
          providerClass: context.providerMode,
          environment: context.environment,
          auditEvents: runtime.auditLedger.list(context.tenantId).length,
        };
      } catch (error) {
        reply.code(error instanceof TenantMismatchError ? 400 : 400);
        return { error: error instanceof Error ? error.message : "unknown error" };
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
        response: { 200: PermissionsResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const claims = devClaimsFromRequest(request);
      const tenantId = request.query.tenantId ?? "";
      if (claims.tenantId !== tenantId) {
        reply.code(400);
        return { error: "tenant context mismatch" };
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
        response: { 200: ProviderStatusResponseSchema, 400: ErrorResponseSchema },
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
      // Provider MODES only (never credentials); the plan is already non-secret.
      return {
        tenantId: context.tenantId,
        providerMode: DEV_PROVIDER_MODE_LABEL,
        providers: runtime.providers,
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

  return app;
}
