#!/usr/bin/env python3
"""USF API/contracts posture validator (parity-api-contracts, USF-133).

Governance tooling only. It creates no implementation/runtime files, imports no React
source, and publishes no evidence. It fails closed on API-as-contract-boundary
invariants: classified routes, route-to-capability mapping, OpenAPI/implementation
coverage, PDP/auth and tenant guards, side-effect idempotency, safe error envelopes,
opaque pagination, synthetic examples, source-use honesty, and no public API,
external SDK, production, deployment, gateway, or certification readiness claim.
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

RULES = {
    "USF-API-001": ("blocking", "API route contract model missing"),
    "USF-API-002": ("blocking", "API and Contract Surface Standard missing or overclaims"),
    "USF-API-003": ("blocking", "route metadata lacks classification/capability/lifecycle policy"),
    "USF-API-004": ("blocking", "OpenAPI coverage/metadata checker missing or incomplete"),
    "USF-API-005": ("blocking", "protected/tenant-scoped routes lack guards"),
    "USF-API-006": ("blocking", "safe error envelope missing or unsafe"),
    "USF-API-007": ("blocking", "side-effecting route idempotency missing"),
    "USF-API-008": ("blocking", "pagination cursor safety missing"),
    "USF-API-009": ("blocking", "OpenAPI examples or metadata leak unsafe values or overclaim readiness"),
    "USF-API-010": ("blocking", "API proof missing or makes public/production overclaim"),
    "USF-API-011": ("blocking", "API tests missing required behaviours"),
    "USF-API-012": ("blocking", "API parity matrix rows lack authorisation/backing"),
    "USF-API-013": ("blocking", "API source-use matrix missing"),
    "USF-API-014": ("blocking", "API lifecycle/security/browser/compatibility posture missing"),
    "USF-API-SELFTEST": ("blocking", "planted API defect did not raise its expected rule"),
}

API_SURFACE = "packages/contracts/src/api-surface.ts"
CONTRACTS = "packages/contracts/src/index.ts"
SERVER = "apps/api/src/server.ts"
OPENAPI_BUILDER = "packages/openapi/src/index.ts"
OPENAPI_CHECK = "packages/openapi/src/check.ts"
OPENAPI_JSON = "packages/openapi/openapi.json"
STORE = "adapters/store/src/index.ts"
PROOF = "packages/proof/src/api-contracts-proof.ts"
PROOF_INDEX = "packages/proof/src/index.ts"
APP_TESTS = "tests/apps/api-contracts.test.ts"
OPENAPI_TESTS = "tests/packages/openapi.test.ts"
PROOF_TESTS = "tests/packages/proof.test.ts"
STANDARD = "docs/architecture/api-and-contract-surface-standard.md"
SOURCE_USE = "docs/architecture/parity-api-contracts-source-use-disposition-matrix.md"
MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
PACKAGE = "package.json"
MAKEFILE = "Makefile"
SOURCE_FILES = (
    API_SURFACE,
    CONTRACTS,
    SERVER,
    OPENAPI_BUILDER,
    OPENAPI_CHECK,
    OPENAPI_JSON,
    STORE,
    PROOF,
    PROOF_INDEX,
    APP_TESTS,
    OPENAPI_TESTS,
    PROOF_TESTS,
    STANDARD,
    SOURCE_USE,
    PACKAGE,
    MAKEFILE,
)
SELFTEST_DIR = "tools/validate-parity/api-planted-defects"

REQUIRED_CLASSIFICATIONS = {
    "public",
    "authenticated",
    "tenant-scoped",
    "system-internal",
    "operator-only",
    "break-glass",
    "audit-sensitive",
    "security-sensitive",
    "health-readiness",
    "future-ui-surface",
    "deprecated",
}

OPENAPI_FORBIDDEN_NEEDLES = [
    "client_secret",
    "private_key",
    "api_key",
    "object_key",
    "recipientAddressRef",
    "secret://",
    "-----BEGIN",
    "@example.com",
    "@example.test",
    "production ready",
    "public API readiness",
    "external SDK readiness",
]


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


def load_matrix():
    return read_json(MATRIX_PATH)


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in SOURCE_FILES}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides["matrix"] if "matrix" in overrides else load_matrix()
    openapi = overrides["openapi"] if "openapi" in overrides else read_json(OPENAPI_JSON)
    return {"files": files, "matrix": matrix, "openapi": openapi}


def api_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    out = []
    for row in matrix.get("domains", []):
        if not isinstance(row, dict):
            continue
        rid = str(row.get("react_item_id", ""))
        summary = str(row.get("behaviour_summary", ""))
        if (
            rid.startswith("api.")
            or rid == "api-routes-openapi"
            or "api" in rid
            or "openapi" in rid
            or "route" in rid
            or "contract" in rid
            or "OpenAPI" in summary
        ):
            out.append(row)
    return out


def route_ids(api_surface):
    inline = re.findall(r'routeId:\s*"([^"]+)"', api_surface)
    helper = re.findall(r'route\(\s*"([^"]+)"', api_surface)
    return inline + helper


def openapi_operations(document):
    if not isinstance(document, dict) or not isinstance(document.get("paths"), dict):
        return []
    operations = []
    for path, methods in document["paths"].items():
        if not isinstance(methods, dict):
            continue
        for method, operation in methods.items():
            if method.lower() in {"get", "post", "put", "patch", "delete"} and isinstance(operation, dict):
                operations.append((method.upper(), path, operation))
    return operations


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    api_surface = files.get(API_SURFACE, "")
    contracts = files.get(CONTRACTS, "")
    server = files.get(SERVER, "")
    openapi_builder = files.get(OPENAPI_BUILDER, "")
    openapi_check = files.get(OPENAPI_CHECK, "")
    openapi_json_text = files.get(OPENAPI_JSON, "")
    proof = files.get(PROOF, "")
    proof_index = files.get(PROOF_INDEX, "")
    app_tests = files.get(APP_TESTS, "")
    openapi_tests = files.get(OPENAPI_TESTS, "")
    proof_tests = files.get(PROOF_TESTS, "")
    standard = files.get(STANDARD, "")
    source_use = files.get(SOURCE_USE, "")
    package = files.get(PACKAGE, "")
    makefile = files.get(MAKEFILE, "")
    openapi = state["openapi"]

    if not re.search(r"\bAPI_ROUTE_CLASSIFICATIONS\b", api_surface) or not re.search(r"\bAPI_ROUTE_CONTRACTS\b", api_surface):
        F.add("USF-API-001", API_SURFACE, "API route classifications and contract table must exist")
    for classification in REQUIRED_CLASSIFICATIONS:
        if f'"{classification}"' not in api_surface:
            F.add("USF-API-001", API_SURFACE, f"missing route classification {classification}")
    for token in (
        "route:",
        "contract:",
        "OpenAPI surface:",
        "capability:",
        "API readiness:",
        "No route without classification",
    ):
        if standard and token not in standard:
            F.add("USF-API-002", STANDARD, f"standard missing concept/rule {token}")
    if not standard:
        F.add("USF-API-002", STANDARD, "API and Contract Surface Standard must exist")
    else:
        for phrase in (
            "ISO 27001-supporting technical control evidence only",
            "Do not claim ISO certification",
            "Do not claim public API readiness",
            "Do not claim production readiness",
            "Do not claim external developer platform readiness",
        ):
            if phrase not in standard:
                F.add("USF-API-002", STANDARD, f"standard missing boundary phrase: {phrase}")

    ids = route_ids(api_surface)
    if len(ids) < 20:
        F.add("USF-API-003", API_SURFACE, "route contract table is too small for implemented foundation surface")
    if len(ids) != len(set(ids)):
        F.add("USF-API-003", API_SURFACE, "route IDs must be unique")
    for token in (
        "owningDomain",
        "owningCapability",
        "requiredAction",
        "tenantScope",
        "authScheme",
        "pdpPolicy",
        "auditPolicy",
        "idempotencyPolicy",
        "paginationPolicy",
        "rateLimitPolicy",
        "dataClassification",
        "sourceUseDisposition",
        "lifecycle",
        "compatibilityPolicy",
        "securityHeadersPolicy",
        "fieldExposurePolicy",
        "observabilityPolicy",
        "gatewayPolicy",
    ):
        if token not in api_surface:
            F.add("USF-API-003", API_SURFACE, f"route metadata missing {token}")

    for token in (
        "checkRouteCoverage",
        "OpenAPI missing implemented route",
        "OpenAPI contains route without implementation metadata",
        "checkOperationIds",
        "Duplicate OpenAPI operationId",
        "checkMetadataAndSchemas",
        "checkSafeExamplesAndClaims",
        "x-usf-route",
    ):
        if token not in openapi_check:
            F.add("USF-API-004", OPENAPI_CHECK, f"OpenAPI checker missing {token}")
    operations = openapi_operations(openapi)
    if not operations:
        F.add("USF-API-004", OPENAPI_JSON, "committed OpenAPI must parse and contain operations")
    elif ids and len(operations) != len(ids):
        F.add("USF-API-004", OPENAPI_JSON, f"OpenAPI operation count {len(operations)} != route contract count {len(ids)}")
    seen_operation_ids = set()
    for method, path, operation in operations:
        operation_id = operation.get("operationId")
        if not operation_id or operation_id in seen_operation_ids:
            F.add("USF-API-004", f"{method} {path}", f"missing/duplicate operationId {operation_id}")
        seen_operation_ids.add(operation_id)
        metadata = operation.get("x-usf-route")
        if not isinstance(metadata, dict):
            F.add("USF-API-004", f"{method} {path}", "operation missing x-usf-route metadata")
            continue
        classification = metadata.get("routeClassification")
        if classification not in REQUIRED_CLASSIFICATIONS:
            F.add("USF-API-003", f"{method} {path}", f"invalid route classification {classification}")
        for field in ("owningCapability", "tenantScope", "idempotencyPolicy", "paginationPolicy", "lifecycle"):
            if field not in metadata:
                F.add("USF-API-004", f"{method} {path}", f"metadata missing {field}")

    for token in (
        "tenantContextFromRequest",
        "contextFromClaims",
        "ensurePermission",
        "runtime.authorizer.authorize",
        "tenantMismatch",
        "x-dev-tenant-id",
        "x-dev-actor-id",
        "setNotFoundHandler",
        "setErrorHandler",
    ):
        if token not in server:
            F.add("USF-API-005", SERVER, f"server guard/error token missing {token}")

    if "export const ApiErrorResponseSchema" not in contracts:
        F.add("USF-API-006", CONTRACTS, "ApiErrorResponseSchema must be exported from contracts")
    for token in (
        "ApiErrorResponseSchema",
        "error_id",
        "safe_message",
        "reason_code",
        "correlation_id",
        "request_id",
        "trace_id",
    ):
        if token not in contracts + server:
            F.add("USF-API-006", CONTRACTS, f"safe error envelope token missing {token}")
    for token in ("safeErrorMessage", "client_secret", "private_key", "object_key"):
        if token not in server + openapi_check + app_tests:
            F.add("USF-API-006", SERVER, f"safe validation/redaction token missing {token}")

    for token in (
        "idempotencyLedger",
        "requireIdempotencyKey",
        "idempotency-conflict",
        "Idempotency-Key",
        "idempotencyRequired",
        "same-key-different-payload-conflict",
    ):
        if token not in server + api_surface + openapi_builder + app_tests + proof:
            F.add("USF-API-007", SERVER, f"idempotency token missing {token}")

    for token in (
        "opaqueHash",
        "tenant-scoped-opaque-cursor",
        "cursorPagination",
        "nextCursor",
        "base64url",
    ):
        if token not in api_surface + files.get(STORE, "") + app_tests + proof:
            F.add("USF-API-008", API_SURFACE, f"pagination cursor token missing {token}")

    if not isinstance(openapi, dict):
        F.add("USF-API-009", OPENAPI_JSON, "OpenAPI document is missing or unparseable")
    else:
        text = json.dumps(openapi)
        for needle in OPENAPI_FORBIDDEN_NEEDLES:
            if needle.lower() in text.lower():
                F.add("USF-API-009", OPENAPI_JSON, f"OpenAPI contains forbidden or overclaiming content: {needle}")
        boundary = openapi.get("x-usf-boundary", {})
        if not isinstance(boundary, dict) or boundary.get("publicApiReadinessClaim") is not False:
            F.add("USF-API-009", OPENAPI_JSON, "OpenAPI must explicitly avoid public API readiness claim")
        if not isinstance(boundary, dict) or boundary.get("productionReadinessClaim") is not False:
            F.add("USF-API-009", OPENAPI_JSON, "OpenAPI must explicitly avoid production readiness claim")
    for token in (
        "publicApiReadinessClaim: false",
        "externalSdkReadinessClaim: false",
        "productionLiveClaim: false",
        "runApiContractsProof",
        "routeCount",
        "operationCount",
    ):
        if token not in proof:
            F.add("USF-API-010", PROOF, f"API proof missing boundary/check token {token}")
    if "runApiContractsProof" not in proof_index or '"proof:api"' not in package or "api-proof" not in makefile:
        F.add("USF-API-010", PACKAGE, "API proof must be exported and wired into package scripts/Makefile")

    combined_tests = "\n".join([app_tests, openapi_tests, proof_tests])
    for token in (
        "implements every route declared",
        "missingTenant",
        "noPermission",
        "tenant-other",
        "deterministic idempotency",
        "redacts validation errors",
        "opaque tenant-scoped pagination cursors",
        "unique OpenAPI operation",
        "public readiness claims",
        "runApiContractsProof",
    ):
        if token not in combined_tests:
            F.add("USF-API-011", "tests", f"API test coverage missing phrase: {token}")

    rows = api_rows(state["matrix"])
    main = next((row for row in rows if row.get("react_item_id") == "api-routes-openapi"), None)
    if main is None:
        F.add("USF-API-012", MATRIX_PATH, "api-routes-openapi row is missing")
    else:
        if main.get("domain_authorised") is not True:
            F.add("USF-API-012", MATRIX_PATH, "api-routes-openapi row must be domain_authorised=true")
        if main.get("linear_issue") != "USF-154" and main.get("blocker") != "USF-154":
            F.add("USF-API-012", MATRIX_PATH, "api-routes-openapi row must reference USF-154")
        if not main.get("usf_tests") or not main.get("usf_proofs"):
            F.add("USF-API-012", MATRIX_PATH, "api-routes-openapi row must reference tests and proofs")
    if len(rows) < 12:
        F.add("USF-API-012", MATRIX_PATH, "API/contracts subdomain rows must be explicit")

    if not source_use:
        F.add("USF-API-013", SOURCE_USE, "domain source-use matrix must exist")
    else:
        for token in (
            "packages/contracts/src/api-surface.ts",
            "apps/api/src/server.ts",
            "packages/openapi/src/index.ts",
            "packages/proof/src/api-contracts-proof.ts",
            "tests/apps/api-contracts.test.ts",
            "No React runtime/application code is copied",
            "No public API or production readiness is claimed",
        ):
            if token not in source_use:
                F.add("USF-API-013", SOURCE_USE, f"source-use missing {token}")

    for token in (
        "corsPolicy",
        "csrfPolicy",
        "securityHeadersPolicy",
        "compatibilityPolicy",
        "deprecationStatus",
        "replacementOperationId",
        "rateLimitPolicy",
        "observabilityPolicy",
        "gatewayPolicy",
        "fieldExposurePolicy",
    ):
        if token not in api_surface + openapi_builder + openapi_tests:
            F.add("USF-API-014", API_SURFACE, f"API posture token missing {token}")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = json.loads(json.dumps(base["matrix"])) if base["matrix"] is not None else None
    openapi = json.loads(json.dumps(base["openapi"])) if base["openapi"] is not None else None
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if "matrixApiSet" in mutation and matrix is not None:
        rows = api_rows(matrix)
        row = next((item for item in rows if item.get("react_item_id") == "api-routes-openapi"), None)
        if row is not None:
            for key, value in mutation["matrixApiSet"].items():
                row[key] = value
    if "openapiBoundarySet" in mutation and isinstance(openapi, dict):
        boundary = openapi.setdefault("x-usf-boundary", {})
        if isinstance(boundary, dict):
            boundary.update(mutation["openapiBoundarySet"])
    return {"files": files, "matrix": matrix, "openapi": openapi}


def load_selftest_fixtures(F):
    fixtures = []
    if not os.path.isdir(SELFTEST_DIR):
        return fixtures
    for name in sorted(os.listdir(SELFTEST_DIR)):
        if not name.endswith(".json"):
            continue
        path = f"{SELFTEST_DIR}/{name}"
        try:
            with open(path, encoding="utf-8") as handle:
                fixtures.append((path, json.load(handle)))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-API-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        local = Findings()
        run_checks(local, build_state(apply_mutation(base, fixture.get("mutation", {}))))
        got = {item["ruleId"] for item in local.items}
        if expected not in got:
            F.add("USF-API-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF API/contracts posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["api", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"api", "all"}:
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
        print(f"USF API/contracts validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
