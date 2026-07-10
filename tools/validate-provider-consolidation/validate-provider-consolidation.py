#!/usr/bin/env python3
"""Validate the USF-1074 Dev Compose Provider Profile Consolidation map (child of USF-1069).

Fails closed. Enforces that the provider consolidation map:
  * carries a complete, correctly-scoped envelope that preserves its lower authority and USF-1069 parentage,
  * accounts for every provider exactly once and stays consistent with the compose-service catalogue,
  * uses only the allowed provider classification vocabulary and honest classification counts,
  * covers all eighteen required-minimum providers,
  * treats the observability readiness gap honestly: every always-on canonical-dev-compose provider either
    carries recorded readiness/health/teardown proof OR is flagged with recordedReadinessGap and a next rung,
  * never upgrades a canonical dev-compose provider to a live/production readiness claim,
  * keeps every provider on a synthetic-data-only boundary,
  * gives every promotion-recommended provider and every rejected provider a stated reason,
  * carries the full non-claims set and no overclaim strings,
  * and that the planted-defect corpus covers each rule with exactly one distinct defect.

This map is a lower-authority generated summary. It defines no semantics and is lower authority than the
compose manifests, the compose-service catalogue, the semantic contracts, the validators, and runtime proof.
This validator is read-only and writes no runtime file.
"""

from __future__ import annotations

import copy
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

MAP_PATH = DOCS / "provider-consolidation-map.json"
CATALOGUE_PATH = ROOT / "spec" / "instances" / "compose-service" / "service-catalogue.json"

RULE_IDS = [f"USF-PROVIDER-{index:03d}" for index in range(1, 14)]

ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary", "lifecycleState",
    "ownerIssueId", "parentIssueId", "sourceAuthorities", "generatedReportAuthority",
    "currentMainFreshness", "readinessClaims", "nonClaims", "providerCount", "requiredMinimum",
    "classificationCounts", "providers",
]

ALLOWED_CLASSIFICATIONS = {
    "canonical-dev-compose", "profile-gated", "deferred", "rejected", "test-staging-live-only",
}

REQUIRED_PROVIDER_KEYS = [
    "providerId", "displayName", "classification", "classificationReason", "composedProfileStatus",
    "readinessProof", "healthProof", "teardownCleanupProof", "auditProof", "telemetryProof",
    "redactionProof", "syntheticDataBoundary", "dataMigrationBoundary", "nonClaims",
    "recordedReadinessGap", "gapNextRung", "promotionRecommendation",
]

REQUIRED_MINIMUM = [
    "postgres", "keycloak", "mailpit", "minio", "nats", "temporal", "openbao", "clickhouse", "redis",
    "meilisearch", "clamav", "localstack", "wiremock", "webhook-sink", "webhook-sync", "pgbackrest",
    "windmill", "sonarqube",
]

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone",
]

# Marketing / certification overclaims — scanned across the whole document (rule 011).
# Kept disjoint from the canonical live-readiness tokens in rule 006 so a single mutation is unambiguous.
FORBIDDEN_OVERCLAIMS = [
    "production ready", "production-ready", "staging ready", "staging-ready", "deployment ready",
    "deployment-ready", "live-provider ready", "live provider ready", "monetisation ready",
    "monetisation-ready", "iso certified", "iso-certified", "soc 2 certified", "soc2 certified",
    "externally certified", "human acceptance achieved", "compliance readiness achieved",
    "enterprise production ready",
]

# Canonical dev-compose provider live/production upgrade tokens — scanned only on canonical providers'
# proof / profile / reason fields (rule 006). Disjoint from FORBIDDEN_OVERCLAIMS.
CANONICAL_LIVE_TOKENS = [
    "production-live", "production-grade-live", "staging-live", "live-external-provider",
    "live-provider-readiness-proven",
]

