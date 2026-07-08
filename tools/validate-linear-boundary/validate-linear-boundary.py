#!/usr/bin/env python3
"""Validate USF Linear boundary and repository self-sufficiency audit artefacts."""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json"
AUDIT = ROOT / "docs/architecture/linear-repository-delivery-audit.json"

RULES = {
    "USF-LINEAR-001": "Linear boundary policy is missing or malformed",
    "USF-LINEAR-002": "Linear is allowed to define semantic authority",
    "USF-LINEAR-003": "Repository self-sufficiency audit is missing or malformed",
    "USF-LINEAR-004": "Repository delivery audit does not capture required follow-up issues",
    "USF-LINEAR-005": "Repository command or validator path depends on Linear access",
    "USF-LINEAR-006": "Unresolved Linear work delivery rules are missing or malformed",
}

DISALLOWED_RUNTIME_MARKERS = (
    "process.env.LINEAR_API_KEY",
    "api.linear.app",
    "linear.app/graphql",
    "mcp__codex_apps__linear",
)

SCAN_PATHS = [
    ROOT / "package.json",
    ROOT / "Makefile",
    ROOT / "tools",
    ROOT / "packages",
    ROOT / "apps",
]

REQUIRED_CLASSIFICATIONS = {
    "realised-in-repository",
    "realised-as-semantic-policy-only",
    "partially-realised-new-child-required",
    "not-realised-new-child-required",
    "external-provider-legal-credential-action-required",
    "intentionally-deferred-with-repository-authority",
    "obsolete-superseded-with-repository-authority",
    "linear-only-semantic-knowledge-found-repository-copy-required",
}

REQUIRED_FOLLOW_UP_STATES = {
    "unresolved",
    "blocked",
    "external-provider",
    "credential-gated",
    "duplicate",
    "canceled",
    "obsolete",
    "operational-only",
}

REQUIRED_UNRESOLVED_WORK_TYPES = {
    "repository-unreferenced-issue-key-disposition",
    "credentialed-full-description-and-comment-export-reconciliation",
    "deferred-blocked-unresolved-linear-work-later-issue-delivery",
}


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def finding(rule_id: str, subject: str, message: str) -> dict[str, str]:
    return {
        "severity": "blocking",
        "ruleId": rule_id,
        "subject": subject,
        "message": message,
    }


