#!/usr/bin/env python3
"""Validate the USF Compose service catalogue and generated Compose files."""

from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[2]
CATALOGUE_PATH = ROOT / "spec/instances/compose-service/service-catalogue.json"
SCHEMA_PATH = ROOT / "spec/schemas/compose-service.schema.json"
REACT_COMPOSE_PATH = ROOT.parent / "react" / "compose.yaml"
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


def react_services(path: Path = REACT_COMPOSE_PATH) -> set[str]:
    services: set[str] = set()
    in_services = False
    with path.open(encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if line == "services:":
                in_services = True
                continue
            if in_services and line and not line.startswith(" ") and not line.startswith("#"):
                break
            if in_services and line.startswith("  ") and not line.startswith("    "):
                key = line.strip().rstrip(":")
                if key and not key.startswith("#"):
                    services.add(key)
    return services


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
            if policy["sharingModel"] == "shared-control-plane" and "environment" not in policy["proofObligation"]:
                add(findings, "USF-COMPOSE-010", f"{service_id}:{env_name}")
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
            actual_names = _compose_service_names_from_text(actual)
            authorised = catalogue_service_names(catalogue, target_name)
            for name in sorted(actual_names - authorised):
                add(findings, "USF-COMPOSE-002", f"{target_name}:{name}")


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
                target = target[part]
            target[parts[-1]] = value
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
    if mode in {"catalogue", "policy", "all"}:
        validate_catalogue(catalogue, findings)
    if mode in {"generated", "all"}:
        validate_generated(catalogue, findings)
    if mode in {"selftest", "all"}:
        validate_selftest(catalogue, findings)
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["schema", "catalogue", "policy", "generated", "selftest", "all"])
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
