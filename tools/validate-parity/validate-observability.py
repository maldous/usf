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
    "USF-OBSERVABILITY-018": ("blocking", "USF-218 observability service operations disposition is missing or overclaimed"),
    "USF-OBSERVABILITY-019": ("blocking", "USF-222 observability operations execution proof is missing or incomplete"),
    "USF-OBSERVABILITY-020": ("blocking", "USF-222 observability operations execution proof overclaims readiness"),
    "USF-OBSERVABILITY-021": ("blocking", "USF-225 browser telemetry proof is missing or incomplete"),
    "USF-OBSERVABILITY-022": ("blocking", "USF-225 browser telemetry proof exceeds minimal UI harness scope"),
    "USF-OBSERVABILITY-023": ("blocking", "USF-225 browser telemetry SDK dependency or import boundary is unsafe"),
    "USF-OBSERVABILITY-024": ("blocking", "USF-225 enterprise evidence or source-use linkage is incomplete"),
    "USF-OBSERVABILITY-025": ("blocking", "USF-225 browser telemetry proof overclaims readiness or leaks raw values"),
    "USF-OBSERVABILITY-SELFTEST": ("blocking", "planted observability defect did not raise its expected rule"),
}

REQUIRED_NON_CLAIMS = {
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-product-readiness",
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
OPERATIONS_EXECUTION_PROOF = "packages/proof/src/observability-operations-execution-proof.ts"
BROWSER_TELEMETRY_PROOF = "packages/proof/src/browser-telemetry-faro-proof.ts"
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
SERVICE_OPERATIONS_DEPTH = "docs/architecture/observability-service-alerting-dashboard-incident-proof-depth.json"
OPERATIONS_EXECUTION_DEPTH = "docs/architecture/observability-alerting-dashboard-incident-execution-proof.json"
BROWSER_TELEMETRY_DEPTH = "docs/architecture/browser-telemetry-faro-foundation-proof.json"
BROWSER_TELEMETRY_NOTE = "docs/architecture/browser-telemetry-faro-foundation-proof.md"
SENTRY_BOUNDARY = "docs/architecture/sentry-service-semantic-proof-boundary.json"
SENTRY_ERROR_MATRIX = "docs/architecture/sentry-error-monitoring-disposition-matrix.json"
CLOSURE_MATRIX = "docs/architecture/compose-service-disposition-closure-matrix.json"
USF133_CLOSURE_GATE = "docs/architecture/usf-133-closure-tier-evidence-gate.json"
USF133_FINAL_RECONCILIATION = "docs/architecture/usf-133-final-blocker-and-matrix-reconciliation.json"
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
    OPERATIONS_EXECUTION_PROOF,
    BROWSER_TELEMETRY_PROOF,
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
    SERVICE_OPERATIONS_DEPTH,
    OPERATIONS_EXECUTION_DEPTH,
    BROWSER_TELEMETRY_DEPTH,
    BROWSER_TELEMETRY_NOTE,
    SENTRY_BOUNDARY,
    SENTRY_ERROR_MATRIX,
    CLOSURE_MATRIX,
    USF133_CLOSURE_GATE,
    USF133_FINAL_RECONCILIATION,
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

OBSERVABILITY_SERVICE_IDS = {
    "otel-collector",
    "prometheus",
    "grafana",
    "loki",
    "tempo",
    "alertmanager",
    "alloy",
    "sentry",
}

USF218_ENTERPRISE_ROW_IDS = {
    "soa-usf-218-observability-service-operations-depth",
    "evidence-usf-218-observability-service-operations-depth-disposition",
    "threat-usf-218-observability-service-operations-overclaim",
    "access-usf-218-observability-service-operator-boundary",
    "resilience-usf-218-observability-service-operations-boundary",
    "incident-usf-218-observability-alert-incident-boundary",
    "privacy-usf-218-observability-service-data-boundary",
}


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


def rows_by_id(rows, key="id"):
    if not isinstance(rows, list):
        return {}
    return {row.get(key): row for row in rows if isinstance(row, dict)}


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
    service_operations_depth = overrides.get(
        "service_operations_depth",
        parse_json_text(files.get(SERVICE_OPERATIONS_DEPTH, "")),
    )
    operations_execution_depth = overrides.get(
        "operations_execution_depth",
        parse_json_text(files.get(OPERATIONS_EXECUTION_DEPTH, "")),
    )
    browser_telemetry_depth = overrides.get(
        "browser_telemetry_depth",
        parse_json_text(files.get(BROWSER_TELEMETRY_DEPTH, "")),
    )
    sentry_boundary = overrides.get("sentry_boundary", parse_json_text(files.get(SENTRY_BOUNDARY, "")))
    sentry_error_matrix = overrides.get(
        "sentry_error_matrix",
        parse_json_text(files.get(SENTRY_ERROR_MATRIX, "")),
    )
    closure_matrix = overrides.get("closure_matrix", parse_json_text(files.get(CLOSURE_MATRIX, "")))
    closure_gate = overrides.get("closure_gate", parse_json_text(files.get(USF133_CLOSURE_GATE, "")))
    final_reconciliation = overrides.get(
        "final_reconciliation",
        parse_json_text(files.get(USF133_FINAL_RECONCILIATION, "")),
    )
    return {
        "files": files,
        "matrix": matrix,
        "openapi": openapi,
        "operations_signal": operations_signal,
        "enterprise_model": enterprise_model,
        "depth_matrix": depth_matrix,
        "service_operations_depth": service_operations_depth,
        "operations_execution_depth": operations_execution_depth,
        "browser_telemetry_depth": browser_telemetry_depth,
        "sentry_boundary": sentry_boundary,
        "sentry_error_matrix": sentry_error_matrix,
        "closure_matrix": closure_matrix,
        "closure_gate": closure_gate,
        "final_reconciliation": final_reconciliation,
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
    operations_execution_proof = files[OPERATIONS_EXECUTION_PROOF]
    browser_telemetry_proof = files[BROWSER_TELEMETRY_PROOF]
    proof_index = files[PROOF_INDEX]
    tests = files[TESTS]
    api_tests = files[API_TESTS]
    proof_tests = files[PROOF_TESTS]
    standard = files[STANDARD]
    source_use = files[SOURCE_USE]
    browser_telemetry_note = files[BROWSER_TELEMETRY_NOTE]
    bootstrap_source_use = files[BOOTSTRAP_SOURCE_USE]
    operations_signal = state.get("operations_signal")
    enterprise_model = state.get("enterprise_model")
    depth_matrix = state.get("depth_matrix")
    service_operations_depth = state.get("service_operations_depth")
    operations_execution_depth = state.get("operations_execution_depth")
    browser_telemetry_depth = state.get("browser_telemetry_depth")
    sentry_boundary = state.get("sentry_boundary")
    sentry_error_matrix = state.get("sentry_error_matrix")
    closure_matrix = state.get("closure_matrix")
    closure_gate = state.get("closure_gate")
    final_reconciliation = state.get("final_reconciliation")
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
        "fullProductReadinessClaim",
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

    if not isinstance(service_operations_depth, dict):
        F.add("USF-OBSERVABILITY-018", SERVICE_OPERATIONS_DEPTH, "USF-218 proof-depth artefact must exist and parse")
        service_operations_depth = {}
    expected_top = {
        "sourceIssue": "USF-218",
        "followUpIssue": "USF-222",
        "parentIssue": "USF-133",
        "localOperationsProofIssue": "USF-159",
        "sentrySdkProofIssue": "USF-205",
        "sentryDispositionIssue": "USF-170",
        "sentryBoundaryIssue": "USF-196",
        "status": "bounded-disposition-recorded-execution-proof-deferred",
    }
    for key, expected in expected_top.items():
        if service_operations_depth.get(key) != expected:
            F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.{key}", f"expected {expected!r}")
    required_issue_links = {
        "USF-218",
        "USF-222",
        "USF-159",
        "USF-170",
        "USF-196",
        "USF-205",
        "USF-184",
        "USF-192",
        "USF-193",
        "USF-133",
    }
    if required_issue_links - set(service_operations_depth.get("issueLinks", [])):
        F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.issueLinks", "USF-218 issue linkage is incomplete")
    claims = service_operations_depth.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.claims", "USF-218 claims must be an object")
        claims = {}
    for key in ("boundedDispositionRecorded", "localOperationsProofAccepted", "sentrySdkEnvelopeProofAccepted"):
        if claims.get(key) is not True:
            F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.claims.{key}", "accepted bounded evidence marker must be true")
    for false_claim in (
        "sdkEnvelopeEquivalentToServiceReadiness",
        "localObservabilityEquivalentToLiveBackendReadiness",
        "sentryServiceReadinessClaim",
        "liveMonitoringReadinessClaim",
        "alertingReadinessClaim",
        "dashboardReadinessClaim",
        "incidentWorkflowReadinessClaim",
        "retentionPurgeReadinessClaim",
        "sliSloOperationalReadinessClaim",
        "crossTenantAggregateAnalyticsReadinessClaim",
        "testReadinessClaim",
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "deploymentReadinessClaim",
        "liveProviderReadinessClaim",
        "socReadinessClaim",
        "iso27001CertificationClaim",
        "enterpriseProductionReadinessClaim",
        "fullDevReadinessClaim",
        "fullProductReadinessClaim",
        "usf133ClosureClaim",
    ):
        if claims.get(false_claim) is not False:
            F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.claims.{false_claim}", "readiness claim must remain false")
    if USF218_ENTERPRISE_ROW_IDS - set(service_operations_depth.get("enterpriseEvidenceRefs", [])):
        F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.enterpriseEvidenceRefs", "USF-218 enterprise evidence refs are incomplete")

    boundaries = service_operations_depth.get("boundaries", [])
    if not isinstance(boundaries, list):
        F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.boundaries", "boundaries must be a list")
        boundaries = []
    boundary_ids = {row.get("id") for row in boundaries if isinstance(row, dict)}
    for required in (
        "local-observability-operations-proof",
        "sentry-sdk-envelope-proof",
        "sentry-service-readiness",
        "alert-delivery-routing",
        "dashboard-runtime",
        "incident-workflow",
        "sli-slo-operation",
        "retention-purge-operation",
        "cross-tenant-aggregate-analytics",
        "live-provider-supplier",
    ):
        if required not in boundary_ids:
            F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}.boundaries", f"missing boundary {required}")
    for row in boundaries:
        if not isinstance(row, dict):
            continue
        status = row.get("status")
        if status == "deferred-with-owner":
            for field in (
                "owner",
                "riskOwner",
                "controlOwner",
                "riskTreatment",
                "followUpIssue",
                "reviewDate",
                "promotionImpact",
                "requiredEvidence",
                "nonClaimBoundary",
            ):
                if not row.get(field):
                    F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}#{row.get('id')}", f"deferred boundary missing {field}")
            if row.get("followUpIssue") != "USF-222":
                F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}#{row.get('id')}", "deferred execution proof must link USF-222")
        if status == "proven-local":
            for field in ("proofCommand", "validationCommand", "evidenceRefs", "nonEquivalenceBoundary", "nonClaimBoundary"):
                if not row.get(field):
                    F.add("USF-OBSERVABILITY-018", f"{SERVICE_OPERATIONS_DEPTH}#{row.get('id')}", f"proven boundary missing {field}")

    service_dispositions = service_operations_depth.get("serviceBindingDispositions", [])
    service_ids = {row.get("serviceId") for row in service_dispositions if isinstance(row, dict)}
    if service_ids != OBSERVABILITY_SERVICE_IDS:
        F.add(
            "USF-OBSERVABILITY-018",
            f"{SERVICE_OPERATIONS_DEPTH}.serviceBindingDispositions",
            f"missing={sorted(OBSERVABILITY_SERVICE_IDS - service_ids)} extra={sorted(service_ids - OBSERVABILITY_SERVICE_IDS)}",
        )
    for row in service_dispositions:
        if not isinstance(row, dict):
            continue
        if row.get("futureExecutionProofIssue") != "USF-222":
            F.add("USF-OBSERVABILITY-018", row.get("serviceId"), "service disposition must link USF-222 execution proof")
        if row.get("readinessClaimAllowed") is not False:
            F.add("USF-OBSERVABILITY-018", row.get("serviceId"), "service disposition must not allow readiness claims")
        if not row.get("nonEquivalenceBoundary"):
            F.add("USF-OBSERVABILITY-018", row.get("serviceId"), "service disposition needs a non-equivalence boundary")

    model_text = json.dumps(enterprise_model, sort_keys=True).lower() if isinstance(enterprise_model, dict) else ""
    for row_id in USF218_ENTERPRISE_ROW_IDS:
        if row_id.lower() not in model_text:
            F.add("USF-OBSERVABILITY-018", ENTERPRISE_MODEL, f"USF-218 enterprise evidence row missing {row_id}")
    for token in (
        "sourceissue=usf-218",
        "followupissue=usf-222",
        "observability-service-alerting-dashboard-incident-proof-depth",
        "sentryservicereadinessclaim=false",
        "live-provider-readiness",
    ):
        if token not in model_text:
            F.add("USF-OBSERVABILITY-018", ENTERPRISE_MODEL, f"USF-218 enterprise token missing {token}")

    if isinstance(sentry_boundary, dict):
        if sentry_boundary.get("followUpIssue") != "USF-218":
            F.add("USF-OBSERVABILITY-018", SENTRY_BOUNDARY, "Sentry boundary must hand off to USF-218")
        if (sentry_boundary.get("remainingProofBoundary") or {}).get("issue") != "USF-222":
            F.add("USF-OBSERVABILITY-018", SENTRY_BOUNDARY, "remaining Sentry execution proof must hand off to USF-222")
        if {"USF-218", "USF-222"} - set(sentry_boundary.get("issueLinks", [])):
            F.add("USF-OBSERVABILITY-018", SENTRY_BOUNDARY, "Sentry boundary must link USF-218 and USF-222")
    else:
        F.add("USF-OBSERVABILITY-018", SENTRY_BOUNDARY, "Sentry boundary must parse")
    if isinstance(sentry_error_matrix, dict):
        if sentry_error_matrix.get("remainingProofIssue") != "USF-218":
            F.add("USF-OBSERVABILITY-018", SENTRY_ERROR_MATRIX, "Sentry matrix remaining proof must be USF-218")
        if sentry_error_matrix.get("executionProofFollowUpIssue") != "USF-222":
            F.add("USF-OBSERVABILITY-018", SENTRY_ERROR_MATRIX, "Sentry matrix execution follow-up must be USF-222")
        disposition = sentry_error_matrix.get("sentryDisposition") or {}
        if disposition.get("remainingProofIssue") != "USF-218" or disposition.get("executionProofFollowUpIssue") != "USF-222":
            F.add("USF-OBSERVABILITY-018", SENTRY_ERROR_MATRIX, "Sentry disposition handoff must include USF-218 and USF-222")
    else:
        F.add("USF-OBSERVABILITY-018", SENTRY_ERROR_MATRIX, "Sentry error matrix must parse")

    if isinstance(closure_matrix, dict):
        closure_rows = {row.get("service_id"): row.get("closure_evidence", {}) for row in closure_matrix.get("rows", []) if isinstance(row, dict)}
        for service_id in OBSERVABILITY_SERVICE_IDS:
            evidence = closure_rows.get(service_id, {})
            if not evidence:
                F.add("USF-OBSERVABILITY-018", f"{CLOSURE_MATRIX}:{service_id}", "observability service row is missing")
                continue
            tracking = set(evidence.get("tracking_issues", []))
            if {"USF-218", "USF-222"} - tracking:
                F.add("USF-OBSERVABILITY-018", f"{CLOSURE_MATRIX}:{service_id}", "tracking issues must include USF-218 and USF-222")
            if USF218_ENTERPRISE_ROW_IDS - set(evidence.get("enterprise_evidence_refs", [])):
                F.add("USF-OBSERVABILITY-018", f"{CLOSURE_MATRIX}:{service_id}", "USF-218 enterprise refs are incomplete")
    else:
        F.add("USF-OBSERVABILITY-018", CLOSURE_MATRIX, "closure matrix must parse")

    if isinstance(closure_gate, dict):
        service_refs = rows_by_id(closure_gate.get("requiredServiceDispositionRefs"), "serviceId")
        exceptions = rows_by_id(closure_gate.get("enterpriseExceptionRegister"), "id")
        for service_id in OBSERVABILITY_SERVICE_IDS:
            ref = service_refs.get(service_id, {})
            if {"USF-218", "USF-222"} - set(ref.get("sourceIssueRefs", [])):
                F.add("USF-OBSERVABILITY-018", f"{USF133_CLOSURE_GATE}:serviceRef:{service_id}", "service ref must link USF-218 and USF-222")
        for service_id in ("alertmanager", "alloy", "sentry"):
            exception = exceptions.get(f"exception-service-{service_id}") or {}
            if exception.get("followUpIssue") != "USF-222":
                F.add("USF-OBSERVABILITY-018", f"{USF133_CLOSURE_GATE}:exception:{service_id}", "observability exception must defer execution proof to USF-222")
    else:
        F.add("USF-OBSERVABILITY-018", USF133_CLOSURE_GATE, "closure gate must parse")

    if isinstance(final_reconciliation, dict):
        blockers = set(final_reconciliation.get("currentOpenBlockerIssues", []))
        non_blocking = set(final_reconciliation.get("nonBlockingContextIssues", []))
        resolved = set(final_reconciliation.get("resolvedSourceIssuesUsedAsEvidence", []))
        if "USF-218" in blockers:
            F.add("USF-OBSERVABILITY-018", USF133_FINAL_RECONCILIATION, "USF-218 must not remain a current blocker after bounded disposition")
        if "USF-222" not in non_blocking:
            F.add("USF-OBSERVABILITY-018", USF133_FINAL_RECONCILIATION, "USF-222 must remain a non-blocking execution-proof follow-up")
        if "USF-218" not in resolved:
            F.add("USF-OBSERVABILITY-018", USF133_FINAL_RECONCILIATION, "USF-218 must be listed as resolved source evidence")
    else:
        F.add("USF-OBSERVABILITY-018", USF133_FINAL_RECONCILIATION, "final reconciliation must parse")

    usf218_sources = "\n".join(
        [
            json.dumps(service_operations_depth, sort_keys=True),
            json.dumps(sentry_boundary, sort_keys=True),
            json.dumps(sentry_error_matrix, sort_keys=True),
            json.dumps(final_reconciliation, sort_keys=True),
        ]
    ).lower()
    for phrase in (
        "sentry service readiness is proven",
        "alerting readiness is proven",
        "dashboard readiness is proven",
        "incident workflow readiness is proven",
        "usf-133 closure is proven",
        "production readiness is proven",
        "live provider readiness is proven",
    ):
        if phrase in usf218_sources:
            F.add("USF-OBSERVABILITY-018", "USF-218", f"readiness overclaim present: {phrase}")

    if not operations_execution_proof:
        F.add("USF-OBSERVABILITY-019", OPERATIONS_EXECUTION_PROOF, "USF-222 proof source is missing")
    for token in (
        'issueId: "USF-222"',
        'predecessorIssueId: "USF-218"',
        "runObservabilityOperationsExecutionProof",
        "alertRuleEvaluated: true",
        "alertRoutedToSyntheticReceiver: true",
        "dashboardRuntimeRendered: true",
        "incidentCorrectiveActionRecorded: true,\n      incidentResolved: true",
        "sliCalculated: true",
        "sloEvaluated: true",
        "retentionPurgeExecuted: true",
        "crossTenantAggregateChecked: true",
        "crossTenantAggregateTenantNamesSuppressed: true",
        "tenantIsolationChecked: true",
        "serviceReadinessDeferred: true",
        "sentryServiceReadinessDeferred: true",
        "liveProviderReadinessClaim: false",
        "alertingReadinessClaim: false",
        "dashboardReadinessClaim: false",
        "incidentResponseReadinessClaim: false",
        "usf133ClosureClaim: false",
    ):
        if token not in operations_execution_proof:
            F.add("USF-OBSERVABILITY-019", OPERATIONS_EXECUTION_PROOF, f"USF-222 proof marker missing {token}")
    for token in (
        "proof:observability:operations-execution",
        "observability-operations-execution-proof.ts",
    ):
        if token not in package:
            F.add("USF-OBSERVABILITY-019", PACKAGE, f"USF-222 package command missing {token}")
    if not re.search(r"(?m)^observability-operations-execution-proof:", makefile):
        F.add("USF-OBSERVABILITY-019", MAKEFILE, "USF-222 make target missing")
    if "runObservabilityOperationsExecutionProof" not in proof_index or "runObservabilityOperationsExecutionProof" not in proof_tests:
        F.add("USF-OBSERVABILITY-019", PROOF_TESTS, "USF-222 proof export or test missing")
    if "packages/proof/src/observability-operations-execution-proof.ts" not in source_use:
        F.add("USF-OBSERVABILITY-019", SOURCE_USE, "USF-222 source-use row missing")

    if not isinstance(operations_execution_depth, dict):
        F.add("USF-OBSERVABILITY-019", OPERATIONS_EXECUTION_DEPTH, "USF-222 execution artefact must exist and parse")
        operations_execution_depth = {}
    expected_usf222_top = {
        "sourceIssue": "USF-222",
        "predecessorIssue": "USF-218",
        "parentIssue": "USF-133",
        "status": "bounded-local-execution-proof-recorded-provider-readiness-deferred",
        "proofFile": OPERATIONS_EXECUTION_PROOF,
        "proofCommand": "corepack pnpm proof:observability:operations-execution",
        "providerMode": "hermetic-mock",
    }
    for key, expected in expected_usf222_top.items():
        if operations_execution_depth.get(key) != expected:
            F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.{key}", f"expected {expected!r}")
    required_usf222_issues = {"USF-222", "USF-218", "USF-159", "USF-205", "USF-184", "USF-192", "USF-193", "USF-133"}
    if required_usf222_issues - set(operations_execution_depth.get("issueLinks", [])):
        F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.issueLinks", "USF-222 issue linkage is incomplete")
    if set(operations_execution_depth.get("serviceCatalogueRows", [])) != {
        f"spec/instances/compose-service/service-catalogue.json#{service_id}"
        for service_id in OBSERVABILITY_SERVICE_IDS
    }:
        F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.serviceCatalogueRows", "USF-222 service catalogue linkage is incomplete")
    expected_usf222_evidence_refs = {
        "soa-usf-222-observability-operations-execution-proof",
        "evidence-usf-222-observability-operations-execution-proof",
        "threat-usf-222-observability-operations-overclaim",
        "access-usf-222-observability-operations-boundary",
        "resilience-usf-222-observability-operations-boundary",
        "incident-usf-222-observability-operations-boundary",
        "privacy-usf-222-observability-operations-boundary",
    }
    if expected_usf222_evidence_refs - set(operations_execution_depth.get("enterpriseEvidenceRefs", [])):
        F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.enterpriseEvidenceRefs", "USF-222 enterprise evidence refs are incomplete")
    execution_evidence = operations_execution_depth.get("executionEvidence", {})
    if not isinstance(execution_evidence, dict):
        F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.executionEvidence", "USF-222 execution evidence must be an object")
        execution_evidence = {}
    for key in (
        "alertRuleEvaluated",
        "alertRoutedToSyntheticReceiver",
        "alertRoutingAuditCaptured",
        "dashboardRuntimeRendered",
        "dashboardTenantBoundaryChecked",
        "incidentCreated",
        "incidentAcknowledged",
        "incidentCorrectiveActionRecorded",
        "incidentResolved",
        "sliCalculated",
        "sloEvaluated",
        "retentionPurgeExecuted",
        "retentionPurgeAuditCaptured",
        "crossTenantAggregateChecked",
        "crossTenantAggregateTenantNamesSuppressed",
        "tenantIsolationChecked",
        "auditEvidenceCaptured",
        "structuredLogEvidenceCaptured",
        "tracingEvidenceCaptured",
        "metricEvidenceCaptured",
        "redactionChecked",
        "syntheticDataChecked",
        "safeFailureChecked",
    ):
        if execution_evidence.get(key) is not True:
            F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.executionEvidence.{key}", "USF-222 execution marker must be true")
    usf222_claims = operations_execution_depth.get("claims", {})
    if not isinstance(usf222_claims, dict):
        F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.claims", "USF-222 claims must be an object")
        usf222_claims = {}
    for key in (
        "boundedLocalExecutionProofRecorded",
        "alertRoutingProofExecuted",
        "dashboardRuntimeModelExecuted",
        "incidentWorkflowProofExecuted",
        "sliSloOperationProofExecuted",
        "retentionPurgeProofExecuted",
        "crossTenantAggregateSafetyProofExecuted",
    ):
        if usf222_claims.get(key) is not True:
            F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.claims.{key}", "USF-222 proof marker must be true")
    for key in (
        "serviceReadinessClaim",
        "sentryServiceReadinessClaim",
        "liveMonitoringReadinessClaim",
        "alertingReadinessClaim",
        "dashboardReadinessClaim",
        "incidentResponseReadinessClaim",
        "testReadinessClaim",
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "deploymentReadinessClaim",
        "liveProviderReadinessClaim",
        "socReadinessClaim",
        "iso27001CertificationClaim",
        "enterpriseProductionReadinessClaim",
        "fullDevReadinessClaim",
        "fullProductReadinessClaim",
        "usf133ClosureClaim",
    ):
        if usf222_claims.get(key) is not False:
            F.add("USF-OBSERVABILITY-020", f"{OPERATIONS_EXECUTION_DEPTH}.claims.{key}", "USF-222 readiness claim must remain false")
    service_dispositions = rows_by_id(operations_execution_depth.get("serviceBindingDispositions"), "serviceId")
    if set(service_dispositions) != OBSERVABILITY_SERVICE_IDS:
        F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.serviceBindingDispositions", "USF-222 service dispositions are incomplete")
    for service_id, row in service_dispositions.items():
        if row.get("readinessClaimAllowed") is not False:
            F.add("USF-OBSERVABILITY-020", f"{OPERATIONS_EXECUTION_DEPTH}.{service_id}", "USF-222 service disposition must deny readiness claims")
        if not row.get("executionEvidence") or not row.get("nonEquivalenceBoundary"):
            F.add("USF-OBSERVABILITY-019", f"{OPERATIONS_EXECUTION_DEPTH}.{service_id}", "USF-222 service disposition needs evidence and non-equivalence boundary")
    if REQUIRED_NON_CLAIMS - set(operations_execution_depth.get("nonClaims", [])):
        F.add("USF-OBSERVABILITY-020", f"{OPERATIONS_EXECUTION_DEPTH}.nonClaims", "USF-222 non-claims are incomplete")
    usf222_sources = "\n".join(
        [
            operations_execution_proof,
            json.dumps(operations_execution_depth, sort_keys=True),
        ]
    ).lower()
    for phrase in (
        "sentry service readiness is proven",
        "alerting readiness is proven",
        "dashboard readiness is proven",
        "incident response readiness is proven",
        "usf-133 closure is proven",
        "production readiness is proven",
        "live provider readiness is proven",
    ):
        if phrase in usf222_sources:
            F.add("USF-OBSERVABILITY-020", "USF-222", f"readiness overclaim present: {phrase}")

    if not browser_telemetry_proof:
        F.add("USF-OBSERVABILITY-021", BROWSER_TELEMETRY_PROOF, "USF-225 browser telemetry proof source is missing")
    for token in (
        'issueId: "USF-225"',
        'parentIssueId: "USF-133"',
        'proof: "browser-telemetry-faro-foundation-proof"',
        'runtimeMode: "minimal-static-browser-proof"',
        'providerMode: "local-test"',
        '"@grafana/faro-web-sdk/dist/bundle/faro-web-sdk.iife.js"',
        'require("playwright-core")',
        "findChromiumExecutable",
        "syntheticBrowserErrorCaptured: true",
        "syntheticBrowserEventCaptured: true",
        "syntheticBrowserTraceCaptured: true,\n      syntheticBrowserSessionCaptured: true",
        "backendRootCauseCorrelationChecked: true",
        "structuredLogEvidenceCaptured: true",
        "traceEvidenceCaptured: true",
        "metricEvidenceCaptured: true",
        "auditEvidenceCaptured: true",
        "redactionChecked: true",
        "rawMarkerLeakCount: 0",
        "tenantBoundaryChecked: true",
        "actorBoundaryChecked: true",
        "tokenBoundaryChecked: true",
        "endpointBoundaryChecked: true",
        "stackBoundaryChecked: true",
        "providerPayloadBoundaryChecked: true",
        "uiReadinessClaim: false",
        "reactReadinessClaim: false",
        "browserE2EReadinessClaim: false",
        "faroProductionReadinessClaim: false",
        "liveMonitoringReadinessClaim: false",
        "testReadinessClaim: false",
        "stagingReadinessClaim: false",
        "productionReadinessClaim: false",
        "deploymentReadinessClaim: false",
        "liveProviderReadinessClaim: false",
        "socReadinessClaim: false",
        "iso27001CertificationClaim: false",
        "enterpriseProductionReadinessClaim: false",
        "fullDevReadinessClaim: false",
        "fullProductReadinessClaim: false",
        "usf133ClosureClaim: false",
    ):
        if token not in browser_telemetry_proof:
            F.add("USF-OBSERVABILITY-021", BROWSER_TELEMETRY_PROOF, f"USF-225 proof marker missing {token}")
    for token in (
        "proof:observability:browser-telemetry",
        "browser-telemetry-faro-proof.ts",
        '"@grafana/faro-web-sdk": "2.8.2"',
        '"playwright-core": "1.61.1"',
    ):
        if token not in package:
            F.add("USF-OBSERVABILITY-021", PACKAGE, f"USF-225 package command or dependency missing {token}")
    if not re.search(r"(?m)^observability-browser-telemetry-proof:", makefile):
        F.add("USF-OBSERVABILITY-021", MAKEFILE, "USF-225 make target missing")
    if "runBrowserTelemetryFaroProof" not in proof_index or "runBrowserTelemetryFaroProof" not in proof_tests:
        F.add("USF-OBSERVABILITY-021", PROOF_TESTS, "USF-225 proof export or test missing")
    for token in (
        "proves minimal Faro browser telemetry capture without UI readiness claims",
        'runtimeMode: "minimal-static-browser-proof"',
        "faroProductionReadinessClaim: false",
        "liveMonitoringReadinessClaim: false",
    ):
        if token not in proof_tests:
            F.add("USF-OBSERVABILITY-021", PROOF_TESTS, f"USF-225 proof test marker missing {token}")

    if not isinstance(browser_telemetry_depth, dict):
        F.add("USF-OBSERVABILITY-021", BROWSER_TELEMETRY_DEPTH, "USF-225 proof artefact must exist and parse")
        browser_telemetry_depth = {}
    expected_usf225_top = {
        "sourceIssue": "USF-225",
        "parentIssue": "USF-133",
        "status": "bounded-local-browser-telemetry-proof-recorded-ui-readiness-deferred",
        "proofFile": BROWSER_TELEMETRY_PROOF,
        "proofCommand": "corepack pnpm proof:observability:browser-telemetry",
        "runtimeMode": "minimal-static-browser-proof",
        "providerMode": "local-test",
    }
    for key, expected in expected_usf225_top.items():
        if browser_telemetry_depth.get(key) != expected:
            F.add("USF-OBSERVABILITY-021", f"{BROWSER_TELEMETRY_DEPTH}.{key}", f"expected {expected!r}")
    execution_evidence = browser_telemetry_depth.get("executionEvidence", {})
    if not isinstance(execution_evidence, dict):
        F.add("USF-OBSERVABILITY-021", f"{BROWSER_TELEMETRY_DEPTH}.executionEvidence", "USF-225 execution evidence must be an object")
        execution_evidence = {}
    for key in (
        "faroInitialized",
        "browserAutomationProofPassed",
        "syntheticBrowserErrorCaptured",
        "syntheticBrowserEventCaptured",
        "syntheticBrowserTraceCaptured",
        "syntheticBrowserSessionCaptured",
        "backendRootCauseCorrelationChecked",
        "structuredLogEvidenceCaptured",
        "traceEvidenceCaptured",
        "metricEvidenceCaptured",
        "auditEvidenceCaptured",
        "redactionChecked",
        "syntheticDataBoundaryChecked",
        "tenantBoundaryChecked",
        "actorBoundaryChecked",
        "tokenBoundaryChecked",
        "endpointBoundaryChecked",
        "stackBoundaryChecked",
        "providerPayloadBoundaryChecked",
    ):
        if execution_evidence.get(key) is not True:
            F.add("USF-OBSERVABILITY-021", f"{BROWSER_TELEMETRY_DEPTH}.executionEvidence.{key}", "USF-225 execution marker must be true")
    if execution_evidence.get("rawMarkerLeakCount") != 0:
        F.add("USF-OBSERVABILITY-025", f"{BROWSER_TELEMETRY_DEPTH}.executionEvidence.rawMarkerLeakCount", "raw marker leak count must be zero")

    minimal_scope = browser_telemetry_depth.get("minimalHarnessScope", {})
    if not isinstance(minimal_scope, dict):
        F.add("USF-OBSERVABILITY-022", f"{BROWSER_TELEMETRY_DEPTH}.minimalHarnessScope", "USF-225 minimal harness scope must be an object")
        minimal_scope = {}
    for key in (
        "productUiCreated",
        "reactApplicationCreated",
        "routeArchitectureCreated",
        "componentSystemCreated",
        "visualSnapshotCoverageCreated",
        "accessibilityJourneyCoverageCreated",
        "broadBrowserE2ECoverageCreated",
    ):
        if minimal_scope.get(key) is not False:
            F.add("USF-OBSERVABILITY-022", f"{BROWSER_TELEMETRY_DEPTH}.minimalHarnessScope.{key}", "USF-225 must not create UI product scope")
    if minimal_scope.get("uiSurfaceDisposition") != "proof-only-minimal-static-browser-surface":
        F.add("USF-OBSERVABILITY-022", f"{BROWSER_TELEMETRY_DEPTH}.minimalHarnessScope.uiSurfaceDisposition", "minimal proof-only UI disposition is required")
    for forbidden_path in ("apps/web", "apps/ui", "apps/browser", "packages/ui", "packages/web"):
        if os.path.exists(forbidden_path):
            F.add("USF-OBSERVABILITY-022", forbidden_path, "USF-225 must not add product UI/browser app paths")

    package_json = parse_json_text(package) or {}
    dependencies = package_json.get("dependencies", {}) if isinstance(package_json, dict) else {}
    dev_dependencies = package_json.get("devDependencies", {}) if isinstance(package_json, dict) else {}
    if dependencies.get("@grafana/faro-web-sdk") != "2.8.2":
        F.add("USF-OBSERVABILITY-023", PACKAGE, "Grafana Faro SDK must be exact-pinned at 2.8.2")
    if dev_dependencies.get("playwright-core") != "1.61.1":
        F.add("USF-OBSERVABILITY-023", PACKAGE, "Playwright Core must be exact-pinned at 1.61.1")
    for package_name, expected in (("@grafana/faro-web-sdk", "2.8.2"), ("playwright-core", "1.61.1")):
        if f"{package_name}@{expected}" not in read_text("pnpm-lock.yaml"):
            F.add("USF-OBSERVABILITY-023", "pnpm-lock.yaml", f"lockfile missing {package_name}@{expected}")
    sdk_import_allowed_paths = {
        BROWSER_TELEMETRY_PROOF,
        "apps/staging-proof-cockpit/src/machine-qa.mjs",
    }
    for root in ("apps", "capabilities", "adapters", "packages/core", "packages/ports"):
        if not os.path.isdir(root):
            continue
        for dirpath, _, filenames in os.walk(root):
            for filename in filenames:
                if not filename.endswith((".ts", ".tsx", ".js", ".mjs", ".cjs")):
                    continue
                path = os.path.join(dirpath, filename)
                if path in sdk_import_allowed_paths:
                    continue
                text = read_text(path)
                for sdk_name in ("@grafana/faro-web-sdk", "playwright-core"):
                    if sdk_name in text:
                        F.add("USF-OBSERVABILITY-023", path, f"USF-225 SDK import leaked outside proof boundary: {sdk_name}")

    expected_usf225_enterprise_refs = {
        "soa-usf-225-browser-telemetry-faro-proof",
        "evidence-usf-225-browser-telemetry-faro-proof",
        "evidence-proof-proof-observability-browser-telemetry",
        "threat-usf-225-browser-telemetry-overclaim",
        "sdk-usf-225-grafana-faro-web-sdk",
        "sdk-usf-225-playwright-core-browser-automation",
        "access-usf-225-browser-telemetry-boundary",
        "resilience-usf-225-browser-telemetry-proof-boundary",
        "incident-usf-225-browser-telemetry-root-cause-boundary",
        "privacy-usf-225-browser-telemetry-redaction-boundary",
    }
    if expected_usf225_enterprise_refs - set(browser_telemetry_depth.get("enterpriseEvidenceRefs", [])):
        F.add("USF-OBSERVABILITY-024", f"{BROWSER_TELEMETRY_DEPTH}.enterpriseEvidenceRefs", "USF-225 enterprise evidence refs are incomplete")
    if "packages/proof/src/browser-telemetry-faro-proof.ts" not in source_use:
        F.add("USF-OBSERVABILITY-024", SOURCE_USE, "USF-225 source-use row missing")
    model_text = json.dumps(enterprise_model, sort_keys=True).lower() if isinstance(enterprise_model, dict) else ""
    for row_id in expected_usf225_enterprise_refs:
        if row_id.lower() not in model_text:
            F.add("USF-OBSERVABILITY-024", ENTERPRISE_MODEL, f"USF-225 enterprise evidence row missing {row_id}")
    for token in (
        "sourceissue=usf-225",
        "effectivenessstate=proven-local",
        "browser-telemetry-faro-foundation-proof",
        "faro-production-readiness",
        "browser-e2e-readiness",
        "rawmarkerleakcount=0",
    ):
        if token not in model_text:
            F.add("USF-OBSERVABILITY-024", ENTERPRISE_MODEL, f"USF-225 enterprise token missing {token}")

    usf225_claims = browser_telemetry_depth.get("claims", {})
    if not isinstance(usf225_claims, dict):
        F.add("USF-OBSERVABILITY-025", f"{BROWSER_TELEMETRY_DEPTH}.claims", "USF-225 claims must be an object")
        usf225_claims = {}
    for key in (
        "boundedLocalBrowserTelemetryProofRecorded",
        "minimalStaticBrowserHarnessCreated",
        "faroBrowserSdkInitialized",
        "browserAutomationExecuted",
        "backendRootCauseCorrelationRecorded",
        "redactionProofRecorded",
    ):
        if usf225_claims.get(key) is not True:
            F.add("USF-OBSERVABILITY-021", f"{BROWSER_TELEMETRY_DEPTH}.claims.{key}", "USF-225 proof marker must be true")
    for key in (
        "uiReadinessClaim",
        "reactReadinessClaim",
        "browserE2EReadinessClaim",
        "faroProductionReadinessClaim",
        "liveMonitoringReadinessClaim",
        "testReadinessClaim",
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "deploymentReadinessClaim",
        "liveProviderReadinessClaim",
        "socReadinessClaim",
        "iso27001CertificationClaim",
        "enterpriseProductionReadinessClaim",
        "fullDevReadinessClaim",
        "fullProductReadinessClaim",
        "usf133ClosureClaim",
    ):
        if usf225_claims.get(key) is not False:
            F.add("USF-OBSERVABILITY-025", f"{BROWSER_TELEMETRY_DEPTH}.claims.{key}", "USF-225 readiness claim must remain false")
    if REQUIRED_NON_CLAIMS - set(browser_telemetry_depth.get("nonClaims", [])):
        F.add("USF-OBSERVABILITY-025", f"{BROWSER_TELEMETRY_DEPTH}.nonClaims", "USF-225 non-claims are incomplete")
    usf225_sources = "\n".join(
        [
            browser_telemetry_proof,
            browser_telemetry_note,
            json.dumps(browser_telemetry_depth, sort_keys=True),
        ]
    ).lower()
    for phrase in (
        "ui readiness is proven",
        "product ui readiness is proven",
        "browser e2e readiness is proven",
        "faro production readiness is proven",
        "live faro readiness is proven",
        "live monitoring readiness is proven",
        "usf-133 closure is proven",
        "production readiness is proven",
        "live provider readiness is proven",
        "full react parity is proven",
    ):
        if phrase in usf225_sources:
            F.add("USF-OBSERVABILITY-025", "USF-225", f"readiness overclaim present: {phrase}")


