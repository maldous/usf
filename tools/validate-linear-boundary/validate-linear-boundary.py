#!/usr/bin/env python3
"""Validate USF Linear boundary and repository self-sufficiency audit artefacts."""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json"
AUDIT = ROOT / "docs/architecture/linear-repository-delivery-audit.json"
DISPOSITION = ROOT / "docs/architecture/linear-repository-unreferenced-issue-disposition.json"
EXPORT_AVAILABILITY = ROOT / "docs/architecture/linear-full-content-export-availability.json"

RULES = {
    "USF-LINEAR-001": "Linear boundary policy is missing or malformed",
    "USF-LINEAR-002": "Linear is allowed to define semantic authority",
    "USF-LINEAR-003": "Repository self-sufficiency audit is missing or malformed",
    "USF-LINEAR-004": "Repository delivery audit does not capture required follow-up issues",
    "USF-LINEAR-005": "Repository command or validator path depends on Linear access",
    "USF-LINEAR-006": "Unresolved Linear work delivery rules are missing or malformed",
    "USF-LINEAR-007": "Repository-unreferenced Linear issue disposition is missing or malformed",
    "USF-LINEAR-008": "Linear full-content export availability boundary is missing or malformed",
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
    "safe-full-content-disposition-for-repository-unreferenced-issue-keys",
}

REQUIRED_FOLLOW_UP_ISSUES = ("USF-1004", "USF-1005", "USF-1006", "USF-1008")
ISSUE_KEY_RE = re.compile(r"\bUSF-\d+\b")
REFERENCE_SCAN_BINARY_SUFFIXES = {
    ".gif",
    ".gz",
    ".ico",
    ".jpeg",
    ".jpg",
    ".pdf",
    ".png",
    ".webp",
    ".zip",
}
REFERENCE_SCAN_EXCLUDED_DIR_NAMES = {".claude", ".codex", ".git"}


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
    later_work_ids = set(follow_up.get("laterWorkTrackingIssueIds", []))
    for required in REQUIRED_FOLLOW_UP_ISSUES:
        if required not in later_work_ids:
            findings.append(finding("USF-LINEAR-006", "linearFollowUpDeliveryRules.laterWorkTrackingIssueIds", f"missing later-work issue {required}"))
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
    for required in REQUIRED_FOLLOW_UP_ISSUES:
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
        for required in REQUIRED_FOLLOW_UP_ISSUES:
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


