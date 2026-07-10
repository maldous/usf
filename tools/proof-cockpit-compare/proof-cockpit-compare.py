#!/usr/bin/env python3
"""Read-only normalized equivalence comparator for proof-cockpit machine runs."""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
STORE_PATH = ROOT / "evidence" / "proof-evidence" / "proof-cockpit" / "staging-evidence-store.json"

REQUIRED_FILES = [
    "proof-cockpit-machine-qa-run.json",
    "service-evidence-manifest.json",
    "evidence-index.json",
    "gap-register.json",
    "chain-of-custody.json",
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

NORMALIZED_VOLATILE_KEYS = {
    "actionId",
    "artifactDir",
    "baseUrl",
    "capturedAt",
    "completedAt",
    "correlationId",
    "duration",
    "durationMs",
    "filePath",
    "generatedAt",
    "latency",
    "latencyMs",
    "observedAt",
    "qaRun",
    "rawArtifactPath",
    "reviewAfter",
    "runId",
    "screenshotDir",
    "screenshotPath",
    "startedAt",
    "timestamp",
    "traceId",
}

FAIL_CLOSED_KEYS = {
    "sourceSha",
    "sourceTreeHash",
    "sourceTreeHashAlgorithm",
    "deploymentSha",
    "counts",
    "nonClaimStatement",
    "actualAuthPosture",
    "authPostureMismatch",
    "evidenceStatus",
    "screenshotHash",
    "artifactHash",
    "generatedReportsAreAuthority",
    "finalAcceptanceAutomatic",
}

HEX_SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
ISO_TIMESTAMP_RE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}[:-]\d{2}[:-]\d{2}(?:[.:-]\d+)?Z")
QA_RUN_RE = re.compile(r"qa-run-\d{4}-\d{2}-\d{2}T[0-9A-Za-z_.:-]+")
MACHINE_RUN_PATH_RE = re.compile(r"(?:/tmp/usf-proof-cockpit-machine-qa|artifacts/proof-cockpit/machine-runs)/[0-9A-Za-z_.:-]+")
LOCALHOST_PORT_RE = re.compile(r"(https?://127\.0\.0\.1:)\d+")


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def latest_artifact_dir() -> Path:
    store = load_json(STORE_PATH)
    artifact_dir = store.get("latestMachineRun", {}).get("artifactDir", "")
    if not artifact_dir:
        raise ValueError("latest proof-cockpit artifactDir is missing")
    return ROOT / artifact_dir


def load_snapshot(directory: Path) -> tuple[dict[str, Any], list[dict[str, str]]]:
    snapshot: dict[str, Any] = {}
    findings: list[dict[str, str]] = []
    for name in REQUIRED_FILES:
        path = directory / name
        if not path.exists():
            findings.append(finding("fail", f"Required comparator input missing: {name}", str(directory)))
            continue
        try:
            snapshot[name] = load_json(path)
        except Exception as exc:
            findings.append(finding("fail", f"Comparator input is not strict JSON: {name}: {exc}", str(path)))
    return snapshot, findings


def normalize_string(value: str) -> str:
    normalized = ISO_TIMESTAMP_RE.sub("<timestamp>", value)
    normalized = QA_RUN_RE.sub("<qa-run>", normalized)
    normalized = MACHINE_RUN_PATH_RE.sub("<machine-run-path>", normalized)
    normalized = LOCALHOST_PORT_RE.sub(r"\g<1><port>", normalized)
    return normalized


def normalize(value: Any, key: str = "") -> Any:
    if key in NORMALIZED_VOLATILE_KEYS:
        return f"<volatile:{key}>"
    if isinstance(value, dict):
        return {nested_key: normalize(nested_value, nested_key) for nested_key, nested_value in sorted(value.items())}
    if isinstance(value, list):
        return [normalize(item, key) for item in value]
    if isinstance(value, str):
        return normalize_string(value)
    return value


def finding(status: str, message: str, subject: str = "") -> dict[str, str]:
    return {"status": status, "message": message, "subject": subject}


