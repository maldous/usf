#!/usr/bin/env python3
"""USF spec validator (fail-closed).

Custom validator for the USF spec corpus. JSON Schema Draft 2020-12 defines artefact
*shape*; this tool *enforces* the cross-file rules the schema-authoring standard requires
that a meta-schema cannot express: registry synchronisation, enum-vs-vocabulary fidelity,
taxonomy/vocabulary/ontology reference resolution, lifecycle/file-existence, hollow-value
rejection, broken $ref, and the proof/provider/environment/secret/report safety invariants.

Status: this is the formal USF validator, authored under explicit directive (it pulls the
validator-implementation step forward; see schema-authoring-standard section 24, standards-
profile section 23). Findings carry stable rule ids (the RULES table below). It writes no
runtime files; --report emits a validator-report instance only when asked, and that instance
is validated against validator-report.schema.json before it is written (dogfood).

Exit codes:  0 = clean   1 = validation findings   2 = tool/internal error.
Dependency:  the `jsonschema` package (Draft 2020-12).

Usage:
    python tools/validate-spec.py [MODE] [options]

Modes (default: all):
    schemas      meta-schema, identity, shape, closure, required, hollow, enum, $ref
    catalogues   validate the 3 catalogue instances + catalogue data integrity
    registry     repository inventory (bijection) + registry synchronisation
    fixtures     run tests/fixtures positive/negative corpus (skipped if absent)
    pr           base/head diff gate (--base, --head); governance regressions
    all          schemas + catalogues + registry + fixtures + safety regression

Options:
    --json              emit findings as JSON to stdout
    --report PATH       write a validator-report instance to PATH (self-validated)
    --base REF          PR mode: base git ref (default: main)
    --head REF          PR mode: head git ref (default: HEAD)
"""
import argparse, glob, json, os, re, subprocess, sys
from collections import Counter

try:
    from jsonschema import Draft202012Validator
except Exception:
    print("ERROR: this tool requires the 'jsonschema' package (Draft 2020-12).", file=sys.stderr)
    sys.exit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

DRAFT = "https://json-schema.org/draft/2020-12/schema"
ALLOW_EMPTY_STR = {"value"}                                  # configuration.value may model an empty env value
FORB = re.compile(r"(^|[-./])(v2|legacy|old|new|temp|transitional)([-./]|$)")
REDUNDANT_USF = re.compile(r"(^|[-./])usf([-./]|$)")
ENVELOPE = ["id", "title", "description", "authorityLevel", "lifecycleState",
            "ontologyConcepts", "taxonomyRefs", "vocabularyRefs", "aiGuidance"]
SCHEMA_TOP_KEYS = ["$schema", "$id", "title", "description", "type", "required", "properties"]
CATALOGUE_SCHEMAS = {"schema-registry", "taxonomy", "vocabulary"}   # validate catalogue files, not instance envelope
# Layer F: description promises these fields, so they MUST stay in `required` (regression guard).
REQUIRED_FIELD_GUARDS = {
    "command": ["inputs", "outputs", "environmentScope", "sideEffects"],
    "observability-signal": ["purpose"],
    "audit-event": ["timestampSemantics", "securitySensitive", "stateChanging"],
    "workflow": ["participants", "ordering", "stateTransitions"],
}

