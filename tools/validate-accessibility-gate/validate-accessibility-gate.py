#!/usr/bin/env python3
"""Validate the USF-1072 Accessibility Gate dev-realisation deliverable.

Fails closed. This is a LOCAL, STATIC-SEMANTICS, dev gate over the recorded UI semantic
model (spec/instances/ui-semantic-model/*.json). It is NOT a human WCAG audit, NOT a
browser/axe-core runtime accessibility run, and asserts no product-surface UI readiness,
no human accessibility acceptance, and no WCAG conformance.

It enforces that the accessibility-gate evidence document:
  * carries the required envelope and preserves generated-report / non-claim boundaries,
  * covers exactly the surfaces re-derived from the live ui-semantic-model at HEAD
    (freshness by re-derivation — never trusts a stale recorded surface set),
  * declares a non-empty static accessibility rule-set,
  * records static evidence for EVERY applicable rule on EVERY surface (missing rule
    evidence fails closed — the gate never assumes a check passed),
  * never references a surface or component absent from the current ui-semantic-model,
  * never asserts human accessibility acceptance or product-UI-readiness overclaims,
  * keeps browser/axe-core runtime checks recorded as test-rung deferrals, never claimed
    as dev-proven,
  * and is planted-defect covered (exactly one distinct negative control per rule).

The evidence document and this validator's generated report are LOWER authority than the
ui-semantic-model instances, the ui-semantic-model schema, and the accessibility-a11y-gate
semantic contract. This validator is read-only and writes no runtime file.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
UI_MODEL_DIR = ROOT / "spec" / "instances" / "ui-semantic-model"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

EVIDENCE_PATH = DOCS / "accessibility-gate-evidence.json"

RULE_IDS = [f"USF-A11Y-{index:03d}" for index in range(1, 14)]

EXPECTED_ENVELOPE = {
    "id": "accessibility-gate-evidence",
    "parentIssueId": "USF-1069",
    "ownerIssueId": "USF-1072",
    "generatedReportAuthority": "lower-authority-summary-only",
    "authorityLevel": "semantic-definition-supporting-map",
    "lifecycleState": "active",
    "schemaVersion": "1.0.0",
}

# Envelope fields that MUST be present and non-empty (readinessClaims handled separately:
# it MUST be present but MUST be an empty list).
ENVELOPE_REQUIRED_NONEMPTY = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary", "lifecycleState",
    "ownerIssueId", "parentIssueId", "sourceAuthorities", "generatedReportAuthority",
    "currentMainFreshness", "nonClaims", "accessibilityRuleSet", "surfaces", "summary",
]

REQUIRED_SURFACE_KEYS = [
    "surfaceId", "componentRefs", "checksApplied", "staticEvidence", "deferredToTestRung",
]

RULE_SET_KEYS = ["ruleId", "description", "scope", "evidenceKind"]

EXPECTED_FRESHNESS_STATUS = "current-main"
EXPECTED_FRESHNESS_BINDING = "revalidated-against-ui-semantic-model-in-head"

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone",
    "no-human-accessibility-acceptance-claim", "no-wcag-conformance-claim",
    "no-browser-e2e-accessibility-claim",
]

# Unsupported human-acceptance phrases (spaces, so they never collide with the hyphenated
# non-claim tokens which legitimately say "no-...-acceptance-claim").
HUMAN_ACCEPTANCE_PHRASES = [
    "human verified", "human accepted", "manually audited", "wcag conformant",
]

# Product-UI readiness overclaims (spaces; hyphenated non-claim tokens do not match).
UI_READINESS_OVERCLAIM_PHRASES = [
    "ui ready", "product ui readiness", "visual parity", "ux parity",
]

# Runtime / test-rung accessibility checks that this DEV gate must NOT claim as proven.
# They are recorded as deferrals only.
TEST_RUNG_MARKERS = [
    "axe-core-automated-scan", "browser-focus-order-runtime",
    "screen-reader-announcement-runtime", "colour-contrast-ratio-measurement",
]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def derive_model_surfaces() -> dict[str, dict[str, Any]]:
    """Re-derive the authoritative surface set from the LIVE ui-semantic-model at HEAD.

    This is the freshness anchor: the evidence document is checked against this, never the
    other way round. One ui-semantic-model instance == one gated surface.
    """
    out: dict[str, dict[str, Any]] = {}
    for path in sorted(UI_MODEL_DIR.glob("*.json")):
        inst = load_json(path)
        sid = inst.get("id")
        out[sid] = {
            "surfaceId": sid,
            "instancePath": str(path.relative_to(ROOT)),
            "surface": inst.get("surface"),
            "route": inst.get("route"),
            "uiKind": inst.get("uiKind"),
            "userActions": list(inst.get("userActions", [])),
            "accessibility": list(inst.get("accessibility", [])),
            "states": list(inst.get("states", [])),
            "errors": list(inst.get("errors", [])),
        }
    return out


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    data["doc"] = load_json(EVIDENCE_PATH)
    data["derived"] = derive_model_surfaces()
    data["planted"] = []
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def surfaces(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["doc"].get("surfaces", [])


def rule_set(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["doc"].get("accessibilityRuleSet", [])


def applies_to(rule: dict[str, Any], surface: dict[str, Any]) -> bool:
    """Scope-based applicability. interactive-component rules apply only to surfaces that
    declare interactive component refs; everything else applies to every surface."""
    scope = rule.get("scope")
    if scope == "interactive-component":
        return bool(surface.get("componentRefs"))
    return True


def _is_recorded(value: Any) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return bool(value)
    return False


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    doc = data["doc"]
    for field in ENVELOPE_REQUIRED_NONEMPTY:
        if doc.get(field) in (None, "", [], {}):
            failures.append(fail("USF-A11Y-001", f"envelope missing/empty field {field}", field))
    if "readinessClaims" not in doc:
        failures.append(fail("USF-A11Y-001", "envelope missing readinessClaims", "readinessClaims"))
    elif doc.get("readinessClaims"):
        failures.append(fail("USF-A11Y-001", "readinessClaims must be empty (gate asserts no readiness)", "readinessClaims"))
    for field, expected in EXPECTED_ENVELOPE.items():
        if doc.get(field) != expected:
            failures.append(fail("USF-A11Y-001", f"{field} must be {expected!r}, got {doc.get(field)!r}", field))
    return failures


def rule_002_surface_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    """Surface count matches the live ui-semantic-model, and every surface row is well-formed."""
    failures: list[dict[str, str]] = []
    derived = data["derived"]
    rows = surfaces(data)
    if len(rows) != len(derived):
        failures.append(fail("USF-A11Y-002", f"evidence surface count {len(rows)} != re-derived ui-semantic-model surface count {len(derived)}", "surfaces"))
    for index, row in enumerate(rows):
        for key in REQUIRED_SURFACE_KEYS:
            if key not in row:
                failures.append(fail("USF-A11Y-002", f"surface missing required key {key}", f"surfaces[{index}].{key}"))
    return failures


def rule_003_rule_set(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    rules = rule_set(data)
    if not rules:
        failures.append(fail("USF-A11Y-003", "accessibilityRuleSet must be non-empty", "accessibilityRuleSet"))
    for index, rule in enumerate(rules):
        for key in RULE_SET_KEYS:
            if not (isinstance(rule.get(key), str) and rule.get(key).strip()):
                failures.append(fail("USF-A11Y-003", f"rule missing {key}", f"accessibilityRuleSet[{index}].{key}"))
    return failures


def rule_004_missing_rule_evidence(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY fail-closed: every applicable static rule on every surface has recorded evidence."""
    failures: list[dict[str, str]] = []
    rules = rule_set(data)
    for index, row in enumerate(surfaces(data)):
        applicable = [r.get("ruleId") for r in rules if applies_to(r, row)]
        checks = row.get("checksApplied", [])
        evidence = row.get("staticEvidence", {})
        for rid in applicable:
            if rid not in checks:
                failures.append(fail("USF-A11Y-004", f"surface does not apply in-scope rule {rid}", f"surfaces[{index}].checksApplied"))
            if not _is_recorded(evidence.get(rid)):
                failures.append(fail("USF-A11Y-004", f"surface missing recorded staticEvidence for rule {rid}", f"surfaces[{index}].staticEvidence.{rid}"))
    return failures


