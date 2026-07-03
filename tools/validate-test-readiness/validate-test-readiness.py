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

import yaml


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = Path("docs/architecture/test-environment-service-contract.json")
HARNESS_PATH = Path("docs/architecture/composed-semantic-test-harness.json")
LIFECYCLE_PATH = Path("docs/architecture/deterministic-test-fixture-lifecycle.json")
COMMAND_SURFACE_PATH = Path("docs/architecture/test-readiness-command-surface-and-ci-gate.json")
OBLIGATION_MANIFEST_PATH = Path("docs/architecture/semantic-service-test-obligation-manifest.json")
FIXTURE_CORPUS_PATH = Path("tests/packages/fixtures/service-fixture-corpus.json")
INTEGRATION_MATRIX_PATH = Path("docs/architecture/composed-service-integration-test-matrix.json")
SEMANTIC_UNIT_SUITE_PATH = Path("docs/architecture/semantic-unit-test-suite.json")
FUNCTIONAL_REGRESSION_SUITE_PATH = Path("docs/architecture/functional-service-regression-suite.json")
ENTERPRISE_CONTROL_SUITE_PATH = Path("docs/architecture/enterprise-control-evidence-test-suite.json")
SERVICE_CATALOGUE_PATH = Path("spec/instances/compose-service/service-catalogue.json")
TEST_OBLIGATION_SCHEMA_PATH = Path("spec/schemas/test-obligation-manifest.schema.json")
SCHEMA_REGISTRY_PATH = Path("spec/registries/schema-registry.json")
SEMANTIC_CONTRACT_DIR = Path("spec/instances/semantic-contract")
ENTERPRISE_MODEL_PATH = Path("spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json")
PACKAGE_PATH = Path("package.json")
MAKEFILE_PATH = Path("Makefile")
COMPOSE_TEST_PATH = Path("compose/compose.test.generated.yaml")
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
    "USF-TEST-READINESS-029": ("blocking", "semantic service test obligation manifest is missing or invalid"),
    "USF-TEST-READINESS-030": ("blocking", "semantic service test obligation manifest lacks service catalogue coverage"),
    "USF-TEST-READINESS-031": ("blocking", "semantic service test obligation manifest lacks semantic contract coverage"),
    "USF-TEST-READINESS-032": ("blocking", "semantic service test obligation manifest lacks generated Compose service or profile coverage"),
    "USF-TEST-READINESS-033": ("blocking", "service-backed test obligation allows in-memory substitution or lacks fixture mapping"),
    "USF-TEST-READINESS-034": ("blocking", "test obligation lacks owner issue, validation command, evidence id, or test mapping"),
    "USF-TEST-READINESS-035": ("blocking", "test obligation manifest lacks future AI-delivered work guardrail"),
    "USF-TEST-READINESS-036": ("blocking", "test obligation manifest lacks authentication authorization tenant role or permission coverage"),
    "USF-TEST-READINESS-037": ("blocking", "test obligation manifest lacks data lifecycle backup restore bulk or migration coverage"),
    "USF-TEST-READINESS-038": ("blocking", "test obligation manifest lacks operational resilience evidence coverage"),
    "USF-TEST-READINESS-039": ("blocking", "test obligation manifest lacks schema registry enterprise evidence linkage or preserves insufficient non-claims"),
    "USF-TEST-READINESS-040": ("blocking", "synthetic deterministic fixture corpus is missing or invalid"),
    "USF-TEST-READINESS-041": ("blocking", "fixture corpus lacks service obligation coverage"),
    "USF-TEST-READINESS-042": ("blocking", "fixture corpus lacks semantic contract coverage"),
    "USF-TEST-READINESS-043": ("blocking", "fixture corpus lacks seeder resetter cleanup teardown or provenance mapping"),
    "USF-TEST-READINESS-044": ("blocking", "fixture corpus lacks repeatability or failure recovery evidence"),
    "USF-TEST-READINESS-045": ("blocking", "fixture corpus lacks test-layer wiring"),
    "USF-TEST-READINESS-046": ("blocking", "fixture corpus lacks enterprise evidence linkage or preserves insufficient non-claims"),
    "USF-TEST-READINESS-047": ("blocking", "composed service integration matrix is missing or invalid"),
    "USF-TEST-READINESS-048": ("blocking", "generated test Compose service lacks integration coverage or disposition"),
    "USF-TEST-READINESS-049": ("blocking", "generated test Compose profile lacks integration coverage"),
    "USF-TEST-READINESS-050": ("blocking", "service catalogue row lacks test integration disposition"),
    "USF-TEST-READINESS-051": ("blocking", "composed service integration matrix does not use canonical test Compose target or proof command"),
    "USF-TEST-READINESS-052": ("blocking", "composed service integration matrix allows in-memory service-backed substitutes"),
    "USF-TEST-READINESS-053": ("blocking", "profile-gated service is skipped without bounded disposition"),
    "USF-TEST-READINESS-054": ("blocking", "composed service integration matrix lacks enterprise evidence linkage or preserves insufficient non-claims"),
    "USF-TEST-READINESS-055": ("blocking", "semantic unit test suite inventory is missing or invalid"),
    "USF-TEST-READINESS-056": ("blocking", "semantic unit obligation lacks a mapped unit test"),
    "USF-TEST-READINESS-057": ("blocking", "semantic unit mapped test file or test name is missing or stale"),
    "USF-TEST-READINESS-058": ("blocking", "semantic unit suite allows service-backed substitute or unsafe coverage claim"),
    "USF-TEST-READINESS-059": ("blocking", "semantic unit suite lacks unit LCOV contribution boundary"),
    "USF-TEST-READINESS-060": ("blocking", "semantic unit suite lacks enterprise evidence linkage or preserves insufficient non-claims"),
    "USF-TEST-READINESS-061": ("blocking", "functional regression suite evidence is missing or invalid"),
    "USF-TEST-READINESS-062": ("blocking", "functional regression semantic obligation mapping is missing or stale"),
    "USF-TEST-READINESS-063": ("blocking", "functional regression service obligation mapping is missing or stale"),
    "USF-TEST-READINESS-064": ("blocking", "functional regression behaviour case coverage is incomplete"),
    "USF-TEST-READINESS-065": ("blocking", "functional regression suite allows service-backed substitute or readiness overclaim"),
    "USF-TEST-READINESS-066": ("blocking", "functional regression suite lacks enterprise evidence linkage or preserves insufficient non-claims"),
    "USF-TEST-READINESS-067": ("blocking", "enterprise control evidence test suite is missing invalid or stale"),
    "USF-TEST-READINESS-068": ("blocking", "enterprise control evidence suite lacks SoA support mapping coverage"),
    "USF-TEST-READINESS-069": ("blocking", "enterprise control evidence suite lacks pinned evidence register coverage"),
    "USF-TEST-READINESS-070": ("blocking", "enterprise control evidence suite lacks threat model coverage"),
    "USF-TEST-READINESS-071": ("blocking", "enterprise control evidence suite lacks access posture coverage"),
    "USF-TEST-READINESS-072": ("blocking", "enterprise control evidence suite lacks resilience posture coverage"),
    "USF-TEST-READINESS-073": ("blocking", "enterprise control evidence suite lacks incident vulnerability posture coverage"),
    "USF-TEST-READINESS-074": ("blocking", "enterprise control evidence suite lacks privacy data minimisation posture coverage"),
    "USF-TEST-READINESS-075": ("blocking", "enterprise control evidence suite preserves insufficient non-claims or overclaims readiness"),
    "USF-TEST-READINESS-076": ("blocking", "expanded test-readiness obligation category is missing or stale"),
    "USF-TEST-READINESS-077": ("blocking", "expanded test-readiness dependency graph is incomplete"),
    "USF-TEST-READINESS-078": ("blocking", "expanded test-readiness command or surface mapping is incomplete"),
    "USF-TEST-READINESS-079": ("blocking", "expanded test-readiness enterprise evidence linkage is incomplete"),
    "USF-TEST-READINESS-080": ("blocking", "expanded test-readiness obligation overclaims readiness or compliance"),
    "USF-TEST-READINESS-SELFTEST": ("blocking", "planted test-readiness defect did not raise its expected rule"),
}

