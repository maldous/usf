#!/usr/bin/env python3
"""USF database persistence posture validator (parity-db, USF-138).

Governance tooling only. Creates no runtime files, imports no React source,
publishes no evidence. Statically enforces the Enterprise Persistence Metadata
and Classification Standard over the migration SQL under adapters/db/migrations
and the classification registry
docs/architecture/persistent-object-classification-registry.json:

  USF-DB-001  every persisted table is classified in the registry
  USF-DB-002  every registry object uses a known classification
  USF-DB-003  every object carries its class-required fields
  USF-DB-004  tenant-scoped / ledger tables ENABLE ROW LEVEL SECURITY
  USF-DB-005  tenant-scoped / ledger tables FORCE ROW LEVEL SECURITY (unless excepted)
  USF-DB-006  tenant-scoped / ledger tables carry a tenant RLS policy (app_tenant_id)
  USF-DB-007  append-only ledgers grant no UPDATE/DELETE to the app runtime role
  USF-DB-008  no SECURITY DEFINER function unless registry-justified
  USF-DB-009  migration manifest is contiguous and checksum-immutable
  USF-DB-010  tenant-scoped tables index tenant_id
  USF-DB-011  a migration-control-plane object exists
  USF-DB-012  tenant-boundary tables carry an explicit tenant_id foreign key
  USF-DB-013  USF-139 enterprise DB proof-depth matrix exists and is complete
  USF-DB-014  USF-139 deferred/reclassified controls carry owner and follow-up
  USF-DB-015  USF-139 proof and enterprise evidence linkage is present
  USF-DB-016  USF-139 DB readiness/certification overclaims remain prohibited

Live role/search-path/catalog posture is asserted separately by the composed
Postgres proof (packages/proof/src/db-rls-isolation-proof.ts). Planted defects
under tools/validate-parity/db-planted-defects prove each rule fires.
"""
import argparse
import copy
import hashlib
import json
import os
import re
import sys
from collections import Counter

RULES = {
    "USF-DB-001": ("blocking", "persisted table is not classified in the registry"),
    "USF-DB-002": ("blocking", "registry object uses an unknown classification"),
    "USF-DB-003": ("blocking", "object is missing a class-required field"),
    "USF-DB-004": ("blocking", "tenant-scoped/ledger table does not ENABLE ROW LEVEL SECURITY"),
    "USF-DB-005": ("blocking", "tenant-scoped/ledger table does not FORCE ROW LEVEL SECURITY"),
    "USF-DB-006": ("blocking", "tenant-scoped/ledger table lacks a tenant RLS policy"),
    "USF-DB-007": ("blocking", "append-only ledger grants UPDATE/DELETE to the app role"),
    "USF-DB-008": ("blocking", "SECURITY DEFINER function is not registry-justified"),
    "USF-DB-009": ("blocking", "migration manifest is non-contiguous or checksum-mismatched"),
    "USF-DB-010": ("blocking", "tenant-scoped table does not index tenant_id"),
    "USF-DB-011": ("blocking", "no migration-control-plane object is classified"),
    "USF-DB-012": ("blocking", "tenant-boundary table does not carry a tenant_id foreign key"),
    "USF-DB-013": ("blocking", "USF-139 enterprise DB proof-depth matrix is missing or incomplete"),
    "USF-DB-014": ("blocking", "USF-139 deferred/reclassified control lacks owner or follow-up metadata"),
    "USF-DB-015": ("blocking", "USF-139 proof or enterprise evidence linkage is incomplete"),
    "USF-DB-016": ("blocking", "USF-139 DB readiness or certification claim is overclaimed"),
    "USF-DB-SELFTEST": ("blocking", "planted DB defect did not raise its expected rule"),
}