def check_policy(policy: dict[str, Any]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if policy.get("issueId") != "USF-1002":
        findings.append(finding("USF-LINEAR-001", str(POLICY.relative_to(ROOT)), "policy must be scoped to USF-1002"))
    boundary = policy.get("boundary")
    if not isinstance(boundary, dict):
        findings.append(finding("USF-LINEAR-001", str(POLICY.relative_to(ROOT)), "boundary object is required"))
        return findings
    required_false = [
        "linearDefinesSemanticAuthority",
        "linearIssueDescriptionsDefineSemantics",
        "linearCommentsDefineSemantics",
        "linearLabelsDefineSemantics",
        "linearStatusDefinesReadiness",
        "validatorsRequireLinearAccess",
        "proofGatesRequireLinearAccess",
    ]
    for key in required_false:
        if boundary.get(key) is not False:
            findings.append(finding("USF-LINEAR-002", f"boundary.{key}", "value must be false"))
    required_true = [
        "repositoryArtifactsDefineSemantics",
        "linearReferencesAreTraceabilityOnly",
        "distributedCopiesRemainSemanticallyCompleteWithoutLinear",
    ]
    for key in required_true:
        if boundary.get(key) is not True:
            findings.append(finding("USF-LINEAR-001", f"boundary.{key}", "value must be true"))
    follow_up = policy.get("linearFollowUpDeliveryRules")
    if not isinstance(follow_up, dict):
        findings.append(finding("USF-LINEAR-006", "linearFollowUpDeliveryRules", "object is required"))
        return findings
    required_follow_up_true = [
        "unresolvedWorkRequiresRepositoryDisposition",
        "remainingWorkIsTrackedByLinearFollowUpIssues",
        "followUpIssuesDoNotDefineSemanticAuthority",
        "followUpIssuesDoNotSatisfyAcceptanceUntilValidated",
    ]
    for key in required_follow_up_true:
        if follow_up.get(key) is not True:
            findings.append(finding("USF-LINEAR-006", f"linearFollowUpDeliveryRules.{key}", "value must be true"))
    states = set(follow_up.get("coveredWorkStates", []))
    missing_states = REQUIRED_FOLLOW_UP_STATES - states
    if missing_states:
        findings.append(finding("USF-LINEAR-006", "linearFollowUpDeliveryRules.coveredWorkStates", f"missing states: {', '.join(sorted(missing_states))}"))
    return findings


def check_audit(audit: dict[str, Any]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if audit.get("issueId") != "USF-1003" or audit.get("parentIssueId") != "USF-1002":
        findings.append(finding("USF-LINEAR-003", str(AUDIT.relative_to(ROOT)), "audit must be scoped to USF-1003 with parent USF-1002"))
    classifications = set(audit.get("classificationModel", []))
    missing = REQUIRED_CLASSIFICATIONS - classifications
    if missing:
        findings.append(finding("USF-LINEAR-003", "classificationModel", f"missing classifications: {', '.join(sorted(missing))}"))
    issue_range = audit.get("issueKeyRangeAudited")
    if not isinstance(issue_range, dict) or issue_range.get("count", 0) < 1003:
        findings.append(finding("USF-LINEAR-003", "issueKeyRangeAudited", "audit must cover at least USF-1 through USF-1003"))
    child_ids = {item.get("id") for item in audit.get("newChildIssuesCreated", []) if isinstance(item, dict)}
    for required in ("USF-1004", "USF-1005", "USF-1006"):
        if required not in child_ids:
            findings.append(finding("USF-LINEAR-004", "newChildIssuesCreated", f"missing child issue {required}"))
    delivery = audit.get("unresolvedLinearWorkDelivery")
    if not isinstance(delivery, dict):
        findings.append(finding("USF-LINEAR-006", "unresolvedLinearWorkDelivery", "object is required"))
    else:
        if delivery.get("deliveryMode") != "linear-issue-follow-up":
            findings.append(finding("USF-LINEAR-006", "unresolvedLinearWorkDelivery.deliveryMode", "value must be linear-issue-follow-up"))
        required_delivery_true = [
            "semanticAuthorityCopiedToRepositoryBeforeIssueCompletion",
            "followUpIssuesDoNotCompleteThisAuditWork",
            "followUpIssuesDoNotDefineSemanticAuthority",
        ]
        for key in required_delivery_true:
            if delivery.get(key) is not True:
                findings.append(finding("USF-LINEAR-006", f"unresolvedLinearWorkDelivery.{key}", "value must be true"))
        follow_up_ids = set(delivery.get("followUpIssueIds", []))
        for required in ("USF-1004", "USF-1005", "USF-1006"):
            if required not in follow_up_ids:
                findings.append(finding("USF-LINEAR-006", "unresolvedLinearWorkDelivery.followUpIssueIds", f"missing follow-up issue {required}"))
        work_types = set(delivery.get("coveredUnresolvedWorkTypes", []))
        missing_work_types = REQUIRED_UNRESOLVED_WORK_TYPES - work_types
        if missing_work_types:
            findings.append(finding("USF-LINEAR-006", "unresolvedLinearWorkDelivery.coveredUnresolvedWorkTypes", f"missing work types: {', '.join(sorted(missing_work_types))}"))
    copied = audit.get("linearOnlySemanticKnowledgeCopied", [])
    if not any(isinstance(item, dict) and item.get("repositoryPath") == str(POLICY.relative_to(ROOT)) for item in copied):
        findings.append(finding("USF-LINEAR-004", "linearOnlySemanticKnowledgeCopied", "USF-1002 boundary knowledge must be copied into repository policy"))
    return findings


def iter_scan_files() -> list[Path]:
    files: list[Path] = []
    for base in SCAN_PATHS:
        if not base.exists():
            continue
        if base.is_file():
            files.append(base)
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.suffix in {".py", ".js", ".mjs", ".ts", ".tsx", ".json", ".yml", ".yaml"}:
                files.append(path)
    return files


def check_runtime_linear_dependency() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    self_path = Path(__file__).resolve()
    for path in iter_scan_files():
        if path.resolve() == self_path:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for marker in DISALLOWED_RUNTIME_MARKERS:
            if marker in text:
                findings.append(finding("USF-LINEAR-005", str(path.relative_to(ROOT)), f"disallowed Linear runtime marker present: {marker}"))
    return findings


def validate(policy: dict[str, Any] | None = None, audit: dict[str, Any] | None = None, include_runtime_scan: bool = True) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    try:
        policy_data = load_json(POLICY) if policy is None else policy
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return [finding("USF-LINEAR-001", str(POLICY.relative_to(ROOT)), str(exc))]
    try:
        audit_data = load_json(AUDIT) if audit is None else audit
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return [finding("USF-LINEAR-003", str(AUDIT.relative_to(ROOT)), str(exc))]
    findings.extend(check_policy(policy_data))
    findings.extend(check_audit(audit_data))
    if include_runtime_scan:
        findings.extend(check_runtime_linear_dependency())
    return findings


def selftest() -> list[dict[str, str]]:
    policy = load_json(POLICY)
    audit = load_json(AUDIT)
    tests = []

    mutated_policy = copy.deepcopy(policy)
    mutated_policy["boundary"]["linearDefinesSemanticAuthority"] = True
    tests.append(("policy-allows-linear-authority", validate(mutated_policy, audit, include_runtime_scan=False), "USF-LINEAR-002"))

    mutated_audit = copy.deepcopy(audit)
    mutated_audit["newChildIssuesCreated"] = [item for item in mutated_audit.get("newChildIssuesCreated", []) if item.get("id") != "USF-1004"]
    tests.append(("audit-missing-child-issue", validate(policy, mutated_audit, include_runtime_scan=False), "USF-LINEAR-004"))

    mutated_audit = copy.deepcopy(audit)
    mutated_audit["unresolvedLinearWorkDelivery"]["deliveryMode"] = "repository-complete"
    tests.append(("audit-invalid-unresolved-work-delivery", validate(policy, mutated_audit, include_runtime_scan=False), "USF-LINEAR-006"))

    findings: list[dict[str, str]] = []
    for name, observed, expected_rule in tests:
        if not any(item.get("ruleId") == expected_rule for item in observed):
            findings.append(finding("USF-LINEAR-003", name, f"selftest did not trigger {expected_rule}"))
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
