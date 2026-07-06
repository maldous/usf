#!/usr/bin/env python3
"""Validate the USF-native foundation substrate closure artefacts."""

from __future__ import annotations

import copy
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

RULE_IDS = [f"USF-FOUNDATION-CLOSURE-{index:03d}" for index in range(1, 10)]

JSON_DOCS = {
    "devFoundation": DOCS / "dev-foundation-substrate-closure.json",
    "devCompose": DOCS / "dev-compose-substrate-closure.json",
    "devCommand": DOCS / "dev-command-proof-closure.json",
    "devHandoff": DOCS / "dev-to-test-closure-handoff.json",
    "provenance": DOCS / "superseded-lineage-closure-provenance.json",
    "report": DOCS / "usf-current-state-foundation-closure-record.json",
    "scan": DOCS / "usf-current-state-foundation-closure-reference-retirement-scan.json",
    "cockpitImport": DOCS / "proof-cockpit-foundation-substrate-closure-import.json",
}

MD_DOCS = {
    "devFoundationMd": DOCS / "dev-foundation-substrate-closure.md",
    "devComposeMd": DOCS / "dev-compose-substrate-closure.md",
    "devCommandMd": DOCS / "dev-command-proof-closure.md",
    "devHandoffMd": DOCS / "dev-to-test-closure-handoff.md",
    "provenanceMd": DOCS / "superseded-lineage-closure-provenance.md",
    "reportMd": DOCS / "usf-current-state-foundation-closure-report.md",
    "scanMd": DOCS / "usf-current-state-foundation-closure-reference-retirement-scan.md",
    "cockpitImportMd": DOCS / "proof-cockpit-foundation-substrate-closure-import.md",
}

ACTIVE_TEXT_PATHS = [
    ROOT / "apps" / "staging-proof-cockpit" / "src" / "server.mjs",
    ROOT / "apps" / "staging-proof-cockpit" / "src" / "smoke.mjs",
    ROOT / "apps" / "staging-proof-cockpit" / "src" / "machine-qa.mjs",
    *JSON_DOCS.values(),
    *[path for key, path in MD_DOCS.items() if not key.startswith("provenance")],
]

FORBIDDEN_ACTIVE_PATTERNS = [
    r"react parity",
    r"full react",
    r"react non-ui",
    r"react-derived",
    r"historical react",
    r"\.\./react",
    r"\blegacy\b",
    r"react lineage",
    r"old react",
    r"former react",
]

FORBIDDEN_REACT_PRODUCT_PARITY_TOKEN = "no-full-" + "react-product-" + "parity"

ALLOWED_FORBIDDEN_TOKEN_PATH_PREFIXES = (
    "docs/architecture/react-",
    "docs/architecture/superseded-lineage-closure-provenance.",
    "tools/validate-non-ui-completeness/",
    "tools/validate-parity/",
)

ALLOWED_FORBIDDEN_TOKEN_PATH_PARTS = (
    "/planted-defects/",
    "/fixtures/",
)

ACTIVE_NONCLAIM_TOKEN_PATHS = [
    "apps/public-proof-origin/src/server.mjs",
    "netlify/functions/public-proof-shared.js",
    "packages/proof/src/external-http-cache-proof.ts",
    "packages/proof/src/external-http-observability-proof.ts",
    "packages/proof/src/pre-staging-external-smoke-proof.ts",
    "packages/proof/src/public-fqdn-proof.ts",
    "packages/proof/src/public-proof-origin-proof.ts",
    "packages/proof/src/public-route-telemetry-proof.ts",
    "docs/architecture/current-state-command-surface.json",
    "docs/architecture/current-state-foundation-authority-index.json",
    "docs/architecture/current-state-terminology-normalisation-audit.json",
    "docs/architecture/dev-ready-foundation-baseline-tag.json",
    "docs/architecture/foundation-optimisation-evidence.json",
    "docs/architecture/post-foundation-optimisation-strategy.json",
    "docs/architecture/proof-cockpit-machine-qa-evidence-model.json",
]

REQUIRED_ACTIVE_NATIVE_NONCLAIM_TOKENS = (
    "no-full-product-readiness",
    "no-product-ui-readiness",
)