def rule_005_stale_evidence(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY freshness: binding present and every recorded surface exists in the live model."""
    failures: list[dict[str, str]] = []
    freshness = data["doc"].get("currentMainFreshness", {})
    if freshness.get("status") != EXPECTED_FRESHNESS_STATUS:
        failures.append(fail("USF-A11Y-005", f"currentMainFreshness.status must be {EXPECTED_FRESHNESS_STATUS!r}", "currentMainFreshness.status"))
    if freshness.get("binding") != EXPECTED_FRESHNESS_BINDING:
        failures.append(fail("USF-A11Y-005", f"currentMainFreshness.binding must be {EXPECTED_FRESHNESS_BINDING!r}", "currentMainFreshness.binding"))
    derived_ids = set(data["derived"].keys())
    for index, row in enumerate(surfaces(data)):
        sid = row.get("surfaceId")
        if sid not in derived_ids:
            failures.append(fail("USF-A11Y-005", f"stale evidence: surface {sid!r} absent from live ui-semantic-model", f"surfaces[{index}].surfaceId"))
    return failures


def rule_006_no_human_acceptance(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY non-claim: nothing asserts human accessibility acceptance / WCAG conformance."""
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["doc"], sort_keys=True).lower()
    for phrase in HUMAN_ACCEPTANCE_PHRASES:
        if phrase in blob:
            failures.append(fail("USF-A11Y-006", f"unsupported human-acceptance phrase detected: {phrase!r}", "document"))
    return failures


