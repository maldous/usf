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
TAG_GATE_PATH = Path("docs/architecture/public-fqdn-proof-baseline-tag-gate.json")
EXTERNAL_HTTP_BEHAVIOUR_PATH = Path("docs/architecture/external-http-behaviour-contract.json")
EXTERNAL_HTTP_CACHE_PATH = Path("docs/architecture/external-http-cache-provider-proof-gate.json")
EXTERNAL_HTTP_OBSERVABILITY_PATH = Path(
    "docs/architecture/external-http-observability-evidence-gate.json"
)
PRE_STAGING_SMOKE_PATH = Path("docs/architecture/pre-staging-external-smoke-proof-gate.json")
PRE_STAGING_GATE_PATH = Path(
    "docs/architecture/pre-staging-external-http-semantics-readiness-gate.json"
)
SELF_HOSTED_ORIGIN_PATH = Path(
    "docs/architecture/self-hosted-public-proof-origin-service.json"
)
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
    "USF-PUBLIC-FQDN-017": ("blocking", "public FQDN proof-baseline tag gate is missing unsafe or overclaimed"),
    "USF-PUBLIC-FQDN-018": ("blocking", "external HTTP behaviour semantic contract is missing incomplete or unsafe"),
    "USF-PUBLIC-FQDN-019": ("blocking", "external HTTP behaviour proof command wiring is missing stale or no-op"),
    "USF-PUBLIC-FQDN-020": ("blocking", "external HTTP cache and upstream provider proof evidence is missing incomplete or unsafe"),
    "USF-PUBLIC-FQDN-021": ("blocking", "external HTTP cache proof command wiring is missing stale or no-op"),
    "USF-PUBLIC-FQDN-022": ("blocking", "external HTTP observability evidence is missing incomplete or unsafe"),
    "USF-PUBLIC-FQDN-023": ("blocking", "external HTTP observability proof command wiring is missing stale or no-op"),
    "USF-PUBLIC-FQDN-024": ("blocking", "pre-staging external smoke gate is missing destructive or overclaimed"),
    "USF-PUBLIC-FQDN-025": ("blocking", "pre-staging external smoke proof command wiring is missing stale or no-op"),
    "USF-PUBLIC-FQDN-026": ("blocking", "self-hosted public proof origin cutover evidence is missing incomplete or unsafe"),
    "USF-PUBLIC-FQDN-027": ("blocking", "enterprise origin-server semantics evidence is missing incomplete or overclaimed"),
    "USF-PUBLIC-FQDN-SELFTEST": ("blocking", "planted public FQDN defect did not raise its expected rule"),
}

