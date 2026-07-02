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
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = Path("docs/architecture/test-environment-service-contract.json")
HARNESS_PATH = Path("docs/architecture/composed-semantic-test-harness.json")
SERVICE_CATALOGUE_PATH = Path("spec/instances/compose-service/service-catalogue.json")
ENTERPRISE_MODEL_PATH = Path("spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json")
PACKAGE_PATH = Path("package.json")
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
    "USF-TEST-READINESS-SELFTEST": ("blocking", "planted test-readiness defect did not raise its expected rule"),
}

COMPOSE_TARGET = "compose/compose.test.generated.yaml"
HARNESS_COMMAND = "corepack pnpm test-readiness:semantic"
HARNESS_SCRIPT = "tsx packages/proof/src/composed-semantic-test-harness-proof.ts"
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


def apply_package_defect(package: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(package)
    scripts = out.setdefault("scripts", {})
    for key in defect.get("packageScriptDrop", []):
        scripts.pop(key, None)
    for key, value in defect.get("packageScriptSet", {}).items():
        scripts[key] = value
    return out


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    defect = defect or {}
    contract = read_json(CONTRACT_PATH) if (ROOT / CONTRACT_PATH).exists() else None
    contract = apply_contract_defect(contract, defect)
    harness = read_json(HARNESS_PATH) if (ROOT / HARNESS_PATH).exists() else None
    harness = apply_harness_defect(harness, defect)
    return {
        "contract": contract,
        "harness": harness,
        "serviceCatalogue": read_json(SERVICE_CATALOGUE_PATH),
        "enterpriseModel": read_json(ENTERPRISE_MODEL_PATH),
        "package": apply_package_defect(read_json(PACKAGE_PATH), defect),
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
) -> None:
    if not isinstance(artifact, dict):
        return
    refs = artifact.get("enterpriseEvidenceRefs")
    if not isinstance(refs, dict):
        F.add("USF-TEST-READINESS-009", str(path), "enterpriseEvidenceRefs must be present")
        return
    for section in ENTERPRISE_REF_SECTIONS:
        values = refs.get(section)
        if not isinstance(values, list) or not values:
            F.add("USF-TEST-READINESS-009", f"{path}#{section}", "enterprise evidence ref is missing")
            continue
        model_ids = {
            row.get("id")
            for row in enterprise_model.get(section, [])
            if isinstance(row, dict)
        }
        for value in values:
            if value not in model_ids:
                F.add("USF-TEST-READINESS-009", f"{path}#{section}", f"missing enterprise row {value}")


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


def run_checks(state: dict[str, Any]) -> Findings:
    F = Findings()
    check_shape(F, state["contract"])
    check_service_inventory(F, state)
    check_harness(F, state)
    check_claims(F, state["contract"])
    check_enterprise_refs(F, state)
    check_package_wiring(F, state["package"])
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
