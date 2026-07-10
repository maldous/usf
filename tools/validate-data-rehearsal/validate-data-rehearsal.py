#!/usr/bin/env python3
"""Validate the USF-1075 dev-only synthetic data migration/backup/restore/rollback rehearsal map.

Fails closed. Enforces that the rehearsal map:
  * carries a complete envelope bound to parent USF-1069 and owner USF-1075,
  * lists every required rehearsal step kind exactly once with a complete step record,
  * uses only the allowed rehearsal status vocabulary,
  * NEVER claims dev-proven without an evidenceRef that resolves to a real on-disk file
    (no fabricated proof), and always attaches a next rung to non-dev-proven steps,
  * keeps every evidenceRef repo-relative (no external path escape),
  * declares a synthetic-data boundary and never claims production/real-customer data was used,
  * records a restored-dataset-usability step that is stronger than command exit success,
  * records a failed-restore negative path,
  * preserves all required non-claims and asserts no readiness overclaim,
  * cites only source authorities that exist on disk, and
  * carries exactly one distinct planted defect per validator rule.

The map is lower authority than the semantic contracts, ADRs, validators, and the backup/restore
and data-migration proof artefacts it binds. It defines no semantics and runs no docker/compose.
This validator is read-only and writes no runtime file.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

MAP_PATH = DOCS / "dev-synthetic-data-rehearsal-map.json"

RULE_IDS = [f"USF-DATA-REHEARSAL-{index:03d}" for index in range(1, 15)]

ALLOWED_STATUSES = {"dev-proven", "recorded-gap", "test-rung-deferred"}

REQUIRED_STEP_KINDS = [
    "migration",
    "synthetic-tenant-dataset",
    "rollback-rehearsal",
    "backup-rehearsal",
    "restore-rehearsal",
    "restored-dataset-usability",
    "failed-restore-negative-path",
    "backup-artifact-integrity",
    "cleanup",
    "retention-boundary",
    "redaction",
    "audit",
    "telemetry",
    "pgbackrest",
]

STEP_KEYS = ["stepId", "kind", "description", "evidenceRef", "status", "nonClaims"]

ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary",
    "lifecycleState", "ownerIssueId", "parentIssueId", "generatedReportAuthority",
]

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone",
    "no-production-migration-claim", "no-live-data-portability-claim",
    "no-backup-supplier-readiness-claim", "no-production-retention-claim",
    "no-production-data-claim",
]

FORBIDDEN_OVERCLAIMS = [
    "production ready", "production-ready", "live-provider ready", "live provider ready",
    "backup supplier ready", "backup-supplier ready", "iso certified", "iso-certified",
    "soc 2 certified", "soc2 certified", "enterprise production ready",
]

FORBIDDEN_DATA_USE = ["production data", "real customer data"]

USABILITY_KEYWORDS = ["verif", "usab", "read-back", "readback", "post-target", "content"]
NEGATIVE_PATH_KEYWORDS = [
    "fail-closed", "fail closed", "fails closed", "failclosed", "negative",
    "unavailable", "aborts", "missing repository", "missing-repository", "rejected",
]

EXPECTED_FRESHNESS_BINDING = "revalidated-against-data-migration-and-backup-restore-proof-in-head"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    data["map"] = load_json(MAP_PATH)
    data["planted"] = []
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def steps(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["map"].get("steps", [])


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    doc = data["map"]
    failures: list[dict[str, str]] = []
    for field in ENVELOPE_FIELDS:
        if doc.get(field) in (None, "", [], {}):
            failures.append(fail("USF-DATA-REHEARSAL-001", f"missing envelope field {field}", field))
    if doc.get("parentIssueId") != "USF-1069":
        failures.append(fail("USF-DATA-REHEARSAL-001", "parentIssueId must be USF-1069", "parentIssueId"))
    if doc.get("ownerIssueId") != "USF-1075":
        failures.append(fail("USF-DATA-REHEARSAL-001", "ownerIssueId must be USF-1075", "ownerIssueId"))
    if doc.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-DATA-REHEARSAL-001", "generatedReportAuthority must be lower-authority-summary-only", "generatedReportAuthority"))
    if doc.get("authorityLevel") != "semantic-definition-supporting-map":
        failures.append(fail("USF-DATA-REHEARSAL-001", "authorityLevel must be semantic-definition-supporting-map", "authorityLevel"))
    if doc.get("schemaVersion") != "1.0.0":
        failures.append(fail("USF-DATA-REHEARSAL-001", "schemaVersion must be 1.0.0", "schemaVersion"))
    return failures


def rule_002_required_kinds_and_keys(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    rows = steps(data)
    if not rows:
        failures.append(fail("USF-DATA-REHEARSAL-002", "map declares no steps", "steps"))
        return failures
    present = {row.get("kind") for row in rows}
    missing = [kind for kind in REQUIRED_STEP_KINDS if kind not in present]
    if missing:
        failures.append(fail("USF-DATA-REHEARSAL-002", f"missing required step kinds: {', '.join(missing)}", "steps"))
    for index, row in enumerate(rows):
        for key in STEP_KEYS:
            if key not in row:
                failures.append(fail("USF-DATA-REHEARSAL-002", f"step missing key {key}", f"steps[{index}].{key}"))
        if "nonClaims" in row and not isinstance(row["nonClaims"], list):
            failures.append(fail("USF-DATA-REHEARSAL-002", "step nonClaims must be a list", f"steps[{index}].nonClaims"))
    return failures


def rule_003_status_vocab(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(steps(data)):
        status = row.get("status")
        if status not in ALLOWED_STATUSES:
            failures.append(fail("USF-DATA-REHEARSAL-003", f"invalid rehearsal status {status!r}", f"steps[{index}].status"))
    return failures


def rule_004_dev_proven_evidence_resolves(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY: no fabricated proof. Every dev-proven step must resolve to a real on-disk file."""
    failures: list[dict[str, str]] = []
    for index, row in enumerate(steps(data)):
        if row.get("status") != "dev-proven":
            continue
        ref = str(row.get("evidenceRef", ""))
        if not ref or ref == "gap" or not (ROOT / ref).is_file():
            failures.append(fail("USF-DATA-REHEARSAL-004", f"dev-proven step evidenceRef does not resolve on disk: {ref!r}", f"steps[{index}].evidenceRef"))
    return failures


