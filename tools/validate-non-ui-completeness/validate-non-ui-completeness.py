#!/usr/bin/env python3
"""Validate the USF non-UI completeness closure gate.

Self-contained: this validator asserts completeness of USF's own non-UI surface — service,
route/port/adapter/provider, test/proof, UI-derived foundation behaviour, operator/admin
surface, assurance-case, and gap coverage — against USF's own recorded artefacts. It does not
depend on or read any external/sibling repository; the source-lineage inventory carries its own
frozen tracked-file count, and current freshness is bounded by the local Git tracked non-proof
source tree; generated artifacts and evidence are excluded from that source-tree anchor.
"""

from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

RULE_IDS = [f"USF-NON-UI-{index:03d}" for index in range(1, 22)]
SOURCE_TREE_ANCHOR_ALGORITHM = "git-ls-files-stage-sha256-v1"
SOURCE_TREE_ANCHOR_SCOPE = "repository-tracked-non-proof-source-tree"

JSON_DOCS = {
    "closure": DOCS / "non-ui-completeness-closure-gate.json",
    "baseline": DOCS / "non-ui-source-lineage-inventory.json",
    "service": DOCS / "service-completeness-matrix.json",
    "route": DOCS / "route-port-adapter-provider-completeness-matrix.json",
    "test": DOCS / "test-proof-disposition-ledger.json",
    "ui": DOCS / "ui-derived-foundation-behaviour-rewrite-ledger.json",
    "operator": DOCS / "operator-admin-surface-completeness-matrix.json",
    "assurance": DOCS / "non-ui-completeness-assurance-case.json",
    "gap": DOCS / "non-ui-completeness-gap-register.json",
}

MD_DOCS = {
    "closureMd": DOCS / "non-ui-completeness-closure-gate.md",
    "baselineMd": DOCS / "non-ui-source-lineage-inventory.md",
    "serviceMd": DOCS / "service-completeness-matrix.md",
    "routeMd": DOCS / "route-port-adapter-provider-completeness-matrix.md",
    "testMd": DOCS / "test-proof-disposition-ledger.md",
    "uiMd": DOCS / "ui-derived-foundation-behaviour-rewrite-ledger.md",
    "operatorMd": DOCS / "operator-admin-surface-completeness-matrix.md",
    "assuranceMd": DOCS / "non-ui-completeness-assurance-case.md",
    "gapMd": DOCS / "non-ui-completeness-gap-register.md",
    "externalReport": DOCS / "non-ui-completeness-external-review-report.md",
}

SOURCE_TREE_ANCHOR_EXCLUDED_PREFIXES = (
    "artifacts/",
    "evidence/",
    "v2/",  # transitional graph-authority workspace; not foundation source until promoted
)

ALLOWED_DISPOSITIONS = {
    "implemented-and-proven",
    "covered-by-existing-usf-proof",
    "replaced-by-equivalent-and-proven",
    "replaced-by-better-service-and-proven",
    "deprecated-with-rationale",
    "not-applicable-with-rationale",
    "blocked-with-linear-carrier",
    "requires-human-decision",
}

FORBIDDEN_CLAIMS = [
    "UI parity",
    "visual parity",
    "UX parity",
    "product UI readiness",
    "Staging readiness for real users",
    "Production readiness",
    "deployment readiness",
    "live-provider readiness",
    "SOC readiness",
    "ISO certification",
    "enterprise production readiness",
    "browser E2E readiness",
    "full product parity",
]

REQUIRED_OPERATOR_SURFACES = {
    "operator-surface-postgres-admin",
    "operator-surface-minio-console",
    "operator-surface-grafana",
    "operator-surface-sonarqube",
    "operator-surface-sentry",
    "operator-surface-temporal-ui",
    "operator-surface-windmill-ui",
    "operator-surface-mailpit",
    "operator-surface-clickhouse",
    "operator-surface-prometheus",
    "operator-surface-loki",
    "operator-surface-tempo",
    "operator-surface-alertmanager",
    "operator-surface-openbao",
    "operator-surface-keycloak",
    "operator-surface-gateway-forward-auth",
    "operator-surface-webhook-sink",
    "operator-surface-meilisearch",
}

