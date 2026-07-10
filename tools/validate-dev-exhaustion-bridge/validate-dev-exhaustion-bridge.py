#!/usr/bin/env python3
"""Validate the USF-1079 dev-to-test readiness bridge + final dev-exhaustion summary + verdict.

Fails closed. Enforces that the final summary:
  * references every child deliverable (map + validator + planted-defects) and each exists on disk,
  * re-derives its semantic-contract dispositions and backlog buckets from the authoritative
    dev-realisation sweep (USF-1070) at HEAD — it cannot contradict or drift from the sweep,
  * partitions all semantic contracts into realised + explicit non-dev backlogs,
  * carries a verdict from the allowed set, justified by the evidence it references,
  * never asserts readiness from the verdict, and preserves non-claims.

Lowest-authority summary; defines no semantics; read-only; writes no runtime file.
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

SUMMARY_PATH = DOCS / "dev-exhaustion-summary.json"
SWEEP_PATH = DOCS / "dev-realisation-exhaustion-sweep.json"

RULE_IDS = [f"USF-DEV-EXH-{index:03d}" for index in range(1, 14)]

ALLOWED_VERDICTS = {
    "DEV_EXHAUSTED_READY_FOR_TEST_FOCUS",
    "DEV_EXHAUSTED_WITH_EXPLICIT_NON_DEV_BACKLOG",
    "DEV_NOT_EXHAUSTED_BLOCKED_WITH_GAPS",
}
REALISED_CLASSES = {"dev-realised", "dev-realisable-now"}

BUCKET_TO_CLASS = {
    "testReadyBacklog": "test-rung-only",
    "stagingDeploymentBacklog": "staging-deployment-only",
    "liveProviderBacklog": "live-provider-only",
    "intentionallySemanticOnly": "intentionally-semantic-only",
    "devRealisableLaterBacklog": "dev-realisable-later",
}

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone", "no-test-rung-readiness-claim",
    "verdict-is-evidence-backed-not-self-asserting-authority",
]

FORBIDDEN_OVERCLAIMS = [
    "iso certified", "production ready", "production-ready", "staging ready for real users",
    "compliance readiness achieved", "externally certified", "human acceptance achieved",
    "live-provider ready", "test focus is complete", "all testing done",
]

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
    data["summary"] = load_json(SUMMARY_PATH)
    data["sweep"] = load_json(SWEEP_PATH)
    data["planted"] = []
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def sweep_by_class(data: dict[str, Any]) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for r in data["sweep"]["rows"]:
        out.setdefault(r["devRealisationClassification"], set()).add(r["semanticContractRef"])
    return out


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    s = data["summary"]
    for field in ENVELOPE_FIELDS:
        if s.get(field) in (None, "", [], {}):
            failures.append(fail("USF-DEV-EXH-001", f"summary missing envelope field {field}", field))
    if s.get("ownerIssueId") != "USF-1079":
        failures.append(fail("USF-DEV-EXH-001", "ownerIssueId must be USF-1079", "ownerIssueId"))
    if s.get("parentIssueId") != "USF-1069":
        failures.append(fail("USF-DEV-EXH-001", "parentIssueId must be USF-1069", "parentIssueId"))
    if s.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-DEV-EXH-001", "must preserve generated-report lower authority", "generatedReportAuthority"))
    return failures


def rule_002_child_deliverables_exist(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    children = data["summary"].get("childDeliverables", [])
    if len(children) < 8:
        failures.append(fail("USF-DEV-EXH-002", f"expected >=8 child deliverables, got {len(children)}", "childDeliverables"))
    seen_issues = set()
    for index, c in enumerate(children):
        seen_issues.add(c.get("issueId"))
        for key in ("map", "validator", "plantedDefects"):
            p = c.get(key)
            if not p or not (ROOT / p).exists():
                failures.append(fail("USF-DEV-EXH-002", f"child deliverable {key} does not resolve: {p!r}", f"childDeliverables[{index}].{key}"))
    for required in ("USF-1070", "USF-1071", "USF-1072", "USF-1073", "USF-1074", "USF-1075", "USF-1076", "USF-1077", "USF-1078"):
        if required not in seen_issues:
            failures.append(fail("USF-DEV-EXH-002", f"missing child deliverable for {required}", "childDeliverables"))
    return failures


def rule_003_cross_references_resolve(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    xrefs = data["summary"].get("crossReferences", {})
    required = {"iso27001Map", "providerConsolidationMap", "authNegativePathCatalogue", "dataRehearsalMap",
               "accessibilityGate", "developerPortalDocs", "operatorWorkbench", "semanticSweep", "futureDomainTriage"}
    for key in required:
        p = xrefs.get(key)
        if not p:
            failures.append(fail("USF-DEV-EXH-003", f"missing crossReference {key}", f"crossReferences.{key}"))
        elif not (ROOT / p).exists():
            failures.append(fail("USF-DEV-EXH-003", f"crossReference {key} does not resolve: {p!r}", f"crossReferences.{key}"))
    return failures


def rule_004_dispositions_match_sweep(data: dict[str, Any]) -> list[dict[str, str]]:
    """semanticContractDispositions MUST equal the authoritative sweep (authority + freshness)."""
    failures = []
    sweep = {r["semanticContractRef"]: r["devRealisationClassification"] for r in data["sweep"]["rows"]}
    disp = data["summary"].get("semanticContractDispositions", [])
    if len(disp) != len(sweep):
        failures.append(fail("USF-DEV-EXH-004", f"disposition count {len(disp)} != sweep {len(sweep)}", "semanticContractDispositions"))
    for index, d in enumerate(disp):
        ref = d.get("semanticContractRef")
        if ref not in sweep:
            failures.append(fail("USF-DEV-EXH-004", f"disposition references unknown contract {ref!r}", f"semanticContractDispositions[{index}]"))
        elif d.get("devRealisationClassification") != sweep[ref]:
            failures.append(fail("USF-DEV-EXH-004", f"disposition for {ref} contradicts sweep", f"semanticContractDispositions[{index}]"))
    return failures


def rule_005_partition_complete(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    s = data["summary"]
    sweep_refs = {r["semanticContractRef"] for r in data["sweep"]["rows"]}
    realised = {x["semanticContractRef"] for x in s.get("realisedDevItems", [])}
    non = {x["semanticContractRef"] for x in s.get("nonRealisedItems", [])}
    if realised & non:
        failures.append(fail("USF-DEV-EXH-005", "realised and non-realised items overlap", "realisedDevItems"))
    if (realised | non) != sweep_refs:
        failures.append(fail("USF-DEV-EXH-005", "realised+non-realised do not partition the full contract set", "realisedDevItems"))
    by_class = sweep_by_class(data)
    expected_realised = by_class.get("dev-realised", set()) | by_class.get("dev-realisable-now", set())
    if realised != expected_realised:
        failures.append(fail("USF-DEV-EXH-005", "realisedDevItems set != sweep dev-realised+dev-realisable-now", "realisedDevItems"))
    return failures


def rule_006_backlogs_match_sweep(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    by_class = sweep_by_class(data)
    for bucket, cls in BUCKET_TO_CLASS.items():
        entries = data["summary"].get(bucket)
        if entries is None:
            failures.append(fail("USF-DEV-EXH-006", f"missing backlog bucket {bucket}", bucket))
            continue
        refs = {e.get("semanticContractRef") for e in entries}
        if refs != by_class.get(cls, set()):
            failures.append(fail("USF-DEV-EXH-006", f"backlog {bucket} not an exact projection of sweep {cls}", bucket))
    # deprecatedOrRejected == deprecated + rejected
    dep = {e.get("semanticContractRef") for e in data["summary"].get("deprecatedOrRejected", [])}
    if dep != (by_class.get("deprecated", set()) | by_class.get("rejected", set())):
        failures.append(fail("USF-DEV-EXH-006", "deprecatedOrRejected not an exact projection of sweep", "deprecatedOrRejected"))
    return failures


def rule_007_verdict_valid(data: dict[str, Any]) -> list[dict[str, str]]:
    v = data["summary"].get("verdict")
    if v not in ALLOWED_VERDICTS:
        return [fail("USF-DEV-EXH-007", f"verdict {v!r} not in allowed set", "verdict")]
    return []


def rule_008_verdict_justified(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    s = data["summary"]
    v = s.get("verdict")
    j = s.get("verdictJustification", {})
    if not isinstance(j, dict):
        return [fail("USF-DEV-EXH-008", "missing verdictJustification", "verdictJustification")]
    if v in ("DEV_EXHAUSTED_READY_FOR_TEST_FOCUS", "DEV_EXHAUSTED_WITH_EXPLICIT_NON_DEV_BACKLOG"):
        if not j.get("allSemanticContractsClassified"):
            failures.append(fail("USF-DEV-EXH-008", "exhausted verdict requires allSemanticContractsClassified", "verdictJustification"))
        if not j.get("devRealisableNowAllOwnedByChildDeliverable"):
            failures.append(fail("USF-DEV-EXH-008", "exhausted verdict requires every dev-realisable-now owned by a child deliverable", "verdictJustification"))
        if j.get("blockingGaps"):
            failures.append(fail("USF-DEV-EXH-008", "exhausted verdict must have no blockingGaps", "verdictJustification.blockingGaps"))
        if v == "DEV_EXHAUSTED_WITH_EXPLICIT_NON_DEV_BACKLOG" and not j.get("nonDevBacklogFullyEnumerated"):
            failures.append(fail("USF-DEV-EXH-008", "backlog verdict requires a non-empty enumerated non-dev backlog", "verdictJustification"))
    elif v == "DEV_NOT_EXHAUSTED_BLOCKED_WITH_GAPS":
        if not j.get("blockingGaps"):
            failures.append(fail("USF-DEV-EXH-008", "not-exhausted verdict must list blockingGaps", "verdictJustification.blockingGaps"))
    # independently recompute allOwned from the sweep to prevent a lie in the justification
    by_class = sweep_by_class(data)
    dev_now_refs = by_class.get("dev-realisable-now", set())
    owners = {r["semanticContractRef"]: r["nextIssueOrRung"] for r in data["sweep"]["rows"]}
    owned = {"USF-1071", "USF-1072", "USF-1073", "USF-1074", "USF-1075", "USF-1076", "USF-1077"}
    actual_all_owned = all(owners.get(ref) in owned for ref in dev_now_refs)
    if j.get("devRealisableNowAllOwnedByChildDeliverable") != actual_all_owned:
        failures.append(fail("USF-DEV-EXH-008", "verdictJustification.devRealisableNowAllOwnedByChildDeliverable disagrees with the sweep", "verdictJustification"))
    return failures


def rule_009_realised_links(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    for index, item in enumerate(data["summary"].get("realisedDevItems", [])):
        for key in ("semanticContractPath", "realisationMap", "validatorRef", "plantedDefectsRef"):
            p = item.get(key)
            if not p or not (ROOT / p).exists():
                failures.append(fail("USF-DEV-EXH-009", f"realised item {key} does not resolve: {p!r}", f"realisedDevItems[{index}].{key}"))
    return failures


def rule_010_non_realised_have_next(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    for index, item in enumerate(data["summary"].get("nonRealisedItems", [])):
        if not str(item.get("reason", "")).strip():
            failures.append(fail("USF-DEV-EXH-010", "non-realised item lacks reason", f"nonRealisedItems[{index}].reason"))
        if not str(item.get("nextIssueOrRung", "")).strip() and not str(item.get("nextBacklogDestination", "")).strip():
            failures.append(fail("USF-DEV-EXH-010", "non-realised item lacks next rung / backlog destination", f"nonRealisedItems[{index}]"))
    return failures


def rule_011_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    present = set(data["summary"].get("nonClaims", []))
    missing = [c for c in REQUIRED_NONCLAIMS if c not in present]
    if missing:
        return [fail("USF-DEV-EXH-011", f"summary missing non-claims: {', '.join(missing)}", "nonClaims")]
    if data["summary"].get("readinessClaims"):
        return [fail("USF-DEV-EXH-011", "summary must not assert readinessClaims", "readinessClaims")]
    return []


def rule_012_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    blob = json.dumps(data["summary"], sort_keys=True).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in blob:
            failures.append(fail("USF-DEV-EXH-012", f"overclaim phrase detected: {phrase!r}", "summary"))
    return failures


def rule_013_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-DEV-EXH-013", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-DEV-EXH-013", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-DEV-EXH-013", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rid for rid, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-DEV-EXH-013", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-DEV-EXH-001": rule_001_envelope,
    "USF-DEV-EXH-002": rule_002_child_deliverables_exist,
    "USF-DEV-EXH-003": rule_003_cross_references_resolve,
    "USF-DEV-EXH-004": rule_004_dispositions_match_sweep,
    "USF-DEV-EXH-005": rule_005_partition_complete,
    "USF-DEV-EXH-006": rule_006_backlogs_match_sweep,
    "USF-DEV-EXH-007": rule_007_verdict_valid,
    "USF-DEV-EXH-008": rule_008_verdict_justified,
    "USF-DEV-EXH-009": rule_009_realised_links,
    "USF-DEV-EXH-010": rule_010_non_realised_have_next,
    "USF-DEV-EXH-011": rule_011_nonclaims,
    "USF-DEV-EXH-012": rule_012_no_overclaim,
    "USF-DEV-EXH-013": rule_013_planted_defect_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    m = copy.deepcopy(data)
    s = m["summary"]
    if rule_id == "USF-DEV-EXH-001":
        s.pop("id", None)
    elif rule_id == "USF-DEV-EXH-002":
        s["childDeliverables"][0]["map"] = "docs/architecture/does-not-exist.json"
    elif rule_id == "USF-DEV-EXH-003":
        s["crossReferences"]["iso27001Map"] = "docs/architecture/nope.json"
    elif rule_id == "USF-DEV-EXH-004":
        s["semanticContractDispositions"][0]["devRealisationClassification"] = "rejected"
    elif rule_id == "USF-DEV-EXH-005":
        s["realisedDevItems"] = s["realisedDevItems"][:-1]
    elif rule_id == "USF-DEV-EXH-006":
        if s["testReadyBacklog"]:
            s["testReadyBacklog"] = s["testReadyBacklog"][:-1]
        else:
            s["testReadyBacklog"] = [{"semanticContractRef": "phantom"}]
    elif rule_id == "USF-DEV-EXH-007":
        s["verdict"] = "DEV_TOTALLY_DONE"
    elif rule_id == "USF-DEV-EXH-008":
        s["verdictJustification"]["blockingGaps"] = ["injected gap"]
    elif rule_id == "USF-DEV-EXH-009":
        s["realisedDevItems"][0]["validatorRef"] = "tools/nope/nope.py"
    elif rule_id == "USF-DEV-EXH-010":
        if s["nonRealisedItems"]:
            s["nonRealisedItems"][0]["reason"] = ""
            s["nonRealisedItems"][0]["nextIssueOrRung"] = ""
            s["nonRealisedItems"][0]["nextBacklogDestination"] = ""
    elif rule_id == "USF-DEV-EXH-011":
        s["nonClaims"] = [c for c in s["nonClaims"] if c != "no-staging-claim"]
    elif rule_id == "USF-DEV-EXH-012":
        s["title"] = s["title"] + " — production ready"
    elif rule_id == "USF-DEV-EXH-013":
        m["planted"] = [
            {"expectedRuleIds": ["USF-DEV-EXH-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-DEV-EXH-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures = []
    results = []
    clean = run_all(data)
    if clean:
        return [fail("USF-DEV-EXH-013", "clean fixture must pass before selftest mutations", "selftest")], clean
    for rule_id in RULE_IDS:
        observed = {f["ruleId"] for f in run_all(mutate(data, rule_id))}
        passed = rule_id in observed
        results.append({"ruleId": rule_id, "expectedRuleObserved": passed, "observedRuleIds": sorted(observed)})
        if not passed:
            failures.append(fail(rule_id, "selftest mutation did not trigger expected rule", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-dev-exhaustion-bridge", "mode": mode,
        "status": "pass" if not failures else "fail", "failureCount": len(failures),
        "failures": failures, "rules": RULE_IDS,
    }
    if extra:
        payload.update(extra)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not failures else 1


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in {"all", "selftest"}:
        print("usage: validate-dev-exhaustion-bridge.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-DEV-EXH-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
