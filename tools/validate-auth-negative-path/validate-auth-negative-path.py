#!/usr/bin/env python3
"""Validate the USF auth/session/tenant negative-path proof catalogue (USF-1076).

Fails closed. Enforces that the negative-path catalogue:
  * carries a complete envelope owned by USF-1076 under parent USF-1069 and preserves
    generated-report lower authority,
  * covers every required negative-path dimension (missing-negative-paths),
  * only records denial / fail-closed outcomes as the negative-path expectation and never
    asserts a positive access capability as the negative-path outcome,
  * never fabricates proof: a dev-proven case MUST bind to a resolving on-disk evidence
    artefact, and every non-dev-proven case MUST carry a next rung,
  * carries audit, redaction, correlation, and telemetry references per case, each resolving
    on disk for dev-proven cases (missing-audit / missing-redaction / missing-correlation
    evidence shapes),
  * never overclaims readiness, in particular never claiming browser-session, public-gateway,
    live-IdP, or production readiness or granting access without a resolving proof
    (unsupported-access-claim / overclaim shape),
  * keeps evidence references repo-relative,
  * preserves the full non-claim set including the browser-session, public-gateway, and
    live-IdP non-claims,
  * and records at least one dev-proven or explicitly gap-recorded cross-tenant-denial case.

The catalogue is a lower-authority supporting map over the authentication-slice proof-evidence
and semantic contracts. It defines no semantics. This validator is read-only, does not execute
runtime code, and writes no evidence.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
CATALOGUE_PATH = ROOT / "docs" / "architecture" / "auth-session-tenant-negative-path-catalogue.json"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

RULE_IDS = [f"USF-AUTH-NEG-{index:03d}" for index in range(1, 15)]

REQUIRED_DIMENSIONS = [
    "role-matrix",
    "tenant-role-mismatch",
    "expired-token",
    "synthetic-token",
    "service-actor",
    "operator-only-route-access",
    "client-callable-route-access",
    "cross-tenant-denial",
]

ALLOWED_STATUSES = {"dev-proven", "recorded-gap", "test-rung-deferred"}
DEV_PROVEN = "dev-proven"
DENIAL_OUTCOMES = {"deny", "fail-closed", "forbidden", "unauthorized"}

CASE_REQUIRED_KEYS = [
    "caseId", "dimension", "scenario", "expectedOutcome", "evidenceRef", "status",
    "auditRef", "telemetryRef", "redactionRef", "correlationRef", "nonClaims",
]

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone",
    "no-browser-session-readiness-claim", "no-public-gateway-readiness-claim",
    "no-live-idp-readiness-claim",
]

FORBIDDEN_OVERCLAIMS = [
    "browser session ready", "browser-session ready", "public gateway ready",
    "public-gateway ready", "live idp ready", "live-idp ready",
    "live identity provider readiness", "production ready", "production-ready",
    "access granted without",
]

ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary", "lifecycleState",
    "ownerIssueId", "parentIssueId", "sourceAuthorities", "generatedReportAuthority",
    "currentMainFreshness", "readinessClaims", "nonClaims", "dimensions", "cases", "summary",
]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    data["catalogue"] = load_json(CATALOGUE_PATH)
    data["planted"] = []
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def cases(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["catalogue"].get("cases", [])


def resolves_on_disk(ref: Any) -> bool:
    if not isinstance(ref, str) or not ref or ref == "gap":
        return False
    if ref.startswith("/") or ".." in Path(ref).parts:
        return False
    return (ROOT / ref).is_file()


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    doc = data["catalogue"]
    for field in ENVELOPE_FIELDS:
        if field not in doc or doc.get(field) in (None, ""):
            failures.append(fail("USF-AUTH-NEG-001", f"catalogue missing envelope field {field}", field))
    if doc.get("id") != "auth-session-tenant-negative-path-catalogue":
        failures.append(fail("USF-AUTH-NEG-001", "catalogue id must be auth-session-tenant-negative-path-catalogue", "id"))
    if doc.get("ownerIssueId") != "USF-1076":
        failures.append(fail("USF-AUTH-NEG-001", "ownerIssueId must be USF-1076", "ownerIssueId"))
    if doc.get("parentIssueId") != "USF-1069":
        failures.append(fail("USF-AUTH-NEG-001", "parentIssueId must be USF-1069", "parentIssueId"))
    if doc.get("authorityLevel") != "semantic-definition-supporting-map":
        failures.append(fail("USF-AUTH-NEG-001", "authorityLevel must be semantic-definition-supporting-map", "authorityLevel"))
    if doc.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-AUTH-NEG-001", "generatedReportAuthority must preserve lower authority", "generatedReportAuthority"))
    return failures


def rule_002_dimensions_and_case_keys(data: dict[str, Any]) -> list[dict[str, str]]:
    """Required negative-path dimensions present and covered; each case complete (missing-negative-paths)."""
    failures: list[dict[str, str]] = []
    declared = data["catalogue"].get("dimensions", [])
    for dim in REQUIRED_DIMENSIONS:
        if dim not in declared:
            failures.append(fail("USF-AUTH-NEG-002", f"required dimension not declared: {dim}", "dimensions"))
    covered = {c.get("dimension") for c in cases(data)}
    for dim in REQUIRED_DIMENSIONS:
        if dim not in covered:
            failures.append(fail("USF-AUTH-NEG-002", f"required dimension has no case: {dim}", "cases"))
    for index, case in enumerate(cases(data)):
        for key in CASE_REQUIRED_KEYS:
            if key not in case:
                failures.append(fail("USF-AUTH-NEG-002", f"case missing key {key}", f"cases[{index}].{key}"))
        nc = case.get("nonClaims")
        if not isinstance(nc, list) or not nc:
            failures.append(fail("USF-AUTH-NEG-002", "case nonClaims must be a non-empty list", f"cases[{index}].nonClaims"))
    return failures


def rule_003_status_and_denial_vocab(data: dict[str, Any]) -> list[dict[str, str]]:
    """Status vocabulary valid; the negative-path expected outcome must be a denial / fail-closed value."""
    failures: list[dict[str, str]] = []
    for index, case in enumerate(cases(data)):
        if case.get("status") not in ALLOWED_STATUSES:
            failures.append(fail("USF-AUTH-NEG-003", f"invalid status {case.get('status')!r}", f"cases[{index}].status"))
        outcome = case.get("expectedOutcome")
        if outcome not in DENIAL_OUTCOMES:
            failures.append(fail("USF-AUTH-NEG-003", f"expectedOutcome {outcome!r} is not a denial/fail-closed value (no ALLOW as a negative-path outcome)", f"cases[{index}].expectedOutcome"))
    return failures


def rule_004_dev_proven_evidence_resolves(data: dict[str, Any]) -> list[dict[str, str]]:
    """A dev-proven case MUST bind to a resolving on-disk evidence artefact (no fabricated proof)."""
    failures: list[dict[str, str]] = []
    for index, case in enumerate(cases(data)):
        if case.get("status") != DEV_PROVEN:
            continue
        if not resolves_on_disk(case.get("evidenceRef")):
            failures.append(fail("USF-AUTH-NEG-004", f"dev-proven case evidenceRef does not resolve on disk: {case.get('evidenceRef')!r}", f"cases[{index}].evidenceRef"))
    return failures


def rule_005_non_dev_proven_have_next(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, case in enumerate(cases(data)):
        if case.get("status") == DEV_PROVEN:
            continue
        if not str(case.get("nextRung", "")).strip():
            failures.append(fail("USF-AUTH-NEG-005", "non-dev-proven case lacks nextRung", f"cases[{index}].nextRung"))
    return failures


def rule_006_audit_evidence(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every case carries auditRef; a dev-proven case MUST resolve it on disk (missing-audit-evidence)."""
    failures: list[dict[str, str]] = []
    for index, case in enumerate(cases(data)):
        ref = case.get("auditRef")
        if not isinstance(ref, str) or not ref:
            failures.append(fail("USF-AUTH-NEG-006", "case missing auditRef", f"cases[{index}].auditRef"))
            continue
        if case.get("status") == DEV_PROVEN and not resolves_on_disk(ref):
            failures.append(fail("USF-AUTH-NEG-006", f"dev-proven case auditRef must resolve on disk, got {ref!r}", f"cases[{index}].auditRef"))
    return failures


