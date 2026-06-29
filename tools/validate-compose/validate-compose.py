#!/usr/bin/env python3
"""Validate the USF Compose service catalogue and generated Compose files."""

from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[2]
CATALOGUE_PATH = ROOT / "spec/instances/compose-service/service-catalogue.json"
SCHEMA_PATH = ROOT / "spec/schemas/compose-service.schema.json"
REACT_COMPOSE_EVIDENCE_PATH = ROOT / "docs/architecture/complete-react-to-usf-compose-service-parity-matrix.json"
PLANTED_DEFECT_DIR = ROOT / "tools/validate-compose/planted-defects"

GENERATOR_PATH = ROOT / "tools/generate-compose/generate-compose.py"
spec = importlib.util.spec_from_file_location("generate_compose", GENERATOR_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load Compose generator")
generate_compose = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_compose)


RULES = {
    "USF-COMPOSE-001": "React Compose service is not classified",
    "USF-COMPOSE-002": "Compose service exists without catalogue authority",
    "USF-COMPOSE-003": "Required dev composed service is absent",
    "USF-COMPOSE-004": "SonarQube is omitted without rationale",
    "USF-COMPOSE-005": "pgAdmin is omitted without rationale",
    "USF-COMPOSE-006": "Dev in-memory substitute contradicts substitution policy",
    "USF-COMPOSE-007": "Test real-product requirement is replaced by in-memory",
    "USF-COMPOSE-008": "Staging persistent service is reset per run",
    "USF-COMPOSE-009": "Production requirement is silently omitted",
    "USF-COMPOSE-010": "Shared control plane lacks project/environment boundary",
    "USF-COMPOSE-011": "Runtime state shares mutable state across environments",
    "USF-COMPOSE-012": "Operator/admin service lacks access policy",
    "USF-COMPOSE-013": "Execution service lacks audit or credential boundary",
    "USF-COMPOSE-014": "Generated Compose is stale",
    "USF-COMPOSE-015": "Compose topology contradicts classification",
    "USF-COMPOSE-016": "Catalogue JSON Schema validation failed",
    "USF-COMPOSE-017": "Duplicate published host port within environment",
    "USF-COMPOSE-018": "Duplicate published host port across concurrently-runnable environments",
    "USF-COMPOSE-019": "Profile-combination port conflict",
    "USF-COMPOSE-020": "Published port lacks structured semantic port policy",
    "USF-COMPOSE-021": "Published port lacks explicit host_ip or bindScope",
    "USF-COMPOSE-022": "Non-loopback bind lacks explicit accepted authority",
    "USF-COMPOSE-023": "Operator/admin port lacks access, auth, or audit policy",
    "USF-COMPOSE-024": "Production external/cloud requirement lacks exposure boundary",
    "USF-COMPOSE-025": "Service exposes host port but environment policy is not generated for that port",
    "USF-COMPOSE-026": "Raw string port syntax is generated without structured derivation",
    "USF-COMPOSE-027": "Exposed port lacks readiness claim boundary",
    "USF-COMPOSE-028": "Exposed service with secrets/admin/runtime-state lacks hardening metadata",
    "USF-COMPOSE-029": "Generated Compose dependency is absent from the same target",
    "USF-COMPOSE-030": "Service lacks durable catalogue metadata",
    "USF-COMPOSE-031": "Service metadata allows prohibited readiness or compliance claim",
    "USF-COMPOSE-032": "Service evidence grade is too weak for readiness tier without deferred boundary",
    "USF-COMPOSE-033": "Shared control-plane service lacks owner, access, audit, data, or environment boundary",
    "USF-COMPOSE-034": "Admin/operator service lacks auth, audit, break-glass, operator-boundary, or non-claim metadata",
    "USF-COMPOSE-035": "Data-bearing service lacks classification, tenant, backup/restore, retention, or failure metadata",
    "USF-COMPOSE-036": "External, cloud, deferred, or out-of-scope service lacks provider/deferred boundary or prohibited claims",
    "USF-COMPOSE-037": "Service-level metadata contradicts port-level metadata",
}