# Stable rule ids -> (severity, human description). Severity drives report status + exit.
RULES = {
    "USF-PARSE-001":    ("blocking", "Invalid JSON"),
    "USF-META-001":     ("blocking", "JSON Schema meta-schema invalid"),
    "USF-META-002":     ("blocking", "$schema is not Draft 2020-12"),
    "USF-ID-001":       ("blocking", "$id is not urn:usf:schema:<name>"),
    "USF-ID-002":       ("blocking", "Duplicate $id across schemas"),
    "USF-NAME-001":     ("error",    "Schema path/name violates naming standard"),
    "USF-REQ-001":      ("blocking", "Schema file missing a required top-level key"),
    "USF-REQ-002":      ("blocking", "Description promises a field but it is not required"),
    "USF-REQ-003":      ("blocking", "Instance schema missing a governance-envelope required field"),
    "USF-CLOSE-001":    ("blocking", "Object not closed and not a documented extension point"),
    "USF-CLOSE-002":    ("error",    "required entry not present in properties"),
    "USF-REF-001":      ("blocking", "Broken local $ref"),
    "USF-REF-002":      ("error",    "Orphan $def (defined, never referenced)"),
    "USF-HOLLOW-001":   ("blocking", "Required string can be empty"),
    "USF-HOLLOW-003":   ("blocking", "String array item can be empty"),
    "USF-SET-001":      ("error",    "Set-like array missing uniqueItems"),
    "USF-FRESH-001":    ("blocking", "freshness object does not require commit"),
    "USF-ENUM-001":     ("blocking", "Enum differs from vocabulary canonical set"),
    "USF-ENUM-002":     ("blocking", "Vocabulary alias accepted as a canonical enum value"),
    "USF-TAX-001":      ("blocking", "Registry taxonomyRefs item does not resolve"),
    "USF-VOCAB-001":    ("blocking", "Registry vocabularyRefs item does not resolve"),
    "USF-ONT-001":      ("blocking", "Registry governsOntologyConcepts item does not resolve"),
    "USF-REG-001":      ("blocking", "Schema file has no registry entry"),
    "USF-REG-002":      ("blocking", "Registry entry points at a missing file"),
    "USF-REG-003":      ("blocking", "Registry lifecycle/file-existence mismatch"),
    "USF-REG-005":      ("blocking", "Schema authorityLevel const != registry authorityRole"),
    "USF-REG-006":      ("blocking", "Duplicate registry schema id"),
    "USF-REG-007":      ("blocking", "Duplicate registry schema path"),
    "USF-REG-008":      ("blocking", "Registry class/lifecycle/authority value not canonical"),
    "USF-INV-001":      ("blocking", "Schema-file set and registry-declared set are not a bijection"),
    "USF-VOCAB-002":    ("blocking", "Vocabulary data integrity"),
    "USF-TAX-002":      ("blocking", "Taxonomy data integrity"),
    "USF-INSTANCE-001": ("blocking", "Catalogue instance invalid against its schema"),
    "USF-PROOF-001":    ("blocking", "proof: claimed level exceeds observed"),
    "USF-PROOF-002":    ("blocking", "proof: hermetic/non-live accepted as live-external"),
    "USF-ENV-001":      ("blocking", "environment: production-shaped accepted as production-live"),
    "USF-SECRET-001":   ("blocking", "configuration: secret/non-secret classification contradiction"),
    "USF-MIG-001":      ("blocking", "data-migration: mutable migration accepted"),
    "USF-REPORT-001":   ("blocking", "validator-report: pass accepted with blocking finding"),
    "USF-REPORT-002":   ("blocking", "validator-report: fail accepted with zero findings"),
    "USF-FACET-001":    ("blocking", "semantic-contract: partial facet set accepted"),
    "USF-FIXTURE-001":  ("blocking", "Negative fixture did NOT trigger rejection"),
    "USF-FIXTURE-002":  ("blocking", "Positive fixture unexpectedly rejected"),
    "USF-PR-RUNTIME":   ("blocking", "PR adds implementation/runtime code"),
    "USF-PR-ACTIVE":    ("blocking", "PR marks a schema lifecycleState active"),
    "USF-PR-DELETE":    ("blocking", "PR deletes a schema file still referenced by the registry"),
    "USF-PR-TOOL":      ("warning",  "PR adds tool/CI; ensure it is authorised"),
}


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        sev = RULES.get(rule_id, ("error", ""))[0]
        self.items.append({"severity": sev, "ruleId": rule_id, "subject": str(subject),
                           "message": message or RULES.get(rule_id, ("", ""))[1]})

    def blocking_or_error(self):
        return [f for f in self.items if f["severity"] in ("blocking", "error")]


