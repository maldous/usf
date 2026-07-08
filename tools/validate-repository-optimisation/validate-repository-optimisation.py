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
SEMANTICS = ROOT / "docs/architecture/repository-optimisation-realisation-semantics.json"
LINEAR_POLICY = ROOT / "docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json"
LINEAR_AUDIT = ROOT / "docs/architecture/linear-repository-delivery-audit.json"

REPORTS = {
    "USF-997": ROOT / "evidence/generated-reports/repository-optimisation-json-parse-reuse-baseline.json",
    "USF-998": ROOT / "evidence/generated-reports/repository-optimisation-path-inventory-baseline.json",
    "USF-999": ROOT / "evidence/generated-reports/repository-optimisation-affected-run-baseline.json",
    "USF-1000": ROOT / "evidence/generated-reports/repository-optimisation-screenshot-retention-baseline.json",
    "USF-1001": ROOT / "evidence/generated-reports/repository-optimisation-compose-timing-baseline.json",
    "USF-996": ROOT / "evidence/generated-reports/repository-optimisation-bounded-realisation-summary.json",
}

REQUIRED_IMPLEMENTED = {"USF-997", "USF-998", "USF-999", "USF-1000", "USF-1001"}
REQUIRED_FOLLOW_UPS = {"USF-1004", "USF-1005", "USF-1006"}


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
    affected = loaded.get("USF-999") if loaded and "USF-999" in loaded else load_json(REPORTS["USF-999"])
    affected_refs = refs(affected)
    if "enforcement-mode:warn-only" not in affected_refs or "hard-ci-block:false" not in affected_refs:
        findings.append(finding("USF-OPT-002", rel(REPORTS["USF-999"]), "affected-run must remain warn-only with hardCiBlock false"))
    compose = loaded.get("USF-1001") if loaded and "USF-1001" in loaded else load_json(REPORTS["USF-1001"])
    compose_refs = refs(compose)
    required_compose_refs = {
        "testcontainers:considered-not-adopted-current-tranche",
        "remote-cache:considered-not-adopted-current-tranche",
        "task-graph-tooling:considered-not-adopted-current-tranche",
        "non-local-options-later-issue:USF-1007",
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
) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    tranche_data = tranche or load_json(TRANCHE)
    semantics_data = semantics or load_json(SEMANTICS)
    policy_data = linear_policy or load_json(LINEAR_POLICY)
    audit_data = linear_audit or load_json(LINEAR_AUDIT)

    implemented = issue_ids(tranche_data.get("implementedInThisTranche", []))
    missing = REQUIRED_IMPLEMENTED - implemented
    if missing:
        findings.append(finding("USF-OPT-004", rel(TRANCHE), f"missing implemented issue ids: {', '.join(sorted(missing))}"))
    reports = set(tranche_data.get("boundedLocalEvidenceReports", {}).keys())
    missing_reports = REQUIRED_IMPLEMENTED - reports
    if missing_reports:
        findings.append(finding("USF-OPT-004", rel(TRANCHE), f"missing bounded evidence report mappings: {', '.join(sorted(missing_reports))}"))
    if "USF-1007" not in issue_ids(tranche_data.get("linearIssuesCreated", [])) and "USF-1007" not in set(tranche_data.get("laterWorkIssueIds", [])):
        findings.append(finding("USF-OPT-005", rel(TRANCHE), "USF-1007 must track non-local optimisation options for later"))
    validation = semantics_data.get("validationEvidence", {})
    commands = validation.get("commands", []) if isinstance(validation, dict) else []
    if not any("validate-repository-optimisation.py all" in str(command) for command in commands):
        findings.append(finding("USF-OPT-006", rel(SEMANTICS), "repository optimisation validator command is not recorded"))

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
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "testcontainers:considered-not-adopted-current-tranche"]
    tests.append(("testcontainers-adopted", check_reports({"USF-1001": mutated_compose}), "USF-OPT-003"))

    policy = load_json(LINEAR_POLICY)
    mutated_policy = copy.deepcopy(policy)
    mutated_policy["linearFollowUpDeliveryRules"]["deferredBlockedAndUnresolvedWorkDeliveredAsLaterLinearIssues"] = False
    tests.append(("linear-later-issues-disabled", check_repository_artifacts(linear_policy=mutated_policy), "USF-OPT-007"))

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