REQUIRED_SERVICE_METADATA = {
    "serviceOwner",
    "riskOwner",
    "controlOwner",
    "purpose",
    "environmentDisposition",
    "providerBoundary",
    "dataClassification",
    "dataBoundary",
    "readinessTier",
    "evidenceGrade",
    "controlPurpose",
    "assetInventoryClass",
    "accessPosture",
    "authRequirement",
    "auditPosture",
    "auditRequirement",
    "secretPosture",
    "backupRestorePosture",
    "retentionPosture",
    "tenantBoundary",
    "operationalOwnerBoundary",
    "operatorAccessBoundary",
    "sharedControlPlaneJustification",
    "breakGlassRelevance",
    "missingEvidence",
    "iso27001Support",
    "enterpriseFeatureSupport",
    "readinessClaimsAllowed",
    "readinessClaimsProhibited",
}

PROHIBITED_READINESS_CLAIMS = {
    "full-react-parity-readiness",
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
}

STRONGER_CLAIM_TIERS = {
    "local-substrate-catalogued",
    "compose-target-catalogued",
    "external-requirement-catalogued",
}

WEAK_EVIDENCE_GRADES = {"c", "d", "f"}

DATA_CLASSIFICATION_RANK = {
    "none": 0,
    "synthetic-data": 1,
    "telemetry-metadata": 2,
    "operator-metadata": 2,
    "assurance-metadata": 2,
    "routing-metadata": 2,
    "provider-metadata": 2,
    "historical-runtime-metadata": 2,
    "identity-metadata": 3,
    "secret-metadata": 3,
    "secret-reference-metadata": 3,
    "workflow-metadata": 3,
    "content-metadata": 3,
    "backup-metadata": 3,
    "environment-runtime-data": 4,
    "production-data": 5,
}

DATA_BEARING_SERVICE_KINDS = {
    "database",
    "identity-backing-store",
    "event-bus",
    "workflow-runtime",
    "workflow-backing-store",
    "object-storage",
    "secret-store",
    "observability-backing-service",
    "assurance-backing-store",
    "cache",
    "search-provider",
    "file-scanner",
    "operator-automation",
    "operator-automation-worker",
    "backup-restore",
    "analytics-store",
}

ADMIN_OPERATOR_SERVICE_KINDS = {
    "operator-admin",
    "workflow-operator-ui",
    "assurance-control-plane",
    "operator-automation",
    "gateway",
}


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def add(finding_list: list[dict[str, str]], rule_id: str, subject: str, message: str = "") -> None:
    finding_list.append(
        {
            "severity": "blocking",
            "ruleId": rule_id,
            "subject": subject,
            "message": message or RULES[rule_id],
        }
    )


def react_services(path: Path = REACT_COMPOSE_EVIDENCE_PATH) -> set[str]:
    evidence = load_json(path)
    services = evidence.get("services", [])
    if not isinstance(services, list):
        raise ValueError(f"{path} does not contain a services array")
    names = {
        row["react_service"]
        for row in services
        if isinstance(row, dict) and isinstance(row.get("react_service"), str)
    }
    expected_count = evidence.get("react_service_count")
    if expected_count != len(names):
        raise ValueError(f"{path} react_service_count={expected_count} but discovered {len(names)} unique names")
    return names


def generated_service_names(catalogue: dict[str, Any], environment: str) -> set[str]:
    model = generate_compose.compose_model(catalogue, environment)
    return set(model.get("services", {}))


def catalogue_service_names(catalogue: dict[str, Any], environment: str) -> set[str]:
    names: set[str] = set()
    for service in catalogue["services"]:
        policy = service["environmentPolicies"][environment]
        if policy["generated"] and service.get("composeService"):
            names.add(service["composeService"]["serviceName"])
    return names


def generated_dependencies(catalogue: dict[str, Any], environment: str) -> dict[str, set[str]]:
    dependencies: dict[str, set[str]] = {}
    for service in catalogue["services"]:
        policy = service["environmentPolicies"][environment]
        compose = service.get("composeService")
        if not policy["generated"] or not compose:
            continue
        service_name = compose["serviceName"]
        dependencies[service_name] = {dependency["serviceName"] for dependency in compose["dependsOn"]}
    return dependencies


