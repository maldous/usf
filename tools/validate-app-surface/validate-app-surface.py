#!/usr/bin/env python3
"""Validate bounded app-surface validator tranche fixtures.

This validator implements the app-surface validator family requested for
USF-930, USF-933, USF-934, USF-935, USF-937, USF-940, and the USF-941
planted-defect suite boundary. It validates synthetic repository-owned
fixtures only; it does not create or inspect product UI/runtime code.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MATRIX = ROOT / "docs/architecture/app-surface-validator-planted-defect-matrix.json"
TRANCHE = ROOT / "docs/architecture/app-surface-validator-implementation-tranche.json"
CONFORMING = ROOT / "tools/validate-app-surface/fixtures/conforming"
PLANTED = ROOT / "tools/validate-app-surface/planted-defects"
PACKAGE = ROOT / "package.json"

TARGETS: dict[str, dict[str, Any]] = {
    "USF-APP-SURFACE-VALIDATOR-001": {
        "issueId": "USF-929",
        "plantedFixtureId": "unbacked-ui-behaviour",
        "conformingFixtureId": "semantic-backed-ui-behaviour",
        "required": [
            "behaviour.semanticAuthorityRefs",
            "behaviour.capabilityRef",
            "behaviour.permissionRefs",
            "behaviour.validationRefs",
            "behaviour.proofRefs",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-002": {
        "issueId": "USF-930",
        "plantedFixtureId": "route-without-capability-mapping",
        "conformingFixtureId": "route-with-capability-mapping",
        "required": [
            "mapping.capabilityRef",
            "mapping.permissionRefs",
            "mapping.tenantBoundaryRef",
            "mapping.proofRefs",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-003": {
        "issueId": "USF-931",
        "plantedFixtureId": "command-form-missing-validation-audit",
        "conformingFixtureId": "command-form-with-validation-audit",
        "required": [
            "command.commandRef",
            "command.validationModelRef",
            "command.auditEventRef",
            "command.errorModelRef",
            "command.permissionRefs",
            "command.idempotencyBoundaryRef",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-004": {
        "issueId": "USF-932",
        "plantedFixtureId": "query-missing-cache-privacy",
        "conformingFixtureId": "query-with-cache-privacy",
        "required": [
            "query.queryRef",
            "query.cacheFreshnessRef",
            "query.privacyClassificationRef",
            "query.tenantBoundaryRef",
            "query.errorModelRef",
            "query.proofRefs",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-005": {
        "issueId": "USF-933",
        "plantedFixtureId": "notification-without-consent-permission",
        "conformingFixtureId": "notification-with-consent-permission",
        "required": [
            "mapping.consentRef",
            "mapping.permissionRef",
            "mapping.channelLifecycleRef",
            "mapping.optOutBoundaryRef",
            "mapping.auditRef",
            "mapping.providerModeRef",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-006": {
        "issueId": "USF-934",
        "plantedFixtureId": "ad-placement-without-consent-privacy",
        "conformingFixtureId": "ad-placement-with-consent-privacy",
        "required": [
            "mapping.consentRef",
            "mapping.privacyClassificationRef",
            "mapping.ageRegionPolicyRef",
            "mapping.thirdPartySdkRefs",
            "mapping.storeDisclosureRef",
            "mapping.evidenceRefs",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-007": {
        "issueId": "USF-935",
        "plantedFixtureId": "store-metadata-mismatch",
        "conformingFixtureId": "store-metadata-matches-semantics",
        "required": [
            "metadata.semanticAuthorityRef",
            "metadata.versionAuthorityRef",
            "metadata.releaseEvidenceRef",
            "metadata.storeAssetRefs",
            "metadata.privacyInputRefs",
        ],
        "booleans": {"metadata.matchesCurrentSemantics": True},
    },
    "USF-APP-SURFACE-VALIDATOR-008": {
        "issueId": "USF-936",
        "plantedFixtureId": "privacy-disclosure-mismatch",
        "conformingFixtureId": "privacy-disclosure-matches-inventory",
        "required": [
            "privacy.dataInventoryRef",
            "privacy.consentRef",
            "privacy.capabilityRefs",
            "privacy.sdkVendorRefs",
            "privacy.disclosureRefs",
            "privacy.permissionDisclosureRefs",
        ],
        "booleans": {"privacy.matchesInventory": True},
    },
    "USF-APP-SURFACE-VALIDATOR-009": {
        "issueId": "USF-937",
        "plantedFixtureId": "missing-i18n-coverage",
        "conformingFixtureId": "i18n-coverage-complete",
        "required": [
            "localisation.localeNegotiationRef",
            "localisation.translationKeys",
            "localisation.icuFormatCoverageRef",
            "localisation.rtlCoverageRef",
            "localisation.fallbackPolicyRef",
            "localisation.localisedValidationOrConsentRefs",
            "localisation.coverageValidationRef",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-010": {
        "issueId": "USF-938",
        "plantedFixtureId": "missing-accessibility-semantics",
        "conformingFixtureId": "accessibility-semantics-complete",
        "required": [
            "accessibility.screenReaderRef",
            "accessibility.focusOrderRef",
            "accessibility.keyboardNavigationRef",
            "accessibility.touchTargetRef",
            "accessibility.dynamicTypeRef",
            "accessibility.contrastRef",
            "accessibility.reducedMotionRef",
            "accessibility.errorAnnouncementRef",
            "accessibility.proofRefs",
        ],
    },
    "USF-APP-SURFACE-VALIDATOR-011": {
        "issueId": "USF-939",
        "plantedFixtureId": "stale-generated-client",
        "conformingFixtureId": "generated-client-current",
        "required": [
            "generatedClient.semanticInputHashRef",
            "generatedClient.provenanceRef",
            "generatedClient.freshnessRef",
            "generatedClient.validatorEvidenceRef",
        ],
        "booleans": {"generatedClient.currentWithSemanticInputs": True},
    },
    "USF-APP-SURFACE-VALIDATOR-012": {
        "issueId": "USF-940",
        "plantedFixtureId": "deployment-evidence-wrong-commit",
        "conformingFixtureId": "deployment-evidence-current-commit",
        "required": [
            "deployment.targetCommitRef",
            "deployment.commitBinding",
            "deployment.artifactHashRef",
            "deployment.provenanceRefs",
            "deployment.freshnessRef",
            "deployment.semanticVersionAuthorityRef",
        ],
    },
}

COMMON_NONCLAIMS = {
    "appImplementationReady": False,
    "productUiReady": False,
    "storeReadiness": False,
    "deploymentReadiness": False,
    "stagingReadiness": False,
    "productionReadiness": False,
    "liveProviderReadiness": False,
    "privacyCompliance": False,
    "advertisingCompliance": False,
    "monetisationReadiness": False,
    "humanAcceptance": False,
}


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def finding(rule_id: str, subject: str, message: str, issue_id: str | None = None) -> dict[str, str]:
    payload = {"severity": "blocking", "ruleId": rule_id, "subject": subject, "message": message}
    if issue_id:
        payload["issueId"] = issue_id
    return payload


def value_at(record: dict[str, Any], dotted: str) -> Any:
    value: Any = record
    for part in dotted.split("."):
        if not isinstance(value, dict) or part not in value:
            return None
        value = value[part]
    return value


def is_nonempty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return bool(value)
    if isinstance(value, dict):
        return bool(value)
    return True


def current_head() -> str:
    completed = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    return completed.stdout.strip() if completed.returncode == 0 else ""


def validate_common(record: dict[str, Any], rule_id: str, subject: str) -> list[dict[str, str]]:
    rule = TARGETS[rule_id]
    failures: list[dict[str, str]] = []
    for field in ["fixtureId", "targetRuleId", "ownerIssueId", "authorityRefs", "nonClaimRefs", "nonClaims"]:
        if not is_nonempty(record.get(field)):
            failures.append(finding(rule_id, subject, f"fixture missing {field}", rule["issueId"]))
    if record.get("targetRuleId") != rule_id:
        failures.append(finding(rule_id, subject, "fixture targetRuleId does not match rule", rule["issueId"]))
    if record.get("ownerIssueId") != rule["issueId"]:
        failures.append(finding(rule_id, subject, "fixture ownerIssueId does not match issue", rule["issueId"]))
    for path in record.get("authorityRefs", []):
        if isinstance(path, str) and path.startswith(("docs/", "spec/", "tools/", "evidence/")) and not (ROOT / path).exists():
            failures.append(finding(rule_id, subject, f"authority ref does not exist: {path}", rule["issueId"]))
    nonclaims = record.get("nonClaims", {})
    if not isinstance(nonclaims, dict):
        failures.append(finding(rule_id, subject, "nonClaims must be an object", rule["issueId"]))
    else:
        for key, expected in COMMON_NONCLAIMS.items():
            if nonclaims.get(key) is not expected:
                failures.append(finding(rule_id, subject, f"nonClaims.{key} must be {expected}", rule["issueId"]))
    return failures


def validate_fixture(record: dict[str, Any], rule_id: str) -> list[dict[str, str]]:
    subject = str(record.get("fixtureId", "fixture"))
    rule = TARGETS[rule_id]
    failures = validate_common(record, rule_id, subject)
    for field in rule.get("required", []):
        if not is_nonempty(value_at(record, field)):
            failures.append(finding(rule_id, subject, f"missing required mapping {field}", rule["issueId"]))
    for field, expected in rule.get("booleans", {}).items():
        if value_at(record, field) is not expected:
            failures.append(finding(rule_id, subject, f"{field} must be {expected}", rule["issueId"]))
    if rule_id == "USF-APP-SURFACE-VALIDATOR-012":
        deployment = record.get("deployment", {})
        target = deployment.get("targetCommitRef")
        binding = deployment.get("commitBinding")
        if binding == "current-git-head":
            if target != "__CURRENT_GIT_HEAD__":
                failures.append(finding(rule_id, subject, "current-git-head binding must use dynamic commit token", rule["issueId"]))
        elif target != current_head():
            failures.append(finding(rule_id, subject, "deployment evidence is not pinned to the governed current commit", rule["issueId"]))
    return failures


def validate_matrix() -> list[dict[str, str]]:
    data = load_json(MATRIX)
    requirements = {item.get("ruleId"): item for item in data.get("validatorRequirements", []) if isinstance(item, dict)}
    failures: list[dict[str, str]] = []
    for rule_id, expected in TARGETS.items():
        item = requirements.get(rule_id)
        if not item:
            failures.append(finding("USF-APP-SURFACE-SUITE-001", rel(MATRIX), f"matrix missing {rule_id}", expected["issueId"]))
            continue
        if item.get("issueId") != expected["issueId"]:
            failures.append(finding("USF-APP-SURFACE-SUITE-001", rel(MATRIX), f"{rule_id} issue mismatch", expected["issueId"]))
        if item.get("plantedDefect", {}).get("fixtureId") != expected["plantedFixtureId"]:
            failures.append(finding("USF-APP-SURFACE-SUITE-001", rel(MATRIX), f"{rule_id} planted fixture mismatch", expected["issueId"]))
        if item.get("conformingFixture", {}).get("fixtureId") != expected["conformingFixtureId"]:
            failures.append(finding("USF-APP-SURFACE-SUITE-001", rel(MATRIX), f"{rule_id} conforming fixture mismatch", expected["issueId"]))
    return failures


def validate_tranche() -> list[dict[str, str]]:
    data = load_json(TRANCHE)
    failures: list[dict[str, str]] = []
    expected_issues = {rule["issueId"] for rule in TARGETS.values()} | {"USF-941"}
    implemented = set(data.get("implementedIssueIds", []))
    missing = sorted(expected_issues - implemented)
    if missing:
        failures.append(finding("USF-APP-SURFACE-SUITE-002", rel(TRANCHE), f"implementation tranche missing issue ids: {', '.join(missing)}", "USF-941"))
    if data.get("implementationBoundary", {}).get("appImplementationCreated") is not False:
        failures.append(finding("USF-APP-SURFACE-SUITE-002", rel(TRANCHE), "tranche must not claim app implementation", "USF-941"))
    if data.get("implementationBoundary", {}).get("validatorImplemented") is not True:
        failures.append(finding("USF-APP-SURFACE-SUITE-002", rel(TRANCHE), "tranche must record validator implementation", "USF-941"))
    commands = set(data.get("validationCommands", []))
    required_commands = {
        "python3 tools/validate-app-surface/validate-app-surface.py all --json",
        "python3 tools/validate-app-surface/validate-app-surface.py selftest --json",
    }
    if not required_commands.issubset(commands):
        failures.append(finding("USF-APP-SURFACE-SUITE-002", rel(TRANCHE), "tranche missing app-surface validation commands", "USF-941"))
    return failures


def validate_package_scripts() -> list[dict[str, str]]:
    data = load_json(PACKAGE)
    scripts = data.get("scripts", {}) if isinstance(data, dict) else {}
    failures: list[dict[str, str]] = []
    expected = {
        "app-surface:validate": "python3 tools/validate-app-surface/validate-app-surface.py all --json",
        "app-surface:selftest": "python3 tools/validate-app-surface/validate-app-surface.py selftest --json",
    }
    for name, command in expected.items():
        if scripts.get(name) != command:
            failures.append(finding("USF-APP-SURFACE-SUITE-003", rel(PACKAGE), f"missing package script {name}", "USF-941"))
    if command := scripts.get("repo:validate"):
        if expected["app-surface:validate"] not in command:
            failures.append(finding("USF-APP-SURFACE-SUITE-003", rel(PACKAGE), "repo:validate must include app-surface validator", "USF-941"))
    else:
        failures.append(finding("USF-APP-SURFACE-SUITE-003", rel(PACKAGE), "repo:validate script is missing", "USF-941"))
    return failures


def load_fixture_dir(path: Path) -> list[dict[str, Any]]:
    values = []
    for item in sorted(path.glob("*.json")):
        record = load_json(item)
        if isinstance(record, dict):
            record["_path"] = rel(item)
            values.append(record)
    return values


def validate_all() -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    failures.extend(validate_matrix())
    failures.extend(validate_tranche())
    failures.extend(validate_package_scripts())
    conforming = load_fixture_dir(CONFORMING)
    by_rule: dict[str, list[dict[str, Any]]] = {rule_id: [] for rule_id in TARGETS}
    for record in conforming:
        by_rule.setdefault(str(record.get("targetRuleId")), []).append(record)
    for rule_id, rule in TARGETS.items():
        records = [record for record in by_rule.get(rule_id, []) if record.get("fixtureId") == rule["conformingFixtureId"]]
        if len(records) != 1:
            failures.append(finding("USF-APP-SURFACE-SUITE-004", rel(CONFORMING), f"{rule_id} needs exactly one conforming fixture", rule["issueId"]))
            continue
        failures.extend(validate_fixture(records[0], rule_id))
    return failures


def validate_selftest() -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    planted = load_fixture_dir(PLANTED)
    by_rule: dict[str, list[dict[str, Any]]] = {rule_id: [] for rule_id in TARGETS}
    for record in planted:
        by_rule.setdefault(str(record.get("targetRuleId")), []).append(record)
    for rule_id, rule in TARGETS.items():
        records = [record for record in by_rule.get(rule_id, []) if record.get("fixtureId") == rule["plantedFixtureId"]]
        if len(records) != 1:
            failures.append(finding("USF-APP-SURFACE-SUITE-005", rel(PLANTED), f"{rule_id} needs exactly one planted defect", rule["issueId"]))
            continue
        record = records[0]
        expected = record.get("expectedFailureRuleId")
        if expected != rule_id:
            failures.append(finding("USF-APP-SURFACE-SUITE-005", str(record.get("fixtureId")), "planted defect expectedFailureRuleId mismatch", rule["issueId"]))
        observed = validate_fixture(record, rule_id)
        if not any(item.get("ruleId") == rule_id for item in observed):
            failures.append(finding("USF-APP-SURFACE-SUITE-005", str(record.get("fixtureId")), "planted defect did not fail with expected rule", rule["issueId"]))
    all_failures = validate_all()
    if all_failures:
        failures.append(finding("USF-APP-SURFACE-SUITE-005", "conforming-fixtures", "conforming fixture validation is not clean", "USF-941"))
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    findings = validate_selftest() if args.mode == "selftest" else validate_all()
    payload = {"mode": args.mode, "findings": findings}
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for item in findings:
            print(f"{item['ruleId']} {item['subject']}: {item['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
