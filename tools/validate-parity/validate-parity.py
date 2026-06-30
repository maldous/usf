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
    "USF-PARITY-018": ("blocking", "compose service disposition closure matrix is missing or invalid"),
    "USF-PARITY-019": ("blocking", "compose service row lacks machine-checkable closure disposition evidence"),
    "USF-PARITY-020": ("blocking", "unresolved compose service disposition lacks follow-up or out-of-scope rationale"),
    "USF-PARITY-021": ("blocking", "compose service disposition asserts unsupported proof or false equivalence"),
    "USF-PARITY-022": ("blocking", "compose service disposition closure or readiness is overclaimed"),
    "USF-PARITY-023": ("blocking", "USF-133 closure-tier evidence gate is missing or invalid"),
    "USF-PARITY-024": ("blocking", "USF-133 closure-tier gate lacks service or capability disposition evidence"),
    "USF-PARITY-025": ("blocking", "USF-133 closure-tier gate lacks required proof command evidence"),
    "USF-PARITY-026": ("blocking", "USF-133 closure-tier gate lacks validator linkage"),
    "USF-PARITY-027": ("blocking", "USF-133 closure-tier gate lacks a non-equivalence boundary for a substitute"),
    "USF-PARITY-028": ("blocking", "USF-133 closure is falsely claimed or implied"),
    "USF-PARITY-029": ("blocking", "source issue Done state is falsely claimed or implied"),
    "USF-PARITY-030": ("blocking", "USF-133 closure-tier readiness or certification is overclaimed"),
    "USF-PARITY-031": ("blocking", "USF-133 closure-tier external framework alignment is missing or overclaimed"),
    "USF-PARITY-032": ("blocking", "USF-133 closure-tier assurance maturity is missing or overclaimed"),
    "USF-PARITY-033": ("blocking", "USF-133 closure-tier enterprise exception register is incomplete"),
    "USF-PARITY-034": ("blocking", "USF-133 closure-tier promotion impact is missing"),
    "USF-PARITY-035": ("blocking", "USF-133 closure-tier security privacy operations or SDLC posture is incomplete"),
    "USF-PARITY-036": ("blocking", "USF-133 closure-tier enterprise customer feature posture is incomplete"),
    "USF-PARITY-037": ("blocking", "USF-133 closure-tier future evidence package shape is incomplete"),
    "USF-PARITY-038": ("blocking", "USF-133 closure-tier negative assurance is incomplete or overclaimed"),
    "USF-PARITY-SELFTEST": ("blocking", "planted parity defect did not raise its expected rule"),
}

MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
COMPOSE_CLOSURE_MATRIX_PATH = "docs/architecture/compose-service-disposition-closure-matrix.json"
USF133_CLOSURE_TIER_GATE_PATH = "docs/architecture/usf-133-closure-tier-evidence-gate.json"
COMPOSE_PARITY_MATRIX_PATH = "docs/architecture/complete-react-to-usf-compose-service-parity-matrix.json"
COMPOSE_CATALOGUE_PATH = "spec/instances/compose-service/service-catalogue.json"
ENTERPRISE_EVIDENCE_MODEL_PATH = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
PACKAGE_JSON_PATH = "package.json"
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
COMPOSE_CLOSURE_DISPOSITIONS = {
    "implemented",
    "implemented-equivalent",
    "covered-by-usf-runtime",
    "substituted-partial",
    "deferred",
    "requires-human-decision",
    "out-of-foundation-scope",
}
COMPOSE_IMPLEMENTED_DISPOSITIONS = {"implemented", "implemented-equivalent", "covered-by-usf-runtime"}
COMPOSE_BLOCKING_DISPOSITIONS = {"deferred", "requires-human-decision", "substituted-partial"}
COMPOSE_NON_EQUIVALENT_DISPOSITIONS = {
    "covered-by-usf-runtime",
    "substituted-partial",
    "deferred",
    "requires-human-decision",
    "out-of-foundation-scope",
}
PROHIBITED_READINESS_CLAIMS = {
    "full-react-parity-readiness",
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
}
USF133_GATE_PROHIBITED_CLAIMS = PROHIBITED_READINESS_CLAIMS | {"usf-133-closure"}
USF133_REQUIRED_CAPABILITIES = {
    "tenant-isolation",
    "authorization",
    "audit-evidence",
    "config-secrets",
    "data-classification",
    "retention-purge",
    "backup-restore",
    "incident-response",
    "vulnerability-dependency-posture",
    "observability",
    "operator-admin-access",
    "provider-supplier-boundaries",
    "privacy-data-minimisation",
}
USF133_CAPABILITY_STATUSES = {"proven", "bounded", "deferred", "out-of-scope", "blocked"}
USF133_REQUIRED_PROOF_COMMANDS = {
    "verify",
    "parity",
    "validate-spec-all",
    "validate-spec-pr",
    "validate-bootstrap",
    "validate-parity",
    "validate-enterprise",
    "validate-runtime",
    "validate-compose",
}
USF133_REQUIRED_VALIDATORS = {
    "validate-parity",
    "validate-enterprise",
    "validate-runtime",
    "validate-compose",
}
USF133_ASSURANCE_MATURITY_LEVELS = {
    "not-assessed",
    "designed",
    "documented",
    "implemented",
    "tested",
    "integration-proven",
    "operationally-rehearsed",
    "production-approved",
}
USF133_EVIDENCE_REQUIRED_MATURITY_LEVELS = {
    "tested",
    "integration-proven",
    "operationally-rehearsed",
    "production-approved",
}
USF133_PROMOTION_IMPACT_VALUES = {
    "dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "enterprise-readiness",
    "iso-supporting-evidence-completeness",
}
USF133_EXTERNAL_FRAMEWORKS = {
    "iso27001-isms-support",
    "nist-csf-govern-risk-security-outcomes",
    "nist-ssdf-secure-software-development-evidence",
    "owasp-asvs-application-security-categories",
}
USF133_SECURITY_PRIVACY_AREAS = {
    "tenant-isolation",
    "authorization",
    "privileged-access",
    "auditability",
    "encryption-secret-posture",
    "data-classification",
    "retention-purge",
    "privacy-data-minimisation",
    "data-residency",
    "supplier-subprocessor-boundary",
}
USF133_OPERATIONAL_EXCELLENCE_AREAS = {
    "observability",
    "slo-sla-posture",
    "alerting",
    "incident-response",
    "backup-restore",
    "dr-rpo-rto",
    "migration-rollback",
    "runbook-ownership",
    "support-escalation",
    "customer-impact-assessment",
}
USF133_SECURE_SDLC_AREAS = {
    "code-review-evidence",
    "threat-model-evidence",
    "dependency-pinning",
    "sbom-posture",
    "sast-scanning",
    "dependency-scanning",
    "container-scanning",
    "secret-scanning",
    "vulnerability-exceptions",
    "patch-sla",
    "release-approval",
    "artifact-provenance-signing",
}
USF133_ENTERPRISE_CUSTOMER_FEATURES = {
    "sso-saml-oidc",
    "scim-user-lifecycle",
    "rbac-abac",
    "audit-log-export",
    "tenant-admin-controls",
    "support-access-approval",
    "ip-allowlisting-private-networking",
    "customer-managed-keys",
    "custom-retention",
    "data-export-deletion",
    "webhook-signing",
    "admin-activity-reporting",
}
USF133_FEATURE_POSTURE_STATUSES = {"proven", "deferred", "blocked", "out-of-scope", "not-applicable"}
USF133_EVIDENCE_PACKAGE_FIELDS = {
    "environment",
    "commitSha",
    "prRef",
    "issueId",
    "evidenceId",
    "validationCommands",
    "riskDecision",
    "exceptionList",
    "approver",
    "reviewExpiry",
    "nonClaims",
}
USF133_REQUIRED_GATE_INPUTS = {
    "serviceCatalogue": COMPOSE_CATALOGUE_PATH,
    "serviceDispositionClosureMatrix": COMPOSE_CLOSURE_MATRIX_PATH,
    "enterpriseEvidenceModel": ENTERPRISE_EVIDENCE_MODEL_PATH,
    "runtimeProofManifest": "spec/instances/runtime-proof/runtime-application-compose-parity.json",
}

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