def load(p):
    with open(p) as fh:
        return json.load(fh)


def walk(node, path, key, fn):
    fn(node, path, key)
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "properties" and isinstance(v, dict):
                for pk, pv in v.items():
                    walk(pv, f"{path}/properties/{pk}", pk, fn)
            else:
                walk(v, f"{path}/{k}", None, fn)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, f"{path}/{i}", None, fn)


def build_ctx():
    files = sorted(glob.glob("spec/schemas/*.schema.json"))
    if not files:
        print("ERROR: no schema files under spec/schemas/", file=sys.stderr)
        sys.exit(2)
    sd = {os.path.basename(f).replace(".schema.json", ""): load(f) for f in files}
    voc = load("spec/vocabularies/vocabulary-catalog.json")
    tax = load("spec/taxonomies/taxonomy-catalog.json")
    reg = load("spec/registries/schema-registry.json")
    canon = {vs["id"]: set(v["id"] for v in vs["values"]) for vs in voc["valueSets"]}
    aliass = {vs["id"]: set(a["id"] for a in vs.get("aliases", [])) for vs in voc["valueSets"]}
    recog = dict(canon)
    recog["valueSetLifecycleStates"] = set(x["id"] for x in voc["valueSetLifecycleStates"])
    recog["valueLifecycleStates"] = set(x["id"] for x in voc["valueLifecycleStates"])
    recog["valueItemLifecycle"] = recog["valueLifecycleStates"] - {"alias"}
    onto = set(re.findall(r'^#+\s*5\.\d+\s+(.+?)\s*$', open("docs/architecture/ontology.md").read(), re.M))
    return dict(files=files, sd=sd, voc=voc, tax=tax, reg=reg, canon=canon, aliass=aliass, recog=recog,
                onto=onto, vocab_ids=set(canon), tax_ids=set(t["id"] for t in tax["taxonomies"]),
                fam_ids=set(f["id"] for f in tax["taxonomyFamilies"]))