def rule_007_redaction_evidence(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every case carries redactionRef; a dev-proven case MUST resolve it (missing-redaction-evidence)."""
    failures: list[dict[str, str]] = []
    for index, case in enumerate(cases(data)):
        ref = case.get("redactionRef")
        if not isinstance(ref, str) or not ref:
            failures.append(fail("USF-AUTH-NEG-007", "case missing redactionRef", f"cases[{index}].redactionRef"))
            continue
        if case.get("status") == DEV_PROVEN and not resolves_on_disk(ref):
            failures.append(fail("USF-AUTH-NEG-007", f"dev-proven case redactionRef must resolve on disk, got {ref!r}", f"cases[{index}].redactionRef"))
    return failures


def rule_008_correlation_evidence(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every case carries correlationRef; a dev-proven case MUST resolve it (missing-correlation-evidence)."""
    failures: list[dict[str, str]] = []
    for index, case in enumerate(cases(data)):
        ref = case.get("correlationRef")
        if not isinstance(ref, str) or not ref:
            failures.append(fail("USF-AUTH-NEG-008", "case missing correlationRef", f"cases[{index}].correlationRef"))
            continue
        if case.get("status") == DEV_PROVEN and not resolves_on_disk(ref):
            failures.append(fail("USF-AUTH-NEG-008", f"dev-proven case correlationRef must resolve on disk, got {ref!r}", f"cases[{index}].correlationRef"))
    return failures


def rule_009_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    """No unsupported access / readiness overclaim strings, and no positive access asserted as proven."""
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["catalogue"], sort_keys=True).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in blob:
            failures.append(fail("USF-AUTH-NEG-009", f"overclaim phrase detected: {phrase!r}", "catalogue"))
    if data["catalogue"].get("readinessClaims"):
        failures.append(fail("USF-AUTH-NEG-009", "catalogue must not assert readinessClaims", "readinessClaims"))
    for index, case in enumerate(cases(data)):
        # a dev-proven negative-path case may never record a positive access grant as PROVEN.
        if case.get("status") != DEV_PROVEN:
            continue
        if case.get("expectedOutcome") in DENIAL_OUTCOMES:
            continue
        failures.append(fail("USF-AUTH-NEG-009", "dev-proven case claims a positive access capability as proven", f"cases[{index}].expectedOutcome"))
    return failures


