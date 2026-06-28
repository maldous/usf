#!/usr/bin/env python3
"""USF configuration/secrets posture validator (parity-config-secrets, USF-144).

Governance tooling only. It creates no implementation/runtime files, imports no
React source, and publishes no evidence. It fails closed on the config/secrets
invariants that keep configuration a safe control plane and keep secret VALUES out
of every outward channel (ISO 27001-supporting technical control evidence only; no
certification claim):

  USF-CONFIG-001  config items are classified (classification model present)
  USF-CONFIG-002  config items carry owner and scope
  USF-CONFIG-003  required config fails closed when absent
  USF-CONFIG-004  secrets are referenced (SecretReference), distinct from values
  USF-CONFIG-005  secret-like keys are blocked + redaction exists
  USF-CONFIG-006  no secret value appears in the committed OpenAPI document
  USF-CONFIG-007  config retrieval is PDP-protected
  USF-CONFIG-008  config retrieval is tenant-scoped
  USF-CONFIG-009  secret access is PDP-guarded and audited (without value)
  USF-CONFIG-010  feature flags have a safe default + deterministic evaluation
  USF-CONFIG-011  config-change evidence is value-free (hashes, not raw values)
  USF-CONFIG-012  no live external secret-manager/provider/production-live overclaim
  USF-CONFIG-013  provider credentials are secret references (not embedded)
  USF-CONFIG-014  config routes are tenant-context guarded
  USF-CONFIG-015  the config parity matrix row is backed by tests and proofs

Live fail-closed / redaction / isolation behaviour is proven by the hermetic tests
and the config proof (make config-proof). Planted defects under
tools/validate-parity/config-planted-defects prove each rule fires.
"""
import argparse
import json
import os
import sys
from collections import Counter