def check_schemas(ctx, F):
    ids_seen = {}
    for name, d in ctx["sd"].items():
        try:
            Draft202012Validator.check_schema(d)
        except Exception as e:
            F.add("USF-META-001", name, str(e)[:120])
        if d.get("$schema") != DRAFT:
            F.add("USF-META-002", name, str(d.get("$schema")))
        if d.get("$id") != f"urn:usf:schema:{name}":
            F.add("USF-ID-001", name, str(d.get("$id")))
        ids_seen.setdefault(d.get("$id"), []).append(name)
        path = f"spec/schemas/{name}.schema.json"
        if FORB.search(name) or FORB.search(d.get("$id", "")) or REDUNDANT_USF.search(path) \
                or not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
            F.add("USF-NAME-001", path)
        for k in SCHEMA_TOP_KEYS:
            if k not in d:
                F.add("USF-REQ-001", name, f"missing {k}")
        if not str(d.get("title", "")).strip() or not str(d.get("description", "")).strip():
            F.add("USF-REQ-001", name, "empty title/description")
        if name not in CATALOGUE_SCHEMAS:
            req = d.get("required", []) if isinstance(d.get("required"), list) else []
            for ef in ENVELOPE:
                if ef not in req:
                    F.add("USF-REQ-003", name, f"missing {ef}")
        for fld in REQUIRED_FIELD_GUARDS.get(name, []):
            if fld not in (d.get("required", []) if isinstance(d.get("required"), list) else []):
                F.add("USF-REQ-002", name, f"{fld} promised by description but not required")
        refs = []
        walk(d, "", None, lambda n, p, k: refs.append(n["$ref"])
             if isinstance(n, dict) and isinstance(n.get("$ref"), str) else None)
        for r in refs:
            if r.startswith("#/"):
                cur, ok = d, True
                for seg in r[2:].split("/"):
                    seg = seg.replace("~1", "/").replace("~0", "~")
                    if isinstance(cur, dict) and seg in cur:
                        cur = cur[seg]
                    else:
                        ok = False
                        break
                if not ok:
                    F.add("USF-REF-001", name, r)
        used = {m.group(1) for r in refs for m in [re.match(r"#/\$defs/([^/]+)$", r)] if m}
        for o in set(d.get("$defs", {})) - used:
            F.add("USF-REF-002", name, f"$defs/{o}")

        def chk(n, p, k):
            if not isinstance(n, dict):
                return
            cond = any(s in p for s in ("/if", "/then", "/else", "/not"))
            if "properties" in n and n.get("additionalProperties") is not False \
                    and n.get("unevaluatedProperties") is not False and "$comment" not in n and not cond:
                F.add("USF-CLOSE-001", name, p)
            if n.get("additionalProperties") is False and isinstance(n.get("required"), list) and "properties" in n:
                for r in [r for r in n["required"] if r not in n["properties"]]:
                    F.add("USF-CLOSE-002", name, f"{p}: {r}")
            if k is not None and k not in ALLOW_EMPTY_STR and n.get("type") == "string" \
                    and not ({"minLength", "const", "enum", "pattern"} & set(n)):
                F.add("USF-HOLLOW-001", name, p)
            if n.get("type") == "array":
                it = n.get("items")
                if isinstance(it, dict) and it.get("type") == "string" \
                        and not ({"minLength", "const", "enum", "pattern"} & set(it)):
                    F.add("USF-HOLLOW-003", name, p)
                if isinstance(it, dict) and (it.get("type") == "string" or "$ref" in it) and "uniqueItems" not in n:
                    F.add("USF-SET-001", name, p)
            if "enum" in n and isinstance(n["enum"], list) and not cond:
                es = set(n["enum"])
                exact = [s for s in ctx["recog"] if es == ctx["recog"][s]]
                if exact:
                    for s in exact:
                        if es & ctx["aliass"].get(s, set()):
                            F.add("USF-ENUM-002", name, f"{p}:{s}")
                else:
                    subs = [s for s in ctx["recog"] if es < ctx["recog"][s]]
                    if subs:
                        miss = sorted(min((ctx["recog"][s] for s in subs), key=len) - es)
                        F.add("USF-ENUM-001", name, f"{p}: missing {miss}")
            if k == "freshness" and n.get("type") == "object" and "commit" not in (n.get("required") or []):
                F.add("USF-FRESH-001", name, p)
        walk(d, "", None, chk)
    for sid, names in ids_seen.items():
        if len(names) > 1:
            F.add("USF-ID-002", sid, str(names))


