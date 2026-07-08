#!/usr/bin/env python3
"""Validate Dev/Test/Staging artifact promotion handoff contracts.

This validator enforces the schema-aligned contract in
`docs/architecture/dev-test-staging-artifact-promotion-contract.json`. It is a
validator surface, not runtime implementation, and it does not promote any schema
lifecycle state or readiness claim.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = Path("docs/architecture/dev-test-staging-artifact-promotion-contract.json")
PLANTED_DEFECT_DIR = Path("tools/validate-artifact-promotion/planted-defects")

RULES = {
    "USF-ARTIFACT-PROMOTION-001": ("blocking", "promotion contract is missing or invalid"),
    "USF-ARTIFACT-PROMOTION-002": ("blocking", "handoff record is missing required fields"),
    "USF-ARTIFACT-PROMOTION-003": ("blocking", "handoff record uses an unknown controlled value"),
    "USF-ARTIFACT-PROMOTION-004": ("blocking", "artifact hash metadata is invalid"),
    "USF-ARTIFACT-PROMOTION-005": ("blocking", "stale unknown or superseded evidence is accepted"),
    "USF-ARTIFACT-PROMOTION-006": ("blocking", "provider mode mismatch is accepted for reuse"),
    "USF-ARTIFACT-PROMOTION-007": ("blocking", "environment mismatch is accepted for same-environment reuse"),
    "USF-ARTIFACT-PROMOTION-008": ("blocking", "claimed proof level exceeds observed evidence"),
    "USF-ARTIFACT-PROMOTION-009": ("blocking", "generated report is treated as proof authority"),
    "USF-ARTIFACT-PROMOTION-010": ("blocking", "non-claims are missing or contradicted"),
    "USF-ARTIFACT-PROMOTION-011": ("blocking", "ambiguous input does not fall back to fuller validation"),
    "USF-ARTIFACT-PROMOTION-012": ("blocking", "Dev evidence is accepted as service-backed Test proof"),
    "USF-ARTIFACT-PROMOTION-013": ("blocking", "Test evidence is accepted as staging proof or readiness"),
    "USF-ARTIFACT-PROMOTION-SELFTEST": ("blocking", "planted artifact-promotion defect did not raise its expected rule"),
}

REQUIRED_DEFECT_RULES = set(RULES) - {"USF-ARTIFACT-PROMOTION-001", "USF-ARTIFACT-PROMOTION-SELFTEST"}
PROOF_ORDER = {
    "discovery": 0,
    "in-memory": 1,
    "hermetic-dev": 2,
    "dev-compose": 3,
    "test-consideration": 4,
    "test-service-backed": 5,
    "staging-entry-consideration": 6,
    "staging-proof": 7,
    "production-live-proof": 8,
}
REQUIRED_NON_CLAIMS = {
    "test-readiness",
    "staging-readiness",
    "staging-proof",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "store-readiness",
    "compliance-readiness",
    "human-acceptance",
}


class Findings:
    def __init__(self) -> None:
        self.items: list[dict[str, str]] = []

    def add(self, rule_id: str, subject: str, message: str) -> None:
        self.items.append(
            {
                "severity": RULES.get(rule_id, ("blocking", ""))[0],
                "ruleId": rule_id,
                "subject": subject,
                "message": message,
            }
        )

    def rule_ids(self) -> set[str]:
        return {item["ruleId"] for item in self.items}


def load_json(path: Path) -> Any:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def load_contract(F: Findings) -> dict[str, Any] | None:
    try:
        contract = load_json(CONTRACT_PATH)
    except Exception as exc:
        F.add("USF-ARTIFACT-PROMOTION-001", str(CONTRACT_PATH), f"contract cannot be parsed: {exc}")
        return None
    if not isinstance(contract, dict):
        F.add("USF-ARTIFACT-PROMOTION-001", str(CONTRACT_PATH), "contract root must be an object")
        return None
    if contract.get("authorityBoundary", {}).get("schemaLifecyclePromoted") is not False:
        F.add("USF-ARTIFACT-PROMOTION-001", str(CONTRACT_PATH), "contract must not promote a schema lifecycle state")
    if contract.get("authorityBoundary", {}).get("implementationRuntimeCreated") is not False:
        F.add("USF-ARTIFACT-PROMOTION-001", str(CONTRACT_PATH), "contract must not create runtime implementation")
    return contract


def controlled_sets(contract: dict[str, Any]) -> dict[str, set[str]]:
    values = contract.get("controlledValues", {})
    return {key: set(value) for key, value in values.items() if isinstance(value, list)}


def validate_record(F: Findings, contract: dict[str, Any], record: Any, subject: str) -> None:
    if not isinstance(record, dict):
        F.add("USF-ARTIFACT-PROMOTION-002", subject, "handoff record must be an object")
        return
    required = contract.get("requiredFields", [])
    for field in required:
        if field not in record:
            F.add("USF-ARTIFACT-PROMOTION-002", f"{subject}#{field}", "required field is missing")
    values = controlled_sets(contract)
    enum_fields = {
        "handoffType": "handoffTypes",
        "sourceEnvironment": "environments",
        "targetEnvironment": "environments",
        "providerMode": "providerModes",
        "observedProofLevel": "proofLevels",
        "claimedProofLevel": "proofLevels",
        "validationStatus": "validationStatuses",
        "freshnessState": "freshnessStates",
        "supersessionState": "supersessionStates",
        "rerunMode": "rerunModes",
        "inputClass": "inputClasses",
    }
    for field, set_name in enum_fields.items():
        allowed = values.get(set_name, set())
        value = record.get(field)
        if value not in allowed:
            F.add("USF-ARTIFACT-PROMOTION-003", f"{subject}#{field}", f"unknown controlled value: {value}")
    for field in ("sourceProviderMode", "targetProviderMode"):
        if field in record and record.get(field) not in values.get("providerModes", set()):
            F.add("USF-ARTIFACT-PROMOTION-003", f"{subject}#{field}", f"unknown provider mode: {record.get(field)}")
    evidence_kinds = record.get("evidenceKinds")
    if not isinstance(evidence_kinds, list) or not evidence_kinds:
        F.add("USF-ARTIFACT-PROMOTION-002", f"{subject}#evidenceKinds", "evidenceKinds must be a non-empty array")
    else:
        for value in evidence_kinds:
            if value not in values.get("evidenceKinds", set()):
                F.add("USF-ARTIFACT-PROMOTION-003", f"{subject}#evidenceKinds", f"unknown evidence kind: {value}")
    if record.get("hashAlgorithm") != "sha256" or not isinstance(record.get("artifactHash"), str) or not re.fullmatch(r"[0-9a-f]{64}", record.get("artifactHash", "")):
        F.add("USF-ARTIFACT-PROMOTION-004", f"{subject}#artifactHash", "artifact hash must be lowercase sha256 hex")
    if record.get("validationStatus") == "pass":
        if record.get("freshnessState") != "current":
            F.add("USF-ARTIFACT-PROMOTION-005", f"{subject}#freshnessState", "passing handoff requires current freshness")
        if record.get("supersessionState") != "current":
            F.add("USF-ARTIFACT-PROMOTION-005", f"{subject}#supersessionState", "passing handoff requires current supersession state")
    if record.get("sourceProviderMode") and record.get("targetProviderMode") and record.get("sourceProviderMode") != record.get("targetProviderMode") and record.get("validationStatus") == "pass":
        F.add("USF-ARTIFACT-PROMOTION-006", f"{subject}#providerMode", "provider mode mismatch cannot pass reuse")
    if record.get("sameEnvironmentReuseRequired") is True and record.get("sourceEnvironment") != record.get("targetEnvironment") and record.get("validationStatus") == "pass":
        F.add("USF-ARTIFACT-PROMOTION-007", f"{subject}#sourceEnvironment", "same-environment reuse cannot pass across environments")
    observed = PROOF_ORDER.get(str(record.get("observedProofLevel")), -1)
    claimed = PROOF_ORDER.get(str(record.get("claimedProofLevel")), -1)
    if observed >= 0 and claimed > observed + 1 and record.get("validationStatus") == "pass":
        F.add("USF-ARTIFACT-PROMOTION-008", f"{subject}#claimedProofLevel", "claimed proof level exceeds observed evidence")
    if record.get("generatedReportNonAuthority") is not True:
        F.add("USF-ARTIFACT-PROMOTION-009", f"{subject}#generatedReportNonAuthority", "generated reports must be marked non-authority")
    if isinstance(evidence_kinds, list) and set(evidence_kinds) == {"generated-report"} and record.get("validationStatus") == "pass":
        F.add("USF-ARTIFACT-PROMOTION-009", f"{subject}#evidenceKinds", "generated-report-only evidence cannot pass")
    non_claims = set(record.get("nonClaims", [])) if isinstance(record.get("nonClaims"), list) else set()
    missing_non_claims = REQUIRED_NON_CLAIMS - non_claims
    if missing_non_claims:
        F.add("USF-ARTIFACT-PROMOTION-010", f"{subject}#nonClaims", f"missing required non-claims: {sorted(missing_non_claims)}")
    if record.get("readinessClaim") is True or record.get("humanAcceptanceClaim") is True:
        F.add("USF-ARTIFACT-PROMOTION-010", subject, "handoff record must not claim readiness or human acceptance")
    if record.get("inputClass") in {"unknown", "ambiguous"} and record.get("ambiguityFallback") != "fuller-applicable-validation":
        F.add("USF-ARTIFACT-PROMOTION-011", f"{subject}#ambiguityFallback", "unknown or ambiguous input must fall back to fuller validation")
    if record.get("inputClass") in {"unknown", "ambiguous"} and record.get("rerunMode") not in {"full-applicable-proof", "terminal-proof-refresh-required"}:
        F.add("USF-ARTIFACT-PROMOTION-011", f"{subject}#rerunMode", "unknown or ambiguous input must require a fuller rerun mode")
    if record.get("handoffType") == "dev-to-test" and record.get("validationStatus") == "pass":
        if record.get("observedProofLevel") in {"in-memory", "hermetic-dev"} and record.get("claimedProofLevel") == "test-service-backed":
            F.add("USF-ARTIFACT-PROMOTION-012", f"{subject}#claimedProofLevel", "Dev in-memory or hermetic evidence cannot pass as service-backed Test proof")
    if record.get("handoffType") == "test-to-staging" and record.get("validationStatus") == "pass":
        if record.get("claimedProofLevel") == "staging-proof" or record.get("stagingReadinessClaim") is True:
            F.add("USF-ARTIFACT-PROMOTION-013", f"{subject}#claimedProofLevel", "Test evidence cannot pass as staging proof or readiness")
        if record.get("stagingEntryBoundary") is not True:
            F.add("USF-ARTIFACT-PROMOTION-013", f"{subject}#stagingEntryBoundary", "Test-to-Staging handoff must preserve staging-entry boundary")


def run_checks(contract: dict[str, Any]) -> Findings:
    F = Findings()
    for i, record in enumerate(contract.get("positiveRecords", [])):
        validate_record(F, contract, record, f"{CONTRACT_PATH}#positiveRecords[{i}]")
    return F


def run_selftest(contract: dict[str, Any]) -> list[dict[str, str]]:
    findings = Findings()
    covered: dict[str, list[str]] = {rule: [] for rule in REQUIRED_DEFECT_RULES}
    seen_ids: set[str] = set()
    defect_paths = sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json"))
    if not defect_paths:
        findings.add("USF-ARTIFACT-PROMOTION-SELFTEST", str(PLANTED_DEFECT_DIR), "planted defect directory is empty")
        return findings.items
    for path in defect_paths:
        rel = str(path.relative_to(ROOT))
        try:
            defect = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            findings.add("USF-ARTIFACT-PROMOTION-SELFTEST", rel, f"defect cannot be parsed: {exc}")
            continue
        defect_id = defect.get("id")
        expected = defect.get("expectedRule")
        if not isinstance(defect_id, str) or not defect_id:
            findings.add("USF-ARTIFACT-PROMOTION-SELFTEST", rel, "defect id is missing")
        elif defect_id in seen_ids:
            findings.add("USF-ARTIFACT-PROMOTION-SELFTEST", rel, "defect id is duplicated")
        else:
            seen_ids.add(defect_id)
        if expected not in REQUIRED_DEFECT_RULES:
            findings.add("USF-ARTIFACT-PROMOTION-SELFTEST", rel, f"expectedRule is not required: {expected}")
            continue
        covered[expected].append(rel)
        F = Findings()
        validate_record(F, contract, defect.get("record"), rel)
        if expected not in F.rule_ids():
            findings.add("USF-ARTIFACT-PROMOTION-SELFTEST", rel, f"expected {expected}, got {sorted(F.rule_ids())}")
    for rule, paths in sorted(covered.items()):
        if not paths:
            findings.add("USF-ARTIFACT-PROMOTION-SELFTEST", str(PLANTED_DEFECT_DIR), f"required rule has no planted defect: {rule}")
    return findings.items


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    bootstrap = Findings()
    contract = load_contract(bootstrap)
    findings = bootstrap.items
    if contract is not None:
        if args.mode == "selftest":
            findings.extend(run_selftest(contract))
        else:
            findings.extend(run_checks(contract).items)
            findings.extend(run_selftest(contract))
    payload = {"mode": args.mode, "ok": not findings, "findings": findings, "rules": RULES}
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for finding in findings:
            print(f"{finding['severity']} {finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
