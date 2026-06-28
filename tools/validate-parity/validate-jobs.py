#!/usr/bin/env python3
"""USF jobs/workflows posture validator (parity-jobs-workflows, USF-133).

Governance tooling only. It creates no implementation/runtime files, imports no React
source, and publishes no evidence. It fails closed on the jobs/workflows invariants that
keep jobs controlled execution: classified, tenant-scoped or service-actor-run, PDP-
authorized, bounded-retry, idempotent, value-redacted, and audited (ISO 27001-supporting
technical control evidence only; no certification claim):

  USF-JOBS-001  job/workflow classification model exists
  USF-JOBS-002  tenant-scoped jobs carry tenant context
  USF-JOBS-003  system jobs use a concrete service actor (not a global bypass)
  USF-JOBS-004  job actions are PDP-guarded
  USF-JOBS-005  workflow actions are PDP-guarded
  USF-JOBS-006  retries are bounded (no unbounded retry loop)
  USF-JOBS-007  jobs have lease/timeout semantics
  USF-JOBS-008  side-effecting jobs have idempotency
  USF-JOBS-009  dead-letter preserves evidence
  USF-JOBS-010  failure messages are redacted
  USF-JOBS-011  job payloads are redacted
  USF-JOBS-012  schedules have timezone + missed-run policy (UTC; fail closed on unknown)
  USF-JOBS-013  approvals forbid requester self-approval (separation of duties)
  USF-JOBS-014  cancelled/expired jobs cannot run (terminal statuses)
  USF-JOBS-015  job/workflow lifecycle is audit-recorded
  USF-JOBS-016  no token/secret in the committed OpenAPI document
  USF-JOBS-017  jobs proof exists and makes no live/production overclaim
  USF-JOBS-018  the jobs-workflows parity row is backed by tests and proofs
  USF-JOBS-019  the Jobs & Workflows Standard exists and states the no-certification posture

Live fail-closed behaviour is proven by the hermetic tests and the jobs proof (make
jobs-proof). Planted defects under tools/validate-parity/jobs-planted-defects prove each
rule fires.
"""
import argparse
import json
import os
import sys
from collections import Counter