def check_disposition(disposition: dict[str, Any]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if disposition.get("issueId") != "USF-1004" or disposition.get("parentIssueId") != "USF-1003":
        findings.append(finding("USF-LINEAR-007", str(DISPOSITION.relative_to(ROOT)), "disposition must be scoped to USF-1004 with parent USF-1003"))
    if disposition.get("sourceAuditArtifact") != str(AUDIT.relative_to(ROOT)):
        findings.append(finding("USF-LINEAR-007", "sourceAuditArtifact", "must point to the repository delivery audit artifact"))
    scan = disposition.get("repositoryReferenceScan")
    per_key = disposition.get("perKeyDispositions")
    if not isinstance(scan, dict):
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan", "object is required"))
        return findings
    if not isinstance(per_key, list):
        findings.append(finding("USF-LINEAR-007", "perKeyDispositions", "list is required"))
        return findings
    issue_ids = [item.get("issueId") for item in per_key if isinstance(item, dict)]
    if not all(isinstance(issue_id, str) for issue_id in issue_ids):
        findings.append(finding("USF-LINEAR-007", "perKeyDispositions.issueId", "each per-key disposition must have an issue ID"))
        return findings
    reference_index = build_repository_issue_reference_index(set(issue_ids))
    if scan.get("auditSetIssueCount") != len(per_key):
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan.auditSetIssueCount", "must match per-key disposition count"))
    if scan.get("auditSetIssueCount") != 138:
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan.auditSetIssueCount", "must remain 138 for the USF-1003 audit set"))
    required_full = [
        item for item in per_key
        if isinstance(item, dict) and item.get("disposition") == "requires-safe-full-content-disposition"
    ]
    referenced = [
        item for item in per_key
        if isinstance(item, dict) and item.get("disposition") == "repository-reference-present-current"
    ]
    if scan.get("requiresSafeFullContentDispositionCount") != len(required_full):
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan.requiresSafeFullContentDispositionCount", "must match per-key unresolved disposition count"))
    if scan.get("repositoryReferencePresentCount") != len(referenced):
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan.repositoryReferencePresentCount", "must match per-key referenced disposition count"))
    actual_referenced = [
        item for item in per_key
        if isinstance(item, dict) and reference_index.get(item.get("issueId", ""))
    ]
    actual_required_full = [
        item for item in per_key
        if isinstance(item, dict) and not reference_index.get(item.get("issueId", ""))
    ]
    if scan.get("repositoryReferencePresentCount") != len(actual_referenced):
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan.repositoryReferencePresentCount", "must match current repository reference scan"))
    if scan.get("requiresSafeFullContentDispositionCount") != len(actual_required_full):
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan.requiresSafeFullContentDispositionCount", "must match current repository reference scan"))
    if scan.get("requiresSafeFullContentDispositionFollowUpIssueId") != "USF-1008":
        findings.append(finding("USF-LINEAR-007", "repositoryReferenceScan.requiresSafeFullContentDispositionFollowUpIssueId", "must be USF-1008"))
    for item in per_key:
        if not isinstance(item, dict):
            continue
        issue_id = item.get("issueId")
        if not isinstance(issue_id, str):
            continue
        disposition_value = item.get("disposition")
        actual_paths = reference_index.get(issue_id, [])
        evidence_sample = item.get("repositoryReferenceEvidencePathSample")
        if not isinstance(evidence_sample, list) or not all(isinstance(path, str) for path in evidence_sample):
            findings.append(finding("USF-LINEAR-007", issue_id, "repository reference evidence sample must be a list of paths"))
            continue
        if item.get("repositoryReferenceEvidencePathSampleCount") != len(evidence_sample):
            findings.append(finding("USF-LINEAR-007", issue_id, "repository reference evidence sample count must match sample paths"))
        if item.get("repositoryReferenceEvidenceTotalPathCount") != len(actual_paths):
            findings.append(finding("USF-LINEAR-007", issue_id, "repository reference evidence total must match current repository scan"))
        stale_sample_paths = sorted(set(evidence_sample) - set(actual_paths))
        if stale_sample_paths:
            findings.append(finding("USF-LINEAR-007", issue_id, f"repository reference evidence paths do not contain current issue key: {', '.join(stale_sample_paths[:5])}"))
        if disposition_value == "repository-reference-present-current":
            if not actual_paths:
                findings.append(finding("USF-LINEAR-007", issue_id, "claimed repository reference is absent from current repository scan"))
            if item.get("followUpIssueId") is not None or item.get("completionClaim") != "reference-presence-only":
                findings.append(finding("USF-LINEAR-007", issue_id, "referenced dispositions must remain reference-presence-only without follow-up completion"))
        elif disposition_value == "requires-safe-full-content-disposition":
            if actual_paths:
                findings.append(finding("USF-LINEAR-007", issue_id, "current repository reference exists, so unresolved disposition is stale"))
            if evidence_sample:
                findings.append(finding("USF-LINEAR-007", issue_id, "unresolved dispositions must not carry repository reference evidence samples"))
        else:
            findings.append(finding("USF-LINEAR-007", issue_id, "unknown repository-unreferenced disposition value"))
    for item in required_full:
        if item.get("followUpIssueId") != "USF-1008" or item.get("completionClaim") != "not-complete":
            findings.append(finding("USF-LINEAR-007", item.get("issueId", "perKeyDispositions"), "unresolved dispositions must be carried by USF-1008 and marked not complete"))
    delivery = disposition.get("unresolvedWorkDelivery")
    if not isinstance(delivery, dict) or delivery.get("followUpIssueId") != "USF-1008":
        findings.append(finding("USF-LINEAR-007", "unresolvedWorkDelivery.followUpIssueId", "must be USF-1008"))
    boundary = disposition.get("completionBoundary")
    if not isinstance(boundary, dict):
        findings.append(finding("USF-LINEAR-007", "completionBoundary", "object is required"))
    else:
        required_true = [
            "doesNotClaimFullDescriptionAndCommentExport",
            "doesNotClaimEveryLinearIssueIsRepositoryComplete",
            "doesNotTreatDoneStatusAsProof",
            "doesNotCreateImplementationCode",
            "linearRemainsWorkTrackingOnly",
            "repositoryArtifactsRemainAuthoritative",
        ]
        for key in required_true:
            if boundary.get(key) is not True:
                findings.append(finding("USF-LINEAR-007", f"completionBoundary.{key}", "value must be true"))
    return findings


def iter_repository_reference_scan_files() -> list[Path]:
    excluded_files = {AUDIT.resolve(), DISPOSITION.resolve()}
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if any(part in REFERENCE_SCAN_EXCLUDED_DIR_NAMES for part in path.parts):
            continue
        if not path.is_file():
            continue
        if path.resolve() in excluded_files:
            continue
        if path.suffix.lower() in REFERENCE_SCAN_BINARY_SUFFIXES:
            continue
        files.append(path)
    return files


def build_repository_issue_reference_index(issue_ids: set[str]) -> dict[str, list[str]]:
    reference_index: dict[str, set[str]] = {issue_id: set() for issue_id in issue_ids}
    for path in iter_repository_reference_scan_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        referenced_ids = set(ISSUE_KEY_RE.findall(text)) & issue_ids
        if not referenced_ids:
            continue
        relative_path = path.relative_to(ROOT).as_posix()
        for issue_id in referenced_ids:
            reference_index[issue_id].add(relative_path)
    return {
        issue_id: sorted(paths)
        for issue_id, paths in reference_index.items()
    }


def check_export_availability(availability: dict[str, Any]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if availability.get("issueId") != "USF-1005" or availability.get("parentIssueId") != "USF-1003":
        findings.append(finding("USF-LINEAR-008", str(EXPORT_AVAILABILITY.relative_to(ROOT)), "availability artifact must be scoped to USF-1005 with parent USF-1003"))
    safety = availability.get("credentialSafetyBoundary")
    if not isinstance(safety, dict):
        findings.append(finding("USF-LINEAR-008", "credentialSafetyBoundary", "object is required"))
    else:
        if safety.get("chatProvidedCredentialShellUseAllowed") is not False:
            findings.append(finding("USF-LINEAR-008", "credentialSafetyBoundary.chatProvidedCredentialShellUseAllowed", "value must be false"))
        for key in ("credentialPrinted", "credentialPersisted", "credentialCommitted"):
            if safety.get(key) is not False:
                findings.append(finding("USF-LINEAR-008", f"credentialSafetyBoundary.{key}", "value must be false"))
    current = availability.get("currentExecutionAvailability")
    if not isinstance(current, dict):
        findings.append(finding("USF-LINEAR-008", "currentExecutionAvailability", "object is required"))
    else:
        if current.get("rawApiKeyBulkExportStatus") != "explicitly-unavailable-in-current-execution":
            findings.append(finding("USF-LINEAR-008", "currentExecutionAvailability.rawApiKeyBulkExportStatus", "must record explicit unavailability for the current execution"))
        if current.get("fullDescriptionAndCommentExportClaimed") is not False:
            findings.append(finding("USF-LINEAR-008", "currentExecutionAvailability.fullDescriptionAndCommentExportClaimed", "value must be false"))
    safe_output = availability.get("repositorySafeOutputRules")
    if not isinstance(safe_output, dict):
        findings.append(finding("USF-LINEAR-008", "repositorySafeOutputRules", "object is required"))
    else:
        for key in ("storeRawLinearDescriptions", "storeRawLinearComments", "storeCredentials"):
            if safe_output.get(key) is not False:
                findings.append(finding("USF-LINEAR-008", f"repositorySafeOutputRules.{key}", "value must be false"))
        for key in ("storeClassificationsOnly", "linearContentIsOperationalEvidenceNotSemanticAuthority"):
            if safe_output.get(key) is not True:
                findings.append(finding("USF-LINEAR-008", f"repositorySafeOutputRules.{key}", "value must be true"))
    delivery = availability.get("unresolvedWorkDelivery")
    if not isinstance(delivery, dict) or "USF-1008" not in set(delivery.get("followUpIssueIds", [])):
        findings.append(finding("USF-LINEAR-008", "unresolvedWorkDelivery.followUpIssueIds", "must include USF-1008"))
    boundary = availability.get("completionBoundary")
    if not isinstance(boundary, dict):
        findings.append(finding("USF-LINEAR-008", "completionBoundary", "object is required"))
    else:
        for key in ("doesNotClaimFullExportRan", "doesNotClaimEveryFullDescriptionOrCommentWasInspected", "doesNotUseLinearAsSemanticAuthority", "doesNotCreateImplementationCode"):
            if boundary.get(key) is not True:
                findings.append(finding("USF-LINEAR-008", f"completionBoundary.{key}", "value must be true"))
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


def validate(
    policy: dict[str, Any] | None = None,
    audit: dict[str, Any] | None = None,
    disposition: dict[str, Any] | None = None,
    availability: dict[str, Any] | None = None,
    include_runtime_scan: bool = True,
) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    try:
        policy_data = load_json(POLICY) if policy is None else policy
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return [finding("USF-LINEAR-001", str(POLICY.relative_to(ROOT)), str(exc))]
    try:
        audit_data = load_json(AUDIT) if audit is None else audit
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return [finding("USF-LINEAR-003", str(AUDIT.relative_to(ROOT)), str(exc))]
    try:
        disposition_data = load_json(DISPOSITION) if disposition is None else disposition
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return [finding("USF-LINEAR-007", str(DISPOSITION.relative_to(ROOT)), str(exc))]
    try:
        availability_data = load_json(EXPORT_AVAILABILITY) if availability is None else availability
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return [finding("USF-LINEAR-008", str(EXPORT_AVAILABILITY.relative_to(ROOT)), str(exc))]
    findings.extend(check_policy(policy_data))
    findings.extend(check_audit(audit_data))
    findings.extend(check_disposition(disposition_data))
    findings.extend(check_export_availability(availability_data))
    if include_runtime_scan:
        findings.extend(check_runtime_linear_dependency())
    return findings


def selftest() -> list[dict[str, str]]:
    policy = load_json(POLICY)
    audit = load_json(AUDIT)
    disposition = load_json(DISPOSITION)
    availability = load_json(EXPORT_AVAILABILITY)
    tests = []

    mutated_policy = copy.deepcopy(policy)
    mutated_policy["boundary"]["linearDefinesSemanticAuthority"] = True
    tests.append(("policy-allows-linear-authority", validate(mutated_policy, audit, disposition, availability, include_runtime_scan=False), "USF-LINEAR-002"))

    mutated_audit = copy.deepcopy(audit)
    mutated_audit["newChildIssuesCreated"] = [item for item in mutated_audit.get("newChildIssuesCreated", []) if item.get("id") != "USF-1004"]
    tests.append(("audit-missing-child-issue", validate(policy, mutated_audit, disposition, availability, include_runtime_scan=False), "USF-LINEAR-004"))

    mutated_audit = copy.deepcopy(audit)
    mutated_audit["unresolvedLinearWorkDelivery"]["deliveryMode"] = "repository-complete"
    tests.append(("audit-invalid-unresolved-work-delivery", validate(policy, mutated_audit, disposition, availability, include_runtime_scan=False), "USF-LINEAR-006"))

    mutated_disposition = copy.deepcopy(disposition)
    mutated_disposition["repositoryReferenceScan"]["requiresSafeFullContentDispositionFollowUpIssueId"] = "USF-1004"
    tests.append(("disposition-missing-follow-up", validate(policy, audit, mutated_disposition, availability, include_runtime_scan=False), "USF-LINEAR-007"))

    mutated_disposition = copy.deepcopy(disposition)
    stale_item = next(
        item for item in mutated_disposition["perKeyDispositions"]
        if item.get("disposition") == "requires-safe-full-content-disposition"
    )
    stale_item["disposition"] = "repository-reference-present-current"
    stale_item["repositoryReferenceEvidencePathSample"] = ["package.json"]
    stale_item["repositoryReferenceEvidencePathSampleCount"] = 1
    stale_item["repositoryReferenceEvidenceTotalPathCount"] = 1
    stale_item["followUpIssueId"] = None
    stale_item["completionClaim"] = "reference-presence-only"
    mutated_disposition["repositoryReferenceScan"]["repositoryReferencePresentCount"] += 1
    mutated_disposition["repositoryReferenceScan"]["requiresSafeFullContentDispositionCount"] -= 1
    tests.append(("disposition-fake-repository-reference", validate(policy, audit, mutated_disposition, availability, include_runtime_scan=False), "USF-LINEAR-007"))

    mutated_availability = copy.deepcopy(availability)
    mutated_availability["credentialSafetyBoundary"]["credentialPrinted"] = True
    tests.append(("availability-credential-printed", validate(policy, audit, disposition, mutated_availability, include_runtime_scan=False), "USF-LINEAR-008"))

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
