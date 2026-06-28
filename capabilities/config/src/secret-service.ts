import {
  createAuditEventDraft,
  stableId,
  type AuthorizationRequest,
  type SecretReference,
  type TenantContext,
} from "@foundation/core";
import type { AuditRecorder, PolicyDecisionPoint, SecretResolver } from "@foundation/ports";

const COMPONENT = "secret-service";

// Secret resolution is privileged and internal-only. The VALUE is never returned to
// a normal API route and never appears in audit metadata. Resolvable lifecycle
// states are limited (revoked/expired/unknown fail closed; no silent downgrade).
const RESOLVABLE_STATES = new Set(["active", "rotating"]);

export class SecretAccessDeniedError extends Error {
  readonly reasonCode: string;
  constructor(reasonCode: string) {
    super("Not authorized");
    this.name = "SecretAccessDeniedError";
    this.reasonCode = reasonCode;
  }
}

export interface SecretService {
  // Metadata only (a SecretReference); never a value.
  describe(context: TenantContext, name: string): Promise<SecretReference | undefined>;
  // Internal-only value resolution for an authorised consumer; audited without value.
  resolve(context: TenantContext, name: string, purpose: string): Promise<string>;
}

export function createSecretService(deps: {
  readonly resolver: SecretResolver;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
}): SecretService {
  let counter = 0;
  const nextId = (kind: string, context: TenantContext): string =>
    stableId("evt", [context.tenantId, context.actorId, kind, String(counter++)]);

  function authzRequest(context: TenantContext, name: string): AuthorizationRequest {
    return {
      context,
      action: "secret.read",
      resource: { type: "secret", id: name, tenantId: context.tenantId, attributes: {} },
      requestContext: {
        correlation_id: stableId("corr", [context.tenantId, context.actorId, "secret"]),
      },
    };
  }

  async function audit(
    context: TenantContext,
    fields: {
      eventType: "secret.accessed" | "secret.denied";
      outcome: "success" | "denied" | "failed";
      reasonCode: string;
      name: string;
      purpose: string;
      secretRef?: string;
      status?: string;
      severity?: "notice" | "warning" | "high";
    },
  ): Promise<void> {
    // metadata carries the secret_ref, purpose, and status — NEVER the value.
    await deps.audit.record(
      createAuditEventDraft({
        eventId: nextId(fields.eventType, context),
        eventType: fields.eventType,
        category: "configuration",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: "secret.read",
        outcome: fields.outcome,
        reasonCode: fields.reasonCode,
        subjectType: "secret",
        subjectId: fields.name,
        resourceType: "secret",
        resourceId: fields.name,
        recordedByComponent: COMPONENT,
        ...(fields.severity ? { severity: fields.severity } : {}),
        metadata: {
          purpose: fields.purpose,
          ...(fields.secretRef ? { secretRef: fields.secretRef } : {}),
          ...(fields.status ? { status: fields.status } : {}),
        },
      }),
    );
  }

  async function guard(context: TenantContext, name: string, purpose: string): Promise<void> {
    const decision = deps.pdp.decide(authzRequest(context, name));
    if (decision.effect !== "permit") {
      await audit(context, {
        eventType: "secret.denied",
        outcome: "denied",
        reasonCode: decision.reasonCode,
        name,
        purpose,
        severity: "warning",
      });
      throw new SecretAccessDeniedError(decision.reasonCode);
    }
  }

  return {
    async describe(context, name) {
      await guard(context, name, "describe");
      const reference = await deps.resolver.describe({ tenantId: context.tenantId, name });
      await audit(context, {
        eventType: "secret.accessed",
        outcome: reference ? "success" : "failed",
        reasonCode: reference ? "described" : "not-found",
        name,
        purpose: "describe",
        ...(reference ? { secretRef: reference.secretRef, status: reference.status } : {}),
      });
      return reference;
    },

    async resolve(context, name, purpose) {
      await guard(context, name, purpose);
      const reference = await deps.resolver.describe({ tenantId: context.tenantId, name });
      if (!reference) {
        // Non-enumerating + fail closed.
        await audit(context, {
          eventType: "secret.denied",
          outcome: "failed",
          reasonCode: "secret-not-found",
          name,
          purpose,
          severity: "warning",
        });
        throw new SecretAccessDeniedError("secret-not-found");
      }
      if (!RESOLVABLE_STATES.has(reference.status)) {
        // Expired/revoked/unknown/etc. fail closed; no silent downgrade.
        await audit(context, {
          eventType: "secret.denied",
          outcome: "failed",
          reasonCode: `secret-${reference.status}`,
          name,
          purpose,
          secretRef: reference.secretRef,
          status: reference.status,
          severity: "high",
        });
        throw new SecretAccessDeniedError(`secret-${reference.status}`);
      }
      const value = await deps.resolver.resolveSecretValue(reference);
      await audit(context, {
        eventType: "secret.accessed",
        outcome: "success",
        reasonCode: "resolved",
        name,
        purpose,
        secretRef: reference.secretRef,
        status: reference.status,
      });
      return value;
    },
  };
}
