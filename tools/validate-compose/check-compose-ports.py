#!/usr/bin/env python3
"""Best-effort local host-port availability check for generated Compose targets."""

from __future__ import annotations

import argparse
import importlib.util
import json
import socket
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CATALOGUE_PATH = ROOT / "spec/instances/compose-service/service-catalogue.json"
GENERATOR_PATH = ROOT / "tools/generate-compose/generate-compose.py"

spec = importlib.util.spec_from_file_location("generate_compose", GENERATOR_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load Compose generator")
generate_compose = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_compose)


def load_catalogue() -> dict[str, Any]:
    with CATALOGUE_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def collect_ports(catalogue: dict[str, Any], environment: str, profiles_only: bool = False) -> list[dict[str, Any]]:
    ports: list[dict[str, Any]] = []
    for service in catalogue["services"]:
        policy = service["environmentPolicies"][environment]
        if not policy["generated"]:
            continue
        for port in service["ports"]:
            if environment not in port["environmentScopes"]:
                continue
            if profiles_only and not port["profileScope"]:
                continue
            if port["portAllocationMode"] == "not-published":
                continue
            ports.append(
                {
                    "environment": environment,
                    "serviceId": service["serviceId"],
                    "portId": port["portId"],
                    "hostIp": port["hostIp"],
                    "publishedPort": port["publishedPort"],
                    "protocol": port["protocol"],
                    "profileScope": port["profileScope"],
                }
            )
    return ports


def can_bind(host: str, port: int, protocol: str) -> tuple[bool, str]:
    sock_type = socket.SOCK_DGRAM if protocol == "udp" else socket.SOCK_STREAM
    with socket.socket(socket.AF_INET, sock_type) as sock:
        try:
            sock.bind((host, port))
        except OSError as exc:
            return False, str(exc)
    return True, ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "target",
        nargs="?",
        default="all",
        choices=["all", "dev", "test", "staging", "profiles"],
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    catalogue = load_catalogue()
    targets = ["dev", "test", "staging"] if args.target in {"all", "profiles"} else [args.target]
    ports: list[dict[str, Any]] = []
    for target in targets:
        ports.extend(collect_ports(catalogue, target, profiles_only=args.target == "profiles"))

    checked: set[tuple[str, int, str]] = set()
    findings = []
    for port in ports:
        key = (port["hostIp"], int(port["publishedPort"]), port["protocol"])
        if key in checked:
            continue
        checked.add(key)
        ok, error = can_bind(*key)
        if not ok:
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-COMPOSE-PORTS-001",
                    "subject": f"{key[0]}:{key[1]}/{key[2]}",
                    "message": error,
                }
            )

    payload = {"target": args.target, "checked": len(checked), "findings": findings}
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        for finding in findings:
            print(f"{finding['ruleId']} {finding['subject']}: {finding['message']}")
        if not findings:
            print(f"checked {len(checked)} host ports")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
