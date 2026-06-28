import { createKeycloakTokenVerifier, HermeticKeycloak } from "@foundation/adapter-idp";
import { KeycloakTokenError } from "@foundation/core";
import type { KeycloakTokenVerifier } from "@foundation/ports";
import { beforeEach, describe, expect, it } from "vitest";

const NOW = 1_700_000_000;
const UPSTREAM = "https://upstream.broker.invalid/op";

function build(): { kc: HermeticKeycloak; verifier: KeycloakTokenVerifier } {
  const kc = new HermeticKeycloak({ now: () => NOW });
  const verifier = createKeycloakTokenVerifier(
    kc.verifierConfig({ brokeredUpstreamIssuers: [UPSTREAM] }),
  );
  return { kc, verifier };
}

function reason(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof KeycloakTokenError) return error.reasonCode;
    throw error;
  }
  throw new Error("expected a KeycloakTokenError but none was thrown");
}

describe("Keycloak-issued token verifier", () => {
  let kc: HermeticKeycloak;
  let verifier: KeycloakTokenVerifier;
  beforeEach(() => {
    ({ kc, verifier } = build());
  });

  it("accepts a valid Keycloak-issued token and exposes opaque brokered provenance", () => {
    const token = kc.issueToken({
      subject: "sub-1",
      email: "a@a.example",
      emailVerified: true,
      acr: "loa2",
      brokerAlias: "alias-opaque",
    });
    const verified = verifier.verify(token);
    expect(verified.keycloakSubject).toBe("sub-1");
    expect(verified.keycloakRealm).toBe(kc.realm);
    expect(verified.assuranceLevel).toBe("loa2-mfa-or-stronger");
    expect(verified.provenance.brokerAlias).toBe("alias-opaque");
    expect(verified.email).toBe("a@a.example");
  });

  it("rejects a non-Keycloak issuer", () => {
    expect(
      reason(() =>
        verifier.verify(kc.issueToken({ subject: "s", issuer: "https://nope.invalid/realms/x" })),
      ),
    ).toBe("issuer-not-keycloak");
  });

  it("rejects a brokered-upstream issuer presented directly", () => {
    expect(reason(() => verifier.verify(kc.issueToken({ subject: "s", issuer: UPSTREAM })))).toBe(
      "brokered-upstream-issuer-presented-directly",
    );
  });

  it("rejects audience mismatch", () => {
    expect(reason(() => verifier.verify(kc.issueToken({ subject: "s", audience: "other" })))).toBe(
      "audience-mismatch",
    );
  });

  it("rejects an invalid signature", () => {
    expect(
      reason(() => verifier.verify(kc.issueToken({ subject: "s" }, { signWithWrongKey: true }))),
    ).toBe("invalid-signature");
  });

  it("rejects an expired token", () => {
    expect(reason(() => verifier.verify(kc.issueToken({ subject: "s", expiresInSec: -100 })))).toBe(
      "expired",
    );
  });

  it("rejects a not-yet-valid token", () => {
    expect(
      reason(() => verifier.verify(kc.issueToken({ subject: "s", notBeforeSec: 10_000 }))),
    ).toBe("not-yet-valid");
  });

  it("rejects a token issued in the future", () => {
    expect(
      reason(() => verifier.verify(kc.issueToken({ subject: "s", iatOffsetSec: 10_000 }))),
    ).toBe("issued-in-future");
  });

  it("rejects alg none and HS256 (algorithm allow-list is RS256)", () => {
    expect(reason(() => verifier.verify(kc.issueToken({ subject: "s" }, { alg: "none" })))).toBe(
      "unsupported-algorithm",
    );
    expect(reason(() => verifier.verify(kc.issueToken({ subject: "s" }, { alg: "HS256" })))).toBe(
      "unsupported-algorithm",
    );
  });

  it("rejects an unknown signing key (kid)", () => {
    expect(reason(() => verifier.verify(kc.issueToken({ subject: "s" }, { kid: "ghost" })))).toBe(
      "unknown-key",
    );
  });

  it("rejects a malformed token", () => {
    expect(reason(() => verifier.verify("not-a-jwt"))).toBe("malformed-token");
  });

  it("rejects a token missing a subject", () => {
    expect(reason(() => verifier.verify(kc.issueToken({ subject: "" })))).toBe("missing-subject");
  });
});
