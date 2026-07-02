#!/usr/bin/env python3
"""Validate USF test-readiness service contract evidence.

This validator enforces the USF-235 test environment service contract. It does
not execute Compose or proof commands. It fails closed when service-backed test
claims can be satisfied by in-memory substitutes, when service catalogue test
rows are missing from the contract, when reset/seed/cleanup posture is absent,
or when the contract implies readiness beyond its evidence.
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
CONTRACT_PATH = Path("docs/architecture/test-environment-service-contract.json")
HARNESS_PATH = Path("docs/architecture/composed-semantic-test-harness.json")
LIFECYCLE_PATH = Path("docs/architecture/deterministic-test-fixture-lifecycle.json")
COMMAND_SURFACE_PATH = Path("docs/architecture/test-readiness-command-surface-and-ci-gate.json")
SERVICE_CATALOGUE_PATH = Path("spec/instances/compose-service/service-catalogue.json")
ENTERPRISE_MODEL_PATH = Path("spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json")
PACKAGE_PATH = Path("package.json")
MAKEFILE_PATH = Path("Makefile")
PLANTED_DEFECT_DIR = Path("tools/validate-test-readiness/planted-defects")

RULES = {
    "USF-TEST-READINESS-001": ("blocking", "test environment service contract is missing or invalid"),
    "USF-TEST-READINESS-002": ("blocking", "required service catalogue test row is missing from the contract"),
    "USF-TEST-READINESS-003": ("blocking", "composed service row lacks canonical test Compose target or profile linkage"),
    "USF-TEST-READINESS-004": ("blocking", "service-backed test path allows in-memory substitution"),
    "USF-TEST-READINESS-005": ("blocking", "service row lacks reset seed cleanup teardown or deterministic fixture posture"),
    "USF-TEST-READINESS-006": ("blocking", "service row lacks proof or validation command evidence"),
    "USF-TEST-READINESS-007": ("blocking", "test contract preserves insufficient non-claims or overclaims readiness"),
    "USF-TEST-READINESS-008": ("blocking", "final test-readiness claim is allowed before USF-234 acceptance"),
    "USF-TEST-READINESS-009": ("blocking", "test contract lacks enterprise evidence linkage"),
    "USF-TEST-READINESS-010": ("blocking", "test-readiness validator is not wired into repository validation"),
    "USF-TEST-READINESS-011": ("blocking", "composed semantic test harness evidence is missing or invalid"),
    "USF-TEST-READINESS-012": ("blocking", "composed semantic test harness does not use canonical test Compose target"),
    "USF-TEST-READINESS-013": ("blocking", "composed semantic test harness allows in-memory service substitution"),
    "USF-TEST-READINESS-014": ("blocking", "composed semantic test harness proof command is missing or stale"),
    "USF-TEST-READINESS-015": ("blocking", "composed semantic test harness lacks service-backed evidence coverage"),
    "USF-TEST-READINESS-016": ("blocking", "composed semantic test harness preserves insufficient non-claims or overclaims readiness"),
    "USF-TEST-READINESS-017": ("blocking", "deterministic test fixture lifecycle evidence is missing or invalid"),
    "USF-TEST-READINESS-018": ("blocking", "deterministic fixture lifecycle proof command is missing or stale"),
    "USF-TEST-READINESS-019": ("blocking", "deterministic fixture lifecycle repeatability evidence is incomplete"),
    "USF-TEST-READINESS-020": ("blocking", "deterministic fixture lifecycle cleanup teardown evidence is incomplete"),
    "USF-TEST-READINESS-021": ("blocking", "deterministic fixture lifecycle preserves insufficient non-claims or overclaims readiness"),
    "USF-TEST-READINESS-022": ("blocking", "test-readiness command surface and CI gate evidence is missing or invalid"),
    "USF-TEST-READINESS-023": ("blocking", "test-readiness package script command surface is missing or stale"),
    "USF-TEST-READINESS-024": ("blocking", "test-readiness Make command surface is missing or stale"),
    "USF-TEST-READINESS-025": ("blocking", "test-readiness CI/local gate alignment evidence is incomplete"),
    "USF-TEST-READINESS-026": ("blocking", "test-readiness Sonar zero-issue gate preservation evidence is incomplete"),
    "USF-TEST-READINESS-027": ("blocking", "test-readiness command surface preserves insufficient non-claims or overclaims readiness"),
    "USF-TEST-READINESS-028": ("blocking", "test-readiness command surface lacks enterprise evidence linkage"),
    "USF-TEST-READINESS-SELFTEST": ("blocking", "planted test-readiness defect did not raise its expected rule"),
}

COMPOSE_TARGET = "compose/compose.test.generated.yaml"
HARNESS_COMMAND = "corepack pnpm test-readiness:semantic"
HARNESS_SCRIPT = "tsx packages/proof/src/composed-semantic-test-harness-proof.ts"
LIFECYCLE_COMMAND = "corepack pnpm test-readiness:fixtures"
LIFECYCLE_SCRIPT = "tsx packages/proof/src/deterministic-test-fixture-lifecycle-proof.ts"
TEST_READINESS_COMMAND = "corepack pnpm test-readiness"
TEST_READINESS_SCRIPT = "pnpm test-readiness:validate && pnpm test-readiness:semantic && pnpm test-readiness:fixtures && pnpm test-readiness:assurance"
TEST_READINESS_COMPOSED_COMMAND = "corepack pnpm test-readiness:composed"
TEST_READINESS_COMPOSED_SCRIPT = "pnpm test-readiness:semantic && pnpm test-readiness:fixtures"
TEST_READINESS_ASSURANCE_COMMAND = "corepack pnpm test-readiness:assurance"
TEST_READINESS_ASSURANCE_SCRIPT = "pnpm proof:assurance:sonarqube"
SONAR_COMMAND = "corepack pnpm proof:assurance:sonarqube"
REQUIRED_HARNESS_SERVICE_IDS = {
    "postgres",
    "keycloak-db",
    "keycloak",
    "nats",
    "temporal",
    "minio",
    "openbao",
    "mailpit",
}
REQUIRED_NON_CLAIMS = {
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "product-ui-readiness",
    "browser-e2e-readiness",
    "full-react-product-parity",
}
REQUIRED_HARNESS_NON_CLAIMS = REQUIRED_NON_CLAIMS | {"final-test-readiness"}
PROHIBITED_ALLOWED_CLAIMS = {
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "product-ui-readiness",
    "browser-e2e-readiness",
    "full-react-product-parity",
    "full-react-parity-readiness",
}
SERVICE_BACKED_CLASS = "composed backing service required"
NON_COMPOSED_CLASSES = {
    "pure local computation",
    "external/live provider not in test-readiness scope",
    "historical/dev-only proof",
    "unsupported for test readiness",
}
RESET_FIELDS = {"seed", "reset", "cleanup", "teardown", "determinism"}
ENTERPRISE_REF_SECTIONS = {
    "soaSupportMappings",
    "evidenceRegister",
    "threatModelAbuseCaseRegister",
    "accessReviewPrivilegedOperationPosture",
    "backupRestoreResiliencePosture",
    "incidentVulnerabilityManagementEvidence",
    "privacyDataMinimisationPosture",
}


class Findings:
    def __init__(self) -> None:
        self.items: list[dict[str, str]] = []

    def add(self, rule_id: str, subject: str, message: str) -> None:
        severity = RULES[rule_id][0]
        self.items.append(
            {
                "severity": severity,
                "ruleId": rule_id,
                "subject": subject,
                "message": message,
            }
        )

    def rule_ids(self) -> set[str]:
        return {item["ruleId"] for item in self.items}


def read_json(path: Path) -> Any:
    with (ROOT / path).open(encoding="utf-8") as fh:
        return json.load(fh)


def apply_contract_defect(contract: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeContract"):
        return None
    if contract is None:
        return None
    out = copy.deepcopy(contract)
    for key, value in defect.get("contractSet", {}).items():
        out[key] = value
    for key in defect.get("contractDrop", []):
        out.pop(key, None)
    row_id = defect.get("removeServiceInventoryRow")
    if row_id:
        out["serviceInventory"] = [
            row for row in out.get("serviceInventory", []) if row.get("serviceId") != row_id
        ]
    for patch in defect.get("serviceInventoryPatch", []):
        for row in out.get("serviceInventory", []):
            if row.get("serviceId") != patch.get("serviceId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    for section in defect.get("enterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    if defect.get("dropNonClaims"):
        dropped = set(defect.get("dropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("appendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["appendAllowedClaim"])
    return out


def apply_harness_defect(harness: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeHarness"):
        return None
    if harness is None:
        return None
    out = copy.deepcopy(harness)
    for key, value in defect.get("harnessSet", {}).items():
        out[key] = value
    for key in defect.get("harnessDrop", []):
        out.pop(key, None)
    for service_id in defect.get("harnessDropServiceIds", []):
        out["requiredServiceIds"] = [
            row for row in out.get("requiredServiceIds", []) if row != service_id
        ]
    if defect.get("harnessDropNonClaims"):
        dropped = set(defect.get("harnessDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    for section in defect.get("harnessEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    evidence_patch = defect.get("harnessSemanticEvidencePatch", {})
    for section, patch in evidence_patch.items():
        target = out.get("semanticPathEvidence", {}).get(section)
        if isinstance(target, dict):
            for key in patch.get("drop", []):
                target.pop(key, None)
            for key, value in patch.get("set", {}).items():
                target[key] = value
    return out


def apply_lifecycle_defect(lifecycle: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeLifecycle"):
        return None
    if lifecycle is None:
        return None
    out = copy.deepcopy(lifecycle)
    for key, value in defect.get("lifecycleSet", {}).items():
        out[key] = value
    for key in defect.get("lifecycleDrop", []):
        out.pop(key, None)
    fixture_patch = defect.get("lifecycleFixturePatch", {})
    if isinstance(fixture_patch, dict):
        target = out.get("fixtureLifecycle")
        if isinstance(target, dict):
            for key in fixture_patch.get("drop", []):
                target.pop(key, None)
            for key, value in fixture_patch.get("set", {}).items():
                target[key] = value
    repeat_patch = defect.get("lifecycleRepeatabilityPatch", {})
    if isinstance(repeat_patch, dict):
        target = out.get("repeatabilityEvidence")
        if isinstance(target, dict):
            for key in repeat_patch.get("drop", []):
                target.pop(key, None)
            for key, value in repeat_patch.get("set", {}).items():
                target[key] = value
    for section in defect.get("lifecycleEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    if defect.get("lifecycleDropNonClaims"):
        dropped = set(defect.get("lifecycleDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("lifecycleAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["lifecycleAppendAllowedClaim"])
    return out


def apply_command_surface_defect(command_surface: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeCommandSurface"):
        return None
    if command_surface is None:
        return None
    out = copy.deepcopy(command_surface)
    for key, value in defect.get("commandSurfaceSet", {}).items():
        out[key] = value
    for key in defect.get("commandSurfaceDrop", []):
        out.pop(key, None)
    for command_id in defect.get("commandSurfaceDropCommandIds", []):
        out["canonicalCommands"] = [
            row for row in out.get("canonicalCommands", []) if row.get("id") != command_id
        ]
    for script_id in defect.get("commandSurfaceDropPackageScriptIds", []):
        out["packageScripts"] = [
            row for row in out.get("packageScripts", []) if row.get("id") != script_id
        ]
    for target in defect.get("commandSurfaceDropMakeTargets", []):
        out["makeTargets"] = [
            row for row in out.get("makeTargets", []) if row.get("target") != target
        ]
    for section in defect.get("commandSurfaceEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    for key, value in defect.get("commandSurfaceCiLocalSet", {}).items():
        out.setdefault("ciLocalAlignment", {})[key] = value
    for key in defect.get("commandSurfaceCiLocalDrop", []):
        out.setdefault("ciLocalAlignment", {}).pop(key, None)
    for key, value in defect.get("commandSurfaceSonarSet", {}).items():
        out.setdefault("sonarGatePreservation", {})[key] = value
    for key in defect.get("commandSurfaceSonarDrop", []):
        out.setdefault("sonarGatePreservation", {}).pop(key, None)
    composed_patch = defect.get("commandSurfaceComposedExecutionPatch", {})
    if isinstance(composed_patch, dict):
        target = out.get("composedExecution")
        if isinstance(target, dict):
            for key in composed_patch.get("drop", []):
                target.pop(key, None)
            for key, value in composed_patch.get("set", {}).items():
                target[key] = value
    if defect.get("commandSurfaceDropNonClaims"):
        dropped = set(defect.get("commandSurfaceDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("commandSurfaceAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["commandSurfaceAppendAllowedClaim"])
    return out


def apply_package_defect(package: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(package)
    scripts = out.setdefault("scripts", {})
    for key in defect.get("packageScriptDrop", []):
        scripts.pop(key, None)
    for key, value in defect.get("packageScriptSet", {}).items():
        scripts[key] = value
    return out


def apply_makefile_defect(makefile: str, defect: dict[str, Any]) -> str:
    out = makefile
    for patch in defect.get("makefileTextReplace", []):
        out = out.replace(patch.get("old", ""), patch.get("new", ""))
    for text in defect.get("makefileTextDrop", []):
        out = out.replace(text, "")
    return out


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    defect = defect or {}
    contract = read_json(CONTRACT_PATH) if (ROOT / CONTRACT_PATH).exists() else None
    contract = apply_contract_defect(contract, defect)
    harness = read_json(HARNESS_PATH) if (ROOT / HARNESS_PATH).exists() else None
    harness = apply_harness_defect(harness, defect)
    lifecycle = read_json(LIFECYCLE_PATH) if (ROOT / LIFECYCLE_PATH).exists() else None
    lifecycle = apply_lifecycle_defect(lifecycle, defect)
    command_surface = read_json(COMMAND_SURFACE_PATH) if (ROOT / COMMAND_SURFACE_PATH).exists() else None
    command_surface = apply_command_surface_defect(command_surface, defect)
    makefile = (ROOT / MAKEFILE_PATH).read_text(encoding="utf-8") if (ROOT / MAKEFILE_PATH).exists() else ""
    makefile = apply_makefile_defect(makefile, defect)
    return {
        "contract": contract,
        "harness": harness,
        "lifecycle": lifecycle,
        "commandSurface": command_surface,
        "serviceCatalogue": read_json(SERVICE_CATALOGUE_PATH),
        "enterpriseModel": read_json(ENTERPRISE_MODEL_PATH),
        "package": apply_package_defect(read_json(PACKAGE_PATH), defect),
        "makefile": makefile,
    }


def required_test_service_ids(service_catalogue: dict[str, Any]) -> set[str]:
    service_ids: set[str] = set()
    for service in service_catalogue.get("services", []):
        policy = service.get("environmentPolicies", {}).get("test", {})
        if policy.get("required") is True:
            service_ids.add(str(service.get("serviceId")))
    return service_ids


def catalogue_by_id(service_catalogue: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(service.get("serviceId")): service for service in service_catalogue.get("services", [])}


def check_shape(F: Findings, contract: dict[str, Any] | None) -> None:
    if not isinstance(contract, dict):
        F.add("USF-TEST-READINESS-001", str(CONTRACT_PATH), "contract file is missing")
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "composeEnvironment",
        "capabilityDependencyClasses",
        "capabilityInventory",
        "serviceInventory",
        "enterpriseEvidenceRefs",
        "validationCommands",
        "nonClaims",
    ):
        if key not in contract:
            F.add("USF-TEST-READINESS-001", str(CONTRACT_PATH), f"missing top-level field {key}")
    if contract.get("issueId") != "USF-235" or contract.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-001", str(CONTRACT_PATH), "issue linkage must be USF-235 under USF-234")
    compose = contract.get("composeEnvironment", {})
    if compose.get("target") != COMPOSE_TARGET:
        F.add("USF-TEST-READINESS-001", str(CONTRACT_PATH), "composeEnvironment.target must be canonical test Compose")


def check_service_inventory(F: Findings, state: dict[str, Any]) -> None:
    contract = state["contract"]
    if not isinstance(contract, dict):
        return
    rows = contract.get("serviceInventory", [])
    if not isinstance(rows, list):
        F.add("USF-TEST-READINESS-001", str(CONTRACT_PATH), "serviceInventory must be a list")
        return
    row_by_id = {row.get("serviceId"): row for row in rows if isinstance(row, dict)}
    for service_id in required_test_service_ids(state["serviceCatalogue"]):
        if service_id not in row_by_id:
            F.add("USF-TEST-READINESS-002", service_id, "required test service catalogue row missing")
    catalogue = catalogue_by_id(state["serviceCatalogue"])
    for service_id, row in row_by_id.items():
        subject = f"{CONTRACT_PATH}#{service_id}"
        if service_id not in catalogue:
            F.add("USF-TEST-READINESS-002", subject, "service row is not present in service catalogue")
            continue
        dependency_class = row.get("dependencyClass")
        if dependency_class == SERVICE_BACKED_CLASS:
            policy = catalogue[service_id].get("environmentPolicies", {}).get("test", {})
            if row.get("composeTarget") != COMPOSE_TARGET or policy.get("selectedComposeTarget") != COMPOSE_TARGET:
                F.add("USF-TEST-READINESS-003", subject, "service-backed row must use canonical test Compose target")
            expected_profiles = policy.get("composeProfiles", [])
            if row.get("composeProfiles") != expected_profiles:
                F.add("USF-TEST-READINESS-003", subject, "service row compose profiles do not match service catalogue")
            if row.get("profileGated") != bool(expected_profiles):
                F.add("USF-TEST-READINESS-003", subject, "profileGated does not match service catalogue profile scope")
            if row.get("inMemorySubstituteAllowed") is not False:
                F.add("USF-TEST-READINESS-004", subject, "service-backed row must forbid in-memory substitute")
        elif dependency_class not in NON_COMPOSED_CLASSES:
            F.add("USF-TEST-READINESS-001", subject, f"unknown dependencyClass {dependency_class}")
        if row.get("inMemorySubstituteAllowed") is True and dependency_class != "pure local computation":
            F.add("USF-TEST-READINESS-004", subject, "only pure local computation may allow in-memory substitution")
        reset = row.get("resetSeedCleanup")
        if not isinstance(reset, dict) or not RESET_FIELDS.issubset(reset):
            F.add("USF-TEST-READINESS-005", subject, "resetSeedCleanup must include seed reset cleanup teardown determinism")
        if not row.get("readinessEvidence"):
            F.add("USF-TEST-READINESS-005", subject, "readiness evidence is missing")
        commands = row.get("validationCommands")
        if not isinstance(commands, list) or not commands:
            F.add("USF-TEST-READINESS-006", subject, "validationCommands must be non-empty")
        if not row.get("followUpIssue"):
            F.add("USF-TEST-READINESS-006", subject, "followUpIssue must identify proof or acceptance owner")


def check_claims(F: Findings, contract: dict[str, Any] | None) -> None:
    if not isinstance(contract, dict):
        return
    non_claims = set(contract.get("nonClaims", []))
    missing = sorted(REQUIRED_NON_CLAIMS - non_claims)
    if missing:
        F.add("USF-TEST-READINESS-007", str(CONTRACT_PATH), f"missing non-claims: {missing}")
    allowed = set(contract.get("allowedClaims", []))
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & allowed)
    if bad:
        F.add("USF-TEST-READINESS-007", str(CONTRACT_PATH), f"prohibited claim appears in allowedClaims: {bad}")
    if contract.get("testReadinessClaimAllowed") is not False:
        F.add("USF-TEST-READINESS-008", str(CONTRACT_PATH), "USF-235 must not allow final test-readiness claim")


def check_enterprise_refs_for_artifact(
    F: Findings,
    artifact: dict[str, Any] | None,
    path: Path,
    enterprise_model: dict[str, Any],
    rule_id: str = "USF-TEST-READINESS-009",
) -> None:
    if not isinstance(artifact, dict):
        return
    refs = artifact.get("enterpriseEvidenceRefs")
    if not isinstance(refs, dict):
        F.add(rule_id, str(path), "enterpriseEvidenceRefs must be present")
        return
    for section in ENTERPRISE_REF_SECTIONS:
        values = refs.get(section)
        if not isinstance(values, list) or not values:
            F.add(rule_id, f"{path}#{section}", "enterprise evidence ref is missing")
            continue
        model_ids = {
            row.get("id")
            for row in enterprise_model.get(section, [])
            if isinstance(row, dict)
        }
        for value in values:
            if value not in model_ids:
                F.add(rule_id, f"{path}#{section}", f"missing enterprise row {value}")


def check_enterprise_refs(F: Findings, state: dict[str, Any]) -> None:
    check_enterprise_refs_for_artifact(
        F,
        state["contract"],
        CONTRACT_PATH,
        state["enterpriseModel"],
    )
    check_enterprise_refs_for_artifact(
        F,
        state["harness"],
        HARNESS_PATH,
        state["enterpriseModel"],
    )
    check_enterprise_refs_for_artifact(
        F,
        state["lifecycle"],
        LIFECYCLE_PATH,
        state["enterpriseModel"],
    )
    check_enterprise_refs_for_artifact(
        F,
        state["commandSurface"],
        COMMAND_SURFACE_PATH,
        state["enterpriseModel"],
        "USF-TEST-READINESS-028",
    )


def check_harness(F: Findings, state: dict[str, Any]) -> None:
    harness = state["harness"]
    if not isinstance(harness, dict):
        F.add("USF-TEST-READINESS-011", str(HARNESS_PATH), "harness file is missing")
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "testEnvironmentContract",
        "composeTarget",
        "proofCommand",
        "sourceDevProofCommand",
        "sourceDevProofBoundary",
        "semanticTestBoundary",
        "runtimeMode",
        "providerMode",
        "inMemoryServiceSubstituteAllowed",
        "requiredServiceIds",
        "semanticPathEvidence",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    ):
        if key not in harness:
            F.add("USF-TEST-READINESS-011", str(HARNESS_PATH), f"missing top-level field {key}")
    if harness.get("issueId") != "USF-236" or harness.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-011", str(HARNESS_PATH), "issue linkage must be USF-236 under USF-234")
    if harness.get("testEnvironmentContract") != str(CONTRACT_PATH):
        F.add("USF-TEST-READINESS-011", str(HARNESS_PATH), "harness must link the USF-235 service contract")
    if harness.get("composeTarget") != COMPOSE_TARGET:
        F.add("USF-TEST-READINESS-012", str(HARNESS_PATH), "harness must use canonical test Compose target")
    if str(harness.get("sourceDevProofBoundary", "")).lower().find("does not satisfy") < 0:
        F.add("USF-TEST-READINESS-012", str(HARNESS_PATH), "source dev proof boundary must be non-equivalent")
    if harness.get("runtimeMode") != "dev-compose-backed" or harness.get("providerMode") != "local-composed-real-service":
        F.add("USF-TEST-READINESS-015", str(HARNESS_PATH), "harness must record composed runtime/provider mode")
    if harness.get("inMemoryServiceSubstituteAllowed") is not False:
        F.add("USF-TEST-READINESS-013", str(HARNESS_PATH), "harness must forbid in-memory service substitutes")
    services = set(harness.get("requiredServiceIds", []))
    missing_services = sorted(REQUIRED_HARNESS_SERVICE_IDS - services)
    if missing_services:
        F.add("USF-TEST-READINESS-015", str(HARNESS_PATH), f"missing required service ids: {missing_services}")
    commands = set(harness.get("validationCommands", []))
    if harness.get("proofCommand") != HARNESS_COMMAND or HARNESS_COMMAND not in commands:
        F.add("USF-TEST-READINESS-014", str(HARNESS_PATH), "harness proof command is missing or stale")
    semantic = harness.get("semanticPathEvidence", {})
    api = semantic.get("api") if isinstance(semantic, dict) else {}
    worker = semantic.get("worker") if isinstance(semantic, dict) else {}
    provider = semantic.get("providerEvidence") if isinstance(semantic, dict) else {}
    required_api = {
        "healthRouteChecked",
        "readinessRouteChecked",
        "openapiRouteChecked",
        "tenantMismatchFailClosed",
        "authorizationFailClosed",
        "auditEvidenceRequired",
        "composedProviderBindingsRequired",
    }
    required_worker = {
        "syntheticJobExecuted",
        "tenantBoundaryDenied",
        "authorizationDenied",
        "auditEvidenceRequired",
        "composedProviderEvidenceRequired",
    }
    if not isinstance(api, dict) or any(api.get(key) is not True for key in required_api):
        F.add("USF-TEST-READINESS-015", f"{HARNESS_PATH}#semanticPathEvidence.api", "API semantic evidence fields must be true")
    if not isinstance(worker, dict) or any(worker.get(key) is not True for key in required_worker):
        F.add("USF-TEST-READINESS-015", f"{HARNESS_PATH}#semanticPathEvidence.worker", "worker semantic evidence fields must be true")
    if not isinstance(provider, dict) or not REQUIRED_HARNESS_SERVICE_IDS.issubset(set(provider)):
        F.add("USF-TEST-READINESS-015", f"{HARNESS_PATH}#semanticPathEvidence.providerEvidence", "provider evidence must cover required services")
    non_claims = set(harness.get("nonClaims", []))
    missing_non_claims = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing_non_claims:
        F.add("USF-TEST-READINESS-016", str(HARNESS_PATH), f"missing non-claims: {missing_non_claims}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(harness.get("allowedClaims", [])))
    if bad or harness.get("testReadinessClaimAllowed") is not False:
        F.add("USF-TEST-READINESS-016", str(HARNESS_PATH), "harness overclaims test readiness")


def check_lifecycle(F: Findings, state: dict[str, Any]) -> None:
    lifecycle = state["lifecycle"]
    if not isinstance(lifecycle, dict):
        F.add("USF-TEST-READINESS-017", str(LIFECYCLE_PATH), "lifecycle file is missing")
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "testEnvironmentContract",
        "composedSemanticHarness",
        "composeTarget",
        "proofCommand",
        "repeatedHarnessCommand",
        "runtimeMode",
        "providerMode",
        "inMemoryServiceSubstituteAllowed",
        "runCount",
        "fixtureLifecycle",
        "repeatabilityEvidence",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    ):
        if key not in lifecycle:
            F.add("USF-TEST-READINESS-017", str(LIFECYCLE_PATH), f"missing top-level field {key}")
    if lifecycle.get("issueId") != "USF-237" or lifecycle.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-017", str(LIFECYCLE_PATH), "issue linkage must be USF-237 under USF-234")
    if lifecycle.get("testEnvironmentContract") != str(CONTRACT_PATH) or lifecycle.get("composedSemanticHarness") != str(HARNESS_PATH):
        F.add("USF-TEST-READINESS-017", str(LIFECYCLE_PATH), "lifecycle must link the service contract and harness")
    if lifecycle.get("composeTarget") != COMPOSE_TARGET:
        F.add("USF-TEST-READINESS-017", str(LIFECYCLE_PATH), "lifecycle must use canonical test Compose target")
    if lifecycle.get("runtimeMode") != "dev-compose-backed" or lifecycle.get("providerMode") != "local-composed-real-service":
        F.add("USF-TEST-READINESS-017", str(LIFECYCLE_PATH), "lifecycle must record composed runtime/provider mode")
    if lifecycle.get("inMemoryServiceSubstituteAllowed") is not False:
        F.add("USF-TEST-READINESS-017", str(LIFECYCLE_PATH), "lifecycle must forbid in-memory service substitutes")
    if lifecycle.get("runCount") != 2:
        F.add("USF-TEST-READINESS-019", str(LIFECYCLE_PATH), "lifecycle must require two sequential runs")
    commands = set(lifecycle.get("validationCommands", []))
    if lifecycle.get("proofCommand") != LIFECYCLE_COMMAND or LIFECYCLE_COMMAND not in commands:
        F.add("USF-TEST-READINESS-018", str(LIFECYCLE_PATH), "fixture lifecycle proof command is missing or stale")
    if lifecycle.get("repeatedHarnessCommand") != HARNESS_COMMAND:
        F.add("USF-TEST-READINESS-018", str(LIFECYCLE_PATH), "fixture lifecycle must repeat the semantic harness command")
    fixture = lifecycle.get("fixtureLifecycle")
    required_fixture_fields = {
        "seed",
        "reset",
        "cleanup",
        "teardown",
        "determinism",
        "orderIndependence",
        "failureDiagnosis",
        "realDataBoundary",
    }
    if not isinstance(fixture, dict) or not required_fixture_fields.issubset(fixture):
        F.add("USF-TEST-READINESS-020", f"{LIFECYCLE_PATH}#fixtureLifecycle", "seed reset cleanup teardown determinism and diagnostics are required")
    else:
        fixture_text = " ".join(str(value).lower() for value in fixture.values())
        for token in ("synthetic", "compose down", "containers", "volumes", "stable semantic fingerprints", "no real tenant data"):
            if token not in fixture_text:
                F.add("USF-TEST-READINESS-020", f"{LIFECYCLE_PATH}#fixtureLifecycle", f"fixture lifecycle missing {token}")
    repeat = lifecycle.get("repeatabilityEvidence")
    required_repeat_fields = {
        "firstRunRequired",
        "secondRunRequired",
        "stableFingerprintFields",
        "stableFingerprintMatchedRequired",
        "composeProjectCleanupCheckedAfterEachRun",
        "repeatedRunDeterministicRequired",
    }
    if not isinstance(repeat, dict) or not required_repeat_fields.issubset(repeat):
        F.add("USF-TEST-READINESS-019", f"{LIFECYCLE_PATH}#repeatabilityEvidence", "repeatability evidence fields are incomplete")
    else:
        for key in (
            "firstRunRequired",
            "secondRunRequired",
            "stableFingerprintMatchedRequired",
            "composeProjectCleanupCheckedAfterEachRun",
            "repeatedRunDeterministicRequired",
        ):
            if repeat.get(key) is not True:
                F.add("USF-TEST-READINESS-019", f"{LIFECYCLE_PATH}#repeatabilityEvidence.{key}", "repeatability marker must be true")
        fields = set(repeat.get("stableFingerprintFields", []))
        for required in ("composeTarget", "providerMode", "requiredServiceIds", "apiComposedProviderBindingsActive", "workerComposedProviderEvidenceCount", "deferredBoundaryCount"):
            if required not in fields:
                F.add("USF-TEST-READINESS-019", f"{LIFECYCLE_PATH}#repeatabilityEvidence.stableFingerprintFields", f"missing stable field {required}")
    non_claims = set(lifecycle.get("nonClaims", []))
    missing_non_claims = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing_non_claims:
        F.add("USF-TEST-READINESS-021", str(LIFECYCLE_PATH), f"missing non-claims: {missing_non_claims}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(lifecycle.get("allowedClaims", [])))
    if bad or lifecycle.get("testReadinessClaimAllowed") is not False:
        F.add("USF-TEST-READINESS-021", str(LIFECYCLE_PATH), "fixture lifecycle overclaims test readiness")


def _row_by_id(rows: Any, key: str) -> dict[str, dict[str, Any]]:
    if not isinstance(rows, list):
        return {}
    return {
        str(row.get(key)): row
        for row in rows
        if isinstance(row, dict) and row.get(key) is not None
    }


def check_command_surface(F: Findings, state: dict[str, Any]) -> None:
    command_surface = state["commandSurface"]
    if not isinstance(command_surface, dict):
        F.add("USF-TEST-READINESS-022", str(COMMAND_SURFACE_PATH), "command surface file is missing")
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "dependsOnIssueIds",
        "testEnvironmentContract",
        "composedSemanticHarness",
        "deterministicFixtureLifecycle",
        "canonicalCommands",
        "packageScripts",
        "makeTargets",
        "composedExecution",
        "ciLocalAlignment",
        "sonarGatePreservation",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    ):
        if key not in command_surface:
            F.add("USF-TEST-READINESS-022", str(COMMAND_SURFACE_PATH), f"missing top-level field {key}")
    if command_surface.get("issueId") != "USF-238" or command_surface.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-022", str(COMMAND_SURFACE_PATH), "issue linkage must be USF-238 under USF-234")
    depends = set(command_surface.get("dependsOnIssueIds", []))
    if not {"USF-235", "USF-236", "USF-237"}.issubset(depends):
        F.add("USF-TEST-READINESS-022", str(COMMAND_SURFACE_PATH), "command surface must depend on USF-235, USF-236, and USF-237")
    expected_links = {
        "testEnvironmentContract": str(CONTRACT_PATH),
        "composedSemanticHarness": str(HARNESS_PATH),
        "deterministicFixtureLifecycle": str(LIFECYCLE_PATH),
    }
    for key, expected in expected_links.items():
        if command_surface.get(key) != expected:
            F.add("USF-TEST-READINESS-022", str(COMMAND_SURFACE_PATH), f"{key} must link {expected}")

    command_rows = _row_by_id(command_surface.get("canonicalCommands"), "id")
    expected_commands = {
        "test-readiness-full": TEST_READINESS_COMMAND,
        "test-readiness-composed": TEST_READINESS_COMPOSED_COMMAND,
        "test-readiness-assurance": TEST_READINESS_ASSURANCE_COMMAND,
        "test-readiness-semantic": HARNESS_COMMAND,
        "test-readiness-fixtures": LIFECYCLE_COMMAND,
        "test-readiness-validator": "corepack pnpm test-readiness:validate",
    }
    for command_id, expected in expected_commands.items():
        row = command_rows.get(command_id)
        if not row or row.get("command") != expected:
            F.add("USF-TEST-READINESS-022", f"{COMMAND_SURFACE_PATH}#canonicalCommands.{command_id}", "canonical command is missing or stale")
        elif command_id in {"test-readiness-full", "test-readiness-composed"} and row.get("requiresComposedServices") is not True:
            F.add("USF-TEST-READINESS-022", f"{COMMAND_SURFACE_PATH}#canonicalCommands.{command_id}", "composed command must require composed services")
        elif row.get("inMemoryServiceSubstituteAllowed") is not False:
            F.add("USF-TEST-READINESS-027", f"{COMMAND_SURFACE_PATH}#canonicalCommands.{command_id}", "canonical command must forbid in-memory service substitutes")

    composed = command_surface.get("composedExecution")
    if not isinstance(composed, dict):
        F.add("USF-TEST-READINESS-022", f"{COMMAND_SURFACE_PATH}#composedExecution", "composedExecution must be present")
    else:
        if composed.get("composeTarget") != COMPOSE_TARGET:
            F.add("USF-TEST-READINESS-022", f"{COMMAND_SURFACE_PATH}#composedExecution", "composed execution must use canonical test Compose target")
        if composed.get("inMemoryServiceSubstituteAllowed") is not False:
            F.add("USF-TEST-READINESS-027", f"{COMMAND_SURFACE_PATH}#composedExecution", "composed execution must forbid in-memory service substitutes")
        commands = set(composed.get("requiredCommands", []))
        for expected in (HARNESS_COMMAND, LIFECYCLE_COMMAND, TEST_READINESS_COMPOSED_COMMAND):
            if expected not in commands:
                F.add("USF-TEST-READINESS-022", f"{COMMAND_SURFACE_PATH}#composedExecution.requiredCommands", f"missing command {expected}")

    validation_commands = set(command_surface.get("validationCommands", []))
    for expected in (
        TEST_READINESS_COMMAND,
        TEST_READINESS_COMPOSED_COMMAND,
        TEST_READINESS_ASSURANCE_COMMAND,
        "make test-ready",
        "make test-composed",
        "make test-assurance",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
    ):
        if expected not in validation_commands:
            F.add("USF-TEST-READINESS-022", f"{COMMAND_SURFACE_PATH}#validationCommands", f"missing validation command {expected}")

    ci = command_surface.get("ciLocalAlignment")
    if not isinstance(ci, dict):
        F.add("USF-TEST-READINESS-025", f"{COMMAND_SURFACE_PATH}#ciLocalAlignment", "ciLocalAlignment must be present")
    else:
        if ci.get("localCanonicalCommand") != TEST_READINESS_COMMAND:
            F.add("USF-TEST-READINESS-025", f"{COMMAND_SURFACE_PATH}#ciLocalAlignment", "local canonical command must be test-readiness")
        if ci.get("makeTarget") != "test-ready":
            F.add("USF-TEST-READINESS-025", f"{COMMAND_SURFACE_PATH}#ciLocalAlignment", "make target must be test-ready")
        if ci.get("githubSpecCheckAloneSufficient") is not False:
            F.add("USF-TEST-READINESS-025", f"{COMMAND_SURFACE_PATH}#ciLocalAlignment", "GitHub spec check alone must not satisfy test readiness")
        if ci.get("ciEquivalentCommand") != TEST_READINESS_COMMAND:
            F.add("USF-TEST-READINESS-025", f"{COMMAND_SURFACE_PATH}#ciLocalAlignment", "CI equivalent command must match local canonical command")

    sonar = command_surface.get("sonarGatePreservation")
    if not isinstance(sonar, dict):
        F.add("USF-TEST-READINESS-026", f"{COMMAND_SURFACE_PATH}#sonarGatePreservation", "sonarGatePreservation must be present")
    else:
        if sonar.get("command") != TEST_READINESS_ASSURANCE_COMMAND or sonar.get("proofCommand") != SONAR_COMMAND:
            F.add("USF-TEST-READINESS-026", f"{COMMAND_SURFACE_PATH}#sonarGatePreservation", "Sonar proof command must be preserved")
        if sonar.get("zeroIssueGatePreserved") is not True:
            F.add("USF-TEST-READINESS-026", f"{COMMAND_SURFACE_PATH}#sonarGatePreservation", "zero-issue gate must be preserved")
        if sonar.get("evidence") != "docs/architecture/sonarqube-zero-issue-quality-gate-assurance.json":
            F.add("USF-TEST-READINESS-026", f"{COMMAND_SURFACE_PATH}#sonarGatePreservation", "Sonar evidence path must be linked")

    non_claims = set(command_surface.get("nonClaims", []))
    missing_non_claims = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing_non_claims:
        F.add("USF-TEST-READINESS-027", str(COMMAND_SURFACE_PATH), f"missing non-claims: {missing_non_claims}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(command_surface.get("allowedClaims", [])))
    if bad or command_surface.get("testReadinessClaimAllowed") is not False:
        F.add("USF-TEST-READINESS-027", str(COMMAND_SURFACE_PATH), "command surface overclaims test readiness")


def check_makefile_wiring(F: Findings, makefile: str) -> None:
    expected_targets = {
        "test-ready": "corepack pnpm test-readiness",
        "test-composed": "corepack pnpm test-readiness:composed",
        "test-assurance": "corepack pnpm test-readiness:assurance",
        "test-readiness-validate": "corepack pnpm test-readiness:validate",
        "test-readiness-semantic": "corepack pnpm test-readiness:semantic",
        "test-readiness-fixtures": "corepack pnpm test-readiness:fixtures",
    }
    for target, command in expected_targets.items():
        pattern = rf"^{re.escape(target)}:\n\t{re.escape(command)}$"
        if not re.search(pattern, makefile, re.MULTILINE):
            F.add("USF-TEST-READINESS-024", f"{MAKEFILE_PATH}#{target}", "Make target is missing or stale")
    if not re.search(r"^test:\s+test-ready$", makefile, re.MULTILINE):
        F.add("USF-TEST-READINESS-024", f"{MAKEFILE_PATH}#test", "make test must alias test-ready")
    for help_text in ("make test-ready", "make test-composed", "make test-assurance"):
        if help_text not in makefile:
            F.add("USF-TEST-READINESS-024", f"{MAKEFILE_PATH}#help", f"help output missing {help_text}")


def check_package_wiring(F: Findings, package: dict[str, Any]) -> None:
    scripts = package.get("scripts", {})
    script = scripts.get("test-readiness:validate")
    if script != "python3 tools/validate-test-readiness/validate-test-readiness.py all --json":
        F.add("USF-TEST-READINESS-010", "package.json#scripts", "test-readiness:validate script is missing or stale")
    repo_validate = scripts.get("repo:validate", "")
    if "tools/validate-test-readiness/validate-test-readiness.py all --json" not in repo_validate:
        F.add("USF-TEST-READINESS-010", "package.json#scripts.repo:validate", "repo:validate must include test-readiness validator")
    if scripts.get("test-readiness:semantic") != HARNESS_SCRIPT:
        F.add("USF-TEST-READINESS-014", "package.json#scripts", "test-readiness:semantic script is missing or stale")
    if scripts.get("test-readiness:fixtures") != LIFECYCLE_SCRIPT:
        F.add("USF-TEST-READINESS-018", "package.json#scripts", "test-readiness:fixtures script is missing or stale")
    expected_scripts = {
        "test-readiness": TEST_READINESS_SCRIPT,
        "test-readiness:composed": TEST_READINESS_COMPOSED_SCRIPT,
        "test-readiness:assurance": TEST_READINESS_ASSURANCE_SCRIPT,
    }
    for key, expected in expected_scripts.items():
        if scripts.get(key) != expected:
            F.add("USF-TEST-READINESS-023", f"package.json#scripts.{key}", "test-readiness script is missing or stale")


def run_checks(state: dict[str, Any]) -> Findings:
    F = Findings()
    check_shape(F, state["contract"])
    check_service_inventory(F, state)
    check_harness(F, state)
    check_lifecycle(F, state)
    check_command_surface(F, state)
    check_claims(F, state["contract"])
    check_enterprise_refs(F, state)
    check_package_wiring(F, state["package"])
    check_makefile_wiring(F, state["makefile"])
    return F


def run_selftest() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if not (ROOT / PLANTED_DEFECT_DIR).exists():
        return findings
    for path in sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json")):
        defect = json.loads(path.read_text(encoding="utf-8"))
        expected = defect.get("expectedRule")
        F = run_checks(load_state(defect))
        if expected not in F.rule_ids():
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-TEST-READINESS-SELFTEST",
                    "subject": str(path.relative_to(ROOT)),
                    "message": f"expected {expected}, got {sorted(F.rule_ids())}",
                }
            )
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.mode == "selftest":
        findings = run_selftest()
    else:
        findings = run_checks(load_state()).items + run_selftest()

    if args.json:
        print(json.dumps({"mode": args.mode, "ok": not findings, "findings": findings, "rules": RULES}, indent=2))
    else:
        for finding in findings:
            print(f"{finding['severity']} {finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