READINESS_OVERCLAIMS = [
    "Staging readiness is claimed",
    "Production readiness is claimed",
    "SOC readiness is claimed",
    "ISO certification is claimed",
    "enterprise production readiness is claimed",
    "product UI readiness is claimed",
    "browser E2E readiness is claimed",
]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {"json": {}, "md": {}, "planted": []}
    for key, path in JSON_DOCS.items():
        data["json"][key] = load_json(path)
    for key, path in MD_DOCS.items():
        data["md"][key] = path.read_text(encoding="utf-8")
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def tracked_file_texts(data: dict[str, Any]) -> list[tuple[str, str]]:
    overrides: dict[str, str] = data.get("_trackedFileOverrides", {})
    result = subprocess.run(["git", "ls-files"], cwd=ROOT, check=True, capture_output=True, text=True)
    texts: list[tuple[str, str]] = []
    seen: set[str] = set()
    for rel_path in result.stdout.splitlines():
        seen.add(rel_path)
        if rel_path in overrides:
            texts.append((rel_path, overrides[rel_path]))
            continue
        path = ROOT / rel_path
        try:
            texts.append((rel_path, path.read_text(encoding="utf-8")))
        except UnicodeDecodeError:
            continue
    for rel_path, text in overrides.items():
        if rel_path not in seen:
            texts.append((rel_path, text))
    return texts


def forbidden_token_allowed_path(rel_path: str) -> bool:
    return rel_path.startswith(ALLOWED_FORBIDDEN_TOKEN_PATH_PREFIXES) or any(
        part in f"/{rel_path}" for part in ALLOWED_FORBIDDEN_TOKEN_PATH_PARTS
    )