def read_json_or_error(path):
    try:
        return read_json(path), None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


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


def load_optional_json(path):
    if not os.path.exists(path):
        return None, "missing"
    return read_json_or_error(path)


def build_state(overrides=None):
    overrides = overrides or {}
    if "matrix" in overrides:
        matrix, matrix_error = overrides["matrix"], overrides.get("matrixError")
    else:
        matrix, matrix_error = load_matrix()
    if "composeClosureMatrix" in overrides:
        compose_closure_matrix = overrides["composeClosureMatrix"]
        compose_closure_error = overrides.get("composeClosureMatrixError")
    else:
        compose_closure_matrix, compose_closure_error = load_optional_json(COMPOSE_CLOSURE_MATRIX_PATH)
    if "usf133ClosureTierGate" in overrides:
        usf133_closure_tier_gate = overrides["usf133ClosureTierGate"]
        usf133_closure_tier_error = overrides.get("usf133ClosureTierGateError")
    else:
        usf133_closure_tier_gate, usf133_closure_tier_error = load_optional_json(USF133_CLOSURE_TIER_GATE_PATH)
    if "composeParityMatrix" in overrides:
        compose_parity_matrix = overrides["composeParityMatrix"]
        compose_parity_error = overrides.get("composeParityMatrixError")
    else:
        compose_parity_matrix, compose_parity_error = load_optional_json(COMPOSE_PARITY_MATRIX_PATH)
    if "composeCatalogue" in overrides:
        compose_catalogue = overrides["composeCatalogue"]
        compose_catalogue_error = overrides.get("composeCatalogueError")
    else:
        compose_catalogue, compose_catalogue_error = load_optional_json(COMPOSE_CATALOGUE_PATH)
    paths = set(overrides.get("paths", tracked_paths()))
    return {
        "matrix": matrix,
        "matrixError": matrix_error,
        "composeClosureMatrix": compose_closure_matrix,
        "composeClosureMatrixError": compose_closure_error,
        "usf133ClosureTierGate": usf133_closure_tier_gate,
        "usf133ClosureTierGateError": usf133_closure_tier_error,
        "composeParityMatrix": compose_parity_matrix,
        "composeParityMatrixError": compose_parity_error,
        "composeCatalogue": compose_catalogue,
        "composeCatalogueError": compose_catalogue_error,
        "paths": paths,
    }


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


def _catalogue_service_map(catalogue):
    if not isinstance(catalogue, dict):
        return {}
    return {
        service.get("serviceId"): service
        for service in catalogue.get("services", [])
        if isinstance(service, dict) and service.get("serviceId")
    }


def _react_service_map(compose_parity_matrix):
    if not isinstance(compose_parity_matrix, dict):
        return {}
    return {
        row.get("react_service"): row
        for row in compose_parity_matrix.get("services", [])
        if isinstance(row, dict) and row.get("react_service")
    }


def _closure_row_map(closure_matrix):
    if not isinstance(closure_matrix, dict):
        return {}
    return {
        row.get("service_id"): row
        for row in closure_matrix.get("rows", [])
        if isinstance(row, dict) and row.get("service_id")
    }


def _service_is_closure_relevant(service):
    if not isinstance(service, dict):
        return False
    if service.get("requirementState") in {True, "conditional", "deferred", "out-of-scope"}:
        return True
    if service.get("environmentDisposition") in {
        "shared-cross-environment-control-plane",
        "external-managed",
        "cloud-provider",
        "deferred",
        "out-of-scope",
    }:
        return True
    if (service.get("providerBoundary") or {}).get("disposition") in {
        "shared-control-plane",
        "external-managed",
        "cloud-provider",
        "deferred",
        "out-of-scope",
    }:
        return True
    if service.get("composeProfiles"):
        return True
    return any(
        policy.get("composePolicy") == "generate-profile-gated-service"
        for policy in (service.get("environmentPolicies") or {}).values()
        if isinstance(policy, dict)
    )


def _non_empty_list(value):
    return isinstance(value, list) and any(str(item).strip() for item in value)


def _set_or_empty(value):
    return set(value) if isinstance(value, list) else set()


