#!/usr/bin/env python3
"""Validate the USF evidence invalidation map.

This tool is a validator-owned enforcement layer for USF-984. It writes no
repository files. Unknown changed inputs fail closed by forcing full proof for
the affected family, or all proof families when the affected family cannot be
determined.
"""

from __future__ import annotations

import argparse
import copy
import fnmatch
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
TOOL_ROOT = Path(__file__).resolve().parent
MAP_PATH = TOOL_ROOT / "evidence-invalidation-map.json"
PLANTED_DEFECT_DIR = TOOL_ROOT / "planted-defects"
PACKAGE_PATH = ROOT / "package.json"
MAKEFILE_PATH = ROOT / "Makefile"

VALIDATE_COMMAND = "python3 tools/validate-evidence-invalidation/validate-evidence-invalidation.py all --json"
SELFTEST_COMMAND = "python3 tools/validate-evidence-invalidation/validate-evidence-invalidation.py selftest --json"
PACKAGE_VALIDATE_SCRIPT = VALIDATE_COMMAND
PACKAGE_SELFTEST_SCRIPT = SELFTEST_COMMAND
MAKE_VALIDATE_TARGET = "evidence-invalidation-validate"
MAKE_SELFTEST_TARGET = "evidence-invalidation-selftest"

RULES = {
    "USF-EVIDENCE-INVALIDATION-001": "map shape is missing required fields",
    "USF-EVIDENCE-INVALIDATION-002": "input class selector or fallback contract is invalid",
    "USF-EVIDENCE-INVALIDATION-003": "required correctness-affecting input coverage is missing",
    "USF-EVIDENCE-INVALIDATION-004": "unknown or unclassified input did not fail closed to full proof",
    "USF-EVIDENCE-INVALIDATION-005": "stale propagation does not block current pass",
    "USF-EVIDENCE-INVALIDATION-006": "generated report boundary is unsafe",
    "USF-EVIDENCE-INVALIDATION-007": "hash, content-addressing, commit pin, or prune metadata guard is missing",
    "USF-EVIDENCE-INVALIDATION-008": "provider or environment ambiguity is unsafe",
    "USF-EVIDENCE-INVALIDATION-009": "proof overclaim or hidden blocking finding is not fail closed",
    "USF-EVIDENCE-INVALIDATION-010": "human decision or non-claim boundary is unsafe",
    "USF-EVIDENCE-INVALIDATION-011": "package, Make, or aggregate validation wiring is stale",
    "USF-EVIDENCE-INVALIDATION-SELFTEST": "planted defect did not raise its expected rule",
}

REQUIRED_COVERAGE_TAGS = {
    "source",
    "semantic",
    "adr",
    "schema",
    "taxonomy",
    "vocabulary",
    "registry",
    "validator",
    "proof",
    "provider",
    "environment",
    "command",
    "dependency",
    "artifact",
    "generated-report",
    "ci-anchor",
    "git",
    "human-decision",
    "configuration",
}

REQUIRED_STALE_STATES = {
    "current",
    "stale",
    "superseded",
    "historical",
    "invalidated",
    "human-review-required",
    "generated-report-only",
    "terminal-refresh-deferred",
}

REQUIRED_NON_PASS_STATES = REQUIRED_STALE_STATES - {"current", "historical"}

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
}