def rule_005_non_dev_proven_have_next_rung(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY: every non-dev-proven step must carry a concrete next rung."""
    failures: list[dict[str, str]] = []
    for index, row in enumerate(steps(data)):
        if row.get("status") == "dev-proven":
            continue
        if not str(row.get("nextRung", "")).strip():
            failures.append(fail("USF-DATA-REHEARSAL-005", "non-dev-proven step lacks a non-empty nextRung", f"steps[{index}].nextRung"))
    return failures


def rule_006_evidence_ref_repo_relative(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(steps(data)):
        ref = str(row.get("evidenceRef", ""))
        if ref == "gap":
            continue
        if ".." in ref or ref.startswith("/") or ref.startswith("~"):
            failures.append(fail("USF-DATA-REHEARSAL-006", f"evidenceRef must be repo-relative with no path escape: {ref!r}", f"steps[{index}].evidenceRef"))
    return failures


def rule_007_synthetic_boundary_and_no_production_data(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    boundary = data["map"].get("syntheticDataBoundary")
    if not isinstance(boundary, str) or not boundary.strip():
        failures.append(fail("USF-DATA-REHEARSAL-007", "syntheticDataBoundary must be a non-empty string", "syntheticDataBoundary"))
    scan_parts = [str(boundary or "")]
    for row in steps(data):
        scan_parts.append(str(row.get("description", "")))
        scan_parts.append(str(row.get("evidenceRef", "")))
    blob = " ".join(scan_parts).lower()
    for phrase in FORBIDDEN_DATA_USE:
        if phrase in blob:
            failures.append(fail("USF-DATA-REHEARSAL-007", f"forbidden data-use phrase claimed as used: {phrase!r}", "steps"))
    return failures


def rule_008_restored_usability_stronger_than_command(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    found = [row for row in steps(data) if row.get("kind") == "restored-dataset-usability"]
    if not found:
        failures.append(fail("USF-DATA-REHEARSAL-008", "restored-dataset-usability step is missing", "steps"))
        return failures
    for row in found:
        if row.get("status") == "recorded-gap":
            continue
        text = (str(row.get("description", "")) + " " + str(row.get("evidenceRef", ""))).lower()
        if not any(keyword in text for keyword in USABILITY_KEYWORDS):
            failures.append(fail("USF-DATA-REHEARSAL-008", "restored-dataset-usability must reference a usability/verification check (stronger than command exit), or be a recorded-gap", f"steps.{row.get('stepId')}"))
    return failures


def rule_009_failed_restore_negative_path(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    found = [row for row in steps(data) if row.get("kind") == "failed-restore-negative-path"]
    if not found:
        failures.append(fail("USF-DATA-REHEARSAL-009", "failed-restore-negative-path step is missing", "steps"))
        return failures
    for row in found:
        if row.get("status") == "recorded-gap":
            continue
        text = (str(row.get("description", "")) + " " + str(row.get("evidenceRef", ""))).lower()
        if not any(keyword in text for keyword in NEGATIVE_PATH_KEYWORDS):
            failures.append(fail("USF-DATA-REHEARSAL-009", "failed-restore-negative-path must describe a fail-closed/negative outcome, or be a recorded-gap", f"steps.{row.get('stepId')}"))
    return failures


def rule_010_required_non_claims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = set(data["map"].get("nonClaims", []))
    missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
    if missing:
        failures.append(fail("USF-DATA-REHEARSAL-010", f"missing required non-claims: {', '.join(missing)}", "nonClaims"))
    return failures


def rule_011_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["map"], sort_keys=True).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in blob:
            failures.append(fail("USF-DATA-REHEARSAL-011", f"overclaim phrase detected: {phrase!r}", "map"))
    return failures


def rule_012_source_authorities_resolve(data: dict[str, Any]) -> list[dict[str, str]]:
    """The map must bind existing proof: every sourceAuthority must resolve on disk."""
    failures: list[dict[str, str]] = []
    sources = data["map"].get("sourceAuthorities")
    if not isinstance(sources, list) or not sources:
        failures.append(fail("USF-DATA-REHEARSAL-012", "sourceAuthorities must be a non-empty list", "sourceAuthorities"))
        return failures
    for index, ref in enumerate(sources):
        ref_str = str(ref)
        if ".." in ref_str or ref_str.startswith("/"):
            failures.append(fail("USF-DATA-REHEARSAL-012", f"sourceAuthority is not repo-relative: {ref_str!r}", f"sourceAuthorities[{index}]"))
        elif not (ROOT / ref_str).is_file():
            failures.append(fail("USF-DATA-REHEARSAL-012", f"sourceAuthority does not resolve on disk: {ref_str!r}", f"sourceAuthorities[{index}]"))
    return failures


def rule_013_freshness_and_no_readiness_upgrade(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    doc = data["map"]
    freshness = doc.get("currentMainFreshness")
    if not isinstance(freshness, dict) or not freshness:
        failures.append(fail("USF-DATA-REHEARSAL-013", "currentMainFreshness must be a non-empty object", "currentMainFreshness"))
    elif freshness.get("binding") != EXPECTED_FRESHNESS_BINDING:
        failures.append(fail("USF-DATA-REHEARSAL-013", f"currentMainFreshness.binding must be {EXPECTED_FRESHNESS_BINDING!r}", "currentMainFreshness.binding"))
    if doc.get("readinessClaims") != []:
        failures.append(fail("USF-DATA-REHEARSAL-013", "readinessClaims must be an empty list (map must not upgrade readiness)", "readinessClaims"))
    return failures


def rule_014_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-DATA-REHEARSAL-014", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-DATA-REHEARSAL-014", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-DATA-REHEARSAL-014", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-DATA-REHEARSAL-014", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-DATA-REHEARSAL-001": rule_001_envelope,
    "USF-DATA-REHEARSAL-002": rule_002_required_kinds_and_keys,
    "USF-DATA-REHEARSAL-003": rule_003_status_vocab,
    "USF-DATA-REHEARSAL-004": rule_004_dev_proven_evidence_resolves,
    "USF-DATA-REHEARSAL-005": rule_005_non_dev_proven_have_next_rung,
    "USF-DATA-REHEARSAL-006": rule_006_evidence_ref_repo_relative,
    "USF-DATA-REHEARSAL-007": rule_007_synthetic_boundary_and_no_production_data,
    "USF-DATA-REHEARSAL-008": rule_008_restored_usability_stronger_than_command,
    "USF-DATA-REHEARSAL-009": rule_009_failed_restore_negative_path,
    "USF-DATA-REHEARSAL-010": rule_010_required_non_claims,
    "USF-DATA-REHEARSAL-011": rule_011_no_overclaim,
    "USF-DATA-REHEARSAL-012": rule_012_source_authorities_resolve,
    "USF-DATA-REHEARSAL-013": rule_013_freshness_and_no_readiness_upgrade,
    "USF-DATA-REHEARSAL-014": rule_014_planted_defect_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def _first_index_with_status(data: dict[str, Any], status: str) -> int:
    for index, row in enumerate(steps(data)):
        if row.get("status") == status:
            return index
    return 0


def _first_index_with_kind(data: dict[str, Any], kind: str) -> int:
    for index, row in enumerate(steps(data)):
        if row.get("kind") == kind:
            return index
    return 0


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    m = copy.deepcopy(data)
    rows = m["map"]["steps"]
    if rule_id == "USF-DATA-REHEARSAL-001":
        m["map"].pop("id", None)
    elif rule_id == "USF-DATA-REHEARSAL-002":
        idx = _first_index_with_kind(m, "audit")
        rows.pop(idx)
    elif rule_id == "USF-DATA-REHEARSAL-003":
        idx = _first_index_with_status(m, "recorded-gap")
        rows[idx]["status"] = "totally-invalid-status"
    elif rule_id == "USF-DATA-REHEARSAL-004":
        idx = _first_index_with_status(m, "dev-proven")
        rows[idx]["evidenceRef"] = "docs/architecture/this-does-not-exist-xyz.json"
    elif rule_id == "USF-DATA-REHEARSAL-005":
        idx = _first_index_with_status(m, "recorded-gap")
        rows[idx]["nextRung"] = ""
    elif rule_id == "USF-DATA-REHEARSAL-006":
        idx = _first_index_with_status(m, "recorded-gap")
        rows[idx]["evidenceRef"] = "../outside/secret.json"
    elif rule_id == "USF-DATA-REHEARSAL-007":
        idx = _first_index_with_kind(m, "migration")
        rows[idx]["description"] = "Rehearse restore populated with production data snapshot."
    elif rule_id == "USF-DATA-REHEARSAL-008":
        idx = _first_index_with_kind(m, "restored-dataset-usability")
        rows[idx]["description"] = "The restore command returned exit code 0."
    elif rule_id == "USF-DATA-REHEARSAL-009":
        idx = _first_index_with_kind(m, "failed-restore-negative-path")
        rows[idx]["description"] = "The restore path completed and returned success."
    elif rule_id == "USF-DATA-REHEARSAL-010":
        m["map"]["nonClaims"] = [c for c in m["map"]["nonClaims"] if c != "no-staging-claim"]
    elif rule_id == "USF-DATA-REHEARSAL-011":
        m["map"]["title"] = m["map"]["title"] + " production ready"
    elif rule_id == "USF-DATA-REHEARSAL-012":
        m["map"]["sourceAuthorities"] = list(m["map"]["sourceAuthorities"]) + ["docs/architecture/phantom-not-real.json"]
    elif rule_id == "USF-DATA-REHEARSAL-013":
        m["map"]["readinessClaims"] = ["placeholder-readiness"]
    elif rule_id == "USF-DATA-REHEARSAL-014":
        m["planted"] = [
            {"expectedRuleIds": ["USF-DATA-REHEARSAL-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-DATA-REHEARSAL-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-DATA-REHEARSAL-014", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, clean
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        observed = {f["ruleId"] for f in run_all(mutated)}
        isolated = observed == {rule_id}
        results.append({"ruleId": rule_id, "expectedRuleIsolated": isolated, "observedRuleIds": sorted(observed)})
        if not isolated:
            failures.append(fail(rule_id, f"selftest mutation did not isolate expected rule; observed={sorted(observed)}", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-data-rehearsal",
        "mode": mode,
        "status": "pass" if not failures else "fail",
        "failureCount": len(failures),
        "failures": failures,
        "rules": RULE_IDS,
    }
    if extra:
        payload.update(extra)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not failures else 1


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in {"all", "selftest"}:
        print("usage: validate-data-rehearsal.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-DATA-REHEARSAL-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
