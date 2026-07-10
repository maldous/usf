#!/usr/bin/env python3
"""Validate the USF ISO 27001-aligned audit-control semantics and dev-evidence map (USF-1077).

Fails closed. This validator enforces that the control map:
  * carries a complete supporting-map envelope plus an alignment-only ISO/IEC 27001:2022 control
    profile (parentIssueId USF-1069, ownerIssueId USF-1077),
  * declares controlCount == len(controls) and gives every control row the full required key set,
  * uses only the allowed applicability and classification vocabularies,
  * cites, for every "dev-evidenced" control, a non-empty set of repository-relative evidence
    artefacts that each resolve on disk (the missing-control-evidence rule),
  * gives every partially-evidenced / future-rung control a non-empty gap, and every not-applicable
    control an explicit rationale,
  * preserves the full readiness/alignment non-claim set at the envelope,
  * never emits an ISO certification, compliance-readiness, Statement-of-Applicability completeness,
    or related overclaim string (the unsupported-compliance-claim rule),
  * keeps "semantic-map-is-not-control-satisfaction" in the non-claims and never lets a control row
    assert satisfaction or certification (the semantic-map-equals-certification overclaim rule),
  * never treats Linear or any generated report as an authority (the authority-overclaim rule),
  * cites only repository-relative, non-stale evidence paths (the stale-evidence rule),
  * keeps exactly one distinct planted defect per rule, keeps classificationCounts an exact tally,
    and keeps classification/applicability coherent.

A semantic and audit mapping is NOT control satisfaction and is NOT certification. This artefact is
lower authority than the semantic contracts, audit events, enterprise evidence, and validators it
references; it defines no semantics. This validator is read-only and writes no runtime file.
"""

from __future__ import annotations

import copy
import json
import re
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

MAP_PATH = DOCS / "iso27001-aligned-audit-control-map.json"

RULE_IDS = [f"USF-ISO27001-{index:03d}" for index in range(1, 15)]

ALLOWED_APPLICABILITY = {"applicable", "not-applicable"}
ALLOWED_CLASSIFICATIONS = {
    "dev-evidenced", "partially-evidenced", "future-rung", "external-auditor-only", "not-applicable",
}
EVIDENCED_CLASSES = {"dev-evidenced", "partially-evidenced", "future-rung", "external-auditor-only"}
GAP_REQUIRED_CLASSES = {"partially-evidenced", "future-rung"}

CONTROL_KEYS = [
    "controlId", "controlName", "applicability", "classification", "usfSemanticRefs",
    "auditEventRefs", "evidenceArtefacts", "validatorRefs", "accessControlRefs",
    "changeControlRefs", "gap", "nonClaims",
]

ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary", "lifecycleState",
    "ownerIssueId", "parentIssueId", "sourceAuthorities", "generatedReportAuthority",
    "currentMainFreshness", "readinessClaims", "nonClaims", "controlProfile", "controlCount",
    "classificationCounts", "controls",
]

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone", "no-iso-certification-claim",
    "no-external-auditor-acceptance-claim", "no-statement-of-applicability-completeness-claim",
    "semantic-map-is-not-control-satisfaction",
]

# Forbidden compliance/certification overclaim phrases (case-insensitive substring, except the bare
# token "soc" which is matched only as a whole word so "associated"/"association" do not false-fire).
FORBIDDEN_OVERCLAIMS = [
    "iso certified", "iso-certified", "certification achieved", "compliance ready",
    "compliance readiness achieved", "soc", "auditor accepted", "audit passed",
    "statement of applicability complete", "legally compliant",
]

# Forbidden authority-overclaim phrases: no Linear or generated report may be treated as authority.
FORBIDDEN_AUTHORITY = [
    "linear confirms", "linear proves", "linear is authoritative", "linear says",
    "report proves", "report confirms", "generated report proves",
]

# Control rows must never assert control satisfaction or certification.
FORBIDDEN_ROW_WORDS = ["satisfied", "certified"]

NON_SATISFACTION_NONCLAIM = "semantic-map-is-not-control-satisfaction"


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