def check_registry(ctx, F):
    reg, sd = ctx["reg"], ctx["sd"]
    reg_by_path = {e["path"]: e for e in reg["schemas"]}
    file_paths = {f"spec/schemas/{n}.schema.json" for n in sd}
    if set(reg_by_path) != file_paths:
        for p in file_paths - set(reg_by_path):
            F.add("USF-REG-001", p)
        for p in set(reg_by_path) - file_paths:
            F.add("USF-REG-002", p)
        F.add("USF-INV-001", "registry", f"{len(file_paths)} files vs {len(reg_by_path)} entries")
    for p in reg_by_path:
        if not os.path.exists(p):
            F.add("USF-REG-002", p)
    for name, d in sd.items():
        e = reg_by_path.get(f"spec/schemas/{name}.schema.json")
        if not e:
            continue
        al = d.get("properties", {}).get("authorityLevel", {})
        if al.get("const") and al["const"] != e["authorityRole"]:
            F.add("USF-REG-005", name, f"{al['const']} != {e['authorityRole']}")
    for e in reg["schemas"]:
        for t in e.get("taxonomyRefs", []):
            if t not in ctx["tax_ids"]:
                F.add("USF-TAX-001", e["id"], t)
        for v in e.get("vocabularyRefs", []):
            if v not in ctx["vocab_ids"]:
                F.add("USF-VOCAB-001", e["id"], v)
        for c in e.get("governsOntologyConcepts", []):
            if c not in ctx["onto"]:
                F.add("USF-ONT-001", e["id"], c)
        if e["class"] not in ctx["canon"]["schema-classes"]:
            F.add("USF-REG-008", e["id"], f"class {e['class']}")
        if e["lifecycleState"] not in ctx["canon"]["schema-lifecycle-states"]:
            F.add("USF-REG-008", e["id"], f"lifecycle {e['lifecycleState']}")
        if e["authorityRole"] not in ctx["canon"]["authority-levels"]:
            F.add("USF-REG-008", e["id"], f"authority {e['authorityRole']}")
        if e["lifecycleState"] == "active" and not os.path.exists(e["path"]):
            F.add("USF-REG-003", e["id"], "active without file")
    rids = [e["id"] for e in reg["schemas"]]
    rpaths = [e["path"] for e in reg["schemas"]]
    if len(set(rids)) != len(rids):
        F.add("USF-REG-006", "registry", str([x for x in rids if rids.count(x) > 1]))
    if len(set(rpaths)) != len(rpaths):
        F.add("USF-REG-007", "registry", str([x for x in rpaths if rpaths.count(x) > 1]))


def check_catalogues(ctx, F):
    sd, voc, tax = ctx["sd"], ctx["voc"], ctx["tax"]
    for n, inst in [("schema-registry", "spec/registries/schema-registry.json"),
                    ("taxonomy", "spec/taxonomies/taxonomy-catalog.json"),
                    ("vocabulary", "spec/vocabularies/vocabulary-catalog.json")]:
        for err in Draft202012Validator(sd[n]).iter_errors(load(inst)):
            F.add("USF-INSTANCE-001", n, err.message[:120])
    vsids = [vs["id"] for vs in voc["valueSets"]]
    if len(set(vsids)) != len(vsids):
        F.add("USF-VOCAB-002", "vocabulary", "duplicate value-set id")
    for vs in voc["valueSets"]:
        vids = [v["id"] for v in vs["values"]]
        cset = set(vids)
        if len(set(vids)) != len(vids):
            F.add("USF-VOCAB-002", vs["id"], "duplicate value id")
        for a in vs.get("aliases", []):
            if a.get("canonical") not in cset:
                F.add("USF-VOCAB-002", vs["id"], f"alias {a.get('id')} unresolved")
            if a.get("id") in cset:
                F.add("USF-VOCAB-002", vs["id"], f"alias {a.get('id')} is also canonical")
    for t in tax["taxonomies"]:
        if t["family"] not in ctx["fam_ids"]:
            F.add("USF-TAX-002", t["id"], f"family {t['family']} unknown")
        if t["classificationMode"] not in ctx["canon"]["classification-modes"]:
            F.add("USF-TAX-002", t["id"], f"mode {t['classificationMode']}")
    ttids = [t["id"] for t in tax["taxonomies"]]
    if len(set(ttids)) != len(ttids):
        F.add("USF-TAX-002", "taxonomy", "duplicate taxonomy id")