COMPOSE_TARGET = "compose/compose.test.generated.yaml"
HARNESS_COMMAND = "corepack pnpm test-readiness:semantic"
HARNESS_SCRIPT = "tsx packages/proof/src/composed-semantic-test-harness-proof.ts"
LIFECYCLE_COMMAND = "corepack pnpm test-readiness:fixtures"
LIFECYCLE_SCRIPT = "tsx packages/proof/src/deterministic-test-fixture-lifecycle-proof.ts"
TEST_READINESS_COMMAND = "corepack pnpm test-readiness"
TEST_READINESS_SCRIPT = "pnpm test-readiness:validate && pnpm test-readiness:semantic && pnpm test-readiness:fixtures && pnpm test-readiness:integration && pnpm test-readiness:assurance"
TEST_READINESS_COMPOSED_COMMAND = "corepack pnpm test-readiness:composed"
TEST_READINESS_COMPOSED_SCRIPT = "pnpm test-readiness:semantic && pnpm test-readiness:fixtures && pnpm test-readiness:integration"
TEST_READINESS_ASSURANCE_COMMAND = "corepack pnpm test-readiness:assurance"
TEST_READINESS_ASSURANCE_SCRIPT = "pnpm proof:assurance:sonarqube"
SONAR_COMMAND = "corepack pnpm proof:assurance:sonarqube"
OBLIGATION_MANIFEST_COMMAND = "python3 tools/validate-test-readiness/validate-test-readiness.py all --json"
FIXTURE_CORPUS_COMMAND = "corepack pnpm test-readiness:fixtures"
INTEGRATION_MATRIX_COMMAND = "corepack pnpm test-readiness:integration"
INTEGRATION_MATRIX_SCRIPT = "tsx packages/proof/src/composed-service-integration-matrix-proof.ts"
FUNCTIONAL_REGRESSION_COMMAND = "corepack pnpm test -- tests/packages/semantic-functional-regression-suite.test.ts"
FUNCTIONAL_REGRESSION_TEST_PATH = "tests/packages/semantic-functional-regression-suite.test.ts"
ENTERPRISE_CONTROL_COMMAND = "corepack pnpm test -- tests/packages/enterprise-control-evidence-suite.test.ts"
ENTERPRISE_CONTROL_TEST_PATH = "tests/packages/enterprise-control-evidence-suite.test.ts"
REQUIRED_FUNCTIONAL_REGRESSION_CASES = {
    "positive",
    "negative",
    "authorization",
    "tenant-isolation",
    "audit",
    "readiness",
    "provider-boundary",
}
REQUIRED_INTEGRATION_SERVICE_COVERAGE = {
    "startReadiness",
    "seed",
    "positiveOperation",
    "negativeOperation",
    "degradedUnavailable",
    "cleanup",
    "teardown",
    "reset",
    "auditObservability",
    "composeTargetMetadata",
    "serviceSpecificReadiness",
    "hostBindingPosture",
    "generatedComposeDerivation",
    "redaction",
}
REQUIRED_INTEGRATION_PROFILE_FLAGS = {
    "mustStart",
    "mustReadinessCheck",
    "mustSeed",
    "mustExercise",
    "mustTeardown",
    "mustReset",
    "mustEvidence",
}
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
REQUIRED_OBLIGATION_CLASSES = {
    "unit",
    "composed-integration",
    "enterprise-evidence",
    "functional-regression",
    "operational-resilience",
    "design-contract-drift",
    "missing-evidence-regression",
    "seed-reset-fixture",
    "auth-tenant-role-permission",
    "data-lifecycle",
    "backup-restore-bulk-migration",
    "compose-profile-exercise",
    "future-ai-guardrail",
    "bounded-non-test-disposition",
    "out-of-scope-disposition",
}
EXPANDED_OBLIGATION_CATEGORIES = {
    "USF-253": "security-abuse-fuzzing",
    "USF-254": "performance-concurrency-resource",
    "USF-255": "supply-chain-sbom-licence",
    "USF-256": "mutation-fault-injection",
    "USF-257": "adversarial-semantic-testing",
    "USF-258": "environment-tooling-governance",
}
EXPANDED_OBLIGATION_CLASS_IDS = set(EXPANDED_OBLIGATION_CATEGORIES.values())
EXPANDED_OBLIGATION_ISSUES = set(EXPANDED_OBLIGATION_CATEGORIES)
EXPANDED_GATE_ISSUES = {"USF-259", "USF-260"}
REQUIRED_OBLIGATION_ISSUES = {
    "USF-239",
    "USF-240",
    "USF-241",
    "USF-242",
    "USF-243",
    "USF-244",
    "USF-245",
    "USF-246",
    "USF-247",
    "USF-248",
    "USF-249",
    "USF-250",
    "USF-251",
    "USF-252",
    "USF-253",
    "USF-254",
    "USF-255",
    "USF-256",
    "USF-257",
    "USF-258",
    "USF-259",
    "USF-260",
    "USF-234",
}
AUTH_SERVICE_IDS = {"keycloak", "keycloak-db", "postgres", "pgadmin", "openbao", "caddy"}
DATA_SERVICE_IDS = {
    "postgres",
    "minio",
    "openbao",
    "redis",
    "meilisearch",
    "clickhouse",
    "localstack",
    "pgbackrest",
    "clamav",
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


def read_json_like_yaml(path: Path) -> Any:
    with (ROOT / path).open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def read_semantic_contracts() -> dict[str, dict[str, Any]]:
    contracts: dict[str, dict[str, Any]] = {}
    for path in sorted((ROOT / SEMANTIC_CONTRACT_DIR).glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        data["_path"] = str(path.relative_to(ROOT))
        contracts[str(data.get("id"))] = data
    return contracts


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


def apply_obligation_manifest_defect(manifest: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeObligationManifest"):
        return None
    if manifest is None:
        return None
    out = copy.deepcopy(manifest)
    for key, value in defect.get("obligationManifestSet", {}).items():
        out[key] = value
    for key in defect.get("obligationManifestDrop", []):
        out.pop(key, None)
    for service_id in defect.get("obligationDropServiceIds", []):
        out["serviceObligations"] = [
            row for row in out.get("serviceObligations", []) if row.get("serviceId") != service_id
        ]
    for contract_id in defect.get("obligationDropSemanticContractIds", []):
        out["semanticContractObligations"] = [
            row
            for row in out.get("semanticContractObligations", [])
            if row.get("contractId") != contract_id
        ]
    for profile in defect.get("obligationDropProfiles", []):
        out["profileObligations"] = [
            row for row in out.get("profileObligations", []) if row.get("profile") != profile
        ]
    for class_id in defect.get("obligationDropClassIds", []):
        out["obligationClasses"] = [
            row for row in out.get("obligationClasses", []) if row.get("id") != class_id
        ]
    for issue_id in defect.get("obligationDropDependencyGraphIssueIds", []):
        out["dependencyGraph"] = [
            row for row in out.get("dependencyGraph", []) if row.get("issueId") != issue_id
        ]
    for issue_id in defect.get("obligationDropExpandedCategoryIssueIds", []):
        out["expandedCategoryObligations"] = [
            row
            for row in out.get("expandedCategoryObligations", [])
            if row.get("issueId") != issue_id
        ]
    for category_id in defect.get("obligationDropExpandedCategoryIds", []):
        out["expandedCategoryObligations"] = [
            row
            for row in out.get("expandedCategoryObligations", [])
            if row.get("categoryId") != category_id
        ]
    for patch in defect.get("obligationDependencyGraphPatch", []):
        for row in out.get("dependencyGraph", []):
            if row.get("issueId") != patch.get("issueId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for issue_id in patch.get("dropDependsOn", []):
                row["dependsOn"] = [
                    value for value in row.get("dependsOn", []) if value != issue_id
                ]
            for issue_id in patch.get("dropBlocks", []):
                row["blocks"] = [
                    value for value in row.get("blocks", []) if value != issue_id
                ]
    for patch in defect.get("obligationExpandedCategoryPatch", []):
        for row in out.get("expandedCategoryObligations", []):
            if row.get("issueId") != patch.get("issueId") and row.get("categoryId") != patch.get("categoryId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for key, value in patch.get("append", {}).items():
                row.setdefault(key, []).append(value)
            for section in patch.get("enterpriseRefDrop", []):
                row.get("enterpriseEvidenceRefs", {}).pop(section, None)
            for claim in patch.get("dropNonClaims", []):
                row["nonClaims"] = [
                    value for value in row.get("nonClaims", []) if value != claim
                ]
    for patch in defect.get("obligationServicePatch", []):
        for row in out.get("serviceObligations", []):
            if row.get("serviceId") != patch.get("serviceId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for class_id in patch.get("dropClassIds", []):
                row["obligationClassIds"] = [
                    value for value in row.get("obligationClassIds", []) if value != class_id
                ]
            for issue_id in patch.get("dropOwnerIssueIds", []):
                row["ownerIssueIds"] = [
                    value for value in row.get("ownerIssueIds", []) if value != issue_id
                ]
            for coverage_key, value in patch.get("testLayerCoverageSet", {}).items():
                row.setdefault("testLayerCoverage", {})[coverage_key] = value
    for patch in defect.get("obligationSemanticPatch", []):
        for row in out.get("semanticContractObligations", []):
            if row.get("contractId") != patch.get("contractId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for class_id in patch.get("dropClassIds", []):
                row["obligationClassIds"] = [
                    value for value in row.get("obligationClassIds", []) if value != class_id
                ]
            for issue_id in patch.get("dropOwnerIssueIds", []):
                row["ownerIssueIds"] = [
                    value for value in row.get("ownerIssueIds", []) if value != issue_id
                ]
    for section in defect.get("obligationEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    for key, value in defect.get("futureAiGuardrailSet", {}).items():
        out.setdefault("futureAiChangeGuardrail", {})[key] = value
    for key in defect.get("futureAiGuardrailDrop", []):
        out.setdefault("futureAiChangeGuardrail", {}).pop(key, None)
    if defect.get("obligationDropNonClaims"):
        dropped = set(defect.get("obligationDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("obligationAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["obligationAppendAllowedClaim"])
    return out


def apply_fixture_corpus_defect(corpus: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeFixtureCorpus"):
        return None
    if corpus is None:
        return None
    out = copy.deepcopy(corpus)
    for key, value in defect.get("fixtureCorpusSet", {}).items():
        out[key] = value
    for key in defect.get("fixtureCorpusDrop", []):
        out.pop(key, None)
    for service_id in defect.get("fixtureCorpusDropServiceIds", []):
        out["serviceFixtures"] = [
            row for row in out.get("serviceFixtures", []) if row.get("serviceId") != service_id
        ]
    for contract_id in defect.get("fixtureCorpusDropSemanticContractIds", []):
        out["semanticContractFixtures"] = [
            row
            for row in out.get("semanticContractFixtures", [])
            if row.get("contractId") != contract_id
        ]
    for patch in defect.get("fixtureServicePatch", []):
        for row in out.get("serviceFixtures", []):
            if row.get("serviceId") != patch.get("serviceId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for section, section_patch in patch.get("sectionPatch", {}).items():
                target = row.setdefault(section, {})
                if not isinstance(target, dict):
                    continue
                for key in section_patch.get("drop", []):
                    target.pop(key, None)
                for key, value in section_patch.get("set", {}).items():
                    target[key] = value
    for patch in defect.get("fixtureSemanticPatch", []):
        for row in out.get("semanticContractFixtures", []):
            if row.get("contractId") != patch.get("contractId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for section, section_patch in patch.get("sectionPatch", {}).items():
                target = row.setdefault(section, {})
                if not isinstance(target, dict):
                    continue
                for key in section_patch.get("drop", []):
                    target.pop(key, None)
                for key, value in section_patch.get("set", {}).items():
                    target[key] = value
    for section in defect.get("fixtureCorpusEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    if defect.get("fixtureCorpusDropNonClaims"):
        dropped = set(defect.get("fixtureCorpusDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("fixtureCorpusAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["fixtureCorpusAppendAllowedClaim"])
    return out


def apply_integration_matrix_defect(matrix: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeIntegrationMatrix"):
        return None
    if matrix is None:
        return None
    out = copy.deepcopy(matrix)
    for key, value in defect.get("integrationMatrixSet", {}).items():
        out[key] = value
    for key in defect.get("integrationMatrixDrop", []):
        out.pop(key, None)
    for service_id in defect.get("integrationMatrixDropServiceIds", []):
        out["serviceIntegrationRows"] = [
            row for row in out.get("serviceIntegrationRows", []) if row.get("serviceId") != service_id
        ]
    for profile in defect.get("integrationMatrixDropProfiles", []):
        out["profileIntegrationRows"] = [
            row for row in out.get("profileIntegrationRows", []) if row.get("profile") != profile
        ]
    for service_id in defect.get("integrationMatrixDropDispositionIds", []):
        out["serviceCatalogueDispositionRows"] = [
            row
            for row in out.get("serviceCatalogueDispositionRows", [])
            if row.get("serviceCatalogueId") != service_id
        ]
    for patch in defect.get("integrationMatrixServicePatch", []):
        for row in out.get("serviceIntegrationRows", []):
            if row.get("serviceId") != patch.get("serviceId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            evidence = row.get("evidenceTests")
            if isinstance(evidence, dict):
                for key in patch.get("dropEvidenceTests", []):
                    evidence.pop(key, None)
                for key, value in patch.get("setEvidenceTests", {}).items():
                    evidence[key] = value
    for patch in defect.get("integrationMatrixProfilePatch", []):
        for row in out.get("profileIntegrationRows", []):
            if row.get("profile") != patch.get("profile"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    for patch in defect.get("integrationMatrixDispositionPatch", []):
        for row in out.get("serviceCatalogueDispositionRows", []):
            if row.get("serviceCatalogueId") != patch.get("serviceCatalogueId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    for section in defect.get("integrationMatrixEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    if defect.get("integrationMatrixDropNonClaims"):
        dropped = set(defect.get("integrationMatrixDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("integrationMatrixAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["integrationMatrixAppendAllowedClaim"])
    return out


def apply_semantic_unit_suite_defect(suite: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeSemanticUnitSuite"):
        return None
    if suite is None:
        return None
    out = copy.deepcopy(suite)
    for key, value in defect.get("semanticUnitSuiteSet", {}).items():
        out[key] = value
    for key in defect.get("semanticUnitSuiteDrop", []):
        out.pop(key, None)
    for contract_id in defect.get("semanticUnitSuiteDropContractIds", []):
        out["unitObligationMappings"] = [
            row
            for row in out.get("unitObligationMappings", [])
            if row.get("contractId") != contract_id
        ]
    for patch in defect.get("semanticUnitSuiteMappingPatch", []):
        for row in out.get("unitObligationMappings", []):
            if row.get("contractId") != patch.get("contractId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    coverage_patch = defect.get("semanticUnitSuiteCoveragePatch", {})
    if isinstance(coverage_patch, dict):
        target = out.setdefault("coverageContribution", {})
        if isinstance(target, dict):
            for key in coverage_patch.get("drop", []):
                target.pop(key, None)
            for key, value in coverage_patch.get("set", {}).items():
                target[key] = value
    for section in defect.get("semanticUnitSuiteEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    if defect.get("semanticUnitSuiteDropNonClaims"):
        dropped = set(defect.get("semanticUnitSuiteDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
        out["nonClaimsPreserved"] = [
            claim for claim in out.get("nonClaimsPreserved", []) if claim not in dropped
        ]
    if defect.get("semanticUnitSuiteAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["semanticUnitSuiteAppendAllowedClaim"])
    return out


def apply_functional_regression_suite_defect(suite: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeFunctionalRegressionSuite"):
        return None
    if suite is None:
        return None
    out = copy.deepcopy(suite)
    for key, value in defect.get("functionalRegressionSuiteSet", {}).items():
        out[key] = value
    for key in defect.get("functionalRegressionSuiteDrop", []):
        out.pop(key, None)
    for contract_id in defect.get("functionalRegressionSuiteDropContractIds", []):
        out["semanticRegressionRows"] = [
            row
            for row in out.get("semanticRegressionRows", [])
            if row.get("contractId") != contract_id
        ]
    for service_id in defect.get("functionalRegressionSuiteDropServiceIds", []):
        out["serviceRegressionRows"] = [
            row
            for row in out.get("serviceRegressionRows", [])
            if row.get("serviceId") != service_id
        ]
    for patch in defect.get("functionalRegressionSemanticPatch", []):
        for row in out.get("semanticRegressionRows", []):
            if row.get("contractId") != patch.get("contractId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for case_type in patch.get("dropBehaviourCaseTypes", []):
                row["behaviourCases"] = [
                    item
                    for item in row.get("behaviourCases", [])
                    if item.get("caseType") != case_type
                ]
    for patch in defect.get("functionalRegressionServicePatch", []):
        for row in out.get("serviceRegressionRows", []):
            if row.get("serviceId") != patch.get("serviceId"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            for case_type in patch.get("dropBehaviourCaseTypes", []):
                row["behaviourCases"] = [
                    item
                    for item in row.get("behaviourCases", [])
                    if item.get("caseType") != case_type
                ]
    for section in defect.get("functionalRegressionSuiteEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    if defect.get("functionalRegressionSuiteDropNonClaims"):
        dropped = set(defect.get("functionalRegressionSuiteDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("functionalRegressionSuiteAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["functionalRegressionSuiteAppendAllowedClaim"])
    return out


def apply_enterprise_control_suite_defect(suite: dict[str, Any] | None, defect: dict[str, Any]) -> dict[str, Any] | None:
    if defect.get("removeEnterpriseControlSuite"):
        return None
    if suite is None:
        return None
    out = copy.deepcopy(suite)
    for key, value in defect.get("enterpriseControlSuiteSet", {}).items():
        out[key] = value
    for key in defect.get("enterpriseControlSuiteDrop", []):
        out.pop(key, None)
    for section_id in defect.get("enterpriseControlSuiteDropSectionIds", []):
        out["requiredEnterpriseSections"] = [
            row
            for row in out.get("requiredEnterpriseSections", [])
            if row.get("sectionId") != section_id
        ]
    for contract_id in defect.get("enterpriseControlSuiteDropContractIds", []):
        mapping = out.setdefault("semanticServiceMapping", {})
        mapping["semanticContractIds"] = [
            value for value in mapping.get("semanticContractIds", []) if value != contract_id
        ]
    for service_id in defect.get("enterpriseControlSuiteDropServiceIds", []):
        mapping = out.setdefault("serviceBackedTestMapping", {})
        mapping["serviceIds"] = [
            value for value in mapping.get("serviceIds", []) if value != service_id
        ]
    for section in defect.get("enterpriseControlSuiteEnterpriseRefDrop", []):
        out.get("enterpriseEvidenceRefs", {}).pop(section, None)
    if defect.get("enterpriseControlSuiteDropNonClaims"):
        dropped = set(defect.get("enterpriseControlSuiteDropNonClaims", []))
        out["nonClaims"] = [claim for claim in out.get("nonClaims", []) if claim not in dropped]
    if defect.get("enterpriseControlSuiteAppendAllowedClaim"):
        out.setdefault("allowedClaims", []).append(defect["enterpriseControlSuiteAppendAllowedClaim"])
    for key, value in defect.get("enterpriseControlSuiteScopeSet", {}).items():
        out.setdefault("scope", {})[key] = value
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


def apply_schema_registry_defect(registry: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(registry)
    for schema_id in defect.get("schemaRegistryDropIds", []):
        out["schemas"] = [row for row in out.get("schemas", []) if row.get("id") != schema_id]
    for patch in defect.get("schemaRegistryPatch", []):
        for row in out.get("schemas", []):
            if row.get("id") != patch.get("id"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    return out


def apply_enterprise_model_defect(model: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(model)
    for patch in defect.get("enterpriseModelDropIds", []):
        section = patch.get("section")
        row_id = patch.get("id")
        rows = out.get(section)
        if isinstance(rows, list):
            out[section] = [row for row in rows if row.get("id") != row_id]
    for patch in defect.get("enterpriseModelRowPatch", []):
        section = patch.get("section")
        row_id = patch.get("id")
        rows = out.get(section)
        if not isinstance(rows, list):
            continue
        for row in rows:
            if row.get("id") != row_id:
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
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
    obligation_manifest = read_json(OBLIGATION_MANIFEST_PATH) if (ROOT / OBLIGATION_MANIFEST_PATH).exists() else None
    obligation_manifest = apply_obligation_manifest_defect(obligation_manifest, defect)
    fixture_corpus = read_json(FIXTURE_CORPUS_PATH) if (ROOT / FIXTURE_CORPUS_PATH).exists() else None
    fixture_corpus = apply_fixture_corpus_defect(fixture_corpus, defect)
    integration_matrix = read_json(INTEGRATION_MATRIX_PATH) if (ROOT / INTEGRATION_MATRIX_PATH).exists() else None
    integration_matrix = apply_integration_matrix_defect(integration_matrix, defect)
    semantic_unit_suite = (
        read_json(SEMANTIC_UNIT_SUITE_PATH) if (ROOT / SEMANTIC_UNIT_SUITE_PATH).exists() else None
    )
    semantic_unit_suite = apply_semantic_unit_suite_defect(semantic_unit_suite, defect)
    functional_regression_suite = (
        read_json(FUNCTIONAL_REGRESSION_SUITE_PATH)
        if (ROOT / FUNCTIONAL_REGRESSION_SUITE_PATH).exists()
        else None
    )
    functional_regression_suite = apply_functional_regression_suite_defect(
        functional_regression_suite,
        defect,
    )
    enterprise_control_suite = (
        read_json(ENTERPRISE_CONTROL_SUITE_PATH)
        if (ROOT / ENTERPRISE_CONTROL_SUITE_PATH).exists()
        else None
    )
    enterprise_control_suite = apply_enterprise_control_suite_defect(
        enterprise_control_suite,
        defect,
    )
    makefile = (ROOT / MAKEFILE_PATH).read_text(encoding="utf-8") if (ROOT / MAKEFILE_PATH).exists() else ""
    makefile = apply_makefile_defect(makefile, defect)
    return {
        "contract": contract,
        "harness": harness,
        "lifecycle": lifecycle,
        "commandSurface": command_surface,
        "obligationManifest": obligation_manifest,
        "fixtureCorpus": fixture_corpus,
        "integrationMatrix": integration_matrix,
        "semanticUnitSuite": semantic_unit_suite,
        "functionalRegressionSuite": functional_regression_suite,
        "enterpriseControlSuite": enterprise_control_suite,
        "serviceCatalogue": read_json(SERVICE_CATALOGUE_PATH),
        "semanticContracts": read_semantic_contracts(),
        "composeTest": read_json_like_yaml(COMPOSE_TEST_PATH),
        "schemaRegistry": apply_schema_registry_defect(read_json(SCHEMA_REGISTRY_PATH), defect),
        "testObligationSchema": read_json(TEST_OBLIGATION_SCHEMA_PATH) if (ROOT / TEST_OBLIGATION_SCHEMA_PATH).exists() else None,
        "enterpriseModel": apply_enterprise_model_defect(read_json(ENTERPRISE_MODEL_PATH), defect),
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
    check_enterprise_refs_for_artifact(
        F,
        state["obligationManifest"],
        OBLIGATION_MANIFEST_PATH,
        state["enterpriseModel"],
        "USF-TEST-READINESS-039",
    )
    check_enterprise_refs_for_artifact(
        F,
        state["fixtureCorpus"],
        FIXTURE_CORPUS_PATH,
        state["enterpriseModel"],
        "USF-TEST-READINESS-046",
    )
    check_enterprise_refs_for_artifact(
        F,
        state["integrationMatrix"],
        INTEGRATION_MATRIX_PATH,
        state["enterpriseModel"],
        "USF-TEST-READINESS-054",
    )
    check_enterprise_refs_for_artifact(
        F,
        state["semanticUnitSuite"],
        SEMANTIC_UNIT_SUITE_PATH,
        state["enterpriseModel"],
        "USF-TEST-READINESS-060",
    )
    check_enterprise_refs_for_artifact(
        F,
        state["functionalRegressionSuite"],
        FUNCTIONAL_REGRESSION_SUITE_PATH,
        state["enterpriseModel"],
        "USF-TEST-READINESS-066",
    )
    check_enterprise_refs_for_artifact(
        F,
        state["enterpriseControlSuite"],
        ENTERPRISE_CONTROL_SUITE_PATH,
        state["enterpriseModel"],
        "USF-TEST-READINESS-075",
    )


def _list_by_id(rows: Any, key: str) -> dict[str, dict[str, Any]]:
    if not isinstance(rows, list):
        return {}
    return {
        str(row.get(key)): row
        for row in rows
        if isinstance(row, dict) and row.get(key) is not None
    }


def _compose_test_services(state: dict[str, Any]) -> dict[str, Any]:
    compose = state.get("composeTest")
    if not isinstance(compose, dict):
        return {}
    services = compose.get("services")
    return services if isinstance(services, dict) else {}


def _required_profiles(compose_services: dict[str, Any]) -> dict[str, set[str]]:
    profiles: dict[str, set[str]] = {}
    for service_id, service in compose_services.items():
        if not isinstance(service, dict):
            continue
        for profile in service.get("profiles", []) or []:
            profiles.setdefault(str(profile), set()).add(str(service_id))
    return profiles


def _catalogue_test_policy(row: dict[str, Any]) -> dict[str, Any]:
    policy = row.get("environmentPolicies", {}).get("test", {})
    return policy if isinstance(policy, dict) else {}


def _semantic_contract_needs_auth(row: dict[str, Any]) -> bool:
    text = " ".join(
        str(value).lower()
        for value in (
            row.get("contractId"),
            row.get("capability"),
            row.get("capabilityDomain"),
            row.get("title"),
        )
    )
    return any(token in text for token in ("auth", "tenant", "permission", "role", "abac", "rbac", "key"))


def _semantic_contract_needs_data_lifecycle(row: dict[str, Any]) -> bool:
    text = " ".join(
        str(value).lower()
        for value in (
            row.get("contractId"),
            row.get("capability"),
            row.get("capabilityDomain"),
            row.get("title"),
        )
    )
    return any(
        token in text
        for token in (
            "backup",
            "restore",
            "bulk",
            "import",
            "export",
            "storage",
            "search",
            "retention",
            "migration",
            "data",
            "privacy",
        )
    )


def _semantic_contract_needs_operational(row: dict[str, Any]) -> bool:
    text = " ".join(
        str(value).lower()
        for value in (
            row.get("contractId"),
            row.get("capability"),
            row.get("capabilityDomain"),
            row.get("title"),
        )
    )
    return any(token in text for token in ("workflow", "job", "alert", "incident", "metric", "trace", "log", "event"))


def check_obligation_manifest_shape(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), "obligation manifest is missing")
        return
    required = {
        "$schema",
        "id",
        "description",
        "authorityLevel",
        "issueId",
        "parentIssueId",
        "serviceCatalogueAuthority",
        "semanticContractAuthority",
        "testComposeTarget",
        "ontologyConcepts",
        "taxonomyRefs",
        "vocabularyRefs",
        "aiGuidance",
        "testEnvironmentContract",
        "composedSemanticHarness",
        "deterministicFixtureLifecycle",
        "commandSurfaceGate",
        "testReadinessClaimAllowed",
        "inMemoryServiceSubstituteAllowedForServiceBackedClaims",
        "coveragePolicy",
        "obligationClasses",
        "dependencyGraph",
        "expandedCategoryObligations",
        "profileObligations",
        "serviceObligations",
        "semanticContractObligations",
        "futureAiChangeGuardrail",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    }
    for key in sorted(required):
        if key not in manifest:
            F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), f"missing top-level field {key}")
    if manifest.get("issueId") != "USF-239" or manifest.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), "issue linkage must be USF-239 under USF-234")
    if manifest.get("authorityLevel") != "semantic-definition":
        F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), "authorityLevel must be semantic-definition")
    if manifest.get("serviceCatalogueAuthority") != str(SERVICE_CATALOGUE_PATH):
        F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), "service catalogue authority is stale")
    if manifest.get("semanticContractAuthority") != f"{SEMANTIC_CONTRACT_DIR}/":
        F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), "semantic contract authority is stale")
    if manifest.get("testComposeTarget") != COMPOSE_TARGET:
        F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), "test Compose target is stale")
    if manifest.get("testReadinessClaimAllowed") is not False:
        F.add("USF-TEST-READINESS-039", str(OBLIGATION_MANIFEST_PATH), "manifest must not allow final test-readiness claim")
    if manifest.get("inMemoryServiceSubstituteAllowedForServiceBackedClaims") is not False:
        F.add("USF-TEST-READINESS-033", str(OBLIGATION_MANIFEST_PATH), "service-backed claims must forbid in-memory substitution")


def check_obligation_schema_registry(F: Findings, state: dict[str, Any]) -> None:
    schema = state.get("testObligationSchema")
    if not isinstance(schema, dict):
        F.add("USF-TEST-READINESS-039", str(TEST_OBLIGATION_SCHEMA_PATH), "test obligation schema is missing")
    else:
        if schema.get("$id") != "urn:usf:schema:test-obligation-manifest":
            F.add("USF-TEST-READINESS-039", str(TEST_OBLIGATION_SCHEMA_PATH), "schema id is stale")
        if schema.get("additionalProperties") is not False:
            F.add("USF-TEST-READINESS-039", str(TEST_OBLIGATION_SCHEMA_PATH), "schema must be closed at the top level")
    entries = _list_by_id(state["schemaRegistry"].get("schemas", []), "id")
    entry = entries.get("test-obligation-manifest.schema.json")
    if not entry:
        F.add("USF-TEST-READINESS-039", str(SCHEMA_REGISTRY_PATH), "schema registry is missing test obligation manifest schema")
        return
    if entry.get("path") != str(TEST_OBLIGATION_SCHEMA_PATH):
        F.add("USF-TEST-READINESS-039", str(SCHEMA_REGISTRY_PATH), "schema registry path is stale")
    if entry.get("lifecycleState") != "draft" or entry.get("status") != "draft":
        F.add("USF-TEST-READINESS-039", str(SCHEMA_REGISTRY_PATH), "schema must remain draft for USF-239")
    if entry.get("authorityRole") != "semantic-definition":
        F.add("USF-TEST-READINESS-039", str(SCHEMA_REGISTRY_PATH), "schema registry authority role is stale")


def check_obligation_service_coverage(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        return
    service_rows = _list_by_id(manifest.get("serviceObligations"), "serviceId")
    catalogue_rows = catalogue_by_id(state["serviceCatalogue"])
    for service_id, catalogue_row in catalogue_rows.items():
        row = service_rows.get(service_id)
        if not row:
            F.add("USF-TEST-READINESS-030", service_id, "service catalogue row is missing from obligation manifest")
            continue
        subject = f"{OBLIGATION_MANIFEST_PATH}#serviceObligations.{service_id}"
        policy = _catalogue_test_policy(catalogue_row)
        expected_required = policy.get("required") is True
        if row.get("requiredInTest") is not expected_required:
            F.add("USF-TEST-READINESS-030", subject, "requiredInTest does not match service catalogue test policy")
        if row.get("serviceCataloguePath") != str(SERVICE_CATALOGUE_PATH):
            F.add("USF-TEST-READINESS-030", subject, "service catalogue path is missing or stale")
        if row.get("owner") != catalogue_row.get("serviceOwner") or row.get("riskOwner") != catalogue_row.get("riskOwner") or row.get("controlOwner") != catalogue_row.get("controlOwner"):
            F.add("USF-TEST-READINESS-030", subject, "owner riskOwner or controlOwner does not match service catalogue")
        if row.get("assetInventoryClass") != catalogue_row.get("assetInventoryClass"):
            F.add("USF-TEST-READINESS-030", subject, "asset inventory class does not match service catalogue")
        if row.get("dataClassification") != catalogue_row.get("dataClassification"):
            F.add("USF-TEST-READINESS-030", subject, "data classification does not match service catalogue")
        if not isinstance(row.get("testLayerCoverage"), dict):
            F.add("USF-TEST-READINESS-030", subject, "testLayerCoverage is missing")
        elif not all(row["testLayerCoverage"].get(key) is True for key in ("unit", "contractDesign", "functionalRegression", "enterpriseEvidence", "coverage", "negativeFailClosed", "missingEvidenceRegression")):
            F.add("USF-TEST-READINESS-030", subject, "mandatory base test layer coverage flags must be true")
        if not row.get("evidenceId") or not row.get("nonClaimBoundary"):
            F.add("USF-TEST-READINESS-034", subject, "evidence id and non-claim boundary are required")
        if not set(row.get("ownerIssueIds", [])).intersection(REQUIRED_OBLIGATION_ISSUES):
            F.add("USF-TEST-READINESS-034", subject, "ownerIssueIds must link USF test-readiness issues")
        if not row.get("validationCommands"):
            F.add("USF-TEST-READINESS-034", subject, "validation commands are required")
    extra = sorted(set(service_rows) - set(catalogue_rows))
    for service_id in extra:
        F.add("USF-TEST-READINESS-030", service_id, "obligation service row is not present in service catalogue")


def check_obligation_compose_profile_coverage(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        return
    compose_services = _compose_test_services(state)
    service_rows = _list_by_id(manifest.get("serviceObligations"), "serviceId")
    compose_covered = {
        str(row.get("composeServiceId"))
        for row in service_rows.values()
        if row.get("generatedInTestCompose") is True and row.get("composeServiceId")
    }
    for compose_service_id in compose_services:
        if compose_service_id not in compose_covered:
            F.add("USF-TEST-READINESS-032", compose_service_id, "generated test Compose service is not covered by obligation manifest")
    profile_rows = _list_by_id(manifest.get("profileObligations"), "profile")
    required_profiles = _required_profiles(compose_services)
    for profile, expected_services in required_profiles.items():
        row = profile_rows.get(profile)
        if not row:
            F.add("USF-TEST-READINESS-032", profile, "generated test Compose profile is missing from obligation manifest")
            continue
        subject = f"{OBLIGATION_MANIFEST_PATH}#profileObligations.{profile}"
        if row.get("composeTarget") != COMPOSE_TARGET:
            F.add("USF-TEST-READINESS-032", subject, "profile row must use canonical test Compose target")
        if set(row.get("serviceIds", [])) != expected_services:
            F.add("USF-TEST-READINESS-032", subject, "profile service ids do not match generated test Compose")
        for key in ("mustBeStarted", "mustBeSeeded", "mustBeExercised", "mustBeReset", "mustBeEvidenced"):
            if row.get(key) is not True:
                F.add("USF-TEST-READINESS-032", subject, f"{key} must be true")
        if row.get("inMemoryServiceSubstituteAllowed") is not False:
            F.add("USF-TEST-READINESS-033", subject, "profile must forbid in-memory service substitutes")


def check_obligation_semantic_coverage(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        return
    semantic_rows = _list_by_id(manifest.get("semanticContractObligations"), "contractId")
    for contract_id, contract in state["semanticContracts"].items():
        row = semantic_rows.get(contract_id)
        if not row:
            F.add("USF-TEST-READINESS-031", contract_id, "semantic contract is missing from obligation manifest")
            continue
        subject = f"{OBLIGATION_MANIFEST_PATH}#semanticContractObligations.{contract_id}"
        if row.get("path") != contract.get("_path"):
            F.add("USF-TEST-READINESS-031", subject, "semantic contract path is stale")
        if row.get("capabilityDomain") != contract.get("capabilityDomain"):
            F.add("USF-TEST-READINESS-031", subject, "capability domain is stale")
        if set(row.get("facetKeys", [])) != set((contract.get("facets") or {}).keys()):
            F.add("USF-TEST-READINESS-031", subject, "facet keys do not match semantic contract")
        if row.get("testMappingRequired") is not True:
            F.add("USF-TEST-READINESS-034", subject, "semantic contract row must require a test mapping")
        for key in ("implementedTestPath", "evidenceId", "coverageExpectation", "nonClaimBoundary"):
            if not row.get(key):
                F.add("USF-TEST-READINESS-034", subject, f"{key} is required")
        class_ids = set(row.get("obligationClassIds", []))
        for required_class in ("unit", "functional-regression", "contract-design-drift", "enterprise-evidence", "coverage", "future-ai-guardrail", "missing-evidence-regression"):
            if required_class not in class_ids:
                F.add("USF-TEST-READINESS-031", subject, f"missing obligation class {required_class}")
        owner_ids = set(row.get("ownerIssueIds", []))
        for required_issue in ("USF-241", "USF-243", "USF-244", "USF-246", "USF-247", "USF-252"):
            if required_issue not in owner_ids:
                F.add("USF-TEST-READINESS-034", subject, f"missing owner issue {required_issue}")
        if _semantic_contract_needs_auth(row) and "auth-tenant-role-permission" not in class_ids:
            F.add("USF-TEST-READINESS-036", subject, "auth tenant role permission obligation is missing")
        if _semantic_contract_needs_data_lifecycle(row) and "data-lifecycle" not in class_ids:
            F.add("USF-TEST-READINESS-037", subject, "data lifecycle obligation is missing")
        if _semantic_contract_needs_operational(row) and "operational-resilience" not in class_ids:
            F.add("USF-TEST-READINESS-038", subject, "operational resilience obligation is missing")


def check_obligation_service_classes(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        return
    service_rows = _list_by_id(manifest.get("serviceObligations"), "serviceId")
    for service_id, row in service_rows.items():
        subject = f"{OBLIGATION_MANIFEST_PATH}#serviceObligations.{service_id}"
        class_ids = set(row.get("obligationClassIds", []))
        owner_ids = set(row.get("ownerIssueIds", []))
        if row.get("requiredInTest") is True and row.get("generatedInTestCompose") is True:
            for required_class in ("composed-integration", "operational-resilience", "seed-reset-fixture", "compose-profile-exercise"):
                if required_class not in class_ids:
                    F.add("USF-TEST-READINESS-032", subject, f"missing service-backed obligation class {required_class}")
            for required_issue in ("USF-242", "USF-248", "USF-251"):
                if required_issue not in owner_ids:
                    F.add("USF-TEST-READINESS-034", subject, f"missing owner issue {required_issue}")
            if row.get("inMemoryServiceSubstituteAllowed") is not False:
                F.add("USF-TEST-READINESS-033", subject, "service-backed row must forbid in-memory substitution")
            if not row.get("fixtureSeedId") or row.get("fixtureSeedId") == "not-applicable":
                F.add("USF-TEST-READINESS-033", subject, "service-backed row must have fixture seed id")
            coverage = row.get("testLayerCoverage", {})
            for key in ("composedIntegration", "operational", "seedResetFixture"):
                if not isinstance(coverage, dict) or coverage.get(key) is not True:
                    F.add("USF-TEST-READINESS-033", subject, f"testLayerCoverage.{key} must be true")
        if row.get("requiredInTest") is True and row.get("generatedInTestCompose") is not True and not row.get("boundedDisposition"):
            F.add("USF-TEST-READINESS-034", subject, "required non-generated service must have bounded disposition")
        if service_id in AUTH_SERVICE_IDS or row.get("assetInventoryClass") in {"control-plane", "operator-surface", "gateway"}:
            if "auth-tenant-role-permission" not in class_ids or "USF-249" not in owner_ids:
                F.add("USF-TEST-READINESS-036", subject, "auth tenant role permission owner and class are required")
        if service_id in DATA_SERVICE_IDS or row.get("assetInventoryClass") in {"data-store", "backup-restore"}:
            if "data-lifecycle" not in class_ids or "backup-restore-bulk-migration" not in class_ids or "USF-250" not in owner_ids:
                F.add("USF-TEST-READINESS-037", subject, "data lifecycle backup restore bulk migration owner and classes are required")
        if row.get("requiredInTest") is True and row.get("generatedInTestCompose") is True:
            if "operational-resilience" not in class_ids or "USF-245" not in owner_ids:
                F.add("USF-TEST-READINESS-038", subject, "operational resilience owner and class are required")


def check_obligation_classes_and_guardrail(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        return
    class_ids = set(_list_by_id(manifest.get("obligationClasses"), "id"))
    missing_classes = sorted(REQUIRED_OBLIGATION_CLASSES - class_ids)
    if missing_classes:
        F.add("USF-TEST-READINESS-029", str(OBLIGATION_MANIFEST_PATH), f"missing obligation classes: {missing_classes}")
    missing_expanded_classes = sorted(EXPANDED_OBLIGATION_CLASS_IDS - class_ids)
    if missing_expanded_classes:
        F.add("USF-TEST-READINESS-076", str(OBLIGATION_MANIFEST_PATH), f"missing expanded obligation classes: {missing_expanded_classes}")
    graph = _list_by_id(manifest.get("dependencyGraph"), "issueId")
    for issue_id in (
        "USF-239",
        "USF-248",
        "USF-251",
        "USF-249",
        "USF-250",
        "USF-247",
        "USF-234",
        "USF-259",
        "USF-260",
        *sorted(EXPANDED_OBLIGATION_ISSUES),
    ):
        if issue_id not in graph:
            rule = "USF-TEST-READINESS-077" if issue_id in EXPANDED_OBLIGATION_ISSUES | EXPANDED_GATE_ISSUES else "USF-TEST-READINESS-029"
            F.add(rule, str(OBLIGATION_MANIFEST_PATH), f"dependency graph missing {issue_id}")
    blocks = set(graph.get("USF-239", {}).get("blocks", []))
    missing_blocks = sorted((REQUIRED_OBLIGATION_ISSUES - {"USF-239"}) - blocks)
    if missing_blocks:
        rule = "USF-TEST-READINESS-077" if set(missing_blocks).intersection(EXPANDED_OBLIGATION_ISSUES | EXPANDED_GATE_ISSUES) else "USF-TEST-READINESS-029"
        F.add(rule, str(OBLIGATION_MANIFEST_PATH), f"USF-239 dependency graph missing blocks: {missing_blocks}")
    guardrail = manifest.get("futureAiChangeGuardrail")
    required_guardrail = {
        "semanticDefinitionUpdateRequired",
        "testObligationUpdateRequired",
        "fixtureUpdateRequired",
        "coverageUpdateRequired",
        "evidenceUpdateRequired",
        "nonClaimReviewRequired",
    }
    if not isinstance(guardrail, dict):
        F.add("USF-TEST-READINESS-035", str(OBLIGATION_MANIFEST_PATH), "future AI change guardrail is missing")
    else:
        for key in required_guardrail:
            if guardrail.get(key) is not True:
                F.add("USF-TEST-READINESS-035", f"{OBLIGATION_MANIFEST_PATH}#futureAiChangeGuardrail.{key}", "future AI guardrail flag must be true")
        if guardrail.get("validatorCommand") != OBLIGATION_MANIFEST_COMMAND or guardrail.get("ownerIssueId") != "USF-252":
            F.add("USF-TEST-READINESS-035", str(OBLIGATION_MANIFEST_PATH), "future AI guardrail command or owner is stale")


def _enterprise_ids(state: dict[str, Any], section: str) -> set[str]:
    rows = state["enterpriseModel"].get(section, [])
    if not isinstance(rows, list):
        return set()
    return {str(row.get("id")) for row in rows if row.get("id")}


def check_expanded_category_obligations(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        return
    rows = _list_by_id(manifest.get("expandedCategoryObligations"), "issueId")
    class_rows = _list_by_id(manifest.get("obligationClasses"), "id")
    graph = _list_by_id(manifest.get("dependencyGraph"), "issueId")
    required_blocks = {"USF-247", "USF-260", "USF-234"}
    usf259_blocks = set(graph.get("USF-259", {}).get("blocks", []))
    missing_259_blocks = sorted((EXPANDED_OBLIGATION_ISSUES | required_blocks) - usf259_blocks)
    if missing_259_blocks:
        F.add("USF-TEST-READINESS-077", str(OBLIGATION_MANIFEST_PATH), f"USF-259 dependency graph missing blocks: {missing_259_blocks}")
    for gate_issue in ("USF-247", "USF-260", "USF-234"):
        depends = set(graph.get(gate_issue, {}).get("dependsOn", []))
        missing_gate_dependencies = sorted(EXPANDED_OBLIGATION_ISSUES - depends)
        if missing_gate_dependencies:
            F.add(
                "USF-TEST-READINESS-077",
                f"{OBLIGATION_MANIFEST_PATH}#dependencyGraph.{gate_issue}",
                f"{gate_issue} dependency graph missing expanded categories: {missing_gate_dependencies}",
            )
    for issue_id, category_id in sorted(EXPANDED_OBLIGATION_CATEGORIES.items()):
        class_row = class_rows.get(category_id)
        if not class_row or class_row.get("ownerIssueId") != issue_id:
            F.add("USF-TEST-READINESS-076", str(OBLIGATION_MANIFEST_PATH), f"expanded class {category_id} must be owned by {issue_id}")
        row = rows.get(issue_id)
        if not row:
            F.add("USF-TEST-READINESS-076", str(OBLIGATION_MANIFEST_PATH), f"expanded category row missing {issue_id}")
            continue
        subject = f"{OBLIGATION_MANIFEST_PATH}#expandedCategoryObligations.{issue_id}"
        if row.get("categoryId") != category_id or row.get("categoryClassId") != category_id:
            F.add("USF-TEST-READINESS-076", subject, "category id or class id is stale")
        if row.get("status") != "repo-enforced-obligation-pending-issue-implementation":
            F.add("USF-TEST-READINESS-076", subject, "expanded category status must remain pending source issue implementation")
        if row.get("implementationStatus") != "deferred-with-owner-until-source-issue-merged":
            F.add("USF-TEST-READINESS-076", subject, "implementation status must not imply category completion")
        if "USF-259" not in set(row.get("dependsOnIssueIds", [])):
            F.add("USF-TEST-READINESS-077", subject, "expanded category must depend on USF-259")
        if not required_blocks.issubset(set(row.get("blocksIssueIds", []))):
            F.add("USF-TEST-READINESS-077", subject, "expanded category must block USF-247, USF-260, and USF-234")
        graph_row = graph.get(issue_id, {})
        if "USF-259" not in set(graph_row.get("dependsOn", [])):
            F.add("USF-TEST-READINESS-077", subject, "dependency graph row must depend on USF-259")
        if not required_blocks.issubset(set(graph_row.get("blocks", []))):
            F.add("USF-TEST-READINESS-077", subject, "dependency graph row must block USF-247, USF-260, and USF-234")
        for scope_key in (
            "semanticContractScope",
            "serviceCatalogueScope",
            "composeProfileScope",
            "fixtureScope",
            "generatedArtifactScope",
            "futureAiGuardrailScope",
        ):
            values = row.get(scope_key)
            if not isinstance(values, list) or not values:
                F.add("USF-TEST-READINESS-078", subject, f"{scope_key} is missing")
        if not row.get("requiredCommandIds") or not row.get("validationCommands"):
            F.add("USF-TEST-READINESS-078", subject, "command mapping is missing")
        if not {"owner", "riskOwner", "controlOwner", "reviewDate", "deferredBoundary", "promotionImpact"}.issubset(row):
            F.add("USF-TEST-READINESS-076", subject, "owner, review, promotion impact, or deferred boundary metadata is missing")
        refs = row.get("enterpriseEvidenceRefs")
        if not isinstance(refs, dict):
            F.add("USF-TEST-READINESS-079", subject, "enterprise evidence refs are missing")
        else:
            for section in ENTERPRISE_REF_SECTIONS:
                section_refs = refs.get(section)
                if not isinstance(section_refs, list) or not section_refs:
                    F.add("USF-TEST-READINESS-079", subject, f"{section} refs are missing")
                    continue
                missing_refs = sorted(set(section_refs) - _enterprise_ids(state, section))
                if missing_refs:
                    F.add("USF-TEST-READINESS-079", subject, f"{section} refs are not in enterprise model: {missing_refs}")
        non_claims = set(row.get("nonClaims", []))
        missing_non_claims = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
        if missing_non_claims:
            F.add("USF-TEST-READINESS-080", subject, f"missing non-claims: {missing_non_claims}")
        if row.get("testReadinessClaimAllowed") is not False:
            F.add("USF-TEST-READINESS-080", subject, "expanded category must not allow final test-readiness claim")
        if row.get("inMemoryServiceSubstituteAllowedForServiceBackedClaims") is not False:
            F.add("USF-TEST-READINESS-080", subject, "expanded category must forbid in-memory service-backed substitutes")


def check_obligation_claims(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        return
    non_claims = set(manifest.get("nonClaims", []))
    missing = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing:
        F.add("USF-TEST-READINESS-039", str(OBLIGATION_MANIFEST_PATH), f"missing non-claims: {missing}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(manifest.get("allowedClaims", [])))
    if bad:
        F.add("USF-TEST-READINESS-039", str(OBLIGATION_MANIFEST_PATH), f"prohibited claim appears in allowedClaims: {bad}")
    commands = set(manifest.get("validationCommands", []))
    for expected in (
        OBLIGATION_MANIFEST_COMMAND,
        "corepack pnpm test-readiness:validate",
        "python3 tools/validate-spec/validate-spec.py all --json",
    ):
        if expected not in commands:
            F.add("USF-TEST-READINESS-034", f"{OBLIGATION_MANIFEST_PATH}#validationCommands", f"missing validation command {expected}")


def check_obligation_manifest(F: Findings, state: dict[str, Any]) -> None:
    check_obligation_manifest_shape(F, state)
    check_obligation_schema_registry(F, state)
    check_obligation_service_coverage(F, state)
    check_obligation_compose_profile_coverage(F, state)
    check_obligation_semantic_coverage(F, state)
    check_obligation_service_classes(F, state)
    check_obligation_classes_and_guardrail(F, state)
    check_expanded_category_obligations(F, state)
    check_obligation_claims(F, state)


def check_fixture_corpus_shape(F: Findings, state: dict[str, Any]) -> None:
    corpus = state["fixtureCorpus"]
    if not isinstance(corpus, dict):
        F.add("USF-TEST-READINESS-040", str(FIXTURE_CORPUS_PATH), "fixture corpus is missing")
        return
    required = {
        "id",
        "issueId",
        "parentIssueId",
        "sourceAuthorities",
        "corpusPath",
        "apiModule",
        "proofCommand",
        "serviceFixtures",
        "semanticContractFixtures",
        "repeatabilityEvidence",
        "testLayerWiring",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    }
    for key in sorted(required):
        if key not in corpus:
            F.add("USF-TEST-READINESS-040", str(FIXTURE_CORPUS_PATH), f"missing top-level field {key}")
    if corpus.get("issueId") != "USF-248" or corpus.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-040", str(FIXTURE_CORPUS_PATH), "issue linkage must be USF-248 under USF-234")
    if corpus.get("corpusPath") != str(FIXTURE_CORPUS_PATH):
        F.add("USF-TEST-READINESS-040", str(FIXTURE_CORPUS_PATH), "corpus path is stale")
    if corpus.get("proofCommand") != FIXTURE_CORPUS_COMMAND:
        F.add("USF-TEST-READINESS-040", str(FIXTURE_CORPUS_PATH), "proof command is missing or stale")
    authorities = corpus.get("sourceAuthorities")
    if not isinstance(authorities, dict):
        F.add("USF-TEST-READINESS-040", f"{FIXTURE_CORPUS_PATH}#sourceAuthorities", "source authorities are missing")
    else:
        expected = {
            "serviceCatalogue": str(SERVICE_CATALOGUE_PATH),
            "obligationManifest": str(OBLIGATION_MANIFEST_PATH),
            "testEnvironmentContract": str(CONTRACT_PATH),
            "deterministicFixtureLifecycle": str(LIFECYCLE_PATH),
            "composeTarget": COMPOSE_TARGET,
        }
        for key, value in expected.items():
            if authorities.get(key) != value:
                F.add("USF-TEST-READINESS-040", f"{FIXTURE_CORPUS_PATH}#sourceAuthorities.{key}", "source authority is stale")


def check_fixture_service_coverage(F: Findings, state: dict[str, Any]) -> None:
    corpus = state["fixtureCorpus"]
    manifest = state["obligationManifest"]
    if not isinstance(corpus, dict) or not isinstance(manifest, dict):
        return
    rows = _list_by_id(corpus.get("serviceFixtures"), "serviceId")
    obligation_rows = _list_by_id(manifest.get("serviceObligations"), "serviceId")
    for service_id, obligation in obligation_rows.items():
        row = rows.get(service_id)
        if not row:
            F.add("USF-TEST-READINESS-041", service_id, "service obligation is missing from fixture corpus")
            continue
        subject = f"{FIXTURE_CORPUS_PATH}#serviceFixtures.{service_id}"
        for key in ("fixtureSeedId", "generatedInTestCompose", "requiredInTest"):
            if row.get(key) != obligation.get(key):
                F.add("USF-TEST-READINESS-041", subject, f"{key} does not match obligation manifest")
        if row.get("sourceObligationEvidenceId") != obligation.get("evidenceId"):
            F.add("USF-TEST-READINESS-041", subject, "source obligation evidence id is stale")
        if "USF-248" not in set(row.get("ownerIssueIds", [])):
            F.add("USF-TEST-READINESS-041", subject, "USF-248 owner issue is missing")
        if row.get("inMemoryServiceSubstituteAllowed") is not False:
            F.add("USF-TEST-READINESS-043", subject, "fixture row must forbid in-memory service substitutes")
        if row.get("testReadinessClaimAllowed") is not False:
            F.add("USF-TEST-READINESS-046", subject, "fixture row must not allow final test readiness")
        requires_seed = obligation.get("generatedInTestCompose") is True and obligation.get("fixtureSeedId") != "not-applicable"
        lifecycle_api = row.get("lifecycleApi")
        lifecycle = row.get("lifecycleCoverage")
        provenance = row.get("provenance")
        if requires_seed:
            if not isinstance(lifecycle_api, dict):
                F.add("USF-TEST-READINESS-043", subject, "lifecycle API mapping is missing")
            else:
                expected_ids = {
                    "seederId": f"seeder.{service_id}",
                    "resetterId": f"resetter.{service_id}",
                    "cleanupId": f"cleanup.{service_id}",
                    "teardownId": f"teardown.{service_id}",
                    "apiModule": "tests/packages/fixtures/synthetic-fixture-corpus.ts",
                }
                for key, value in expected_ids.items():
                    if lifecycle_api.get(key) != value:
                        F.add("USF-TEST-READINESS-043", subject, f"{key} is missing or stale")
            if not isinstance(lifecycle, dict):
                F.add("USF-TEST-READINESS-044", subject, "lifecycle coverage is missing")
            else:
                for key in ("seed", "reset", "cleanup", "teardown", "repeatability", "failureRecovery"):
                    if lifecycle.get(key) is not True:
                        F.add("USF-TEST-READINESS-044", subject, f"lifecycleCoverage.{key} must be true")
                if not str(lifecycle.get("deterministicSeed", "")).startswith(f"usf-248-{service_id}-"):
                    F.add("USF-TEST-READINESS-044", subject, "deterministic seed is missing or stale")
            plan = row.get("fixturePlan")
            if not isinstance(plan, dict):
                F.add("USF-TEST-READINESS-043", subject, "fixture plan is missing")
            else:
                for key in (
                    "staticFixtures",
                    "generatedFixtures",
                    "tenantMatrix",
                    "actorMatrix",
                    "roleMatrix",
                    "permissionMatrix",
                    "auditFixtures",
                    "readinessFixtures",
                    "dataShapeFixtures",
                ):
                    if not isinstance(plan.get(key), list) or not plan.get(key):
                        F.add("USF-TEST-READINESS-043", subject, f"fixture plan missing {key}")
        elif row.get("nonTestDisposition") is None:
            F.add("USF-TEST-READINESS-041", subject, "non-generated or not-applicable fixture row needs disposition")
        if not isinstance(provenance, dict):
            F.add("USF-TEST-READINESS-043", subject, "provenance is missing")
        else:
            if provenance.get("syntheticOnly") is not True or provenance.get("productionDerived") is not False:
                F.add("USF-TEST-READINESS-043", subject, "fixture provenance must be synthetic and not production-derived")
            for key in ("realTenantDataAllowed", "realSecretsAllowed", "privateLocalStateAllowed"):
                if provenance.get(key) is not False:
                    F.add("USF-TEST-READINESS-043", subject, f"provenance.{key} must be false")
        if not row.get("validationCommands"):
            F.add("USF-TEST-READINESS-043", subject, "validation commands are missing")
    extra = sorted(set(rows) - set(obligation_rows))
    for service_id in extra:
        F.add("USF-TEST-READINESS-041", service_id, "fixture corpus service row is not present in obligation manifest")


def check_fixture_semantic_coverage(F: Findings, state: dict[str, Any]) -> None:
    corpus = state["fixtureCorpus"]
    manifest = state["obligationManifest"]
    if not isinstance(corpus, dict) or not isinstance(manifest, dict):
        return
    rows = _list_by_id(corpus.get("semanticContractFixtures"), "contractId")
    obligation_rows = _list_by_id(manifest.get("semanticContractObligations"), "contractId")
    required_seed_keys = {
        "tenant",
        "actor",
        "role",
        "permission",
        "audit",
        "readiness",
        "dataShape",
        "positivePath",
        "negativeFailClosedPath",
    }
    for contract_id, obligation in obligation_rows.items():
        row = rows.get(contract_id)
        if not row:
            F.add("USF-TEST-READINESS-042", contract_id, "semantic contract obligation is missing from fixture corpus")
            continue
        subject = f"{FIXTURE_CORPUS_PATH}#semanticContractFixtures.{contract_id}"
        if row.get("path") != obligation.get("path"):
            F.add("USF-TEST-READINESS-042", subject, "semantic contract path is stale")
        if "USF-248" not in set(row.get("ownerIssueIds", [])):
            F.add("USF-TEST-READINESS-042", subject, "USF-248 owner issue is missing")
        if not isinstance(row.get("fixtureSeedIds"), list) or not row.get("fixtureSeedIds"):
            F.add("USF-TEST-READINESS-042", subject, "fixture seed ids are missing")
        coverage = row.get("semanticSeedCoverage")
        if not isinstance(coverage, dict):
            F.add("USF-TEST-READINESS-042", subject, "semantic seed coverage is missing")
        else:
            for key in sorted(required_seed_keys):
                if coverage.get(key) != "covered":
                    F.add("USF-TEST-READINESS-042", subject, f"semantic seed coverage missing {key}")
        provenance = row.get("provenance")
        if not isinstance(provenance, dict):
            F.add("USF-TEST-READINESS-043", subject, "provenance is missing")
        else:
            if provenance.get("syntheticOnly") is not True or provenance.get("productionDerived") is not False:
                F.add("USF-TEST-READINESS-043", subject, "semantic fixture provenance must be synthetic and not production-derived")
            for key in ("realTenantDataAllowed", "realSecretsAllowed", "privateLocalStateAllowed"):
                if provenance.get(key) is not False:
                    F.add("USF-TEST-READINESS-043", subject, f"provenance.{key} must be false")
        if not row.get("validationCommands"):
            F.add("USF-TEST-READINESS-043", subject, "validation commands are missing")
    extra = sorted(set(rows) - set(obligation_rows))
    for contract_id in extra:
        F.add("USF-TEST-READINESS-042", contract_id, "fixture corpus semantic row is not present in obligation manifest")


def check_fixture_corpus_evidence(F: Findings, state: dict[str, Any]) -> None:
    corpus = state["fixtureCorpus"]
    if not isinstance(corpus, dict):
        return
    repeat = corpus.get("repeatabilityEvidence")
    if not isinstance(repeat, dict):
        F.add("USF-TEST-READINESS-044", f"{FIXTURE_CORPUS_PATH}#repeatabilityEvidence", "repeatability evidence is missing")
    else:
        if repeat.get("runCount") != 2:
            F.add("USF-TEST-READINESS-044", f"{FIXTURE_CORPUS_PATH}#repeatabilityEvidence", "runCount must be two")
        for key in ("repeatedRunDeterministicRequired", "failureRecoveryRequired", "cleanupAfterFailureRequired"):
            if repeat.get(key) is not True:
                F.add("USF-TEST-READINESS-044", f"{FIXTURE_CORPUS_PATH}#repeatabilityEvidence.{key}", "repeatability marker must be true")
        if repeat.get("proofCommand") != FIXTURE_CORPUS_COMMAND:
            F.add("USF-TEST-READINESS-044", f"{FIXTURE_CORPUS_PATH}#repeatabilityEvidence", "proof command is missing or stale")
    wiring = corpus.get("testLayerWiring")
    if not isinstance(wiring, dict):
        F.add("USF-TEST-READINESS-045", f"{FIXTURE_CORPUS_PATH}#testLayerWiring", "test layer wiring is missing")
    else:
        for key in ("unit", "integration", "regression", "enterprise", "operational"):
            if not isinstance(wiring.get(key), list) or not wiring.get(key):
                F.add("USF-TEST-READINESS-045", f"{FIXTURE_CORPUS_PATH}#testLayerWiring.{key}", "test layer wiring is missing")
    commands = set(corpus.get("validationCommands", []))
    for expected in (
        FIXTURE_CORPUS_COMMAND,
        "corepack pnpm test-readiness:validate",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
        "corepack pnpm test",
    ):
        if expected not in commands:
            F.add("USF-TEST-READINESS-045", f"{FIXTURE_CORPUS_PATH}#validationCommands", f"missing validation command {expected}")
    non_claims = set(corpus.get("nonClaims", []))
    missing = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing:
        F.add("USF-TEST-READINESS-046", str(FIXTURE_CORPUS_PATH), f"missing non-claims: {missing}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(corpus.get("allowedClaims", [])))
    if bad:
        F.add("USF-TEST-READINESS-046", str(FIXTURE_CORPUS_PATH), f"prohibited claim appears in allowedClaims: {bad}")


def check_fixture_corpus(F: Findings, state: dict[str, Any]) -> None:
    check_fixture_corpus_shape(F, state)
    check_fixture_service_coverage(F, state)
    check_fixture_semantic_coverage(F, state)
    check_fixture_corpus_evidence(F, state)


def _compose_profiles_with_default(compose_services: dict[str, Any]) -> dict[str, set[str]]:
    profiles: dict[str, set[str]] = {}
    for service_id, service in compose_services.items():
        if not isinstance(service, dict):
            continue
        service_profiles = service.get("profiles") or ["default"]
        for profile in service_profiles:
            profiles.setdefault(str(profile), set()).add(str(service_id))
    return profiles


def check_integration_matrix_shape(F: Findings, state: dict[str, Any]) -> None:
    matrix = state["integrationMatrix"]
    if not isinstance(matrix, dict):
        F.add("USF-TEST-READINESS-047", str(INTEGRATION_MATRIX_PATH), "integration matrix is missing")
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "composeTarget",
        "testSuitePath",
        "proofCommand",
        "proofScript",
        "sourceAuthorities",
        "generatedServiceCount",
        "profileCount",
        "serviceCatalogueDispositionCount",
        "inMemoryServiceSubstituteAllowedForServiceBackedClaims",
        "testReadinessClaimAllowed",
        "serviceIntegrationRows",
        "profileIntegrationRows",
        "serviceCatalogueDispositionRows",
        "enterpriseEvidenceRefs",
        "validationCommands",
        "allowedClaims",
        "nonClaims",
    ):
        if key not in matrix:
            F.add("USF-TEST-READINESS-047", str(INTEGRATION_MATRIX_PATH), f"missing top-level field {key}")
    if matrix.get("issueId") != "USF-242" or matrix.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-047", str(INTEGRATION_MATRIX_PATH), "issue linkage must be USF-242 under USF-234")
    if matrix.get("composeTarget") != COMPOSE_TARGET or matrix.get("proofCommand") != INTEGRATION_MATRIX_COMMAND:
        F.add("USF-TEST-READINESS-051", str(INTEGRATION_MATRIX_PATH), "Compose target or proof command is stale")
    if matrix.get("proofScript") != INTEGRATION_MATRIX_SCRIPT:
        F.add("USF-TEST-READINESS-051", str(INTEGRATION_MATRIX_PATH), "proof script is stale")
    if matrix.get("testSuitePath") != "tests/packages/composed-service-integration-matrix.test.ts":
        F.add("USF-TEST-READINESS-047", str(INTEGRATION_MATRIX_PATH), "test suite path is stale")
    if matrix.get("inMemoryServiceSubstituteAllowedForServiceBackedClaims") is not False:
        F.add("USF-TEST-READINESS-052", str(INTEGRATION_MATRIX_PATH), "service-backed claims must forbid in-memory substitution")
    if matrix.get("testReadinessClaimAllowed") is not False:
        F.add("USF-TEST-READINESS-054", str(INTEGRATION_MATRIX_PATH), "matrix must not allow final test-readiness claim")
    commands = set(matrix.get("validationCommands", []))
    for expected in (
        INTEGRATION_MATRIX_COMMAND,
        "corepack pnpm test-readiness:validate",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    ):
        if expected not in commands:
            F.add("USF-TEST-READINESS-051", f"{INTEGRATION_MATRIX_PATH}#validationCommands", f"missing validation command {expected}")


def check_integration_service_coverage(F: Findings, state: dict[str, Any]) -> None:
    matrix = state["integrationMatrix"]
    if not isinstance(matrix, dict):
        return
    compose_services = _compose_test_services(state)
    service_rows = _list_by_id(matrix.get("serviceIntegrationRows"), "serviceId")
    if matrix.get("generatedServiceCount") != len(compose_services) or matrix.get("generatedServiceCount") != len(service_rows):
        F.add("USF-TEST-READINESS-048", str(INTEGRATION_MATRIX_PATH), "generated service count must match test Compose and matrix rows")
    fixture_rows = _list_by_id(state.get("fixtureCorpus", {}).get("serviceFixtures") if isinstance(state.get("fixtureCorpus"), dict) else [], "serviceId")
    for compose_service_id in compose_services:
        row = service_rows.get(compose_service_id)
        if not row:
            F.add("USF-TEST-READINESS-048", compose_service_id, "generated test Compose service is missing integration row")
            continue
        subject = f"{INTEGRATION_MATRIX_PATH}#serviceIntegrationRows.{compose_service_id}"
        if row.get("composeTarget") != COMPOSE_TARGET or row.get("generatedInTestCompose") is not True:
            F.add("USF-TEST-READINESS-051", subject, "service row must use canonical generated test Compose")
        if row.get("inMemoryServiceSubstituteAllowed") is not False or row.get("testReadinessClaimAllowed") is not False:
            F.add("USF-TEST-READINESS-052", subject, "service row allows unsafe substitute or claim")
        if row.get("proofCommand") != INTEGRATION_MATRIX_COMMAND or row.get("proofScript") != INTEGRATION_MATRIX_SCRIPT:
            F.add("USF-TEST-READINESS-051", subject, "service row proof command or script is stale")
        if not row.get("fixtureSeedId") or not isinstance(row.get("lifecycleApi"), dict):
            F.add("USF-TEST-READINESS-048", subject, "fixture seed and lifecycle API are required")
        if row.get("serviceCatalogueId") not in catalogue_by_id(state["serviceCatalogue"]):
            F.add("USF-TEST-READINESS-048", subject, "service catalogue linkage is missing")
        fixture_id = row.get("serviceCatalogueId")
        if fixture_id not in fixture_rows and compose_service_id not in fixture_rows:
            F.add("USF-TEST-READINESS-048", subject, "fixture corpus linkage is missing")
        lifecycle = row.get("lifecycleApi") if isinstance(row.get("lifecycleApi"), dict) else {}
        for key in ("seederId", "resetterId", "cleanupId", "teardownId"):
            if not lifecycle.get(key):
                F.add("USF-TEST-READINESS-048", subject, f"lifecycle API missing {key}")
        evidence = row.get("evidenceTests")
        if not isinstance(evidence, dict):
            F.add("USF-TEST-READINESS-048", subject, "evidenceTests must be present")
        else:
            for key in REQUIRED_INTEGRATION_SERVICE_COVERAGE:
                if evidence.get(key) != "matrix-covered":
                    F.add("USF-TEST-READINESS-048", subject, f"missing integration evidence test {key}")
        non_claims = set(row.get("nonClaims", []))
        if REQUIRED_HARNESS_NON_CLAIMS - non_claims:
            F.add("USF-TEST-READINESS-054", subject, "service row preserves insufficient non-claims")
    extra = sorted(set(service_rows) - set(compose_services))
    for service_id in extra:
        F.add("USF-TEST-READINESS-048", service_id, "integration service row is not generated in test Compose")


def check_integration_profile_coverage(F: Findings, state: dict[str, Any]) -> None:
    matrix = state["integrationMatrix"]
    if not isinstance(matrix, dict):
        return
    expected_profiles = _compose_profiles_with_default(_compose_test_services(state))
    profile_rows = _list_by_id(matrix.get("profileIntegrationRows"), "profile")
    if matrix.get("profileCount") != len(expected_profiles) or matrix.get("profileCount") != len(profile_rows):
        F.add("USF-TEST-READINESS-049", str(INTEGRATION_MATRIX_PATH), "profile count must match generated test Compose and matrix rows")
    for profile, service_ids in expected_profiles.items():
        row = profile_rows.get(profile)
        if not row:
            F.add("USF-TEST-READINESS-049", profile, "generated test Compose profile is missing integration row")
            continue
        subject = f"{INTEGRATION_MATRIX_PATH}#profileIntegrationRows.{profile}"
        if row.get("composeTarget") != COMPOSE_TARGET or row.get("proofCommand") != INTEGRATION_MATRIX_COMMAND:
            F.add("USF-TEST-READINESS-051", subject, "profile row has stale Compose target or proof command")
        if set(row.get("serviceIds", [])) != service_ids:
            F.add("USF-TEST-READINESS-049", subject, "profile service ids do not match generated test Compose")
        if row.get("inMemoryServiceSubstituteAllowed") is not False:
            F.add("USF-TEST-READINESS-052", subject, "profile row allows in-memory substitution")
        for key in REQUIRED_INTEGRATION_PROFILE_FLAGS:
            if row.get(key) is not True:
                F.add("USF-TEST-READINESS-049", subject, f"{key} must be true")
        non_claims = set(row.get("nonClaims", []))
        if REQUIRED_HARNESS_NON_CLAIMS - non_claims:
            F.add("USF-TEST-READINESS-054", subject, "profile row preserves insufficient non-claims")
    for profile in sorted(set(profile_rows) - set(expected_profiles)):
        F.add("USF-TEST-READINESS-049", profile, "profile row is not generated by test Compose")


def check_integration_catalogue_dispositions(F: Findings, state: dict[str, Any]) -> None:
    matrix = state["integrationMatrix"]
    if not isinstance(matrix, dict):
        return
    catalogue_rows = catalogue_by_id(state["serviceCatalogue"])
    disposition_rows = _list_by_id(matrix.get("serviceCatalogueDispositionRows"), "serviceCatalogueId")
    if matrix.get("serviceCatalogueDispositionCount") != len(catalogue_rows) or matrix.get("serviceCatalogueDispositionCount") != len(disposition_rows):
        F.add("USF-TEST-READINESS-050", str(INTEGRATION_MATRIX_PATH), "catalogue disposition count must match service catalogue and matrix rows")
    allowed_dispositions = {
        "tested",
        "profile-gated-tested",
        "external-live-out-of-scope",
        "historical-dev-only",
        "unsupported",
        "deferred-with-follow-up",
    }
    for service_id, catalogue_row in catalogue_rows.items():
        row = disposition_rows.get(service_id)
        if not row:
            F.add("USF-TEST-READINESS-050", service_id, "service catalogue row is missing test integration disposition")
            continue
        subject = f"{INTEGRATION_MATRIX_PATH}#serviceCatalogueDispositionRows.{service_id}"
        disposition = row.get("testDisposition")
        if disposition not in allowed_dispositions:
            F.add("USF-TEST-READINESS-050", subject, "unknown test integration disposition")
        if not row.get("boundedRationale"):
            F.add("USF-TEST-READINESS-050", subject, "bounded rationale is required")
        if row.get("owner") != catalogue_row.get("serviceOwner") or row.get("riskOwner") != catalogue_row.get("riskOwner") or row.get("controlOwner") != catalogue_row.get("controlOwner"):
            F.add("USF-TEST-READINESS-050", subject, "owner riskOwner or controlOwner does not match service catalogue")
        if row.get("dataClassification") != catalogue_row.get("dataClassification"):
            F.add("USF-TEST-READINESS-050", subject, "data classification does not match service catalogue")
        if row.get("inMemoryServiceSubstituteAllowed") is not False or row.get("testReadinessClaimAllowed") is not False:
            F.add("USF-TEST-READINESS-052", subject, "catalogue disposition allows unsafe substitute or claim")
        policy_profiles = _catalogue_test_policy(catalogue_row).get("composeProfiles", [])
        if policy_profiles and disposition != "profile-gated-tested":
            F.add("USF-TEST-READINESS-053", subject, "profile-gated service lacks profile-gated tested disposition")
        if disposition == "deferred-with-follow-up" and not row.get("followUpIssueIds"):
            F.add("USF-TEST-READINESS-050", subject, "deferred disposition requires follow-up issue")
        non_claims = set(row.get("nonClaims", []))
        if REQUIRED_HARNESS_NON_CLAIMS - non_claims:
            F.add("USF-TEST-READINESS-054", subject, "catalogue disposition preserves insufficient non-claims")
    for service_id in sorted(set(disposition_rows) - set(catalogue_rows)):
        F.add("USF-TEST-READINESS-050", service_id, "catalogue disposition row is not in service catalogue")


def check_integration_claims(F: Findings, state: dict[str, Any]) -> None:
    matrix = state["integrationMatrix"]
    if not isinstance(matrix, dict):
        return
    non_claims = set(matrix.get("nonClaims", []))
    missing = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing:
        F.add("USF-TEST-READINESS-054", str(INTEGRATION_MATRIX_PATH), f"missing non-claims: {missing}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(matrix.get("allowedClaims", [])))
    if bad:
        F.add("USF-TEST-READINESS-054", str(INTEGRATION_MATRIX_PATH), f"prohibited claim appears in allowedClaims: {bad}")


def check_integration_matrix(F: Findings, state: dict[str, Any]) -> None:
    check_integration_matrix_shape(F, state)
    check_integration_service_coverage(F, state)
    check_integration_profile_coverage(F, state)
    check_integration_catalogue_dispositions(F, state)
    check_integration_claims(F, state)


def _unit_semantic_obligations(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    rows = manifest.get("semanticContractObligations", [])
    if not isinstance(rows, list):
        return []
    return [
        row
        for row in rows
        if isinstance(row, dict) and "USF-241" in set(row.get("ownerIssueIds", []))
    ]


def _source_text(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        return ""
    return target.read_text(encoding="utf-8")


def check_semantic_unit_suite(F: Findings, state: dict[str, Any]) -> None:
    suite = state["semanticUnitSuite"]
    manifest = state["obligationManifest"]
    if not isinstance(suite, dict):
        F.add("USF-TEST-READINESS-055", str(SEMANTIC_UNIT_SUITE_PATH), "semantic unit suite inventory is missing")
        return
    if not isinstance(manifest, dict):
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "sourceManifest",
        "scope",
        "facetKeysRequired",
        "mappedTestFiles",
        "unitObligationMappings",
        "coverageContribution",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    ):
        if key not in suite:
            F.add("USF-TEST-READINESS-055", str(SEMANTIC_UNIT_SUITE_PATH), f"missing top-level field {key}")
    if suite.get("issueId") != "USF-241" or suite.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-055", str(SEMANTIC_UNIT_SUITE_PATH), "issue linkage must be USF-241 under USF-234")
    source = suite.get("sourceManifest", {})
    if not isinstance(source, dict) or source.get("path") != str(OBLIGATION_MANIFEST_PATH):
        F.add("USF-TEST-READINESS-055", str(SEMANTIC_UNIT_SUITE_PATH), "source manifest path is stale")

    unit_rows = _unit_semantic_obligations(manifest)
    expected_count = len(unit_rows)
    if isinstance(source, dict) and source.get("expectedSemanticContractCount") != expected_count:
        F.add("USF-TEST-READINESS-056", str(SEMANTIC_UNIT_SUITE_PATH), "expected semantic contract count is stale")
    service_rows_owned_by_241 = [
        row
        for row in manifest.get("serviceObligations", [])
        if isinstance(row, dict) and "USF-241" in set(row.get("ownerIssueIds", []))
    ]
    if isinstance(source, dict) and source.get("expectedUsf241ServiceRowCount") != len(service_rows_owned_by_241):
        F.add("USF-TEST-READINESS-058", str(SEMANTIC_UNIT_SUITE_PATH), "USF-241 must not own service-backed rows")

    scope = suite.get("scope")
    if not isinstance(scope, dict):
        F.add("USF-TEST-READINESS-055", f"{SEMANTIC_UNIT_SUITE_PATH}#scope", "scope is missing")
    else:
        for key in (
            "serviceBackedCoverageClaim",
            "composedServiceCoverageClaim",
            "finalTestReadinessClaim",
            "inMemoryServiceSubstituteAllowedForServiceBackedClaims",
        ):
            if scope.get(key) is not False:
                F.add("USF-TEST-READINESS-058", f"{SEMANTIC_UNIT_SUITE_PATH}#scope.{key}", "unit suite must not allow service-backed or final readiness claim")

    required_facets = set(suite.get("facetKeysRequired", []))
    expected_facets = {
        "auditModel",
        "contracts",
        "errorModel",
        "lifecycle",
        "permissions",
        "proof",
        "readinessModel",
        "stateModel",
        "uiSemanticDefinition",
        "validation",
    }
    if required_facets != expected_facets:
        F.add("USF-TEST-READINESS-056", f"{SEMANTIC_UNIT_SUITE_PATH}#facetKeysRequired", "facet inventory is incomplete")

    mappings = _list_by_id(suite.get("unitObligationMappings"), "contractId")
    if len(mappings) != expected_count:
        F.add("USF-TEST-READINESS-056", str(SEMANTIC_UNIT_SUITE_PATH), "unit obligation mapping count must match manifest")
    mapped_files = _list_by_id(suite.get("mappedTestFiles"), "path")
    for row in unit_rows:
        contract_id = str(row.get("contractId"))
        subject = f"{SEMANTIC_UNIT_SUITE_PATH}#unitObligationMappings.{contract_id}"
        mapping = mappings.get(contract_id)
        if not mapping:
            F.add("USF-TEST-READINESS-056", subject, "unit semantic contract lacks mapping")
            continue
        test_file = str(mapping.get("testFile", ""))
        test_name = str(mapping.get("testName", ""))
        if mapping.get("capabilityDomain") != row.get("capabilityDomain"):
            F.add("USF-TEST-READINESS-056", subject, "capability domain mapping is stale")
        if set(mapping.get("facetKeysCovered", [])) != set(row.get("facetKeys", [])):
            F.add("USF-TEST-READINESS-056", subject, "facet coverage mapping is stale")
        if mapping.get("serviceBackedCoverageClaim") is not False or mapping.get("inMemoryServiceSubstituteAllowedForServiceBackedClaims") is not False:
            F.add("USF-TEST-READINESS-058", subject, "unit mapping must not claim service-backed coverage")
        if test_file not in mapped_files:
            F.add("USF-TEST-READINESS-057", subject, "test file is not declared in mappedTestFiles")
        text = _source_text(test_file)
        if not text:
            F.add("USF-TEST-READINESS-057", test_file, "mapped unit test file is missing")
        elif test_name not in text and "unit obligation mapping remains current" not in text:
            F.add("USF-TEST-READINESS-057", subject, "mapped unit test name is missing from test file")

    for path, file_row in mapped_files.items():
        subject = f"{SEMANTIC_UNIT_SUITE_PATH}#mappedTestFiles.{path}"
        text = _source_text(path)
        if not text:
            F.add("USF-TEST-READINESS-057", path, "mapped test file is missing")
            continue
        for test_name in file_row.get("testNames", []):
            if test_name not in text:
                F.add("USF-TEST-READINESS-057", subject, f"test name is missing: {test_name}")

    coverage = suite.get("coverageContribution")
    if not isinstance(coverage, dict):
        F.add("USF-TEST-READINESS-059", f"{SEMANTIC_UNIT_SUITE_PATH}#coverageContribution", "coverage contribution is missing")
    else:
        if coverage.get("unitScopeLineCoverageTarget") != "100-percent":
            F.add("USF-TEST-READINESS-059", f"{SEMANTIC_UNIT_SUITE_PATH}#coverageContribution", "unit LCOV target must be 100-percent")
        if coverage.get("finalLcovGateOwnerIssueId") != "USF-240":
            F.add("USF-TEST-READINESS-059", f"{SEMANTIC_UNIT_SUITE_PATH}#coverageContribution", "final LCOV gate owner must be USF-240")
        if coverage.get("finalLcovGateClaimAllowed") is not False:
            F.add("USF-TEST-READINESS-059", f"{SEMANTIC_UNIT_SUITE_PATH}#coverageContribution", "USF-241 must not allow final LCOV gate claim")
        if not coverage.get("unitScopeImplementationCode") or not coverage.get("evidenceCommand"):
            F.add("USF-TEST-READINESS-059", f"{SEMANTIC_UNIT_SUITE_PATH}#coverageContribution", "unit implementation scope and evidence command are required")

    commands = set(suite.get("validationCommands", []))
    for expected in (
        "corepack pnpm test-readiness:validate",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
        "corepack pnpm test",
    ):
        if expected not in commands:
            F.add("USF-TEST-READINESS-055", f"{SEMANTIC_UNIT_SUITE_PATH}#validationCommands", f"missing validation command {expected}")
    non_claims = set(suite.get("nonClaims", suite.get("nonClaimsPreserved", [])))
    missing = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing:
        F.add("USF-TEST-READINESS-060", str(SEMANTIC_UNIT_SUITE_PATH), f"missing non-claims: {missing}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(suite.get("allowedClaims", [])))
    if bad or suite.get("testReadinessClaimAllowed") is not False:
        F.add("USF-TEST-READINESS-060", str(SEMANTIC_UNIT_SUITE_PATH), "semantic unit suite overclaims readiness")


def _functional_regression_semantic_obligations(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    rows = manifest.get("semanticContractObligations", [])
    if not isinstance(rows, list):
        return []
    return [
        row
        for row in rows
        if isinstance(row, dict) and "USF-244" in set(row.get("ownerIssueIds", []))
    ]


def _functional_regression_service_obligations(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    rows = manifest.get("serviceObligations", [])
    if not isinstance(rows, list):
        return []
    return [
        row
        for row in rows
        if isinstance(row, dict) and "USF-244" in set(row.get("ownerIssueIds", []))
    ]


def _case_types(row: dict[str, Any]) -> set[str]:
    cases = row.get("behaviourCases")
    if not isinstance(cases, list):
        return set()
    return {str(case.get("caseType")) for case in cases if isinstance(case, dict)}


def _cases_disallow_claims(row: dict[str, Any]) -> bool:
    cases = row.get("behaviourCases")
    if not isinstance(cases, list) or not cases:
        return False
    return all(
        isinstance(case, dict)
        and case.get("inMemoryServiceSubstituteAllowed") is False
        and case.get("testReadinessClaimAllowed") is False
        for case in cases
    )


def check_functional_regression_suite(F: Findings, state: dict[str, Any]) -> None:
    suite = state["functionalRegressionSuite"]
    manifest = state["obligationManifest"]
    if not isinstance(suite, dict):
        F.add("USF-TEST-READINESS-061", str(FUNCTIONAL_REGRESSION_SUITE_PATH), "functional regression suite is missing")
        return
    if not isinstance(manifest, dict):
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "sourceAuthorities",
        "scope",
        "testFiles",
        "semanticRegressionRows",
        "serviceRegressionRows",
        "driftDetection",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    ):
        if key not in suite:
            F.add("USF-TEST-READINESS-061", str(FUNCTIONAL_REGRESSION_SUITE_PATH), f"missing top-level field {key}")
    if suite.get("issueId") != "USF-244" or suite.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-061", str(FUNCTIONAL_REGRESSION_SUITE_PATH), "issue linkage must be USF-244 under USF-234")

    authorities = suite.get("sourceAuthorities")
    expected_authorities = {
        "obligationManifest": str(OBLIGATION_MANIFEST_PATH),
        "semanticUnitSuite": str(SEMANTIC_UNIT_SUITE_PATH),
        "composedIntegrationMatrix": str(INTEGRATION_MATRIX_PATH),
        "fixtureCorpus": str(FIXTURE_CORPUS_PATH),
        "semanticContracts": str(SEMANTIC_CONTRACT_DIR),
    }
    if not isinstance(authorities, dict):
        F.add("USF-TEST-READINESS-061", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#sourceAuthorities", "source authorities are missing")
    else:
        for key, value in expected_authorities.items():
            if authorities.get(key) != value:
                F.add("USF-TEST-READINESS-061", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#sourceAuthorities.{key}", "source authority is stale")

    scope = suite.get("scope")
    if not isinstance(scope, dict):
        F.add("USF-TEST-READINESS-061", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#scope", "scope is missing")
    else:
        if scope.get("serviceBackedClaimsRequireComposedEvidence") is not True:
            F.add("USF-TEST-READINESS-065", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#scope", "service-backed claims must require composed evidence")
        if scope.get("inMemoryServiceSubstituteAllowedForServiceBackedClaims") is not False:
            F.add("USF-TEST-READINESS-065", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#scope", "in-memory substitutes must be forbidden")
        if scope.get("finalTestReadinessClaim") is not False:
            F.add("USF-TEST-READINESS-065", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#scope", "final readiness claim must be false")
        if set(scope.get("behaviourCaseTypesRequired", [])) != REQUIRED_FUNCTIONAL_REGRESSION_CASES:
            F.add("USF-TEST-READINESS-064", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#scope", "required behaviour case inventory is incomplete")

    expected_semantic = _functional_regression_semantic_obligations(manifest)
    expected_services = _functional_regression_service_obligations(manifest)
    if isinstance(scope, dict):
        if scope.get("semanticContractCount") != len(expected_semantic):
            F.add("USF-TEST-READINESS-062", str(FUNCTIONAL_REGRESSION_SUITE_PATH), "semantic contract count is stale")
        if scope.get("serviceRegressionCount") != len(expected_services):
            F.add("USF-TEST-READINESS-063", str(FUNCTIONAL_REGRESSION_SUITE_PATH), "service regression count is stale")

    semantic_rows = _list_by_id(suite.get("semanticRegressionRows"), "contractId")
    if len(semantic_rows) != len(expected_semantic):
        F.add("USF-TEST-READINESS-062", str(FUNCTIONAL_REGRESSION_SUITE_PATH), "semantic regression mapping count must match manifest")
    for row in expected_semantic:
        contract_id = str(row.get("contractId"))
        subject = f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#semanticRegressionRows.{contract_id}"
        mapping = semantic_rows.get(contract_id)
        if not mapping:
            F.add("USF-TEST-READINESS-062", subject, "semantic contract lacks functional regression mapping")
            continue
        if mapping.get("semanticContractPath") != row.get("path"):
            F.add("USF-TEST-READINESS-062", subject, "semantic contract path is stale")
        if mapping.get("capability") != row.get("capability") or mapping.get("capabilityDomain") != row.get("capabilityDomain"):
            F.add("USF-TEST-READINESS-062", subject, "semantic capability metadata is stale")
        if set(mapping.get("facetKeysCovered", [])) != set(row.get("facetKeys", [])):
            F.add("USF-TEST-READINESS-062", subject, "facet coverage mapping is stale")
        if mapping.get("sourceObligationEvidenceId") != row.get("evidenceId"):
            F.add("USF-TEST-READINESS-062", subject, "source obligation evidence id is stale")
        if mapping.get("testFile") != FUNCTIONAL_REGRESSION_TEST_PATH:
            F.add("USF-TEST-READINESS-062", subject, "test file is stale")
        text = _source_text(str(mapping.get("testFile", "")))
        if not text or (
            str(mapping.get("testName", "")) not in text
            and "functional regression obligation remains current" not in text
        ):
            F.add("USF-TEST-READINESS-062", subject, "mapped test name is missing from test file")
        if _case_types(mapping) != REQUIRED_FUNCTIONAL_REGRESSION_CASES:
            F.add("USF-TEST-READINESS-064", subject, "behaviour case coverage is incomplete")
        if (
            mapping.get("inMemoryServiceSubstituteAllowedForServiceBackedClaims") is not False
            or mapping.get("testReadinessClaimAllowed") is not False
            or not _cases_disallow_claims(mapping)
        ):
            F.add("USF-TEST-READINESS-065", subject, "semantic functional row allows unsafe substitute or claim")

    service_rows = _list_by_id(suite.get("serviceRegressionRows"), "serviceId")
    integration_rows = _list_by_id(state["integrationMatrix"].get("serviceIntegrationRows", []) if isinstance(state["integrationMatrix"], dict) else [], "serviceId")
    disposition_rows = _list_by_id(state["integrationMatrix"].get("serviceCatalogueDispositionRows", []) if isinstance(state["integrationMatrix"], dict) else [], "serviceCatalogueId")
    fixture_rows = _list_by_id(state["fixtureCorpus"].get("serviceFixtures", []) if isinstance(state["fixtureCorpus"], dict) else [], "serviceId")
    if len(service_rows) != len(expected_services):
        F.add("USF-TEST-READINESS-063", str(FUNCTIONAL_REGRESSION_SUITE_PATH), "service regression mapping count must match manifest")
    for row in expected_services:
        service_id = str(row.get("serviceId"))
        subject = f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#serviceRegressionRows.{service_id}"
        mapping = service_rows.get(service_id)
        if not mapping:
            F.add("USF-TEST-READINESS-063", subject, "service lacks functional regression mapping")
            continue
        if mapping.get("composeServiceId") != row.get("composeServiceId"):
            F.add("USF-TEST-READINESS-063", subject, "compose service id is stale")
        if mapping.get("fixtureSeedId") != row.get("fixtureSeedId"):
            F.add("USF-TEST-READINESS-063", subject, "fixture seed id is stale")
        fixture = fixture_rows.get(service_id)
        if not fixture or mapping.get("fixtureCorpusSeedId") != fixture.get("fixtureSeedId"):
            F.add("USF-TEST-READINESS-063", subject, "fixture corpus mapping is stale")
        integration = integration_rows.get(service_id)
        disposition = disposition_rows.get(service_id)
        if row.get("requiredInTest") and not integration and not disposition:
            F.add("USF-TEST-READINESS-063", subject, "service-backed row lacks composed integration or catalogue disposition mapping")
        elif integration and mapping.get("integrationMatrixDisposition") != integration.get("integrationDisposition"):
            F.add("USF-TEST-READINESS-063", subject, "integration matrix disposition is stale")
        elif not integration and disposition and mapping.get("serviceCatalogueDisposition") != disposition.get("testDisposition"):
            F.add("USF-TEST-READINESS-063", subject, "service catalogue disposition is stale")
        if mapping.get("assetInventoryClass") != row.get("assetInventoryClass") or mapping.get("dataClassification") != row.get("dataClassification"):
            F.add("USF-TEST-READINESS-063", subject, "service metadata is stale")
        if mapping.get("testFile") != FUNCTIONAL_REGRESSION_TEST_PATH:
            F.add("USF-TEST-READINESS-063", subject, "test file is stale")
        text = _source_text(str(mapping.get("testFile", "")))
        if not text or (
            str(mapping.get("testName", "")) not in text
            and "service functional regression boundary remains current" not in text
        ):
            F.add("USF-TEST-READINESS-063", subject, "mapped test name is missing from test file")
        if _case_types(mapping) != REQUIRED_FUNCTIONAL_REGRESSION_CASES:
            F.add("USF-TEST-READINESS-064", subject, "service behaviour case coverage is incomplete")
        if (
            mapping.get("serviceBackedClaimRequiresComposedService") != bool(row.get("requiredInTest"))
            or mapping.get("inMemoryServiceSubstituteAllowed") is not False
            or mapping.get("testReadinessClaimAllowed") is not False
            or not _cases_disallow_claims(mapping)
        ):
            F.add("USF-TEST-READINESS-065", subject, "service functional row allows unsafe substitute or claim")

    commands = set(suite.get("validationCommands", []))
    for expected in (
        FUNCTIONAL_REGRESSION_COMMAND,
        "corepack pnpm test-readiness:validate",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
    ):
        if expected not in commands:
            F.add("USF-TEST-READINESS-061", f"{FUNCTIONAL_REGRESSION_SUITE_PATH}#validationCommands", f"missing validation command {expected}")
    non_claims = set(suite.get("nonClaims", []))
    missing = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing:
        F.add("USF-TEST-READINESS-066", str(FUNCTIONAL_REGRESSION_SUITE_PATH), f"missing non-claims: {missing}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(suite.get("allowedClaims", [])))
    if bad:
        F.add("USF-TEST-READINESS-066", str(FUNCTIONAL_REGRESSION_SUITE_PATH), f"prohibited claim appears in allowedClaims: {bad}")


def _enterprise_rows(model: dict[str, Any], section_id: str) -> list[dict[str, Any]]:
    rows = model.get(section_id)
    if isinstance(rows, list):
        return [row for row in rows if isinstance(row, dict)]
    if isinstance(rows, dict):
        return [rows]
    return []


def _enterprise_rule_for_section(section_id: str) -> str:
    return {
        "soaSupportMappings": "USF-TEST-READINESS-068",
        "evidenceRegister": "USF-TEST-READINESS-069",
        "threatModelAbuseCaseRegister": "USF-TEST-READINESS-070",
        "accessReviewPrivilegedOperationPosture": "USF-TEST-READINESS-071",
        "backupRestoreResiliencePosture": "USF-TEST-READINESS-072",
        "incidentVulnerabilityManagementEvidence": "USF-TEST-READINESS-073",
        "privacyDataMinimisationPosture": "USF-TEST-READINESS-074",
    }.get(section_id, "USF-TEST-READINESS-067")


def check_enterprise_control_suite(F: Findings, state: dict[str, Any]) -> None:
    suite = state["enterpriseControlSuite"]
    if not isinstance(suite, dict):
        F.add("USF-TEST-READINESS-067", str(ENTERPRISE_CONTROL_SUITE_PATH), "enterprise control evidence suite is missing")
        return
    for key in (
        "id",
        "issueId",
        "parentIssueId",
        "sourceAuthorities",
        "scope",
        "requiredEnterpriseSections",
        "semanticServiceMapping",
        "serviceBackedTestMapping",
        "ciaEvidenceTests",
        "validationCommands",
        "enterpriseEvidenceRefs",
        "allowedClaims",
        "nonClaims",
    ):
        if key not in suite:
            F.add("USF-TEST-READINESS-067", str(ENTERPRISE_CONTROL_SUITE_PATH), f"missing top-level field {key}")
    if suite.get("issueId") != "USF-243" or suite.get("parentIssueId") != "USF-234":
        F.add("USF-TEST-READINESS-067", str(ENTERPRISE_CONTROL_SUITE_PATH), "issue linkage must be USF-243 under USF-234")
    sources = suite.get("sourceAuthorities", {})
    expected_sources = {
        "enterpriseEvidenceModel": str(ENTERPRISE_MODEL_PATH),
        "obligationManifest": str(OBLIGATION_MANIFEST_PATH),
        "testEnvironmentContract": str(CONTRACT_PATH),
        "composedIntegrationMatrix": str(INTEGRATION_MATRIX_PATH),
        "fixtureCorpus": str(FIXTURE_CORPUS_PATH),
    }
    for key, expected in expected_sources.items():
        if not isinstance(sources, dict) or sources.get(key) != expected:
            F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#sourceAuthorities.{key}", "source authority is stale")

    manifest = state["obligationManifest"]
    if not isinstance(manifest, dict):
        F.add("USF-TEST-READINESS-067", str(ENTERPRISE_CONTROL_SUITE_PATH), "obligation manifest is unavailable")
        return
    semantic_rows = [
        row
        for row in manifest.get("semanticContractObligations", [])
        if isinstance(row, dict) and "USF-243" in row.get("ownerIssueIds", [])
    ]
    service_rows = [
        row
        for row in manifest.get("serviceObligations", [])
        if isinstance(row, dict) and "USF-243" in row.get("ownerIssueIds", [])
    ]
    scope = suite.get("scope", {})
    if not isinstance(scope, dict):
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#scope", "scope is missing")
    else:
        if scope.get("semanticContractEnterpriseObligationCount") != len(semantic_rows):
            F.add("USF-TEST-READINESS-067", str(ENTERPRISE_CONTROL_SUITE_PATH), "semantic enterprise obligation count is stale")
        if scope.get("serviceEnterpriseObligationCount") != len(service_rows):
            F.add("USF-TEST-READINESS-067", str(ENTERPRISE_CONTROL_SUITE_PATH), "service enterprise obligation count is stale")
        for key in (
            "inMemoryServiceSubstituteAllowedForServiceBackedClaims",
            "isoCertificationClaimAllowed",
            "socReadinessClaimAllowed",
            "productionReadinessClaimAllowed",
            "liveProviderReadinessClaimAllowed",
            "enterpriseProductionReadinessClaimAllowed",
            "finalTestReadinessClaimAllowed",
        ):
            if scope.get(key) is not False:
                F.add("USF-TEST-READINESS-075", f"{ENTERPRISE_CONTROL_SUITE_PATH}#scope.{key}", "enterprise control suite must not allow readiness or certification claims")

    semantic_mapping = suite.get("semanticServiceMapping", {})
    if not isinstance(semantic_mapping, dict):
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#semanticServiceMapping", "semantic mapping is missing")
    else:
        if semantic_mapping.get("ownerIssueId") != "USF-243" or semantic_mapping.get("requiredObligationClass") != "enterprise-evidence":
            F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#semanticServiceMapping", "semantic mapping issue or obligation class is stale")
        if semantic_mapping.get("semanticContractIds") != [row.get("contractId") for row in semantic_rows]:
            F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#semanticServiceMapping", "semantic contract mapping is stale")
    for row in semantic_rows:
        if "enterprise-evidence" not in row.get("obligationClassIds", []):
            F.add("USF-TEST-READINESS-067", f"{OBLIGATION_MANIFEST_PATH}#{row.get('contractId')}", "semantic row lacks enterprise-evidence obligation")

    service_mapping = suite.get("serviceBackedTestMapping", {})
    if not isinstance(service_mapping, dict):
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#serviceBackedTestMapping", "service mapping is missing")
    else:
        if service_mapping.get("ownerIssueId") != "USF-243" or service_mapping.get("requiredObligationClass") != "enterprise-evidence":
            F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#serviceBackedTestMapping", "service mapping issue or obligation class is stale")
        if service_mapping.get("serviceIds") != [row.get("serviceId") for row in service_rows]:
            F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#serviceBackedTestMapping", "service mapping is stale")
        if service_mapping.get("serviceBackedClaimsRequireComposedEvidence") is not True or service_mapping.get("inMemoryServiceSubstituteAllowed") is not False:
            F.add("USF-TEST-READINESS-075", f"{ENTERPRISE_CONTROL_SUITE_PATH}#serviceBackedTestMapping", "service-backed claims must require composed evidence and forbid in-memory substitutes")
    for row in service_rows:
        if "enterprise-evidence" not in row.get("obligationClassIds", []):
            F.add("USF-TEST-READINESS-067", f"{OBLIGATION_MANIFEST_PATH}#{row.get('serviceId')}", "service row lacks enterprise-evidence obligation")
        if row.get("inMemoryServiceSubstituteAllowed") is True:
            F.add("USF-TEST-READINESS-075", f"{OBLIGATION_MANIFEST_PATH}#{row.get('serviceId')}", "service row allows in-memory substitute")

    required_sections = suite.get("requiredEnterpriseSections", [])
    if not isinstance(required_sections, list) or len(required_sections) != scope.get("requiredEnterpriseSectionCount"):
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#requiredEnterpriseSections", "enterprise section inventory is incomplete")
        required_sections = []
    for section in required_sections:
        if not isinstance(section, dict):
            continue
        section_id = str(section.get("sectionId"))
        rule_id = _enterprise_rule_for_section(section_id)
        rows = _enterprise_rows(state["enterpriseModel"], section_id)
        if len(rows) != section.get("expectedRowCount"):
            F.add(rule_id, f"{ENTERPRISE_CONTROL_SUITE_PATH}#{section_id}", "enterprise section row count is stale")
        required_fields = section.get("requiredFields", [])
        if not isinstance(required_fields, list) or not required_fields:
            F.add(rule_id, f"{ENTERPRISE_CONTROL_SUITE_PATH}#{section_id}", "requiredFields is missing")
            continue
        for row in rows:
            for field in required_fields:
                if field not in row:
                    F.add(rule_id, f"{ENTERPRISE_MODEL_PATH}#{section_id}.{row.get('id', section_id)}", f"missing required field {field}")

    soa_rows = _enterprise_rows(state["enterpriseModel"], "soaSupportMappings")
    for row in soa_rows:
        if not all(row.get(field) for field in ("owner", "riskOwner", "controlOwner", "validationCommand")):
            F.add("USF-TEST-READINESS-068", f"{ENTERPRISE_MODEL_PATH}#soaSupportMappings.{row.get('id')}", "SoA row lacks owner or command metadata")
        if not isinstance(row.get("nonClaims"), list):
            F.add("USF-TEST-READINESS-068", f"{ENTERPRISE_MODEL_PATH}#soaSupportMappings.{row.get('id')}", "SoA row lacks non-claims")

    evidence_rows = _enterprise_rows(state["enterpriseModel"], "evidenceRegister")
    for row in evidence_rows:
        if not all(row.get(field) for field in ("validationCommand", "commandPin", "commitPin", "prOrMergeSha", "retentionPosture")):
            F.add("USF-TEST-READINESS-069", f"{ENTERPRISE_MODEL_PATH}#evidenceRegister.{row.get('id')}", "evidence row lacks command commit PR or retention pin")
        if not isinstance(row.get("issueLinks"), list) or not row.get("issueLinks"):
            F.add("USF-TEST-READINESS-069", f"{ENTERPRISE_MODEL_PATH}#evidenceRegister.{row.get('id')}", "evidence row lacks issue links")

    for section_id, rule_id in (
        ("threatModelAbuseCaseRegister", "USF-TEST-READINESS-070"),
        ("accessReviewPrivilegedOperationPosture", "USF-TEST-READINESS-071"),
        ("backupRestoreResiliencePosture", "USF-TEST-READINESS-072"),
        ("incidentVulnerabilityManagementEvidence", "USF-TEST-READINESS-073"),
        ("privacyDataMinimisationPosture", "USF-TEST-READINESS-074"),
    ):
        for row in _enterprise_rows(state["enterpriseModel"], section_id):
            if section_id == "threatModelAbuseCaseRegister":
                if not isinstance(row.get("abuseCases"), list) or not isinstance(row.get("failureModes"), list):
                    F.add(rule_id, f"{ENTERPRISE_MODEL_PATH}#{section_id}.{row.get('id')}", "threat row lacks abuse cases or failure modes")
            elif not isinstance(row.get("nonClaims"), list):
                F.add(rule_id, f"{ENTERPRISE_MODEL_PATH}#{section_id}.{row.get('id')}", "posture row lacks non-claims")

    observability = state["enterpriseModel"].get("observabilityEvidenceStandard")
    prohibited = set(observability.get("prohibitedFields", [])) if isinstance(observability, dict) else set()
    if not {"secret", "token", "rawEndpoint", "connectionString", "stackTrace", "rawSdkError", "providerPayload"}.issubset(prohibited):
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_MODEL_PATH}#observabilityEvidenceStandard", "observability standard lacks prohibited sensitive fields")
    done_state = state["enterpriseModel"].get("doneStateGovernance")
    if not isinstance(done_state, dict) or done_state.get("validationPassingAloneIsNotDone") is not True or done_state.get("doneClaimed") is not False:
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_MODEL_PATH}#doneStateGovernance", "done-state governance markers are unsafe")

    cia = suite.get("ciaEvidenceTests", {})
    if not isinstance(cia, dict) or set(cia) != {"confidentiality", "integrity", "availability"}:
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#ciaEvidenceTests", "CIA evidence tests are incomplete")
    elif any(not isinstance(values, list) or len(values) < 4 for values in cia.values()):
        F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#ciaEvidenceTests", "CIA evidence test coverage is too weak")

    commands = set(suite.get("validationCommands", []))
    for expected in (
        ENTERPRISE_CONTROL_COMMAND,
        "corepack pnpm test-readiness:validate",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
    ):
        if expected not in commands:
            F.add("USF-TEST-READINESS-067", f"{ENTERPRISE_CONTROL_SUITE_PATH}#validationCommands", f"missing validation command {expected}")
    non_claims = set(suite.get("nonClaims", []))
    missing = sorted(REQUIRED_HARNESS_NON_CLAIMS - non_claims)
    if missing:
        F.add("USF-TEST-READINESS-075", str(ENTERPRISE_CONTROL_SUITE_PATH), f"missing non-claims: {missing}")
    bad = sorted(PROHIBITED_ALLOWED_CLAIMS & set(suite.get("allowedClaims", [])))
    if bad:
        F.add("USF-TEST-READINESS-075", str(ENTERPRISE_CONTROL_SUITE_PATH), f"prohibited claim appears in allowedClaims: {bad}")


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
        "test-readiness-integration": INTEGRATION_MATRIX_COMMAND,
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
        for expected in (HARNESS_COMMAND, LIFECYCLE_COMMAND, INTEGRATION_MATRIX_COMMAND, TEST_READINESS_COMPOSED_COMMAND):
            if expected not in commands:
                F.add("USF-TEST-READINESS-022", f"{COMMAND_SURFACE_PATH}#composedExecution.requiredCommands", f"missing command {expected}")

    validation_commands = set(command_surface.get("validationCommands", []))
    for expected in (
        TEST_READINESS_COMMAND,
        TEST_READINESS_COMPOSED_COMMAND,
        TEST_READINESS_ASSURANCE_COMMAND,
        INTEGRATION_MATRIX_COMMAND,
        "make test-ready",
        "make test-composed",
        "make test-readiness-integration",
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
        "test-readiness-integration": "corepack pnpm test-readiness:integration",
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
    if scripts.get("test-readiness:integration") != INTEGRATION_MATRIX_SCRIPT:
        F.add("USF-TEST-READINESS-051", "package.json#scripts", "test-readiness:integration script is missing or stale")
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
    check_obligation_manifest(F, state)
    check_fixture_corpus(F, state)
    check_integration_matrix(F, state)
    check_semantic_unit_suite(F, state)
    check_functional_regression_suite(F, state)
    check_enterprise_control_suite(F, state)
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
