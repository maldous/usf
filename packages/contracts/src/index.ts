import { Type } from "@sinclair/typebox";

export const HealthResponseSchema = Type.Object({
  status: Type.Literal("ok"),
  service: Type.Literal("foundation-api"),
  providerMode: Type.Literal("dev in-memory"),
  providerClass: Type.Literal("hermetic-mock"),
  environment: Type.Literal("local"),
});

export const ReadyResponseSchema = Type.Object({
  status: Type.Literal("ready"),
  service: Type.Literal("foundation-api"),
  providerMode: Type.Literal("dev in-memory"),
  providerClass: Type.Literal("hermetic-mock"),
  environment: Type.Literal("local"),
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
  providerMode: Type.Literal("dev in-memory"),
  providerClass: Type.Literal("hermetic-mock"),
  environment: Type.Literal("local"),
  auditEvents: Type.Number({ minimum: 1 }),
});

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});