def check_safety(ctx, F):
    """Negative-control regression: each degenerate record MUST be rejected by its schema."""
    sd = ctx["sd"]

    def V(n):
        return Draft202012Validator(sd[n])

    def E(al, **k):
        return {"id": "x", "title": "t", "description": "d", "authorityLevel": al, "lifecycleState": "draft",
                "ontologyConcepts": ["X"], "taxonomyRefs": ["x-classification"], "vocabularyRefs": ["x-kinds"],
                "aiGuidance": "g", **k}

    def pe(**k):
        return E("runtime-proof-evidence", kind="proof", emittedEvidence=["e"], collectedEvidence=["c"],
                 freshness={"commit": "c"}, **k)

    cases = [
        ("USF-PROOF-001", "proof-evidence", pe(proofLevelClaimed="substrate-proven", proofLevelObserved="behaviour-proven",
                                               providerMode="local-composed-real-service", environment="integration")),
        ("USF-PROOF-002", "proof-evidence", pe(proofLevelClaimed="behaviour-proven", proofLevelObserved="behaviour-proven",
                                               providerMode="hermetic-mock", environment="hermetic", liveExternalProviderClaim=True)),
        ("USF-ENV-001", "environment", E("semantic-definition", environment="production-shaped", productionLiveClaim=True)),
        ("USF-SECRET-001", "configuration", E("semantic-definition", configurationKind="secret-bearing-setting", purpose="p", secretBearing=False)),
        ("USF-SECRET-001", "configuration", E("semantic-definition", configurationKind="non-secret-setting", purpose="p", secretBearing=True)),
        ("USF-MIG-001", "data-migration", E("semantic-definition", dataKind="migration", migrationOrder=1, checksum="c", immutable=False)),
        ("USF-REPORT-001", "validator-report", E("generated-report", status="pass", evidenceRefs=["e"],
                                                 freshness={"commit": "a", "stale": False},
                                                 findings=[{"severity": "blocking", "subject": "s", "message": "m"}])),
        ("USF-REPORT-002", "validator-report", E("generated-report", status="fail", evidenceRefs=["e"], findings=[])),
        ("USF-FACET-001", "semantic-contract", E("semantic-definition", facets={"proof": {"status": "gap"}})),
    ]
    for rule_id, schema, rec in cases:
        if not list(V(schema).iter_errors(rec)):
            F.add(rule_id, schema, "degenerate record was NOT rejected (safety regression)")


def check_fixtures(ctx, F):
    """tests/fixtures/{positive,negative}/<schema>/<rule>.json. Positive files must validate
    clean; negative files must be rejected by their schema. Skipped if the tree is absent."""
    sd = ctx["sd"]
    pos = sorted(glob.glob("tests/fixtures/positive/**/*.json", recursive=True))
    neg = sorted(glob.glob("tests/fixtures/negative/**/*.json", recursive=True))
    if not pos and not neg:
        return "not-run"

    def schema_for(path):
        return os.path.basename(os.path.dirname(path))

    for p in pos:
        schema = schema_for(p)
        if schema not in sd:
            F.add("USF-FIXTURE-002", p, f"no schema '{schema}'")
            continue
        errs = list(Draft202012Validator(sd[schema]).iter_errors(load(p)))
        if errs:
            F.add("USF-FIXTURE-002", p, errs[0].message[:120])
    for p in neg:
        schema = schema_for(p)
        if schema not in sd:
            F.add("USF-FIXTURE-001", p, f"no schema '{schema}'")
            continue
        if not list(Draft202012Validator(sd[schema]).iter_errors(load(p))):
            F.add("USF-FIXTURE-001", p, "expected rejection, schema accepted it")
    return "ran"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, cwd=ROOT).stdout.strip()


def check_pr(ctx, F, base, head):
    diff = git("diff", "--name-status", f"{base}...{head}")
    if not diff:
        return
    reg_paths = {e["path"] for e in ctx["reg"]["schemas"]}
    for line in diff.splitlines():
        parts = line.split("\t")
        status, path = parts[0], parts[-1]
        if status.startswith("A"):
            if re.search(r"(^|/)(src|app|packages)/", path) or re.search(r"\.(ts|tsx|jsx)$", path):
                F.add("USF-PR-RUNTIME", path, "added file looks like implementation/runtime code")
            if path.startswith("tools/") or path.startswith(".github/workflows/"):
                F.add("USF-PR-TOOL", path, "tool/CI added; ensure authorised")
        if status.startswith("D") and re.match(r"spec/schemas/.*\.schema\.json$", path) and path in reg_paths:
            F.add("USF-PR-DELETE", path, "deleted schema still in registry")
    for e in ctx["reg"]["schemas"]:
        if e["lifecycleState"] == "active":
            F.add("USF-PR-ACTIVE", e["id"], "schema marked active")