RULES = {
    "USF-JOBS-001": ("blocking", "job/workflow classification model missing"),
    "USF-JOBS-002": ("blocking", "tenant-scoped jobs do not carry tenant context"),
    "USF-JOBS-003": ("blocking", "system jobs lack a concrete service actor"),
    "USF-JOBS-004": ("blocking", "job actions are not PDP-guarded"),
    "USF-JOBS-005": ("blocking", "workflow actions are not PDP-guarded"),
    "USF-JOBS-006": ("blocking", "retries are not bounded"),
    "USF-JOBS-007": ("blocking", "jobs lack lease/timeout semantics"),
    "USF-JOBS-008": ("blocking", "side-effecting jobs lack idempotency"),
    "USF-JOBS-009": ("blocking", "dead-letter does not preserve evidence"),
    "USF-JOBS-010": ("blocking", "failure messages are not redacted"),
    "USF-JOBS-011": ("blocking", "job payloads are not redacted"),
    "USF-JOBS-012": ("blocking", "schedules lack timezone/missed-run policy"),
    "USF-JOBS-013": ("blocking", "approvals allow requester self-approval"),
    "USF-JOBS-014": ("blocking", "cancelled/expired jobs can run"),
    "USF-JOBS-015": ("blocking", "job/workflow lifecycle lacks audit events"),
    "USF-JOBS-016": ("blocking", "token/secret present in the OpenAPI document"),
    "USF-JOBS-017": ("blocking", "jobs proof missing or makes a live/production overclaim"),
    "USF-JOBS-018": ("blocking", "jobs-workflows parity row lacks tests/proofs backing"),
    "USF-JOBS-019": ("blocking", "Jobs & Workflows Standard missing or lacks no-certification posture"),
    "USF-JOBS-SELFTEST": ("blocking", "planted jobs defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
JOBSVC = "capabilities/jobs/src/job-service.ts"
WFSVC = "capabilities/jobs/src/workflow-service.ts"
ADAPTER = "adapters/wf/src/index.ts"
POLICY = "capabilities/tenant/src/authorization-policy.ts"
PROOF = "packages/proof/src/jobs-workflows-proof.ts"
OPENAPI = "packages/openapi/openapi.json"
STANDARD = "docs/architecture/jobs-and-workflows-standard.md"
SOURCE_FILES = (CORE, JOBSVC, WFSVC, ADAPTER, POLICY, PROOF, OPENAPI, STANDARD)
MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
SELFTEST_DIR = "tools/validate-parity/jobs-planted-defects"

OPENAPI_SECRET_NEEDLES = ["Bearer ", "secret://", "-----BEGIN", "client_secret", "eyJ"]


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


def load_matrix():
    if not os.path.exists(MATRIX_PATH):
        return None
    try:
        with open(MATRIX_PATH, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in SOURCE_FILES}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides["matrix"] if "matrix" in overrides else load_matrix()
    return {"files": files, "matrix": matrix}


def jobs_row(matrix):
    if not isinstance(matrix, dict):
        return None
    for row in matrix.get("domains", []):
        if isinstance(row, dict) and row.get("react_item_id") == "jobs-workflows":
            return row
    return None


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files.get(CORE, "")
    jobsvc = files.get(JOBSVC, "")
    wfsvc = files.get(WFSVC, "")
    adapter = files.get(ADAPTER, "")
    policy = files.get(POLICY, "")
    proof = files.get(PROOF, "")
    openapi = files.get(OPENAPI, "")
    standard = files.get(STANDARD, "")

    if "JOB_CLASSIFICATIONS" not in core or "classification" not in jobsvc:
        F.add("USF-JOBS-001", CORE, "a job/workflow classification model must exist and be used")
    if "context.tenantId" not in jobsvc:
        F.add("USF-JOBS-002", JOBSVC, "tenant-scoped jobs must carry tenant context")
    if not ("SERVICE_ACTOR_PREFIX" in core and "isServiceActor" in jobsvc):
        F.add("USF-JOBS-003", JOBSVC, "system jobs must use a concrete service actor")
    if "pdp.decide" not in jobsvc or '"job.create"' not in jobsvc:
        F.add("USF-JOBS-004", JOBSVC, "job actions must be PDP-guarded")
    if '"job.create"' not in policy or '"service-worker"' not in policy:
        F.add("USF-JOBS-004", POLICY, "job actions + service-worker role must be in the authz policy")
    if "pdp.decide" not in wfsvc or '"workflow.start"' not in wfsvc:
        F.add("USF-JOBS-005", WFSVC, "workflow actions must be PDP-guarded")
    if "assertBoundedBackoff" not in core or "no unbounded retry" not in core:
        F.add("USF-JOBS-006", CORE, "retries must be bounded (assertBoundedBackoff)")
    if "isRetryable" not in jobsvc:
        F.add("USF-JOBS-006", JOBSVC, "job service must use bounded isRetryable")
    if not ("leaseExpiresAt" in core and "leaseSeconds" in jobsvc and "leaseExpiresAt" in adapter):
        F.add("USF-JOBS-007", ADAPTER, "jobs must have lease/timeout semantics")
    if "hasIdempotencyKey" not in jobsvc or "hasIdempotencyKey" not in adapter:
        F.add("USF-JOBS-008", JOBSVC, "side-effecting jobs must support idempotency")
    if not ('"dead-lettered"' in jobsvc and "deadLetterReason" in jobsvc):
        F.add("USF-JOBS-009", JOBSVC, "dead-letter must preserve evidence (reason + failure class)")
    if "safeFailureMessage" not in core or "safeFailureMessage" not in jobsvc:
        F.add("USF-JOBS-010", CORE, "failure messages must be redacted (safeFailureMessage)")
    if "redactJobPayload" not in core or "redactJobPayload" not in jobsvc:
        F.add("USF-JOBS-011", CORE, "job payloads must be redacted (redactJobPayload)")
    if not ("assertSchedule" in core and "MISSED_RUN_POLICIES" in core and "scheduleDueKey" in core):
        F.add("USF-JOBS-012", CORE, "schedules must have timezone + missed-run policy and fail closed")
    if "requester-cannot-self-approve" not in wfsvc:
        F.add("USF-JOBS-013", WFSVC, "approvals must forbid requester self-approval")
    if "TERMINAL_JOB_STATUSES" not in core or '"cancelled"' not in core:
        F.add("USF-JOBS-014", CORE, "cancelled/expired jobs must be terminal and never run")
    for event in ('"job.created"', '"job.dead_lettered"', '"workflow.started"'):
        if event not in core:
            F.add("USF-JOBS-015", CORE, f"job/workflow lifecycle audit event missing: {event}")
    for needle in OPENAPI_SECRET_NEEDLES:
        if needle in openapi:
            F.add("USF-JOBS-016", OPENAPI, f"token/secret-shaped content in OpenAPI: {needle!r}")
    if not proof:
        F.add("USF-JOBS-017", PROOF, "the jobs proof must exist")
    else:
        for token in ("liveTemporalClaim: false", "liveWindmillClaim: false", "liveQueueClaim: false", "productionLiveClaim: false"):
            if token not in proof:
                F.add("USF-JOBS-017", PROOF, f"jobs proof must declare {token} (no overclaim)")
    if not standard:
        F.add("USF-JOBS-019", STANDARD, "the Jobs & Workflows Standard must exist")
    elif "no certification claim" not in standard:
        F.add("USF-JOBS-019", STANDARD, "the standard must state the ISO no-certification posture")

    row = jobs_row(state["matrix"])
    if row is None:
        F.add("USF-JOBS-018", MATRIX_PATH, "jobs-workflows domain row is missing from the parity matrix")
    elif not (row.get("usf_tests") and row.get("usf_proofs")):
        F.add("USF-JOBS-018", MATRIX_PATH, "jobs-workflows row must reference USF tests and proofs")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = json.loads(json.dumps(base["matrix"])) if base["matrix"] is not None else None
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if "matrixJobsSet" in mutation and matrix is not None:
        row = jobs_row(matrix)
        if row is not None:
            for key, value in mutation["matrixJobsSet"].items():
                row[key] = value
    return {"files": files, "matrix": matrix}


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
            F.add("USF-JOBS-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        local = Findings()
        run_checks(local, build_state(apply_mutation(base, fixture.get("mutation", {}))))
        got = {item["ruleId"] for item in local.items}
        if expected not in got:
            F.add("USF-JOBS-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF jobs/workflows posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["jobs", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"jobs", "all"}:
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
        print(f"USF jobs validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
