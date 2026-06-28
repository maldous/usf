import {
  type AssuranceLevel,
  opaqueHash,
  type Session,
  type SessionRiskLevel,
  stableId,
} from "@foundation/core";
import type { SessionStore } from "@foundation/ports";

// Tenant-bound session lifecycle (parity-auth-keycloak-broker, USF-133 / ADR 0012).
// Sessions expire (absolute + idle), revoke, and log out — all fail closed. Only an
// `active`, unexpired, non-revoked session validates. No raw token/cookie/refresh
// token/credential is ever stored; the Keycloak subject and session id are kept as
// opaque hashes so they are safe in audit/evidence.

export class InMemorySessionStore implements SessionStore {
  readonly #byId = new Map<string, Session>();

  create(session: Session): void {
    this.#byId.set(session.sessionId, session);
  }

  get(sessionId: string): Session | undefined {
    return this.#byId.get(sessionId);
  }

  put(session: Session): void {
    this.#byId.set(session.sessionId, session);
  }

  forActor(actorId: string): readonly Session[] {
    return [...this.#byId.values()].filter((s) => s.actorId === actorId);
  }
}

export type SessionDenyReason =
  | "no-session"
  | "session-expired"
  | "session-idle-expired"
  | "session-revoked"
  | "session-logged-out"
  | "session-invalid";

export type SessionValidation =
  | { readonly ok: true; readonly session: Session }
  | { readonly ok: false; readonly reasonCode: SessionDenyReason };

export interface SessionService {
  create(input: {
    actorId: string;
    keycloakRealm: string;
    keycloakSubject: string;
    keycloakSessionState?: string | null;
    assuranceLevel: AssuranceLevel;
    selectedTenantId?: string | null;
    riskLevel?: SessionRiskLevel;
  }): Session;
  validate(sessionId: string): SessionValidation;
  selectTenant(sessionId: string, tenantId: string): SessionValidation;
  revoke(sessionId: string, reason: string): Session | undefined;
  logout(sessionId: string): Session | undefined;
  get(sessionId: string): Session | undefined;
}

export interface SessionServiceDeps {
  readonly store: SessionStore;
  readonly now?: () => Date;
  /** Absolute session lifetime; MUST be > 0 (no unbounded sessions). */
  readonly sessionTtlSec?: number;
  /** Idle timeout; MUST be > 0. */
  readonly idleTtlSec?: number;
}

export function createSessionService(deps: SessionServiceDeps): SessionService {
  const clock = deps.now ?? (() => new Date());
  const sessionTtlSec = deps.sessionTtlSec ?? 3600;
  const idleTtlSec = deps.idleTtlSec ?? 900;
  if (sessionTtlSec <= 0 || idleTtlSec <= 0) {
    throw new Error("session TTLs must be positive (no unbounded session)");
  }
  let sequence = 0;

  function freeze(session: Session): Session {
    return Object.freeze(session);
  }

  return {
    create(input) {
      const now = clock();
      sequence += 1;
      const authenticationTime = now.toISOString();
      const sessionId = `sess_${opaqueHash(
        stableId("session", [
          input.actorId,
          input.keycloakRealm,
          input.keycloakSubject,
          authenticationTime,
          String(sequence),
        ]),
      ).slice(0, 40)}`;
      const session: Session = freeze({
        sessionId,
        actorId: input.actorId,
        keycloakRealm: input.keycloakRealm,
        keycloakSubjectHash: opaqueHash(input.keycloakSubject),
        keycloakSessionIdHash:
          input.keycloakSessionState != null ? opaqueHash(input.keycloakSessionState) : null,
        selectedTenantId: input.selectedTenantId ?? null,
        assuranceLevel: input.assuranceLevel,
        status: "active",
        riskLevel: input.riskLevel ?? "low",
        authenticationTime,
        lastActivityAt: authenticationTime,
        expiresAt: new Date(now.getTime() + sessionTtlSec * 1000).toISOString(),
        idleExpiresAt: new Date(now.getTime() + idleTtlSec * 1000).toISOString(),
        revokedAt: null,
        revocationReason: null,
      });
      deps.store.create(session);
      return session;
    },

    get(sessionId) {
      return deps.store.get(sessionId);
    },

    validate(sessionId) {
      const session = deps.store.get(sessionId);
      if (!session) {
        return { ok: false, reasonCode: "no-session" };
      }
      if (session.status === "revoked") {
        return { ok: false, reasonCode: "session-revoked" };
      }
      if (session.status === "logged_out") {
        return { ok: false, reasonCode: "session-logged-out" };
      }
      const now = clock();
      if (now >= new Date(session.expiresAt)) {
        deps.store.put(freeze({ ...session, status: "expired" }));
        return { ok: false, reasonCode: "session-expired" };
      }
      if (now >= new Date(session.idleExpiresAt)) {
        deps.store.put(freeze({ ...session, status: "expired" }));
        return { ok: false, reasonCode: "session-idle-expired" };
      }
      if (session.status !== "active" && session.status !== "created") {
        return { ok: false, reasonCode: "session-invalid" };
      }
      const touched: Session = freeze({
        ...session,
        status: "active",
        lastActivityAt: now.toISOString(),
        idleExpiresAt: new Date(now.getTime() + idleTtlSec * 1000).toISOString(),
      });
      deps.store.put(touched);
      return { ok: true, session: touched };
    },

    selectTenant(sessionId, tenantId) {
      const validation = this.validate(sessionId);
      if (!validation.ok) {
        return validation;
      }
      const updated: Session = freeze({ ...validation.session, selectedTenantId: tenantId });
      deps.store.put(updated);
      return { ok: true, session: updated };
    },

    revoke(sessionId, reason) {
      const session = deps.store.get(sessionId);
      if (!session) {
        return undefined;
      }
      const revoked: Session = freeze({
        ...session,
        status: "revoked",
        revokedAt: clock().toISOString(),
        revocationReason: reason,
      });
      deps.store.put(revoked);
      return revoked;
    },

    logout(sessionId) {
      const session = deps.store.get(sessionId);
      if (!session) {
        return undefined;
      }
      const out: Session = freeze({
        ...session,
        status: "logged_out",
        revokedAt: clock().toISOString(),
        revocationReason: "logout",
      });
      deps.store.put(out);
      return out;
    },
  };
}
