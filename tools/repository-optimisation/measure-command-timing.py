#!/usr/bin/env python3
"""Bounded local command timing and warn-only comparison tooling for USF."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


CATALOGUE_PATHS = [
    Path("spec/taxonomies/taxonomy-catalog.json"),
    Path("spec/vocabularies/vocabulary-catalog.json"),
    Path("spec/registries/schema-registry.json"),
]

NON_CLAIMS = [
    "Generated timing output is not USF semantic authority.",
    "Generated timing output is not a readiness claim.",
    "Generated timing output is not a staging, production, deployment, live-provider, store, release, compliance, or human-acceptance claim.",
    "Timing comparison is warn-only and does not hard-block CI.",
    "No external provider, remote cache, task graph, or Testcontainers migration is introduced by this tool.",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, sort_keys=True)
        handle.write("\n")


def record_base(label: str, title: str, description: str) -> dict[str, Any]:
    return {
        "id": f"usf.repository-optimisation.timing.{label}",
        "authorityLevel": "generated-report",
        "status": "advisory",
        "findings": [],
        "title": title,
        "description": description,
        "lifecycleState": "draft",
        "ontologyConcepts": ["Command", "Generated Report"],
        "taxonomyRefs": ["evidence-and-proof"],
        "vocabularyRefs": ["report-statuses", "validation-severities"],
        "aiGuidance": "Lowest-authority generated timing report for bounded local optimisation review only. "
        + " ".join(NON_CLAIMS),
        "evidenceRefs": [
            "tools/repository-optimisation/measure-command-timing.py"
        ],
    }


def compare_values(
    baseline_ms: int,
    current_ms: int,
    warning_threshold_percent: float,
) -> dict[str, Any]:
    delta_ms = current_ms - baseline_ms
    if baseline_ms > 0:
        delta_percent = (delta_ms / baseline_ms) * 100
    else:
        delta_percent = 0.0 if current_ms == baseline_ms else 100.0
    status = "warn" if delta_percent > warning_threshold_percent else "pass"
    return {
        "baselineWallMs": baseline_ms,
        "currentWallMs": current_ms,
        "deltaWallMs": delta_ms,
        "deltaPercent": round(delta_percent, 4),
        "warningThresholdPercent": warning_threshold_percent,
        "status": status,
        "enforcementMode": "warn-only",
        "hardCiBlock": False,
    }


def command_text(command: list[str]) -> str:
    return " ".join(command)


def timing_finding(
    *,
    label: str,
    command: list[str],
    started_at: str,
    ended_at: str,
    wall_ms: int,
    exit_code: int,
) -> dict[str, Any]:
    severity = "info" if exit_code == 0 else "error"
    return {
        "severity": severity,
        "ruleId": "USF-TIMING-MEASURE",
        "subject": label,
        "message": (
            f"Local command timing measured wallMs={wall_ms}; exitCode={exit_code}; "
            f"startedAt={started_at}; endedAt={ended_at}; command={command_text(command)}. "
            "This is generated timing evidence only and carries no readiness claim."
        ),
        "evidenceRefs": [
            f"timing-wall-ms:{wall_ms}",
            f"exit-code:{exit_code}",
            f"started-at:{started_at}",
            f"ended-at:{ended_at}",
        ],
    }


def extract_wall_ms(record: dict[str, Any], source: Path) -> int:
    for finding in record.get("findings", []):
        if not isinstance(finding, dict):
            continue
        for ref in finding.get("evidenceRefs", []):
            if isinstance(ref, str) and ref.startswith("timing-wall-ms:"):
                return int(ref.split(":", 1)[1])
    raise ValueError(f"{source} has no timing-wall-ms evidence reference")


def command_measure(args: argparse.Namespace) -> int:
    command = list(args.command)
    if not command:
        print("measure requires a command after --", file=sys.stderr)
        return 2

    started_at = utc_now()
    monotonic_start = time.perf_counter()
    result = subprocess.run(command, cwd=Path.cwd())
    wall_ms = int(round((time.perf_counter() - monotonic_start) * 1000))
    ended_at = utc_now()

    record = record_base(
        args.label,
        title=f"Local timing report for {args.label}",
        description="Generated local command timing report. It supports bounded optimisation review and does not define USF semantics.",
    )
    record["status"] = "advisory" if result.returncode == 0 else "fail"
    record["findings"].append(
        timing_finding(
            label=args.label,
            command=command,
            started_at=started_at,
            ended_at=ended_at,
            wall_ms=wall_ms,
            exit_code=result.returncode,
        )
    )
    if args.baseline:
        baseline_path = Path(args.baseline)
        baseline = load_json(baseline_path)
        baseline_ms = extract_wall_ms(baseline, baseline_path)
        comparison = compare_values(
            baseline_ms,
            wall_ms,
            args.warning_threshold_percent,
        )
        severity = "warning" if comparison["status"] == "warn" else "info"
        record["findings"].append(
            {
                "severity": severity,
                "ruleId": "USF-TIMING-COMPARE",
                "subject": args.label,
                "message": (
                    f"Warn-only timing comparison status={comparison['status']}; "
                    f"baselineWallMs={comparison['baselineWallMs']}; currentWallMs={comparison['currentWallMs']}; "
                    f"deltaWallMs={comparison['deltaWallMs']}; deltaPercent={comparison['deltaPercent']}; "
                    f"thresholdPercent={comparison['warningThresholdPercent']}."
                ),
                "evidenceRefs": [
                    f"baseline:{args.baseline}",
                    f"baseline-wall-ms:{comparison['baselineWallMs']}",
                    f"current-wall-ms:{comparison['currentWallMs']}",
                    f"delta-wall-ms:{comparison['deltaWallMs']}",
                    f"delta-percent:{comparison['deltaPercent']}",
                    "enforcement-mode:warn-only",
                    "hard-ci-block:false",
                ],
            }
        )

    write_json(Path(args.output), record)
    return result.returncode


def command_compare(args: argparse.Namespace) -> int:
    baseline_path = Path(args.baseline)
    current_path = Path(args.current)
    baseline = load_json(baseline_path)
    current = load_json(current_path)
    baseline_ms = extract_wall_ms(baseline, baseline_path)
    current_ms = extract_wall_ms(current, current_path)
    comparison = compare_values(
        baseline_ms,
        current_ms,
        args.warning_threshold_percent,
    )

    record = record_base(
        args.label,
        title="Local before and after timing comparison",
        description="Generated warn-only before and after timing comparison for bounded local optimisation review.",
    )
    severity = "warning" if comparison["status"] == "warn" else "info"
    record["findings"].append(
        {
            "severity": severity,
            "ruleId": "USF-TIMING-COMPARE",
            "subject": args.label,
            "message": (
                f"Warn-only timing comparison status={comparison['status']}; "
                f"baselineWallMs={comparison['baselineWallMs']}; currentWallMs={comparison['currentWallMs']}; "
                f"deltaWallMs={comparison['deltaWallMs']}; deltaPercent={comparison['deltaPercent']}; "
                f"thresholdPercent={comparison['warningThresholdPercent']}."
            ),
            "evidenceRefs": [
                f"baseline:{args.baseline}",
                f"current:{args.current}",
                f"baseline-wall-ms:{comparison['baselineWallMs']}",
                f"current-wall-ms:{comparison['currentWallMs']}",
                f"delta-wall-ms:{comparison['deltaWallMs']}",
                f"delta-percent:{comparison['deltaPercent']}",
                "enforcement-mode:warn-only",
                "hard-ci-block:false",
            ],
        }
    )
    record["evidenceRefs"].extend([args.baseline, args.current])
    write_json(Path(args.output), record)
    return 0


def command_parse_catalogues(_: argparse.Namespace) -> int:
    parsed = []
    for path in CATALOGUE_PATHS:
        with path.open(encoding="utf-8") as handle:
            json.load(handle)
        parsed.append(str(path))
    print(json.dumps({"parsed": parsed}, indent=2, sort_keys=True))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Measure local command timing and produce warn-only comparison reports."
    )
    subparsers = parser.add_subparsers(dest="command_name", required=True)

    measure = subparsers.add_parser("measure")
    measure.add_argument("--label", required=True)
    measure.add_argument("--output", required=True)
    measure.add_argument("--baseline")
    measure.add_argument("--warning-threshold-percent", type=float, default=20.0)
    measure.add_argument("command", nargs=argparse.REMAINDER)
    measure.set_defaults(func=command_measure)

    compare = subparsers.add_parser("compare")
    compare.add_argument("--label", default="before-after-comparison")
    compare.add_argument("--baseline", required=True)
    compare.add_argument("--current", required=True)
    compare.add_argument("--output", required=True)
    compare.add_argument("--warning-threshold-percent", type=float, default=20.0)
    compare.set_defaults(func=command_compare)

    parse_catalogues = subparsers.add_parser("parse-catalogues")
    parse_catalogues.set_defaults(func=command_parse_catalogues)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if getattr(args, "command", None) and args.command[0] == "--":
        args.command = args.command[1:]
    try:
        return args.func(args)
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        print(f"timing tool error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
