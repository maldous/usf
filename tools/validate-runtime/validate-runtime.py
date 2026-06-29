#!/usr/bin/env python3
"""USF runtime proof manifest validator.

This validator enforces USF-181 runtime proof semantics. It does not execute
runtime code and does not create evidence. It fails closed when the bounded API
and worker runtime proof model is missing, when compose-backed proof is silently
represented as in-memory proof, when proof commands are not wired, when service
catalogue traceability is absent, when teardown representation is missing, or
when a prohibited readiness/compliance/parity claim is allowed.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
except Exception:  # pragma: no cover - jsonschema is available in normal repo validation.
    Draft202012Validator = None


RULES = {
    "USF-RUNTIME-001": ("blocking", "runtime proof manifest is missing or invalid"),
    "USF-RUNTIME-002": ("blocking", "runtime proof manifest lacks required modes"),
    "USF-RUNTIME-003": ("blocking", "compose-backed runtime proof is silently mapped to in-memory"),
    "USF-RUNTIME-004": ("blocking", "API or worker runtime proof is missing"),
    "USF-RUNTIME-005": ("blocking", "runtime proof command is not wired in package scripts or Make targets"),
    "USF-RUNTIME-006": ("blocking", "runtime proof allows a prohibited readiness claim"),
    "USF-RUNTIME-007": ("blocking", "compose-backed runtime proof lacks service-catalogue linkage"),
    "USF-RUNTIME-008": ("blocking", "runtime proof code or manifest lacks teardown representation"),
    "USF-RUNTIME-009": ("blocking", "runtime proof evidence boundaries are missing"),
    "USF-RUNTIME-010": ("blocking", "compose-backed deferred boundary is missing"),
    "USF-RUNTIME-SELFTEST": ("blocking", "planted runtime defect did not raise its expected rule"),
}

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path("spec/instances/runtime-proof/runtime-application-compose-parity.json")
SCHEMA_PATH = Path("spec/schemas/runtime-proof.schema.json")
PACKAGE_PATH = Path("package.json")
MAKEFILE_PATH = Path("Makefile")
PROOF_SOURCE_PATH = Path("packages/proof/src/runtime-application-proof.ts")
SERVICE_CATALOGUE_PATH = "spec/instances/compose-service/service-catalogue.json"
COMPOSE_TARGET = "compose/compose.dev.generated.yaml"
PLANTED_DEFECT_DIR = Path("tools/validate-runtime/planted-defects")

REQUIRED_MODES = {"dev-in-memory", "dev-compose-backed"}
REQUIRED_BOUNDARY_FIELDS = {
    "syntheticDataBoundary",
    "accessBoundary",
    "auditEvidenceBoundary",
    "secretBoundary",
    "tenantBoundary",
}
REQUIRED_PROHIBITED_CLAIMS = {
    "production-readiness",
    "staging-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "full-dev-readiness",
    "full-react-parity",
    "test-readiness",
}
PROHIBITED_ALLOWED_MARKERS = {
    "production",
    "staging",
    "live-provider",
    "soc",
    "iso",
    "full-dev",
    "full-react",
    "test-readiness",
}
SOURCE_TEARDOWN_MARKERS = (
    "finally",
    "stopProcess",
    "SIGTERM",
    "SIGKILL",
    "docker",
    "compose",
    "down",
    "-v",
    "--remove-orphans",
    "HOST: \"127.0.0.1\"",
    "PORT: \"0\"",
    "USF_WORKER_RUN_ONCE",
)


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
        return [f for f in self.items if f["severity"] in {"blocking", "error"}]


def read_json(path: Path) -> Any:
    with (ROOT / path).open(encoding="utf-8") as handle:
        return json.load(handle)


def read_text(path: Path) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def make_targets(makefile_text: str) -> set[str]:
    targets: set[str] = set()
    for line in makefile_text.splitlines():
        if not line or line.startswith(("\t", "#", ".")):
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+):", line)
        if match:
            targets.add(match.group(1))
    return targets


def json_pointer_parent(document: Any, pointer: str) -> tuple[Any, str]:
    if not pointer.startswith("/"):
        raise ValueError(f"JSON pointer must start with /: {pointer}")
    parts = [part.replace("~1", "/").replace("~0", "~") for part in pointer.strip("/").split("/")]
    current = document
    for part in parts[:-1]:
        if isinstance(current, list):
            current = current[int(part)]
        else:
            current = current[part]
    return current, parts[-1]


def apply_manifest_patches(manifest: Any, patches: list[dict[str, Any]]) -> Any:
    result = copy.deepcopy(manifest)
    for patch in patches:
        parent, key = json_pointer_parent(result, patch["path"])
        op = patch["op"]
        if op == "remove":
            if isinstance(parent, list):
                del parent[int(key)]
            else:
                parent.pop(key, None)
        elif op == "replace":
            if isinstance(parent, list):
                parent[int(key)] = patch["value"]
            else:
                parent[key] = patch["value"]
        else:
            raise ValueError(f"unsupported patch op: {op}")
    return result


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    defect = defect or {}
    manifest = read_json(MANIFEST_PATH)
    if defect.get("manifestPatches"):
        manifest = apply_manifest_patches(manifest, defect["manifestPatches"])
    package = read_json(PACKAGE_PATH)
    for script_name in defect.get("removePackageScripts", []):
        package.get("scripts", {}).pop(script_name, None)
    makefile = read_text(MAKEFILE_PATH)
    for target in defect.get("removeMakeTargets", []):
        makefile = re.sub(rf"^{re.escape(target)}:\n(?:\t.*\n)*", "", makefile, flags=re.MULTILINE)
    proof_source = read_text(PROOF_SOURCE_PATH)
    for replacement in defect.get("proofSourceReplacements", []):
        proof_source = proof_source.replace(replacement["old"], replacement["new"])
    return {
        "manifest": manifest,
        "schema": read_json(SCHEMA_PATH),
        "package": package,
        "makefile": makefile,
        "proofSource": proof_source,
    }


def mode_records(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    for record in manifest.get("runtimeModes", []):
        if isinstance(record, dict) and isinstance(record.get("mode"), str):
            records[record["mode"]] = record
    return records


def check_manifest(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    schema = state["schema"]
    if Draft202012Validator is not None:
        errors = list(Draft202012Validator(schema).iter_errors(manifest))
        for err in errors:
            loc = "/".join(str(p) for p in err.path)
            F.add("USF-RUNTIME-001", f"{MANIFEST_PATH}:{loc}" if loc else str(MANIFEST_PATH), err.message[:160])
    if not isinstance(manifest, dict):
        F.add("USF-RUNTIME-001", str(MANIFEST_PATH), "manifest is not an object")
        return
    modes = mode_records(manifest)
    missing = sorted(REQUIRED_MODES - set(modes))
    if missing:
        F.add("USF-RUNTIME-002", str(MANIFEST_PATH), f"missing runtime modes: {', '.join(missing)}")
    if len(modes) != len(manifest.get("runtimeModes", [])):
        F.add("USF-RUNTIME-002", str(MANIFEST_PATH), "runtime mode ids must be unique")


def check_compose_mode(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    modes = mode_records(manifest)
    compose = modes.get("dev-compose-backed")
    if not compose:
        return
    boundary = compose.get("composeBoundary") if isinstance(compose, dict) else None
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-003", "dev-compose-backed", "compose boundary is missing")
        return
    if (
        boundary.get("required") is not True
        or boundary.get("target") != COMPOSE_TARGET
        or boundary.get("providerBinding") != "runtime-started-with-compose-boundary-provider-binding-deferred"
    ):
        F.add("USF-RUNTIME-003", "dev-compose-backed", "compose-backed mode lacks explicit compose boundary and deferred provider binding")
    if compose.get("providerMode") == "dev in-memory" and not compose.get("deferredBoundaryRefs"):
        F.add("USF-RUNTIME-003", "dev-compose-backed", "in-memory provider mode requires explicit deferred boundary refs")


def check_proof_surfaces(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    for mode, record in mode_records(manifest).items():
        for surface_name in ("apiProof", "workerProof"):
            surface = record.get(surface_name)
            if not isinstance(surface, dict):
                F.add("USF-RUNTIME-004", f"{mode}:{surface_name}", "proof surface is missing")
                continue
            if not surface.get("packageScript") or not surface.get("makeTarget"):
                F.add("USF-RUNTIME-004", f"{mode}:{surface_name}", "proof surface lacks command references")
            assertions = surface.get("assertions")
            if not isinstance(assertions, list) or not assertions:
                F.add("USF-RUNTIME-004", f"{mode}:{surface_name}", "proof surface lacks assertions")


def check_command_wiring(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    scripts = set((state["package"].get("scripts") or {}).keys())
    targets = make_targets(state["makefile"])
    required_pairs: set[tuple[str, str]] = set()
    for command in manifest.get("proofCommands", []):
        if isinstance(command, dict):
            required_pairs.add((str(command.get("packageScript")), str(command.get("makeTarget"))))
    for record in mode_records(manifest).values():
        for surface_name in ("apiProof", "workerProof"):
            surface = record.get(surface_name)
            if isinstance(surface, dict):
                required_pairs.add((str(surface.get("packageScript")), str(surface.get("makeTarget"))))
    for package_script, make_target in sorted(required_pairs):
        if package_script not in scripts:
            F.add("USF-RUNTIME-005", package_script, "package script is not defined")
        if make_target not in targets:
            F.add("USF-RUNTIME-005", make_target, "Make target is not defined")


def check_claims(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    top_prohibited = set(manifest.get("prohibitedClaims", []))
    non_claims = set(manifest.get("nonClaims", []))
    if REQUIRED_PROHIBITED_CLAIMS - top_prohibited:
        F.add("USF-RUNTIME-006", str(MANIFEST_PATH), "top-level prohibited claims set is incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - non_claims:
        F.add("USF-RUNTIME-006", str(MANIFEST_PATH), "non-claims set is incomplete")
    for subject, allowed in [("top-level", manifest.get("allowedClaims", []))]:
        for claim in allowed:
            if any(marker in claim for marker in PROHIBITED_ALLOWED_MARKERS):
                F.add("USF-RUNTIME-006", subject, f"allowed claim is prohibited: {claim}")
    for mode, record in mode_records(manifest).items():
        prohibited = set(record.get("prohibitedClaims", []))
        if REQUIRED_PROHIBITED_CLAIMS - prohibited:
            F.add("USF-RUNTIME-006", mode, "mode prohibited claims set is incomplete")
        for claim in record.get("allowedClaims", []):
            if any(marker in claim for marker in PROHIBITED_ALLOWED_MARKERS):
                F.add("USF-RUNTIME-006", mode, f"allowed claim is prohibited: {claim}")


def check_service_catalogue_linkage(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    top = manifest.get("serviceCatalogueDependency")
    if not isinstance(top, dict) or top.get("path") != SERVICE_CATALOGUE_PATH:
        F.add("USF-RUNTIME-007", str(MANIFEST_PATH), "top-level service catalogue dependency is missing")
    if not (ROOT / SERVICE_CATALOGUE_PATH).exists():
        F.add("USF-RUNTIME-007", SERVICE_CATALOGUE_PATH, "service catalogue path does not exist")
    if not (ROOT / COMPOSE_TARGET).exists():
        F.add("USF-RUNTIME-007", COMPOSE_TARGET, "compose target path does not exist")
    compose = mode_records(manifest).get("dev-compose-backed")
    if not compose:
        return
    boundary = compose.get("composeBoundary") if isinstance(compose, dict) else None
    if (
        compose.get("serviceCatalogueDependency") != SERVICE_CATALOGUE_PATH
        or not isinstance(boundary, dict)
        or boundary.get("serviceCataloguePath") != SERVICE_CATALOGUE_PATH
    ):
        F.add("USF-RUNTIME-007", "dev-compose-backed", "compose-backed mode lacks service catalogue linkage")


def check_teardown(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    proof_source = state["proofSource"]
    for marker in SOURCE_TEARDOWN_MARKERS:
        if marker not in proof_source:
            F.add("USF-RUNTIME-008", str(PROOF_SOURCE_PATH), f"proof source missing teardown marker: {marker}")
    for mode, record in mode_records(manifest).items():
        teardown = record.get("teardown")
        if not isinstance(teardown, dict):
            F.add("USF-RUNTIME-008", mode, "mode teardown metadata is missing")
            continue
        if not teardown.get("childProcesses"):
            F.add("USF-RUNTIME-008", mode, "child process teardown metadata is missing")
        if not teardown.get("composeResources"):
            F.add("USF-RUNTIME-008", mode, "Compose teardown metadata is missing")


def check_boundaries(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    for field in REQUIRED_BOUNDARY_FIELDS:
        if not manifest.get(field):
            F.add("USF-RUNTIME-009", str(MANIFEST_PATH), f"missing top-level boundary: {field}")
    enterprise = manifest.get("enterpriseEvidenceSupport")
    if not isinstance(enterprise, dict):
        F.add("USF-RUNTIME-009", str(MANIFEST_PATH), "enterprise evidence support is missing")
    for mode, record in mode_records(manifest).items():
        for surface_name in ("apiProof", "workerProof"):
            surface = record.get(surface_name)
            if not isinstance(surface, dict):
                continue
            for field in ("auditEvidence", "tenantBoundary", "accessBoundary", "secretBoundary", "syntheticDataBoundary"):
                if not surface.get(field):
                    F.add("USF-RUNTIME-009", f"{mode}:{surface_name}", f"missing proof boundary: {field}")


def check_deferred_boundaries(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    deferred = manifest.get("deferredBoundaries")
    if not isinstance(deferred, list):
        F.add("USF-RUNTIME-010", str(MANIFEST_PATH), "deferred boundaries must be an array")
        return
    deferred_ids = {item.get("id") for item in deferred if isinstance(item, dict)}
    compose = mode_records(manifest).get("dev-compose-backed")
    if not compose:
        return
    refs = set(compose.get("deferredBoundaryRefs", []))
    if not refs:
        F.add("USF-RUNTIME-010", "dev-compose-backed", "compose-backed mode lacks deferred boundary refs")
    missing = sorted(refs - deferred_ids)
    if missing:
        F.add("USF-RUNTIME-010", "dev-compose-backed", f"unresolved deferred boundary refs: {', '.join(missing)}")
    for item in deferred:
        if not isinstance(item, dict):
            continue
        if item.get("mode") == "dev-compose-backed" and not item.get("claimsProhibitedUntilResolved"):
            F.add("USF-RUNTIME-010", item.get("id", "deferred-boundary"), "deferred boundary lacks prohibited claims")


def run_checks(mode: str, state: dict[str, Any]) -> Findings:
    F = Findings()
    selected = {
        "manifest": [check_manifest, check_compose_mode, check_proof_surfaces, check_claims, check_service_catalogue_linkage, check_boundaries, check_deferred_boundaries],
        "commands": [check_command_wiring],
        "source": [check_teardown],
        "all": [check_manifest, check_compose_mode, check_proof_surfaces, check_command_wiring, check_claims, check_service_catalogue_linkage, check_teardown, check_boundaries, check_deferred_boundaries],
    }[mode]
    for check in selected:
        check(F, state)
    return F


def run_selftest() -> Findings:
    F = Findings()
    for path in sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json")):
        try:
            defect = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-RUNTIME-SELFTEST", str(path.relative_to(ROOT)), f"cannot read planted defect: {exc}")
            continue
        expected = defect.get("expectedRule")
        state = load_state(defect)
        findings = run_checks("all", state)
        raised = {item["ruleId"] for item in findings.items}
        if expected not in raised:
            F.add(
                "USF-RUNTIME-SELFTEST",
                str(path.relative_to(ROOT)),
                f"expected {expected}, got {', '.join(sorted(raised)) or 'no findings'}",
            )
    return F


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["manifest", "commands", "source", "selftest", "all"])
    parser.add_argument("--json", action="store_true", help="emit JSON summary")
    args = parser.parse_args()
    os.chdir(ROOT)

    F = Findings()
    if args.mode in {"manifest", "commands", "source", "all"}:
        try:
            state = load_state()
        except Exception as exc:  # noqa: BLE001
            F.add("USF-RUNTIME-001", str(MANIFEST_PATH), f"cannot load runtime validation state: {exc}")
        else:
            F.items.extend(run_checks(args.mode, state).items)
    if args.mode in {"selftest", "all"}:
        F.items.extend(run_selftest().items)

    ok = not F.blocking_or_error()
    payload = {
        "ok": ok,
        "mode": args.mode,
        "rules": RULES,
        "findings": F.items,
    }
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        if ok:
            print(f"runtime validation passed ({args.mode})")
        else:
            for finding in F.items:
                print(f"{finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