REQUIRED_CONTRACT_RULE_IDS = set(RULES) - {"USF-PUBLIC-FQDN-SELFTEST"}
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
    "full-product-readiness",
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
    "full-product-readiness",
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
EXPECTED_EXTERNAL_HTTP_BEHAVIOUR_COMMAND = {
    "id": "proof:external-http-behaviour",
    "command": "tsx packages/proof/src/external-http-behaviour-proof.ts",
    "makeTarget": "external-http-behaviour-proof",
}
EXPECTED_EXTERNAL_HTTP_CACHE_COMMAND = {
    "id": "proof:external-http-cache",
    "command": "tsx packages/proof/src/external-http-cache-proof.ts",
    "makeTarget": "external-http-cache-proof",
}
EXPECTED_EXTERNAL_HTTP_OBSERVABILITY_COMMAND = {
    "id": "proof:external-http-observability",
    "command": "tsx packages/proof/src/external-http-observability-proof.ts",
    "makeTarget": "external-http-observability-proof",
}
EXPECTED_PRE_STAGING_SMOKE_COMMAND = {
    "id": "proof:pre-staging-external-smoke",
    "command": "tsx packages/proof/src/pre-staging-external-smoke-proof.ts",
    "makeTarget": "pre-staging-external-smoke-proof",
}
EXPECTED_PRE_STAGING_PREREQUISITES = {
    "USF-261",
    "USF-262",
    "USF-263",
    "USF-264",
    "USF-265",
    "USF-266",
    "USF-268",
    "USF-269",
    "USF-270",
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
        "tagGate": load_optional_json(TAG_GATE_PATH),
        "externalHttpBehaviour": load_optional_json(EXTERNAL_HTTP_BEHAVIOUR_PATH),
        "externalHttpCache": load_optional_json(EXTERNAL_HTTP_CACHE_PATH),
        "externalHttpObservability": load_optional_json(EXTERNAL_HTTP_OBSERVABILITY_PATH),
        "preStagingSmoke": load_optional_json(PRE_STAGING_SMOKE_PATH),
        "preStagingGate": load_optional_json(PRE_STAGING_GATE_PATH),
        "selfHostedOrigin": load_optional_json(SELF_HOSTED_ORIGIN_PATH),
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
    tag_gate = mutated.get("tagGate")
    if defect.get("dropTagGate"):
        mutated["tagGate"] = None
        tag_gate = None
    if isinstance(tag_gate, dict):
        if "setTagGateCommand" in defect:
            tag_gate.setdefault("tag", {})["command"] = defect["setTagGateCommand"]
        if "setTagGateName" in defect:
            tag_gate.setdefault("tag", {})["name"] = defect["setTagGateName"]
        if "setTagGateReadinessClaim" in defect:
            patch = defect["setTagGateReadinessClaim"]
            tag_gate.setdefault("claims", {})[patch["field"]] = patch["value"]
        if "removeTagGateNonClaim" in defect:
            tag_gate["nonClaims"] = [
                claim
                for claim in tag_gate.get("nonClaims", [])
                if claim != defect["removeTagGateNonClaim"]
            ]
    behaviour = mutated.get("externalHttpBehaviour")
    if defect.get("dropExternalHttpBehaviour"):
        mutated["externalHttpBehaviour"] = None
        behaviour = None
    if isinstance(behaviour, dict):
        if "removeExternalHttpBehaviourSection" in defect:
            behaviour.pop(defect["removeExternalHttpBehaviourSection"], None)
        if "setExternalHttpRequiredProvider" in defect:
            behaviour.setdefault("gatewayNeutrality", {})["requiredProvider"] = defect[
                "setExternalHttpRequiredProvider"
            ]
        if "setExternalHttpRequiredGateway" in defect:
            behaviour.setdefault("gatewayNeutrality", {})["requiredGateway"] = defect[
                "setExternalHttpRequiredGateway"
            ]
        if "setExternalHttpReadinessClaim" in defect:
            patch = defect["setExternalHttpReadinessClaim"]
            behaviour.setdefault("claims", {})[patch["field"]] = patch["value"]
        if "removeExternalHttpNonClaim" in defect:
            behaviour["nonClaims"] = [
                claim
                for claim in behaviour.get("nonClaims", [])
                if claim != defect["removeExternalHttpNonClaim"]
            ]
        if "setExternalHttpProofCommand" in defect:
            behaviour.setdefault("proofCommand", {})["command"] = defect[
                "setExternalHttpProofCommand"
            ]
    cache = mutated.get("externalHttpCache")
    if defect.get("dropExternalHttpCache"):
        mutated["externalHttpCache"] = None
        cache = None
    if isinstance(cache, dict):
        if "setExternalHttpCacheStatus" in defect:
            cache["status"] = defect["setExternalHttpCacheStatus"]
        if "setCacheRoutePolicy" in defect:
            patch = defect["setCacheRoutePolicy"]
            for row in cache.get("routeClassEvidence", []):
                if row.get("routeClass") == patch.get("routeClass"):
                    row.setdefault("cachePolicy", {})[patch["field"]] = patch["value"]
        if "setCacheProviderHeaderAuthority" in defect:
            cache.setdefault("providerHeaderBoundary", {})["providerHeadersAreSemanticAuthority"] = defect[
                "setCacheProviderHeaderAuthority"
            ]
        if "setCacheRequiredProvider" in defect:
            cache.setdefault("providerHeaderBoundary", {})["requiredProvider"] = defect[
                "setCacheRequiredProvider"
            ]
        if "removeCacheNonClaim" in defect:
            cache["nonClaims"] = [
                claim for claim in cache.get("nonClaims", []) if claim != defect["removeCacheNonClaim"]
            ]
        if "setCacheProofCommand" in defect:
            cache.setdefault("proofCommand", {})["command"] = defect["setCacheProofCommand"]
    observability = mutated.get("externalHttpObservability")
    if defect.get("dropExternalHttpObservability"):
        mutated["externalHttpObservability"] = None
        observability = None
    if isinstance(observability, dict):
        if "setObservabilityCorrelationRequired" in defect:
            observability.setdefault("correlation", {})["correlationIdRequired"] = defect[
                "setObservabilityCorrelationRequired"
            ]
        if "setObservabilityTraceBoundary" in defect:
            observability.setdefault("tracing", {})["traceContextBoundaryDefined"] = defect[
                "setObservabilityTraceBoundary"
            ]
        if "setObservabilityUnsafePayloadRetention" in defect:
            observability.setdefault("redactionAndRetention", {})["rawPayloadRetentionAllowed"] = defect[
                "setObservabilityUnsafePayloadRetention"
            ]
        if "setObservabilityRequiredProvider" in defect:
            observability.setdefault("providerBoundary", {})["requiredProvider"] = defect[
                "setObservabilityRequiredProvider"
            ]
        if "removeObservabilityNonClaim" in defect:
            observability["nonClaims"] = [
                claim
                for claim in observability.get("nonClaims", [])
                if claim != defect["removeObservabilityNonClaim"]
            ]
        if "setObservabilityProofCommand" in defect:
            observability.setdefault("proofCommand", {})["command"] = defect[
                "setObservabilityProofCommand"
            ]
    smoke = mutated.get("preStagingSmoke")
    if defect.get("dropPreStagingSmoke"):
        mutated["preStagingSmoke"] = None
        smoke = None
    if isinstance(smoke, dict):
        for issue_id in defect.get("dropPreStagingPrerequisiteIds", []):
            smoke["prerequisites"] = [
                row for row in smoke.get("prerequisites", []) if row.get("issueId") != issue_id
            ]
        if "setPreStagingPrerequisiteStatus" in defect:
            patch = defect["setPreStagingPrerequisiteStatus"]
            for row in smoke.get("prerequisites", []):
                if row.get("issueId") == patch.get("issueId"):
                    row["status"] = patch.get("status")
        if "setPreStagingDestructiveCheck" in defect:
            smoke.setdefault("nonDestructiveBoundary", {})["destructiveChecksAllowed"] = defect[
                "setPreStagingDestructiveCheck"
            ]
        if "setPreStagingPersistentMutation" in defect:
            smoke.setdefault("nonDestructiveBoundary", {})["persistentDataMutationAllowed"] = defect[
                "setPreStagingPersistentMutation"
            ]
        if "setPreStagingReadinessClaim" in defect:
            patch = defect["setPreStagingReadinessClaim"]
            smoke.setdefault("claims", {})[patch["field"]] = patch["value"]
        if "removePreStagingNonClaim" in defect:
            smoke["nonClaims"] = [
                claim for claim in smoke.get("nonClaims", []) if claim != defect["removePreStagingNonClaim"]
            ]
        if "setPreStagingSmokeCommand" in defect:
            smoke.setdefault("proofCommand", {})["command"] = defect["setPreStagingSmokeCommand"]
    gate = mutated.get("preStagingGate")
    if defect.get("dropPreStagingGate"):
        mutated["preStagingGate"] = None
        gate = None
    if isinstance(gate, dict):
        if "setPreStagingGateMayBegin" in defect:
            gate["stagingSpecificEnablementMayBegin"] = defect["setPreStagingGateMayBegin"]
        if "removePreStagingGateNonClaim" in defect:
            gate["nonClaims"] = [
                claim for claim in gate.get("nonClaims", []) if claim != defect["removePreStagingGateNonClaim"]
            ]
    self_hosted = mutated.get("selfHostedOrigin")
    if defect.get("dropSelfHostedOrigin"):
        mutated["selfHostedOrigin"] = None
        self_hosted = None
    if isinstance(self_hosted, dict):
        if "setSelfHostedStatus" in defect:
            self_hosted["status"] = defect["setSelfHostedStatus"]
        if "setSelfHostedNetlifyLivePath" in defect:
            self_hosted.setdefault("dnsCutover", {})["netlifyLiveServingCurrentlyObserved"] = defect[
                "setSelfHostedNetlifyLivePath"
            ]
        if "setSelfHostedCloudflareProxyObserved" in defect:
            self_hosted.setdefault("dnsCutover", {})["cloudflareProxyCurrentlyObserved"] = defect[
                "setSelfHostedCloudflareProxyObserved"
            ]
        if "setSelfHostedCloudflareProxyAllowed" in defect:
            self_hosted.setdefault("dnsCutover", {})["cloudflareProxyAllowedForProofRoutes"] = defect[
                "setSelfHostedCloudflareProxyAllowed"
            ]
        if "setSelfHostedCutoverComplete" in defect:
            self_hosted.setdefault("dnsCutover", {})["cutoverComplete"] = defect[
                "setSelfHostedCutoverComplete"
            ]
        if "setSelfHostedNoStore" in defect:
            self_hosted.setdefault("headerSemantics", {})["noStoreRequired"] = defect[
                "setSelfHostedNoStore"
            ]
        if "setSelfHostedUnsupportedMethodSafe" in defect:
            self_hosted.setdefault("routeSemantics", {})["unsupportedMethodsFailSafely"] = defect[
                "setSelfHostedUnsupportedMethodSafe"
            ]
        if "removeSelfHostedOriginOwnership" in defect:
            self_hosted.setdefault("enterpriseOriginSemantics", {}).pop("assetOwnership", None)
        if "removeSelfHostedEnterpriseSection" in defect:
            self_hosted.setdefault("enterpriseOriginSemantics", {}).pop(
                defect["removeSelfHostedEnterpriseSection"], None
            )
        if "setSelfHostedRequiredProvider" in defect:
            self_hosted.setdefault("providerIndependence", {})["requiredProvider"] = defect[
                "setSelfHostedRequiredProvider"
            ]
        if "setSelfHostedRequiredGateway" in defect:
            self_hosted.setdefault("providerIndependence", {})["requiredGateway"] = defect[
                "setSelfHostedRequiredGateway"
            ]
        if "setSelfHostedReadinessClaim" in defect:
            patch = defect["setSelfHostedReadinessClaim"]
            self_hosted.setdefault("claims", {})[patch["field"]] = patch["value"]
        if "removeSelfHostedNonClaim" in defect:
            self_hosted["nonClaims"] = [
                claim
                for claim in self_hosted.get("nonClaims", [])
                if claim != defect["removeSelfHostedNonClaim"]
            ]
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


def check_public_fqdn_tag_gate(F: Findings, tag_gate: Any) -> None:
    if not isinstance(tag_gate, dict):
        F.add("USF-PUBLIC-FQDN-017", str(TAG_GATE_PATH), "public FQDN proof-baseline tag gate evidence is missing")
        return

    if tag_gate.get("sourceIssue") != "USF-265" or tag_gate.get("parentIssue") != "USF-261":
        F.add("USF-PUBLIC-FQDN-017", str(TAG_GATE_PATH), "tag gate issue linkage is stale")

    tag = tag_gate.get("tag")
    if not isinstance(tag, dict):
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#tag", "tag gate tag metadata is missing")
        return
    if tag.get("name") != "v2-proof" or tag.get("type") != "annotated":
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#tag", "tag gate must authorize only the exact annotated v2-proof tag")
    if tag.get("authorityException") != "docs/architecture/git-practices-standard.md#9.6.2":
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#tag.authorityException", "tag gate authority exception linkage is stale")
    command = tag.get("command")
    if not is_non_empty_string(command) or command_is_noop(command):
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#tag.command", "tag command is missing or no-op")
    elif "git tag -a v2-proof" not in command:
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#tag.command", "tag command does not create the exact annotated v2-proof tag")
    if tag.get("remoteRef") != "refs/tags/v2-proof":
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#tag.remoteRef", "tag remote ref is stale")
    if tag.get("recordFinalTagEvidenceInLinear") is not True:
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#tag.recordFinalTagEvidenceInLinear", "final tag evidence recording boundary is missing")

    prerequisites = tag_gate.get("prerequisites")
    expected_prerequisites = {"USF-226", "USF-234", "USF-262", "USF-263", "USF-264", "USF-266"}
    if not isinstance(prerequisites, list):
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#prerequisites", "tag prerequisites are missing")
    else:
        by_issue = {row.get("issueId"): row for row in prerequisites if isinstance(row, dict)}
        if set(by_issue) != expected_prerequisites:
            F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#prerequisites", "tag prerequisites are incomplete or stale")
        for issue_id in sorted(expected_prerequisites):
            row = by_issue.get(issue_id)
            if not isinstance(row, dict) or row.get("status") != "done":
                F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#prerequisites.{issue_id}", "tag prerequisite is not recorded as done")

    validation_suite = tag_gate.get("finalValidationSuite")
    required_commands = {
        "corepack pnpm proof:public-origin",
        "corepack pnpm proof:public-fqdn",
        "corepack pnpm proof:public-route",
        "corepack pnpm public-fqdn:validate",
        "corepack pnpm public-fqdn:selftest",
        "corepack pnpm test-readiness",
        "corepack pnpm test-readiness:selftest",
        "corepack pnpm verify",
        "corepack pnpm parity",
        "python3 tools/validate-public-fqdn/validate-public-fqdn.py all --json",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
        "python3 tools/validate-spec/validate-spec.py all --json",
        "git diff --check",
        "git status --short",
    }
    if not isinstance(validation_suite, list):
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#finalValidationSuite", "final validation suite is missing")
    else:
        commands = {row for row in validation_suite if isinstance(row, str)}
        missing = required_commands - commands
        if missing:
            F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#finalValidationSuite", f"final validation suite is missing commands: {sorted(missing)}")
        if any(command_is_noop(row) for row in commands):
            F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#finalValidationSuite", "final validation suite contains a no-op command")

    open_checks = tag_gate.get("openWorkChecks")
    if not isinstance(open_checks, dict):
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#openWorkChecks", "open work checks are missing")
    else:
        for key in ("githubOpenPullRequestSearchRequired", "linearReadinessSearchRequired"):
            if open_checks.get(key) is not True:
                F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#openWorkChecks.{key}", "required open-work search is not enforced")
        if open_checks.get("usf39MutationAllowed") is not False:
            F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#openWorkChecks.usf39MutationAllowed", "USF-39 mutation boundary is unsafe")

    evidence_sources = set(tag_gate.get("evidenceSources", []))
    required_sources = {
        str(CONTRACT_PATH),
        str(EXTERNAL_PROOF_PATH),
        str(ORIGIN_SERVICE_PATH),
        str(PUBLIC_ROUTE_PROOF_PATH),
        "tools/validate-public-fqdn/validate-public-fqdn.py",
    }
    if not required_sources <= evidence_sources:
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#evidenceSources", "tag gate evidence sources are incomplete")

    claims = tag_gate.get("claims")
    if not isinstance(claims, dict):
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#claims", "tag gate claims map is missing")
    else:
        for key in (
            "stagingReadinessClaim",
            "productionReadinessClaim",
            "deploymentReadinessClaim",
            "liveProviderReadinessClaim",
            "socReadinessClaim",
            "isoCertificationClaim",
            "enterpriseProductionReadinessClaim",
            "productUiReadinessClaim",
            "browserE2eReadinessClaim",
            "fullProductReadinessClaim",
        ):
            if claims.get(key) is not False:
                F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#claims.{key}", "tag gate overclaims readiness")

    non_claims = set(tag_gate.get("nonClaims", []))
    required_non_claims = REQUIRED_NON_CLAIMS - {"caddy-required-gateway"} | {
        "no-caddy-semantic-requirement",
    }
    missing = required_non_claims - non_claims
    if missing:
        F.add("USF-PUBLIC-FQDN-017", f"{TAG_GATE_PATH}#nonClaims", f"tag gate non-claims are missing: {sorted(missing)}")


def check_single_proof_command(
    F: Findings,
    rule_id: str,
    evidence_path: Path,
    evidence: dict[str, Any],
    package: dict[str, Any],
    makefile: str,
    expected: dict[str, str],
) -> None:
    command_row = evidence.get("proofCommand")
    if not isinstance(command_row, dict):
        F.add(rule_id, f"{evidence_path}#proofCommand", "proof command metadata is missing")
        return
    script_id = expected["id"]
    expected_command = expected["command"]
    expected_target = expected["makeTarget"]
    if command_row.get("id") != script_id:
        F.add(rule_id, f"{evidence_path}#proofCommand.id", "proof command id is stale")
    if command_row.get("command") != expected_command or command_is_noop(command_row.get("command")):
        F.add(rule_id, f"{evidence_path}#proofCommand.command", "proof command is missing stale or no-op")
    if command_row.get("packageScript") != script_id:
        F.add(rule_id, f"{evidence_path}#proofCommand.packageScript", "proof package script is stale")
    if command_row.get("makeTarget") != expected_target:
        F.add(rule_id, f"{evidence_path}#proofCommand.makeTarget", "proof Make target is stale")
    scripts = package.get("scripts", {})
    if scripts.get(script_id) != expected_command or command_is_noop(scripts.get(script_id)):
        F.add(rule_id, f"package.json#scripts.{script_id}", "proof package script is missing stale or no-op")
    if not re.search(
        rf"^{re.escape(expected_target)}:\n\tcorepack pnpm {re.escape(script_id)}$",
        makefile,
        re.MULTILINE,
    ):
        F.add(rule_id, f"Makefile#{expected_target}", "proof Make target is missing or stale")


def check_false_claims(F: Findings, rule_id: str, path: Path, evidence: dict[str, Any]) -> None:
    claims = evidence.get("claims", {})
    if not isinstance(claims, dict):
        F.add(rule_id, f"{path}#claims", "claims map is missing")
        return
    for key in (
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "deploymentReadinessClaim",
        "liveProviderReadinessClaim",
        "socReadinessClaim",
        "isoCertificationClaim",
        "enterpriseProductionReadinessClaim",
        "productUiReadinessClaim",
        "browserE2eReadinessClaim",
        "fullProductReadinessClaim",
    ):
        if claims.get(key) is not False:
            F.add(rule_id, f"{path}#claims.{key}", "external HTTP evidence overclaims readiness")


def check_external_http_non_claims(F: Findings, rule_id: str, path: Path, evidence: dict[str, Any]) -> None:
    non_claims = set(evidence.get("nonClaims", []))
    missing = REQUIRED_EXTERNAL_NON_CLAIMS - non_claims
    if missing:
        F.add(rule_id, f"{path}#nonClaims", f"required non-claims are missing: {sorted(missing)}")


def check_external_http_behaviour_contract(
    F: Findings,
    behaviour: Any,
    package: dict[str, Any],
    makefile: str,
) -> None:
    if not isinstance(behaviour, dict):
        F.add("USF-PUBLIC-FQDN-018", str(EXTERNAL_HTTP_BEHAVIOUR_PATH), "external HTTP behaviour contract is missing")
        return
    if behaviour.get("issueId") != "USF-268" or behaviour.get("parentIssueId") != "USF-267":
        F.add("USF-PUBLIC-FQDN-018", str(EXTERNAL_HTTP_BEHAVIOUR_PATH), "issue linkage is stale")
    if behaviour.get("publicFqdnContract") != str(CONTRACT_PATH):
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#publicFqdnContract", "public FQDN contract linkage is stale")
    if behaviour.get("status") != "defined":
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#status", "contract must be defined before downstream proof")

    required_sections = {
        "canonicalHostSemantics",
        "redirectSemantics",
        "httpsSemantics",
        "methodSemantics",
        "statusSemantics",
        "contentTypeSemantics",
        "cacheControlSemantics",
        "securityHeaderSemantics",
        "corsOptionsSemantics",
        "compressionBoundary",
        "sizeBoundary",
        "providerHeaderTreatment",
        "gatewayNeutrality",
        "testEnvironmentBoundary",
        "proofCommand",
        "claims",
        "nonClaims",
    }
    for section in sorted(required_sections):
        if section not in behaviour:
            F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#{section}", "required semantic section is missing")

    canonical = behaviour.get("canonicalHostSemantics", {})
    if not isinstance(canonical, dict) or canonical.get("requiredFqdns") != list(EXPECTED_ENVIRONMENTS.values()):
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#canonicalHostSemantics", "canonical host semantics are incomplete")
    redirect = behaviour.get("redirectSemantics", {})
    if not isinstance(redirect, dict) or redirect.get("crossHostRedirectAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#redirectSemantics", "unsafe redirect semantics are allowed")
    https = behaviour.get("httpsSemantics", {})
    if not isinstance(https, dict) or https.get("httpsRequiredForProofRoutes") is not True:
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#httpsSemantics", "HTTPS-only proof route semantics are missing")
    methods = behaviour.get("methodSemantics", {})
    if not isinstance(methods, dict):
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#methodSemantics", "method semantics are missing")
        methods = {}
    if methods.get("jsonProofRequiredMethods") != ["GET", "HEAD"]:
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#methodSemantics.jsonProofRequiredMethods", "GET and HEAD semantics are not explicit")
    if methods.get("unsupportedMethodsMustMutate") is not False:
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#methodSemantics.unsupportedMethodsMustMutate", "unsupported methods may mutate")
    security = behaviour.get("securityHeaderSemantics", {})
    if not isinstance(security, dict) or not security.get("minimumExpectedHeaders"):
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#securityHeaderSemantics", "security header semantics are missing")
    provider_headers = behaviour.get("providerHeaderTreatment", {})
    if not isinstance(provider_headers, dict) or provider_headers.get("providerHeadersAreSemanticAuthority") is not False:
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#providerHeaderTreatment", "provider headers are treated as semantic authority")
    gateway = behaviour.get("gatewayNeutrality", {})
    if not isinstance(gateway, dict) or gateway.get("requiredGateway") != "none" or gateway.get("requiredProvider") != "none":
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#gatewayNeutrality", "external HTTP semantics require a provider or gateway")
    boundary = behaviour.get("testEnvironmentBoundary", {})
    if not isinstance(boundary, dict) or boundary.get("testEnvironmentPublicInternetDependencyAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-018", f"{EXTERNAL_HTTP_BEHAVIOUR_PATH}#testEnvironmentBoundary", "Test environment public internet dependency is allowed")
    check_false_claims(F, "USF-PUBLIC-FQDN-018", EXTERNAL_HTTP_BEHAVIOUR_PATH, behaviour)
    check_external_http_non_claims(F, "USF-PUBLIC-FQDN-018", EXTERNAL_HTTP_BEHAVIOUR_PATH, behaviour)
    check_single_proof_command(
        F,
        "USF-PUBLIC-FQDN-019",
        EXTERNAL_HTTP_BEHAVIOUR_PATH,
        behaviour,
        package,
        makefile,
        EXPECTED_EXTERNAL_HTTP_BEHAVIOUR_COMMAND,
    )


def check_external_http_cache_gate(
    F: Findings,
    cache: Any,
    package: dict[str, Any],
    makefile: str,
) -> None:
    if not isinstance(cache, dict):
        F.add("USF-PUBLIC-FQDN-020", str(EXTERNAL_HTTP_CACHE_PATH), "external HTTP cache proof evidence is missing")
        return
    if cache.get("issueId") != "USF-269" or cache.get("parentIssueId") != "USF-267":
        F.add("USF-PUBLIC-FQDN-020", str(EXTERNAL_HTTP_CACHE_PATH), "issue linkage is stale")
    status = cache.get("status")
    if status not in {"pass", "bounded", "blocked"}:
        F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#status", "cache proof status must be pass bounded or blocked")
    if status == "blocked":
        blockers = cache.get("blockers")
        if not isinstance(blockers, list) or not blockers:
            F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#blockers", "blocked cache proof lacks explicit blocker evidence")
        else:
            for blocker in blockers:
                if not isinstance(blocker, dict):
                    F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#blockers", "blocked cache proof blocker is invalid")
                    continue
                if blocker.get("issueId") != "USF-269" or blocker.get("blocksStagingSpecificEnablement") is not True:
                    F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#blockers", "blocked cache proof blocker lacks issue linkage or staging gate impact")
                if not is_non_empty_string(blocker.get("requiredOperatorAction")):
                    F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#blockers", "blocked cache proof blocker lacks operator action")
    rows = cache.get("routeClassEvidence")
    required_route_classes = {
        "json-proof-endpoint",
        "browser-proof-route",
        "future-static-route",
        "future-api-like-route",
        "future-app-route",
    }
    if not isinstance(rows, list):
        F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#routeClassEvidence", "route class cache evidence is missing")
        rows = []
    by_class = {row.get("routeClass"): row for row in rows if isinstance(row, dict)}
    if set(by_class) != required_route_classes:
        F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#routeClassEvidence", "route class cache inventory is incomplete")
    for route_class in ("json-proof-endpoint", "browser-proof-route"):
        row = by_class.get(route_class, {})
        policy = row.get("cachePolicy") if isinstance(row, dict) else None
        if not isinstance(policy, dict):
            F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#routeClassEvidence.{route_class}", "proof route cache policy is missing")
            continue
        if policy.get("cacheable") is not False or policy.get("cacheControl") != "no-store":
            F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#routeClassEvidence.{route_class}.cachePolicy", "proof/control routes must not be cacheable")
        provider_cache_conflict = (
            policy.get("providerCacheHitObserved") is True
            or policy.get("cacheabilityEvidenceConflict") is True
            or policy.get("ageSecondsObserved") == "non-zero"
        )
        if status != "blocked" and provider_cache_conflict:
            F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#routeClassEvidence.{route_class}.cachePolicy", "provider cache evidence conflict is hidden by non-blocked status")
        age_observed = policy.get("ageObserved") is True or policy.get("ageSecondsObserved") == "low-non-zero"
        if status != "blocked" and age_observed:
            cache_status_evidence = str(policy.get("cacheStatusEvidence", "")).lower()
            has_forwarded_evidence = any(
                marker in cache_status_evidence
                for marker in ("miss", "bypass", "dynamic")
            )
            if (
                policy.get("ageEvidenceClassification") != "dynamic-provider-age-metadata"
                or policy.get("providerAgeAcceptedAsDynamicMetadata") is not True
                or policy.get("providerCacheStaleObserved") is not False
                or not has_forwarded_evidence
                or not is_non_empty_string(policy.get("ageMetadataAcceptanceBoundary"))
            ):
                F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#routeClassEvidence.{route_class}.cachePolicy", "provider Age evidence is not safely classified")
    provider = cache.get("providerHeaderBoundary", {})
    if not isinstance(provider, dict) or provider.get("providerHeadersAreSemanticAuthority") is not False:
        F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#providerHeaderBoundary", "provider headers are treated as semantic authority")
    if provider.get("requiredProvider") != "none":
        F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#providerHeaderBoundary.requiredProvider", "cache proof requires a provider")
    freshness = cache.get("freshnessAndInvalidationBoundary", {})
    if not isinstance(freshness, dict) or not is_non_empty_string(freshness.get("purgeBoundary")):
        F.add("USF-PUBLIC-FQDN-020", f"{EXTERNAL_HTTP_CACHE_PATH}#freshnessAndInvalidationBoundary", "purge/bypass/invalidation boundary is missing")
    check_false_claims(F, "USF-PUBLIC-FQDN-020", EXTERNAL_HTTP_CACHE_PATH, cache)
    check_external_http_non_claims(F, "USF-PUBLIC-FQDN-020", EXTERNAL_HTTP_CACHE_PATH, cache)
    check_single_proof_command(
        F,
        "USF-PUBLIC-FQDN-021",
        EXTERNAL_HTTP_CACHE_PATH,
        cache,
        package,
        makefile,
        EXPECTED_EXTERNAL_HTTP_CACHE_COMMAND,
    )


def check_external_http_observability_gate(
    F: Findings,
    observability: Any,
    package: dict[str, Any],
    makefile: str,
) -> None:
    if not isinstance(observability, dict):
        F.add("USF-PUBLIC-FQDN-022", str(EXTERNAL_HTTP_OBSERVABILITY_PATH), "external HTTP observability evidence is missing")
        return
    if observability.get("issueId") != "USF-270" or observability.get("parentIssueId") != "USF-267":
        F.add("USF-PUBLIC-FQDN-022", str(EXTERNAL_HTTP_OBSERVABILITY_PATH), "issue linkage is stale")
    if observability.get("status") not in {"pass", "bounded"}:
        F.add("USF-PUBLIC-FQDN-022", f"{EXTERNAL_HTTP_OBSERVABILITY_PATH}#status", "observability evidence status must be pass or bounded")
    correlation = observability.get("correlation", {})
    if not isinstance(correlation, dict) or correlation.get("correlationIdRequired") is not True:
        F.add("USF-PUBLIC-FQDN-022", f"{EXTERNAL_HTTP_OBSERVABILITY_PATH}#correlation", "correlation id evidence boundary is missing")
    tracing = observability.get("tracing", {})
    if not isinstance(tracing, dict) or tracing.get("traceContextBoundaryDefined") is not True:
        F.add("USF-PUBLIC-FQDN-022", f"{EXTERNAL_HTTP_OBSERVABILITY_PATH}#tracing", "trace boundary is missing")
    logging = observability.get("loggingAndEvents", {})
    if not isinstance(logging, dict) or logging.get("applicationEventMarkerRequired") is not True:
        F.add("USF-PUBLIC-FQDN-022", f"{EXTERNAL_HTTP_OBSERVABILITY_PATH}#loggingAndEvents", "event/log marker boundary is missing")
    metrics = observability.get("metrics", {})
    if not isinstance(metrics, dict) or metrics.get("statusClassMetricRequired") is not True:
        F.add("USF-PUBLIC-FQDN-022", f"{EXTERNAL_HTTP_OBSERVABILITY_PATH}#metrics", "metrics boundary is missing")
    redaction = observability.get("redactionAndRetention", {})
    if not isinstance(redaction, dict) or redaction.get("rawPayloadRetentionAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-022", f"{EXTERNAL_HTTP_OBSERVABILITY_PATH}#redactionAndRetention", "unsafe payload retention is allowed")
    provider = observability.get("providerBoundary", {})
    if not isinstance(provider, dict) or provider.get("requiredProvider") != "none":
        F.add("USF-PUBLIC-FQDN-022", f"{EXTERNAL_HTTP_OBSERVABILITY_PATH}#providerBoundary", "observability evidence requires a provider")
    check_false_claims(F, "USF-PUBLIC-FQDN-022", EXTERNAL_HTTP_OBSERVABILITY_PATH, observability)
    check_external_http_non_claims(F, "USF-PUBLIC-FQDN-022", EXTERNAL_HTTP_OBSERVABILITY_PATH, observability)
    check_single_proof_command(
        F,
        "USF-PUBLIC-FQDN-023",
        EXTERNAL_HTTP_OBSERVABILITY_PATH,
        observability,
        package,
        makefile,
        EXPECTED_EXTERNAL_HTTP_OBSERVABILITY_COMMAND,
    )


def check_pre_staging_smoke_gate(
    F: Findings,
    smoke: Any,
    package: dict[str, Any],
    makefile: str,
) -> None:
    if not isinstance(smoke, dict):
        F.add("USF-PUBLIC-FQDN-024", str(PRE_STAGING_SMOKE_PATH), "pre-staging external smoke gate is missing")
        return
    if smoke.get("issueId") != "USF-271" or smoke.get("parentIssueId") != "USF-267":
        F.add("USF-PUBLIC-FQDN-024", str(PRE_STAGING_SMOKE_PATH), "issue linkage is stale")
    if smoke.get("status") not in {"pass", "blocked"}:
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#status", "pre-staging smoke status must be pass or blocked")
    prerequisites = smoke.get("prerequisites")
    if not isinstance(prerequisites, list):
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#prerequisites", "pre-staging prerequisites are missing")
        prerequisites = []
    by_issue = {row.get("issueId"): row for row in prerequisites if isinstance(row, dict)}
    missing = EXPECTED_PRE_STAGING_PREREQUISITES - set(by_issue)
    if missing:
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#prerequisites", f"pre-staging prerequisites are missing: {sorted(missing)}")
    if smoke.get("status") == "pass":
        for issue_id in sorted(EXPECTED_PRE_STAGING_PREREQUISITES):
            if by_issue.get(issue_id, {}).get("status") != "done":
                F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#prerequisites.{issue_id}", "passing smoke has incomplete prerequisite")
    else:
        if smoke.get("blocksStagingSpecificEnablement") is not True:
            F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#blocksStagingSpecificEnablement", "blocked smoke must block staging-specific enablement")
        blockers = smoke.get("blockers")
        if not isinstance(blockers, list) or not blockers:
            F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#blockers", "blocked smoke must record exact blockers")
    boundary = smoke.get("nonDestructiveBoundary", {})
    if not isinstance(boundary, dict):
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#nonDestructiveBoundary", "non-destructive boundary is missing")
        boundary = {}
    for key in ("destructiveChecksAllowed", "persistentDataMutationAllowed", "realTenantDataRequired", "realSecretsRequired"):
        if boundary.get(key) is not False:
            F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#nonDestructiveBoundary.{key}", "unsafe smoke boundary is allowed")
    safe_methods = set(boundary.get("allowedMethods", []))
    if not safe_methods <= {"GET", "HEAD", "OPTIONS"}:
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_SMOKE_PATH}#nonDestructiveBoundary.allowedMethods", "pre-staging smoke allows unsafe methods")
    check_false_claims(F, "USF-PUBLIC-FQDN-024", PRE_STAGING_SMOKE_PATH, smoke)
    check_external_http_non_claims(F, "USF-PUBLIC-FQDN-024", PRE_STAGING_SMOKE_PATH, smoke)
    check_single_proof_command(
        F,
        "USF-PUBLIC-FQDN-025",
        PRE_STAGING_SMOKE_PATH,
        smoke,
        package,
        makefile,
        EXPECTED_PRE_STAGING_SMOKE_COMMAND,
    )


