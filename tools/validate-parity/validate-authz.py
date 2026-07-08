#!/usr/bin/env python3
"""USF authorization posture validator (parity-tenant-authz, USF-140).

Governance tooling only. Statically enforces the authorization invariants over the
policy and capability source so a regression fails closed:

  USF-AUTHZ-001  PDP default effect is deny (never permit)
  USF-AUTHZ-002  identity claims do not grant authorization (IDP_GRANTS_AUTHORIZATION false)
  USF-AUTHZ-003  no action maps to an empty permission
  USF-AUTHZ-004  no role is granted a wildcard permission
  USF-AUTHZ-005  the authorizer emits authorization-decision audit evidence
  USF-AUTHZ-006  break-glass forbids self-approval
  USF-AUTHZ-007  the tenant/authz capability does not import a provider/IdP/DB adapter
  USF-AUTHZ-008  USF-141 enterprise authorization depth matrix is present and complete
  USF-AUTHZ-009  deferred/reclassified authorization control lacks owner or follow-up metadata
  USF-AUTHZ-010  PDP synchronous behaviour is lost
  USF-AUTHZ-011  USF-141 proof or enterprise evidence linkage is incomplete
  USF-AUTHZ-012  authorization depth readiness/certification is overclaimed
  USF-AUTHZ-013  USF-141 proven control lacks proof-backed evidence

Live PDP and PDP/RLS-consistency behaviour is proven by the hermetic tests and the
composed-Postgres proof (make authz-proof). Planted defects under
tools/validate-parity/authz-planted-defects prove each rule fires.
"""
import argparse
import copy
import glob
import json
import os
import re
import sys
from collections import Counter

RULES = {
    "USF-AUTHZ-001": ("blocking", "PDP default effect must be deny"),
    "USF-AUTHZ-002": ("blocking", "identity claims must not grant authorization"),
    "USF-AUTHZ-003": ("blocking", "an action maps to an empty permission"),
    "USF-AUTHZ-004": ("blocking", "a role is granted a wildcard permission"),
    "USF-AUTHZ-005": ("blocking", "authorizer does not emit authorization-decision audit"),
    "USF-AUTHZ-006": ("blocking", "break-glass does not forbid self-approval"),
    "USF-AUTHZ-007": ("blocking", "tenant/authz capability imports a provider adapter"),
    "USF-AUTHZ-008": ("blocking", "USF-141 authorization depth matrix is missing or incomplete"),
    "USF-AUTHZ-009": ("blocking", "deferred authorization control lacks owner or follow-up metadata"),
    "USF-AUTHZ-010": ("blocking", "PDP synchronous behaviour is not preserved"),
    "USF-AUTHZ-011": ("blocking", "USF-141 proof or enterprise evidence linkage is incomplete"),
    "USF-AUTHZ-012": ("blocking", "authorization depth readiness or certification is overclaimed"),
    "USF-AUTHZ-013": ("blocking", "USF-141 proven authorization control lacks proof-backed evidence"),
    "USF-AUTHZ-SELFTEST": ("blocking", "planted authz defect did not raise its expected rule"),
}