def emit_report(ctx, F, path):
    sha = git("rev-parse", "HEAD") or "unknown"
    dirty = bool(git("status", "--porcelain", "spec", "tools", "docs"))
    blocking = bool(F.blocking_or_error())
    status = "fail" if blocking else ("advisory" if dirty else "pass")
    vsets = {vs["id"] for vs in ctx["voc"]["valueSets"]}
    vocab_refs = [v for v in ("validation-severities", "report-statuses") if v in vsets] or sorted(vsets)[:1]
    tax_refs = sorted(ctx["tax_ids"])[:1] or ["governance"]
    report = {
        "id": "usf.validator-report.spec",
        "title": "USF Spec Validator Report",
        "description": "Generated validator report for the USF spec corpus produced by tools/validate-spec.py. "
                       "Rank-7 generated-report; never overrides evidence or semantics.",
        "authorityLevel": "generated-report",
        "status": status,
        "lifecycleState": "draft",
        "ontologyConcepts": ["Validator", "Generated Report"],
        "taxonomyRefs": tax_refs,
        "vocabularyRefs": vocab_refs,
        "aiGuidance": "Lowest authority. A pass means the checked rules held at this commit; it does not certify modelling correctness.",
        "findings": list(F.items),
        "evidenceRefs": [f"commit:{sha}", "spec/schemas", "spec/registries/schema-registry.json"],
        "freshness": {"commit": sha, "stale": dirty},
    }
    errs = list(Draft202012Validator(ctx["sd"]["validator-report"]).iter_errors(report))
    if errs:
        print(f"ERROR: emitted report does not conform to validator-report.schema.json: {errs[0].message}", file=sys.stderr)
        sys.exit(2)
    with open(path, "w") as fh:
        json.dump(report, fh, indent=2)
    print(f"wrote validator-report instance: {path} (status={status})")


def main():
    ap = argparse.ArgumentParser(description="USF spec validator (fail-closed).")
    ap.add_argument("mode", nargs="?", default="all",
                    choices=["schemas", "catalogues", "registry", "fixtures", "pr", "all"])
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--report")
    ap.add_argument("--base", default="main")
    ap.add_argument("--head", default="HEAD")
    a = ap.parse_args()

    ctx = build_ctx()
    F = Findings()
    fixtures_state = None
    run = {
        "schemas": ["schemas"], "catalogues": ["catalogues"], "registry": ["registry"],
        "fixtures": ["fixtures"], "pr": ["pr"],
        "all": ["schemas", "catalogues", "registry", "fixtures", "safety"],
    }[a.mode]
    if "schemas" in run:
        check_schemas(ctx, F)
    if "catalogues" in run:
        check_catalogues(ctx, F)
    if "registry" in run:
        check_registry(ctx, F)
    if "safety" in run:
        check_safety(ctx, F)
    if "fixtures" in run:
        fixtures_state = check_fixtures(ctx, F)
    if "pr" in run:
        check_pr(ctx, F, a.base, a.head)

    if a.report:
        emit_report(ctx, F, a.report)

    if a.json:
        print(json.dumps({"mode": a.mode, "schemaCount": len(ctx["sd"]), "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(f["ruleId"] for f in F.items))
        head = f"USF validator [{a.mode}]: " + ("CLEAN" if not F.items else json.dumps(counts))
        if fixtures_state == "not-run":
            head += "  (fixtures: none present)"
        print(head)
        for f in F.items:
            print(f"  [{f['severity']}] {f['ruleId']} {f['subject']}: {f['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
