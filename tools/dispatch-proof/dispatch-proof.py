#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from types import SimpleNamespace
from pathlib import Path


TERMINAL_MACHINE_QA_ISSUE = "USF-966"

ISSUE_RE = re.compile(r"^USF-[0-9]+$")
SAFE_REF_RE = re.compile(r"^[A-Za-z0-9._/-]+$")

CHANGE_CLASSES = {
    "docs-metadata",
    "semantic-definition",
    "validator-tooling",
    "unit-behaviour",
    "in-memory-dev-proof",
    "compose-test-proof",
    "public-proof",
    "pre-staging-external",
    "terminal-proof-cockpit",
    "ambiguous",
}

RETRY_POLICIES = {"none", "one-retry-on-transient"}
TERMINAL_CONFIRMATIONS = {"no", "yes"}

PROOF_FAMILIES = {
    "proof-cockpit-retained-evidence": {
        "freshMachineQa": False,
        "artifactPosture": [
            "dispatch-proof-plan.json",
            "dispatch-proof-result.json",
            "retained proof-cockpit validation output",
            "retained projection freshness check output",
        ],
        "commands": [
            {"id": "proof-cockpit-validate", "command": ["corepack", "pnpm", "proof-cockpit:validate"]},
            {"id": "proof-cockpit-selftest", "command": ["corepack", "pnpm", "proof-cockpit:selftest"]},
            {"id": "projection-repin-check", "command": ["corepack", "pnpm", "proof-cockpit:projection-repin:check"]},
            {"id": "evidence-reuse-validate", "command": ["corepack", "pnpm", "evidence-reuse:validate"]},
            {"id": "evidence-invalidation-validate", "command": ["corepack", "pnpm", "evidence-invalidation:validate"]},
        ],
    },
    "public-proof-route": {
        "freshMachineQa": False,
        "artifactPosture": [
            "dispatch-proof-plan.json",
            "dispatch-proof-result.json",
            "public proof validation output",
            "external HTTP proof output",
        ],
        "commands": [
            {"id": "public-fqdn-validate", "command": ["corepack", "pnpm", "public-fqdn:validate"]},
            {"id": "public-origin-proof", "command": ["corepack", "pnpm", "proof:public-origin"]},
            {"id": "public-route-proof", "command": ["corepack", "pnpm", "proof:public-route"]},
            {"id": "external-http-behaviour", "command": ["corepack", "pnpm", "proof:external-http-behaviour"]},
            {"id": "external-http-cache", "command": ["corepack", "pnpm", "proof:external-http-cache"]},
            {"id": "external-http-observability", "command": ["corepack", "pnpm", "proof:external-http-observability"]},
        ],
    },
    "pre-staging-external-smoke": {
        "freshMachineQa": False,
        "artifactPosture": [
            "dispatch-proof-plan.json",
            "dispatch-proof-result.json",
            "pre-staging external smoke output",
            "proof-review public posture output",
        ],
        "commands": [
            {"id": "pre-staging-external-smoke", "command": ["corepack", "pnpm", "proof:pre-staging-external-smoke"]},
            {"id": "proof-review-public", "command": ["corepack", "pnpm", "proof:proof-review-public"]},
        ],
    },
    "compose-provider-deep": {
        "freshMachineQa": False,
        "artifactPosture": [
            "dispatch-proof-plan.json",
            "dispatch-proof-result.json",
            "compose validation output",
            "compose runtime proof output",
            "test-readiness integration output",
        ],
        "commands": [
            {"id": "compose-validate", "command": ["corepack", "pnpm", "compose:validate"]},
            {"id": "runtime-compose-proof", "command": ["corepack", "pnpm", "runtime:proof:compose"]},
            {"id": "test-readiness-integration", "command": ["corepack", "pnpm", "test-readiness:integration"]},
        ],
    },
    "repo-aggregate-retained": {
        "freshMachineQa": False,
        "artifactPosture": [
            "dispatch-proof-plan.json",
            "dispatch-proof-result.json",
            "repository aggregate validation output",
        ],
        "commands": [
            {"id": "repo-validate", "command": ["corepack", "pnpm", "repo:validate"]},
        ],
    },
    "terminal-proof-cockpit-machine-evidence": {
        "freshMachineQa": True,
        "artifactPosture": [
            "dispatch-proof-plan.json",
            "dispatch-proof-result.json",
            "fresh proof-cockpit machine evidence",
            "promoted proof-cockpit evidence outputs",
            "post-refresh proof-cockpit validation output",
        ],
        "commands": [
            {"id": "proof-cockpit-machine-qa", "command": ["corepack", "pnpm", "proof-cockpit:machine-qa"]},
            {"id": "proof-cockpit-promote", "command": ["corepack", "pnpm", "proof-cockpit:promote"]},
            {"id": "proof-cockpit-validate", "command": ["corepack", "pnpm", "proof-cockpit:validate"]},
            {"id": "projection-repin-check", "command": ["corepack", "pnpm", "proof-cockpit:projection-repin:check"]},
        ],
    },
}