def check_pre_staging_gate(F: Findings, gate: Any, smoke: Any) -> None:
    if not isinstance(gate, dict):
        F.add("USF-PUBLIC-FQDN-024", str(PRE_STAGING_GATE_PATH), "pre-staging parent gate evidence is missing")
        return
    if gate.get("issueId") != "USF-267":
        F.add("USF-PUBLIC-FQDN-024", str(PRE_STAGING_GATE_PATH), "parent gate issue linkage is stale")
    may_begin = gate.get("stagingSpecificEnablementMayBegin")
    if may_begin not in {True, False}:
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_GATE_PATH}#stagingSpecificEnablementMayBegin", "gate decision is missing")
    if isinstance(smoke, dict) and smoke.get("status") == "blocked" and may_begin is not False:
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_GATE_PATH}#stagingSpecificEnablementMayBegin", "blocked smoke cannot allow staging-specific enablement")
    if isinstance(smoke, dict) and smoke.get("status") == "pass" and may_begin is not True:
        F.add("USF-PUBLIC-FQDN-024", f"{PRE_STAGING_GATE_PATH}#stagingSpecificEnablementMayBegin", "passing smoke should explicitly allow staging-specific enablement")
    check_false_claims(F, "USF-PUBLIC-FQDN-024", PRE_STAGING_GATE_PATH, gate)
    check_external_http_non_claims(F, "USF-PUBLIC-FQDN-024", PRE_STAGING_GATE_PATH, gate)


