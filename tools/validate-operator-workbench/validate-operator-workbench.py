#!/usr/bin/env python3
"""Validate the USF-1073 Local Operator Console / Workbench capability map.

Fails closed. Enforces that the operator-workbench capability map:
  * carries a well-formed lower-authority envelope bound to USF-1073 (owner) / USF-1069 (parent),
  * describes a bounded local operator surface whose every operation carries the required
    metadata keys and whose operationCount matches the enumerated operations,
  * references only canonical contracts that resolve on disk (or documented map keys that do),
    never inventing a contract reference,
  * partitions every operation into a single caller class (operator-only XOR client-callable)
    whose counts reconcile with the summary,
  * declares tenant and auth boundaries for every operation,
  * records audit / telemetry / negative-path coverage explicitly (a resolving ref or the literal
    "gap" -- never a silent omission),
  * covers the required operator views, each backed by resolving contract references,
  * preserves the workbench-cannot-define-semantics boundary and never asserts that the workbench
    (an operation or a view) defines or originates a contract,
  * never upgrades readiness (no product-UI / deployment / live-provider / app-store / compliance /
    monetisation / human-acceptance claim), and
  * that each numbered rule has exactly one distinct planted defect.

The workbench is a lower-authority metadata surface. It defines no semantics. The route, interface,
command, and semantic contracts it maps remain the sole higher authority. This validator is
read-only and writes no runtime file.
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

MAP_PATH = DOCS / "operator-workbench-capability-map.json"

RULE_IDS = [f"USF-OPS-WB-{index:03d}" for index in range(1, 14)]

ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary", "lifecycleState",
    "ownerIssueId", "parentIssueId", "sourceAuthorities", "generatedReportAuthority",
    "currentMainFreshness", "readinessClaims", "nonClaims", "documentedRefs", "operations",
    "views", "summary",
]

OPERATION_KEYS = [
    "operationId", "kind", "callerClass", "canonicalContractRef", "tenantBoundary",
    "authBoundary", "sessionBoundary", "auditRef", "telemetryRef", "negativePathRef", "status",
]

ALLOWED_KINDS = {"query", "command", "route-backed"}
ALLOWED_CALLER_CLASSES = {"operator-only", "client-callable"}
ALLOWED_STATUSES = {"mapped", "recorded-gap"}
GAP = "gap"

REQUIRED_VIEWS = [
    "tenant-context", "sdk-operations", "route-backed-operations", "jobs", "files",
    "notifications", "audit-events", "provider-status", "readiness", "proof-evidence-state",
]

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone",
    "no-product-ui-readiness-claim-for-workbench", "no-app-store-claim",
    "workbench-cannot-define-semantics",
]

SEMANTIC_BOUNDARY_NONCLAIM = "workbench-cannot-define-semantics"

# Rule 8: the workbench (operations + views) must never assert it defines/originates a contract.
FORBIDDEN_ORIGINATION = [
    "defines-semantics", "defines the semantics", "defines-contract", "originates-contract",
    "originates the contract", "semantic-authority", "authoritative-definition", "source-of-truth",
]

# Rule 9: no forward-stage / product-surface readiness claim (positive assertions only).
FORBIDDEN_STAGE_CLAIMS = [
    "product-ui-shipped", "app-store-approved", "deployed-to-production",
    "live-provider-connected", "browser-e2e-passed", "public-api-published",
]

# Rule 11: general overclaim scan.
FORBIDDEN_OVERCLAIMS = [
    "iso-certified", "iso 27001 certified", "soc 2 certified", "externally certified",
    "human acceptance achieved", "compliance readiness achieved", "monetisation live",
    "production readiness achieved",
]


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


def operations(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["map"].get("operations", [])


def views(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["map"].get("views", [])


def documented_refs(data: dict[str, Any]) -> dict[str, str]:
    refs = data["map"].get("documentedRefs", {})
    return refs if isinstance(refs, dict) else {}


def ref_resolves(data: dict[str, Any], ref: Any) -> bool:
    """A reference resolves if it is an on-disk file OR a documented map key whose target exists."""
    if not isinstance(ref, str) or not ref:
        return False
    if (ROOT / ref).is_file():
        return True
    target = documented_refs(data).get(ref)
    if isinstance(target, str) and target and (ROOT / target).is_file():
        return True
    return False


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    doc = data["map"]
    for field in ENVELOPE_FIELDS:
        if field not in doc or doc.get(field) in (None, ""):
            failures.append(fail("USF-OPS-WB-001", f"map missing envelope field {field}", field))
    if doc.get("id") != "operator-workbench-capability-map":
        failures.append(fail("USF-OPS-WB-001", "map id must be operator-workbench-capability-map", "id"))
    if doc.get("schemaVersion") != "1.0.0":
        failures.append(fail("USF-OPS-WB-001", "map schemaVersion must be 1.0.0", "schemaVersion"))
    if doc.get("ownerIssueId") != "USF-1073":
        failures.append(fail("USF-OPS-WB-001", "map ownerIssueId must be USF-1073", "ownerIssueId"))
    if doc.get("parentIssueId") != "USF-1069":
        failures.append(fail("USF-OPS-WB-001", "map parentIssueId must be USF-1069", "parentIssueId"))
    if doc.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-OPS-WB-001", "map does not preserve generated-report lower authority", "generatedReportAuthority"))
    if doc.get("authorityLevel") != "semantic-definition-supporting-map":
        failures.append(fail("USF-OPS-WB-001", "map authorityLevel must be semantic-definition-supporting-map", "authorityLevel"))
    fresh = doc.get("currentMainFreshness")
    if not isinstance(fresh, dict) or fresh.get("status") != "current-main":
        failures.append(fail("USF-OPS-WB-001", "currentMainFreshness.status must be current-main", "currentMainFreshness.status"))
    return failures


def rule_002_operation_keys(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    ops = operations(data)
    for index, op in enumerate(ops):
        if not isinstance(op, dict):
            failures.append(fail("USF-OPS-WB-002", "operation is not an object", f"operations[{index}]"))
            continue
        for key in OPERATION_KEYS:
            if key not in op:
                failures.append(fail("USF-OPS-WB-002", f"operation missing required key {key}", f"operations[{index}].{key}"))
    declared = data["map"].get("summary", {}).get("operationCount")
    if declared != len(ops):
        failures.append(fail("USF-OPS-WB-002", f"summary.operationCount {declared} != len(operations) {len(ops)}", "summary.operationCount"))
    return failures


def rule_003_canonical_resolves(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every canonicalContractRef must resolve to a real contract; invented refs fail closed."""
    failures: list[dict[str, str]] = []
    for index, op in enumerate(operations(data)):
        ref = op.get("canonicalContractRef")
        if not ref_resolves(data, ref):
            failures.append(fail("USF-OPS-WB-003", f"canonicalContractRef does not resolve: {ref!r}", f"operations[{index}].canonicalContractRef"))
    return failures


