#!/usr/bin/env python3
"""Validate USF evidence reuse decision artifacts.

This tool is a validator-owned enforcement layer for USF-983. It writes no
repository files and does not refresh proof-cockpit machine evidence. Ambiguous
or stale reuse decisions fail closed to a rerun for the affected proof family.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
TOOL_ROOT = Path(__file__).resolve().parent
DECISIONS_PATH = TOOL_ROOT / "evidence-reuse-decisions.json"
PLANTED_DEFECT_DIR = TOOL_ROOT / "planted-defects"
INVALIDATION_MAP_PATH = ROOT / "tools/validate-evidence-invalidation/evidence-invalidation-map.json"
PACKAGE_PATH = ROOT / "package.json"
MAKEFILE_PATH = ROOT / "Makefile"

VALIDATE_COMMAND = "python3 tools/validate-evidence-reuse/validate-evidence-reuse.py all --json"
SELFTEST_COMMAND = "python3 tools/validate-evidence-reuse/validate-evidence-reuse.py selftest --json"
MAKE_VALIDATE_TARGET = "evidence-reuse-validate"
MAKE_SELFTEST_TARGET = "evidence-reuse-selftest"

RULES = {
    "USF-EVIDENCE-REUSE-001": "reuse decision artifact shape is missing required fields",
    "USF-EVIDENCE-REUSE-002": "authority, invalidation map, or non-claim boundary is unsafe",
    "USF-EVIDENCE-REUSE-003": "evidence reference, artifact hash, or digest contract is invalid",
    "USF-EVIDENCE-REUSE-004": "stale, unknown, partial, superseded, or deferred evidence did not fail closed",
    "USF-EVIDENCE-REUSE-005": "provider or environment mismatch is unsafe",
    "USF-EVIDENCE-REUSE-006": "claimed proof level exceeds observed proof level",
    "USF-EVIDENCE-REUSE-007": "generated-report-only reuse boundary is unsafe",
    "USF-EVIDENCE-REUSE-008": "bundle metadata drift is unsafe",
    "USF-EVIDENCE-REUSE-009": "human signoff boundary is unsafe",
    "USF-EVIDENCE-REUSE-010": "ambiguous reuse decision does not fall back to full affected proof",
    "USF-EVIDENCE-REUSE-011": "package, Make, or aggregate validation wiring is stale",
    "USF-EVIDENCE-REUSE-SELFTEST": "planted defect did not raise its expected rule",
}

REQUIRED_ROOT_FIELDS = {
    "id",
    "version",
    "issueId",
    "designIssueId",
    "invalidationIssueId",
    "terminalFreshMachineQaIssue",
    "invalidationMapPath",
    "nonAuthorityStatement",
    "nonClaims",
    "allowedFreshnessStates",
    "allowedEligibilityStatuses",
    "allowedRerunModes",
    "requiredDecisionFields",
    "globalPolicies",
    "reuseDecisions",
}

REQUIRED_DECISION_FIELDS = {
    "decisionId",
    "evidenceFamily",
    "assessedCommit",
    "sourceSha",
    "targetSha",
    "providerMode",
    "targetProviderMode",
    "environment",
    "targetEnvironment",
    "claimedProofLevel",
    "observedProofLevel",
    "evidenceRefs",
    "artifactHashes",
    "inputManifestDigest",
    "artifactSetDigest",
    "chainTipDigest",
    "freshnessState",
    "eligibilityStatus",
    "reusableScope",
    "blockedScope",
    "requiredRerunMode",
    "blockingFindings",
    "ambiguityReason",
    "nonClaims",
    "humanDecisionRequired",
    "automaticHumanSignoff",
}

REQUIRED_NON_CLAIMS = {
    "no-staging-readiness",
    "no-production-readiness",
    "no-deployment-readiness",
    "no-live-provider-readiness",
    "no-product-readiness",
    "no-store-readiness",
    "no-compliance-readiness",
    "generated-reports-are-not-authority",
    "linear-is-not-semantic-authority",
    "terminal-proof-cockpit-machine-evidence-refresh-deferred-to-USF-966",
}

REQUIRED_POLICIES = {
    "unknownFallback": "full-proof-for-affected-family",
    "ambiguousFallback": "full-proof-for-affected-family",
    "partialAggregateFallback": "full-proof-for-affected-family",
    "hashMismatchFallback": "full-proof-for-affected-family",
    "providerMismatchFallback": "full-proof-for-affected-family",
    "environmentMismatchFallback": "full-proof-for-affected-family",
    "proofOverclaimFallback": "full-proof-for-affected-family",
    "generatedReportOnlyCanSatisfyProof": False,
    "supersededPayloadCanSatisfyProof": False,
    "staleCanPass": False,
    "unknownCanPass": False,
    "automaticHumanSignoffAllowed": False,
    "terminalRefreshDeferredCanPass": False,
}

ALLOWED_FRESHNESS_STATES = {
    "current",
    "stale",
    "unknown",
    "partial",
    "mismatched",
    "generated-report-only",
    "superseded",
    "human-review-required",
    "terminal-refresh-deferred",
}

ALLOWED_STATUSES = {
    "pass-current",
    "fail",
    "stale",
    "unknown",
    "partial",
    "mismatched",
    "generated-report-only",
    "superseded",
    "human-review-required",
    "blocked",
}

FAIL_CLOSED_STATES = ALLOWED_FRESHNESS_STATES - {"current"}
FAIL_CLOSED_STATUSES = ALLOWED_STATUSES - {"pass-current"}
FULL_RERUN_MODES = {
    "full-proof-for-affected-family",
    "full-proof-required",
    "terminal-usf-966-refresh",
}
GENERATED_REPORT_TYPES = {"generated-report", "derived-report", "validator-report"}
ALLOWED_EVIDENCE_TYPES = GENERATED_REPORT_TYPES | {
    "raw-evidence",
    "semantic-evidence",
    "runtime-proof-evidence",
    "validator-owned-policy",
    "attestation",
    "linear-issue",
}

PROOF_LEVEL_ORDER = {
    "syntax-shape": 1,
    "semantic-consistency": 2,
    "unit-behaviour": 3,
    "integration-behaviour": 4,
    "compose-behaviour": 5,
    "environment-proof": 6,
    "staging-proof": 7,
    "human-acceptance-proof": 8,
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def repo_relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def add_finding(findings: list[dict[str, str]], rule: str, path: str, message: str) -> None:
    findings.append(
        {
            "severity": "blocking",
            "rule": rule,
            "path": path,
            "message": message,
        }
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(char in "0123456789abcdef" for char in value)


def is_current_commit_token(value: Any, current_commit: str | None) -> bool:
    return value == "current-head" or (isinstance(value, str) and current_commit is not None and value == current_commit)


def get_current_commit() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


def ensure_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]


def validate_invalidation_map(document: dict[str, Any], findings: list[dict[str, str]]) -> None:
    rel_path = document.get("invalidationMapPath")
    if rel_path != repo_relative(INVALIDATION_MAP_PATH):
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/invalidationMapPath",
            "reuse decisions must point at the validator-owned evidence invalidation map",
        )
        return

    if not INVALIDATION_MAP_PATH.exists():
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/invalidationMapPath",
            "evidence invalidation map is missing",
        )
        return

    try:
        invalidation_map = load_json(INVALIDATION_MAP_PATH)
    except json.JSONDecodeError as exc:
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/invalidationMapPath",
            f"evidence invalidation map is not strict JSON: {exc}",
        )
        return

    policies = invalidation_map.get("globalPolicies")
    if not isinstance(policies, dict):
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/invalidationMapPath/globalPolicies",
            "evidence invalidation map lacks global policies",
        )
        return

    if policies.get("unknownInputFallback") != "full-proof-for-affected-family-or-widen-to-all":
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/invalidationMapPath/globalPolicies/unknownInputFallback",
            "unknown input fallback must fail closed through the invalidation map",
        )
    if policies.get("generatedReportOnlyCanSatisfyProof") is not False:
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/invalidationMapPath/globalPolicies/generatedReportOnlyCanSatisfyProof",
            "generated-report-only evidence must not satisfy proof",
        )
    if policies.get("automaticHumanSignoffAllowed") is not False:
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/invalidationMapPath/globalPolicies/automaticHumanSignoffAllowed",
            "automatic human signoff must remain forbidden",
        )


def validate_root(document: Any, findings: list[dict[str, str]]) -> None:
    if not isinstance(document, dict):
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/", "reuse decision artifact must be a JSON object")
        return

    missing = sorted(REQUIRED_ROOT_FIELDS - set(document))
    for field in missing:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", f"/{field}", "required root field is missing")

    if document.get("id") != "evidence-reuse-decisions":
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/id", "unexpected artifact id")
    if document.get("issueId") != "USF-983":
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/issueId", "reuse artifact must be tied to USF-983")
    if document.get("designIssueId") != "USF-975":
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/designIssueId", "reuse artifact must name USF-975 as the design input")
    if document.get("invalidationIssueId") != "USF-984":
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/invalidationIssueId", "reuse artifact must name USF-984 as the invalidation input")
    if document.get("terminalFreshMachineQaIssue") != "USF-966":
        add_finding(findings, "USF-EVIDENCE-REUSE-002", "/terminalFreshMachineQaIssue", "terminal proof-cockpit refresh must remain deferred to USF-966")

    non_authority = document.get("nonAuthorityStatement")
    if not isinstance(non_authority, str) or "does not define USF semantic authority" not in non_authority:
        add_finding(
            findings,
            "USF-EVIDENCE-REUSE-002",
            "/nonAuthorityStatement",
            "artifact must state that it does not define USF semantic authority",
        )

    root_non_claims = set(ensure_string_list(document.get("nonClaims")))
    for non_claim in sorted(REQUIRED_NON_CLAIMS - root_non_claims):
        add_finding(findings, "USF-EVIDENCE-REUSE-002", "/nonClaims", f"required non-claim is missing: {non_claim}")

    freshness_states = set(ensure_string_list(document.get("allowedFreshnessStates")))
    if freshness_states != ALLOWED_FRESHNESS_STATES:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/allowedFreshnessStates", "freshness state set is incomplete or unsafe")

    statuses = set(ensure_string_list(document.get("allowedEligibilityStatuses")))
    if statuses != ALLOWED_STATUSES:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/allowedEligibilityStatuses", "eligibility status set is incomplete or unsafe")

    required_fields = set(ensure_string_list(document.get("requiredDecisionFields")))
    if required_fields != REQUIRED_DECISION_FIELDS:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/requiredDecisionFields", "required decision field set is incomplete")

    policies = document.get("globalPolicies")
    if not isinstance(policies, dict):
        add_finding(findings, "USF-EVIDENCE-REUSE-002", "/globalPolicies", "global policies must be an object")
    else:
        for key, expected in sorted(REQUIRED_POLICIES.items()):
            if policies.get(key) != expected:
                add_finding(findings, "USF-EVIDENCE-REUSE-002", f"/globalPolicies/{key}", "required fail-closed policy is missing or unsafe")

    decisions = document.get("reuseDecisions")
    if not isinstance(decisions, list) or not decisions:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", "/reuseDecisions", "at least one reuse decision record is required")


def validate_evidence_refs(decision: dict[str, Any], base_path: str, findings: list[dict[str, str]]) -> bool:
    refs = decision.get("evidenceRefs")
    if not isinstance(refs, list) or not refs:
        add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{base_path}/evidenceRefs", "evidenceRefs must be a non-empty array")
        return False

    all_generated = True
    for index, ref in enumerate(refs):
        ref_path = f"{base_path}/evidenceRefs/{index}"
        if not isinstance(ref, dict):
            add_finding(findings, "USF-EVIDENCE-REUSE-003", ref_path, "evidence reference must be an object")
            continue

        ref_type = ref.get("type")
        if ref_type not in ALLOWED_EVIDENCE_TYPES:
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{ref_path}/type", "evidence reference type is not recognised")
            all_generated = False
            continue

        if ref_type not in GENERATED_REPORT_TYPES:
            all_generated = False

        if ref_type == "linear-issue":
            issue_key = ref.get("issueKey")
            if not isinstance(issue_key, str) or not issue_key.startswith("USF-"):
                add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{ref_path}/issueKey", "Linear evidence references must name a USF issue key")
            continue

        path_value = ref.get("path")
        if not isinstance(path_value, str) or not path_value:
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{ref_path}/path", "repository evidence references must include a path")
            continue
        if Path(path_value).is_absolute() or ".." in Path(path_value).parts:
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{ref_path}/path", "evidence reference path must stay inside the repository")
            continue
        if not (ROOT / path_value).exists():
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{ref_path}/path", "evidence reference path does not exist")

    return all_generated


def validate_artifact_hashes(decision: dict[str, Any], base_path: str, findings: list[dict[str, str]]) -> None:
    artifact_hashes = decision.get("artifactHashes")
    if not isinstance(artifact_hashes, list) or not artifact_hashes:
        add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{base_path}/artifactHashes", "artifactHashes must be a non-empty array")
        return

    for index, artifact in enumerate(artifact_hashes):
        artifact_path = f"{base_path}/artifactHashes/{index}"
        if not isinstance(artifact, dict):
            add_finding(findings, "USF-EVIDENCE-REUSE-003", artifact_path, "artifact hash entry must be an object")
            continue

        path_value = artifact.get("path")
        expected = artifact.get("sha256")
        if not isinstance(path_value, str) or not path_value:
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{artifact_path}/path", "artifact hash entry must include a repository path")
            continue
        if Path(path_value).is_absolute() or ".." in Path(path_value).parts:
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{artifact_path}/path", "artifact hash path must stay inside the repository")
            continue
        if not is_sha256(expected):
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{artifact_path}/sha256", "artifact hash must be a lowercase sha256 hex digest")
            continue

        repo_path = ROOT / path_value
        if not repo_path.exists():
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{artifact_path}/path", "artifact hash path does not exist")
            continue
        actual = sha256_file(repo_path)
        if actual != expected:
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{artifact_path}/sha256", "artifact hash does not match repository content")


def validate_bundle_metadata(decision: dict[str, Any], base_path: str, findings: list[dict[str, str]]) -> None:
    metadata = decision.get("bundleMetadata")
    if metadata is None:
        return
    if not isinstance(metadata, dict):
        add_finding(findings, "USF-EVIDENCE-REUSE-008", f"{base_path}/bundleMetadata", "bundle metadata must be an object")
        return

    linked_fields = ["sourceSha", "targetSha", "inputManifestDigest", "artifactSetDigest"]
    for field in linked_fields:
        if metadata.get(field) != decision.get(field):
            add_finding(
                findings,
                "USF-EVIDENCE-REUSE-008",
                f"{base_path}/bundleMetadata/{field}",
                "bundle metadata must match the reuse decision record",
            )


def proof_overclaimed(claimed: Any, observed: Any) -> bool:
    if claimed not in PROOF_LEVEL_ORDER or observed not in PROOF_LEVEL_ORDER:
        return True
    return PROOF_LEVEL_ORDER[claimed] > PROOF_LEVEL_ORDER[observed]


def validate_decision(decision: Any, index: int, findings: list[dict[str, str]], current_commit: str | None) -> dict[str, Any]:
    base_path = f"/reuseDecisions/{index}"
    summary = {
        "status": "invalid",
        "reusableScope": [],
        "blockedScope": [],
        "requiredRerunMode": "unknown",
        "ambiguityReason": "",
    }

    if not isinstance(decision, dict):
        add_finding(findings, "USF-EVIDENCE-REUSE-001", base_path, "reuse decision record must be an object")
        return summary

    missing = sorted(REQUIRED_DECISION_FIELDS - set(decision))
    for field in missing:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", f"{base_path}/{field}", "required decision field is missing")

    status = decision.get("eligibilityStatus")
    freshness = decision.get("freshnessState")
    rerun_mode = decision.get("requiredRerunMode")
    reusable_scope = ensure_string_list(decision.get("reusableScope"))
    blocked_scope = ensure_string_list(decision.get("blockedScope"))
    blocking_findings = ensure_string_list(decision.get("blockingFindings"))
    ambiguity_reason = decision.get("ambiguityReason")

    summary.update(
        {
            "status": status if isinstance(status, str) else "invalid",
            "reusableScope": reusable_scope,
            "blockedScope": blocked_scope,
            "requiredRerunMode": rerun_mode if isinstance(rerun_mode, str) else "unknown",
            "ambiguityReason": ambiguity_reason if isinstance(ambiguity_reason, str) else "",
        }
    )

    if status not in ALLOWED_STATUSES:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", f"{base_path}/eligibilityStatus", "unknown eligibility status")
    if freshness not in ALLOWED_FRESHNESS_STATES:
        add_finding(findings, "USF-EVIDENCE-REUSE-001", f"{base_path}/freshnessState", "unknown freshness state")
    if not isinstance(rerun_mode, str):
        add_finding(findings, "USF-EVIDENCE-REUSE-001", f"{base_path}/requiredRerunMode", "required rerun mode must be a string")

    for digest_field in ["inputManifestDigest", "artifactSetDigest", "chainTipDigest"]:
        if not is_sha256(decision.get(digest_field)):
            add_finding(findings, "USF-EVIDENCE-REUSE-003", f"{base_path}/{digest_field}", "digest must be lowercase sha256 hex")

    decision_non_claims = set(ensure_string_list(decision.get("nonClaims")))
    for non_claim in sorted(REQUIRED_NON_CLAIMS - decision_non_claims):
        add_finding(findings, "USF-EVIDENCE-REUSE-002", f"{base_path}/nonClaims", f"required non-claim is missing: {non_claim}")

    all_refs_generated = validate_evidence_refs(decision, base_path, findings)
    validate_artifact_hashes(decision, base_path, findings)
    validate_bundle_metadata(decision, base_path, findings)

    if status == "pass-current":
        if freshness != "current":
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/freshnessState", "pass-current requires current freshness")
        if rerun_mode != "none":
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/requiredRerunMode", "pass-current cannot require a rerun")
        if blocking_findings:
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/blockingFindings", "pass-current cannot include blocking findings")
        if not reusable_scope:
            add_finding(findings, "USF-EVIDENCE-REUSE-001", f"{base_path}/reusableScope", "pass-current must name reusable scope")
        if blocked_scope:
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/blockedScope", "pass-current cannot leave blocked scope")
        if not is_current_commit_token(decision.get("assessedCommit"), current_commit) or not is_current_commit_token(decision.get("targetSha"), current_commit):
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/targetSha", "pass-current must be pinned to the current target commit")

    if freshness in FAIL_CLOSED_STATES or status in FAIL_CLOSED_STATUSES:
        if rerun_mode not in FULL_RERUN_MODES:
            add_finding(
                findings,
                "USF-EVIDENCE-REUSE-004",
                f"{base_path}/requiredRerunMode",
                "non-current reuse decisions must fail closed to a full affected proof rerun or terminal refresh",
            )
        if status != "partial" and reusable_scope:
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/reusableScope", "non-current decisions must not advertise reusable scope")
        if not blocked_scope and status != "partial":
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/blockedScope", "non-current decisions must identify blocked scope")

    if status == "partial":
        if not reusable_scope or not blocked_scope:
            add_finding(findings, "USF-EVIDENCE-REUSE-004", base_path, "partial decisions must name both reusable and blocked scope")
        if rerun_mode not in FULL_RERUN_MODES:
            add_finding(findings, "USF-EVIDENCE-REUSE-004", f"{base_path}/requiredRerunMode", "partial decisions must rerun affected proof")

    provider = decision.get("providerMode")
    target_provider = decision.get("targetProviderMode")
    environment = decision.get("environment")
    target_environment = decision.get("targetEnvironment")
    if provider != target_provider:
        if status == "pass-current":
            add_finding(findings, "USF-EVIDENCE-REUSE-005", f"{base_path}/targetProviderMode", "provider mismatch cannot pass reuse")
        elif rerun_mode not in FULL_RERUN_MODES:
            add_finding(findings, "USF-EVIDENCE-REUSE-005", f"{base_path}/requiredRerunMode", "provider mismatch must force full affected proof rerun")
    if environment != target_environment:
        if status == "pass-current":
            add_finding(findings, "USF-EVIDENCE-REUSE-005", f"{base_path}/targetEnvironment", "environment mismatch cannot pass reuse")
        elif rerun_mode not in FULL_RERUN_MODES:
            add_finding(findings, "USF-EVIDENCE-REUSE-005", f"{base_path}/requiredRerunMode", "environment mismatch must force full affected proof rerun")

    if proof_overclaimed(decision.get("claimedProofLevel"), decision.get("observedProofLevel")):
        if status == "pass-current":
            add_finding(findings, "USF-EVIDENCE-REUSE-006", f"{base_path}/claimedProofLevel", "proof overclaim cannot pass reuse")
        elif rerun_mode not in FULL_RERUN_MODES:
            add_finding(findings, "USF-EVIDENCE-REUSE-006", f"{base_path}/requiredRerunMode", "proof overclaim must force full affected proof rerun")

    if all_refs_generated or freshness == "generated-report-only" or status == "generated-report-only":
        if status == "pass-current":
            add_finding(findings, "USF-EVIDENCE-REUSE-007", f"{base_path}/evidenceRefs", "generated-report-only evidence cannot pass reuse")
        if rerun_mode not in FULL_RERUN_MODES:
            add_finding(findings, "USF-EVIDENCE-REUSE-007", f"{base_path}/requiredRerunMode", "generated-report-only evidence must force full affected proof rerun")

    if decision.get("automaticHumanSignoff") is not False:
        add_finding(findings, "USF-EVIDENCE-REUSE-009", f"{base_path}/automaticHumanSignoff", "automatic human signoff is forbidden")
    if decision.get("humanDecisionRequired") is True and status == "pass-current" and decision.get("humanDecisionRecorded") is not True:
        add_finding(findings, "USF-EVIDENCE-REUSE-009", f"{base_path}/humanDecisionRequired", "human-required reuse cannot pass without recorded human decision")

    if isinstance(ambiguity_reason, str) and ambiguity_reason:
        if status == "pass-current":
            add_finding(findings, "USF-EVIDENCE-REUSE-010", f"{base_path}/ambiguityReason", "ambiguous reuse cannot pass")
        if rerun_mode not in FULL_RERUN_MODES:
            add_finding(findings, "USF-EVIDENCE-REUSE-010", f"{base_path}/requiredRerunMode", "ambiguous reuse must force full affected proof rerun")
    elif not isinstance(ambiguity_reason, str):
        add_finding(findings, "USF-EVIDENCE-REUSE-010", f"{base_path}/ambiguityReason", "ambiguity reason must be a string")

    return summary


def validate_wiring(findings: list[dict[str, str]]) -> None:
    try:
        package = load_json(PACKAGE_PATH)
    except json.JSONDecodeError as exc:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/package.json", f"package.json is not strict JSON: {exc}")
        return

    scripts = package.get("scripts")
    if not isinstance(scripts, dict):
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/package.json/scripts", "package scripts object is missing")
        return

    if scripts.get("evidence-reuse:validate") != VALIDATE_COMMAND:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/package.json/scripts/evidence-reuse:validate", "validate script is missing or stale")
    if scripts.get("evidence-reuse:selftest") != SELFTEST_COMMAND:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/package.json/scripts/evidence-reuse:selftest", "selftest script is missing or stale")

    repo_validate = scripts.get("repo:validate")
    if not isinstance(repo_validate, str) or VALIDATE_COMMAND not in repo_validate:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/package.json/scripts/repo:validate", "repo aggregate validation must include evidence reuse validation")

    makefile_text = MAKEFILE_PATH.read_text(encoding="utf-8")
    if MAKE_VALIDATE_TARGET not in makefile_text:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/Makefile", "Make validate target is missing")
    if MAKE_SELFTEST_TARGET not in makefile_text:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/Makefile", "Make selftest target is missing")
    if "corepack pnpm evidence-reuse:validate" not in makefile_text:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/Makefile", "Make validate target command is missing")
    if "corepack pnpm evidence-reuse:selftest" not in makefile_text:
        add_finding(findings, "USF-EVIDENCE-REUSE-011", "/Makefile", "Make selftest target command is missing")


def validate_document(document: Any) -> tuple[bool, dict[str, Any]]:
    findings: list[dict[str, str]] = []
    current_commit = get_current_commit()

    validate_root(document, findings)
    if isinstance(document, dict):
        validate_invalidation_map(document, findings)

        summaries = []
        decisions = document.get("reuseDecisions")
        if isinstance(decisions, list):
            for index, decision in enumerate(decisions):
                summaries.append(validate_decision(decision, index, findings, current_commit))
        validate_wiring(findings)
    else:
        summaries = []

    reusable_scope = sorted({scope for summary in summaries for scope in summary["reusableScope"]})
    blocked_scope = sorted({scope for summary in summaries for scope in summary["blockedScope"]})
    rerun_modes = sorted({summary["requiredRerunMode"] for summary in summaries if summary["requiredRerunMode"] != "none"})
    ambiguity_reasons = sorted({summary["ambiguityReason"] for summary in summaries if summary["ambiguityReason"]})
    status_counts: dict[str, int] = {}
    for summary in summaries:
        status = summary["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    report = {
        "ok": not findings,
        "validator": "validate-evidence-reuse",
        "issueId": "USF-983",
        "usesDesignIssue": "USF-975",
        "usesInvalidationIssue": "USF-984",
        "terminalFreshMachineQaIssue": "USF-966",
        "terminalFreshMachineQaDeferred": True,
        "invalidationMapPath": repo_relative(INVALIDATION_MAP_PATH),
        "decisionCount": len(summaries),
        "statusCounts": status_counts,
        "reusableScope": reusable_scope,
        "blockedScope": blocked_scope,
        "requiredRerunModes": rerun_modes,
        "ambiguityReasons": ambiguity_reasons,
        "nonClaims": sorted(REQUIRED_NON_CLAIMS),
        "rules": RULES,
        "findings": findings,
    }
    return not findings, report


def pointer_tokens(path: str) -> list[str]:
    if not path.startswith("/"):
        raise ValueError(f"patch path must be a JSON pointer: {path}")
    if path == "/":
        return []
    return [token.replace("~1", "/").replace("~0", "~") for token in path[1:].split("/")]


def patch_parent(document: Any, tokens: list[str]) -> tuple[Any, str]:
    current = document
    for token in tokens[:-1]:
        if isinstance(current, list):
            current = current[int(token)]
        elif isinstance(current, dict):
            current = current[token]
        else:
            raise ValueError("patch path traverses a scalar")
    return current, tokens[-1]


def apply_patch_operations(document: Any, operations: list[dict[str, Any]]) -> None:
    for operation in operations:
        op = operation.get("op")
        tokens = pointer_tokens(operation.get("path", ""))
        if not tokens:
            raise ValueError("root-level patch operations are not supported for planted defects")
        parent, key = patch_parent(document, tokens)
        if isinstance(parent, list):
            index = int(key)
            if op == "replace":
                parent[index] = operation.get("value")
            elif op == "remove":
                parent.pop(index)
            elif op == "add":
                parent.insert(index, operation.get("value"))
            else:
                raise ValueError(f"unsupported patch operation: {op}")
        elif isinstance(parent, dict):
            if op in {"replace", "add"}:
                parent[key] = operation.get("value")
            elif op == "remove":
                parent.pop(key, None)
            else:
                raise ValueError(f"unsupported patch operation: {op}")
        else:
            raise ValueError("patch parent is a scalar")


def run_all(json_output: bool) -> int:
    try:
        document = load_json(DECISIONS_PATH)
    except json.JSONDecodeError as exc:
        report = {
            "ok": False,
            "validator": "validate-evidence-reuse",
            "issueId": "USF-983",
            "findings": [
                {
                    "severity": "blocking",
                    "rule": "USF-EVIDENCE-REUSE-001",
                    "path": repo_relative(DECISIONS_PATH),
                    "message": f"reuse decision artifact is not strict JSON: {exc}",
                }
            ],
        }
        print(json.dumps(report, indent=2, sort_keys=True) if json_output else "reuse decision artifact is invalid JSON")
        return 1

    ok, report = validate_document(document)
    if json_output:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print("PASS" if ok else "FAIL")
        for finding in report["findings"]:
            print(f"{finding['rule']} {finding['path']}: {finding['message']}")
    return 0 if ok else 1


def run_selftest(json_output: bool) -> int:
    base_document = load_json(DECISIONS_PATH)
    base_ok, base_report = validate_document(base_document)
    results = []
    ok = base_ok

    positive_current = copy.deepcopy(base_document)
    positive_decision = positive_current["reuseDecisions"][0]
    positive_decision.update(
        {
            "sourceSha": "current-head",
            "freshnessState": "current",
            "eligibilityStatus": "pass-current",
            "claimedProofLevel": "semantic-consistency",
            "observedProofLevel": "semantic-consistency",
            "reusableScope": ["validator-owned-policy-hash"],
            "blockedScope": [],
            "requiredRerunMode": "none",
            "blockingFindings": [],
            "humanDecisionRequired": False,
            "automaticHumanSignoff": False,
        }
    )
    positive_decision["bundleMetadata"]["sourceSha"] = "current-head"
    positive_decision["bundleMetadata"]["metadataState"] = "current"
    positive_ok, positive_report = validate_document(positive_current)
    if not positive_ok:
        ok = False

    for defect_path in sorted(PLANTED_DEFECT_DIR.glob("*.json")):
        defect = load_json(defect_path)
        mutated = copy.deepcopy(base_document)
        try:
            apply_patch_operations(mutated, defect.get("patch", []))
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            results.append(
                {
                    "defect": repo_relative(defect_path),
                    "expectedRule": defect.get("expectedRule"),
                    "ok": False,
                    "error": str(exc),
                }
            )
            ok = False
            continue

        defect_ok, defect_report = validate_document(mutated)
        expected_rule = defect.get("expectedRule")
        observed_rules = sorted({finding["rule"] for finding in defect_report["findings"]})
        expected_observed = isinstance(expected_rule, str) and expected_rule in observed_rules and not defect_ok
        results.append(
            {
                "defect": repo_relative(defect_path),
                "expectedRule": expected_rule,
                "observedRules": observed_rules,
                "ok": expected_observed,
            }
        )
        if not expected_observed:
            ok = False

    report = {
        "ok": ok,
        "validator": "validate-evidence-reuse",
        "issueId": "USF-983",
        "baseArtifactOk": base_ok,
        "baseFindings": base_report["findings"],
        "positiveCurrentReuseOk": positive_ok,
        "positiveCurrentReuseFindings": positive_report["findings"],
        "plantedDefectCount": len(results),
        "results": results,
    }

    if json_output:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print("PASS" if ok else "FAIL")
        for result in results:
            print(f"{result['defect']}: {'PASS' if result['ok'] else 'FAIL'}")
    return 0 if ok else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate USF evidence reuse decisions")
    parser.add_argument("mode", choices=["all", "selftest"], help="validation mode")
    parser.add_argument("--json", action="store_true", help="emit JSON report")
    args = parser.parse_args()

    if args.mode == "all":
        return run_all(args.json)
    return run_selftest(args.json)


if __name__ == "__main__":
    raise SystemExit(main())
