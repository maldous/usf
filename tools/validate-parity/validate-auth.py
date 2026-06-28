#!/usr/bin/env python3
"""USF Keycloak-brokered authentication/identity posture validator (parity-auth, USF-133).

Governance tooling only. It creates no implementation/runtime files, imports no React
source, and publishes no evidence. It fails closed on the auth/identity invariants that
keep Keycloak the sole USF-facing issuer, keep identity an authentication input (never
authorization), and keep tokens/cookies/secrets out of every outward channel (ISO 27001-
supporting technical control evidence only; no certification claim):

  USF-AUTH-001  Keycloak is the sole USF-facing issuer (non-Keycloak issuer rejected)
  USF-AUTH-002  a brokered-upstream issuer presented directly is rejected
  USF-AUTH-003  algorithm allow-list enforced (RS256 only; none/HS* rejected)
  USF-AUTH-004  signature + key-id (JWKS) validation present
  USF-AUTH-005  expiry + not-before validation present
  USF-AUTH-006  audience validation present
  USF-AUTH-007  email is not the primary actor identity (realm+subject key)
  USF-AUTH-008  duplicate email does not merge actors (directory keyed by provider+subject)
  USF-AUTH-009  disabled/unknown identity fails closed
  USF-AUTH-010  sessions have expiry (absolute+idle) + revocation + status, no unbounded session
  USF-AUTH-011  logout/revoke invalidate the session
  USF-AUTH-012  Keycloak claim/role/group/broker alias never authorizes (membership roles only)
  USF-AUTH-013  tenant selection requires an active USF membership
  USF-AUTH-014  no token/cookie/secret in the committed OpenAPI document
  USF-AUTH-015  auth proof exists and makes no live/production overclaim
  USF-AUTH-016  the auth-identity parity matrix row is backed by tests and proofs
  USF-AUTH-017  the Auth & Identity Standard exists and states the no-certification posture
  USF-AUTH-018  no live Keycloak/broker/upstream-provider or production-live overclaim

Live fail-closed behaviour is proven by the hermetic tests and the auth proof (make
auth-proof). Planted defects under tools/validate-parity/auth-planted-defects prove each
rule fires.
"""
import argparse
import json
import os
import sys
from collections import Counter