def validation_errors(args):
    errors = []
    if not ISSUE_RE.fullmatch(args.owner_issue):
        errors.append("owner_issue must be a USF issue key")
    if args.change_class not in CHANGE_CLASSES:
        errors.append("change_class is not supported")
    if args.proof_family not in PROOF_FAMILIES:
        errors.append("proof_family is not supported")
    if args.retry_policy not in RETRY_POLICIES:
        errors.append("retry_policy is not supported")
    if args.allow_terminal_machine_qa not in TERMINAL_CONFIRMATIONS:
        errors.append("allow_terminal_machine_qa must be no or yes")
    if not args.reason or len(args.reason.strip()) < 20:
        errors.append("reason must be at least 20 characters")
    if not is_safe_ref(args.target_ref):
        errors.append("target_ref is not a safe git ref or SHA")
    try:
        timeout = int(args.timeout_minutes)
        if timeout < 10 or timeout > 360:
            errors.append("timeout_minutes must be between 10 and 360")
    except ValueError:
        errors.append("timeout_minutes must be an integer")
    try:
        retention = int(args.artifact_retention_days)
        if retention < 1 or retention > 30:
            errors.append("artifact_retention_days must be between 1 and 30")
    except ValueError:
        errors.append("artifact_retention_days must be an integer")
    if not selected_commands(args.proof_family, args.selected_checks, errors_only=errors):
        errors.append("selected_checks did not select any command")

    family = PROOF_FAMILIES.get(args.proof_family)
    if family and family["freshMachineQa"]:
        if args.owner_issue != TERMINAL_MACHINE_QA_ISSUE:
            errors.append(f"fresh proof-cockpit machine QA is gated to {TERMINAL_MACHINE_QA_ISSUE}")
        if args.allow_terminal_machine_qa != "yes":
            errors.append("fresh proof-cockpit machine QA requires explicit confirmation")
    elif args.allow_terminal_machine_qa == "yes":
        errors.append("terminal machine QA confirmation is only valid for the terminal proof family")
    return errors


def is_safe_ref(ref):
    if not ref or ref.startswith("-") or ref.endswith("."):
        return False
    if any(fragment in ref for fragment in ("..", "//", "@{", "\\", ":", "?", "*", "[")):
        return False
    return bool(SAFE_REF_RE.fullmatch(ref))


def selected_commands(family_name, selected_checks, errors_only=None):
    family = PROOF_FAMILIES.get(family_name)
    if not family:
        return []
    commands = family["commands"]
    if selected_checks == "family-default":
        return commands
    requested = [item.strip() for item in selected_checks.split(",") if item.strip()]
    available = {item["id"]: item for item in commands}
    missing = [item for item in requested if item not in available]
    if missing and errors_only is not None:
        errors_only.append(f"selected_checks contains unsupported ids: {', '.join(sorted(missing))}")
    return [available[item] for item in requested if item in available]


