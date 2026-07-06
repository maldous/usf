#!/usr/bin/env python3
"""USF bootstrap-readiness validator.

This is governance tooling only. It does not create implementation/runtime files,
does not import source lineage, and does not publish evidence. It checks the
bootstrap-specific invariants that sit above the general spec corpus validator:
the implementation directive may be human-signed and accepted for USF-100 while
the separate USF-39 start stays unauthorised, readiness
documents must distinguish bootstrap marker readiness from implementation
readiness, implementation-shaped roots must not exist before bootstrap, and the
semantic/source-use substrate required for a later implementation attempt must
be present.
"""
import argparse
import copy
import hashlib
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
    "USF-BOOTSTRAP-001": ("blocking", "required bootstrap artefact is missing"),
    "USF-BOOTSTRAP-002": ("blocking", "forbidden implementation/root scaffold exists before bootstrap"),
    "USF-BOOTSTRAP-003": ("blocking", "implementation directive is accepted/signed or lacks human-only boundary"),
    "USF-BOOTSTRAP-004": ("blocking", "readiness artefact overclaims implementation or production readiness"),
    "USF-BOOTSTRAP-005": ("blocking", "whole-platform semantic/source-use bootstrap substrate is missing"),
    "USF-BOOTSTRAP-006": ("blocking", "current main commit lacks a published proof-anchor tag"),
    "USF-BOOTSTRAP-007": ("blocking", "bootstrap validator is not wired into validate-spec"),
    "USF-BOOTSTRAP-008": ("blocking", "bootstrap mapping corpus is incomplete or invalid"),
    "USF-BOOTSTRAP-009": ("blocking", "generated bootstrap mapping index or summary is stale"),
    "USF-BOOTSTRAP-010": ("blocking", "bootstrap readiness governance decision coverage is incomplete"),
    "USF-BOOTSTRAP-011": ("blocking", "bootstrap readiness ADR coverage is incomplete"),
    "USF-BOOTSTRAP-012": ("blocking", "authentication proof runner is not consolidated into bootstrap validator"),
    "USF-BOOTSTRAP-013": ("blocking", "bootstrap mapping proof/readiness posture coverage is incomplete"),
    "USF-BOOTSTRAP-014": ("blocking", "bootstrap readiness marker support is incomplete"),
    "USF-BOOTSTRAP-015": ("blocking", "bootstrap runtime/toolchain decision coverage is incomplete"),
    "USF-BOOTSTRAP-SELFTEST": ("blocking", "planted bootstrap defect did not raise its expected rule"),
}

REQUIRED_ARTEFACTS = [
    "docs/architecture/implementation-extraction-directive.md",
    "docs/architecture/foundation-completeness-audit.md",
    "docs/architecture/complete-readiness-blocker-register.md",
    "docs/architecture/final-v2-readiness-reconciliation.md",
    "docs/architecture/bootstrap-readiness-governance.md",
    "docs/adr/0009-bootstrap-readiness-marker-and-dev-test-boundary.md",
    "docs/architecture/target-implementation-topology-plan.md",
    "docs/architecture/semantic-source-use-closure-ledger.md",
    "spec/registries/source-import-manifest.json",
    "spec/schemas/bootstrap-mapping.schema.json",
    "spec/registries/bootstrap-mapping-index.json",
    "evidence/generated-reports/bootstrap-mapping-summary.md",
    "tools/validate-spec/validate-spec.py",
    ".github/workflows/proof-anchor.yml",
]

READINESS_DOCS = [
    "docs/architecture/complete-readiness-blocker-register.md",
    "docs/architecture/final-v2-readiness-reconciliation.md",
    "docs/architecture/implementation-extraction-directive.md",
]

FORBIDDEN_ROOTS = {
    "apps",
    "packages",
    "services",
    "src",
    "config",
    "infra",
    "scripts",
    "capabilities",
    "adapters",
    "tests",
}

DIRECTIVE_PATH = "docs/architecture/implementation-extraction-directive.md"
VALIDATE_SPEC_PATH = "tools/validate-spec/validate-spec.py"
SELFTEST_DIR = "tools/validate-bootstrap/planted-defects"
BOOTSTRAP_GOVERNANCE_PATH = "docs/architecture/bootstrap-readiness-governance.md"
BOOTSTRAP_ADR_PATH = "docs/adr/0009-bootstrap-readiness-marker-and-dev-test-boundary.md"
BOOTSTRAP_MAPPING_SCHEMA = "spec/schemas/bootstrap-mapping.schema.json"
BOOTSTRAP_MAPPING_DIR = "spec/instances/bootstrap-mapping"
BOOTSTRAP_MAPPING_INDEX = "spec/registries/bootstrap-mapping-index.json"
BOOTSTRAP_MAPPING_SUMMARY = "evidence/generated-reports/bootstrap-mapping-summary.md"
AUTH_PROOF_PATH = "evidence/proof-evidence/authentication-slice-proof.json"
AUTH_RUNTIME_ENVELOPE_PATH = "evidence/evidence-envelope/authentication-slice-proof.json"
AUTH_LINEAGE_ENVELOPE_PATH = "evidence/evidence-envelope/authentication-slice-proof-lineage.json"
OBSOLETE_STANDALONE_AUTH_PROOF_PATH = "tools/prove-authentication-slice.py"

AUTH_INSTANCE_PATHS = {
    "command": "spec/instances/command/authentication-slice-proof.json",
    "semantic": "spec/instances/semantic-contract/authentication-platform.json",
    "interface": "spec/instances/interface-contract/authentication-login-api.json",
    "event": "spec/instances/event-contract/authentication-login-audit.json",
    "workflow": "spec/instances/workflow/authentication-login.json",
    "provider": "spec/instances/provider-mode/mock-identity-provider.json",
    "environment": "spec/instances/environment/hermetic.json",
    "audit": "spec/instances/audit-event/authentication-login.json",
    "observability": "spec/instances/observability-signal/authentication-login-audit.json",
}

AUTH_GOVERNANCE_INPUTS = [
    "docs/architecture/production-proof-posture-matrix.md",
    "docs/architecture/proof-and-evidence-pipeline-plan.md",
    "docs/architecture/authentication-slice-source-use-disposition-matrix.md",
    "docs/architecture/proof-execution-substrate-authorization.md",
    "docs/architecture/foundation-artefact-reuse-assessment.md",
]

AUTH_HISTORICAL_INPUTS = [
    "apps/platform-api/scripts/auth-settings-runtime-proof.ts",
    "apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts",
    "apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts",
    "apps/platform-api/tests/substrate/auth-routes.test.ts",
]

REQUIRED_MAPPING_PROOF_POSTURES = [
    {
        "label": "local hermetic behaviour proof before implementation claim",
        "environment": "local",
        "providerMode": "hermetic-mock",
        "proofLevel": "behaviour-proven",
        "status": "required-before-implementation-claim",
    },
    {
        "label": "integration composed provider proof before test readiness claim",
        "environment": "integration",
        "providerMode": "local-composed-real-service",
        "proofLevel": "substrate-proven",
        "status": "required-before-test-readiness-claim",
    },
    {
        "label": "staging live-provider proof explicitly deferred",
        "environment": "staging",
        "providerMode": "live-external-provider",
        "proofLevel": "not-claimed",
        "status": "deferred-not-bootstrap-readiness",
    },
    {
        "label": "production-live proof explicitly deferred",
        "environment": "production-live",
        "providerMode": "live-external-provider",
        "proofLevel": "not-claimed",
        "status": "deferred-not-bootstrap-readiness",
    },
]

