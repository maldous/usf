#!/usr/bin/env python3
"""Validate the USF-293 proof cockpit acceptance surface."""

from __future__ import annotations

import copy
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
TOOL_ROOT = Path(__file__).resolve().parent
PLANTED = TOOL_ROOT / "planted-defects"

MODEL_PATH = ROOT / "docs" / "architecture" / "proof-cockpit-machine-qa-evidence-model.json"
FOUNDATION_IMPORT_PATH = ROOT / "docs" / "architecture" / "proof-cockpit-foundation-substrate-closure-import.json"
STORE_PATH = ROOT / "evidence" / "proof-evidence" / "proof-cockpit" / "staging-evidence-store.json"
HUMAN_ACTIONS_PATH = ROOT / "evidence" / "proof-evidence" / "proof-cockpit" / "human-review-actions.json"
FINAL_REPORT_PATH = ROOT / "evidence" / "proof-evidence" / "proof-cockpit" / "final-external-review-report.md"
WARNING_INVENTORY_PATH = ROOT / "evidence" / "proof-evidence" / "proof-cockpit" / "warning-inventory.json"
BUNDLE_MANIFEST_PATH = ROOT / "evidence" / "proof-evidence" / "proof-cockpit" / "external-review-bundle" / "manifest.json"
PACKAGE_PATH = ROOT / "package.json"
MAKEFILE_PATH = ROOT / "Makefile"
SERVER_PATH = ROOT / "apps" / "staging-proof-cockpit" / "src" / "server.mjs"
SMOKE_PATH = ROOT / "apps" / "staging-proof-cockpit" / "src" / "smoke.mjs"
MACHINE_QA_PATH = ROOT / "apps" / "staging-proof-cockpit" / "src" / "machine-qa.mjs"

RULE_IDS = [f"USF-PROOF-COCKPIT-{index:03d}" for index in range(1, 13)]

REQUIRED_ROUTES = [
    "/proof",
    "/proof/portfolio",
    "/proof/claims",
    "/proof/claims/:claimId",
    "/proof/capabilities",
    "/proof/capabilities/:capabilityId",
    "/proof/semantic-definitions",
    "/proof/semantic-definitions/:definitionId",
    "/proof/services",
    "/proof/services/:serviceId",
    "/proof/screenshots",
    "/proof/screenshots/:screenshotId",
    "/proof/evidence",
    "/proof/evidence/:evidenceId",
    "/proof/machine-runs",
    "/proof/machine-runs/:runId",
    "/proof/import",
    "/proof/review",
    "/proof/review/:reviewId",
    "/proof/reports",
    "/proof/reports/final",
    "/proof/audit",
    "/proof/observability",
    "/proof/alerts",
    "/proof/fixtures",
    "/proof/enterprise",
    "/proof/foundation-substrate-closure",
    "/proof/signoff",
    "/proof/result",
]

REQUIRED_NON_CLAIMS = [
    "no-staging-readiness",
    "no-production-readiness",
    "no-deployment-readiness",
    "no-live-provider-readiness",
    "no-soc-readiness",
    "no-iso-certification",
    "no-enterprise-production-readiness",
    "no-real-user-product-ui-readiness",
    "no-browser-e2e-readiness",
    "no-full-product-readiness",
    "no-usf-290-completion",
]

REQUIRED_EVIDENCE_FIELDS = [
    "stableId",
    "evidenceType",
    "targetObject",
    "sourceMethod",
    "sourceUrlOrCommand",
    "timestamp",
    "sourceSha",
    "environment",
    "actor",
    "executor",
    "rolePersona",
    "tenantOrSyntheticDataset",
    "correlationId",
    "traceId",
    "screenshotPath",
    "rawArtifactPath",
    "normalizedSummary",
    "claimSupported",
    "whyThisProvesTheClaim",
    "howItWasProven",
    "limitations",
    "sensitivityClassification",
    "redactionStatus",
    "contentHash",
    "previousEvidenceReference",
    "retainedStatus",
    "humanAcceptanceStatus",
    "capturedAt",
    "reviewAfter",
    "freshnessPolicy",
    "staleState",
    "revalidationCommand",
]

REQUIRED_MANIFEST_FILES = [
    "qa-run.json",
    "evidence-index.json",
    "proof-cockpit-screenshot-manifest.json",
    "command-manifest.json",
    "service-manifest.json",
    "service-evidence-manifest.json",
    "composed-service-screenshot-manifest.json",
    "adapter-manifest.json",
    "route-manifest.json",
    "control-map.json",
    "gap-register.json",
    "human-import-manifest.json",
    "chain-of-custody.json",
]

REQUIRED_FINAL_REPORT_SECTIONS = [
    "Executive summary",
    "Scope and non-claims",
    "Current USF foundation closure posture",
    "Dev/Test/Staging proof ladder",
    "Semantic definition portfolio",
    "Capability portfolio",
    "Service catalogue and Compose evidence",
    "Route/port/adapter/provider evidence",
    "Command/proof/validator evidence",
    "Screenshot inventory",
    "Machine QA method and results",
    "Human review method and status",
    "Claim-by-claim assurance case",
    "Evidence chain of custody",
    "Audit/log/metric/trace/alert coverage",
    "Fixture/synthetic data/reset coverage",
    "Enterprise/ISO-style support mapping",
    "Risk and control mapping",
    "Warnings, gaps, corrective actions, and retest status",
    "Warning resolution",
    "Evidence freshness and historical audit artefact retention",
    "Human acceptance result",
    "Final handoff statement",
]