def apply_defect(state, defect):
    mutated = {
        "files": dict(state["files"]),
        "matrix": json.loads(json.dumps(state["matrix"])),
        "openapi": json.loads(json.dumps(state["openapi"])),
        "operations_signal": json.loads(json.dumps(state["operations_signal"])),
        "enterprise_model": json.loads(json.dumps(state["enterprise_model"])),
        "depth_matrix": json.loads(json.dumps(state["depth_matrix"])),
        "service_operations_depth": json.loads(json.dumps(state["service_operations_depth"])),
        "operations_execution_depth": json.loads(json.dumps(state["operations_execution_depth"])),
        "browser_telemetry_depth": json.loads(json.dumps(state["browser_telemetry_depth"])),
        "sentry_boundary": json.loads(json.dumps(state["sentry_boundary"])),
        "sentry_error_matrix": json.loads(json.dumps(state["sentry_error_matrix"])),
        "closure_matrix": json.loads(json.dumps(state["closure_matrix"])),
        "closure_gate": json.loads(json.dumps(state["closure_gate"])),
        "final_reconciliation": json.loads(json.dumps(state["final_reconciliation"])),
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
        elif target == "service_operations_depth":
            text = json.dumps(mutated["service_operations_depth"])
            if old not in text:
                raise AssertionError(f"old text not found in service operations depth for defect {defect.get('id')}")
            mutated["service_operations_depth"] = json.loads(text.replace(old, new, 1))
            mutated["files"][SERVICE_OPERATIONS_DEPTH] = json.dumps(mutated["service_operations_depth"])
        elif target == "operations_execution_depth":
            text = json.dumps(mutated["operations_execution_depth"])
            if old not in text:
                raise AssertionError(f"old text not found in operations execution depth for defect {defect.get('id')}")
            mutated["operations_execution_depth"] = json.loads(text.replace(old, new, 1))
            mutated["files"][OPERATIONS_EXECUTION_DEPTH] = json.dumps(mutated["operations_execution_depth"])
        elif target == "browser_telemetry_depth":
            text = json.dumps(mutated["browser_telemetry_depth"])
            if old not in text:
                raise AssertionError(f"old text not found in browser telemetry depth for defect {defect.get('id')}")
            mutated["browser_telemetry_depth"] = json.loads(text.replace(old, new, 1))
            mutated["files"][BROWSER_TELEMETRY_DEPTH] = json.dumps(mutated["browser_telemetry_depth"])
        elif target == "sentry_boundary":
            text = json.dumps(mutated["sentry_boundary"])
            if old not in text:
                raise AssertionError(f"old text not found in sentry boundary for defect {defect.get('id')}")
            mutated["sentry_boundary"] = json.loads(text.replace(old, new, 1))
            mutated["files"][SENTRY_BOUNDARY] = json.dumps(mutated["sentry_boundary"])
        elif target == "sentry_error_matrix":
            text = json.dumps(mutated["sentry_error_matrix"])
            if old not in text:
                raise AssertionError(f"old text not found in sentry error matrix for defect {defect.get('id')}")
            mutated["sentry_error_matrix"] = json.loads(text.replace(old, new, 1))
            mutated["files"][SENTRY_ERROR_MATRIX] = json.dumps(mutated["sentry_error_matrix"])
        elif target == "closure_matrix":
            text = json.dumps(mutated["closure_matrix"])
            if old not in text:
                raise AssertionError(f"old text not found in closure matrix for defect {defect.get('id')}")
            mutated["closure_matrix"] = json.loads(text.replace(old, new, 1))
            mutated["files"][CLOSURE_MATRIX] = json.dumps(mutated["closure_matrix"])
        elif target == "closure_gate":
            text = json.dumps(mutated["closure_gate"])
            if old not in text:
                raise AssertionError(f"old text not found in closure gate for defect {defect.get('id')}")
            mutated["closure_gate"] = json.loads(text.replace(old, new, 1))
            mutated["files"][USF133_CLOSURE_GATE] = json.dumps(mutated["closure_gate"])
        elif target == "final_reconciliation":
            text = json.dumps(mutated["final_reconciliation"])
            if old not in text:
                raise AssertionError(f"old text not found in final reconciliation for defect {defect.get('id')}")
            mutated["final_reconciliation"] = json.loads(text.replace(old, new, 1))
            mutated["files"][USF133_FINAL_RECONCILIATION] = json.dumps(mutated["final_reconciliation"])
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
    mutated["service_operations_depth"] = parse_json_text(mutated["files"].get(SERVICE_OPERATIONS_DEPTH, ""))
    mutated["operations_execution_depth"] = parse_json_text(mutated["files"].get(OPERATIONS_EXECUTION_DEPTH, ""))
    mutated["browser_telemetry_depth"] = parse_json_text(mutated["files"].get(BROWSER_TELEMETRY_DEPTH, ""))
    mutated["sentry_boundary"] = parse_json_text(mutated["files"].get(SENTRY_BOUNDARY, ""))
    mutated["sentry_error_matrix"] = parse_json_text(mutated["files"].get(SENTRY_ERROR_MATRIX, ""))
    mutated["closure_matrix"] = parse_json_text(mutated["files"].get(CLOSURE_MATRIX, ""))
    mutated["closure_gate"] = parse_json_text(mutated["files"].get(USF133_CLOSURE_GATE, ""))
    mutated["final_reconciliation"] = parse_json_text(mutated["files"].get(USF133_FINAL_RECONCILIATION, ""))
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