REQUIRED_MAPPING_DEFERRAL_SCOPES = {
    "implementation-start",
    "staging-production-live-proof",
}

REQUIRED_MAPPING_BLOCKER_SCOPES = {
    "pre-file-implementation-gate",
}

POST_START_ALLOWED_ROOTS = {
    "apps",
    "capabilities",
    "adapters",
    "packages",
    "tests",
}

START_RECORD_DIRS = ["docs/architecture"]
START_RECORD_NAME = "bootstrap-start.json"

REQUIRED_TOOLCHAIN_GOVERNANCE_MARKERS = [
    ("target runtime is modern typescript/node", "target runtime is fixed to TypeScript/Node"),
    ("modern active lts node", "modern active LTS Node is recorded"),
    ("pnpm workspaces", "pnpm workspace decision is recorded"),
    ("native esm", "native ESM decision is recorded"),
    ("strict typescript", "strict TypeScript decision is recorded"),
    ("fastify", "Fastify API adapter decision is recorded"),
    ("openapi", "OpenAPI contract decision is recorded"),
    ("typebox", "TypeBox validation decision is recorded"),
    ("kysely", "Kysely data-access decision is recorded"),
    ("toolchain decisions", "toolchain decision section is recorded"),
]

OPEN_RUNTIME_DIRECTIVE_PHRASES = [
    "implementation language and runtime remain an open decision",
    "language and runtime remain an open decision",
    "assumes no specific target language",
    "fixing the v2 implementation language",
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


def repo_paths():
    paths = set()
    for base, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in {".git", ".codex", "__pycache__"}]
        for name in files:
            paths.add(os.path.join(base, name).replace("\\", "/").removeprefix("./"))
    return paths


def bootstrap_start_records():
    records = []
    for start_record_dir in START_RECORD_DIRS:
        if not os.path.isdir(start_record_dir):
            continue
        for base, dirs, files in os.walk(start_record_dir):
            dirs[:] = [d for d in dirs if d != "__pycache__"]
            if START_RECORD_NAME not in files:
                continue
            path = os.path.join(base, START_RECORD_NAME).replace("\\", "/").removeprefix("./")
            try:
                records.append({"path": path, "record": read_json(path)})
            except Exception as exc:
                records.append({"path": path, "error": str(exc)})
    return records


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")


def git_value(*args):
    completed = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        return None
    return completed.stdout.strip()


def current_branch():
    return git_value("branch", "--show-current") or ""


def current_head():
    return git_value("rev-parse", "HEAD") or ""


def remote_main_head():
    return git_value("rev-parse", "origin/main") or ""


def v2_bootstrap_target():
    return git_value("rev-parse", "v2-bootstrap^{}") or ""


