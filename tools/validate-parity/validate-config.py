#!/usr/bin/env python3
"""USF configuration/secrets posture validator (parity-config-secrets, USF-144).

Governance tooling only. It creates no implementation/runtime files, imports no
source lineage, and publishes no evidence. It fails closed on the config/secrets
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
  USF-CONFIG-016  the USF-145 enterprise config/secrets matrix exists and is complete
  USF-CONFIG-017  deferred/reclassified USF-145 controls carry owner and follow-up metadata
  USF-CONFIG-018  USF-145 proof and enterprise evidence linkage is present
  USF-CONFIG-019  USF-145 config/secrets proof exercises every claimed control
  USF-CONFIG-020  USF-145 proven controls carry proof-backed evidence
  USF-CONFIG-021  OpenBao reconciliation remains bounded and non-live
  USF-CONFIG-022  USF-145 config/secrets readiness/certification claims remain prohibited

Live fail-closed / redaction / isolation behaviour is proven by the hermetic tests
and the config proof (make config-proof). Planted defects under
tools/validate-parity/config-planted-defects prove each rule fires.
"""
import argparse
import copy
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
    "USF-CONFIG-016": ("blocking", "USF-145 enterprise config/secrets matrix is missing or incomplete"),
    "USF-CONFIG-017": ("blocking", "USF-145 deferred/reclassified config control lacks owner or follow-up metadata"),
    "USF-CONFIG-018": ("blocking", "USF-145 proof or enterprise evidence linkage is incomplete"),
    "USF-CONFIG-019": ("blocking", "USF-145 config/secrets proof lacks required control evidence"),
    "USF-CONFIG-020": ("blocking", "USF-145 proven config/secrets control lacks proof-backed evidence"),
    "USF-CONFIG-021": ("blocking", "USF-145 OpenBao reconciliation is missing or overclaimed"),
    "USF-CONFIG-022": ("blocking", "USF-145 config/secrets readiness or certification claim is overclaimed"),
    "USF-CONFIG-SELFTEST": ("blocking", "planted config defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
REGISTRY = "capabilities/config/src/registry.ts"
CONFIG_SVC = "capabilities/config/src/config-service.ts"
SECRET_SVC = "capabilities/config/src/secret-service.ts"
SERVER = "apps/api/src/server.ts"
PROOF = "packages/proof/src/config-secrets-proof.ts"
OPENAPI = "packages/openapi/openapi.json"
MATRIX_PATH = "docs/architecture/functional-scope-classification-matrix.json"
USF145_MATRIX_PATH = "docs/architecture/config-secrets-enterprise-proof-depth-matrix.json"
ENTERPRISE_EVIDENCE_PATH = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
SOURCE_FILES = (
    CORE,
    REGISTRY,
    CONFIG_SVC,
    SECRET_SVC,
    SERVER,
    PROOF,
    OPENAPI,
    USF145_MATRIX_PATH,
    ENTERPRISE_EVIDENCE_PATH,
)
SELFTEST_DIR = "tools/validate-parity/config-planted-defects"

REQUIRED_SECRET_KEYS = ['"password"', '"secret"', '"token"', '"api_key"', '"client_secret"', '"private_key"', '"authorization"', '"cookie"']
OPENAPI_SECRET_NEEDLES = ["Bearer ", "secret://", "-----BEGIN", '"password"', "client_secret"]
USF145_REQUIRED_CONTROLS = {
    "openbao-runtime-binding-reconciliation",
    "secret-rotation-posture",
    "db-backed-config-and-tenant-settings",
    "config-change-history",
    "override-workflow-separation-of-duties",
    "runtime-reload-cache-invalidation",
    "provider-configuration-plane",
    "data-residency-enforcement",
    "config-schema-migration-tooling",
    "secret-reference-redaction-boundary",
}
USF145_REQUIRED_PROOF_TOKENS = {
    "proveOpenBaoRuntimeBindingReconciliation",
    "proveSecretRotationPosture",
    "proveConfigChangeHistory",
    "proveOverrideWorkflowSeparationOfDuties",
    "proveRuntimeReloadCacheInvalidation",
    "proveProviderConfigurationPlane",
    "proveDataResidencyEnforcement",
    "proveConfigSchemaMigrationTooling",
    "enterpriseConfigSecretsDepthGate",
}
USF145_PROHIBITED_CLAIMS = {
    "live-secret-manager-readiness",
    "kms-readiness",
    "config-secrets-readiness-beyond-bounded-local-proof",
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-product-readiness",
    "usf-133-closure",
}
PROVEN_STATUSES = {"proven-local", "bounded-local-proof", "implemented", "implemented-bounded"}
DEFERRED_STATUSES = {
    "deferred-with-owner",
    "transferred",
    "reclassified-deferred",
    "out-of-scope-with-rationale",
}


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


def parse_json_text(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in SOURCE_FILES}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides["matrix"] if "matrix" in overrides else load_matrix()
    usf145_matrix = (
        overrides["usf145_matrix"]
        if "usf145_matrix" in overrides
        else parse_json_text(files.get(USF145_MATRIX_PATH, ""))
    )
    enterprise = (
        overrides["enterprise"]
        if "enterprise" in overrides
        else parse_json_text(files.get(ENTERPRISE_EVIDENCE_PATH, ""))
    )
    return {"files": files, "matrix": matrix, "usf145_matrix": usf145_matrix, "enterprise": enterprise}


def config_row(matrix):
    if not isinstance(matrix, dict):
        return None
    for row in matrix.get("domains", []):
        if isinstance(row, dict) and row.get("source_item_id") == "config-secrets":
            return row
    return None


def enterprise_ids(enterprise):
    ids = set()
    if not isinstance(enterprise, dict):
        return ids
    for section in (
        "soaSupportMappings",
        "evidenceRegister",
        "threatModelAbuseCaseRegister",
        "incidentVulnerabilityManagementEvidence",
        "privacyDataMinimisationPosture",
    ):
        rows = enterprise.get(section, [])
        if isinstance(rows, list):
            for row in rows:
                if isinstance(row, dict) and isinstance(row.get("id"), str):
                    ids.add(row["id"])
    return ids


def check_usf145_enterprise_depth(F, state, proof):
    matrix = state.get("usf145_matrix")
    if not isinstance(matrix, dict):
        F.add("USF-CONFIG-016", USF145_MATRIX_PATH, "USF-145 enterprise config/secrets matrix is missing")
        return
    if matrix.get("sourceIssue") != "USF-145" or matrix.get("capabilityId") != "config-secrets-enterprise-depth":
        F.add("USF-CONFIG-016", USF145_MATRIX_PATH, "matrix does not identify USF-145 config-secrets-enterprise-depth scope")
    if matrix.get("proofCommand") != "make config-proof" or matrix.get("validatorCommand") != "python3 tools/validate-parity/validate-config.py all --json":
        F.add("USF-CONFIG-016", USF145_MATRIX_PATH, "matrix must pin proof and validator commands")
    if len(matrix.get("acceptanceCriteriaMapping", [])) < 5:
        F.add("USF-CONFIG-016", USF145_MATRIX_PATH, "acceptance criteria mapping is incomplete")

    controls = matrix.get("controls", [])
    if not isinstance(controls, list):
        F.add("USF-CONFIG-016", USF145_MATRIX_PATH, "controls must be an array")
        controls = []
    by_id = {control.get("id"): control for control in controls if isinstance(control, dict)}
    missing = sorted(USF145_REQUIRED_CONTROLS - set(by_id))
    if missing:
        F.add("USF-CONFIG-016", USF145_MATRIX_PATH, f"missing required controls: {missing}")

    for control_id, control in by_id.items():
        status = control.get("status")
        for field in ("owner", "riskOwner", "controlOwner"):
            if not control.get(field):
                F.add("USF-CONFIG-016", control_id, f"control lacks {field}")
        if not control.get("riskTreatment") or not control.get("nonClaimBoundary"):
            F.add("USF-CONFIG-016", control_id, "control lacks risk treatment or non-claim boundary")
        if status in DEFERRED_STATUSES:
            if not control.get("followUpIssue") or not control.get("reviewDate"):
                F.add("USF-CONFIG-017", control_id, "deferred/reclassified control lacks followUpIssue or reviewDate")
        elif status in PROVEN_STATUSES:
            if not control.get("proofCommand") or not control.get("validationCommand"):
                F.add("USF-CONFIG-020", control_id, "proven control lacks proof or validation command")
            if not control.get("proofChecks") or not control.get("evidenceRefs"):
                F.add("USF-CONFIG-020", control_id, "proven control lacks proof checks or evidence refs")
        else:
            F.add("USF-CONFIG-016", control_id, f"unknown or missing control status: {status}")

    refs = set(matrix.get("enterpriseEvidenceRefs", []))
    required_refs = {
        "soa-usf-145-config-secrets-enterprise-proof-depth",
        "evidence-usf-145-config-secrets-enterprise-proof-depth",
        "threat-usf-145-config-secrets-enterprise-depth",
        "incident-usf-145-config-secrets-enterprise-depth",
        "privacy-usf-145-config-secrets-enterprise-depth",
    }
    if not required_refs.issubset(refs):
        F.add("USF-CONFIG-018", USF145_MATRIX_PATH, "matrix lacks required enterprise evidence refs")
    missing_enterprise = sorted(required_refs - enterprise_ids(state.get("enterprise")))
    if missing_enterprise:
        F.add("USF-CONFIG-018", ENTERPRISE_EVIDENCE_PATH, f"enterprise model lacks refs: {missing_enterprise}")

    missing_tokens = sorted(token for token in USF145_REQUIRED_PROOF_TOKENS if token not in proof)
    if missing_tokens:
        F.add("USF-CONFIG-019", PROOF, f"config proof missing required USF-145 tokens: {missing_tokens}")
    for label in (
        "USF-145 OpenBao runtime binding is reconciled",
        "USF-145 secret rotation posture",
        "USF-145 config-change history",
        "USF-145 override workflow",
        "USF-145 runtime reload",
        "USF-145 provider configuration plane",
        "USF-145 data residency enforcement",
        "USF-145 config schema migration tooling",
    ):
        if label not in proof:
            F.add("USF-CONFIG-019", PROOF, f"config proof missing proof label: {label}")

    if "findProvider(\"secret-store-openbao-composed-test\")" not in proof:
        F.add("USF-CONFIG-021", PROOF, "OpenBao reconciliation must inspect provider registry entry")
    if "liveSecretManagerClaim: false" not in proof or "kmsReadinessClaim: false" not in proof:
        F.add("USF-CONFIG-021", PROOF, "OpenBao reconciliation must preserve live secret-manager and KMS non-claims")

    claims = matrix.get("claims", {})
    for key, value in claims.items():
        if key.endswith("Claim") and value is not False:
            F.add("USF-CONFIG-022", f"{USF145_MATRIX_PATH}:{key}", "USF-145 claim flags must remain false")
    non_claims = set(matrix.get("nonClaims", []))
    missing_nonclaims = sorted(USF145_PROHIBITED_CLAIMS - non_claims)
    if missing_nonclaims:
        F.add("USF-CONFIG-022", USF145_MATRIX_PATH, f"missing USF-145 non-claims: {missing_nonclaims}")
    for token in (
        "configSecretsReadinessClaim: false",
        "stagingReadinessClaim: false",
        "productionReadinessClaim: false",
        "socReadinessClaim: false",
        "iso27001CertificationClaim: false",
        "fullDevReadinessClaim: false",
        "fullProductReadinessClaim: false",
        "usf133ClosureClaim: false",
    ):
        if token not in proof:
            F.add("USF-CONFIG-022", PROOF, f"config proof must declare {token}")


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

    check_usf145_enterprise_depth(F, state, proof)


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = copy.deepcopy(base["matrix"]) if base["matrix"] is not None else None
    usf145_matrix = copy.deepcopy(base.get("usf145_matrix")) if base.get("usf145_matrix") is not None else None
    enterprise = copy.deepcopy(base.get("enterprise")) if base.get("enterprise") is not None else None
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
    if "usf145MatrixSet" in mutation and usf145_matrix is not None:
        for key, value in mutation["usf145MatrixSet"].items():
            usf145_matrix[key] = value
    if "usf145ControlSet" in mutation and usf145_matrix is not None:
        control_id = mutation["usf145ControlSet"].get("id")
        for control in usf145_matrix.get("controls", []):
            if isinstance(control, dict) and control.get("id") == control_id:
                for key, value in mutation["usf145ControlSet"].get("values", {}).items():
                    if value == "__DELETE__":
                        control.pop(key, None)
                    else:
                        control[key] = value
    if "enterpriseRemoveIds" in mutation and isinstance(enterprise, dict):
        remove = set(mutation["enterpriseRemoveIds"])
        for section, rows in enterprise.items():
            if isinstance(rows, list):
                enterprise[section] = [
                    row
                    for row in rows
                    if not (isinstance(row, dict) and row.get("id") in remove)
                ]
    return {
        "files": files,
        "matrix": matrix,
        "usf145_matrix": usf145_matrix,
        "enterprise": enterprise,
    }


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
