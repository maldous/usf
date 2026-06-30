#!/usr/bin/env python3
"""USF enterprise evidence model validator.

This validator enforces the repository-level enterprise evidence model used by
implementation lanes. It validates shape, SoA-support coverage, proof evidence
register pins, threat/abuse posture, SDK governance, observability evidence
standards, access/resilience/incident/privacy posture, done-state governance,
and Lane 1 closure-matrix linkage. It does not execute proof commands and does
not claim ISO/SOC/staging/production/live-provider/full-dev/full-parity readiness.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
except Exception:  # pragma: no cover - dependency is present in normal validation.
    Draft202012Validator = None


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = Path("spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json")
SCHEMA_PATH = Path("spec/schemas/enterprise-evidence.schema.json")
SERVICE_CATALOGUE_PATH = Path("spec/instances/compose-service/service-catalogue.json")
RUNTIME_MANIFEST_PATH = Path("spec/instances/runtime-proof/runtime-application-compose-parity.json")
CLOSURE_MATRIX_PATH = Path("docs/architecture/compose-service-disposition-closure-matrix.json")
PACKAGE_PATH = Path("package.json")
PLANTED_DEFECT_DIR = Path("tools/validate-enterprise/planted-defects")

RULES = {
    "USF-ENTERPRISE-001": ("blocking", "enterprise evidence model is missing or invalid"),
    "USF-ENTERPRISE-002": ("blocking", "SoA-support mapping coverage is incomplete"),
    "USF-ENTERPRISE-003": ("blocking", "enterprise evidence register row is incomplete"),
    "USF-ENTERPRISE-004": ("blocking", "threat model or abuse-case posture is incomplete"),
    "USF-ENTERPRISE-005": ("blocking", "SDK dependency governance is incomplete or unpinned"),
    "USF-ENTERPRISE-006": ("blocking", "logging tracing metrics or audit evidence standard is incomplete"),
    "USF-ENTERPRISE-007": ("blocking", "done-state governance is unsafe or overclaimed"),
    "USF-ENTERPRISE-008": ("blocking", "Lane 1 service disposition closure matrix lacks enterprise linkage"),
    "USF-ENTERPRISE-009": ("blocking", "access resilience incident or privacy posture is incomplete"),
    "USF-ENTERPRISE-SELFTEST": ("blocking", "planted enterprise defect did not raise its expected rule"),
}

REQUIRED_NON_CLAIMS = {
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-react-parity-readiness",
}
REQUIRED_LANES = {"USF-185", "USF-186", "USF-187", "USF-188", "USF-189", "USF-190", "USF-191"}
APPROVED_LANES = REQUIRED_LANES
BLOCKED_LANES = REQUIRED_LANES - APPROVED_LANES
VALIDATOR_ROWS = {
    "validate-spec": "tools/validate-spec/validate-spec.py",
    "validate-bootstrap": "tools/validate-bootstrap/validate-bootstrap.py",
    "validate-parity": "tools/validate-parity/validate-parity.py",
    "validate-compose": "tools/validate-compose/validate-compose.py",
    "validate-runtime": "tools/validate-runtime/validate-runtime.py",
    "validate-enterprise": "tools/validate-enterprise/validate-enterprise.py",
}
REQUIRED_OBSERVABILITY_FIELDS = {
    "correlationId",
    "serviceId",
    "providerId",
    "adapterId",
    "runtimeMode",
    "tenantSafeContext",
    "outcome",
    "retryCount",
    "durationBucket",
    "safeReasonCode",
}
PROHIBITED_OBSERVABILITY_FIELDS = {
    "secret",
    "token",
    "rawEndpoint",
    "connectionString",
    "stackTrace",
    "rawSdkError",
    "providerPayload",
    "password",
    "privateKey",
}
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
PINNED_VERSION_RE = re.compile(r"^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][0-9A-Za-z.-]+)?$")


class Findings:
    def __init__(self) -> None:
        self.items: list[dict[str, str]] = []

    def add(self, rule_id: str, subject: str, message: str = "") -> None:
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append(
            {
                "severity": severity,
                "ruleId": rule_id,
                "subject": str(subject),
                "message": message or RULES.get(rule_id, ("", ""))[1],
            }
        )

    def blocking_or_error(self) -> list[dict[str, str]]:
        return [item for item in self.items if item["severity"] in {"blocking", "error"}]

    def rule_ids(self) -> set[str]:
        return {item["ruleId"] for item in self.items}


def read_json(path: Path) -> Any:
    with (ROOT / path).open(encoding="utf-8") as handle:
        return json.load(handle)


def rows_by_id(rows: Any) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    if not isinstance(rows, list):
        return out
    for row in rows:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            out[row["id"]] = row
    return out


def binding_service_ids(binding: dict[str, Any]) -> list[str]:
    service_ids = binding.get("serviceCatalogueServiceIds")
    if isinstance(service_ids, list):
        return [str(item) for item in service_ids if isinstance(item, str)]
    service_id = binding.get("serviceCatalogueServiceId")
    return [str(service_id)] if isinstance(service_id, str) else []


def proof_scripts(package: dict[str, Any]) -> dict[str, str]:
    scripts = package.get("scripts") if isinstance(package, dict) else {}
    if not isinstance(scripts, dict):
        return {}
    return {
        name: command
        for name, command in scripts.items()
        if isinstance(command, str)
        and (
            name.startswith("proof:")
            or name
            in {
                "dev:smoke",
                "runtime:proof",
                "runtime:proof:in-memory",
                "runtime:proof:compose",
                "providers-proof",
            }
        )
    }


def service_deferred_reason(service: dict[str, Any]) -> str:
    bits: list[str] = []
    if service.get("requirementState") in {False, "deferred", "out-of-scope"}:
        bits.append(f"requirementState={service.get('requirementState')}")
    if service.get("environmentDisposition") in {
        "deferred",
        "out-of-scope",
        "external-managed",
        "cloud-provider",
    }:
        bits.append(f"environmentDisposition={service.get('environmentDisposition')}")
    if service.get("humanDecisionState") in {"requires-human-decision", "decision-required"}:
        bits.append(f"humanDecisionState={service.get('humanDecisionState')}")
    if service.get("missingEvidence"):
        bits.append("missingEvidence")
    return "; ".join(bits) if bits else "not-deferred"


def service_needs_access_posture(service: dict[str, Any]) -> bool:
    text = " ".join(
        str(service.get(key, "")) for key in ("serviceId", "displayName", "serviceKind", "semanticRoles")
    ).lower()
    return (
        any(marker in text for marker in ("operator", "admin", "gateway", "control-plane"))
        or service.get("accessModel") not in {None, "no-human-access"}
    )


def service_needs_resilience_posture(service: dict[str, Any]) -> bool:
    return service.get("dataBoundary") not in {None, "none"} or service.get("serviceKind") in {
        "database",
        "object-storage",
        "secret-store",
        "event-bus",
        "workflow-runtime",
        "identity-provider",
        "identity-backing-store",
    }


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    defect = defect or {}
    model = read_json(MODEL_PATH)
    schema = read_json(SCHEMA_PATH)
    service_catalogue = read_json(SERVICE_CATALOGUE_PATH)
    runtime_manifest = read_json(RUNTIME_MANIFEST_PATH)
    package = read_json(PACKAGE_PATH)
    closure_matrix = read_json(CLOSURE_MATRIX_PATH) if (ROOT / CLOSURE_MATRIX_PATH).exists() else None

    model = apply_model_defect(model, defect)
    if closure_matrix is not None:
        closure_matrix = apply_closure_defect(closure_matrix, defect)
    return {
        "model": model,
        "schema": schema,
        "serviceCatalogue": service_catalogue,
        "runtimeManifest": runtime_manifest,
        "package": package,
        "closureMatrix": closure_matrix,
    }


def apply_model_defect(model: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(model)
    if defect.get("removeSoaMapping"):
        out["soaSupportMappings"] = [
            row for row in out.get("soaSupportMappings", []) if row.get("id") != defect["removeSoaMapping"]
        ]
    if defect.get("removeThreatModel"):
        out["threatModelAbuseCaseRegister"] = [
            row
            for row in out.get("threatModelAbuseCaseRegister", [])
            if row.get("id") != defect["removeThreatModel"]
        ]
    if defect.get("observabilityDropRequiredField"):
        field = defect["observabilityDropRequiredField"]
        out.get("observabilityEvidenceStandard", {}).setdefault("requiredFields", [])
        out["observabilityEvidenceStandard"]["requiredFields"] = [
            item for item in out["observabilityEvidenceStandard"]["requiredFields"] if item != field
        ]
    for patch in defect.get("evidencePatch", []):
        for row in out.get("evidenceRegister", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    for patch in defect.get("sdkPatch", []):
        for row in out.get("sdkDependencyGovernance", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    for key, value in defect.get("doneStateSet", {}).items():
        out.setdefault("doneStateGovernance", {})[key] = value
    return out


def apply_closure_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("closureMatrixTopSet", {}).items():
        out[key] = value
    service_id = defect.get("removeClosureEnterpriseRefs")
    if service_id:
        for row in out.get("rows", []):
            if row.get("service_id") == service_id:
                row.get("closure_evidence", {}).pop("enterprise_evidence_refs", None)
    return out


def check_shape(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    schema = state["schema"]
    if Draft202012Validator is not None:
        errors = list(Draft202012Validator(schema).iter_errors(model))
        for err in errors:
            loc = "/".join(str(item) for item in err.path)
            subject = f"{MODEL_PATH}:{loc}" if loc else str(MODEL_PATH)
            F.add("USF-ENTERPRISE-001", subject, err.message[:180])
    if not isinstance(model, dict):
        F.add("USF-ENTERPRISE-001", str(MODEL_PATH), "model is not an object")
        return
    if model.get("serviceCatalogueAuthority") != str(SERVICE_CATALOGUE_PATH):
        F.add("USF-ENTERPRISE-001", str(MODEL_PATH), "service catalogue authority path is not pinned")


def check_policy_and_non_claims(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    non_claims = set(model.get("nonClaims", []))
    missing = REQUIRED_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-ENTERPRISE-007", str(MODEL_PATH), f"missing non-claims: {sorted(missing)}")
    policy = model.get("policy", {})
    expected_policy = {
        "statementOfApplicabilitySupportOnly": True,
        "implementationRequiresEnterpriseEvidence": True,
        "doneRequiresEvidence": True,
        "validationPassingAloneIsNotDone": True,
        "runtimeImplementationAllowed": False,
    }
    for key, expected in expected_policy.items():
        if policy.get(key) is not expected:
            F.add("USF-ENTERPRISE-007", f"policy.{key}", f"expected {expected!r}")
    done = model.get("doneStateGovernance", {})
    for key in (
        "acceptanceCriteriaRequireEvidence",
        "deferredItemsRequireFollowUp",
        "nonClaimsMustBePreserved",
        "serviceDispositionRowsMustBeResolved",
        "validationPassingAloneIsNotDone",
    ):
        if done.get(key) is not True:
            F.add("USF-ENTERPRISE-007", f"doneStateGovernance.{key}", "must be true")
    if done.get("doneClaimed") is not False:
        F.add("USF-ENTERPRISE-007", "doneStateGovernance.doneClaimed", "this PR must not claim Done")

    lane_rows = {row.get("laneIssue"): row for row in model.get("laneEvidenceRequirements", [])}
    if set(lane_rows) != REQUIRED_LANES:
        F.add("USF-ENTERPRISE-007", "laneEvidenceRequirements", "lane coverage does not match USF-185 through USF-191")
    for lane in APPROVED_LANES:
        row = lane_rows.get(lane, {})
        if row.get("implementationAllowed") is not True:
            F.add("USF-ENTERPRISE-007", lane, "approved lanes must be implementation-allowed")
    for lane in BLOCKED_LANES:
        row = lane_rows.get(lane, {})
        if row.get("implementationAllowed") is not False:
            F.add("USF-ENTERPRISE-007", lane, "lanes 2 through 7 must remain blocked")


def check_soa_coverage(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    service_catalogue = state["serviceCatalogue"]
    runtime_manifest = state["runtimeManifest"]
    package = state["package"]
    soa = rows_by_id(model.get("soaSupportMappings"))
    services = service_catalogue.get("services", [])
    for service in services:
        service_id = service.get("serviceId")
        if f"soa-service-{service_id}" not in soa:
            F.add("USF-ENTERPRISE-002", service_id, "missing service SoA-support mapping")
        if service_deferred_reason(service) != "not-deferred" and f"soa-deferred-boundary-{service_id}" not in soa:
            F.add("USF-ENTERPRISE-002", service_id, "missing deferred-boundary SoA-support mapping")
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        if f"soa-adapter-{binding_id}" not in soa:
            F.add("USF-ENTERPRISE-002", binding_id, "missing adapter SoA-support mapping")
    for proof_name in proof_scripts(package):
        if f"soa-proof-{proof_name.replace(':', '-')}" not in soa:
            F.add("USF-ENTERPRISE-002", proof_name, "missing proof SoA-support mapping")
    for validator_id in VALIDATOR_ROWS:
        if f"soa-validator-{validator_id}" not in soa:
            F.add("USF-ENTERPRISE-002", validator_id, "missing validator SoA-support mapping")
    for row in soa.values():
        if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-002", row.get("id", "unknown"), "SoA row non-claims are incomplete")
        if not row.get("validationCommand"):
            F.add("USF-ENTERPRISE-002", row.get("id", "unknown"), "SoA row lacks validation command")


def check_evidence_register(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    package = state["package"]
    evidence = rows_by_id(model.get("evidenceRegister"))
    for proof_name, command in proof_scripts(package).items():
        evidence_id = f"evidence-proof-{proof_name.replace(':', '-')}"
        row = evidence.get(evidence_id)
        if not row:
            F.add("USF-ENTERPRISE-003", evidence_id, "missing proof evidence register row")
            continue
        if row.get("commandPin") != command:
            F.add("USF-ENTERPRISE-003", evidence_id, "command pin does not match package script")
    for required_id in (
        "evidence-lane1-service-disposition-closure-matrix",
        "evidence-enterprise-evidence-model-validator",
    ):
        if required_id not in evidence:
            F.add("USF-ENTERPRISE-003", required_id, "missing required repository evidence row")
    for row in evidence.values():
        subject = row.get("id", "unknown")
        if not SHA_RE.fullmatch(str(row.get("commitPin", ""))):
            F.add("USF-ENTERPRISE-003", subject, "commitPin must be a 40-character git SHA")
        if not SHA_RE.fullmatch(str(row.get("prOrMergeSha", ""))):
            F.add("USF-ENTERPRISE-003", subject, "prOrMergeSha must be a 40-character git SHA")
        if not row.get("validationCommand") or not row.get("commandPin"):
            F.add("USF-ENTERPRISE-003", subject, "validation command and command pin are required")
        issue_links = row.get("issueLinks", [])
        if not isinstance(issue_links, list) or not issue_links or not all(str(item).startswith("USF-") for item in issue_links):
            F.add("USF-ENTERPRISE-003", subject, "issue links must be present and use USF issue ids")


def check_threat_posture(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    runtime_manifest = state["runtimeManifest"]
    threats = rows_by_id(model.get("threatModelAbuseCaseRegister"))
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        if f"threat-adapter-{binding_id}" not in threats:
            F.add("USF-ENTERPRISE-004", binding_id, "missing adapter threat model row")
    for lane in REQUIRED_LANES:
        if f"threat-lane-{lane.lower()}" not in threats:
            F.add("USF-ENTERPRISE-004", lane, "missing lane threat model row")
    for row in threats.values():
        for field in ("abuseCases", "failureModes"):
            if not isinstance(row.get(field), list) or not row[field]:
                F.add("USF-ENTERPRISE-004", row.get("id", "unknown"), f"{field} must be populated")
        if not row.get("failClosedBehaviour") or not row.get("monitoringAuditEvidence"):
            F.add("USF-ENTERPRISE-004", row.get("id", "unknown"), "fail-closed and monitoring/audit evidence are required")


def check_sdk_governance(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    runtime_manifest = state["runtimeManifest"]
    package = state["package"]
    package_versions = {}
    for section in ("dependencies", "devDependencies"):
        data = package.get(section, {})
        if isinstance(data, dict):
            package_versions.update(data)
    sdk_rows = rows_by_id(model.get("sdkDependencyGovernance"))
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        packages = [item.strip() for item in str(binding.get("sdkPackage", "")).split(",") if item.strip()]
        versions = [item.strip() for item in str(binding.get("sdkVersion", "")).split(",") if item.strip()]
        for idx, package_name in enumerate(packages):
            expected_version = versions[idx] if idx < len(versions) else (versions[0] if versions else "")
            row_id = f"sdk-{binding_id}-{package_name.replace('@', 'at-').replace('/', '-')}"
            row = sdk_rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-005", row_id, "missing SDK governance row")
                continue
            if row.get("version") != expected_version:
                F.add("USF-ENTERPRISE-005", row_id, "SDK governance version does not match runtime manifest")
            if not PINNED_VERSION_RE.fullmatch(str(row.get("version", ""))):
                F.add("USF-ENTERPRISE-005", row_id, "SDK version must be exact-pinned")
            package_json_version = package_versions.get(package_name)
            if package_json_version != row.get("version"):
                F.add("USF-ENTERPRISE-005", row_id, "SDK governance version does not match package.json")
            if not PINNED_VERSION_RE.fullmatch(str(package_json_version or "")):
                F.add("USF-ENTERPRISE-005", package_name, "package.json dependency must be exact-pinned")
            for field in (
                "selectionRationale",
                "officialOrDeFactoStatus",
                "licencePosture",
                "maintenancePosture",
                "securityAdvisoryPosture",
                "typescriptRuntimeCompatibility",
                "forbiddenLayerImportCheck",
                "updateDeprecationOwner",
            ):
                if not row.get(field):
                    F.add("USF-ENTERPRISE-005", row_id, f"missing {field}")


def check_observability_standard(F: Findings, state: dict[str, Any]) -> None:
    standard = state["model"].get("observabilityEvidenceStandard", {})
    missing_required = REQUIRED_OBSERVABILITY_FIELDS - set(standard.get("requiredFields", []))
    if missing_required:
        F.add("USF-ENTERPRISE-006", "observabilityEvidenceStandard.requiredFields", f"missing {sorted(missing_required)}")
    missing_prohibited = PROHIBITED_OBSERVABILITY_FIELDS - set(standard.get("prohibitedFields", []))
    if missing_prohibited:
        F.add("USF-ENTERPRISE-006", "observabilityEvidenceStandard.prohibitedFields", f"missing {sorted(missing_prohibited)}")
    for field in ("auditEvidenceRequirement", "tracingEvidenceRequirement", "metricsEvidenceRequirement"):
        if not standard.get(field):
            F.add("USF-ENTERPRISE-006", f"observabilityEvidenceStandard.{field}", "missing evidence requirement")


def check_posture_registers(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    service_catalogue = state["serviceCatalogue"]
    runtime_manifest = state["runtimeManifest"]
    package = state["package"]
    access = rows_by_id(model.get("accessReviewPrivilegedOperationPosture"))
    resilience = rows_by_id(model.get("backupRestoreResiliencePosture"))
    incident = rows_by_id(model.get("incidentVulnerabilityManagementEvidence"))
    privacy = rows_by_id(model.get("privacyDataMinimisationPosture"))
    for service in service_catalogue.get("services", []):
        service_id = service.get("serviceId")
        if service_needs_access_posture(service) and f"access-posture-{service_id}" not in access:
            F.add("USF-ENTERPRISE-009", service_id, "missing access review posture row")
        if service_needs_resilience_posture(service) and f"resilience-posture-{service_id}" not in resilience:
            F.add("USF-ENTERPRISE-009", service_id, "missing backup/restore resilience posture row")
        if f"incident-vulnerability-{service_id}" not in incident:
            F.add("USF-ENTERPRISE-009", service_id, "missing incident/vulnerability posture row")
    for proof_name in proof_scripts(package):
        if f"privacy-proof-{proof_name.replace(':', '-')}" not in privacy:
            F.add("USF-ENTERPRISE-009", proof_name, "missing proof privacy/data minimisation posture row")
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        if f"privacy-adapter-{binding_id}" not in privacy:
            F.add("USF-ENTERPRISE-009", binding_id, "missing adapter privacy/data minimisation posture row")


def check_closure_matrix_linkage(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("closureMatrix")
    if matrix is None:
        F.add("USF-ENTERPRISE-008", str(CLOSURE_MATRIX_PATH), "Lane 1 closure matrix is missing")
        return
    if matrix.get("enterprise_evidence_model") != str(MODEL_PATH):
        F.add("USF-ENTERPRISE-008", str(CLOSURE_MATRIX_PATH), "closure matrix lacks enterprise evidence model link")
    if matrix.get("closure_claimed") is not False:
        F.add("USF-ENTERPRISE-007", str(CLOSURE_MATRIX_PATH), "closure matrix must not claim closure while unresolved rows remain")
    unresolved = []
    for row in matrix.get("rows", []):
        evidence = row.get("closure_evidence", {}) if isinstance(row, dict) else {}
        service_id = row.get("service_id", "unknown") if isinstance(row, dict) else "unknown"
        refs = evidence.get("enterprise_evidence_refs")
        if not isinstance(refs, list) or not refs:
            F.add("USF-ENTERPRISE-008", service_id, "closure row lacks enterprise evidence refs")
        disposition = evidence.get("closure_disposition")
        if evidence.get("closure_blocking") is True:
            unresolved.append(service_id)
            issues = evidence.get("tracking_issues", [])
            if not isinstance(issues, list) or not any(str(issue).startswith("USF-") for issue in issues):
                F.add("USF-ENTERPRISE-007", service_id, "blocking closure row lacks follow-up issue link")
        if disposition in {"deferred", "requires-human-decision", "substituted-partial"} and evidence.get("closure_blocking") is not True:
            F.add("USF-ENTERPRISE-007", service_id, "unresolved disposition must remain closure-blocking")
    if unresolved and matrix.get("closure_claimed") is True:
        F.add("USF-ENTERPRISE-007", str(CLOSURE_MATRIX_PATH), f"closure claimed with unresolved rows: {unresolved[:8]}")


def run_checks(state: dict[str, Any]) -> Findings:
    F = Findings()
    check_shape(F, state)
    if F.blocking_or_error():
        return F
    check_policy_and_non_claims(F, state)
    check_soa_coverage(F, state)
    check_evidence_register(F, state)
    check_threat_posture(F, state)
    check_sdk_governance(F, state)
    check_observability_standard(F, state)
    check_posture_registers(F, state)
    check_closure_matrix_linkage(F, state)
    return F


def run_selftest() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if not (ROOT / PLANTED_DEFECT_DIR).exists():
        return findings
    for path in sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json")):
        defect = json.loads(path.read_text(encoding="utf-8"))
        expected = defect.get("expectedRule")
        state = load_state(defect)
        F = run_checks(state)
        if expected not in F.rule_ids():
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-ENTERPRISE-SELFTEST",
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

    findings: list[dict[str, str]]
    if args.mode == "selftest":
        findings = run_selftest()
    else:
        F = run_checks(load_state())
        findings = F.items + run_selftest()

    if args.json:
        print(json.dumps({"mode": args.mode, "ok": not findings, "findings": findings, "rules": RULES}, indent=2))
    else:
        for finding in findings:
            print(f"{finding['severity']} {finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
