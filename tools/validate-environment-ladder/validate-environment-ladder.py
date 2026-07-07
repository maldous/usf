#!/usr/bin/env python3
"""Validate USF environment ladder discipline.

This is a validator-owned enforcement layer for USF-992. It writes no
repository files, does not wire itself into aggregate validation, and does not
refresh proof-cockpit machine evidence.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
TOOL_ROOT = Path(__file__).resolve().parent
POLICY_PATH = TOOL_ROOT / "environment-ladder-policy.json"
PLANTED_DEFECT_DIR = TOOL_ROOT / "planted-defects"
PACKAGE_PATH = ROOT / "package.json"
MAKEFILE_PATH = ROOT / "Makefile"
VALIDATE_SPEC_PATH = ROOT / "tools/validate-spec/validate-spec.py"
VOCABULARY_PATH = ROOT / "spec/vocabularies/vocabulary-catalog.json"
PROMOTION_PATH = ROOT / "spec/instances/environment-promotion/environment-promotion-enterprise-standard.json"
HERMETIC_ENV_PATH = ROOT / "spec/instances/environment/hermetic.json"
PRODUCTION_SHAPED_ENV_PATH = ROOT / "spec/instances/environment/production-shaped.json"
MOCK_IDP_PROVIDER_PATH = ROOT / "spec/instances/provider-mode/mock-identity-provider.json"
INVALIDATION_MAP_PATH = ROOT / "tools/validate-evidence-invalidation/evidence-invalidation-map.json"
REUSE_DECISIONS_PATH = ROOT / "tools/validate-evidence-reuse/evidence-reuse-decisions.json"

VALIDATOR_TOOL_PATH = "tools/validate-environment-ladder/validate-environment-ladder.py"
VALIDATE_COMMAND = "python3 tools/validate-environment-ladder/validate-environment-ladder.py all --json"
SELFTEST_COMMAND = "python3 tools/validate-environment-ladder/validate-environment-ladder.py selftest --json"
MAKE_VALIDATE_TARGET = "environment-ladder-validate"
MAKE_SELFTEST_TARGET = "environment-ladder-selftest"

RULES = {
    "USF-ENV-LADDER-001": "validator-owned policy shape is missing required fields",
    "USF-ENV-LADDER-002": "authority references or non-claim boundary are unsafe",
    "USF-ENV-LADDER-003": "provider, environment, proof, or report vocabulary mapping is unsafe",
    "USF-ENV-LADDER-004": "environment promotion standard and validator policy disagree",
    "USF-ENV-LADDER-005": "provider or environment boundary is unsafe",
    "USF-ENV-LADDER-006": "proof, freshness, report, or readiness overclaim boundary is unsafe",
    "USF-ENV-LADDER-007": "evidence invalidation or reuse dependency is not fail-closed",
    "USF-ENV-LADDER-008": "proof-cockpit terminal machine evidence deferral boundary is unsafe",
    "USF-ENV-LADDER-009": "standalone package, Make, or validate-spec tooling wiring is stale",
    "USF-ENV-LADDER-010": "aggregate validation wiring is not deferred to USF-993",
    "USF-ENV-LADDER-SELFTEST": "planted defect did not raise its expected rule",
}

REQUIRED_ROOT_FIELDS = {
    "id",
    "version",
    "issueId",
    "parentIssueId",
    "designIssueId",
    "orchestrationIssueId",
    "terminalFreshMachineQaIssue",
    "nonAuthorityStatement",
    "authorityReferences",
    "requiredVocabularyValues",
    "stageStandards",
    "freshnessStates",
    "nonPassFreshnessStates",
    "globalPolicies",
    "proofBoundaries",
    "nonClaims",
    "commandContracts",
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

REQUIRED_PROVIDER_MODES = {
    "hermetic-mock",
    "local-composed-real-service",
    "external-sandbox",
    "live-external-provider",
}

REQUIRED_ENVIRONMENT_CLASSES = {
    "local",
    "hermetic",
    "integration",
    "staging",
    "production-shaped",
    "production-live",
}

REQUIRED_PROOF_LEVELS = {
    "discovery-proven",
    "executable-proven",
    "contract-proven",
    "behaviour-proven",
    "substrate-proven",
    "resilience-proven",
    "foundation-proven",
}

REQUIRED_REPORT_STATUSES = {
    "pass",
    "fail",
    "partial",
    "stale",
    "not-run",
    "advisory",
    "unknown",
}

REQUIRED_STAGE_CLASSES = {
    "dev": "local",
    "test": "integration",
    "staging": "staging",
    "production": "production-live",
}

REQUIRED_STAGE_PROVIDERS = {
    "dev": {"hermetic-mock", "local-composed-real-service"},
    "test": {"local-composed-real-service"},
    "staging": {"local-composed-real-service", "external-sandbox"},
    "production": {"live-external-provider"},
}

REQUIRED_STAGE_DEFAULT_PROVIDER = {
    "dev": "hermetic-mock",
    "test": "local-composed-real-service",
    "staging": "external-sandbox",
    "production": "live-external-provider",
}

FAIL_CLOSED_POLICIES = {
    "devEvidenceCanSatisfyTest": False,
    "testEvidenceCanSatisfyStaging": False,
    "stagingEvidenceCanSatisfyProduction": False,
    "productionShapedCanSatisfyProductionLive": False,
    "hermeticMockCanSatisfyComposedOrLive": False,
    "providerMismatchCanPass": False,
    "environmentMismatchCanPass": False,
    "generatedReportsAreAuthority": False,
    "generatedReportOnlyCanSatisfyProof": False,
    "missingCollectedEvidenceCanPass": False,
    "staleCanPass": False,
    "unknownCanPass": False,
    "proofOverclaimCanPass": False,
    "automaticHumanSignoffAllowed": False,
    "proofCockpitProjectionOnlyCanClaimFreshMachineQa": False,
    "terminalRefreshDeferredCanPass": False,
    "stagingIsDefaultProofPath": False,
    "linearDefinesSemanticAuthority": False,
}

FRESHNESS_STATES = {
    "current",
    "stale",
    "unknown",
    "partial",
    "mismatched",
    "missing-collected-evidence",
    "generated-report-only",
    "superseded",
    "human-review-required",
    "terminal-refresh-deferred",
}

NON_PASS_FRESHNESS = FRESHNESS_STATES - {"current"}


def repo_relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def string_set(value: Any) -> set[str]:
    return {item for item in as_list(value) if isinstance(item, str) and item}


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

    def extend(self, items: list[dict[str, str]]) -> None:
        self.items.extend(items)


def vocabulary_values(vocabulary: dict[str, Any], value_set_id: str) -> set[str]:
    for value_set in as_list(vocabulary.get("valueSets")):
        if isinstance(value_set, dict) and value_set.get("id") == value_set_id:
            return string_set([row.get("id") for row in as_list(value_set.get("values")) if isinstance(row, dict)])
    return set()


def vocabulary_aliases(vocabulary: dict[str, Any], value_set_id: str) -> set[str]:
    for value_set in as_list(vocabulary.get("valueSets")):
        if isinstance(value_set, dict) and value_set.get("id") == value_set_id:
            return string_set([row.get("id") for row in as_list(value_set.get("aliases")) if isinstance(row, dict)])
    return set()


def stage_rows(document: dict[str, Any]) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for row in as_list(document.get("environmentStandards")):
        if isinstance(row, dict) and isinstance(row.get("environmentStage"), str):
            rows[row["environmentStage"]] = row
    return rows


def policy_stage_rows(policy: dict[str, Any]) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for row in as_list(policy.get("stageStandards")):
        if isinstance(row, dict) and isinstance(row.get("stage"), str):
            rows[row["stage"]] = row
    return rows


def validate_policy_shape(policy: Any, findings: Findings) -> None:
    if not isinstance(policy, dict):
        findings.add("USF-ENV-LADDER-001", repo_relative(POLICY_PATH), "policy root must be a JSON object")
        return

    missing = sorted(REQUIRED_ROOT_FIELDS - set(policy))
    for field in missing:
        findings.add("USF-ENV-LADDER-001", f"/{field}", "required root field is missing")

    expected_ids = {
        "id": "environment-ladder-policy",
        "issueId": "USF-992",
        "parentIssueId": "USF-989",
        "designIssueId": "USF-456",
        "orchestrationIssueId": "USF-952",
        "terminalFreshMachineQaIssue": "USF-966",
    }
    for field, expected in expected_ids.items():
        if policy.get(field) != expected:
            findings.add("USF-ENV-LADDER-001", f"/{field}", f"{field} must be {expected}")

    statement = policy.get("nonAuthorityStatement")
    if not isinstance(statement, str) or "does not define USF semantic authority" not in statement:
        findings.add("USF-ENV-LADDER-002", "/nonAuthorityStatement", "policy must state that it does not define USF semantic authority")

    refs = string_set(policy.get("authorityReferences"))
    required_refs = {
        "docs/architecture/charter.md",
        "docs/architecture/authority-model.md",
        "spec/vocabularies/vocabulary-catalog.json",
        "spec/instances/environment-promotion/environment-promotion-enterprise-standard.json",
        "tools/validate-evidence-invalidation/evidence-invalidation-map.json",
        "tools/validate-evidence-reuse/evidence-reuse-decisions.json",
    }
    for ref in sorted(required_refs - refs):
        findings.add("USF-ENV-LADDER-002", "/authorityReferences", f"required authority reference is missing: {ref}")

    for non_claim in sorted(REQUIRED_NON_CLAIMS - string_set(policy.get("nonClaims"))):
        findings.add("USF-ENV-LADDER-002", "/nonClaims", f"required non-claim is missing: {non_claim}")


def validate_policy_vocabulary(policy: dict[str, Any], vocabulary: dict[str, Any], findings: Findings) -> None:
    required_by_set = {
        "provider-modes": REQUIRED_PROVIDER_MODES,
        "environment-classes": REQUIRED_ENVIRONMENT_CLASSES,
        "proof-levels": REQUIRED_PROOF_LEVELS,
        "report-statuses": REQUIRED_REPORT_STATUSES,
    }
    policy_values = policy.get("requiredVocabularyValues")
    if not isinstance(policy_values, dict):
        findings.add("USF-ENV-LADDER-003", "/requiredVocabularyValues", "requiredVocabularyValues must be an object")
        return

    for value_set_id, expected in sorted(required_by_set.items()):
        catalogue_values = vocabulary_values(vocabulary, value_set_id)
        if not catalogue_values:
            findings.add("USF-ENV-LADDER-003", value_set_id, "value set is missing from vocabulary catalogue")
            continue
        missing_catalogue = sorted(expected - catalogue_values)
        if missing_catalogue:
            findings.add("USF-ENV-LADDER-003", value_set_id, f"catalogue is missing required values: {missing_catalogue}")
        declared = string_set(policy_values.get(value_set_id))
        missing_declared = sorted(expected - declared)
        if missing_declared:
            findings.add("USF-ENV-LADDER-003", f"/requiredVocabularyValues/{value_set_id}", f"policy is missing required values: {missing_declared}")
        unknown_declared = sorted(declared - catalogue_values)
        if unknown_declared:
            findings.add("USF-ENV-LADDER-003", f"/requiredVocabularyValues/{value_set_id}", f"policy uses values outside the catalogue: {unknown_declared}")
        aliases = vocabulary_aliases(vocabulary, value_set_id)
        alias_usage = sorted(declared & aliases)
        if alias_usage:
            findings.add("USF-ENV-LADDER-003", f"/requiredVocabularyValues/{value_set_id}", f"aliases must not be used as canonical values: {alias_usage}")


def validate_stage_standards(policy: dict[str, Any], promotion: dict[str, Any], findings: Findings) -> None:
    policy_rows = policy_stage_rows(policy)
    promotion_rows = stage_rows(promotion)
    for stage in sorted(REQUIRED_STAGE_CLASSES):
        policy_row = policy_rows.get(stage)
        promotion_row = promotion_rows.get(stage)
        if not policy_row:
            findings.add("USF-ENV-LADDER-004", f"/stageStandards/{stage}", "policy stage is missing")
            continue
        if not promotion_row:
            findings.add("USF-ENV-LADDER-004", f"/environmentStandards/{stage}", "promotion standard stage is missing")
            continue
        expected_class = REQUIRED_STAGE_CLASSES[stage]
        if policy_row.get("environmentClass") != expected_class:
            findings.add("USF-ENV-LADDER-004", f"/stageStandards/{stage}/environmentClass", f"stage must map to {expected_class}")
        if promotion_row.get("environmentClass") != expected_class:
            findings.add("USF-ENV-LADDER-004", f"/environmentStandards/{stage}/environmentClass", f"promotion standard must map stage to {expected_class}")
        providers = string_set(policy_row.get("permittedProviderModes"))
        expected_providers = REQUIRED_STAGE_PROVIDERS[stage]
        if providers != expected_providers:
            findings.add("USF-ENV-LADDER-005", f"/stageStandards/{stage}/permittedProviderModes", f"stage provider modes must be {sorted(expected_providers)}")
        if string_set(promotion_row.get("permittedProviderModes")) != expected_providers:
            findings.add("USF-ENV-LADDER-005", f"/environmentStandards/{stage}/permittedProviderModes", f"promotion provider modes must be {sorted(expected_providers)}")
        expected_default = REQUIRED_STAGE_DEFAULT_PROVIDER[stage]
        if policy_row.get("defaultProviderMode") != expected_default:
            findings.add("USF-ENV-LADDER-005", f"/stageStandards/{stage}/defaultProviderMode", f"default provider mode must be {expected_default}")
        if promotion_row.get("defaultProviderMode") != expected_default:
            findings.add("USF-ENV-LADDER-005", f"/environmentStandards/{stage}/defaultProviderMode", f"promotion default provider mode must be {expected_default}")
        if not string_set(policy_row.get("prohibitedClaims")) and stage != "production":
            findings.add("USF-ENV-LADDER-006", f"/stageStandards/{stage}/prohibitedClaims", "non-production stages must preserve prohibited claims")

    claim_rules = "\n".join(str(item).lower() for item in as_list(promotion.get("claimRules")))
    required_claim_rule_phrases = [
        "dev evidence must not satisfy test readiness",
        "test evidence must not satisfy staging readiness",
        "staging evidence must not satisfy production readiness",
        "hermetic-mock provider mode must not satisfy local-composed-real-service",
        "readiness claims must not exceed proof level",
    ]
    for phrase in required_claim_rule_phrases:
        if phrase not in claim_rules:
            findings.add("USF-ENV-LADDER-006", "/claimRules", f"promotion standard missing claim rule phrase: {phrase}")


def validate_environment_instances(
    hermetic: dict[str, Any],
    production_shaped: dict[str, Any],
    mock_idp: dict[str, Any],
    findings: Findings,
) -> None:
    if hermetic.get("environment") != "hermetic":
        findings.add("USF-ENV-LADDER-005", repo_relative(HERMETIC_ENV_PATH), "hermetic instance must declare environment hermetic")
    if string_set(hermetic.get("permittedProviderModes")) != {"hermetic-mock"}:
        findings.add("USF-ENV-LADDER-005", repo_relative(HERMETIC_ENV_PATH), "hermetic environment must permit only hermetic-mock")
    if hermetic.get("productionLiveClaim") is not False:
        findings.add("USF-ENV-LADDER-005", repo_relative(HERMETIC_ENV_PATH), "hermetic environment must not claim production live")

    if production_shaped.get("environment") != "production-shaped":
        findings.add("USF-ENV-LADDER-005", repo_relative(PRODUCTION_SHAPED_ENV_PATH), "production-shaped instance must declare production-shaped")
    if string_set(production_shaped.get("permittedProviderModes")) != {"local-composed-real-service", "external-sandbox"}:
        findings.add("USF-ENV-LADDER-005", repo_relative(PRODUCTION_SHAPED_ENV_PATH), "production-shaped must permit only local composed or external sandbox provider modes")
    if production_shaped.get("productionLiveClaim") is not False:
        findings.add("USF-ENV-LADDER-005", repo_relative(PRODUCTION_SHAPED_ENV_PATH), "production-shaped must not claim production live")

    if mock_idp.get("providerMode") != "hermetic-mock":
        findings.add("USF-ENV-LADDER-005", repo_relative(MOCK_IDP_PROVIDER_PATH), "mock identity provider must remain hermetic-mock")
    if mock_idp.get("environment") != "hermetic":
        findings.add("USF-ENV-LADDER-005", repo_relative(MOCK_IDP_PROVIDER_PATH), "mock identity provider must remain in hermetic environment")
    if mock_idp.get("liveExternalProviderClaim") is not False:
        findings.add("USF-ENV-LADDER-005", repo_relative(MOCK_IDP_PROVIDER_PATH), "mock identity provider must not claim live external provider")


def validate_global_policies(policy: dict[str, Any], findings: Findings) -> None:
    policies = policy.get("globalPolicies")
    if not isinstance(policies, dict):
        findings.add("USF-ENV-LADDER-001", "/globalPolicies", "globalPolicies must be an object")
        return
    proof_cockpit_keys = {
        "proofCockpitProjectionOnlyCanClaimFreshMachineQa",
        "terminalRefreshDeferredCanPass",
    }
    for key, expected in sorted(FAIL_CLOSED_POLICIES.items()):
        if policies.get(key) is not expected:
            if key in {"productionShapedCanSatisfyProductionLive", "hermeticMockCanSatisfyComposedOrLive", "providerMismatchCanPass", "environmentMismatchCanPass"}:
                rule = "USF-ENV-LADDER-005"
            elif key in proof_cockpit_keys:
                rule = "USF-ENV-LADDER-008"
            else:
                rule = "USF-ENV-LADDER-006"
            findings.add(rule, f"/globalPolicies/{key}", f"{key} must remain {expected}")
    if policies.get("terminalFreshMachineQaIssue") != "USF-966":
        findings.add("USF-ENV-LADDER-008", "/globalPolicies/terminalFreshMachineQaIssue", "terminal machine evidence refresh must remain assigned to USF-966")
    if policies.get("unknownImpactFallback") != "full-proof-for-affected-family-or-widen-to-all":
        findings.add("USF-ENV-LADDER-006", "/globalPolicies/unknownImpactFallback", "unknown change impact must fail closed to full proof or wider validation")

    freshness = string_set(policy.get("freshnessStates"))
    non_pass = string_set(policy.get("nonPassFreshnessStates"))
    missing_freshness = sorted(FRESHNESS_STATES - freshness)
    if missing_freshness:
        findings.add("USF-ENV-LADDER-006", "/freshnessStates", f"freshness states missing: {missing_freshness}")
    missing_non_pass = sorted(NON_PASS_FRESHNESS - non_pass)
    if missing_non_pass:
        findings.add("USF-ENV-LADDER-006", "/nonPassFreshnessStates", f"non-pass freshness states missing: {missing_non_pass}")
    if "current" in non_pass:
        findings.add("USF-ENV-LADDER-006", "/nonPassFreshnessStates", "current must not be a non-pass state")


def validate_evidence_dependencies(invalidation: dict[str, Any], reuse: dict[str, Any], findings: Findings) -> None:
    invalidation_policies = invalidation.get("globalPolicies")
    if not isinstance(invalidation_policies, dict):
        findings.add("USF-ENV-LADDER-007", repo_relative(INVALIDATION_MAP_PATH), "evidence invalidation global policies are missing")
    else:
        invalidation_expectations = {
            "generatedReportOnlyCanSatisfyProof": False,
            "automaticHumanSignoffAllowed": False,
            "terminalRefreshDeferredCanPass": False,
            "proofOverclaimCanPass": False,
            "staleCanPass": False,
        }
        for key, expected in invalidation_expectations.items():
            if invalidation_policies.get(key) is not expected:
                findings.add("USF-ENV-LADDER-007", f"{repo_relative(INVALIDATION_MAP_PATH)}#{key}", f"invalidation policy {key} must remain {expected}")
        if invalidation_policies.get("terminalFreshMachineQaIssue") != "USF-966":
            findings.add("USF-ENV-LADDER-008", f"{repo_relative(INVALIDATION_MAP_PATH)}#terminalFreshMachineQaIssue", "terminal refresh must remain tied to USF-966")
        for key in ("ambiguousProviderFallback", "ambiguousEnvironmentFallback"):
            if invalidation_policies.get(key) != "full-proof-for-affected-family":
                findings.add("USF-ENV-LADDER-007", f"{repo_relative(INVALIDATION_MAP_PATH)}#{key}", "provider or environment ambiguity must force full affected proof")

    reuse_policies = reuse.get("globalPolicies")
    if not isinstance(reuse_policies, dict):
        findings.add("USF-ENV-LADDER-007", repo_relative(REUSE_DECISIONS_PATH), "evidence reuse global policies are missing")
    else:
        reuse_expectations = {
            "providerMismatchFallback": "full-proof-for-affected-family",
            "environmentMismatchFallback": "full-proof-for-affected-family",
            "proofOverclaimFallback": "full-proof-for-affected-family",
            "generatedReportOnlyCanSatisfyProof": False,
            "staleCanPass": False,
            "unknownCanPass": False,
            "automaticHumanSignoffAllowed": False,
            "terminalRefreshDeferredCanPass": False,
        }
        for key, expected in sorted(reuse_expectations.items()):
            if reuse_policies.get(key) != expected:
                findings.add("USF-ENV-LADDER-007", f"{repo_relative(REUSE_DECISIONS_PATH)}#{key}", f"reuse policy {key} must remain {expected}")
    if reuse.get("terminalFreshMachineQaIssue") != "USF-966":
        findings.add("USF-ENV-LADDER-008", f"{repo_relative(REUSE_DECISIONS_PATH)}#terminalFreshMachineQaIssue", "reuse terminal refresh must remain assigned to USF-966")
    for index, decision in enumerate(as_list(reuse.get("reuseDecisions"))):
        if not isinstance(decision, dict):
            continue
        if decision.get("freshnessState") == "terminal-refresh-deferred":
            if decision.get("eligibilityStatus") == "pass-current":
                findings.add("USF-ENV-LADDER-008", f"{repo_relative(REUSE_DECISIONS_PATH)}#/reuseDecisions/{index}", "terminal-refresh-deferred evidence cannot pass current reuse")
            if decision.get("requiredRerunMode") != "terminal-usf-966-refresh":
                findings.add("USF-ENV-LADDER-008", f"{repo_relative(REUSE_DECISIONS_PATH)}#/reuseDecisions/{index}", "terminal-refresh-deferred evidence must require USF-966 refresh")


def validate_wiring(policy: dict[str, Any], package: dict[str, Any], makefile: str, validate_spec: str, findings: Findings) -> None:
    contracts = policy.get("commandContracts")
    if not isinstance(contracts, dict):
        findings.add("USF-ENV-LADDER-001", "/commandContracts", "commandContracts must be an object")
        return
    if contracts.get("validateScript") != VALIDATE_COMMAND:
        findings.add("USF-ENV-LADDER-009", "/commandContracts/validateScript", "validate command contract is stale")
    if contracts.get("selftestScript") != SELFTEST_COMMAND:
        findings.add("USF-ENV-LADDER-009", "/commandContracts/selftestScript", "selftest command contract is stale")
    if contracts.get("makeValidateTarget") != MAKE_VALIDATE_TARGET or contracts.get("makeSelftestTarget") != MAKE_SELFTEST_TARGET:
        findings.add("USF-ENV-LADDER-009", "/commandContracts", "Make target command contract is stale")
    if contracts.get("aggregateWiringDeferred") is not True:
        findings.add("USF-ENV-LADDER-010", "/commandContracts/aggregateWiringDeferred", "aggregate wiring must remain deferred to USF-993")

    scripts = package.get("scripts")
    if not isinstance(scripts, dict):
        findings.add("USF-ENV-LADDER-009", "package.json#scripts", "package scripts object is missing")
        return
    if scripts.get("environment-ladder:validate") != VALIDATE_COMMAND:
        findings.add("USF-ENV-LADDER-009", "package.json#scripts.environment-ladder:validate", "standalone validation script is missing or stale")
    if scripts.get("environment-ladder:selftest") != SELFTEST_COMMAND:
        findings.add("USF-ENV-LADDER-009", "package.json#scripts.environment-ladder:selftest", "standalone selftest script is missing or stale")
    repo_validate = scripts.get("repo:validate")
    if isinstance(repo_validate, str) and VALIDATE_COMMAND in repo_validate:
        findings.add("USF-ENV-LADDER-010", "package.json#scripts.repo:validate", "aggregate repo validation wiring is deferred to USF-993")

    make_validate = f"{MAKE_VALIDATE_TARGET}:\n\tcorepack pnpm environment-ladder:validate"
    make_selftest = f"{MAKE_SELFTEST_TARGET}:\n\tcorepack pnpm environment-ladder:selftest"
    if make_validate not in makefile:
        findings.add("USF-ENV-LADDER-009", f"Makefile#{MAKE_VALIDATE_TARGET}", "Make validation target is missing or stale")
    if make_selftest not in makefile:
        findings.add("USF-ENV-LADDER-009", f"Makefile#{MAKE_SELFTEST_TARGET}", "Make selftest target is missing or stale")
    if "make environment-ladder-validate" not in makefile or "make environment-ladder-selftest" not in makefile:
        findings.add("USF-ENV-LADDER-009", "Makefile#help", "Make help output is missing standalone environment ladder targets")
    if f'"{VALIDATOR_TOOL_PATH}"' not in validate_spec:
        findings.add("USF-ENV-LADDER-009", "tools/validate-spec/validate-spec.py#AUTHORIZED_TOOLING", "new validator entrypoint must be authorized by validate-spec")


def validate_state(state: dict[str, Any]) -> list[dict[str, str]]:
    findings = Findings()
    policy = state["policy"]
    if not isinstance(policy, dict):
        validate_policy_shape(policy, findings)
        return findings.items

    validate_policy_shape(policy, findings)
    validate_policy_vocabulary(policy, state["vocabulary"], findings)
    validate_stage_standards(policy, state["promotion"], findings)
    validate_environment_instances(state["hermetic"], state["productionShaped"], state["mockIdp"], findings)
    validate_global_policies(policy, findings)
    validate_evidence_dependencies(state["invalidation"], state["reuse"], findings)
    validate_wiring(policy, state["package"], state["makefile"], state["validateSpec"], findings)
    return findings.items


def load_state() -> dict[str, Any]:
    return {
        "policy": load_json(POLICY_PATH),
        "vocabulary": load_json(VOCABULARY_PATH),
        "promotion": load_json(PROMOTION_PATH),
        "hermetic": load_json(HERMETIC_ENV_PATH),
        "productionShaped": load_json(PRODUCTION_SHAPED_ENV_PATH),
        "mockIdp": load_json(MOCK_IDP_PROVIDER_PATH),
        "invalidation": load_json(INVALIDATION_MAP_PATH),
        "reuse": load_json(REUSE_DECISIONS_PATH),
        "package": load_json(PACKAGE_PATH),
        "makefile": MAKEFILE_PATH.read_text(encoding="utf-8"),
        "validateSpec": VALIDATE_SPEC_PATH.read_text(encoding="utf-8"),
    }


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
        tokens = pointer_tokens(str(operation.get("path", "")))
        if not tokens:
            raise ValueError("root-level patch operations are not supported for planted defects")
        parent, key = patch_parent(document, tokens)
        if isinstance(parent, list):
            index = len(parent) if key == "-" else int(key)
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


def apply_fixture(state: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    mutated = copy.deepcopy(state)
    target = fixture.get("target")
    if target not in mutated:
        raise ValueError(f"unknown fixture target: {target}")
    operations = fixture.get("patch")
    if not isinstance(operations, list):
        raise ValueError("fixture patch must be an array")
    apply_patch_operations(mutated[target], operations)
    return mutated


def run_selftest() -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    results: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    if not PLANTED_DEFECT_DIR.exists():
        return results, [finding("USF-ENV-LADDER-SELFTEST", repo_relative(PLANTED_DEFECT_DIR), "planted defect directory is missing")]
    fixture_paths = sorted(PLANTED_DEFECT_DIR.glob("*.json"))
    if not fixture_paths:
        return results, [finding("USF-ENV-LADDER-SELFTEST", repo_relative(PLANTED_DEFECT_DIR), "planted defect directory is empty")]

    base_state = load_state()
    base_findings = validate_state(base_state)
    if base_findings:
        failures.append(finding("USF-ENV-LADDER-SELFTEST", repo_relative(POLICY_PATH), "positive baseline does not pass standalone validation"))

    for path in fixture_paths:
        try:
            defect = load_json(path)
            expected = defect.get("expectedRule")
            mutated = apply_fixture(base_state, defect.get("fixture", {}))
            observed_findings = validate_state(mutated)
            observed = sorted({item["ruleId"] for item in observed_findings})
            passed = isinstance(expected, str) and expected in observed
            results.append(
                {
                    "fixture": repo_relative(path),
                    "expectedRule": expected,
                    "observedRuleIds": observed,
                    "passed": passed,
                }
            )
            if not passed:
                failures.append(
                    finding(
                        "USF-ENV-LADDER-SELFTEST",
                        repo_relative(path),
                        f"expected {expected}, got {observed}",
                    )
                )
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            failures.append(finding("USF-ENV-LADDER-SELFTEST", repo_relative(path), f"fixture execution failed: {exc}"))
            results.append(
                {
                    "fixture": repo_relative(path),
                    "expectedRule": None,
                    "observedRuleIds": [],
                    "passed": False,
                }
            )
    return results, failures


def report_for_state(state: dict[str, Any]) -> dict[str, Any]:
    policy = state["policy"]
    stages = policy_stage_rows(policy) if isinstance(policy, dict) else {}
    return {
        "issueId": "USF-992",
        "parentIssueId": "USF-989",
        "designIssueId": "USF-456",
        "terminalFreshMachineQaIssue": "USF-966",
        "terminalFreshMachineQaDeferred": True,
        "aggregateWiringDeferredTo": "USF-993",
        "stageCount": len(stages),
        "stages": sorted(stages),
        "providerModes": sorted(REQUIRED_PROVIDER_MODES),
        "environmentClasses": sorted(REQUIRED_ENVIRONMENT_CLASSES),
        "proofLevels": sorted(REQUIRED_PROOF_LEVELS),
        "reportStatuses": sorted(REQUIRED_REPORT_STATUSES),
        "nonClaims": sorted(REQUIRED_NON_CLAIMS),
        "checkedInputs": [
            repo_relative(POLICY_PATH),
            repo_relative(VOCABULARY_PATH),
            repo_relative(PROMOTION_PATH),
            repo_relative(HERMETIC_ENV_PATH),
            repo_relative(PRODUCTION_SHAPED_ENV_PATH),
            repo_relative(MOCK_IDP_PROVIDER_PATH),
            repo_relative(INVALIDATION_MAP_PATH),
            repo_relative(REUSE_DECISIONS_PATH),
            "package.json",
            "Makefile",
            repo_relative(VALIDATE_SPEC_PATH),
        ],
    }


def print_result(
    mode: str,
    findings: list[dict[str, str]],
    report: dict[str, Any],
    selftest_results: list[dict[str, Any]] | None = None,
) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-environment-ladder",
        "mode": mode,
        "status": "pass" if not findings else "fail",
        "failureCount": len(findings),
        "findings": findings,
        "rules": RULES,
        "policyPath": repo_relative(POLICY_PATH),
        "report": report,
    }
    if selftest_results is not None:
        payload["selftestResults"] = selftest_results
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not findings else 1


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv[1:])

    try:
        state = load_state()
    except (OSError, json.JSONDecodeError) as exc:
        payload = {
            "validator": "validate-environment-ladder",
            "mode": args.mode,
            "status": "fail",
            "failureCount": 1,
            "findings": [
                finding("USF-ENV-LADDER-001", repo_relative(POLICY_PATH), f"required input could not be loaded as strict JSON or text: {exc}")
            ],
            "rules": RULES,
            "policyPath": repo_relative(POLICY_PATH),
        }
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 1

    report = report_for_state(state)
    if args.mode == "selftest":
        results, failures = run_selftest()
        return print_result("selftest", failures, report, selftest_results=results)

    findings = validate_state(state)
    results, selftest_failures = run_selftest()
    findings.extend(selftest_failures)
    return print_result("all", findings, report, selftest_results=results)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
