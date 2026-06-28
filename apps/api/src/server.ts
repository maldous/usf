import {
  ErrorResponseSchema,
  HealthResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  ReadyResponseSchema,
  TenantContextResponseSchema,
} from "@foundation/contracts";
import {
  TenantMismatchError,
  createAuditRecord,
  stableId,
  type IdentityClaims,
} from "@foundation/core";
import { contextFromClaims, requireRequestTenant } from "@foundation/capability-tenant";
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

  return app;
}