def check_compose_service_closure(F, state):
    closure_matrix = state.get("composeClosureMatrix")
    compose_parity_matrix = state.get("composeParityMatrix")
    catalogue = state.get("composeCatalogue")

    if not isinstance(closure_matrix, dict):
        F.add("USF-PARITY-018", COMPOSE_CLOSURE_MATRIX_PATH, f"cannot load closure matrix: {state.get('composeClosureMatrixError')}")
        return
    if not isinstance(compose_parity_matrix, dict):
        F.add("USF-PARITY-018", COMPOSE_PARITY_MATRIX_PATH, f"cannot load compose parity matrix: {state.get('composeParityMatrixError')}")
        return
    if not isinstance(catalogue, dict):
        F.add("USF-PARITY-018", COMPOSE_CATALOGUE_PATH, f"cannot load compose service catalogue: {state.get('composeCatalogueError')}")
        return

    if closure_matrix.get("service_catalogue_authority") != COMPOSE_CATALOGUE_PATH:
        F.add("USF-PARITY-018", COMPOSE_CLOSURE_MATRIX_PATH, "closure matrix does not point at the semantic service catalogue authority")
    if closure_matrix.get("enterprise_evidence_model") != ENTERPRISE_EVIDENCE_MODEL_PATH:
        F.add("USF-PARITY-018", COMPOSE_CLOSURE_MATRIX_PATH, "closure matrix does not point at the enterprise evidence model")
    if not closure_matrix.get("done_state_governance_ref"):
        F.add("USF-PARITY-018", COMPOSE_CLOSURE_MATRIX_PATH, "closure matrix lacks done-state governance reference")
    if closure_matrix.get("parent_issue") != "USF-133" or closure_matrix.get("lane_issue") != "USF-185":
        F.add("USF-PARITY-018", COMPOSE_CLOSURE_MATRIX_PATH, "closure matrix is not scoped to USF-185 under USF-133")
    missing_non_claims = PROHIBITED_READINESS_CLAIMS - _set_or_empty(closure_matrix.get("non_claims"))
    if missing_non_claims:
        F.add("USF-PARITY-022", COMPOSE_CLOSURE_MATRIX_PATH, f"missing non-claims: {sorted(missing_non_claims)}")
    if _set_or_empty(closure_matrix.get("closure_blocking_dispositions")) != COMPOSE_BLOCKING_DISPOSITIONS:
        F.add("USF-PARITY-018", COMPOSE_CLOSURE_MATRIX_PATH, "closure_blocking_dispositions do not match validator policy")

    service_map = _catalogue_service_map(catalogue)
    react_map = _react_service_map(compose_parity_matrix)
    closure_rows = _closure_row_map(closure_matrix)

    if len(closure_rows) != len(closure_matrix.get("rows", [])):
        F.add("USF-PARITY-018", COMPOSE_CLOSURE_MATRIX_PATH, "closure matrix contains duplicate or invalid service_id rows")

    unresolved_services = []
    for service_id, service in sorted(service_map.items()):
        if not _service_is_closure_relevant(service):
            continue
        row = closure_rows.get(service_id)
        if row is None:
            F.add("USF-PARITY-019", f"service:{service_id}", "closure-relevant service lacks a closure matrix row")
            continue
        evidence = row.get("closure_evidence")
        if not isinstance(evidence, dict):
            F.add("USF-PARITY-019", f"service:{service_id}", "closure matrix row lacks closure_evidence")
            continue

        disposition = evidence.get("closure_disposition")
        if disposition not in COMPOSE_CLOSURE_DISPOSITIONS:
            F.add("USF-PARITY-019", f"service:{service_id}", f"invalid closure disposition: {disposition}")
        if evidence.get("service_catalogue_authority") is not True:
            F.add("USF-PARITY-019", f"service:{service_id}", "service catalogue authority flag is not true")
        expected_ref = f"{COMPOSE_CATALOGUE_PATH}#{service_id}"
        if evidence.get("service_catalogue_ref") != expected_ref:
            F.add("USF-PARITY-019", f"service:{service_id}", "service catalogue ref does not match service_id")
        if not _non_empty_list(evidence.get("react_parity_refs")):
            F.add("USF-PARITY-019", f"service:{service_id}", "react parity refs are missing")
        enterprise_refs = evidence.get("enterprise_evidence_refs")
        if not _non_empty_list(enterprise_refs):
            F.add("USF-PARITY-019", f"service:{service_id}", "enterprise evidence refs are missing")
        else:
            required_enterprise_refs = {
                f"soa-service-{service_id}",
                "evidence-lane1-service-disposition-closure-matrix",
                "threat-lane-usf-185",
            }
            missing_enterprise_refs = required_enterprise_refs - set(enterprise_refs)
            if missing_enterprise_refs:
                F.add("USF-PARITY-019", f"service:{service_id}", f"missing enterprise evidence refs: {sorted(missing_enterprise_refs)}")

        react_names = set(service.get("reactComposeServiceNames") or [])
        matrix_names = set(row.get("react_compose_service_names") or [])
        if react_names != matrix_names:
            F.add("USF-PARITY-019", f"service:{service_id}", "closure matrix react service names do not match service catalogue")
        for react_name in sorted(react_names):
            react_row = react_map.get(react_name)
            if not react_row:
                F.add("USF-PARITY-018", f"service:{service_id}:{react_name}", "react compose service is missing from parity matrix")
                continue
            status = react_row.get("usf_accounting_status")
            if status in COMPOSE_CLOSURE_DISPOSITIONS and disposition != status:
                F.add("USF-PARITY-021", f"service:{service_id}:{react_name}", f"matrix status {status} cannot be represented as {disposition}")
            if status in {"requires-human-decision", "deferred", "substituted-partial"} and disposition not in COMPOSE_BLOCKING_DISPOSITIONS:
                F.add("USF-PARITY-021", f"service:{service_id}:{react_name}", f"matrix status {status} cannot be closed as {disposition}")
            if status == "out-of-foundation-scope" and disposition != "out-of-foundation-scope":
                F.add("USF-PARITY-021", f"service:{service_id}:{react_name}", "out-of-scope row was not preserved")

        if disposition in COMPOSE_IMPLEMENTED_DISPOSITIONS and not _non_empty_list(evidence.get("proof_evidence_refs")):
            F.add("USF-PARITY-021", f"service:{service_id}", "implemented or proof-covered disposition lacks proof evidence refs")
        if disposition in COMPOSE_NON_EQUIVALENT_DISPOSITIONS:
            has_boundary = _non_empty_list(evidence.get("non_equivalence_boundaries"))
            has_out_scope = bool(str(evidence.get("accepted_out_of_scope_rationale") or "").strip())
            has_missing = _non_empty_list(evidence.get("missing_evidence"))
            if disposition == "out-of-foundation-scope":
                if not has_out_scope:
                    F.add("USF-PARITY-020", f"service:{service_id}", "out-of-scope disposition lacks accepted rationale")
            elif disposition in {"covered-by-usf-runtime", "substituted-partial"}:
                if not has_boundary:
                    F.add("USF-PARITY-021", f"service:{service_id}", "substitute or runtime-covered disposition lacks non-equivalence boundary")
            elif not (has_boundary or has_missing):
                F.add("USF-PARITY-020", f"service:{service_id}", "unresolved disposition lacks missing evidence or non-equivalence boundary")

        if disposition in COMPOSE_BLOCKING_DISPOSITIONS:
            unresolved_services.append(service_id)
            if evidence.get("closure_blocking") is not True:
                F.add("USF-PARITY-021", f"service:{service_id}", "blocking disposition is not marked closure_blocking")
            issues = evidence.get("tracking_issues")
            if not _non_empty_list(issues) or not all(str(issue).startswith("USF-") for issue in issues):
                F.add("USF-PARITY-020", f"service:{service_id}", "blocking disposition lacks linked USF follow-up issue")
        elif evidence.get("closure_blocking") is True:
            F.add("USF-PARITY-021", f"service:{service_id}", "resolved disposition is marked closure_blocking")

        allowed_claims = _set_or_empty(evidence.get("readiness_claims_allowed"))
        if allowed_claims & PROHIBITED_READINESS_CLAIMS:
            F.add("USF-PARITY-022", f"service:{service_id}", f"prohibited readiness claim allowed: {sorted(allowed_claims & PROHIBITED_READINESS_CLAIMS)}")
        prohibited_claims = _set_or_empty(evidence.get("readiness_claims_prohibited"))
        missing_prohibited = PROHIBITED_READINESS_CLAIMS - prohibited_claims
        if missing_prohibited:
            F.add("USF-PARITY-022", f"service:{service_id}", f"missing prohibited readiness claims: {sorted(missing_prohibited)}")

    if closure_matrix.get("closure_claimed") is True and unresolved_services:
        F.add(
            "USF-PARITY-022",
            COMPOSE_CLOSURE_MATRIX_PATH,
            f"closure_claimed is true while unresolved service dispositions remain: {', '.join(unresolved_services)}",
        )


