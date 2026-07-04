#!/usr/bin/env python3
"""Validate public FQDN semantic contract and proof-gate evidence.

This validator enforces the USF-262 public-FQDN semantic contract and the
USF-263 external DNS/TLS/HTTPS proof-gate evidence. It does not itself perform
network proof; the proof harness does that. The validator fails closed when the
contract or proof-gate evidence is missing, incomplete, gateway-specific,
generated-artifact authoritative, Test-environment dependent on public
internet, or overclaiming readiness.
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
CONTRACT_PATH = Path("docs/architecture/public-fqdn-semantic-contract.json")
EXTERNAL_PROOF_PATH = Path("docs/architecture/public-fqdn-external-proof-gate.json")
ORIGIN_SERVICE_PATH = Path("docs/architecture/public-proof-origin-service.json")
PUBLIC_ROUTE_PROOF_PATH = Path("docs/architecture/public-route-telemetry-proof-gate.json")
COMPOSE_CATALOGUE_PATH = Path("spec/instances/compose-service/service-catalogue.json")
PACKAGE_PATH = Path("package.json")
MAKEFILE_PATH = Path("Makefile")
PLANTED_DEFECT_DIR = Path("tools/validate-public-fqdn/planted-defects")

RULES = {
    "USF-PUBLIC-FQDN-001": ("blocking", "public FQDN semantic contract is missing or invalid"),
    "USF-PUBLIC-FQDN-002": ("blocking", "required staging or production FQDN is missing or stale"),
    "USF-PUBLIC-FQDN-003": ("blocking", "required hostname inventory is incomplete or ambiguous"),
    "USF-PUBLIC-FQDN-004": ("blocking", "DNS TLS HTTPS route or telemetry semantics are incomplete"),
    "USF-PUBLIC-FQDN-005": ("blocking", "public edge semantics are not gateway neutral"),
    "USF-PUBLIC-FQDN-006": ("blocking", "Cloudflare or external provider boundary overclaims readiness"),
    "USF-PUBLIC-FQDN-007": ("blocking", "Test environment depends on public internet DNS or TLS"),
    "USF-PUBLIC-FQDN-008": ("blocking", "public FQDN evidence preserves insufficient non-claims or overclaims readiness"),
    "USF-PUBLIC-FQDN-009": ("blocking", "external DNS TLS HTTPS proof-gate evidence is missing or invalid"),
    "USF-PUBLIC-FQDN-010": ("blocking", "public FQDN proof command wiring is missing stale or no-op"),
    "USF-PUBLIC-FQDN-011": ("blocking", "blocked public FQDN proof does not block v2-proof authorization"),
    "USF-PUBLIC-FQDN-012": ("blocking", "external public FQDN proof evidence is incomplete or overclaims readiness"),
    "USF-PUBLIC-FQDN-013": ("blocking", "public proof origin service evidence is missing gateway-specific or not locally reproducible"),
    "USF-PUBLIC-FQDN-014": ("blocking", "public browser route Playwright proof evidence is missing or unsafe"),
    "USF-PUBLIC-FQDN-015": ("blocking", "public browser route proof command wiring is missing stale or no-op"),
    "USF-PUBLIC-FQDN-016": ("blocking", "public browser route proof overclaims readiness or gateway requirements"),
    "USF-PUBLIC-FQDN-SELFTEST": ("blocking", "planted public FQDN defect did not raise its expected rule"),
}

REQUIRED_CONTRACT_RULE_IDS = {
    "USF-PUBLIC-FQDN-001",
    "USF-PUBLIC-FQDN-002",
    "USF-PUBLIC-FQDN-003",
    "USF-PUBLIC-FQDN-004",
    "USF-PUBLIC-FQDN-005",
    "USF-PUBLIC-FQDN-006",
    "USF-PUBLIC-FQDN-007",
    "USF-PUBLIC-FQDN-008",
}
REQUIRED_PLANTED_RULE_IDS = set(RULES) - {"USF-PUBLIC-FQDN-SELFTEST"}
EXPECTED_ENVIRONMENTS = {
    "staging": "1e100.network",
    "production": "aldous.info",
}
EXPECTED_ROOT_HOST_IDS = {
    "staging": "staging-root",
    "production": "production-root",
}
EXPECTED_JSON_PROOF_ENDPOINT_ID = "public-edge-json-proof"
EXPECTED_BROWSER_ROUTE_BINDING_ID = "public-route-telemetry-proof-route"
EXPECTED_TELEMETRY_BOOTSTRAP_ID = "public-route-telemetry-bootstrap"
REQUIRED_PROTOCOLS = {"dns", "https"}
REQUIRED_NON_CLAIMS = {
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
    "caddy-required-gateway",
}
REQUIRED_EXTERNAL_NON_CLAIMS = REQUIRED_NON_CLAIMS | {"v2-proof-tag-authorization"}
REQUIRED_ORIGIN_NON_CLAIMS = REQUIRED_EXTERNAL_NON_CLAIMS | {
    "netlify-required-gateway",
    "cloudflare-worker-required-gateway",
}
PROHIBITED_ALLOWED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "staging",
    "production",
    "live-provider",
    "soc",
    "iso",
    "product-ui",
    "browser-e2e",
    "full-react-parity",
}
PROHIBITED_NOOP_COMMANDS = {"", "true", "false", "echo", "#"}
EXPECTED_EXTERNAL_PROOF_COMMANDS = {
    "proof:public-fqdn": {
        "scope": "all",
        "command": "tsx packages/proof/src/public-fqdn-proof.ts all",
        "makeTarget": "public-fqdn-proof",
    },
    "proof:public-fqdn:staging": {
        "scope": "staging",
        "command": "tsx packages/proof/src/public-fqdn-proof.ts staging",
        "makeTarget": "public-fqdn-proof-staging",
    },
    "proof:public-fqdn:production": {
        "scope": "production",
        "command": "tsx packages/proof/src/public-fqdn-proof.ts production",
        "makeTarget": "public-fqdn-proof-production",
    },
}
EXPECTED_ORIGIN_PROOF_COMMAND = "tsx packages/proof/src/public-proof-origin-proof.ts"
EXPECTED_ORIGIN_PROOF_SCRIPT = "proof:public-origin"
EXPECTED_ORIGIN_MAKE_TARGET = "public-proof-origin"
EXPECTED_ORIGIN_SERVICE_ID = "public-proof-origin"
EXPECTED_ORIGIN_SERVICE_NAME = "public-proof-origin"
EXPECTED_ORIGIN_PROFILE = "public-proof-origin"
EXPECTED_PUBLIC_ROUTE_PROOF_COMMANDS = {
    "proof:public-route": {
        "scope": "all",
        "command": "tsx packages/proof/src/public-route-telemetry-proof.ts all",
        "makeTarget": "public-route-proof",
    },
    "proof:public-route:staging": {
        "scope": "staging",
        "command": "tsx packages/proof/src/public-route-telemetry-proof.ts staging",
        "makeTarget": "public-route-proof-staging",
    },
    "proof:public-route:production": {
        "scope": "production",
        "command": "tsx packages/proof/src/public-route-telemetry-proof.ts production",
        "makeTarget": "public-route-proof-production",
    },
}


class Findings:
    def __init__(self) -> None:
        self.items: list[dict[str, str]] = []

    def add(self, rule_id: str, subject: str, message: str) -> None:
        severity = RULES.get(rule_id, ("blocking", ""))[0]
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


def load_json(path: Path) -> Any:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def load_optional_json(path: Path) -> Any | None:
    full_path = ROOT / path
    if not full_path.exists():
        return None
    return json.loads(full_path.read_text(encoding="utf-8"))


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    state = {
        "contract": load_optional_json(CONTRACT_PATH),
        "externalProof": load_optional_json(EXTERNAL_PROOF_PATH),
        "originService": load_optional_json(ORIGIN_SERVICE_PATH),
        "publicRouteProof": load_optional_json(PUBLIC_ROUTE_PROOF_PATH),
        "composeCatalogue": load_optional_json(COMPOSE_CATALOGUE_PATH),
        "package": load_json(PACKAGE_PATH),
        "makefile": (ROOT / MAKEFILE_PATH).read_text(encoding="utf-8"),
    }
    if defect:
        state = apply_defect(state, defect)
    return state


def apply_defect(state: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    mutated = copy.deepcopy(state)
    contract = mutated.get("contract")
    if defect.get("dropContract"):
        mutated["contract"] = None
        return mutated
    if isinstance(contract, dict):
        for env_id in defect.get("dropEnvironmentIds", []):
            contract["environments"] = [
                row for row in contract.get("environments", []) if row.get("id") != env_id
            ]
        if "setEnvironmentDomain" in defect:
            patch = defect["setEnvironmentDomain"]
            for row in contract.get("environments", []):
                if row.get("environment") == patch.get("environment"):
                    row["domain"] = patch.get("domain")
        if "appendAllowedClaim" in defect:
            contract.setdefault("allowedClaims", []).append(defect["appendAllowedClaim"])
        if "removeNonClaim" in defect:
            contract["nonClaims"] = [
                claim for claim in contract.get("nonClaims", []) if claim != defect["removeNonClaim"]
            ]
        if "setRequiredGateway" in defect:
            contract.setdefault("publicHttpEdgeCapability", {})["requiredGateway"] = defect[
                "setRequiredGateway"
            ]
        if "setGeneratedArtifactAuthority" in defect:
            contract.setdefault("semanticAuthority", {})["generatedComposeAuthority"] = defect[
                "setGeneratedArtifactAuthority"
            ]
            contract.setdefault("publicHttpEdgeCapability", {})["generatedComposeAuthority"] = defect[
                "setGeneratedArtifactAuthority"
            ]
        if "setCloudflareLiveProviderClaim" in defect:
            contract.setdefault("cloudflareBoundary", {})["liveProviderReadinessClaimAllowed"] = defect[
                "setCloudflareLiveProviderClaim"
            ]
        if "setTestEnvironmentPublicInternetDependency" in defect:
            boundary = contract.setdefault("testEnvironmentBoundary", {})
            boundary["testEnvironmentPublicInternetDependencyAllowed"] = defect[
                "setTestEnvironmentPublicInternetDependency"
            ]
            boundary["testEnvironmentRemainsLocalComposedSynthetic"] = False
        if defect.get("removeTelemetryBootstrap"):
            contract.pop("publicTelemetryBootstrap", None)
        if defect.get("dropProofRoute"):
            contract.setdefault("publicRouteBinding", {}).pop("route", None)
        if defect.get("malformPublicRouteBinding"):
            contract["publicRouteBinding"] = "not-a-route-binding"
        if defect.get("addIncompleteAdditionalHostname"):
            environments = contract.setdefault("environments", [])
            if environments:
                environments[0].setdefault("additionalHostnames", []).append({"fqdn": "api.1e100.network"})
        if defect.get("addCrossDomainAdditionalHostname"):
            environments = contract.setdefault("environments", [])
            for row in environments:
                if row.get("environment") == "staging":
                    row.setdefault("additionalHostnames", []).append(
                        {
                            "id": "staging-cross-domain",
                            "fqdn": "api.aldous.info",
                            "hostnameType": "service",
                            "purpose": "Invalid cross-domain staging hostname.",
                            "protocols": ["dns", "https"],
                            "proofCommandId": "proof:public-fqdn:staging",
                            "owner": "platform",
                            "riskOwner": "platform",
                            "controlOwner": "platform",
                            "jsonProofEndpointId": EXPECTED_JSON_PROOF_ENDPOINT_ID,
                            "routeBindingId": EXPECTED_BROWSER_ROUTE_BINDING_ID,
                            "telemetryBootstrapId": EXPECTED_TELEMETRY_BOOTSTRAP_ID,
                            "claimBoundary": "Invalid cross-domain hostname should fail validation.",
                        }
                    )
        if "setHostnameJsonProofEndpointId" in defect:
            set_hostname_field(contract, "jsonProofEndpointId", defect["setHostnameJsonProofEndpointId"])
        if "setHostnameRouteBindingId" in defect:
            set_hostname_field(contract, "routeBindingId", defect["setHostnameRouteBindingId"])
        if "setHostnameTelemetryBootstrapId" in defect:
            set_hostname_field(contract, "telemetryBootstrapId", defect["setHostnameTelemetryBootstrapId"])
        if "duplicateExpectedRuleFrom" in defect and "duplicateExpectedRuleTo" in defect:
            coverage = contract.setdefault("validator", {}).setdefault("plantedDefectCoverage", {})
            source = coverage.get(defect["duplicateExpectedRuleFrom"], [])
            coverage[defect["duplicateExpectedRuleTo"]] = list(source)
        if "packageScriptDrop" in defect:
            scripts = mutated.get("package", {}).get("scripts", {})
            for script in defect["packageScriptDrop"]:
                scripts.pop(script, None)
        if defect.get("makeTargetDrop"):
            target = defect["makeTargetDrop"]
            mutated["makefile"] = re.sub(rf"\n{re.escape(target)}:\n\t[^\n]+\n", "\n", mutated["makefile"])
    external_proof = mutated.get("externalProof")
    if defect.get("dropExternalProof"):
        mutated["externalProof"] = None
        external_proof = None
    if isinstance(external_proof, dict):
        if "setExternalProofStatus" in defect:
            external_proof["status"] = defect["setExternalProofStatus"]
        if "setExternalProofBlocksV2Proof" in defect:
            external_proof["blocksV2Proof"] = defect["setExternalProofBlocksV2Proof"]
        if "setExternalProofAuthorizationAllowed" in defect:
            external_proof["v2ProofAuthorizationAllowed"] = defect[
                "setExternalProofAuthorizationAllowed"
            ]
        if "removeExternalNonClaim" in defect:
            external_proof["nonClaims"] = [
                claim
                for claim in external_proof.get("nonClaims", [])
                if claim != defect["removeExternalNonClaim"]
            ]
        if "setExternalNegativeEvidence" in defect:
            patch = defect["setExternalNegativeEvidence"]
            external_proof.setdefault("negativeEvidence", {})[patch["field"]] = patch["value"]
        if "setExternalProofCommand" in defect:
            patch = defect["setExternalProofCommand"]
            for row in external_proof.get("proofCommands", {}).values():
                if row.get("id") == patch.get("id"):
                    row["command"] = patch.get("command")
        for row_patch in defect.get("patchExternalFqdnRows", []):
            for row in external_proof.get("requiredFqdns", []):
                if row.get("environment") == row_patch.get("environment"):
                    for key, value in row_patch.get("values", {}).items():
                        if isinstance(value, dict) and isinstance(row.get(key), dict):
                            row[key].update(value)
                        else:
                            row[key] = value
        for env_id in defect.get("dropExternalFqdnEnvironments", []):
            external_proof["requiredFqdns"] = [
                row
                for row in external_proof.get("requiredFqdns", [])
                if row.get("environment") != env_id
            ]
    origin_service = mutated.get("originService")
    if defect.get("dropOriginService"):
        mutated["originService"] = None
        origin_service = None
    if isinstance(origin_service, dict):
        if "setOriginRequiredGateway" in defect:
            origin_service.setdefault("selectedImplementation", {})["requiredGateway"] = defect[
                "setOriginRequiredGateway"
            ]
        if "setOriginCaddyRequired" in defect:
            origin_service.setdefault("selectedImplementation", {})["caddyRequired"] = defect[
                "setOriginCaddyRequired"
            ]
        if "setOriginNetlifyRequired" in defect:
            origin_service.setdefault("selectedImplementation", {})["netlifyRequired"] = defect[
                "setOriginNetlifyRequired"
            ]
        if "setOriginCloudflareWorkerRequired" in defect:
            origin_service.setdefault("selectedImplementation", {})["cloudflareWorkerRequired"] = defect[
                "setOriginCloudflareWorkerRequired"
            ]
        if "setOriginTestPublicInternetDependency" in defect:
            compose = origin_service.setdefault("composeRealisation", {})
            compose["testEnvironmentPublicInternetDependency"] = defect[
                "setOriginTestPublicInternetDependency"
            ]
        if "setOriginGeneratedFor" in defect:
            origin_service.setdefault("composeRealisation", {})["generatedFor"] = defect[
                "setOriginGeneratedFor"
            ]
        if "setOriginJsonRoute" in defect:
            origin_service.setdefault("responseContract", {}).setdefault("jsonProofEndpoint", {})[
                "route"
            ] = defect["setOriginJsonRoute"]
        if "setOriginLocalProofCommand" in defect:
            origin_service.setdefault("selectedImplementation", {})["localProofCommand"] = defect[
                "setOriginLocalProofCommand"
            ]
            origin_service.setdefault("proofEvidence", {}).setdefault("localOrigin", {})[
                "command"
            ] = defect["setOriginLocalProofCommand"]
        if "removeOriginNonClaim" in defect:
            origin_service["nonClaims"] = [
                claim
                for claim in origin_service.get("nonClaims", [])
                if claim != defect["removeOriginNonClaim"]
            ]
    public_route_proof = mutated.get("publicRouteProof")
    if defect.get("dropPublicRouteProof"):
        mutated["publicRouteProof"] = None
        public_route_proof = None
    if isinstance(public_route_proof, dict):
        if "setPublicRouteProofStatus" in defect:
            public_route_proof["status"] = defect["setPublicRouteProofStatus"]
        if "setPublicRouteProofCommand" in defect:
            patch = defect["setPublicRouteProofCommand"]
            for row in public_route_proof.get("proofCommands", {}).values():
                if row.get("id") == patch.get("id"):
                    row["command"] = patch.get("command")
        if "setPublicRouteNegativeEvidence" in defect:
            patch = defect["setPublicRouteNegativeEvidence"]
            public_route_proof.setdefault("negativeEvidence", {})[patch["field"]] = patch["value"]
        if "removePublicRouteNonClaim" in defect:
            public_route_proof["nonClaims"] = [
                claim
                for claim in public_route_proof.get("nonClaims", [])
                if claim != defect["removePublicRouteNonClaim"]
            ]
        for row_patch in defect.get("patchPublicRouteFqdnRows", []):
            for row in public_route_proof.get("requiredFqdns", []):
                if row.get("environment") == row_patch.get("environment"):
                    for key, value in row_patch.get("values", {}).items():
                        if isinstance(value, dict) and isinstance(row.get(key), dict):
                            row[key].update(value)
                        else:
                            row[key] = value
    compose_catalogue = mutated.get("composeCatalogue")
    if defect.get("dropOriginCatalogueService") and isinstance(compose_catalogue, dict):
        compose_catalogue["services"] = [
            service
            for service in compose_catalogue.get("services", [])
            if service.get("serviceId") != EXPECTED_ORIGIN_SERVICE_ID
        ]
    if "setOriginCatalogueServiceName" in defect and isinstance(compose_catalogue, dict):
        for service in compose_catalogue.get("services", []):
            if service.get("serviceId") == EXPECTED_ORIGIN_SERVICE_ID:
                service.setdefault("composeService", {})["serviceName"] = defect[
                    "setOriginCatalogueServiceName"
                ]
    if "setOriginCatalogueHealthcheckScript" in defect and isinstance(compose_catalogue, dict):
        for service in compose_catalogue.get("services", []):
            if service.get("serviceId") == EXPECTED_ORIGIN_SERVICE_ID:
                service.setdefault("composeService", {}).setdefault("healthcheck", {})["test"] = [
                    "CMD",
                    "node",
                    "-e",
                    defect["setOriginCatalogueHealthcheckScript"],
                ]
    if "setPackageScript" in defect:
        patch = defect["setPackageScript"]
        mutated.get("package", {}).setdefault("scripts", {})[patch["name"]] = patch["command"]
    return mutated


def set_hostname_field(contract: dict[str, Any], field: str, value: Any) -> None:
    for row in contract.get("environments", []):
        if not isinstance(row, dict):
            continue
        for collection in ("requiredHostnames", "additionalHostnames"):
            for host in row.get(collection, []):
                if isinstance(host, dict):
                    host[field] = value


def is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def command_is_noop(command: Any) -> bool:
    if not isinstance(command, str):
        return True
    stripped = command.strip()
    if stripped in PROHIBITED_NOOP_COMMANDS:
        return True
    first = stripped.split()[0] if stripped.split() else ""
    return first in PROHIBITED_NOOP_COMMANDS


def check_contract_shape(F: Findings, contract: Any) -> None:
    if not isinstance(contract, dict):
        F.add("USF-PUBLIC-FQDN-001", str(CONTRACT_PATH), "public FQDN semantic contract is missing")
        return
    required_fields = {
        "id",
        "issueId",
        "parentIssueId",
        "semanticAuthority",
        "environments",
        "dnsResolutionSemantics",
        "tlsHttpsSemantics",
        "publicHttpEdgeCapability",
        "cloudflareBoundary",
        "publicJsonProofEndpoint",
        "publicRouteBinding",
        "publicTelemetryBootstrap",
        "testEnvironmentBoundary",
        "validator",
        "nonClaims",
        "allowedClaims",
        "remainingProofBoundaries",
    }
    for field in sorted(required_fields):
        if field not in contract:
            F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#{field}", "required field is missing")
    if contract.get("issueId") != "USF-262" or contract.get("parentIssueId") != "USF-261":
        F.add("USF-PUBLIC-FQDN-001", str(CONTRACT_PATH), "issue linkage is stale")
    authority = contract.get("semanticAuthority", {})
    if not isinstance(authority, dict):
        F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#semanticAuthority", "semantic authority block is invalid")
        return
    for key in (
        "generatedComposeAuthority",
        "generatedGatewayConfigAuthority",
        "historicalReactAuthority",
        "linearAuthority",
    ):
        if authority.get(key) is not False:
            F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#semanticAuthority.{key}", "non-authority source is treated as authority")


def is_domain_bounded(fqdn: str, root_domain: str) -> bool:
    return fqdn == root_domain or fqdn.endswith(f".{root_domain}")


def collect_declared_ids(section: Any) -> set[str]:
    if isinstance(section, dict) and is_non_empty_string(section.get("id")):
        return {section["id"]}
    return set()


def check_environments(F: Findings, contract: dict[str, Any]) -> None:
    environments = contract.get("environments")
    if not isinstance(environments, list) or len(environments) != len(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-002", f"{CONTRACT_PATH}#environments", "staging and production environment rows are required")
        return
    json_endpoint_ids = collect_declared_ids(contract.get("publicJsonProofEndpoint"))
    route_binding_ids = collect_declared_ids(contract.get("publicRouteBinding"))
    telemetry_bootstrap_ids = collect_declared_ids(contract.get("publicTelemetryBootstrap"))
    by_environment = {row.get("environment"): row for row in environments if isinstance(row, dict)}
    if set(by_environment) != set(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-002", f"{CONTRACT_PATH}#environments", "environment set must be staging and production only")
    for environment, expected_domain in EXPECTED_ENVIRONMENTS.items():
        row = by_environment.get(environment)
        if not isinstance(row, dict):
            F.add("USF-PUBLIC-FQDN-002", f"{CONTRACT_PATH}#environments.{environment}", "environment row is missing")
            continue
        if row.get("domain") != expected_domain:
            F.add("USF-PUBLIC-FQDN-002", f"{CONTRACT_PATH}#environments.{environment}.domain", "required FQDN is missing or stale")
        if row.get("minimumMandatoryScope") != "root-fqdn":
            F.add("USF-PUBLIC-FQDN-002", f"{CONTRACT_PATH}#environments.{environment}.minimumMandatoryScope", "minimum mandatory scope must be root FQDN")
        required_hostnames = row.get("requiredHostnames")
        if not isinstance(required_hostnames, list) or not required_hostnames:
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#environments.{environment}.requiredHostnames", "required hostname inventory is missing")
            continue
        root_rows = [host for host in required_hostnames if isinstance(host, dict) and host.get("hostnameType") == "root"]
        if len(root_rows) != 1:
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#environments.{environment}.requiredHostnames", "exactly one root hostname row is required")
        for host in required_hostnames:
            check_hostname_row(
                F,
                host,
                environment,
                expected_domain,
                json_endpoint_ids=json_endpoint_ids,
                route_binding_ids=route_binding_ids,
                telemetry_bootstrap_ids=telemetry_bootstrap_ids,
                required=True,
            )
        additional = row.get("additionalHostnames", [])
        if not isinstance(additional, list):
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#environments.{environment}.additionalHostnames", "additional hostnames must be an array")
        else:
            for host in additional:
                check_hostname_row(
                    F,
                    host,
                    environment,
                    expected_domain,
                    json_endpoint_ids=json_endpoint_ids,
                    route_binding_ids=route_binding_ids,
                    telemetry_bootstrap_ids=telemetry_bootstrap_ids,
                    required=False,
                )
        if not is_non_empty_string(row.get("additionalHostnamePolicy")):
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#environments.{environment}.additionalHostnamePolicy", "additional hostname declaration policy is missing")


def check_hostname_row(
    F: Findings,
    host: Any,
    environment: str,
    expected_domain: str | None,
    *,
    json_endpoint_ids: set[str],
    route_binding_ids: set[str],
    telemetry_bootstrap_ids: set[str],
    required: bool,
) -> None:
    if not isinstance(host, dict):
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames", "hostname row is invalid")
        return
    required_fields = {
        "fqdn",
        "purpose",
        "protocols",
        "proofCommandId",
        "owner",
        "riskOwner",
        "controlOwner",
        "jsonProofEndpointId",
        "routeBindingId",
        "telemetryBootstrapId",
        "claimBoundary",
    }
    for field in sorted(required_fields):
        if not is_non_empty_string(host.get(field)) and field != "protocols":
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.{field}", "hostname field is missing")
    fqdn = host.get("fqdn")
    if required and expected_domain and fqdn != expected_domain:
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.fqdn", "root hostname does not match required domain")
    if not required and expected_domain and is_non_empty_string(fqdn) and not is_domain_bounded(fqdn, expected_domain):
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.fqdn", "additional hostname is outside the declared environment domain")
    protocols = host.get("protocols")
    if not isinstance(protocols, list) or set(protocols) != REQUIRED_PROTOCOLS:
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.protocols", "hostname protocols must be dns and https")
    if required and host.get("id") != EXPECTED_ROOT_HOST_IDS.get(environment):
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.id", "root hostname id is stale")
    if is_non_empty_string(host.get("jsonProofEndpointId")) and host.get("jsonProofEndpointId") not in json_endpoint_ids:
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.jsonProofEndpointId", "hostname references an unknown JSON proof endpoint")
    if is_non_empty_string(host.get("routeBindingId")) and host.get("routeBindingId") not in route_binding_ids:
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.routeBindingId", "hostname references an unknown public route binding")
    if is_non_empty_string(host.get("telemetryBootstrapId")) and host.get("telemetryBootstrapId") not in telemetry_bootstrap_ids:
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.telemetryBootstrapId", "hostname references an unknown telemetry bootstrap")


def check_semantics(F: Findings, contract: dict[str, Any]) -> None:
    dns = contract.get("dnsResolutionSemantics")
    if not isinstance(dns, dict):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#dnsResolutionSemantics", "DNS semantics must be an object")
        dns = {}
    if dns.get("required") is not True or dns.get("publicResolutionRequired") is not True:
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#dnsResolutionSemantics", "public DNS semantics are incomplete")
    if dns.get("privateOnlyResolutionAllowed") is not False or dns.get("nxdomainAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#dnsResolutionSemantics", "DNS failure semantics must fail closed")
    if not {"A", "AAAA", "CNAME"}.issubset(set(dns.get("acceptedRecordTypes", []))):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#dnsResolutionSemantics.acceptedRecordTypes", "accepted DNS record types are incomplete")

    tls = contract.get("tlsHttpsSemantics")
    if not isinstance(tls, dict):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#tlsHttpsSemantics", "TLS HTTPS semantics must be an object")
        tls = {}
    for key in ("httpsRequired", "validCertificateRequired", "certificateHostCoverageRequired"):
        if tls.get(key) is not True:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#tlsHttpsSemantics.{key}", "TLS HTTPS requirement is missing")
    for key in ("httpOnlyAllowed", "mixedContentAllowed"):
        if tls.get(key) is not False:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#tlsHttpsSemantics.{key}", "unsafe HTTPS exception is allowed")

    json_endpoint = contract.get("publicJsonProofEndpoint")
    if not isinstance(json_endpoint, dict):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicJsonProofEndpoint", "JSON proof endpoint semantics are missing")
        json_endpoint = {}
    if json_endpoint.get("id") != EXPECTED_JSON_PROOF_ENDPOINT_ID:
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicJsonProofEndpoint.id", "JSON proof endpoint id is stale")
    if json_endpoint.get("required") is not True or json_endpoint.get("route") != "/.well-known/usf-public-edge.json":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicJsonProofEndpoint", "JSON proof endpoint route is missing or stale")
    if json_endpoint.get("routeClass") != "non-product-json-proof-endpoint":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicJsonProofEndpoint.routeClass", "JSON proof endpoint class must be non-product")
    if json_endpoint.get("expectedContentType") != "application/json":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicJsonProofEndpoint.expectedContentType", "JSON proof endpoint content type is stale")
    if json_endpoint.get("proofIssueId") != "USF-263":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicJsonProofEndpoint.proofIssueId", "JSON proof endpoint must be proven by USF-263")
    if json_endpoint.get("productUiReadinessClaimAllowed") is not False or json_endpoint.get("browserE2eReadinessClaimAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#publicJsonProofEndpoint", "JSON proof endpoint overclaims UI or browser E2E readiness")

    route = contract.get("publicRouteBinding")
    if not isinstance(route, dict):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding", "public browser route binding semantics are missing")
        route = {}
    if route.get("id") != EXPECTED_BROWSER_ROUTE_BINDING_ID:
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding.id", "public browser route binding id is stale")
    if route.get("required") is not True or route.get("route") != "/__proof/public-route":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding", "public browser proof route is missing or stale")
    if route.get("routeClass") != "non-product-browser-telemetry-proof-route":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding.routeClass", "public browser proof route class must be non-product")
    if route.get("expectedContentType") != "text/html":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding.expectedContentType", "public browser proof route content type is stale")
    if route.get("telemetryBootstrapId") != EXPECTED_TELEMETRY_BOOTSTRAP_ID:
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding.telemetryBootstrapId", "public browser route must bind the telemetry bootstrap by id")
    if route.get("proofIssueId") != "USF-264":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding.proofIssueId", "public browser route must be proven by USF-264")
    if route.get("productUiReadinessClaimAllowed") is not False or route.get("browserE2eReadinessClaimAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#publicRouteBinding", "public route binding overclaims UI or browser E2E readiness")

    telemetry = contract.get("publicTelemetryBootstrap")
    if not isinstance(telemetry, dict):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap", "telemetry bootstrap semantics are missing")
    else:
        if telemetry.get("requiredForPublicRouteProof") is not True:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap.requiredForPublicRouteProof", "telemetry bootstrap proof boundary is not explicit")
        if telemetry.get("id") != EXPECTED_TELEMETRY_BOOTSTRAP_ID:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap.id", "telemetry bootstrap id is stale")
        systems = set(telemetry.get("telemetrySystems", []))
        if not {"faro", "sentry"}.issubset(systems):
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap.telemetrySystems", "Faro and Sentry telemetry boundary is incomplete")
        if telemetry.get("rawTelemetryPayloadRetentionAllowed") is not False:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap.rawTelemetryPayloadRetentionAllowed", "raw telemetry retention must be prohibited")


def check_gateway_and_provider(F: Findings, contract: dict[str, Any]) -> None:
    edge = contract.get("publicHttpEdgeCapability")
    if not isinstance(edge, dict):
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability", "public edge capability must be an object")
        edge = {}
    if edge.get("gatewayNeutral") is not True or edge.get("requiredGateway") != "none":
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability", "public edge semantics must be gateway neutral")
    if edge.get("caddyNonRequirement") is not True:
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability.caddyNonRequirement", "Caddy non-requirement is not explicit")
    prohibited = {str(item).lower() for item in edge.get("prohibitedRequiredGateways", [])}
    if "caddy" not in prohibited:
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability.prohibitedRequiredGateways", "Caddy is not prohibited as a required gateway")
    if edge.get("generatedComposeAuthority") is not False or edge.get("generatedGatewayConfigAuthority") is not False:
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability", "generated artefact is treated as semantic authority")

    cloudflare = contract.get("cloudflareBoundary")
    if not isinstance(cloudflare, dict):
        F.add("USF-PUBLIC-FQDN-006", f"{CONTRACT_PATH}#cloudflareBoundary", "Cloudflare boundary must be an object")
        cloudflare = {}
    if cloudflare.get("declaredProvider") != "cloudflare":
        F.add("USF-PUBLIC-FQDN-006", f"{CONTRACT_PATH}#cloudflareBoundary.declaredProvider", "Cloudflare provider boundary is missing")
    if cloudflare.get("liveProviderReadinessClaimAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-006", f"{CONTRACT_PATH}#cloudflareBoundary.liveProviderReadinessClaimAllowed", "Cloudflare boundary overclaims live-provider readiness")
    if cloudflare.get("apiSecretRequiredForSemanticContract") is not False:
        F.add("USF-PUBLIC-FQDN-006", f"{CONTRACT_PATH}#cloudflareBoundary.apiSecretRequiredForSemanticContract", "semantic contract requires Cloudflare secret")


def check_test_boundary(F: Findings, contract: dict[str, Any]) -> None:
    boundary = contract.get("testEnvironmentBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-PUBLIC-FQDN-007", f"{CONTRACT_PATH}#testEnvironmentBoundary", "Test environment boundary must be an object")
        boundary = {}
    for key in (
        "testEnvironmentPublicInternetDependencyAllowed",
        "testEnvironmentPublicDnsDependencyAllowed",
        "testEnvironmentPublicTlsDependencyAllowed",
    ):
        if boundary.get(key) is not False:
            F.add("USF-PUBLIC-FQDN-007", f"{CONTRACT_PATH}#testEnvironmentBoundary.{key}", "Test environment depends on public internet DNS or TLS")
    if boundary.get("testEnvironmentRemainsLocalComposedSynthetic") is not True:
        F.add("USF-PUBLIC-FQDN-007", f"{CONTRACT_PATH}#testEnvironmentBoundary.testEnvironmentRemainsLocalComposedSynthetic", "Test environment boundary is not local composed synthetic")


def check_claims_and_wiring(F: Findings, contract: dict[str, Any], package: dict[str, Any], makefile: str) -> None:
    non_claims_value = contract.get("nonClaims", [])
    if not isinstance(non_claims_value, list):
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#nonClaims", "non-claims must be an array")
        non_claims_value = []
    non_claims = set(non_claims_value)
    missing = REQUIRED_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#nonClaims", f"required non-claims are missing: {sorted(missing)}")
    allowed_claims_value = contract.get("allowedClaims", [])
    if not isinstance(allowed_claims_value, list):
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#allowedClaims", "allowed claims must be an array")
        allowed_claims_value = []
    allowed_claims = {str(claim).lower() for claim in allowed_claims_value}
    prohibited = sorted(allowed_claims & PROHIBITED_ALLOWED_CLAIMS)
    if prohibited:
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#allowedClaims", f"prohibited readiness claim is allowed: {prohibited}")
    validator = contract.get("validator")
    if not isinstance(validator, dict):
        F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#validator", "validator metadata must be an object")
        validator = {}
    declared_rules = set(validator.get("rules", [])) if isinstance(validator.get("rules"), list) else set()
    if declared_rules != REQUIRED_CONTRACT_RULE_IDS:
        F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#validator.rules", "validator rule inventory must exactly match the required public FQDN rules")
    check_planted_defect_coverage_map(F, validator.get("plantedDefectCoverage"))
    if validator.get("command") != "python3 tools/validate-public-fqdn/validate-public-fqdn.py all --json":
        F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#validator.command", "validator command is stale")
    if validator.get("selftestCommand") != "python3 tools/validate-public-fqdn/validate-public-fqdn.py selftest --json":
        F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#validator.selftestCommand", "validator selftest command is stale")
    scripts = package.get("scripts", {})
    if scripts.get("public-fqdn:validate") != "python3 tools/validate-public-fqdn/validate-public-fqdn.py all --json":
        F.add("USF-PUBLIC-FQDN-001", "package.json#scripts.public-fqdn:validate", "package validator script is missing or stale")
    if scripts.get("public-fqdn:selftest") != "python3 tools/validate-public-fqdn/validate-public-fqdn.py selftest --json":
        F.add("USF-PUBLIC-FQDN-001", "package.json#scripts.public-fqdn:selftest", "package selftest script is missing or stale")
    if "python3 tools/validate-public-fqdn/validate-public-fqdn.py all --json" not in scripts.get("repo:validate", ""):
        F.add("USF-PUBLIC-FQDN-001", "package.json#scripts.repo:validate", "public FQDN validator is not wired into repository validation")
    if not re.search(r"^public-fqdn-validate:\n\tcorepack pnpm public-fqdn:validate$", makefile, re.MULTILINE):
        F.add("USF-PUBLIC-FQDN-001", "Makefile#public-fqdn-validate", "Make validator target is missing or stale")
    for command in (validator.get("command"), validator.get("selftestCommand")):
        if command_is_noop(command):
            F.add("USF-PUBLIC-FQDN-001", f"{CONTRACT_PATH}#validator", "validator command must not be a no-op")


def load_planted_defect_expected_rules() -> dict[str, str]:
    expected_by_path: dict[str, str] = {}
    directory = ROOT / PLANTED_DEFECT_DIR
    if not directory.exists():
        return expected_by_path
    for path in sorted(directory.glob("*.json")):
        try:
            defect = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        expected = defect.get("expectedRule")
        if isinstance(expected, str):
            expected_by_path[str(path.relative_to(ROOT))] = expected
    return expected_by_path


def check_planted_defect_coverage_map(F: Findings, coverage_map: Any) -> None:
    if not isinstance(coverage_map, dict):
        F.add("USF-PUBLIC-FQDN-SELFTEST", f"{CONTRACT_PATH}#validator.plantedDefectCoverage", "planted defect coverage map is missing")
        return
    expected_by_path = load_planted_defect_expected_rules()
    for rule_id in sorted(REQUIRED_CONTRACT_RULE_IDS):
        entries = coverage_map.get(rule_id)
        if not isinstance(entries, list) or not entries:
            F.add("USF-PUBLIC-FQDN-SELFTEST", f"{CONTRACT_PATH}#validator.plantedDefectCoverage.{rule_id}", "coverage map has no fixture list for required rule")
            continue
        for entry in entries:
            if not isinstance(entry, str):
                F.add("USF-PUBLIC-FQDN-SELFTEST", f"{CONTRACT_PATH}#validator.plantedDefectCoverage.{rule_id}", "coverage map fixture path must be a string")
                continue
            if expected_by_path.get(entry) != rule_id:
                F.add("USF-PUBLIC-FQDN-SELFTEST", f"{CONTRACT_PATH}#validator.plantedDefectCoverage.{rule_id}", "coverage map claims a fixture that does not uniquely expect this rule")


def check_external_proof_shape(F: Findings, external_proof: Any) -> None:
    if not isinstance(external_proof, dict):
        F.add("USF-PUBLIC-FQDN-009", str(EXTERNAL_PROOF_PATH), "external proof-gate evidence is missing")
        return
    required_fields = {
        "id",
        "issueId",
        "parentIssueId",
        "semanticContract",
        "status",
        "statusRationale",
        "blocksV2Proof",
        "v2ProofAuthorizationAllowed",
        "humanAuthorizationRequiredToBypass",
        "proofCommands",
        "requiredFqdns",
        "negativeEvidence",
        "validator",
        "nonClaims",
    }
    for field in sorted(required_fields):
        if field not in external_proof:
            F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#{field}", "required field is missing")
    if external_proof.get("issueId") != "USF-263" or external_proof.get("parentIssueId") != "USF-261":
        F.add("USF-PUBLIC-FQDN-009", str(EXTERNAL_PROOF_PATH), "issue linkage is stale")
    if external_proof.get("semanticContract") != str(CONTRACT_PATH):
        F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#semanticContract", "semantic contract linkage is stale")
    if external_proof.get("status") not in {"pass", "blocked"}:
        F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#status", "status must be pass or blocked")
    if not is_non_empty_string(external_proof.get("statusRationale")):
        F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#statusRationale", "status rationale is missing")


def check_external_proof_commands(
    F: Findings,
    external_proof: dict[str, Any],
    package: dict[str, Any],
    makefile: str,
) -> None:
    proof_commands = external_proof.get("proofCommands")
    if not isinstance(proof_commands, dict):
        F.add("USF-PUBLIC-FQDN-010", f"{EXTERNAL_PROOF_PATH}#proofCommands", "proof command map is missing")
        return
    by_id = {
        row.get("id"): row
        for row in proof_commands.values()
        if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    scripts = package.get("scripts", {})
    for script_id, expected in EXPECTED_EXTERNAL_PROOF_COMMANDS.items():
        row = by_id.get(script_id)
        if not isinstance(row, dict):
            F.add("USF-PUBLIC-FQDN-010", f"{EXTERNAL_PROOF_PATH}#proofCommands.{script_id}", "proof command row is missing")
            continue
        if row.get("command") != expected["command"] or command_is_noop(row.get("command")):
            F.add("USF-PUBLIC-FQDN-010", f"{EXTERNAL_PROOF_PATH}#proofCommands.{script_id}.command", "proof command is stale or no-op")
        if row.get("packageScript") != script_id:
            F.add("USF-PUBLIC-FQDN-010", f"{EXTERNAL_PROOF_PATH}#proofCommands.{script_id}.packageScript", "proof package script id is stale")
        if row.get("makeTarget") != expected["makeTarget"]:
            F.add("USF-PUBLIC-FQDN-010", f"{EXTERNAL_PROOF_PATH}#proofCommands.{script_id}.makeTarget", "proof Make target is stale")
        if scripts.get(script_id) != expected["command"] or command_is_noop(scripts.get(script_id)):
            F.add("USF-PUBLIC-FQDN-010", f"package.json#scripts.{script_id}", "proof package script is missing stale or no-op")
        target = expected["makeTarget"]
        command = f"corepack pnpm {script_id}"
        if not re.search(rf"^{re.escape(target)}:\n\t{re.escape(command)}$", makefile, re.MULTILINE):
            F.add("USF-PUBLIC-FQDN-010", f"Makefile#{target}", "proof Make target is missing or stale")


def check_external_blocked_state(F: Findings, external_proof: dict[str, Any]) -> None:
    if external_proof.get("status") == "blocked":
        if external_proof.get("blocksV2Proof") is not True:
            F.add("USF-PUBLIC-FQDN-011", f"{EXTERNAL_PROOF_PATH}#blocksV2Proof", "blocked proof must block v2-proof")
        if external_proof.get("v2ProofAuthorizationAllowed") is not False:
            F.add("USF-PUBLIC-FQDN-011", f"{EXTERNAL_PROOF_PATH}#v2ProofAuthorizationAllowed", "blocked proof must not authorize v2-proof")
        if external_proof.get("humanAuthorizationRequiredToBypass") is not True:
            F.add("USF-PUBLIC-FQDN-011", f"{EXTERNAL_PROOF_PATH}#humanAuthorizationRequiredToBypass", "blocked proof bypass must require human authorization")
        if "USF-263" not in external_proof.get("blockerIssueIds", []):
            F.add("USF-PUBLIC-FQDN-011", f"{EXTERNAL_PROOF_PATH}#blockerIssueIds", "blocked proof must link USF-263 as blocker")
    elif external_proof.get("status") == "pass":
        if external_proof.get("blocksV2Proof") is not False:
            F.add("USF-PUBLIC-FQDN-011", f"{EXTERNAL_PROOF_PATH}#blocksV2Proof", "passing proof must explicitly unblock only this proof gate")
        if external_proof.get("v2ProofAuthorizationAllowed") is not False:
            F.add("USF-PUBLIC-FQDN-011", f"{EXTERNAL_PROOF_PATH}#v2ProofAuthorizationAllowed", "USF-263 alone must not authorize v2-proof")


def check_external_fqdn_evidence(F: Findings, external_proof: dict[str, Any], contract: Any) -> None:
    rows = external_proof.get("requiredFqdns")
    if not isinstance(rows, list) or len(rows) != len(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#requiredFqdns", "required FQDN proof rows are incomplete")
        return
    by_environment = {row.get("environment"): row for row in rows if isinstance(row, dict)}
    if set(by_environment) != set(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#requiredFqdns", "required FQDN environments are stale")

    contract_route = "/.well-known/usf-public-edge.json"
    if isinstance(contract, dict):
        json_endpoint = contract.get("publicJsonProofEndpoint", {})
        if isinstance(json_endpoint, dict):
            contract_route = json_endpoint.get("route", contract_route)

    for environment, expected_fqdn in EXPECTED_ENVIRONMENTS.items():
        row = by_environment.get(environment)
        if not isinstance(row, dict):
            F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}", "required FQDN proof row is missing")
            continue
        if row.get("fqdn") != expected_fqdn:
            F.add("USF-PUBLIC-FQDN-009", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.fqdn", "required FQDN proof row is stale")
        if row.get("proofCommandId") != f"proof:public-fqdn:{environment}":
            F.add("USF-PUBLIC-FQDN-010", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.proofCommandId", "proof command id is stale")

        dns = row.get("dns")
        if not isinstance(dns, dict):
            F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.dns", "DNS evidence is missing")
        else:
            if dns.get("publicResolutionObserved") is not True:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.dns.publicResolutionObserved", "public DNS resolution is not evidenced")
            if dns.get("privateOnlyResolutionObserved") is not False:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.dns.privateOnlyResolutionObserved", "private-only DNS resolution was accepted")
            if dns.get("nxdomainObserved") is not False:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.dns.nxdomainObserved", "NXDOMAIN was accepted")

        tls = row.get("tls")
        if not isinstance(tls, dict):
            F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.tls", "TLS evidence is missing")
        else:
            if tls.get("httpsAttempted") is not True:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.tls.httpsAttempted", "HTTPS/TLS attempt is not evidenced")
            if tls.get("validCertificateObserved") is not True:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.tls.validCertificateObserved", "valid certificate is not evidenced")
            if tls.get("certificateHostCoverageObserved") is not True:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.tls.certificateHostCoverageObserved", "certificate host coverage is not evidenced")

        http_route = row.get("httpRoute")
        if not isinstance(http_route, dict):
            F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.httpRoute", "HTTP route evidence is missing")
        else:
            if http_route.get("preferredRoute") != contract_route:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.httpRoute", "proof route evidence is stale")
            if "lastObservedStatus" not in http_route:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.httpRoute.lastObservedStatus", "last observed HTTP status is missing")
            if external_proof.get("status") == "pass":
                if http_route.get("proofEndpointContentDelivered") is not True:
                    F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.httpRoute.proofEndpointContentDelivered", "passing proof lacks endpoint content delivery")
                if http_route.get("expectedMarkerObserved") is not True:
                    F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.httpRoute.expectedMarkerObserved", "passing proof lacks expected marker")
            elif row.get("currentBlocker") is None and http_route.get("proofEndpointContentDelivered") is not True:
                F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#requiredFqdns.{environment}.currentBlocker", "blocked route proof lacks explicit blocker")


def check_external_negative_evidence_and_claims(F: Findings, external_proof: dict[str, Any]) -> None:
    negative = external_proof.get("negativeEvidence")
    if not isinstance(negative, dict):
        F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#negativeEvidence", "negative evidence block is missing")
        return
    for key in (
        "localhostAccepted",
        "privateInternalHostAccepted",
        "privateIpAccepted",
        "cloudflareApiSecretRequired",
        "caddyRequiredGatewayClaim",
        "generatedComposeAuthority",
        "generatedGatewayConfigAuthority",
    ):
        if negative.get(key) is not False:
            F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#negativeEvidence.{key}", "unsafe public FQDN proof posture is accepted")
    non_claims = set(external_proof.get("nonClaims", []))
    missing = REQUIRED_EXTERNAL_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-PUBLIC-FQDN-012", f"{EXTERNAL_PROOF_PATH}#nonClaims", f"required external proof non-claims are missing: {sorted(missing)}")


def find_compose_service(catalogue: Any, service_id: str) -> dict[str, Any] | None:
    if not isinstance(catalogue, dict):
        return None
    for service in catalogue.get("services", []):
        if isinstance(service, dict) and service.get("serviceId") == service_id:
            return service
    return None


def check_public_proof_origin_service(
    F: Findings,
    origin_service: Any,
    contract: Any,
    compose_catalogue: Any,
    package: dict[str, Any],
    makefile: str,
) -> None:
    if not isinstance(origin_service, dict):
        F.add("USF-PUBLIC-FQDN-013", str(ORIGIN_SERVICE_PATH), "public proof origin service evidence is missing")
        return
    if origin_service.get("issueId") != "USF-266" or origin_service.get("unblocksIssueId") != "USF-263":
        F.add("USF-PUBLIC-FQDN-013", str(ORIGIN_SERVICE_PATH), "origin service issue linkage is stale")
    if origin_service.get("semanticContract") != str(CONTRACT_PATH):
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#semanticContract", "origin service semantic contract linkage is stale")

    implementation = origin_service.get("selectedImplementation")
    if not isinstance(implementation, dict):
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#selectedImplementation", "selected implementation block is missing")
        implementation = {}
    if implementation.get("gatewayNeutral") is not True or implementation.get("requiredGateway") != "none":
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#selectedImplementation", "origin implementation must be gateway neutral")
    for gateway_field in ("caddyRequired", "netlifyRequired", "cloudflareWorkerRequired"):
        if implementation.get(gateway_field) is not False:
            F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#selectedImplementation.{gateway_field}", "gateway product is required by origin evidence")
    if implementation.get("entrypoint") != "apps/public-proof-origin/src/server.mjs":
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#selectedImplementation.entrypoint", "origin entrypoint is stale")
    if implementation.get("localProofCommand") != "corepack pnpm proof:public-origin":
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#selectedImplementation.localProofCommand", "origin local proof command is stale")

    response = origin_service.get("responseContract")
    if not isinstance(response, dict):
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract", "origin response contract is missing")
        response = {}
    json_endpoint = response.get("jsonProofEndpoint")
    if not isinstance(json_endpoint, dict):
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract.jsonProofEndpoint", "JSON endpoint contract is missing")
        json_endpoint = {}
    contract_json_route = "/.well-known/usf-public-edge.json"
    if isinstance(contract, dict) and isinstance(contract.get("publicJsonProofEndpoint"), dict):
        contract_json_route = contract["publicJsonProofEndpoint"].get("route", contract_json_route)
    if json_endpoint.get("method") != "GET" or json_endpoint.get("route") != contract_json_route:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract.jsonProofEndpoint", "JSON proof endpoint route is stale")
    if json_endpoint.get("status") != 200 or json_endpoint.get("requiredMarker") != "usf-public-edge":
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract.jsonProofEndpoint", "JSON proof endpoint response requirements are incomplete")
    if json_endpoint.get("contentTypeIncludes") != "application/json":
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract.jsonProofEndpoint.contentTypeIncludes", "JSON proof endpoint content type is stale")

    browser_route = response.get("browserProofRoute")
    if not isinstance(browser_route, dict):
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract.browserProofRoute", "browser proof route contract is missing")
        browser_route = {}
    contract_browser_route = "/__proof/public-route"
    if isinstance(contract, dict) and isinstance(contract.get("publicRouteBinding"), dict):
        contract_browser_route = contract["publicRouteBinding"].get("route", contract_browser_route)
    if browser_route.get("method") != "GET" or browser_route.get("route") != contract_browser_route:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract.browserProofRoute", "browser proof route is stale")
    if browser_route.get("requiredMarker") != "usf-public-route" or browser_route.get("requiredTelemetryBootstrapMarker") != "usf-public-route-telemetry-bootstrap":
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#responseContract.browserProofRoute", "browser proof route markers are incomplete")

    environments = {
        row.get("environment"): row
        for row in origin_service.get("environments", [])
        if isinstance(row, dict)
    }
    if set(environments) != set(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#environments", "origin environments must be staging and production only")
    for environment, expected_fqdn in EXPECTED_ENVIRONMENTS.items():
        row = environments.get(environment)
        if not isinstance(row, dict) or row.get("fqdn") != expected_fqdn:
            F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#environments.{environment}", "origin FQDN environment row is stale")

    compose = origin_service.get("composeRealisation")
    if not isinstance(compose, dict):
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#composeRealisation", "origin Compose realisation is missing")
        compose = {}
    if compose.get("serviceId") != EXPECTED_ORIGIN_SERVICE_ID or compose.get("serviceName") != EXPECTED_ORIGIN_SERVICE_NAME:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#composeRealisation.service", "origin Compose service identity is stale")
    if compose.get("profile") != EXPECTED_ORIGIN_PROFILE:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#composeRealisation.profile", "origin Compose profile is stale")
    if compose.get("generatedFor") != ["staging", "production"]:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#composeRealisation.generatedFor", "origin must be generated only for staging and production")
    if compose.get("notGeneratedFor") != ["dev", "test"]:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#composeRealisation.notGeneratedFor", "origin dev/test non-generation boundary is stale")
    for field in (
        "testEnvironmentPublicInternetDependency",
        "testEnvironmentPublicDnsDependency",
        "testEnvironmentPublicTlsDependency",
        "gatewayRequiredByCompose",
    ):
        if compose.get(field) is not False:
            F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#composeRealisation.{field}", "origin Compose boundary overclaims or requires public internet/gateway")

    scripts = package.get("scripts", {})
    if scripts.get(EXPECTED_ORIGIN_PROOF_SCRIPT) != EXPECTED_ORIGIN_PROOF_COMMAND:
        F.add("USF-PUBLIC-FQDN-013", f"package.json#scripts.{EXPECTED_ORIGIN_PROOF_SCRIPT}", "origin proof script is missing or stale")
    if not re.search(
        rf"^{re.escape(EXPECTED_ORIGIN_MAKE_TARGET)}:\n\tcorepack pnpm {re.escape(EXPECTED_ORIGIN_PROOF_SCRIPT)}$",
        makefile,
        re.MULTILINE,
    ):
        F.add("USF-PUBLIC-FQDN-013", f"Makefile#{EXPECTED_ORIGIN_MAKE_TARGET}", "origin Make target is missing or stale")
    proof = origin_service.get("proofEvidence", {})
    local_origin = proof.get("localOrigin") if isinstance(proof, dict) else None
    if not isinstance(local_origin, dict) or local_origin.get("status") != "pass" or local_origin.get("command") != "corepack pnpm proof:public-origin":
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#proofEvidence.localOrigin", "origin local proof evidence is missing or stale")
    external = proof.get("externalPublicFqdn") if isinstance(proof, dict) else None
    if not isinstance(external, dict) or external.get("status") not in {"pass", "blocked"}:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#proofEvidence.externalPublicFqdn", "external route proof evidence must record pass or blocked status")
    elif external.get("status") == "pass":
        expected_commands = {
            "corepack pnpm proof:public-fqdn",
            "corepack pnpm proof:public-fqdn:staging",
            "corepack pnpm proof:public-fqdn:production",
        }
        commands = set(external.get("commands", []))
        if commands != expected_commands:
            F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#proofEvidence.externalPublicFqdn.commands", "passing external route proof must list all strict proof commands")
        if external.get("responseContractObserved") is not True:
            F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#proofEvidence.externalPublicFqdn.responseContractObserved", "passing external route proof must observe the response contract")
        if set(external.get("checkedFqdns", [])) != set(EXPECTED_ENVIRONMENTS.values()):
            F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#proofEvidence.externalPublicFqdn.checkedFqdns", "passing external route proof must cover every declared FQDN")
    else:
        if not is_non_empty_string(external.get("blockedBy")):
            F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#proofEvidence.externalPublicFqdn.blockedBy", "blocked external route proof must record the blocker")

    service = find_compose_service(compose_catalogue, EXPECTED_ORIGIN_SERVICE_ID)
    if service is None:
        F.add("USF-PUBLIC-FQDN-013", str(COMPOSE_CATALOGUE_PATH), "public proof origin catalogue service is missing")
    else:
        if service.get("serviceKind") != "application-runtime":
            F.add("USF-PUBLIC-FQDN-013", f"{COMPOSE_CATALOGUE_PATH}#public-proof-origin.serviceKind", "origin service kind is stale")
        if service.get("composeService", {}).get("serviceName") != EXPECTED_ORIGIN_SERVICE_NAME:
            F.add("USF-PUBLIC-FQDN-013", f"{COMPOSE_CATALOGUE_PATH}#public-proof-origin.composeService.serviceName", "origin compose service name is stale")
        healthcheck = service.get("composeService", {}).get("healthcheck", {})
        healthcheck_test = healthcheck.get("test") if isinstance(healthcheck, dict) else None
        healthcheck_script = " ".join(str(part) for part in healthcheck_test) if isinstance(healthcheck_test, list) else ""
        for expected_fqdn in EXPECTED_ENVIRONMENTS.values():
            if expected_fqdn not in healthcheck_script:
                F.add(
                    "USF-PUBLIC-FQDN-013",
                    f"{COMPOSE_CATALOGUE_PATH}#public-proof-origin.composeService.healthcheck",
                    f"origin healthcheck must probe declared public Host header: {expected_fqdn}",
                )
        for expected_fragment in ("usf-public-edge", "application/json"):
            if expected_fragment not in healthcheck_script:
                F.add(
                    "USF-PUBLIC-FQDN-013",
                    f"{COMPOSE_CATALOGUE_PATH}#public-proof-origin.composeService.healthcheck",
                    f"origin healthcheck must verify {expected_fragment}",
                )
        policies = service.get("environmentPolicies", {})
        for environment in ("dev", "test"):
            policy = policies.get(environment, {})
            if policy.get("required") is not False or policy.get("generated") is not False:
                F.add("USF-PUBLIC-FQDN-013", f"{COMPOSE_CATALOGUE_PATH}#public-proof-origin.{environment}", "origin must not be required or generated for dev/test")
        for environment in ("staging", "production"):
            policy = policies.get(environment, {})
            if policy.get("required") is not True or policy.get("generated") is not True:
                F.add("USF-PUBLIC-FQDN-013", f"{COMPOSE_CATALOGUE_PATH}#public-proof-origin.{environment}", "origin must be generated for staging/production")
            if policy.get("composePolicy") != "generate-profile-gated-service" or policy.get("composeProfiles") != [EXPECTED_ORIGIN_PROFILE]:
                F.add("USF-PUBLIC-FQDN-013", f"{COMPOSE_CATALOGUE_PATH}#public-proof-origin.{environment}.composeProfiles", "origin must be profile-gated")

    non_claims = set(origin_service.get("nonClaims", []))
    missing = REQUIRED_ORIGIN_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-PUBLIC-FQDN-013", f"{ORIGIN_SERVICE_PATH}#nonClaims", f"origin non-claims are missing: {sorted(missing)}")


def check_public_route_proof_shape(F: Findings, route_proof: Any) -> None:
    if not isinstance(route_proof, dict):
        F.add("USF-PUBLIC-FQDN-014", str(PUBLIC_ROUTE_PROOF_PATH), "public route proof evidence is missing")
        return
    required_fields = {
        "id",
        "issueId",
        "parentIssueId",
        "semanticContract",
        "originServiceEvidence",
        "status",
        "statusRationale",
        "blocksV2Proof",
        "v2ProofAuthorizationAllowed",
        "proofCommands",
        "requiredFqdns",
        "negativeEvidence",
        "browserAutomation",
        "telemetryBootstrapBoundary",
        "validator",
        "nonClaims",
    }
    for field in sorted(required_fields):
        if field not in route_proof:
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#{field}", "required field is missing")
    if route_proof.get("issueId") != "USF-264" or route_proof.get("parentIssueId") != "USF-261":
        F.add("USF-PUBLIC-FQDN-014", str(PUBLIC_ROUTE_PROOF_PATH), "issue linkage is stale")
    if route_proof.get("semanticContract") != str(CONTRACT_PATH):
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#semanticContract", "semantic contract linkage is stale")
    if route_proof.get("originServiceEvidence") != str(ORIGIN_SERVICE_PATH):
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#originServiceEvidence", "origin service linkage is stale")
    if route_proof.get("status") != "pass":
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#status", "public route proof must record a passing proof or remain open")
    if not is_non_empty_string(route_proof.get("statusRationale")):
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#statusRationale", "status rationale is missing")
    if route_proof.get("blocksV2Proof") is not False or route_proof.get("v2ProofAuthorizationAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-016", str(PUBLIC_ROUTE_PROOF_PATH), "USF-264 alone must not authorize v2-proof")


def check_public_route_proof_commands(
    F: Findings,
    route_proof: dict[str, Any],
    package: dict[str, Any],
    makefile: str,
) -> None:
    proof_commands = route_proof.get("proofCommands")
    if not isinstance(proof_commands, dict):
        F.add("USF-PUBLIC-FQDN-015", f"{PUBLIC_ROUTE_PROOF_PATH}#proofCommands", "public route proof command map is missing")
        return
    by_id = {
        row.get("id"): row
        for row in proof_commands.values()
        if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    scripts = package.get("scripts", {})
    for script_id, expected in EXPECTED_PUBLIC_ROUTE_PROOF_COMMANDS.items():
        row = by_id.get(script_id)
        if not isinstance(row, dict):
            F.add("USF-PUBLIC-FQDN-015", f"{PUBLIC_ROUTE_PROOF_PATH}#proofCommands.{script_id}", "public route proof command row is missing")
            continue
        if row.get("command") != expected["command"] or command_is_noop(row.get("command")):
            F.add("USF-PUBLIC-FQDN-015", f"{PUBLIC_ROUTE_PROOF_PATH}#proofCommands.{script_id}.command", "public route proof command is stale or no-op")
        if row.get("packageScript") != script_id:
            F.add("USF-PUBLIC-FQDN-015", f"{PUBLIC_ROUTE_PROOF_PATH}#proofCommands.{script_id}.packageScript", "public route proof package script id is stale")
        if row.get("makeTarget") != expected["makeTarget"]:
            F.add("USF-PUBLIC-FQDN-015", f"{PUBLIC_ROUTE_PROOF_PATH}#proofCommands.{script_id}.makeTarget", "public route proof Make target is stale")
        if scripts.get(script_id) != expected["command"] or command_is_noop(scripts.get(script_id)):
            F.add("USF-PUBLIC-FQDN-015", f"package.json#scripts.{script_id}", "public route proof package script is missing stale or no-op")
        target = expected["makeTarget"]
        command = f"corepack pnpm {script_id}"
        if not re.search(rf"^{re.escape(target)}:\n\t{re.escape(command)}$", makefile, re.MULTILINE):
            F.add("USF-PUBLIC-FQDN-015", f"Makefile#{target}", "public route proof Make target is missing or stale")


def check_public_route_fqdn_evidence(
    F: Findings,
    route_proof: dict[str, Any],
    contract: Any,
) -> None:
    rows = route_proof.get("requiredFqdns")
    if not isinstance(rows, list) or len(rows) != len(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns", "public route FQDN proof rows are incomplete")
        return
    by_environment = {row.get("environment"): row for row in rows if isinstance(row, dict)}
    if set(by_environment) != set(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns", "public route FQDN environments are stale")

    contract_route = "/__proof/public-route"
    expected_content_type = "text/html"
    if isinstance(contract, dict) and isinstance(contract.get("publicRouteBinding"), dict):
        binding = contract["publicRouteBinding"]
        contract_route = binding.get("route", contract_route)
        expected_content_type = binding.get("expectedContentType", expected_content_type)

    for environment, expected_fqdn in EXPECTED_ENVIRONMENTS.items():
        row = by_environment.get(environment)
        if not isinstance(row, dict):
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns.{environment}", "required public route FQDN proof row is missing")
            continue
        if row.get("fqdn") != expected_fqdn:
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns.{environment}.fqdn", "public route proof row FQDN is stale")
        if row.get("proofCommandId") != f"proof:public-route:{environment}":
            F.add("USF-PUBLIC-FQDN-015", f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns.{environment}.proofCommandId", "public route proof command id is stale")
        route = row.get("browserRoute")
        if not isinstance(route, dict):
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns.{environment}.browserRoute", "browser route evidence is missing")
            continue
        expected_values = {
            "attemptedRoute": contract_route,
            "expectedContentType": expected_content_type,
            "lastObservedStatus": 200,
            "finalUrlScheme": "https",
            "finalHostMatched": True,
            "finalHostname": expected_fqdn,
            "canonicalRouteMatched": True,
            "localhostOrPrivateHostObserved": False,
            "httpOnlyDeliveryObserved": False,
            "mixedContentObserved": False,
            "proofMarkerObserved": True,
            "telemetryBootstrapObserved": True,
            "telemetryBootstrapOnlyObserved": True,
            "productUiReadinessClaimObserved": False,
            "browserE2eReadinessClaimObserved": False,
            "caddyRequiredGatewayClaimObserved": False,
        }
        for key, expected in expected_values.items():
            if route.get(key) != expected:
                rule_id = "USF-PUBLIC-FQDN-016" if key in {"productUiReadinessClaimObserved", "browserE2eReadinessClaimObserved", "caddyRequiredGatewayClaimObserved"} else "USF-PUBLIC-FQDN-014"
                F.add(rule_id, f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns.{environment}.browserRoute.{key}", "public route proof evidence is missing unsafe or stale")
        systems = set(route.get("telemetrySystemsObserved", []))
        if not {"faro", "sentry"}.issubset(systems):
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#requiredFqdns.{environment}.browserRoute.telemetrySystemsObserved", "Faro and Sentry telemetry bootstrap evidence is incomplete")


def check_public_route_negative_evidence_and_claims(
    F: Findings,
    route_proof: dict[str, Any],
) -> None:
    negative = route_proof.get("negativeEvidence")
    if not isinstance(negative, dict):
        F.add("USF-PUBLIC-FQDN-016", f"{PUBLIC_ROUTE_PROOF_PATH}#negativeEvidence", "public route negative evidence is missing")
        return
    for key in (
        "localhostAccepted",
        "privateInternalHostAccepted",
        "wrongHostAccepted",
        "httpOnlyAccepted",
        "mixedContentAccepted",
        "missingProofMarkerAccepted",
        "missingTelemetryBootstrapAccepted",
        "caddyRequiredGatewayClaim",
        "productUiReadinessClaim",
        "browserE2eReadinessClaim",
    ):
        if negative.get(key) is not False:
            F.add("USF-PUBLIC-FQDN-016", f"{PUBLIC_ROUTE_PROOF_PATH}#negativeEvidence.{key}", "unsafe public route proof posture is accepted")

    automation = route_proof.get("browserAutomation")
    if not isinstance(automation, dict):
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#browserAutomation", "browser automation evidence is missing")
    else:
        if automation.get("packageName") != "playwright-core" or automation.get("version") != "1.61.1":
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#browserAutomation", "Playwright Core package evidence is missing or stale")
        if automation.get("usedOnlyFromProofBoundary") is not True:
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#browserAutomation.usedOnlyFromProofBoundary", "browser automation boundary is not proof-only")

    telemetry = route_proof.get("telemetryBootstrapBoundary")
    if not isinstance(telemetry, dict):
        F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#telemetryBootstrapBoundary", "telemetry bootstrap boundary is missing")
    else:
        systems = set(telemetry.get("systems", []))
        if not {"faro", "sentry"}.issubset(systems) or telemetry.get("bootstrapOnly") is not True:
            F.add("USF-PUBLIC-FQDN-014", f"{PUBLIC_ROUTE_PROOF_PATH}#telemetryBootstrapBoundary", "telemetry bootstrap boundary is incomplete")
        for key in (
            "liveTelemetryIngestionProven",
            "rawTelemetryPayloadRetentionAllowed",
            "productUiReadinessClaimAllowed",
            "browserE2eReadinessClaimAllowed",
        ):
            if telemetry.get(key) is not False:
                F.add("USF-PUBLIC-FQDN-016", f"{PUBLIC_ROUTE_PROOF_PATH}#telemetryBootstrapBoundary.{key}", "telemetry bootstrap boundary overclaims readiness or retention")

    non_claims = set(route_proof.get("nonClaims", []))
    missing = REQUIRED_EXTERNAL_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-PUBLIC-FQDN-016", f"{PUBLIC_ROUTE_PROOF_PATH}#nonClaims", f"required public route proof non-claims are missing: {sorted(missing)}")


def run_checks(state: dict[str, Any]) -> Findings:
    F = Findings()
    contract = state.get("contract")
    external_proof = state.get("externalProof")
    check_contract_shape(F, contract)
    if isinstance(contract, dict):
        check_environments(F, contract)
        check_semantics(F, contract)
        check_gateway_and_provider(F, contract)
        check_test_boundary(F, contract)
        check_claims_and_wiring(F, contract, state["package"], state["makefile"])
    check_external_proof_shape(F, external_proof)
    if isinstance(external_proof, dict):
        check_external_proof_commands(F, external_proof, state["package"], state["makefile"])
        check_external_blocked_state(F, external_proof)
        check_external_fqdn_evidence(F, external_proof, contract)
        check_external_negative_evidence_and_claims(F, external_proof)
    check_public_proof_origin_service(
        F,
        state.get("originService"),
        contract,
        state.get("composeCatalogue"),
        state["package"],
        state["makefile"],
    )
    public_route_proof = state.get("publicRouteProof")
    check_public_route_proof_shape(F, public_route_proof)
    if isinstance(public_route_proof, dict):
        check_public_route_proof_commands(F, public_route_proof, state["package"], state["makefile"])
        check_public_route_fqdn_evidence(F, public_route_proof, contract)
        check_public_route_negative_evidence_and_claims(F, public_route_proof)
    return F


def run_selftest() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    if not (ROOT / PLANTED_DEFECT_DIR).exists():
        return [
            {
                "severity": "blocking",
                "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                "subject": str(PLANTED_DEFECT_DIR),
                "message": "planted defect directory is missing",
            }
        ]
    canonical_contract = load_optional_json(CONTRACT_PATH)
    declared_coverage = {}
    if isinstance(canonical_contract, dict):
        validator = canonical_contract.get("validator")
        if isinstance(validator, dict) and isinstance(validator.get("plantedDefectCoverage"), dict):
            declared_coverage = validator["plantedDefectCoverage"]
        else:
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": f"{CONTRACT_PATH}#validator.plantedDefectCoverage",
                    "message": "planted defect coverage map is missing",
                }
            )
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in REQUIRED_PLANTED_RULE_IDS}
    fixture_ids: dict[str, str] = {}
    for path in sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json")):
        defect = json.loads(path.read_text(encoding="utf-8"))
        expected = defect.get("expectedRule")
        defect_id = defect.get("id")
        rel_path = str(path.relative_to(ROOT))
        if not is_non_empty_string(defect_id):
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": rel_path,
                    "message": "planted defect id is missing",
                }
            )
        elif defect_id in fixture_ids:
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": rel_path,
                    "message": f"planted defect id duplicates {fixture_ids[defect_id]}",
                }
            )
        else:
            fixture_ids[defect_id] = rel_path
        if expected in REQUIRED_PLANTED_RULE_IDS:
            coverage[expected].append(rel_path)
        elif expected == "USF-PUBLIC-FQDN-SELFTEST":
            pass
        else:
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": rel_path,
                    "message": f"planted defect expectedRule is not a required public FQDN rule: {expected}",
                }
            )
        F = run_checks(load_state(defect))
        if expected not in F.rule_ids():
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": rel_path,
                    "message": f"expected {expected}, got {sorted(F.rule_ids())}",
                }
            )
    for rule_id in sorted(REQUIRED_PLANTED_RULE_IDS):
        paths = coverage.get(rule_id, [])
        if not paths:
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": str(PLANTED_DEFECT_DIR),
                    "message": f"required rule has no distinct planted defect fixture: {rule_id}",
                }
            )
    for rule_id in sorted(REQUIRED_CONTRACT_RULE_IDS):
        declared_paths = declared_coverage.get(rule_id)
        if not isinstance(declared_paths, list) or not declared_paths:
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": f"{CONTRACT_PATH}#validator.plantedDefectCoverage.{rule_id}",
                    "message": "coverage map has no fixture list for required rule",
                }
            )
            continue
        actual = set(coverage.get(rule_id, []))
        declared = {path for path in declared_paths if isinstance(path, str)}
        if not declared <= actual:
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
                    "subject": f"{CONTRACT_PATH}#validator.plantedDefectCoverage.{rule_id}",
                    "message": "coverage map claims fixtures that do not uniquely expect the required rule",
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
