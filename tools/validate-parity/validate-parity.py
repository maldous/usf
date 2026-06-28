#!/usr/bin/env python3
"""USF React parity matrix enforcement validator.

Governance tooling only. It creates no implementation/runtime files, imports no
React source, and publishes no evidence. It fails closed on the parity-matrix
invariants that keep a full React functional parity foundation-readiness claim
honest: the machine-readable matrix
(docs/architecture/react-parity-scope-classification-matrix.json) must exist and
match its shape; every status must be canonical; every partial/missing/deferred/
requires-human-decision item must be carried by an allowed blocker; no migrated
item may lack USF tests/proofs; runtime rows must carry a source-use disposition
and must not be a React copy or mirror a React path; no full-readiness claim may
stand while the matrix is incomplete; the foundation must not require Playwright/
browser E2E; UI/Playwright test groups must be classified, with foundation
behaviour not buried as UI-only; capabilities needed by a future UI must record a
surface; and the foundation must not add UI/React/browser artefacts without
separate authority.

The matrix shape is formalised in tools/validate-parity/parity-matrix-shape.json
(validator tooling, not a rank-1 registry schema). Cross-field rules are enforced
here in Python. Planted defects under tools/validate-parity/planted-defects prove
each rule fires.
"""
import argparse
import copy
import json
import os
import subprocess
import sys
from collections import Counter

try:
    from jsonschema import Draft202012Validator
except Exception:
    Draft202012Validator = None


RULES = {
    "USF-PARITY-001": ("blocking", "parity matrix is missing or unparseable"),
    "USF-PARITY-002": ("blocking", "parity matrix row shape is invalid"),
    "USF-PARITY-003": ("blocking", "parity matrix uses a non-canonical status value"),
    "USF-PARITY-004": ("blocking", "missing item has no blocker"),
    "USF-PARITY-005": ("blocking", "partial/deferred item has no allowed carrier"),
    "USF-PARITY-006": ("blocking", "requires-human-decision item has no blocker reference"),
    "USF-PARITY-007": ("blocking", "test/proof group is unclassified"),
    "USF-PARITY-008": ("blocking", "migrated item lacks USF tests/proofs"),
    "USF-PARITY-009": ("blocking", "runtime row lacks a source-use disposition"),
    "USF-PARITY-010": ("blocking", "USF path mirrors a React path"),
    "USF-PARITY-011": ("blocking", "runtime row dispositions a React copy"),
    "USF-PARITY-012": ("blocking", "full foundation readiness claimed while matrix is incomplete"),
    "USF-PARITY-013": ("blocking", "foundation claims Playwright/browser E2E as required"),
    "USF-PARITY-014": ("blocking", "UI/Playwright test group lacks a UI-aware classification"),
    "USF-PARITY-015": ("blocking", "mixed UI/foundation test classified wholly UI-only"),
    "USF-PARITY-016": ("blocking", "capability needed by a future UI lacks a surface"),
    "USF-PARITY-017": ("blocking", "foundation adds UI/React/browser artefacts without authority"),
    "USF-PARITY-SELFTEST": ("blocking", "planted parity defect did not raise its expected rule"),
}

MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
SHAPE_PATH = "tools/validate-parity/parity-matrix-shape.json"
SELFTEST_DIR = "tools/validate-parity/planted-defects"

CANON_STATUSES = {
    "migrated",
    "covered",
    "partial",
    "missing",
    "deferred",
    "deprecated",
    "not-applicable",
    "requires-human-decision",
    "ui-ux-only-out-of-foundation-scope",
    "foundation-behaviour-rewritten-from-ui-test",
}
CARRIER_REQUIRED_STATUSES = {"partial", "missing", "deferred", "requires-human-decision"}
UI_AWARE_STATUSES = {"ui-ux-only-out-of-foundation-scope", "foundation-behaviour-rewritten-from-ui-test"}
INCOMPLETE_STATUSES = {"partial", "missing", "deferred", "requires-human-decision"}
RUNTIME_CATEGORIES = {
    "service", "port", "adapter", "route", "job", "workflow", "provider",
    "command", "event", "schema", "migration", "config", "observability", "audit",
}
DISPOSITION_VALUES = {"preserve", "replace", "refactor", "retire", "rename", "split", "merge"}
COPY_MARKERS = ("copy", "mirror", "verbatim", "as-is")
CARRIER_PATTERN = "USF-"

