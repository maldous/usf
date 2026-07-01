#!/usr/bin/env python3
"""USF observability/telemetry parity validator (USF-158).

Governance tooling only. It creates no runtime files, imports no React source, and
publishes no evidence. It fails closed on controlled-observability invariants:
classified telemetry signals, tenant-safe metric labels, redaction before capture,
context propagation, PDP-protected observability surfaces, provider-mode-aware
health/readiness/liveness, source-use honesty, and no live monitoring, SIEM,
alerting, SOC, ISO, dashboard, incident-response, or production readiness claim.
"""
import argparse
import json
import os
import re
import sys

RULES = {
    "USF-OBSERVABILITY-001": ("blocking", "observability semantic model missing"),
    "USF-OBSERVABILITY-002": ("blocking", "observability standard or source-use matrix missing"),
    "USF-OBSERVABILITY-003": ("blocking", "telemetry collector lacks safe redaction, label, or tenant controls"),
    "USF-OBSERVABILITY-004": ("blocking", "observability proof or command wiring missing"),
    "USF-OBSERVABILITY-005": ("blocking", "observability tests missing required behaviours"),
    "USF-OBSERVABILITY-006": ("blocking", "observability API/OpenAPI surface missing or unsafe"),
    "USF-OBSERVABILITY-007": ("blocking", "observability PDP/audit posture missing"),
    "USF-OBSERVABILITY-008": ("blocking", "observability parity matrix rows lack authorisation/backing"),
    "USF-OBSERVABILITY-009": ("blocking", "observability live/SIEM/alerting/SOC/ISO/production overclaim"),
    "USF-OBSERVABILITY-010": ("blocking", "Lane 4 operations telemetry posture missing"),
    "USF-OBSERVABILITY-011": ("blocking", "Lane 4 redaction or unsafe log boundary missing"),
    "USF-OBSERVABILITY-012": ("blocking", "Lane 4 alert dashboard or incident boundary missing"),
    "USF-OBSERVABILITY-013": ("blocking", "USF-159 observability operations proof-depth markers are missing"),
    "USF-OBSERVABILITY-014": ("blocking", "USF-159 observability operations proof-depth matrix is missing or incomplete"),
    "USF-OBSERVABILITY-015": ("blocking", "USF-159 enterprise evidence rows are missing"),
    "USF-OBSERVABILITY-016": ("blocking", "USF-159 reclassified observability boundary is incomplete"),
    "USF-OBSERVABILITY-017": ("blocking", "USF-159 observability readiness claim is overclaimed"),
    "USF-OBSERVABILITY-SELFTEST": ("blocking", "planted observability defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
PORTS = "packages/ports/src/index.ts"
ADAPTER = "adapters/obs/src/index.ts"
AUTHZ_POLICY = "capabilities/tenant/src/authorization-policy.ts"
SERVER = "apps/api/src/server.ts"
CONTRACTS = "packages/contracts/src/index.ts"
API_SURFACE = "packages/contracts/src/api-surface.ts"
OPENAPI_BUILDER = "packages/openapi/src/index.ts"
OPENAPI_JSON = "packages/openapi/openapi.json"
PROOF = "packages/proof/src/observability-telemetry-proof.ts"
PROOF_INDEX = "packages/proof/src/index.ts"
TESTS = "tests/capabilities/observability-telemetry.test.ts"
API_TESTS = "tests/apps/api-contracts.test.ts"
PROOF_TESTS = "tests/packages/proof.test.ts"
STANDARD = "docs/architecture/observability-telemetry-and-operational-evidence-standard.md"
SOURCE_USE = "docs/architecture/parity-observability-telemetry-source-use-disposition-matrix.md"
BOOTSTRAP_SOURCE_USE = "docs/architecture/bootstrap-source-use-disposition-matrix.md"
OPERATIONS_SIGNAL = "spec/instances/observability-signal/observability-operations-posture.json"
ENTERPRISE_MODEL = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
DEPTH_MATRIX = "docs/architecture/observability-operations-enterprise-proof-depth-matrix.json"
MATRIX = "docs/architecture/react-parity-scope-classification-matrix.json"
PACKAGE = "package.json"
MAKEFILE = "Makefile"
SELFTEST_DIR = "tools/validate-parity/observability-planted-defects"

SOURCE_FILES = (
    CORE,
    PORTS,
    ADAPTER,
    AUTHZ_POLICY,
    SERVER,
    CONTRACTS,
    API_SURFACE,
    OPENAPI_BUILDER,
    OPENAPI_JSON,
    PROOF,
    PROOF_INDEX,
    TESTS,
    API_TESTS,
    PROOF_TESTS,
    STANDARD,
    SOURCE_USE,
    BOOTSTRAP_SOURCE_USE,
    OPERATIONS_SIGNAL,
    ENTERPRISE_MODEL,
    DEPTH_MATRIX,
    PACKAGE,
    MAKEFILE,
)

FORBIDDEN_OUTPUT_NEEDLES = [
    "secret://",
    "endpoint://",
    "Bearer synthetic-token-value",
    "recipient@sample.invalid",
    "tenant-alpha/object/synthetic-sensitive-key",
    "stack trace hidden",
    "provider_response",
    "production ready",
    "siem readiness is proven",
    "live monitoring readiness is proven",
    "soc ready",
    "iso certified",
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


def parse_json_text(text):
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in SOURCE_FILES}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides.get("matrix", read_json(MATRIX))
    openapi = overrides.get("openapi", read_json(OPENAPI_JSON))
    operations_signal = overrides.get("operations_signal", parse_json_text(files.get(OPERATIONS_SIGNAL, "")))
    enterprise_model = overrides.get("enterprise_model", parse_json_text(files.get(ENTERPRISE_MODEL, "")))
    depth_matrix = overrides.get("depth_matrix", parse_json_text(files.get(DEPTH_MATRIX, "")))
    return {
        "files": files,
        "matrix": matrix,
        "openapi": openapi,
        "operations_signal": operations_signal,
        "enterprise_model": enterprise_model,
        "depth_matrix": depth_matrix,
    }


def observability_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    rows = []
    for row in matrix.get("domains", []):
        if not isinstance(row, dict):
            continue
        rid = str(row.get("react_item_id", ""))
        summary = str(row.get("behaviour_summary", "")).lower()
        if rid.startswith("observability") or "observability" in summary or "telemetry" in summary:
            rows.append(row)
    return rows


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files[CORE]
    ports = files[PORTS]
    adapter = files[ADAPTER]
    authz = files[AUTHZ_POLICY]
    server = files[SERVER]
    contracts = files[CONTRACTS]
    api_surface = files[API_SURFACE]
    openapi_builder = files[OPENAPI_BUILDER]
    openapi_text = files[OPENAPI_JSON]
    proof = files[PROOF]
    proof_index = files[PROOF_INDEX]
    tests = files[TESTS]
    api_tests = files[API_TESTS]
    proof_tests = files[PROOF_TESTS]
    standard = files[STANDARD]
    source_use = files[SOURCE_USE]
    bootstrap_source_use = files[BOOTSTRAP_SOURCE_USE]
    operations_signal = state.get("operations_signal")
    enterprise_model = state.get("enterprise_model")
    depth_matrix = state.get("depth_matrix")
    package = files[PACKAGE]
    makefile = files[MAKEFILE]
    matrix = state["matrix"]
    openapi = state["openapi"]

    for token in [
        "TELEMETRY_SIGNAL_CATEGORIES",
        "OBSERVABILITY_SIGNAL_CLASSIFICATIONS",
        "OBSERVABILITY_ALLOWED_LABELS",
        "OBSERVABILITY_FORBIDDEN_PATTERNS",
        "TelemetrySignalBase",
        "TelemetryValidationError",
        "validateMetricLabels",
        "redactTelemetryAttributes",
    ]:
        if token not in core:
            F.add("USF-OBSERVABILITY-001", CORE, f"core model missing {token}")
    if "export const TELEMETRY_SIGNAL_CATEGORIES = Object.freeze" not in core:
        F.add("USF-OBSERVABILITY-001", CORE, "telemetry signal category declaration missing")
    for token in [
        "metric",
        "span",
        "structured-log",
        "security-signal",
        "readiness-signal",
        "operational",
        "privacy-sensitive",
        "tenant-sensitive",
    ]:
        if token not in core:
            F.add("USF-OBSERVABILITY-001", CORE, f"controlled value missing {token}")

    if "TelemetryPort" not in ports or "recordMetric" not in ports or "recordStructuredLog" not in ports:
        F.add("USF-OBSERVABILITY-001", PORTS, "telemetry port missing")
    if "InMemoryTelemetryCollector" not in adapter or "safeStatusView" not in adapter:
        F.add("USF-OBSERVABILITY-003", ADAPTER, "in-memory collector missing")
    for token in [
        "validateMetricLabels",
        "redactTelemetryAttributes",
        "redactTelemetryAttributes(input.safeAttributes)",
        "redactTelemetryAttributes(input.attributes)",
        "tenantId",
        "encodeCursor",
        "liveMonitoringReadinessClaim: false",
        "siemReadinessClaim: false",
    ]:
        if token not in adapter:
            F.add("USF-OBSERVABILITY-003", ADAPTER, f"collector control missing {token}")
    if "provider_response" not in core or "stack_trace" not in core or "recipient_address" not in core:
        F.add("USF-OBSERVABILITY-003", CORE, "blocked sensitive telemetry patterns missing")

    if not os.path.exists(STANDARD) or "controlled operational evidence surface" not in standard.lower():
        F.add("USF-OBSERVABILITY-002", STANDARD, "observability standard missing control language")
    for token in [
        "Signal Classification",
        "Tenant-Safe Telemetry",
        "Cardinality Governance",
        "Redaction And Sensitive Value Blocking",
        "Observability Access Control",
        "Deferred Depth",
    ]:
        if token not in standard:
            F.add("USF-OBSERVABILITY-002", STANDARD, f"standard section missing {token}")
    if not os.path.exists(SOURCE_USE) or "React UI/Playwright observability behaviours" not in source_use:
        F.add("USF-OBSERVABILITY-002", SOURCE_USE, "observability source-use matrix missing")
    if "Parity Observability/Telemetry Additions" not in bootstrap_source_use:
        F.add("USF-OBSERVABILITY-002", BOOTSTRAP_SOURCE_USE, "global source-use matrix missing observability additions")

    if "proof:observability" not in package or "validate-observability.py all --json" not in package:
        F.add("USF-OBSERVABILITY-004", PACKAGE, "observability proof/parity script wiring missing")
    if not re.search(r"(?m)^observability-proof:", makefile):
        F.add("USF-OBSERVABILITY-004", MAKEFILE, "make observability-proof missing")
    for token in [
        "runObservabilityTelemetryProof",
        "liveMonitoringReadinessClaim: false",
        "siemReadinessClaim: false",
        "iso27001CertificationClaim: false",
        "productionLiveClaim: false",
    ]:
        if token not in proof:
            F.add("USF-OBSERVABILITY-004", PROOF, f"proof missing {token}")
    if "runObservabilityTelemetryProof" not in proof_index or "runObservabilityTelemetryProof" not in proof_tests:
        F.add("USF-OBSERVABILITY-004", PROOF_TESTS, "observability proof export/test missing")

    for token in [
        "allow-listed",
        "high-cardinality labels",
        "secret-looking metric label",
        "redacts span attributes",
        "tenant A cannot query tenant B telemetry",
        "health and readiness are distinct",
        "security signal",
    ]:
        if token not in tests:
            F.add("USF-OBSERVABILITY-005", TESTS, f"observability test missing {token}")
    if "guards and redacts observability surfaces" not in api_tests or "corr-observability-api" not in api_tests:
        F.add("USF-OBSERVABILITY-005", API_TESTS, "observability API tests missing")

    if (
        '"/v1/observability/readiness"' not in server
        or '"/v1/observability/signals"' not in server
    ):
        F.add("USF-OBSERVABILITY-006", SERVER, "observability API routes missing")
    if '"observability.readiness.read"' not in server or '"observability.signal.read"' not in server:
        F.add("USF-OBSERVABILITY-006", SERVER, "observability routes lack PDP actions")
    if "toSafeTelemetrySignalView" not in server or "recordSecuritySignal" not in server:
        F.add("USF-OBSERVABILITY-006", SERVER, "observability route safety/security signal handling missing")
    if "ObservabilityReadinessResponseSchema" not in contracts or "ObservabilitySignalsResponseSchema" not in contracts:
        F.add("USF-OBSERVABILITY-006", CONTRACTS, "observability schemas missing")
    if "observability-readiness.get" not in api_surface or "observability-signals.list" not in api_surface:
        F.add("USF-OBSERVABILITY-006", API_SURFACE, "observability route metadata missing")
    if "ObservabilitySignalsQuery" not in openapi_builder or "ObservabilitySignalsResponse" not in openapi_builder:
        F.add("USF-OBSERVABILITY-006", OPENAPI_BUILDER, "OpenAPI builder missing observability schemas/query")
    if not isinstance(openapi, dict) or "/v1/observability/signals" not in (openapi.get("paths") or {}):
        F.add("USF-OBSERVABILITY-006", OPENAPI_JSON, "committed OpenAPI missing observability routes")
    for needle in FORBIDDEN_OUTPUT_NEEDLES:
        if needle.lower() in openapi_text.lower():
            F.add("USF-OBSERVABILITY-006", OPENAPI_JSON, f"OpenAPI contains unsafe observability content {needle}")

    if "observability.signal.read" not in authz or "observability.readiness.read" not in authz:
        F.add("USF-OBSERVABILITY-007", AUTHZ_POLICY, "observability PDP actions missing")
    if "observability.read" not in core or "observability.readiness.checked" not in core:
        F.add("USF-OBSERVABILITY-007", CORE, "observability audit event types missing")
    if "observability.readiness.checked" not in server or "observability.read" not in server:
        F.add("USF-OBSERVABILITY-007", SERVER, "observability access audit missing")

    rows = observability_rows(matrix)
    if len(rows) < 5:
        F.add("USF-OBSERVABILITY-008", MATRIX, "observability parity matrix rows incomplete")
    main = [row for row in rows if row.get("react_item_id") == "observability"]
    if not main or main[0].get("domain_authorised") is not True:
        F.add("USF-OBSERVABILITY-008", MATRIX, "observability main row not domain-authorised")
    if not any("USF-159" in str(row.get("linear_issue", "")) or "USF-159" in str(row.get("evidence", "")) for row in rows):
        F.add("USF-OBSERVABILITY-008", MATRIX, "observability depth lacks USF-159 linkage")
    if not any(row.get("react_item_id") == "observability.alerting-incident-dashboard-live-depth" for row in rows):
        F.add("USF-OBSERVABILITY-008", MATRIX, "deferred observability depth row missing")

    overclaim_sources = "\n".join([standard, source_use, proof, openapi_text])
    for phrase in [
        "live monitoring readiness is proven",
        "live alerting readiness is proven",
        "dashboard readiness is proven",
        "alert delivery readiness is proven",
        "incident-response readiness is proven",
        "live incident readiness is proven",
        "siem readiness is proven",
        "soc readiness is proven",
        "iso certified",
        "production monitoring readiness is proven",
        "production-live",
    ]:
        if phrase in overclaim_sources.lower():
            F.add("USF-OBSERVABILITY-009", "observability-overclaim", f"overclaim phrase present: {phrase}")

    if not isinstance(operations_signal, dict):
        F.add("USF-OBSERVABILITY-010", OPERATIONS_SIGNAL, "Lane 4 operations signal metadata missing or invalid")
        operations_signal = {}
    if operations_signal.get("id") != "observability.observability-operations-posture":
        F.add("USF-OBSERVABILITY-010", OPERATIONS_SIGNAL, "Lane 4 operations signal id missing")
    if operations_signal.get("signalKind") != "runtime-proof-output" or operations_signal.get("name") != "runtime-proof-output":
        F.add("USF-OBSERVABILITY-010", OPERATIONS_SIGNAL, "Lane 4 metadata must use runtime-proof-output signal")
    operations_text = json.dumps(operations_signal, sort_keys=True).lower()
    if "usf-188-evidence-observability-operations-posture" not in operations_text:
        F.add("USF-OBSERVABILITY-010", OPERATIONS_SIGNAL, "Lane 4 evidence reference missing")
    proof_refs = set(operations_signal.get("proofRefs", []))
    if "usf.proof-evidence.observability-signals-runtime-proof" not in proof_refs:
        F.add("USF-OBSERVABILITY-010", OPERATIONS_SIGNAL, "historical observability proof boundary missing")
    for token in ("logging", "tracing", "metrics", "correlation", "alerting", "dashboard", "incident"):
        if token not in operations_text:
            F.add("USF-OBSERVABILITY-010", OPERATIONS_SIGNAL, f"operations metadata missing {token}")

    if not isinstance(enterprise_model, dict):
        F.add("USF-OBSERVABILITY-010", ENTERPRISE_MODEL, "enterprise model missing or invalid")
        enterprise_model = {}
    enterprise_text = json.dumps(enterprise_model, sort_keys=True).lower()
    for row_id in (
        "usf-188-soa-observability-operations-control",
        "usf-188-evidence-observability-operations-posture",
        "usf-188-threat-observability-operations",
        "usf-188-access-observability-operator-surfaces",
        "usf-188-resilience-observability-evidence-retention",
        "usf-188-incident-observability-operations-boundary",
        "usf-188-privacy-observability-tenant-safe-redaction",
    ):
        if row_id not in enterprise_text:
            F.add("USF-OBSERVABILITY-010", ENTERPRISE_MODEL, f"enterprise row missing {row_id}")

    standard_enterprise = enterprise_model.get("observabilityEvidenceStandard", {})
    required_fields = set(standard_enterprise.get("requiredFields", []))
    prohibited_fields = set(standard_enterprise.get("prohibitedFields", []))
    for field in ("signalKind", "incidentBoundary", "redactionStatus", "tenantLabelPosture", "dashboardBoundary"):
        if field not in required_fields:
            F.add("USF-OBSERVABILITY-010", f"observabilityEvidenceStandard.requiredFields.{field}", "missing Lane 4 required telemetry field")
    for field in ("rawSecret", "rawToken", "rawLogMessage", "unsafeLogMessage", "tenantName", "userEmail", "rawObjectKey"):
        if field not in prohibited_fields:
            F.add("USF-OBSERVABILITY-011", f"observabilityEvidenceStandard.prohibitedFields.{field}", "missing Lane 4 prohibited leakage field")
    for token in (
        "rawsecretleakage=blocked",
        "unsafelogboundary=message-template-only",
        "tenantsafelabels=allow-listed",
        "redactionstatus=tenant-safe-required",
    ):
        if token not in enterprise_text:
            F.add("USF-OBSERVABILITY-011", ENTERPRISE_MODEL, f"redaction or unsafe-log token missing {token}")

    for token in (
        "alertingworkflow=deferred-with-owner",
        "dashboardworkflow=deferred-with-owner",
        "incidentboundary=explicit-local-evidence-only",
        "followupissue=usf-159",
        "reviewdate=2026-09-30",
    ):
        if token not in enterprise_text:
            F.add("USF-OBSERVABILITY-012", ENTERPRISE_MODEL, f"alert/dashboard/incident boundary token missing {token}")
    for token in (
        "Lane 4 Observability Operations Posture",
        "alertingWorkflow=deferred-with-owner",
        "dashboardReadinessClaim=false",
        "incidentBoundary=explicit-local-evidence-only",
        "Unsafe logs fail validation",
    ):
        if token not in standard:
            F.add("USF-OBSERVABILITY-012", STANDARD, f"Lane 4 standard token missing {token}")

    for token in [
        'sourceIssue: "USF-159"',
        "operationsDepthEvidence",
        "localOperationsDepthProven: true",
        "liveBackendBoundaryReclassified: true",
        "providerCredentialsSecretReferenceChecked: true",
        "tenantSafeLabelsChecked: true",
        "redactionChecked: true",
        "retentionBoundaryExplicit: true",
        "accessBoundaryChecked: true",
        "auditEvidenceBoundaryChecked: true",
        "alertDeliveryReclassified: true",
        "dashboardRuntimeReclassified: true",
        "incidentWorkflowReclassified: true",
        "sliSloMeasurementReclassified: true",
        "crossTenantAggregateBoundaryChecked: true",
        "liveOperationsReadinessClaim: false",
        "USF-159 operations depth evidence reclassifies live backends alerting dashboards incident workflow retention purge SLI SLO and cross-tenant aggregate depth without readiness claims",
    ]:
        if token not in proof:
            F.add("USF-OBSERVABILITY-013", PROOF, f"USF-159 proof marker missing {token}")
    for token in [
        'sourceIssue: "USF-159"',
        "localOperationsDepthProven: true",
        "liveBackendBoundaryReclassified: true",
        "alertDeliveryReclassified: true",
        "dashboardRuntimeReclassified: true",
        "incidentWorkflowReclassified: true",
    ]:
        if token not in proof_tests:
            F.add("USF-OBSERVABILITY-013", PROOF_TESTS, f"USF-159 proof test marker missing {token}")

    if not isinstance(depth_matrix, dict):
        F.add("USF-OBSERVABILITY-014", DEPTH_MATRIX, "USF-159 proof-depth matrix must exist and parse")
        depth_matrix = {}
    if depth_matrix.get("sourceIssue") != "USF-159":
        F.add("USF-OBSERVABILITY-014", DEPTH_MATRIX, "matrix must be scoped to USF-159")
    if depth_matrix.get("proofCommand") != "make observability-proof":
        F.add("USF-OBSERVABILITY-014", DEPTH_MATRIX, "matrix proof command must be make observability-proof")
    claims = depth_matrix.get("claims", {})
    if not isinstance(claims, dict) or claims.get("localOperationsDepthProven") is not True:
        F.add("USF-OBSERVABILITY-014", DEPTH_MATRIX, "matrix must record localOperationsDepthProven=true")
    for false_claim in (
        "liveMonitoringReadinessClaim",
        "liveAlertingClaim",
        "dashboardReadinessClaim",
        "incidentResponseReadinessClaim",
        "siemReadinessClaim",
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "socReadinessClaim",
        "iso27001CertificationClaim",
        "fullDevReadinessClaim",
        "fullReactParityClaim",
        "usf133ClosureClaim",
    ):
        if claims.get(false_claim) is not False:
            F.add("USF-OBSERVABILITY-017", DEPTH_MATRIX, f"matrix claim must be false: {false_claim}")
    controls = depth_matrix.get("controls", [])
    if not isinstance(controls, list):
        F.add("USF-OBSERVABILITY-014", DEPTH_MATRIX, "matrix controls must be a list")
        controls = []
    control_ids = {item.get("id") for item in controls if isinstance(item, dict)}
    for required in (
        "local-telemetry-operations-depth",
        "provider-credential-boundary",
        "tenant-redaction-access-audit-retention",
        "live-backend-export-boundary",
        "alert-dashboard-incident-boundary",
        "sli-slo-cross-tenant-aggregate-boundary",
    ):
        if required not in control_ids:
            F.add("USF-OBSERVABILITY-014", DEPTH_MATRIX, f"missing control {required}")
    for item in controls:
        if not isinstance(item, dict):
            continue
        status = item.get("status")
        if status in {"out-of-scope-with-rationale", "deferred-with-owner"}:
            for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate", "promotionImpact", "nonClaimBoundary"):
                if not item.get(field):
                    F.add("USF-OBSERVABILITY-016", f"{DEPTH_MATRIX}#{item.get('id')}", f"reclassified control missing {field}")
        if item.get("status") in {"proven-local", "bounded-local-proof"}:
            for field in ("proofCommand", "validationCommand", "evidenceRefs", "nonClaimBoundary"):
                if not item.get(field):
                    F.add("USF-OBSERVABILITY-014", f"{DEPTH_MATRIX}#{item.get('id')}", f"proven control missing {field}")
    for token in (
        "live telemetry backends",
        "SIEM export",
        "alert delivery",
        "dashboard runtime",
        "incident workflow",
        "retention purge",
        "SLI/SLO operation",
        "cross-tenant aggregate analytics",
        "No live observability backend",
    ):
        if token not in json.dumps(depth_matrix):
            F.add("USF-OBSERVABILITY-016", DEPTH_MATRIX, f"reclassified boundary missing {token}")

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
        "soa-usf-159-observability-operations-depth",
        "evidence-usf-159-observability-operations-depth",
        "threat-usf-159-observability-operations-depth",
        "access-usf-159-observability-operations-depth",
        "resilience-usf-159-observability-operations-depth",
        "incident-usf-159-observability-operations-depth",
        "privacy-usf-159-observability-operations-depth",
    ):
        if row_id not in enterprise_row_ids:
            F.add("USF-OBSERVABILITY-015", ENTERPRISE_MODEL, f"enterprise row missing {row_id}")
    for token in (
        "effectivenessState=proven-local",
        "sourceIssue=USF-159",
        "observability-operations-enterprise-proof-depth-matrix",
        "liveMonitoringReadinessClaim=false",
        "dashboardReadinessClaim=false",
        "incidentResponseReadinessClaim=false",
    ):
        if token.lower() not in enterprise_text:
            F.add("USF-OBSERVABILITY-015", ENTERPRISE_MODEL, f"enterprise evidence token missing {token}")

    usf159_sources = "\n".join([standard, source_use, files[DEPTH_MATRIX], proof, json.dumps(depth_matrix)])
    for phrase in (
        "live observability readiness is proven",
        "incident-response readiness is proven",
        "dashboard readiness is proven by usf-159",
        "alerting readiness is proven by usf-159",
        "siem readiness is proven by usf-159",
        "usf-133 closure is proven",
    ):
        if phrase in usf159_sources.lower():
            F.add("USF-OBSERVABILITY-017", "USF-159", f"readiness overclaim present: {phrase}")


def apply_defect(state, defect):
    mutated = {
        "files": dict(state["files"]),
        "matrix": json.loads(json.dumps(state["matrix"])),
        "openapi": json.loads(json.dumps(state["openapi"])),
        "operations_signal": json.loads(json.dumps(state["operations_signal"])),
        "enterprise_model": json.loads(json.dumps(state["enterprise_model"])),
        "depth_matrix": json.loads(json.dumps(state["depth_matrix"])),
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
                raise AssertionError(f"old text not found in depth matrix for defect {defect.get('id')}")
            mutated["depth_matrix"] = json.loads(text.replace(old, new, 1))
            mutated["files"][DEPTH_MATRIX] = json.dumps(mutated["depth_matrix"])
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
    mutated["operations_signal"] = parse_json_text(mutated["files"].get(OPERATIONS_SIGNAL, ""))
    mutated["enterprise_model"] = parse_json_text(mutated["files"].get(ENTERPRISE_MODEL, ""))
    mutated["depth_matrix"] = parse_json_text(mutated["files"].get(DEPTH_MATRIX, ""))
    return mutated


def run_selftest(F):
    if not os.path.isdir(SELFTEST_DIR):
        F.add("USF-OBSERVABILITY-SELFTEST", SELFTEST_DIR, "observability planted-defects directory missing")
        return
    base = build_state()
    files = sorted(name for name in os.listdir(SELFTEST_DIR) if name.endswith(".json"))
    if len(files) < 5:
        F.add("USF-OBSERVABILITY-SELFTEST", SELFTEST_DIR, "not enough observability planted defects")
        return
    for name in files:
        path = os.path.join(SELFTEST_DIR, name)
        defect = read_json(path)
        if not isinstance(defect, dict):
            F.add("USF-OBSERVABILITY-SELFTEST", path, "planted defect is not valid JSON")
            continue
        expected = defect.get("expectedRuleId")
        child = Findings()
        try:
            run_checks(child, apply_defect(base, defect))
        except Exception as exc:  # noqa: BLE001
            child.add("USF-OBSERVABILITY-SELFTEST", path, f"defect application failed: {exc}")
        if expected not in {item["ruleId"] for item in child.items}:
            F.add("USF-OBSERVABILITY-SELFTEST", path, f"expected {expected} was not raised")


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
