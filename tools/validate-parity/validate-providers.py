#!/usr/bin/env python3
"""USF provider adapters/modes parity validator (USF-156).

Governance tooling only. It creates no runtime files, imports no React source, and
publishes no evidence. It fails closed on provider trust-boundary invariants:
provider registry, explicit category/mode/owner, SecretReference-only credential
posture, redacted status views, truthful health/readiness, capability-provider
import boundary, source-use honesty, and no live-provider or production overclaim.
"""
import argparse
import json
import os
import re
import sys

RULES = {
    "USF-PROVIDERS-001": ("blocking", "provider model or registry missing"),
    "USF-PROVIDERS-002": ("blocking", "provider standard or source-use matrix missing"),
    "USF-PROVIDERS-003": ("blocking", "provider registry lacks required category/mode/owner/status validation"),
    "USF-PROVIDERS-004": ("blocking", "provider secret-ref or status redaction posture missing"),
    "USF-PROVIDERS-005": ("blocking", "provider proof or command wiring missing"),
    "USF-PROVIDERS-006": ("blocking", "provider tests missing required behaviours"),
    "USF-PROVIDERS-007": ("blocking", "provider API/OpenAPI status surface missing or unsafe"),
    "USF-PROVIDERS-008": ("blocking", "capability/provider import boundary violated"),
    "USF-PROVIDERS-009": ("blocking", "provider parity matrix rows lack authorisation/backing"),
    "USF-PROVIDERS-010": ("blocking", "provider live/production/supplier/certification overclaim"),
    "USF-PROVIDERS-011": ("blocking", "USF-157 provider risk/resilience matrix missing or incomplete"),
    "USF-PROVIDERS-012": ("blocking", "USF-157 deferred provider risk/resilience control lacks reclassification metadata"),
    "USF-PROVIDERS-013": ("blocking", "USF-157 composed-provider proof scope reconciliation is incomplete"),
    "USF-PROVIDERS-014": ("blocking", "USF-157 proof, parity, or enterprise evidence linkage is missing"),
    "USF-PROVIDERS-015": ("blocking", "USF-157 provider risk/resilience overclaim"),
    "USF-PROVIDERS-SELFTEST": ("blocking", "planted provider defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
PORTS = "packages/ports/src/index.ts"
CONFIG_INDEX = "capabilities/config/src/index.ts"
CONFIG_REGISTRY = "capabilities/config/src/registry.ts"
AUTHZ_POLICY = "capabilities/tenant/src/authorization-policy.ts"
SERVER = "apps/api/src/server.ts"
RUNTIME = "apps/api/src/runtime.ts"
CONTRACTS = "packages/contracts/src/index.ts"
API_SURFACE = "packages/contracts/src/api-surface.ts"
OPENAPI_BUILDER = "packages/openapi/src/index.ts"
OPENAPI_JSON = "packages/openapi/openapi.json"
PROOF = "packages/proof/src/provider-adapters-proof.ts"
PROOF_INDEX = "packages/proof/src/index.ts"
TESTS = "tests/capabilities/provider-adapters.test.ts"
API_TESTS = "tests/apps/api-contracts.test.ts"
PROOF_TESTS = "tests/packages/proof.test.ts"
STANDARD = "docs/architecture/provider-adapters-and-modes-standard.md"
SOURCE_USE = "docs/architecture/parity-provider-adapters-source-use-disposition-matrix.md"
PROVIDER_RISK_MATRIX = "docs/architecture/provider-risk-resilience-depth-matrix.json"
BOOTSTRAP_SOURCE_USE = "docs/architecture/bootstrap-source-use-disposition-matrix.md"
MATRIX = "docs/architecture/react-parity-scope-classification-matrix.json"
FUNCTIONALITY_MATRIX = "docs/architecture/complete-react-to-usf-functionality-parity-matrix.json"
ENTERPRISE_MODEL = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
PACKAGE = "package.json"
MAKEFILE = "Makefile"
SELFTEST_DIR = "tools/validate-parity/provider-planted-defects"

SOURCE_FILES = (
    CORE,
    PORTS,
    CONFIG_INDEX,
    CONFIG_REGISTRY,
    AUTHZ_POLICY,
    SERVER,
    RUNTIME,
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
    PROVIDER_RISK_MATRIX,
    BOOTSTRAP_SOURCE_USE,
    PACKAGE,
    MAKEFILE,
)

REQUIRED_CATEGORIES = {
    "database",
    "cache",
    "object-storage",
    "file-scan",
    "identity",
    "config",
    "secrets",
    "audit-ledger",
    "event-bus",
    "workflow-engine",
    "operational-job-engine",
    "notification-delivery",
    "api-gateway",
    "observability",
    "search-index",
    "full-text-search",
    "autocomplete",
    "vector-search",
}

REQUIRED_MODES = {
    "in-memory",
    "local-test",
    "mock",
    "composed-test",
    "live-external-deferred",
    "live-external-authorised",
    "disabled",
    "unavailable",
}

REQUIRED_USF157_BINDINGS = {
    "runtime-database-provider-binding",
    "mailpit-notification-provider",
    "nats-event-bus-provider",
    "minio-object-storage-provider",
    "keycloak-identity-provider",
    "openbao-secret-provider",
    "temporal-workflow-provider",
    "usf-189-clickhouse-analytics-provider",
    "usf-189-redis-cache-provider",
    "usf-189-meilisearch-search-provider",
    "usf-189-clamav-scanner-provider",
    "usf-189-localstack-cloud-mock-provider",
    "usf-209-wiremock-http-mock-provider",
    "usf-189-webhook-sink-capture-provider",
    "usf-189-pgbackrest-backup-provider",
    "usf-189-windmill-automation-provider",
}

REQUIRED_USF157_CONTROLS = {
    "composed-provider-proof-scope-reconciliation",
    "live-external-authorised-provider-authority",
    "supplier-subprocessor-workflow",
    "live-egress-allowlist",
    "tls-certificate-validation",
    "circuit-breaker-timeout-fallback-bulkhead-runtime",
    "provider-drift-detection",
    "provider-incident-hooks",
    "failover-disaster-recovery-proof",
    "cache-search-gateway-observability-provider-depth",
    "composed-provider-readiness-aggregation",
}

USF157_DEFERRED_CONTROLS = {
    "live-external-authorised-provider-authority",
    "supplier-subprocessor-workflow",
    "live-egress-allowlist",
    "tls-certificate-validation",
    "provider-drift-detection",
    "provider-incident-hooks",
    "failover-disaster-recovery-proof",
}

USF157_REQUIRED_ENTERPRISE_REFS = {
    "usf-157-soa-provider-risk-resilience-depth",
    "usf-157-evidence-provider-risk-resilience-depth-matrix",
    "usf-157-threat-provider-risk-resilience-overclaim",
    "usf-157-access-provider-risk-resilience",
    "usf-157-resilience-provider-risk-resilience-depth",
    "usf-157-incident-vulnerability-provider-risk-resilience",
    "usf-157-privacy-provider-risk-resilience",
}

USF157_REQUIRED_NON_CLAIMS = {
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-react-parity-readiness",
    "usf-133-closure",
}

USF157_FORBIDDEN_ALLOWED_CLAIMS = {
    "provider-readiness",
    "live-provider-readiness",
    "supplier-approval",
    "subprocessor-approval",
    "failover-readiness",
    "disaster-recovery-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-dev-readiness",
    "full-react-parity",
    "usf-133-closure",
}

FORBIDDEN_IMPORT = re.compile(
    r"from\s+[\"'](?:pg|postgres|redis|ioredis|@sentry/node|@aws-sdk(?:/[^\"']+)?|aws-sdk|minio|wiremock-captain|nodemailer|twilio|@sendgrid|sendgrid|stripe|@temporalio|nats|keycloak-js)[\"']"
)


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


def json_from_text(text):
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
    functionality_matrix = overrides.get("functionality_matrix", read_json(FUNCTIONALITY_MATRIX))
    enterprise_model = overrides.get("enterprise_model", read_json(ENTERPRISE_MODEL))
    return {
        "files": files,
        "matrix": matrix,
        "openapi": openapi,
        "functionality_matrix": functionality_matrix,
        "enterprise_model": enterprise_model,
    }


def provider_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    rows = []
    for row in matrix.get("domains", []):
        if not isinstance(row, dict):
            continue
        rid = str(row.get("react_item_id", ""))
        summary = str(row.get("behaviour_summary", "")).lower()
        if rid.startswith("provider") or "provider" in summary:
            rows.append(row)
    return rows


def ts_string_literals(name, source):
    match = re.search(rf"{name}\s*=\s*Object\.freeze\(\[(.*?)\]\s+as const\);", source, re.DOTALL)
    if not match:
        return set()
    return set(re.findall(r'"([^"]+)"', match.group(1)))


def files_under(path):
    out = []
    if not os.path.exists(path):
        return out
    for root, _, files in os.walk(path):
        for name in files:
            if name.endswith(".ts"):
                out.append(os.path.join(root, name))
    return out


def rows_by_id(rows):
    if not isinstance(rows, list):
        return {}
    return {row.get("id"): row for row in rows if isinstance(row, dict) and isinstance(row.get("id"), str)}


def check_usf157_provider_risk_resilience(F, files, matrix, functionality_matrix, enterprise_model):
    text = files.get(PROVIDER_RISK_MATRIX, "")
    provider_risk = json_from_text(text)
    if not isinstance(provider_risk, dict):
        F.add("USF-PROVIDERS-011", PROVIDER_RISK_MATRIX, "USF-157 provider risk/resilience matrix is missing or invalid JSON")
        return

    expected_top = {
        "sourceIssue": "USF-157",
        "parentIssue": "USF-133",
        "dashboardIssue": "USF-184",
        "coordinatorIssue": "USF-192",
        "providerStandard": STANDARD,
        "providerSourceUseMatrix": SOURCE_USE,
        "runtimeProofManifest": "spec/instances/runtime-proof/runtime-application-compose-parity.json",
        "enterpriseEvidenceModel": ENTERPRISE_MODEL,
        "proofCommand": "corepack pnpm proof:providers",
        "validationCommand": "python3 tools/validate-parity/validate-providers.py all --json",
    }
    for field, expected in expected_top.items():
        if provider_risk.get(field) != expected:
            F.add("USF-PROVIDERS-011", f"{PROVIDER_RISK_MATRIX}.{field}", f"expected {expected!r}")
    if provider_risk.get("status") != "source-issue-bounded-proof-and-reclassification-gate":
        F.add("USF-PROVIDERS-011", f"{PROVIDER_RISK_MATRIX}.status", "USF-157 matrix has unexpected status")

    issue_links = set(provider_risk.get("issueLinks", []))
    for issue in {"USF-157", "USF-156", "USF-189", "USF-191", "USF-193", "USF-184", "USF-192", "USF-133"}:
        if issue not in issue_links:
            F.add("USF-PROVIDERS-011", f"{PROVIDER_RISK_MATRIX}.issueLinks", f"missing issue link {issue}")

    boundary = provider_risk.get("decisionBoundary", {})
    if not isinstance(boundary, dict):
        F.add("USF-PROVIDERS-011", f"{PROVIDER_RISK_MATRIX}.decisionBoundary", "decision boundary missing")
    else:
        if boundary.get("selectedApproach") != "bounded-local-proof-plus-explicit-reclassification":
            F.add("USF-PROVIDERS-011", "decisionBoundary.selectedApproach", "USF-157 selected approach is not explicit")
        for flag in ("decisionAcceptedDoesNotMeanWorkComplete",):
            if boundary.get(flag) is not True:
                F.add("USF-PROVIDERS-011", f"decisionBoundary.{flag}", "status-integrity flag must be true")
        for flag in ("sourceIssueDoneByImplication", "usf133ClosureClaimed"):
            if boundary.get(flag) is not False:
                F.add("USF-PROVIDERS-015", f"decisionBoundary.{flag}", "USF-157 must not imply Done or USF-133 closure")

    proof_scope = provider_risk.get("currentComposedProviderProofScope", [])
    if not isinstance(proof_scope, list):
        F.add("USF-PROVIDERS-013", f"{PROVIDER_RISK_MATRIX}.currentComposedProviderProofScope", "proof scope must be a list")
        proof_scope = []
    bindings = rows_by_id([{**row, "id": row.get("bindingId")} for row in proof_scope if isinstance(row, dict)])
    missing_bindings = REQUIRED_USF157_BINDINGS - set(bindings)
    if missing_bindings:
        F.add("USF-PROVIDERS-013", f"{PROVIDER_RISK_MATRIX}.currentComposedProviderProofScope", f"missing bindings: {sorted(missing_bindings)}")
    for binding_id, row in bindings.items():
        if row.get("evidenceStatus") not in {"proven-local", "profile-gated-proven-local"}:
            F.add("USF-PROVIDERS-013", binding_id, "binding evidence status must be bounded local proof")
        if not row.get("providerRegistryIds") or not row.get("serviceCatalogueServiceIds") or not row.get("proofCommand"):
            F.add("USF-PROVIDERS-013", binding_id, "binding lacks registry/service/proof linkage")

    controls = rows_by_id(
        [{**row, "id": row.get("controlId")} for row in provider_risk.get("riskResilienceControls", []) if isinstance(row, dict)]
    )
    missing_controls = REQUIRED_USF157_CONTROLS - set(controls)
    if missing_controls:
        F.add("USF-PROVIDERS-011", f"{PROVIDER_RISK_MATRIX}.riskResilienceControls", f"missing controls: {sorted(missing_controls)}")
    for control_id, row in controls.items():
        for field in (
            "owner",
            "riskOwner",
            "controlOwner",
            "riskTreatment",
            "reviewDate",
            "followUpIssue",
            "evidenceSource",
            "validationCommand",
            "reclassificationBoundary",
        ):
            if not row.get(field):
                F.add("USF-PROVIDERS-012", control_id, f"control lacks {field}")
        if not row.get("promotionImpact"):
            F.add("USF-PROVIDERS-012", control_id, "control lacks promotion impact")
        if row.get("readinessClaimAllowed") is not False:
            F.add("USF-PROVIDERS-015", control_id, "control allows readiness claim")
    for control_id in USF157_DEFERRED_CONTROLS:
        row = controls.get(control_id)
        if not row:
            continue
        if row.get("effectivenessState") != "deferred-with-owner" or row.get("implementationStatus") != "explicitly-reclassified":
            F.add("USF-PROVIDERS-012", control_id, "deferred control must be explicitly reclassified with owner")

    synthetic = provider_risk.get("syntheticRiskResilienceProof", {})
    if not isinstance(synthetic, dict):
        F.add("USF-PROVIDERS-014", "syntheticRiskResilienceProof", "synthetic proof markers are missing")
    else:
        expected_true = {
            "liveAuthorityUnauthorisedFailsClosed",
            "boundedRetryTimeoutFallbackEvidenceRecorded",
            "sdkBoundaryEvidenceRecorded",
            "redactionBoundaryRecorded",
            "tenantBoundaryRecorded",
            "secretBoundaryRecorded",
            "auditEvidenceBoundaryRecorded",
            "cleanupTeardownBoundaryRecorded",
        }
        for field in expected_true:
            if synthetic.get(field) is not True:
                F.add("USF-PROVIDERS-014", f"syntheticRiskResilienceProof.{field}", "expected true")
        expected_false = {
            "supplierApprovalClaimAllowed",
            "liveEgressAllowedByCurrentProof",
            "tlsCertificateLiveValidationClaim",
            "providerDriftRuntimeDetectionClaim",
            "incidentHookOperatingEvidenceClaim",
            "failoverReadinessClaim",
            "disasterRecoveryReadinessClaim",
        }
        for field in expected_false:
            if synthetic.get(field) is not False:
                F.add("USF-PROVIDERS-015", f"syntheticRiskResilienceProof.{field}", "expected false")
        if synthetic.get("composedReadinessAggregationClaim") != "bounded-evidence-index-only":
            F.add("USF-PROVIDERS-015", "syntheticRiskResilienceProof.composedReadinessAggregationClaim", "readiness aggregation overclaims")

    allowed = set(provider_risk.get("readinessClaimsAllowed", []))
    prohibited = set(provider_risk.get("readinessClaimsProhibited", []))
    nonclaims = set(provider_risk.get("nonClaims", []))
    if allowed & USF157_FORBIDDEN_ALLOWED_CLAIMS:
        F.add("USF-PROVIDERS-015", "readinessClaimsAllowed", "USF-157 allows prohibited provider readiness claims")
    missing_prohibited = USF157_FORBIDDEN_ALLOWED_CLAIMS - prohibited
    if missing_prohibited:
        F.add("USF-PROVIDERS-015", "readinessClaimsProhibited", f"missing prohibited claims: {sorted(missing_prohibited)}")
    missing_nonclaims = USF157_REQUIRED_NON_CLAIMS - nonclaims
    if missing_nonclaims:
        F.add("USF-PROVIDERS-015", "nonClaims", f"missing non-claims: {sorted(missing_nonclaims)}")
    status_integrity = provider_risk.get("statusIntegrity", {})
    if not isinstance(status_integrity, dict):
        F.add("USF-PROVIDERS-015", "statusIntegrity", "status-integrity block missing")
    else:
        if status_integrity.get("usf133ClosureClaimed") is not False:
            F.add("USF-PROVIDERS-015", "statusIntegrity.usf133ClosureClaimed", "USF-133 closure is implied")
        if status_integrity.get("usf39Touched") is not False:
            F.add("USF-PROVIDERS-015", "statusIntegrity.usf39Touched", "USF-39 touch is implied")

    refs = set(provider_risk.get("enterpriseEvidenceRefs", []))
    missing_refs = USF157_REQUIRED_ENTERPRISE_REFS - refs
    if missing_refs:
        F.add("USF-PROVIDERS-014", "enterpriseEvidenceRefs", f"missing enterprise refs: {sorted(missing_refs)}")
    model_text = json.dumps(enterprise_model or {}, sort_keys=True)
    for ref in USF157_REQUIRED_ENTERPRISE_REFS:
        if ref not in model_text:
            F.add("USF-PROVIDERS-014", ENTERPRISE_MODEL, f"enterprise model missing {ref}")
    if "provider risk/resilience aggregate" not in files.get(SOURCE_USE, "").lower():
        F.add("USF-PROVIDERS-014", SOURCE_USE, "source-use matrix lacks USF-157 aggregate row")
    if "USF-157 provider risk/resilience aggregate" not in files.get(STANDARD, ""):
        F.add("USF-PROVIDERS-014", STANDARD, "provider standard lacks USF-157 aggregate linkage")

    provider_rows_in_matrix = provider_rows(matrix)
    provider_main = [row for row in provider_rows_in_matrix if row.get("react_item_id") == "provider-adapters-modes"]
    if provider_main and "provider-risk-resilience-depth-matrix.json" not in json.dumps(provider_main[0]):
        F.add("USF-PROVIDERS-014", MATRIX, "provider main row lacks USF-157 aggregate matrix evidence")
    if isinstance(functionality_matrix, dict):
        provider_capability = [
            row for row in functionality_matrix.get("capabilities", []) if row.get("capability_id") == "providers"
        ]
        if not provider_capability or "provider-risk-resilience-depth-matrix.json" not in json.dumps(provider_capability[0]):
            F.add("USF-PROVIDERS-014", FUNCTIONALITY_MATRIX, "functionality provider row lacks USF-157 aggregate matrix evidence")


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files[CORE]
    ports = files[PORTS]
    config = files[CONFIG_REGISTRY]
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
    package = files[PACKAGE]
    makefile = files[MAKEFILE]
    matrix = state["matrix"]
    openapi = state["openapi"]
    functionality_matrix = state.get("functionality_matrix")
    enterprise_model = state.get("enterprise_model")

    if not all(token in core for token in ["PROVIDER_CATEGORIES", "PROVIDER_MODES", "ProviderRegistryEntry"]):
        F.add("USF-PROVIDERS-001", CORE, "provider registry/model missing")
    if "export const PROVIDER_REGISTRY: readonly ProviderRegistryEntry[]" not in core:
        F.add("USF-PROVIDERS-001", CORE, "provider registry declaration missing")
    if not all(token in core for token in ["validateProviderRegistry", "toSafeProviderStatus", "providerStatusViews", "assertProviderUsable"]):
        F.add("USF-PROVIDERS-001", CORE, "provider validation/status/use functions missing")

    categories = ts_string_literals("PROVIDER_CATEGORIES", core)
    modes = ts_string_literals("PROVIDER_MODES", core)
    if not REQUIRED_CATEGORIES.issubset(categories):
        F.add("USF-PROVIDERS-003", CORE, "provider categories incomplete")
    if not REQUIRED_MODES.issubset(modes):
        F.add("USF-PROVIDERS-003", CORE, "provider modes incomplete")
    for token in ["providerCategory", "providerMode", "owningCapability", "dataClassification", "environmentScope", "healthStatus", "readinessStatus", "lifecycleState"]:
        if token not in core:
            F.add("USF-PROVIDERS-003", CORE, f"registry field missing: {token}")
    if "live-provider-authority-missing" not in core or "deferred-provider-live-claim" not in core:
        F.add("USF-PROVIDERS-003", CORE, "live/deferred mode validation missing")

    if "SecretReference" not in core or "function secretReferenceOk" not in core or "secret-reference-present" not in core:
        F.add("USF-PROVIDERS-004", CORE, "SecretReference/redaction posture missing")
    if "endpointPosture" not in core or "reference-redacted" not in core or "ProviderStatus" not in contracts:
        F.add("USF-PROVIDERS-004", CORE, "safe status redaction view missing")
    if re.search(r"makeProvider\(\{[^}]*providerMode:\s*\"live-external-authorised\"", core, re.DOTALL):
        F.add("USF-PROVIDERS-010", CORE, "registry includes live-external-authorised provider")
    if re.search(r"liveReadinessClaim:[^\n]*true|productionReadinessClaim:[^\n]*true", core):
        F.add("USF-PROVIDERS-010", CORE, "core provider registry contains readiness overclaim")

    if not os.path.exists(STANDARD) or "providers are controlled trust boundaries" not in standard.lower():
        F.add("USF-PROVIDERS-002", STANDARD, "provider standard missing trust-boundary language")
    for token in ["Data Residency And Egress", "Secrets And Credentials", "Health Versus Readiness", "Capability Boundary", "Deferred Depth"]:
        if token not in standard:
            F.add("USF-PROVIDERS-002", STANDARD, f"provider standard section missing: {token}")
    if not os.path.exists(SOURCE_USE) or "provider registry" not in source_use or "React UI/Playwright provider behaviours" not in source_use:
        F.add("USF-PROVIDERS-002", SOURCE_USE, "provider source-use matrix missing required rows")
    if "Parity Provider Adapters/Modes Additions" not in bootstrap_source_use:
        F.add("USF-PROVIDERS-002", BOOTSTRAP_SOURCE_USE, "global source-use matrix missing provider additions")

    if "proof:providers" not in package or "validate-providers.py all --json" not in package:
        F.add("USF-PROVIDERS-005", PACKAGE, "provider proof/parity script wiring missing")
    if not re.search(r"(?m)^providers-proof:", makefile):
        F.add("USF-PROVIDERS-005", MAKEFILE, "make providers-proof missing")
    if "runProviderAdaptersProof" not in proof or "liveExternalProviderReadinessClaim: false" not in proof:
        F.add("USF-PROVIDERS-005", PROOF, "provider proof missing or overclaim flags absent")
    if "runProviderAdaptersProof" not in proof_index or "runProviderAdaptersProof" not in proof_tests:
        F.add("USF-PROVIDERS-005", PROOF_TESTS, "provider proof export/test missing")

    for token in [
        "unknown modes",
        "SecretReference",
        "redacts provider status",
        "health from readiness",
        "unavailable",
        "provider audit evidence value-free",
    ]:
        if token not in tests:
            F.add("USF-PROVIDERS-006", TESTS, f"provider test missing: {token}")
    if "guards and redacts provider status surfaces" not in api_tests:
        F.add("USF-PROVIDERS-006", API_TESTS, "provider API redaction/guard test missing")

    if "/v1/providers" not in server or '"provider.list",' not in server or '"provider.read",' not in server:
        F.add("USF-PROVIDERS-007", SERVER, "provider status API routes missing")
    if "providerStatusViews" not in server or "toSafeProviderStatus" not in server:
        F.add("USF-PROVIDERS-007", SERVER, "provider route does not use safe status view")
    if "provider.readiness.checked" not in server or "provider.health.checked" not in server:
        F.add("USF-PROVIDERS-007", SERVER, "provider status routes do not audit health/readiness checks")
    if "ProviderRegistryStatusViewSchema" not in contracts or "ProvidersListResponseSchema" not in contracts:
        F.add("USF-PROVIDERS-007", CONTRACTS, "provider schemas missing")
    if "providers.list" not in api_surface or "operator-only" not in api_surface:
        F.add("USF-PROVIDERS-007", API_SURFACE, "provider route metadata missing")
    if "ProvidersListResponse" not in openapi_builder:
        F.add("USF-PROVIDERS-007", OPENAPI_BUILDER, "OpenAPI builder missing provider schemas")
    if not isinstance(openapi, dict) or "/v1/providers" not in (openapi.get("paths") or {}):
        F.add("USF-PROVIDERS-007", OPENAPI_JSON, "committed OpenAPI missing provider routes")
    for needle in ["secret://", "endpoint://", "live provider url", "production ready"]:
        if needle.lower() in openapi_text.lower():
            F.add("USF-PROVIDERS-007", OPENAPI_JSON, f"OpenAPI contains unsafe provider content: {needle}")

    scanned = [CORE, PORTS, SERVER] + files_under("capabilities")
    for path in scanned:
        text = files.get(path, read_text(path))
        if FORBIDDEN_IMPORT.search(text):
            F.add("USF-PROVIDERS-008", path, "unauthorised provider SDK import outside adapter package")
    if "provider.config.read" not in authz or "provider.list" not in authz or "provider.read" not in authz:
        F.add("USF-PROVIDERS-008", AUTHZ_POLICY, "provider PDP actions missing")
    if "composed-test" not in config or "live-external-authorised" not in config:
        F.add("USF-PROVIDERS-008", CONFIG_REGISTRY, "provider mode config enum not aligned")

    rows = provider_rows(matrix)
    if len(rows) < 5:
        F.add("USF-PROVIDERS-009", MATRIX, "provider parity matrix rows incomplete")
    provider_main = [row for row in rows if row.get("react_item_id") == "provider-adapters-modes"]
    if not provider_main or provider_main[0].get("domain_authorised") is not True:
        F.add("USF-PROVIDERS-009", MATRIX, "provider main row not domain-authorised")
    if not any(row.get("blocker") == "USF-157" for row in rows):
        F.add("USF-PROVIDERS-009", MATRIX, "deferred provider depth lacks USF-157 blocker")
    if not any(row.get("react_item_id") == "provider.deferred-live-risk-resilience-depth" for row in rows):
        F.add("USF-PROVIDERS-009", MATRIX, "deferred provider depth row missing")

    overclaim_sources = "\n".join([standard, source_use, openapi_text])
    for phrase in ["production-ready", "live provider readiness is proven", "supplier approval granted", "iso certified", "soc certified"]:
        if phrase in overclaim_sources.lower():
            F.add("USF-PROVIDERS-010", "provider-overclaim", f"provider overclaim phrase present: {phrase}")

    check_usf157_provider_risk_resilience(F, files, matrix, functionality_matrix, enterprise_model)


def apply_defect(state, defect):
    mutated = {
        "files": dict(state["files"]),
        "matrix": json.loads(json.dumps(state["matrix"])),
        "openapi": json.loads(json.dumps(state["openapi"])),
        "functionality_matrix": json.loads(json.dumps(state.get("functionality_matrix"))),
        "enterprise_model": json.loads(json.dumps(state.get("enterprise_model"))),
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
        elif target == "functionality_matrix":
            text = json.dumps(mutated["functionality_matrix"])
            if old not in text:
                raise AssertionError(f"old text not found in functionality_matrix for defect {defect.get('id')}")
            mutated["functionality_matrix"] = json.loads(text.replace(old, new, 1))
        elif target == "enterprise_model":
            text = json.dumps(mutated["enterprise_model"])
            if old not in text:
                raise AssertionError(f"old text not found in enterprise_model for defect {defect.get('id')}")
            mutated["enterprise_model"] = json.loads(text.replace(old, new, 1))
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
        F.add("USF-PROVIDERS-SELFTEST", SELFTEST_DIR, "provider planted-defects directory missing")
        return
    base = build_state()
    files = sorted(name for name in os.listdir(SELFTEST_DIR) if name.endswith(".json"))
    if len(files) < 5:
        F.add("USF-PROVIDERS-SELFTEST", SELFTEST_DIR, "not enough provider planted defects")
        return
    for name in files:
        path = os.path.join(SELFTEST_DIR, name)
        defect = read_json(path)
        if not isinstance(defect, dict):
            F.add("USF-PROVIDERS-SELFTEST", path, "planted defect is not valid JSON")
            continue
        expected = defect.get("expectedRuleId")
        child = Findings()
        try:
            run_checks(child, apply_defect(base, defect))
        except Exception as exc:  # noqa: BLE001
            child.add("USF-PROVIDERS-SELFTEST", path, f"defect application failed: {exc}")
        if expected not in {item["ruleId"] for item in child.items}:
            F.add("USF-PROVIDERS-SELFTEST", path, f"expected {expected} was not raised")


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
