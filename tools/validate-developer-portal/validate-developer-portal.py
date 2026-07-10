#!/usr/bin/env python3
"""Validate the USF Local Developer Portal / API Documentation docs map (USF-1071).

Fails closed. Enforces that the developer-portal docs map:
  * carries a complete generated-report envelope pinned to USF-1071 / USF-1069,
  * NEVER asserts that the docs are authority (docs are generated, lower-authority,
    and cannot define semantics or become authority),
  * only renders endpoints that exist in the OpenAPI projection (endpoint authority),
    re-derived here, and covers the projection exactly (no invented endpoints),
  * exposes the required per-operation metadata coverage drawn from authority,
  * only offers SDK examples where the canonical metadata permits, each citing a
    canonical-metadata reference that resolves,
  * makes no public deployment / FQDN / publication claim and describes a local
    serve model only,
  * preserves the required non-claims and contains no readiness overclaim.

The docs surface is a LOW-authority generated reflection of higher-authority sources
(the OpenAPI projection and the readiness maps). It defines no semantics and cannot
become authority. This validator is read-only and writes no runtime file.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs" / "architecture"
PLANTED = Path(__file__).resolve().parent / "planted-defects"

MAP_PATH = DOCS / "developer-portal-docs-map.json"
OPENAPI_PATH = ROOT / "packages" / "openapi" / "openapi.json"
PUBLIC_API_PATH = DOCS / "public-api-readiness-map.json"
SDK_PATH = DOCS / "generated-sdk-client-readiness-map.json"
NON_UI_PATH = DOCS / "non-ui-client-callable-contract-map.json"

RULE_IDS = [f"USF-DEV-PORTAL-{index:03d}" for index in range(1, 14)]

HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "TRACE"}

# Core generated-report envelope fields that must be present and non-empty.
# (readinessClaims is intentionally excluded — rule 010 owns its "must be []" check.)
ENVELOPE_FIELDS = [
    "id", "title", "schemaVersion", "authorityLevel", "authorityBoundary",
    "lifecycleState", "ownerIssueId", "parentIssueId", "sourceAuthorities",
    "generatedReportAuthority", "currentMainFreshness", "nonClaims",
]

REQUIRED_METADATA_KEYS = [
    "authz", "tenant", "permission", "error", "rateLimit", "audit",
    "telemetry", "cors", "csrf", "securityHeaders",
]

REQUIRED_NONCLAIMS = [
    "no-generated-sdk-readiness-claim", "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim", "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade", "no-staging-claim", "no-production-claim",
    "no-deployment-claim", "no-live-provider-claim", "no-human-acceptance-claim",
    "no-compliance-readiness-claim", "no-monetisation-readiness-claim",
    "no-test-focus-move-claim-from-classification-alone",
    "no-public-docs-publication-claim", "no-public-fqdn-claim",
    "no-package-publication-claim",
]

REQUIRED_SOURCE_AUTHORITIES = [
    "packages/openapi/openapi.json",
    "docs/architecture/public-api-readiness-map.json",
    "docs/architecture/generated-sdk-client-readiness-map.json",
    "docs/architecture/non-ui-client-callable-contract-map.json",
]

# Phrases that would assert the docs are authority — forbidden in the boundary fields.
FORBIDDEN_AUTHORITY_ASSERTIONS = [
    "docs are the authority", "docs are authority", "docs define semantics",
    "docs define the semantics", "docs are canonical", "canonical authority",
    "docs become authority", "highest authority", "source of truth",
]

# Public deployment / publication scan (whole-document, case-insensitive).
FORBIDDEN_PUBLICATION = [
    "public fqdn", "deployed", "published to", "npm publish", "public url",
    "production deployment", "public endpoint",
]

FORBIDDEN_OVERCLAIMS = [
    "production ready", "production-ready", "live-provider ready",
    "live provider ready", "iso certified", "iso-certified", "soc 2 certified",
    "human acceptance achieved", "compliance readiness achieved", "monetisation ready",
]

ALLOWED_EXAMPLE_KINDS = {
    "response-shape", "request-shape", "request-response-shape",
    "curl-invocation", "client-call-shape",
}

SDK_SUPPORTED_DISPOSITIONS = {
    "generated-sdk-supported-local-contract",
    "operator-tooling-sdk-supported-local-contract",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def openapi_operations(openapi: dict[str, Any]) -> dict[str, dict[str, str]]:
    """Re-derive {operationId: {path, method}} from the OpenAPI projection."""
    ops: dict[str, dict[str, str]] = {}
    for path, item in (openapi.get("paths") or {}).items():
        if not isinstance(item, dict):
            continue
        for method, spec in item.items():
            if method.upper() not in HTTP_METHODS or not isinstance(spec, dict):
                continue
            oid = spec.get("operationId")
            if oid:
                ops[oid] = {"path": path, "method": method.upper()}
    return ops


def load_data() -> dict[str, Any]:
    data: dict[str, Any] = {}
    data["map"] = load_json(MAP_PATH)
    data["openapi"] = load_json(OPENAPI_PATH)
    data["sdk"] = load_json(SDK_PATH)
    data["nonui"] = load_json(NON_UI_PATH)
    data["openapiOps"] = openapi_operations(data["openapi"])
    data["sdkDisposition"] = {
        o.get("routeId"): o.get("sdkExposureDisposition")
        for o in data["sdk"].get("operations", [])
    }
    data["nonuiRouteIds"] = {
        o.get("routeId") for o in data["nonui"].get("operations", [])
    }
    data["planted"] = []
    for path in sorted(PLANTED.glob("*.json")):
        planted = load_json(path)
        planted["_path"] = str(path.relative_to(ROOT))
        data["planted"].append(planted)
    return data


def fail(rule_id: str, message: str, path: str = "") -> dict[str, str]:
    return {"ruleId": rule_id, "message": message, "path": path}


def _doc(data: dict[str, Any]) -> dict[str, Any]:
    return data["map"]


def rule_001_envelope(data: dict[str, Any]) -> list[dict[str, str]]:
    """Complete generated-report envelope, pinned to USF-1071 / USF-1069."""
    failures: list[dict[str, str]] = []
    doc = _doc(data)
    for field in ENVELOPE_FIELDS:
        if doc.get(field) in (None, "", [], {}):
            failures.append(fail("USF-DEV-PORTAL-001", f"missing envelope field {field}", field))
    if doc.get("id") != "developer-portal-docs-map":
        failures.append(fail("USF-DEV-PORTAL-001", "id must be developer-portal-docs-map", "id"))
    if doc.get("schemaVersion") != "1.0.0":
        failures.append(fail("USF-DEV-PORTAL-001", "schemaVersion must be 1.0.0", "schemaVersion"))
    if doc.get("authorityLevel") != "generated-report-lower-authority":
        failures.append(fail("USF-DEV-PORTAL-001", "authorityLevel must be generated-report-lower-authority", "authorityLevel"))
    if doc.get("ownerIssueId") != "USF-1071":
        failures.append(fail("USF-DEV-PORTAL-001", "ownerIssueId must be USF-1071", "ownerIssueId"))
    if doc.get("parentIssueId") != "USF-1069":
        failures.append(fail("USF-DEV-PORTAL-001", "parentIssueId must be USF-1069", "parentIssueId"))
    return failures


def rule_002_docs_cannot_become_authority(data: dict[str, Any]) -> list[dict[str, str]]:
    """KEY: docs are generated, lower-authority, and cannot become authority."""
    failures: list[dict[str, str]] = []
    doc = _doc(data)
    if doc.get("generatedReportAuthority") != "lower-authority-summary-only":
        failures.append(fail("USF-DEV-PORTAL-002", "generatedReportAuthority must be lower-authority-summary-only", "generatedReportAuthority"))
    boundary = doc.get("docsAuthorityBoundary")
    if not isinstance(boundary, str) or not boundary.strip():
        failures.append(fail("USF-DEV-PORTAL-002", "docsAuthorityBoundary must be a non-empty string", "docsAuthorityBoundary"))
    else:
        low = boundary.lower()
        if "cannot define semantics" not in low:
            failures.append(fail("USF-DEV-PORTAL-002", "docsAuthorityBoundary must state docs cannot define semantics", "docsAuthorityBoundary"))
        if "cannot become authority" not in low:
            failures.append(fail("USF-DEV-PORTAL-002", "docsAuthorityBoundary must state docs cannot become authority", "docsAuthorityBoundary"))
        for phrase in FORBIDDEN_AUTHORITY_ASSERTIONS:
            if phrase in low:
                failures.append(fail("USF-DEV-PORTAL-002", f"docsAuthorityBoundary asserts docs are authority: {phrase!r}", "docsAuthorityBoundary"))
    gra = str(doc.get("generatedReportAuthority", "")).lower()
    for phrase in FORBIDDEN_AUTHORITY_ASSERTIONS:
        if phrase in gra:
            failures.append(fail("USF-DEV-PORTAL-002", f"generatedReportAuthority asserts authority: {phrase!r}", "generatedReportAuthority"))
    return failures


def rule_003_endpoints_traceable(data: dict[str, Any]) -> list[dict[str, str]]:
    """Every rendered endpoint exists in the OpenAPI projection; coverage is exact."""
    failures: list[dict[str, str]] = []
    doc = _doc(data)
    ops = data["openapiOps"]
    rendered = doc.get("renderedEndpoints")
    if not isinstance(rendered, list) or not rendered:
        failures.append(fail("USF-DEV-PORTAL-003", "renderedEndpoints must be a non-empty list", "renderedEndpoints"))
        return failures
    seen: set[str] = set()
    for index, entry in enumerate(rendered):
        oid = entry.get("operationId")
        if oid not in ops:
            failures.append(fail("USF-DEV-PORTAL-003", f"invented endpoint not in OpenAPI projection: {oid!r}", f"renderedEndpoints[{index}].operationId"))
            continue
        seen.add(oid)
        if entry.get("path") != ops[oid]["path"]:
            failures.append(fail("USF-DEV-PORTAL-003", f"path {entry.get('path')!r} does not match OpenAPI for {oid}", f"renderedEndpoints[{index}].path"))
        if entry.get("method") != ops[oid]["method"]:
            failures.append(fail("USF-DEV-PORTAL-003", f"method {entry.get('method')!r} does not match OpenAPI for {oid}", f"renderedEndpoints[{index}].method"))
    if len(rendered) != len(ops):
        failures.append(fail("USF-DEV-PORTAL-003", f"renderedEndpoints count {len(rendered)} != OpenAPI operation count {len(ops)}", "renderedEndpoints"))
    missing = sorted(set(ops) - seen)
    if missing:
        failures.append(fail("USF-DEV-PORTAL-003", f"OpenAPI operations not rendered: {missing[:3]}", "renderedEndpoints"))
    return failures


def rule_004_metadata_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    """metadataCoverage exposes every required per-operation metadata dimension."""
    failures: list[dict[str, str]] = []
    coverage = _doc(data).get("metadataCoverage")
    if not isinstance(coverage, dict):
        failures.append(fail("USF-DEV-PORTAL-004", "metadataCoverage must be an object", "metadataCoverage"))
        return failures
    for key in REQUIRED_METADATA_KEYS:
        if key not in coverage:
            failures.append(fail("USF-DEV-PORTAL-004", f"metadataCoverage missing {key}", f"metadataCoverage.{key}"))
            continue
        value = coverage[key]
        if not (isinstance(value, bool) or (isinstance(value, str) and value.strip())):
            failures.append(fail("USF-DEV-PORTAL-004", f"metadataCoverage.{key} must be a bool or non-empty ref", f"metadataCoverage.{key}"))
    return failures


def rule_005_sdk_examples_resolve(data: dict[str, Any]) -> list[dict[str, str]]:
    """Each SDK example cites a canonicalMetadataRef that resolves and a real operation."""
    failures: list[dict[str, str]] = []
    ops = data["openapiOps"]
    examples = _doc(data).get("sdkExamples", [])
    if not isinstance(examples, list):
        failures.append(fail("USF-DEV-PORTAL-005", "sdkExamples must be a list", "sdkExamples"))
        return failures
    for index, ex in enumerate(examples):
        if ex.get("operation") not in ops:
            failures.append(fail("USF-DEV-PORTAL-005", f"sdkExample operation not in OpenAPI: {ex.get('operation')!r}", f"sdkExamples[{index}].operation"))
        ref = ex.get("canonicalMetadataRef")
        if not isinstance(ref, str) or not ref.strip():
            failures.append(fail("USF-DEV-PORTAL-005", "sdkExample missing canonicalMetadataRef", f"sdkExamples[{index}].canonicalMetadataRef"))
            continue
        file_part, _, fragment = ref.partition("#")
        target = ROOT / file_part
        if not target.is_file():
            failures.append(fail("USF-DEV-PORTAL-005", f"canonicalMetadataRef path does not resolve: {file_part!r}", f"sdkExamples[{index}].canonicalMetadataRef"))
            continue
        if fragment.startswith("routeId="):
            rid = fragment[len("routeId="):]
            try:
                doc = load_json(target)
            except Exception:  # noqa: BLE001
                failures.append(fail("USF-DEV-PORTAL-005", f"canonicalMetadataRef target unreadable: {file_part!r}", f"sdkExamples[{index}].canonicalMetadataRef"))
                continue
            keys = {o.get("routeId") for o in doc.get("operations", [])}
            if rid not in keys:
                failures.append(fail("USF-DEV-PORTAL-005", f"canonicalMetadataRef routeId not present in target: {rid!r}", f"sdkExamples[{index}].canonicalMetadataRef"))
    return failures


def rule_006_no_public_deployment(data: dict[str, Any]) -> list[dict[str, str]]:
    """No public deployment / FQDN / publication claim; localServeModel present."""
    failures: list[dict[str, str]] = []
    doc = _doc(data)
    serve = doc.get("localServeModel")
    if not isinstance(serve, str) or not serve.strip():
        failures.append(fail("USF-DEV-PORTAL-006", "localServeModel must be a non-empty string", "localServeModel"))
    blob = json.dumps(doc, sort_keys=True).lower()
    for phrase in FORBIDDEN_PUBLICATION:
        if phrase in blob:
            failures.append(fail("USF-DEV-PORTAL-006", f"public deployment/publication phrase detected: {phrase!r}", "document"))
    return failures


def rule_007_nonclaims(data: dict[str, Any]) -> list[dict[str, str]]:
    """All 16 required non-claims are present."""
    failures: list[dict[str, str]] = []
    present = set(_doc(data).get("nonClaims", []))
    missing = [claim for claim in REQUIRED_NONCLAIMS if claim not in present]
    if missing:
        failures.append(fail("USF-DEV-PORTAL-007", f"missing non-claims: {', '.join(missing)}", "nonClaims"))
    return failures


def rule_008_no_overclaim(data: dict[str, Any]) -> list[dict[str, str]]:
    """No readiness overclaim strings anywhere in the document."""
    failures: list[dict[str, str]] = []
    blob = json.dumps(_doc(data), sort_keys=True).lower()
    for phrase in FORBIDDEN_OVERCLAIMS:
        if phrase in blob:
            failures.append(fail("USF-DEV-PORTAL-008", f"overclaim phrase detected: {phrase!r}", "document"))
    return failures


def rule_009_source_authorities(data: dict[str, Any]) -> list[dict[str, str]]:
    """sourceAuthorities include the OpenAPI projection + readiness maps, all resolving."""
    failures: list[dict[str, str]] = []
    listed = _doc(data).get("sourceAuthorities", [])
    if not isinstance(listed, list):
        failures.append(fail("USF-DEV-PORTAL-009", "sourceAuthorities must be a list", "sourceAuthorities"))
        return failures
    for required in REQUIRED_SOURCE_AUTHORITIES:
        if required not in listed:
            failures.append(fail("USF-DEV-PORTAL-009", f"sourceAuthorities missing required authority {required}", "sourceAuthorities"))
        elif not (ROOT / required).is_file():
            failures.append(fail("USF-DEV-PORTAL-009", f"source authority does not resolve on disk: {required}", "sourceAuthorities"))
    return failures


def rule_010_freshness(data: dict[str, Any]) -> list[dict[str, str]]:
    """current-main freshness bound to re-validation; no readiness claims asserted."""
    failures: list[dict[str, str]] = []
    doc = _doc(data)
    fresh = doc.get("currentMainFreshness")
    if not isinstance(fresh, dict):
        failures.append(fail("USF-DEV-PORTAL-010", "currentMainFreshness must be an object", "currentMainFreshness"))
    else:
        if fresh.get("status") != "current-main":
            failures.append(fail("USF-DEV-PORTAL-010", "currentMainFreshness.status must be current-main", "currentMainFreshness.status"))
        binding = str(fresh.get("binding", "")).lower()
        if "revalidated" not in binding or "openapi" not in binding:
            failures.append(fail("USF-DEV-PORTAL-010", "currentMainFreshness.binding must state revalidation against the openapi projection", "currentMainFreshness.binding"))
    if doc.get("readinessClaims") != []:
        failures.append(fail("USF-DEV-PORTAL-010", "readinessClaims must be an empty list (docs make no readiness claim)", "readinessClaims"))
    return failures


def rule_011_rendered_endpoint_shape(data: dict[str, Any]) -> list[dict[str, str]]:
    """Each rendered endpoint entry is structurally well-formed with a valid sourceRef."""
    failures: list[dict[str, str]] = []
    rendered = _doc(data).get("renderedEndpoints", [])
    if not isinstance(rendered, list):
        failures.append(fail("USF-DEV-PORTAL-011", "renderedEndpoints must be a list", "renderedEndpoints"))
        return failures
    for index, entry in enumerate(rendered):
        if not isinstance(entry, dict):
            failures.append(fail("USF-DEV-PORTAL-011", "rendered endpoint must be an object", f"renderedEndpoints[{index}]"))
            continue
        for field in ("operationId", "path", "method", "sourceRef"):
            value = entry.get(field)
            if not isinstance(value, str) or not value.strip():
                failures.append(fail("USF-DEV-PORTAL-011", f"rendered endpoint missing {field}", f"renderedEndpoints[{index}].{field}"))
        method = entry.get("method")
        if isinstance(method, str) and method.upper() not in HTTP_METHODS:
            failures.append(fail("USF-DEV-PORTAL-011", f"invalid HTTP method {method!r}", f"renderedEndpoints[{index}].method"))
        ref = entry.get("sourceRef")
        if isinstance(ref, str) and not ref.startswith("packages/openapi/openapi.json#"):
            failures.append(fail("USF-DEV-PORTAL-011", f"sourceRef must cite the OpenAPI projection, got {ref!r}", f"renderedEndpoints[{index}].sourceRef"))
    return failures


def rule_012_sdk_examples_permitted(data: dict[str, Any]) -> list[dict[str, str]]:
    """SDK examples use a valid exampleKind and only cover SDK-permitted operations."""
    failures: list[dict[str, str]] = []
    examples = _doc(data).get("sdkExamples", [])
    if not isinstance(examples, list):
        failures.append(fail("USF-DEV-PORTAL-012", "sdkExamples must be a list", "sdkExamples"))
        return failures
    disposition = data["sdkDisposition"]
    for index, ex in enumerate(examples):
        if ex.get("exampleKind") not in ALLOWED_EXAMPLE_KINDS:
            failures.append(fail("USF-DEV-PORTAL-012", f"invalid exampleKind {ex.get('exampleKind')!r}", f"sdkExamples[{index}].exampleKind"))
        ref = str(ex.get("canonicalMetadataRef", ""))
        _, _, fragment = ref.partition("#")
        rid = fragment[len("routeId="):] if fragment.startswith("routeId=") else ex.get("routeId")
        if rid is None:
            failures.append(fail("USF-DEV-PORTAL-012", "sdkExample lacks a resolvable routeId for the permits check", f"sdkExamples[{index}]"))
            continue
        if disposition.get(rid) not in SDK_SUPPORTED_DISPOSITIONS:
            failures.append(fail("USF-DEV-PORTAL-012", f"sdkExample routeId {rid!r} is not SDK-permitted (disposition {disposition.get(rid)!r})", f"sdkExamples[{index}]"))
    return failures


def rule_013_planted_defect_coverage(data: dict[str, Any]) -> list[dict[str, str]]:
    """Exactly one distinct planted defect per rule id."""
    coverage: dict[str, list[str]] = {rule_id: [] for rule_id in RULE_IDS}
    failures: list[dict[str, str]] = []
    for defect in data.get("planted", []):
        expected = defect.get("expectedRuleIds", [])
        if len(expected) != 1:
            failures.append(fail("USF-DEV-PORTAL-013", "planted defect must expect exactly one rule", defect.get("_path", "")))
            continue
        rule_id = expected[0]
        if rule_id not in coverage:
            failures.append(fail("USF-DEV-PORTAL-013", f"planted defect references unknown rule {rule_id}", defect.get("_path", "")))
            continue
        coverage[rule_id].append(defect.get("_path", ""))
        if not defect.get("mustBeDistinct"):
            failures.append(fail("USF-DEV-PORTAL-013", "planted defect does not require distinct coverage", defect.get("_path", "")))
    missing = [rule_id for rule_id, paths in coverage.items() if len(paths) != 1]
    if missing:
        failures.append(fail("USF-DEV-PORTAL-013", f"rules without exactly one distinct planted defect: {', '.join(missing)}", "planted-defects"))
    return failures


RULES: dict[str, Callable[[dict[str, Any]], list[dict[str, str]]]] = {
    "USF-DEV-PORTAL-001": rule_001_envelope,
    "USF-DEV-PORTAL-002": rule_002_docs_cannot_become_authority,
    "USF-DEV-PORTAL-003": rule_003_endpoints_traceable,
    "USF-DEV-PORTAL-004": rule_004_metadata_coverage,
    "USF-DEV-PORTAL-005": rule_005_sdk_examples_resolve,
    "USF-DEV-PORTAL-006": rule_006_no_public_deployment,
    "USF-DEV-PORTAL-007": rule_007_nonclaims,
    "USF-DEV-PORTAL-008": rule_008_no_overclaim,
    "USF-DEV-PORTAL-009": rule_009_source_authorities,
    "USF-DEV-PORTAL-010": rule_010_freshness,
    "USF-DEV-PORTAL-011": rule_011_rendered_endpoint_shape,
    "USF-DEV-PORTAL-012": rule_012_sdk_examples_permitted,
    "USF-DEV-PORTAL-013": rule_013_planted_defect_coverage,
}


def run_all(data: dict[str, Any]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for rule_id in RULE_IDS:
        failures.extend(RULES[rule_id](data))
    return failures


def _first_permitted_routeid(data: dict[str, Any]) -> str:
    for rid, disp in data["sdkDisposition"].items():
        if disp in SDK_SUPPORTED_DISPOSITIONS:
            return rid
    return "healthz.get"


def mutate(data: dict[str, Any], rule_id: str) -> dict[str, Any]:
    """Plant EXACTLY ONE defect that must trigger ONLY rule_id."""
    m = copy.deepcopy(data)
    doc = m["map"]
    if rule_id == "USF-DEV-PORTAL-001":
        doc.pop("id", None)
    elif rule_id == "USF-DEV-PORTAL-002":
        doc["docsAuthorityBoundary"] = "The rendered docs are the canonical reference for the API surface."
    elif rule_id == "USF-DEV-PORTAL-003":
        doc["renderedEndpoints"] = doc["renderedEndpoints"] + [{
            "operationId": "ghostOperationV1",
            "path": "/v1/ghost",
            "method": "GET",
            "sourceRef": "packages/openapi/openapi.json#operationId=ghostOperationV1",
        }]
    elif rule_id == "USF-DEV-PORTAL-004":
        doc["metadataCoverage"].pop("csrf", None)
    elif rule_id == "USF-DEV-PORTAL-005":
        rid = _first_permitted_routeid(m)
        doc["sdkExamples"][0]["canonicalMetadataRef"] = f"docs/architecture/does-not-exist.json#routeId={rid}"
    elif rule_id == "USF-DEV-PORTAL-006":
        doc["localServeModel"] = doc["localServeModel"] + " It is also deployed to a public url."
    elif rule_id == "USF-DEV-PORTAL-007":
        doc["nonClaims"] = [c for c in doc["nonClaims"] if c != "no-public-fqdn-claim"]
    elif rule_id == "USF-DEV-PORTAL-008":
        doc["title"] = doc["title"] + " — production ready"
    elif rule_id == "USF-DEV-PORTAL-009":
        doc["sourceAuthorities"] = [a for a in doc["sourceAuthorities"] if a != "packages/openapi/openapi.json"]
    elif rule_id == "USF-DEV-PORTAL-010":
        doc["currentMainFreshness"]["status"] = "historical-evidence"
    elif rule_id == "USF-DEV-PORTAL-011":
        doc["renderedEndpoints"][0] = dict(doc["renderedEndpoints"][0])
        doc["renderedEndpoints"][0]["sourceRef"] = "packages/wrong-source.json#x"
    elif rule_id == "USF-DEV-PORTAL-012":
        doc["sdkExamples"][0] = dict(doc["sdkExamples"][0])
        doc["sdkExamples"][0]["exampleKind"] = "totally-bogus-kind"
    elif rule_id == "USF-DEV-PORTAL-013":
        m["planted"] = [
            {"expectedRuleIds": ["USF-DEV-PORTAL-001"], "mustBeDistinct": True, "_path": "dup-a"},
            {"expectedRuleIds": ["USF-DEV-PORTAL-001"], "mustBeDistinct": True, "_path": "dup-b"},
        ]
    return m


def run_selftest(data: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    clean = run_all(data)
    if clean:
        failures.append(fail("USF-DEV-PORTAL-013", "clean fixture must pass before selftest mutations", "selftest"))
        return failures, clean
    for rule_id in RULE_IDS:
        mutated = mutate(data, rule_id)
        observed = {f["ruleId"] for f in run_all(mutated)}
        isolated = observed == {rule_id}
        results.append({
            "ruleId": rule_id,
            "expectedFailureObserved": rule_id in observed,
            "isolated": isolated,
            "observedRuleIds": sorted(observed),
        })
        if rule_id not in observed:
            failures.append(fail(rule_id, "selftest mutation did not trigger expected rule", "selftest"))
        elif not isolated:
            failures.append(fail(rule_id, f"selftest mutation was not isolated; observed {sorted(observed)}", "selftest"))
    return failures, results


def print_result(mode: str, failures: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> int:
    payload: dict[str, Any] = {
        "validator": "validate-developer-portal",
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
        print("usage: validate-developer-portal.py [all|selftest]", file=sys.stderr)
        return 2
    mode = argv[1]
    try:
        data = load_data()
    except Exception as exc:  # noqa: BLE001 - fail closed on load/parse errors.
        return print_result(mode, [fail("USF-DEV-PORTAL-001", f"load failure: {exc}", "load")])
    if mode == "all":
        return print_result(mode, run_all(data))
    failures, results = run_selftest(data)
    return print_result(mode, failures, {"selftestResults": results})


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
