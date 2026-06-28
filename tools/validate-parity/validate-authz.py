#!/usr/bin/env python3
"""USF authorization posture validator (parity-tenant-authz, USF-140).

Governance tooling only. Statically enforces the authorization invariants over the
policy and capability source so a regression fails closed:

  USF-AUTHZ-001  PDP default effect is deny (never permit)
  USF-AUTHZ-002  identity claims do not grant authorization (IDP_GRANTS_AUTHORIZATION false)
  USF-AUTHZ-003  no action maps to an empty permission
  USF-AUTHZ-004  no role is granted a wildcard permission
  USF-AUTHZ-005  the authorizer emits authorization-decision audit evidence
  USF-AUTHZ-006  break-glass forbids self-approval
  USF-AUTHZ-007  the tenant/authz capability does not import a provider/IdP/DB adapter

Live PDP and PDP/RLS-consistency behaviour is proven by the hermetic tests and the
composed-Postgres proof (make authz-proof). Planted defects under
tools/validate-parity/authz-planted-defects prove each rule fires.
"""
import argparse
import copy
import glob
import json
import os
import re
import sys
from collections import Counter

RULES = {
    "USF-AUTHZ-001": ("blocking", "PDP default effect must be deny"),
    "USF-AUTHZ-002": ("blocking", "identity claims must not grant authorization"),
    "USF-AUTHZ-003": ("blocking", "an action maps to an empty permission"),
    "USF-AUTHZ-004": ("blocking", "a role is granted a wildcard permission"),
    "USF-AUTHZ-005": ("blocking", "authorizer does not emit authorization-decision audit"),
    "USF-AUTHZ-006": ("blocking", "break-glass does not forbid self-approval"),
    "USF-AUTHZ-007": ("blocking", "tenant/authz capability imports a provider adapter"),
    "USF-AUTHZ-SELFTEST": ("blocking", "planted authz defect did not raise its expected rule"),
}

POLICY = "capabilities/tenant/src/authorization-policy.ts"
AUTHORIZE = "capabilities/tenant/src/authorize.ts"
TENANT_INDEX = "capabilities/tenant/src/index.ts"
CAPABILITY_GLOB = "capabilities/tenant/src/*.ts"
SELFTEST_DIR = "tools/validate-parity/authz-planted-defects"


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append({
            "severity": severity,
            "ruleId": rule_id,
            "subject": str(subject),
            "message": message or RULES.get(rule_id, ("", ""))[1],
        })

    def blocking_or_error(self):
        return [f for f in self.items if f["severity"] in ("blocking", "error")]


def find_root(start):
    current = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(current, "docs")) and os.path.isdir(os.path.join(current, "spec")):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            return os.path.abspath(start)
        current = parent


ROOT = find_root(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


def read_text(path):
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def build_state(overrides=None):
    overrides = overrides or {}
    files = {}
    for path in sorted(glob.glob(CAPABILITY_GLOB)):
        files[path] = read_text(path)
    for key in (POLICY, AUTHORIZE, TENANT_INDEX):
        files.setdefault(key, read_text(key))
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    return {"files": files}


def role_permissions_block(policy):
    match = re.search(r"ROLE_PERMISSIONS[^=]*=\s*Object\.freeze\(\{(.*?)\}\);", policy, re.DOTALL)
    return match.group(1) if match else ""


def action_permissions_block(policy):
    match = re.search(r"ACTION_PERMISSIONS[^=]*=\s*Object\.freeze\(\{(.*?)\}\);", policy, re.DOTALL)
    return match.group(1) if match else ""


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    policy = files.get(POLICY, "")
    authorize = files.get(AUTHORIZE, "")
    tenant_index = files.get(TENANT_INDEX, "")

    if 'DEFAULT_EFFECT = "deny"' not in policy:
        F.add("USF-AUTHZ-001", POLICY, "DEFAULT_EFFECT must be \"deny\"")
    if "IDP_GRANTS_AUTHORIZATION = false" not in policy:
        F.add("USF-AUTHZ-002", POLICY, "IDP_GRANTS_AUTHORIZATION must be false")
    if re.search(r':\s*""', action_permissions_block(policy)):
        F.add("USF-AUTHZ-003", POLICY, "an action maps to an empty permission")
    if '"*"' in role_permissions_block(policy):
        F.add("USF-AUTHZ-004", POLICY, "a role is granted a wildcard permission")
    if '"authorization.decision"' not in authorize or ".append(" not in authorize:
        F.add("USF-AUTHZ-005", AUTHORIZE, "authorizer must emit an authorization-decision audit record")
    if "cannot approve their own access" not in tenant_index:
        F.add("USF-AUTHZ-006", TENANT_INDEX, "break-glass must forbid self-approval")
    for path, text in sorted(files.items()):
        if re.search(r'from "@foundation/adapter-', text):
            F.add("USF-AUTHZ-007", path, "tenant/authz capability must not import a provider adapter")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    return {"files": files}


def load_selftest_fixtures(F):
    fixtures = []
    if not os.path.isdir(SELFTEST_DIR):
        return fixtures
    for name in sorted(os.listdir(SELFTEST_DIR)):
        if not name.endswith(".json"):
            continue
        path = f"{SELFTEST_DIR}/{name}"
        try:
            with open(path, encoding="utf-8") as handle:
                fixtures.append((path, json.load(handle)))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-AUTHZ-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        local = Findings()
        run_checks(local, build_state({"files": apply_mutation(base, fixture.get("mutation", {}))["files"]}))
        got = {item["ruleId"] for item in local.items}
        if expected not in got:
            F.add("USF-AUTHZ-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF authorization posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["policy", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"policy", "all"}:
        run_checks(F)
    selftest_state = None
    if args.mode in {"selftest", "all"}:
        selftest_state = run_selftest(F)

    if args.json:
        print(json.dumps({"mode": args.mode, "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(item["ruleId"] for item in F.items))
        suffix = "CLEAN" if not F.items else json.dumps(counts)
        if selftest_state == "not-run":
            suffix += "  (selftest: none present)"
        print(f"USF authz validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
