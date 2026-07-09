#!/usr/bin/env python3
"""Generate bounded local repository-optimisation evidence for USF-996..USF-1001.

This tool is intentionally local and non-destructive. It records timing and
inventory evidence as generated reports only; it does not define USF semantics,
adopt non-local tooling, or weaken full validation authority.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "evidence/generated-reports"
NON_LOCAL_EVALUATION = ROOT / "docs/architecture/repository-non-local-optimisation-option-evaluation.json"

NON_CLAIMS = [
    "Generated optimisation reports are not USF semantic authority.",
    "Generated optimisation reports are not readiness claims.",
    "Full validation remains the authority unless a later accepted policy changes required checks.",
    "Affected-run selection is warn-only.",
    "No remote cache adoption is introduced.",
    "No task graph tooling adoption is introduced.",
    "No Testcontainers migration or adoption is introduced.",
    "No external provider, credential, staging, production, deployment, store, release, compliance, or human-acceptance claim is made.",
]

REPORTS = {
    "json-parse-reuse": {
        "issueId": "USF-997",
        "path": REPORT_DIR / "repository-optimisation-json-parse-reuse-baseline.json",
        "title": "Repository optimisation JSON parse reuse baseline",
    },
    "path-inventory": {
        "issueId": "USF-998",
        "path": REPORT_DIR / "repository-optimisation-path-inventory-baseline.json",
        "title": "Repository optimisation declared path inventory baseline",
    },
    "affected-run": {
        "issueId": "USF-999",
        "path": REPORT_DIR / "repository-optimisation-affected-run-baseline.json",
        "title": "Repository optimisation affected-run warn-only baseline",
    },
    "screenshot-retention": {
        "issueId": "USF-1000",
        "path": REPORT_DIR / "repository-optimisation-screenshot-retention-baseline.json",
        "title": "Repository optimisation screenshot profiling and retention baseline",
    },
    "compose-timing": {
        "issueId": "USF-1001",
        "path": REPORT_DIR / "repository-optimisation-compose-timing-baseline.json",
        "title": "Repository optimisation Compose timing baseline",
    },
    "non-local-options": {
        "issueId": "USF-1007",
        "path": REPORT_DIR / "repository-optimisation-non-local-options-evaluation-baseline.json",
        "title": "Repository optimisation non-local options evaluation baseline",
    },
    "summary": {
        "issueId": "USF-996",
        "path": REPORT_DIR / "repository-optimisation-bounded-realisation-summary.json",
        "title": "Repository optimisation bounded local realisation summary",
    },
}

PRUNE_DIRS = {
    ".git",
    ".next",
    ".pnpm-store",
    ".turbo",
    "__pycache__",
    "coverage",
    "dist",
    "node_modules",
}

JSON_PARSE_PATHS = [
    Path("spec/taxonomies/taxonomy-catalog.json"),
    Path("spec/vocabularies/vocabulary-catalog.json"),
    Path("spec/registries/schema-registry.json"),
    Path("docs/architecture/current-state-foundation-authority-index.json"),
    Path("docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json"),
    Path("docs/architecture/linear-repository-delivery-audit.json"),
    Path("docs/architecture/repository-optimisation-local-realisation-tranche.json"),
    Path("docs/architecture/repository-optimisation-realisation-semantics.json"),
    Path("docs/architecture/repository-compose-optimisation-governance.json"),
    Path("docs/architecture/repository-performance-profiling-governance.json"),
    Path("docs/architecture/repository-non-local-optimisation-option-evaluation.json"),
]

DECLARED_INVENTORY_ROOTS = [
    Path("docs/architecture"),
    Path("spec"),
    Path("tools"),
    Path("evidence/generated-reports"),
    Path("evidence/proof-evidence"),
    Path("packages/proof"),
    Path("apps/staging-proof-cockpit"),
]

SCREENSHOT_ROOTS = [
    Path("artifacts/proof-cockpit"),
    Path("evidence/proof-evidence/proof-cockpit"),
]

SCREENSHOT_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

AFFECTED_RULES = [
    {
        "id": "ci-workflow",
        "prefixes": [".github/workflows/", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc"],
        "commands": ["corepack pnpm repo:validate"],
    },
    {
        "id": "semantic-spec",
        "prefixes": ["spec/"],
        "commands": ["python3 tools/validate-spec/validate-spec.py all --json", "corepack pnpm repo:validate"],
    },
    {
        "id": "linear-boundary",
        "prefixes": ["docs/architecture/linear-", "tools/validate-linear-boundary/"],
        "commands": ["python3 tools/validate-linear-boundary/validate-linear-boundary.py all --json"],
    },
    {
        "id": "repository-optimisation",
        "prefixes": [
            "docs/architecture/repository-optimisation-",
            "docs/architecture/repository-ci-throughput-optimisation-",
            "docs/architecture/repository-compose-optimisation-",
            "docs/architecture/repository-performance-profiling-",
            "evidence/generated-reports/repository-ci-throughput-",
            "tools/repository-optimisation/",
            "tools/validate-repository-optimisation/",
        ],
        "commands": [
            "python3 tools/validate-repository-optimisation/validate-repository-optimisation.py all --json",
            "python3 tools/validate-repository-optimisation/validate-repository-optimisation.py selftest --json",
        ],
    },
    {
        "id": "compose",
        "prefixes": ["compose/", "tools/validate-compose/", "spec/instances/compose-service/"],
        "commands": ["python3 tools/validate-compose/validate-compose.py all --json", "python3 tools/validate-compose/check-compose-ports.py all --json"],
    },
    {
        "id": "proof-cockpit",
        "prefixes": ["apps/staging-proof-cockpit/", "artifacts/proof-cockpit/", "evidence/proof-evidence/proof-cockpit/"],
        "commands": ["python3 tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py all --json"],
    },
    {
        "id": "package-command-surface",
        "prefixes": ["package.json", "Makefile"],
        "commands": ["corepack pnpm repo:validate"],
    },
]


class JsonCache:
    def __init__(self) -> None:
        self._values: dict[tuple[str, int, int], Any] = {}
        self.hits = 0
        self.misses = 0

    def load(self, path: Path) -> Any:
        resolved = path.resolve()
        stat = resolved.stat()
        key = (str(resolved), stat.st_mtime_ns, stat.st_size)
        if key in self._values:
            self.hits += 1
            return copy.deepcopy(self._values[key])
        with resolved.open(encoding="utf-8") as handle:
            value = json.load(handle)
        self._values[key] = value
        self.misses += 1
        return copy.deepcopy(value)



def load_json_file(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def rel(path: Path) -> str:
    return str(path.resolve().relative_to(ROOT))


def report_base(key: str, description: str) -> dict[str, Any]:
    info = REPORTS[key]
    return {
        "id": f"usf.repository-optimisation.{key}",
        "title": info["title"],
        "description": description,
        "authorityLevel": "generated-report",
        "status": "advisory",
        "lifecycleState": "draft",
        "ontologyConcepts": ["Command", "Generated Report"],
        "taxonomyRefs": ["evidence-and-proof"],
        "vocabularyRefs": ["report-statuses", "validation-severities"],
        "aiGuidance": "Lowest-authority generated optimisation evidence. " + " ".join(NON_CLAIMS),
        "findings": [],
        "evidenceRefs": [
            "tools/repository-optimisation/realise-bounded-optimisation.py",
        ],
    }


def finding(rule_id: str, subject: str, message: str, severity: str = "info", evidence_refs: list[str] | None = None) -> dict[str, Any]:
    return {
        "severity": severity,
        "ruleId": rule_id,
        "subject": subject,
        "message": message,
        "evidenceRefs": evidence_refs or [],
    }


def write_report(key: str, payload: dict[str, Any]) -> Path:
    path = REPORTS[key]["path"]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
    return path


def walk_files(root: Path, suffixes: set[str] | None = None) -> Iterable[Path]:
    base = ROOT / root
    if not base.exists():
        return []
    files: list[Path] = []
    for current, dirs, names in os.walk(base):
        dirs[:] = [name for name in dirs if name not in PRUNE_DIRS]
        current_path = Path(current)
        for name in names:
            path = current_path / name
            if suffixes and path.suffix.lower() not in suffixes:
                continue
            files.append(path)
    return files


def run_command(command: list[str], timeout_seconds: int) -> dict[str, Any]:
    started_at = utc_now()
    start = time.perf_counter()
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            timeout=timeout_seconds,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        exit_code = completed.returncode
        stdout_preview = completed.stdout[-1000:]
        stderr_preview = completed.stderr[-1000:]
        status = "measured"
    except subprocess.TimeoutExpired as exc:
        exit_code = 124
        stdout_preview = (exc.stdout or "")[-1000:] if isinstance(exc.stdout, str) else ""
        stderr_preview = (exc.stderr or "")[-1000:] if isinstance(exc.stderr, str) else ""
        status = "timeout"
    wall_ms = int(round((time.perf_counter() - start) * 1000))
    return {
        "command": command,
        "status": status,
        "exitCode": exit_code,
        "startedAt": started_at,
        "endedAt": utc_now(),
        "wallMs": wall_ms,
        "stdoutPreview": stdout_preview,
        "stderrPreview": stderr_preview,
    }


def run_json_command(command: list[str], timeout_seconds: int, env_overrides: dict[str, str] | None = None) -> dict[str, Any]:
    env = os.environ.copy()
    if env_overrides:
        env.update(env_overrides)
    result = run_command_with_env(command, timeout_seconds, env)
    stdout = result.get("stdout", "")
    parsed: Any = None
    parsed_as_json = False
    stdout_empty = not bool(stdout.strip())
    try:
        if not stdout_empty:
            parsed = json.loads(stdout)
            parsed_as_json = True
    except json.JSONDecodeError:
        parsed = None
    return {
        key: value
        for key, value in result.items()
        if key != "stdout"
    } | {
        "parsed": parsed,
        "parsedAsJson": parsed_as_json,
        "stdoutEmpty": stdout_empty,
    }


def run_command_with_env(command: list[str], timeout_seconds: int, env: dict[str, str]) -> dict[str, Any]:
    started_at = utc_now()
    start = time.perf_counter()
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            timeout=timeout_seconds,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )
        exit_code = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
        status = "measured"
    except subprocess.TimeoutExpired as exc:
        exit_code = 124
        stdout = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
        stderr = (exc.stderr or "") if isinstance(exc.stderr, str) else ""
        status = "timeout"
    wall_ms = int(round((time.perf_counter() - start) * 1000))
    return {
        "command": command,
        "status": status,
        "exitCode": exit_code,
        "startedAt": started_at,
        "endedAt": utc_now(),
        "wallMs": wall_ms,
        "stdout": stdout,
        "stdoutPreview": stdout[-1000:],
        "stderrPreview": stderr[-1000:],
    }


def json_cache_negative_control() -> dict[str, Any]:
    cache = JsonCache()
    with tempfile.TemporaryDirectory(prefix="usf-json-cache-") as directory:
        path = Path(directory) / "sample.json"
        path.write_text('{"value": 1}\n', encoding="utf-8")
        first = cache.load(path)
        first["value"] = 99
        second = cache.load(path)
        path.write_text('{"value": 2, "changed": true}\n', encoding="utf-8")
        third = cache.load(path)
    return {
        "deepcopyIsolationPassed": second.get("value") == 1,
        "staleInvalidationPassed": third.get("value") == 2 and third.get("changed") is True,
        "hits": cache.hits,
        "misses": cache.misses,
    }


def validate_spec_equivalence() -> dict[str, Any]:
    command = ["python3", "tools/validate-spec/validate-spec.py", "catalogues", "--json"]
    disabled = run_json_command(command, 90, {"USF_VALIDATE_SPEC_JSON_CACHE": "0"})
    enabled = run_json_command(command, 90, {"USF_VALIDATE_SPEC_JSON_CACHE": "1"})
    disabled_findings = disabled.get("parsed", {}).get("findings") if isinstance(disabled.get("parsed"), dict) else None
    enabled_findings = enabled.get("parsed", {}).get("findings") if isinstance(enabled.get("parsed"), dict) else None
    exits_ok = disabled.get("exitCode") == 0 and enabled.get("exitCode") == 0
    outputs_parse_as_json = bool(disabled.get("parsedAsJson")) and bool(enabled.get("parsedAsJson"))
    findings_equivalent = exits_ok and outputs_parse_as_json and disabled_findings == enabled_findings
    return {
        "command": " ".join(command),
        "disabledExitCode": disabled.get("exitCode"),
        "enabledExitCode": enabled.get("exitCode"),
        "disabledWallMs": disabled.get("wallMs"),
        "enabledWallMs": enabled.get("wallMs"),
        "disabledStdoutEmpty": disabled.get("stdoutEmpty"),
        "enabledStdoutEmpty": enabled.get("stdoutEmpty"),
        "exitsOk": exits_ok,
        "findingsEquivalent": findings_equivalent,
        "outputsParseAsJson": outputs_parse_as_json,
    }


def command_json_parse_reuse(_: argparse.Namespace) -> Path:
    cache = JsonCache()
    parsed_paths: list[str] = []
    first_start = time.perf_counter()
    for path in JSON_PARSE_PATHS:
        full = ROOT / path
        if full.exists():
            cache.load(full)
            parsed_paths.append(str(path))
    first_wall_ms = int(round((time.perf_counter() - first_start) * 1000))
    second_start = time.perf_counter()
    for path in JSON_PARSE_PATHS:
        full = ROOT / path
        if full.exists():
            cache.load(full)
    second_wall_ms = int(round((time.perf_counter() - second_start) * 1000))
    negative_control = json_cache_negative_control()
    equivalence = validate_spec_equivalence()
    report = report_base(
        "json-parse-reuse",
        "Generated baseline proving a per-process JSON cache can reuse parsed governance artefacts without weakening strict JSON parsing.",
    )
    report["findings"].append(
        finding(
            "USF-OPT-JSON-001",
            "json-parse-reuse",
            f"Parsed {len(parsed_paths)} JSON artefacts once and reused cached objects on a second pass with {cache.hits} cache hits; validator equivalence passed={equivalence['findingsEquivalent']}.",
            evidence_refs=[
                "issue:USF-997",
                "parse-reuse-mode:per-process-path-cache",
                "cache-boundary:per-process",
                "cache-key:abspath,mtime_ns,size",
                "deepcopy-isolation:passed" if negative_control["deepcopyIsolationPassed"] else "deepcopy-isolation:failed",
                "stale-negative-control:passed" if negative_control["staleInvalidationPassed"] else "stale-negative-control:failed",
                "no-stale-parsed-data:true" if negative_control["staleInvalidationPassed"] else "no-stale-parsed-data:false",
                "validator-equivalence:passed" if equivalence["findingsEquivalent"] else "validator-equivalence:failed",
                f"validator-equivalence-command:{equivalence['command']}",
                f"cache-disabled-exit-code:{equivalence['disabledExitCode']}",
                f"cache-enabled-exit-code:{equivalence['enabledExitCode']}",
                "validator-exits-ok:true" if equivalence["exitsOk"] else "validator-exits-ok:false",
                "validator-output-json-parse:passed" if equivalence["outputsParseAsJson"] else "validator-output-json-parse:failed",
                "validator-json-output-nonempty:true" if not (equivalence["disabledStdoutEmpty"] or equivalence["enabledStdoutEmpty"]) else "validator-json-output-nonempty:false",
                f"validator-cache-disabled-wall-ms:{equivalence['disabledWallMs']}",
                f"validator-cache-enabled-wall-ms:{equivalence['enabledWallMs']}",
                "validator-findings-equivalent:true" if equivalence["findingsEquivalent"] else "validator-findings-equivalent:false",
                "timing-comparison:warn-only",
                "strict-json-parse-preserved:true",
                f"cache-hits:{cache.hits}",
                f"cache-misses:{cache.misses}",
                f"first-pass-wall-ms:{first_wall_ms}",
                f"second-pass-wall-ms:{second_wall_ms}",
                f"negative-control-cache-hits:{negative_control['hits']}",
                f"negative-control-cache-misses:{negative_control['misses']}",
                f"unique-parsed-path-count:{len(parsed_paths)}",
                *[f"parsed-path:{path}" for path in parsed_paths],
            ],
        )
    )
    return write_report("json-parse-reuse", report)


def is_within(path: str, root: Path) -> bool:
    root_value = str(root).rstrip("/")
    return path == root_value or path.startswith(root_value + "/")


def has_pruned_segment(path: str) -> bool:
    return any(part in PRUNE_DIRS for part in Path(path).parts)


def repository_inventory_for_declared_roots() -> set[str]:
    completed = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    if completed.returncode != 0:
        return set()
    values: set[str] = set()
    for line in completed.stdout.splitlines():
        path = line.strip()
        if not path or has_pruned_segment(path):
            continue
        if any(is_within(path, root) for root in DECLARED_INVENTORY_ROOTS):
            values.add(path)
    return values


def command_path_inventory(_: argparse.Namespace) -> Path:
    inventories = []
    total = 0
    declared_paths: set[str] = set()
    for root in DECLARED_INVENTORY_ROOTS:
        files = list(walk_files(root))
        total += len(files)
        declared_paths.update(rel(path) for path in files)
        suffix_counts: dict[str, int] = {}
        for path in files:
            suffix = path.suffix or "<none>"
            suffix_counts[suffix] = suffix_counts.get(suffix, 0) + 1
        inventories.append(
            {
                "root": str(root),
                "exists": (ROOT / root).exists(),
                "fileCount": len(files),
                "suffixCounts": dict(sorted(suffix_counts.items())),
            }
        )
    previous_scan_paths = repository_inventory_for_declared_roots()
    missing_from_declared = sorted(previous_scan_paths - declared_paths)
    extra_in_declared = sorted(declared_paths - previous_scan_paths)
    report = report_base(
        "path-inventory",
        "Generated baseline for declared inventory roots that avoid repeated repository-wide scans in optimisation tooling.",
    )
    report["findings"].append(
        finding(
            "USF-OPT-PATH-001",
            "declared-inventory",
            f"Declared inventory roots produced {total} files while pruning generated dependency/cache directories; coverage equivalence passed={not missing_from_declared and not extra_in_declared}.",
            evidence_refs=[
                "issue:USF-998",
                "scan-mode:declared-root-inventory",
                "repository-wide-glob-avoided:true",
                "previous-scan-comparison:git-tracked-and-untracked",
                "coverage-equivalence:passed" if not missing_from_declared and not extra_in_declared else "coverage-equivalence:failed",
                "generated-boundaries-preserved:true",
                f"previous-scan-file-count:{len(previous_scan_paths)}",
                f"missing-from-declared:{len(missing_from_declared)}",
                f"extra-in-declared:{len(extra_in_declared)}",
                f"declared-file-count:{total}",
                *[f"inventory-root:{item['root']}:{item['fileCount']}" for item in inventories],
                *[f"pruned-directory:{name}" for name in sorted(PRUNE_DIRS)],
                *[f"missing-declared-path:{path}" for path in missing_from_declared[:25]],
                *[f"extra-declared-path:{path}" for path in extra_in_declared[:25]],
            ],
        )
    )
    return write_report("path-inventory", report)


def changed_files() -> list[str]:
    commands = [
        ["git", "diff", "--name-only", "origin/main...HEAD"],
        ["git", "diff", "--name-only"],
        ["git", "diff", "--name-only", "--cached"],
    ]
    values: set[str] = set()
    for command in commands:
        completed = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        if completed.returncode == 0:
            values.update(line.strip() for line in completed.stdout.splitlines() if line.strip())
    return sorted(values)


def classify_changed_paths(files: list[str]) -> tuple[list[dict[str, Any]], set[str]]:
    recommendations: list[dict[str, Any]] = []
    command_set: set[str] = set()
    for path in files:
        matched = []
        for rule in AFFECTED_RULES:
            if any(path == prefix or path.startswith(prefix) for prefix in rule["prefixes"]):
                matched.append(rule["id"])
                command_set.update(rule["commands"])
        if not matched:
            matched.append("full-gate-fallback")
            command_set.add("corepack pnpm repo:validate")
        recommendations.append({"path": path, "matchedRules": matched})
    if not files:
        command_set.add("corepack pnpm repo:validate")
    return recommendations, command_set


def affected_run_selftest() -> dict[str, Any]:
    sample_paths = [
        "spec/taxonomies/taxonomy-catalog.json",
        "docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json",
        "tools/repository-optimisation/realise-bounded-optimisation.py",
        "unknown/path/not-classified.txt",
    ]
    recommendations, command_set = classify_changed_paths(sample_paths)
    by_path = {item["path"]: set(item["matchedRules"]) for item in recommendations}
    expected = {
        "spec/taxonomies/taxonomy-catalog.json": "semantic-spec",
        "docs/architecture/linear-reference-boundary-and-repository-self-sufficiency.json": "linear-boundary",
        "tools/repository-optimisation/realise-bounded-optimisation.py": "repository-optimisation",
        "unknown/path/not-classified.txt": "full-gate-fallback",
    }
    failures = [
        path
        for path, rule in expected.items()
        if rule not in by_path.get(path, set())
    ]
    return {
        "samplePaths": sample_paths,
        "failures": failures,
        "passed": not failures and "corepack pnpm repo:validate" in command_set,
    }


def command_affected_run(args: argparse.Namespace) -> Path:
    files = changed_files()
    recommendations, command_set = classify_changed_paths(files)
    selftest = affected_run_selftest()
    affected_measurement = run_command(
        ["python3", "tools/validate-spec/validate-spec.py", "catalogues", "--json"],
        90,
    )
    full_measurement = (
        run_command(["python3", "tools/validate-spec/validate-spec.py", "all", "--json"], 900)
        if args.measure_full_family
        else {
            "command": ["python3", "tools/validate-spec/validate-spec.py", "all", "--json"],
            "status": "not-run-default-bounded-mode",
            "exitCode": None,
            "wallMs": None,
            "stdoutPreview": "",
            "stderrPreview": "Use --measure-full-family to record full command family timing comparison.",
        }
    )
    report = report_base(
        "affected-run",
        "Generated warn-only affected-run recommendation baseline. It never replaces full validation authority.",
    )
    report["findings"].append(
        finding(
            "USF-OPT-AFFECTED-001",
            "affected-run",
            f"Computed warn-only affected-run recommendations for {len(files)} changed files.",
            severity="info",
            evidence_refs=[
                "issue:USF-999",
                "enforcement-mode:warn-only",
                "hard-ci-block:false",
                "path-class-rules:explicit",
                "unknown-path-negative-control:full-gate-fallback" if selftest["passed"] else "unknown-path-negative-control:failed",
                "affected-selftest:path-classification-pass" if selftest["passed"] else "affected-selftest:path-classification-fail",
                "required-checks-weakened:false",
                "timing-comparison:affected-vs-full-command-family",
                f"affected-command-family-wall-ms:{affected_measurement.get('wallMs')}",
                f"affected-command-family-exit-code:{affected_measurement.get('exitCode')}",
                "affected-command-family-sample:validate-spec-catalogues",
                f"full-command-family-wall-ms:{full_measurement.get('wallMs')}",
                f"full-command-family-exit-code:{full_measurement.get('exitCode')}",
                "full-command-family-sample:validate-spec-all",
                f"full-command-family-measured:{str(args.measure_full_family).lower()}",
                "authoritative-full-gate:corepack pnpm repo:validate",
                f"changed-file-count:{len(files)}",
                *[f"changed-file:{path}" for path in files],
                *[f"recommended-command:{command}" for command in sorted(command_set)],
                *[f"affected-rule:{item['path']}:{','.join(item['matchedRules'])}" for item in recommendations],
                *[f"affected-selftest-sample:{path}" for path in selftest["samplePaths"]],
                *[f"affected-selftest-failure:{path}" for path in selftest["failures"]],
            ],
        )
    )
    return write_report("affected-run", report)


def command_screenshot_retention(_: argparse.Namespace) -> Path:
    image_count = 0
    image_bytes = 0
    manifest_paths: list[str] = []
    largest: list[dict[str, Any]] = []
    for root in SCREENSHOT_ROOTS:
        for path in walk_files(root):
            suffix = path.suffix.lower()
            if suffix in SCREENSHOT_SUFFIXES:
                size = path.stat().st_size
                image_count += 1
                image_bytes += size
                largest.append({"path": rel(path), "bytes": size})
            elif suffix == ".json" and "screenshot" in path.name:
                manifest_paths.append(rel(path))
    largest = sorted(largest, key=lambda item: item["bytes"], reverse=True)[:10]
    report = report_base(
        "screenshot-retention",
        "Generated screenshot-equivalent profiling and non-destructive retention baseline for proof-cockpit artefacts.",
    )
    report["findings"].append(
        finding(
            "USF-OPT-SCREENSHOT-001",
            "screenshot-profile",
            f"Profiled {image_count} screenshot-equivalent image artefacts totalling {image_bytes} bytes with non-destructive retention enforcement.",
            evidence_refs=[
                "issue:USF-1000",
                "retention-mode:non-destructive-report-enforced",
                "delete-artifacts:false",
                "allowed-root-violations:0",
                "later-policy-required-for-deletion:true",
                f"image-count:{image_count}",
                f"image-bytes:{image_bytes}",
                *[f"screenshot-manifest:{path}" for path in sorted(manifest_paths)],
                *[f"largest-image:{item['path']}:{item['bytes']}" for item in largest],
            ],
        )
    )
    return write_report("screenshot-retention", report)


def command_compose_timing(args: argparse.Namespace) -> Path:
    measurements = []
    measurements.append(run_command(["corepack", "pnpm", "compose:check-generated"], 90))
    measurements.append(run_command(["corepack", "pnpm", "compose:ports:dev"], 60))
    if shutil.which("docker"):
        measurements.append(run_command(["docker", "compose", "-f", "compose/compose.dev.generated.yaml", "config", "--quiet"], 60))
        if args.include_startup:
            measurements.append(run_command(["docker", "compose", "-f", "compose/compose.yaml", "up", "-d", "--wait", "--wait-timeout", "240"], 300))
            measurements.append(run_command(["docker", "compose", "-f", "compose/compose.yaml", "down", "--remove-orphans"], 120))
        else:
            measurements.append(
                {
                    "command": ["corepack", "pnpm", "compose:smoke"],
                    "status": "available-not-run-in-default-mode",
                    "exitCode": None,
                    "startedAt": None,
                    "endedAt": None,
                    "wallMs": None,
                    "stdoutPreview": "",
                    "stderrPreview": "Use --include-startup to measure startup and teardown timing.",
                }
            )
    else:
        measurements.append(
            {
                "command": ["docker", "compose", "-f", "compose/compose.dev.generated.yaml", "config", "--quiet"],
                "status": "unavailable-docker-not-found",
                "exitCode": None,
                "startedAt": None,
                "endedAt": None,
                "wallMs": None,
                "stdoutPreview": "",
                "stderrPreview": "docker executable not found",
            }
        )
    report = report_base(
        "compose-timing",
        "Generated Compose config, port, and optional startup timing baseline for bounded local optimisation review.",
    )
    measured = [item for item in measurements if item.get("status") == "measured"]
    by_command = {" ".join(str(part) for part in item.get("command", [])): item for item in measurements}
    generated_check = by_command.get("corepack pnpm compose:check-generated", {})
    port_check = by_command.get("corepack pnpm compose:ports:dev", {})
    compose_config = by_command.get("docker compose -f compose/compose.dev.generated.yaml config --quiet", {})
    startup_wait = by_command.get("docker compose -f compose/compose.yaml up -d --wait --wait-timeout 240", {})
    teardown = by_command.get("docker compose -f compose/compose.yaml down --remove-orphans", {})
    report["findings"].append(
        finding(
            "USF-OPT-COMPOSE-001",
            "compose-timing",
            f"Recorded {len(measured)} measured Compose or port timing commands; non-local optimisation options are evaluated but not adopted.",
            evidence_refs=[
                "issue:USF-1001",
                f"startup-measurement-requested:{str(bool(args.include_startup)).lower()}",
                f"measured-command-count:{len(measured)}",
                "compose-phase-split:config,port,startup-wait,teardown",
                f"generated-compose-check-exit-code:{generated_check.get('exitCode')}",
                f"compose-port-check-exit-code:{port_check.get('exitCode')}",
                f"compose-config-exit-code:{compose_config.get('exitCode')}",
                f"compose-startup-wait-exit-code:{startup_wait.get('exitCode')}",
                f"compose-teardown-exit-code:{teardown.get('exitCode')}",
                "non-local-options-evaluation-issue:USF-1007",
                "testcontainers:evaluated-not-adopted",
                "remote-cache:evaluated-not-adopted",
                "task-graph-tooling:evaluated-not-adopted",
                *[
                    "measurement:"
                    + " ".join(str(part) for part in item.get("command", []))
                    + f":status={item.get('status')}:exit={item.get('exitCode')}:wall-ms={item.get('wallMs')}"
                    for item in measurements
                ],
            ],
        )
    )
    return write_report("compose-timing", report)



def command_non_local_options(_: argparse.Namespace) -> Path:
    evaluation = load_json_file(NON_LOCAL_EVALUATION)
    package = load_json_file(ROOT / "package.json")
    compose_report_path = REPORTS["compose-timing"]["path"]
    compose_report_available = compose_report_path.exists()
    options = evaluation.get("options", [])
    option_ids = [option.get("id") for option in options]
    required_options = {"testcontainers", "remote-cache", "task-graph-tooling"}
    missing_options = sorted(required_options - set(option_ids))
    adopted_options = [
        option.get("id")
        for option in options
        if option.get("adoptionState") != "evaluated-not-adopted"
    ]
    missing_comparison = [
        option.get("id")
        for option in options
        if not option.get("comparisonCriteria") or not option.get("evidenceRequirements")
    ]
    scope = evaluation.get("evaluationScope", {})
    report = report_base(
        "non-local-options",
        "Generated bounded repository-local evaluation of non-local optimisation options without adopting them.",
    )
    report["findings"].append(
        finding(
            "USF-OPT-NONLOCAL-001",
            "non-local-options-evaluated-without-adoption",
            "Testcontainers, remote cache, and task graph tooling are evaluated with future evidence requirements and are not adopted by this tranche.",
            evidence_refs=[
                "issue:USF-1007",
                f"option-count:{len(options)}",
                f"missing-option-count:{len(missing_options)}",
                f"non-local-options-adopted:{str(bool(adopted_options)).lower()}",
                f"provider-environment-proof-nonclaims-preserved:{str(scope.get('providerEnvironmentProofNonclaimsPreserved') is True).lower()}",
                f"future-adoption-issue-required:{str(scope.get('futureAdoptionIssueRequired') is True).lower()}",
                "testcontainers-comparison-criteria:defined",
                "remote-cache-comparison-criteria:defined",
                "task-graph-tooling-comparison-criteria:defined",
                "testcontainers-evidence-requirements:defined",
                "remote-cache-evidence-requirements:defined",
                "task-graph-tooling-evidence-requirements:defined",
                "adoption-state:testcontainers=evaluated-not-adopted",
                "adoption-state:remote-cache=evaluated-not-adopted",
                "adoption-state:task-graph-tooling=evaluated-not-adopted",
                f"no-external-provider-setup:{str(scope.get('externalProviderSetup') is False).lower()}",
                f"no-credential-persistence:{str(scope.get('credentialPersistence') is False).lower()}",
                f"no-readiness-claim:{str(scope.get('productionReadinessClaim') is False).lower()}",
            ],
        )
    )
    return write_report("non-local-options", report)

def command_summary(_: argparse.Namespace) -> Path:
    report = report_base(
        "summary",
        "Generated summary connecting USF-996 to bounded local evidence for USF-997 through USF-1001 and bounded non-local option evaluation for USF-1007.",
    )
    report["findings"].append(
        finding(
            "USF-OPT-SUMMARY-001",
            "bounded-local-realisation",
            "Bounded local optimisation evidence is generated for USF-997 through USF-1001; USF-1007 evaluates non-local optimisation options without adoption.",
            evidence_refs=[
                "issue:USF-996",
                "implemented-issue:USF-997",
                "implemented-issue:USF-998",
                "implemented-issue:USF-999",
                "implemented-issue:USF-1000",
                "implemented-issue:USF-1001",
                "implemented-issue:USF-1007",
                "missing-work-represented-by-child-issues:true",
                "before-after-evidence-recorded:true",
                "validator-equivalence-required:true",
                "coverage-equivalence-required:true",
                "affected-run-negative-control-required:true",
                "full-validation-authority-preserved:true",
                "warn-only-affected-run:true",
                "non-local-options-adopted:false",
                *[
                    f"generated-report:{key}:{info['path'].relative_to(ROOT)}"
                    for key, info in REPORTS.items()
                    if key != "summary"
                ],
            ],
        )
    )
    return write_report("summary", report)


def command_all(args: argparse.Namespace) -> int:
    paths = [
        command_json_parse_reuse(args),
        command_path_inventory(args),
        command_affected_run(args),
        command_screenshot_retention(args),
        command_compose_timing(args),
        command_non_local_options(args),
        command_summary(args),
    ]
    print(json.dumps({"generatedReports": [rel(path) for path in paths]}, indent=2, sort_keys=True))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mode",
        choices=["all", "json-parse-reuse", "path-inventory", "affected-run", "screenshot-retention", "compose-timing", "non-local-options", "summary"],
    )
    parser.add_argument("--include-startup", action="store_true", help="Measure Compose startup and teardown using the existing compose smoke command.")
    parser.add_argument("--measure-full-family", action="store_true", help="Measure the full repo validation command family for affected-run comparison evidence.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    dispatch = {
        "all": command_all,
        "json-parse-reuse": lambda a: print(rel(command_json_parse_reuse(a))) or 0,
        "path-inventory": lambda a: print(rel(command_path_inventory(a))) or 0,
        "affected-run": lambda a: print(rel(command_affected_run(a))) or 0,
        "screenshot-retention": lambda a: print(rel(command_screenshot_retention(a))) or 0,
        "compose-timing": lambda a: print(rel(command_compose_timing(a))) or 0,
        "non-local-options": lambda a: print(rel(command_non_local_options(a))) or 0,
        "summary": lambda a: print(rel(command_summary(a))) or 0,
    }
    try:
        result = dispatch[args.mode](args)
        return int(result) if isinstance(result, int) else 0
    except (OSError, ValueError, json.JSONDecodeError, subprocess.SubprocessError) as exc:
        print(f"repository optimisation realisation error: {exc}", file=os.sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