def _rows_by_id(rows, key):
    if not isinstance(rows, list):
        return {}
    return {
        row.get(key): row
        for row in rows
        if isinstance(row, dict) and isinstance(row.get(key), str) and row.get(key)
    }


def _has_usf_issue_list(value):
    return isinstance(value, list) and value and all(str(item).startswith("USF-") for item in value)


def _valid_merge_sha(value):
    return isinstance(value, str) and len(value) == 40 and all(ch in "0123456789abcdef" for ch in value)


def _check_maturity(F, subject, row):
    level = row.get("assuranceMaturityLevel")
    if level not in USF133_ASSURANCE_MATURITY_LEVELS:
        F.add("USF-PARITY-032", subject, f"invalid or missing assuranceMaturityLevel: {level!r}")
        return
    if level == "production-approved":
        F.add("USF-PARITY-032", subject, "USF-166 must not claim production-approved maturity")
    if level in USF133_EVIDENCE_REQUIRED_MATURITY_LEVELS and not (
        row.get("evidenceSource")
        or row.get("sourceRef")
        or row.get("validationCommand")
        or _non_empty_list(row.get("validationCommands"))
        or _non_empty_list(row.get("proofEvidenceRefs"))
    ):
        F.add("USF-PARITY-032", subject, f"{level} maturity requires explicit evidence linkage")


def _check_promotion_impact(F, subject, row):
    impact = row.get("promotionImpact")
    if not _non_empty_list(impact):
        F.add("USF-PARITY-034", subject, "unresolved row lacks promotionImpact")
        return
    unknown = set(impact) - USF133_PROMOTION_IMPACT_VALUES
    if unknown:
        F.add("USF-PARITY-034", subject, f"unknown promotion impact values: {sorted(unknown)}")


def _check_enterprise_posture_rows(F, gate, key, expected, rule_id):
    rows = _rows_by_id(gate.get(key), "area")
    if set(rows) != expected:
        F.add(rule_id, key, f"missing={sorted(expected - set(rows))} extra={sorted(set(rows) - expected)}")
    for area, row in rows.items():
        if row.get("status") not in {"bounded", "deferred", "blocked", "out-of-scope", "not-applicable"}:
            F.add(rule_id, f"{key}:{area}", f"invalid status {row.get('status')!r}")
        if not row.get("evidenceSource") or not str(row.get("followUpIssue", "")).startswith("USF-"):
            F.add(rule_id, f"{key}:{area}", "posture row requires evidenceSource and USF follow-up issue")
        _check_maturity(F, f"{key}:{area}", row)
        if PROHIBITED_READINESS_CLAIMS - _set_or_empty(row.get("nonClaims")):
            F.add(rule_id, f"{key}:{area}", "posture row non-claims are incomplete")


