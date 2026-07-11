#!/usr/bin/env python3
"""Validate the USF-1086 Dev Compose Provider Dependency and Profile Matrix (child of USF-1074).

Fails closed. The matrix (docs/architecture/provider-dependency-profile-matrix.json) is a lower-authority
supporting map. It records, for every compose-service provider across all classes, its dependency, profile,
startup/teardown, readiness, port, secret, persistent-state and cleanup boundaries, and asserts no
live/staging/production/supplier/deployment/compliance readiness.

This validator cross-checks the matrix against itself and against two authoritative inputs:
  * spec/instances/compose-service/service-catalogue.json (providers, ports, volumes, secret placeholders)
  * docs/architecture/provider-consolidation-map.json (provider classification, resolved via classificationRef)

Rule family USF-PROVIDER-DEP-NNN. Every rule has exactly one planted-defect fixture under planted-defects/
that carries a data-driven mutation; `selftest` loads each fixture, applies its mutation to a copy of the real
matrix, and asserts the expected rule fires, while asserting the real matrix passes with zero findings.

This validator is read-only and writes no runtime file.
"""

from __future__ import annotations

import copy
import json
import re
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

MATRIX_PATH = DOCS / "provider-dependency-profile-matrix.json"
CATALOGUE_PATH = ROOT / "spec" / "instances" / "compose-service" / "service-catalogue.json"
CONSOLIDATION_PATH = DOCS / "provider-consolidation-map.json"

RULE_IDS = [f"USF-PROVIDER-DEP-{index:03d}" for index in range(1, 23)]

ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "ownerIssueId", "parentIssueId", "authorityLevel",
    "authorityBoundary", "createdDate", "providerCount", "nonClaims", "evidenceScoping", "providers",
]

REQUIRED_PROVIDER_KEYS = {
    "canonicalIdentity": str, "displayName": str, "providerMode": str, "classificationRef": dict,
    "profileMembership": str, "profileGatingCondition": str, "directDependencies": list,
    "transitiveDependencies": list, "startupPrerequisites": list, "startupOrder": int,
    "healthCondition": str, "readinessCondition": str, "readinessDependencies": list,
    "teardownPrerequisites": list, "teardownOrder": int, "cleanupResponsibility": str,
    "persistentState": list, "ephemeralState": list, "portBoundary": dict, "secretBoundary": dict,
    "syntheticDataRequirement": str, "evidenceCapturePoint": str, "proofObligation": str,
    "failureBehaviour": str, "promotionProhibition": str,
}

REQUIRED_NONCLAIMS_SUBSTRINGS = [
    "live-provider-readiness", "staging-readiness", "production-readiness",
    "supplier-readiness", "deployment-readiness", "compliance-readiness",
]

EVIDENCE_SCOPED_BY = ["provider", "providerMode", "environment", "proofRung", "freshness", "dependencyState"]
EVIDENCE_CANNOT_WHEN = ["missing", "unhealthy", "notReady", "incorrectlyProfiled", "stale", "mismatched"]

# Absolute exclusions (task): none of these may appear as data. ownerIssueId/parentIssueId/title are
# external-coordination fields (matching provider-consolidation-map precedent) and are exempted from the
# issue-identifier scan.
FORBIDDEN_LITERALS = [
    "linear.app", "github.com", "gitlab.com", "issueid", "projectid",
    "branchname", "commitsha", "refs/heads",
]
ISSUE_ID_RE = re.compile(r"usf-\d+")
EXEMPT_TOP_KEYS = {"ownerIssueId", "parentIssueId", "title", "id"}

# Provider readiness overclaim phrases scanned only on readiness/health fields (rule 021).
OVERCLAIM_PHRASES = [
    "production-ready", "production ready", "staging-ready", "staging ready",
    "live-provider-ready", "live provider ready", "supplier-ready", "supplier ready",
    "deployment-ready", "deployment ready", "compliance-ready", "compliance ready",
    "live-provider-readiness-proven",
]

# Real-secret-literal heuristics (rule 016) — approved placeholders are whitelisted before scanning.
SECRET_LITERAL_RES = [
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"xox[baprs]-[0-9A-Za-z-]{10,}"),
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    re.compile(r"\bghp_[0-9A-Za-z]{20,}\b"),
    re.compile(r"\b[0-9a-f]{40,}\b"),
]