# UI/browser artefact markers that the UI-agnostic foundation must not contain
# without separate authority. Scanned over tracked first-party files only.
def is_ui_artefact_path(path):
    base = os.path.basename(path)
    return (
        path.endswith((".tsx", ".jsx"))
        or base.startswith("playwright.")
        or "/playwright-report" in path
        or path.split("/")[:2] == ["apps", "web"]
    )


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append({
            "severity": severity,
            "ruleId": rule_id,
            "subject": str(subject),
            "message": message or RULES.get(rule_id, ("", ""))[1],
        })

    def blocking_or_error(self):
        return [f for f in self.items if f["severity"] in ("blocking", "error")]


def find_root(start):
    current = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(current, "docs")) and os.path.isdir(os.path.join(current, "spec")):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            return os.path.abspath(start)
        current = parent


ROOT = find_root(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def tracked_paths():
    completed = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=False
    )
    if completed.returncode != 0:
        return set()
    return {line for line in completed.stdout.splitlines() if line}


def load_matrix():
    if not os.path.exists(MATRIX_PATH):
        return None, "missing"
    try:
        return read_json(MATRIX_PATH), None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


def build_state(overrides=None):
    overrides = overrides or {}
    if "matrix" in overrides:
        matrix, matrix_error = overrides["matrix"], overrides.get("matrixError")
    else:
        matrix, matrix_error = load_matrix()
    paths = set(overrides.get("paths", tracked_paths()))
    return {"matrix": matrix, "matrixError": matrix_error, "paths": paths}


def carrier_valid(row, allowed):
    blocker = row.get("blocker") or ""
    if not blocker:
        return False
    if row.get("domain_authorised") is True:
        return blocker.startswith(CARRIER_PATTERN)
    return blocker in allowed


def check_shape(F, state):
    matrix = state["matrix"]
    if matrix is None:
        F.add("USF-PARITY-001", MATRIX_PATH, f"cannot load parity matrix: {state.get('matrixError')}")
        return False
    if not isinstance(matrix, dict):
        F.add("USF-PARITY-001", MATRIX_PATH, "parity matrix is not an object")
        return False
    if Draft202012Validator is not None and os.path.exists(SHAPE_PATH):
        try:
            shape = read_json(SHAPE_PATH)
        except Exception as exc:  # noqa: BLE001
            F.add("USF-PARITY-002", SHAPE_PATH, f"cannot read shape schema: {exc}")
            return True
        errors = list(Draft202012Validator(shape).iter_errors(matrix))
        for err in errors:
            loc = "/".join(str(p) for p in err.path)
            F.add("USF-PARITY-002", f"{MATRIX_PATH}:{loc}" if loc else MATRIX_PATH, err.message[:160])
    else:
        # Minimal fallback shape check when jsonschema is unavailable.
        for key in ("domains", "uiArtefacts", "testProofGroups", "allowedPlanningCarriers"):
            if not isinstance(matrix.get(key), list):
                F.add("USF-PARITY-002", MATRIX_PATH, f"{key} must be an array")
    return True