RULES = {
    "USF-AUTH-001": ("blocking", "Keycloak is not the sole USF-facing issuer"),
    "USF-AUTH-002": ("blocking", "brokered-upstream issuer presented directly is not rejected"),
    "USF-AUTH-003": ("blocking", "token algorithm allow-list (RS256 only) not enforced"),
    "USF-AUTH-004": ("blocking", "signature/key-id (JWKS) validation missing"),
    "USF-AUTH-005": ("blocking", "expiry/not-before validation missing"),
    "USF-AUTH-006": ("blocking", "audience validation missing"),
    "USF-AUTH-007": ("blocking", "email is used as the primary actor identity"),
    "USF-AUTH-008": ("blocking", "duplicate email can merge actors (directory not keyed by subject)"),
    "USF-AUTH-009": ("blocking", "disabled/unknown identity does not fail closed"),
    "USF-AUTH-010": ("blocking", "session lacks expiry/revocation/status semantics"),
    "USF-AUTH-011": ("blocking", "logout/revoke does not invalidate the session"),
    "USF-AUTH-012": ("blocking", "a Keycloak claim/role/group/broker alias can authorize"),
    "USF-AUTH-013": ("blocking", "tenant selection does not require an active membership"),
    "USF-AUTH-014": ("blocking", "token/cookie/secret present in the OpenAPI document"),
    "USF-AUTH-015": ("blocking", "auth proof missing or makes a live/production overclaim"),
    "USF-AUTH-016": ("blocking", "auth-identity parity row lacks tests/proofs backing"),
    "USF-AUTH-017": ("blocking", "Auth & Identity Standard missing or lacks no-certification posture"),
    "USF-AUTH-018": ("blocking", "live Keycloak/broker/provider or production-live overclaim"),
    "USF-AUTH-SELFTEST": ("blocking", "planted auth defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
VERIFIER = "adapters/idp/src/keycloak-verifier.ts"
IDENTITY = "capabilities/auth/src/identity.ts"
SESSION = "capabilities/auth/src/session.ts"
AUTHSVC = "capabilities/auth/src/keycloak-auth.ts"
MEMBERSHIP = "capabilities/tenant/src/membership.ts"
PROOF = "packages/proof/src/auth-identity-proof.ts"
OPENAPI = "packages/openapi/openapi.json"
STANDARD = "docs/architecture/auth-and-identity-standard.md"
SOURCE_FILES = (CORE, VERIFIER, IDENTITY, SESSION, AUTHSVC, MEMBERSHIP, PROOF, OPENAPI, STANDARD)
MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
SELFTEST_DIR = "tools/validate-parity/auth-planted-defects"

OPENAPI_SECRET_NEEDLES = ["Bearer ", "secret://", "-----BEGIN", "client_secret", "eyJ"]


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append({
            "severity": severity,
            "ruleId": rule_id,
            "subject": str(subject),
            "message": message or RULES.get(rule_id, ("", ""))[1],
        })

    def blocking_or_error(self):
        return [f for f in self.items if f["severity"] in ("blocking", "error")]


def find_root(start):
    current = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(current, "docs")) and os.path.isdir(os.path.join(current, "spec")):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            return os.path.abspath(start)
        current = parent


ROOT = find_root(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


def read_text(path):
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def load_matrix():
    if not os.path.exists(MATRIX_PATH):
        return None
    try:
        with open(MATRIX_PATH, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in SOURCE_FILES}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides["matrix"] if "matrix" in overrides else load_matrix()
    return {"files": files, "matrix": matrix}


def auth_row(matrix):
    if not isinstance(matrix, dict):
        return None
    for row in matrix.get("domains", []):
        if isinstance(row, dict) and row.get("react_item_id") == "auth-identity":
            return row
    return None


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files.get(CORE, "")
    verifier = files.get(VERIFIER, "")
    identity = files.get(IDENTITY, "")
    session = files.get(SESSION, "")
    authsvc = files.get(AUTHSVC, "")
    membership = files.get(MEMBERSHIP, "")
    proof = files.get(PROOF, "")
    openapi = files.get(OPENAPI, "")
    standard = files.get(STANDARD, "")

    if "issuer-not-keycloak" not in verifier or "iss !== config.issuer" not in verifier:
        F.add("USF-AUTH-001", VERIFIER, "verifier must reject any issuer that is not the Keycloak realm issuer")
    if "brokered-upstream-issuer-presented-directly" not in verifier:
        F.add("USF-AUTH-002", VERIFIER, "verifier must reject a brokered-upstream issuer presented directly")
    if "KEYCLOAK_TOKEN_ALG_ALLOWLIST" not in core or '"RS256"' not in core:
        F.add("USF-AUTH-003", CORE, "an RS256-only algorithm allow-list must exist")
    if "unsupported-algorithm" not in verifier or "KEYCLOAK_TOKEN_ALG_ALLOWLIST" not in verifier:
        F.add("USF-AUTH-003", VERIFIER, "verifier must enforce the algorithm allow-list (reject none/HS*)")
    if not ("invalid-signature" in verifier and "unknown-key" in verifier and "cryptoVerify" in verifier):
        F.add("USF-AUTH-004", VERIFIER, "verifier must verify the signature and resolve the key by id (JWKS)")
    if not ("expired" in verifier and "not-yet-valid" in verifier):
        F.add("USF-AUTH-005", VERIFIER, "verifier must validate expiry and not-before")
    if "audience-mismatch" not in verifier:
        F.add("USF-AUTH-006", VERIFIER, "verifier must validate the audience")
    if "keycloakExternalSubject" not in core or "keycloakExternalSubject" not in identity:
        F.add("USF-AUTH-007", IDENTITY, "actor identity must key on Keycloak realm+subject, not email")
    if "${input.identityProvider}:${input.externalSubject}" not in membership:
        F.add("USF-AUTH-008", MEMBERSHIP, "identity directory must be keyed by provider+subject (no merge by email)")
    if not ("identity-disabled" in identity and "unknown-identity" in identity and "actor.enabled" in identity):
        F.add("USF-AUTH-009", IDENTITY, "disabled and unknown identities must fail closed")
    if not ("expiresAt" in core and "idleExpiresAt" in core and "revokedAt" in core and "SESSION_STATUSES" in core):
        F.add("USF-AUTH-010", CORE, "session model must carry expiry (absolute+idle), revocation, and status")
    if not ("session-expired" in session and "session-revoked" in session and "no unbounded session" in session):
        F.add("USF-AUTH-010", SESSION, "session lifecycle must fail closed on expiry/revoke and forbid unbounded sessions")
    if not ("session-logged-out" in session and "logged_out" in session):
        F.add("USF-AUTH-011", SESSION, "logout must invalidate the session")
    if "membership.roles" not in authsvc or "no-active-membership" not in authsvc:
        F.add("USF-AUTH-012", AUTHSVC, "tenant roles must come from USF membership, never token claims")
    if "token.realmRoleClaims" in authsvc or "token.groupClaims" in authsvc:
        F.add("USF-AUTH-012", AUTHSVC, "token claims must not be passed into the tenant context / authorization")
    if "no-active-membership" not in authsvc or 'membership.status !== "active"' not in authsvc:
        F.add("USF-AUTH-013", AUTHSVC, "tenant selection must require an active USF membership")
    for needle in OPENAPI_SECRET_NEEDLES:
        if needle in openapi:
            F.add("USF-AUTH-014", OPENAPI, f"token/secret-shaped content in OpenAPI: {needle!r}")
    if not proof:
        F.add("USF-AUTH-015", PROOF, "the auth proof must exist")
    else:
        for token in ("liveExternalProviderClaim: false", "liveKeycloakClaim: false",
                      "brokeredUpstreamAcceptedDirectly: false", "productionLiveClaim: false"):
            if token not in proof:
                F.add("USF-AUTH-015", PROOF, f"auth proof must declare {token} (no overclaim)")
    if not standard:
        F.add("USF-AUTH-017", STANDARD, "the Auth & Identity Standard must exist")
    elif "no certification claim" not in standard:
        F.add("USF-AUTH-017", STANDARD, "the standard must state the ISO no-certification posture")
    # USF-AUTH-018: outward overclaim guards across proof + standard.
    if "productionLiveClaim: true" in proof or "liveKeycloakClaim: true" in proof:
        F.add("USF-AUTH-018", PROOF, "auth proof must not claim live Keycloak or production-live")

    row = auth_row(state["matrix"])
    if row is None:
        F.add("USF-AUTH-016", MATRIX_PATH, "auth-identity domain row is missing from the parity matrix")
    elif not (row.get("usf_tests") and row.get("usf_proofs")):
        F.add("USF-AUTH-016", MATRIX_PATH, "auth-identity row must reference USF tests and proofs")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = json.loads(json.dumps(base["matrix"])) if base["matrix"] is not None else None
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if "matrixAuthSet" in mutation and matrix is not None:
        row = auth_row(matrix)
        if row is not None:
            for key, value in mutation["matrixAuthSet"].items():
                row[key] = value
    return {"files": files, "matrix": matrix}


def load_selftest_fixtures(F):
    fixtures = []
    if not os.path.isdir(SELFTEST_DIR):
        return fixtures
    for name in sorted(os.listdir(SELFTEST_DIR)):
        if not name.endswith(".json"):
            continue
        path = f"{SELFTEST_DIR}/{name}"
        try:
            with open(path, encoding="utf-8") as handle:
                fixtures.append((path, json.load(handle)))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-AUTH-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        local = Findings()
        run_checks(local, build_state(apply_mutation(base, fixture.get("mutation", {}))))
        got = {item["ruleId"] for item in local.items}
        if expected not in got:
            F.add("USF-AUTH-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF Keycloak-brokered auth/identity posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["auth", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"auth", "all"}:
        run_checks(F)
    selftest_state = None
    if args.mode in {"selftest", "all"}:
        selftest_state = run_selftest(F)

    if args.json:
        print(json.dumps({"mode": args.mode, "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(item["ruleId"] for item in F.items))
        suffix = "CLEAN" if not F.items else json.dumps(counts)
        if selftest_state == "not-run":
            suffix += "  (selftest: none present)"
        print(f"USF auth validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
