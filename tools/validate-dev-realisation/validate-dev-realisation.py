#!/usr/bin/env python3
"""Validate the USF dev-realisation exhaustion sweep (USF-1070) and semantic-only triage (USF-1078).

Fails closed. Enforces that the classification sweep:
  * covers every semantic contract exactly once,
  * never contradicts the higher-authority current-main capability-service realisation map
    (currentDisposition MUST equal the map's realisationDisposition — freshness by re-derivation),
  * uses only the allowed dev-realisation classification vocabulary,
  * never upgrades readiness from classification (non-claims preserved, no overclaim strings),
  * routes every dev-realisable-now capability to an owning child issue (USF-1071..1077),
  * carries a complete, classification-consistent triage block per row,
  * and that the triage document's backlog buckets are an exact projection of the sweep.

The sweep and triage are lower authority than the semantic contracts, ADRs, validators, and the
current-main map. They define no semantics. This validator is read-only and writes no runtime file.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
SPEC_SC = ROOT / "spec" / "instances" / "semantic-contract"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

SWEEP_PATH = DOCS / "dev-realisation-exhaustion-sweep.json"
TRIAGE_PATH = DOCS / "semantic-only-future-domain-triage.json"
MAP_PATH = DOCS / "current-main-capability-service-realisation-map.json"

RULE_IDS = [f"USF-DEV-REAL-{index:03d}" for index in range(1, 14)]

ALLOWED_CLASSIFICATIONS = {
    "dev-realised", "dev-realisable-now", "dev-realisable-later", "test-rung-only",
    "staging-deployment-only", "live-provider-only", "intentionally-semantic-only",
    "deprecated", "rejected",
}
DEV_NOW_OWNERS = {"USF-1071", "USF-1072", "USF-1073", "USF-1074", "USF-1075", "USF-1076", "USF-1077"}
REALISED_CLASSES = {"dev-realised", "dev-realisable-now"}

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone",
]

FORBIDDEN_OVERCLAIMS = [
    "iso certified", "iso-certified", "soc 2 certified", "soc ready", "production ready",
    "production-ready", "staging ready for real users", "compliance readiness achieved",
    "externally certified", "human acceptance achieved", "live-provider ready",
    "live provider readiness proven", "monetisation ready",
]

TRIAGE_KEYS = [
    "requiresUi", "requiresProviderIntegration", "requiresComposedDev", "requiresTest",
    "requiresStaging", "requiresDeployment", "requiresLiveProviders", "requiresHumanAcceptance",
    "nextBacklogDestination",
]

# triage document bucket -> the classification it must exactly contain
BUCKET_TO_CLASS = {
    "devRealised": "dev-realised",
    "devRealisableNow": "dev-realisable-now",
    "devRealisableLater": "dev-realisable-later",
    "testReadyBacklog": "test-rung-only",
    "stagingDeploymentBacklog": "staging-deployment-only",
    "liveProviderBacklog": "live-provider-only",
    "intentionallySemanticOnly": "intentionally-semantic-only",
    "deprecated": "deprecated",
    "rejected": "rejected",
}

ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary", "lifecycleState",
    "ownerIssueId", "parentIssueId", "sourceAuthorities", "generatedReportAuthority",
    "currentMainFreshness", "nonClaims",
]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    data["sweep"] = load_json(SWEEP_PATH)
    data["triage"] = load_json(TRIAGE_PATH)
    data["map"] = load_json(MAP_PATH)
    data["specContractCount"] = len(list(SPEC_SC.glob("*.json")))
    data["planted"] = []
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def sweep_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["sweep"].get("rows", [])


def rule_001_envelopes(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for key in ("sweep", "triage"):
        doc = data[key]
        for field in ENVELOPE_FIELDS:
            if doc.get(field) in (None, "", [], {}):
                failures.append(fail("USF-DEV-REAL-001", f"{key} missing envelope field {field}", f"{key}.{field}"))
        if doc.get("parentIssueId") != "USF-1069":
            failures.append(fail("USF-DEV-REAL-001", f"{key} parentIssueId must be USF-1069", f"{key}.parentIssueId"))
        if doc.get("generatedReportAuthority") != "lower-authority-summary-only":
            failures.append(fail("USF-DEV-REAL-001", f"{key} does not preserve generated-report lower authority", f"{key}.generatedReportAuthority"))
    if data["sweep"].get("ownerIssueId") != "USF-1070":
        failures.append(fail("USF-DEV-REAL-001", "sweep ownerIssueId must be USF-1070", "sweep.ownerIssueId"))
    if data["triage"].get("ownerIssueId") != "USF-1078":
        failures.append(fail("USF-DEV-REAL-001", "triage ownerIssueId must be USF-1078", "triage.ownerIssueId"))
    return failures


def rule_002_completeness(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    rows = sweep_rows(data)
    refs = [r.get("semanticContractRef") for r in rows]
    map_refs = {r.get("semanticContractRef") for r in data["map"].get("rows", [])}
    if len(rows) != data["specContractCount"]:
        failures.append(fail("USF-DEV-REAL-002", f"sweep row count {len(rows)} != semantic-contract instance count {data['specContractCount']}", "sweep.rows"))
    if len(refs) != len(set(refs)):
        failures.append(fail("USF-DEV-REAL-002", "duplicate semanticContractRef in sweep", "sweep.rows"))
    if set(refs) != map_refs:
        missing = sorted(map_refs - set(refs))
        extra = sorted(set(refs) - map_refs)
        failures.append(fail("USF-DEV-REAL-002", f"sweep contract set diverges from current-main map (missing={missing[:3]} extra={extra[:3]})", "sweep.rows"))
    for index, row in enumerate(rows):
        path = row.get("semanticContractPath", "")
        if not path or not (ROOT / path).is_file():
            failures.append(fail("USF-DEV-REAL-002", f"semanticContractPath does not resolve: {path!r}", f"sweep.rows[{index}].semanticContractPath"))
    return failures


def rule_003_disposition_matches_authority(data: dict[str, Any]) -> list[dict[str, str]]:
    """currentDisposition MUST equal the higher-authority current-main map (authority order + freshness)."""
    failures: list[dict[str, str]] = []
    auth = {r.get("semanticContractRef"): r.get("realisationDisposition") for r in data["map"].get("rows", [])}
    for index, row in enumerate(sweep_rows(data)):
        ref = row.get("semanticContractRef")
        expected = auth.get(ref)
        if expected is None:
            failures.append(fail("USF-DEV-REAL-003", f"contract {ref!r} absent from authoritative map", f"sweep.rows[{index}]"))
        elif row.get("currentDisposition") != expected:
            failures.append(fail("USF-DEV-REAL-003", f"currentDisposition {row.get('currentDisposition')!r} contradicts authoritative map {expected!r}", f"sweep.rows[{index}].currentDisposition"))
    return failures


def rule_004_classification_vocab(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(sweep_rows(data)):
        cls = row.get("devRealisationClassification")
        if cls not in ALLOWED_CLASSIFICATIONS:
            failures.append(fail("USF-DEV-REAL-004", f"invalid dev-realisation classification {cls!r}", f"sweep.rows[{index}].devRealisationClassification"))
    return failures


def rule_005_no_readiness_upgrade(data: dict[str, Any]) -> list[dict[str, str]]:
    """Classification MUST NOT carry a readiness claim; dev-realised is dev-only."""
    failures: list[dict[str, str]] = []
    if data["sweep"].get("readinessClaims"):
        failures.append(fail("USF-DEV-REAL-005", "sweep must not assert readinessClaims from classification", "sweep.readinessClaims"))
    if data["triage"].get("readinessClaims"):
        failures.append(fail("USF-DEV-REAL-005", "triage must not assert readinessClaims from classification", "triage.readinessClaims"))
    for index, row in enumerate(sweep_rows(data)):
        if row.get("readinessClaims"):
            failures.append(fail("USF-DEV-REAL-005", "row asserts readinessClaims", f"sweep.rows[{index}].readinessClaims"))
        if row.get("devRealisationClassification") == "dev-realised":
            tri = row.get("triage", {})
            if tri.get("requiresStaging") or tri.get("requiresDeployment") or tri.get("requiresLiveProviders") or tri.get("requiresHumanAcceptance"):
                failures.append(fail("USF-DEV-REAL-005", "dev-realised row requires staging/deployment/live/human — not dev-only", f"sweep.rows[{index}].triage"))
    return failures


def rule_006_dev_now_owners(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(sweep_rows(data)):
        if row.get("devRealisationClassification") == "dev-realisable-now":
            owner = row.get("nextIssueOrRung")
            if owner not in DEV_NOW_OWNERS:
                failures.append(fail("USF-DEV-REAL-006", f"dev-realisable-now row must name an owning child issue USF-1071..1077, got {owner!r}", f"sweep.rows[{index}].nextIssueOrRung"))
    return failures


def rule_007_non_realised_have_next(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(sweep_rows(data)):
        if row.get("devRealisationClassification") in REALISED_CLASSES:
            continue
        if not str(row.get("reason", "")).strip():
            failures.append(fail("USF-DEV-REAL-007", "non-realised row lacks reason", f"sweep.rows[{index}].reason"))
        if not str(row.get("nextIssueOrRung", "")).strip():
            failures.append(fail("USF-DEV-REAL-007", "non-realised row lacks next rung / backlog destination", f"sweep.rows[{index}].nextIssueOrRung"))
        if not str(row.get("triage", {}).get("nextBacklogDestination", "")).strip():
            failures.append(fail("USF-DEV-REAL-007", "non-realised row lacks triage.nextBacklogDestination", f"sweep.rows[{index}].triage.nextBacklogDestination"))
    return failures


def rule_008_triage_complete(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(sweep_rows(data)):
        tri = row.get("triage")
        if not isinstance(tri, dict):
            failures.append(fail("USF-DEV-REAL-008", "row missing triage object", f"sweep.rows[{index}].triage"))
            continue
        for key in TRIAGE_KEYS:
            if key not in tri:
                failures.append(fail("USF-DEV-REAL-008", f"triage missing {key}", f"sweep.rows[{index}].triage.{key}"))
            elif key != "nextBacklogDestination" and not isinstance(tri[key], bool):
                failures.append(fail("USF-DEV-REAL-008", f"triage {key} must be boolean", f"sweep.rows[{index}].triage.{key}"))
    return failures


def rule_009_triage_consistency(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(sweep_rows(data)):
        cls = row.get("devRealisationClassification")
        tri = row.get("triage", {})
        if cls == "live-provider-only" and tri.get("requiresLiveProviders") is not True:
            failures.append(fail("USF-DEV-REAL-009", "live-provider-only row must set triage.requiresLiveProviders", f"sweep.rows[{index}].triage.requiresLiveProviders"))
        if cls == "test-rung-only" and tri.get("requiresTest") is not True:
            failures.append(fail("USF-DEV-REAL-009", "test-rung-only row must set triage.requiresTest", f"sweep.rows[{index}].triage.requiresTest"))
        if cls == "staging-deployment-only" and not (tri.get("requiresStaging") or tri.get("requiresDeployment")):
            failures.append(fail("USF-DEV-REAL-009", "staging-deployment-only row must set triage.requiresStaging or requiresDeployment", f"sweep.rows[{index}].triage"))
    return failures


def rule_010_triage_projection(data: dict[str, Any]) -> list[dict[str, str]]:
    """Each triage bucket MUST be exactly the set of sweep rows of its classification."""
    failures: list[dict[str, str]] = []
    by_class: dict[str, set[str]] = {c: set() for c in ALLOWED_CLASSIFICATIONS}
    for row in sweep_rows(data):
        cls = row.get("devRealisationClassification")
        if cls in by_class:
            by_class[cls].add(row.get("semanticContractRef"))
    for bucket, cls in BUCKET_TO_CLASS.items():
        entries = data["triage"].get(bucket)
        if entries is None:
            failures.append(fail("USF-DEV-REAL-010", f"triage missing bucket {bucket}", f"triage.{bucket}"))
            continue
        bucket_refs = {e.get("semanticContractRef") for e in entries}
        if bucket_refs != by_class[cls]:
            failures.append(fail("USF-DEV-REAL-010", f"triage bucket {bucket} is not an exact projection of sweep {cls} rows", f"triage.{bucket}"))
    return failures


def rule_011_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for key in ("sweep", "triage"):
        present = set(data[key].get("nonClaims", []))
        missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
        if missing:
            failures.append(fail("USF-DEV-REAL-011", f"{key} missing non-claims: {', '.join(missing)}", f"{key}.nonClaims"))
    return failures


def rule_012_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    blob = (json.dumps(data["sweep"], sort_keys=True) + json.dumps(data["triage"], sort_keys=True)).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in blob:
            failures.append(fail("USF-DEV-REAL-012", f"overclaim phrase detected: {phrase!r}", "documents"))
    return failures


def rule_013_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-DEV-REAL-013", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-DEV-REAL-013", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-DEV-REAL-013", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-DEV-REAL-013", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-DEV-REAL-001": rule_001_envelopes,
    "USF-DEV-REAL-002": rule_002_completeness,
    "USF-DEV-REAL-003": rule_003_disposition_matches_authority,
    "USF-DEV-REAL-004": rule_004_classification_vocab,
    "USF-DEV-REAL-005": rule_005_no_readiness_upgrade,
    "USF-DEV-REAL-006": rule_006_dev_now_owners,
    "USF-DEV-REAL-007": rule_007_non_realised_have_next,
    "USF-DEV-REAL-008": rule_008_triage_complete,
    "USF-DEV-REAL-009": rule_009_triage_consistency,
    "USF-DEV-REAL-010": rule_010_triage_projection,
    "USF-DEV-REAL-011": rule_011_nonclaims,
    "USF-DEV-REAL-012": rule_012_no_overclaim,
    "USF-DEV-REAL-013": rule_013_planted_defect_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def _first_index(data: dict[str, Any], cls: str) -> int:
    for index, row in enumerate(sweep_rows(data)):
        if row.get("devRealisationClassification") == cls:
            return index
    return 0


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    m = copy.deepcopy(data)
    if rule_id == "USF-DEV-REAL-001":
        m["sweep"].pop("id", None)
    elif rule_id == "USF-DEV-REAL-002":
        m["sweep"]["rows"] = m["sweep"]["rows"][:-1]
    elif rule_id == "USF-DEV-REAL-003":
        m["sweep"]["rows"][0]["currentDisposition"] = "local-route-contract-realised" if m["sweep"]["rows"][0]["currentDisposition"] != "local-route-contract-realised" else "not-claimed"
    elif rule_id == "USF-DEV-REAL-004":
        m["sweep"]["rows"][0]["devRealisationClassification"] = "totally-invalid"
    elif rule_id == "USF-DEV-REAL-005":
        m["sweep"]["readinessClaims"] = ["production-ready"]
    elif rule_id == "USF-DEV-REAL-006":
        i = _first_index(m, "dev-realisable-now")
        m["sweep"]["rows"][i]["nextIssueOrRung"] = "USF-9999"
    elif rule_id == "USF-DEV-REAL-007":
        i = _first_index(m, "test-rung-only")
        m["sweep"]["rows"][i]["nextIssueOrRung"] = ""
    elif rule_id == "USF-DEV-REAL-008":
        m["sweep"]["rows"][0]["triage"].pop("requiresTest", None)
    elif rule_id == "USF-DEV-REAL-009":
        i = _first_index(m, "live-provider-only")
        m["sweep"]["rows"][i]["triage"]["requiresLiveProviders"] = False
    elif rule_id == "USF-DEV-REAL-010":
        if m["triage"]["testReadyBacklog"]:
            m["triage"]["testReadyBacklog"] = m["triage"]["testReadyBacklog"][:-1]
        else:
            m["triage"]["testReadyBacklog"] = [{"semanticContractRef": "phantom"}]
    elif rule_id == "USF-DEV-REAL-011":
        m["sweep"]["nonClaims"] = [c for c in m["sweep"]["nonClaims"] if c != "no-staging-claim"]
    elif rule_id == "USF-DEV-REAL-012":
        m["sweep"]["title"] = m["sweep"]["title"] + " — production ready"
    elif rule_id == "USF-DEV-REAL-013":
        m["planted"] = [
            {"expectedRuleIds": ["USF-DEV-REAL-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-DEV-REAL-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-DEV-REAL-013", "clean fixture must pass before selftest mutations", "selftest"))
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
        "validator": "validate-dev-realisation",
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
        print("usage: validate-dev-realisation.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-DEV-REAL-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