def check_rows(F, state):
    matrix = state["matrix"]
    if not isinstance(matrix, dict):
        return
    allowed = set(matrix.get("allowedPlanningCarriers") or [])
    domains = matrix.get("domains") or []
    ui_artefacts = matrix.get("uiArtefacts") or []
    test_groups = matrix.get("testProofGroups") or []

    incomplete_blocking_present = False

    for row in domains:
        if not isinstance(row, dict):
            F.add("USF-PARITY-002", "domains", "domain row is not an object")
            continue
        rid = row.get("react_item_id", "?")
        status = row.get("usf_status")
        # 003 canonical status
        if status not in CANON_STATUSES:
            F.add("USF-PARITY-003", f"domain:{rid}", f"non-canonical usf_status: {status}")
        # carrier rules (004/005/006)
        if status in CARRIER_REQUIRED_STATUSES and not carrier_valid(row, allowed):
            if status == "missing":
                F.add("USF-PARITY-004", f"domain:{rid}", "missing item has no valid blocker")
            elif status == "requires-human-decision":
                F.add("USF-PARITY-006", f"domain:{rid}", "requires-human-decision item has no valid blocker")
            else:
                F.add("USF-PARITY-005", f"domain:{rid}", f"{status} item has no allowed carrier (blocker={row.get('blocker')!r}, domain_authorised={row.get('domain_authorised')})")
        if status in INCOMPLETE_STATUSES and row.get("blocking_foundation_readiness") is True:
            incomplete_blocking_present = True
        # 008 migrated backing
        if status == "migrated" and not (row.get("usf_tests") or row.get("usf_proofs")):
            F.add("USF-PARITY-008", f"domain:{rid}", "migrated item lacks USF tests and proofs")
        # 009/011 runtime disposition
        if row.get("category") in RUNTIME_CATEGORIES:
            disp = (row.get("source_use_disposition") or "").strip()
            if not disp:
                F.add("USF-PARITY-009", f"domain:{rid}", "runtime row lacks source_use_disposition")
            elif any(marker in disp.lower() for marker in COPY_MARKERS):
                F.add("USF-PARITY-011", f"domain:{rid}", f"runtime row dispositions a React copy: {disp}")
            elif disp not in DISPOSITION_VALUES:
                F.add("USF-PARITY-009", f"domain:{rid}", f"runtime row has invalid source_use_disposition: {disp}")
        # 010 path mirroring
        react_paths = set(row.get("react_paths") or [])
        for usf_path in row.get("usf_paths") or []:
            if "/" in usf_path and usf_path in react_paths:
                F.add("USF-PARITY-010", f"domain:{rid}", f"USF path mirrors a React path: {usf_path}")

    for row in ui_artefacts:
        if not isinstance(row, dict):
            F.add("USF-PARITY-002", "uiArtefacts", "ui artefact row is not an object")
            continue
        item = row.get("item", "?")
        if row.get("usf_status") not in CANON_STATUSES:
            F.add("USF-PARITY-003", f"ui:{item}", f"non-canonical usf_status: {row.get('usf_status')}")
        # 016 ui-needed surface
        if row.get("ui_needed") is True and not (row.get("surface") or []):
            F.add("USF-PARITY-016", f"ui:{item}", "capability needed by a future UI records no surface")
        if row.get("usf_status") in INCOMPLETE_STATUSES:
            incomplete_blocking_present = True

    for row in test_groups:
        if not isinstance(row, dict):
            F.add("USF-PARITY-002", "testProofGroups", "test/proof row is not an object")
            continue
        group = row.get("group", "?")
        classification = row.get("classification")
        # 007 unclassified
        if not classification or not str(classification).strip():
            F.add("USF-PARITY-007", f"test:{group}", "test/proof group has no classification")
            continue
        if classification not in CANON_STATUSES:
            F.add("USF-PARITY-003", f"test:{group}", f"non-canonical classification: {classification}")
        # A partial/missing/deferred/requires-human-decision test or proof group is
        # incomplete foundation work and must block any full-readiness claim (012).
        if classification in INCOMPLETE_STATUSES:
            incomplete_blocking_present = True
        # 014 UI/Playwright group must carry a UI-aware classification. Detect real
        # browser/UI suites (Playwright, React app, design system, ui reference harness,
        # TSX) rather than any path containing "e2e" (which also matches tooling like
        # tools/e2e correlation scripts).
        joined = " ".join(row.get("react_paths") or []).lower()
        looks_ui = any(m in joined for m in ("playwright", "react-enterprise-app", "ui-design-system", "ui-reference-harness", ".tsx"))
        if looks_ui and classification not in UI_AWARE_STATUSES:
            F.add("USF-PARITY-014", f"test:{group}", f"UI/Playwright group lacks a UI-aware classification: {classification}")
        # 015 mixed/foundation classified wholly UI-only
        if row.get("foundation_behaviour") is True and classification == "ui-ux-only-out-of-foundation-scope":
            F.add("USF-PARITY-015", f"test:{group}", "foundation-behaviour group classified wholly UI-only")
        # 013 (per group) only a UI/Playwright group may not be marked required for
        # foundation readiness; a non-browser foundation group may legitimately be required.
        if row.get("requiredForFoundation") is True and looks_ui:
            F.add("USF-PARITY-013", f"test:{group}", "UI/Playwright test group marked required for foundation readiness")

    # 012 readiness claim while incomplete (domains, ui artefacts, and test/proof groups)
    if matrix.get("foundationReadinessClaimed") is True and incomplete_blocking_present:
        F.add("USF-PARITY-012", MATRIX_PATH, "foundationReadinessClaimed is true while incomplete blocking items remain")
    # 013 (matrix) Playwright/browser E2E must not be required for the UI-agnostic foundation
    if matrix.get("playwrightRequiredForFoundation") is True:
        F.add("USF-PARITY-013", MATRIX_PATH, "playwrightRequiredForFoundation must be false for the UI-agnostic foundation")