def check_usf133_closure_tier_gate(F, state):
    gate = state.get("usf133ClosureTierGate")
    closure_matrix = state.get("composeClosureMatrix")
    if not isinstance(gate, dict):
        F.add("USF-PARITY-023", USF133_CLOSURE_TIER_GATE_PATH, f"cannot load closure-tier evidence gate: {state.get('usf133ClosureTierGateError')}")
        return
    if not isinstance(closure_matrix, dict):
        F.add("USF-PARITY-023", USF133_CLOSURE_TIER_GATE_PATH, "closure-tier gate cannot be checked without closure matrix")
        return

    expected_top = {
        "id": "usf-133-closure-tier-evidence-gate",
        "issueId": "USF-166",
        "parentIssueId": "USF-133",
        "laneWrapperIssueId": "USF-185",
        "dashboardIssueId": "USF-184",
        "coordinatorIssueId": "USF-192",
    }
    for key, expected in expected_top.items():
        if gate.get(key) != expected:
            F.add("USF-PARITY-023", f"{USF133_CLOSURE_TIER_GATE_PATH}:{key}", f"expected {expected!r}")
    if "USF-167" not in set(gate.get("blockedDownstreamIssueIds") or []):
        F.add("USF-PARITY-023", "blockedDownstreamIssueIds", "USF-167 must remain explicitly blocked downstream")
    if set(gate.get("sourceIssueIds") or []) != {"USF-166", "USF-167", "USF-182"}:
        F.add("USF-PARITY-023", "sourceIssueIds", "closure tier must remain scoped to USF-166, USF-167, and USF-182")

    tier = gate.get("selectedClosureTier", {})
    if tier.get("kind") != "risk-based-closure-tier" or tier.get("decisionAcceptedDoesNotMeanWorkComplete") is not True:
        F.add("USF-PARITY-023", "selectedClosureTier", "closure tier must be a risk-based evidence gate and not a decision-only closure")
    if tier.get("usf133ClosureClaimed") is not False:
        F.add("USF-PARITY-028", "selectedClosureTier.usf133ClosureClaimed", "USF-133 closure must not be claimed by USF-166")
    if tier.get("sourceIssueDoneByImplication") is not False or tier.get("laneWrapperDoneMeansSourceIssueDone") is not False:
        F.add("USF-PARITY-029", "selectedClosureTier", "source issues must not be Done by implication")
    for key, expected in USF133_REQUIRED_GATE_INPUTS.items():
        if gate.get("authorityInputs", {}).get(key) != expected:
            F.add("USF-PARITY-023", f"authorityInputs.{key}", f"expected {expected}")

    allowed_claims = _set_or_empty(gate.get("readinessClaimsAllowed"))
    prohibited_claims = _set_or_empty(gate.get("readinessClaimsProhibited"))
    if allowed_claims & USF133_GATE_PROHIBITED_CLAIMS:
        F.add("USF-PARITY-030", "readinessClaimsAllowed", f"prohibited claims allowed: {sorted(allowed_claims & USF133_GATE_PROHIBITED_CLAIMS)}")
    missing_claims = USF133_GATE_PROHIBITED_CLAIMS - prohibited_claims
    if missing_claims:
        F.add("USF-PARITY-030", "readinessClaimsProhibited", f"missing prohibited claims: {sorted(missing_claims)}")

    frameworks = _rows_by_id(gate.get("externalFrameworkAlignment"), "frameworkId")
    if set(frameworks) != USF133_EXTERNAL_FRAMEWORKS:
        F.add(
            "USF-PARITY-031",
            "externalFrameworkAlignment",
            f"missing={sorted(USF133_EXTERNAL_FRAMEWORKS - set(frameworks))} extra={sorted(set(frameworks) - USF133_EXTERNAL_FRAMEWORKS)}",
        )
    for framework_id, framework in frameworks.items():
        for field in ("complianceClaimed", "certificationClaimed", "readinessClaimed"):
            if framework.get(field) is not False:
                F.add("USF-PARITY-031", f"framework:{framework_id}.{field}", "external framework alignment must not claim compliance, certification, or readiness")
        if not _non_empty_list(framework.get("mappedEvidenceSections")):
            F.add("USF-PARITY-031", f"framework:{framework_id}", "framework row lacks mapped evidence sections")
        if PROHIBITED_READINESS_CLAIMS - _set_or_empty(framework.get("nonClaims")):
            F.add("USF-PARITY-031", f"framework:{framework_id}", "framework row non-claims are incomplete")

    maturity_model = gate.get("assuranceMaturityModel", {})
    if _set_or_empty(maturity_model.get("allowedLevels")) != USF133_ASSURANCE_MATURITY_LEVELS:
        F.add("USF-PARITY-032", "assuranceMaturityModel.allowedLevels", "assurance maturity level set is incomplete")
    if maturity_model.get("productionApprovedAllowedInUsf166") is not False:
        F.add("USF-PARITY-032", "assuranceMaturityModel.productionApprovedAllowedInUsf166", "USF-166 must not allow production-approved maturity")

    env_dependency = gate.get("environmentPromotionStandardDependency", {})
    if env_dependency.get("issueId") != "USF-193" or env_dependency.get("implementedByThisPr") is not False:
        F.add("USF-PARITY-031", "environmentPromotionStandardDependency", "USF-193 must remain the unimplemented formal environment promotion tracker for PR #133")
    if env_dependency.get("requiredForPr133Acceptance") is not False or env_dependency.get("requiredBeforeReadinessClaim") is not True:
        F.add("USF-PARITY-031", "environmentPromotionStandardDependency", "USF-193 is not required for PR #133 acceptance but is required before readiness claims")

    freshness_policy = gate.get("evidenceFreshnessPolicy", {})
    for key in ("staleEvidenceSatisfiesClosure", "unmergedEvidenceSatisfiesClosure", "pendingPrEvidenceSatisfiesUsf133Closure"):
        if freshness_policy.get(key) is not False:
            F.add("USF-PARITY-023", f"evidenceFreshnessPolicy.{key}", "stale, unmerged, or pending PR evidence must not satisfy closure")
    if {"stale", "unknown"} - set(freshness_policy.get("rejectedFreshnessValues") or []):
        F.add("USF-PARITY-023", "evidenceFreshnessPolicy.rejectedFreshnessValues", "stale and unknown freshness must be rejected")
    for evidence in gate.get("mergedEvidenceInputs", []):
        subject = evidence.get("evidenceId", "mergedEvidenceInputs")
        _check_maturity(F, subject, evidence)
        for field in ("prRef", "mergeShaRef", "issueRefs", "evidenceId", "sourceRef", "freshness"):
            if not evidence.get(field):
                F.add("USF-PARITY-023", subject, f"missing {field}")
        if not _valid_merge_sha(evidence.get("mergeShaRef")):
            F.add("USF-PARITY-023", subject, "mergeShaRef must be a 40-character SHA for merged evidence")
        if evidence.get("freshness") in {"stale", "unknown"}:
            F.add("USF-PARITY-023", subject, "stale or unknown evidence cannot satisfy closure")
    this_pr = gate.get("thisPrEvidence", {})
    _check_maturity(F, "thisPrEvidence", this_pr)
    if this_pr.get("freshness") != "pending-pr-merge" or this_pr.get("satisfiesUsf133Closure") is not False:
        F.add("USF-PARITY-028", "thisPrEvidence", "unmerged USF-166 evidence must not satisfy USF-133 closure")

    closure_rows = _closure_row_map(closure_matrix)
    service_refs = _rows_by_id(gate.get("requiredServiceDispositionRefs"), "serviceId")
    exception_rows = _rows_by_id(gate.get("enterpriseExceptionRegister"), "id")
    if set(service_refs) != set(closure_rows):
        F.add(
            "USF-PARITY-024",
            "requiredServiceDispositionRefs",
            f"missing={sorted(set(closure_rows) - set(service_refs))} extra={sorted(set(service_refs) - set(closure_rows))}",
        )
    for service_id, closure_row in sorted(closure_rows.items()):
        ref = service_refs.get(service_id)
        if not ref:
            continue
        expected_ref = f"{COMPOSE_CLOSURE_MATRIX_PATH}#{service_id}"
        if ref.get("matrixRowRef") != expected_ref:
            F.add("USF-PARITY-024", f"service:{service_id}", "service reference does not point at closure matrix row")
        if ref.get("enterpriseEvidenceSource") != "closure-matrix-row" or ref.get("serviceCatalogueOwnerSource") != "service-catalogue-row":
            F.add("USF-PARITY-024", f"service:{service_id}", "service reference must inherit enterprise and owner metadata from governed rows")
        if not _has_usf_issue_list(ref.get("sourceIssueRefs")):
            F.add("USF-PARITY-024", f"service:{service_id}", "service reference lacks USF source issue refs")
        _check_maturity(F, f"service:{service_id}", ref)
        evidence = closure_row.get("closure_evidence", {})
        disposition = evidence.get("closure_disposition")
        requires_exception = (
            evidence.get("closure_blocking") is True
            or disposition in {"deferred", "requires-human-decision", "substituted-partial", "out-of-foundation-scope", "covered-by-usf-runtime"}
        )
        if requires_exception:
            _check_promotion_impact(F, f"service:{service_id}", ref)
            exception_ref = ref.get("enterpriseExceptionRef")
            if not exception_ref or exception_ref not in exception_rows:
                F.add("USF-PARITY-033", f"service:{service_id}", "unresolved service row lacks enterprise exception ref")
        if disposition in COMPOSE_BLOCKING_DISPOSITIONS:
            issues = evidence.get("tracking_issues")
            if not _has_usf_issue_list(issues):
                F.add("USF-PARITY-024", f"service:{service_id}", "blocking service row lacks follow-up issue evidence")
        if disposition in {"covered-by-usf-runtime", "substituted-partial"} and not _non_empty_list(evidence.get("non_equivalence_boundaries")):
            F.add("USF-PARITY-027", f"service:{service_id}", "substitute row lacks non-equivalence boundary")

    capabilities = _rows_by_id(gate.get("requiredCapabilityDispositionRefs"), "capabilityId")
    if set(capabilities) != USF133_REQUIRED_CAPABILITIES:
        F.add(
            "USF-PARITY-024",
            "requiredCapabilityDispositionRefs",
            f"missing={sorted(USF133_REQUIRED_CAPABILITIES - set(capabilities))} extra={sorted(set(capabilities) - USF133_REQUIRED_CAPABILITIES)}",
        )
    for capability_id, capability in sorted(capabilities.items()):
        if capability.get("status") not in USF133_CAPABILITY_STATUSES:
            F.add("USF-PARITY-024", f"capability:{capability_id}", f"invalid capability status {capability.get('status')!r}")
        _check_maturity(F, f"capability:{capability_id}", capability)
        for field in ("owner", "riskOwner", "controlOwner", "evidenceSource"):
            if not str(capability.get(field) or "").strip():
                F.add("USF-PARITY-024", f"capability:{capability_id}", f"missing {field}")
        if not _non_empty_list(capability.get("validationCommands")):
            F.add("USF-PARITY-024", f"capability:{capability_id}", "missing validation commands")
        if not _has_usf_issue_list(capability.get("sourceIssueRefs")):
            F.add("USF-PARITY-024", f"capability:{capability_id}", "missing USF source issue refs")
        risk = capability.get("riskTreatment", {})
        for field in ("treatment", "reviewDate", "followUpIssue", "riskStatement"):
            if not str(risk.get(field) or "").strip():
                F.add("USF-PARITY-024", f"capability:{capability_id}", f"missing risk treatment {field}")
        if not str(risk.get("followUpIssue", "")).startswith("USF-"):
            F.add("USF-PARITY-024", f"capability:{capability_id}", "risk treatment follow-up issue must be a USF issue")
        if capability.get("status") in {"deferred", "blocked", "out-of-scope"}:
            _check_promotion_impact(F, f"capability:{capability_id}", capability)
            exception_ref = capability.get("enterpriseExceptionRef")
            if not exception_ref or exception_ref not in exception_rows:
                F.add("USF-PARITY-033", f"capability:{capability_id}", "deferred capability lacks enterprise exception ref")

    feature_rows = _rows_by_id(gate.get("enterpriseFeatureCompletenessMatrix"), "feature")
    if set(feature_rows) != USF133_REQUIRED_CAPABILITIES:
        F.add("USF-PARITY-024", "enterpriseFeatureCompletenessMatrix", "feature completeness matrix must cover every required capability")
    for feature, row in feature_rows.items():
        capability = capabilities.get(row.get("capabilityRef"))
        if not capability or row.get("status") != capability.get("status"):
            F.add("USF-PARITY-024", f"feature:{feature}", "feature row must point at matching capability status")

    if not exception_rows:
        F.add("USF-PARITY-033", "enterpriseExceptionRegister", "enterprise exception register is required")
    for exception_id, exception in sorted(exception_rows.items()):
        for field in ("targetType", "targetId", "reason", "owner", "riskOwner", "controlOwner", "treatmentPath", "followUpIssue", "reviewDate", "blockerStatus"):
            if not str(exception.get(field) or "").strip():
                F.add("USF-PARITY-033", exception_id, f"missing exception {field}")
        if not str(exception.get("followUpIssue", "")).startswith("USF-"):
            F.add("USF-PARITY-033", exception_id, "exception followUpIssue must be a USF issue")
        _check_promotion_impact(F, exception_id, exception)
        if not isinstance(exception.get("preventsPromotion"), dict):
            F.add("USF-PARITY-034", exception_id, "exception lacks preventsPromotion map")
        if PROHIBITED_READINESS_CLAIMS - _set_or_empty(exception.get("nonClaims")):
            F.add("USF-PARITY-033", exception_id, "exception non-claims are incomplete")

    _check_enterprise_posture_rows(F, gate, "securityPrivacyByDesignCoverage", USF133_SECURITY_PRIVACY_AREAS, "USF-PARITY-035")
    _check_enterprise_posture_rows(F, gate, "operationalExcellenceCoverage", USF133_OPERATIONAL_EXCELLENCE_AREAS, "USF-PARITY-035")
    _check_enterprise_posture_rows(F, gate, "secureSdlcPosture", USF133_SECURE_SDLC_AREAS, "USF-PARITY-035")

    enterprise_features = _rows_by_id(gate.get("enterpriseCustomerFeaturePosture"), "feature")
    if set(enterprise_features) != USF133_ENTERPRISE_CUSTOMER_FEATURES:
        F.add(
            "USF-PARITY-036",
            "enterpriseCustomerFeaturePosture",
            f"missing={sorted(USF133_ENTERPRISE_CUSTOMER_FEATURES - set(enterprise_features))} extra={sorted(set(enterprise_features) - USF133_ENTERPRISE_CUSTOMER_FEATURES)}",
        )
    for feature, row in enterprise_features.items():
        if row.get("status") not in USF133_FEATURE_POSTURE_STATUSES:
            F.add("USF-PARITY-036", f"enterpriseFeature:{feature}", f"invalid status {row.get('status')!r}")
        if row.get("implementedByUsf166") is not False:
            F.add("USF-PARITY-036", f"enterpriseFeature:{feature}", "USF-166 must not implement enterprise customer features")
        if not str(row.get("followUpIssue", "")).startswith("USF-"):
            F.add("USF-PARITY-036", f"enterpriseFeature:{feature}", "enterprise feature lacks follow-up issue")
        _check_promotion_impact(F, f"enterpriseFeature:{feature}", row)
        if PROHIBITED_READINESS_CLAIMS - _set_or_empty(row.get("nonClaims")):
            F.add("USF-PARITY-036", f"enterpriseFeature:{feature}", "enterprise feature non-claims are incomplete")

    package_shape = gate.get("futureReadinessEvidencePackageShape", {})
    missing_package_fields = USF133_EVIDENCE_PACKAGE_FIELDS - _set_or_empty(package_shape.get("requiredFields"))
    if missing_package_fields:
        F.add("USF-PARITY-037", "futureReadinessEvidencePackageShape.requiredFields", f"missing fields: {sorted(missing_package_fields)}")
    for key in ("requiresExceptionRegister", "requiresNonClaims", "requiresApprovalForHigherReadiness"):
        if package_shape.get(key) is not True:
            F.add("USF-PARITY-037", f"futureReadinessEvidencePackageShape.{key}", "future readiness evidence package shape must preserve this requirement")

    negative = gate.get("negativeAssurance", {})
    fail_claims = _set_or_empty(negative.get("failIfImpliedClaims"))
    if USF133_GATE_PROHIBITED_CLAIMS - fail_claims:
        F.add("USF-PARITY-038", "negativeAssurance.failIfImpliedClaims", "negative assurance must include every closure/readiness prohibited claim")
    for extra in ("asvs-conformance", "nist-csf-compliance", "nist-ssdf-conformance"):
        if extra not in fail_claims:
            F.add("USF-PARITY-038", "negativeAssurance.failIfImpliedClaims", f"missing external assurance non-claim: {extra}")
    if negative.get("partialEvidenceCannotSatisfyClosure") is not True:
        F.add("USF-PARITY-038", "negativeAssurance.partialEvidenceCannotSatisfyClosure", "partial evidence must not satisfy closure")

    package = read_json(PACKAGE_JSON_PATH) if os.path.exists(PACKAGE_JSON_PATH) else {}
    scripts = package.get("scripts", {}) if isinstance(package, dict) else {}
    proof_commands = _rows_by_id(gate.get("proofCommands"), "id")
    if set(proof_commands) != USF133_REQUIRED_PROOF_COMMANDS:
        F.add(
            "USF-PARITY-025",
            "proofCommands",
            f"missing={sorted(USF133_REQUIRED_PROOF_COMMANDS - set(proof_commands))} extra={sorted(set(proof_commands) - USF133_REQUIRED_PROOF_COMMANDS)}",
        )
    for command_id, command in proof_commands.items():
        if command.get("wiredIntoClosureGate") is not True:
            F.add("USF-PARITY-025", f"proofCommand:{command_id}", "proof command is not wired into closure gate")
        if not str(command.get("command") or "").strip():
            F.add("USF-PARITY-025", f"proofCommand:{command_id}", "proof command string is required")
        script_name = command.get("packageScript")
        if script_name:
            script = scripts.get(script_name)
            if not script:
                F.add("USF-PARITY-025", f"proofCommand:{command_id}", f"package script {script_name} is missing")
            if command_id == "verify" and "parity" not in str(script):
                F.add("USF-PARITY-025", "proofCommand:verify", "verify must include parity")
            if command_id == "parity" and "validate-parity.py" not in str(script):
                F.add("USF-PARITY-025", "proofCommand:parity", "parity must include validate-parity")

    validators = _rows_by_id(gate.get("validators"), "id")
    if set(validators) != USF133_REQUIRED_VALIDATORS:
        F.add(
            "USF-PARITY-026",
            "validators",
            f"missing={sorted(USF133_REQUIRED_VALIDATORS - set(validators))} extra={sorted(set(validators) - USF133_REQUIRED_VALIDATORS)}",
        )
    for validator_id, validator in validators.items():
        path = validator.get("path")
        if validator.get("required") is not True:
            F.add("USF-PARITY-026", f"validator:{validator_id}", "validator row must be required")
        if not path or not os.path.exists(path):
            F.add("USF-PARITY-026", f"validator:{validator_id}", "validator path is missing")
        script_name = validator.get("packageScript")
        if script_name and script_name not in scripts:
            F.add("USF-PARITY-026", f"validator:{validator_id}", f"package script {script_name} is missing")
        if not str(validator.get("verifyPath") or "").strip():
            F.add("USF-PARITY-026", f"validator:{validator_id}", "validator lacks verify/parity wiring note")

    status = gate.get("statusIntegrity", {})
    if status.get("usf133ClosureAllowed") is not False or status.get("usf133ClosureClaimed") is not False:
        F.add("USF-PARITY-028", "statusIntegrity", "USF-133 closure is not allowed or claimed by this source issue")
    for key in ("usf166DoneClaimed", "usf167DoneClaimed", "usf182DoneClaimed", "laneWrapperDoneStatesSatisfySourceIssues", "validationPassingAloneIsDone"):
        if status.get(key) is not False:
            F.add("USF-PARITY-029", f"statusIntegrity.{key}", "source issue Done state must not be claimed or implied")
    if status.get("postMergeReconciliationRequired") is not True or status.get("downstreamUsf167BlockedUntilUsf166MergedAndReconciled") is not True:
        F.add("USF-PARITY-029", "statusIntegrity", "post-merge reconciliation and USF-167 block must remain explicit")

    enterprise_model, enterprise_error = load_optional_json(ENTERPRISE_EVIDENCE_MODEL_PATH)
    if isinstance(enterprise_model, dict):
        soa = _rows_by_id(enterprise_model.get("soaSupportMappings"), "id")
        evidence = _rows_by_id(enterprise_model.get("evidenceRegister"), "id")
        threats = _rows_by_id(enterprise_model.get("threatModelAbuseCaseRegister"), "id")
        for required_id, rows, rule in (
            ("usf-166-soa-closure-tier-evidence-gate", soa, "USF-PARITY-024"),
            ("evidence-usf-166-closure-tier-input-baseline", evidence, "USF-PARITY-024"),
            ("usf-166-threat-closure-tier-overclaim", threats, "USF-PARITY-024"),
        ):
            if required_id not in rows:
                F.add(rule, required_id, "USF-166 enterprise evidence linkage is missing")
    else:
        F.add("USF-PARITY-024", ENTERPRISE_EVIDENCE_MODEL_PATH, f"cannot load enterprise evidence model: {enterprise_error}")


