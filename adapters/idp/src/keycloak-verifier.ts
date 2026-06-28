import {
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";
import {
  type AssuranceLevel,
  type BrokeredIdentityProvenance,
  KEYCLOAK_TOKEN_ALG_ALLOWLIST,
  KeycloakTokenError,
  type VerifiedKeycloakToken,
} from "@foundation/core";
import type { KeycloakTokenVerifier } from "@foundation/ports";

// Keycloak-issued OIDC/JWT verifier (parity-auth-keycloak-broker, USF-133 / ADR 0012).
//
// This is the ONLY USF token-validation path. Keycloak is the only accepted issuer;
// USF validates Keycloak-issued tokens locally against the realm JWKS and fails closed
// on every invalid issuer (including a brokered-upstream issuer presented directly),
// audience, signature, algorithm, key, expiry, and not-before. Upstream providers are
// opaque brokered provenance only — never validated, named, or accepted directly.
//
// RS256 only. Uses node:crypto (no external dependency, no live network/JWKS fetch —
// the realm key set is injected; a live discovery/JWKS-refresh adapter is DEFERRED).

export interface Jwk {
  readonly kty: string;
  readonly kid?: string;
  readonly use?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
}

export interface Jwks {
  readonly keys: readonly Jwk[];
}

export interface KeycloakVerifierConfig {
  /** The sole accepted issuer: the Keycloak realm issuer URL. */
  readonly issuer: string;
  readonly realm: string;
  /** The expected audience (the USF Keycloak client). */
  readonly audience: string;
  /** The Keycloak realm public key set (RSA). Injected, not fetched. */
  readonly jwks: Jwks;
  readonly clockSkewSec?: number;
  /** Seconds-epoch clock; injectable for deterministic hermetic proof. */
  readonly now?: () => number;
  /** Opaque set of brokered-upstream issuers that MUST be rejected if presented
   *  directly to USF (defence in depth; the issuer!=keycloak check already rejects
   *  them, this makes the intent explicit and auditable). No provider is named. */
  readonly brokeredUpstreamIssuers?: readonly string[];
}

interface RawClaims {
  readonly iss?: unknown;
  readonly sub?: unknown;
  readonly aud?: unknown;
  readonly exp?: unknown;
  readonly nbf?: unknown;
  readonly iat?: unknown;
  readonly email?: unknown;
  readonly email_verified?: unknown;
  readonly acr?: unknown;
  readonly session_state?: unknown;
  readonly sid?: unknown;
  readonly broker_alias?: unknown;
  readonly brokered_subject?: unknown;
  readonly brokered_issuer?: unknown;
  readonly email_verified_upstream?: unknown;
  readonly realm_access?: unknown;
  readonly groups?: unknown;
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

function asStringArray(value: unknown): readonly string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return typeof value === "string" ? [value] : [];
}

function assuranceFromAcr(acr: unknown): AssuranceLevel {
  // acr is an authentication input only; it never authorizes. Conservative mapping.
  if (acr === "loa4" || acr === "4") return "loa4-high-assurance-admin";
  if (acr === "loa3" || acr === "3") return "loa3-phishing-resistant-or-admin-approved";
  if (acr === "loa2" || acr === "2") return "loa2-mfa-or-stronger";
  if (acr === "loa1" || acr === "1") return "loa1-password-or-brokered-basic";
  return "loa0-unknown";
}

function keyFromJwk(jwk: Jwk): KeyObject {
  return createPublicKey({ key: jwk as unknown as Record<string, unknown>, format: "jwk" });
}

export function createKeycloakTokenVerifier(config: KeycloakVerifierConfig): KeycloakTokenVerifier {
  const skew = config.clockSkewSec ?? 60;
  const clock = config.now ?? (() => Math.floor(Date.now() / 1000));
  const brokeredUpstream = new Set(config.brokeredUpstreamIssuers ?? []);

  return {
    verify(token: string): VerifiedKeycloakToken {
      const parts = typeof token === "string" ? token.split(".") : [];
      if (parts.length !== 3) {
        throw new KeycloakTokenError("malformed-token");
      }
      const [headerSeg, payloadSeg, signatureSeg] = parts as [string, string, string];

      let header: { alg?: unknown; kid?: unknown };
      try {
        header = decodeSegment<{ alg?: unknown; kid?: unknown }>(headerSeg);
      } catch {
        throw new KeycloakTokenError("malformed-token");
      }

      // Algorithm allow-list FIRST: reject `none`, HS*, and anything outside RS256.
      if (
        typeof header.alg !== "string" ||
        !KEYCLOAK_TOKEN_ALG_ALLOWLIST.includes(header.alg as never)
      ) {
        throw new KeycloakTokenError("unsupported-algorithm");
      }
      // Key resolution by kid; an unknown/absent kid fails closed.
      const kid = typeof header.kid === "string" ? header.kid : null;
      const jwk = kid ? config.jwks.keys.find((k) => k.kid === kid) : undefined;
      if (!jwk || jwk.kty !== "RSA") {
        throw new KeycloakTokenError("unknown-key");
      }
      // Signature verification over the signing input.
      const signingInput = Buffer.from(`${headerSeg}.${payloadSeg}`);
      const signatureValid = ((): boolean => {
        try {
          return cryptoVerify(
            "RSA-SHA256",
            signingInput,
            keyFromJwk(jwk),
            Buffer.from(signatureSeg, "base64url"),
          );
        } catch {
          return false;
        }
      })();
      if (!signatureValid) {
        throw new KeycloakTokenError("invalid-signature");
      }

      let claims: RawClaims;
      try {
        claims = decodeSegment<RawClaims>(payloadSeg);
      } catch {
        throw new KeycloakTokenError("malformed-token");
      }

      // Issuer: Keycloak realm issuer ONLY. A brokered-upstream issuer presented
      // directly is rejected with an explicit, distinct reason.
      const iss = typeof claims.iss === "string" ? claims.iss : "";
      if (!iss) {
        throw new KeycloakTokenError("issuer-not-keycloak");
      }
      if (brokeredUpstream.has(iss)) {
        throw new KeycloakTokenError("brokered-upstream-issuer-presented-directly");
      }
      if (iss !== config.issuer) {
        throw new KeycloakTokenError("issuer-not-keycloak");
      }

      // Audience must include the configured USF client.
      const aud = asStringArray(claims.aud);
      if (!aud.includes(config.audience)) {
        throw new KeycloakTokenError("audience-mismatch");
      }

      const now = clock();
      const exp = typeof claims.exp === "number" ? claims.exp : 0;
      if (!exp || now > exp + skew) {
        throw new KeycloakTokenError("expired");
      }
      if (typeof claims.nbf === "number" && now < claims.nbf - skew) {
        throw new KeycloakTokenError("not-yet-valid");
      }
      if (typeof claims.iat === "number" && claims.iat > now + skew) {
        throw new KeycloakTokenError("issued-in-future");
      }

      const sub = typeof claims.sub === "string" ? claims.sub : "";
      if (!sub) {
        throw new KeycloakTokenError("missing-subject");
      }
      if (!config.realm) {
        throw new KeycloakTokenError("missing-realm");
      }

      const provenance: BrokeredIdentityProvenance = Object.freeze({
        brokerAlias: typeof claims.broker_alias === "string" ? claims.broker_alias : null,
        brokeredSubjectRef:
          typeof claims.brokered_subject === "string" ? claims.brokered_subject : null,
        brokeredIssuerRef:
          typeof claims.brokered_issuer === "string" ? claims.brokered_issuer : null,
        emailVerifiedUpstream: claims.email_verified_upstream === true,
      });

      const realmAccess = claims.realm_access;
      const realmRoles =
        realmAccess && typeof realmAccess === "object" && "roles" in realmAccess
          ? asStringArray((realmAccess as { roles?: unknown }).roles)
          : [];

      return Object.freeze({
        issuer: iss,
        keycloakRealm: config.realm,
        keycloakSubject: sub,
        audience: Object.freeze(aud),
        email: typeof claims.email === "string" ? claims.email.toLowerCase() : null,
        emailVerified: claims.email_verified === true,
        assuranceLevel: assuranceFromAcr(claims.acr),
        issuedAt: typeof claims.iat === "number" ? claims.iat : now,
        notBefore: typeof claims.nbf === "number" ? claims.nbf : null,
        expiresAt: exp,
        keycloakSessionState:
          typeof claims.session_state === "string"
            ? claims.session_state
            : typeof claims.sid === "string"
              ? claims.sid
              : null,
        provenance,
        realmRoleClaims: Object.freeze(realmRoles),
        groupClaims: Object.freeze(asStringArray(claims.groups)),
      });
    },
  };
}

// Re-exported for the hermetic issuer (test/proof) — keeps JWT primitives in one place.
export { cryptoSign, createPublicKey };