def remote_has_tag(tag):
    completed = subprocess.run(
        ["git", "ls-remote", "--tags", "origin", f"refs/tags/{tag}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        return False
    return f"refs/tags/{tag}" in completed.stdout


def is_ancestor(ancestor, descendant):
    if not ancestor or not descendant:
        return False
    completed = subprocess.run(
        ["git", "merge-base", "--is-ancestor", ancestor, descendant],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return completed.returncode == 0


def build_state(overrides=None):
    overrides = overrides or {}
    paths = set(overrides.get("paths", repo_paths()))
    directive_text = overrides.get("directiveText")
    if directive_text is None and DIRECTIVE_PATH in paths:
        directive_text = read_text(DIRECTIVE_PATH)
    readiness_texts = {}
    for path in READINESS_DOCS:
        if path in overrides.get("readinessTexts", {}):
            readiness_texts[path] = overrides["readinessTexts"][path]
        elif path in paths:
            readiness_texts[path] = read_text(path)
    semantic_contracts = sorted(p for p in paths if p.startswith("spec/instances/semantic-contract/") and p.endswith(".json"))
    semantic_records = {}
    semantic_domains = set()
    for path in semantic_contracts:
        if path not in paths or not os.path.exists(path):
            continue
        try:
            record = read_json(path)
            domain = record.get("capabilityDomain")
        except Exception:
            record = None
            domain = None
        if isinstance(record, dict) and isinstance(record.get("id"), str):
            semantic_records[record["id"]] = {
                "path": path,
                "capabilityDomain": record.get("capabilityDomain"),
                "sourceRefs": sorted(record.get("sourceRefs", [])),
            }
        if domain:
            semantic_domains.add(domain)
    source_manifests = sorted(p for p in paths if p.startswith("spec/registries/") and p.endswith("source-import-manifest.json"))
    mapping_paths = sorted(p for p in paths if p.startswith(f"{BOOTSTRAP_MAPPING_DIR}/") and p.endswith(".json"))
    bootstrap_mappings = {}
    for path in mapping_paths:
        if path not in paths or not os.path.exists(path):
            continue
        try:
            bootstrap_mappings[path] = read_json(path)
        except Exception as exc:
            bootstrap_mappings[path] = {"__loadError": str(exc)}
    mapping_index = None
    if BOOTSTRAP_MAPPING_INDEX in paths and os.path.exists(BOOTSTRAP_MAPPING_INDEX):
        try:
            mapping_index = read_json(BOOTSTRAP_MAPPING_INDEX)
        except Exception as exc:
            mapping_index = {"__loadError": str(exc)}
    mapping_summary = None
    if BOOTSTRAP_MAPPING_SUMMARY in paths and os.path.exists(BOOTSTRAP_MAPPING_SUMMARY):
        mapping_summary = read_text(BOOTSTRAP_MAPPING_SUMMARY)
    bootstrap_governance_text = overrides.get("bootstrapGovernanceText")
    if bootstrap_governance_text is None and BOOTSTRAP_GOVERNANCE_PATH in paths and os.path.exists(BOOTSTRAP_GOVERNANCE_PATH):
        bootstrap_governance_text = read_text(BOOTSTRAP_GOVERNANCE_PATH)
    bootstrap_adr_text = overrides.get("bootstrapAdrText")
    if bootstrap_adr_text is None and BOOTSTRAP_ADR_PATH in paths and os.path.exists(BOOTSTRAP_ADR_PATH):
        bootstrap_adr_text = read_text(BOOTSTRAP_ADR_PATH)
    return {
        "paths": paths,
        "startRecords": overrides.get("startRecords", bootstrap_start_records()),
        "currentHead": overrides.get("currentHead", current_head()),
        "v2BootstrapTarget": overrides.get("v2BootstrapTarget", v2_bootstrap_target()),
        "directiveText": directive_text or "",
        "readinessTexts": readiness_texts,
        "bootstrapGovernanceText": bootstrap_governance_text or "",
        "bootstrapAdrText": bootstrap_adr_text or "",
        "semanticContracts": overrides.get("semanticContracts", semantic_contracts),
        "semanticRecords": overrides.get("semanticRecords", semantic_records),
        "semanticDomains": overrides.get("semanticDomains", sorted(semantic_domains)),
        "sourceManifests": overrides.get("sourceManifests", source_manifests),
        "bootstrapMappings": overrides.get("bootstrapMappings", bootstrap_mappings),
        "mappingIndex": overrides.get("mappingIndex", mapping_index),
        "mappingSummary": overrides.get("mappingSummary", mapping_summary),
    }


def check_required_artefacts(F, state):
    for path in REQUIRED_ARTEFACTS:
        if path not in state["paths"]:
            F.add("USF-BOOTSTRAP-001", path)


def check_no_forbidden_roots(F, state):
    roots = {path.split("/", 1)[0] for path in state["paths"]}
    forbidden_roots = roots & FORBIDDEN_ROOTS
    if not forbidden_roots:
        return
    start_errors = []
    valid_start = False
    for item in state.get("startRecords", []):
        path = item.get("path", START_RECORD_NAME)
        record = item.get("record")
        if item.get("error"):
            start_errors.append(f"{path}: cannot parse start record: {item['error']}")
            continue
        if not isinstance(record, dict):
            start_errors.append(f"{path}: start record is not an object")
            continue
        expected = {
            "kind": "usf-39-bootstrap-start",
            "issue": "USF-39",
            "authorisingHuman": "Matthew Aldous",
            "finalPreExtractionRevalidation": "passed",
            "scope": "local-dev-test-bootstrap",
        }
        missing = [key for key, value in expected.items() if record.get(key) != value]
        if missing:
            start_errors.append(f"{path}: invalid start record fields {missing}")
            continue
        start_commit = record.get("startCommit")
        marker_target = record.get("v2BootstrapTarget")
        current_head = state.get("currentHead")
        git_marker_target = state.get("v2BootstrapTarget")
        if start_commit != marker_target:
            start_errors.append(f"{path}: startCommit does not match recorded v2BootstrapTarget")
            continue
        if not git_marker_target:
            start_errors.append(f"{path}: git v2-bootstrap target is unavailable")
            continue
        if marker_target != git_marker_target and not is_ancestor(marker_target, git_marker_target):
            start_errors.append(f"{path}: git v2-bootstrap target does not descend from recorded v2BootstrapTarget")
            continue
        if current_head != start_commit and not is_ancestor(start_commit, current_head):
            start_errors.append(f"{path}: HEAD does not descend from startCommit")
            continue
        linear = record.get("linear")
        if not isinstance(linear, dict) or linear.get("team") != "USF" or linear.get("usf39Status") != "In Progress":
            start_errors.append(f"{path}: missing Linear USF start evidence")
            continue
        if not linear.get("usf39CommentId") or not linear.get("usf100CommentId"):
            start_errors.append(f"{path}: missing Linear comment evidence")
            continue
        valid_start = True
        break
    if not valid_start:
        detail = "; ".join(start_errors) if start_errors else "no valid USF-39 bootstrap start record exists"
        for root in sorted(forbidden_roots):
            F.add("USF-BOOTSTRAP-002", root, f"implementation-shaped root exists before bootstrap: {detail}")
        return
    for root in sorted(forbidden_roots - POST_START_ALLOWED_ROOTS):
        F.add("USF-BOOTSTRAP-002", root, "implementation-shaped root is outside the post-start local dev/test bootstrap topology")


def check_directive_boundary(F, state):
    text = state["directiveText"]
    lower = text.lower()
    # USF-100 may now be human-signed and accepted. The boundary that must hold is the separation of
    # USF-100 acceptance from USF-39 start: the signature accepts USF-100 only and must not start
    # USF-39, act as implementation authority by itself, authorise runtime/scaffold before the
    # separate start action, or treat the final pre-extraction revalidation as already satisfied.
    required_phrases = [
        "human-only acceptance boundary",
        "usf-39 remains backlog",
        "separate usf-39 start action",
        "final pre-extraction revalidation",
    ]
    for phrase in required_phrases:
        if phrase not in lower:
            F.add("USF-BOOTSTRAP-003", DIRECTIVE_PATH, f"missing required directive boundary phrase: {phrase}")
    # Fail closed if the directive treats the signature as USF-39 start or implementation authority,
    # marks the separate start action as authorised, or claims the final revalidation already passed.
    forbidden_assertions = [
        "separate usf-39 start action authorised | authorised",
        "separate usf-39 start action authorised | yes",
        "final pre-extraction revalidation passed | yes",
        "final pre-extraction revalidation passed | passed",
        "revalidation already passed",
        "this signature authorises the usf-39 start",
        "this signature starts usf-39",
        "this signature is implementation authority",
        "this signature creates implementation authority",
        "implementation is authorised by this signature alone",
        "runtime scaffold is authorised before",
        "implementation roots are authorised before",
        "usf-39 has started",
        "usf-39 is now started",
        "usf-39 start is authorised by this directive",
    ]
    for marker in forbidden_assertions:
        if marker in lower:
            F.add("USF-BOOTSTRAP-003", DIRECTIVE_PATH, f"directive treats the signature as USF-39 start or implementation authority: {marker}")
    # A signed acceptance block must keep the separate USF-39 start action explicitly not authorised.
    if "acceptance signature block" in lower and "start action authorised" in lower:
        if "not authorised by this signature" not in lower:
            F.add("USF-BOOTSTRAP-003", DIRECTIVE_PATH, "signed acceptance block must keep the separate USF-39 start action explicitly not authorised")


def check_runtime_toolchain_decisions(F, state):
    governance_lower = state["bootstrapGovernanceText"].lower()
    for marker, message in REQUIRED_TOOLCHAIN_GOVERNANCE_MARKERS:
        if marker not in governance_lower:
            F.add("USF-BOOTSTRAP-015", BOOTSTRAP_GOVERNANCE_PATH, f"missing runtime/toolchain marker: {message}")

    directive_lower = state["directiveText"].lower()
    if "target runtime is modern typescript/node as recorded in bootstrap governance" not in directive_lower:
        F.add("USF-BOOTSTRAP-015", DIRECTIVE_PATH, "implementation directive does not bind runtime target to bootstrap governance")
    for phrase in OPEN_RUNTIME_DIRECTIVE_PHRASES:
        if phrase in directive_lower:
            F.add("USF-BOOTSTRAP-015", DIRECTIVE_PATH, f"directive reopens runtime/language decision: {phrase}")


def check_readiness_boundary(F, state):
    for path, text in state["readinessTexts"].items():
        lower = text.lower()
        if "usf-39 remains backlog" not in lower:
            F.add("USF-BOOTSTRAP-004", path, "readiness document does not preserve USF-39 Backlog state")
        if path != DIRECTIVE_PATH and "no-go" not in lower:
            F.add("USF-BOOTSTRAP-004", path, "readiness document does not preserve implementation NO-GO classification")
        if path != DIRECTIVE_PATH and "ready_for_v2_bootstrap" not in lower:
            F.add("USF-BOOTSTRAP-014", path, "readiness document does not record bootstrap marker readiness")
        if path != DIRECTIVE_PATH and "bootstrap marker readiness" not in lower:
            F.add("USF-BOOTSTRAP-014", path, "readiness document does not distinguish bootstrap marker readiness")
        forbidden_claims = [
            "production-live readiness is complete",
            "live-external-provider readiness is complete",
            "complete one-pass implementation readiness is go",
            "ready to start usf-39",
        ]
        for claim in forbidden_claims:
            if claim in lower:
                F.add("USF-BOOTSTRAP-004", path, f"forbidden readiness overclaim: {claim}")


def check_mapping_substrate(F, state):
    if not state["semanticContracts"]:
        F.add("USF-BOOTSTRAP-005", "spec/instances/semantic-contract", "no semantic contract instances found")
    if not state["semanticDomains"]:
        F.add("USF-BOOTSTRAP-005", "spec/instances/semantic-contract", "no semantic capability domains found")
    if not state["sourceManifests"]:
        F.add("USF-BOOTSTRAP-005", "spec/registries", "no source import manifest found")
    if "docs/architecture/capability-source-coverage-matrix.md" not in state["paths"]:
        F.add("USF-BOOTSTRAP-005", "docs/architecture/capability-source-coverage-matrix.md")
    directive_lower = state["directiveText"].lower()
    scope_markers = ["whole-platform", "all slices", "semantic-contract corpus"]
    for marker in scope_markers:
        if marker not in directive_lower:
            F.add("USF-BOOTSTRAP-005", DIRECTIVE_PATH, f"missing all-slices bootstrap scope marker: {marker}")
    for domain in state["semanticDomains"]:
        if domain.lower() not in directive_lower:
            F.add("USF-BOOTSTRAP-005", DIRECTIVE_PATH, f"semantic capability domain missing from directive: {domain}")


def check_anchor_for_current_main(F):
    head = current_head()
    if not head:
        return
    if current_branch() != "main" or remote_main_head() != head:
        return
    tag = f"proof-anchor-{head[:7]}"
    if not remote_has_tag(tag):
        F.add("USF-BOOTSTRAP-006", tag, "origin does not expose proof-anchor tag for current main")


def check_validate_spec_wiring(F, state):
    if VALIDATE_SPEC_PATH not in state["paths"]:
        return
    text = read_text(VALIDATE_SPEC_PATH)
    for needle in ["bootstrap", "tools/validate-bootstrap/validate-bootstrap.py"]:
        if needle not in text:
            F.add("USF-BOOTSTRAP-007", VALIDATE_SPEC_PATH, f"missing validate-spec bootstrap wiring token: {needle}")


def check_authentication_proof_runner_consolidated(F, state):
    if OBSOLETE_STANDALONE_AUTH_PROOF_PATH in state["paths"]:
        F.add(
            "USF-BOOTSTRAP-012",
            OBSOLETE_STANDALONE_AUTH_PROOF_PATH,
            "authentication slice proof must remain a proof-authentication-slice mode of tools/validate-bootstrap/validate-bootstrap.py",
        )
    if not os.path.exists(__file__):
        return
    text = read_text(__file__)
    for needle in ["proof-authentication-slice", "run_authentication_proof"]:
        if needle not in text:
            F.add("USF-BOOTSTRAP-012", "tools/validate-bootstrap/validate-bootstrap.py", f"missing integrated proof runner token: {needle}")


def has_matching_proof_posture(gates, required):
    for gate in gates:
        if not isinstance(gate, dict):
            continue
        if all(gate.get(key) == value for key, value in required.items() if key != "label"):
            return True
    return False


def check_mapping_posture_coverage(F, path, record):
    gates = record.get("expectedProofGates", [])
    if not isinstance(gates, list):
        F.add("USF-BOOTSTRAP-013", path, "expectedProofGates is not an array")
        gates = []
    for required in REQUIRED_MAPPING_PROOF_POSTURES:
        if not has_matching_proof_posture(gates, required):
            F.add("USF-BOOTSTRAP-013", path, f"missing required proof posture: {required['label']}")

    deferral_scopes = {
        item.get("scope")
        for item in record.get("deferrals", [])
        if isinstance(item, dict) and isinstance(item.get("scope"), str)
    }
    missing_deferrals = sorted(REQUIRED_MAPPING_DEFERRAL_SCOPES - deferral_scopes)
    if missing_deferrals:
        F.add("USF-BOOTSTRAP-013", path, f"missing required deferral scopes: {missing_deferrals}")

    blocker_scopes = {
        item.get("scope")
        for item in record.get("blockers", [])
        if isinstance(item, dict) and isinstance(item.get("scope"), str)
    }
    missing_blockers = sorted(REQUIRED_MAPPING_BLOCKER_SCOPES - blocker_scopes)
    if missing_blockers:
        F.add("USF-BOOTSTRAP-013", path, f"missing required blocker scopes: {missing_blockers}")


def mapping_digest(record):
    canonical = json.dumps(record, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def expected_mapping_index(state):
    mappings = []
    for path, record in sorted(state["bootstrapMappings"].items()):
        if not isinstance(record, dict) or "__loadError" in record:
            continue
        mappings.append(
            {
                "path": path,
                "id": record.get("id"),
                "semanticContractRef": record.get("semanticContractRef"),
                "capabilityDomain": record.get("capabilityDomain"),
                "mappingStatus": record.get("mappingStatus"),
                "blockerCount": len(record.get("blockers", [])),
                "deferralCount": len(record.get("deferrals", [])),
                "persistentObjectExpectationCount": len(record.get("persistentObjectExpectations", [])),
                "sha256": mapping_digest(record),
            }
        )
    domain_counts = {}
    for item in mappings:
        domain = item["capabilityDomain"]
        domain_counts[domain] = domain_counts.get(domain, 0) + 1
    return {
        "id": "generated.bootstrap-mapping-index",
        "title": "Generated Bootstrap Mapping Index",
        "description": "Generated review-only aggregate index for bootstrap mappings. The canonical authority is the per-contract JSON mapping corpus under spec/instances/bootstrap-mapping/.",
        "generatedFrom": [
            "spec/instances/bootstrap-mapping",
            "spec/instances/semantic-contract",
            "tools/validate-bootstrap/validate-bootstrap.py",
        ],
        "authorityNote": "Review-only generated aggregate. Do not treat as semantic authority over the per-contract mappings.",
        "mappingCount": len(mappings),
        "semanticContractCount": len(state["semanticRecords"]),
        "domainCounts": dict(sorted(domain_counts.items())),
        "mappings": sorted(mappings, key=lambda item: (item["capabilityDomain"], item["semanticContractRef"])),
    }


def expected_mapping_summary(state):
    index = expected_mapping_index(state)
    lines = [
        "# Bootstrap Mapping Summary",
        "",
        "| | |",
        "|---|---|",
        "| Document type | Generated review summary |",
        "| Authority | Review-only generated report; per-contract JSON mappings are authoritative |",
        "| Source | `spec/instances/bootstrap-mapping/` |",
        f"| Mapping count | {index['mappingCount']} |",
        "",
        "This generated Markdown summary is for human review only. It does not define USF semantic authority, does not start USF-39, does not create implementation paths, and does not claim staging, production, live-external-provider, or production-live readiness.",
        "",
        "## Domain Counts",
        "",
        "| Capability domain | Mappings |",
        "|---|---:|",
    ]
    for domain, count in index["domainCounts"].items():
        lines.append(f"| `{domain}` | {count} |")
    lines.extend(
        [
            "",
            "## Mapping Inventory",
            "",
            "| Semantic contract | Domain | Mapping status | Blockers | Deferrals | Persistent object expectations |",
            "|---|---|---|---:|---:|---:|",
        ]
    )
    for item in index["mappings"]:
        lines.append(
            "| `%s` | `%s` | `%s` | %d | %d | %d |"
            % (
                item["semanticContractRef"],
                item["capabilityDomain"],
                item["mappingStatus"],
                item["blockerCount"],
                item["deferralCount"],
                item["persistentObjectExpectationCount"],
            )
        )
    lines.append("")
    return "\n".join(lines)


def check_bootstrap_mappings(F, state):
    schema = None
    if BOOTSTRAP_MAPPING_SCHEMA not in state["paths"]:
        F.add("USF-BOOTSTRAP-008", BOOTSTRAP_MAPPING_SCHEMA, "bootstrap mapping schema is missing")
    elif Draft202012Validator is None:
        F.add("USF-BOOTSTRAP-008", BOOTSTRAP_MAPPING_SCHEMA, "jsonschema is not available for mapping validation")
    else:
        try:
            schema = read_json(BOOTSTRAP_MAPPING_SCHEMA)
        except Exception as exc:
            F.add("USF-BOOTSTRAP-008", BOOTSTRAP_MAPPING_SCHEMA, f"cannot read mapping schema: {exc}")

    if not state["bootstrapMappings"]:
        F.add("USF-BOOTSTRAP-008", BOOTSTRAP_MAPPING_DIR, "no bootstrap mapping records found")

    mapping_refs = {}
    for path, record in sorted(state["bootstrapMappings"].items()):
        if not isinstance(record, dict):
            F.add("USF-BOOTSTRAP-008", path, "mapping record is not an object")
            continue
        if "__loadError" in record:
            F.add("USF-BOOTSTRAP-008", path, f"cannot parse mapping JSON: {record['__loadError']}")
            continue
        if schema and Draft202012Validator is not None:
            for err in Draft202012Validator(schema).iter_errors(record):
                F.add("USF-BOOTSTRAP-008", path, err.message[:160])
        ref = record.get("semanticContractRef")
        if isinstance(ref, str):
            mapping_refs.setdefault(ref, []).append(path)
        if ref not in state["semanticRecords"]:
            F.add("USF-BOOTSTRAP-008", path, f"mapping references unknown semantic contract: {ref}")
        else:
            semantic = state["semanticRecords"][ref]
            if record.get("capabilityDomain") != semantic.get("capabilityDomain"):
                F.add("USF-BOOTSTRAP-008", path, "mapping capabilityDomain differs from semantic contract")
            missing_source = sorted(set(semantic.get("sourceRefs", [])) - set(record.get("sourceRefs", [])))
            if missing_source:
                F.add("USF-BOOTSTRAP-008", path, f"mapping omits semantic sourceRefs: {missing_source[:5]}")
        check_mapping_posture_coverage(F, path, record)
        for gate in record.get("expectedProofGates", []):
            if not isinstance(gate, dict):
                continue
            gate_text = " ".join(str(gate.get(key, "")).lower() for key in ("environment", "providerMode"))
            if any(token in gate_text for token in ("staging", "production", "live-external-provider")):
                if not str(gate.get("status", "")).startswith("deferred"):
                    F.add("USF-BOOTSTRAP-008", path, "staging/production/live proof gate is not explicitly deferred")
                if gate.get("proofLevel") != "not-claimed":
                    F.add("USF-BOOTSTRAP-008", path, "staging/production/live proof gate claims a proof level")
        for expectation in record.get("persistentObjectExpectations", []):
            if isinstance(expectation, dict) and not expectation.get("classification"):
                F.add("USF-BOOTSTRAP-008", path, "persistent object expectation lacks classification")

    for ref in sorted(state["semanticRecords"]):
        paths = mapping_refs.get(ref, [])
        if not paths:
            F.add("USF-BOOTSTRAP-008", ref, "semantic contract has no bootstrap mapping")
        elif len(paths) > 1:
            F.add("USF-BOOTSTRAP-008", ref, f"semantic contract has multiple bootstrap mappings: {paths}")
    for ref, paths in sorted(mapping_refs.items()):
        if len(paths) > 1:
            F.add("USF-BOOTSTRAP-008", ref, f"duplicate bootstrap mappings: {paths}")

    if state["mappingIndex"] != expected_mapping_index(state):
        F.add("USF-BOOTSTRAP-009", BOOTSTRAP_MAPPING_INDEX, "generated mapping index is stale or missing")
    if state["mappingSummary"] != expected_mapping_summary(state):
        F.add("USF-BOOTSTRAP-009", BOOTSTRAP_MAPPING_SUMMARY, "generated mapping summary is stale or missing")


def check_bootstrap_governance(F, state):
    if BOOTSTRAP_GOVERNANCE_PATH not in state["paths"]:
        F.add("USF-BOOTSTRAP-010", BOOTSTRAP_GOVERNANCE_PATH, "bootstrap readiness governance record is missing")
        return
    text = state["bootstrapGovernanceText"]
    lower = text.lower()
    required_markers = [
        ("v2-bootstrap", "future bootstrap marker is named"),
        ("ready_for_v2_bootstrap", "bootstrap marker readiness verdict is stated"),
        ("bootstrap marker readiness", "bootstrap readiness is distinguished from implementation readiness"),
        ("movable human-friendly marker", "marker mobility and human-friendly role are stated"),
        ("not production readiness", "marker does not claim production readiness"),
        ("not implementation completion", "marker does not claim implementation completion"),
        ("not usf-39 start authority", "marker does not authorise USF-39"),
        ("immutable proof/evidence anchors", "immutable anchor requirement is stated"),
        ("usf-39 remains backlog", "USF-39 Backlog boundary is stated"),
        ("separate usf-39 start action", "separate implementation start action is required"),
        ("all slices", "bootstrap scope is whole-platform/all-slices"),
        ("token-first tenant context", "tenant context source is stated"),
        ("postgres rls", "database-layer RLS requirement is stated"),
        ("set local", "transaction-scoped Postgres context binding is stated"),
        ("current_setting('app.tenant_id')", "RLS tenant context lookup is stated"),
        ("bypassrls", "BYPASSRLS prohibition is stated"),
        ("force row level security", "FORCE RLS requirement is stated"),
        ("tenant-scoped", "persistent object tenant-scoped classification is stated"),
        ("cross-tenant aggregate", "persistent object aggregate classification is stated"),
        ("migration/control-plane", "persistent object migration/control-plane classification is stated"),
        ("two-person jit approval", "break-glass two-person approval is stated"),
        ("requester cannot approve", "break-glass requester/approver separation is stated"),
        ("break-glass must not disable rls", "break-glass RLS boundary is stated"),
        ("in-memory idp", "dev in-memory identity provider target is stated"),
        ("keycloak", "test OIDC provider target is stated"),
        ("nats", "test event bus provider target is stated"),
        ("temporal", "test workflow provider target is stated"),
        ("minio", "test object storage provider target is stated"),
        ("openbao", "test secret/config provider target is stated"),
        ("opentelemetry collector", "test observability collector target is stated"),
        ("prometheus", "test metrics target is stated"),
        ("grafana", "test dashboard target is stated"),
        ("loki", "test log target is stated"),
        ("tempo", "test trace target is stated"),
        ("mailpit", "test email target is stated"),
        ("append-only postgres audit ledger", "canonical audit/evidence store is stated"),
        ("no in-memory providers in test", "dev/test provider split is stated"),
        ("staging, production, live-external-provider, and production-live proof", "non-local proof deferral is stated"),
        ("source final proven schema lineage", "migration lineage source is stated"),
        ("0001", "future baseline migration identity is stated"),
        ("no real tenant, customer, or user data migration", "real-data migration exclusion is stated"),
        ("pnpm lockfile", "lockfile target is stated"),
        ("pin node and pnpm versions", "toolchain pinning is stated"),
        ("target runtime is modern typescript/node", "target TypeScript/Node runtime is stated"),
        ("modern active lts node", "modern active LTS Node is stated"),
        ("pnpm workspaces", "pnpm workspace decision is stated"),
        ("native esm", "native ESM decision is stated"),
        ("strict typescript", "strict TypeScript decision is stated"),
        ("fastify", "Fastify API adapter decision is stated"),
        ("openapi", "OpenAPI contract decision is stated"),
        ("typebox", "TypeBox validation decision is stated"),
        ("kysely", "Kysely data-access decision is stated"),
        ("no floating `latest` images", "floating latest image prohibition is stated"),
        ("make verify", "future verification gate is stated"),
    ]
    for marker, message in required_markers:
        if marker not in lower:
            F.add("USF-BOOTSTRAP-010", BOOTSTRAP_GOVERNANCE_PATH, f"missing bootstrap governance marker: {message}")

    forbidden_claims = [
        ("v2-bootstrap is production readiness", "marker claims production readiness"),
        ("v2-bootstrap is implementation completion", "marker claims implementation completion"),
        ("v2-bootstrap authorises usf-39", "marker claims USF-39 authority"),
        ("complete one-pass implementation readiness is go", "implementation readiness is overclaimed"),
        ("ready to start usf-39", "USF-39 start readiness is overclaimed"),
        ("in-memory providers in test are allowed", "test provider split is weakened"),
        ("break-glass may disable rls", "break-glass RLS boundary is weakened"),
    ]
    for marker, message in forbidden_claims:
        if marker in lower:
            F.add("USF-BOOTSTRAP-010", BOOTSTRAP_GOVERNANCE_PATH, message)


def check_bootstrap_adr(F, state):
    if BOOTSTRAP_ADR_PATH not in state["paths"]:
        F.add("USF-BOOTSTRAP-011", BOOTSTRAP_ADR_PATH, "bootstrap readiness ADR is missing")
        return
    lower = state["bootstrapAdrText"].lower()
    required_markers = [
        ("accepted", "ADR is accepted"),
        ("v2-bootstrap", "marker name is recorded"),
        ("bootstrap readiness", "bootstrap readiness boundary is recorded"),
        ("movable human-friendly marker", "marker role is recorded"),
        ("not production readiness", "production-readiness boundary is recorded"),
        ("not implementation completion", "implementation-completion boundary is recorded"),
        ("not usf-39 start authority", "USF-39 boundary is recorded"),
        ("immutable proof/evidence anchors", "immutable anchor requirement is recorded"),
        ("local dev/test readiness only", "local dev/test scope is recorded"),
        ("dev targets in-memory providers", "dev provider target is recorded"),
        ("test targets docker compose oss providers", "test provider target is recorded"),
        ("staging, production, live-external-provider, deployment, and production-live proof", "deferred stronger proof is recorded"),
        ("usf-39 remains backlog", "USF-39 Backlog boundary is recorded"),
        ("signed usf-100 directive", "signed directive dependency is recorded"),
        ("separate usf-39 start action", "separate start dependency is recorded"),
        ("creates no implementation code", "non-implementation boundary is recorded"),
    ]
    for marker, message in required_markers:
        if marker not in lower:
            F.add("USF-BOOTSTRAP-011", BOOTSTRAP_ADR_PATH, f"missing bootstrap ADR marker: {message}")

    forbidden_claims = [
        ("v2-bootstrap is production readiness", "marker claims production readiness"),
        ("v2-bootstrap is implementation completion", "marker claims implementation completion"),
        ("v2-bootstrap authorises usf-39", "marker claims USF-39 authority"),
        ("v2-bootstrap authorizes usf-39", "marker claims USF-39 authority"),
        ("linear comments define bootstrap authority", "Linear is treated as authority"),
        ("source compose may be copied", "source lineage copying is allowed"),
    ]
    for marker, message in forbidden_claims:
        if marker in lower:
            F.add("USF-BOOTSTRAP-011", BOOTSTRAP_ADR_PATH, message)


def require(condition, label, observed):
    if not condition:
        raise AssertionError(f"{label}: {observed!r}")


def run_authentication_proof_assertions(instances):
    command = instances["command"]
    semantic = instances["semantic"]
    interface = instances["interface"]
    event = instances["event"]
    workflow = instances["workflow"]
    provider = instances["provider"]
    environment = instances["environment"]
    audit = instances["audit"]
    observability = instances["observability"]

    checks = []

    def check(label, condition, observed):
        require(condition, label, observed)
        checks.append(label)

    check("command is proof-only", command.get("commandKind") == "proof-command", command.get("commandKind"))
    check("command emits evidence", command.get("emitsEvidence") is True, command.get("emitsEvidence"))
    check("command includes hermetic scope", "hermetic" in command.get("environmentScope", []), command.get("environmentScope"))

    check("semantic contract is authentication", semantic.get("capabilityDomain") == "authentication", semantic.get("capabilityDomain"))
    check("semantic proof facet complete", semantic.get("facets", {}).get("proof", {}).get("status") == "complete", semantic.get("facets", {}).get("proof"))

    check("interface binds semantic contract", interface.get("semanticContractRef") == semantic["id"], interface.get("semanticContractRef"))
    for field in ("provider-selection", "callback-state-token", "session-cookie", "custom-domain-origin"):
        check(f"interface request carries {field}", field in interface.get("requestContract", {}).get("fields", []), interface.get("requestContract", {}).get("fields"))
    for field in ("authenticated-session", "denied-login", "provider-failure", "no-session"):
        check(f"interface response carries {field}", field in interface.get("responseContract", {}).get("fields", []), interface.get("responseContract", {}).get("fields"))
    check("interface drift detectable", interface.get("driftDetectable") is True, interface.get("driftDetectable"))

    check("event producer is interface", event.get("producer") == interface["id"], event.get("producer"))
    check("event consumer is audit", audit["id"] in event.get("consumers", []), event.get("consumers"))
    check("event is canonical", event.get("canonical") is True, event.get("canonical"))

    participants = workflow.get("participants", [])
    for ref in (interface["id"], provider["id"], audit["id"]):
        check(f"workflow participant {ref}", ref in participants, participants)
    operations = [step.get("operation") for step in workflow.get("steps", [])]
    for ref in (interface["id"], provider["id"], audit["id"]):
        check(f"workflow operation {ref}", ref in operations, operations)
    check("workflow relates audit event", event["id"] in workflow.get("relatedEvents", []), workflow.get("relatedEvents"))
    check("workflow relates interface", interface["id"] in workflow.get("relatedInterfaces", []), workflow.get("relatedInterfaces"))

    check("provider mode is hermetic mock", provider.get("providerMode") == "hermetic-mock", provider.get("providerMode"))
    check("provider environment is hermetic", provider.get("environment") == "hermetic", provider.get("environment"))
    check("provider has no live claim", provider.get("liveExternalProviderClaim") is False, provider.get("liveExternalProviderClaim"))

    check("environment is hermetic", environment.get("environment") == "hermetic", environment.get("environment"))
    check("environment permits hermetic mock", "hermetic-mock" in environment.get("permittedProviderModes", []), environment.get("permittedProviderModes"))
    check("environment has no production live claim", environment.get("productionLiveClaim") is False, environment.get("productionLiveClaim"))

    check("audit is security sensitive", audit.get("securitySensitive") is True, audit.get("securitySensitive"))
    check("audit is state changing", audit.get("stateChanging") is True, audit.get("stateChanging"))
    check("audit related interface", audit.get("relatedInterface") == interface["id"], audit.get("relatedInterface"))
    check("audit related workflow", audit.get("relatedWorkflow") == workflow["id"], audit.get("relatedWorkflow"))

    check("observability source is audit", observability.get("source") == audit["id"], observability.get("source"))
    for attr in ("provider-mode", "request-id", "proof-id", "capability-id"):
        check(f"observability attribute {attr}", attr in observability.get("attributes", []), observability.get("attributes"))

    return checks


def authentication_evidence_refs():
    refs = [str(path) for path in AUTH_INSTANCE_PATHS.values()]
    refs.extend(AUTH_GOVERNANCE_INPUTS)
    refs.append("tools/validate-bootstrap/validate-bootstrap.py")
    return refs


def build_authentication_proof_records(commit, checks):
    runtime_id = "evidence.runtime-proof.authentication-slice-proof"
    lineage_id = "evidence.normalised.authentication-slice-proof-lineage"
    freshness = {"commit": commit, "stale": False}
    source_refs = authentication_evidence_refs()

    runtime_envelope = {
        "id": runtime_id,
        "title": "Runtime evidence envelope for authentication slice proof",
        "description": "Draft runtime-proof evidence envelope emitted by the USF bootstrap validator authentication proof subcommand.",
        "authorityLevel": "runtime-proof-evidence",
        "lifecycleState": "draft",
        "ontologyConcepts": ["Evidence"],
        "taxonomyRefs": ["evidence-classification"],
        "vocabularyRefs": ["evidence-kinds", "provider-modes", "environment-classes"],
        "aiGuidance": "Use only as current hermetic proof-only evidence for the named authentication semantic slice. Do not treat it as implementation extraction, live-provider evidence, or production-live readiness.",
        "evidenceKind": "runtime-proof-evidence",
        "sourceRefs": source_refs,
        "providerMode": "hermetic-mock",
        "environment": "hermetic",
        "freshness": freshness,
    }

    lineage_envelope = {
        "id": lineage_id,
        "title": "Normalised lineage for authentication slice proof",
        "description": "Draft normalised evidence envelope recording the historical source-lineage proof inputs used only as lineage and design input for the USF proof-only harness.",
        "authorityLevel": "runtime-proof-evidence",
        "lifecycleState": "draft",
        "ontologyConcepts": ["Evidence"],
        "taxonomyRefs": ["evidence-classification"],
        "vocabularyRefs": ["evidence-kinds"],
        "aiGuidance": "Historical source-lineage inputs remain lineage only. They were not executed, copied, imported as runtime, or treated as USF live authority.",
        "evidenceKind": "normalised-evidence",
        "sourceRefs": AUTH_HISTORICAL_INPUTS,
    }

    proof = {
        "id": "usf.proof-evidence.authentication-slice-proof",
        "kind": "proof",
        "title": "Authentication slice proof",
        "description": "Draft USF proof-evidence record emitted by the bounded proof-only authentication slice subcommand in the bootstrap validator. It exercises the committed USF authentication login API, audit, workflow, provider-mode, and hermetic environment semantics without creating product runtime or importing source-lineage runtime code.",
        "authorityLevel": "runtime-proof-evidence",
        "lifecycleState": "draft",
        "ontologyConcepts": ["Proof", "Proof Level", "Evidence"],
        "taxonomyRefs": ["proof-classification", "provider-classification", "environment-classification"],
        "vocabularyRefs": ["proof-levels", "provider-modes", "environment-classes", "evidence-kinds"],
        "aiGuidance": "This is hermetic proof-only evidence for the semantic authentication slice. It does not start USF-39, authorise implementation extraction, claim live-external-provider readiness, or claim production-live readiness.",
        "claimExercised": "The bootstrap validator authentication proof subcommand asserted the authentication login API/audit/workflow/provider-mode slice: login request and response semantics, audit event production and consumption, workflow participants and operations, hermetic mock provider mode, hermetic environment constraints, and observability/audit correlation.",
        "proofLevelClaimed": "behaviour-proven",
        "proofLevelObserved": "behaviour-proven",
        "providerMode": "hermetic-mock",
        "environment": "hermetic",
        "liveExternalProviderClaim": False,
        "emittedEvidence": [
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/0",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/1",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/2",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/3",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/4",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/5",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/6",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/7",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/8",
        ],
        "collectedEvidence": [runtime_id, lineage_id],
        "freshness": freshness,
        "failureSemantics": "If any required semantic instance, reference, provider/environment invariant, emitted evidence, collected evidence, or freshness pin is missing or stale, the proof fails closed and must not satisfy readiness. Checks executed: " + "; ".join(checks),
    }

    return proof, runtime_envelope, lineage_envelope


def canonical_json(data):
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def build_authentication_anchor_payload(commit, proof, runtime_envelope, lineage_envelope, signer=None):
    payload = {
        "payloadKind": "proof-freshness-anchor-payload",
        "payloadVersion": "draft-anchor-payload-1",
        "targetCommit": commit,
        "proofId": proof["id"],
        "providerMode": proof["providerMode"],
        "environment": proof["environment"],
        "proofLevelClaimed": proof["proofLevelClaimed"],
        "proofLevelObserved": proof["proofLevelObserved"],
        "liveExternalProviderClaim": proof["liveExternalProviderClaim"],
        "productionLiveClaim": False,
        "freshness": copy.deepcopy(proof["freshness"]),
        "emittedEvidence": copy.deepcopy(proof["emittedEvidence"]),
        "collectedEvidence": copy.deepcopy(proof["collectedEvidence"]),
        "sourceRefs": sorted(set(runtime_envelope.get("sourceRefs", []) + lineage_envelope.get("sourceRefs", []))),
    }
    if signer:
        payload["signerFingerprint"] = signer
    payload["payloadDigest"] = "sha256:" + hashlib.sha256(canonical_json(payload)).hexdigest()
    return payload


def run_authentication_proof(args):
    if args.emit_anchor_payload and args.write:
        raise SystemExit("--emit-anchor-payload is write-free and cannot be combined with --write")
    claim_commit = args.claim_commit or current_head()
    if not claim_commit:
        raise SystemExit("could not resolve current HEAD for authentication proof claim")
    instances = {name: read_json(path) for name, path in AUTH_INSTANCE_PATHS.items()}
    checks = run_authentication_proof_assertions(instances)
    proof, runtime_envelope, lineage_envelope = build_authentication_proof_records(claim_commit, checks)
    anchor_payload = build_authentication_anchor_payload(claim_commit, proof, runtime_envelope, lineage_envelope, signer=args.signer)

    if args.write:
        write_json(AUTH_RUNTIME_ENVELOPE_PATH, runtime_envelope)
        write_json(AUTH_LINEAGE_ENVELOPE_PATH, lineage_envelope)
        write_json(AUTH_PROOF_PATH, proof)

    if args.emit_anchor_payload:
        print(json.dumps(anchor_payload, indent=2, sort_keys=True))
        return

    print(json.dumps({
        "status": "pass",
        "claimCommit": claim_commit,
        "providerMode": "hermetic-mock",
        "environment": "hermetic",
        "proofLevelObserved": "behaviour-proven",
        "liveExternalProviderClaim": False,
        "productionLiveClaim": False,
        "checks": len(checks),
        "wroteEvidence": bool(args.write),
        "anchorPayloadDigest": anchor_payload["payloadDigest"],
    }, indent=2))


def run_checks(modes, F, state=None):
    state = state or build_state()
    if "readiness" in modes:
        check_required_artefacts(F, state)
        check_directive_boundary(F, state)
        check_runtime_toolchain_decisions(F, state)
        check_readiness_boundary(F, state)
        check_mapping_substrate(F, state)
        check_bootstrap_mappings(F, state)
        check_bootstrap_governance(F, state)
        check_bootstrap_adr(F, state)
        check_authentication_proof_runner_consolidated(F, state)
        check_anchor_for_current_main(F)
        check_validate_spec_wiring(F, state)
    if "implementation" in modes:
        check_no_forbidden_roots(F, state)


def load_selftest_fixtures(F):
    fixtures = []
    if not os.path.isdir(SELFTEST_DIR):
        F.add("USF-BOOTSTRAP-SELFTEST", SELFTEST_DIR, "planted defect directory is missing")
        return fixtures
    names = [name for name in sorted(os.listdir(SELFTEST_DIR)) if name.endswith(".json")]
    if not names:
        F.add("USF-BOOTSTRAP-SELFTEST", SELFTEST_DIR, "planted defect directory is empty")
        return fixtures
    for name in names:
        path = f"{SELFTEST_DIR}/{name}"
        try:
            with open(path, encoding="utf-8") as handle:
                fixture = json.load(handle)
            if not isinstance(fixture, dict) or not fixture.get("expectedRule"):
                F.add("USF-BOOTSTRAP-SELFTEST", path, "planted defect is missing expectedRule")
                continue
            fixtures.append((path, fixture))
        except Exception as exc:
            F.add("USF-BOOTSTRAP-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        overrides = {"startRecords": []}
        mutation = fixture.get("mutation", {})
        if mutation.get("removePath"):
            paths = set(base["paths"])
            paths.discard(mutation["removePath"])
            overrides["paths"] = paths
        if mutation.get("addPath"):
            paths = set(overrides.get("paths", base["paths"]))
            paths.add(mutation["addPath"])
            overrides["paths"] = paths
        if "directiveText" in mutation:
            overrides["directiveText"] = mutation["directiveText"]
        if "readinessText" in mutation:
            overrides["readinessTexts"] = {
                "docs/architecture/final-v2-readiness-reconciliation.md": mutation["readinessText"]
            }
        if mutation.get("emptySemanticContracts"):
            overrides["semanticContracts"] = []
            overrides["semanticRecords"] = {}
            overrides["semanticDomains"] = []
        if "semanticDomains" in mutation:
            overrides["semanticDomains"] = mutation["semanticDomains"]
        if mutation.get("removeMappingFor"):
            mappings = dict(base["bootstrapMappings"])
            for mapping_path, record in list(mappings.items()):
                if isinstance(record, dict) and record.get("semanticContractRef") == mutation["removeMappingFor"]:
                    mappings.pop(mapping_path)
            overrides["bootstrapMappings"] = mappings
        if "mappingIndex" in mutation:
            overrides["mappingIndex"] = mutation["mappingIndex"]
        if "mappingSummary" in mutation:
            overrides["mappingSummary"] = mutation["mappingSummary"]
        if "removeProofGate" in mutation:
            target = mutation["removeProofGate"]
            mappings = copy.deepcopy(overrides.get("bootstrapMappings", base["bootstrapMappings"]))
            for mapping_path, record in list(mappings.items()):
                if not isinstance(record, dict):
                    continue
                if record.get("semanticContractRef") != target.get("semanticContractRef"):
                    continue
                record["expectedProofGates"] = [
                    gate
                    for gate in record.get("expectedProofGates", [])
                    if not (
                        isinstance(gate, dict)
                        and all(
                            gate.get(key) == value
                            for key, value in target.items()
                            if key != "semanticContractRef"
                        )
                    )
                ]
            overrides["bootstrapMappings"] = mappings
        if "bootstrapGovernanceText" in mutation:
            overrides["bootstrapGovernanceText"] = mutation["bootstrapGovernanceText"]
        if "removeBootstrapGovernanceText" in mutation:
            overrides["bootstrapGovernanceText"] = base["bootstrapGovernanceText"].replace(
                mutation["removeBootstrapGovernanceText"],
                "",
            )
        if "appendDirectiveText" in mutation:
            overrides["directiveText"] = overrides.get("directiveText", base["directiveText"]) + mutation["appendDirectiveText"]
        if "startRecords" in mutation:
            overrides["startRecords"] = mutation["startRecords"]
        if "currentHead" in mutation:
            overrides["currentHead"] = mutation["currentHead"]
        if "v2BootstrapTarget" in mutation:
            overrides["v2BootstrapTarget"] = mutation["v2BootstrapTarget"]
        if "bootstrapAdrText" in mutation:
            overrides["bootstrapAdrText"] = mutation["bootstrapAdrText"]
        local = Findings()
        run_checks(["readiness", "implementation"], local, build_state(overrides))
        if expected not in {item["ruleId"] for item in local.items}:
            F.add("USF-BOOTSTRAP-SELFTEST", path, f"expected {expected}; got {sorted({item['ruleId'] for item in local.items})}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF bootstrap-readiness validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["readiness", "implementation", "selftest", "all", "proof-authentication-slice"])
    parser.add_argument("--claim-commit", default=None, help="Commit SHA the authentication proof run claims; defaults to HEAD.")
    parser.add_argument("--write", "--write-evidence", action="store_true", help="Write authentication proof evidence records under evidence/.")
    parser.add_argument("--emit-anchor-payload", action="store_true", help="Print deterministic authentication proof anchor payload JSON; writes nothing.")
    parser.add_argument("--signer", default=None, help="Embed this signerFingerprint in the anchor payload.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.mode == "proof-authentication-slice":
        try:
            run_authentication_proof(args)
        except AssertionError as exc:
            print(json.dumps({"status": "fail", "error": str(exc)}, indent=2), file=sys.stderr)
            sys.exit(1)
        return

    F = Findings()
    selftest_state = None
    modes = {
        "readiness": ["readiness"],
        "implementation": ["implementation"],
        "selftest": [],
        "all": ["readiness", "implementation"],
    }[args.mode]
    if modes:
        run_checks(modes, F)
    if args.mode in {"selftest", "all"}:
        selftest_state = run_selftest(F)

    if args.json:
        print(json.dumps({"mode": args.mode, "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(item["ruleId"] for item in F.items))
        suffix = "CLEAN" if not F.items else json.dumps(counts)
        if selftest_state == "not-run":
            suffix += "  (selftest: none present)"
        print(f"USF bootstrap validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
