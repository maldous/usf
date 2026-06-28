#!/usr/bin/env python3
"""USF files/object-storage posture validator (parity-files-storage, USF-146).

Governance tooling only. Creates no runtime files, imports no React source, publishes
no evidence. Fails closed on the files/storage invariants that keep files tenant-safe
information assets (ISO 27001-supporting technical control evidence only; no cert claim):

  USF-FILES-001  file/object classification model exists + fails closed on unknown
  USF-FILES-002  file metadata is tenant-scoped with FORCE RLS + a tenant policy
  USF-FILES-003  object keys are opaque, traversal-safe, and leak-checked
  USF-FILES-004  upload validation fails closed (size/content-type/checksum)
  USF-FILES-005  downloads are gated by a scan/lifecycle status model
  USF-FILES-006  file routes are PDP-protected and tenant-context guarded
  USF-FILES-007  file actions are audit-recorded
  USF-FILES-008  legal hold blocks destructive purge
  USF-FILES-009  views are least-disclosure (no object key in the OpenAPI surface)
  USF-FILES-010  no secret/credential appears in the OpenAPI document
  USF-FILES-011  no live object-store/scanner/provider/production-live overclaim
  USF-FILES-012  content/metadata integrity is recorded and verifiable
  USF-FILES-013  the files parity matrix row is backed by tests and proofs

Live RLS/legal-hold behaviour is proven by the composed-Postgres proof (make
files-proof) and the hermetic tests. Planted defects under
tools/validate-parity/files-planted-defects prove each rule fires.
"""
import argparse
import json
import os
import sys
from collections import Counter

