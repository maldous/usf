#!/usr/bin/env python3
"""USF resource lifecycle/relationships parity validator (USF-165).

Governance tooling only. It creates no runtime files and imports no source lineage.
It fails closed on governed records, lifecycle states, schema-bound mutations,
relationship integrity, tenant/PDP posture, retention/hold/purge safety,
audit/telemetry, source-use honesty, and no production/legal/regulatory
record-management readiness claim.
"""
import argparse
import json
import os
import sys

RULES = {
    "USF-RESOURCES-001": ("blocking", "resource lifecycle semantic model missing"),
    "USF-RESOURCES-002": ("blocking", "resource lifecycle standard or source-use matrix missing"),
    "USF-RESOURCES-003": ("blocking", "resource lifecycle port/adapter/service boundary missing"),
    "USF-RESOURCES-004": ("blocking", "resource lifecycle proof or command wiring missing"),
    "USF-RESOURCES-005": ("blocking", "resource lifecycle tests missing required behaviours"),
    "USF-RESOURCES-006": ("blocking", "resource lifecycle parity/source-use rows missing"),
    "USF-RESOURCES-007": ("blocking", "resource lifecycle redaction or overclaim violation"),
    "USF-RESOURCES-008": ("blocking", "resource lifecycle audit/observability/guardrail/search linkage missing"),
    "USF-RESOURCES-SELFTEST": ("blocking", "planted resource lifecycle defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
PORTS = "packages/ports/src/index.ts"
ADAPTER = "adapters/resources/src/index.ts"
SERVICE = "capabilities/resources/src/index.ts"
PROOF = "packages/proof/src/resource-lifecycle-proof.ts"
PROOF_INDEX = "packages/proof/src/index.ts"
TESTS = "tests/capabilities/resource-lifecycle.test.ts"
PROOF_TESTS = "tests/packages/proof.test.ts"
STANDARD = "docs/architecture/resource-lifecycle-relationships-and-mutations-standard.md"
SOURCE_USE = "docs/architecture/resource-lifecycle-source-use-disposition-matrix.md"
BOOTSTRAP_SOURCE_USE = "docs/architecture/bootstrap-source-use-disposition-matrix.md"
MATRIX = "docs/architecture/functional-scope-classification-matrix.json"
PACKAGE = "package.json"
MAKEFILE = "Makefile"
SELFTEST_DIR = "tools/validate-parity/resource-planted-defects"

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
    "production record-management readiness is proven",
    "legal record-management readiness is proven",
    "regulatory record-management readiness is proven",
    "ediscovery readiness is proven",
    "production-live ready",
    "live record provider readiness is proven",
]

LEAK_NEEDLES = [
    "leakmarker",
    "tenant-alpha/object/proof-key",
    "bearer proof",
    "secret://resource",
    "recipient_address=proof",
    "provider_response=raw",
    "raw_payload=proof",
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
                if not isinstance(row, dict) or row.get("source_item_id") not in remove_ids
            ]
    return {"files": files, "matrix": matrix}


def resource_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    rows = []
    for row in matrix.get("domains", []):
        if not isinstance(row, dict):
            continue
        rid = str(row.get("source_item_id", ""))
        summary = str(row.get("behaviour_summary", "")).lower()
        if rid.startswith("resource.") or "resource lifecycle" in summary:
            rows.append(row)
    return rows


def run_checks(findings, state=None):
    state = state or build_state()
    files = state["files"]
    core = files[CORE]
    resource_core = core.split("// Resource lifecycle, relationships, and schema-bound mutations", 1)[-1]
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
        "RESOURCE_CLASSIFICATIONS",
        "RESOURCE_TYPES",
        "RESOURCE_LIFECYCLE_STATUSES",
        "RESOURCE_RELATIONSHIP_TYPES",
        "RESOURCE_MUTATION_TYPES",
        "ResourceRecord",
        "ResourceRelationshipRecord",
        "ResourcePolicyError",
        "createResourceSchemaDefinition",
        "createResourceRecord",
        "updateResourceRecord",
        "createResourceRelationshipRecord",
        "toSafeResourceView",
    ]:
        if token not in resource_core:
            findings.add("USF-RESOURCES-001", CORE, f"core model missing {token}")
    for token in [
        "unknown-resource-classification",
        "unknown-resource-type",
        "unknown-resource-status",
        "unknown-relationship-type",
        "unknown-mutation-type",
        "resource-value-sensitive",
        "version-conflict",
        "legal-hold-blocks-purge",
        "self-approval-denied",
        "cross-tenant-relationship-denied",
        "hidden-field-denied",
        "restricted-field-permission-required",
    ]:
        if token not in core:
            findings.add("USF-RESOURCES-001", CORE, f"fail-closed rule missing {token}")

    if "Resource Lifecycle, Relationships, and Mutations Standard" not in standard:
        findings.add("USF-RESOURCES-002", STANDARD, "resource lifecycle standard missing")
    for token in [
        "Resources As Governed Records",
        "Resource Classification",
        "Lifecycle State Machine Governance",
        "Separation Of Duties/Approval Posture",
        "Relationship Graph Integrity",
        "Referential Integrity/Cascade Posture",
        "Schema-Bound Mutation Safety",
        "Versioning/Optimistic Concurrency",
        "Mutation Idempotency/Replay",
        "Soft Delete/Archive/Restore/Purge",
        "Retention/Disposal Posture",
        "Search/Indexing Interaction",
        "Import/Export/Bulk Interaction",
        "API/OpenAPI Safety",
    ]:
        if token not in standard:
            findings.add("USF-RESOURCES-002", STANDARD, f"standard missing section {token}")
    if "Resource Lifecycle Source-Use Disposition Matrix" not in source_use:
        findings.add("USF-RESOURCES-002", SOURCE_USE, "domain source-use matrix missing")

    if "ResourceLifecyclePort" not in ports or "safeStatusView" not in ports:
        findings.add("USF-RESOURCES-003", PORTS, "ResourceLifecyclePort missing")
    for token in [
        "InMemoryResourceLifecycleStore",
        "decodeCursor",
        "tenantMatches",
        "findByIdempotencyKey",
        "relationshipsForResource",
        "productionReadinessClaim: false",
        "legalRecordManagementReadinessClaim: false",
        "regulatoryRecordReadinessClaim: false",
    ]:
        if token not in adapter:
            findings.add("USF-RESOURCES-003", ADAPTER, f"adapter missing {token}")
    for token in [
        "createResourceLifecycleService",
        "authorize(context",
        "guardrails.evaluate",
        "createAuditEventDraft",
        "recordSecuritySignal",
        "requiredRelationshipBlocks",
        "relationship-cycle-denied",
        "approvedBy",
        "removeFromSearch",
        "ImportExportPort",
        "ResourceLifecyclePort",
    ]:
        if token not in service:
            findings.add("USF-RESOURCES-003", SERVICE, f"service missing {token}")

    if "export async function runResourceLifecycleProof" not in proof:
        findings.add("USF-RESOURCES-004", PROOF, "resource lifecycle proof missing")
    for token in [
        "productionRecordManagementReadinessClaim: false",
        "legalRecordManagementReadinessClaim: false",
        "regulatoryRecordReadinessClaim: false",
        "eDiscoveryReadinessClaim: false",
        "productionLiveClaim: false",
    ]:
        if token not in proof:
            findings.add("USF-RESOURCES-004", PROOF, f"proof missing no-claim {token}")
    if "runResourceLifecycleProof" not in proof_index:
        findings.add("USF-RESOURCES-004", PROOF_INDEX, "resource lifecycle proof export missing")
    if '"proof:resources"' not in package or "proof:resources" not in package:
        findings.add("USF-RESOURCES-004", PACKAGE, "proof:resources script missing")
    if "resources-proof:" not in makefile:
        findings.add("USF-RESOURCES-004", MAKEFILE, "resources-proof target missing")
    if "proof:resources" not in package.split('"verify"', 1)[-1]:
        findings.add("USF-RESOURCES-004", PACKAGE, "verify does not run resource lifecycle proof")

    for token in [
        "tenant A cannot read",
        "missing tenant context",
        "unknown type",
        "unknown classification",
        "schema-bound mutation",
        "version conflicts",
        "idempotent replay",
        "self-approval-denied",
        "legal-hold",
        "search removal",
        "relationship integrity",
        "relationship-cycle-denied",
        "required-relationship-blocks-purge",
        "object_key",
        "rate-limit-exceeded",
        "productionReadinessClaim",
    ]:
        if token not in tests:
            findings.add("USF-RESOURCES-005", TESTS, f"test missing {token}")
    if "runResourceLifecycleProof" not in proof_tests:
        findings.add("USF-RESOURCES-005", PROOF_TESTS, "proof test missing resource lifecycle proof")

    rows = resource_rows(matrix)
    required_rows = [
        "resource.semantic-model",
        "resource.classification-lifecycle",
        "resource.relationship-graph",
        "resource.schema-bound-mutations",
        "resource.version-concurrency-idempotency",
        "resource.soft-delete-retention-holds",
        "resource.search-bulk-files-interactions",
        "resource.audit-observability-guardrails",
        "resource.api-openapi-posture",
        "resource.ui-playwright-behaviours",
    ]
    row_ids = {row.get("source_item_id") for row in rows}
    for rid in required_rows:
        if rid not in row_ids:
            findings.add("USF-RESOURCES-006", MATRIX, f"matrix row missing {rid}")
    for row in rows:
        if row.get("domain_authorised") is not True:
            findings.add("USF-RESOURCES-006", MATRIX, f"resource lifecycle row not authorised: {row.get('source_item_id')}")
        if row.get("usf_status") in {"migrated", "partial"} and not row.get("usf_tests"):
            findings.add("USF-RESOURCES-006", MATRIX, f"resource lifecycle row lacks tests: {row.get('source_item_id')}")
    for token in [
        "capabilities/resources/src/index.ts",
        "adapters/resources/src/index.ts",
        "packages/proof/src/resource-lifecycle-proof.ts",
        "tests/capabilities/resource-lifecycle.test.ts",
        "tools/validate-parity/validate-resources.py",
    ]:
        if token not in source_use or token not in bootstrap_source_use:
            findings.add("USF-RESOURCES-006", SOURCE_USE, f"source-use missing {token}")

    combined = "\n".join(files.values()).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in combined:
            findings.add("USF-RESOURCES-007", "repository", f"forbidden readiness claim: {phrase}")
    for needle in LEAK_NEEDLES:
        if needle.lower() in combined:
            findings.add("USF-RESOURCES-007", "repository", f"blocked leak marker present: {needle}")
    if "objectKey" in adapter or "objectKey" in service or "recipientAddress" in adapter or "rawPayload" in service:
        findings.add("USF-RESOURCES-007", "runtime", "raw object key, recipient address, or payload reference in runtime")

    for token in [
        "recordSecuritySignal",
        "resource.mutation.denied",
        "createAuditEventDraft",
        "guardrails.evaluate",
        "removeFromSearch",
        "ImportExportPort",
        "rate-limit-exceeded",
    ]:
        if token not in service and token not in proof:
            findings.add("USF-RESOURCES-008", SERVICE, f"audit/observability/guardrail/search linkage missing {token}")


def load_selftest_case(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def run_selftest(findings):
    if not os.path.isdir(SELFTEST_DIR):
        findings.add("USF-RESOURCES-SELFTEST", SELFTEST_DIR, "selftest directory missing")
        return
    cases = [os.path.join(SELFTEST_DIR, name) for name in sorted(os.listdir(SELFTEST_DIR)) if name.endswith(".json")]
    if not cases:
        findings.add("USF-RESOURCES-SELFTEST", SELFTEST_DIR, "no planted defects")
        return
    for case_path in cases:
        case = load_selftest_case(case_path)
        expected = case.get("expectedRule")
        local = Findings()
        run_checks(local, build_state(case.get("override", {})))
        if expected not in {item["ruleId"] for item in local.items}:
            findings.add("USF-RESOURCES-SELFTEST", case_path, f"expected {expected}")


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
