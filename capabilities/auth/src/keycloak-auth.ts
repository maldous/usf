import {
  type ActorIdentity,
  createAuditEventDraft,
  createTenantContext,
  KeycloakTokenError,
  opaqueHash,
  type PolicyDecision,
  type Session,
  stableId,
  type TenantContext,
  type VerifiedKeycloakToken,
} from "@foundation/core";
import type {
  AuditRecorder,
  IdentityDirectory,
  KeycloakTokenVerifier,
  PolicyDecisionPoint,
  TenantMembershipDirectory,
} from "@foundation/ports";
import { resolveActorFromToken } from "./identity.ts";
import type { SessionService } from "./session.ts";

// Keycloak-brokered authentication orchestration (parity-auth-keycloak-broker,
// USF-133 / ADR 0012). Ties together: local Keycloak token validation -> stable actor
// resolution -> session creation -> identity-to-tenant handoff through the PDP. Every
// step fails closed and emits a value-free audit event. Identity is authentication
// input only; tenant ROLES come from USF-authoritative membership, never token claims,
// and the PDP (ADR 0010) makes the authorization decision. A Keycloak claim/role/group
// or a broker alias never authorizes on its own.

const PLATFORM_SCOPE = "platform";
const UNAUTHENTICATED = "unauthenticated";

export type AuthenticateOutcome =
  | {
      readonly ok: true;
      readonly session: Session;
      readonly actor: ActorIdentity;
      readonly token: VerifiedKeycloakToken;
    }
  | { readonly ok: false; readonly reasonCode: string };

export type TenantSelectionOutcome =
  | {
      readonly ok: true;
      readonly session: Session;
      readonly context: TenantContext;
      readonly decision: PolicyDecision;
    }
  | { readonly ok: false; readonly reasonCode: string };

export interface KeycloakAuthDeps {
  readonly verifier: KeycloakTokenVerifier;
  readonly identity: IdentityDirectory;
  readonly sessions: SessionService;
  readonly memberships: TenantMembershipDirectory;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly requireEmailVerified?: boolean;
}

export interface KeycloakAuthService {
  authenticate(rawToken: string): Promise<AuthenticateOutcome>;
  selectTenant(
    sessionId: string,
    tenantId: string,
    action?: string,
  ): Promise<TenantSelectionOutcome>;
  logout(sessionId: string): Promise<{ ok: boolean; reasonCode: string }>;
  revoke(sessionId: string, reason: string): Promise<{ ok: boolean; reasonCode: string }>;
}

