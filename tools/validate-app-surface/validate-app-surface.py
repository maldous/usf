#!/usr/bin/env python3
"""Validate bounded app-surface validator tranche fixtures and guards.

This validator implements the app-surface validator family requested for
USF-929 through USF-941, the USF-1011 realisation boundary, and bounded
implementation guards added by later app-surface issues. It validates
repository-owned fixtures and machine-readable implementation artefacts; it
does not infer product behaviour from framework files.
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
MAKEFILE = ROOT / "Makefile"
ROUTE_CAPABILITY_IMPLEMENTATION = ROOT / "docs/architecture/app-surface-route-capability-implementation.json"
WEB_SCAFFOLD = ROOT / "docs/architecture/app-surface-web-bounded-local-scaffold.json"
MOBILE_SCAFFOLD = ROOT / "docs/architecture/app-surface-mobile-bounded-local-scaffold.json"
LOCAL_IN_MEMORY_RUNTIME = ROOT / "docs/architecture/app-surface-local-in-memory-runtime.json"
SHARED_CLIENT_CONSUMPTION_PATH = ROOT / "docs/architecture/app-surface-shared-client-consumption-path.json"
COMMAND_FORM_IMPLEMENTATION = ROOT / "docs/architecture/app-surface-command-form-implementation.json"
QUERY_LIST_DETAIL_IMPLEMENTATION = ROOT / "docs/architecture/app-surface-query-list-detail-implementation.json"
USF931_CONFORMING = ROOT / "tools/validate-app-surface/fixtures/conforming/003-command-form-with-validation-audit.json"
USF931_PLANTED = ROOT / "tools/validate-app-surface/planted-defects/003-command-form-missing-validation-audit.json"
USF932_CONFORMING = ROOT / "tools/validate-app-surface/fixtures/conforming/004-query-with-cache-privacy.json"
USF932_PLANTED = ROOT / "tools/validate-app-surface/planted-defects/004-query-missing-cache-privacy.json"
USF930_CONFORMING = ROOT / "tools/validate-app-surface/fixtures/conforming/002-route-with-capability-mapping.json"
USF930_PLANTED = ROOT / "tools/validate-app-surface/planted-defects/002-route-without-capability-mapping.json"

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

REQUIRED_REALISATION_CRITERIA = {
    "semantic-artifacts-are-authority-not-linear-done-issues",
    "validator-logic-covers-required-suite",
    "selftests-exercise-success-and-failure",
    "planted-defect-fixtures-fail-closed",
    "conforming-fixtures-pass",
    "output-shape-covers-pass-fail-and-planted-defect",
    "package-scripts-direct-execution",
    "make-or-repo-validation-wiring",
    "repo-validation-before-app-surface-implementation-work",
    "environment-ladder-preserved",
    "non-claims-preserved",
    "validation-evidence-recorded-before-done",
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
    if data.get("realisationIssueId") != "USF-1011":
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), "tranche missing USF-1011 realisation issue trace", "USF-1011"))
    tracking = data.get("trackingBoundary", {})
    if tracking.get("linearDefinesSemanticAuthority") is not False:
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), "Linear must not define semantic authority", "USF-1011"))
    if tracking.get("oldDoneIssuesUsedAsImplementationEvidence") is not False:
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), "old Done Linear issues must not be implementation evidence", "USF-1011"))
    criteria = {
        str(item.get("id")): item
        for item in data.get("acceptanceCriteriaTrace", [])
        if isinstance(item, dict)
    }
    missing_criteria = sorted(REQUIRED_REALISATION_CRITERIA - set(criteria))
    if missing_criteria:
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), f"tranche missing USF-1011 criteria trace: {', '.join(missing_criteria)}", "USF-1011"))
    for criterion_id in REQUIRED_REALISATION_CRITERIA & set(criteria):
        if criteria[criterion_id].get("status") != "satisfied":
            failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), f"{criterion_id} must be satisfied", "USF-1011"))
    output_shape = data.get("validatorOutputShape", {})
    for key in ["mode", "status", "summary", "findings"]:
        if key not in output_shape.get("requiredTopLevelKeys", []):
            failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), f"validator output shape missing {key}", "USF-1011"))
    statuses = set(output_shape.get("statusValues", []))
    if not {"pass", "fail"}.issubset(statuses):
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), "validator output shape must define pass and fail statuses", "USF-1011"))
    if output_shape.get("plantedDefectSummaryKey") != "plantedDefectFixtureCount":
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), "validator output shape must expose planted-defect summary", "USF-1011"))
    ladder = data.get("environmentLadderPreservation", {})
    expected_ladder = {
        "devLocalFirst": True,
        "testContractBoundaryOnly": True,
        "composeOnlyProviderSemantics": True,
        "stagingOnlyPublicAcceptance": True,
        "environmentDoesNotUpgradeProviderMode": True,
        "providerModeDoesNotUpgradeEnvironment": True,
    }
    for key, expected in expected_ladder.items():
        if ladder.get(key) is not expected:
            failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), f"environment ladder field {key} must be {expected}", "USF-1011"))
    repo_wiring = data.get("repoValidationIntegration", {})
    if repo_wiring.get("repoValidateIncludesAppSurfaceSuite") is not True:
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), "repo validation integration must include app-surface suite", "USF-1011"))
    if repo_wiring.get("beforeUiExpoNextStagingDeploymentStoreProviderProductionWork") is not True:
        failures.append(finding("USF-APP-SURFACE-SUITE-006", rel(TRANCHE), "repo validation integration must gate later app-surface work", "USF-1011"))
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


def validate_makefile_wiring() -> list[dict[str, str]]:
    text = MAKEFILE.read_text(encoding="utf-8")
    failures: list[dict[str, str]] = []
    expected = {
        "app-surface-validate:": "corepack pnpm app-surface:validate",
        "app-surface-selftest:": "corepack pnpm app-surface:selftest",
        "validate-evidence:": "corepack pnpm repo:validate",
    }
    for target, command in expected.items():
        if target not in text or command not in text:
            failures.append(finding("USF-APP-SURFACE-SUITE-007", rel(MAKEFILE), f"missing Makefile wiring for {target.rstrip(':')}", "USF-1011"))
    phony_line = next((line for line in text.splitlines() if line.startswith(".PHONY:")), "")
    phony_block = text[text.find(".PHONY:"):text.find("help:")] if ".PHONY:" in text and "help:" in text else phony_line
    for target in ["app-surface-validate", "app-surface-selftest"]:
        if target not in phony_block:
            failures.append(finding("USF-APP-SURFACE-SUITE-007", rel(MAKEFILE), f"{target} must be phony", "USF-1011"))
    return failures


def path_exists(path: str) -> bool:
    return (ROOT / path).exists()


def has_nonempty_string_array(value: Any) -> bool:
    return isinstance(value, list) and bool(value) and all(isinstance(item, str) and item.strip() for item in value)


def validate_false_nonclaims(record: dict[str, Any], subject: str, rule_id: str, issue_id: str) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    nonclaims = record.get("nonClaims", {})
    if not isinstance(nonclaims, dict) or not nonclaims:
        return [finding(rule_id, subject, "nonClaims must be a non-empty object", issue_id)]
    for key, value in nonclaims.items():
        if value is not False:
            failures.append(finding(rule_id, f"{subject}.nonClaims.{key}", "non-claim must be false", issue_id))
    return failures


def expected_route_capability_targets() -> dict[str, dict[str, Any]]:
    expected: dict[str, dict[str, Any]] = {}
    if WEB_SCAFFOLD.exists():
        web = load_json(WEB_SCAFFOLD)
        registry = web.get("routeRegistry", {}) if isinstance(web, dict) else {}
        routes = registry.get("routes", []) if isinstance(registry, dict) else []
        for route in routes:
            if not isinstance(route, dict) or not isinstance(route.get("routeId"), str):
                continue
            expected[route["routeId"]] = {
                "surface": "web-route",
                "framework": "nextjs",
                "registryArtifactId": registry.get("artifactId"),
                "implementationPath": registry.get("implementationPath"),
                "authorityArtifactPath": rel(WEB_SCAFFOLD),
                "path": route.get("path"),
                "frameworkSegment": route.get("nextRouteSegment"),
                "capabilityId": route.get("capabilityId"),
                "permissionRefs": route.get("permissionRefs"),
                "tenantBoundaryRef": route.get("tenantBoundaryRef"),
                "privacyCategoryRefs": route.get("privacyCategoryRefs"),
                "validationRefs": route.get("validationRefs"),
                "errorRefs": route.get("errorRefs"),
                "auditEventRefs": route.get("auditEventRefs"),
                "componentFixtureRefs": route.get("componentFixtureRefs"),
                "semanticSourceRefs": route.get("semanticSourceRefs"),
                "unknownTargetPolicy": registry.get("unknownRoutePolicy"),
                "nonClaimBoundary": route.get("nonClaimBoundary"),
            }
    if MOBILE_SCAFFOLD.exists():
        mobile = load_json(MOBILE_SCAFFOLD)
        registry = mobile.get("screenRegistry", {}) if isinstance(mobile, dict) else {}
        screens = registry.get("screens", []) if isinstance(registry, dict) else []
        for screen in screens:
            if not isinstance(screen, dict) or not isinstance(screen.get("screenId"), str):
                continue
            expected[screen["screenId"]] = {
                "surface": "mobile-screen",
                "framework": "expo",
                "registryArtifactId": registry.get("artifactId"),
                "implementationPath": registry.get("implementationPath"),
                "authorityArtifactPath": rel(MOBILE_SCAFFOLD),
                "routePath": screen.get("routePath"),
                "frameworkSegment": screen.get("screenName"),
                "capabilityId": screen.get("capabilityId"),
                "permissionRefs": screen.get("permissionRefs"),
                "tenantBoundaryRef": screen.get("tenantBoundaryRef"),
                "privacyCategoryRefs": screen.get("privacyCategoryRefs"),
                "validationRefs": screen.get("validationRefs"),
                "errorRefs": screen.get("errorRefs"),
                "auditEventRefs": screen.get("auditEventRefs"),
                "componentFixtureRefs": screen.get("componentFixtureRefs"),
                "semanticSourceRefs": screen.get("semanticSourceRefs"),
                "unknownTargetPolicy": registry.get("unknownScreenPolicy"),
                "nonClaimBoundary": screen.get("nonClaimBoundary"),
            }
    return expected


def validate_route_capability_implementation() -> list[dict[str, str]]:
    rule_id = "USF-APP-SURFACE-IMPLEMENTATION-001"
    issue_id = "USF-1020"
    subject = rel(ROUTE_CAPABILITY_IMPLEMENTATION)
    failures: list[dict[str, str]] = []
    if not ROUTE_CAPABILITY_IMPLEMENTATION.exists():
        return [finding(rule_id, subject, "route capability implementation artefact is missing", issue_id)]
    data = load_json(ROUTE_CAPABILITY_IMPLEMENTATION)
    if not isinstance(data, dict):
        return [finding(rule_id, subject, "route capability implementation artefact must be an object", issue_id)]
    if data.get("ownerIssueId") != issue_id:
        failures.append(finding(rule_id, subject, "artefact ownerIssueId must be USF-1020", issue_id))
    if data.get("lifecycleState") != "bounded-local-implemented":
        failures.append(finding(rule_id, subject, "artefact lifecycleState must be bounded-local-implemented", issue_id))
    for path in data.get("authorityInputs", []):
        if not isinstance(path, str) or not path_exists(path):
            failures.append(finding(rule_id, subject, f"authority input does not exist: {path}", issue_id))
    guard = data.get("validationGuard", {})
    required_guard_flags = [
        "existingAuthorityPathsMustExist",
        "implementedTargetsMustMatchScaffoldArtefacts",
        "everyTargetMustHaveCapabilityOwnership",
        "everyTargetMustHavePermissionRefs",
        "everyTargetMustHaveTenantBoundaryRef",
        "everyTargetMustHaveProofRefs",
        "unknownTargetsMustFailClosed",
        "usf930StyleFixtureMustRemainPresent",
        "nonClaimsMustAllBeFalse",
        "outOfScopeSurfacesRemainOwnedByLaterIssues",
    ]
    if not isinstance(guard, dict):
        failures.append(finding(rule_id, subject, "validationGuard must be an object", issue_id))
    else:
        for flag in required_guard_flags:
            if guard.get(flag) is not True:
                failures.append(finding(rule_id, f"{subject}.validationGuard.{flag}", "validation guard flag must be true", issue_id))
    expected = expected_route_capability_targets()
    targets = data.get("implementedTargets", [])
    if not isinstance(targets, list) or not targets:
        failures.append(finding(rule_id, subject, "implementedTargets must be a non-empty array", issue_id))
        targets = []
    actual_by_id = {
        target.get("targetId"): target
        for target in targets
        if isinstance(target, dict) and isinstance(target.get("targetId"), str)
    }
    if set(actual_by_id) != set(expected):
        failures.append(finding(rule_id, subject, "implemented target ids must match web and mobile scaffold registries", issue_id))
    comparable_fields = [
        "surface",
        "framework",
        "registryArtifactId",
        "implementationPath",
        "authorityArtifactPath",
        "path",
        "routePath",
        "frameworkSegment",
        "capabilityId",
        "permissionRefs",
        "tenantBoundaryRef",
        "privacyCategoryRefs",
        "validationRefs",
        "errorRefs",
        "auditEventRefs",
        "componentFixtureRefs",
        "semanticSourceRefs",
        "unknownTargetPolicy",
        "nonClaimBoundary",
    ]
    for target_id, target in actual_by_id.items():
        target_subject = f"{subject}.implementedTargets.{target_id}"
        expected_target = expected.get(target_id, {})
        for path_field in ["implementationPath", "authorityArtifactPath"]:
            path_value = target.get(path_field)
            if not isinstance(path_value, str) or not path_exists(path_value):
                failures.append(finding(rule_id, target_subject, f"{path_field} does not exist", issue_id))
        if not isinstance(target.get("capabilityId"), str) or not target["capabilityId"].strip():
            failures.append(finding(rule_id, target_subject, "target must have capability ownership", issue_id))
        if not has_nonempty_string_array(target.get("permissionRefs")):
            failures.append(finding(rule_id, target_subject, "target must have permissionRefs", issue_id))
        if not isinstance(target.get("tenantBoundaryRef"), str) or not target["tenantBoundaryRef"].strip():
            failures.append(finding(rule_id, target_subject, "target must have tenantBoundaryRef", issue_id))
        if not has_nonempty_string_array(target.get("proofRefs")):
            failures.append(finding(rule_id, target_subject, "target must have proofRefs", issue_id))
        for proof_ref in target.get("proofRefs", []) if isinstance(target.get("proofRefs"), list) else []:
            if not isinstance(proof_ref, str) or not path_exists(proof_ref):
                failures.append(finding(rule_id, target_subject, f"proofRef does not exist: {proof_ref}", issue_id))
        if target.get("unknownTargetPolicy") != "fail-closed":
            failures.append(finding(rule_id, target_subject, "unknownTargetPolicy must be fail-closed", issue_id))
        for field in comparable_fields:
            if field in expected_target and target.get(field) != expected_target[field]:
                failures.append(finding(rule_id, target_subject, f"{field} must match scaffold registry authority", issue_id))
    out_of_scope = data.get("outOfScopeSurfaces", [])
    required_out_of_scope = {
        "command-form": "USF-1021",
        "query-list-detail": "USF-1022",
        "state-cache-query-client": "USF-1023",
        "auth-session-dev-identity": "USF-1024",
    }
    observed_out_of_scope = {
        item.get("surface"): item
        for item in out_of_scope
        if isinstance(item, dict)
    } if isinstance(out_of_scope, list) else {}
    for surface, owner in required_out_of_scope.items():
        item = observed_out_of_scope.get(surface)
        if not item or item.get("ownerIssueId") != owner or item.get("status") != "owned-by-later-issue":
            failures.append(finding(rule_id, subject, f"{surface} must remain owned by {owner}", issue_id))
    failures.extend(validate_false_nonclaims(data, subject, rule_id, issue_id))
    if USF930_CONFORMING.exists() and USF930_PLANTED.exists():
        conforming = load_json(USF930_CONFORMING)
        planted = load_json(USF930_PLANTED)
        if not isinstance(conforming, dict) or conforming.get("targetRuleId") != "USF-APP-SURFACE-VALIDATOR-002":
            failures.append(finding(rule_id, rel(USF930_CONFORMING), "USF-930 conforming fixture must remain wired", issue_id))
        if not isinstance(planted, dict) or planted.get("expectedFailureRuleId") != "USF-APP-SURFACE-VALIDATOR-002":
            failures.append(finding(rule_id, rel(USF930_PLANTED), "USF-930 planted fixture must remain wired", issue_id))
    else:
        failures.append(finding(rule_id, subject, "USF-930 route capability fixtures must exist", issue_id))
    return failures


def ids_from_semantic_inputs(runtime: dict[str, Any], collection: str) -> set[str]:
    semantic_inputs = runtime.get("semanticInputs", {})
    values = semantic_inputs.get(collection, []) if isinstance(semantic_inputs, dict) else []
    return {
        str(item.get("id"))
        for item in values
        if isinstance(item, dict) and isinstance(item.get("id"), str) and item["id"].strip()
    }


def extend_authority_from_mapping(authority: dict[str, set[str]], mapping: dict[str, Any]) -> None:
    if isinstance(mapping.get("commandOrQueryOrWorkflowOrEventId"), str):
        authority["commandRefs"].add(mapping["commandOrQueryOrWorkflowOrEventId"])
    if isinstance(mapping.get("capabilityId"), str):
        authority["capabilityIds"].add(mapping["capabilityId"])
    for source_field, authority_key in [
        ("permissionRefs", "permissionRefs"),
        ("validationRefs", "validationRefs"),
        ("errorRefs", "errorRefs"),
        ("auditEventRefs", "auditEventRefs"),
    ]:
        values = mapping.get(source_field, [])
        if isinstance(values, list):
            authority[authority_key].update(item for item in values if isinstance(item, str) and item.strip())


def path_ref_exists(path_ref: Any) -> bool:
    if not isinstance(path_ref, str) or not path_ref.strip():
        return False
    path = path_ref.split("#", 1)[0]
    if path.startswith(("docs/", "spec/", "tools/", "tests/", "apps/", "packages/", "evidence/")):
        return path_exists(path)
    return True


def validate_command_form_implementation() -> list[dict[str, str]]:
    rule_id = "USF-APP-SURFACE-IMPLEMENTATION-002"
    issue_id = "USF-1021"
    subject = rel(COMMAND_FORM_IMPLEMENTATION)
    failures: list[dict[str, str]] = []
    if not COMMAND_FORM_IMPLEMENTATION.exists():
        return [finding(rule_id, subject, "command form implementation artefact is missing", issue_id)]
    data = load_json(COMMAND_FORM_IMPLEMENTATION)
    if not isinstance(data, dict):
        return [finding(rule_id, subject, "command form implementation artefact must be an object", issue_id)]
    if data.get("ownerIssueId") != issue_id:
        failures.append(finding(rule_id, subject, "artefact ownerIssueId must be USF-1021", issue_id))
    if data.get("lifecycleState") != "bounded-local-implemented":
        failures.append(finding(rule_id, subject, "artefact lifecycleState must be bounded-local-implemented", issue_id))
    for path in data.get("authorityInputs", []):
        if not isinstance(path, str) or not path_exists(path):
            failures.append(finding(rule_id, subject, f"authority input does not exist: {path}", issue_id))
    guard = data.get("validationGuard", {})
    required_guard_flags = [
        "existingAuthorityPathsMustExist",
        "commandsMustMapToSemanticCommandAuthority",
        "validationPermissionErrorAuditMappingsMustExist",
        "idempotencyBoundaryMustExist",
        "tenantBoundaryMustExist",
        "uiOnlyBusinessRulesMustBeRejected",
        "unknownCommandFormsMustFailClosed",
        "usf931StyleFixtureMustRemainPresent",
        "nonClaimsMustAllBeFalse",
        "externalSubmissionMustRemainForbidden",
        "serverMutationProviderMustRemainForbidden",
    ]
    if not isinstance(guard, dict):
        failures.append(finding(rule_id, subject, "validationGuard must be an object", issue_id))
    else:
        for flag in required_guard_flags:
            if guard.get(flag) is not True:
                failures.append(finding(rule_id, f"{subject}.validationGuard.{flag}", "validation guard flag must be true", issue_id))

    runtime = load_json(LOCAL_IN_MEMORY_RUNTIME) if LOCAL_IN_MEMORY_RUNTIME.exists() else {}
    shared_client = load_json(SHARED_CLIENT_CONSUMPTION_PATH) if SHARED_CLIENT_CONSUMPTION_PATH.exists() else {}
    if not isinstance(runtime, dict):
        runtime = {}
    if not isinstance(shared_client, dict):
        shared_client = {}
    authority: dict[str, set[str]] = {
        "commandRefs": ids_from_semantic_inputs(runtime, "commands"),
        "capabilityIds": ids_from_semantic_inputs(runtime, "capabilities"),
        "permissionRefs": ids_from_semantic_inputs(runtime, "permissions"),
        "tenantBoundaryRefs": ids_from_semantic_inputs(runtime, "tenantContexts"),
        "validationRefs": ids_from_semantic_inputs(runtime, "validationRules"),
        "errorRefs": ids_from_semantic_inputs(runtime, "errorRefs"),
        "auditEventRefs": ids_from_semantic_inputs(runtime, "auditEvents"),
    }
    shared_mappings = [
        item
        for item in shared_client.get("mappings", [])
        if isinstance(item, dict) and item.get("behaviourClass") == "commands"
    ]
    for mapping in shared_mappings:
        extend_authority_from_mapping(authority, mapping)
    shared_by_command = {
        mapping.get("commandOrQueryOrWorkflowOrEventId"): mapping
        for mapping in shared_mappings
        if isinstance(mapping.get("commandOrQueryOrWorkflowOrEventId"), str)
    }
    component_fixtures = runtime.get("componentFixtures", []) if isinstance(runtime.get("componentFixtures", []), list) else []
    fixtures_by_id = {
        fixture.get("fixtureId"): fixture
        for fixture in component_fixtures
        if isinstance(fixture, dict) and isinstance(fixture.get("fixtureId"), str)
    }
    conforming = load_json(USF931_CONFORMING) if USF931_CONFORMING.exists() else {}
    planted = load_json(USF931_PLANTED) if USF931_PLANTED.exists() else {}
    conforming_command = conforming.get("command", {}) if isinstance(conforming, dict) else {}
    idempotency_refs = (
        {conforming_command.get("idempotencyBoundaryRef")}
        if isinstance(conforming_command, dict) and isinstance(conforming_command.get("idempotencyBoundaryRef"), str)
        else set()
    )
    required_string_fields = [
        "formId",
        "componentFixtureRef",
        "commandRef",
        "capabilityId",
        "tenantBoundaryRef",
        "idempotencyBoundaryRef",
        "nonClaimBoundary",
    ]
    required_array_fields = [
        "permissionRefs",
        "validationRefs",
        "errorRefs",
        "auditEventRefs",
        "semanticSourceRefs",
        "proofRefs",
        "rejectedUiOnlyBusinessRuleInputs",
    ]
    commands = data.get("implementedCommands", [])
    if not isinstance(commands, list) or not commands:
        failures.append(finding(rule_id, subject, "implementedCommands must be a non-empty array", issue_id))
        commands = []
    for index, command in enumerate(commands):
        if not isinstance(command, dict):
            failures.append(finding(rule_id, f"{subject}.implementedCommands.{index}", "implemented command must be an object", issue_id))
            continue
        form_id = command.get("formId") if isinstance(command.get("formId"), str) and command["formId"].strip() else f"implementedCommands.{index}"
        command_subject = f"{subject}.implementedCommands.{form_id}"
        for field in required_string_fields:
            if not isinstance(command.get(field), str) or not command[field].strip():
                failures.append(finding(rule_id, command_subject, f"missing {field}", issue_id))
        for field in required_array_fields:
            if not has_nonempty_string_array(command.get(field)):
                failures.append(finding(rule_id, command_subject, f"missing {field}", issue_id))
        for field in ["semanticSourceRefs", "proofRefs"]:
            values = command.get(field, [])
            if isinstance(values, list):
                for path_ref in values:
                    if not path_ref_exists(path_ref):
                        failures.append(finding(rule_id, command_subject, f"{field} path does not exist: {path_ref}", issue_id))
        if command.get("uiOnlyBusinessRulesAllowed") is not False:
            failures.append(finding(rule_id, command_subject, "uiOnlyBusinessRulesAllowed must be false", issue_id))
        for field, authority_key in [
            ("commandRef", "commandRefs"),
            ("capabilityId", "capabilityIds"),
            ("tenantBoundaryRef", "tenantBoundaryRefs"),
        ]:
            value = command.get(field)
            if not isinstance(value, str) or value not in authority[authority_key]:
                failures.append(finding(rule_id, command_subject, f"{field} lacks repository authority", issue_id))
        for field, authority_key in [
            ("permissionRefs", "permissionRefs"),
            ("validationRefs", "validationRefs"),
            ("errorRefs", "errorRefs"),
            ("auditEventRefs", "auditEventRefs"),
        ]:
            values = command.get(field, [])
            if isinstance(values, list):
                for value in values:
                    if not isinstance(value, str) or value not in authority[authority_key]:
                        failures.append(finding(rule_id, command_subject, f"{field} lacks repository authority: {value}", issue_id))
        if command.get("idempotencyBoundaryRef") not in idempotency_refs:
            failures.append(finding(rule_id, command_subject, "idempotencyBoundaryRef must map to USF-931-style fixture authority", issue_id))
        fixture = fixtures_by_id.get(command.get("componentFixtureRef"))
        if not isinstance(fixture, dict):
            failures.append(finding(rule_id, command_subject, "componentFixtureRef must map to local runtime fixture authority", issue_id))
        else:
            fixture_commands = fixture.get("commandRefs", [])
            if command.get("commandRef") not in fixture_commands:
                failures.append(finding(rule_id, command_subject, "component fixture must reference the commandRef", issue_id))
        shared_mapping = shared_by_command.get(command.get("commandRef"))
        if not isinstance(shared_mapping, dict):
            failures.append(finding(rule_id, command_subject, "commandRef must map to shared-client command authority", issue_id))
        else:
            for field in ["capabilityId", "permissionRefs", "validationRefs", "errorRefs", "auditEventRefs"]:
                if command.get(field) != shared_mapping.get(field):
                    failures.append(finding(rule_id, command_subject, f"{field} must match shared-client command authority", issue_id))
    out_of_scope = data.get("outOfScopeSurfaces", [])
    observed_out_of_scope = {
        item.get("surface"): item
        for item in out_of_scope
        if isinstance(item, dict)
    } if isinstance(out_of_scope, list) else {}
    required_out_of_scope = {
        "server-mutation-provider": {"status": "not-authorised"},
        "external-form-submission": {"status": "not-authorised"},
        "production-command-execution": {"status": "not-authorised"},
        "query-list-detail": {"ownerIssueId": "USF-1022", "status": "owned-by-later-issue"},
        "state-cache-query-client": {"ownerIssueId": "USF-1023", "status": "owned-by-later-issue"},
    }
    for surface, expected in required_out_of_scope.items():
        item = observed_out_of_scope.get(surface)
        if not isinstance(item, dict) or any(item.get(key) != value for key, value in expected.items()):
            failures.append(finding(rule_id, subject, f"{surface} out-of-scope boundary is missing or incorrect", issue_id))
    failures.extend(validate_false_nonclaims(data, subject, rule_id, issue_id))
    if not isinstance(conforming, dict) or conforming.get("targetRuleId") != "USF-APP-SURFACE-VALIDATOR-003":
        failures.append(finding(rule_id, rel(USF931_CONFORMING), "USF-931 conforming fixture must remain wired", issue_id))
    if not isinstance(planted, dict) or planted.get("expectedFailureRuleId") != "USF-APP-SURFACE-VALIDATOR-003":
        failures.append(finding(rule_id, rel(USF931_PLANTED), "USF-931 planted fixture must remain wired", issue_id))
    return failures


def validate_query_list_detail_implementation() -> list[dict[str, str]]:
    rule_id = "USF-APP-SURFACE-IMPLEMENTATION-003"
    issue_id = "USF-1022"
    subject = rel(QUERY_LIST_DETAIL_IMPLEMENTATION)
    failures: list[dict[str, str]] = []
    if not QUERY_LIST_DETAIL_IMPLEMENTATION.exists():
        return [finding(rule_id, subject, "query list/detail implementation artefact is missing", issue_id)]
    data = load_json(QUERY_LIST_DETAIL_IMPLEMENTATION)
    if not isinstance(data, dict):
        return [finding(rule_id, subject, "query list/detail implementation artefact must be an object", issue_id)]
    if data.get("ownerIssueId") != issue_id:
        failures.append(finding(rule_id, subject, "artefact ownerIssueId must be USF-1022", issue_id))
    if data.get("lifecycleState") != "bounded-local-implemented":
        failures.append(finding(rule_id, subject, "artefact lifecycleState must be bounded-local-implemented", issue_id))
    for path in data.get("authorityInputs", []):
        if not isinstance(path, str) or not path_exists(path):
            failures.append(finding(rule_id, subject, f"authority input does not exist: {path}", issue_id))
    guard = data.get("validationGuard", {})
    required_guard_flags = [
        "existingAuthorityPathsMustExist",
        "queryViewsMustMapToSemanticQueryAuthority",
        "cacheFreshnessAndPolicyMustExist",
        "privacyClassificationMustExist",
        "tenantBoundaryMustExist",
        "permissionErrorAuditTelemetryMappingsMustExist",
        "i18nAndAccessibilityRefsMustExist",
        "unknownQueryViewsMustFailClosed",
        "usf932StyleFixtureMustRemainPresent",
        "nonClaimsMustAllBeFalse",
        "liveServerStateProviderMustRemainForbidden",
        "persistentSensitiveStorageMustRemainForbidden",
    ]
    if not isinstance(guard, dict):
        failures.append(finding(rule_id, subject, "validationGuard must be an object", issue_id))
    else:
        for flag in required_guard_flags:
            if guard.get(flag) is not True:
                failures.append(finding(rule_id, f"{subject}.validationGuard.{flag}", "validation guard flag must be true", issue_id))

    runtime = load_json(LOCAL_IN_MEMORY_RUNTIME) if LOCAL_IN_MEMORY_RUNTIME.exists() else {}
    shared_client = load_json(SHARED_CLIENT_CONSUMPTION_PATH) if SHARED_CLIENT_CONSUMPTION_PATH.exists() else {}
    conforming = load_json(USF932_CONFORMING) if USF932_CONFORMING.exists() else {}
    planted = load_json(USF932_PLANTED) if USF932_PLANTED.exists() else {}
    if not isinstance(runtime, dict):
        runtime = {}
    if not isinstance(shared_client, dict):
        shared_client = {}
    authority: dict[str, set[str]] = {
        "queryRefs": ids_from_semantic_inputs(runtime, "queries"),
        "capabilityIds": ids_from_semantic_inputs(runtime, "capabilities"),
        "permissionRefs": ids_from_semantic_inputs(runtime, "permissions"),
        "tenantBoundaryRefs": ids_from_semantic_inputs(runtime, "tenantContexts"),
        "errorRefs": ids_from_semantic_inputs(runtime, "errorRefs"),
        "auditEventRefs": ids_from_semantic_inputs(runtime, "auditEvents"),
        "cacheFreshnessRefs": set(),
        "cachePolicyRefs": set(),
        "privacyClassificationRefs": set(),
        "telemetryRefs": set(),
    }
    shared_mappings = [
        item
        for item in shared_client.get("mappings", [])
        if isinstance(item, dict) and item.get("behaviourClass") == "queries"
    ]
    for mapping in shared_mappings:
        if isinstance(mapping.get("commandOrQueryOrWorkflowOrEventId"), str):
            authority["queryRefs"].add(mapping["commandOrQueryOrWorkflowOrEventId"])
        if isinstance(mapping.get("capabilityId"), str):
            authority["capabilityIds"].add(mapping["capabilityId"])
        for source_field, authority_key in [
            ("permissionRefs", "permissionRefs"),
            ("errorRefs", "errorRefs"),
            ("auditEventRefs", "auditEventRefs"),
            ("privacyCategoryRefs", "privacyClassificationRefs"),
            ("telemetryRefs", "telemetryRefs"),
        ]:
            values = mapping.get(source_field, [])
            if isinstance(values, list):
                authority[authority_key].update(item for item in values if isinstance(item, str) and item.strip())
        offline_posture = mapping.get("offlineRetryCachePosture", {})
        if isinstance(offline_posture, dict) and isinstance(offline_posture.get("cacheSemanticsRef"), str):
            authority["cachePolicyRefs"].add(offline_posture["cacheSemanticsRef"])
    shared_by_query = {
        mapping.get("commandOrQueryOrWorkflowOrEventId"): mapping
        for mapping in shared_mappings
        if isinstance(mapping.get("commandOrQueryOrWorkflowOrEventId"), str)
    }
    conforming_query = conforming.get("query", {}) if isinstance(conforming, dict) else {}
    if isinstance(conforming_query, dict):
        if isinstance(conforming_query.get("cacheFreshnessRef"), str):
            authority["cacheFreshnessRefs"].add(conforming_query["cacheFreshnessRef"])
        if isinstance(conforming_query.get("privacyClassificationRef"), str):
            authority["privacyClassificationRefs"].add(conforming_query["privacyClassificationRef"])
    authority["cachePolicyRefs"].update(
        [
            "docs/architecture/client-query-cache-privacy-semantics.json#cacheInvalidationSemantics",
            "docs/architecture/client-query-cache-privacy-semantics.json#queryViewModelMapping",
        ]
    )
    component_fixtures = runtime.get("componentFixtures", []) if isinstance(runtime.get("componentFixtures", []), list) else []
    fixtures_by_id = {
        fixture.get("fixtureId"): fixture
        for fixture in component_fixtures
        if isinstance(fixture, dict) and isinstance(fixture.get("fixtureId"), str)
    }
    required_string_fields = [
        "viewId",
        "viewKind",
        "componentFixtureRef",
        "queryRef",
        "capabilityId",
        "tenantBoundaryRef",
        "cacheFreshnessRef",
        "errorStateRef",
        "nonClaimBoundary",
    ]
    required_array_fields = [
        "permissionRefs",
        "cachePolicyRefs",
        "privacyClassificationRefs",
        "errorRefs",
        "auditEventRefs",
        "i18nKeyRefs",
        "accessibilityRefs",
        "telemetryRefs",
        "semanticSourceRefs",
        "proofRefs",
    ]
    query_views = data.get("implementedQueryViews", [])
    if not isinstance(query_views, list) or not query_views:
        failures.append(finding(rule_id, subject, "implementedQueryViews must be a non-empty array", issue_id))
        query_views = []
    seen_kinds: set[str] = set()
    seen_ids: set[str] = set()
    for index, view in enumerate(query_views):
        if not isinstance(view, dict):
            failures.append(finding(rule_id, f"{subject}.implementedQueryViews.{index}", "implemented query view must be an object", issue_id))
            continue
        view_id = view.get("viewId") if isinstance(view.get("viewId"), str) and view["viewId"].strip() else f"implementedQueryViews.{index}"
        view_subject = f"{subject}.implementedQueryViews.{view_id}"
        if view_id in seen_ids:
            failures.append(finding(rule_id, view_subject, "duplicate viewId", issue_id))
        seen_ids.add(str(view_id))
        if isinstance(view.get("viewKind"), str):
            seen_kinds.add(view["viewKind"])
        for field in required_string_fields:
            if not isinstance(view.get(field), str) or not view[field].strip():
                failures.append(finding(rule_id, view_subject, f"missing {field}", issue_id))
        for field in required_array_fields:
            if not has_nonempty_string_array(view.get(field)):
                failures.append(finding(rule_id, view_subject, f"missing {field}", issue_id))
        if view.get("viewKind") not in {"list", "detail"}:
            failures.append(finding(rule_id, view_subject, "viewKind must be list or detail", issue_id))
        if view.get("viewKind") == "list":
            for field in ["resultItemShapeRef", "emptyStateRef"]:
                if not isinstance(view.get(field), str) or not view[field].strip():
                    failures.append(finding(rule_id, view_subject, f"missing {field}", issue_id))
        if view.get("viewKind") == "detail":
            for field in ["recordIdentityRef", "notFoundStateRef"]:
                if not isinstance(view.get(field), str) or not view[field].strip():
                    failures.append(finding(rule_id, view_subject, f"missing {field}", issue_id))
        for field in [
            "cachePolicyRefs",
            "privacyClassificationRefs",
            "i18nKeyRefs",
            "accessibilityRefs",
            "semanticSourceRefs",
            "proofRefs",
        ]:
            values = view.get(field, [])
            if isinstance(values, list):
                for path_ref in values:
                    if not path_ref_exists(path_ref):
                        failures.append(finding(rule_id, view_subject, f"{field} path does not exist: {path_ref}", issue_id))
        for field, authority_key in [
            ("queryRef", "queryRefs"),
            ("capabilityId", "capabilityIds"),
            ("tenantBoundaryRef", "tenantBoundaryRefs"),
            ("cacheFreshnessRef", "cacheFreshnessRefs"),
        ]:
            value = view.get(field)
            if not isinstance(value, str) or value not in authority[authority_key]:
                failures.append(finding(rule_id, view_subject, f"{field} lacks repository authority", issue_id))
        for field, authority_key in [
            ("permissionRefs", "permissionRefs"),
            ("cachePolicyRefs", "cachePolicyRefs"),
            ("privacyClassificationRefs", "privacyClassificationRefs"),
            ("errorRefs", "errorRefs"),
            ("auditEventRefs", "auditEventRefs"),
            ("telemetryRefs", "telemetryRefs"),
        ]:
            values = view.get(field, [])
            if isinstance(values, list):
                for value in values:
                    if not isinstance(value, str) or value not in authority[authority_key]:
                        failures.append(finding(rule_id, view_subject, f"{field} lacks repository authority: {value}", issue_id))
        fixture = fixtures_by_id.get(view.get("componentFixtureRef"))
        if not isinstance(fixture, dict):
            failures.append(finding(rule_id, view_subject, "componentFixtureRef must map to local runtime fixture authority", issue_id))
        else:
            fixture_queries = fixture.get("queryRefs", [])
            if view.get("queryRef") not in fixture_queries:
                failures.append(finding(rule_id, view_subject, "component fixture must reference the queryRef", issue_id))
        shared_mapping = shared_by_query.get(view.get("queryRef"))
        if not isinstance(shared_mapping, dict):
            failures.append(finding(rule_id, view_subject, "queryRef must map to shared-client query authority", issue_id))
        else:
            for field in ["capabilityId", "permissionRefs", "errorRefs", "auditEventRefs"]:
                if view.get(field) != shared_mapping.get(field):
                    failures.append(finding(rule_id, view_subject, f"{field} must match shared-client query authority", issue_id))
            for field, view_field in [
                ("privacyCategoryRefs", "privacyClassificationRefs"),
                ("telemetryRefs", "telemetryRefs"),
            ]:
                shared_values = shared_mapping.get(field, [])
                view_values = set(view.get(view_field, [])) if isinstance(view.get(view_field), list) else set()
                if isinstance(shared_values, list):
                    for value in shared_values:
                        if isinstance(value, str) and value not in view_values:
                            failures.append(finding(rule_id, view_subject, f"{view_field} must include shared-client query authority: {value}", issue_id))
            offline_posture = shared_mapping.get("offlineRetryCachePosture", {})
            if isinstance(offline_posture, dict) and isinstance(offline_posture.get("cacheSemanticsRef"), str):
                cache_values = set(view.get("cachePolicyRefs", [])) if isinstance(view.get("cachePolicyRefs"), list) else set()
                if offline_posture["cacheSemanticsRef"] not in cache_values:
                    failures.append(finding(rule_id, view_subject, "cachePolicyRefs must include shared-client cache semantics authority", issue_id))
    for required_kind in ["list", "detail"]:
        if required_kind not in seen_kinds:
            failures.append(finding(rule_id, subject, f"implementedQueryViews must include {required_kind}", issue_id))
    out_of_scope = data.get("outOfScopeSurfaces", [])
    observed_out_of_scope = {
        item.get("surface"): item
        for item in out_of_scope
        if isinstance(item, dict)
    } if isinstance(out_of_scope, list) else {}
    required_out_of_scope = {
        "live-server-state-provider": {"status": "not-authorised"},
        "persistent-sensitive-storage": {"status": "not-authorised"},
        "realtime-subscription": {"status": "not-authorised"},
        "background-refresh": {"status": "not-authorised"},
        "state-cache-query-client": {"ownerIssueId": "USF-1023", "status": "owned-by-later-issue"},
    }
    for surface, expected in required_out_of_scope.items():
        item = observed_out_of_scope.get(surface)
        if not isinstance(item, dict) or any(item.get(key) != value for key, value in expected.items()):
            failures.append(finding(rule_id, subject, f"{surface} out-of-scope boundary is missing or incorrect", issue_id))
    failures.extend(validate_false_nonclaims(data, subject, rule_id, issue_id))
    if not isinstance(conforming, dict) or conforming.get("targetRuleId") != "USF-APP-SURFACE-VALIDATOR-004":
        failures.append(finding(rule_id, rel(USF932_CONFORMING), "USF-932 conforming fixture must remain wired", issue_id))
    if not isinstance(planted, dict) or planted.get("expectedFailureRuleId") != "USF-APP-SURFACE-VALIDATOR-004":
        failures.append(finding(rule_id, rel(USF932_PLANTED), "USF-932 planted fixture must remain wired", issue_id))
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
    failures.extend(validate_makefile_wiring())
    failures.extend(validate_route_capability_implementation())
    failures.extend(validate_command_form_implementation())
    failures.extend(validate_query_list_detail_implementation())
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


def build_payload(mode: str, findings: list[dict[str, str]]) -> dict[str, Any]:
    real_implementation_paths = [
        ROUTE_CAPABILITY_IMPLEMENTATION,
        COMMAND_FORM_IMPLEMENTATION,
        QUERY_LIST_DETAIL_IMPLEMENTATION,
    ]
    return {
        "mode": mode,
        "status": "fail" if findings else "pass",
        "summary": {
            "ruleCount": len(TARGETS),
            "conformingFixtureCount": len(list(CONFORMING.glob("*.json"))),
            "plantedDefectFixtureCount": len(list(PLANTED.glob("*.json"))),
            "realImplementationArtifactCount": sum(1 for path in real_implementation_paths if path.exists()),
            "findingCount": len(findings),
        },
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    findings = validate_selftest() if args.mode == "selftest" else validate_all()
    payload = build_payload(args.mode, findings)
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for item in findings:
            print(f"{item['ruleId']} {item['subject']}: {item['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
