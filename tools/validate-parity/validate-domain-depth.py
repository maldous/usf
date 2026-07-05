#!/usr/bin/env python3
"""USF-191 domain deferred-depth closure validator.

Governance tooling only. It creates no implementation/runtime files, imports no
React source, and publishes no evidence. It fails closed on Lane 7 domain-depth
invariants: every required domain must have either local proof or an accepted
deferral; every deferred or partial control must carry risk, threat/failure,
asset/service, impact, likelihood, owner, treatment, review date, and a follow-up
issue; proof-backed controls must name proof and validator commands; unresolved
depth must not be closed or marked Done; USF-153 must not be silently reparented;
USF-39 must remain untouched; and prohibited readiness/certification claims must
remain non-claims.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
MATRIX_PATH = Path("docs/architecture/domain-deferred-depth-closure-matrix.json")
ENTERPRISE_MODEL_PATH = Path("spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json")
PACKAGE_PATH = Path("package.json")
SELFTEST_DIR = Path("tools/validate-parity/domain-depth-planted-defects")

RULES = {
    "USF-DOMAIN-DEPTH-001": ("blocking", "domain deferred-depth matrix is missing or invalid"),
    "USF-DOMAIN-DEPTH-002": ("blocking", "required Lane 7 domain or source issue is missing"),
    "USF-DOMAIN-DEPTH-003": ("blocking", "domain control uses an invalid effectiveness state"),
    "USF-DOMAIN-DEPTH-004": ("blocking", "deferred domain depth lacks required risk treatment fields"),
    "USF-DOMAIN-DEPTH-005": ("blocking", "domain proof or enterprise evidence reference is missing"),
    "USF-DOMAIN-DEPTH-006": ("blocking", "domain deferred depth is falsely closed, marked Done, or overclaimed"),
    "USF-DOMAIN-DEPTH-007": ("blocking", "required non-claims are missing or contradicted"),
    "USF-DOMAIN-DEPTH-008": ("blocking", "enterprise evidence linkage is incomplete"),
    "USF-DOMAIN-DEPTH-009": ("blocking", "USF-153 parent boundary is unsafe"),
    "USF-DOMAIN-DEPTH-SELFTEST": ("blocking", "planted domain-depth defect did not raise its expected rule"),
}

REQUIRED_DOMAINS = {
    "jobs/workflows": "USF-151",
    "notifications": "USF-153",
    "API/contracts": "USF-155",
    "providers": "USF-157",
    "guardrails": "USF-161",
    "import/export/bulk": "USF-163",
}

EXPECTED_PROOF_COMMANDS = {
    "jobs/workflows": "corepack pnpm proof:jobs",
    "notifications": "corepack pnpm proof:notify",
    "API/contracts": "corepack pnpm proof:api",
    "providers": "corepack pnpm proof:providers",
    "guardrails": "corepack pnpm proof:guardrails",
    "import/export/bulk": "corepack pnpm proof:bulk",
}

EXPECTED_VALIDATOR_COMMANDS = {
    "jobs/workflows": "python3 tools/validate-parity/validate-jobs.py all --json",
    "notifications": "python3 tools/validate-parity/validate-notify.py all --json",
    "API/contracts": "python3 tools/validate-parity/validate-api.py all --json",
    "providers": "python3 tools/validate-parity/validate-providers.py all --json",
    "guardrails": "python3 tools/validate-parity/validate-guardrails.py all --json",
    "import/export/bulk": "python3 tools/validate-parity/validate-bulk.py all --json",
}

ALLOWED_EFFECTIVENESS_STATES = {
    "defined-only",
    "implemented",
    "proven-local",
    "operating-evidence-present",
    "deferred-with-owner",
    "out-of-scope-with-rationale",
}

DEFERRED_EFFECTIVENESS_STATES = {"deferred-with-owner", "out-of-scope-with-rationale"}
PROOF_EFFECTIVENESS_STATES = {"implemented", "proven-local", "operating-evidence-present"}

DEFERRED_REQUIRED_FIELDS = {
    "riskStatement",
    "threatFailureScenario",
    "affectedAssetService",
    "impact",
    "likelihood",
    "owner",
    "treatment",
    "reviewDate",
    "linkedFollowUpIssue",
}

REQUIRED_NON_CLAIMS = {
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
}

DONE_VALUES = {"done", "closed", "complete", "completed", "resolved"}
TOP_LEVEL_REQUIRED = {
    "id",
    "laneIssue",
    "parentIssue",
    "dashboardIssue",
    "coordinatorIssue",
    "relatedIssueUntouched",
    "status",
    "closureClaimed",
    "usf39Touched",
    "nonClaims",
    "prohibitedClaimsMade",
    "domainRows",
    "plantedDefects",
}


class Findings:
    def __init__(self) -> None:
        self.items: list[dict[str, str]] = []

    def add(self, rule_id: str, subject: str, message: str = "") -> None:
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append(
            {
                "severity": severity,
                "ruleId": rule_id,
                "subject": str(subject),
                "message": message or RULES.get(rule_id, ("", ""))[1],
            }
        )

    def blocking_or_error(self) -> list[dict[str, str]]:
        return [item for item in self.items if item["severity"] in {"blocking", "error"}]

    def rule_ids(self) -> set[str]:
        return {item["ruleId"] for item in self.items}


def read_json(path: Path) -> Any:
    with (ROOT / path).open(encoding="utf-8") as handle:
        return json.load(handle)


def read_json_or_none(path: Path) -> Any:
    try:
        return read_json(path)
    except Exception:  # noqa: BLE001
        return None


def rows_by_id(rows: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(rows, list):
        return {}
    return {row["id"]: row for row in rows if isinstance(row, dict) and isinstance(row.get("id"), str)}


def enterprise_ids(model: Any) -> set[str]:
    if not isinstance(model, dict):
        return set()
    ids: set[str] = set()
    for key in (
        "soaSupportMappings",
        "evidenceRegister",
        "threatModelAbuseCaseRegister",
        "sdkDependencyGovernance",
        "accessReviewPrivilegedOperationPosture",
        "backupRestoreResiliencePosture",
        "incidentVulnerabilityManagementEvidence",
        "privacyDataMinimisationPosture",
    ):
        ids.update(rows_by_id(model.get(key)).keys())
    return ids


def package_scripts(package: Any) -> dict[str, str]:
    if not isinstance(package, dict) or not isinstance(package.get("scripts"), dict):
        return {}
    return {str(key): str(value) for key, value in package["scripts"].items() if isinstance(value, str)}


def apply_defect(matrix: Any, defect: dict[str, Any]) -> Any:
    out = copy.deepcopy(matrix)
    if not isinstance(out, dict):
        return out
    if "setClosureClaimed" in defect:
        out["closureClaimed"] = defect["setClosureClaimed"]
    if "setStatus" in defect:
        out["status"] = defect["setStatus"]
    if "setUsf39Touched" in defect:
        out["usf39Touched"] = defect["setUsf39Touched"]
    if "removeTopLevelNonClaim" in defect and isinstance(out.get("nonClaims"), list):
        out["nonClaims"] = [item for item in out["nonClaims"] if item != defect["removeTopLevelNonClaim"]]
    if "appendProhibitedClaimMade" in defect:
        out.setdefault("prohibitedClaimsMade", []).append(defect["appendProhibitedClaimMade"])

    for row in out.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        if row.get("id") == defect.get("domainId"):
            if "setDomainSourceIssueStatus" in defect:
                row["sourceIssueStatus"] = defect["setDomainSourceIssueStatus"]
            if "setDomainDoNotReparent" in defect:
                row["doNotReparent"] = defect["setDomainDoNotReparent"]
            if "setDomainLinearParentKnown" in defect:
                row["linearParentKnown"] = defect["setDomainLinearParentKnown"]
            if "setDomainDoneClaimed" in defect:
                row.setdefault("statusIntegrity", {})["doneClaimed"] = defect["setDomainDoneClaimed"]
        for control in row.get("controls", []):
            if not isinstance(control, dict):
                continue
            if control.get("id") != defect.get("controlId"):
                continue
            if "removeDeferredField" in defect:
                control.pop(defect["removeDeferredField"], None)
            if "removeProofField" in defect:
                control.pop(defect["removeProofField"], None)
            if "setEffectivenessState" in defect:
                control["effectivenessState"] = defect["setEffectivenessState"]
    return out


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    defect = defect or {}
    matrix = read_json_or_none(MATRIX_PATH)
    if defect:
        matrix = apply_defect(matrix, defect)
    return {
        "matrix": matrix,
        "enterpriseModel": read_json_or_none(ENTERPRISE_MODEL_PATH),
        "package": read_json_or_none(PACKAGE_PATH),
    }


def controls(row: dict[str, Any]) -> list[dict[str, Any]]:
    data = row.get("controls")
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


def is_deferred(control: dict[str, Any]) -> bool:
    return (
        control.get("effectivenessState") in DEFERRED_EFFECTIVENESS_STATES
        or control.get("acceptedDeferral") is True
    )


def unresolved_controls(matrix: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        out.extend(control for control in controls(row) if is_deferred(control))
    return out


def check_shape(F: Findings, matrix: Any) -> None:
    if not isinstance(matrix, dict):
        F.add("USF-DOMAIN-DEPTH-001", str(MATRIX_PATH), "matrix must be a JSON object")
        return
    missing = TOP_LEVEL_REQUIRED - set(matrix)
    if missing:
        F.add("USF-DOMAIN-DEPTH-001", str(MATRIX_PATH), f"missing top-level fields: {sorted(missing)}")
    if matrix.get("id") != "usf-191-domain-deferred-depth-closure-matrix":
        F.add("USF-DOMAIN-DEPTH-001", str(MATRIX_PATH), "matrix id must be lane-owned")
    if matrix.get("laneIssue") != "USF-191":
        F.add("USF-DOMAIN-DEPTH-001", "laneIssue", "matrix must be scoped to USF-191")
    if matrix.get("parentIssue") != "USF-133":
        F.add("USF-DOMAIN-DEPTH-001", "parentIssue", "matrix must link USF-133")
    if matrix.get("dashboardIssue") != "USF-184" or matrix.get("coordinatorIssue") != "USF-192":
        F.add("USF-DOMAIN-DEPTH-001", "issueLinks", "matrix must link USF-184 and USF-192")
    if not isinstance(matrix.get("domainRows"), list):
        F.add("USF-DOMAIN-DEPTH-001", "domainRows", "domainRows must be a list")
    if not isinstance(matrix.get("plantedDefects"), list) or len(matrix.get("plantedDefects", [])) < 4:
        F.add("USF-DOMAIN-DEPTH-001", "plantedDefects", "four planted defects are required")


def check_required_domains(F: Findings, matrix: dict[str, Any]) -> None:
    rows = [row for row in matrix.get("domainRows", []) if isinstance(row, dict)]
    by_domain = {row.get("domain"): row for row in rows}
    by_issue = {row.get("sourceIssue"): row for row in rows}
    for domain, issue in REQUIRED_DOMAINS.items():
        row = by_domain.get(domain)
        if not row:
            F.add("USF-DOMAIN-DEPTH-002", domain, "required domain row is missing")
            continue
        if row.get("sourceIssue") != issue:
            F.add("USF-DOMAIN-DEPTH-002", domain, f"expected source issue {issue}")
        if not controls(row):
            F.add("USF-DOMAIN-DEPTH-002", domain, "domain row must contain controls")
        if not row.get("proofOrAcceptedDeferral"):
            F.add("USF-DOMAIN-DEPTH-002", domain, "domain must record proof or accepted deferral")
    for issue in REQUIRED_DOMAINS.values():
        if issue not in by_issue:
            F.add("USF-DOMAIN-DEPTH-002", issue, "required source issue is not represented")


def check_effectiveness(F: Findings, matrix: dict[str, Any]) -> None:
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        for control in controls(row):
            state = control.get("effectivenessState")
            if state not in ALLOWED_EFFECTIVENESS_STATES:
                F.add("USF-DOMAIN-DEPTH-003", control.get("id", row.get("id", "unknown")), f"invalid effectiveness state: {state!r}")


def check_deferred_fields(F: Findings, matrix: dict[str, Any]) -> None:
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        for control in controls(row):
            if not is_deferred(control):
                continue
            missing = [field for field in sorted(DEFERRED_REQUIRED_FIELDS) if not control.get(field)]
            if missing:
                F.add("USF-DOMAIN-DEPTH-004", control.get("id", row.get("id", "unknown")), f"missing deferred fields: {missing}")
            issue = str(control.get("linkedFollowUpIssue", ""))
            if not issue.startswith("USF-"):
                F.add("USF-DOMAIN-DEPTH-004", control.get("id", row.get("id", "unknown")), "linked follow-up issue must use a USF issue id")
            if control.get("linkedFollowUpIssue") != row.get("sourceIssue"):
                F.add("USF-DOMAIN-DEPTH-004", control.get("id", row.get("id", "unknown")), "linked follow-up must be the source issue for this domain")


def check_proof_fields(F: Findings, matrix: dict[str, Any], package: Any) -> None:
    scripts = package_scripts(package)
    parity_script = scripts.get("parity", "")
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        domain = row.get("domain")
        expected_proof = EXPECTED_PROOF_COMMANDS.get(str(domain))
        expected_validator = EXPECTED_VALIDATOR_COMMANDS.get(str(domain))
        has_proven_control = False
        for control in controls(row):
            if control.get("effectivenessState") not in PROOF_EFFECTIVENESS_STATES:
                continue
            has_proven_control = True
            subject = control.get("id", row.get("id", "unknown"))
            if control.get("proofCommand") != expected_proof:
                F.add("USF-DOMAIN-DEPTH-005", subject, f"proof command must be {expected_proof}")
            if control.get("validatorCommand") != expected_validator:
                F.add("USF-DOMAIN-DEPTH-005", subject, f"validator command must be {expected_validator}")
            evidence_refs = control.get("evidenceRefs")
            if not isinstance(evidence_refs, list) or not evidence_refs:
                F.add("USF-DOMAIN-DEPTH-005", subject, "proof-backed control must cite enterprise evidence refs")
        if not has_proven_control and not any(is_deferred(control) for control in controls(row)):
            F.add("USF-DOMAIN-DEPTH-005", row.get("id", "unknown"), "domain lacks both proof and accepted deferral")
    if "validate-domain-depth.py all --json" not in parity_script:
        F.add("USF-DOMAIN-DEPTH-005", "package.json:scripts.parity", "domain-depth validator must be wired into parity")


def check_status_integrity(F: Findings, matrix: dict[str, Any]) -> None:
    unresolved = unresolved_controls(matrix)
    if unresolved and matrix.get("closureClaimed") is not False:
        F.add("USF-DOMAIN-DEPTH-006", "closureClaimed", "closure cannot be claimed while unresolved domain depth remains")
    if matrix.get("status") != "open-not-done":
        F.add("USF-DOMAIN-DEPTH-006", "status", "matrix must remain open-not-done")
    if matrix.get("usf39Touched") is not False:
        F.add("USF-DOMAIN-DEPTH-006", "USF-39", "USF-39 must remain untouched")
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        status = str(row.get("sourceIssueStatus", "")).strip().lower()
        subject = row.get("id", "unknown")
        if status in DONE_VALUES:
            F.add("USF-DOMAIN-DEPTH-006", subject, "source issue must not be marked Done/closed")
        integrity = row.get("statusIntegrity", {})
        if not isinstance(integrity, dict):
            F.add("USF-DOMAIN-DEPTH-006", subject, "statusIntegrity is required")
            continue
        if integrity.get("falseDoneAllowed") is not False:
            F.add("USF-DOMAIN-DEPTH-006", subject, "false Done must be forbidden")
        if integrity.get("doneClaimed") is not False:
            F.add("USF-DOMAIN-DEPTH-006", subject, "domain must not claim Done")
        if integrity.get("sourceIssueMustRemainOpen") is not True:
            F.add("USF-DOMAIN-DEPTH-006", subject, "source issue must remain open")
        if integrity.get("coordinatorIssue") != "USF-192":
            F.add("USF-DOMAIN-DEPTH-006", subject, "status integrity must link USF-192")


def check_non_claims(F: Findings, matrix: dict[str, Any]) -> None:
    non_claims = set(matrix.get("nonClaims", []))
    missing = REQUIRED_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-DOMAIN-DEPTH-007", "nonClaims", f"missing non-claims: {sorted(missing)}")
    if matrix.get("prohibitedClaimsMade"):
        F.add("USF-DOMAIN-DEPTH-007", "prohibitedClaimsMade", "prohibited readiness or certification claim is recorded as made")
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        for control in controls(row):
            if control.get("effectivenessState") in PROOF_EFFECTIVENESS_STATES:
                control_non_claims = set(control.get("nonClaims", []))
                if not control_non_claims:
                    F.add("USF-DOMAIN-DEPTH-007", control.get("id", row.get("id", "unknown")), "proof control must carry non-claims")


def check_enterprise_linkage(F: Findings, matrix: dict[str, Any], enterprise_model: Any) -> None:
    ids = enterprise_ids(enterprise_model)
    if not ids:
        F.add("USF-DOMAIN-DEPTH-008", str(ENTERPRISE_MODEL_PATH), "enterprise evidence model could not be read")
        return
    for ref in matrix.get("enterpriseEvidenceRefs", []):
        if ref not in ids:
            F.add("USF-DOMAIN-DEPTH-008", ref, "top-level enterprise evidence ref missing from model")
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict):
            continue
        refs = row.get("enterpriseEvidenceRefs")
        if not isinstance(refs, list) or not refs:
            F.add("USF-DOMAIN-DEPTH-008", row.get("id", "unknown"), "domain lacks enterprise evidence refs")
            continue
        for ref in refs:
            if ref not in ids:
                F.add("USF-DOMAIN-DEPTH-008", ref, "domain enterprise evidence ref missing from model")
        for control in controls(row):
            for ref in control.get("evidenceRefs", []):
                if ref not in ids:
                    F.add("USF-DOMAIN-DEPTH-008", ref, "control evidence ref missing from model")


def check_usf_153_boundary(F: Findings, matrix: dict[str, Any]) -> None:
    for row in matrix.get("domainRows", []):
        if not isinstance(row, dict) or row.get("sourceIssue") != "USF-153":
            continue
        if row.get("doNotReparent") is not True:
            F.add("USF-DOMAIN-DEPTH-009", "USF-153", "USF-153 must carry doNotReparent=true")
        parent_note = str(row.get("linearParentKnown", ""))
        if "USF-152" not in parent_note or "do not reparent" not in parent_note.lower():
            F.add("USF-DOMAIN-DEPTH-009", "USF-153", "USF-153 parent note must preserve USF-152 and no-reparent boundary")


def run_checks(state: dict[str, Any]) -> Findings:
    F = Findings()
    matrix = state.get("matrix")
    check_shape(F, matrix)
    if F.blocking_or_error():
        return F
    assert isinstance(matrix, dict)
    check_required_domains(F, matrix)
    check_effectiveness(F, matrix)
    check_deferred_fields(F, matrix)
    check_proof_fields(F, matrix, state.get("package"))
    check_status_integrity(F, matrix)
    check_non_claims(F, matrix)
    check_enterprise_linkage(F, matrix, state.get("enterpriseModel"))
    check_usf_153_boundary(F, matrix)
    return F


def run_selftest() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if not (ROOT / SELFTEST_DIR).exists():
        return findings
    for path in sorted((ROOT / SELFTEST_DIR).glob("*.json")):
        defect = json.loads(path.read_text(encoding="utf-8"))
        expected = defect.get("expectedRule")
        state = load_state(defect)
        F = run_checks(state)
        if expected not in F.rule_ids():
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-DOMAIN-DEPTH-SELFTEST",
                    "subject": str(path.relative_to(ROOT)),
                    "message": f"expected {expected}, got {sorted(F.rule_ids())}",
                }
            )
    return findings


def render(mode: str, findings: list[dict[str, str]], json_output: bool) -> None:
    status = "pass" if not findings else "fail"
    if json_output:
        print(json.dumps({"validator": "validate-domain-depth", "mode": mode, "status": status, "findings": findings}, indent=2))
    else:
        suffix = "PASS" if not findings else f"FAIL ({len(findings)} findings)"
        print(f"USF domain-depth validator [{mode}]: {suffix}")
        for finding in findings:
            print(f"- {finding['ruleId']} {finding['subject']}: {finding['message']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="USF-191 domain deferred-depth closure validator.")
    parser.add_argument("mode", choices=["all", "matrix", "selftest"], help="validation mode")
    parser.add_argument("--json", action="store_true", help="emit JSON")
    args = parser.parse_args()

    findings: list[dict[str, str]] = []
    if args.mode in {"all", "matrix"}:
        findings.extend(run_checks(load_state()).items)
    if args.mode in {"all", "selftest"}:
        findings.extend(run_selftest())

    render(args.mode, findings, args.json)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