UNAVAILABLE_CLASSIFICATIONS = {"deferred", "rejected", "test-staging-live-only"}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    data["matrix"] = load_json(MATRIX_PATH)
    catalogue = load_json(CATALOGUE_PATH)
    services = {s.get("serviceId"): s for s in catalogue.get("services", []) if s.get("serviceId")}
    data["services"] = services
    data["approvedSecrets"] = set(catalogue.get("approvedLocalSecretPlaceholders", []))
    # per-service catalogue published host ports and persistent volume names
    cat_ports: dict[str, set[int]] = {}
    cat_all_ports: set[int] = set()
    cat_persistent: dict[str, set[str]] = {}
    for sid, s in services.items():
        ports = {p.get("publishedPort") for p in s.get("ports", []) if p.get("publishedPort") is not None}
        cat_ports[sid] = ports
        cat_all_ports |= ports
        vols = {
            v.get("name") for v in s.get("volumes", [])
            if "persistent" in (v.get("lifecycle") or "") or "shared-long-lived" in (v.get("lifecycle") or "")
        }
        cat_persistent[sid] = {v for v in vols if v}
    data["catPorts"] = cat_ports
    data["catAllPorts"] = cat_all_ports
    data["catPersistent"] = cat_persistent
    consolidation = load_json(CONSOLIDATION_PATH)
    data["classification"] = {
        p.get("providerId"): p.get("classification") for p in consolidation.get("providers", [])
    }
    data["promotion"] = {
        p.get("providerId"): str(p.get("promotionRecommendation", "")) for p in consolidation.get("providers", [])
    }
    data["planted"] = []
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def providers(data: dict[str, Any]) -> list[dict[str, Any]]:
    return data["matrix"].get("providers", [])


def provider_ids(data: dict[str, Any]) -> set[str]:
    return {p.get("canonicalIdentity") for p in providers(data)}