REGISTRY_PATH = "docs/architecture/persistent-object-classification-registry.json"
USF139_MATRIX_PATH = "docs/architecture/db-enterprise-controls-proof-depth-matrix.json"
MIGRATIONS_DIR = "adapters/db/migrations"
MANIFEST_PATH = "adapters/db/migrations/manifest.json"
SELFTEST_DIR = "tools/validate-parity/db-planted-defects"
APP_ROLE = "foundation_runtime"
KNOWN_CLASSES = {
    "tenant-scoped", "global-reference", "system-internal", "cross-tenant-aggregate",
    "audit-evidence", "migration-control-plane", "append-only-ledger", "ephemeral-runtime-state",
}
CONSTRAINT_KEYWORDS = {"PRIMARY", "FOREIGN", "CHECK", "CONSTRAINT", "UNIQUE"}
TENANT_BOUNDARY_CLASSES = {"tenant-scoped", "audit-evidence", "append-only-ledger"}
USF139_REQUIRED_CONTROLS = {
    "runtime-postgres-proof-reconciliation",
    "broader-tenant-key-enforcement",
    "index-and-performance-evidence",
    "pooling-and-transaction-guarantees",
    "operational-table-classification",
    "aggregate-non-leakage",
    "backup-restore-export-safety",
    "optimistic-concurrency-depth",
    "identifier-enumeration-review",
    "json-document-classification",
}
USF139_PROHIBITED_CLAIMS = {
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "backup-readiness",
    "restore-readiness",
    "disaster-recovery-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-react-parity-readiness",
    "usf-133-closure",
}
PROVEN_STATUSES = {"proven-local", "bounded-local-proof", "implemented-bounded"}
DEFERRED_STATUSES = {
    "reclassified-deferred",
    "deferred-with-owner",
    "not-applicable-with-rationale",
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


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def read_json_optional(path):
    if not os.path.exists(path):
        return None
    return read_json(path)


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def parse_sql(sql):
    tables = {}
    tenant_fks = set()
    for m in re.finditer(r"CREATE TABLE (\w+)\s*\((.*?)\n\);", sql, re.DOTALL):
        name, body = m.group(1), m.group(2)
        cols = set()
        for line in body.splitlines():
            line = line.strip().rstrip(",")
            if not line:
                continue
            tok = line.split()[0]
            if tok.upper() in CONSTRAINT_KEYWORDS:
                continue
            if re.match(r"^[a-z_][a-z0-9_]*$", tok):
                cols.add(tok)
            if re.search(r"\btenant_id\b.*REFERENCES\s+tenants\s*\(\s*tenant_id\s*\)", line, re.IGNORECASE):
                tenant_fks.add(name)
        tables[name] = cols
    for m in re.finditer(r"ALTER TABLE (\w+)\s+ADD COLUMN (\w+)", sql):
        tables.setdefault(m.group(1), set()).add(m.group(2))
    for m in re.finditer(
        r"ALTER TABLE (\w+).*?FOREIGN KEY\s*\(\s*tenant_id\s*\)\s*REFERENCES\s+tenants\s*\(\s*tenant_id\s*\)",
        sql,
        re.DOTALL | re.IGNORECASE,
    ):
        tenant_fks.add(m.group(1))
    rls = {}
    for m in re.finditer(r"ALTER TABLE (\w+)\s+ENABLE ROW LEVEL SECURITY", sql):
        rls.setdefault(m.group(1), {"enable": False, "force": False})["enable"] = True
    for m in re.finditer(r"ALTER TABLE (\w+)\s+FORCE ROW LEVEL SECURITY", sql):
        rls.setdefault(m.group(1), {"enable": False, "force": False})["force"] = True
    policies = {}
    for m in re.finditer(r"CREATE POLICY \w+\s+ON (\w+)(.*?)(?=\nCREATE |\nGRANT |\nALTER |\Z)", sql, re.DOTALL):
        policies.setdefault(m.group(1), []).append(m.group(2))
    grants = []
    for m in re.finditer(r"GRANT ([\w ,]+) ON (\w+) TO (\w+)", sql):
        privs = {p.strip().upper() for p in m.group(1).split(",") if p.strip()}
        grants.append((privs, m.group(2), m.group(3)))
    secdef = bool(re.search(r"SECURITY DEFINER", sql, re.IGNORECASE))
    indexes = []
    for m in re.finditer(r"CREATE (?:UNIQUE )?INDEX \w+\s+ON (\w+)\s*\(([^)]*)\)", sql):
        cols = {c.strip().split()[0] for c in m.group(2).split(",") if c.strip()}
        indexes.append((m.group(1), cols))
    return {"tables": tables, "rls": rls, "policies": policies, "grants": grants,
            "secdef": secdef, "indexes": indexes, "tenant_fks": tenant_fks}


def load_migrations():
    manifest = read_json(MANIFEST_PATH)
    entries = sorted(manifest.get("migrations", []), key=lambda e: e.get("order", 0))
    files = {}
    for e in entries:
        path = os.path.join(MIGRATIONS_DIR, e["file"])
        files[e["file"]] = read_text(path) if os.path.exists(path) else None
    return manifest, entries, files


def build_state(overrides=None):
    overrides = overrides or {}
    registry = overrides.get("registry") or read_json(REGISTRY_PATH)
    matrix = overrides.get("usf139_matrix", read_json_optional(USF139_MATRIX_PATH))
    if "manifest" in overrides:
        manifest = overrides["manifest"]
        entries = sorted(manifest.get("migrations", []), key=lambda e: e.get("order", 0))
        files = overrides.get("files") or {}
    else:
        manifest, entries, files = load_migrations()
    if "sql" in overrides:
        sql = overrides["sql"]
    else:
        sql = "\n".join(files.get(e["file"]) or "" for e in entries)
    return {"registry": registry, "manifest": manifest, "entries": entries,
            "files": files, "sql": sql, "parsed": parse_sql(sql), "usf139_matrix": matrix}


def check_classification(F, state):
    registry = state["registry"]
    objects = registry.get("objects", {})
    classes = registry.get("classes", {})
    for table in sorted(state["parsed"]["tables"]):
        if table not in objects:
            F.add("USF-DB-001", table, "persisted table has no classification registry entry")
    for name, obj in sorted(objects.items()):
        cls = obj.get("class")
        if cls not in KNOWN_CLASSES or cls not in classes:
            F.add("USF-DB-002", name, f"unknown classification: {cls}")


def check_required_fields(F, state):
    registry = state["registry"]
    classes = registry.get("classes", {})
    tables = state["parsed"]["tables"]
    for name, obj in sorted(registry.get("objects", {}).items()):
        cls = classes.get(obj.get("class"))
        if cls is None or name not in tables:
            continue
        overrides = obj.get("fieldOverrides", {})
        cols = tables[name]
        for field in cls.get("requiredFields", []):
            actual = overrides.get(field, field)
            if actual not in cols:
                F.add("USF-DB-003", name, f"missing class-required field {field} (column {actual})")


def _rls_relevant(cls):
    return bool(cls.get("rls", {}).get("enable"))


def check_rls(F, state):
    registry = state["registry"]
    classes = registry.get("classes", {})
    rls = state["parsed"]["rls"]
    policies = state["parsed"]["policies"]
    tables = state["parsed"]["tables"]
    for name, obj in sorted(registry.get("objects", {}).items()):
        cls = classes.get(obj.get("class"))
        if cls is None or name not in tables or not _rls_relevant(cls):
            continue
        exceptions = set(obj.get("exceptions", []))
        state_rls = rls.get(name, {"enable": False, "force": False})
        if not state_rls.get("enable"):
            F.add("USF-DB-004", name, "RLS-relevant table does not ENABLE ROW LEVEL SECURITY")
        if cls["rls"].get("force") and not state_rls.get("force") and "force-rls" not in exceptions:
            F.add("USF-DB-005", name, "table does not FORCE ROW LEVEL SECURITY and has no force-rls exception")
        if cls["rls"].get("tenantPolicy"):
            bodies = policies.get(name, [])
            if not any("app_tenant_id" in body for body in bodies):
                F.add("USF-DB-006", name, "no tenant RLS policy keyed on app_tenant_id()")


def check_append_only(F, state):
    registry = state["registry"]
    classes = registry.get("classes", {})
    grants = state["parsed"]["grants"]
    for name, obj in sorted(registry.get("objects", {}).items()):
        cls = classes.get(obj.get("class"))
        if cls is None or not cls.get("appendOnly"):
            continue
        for privs, table, role in grants:
            if table == name and role == APP_ROLE and (privs & {"UPDATE", "DELETE"}):
                F.add("USF-DB-007", name, f"append-only ledger grants {sorted(privs & {'UPDATE', 'DELETE'})} to {role}")


def check_security_definer(F, state):
    justified = set(state["registry"].get("justifiedSecurityDefiners", []))
    if state["parsed"]["secdef"] and not justified:
        F.add("USF-DB-008", "migrations", "SECURITY DEFINER present without a registry justification")


def check_manifest(F, state):
    entries = state["entries"]
    files = state["files"]
    for index, entry in enumerate(entries):
        if entry.get("order") != index + 1:
            F.add("USF-DB-009", entry.get("file", "?"), f"order not contiguous: expected {index + 1}, got {entry.get('order')}")
        content = files.get(entry["file"])
        if content is None:
            F.add("USF-DB-009", entry.get("file", "?"), "manifest references a missing migration file")
            continue
        actual = hashlib.sha256(content.encode("utf-8")).hexdigest()
        if actual != entry.get("sha256"):
            F.add("USF-DB-009", entry.get("file", "?"), "checksum mismatch (immutability violation)")


def check_tenant_index(F, state):
    registry = state["registry"]
    indexes = state["parsed"]["indexes"]
    for name, obj in sorted(registry.get("objects", {}).items()):
        if obj.get("class") != "tenant-scoped":
            continue
        if not any(table == name and "tenant_id" in cols for table, cols in indexes):
            F.add("USF-DB-010", name, "tenant-scoped table has no index on tenant_id")


def check_control_plane(F, state):
    registry = state["registry"]
    if not any(obj.get("class") == "migration-control-plane" for obj in registry.get("objects", {}).values()):
        F.add("USF-DB-011", "registry", "no migration-control-plane object is classified")


def check_tenant_foreign_keys(F, state):
    registry = state["registry"]
    classes = registry.get("classes", {})
    tenant_fks = state["parsed"].get("tenant_fks", set())
    tables = state["parsed"]["tables"]
    for name, obj in sorted(registry.get("objects", {}).items()):
        cls = classes.get(obj.get("class"))
        if cls is None or name not in tables:
            continue
        if obj.get("class") not in TENANT_BOUNDARY_CLASSES:
            continue
        if "tenant_id" not in tables.get(name, set()):
            continue
        if name not in tenant_fks:
            F.add("USF-DB-012", name, "tenant-boundary table lacks tenant_id foreign key to tenants")


def _control_by_id(matrix):
    return {control.get("id"): control for control in matrix.get("controls", []) if isinstance(control, dict)}


def _has_nonempty_list(value):
    return isinstance(value, list) and all(isinstance(item, str) and item for item in value)


def check_usf139_matrix(F, state):
    matrix = state.get("usf139_matrix")
    if not isinstance(matrix, dict):
        F.add("USF-DB-013", USF139_MATRIX_PATH, "USF-139 enterprise DB proof-depth matrix is missing")
        return
    if matrix.get("sourceIssue") != "USF-139" or matrix.get("serviceCatalogueServiceId") != "postgres":
        F.add("USF-DB-013", USF139_MATRIX_PATH, "matrix does not identify USF-139 and postgres")
    controls = _control_by_id(matrix)
    missing = sorted(USF139_REQUIRED_CONTROLS - set(controls))
    if missing:
        F.add("USF-DB-013", USF139_MATRIX_PATH, f"missing required controls: {missing}")
    claims = matrix.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-DB-016", USF139_MATRIX_PATH, "claims object is missing")
    else:
        for key, value in claims.items():
            if key.endswith("Claim") and value is not False:
                F.add("USF-DB-016", key, "readiness/certification claim must be false")
    nonclaims = set(matrix.get("nonClaims", []))
    missing_nonclaims = sorted(USF139_PROHIBITED_CLAIMS - nonclaims)
    if missing_nonclaims:
        F.add("USF-DB-016", USF139_MATRIX_PATH, f"missing non-claims: {missing_nonclaims}")

    if not _has_nonempty_list(matrix.get("enterpriseEvidenceRefs")):
        F.add("USF-DB-015", USF139_MATRIX_PATH, "enterprise evidence references are missing")
    if not matrix.get("sourceUseMatrix") or not matrix.get("parityMatrix"):
        F.add("USF-DB-015", USF139_MATRIX_PATH, "source-use or parity matrix linkage is missing")

    for control_id, control in sorted(controls.items()):
        status = control.get("status")
        if status in PROVEN_STATUSES:
            if not control.get("proofCommand") or not control.get("validationCommand"):
                F.add("USF-DB-015", control_id, "proven control lacks proof or validator command")
            if not _has_nonempty_list(control.get("evidenceRefs")):
                F.add("USF-DB-015", control_id, "proven control lacks evidence references")
        elif status in DEFERRED_STATUSES:
            required = ["owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate", "followUpIssues"]
            missing_fields = [field for field in required if not control.get(field)]
            if missing_fields:
                F.add("USF-DB-014", control_id, f"deferred/reclassified control missing {missing_fields}")
            if not _has_nonempty_list(control.get("followUpIssues")):
                F.add("USF-DB-014", control_id, "deferred/reclassified control lacks follow-up issues")
        else:
            F.add("USF-DB-013", control_id, f"unknown or missing control status: {status}")


def run_checks(F, state=None):
    state = state or build_state()
    check_classification(F, state)
    check_required_fields(F, state)
    check_rls(F, state)
    check_append_only(F, state)
    check_security_definer(F, state)
    check_manifest(F, state)
    check_tenant_index(F, state)
    check_control_plane(F, state)
    check_tenant_foreign_keys(F, state)
    check_usf139_matrix(F, state)


def apply_mutation(base, mutation):
    overrides = {}
    registry = copy.deepcopy(base["registry"])
    manifest = copy.deepcopy(base["manifest"])
    files = dict(base["files"])
    sql = base["sql"]
    if "sqlReplace" in mutation:
        old, new = mutation["sqlReplace"]["old"], mutation["sqlReplace"]["new"]
        sql = sql.replace(old, new)
    if "sqlAppend" in mutation:
        sql = sql + "\n" + mutation["sqlAppend"]
    if mutation.get("registryRemoveObject"):
        registry.get("objects", {}).pop(mutation["registryRemoveObject"], None)
    if "registrySetClass" in mutation:
        target = mutation["registrySetClass"]
        if target["object"] in registry.get("objects", {}):
            registry["objects"][target["object"]]["class"] = target["class"]
    if mutation.get("manifestTamper"):
        if manifest.get("migrations"):
            manifest["migrations"][0]["sha256"] = "0" * 64
    matrix = copy.deepcopy(base.get("usf139_matrix"))
    if mutation.get("matrixOmit"):
        matrix = None
    if matrix is not None and mutation.get("matrixRemoveControl"):
        matrix["controls"] = [
            control for control in matrix.get("controls", [])
            if control.get("id") != mutation["matrixRemoveControl"]
        ]
    if matrix is not None and mutation.get("matrixRemoveDeferredFollowUp"):
        target = mutation["matrixRemoveDeferredFollowUp"]
        for control in matrix.get("controls", []):
            if control.get("id") == target:
                control.pop("followUpIssues", None)
                control.pop("reviewDate", None)
    if matrix is not None and mutation.get("matrixRemoveProofCommand"):
        target = mutation["matrixRemoveProofCommand"]
        for control in matrix.get("controls", []):
            if control.get("id") == target:
                control.pop("proofCommand", None)
    if matrix is not None and mutation.get("matrixClearEnterpriseEvidenceRefs"):
        matrix["enterpriseEvidenceRefs"] = []
    if matrix is not None and "matrixSetClaim" in mutation:
        target = mutation["matrixSetClaim"]
        matrix.setdefault("claims", {})[target["claim"]] = target["value"]
    overrides["registry"] = registry
    overrides["manifest"] = manifest
    overrides["files"] = files
    overrides["sql"] = sql
    overrides["usf139_matrix"] = matrix
    return overrides


def load_selftest_fixtures(F):
    fixtures = []
    if not os.path.isdir(SELFTEST_DIR):
        return fixtures
    for name in sorted(os.listdir(SELFTEST_DIR)):
        if not name.endswith(".json"):
            continue
        path = f"{SELFTEST_DIR}/{name}"
        try:
            fixtures.append((path, read_json(path)))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-DB-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        overrides = apply_mutation(base, fixture.get("mutation", {}))
        local = Findings()
        run_checks(local, build_state(overrides))
        got = {item["ruleId"] for item in local.items}
        if expected not in got:
            F.add("USF-DB-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF database persistence posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["schema", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"schema", "all"}:
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
        print(f"USF db validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
