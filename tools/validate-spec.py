#!/usr/bin/env python3
"""USF spec assurance audit (draft).

Read-only checker for the USF spec corpus (spec/schemas/, spec/registries/,
spec/taxonomies/, spec/vocabularies/) and its alignment to docs/architecture/.
It fails closed: exit code 0 = clean, 1 = findings, 2 = bad input.

Scope and status:
- This is a DRAFT assurance / lint tool (artefact-kind: validator, lifecycleState
  draft). It is NOT yet the formal rank-3 USF validator: it has no machine-readable
  report schema, no stable rule ids, and is not wired into a release gate. It writes
  no runtime files and normalises no aliases.
- Dependency: the `jsonschema` package (Draft 2020-12). No USF schema is promoted to
  `active` by this tool; it only checks.

Usage:
    python tools/validate-spec.py          # from anywhere; resolves the repo root itself

Checks (exhaustive across these classes):
  Structure   meta-schema validity (Draft 2020-12); $schema/$id correctness; $id
              uniqueness; top-level closure; forbidden canonical tokens.
  References  internal $ref resolvability; orphan $defs; required-subset-of-properties
              (no unsatisfiable required); schema<->registry authorityLevel alignment;
              every schema has a registry entry and vice versa.
  Vocabulary  every domain enum equals a vocabulary canonical value set (no drift,
              missing values, or alias leakage); registry taxonomyRefs/vocabularyRefs
              resolve; registry governsOntologyConcepts resolve to ontology concepts.
  Hollow      no empty-able named string; no empty-able string-array item; set-like
              arrays carry uniqueItems; undocumented open objects; freshness requires
              a commit pin.
  Data        registry/vocabulary/taxonomy internal integrity (unique ids, alias
              resolution, controlled classes/lifecycles/modes); catalogue instances
              validate against their schemas.
  Safety      negative-control regression for the proof/provider/environment/secret/
              migration/report/facet invariants (degenerate records must be rejected).
"""
import json, os, re, sys, glob
from collections import Counter
try:
    from jsonschema import Draft202012Validator
except Exception as e:  # pragma: no cover
    print("ERROR: this tool requires the 'jsonschema' package (Draft 2020-12).", file=sys.stderr)
    sys.exit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ALLOW_EMPTY_STR = {"value"}
DRAFT = "https://json-schema.org/draft/2020-12/schema"
ISS = []
def I(cat, where, msg): ISS.append((cat, str(where), str(msg)))

def load(p):
    try: return json.load(open(p))
    except Exception as e: print(f"ERROR: cannot parse {p}: {e}", file=sys.stderr); sys.exit(2)

SCH = sorted(glob.glob("spec/schemas/*.schema.json"))
if not SCH: print("ERROR: no schema files under spec/schemas/", file=sys.stderr); sys.exit(2)
sd = {os.path.basename(f).replace(".schema.json", ""): load(f) for f in SCH}
voc = load("spec/vocabularies/vocabulary-catalog.json")
tax = load("spec/taxonomies/taxonomy-catalog.json")
reg = load("spec/registries/schema-registry.json")

canon = {vs["id"]: set(v["id"] for v in vs["values"]) for vs in voc["valueSets"]}
aliass = {vs["id"]: set(a["id"] for a in vs.get("aliases", [])) for vs in voc["valueSets"]}
recog = dict(canon)
recog["valueSetLifecycleStates"] = set(x["id"] for x in voc["valueSetLifecycleStates"])
recog["valueLifecycleStates"] = set(x["id"] for x in voc["valueLifecycleStates"])
recog["valueItemLifecycle"] = recog["valueLifecycleStates"] - {"alias"}
vocab_ids = set(canon); tax_ids = set(t["id"] for t in tax["taxonomies"]); fam_ids = set(f["id"] for f in tax["taxonomyFamilies"])
ONTO = set(re.findall(r'^#+\s*5\.\d+\s+(.+?)\s*$', open("docs/architecture/ontology.md").read(), re.M))
FORB = re.compile(r"(^|[-./])(v2|legacy|old|new|temp|transitional)([-./]|$)")

def walk(node, path, key, fn):
    fn(node, path, key)
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "properties" and isinstance(v, dict):
                for pk, pv in v.items(): walk(pv, f"{path}/properties/{pk}", pk, fn)
            else: walk(v, f"{path}/{k}", None, fn)
    elif isinstance(node, list):
        for i, v in enumerate(node): walk(v, f"{path}/{i}", None, fn)