NONE_RECORDED = "none-recorded"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    data["map"] = load_json(MAP_PATH)
    catalogue = load_json(CATALOGUE_PATH)
    data["catalogueServiceIds"] = {
        s.get("serviceId") for s in catalogue.get("services", []) if s.get("serviceId")
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
    return data["map"].get("providers", [])


def _first_index(data: dict[str, Any], classification: str) -> int:
    for index, provider in enumerate(providers(data)):
        if provider.get("classification") == classification:
            return index
    return 0


def _first_gap_index(data: dict[str, Any]) -> int:
    for index, provider in enumerate(providers(data)):
        if provider.get("recordedReadinessGap") is True:
            return index
    return 0


def _index_of(data: dict[str, Any], provider_id: str) -> int:
    for index, provider in enumerate(providers(data)):
        if provider.get("providerId") == provider_id:
            return index
    return 0


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    doc = data["map"]
    for field in ENVELOPE_FIELDS:
        if field not in doc or doc.get(field) in (None, ""):
            failures.append(fail("USF-PROVIDER-001", f"map missing envelope field {field}", field))
    if doc.get("id") != "provider-consolidation-map":
        failures.append(fail("USF-PROVIDER-001", "envelope id must be provider-consolidation-map", "id"))
    if doc.get("schemaVersion") != "1.0.0":
        failures.append(fail("USF-PROVIDER-001", "schemaVersion must be 1.0.0", "schemaVersion"))
    if doc.get("ownerIssueId") != "USF-1074":
        failures.append(fail("USF-PROVIDER-001", "ownerIssueId must be USF-1074", "ownerIssueId"))
    if doc.get("parentIssueId") != "USF-1069":
        failures.append(fail("USF-PROVIDER-001", "parentIssueId must be USF-1069", "parentIssueId"))
    if doc.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-PROVIDER-001", "generatedReportAuthority must be lower-authority-summary-only", "generatedReportAuthority"))
    freshness = doc.get("currentMainFreshness", {})
    if not isinstance(freshness, dict) or freshness.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-PROVIDER-001", "currentMainFreshness must preserve lower-authority summary status", "currentMainFreshness"))
    if doc.get("readinessClaims") not in ([], None) and doc.get("readinessClaims"):
        failures.append(fail("USF-PROVIDER-001", "readinessClaims must be empty (classification asserts no readiness)", "readinessClaims"))
    return failures


def rule_002_accounting(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    rows = providers(data)
    declared = data["map"].get("providerCount")
    if declared != len(rows):
        failures.append(fail("USF-PROVIDER-002", f"providerCount {declared} != number of providers {len(rows)}", "providerCount"))
    ids = [p.get("providerId") for p in rows]
    if len(ids) != len(set(ids)):
        failures.append(fail("USF-PROVIDER-002", "duplicate providerId in providers", "providers"))
    for index, provider in enumerate(rows):
        for key in REQUIRED_PROVIDER_KEYS:
            if key not in provider:
                failures.append(fail("USF-PROVIDER-002", f"provider missing required key {key}", f"providers[{index}].{key}"))
    # Catalogue cross-check: every compose-service catalogue serviceId must be covered by exactly the
    # catalogued providers; only non-catalogued placeholders (e.g. the required-minimum webhook-sync) differ.
    catalogue_ids = data["catalogueServiceIds"]
    referenced: set[str] = set()
    catalogued = 0
    for provider in rows:
        service_ids = set(provider.get("serviceCatalogueIds", []) or [])
        referenced |= service_ids
        if service_ids & catalogue_ids:
            catalogued += 1
    resolvable = referenced & catalogue_ids
    if resolvable != catalogue_ids:
        missing = sorted(catalogue_ids - resolvable)
        failures.append(fail("USF-PROVIDER-002", f"providers do not cover every compose-service catalogue service (missing={missing[:5]})", "providers.serviceCatalogueIds"))
    if catalogued != len(catalogue_ids):
        failures.append(fail("USF-PROVIDER-002", f"catalogued provider count {catalogued} != compose-service catalogue count {len(catalogue_ids)}", "providers"))
    return failures


def rule_003_classification(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    actual = Counter()
    for index, provider in enumerate(providers(data)):
        classification = provider.get("classification")
        if classification not in ALLOWED_CLASSIFICATIONS:
            failures.append(fail("USF-PROVIDER-003", f"invalid classification {classification!r}", f"providers[{index}].classification"))
        else:
            actual[classification] += 1
    declared = data["map"].get("classificationCounts", {})
    if dict(actual) != dict(declared):
        failures.append(fail("USF-PROVIDER-003", f"classificationCounts {dict(declared)} != recomputed {dict(actual)}", "classificationCounts"))
    return failures


def rule_004_required_minimum(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = {p.get("providerId") for p in providers(data)}
    missing = [name for name in REQUIRED_MINIMUM if name not in present]
    if missing:
        failures.append(fail("USF-PROVIDER-004", f"required-minimum providers missing: {', '.join(missing)}", "providers"))
    declared = data["map"].get("requiredMinimum", [])
    if set(declared) != set(REQUIRED_MINIMUM):
        failures.append(fail("USF-PROVIDER-004", "envelope requiredMinimum does not match the eighteen required-minimum names", "requiredMinimum"))
    return failures


def rule_005_canonical_readiness_honesty(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY rule: every canonical-dev-compose provider must have recorded readiness/health/teardown proof,
    OR be honestly flagged with recordedReadinessGap and a non-empty gapNextRung."""
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if provider.get("classification") != "canonical-dev-compose":
            continue
        proven = (
            provider.get("readinessProof") not in (None, "", NONE_RECORDED)
            and provider.get("healthProof") not in (None, "", NONE_RECORDED)
            and provider.get("teardownCleanupProof") not in (None, "", NONE_RECORDED)
        )
        flagged = provider.get("recordedReadinessGap") is True and bool(str(provider.get("gapNextRung", "")).strip())
        if not (proven or flagged):
            failures.append(fail(
                "USF-PROVIDER-005",
                f"canonical provider {provider.get('providerId')!r} lacks recorded readiness/health/teardown proof "
                "and is not honestly flagged (recordedReadinessGap + gapNextRung)",
                f"providers[{index}]",
            ))
    return failures


def rule_006_no_canonical_live_upgrade(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if provider.get("classification") != "canonical-dev-compose":
            continue
        blob = " ".join(str(provider.get(field, "")) for field in (
            "readinessProof", "healthProof", "composedProfileStatus", "classificationReason",
        )).lower()
        for token in CANONICAL_LIVE_TOKENS:
            if token in blob:
                failures.append(fail("USF-PROVIDER-006", f"canonical provider {provider.get('providerId')!r} claims live/production readiness token {token!r}", f"providers[{index}]"))
    return failures


def rule_007_synthetic_boundary(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        boundary = provider.get("syntheticDataBoundary")
        if not isinstance(boundary, str) or not boundary.strip():
            failures.append(fail("USF-PROVIDER-007", f"provider {provider.get('providerId')!r} has empty syntheticDataBoundary", f"providers[{index}].syntheticDataBoundary"))
            continue
        lowered = boundary.lower()
        if "production data" in lowered and "no production data" not in lowered:
            failures.append(fail("USF-PROVIDER-007", f"provider {provider.get('providerId')!r} syntheticDataBoundary asserts production data", f"providers[{index}].syntheticDataBoundary"))
    return failures


def rule_008_promotion_reason(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if provider.get("classification") != "profile-gated":
            continue
        recommendation = str(provider.get("promotionRecommendation", ""))
        if recommendation.strip().lower().startswith("promote"):
            if not str(provider.get("classificationReason", "")).strip():
                failures.append(fail("USF-PROVIDER-008", f"promotion-recommended provider {provider.get('providerId')!r} lacks classificationReason", f"providers[{index}].classificationReason"))
            if ("—" not in recommendation) and (" - " not in recommendation):
                failures.append(fail("USF-PROVIDER-008", f"promotion-recommended provider {provider.get('providerId')!r} states no reason in promotionRecommendation", f"providers[{index}].promotionRecommendation"))
    return failures


def rule_009_rejected_reason(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if provider.get("classification") != "rejected":
            continue
        reason = str(provider.get("classificationReason", "")).strip()
        if len(reason) < 10:
            failures.append(fail("USF-PROVIDER-009", f"rejected provider {provider.get('providerId')!r} lacks a classificationReason explaining why", f"providers[{index}].classificationReason"))
    return failures


def rule_010_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    present = set(data["map"].get("nonClaims", []))
    missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
    if missing:
        failures.append(fail("USF-PROVIDER-010", f"map missing required non-claims: {', '.join(missing)}", "nonClaims"))
    return failures


def rule_011_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    blob = json.dumps(data["map"], sort_keys=True).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in blob:
            failures.append(fail("USF-PROVIDER-011", f"overclaim phrase detected: {phrase!r}", "map"))
    return failures


def rule_012_gap_shape(data: dict[str, Any]) -> list[dict[str, str]]:
    """recordedReadinessGap / gapNextRung must be well-typed; every provider carries per-provider nonClaims."""
    failures: list[dict[str, str]] = []
    for index, provider in enumerate(providers(data)):
        if not isinstance(provider.get("recordedReadinessGap"), bool):
            failures.append(fail("USF-PROVIDER-012", f"provider {provider.get('providerId')!r} recordedReadinessGap must be boolean", f"providers[{index}].recordedReadinessGap"))
        if not isinstance(provider.get("gapNextRung"), str):
            failures.append(fail("USF-PROVIDER-012", f"provider {provider.get('providerId')!r} gapNextRung must be a string", f"providers[{index}].gapNextRung"))
        nonclaims = provider.get("nonClaims")
        if not isinstance(nonclaims, list) or not nonclaims:
            failures.append(fail("USF-PROVIDER-012", f"provider {provider.get('providerId')!r} lacks per-provider nonClaims", f"providers[{index}].nonClaims"))
    return failures


def rule_013_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-PROVIDER-013", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-PROVIDER-013", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-PROVIDER-013", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-PROVIDER-013", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-PROVIDER-001": rule_001_envelope,
    "USF-PROVIDER-002": rule_002_accounting,
    "USF-PROVIDER-003": rule_003_classification,
    "USF-PROVIDER-004": rule_004_required_minimum,
    "USF-PROVIDER-005": rule_005_canonical_readiness_honesty,
    "USF-PROVIDER-006": rule_006_no_canonical_live_upgrade,
    "USF-PROVIDER-007": rule_007_synthetic_boundary,
    "USF-PROVIDER-008": rule_008_promotion_reason,
    "USF-PROVIDER-009": rule_009_rejected_reason,
    "USF-PROVIDER-010": rule_010_nonclaims,
    "USF-PROVIDER-011": rule_011_no_overclaim,
    "USF-PROVIDER-012": rule_012_gap_shape,
    "USF-PROVIDER-013": rule_013_planted_defect_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    """Plant exactly one defect that must trip only the named rule."""
    m = copy.deepcopy(data)
    doc = m["map"]
    rows = doc["providers"]
    if rule_id == "USF-PROVIDER-001":
        doc["parentIssueId"] = "USF-9999"
    elif rule_id == "USF-PROVIDER-002":
        doc["providerCount"] = len(rows) + 1
    elif rule_id == "USF-PROVIDER-003":
        rows[0]["classification"] = "totally-invalid"
    elif rule_id == "USF-PROVIDER-004":
        idx = _index_of(m, "postgres")
        rows[idx]["providerId"] = "postgres-renamed"  # serviceCatalogueIds untouched -> only rule 004
    elif rule_id == "USF-PROVIDER-005":
        idx = _first_gap_index(m)
        rows[idx]["recordedReadinessGap"] = False  # proofs still none-recorded -> canonical dishonesty
    elif rule_id == "USF-PROVIDER-006":
        idx = _index_of(m, "postgres")
        rows[idx]["healthProof"] = str(rows[idx]["healthProof"]) + " production-live"
    elif rule_id == "USF-PROVIDER-007":
        rows[0]["syntheticDataBoundary"] = ""
    elif rule_id == "USF-PROVIDER-008":
        idx = _index_of(m, "alertmanager")
        rows[idx]["promotionRecommendation"] = "promote-to-canonical-dev-compose"  # reason stripped
    elif rule_id == "USF-PROVIDER-009":
        idx = _index_of(m, "webhook-sync")
        rows[idx]["classificationReason"] = ""
    elif rule_id == "USF-PROVIDER-010":
        doc["nonClaims"] = [c for c in doc["nonClaims"] if c != "no-staging-claim"]
    elif rule_id == "USF-PROVIDER-011":
        doc["title"] = str(doc["title"]) + " production-ready"
    elif rule_id == "USF-PROVIDER-012":
        idx = _index_of(m, "pgadmin")
        rows[idx]["recordedReadinessGap"] = "yes"  # non-canonical -> only rule 012 (type)
    elif rule_id == "USF-PROVIDER-013":
        m["planted"] = [
            {"expectedRuleIds": ["USF-PROVIDER-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-PROVIDER-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-PROVIDER-013", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, clean
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        observed = {f["ruleId"] for f in run_all(mutated)}
        # A mutation MUST trip exactly its own rule id — nothing more, nothing less.
        exclusive = observed == {rule_id}
        results.append({"ruleId": rule_id, "expectedFailureObserved": exclusive, "observedRuleIds": sorted(observed)})
        if not exclusive:
            failures.append(fail(rule_id, f"selftest mutation observed {sorted(observed)} (expected exactly [{rule_id}])", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-provider-consolidation",
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
        print("usage: validate-provider-consolidation.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-PROVIDER-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