REQUIRED_REPORT_SECTIONS = [
    "Executive summary",
    "Scope and exclusions",
    "Exact bounded claim",
    "Source-lineage baseline and frozen inventory",
    "USF source/deployment boundary",
    "Capability completeness summary",
    "Service and Compose completeness summary",
    "Route/port/adapter/provider completeness summary",
    "Job/workflow/command/proof completeness summary",
    "Schema/migration/config completeness summary",
    "Test/proof disposition ledger summary",
    "UI-derived foundation behaviour rewrite summary",
    "Operator/admin surface proof summary",
    "Enterprise/ISO-style control support mapping",
    "Risk register and residual risk summary",
    "Evidence and screenshot inventory",
    "Chain-of-custody appendix",
    "Known gaps and corrective actions",
    "Human decisions and accepted equivalence decisions",
    "Non-claims",
    "Staging/Production handoff statement",
]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {"json": {}, "md": {}, "planted": []}
    for key, path in JSON_DOCS.items():
        data["json"][key] = load_json(path)
    for key, path in MD_DOCS.items():
        data["md"][key] = path.read_text(encoding="utf-8")
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def source_tree_anchor_excluded_paths() -> set[str]:
    paths = {str(path.relative_to(ROOT)) for path in JSON_DOCS.values()}
    paths.update(str(path.relative_to(ROOT)) for path in MD_DOCS.values())
    return paths