ids_seen = {}
for name, d in sd.items():
    try: Draft202012Validator.check_schema(d)
    except Exception as e: I("META", name, str(e)[:80])
    if d.get("$schema") != DRAFT: I("DOLLAR-SCHEMA", name, d.get("$schema"))
    if d.get("$id") != f"urn:usf:schema:{name}": I("ID", name, d.get("$id"))
    ids_seen.setdefault(d.get("$id"), []).append(name)
    if d.get("additionalProperties") is not False: I("TOP-NOT-CLOSED", name, "")
    if FORB.search(name) or FORB.search(d.get("$id", "")): I("FORBIDDEN", name, "")
    refs = []
    walk(d, "", None, lambda n, p, k: refs.append(n["$ref"]) if isinstance(n, dict) and isinstance(n.get("$ref"), str) else None)
    for r in refs:
        if r.startswith("#/"):
            cur = d; ok = True
            for seg in r[2:].split("/"):
                seg = seg.replace("~1", "/").replace("~0", "~")
                if isinstance(cur, dict) and seg in cur: cur = cur[seg]
                else: ok = False; break
            if not ok: I("DANGLING-REF", name, r)
    used = {m.group(1) for r in refs for m in [re.match(r"#/\$defs/([^/]+)$", r)] if m}
    for o in set(d.get("$defs", {})) - used: I("ORPHAN-DEF", name, o)
    def chk(n, p, k):
        if not isinstance(n, dict): return
        if "properties" in n and n.get("additionalProperties") is not False and n.get("unevaluatedProperties") is not False and "$comment" not in n and not any(s in p for s in ("/if", "/then", "/else", "/not")):
            I("OPEN-OBJECT", name, p)
        if n.get("additionalProperties") is False and isinstance(n.get("required"), list) and "properties" in n:
            miss = [r for r in n["required"] if r not in n["properties"]]
            if miss: I("REQ-NOT-IN-PROPS", name, f"{p}: {miss}")
        if k is not None and k not in ALLOW_EMPTY_STR and n.get("type") == "string" and not ({"minLength", "const", "enum", "pattern"} & set(n)):
            I("STR-EMPTY-OK", name, p)
        if n.get("type") == "array":
            it = n.get("items")
            if isinstance(it, dict) and it.get("type") == "string" and not ({"minLength", "const", "enum", "pattern"} & set(it)):
                I("ARR-ITEM-EMPTY-OK", name, p)
            if isinstance(it, dict) and (it.get("type") == "string" or "$ref" in it) and "uniqueItems" not in n:
                I("ARR-NO-UNIQUEITEMS", name, p)
        if "enum" in n and isinstance(n["enum"], list) and not any(s in p for s in ("/if", "/then", "/else", "/not")):
            es = set(n["enum"]); exact = [s for s in recog if es == recog[s]]
            if exact:
                for s in exact:
                    if es & aliass.get(s, set()): I("ENUM-ALIAS-LEAK", name, f"{p}:{s}")
            else:
                subs = [s for s in recog if es < recog[s]]
                if subs: I("ENUM-INCOMPLETE", name, f"{p}: missing {sorted(min((recog[s] for s in subs), key=len) - es)}")
        if k == "freshness" and n.get("type") == "object" and "commit" not in (n.get("required") or []):
            I("FRESHNESS-NO-COMMIT", name, p)
    walk(d, "", None, chk)

for sid, names in ids_seen.items():
    if len(names) > 1: I("DUP-ID", sid, names)

reg_by_path = {e["path"]: e for e in reg["schemas"]}
for name, d in sd.items():
    path = f"spec/schemas/{name}.schema.json"; e = reg_by_path.get(path)
    if not e: I("REG-NO-ENTRY", name, ""); continue
    al = d.get("properties", {}).get("authorityLevel", {})
    if al.get("const") and al["const"] != e["authorityRole"]:
        I("AUTH-MISMATCH", name, f"{al['const']} != registry {e['authorityRole']}")
for p in reg_by_path:
    if not os.path.exists(p): I("REG-PATH-NO-FILE", p, "")

for e in reg["schemas"]:
    for t in e.get("taxonomyRefs", []):
        if t not in tax_ids: I("REG-TAXREF", e["id"], t)
    for v in e.get("vocabularyRefs", []):
        if v not in vocab_ids: I("REG-VOCABREF", e["id"], v)
    for c in e.get("governsOntologyConcepts", []):
        if c not in ONTO: I("REG-ONTOLOGY", e["id"], c)
    if e["class"] not in canon["schema-classes"]: I("REG-CLASS", e["id"], e["class"])
    if e["lifecycleState"] not in canon["schema-lifecycle-states"]: I("REG-LIFECYCLE", e["id"], e["lifecycleState"])
    if e["authorityRole"] not in canon["authority-levels"]: I("REG-AUTH", e["id"], e["authorityRole"])
    if e["lifecycleState"] == "active" and not os.path.exists(e["path"]): I("REG-ACTIVE-NO-FILE", e["id"], "")