def build_plan(args):
    commands = selected_commands(args.proof_family, args.selected_checks)
    family = PROOF_FAMILIES[args.proof_family]
    return {
        "ownerIssue": args.owner_issue,
        "targetRef": args.target_ref,
        "checkedCommit": current_commit(),
        "changeClass": args.change_class,
        "proofFamily": args.proof_family,
        "selectedChecks": [item["id"] for item in commands],
        "retryPolicy": args.retry_policy,
        "timeoutMinutes": int(args.timeout_minutes),
        "artifactRetentionDays": int(args.artifact_retention_days),
        "freshMachineQa": family["freshMachineQa"],
        "terminalMachineQaGate": TERMINAL_MACHINE_QA_ISSUE,
        "artifactPosture": family["artifactPosture"],
        "nonClaims": [
            "no staging readiness claim",
            "no product readiness claim",
            "no production readiness claim",
            "no deployment readiness claim",
            "no release readiness claim",
            "no store readiness claim",
            "no compliance claim",
            "no live-provider claim",
            "no human-acceptance claim",
        ],
        "commands": [{"id": item["id"], "argv": item["command"]} for item in commands],
    }


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def current_commit():
    try:
        result = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


def validate_or_exit(args):
    errors = validation_errors(args)
    if errors:
        print(json.dumps({"ok": False, "errors": errors}, indent=2, sort_keys=True), file=sys.stderr)
        return None, 2
    plan = build_plan(args)
    output_dir = Path(args.output_dir)
    write_json(output_dir / "dispatch-proof-plan.json", plan)
    print(json.dumps({"ok": True, "plan": plan}, indent=2, sort_keys=True))
    return plan, 0


def run_command(command, retry_policy):
    attempts = 2 if retry_policy == "one-retry-on-transient" else 1
    last = 0
    for attempt in range(1, attempts + 1):
        print(json.dumps({"event": "dispatch-proof-command-start", "commandId": command["id"], "attempt": attempt}))
        result = subprocess.run(command["command"], cwd=Path.cwd())
        last = result.returncode
        if last == 0:
            return {"id": command["id"], "status": "pass", "attempts": attempt}
        if attempt < attempts:
            print(json.dumps({"event": "dispatch-proof-command-retry", "commandId": command["id"], "exitCode": last}))
    return {"id": command["id"], "status": "fail", "exitCode": last, "attempts": attempts}


def run(args):
    plan, code = validate_or_exit(args)
    if code != 0:
        return code
    results = []
    exit_code = 0
    for command in selected_commands(args.proof_family, args.selected_checks):
        result = run_command(command, args.retry_policy)
        results.append(result)
        if result["status"] != "pass":
            exit_code = result.get("exitCode", 1) or 1
            break
    summary = {
        "ok": exit_code == 0,
        "ownerIssue": args.owner_issue,
        "checkedCommit": current_commit(),
        "proofFamily": args.proof_family,
        "freshMachineQa": plan["freshMachineQa"],
        "results": results,
        "nonClaims": plan["nonClaims"],
    }
    write_json(Path(args.output_dir) / "dispatch-proof-result.json", summary)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return exit_code


def list_families(_args):
    print(json.dumps(PROOF_FAMILIES, indent=2, sort_keys=True))
    return 0