export function createKeycloakAuthService(deps: KeycloakAuthDeps): KeycloakAuthService {
  let seq = 0;

  async function emit(input: {
    eventType: string;
    tenantId: string;
    actorId: string;
    action: string;
    outcome: "success" | "denied" | "failed";
    reasonCode?: string;
    metadata?: Readonly<Record<string, string>>;
  }): Promise<void> {
    seq += 1;
    await deps.audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [input.tenantId, input.actorId, input.eventType, String(seq)]),
        eventType: input.eventType,
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        outcome: input.outcome,
        reasonCode: input.reasonCode ?? "ok",
        recordedByComponent: "keycloak-auth",
        metadata: input.metadata ?? {},
      }),
    );
  }

  return {
    async authenticate(rawToken) {
      let token: VerifiedKeycloakToken;
      try {
        token = deps.verifier.verify(rawToken);
      } catch (error) {
        const reasonCode =
          error instanceof KeycloakTokenError ? error.reasonCode : "token-verification-failed";
        const eventType =
          reasonCode === "brokered-upstream-issuer-presented-directly"
            ? "authentication.brokered_identity.denied"
            : reasonCode === "issuer-not-keycloak"
              ? "authentication.keycloak.denied"
              : "authentication.token.denied";
        await emit({
          eventType,
          tenantId: PLATFORM_SCOPE,
          actorId: UNAUTHENTICATED,
          action: "authentication.token.validate",
          outcome: "denied",
          reasonCode,
        });
        return { ok: false, reasonCode };
      }

      const options =
        deps.requireEmailVerified === undefined
          ? {}
          : { requireEmailVerified: deps.requireEmailVerified };
      const resolution = resolveActorFromToken(token, deps.identity, options);
      if (!resolution.ok) {
        await emit({
          eventType: "authentication.login.failed",
          tenantId: PLATFORM_SCOPE,
          actorId: UNAUTHENTICATED,
          action: "authentication.login",
          outcome: "denied",
          reasonCode: resolution.reasonCode,
          metadata: {
            keycloakRealm: token.keycloakRealm,
            subjectHash: opaqueHash(token.keycloakSubject),
            brokerAlias: token.provenance.brokerAlias ?? "none",
          },
        });
        return { ok: false, reasonCode: resolution.reasonCode };
      }

      const actor = resolution.actor;
      const session = deps.sessions.create({
        actorId: actor.actorId,
        keycloakRealm: token.keycloakRealm,
        keycloakSubject: token.keycloakSubject,
        keycloakSessionState: token.keycloakSessionState,
        assuranceLevel: token.assuranceLevel,
      });
      await emit({
        eventType: "authentication.session.created",
        tenantId: PLATFORM_SCOPE,
        actorId: actor.actorId,
        action: "authentication.session.create",
        outcome: "success",
        metadata: { sessionId: session.sessionId, assuranceLevel: session.assuranceLevel },
      });
      await emit({
        eventType: "authentication.login",
        tenantId: PLATFORM_SCOPE,
        actorId: actor.actorId,
        action: "authentication.login",
        outcome: "success",
        metadata: {
          keycloakRealm: token.keycloakRealm,
          brokerAlias: token.provenance.brokerAlias ?? "none",
          emailVerified: String(token.emailVerified),
        },
      });
      return { ok: true, session, actor, token };
    },

    async selectTenant(sessionId, tenantId, action = "tenant.members.read") {
      const validation = deps.sessions.validate(sessionId);
      if (!validation.ok) {
        await emit({
          eventType: "authentication.tenant_selection.denied",
          tenantId,
          actorId: UNAUTHENTICATED,
          action: "authentication.tenant.select",
          outcome: "denied",
          reasonCode: validation.reasonCode,
        });
        return { ok: false, reasonCode: validation.reasonCode };
      }
      const session = validation.session;

      // USF-authoritative membership is required. A Keycloak claim/role/group/broker
      // alias is NEVER consulted here — only an active USF membership grants access.
      const membership = deps.memberships.membership({ actorId: session.actorId, tenantId });
      if (!membership || membership.status !== "active") {
        await emit({
          eventType: "authentication.tenant_selection.denied",
          tenantId,
          actorId: session.actorId,
          action: "authentication.tenant.select",
          outcome: "denied",
          reasonCode: "no-active-membership",
        });
        return { ok: false, reasonCode: "no-active-membership" };
      }

      // Roles come from USF membership, not the token. The PDP makes the decision.
      const context = createTenantContext({
        tenantId,
        actorId: session.actorId,
        roles: membership.roles,
      });
      const decision = deps.pdp.decide({
        context,
        action,
        resource: { type: "tenant-session", id: tenantId, tenantId, attributes: {} },
      });
      if (decision.effect !== "permit") {
        await emit({
          eventType: "authentication.tenant_selection.denied",
          tenantId,
          actorId: session.actorId,
          action,
          outcome: "denied",
          reasonCode: decision.reasonCode,
          metadata: { decisionId: decision.decisionId, policyVersion: decision.policyVersion },
        });
        return { ok: false, reasonCode: decision.reasonCode };
      }

      const updated = deps.sessions.selectTenant(sessionId, tenantId);
      if (!updated.ok) {
        return { ok: false, reasonCode: updated.reasonCode };
      }
      await emit({
        eventType: "tenant.context.accepted",
        tenantId,
        actorId: session.actorId,
        action,
        outcome: "success",
        metadata: { sessionId: session.sessionId, decisionId: decision.decisionId },
      });
      return { ok: true, session: updated.session, context, decision };
    },

    async logout(sessionId) {
      const session = deps.sessions.logout(sessionId);
      if (!session) {
        return { ok: false, reasonCode: "no-session" };
      }
      await emit({
        eventType: "authentication.logout",
        tenantId: session.selectedTenantId ?? PLATFORM_SCOPE,
        actorId: session.actorId,
        action: "authentication.logout",
        outcome: "success",
        metadata: { sessionId: session.sessionId },
      });
      return { ok: true, reasonCode: "logged-out" };
    },

    async revoke(sessionId, reason) {
      const session = deps.sessions.revoke(sessionId, reason);
      if (!session) {
        return { ok: false, reasonCode: "no-session" };
      }
      await emit({
        eventType: "authentication.session.revoked",
        tenantId: session.selectedTenantId ?? PLATFORM_SCOPE,
        actorId: session.actorId,
        action: "authentication.session.revoke",
        outcome: "success",
        reasonCode: reason,
        metadata: { sessionId: session.sessionId },
      });
      return { ok: true, reasonCode: "revoked" };
    },
  };
}
