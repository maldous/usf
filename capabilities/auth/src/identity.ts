import {
  type ActorIdentity,
  keycloakExternalSubject,
  type VerifiedKeycloakToken,
} from "@foundation/core";
import type { IdentityDirectory } from "@foundation/ports";

// Maps a validated Keycloak token to a stable internal actor (parity-auth-keycloak-broker,
// USF-133 / ADR 0012). The actor key is Keycloak realm + subject — NEVER email — so
// duplicate emails do not collapse actors and an email change is an attribute update,
// not a new actor. Brokered-upstream provenance is carried opaquely and never used to
// resolve or merge actors. Unknown identities fail closed (JIT is policy-gated/deferred).

export const KEYCLOAK_IDENTITY_PROVIDER = "keycloak";

export type IdentityDenyReason =
  "unknown-identity" | "identity-disabled" | "email-unverified-blocked";

export type IdentityResolution =
  | { readonly ok: true; readonly actor: ActorIdentity }
  | { readonly ok: false; readonly reasonCode: IdentityDenyReason };

export interface ResolveActorOptions {
  /** When true, an actor without a verified email is refused (privileged proof). */
  readonly requireEmailVerified?: boolean;
}

export function resolveActorFromToken(
  token: VerifiedKeycloakToken,
  directory: IdentityDirectory,
  options: ResolveActorOptions = {},
): IdentityResolution {
  const externalSubject = keycloakExternalSubject(token.keycloakRealm, token.keycloakSubject);
  const actor = directory.resolveActor({
    externalSubject,
    identityProvider: KEYCLOAK_IDENTITY_PROVIDER,
  });
  if (!actor) {
    // Unknown brokered identity fails closed. JIT actor creation is policy-gated and
    // deferred; there is no silent actor creation and no merge-by-email.
    return { ok: false, reasonCode: "unknown-identity" };
  }
  if (!actor.enabled) {
    return { ok: false, reasonCode: "identity-disabled" };
  }
  if (options.requireEmailVerified && !actor.emailVerified) {
    return { ok: false, reasonCode: "email-unverified-blocked" };
  }
  return { ok: true, actor };
}

/** Builds the ActorIdentity to seed the directory from a verified token. The actorId is
 *  a stable internal id derived from realm+subject (never email). */
export function actorFromVerifiedToken(
  token: VerifiedKeycloakToken,
  actorId: string,
  enabled = true,
): ActorIdentity {
  return Object.freeze({
    actorId,
    externalSubject: keycloakExternalSubject(token.keycloakRealm, token.keycloakSubject),
    identityProvider: KEYCLOAK_IDENTITY_PROVIDER,
    email: token.email ?? "",
    emailVerified: token.emailVerified,
    enabled,
  });
}
