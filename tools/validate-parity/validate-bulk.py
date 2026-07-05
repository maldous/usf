#!/usr/bin/env python3
"""USF import/export/bulk parity validator (USF-162).

Governance tooling only. It creates no runtime files and imports no React source.
It fails closed on governed data-movement invariants: controlled bulk operation
types/classifications/statuses, explicit idempotency, file_id posture, PDP,
guardrails, jobs, audit, telemetry, evidence package hashes, source-use honesty,
and no production/legal/regulatory/eDiscovery/live-provider readiness claim.
"""
import argparse
import json
import os
import sys

RULES = {
    "USF-BULK-001": ("blocking", "bulk semantic model missing"),
    "USF-BULK-002": ("blocking", "bulk standard or source-use matrix missing"),
    "USF-BULK-003": ("blocking", "bulk port/adapter/service boundary missing"),
    "USF-BULK-004": ("blocking", "bulk proof or command wiring missing"),
    "USF-BULK-005": ("blocking", "bulk tests missing required behaviours"),
    "USF-BULK-006": ("blocking", "bulk parity/source-use rows missing"),
    "USF-BULK-007": ("blocking", "bulk safety redaction or overclaim violation"),
    "USF-BULK-008": ("blocking", "bulk audit/observability linkage missing"),
    "USF-BULK-009": ("blocking", "USF-163 import/export/bulk deep runtime proof markers are missing"),
    "USF-BULK-010": ("blocking", "USF-163 import/export/bulk deep runtime matrix is missing or incomplete"),
    "USF-BULK-011": ("blocking", "USF-163 enterprise evidence rows are missing"),
    "USF-BULK-012": ("blocking", "USF-163 deferred or reclassified boundary is incomplete"),
    "USF-BULK-013": ("blocking", "USF-163 import/export/bulk readiness claim is overclaimed"),
    "USF-BULK-SELFTEST": ("blocking", "planted bulk defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
PORTS = "packages/ports/src/index.ts"
ADAPTER = "adapters/bulk/src/index.ts"
SERVICE = "capabilities/bulk/src/index.ts"
PROOF = "packages/proof/src/import-export-bulk-proof.ts"
PROOF_INDEX = "packages/proof/src/index.ts"
TESTS = "tests/capabilities/import-export-bulk.test.ts"
PROOF_TESTS = "tests/packages/proof.test.ts"
STANDARD = "docs/architecture/import-export-and-bulk-operations-standard.md"
SOURCE_USE = "docs/architecture/parity-import-export-bulk-source-use-disposition-matrix.md"
BOOTSTRAP_SOURCE_USE = "docs/architecture/bootstrap-source-use-disposition-matrix.md"
DEPTH_MATRIX = "docs/architecture/import-export-bulk-deep-runtime-proof-depth-matrix.json"
ENTERPRISE_MODEL = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
MATRIX = "docs/architecture/react-parity-scope-classification-matrix.json"
PACKAGE = "package.json"
MAKEFILE = "Makefile"
SELFTEST_DIR = "tools/validate-parity/bulk-planted-defects"

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
    DEPTH_MATRIX,
    ENTERPRISE_MODEL,
    PACKAGE,
    MAKEFILE,
)

FORBIDDEN_OVERCLAIMS = [
    "production import/export readiness is proven",
    "production bulk-export readiness is proven",
    "production migration readiness is proven",
    "legal export readiness is proven",
    "regulatory export readiness is proven",
    "ediscovery readiness is proven",
    "live external provider readiness is proven",
    "live provider transfer is ready",
    "public bulk api ready",
    "production-live ready",
    "import/export/bulk readiness is complete",
    "usf-133 closure is proven",
]

LEAK_NEEDLES = [
    "leakmarker",
    "tenant-alpha/object/proof-key",
    "bearer proof",
    "secret://",
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
    depth_matrix = overrides.get("depth_matrix", read_json(DEPTH_MATRIX))
    enterprise_model = overrides.get("enterprise_model", read_json(ENTERPRISE_MODEL))
    return {
        "files": files,
        "matrix": matrix,
        "depth_matrix": depth_matrix,
        "enterprise_model": enterprise_model,
    }


def bulk_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    rows = []
    for row in matrix.get("domains", []):
        if not isinstance(row, dict):
            continue
        rid = str(row.get("react_item_id", ""))
        summary = str(row.get("behaviour_summary", "")).lower()
        if rid.startswith("bulk.") or "import/export" in summary or "bulk operation" in summary:
            rows.append(row)
    return rows


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files[CORE]
    bulk_core = core.split("// Import/export/bulk operations", 1)[-1]
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
    depth_matrix_text = files[DEPTH_MATRIX]
    enterprise_text = files[ENTERPRISE_MODEL]
    package = files[PACKAGE]
    makefile = files[MAKEFILE]
    matrix = state["matrix"]
    depth_matrix = state["depth_matrix"]
    enterprise_model = state["enterprise_model"]

    for token in [
        "BULK_OPERATION_TYPES",
        "BULK_OPERATION_CLASSIFICATIONS",
        "BULK_OPERATION_STATUSES",
        "BULK_SOURCE_DESTINATION_TYPES",
        "BULK_FILE_FORMATS",
        "BulkOperationPolicyError",
        "EvidencePackageManifest",
        "createEvidencePackageManifest",
        "assertBulkFileFormatSafety",
        "createBulkValidationError",
        "createBulkItemOutcome",
        "toSafeBulkOperationView",
    ]:
        if token not in bulk_core:
            F.add("USF-BULK-001", CORE, f"core model missing {token}")
    if "export const BULK_OPERATION_TYPES = Object.freeze" not in bulk_core:
        F.add("USF-BULK-001", CORE, "bulk operation type declaration missing")
    for token in [
        "import",
        "export",
        "bulk-create",
        "bulk-delete",
        "audit-export",
        "evidence-package-export",
        "destructive",
        "high-risk",
        "uploaded-file",
        "evidence-package",
        "csv",
        "jsonl",
        "zip",
        "formula-injection-blocked",
        "archive-traversal-blocked",
        "idempotency-required",
        "destructive-rollback-posture-required",
    ]:
        if token not in bulk_core:
            F.add("USF-BULK-001", CORE, f"controlled value or rule missing {token}")

    if "Import, Export, and Bulk Operations Standard" not in standard:
        F.add("USF-BULK-002", STANDARD, "bulk standard missing")
    for token in [
        "Import/Export As Governed Data Movement",
        "Bulk Operation Classification",
        "File Format Safety",
        "Schema Versioning/Mapping",
        "Validation/Preview/Dry-Run",
        "Evidence Package Model",
        "Retention/Legal Hold/Purge",
        "API/OpenAPI Safety",
    ]:
        if token not in standard:
            F.add("USF-BULK-002", STANDARD, f"standard missing section {token}")
    if "Parity Import/Export/Bulk Source-Use Disposition Matrix" not in source_use:
        F.add("USF-BULK-002", SOURCE_USE, "domain source-use matrix missing")

    if "ImportExportPort" not in ports or "appendItemOutcome" not in ports:
        F.add("USF-BULK-003", PORTS, "ImportExportPort missing")
    for token in [
        "InMemoryImportExportStore",
        "findByIdempotencyKey",
        "opaqueHash(`bulk-cursor",
        "itemOutcomes",
    ]:
        if token not in adapter:
            F.add("USF-BULK-003", ADAPTER, f"adapter missing {token}")
    for token in [
        "createBulkOperationService",
        "authorize(context",
        "guardrails.evaluate",
        "rejectIfSourceFileUnsafe",
        "enqueueJob",
        "recordSecuritySignal",
        "createAuditEventDraft",
        "preview-hash-mismatch",
        "bulk.operation.denied",
    ]:
        if token not in service:
            F.add("USF-BULK-003", SERVICE, f"service missing {token}")

    if (
        "export async function runImportExportBulkProof" not in proof
        or "productionImportExportReadinessClaim: false" not in proof
    ):
        F.add("USF-BULK-004", PROOF, "bulk proof missing")
    if "runImportExportBulkProof" not in proof_index:
        F.add("USF-BULK-004", PROOF_INDEX, "bulk proof export missing")
    if "proof:bulk" not in package or "validate-bulk.py all --json" not in package:
        F.add("USF-BULK-004", PACKAGE, "bulk package script wiring missing")
    if "bulk-proof" not in makefile:
        F.add("USF-BULK-004", MAKEFILE, "make bulk-proof missing")

    for token in [
        "tenant A cannot read/list/start/cancel tenant B bulk operation",
        "missing tenant context",
        "missing PDP permission",
        "unknown operation type",
        "requires idempotency",
        "dry-run and preview are deterministic",
        "CSV formula injection",
        "quarantined imports cannot process",
        "object keys",
        "guardrail denial",
        "concrete service actors",
        "evidence-package",
    ]:
        if token not in tests and token.lower() not in tests.lower():
            F.add("USF-BULK-005", TESTS, f"capability test missing {token}")
    if "runImportExportBulkProof" not in proof_tests:
        F.add("USF-BULK-005", PROOF_TESTS, "proof test missing")

    rows = bulk_rows(matrix)
    if len(rows) < 20:
        F.add("USF-BULK-006", MATRIX, "bulk parity matrix rows incomplete")
    for rid in [
        "bulk.import-operations",
        "bulk.export-operations",
        "bulk.evidence-package-export",
        "bulk.file-backed-import-export",
        "bulk.job-backed-execution",
        "bulk.validation-dry-run-preview",
        "bulk.idempotency",
        "bulk.guardrails",
        "bulk.api-openapi-surfaces",
        "bulk.provider-external-transfer-posture",
        "bulk.react-ui-playwright-behaviours",
    ]:
        if not any(row.get("react_item_id") == rid for row in rows):
            F.add("USF-BULK-006", MATRIX, f"bulk row missing {rid}")
    if not all(row.get("domain_authorised") is True for row in rows if str(row.get("react_item_id", "")).startswith("bulk.")):
        F.add("USF-BULK-006", MATRIX, "bulk rows are not domain-authorised")
    for path in [
        "adapters/bulk/src/index.ts",
        "capabilities/bulk/src/index.ts",
        "packages/proof/src/import-export-bulk-proof.ts",
        "tests/capabilities/import-export-bulk.test.ts",
        "tools/validate-parity/validate-bulk.py",
    ]:
        if path not in bootstrap_source_use or path not in source_use:
            F.add("USF-BULK-006", path, "runtime/proof/test file missing source-use disposition")

    overclaim_sources = "\n".join([standard, source_use, proof])
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in overclaim_sources.lower():
            F.add("USF-BULK-007", "bulk-overclaim", f"overclaim phrase present: {phrase}")
    leak_sources = {
        SERVICE: service,
        PROOF: proof,
        TESTS: tests,
    }
    for path, text in leak_sources.items():
        lowered = text.lower()
        for needle in LEAK_NEEDLES:
            if needle in lowered and needle not in {"object_key", "raw payload", "raw row payload"}:
                F.add("USF-BULK-007", path, f"unsafe literal present: {needle}")
    if "safeBulkMessage" not in bulk_core or "bulkTextLooksSensitive" not in bulk_core:
        F.add("USF-BULK-007", CORE, "bulk redaction helpers missing")
    if 'leakMarker: "object_key"' in proof:
        F.add("USF-BULK-007", PROOF, "proof output contains object key leak marker")
    if "object_key" not in tests or "object_key" not in proof:
        F.add("USF-BULK-007", TESTS, "object key leak scan missing from tests/proof")

    if "bulk.operation.created" not in core or "evidence_package.created" not in core:
        F.add("USF-BULK-008", CORE, "bulk audit event taxonomy missing")
    if "recordSecuritySignal" not in service or "bulk.operation.large_export" not in service:
        F.add("USF-BULK-008", SERVICE, "bulk observability linkage missing")

    for token in [
        'sourceIssue: "USF-163"',
        'deepRuntimePosture: "bounded-local-deep-runtime-proof"',
        "deepRuntimeEvidence",
        "boundedDeepRuntimeProven: true,",
        "apiOpenApiSurfaceReclassified: true,",
        "transactionalResumableImportChecked: true,",
        "liveExternalTransferProviderBoundaryChecked: true,",
        "parserAdapterBoundaryChecked: true,",
        "decompressionBombRejected: true,",
        "rollbackCompensationWorkflowChecked: true,",
        "approvalSeparationOfDutiesChecked: true,",
        "exportPurgeRetentionSchedulerChecked: true,",
        "legalHoldWorkflowRuntimeChecked: true,",
        "legalEdiscoveryRegulatoryBoundaryChecked: true,",
        "productionMigrationBoundaryExplicit: true,",
        "crossDomainDependencyLinkageChecked: true,",
        "tenantAccessAuditSecretCleanupEvidenceChecked: true,",
        "unavailableProviderFailClosedChecked: true,",
        "productionMigrationReadinessClaim: false,",
        "legalExportReadinessClaim: false,",
        "eDiscoveryReadinessClaim: false,",
        "regulatoryExportReadinessClaim: false,",
        "liveExternalProviderReadinessClaim: false,",
        "decompression-bomb-blocked",
        "provider-transfer-deferred",
        "service.retry(",
        "service.rollback(",
        "service.purge(",
    ]:
        if token not in proof:
            F.add("USF-BULK-009", PROOF, f"USF-163 proof marker missing {token}")
    for token in [
        'sourceIssue: "USF-163"',
        "boundedDeepRuntimeProven: true",
        "transactionalResumableImportChecked: true",
        "liveExternalTransferProviderBoundaryChecked: true",
        "decompressionBombRejected: true",
        "rollbackCompensationWorkflowChecked: true",
        "approvalSeparationOfDutiesChecked: true",
        "exportPurgeRetentionSchedulerChecked: true",
        "legalHoldWorkflowRuntimeChecked: true",
        "productionMigrationReadinessClaim: false",
        "legalExportReadinessClaim: false",
        "eDiscoveryReadinessClaim: false",
        "regulatoryExportReadinessClaim: false",
        "liveExternalProviderReadinessClaim: false",
    ]:
        if token not in proof_tests:
            F.add("USF-BULK-009", PROOF_TESTS, f"USF-163 proof test marker missing {token}")
    for token in [
        "retry(",
        "rollback(",
        "purge(",
        "provider-transfer-deferred",
        "bulk.operation.rolled_back",
        "bulk.operation.purged",
        "requester-cannot-self-approve",
        "legal-hold-active",
    ]:
        if token not in service:
            F.add("USF-BULK-009", SERVICE, f"USF-163 service marker missing {token}")
    for token in [
        "USF-163 bounded deep runtime controls",
        "bulk.operation.retry",
        "bulk.operation.rollback",
        "decompression-bomb-blocked",
        "provider-transfer-deferred",
        "legal-hold-active",
    ]:
        if token not in tests:
            F.add("USF-BULK-009", TESTS, f"USF-163 test marker missing {token}")

    if not isinstance(depth_matrix, dict):
        F.add("USF-BULK-010", DEPTH_MATRIX, "USF-163 proof-depth matrix must exist and parse")
        depth_matrix = {}
    if depth_matrix.get("sourceIssue") != "USF-163":
        F.add("USF-BULK-010", DEPTH_MATRIX, "matrix must be scoped to USF-163")
    if depth_matrix.get("proofCommand") != "make bulk-proof":
        F.add("USF-BULK-010", DEPTH_MATRIX, "matrix proof command must be make bulk-proof")
    if depth_matrix.get("validationCommand") != "python3 tools/validate-parity/validate-bulk.py all --json":
        F.add("USF-BULK-010", DEPTH_MATRIX, "matrix validation command must be validate-bulk")
    claims = depth_matrix.get("claims", {})
    if not isinstance(claims, dict) or claims.get("boundedDeepRuntimeProven") is not True:
        F.add("USF-BULK-010", DEPTH_MATRIX, "matrix must record boundedDeepRuntimeProven=true")
    for true_claim in (
        "apiOpenApiSurfaceReclassified",
        "transactionalResumableImportChecked",
        "liveExternalTransferProviderBoundaryChecked",
        "parserAdapterBoundaryChecked",
        "decompressionBombRejected",
        "rollbackCompensationWorkflowChecked",
        "approvalSeparationOfDutiesChecked",
        "exportPurgeRetentionSchedulerChecked",
        "legalHoldWorkflowRuntimeChecked",
        "legalEdiscoveryRegulatoryBoundaryChecked",
        "productionMigrationBoundaryExplicit",
        "crossDomainDependencyLinkageChecked",
        "tenantAccessAuditSecretCleanupEvidenceChecked",
        "unavailableProviderFailClosedChecked",
    ):
        if claims.get(true_claim) is not True:
            F.add("USF-BULK-010", DEPTH_MATRIX, f"matrix claim must be true: {true_claim}")
    for false_claim in (
        "productionMigrationReadinessClaim",
        "legalExportReadinessClaim",
        "eDiscoveryReadinessClaim",
        "regulatoryExportReadinessClaim",
        "liveExternalProviderReadinessClaim",
        "testReadinessClaim",
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "socReadinessClaim",
        "iso27001CertificationClaim",
        "enterpriseProductionReadinessClaim",
        "fullDevReadinessClaim",
        "fullProductReadinessClaim",
        "usf133ClosureClaim",
    ):
        if claims.get(false_claim) is not False:
            F.add("USF-BULK-013", DEPTH_MATRIX, f"matrix claim must be false: {false_claim}")
    controls = depth_matrix.get("controls", [])
    if not isinstance(controls, list):
        F.add("USF-BULK-010", DEPTH_MATRIX, "matrix controls must be a list")
        controls = []
    control_ids = {item.get("id") for item in controls if isinstance(item, dict)}
    for required in (
        "local-foundation-preserved",
        "transactional-resumable-import-applier",
        "provider-transfer-fail-closed-boundary",
        "parser-adapter-and-decompression-controls",
        "rollback-compensation-workflow",
        "approval-separation-of-duties",
        "export-purge-retention-scheduler",
        "legal-hold-workflow-runtime",
        "api-openapi-surface-boundary",
        "legal-ediscovery-regulatory-export-boundary",
        "production-migration-boundary",
        "cross-domain-linkage",
    ):
        if required not in control_ids:
            F.add("USF-BULK-010", DEPTH_MATRIX, f"missing control {required}")
    for item in controls:
        if not isinstance(item, dict):
            continue
        status = item.get("status")
        if status in {"out-of-scope-with-rationale", "deferred-with-owner"}:
            for field in (
                "owner",
                "riskOwner",
                "controlOwner",
                "riskTreatment",
                "reviewDate",
                "promotionImpact",
                "nonClaimBoundary",
            ):
                if not item.get(field):
                    F.add(
                        "USF-BULK-012",
                        f"{DEPTH_MATRIX}#{item.get('id')}",
                        f"reclassified control missing {field}",
                    )
        if status in {"proven-local", "bounded-local-proof"}:
            for field in ("proofCommand", "validationCommand", "evidenceRefs", "nonClaimBoundary"):
                if not item.get(field):
                    F.add(
                        "USF-BULK-010",
                        f"{DEPTH_MATRIX}#{item.get('id')}",
                        f"proven control missing {field}",
                    )
    for token in (
        "broad HTTP/OpenAPI",
        "live transfer provider",
        "provider-source",
        "provider-destination",
        "parser adapter",
        "decompression-bomb",
        "rollback",
        "compensation",
        "separate approval",
        "legal hold",
        "legal",
        "eDiscovery",
        "regulatory",
        "production migration",
        "No production migration",
    ):
        if token not in json.dumps(depth_matrix):
            F.add("USF-BULK-012", DEPTH_MATRIX, f"reclassified boundary missing {token}")

    enterprise_row_ids = set()
    if isinstance(enterprise_model, dict):
        for key in (
            "soaSupportMappings",
            "evidenceRegister",
            "threatModelAbuseCaseRegister",
            "accessReviewPrivilegedOperationPosture",
            "backupRestoreResiliencePosture",
            "incidentVulnerabilityManagementEvidence",
            "privacyDataMinimisationPosture",
        ):
            rows_for_key = enterprise_model.get(key, [])
            if isinstance(rows_for_key, list):
                enterprise_row_ids.update(
                    row.get("id") for row in rows_for_key if isinstance(row, dict)
                )
    for row_id in (
        "soa-usf-163-import-export-bulk-deep-runtime",
        "evidence-usf-163-import-export-bulk-deep-runtime",
        "threat-usf-163-import-export-bulk-deep-runtime",
        "access-usf-163-import-export-bulk-deep-runtime",
        "resilience-usf-163-import-export-bulk-deep-runtime",
        "incident-usf-163-import-export-bulk-deep-runtime",
        "privacy-usf-163-import-export-bulk-deep-runtime",
    ):
        if row_id not in enterprise_row_ids:
            F.add("USF-BULK-011", ENTERPRISE_MODEL, f"enterprise row missing {row_id}")
    for token in (
        "effectivenessState=proven-local",
        "sourceIssue=USF-163",
        "import-export-bulk-deep-runtime-proof-depth-matrix",
        "boundedDeepRuntimeProven=true",
        "productionMigrationReadinessClaim=false",
        "legalExportReadinessClaim=false",
        "eDiscoveryReadinessClaim=false",
        "regulatoryExportReadinessClaim=false",
        "liveExternalProviderReadinessClaim=false",
    ):
        if token.lower() not in enterprise_text.lower():
            F.add("USF-BULK-011", ENTERPRISE_MODEL, f"enterprise evidence token missing {token}")

    usf163_sources = "\n".join([standard, source_use, depth_matrix_text, proof, json.dumps(depth_matrix)])
    for phrase in (
        "production migration readiness is proven",
        "legal export readiness is proven",
        "ediscovery readiness is proven",
        "regulatory export readiness is proven",
        "live external provider readiness is proven",
        "public bulk api readiness is proven",
        "import/export/bulk readiness is complete",
        "usf-133 closure is proven",
    ):
        if phrase in usf163_sources.lower():
            F.add("USF-BULK-013", "USF-163", f"readiness overclaim present: {phrase}")


def apply_defect(state, defect):
    mutated = {
        "files": dict(state["files"]),
        "matrix": json.loads(json.dumps(state["matrix"])),
        "depth_matrix": json.loads(json.dumps(state["depth_matrix"])),
        "enterprise_model": json.loads(json.dumps(state["enterprise_model"])),
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
        elif target == "depth_matrix":
            text = json.dumps(mutated["depth_matrix"])
            if old not in text:
                raise AssertionError(
                    f"old text not found in depth matrix for defect {defect.get('id')}"
                )
            mutated["depth_matrix"] = json.loads(text.replace(old, new, 1))
            mutated["files"][DEPTH_MATRIX] = json.dumps(mutated["depth_matrix"])
        elif target == "enterprise_model":
            text = json.dumps(mutated["enterprise_model"])
            if old not in text:
                raise AssertionError(
                    f"old text not found in enterprise model for defect {defect.get('id')}"
                )
            mutated["enterprise_model"] = json.loads(text.replace(old, new, 1))
            mutated["files"][ENTERPRISE_MODEL] = json.dumps(mutated["enterprise_model"])
        else:
            text = mutated["files"].get(target, "")
            if old not in text:
                raise AssertionError(f"old text not found in {target} for defect {defect.get('id')}")
            mutated["files"][target] = text.replace(old, new, 1)
    return mutated


def run_selftest(F):
    if not os.path.isdir(SELFTEST_DIR):
        F.add("USF-BULK-SELFTEST", SELFTEST_DIR, "bulk planted-defects directory missing")
        return
    base = build_state()
    files = sorted(name for name in os.listdir(SELFTEST_DIR) if name.endswith(".json"))
    if len(files) < 5:
        F.add("USF-BULK-SELFTEST", SELFTEST_DIR, "not enough bulk planted defects")
        return
    for name in files:
        path = os.path.join(SELFTEST_DIR, name)
        defect = read_json(path)
        if not isinstance(defect, dict):
            F.add("USF-BULK-SELFTEST", path, "planted defect is not valid JSON")
            continue
        expected = defect.get("expectedRuleId")
        child = Findings()
        try:
            run_checks(child, apply_defect(base, defect))
        except Exception as exc:  # noqa: BLE001
            child.add("USF-BULK-SELFTEST", path, f"defect application failed: {exc}")
        if expected not in {item["ruleId"] for item in child.items}:
            F.add("USF-BULK-SELFTEST", path, f"expected {expected} was not raised")


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