def rule_007_no_ui_readiness_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY non-claim: no product-UI-readiness / visual-parity overclaim."""
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["doc"], sort_keys=True).lower()
    for phrase in UI_READINESS_OVERCLAIM_PHRASES:
        if phrase in blob:
            failures.append(fail("USF-A11Y-007", f"product-UI-readiness overclaim phrase detected: {phrase!r}", "document"))
    return failures


def rule_008_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = set(data["doc"].get("nonClaims", []))
    missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
    if missing:
        failures.append(fail("USF-A11Y-008", f"missing required non-claims: {', '.join(missing)}", "nonClaims"))
    return failures


def rule_009_test_rung_deferral(data: dict[str, Any]) -> list[dict[str, str]]:
    """Browser/axe-core runtime checks are recorded as deferrals and never claimed dev-proven."""
    failures: list[dict[str, str]] = []
    markers = [m.lower() for m in TEST_RUNG_MARKERS]
    for index, row in enumerate(surfaces(data)):
        deferred = row.get("deferredToTestRung")
        if not (isinstance(deferred, list) and deferred):
            failures.append(fail("USF-A11Y-009", "surface must record at least one test-rung deferral (browser/axe-core)", f"surfaces[{index}].deferredToTestRung"))
            continue
        checks = set(row.get("checksApplied", []))
        for item in deferred:
            if item in checks:
                failures.append(fail("USF-A11Y-009", f"test-rung item {item!r} claimed as a dev static check", f"surfaces[{index}].checksApplied"))
        evidence_blob = " ".join(str(v) for v in row.get("staticEvidence", {}).values()).lower()
        for marker in markers:
            if marker in evidence_blob:
                failures.append(fail("USF-A11Y-009", f"test-rung item {marker!r} claimed as dev static evidence", f"surfaces[{index}].staticEvidence"))
    return failures


def rule_010_evidence_key_consistency(data: dict[str, Any]) -> list[dict[str, str]]:
    """checksApplied references only declared rules and matches staticEvidence keys exactly."""
    failures: list[dict[str, str]] = []
    rule_ids = {r.get("ruleId") for r in rule_set(data)}
    for index, row in enumerate(surfaces(data)):
        checks = set(row.get("checksApplied", []))
        evidence_keys = set(row.get("staticEvidence", {}).keys())
        dangling = sorted(checks - rule_ids)
        if dangling:
            failures.append(fail("USF-A11Y-010", f"checksApplied references undeclared rules: {dangling}", f"surfaces[{index}].checksApplied"))
        if checks != evidence_keys:
            failures.append(fail("USF-A11Y-010", "staticEvidence keys do not match checksApplied", f"surfaces[{index}].staticEvidence"))
    return failures


def rule_011_component_freshness(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every recorded component ref exists in the live ui-semantic-model surface's userActions."""
    failures: list[dict[str, str]] = []
    derived = data["derived"]
    for index, row in enumerate(surfaces(data)):
        sid = row.get("surfaceId")
        model = derived.get(sid)
        if model is None:
            continue  # unknown surface is handled by rule 005 (stale evidence)
        model_actions = set(model.get("userActions", []))
        for comp in row.get("componentRefs", []):
            if comp not in model_actions:
                failures.append(fail("USF-A11Y-011", f"componentRef {comp!r} absent from live ui-semantic-model userActions", f"surfaces[{index}].componentRefs"))
    return failures


