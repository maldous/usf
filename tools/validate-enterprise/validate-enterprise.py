#!/usr/bin/env python3
"""USF enterprise evidence model validator.

This validator enforces the repository-level enterprise evidence model used by
implementation lanes. It validates shape, SoA-support coverage, proof evidence
register pins, threat/abuse posture, SDK governance, observability evidence
standards, access/resilience/incident/privacy posture, done-state governance,
Lane 1 closure-matrix linkage, Lane 4 observability operations evidence, and
Lane 3 assurance control-plane disposition. It does not execute proof commands
and does not claim ISO/SOC/staging/production/live-provider/full-dev/full-parity
readiness.
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
OPERATOR_ACCESS_MATRIX_PATH = Path("docs/architecture/operator-access-gateway-posture-matrix.json")
ENVIRONMENT_PROMOTION_PATH = Path("spec/instances/environment-promotion/environment-promotion-enterprise-standard.json")
OPERATOR_ACCESS_PROOF_PATH = Path("packages/proof/src/operator-access-proof.ts")
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
    "USF-ENTERPRISE-010": ("blocking", "Lane 4 observability operations evidence is incomplete"),
    "USF-ENTERPRISE-011": ("blocking", "Lane 6 enterprise safety-control evidence is incomplete"),
    "USF-ENTERPRISE-012": ("blocking", "Lane 3 assurance control-plane disposition is incomplete"),
    "USF-ENTERPRISE-013": ("blocking", "Lane 3 assurance control-plane readiness or certification is overclaimed"),
    "USF-ENTERPRISE-014": ("blocking", "operator access or gateway posture matrix is incomplete or unsafe"),
    "USF-ENTERPRISE-015": ("blocking", "environment promotion standard is missing required stage or gate metadata"),
    "USF-ENTERPRISE-016": ("blocking", "environment promotion enterprise evidence or ownership is incomplete"),
    "USF-ENTERPRISE-017": ("blocking", "environment promotion provider, environment, or destructive semantics are unsafe"),
    "USF-ENTERPRISE-018": ("blocking", "environment promotion readiness or certification claim is overclaimed"),
    "USF-ENTERPRISE-019": ("blocking", "operator access proof command is missing or unsafe"),
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
    "signalKind",
    "incidentBoundary",
    "redactionStatus",
    "tenantLabelPosture",
    "dashboardBoundary",
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
    "rawSecret",
    "rawToken",
    "rawLogMessage",
    "unsafeLogMessage",
    "tenantName",
    "userEmail",
    "rawObjectKey",
}
LANE4_REQUIRED_ROWS = {
    "soaSupportMappings": {"usf-188-soa-observability-operations-control"},
    "evidenceRegister": {"usf-188-evidence-observability-operations-posture"},
    "threatModelAbuseCaseRegister": {"usf-188-threat-observability-operations"},
    "accessReviewPrivilegedOperationPosture": {"usf-188-access-observability-operator-surfaces"},
    "backupRestoreResiliencePosture": {"usf-188-resilience-observability-evidence-retention"},
    "incidentVulnerabilityManagementEvidence": {"usf-188-incident-observability-operations-boundary"},
    "privacyDataMinimisationPosture": {"usf-188-privacy-observability-tenant-safe-redaction"},
}
LANE4_REQUIRED_POSTURE_TOKENS = {
    "effectivenessState=",
    "riskStatement=",
    "threatFailureScenario=",
    "affectedAssetService=",
    "impact=",
    "likelihood=",
    "owner=",
    "treatment=",
    "reviewDate=2026-09-30",
    "followUpIssue=USF-159",
}
LANE4_OBSERVABILITY_TOKENS = {
    "loggingPosture=defined-only",
    "tracingPosture=defined-only",
    "metricsPosture=defined-only",
    "correlationIdPosture=defined-only",
    "tenantSafeRedactionPosture=defined-only",
    "rawSecretLeakage=blocked",
    "unsafeLogBoundary=message-template-only",
    "alertingWorkflow=deferred-with-owner",
    "dashboardWorkflow=deferred-with-owner",
    "incidentBoundary=explicit-local-evidence-only",
}
ASSURANCE_EFFECTIVENESS_STATES = {
    "defined-only",
    "implemented",
    "proven-local",
    "operating-evidence-present",
    "deferred-with-owner",
    "out-of-scope-with-rationale",
}
ASSURANCE_REQUIRED_RISK_FIELDS = {
    "riskStatement",
    "threatFailureScenario",
    "affectedAssetService",
    "impact",
    "likelihood",
    "owner",
    "treatment",
    "reviewDate",
    "followUpIssue",
}
ASSURANCE_EXCEPTION_FIELDS = {
    "exceptionOwner",
    "exceptionReason",
    "compensatingControl",
    "exceptionExpiry",
    "exceptionValidationCommand",
    "exceptionFollowUpIssue",
}
ASSURANCE_OVERCLAIM_MARKERS = {
    "certificationClaim=",
    "certificationClaimed=",
    "iso27001CertificationClaim=true",
    "socReadinessClaim=true",
    "fullDevReadinessClaim=true",
    "testReadinessClaim=true",
    "stagingReadinessClaim=true",
    "productionReadinessClaim=true",
    "deploymentReadinessClaim=true",
    "liveProviderReadinessClaim=true",
    "enterpriseProductionReadinessClaim=true",
    "fullReactParityClaim=true",
}
ASSURANCE_CONTROL_PLANES = {
    "sentry-error-monitoring": {
        "expectedState": "deferred-with-owner",
        "issue": "USF-170",
        "closureServiceId": "sentry",
        "rows": {
            "soaSupportMappings": "usf-187-sentry-error-monitoring-soa",
            "evidenceRegister": "usf-187-sentry-error-monitoring-evidence",
            "threatModelAbuseCaseRegister": "usf-187-sentry-error-monitoring-threat",
            "accessReviewPrivilegedOperationPosture": "usf-187-sentry-error-monitoring-access",
            "backupRestoreResiliencePosture": "usf-187-sentry-error-monitoring-risk-treatment",
            "incidentVulnerabilityManagementEvidence": "usf-187-sentry-error-monitoring-incident-vulnerability",
            "privacyDataMinimisationPosture": "usf-187-sentry-error-monitoring-privacy",
        },
    },
    "sonarqube-static-analysis": {
        "expectedState": "deferred-with-owner",
        "issue": "USF-171",
        "closureServiceId": "sonarqube",
        "rows": {
            "soaSupportMappings": "usf-187-sonarqube-static-analysis-soa",
            "evidenceRegister": "usf-187-sonarqube-static-analysis-evidence",
            "threatModelAbuseCaseRegister": "usf-187-sonarqube-static-analysis-threat",
            "accessReviewPrivilegedOperationPosture": "usf-187-sonarqube-static-analysis-access",
            "backupRestoreResiliencePosture": "usf-187-sonarqube-static-analysis-risk-treatment",
            "incidentVulnerabilityManagementEvidence": "usf-187-sonarqube-static-analysis-incident-vulnerability",
            "privacyDataMinimisationPosture": "usf-187-sonarqube-static-analysis-privacy",
        },
    },
    "security-scanning": {
        "expectedState": "defined-only",
        "issue": "USF-171",
        "closureServiceId": None,
        "rows": {
            "soaSupportMappings": "usf-187-security-scanning-soa",
            "evidenceRegister": "usf-187-security-scanning-evidence",
            "threatModelAbuseCaseRegister": "usf-187-security-scanning-threat",
            "accessReviewPrivilegedOperationPosture": "usf-187-security-scanning-access",
            "backupRestoreResiliencePosture": "usf-187-security-scanning-risk-treatment",
            "incidentVulnerabilityManagementEvidence": "usf-187-security-scanning-incident-vulnerability",
            "privacyDataMinimisationPosture": "usf-187-security-scanning-privacy",
        },
    },
}
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
PINNED_VERSION_RE = re.compile(r"^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][0-9A-Za-z.-]+)?$")
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
EFFECTIVENESS_STATES = {
    "defined-only",
    "implemented",
    "proven-local",
    "operating-evidence-present",
    "deferred-with-owner",
    "out-of-scope-with-rationale",
}
PLACEHOLDER_RE = re.compile(r"\b(?:TODO|TBD|unknown|missing|unassigned)\b", re.IGNORECASE)
LANE6_CONTROL_ROWS = {
    "usf-190-db-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-db-enterprise-safety-controls",
        "followUp": "USF-139",
    },
    "usf-190-authorization-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-authorization-enterprise-safety-controls",
        "followUp": "USF-141",
    },
    "usf-190-audit-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-audit-enterprise-safety-controls",
        "followUp": "USF-143",
    },
    "usf-190-config-secrets-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-config-secrets-enterprise-safety-controls",
        "followUp": "USF-145",
    },
    "usf-190-files-storage-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-files-storage-enterprise-safety-controls",
        "followUp": "USF-147",
    },
    "usf-190-backup-retention-legal-hold-boundary": {
        "expectedState": "deferred-with-owner",
        "evidence": "evidence-usf-190-backup-retention-legal-hold-boundary",
        "followUp": "USF-139,USF-147",
    },
    "usf-190-status-integrity-boundary": {
        "expectedState": "defined-only",
        "evidence": "evidence-usf-190-status-integrity-validator",
        "followUp": "USF-192",
    },
}
LANE6_EVIDENCE_ROWS = {row["evidence"] for row in LANE6_CONTROL_ROWS.values()}
LANE6_THREAT_ROWS = {
    "usf-190-threat-db-tenant-data-control",
    "usf-190-threat-authorization-pdp-control",
    "usf-190-threat-audit-evidence-control",
    "usf-190-threat-config-secrets-control",
    "usf-190-threat-files-storage-control",
    "usf-190-threat-backup-retention-legal-hold-control",
}
LANE6_POSTURE_ROWS = {
    "accessReviewPrivilegedOperationPosture": {
        "usf-190-access-authorization-privileged-boundary",
    },
    "backupRestoreResiliencePosture": {
        "usf-190-resilience-backup-retention-legal-hold-boundary",
    },
    "incidentVulnerabilityManagementEvidence": {
        "usf-190-incident-safety-control-posture",
    },
    "privacyDataMinimisationPosture": {
        "usf-190-privacy-data-classification-posture",
    },
}
LANE6_DEFERRAL_TOKENS = (
    "riskStatement=",
    "threatFailureScenario=",
    "affectedAssetService=",
    "impact=",
    "likelihood=",
    "owner=",
    "treatment=",
    "reviewDate=",
    "followUpIssue=",
)
LANE6_EXCEPTION_TOKENS = (
    "exceptionOwner=",
    "exceptionReason=",
    "compensatingControl=",
    "exceptionExpiry=",
)
OPERATOR_AUTH_REQUIREMENTS = {"operator-auth-required", "admin-auth-required"}
PROMOTION_STAGES = {"dev", "test", "staging", "production"}
PROMOTION_TOP_NON_CLAIMS = REQUIRED_NON_CLAIMS | {"usf-133-closure"}
PROMOTION_REQUIRED_MODEL_ROWS = {
    "soaSupportMappings": {"usf-193-soa-environment-promotion-standard"},
    "evidenceRegister": {"usf-193-evidence-environment-promotion-standard"},
    "threatModelAbuseCaseRegister": {"usf-193-threat-environment-promotion-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"usf-193-access-environment-promotion-approvals"},
    "backupRestoreResiliencePosture": {"usf-193-resilience-environment-promotion-gates"},
    "incidentVulnerabilityManagementEvidence": {"usf-193-incident-environment-promotion-boundary"},
    "privacyDataMinimisationPosture": {"usf-193-privacy-environment-promotion-data-posture"},
}
PROMOTION_REQUIRED_ENTERPRISE_TOKENS = {
    "risk register",
    "Statement of Applicability",
    "tenant isolation",
    "admin/operator access",
    "data classification",
    "secrets",
    "structured logs",
    "alerting",
    "SAST",
    "backup/restore",
    "change approval",
    "customer-facing enterprise feature posture",
}
PROMOTION_REQUIRED_EVIDENCE_PACKAGE_TOKENS = {
    "environment",
    "commit SHA",
    "PR",
    "issue",
    "evidence id",
    "validation commands",
    "risk decision",
    "exception list",
    "approver",
    "review expiry",
    "non-claims",
}
PROMOTION_CLAIM_RULE_TOKENS = {
    "dev evidence must not satisfy test readiness",
    "test evidence must not satisfy staging readiness",
    "staging evidence must not satisfy production readiness",
    "production readiness requires explicit production-live evidence",
    "hermetic-mock provider mode must not satisfy",
    "destructive test semantics must not satisfy staging or production",
    "readiness claims must not exceed proof level",
    "ISO/SOC/certification",
}


def missing_required_non_claims(row: dict[str, Any]) -> set[str]:
    if "nonClaims" in row:
        return REQUIRED_NON_CLAIMS - set(row.get("nonClaims", []))
    row_text = json.dumps(row, sort_keys=True).lower()
    missing: set[str] = set()
    for claim in REQUIRED_NON_CLAIMS:
        spaced = claim.replace("-", " ")
        if claim not in row_text and spaced not in row_text:
            missing.add(claim)
    return missing


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


def row_texts(row: dict[str, Any]) -> list[str]:
    texts: list[str] = []
    for value in row.values():
        if isinstance(value, str):
            texts.append(value)
        elif isinstance(value, list):
            texts.extend(str(item) for item in value if isinstance(item, str))
    return texts


def text_has_field(texts: list[str], field: str) -> bool:
    needle = f"{field}="
    return any(text.startswith(needle) or f"; {needle}" in text for text in texts)


def text_has_exact_field(texts: list[str], field: str, value: str) -> bool:
    needle = f"{field}={value}"
    return any(text.startswith(needle) or f"; {needle}" in text for text in texts)


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


def service_needs_operator_access_decision(service: dict[str, Any]) -> bool:
    service_kind = service.get("serviceKind")
    access_model = service.get("accessModel")
    return (
        service_kind
        in {"gateway", "observability-control-plane", "assurance-control-plane", "operator-automation", "workflow-operator-ui"}
        or service.get("adminSurface", {}).get("present") is True
        or service.get("operatorSurface", {}).get("present") is True
        or access_model in {"operator-access", "admin-only", "external-provider-console"}
    )


def local_publication(service: dict[str, Any]) -> str:
    ports = service.get("ports") or []
    if not ports:
        return "not-host-published"
    if all(
        port.get("hostIp") == "127.0.0.1"
        and port.get("bindScope") == "loopback-only"
        and port.get("internetExposureAllowed") is False
        for port in ports
        if isinstance(port, dict)
    ):
        return "loopback-only"
    return "non-loopback-present"


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
    operator_access_matrix = (
        read_json(OPERATOR_ACCESS_MATRIX_PATH) if (ROOT / OPERATOR_ACCESS_MATRIX_PATH).exists() else None
    )
    environment_promotion = (
        read_json(ENVIRONMENT_PROMOTION_PATH) if (ROOT / ENVIRONMENT_PROMOTION_PATH).exists() else None
    )
    operator_access_proof_text = (
        (ROOT / OPERATOR_ACCESS_PROOF_PATH).read_text(encoding="utf-8")
        if (ROOT / OPERATOR_ACCESS_PROOF_PATH).exists()
        else None
    )

    model = apply_model_defect(model, defect)
    if closure_matrix is not None:
        closure_matrix = apply_closure_defect(closure_matrix, defect)
    if operator_access_matrix is not None:
        operator_access_matrix = apply_operator_access_defect(operator_access_matrix, defect)
    if environment_promotion is not None:
        environment_promotion = apply_environment_promotion_defect(environment_promotion, defect)
    package = apply_package_defect(package, defect)
    if operator_access_proof_text is not None:
        operator_access_proof_text = apply_operator_access_proof_defect(operator_access_proof_text, defect)
    return {
        "model": model,
        "schema": schema,
        "serviceCatalogue": service_catalogue,
        "runtimeManifest": runtime_manifest,
        "package": package,
        "closureMatrix": closure_matrix,
        "operatorAccessMatrix": operator_access_matrix,
        "environmentPromotion": environment_promotion,
        "operatorAccessProofText": operator_access_proof_text,
    }


def apply_package_defect(package: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(package)
    scripts = out.setdefault("scripts", {})
    for key in defect.get("packageScriptDrop", []):
        scripts.pop(key, None)
    for key, value in defect.get("packageScriptSet", {}).items():
        scripts[key] = value
    return out


def apply_operator_access_proof_defect(text: str, defect: dict[str, Any]) -> str:
    out = text
    for replacement in defect.get("operatorAccessProofTextReplace", []):
        if isinstance(replacement, dict):
            out = out.replace(str(replacement.get("from", "")), str(replacement.get("to", "")))
    if defect.get("operatorAccessProofTextAppend"):
        out += str(defect["operatorAccessProofTextAppend"])
    return out


def apply_model_defect(model: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(model)
    if defect.get("removeSoaMapping"):
        out["soaSupportMappings"] = [
            row for row in out.get("soaSupportMappings", []) if row.get("id") != defect["removeSoaMapping"]
        ]
    for patch in defect.get("soaPatch", []):
        for row in out.get("soaSupportMappings", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    if defect.get("removeThreatModel"):
        out["threatModelAbuseCaseRegister"] = [
            row
            for row in out.get("threatModelAbuseCaseRegister", [])
            if row.get("id") != defect["removeThreatModel"]
        ]
    if defect.get("removeEnterpriseEvidence"):
        out["evidenceRegister"] = [
            row
            for row in out.get("evidenceRegister", [])
            if row.get("id") != defect["removeEnterpriseEvidence"]
        ]
    if defect.get("observabilityDropRequiredField"):
        field = defect["observabilityDropRequiredField"]
        out.get("observabilityEvidenceStandard", {}).setdefault("requiredFields", [])
        out["observabilityEvidenceStandard"]["requiredFields"] = [
            item for item in out["observabilityEvidenceStandard"]["requiredFields"] if item != field
        ]
    if defect.get("observabilityDropProhibitedField"):
        field = defect["observabilityDropProhibitedField"]
        out.get("observabilityEvidenceStandard", {}).setdefault("prohibitedFields", [])
        out["observabilityEvidenceStandard"]["prohibitedFields"] = [
            item for item in out["observabilityEvidenceStandard"]["prohibitedFields"] if item != field
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
    for patch in defect.get("posturePatch", []):
        section = patch.get("section")
        if not isinstance(section, str) or not isinstance(out.get(section), list):
            continue
        for row in out.get(section, []):
            if row.get("id") != patch.get("id"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            if patch.get("dropNonClaims"):
                dropped = set(patch.get("dropNonClaims", []))
                row["nonClaims"] = [item for item in row.get("nonClaims", []) if item not in dropped]
            if patch.get("removePosturePrefix"):
                prefixes = tuple(str(item) for item in patch.get("removePosturePrefix", []))
                row["posture"] = [
                    item for item in row.get("posture", []) if not str(item).startswith(prefixes)
                ]
            if patch.get("appendPosture"):
                row.setdefault("posture", [])
                row["posture"].extend(str(item) for item in patch.get("appendPosture", []))
    for key, value in defect.get("doneStateSet", {}).items():
        out.setdefault("doneStateGovernance", {})[key] = value
    for patch in defect.get("laneRequirementPatch", []):
        for row in out.get("laneEvidenceRequirements", []):
            if row.get("laneIssue") == patch.get("laneIssue"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
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


def apply_operator_access_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("operatorAccessTopSet", {}).items():
        out[key] = value
    remove_row_id = defect.get("removeOperatorAccessRow")
    if remove_row_id:
        out["rows"] = [row for row in out.get("rows", []) if row.get("id") != remove_row_id]
    for patch in defect.get("operatorAccessPatch", []):
        for row in out.get("rows", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    return out


def apply_environment_promotion_defect(promotion: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(promotion)
    if defect.get("removePromotionEnvironment"):
        stage = defect["removePromotionEnvironment"]
        out["environmentStandards"] = [
            row for row in out.get("environmentStandards", []) if row.get("environmentStage") != stage
        ]
    if defect.get("removePromotionGate"):
        gate_id = defect["removePromotionGate"]
        out["promotionGates"] = [row for row in out.get("promotionGates", []) if row.get("id") != gate_id]
    for key, value in defect.get("promotionTopSet", {}).items():
        out[key] = value
    if defect.get("promotionDropNonClaims"):
        dropped = set(defect.get("promotionDropNonClaims", []))
        out["nonClaims"] = [item for item in out.get("nonClaims", []) if item not in dropped]
    for patch in defect.get("promotionEnvironmentPatch", []):
        for row in out.get("environmentStandards", []):
            if row.get("environmentStage") != patch.get("environmentStage"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    for patch in defect.get("promotionGatePatch", []):
        for row in out.get("promotionGates", []):
            if row.get("id") != patch.get("id"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
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
        if binding.get("sdkPackage") in {None, ""}:
            continue
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


def effectiveness_state(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    prefix = "effectivenessState="
    for part in value.split(";"):
        item = part.strip()
        if item.startswith(prefix):
            return item.removeprefix(prefix)
    return None


def has_placeholder(value: Any) -> bool:
    return not isinstance(value, str) or not value.strip() or PLACEHOLDER_RE.search(value) is not None


def check_lane6_safety_controls(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    soa = rows_by_id(model.get("soaSupportMappings"))
    evidence = rows_by_id(model.get("evidenceRegister"))
    threats = rows_by_id(model.get("threatModelAbuseCaseRegister"))

    for row_id, expected in LANE6_CONTROL_ROWS.items():
        row = soa.get(row_id)
        if not row:
            F.add("USF-ENTERPRISE-011", row_id, "missing Lane 6 safety-control SoA row")
            continue
        state_value = effectiveness_state(row.get("implementationStatus"))
        if state_value not in EFFECTIVENESS_STATES:
            F.add("USF-ENTERPRISE-011", row_id, "effectivenessState is missing or not controlled")
        elif state_value != expected["expectedState"]:
            F.add("USF-ENTERPRISE-011", row_id, f"expected effectivenessState={expected['expectedState']}")
        for field in ("owner", "riskOwner", "controlOwner"):
            if has_placeholder(row.get(field)):
                F.add("USF-ENTERPRISE-011", row_id, f"{field} is missing or placeholder")
        if expected["evidence"] not in str(row.get("evidenceSource", "")):
            F.add("USF-ENTERPRISE-011", row_id, "control-to-evidence graph does not reference its evidence row")
        if expected["followUp"] not in str(row.get("deferredReason", "")):
            F.add("USF-ENTERPRISE-011", row_id, "deferred boundary lacks linked follow-up issue")
        missing_deferral = [token for token in LANE6_DEFERRAL_TOKENS if token not in str(row.get("deferredReason", ""))]
        if missing_deferral:
            F.add("USF-ENTERPRISE-011", row_id, f"deferred boundary lacks {missing_deferral}")
        missing_exception = [token for token in LANE6_EXCEPTION_TOKENS if token not in str(row.get("deferredReason", ""))]
        if missing_exception:
            F.add("USF-ENTERPRISE-011", row_id, f"exception boundary lacks {missing_exception}")
        if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-011", row_id, "Lane 6 control row non-claims are incomplete")

    for evidence_id in LANE6_EVIDENCE_ROWS:
        row = evidence.get(evidence_id)
        if not row:
            F.add("USF-ENTERPRISE-011", evidence_id, "missing Lane 6 evidence register row")
            continue
        if "USF-190" not in row.get("issueLinks", []):
            F.add("USF-ENTERPRISE-011", evidence_id, "Lane 6 evidence row must link USF-190")
        if not row.get("whatWasNotProven") or "No " not in str(row.get("whatWasNotProven")):
            F.add("USF-ENTERPRISE-011", evidence_id, "Lane 6 evidence row must preserve explicit non-claims")

    for threat_id in LANE6_THREAT_ROWS:
        if threat_id not in threats:
            F.add("USF-ENTERPRISE-011", threat_id, "missing Lane 6 threat or abuse-case row")

    for section, required_ids in LANE6_POSTURE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in required_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-011", row_id, f"missing Lane 6 posture row in {section}")
                continue
            posture_text = ";".join(str(item) for item in row.get("posture", []))
            for token in ("effectivenessState=", "dataClassification=", "changeManagementEvidence=", "rollbackDeferredBoundary="):
                if token not in posture_text:
                    F.add("USF-ENTERPRISE-011", row_id, f"posture row lacks {token}")
            if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
                F.add("USF-ENTERPRISE-011", row_id, "Lane 6 posture row non-claims are incomplete")

    lane_rows = {row.get("laneIssue"): row for row in model.get("laneEvidenceRequirements", [])}
    lane = lane_rows.get("USF-190", {})
    if str(lane.get("approvalStatus", "")).lower() in {"done", "complete", "completed", "closed"}:
        F.add("USF-ENTERPRISE-011", "USF-190", "Lane 6 must remain open until coordinator confirms acceptance criteria")


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


def check_operator_access_gateway_matrix(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("operatorAccessMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-ENTERPRISE-014", str(OPERATOR_ACCESS_MATRIX_PATH), "operator access gateway posture matrix is missing")
        return

    services = {
        service.get("serviceId"): service
        for service in state["serviceCatalogue"].get("services", [])
        if isinstance(service, dict) and isinstance(service.get("serviceId"), str)
    }
    expected_services = {
        service_id for service_id, service in services.items() if service_needs_operator_access_decision(service)
    }
    declared_services = set(matrix.get("requiredServiceIds", []))
    if declared_services != expected_services:
        missing = sorted(expected_services - declared_services)
        extra = sorted(declared_services - expected_services)
        F.add("USF-ENTERPRISE-014", "requiredServiceIds", f"missing={missing} extra={extra}")

    if matrix.get("serviceCatalogueAuthority") != str(SERVICE_CATALOGUE_PATH):
        F.add("USF-ENTERPRISE-014", "serviceCatalogueAuthority", "matrix must pin service catalogue authority")
    if matrix.get("enterpriseEvidenceModel") != str(MODEL_PATH):
        F.add("USF-ENTERPRISE-014", "enterpriseEvidenceModel", "matrix must pin enterprise evidence model")
    if matrix.get("validationCommand") != "python3 tools/validate-enterprise/validate-enterprise.py all --json":
        F.add("USF-ENTERPRISE-014", "validationCommand", "matrix validation command must be command-pinned")
    if REQUIRED_NON_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-014", "nonClaims", "matrix non-claims are incomplete")
    if set(matrix.get("effectivenessStatesAllowed", [])) != EFFECTIVENESS_STATES:
        F.add("USF-ENTERPRISE-014", "effectivenessStatesAllowed", "effectiveness state set is incomplete")
    if REQUIRED_NON_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-014", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if REQUIRED_NON_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-ENTERPRISE-014", "readinessClaimsProhibited", "matrix prohibited readiness claims are incomplete")
    for field in (
        "adminSurfaceExposurePolicy",
        "authnAuthzPosture",
        "tenantBoundary",
        "secretBoundary",
        "clickthroughBoundary",
        "proofPosture",
    ):
        if not matrix.get(field):
            F.add("USF-ENTERPRISE-014", field, "matrix boundary field is required")

    gateway = matrix.get("gatewayBoundary", {})
    if not isinstance(gateway, dict):
        F.add("USF-ENTERPRISE-014", "gatewayBoundary", "gateway boundary must be an object")
    else:
        expected_gateway = {
            "gatewayServiceId": "caddy",
            "defaultExposure": "loopback-only",
            "directPublicExposureClaim": False,
            "directLanExposureClaim": False,
            "clickthroughUiImplementationPresent": False,
            "uiImplementationCreated": False,
        }
        for key, expected in expected_gateway.items():
            observed = gateway.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-014", f"gatewayBoundary.{key}", f"expected {expected!r}")
        if not gateway.get("authnAuthzPosture") or not gateway.get("auditPosture"):
            F.add("USF-ENTERPRISE-014", "gatewayBoundary", "gateway authn/authz and audit posture are required")

    change = matrix.get("changeManagementEvidence", {})
    if not isinstance(change, dict) or any(
        not change.get(field) for field in ("changeRecord", "validation", "rollbackBoundary", "deferredBoundary")
    ):
        F.add("USF-ENTERPRISE-014", "changeManagementEvidence", "change, validation, rollback, and deferred boundaries are required")
    if not matrix.get("controlEvidenceRefs"):
        F.add("USF-ENTERPRISE-014", "controlEvidenceRefs", "control/evidence references are required")
    for exception in matrix.get("exceptions", []):
        if not isinstance(exception, dict):
            F.add("USF-ENTERPRISE-014", "exceptions", "exception entries must be objects")
            continue
        for field in ("owner", "reason", "compensatingControl", "expiry", "validationCommand", "followUpIssue"):
            if not exception.get(field):
                F.add("USF-ENTERPRISE-014", exception.get("id", "exception"), f"missing exception {field}")

    rows = matrix.get("rows", [])
    if not isinstance(rows, list):
        F.add("USF-ENTERPRISE-014", "rows", "matrix rows must be a list")
        return
    row_services = {row.get("serviceId"): row for row in rows if isinstance(row, dict)}
    if set(row_services) != expected_services:
        F.add(
            "USF-ENTERPRISE-014",
            "rows",
            f"missing={sorted(expected_services - set(row_services))} extra={sorted(set(row_services) - expected_services)}",
        )

    row_ids: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            F.add("USF-ENTERPRISE-014", "rows", "row must be an object")
            continue
        row_id = str(row.get("id", ""))
        service_id = row.get("serviceId")
        service = services.get(service_id)
        if row_id in row_ids:
            F.add("USF-ENTERPRISE-014", row_id, "duplicate matrix row id")
        row_ids.add(row_id)
        if not row_id.startswith("usf-186-"):
            F.add("USF-ENTERPRISE-014", row_id or service_id or "row", "row id must use usf-186 prefix")
        if service is None:
            F.add("USF-ENTERPRISE-014", service_id or row_id, "row references unknown service")
            continue

        for field in (
            "surfaceKind",
            "effectivenessState",
            "accessModel",
            "authRequirement",
            "auditRequirement",
            "accessReviewOwner",
            "riskOwner",
            "controlOwner",
            "breakGlassRelevance",
            "defaultBindScope",
            "localHostPublication",
            "deferredRisk",
        ):
            if row.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-014", row_id, f"missing {field}")
        if row.get("effectivenessState") not in EFFECTIVENESS_STATES:
            F.add("USF-ENTERPRISE-014", row_id, "unknown effectiveness state")
        if row.get("publicExposureAllowed") is not False:
            F.add("USF-ENTERPRISE-014", row_id, "public exposure must remain denied")
        if row.get("lanExposureAllowed") is not False:
            F.add("USF-ENTERPRISE-014", row_id, "LAN exposure must remain denied")
        if row.get("accessModel") != service.get("accessModel"):
            F.add("USF-ENTERPRISE-014", row_id, "access model does not match service catalogue")
        if row.get("authRequirement") != service.get("authRequirement"):
            F.add("USF-ENTERPRISE-014", row_id, "auth requirement does not match service catalogue")
        if row.get("auditRequirement") != service.get("auditRequirement"):
            F.add("USF-ENTERPRISE-014", row_id, "audit requirement does not match service catalogue")
        if row.get("breakGlassRelevance") != service.get("breakGlassRelevance"):
            F.add("USF-ENTERPRISE-014", row_id, "break-glass relevance does not match service catalogue")
        if row.get("accessReviewOwner") != service.get("serviceOwner"):
            F.add("USF-ENTERPRISE-014", row_id, "access review owner does not match service owner")
        if row.get("riskOwner") != service.get("riskOwner") or row.get("controlOwner") != service.get("controlOwner"):
            F.add("USF-ENTERPRISE-014", row_id, "risk or control owner does not match service catalogue")

        publication = local_publication(service)
        expected_bind = (
            "external-provider-managed"
            if publication == "not-host-published" and service.get("accessModel") == "external-provider-console"
            else publication
        )
        if publication == "non-loopback-present":
            F.add("USF-ENTERPRISE-014", service_id, "service catalogue contains non-loopback or exposed port")
        if row.get("defaultBindScope") != expected_bind:
            F.add("USF-ENTERPRISE-014", row_id, "default bind scope does not match catalogue exposure")
        if row.get("localHostPublication") != publication:
            F.add("USF-ENTERPRISE-014", row_id, "local host publication does not match service ports")
        for port in service.get("ports", []) or []:
            if (
                port.get("hostIp") != "127.0.0.1"
                or port.get("bindScope") != "loopback-only"
                or port.get("internetExposureAllowed") is not False
            ):
                F.add("USF-ENTERPRISE-014", f"{service_id}:{port.get('portId')}", "operator/gateway port is not loopback-only")

        human_surface = (
            service.get("adminSurface", {}).get("present") is True
            or service.get("operatorSurface", {}).get("present") is True
            or service.get("accessModel") in {"operator-access", "admin-only", "external-provider-console"}
            or service.get("serviceKind") == "gateway"
        )
        if human_surface and row.get("authRequirement") not in OPERATOR_AUTH_REQUIREMENTS:
            F.add("USF-ENTERPRISE-014", row_id, "operator/admin/gateway surface lacks required auth posture")
        if human_surface and row.get("auditRequirement") != "operator-action-audit-required":
            F.add("USF-ENTERPRISE-014", row_id, "operator/admin/gateway surface lacks operator audit posture")
        if row.get("surfaceKind") == "control-plane-no-human-access" and row.get("accessModel") != "no-human-access":
            F.add("USF-ENTERPRISE-014", row_id, "no-human control-plane row must not permit human access")
        if service_id == "caddy":
            if row.get("surfaceKind") != "gateway":
                F.add("USF-ENTERPRISE-014", row_id, "caddy row must be the gateway row")
            source_refs = set(row.get("sourceRefs", []))
            if "../react/docker/caddy/Caddyfile" not in source_refs:
                F.add("USF-ENTERPRISE-014", row_id, "gateway row lacks React gateway lineage reference")

        risk = row.get("deferredRisk", {})
        if not isinstance(risk, dict):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk must be an object")
            continue
        for field in (
            "riskStatement",
            "threatFailureScenario",
            "affectedAssetService",
            "impact",
            "likelihood",
            "owner",
            "treatment",
            "reviewDate",
            "linkedFollowUpIssue",
        ):
            if not risk.get(field):
                F.add("USF-ENTERPRISE-014", row_id, f"missing deferred risk {field}")
        if risk.get("affectedAssetService") != service_id:
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk affected service does not match row")
        if risk.get("owner") != row.get("accessReviewOwner"):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk owner must match access review owner")
        if not DATE_RE.fullmatch(str(risk.get("reviewDate", ""))):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk review date must be YYYY-MM-DD")
        if not str(risk.get("linkedFollowUpIssue", "")).startswith("USF-"):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk follow-up issue must be linked")


def check_lane4_observability(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    model_text = json.dumps(model, sort_keys=True)
    for section, required_ids in LANE4_REQUIRED_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in required_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-010", row_id, f"missing Lane 4 row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            for token in LANE4_REQUIRED_POSTURE_TOKENS:
                if token not in row_text:
                    F.add("USF-ENTERPRISE-010", row_id, f"missing required deferred-control token {token}")
            if "nonClaims" in row:
                if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
                    F.add("USF-ENTERPRISE-010", row_id, "Lane 4 row non-claims are incomplete")
            else:
                row_text_lower = row_text.lower()
                missing_non_claims = [claim for claim in REQUIRED_NON_CLAIMS if claim not in row_text_lower]
                if missing_non_claims:
                    F.add("USF-ENTERPRISE-010", row_id, f"Lane 4 row text lacks non-claim tokens: {missing_non_claims}")
    for token in LANE4_OBSERVABILITY_TOKENS:
        if token not in model_text:
            F.add("USF-ENTERPRISE-010", "usf-188-observability-posture", f"missing {token}")
    standard = model.get("observabilityEvidenceStandard", {})
    required = set(standard.get("requiredFields", []))
    prohibited = set(standard.get("prohibitedFields", []))
    for field in ("signalKind", "incidentBoundary", "redactionStatus", "tenantLabelPosture", "dashboardBoundary"):
        if field not in required:
            F.add("USF-ENTERPRISE-010", f"observabilityEvidenceStandard.requiredFields.{field}", "missing Lane 4 required field")
    for field in ("rawSecret", "rawToken", "rawLogMessage", "unsafeLogMessage", "tenantName", "userEmail", "rawObjectKey"):
        if field not in prohibited:
            F.add("USF-ENTERPRISE-010", f"observabilityEvidenceStandard.prohibitedFields.{field}", "missing Lane 4 prohibited field")


def check_assurance_control_plane_disposition(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    matrix = state.get("closureMatrix")
    section_rows = {
        section: rows_by_id(model.get(section))
        for section in {
            "soaSupportMappings",
            "evidenceRegister",
            "threatModelAbuseCaseRegister",
            "accessReviewPrivilegedOperationPosture",
            "backupRestoreResiliencePosture",
            "incidentVulnerabilityManagementEvidence",
            "privacyDataMinimisationPosture",
        }
    }

    for control_id, config in ASSURANCE_CONTROL_PLANES.items():
        rows = config["rows"]
        expected_state = config["expectedState"]
        source_issue = config["issue"]

        for section, row_id in rows.items():
            row = section_rows.get(section, {}).get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-012", row_id, f"missing Lane 3 {control_id} row in {section}")
                continue
            texts = row_texts(row)
            if any(marker in text for marker in ASSURANCE_OVERCLAIM_MARKERS for text in texts):
                F.add("USF-ENTERPRISE-013", row_id, "assurance row contains an explicit readiness or certification claim marker")

            if section in {
                "soaSupportMappings",
                "accessReviewPrivilegedOperationPosture",
                "backupRestoreResiliencePosture",
                "incidentVulnerabilityManagementEvidence",
                "privacyDataMinimisationPosture",
            }:
                non_claims = set(row.get("nonClaims", []))
                missing_non_claims = REQUIRED_NON_CLAIMS - non_claims
                if missing_non_claims:
                    F.add("USF-ENTERPRISE-013", row_id, f"assurance row missing non-claims: {sorted(missing_non_claims)}")
                if not row.get("validationCommand"):
                    F.add("USF-ENTERPRISE-012", row_id, "assurance row lacks validation command")

            if section == "soaSupportMappings":
                if not row.get("owner") or not row.get("riskOwner") or not row.get("controlOwner"):
                    F.add("USF-ENTERPRISE-012", row_id, "SoA row lacks owner, risk owner, or control owner")
                if not row.get("assetServiceAffected"):
                    F.add("USF-ENTERPRISE-012", row_id, "SoA row lacks affected asset/service")
                texts = row_texts(row)
                for field in ASSURANCE_REQUIRED_RISK_FIELDS - {"affectedAssetService"}:
                    if not text_has_field(texts, field):
                        F.add("USF-ENTERPRISE-012", row_id, f"SoA row lacks {field}")
                if not text_has_field(texts, "effectivenessState"):
                    F.add("USF-ENTERPRISE-012", row_id, "SoA row lacks effectiveness state")
                elif not text_has_exact_field(texts, "effectivenessState", expected_state):
                    F.add("USF-ENTERPRISE-013", row_id, f"SoA row must remain effectivenessState={expected_state}")
            elif section == "evidenceRegister":
                issue_links = row.get("issueLinks", [])
                if "USF-187" not in issue_links or source_issue not in issue_links:
                    F.add("USF-ENTERPRISE-012", row_id, "evidence row lacks lane and source issue links")
                if not row.get("whatWasNotProven"):
                    F.add("USF-ENTERPRISE-013", row_id, "evidence row must state what was not proven")
                provider_mode = str(row.get("providerMode", "")).lower()
                if not any(marker in provider_mode for marker in ("not", "no-", "disposition")):
                    F.add("USF-ENTERPRISE-013", row_id, "evidence row provider mode must not imply live provider readiness")
            elif section == "threatModelAbuseCaseRegister":
                residual = [str(row.get("residualRisk", ""))]
                for field in ("riskStatement", "impact", "likelihood", "owner", "treatment", "reviewDate", "followUpIssue"):
                    if not text_has_field(residual, field):
                        F.add("USF-ENTERPRISE-012", row_id, f"threat residual risk lacks {field}")
            else:
                posture = [str(item) for item in row.get("posture", []) if isinstance(item, str)]
                for field in ASSURANCE_REQUIRED_RISK_FIELDS:
                    if not text_has_field(posture, field):
                        F.add("USF-ENTERPRISE-012", row_id, f"posture lacks {field}")
                if not text_has_field(posture, "effectivenessState"):
                    F.add("USF-ENTERPRISE-012", row_id, "posture lacks effectiveness state")
                elif not text_has_exact_field(posture, "effectivenessState", expected_state):
                    F.add("USF-ENTERPRISE-013", row_id, f"posture must remain effectivenessState={expected_state}")
                states = [
                    item.split("=", 1)[1]
                    for item in posture
                    if item.startswith("effectivenessState=") and "=" in item
                ]
                if any(state not in ASSURANCE_EFFECTIVENESS_STATES for state in states):
                    F.add("USF-ENTERPRISE-012", row_id, "posture has an unknown effectiveness state")
                if not text_has_field(posture, "exception"):
                    F.add("USF-ENTERPRISE-012", row_id, "posture lacks exception disposition")
                if text_has_exact_field(posture, "exception", "active"):
                    for field in ASSURANCE_EXCEPTION_FIELDS:
                        if not text_has_field(posture, field):
                            F.add("USF-ENTERPRISE-012", row_id, f"active exception lacks {field}")

        closure_service_id = config.get("closureServiceId")
        if matrix is not None and closure_service_id:
            closure_row = next(
                (
                    row
                    for row in matrix.get("rows", [])
                    if isinstance(row, dict) and row.get("service_id") == closure_service_id
                ),
                None,
            )
            if not closure_row:
                F.add("USF-ENTERPRISE-012", closure_service_id, "closure matrix lacks assurance service row")
            else:
                evidence = closure_row.get("closure_evidence", {})
                refs = set(evidence.get("enterprise_evidence_refs", []))
                expected_refs = {rows["soaSupportMappings"], rows["evidenceRegister"]}
                missing_refs = expected_refs - refs
                if missing_refs:
                    F.add("USF-ENTERPRISE-012", closure_service_id, f"closure matrix lacks Lane 3 refs: {sorted(missing_refs)}")
                tracking = set(evidence.get("tracking_issues", []))
                if "USF-187" not in tracking or source_issue not in tracking:
                    F.add("USF-ENTERPRISE-012", closure_service_id, "closure matrix lacks Lane 3/source tracking issues")
                if evidence.get("closure_blocking") is not True:
                    F.add("USF-ENTERPRISE-013", closure_service_id, "assurance control-plane closure must remain blocking")


def check_environment_promotion_standard(F: Findings, state: dict[str, Any]) -> None:
    promotion = state.get("environmentPromotion")
    if not isinstance(promotion, dict):
        F.add("USF-ENTERPRISE-015", str(ENVIRONMENT_PROMOTION_PATH), "environment promotion standard is missing")
        return

    if promotion.get("issueId") != "USF-193" or promotion.get("parentIssueId") != "USF-133":
        F.add("USF-ENTERPRISE-015", str(ENVIRONMENT_PROMOTION_PATH), "issue or parent linkage is incorrect")
    if promotion.get("serviceDispositionIssueId") != "USF-167":
        F.add("USF-ENTERPRISE-015", "serviceDispositionIssueId", "USF-167 must remain the service disposition gate")

    top_non_claims = set(promotion.get("nonClaims", []))
    missing_non_claims = PROMOTION_TOP_NON_CLAIMS - top_non_claims
    if missing_non_claims:
        F.add("USF-ENTERPRISE-018", "environmentPromotion.nonClaims", f"missing {sorted(missing_non_claims)}")

    stages: dict[str, dict[str, Any]] = {}
    for row in promotion.get("environmentStandards", []):
        if isinstance(row, dict) and isinstance(row.get("environmentStage"), str):
            stage = row["environmentStage"]
            if stage in stages:
                F.add("USF-ENTERPRISE-015", stage, "duplicate environment stage row")
            stages[stage] = row
    missing_stages = PROMOTION_STAGES - set(stages)
    if missing_stages:
        F.add("USF-ENTERPRISE-015", "environmentStandards", f"missing stages {sorted(missing_stages)}")

    for stage, row in stages.items():
        subject = f"environmentStandards.{stage}"
        for field in (
            "purpose",
            "proofRequirements",
            "validatorCommands",
            "enterpriseEvidenceRequirements",
            "promotionPrerequisites",
            "requiredApprover",
            "owners",
            "riskTreatment",
            "statementOfApplicabilitySupport",
            "promotionImpactBlockedUntilProven",
        ):
            if row.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-016", subject, f"missing {field}")

        owners = row.get("owners", {})
        if not isinstance(owners, dict):
            F.add("USF-ENTERPRISE-016", subject, "owners must be an object")
        else:
            for field in ("owner", "riskOwner", "controlOwner", "evidenceOwner"):
                if not owners.get(field):
                    F.add("USF-ENTERPRISE-016", subject, f"missing owners.{field}")

        risk = row.get("riskTreatment", {})
        if not isinstance(risk, dict):
            F.add("USF-ENTERPRISE-016", subject, "riskTreatment must be an object")
        else:
            for field in (
                "riskStatement",
                "threatFailureScenario",
                "impact",
                "likelihood",
                "treatment",
                "reviewDate",
                "followUpIssue",
            ):
                if not risk.get(field):
                    F.add("USF-ENTERPRISE-016", subject, f"missing riskTreatment.{field}")
            if not DATE_RE.fullmatch(str(risk.get("reviewDate", ""))):
                F.add("USF-ENTERPRISE-016", subject, "riskTreatment.reviewDate must be YYYY-MM-DD")
            if not str(risk.get("followUpIssue", "")).startswith("USF-"):
                F.add("USF-ENTERPRISE-016", subject, "riskTreatment.followUpIssue must be a USF issue")

        allowed = set(row.get("allowedClaims", []))
        prohibited = set(row.get("prohibitedClaims", []))
        unsafe_allowed = (PROMOTION_TOP_NON_CLAIMS - {"usf-133-closure"}) & allowed
        if unsafe_allowed:
            F.add("USF-ENTERPRISE-018", subject, f"allowedClaims overclaim readiness: {sorted(unsafe_allowed)}")
        if "usf-133-closure" in allowed:
            F.add("USF-ENTERPRISE-018", subject, "allowedClaims must not include USF-133 closure")
        if stage != "dev" and allowed:
            F.add("USF-ENTERPRISE-018", subject, "non-dev stage must not allow current readiness claims")
        if stage in {"dev", "test", "staging"} and "production-readiness" not in prohibited:
            F.add("USF-ENTERPRISE-018", subject, "lower environments must prohibit production readiness")
        if "iso27001-certification" not in prohibited and stage != "production":
            F.add("USF-ENTERPRISE-018", subject, "non-production stages must prohibit ISO certification claim")

    dev = stages.get("dev", {})
    if dev:
        if dev.get("defaultProviderMode") != "hermetic-mock":
            F.add("USF-ENTERPRISE-017", "dev.defaultProviderMode", "dev default must remain hermetic-mock")
        if "hermetic-mock" not in set(dev.get("permittedProviderModes", [])):
            F.add("USF-ENTERPRISE-017", "dev.permittedProviderModes", "dev must permit hermetic-mock")
        if dev.get("composeRequiredForRequiredServices") is not False:
            F.add("USF-ENTERPRISE-017", "dev.composeRequiredForRequiredServices", "dev Compose must remain proof-boundary-specific")
        if dev.get("syntheticDataOnly") is not True:
            F.add("USF-ENTERPRISE-016", "dev.syntheticDataOnly", "dev must remain synthetic-data only")

    test = stages.get("test", {})
    if test:
        if "hermetic-mock" in set(test.get("permittedProviderModes", [])):
            F.add("USF-ENTERPRISE-017", "test.permittedProviderModes", "in-memory/hermetic providers cannot satisfy test-composed proof")
        if test.get("defaultProviderMode") != "local-composed-real-service":
            F.add("USF-ENTERPRISE-017", "test.defaultProviderMode", "test must default to local-composed-real-service")
        if test.get("composeRequiredForRequiredServices") is not True:
            F.add("USF-ENTERPRISE-017", "test.composeRequiredForRequiredServices", "test must be composed for required services/providers")
        if test.get("destructiveTestingAllowed") is not True or test.get("syntheticDataOnly") is not True:
            F.add("USF-ENTERPRISE-017", "test.destructiveTestingAllowed", "test destructive semantics require synthetic resettable data")

    staging = stages.get("staging", {})
    if staging:
        if staging.get("destructiveTestingAllowed") is not False:
            F.add("USF-ENTERPRISE-017", "staging.destructiveTestingAllowed", "staging must not allow broad destructive testing")
        if staging.get("nonDestructiveOperationRequired") is not True:
            F.add("USF-ENTERPRISE-017", "staging.nonDestructiveOperationRequired", "staging must be non-destructive")
        if staging.get("dataPosture") != "controlled-non-production":
            F.add("USF-ENTERPRISE-017", "staging.dataPosture", "staging must use controlled non-production data")
        text = json.dumps(staging, sort_keys=True).lower()
        for token in ("migration", "rollback", "release", "non-destructive"):
            if token not in text:
                F.add("USF-ENTERPRISE-016", "staging.proofRequirements", f"staging lacks {token} evidence posture")

    production = stages.get("production", {})
    if production:
        if production.get("environmentClass") != "production-live":
            F.add("USF-ENTERPRISE-017", "production.environmentClass", "production must be production-live")
        if set(production.get("permittedProviderModes", [])) != {"live-external-provider"}:
            F.add("USF-ENTERPRISE-017", "production.permittedProviderModes", "production must require live-external-provider authority")
        if production.get("residualRiskApprovalRequired") is not True:
            F.add("USF-ENTERPRISE-016", "production.residualRiskApprovalRequired", "production requires approved residual risk")
        if production.get("destructiveTestingAllowed") is not False or production.get("nonDestructiveOperationRequired") is not True:
            F.add("USF-ENTERPRISE-017", "production.destructiveTestingAllowed", "production must be non-destructive")
        if production.get("dataPosture") != "production-governed":
            F.add("USF-ENTERPRISE-016", "production.dataPosture", "production must require governed production data posture")

    gates = promotion.get("promotionGates", [])
    gate_pairs = {(gate.get("from"), gate.get("to")) for gate in gates if isinstance(gate, dict)}
    expected_pairs = {("dev", "test"), ("test", "staging"), ("staging", "production")}
    if gate_pairs != expected_pairs:
        F.add("USF-ENTERPRISE-015", "promotionGates", f"expected gates {sorted(expected_pairs)}, got {sorted(gate_pairs)}")
    for gate in gates:
        if not isinstance(gate, dict):
            F.add("USF-ENTERPRISE-015", "promotionGates", "gate rows must be objects")
            continue
        gate_id = gate.get("id", "unknown")
        for field in ("requiredEvidence", "forbiddenEvidenceSubstitutions", "approver", "validationCommands", "nonClaims"):
            if gate.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-016", gate_id, f"missing {field}")
        if gate.get("riskAcceptanceRequired") is not True:
            F.add("USF-ENTERPRISE-016", gate_id, "risk acceptance must be required")
        if PROMOTION_TOP_NON_CLAIMS - set(gate.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-018", gate_id, "promotion gate non-claims are incomplete")

    claim_rules = "\n".join(str(item) for item in promotion.get("claimRules", []))
    for token in PROMOTION_CLAIM_RULE_TOKENS:
        if token not in claim_rules:
            F.add("USF-ENTERPRISE-017", "claimRules", f"missing claim rule token: {token}")
    enterprise_text = "\n".join(str(item) for item in promotion.get("enterpriseAssuranceRequirements", []))
    for token in PROMOTION_REQUIRED_ENTERPRISE_TOKENS:
        if token not in enterprise_text:
            F.add("USF-ENTERPRISE-016", "enterpriseAssuranceRequirements", f"missing enterprise requirement: {token}")
    evidence_shape = set(promotion.get("evidencePackageShape", []))
    missing_shape = PROMOTION_REQUIRED_EVIDENCE_PACKAGE_TOKENS - evidence_shape
    if missing_shape:
        F.add("USF-ENTERPRISE-016", "evidencePackageShape", f"missing {sorted(missing_shape)}")
    negative = promotion.get("negativeAssurance", {})
    if not isinstance(negative, dict):
        F.add("USF-ENTERPRISE-018", "negativeAssurance", "negative assurance must be an object")
    else:
        negative_text = json.dumps(negative, sort_keys=True)
        for token in ("test readiness", "staging readiness", "production readiness", "ISO/IEC 27001 certification", "USF-133 closure"):
            if token not in negative_text:
                F.add("USF-ENTERPRISE-018", "negativeAssurance", f"missing negative assurance for {token}")

    model = state["model"]
    for section, required_ids in PROMOTION_REQUIRED_MODEL_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in required_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-016", row_id, f"missing USF-193 enterprise row in {section}")
                continue
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-018", row_id, "USF-193 enterprise row non-claims are incomplete")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-016", row_id, "USF-193 enterprise row lacks validation command")
            if section == "threatModelAbuseCaseRegister" and "validate-enterprise" not in json.dumps(row, sort_keys=True):
                F.add("USF-ENTERPRISE-016", row_id, "USF-193 threat row lacks validation reference")
            if section == "soaSupportMappings":
                for field in ("owner", "riskOwner", "controlOwner", "evidenceSource", "deferredReason"):
                    if not row.get(field):
                        F.add("USF-ENTERPRISE-016", row_id, f"SoA row lacks {field}")
                if str(ENVIRONMENT_PROMOTION_PATH) not in str(row.get("evidenceSource", "")):
                    F.add("USF-ENTERPRISE-016", row_id, "SoA row must link the promotion instance")
            elif section == "evidenceRegister":
                for issue in ("USF-193", "USF-167", "USF-184", "USF-192", "USF-133"):
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-016", row_id, f"evidence row lacks {issue}")
                if "not prove" not in str(row.get("whatWasNotProven", "")).lower():
                    F.add("USF-ENTERPRISE-018", row_id, "evidence row must preserve explicit non-proof boundary")


def check_operator_access_proof_wiring(F: Findings, state: dict[str, Any]) -> None:
    package = state.get("package")
    if not isinstance(package, dict):
        F.add("USF-ENTERPRISE-019", str(PACKAGE_PATH), "package metadata is missing")
        return
    scripts = package.get("scripts", {})
    if not isinstance(scripts, dict):
        F.add("USF-ENTERPRISE-019", "package.scripts", "package scripts are missing")
        return
    expected_command = "tsx packages/proof/src/operator-access-proof.ts"
    if scripts.get("proof:operator-access") != expected_command:
        F.add("USF-ENTERPRISE-019", "proof:operator-access", "operator access proof command is missing or stale")
    if "proof:operator-access" not in str(scripts.get("verify", "")):
        F.add("USF-ENTERPRISE-019", "verify", "verify does not run operator access proof")

    proof_path = ROOT / OPERATOR_ACCESS_PROOF_PATH
    if not proof_path.exists():
        F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), "operator access proof file is missing")
        return
    proof_text = state.get("operatorAccessProofText")
    if not isinstance(proof_text, str):
        F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), "operator access proof text is missing")
        return
    for required in (
        "USF-169",
        "operatorConsoleRuntimeReadinessClaim: false",
        "gatewayReadinessClaim: false",
        "clickthroughReadinessClaim: false",
        "publicExposureClaim: false",
        "productionLiveClaim: false",
        "deferredBoundaries",
        "provider.readiness.checked",
        "observability.readiness.read",
        "observability.signal.read",
    ):
        if required not in proof_text:
            F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), f"operator access proof lacks {required}")
    compact = proof_text.lower().replace(" ", "")
    for prohibited in (
        "operatorconsoleruntimereadinessclaim:true",
        "gatewayreadinessclaim:true",
        "clickthroughreadinessclaim:true",
        "publicexposureclaim:true",
        "productionliveclaim:true",
    ):
        if prohibited in compact:
            F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), "operator access proof overclaims readiness")


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
    check_lane6_safety_controls(F, state)
    check_closure_matrix_linkage(F, state)
    check_operator_access_gateway_matrix(F, state)
    check_lane4_observability(F, state)
    check_assurance_control_plane_disposition(F, state)
    check_environment_promotion_standard(F, state)
    check_operator_access_proof_wiring(F, state)
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