def selftest(_args):
    cases = [
        {
            "id": "retained-proof-positive",
            "expectedOk": True,
            "args": {
                "owner_issue": "USF-990",
                "target_ref": "HEAD",
                "change_class": "validator-tooling",
                "proof_family": "proof-cockpit-retained-evidence",
                "selected_checks": "proof-cockpit-selftest",
                "reason": "Positive retained proof dispatch selftest without fresh machine evidence.",
                "timeout_minutes": "30",
                "retry_policy": "none",
                "artifact_retention_days": "7",
                "allow_terminal_machine_qa": "no",
                "output_dir": "/tmp/usf-dispatch-proof-selftest",
            },
        },
        {
            "id": "terminal-proof-positive",
            "expectedOk": True,
            "args": {
                "owner_issue": TERMINAL_MACHINE_QA_ISSUE,
                "target_ref": "HEAD",
                "change_class": "terminal-proof-cockpit",
                "proof_family": "terminal-proof-cockpit-machine-evidence",
                "selected_checks": "proof-cockpit-validate",
                "reason": "Positive terminal proof gate selftest without executing machine QA.",
                "timeout_minutes": "30",
                "retry_policy": "none",
                "artifact_retention_days": "7",
                "allow_terminal_machine_qa": "yes",
                "output_dir": "/tmp/usf-dispatch-proof-selftest",
            },
        },
        {
            "id": "terminal-proof-wrong-issue",
            "expectedOk": False,
            "args": {
                "owner_issue": "USF-990",
                "target_ref": "HEAD",
                "change_class": "terminal-proof-cockpit",
                "proof_family": "terminal-proof-cockpit-machine-evidence",
                "selected_checks": "proof-cockpit-validate",
                "reason": "Negative terminal proof gate selftest with the wrong owning issue.",
                "timeout_minutes": "30",
                "retry_policy": "none",
                "artifact_retention_days": "7",
                "allow_terminal_machine_qa": "yes",
                "output_dir": "/tmp/usf-dispatch-proof-selftest",
            },
        },
        {
            "id": "terminal-proof-missing-confirmation",
            "expectedOk": False,
            "args": {
                "owner_issue": TERMINAL_MACHINE_QA_ISSUE,
                "target_ref": "HEAD",
                "change_class": "terminal-proof-cockpit",
                "proof_family": "terminal-proof-cockpit-machine-evidence",
                "selected_checks": "proof-cockpit-validate",
                "reason": "Negative terminal proof gate selftest without explicit confirmation.",
                "timeout_minutes": "30",
                "retry_policy": "none",
                "artifact_retention_days": "7",
                "allow_terminal_machine_qa": "no",
                "output_dir": "/tmp/usf-dispatch-proof-selftest",
            },
        },
        {
            "id": "unsafe-ref",
            "expectedOk": False,
            "args": {
                "owner_issue": "USF-990",
                "target_ref": "../main",
                "change_class": "validator-tooling",
                "proof_family": "proof-cockpit-retained-evidence",
                "selected_checks": "proof-cockpit-selftest",
                "reason": "Negative unsafe ref selftest for dispatch proof input validation.",
                "timeout_minutes": "30",
                "retry_policy": "none",
                "artifact_retention_days": "7",
                "allow_terminal_machine_qa": "no",
                "output_dir": "/tmp/usf-dispatch-proof-selftest",
            },
        },
        {
            "id": "unsupported-selected-check",
            "expectedOk": False,
            "args": {
                "owner_issue": "USF-990",
                "target_ref": "HEAD",
                "change_class": "validator-tooling",
                "proof_family": "proof-cockpit-retained-evidence",
                "selected_checks": "proof-cockpit-machine-qa",
                "reason": "Negative selected check selftest blocks commands outside the chosen proof family.",
                "timeout_minutes": "30",
                "retry_policy": "none",
                "artifact_retention_days": "7",
                "allow_terminal_machine_qa": "no",
                "output_dir": "/tmp/usf-dispatch-proof-selftest",
            },
        },
    ]
    results = []
    ok = True
    for case in cases:
        args = SimpleNamespace(**case["args"])
        errors = validation_errors(args)
        observed_ok = not errors
        passed = observed_ok == case["expectedOk"]
        ok = ok and passed
        results.append({"id": case["id"], "passed": passed, "expectedOk": case["expectedOk"], "observedOk": observed_ok, "errors": errors})
    print(json.dumps({"ok": ok, "results": results}, indent=2, sort_keys=True))
    return 0 if ok else 1


def add_common_arguments(parser):
    parser.add_argument("--owner-issue", required=True)
    parser.add_argument("--target-ref", required=True)
    parser.add_argument("--change-class", required=True)
    parser.add_argument("--proof-family", required=True)
    parser.add_argument("--selected-checks", required=True)
    parser.add_argument("--reason", required=True)
    parser.add_argument("--timeout-minutes", required=True)
    parser.add_argument("--retry-policy", required=True)
    parser.add_argument("--artifact-retention-days", required=True)
    parser.add_argument("--allow-terminal-machine-qa", required=True)
    parser.add_argument("--output-dir", default="artifacts/dispatch-proof/run")


def main():
    parser = argparse.ArgumentParser(description="USF manual proof dispatch input validator and runner")
    sub = parser.add_subparsers(dest="command", required=True)

    validate_parser = sub.add_parser("validate-inputs")
    add_common_arguments(validate_parser)

    run_parser = sub.add_parser("run")
    add_common_arguments(run_parser)

    sub.add_parser("list-families")
    sub.add_parser("selftest")

    args = parser.parse_args()
    if args.command == "validate-inputs":
        _, code = validate_or_exit(args)
        return code
    if args.command == "run":
        return run(args)
    if args.command == "list-families":
        return list_families(args)
    if args.command == "selftest":
        return selftest(args)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