RULES = {
    "USF-FILES-001": ("blocking", "file/object classification model missing"),
    "USF-FILES-002": ("blocking", "file metadata is not tenant-scoped with FORCE RLS"),
    "USF-FILES-003": ("blocking", "object key safety is missing"),
    "USF-FILES-004": ("blocking", "upload validation does not fail closed"),
    "USF-FILES-005": ("blocking", "downloads are not scan/lifecycle gated"),
    "USF-FILES-006": ("blocking", "file routes are not PDP/tenant guarded"),
    "USF-FILES-007": ("blocking", "file actions are not audited"),
    "USF-FILES-008": ("blocking", "legal hold does not block purge"),
    "USF-FILES-009": ("blocking", "file views are not least-disclosure (object key exposed)"),
    "USF-FILES-010": ("blocking", "secret/credential present in the OpenAPI document"),
    "USF-FILES-011": ("blocking", "live object-store/scanner/provider/production-live overclaim"),
    "USF-FILES-012": ("blocking", "content/metadata integrity is not verifiable"),
    "USF-FILES-013": ("blocking", "files parity matrix row lacks tests/proofs backing"),
    "USF-FILES-SELFTEST": ("blocking", "planted files defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
FILE_SVC = "capabilities/files/src/file-service.ts"
SERVER = "apps/api/src/server.ts"
PROOF = "packages/proof/src/files-storage-proof.ts"
MIGRATION = "adapters/db/migrations/0003-files.sql"
REGISTRY = "docs/architecture/persistent-object-classification-registry.json"
OPENAPI = "packages/openapi/openapi.json"
SOURCE_FILES = (CORE, FILE_SVC, SERVER, PROOF, MIGRATION, REGISTRY, OPENAPI)
MATRIX_PATH = "docs/architecture/react-parity-scope-classification-matrix.json"
SELFTEST_DIR = "tools/validate-parity/files-planted-defects"

OPENAPI_LEAK_NEEDLES = ["objectKey", "object_key", "Bearer ", "secret://", "-----BEGIN", "client_secret"]


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


def files_row(matrix):
    if not isinstance(matrix, dict):
        return None
    for row in matrix.get("domains", []):
        if isinstance(row, dict) and row.get("react_item_id") == "files-storage":
            return row
    return None


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files.get(CORE, "")
    svc = files.get(FILE_SVC, "")
    server = files.get(SERVER, "")
    proof = files.get(PROOF, "")
    migration = files.get(MIGRATION, "")
    registry = files.get(REGISTRY, "")
    openapi = files.get(OPENAPI, "")

    if not ("FILE_CLASSIFICATIONS" in core and "FILE_OBJECT_CLASSES" in core and "unknown-classification" in core):
        F.add("USF-FILES-001", CORE, "file/object classification model must exist and fail closed")
    if not (
        "CREATE TABLE files" in migration
        and "FORCE ROW LEVEL SECURITY" in migration
        and "files_isolation" in migration
        and "app_tenant_id" in migration
        and '"files"' in registry
        and '"tenant-scoped"' in registry
    ):
        F.add("USF-FILES-002", MIGRATION, "files must be tenant-scoped with FORCE RLS + tenant policy + registry classification")
    if not all(t in core for t in ("generateObjectKey", "assertSafeObjectKey", "SAFE_OBJECT_KEY", "objectKeyLeaksSensitive")):
        F.add("USF-FILES-003", CORE, "object key safety (generate/assert/leak-check) is missing")
    if not all(t in core for t in ("validateUpload", "size-limit", "content-type", "checksum-mismatch")):
        F.add("USF-FILES-004", CORE, "upload validation must fail closed on size/content-type/checksum")
    if not ("isDownloadable" in core and "scanProvider" in svc and '"file.download.denied"' in svc):
        F.add("USF-FILES-005", FILE_SVC, "downloads must be gated by a scan/lifecycle status model")
    if not ("pdp.decide" in svc and "/v1/files" in server and "tenant context mismatch" in server):
        F.add("USF-FILES-006", FILE_SVC, "file routes must be PDP-protected and tenant-context guarded")
    if not ('"file.downloaded"' in svc and '"file.upload.completed"' in svc):
        F.add("USF-FILES-007", FILE_SVC, "file actions must be audit-recorded")
    if not ("legal-hold" in svc and "files_legal_hold" in migration):
        F.add("USF-FILES-008", FILE_SVC, "legal hold must block destructive purge")
    if "toSafeFileView" not in core:
        F.add("USF-FILES-009", CORE, "a least-disclosure file view projection must exist")
    for needle in ["objectKey", "object_key"]:
        if needle in openapi:
            F.add("USF-FILES-009", OPENAPI, f"object key exposed in the OpenAPI surface: {needle!r}")
    for needle in OPENAPI_LEAK_NEEDLES:
        if needle in ("objectKey", "object_key"):
            continue
        if needle in openapi:
            F.add("USF-FILES-010", OPENAPI, f"secret/credential-shaped content in OpenAPI: {needle!r}")
    for token in ("liveObjectStoreClaim: false", "liveScannerClaim: false", "productionLiveClaim: false"):
        if token not in proof:
            F.add("USF-FILES-011", PROOF, f"files proof must declare {token} (no overclaim)")
    if not ("metadataHash" in core and "checksumSha256" in core and "integrity-mismatch" in svc):
        F.add("USF-FILES-012", CORE, "content/metadata integrity must be recorded and verifiable")

    row = files_row(state["matrix"])
    if row is None:
        F.add("USF-FILES-013", MATRIX_PATH, "files-storage domain row is missing from the parity matrix")
    elif not (row.get("usf_tests") and row.get("usf_proofs")):
        F.add("USF-FILES-013", MATRIX_PATH, "files-storage row must reference USF tests and proofs")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = json.loads(json.dumps(base["matrix"])) if base["matrix"] is not None else None
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if "matrixFilesSet" in mutation and matrix is not None:
        row = files_row(matrix)
        if row is not None:
            for key, value in mutation["matrixFilesSet"].items():
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
            F.add("USF-FILES-SELFTEST", path, f"cannot load planted defect: {exc}")
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
            F.add("USF-FILES-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF files/object-storage posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["files", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"files", "all"}:
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
        print(f"USF files validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
