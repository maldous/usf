#!/usr/bin/env python3
"""USF rate-limit/quota/abuse-control parity validator (USF-160).

Governance tooling only. It creates no runtime files, imports no React source,
and publishes no evidence. It fails closed on guardrail invariants: controlled
policy types/scopes/classifications, fail-closed unknown policy/scope posture,
tenant-safe in-memory enforcement, API route guard wiring, safe 429/retry-after,
value-free audit/telemetry linkage, source-use honesty, and no live WAF, edge,
gateway, bot, fraud, abuse-provider, SOC, ISO, or production readiness claim.
"""
import argparse
import json
import os
import sys

RULES = {
    "USF-GUARDRAILS-001": ("blocking", "guardrail semantic model missing"),
    "USF-GUARDRAILS-002": ("blocking", "guardrail standard or source-use matrix missing"),
    "USF-GUARDRAILS-003": ("blocking", "guardrail port/adapter missing or unsafe"),
    "USF-GUARDRAILS-004": ("blocking", "guardrail API/OpenAPI route enforcement missing"),
    "USF-GUARDRAILS-005": ("blocking", "guardrail proof or command wiring missing"),
    "USF-GUARDRAILS-006": ("blocking", "guardrail tests missing required behaviours"),
    "USF-GUARDRAILS-007": ("blocking", "guardrail parity/source-use rows missing"),
    "USF-GUARDRAILS-008": ("blocking", "guardrail live-enforcement overclaim or unsafe example"),
    "USF-GUARDRAILS-009": ("blocking", "guardrail audit/observability linkage missing"),
    "USF-GUARDRAILS-SELFTEST": ("blocking", "planted guardrail defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
PORTS = "packages/ports/src/index.ts"
ADAPTER = "adapters/guardrails/src/index.ts"
SERVER = "apps/api/src/server.ts"
RUNTIME = "apps/api/src/runtime.ts"
API_SURFACE = "packages/contracts/src/api-surface.ts"
OPENAPI_JSON = "packages/openapi/openapi.json"
PROOF = "packages/proof/src/rate-limits-abuse-controls-proof.ts"
PROOF_INDEX = "packages/proof/src/index.ts"
TESTS = "tests/capabilities/rate-limits-abuse-controls.test.ts"
API_TESTS = "tests/apps/api-contracts.test.ts"
PROOF_TESTS = "tests/packages/proof.test.ts"
STANDARD = "docs/architecture/rate-limits-quotas-and-abuse-controls-standard.md"
SOURCE_USE = "docs/architecture/parity-rate-limits-abuse-controls-source-use-disposition-matrix.md"
BOOTSTRAP_SOURCE_USE = "docs/architecture/bootstrap-source-use-disposition-matrix.md"
MATRIX = "docs/architecture/react-parity-scope-classification-matrix.json"
PACKAGE = "package.json"
MAKEFILE = "Makefile"
SELFTEST_DIR = "tools/validate-parity/guardrails-planted-defects"

SOURCE_FILES = (
    CORE,
    PORTS,
    ADAPTER,
    SERVER,
    RUNTIME,
    API_SURFACE,
    OPENAPI_JSON,
    PROOF,
    PROOF_INDEX,
    TESTS,
    API_TESTS,
    PROOF_TESTS,
    STANDARD,
    SOURCE_USE,
    BOOTSTRAP_SOURCE_USE,
    PACKAGE,
    MAKEFILE,
)

FORBIDDEN_OVERCLAIMS = [
    "live waf readiness is proven",
    "live edge readiness is proven",
    "live gateway readiness is proven",
    "live abuse provider readiness is proven",
    "bot protection readiness is proven",
    "fraud provider readiness is proven",
    "distributed enforcement is production ready",
    "production abuse prevention readiness is proven",
    "soc ready",
    "iso certified",
    "production-live",
]


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append(
            {
                "severity": severity,
                "ruleId": rule_id,
                "subject": str(subject),
                "message": message or RULES.get(rule_id, ("", ""))[1],
            }
        )

    def blocking_or_error(self):
        return [item for item in self.items if item["severity"] in ("blocking", "error")]


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


def read_text(path):
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def read_json(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in SOURCE_FILES}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides.get("matrix", read_json(MATRIX))
    openapi = overrides.get("openapi", read_json(OPENAPI_JSON))
    return {"files": files, "matrix": matrix, "openapi": openapi}


def guardrail_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    rows = []
    for row in matrix.get("domains", []):
        if not isinstance(row, dict):
            continue
        rid = str(row.get("react_item_id", ""))
        summary = str(row.get("behaviour_summary", "")).lower()
        if rid.startswith("guardrails.") or "guardrail" in summary or "rate-limit" in summary:
            rows.append(row)
    return rows


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files[CORE]
    ports = files[PORTS]
    adapter = files[ADAPTER]
    server = files[SERVER]
    runtime = files[RUNTIME]
    api_surface = files[API_SURFACE]
    openapi_text = files[OPENAPI_JSON]
    proof = files[PROOF]
    proof_index = files[PROOF_INDEX]
    tests = files[TESTS]
    api_tests = files[API_TESTS]
    proof_tests = files[PROOF_TESTS]
    standard = files[STANDARD]
    source_use = files[SOURCE_USE]
    bootstrap_source_use = files[BOOTSTRAP_SOURCE_USE]
    package = files[PACKAGE]
    makefile = files[MAKEFILE]
    matrix = state["matrix"]
    openapi = state["openapi"]

    for token in [
        "GUARDRAIL_CLASSIFICATIONS",
        "GUARDRAIL_SCOPES",
        "GUARDRAIL_LIFECYCLES",
        "GUARDRAIL_DECISIONS",
        "GuardrailValidationError",
        "validateGuardrailPolicy",
        "createGuardrailDecision",
        "guardrailHttpStatus",
    ]:
        if token not in core:
            F.add("USF-GUARDRAILS-001", CORE, f"core model missing {token}")
    if "export const GUARDRAIL_POLICY_TYPES = Object.freeze" not in core:
        F.add("USF-GUARDRAILS-001", CORE, "guardrail policy type declaration missing")
    for token in [
        "rate-limit",
        "quota",
        "throttle",
        "admission-control",
        "backpressure",
        "availability-protection",
        "tenant-fairness",
        "security-protection",
        "bulk-operation-protection",
        "audit-export",
        "identity-action",
        "shadow-deny",
        "policy-unknown-denied",
        "scope-unknown-denied",
        "idempotency-conflict",
    ]:
        if token not in core:
            F.add("USF-GUARDRAILS-001", CORE, f"controlled value missing {token}")
    if "provider_response" not in core or "raw_payload" not in core or "stack_trace" not in core:
        F.add("USF-GUARDRAILS-001", CORE, "audit metadata redaction does not cover provider/raw failure fields")

    if "Rate Limits, Quotas, and Abuse Controls Standard" not in standard:
        F.add("USF-GUARDRAILS-002", STANDARD, "guardrail standard missing")
    for token in [
        "Guardrails As Security And Availability Controls",
        "Policy Lifecycle",
        "Tenant Fairness",
        "Distributed Enforcement Posture",
        "Future API/Ops Surfaces",
    ]:
        if token not in standard:
            F.add("USF-GUARDRAILS-002", STANDARD, f"standard missing section {token}")
    if "Parity Rate Limits / Abuse Controls Source-Use Disposition Matrix" not in source_use:
        F.add("USF-GUARDRAILS-002", SOURCE_USE, "domain source-use matrix missing")

    if "GuardrailPort" not in ports or "evaluate(input: GuardrailEvaluationInput)" not in ports:
        F.add("USF-GUARDRAILS-003", PORTS, "GuardrailPort missing")
    for token in [
        "InMemoryGuardrailStore",
        "policy-unknown-denied",
        "scope-unknown-denied",
        "idempotency-conflict",
        "subjectRefHash",
        "liveWafReadinessClaim: false",
        "liveEdgeReadinessClaim: false",
        "productionReadinessClaim: false",
    ]:
        if token not in adapter:
            F.add("USF-GUARDRAILS-003", ADAPTER, f"adapter missing {token}")
    if "safeStatusView(): ReturnType<GuardrailPort[\"safeStatusView\"]>" not in adapter:
        F.add("USF-GUARDRAILS-003", ADAPTER, "adapter safe status view missing")

    for token in [
        "api.jobs.create.local",
        "retry-after",
        "rate_limit.exceeded",
        "guardrail.limit.exceeded",
        "rate_limit_exceeded",
    ]:
        if token not in server:
            F.add("USF-GUARDRAILS-004", SERVER, f"API guard missing {token}")
    if "async function enforceRouteGuardrail" not in server:
        F.add("USF-GUARDRAILS-004", SERVER, "API route guard helper missing")
    if "guardrails.upsertPolicy" not in runtime or "api.jobs.create.local" not in runtime:
        F.add("USF-GUARDRAILS-004", RUNTIME, "runtime guardrail seed missing")
    if "api.jobs.create.local" not in api_surface or '"429": "ApiErrorResponse"' not in api_surface:
        F.add("USF-GUARDRAILS-004", API_SURFACE, "route contract lacks guardrail 429 posture")
    if not isinstance(openapi, dict) or "429" not in openapi_text or "createJobV1" not in openapi_text:
        F.add("USF-GUARDRAILS-004", OPENAPI_JSON, "committed OpenAPI lacks guardrail 429 route response")

    if "runRateLimitsAbuseControlsProof" not in proof or "liveWafReadinessClaim: false" not in proof:
        F.add("USF-GUARDRAILS-005", PROOF, "guardrail proof missing")
    if "runRateLimitsAbuseControlsProof" not in proof_index:
        F.add("USF-GUARDRAILS-005", PROOF_INDEX, "guardrail proof export missing")
    if "proof:guardrails" not in package or "validate-guardrails.py all --json" not in package:
        F.add("USF-GUARDRAILS-005", PACKAGE, "guardrail package script wiring missing")
    if "guardrails-proof" not in makefile:
        F.add("USF-GUARDRAILS-005", MAKEFILE, "make guardrails-proof missing")

    for token in [
        "denies over the limit",
        "unknown policies, unknown scopes",
        "tenant quota accounting isolated",
        "idempotent replays",
        "provider backpressure",
    ]:
        if token not in tests:
            F.add("USF-GUARDRAILS-006", TESTS, f"capability test missing {token}")
    for token in ["side-effecting route guardrail", "retry-after", "rate_limit.exceeded"]:
        if token not in api_tests:
            F.add("USF-GUARDRAILS-006", API_TESTS, f"API test missing {token}")
    if "runRateLimitsAbuseControlsProof" not in proof_tests:
        F.add("USF-GUARDRAILS-006", PROOF_TESTS, "proof test missing")

    rows = guardrail_rows(matrix)
    if len(rows) < 15:
        F.add("USF-GUARDRAILS-007", MATRIX, "guardrail parity matrix rows incomplete")
    if not any(row.get("react_item_id") == "guardrails.rate-limits" for row in rows):
        F.add("USF-GUARDRAILS-007", MATRIX, "rate-limit row missing")
    if not any(row.get("react_item_id") == "guardrails.future-api-ops-surfaces" and row.get("usf_status") == "deferred" for row in rows):
        F.add("USF-GUARDRAILS-007", MATRIX, "future API/ops deferred row missing")
    if not all(row.get("domain_authorised") is True for row in rows if str(row.get("react_item_id", "")).startswith("guardrails.")):
        F.add("USF-GUARDRAILS-007", MATRIX, "guardrail rows are not domain-authorised")
    for path in [
        "adapters/guardrails/src/index.ts",
        "packages/proof/src/rate-limits-abuse-controls-proof.ts",
        "tests/capabilities/rate-limits-abuse-controls.test.ts",
        "tools/validate-parity/validate-guardrails.py",
    ]:
        if path not in bootstrap_source_use or path not in source_use:
            F.add("USF-GUARDRAILS-007", path, "runtime/proof/test file missing source-use disposition")

    overclaim_sources = "\n".join([standard, source_use, proof, api_surface, openapi_text])
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in overclaim_sources.lower():
            F.add("USF-GUARDRAILS-008", "guardrail-overclaim", f"overclaim phrase present: {phrase}")
    for needle in ["secret://", "Bearer synthetic-proof-token", "tenant-alpha/object/proof-key", "raw provider payload"]:
        if needle.lower() in openapi_text.lower():
            F.add("USF-GUARDRAILS-008", OPENAPI_JSON, f"OpenAPI contains unsafe guardrail example {needle}")

    if "guardrail.limit.exceeded" not in core or "guardrail.policy.unknown_denied" not in core:
        F.add("USF-GUARDRAILS-009", CORE, "guardrail audit event taxonomy missing")
    if "recordSecuritySignal" not in server or "runtime.auditRecorder.record" not in server:
        F.add("USF-GUARDRAILS-009", SERVER, "guardrail telemetry/audit linkage missing")


def apply_defect(state, defect):
    mutated = {
        "files": dict(state["files"]),
        "matrix": json.loads(json.dumps(state["matrix"])),
        "openapi": json.loads(json.dumps(state["openapi"])),
    }
    for edit in defect.get("edits", []):
        target = edit["target"]
        old = edit.get("old", "")
        new = edit.get("new", "")
        if target == "matrix":
            text = json.dumps(mutated["matrix"])
            if old not in text:
                raise AssertionError(f"old text not found in matrix for defect {defect.get('id')}")
            mutated["matrix"] = json.loads(text.replace(old, new, 1))
        elif target == "openapi":
            text = json.dumps(mutated["openapi"])
            if old not in text:
                raise AssertionError(f"old text not found in openapi for defect {defect.get('id')}")
            mutated["openapi"] = json.loads(text.replace(old, new, 1))
            mutated["files"][OPENAPI_JSON] = json.dumps(mutated["openapi"])
        else:
            text = mutated["files"].get(target, "")
            if old not in text:
                raise AssertionError(f"old text not found in {target} for defect {defect.get('id')}")
            mutated["files"][target] = text.replace(old, new, 1)
    return mutated


def run_selftest(F):
    if not os.path.isdir(SELFTEST_DIR):
        F.add("USF-GUARDRAILS-SELFTEST", SELFTEST_DIR, "guardrail planted-defects directory missing")
        return
    base = build_state()
    files = sorted(name for name in os.listdir(SELFTEST_DIR) if name.endswith(".json"))
    if len(files) < 5:
        F.add("USF-GUARDRAILS-SELFTEST", SELFTEST_DIR, "not enough guardrail planted defects")
        return
    for name in files:
        path = os.path.join(SELFTEST_DIR, name)
        defect = read_json(path)
        if not isinstance(defect, dict):
            F.add("USF-GUARDRAILS-SELFTEST", path, "planted defect is not valid JSON")
            continue
        expected = defect.get("expectedRuleId")
        child = Findings()
        try:
            run_checks(child, apply_defect(base, defect))
        except Exception as exc:  # noqa: BLE001
            child.add("USF-GUARDRAILS-SELFTEST", path, f"defect application failed: {exc}")
        if expected not in {item["ruleId"] for item in child.items}:
            F.add("USF-GUARDRAILS-SELFTEST", path, f"expected {expected} was not raised")


def emit(F, as_json):
    status = "pass" if not F.blocking_or_error() else "fail"
    payload = {"status": status, "findings": F.items}
    if as_json:
        print(json.dumps(payload, indent=2))
    else:
        print(status)
        for item in F.items:
            print(f"{item['severity']} {item['ruleId']} {item['subject']}: {item['message']}")
    return 0 if status == "pass" else 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    F = Findings()
    if args.mode == "all":
        run_checks(F)
        run_selftest(F)
    elif args.mode == "selftest":
        run_selftest(F)
    return emit(F, args.json)


if __name__ == "__main__":
    sys.exit(main())
