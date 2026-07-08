#!/usr/bin/env python3
"""Validate USF environment ladder discipline.

This standalone validator cross-checks environment, provider mode, proof level,
freshness, generated-report, evidence-reuse, and proof-cockpit projection
boundaries. It does not run fresh proof-cockpit machine QA and does not make any
readiness claim.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = Path("tools/validate-environment-ladder/environment-ladder-policy.json")
PLANTED_DEFECT_DIR = Path("tools/validate-environment-ladder/planted-defects")
PACKAGE_PATH = Path("package.json")
MAKEFILE_PATH = Path("Makefile")

RULES = {
    "USF-ENV-LADDER-001": ("blocking", "validator policy is missing invalid or untraced"),
    "USF-ENV-LADDER-002": ("blocking", "provider mode or environment vocabulary mapping is unknown"),
    "USF-ENV-LADDER-003": ("blocking", "Dev evidence is accepted as Test evidence"),
    "USF-ENV-LADDER-004": ("blocking", "Test evidence is accepted as Staging evidence"),
    "USF-ENV-LADDER-005": ("blocking", "production-shaped or staging evidence is accepted as production-live"),
    "USF-ENV-LADDER-006": ("blocking", "hermetic provider is accepted as composed or live provider"),
    "USF-ENV-LADDER-007": ("blocking", "provider mismatch is accepted for evidence reuse"),
    "USF-ENV-LADDER-008": ("blocking", "environment mismatch is accepted for evidence reuse"),
    "USF-ENV-LADDER-009": ("blocking", "generated report is accepted as proof authority"),
    "USF-ENV-LADDER-010": ("blocking", "missing collected evidence is accepted above discovery"),
    "USF-ENV-LADDER-011": ("blocking", "unknown impact does not fall back to full validation"),
    "USF-ENV-LADDER-012": ("blocking", "proof-cockpit projection-only output claims fresh machine QA"),
    "USF-ENV-LADDER-013": ("blocking", "unmapped provider-mode prose is accepted silently"),
    "USF-ENV-LADDER-014": ("blocking", "non-claim boundary is missing or contradicted"),
    "USF-ENV-LADDER-015": ("blocking", "direct or aggregate command wiring is missing"),
    "USF-ENV-LADDER-SELFTEST": ("blocking", "planted environment-ladder defect did not raise its expected rule"),
}

REQUIRED_DEFECT_RULES = set(RULES) - {"USF-ENV-LADDER-001", "USF-ENV-LADDER-015", "USF-ENV-LADDER-SELFTEST"}
PROOF_ORDER = {
    "discovery": 0,
    "in-memory": 1,
    "hermetic-dev": 2,
    "dev-compose": 3,
    "test-service-backed": 4,
    "staging-entry-consideration": 5,
    "staging-proof": 6,
    "production-live-proof": 7,
}
REQUIRED_NON_CLAIMS = {
    "staging-readiness",
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
                "fallbackAction": "fail-closed",
                "nonClaim": "This validator report does not create readiness or staging proof.",
            }
        )

    def rule_ids(self) -> set[str]:
        return {item["ruleId"] for item in self.items}


def load_json(path: Path) -> Any:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def load_policy(F: Findings) -> dict[str, Any] | None:
    try:
        policy = load_json(POLICY_PATH)
    except Exception as exc:
        F.add("USF-ENV-LADDER-001", str(POLICY_PATH), f"policy cannot be parsed: {exc}")
        return None
    if not isinstance(policy, dict):
        F.add("USF-ENV-LADDER-001", str(POLICY_PATH), "policy root must be an object")
        return None
    refs = policy.get("authorityReferences")
    if not isinstance(refs, list) or not refs:
        F.add("USF-ENV-LADDER-001", f"{POLICY_PATH}#authorityReferences", "authority references are required")
    boundary = policy.get("authorityBoundary", {})
    if boundary.get("runtimeCodeCreated") is not False:
        F.add("USF-ENV-LADDER-001", f"{POLICY_PATH}#authorityBoundary", "validator policy must not create runtime code")
    if boundary.get("freshProofCockpitMachineQaRequired") is not False:
        F.add("USF-ENV-LADDER-001", f"{POLICY_PATH}#authorityBoundary", "fresh proof-cockpit machine QA must remain terminal-only")
    return policy


def controlled_sets(policy: dict[str, Any]) -> dict[str, set[str]]:
    values = policy.get("controlledValues", {})
    return {key: set(value) for key, value in values.items() if isinstance(value, list)}


def validate_case(F: Findings, policy: dict[str, Any], case: Any, subject: str) -> None:
    if not isinstance(case, dict):
        F.add("USF-ENV-LADDER-001", subject, "case must be an object")
        return
    values = controlled_sets(policy)
    for field, set_name in (
        ("sourceStage", "stages"),
        ("targetStage", "stages"),
        ("sourceEnvironment", "environments"),
        ("targetEnvironment", "environments"),
        ("providerMode", "providerModes"),
        ("claimedProviderMode", "providerModes"),
        ("observedProofLevel", "proofLevels"),
        ("claimedProofLevel", "proofLevels"),
        ("freshnessState", "freshnessStates"),
        ("impactClass", "impactClasses"),
    ):
        if case.get(field) not in values.get(set_name, set()):
            F.add("USF-ENV-LADDER-002", f"{subject}#{field}", f"unknown value: {case.get(field)}")
    provider_mode = case.get("providerMode")
    if isinstance(provider_mode, str) and provider_mode not in values.get("providerModes", set()):
        F.add("USF-ENV-LADDER-013", f"{subject}#providerMode", f"unmapped provider-mode prose: {provider_mode}")
    observed = PROOF_ORDER.get(str(case.get("observedProofLevel")), -1)
    claimed = PROOF_ORDER.get(str(case.get("claimedProofLevel")), -1)
    if case.get("sourceStage") == "dev" and case.get("targetStage") == "test" and observed < PROOF_ORDER["dev-compose"] and claimed >= PROOF_ORDER["test-service-backed"]:
        F.add("USF-ENV-LADDER-003", f"{subject}#claimedProofLevel", "Dev evidence below compose cannot satisfy Test proof")
    if case.get("sourceStage") == "test" and case.get("targetStage") == "staging" and claimed >= PROOF_ORDER["staging-proof"]:
        F.add("USF-ENV-LADDER-004", f"{subject}#claimedProofLevel", "Test evidence cannot satisfy staging proof")
    if case.get("productionLiveClaim") is True and (case.get("targetEnvironment") != "production-live" or case.get("providerMode") != "live-external-provider"):
        F.add("USF-ENV-LADDER-005", f"{subject}#productionLiveClaim", "production-live claim requires production-live environment and live provider")
    if case.get("providerMode") == "hermetic-mock" and case.get("claimedProviderMode") in {"local-composed-real-service", "live-external-provider"}:
        F.add("USF-ENV-LADDER-006", f"{subject}#claimedProviderMode", "hermetic provider cannot satisfy composed or live provider claim")
    reuse = case.get("evidenceReuse", {})
    if isinstance(reuse, dict):
        if reuse.get("sourceProviderMode") != reuse.get("targetProviderMode"):
            F.add("USF-ENV-LADDER-007", f"{subject}#evidenceReuse.providerMode", "provider mismatch cannot pass evidence reuse")
        if reuse.get("sourceEnvironment") != reuse.get("targetEnvironment"):
            F.add("USF-ENV-LADDER-008", f"{subject}#evidenceReuse.environment", "environment mismatch cannot pass evidence reuse")
    if case.get("generatedReportAuthoritative") is True or set(case.get("evidenceKinds", [])) == {"generated-report"}:
        F.add("USF-ENV-LADDER-009", f"{subject}#evidenceKinds", "generated report cannot be proof authority")
    if case.get("collectedEvidence") is not True and claimed > PROOF_ORDER["discovery"]:
        F.add("USF-ENV-LADDER-010", f"{subject}#collectedEvidence", "proof above discovery requires collected evidence")
    if case.get("freshnessState") != "current" and claimed > PROOF_ORDER["discovery"]:
        F.add("USF-ENV-LADDER-010", f"{subject}#freshnessState", "proof above discovery requires current freshness")
    if case.get("impactClass") == "unknown" and case.get("fallbackOnAmbiguity") != "full-validation":
        F.add("USF-ENV-LADDER-011", f"{subject}#fallbackOnAmbiguity", "unknown impact must fall back to full validation")
    cockpit = case.get("proofCockpit", {})
    if isinstance(cockpit, dict) and cockpit.get("projectionOnly") is True and cockpit.get("freshMachineQaClaim") is True:
        F.add("USF-ENV-LADDER-012", f"{subject}#proofCockpit", "projection-only output cannot claim fresh machine QA")
    non_claims = set(case.get("nonClaims", [])) if isinstance(case.get("nonClaims"), list) else set()
    missing = REQUIRED_NON_CLAIMS - non_claims
    if missing or case.get("stagingReadinessClaim") is True:
        F.add("USF-ENV-LADDER-014", f"{subject}#nonClaims", f"non-claim boundary missing or contradicted: {sorted(missing)}")


def check_wiring(F: Findings) -> None:
    package = load_json(PACKAGE_PATH)
    scripts = package.get("scripts", {}) if isinstance(package, dict) else {}
    if scripts.get("environment-ladder:validate") != "python3 tools/validate-environment-ladder/validate-environment-ladder.py all --json":
        F.add("USF-ENV-LADDER-015", "package.json#scripts.environment-ladder:validate", "direct validation script is missing")
    if scripts.get("environment-ladder:selftest") != "python3 tools/validate-environment-ladder/validate-environment-ladder.py selftest --json":
        F.add("USF-ENV-LADDER-015", "package.json#scripts.environment-ladder:selftest", "selftest script is missing")
    repo_validate = scripts.get("repo:validate", "")
    if "tools/validate-environment-ladder/validate-environment-ladder.py all --json" not in repo_validate:
        F.add("USF-ENV-LADDER-015", "package.json#scripts.repo:validate", "aggregate validation does not include environment ladder validator")
    makefile = (ROOT / MAKEFILE_PATH).read_text(encoding="utf-8")
    if "environment-ladder-validate:" not in makefile:
        F.add("USF-ENV-LADDER-015", "Makefile#environment-ladder-validate", "Make target is missing")
    if "environment-ladder-selftest:" not in makefile:
        F.add("USF-ENV-LADDER-015", "Makefile#environment-ladder-selftest", "Make selftest target is missing")


def run_checks(policy: dict[str, Any]) -> Findings:
    F = Findings()
    for i, case in enumerate(policy.get("positiveCases", [])):
        validate_case(F, policy, case, f"{POLICY_PATH}#positiveCases[{i}]")
    check_wiring(F)
    return F


def run_selftest(policy: dict[str, Any]) -> list[dict[str, str]]:
    findings = Findings()
    covered: dict[str, list[str]] = {rule: [] for rule in REQUIRED_DEFECT_RULES}
    seen_ids: set[str] = set()
    defect_paths = sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json"))
    if not defect_paths:
        findings.add("USF-ENV-LADDER-SELFTEST", str(PLANTED_DEFECT_DIR), "planted defect directory is empty")
        return findings.items
    for path in defect_paths:
        rel = str(path.relative_to(ROOT))
        try:
            defect = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            findings.add("USF-ENV-LADDER-SELFTEST", rel, f"defect cannot be parsed: {exc}")
            continue
        defect_id = defect.get("id")
        expected = defect.get("expectedRule")
        if not isinstance(defect_id, str) or not defect_id:
            findings.add("USF-ENV-LADDER-SELFTEST", rel, "defect id is missing")
        elif defect_id in seen_ids:
            findings.add("USF-ENV-LADDER-SELFTEST", rel, "defect id is duplicated")
        else:
            seen_ids.add(defect_id)
        if expected not in REQUIRED_DEFECT_RULES:
            findings.add("USF-ENV-LADDER-SELFTEST", rel, f"expectedRule is not required: {expected}")
            continue
        covered[expected].append(rel)
        F = Findings()
        validate_case(F, policy, defect.get("case"), rel)
        if expected not in F.rule_ids():
            findings.add("USF-ENV-LADDER-SELFTEST", rel, f"expected {expected}, got {sorted(F.rule_ids())}")
    for rule, paths in sorted(covered.items()):
        if not paths:
            findings.add("USF-ENV-LADDER-SELFTEST", str(PLANTED_DEFECT_DIR), f"required rule has no planted defect: {rule}")
    return findings.items


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    bootstrap = Findings()
    policy = load_policy(bootstrap)
    findings = bootstrap.items
    if policy is not None:
        if args.mode == "selftest":
            findings.extend(run_selftest(policy))
        else:
            findings.extend(run_checks(policy).items)
            findings.extend(run_selftest(policy))
    payload = {"mode": args.mode, "ok": not findings, "findings": findings, "rules": RULES}
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for finding in findings:
            print(f"{finding['severity']} {finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
