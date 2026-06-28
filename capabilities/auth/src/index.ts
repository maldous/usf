import { contextFromClaims } from "@foundation/capability-tenant";
import { createAuditRecord, stableId, type TenantContext } from "@foundation/core";
import type { AuditLedger, IdentityProvider } from "@foundation/ports";

export interface AuthService {
  login(input: { tenantId: string; email: string }): Promise<TenantContext>;
}

export function createAuthService(deps: {
  readonly identityProvider: IdentityProvider;
  readonly auditLedger: AuditLedger;
}): AuthService {
  return {
    async login(input) {
      const claims = await deps.identityProvider.issueLogin(input);
      const context = contextFromClaims(claims);
      await deps.auditLedger.append(
        createAuditRecord({
          id: stableId("audit", [context.tenantId, context.actorId, "login"]),
          action: "authentication.login",
          tenantId: context.tenantId,
          actorId: context.actorId,
          subject: input.email,
          metadata: {
            providerMode: context.providerMode,
          },
        }),
      );
      return context;
    },
  };
}

// Keycloak-brokered authentication/identity/session (parity-auth-keycloak-broker, USF-133).
export {
  actorFromVerifiedToken,
  KEYCLOAK_IDENTITY_PROVIDER,
  resolveActorFromToken,
  type IdentityDenyReason,
  type IdentityResolution,
  type ResolveActorOptions,
} from "./identity.ts";
export {
  createSessionService,
  InMemorySessionStore,
  type SessionDenyReason,
  type SessionService,
  type SessionServiceDeps,
  type SessionValidation,
} from "./session.ts";
export {
  createKeycloakAuthService,
  type AuthenticateOutcome,
  type KeycloakAuthDeps,
  type KeycloakAuthService,
  type TenantSelectionOutcome,
} from "./keycloak-auth.ts";