def _by_id(data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {p.get("canonicalIdentity"): p for p in providers(data)}


def _reachable(by_id: dict[str, dict[str, Any]], start: str) -> set[str]:
    """Nodes reachable from start via directDependencies (known ids, ignoring self-loops)."""
    seen: set[str] = set()
    stack = [d for d in by_id.get(start, {}).get("directDependencies", []) if d in by_id and d != start]
    while stack:
        node = stack.pop()
        if node in seen:
            continue
        seen.add(node)
        for d in by_id.get(node, {}).get("directDependencies", []):
            if d in by_id and d != node:
                stack.append(d)
    return seen


def _edge_in_cycle(by_id: dict[str, dict[str, Any]], parent: str, dep: str) -> bool:
    """True if parent->dep participates in a cycle (dep can reach parent)."""
    return parent != dep and parent in _reachable(by_id, dep)


# --------------------------------------------------------------------------- meta rules


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    doc = data["matrix"]
    for field in ENVELOPE_FIELDS:
        if field not in doc or doc.get(field) in (None, ""):
            failures.append(fail("USF-PROVIDER-DEP-001", f"missing envelope field {field}", field))
    if doc.get("id") != "provider-dependency-profile-matrix":
        failures.append(fail("USF-PROVIDER-DEP-001", "envelope id must be provider-dependency-profile-matrix", "id"))
    if doc.get("ownerIssueId") != "USF-1086":
        failures.append(fail("USF-PROVIDER-DEP-001", "ownerIssueId must be USF-1086", "ownerIssueId"))
    if doc.get("parentIssueId") != "USF-1074":
        failures.append(fail("USF-PROVIDER-DEP-001", "parentIssueId must be USF-1074", "parentIssueId"))
    if doc.get("authorityLevel") != "semantic-definition-supporting-map":
        failures.append(fail("USF-PROVIDER-DEP-001", "authorityLevel must be semantic-definition-supporting-map", "authorityLevel"))
    if doc.get("createdDate") != "2026-07-11":
        failures.append(fail("USF-PROVIDER-DEP-001", "createdDate must be 2026-07-11", "createdDate"))
    rows = providers(data)
    if doc.get("providerCount") != len(rows):
        failures.append(fail("USF-PROVIDER-DEP-001", f"providerCount {doc.get('providerCount')} != providers {len(rows)}", "providerCount"))
    if not rows:
        failures.append(fail("USF-PROVIDER-DEP-001", "providers must be non-empty", "providers"))
    nonclaims = " ".join(str(c) for c in doc.get("nonClaims", []) or []).lower()
    for token in REQUIRED_NONCLAIMS_SUBSTRINGS:
        if token not in nonclaims:
            failures.append(fail("USF-PROVIDER-DEP-001", f"nonClaims missing required non-claim {token}", "nonClaims"))
    scoping = doc.get("evidenceScoping")
    if not isinstance(scoping, dict):
        failures.append(fail("USF-PROVIDER-DEP-001", "evidenceScoping must be an object", "evidenceScoping"))
    else:
        scoped_by = [str(x) for x in scoping.get("scopedBy", []) or []]
        for dim in EVIDENCE_SCOPED_BY:
            if dim not in scoped_by:
                failures.append(fail("USF-PROVIDER-DEP-001", f"evidenceScoping.scopedBy missing {dim}", "evidenceScoping.scopedBy"))
        cannot = [str(x) for x in scoping.get("cannotSatisfyReadinessWhenDependencyIs", []) or []]
        for cond in EVIDENCE_CANNOT_WHEN:
            if cond not in cannot:
                failures.append(fail("USF-PROVIDER-DEP-001", f"evidenceScoping.cannotSatisfyReadinessWhenDependencyIs missing {cond}", "evidenceScoping"))
    return failures


def rule_002_absolute_exclusions(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    scan_copy = copy.deepcopy(data["matrix"])
    for key in EXEMPT_TOP_KEYS:
        scan_copy.pop(key, None)
    blob = json.dumps(scan_copy, sort_keys=True).lower()
    for token in FORBIDDEN_LITERALS:
        if token in blob:
            failures.append(fail("USF-PROVIDER-DEP-002", f"forbidden token present as data: {token!r}", "matrix"))
    if ISSUE_ID_RE.search(blob):
        failures.append(fail("USF-PROVIDER-DEP-002", "issue identifier (USF-<digits>) used as data outside coordination fields", "matrix"))
    return failures


def rule_003_provider_records(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    ids = [p.get("canonicalIdentity") for p in providers(data)]
    if len(ids) != len(set(ids)):
        failures.append(fail("USF-PROVIDER-DEP-003", "duplicate canonicalIdentity", "providers"))
    services = data["services"]
    classification = data["classification"]
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        for key, typ in REQUIRED_PROVIDER_KEYS.items():
            if key not in provider:
                failures.append(fail("USF-PROVIDER-DEP-003", f"provider {pid!r} missing key {key}", f"providers[{index}].{key}"))
            elif not isinstance(provider.get(key), typ) or isinstance(provider.get(key), bool) and typ is int:
                failures.append(fail("USF-PROVIDER-DEP-003", f"provider {pid!r} key {key} has wrong type", f"providers[{index}].{key}"))
        if pid not in services:
            failures.append(fail("USF-PROVIDER-DEP-003", f"provider {pid!r} is not a known compose-service catalogue serviceId", f"providers[{index}].canonicalIdentity"))
        ref = provider.get("classificationRef", {})
        ref_id = ref.get("providerId") if isinstance(ref, dict) else None
        if ref_id not in classification:
            failures.append(fail("USF-PROVIDER-DEP-003", f"provider {pid!r} classificationRef {ref_id!r} not resolvable in provider-consolidation-map", f"providers[{index}].classificationRef"))
    return failures


# --------------------------------------------------------------------------- dependency rules


def rule_004_unknown_dependency(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    known = provider_ids(data)
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        for field in ("directDependencies", "transitiveDependencies", "readinessDependencies"):
            for dep in provider.get(field, []) or []:
                if dep not in known:
                    failures.append(fail("USF-PROVIDER-DEP-004", f"provider {pid!r} {field} references unknown provider {dep!r}", f"providers[{index}].{field}"))
    return failures


def rule_005_self_dependency(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        for field in ("directDependencies", "transitiveDependencies", "readinessDependencies"):
            if pid in (provider.get(field, []) or []):
                failures.append(fail("USF-PROVIDER-DEP-005", f"provider {pid!r} depends on itself in {field}", f"providers[{index}].{field}"))
    return failures


def rule_006_dependency_cycle(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    by_id = _by_id(data)
    seen_pairs: set[tuple[str, str]] = set()
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        for dep in provider.get("directDependencies", []) or []:
            if dep in by_id and dep != pid and _edge_in_cycle(by_id, pid, dep):
                pair = tuple(sorted((pid, dep)))
                if pair not in seen_pairs:
                    seen_pairs.add(pair)
                    failures.append(fail("USF-PROVIDER-DEP-006", f"dependency cycle involving {pid!r} and {dep!r}", f"providers[{index}].directDependencies"))
    return failures


def rule_007_missing_profile_membership(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if not str(provider.get("profileMembership", "")).strip():
            failures.append(fail("USF-PROVIDER-DEP-007", f"provider {provider.get('canonicalIdentity')!r} has empty profileMembership", f"providers[{index}].profileMembership"))
    return failures


def rule_008_missing_profile_gating(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    classification = data["classification"]
    for index, provider in enumerate(providers(data)):
        ref = provider.get("classificationRef", {}) or {}
        cls = classification.get(ref.get("providerId"))
        if cls == "profile-gated" and not str(provider.get("profileGatingCondition", "")).strip():
            failures.append(fail("USF-PROVIDER-DEP-008", f"profile-gated provider {provider.get('canonicalIdentity')!r} has no profileGatingCondition", f"providers[{index}].profileGatingCondition"))
    return failures


def rule_009_unavailable_dependency(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    by_id = _by_id(data)
    classification = data["classification"]
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        for dep in provider.get("directDependencies", []) or []:
            if dep not in by_id or dep == pid:
                continue
            ref = by_id[dep].get("classificationRef", {}) or {}
            cls = classification.get(ref.get("providerId"))
            if cls in UNAVAILABLE_CLASSIFICATIONS:
                failures.append(fail("USF-PROVIDER-DEP-009", f"provider {pid!r} requires dependency {dep!r} that is not available in dev compose (classification {cls})", f"providers[{index}].directDependencies"))
    return failures


def rule_010_startup_order(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    by_id = _by_id(data)
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        order = provider.get("startupOrder")
        for dep in provider.get("directDependencies", []) or []:
            if dep not in by_id or dep == pid or _edge_in_cycle(by_id, pid, dep):
                continue
            dep_order = by_id[dep].get("startupOrder")
            if isinstance(order, int) and isinstance(dep_order, int) and not order > dep_order:
                failures.append(fail("USF-PROVIDER-DEP-010", f"provider {pid!r} startupOrder {order} must be greater than dependency {dep!r} startupOrder {dep_order}", f"providers[{index}].startupOrder"))
    return failures


def rule_011_readiness_subset(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        direct = set(provider.get("directDependencies", []) or [])
        for dep in provider.get("readinessDependencies", []) or []:
            if dep not in direct:
                failures.append(fail("USF-PROVIDER-DEP-011", f"provider {pid!r} readinessDependency {dep!r} is not a directDependency", f"providers[{index}].readinessDependencies"))
    return failures


def rule_012_teardown_order(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    by_id = _by_id(data)
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        order = provider.get("teardownOrder")
        for dep in provider.get("directDependencies", []) or []:
            if dep not in by_id or dep == pid or _edge_in_cycle(by_id, pid, dep):
                continue
            dep_order = by_id[dep].get("teardownOrder")
            if isinstance(order, int) and isinstance(dep_order, int) and not order < dep_order:
                failures.append(fail("USF-PROVIDER-DEP-012", f"provider {pid!r} teardownOrder {order} must be less than dependency {dep!r} teardownOrder {dep_order} (dependents torn down first)", f"providers[{index}].teardownOrder"))
    return failures


def rule_013_undeclared_port(data: dict[str, Any]) -> list[dict[str, str]]:
    """A declared host port must be published somewhere in the compose-service catalogue (no fabricated port).
    Two providers sharing a real port in the same profile/env is the collision rule's concern (014)."""
    failures: list[dict[str, str]] = []
    cat_all = data["catAllPorts"]
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        for port in (provider.get("portBoundary", {}) or {}).get("ports", []) or []:
            host = port.get("hostPort")
            if host is not None and host not in cat_all:
                failures.append(fail("USF-PROVIDER-DEP-013", f"provider {pid!r} declares host port {host} not published anywhere in the compose-service catalogue", f"providers[{index}].portBoundary"))
    return failures


def rule_014_port_collision(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    claims: dict[tuple[int, str, str], list[str]] = {}
    for provider in providers(data):
        pid = provider.get("canonicalIdentity")
        for port in (provider.get("portBoundary", {}) or {}).get("ports", []) or []:
            host = port.get("hostPort")
            if host is None:
                continue
            profile = port.get("profile", "default")
            for env in port.get("environments", []) or ["*"]:
                claims.setdefault((host, profile, env), []).append(pid)
    for (host, profile, env), owners in sorted(claims.items()):
        if len(set(owners)) > 1:
            failures.append(fail("USF-PROVIDER-DEP-014", f"host port {host} claimed by multiple providers ({', '.join(sorted(set(owners)))}) in profile {profile!r} env {env!r}", "portBoundary"))
    return failures


def rule_015_undeclared_secret(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    approved = data["approvedSecrets"]
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        for ref in (provider.get("secretBoundary", {}) or {}).get("placeholderRefs", []) or []:
            if ref not in approved:
                failures.append(fail("USF-PROVIDER-DEP-015", f"provider {pid!r} secret placeholder {ref!r} is not an approved local secret placeholder", f"providers[{index}].secretBoundary.placeholderRefs"))
    return failures


def rule_016_embedded_secret(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    approved = data["approvedSecrets"]

    def scan(value: Any, path: str) -> None:
        if isinstance(value, str):
            if value in approved:
                return
            for rx in SECRET_LITERAL_RES:
                if rx.search(value):
                    failures.append(fail("USF-PROVIDER-DEP-016", f"value looks like an embedded real secret literal (pattern {rx.pattern!r})", path))
                    return
        elif isinstance(value, dict):
            for k, v in value.items():
                scan(v, f"{path}.{k}")
        elif isinstance(value, list):
            for i, v in enumerate(value):
                scan(v, f"{path}[{i}]")

    scan(data["matrix"], "matrix")
    return failures


def rule_017_missing_synthetic(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if not str(provider.get("syntheticDataRequirement", "")).strip():
            failures.append(fail("USF-PROVIDER-DEP-017", f"provider {provider.get('canonicalIdentity')!r} has empty syntheticDataRequirement", f"providers[{index}].syntheticDataRequirement"))
    return failures


def rule_018_hidden_persistent_state(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    cat_persistent = data["catPersistent"]
    for index, provider in enumerate(providers(data)):
        pid = provider.get("canonicalIdentity")
        declared = set(provider.get("persistentState", []) or [])
        for vol in cat_persistent.get(pid, set()):
            if vol not in declared:
                failures.append(fail("USF-PROVIDER-DEP-018", f"provider {pid!r} has a persistent compose volume {vol!r} not declared in persistentState", f"providers[{index}].persistentState"))
    return failures


def rule_019_missing_cleanup(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if not str(provider.get("cleanupResponsibility", "")).strip():
            failures.append(fail("USF-PROVIDER-DEP-019", f"provider {provider.get('canonicalIdentity')!r} has empty cleanupResponsibility", f"providers[{index}].cleanupResponsibility"))
    return failures


def rule_020_unreviewed_promotion(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    promotion = data["promotion"]
    for index, provider in enumerate(providers(data)):
        ref = provider.get("classificationRef", {}) or {}
        recommendation = promotion.get(ref.get("providerId"), "")
        if recommendation.strip().lower().startswith("promote"):
            boundary = str(provider.get("promotionProhibition", "")).lower()
            if not boundary.strip() or "evidence" not in boundary or "confers no" not in boundary:
                failures.append(fail("USF-PROVIDER-DEP-020", f"promotion-recommended provider {provider.get('canonicalIdentity')!r} lacks a repository-owned evidence / non-claim promotionProhibition boundary", f"providers[{index}].promotionProhibition"))
    return failures


def rule_021_readiness_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        blob = " ".join(str(provider.get(field, "")) for field in ("readinessCondition", "healthCondition")).lower()
        for phrase in OVERCLAIM_PHRASES:
            if phrase in blob:
                failures.append(fail("USF-PROVIDER-DEP-021", f"provider {provider.get('canonicalIdentity')!r} readiness/health overclaims: {phrase!r}", f"providers[{index}]"))
    return failures


def rule_022_planted_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        loc = defect.get("_path", defect.get("id", "?"))
        if len(expected) != 1:
            failures.append(fail("USF-PROVIDER-DEP-022", "planted defect must expect exactly one rule", loc))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-PROVIDER-DEP-022", f"planted defect references unknown rule {rule_id}", loc))
            continue
        coverage[rule_id].append(loc)
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-PROVIDER-DEP-022", "planted defect does not require distinct coverage", loc))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-PROVIDER-DEP-022", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-PROVIDER-DEP-001": rule_001_envelope,
    "USF-PROVIDER-DEP-002": rule_002_absolute_exclusions,
    "USF-PROVIDER-DEP-003": rule_003_provider_records,
    "USF-PROVIDER-DEP-004": rule_004_unknown_dependency,
    "USF-PROVIDER-DEP-005": rule_005_self_dependency,
    "USF-PROVIDER-DEP-006": rule_006_dependency_cycle,
    "USF-PROVIDER-DEP-007": rule_007_missing_profile_membership,
    "USF-PROVIDER-DEP-008": rule_008_missing_profile_gating,
    "USF-PROVIDER-DEP-009": rule_009_unavailable_dependency,
    "USF-PROVIDER-DEP-010": rule_010_startup_order,
    "USF-PROVIDER-DEP-011": rule_011_readiness_subset,
    "USF-PROVIDER-DEP-012": rule_012_teardown_order,
    "USF-PROVIDER-DEP-013": rule_013_undeclared_port,
    "USF-PROVIDER-DEP-014": rule_014_port_collision,
    "USF-PROVIDER-DEP-015": rule_015_undeclared_secret,
    "USF-PROVIDER-DEP-016": rule_016_embedded_secret,
    "USF-PROVIDER-DEP-017": rule_017_missing_synthetic,
    "USF-PROVIDER-DEP-018": rule_018_hidden_persistent_state,
    "USF-PROVIDER-DEP-019": rule_019_missing_cleanup,
    "USF-PROVIDER-DEP-020": rule_020_unreviewed_promotion,
    "USF-PROVIDER-DEP-021": rule_021_readiness_overclaim,
    "USF-PROVIDER-DEP-022": rule_022_planted_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


# --------------------------------------------------------------------------- mutation applier (selftest)


def _find_provider(rows: list[dict[str, Any]], pid: str) -> dict[str, Any]:
    for row in rows:
        if row.get("canonicalIdentity") == pid:
            return row
    raise KeyError(pid)


def apply_mutation(data: dict[str, Any], mutation: dict[str, Any]) -> None:
    op = mutation.get("op")
    doc = data["matrix"]
    rows = doc["providers"]
    if op == "setTop":
        doc[mutation["field"]] = mutation["value"]
    elif op == "delTop":
        doc.pop(mutation["field"], None)
    elif op == "setProvider":
        _find_provider(rows, mutation["id"])[mutation["field"]] = mutation["value"]
    elif op == "delProviderField":
        _find_provider(rows, mutation["id"]).pop(mutation["field"], None)
    elif op == "appendList":
        _find_provider(rows, mutation["id"]).setdefault(mutation["field"], []).append(mutation["value"])
    elif op == "appendPort":
        _find_provider(rows, mutation["id"])["portBoundary"].setdefault("ports", []).append(mutation["value"])
    elif op == "appendSecretRef":
        _find_provider(rows, mutation["id"])["secretBoundary"].setdefault("placeholderRefs", []).append(mutation["value"])
    elif op == "setSecretField":
        _find_provider(rows, mutation["id"])["secretBoundary"][mutation["field"]] = mutation["value"]
    elif op == "setPlantedCorpus":
        data["planted"] = mutation["value"]
    else:
        raise ValueError(f"unknown mutation op {op!r}")


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-PROVIDER-DEP-022", "real matrix must pass with zero findings before selftest mutations", "selftest"))
        return failures + clean, results
    covered: set[str] = set()
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        loc = defect.get("_path", defect.get("id", "?"))
        if len(expected) != 1:
            failures.append(fail("USF-PROVIDER-DEP-022", "planted defect must expect exactly one rule", loc))
            continue
        rule_id = expected[0]
        covered.add(rule_id)
        mutated = copy.deepcopy(data)
        try:
            for mutation in defect.get("mutations", []):
                apply_mutation(mutated, mutation)
        except Exception as exc:  # noqa: BLE001 - fail closed on malformed mutation
            failures.append(fail(rule_id, f"planted mutation failed to apply: {exc}", loc))
            continue
        observed = sorted({f["ruleId"] for f in run_all(mutated)})
        fired = rule_id in observed
        results.append({"defect": loc, "expected": rule_id, "observedRuleIds": observed, "fired": fired})
        if not fired:
            failures.append(fail(rule_id, f"planted defect {loc} did not trip its rule (observed {observed})", "selftest"))
    missing = [rule_id for rule_id in RULE_IDS if rule_id not in covered]
    if missing:
        failures.append(fail("USF-PROVIDER-DEP-022", f"rules without a loadable planted defect: {', '.join(missing)}", "planted-defects"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-provider-dependency-matrix",
        "mode": mode,
        "ok": not failures,
        "findingCount": len(failures),
        "findings": failures,
        "rules": RULE_IDS,
    }
    if extra:
        payload.update(extra)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not failures else 1


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in {"all", "selftest"}:
        print("usage: validate-provider-dependency-matrix.py [all|selftest] [--json]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors
        return print_result(mode, [fail("USF-PROVIDER-DEP-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