def semantic_ports_for_environment(catalogue: dict[str, Any], environment: str) -> list[dict[str, Any]]:
    ports: list[dict[str, Any]] = []
    for service in catalogue["services"]:
        policy = service["environmentPolicies"][environment]
        for port in service["ports"]:
            if environment not in port["environmentScopes"]:
                continue
            item = dict(port)
            item["serviceId"] = service["serviceId"]
            item["serviceKind"] = service["serviceKind"]
            item["environment"] = environment
            item["serviceGenerated"] = bool(policy["generated"])
            item["environmentPolicy"] = policy
            ports.append(item)
    return ports


def port_key(port: dict[str, Any]) -> tuple[str, int, str]:
    return (port["hostIp"], int(port["publishedPort"]), port["protocol"])


def validate_port_policy(catalogue: dict[str, Any], findings: list[dict[str, str]]) -> None:
    by_environment: dict[str, list[dict[str, Any]]] = {
        env: semantic_ports_for_environment(catalogue, env)
        for env in ["dev", "test", "staging"]
    }

    for environment, ports in by_environment.items():
        seen: dict[tuple[str, int, str], list[dict[str, Any]]] = {}
        for port in ports:
            seen.setdefault(port_key(port), []).append(port)

            if not port["serviceGenerated"]:
                add(findings, "USF-COMPOSE-025", f"{environment}:{port['serviceId']}:{port['name']}")
            if port.get("portAllocationMode") != "not-published" and (
                not port.get("hostIp") or not port.get("bindScope")
            ):
                add(findings, "USF-COMPOSE-021", f"{environment}:{port['serviceId']}:{port['name']}")
            if port.get("hostIp") != "127.0.0.1" or port.get("bindScope") != "loopback-only":
                if not port.get("internetExposureAllowed"):
                    add(findings, "USF-COMPOSE-022", f"{environment}:{port['serviceId']}:{port['name']}")
            if port.get("exposureClass") in {"operator-admin", "assurance", "gateway", "workflow-ui", "identity", "secrets"}:
                if not port.get("accessPolicy") or not port.get("authRequired") or not port.get("auditRequired"):
                    add(findings, "USF-COMPOSE-023", f"{environment}:{port['serviceId']}:{port['name']}")
            if not port.get("readinessClaimsProhibited"):
                add(findings, "USF-COMPOSE-027", f"{environment}:{port['serviceId']}:{port['name']}")
            prohibited_claims = set(port.get("readinessClaimsAllowed", [])) & {
                "production-readiness",
                "staging-readiness",
                "live-provider-readiness",
                "iso27001-certification",
                "soc-readiness",
            }
            if prohibited_claims:
                add(findings, "USF-COMPOSE-027", f"{environment}:{port['serviceId']}:{port['name']}", f"prohibited allowed claims: {sorted(prohibited_claims)}")
            if port["serviceKind"] in {"database", "cache", "object-storage", "secret-store", "operator-admin", "operator-automation"}:
                for field in ["controlPurpose", "riskOwner", "dataClassification", "retentionLoggingPosture", "evidenceProduced"]:
                    if not port.get(field):
                        add(findings, "USF-COMPOSE-028", f"{environment}:{port['serviceId']}:{port['name']}:{field}")

        for key, duplicates in seen.items():
            if len(duplicates) > 1:
                add(findings, "USF-COMPOSE-017", f"{environment}:{key}", ", ".join(f"{p['serviceId']}:{p['name']}" for p in duplicates))

        by_profile: dict[tuple[str, int, str, str], list[dict[str, Any]]] = {}
        for port in ports:
            profiles = port.get("profileScope") or ["<default>"]
            for profile in profiles:
                by_profile.setdefault((*port_key(port), profile), []).append(port)
        for key, duplicates in by_profile.items():
            if len(duplicates) > 1:
                add(findings, "USF-COMPOSE-019", f"{environment}:{key}", ", ".join(f"{p['serviceId']}:{p['name']}" for p in duplicates))

    cross: dict[tuple[str, int, str], list[dict[str, Any]]] = {}
    for ports in by_environment.values():
        for port in ports:
            cross.setdefault(port_key(port), []).append(port)
    for key, ports in cross.items():
        environments = {port["environment"] for port in ports}
        if len(environments) <= 1:
            continue
        if any(port["concurrentEnvironmentPolicy"] != "single-environment-only" for port in ports):
            add(findings, "USF-COMPOSE-018", str(key), ", ".join(f"{p['environment']}:{p['serviceId']}:{p['name']}" for p in ports))

    for service in catalogue["services"]:
        production = service["environmentPolicies"]["production"]
        if production["required"] is not False and production["realisationMode"] in {"external-managed", "cloud-provider"}:
            for field in ["productionExposureBoundary", "environmentScopeMechanism", "projectBoundary", "accessBoundary"]:
                if production.get(field) in {None, "", "none", "not-applicable"}:
                    add(findings, "USF-COMPOSE-024", f"{service['serviceId']}:production:{field}")
        compose = service.get("composeService")
        if compose and compose.get("ports"):
            add(findings, "USF-COMPOSE-020", service["serviceId"], "composeService.ports must be empty; service.ports is authoritative")


