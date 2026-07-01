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
  USF-FILES-014  the USF-147 enterprise files/storage matrix exists and is complete
  USF-FILES-015  reclassified/deferred USF-147 controls carry owner and follow-up metadata
  USF-FILES-016  USF-147 proof and enterprise evidence linkage is present
  USF-FILES-017  USF-147 files proof exercises every claimed control boundary
  USF-FILES-018  USF-147 proven controls carry proof-backed evidence
  USF-FILES-019  MinIO and ClamAV reconciliations remain bounded and non-live
  USF-FILES-020  USF-147 files/storage readiness/certification claims remain prohibited

Live RLS/legal-hold behaviour is proven by the composed-Postgres proof (make
files-proof) and the hermetic tests. Planted defects under
tools/validate-parity/files-planted-defects prove each rule fires.
"""
import argparse
import copy
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
    "USF-FILES-014": ("blocking", "USF-147 enterprise files/storage matrix is missing or incomplete"),
    "USF-FILES-015": ("blocking", "USF-147 reclassified files/storage control lacks owner or follow-up metadata"),
    "USF-FILES-016": ("blocking", "USF-147 proof or enterprise evidence linkage is incomplete"),
    "USF-FILES-017": ("blocking", "USF-147 files/storage proof lacks required control evidence"),
    "USF-FILES-018": ("blocking", "USF-147 proven files/storage control lacks proof-backed evidence"),
    "USF-FILES-019": ("blocking", "USF-147 MinIO or ClamAV reconciliation is missing or overclaimed"),
    "USF-FILES-020": ("blocking", "USF-147 files/storage readiness or certification claim is overclaimed"),
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
USF147_MATRIX_PATH = "docs/architecture/files-storage-enterprise-proof-depth-matrix.json"
ENTERPRISE_EVIDENCE_PATH = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
SELFTEST_DIR = "tools/validate-parity/files-planted-defects"

OPENAPI_LEAK_NEEDLES = ["objectKey", "object_key", "Bearer ", "secret://", "-----BEGIN", "client_secret"]
USF147_REQUIRED_CONTROLS = {
    "minio-runtime-binding-reconciliation",
    "clamav-scanner-support-reconciliation",
    "db-backed-file-metadata-adapter-linkage",
    "presigned-url-boundary",
    "derived-objects-posture",
    "object-versioning-posture",
    "backup-restore-dr-posture",
    "dlp-exfiltration-controls",
    "encryption-kms-posture",
    "data-residency-enforcement",
    "quota-rate-limit-temporary-cleanup",
    "object-lock-worm-posture",
    "evidence-package-export-posture",
}
USF147_REQUIRED_PROOF_TOKENS = {
    "proveMinioRuntimeBindingReconciliation",
    "proveClamAvScannerBoundaryReconciliation",
    "proveEnterpriseStorageDepthReclassification",
    "enterpriseFilesStorageDepthGate",
}
USF147_PROHIBITED_CLAIMS = {
    "live-object-store-readiness",
    "live-scanner-readiness",
    "backup-restore-readiness",
    "kms-readiness",
    "dlp-readiness",
    "full-files-storage-readiness",
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-react-parity-readiness",
    "usf-133-closure",
}
PROVEN_STATUSES = {"proven-local", "bounded-local-proof", "implemented", "implemented-bounded"}
DEFERRED_STATUSES = {
    "deferred-with-owner",
    "transferred",
    "reclassified-deferred",
    "explicitly-reclassified",
    "out-of-scope-with-rationale",
}


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


def parse_json_text(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in (*SOURCE_FILES, USF147_MATRIX_PATH, ENTERPRISE_EVIDENCE_PATH)}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides["matrix"] if "matrix" in overrides else load_matrix()
    usf147_matrix = (
        overrides["usf147_matrix"]
        if "usf147_matrix" in overrides
        else parse_json_text(files.get(USF147_MATRIX_PATH, ""))
    )
    enterprise = (
        overrides["enterprise"]
        if "enterprise" in overrides
        else parse_json_text(files.get(ENTERPRISE_EVIDENCE_PATH, ""))
    )
    return {"files": files, "matrix": matrix, "usf147_matrix": usf147_matrix, "enterprise": enterprise}


def files_row(matrix):
    if not isinstance(matrix, dict):
        return None
    for row in matrix.get("domains", []):
        if isinstance(row, dict) and row.get("react_item_id") == "files-storage":
            return row
    return None


def enterprise_ids(enterprise):
    ids = set()
    if not isinstance(enterprise, dict):
        return ids
    for section in (
        "soaSupportMappings",
        "evidenceRegister",
        "threatModelAbuseCaseRegister",
        "incidentVulnerabilityManagementEvidence",
        "privacyDataMinimisationPosture",
    ):
        rows = enterprise.get(section, [])
        if isinstance(rows, list):
            for row in rows:
                if isinstance(row, dict) and isinstance(row.get("id"), str):
                    ids.add(row["id"])
    return ids


def check_usf147_enterprise_depth(F, state, proof):
    matrix = state.get("usf147_matrix")
    if not isinstance(matrix, dict):
        F.add("USF-FILES-014", USF147_MATRIX_PATH, "USF-147 enterprise files/storage matrix is missing")
        return
    if matrix.get("sourceIssue") != "USF-147" or matrix.get("capabilityId") != "files-storage-enterprise-depth":
        F.add("USF-FILES-014", USF147_MATRIX_PATH, "matrix does not identify USF-147 files-storage-enterprise-depth scope")
    if matrix.get("proofCommand") != "make files-proof" or matrix.get("validatorCommand") != "python3 tools/validate-parity/validate-files.py all --json":
        F.add("USF-FILES-014", USF147_MATRIX_PATH, "matrix must pin proof and validator commands")
    if len(matrix.get("acceptanceCriteriaMapping", [])) < 5:
        F.add("USF-FILES-014", USF147_MATRIX_PATH, "acceptance criteria mapping is incomplete")

    controls = matrix.get("controls", [])
    if not isinstance(controls, list):
        F.add("USF-FILES-014", USF147_MATRIX_PATH, "controls must be an array")
        controls = []
    by_id = {control.get("id"): control for control in controls if isinstance(control, dict)}
    missing = sorted(USF147_REQUIRED_CONTROLS - set(by_id))
    if missing:
        F.add("USF-FILES-014", USF147_MATRIX_PATH, f"missing required controls: {missing}")

    for control_id, control in by_id.items():
        status = control.get("status")
        for field in ("owner", "riskOwner", "controlOwner"):
            if not control.get(field):
                F.add("USF-FILES-014", control_id, f"control lacks {field}")
        if not control.get("riskTreatment") or not control.get("nonClaimBoundary"):
            F.add("USF-FILES-014", control_id, "control lacks risk treatment or non-claim boundary")
        if status in DEFERRED_STATUSES:
            if not control.get("followUpIssue") or not control.get("reviewDate"):
                F.add("USF-FILES-015", control_id, "reclassified/deferred control lacks followUpIssue or reviewDate")
        elif status in PROVEN_STATUSES:
            if not control.get("proofCommand") or not control.get("validationCommand"):
                F.add("USF-FILES-018", control_id, "proven control lacks proof or validation command")
            if not control.get("proofChecks") or not control.get("evidenceRefs"):
                F.add("USF-FILES-018", control_id, "proven control lacks proof checks or evidence refs")
        else:
            F.add("USF-FILES-014", control_id, f"unknown or missing control status: {status}")

    refs = set(matrix.get("enterpriseEvidenceRefs", []))
    required_refs = {
        "soa-usf-147-files-storage-enterprise-proof-depth",
        "evidence-usf-147-files-storage-enterprise-proof-depth",
        "threat-usf-147-files-storage-enterprise-depth",
        "incident-usf-147-files-storage-enterprise-depth",
        "privacy-usf-147-files-storage-enterprise-depth",
    }
    if not required_refs.issubset(refs):
        F.add("USF-FILES-016", USF147_MATRIX_PATH, "matrix lacks required enterprise evidence refs")
    missing_enterprise = sorted(required_refs - enterprise_ids(state.get("enterprise")))
    if missing_enterprise:
        F.add("USF-FILES-016", ENTERPRISE_EVIDENCE_PATH, f"enterprise model lacks refs: {missing_enterprise}")

    missing_tokens = sorted(token for token in USF147_REQUIRED_PROOF_TOKENS if token not in proof)
    if missing_tokens:
        F.add("USF-FILES-017", PROOF, f"files proof missing required USF-147 tokens: {missing_tokens}")
    for label in (
        "USF-147 MinIO runtime binding is reconciled",
        "USF-147 ClamAV scanner boundary is reconciled",
        "USF-147 storage depth controls are proven or explicitly reclassified",
        "USF-147 tenant retention deletion scanner and backup boundaries are explicit",
    ):
        if label not in proof:
            F.add("USF-FILES-017", PROOF, f"files proof missing proof label: {label}")

    if "findProvider(\"object-storage-minio-composed-test\")" not in proof:
        F.add("USF-FILES-019", PROOF, "MinIO reconciliation must inspect provider registry entry")
    if "findProvider(\"file-scan-clamav-composed-test\")" not in proof:
        F.add("USF-FILES-019", PROOF, "ClamAV reconciliation must inspect provider registry entry")
    for token in (
        "liveObjectStoreReadinessClaim: false",
        "liveScannerReadinessClaim: false",
        "presignedUrlReadinessClaim: false",
        "dlpReadinessClaim: false",
    ):
        if token not in proof:
            F.add("USF-FILES-019", PROOF, f"provider reconciliation must declare {token}")

    claims = matrix.get("claims", {})
    for key, value in claims.items():
        if key.endswith("Claim") and value is not False:
            F.add("USF-FILES-020", f"{USF147_MATRIX_PATH}:{key}", "USF-147 claim flags must remain false")
    non_claims = set(matrix.get("nonClaims", []))
    missing_nonclaims = sorted(USF147_PROHIBITED_CLAIMS - non_claims)
    if missing_nonclaims:
        F.add("USF-FILES-020", USF147_MATRIX_PATH, f"missing USF-147 non-claims: {missing_nonclaims}")
    for token in (
        "filesStorageReadinessClaim: false",
        "backupRestoreReadinessClaim: false",
        "kmsReadinessClaim: false",
        "stagingReadinessClaim: false",
        "productionReadinessClaim: false",
        "socReadinessClaim: false",
        "iso27001CertificationClaim: false",
        "fullDevReadinessClaim: false",
        "fullReactParityClaim: false",
        "usf133ClosureClaim: false",
    ):
        if token not in proof:
            F.add("USF-FILES-020", PROOF, f"files proof must declare {token}")


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

    check_usf147_enterprise_depth(F, state, proof)


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = copy.deepcopy(base["matrix"]) if base["matrix"] is not None else None
    usf147_matrix = copy.deepcopy(base.get("usf147_matrix")) if base.get("usf147_matrix") is not None else None
    enterprise = copy.deepcopy(base.get("enterprise")) if base.get("enterprise") is not None else None
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
    if "usf147MatrixSet" in mutation and usf147_matrix is not None:
        for key, value in mutation["usf147MatrixSet"].items():
            usf147_matrix[key] = value
    if "usf147ControlSet" in mutation and usf147_matrix is not None:
        control_id = mutation["usf147ControlSet"].get("id")
        for control in usf147_matrix.get("controls", []):
            if isinstance(control, dict) and control.get("id") == control_id:
                for key, value in mutation["usf147ControlSet"].get("values", {}).items():
                    if value == "__DELETE__":
                        control.pop(key, None)
                    else:
                        control[key] = value
    if "enterpriseRemoveIds" in mutation and isinstance(enterprise, dict):
        remove = set(mutation["enterpriseRemoveIds"])
        for section, rows in enterprise.items():
            if isinstance(rows, list):
                enterprise[section] = [
                    row
                    for row in rows
                    if not (isinstance(row, dict) and row.get("id") in remove)
                ]
    return {"files": files, "matrix": matrix, "usf147_matrix": usf147_matrix, "enterprise": enterprise}


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
