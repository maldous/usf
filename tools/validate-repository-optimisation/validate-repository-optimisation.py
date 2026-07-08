#!/usr/bin/env python3
"""Validate bounded repository optimisation realisation evidence."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
TRANCHE = ROOT / "docs/architecture/repository-optimisation-local-realisation-tranche.json"
NON_LOCAL_EVALUATION = ROOT / "docs/architecture/repository-non-local-optimisation-option-evaluation.json"
SEMANTICS = ROOT / "docs/architecture/repository-optimisation-realisation-semantics.json"
LINEAR_POLICY = ROOT / "docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json"
LINEAR_AUDIT = ROOT / "docs/architecture/linear-repository-delivery-audit.json"
PACKAGE = ROOT / "package.json"

REPORTS = {
    "USF-997": ROOT / "evidence/generated-reports/repository-optimisation-json-parse-reuse-baseline.json",
    "USF-998": ROOT / "evidence/generated-reports/repository-optimisation-path-inventory-baseline.json",
    "USF-999": ROOT / "evidence/generated-reports/repository-optimisation-affected-run-baseline.json",
    "USF-1000": ROOT / "evidence/generated-reports/repository-optimisation-screenshot-retention-baseline.json",
    "USF-1001": ROOT / "evidence/generated-reports/repository-optimisation-compose-timing-baseline.json",
    "USF-1007": ROOT / "evidence/generated-reports/repository-optimisation-non-local-options-evaluation-baseline.json",
    "USF-996": ROOT / "evidence/generated-reports/repository-optimisation-bounded-realisation-summary.json",
}

REQUIRED_IMPLEMENTED = {"USF-997", "USF-998", "USF-999", "USF-1000", "USF-1001", "USF-1007"}
REQUIRED_FOLLOW_UPS = {"USF-1004", "USF-1005", "USF-1006", "USF-1008"}
REQUIRED_REPORT_REFS = {
    "USF-997": {
        "cache-boundary:per-process",
        "cache-key:abspath,mtime_ns,size",
        "deepcopy-isolation:passed",
        "stale-negative-control:passed",
        "no-stale-parsed-data:true",
        "validator-equivalence:passed",
        "validator-findings-equivalent:true",
        "timing-comparison:warn-only",
    },
    "USF-998": {
        "scan-mode:declared-root-inventory",
        "repository-wide-glob-avoided:true",
        "previous-scan-comparison:git-tracked-and-untracked",
        "coverage-equivalence:passed",
        "generated-boundaries-preserved:true",
        "missing-from-declared:0",
        "extra-in-declared:0",
    },
    "USF-999": {
        "enforcement-mode:warn-only",
        "hard-ci-block:false",
        "path-class-rules:explicit",
        "unknown-path-negative-control:full-gate-fallback",
        "affected-selftest:path-classification-pass",
        "required-checks-weakened:false",
        "timing-comparison:affected-vs-full-command-family",
        "full-command-family-measured:true",
    },
    "USF-1000": {
        "retention-mode:non-destructive-report-enforced",
        "delete-artifacts:false",
        "allowed-root-violations:0",
        "later-policy-required-for-deletion:true",
    },
    "USF-1001": {
        "startup-measurement-requested:true",
        "compose-phase-split:config,port,startup-wait,teardown",
        "generated-compose-check-exit-code:0",
        "compose-port-check-exit-code:0",
        "compose-config-exit-code:0",
        "compose-startup-wait-exit-code:0",
        "compose-teardown-exit-code:0",
        "testcontainers:evaluated-not-adopted",
        "remote-cache:evaluated-not-adopted",
        "task-graph-tooling:evaluated-not-adopted",
        "non-local-options-evaluation-issue:USF-1007",
    },
    "USF-1007": {
        "issue:USF-1007",
        "option-count:3",
        "missing-option-count:0",
        "non-local-options-adopted:false",
        "provider-environment-proof-nonclaims-preserved:true",
        "future-adoption-issue-required:true",
        "testcontainers-comparison-criteria:defined",
        "remote-cache-comparison-criteria:defined",
        "task-graph-tooling-comparison-criteria:defined",
        "testcontainers-evidence-requirements:defined",
        "remote-cache-evidence-requirements:defined",
        "task-graph-tooling-evidence-requirements:defined",
        "adoption-state:testcontainers=evaluated-not-adopted",
        "adoption-state:remote-cache=evaluated-not-adopted",
        "adoption-state:task-graph-tooling=evaluated-not-adopted",
        "no-external-provider-setup:true",
        "no-credential-persistence:true",
        "no-readiness-claim:true",
    },
    "USF-996": {
        "missing-work-represented-by-child-issues:true",
        "before-after-evidence-recorded:true",
        "validator-equivalence-required:true",
        "coverage-equivalence-required:true",
        "affected-run-negative-control-required:true",
        "full-validation-authority-preserved:true",
        "warn-only-affected-run:true",
        "non-local-options-adopted:false",
    },
}


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def finding(rule_id: str, subject: str, message: str) -> dict[str, str]:
    return {"severity": "blocking", "ruleId": rule_id, "subject": subject, "message": message}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def issue_ids(items: Any) -> set[str]:
    values: set[str] = set()
    if isinstance(items, list):
        for item in items:
            if isinstance(item, str):
                values.add(item)
            elif isinstance(item, dict):
                for key in ("issueId", "id"):
                    value = item.get(key)
                    if isinstance(value, str) and value.startswith("USF-"):
                        values.add(value)
    return values


def refs(report: dict[str, Any]) -> set[str]:
    values = set(str(item) for item in report.get("evidenceRefs", []) if isinstance(item, str))
    for item in report.get("findings", []):
        if isinstance(item, dict):
            values.update(str(ref) for ref in item.get("evidenceRefs", []) if isinstance(ref, str))
    return values


def check_reports(reports: dict[str, dict[str, Any]] | None = None) -> list[dict[str, str]]:

    findings: list[dict[str, str]] = []
    loaded: dict[str, dict[str, Any]] = reports or {}
    for issue_id, path in REPORTS.items():
        try:
            report = loaded.get(issue_id) if issue_id in loaded else load_json(path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            findings.append(finding("USF-OPT-001", rel(path), f"missing or invalid generated report: {exc}"))
            continue
        report_refs = refs(report)
        if f"issue:{issue_id}" not in report_refs:
            findings.append(finding("USF-OPT-001", rel(path), f"report must reference issue:{issue_id}"))
        if report.get("authorityLevel") != "generated-report":
            findings.append(finding("USF-OPT-001", rel(path), "report authorityLevel must be generated-report"))
        if "No Testcontainers" not in str(report.get("aiGuidance", "")):
            findings.append(finding("USF-OPT-001", rel(path), "report must preserve non-local optimisation non-claims"))
        missing_refs = REQUIRED_REPORT_REFS.get(issue_id, set()) - report_refs
        if missing_refs:
            findings.append(finding("USF-OPT-008", rel(path), f"missing required report evidence refs: {', '.join(sorted(missing_refs))}"))
    affected = loaded.get("USF-999") if loaded and "USF-999" in loaded else load_json(REPORTS["USF-999"])
    affected_refs = refs(affected)
    if "enforcement-mode:warn-only" not in affected_refs or "hard-ci-block:false" not in affected_refs:
        findings.append(finding("USF-OPT-002", rel(REPORTS["USF-999"]), "affected-run must remain warn-only with hardCiBlock false"))
    compose = loaded.get("USF-1001") if loaded and "USF-1001" in loaded else load_json(REPORTS["USF-1001"])
    compose_refs = refs(compose)
    required_compose_refs = {
        "compose-phase-split:config,port,startup-wait,teardown",
        "testcontainers:evaluated-not-adopted",
        "remote-cache:evaluated-not-adopted",
        "task-graph-tooling:evaluated-not-adopted",
        "non-local-options-evaluation-issue:USF-1007",
    }
    missing_compose_refs = required_compose_refs - compose_refs
    if missing_compose_refs:
        findings.append(finding("USF-OPT-003", rel(REPORTS["USF-1001"]), f"missing non-local optimisation evidence refs: {', '.join(sorted(missing_compose_refs))}"))
    return findings


def check_repository_artifacts(
    tranche: dict[str, Any] | None = None,
    semantics: dict[str, Any] | None = None,
    linear_policy: dict[str, Any] | None = None,
    linear_audit: dict[str, Any] | None = None,
    package: dict[str, Any] | None = None,
    non_local_evaluation: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    tranche_data = tranche or load_json(TRANCHE)
    semantics_data = semantics or load_json(SEMANTICS)
    policy_data = linear_policy or load_json(LINEAR_POLICY)
    audit_data = linear_audit or load_json(LINEAR_AUDIT)
    package_data = package or load_json(PACKAGE)
    nonlocal_data = non_local_evaluation or load_json(NON_LOCAL_EVALUATION)

    implemented = issue_ids(tranche_data.get("implementedInThisTranche", []))
    missing = REQUIRED_IMPLEMENTED - implemented
    if missing:
        findings.append(finding("USF-OPT-004", rel(TRANCHE), f"missing implemented issue ids: {', '.join(sorted(missing))}"))
    reports = set(tranche_data.get("boundedLocalEvidenceReports", {}).keys())
    missing_reports = REQUIRED_IMPLEMENTED - reports
    if missing_reports:
        findings.append(finding("USF-OPT-004", rel(TRANCHE), f"missing bounded evidence report mappings: {', '.join(sorted(missing_reports))}"))
    if "USF-1007" not in implemented:
        findings.append(finding("USF-OPT-005", rel(TRANCHE), "USF-1007 must be implemented as bounded non-local option evaluation"))
    if "USF-1007" in set(tranche_data.get("laterWorkIssueIds", [])):
        findings.append(finding("USF-OPT-005", rel(TRANCHE), "USF-1007 must not remain unrealised later work"))
    validation = semantics_data.get("validationEvidence", {})
    commands = validation.get("commands", []) if isinstance(validation, dict) else []
    if not any("validate-repository-optimisation.py all" in str(command) for command in commands):
        findings.append(finding("USF-OPT-006", rel(SEMANTICS), "repository optimisation validator command is not recorded"))
    scripts = package_data.get("scripts", {})
    if not isinstance(scripts, dict):
        findings.append(finding("USF-OPT-009", rel(PACKAGE), "package scripts must be a JSON object"))
    else:
        expected_scripts = {
            "repository-optimisation:realise": "realise-bounded-optimisation.py all --include-startup --measure-full-family",
            "repo:affected": "realise-bounded-optimisation.py affected-run --measure-full-family",
            "compose:timing": "realise-bounded-optimisation.py compose-timing --include-startup",
            "repository-optimisation:non-local": "realise-bounded-optimisation.py non-local-options",
        }
        for script_name, expected_fragment in expected_scripts.items():
            if expected_fragment not in str(scripts.get(script_name, "")):
                findings.append(finding("USF-OPT-009", rel(PACKAGE), f"missing or weakened optimisation command script: {script_name}"))


    nonlocal_data = non_local_evaluation or load_json(NON_LOCAL_EVALUATION)
    scope = nonlocal_data.get("evaluationScope", {})
    options = {option.get("id"): option for option in nonlocal_data.get("options", [])}
    required_options = {"testcontainers", "remote-cache", "task-graph-tooling"}
    missing_options = required_options - set(options)
    if missing_options:
        findings.append(finding("USF-OPT-008", rel(NON_LOCAL_EVALUATION), f"missing non-local optimisation options: {', '.join(sorted(missing_options))}"))
    if scope.get("adoptionBoundary") is not False:
        findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), "non-local optimisation adoption boundary must remain false"))
    for field in ["externalProviderSetup", "credentialPersistence", "stagingOrDeploymentChange", "productionReadinessClaim"]:
        if scope.get(field) is not False:
            findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), f"non-local optimisation field must remain false: {field}"))
    if scope.get("providerEnvironmentProofNonclaimsPreserved") is not True:
        findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), "provider/environment proof nonclaims must be preserved"))
    if scope.get("futureAdoptionIssueRequired") is not True:
        findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), "future option adoption must require a separate issue"))
    for option_id in sorted(required_options):
        option = options.get(option_id, {})
        if option.get("adoptionState") != "evaluated-not-adopted":
            findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), f"option must be evaluated-not-adopted: {option_id}"))
        if not option.get("comparisonCriteria"):
            findings.append(finding("USF-OPT-008", rel(NON_LOCAL_EVALUATION), f"option missing comparison criteria: {option_id}"))
        if not option.get("evidenceRequirements"):
            findings.append(finding("USF-OPT-008", rel(NON_LOCAL_EVALUATION), f"option missing evidence requirements: {option_id}"))
        if option.get("futureIssueRequiredForAdoption") is not True:
            findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), f"option must require future issue for adoption: {option_id}"))

    follow_rules = policy_data.get("linearFollowUpDeliveryRules", {})
    if follow_rules.get("deferredBlockedAndUnresolvedWorkDeliveredAsLaterLinearIssues") is not True:
        findings.append(finding("USF-OPT-007", rel(LINEAR_POLICY), "deferred/blocked/unresolved Linear work must be delivered as later Linear issues"))
    delivery = audit_data.get("unresolvedLinearWorkDelivery", {})
    follow_ids = set(delivery.get("followUpIssueIds", [])) if isinstance(delivery, dict) else set()
    missing_followups = REQUIRED_FOLLOW_UPS - follow_ids
    if missing_followups:
        findings.append(finding("USF-OPT-007", rel(LINEAR_AUDIT), f"missing follow-up issue ids: {', '.join(sorted(missing_followups))}"))
    return findings


def validate() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    findings.extend(check_reports())
    findings.extend(check_repository_artifacts())
    return findings


def selftest() -> list[dict[str, str]]:
    tests = []
    affected = load_json(REPORTS["USF-999"])
    mutated_affected = copy.deepcopy(affected)
    for item in mutated_affected.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "hard-ci-block:false"]
    tests.append(("affected-run-hard-block", check_reports({"USF-999": mutated_affected}), "USF-OPT-002"))

    compose = load_json(REPORTS["USF-1001"])
    mutated_compose = copy.deepcopy(compose)
    for item in mutated_compose.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "testcontainers:evaluated-not-adopted"]
    tests.append(("testcontainers-adopted", check_reports({"USF-1001": mutated_compose}), "USF-OPT-003"))

    policy = load_json(LINEAR_POLICY)
    mutated_policy = copy.deepcopy(policy)
    mutated_policy["linearFollowUpDeliveryRules"]["deferredBlockedAndUnresolvedWorkDeliveredAsLaterLinearIssues"] = False
    tests.append(("linear-follow-up-issues-disabled", check_repository_artifacts(linear_policy=mutated_policy), "USF-OPT-007"))

    package = load_json(PACKAGE)
    mutated_package = copy.deepcopy(package)
    mutated_package["scripts"]["repo:affected"] = "python3 tools/repository-optimisation/realise-bounded-optimisation.py affected-run"
    tests.append(("affected-script-weakened", check_repository_artifacts(package=mutated_package), "USF-OPT-009"))

    json_reuse = load_json(REPORTS["USF-997"])
    mutated_json_reuse = copy.deepcopy(json_reuse)
    for item in mutated_json_reuse.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "validator-equivalence:passed"]
    tests.append(("json-reuse-equivalence-missing", check_reports({"USF-997": mutated_json_reuse}), "USF-OPT-008"))

    path_inventory = load_json(REPORTS["USF-998"])
    mutated_path_inventory = copy.deepcopy(path_inventory)
    for item in mutated_path_inventory.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "coverage-equivalence:passed"]
    tests.append(("path-inventory-equivalence-missing", check_reports({"USF-998": mutated_path_inventory}), "USF-OPT-008"))

    affected = load_json(REPORTS["USF-999"])
    mutated_affected = copy.deepcopy(affected)
    for item in mutated_affected.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "unknown-path-negative-control:full-gate-fallback"]
    tests.append(("affected-negative-control-missing", check_reports({"USF-999": mutated_affected}), "USF-OPT-008"))

    screenshot = load_json(REPORTS["USF-1000"])
    mutated_screenshot = copy.deepcopy(screenshot)
    for item in mutated_screenshot.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "delete-artifacts:false"]
    tests.append(("screenshot-retention-delete-boundary-missing", check_reports({"USF-1000": mutated_screenshot}), "USF-OPT-008"))

    compose = load_json(REPORTS["USF-1001"])
    mutated_compose = copy.deepcopy(compose)
    for item in mutated_compose.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "startup-measurement-requested:true"]
    tests.append(("compose-startup-measurement-missing", check_reports({"USF-1001": mutated_compose}), "USF-OPT-008"))


    nonlocal_data = load_json(NON_LOCAL_EVALUATION)
    mutated_nonlocal = copy.deepcopy(nonlocal_data)
    mutated_nonlocal["evaluationScope"]["adoptionBoundary"] = True
    tests.append(("non-local-adoption-boundary-mutated", check_repository_artifacts(non_local_evaluation=mutated_nonlocal), "USF-OPT-010"))

    nonlocal_report = load_json(REPORTS["USF-1007"])
    mutated_nonlocal_report = copy.deepcopy(nonlocal_report)
    for item in mutated_nonlocal_report.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "testcontainers-comparison-criteria:defined"]
    tests.append(("non-local-report-comparison-missing", check_reports({"USF-1007": mutated_nonlocal_report}), "USF-OPT-008"))

    findings: list[dict[str, str]] = []
    for name, observed, expected in tests:
        if not any(item.get("ruleId") == expected for item in observed):
            findings.append(finding("USF-OPT-SELFTEST", name, f"selftest did not trigger {expected}"))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    findings = selftest() if args.mode == "selftest" else validate()
    payload = {"mode": args.mode, "findings": findings}
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for item in findings:
            print(f"{item['ruleId']} {item['subject']}: {item['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
