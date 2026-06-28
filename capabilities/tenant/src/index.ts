import {
  assertTenantMatch,
  createTenantContext,
  stableId,
  type ExecutionEnvironment,
  type IdentityClaims,
  type TenantContext,
} from "@foundation/core";

export function contextFromClaims(
  claims: IdentityClaims,
  environment: ExecutionEnvironment = "hermetic",
): TenantContext {
  return createTenantContext({
    tenantId: claims.tenantId,
    actorId: claims.subject,
    roles: claims.roles,
    providerMode: claims.providerMode,
    environment,
  });
}

export function requireRequestTenant(
  context: TenantContext,
  requestTenantId: string,
): TenantContext {
  assertTenantMatch(context, requestTenantId, "request");
  return context;
}

export interface BreakGlassGrant {
  readonly grantId: string;
  readonly tenantId: string;
  readonly requesterId: string;
  readonly approverId: string;
  readonly reason: string;
  readonly scope: string;
  readonly expiresAt: Date;
}

export class BreakGlassRegistry {
  readonly #grants = new Map<string, BreakGlassGrant>();

  approve(input: {
    tenantId: string;
    requesterId: string;
    approverId: string;
    reason: string;
    scope: string;
    ttlMs: number;
  }): BreakGlassGrant {
    if (input.requesterId === input.approverId) {
      throw new Error("Break-glass requester cannot approve their own access");
    }
    if (input.ttlMs <= 0) {
      throw new Error("Break-glass access must expire");
    }
    const grant: BreakGlassGrant = Object.freeze({
      grantId: stableId("grant", [input.tenantId, input.requesterId, input.approverId]),
      tenantId: input.tenantId,
      requesterId: input.requesterId,
      approverId: input.approverId,
      reason: input.reason,
      scope: input.scope,
      expiresAt: new Date(Date.now() + input.ttlMs),
    });
    this.#grants.set(grant.grantId, grant);
    return grant;
  }

  assertActive(grantId: string, tenantId: string, now = new Date()): BreakGlassGrant {
    const grant = this.#grants.get(grantId);
    if (!grant) {
      throw new Error("Break-glass grant is missing");
    }
    if (grant.tenantId !== tenantId) {
      throw new Error("Break-glass grant tenant mismatch");
    }
    if (grant.expiresAt <= now) {
      throw new Error("Break-glass grant expired");
    }
    return grant;
  }
}