rids = [e["id"] for e in reg["schemas"]]; rpaths = [e["path"] for e in reg["schemas"]]
if len(set(rids)) != len(rids): I("REG-DUP-ID", "registry", "")
if len(set(rpaths)) != len(rpaths): I("REG-DUP-PATH", "registry", "")

vsids = [vs["id"] for vs in voc["valueSets"]]
if len(set(vsids)) != len(vsids): I("VOC-DUP-SET", "vocab", "")
for vs in voc["valueSets"]:
    vids = [v["id"] for v in vs["values"]]; cset = set(vids)
    if len(set(vids)) != len(vids): I("VOC-DUP-VALUE", vs["id"], "")
    for a in vs.get("aliases", []):
        if a.get("canonical") not in cset: I("VOC-ALIAS-UNRESOLVED", vs["id"], a.get("id"))
        if a.get("id") in cset: I("VOC-ALIAS-IS-CANONICAL", vs["id"], a.get("id"))
    for v in vs["values"]:
        if "aiGuidance" not in v: I("VOC-VALUE-NO-AIGUIDANCE", vs["id"], v["id"])
        if "lifecycle" not in v: I("VOC-VALUE-NO-LIFECYCLE", vs["id"], v["id"])

for t in tax["taxonomies"]:
    if t["family"] not in fam_ids: I("TAX-FAMILY-UNKNOWN", t["id"], t["family"])
    if t["classificationMode"] not in canon["classification-modes"]: I("TAX-MODE", t["id"], t["classificationMode"])
ttids = [t["id"] for t in tax["taxonomies"]]
if len(set(ttids)) != len(ttids): I("TAX-DUP-ID", "tax", "")

for n, inst in [("schema-registry", "spec/registries/schema-registry.json"), ("taxonomy", "spec/taxonomies/taxonomy-catalog.json"), ("vocabulary", "spec/vocabularies/vocabulary-catalog.json")]:
    errs = list(Draft202012Validator(sd[n]).iter_errors(load(inst)))
    if errs: I("INSTANCE-INVALID", n, errs[0].message[:80])

# safety negative-control regression
def V(n): return Draft202012Validator(sd[n])
E = lambda al, **k: {"id": "x", "title": "t", "description": "d", "authorityLevel": al, "lifecycleState": "draft", "ontologyConcepts": ["X"], "taxonomyRefs": ["x-classification"], "vocabularyRefs": ["x-kinds"], "aiGuidance": "g", **k}
def expect(n, rec, ok, label):
    if (not list(V(n).iter_errors(rec))) != ok: I("REGRESSION", n, label)
pe = lambda **k: E("runtime-proof-evidence", kind="proof", emittedEvidence=["e"], collectedEvidence=["c"], freshness={"commit": "c"}, **k)
expect("proof-evidence", pe(proofLevelClaimed="substrate-proven", proofLevelObserved="behaviour-proven", providerMode="local-composed-real-service", environment="integration"), False, "overclaim")
expect("proof-evidence", pe(proofLevelClaimed="behaviour-proven", proofLevelObserved="behaviour-proven", providerMode="hermetic-mock", environment="hermetic", liveExternalProviderClaim=True), False, "hermetic-as-live")
expect("environment", E("semantic-definition", environment="production-shaped", productionLiveClaim=True), False, "shaped-as-live")
expect("configuration", E("semantic-definition", configurationKind="secret-bearing-setting", purpose="p", secretBearing=False, sideEffects=[]) if False else E("semantic-definition", configurationKind="secret-bearing-setting", purpose="p", secretBearing=False), False, "secret-consistency")
expect("configuration", E("semantic-definition", configurationKind="non-secret-setting", purpose="p", secretBearing=True), False, "non-secret-consistency")
expect("data-migration", E("semantic-definition", dataKind="migration", migrationOrder=1, checksum="c", immutable=False), False, "mutable-migration")
expect("validator-report", E("generated-report", status="pass", evidenceRefs=["e"], freshness={"commit": "a", "stale": False}, findings=[{"severity": "blocking", "subject": "s", "message": "m"}]), False, "pass+blocking")
expect("validator-report", E("generated-report", status="fail", evidenceRefs=["e"], findings=[]), False, "fail+0-findings")
expect("semantic-contract", E("semantic-definition", facets={"proof": {"status": "gap"}}), False, "partial-facets")

print("USF spec audit:", dict(Counter(c for c, _, _ in ISS)) if ISS else "CLEAN")
for c, w, m in ISS: print(f"  [{c}] {w}: {m}")
sys.exit(1 if ISS else 0)
