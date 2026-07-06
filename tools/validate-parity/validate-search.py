#!/usr/bin/env python3
"""USF search/indexing/discovery parity validator (USF-164).

Governance tooling only. It creates no runtime files and imports no React source.
It fails closed on tenant-safe search invariants: controlled search model,
classified index documents, tenant-safe query/count/facet/cursor posture, PDP,
guardrails, file-derived safety, reindex jobs, audit/telemetry, source-use honesty,
and no live search/vector/AI/public API/production readiness claim.
"""
import argparse
import json
import os
import sys

RULES = {
    "USF-SEARCH-001": ("blocking", "search semantic model missing"),
    "USF-SEARCH-002": ("blocking", "search standard or source-use matrix missing"),
    "USF-SEARCH-003": ("blocking", "search port/adapter/service boundary missing"),
    "USF-SEARCH-004": ("blocking", "search proof or command wiring missing"),
    "USF-SEARCH-005": ("blocking", "search tests missing required behaviours"),
    "USF-SEARCH-006": ("blocking", "search parity/source-use rows missing"),
    "USF-SEARCH-007": ("blocking", "search redaction or overclaim violation"),
    "USF-SEARCH-008": ("blocking", "search audit/observability/guardrail linkage missing"),
    "USF-SEARCH-SELFTEST": ("blocking", "planted search defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
PORTS = "packages/ports/src/index.ts"
ADAPTER = "adapters/search/src/index.ts"
SERVICE = "capabilities/search/src/index.ts"
PROOF = "packages/proof/src/search-indexing-proof.ts"
PROOF_INDEX = "packages/proof/src/index.ts"
TESTS = "tests/capabilities/search-indexing.test.ts"
PROOF_TESTS = "tests/packages/proof.test.ts"
STANDARD = "docs/architecture/search-indexing-and-discovery-standard.md"
SOURCE_USE = "docs/architecture/search-indexing-source-use-disposition-matrix.md"
BOOTSTRAP_SOURCE_USE = "docs/architecture/bootstrap-source-use-disposition-matrix.md"
MATRIX = "docs/architecture/functional-scope-classification-matrix.json"
PACKAGE = "package.json"
MAKEFILE = "Makefile"
SELFTEST_DIR = "tools/validate-parity/search-planted-defects"

SOURCE_FILES = (
    CORE,
    PORTS,
    ADAPTER,
    SERVICE,
    PROOF,
    PROOF_INDEX,
    TESTS,
    PROOF_TESTS,
    STANDARD,
    SOURCE_USE,
    BOOTSTRAP_SOURCE_USE,
    PACKAGE,
    MAKEFILE,
)

FORBIDDEN_OVERCLAIMS = [
    "live search provider readiness is proven",
    "live vector database readiness is proven",
    "live external indexing provider is ready",
    "ai/rag readiness is proven",
    "public search api ready",
    "production search readiness is proven",
    "production-live ready",
]

LEAK_NEEDLES = [
    "leakmarker",
    "tenant-alpha/object/proof-key",
    "bearer proof",
    "secret://search",
    "recipient_address=proof",
    "provider_response=raw",
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
    for item in overrides.get("removeText", []):
        path = item.get("path")
        text = item.get("text", "")
        if path in files:
            files[path] = files[path].replace(text, "")
    for item in overrides.get("appendText", []):
        path = item.get("path")
        text = item.get("text", "")
        if path in files:
            files[path] = files[path] + text
    matrix = overrides.get("matrix", read_json(MATRIX))
    if isinstance(matrix, dict):
        remove_ids = set(overrides.get("matrixRemoveRows", []))
        if remove_ids:
            matrix = dict(matrix)
            matrix["domains"] = [
                row
                for row in matrix.get("domains", [])
                if not isinstance(row, dict) or row.get("react_item_id") not in remove_ids
            ]
    return {"files": files, "matrix": matrix}


def search_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    rows = []
    for row in matrix.get("domains", []):
        if not isinstance(row, dict):
            continue
        rid = str(row.get("react_item_id", ""))
        summary = str(row.get("behaviour_summary", "")).lower()
        if rid.startswith("search.") or "search" in summary or "index" in summary:
            rows.append(row)
    return rows


def run_checks(findings, state=None):
    state = state or build_state()
    files = state["files"]
    core = files[CORE]
    search_core = core.split("// Tenant-safe search / indexing / discovery model", 1)[-1]
    ports = files[PORTS]
    adapter = files[ADAPTER]
    service = files[SERVICE]
    proof = files[PROOF]
    proof_index = files[PROOF_INDEX]
    tests = files[TESTS]
    proof_tests = files[PROOF_TESTS]
    standard = files[STANDARD]
    source_use = files[SOURCE_USE]
    bootstrap_source_use = files[BOOTSTRAP_SOURCE_USE]
    package = files[PACKAGE]
    makefile = files[MAKEFILE]
    matrix = state["matrix"]

    for token in [
        "SEARCHABLE_RESOURCE_CLASSIFICATIONS",
        "SEARCH_RESOURCE_TYPES",
        "SEARCH_INDEX_LIFECYCLE_STATES",
        "SEARCH_SOURCE_REVALIDATION_POLICIES",
        "SearchIndexDocument",
        "SearchPolicyError",
        "createSearchIndexDocument",
        "validateSearchQueryRequest",
        "createSearchCursor",
        "decodeSearchCursor",
        "toSafeSearchResult",
    ]:
        if token not in search_core:
            findings.add("USF-SEARCH-001", CORE, f"core model missing {token}")
    for token in [
        "unknown-resource-type",
        "unknown-search-classification",
        "file-source-not-indexable",
        "cursor-invalid",
        "filter-not-allowed",
        "sort-not-allowed",
        "facet-not-allowed",
        "query-too-long",
        "search.query.executed",
        "search.reindex.completed",
    ]:
        if token not in core:
            findings.add("USF-SEARCH-001", CORE, f"fail-closed rule missing {token}")

    if "Search, Indexing, and Discovery Standard" not in standard:
        findings.add("USF-SEARCH-002", STANDARD, "search standard missing")
    for token in [
        "Search As Controlled Discovery Surface",
        "Searchable Resource Classification",
        "Index Document Governance",
        "Source-Of-Truth Revalidation",
        "Pagination/Cursor Safety",
        "Autocomplete/Typeahead Safety",
        "Vector/Embedding/AI/RAG Posture",
        "Search Audit/Audit-Of-Access",
        "API/OpenAPI Safety",
    ]:
        if token not in standard:
            findings.add("USF-SEARCH-002", STANDARD, f"standard missing section {token}")
    if "Search/Indexing Source-Use Disposition Matrix" not in source_use:
        findings.add("USF-SEARCH-002", SOURCE_USE, "domain source-use matrix missing")

    if "SearchIndexPort" not in ports or "safeStatusView" not in ports:
        findings.add("USF-SEARCH-003", PORTS, "SearchIndexPort missing")
    for token in [
        "InMemorySearchIndex",
        "documentTenantMatches",
        "createSearchCursor",
        "facet_",
        "liveSearchReadinessClaim: false",
        "liveVectorReadinessClaim: false",
        "aiRagReadinessClaim: false",
    ]:
        if token not in adapter:
            findings.add("USF-SEARCH-003", ADAPTER, f"adapter missing {token}")
    for token in [
        "createSearchService",
        "authorize(context",
        "guardrails.evaluate",
        "assertFileSourceSafe",
        "recordSecuritySignal",
        "search.result.access_denied",
        "search.reindex.started",
        "SearchIndexPort",
    ]:
        if token not in service:
            findings.add("USF-SEARCH-003", SERVICE, f"service missing {token}")

    if "export async function runSearchIndexingProof" not in proof:
        findings.add("USF-SEARCH-004", PROOF, "search proof missing")
    for token in [
        "liveSearchProviderReadinessClaim: false",
        "liveVectorDatabaseReadinessClaim: false",
        "aiRagReadinessClaim: false",
        "publicSearchApiReadinessClaim: false",
        "productionLiveClaim: false",
    ]:
        if token not in proof:
            findings.add("USF-SEARCH-004", PROOF, f"proof missing no-claim {token}")
    if "runSearchIndexingProof" not in proof_index:
        findings.add("USF-SEARCH-004", PROOF_INDEX, "search proof export missing")
    if '"proof:search"' not in package or "proof:search" not in package:
        findings.add("USF-SEARCH-004", PACKAGE, "proof:search script missing")
    if "search-proof:" not in makefile:
        findings.add("USF-SEARCH-004", MAKEFILE, "search-proof target missing")
    if "proof:search" not in package.split('"verify"', 1)[-1]:
        findings.add("USF-SEARCH-004", PACKAGE, "verify does not run search proof")

    for token in [
        "tenant A cannot search tenant B documents",
        "missing tenant context",
        "unknown resource type",
        "unknown classification",
        "unknown: \"x\"",
        "query-too-long",
        "restricted fields",
        "object keys are absent",
        "quarantined file-derived",
        "stale",
        "search guardrail denies safely",
        "reindex is tenant-scoped",
        "liveSearchReadinessClaim: false",
    ]:
        if token not in tests:
            findings.add("USF-SEARCH-005", TESTS, f"test missing {token}")
    if "runSearchIndexingProof" not in proof_tests:
        findings.add("USF-SEARCH-005", PROOF_TESTS, "proof test missing search proof")

    rows = search_rows(matrix)
    required_rows = [
        "search.semantic-model",
        "search.index-document-governance",
        "search.port-adapter-boundary",
        "search.in-memory-index",
        "search.tenant-isolation-pdp",
        "search.query-filter-sort-facet",
        "search.field-redaction-snippets",
        "search.file-derived-content",
        "search.reindex-jobs",
        "search.provider-posture",
        "search.guardrails-abuse",
        "search.audit-observability",
        "search.api-openapi-posture",
        "search.react-ui-playwright-behaviours",
    ]
    row_ids = {row.get("react_item_id") for row in rows}
    for rid in required_rows:
        if rid not in row_ids:
            findings.add("USF-SEARCH-006", MATRIX, f"matrix row missing {rid}")
    for row in rows:
        if row.get("domain_authorised") is not True:
            findings.add("USF-SEARCH-006", MATRIX, f"search row not authorised: {row.get('react_item_id')}")
        if row.get("usf_status") in {"migrated", "partial"} and not row.get("usf_tests"):
            findings.add("USF-SEARCH-006", MATRIX, f"search row lacks tests: {row.get('react_item_id')}")
    for token in [
        "capabilities/search/src/index.ts",
        "adapters/search/src/index.ts",
        "packages/proof/src/search-indexing-proof.ts",
        "tests/capabilities/search-indexing.test.ts",
        "tools/validate-parity/validate-search.py",
    ]:
        if token not in source_use or token not in bootstrap_source_use:
            findings.add("USF-SEARCH-006", SOURCE_USE, f"source-use missing {token}")

    combined = "\n".join(files.values()).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in combined:
            findings.add("USF-SEARCH-007", "repository", f"forbidden readiness claim: {phrase}")
    for needle in LEAK_NEEDLES:
        if needle.lower() in combined:
            findings.add("USF-SEARCH-007", "repository", f"blocked leak marker present: {needle}")
    if "objectKey" in adapter or "objectKey" in service or "recipientAddress" in adapter:
        findings.add("USF-SEARCH-007", "runtime", "raw object key or recipient address reference in runtime")

    for token in [
        "recordSecuritySignal",
        "search.query.denied",
        "search.stale_result.denied",
        "search.high_volume_query",
        "createAuditEventDraft",
        "guardrails.evaluate",
    ]:
        if token not in service and token not in proof:
            findings.add("USF-SEARCH-008", SERVICE, f"audit/observability/guardrail linkage missing {token}")


def load_selftest_case(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def run_selftest(findings):
    if not os.path.isdir(SELFTEST_DIR):
        findings.add("USF-SEARCH-SELFTEST", SELFTEST_DIR, "selftest directory missing")
        return
    cases = [os.path.join(SELFTEST_DIR, name) for name in sorted(os.listdir(SELFTEST_DIR)) if name.endswith(".json")]
    if not cases:
        findings.add("USF-SEARCH-SELFTEST", SELFTEST_DIR, "no planted defects")
        return
    for case_path in cases:
        case = load_selftest_case(case_path)
        expected = case.get("expectedRule")
        local = Findings()
        run_checks(local, build_state(case.get("override", {})))
        if expected not in {item["ruleId"] for item in local.items}:
            findings.add("USF-SEARCH-SELFTEST", case_path, f"expected {expected}")


def emit(findings, as_json):
    blocking = findings.blocking_or_error()
    payload = {
        "ok": not blocking,
        "findings": findings.items,
        "rules": RULES,
    }
    if as_json:
        print(json.dumps(payload, indent=2))
    else:
        for item in findings.items:
            print(f"{item['severity']} {item['ruleId']} {item['subject']}: {item['message']}")
    return 0 if not blocking else 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    findings = Findings()
    if args.mode == "all":
        run_checks(findings)
    else:
        run_selftest(findings)
    sys.exit(emit(findings, args.json))


if __name__ == "__main__":
    main()