SECRET_NAME = re.compile(r"(^|_)(PASSWORD|TOKEN|SECRET|PWD)($|_)", re.I)
CREDENTIAL_URL_VALUE = re.compile(r"://[^:@/]+:[^@/]+@", re.I)
SHORT_PORT_SYNTAX = re.compile(
    r"""(?mx)
    ^\s*-\s*
    (?P<quote>["'])?
    (?:
        \d{1,5}:\d{1,5}
        |
        (?:\d{1,3}\.){3}\d{1,3}:\d{1,5}:\d{1,5}
        |
        \[[0-9A-Fa-f:]+\]:\d{1,5}:\d{1,5}
    )
    (?:/(?:tcp|udp))?
    (?P=quote)?
    \s*$
    """
)


def validate_secret_placeholders(catalogue: dict[str, Any], findings: list[dict[str, str]]) -> None:
    approved_placeholders = set(catalogue.get("approvedLocalSecretPlaceholders", []))
    for service in catalogue["services"]:
        compose = service.get("composeService")
        if not compose:
            continue
        for entry in compose["environment"]:
            name = entry["name"]
            value = entry["value"]
            if SECRET_NAME.search(name) or CREDENTIAL_URL_VALUE.search(value):
                if value not in approved_placeholders:
                    add(findings, "USF-COMPOSE-028", f"{service['serviceId']}:{name}", "secret-like value is not an approved local bootstrap placeholder")