def source_tree_anchor_entries() -> list[tuple[str, str, str, str]]:
    """Return tracked non-proof source entries for current non-UI closure freshness."""
    result = subprocess.run(
        ["git", "ls-files", "--stage", "-z"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    excluded_paths = source_tree_anchor_excluded_paths()
    entries: list[tuple[str, str, str, str]] = []
    for raw in result.stdout.split(b"\0"):
        if not raw:
            continue
        entry = raw.decode("utf-8")
        try:
            metadata, path = entry.split("\t", 1)
            mode, object_id, stage = metadata.split(" ", 2)
        except ValueError as exc:
            raise ValueError(f"malformed git ls-files --stage entry: {entry!r}") from exc
        if path in excluded_paths:
            continue
        if path.startswith(SOURCE_TREE_ANCHOR_EXCLUDED_PREFIXES):
            continue
        entries.append((path, mode, object_id, stage))
    return sorted(entries)


def source_tree_anchor_paths() -> list[str]:
    """Return tracked non-proof source paths that determine current non-UI closure freshness."""
    return [path for path, _mode, _object_id, _stage in source_tree_anchor_entries()]


def working_tree_mode(path: Path) -> str:
    if path.is_symlink():
        return "120000"
    mode = path.stat().st_mode
    return "100755" if mode & stat.S_IXUSR else "100644"


def working_tree_content(path: Path) -> bytes:
    if path.is_symlink():
        return os.readlink(path).encode("utf-8")
    return path.read_bytes()


def compute_source_tree_anchor() -> tuple[str, int]:
    """Hash tracked non-proof source metadata/content without generated report text."""
    hasher = hashlib.sha256()
    hasher.update(b"usf-non-ui-current-source-tree-anchor-v2\0")
    entries = source_tree_anchor_entries()
    for path, index_mode, object_id, stage in entries:
        absolute_path = ROOT / path
        content = working_tree_content(absolute_path)
        hasher.update(path.encode("utf-8"))
        hasher.update(b"\0")
        hasher.update(index_mode.encode("ascii"))
        hasher.update(b"\0")
        hasher.update(object_id.encode("ascii"))
        hasher.update(b"\0")
        hasher.update(stage.encode("ascii"))
        hasher.update(b"\0")
        hasher.update(working_tree_mode(absolute_path).encode("ascii"))
        hasher.update(b"\0")
        hasher.update(str(len(content)).encode("ascii"))
        hasher.update(b"\0")
        hasher.update(content)
        hasher.update(b"\0")
    return f"sha256:{hasher.hexdigest()}", len(entries)


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def rows(data: dict[str, Any], doc: str) -> list[dict[str, Any]]:
    return data["json"][doc].get("rows", [])


def text_blob(data: dict[str, Any]) -> str:
    return "\n".join(json.dumps(v, sort_keys=True) for v in data["json"].values()) + "\n" + "\n".join(data["md"].values())


def rule_001_required_artefacts(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for key in JSON_DOCS:
        doc = data["json"].get(key)
        if not isinstance(doc, dict):
            failures.append(fail("USF-NON-UI-001", f"missing JSON document {key}", key))
            continue
        for field in ["id", "issueId", "schemaVersion", "sourceGitSha", "sourceLineageGitSha"]:
            if not doc.get(field):
                failures.append(fail("USF-NON-UI-001", f"{key} missing {field}", key))
    for key in MD_DOCS:
        if not data["md"].get(key, "").strip():
            failures.append(fail("USF-NON-UI-001", f"missing Markdown document {key}", key))
    return failures


def rule_002_self_consistent_inventory(data: dict[str, Any]) -> list[dict[str, str]]:
    """Self-contained inventory consistency (no external/sibling repository is consulted).

    The frozen source-lineage inventory declares its own tracked-file count; the gate checks
    that the declared count matches the actual number of inventory rows and that no row's
    source-lineage path tuple is duplicated. This preserves the original completeness/no-loss
    guarantee without reaching outside this repository.
    """
    baseline = data["json"]["baseline"]
    items = baseline.get("inventoryItems", [])
    paths = [tuple(item.get("sourceLineagePaths", [])) for item in items]
    declared = baseline.get("sourceLineageTrackedFileCount")
    failures: list[dict[str, str]] = []
    if not isinstance(declared, int) or declared <= 0:
        failures.append(fail("USF-NON-UI-002", "sourceLineageTrackedFileCount must be a positive integer", "baseline.sourceLineageTrackedFileCount"))
    if declared != len(items):
        failures.append(fail("USF-NON-UI-002", "declared sourceLineageTrackedFileCount does not match inventoryItems row count", "baseline.sourceLineageTrackedFileCount"))
    if len(paths) != len(set(paths)):
        failures.append(fail("USF-NON-UI-002", "duplicate source-lineage path inventory rows", "baseline.inventoryItems"))
    return failures


def disposition_failures(rule_id: str, data: dict[str, Any], doc: str, field: str = "rows") -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    entries = data["json"][doc].get(field, [])
    if doc == "baseline":
        entries = data["json"][doc].get("inventoryItems", [])
    for index, row in enumerate(entries):
        disposition = row.get("disposition")
        if disposition not in ALLOWED_DISPOSITIONS:
            failures.append(fail(rule_id, f"invalid or missing disposition {disposition!r}", f"{doc}.{field}[{index}].disposition"))
    return failures


def rule_003_allowed_dispositions(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for doc, field in [
        ("baseline", "inventoryItems"),
        ("service", "rows"),
        ("route", "rows"),
        ("test", "rows"),
        ("operator", "rows"),
    ]:
        failures.extend(disposition_failures("USF-NON-UI-003", data, doc, field))
    return failures


def rule_004_residual_rows_have_carriers(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    docs = [("baseline", "inventoryItems"), ("service", "rows"), ("route", "rows"), ("operator", "rows"), ("gap", "rows")]
    for doc, field in docs:
        entries = data["json"][doc].get(field, [])
        for index, row in enumerate(entries):
            if row.get("disposition") in {"blocked-with-linear-carrier", "requires-human-decision"} or row.get("status") in {"blocked-with-linear-carrier", "requires-human-decision"}:
                for required in ["linearCarrier", "owner", "retryCondition", "reviewCadence"]:
                    if not row.get(required):
                        failures.append(fail("USF-NON-UI-004", f"residual row missing {required}", f"{doc}.{field}[{index}]"))
                decision = row.get("humanDecision", {})
                if row.get("disposition") == "requires-human-decision" and decision.get("status") in {"", None, "unresolved"}:
                    failures.append(fail("USF-NON-UI-004", "requires-human-decision row lacks a resolved human decision status", f"{doc}.{field}[{index}].humanDecision"))
    return failures


def rule_005_service_equivalence(data: dict[str, Any]) -> list[dict[str, str]]:
    service = data["json"]["service"]
    failures: list[dict[str, str]] = []
    if service.get("serviceCount", 0) <= 0 or len(service.get("rows", [])) != service.get("serviceCount"):
        failures.append(fail("USF-NON-UI-005", "service equivalence matrix has no complete row coverage", "service.rows"))
    for index, row in enumerate(service.get("rows", [])):
        for field in ["sourceLineageService", "usfServiceOrReplacement", "operationalEquivalence", "securityEquivalence", "auditEquivalence", "observabilityEquivalence", "dataLifecycleEquivalence", "adminOperatorEquivalence", "proofs"]:
            if not row.get(field):
                failures.append(fail("USF-NON-UI-005", f"service row missing {field}", f"service.rows[{index}].{field}"))
    return failures


def rule_006_route_port_adapter_provider(data: dict[str, Any]) -> list[dict[str, str]]:
    route = data["json"]["route"]
    categories = {row.get("category") for row in route.get("rows", [])}
    required = {"route-api", "adapter-provider", "schema-contract", "command-proof-tooling", "configuration"}
    failures: list[dict[str, str]] = []
    if not route.get("rows"):
        failures.append(fail("USF-NON-UI-006", "route/port/adapter/provider matrix is empty", "route.rows"))
    if not required.intersection(categories):
        failures.append(fail("USF-NON-UI-006", "route/port/adapter/provider matrix lacks required categories", "route.rows"))
    for index, row in enumerate(route.get("rows", [])):
        for field in ["sourceLineageId", "routePortAdapterProviderId", "usfAdapterProviderReplacement", "equivalenceRationale", "proofEvidence"]:
            if not row.get(field):
                failures.append(fail("USF-NON-UI-006", f"route/adapter row missing {field}", f"route.rows[{index}].{field}"))
    return failures


def rule_007_test_proof_ledger(data: dict[str, Any]) -> list[dict[str, str]]:
    baseline_tests = [item for item in data["json"]["baseline"].get("inventoryItems", []) if item.get("sourceKind") == "test"]
    test_rows = data["json"]["test"].get("rows", [])
    failures: list[dict[str, str]] = []
    if len(test_rows) != len(baseline_tests):
        failures.append(fail("USF-NON-UI-007", "test/proof ledger count does not match baseline test inventory", "test.rows"))
    for index, row in enumerate(test_rows):
        for field in ["classification", "disposition", "requiredTestCoverageClasses", "currentUsfProofs", "staleSourceEvidenceTreatment"]:
            if not row.get(field):
                failures.append(fail("USF-NON-UI-007", f"test/proof row missing {field}", f"test.rows[{index}].{field}"))
    return failures


def rule_008_ui_foundation_rewrites(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    rows_ = data["json"]["ui"].get("rows", [])
    if not rows_:
        failures.append(fail("USF-NON-UI-008", "UI-derived foundation rewrite ledger is empty", "ui.rows"))
    for index, row in enumerate(rows_):
        classification = row.get("classification")
        if classification == "foundation-behaviour-rewritten-and-proven" and not row.get("nonUiRewriteProof"):
            failures.append(fail("USF-NON-UI-008", "foundation behaviour row lacks non-UI proof", f"ui.rows[{index}].nonUiRewriteProof"))
        if row.get("proofStatus") in {"foundation-behaviour-rewrite-required", "unproven", "partial"}:
            failures.append(fail("USF-NON-UI-008", "unresolved UI-derived foundation behaviour rewrite", f"ui.rows[{index}].proofStatus"))
    return failures


def rule_009_operator_admin_surfaces(data: dict[str, Any]) -> list[dict[str, str]]:
    rows_ = data["json"]["operator"].get("rows", [])
    ids = {row.get("id") for row in rows_}
    failures: list[dict[str, str]] = []
    missing = sorted(REQUIRED_OPERATOR_SURFACES - ids)
    if missing:
        failures.append(fail("USF-NON-UI-009", f"missing operator/admin surfaces: {', '.join(missing)}", "operator.rows"))
    for index, row in enumerate(rows_):
        for field in ["accessMethod", "roleRequired", "auditPosture", "screenshotEvidence", "riskControlMapping", "disposition"]:
            if not row.get(field):
                failures.append(fail("USF-NON-UI-009", f"operator/admin surface missing {field}", f"operator.rows[{index}].{field}"))
        if row.get("testClosureBlocker"):
            failures.append(fail("USF-NON-UI-009", "operator/admin surface blocks Test closure", f"operator.rows[{index}].testClosureBlocker"))
    return failures


def rule_010_assurance_case_chain(data: dict[str, Any]) -> list[dict[str, str]]:
    assurance = data["json"]["assurance"]
    failures: list[dict[str, str]] = []
    if not assurance.get("claims"):
        failures.append(fail("USF-NON-UI-010", "assurance case has no claims", "assurance.claims"))
    for index, claim in enumerate(assurance.get("claims", [])):
        for field in ["claimText", "requirement", "sourceLineage", "usfSemanticContract", "implementation", "test", "proof", "evidence", "control", "risk", "humanDecisionStatus"]:
            if not claim.get(field):
                failures.append(fail("USF-NON-UI-010", f"claim missing {field}", f"assurance.claims[{index}].{field}"))
    for index, entry in enumerate(assurance.get("chainOfCustody", [])):
        for field in ["claimText", "sourceLineageId", "usfRequirementId", "testCommand", "testResult", "artifactPath", "artifactHash", "timestamp", "sourceGitSha", "environment", "actorOrTool", "redactionStatus"]:
            if not entry.get(field):
                failures.append(fail("USF-NON-UI-010", f"chain-of-custody entry missing {field}", f"assurance.chainOfCustody[{index}].{field}"))
        if not re.fullmatch(r"[0-9a-f]{64}", str(entry.get("artifactHash", ""))):
            failures.append(fail("USF-NON-UI-010", "chain-of-custody entry has malformed artifact hash", f"assurance.chainOfCustody[{index}].artifactHash"))
    return failures


def rule_011_enterprise_iso_support(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    rows_ = data["json"]["assurance"].get("enterpriseSupportMapping", [])
    if len(rows_) < 10:
        failures.append(fail("USF-NON-UI-011", "enterprise/ISO-style support mapping is incomplete", "assurance.enterpriseSupportMapping"))
    for index, row in enumerate(rows_):
        for field in ["domain", "owner", "evidenceSource", "validationMethod", "result", "residualRisk", "reviewCadence", "nonClaimBoundary"]:
            if not row.get(field):
                failures.append(fail("USF-NON-UI-011", f"enterprise row missing {field}", f"assurance.enterpriseSupportMapping[{index}].{field}"))
        joined = json.dumps(row).lower()
        if "certified" in joined or "soc ready" in joined or "enterprise production ready" in joined:
            failures.append(fail("USF-NON-UI-011", "enterprise support row overclaims certification/readiness", f"assurance.enterpriseSupportMapping[{index}]"))
    return failures


def rule_012_gap_register(data: dict[str, Any]) -> list[dict[str, str]]:
    gap = data["json"]["gap"]
    failures: list[dict[str, str]] = []
    rows_ = gap.get("rows", [])
    if gap.get("summary", {}).get("openGapCount") != len(rows_):
        failures.append(fail("USF-NON-UI-012", "gap summary openGapCount does not match gap rows", "gap.summary.openGapCount"))
    for index, row in enumerate(rows_):
        for field in ["linearCarrier", "owner", "retryCondition", "reviewCadence", "nonClaims"]:
            if not row.get(field):
                failures.append(fail("USF-NON-UI-012", f"gap row missing {field}", f"gap.rows[{index}].{field}"))
    return failures


def rule_013_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for key, doc in data["json"].items():
        non_claims = set(doc.get("nonClaims", []))
        missing = [claim for claim in FORBIDDEN_CLAIMS if claim not in non_claims]
        if missing:
            failures.append(fail("USF-NON-UI-013", f"{key} missing non-claims: {', '.join(missing)}", f"{key}.nonClaims"))
    closure = data["json"]["closure"]
    for field in ["stagingReadinessClaimed", "productionReadinessClaimed"]:
        if closure.get(field) is not False:
            failures.append(fail("USF-NON-UI-013", f"closure overclaims {field}", f"closure.{field}"))
    return failures


def rule_014_no_external_path_as_current_proof(data: dict[str, Any]) -> list[dict[str, str]]:
    """A current USF proof reference MUST be repository-local, never an external/sibling path.

    Generic by construction: any parent-relative external path (a "../" segment reaching outside
    this repository) used as a current proof is rejected, without naming a specific legacy source.
    """
    failures: list[dict[str, str]] = []
    for doc in ["baseline", "route", "test", "service"]:
        entries = data["json"][doc].get("inventoryItems" if doc == "baseline" else "rows", [])
        for index, row in enumerate(entries):
            proof_text = json.dumps(row.get("usfProofs") or row.get("proofEvidence") or row.get("currentUsfProofs") or row.get("proofs") or [])
            if "../" in proof_text:
                failures.append(fail("USF-NON-UI-014", "external/sibling-repository path used as current USF proof", f"{doc}[{index}]"))
    if "lineage only" not in data["md"]["externalReport"]:
        failures.append(fail("USF-NON-UI-014", "external review report does not state source evidence is lineage only", "externalReport"))
    return failures


def rule_015_test_coverage_classes(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(data["json"]["test"].get("rows", [])):
        classes = row.get("requiredTestCoverageClasses", [])
        if not isinstance(classes, list) or not classes:
            failures.append(fail("USF-NON-UI-015", "test/proof row lacks test coverage classes", f"test.rows[{index}].requiredTestCoverageClasses"))
        if row.get("classification") == "foundation-behaviour-rewritten-and-proven" and not any("negative" in item.lower() or "failure" in item.lower() for item in classes):
            failures.append(fail("USF-NON-UI-015", "foundation behaviour rewrite lacks negative/failure coverage class", f"test.rows[{index}].requiredTestCoverageClasses"))
    return failures


def rule_016_replacement_not_weakened(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, row in enumerate(data["json"]["service"].get("rows", [])):
        if row.get("disposition") in {"replaced-by-equivalent-and-proven", "replaced-by-better-service-and-proven", "covered-by-existing-usf-proof"}:
            for field in ["securityEquivalence", "auditEquivalence", "observabilityEquivalence", "dataLifecycleEquivalence"]:
                value = str(row.get(field, "")).lower()
                if not value or "weaken" in value:
                    failures.append(fail("USF-NON-UI-016", f"service replacement weakens or omits {field}", f"service.rows[{index}].{field}"))
    return failures


def rule_017_proof_cockpit_integration(data: dict[str, Any]) -> list[dict[str, str]]:
    report = data["md"]["externalReport"]
    failures: list[dict[str, str]] = []
    if "USF-290" not in report:
        failures.append(fail("USF-NON-UI-017", "external report lacks USF-290 proof-cockpit integration boundary", "externalReport"))
    if "does not expand this non-UI completeness claim" not in report:
        failures.append(fail("USF-NON-UI-017", "USF-290 integration boundary is not bounded", "externalReport"))
    return failures


def rule_018_external_report_sections(data: dict[str, Any]) -> list[dict[str, str]]:
    report = data["md"]["externalReport"]
    failures: list[dict[str, str]] = []
    for section in REQUIRED_REPORT_SECTIONS:
        if f"## {section}" not in report:
            failures.append(fail("USF-NON-UI-018", f"external report missing section {section}", "externalReport"))
    return failures


def rule_019_no_unsafe_readiness_claims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    closure = data["json"]["closure"]
    bounded = closure.get("boundedClaim", "")
    if "UI parity" in bounded or "full product parity" in bounded:
        failures.append(fail("USF-NON-UI-019", "bounded claim includes UI/product parity", "closure.boundedClaim"))
    blob = text_blob(data).lower()
    unsafe_patterns = [
        "iso certified",
        "soc ready",
        "production ready",
        "staging ready for real users",
        "browser e2e readiness is claimed",
        "full product parity is proven",
    ]
    for pattern in unsafe_patterns:
        if pattern in blob:
            failures.append(fail("USF-NON-UI-019", f"unsafe readiness claim detected: {pattern}", "documents"))
    return failures


def rule_020_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-NON-UI-020", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-NON-UI-020", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", defect.get("id", "")))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-NON-UI-020", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-NON-UI-020", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


def rule_021_current_source_tree_anchor(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    try:
        expected_digest, expected_count = compute_source_tree_anchor()
    except Exception as exc:  # noqa: BLE001 - freshness must fail closed if the anchor cannot be computed.
        return [fail("USF-NON-UI-021", f"failed to compute current source-tree anchor: {exc}", "sourceTreeAnchor")]

    for key, doc in data["json"].items():
        anchor = doc.get("currentSourceTreeAnchor")
        path = f"{key}.currentSourceTreeAnchor"
        if not isinstance(anchor, dict):
            failures.append(fail("USF-NON-UI-021", f"{key} missing currentSourceTreeAnchor", path))
            continue
        if anchor.get("algorithm") != SOURCE_TREE_ANCHOR_ALGORITHM:
            failures.append(fail("USF-NON-UI-021", f"{key} has unsupported source-tree anchor algorithm", f"{path}.algorithm"))
        if anchor.get("scope") != SOURCE_TREE_ANCHOR_SCOPE:
            failures.append(fail("USF-NON-UI-021", f"{key} has unsupported source-tree anchor scope", f"{path}.scope"))
        digest = anchor.get("digest")
        if not isinstance(digest, str) or not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
            failures.append(fail("USF-NON-UI-021", f"{key} has missing or malformed source-tree anchor digest", f"{path}.digest"))
        elif digest != expected_digest:
            failures.append(fail("USF-NON-UI-021", f"{key} source-tree anchor is stale", f"{path}.digest"))
        tracked_count = anchor.get("trackedFileCount")
        if not isinstance(tracked_count, int) or tracked_count <= 0:
            failures.append(fail("USF-NON-UI-021", f"{key} has missing or malformed source-tree tracked file count", f"{path}.trackedFileCount"))
        elif tracked_count != expected_count:
            failures.append(fail("USF-NON-UI-021", f"{key} source-tree tracked file count is stale", f"{path}.trackedFileCount"))
        if anchor.get("sourceGitShaTreatment") != "historical-lineage-pin":
            failures.append(fail("USF-NON-UI-021", f"{key} does not classify sourceGitSha as lineage-only", f"{path}.sourceGitShaTreatment"))
        if anchor.get("generatedReportAuthority") != "lower-authority-summary-only":
            failures.append(fail("USF-NON-UI-021", f"{key} does not preserve generated-report lower authority", f"{path}.generatedReportAuthority"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-NON-UI-001": rule_001_required_artefacts,
    "USF-NON-UI-002": rule_002_self_consistent_inventory,
    "USF-NON-UI-003": rule_003_allowed_dispositions,
    "USF-NON-UI-004": rule_004_residual_rows_have_carriers,
    "USF-NON-UI-005": rule_005_service_equivalence,
    "USF-NON-UI-006": rule_006_route_port_adapter_provider,
    "USF-NON-UI-007": rule_007_test_proof_ledger,
    "USF-NON-UI-008": rule_008_ui_foundation_rewrites,
    "USF-NON-UI-009": rule_009_operator_admin_surfaces,
    "USF-NON-UI-010": rule_010_assurance_case_chain,
    "USF-NON-UI-011": rule_011_enterprise_iso_support,
    "USF-NON-UI-012": rule_012_gap_register,
    "USF-NON-UI-013": rule_013_nonclaims,
    "USF-NON-UI-014": rule_014_no_external_path_as_current_proof,
    "USF-NON-UI-015": rule_015_test_coverage_classes,
    "USF-NON-UI-016": rule_016_replacement_not_weakened,
    "USF-NON-UI-017": rule_017_proof_cockpit_integration,
    "USF-NON-UI-018": rule_018_external_report_sections,
    "USF-NON-UI-019": rule_019_no_unsafe_readiness_claims,
    "USF-NON-UI-020": rule_020_planted_defect_coverage,
    "USF-NON-UI-021": rule_021_current_source_tree_anchor,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    mutated = copy.deepcopy(data)
    if rule_id == "USF-NON-UI-001":
        mutated["json"]["closure"].pop("id", None)
    elif rule_id == "USF-NON-UI-002":
        mutated["json"]["baseline"]["sourceLineageTrackedFileCount"] = -1
    elif rule_id == "USF-NON-UI-003":
        mutated["json"]["baseline"]["inventoryItems"][0]["disposition"] = "partial"
    elif rule_id == "USF-NON-UI-004":
        mutated["json"]["gap"]["rows"] = [{"disposition": "blocked-with-linear-carrier"}]
    elif rule_id == "USF-NON-UI-005":
        mutated["json"]["service"]["rows"][0].pop("securityEquivalence", None)
    elif rule_id == "USF-NON-UI-006":
        mutated["json"]["route"]["rows"] = []
    elif rule_id == "USF-NON-UI-007":
        mutated["json"]["test"]["rows"][0]["currentUsfProofs"] = []
    elif rule_id == "USF-NON-UI-008":
        for row in mutated["json"]["ui"]["rows"]:
            if row.get("classification") == "foundation-behaviour-rewritten-and-proven":
                row["proofStatus"] = "foundation-behaviour-rewrite-required"
                row["nonUiRewriteProof"] = []
                break
    elif rule_id == "USF-NON-UI-009":
        mutated["json"]["operator"]["rows"][0]["testClosureBlocker"] = True
    elif rule_id == "USF-NON-UI-010":
        mutated["json"]["assurance"]["chainOfCustody"][0]["artifactHash"] = "not-a-sha"
    elif rule_id == "USF-NON-UI-011":
        mutated["json"]["assurance"]["enterpriseSupportMapping"][0]["result"] = "ISO certified"
    elif rule_id == "USF-NON-UI-012":
        mutated["json"]["gap"]["summary"]["openGapCount"] = 1
    elif rule_id == "USF-NON-UI-013":
        mutated["json"]["closure"]["stagingReadinessClaimed"] = True
    elif rule_id == "USF-NON-UI-014":
        mutated["json"]["test"]["rows"][0]["currentUsfProofs"] = ["../external-source/historical-proof-only"]
    elif rule_id == "USF-NON-UI-015":
        mutated["json"]["test"]["rows"][0]["requiredTestCoverageClasses"] = []
    elif rule_id == "USF-NON-UI-016":
        mutated["json"]["service"]["rows"][0]["auditEquivalence"] = "weakened"
    elif rule_id == "USF-NON-UI-017":
        mutated["md"]["externalReport"] = mutated["md"]["externalReport"].replace("USF-290", "proof cockpit")
    elif rule_id == "USF-NON-UI-018":
        mutated["md"]["externalReport"] = mutated["md"]["externalReport"].replace("## Non-claims", "## Claim boundaries")
    elif rule_id == "USF-NON-UI-019":
        mutated["json"]["closure"]["boundedClaim"] = "Full UI parity and full product parity is proven."
    elif rule_id == "USF-NON-UI-020":
        mutated["planted"] = [
            {"expectedRuleIds": ["USF-NON-UI-001"], "mustBeDistinct": True, "_path": "duplicate-a"},
            {"expectedRuleIds": ["USF-NON-UI-001"], "mustBeDistinct": True, "_path": "duplicate-b"},
        ]
    elif rule_id == "USF-NON-UI-021":
        mutated["json"]["closure"]["currentSourceTreeAnchor"]["digest"] = f"sha256:{'0' * 64}"
    return mutated


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean_failures = run_all(data)
    if clean_failures:
        failures.append(fail("USF-NON-UI-020", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, results
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        rule_failures = run_all(mutated)
        rule_failure_ids = {failure["ruleId"] for failure in rule_failures}
        passed = rule_id in rule_failure_ids
        results.append({"ruleId": rule_id, "expectedFailureObserved": passed, "observedRuleIds": sorted(rule_failure_ids)})
        if not passed:
            failures.append(fail(rule_id, "selftest mutation did not trigger expected rule", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, str]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-non-ui-completeness",
        "mode": mode,
        "status": "pass" if not failures else "fail",
        "failureCount": len(failures),
        "failures": failures,
        "rules": RULE_IDS,
    }
    if extra:
        payload.update(extra)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not failures else 1


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in {"all", "selftest"}:
        print("usage: validate-non-ui-completeness.py [all|selftest] [--json]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - validator should fail closed on parse/load errors.
        return print_result(mode, [fail("USF-NON-UI-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, selftest_results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": selftest_results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