def rule_010_repo_relative(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    ref_keys = ("evidenceRef", "auditRef", "telemetryRef", "redactionRef", "correlationRef")
    for index, case in enumerate(cases(data)):
        for key in ref_keys:
            ref = case.get(key)
            if not isinstance(ref, str) or ref in ("", "gap"):
                continue
            if ref.startswith("/") or ".." in Path(ref).parts:
                failures.append(fail("USF-AUTH-NEG-010", f"{key} must be repo-relative (no leading / or ..): {ref!r}", f"cases[{index}].{key}"))
    return failures


def rule_011_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = set(data["catalogue"].get("nonClaims", []))
    missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
    if missing:
        failures.append(fail("USF-AUTH-NEG-011", f"catalogue missing non-claims: {', '.join(missing)}", "nonClaims"))
    return failures


def rule_012_cross_tenant_covered(data: dict[str, Any]) -> list[dict[str, str]]:
    """cross-tenant-denial must have at least one dev-proven OR explicitly gap-recorded case."""
    failures: list[dict[str, str]] = []
    accepted = {DEV_PROVEN, "recorded-gap"}
    matches = [c for c in cases(data) if c.get("dimension") == "cross-tenant-denial" and c.get("status") in accepted]
    if not matches:
        failures.append(fail("USF-AUTH-NEG-012", "cross-tenant-denial dimension needs at least one dev-proven or recorded-gap case", "cases"))
    return failures


def rule_013_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-AUTH-NEG-013", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-AUTH-NEG-013", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-AUTH-NEG-013", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-AUTH-NEG-013", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


def rule_014_telemetry_evidence(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every case carries telemetryRef; a dev-proven case MUST resolve it on disk."""
    failures: list[dict[str, str]] = []
    for index, case in enumerate(cases(data)):
        ref = case.get("telemetryRef")
        if not isinstance(ref, str) or not ref:
            failures.append(fail("USF-AUTH-NEG-014", "case missing telemetryRef", f"cases[{index}].telemetryRef"))
            continue
        if case.get("status") == DEV_PROVEN and not resolves_on_disk(ref):
            failures.append(fail("USF-AUTH-NEG-014", f"dev-proven case telemetryRef must resolve on disk, got {ref!r}", f"cases[{index}].telemetryRef"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-AUTH-NEG-001": rule_001_envelope,
    "USF-AUTH-NEG-002": rule_002_dimensions_and_case_keys,
    "USF-AUTH-NEG-003": rule_003_status_and_denial_vocab,
    "USF-AUTH-NEG-004": rule_004_dev_proven_evidence_resolves,
    "USF-AUTH-NEG-005": rule_005_non_dev_proven_have_next,
    "USF-AUTH-NEG-006": rule_006_audit_evidence,
    "USF-AUTH-NEG-007": rule_007_redaction_evidence,
    "USF-AUTH-NEG-008": rule_008_correlation_evidence,
    "USF-AUTH-NEG-009": rule_009_no_overclaim,
    "USF-AUTH-NEG-010": rule_010_repo_relative,
    "USF-AUTH-NEG-011": rule_011_nonclaims,
    "USF-AUTH-NEG-012": rule_012_cross_tenant_covered,
    "USF-AUTH-NEG-013": rule_013_planted_defect_coverage,
    "USF-AUTH-NEG-014": rule_014_telemetry_evidence,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def _first_index(data: dict[str, Any], status: str) -> int:
    for index, case in enumerate(cases(data)):
        if case.get("status") == status:
            return index
    return 0


def _first_dim_index(data: dict[str, Any], dim: str) -> int:
    for index, case in enumerate(cases(data)):
        if case.get("dimension") == dim:
            return index
    return 0


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    m = copy.deepcopy(data)
    cs = m["catalogue"]["cases"]
    if rule_id == "USF-AUTH-NEG-001":
        m["catalogue"]["ownerIssueId"] = "USF-9999"
    elif rule_id == "USF-AUTH-NEG-002":
        m["catalogue"]["dimensions"] = [d for d in m["catalogue"]["dimensions"] if d != "role-matrix"]
    elif rule_id == "USF-AUTH-NEG-003":
        cs[0]["expectedOutcome"] = "allow"
    elif rule_id == "USF-AUTH-NEG-004":
        i = _first_index(m, DEV_PROVEN)
        cs[i]["evidenceRef"] = "evidence/proof-evidence/does-not-exist.json"
    elif rule_id == "USF-AUTH-NEG-005":
        i = _first_index(m, "recorded-gap")
        cs[i]["nextRung"] = ""
    elif rule_id == "USF-AUTH-NEG-006":
        i = _first_index(m, DEV_PROVEN)
        cs[i]["auditRef"] = "gap"
    elif rule_id == "USF-AUTH-NEG-007":
        i = _first_index(m, DEV_PROVEN)
        cs[i]["redactionRef"] = "gap"
    elif rule_id == "USF-AUTH-NEG-008":
        i = _first_index(m, DEV_PROVEN)
        cs[i]["correlationRef"] = "gap"
    elif rule_id == "USF-AUTH-NEG-009":
        cs[0]["scenario"] = cs[0]["scenario"] + " live idp ready."
    elif rule_id == "USF-AUTH-NEG-010":
        i = _first_index(m, "recorded-gap")
        cs[i]["evidenceRef"] = "../secret/leak.json"
    elif rule_id == "USF-AUTH-NEG-011":
        m["catalogue"]["nonClaims"] = [c for c in m["catalogue"]["nonClaims"] if c != "no-live-idp-readiness-claim"]
    elif rule_id == "USF-AUTH-NEG-012":
        for case in cs:
            if case.get("dimension") == "cross-tenant-denial":
                case["status"] = "test-rung-deferred"
    elif rule_id == "USF-AUTH-NEG-013":
        m["planted"] = [
            {"expectedRuleIds": ["USF-AUTH-NEG-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-AUTH-NEG-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    elif rule_id == "USF-AUTH-NEG-014":
        i = _first_index(m, DEV_PROVEN)
        cs[i]["telemetryRef"] = "gap"
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-AUTH-NEG-013", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, clean
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        observed = {f["ruleId"] for f in run_all(mutated)}
        isolated = observed == {rule_id}
        results.append({"ruleId": rule_id, "expectedRuleIsolated": isolated, "observedRuleIds": sorted(observed)})
        if not isolated:
            failures.append(fail(rule_id, f"selftest mutation did not isolate expected rule; observed {sorted(observed)}", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-auth-negative-path",
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
        print("usage: validate-auth-negative-path.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-AUTH-NEG-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