def _empty_metadata(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _claim_list(service: dict[str, Any], field: str) -> set[str]:
    value = service.get(field, [])
    return set(value) if isinstance(value, list) else set()


def _is_shared_control_plane(service: dict[str, Any]) -> bool:
    return (
        service.get("environmentDisposition") == "shared-cross-environment-control-plane"
        or service.get("providerBoundary", {}).get("disposition") == "shared-control-plane"
        or any(
            policy.get("sharingModel") == "shared-control-plane"
            for policy in service.get("environmentPolicies", {}).values()
        )
    )


def _is_admin_or_operator_surface(service: dict[str, Any]) -> bool:
    return (
        service.get("adminSurface", {}).get("present")
        or service.get("operatorSurface", {}).get("present")
        or service.get("serviceKind") in ADMIN_OPERATOR_SERVICE_KINDS
    )


def _is_data_bearing(service: dict[str, Any]) -> bool:
    return (
        service.get("serviceKind") in DATA_BEARING_SERVICE_KINDS
        or service.get("dataClassification") in {
            "environment-runtime-data",
            "identity-metadata",
            "secret-metadata",
            "secret-reference-metadata",
            "workflow-metadata",
            "content-metadata",
            "backup-metadata",
            "production-data",
        }
        or service.get("dataBoundary") in {
            "environment-runtime-data",
            "persistent-staging-data",
            "redacted-production-derived-data",
            "production-data",
        }
    )


def _has_deferred_boundary(service: dict[str, Any]) -> bool:
    return bool(
        service.get("missingEvidence")
        or service.get("deferredDepth", 0) > 0
        or service.get("nonEquivalenceBoundaries")
        or service.get("environmentDisposition") in {"deferred", "out-of-scope"}
        or service.get("providerBoundary", {}).get("disposition") in {"deferred", "out-of-scope"}
    )


def _port_data_exceeds_service(port: dict[str, Any], service: dict[str, Any]) -> bool:
    port_rank = DATA_CLASSIFICATION_RANK.get(port.get("dataClassification", "none"), 0)
    service_rank = DATA_CLASSIFICATION_RANK.get(service.get("dataClassification", "none"), 0)
    return port_rank > service_rank


def validate_service_metadata(catalogue: dict[str, Any], findings: list[dict[str, str]]) -> None:
    for service in catalogue["services"]:
        service_id = service["serviceId"]

        for field in sorted(REQUIRED_SERVICE_METADATA):
            if field not in service or _empty_metadata(service.get(field)):
                add(findings, "USF-COMPOSE-030", f"{service_id}:{field}")

        allowed_claims = _claim_list(service, "readinessClaimsAllowed")
        prohibited_claims = _claim_list(service, "readinessClaimsProhibited")
        if allowed_claims & PROHIBITED_READINESS_CLAIMS:
            add(
                findings,
                "USF-COMPOSE-031",
                service_id,
                f"prohibited allowed claims: {sorted(allowed_claims & PROHIBITED_READINESS_CLAIMS)}",
            )
        missing_prohibited = PROHIBITED_READINESS_CLAIMS - prohibited_claims
        if missing_prohibited:
            add(findings, "USF-COMPOSE-031", service_id, f"missing prohibited claims: {sorted(missing_prohibited)}")
        if service.get("iso27001Support", {}).get("certificationClaimed") is not False:
            add(findings, "USF-COMPOSE-031", f"{service_id}:iso27001Support.certificationClaimed")

        if (
            service.get("readinessTier") in STRONGER_CLAIM_TIERS
            and service.get("evidenceGrade") in WEAK_EVIDENCE_GRADES
            and not _has_deferred_boundary(service)
        ):
            add(findings, "USF-COMPOSE-032", service_id)

        if _is_shared_control_plane(service):
            for field in [
                "riskOwner",
                "accessPosture",
                "auditPosture",
                "dataBoundary",
                "tenantBoundary",
                "operationalOwnerBoundary",
                "sharedControlPlaneJustification",
            ]:
                if _empty_metadata(service.get(field)) or service.get(field) == "not-applicable":
                    add(findings, "USF-COMPOSE-033", f"{service_id}:{field}")
            if service.get("auditPosture") in {"not-required", "deferred"}:
                add(findings, "USF-COMPOSE-033", f"{service_id}:auditPosture")
            if service.get("dataBoundary") == "none":
                add(findings, "USF-COMPOSE-033", f"{service_id}:dataBoundary")
            for env_name, policy in service.get("environmentPolicies", {}).items():
                if policy.get("sharingModel") == "shared-control-plane":
                    for field in ["environmentScopeMechanism", "projectBoundary", "tenantBoundary", "accessBoundary"]:
                        if policy.get(field) in {None, "", "none", "not-applicable"}:
                            add(findings, "USF-COMPOSE-033", f"{service_id}:{env_name}:{field}")

        if _is_admin_or_operator_surface(service):
            for field in [
                "authRequirement",
                "auditRequirement",
                "breakGlassRelevance",
                "operatorAccessBoundary",
                "readinessClaimsProhibited",
            ]:
                if _empty_metadata(service.get(field)):
                    add(findings, "USF-COMPOSE-034", f"{service_id}:{field}")
            if service.get("authRequirement") in {"not-required", "deferred"}:
                add(findings, "USF-COMPOSE-034", f"{service_id}:authRequirement")
            if service.get("auditRequirement") in {"not-required", "local-operational-logs", "deferred"}:
                add(findings, "USF-COMPOSE-034", f"{service_id}:auditRequirement")
            if service.get("breakGlassRelevance") in {"not-applicable", "deferred"}:
                add(findings, "USF-COMPOSE-034", f"{service_id}:breakGlassRelevance")
            if service.get("operatorAccessBoundary", "").startswith("No operator/admin"):
                add(findings, "USF-COMPOSE-034", f"{service_id}:operatorAccessBoundary")

        if _is_data_bearing(service):
            for field in [
                "dataClassification",
                "tenantBoundary",
                "backupRestorePosture",
                "retentionPosture",
                "failureImpact",
            ]:
                if _empty_metadata(service.get(field)):
                    add(findings, "USF-COMPOSE-035", f"{service_id}:{field}")
            if service.get("dataClassification") == "none":
                add(findings, "USF-COMPOSE-035", f"{service_id}:dataClassification")
            if service.get("tenantBoundary") in {"none", "not-applicable"}:
                add(findings, "USF-COMPOSE-035", f"{service_id}:tenantBoundary")
            if service.get("retentionPosture") == "not-required":
                add(findings, "USF-COMPOSE-035", f"{service_id}:retentionPosture")

        provider_disposition = service.get("providerBoundary", {}).get("disposition")
        if provider_disposition in {"external-managed", "cloud-provider", "deferred", "out-of-scope"} or service.get(
            "environmentDisposition"
        ) in {"external-managed", "cloud-provider", "deferred", "out-of-scope"}:
            for field in ["providerBoundary", "missingEvidence", "readinessClaimsProhibited"]:
                if _empty_metadata(service.get(field)):
                    add(findings, "USF-COMPOSE-036", f"{service_id}:{field}")
            provider_boundary = service.get("providerBoundary", {})
            for field in ["supplierBoundary", "evidenceBoundary", "notes"]:
                if _empty_metadata(provider_boundary.get(field)):
                    add(findings, "USF-COMPOSE-036", f"{service_id}:providerBoundary.{field}")
            if missing_prohibited:
                add(findings, "USF-COMPOSE-036", f"{service_id}:readinessClaimsProhibited")

        for index, port in enumerate(service.get("ports", [])):
            subject = f"{service_id}:ports.{index}:{port.get('name', '<unnamed>')}"
            if _port_data_exceeds_service(port, service):
                add(findings, "USF-COMPOSE-037", f"{subject}:dataClassification")
            if port.get("adminSurface") and not service.get("adminSurface", {}).get("present"):
                add(findings, "USF-COMPOSE-037", f"{subject}:adminSurface")
            if port.get("operatorSurface") and not service.get("operatorSurface", {}).get("present"):
                add(findings, "USF-COMPOSE-037", f"{subject}:operatorSurface")
            if port.get("authRequired") and service.get("authRequirement") in {"not-required", "deferred"}:
                add(findings, "USF-COMPOSE-037", f"{subject}:authRequirement")
            if port.get("auditRequired") and service.get("auditRequirement") in {
                "not-required",
                "local-operational-logs",
                "deferred",
            }:
                add(findings, "USF-COMPOSE-037", f"{subject}:auditRequirement")
            if set(port.get("readinessClaimsAllowed", [])) & prohibited_claims:
                add(findings, "USF-COMPOSE-037", f"{subject}:readinessClaimsAllowed")
            if service.get("secretPosture") == "no-secrets" and port.get("secretExposureRisk") != "none":
                add(findings, "USF-COMPOSE-037", f"{subject}:secretPosture")


def validate_schema(catalogue: dict[str, Any], findings: list[dict[str, str]]) -> None:
    schema = load_json(SCHEMA_PATH)
    validator = Draft202012Validator(schema)
    for error in sorted(validator.iter_errors(catalogue), key=lambda e: list(e.path)):
        subject = "/".join(str(p) for p in error.path) or "<root>"
        add(findings, "USF-COMPOSE-016", subject, error.message)


def validate_catalogue(catalogue: dict[str, Any], findings: list[dict[str, str]]) -> None:
    classified = {}
    for service in catalogue["services"]:
        for react_name in service["reactComposeServiceNames"]:
            classified.setdefault(react_name, []).append(service["serviceId"])

    for react_name in sorted(react_services() - set(classified)):
        add(findings, "USF-COMPOSE-001", react_name)

    for environment in ["dev", "test", "staging", "production"]:
        compose_names = generated_service_names(catalogue, environment)
        authorised = catalogue_service_names(catalogue, environment)
        for name in sorted(compose_names - authorised):
            add(findings, "USF-COMPOSE-002", f"{environment}:{name}")
        for service_name, dependencies in generated_dependencies(catalogue, environment).items():
            for dependency in sorted(dependencies - compose_names):
                add(findings, "USF-COMPOSE-029", f"{environment}:{service_name}->{dependency}")

    dev_names = generated_service_names(catalogue, "dev")
    for service in catalogue["services"]:
        service_id = service["serviceId"]
        policies = service["environmentPolicies"]
        dev = policies["dev"]
        test = policies["test"]
        staging = policies["staging"]
        production = policies["production"]

        if dev["generated"] and service.get("composeService"):
            service_name = service["composeService"]["serviceName"]
            if service_name not in dev_names:
                add(findings, "USF-COMPOSE-003", service_id)

        if service_id == "sonarqube" and not dev["generated"] and not service["nonEquivalenceBoundaries"]:
            add(findings, "USF-COMPOSE-004", service_id)
        if service_id == "pgadmin" and not dev["generated"] and not service["nonEquivalenceBoundaries"]:
            add(findings, "USF-COMPOSE-005", service_id)

        if dev["realisationMode"] == "in-memory" and dev["substitutionPolicy"] in {
            "real-product-required",
            "exact-product-required",
            "no-substitute-allowed",
        }:
            add(findings, "USF-COMPOSE-006", service_id)

        if test["substitutionPolicy"] in {"real-product-required", "exact-product-required"} and (
            test["realisationMode"] == "in-memory" or test["deploymentForm"] == "in-memory"
        ):
            add(findings, "USF-COMPOSE-007", service_id)

        if (
            staging["lifecycle"] == "persistent-per-environment"
            and staging["realisationMode"] in {"composed-local", "composed-environment-isolated"}
            and staging["deploymentForm"] == "composed"
            and staging["composePolicy"].startswith("generate")
            and staging["required"] is True
            and staging.get("seedReset") == "reset-per-run"
        ):
            add(findings, "USF-COMPOSE-008", service_id)

        if production["required"] is not False and production["realisationMode"] not in {
            "external-managed",
            "cloud-provider",
            "prohibited",
            "deferred",
        } and not production["generated"]:
            add(findings, "USF-COMPOSE-009", service_id)

        for env_name, policy in policies.items():
            if policy["sharingModel"] == "shared-control-plane":
                for field in [
                    "environmentScopeMechanism",
                    "projectBoundary",
                    "tenantBoundary",
                    "accessBoundary",
                    "productionExposureBoundary",
                ]:
                    if policy.get(field) in {None, "", "none", "not-applicable"}:
                        add(findings, "USF-COMPOSE-010", f"{service_id}:{env_name}:{field}")
            if (
                service["serviceKind"] in {"database", "cache", "search-provider", "object-storage", "analytics-store"}
                and policy["sharingModel"] == "shared-control-plane"
                and policy["dataBoundary"] in {
                    "environment-runtime-data",
                    "persistent-staging-data",
                    "production-data",
                }
            ):
                add(findings, "USF-COMPOSE-011", f"{service_id}:{env_name}")

        if service["adminSurface"]["present"] and service["accessModel"] in {"no-human-access"}:
            add(findings, "USF-COMPOSE-012", service_id)
        if service["operatorSurface"]["present"] and service["accessModel"] in {"no-human-access"}:
            add(findings, "USF-COMPOSE-012", service_id)

        if "executes-code" in service["serviceAuthorityLevels"]:
            if service["secretBoundary"] == "none" or not service["observability"]["auditRequired"]:
                add(findings, "USF-COMPOSE-013", service_id)

        if service.get("composeService"):
            compose = service["composeService"]
            has_profile_policy = any(
                p["composePolicy"] == "generate-profile-gated-service"
                for p in policies.values()
                if p["generated"]
            )
            if has_profile_policy and not compose["profiles"]:
                add(findings, "USF-COMPOSE-015", service_id, "profile-gated service has no compose profile")
            if compose["image"].endswith(":latest"):
                add(findings, "USF-COMPOSE-015", service_id, "image tag latest is prohibited")
    validate_port_policy(catalogue, findings)
    validate_secret_placeholders(catalogue, findings)
    validate_service_metadata(catalogue, findings)


def _compose_service_names_from_text(text: str) -> set[str]:
    names: set[str] = set()
    in_services = False
    for raw in text.splitlines():
        if raw == "services:":
            in_services = True
            continue
        if in_services and raw and not raw.startswith(" ") and not raw.startswith("#"):
            break
        if in_services and raw.startswith("  ") and not raw.startswith("    "):
            key = raw.strip().rstrip(":")
            if key and key != "{}":
                names.add(key)
    return names


def validate_generated(
    catalogue: dict[str, Any],
    findings: list[dict[str, str]],
    actual_overrides: dict[str, str] | None = None,
) -> None:
    for target_name, path in generate_compose.TARGETS.items():
        expected = generate_compose.render_compose(catalogue, target_name)
        actual = actual_overrides.get(target_name) if actual_overrides and target_name in actual_overrides else (
            path.read_text(encoding="utf-8") if path.exists() else None
        )
        if actual != expected:
            add(findings, "USF-COMPOSE-014", str(path.relative_to(ROOT)))
        if actual is not None and target_name in {"dev", "test", "staging"}:
            if SHORT_PORT_SYNTAX.search(actual):
                add(findings, "USF-COMPOSE-026", str(path.relative_to(ROOT)))
            actual_names = _compose_service_names_from_text(actual)
            authorised = catalogue_service_names(catalogue, target_name)
            for name in sorted(actual_names - authorised):
                add(findings, "USF-COMPOSE-002", f"{target_name}:{name}")
            for service_name, dependencies in generated_dependencies(catalogue, target_name).items():
                if service_name in actual_names:
                    for dependency in sorted(dependencies - actual_names):
                        add(findings, "USF-COMPOSE-029", f"{target_name}:{service_name}->{dependency}")
        if actual_overrides and target_name in actual_overrides:
            continue


def apply_patch_defect(catalogue: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    data = copy.deepcopy(catalogue)
    for service_id in defect.get("removeServices", []):
        data["services"] = [s for s in data["services"] if s["serviceId"] != service_id]
    for patch in defect.get("servicePatches", []):
        service = next(s for s in data["services"] if s["serviceId"] == patch["serviceId"])
        for key, value in patch["values"].items():
            target = service
            parts = key.split(".")
            for part in parts[:-1]:
                target = target[int(part)] if isinstance(target, list) else target[part]
            last = parts[-1]
            if isinstance(target, list):
                target[int(last)] = value
            else:
                target[last] = value
    if "generatedComposeTargets" in defect:
        data["generatedComposeTargets"] = defect["generatedComposeTargets"]
    return data


def validate_selftest(base_catalogue: dict[str, Any], findings: list[dict[str, str]]) -> None:
    for path in sorted(PLANTED_DEFECT_DIR.glob("*.json")):
        defect = load_json(path)
        expected = defect["expectedRuleId"]
        mutated = apply_patch_defect(base_catalogue, defect)
        local_findings: list[dict[str, str]] = []
        validate_catalogue(mutated, local_findings)
        if defect.get("checkGenerated", False):
            validate_generated(mutated, local_findings, defect.get("actualComposeOverrides"))
        if expected not in {finding["ruleId"] for finding in local_findings}:
            add(
                findings,
                "USF-COMPOSE-016",
                str(path.relative_to(ROOT)),
                f"planted defect did not raise {expected}",
            )


def run(mode: str) -> list[dict[str, str]]:
    catalogue = load_json(CATALOGUE_PATH)
    findings: list[dict[str, str]] = []
    if mode in {"schema", "all"}:
        validate_schema(catalogue, findings)
    if mode in {"catalogue", "policy", "hardening", "security", "all"}:
        validate_catalogue(catalogue, findings)
    if mode in {"generated", "all"}:
        validate_generated(catalogue, findings)
    if mode in {"selftest", "all"}:
        validate_selftest(catalogue, findings)
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mode",
        nargs="?",
        default="all",
        choices=["schema", "catalogue", "policy", "hardening", "security", "generated", "selftest", "all"],
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    findings = run(args.mode)
    payload = {"mode": args.mode, "findings": findings}
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        for finding in findings:
            print(f"{finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
