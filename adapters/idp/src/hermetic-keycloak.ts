import { createHmac, generateKeyPairSync, sign as cryptoSign, type KeyObject } from "node:crypto";
import type { Jwk, Jwks, KeycloakVerifierConfig } from "./keycloak-verifier.ts";

// Hermetic Keycloak-equivalent token issuer (parity-auth-keycloak-broker, USF-133).
//
// HERMETIC FIXTURE ONLY — for tests and the auth proof. It is the legitimate
// substrate for proving the USF token-validation code path (Charter §6.2). It is NOT
// a live Keycloak and its evidence is NEVER live-external-provider or production-live
// evidence (Charter §6.3). It can also forge invalid tokens (wrong issuer/audience/
// signature/algorithm/key/expiry/not-before) to prove the verifier fails closed.

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function encodeSeg(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

export interface HermeticTokenInput {
  readonly subject: string;
  readonly email?: string | null;
  readonly emailVerified?: boolean;
  readonly audience?: string | readonly string[];
  readonly issuer?: string;
  readonly realm?: string;
  readonly expiresInSec?: number;
  readonly notBeforeSec?: number;
  readonly iatOffsetSec?: number;
  readonly acr?: string;
  readonly brokerAlias?: string | null;
  readonly brokeredSubject?: string | null;
  readonly brokeredIssuer?: string | null;
  readonly emailVerifiedUpstream?: boolean;
  readonly realmRoles?: readonly string[];
  readonly groups?: readonly string[];
}

export interface HermeticForgeOptions {
  /** Override the header `alg` to forge an unsupported-algorithm token (e.g. "none", "HS256"). */
  readonly alg?: string;
  /** Override the header `kid` to forge an unknown-key token. */
  readonly kid?: string;
  /** Sign with a different RSA key to forge an invalid-signature token. */
  readonly signWithWrongKey?: boolean;
}

export class HermeticKeycloak {
  readonly issuer: string;
  readonly realm: string;
  readonly audience: string;
  readonly kid: string;
  readonly #privateKey: KeyObject;
  readonly #publicKey: KeyObject;
  readonly #now: () => number;

  constructor(
    opts: {
      issuer?: string;
      realm?: string;
      audience?: string;
      kid?: string;
      now?: () => number;
    } = {},
  ) {
    this.realm = opts.realm ?? "foundation";
    this.issuer = opts.issuer ?? `https://keycloak.hermetic.test/realms/${this.realm}`;
    this.audience = opts.audience ?? "usf-foundation-client";
    this.kid = opts.kid ?? "hermetic-key-1";
    this.#now = opts.now ?? (() => Math.floor(Date.now() / 1000));
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    this.#privateKey = privateKey;
    this.#publicKey = publicKey;
  }

  /** The realm public key set, in the shape the verifier consumes. */
  jwks(): Jwks {
    const exported = this.#publicKey.export({ format: "jwk" }) as { n: string; e: string };
    const key: Jwk = {
      kty: "RSA",
      kid: this.kid,
      use: "sig",
      alg: "RS256",
      n: exported.n,
      e: exported.e,
    };
    return { keys: [key] };
  }

  /** A verifier config that trusts exactly this hermetic realm. */
  verifierConfig(overrides: Partial<KeycloakVerifierConfig> = {}): KeycloakVerifierConfig {
    return {
      issuer: this.issuer,
      realm: this.realm,
      audience: this.audience,
      jwks: this.jwks(),
      now: this.#now,
      ...overrides,
    };
  }

  issueToken(input: HermeticTokenInput, forge: HermeticForgeOptions = {}): string {
    const iat = this.#now() + (input.iatOffsetSec ?? 0);
    const exp = iat + (input.expiresInSec ?? 300);
    const alg = forge.alg ?? "RS256";
    const header = { alg, kid: forge.kid ?? this.kid, typ: "JWT" };
    const payload: Record<string, unknown> = {
      iss: input.issuer ?? this.issuer,
      sub: input.subject,
      aud: input.audience ?? this.audience,
      iat,
      exp,
      email_verified: input.emailVerified ?? false,
      session_state: `kc-sess-${input.subject}`,
      realm_access: { roles: [...(input.realmRoles ?? [])] },
      groups: [...(input.groups ?? [])],
    };
    if (input.notBeforeSec !== undefined) payload["nbf"] = iat + input.notBeforeSec;
    if (input.email !== undefined && input.email !== null) payload["email"] = input.email;
    if (input.acr !== undefined) payload["acr"] = input.acr;
    if (input.brokerAlias !== undefined && input.brokerAlias !== null)
      payload["broker_alias"] = input.brokerAlias;
    if (input.brokeredSubject !== undefined && input.brokeredSubject !== null)
      payload["brokered_subject"] = input.brokeredSubject;
    if (input.brokeredIssuer !== undefined && input.brokeredIssuer !== null)
      payload["brokered_issuer"] = input.brokeredIssuer;
    if (input.emailVerifiedUpstream !== undefined)
      payload["email_verified_upstream"] = input.emailVerifiedUpstream;

    const headerSeg = encodeSeg(header);
    const payloadSeg = encodeSeg(payload);
    const signingInput = `${headerSeg}.${payloadSeg}`;

    let signatureSeg: string;
    if (alg === "none") {
      signatureSeg = "";
    } else if (alg === "HS256") {
      signatureSeg = b64url(
        createHmac("sha256", "hermetic-symmetric-secret").update(signingInput).digest(),
      );
    } else {
      const key = forge.signWithWrongKey
        ? generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey
        : this.#privateKey;
      signatureSeg = b64url(cryptoSign("RSA-SHA256", Buffer.from(signingInput), key));
    }
    return `${headerSeg}.${payloadSeg}.${signatureSeg}`;
  }
}