POLICY = "capabilities/tenant/src/authorization-policy.ts"
AUTHORIZE = "capabilities/tenant/src/authorize.ts"
PDP = "capabilities/tenant/src/pdp.ts"
TENANT_INDEX = "capabilities/tenant/src/index.ts"
CAPABILITY_GLOB = "capabilities/tenant/src/*.ts"
SELFTEST_DIR = "tools/validate-parity/authz-planted-defects"
USF141_MATRIX_PATH = "docs/architecture/authz-enterprise-proof-depth-matrix.json"
USF141_REQUIRED_CONTROLS = {
    "pdp-synchronous-evaluation",
    "membership-lifecycle-fail-closed",
    "authorization-cache-and-revalidation",
    "abac-attribute-expansion",
    "policy-input-versioned-schema",
    "delegation-and-impersonation",
    "field-level-authorization",
    "token-session-validation-depth",
    "authz-rate-limits-and-abuse-controls",
    "workflow-toctou-and-long-running-revalidation",
    "broader-separation-of-duties",
}
USF141_PROHIBITED_CLAIMS = {
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
PROVEN_STATUSES = {"proven-local", "bounded-local-proof", "implemented"}
DEFERRED_STATUSES = {"deferred-with-owner", "evaluated-with-owner", "transferred", "out-of-scope-with-rationale"}


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


def read_json(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def build_state(overrides=None):
    overrides = overrides or {}
    files = {}
    for path in sorted(glob.glob(CAPABILITY_GLOB)):
        files[path] = read_text(path)
    for key in (POLICY, AUTHORIZE, PDP, TENANT_INDEX):
        files.setdefault(key, read_text(key))
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    return {
        "files": files,
        "usf141_matrix": overrides.get("usf141_matrix", read_json(USF141_MATRIX_PATH)),
    }


def role_permissions_block(policy):
    match = re.search(r"ROLE_PERMISSIONS[^=]*=\s*Object\.freeze\(\{(.*?)\}\);", policy, re.DOTALL)
    return match.group(1) if match else ""


def action_permissions_block(policy):
    match = re.search(r"ACTION_PERMISSIONS[^=]*=\s*Object\.freeze\(\{(.*?)\}\);", policy, re.DOTALL)
    return match.group(1) if match else ""


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    policy = files.get(POLICY, "")
    authorize = files.get(AUTHORIZE, "")
    tenant_index = files.get(TENANT_INDEX, "")
    pdp = files.get(PDP, "")

    if 'DEFAULT_EFFECT = "deny"' not in policy:
        F.add("USF-AUTHZ-001", POLICY, "DEFAULT_EFFECT must be \"deny\"")
    if "IDP_GRANTS_AUTHORIZATION = false" not in policy:
        F.add("USF-AUTHZ-002", POLICY, "IDP_GRANTS_AUTHORIZATION must be false")
    if re.search(r':\s*""', action_permissions_block(policy)):
        F.add("USF-AUTHZ-003", POLICY, "an action maps to an empty permission")
    if '"*"' in role_permissions_block(policy):
        F.add("USF-AUTHZ-004", POLICY, "a role is granted a wildcard permission")
    if '"authorization.decision"' not in authorize or ".append(" not in authorize:
        F.add("USF-AUTHZ-005", AUTHORIZE, "authorizer must emit an authorization-decision audit record")
    if "cannot approve their own access" not in tenant_index:
        F.add("USF-AUTHZ-006", TENANT_INDEX, "break-glass must forbid self-approval")
    for path, text in sorted(files.items()):
        if re.search(r'from "@foundation/adapter-', text):
            F.add("USF-AUTHZ-007", path, "tenant/authz capability must not import a provider adapter")
    if re.search(r"async\s+decide\s*\(", pdp) or re.search(r"decide\s*\([^)]*\)\s*:\s*Promise", pdp):
        F.add("USF-AUTHZ-010", PDP, "PDP decide must remain synchronous")
    if "await " in pdp:
        F.add("USF-AUTHZ-010", PDP, "PDP must not await provider state during evaluation")
    check_usf141_matrix(F, state)


def _control_by_id(matrix):
    return {control.get("id"): control for control in matrix.get("controls", []) if isinstance(control, dict)}


def _has_nonempty_list(value):
    return isinstance(value, list) and bool(value) and all(isinstance(item, str) and item for item in value)


def check_usf141_matrix(F, state):
    matrix = state.get("usf141_matrix")
    if not isinstance(matrix, dict):
        F.add("USF-AUTHZ-008", USF141_MATRIX_PATH, "USF-141 authorization depth matrix is missing")
        return
    if matrix.get("sourceIssue") != "USF-141" or matrix.get("capabilityId") != "tenant-authz-pdp":
        F.add("USF-AUTHZ-008", USF141_MATRIX_PATH, "matrix does not identify USF-141 tenant-authz-pdp scope")
    if matrix.get("proofCommand") != "make authz-proof":
        F.add("USF-AUTHZ-011", USF141_MATRIX_PATH, "proof command must use the Compose startup/teardown wrapper")
    if "Compose Postgres" not in matrix.get("rawProofCommandBoundary", ""):
        F.add("USF-AUTHZ-011", USF141_MATRIX_PATH, "raw proof command boundary is missing")
    controls = _control_by_id(matrix)
    missing = sorted(USF141_REQUIRED_CONTROLS - set(controls))
    if missing:
        F.add("USF-AUTHZ-008", USF141_MATRIX_PATH, f"missing required controls: {missing}")

    claims = matrix.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-AUTHZ-012", USF141_MATRIX_PATH, "claims object is missing")
    else:
        for key, value in claims.items():
            if key.endswith("Claim") and value is not False:
                F.add("USF-AUTHZ-012", key, "readiness/certification claim must be false")
    nonclaims = set(matrix.get("nonClaims", []))
    missing_nonclaims = sorted(USF141_PROHIBITED_CLAIMS - nonclaims)
    if missing_nonclaims:
        F.add("USF-AUTHZ-012", USF141_MATRIX_PATH, f"missing non-claims: {missing_nonclaims}")

    if not _has_nonempty_list(matrix.get("enterpriseEvidenceRefs")):
        F.add("USF-AUTHZ-011", USF141_MATRIX_PATH, "enterprise evidence references are missing")
    if not matrix.get("sourceUseMatrix") or not matrix.get("parityMatrix"):
        F.add("USF-AUTHZ-011", USF141_MATRIX_PATH, "source-use or parity matrix linkage is missing")

    for control_id, control in sorted(controls.items()):
        status = control.get("status")
        if not control.get("nonClaimBoundary"):
            F.add("USF-AUTHZ-008", control_id, "control lacks non-claim boundary")
        if status in PROVEN_STATUSES:
            if not control.get("proofCommand") or not control.get("validationCommand"):
                F.add("USF-AUTHZ-013", control_id, "proven control lacks proof or validator command")
            if not _has_nonempty_list(control.get("evidenceRefs")):
                F.add("USF-AUTHZ-013", control_id, "proven control lacks evidence references")
        elif status in DEFERRED_STATUSES:
            required = ["owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate", "followUpIssues"]
            missing_fields = [field for field in required if not control.get(field)]
            if missing_fields:
                F.add("USF-AUTHZ-009", control_id, f"deferred/reclassified control missing {missing_fields}")
            if not _has_nonempty_list(control.get("followUpIssues")):
                F.add("USF-AUTHZ-009", control_id, "deferred/reclassified control lacks follow-up issues")
        else:
            F.add("USF-AUTHZ-008", control_id, f"unknown or missing control status: {status}")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = copy.deepcopy(base.get("usf141_matrix"))
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if mutation.get("matrixOmit"):
        matrix = None
    if matrix is not None and mutation.get("matrixRemoveControl"):
        matrix["controls"] = [
            control for control in matrix.get("controls", [])
            if control.get("id") != mutation["matrixRemoveControl"]
        ]
    if matrix is not None and mutation.get("matrixRemoveDeferredFollowUp"):
        target_control = mutation["matrixRemoveDeferredFollowUp"]
        for control in matrix.get("controls", []):
            if control.get("id") == target_control:
                control.pop("followUpIssues", None)
                control.pop("reviewDate", None)
    if matrix is not None and mutation.get("matrixRemoveProofCommand"):
        target_control = mutation["matrixRemoveProofCommand"]
        for control in matrix.get("controls", []):
            if control.get("id") == target_control:
                control.pop("proofCommand", None)
    if matrix is not None and mutation.get("matrixClearEnterpriseEvidenceRefs"):
        matrix["enterpriseEvidenceRefs"] = []
    if matrix is not None and "matrixSetClaim" in mutation:
        target_claim = mutation["matrixSetClaim"]
        matrix.setdefault("claims", {})[target_claim["claim"]] = target_claim["value"]
    return {"files": files, "usf141_matrix": matrix}


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
            F.add("USF-AUTHZ-SELFTEST", path, f"cannot load planted defect: {exc}")
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
            F.add("USF-AUTHZ-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF authorization posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["policy", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"policy", "all"}:
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
        print(f"USF authz validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