def rule_004_caller_partition(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    ops = operations(data)
    for index, op in enumerate(ops):
        if op.get("callerClass") not in ALLOWED_CALLER_CLASSES:
            failures.append(fail("USF-OPS-WB-004", f"invalid callerClass {op.get('callerClass')!r}", f"operations[{index}].callerClass"))
    operator_only = sum(1 for op in ops if op.get("callerClass") == "operator-only")
    client_callable = sum(1 for op in ops if op.get("callerClass") == "client-callable")
    summary = data["map"].get("summary", {})
    if summary.get("operatorOnlyCount") != operator_only:
        failures.append(fail("USF-OPS-WB-004", f"summary.operatorOnlyCount {summary.get('operatorOnlyCount')} != actual {operator_only}", "summary.operatorOnlyCount"))
    if summary.get("clientCallableCount") != client_callable:
        failures.append(fail("USF-OPS-WB-004", f"summary.clientCallableCount {summary.get('clientCallableCount')} != actual {client_callable}", "summary.clientCallableCount"))
    total = summary.get("operatorOnlyCount", 0) + summary.get("clientCallableCount", 0)
    if total != summary.get("operationCount"):
        failures.append(fail("USF-OPS-WB-004", f"operator-only + client-callable ({total}) != operationCount {summary.get('operationCount')}", "summary"))
    return failures


def rule_005_boundaries(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, op in enumerate(operations(data)):
        for key in ("tenantBoundary", "authBoundary", "sessionBoundary"):
            val = op.get(key)
            if not isinstance(val, str) or not val.strip():
                failures.append(fail("USF-OPS-WB-005", f"operation lacks non-empty {key}", f"operations[{index}].{key}"))
    return failures


def rule_006_audit_telemetry_negative(data: dict[str, Any]) -> list[dict[str, str]]:
    """audit / telemetry / negative-path must each be a resolving ref or the literal 'gap'."""
    failures: list[dict[str, str]] = []
    for index, op in enumerate(operations(data)):
        for key in ("auditRef", "telemetryRef", "negativePathRef"):
            ref = op.get(key)
            if ref == GAP:
                continue
            if not ref_resolves(data, ref):
                failures.append(fail("USF-OPS-WB-006", f"{key} is neither a resolving ref nor 'gap': {ref!r}", f"operations[{index}].{key}"))
    return failures


def rule_007_views(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = {v.get("viewId"): v for v in views(data) if isinstance(v, dict)}
    for view_id in REQUIRED_VIEWS:
        view = present.get(view_id)
        if view is None:
            failures.append(fail("USF-OPS-WB-007", f"required view missing: {view_id}", f"views.{view_id}"))
            continue
        refs = view.get("backingContractRefs")
        if not isinstance(refs, list) or not refs:
            failures.append(fail("USF-OPS-WB-007", f"view {view_id} lacks backingContractRefs", f"views.{view_id}.backingContractRefs"))
            continue
        for ref in refs:
            if not ref_resolves(data, ref):
                failures.append(fail("USF-OPS-WB-007", f"view {view_id} backing ref does not resolve: {ref!r}", f"views.{view_id}.backingContractRefs"))
    return failures


def rule_008_semantic_boundary(data: dict[str, Any]) -> list[dict[str, str]]:
    """The workbench must keep the cannot-define-semantics boundary and never assert origination."""
    failures: list[dict[str, str]] = []
    if SEMANTIC_BOUNDARY_NONCLAIM not in data["map"].get("nonClaims", []):
        failures.append(fail("USF-OPS-WB-008", f"nonClaims missing {SEMANTIC_BOUNDARY_NONCLAIM}", "nonClaims"))
    blob = (json.dumps(operations(data), sort_keys=True) + json.dumps(views(data), sort_keys=True)).lower()
    for token in FORBIDDEN_ORIGINATION:
        if token in blob:
            failures.append(fail("USF-OPS-WB-008", f"operation/view asserts contract origination: {token!r}", "operations|views"))
    return failures


def rule_009_no_stage_claim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["map"], sort_keys=True).lower()
    for phrase in FORBIDDEN_STAGE_CLAIMS:
        if phrase in blob:
            failures.append(fail("USF-OPS-WB-009", f"forward-stage readiness claim detected: {phrase!r}", "map"))
    return failures


def rule_010_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = set(data["map"].get("nonClaims", []))
    missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
    if missing:
        failures.append(fail("USF-OPS-WB-010", f"map missing non-claims: {', '.join(missing)}", "nonClaims"))
    if data["map"].get("readinessClaims"):
        failures.append(fail("USF-OPS-WB-010", "map must not assert readinessClaims", "readinessClaims"))
    return failures


def rule_011_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["map"], sort_keys=True).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in blob:
            failures.append(fail("USF-OPS-WB-011", f"overclaim phrase detected: {phrase!r}", "map"))
    return failures


def rule_012_kind_status(data: dict[str, Any]) -> list[dict[str, str]]:
    """kind and status use the allowed vocabulary; status must reflect gap coverage exactly."""
    failures: list[dict[str, str]] = []
    for index, op in enumerate(operations(data)):
        if op.get("kind") not in ALLOWED_KINDS:
            failures.append(fail("USF-OPS-WB-012", f"invalid kind {op.get('kind')!r}", f"operations[{index}].kind"))
        if op.get("status") not in ALLOWED_STATUSES:
            failures.append(fail("USF-OPS-WB-012", f"invalid status {op.get('status')!r}", f"operations[{index}].status"))
        has_gap = any(op.get(key) == GAP for key in ("auditRef", "telemetryRef", "negativePathRef"))
        expected = "recorded-gap" if has_gap else "mapped"
        if op.get("status") in ALLOWED_STATUSES and op.get("status") != expected:
            failures.append(fail("USF-OPS-WB-012", f"status {op.get('status')!r} inconsistent with gap coverage (expected {expected})", f"operations[{index}].status"))
    return failures


def rule_013_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-OPS-WB-013", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-OPS-WB-013", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-OPS-WB-013", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-OPS-WB-013", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-OPS-WB-001": rule_001_envelope,
    "USF-OPS-WB-002": rule_002_operation_keys,
    "USF-OPS-WB-003": rule_003_canonical_resolves,
    "USF-OPS-WB-004": rule_004_caller_partition,
    "USF-OPS-WB-005": rule_005_boundaries,
    "USF-OPS-WB-006": rule_006_audit_telemetry_negative,
    "USF-OPS-WB-007": rule_007_views,
    "USF-OPS-WB-008": rule_008_semantic_boundary,
    "USF-OPS-WB-009": rule_009_no_stage_claim,
    "USF-OPS-WB-010": rule_010_nonclaims,
    "USF-OPS-WB-011": rule_011_no_overclaim,
    "USF-OPS-WB-012": rule_012_kind_status,
    "USF-OPS-WB-013": rule_013_planted_defect_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def _first_view_index(data: dict[str, Any]) -> int:
    return 0 if views(data) else -1


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    """Introduce exactly one defect that must trigger only ``rule_id``."""
    m = copy.deepcopy(data)
    doc = m["map"]
    if rule_id == "USF-OPS-WB-001":
        doc.pop("id", None)
    elif rule_id == "USF-OPS-WB-002":
        # operationId is inspected by no other rule; dropping it isolates rule 002.
        doc["operations"][0].pop("operationId", None)
    elif rule_id == "USF-OPS-WB-003":
        doc["operations"][0]["canonicalContractRef"] = "spec/instances/interface-contract/does-not-exist-api.json"
    elif rule_id == "USF-OPS-WB-004":
        doc["summary"]["operatorOnlyCount"] = doc["summary"]["operatorOnlyCount"] + 1
    elif rule_id == "USF-OPS-WB-005":
        doc["operations"][0]["tenantBoundary"] = ""
    elif rule_id == "USF-OPS-WB-006":
        # a non-'gap', non-resolving ref on an already-mapped operation
        idx = next((i for i, op in enumerate(doc["operations"]) if op["status"] == "mapped"), 0)
        doc["operations"][idx]["auditRef"] = "spec/instances/semantic-contract/phantom-contract.json"
    elif rule_id == "USF-OPS-WB-007":
        doc["views"] = [v for v in doc["views"] if v.get("viewId") != "jobs"]
    elif rule_id == "USF-OPS-WB-008":
        doc["views"][0]["originationNote"] = "workbench defines-contract for this operation"
    elif rule_id == "USF-OPS-WB-009":
        doc["title"] = doc["title"] + " deployed-to-production"
    elif rule_id == "USF-OPS-WB-010":
        doc["nonClaims"] = [c for c in doc["nonClaims"] if c != "no-app-store-claim"]
    elif rule_id == "USF-OPS-WB-011":
        doc["title"] = doc["title"] + " iso-certified"
    elif rule_id == "USF-OPS-WB-012":
        doc["operations"][3]["kind"] = "totally-invalid"
    elif rule_id == "USF-OPS-WB-013":
        m["planted"] = [
            {"expectedRuleIds": ["USF-OPS-WB-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-OPS-WB-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-OPS-WB-013", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, clean
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        observed = {f["ruleId"] for f in run_all(mutated)}
        isolated = observed == {rule_id}
        results.append({"ruleId": rule_id, "expectedFailureObserved": rule_id in observed,
                        "isolated": isolated, "observedRuleIds": sorted(observed)})
        if not isolated:
            failures.append(fail(rule_id, f"selftest mutation not isolated; observed {sorted(observed)}", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-operator-workbench",
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
        print("usage: validate-operator-workbench.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-OPS-WB-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
