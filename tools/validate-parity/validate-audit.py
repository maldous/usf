#!/usr/bin/env python3
"""USF audit/evidence posture validator (parity-audit, USF-142).

Governance tooling only. It creates no implementation/runtime files, imports no
React source, and publishes no evidence. It fails closed on the audit/evidence
invariants that keep the audit domain honest as tamper-evident, tenant-safe,
queryable evidence (ISO 27001-supporting technical control evidence only; no
certification claim):

  USF-AUDIT-001  the audit event model enforces a canonical category/event_type/
                 outcome/severity taxonomy (fails closed on non-canonical values)
  USF-AUDIT-002  audit events carry actor/tenant/scope and correlation/causation
  USF-AUDIT-003  audit events are versioned (event_version + schema version)
  USF-AUDIT-004  audit metadata blocks obvious secret/credential keys + redaction
  USF-AUDIT-005  audit retrieval is PDP-protected and denies fail closed
  USF-AUDIT-006  audit retrieval is tenant-scoped and non-enumerating
  USF-AUDIT-007  audit access is itself audited (audit-of-audit)
  USF-AUDIT-008  authorization decisions are recorded as rich audit evidence
  USF-AUDIT-009  break-glass use is audit-recorded
  USF-AUDIT-010  a hash chain exists together with chain verification
  USF-AUDIT-011  a tamper-evidence proof exists (content rewrite is detected)
  USF-AUDIT-012  no SIEM/live-external/production-live readiness is overclaimed
  USF-AUDIT-013  the audit parity matrix row is backed by tests and proofs
  USF-AUDIT-014  the USF-143 enterprise audit depth matrix exists and is complete
  USF-AUDIT-015  deferred/reclassified USF-143 controls carry owner and follow-up metadata
  USF-AUDIT-016  USF-143 proof and enterprise evidence linkage is present
  USF-AUDIT-017  USF-143 enterprise audit proof exercises every claimed control
  USF-AUDIT-018  USF-143 proven controls carry proof-backed evidence
  USF-AUDIT-019  USF-143 audit enterprise readiness/certification claims remain prohibited

Live append-only / hash-chain / tamper / RLS behaviour is proven by the hermetic
tests and the composed-Postgres proof (make audit-proof). Planted defects under
tools/validate-parity/audit-planted-defects prove each rule fires.
"""
import argparse
import copy
import json
import os
import sys
from collections import Counter