def check_no_unauthorised_ui_artefacts(F, state):
    offenders = sorted(p for p in state["paths"] if is_ui_artefact_path(p))
    # An authority marker (a future authorised UI scope) would live as an ADR; none exists.
    for path in offenders:
        F.add("USF-PARITY-017", path, "UI/React/browser artefact present in the UI-agnostic foundation without separate authority")


def run_checks(F, state=None):
    state = state or build_state()
    if not check_shape(F, state):
        return
    check_rows(F, state)
    check_no_unauthorised_ui_artefacts(F, state)


def apply_mutation(base_matrix, base_paths, mutation):
    matrix = copy.deepcopy(base_matrix) if base_matrix is not None else None
    paths = set(base_paths)
    overrides = {}
    if mutation.get("removeMatrix"):
        overrides["matrix"] = None
        overrides["matrixError"] = "missing"
        overrides["paths"] = paths
        return overrides
    if "setTop" in mutation:
        for k, v in mutation["setTop"].items():
            matrix[k] = v
    if "domainsSetAll" in mutation:
        for row in matrix.get("domains", []):
            for k, v in mutation["domainsSetAll"].items():
                row[k] = v
    for section_key, op_key in (("domains", "domainPatch"), ("uiArtefacts", "uiPatch"), ("testProofGroups", "testPatch")):
        if op_key in mutation:
            patch = mutation[op_key]
            idx = patch.get("index", 0)
            row = matrix[section_key][idx]
            for k, v in patch.get("set", {}).items():
                row[k] = v
            for k in patch.get("drop", []):
                row.pop(k, None)
    if "addPath" in mutation:
        paths.add(mutation["addPath"])
    overrides["matrix"] = matrix
    overrides["paths"] = paths
    return overrides


def load_selftest_fixtures(F):
    fixtures = []
    if not os.path.isdir(SELFTEST_DIR):
        return fixtures
    for name in sorted(os.listdir(SELFTEST_DIR)):
        if not name.endswith(".json"):
            continue
        path = f"{SELFTEST_DIR}/{name}"
        try:
            fixtures.append((path, read_json(path)))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-PARITY-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        overrides = apply_mutation(base["matrix"], base["paths"], fixture.get("mutation", {}))
        local = Findings()
        run_checks(local, build_state(overrides))
        got = {item["ruleId"] for item in local.items}
        if expected not in got:
            F.add("USF-PARITY-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF React parity matrix enforcement validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["matrix", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"matrix", "all"}:
        run_checks(F)
    selftest_state = None
    if args.mode in {"selftest", "all"}:
        selftest_state = run_selftest(F)

    if args.json:
        print(json.dumps({"mode": args.mode, "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(item["ruleId"] for item in F.items))
        suffix = "CLEAN" if not F.items else json.dumps(counts)
        if selftest_state == "not-run":
            suffix += "  (selftest: none present)"
        print(f"USF parity validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