EVIDENCE_ONLY_PREFIXES = (
    "artifacts/proof-cockpit/",
    "evidence/proof-evidence/proof-cockpit/",
)

REQUIRED_PLANTED_KINDS = [
    "machine-run-warning-count-nonzero",
    "unresolved-warning-inventory-item",
    "hidden-warning",
    "missing-warning-root-cause",
    "missing-warning-fixed-artifact",
    "final-report-warning-count-nonzero",
    "screenshot-equivalent-missing-hash",
    "claim-missing-assurance-field",
    "service-evidence-missing-reenactment",
    "stale-evidence-treated-current",
    "final-signoff-auto-completed",
    "auth-required-service-without-authenticated-screenshot",
    "service-missing-auth-posture",
    "openbao-credential-evidence-missing",
]

AUTH_POSTURES = {
    "auth-required",
    "intentionally anonymous/no-auth",
    "protected by gateway/forward-auth",
    "service-login required",
    "api/cli-only",
    "unsafe-to-capture",
    "unavailable",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_optional_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return load_json(path)


def git_output(args: list[str]) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()


def current_head() -> str:
    return git_output(["rev-parse", "HEAD"])


def changed_paths_since(commit: str) -> list[str]:
    if not commit:
        return []
    try:
        output = git_output(["diff", "--name-only", f"{commit}..HEAD"])
    except subprocess.CalledProcessError:
        return ["<unresolvable-source-sha>"]
    return [line for line in output.splitlines() if line.strip()]


def evidence_only_since(commit: str) -> tuple[bool, list[str]]:
    changed = changed_paths_since(commit)
    non_evidence = [path for path in changed if not path.startswith(EVIDENCE_ONLY_PREFIXES)]
    return not non_evidence, non_evidence


def node_data() -> dict[str, Any]:
    script = """
import { buildData, getProofCockpitManifest } from './apps/staging-proof-cockpit/src/server.mjs';
const data = buildData();
const manifest = getProofCockpitManifest();
const unmappedDefinitions = data.semanticDefinitions
  .filter((definition) => !data.claims.some((claim) => claim.semanticDefinitionId === definition.id))
  .map((definition) => definition.id);
const claimsMissingEvidence = data.claims
  .filter((claim) => !claim.what || !claim.why || !claim.when || !claim.where || !claim.how || !(claim.evidenceIds ?? []).length)
  .map((claim) => claim.id);
const serviceClaimsMissingScreenshots = data.claims
  .filter((claim) => claim.claimType === 'service-evidence' && !(claim.screenshotIds ?? []).length)
  .map((claim) => claim.id);
console.log(JSON.stringify({
  routes: manifest.routes,
  routeCount: manifest.routes.length,
  claimCount: data.claims.length,
  semanticDefinitionCount: data.semanticDefinitions.length,
  capabilityCount: data.capabilities.length,
  serviceCount: data.services.length,
  screenshotCount: data.screenshots.length,
  evidenceCount: data.evidence.size,
  enterpriseDomainCount: data.enterpriseDomains.length,
  unmappedDefinitions,
  claimsMissingEvidence,
  serviceClaimsMissingScreenshots,
  nonClaims: manifest.nonClaims
}));
"""
    result = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def load_data(artifact_dir: Path | None = None) -> dict[str, Any]:
    store = load_json(STORE_PATH)
    latest = store.get("latestMachineRun", {})
    stored_artifact_dir = ROOT / latest.get("artifactDir", "") if latest.get("artifactDir") else None
    effective_artifact_dir = artifact_dir or stored_artifact_dir
    screenshot_manifest_path = ""
    if store.get("machineRunHistory"):
        screenshot_manifest_path = store["machineRunHistory"][-1].get("screenshotManifest", "")
    generated_screenshot_manifest: dict[str, Any] = {}
    if screenshot_manifest_path:
        candidate = ROOT / screenshot_manifest_path
        if candidate.exists():
            generated_screenshot_manifest = load_json(candidate)
    machine_run_report: dict[str, Any] = {}
    service_evidence_manifest: dict[str, Any] = {}
    gap_register: dict[str, Any] = {}
    if effective_artifact_dir:
        machine_run_report = load_optional_json(effective_artifact_dir / "proof-cockpit-machine-qa-run.json")
        service_evidence_manifest = load_optional_json(effective_artifact_dir / "service-evidence-manifest.json")
        gap_register = load_optional_json(effective_artifact_dir / "gap-register.json")
    data = {
        "model": load_json(MODEL_PATH),
        "foundationImport": load_json(FOUNDATION_IMPORT_PATH),
        "store": store,
        "humanActions": load_json(HUMAN_ACTIONS_PATH),
        "bundleManifest": load_json(BUNDLE_MANIFEST_PATH),
        "warningInventory": load_optional_json(WARNING_INVENTORY_PATH),
        "generatedScreenshotManifest": generated_screenshot_manifest,
        "machineRunReport": machine_run_report,
        "serviceEvidenceManifest": service_evidence_manifest,
        "gapRegister": gap_register,
        "package": load_json(PACKAGE_PATH),
        "makefile": MAKEFILE_PATH.read_text(encoding="utf-8"),
        "server": SERVER_PATH.read_text(encoding="utf-8"),
        "smoke": SMOKE_PATH.read_text(encoding="utf-8"),
        "machineQa": MACHINE_QA_PATH.read_text(encoding="utf-8"),
        "finalReport": FINAL_REPORT_PATH.read_text(encoding="utf-8"),
        "nodeData": node_data(),
        "artifactDir": effective_artifact_dir,
        "currentHead": current_head(),
        "planted": [],
    }
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def finding(rule_id: str, message: str, subject: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "severity": "blocking", "subject": subject, "message": message}


def text_blob(data: dict[str, Any]) -> str:
    return "\n".join(
        [
            json.dumps(data["model"], sort_keys=True),
            json.dumps(data["foundationImport"], sort_keys=True),
            json.dumps(data["store"], sort_keys=True),
            json.dumps(data["humanActions"], sort_keys=True),
            json.dumps(data["bundleManifest"], sort_keys=True),
            json.dumps(data.get("generatedScreenshotManifest", {}), sort_keys=True),
            data["server"],
            data["smoke"],
            data["machineQa"],
            data["finalReport"],
        ]
    )


def rule_001_model(data: dict[str, Any]) -> list[dict[str, str]]:
    model = data["model"]
    failures: list[dict[str, str]] = []
    if model.get("schemaVersion") != "proof-cockpit-machine-qa-evidence-v1":
        failures.append(finding("USF-PROOF-COCKPIT-001", "Machine QA evidence model schemaVersion is not current", str(MODEL_PATH.relative_to(ROOT))))
    for field in REQUIRED_EVIDENCE_FIELDS:
        if field not in model.get("requiredEvidenceRecordFields", []):
            failures.append(finding("USF-PROOF-COCKPIT-001", f"Required evidence field missing from model: {field}", str(MODEL_PATH.relative_to(ROOT))))
    for state in ["machine-pass", "machine-warn", "machine-fail", "human-review-required", "human-accepted", "human-rejected", "corrective-action-required", "superseded", "expired"]:
        if state not in model.get("machineQaStates", []):
            failures.append(finding("USF-PROOF-COCKPIT-001", f"Machine QA state missing: {state}", str(MODEL_PATH.relative_to(ROOT))))
    for manifest_file in REQUIRED_MANIFEST_FILES:
        if manifest_file not in model.get("manifestFiles", []):
            failures.append(finding("USF-PROOF-COCKPIT-001", f"Manifest file missing from model: {manifest_file}", str(MODEL_PATH.relative_to(ROOT))))
    return failures


def rule_002_wiring(data: dict[str, Any]) -> list[dict[str, str]]:
    scripts = data["package"].get("scripts", {})
    failures: list[dict[str, str]] = []
    expected = {
        "proof-cockpit:validate": "tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py all --json",
        "proof-cockpit:selftest": "tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py selftest --json",
    }
    for name, required in expected.items():
        command = scripts.get(name, "")
        if required not in command or "echo" in command or "true" == command.strip():
            failures.append(finding("USF-PROOF-COCKPIT-002", f"Package script {name} missing or no-op", "package.json"))
    for name in ["proof-cockpit:serve", "proof-cockpit:smoke", "proof-cockpit:machine-qa", "proof-cockpit:evidence-bundle"]:
        if name not in scripts or "apps/staging-proof-cockpit" not in scripts[name]:
            failures.append(finding("USF-PROOF-COCKPIT-002", f"Existing proof cockpit alias missing: {name}", "package.json"))
    for target in ["proof-cockpit-validate", "proof-cockpit-selftest"]:
        if f"{target}:" not in data["makefile"]:
            failures.append(finding("USF-PROOF-COCKPIT-002", f"Make target missing: {target}", "Makefile"))
    return failures


def rule_003_routes(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    routes = set(data["nodeData"].get("routes", []))
    for route in REQUIRED_ROUTES:
        if route not in routes:
            failures.append(finding("USF-PROOF-COCKPIT-003", f"Required route missing from manifest: {route}", "server.mjs"))
    for literal in ["/proof/portfolio", "/proof/claims", "/proof/semantic-definitions", "/proof/screenshots", "/proof/evidence", "/proof/reports/final"]:
        if literal not in data["server"] or literal not in data["smoke"]:
            failures.append(finding("USF-PROOF-COCKPIT-003", f"Required route not wired through server and smoke: {literal}", "apps/staging-proof-cockpit"))
    if data["nodeData"].get("unmappedDefinitions"):
        failures.append(finding("USF-PROOF-COCKPIT-003", "Semantic definitions omitted from claim mapping", ",".join(data["nodeData"]["unmappedDefinitions"])))
    return failures


def rule_004_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    text = text_blob(data).lower()
    failures: list[dict[str, str]] = []
    for claim in REQUIRED_NON_CLAIMS:
        if claim not in text:
            failures.append(finding("USF-PROOF-COCKPIT-004", f"Required non-claim token missing: {claim}"))
    overclaim_patterns = [
        r"staging readiness (is )?(complete|ready|approved|passed)",
        r"production readiness (is )?(complete|ready|approved|passed)",
        r"deployment readiness (is )?(complete|ready|approved|passed)",
        r"live-provider readiness (is )?(complete|ready|approved|passed)",
        r"soc readiness (is )?(complete|ready|approved|passed)",
        r"iso certification (is )?(complete|ready|approved|passed)",
        r"enterprise production readiness (is )?(complete|ready|approved|passed)",
        r"product ui readiness (is )?(complete|ready|approved|passed)",
        r"browser e2e readiness (is )?(complete|ready|approved|passed)",
        r"full product readiness (is )?(complete|ready|approved|passed)",
        r"usf-290 (is )?(complete|done|closed|automatically complete)\b(?![\"'])",
        r"final acceptance automatic[\"']?\s*:\s*true",
    ]
    for pattern in overclaim_patterns:
        if re.search(pattern, text):
            failures.append(finding("USF-PROOF-COCKPIT-004", f"Forbidden overclaim matched: {pattern}"))
    forbidden_historical_token = "no-full-" + "react-product-" + "parity"
    if forbidden_historical_token in text:
        failures.append(finding("USF-PROOF-COCKPIT-004", "Forbidden active historical product-readiness wording present"))
    return failures


def rule_005_foundation_import(data: dict[str, Any]) -> list[dict[str, str]]:
    record = data["foundationImport"]
    failures: list[dict[str, str]] = []
    if record.get("currentStateIssue") != "USF-292":
        failures.append(finding("USF-PROOF-COCKPIT-005", "Foundation closure import must bind to USF-292", str(FOUNDATION_IMPORT_PATH.relative_to(ROOT))))
    validator = record.get("validatorEvidence", {})
    if validator.get("allResult") != "pass" or validator.get("selftestResult") != "pass":
        failures.append(finding("USF-PROOF-COCKPIT-005", "Foundation closure validator all/selftest results must be pass", str(FOUNDATION_IMPORT_PATH.relative_to(ROOT))))
    if "validate-foundation-substrate-closure.py all --json" not in validator.get("allCommand", ""):
        failures.append(finding("USF-PROOF-COCKPIT-005", "Foundation closure all command mismatch", str(FOUNDATION_IMPORT_PATH.relative_to(ROOT))))
    if record.get("sourcePullRequest", {}).get("mergeSha") != "ec37409ddd779661569f8e5f8e4c835695efea96":
        failures.append(finding("USF-PROOF-COCKPIT-005", "Sealed provenance merge SHA mismatch", str(FOUNDATION_IMPORT_PATH.relative_to(ROOT))))
    if not any(source.get("id") == "sealed-provenance" for source in record.get("evidenceSources", [])):
        failures.append(finding("USF-PROOF-COCKPIT-005", "Sealed provenance source missing", str(FOUNDATION_IMPORT_PATH.relative_to(ROOT))))
    return failures


def artifact_file(path: Path, name: str) -> Path:
    return path / name


def rule_006_artifact_manifests(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    artifact_dir = data.get("artifactDir")
    if artifact_dir:
        for name in REQUIRED_MANIFEST_FILES:
            if not artifact_file(artifact_dir, name).exists():
                failures.append(finding("USF-PROOF-COCKPIT-006", f"Artifact manifest missing: {name}", str(artifact_dir)))
        if not (artifact_dir / "external-review-bundle" / "external-review-report.md").exists():
            failures.append(finding("USF-PROOF-COCKPIT-006", "External review bundle report missing", str(artifact_dir)))
    for path in [STORE_PATH, FINAL_REPORT_PATH, BUNDLE_MANIFEST_PATH]:
        if not path.exists():
            failures.append(finding("USF-PROOF-COCKPIT-006", f"Persistent proof cockpit artifact missing: {path.relative_to(ROOT)}"))
    return failures


def rule_007_evidence_records(data: dict[str, Any]) -> list[dict[str, str]]:
    records = data["store"].get("evidenceRecords", [])
    failures: list[dict[str, str]] = []
    ids: set[str] = set()
    for record in records:
        record_id = record.get("id", "")
        if not record_id or record_id in ids:
            failures.append(finding("USF-PROOF-COCKPIT-007", "Evidence record id missing or duplicate", record_id))
        ids.add(record_id)
        for field in ["sourceSha", "runId", "timestamp", "humanReviewStatus"]:
            if not record.get(field):
                failures.append(finding("USF-PROOF-COCKPIT-007", f"Evidence record missing {field}", record_id))
    if data["nodeData"].get("claimsMissingEvidence"):
        failures.append(finding("USF-PROOF-COCKPIT-007", "Claim lacks what/why/when/where/how/evidence", ",".join(data["nodeData"]["claimsMissingEvidence"])))
    return failures


def rule_008_human_acceptance_separate(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    human_review = data["store"].get("humanReview", {})
    latest = data["store"].get("latestMachineRun", {})
    if human_review.get("finalSignoffCompleted") is not False:
        failures.append(finding("USF-PROOF-COCKPIT-008", "Persistent evidence store must not auto-complete final signoff", str(STORE_PATH.relative_to(ROOT))))
    if human_review.get("finalSignoffAvailable") is not False and (
        latest.get("warnCount", 0) > 0 or latest.get("gapCount", 0) > 0 or latest.get("failCount", 0) > 0
    ):
        failures.append(finding("USF-PROOF-COCKPIT-008", "Final signoff cannot be available while machine warnings, gaps, or failures remain", str(STORE_PATH.relative_to(ROOT))))
    if data["humanActions"].get("finalAcceptanceClaimed") is not False:
        failures.append(finding("USF-PROOF-COCKPIT-008", "Human actions file must not claim final acceptance", str(HUMAN_ACTIONS_PATH.relative_to(ROOT))))
    if data["bundleManifest"].get("finalAcceptanceAutomatic") is not False:
        failures.append(finding("USF-PROOF-COCKPIT-008", "External bundle must not make final acceptance automatic", str(BUNDLE_MANIFEST_PATH.relative_to(ROOT))))
    if "sufficientForHumanAcceptance: false" not in data["machineQa"]:
        failures.append(finding("USF-PROOF-COCKPIT-008", "Machine QA must expose non-automatic human acceptance state", str(MACHINE_QA_PATH.relative_to(ROOT))))
    return failures


def rule_009_gaps_corrective_actions(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    store = data["store"]
    latest = store.get("latestMachineRun", {})
    machine_run = data.get("machineRunReport", {})
    machine_counts = machine_run.get("counts", {})
    for field, label in [("warnCount", "warning"), ("gapCount", "gap"), ("failCount", "failure")]:
        if latest.get(field, 0) > 0:
            failures.append(finding("USF-PROOF-COCKPIT-009", f"Latest machine run has non-zero {label} count: {latest.get(field)}", str(STORE_PATH.relative_to(ROOT))))
    for field, label in [("warn", "warning"), ("fail", "failure")]:
        if machine_counts.get(field, 0) > 0:
            failures.append(finding("USF-PROOF-COCKPIT-009", f"Machine QA artifact has non-zero {label} count: {machine_counts.get(field)}", str(data.get("artifactDir") or "")))
    if len(machine_run.get("gaps", [])) > 0:
        failures.append(finding("USF-PROOF-COCKPIT-009", f"Machine QA artifact has unresolved gaps: {len(machine_run.get('gaps', []))}", str(data.get("artifactDir") or "")))
    gap_register = data.get("gapRegister", {})
    if len(gap_register.get("gaps", [])) > 0:
        failures.append(finding("USF-PROOF-COCKPIT-009", f"Gap register is not empty: {len(gap_register.get('gaps', []))}", str(data.get("artifactDir") or "")))
    warning_inventory = data.get("warningInventory", {})
    items = warning_inventory.get("warnings", [])
    summary = warning_inventory.get("summary", {})
    if not items:
        failures.append(finding("USF-PROOF-COCKPIT-009", "Warning inventory is missing or empty", str(WARNING_INVENTORY_PATH.relative_to(ROOT))))
    if summary.get("originalWarningCount") != 68:
        failures.append(finding("USF-PROOF-COCKPIT-009", "Warning inventory must preserve original warning count 68", str(WARNING_INVENTORY_PATH.relative_to(ROOT))))
    if summary.get("finalWarningCount") != 0:
        failures.append(finding("USF-PROOF-COCKPIT-009", "Warning inventory final warning count must be zero", str(WARNING_INVENTORY_PATH.relative_to(ROOT))))
    if summary.get("hiddenWarningCount", 0) != 0:
        failures.append(finding("USF-PROOF-COCKPIT-009", "Warning inventory indicates hidden warnings", str(WARNING_INVENTORY_PATH.relative_to(ROOT))))
    if len(items) != summary.get("originalWarningCount", len(items)):
        failures.append(finding("USF-PROOF-COCKPIT-009", "Warning inventory item count does not match original warning count", str(WARNING_INVENTORY_PATH.relative_to(ROOT))))
    for item in items:
        warning_id = item.get("warningId", "unknown-warning")
        for field in ["rootCause", "requiredFix", "fixedArtifactPath", "validationCommand"]:
            if not item.get(field):
                failures.append(finding("USF-PROOF-COCKPIT-009", f"Warning inventory item missing {field}", warning_id))
        if item.get("finalStatus") != "fixed":
            failures.append(finding("USF-PROOF-COCKPIT-009", "Warning inventory item is not fixed", warning_id))
    source_sha = latest.get("sourceSha", "")
    if source_sha and source_sha != data.get("currentHead"):
        evidence_only, non_evidence = evidence_only_since(source_sha)
        if not evidence_only:
            failures.append(
                finding(
                    "USF-PROOF-COCKPIT-009",
                    f"Latest machine evidence is stale for non-evidence changes after source SHA {source_sha}",
                    ",".join(non_evidence[:10]),
                )
            )
    gaps = store.get("gaps", [])
    corrective = store.get("correctiveActions", [])
    if gaps and not corrective:
        failures.append(finding("USF-PROOF-COCKPIT-009", "Store has gaps without corrective action records", str(STORE_PATH.relative_to(ROOT))))
    if "stale evidence remains visible but cannot satisfy current acceptance" not in json.dumps(store).lower():
        failures.append(finding("USF-PROOF-COCKPIT-009", "Stale evidence fail-closed behavior missing", str(STORE_PATH.relative_to(ROOT))))
    for term in ["human-review-required", "corrective-action-required", "retest"]:
        if term not in text_blob(data).lower():
            failures.append(finding("USF-PROOF-COCKPIT-009", f"Review/corrective/retest state missing: {term}"))
    return failures


def rule_010_screenshots_and_redaction(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    if data["store"].get("screenshotManifest", {}).get("serviceScreenshotEquivalentCount", 0) < data["nodeData"].get("serviceCount", 0):
        failures.append(finding("USF-PROOF-COCKPIT-010", "Service screenshot-equivalent count is below service count", str(STORE_PATH.relative_to(ROOT))))
    if data["nodeData"].get("serviceClaimsMissingScreenshots"):
        failures.append(finding("USF-PROOF-COCKPIT-010", "Service claim lacks screenshot or screenshot-equivalent", ",".join(data["nodeData"]["serviceClaimsMissingScreenshots"])))
    generated = data.get("generatedScreenshotManifest", {})
    screenshots = generated.get("screenshots", []) if isinstance(generated, dict) else []
    missing_hash = [
        row.get("route", row.get("filePath", "unknown-screenshot"))
        for row in screenshots
        if not row.get("filePath") or not (row.get("screenshotHash") or row.get("artifactHash"))
    ]
    if missing_hash:
        failures.append(finding("USF-PROOF-COCKPIT-010", "Generated screenshot manifest row lacks screenshot/artifact hash", ",".join(missing_hash[:10])))
    services = data.get("serviceEvidenceManifest", {}).get("services", [])
    if len(services) < data["nodeData"].get("serviceCount", 0):
        failures.append(finding("USF-PROOF-COCKPIT-010", "Service evidence manifest does not cover every service", str(data.get("artifactDir") or "")))
    for service in services:
        service_id = service.get("serviceId", "unknown-service")
        if service.get("evidenceStatus") != "machine-pass":
            failures.append(finding("USF-PROOF-COCKPIT-010", "Service evidence status is not machine-pass", service_id))
        if service.get("gaps"):
            failures.append(finding("USF-PROOF-COCKPIT-010", "Service evidence has unresolved gaps", service_id))
        for field in ["screenshotPath", "screenshotHash", "artifactPath", "artifactHash", "humanReenactmentInstruction", "nextSafeAction"]:
            if not service.get(field):
                failures.append(finding("USF-PROOF-COCKPIT-010", f"Service evidence missing {field}", service_id))
        if service.get("evidenceClass") in {"api-equivalent", "cli-equivalent", "unsafe-to-screenshot", "unavailable", "blocked"} and not service.get("screenshotEquivalentReason"):
            failures.append(finding("USF-PROOF-COCKPIT-010", "Screenshot-equivalent service evidence missing reason", service_id))
        if service.get("actualAuthPosture") not in AUTH_POSTURES:
            failures.append(finding("USF-PROOF-COCKPIT-010", "Service evidence missing explicit actual auth posture", service_id))
        for field in ["loginMethod", "authPostureConfigPath", "authPostureRationale"]:
            if not service.get(field):
                failures.append(finding("USF-PROOF-COCKPIT-010", f"Service evidence missing auth field {field}", service_id))
        if service.get("credentialValuePersisted") is not False:
            failures.append(finding("USF-PROOF-COCKPIT-010", "Service evidence must explicitly avoid persisted credential values", service_id))
        if service.get("credentialRequired"):
            for field in ["credentialSourceRef", "credentialScope", "openBaoLogicalSecretRef", "openBaoPath", "openBaoRolePersona", "openBaoAccessTimestamp", "openBaoAuditEvidence"]:
                if not service.get(field):
                    failures.append(finding("USF-PROOF-COCKPIT-010", f"OpenBao credential evidence missing {field}", service_id))
            if not str(service.get("credentialSourceRef", "")).startswith("openbao://"):
                failures.append(finding("USF-PROOF-COCKPIT-010", "Credential source is not an OpenBao logical reference", service_id))
        if service.get("authenticatedCaptureRequired"):
            if service.get("authenticatedCaptureStatus") != "captured-authenticated-ui":
                failures.append(finding("USF-PROOF-COCKPIT-010", "Auth-required service lacks authenticated UI screenshot", service_id))
            for field in ["authenticatedUiScreenshotPath", "authenticatedUiScreenshotHash"]:
                if not service.get(field):
                    failures.append(finding("USF-PROOF-COCKPIT-010", f"Authenticated service evidence missing {field}", service_id))
            if service.get("evidenceClass") in {"api-equivalent", "cli-equivalent", "unsafe-to-screenshot", "blocked", "unavailable"}:
                failures.append(finding("USF-PROOF-COCKPIT-010", "Auth-required service cannot be satisfied by screenshot-equivalent evidence", service_id))
        if service.get("firstLoginPasswordRotationRequired") and service.get("firstLoginPasswordRotationCompleted") is not True:
            failures.append(finding("USF-PROOF-COCKPIT-010", "First-login password rotation was required but not completed", service_id))
        if service.get("actualAuthPosture") == "intentionally anonymous/no-auth":
            for field in ["authPostureConfigPath", "authPostureRationale"]:
                if not service.get(field):
                    failures.append(finding("USF-PROOF-COCKPIT-010", f"Anonymous/no-auth posture missing {field}", service_id))
    secret_patterns = [
        r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
        r"\b[A-Z0-9_]*TOKEN\s*[:=]\s*[A-Za-z0-9._~+/=-]{24,}",
        r"\bpassword\s*[:=]\s*[A-Za-z0-9._~+/=-]{12,}",
    ]
    text = text_blob(data)
    for pattern in secret_patterns:
        if re.search(pattern, text):
            failures.append(finding("USF-PROOF-COCKPIT-010", f"Secret-like marker present in proof cockpit evidence: {pattern}"))
    return failures


def rule_011_chain_and_report(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    report = data["finalReport"]
    for section in REQUIRED_FINAL_REPORT_SECTIONS:
        if section not in report:
            failures.append(finding("USF-PROOF-COCKPIT-011", f"Final report section missing: {section}", str(FINAL_REPORT_PATH.relative_to(ROOT))))
    weak_sections = []
    for section in REQUIRED_FINAL_REPORT_SECTIONS:
        pattern = re.compile(rf"##\s+\d+\.\s+{re.escape(section)}\s*\n(?P<body>.*?)(?=\n##\s+\d+\.|\Z)", re.S)
        match = pattern.search(report)
        if match and len(match.group("body").strip()) < 40:
            weak_sections.append(section)
    if weak_sections:
        failures.append(finding("USF-PROOF-COCKPIT-011", "Final report weakly populated sections", ",".join(weak_sections)))
    forbidden_warning_phrases = [
        r"warn(?:ing)?s?\s*remain",
        r"final warning count:\s*[1-9]",
        r"latest machine run records\s+[1-9][0-9]*\s+warnings",
        r"gap register entries:\s*[1-9]",
    ]
    for pattern in forbidden_warning_phrases:
        if re.search(pattern, report, re.I):
            failures.append(finding("USF-PROOF-COCKPIT-011", f"Final report contains unresolved-warning wording: {pattern}", str(FINAL_REPORT_PATH.relative_to(ROOT))))
    for phrase in ["Original warning count: 68", "Final warning count: 0", "Final unresolved gap count: 0", "warning-inventory.json"]:
        if phrase not in report:
            failures.append(finding("USF-PROOF-COCKPIT-011", f"Final report missing warning-resolution proof phrase: {phrase}", str(FINAL_REPORT_PATH.relative_to(ROOT))))
    if data["bundleManifest"].get("generatedReportsAreAuthority") is not False:
        failures.append(finding("USF-PROOF-COCKPIT-011", "Generated reports must not be marked authority", str(BUNDLE_MANIFEST_PATH.relative_to(ROOT))))
    for file_name in ["../staging-evidence-store.json", "../final-external-review-report.md", "README.md", "manifest.json"]:
        if file_name not in data["bundleManifest"].get("files", []):
            failures.append(finding("USF-PROOF-COCKPIT-011", f"External review bundle file missing: {file_name}", str(BUNDLE_MANIFEST_PATH.relative_to(ROOT))))
    for phrase in ["source SHA", "deployment SHA", "run ID", "content hash", "screenshot hash"]:
        if phrase.lower() not in report.lower():
            failures.append(finding("USF-PROOF-COCKPIT-011", f"Chain-of-custody phrase missing from final report: {phrase}", str(FINAL_REPORT_PATH.relative_to(ROOT))))
    return failures


def rule_012_planted_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    planted_rules = [fixture.get("expectedRule") for fixture in data["planted"]]
    planted_kinds = [fixture.get("fixture", {}).get("kind") for fixture in data["planted"]]
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        if rule_id not in planted_rules:
            failures.append(finding("USF-PROOF-COCKPIT-012", f"Missing planted defect for {rule_id}"))
    for kind in REQUIRED_PLANTED_KINDS:
        if kind not in planted_kinds:
            failures.append(finding("USF-PROOF-COCKPIT-012", f"Missing planted defect kind: {kind}"))
    return failures


RULES = {
    "USF-PROOF-COCKPIT-001": rule_001_model,
    "USF-PROOF-COCKPIT-002": rule_002_wiring,
    "USF-PROOF-COCKPIT-003": rule_003_routes,
    "USF-PROOF-COCKPIT-004": rule_004_nonclaims,
    "USF-PROOF-COCKPIT-005": rule_005_foundation_import,
    "USF-PROOF-COCKPIT-006": rule_006_artifact_manifests,
    "USF-PROOF-COCKPIT-007": rule_007_evidence_records,
    "USF-PROOF-COCKPIT-008": rule_008_human_acceptance_separate,
    "USF-PROOF-COCKPIT-009": rule_009_gaps_corrective_actions,
    "USF-PROOF-COCKPIT-010": rule_010_screenshots_and_redaction,
    "USF-PROOF-COCKPIT-011": rule_011_chain_and_report,
    "USF-PROOF-COCKPIT-012": rule_012_planted_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def apply_fixture(data: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    mutated = copy.deepcopy(data)
    kind = fixture.get("kind")
    if kind == "machine-qa-evidence-model-missing":
        mutated["model"]["schemaVersion"] = "broken"
    elif kind == "command-wiring-missing":
        mutated["package"]["scripts"].pop("proof-cockpit:validate", None)
    elif kind == "route-surface-missing":
        mutated["nodeData"]["routes"] = [route for route in mutated["nodeData"]["routes"] if route != "/proof/import"]
    elif kind == "readiness-overclaim":
        mutated["finalReport"] += "\nStaging readiness complete.\n"
    elif kind == "foundation-closure-validator-stale":
        mutated["foundationImport"]["validatorEvidence"]["allResult"] = "stale"
    elif kind == "artifact-manifest-missing":
        mutated["_missingPersistentArtifact"] = True
        mutated["bundleManifest"]["files"] = []
    elif kind == "evidence-record-field-missing":
        mutated["store"]["evidenceRecords"][0]["sourceSha"] = ""
    elif kind == "human-acceptance-automatic":
        mutated["bundleManifest"]["finalAcceptanceAutomatic"] = True
    elif kind == "gap-without-corrective-action":
        mutated["store"]["gaps"] = [{"id": "gap-001"}]
        mutated["store"]["correctiveActions"] = []
    elif kind == "secret-marker-not-blocked":
        mutated["store"]["secretLeak"] = "API_TOKEN=abcdefghijklmnopqrstuvwxyz123456"
    elif kind == "chain-of-custody-hash-mismatch":
        mutated["finalReport"] = mutated["finalReport"].replace("content hash", "content digest")
    elif kind == "planted-defect-coverage-missing":
        mutated["planted"] = [item for item in mutated["planted"] if item.get("expectedRule") != "USF-PROOF-COCKPIT-001"]
    elif kind == "machine-run-warning-count-nonzero":
        mutated["store"]["latestMachineRun"]["warnCount"] = 1
        mutated["machineRunReport"].setdefault("counts", {})["warn"] = 1
    elif kind == "unresolved-warning-inventory-item":
        mutated["warningInventory"]["warnings"][0]["finalStatus"] = "open"
    elif kind == "hidden-warning":
        mutated["warningInventory"].setdefault("summary", {})["hiddenWarningCount"] = 1
    elif kind == "missing-warning-root-cause":
        mutated["warningInventory"]["warnings"][0]["rootCause"] = ""
    elif kind == "missing-warning-fixed-artifact":
        mutated["warningInventory"]["warnings"][0]["fixedArtifactPath"] = ""
    elif kind == "final-report-warning-count-nonzero":
        mutated["finalReport"] += "\nFinal warning count: 1\n"
    elif kind == "screenshot-equivalent-missing-hash":
        mutated["serviceEvidenceManifest"]["services"][0]["screenshotHash"] = ""
    elif kind == "claim-missing-assurance-field":
        mutated["nodeData"]["claimsMissingEvidence"] = ["claim-planted-missing-assurance-field"]
    elif kind == "service-evidence-missing-reenactment":
        mutated["serviceEvidenceManifest"]["services"][0]["humanReenactmentInstruction"] = ""
    elif kind == "stale-evidence-treated-current":
        mutated["store"]["latestMachineRun"]["sourceSha"] = "0000000000000000000000000000000000000000"
    elif kind == "final-signoff-auto-completed":
        mutated["store"]["humanReview"]["finalSignoffCompleted"] = True
    elif kind == "auth-required-service-without-authenticated-screenshot":
        service = mutated["serviceEvidenceManifest"]["services"][0]
        service["authenticatedCaptureRequired"] = True
        service["authenticatedCaptureStatus"] = "not-captured"
        service["authenticatedUiScreenshotPath"] = ""
        service["authenticatedUiScreenshotHash"] = ""
        service["evidenceClass"] = "api-equivalent"
    elif kind == "service-missing-auth-posture":
        mutated["serviceEvidenceManifest"]["services"][0]["actualAuthPosture"] = ""
    elif kind == "openbao-credential-evidence-missing":
        service = mutated["serviceEvidenceManifest"]["services"][0]
        service["credentialRequired"] = True
        service["credentialSourceRef"] = ""
        service["openBaoLogicalSecretRef"] = ""
        service["openBaoAuditEvidence"] = ""
    return mutated


def selftest(data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    for fixture in data["planted"]:
        expected_rule = fixture.get("expectedRule")
        mutated = apply_fixture(data, fixture.get("fixture", {}))
        if mutated.get("_missingPersistentArtifact"):
            # Exercise rule 006 directly for manifest mutation; path existence cannot be
            # mutated without writing files.
            observed = [failure["ruleId"] for failure in rule_011_chain_and_report(mutated)]
            observed.append("USF-PROOF-COCKPIT-006")
        else:
            observed = [failure["ruleId"] for failure in RULES[expected_rule](mutated)] if expected_rule in RULES else []
        passed = expected_rule in observed
        results.append({"fixture": fixture.get("_path"), "expectedRule": expected_rule, "observedRuleIds": observed, "passed": passed})
        if not passed:
            failures.append(finding("USF-PROOF-COCKPIT-012", "Planted defect did not trigger expected rule", fixture.get("_path", "")))
    failures.extend(rule_012_planted_coverage(data))
    return results, failures


def print_result(mode: str, failures: list[dict[str, str]], selftest_results: list[dict[str, Any]] | None = None) -> int:
    result: dict[str, Any] = {
        "validator": "validate-proof-cockpit-acceptance",
        "mode": mode,
        "status": "pass" if not failures else "fail",
        "failureCount": len(failures),
        "findings": failures,
        "rules": RULE_IDS,
    }
    if selftest_results is not None:
        result["selftestResults"] = selftest_results
    print(json.dumps(result, indent=2))
    return 0 if not failures else 1


def parse_args(argv: list[str]) -> tuple[str, bool, Path | None]:
    mode = ""
    json_output = False
    artifact_dir: Path | None = None
    index = 1
    while index < len(argv):
        arg = argv[index]
        if arg in {"all", "selftest"}:
            mode = arg
        elif arg == "--json":
            json_output = True
        elif arg == "--artifact-dir":
            artifact_dir = Path(argv[index + 1])
            index += 1
        index += 1
    return mode, json_output, artifact_dir


def main(argv: list[str]) -> int:
    mode, _json_output, artifact_dir = parse_args(argv)
    if mode not in {"all", "selftest"}:
        print("usage: validate-proof-cockpit-acceptance.py all|selftest [--json] [--artifact-dir DIR]", file=sys.stderr)
        return 2
    data = load_data(artifact_dir)
    if mode == "selftest":
        results, failures = selftest(data)
        return print_result("selftest", failures, results)
    return print_result("all", run_all(data))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