RULES = {
    "USF-CONFIG-001": ("blocking", "config classification model missing"),
    "USF-CONFIG-002": ("blocking", "config items lack owner/scope"),
    "USF-CONFIG-003": ("blocking", "required config does not fail closed"),
    "USF-CONFIG-004": ("blocking", "secret-reference model missing"),
    "USF-CONFIG-005": ("blocking", "secret-like key blocking/redaction missing"),
    "USF-CONFIG-006": ("blocking", "secret value present in the OpenAPI document"),
    "USF-CONFIG-007": ("blocking", "config retrieval is not PDP-protected"),
    "USF-CONFIG-008": ("blocking", "config retrieval is not tenant-scoped"),
    "USF-CONFIG-009": ("blocking", "secret access is not PDP-guarded/audited"),
    "USF-CONFIG-010": ("blocking", "feature flags lack a safe default"),
    "USF-CONFIG-011": ("blocking", "config-change evidence is not value-free"),
    "USF-CONFIG-012": ("blocking", "live secret-manager/provider/production-live overclaim"),
    "USF-CONFIG-013": ("blocking", "provider credentials are not secret references"),
    "USF-CONFIG-014": ("blocking", "config routes are not tenant-context guarded"),
    "USF-CONFIG-015": ("blocking", "config parity matrix row lacks tests/proofs backing"),
    "USF-CONFIG-SELFTEST": ("blocking", "planted config defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
REGISTRY = "capabilities/config/src/registry.ts"
CONFIG_SVC = "capabilities/config/src/config-service.ts"
SECRET_SVC = "capabilities/config/src/secret-service.ts"
SERVER = "apps/api/src/server.ts"
PROOF = "packages/proof/src/config-secrets-proof.ts"
OPENAPI = "packages/openapi/openapi.json"
SOURCE_FILES = (CORE, REGISTRY, CONFIG_SVC, SECRET_SVC, SERVER, PROOF, OPENAPI)
MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
SELFTEST_DIR = "tools/validate-parity/config-planted-defects"

REQUIRED_SECRET_KEYS = ['"password"', '"secret"', '"token"', '"api_key"', '"client_secret"', '"private_key"', '"authorization"', '"cookie"']
OPENAPI_SECRET_NEEDLES = ["Bearer ", "secret://", "-----BEGIN", '"password"', "client_secret"]


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


def config_row(matrix):
    if not isinstance(matrix, dict):
        return None
    for row in matrix.get("domains", []):
        if isinstance(row, dict) and row.get("react_item_id") == "config-secrets":
            return row
    return None


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files.get(CORE, "")
    registry = files.get(REGISTRY, "")
    config_svc = files.get(CONFIG_SVC, "")
    secret_svc = files.get(SECRET_SVC, "")
    server = files.get(SERVER, "")
    proof = files.get(PROOF, "")
    openapi = files.get(OPENAPI, "")

    if "CONFIG_CLASSIFICATIONS" not in core or "classification" not in registry:
        F.add("USF-CONFIG-001", CORE, "config classification model must exist and be used by the registry")
    if not ("owner" in registry and "scope" in registry):
        F.add("USF-CONFIG-002", REGISTRY, "config items must carry owner and scope")
    if "required-missing" not in core:
        F.add("USF-CONFIG-003", CORE, "required config must fail closed (required-missing)")
    if not ("SecretReference" in core and "isSecretClassification" in core):
        F.add("USF-CONFIG-004", CORE, "a secret-reference model (distinct from value) must exist")
    if "SECRET_KEY_PATTERNS" not in core or "redactConfigMap" not in core:
        F.add("USF-CONFIG-005", CORE, "secret-key blocking + redaction must exist")
    else:
        missing = [k for k in REQUIRED_SECRET_KEYS if k not in core]
        if missing:
            F.add("USF-CONFIG-005", CORE, f"blocked secret-key patterns missing: {missing}")
    for needle in OPENAPI_SECRET_NEEDLES:
        if needle in openapi:
            F.add("USF-CONFIG-006", OPENAPI, f"secret-shaped content in OpenAPI: {needle!r}")
    if "pdp.decide" not in config_svc:
        F.add("USF-CONFIG-007", CONFIG_SVC, "config retrieval must call the PDP")
    if "context.tenantId" not in config_svc:
        F.add("USF-CONFIG-008", CONFIG_SVC, "config retrieval must be tenant-scoped")
    if not ("pdp.decide" in secret_svc and '"secret.accessed"' in secret_svc and '"secret.denied"' in secret_svc):
        F.add("USF-CONFIG-009", SECRET_SVC, "secret access must be PDP-guarded and audited (accessed/denied)")
    if "safeDefault" not in core or "evaluateFeatureFlag" not in core:
        F.add("USF-CONFIG-010", CORE, "feature flags must have a safe default + deterministic evaluation")
    if not ("previousValueHash" in core and "newValueHash" in core):
        F.add("USF-CONFIG-011", CORE, "config-change evidence must be value-free (hashes only)")
    for token in ("liveSecretManagerClaim: false", "liveExternalProviderClaim: false", "productionLiveClaim: false"):
        if token not in proof:
            F.add("USF-CONFIG-012", PROOF, f"config proof must declare {token} (no overclaim)")
    if not ("secret-reference" in registry and "secretReferenceAllowed" in registry):
        F.add("USF-CONFIG-013", REGISTRY, "provider credentials must be secret references")
    if not ("/v1/config/current" in server and "tenant context mismatch" in server):
        F.add("USF-CONFIG-014", SERVER, "config routes must be tenant-context guarded")

    row = config_row(state["matrix"])
    if row is None:
        F.add("USF-CONFIG-015", MATRIX_PATH, "config-secrets domain row is missing from the parity matrix")
    elif not (row.get("usf_tests") and row.get("usf_proofs")):
        F.add("USF-CONFIG-015", MATRIX_PATH, "config-secrets row must reference USF tests and proofs")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = json.loads(json.dumps(base["matrix"])) if base["matrix"] is not None else None
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if "matrixConfigSet" in mutation and matrix is not None:
        row = config_row(matrix)
        if row is not None:
            for key, value in mutation["matrixConfigSet"].items():
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
            F.add("USF-CONFIG-SELFTEST", path, f"cannot load planted defect: {exc}")
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
            F.add("USF-CONFIG-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF configuration/secrets posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["config", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"config", "all"}:
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
        print(f"USF config validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
