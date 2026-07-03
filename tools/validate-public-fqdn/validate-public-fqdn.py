#!/usr/bin/env python3
"""Validate public FQDN semantic contract evidence.

This validator enforces the USF-262 public-FQDN semantic contract. It does not
perform DNS, TLS, HTTPS, or Playwright proof. Those proof gates belong to
USF-263 and USF-264. This validator fails closed when the semantic contract is
missing, incomplete, gateway-specific, generated-artifact authoritative, Test
environment dependent on public internet, or overclaiming readiness.
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
    "USF-PUBLIC-FQDN-SELFTEST": ("blocking", "planted public FQDN defect did not raise its expected rule"),
}

EXPECTED_ENVIRONMENTS = {
    "staging": "1e100.network",
    "production": "aldous.info",
}
EXPECTED_ROOT_HOST_IDS = {
    "staging": "staging-root",
    "production": "production-root",
}
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
        if defect.get("addIncompleteAdditionalHostname"):
            environments = contract.setdefault("environments", [])
            if environments:
                environments[0].setdefault("additionalHostnames", []).append({"fqdn": "api.1e100.network"})
        if "packageScriptDrop" in defect:
            scripts = mutated.get("package", {}).get("scripts", {})
            for script in defect["packageScriptDrop"]:
                scripts.pop(script, None)
        if defect.get("makeTargetDrop"):
            target = defect["makeTargetDrop"]
            mutated["makefile"] = re.sub(rf"\n{re.escape(target)}:\n\t[^\n]+\n", "\n", mutated["makefile"])
    return mutated


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


def check_environments(F: Findings, contract: dict[str, Any]) -> None:
    environments = contract.get("environments")
    if not isinstance(environments, list) or len(environments) != len(EXPECTED_ENVIRONMENTS):
        F.add("USF-PUBLIC-FQDN-002", f"{CONTRACT_PATH}#environments", "staging and production environment rows are required")
        return
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
            check_hostname_row(F, host, environment, expected_domain, required=True)
        additional = row.get("additionalHostnames", [])
        if not isinstance(additional, list):
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#environments.{environment}.additionalHostnames", "additional hostnames must be an array")
        else:
            for host in additional:
                check_hostname_row(F, host, environment, None, required=False)
        if not is_non_empty_string(row.get("additionalHostnamePolicy")):
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#environments.{environment}.additionalHostnamePolicy", "additional hostname declaration policy is missing")


def check_hostname_row(
    F: Findings,
    host: Any,
    environment: str,
    expected_fqdn: str | None,
    *,
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
        "routeBindingId",
        "telemetryBootstrapId",
        "claimBoundary",
    }
    for field in sorted(required_fields):
        if not is_non_empty_string(host.get(field)) and field != "protocols":
            F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.{field}", "hostname field is missing")
    if required and expected_fqdn and host.get("fqdn") != expected_fqdn:
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.fqdn", "root hostname does not match required domain")
    protocols = host.get("protocols")
    if not isinstance(protocols, list) or set(protocols) != REQUIRED_PROTOCOLS:
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.protocols", "hostname protocols must be dns and https")
    if required and host.get("id") != EXPECTED_ROOT_HOST_IDS.get(environment):
        F.add("USF-PUBLIC-FQDN-003", f"{CONTRACT_PATH}#hostnames.{environment}.id", "root hostname id is stale")


def check_semantics(F: Findings, contract: dict[str, Any]) -> None:
    dns = contract.get("dnsResolutionSemantics", {})
    if dns.get("required") is not True or dns.get("publicResolutionRequired") is not True:
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#dnsResolutionSemantics", "public DNS semantics are incomplete")
    if dns.get("privateOnlyResolutionAllowed") is not False or dns.get("nxdomainAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#dnsResolutionSemantics", "DNS failure semantics must fail closed")
    if not {"A", "AAAA", "CNAME"}.issubset(set(dns.get("acceptedRecordTypes", []))):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#dnsResolutionSemantics.acceptedRecordTypes", "accepted DNS record types are incomplete")

    tls = contract.get("tlsHttpsSemantics", {})
    for key in ("httpsRequired", "validCertificateRequired", "certificateHostCoverageRequired"):
        if tls.get(key) is not True:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#tlsHttpsSemantics.{key}", "TLS HTTPS requirement is missing")
    for key in ("httpOnlyAllowed", "mixedContentAllowed"):
        if tls.get(key) is not False:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#tlsHttpsSemantics.{key}", "unsafe HTTPS exception is allowed")

    route = contract.get("publicRouteBinding", {})
    if route.get("required") is not True or not is_non_empty_string(route.get("route")):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding", "public proof route is missing")
    if route.get("routeClass") != "non-product-proof-endpoint":
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicRouteBinding.routeClass", "proof route class must be non-product")
    if route.get("productUiReadinessClaimAllowed") is not False or route.get("browserE2eReadinessClaimAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#publicRouteBinding", "public route binding overclaims UI or browser E2E readiness")

    telemetry = contract.get("publicTelemetryBootstrap")
    if not isinstance(telemetry, dict):
        F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap", "telemetry bootstrap semantics are missing")
    else:
        if telemetry.get("requiredForPublicRouteProof") is not True:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap.requiredForPublicRouteProof", "telemetry bootstrap proof boundary is not explicit")
        systems = set(telemetry.get("telemetrySystems", []))
        if not {"faro", "sentry"}.issubset(systems):
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap.telemetrySystems", "Faro and Sentry telemetry boundary is incomplete")
        if telemetry.get("rawTelemetryPayloadRetentionAllowed") is not False:
            F.add("USF-PUBLIC-FQDN-004", f"{CONTRACT_PATH}#publicTelemetryBootstrap.rawTelemetryPayloadRetentionAllowed", "raw telemetry retention must be prohibited")


def check_gateway_and_provider(F: Findings, contract: dict[str, Any]) -> None:
    edge = contract.get("publicHttpEdgeCapability", {})
    if edge.get("gatewayNeutral") is not True or edge.get("requiredGateway") != "none":
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability", "public edge semantics must be gateway neutral")
    if edge.get("caddyNonRequirement") is not True:
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability.caddyNonRequirement", "Caddy non-requirement is not explicit")
    prohibited = {str(item).lower() for item in edge.get("prohibitedRequiredGateways", [])}
    if "caddy" not in prohibited:
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability.prohibitedRequiredGateways", "Caddy is not prohibited as a required gateway")
    if edge.get("generatedComposeAuthority") is not False or edge.get("generatedGatewayConfigAuthority") is not False:
        F.add("USF-PUBLIC-FQDN-005", f"{CONTRACT_PATH}#publicHttpEdgeCapability", "generated artefact is treated as semantic authority")

    cloudflare = contract.get("cloudflareBoundary", {})
    if cloudflare.get("declaredProvider") != "cloudflare":
        F.add("USF-PUBLIC-FQDN-006", f"{CONTRACT_PATH}#cloudflareBoundary.declaredProvider", "Cloudflare provider boundary is missing")
    if cloudflare.get("liveProviderReadinessClaimAllowed") is not False:
        F.add("USF-PUBLIC-FQDN-006", f"{CONTRACT_PATH}#cloudflareBoundary.liveProviderReadinessClaimAllowed", "Cloudflare boundary overclaims live-provider readiness")
    if cloudflare.get("apiSecretRequiredForSemanticContract") is not False:
        F.add("USF-PUBLIC-FQDN-006", f"{CONTRACT_PATH}#cloudflareBoundary.apiSecretRequiredForSemanticContract", "semantic contract requires Cloudflare secret")


def check_test_boundary(F: Findings, contract: dict[str, Any]) -> None:
    boundary = contract.get("testEnvironmentBoundary", {})
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
    non_claims = set(contract.get("nonClaims", []))
    missing = REQUIRED_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#nonClaims", f"required non-claims are missing: {sorted(missing)}")
    allowed_claims = {str(claim).lower() for claim in contract.get("allowedClaims", [])}
    prohibited = sorted(allowed_claims & PROHIBITED_ALLOWED_CLAIMS)
    if prohibited:
        F.add("USF-PUBLIC-FQDN-008", f"{CONTRACT_PATH}#allowedClaims", f"prohibited readiness claim is allowed: {prohibited}")
    validator = contract.get("validator", {})
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


def run_checks(state: dict[str, Any]) -> Findings:
    F = Findings()
    contract = state.get("contract")
    check_contract_shape(F, contract)
    if isinstance(contract, dict):
        check_environments(F, contract)
        check_semantics(F, contract)
        check_gateway_and_provider(F, contract)
        check_test_boundary(F, contract)
        check_claims_and_wiring(F, contract, state["package"], state["makefile"])
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
    for path in sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json")):
        defect = json.loads(path.read_text(encoding="utf-8"))
        expected = defect.get("expectedRule")
        F = run_checks(load_state(defect))
        if expected not in F.rule_ids():
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-PUBLIC-FQDN-SELFTEST",
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
