#!/usr/bin/env python3
"""Validate bounded repository optimisation realisation evidence."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]
TRANCHE = ROOT / "docs/architecture/repository-optimisation-local-realisation-tranche.json"
NON_LOCAL_EVALUATION = ROOT / "docs/architecture/repository-non-local-optimisation-option-evaluation.json"
SEMANTICS = ROOT / "docs/architecture/repository-optimisation-realisation-semantics.json"
LINEAR_POLICY = ROOT / "docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json"
LINEAR_AUDIT = ROOT / "docs/architecture/linear-repository-delivery-audit.json"
PACKAGE = ROOT / "package.json"
CI_THROUGHPUT = ROOT / "docs/architecture/repository-ci-throughput-optimisation-realisation.json"
CI_TIMING = ROOT / "evidence/generated-reports/repository-ci-throughput-timing-evidence.json"
VALIDATE_WORKFLOW = ROOT / ".github/workflows/validate-spec.yml"

REPORTS = {
    "USF-997": ROOT / "evidence/generated-reports/repository-optimisation-json-parse-reuse-baseline.json",
    "USF-998": ROOT / "evidence/generated-reports/repository-optimisation-path-inventory-baseline.json",
    "USF-999": ROOT / "evidence/generated-reports/repository-optimisation-affected-run-baseline.json",
    "USF-1000": ROOT / "evidence/generated-reports/repository-optimisation-screenshot-retention-baseline.json",
    "USF-1001": ROOT / "evidence/generated-reports/repository-optimisation-compose-timing-baseline.json",
    "USF-1007": ROOT / "evidence/generated-reports/repository-optimisation-non-local-options-evaluation-baseline.json",
    "USF-996": ROOT / "evidence/generated-reports/repository-optimisation-bounded-realisation-summary.json",
}

REQUIRED_IMPLEMENTED = {"USF-997", "USF-998", "USF-999", "USF-1000", "USF-1001", "USF-1007"}
REQUIRED_FOLLOW_UPS = {"USF-1004", "USF-1005", "USF-1006", "USF-1008"}
REQUIRED_CI_CANDIDATES = set("ABCDEFGHIJKLM")
REQUIRED_CI_IMPLEMENTED = {"A", "B", "E", "G", "K", "M"}
REQUIRED_REPORT_REFS = {
    "USF-997": {
        "cache-boundary:per-process",
        "cache-key:abspath,mtime_ns,size",
        "deepcopy-isolation:passed",
        "stale-negative-control:passed",
        "no-stale-parsed-data:true",
        "validator-equivalence:passed",
        "validator-findings-equivalent:true",
        "timing-comparison:warn-only",
    },
    "USF-998": {
        "scan-mode:declared-root-inventory",
        "repository-wide-glob-avoided:true",
        "previous-scan-comparison:git-tracked-and-untracked",
        "coverage-equivalence:passed",
        "generated-boundaries-preserved:true",
        "missing-from-declared:0",
        "extra-in-declared:0",
    },
    "USF-999": {
        "enforcement-mode:warn-only",
        "hard-ci-block:false",
        "path-class-rules:explicit",
        "unknown-path-negative-control:full-gate-fallback",
        "affected-selftest:path-classification-pass",
        "required-checks-weakened:false",
        "timing-comparison:affected-vs-full-command-family",
        "full-command-family-measured:true",
    },
    "USF-1000": {
        "retention-mode:non-destructive-report-enforced",
        "delete-artifacts:false",
        "allowed-root-violations:0",
        "later-policy-required-for-deletion:true",
    },
    "USF-1001": {
        "startup-measurement-requested:true",
        "compose-phase-split:config,port,startup-wait,teardown",
        "generated-compose-check-exit-code:0",
        "compose-port-check-exit-code:0",
        "compose-config-exit-code:0",
        "compose-startup-wait-exit-code:0",
        "compose-teardown-exit-code:0",
        "testcontainers:evaluated-not-adopted",
        "remote-cache:evaluated-not-adopted",
        "task-graph-tooling:evaluated-not-adopted",
        "non-local-options-evaluation-issue:USF-1007",
    },
    "USF-1007": {
        "issue:USF-1007",
        "option-count:3",
        "missing-option-count:0",
        "non-local-options-adopted:false",
        "provider-environment-proof-nonclaims-preserved:true",
        "future-adoption-issue-required:true",
        "testcontainers-comparison-criteria:defined",
        "remote-cache-comparison-criteria:defined",
        "task-graph-tooling-comparison-criteria:defined",
        "testcontainers-evidence-requirements:defined",
        "remote-cache-evidence-requirements:defined",
        "task-graph-tooling-evidence-requirements:defined",
        "adoption-state:testcontainers=evaluated-not-adopted",
        "adoption-state:remote-cache=evaluated-not-adopted",
        "adoption-state:task-graph-tooling=evaluated-not-adopted",
        "no-external-provider-setup:true",
        "no-credential-persistence:true",
        "no-readiness-claim:true",
    },
    "USF-996": {
        "missing-work-represented-by-child-issues:true",
        "before-after-evidence-recorded:true",
        "validator-equivalence-required:true",
        "coverage-equivalence-required:true",
        "affected-run-negative-control-required:true",
        "full-validation-authority-preserved:true",
        "warn-only-affected-run:true",
        "non-local-options-adopted:false",
    },
}


def workflow_data(text: str) -> dict[str, Any]:
    value = yaml.safe_load(text)
    if not isinstance(value, dict):
        raise ValueError("workflow must parse to a YAML object")
    return value


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def finding(rule_id: str, subject: str, message: str) -> dict[str, str]:
    return {"severity": "blocking", "ruleId": rule_id, "subject": subject, "message": message}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def issue_ids(items: Any) -> set[str]:
    values: set[str] = set()
    if isinstance(items, list):
        for item in items:
            if isinstance(item, str):
                values.add(item)
            elif isinstance(item, dict):
                for key in ("issueId", "id"):
                    value = item.get(key)
                    if isinstance(value, str) and value.startswith("USF-"):
                        values.add(value)
    return values


def refs(report: dict[str, Any]) -> set[str]:
    values = set(str(item) for item in report.get("evidenceRefs", []) if isinstance(item, str))
    for item in report.get("findings", []):
        if isinstance(item, dict):
            values.update(str(ref) for ref in item.get("evidenceRefs", []) if isinstance(ref, str))
    return values


def check_reports(reports: dict[str, dict[str, Any]] | None = None) -> list[dict[str, str]]:

    findings: list[dict[str, str]] = []
    loaded: dict[str, dict[str, Any]] = reports or {}
    for issue_id, path in REPORTS.items():
        try:
            report = loaded.get(issue_id) if issue_id in loaded else load_json(path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            findings.append(finding("USF-OPT-001", rel(path), f"missing or invalid generated report: {exc}"))
            continue
        report_refs = refs(report)
        if f"issue:{issue_id}" not in report_refs:
            findings.append(finding("USF-OPT-001", rel(path), f"report must reference issue:{issue_id}"))
        if report.get("authorityLevel") != "generated-report":
            findings.append(finding("USF-OPT-001", rel(path), "report authorityLevel must be generated-report"))
        if "No Testcontainers" not in str(report.get("aiGuidance", "")):
            findings.append(finding("USF-OPT-001", rel(path), "report must preserve non-local optimisation non-claims"))
        missing_refs = REQUIRED_REPORT_REFS.get(issue_id, set()) - report_refs
        if missing_refs:
            findings.append(finding("USF-OPT-008", rel(path), f"missing required report evidence refs: {', '.join(sorted(missing_refs))}"))
    affected = loaded.get("USF-999") if loaded and "USF-999" in loaded else load_json(REPORTS["USF-999"])
    affected_refs = refs(affected)
    if "enforcement-mode:warn-only" not in affected_refs or "hard-ci-block:false" not in affected_refs:
        findings.append(finding("USF-OPT-002", rel(REPORTS["USF-999"]), "affected-run must remain warn-only with hardCiBlock false"))
    compose = loaded.get("USF-1001") if loaded and "USF-1001" in loaded else load_json(REPORTS["USF-1001"])
    compose_refs = refs(compose)
    required_compose_refs = {
        "compose-phase-split:config,port,startup-wait,teardown",
        "testcontainers:evaluated-not-adopted",
        "remote-cache:evaluated-not-adopted",
        "task-graph-tooling:evaluated-not-adopted",
        "non-local-options-evaluation-issue:USF-1007",
    }
    missing_compose_refs = required_compose_refs - compose_refs
    if missing_compose_refs:
        findings.append(finding("USF-OPT-003", rel(REPORTS["USF-1001"]), f"missing non-local optimisation evidence refs: {', '.join(sorted(missing_compose_refs))}"))
    return findings


def check_repository_artifacts(
    tranche: dict[str, Any] | None = None,
    semantics: dict[str, Any] | None = None,
    linear_policy: dict[str, Any] | None = None,
    linear_audit: dict[str, Any] | None = None,
    package: dict[str, Any] | None = None,
    non_local_evaluation: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    tranche_data = tranche or load_json(TRANCHE)
    semantics_data = semantics or load_json(SEMANTICS)
    policy_data = linear_policy or load_json(LINEAR_POLICY)
    audit_data = linear_audit or load_json(LINEAR_AUDIT)
    package_data = package or load_json(PACKAGE)
    nonlocal_data = non_local_evaluation or load_json(NON_LOCAL_EVALUATION)

    implemented = issue_ids(tranche_data.get("implementedInThisTranche", []))
    missing = REQUIRED_IMPLEMENTED - implemented
    if missing:
        findings.append(finding("USF-OPT-004", rel(TRANCHE), f"missing implemented issue ids: {', '.join(sorted(missing))}"))
    reports = set(tranche_data.get("boundedLocalEvidenceReports", {}).keys())
    missing_reports = REQUIRED_IMPLEMENTED - reports
    if missing_reports:
        findings.append(finding("USF-OPT-004", rel(TRANCHE), f"missing bounded evidence report mappings: {', '.join(sorted(missing_reports))}"))
    if "USF-1007" not in implemented:
        findings.append(finding("USF-OPT-005", rel(TRANCHE), "USF-1007 must be implemented as bounded non-local option evaluation"))
    if "USF-1007" in set(tranche_data.get("laterWorkIssueIds", [])):
        findings.append(finding("USF-OPT-005", rel(TRANCHE), "USF-1007 must not remain unrealised later work"))
    validation = semantics_data.get("validationEvidence", {})
    commands = validation.get("commands", []) if isinstance(validation, dict) else []
    if not any("validate-repository-optimisation.py all" in str(command) for command in commands):
        findings.append(finding("USF-OPT-006", rel(SEMANTICS), "repository optimisation validator command is not recorded"))
    scripts = package_data.get("scripts", {})
    if not isinstance(scripts, dict):
        findings.append(finding("USF-OPT-009", rel(PACKAGE), "package scripts must be a JSON object"))
    else:
        expected_scripts = {
            "repository-optimisation:realise": "realise-bounded-optimisation.py all --include-startup --measure-full-family",
            "repo:affected": "realise-bounded-optimisation.py affected-run --measure-full-family",
            "compose:timing": "realise-bounded-optimisation.py compose-timing --include-startup",
            "repository-optimisation:non-local": "realise-bounded-optimisation.py non-local-options",
        }
        for script_name, expected_fragment in expected_scripts.items():
            if expected_fragment not in str(scripts.get(script_name, "")):
                findings.append(finding("USF-OPT-009", rel(PACKAGE), f"missing or weakened optimisation command script: {script_name}"))


    nonlocal_data = non_local_evaluation or load_json(NON_LOCAL_EVALUATION)
    scope = nonlocal_data.get("evaluationScope", {})
    options = {option.get("id"): option for option in nonlocal_data.get("options", [])}
    required_options = {"testcontainers", "remote-cache", "task-graph-tooling"}
    missing_options = required_options - set(options)
    if missing_options:
        findings.append(finding("USF-OPT-008", rel(NON_LOCAL_EVALUATION), f"missing non-local optimisation options: {', '.join(sorted(missing_options))}"))
    if scope.get("adoptionBoundary") is not False:
        findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), "non-local optimisation adoption boundary must remain false"))
    for field in ["externalProviderSetup", "credentialPersistence", "stagingOrDeploymentChange", "productionReadinessClaim"]:
        if scope.get(field) is not False:
            findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), f"non-local optimisation field must remain false: {field}"))
    if scope.get("providerEnvironmentProofNonclaimsPreserved") is not True:
        findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), "provider/environment proof nonclaims must be preserved"))
    if scope.get("futureAdoptionIssueRequired") is not True:
        findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), "future option adoption must require a separate issue"))
    for option_id in sorted(required_options):
        option = options.get(option_id, {})
        if option.get("adoptionState") != "evaluated-not-adopted":
            findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), f"option must be evaluated-not-adopted: {option_id}"))
        if not option.get("comparisonCriteria"):
            findings.append(finding("USF-OPT-008", rel(NON_LOCAL_EVALUATION), f"option missing comparison criteria: {option_id}"))
        if not option.get("evidenceRequirements"):
            findings.append(finding("USF-OPT-008", rel(NON_LOCAL_EVALUATION), f"option missing evidence requirements: {option_id}"))
        if option.get("futureIssueRequiredForAdoption") is not True:
            findings.append(finding("USF-OPT-010", rel(NON_LOCAL_EVALUATION), f"option must require future issue for adoption: {option_id}"))

    follow_rules = policy_data.get("linearFollowUpDeliveryRules", {})
    if follow_rules.get("deferredBlockedAndUnresolvedWorkDeliveredAsLaterLinearIssues") is not True:
        findings.append(finding("USF-OPT-007", rel(LINEAR_POLICY), "deferred/blocked/unresolved Linear work must be delivered as later Linear issues"))
    delivery = audit_data.get("unresolvedLinearWorkDelivery", {})
    follow_ids = set(delivery.get("followUpIssueIds", [])) if isinstance(delivery, dict) else set()
    missing_followups = REQUIRED_FOLLOW_UPS - follow_ids
    if missing_followups:
        findings.append(finding("USF-OPT-007", rel(LINEAR_AUDIT), f"missing follow-up issue ids: {', '.join(sorted(missing_followups))}"))
    return findings


def check_ci_throughput_artifacts(
    ci_data: dict[str, Any] | None = None,
    timing_data: dict[str, Any] | None = None,
    workflow_text: str | None = None,
) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    ci = ci_data or load_json(CI_THROUGHPUT)
    timing = timing_data or load_json(CI_TIMING)
    workflow_source = workflow_text if workflow_text is not None else VALIDATE_WORKFLOW.read_text(encoding="utf-8")

    candidates = ci.get("candidateMatrix", [])
    if not isinstance(candidates, list):
        findings.append(finding("USF-OPT-CI-001", rel(CI_THROUGHPUT), "candidateMatrix must be a list"))
        candidates = []
    by_id = {item.get("id"): item for item in candidates if isinstance(item, dict)}
    missing_candidates = REQUIRED_CI_CANDIDATES - set(by_id)
    extra_candidates = set(by_id) - REQUIRED_CI_CANDIDATES
    if missing_candidates or extra_candidates:
        findings.append(
            finding(
                "USF-OPT-CI-001",
                rel(CI_THROUGHPUT),
                f"CI throughput candidate matrix mismatch missing={','.join(sorted(missing_candidates))} extra={','.join(sorted(extra_candidates))}",
            )
        )
    implemented = set(ci.get("implementedNowCandidateIds", []))
    missing_implemented = REQUIRED_CI_IMPLEMENTED - implemented
    if missing_implemented:
        findings.append(finding("USF-OPT-CI-001", rel(CI_THROUGHPUT), f"missing implemented-now candidates: {', '.join(sorted(missing_implemented))}"))
    for candidate_id in sorted(REQUIRED_CI_IMPLEMENTED):
        classification = str(by_id.get(candidate_id, {}).get("classification", ""))
        if not classification.startswith("implemented-now"):
            findings.append(finding("USF-OPT-CI-001", rel(CI_THROUGHPUT), f"candidate {candidate_id} must be implemented now"))
    for candidate_id, candidate in by_id.items():
        classification = str(candidate.get("classification", ""))
        if not classification.startswith("implemented-now") and not candidate.get("reason"):
            findings.append(finding("USF-OPT-CI-001", rel(CI_THROUGHPUT), f"candidate {candidate_id} needs defer/reject/decision rationale"))

    cache = ci.get("cacheAndArtifactSafety", {})
    if not isinstance(cache, dict):
        findings.append(finding("USF-OPT-CI-002", rel(CI_THROUGHPUT), "cacheAndArtifactSafety must be an object"))
        cache = {}
    required_false = [
        "restoreKeysUsed",
        "pullRequestCacheWritesAllowed",
        "cacheHitSatisfiesValidation",
        "artifactReuseIntroduced",
        "artifactUploadIntroduced",
        "generatedReportsPromotedToAuthority",
    ]
    for key in required_false:
        if cache.get(key) is not False:
            findings.append(finding("USF-OPT-CI-002", rel(CI_THROUGHPUT), f"unsafe cache or artifact field must be false: {key}"))
    if cache.get("mainCacheWritesAllowed") is not True:
        findings.append(finding("USF-OPT-CI-002", rel(CI_THROUGHPUT), "main cache writes must be explicit"))
    forbidden_scopes = set(cache.get("forbiddenCacheScopes", []))
    for required in ["node_modules", "evidence", "generated reports", "artifacts", "secrets", "proof payloads"]:
        if required not in forbidden_scopes:
            findings.append(finding("USF-OPT-CI-002", rel(CI_THROUGHPUT), f"forbidden cache scope missing: {required}"))

    affected = ci.get("affectedDomainMap", {})
    if not isinstance(affected, dict):
        findings.append(finding("USF-OPT-CI-006", rel(CI_THROUGHPUT), "affectedDomainMap must be an object"))
        affected = {}
    if affected.get("enforcementMode") != "warn-only" or affected.get("hardCiBlock") is not False:
        findings.append(finding("USF-OPT-CI-006", rel(CI_THROUGHPUT), "affected-domain map must remain warn-only with hardCiBlock false"))
    fallbacks = set(affected.get("mandatoryFallbackClasses", []))
    for required in ["unknown path", "workflow file change", "package manager or lockfile change", "proof-cockpit machine evidence change", "provider mode ambiguity", "environment ambiguity"]:
        if required not in fallbacks:
            findings.append(finding("USF-OPT-CI-006", rel(CI_THROUGHPUT), f"affected-domain mandatory fallback missing: {required}"))

    proof = ci.get("proofCockpitFreshnessBoundary", {})
    if not isinstance(proof, dict):
        findings.append(finding("USF-OPT-CI-007", rel(CI_THROUGHPUT), "proofCockpitFreshnessBoundary must be an object"))
        proof = {}
    proof_expectations = {
        "rePinRequiredByThisChange": True,
        "freshnessWeakened": False,
        "generatedReportMaySatisfyFreshness": False,
        "missingCollectedEvidenceFailsClosed": True,
        "staleEvidenceSatisfiesPass": False,
        "unknownEvidenceSatisfiesPass": False,
    }
    for key, expected in proof_expectations.items():
        if proof.get(key) is not expected:
            findings.append(finding("USF-OPT-CI-007", rel(CI_THROUGHPUT), f"proof-cockpit freshness field must be {expected}: {key}"))
    re_pin = proof.get("rePinEvidence")
    if not isinstance(re_pin, dict):
        findings.append(finding("USF-OPT-CI-007", rel(CI_THROUGHPUT), "proof-cockpit rePinEvidence must be recorded"))
    else:
        required_repin_values = {
            "proofEvidenceStore": "evidence/proof-evidence/proof-cockpit/staging-evidence-store.json",
            "externalReviewBundleManifest": "evidence/proof-evidence/proof-cockpit/external-review-bundle/manifest.json",
            "promotionCommand": "make proof-review-repin",
            "validationCommand": "corepack pnpm proof-cockpit:validate",
            "exactSourceTreeHashRecordedInProofEvidence": True,
            "generatedReportsMaySubstitute": False,
        }
        for key, expected in required_repin_values.items():
            if re_pin.get(key) != expected:
                findings.append(finding("USF-OPT-CI-007", rel(CI_THROUGHPUT), f"proof-cockpit rePinEvidence mismatch for {key}"))

    callback = ci.get("callbackAndCaddyDecision", {})
    if not isinstance(callback, dict):
        findings.append(finding("USF-OPT-CI-008", rel(CI_THROUGHPUT), "callbackAndCaddyDecision must be an object"))
        callback = {}
    if callback.get("decision") != "no-change" or callback.get("callbackPayloadsAreAuthority") is not False:
        findings.append(finding("USF-OPT-CI-008", rel(CI_THROUGHPUT), "callback and Caddy decision must remain no-change and non-authoritative"))

    runners = ci.get("runnerDecisions", {})
    if not isinstance(runners, dict):
        findings.append(finding("USF-OPT-CI-009", rel(CI_THROUGHPUT), "runnerDecisions must be an object"))
        runners = {}
    for key in ["selfHostedRunner", "largerGithubHostedRunner"]:
        decision = runners.get(key, {})
        if not isinstance(decision, dict) or decision.get("classification") != "decision-required" or decision.get("adopted") is not False:
            findings.append(finding("USF-OPT-CI-009", rel(CI_THROUGHPUT), f"runner option must require a decision and remain unadopted: {key}"))

    branch = ci.get("branchProtectionMap", {})
    if not isinstance(branch, dict):
        findings.append(finding("USF-OPT-CI-003", rel(CI_THROUGHPUT), "branchProtectionMap must be an object"))
        branch = {}
    if "validate" not in branch.get("observedRequiredContexts", []):
        findings.append(finding("USF-OPT-CI-003", rel(CI_THROUGHPUT), "branch protection map must preserve validate required context"))
    branch_false = ["requiredCheckWeakened", "proofAnchorRequiredForPullRequest", "branchProtectionMutationMade"]
    for key in branch_false:
        if branch.get(key) is not False:
            findings.append(finding("USF-OPT-CI-003", rel(CI_THROUGHPUT), f"branch protection field must be false: {key}"))
    if branch.get("workflowJobIdPreserved") != "validate" or branch.get("workflowJobContextPreserved") is not True:
        findings.append(finding("USF-OPT-CI-003", rel(CI_THROUGHPUT), "workflow validate job context must be preserved"))

    timing_ref = ci.get("timingEvidence", {})
    if not isinstance(timing_ref, dict):
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "timingEvidence must be an object"))
        timing_ref = {}
    if timing_ref.get("generatedReport") != rel(CI_TIMING):
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "timing evidence must reference generated timing report"))
    if timing_ref.get("baselineRepresentativeDurationSeconds", 0) <= 0 or timing_ref.get("timingClaimMade") is not False:
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "timing baseline must be positive and timing claims must remain false"))
    cache_boundary = ci.get("cacheObservationBoundary", {})
    if not isinstance(cache_boundary, dict):
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "cacheObservationBoundary must be an object"))
        cache_boundary = {}
    if cache_boundary.get("blankCacheHitAllowed") is not False:
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "blank cache-hit values must be rejected"))
    if cache_boundary.get("cacheHitSatisfiesValidation") is not False:
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "cache hits must not satisfy validation"))
    required_runtime_fields = {
        "lookupAttempted",
        "cacheHit",
        "cacheWriteAllowed",
        "cacheWriteAttempted",
        "cacheWriteSkippedReason",
    }
    if not required_runtime_fields.issubset(set(cache_boundary.get("requiredRuntimeFields", []))):
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "cache observation boundary lacks required runtime fields"))
    if set(cache_boundary.get("appliesToPackageManagers", [])) != {"pnpm", "pip"}:
        findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), "cache observation boundary must cover pnpm and pip"))
    cache_templates = {
        "pullRequestExecutedLookupTemplate": {
            "lookupAttempted": True,
            "cacheHit": False,
            "cacheWriteAllowed": False,
            "cacheWriteAttempted": False,
            "cacheWriteSkippedReason": "pull-request-read-only",
        },
        "trustedMainCacheMissTemplate": {
            "lookupAttempted": True,
            "cacheHit": False,
            "cacheWriteAllowed": True,
            "cacheWriteAttempted": True,
            "cacheWriteSkippedReason": "not-skipped-cache-miss",
        },
        "trustedMainCacheHitTemplate": {
            "lookupAttempted": True,
            "cacheHit": True,
            "cacheWriteAllowed": True,
            "cacheWriteAttempted": False,
            "cacheWriteSkippedReason": "cache-hit",
        },
        "untrustedManualRunTemplate": {
            "lookupAttempted": False,
            "cacheHit": False,
            "cacheWriteAllowed": False,
            "cacheWriteAttempted": False,
            "cacheWriteSkippedReason": "non-main-untrusted-ref",
        },
    }
    for template_name, expected_values in cache_templates.items():
        template = cache_boundary.get(template_name)
        if not isinstance(template, dict):
            findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), f"cache observation template missing: {template_name}"))
            continue
        for bool_key in ["lookupAttempted", "cacheHit", "cacheWriteAllowed", "cacheWriteAttempted"]:
            if not isinstance(template.get(bool_key), bool):
                findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), f"cache observation field must be boolean: {template_name}.{bool_key}"))
        reason = template.get("cacheWriteSkippedReason")
        if not isinstance(reason, str) or not reason:
            findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), f"cache skipped reason must be non-empty: {template_name}"))
        for key, expected in expected_values.items():
            if template.get(key) != expected:
                findings.append(finding("USF-OPT-CI-004", rel(CI_THROUGHPUT), f"cache observation template mismatch: {template_name}.{key}"))
    timing_refs = refs(timing)
    baseline_seconds = None
    after_status = None
    after_seconds = None
    after_run = None
    for ref in timing_refs:
        if ref.startswith("baseline-duration-seconds:"):
            value = ref.split(":", 1)[1]
            if value.isdigit():
                baseline_seconds = int(value)
        elif ref.startswith("after-status:"):
            after_status = ref.split(":", 1)[1]
        elif ref.startswith("after-duration-seconds:"):
            value = ref.split(":", 1)[1]
            if value.isdigit():
                after_seconds = int(value)
        elif ref.startswith("after-run:"):
            after_run = ref.split(":", 1)[1]

    closure = ci.get("closureReport", {})
    if not isinstance(closure, dict):
        findings.append(finding("USF-OPT-CI-010", rel(CI_THROUGHPUT), "closureReport must be an object"))
        closure = {}
    for key in [
        "candidateClassificationComplete",
        "implementedNowCandidatesImplemented",
        "deferredOrRejectedCandidatesHaveRationale",
        "caddyAndCallbackDecisionRecorded",
        "selfHostedAndLargerRunnerDecisionRecorded",
        "proofEvidenceChurnAddressed",
        "branchProtectionCompatibilityRecorded",
        "timingBeforeRecorded",
    ]:
        if closure.get(key) is not True:
            findings.append(finding("USF-OPT-CI-010", rel(CI_THROUGHPUT), f"closure field must be true: {key}"))
    if closure.get("timingAfterRecorded") is True and after_status != "observed":
        findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), "timingAfterRecorded cannot be true until after timing is observed"))
    if closure.get("linearCompletionReady") is True and closure.get("validationComplete") is not True:
        findings.append(finding("USF-OPT-CI-010", rel(CI_THROUGHPUT), "linear completion cannot be ready before validation is complete"))

    if timing.get("authorityLevel") != "generated-report":
        findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), "CI timing evidence authorityLevel must be generated-report"))
    if baseline_seconds is None or baseline_seconds <= 0:
        findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), "CI timing baseline must include a positive representative duration evidence ref"))
    if after_status not in {"pending-github-pr-run", "observed", "external-operational-record-required"}:
        findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), "CI timing after-status ref must be pending-github-pr-run, observed, or external-operational-record-required"))
    if after_status == "observed" and (not after_run or after_run == "pending" or after_seconds is None or after_seconds <= 0):
        findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), "observed CI after timing requires after-run and positive after-duration-seconds refs"))
    if after_status == "external-operational-record-required" and "fixed-point-source-churn-avoided:true" not in timing_refs:
        findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), "external CI timing records must preserve fixed-point churn avoidance evidence"))
    if "hard-ci-block:false" not in timing_refs or "speedup-claim-made:false" not in timing_refs:
        findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), "CI timing comparison must remain warn-only with no speedup claim"))
    for required in [
        "issue:USF-1037",
        "required-check:validate",
        "cache-hit-satisfies-validation:false",
        "generated-report-authority:false",
        "branch-protection-required-context-preserved:true",
        "hard-ci-block:false",
    ]:
        if required not in timing_refs:
            findings.append(finding("USF-OPT-CI-004", rel(CI_TIMING), f"CI timing evidence ref missing: {required}"))

    try:
        workflow = workflow_data(workflow_source)
    except (yaml.YAMLError, ValueError) as exc:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), f"validate-spec workflow must parse as YAML: {exc}"))
        workflow = {}
    jobs = workflow.get("jobs", {}) if isinstance(workflow, dict) else {}
    validate_job = jobs.get("validate", {}) if isinstance(jobs, dict) else {}
    if not validate_job:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "validate job must exist to preserve required status context"))
    concurrency = workflow.get("concurrency", {}) if isinstance(workflow, dict) else {}
    if "pull_request" not in str(concurrency.get("cancel-in-progress", "")):
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "concurrency cancellation must be pull-request scoped"))
    steps = validate_job.get("steps", []) if isinstance(validate_job, dict) else []
    step_names = {str(step.get("name", "")) for step in steps if isinstance(step, dict)}
    for required_step in [
        "Restore pnpm store cache (PR read-only)",
        "Restore pnpm store cache (main writable)",
        "Restore pip download cache (PR read-only)",
        "Restore pip download cache (main writable)",
        "Report generated CI timing boundary",
    ]:
        if required_step not in step_names:
            findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), f"workflow missing CI throughput step: {required_step}"))
    if "restore-keys" in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "workflow must not use broad cache restore-keys"))
    for forbidden in ["node_modules", "site-packages", "virtualenv", "evidence/generated-reports", "artifacts/proof-cockpit"]:
        if forbidden in workflow_source:
            findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), f"workflow must not cache forbidden scope: {forbidden}"))
    if "actions/cache/restore@v4" not in workflow_source or "actions/cache@v4" not in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "workflow must use read-only PR cache restore and writable main cache actions"))
    if "workflow_dispatch" not in workflow_source or "github.ref == 'refs/heads/main'" not in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "manual cache warm path must be limited to trusted main cache writes"))
    if "fetch-depth: 0" in workflow_source or "fetch-depth: 2" not in workflow_source or "refs/remotes/origin/$BASE_REF" not in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "workflow must avoid full-history checkout and explicitly fetch the PR base ref"))
    if "--unshallow" not in workflow_source or "git diff --name-status" not in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "workflow must fail closed to fuller checkout when PR diff refs are missing"))
    if "cache_hit_value()" not in workflow_source or "*) printf false ;;" not in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "workflow must normalise empty cache-hit outputs to false"))
    if 'pnpm_cache_hit_main="not-applicable"' not in workflow_source or 'pip_cache_hit_main="not-applicable"' not in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "PR cache diagnostics must explicitly mark non-executed main cache hits as not-applicable"))
    for summary_field in [
        "pnpmCacheLookupAttempted",
        "pnpmCacheHit",
        "pnpmCacheHitPr",
        "pnpmCacheHitMain",
        "pnpmCacheWriteAllowed",
        "pnpmCacheWriteAttempted",
        "pnpmCacheWriteSkippedReason",
        "pipCacheLookupAttempted",
        "pipCacheHit",
        "pipCacheHitPr",
        "pipCacheHitMain",
        "pipCacheWriteAllowed",
        "pipCacheWriteAttempted",
        "pipCacheWriteSkippedReason",
    ]:
        if summary_field not in workflow_source:
            findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), f"workflow summary missing cache field: {summary_field}"))
    if "corepack pnpm install --prefer-offline --frozen-lockfile" not in workflow_source:
        findings.append(finding("USF-OPT-CI-005", rel(VALIDATE_WORKFLOW), "workflow must keep frozen pnpm install with prefer-offline cache use"))
    return findings


def validate() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    findings.extend(check_reports())
    findings.extend(check_repository_artifacts())
    findings.extend(check_ci_throughput_artifacts())
    return findings


def selftest() -> list[dict[str, str]]:
    tests = []
    affected = load_json(REPORTS["USF-999"])
    mutated_affected = copy.deepcopy(affected)
    for item in mutated_affected.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "hard-ci-block:false"]
    tests.append(("affected-run-hard-block", check_reports({"USF-999": mutated_affected}), "USF-OPT-002"))

    compose = load_json(REPORTS["USF-1001"])
    mutated_compose = copy.deepcopy(compose)
    for item in mutated_compose.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "testcontainers:evaluated-not-adopted"]
    tests.append(("testcontainers-adopted", check_reports({"USF-1001": mutated_compose}), "USF-OPT-003"))

    policy = load_json(LINEAR_POLICY)
    mutated_policy = copy.deepcopy(policy)
    mutated_policy["linearFollowUpDeliveryRules"]["deferredBlockedAndUnresolvedWorkDeliveredAsLaterLinearIssues"] = False
    tests.append(("linear-follow-up-issues-disabled", check_repository_artifacts(linear_policy=mutated_policy), "USF-OPT-007"))

    package = load_json(PACKAGE)
    mutated_package = copy.deepcopy(package)
    mutated_package["scripts"]["repo:affected"] = "python3 tools/repository-optimisation/realise-bounded-optimisation.py affected-run"
    tests.append(("affected-script-weakened", check_repository_artifacts(package=mutated_package), "USF-OPT-009"))

    json_reuse = load_json(REPORTS["USF-997"])
    mutated_json_reuse = copy.deepcopy(json_reuse)
    for item in mutated_json_reuse.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "validator-equivalence:passed"]
    tests.append(("json-reuse-equivalence-missing", check_reports({"USF-997": mutated_json_reuse}), "USF-OPT-008"))

    path_inventory = load_json(REPORTS["USF-998"])
    mutated_path_inventory = copy.deepcopy(path_inventory)
    for item in mutated_path_inventory.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "coverage-equivalence:passed"]
    tests.append(("path-inventory-equivalence-missing", check_reports({"USF-998": mutated_path_inventory}), "USF-OPT-008"))

    affected = load_json(REPORTS["USF-999"])
    mutated_affected = copy.deepcopy(affected)
    for item in mutated_affected.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "unknown-path-negative-control:full-gate-fallback"]
    tests.append(("affected-negative-control-missing", check_reports({"USF-999": mutated_affected}), "USF-OPT-008"))

    screenshot = load_json(REPORTS["USF-1000"])
    mutated_screenshot = copy.deepcopy(screenshot)
    for item in mutated_screenshot.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "delete-artifacts:false"]
    tests.append(("screenshot-retention-delete-boundary-missing", check_reports({"USF-1000": mutated_screenshot}), "USF-OPT-008"))

    compose = load_json(REPORTS["USF-1001"])
    mutated_compose = copy.deepcopy(compose)
    for item in mutated_compose.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "startup-measurement-requested:true"]
    tests.append(("compose-startup-measurement-missing", check_reports({"USF-1001": mutated_compose}), "USF-OPT-008"))


    nonlocal_data = load_json(NON_LOCAL_EVALUATION)
    mutated_nonlocal = copy.deepcopy(nonlocal_data)
    mutated_nonlocal["evaluationScope"]["adoptionBoundary"] = True
    tests.append(("non-local-adoption-boundary-mutated", check_repository_artifacts(non_local_evaluation=mutated_nonlocal), "USF-OPT-010"))

    nonlocal_report = load_json(REPORTS["USF-1007"])
    mutated_nonlocal_report = copy.deepcopy(nonlocal_report)
    for item in mutated_nonlocal_report.get("findings", []):
        if isinstance(item, dict):
            item["evidenceRefs"] = [ref for ref in item.get("evidenceRefs", []) if ref != "testcontainers-comparison-criteria:defined"]
    tests.append(("non-local-report-comparison-missing", check_reports({"USF-1007": mutated_nonlocal_report}), "USF-OPT-008"))

    ci = load_json(CI_THROUGHPUT)
    mutated_ci = copy.deepcopy(ci)
    mutated_ci["candidateMatrix"] = [item for item in mutated_ci["candidateMatrix"] if item.get("id") != "M"]
    tests.append(("ci-candidate-missing", check_ci_throughput_artifacts(ci_data=mutated_ci), "USF-OPT-CI-001"))

    mutated_ci = copy.deepcopy(ci)
    mutated_ci["cacheAndArtifactSafety"]["cacheHitSatisfiesValidation"] = True
    tests.append(("ci-cache-hit-authoritative", check_ci_throughput_artifacts(ci_data=mutated_ci), "USF-OPT-CI-002"))

    mutated_ci = copy.deepcopy(ci)
    mutated_ci["branchProtectionMap"]["requiredCheckWeakened"] = True
    tests.append(("ci-required-check-weakened", check_ci_throughput_artifacts(ci_data=mutated_ci), "USF-OPT-CI-003"))

    timing = load_json(CI_TIMING)
    mutated_timing = copy.deepcopy(timing)
    mutated_timing["authorityLevel"] = "semantic-definition"
    tests.append(("ci-timing-authority-overclaim", check_ci_throughput_artifacts(timing_data=mutated_timing), "USF-OPT-CI-004"))

    mutated_ci = copy.deepcopy(ci)
    mutated_ci["cacheObservationBoundary"]["pullRequestExecutedLookupTemplate"]["cacheHit"] = ""
    tests.append(("ci-timing-blank-cache-hit", check_ci_throughput_artifacts(ci_data=mutated_ci), "USF-OPT-CI-004"))

    workflow_text = VALIDATE_WORKFLOW.read_text(encoding="utf-8")
    mutated_workflow = workflow_text + "\n# planted unsafe cache widening\nrestore-keys: unsafe\n"
    tests.append(("ci-workflow-restore-keys", check_ci_throughput_artifacts(workflow_text=mutated_workflow), "USF-OPT-CI-005"))

    mutated_workflow = workflow_text.replace("cache_hit_value()", "cache_hit_value_missing()")
    tests.append(("ci-workflow-cache-hit-normalisation", check_ci_throughput_artifacts(workflow_text=mutated_workflow), "USF-OPT-CI-005"))

    mutated_workflow = workflow_text.replace('pnpm_cache_hit_main="not-applicable"', 'pnpm_cache_hit_main=""')
    tests.append(("ci-workflow-pr-main-cache-hit-diagnostic", check_ci_throughput_artifacts(workflow_text=mutated_workflow), "USF-OPT-CI-005"))

    mutated_workflow = workflow_text.replace("fetch-depth: 2", "fetch-depth: 0")
    tests.append(("ci-workflow-full-history-checkout", check_ci_throughput_artifacts(workflow_text=mutated_workflow), "USF-OPT-CI-005"))

    mutated_ci = copy.deepcopy(ci)
    mutated_ci["affectedDomainMap"]["hardCiBlock"] = True
    tests.append(("ci-affected-hard-block", check_ci_throughput_artifacts(ci_data=mutated_ci), "USF-OPT-CI-006"))

    mutated_ci = copy.deepcopy(ci)
    mutated_ci["proofCockpitFreshnessBoundary"]["generatedReportMaySatisfyFreshness"] = True
    tests.append(("ci-proof-cockpit-generated-report-authority", check_ci_throughput_artifacts(ci_data=mutated_ci), "USF-OPT-CI-007"))

    mutated_ci = copy.deepcopy(ci)
    mutated_ci["proofCockpitFreshnessBoundary"]["rePinEvidence"]["generatedReportsMaySubstitute"] = True
    tests.append(("ci-proof-cockpit-repin-evidence-weakened", check_ci_throughput_artifacts(ci_data=mutated_ci), "USF-OPT-CI-007"))

    findings: list[dict[str, str]] = []
    for name, observed, expected in tests:
        if not any(item.get("ruleId") == expected for item in observed):
            findings.append(finding("USF-OPT-SELFTEST", name, f"selftest did not trigger {expected}"))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    findings = selftest() if args.mode == "selftest" else validate()
    payload = {"mode": args.mode, "findings": findings}
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for item in findings:
            print(f"{item['ruleId']} {item['subject']}: {item['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