def check_self_hosted_origin_evidence(F: Findings, evidence: Any) -> None:
    if not isinstance(evidence, dict):
        F.add("USF-PUBLIC-FQDN-026", str(SELF_HOSTED_ORIGIN_PATH), "self-hosted origin evidence is missing")
        return
    if evidence.get("issueId") != "USF-289":
        F.add("USF-PUBLIC-FQDN-026", str(SELF_HOSTED_ORIGIN_PATH), "issue linkage is stale")
    status = evidence.get("status")
    if status not in {"pass", "origin-configured-public-dns-cutover-blocked"}:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#status", "self-hosted origin status is invalid")

    protected = evidence.get("protectedOperationalRecords", {})
    ssh_record = protected.get("sshAldousInfo") if isinstance(protected, dict) else None
    if not isinstance(ssh_record, dict):
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#protectedOperationalRecords.sshAldousInfo", "protected SSH record evidence is missing")
    else:
        if ssh_record.get("expectedARecord") != "103.138.244.121":
            F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#protectedOperationalRecords.sshAldousInfo.expectedARecord", "protected SSH A record is stale")
        if ssh_record.get("mustRemainDnsOnly") is not True or ssh_record.get("mutatedByThisWork") is not False:
            F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#protectedOperationalRecords.sshAldousInfo", "protected SSH record boundary is unsafe")

    dns = evidence.get("dnsCutover", {})
    if not isinstance(dns, dict):
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover", "DNS cutover evidence is missing")
        dns = {}
    if dns.get("requiredARecord") != "103.138.244.121":
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.requiredARecord", "required self-hosted origin A record is stale")
    if dns.get("directToSelfHostedOriginRequired") is not True:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.directToSelfHostedOriginRequired", "direct self-hosted origin DNS requirement is missing")
    if dns.get("cloudflareProxyAllowedForProofRoutes") is not False:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.cloudflareProxyAllowedForProofRoutes", "Cloudflare proxy/cache is allowed for proof routes")
    if dns.get("netlifyLiveServingPathAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.netlifyLiveServingPathAllowed", "Netlify live serving path is allowed")
    cutover_complete = dns.get("cutoverComplete") is True
    netlify_observed = dns.get("netlifyLiveServingCurrentlyObserved") is True
    cloudflare_proxy_observed = dns.get("cloudflareProxyCurrentlyObserved") is True
    if cutover_complete and (netlify_observed or cloudflare_proxy_observed):
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover", "completed cutover still records Netlify or Cloudflare proxy evidence")
    if not cutover_complete:
        blockers = dns.get("blockers")
        if not isinstance(blockers, list) or not blockers:
            F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.blockers", "incomplete cutover lacks explicit blocker evidence")
        else:
            for blocker in blockers:
                if not isinstance(blocker, dict):
                    F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.blockers", "DNS cutover blocker is invalid")
                    continue
                if blocker.get("issueId") != "USF-289" or blocker.get("blocksPublicMigrationCompletion") is not True:
                    F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.blockers", "DNS cutover blocker linkage or impact is missing")
                if not is_non_empty_string(blocker.get("requiredOperatorAction")):
                    F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#dnsCutover.blockers", "DNS cutover blocker lacks operator action")

    origin = evidence.get("selfHostedOrigin", {})
    if not isinstance(origin, dict):
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#selfHostedOrigin", "self-hosted origin state is missing")
        origin = {}
    if origin.get("publicIpv4") != "103.138.244.121":
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#selfHostedOrigin.publicIpv4", "self-hosted origin IP is stale")
    if origin.get("serviceManager") != "systemd" or origin.get("serviceActive") is not True:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#selfHostedOrigin.serviceActive", "self-hosted service is not active")
    if origin.get("caddyConfigValidated") is not True:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#selfHostedOrigin.caddyConfigValidated", "origin server configuration is not validated")
    listening = origin.get("listeningPorts", {})
    if not isinstance(listening, dict) or listening.get("80") is not True or listening.get("443") is not True:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#selfHostedOrigin.listeningPorts", "origin does not record listeners for ports 80 and 443")

    routes = evidence.get("routeSemantics", {})
    if not isinstance(routes, dict):
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#routeSemantics", "route semantics are missing")
        routes = {}
    if routes.get("jsonProofRoute") != "/.well-known/usf-public-edge.json":
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#routeSemantics.jsonProofRoute", "JSON proof route is stale")
    browser_routes = set(routes.get("browserProofRoutes", []))
    if browser_routes != {"/__proof/public-route", "/__proof/public-route/"}:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#routeSemantics.browserProofRoutes", "browser proof route inventory is stale")
    if set(routes.get("safeMethods", [])) != {"GET", "HEAD", "OPTIONS"}:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#routeSemantics.safeMethods", "safe method boundary is stale")
    if routes.get("unsupportedMethodsFailSafely") is not True or routes.get("persistentMutationAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#routeSemantics", "unsafe method or mutation semantics are allowed")
    if routes.get("hostMismatchFailsSafely") is not True or routes.get("missingRoutesFailSafely") is not True:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#routeSemantics", "host mismatch or missing route safety is not recorded")

    headers = evidence.get("headerSemantics", {})
    if not isinstance(headers, dict):
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#headerSemantics", "header semantics are missing")
        headers = {}
    for key in ("noStoreRequired", "contentTypeNosniffRequired", "referrerPolicyRequired"):
        if headers.get(key) is not True:
            F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#headerSemantics.{key}", "required header semantic is missing")
    if headers.get("providerCacheStatusAllowed") is not False or headers.get("netlifyHeadersAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#headerSemantics", "provider cache or Netlify headers are allowed")

    direct = evidence.get("directOriginEvidence", {})
    if not isinstance(direct, dict) or direct.get("httpRedirectEvidencePass") is not True:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#directOriginEvidence", "direct origin HTTP redirect evidence is missing")
    if isinstance(direct, dict) and direct.get("publicHttpsEvidencePass") is True and not cutover_complete:
        F.add("USF-PUBLIC-FQDN-026", f"{SELF_HOSTED_ORIGIN_PATH}#directOriginEvidence.publicHttpsEvidencePass", "public HTTPS evidence cannot pass before DNS cutover")

    provider = evidence.get("providerIndependence", {})
    if not isinstance(provider, dict):
        F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#providerIndependence", "provider independence evidence is missing")
        provider = {}
    if provider.get("repositoryContractSemanticAuthority") is not True:
        F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#providerIndependence.repositoryContractSemanticAuthority", "repository contract is not recorded as semantic authority")
    if provider.get("providerHeadersEvidenceOnly") is not True:
        F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#providerIndependence.providerHeadersEvidenceOnly", "provider headers are not evidence-only")
    if provider.get("requiredProvider") != "none" or provider.get("requiredGateway") != "none":
        F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#providerIndependence", "provider or gateway is treated as required semantic authority")

    enterprise = evidence.get("enterpriseOriginSemantics", {})
    required_sections = {
        "assetOwnership",
        "availability",
        "tls",
        "accessControl",
        "changeControl",
        "loggingAndPrivacy",
        "monitoring",
        "backupAndRecovery",
        "securityHardening",
        "supplyChain",
        "incidentResponse",
        "tenantAndDataBoundary",
        "providerIndependence",
        "iso27001StyleControlSupport",
    }
    if not isinstance(enterprise, dict):
        F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#enterpriseOriginSemantics", "enterprise origin semantics are missing")
        enterprise = {}
    missing_sections = required_sections - set(enterprise)
    if missing_sections:
        F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#enterpriseOriginSemantics", f"enterprise origin sections are missing: {sorted(missing_sections)}")
    for section_id in sorted(required_sections & set(enterprise)):
        section = enterprise.get(section_id)
        if not isinstance(section, dict):
            F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#enterpriseOriginSemantics.{section_id}", "enterprise origin section is invalid")
            continue
        for owner_key in ("owner", "riskOwner", "controlOwner", "evidenceOwner"):
            if not is_non_empty_string(section.get(owner_key)):
                F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#enterpriseOriginSemantics.{section_id}.{owner_key}", "enterprise origin section owner is missing")
        if not is_non_empty_string(section.get("evidenceSource")):
            F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#enterpriseOriginSemantics.{section_id}.evidenceSource", "enterprise origin section evidence source is missing")
        if not is_non_empty_string(section.get("riskTreatment")):
            F.add("USF-PUBLIC-FQDN-027", f"{SELF_HOSTED_ORIGIN_PATH}#enterpriseOriginSemantics.{section_id}.riskTreatment", "enterprise origin section risk treatment is missing")

    check_false_claims(F, "USF-PUBLIC-FQDN-027", SELF_HOSTED_ORIGIN_PATH, evidence)
    check_external_http_non_claims(F, "USF-PUBLIC-FQDN-027", SELF_HOSTED_ORIGIN_PATH, evidence)


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
    check_public_fqdn_tag_gate(F, state.get("tagGate"))
    check_external_http_behaviour_contract(
        F,
        state.get("externalHttpBehaviour"),
        state["package"],
        state["makefile"],
    )
    check_external_http_cache_gate(
        F,
        state.get("externalHttpCache"),
        state["package"],
        state["makefile"],
    )
    check_external_http_observability_gate(
        F,
        state.get("externalHttpObservability"),
        state["package"],
        state["makefile"],
    )
    pre_staging_smoke = state.get("preStagingSmoke")
    check_pre_staging_smoke_gate(F, pre_staging_smoke, state["package"], state["makefile"])
    check_pre_staging_gate(F, state.get("preStagingGate"), pre_staging_smoke)
    check_self_hosted_origin_evidence(F, state.get("selfHostedOrigin"))
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