def normalized_words(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def normalized_diffs(before: Any, after: Any, path: str = "$", limit: int = 80) -> list[dict[str, str]]:
    if before == after:
        return []
    if len(str(before)) > 4000 or len(str(after)) > 4000:
        return [finding("fail", "Normalized proof-cockpit snapshots differ", path)]
    if isinstance(before, dict) and isinstance(after, dict):
        findings: list[dict[str, str]] = []
        for key in sorted(set(before) | set(after)):
            if key not in before or key not in after:
                findings.append(finding("fail", "Normalized key missing on one side", f"{path}.{key}"))
            else:
                findings.extend(normalized_diffs(before[key], after[key], f"{path}.{key}", limit))
            if len(findings) >= limit:
                return findings[:limit]
        return findings
    if isinstance(before, list) and isinstance(after, list):
        if len(before) != len(after):
            return [finding("fail", f"Normalized list length differs: {len(before)} != {len(after)}", path)]
        findings = []
        for index, (left, right) in enumerate(zip(before, after, strict=True)):
            findings.extend(normalized_diffs(left, right, f"{path}[{index}]", limit))
            if len(findings) >= limit:
                return findings[:limit]
        return findings
    return [finding("fail", f"Normalized value differs: {before!r} != {after!r}", path)]


def guardrail_findings(snapshot: dict[str, Any], label: str) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    report = snapshot.get("proof-cockpit-machine-qa-run.json", {})
    counts = report.get("counts", {})
    gaps = report.get("gaps", [])
    if (counts.get("warn", 0) or 0) > 0:
        findings.append(finding("fail", "Machine run warning count is non-zero", label))
    if (counts.get("fail", 0) or 0) > 0:
        findings.append(finding("fail", "Machine run failure count is non-zero", label))
    if gaps or (counts.get("gap", counts.get("gaps", 0)) or 0) > 0:
        findings.append(finding("fail", "Machine run has unresolved gaps", label))
    for field in ["sourceSha", "deploymentSha", "sourceTreeHash"]:
        value = str(report.get(field, "") or "")
        if not value:
            findings.append(finding("fail", f"Machine run missing {field}", label))
        elif field == "sourceTreeHash" and not HEX_SHA256_RE.fullmatch(value):
            findings.append(finding("fail", "Machine run sourceTreeHash is not a SHA-256 digest", label))
    non_claim_text = str(report.get("nonClaimStatement", "")).lower()
    non_claim_words = normalized_words(non_claim_text)
    for token in REQUIRED_NON_CLAIMS:
        expected_phrase = normalized_words(token.removeprefix("no-").replace("-", " "))
        if token not in non_claim_text and expected_phrase not in non_claim_words:
            findings.append(finding("fail", f"Required non-claim missing: {token}", label))

    services = snapshot.get("service-evidence-manifest.json", {}).get("services", [])
    for index, service in enumerate(services):
        subject = f"{label}:service[{index}]:{service.get('serviceId', 'unknown')}"
        if service.get("evidenceStatus") != "machine-pass":
            findings.append(finding("fail", "Service evidence status is not machine-pass", subject))
        # service auth posture is a fail-closed equivalence dimension.
        if not service.get("actualAuthPosture"):
            findings.append(finding("fail", "service auth posture missing", subject))
        if "authPostureMismatch" not in service or not isinstance(service.get("authPostureMismatch"), bool):
            findings.append(finding("fail", "Service auth posture mismatch flag missing", subject))
        for field in ["runId", "sourceSha"]:
            if not service.get(field):
                findings.append(finding("fail", f"Service evidence missing {field}", subject))
        if not (service.get("screenshotHash") or service.get("artifactHash")):
            findings.append(finding("fail", "Service evidence lacks screenshot/artifact hash", subject))
        if not isinstance(service.get("targetObservation"), dict) or not service.get("targetObservation"):
            findings.append(finding("fail", "Service evidence lacks structured targetObservation", subject))

    text = json.dumps(snapshot, sort_keys=True)
    for forbidden in [
        '"generatedReportsAreAuthority": t' + "rue",
        '"finalAcceptanceAutomatic": t' + "rue",
        "staging readiness is c" + "omplete",
        "production readiness is c" + "omplete",
    ]:
        if forbidden in text:
            findings.append(finding("fail", f"Generated-report authority or readiness overclaim present: {forbidden}", label))
    return findings


def compare_snapshots(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    findings = [
        *guardrail_findings(before, "before"),
        *guardrail_findings(after, "after"),
    ]
    diffs = normalized_diffs(normalize(before), normalize(after))
    findings.extend(diffs)
    status = "pass" if not findings else "fail"
    return {
        "tool": "proof-cockpit-compare",
        "status": status,
        "supportedStatuses": ["pass", "warn", "fail", "owner-review-required"],
        "volatileNormalization": sorted(NORMALIZED_VOLATILE_KEYS),
        "failClosedDimensions": sorted(FAIL_CLOSED_KEYS),
        "findingCount": len(findings),
        "findings": findings,
    }


def compare_dirs(before_dir: Path, after_dir: Path) -> dict[str, Any]:
    before, before_findings = load_snapshot(before_dir)
    after, after_findings = load_snapshot(after_dir)
    if before_findings or after_findings:
        findings = [*before_findings, *after_findings]
        return {
            "tool": "proof-cockpit-compare",
            "status": "fail",
            "supportedStatuses": ["pass", "warn", "fail", "owner-review-required"],
            "findingCount": len(findings),
            "findings": findings,
        }
    return compare_snapshots(before, after)


def selftest() -> dict[str, Any]:
    base, findings = load_snapshot(latest_artifact_dir())
    if findings:
        return {"tool": "proof-cockpit-compare", "mode": "selftest", "status": "fail", "findings": findings}

    allowed = copy.deepcopy(base)
    allowed_report = allowed["proof-cockpit-machine-qa-run.json"]
    allowed_report["qaRun"] = "qa-run-2099-01-01T00-00-00-000Z"
    allowed_report["startedAt"] = "2099-01-01T00:00:00.000Z"
    allowed_report["completedAt"] = "2099-01-01T00:00:01.000Z"
    allowed_report["baseUrl"] = "http://127.0.0.1:65535"
    allowed_report["artifactDir"] = "/tmp/usf-proof-cockpit-machine-qa/2099-01-01T00-00-00-000Z"
    if allowed["service-evidence-manifest.json"].get("services"):
        allowed["service-evidence-manifest.json"]["services"][0]["runId"] = "qa-run-2099-01-01T00-00-00-000Z"

    hidden_regression = copy.deepcopy(base)
    if hidden_regression["service-evidence-manifest.json"].get("services"):
        hidden_regression["service-evidence-manifest.json"]["services"][0]["actualAuthPosture"] = "unavailable"

    allowed_result = compare_snapshots(base, allowed)
    regression_result = compare_snapshots(base, hidden_regression)
    passed = allowed_result["status"] == "pass" and regression_result["status"] == "fail"
    return {
        "tool": "proof-cockpit-compare",
        "mode": "selftest",
        "status": "pass" if passed else "fail",
        "cases": [
            {"id": "allowed-volatile-difference", "status": allowed_result["status"]},
            {"id": "hidden-regression", "status": regression_result["status"]},
        ],
        "findings": [] if passed else [finding("fail", "Comparator selftest did not preserve volatile-only pass and hidden-regression fail")],
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="mode", required=True)
    compare_parser = subparsers.add_parser("compare")
    compare_parser.add_argument("--before", required=True)
    compare_parser.add_argument("--after", required=True)
    compare_parser.add_argument("--json", action="store_true")
    selftest_parser = subparsers.add_parser("selftest")
    selftest_parser.add_argument("--json", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv[1:])
    if args.mode == "selftest":
        result = selftest()
    else:
        result = compare_dirs(Path(args.before), Path(args.after))
    print(json.dumps(result, indent=2))
    return 0 if result.get("status") == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