def run_checks(F, state=None):
    state = state or build_state()
    if not check_shape(F, state):
        return
    check_rows(F, state)
    check_no_unauthorised_ui_artefacts(F, state)
    check_compose_service_closure(F, state)
    check_usf133_closure_tier_gate(F, state)


def apply_mutation(base_state, mutation):
    base_matrix = base_state["matrix"]
    base_paths = base_state["paths"]
    matrix = copy.deepcopy(base_matrix) if base_matrix is not None else None
    compose_closure_matrix = copy.deepcopy(base_state.get("composeClosureMatrix"))
    usf133_closure_tier_gate = copy.deepcopy(base_state.get("usf133ClosureTierGate"))
    compose_parity_matrix = copy.deepcopy(base_state.get("composeParityMatrix"))
    compose_catalogue = copy.deepcopy(base_state.get("composeCatalogue"))
    paths = set(base_paths)
    overrides = {}
    if mutation.get("removeMatrix"):
        overrides["matrix"] = None
        overrides["matrixError"] = "missing"
        overrides["paths"] = paths
        return overrides
    if mutation.get("removeComposeClosureMatrix"):
        compose_closure_matrix = None
        overrides["composeClosureMatrixError"] = "missing"
    if mutation.get("removeUsf133ClosureTierGate"):
        usf133_closure_tier_gate = None
        overrides["usf133ClosureTierGateError"] = "missing"
    if "setTop" in mutation:
        for k, v in mutation["setTop"].items():
            matrix[k] = v
    if "composeClosureSetTop" in mutation:
        for k, v in mutation["composeClosureSetTop"].items():
            compose_closure_matrix[k] = v
    if "closureTierSetTop" in mutation:
        for k, v in mutation["closureTierSetTop"].items():
            usf133_closure_tier_gate[k] = v
    if "closureTierSetSelectedTier" in mutation:
        tier = usf133_closure_tier_gate.setdefault("selectedClosureTier", {})
        for k, v in mutation["closureTierSetSelectedTier"].items():
            tier[k] = v
    if "closureTierSetStatusIntegrity" in mutation:
        status = usf133_closure_tier_gate.setdefault("statusIntegrity", {})
        for k, v in mutation["closureTierSetStatusIntegrity"].items():
            status[k] = v
    if "closureTierSetClaims" in mutation:
        for k, v in mutation["closureTierSetClaims"].items():
            usf133_closure_tier_gate[k] = v
    if "closureTierPatchFramework" in mutation:
        patch = mutation["closureTierPatchFramework"]
        row = next(
            r for r in usf133_closure_tier_gate.get("externalFrameworkAlignment", [])
            if r.get("frameworkId") == patch["frameworkId"]
        )
        for k, v in patch.get("set", {}).items():
            row[k] = v
        for k in patch.get("drop", []):
            row.pop(k, None)
    if "closureTierPatchServiceRef" in mutation:
        patch = mutation["closureTierPatchServiceRef"]
        row = next(
            r for r in usf133_closure_tier_gate.get("requiredServiceDispositionRefs", [])
            if r.get("serviceId") == patch["serviceId"]
        )
        for k, v in patch.get("set", {}).items():
            row[k] = v
        for k in patch.get("drop", []):
            row.pop(k, None)
    if "closureTierRemoveException" in mutation:
        exception_id = mutation["closureTierRemoveException"].get("id")
        usf133_closure_tier_gate["enterpriseExceptionRegister"] = [
            row for row in usf133_closure_tier_gate.get("enterpriseExceptionRegister", [])
            if row.get("id") != exception_id
        ]
    if "closureTierRemovePostureRow" in mutation:
        patch = mutation["closureTierRemovePostureRow"]
        section = patch["section"]
        area = patch["area"]
        usf133_closure_tier_gate[section] = [
            row for row in usf133_closure_tier_gate.get(section, [])
            if row.get("area") != area
        ]
    if "closureTierRemoveEnterpriseFeature" in mutation:
        feature = mutation["closureTierRemoveEnterpriseFeature"].get("feature")
        usf133_closure_tier_gate["enterpriseCustomerFeaturePosture"] = [
            row for row in usf133_closure_tier_gate.get("enterpriseCustomerFeaturePosture", [])
            if row.get("feature") != feature
        ]
    if "closureTierPatchEvidencePackageShape" in mutation:
        shape = usf133_closure_tier_gate.setdefault("futureReadinessEvidencePackageShape", {})
        for k, v in mutation["closureTierPatchEvidencePackageShape"].get("set", {}).items():
            shape[k] = v
        for k in mutation["closureTierPatchEvidencePackageShape"].get("drop", []):
            shape.pop(k, None)
    if "closureTierPatchNegativeAssurance" in mutation:
        negative = usf133_closure_tier_gate.setdefault("negativeAssurance", {})
        for k, v in mutation["closureTierPatchNegativeAssurance"].get("set", {}).items():
            negative[k] = v
        for k in mutation["closureTierPatchNegativeAssurance"].get("drop", []):
            negative.pop(k, None)
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
    if "composeClosureRowPatch" in mutation:
        patch = mutation["composeClosureRowPatch"]
        if "service_id" in patch:
            row = next(
                r for r in compose_closure_matrix.get("rows", [])
                if r.get("service_id") == patch["service_id"]
            )
        else:
            row = compose_closure_matrix.get("rows", [])[patch.get("index", 0)]
        for k, v in patch.get("set", {}).items():
            row[k] = v
        for k in patch.get("drop", []):
            row.pop(k, None)
        evidence = row.setdefault("closure_evidence", {})
        for k, v in patch.get("setEvidence", {}).items():
            evidence[k] = v
        for k in patch.get("dropEvidence", []):
            evidence.pop(k, None)
    if "removeComposeClosureRow" in mutation:
        service_id = mutation["removeComposeClosureRow"].get("service_id")
        compose_closure_matrix["rows"] = [
            row for row in compose_closure_matrix.get("rows", [])
            if row.get("service_id") != service_id
        ]
    if "removeClosureTierServiceRef" in mutation:
        service_id = mutation["removeClosureTierServiceRef"].get("serviceId")
        usf133_closure_tier_gate["requiredServiceDispositionRefs"] = [
            row for row in usf133_closure_tier_gate.get("requiredServiceDispositionRefs", [])
            if row.get("serviceId") != service_id
        ]
    if "closureTierRemoveProofCommand" in mutation:
        command_id = mutation["closureTierRemoveProofCommand"].get("id")
        usf133_closure_tier_gate["proofCommands"] = [
            row for row in usf133_closure_tier_gate.get("proofCommands", [])
            if row.get("id") != command_id
        ]
    if "closureTierRemoveValidator" in mutation:
        validator_id = mutation["closureTierRemoveValidator"].get("id")
        usf133_closure_tier_gate["validators"] = [
            row for row in usf133_closure_tier_gate.get("validators", [])
            if row.get("id") != validator_id
        ]
    overrides["matrix"] = matrix
    overrides["composeClosureMatrix"] = compose_closure_matrix
    overrides["usf133ClosureTierGate"] = usf133_closure_tier_gate
    overrides["composeParityMatrix"] = compose_parity_matrix
    overrides["composeCatalogue"] = compose_catalogue
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
        overrides = apply_mutation(base, fixture.get("mutation", {}))
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