INPUT_CLASS_FIELDS = {
    "id",
    "coverageTags",
    "owningAuthorityClass",
    "selectors",
    "affectedProofFamilies",
    "affectedEvidenceFamilies",
    "invalidationTriggers",
    "stalePropagationRule",
    "fallbackRerunMode",
    "minimumValidatorChecks",
    "ambiguityBehavior",
    "nonClaimBoundary",
    "assurancePreserved",
    "relatedIssueIds",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def finding(rule_id: str, subject: str, message: str) -> dict[str, str]:
    return {
        "ruleId": rule_id,
        "severity": "blocking",
        "subject": subject,
        "message": message,
    }


class Findings:
    def __init__(self) -> None:
        self.items: list[dict[str, str]] = []

    def add(self, rule_id: str, subject: str, message: str) -> None:
        self.items.append(finding(rule_id, subject, message))

    def extend(self, findings: list[dict[str, str]]) -> None:
        self.items.extend(findings)

    def rule_ids(self) -> set[str]:
        return {item["ruleId"] for item in self.items}


def normalise_path(path: str) -> str:
    path = path.strip()
    if path.startswith("./"):
        path = path[2:]
    return path


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def string_set(value: Any) -> set[str]:
    return {item for item in as_list(value) if isinstance(item, str) and item}


def class_checks_by_tag(data: dict[str, Any]) -> dict[str, set[str]]:
    checks: dict[str, set[str]] = {}
    for row in as_list(data.get("inputClasses")):
        if not isinstance(row, dict):
            continue
        row_checks = string_set(row.get("minimumValidatorChecks"))
        for tag in string_set(row.get("coverageTags")):
            checks.setdefault(tag, set()).update(row_checks)
    return checks


def require_tag_check(
    findings: Findings,
    checks_by_tag: dict[str, set[str]],
    tag: str,
    required_check: str,
    rule_id: str,
) -> None:
    if required_check not in checks_by_tag.get(tag, set()):
        findings.add(rule_id, f"coverageTag:{tag}", f"missing required check {required_check}")


def validate_global_policies(findings: Findings, data: dict[str, Any]) -> None:
    policies = data.get("globalPolicies")
    if not isinstance(policies, dict):
        findings.add("USF-EVIDENCE-INVALIDATION-001", "globalPolicies", "globalPolicies must be an object")
        return
    if policies.get("unknownInputFallback") != "full-proof-for-affected-family-or-widen-to-all":
        findings.add("USF-EVIDENCE-INVALIDATION-004", "globalPolicies.unknownInputFallback", "unknown input must force full proof or widen to all")
    if policies.get("generatedReportsAreAuthority") is not False or policies.get("generatedReportOnlyCanSatisfyProof") is not False:
        findings.add("USF-EVIDENCE-INVALIDATION-006", "globalPolicies.generatedReports", "generated reports must not be authority or proof by themselves")
    if policies.get("automaticHumanSignoffAllowed") is not False:
        findings.add("USF-EVIDENCE-INVALIDATION-010", "globalPolicies.automaticHumanSignoffAllowed", "automatic human signoff must be false")
    if policies.get("terminalFreshMachineQaIssue") != "USF-966" or policies.get("terminalRefreshDeferredCanPass") is not False:
        findings.add("USF-EVIDENCE-INVALIDATION-005", "globalPolicies.terminalRefresh", "terminal refresh deferral must remain non-pass and tied to USF-966")
    if policies.get("ambiguousProviderFallback") != "full-proof-for-affected-family":
        findings.add("USF-EVIDENCE-INVALIDATION-008", "globalPolicies.ambiguousProviderFallback", "ambiguous provider must force full proof")
    if policies.get("ambiguousEnvironmentFallback") != "full-proof-for-affected-family":
        findings.add("USF-EVIDENCE-INVALIDATION-008", "globalPolicies.ambiguousEnvironmentFallback", "ambiguous environment must force full proof")
    if policies.get("proofOverclaimCanPass") is not False:
        findings.add("USF-EVIDENCE-INVALIDATION-009", "globalPolicies.proofOverclaimCanPass", "proof overclaim must fail closed")
    if policies.get("staleCanPass") is not False:
        findings.add("USF-EVIDENCE-INVALIDATION-005", "globalPolicies.staleCanPass", "stale evidence must not pass")


def validate_state_model(findings: Findings, data: dict[str, Any]) -> None:
    states = string_set(data.get("stalePropagationStates"))
    non_pass = string_set(data.get("nonPassStates"))
    missing_states = sorted(REQUIRED_STALE_STATES - states)
    if missing_states:
        findings.add("USF-EVIDENCE-INVALIDATION-005", "stalePropagationStates", f"missing stale states: {missing_states}")
    missing_non_pass = sorted(REQUIRED_NON_PASS_STATES - non_pass)
    if missing_non_pass:
        findings.add("USF-EVIDENCE-INVALIDATION-005", "nonPassStates", f"states must not satisfy pass: {missing_non_pass}")
    if "current" in non_pass or "historical" in non_pass:
        findings.add("USF-EVIDENCE-INVALIDATION-005", "nonPassStates", "current and historical must not be listed as non-pass failure states")


def validate_non_claims(findings: Findings, data: dict[str, Any]) -> None:
    missing = sorted(REQUIRED_NON_CLAIMS - string_set(data.get("nonClaims")))
    if missing:
        findings.add("USF-EVIDENCE-INVALIDATION-010", "nonClaims", f"missing required non-claims: {missing}")


def validate_input_classes(findings: Findings, data: dict[str, Any]) -> None:
    input_classes = data.get("inputClasses")
    if not isinstance(input_classes, list) or not input_classes:
        findings.add("USF-EVIDENCE-INVALIDATION-001", "inputClasses", "inputClasses must be a non-empty array")
        return

    ids: list[str] = []
    coverage: set[str] = set()
    for index, row in enumerate(input_classes):
        subject = f"inputClasses[{index}]"
        if not isinstance(row, dict):
            findings.add("USF-EVIDENCE-INVALIDATION-001", subject, "input class must be an object")
            continue
        missing = sorted(INPUT_CLASS_FIELDS - set(row))
        if missing:
            findings.add("USF-EVIDENCE-INVALIDATION-001", subject, f"missing fields: {missing}")
        row_id = row.get("id")
        if not isinstance(row_id, str) or not row_id:
            findings.add("USF-EVIDENCE-INVALIDATION-001", subject, "input class id is required")
        else:
            ids.append(row_id)
            subject = row_id
        selectors = row.get("selectors")
        if not isinstance(selectors, list) or not selectors:
            findings.add("USF-EVIDENCE-INVALIDATION-002", f"{subject}.selectors", "selectors must be non-empty")
        else:
            for selector in selectors:
                if not isinstance(selector, dict) or selector.get("selectorType") != "path-glob" or not isinstance(selector.get("pattern"), str) or not selector.get("pattern"):
                    findings.add("USF-EVIDENCE-INVALIDATION-002", f"{subject}.selectors", "selector must carry selectorType path-glob and a pattern")
        tags = string_set(row.get("coverageTags"))
        coverage.update(tags)
        if not tags:
            findings.add("USF-EVIDENCE-INVALIDATION-003", f"{subject}.coverageTags", "coverageTags must be non-empty")
        for list_field in ("affectedProofFamilies", "affectedEvidenceFamilies", "invalidationTriggers", "minimumValidatorChecks", "relatedIssueIds"):
            if not string_set(row.get(list_field)):
                findings.add("USF-EVIDENCE-INVALIDATION-001", f"{subject}.{list_field}", f"{list_field} must be non-empty")
        fallback = str(row.get("fallbackRerunMode", ""))
        ambiguity = str(row.get("ambiguityBehavior", ""))
        if "full-proof" not in fallback and "full-repository" not in fallback and "widen" not in fallback:
            findings.add("USF-EVIDENCE-INVALIDATION-002", f"{subject}.fallbackRerunMode", "fallback must require full proof or widening")
        if "fail-closed" not in ambiguity:
            findings.add("USF-EVIDENCE-INVALIDATION-002", f"{subject}.ambiguityBehavior", "ambiguity behavior must fail closed")

    duplicate_ids = sorted({row_id for row_id in ids if ids.count(row_id) > 1})
    if duplicate_ids:
        findings.add("USF-EVIDENCE-INVALIDATION-001", "inputClasses", f"duplicate input class ids: {duplicate_ids}")

    declared_required = string_set(data.get("requiredCoverageTags"))
    missing_declared = sorted(REQUIRED_COVERAGE_TAGS - declared_required)
    if missing_declared:
        findings.add("USF-EVIDENCE-INVALIDATION-003", "requiredCoverageTags", f"missing required declared tags: {missing_declared}")
    missing_covered = sorted(REQUIRED_COVERAGE_TAGS - coverage)
    if missing_covered:
        findings.add("USF-EVIDENCE-INVALIDATION-003", "inputClasses.coverageTags", f"missing input class coverage: {missing_covered}")


def validate_required_checks(findings: Findings, data: dict[str, Any]) -> None:
    checks = class_checks_by_tag(data)
    for tag in ("artifact", "generated-report"):
        require_tag_check(findings, checks, tag, "artifact-hash", "USF-EVIDENCE-INVALIDATION-007")
        require_tag_check(findings, checks, tag, "content-address", "USF-EVIDENCE-INVALIDATION-007")
    require_tag_check(findings, checks, "artifact", "pruned-payload-metadata", "USF-EVIDENCE-INVALIDATION-007")
    require_tag_check(findings, checks, "git", "commit-pin", "USF-EVIDENCE-INVALIDATION-007")
    require_tag_check(findings, checks, "proof", "commit-pin", "USF-EVIDENCE-INVALIDATION-007")
    require_tag_check(findings, checks, "proof", "proof-level-not-overclaimed", "USF-EVIDENCE-INVALIDATION-009")
    require_tag_check(findings, checks, "proof", "observed-proof-bound", "USF-EVIDENCE-INVALIDATION-009")
    require_tag_check(findings, checks, "generated-report", "generated-report-not-authority", "USF-EVIDENCE-INVALIDATION-006")
    require_tag_check(findings, checks, "generated-report", "generated-report-only-not-proof", "USF-EVIDENCE-INVALIDATION-006")
    require_tag_check(findings, checks, "generated-report", "stale-generated-report-not-pass", "USF-EVIDENCE-INVALIDATION-006")
    require_tag_check(findings, checks, "provider", "provider-mode-mismatch-fails-closed", "USF-EVIDENCE-INVALIDATION-008")
    require_tag_check(findings, checks, "provider", "ambiguous-provider-fails-closed", "USF-EVIDENCE-INVALIDATION-008")
    require_tag_check(findings, checks, "environment", "environment-mismatch-fails-closed", "USF-EVIDENCE-INVALIDATION-008")
    require_tag_check(findings, checks, "environment", "ambiguous-environment-fails-closed", "USF-EVIDENCE-INVALIDATION-008")
    require_tag_check(findings, checks, "validator", "hidden-blocking-finding-fails-closed", "USF-EVIDENCE-INVALIDATION-009")
    require_tag_check(findings, checks, "human-decision", "no-automatic-human-signoff", "USF-EVIDENCE-INVALIDATION-010")
    require_tag_check(findings, checks, "human-decision", "changed-evidence-requires-human-review", "USF-EVIDENCE-INVALIDATION-010")


def validate_wiring(findings: Findings, package: dict[str, Any], makefile: str) -> None:
    scripts = package.get("scripts", {})
    if scripts.get("evidence-invalidation:validate") != PACKAGE_VALIDATE_SCRIPT:
        findings.add("USF-EVIDENCE-INVALIDATION-011", "package.json#scripts.evidence-invalidation:validate", "package validation script is missing or stale")
    if scripts.get("evidence-invalidation:selftest") != PACKAGE_SELFTEST_SCRIPT:
        findings.add("USF-EVIDENCE-INVALIDATION-011", "package.json#scripts.evidence-invalidation:selftest", "package selftest script is missing or stale")
    if VALIDATE_COMMAND not in scripts.get("repo:validate", ""):
        findings.add("USF-EVIDENCE-INVALIDATION-011", "package.json#scripts.repo:validate", "aggregate repo validation must include evidence invalidation validator")
    make_validate = f"{MAKE_VALIDATE_TARGET}:\n\tcorepack pnpm evidence-invalidation:validate"
    make_selftest = f"{MAKE_SELFTEST_TARGET}:\n\tcorepack pnpm evidence-invalidation:selftest"
    if make_validate not in makefile:
        findings.add("USF-EVIDENCE-INVALIDATION-011", f"Makefile#{MAKE_VALIDATE_TARGET}", "Make validation target is missing or stale")
    if make_selftest not in makefile:
        findings.add("USF-EVIDENCE-INVALIDATION-011", f"Makefile#{MAKE_SELFTEST_TARGET}", "Make selftest target is missing or stale")
    if "make evidence-invalidation-validate" not in makefile or "make evidence-invalidation-selftest" not in makefile:
        findings.add("USF-EVIDENCE-INVALIDATION-011", "Makefile#help", "Make help output is missing evidence invalidation targets")


def validate_map(data: dict[str, Any], package: dict[str, Any] | None = None, makefile: str = "", check_wiring: bool = True) -> list[dict[str, str]]:
    findings = Findings()
    if not isinstance(data, dict):
        findings.add("USF-EVIDENCE-INVALIDATION-001", str(MAP_PATH.relative_to(ROOT)), "map root must be an object")
        return findings.items
    for field in ("id", "version", "title", "description", "issueId", "designIssueId", "nonAuthorityStatement"):
        if field not in data or data.get(field) in ("", None):
            findings.add("USF-EVIDENCE-INVALIDATION-001", field, f"{field} is required")
    if data.get("issueId") != "USF-984" or data.get("designIssueId") != "USF-976":
        findings.add("USF-EVIDENCE-INVALIDATION-001", "issueId", "map must trace to USF-984 and USF-976")
    statement = str(data.get("nonAuthorityStatement", "")).lower()
    if "does not define usf semantic authority" not in statement:
        findings.add("USF-EVIDENCE-INVALIDATION-010", "nonAuthorityStatement", "map must state that it does not define USF semantic authority")
    validate_global_policies(findings, data)
    validate_state_model(findings, data)
    validate_non_claims(findings, data)
    validate_input_classes(findings, data)
    validate_required_checks(findings, data)
    if check_wiring:
        validate_wiring(findings, package or {}, makefile)
    return findings.items


def classify_one(data: dict[str, Any], path: str) -> dict[str, Any]:
    normalised = normalise_path(path)
    for row in as_list(data.get("inputClasses")):
        if not isinstance(row, dict):
            continue
        for selector in as_list(row.get("selectors")):
            if not isinstance(selector, dict):
                continue
            pattern = selector.get("pattern")
            if isinstance(pattern, str) and fnmatch.fnmatchcase(normalised, pattern):
                return {
                    "path": normalised,
                    "inputClassId": row.get("id"),
                    "coverageTags": sorted(string_set(row.get("coverageTags"))),
                    "affectedProofFamilies": sorted(string_set(row.get("affectedProofFamilies"))),
                    "affectedEvidenceFamilies": sorted(string_set(row.get("affectedEvidenceFamilies"))),
                    "fallbackRerunMode": row.get("fallbackRerunMode"),
                    "stalePropagationOutcome": "invalidated",
                    "ambiguityReason": "",
                }
    return {
        "path": normalised,
        "inputClassId": "unclassified",
        "coverageTags": [],
        "affectedProofFamilies": ["all-proof-families"],
        "affectedEvidenceFamilies": ["all-evidence-families"],
        "fallbackRerunMode": "full-repository-proof",
        "stalePropagationOutcome": "invalidated",
        "ambiguityReason": "unclassified-input",
    }


def classify_paths(data: dict[str, Any], paths: list[str]) -> tuple[dict[str, Any], list[dict[str, str]]]:
    rows = [classify_one(data, path) for path in paths]
    findings: list[dict[str, str]] = []
    for row in rows:
        if row["inputClassId"] == "unclassified":
            findings.append(
                finding(
                    "USF-EVIDENCE-INVALIDATION-004",
                    row["path"],
                    "changed input is unclassified; full repository proof fallback is required",
                )
            )
    affected_proof = sorted({item for row in rows for item in row["affectedProofFamilies"]})
    affected_evidence = sorted({item for row in rows for item in row["affectedEvidenceFamilies"]})
    fallback_modes = sorted({row["fallbackRerunMode"] for row in rows if row.get("fallbackRerunMode")})
    ambiguity = sorted({row["ambiguityReason"] for row in rows if row.get("ambiguityReason")})
    report = {
        "changedPathCount": len(rows),
        "changedPaths": rows,
        "invalidatedEvidenceFamilies": affected_evidence,
        "affectedProofFamilies": affected_proof,
        "fallbackRerunModes": fallback_modes,
        "ambiguityReasons": ambiguity,
        "terminalRefreshDeferredIssue": data.get("globalPolicies", {}).get("terminalFreshMachineQaIssue"),
        "generatedReportAuthorityBoundary": "generated reports remain lower authority and cannot satisfy proof by themselves",
    }
    return report, findings


def git_diff_paths(base: str, head: str) -> list[str]:
    completed = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...{head}"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in completed.stdout.splitlines() if line.strip()]


def load_state() -> dict[str, Any]:
    return {
        "map": load_json(MAP_PATH),
        "package": load_json(PACKAGE_PATH),
        "makefile": MAKEFILE_PATH.read_text(encoding="utf-8"),
    }


def apply_fixture(data: dict[str, Any], fixture: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    mutated = copy.deepcopy(data)
    kind = fixture.get("kind")
    paths = [str(path) for path in fixture.get("changedPaths", [])]
    if kind == "unknown-changed-path":
        paths = ["scratch/unclassified-proof-input.json"]
    elif kind == "new-unclassified-evidence-surface":
        paths = ["external-evidence/new-surface/record.json"]
    elif kind == "missing-hash":
        for row in mutated.get("inputClasses", []):
            if isinstance(row, dict) and "artifact" in row.get("coverageTags", []):
                row["minimumValidatorChecks"] = [item for item in row.get("minimumValidatorChecks", []) if item != "artifact-hash"]
    elif kind == "missing-commit-pin":
        for row in mutated.get("inputClasses", []):
            if isinstance(row, dict) and ("git" in row.get("coverageTags", []) or "proof" in row.get("coverageTags", [])):
                row["minimumValidatorChecks"] = [item for item in row.get("minimumValidatorChecks", []) if item != "commit-pin"]
    elif kind == "stale-generated-report":
        for row in mutated.get("inputClasses", []):
            if isinstance(row, dict) and "generated-report" in row.get("coverageTags", []):
                row["minimumValidatorChecks"] = [item for item in row.get("minimumValidatorChecks", []) if item != "stale-generated-report-not-pass"]
    elif kind == "ambiguous-provider":
        mutated.setdefault("globalPolicies", {})["ambiguousProviderFallback"] = "reuse-existing-evidence"
    elif kind == "ambiguous-environment":
        mutated.setdefault("globalPolicies", {})["ambiguousEnvironmentFallback"] = "reuse-existing-evidence"
    elif kind == "generated-report-only-proof":
        mutated.setdefault("globalPolicies", {})["generatedReportOnlyCanSatisfyProof"] = True
    elif kind == "proof-overclaim":
        mutated.setdefault("globalPolicies", {})["proofOverclaimCanPass"] = True
    elif kind == "automatic-human-signoff":
        mutated.setdefault("globalPolicies", {})["automaticHumanSignoffAllowed"] = True
    elif kind == "superseded-payload-reuse":
        mutated["nonPassStates"] = [item for item in mutated.get("nonPassStates", []) if item != "superseded"]
    elif kind == "pruned-payload-without-metadata":
        for row in mutated.get("inputClasses", []):
            if isinstance(row, dict) and "artifact" in row.get("coverageTags", []):
                row["minimumValidatorChecks"] = [item for item in row.get("minimumValidatorChecks", []) if item != "pruned-payload-metadata"]
    elif kind == "hidden-blocking-finding":
        for row in mutated.get("inputClasses", []):
            if isinstance(row, dict) and "validator" in row.get("coverageTags", []):
                row["minimumValidatorChecks"] = [item for item in row.get("minimumValidatorChecks", []) if item != "hidden-blocking-finding-fails-closed"]
    elif kind == "missing-non-claims":
        mutated["nonClaims"] = []
    else:
        paths = []
    return mutated, paths


def run_selftest() -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    results: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    if not PLANTED_DEFECT_DIR.exists():
        return results, [finding("USF-EVIDENCE-INVALIDATION-SELFTEST", str(PLANTED_DEFECT_DIR.relative_to(ROOT)), "planted defect directory is missing")]
    fixture_paths = sorted(PLANTED_DEFECT_DIR.glob("*.json"))
    if not fixture_paths:
        return results, [finding("USF-EVIDENCE-INVALIDATION-SELFTEST", str(PLANTED_DEFECT_DIR.relative_to(ROOT)), "planted defect directory is empty")]
    base = load_json(MAP_PATH)
    for path in fixture_paths:
        defect = load_json(path)
        expected = defect.get("expectedRule")
        mutated, paths = apply_fixture(base, defect.get("fixture", {}))
        observed_findings = validate_map(mutated, check_wiring=False)
        if paths:
            _, classify_findings = classify_paths(mutated, paths)
            observed_findings.extend(classify_findings)
        observed = sorted({item["ruleId"] for item in observed_findings})
        passed = expected in observed
        results.append(
            {
                "fixture": str(path.relative_to(ROOT)),
                "expectedRule": expected,
                "observedRuleIds": observed,
                "passed": passed,
            }
        )
        if not passed:
            failures.append(
                finding(
                    "USF-EVIDENCE-INVALIDATION-SELFTEST",
                    str(path.relative_to(ROOT)),
                    f"expected {expected}, got {observed}",
                )
            )
    return results, failures


def print_result(
    mode: str,
    findings: list[dict[str, str]],
    report: dict[str, Any] | None = None,
    selftest_results: list[dict[str, Any]] | None = None,
) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-evidence-invalidation",
        "mode": mode,
        "status": "pass" if not findings else "fail",
        "failureCount": len(findings),
        "findings": findings,
        "rules": RULES,
        "mapPath": str(MAP_PATH.relative_to(ROOT)),
    }
    if report is not None:
        payload["report"] = report
    if selftest_results is not None:
        payload["selftestResults"] = selftest_results
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not findings else 1


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["all", "selftest", "classify"])
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--path", action="append", default=[])
    parser.add_argument("--base", default="")
    parser.add_argument("--head", default="")
    args = parser.parse_args(argv[1:])

    state = load_state()
    if args.mode == "selftest":
        results, failures = run_selftest()
        return print_result("selftest", failures, selftest_results=results)

    if args.mode == "classify":
        paths = [normalise_path(path) for path in args.path]
        if args.base or args.head:
            if not args.base or not args.head:
                print("ERROR: classify mode requires both --base and --head when either is supplied", file=sys.stderr)
                return 2
            paths.extend(git_diff_paths(args.base, args.head))
        if not paths:
            print("ERROR: classify mode requires --path or --base/--head", file=sys.stderr)
            return 2
        findings = validate_map(state["map"], state["package"], state["makefile"])
        report, classify_findings = classify_paths(state["map"], paths)
        findings.extend(classify_findings)
        return print_result("classify", findings, report=report)

    selftest_results, selftest_failures = run_selftest()
    findings = validate_map(state["map"], state["package"], state["makefile"])
    findings.extend(selftest_failures)
    report, _ = classify_paths(state["map"], [])
    return print_result("all", findings, report=report, selftest_results=selftest_results)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