def rule_012_summary_consistency(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    summary = data["doc"].get("summary", {})
    rows = surfaces(data)
    if summary.get("surfaceCount") != len(rows):
        failures.append(fail("USF-A11Y-012", f"summary.surfaceCount {summary.get('surfaceCount')} != {len(rows)}", "summary.surfaceCount"))
    if summary.get("rulesChecked") != len(rule_set(data)):
        failures.append(fail("USF-A11Y-012", f"summary.rulesChecked {summary.get('rulesChecked')} != {len(rule_set(data))}", "summary.rulesChecked"))
    gaps = sum(len(row.get("deferredToTestRung", [])) for row in rows)
    if summary.get("gapsRecorded") != gaps:
        failures.append(fail("USF-A11Y-012", f"summary.gapsRecorded {summary.get('gapsRecorded')} != {gaps}", "summary.gapsRecorded"))
    return failures


def rule_013_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-A11Y-013", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-A11Y-013", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-A11Y-013", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-A11Y-013", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-A11Y-001": rule_001_envelope,
    "USF-A11Y-002": rule_002_surface_coverage,
    "USF-A11Y-003": rule_003_rule_set,
    "USF-A11Y-004": rule_004_missing_rule_evidence,
    "USF-A11Y-005": rule_005_stale_evidence,
    "USF-A11Y-006": rule_006_no_human_acceptance,
    "USF-A11Y-007": rule_007_no_ui_readiness_overclaim,
    "USF-A11Y-008": rule_008_nonclaims,
    "USF-A11Y-009": rule_009_test_rung_deferral,
    "USF-A11Y-010": rule_010_evidence_key_consistency,
    "USF-A11Y-011": rule_011_component_freshness,
    "USF-A11Y-012": rule_012_summary_consistency,
    "USF-A11Y-013": rule_013_planted_defect_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def _first_check(surface: dict[str, Any]) -> str:
    checks = surface.get("checksApplied", [])
    return checks[0] if checks else ""


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    """Inject exactly one defect for the given rule (negative control for the selftest)."""
    m = copy.deepcopy(data)
    doc = m["doc"]
    if rule_id == "USF-A11Y-001":
        doc.pop("id", None)
    elif rule_id == "USF-A11Y-002":
        doc["surfaces"][0].pop("componentRefs", None)
    elif rule_id == "USF-A11Y-003":
        doc["accessibilityRuleSet"][0].pop("scope", None)
    elif rule_id == "USF-A11Y-004":
        surface = doc["surfaces"][0]
        surface["staticEvidence"][_first_check(surface)] = ""
    elif rule_id == "USF-A11Y-005":
        doc["surfaces"][0]["surfaceId"] = "ui.phantom-surface-not-in-model"
    elif rule_id == "USF-A11Y-006":
        surface = doc["surfaces"][0]
        surface["staticEvidence"][_first_check(surface)] += " (human verified)"
    elif rule_id == "USF-A11Y-007":
        doc["title"] = doc["title"] + " — product ui readiness proven"
    elif rule_id == "USF-A11Y-008":
        doc["nonClaims"] = [c for c in doc["nonClaims"] if c != "no-wcag-conformance-claim"]
    elif rule_id == "USF-A11Y-009":
        surface = doc["surfaces"][0]
        surface["staticEvidence"][_first_check(surface)] += " axe-core-automated-scan passed"
    elif rule_id == "USF-A11Y-010":
        doc["surfaces"][0]["staticEvidence"]["a11y-static-undeclared-key"] = "orphan evidence"
    elif rule_id == "USF-A11Y-011":
        doc["surfaces"][0]["componentRefs"].append("phantom-component-not-in-model")
    elif rule_id == "USF-A11Y-012":
        doc["summary"]["surfaceCount"] = doc["summary"].get("surfaceCount", 0) + 5
    elif rule_id == "USF-A11Y-013":
        m["planted"] = [
            {"expectedRuleIds": ["USF-A11Y-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-A11Y-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-A11Y-013", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, clean
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        observed = {f["ruleId"] for f in run_all(mutated)}
        passed = rule_id in observed
        results.append({"ruleId": rule_id, "expectedFailureObserved": passed, "observedRuleIds": sorted(observed)})
        if not passed:
            failures.append(fail(rule_id, "selftest mutation did not trigger expected rule", "selftest"))
    return failures, results


def _evidence_extra(data: dict[str, Any]) -> dict[str, Any]:
    rows = surfaces(data)
    return {
        "derivedModelSurfaceCount": len(data["derived"]),
        "evidenceSurfaceCount": len(rows),
        "rulesChecked": len(rule_set(data)),
        "gapsRecorded": sum(len(r.get("deferredToTestRung", [])) for r in rows),
    }


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-accessibility-gate",
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
        print("usage: validate-accessibility-gate.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-A11Y-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data), _evidence_extra(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