def rule_001_required_docs(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    if data.get("_missingDoc"):
        failures.append(fail("USF-FOUNDATION-CLOSURE-001", "Required artefact missing in planted defect fixture"))
    for key, path in {**JSON_DOCS, **MD_DOCS}.items():
        if not path.exists():
            failures.append(fail("USF-FOUNDATION-CLOSURE-001", f"Missing required artefact {key}", str(path.relative_to(ROOT))))
    return failures


def rule_002_dev_closure_complete(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for key in ["devFoundation", "devCompose", "devCommand", "devHandoff"]:
        if data["json"][key].get("closureState") != "complete":
            failures.append(fail("USF-FOUNDATION-CLOSURE-002", f"{key} closureState must be complete", str(JSON_DOCS[key].relative_to(ROOT))))
    return failures


def rule_003_report_current_state(data: dict[str, Any]) -> list[dict[str, str]]:
    report = data["json"]["report"]
    failures: list[dict[str, str]] = []
    if report.get("activeHistoricalExternalAuthority") is not False:
        failures.append(fail("USF-FOUNDATION-CLOSURE-003", "Current-state report must not allow active external-lineage authority", str(JSON_DOCS["report"].relative_to(ROOT))))
    if report.get("closureState") != "complete":
        failures.append(fail("USF-FOUNDATION-CLOSURE-003", "Current-state report closureState must be complete", str(JSON_DOCS["report"].relative_to(ROOT))))
    return failures


def rule_004_sealed_provenance_non_authority(data: dict[str, Any]) -> list[dict[str, str]]:
    provenance = data["json"]["provenance"]
    failures: list[dict[str, str]] = []
    if provenance.get("activeAuthority") is not False:
        failures.append(fail("USF-FOUNDATION-CLOSURE-004", "Sealed provenance must not be active authority", str(JSON_DOCS["provenance"].relative_to(ROOT))))
    if provenance.get("mayDefineCurrentSemantics") is not False:
        failures.append(fail("USF-FOUNDATION-CLOSURE-004", "Sealed provenance must not define current semantics", str(JSON_DOCS["provenance"].relative_to(ROOT))))
    return failures


def rule_005_no_active_transition_terms(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    combined = [(path, path.read_text(encoding="utf-8")) for path in ACTIVE_TEXT_PATHS if path.exists()]
    for path, text in combined:
        for pattern in FORBIDDEN_ACTIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                failures.append(fail("USF-FOUNDATION-CLOSURE-005", f"Forbidden active transition term matched {pattern}", str(path.relative_to(ROOT))))
    for key, text in data.get("md", {}).items():
        for pattern in FORBIDDEN_ACTIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                failures.append(fail("USF-FOUNDATION-CLOSURE-005", f"Forbidden active transition term matched {pattern}", key))
    return failures


def rule_006_nonclaims_preserved(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    text = "\n".join(json.dumps(value, sort_keys=True) for value in data["json"].values()) + "\n" + "\n".join(data["md"].values())
    for phrase in READINESS_OVERCLAIMS:
        if phrase in text:
            failures.append(fail("USF-FOUNDATION-CLOSURE-006", f"Forbidden readiness overclaim present: {phrase}"))
    for required in ["Product UI readiness", "Staging readiness", "Production readiness", "ISO certification"]:
        if required not in text:
            failures.append(fail("USF-FOUNDATION-CLOSURE-006", f"Required non-claim missing: {required}"))
    return failures


def rule_007_cockpit_current_route(data: dict[str, Any]) -> list[dict[str, str]]:
    server = data.get("_serverOverride") or (ROOT / "apps" / "staging-proof-cockpit" / "src" / "server.mjs").read_text(encoding="utf-8")
    failures: list[dict[str, str]] = []
    if "/proof/foundation-substrate-closure" not in server:
        failures.append(fail("USF-FOUNDATION-CLOSURE-007", "Cockpit must expose the foundation substrate closure route"))
    if "/proof/react-non-ui-parity" in server:
        failures.append(fail("USF-FOUNDATION-CLOSURE-007", "Cockpit must not expose the retired transition route"))
    return failures


def rule_008_scan_classified(data: dict[str, Any]) -> list[dict[str, str]]:
    report = data["json"]["report"]
    scan_doc = data["json"]["scan"]
    scan = report.get("retirementScan", {})
    failures: list[dict[str, str]] = []
    if scan.get("unexplainedCount") != 0:
        failures.append(fail("USF-FOUNDATION-CLOSURE-008", "Retirement scan must have zero unexplained matches", str(JSON_DOCS["report"].relative_to(ROOT))))
    if scan_doc.get("activeCurrentStateSurfaceMatches") != 0:
        failures.append(fail("USF-FOUNDATION-CLOSURE-008", "Active current-state surface matches must be zero", str(JSON_DOCS["scan"].relative_to(ROOT))))
    if scan_doc.get("unexplainedMatches"):
        failures.append(fail("USF-FOUNDATION-CLOSURE-008", "Scan artefact must not contain unexplained matches", str(JSON_DOCS["scan"].relative_to(ROOT))))
    if not scan.get("classificationRequired"):
        failures.append(fail("USF-FOUNDATION-CLOSURE-008", "Retirement scan must require classification of remaining matches", str(JSON_DOCS["report"].relative_to(ROOT))))
    return failures


def rule_009_no_active_react_product_parity_nonclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rel_path, text in tracked_file_texts(data):
        if FORBIDDEN_REACT_PRODUCT_PARITY_TOKEN in text and not forbidden_token_allowed_path(rel_path):
            failures.append(
                fail(
                    "USF-FOUNDATION-CLOSURE-009",
                    "Forbidden active React-specific product parity non-claim token present",
                    rel_path,
                )
            )
    file_texts = dict(tracked_file_texts(data))
    for rel_path in ACTIVE_NONCLAIM_TOKEN_PATHS:
        text = file_texts.get(rel_path, "")
        if not text:
            failures.append(fail("USF-FOUNDATION-CLOSURE-009", "Active non-claim surface missing from tracked files", rel_path))
            continue
        for token in REQUIRED_ACTIVE_NATIVE_NONCLAIM_TOKENS:
            if token not in text:
                failures.append(fail("USF-FOUNDATION-CLOSURE-009", f"Required USF-native non-claim token missing: {token}", rel_path))
    return failures


RULES = {
    "USF-FOUNDATION-CLOSURE-001": rule_001_required_docs,
    "USF-FOUNDATION-CLOSURE-002": rule_002_dev_closure_complete,
    "USF-FOUNDATION-CLOSURE-003": rule_003_report_current_state,
    "USF-FOUNDATION-CLOSURE-004": rule_004_sealed_provenance_non_authority,
    "USF-FOUNDATION-CLOSURE-005": rule_005_no_active_transition_terms,
    "USF-FOUNDATION-CLOSURE-006": rule_006_nonclaims_preserved,
    "USF-FOUNDATION-CLOSURE-007": rule_007_cockpit_current_route,
    "USF-FOUNDATION-CLOSURE-008": rule_008_scan_classified,
    "USF-FOUNDATION-CLOSURE-009": rule_009_no_active_react_product_parity_nonclaim,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def apply_fixture(data: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    mutated = copy.deepcopy(data)
    kind = fixture.get("kind")
    if kind == "remove-doc":
        mutated["_missingDoc"] = True
    elif kind == "dev-incomplete":
        mutated["json"]["devFoundation"]["closureState"] = "incomplete"
    elif kind == "external-authority":
        mutated["json"]["report"]["activeHistoricalExternalAuthority"] = True
    elif kind == "provenance-authority":
        mutated["json"]["provenance"]["activeAuthority"] = True
    elif kind == "active-transition-term":
        mutated.setdefault("md", {})["cockpitImportMd"] = "active legacy React parity wording"
    elif kind == "readiness-overclaim":
        mutated["json"]["report"]["overclaim"] = "Staging readiness is claimed"
    elif kind == "retired-route":
        server_path = ROOT / "apps" / "staging-proof-cockpit" / "src" / "server.mjs"
        mutated.setdefault("_serverOverride", server_path.read_text(encoding="utf-8") + "\n/proof/react-non-ui-parity\n")
    elif kind == "unexplained-scan":
        mutated["json"]["report"]["retirementScan"]["unexplainedCount"] = 1
    elif kind == "active-react-product-parity-nonclaim":
        mutated.setdefault("_trackedFileOverrides", {})[
            "apps/public-proof-origin/src/server.mjs"
        ] = f'const nonClaims = ["{FORBIDDEN_REACT_PRODUCT_PARITY_TOKEN}"];'
    return mutated


def selftest(data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    planted_by_rule = {item.get("ruleId"): item for item in data["planted"]}
    results: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    original_active_paths = list(ACTIVE_TEXT_PATHS)
    try:
        for rule_id in RULE_IDS:
            planted = planted_by_rule.get(rule_id)
            if not planted:
                failures.append(fail(rule_id, "Missing planted defect fixture"))
                continue
            mutated = apply_fixture(data, planted.get("fixture", {}))
            if "_serverOverride" in mutated:
                temp_path = ROOT / ".tmp-foundation-closure-selftest-server.mjs"
                temp_path.write_text(mutated["_serverOverride"], encoding="utf-8")
                ACTIVE_TEXT_PATHS.append(temp_path)
            observed = [failure["ruleId"] for failure in RULES[rule_id](mutated)]
            results.append({"ruleId": rule_id, "expectedFailureObserved": rule_id in observed, "observedRuleIds": observed})
            if rule_id not in observed:
                failures.append(fail(rule_id, "Planted defect did not trigger expected rule"))
    finally:
        temp_path = ROOT / ".tmp-foundation-closure-selftest-server.mjs"
        if temp_path.exists():
            temp_path.unlink()
        ACTIVE_TEXT_PATHS[:] = original_active_paths
    return results, failures


def print_result(mode: str, failures: list[dict[str, str]], selftest_results: list[dict[str, Any]] | None = None) -> int:
    result: dict[str, Any] = {
        "validator": "validate-foundation-substrate-closure",
        "mode": mode,
        "status": "pass" if not failures else "fail",
        "failureCount": len(failures),
        "failures": failures,
        "rules": RULE_IDS,
    }
    if selftest_results is not None:
        result["selftestResults"] = selftest_results
    print(json.dumps(result, indent=2))
    return 0 if not failures else 1


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in {"all", "selftest"}:
        print("usage: validate-foundation-substrate-closure.py all|selftest [--json]", file=sys.stderr)
        return 2
    data = load_data()
    if argv[1] == "selftest":
        results, failures = selftest(data)
        return print_result("selftest", failures, results)
    return print_result("all", run_all(data))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