RULES = {
    "USF-AUDIT-001": ("blocking", "audit event taxonomy is not enforced as canonical"),
    "USF-AUDIT-002": ("blocking", "audit event model lacks actor/tenant/scope/correlation/causation"),
    "USF-AUDIT-003": ("blocking", "audit events are not versioned"),
    "USF-AUDIT-004": ("blocking", "audit metadata does not block obvious secret keys"),
    "USF-AUDIT-005": ("blocking", "audit retrieval is not PDP-protected"),
    "USF-AUDIT-006": ("blocking", "audit retrieval is not tenant-scoped/non-enumerating"),
    "USF-AUDIT-007": ("blocking", "audit access is not itself audited"),
    "USF-AUDIT-008": ("blocking", "authorization decisions are not recorded as rich audit evidence"),
    "USF-AUDIT-009": ("blocking", "break-glass use is not audit-recorded"),
    "USF-AUDIT-010": ("blocking", "hash chain exists without verification"),
    "USF-AUDIT-011": ("blocking", "no tamper-evidence proof"),
    "USF-AUDIT-012": ("blocking", "SIEM/live-external/production-live readiness overclaimed"),
    "USF-AUDIT-013": ("blocking", "audit parity matrix row lacks tests/proofs backing"),
    "USF-AUDIT-014": ("blocking", "USF-143 enterprise audit depth matrix is missing or incomplete"),
    "USF-AUDIT-015": ("blocking", "USF-143 deferred/reclassified audit control lacks owner or follow-up metadata"),
    "USF-AUDIT-016": ("blocking", "USF-143 proof or enterprise evidence linkage is incomplete"),
    "USF-AUDIT-017": ("blocking", "USF-143 enterprise audit proof lacks required control evidence"),
    "USF-AUDIT-018": ("blocking", "USF-143 proven audit control lacks proof-backed evidence"),
    "USF-AUDIT-019": ("blocking", "USF-143 audit enterprise readiness or certification claim is overclaimed"),
    "USF-AUDIT-SELFTEST": ("blocking", "planted audit defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
EVENT_STORE = "capabilities/audit/src/event-store.ts"
QUERY_SERVICE = "capabilities/audit/src/query-service.ts"
AUTHORIZE = "capabilities/tenant/src/authorize.ts"
PROOF = "packages/proof/src/audit-evidence-proof.ts"
SOURCE_FILES = (CORE, EVENT_STORE, QUERY_SERVICE, AUTHORIZE, PROOF)
MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
USF143_MATRIX_PATH = "docs/architecture/audit-enterprise-proof-depth-matrix.json"
ENTERPRISE_EVIDENCE_PATH = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
SELFTEST_DIR = "tools/validate-parity/audit-planted-defects"

REQUIRED_BLOCKED_KEYS = ['"password"', '"token"', '"secret"', '"api_key"', '"cookie"', '"authorization"', '"private_key"']
USF143_REQUIRED_CONTROLS = {
    "cryptographic-signing-and-key-management",
    "audit-export-evidence-package",
    "retention-disposal-lifecycle",
    "durable-outbox-delivery-reliability",
    "postgres-audit-adapter-linkage",
    "forensic-request-session-capture",
    "siem-forwarder-posture",
    "detection-monitoring-posture",
    "multi-version-event-readers",
    "value-free-redaction-boundary",
}
USF143_REQUIRED_PROOF_TOKENS = {
    "proveEnterpriseSigningAndKeyBoundary",
    "proveAuditExportEvidencePackage",
    "proveRetentionDisposalLifecycle",
    "proveDurableOutboxDeliveryReliability",
    "provePostgresAdapterOutcomeBoundary",
    "proveForensicRequestSessionCapture",
    "proveLocalSiemForwarderPosture",
    "proveDetectionMonitoringPosture",
    "proveMultiVersionEventReaders",
    "enterpriseAuditDepthGate",
}
USF143_PROHIBITED_CLAIMS = {
    "siem-readiness",
    "kms-readiness",
    "audit-export-readiness-beyond-bounded-local-proof",
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


def load_json_optional(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {}
    for path in SOURCE_FILES:
        files[path] = read_text(path)
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides["matrix"] if "matrix" in overrides else load_matrix()
    usf143_matrix = (
        overrides["usf143_matrix"]
        if "usf143_matrix" in overrides
        else load_json_optional(USF143_MATRIX_PATH)
    )
    enterprise = (
        overrides["enterprise"]
        if "enterprise" in overrides
        else load_json_optional(ENTERPRISE_EVIDENCE_PATH)
    )
    return {"files": files, "matrix": matrix, "usf143_matrix": usf143_matrix, "enterprise": enterprise}


def audit_row(matrix):
    if not isinstance(matrix, dict):
        return None
    for row in matrix.get("domains", []):
        if isinstance(row, dict) and row.get("react_item_id") == "audit-events":
            return row
    return None


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files.get(CORE, "")
    store = files.get(EVENT_STORE, "")
    query = files.get(QUERY_SERVICE, "")
    authorize = files.get(AUTHORIZE, "")
    proof = files.get(PROOF, "")

    # 001 canonical taxonomy enforced and fails closed.
    if not (
        "AUDIT_CATEGORIES" in core
        and "AUDIT_SEVERITIES" in core
        and "AUDIT_EVENT_OUTCOMES" in core
        and "is not canonical" in core
    ):
        F.add("USF-AUDIT-001", CORE, "createAuditEventDraft must reject non-canonical taxonomy values")

    # 002 actor/tenant/scope + correlation/causation in the model.
    if not all(token in core for token in ("correlationId", "causationId", "scopeType", "actorId", "tenantId")):
        F.add("USF-AUDIT-002", CORE, "audit event model must carry actor/tenant/scope/correlation/causation")

    # 003 event versioning.
    if not ("eventVersion" in core and "AUDIT_SCHEMA_VERSION" in core):
        F.add("USF-AUDIT-003", CORE, "audit events must carry event_version and a schema version")

    # 004 secret-key blocking + redaction.
    if "BLOCKED_METADATA_KEYS" not in core or "redactAuditMetadata" not in core:
        F.add("USF-AUDIT-004", CORE, "audit metadata redaction (BLOCKED_METADATA_KEYS + redactAuditMetadata) is missing")
    else:
        missing = [key for key in REQUIRED_BLOCKED_KEYS if key not in core]
        if missing:
            F.add("USF-AUDIT-004", CORE, f"blocked secret keys missing: {missing}")

    # 005 retrieval PDP-protected with fail-closed deny.
    if not ("pdp.decide" in query and "AuditAccessDeniedError" in query):
        F.add("USF-AUDIT-005", QUERY_SERVICE, "audit retrieval must call the PDP and deny fail closed")

    # 006 tenant-scoped, non-enumerating retrieval.
    if "criteria.tenantId !== context.tenantId" not in store or "event.tenantId === context.tenantId" not in store:
        F.add("USF-AUDIT-006", EVENT_STORE, "audit retrieval must be tenant-scoped and non-enumerating")

    # 007 audit-of-audit.
    if not ('"audit.query.started"' in query and '"audit.query.denied"' in query):
        F.add("USF-AUDIT-007", QUERY_SERVICE, "reading audit must record audit.query.started and audit.query.denied")

    # 008 authorization decisions recorded as rich audit evidence.
    if not ("createAuditEventDraft" in authorize and '"authorization.decision"' in authorize):
        F.add("USF-AUDIT-008", AUTHORIZE, "authorizer must record a rich authorization.decision audit event")

    # 009 break-glass use audit-recorded.
    if '"break_glass.used"' not in authorize:
        F.add("USF-AUDIT-009", AUTHORIZE, "authorizer must record break_glass.used for a break-glass permit")

    # 010 hash chain plus verification.
    if not ("canonicalAuditEventHash" in core and "verifyAuditChain" in core):
        F.add("USF-AUDIT-010", CORE, "a hash chain must ship with chain verification")

    # 011 tamper-evidence proof.
    if not ("proveTamperDetected" in proof and "DISABLE TRIGGER" in proof and "tamper" in proof):
        F.add("USF-AUDIT-011", PROOF, "a composed-Postgres tamper-evidence proof must exist")

    # 012 no overclaim.
    for token in ("productionLiveClaim: false", "siemClaim: false", "liveExternalProviderClaim: false"):
        if token not in proof:
            F.add("USF-AUDIT-012", PROOF, f"audit proof must declare {token} (no overclaim)")

    # 013 matrix backing.
    row = audit_row(state["matrix"])
    if row is None:
        F.add("USF-AUDIT-013", MATRIX_PATH, "audit-events domain row is missing from the parity matrix")
    elif not (row.get("usf_tests") and row.get("usf_proofs")):
        F.add("USF-AUDIT-013", MATRIX_PATH, "audit-events row must reference USF tests and proofs")

    check_usf143_matrix(F, state)


def _control_by_id(matrix):
    return {control.get("id"): control for control in matrix.get("controls", []) if isinstance(control, dict)}


def _has_nonempty_list(value):
    return isinstance(value, list) and bool(value) and all(isinstance(item, str) and item for item in value)


def _enterprise_ids(state):
    enterprise = state.get("enterprise")
    ids = set()
    if not isinstance(enterprise, dict):
        return ids
    for key in ("soaSupportMappings", "evidenceRegister", "threatModelAbuseCaseRegister",
                "incidentVulnerabilityManagementEvidence", "privacyDataMinimisationPosture"):
        for row in enterprise.get(key, []):
            if isinstance(row, dict) and isinstance(row.get("id"), str):
                ids.add(row["id"])
    return ids


def check_usf143_matrix(F, state):
    matrix = state.get("usf143_matrix")
    proof = state["files"].get(PROOF, "")
    if not isinstance(matrix, dict):
        F.add("USF-AUDIT-014", USF143_MATRIX_PATH, "USF-143 enterprise audit depth matrix is missing")
        return
    if matrix.get("sourceIssue") != "USF-143" or matrix.get("capabilityId") != "audit-evidence-enterprise-depth":
        F.add("USF-AUDIT-014", USF143_MATRIX_PATH, "matrix does not identify USF-143 audit-evidence-enterprise-depth scope")
    if matrix.get("proofCommand") != "make audit-proof":
        F.add("USF-AUDIT-016", USF143_MATRIX_PATH, "proof command must use the Compose startup/teardown wrapper")
    if "Compose Postgres" not in matrix.get("rawProofCommandBoundary", ""):
        F.add("USF-AUDIT-016", USF143_MATRIX_PATH, "raw proof command boundary is missing")
    if len(matrix.get("acceptanceCriteriaMapping", [])) < 5:
        F.add("USF-AUDIT-014", USF143_MATRIX_PATH, "acceptance criteria mapping is incomplete")

    controls = _control_by_id(matrix)
    missing = sorted(USF143_REQUIRED_CONTROLS - set(controls))
    if missing:
        F.add("USF-AUDIT-014", USF143_MATRIX_PATH, f"missing required controls: {missing}")

    for token in sorted(USF143_REQUIRED_PROOF_TOKENS):
        if token not in proof:
            F.add("USF-AUDIT-017", PROOF, f"enterprise audit proof token missing: {token}")

    if not _has_nonempty_list(matrix.get("enterpriseEvidenceRefs")):
        F.add("USF-AUDIT-016", USF143_MATRIX_PATH, "enterprise evidence references are missing")
    else:
        known = _enterprise_ids(state)
        missing_refs = [ref for ref in matrix["enterpriseEvidenceRefs"] if ref not in known]
        if missing_refs:
            F.add("USF-AUDIT-016", USF143_MATRIX_PATH, f"enterprise evidence refs missing from register: {missing_refs}")
    if not matrix.get("sourceUseMatrix") or not matrix.get("parityMatrix") or not matrix.get("classificationMatrix"):
        F.add("USF-AUDIT-016", USF143_MATRIX_PATH, "source-use, parity, or classification matrix linkage is missing")

    claims = matrix.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-AUDIT-019", USF143_MATRIX_PATH, "claims object is missing")
    else:
        for key, value in claims.items():
            if key.endswith("Claim") and value is not False:
                F.add("USF-AUDIT-019", key, "readiness/certification claim must be false")
    nonclaims = set(matrix.get("nonClaims", []))
    missing_nonclaims = sorted(USF143_PROHIBITED_CLAIMS - nonclaims)
    if missing_nonclaims:
        F.add("USF-AUDIT-019", USF143_MATRIX_PATH, f"missing non-claims: {missing_nonclaims}")

    for control_id, control in sorted(controls.items()):
        status = control.get("status")
        if not control.get("owner") or not control.get("riskOwner") or not control.get("controlOwner"):
            F.add("USF-AUDIT-014", control_id, "control lacks owner, risk owner, or control owner")
        if not control.get("riskTreatment") or not control.get("nonClaimBoundary"):
            F.add("USF-AUDIT-014", control_id, "control lacks risk treatment or non-claim boundary")
        if status in PROVEN_STATUSES:
            if not control.get("proofCommand") or not control.get("validationCommand"):
                F.add("USF-AUDIT-018", control_id, "proven control lacks proof or validator command")
            if not _has_nonempty_list(control.get("evidenceRefs")):
                F.add("USF-AUDIT-018", control_id, "proven control lacks evidence references")
            if not _has_nonempty_list(control.get("proofChecks")):
                F.add("USF-AUDIT-018", control_id, "proven control lacks proof check markers")
        elif status in DEFERRED_STATUSES:
            required = ["owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate", "followUpIssues"]
            missing_fields = [field for field in required if not control.get(field)]
            if missing_fields:
                F.add("USF-AUDIT-015", control_id, f"deferred/reclassified control missing {missing_fields}")
            if not _has_nonempty_list(control.get("followUpIssues")):
                F.add("USF-AUDIT-015", control_id, "deferred/reclassified control lacks follow-up issues")
        else:
            F.add("USF-AUDIT-014", control_id, f"unknown or missing control status: {status}")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = json.loads(json.dumps(base["matrix"])) if base["matrix"] is not None else None
    usf143_matrix = copy.deepcopy(base.get("usf143_matrix"))
    enterprise = copy.deepcopy(base.get("enterprise"))
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if "matrixAuditSet" in mutation and matrix is not None:
        row = audit_row(matrix)
        if row is not None:
            for key, value in mutation["matrixAuditSet"].items():
                row[key] = value
    if mutation.get("usf143MatrixOmit"):
        usf143_matrix = None
    if usf143_matrix is not None and mutation.get("usf143RemoveControl"):
        usf143_matrix["controls"] = [
            control for control in usf143_matrix.get("controls", [])
            if control.get("id") != mutation["usf143RemoveControl"]
        ]
    if usf143_matrix is not None and mutation.get("usf143ForceDeferredMissingFollowUp"):
        target_control = mutation["usf143ForceDeferredMissingFollowUp"]
        for control in usf143_matrix.get("controls", []):
            if control.get("id") == target_control:
                control["status"] = "deferred-with-owner"
                control.pop("followUpIssues", None)
                control.pop("reviewDate", None)
    if usf143_matrix is not None and mutation.get("usf143ClearEnterpriseEvidenceRefs"):
        usf143_matrix["enterpriseEvidenceRefs"] = []
    if usf143_matrix is not None and mutation.get("usf143RemoveProofCommand"):
        target_control = mutation["usf143RemoveProofCommand"]
        for control in usf143_matrix.get("controls", []):
            if control.get("id") == target_control:
                control.pop("proofCommand", None)
    if usf143_matrix is not None and mutation.get("usf143RemoveProofChecks"):
        target_control = mutation["usf143RemoveProofChecks"]
        for control in usf143_matrix.get("controls", []):
            if control.get("id") == target_control:
                control["proofChecks"] = []
    if usf143_matrix is not None and "usf143SetClaim" in mutation:
        target_claim = mutation["usf143SetClaim"]
        usf143_matrix.setdefault("claims", {})[target_claim["claim"]] = target_claim["value"]
    return {"files": files, "matrix": matrix, "usf143_matrix": usf143_matrix, "enterprise": enterprise}


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
            F.add("USF-AUDIT-SELFTEST", path, f"cannot load planted defect: {exc}")
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
            F.add("USF-AUDIT-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF audit/evidence posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["audit", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"audit", "all"}:
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
        print(f"USF audit validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