def controls(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["map"].get("controls", [])


def _is_repo_relative(path: str) -> bool:
    return bool(path) and not path.startswith("/") and ".." not in path and not path.startswith("http")


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    doc = data["map"]
    for field in ENVELOPE_FIELDS:
        if field not in doc or doc.get(field) in (None, ""):
            failures.append(fail("USF-ISO27001-001", f"missing envelope field {field}", field))
    if doc.get("parentIssueId") != "USF-1069":
        failures.append(fail("USF-ISO27001-001", "parentIssueId must be USF-1069", "parentIssueId"))
    if doc.get("ownerIssueId") != "USF-1077":
        failures.append(fail("USF-ISO27001-001", "ownerIssueId must be USF-1077", "ownerIssueId"))
    if doc.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-ISO27001-001", "generated-report lower authority not preserved", "generatedReportAuthority"))
    profile = doc.get("controlProfile")
    if not isinstance(profile, dict):
        failures.append(fail("USF-ISO27001-001", "controlProfile missing", "controlProfile"))
    else:
        if profile.get("alignmentOnly") is not True:
            failures.append(fail("USF-ISO27001-001", "controlProfile.alignmentOnly must be true", "controlProfile.alignmentOnly"))
        if not profile.get("standard"):
            failures.append(fail("USF-ISO27001-001", "controlProfile.standard missing", "controlProfile.standard"))
    return failures


def rule_002_count_and_keys(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    rows = controls(data)
    if data["map"].get("controlCount") != len(rows):
        failures.append(fail("USF-ISO27001-002", f"controlCount {data['map'].get('controlCount')} != len(controls) {len(rows)}", "controlCount"))
    for index, row in enumerate(rows):
        for key in CONTROL_KEYS:
            if key not in row:
                failures.append(fail("USF-ISO27001-002", f"control missing key {key}", f"controls[{index}].{key}"))
        if "gap" in row and not isinstance(row["gap"], str):
            failures.append(fail("USF-ISO27001-002", "gap must be a string", f"controls[{index}].gap"))
        for list_key in ("usfSemanticRefs", "auditEventRefs", "evidenceArtefacts", "validatorRefs",
                         "accessControlRefs", "changeControlRefs", "nonClaims"):
            if list_key in row and not isinstance(row[list_key], list):
                failures.append(fail("USF-ISO27001-002", f"{list_key} must be a list", f"controls[{index}].{list_key}"))
    return failures


def rule_003_vocab(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(controls(data)):
        if row.get("applicability") not in ALLOWED_APPLICABILITY:
            failures.append(fail("USF-ISO27001-003", f"invalid applicability {row.get('applicability')!r}", f"controls[{index}].applicability"))
        if row.get("classification") not in ALLOWED_CLASSIFICATIONS:
            failures.append(fail("USF-ISO27001-003", f"invalid classification {row.get('classification')!r}", f"controls[{index}].classification"))
    return failures


def rule_004_dev_evidence_resolves(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every dev-evidenced control cites non-empty evidence; every repo-relative path resolves on disk."""
    failures: list[dict[str, str]] = []
    for index, row in enumerate(controls(data)):
        artefacts = row.get("evidenceArtefacts", []) or []
        if row.get("classification") == "dev-evidenced" and not artefacts:
            failures.append(fail("USF-ISO27001-004", f"dev-evidenced control {row.get('controlId')} cites no evidence artefacts", f"controls[{index}].evidenceArtefacts"))
        for artefact in artefacts:
            # Non-repo-relative / stale paths are the domain of rule 011; skip them here.
            if not _is_repo_relative(str(artefact)):
                continue
            if not (ROOT / str(artefact)).exists():
                failures.append(fail("USF-ISO27001-004", f"evidence artefact does not resolve on disk: {artefact!r}", f"controls[{index}].evidenceArtefacts"))
    return failures


def rule_005_gap_required(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(controls(data)):
        if row.get("classification") in GAP_REQUIRED_CLASSES and not str(row.get("gap", "")).strip():
            failures.append(fail("USF-ISO27001-005", f"{row.get('classification')} control {row.get('controlId')} lacks a gap", f"controls[{index}].gap"))
    return failures


def rule_006_not_applicable_rationale(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(controls(data)):
        if row.get("applicability") == "not-applicable":
            rationale = str(row.get("gap", "")).strip() or str(row.get("reason", "")).strip()
            if not rationale:
                failures.append(fail("USF-ISO27001-006", f"not-applicable control {row.get('controlId')} lacks a rationale", f"controls[{index}].gap"))
    return failures


def rule_007_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = set(data["map"].get("nonClaims", []))
    missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
    if missing:
        failures.append(fail("USF-ISO27001-007", f"missing required non-claims: {', '.join(missing)}", "nonClaims"))
    return failures


def rule_008_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["map"], sort_keys=True).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase == "soc":
            if re.search(r"\bsoc\b", blob):
                failures.append(fail("USF-ISO27001-008", "overclaim token detected: 'soc'", "document"))
        elif phrase in blob:
            failures.append(fail("USF-ISO27001-008", f"overclaim phrase detected: {phrase!r}", "document"))
    return failures


def rule_009_not_satisfaction(data: dict[str, Any]) -> list[dict[str, str]]:
    """semantic-map-is-not-control-satisfaction present, and no control row asserts satisfied/certified."""
    failures: list[dict[str, str]] = []
    if NON_SATISFACTION_NONCLAIM not in set(data["map"].get("nonClaims", [])):
        failures.append(fail("USF-ISO27001-009", f"non-claims must include {NON_SATISFACTION_NONCLAIM}", "nonClaims"))
    rows_blob = json.dumps(controls(data), sort_keys=True).lower()
    for word in FORBIDDEN_ROW_WORDS:
        if word in rows_blob:
            failures.append(fail("USF-ISO27001-009", f"control row asserts control {word} (map is not satisfaction/certification)", "controls"))
    return failures


def rule_010_no_lower_authority(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["map"], sort_keys=True).lower()
    for phrase in FORBIDDEN_AUTHORITY:
        if phrase in blob:
            failures.append(fail("USF-ISO27001-010", f"Linear or generated report treated as authority: {phrase!r}", "document"))
    return failures


def rule_011_repo_relative_evidence(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every cited evidence artefact must be a repository-relative, non-stale path."""
    failures: list[dict[str, str]] = []
    for index, row in enumerate(controls(data)):
        for artefact in row.get("evidenceArtefacts", []) or []:
            text = str(artefact)
            if text.startswith("/") or ".." in text or text.startswith("http"):
                failures.append(fail("USF-ISO27001-011", f"non-repo-relative / stale evidence path: {artefact!r}", f"controls[{index}].evidenceArtefacts"))
    return failures


def rule_012_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-ISO27001-012", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-ISO27001-012", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-ISO27001-012", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-ISO27001-012", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


def rule_013_classification_counts(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    declared = data["map"].get("classificationCounts", {})
    if not isinstance(declared, dict):
        return [fail("USF-ISO27001-013", "classificationCounts must be an object", "classificationCounts")]
    actual: dict[str, int] = {cls: 0 for cls in ALLOWED_CLASSIFICATIONS}
    for row in controls(data):
        cls = row.get("classification")
        if cls in actual:
            actual[cls] += 1
    for cls, count in actual.items():
        if declared.get(cls, 0) != count:
            failures.append(fail("USF-ISO27001-013", f"classificationCounts[{cls}] declared {declared.get(cls)} != actual {count}", f"classificationCounts.{cls}"))
    if sum(declared.values()) != data["map"].get("controlCount"):
        failures.append(fail("USF-ISO27001-013", "classificationCounts sum does not equal controlCount", "classificationCounts"))
    return failures


def rule_014_coherence(data: dict[str, Any]) -> list[dict[str, str]]:
    """not-applicable classification iff not-applicable applicability; evidenced classes are applicable."""
    failures: list[dict[str, str]] = []
    for index, row in enumerate(controls(data)):
        cls = row.get("classification")
        applicability = row.get("applicability")
        if cls == "not-applicable" and applicability != "not-applicable":
            failures.append(fail("USF-ISO27001-014", f"control {row.get('controlId')} classified not-applicable but applicability is {applicability!r}", f"controls[{index}]"))
        if cls in EVIDENCED_CLASSES and applicability != "applicable":
            failures.append(fail("USF-ISO27001-014", f"control {row.get('controlId')} classified {cls} but applicability is {applicability!r}", f"controls[{index}]"))
        if applicability == "not-applicable" and cls != "not-applicable":
            failures.append(fail("USF-ISO27001-014", f"control {row.get('controlId')} applicability not-applicable but classification is {cls!r}", f"controls[{index}]"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-ISO27001-001": rule_001_envelope,
    "USF-ISO27001-002": rule_002_count_and_keys,
    "USF-ISO27001-003": rule_003_vocab,
    "USF-ISO27001-004": rule_004_dev_evidence_resolves,
    "USF-ISO27001-005": rule_005_gap_required,
    "USF-ISO27001-006": rule_006_not_applicable_rationale,
    "USF-ISO27001-007": rule_007_nonclaims,
    "USF-ISO27001-008": rule_008_no_overclaim,
    "USF-ISO27001-009": rule_009_not_satisfaction,
    "USF-ISO27001-010": rule_010_no_lower_authority,
    "USF-ISO27001-011": rule_011_repo_relative_evidence,
    "USF-ISO27001-012": rule_012_planted_defect_coverage,
    "USF-ISO27001-013": rule_013_classification_counts,
    "USF-ISO27001-014": rule_014_coherence,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def _first_index(data: dict[str, Any], predicate: Callable[[dict[str, Any]], bool]) -> int:
    for index, row in enumerate(controls(data)):
        if predicate(row):
            return index
    return 0


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    """Plant exactly one defect that must trigger the named rule (fixture-scoped, never written)."""
    m = copy.deepcopy(data)
    rows = m["map"]["controls"]
    if rule_id == "USF-ISO27001-001":
        m["map"]["controlProfile"]["alignmentOnly"] = False
    elif rule_id == "USF-ISO27001-002":
        rows[0].pop("usfSemanticRefs", None)
    elif rule_id == "USF-ISO27001-003":
        rows[0]["classification"] = "totally-invalid-classification"
    elif rule_id == "USF-ISO27001-004":
        idx = _first_index(m, lambda r: r.get("classification") == "dev-evidenced")
        rows[idx]["evidenceArtefacts"] = list(rows[idx]["evidenceArtefacts"]) + ["docs/architecture/DOES-NOT-EXIST-usf1077.json"]
    elif rule_id == "USF-ISO27001-005":
        idx = _first_index(m, lambda r: r.get("classification") == "partially-evidenced")
        rows[idx]["gap"] = ""
    elif rule_id == "USF-ISO27001-006":
        idx = _first_index(m, lambda r: r.get("applicability") == "not-applicable")
        rows[idx]["gap"] = ""
    elif rule_id == "USF-ISO27001-007":
        m["map"]["nonClaims"] = [c for c in m["map"]["nonClaims"] if c != "no-staging-claim"]
    elif rule_id == "USF-ISO27001-008":
        m["map"]["title"] = m["map"]["title"] + " (ISO certified)"
    elif rule_id == "USF-ISO27001-009":
        rows[0]["gap"] = "this control is certified and its requirements are satisfied"
    elif rule_id == "USF-ISO27001-010":
        m["map"]["provenanceNote"] = "linear confirms every control mapping"
    elif rule_id == "USF-ISO27001-011":
        idx = _first_index(m, lambda r: bool(r.get("evidenceArtefacts")))
        rows[idx]["evidenceArtefacts"] = ["../../etc/passwd"] + list(rows[idx]["evidenceArtefacts"])
    elif rule_id == "USF-ISO27001-012":
        m["planted"] = [
            {"expectedRuleIds": ["USF-ISO27001-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-ISO27001-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    elif rule_id == "USF-ISO27001-013":
        counts = dict(m["map"]["classificationCounts"])
        counts["future-rung"] = counts.get("future-rung", 0) + 1
        m["map"]["classificationCounts"] = counts
    elif rule_id == "USF-ISO27001-014":
        idx = _first_index(m, lambda r: r.get("applicability") == "not-applicable")
        rows[idx]["applicability"] = "applicable"
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-ISO27001-012", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, clean
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        observed = {f["ruleId"] for f in run_all(mutated)}
        passed = rule_id in observed
        results.append({"ruleId": rule_id, "expectedFailureObserved": passed, "observedRuleIds": sorted(observed)})
        if not passed:
            failures.append(fail(rule_id, "selftest mutation did not trigger expected rule", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-iso27001-control-map",
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
        print("usage: validate-iso27001-control-map.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-ISO27001-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
