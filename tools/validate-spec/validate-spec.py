#!/usr/bin/env python3
"""USF spec validator (fail-closed).

Custom validator for the USF spec corpus. JSON Schema Draft 2020-12 defines artefact
*shape*; this tool *enforces* the cross-file rules a meta-schema cannot: registry sync,
enum-vs-vocabulary fidelity (explicit bindings, not guessing), taxonomy/vocabulary/ontology
reference resolution, lifecycle/file-existence, hollow-value rejection, broken $ref, closure,
and the proof/provider/environment/secret/report safety invariants. It is adversarial against
its own failure modes: `selftest` plants defects and asserts the exact rule id fires.

Status: formal USF validator, authored under explicit directive (pulls the validator-
implementation step forward; schema-authoring-standard section 24, standards-profile section
23 deferral lifted by directive). It writes no runtime files; --report emits a validator-report
instance only when asked, validated against validator-report.schema.json before write.

Exit codes:  0 = clean   1 = validation findings   2 = tool/internal error (incl. unreadable input).
Dependency:  jsonschema (Draft 2020-12). Pinned for CI in tools/validate-spec/requirements.txt.

Usage:
    python tools/validate-spec/validate-spec.py [MODE] [options]

Modes (default: all):
    schemas      meta-schema, identity, shape, closure, required, hollow, $ref
    enums        enum-vs-vocabulary fidelity via explicit bindings (+ forbidden + backstop)
    catalogues   validate the 3 catalogue instances + catalogue data integrity
    registry     repository inventory (bijection) + registry synchronisation
    fixtures     tools/validate-spec/fixtures positive/negative corpus + expected-reason manifest
    selftest     plant defects from tools/validate-spec/planted-defects/ and assert the exact rule id fires
    pr           base/head diff gate (--base, --head); fails closed if git fails
    all          schemas + enums + catalogues + registry + safety + fixtures + selftest
                 (+ pr when --base/--head is given)

Options:
    --json              emit findings as JSON to stdout
    --report PATH       write a validator-report instance to PATH (self-validated)
    --base REF          PR base git ref
    --head REF          PR head git ref
"""
import argparse, copy, glob, json, os, re, subprocess, sys
from collections import Counter

try:
    from jsonschema import Draft202012Validator
except Exception:
    print("ERROR: this tool requires the 'jsonschema' package (Draft 2020-12).", file=sys.stderr)
    sys.exit(2)

def _find_root(start):
    """Ascend until a directory contains both spec/ and docs/ (the repo root)."""
    d = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(d, "spec")) and os.path.isdir(os.path.join(d, "docs")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return os.path.abspath(start)
        d = parent


ROOT = _find_root(os.path.dirname(os.path.abspath(__file__)))
CORPUS = "tools/validate-spec"   # validator assets: fixtures/, manifests/, planted-defects/
os.chdir(ROOT)

DRAFT = "https://json-schema.org/draft/2020-12/schema"
ALLOW_EMPTY_STR = {"value"}
FORB = re.compile(r"(^|[-./])(v2|legacy|old|new|temp|transitional)([-./]|$)")
REDUNDANT_USF = re.compile(r"(^|[-./])usf([-./]|$)")
ENVELOPE = ["id", "title", "description", "authorityLevel", "lifecycleState",
            "ontologyConcepts", "taxonomyRefs", "vocabularyRefs", "aiGuidance"]
SCHEMA_TOP_KEYS = ["$schema", "$id", "title", "description", "type", "required", "properties"]
CATALOGUE_SCHEMAS = {"schema-registry", "taxonomy", "vocabulary"}
DIRTY_PATHS = ["spec", "tools", "docs", ".github"]
REQUIRED_FIELD_GUARDS = {
    "command": ["inputs", "outputs", "environmentScope", "sideEffects"],
    "observability-signal": ["purpose"],
    "audit-event": ["timestampSemantics", "securitySensitive", "stateChanging"],
    "workflow": ["participants", "ordering", "stateTransitions"],
}
# (item 5) Closure: every object with `properties` MUST be closed UNLESS its (schema, pointer)
# is an explicitly-declared, documented extension point. No $comment bypass.
# (item 5 review) Closure: every object (type:object or with properties) MUST be closed
# (additionalProperties/unevaluatedProperties false) UNLESS its (schema, pointer) is a DELIBERATE,
# documented extension point listed here with a reason. No $comment / properties-presence bypass.
_TYPED_EXT = "typed-value extension map: keys open by design, values constrained to scalars"
_DRAFT_META = "draft descriptive-metadata block; intentionally permissive in this draft per its $comment"
OPEN_EXTENSION_POINTS = {
    ("interface-contract", "/$defs/contractBody/properties/extensions"): _TYPED_EXT,
    ("workflow", "/$defs/workflowStep/properties/extensions"): _TYPED_EXT,
    ("workflow", "/$defs/stateTransition/properties/extensions"): _TYPED_EXT,
    ("ui-semantic-model", "/$defs/uiJourney/properties/extensions"): _TYPED_EXT,
    ("schema-registry", "/properties/identityNotes"): _DRAFT_META,
    ("schema-registry", "/properties/currentRepositoryState"): _DRAFT_META,
    ("schema-registry", "/properties/governance"): _DRAFT_META,
    ("schema-registry", "/properties/namingConventions"): _DRAFT_META,
    ("schema-registry", "/properties/commonRequirements"): _DRAFT_META,
    ("schema-registry", "/properties/commonEnvelope"): _DRAFT_META,
    ("taxonomy", "/properties/currentRepositoryState"): _DRAFT_META,
    ("taxonomy", "/properties/governance"): _DRAFT_META,
    ("taxonomy", "/properties/vocabularyDependencies"): _DRAFT_META,
    ("vocabulary", "/properties/currentRepositoryState"): _DRAFT_META,
    ("vocabulary", "/properties/governance"): _DRAFT_META,
}
# (item 5 review) tool/CI additions are blocking unless explicitly authorised here.
AUTHORIZED_TOOLING = {
    ".github/workflows/validate-spec.yml",
    "tools/validate-spec/validate-spec.py",
    "tools/validate-spec/requirements.txt",
}
# (item 4) Explicit enum -> vocabulary value-set bindings by (schema, JSON pointer). No guessing.
# Every "/properties/lifecycleState" enum binds to lifecycle-states (handled in resolve below).
ENUM_BINDINGS = {
    ("ai-governance", "/$defs/aiKind"): "ai-governance-kinds",
    ("audit-event", "/$defs/auditKind"): "audit-event-kinds",
    ("command", "/$defs/commandKind"): "command-kinds",
    ("command", "/$defs/environment"): "environment-classes",
    ("command", "/$defs/disposition"): "disposition-values",
    ("configuration", "/$defs/configurationKind"): "configuration-kinds",
    ("configuration", "/$defs/providerMode"): "provider-modes",
    ("configuration", "/$defs/environment"): "environment-classes",
    ("data-migration", "/$defs/dataKind"): "data-migration-kinds",
    ("environment", "/$defs/environment"): "environment-classes",
    ("environment", "/$defs/providerMode"): "provider-modes",
    ("event-contract", "/$defs/eventWorkflowKind"): "event-workflow-kinds",
    ("evidence-envelope", "/$defs/providerMode"): "provider-modes",
    ("evidence-envelope", "/$defs/environment"): "environment-classes",
    ("evidence-envelope", "/properties/evidenceKind"): "evidence-kinds",
    ("evidence-envelope", "/properties/reportStatus"): "report-statuses",
    ("import-manifest", "/$defs/sourceKind"): "source-kinds",
    ("import-manifest", "/$defs/sourceRole"): "source-roles",
    ("import-manifest", "/$defs/disposition"): "disposition-values",
    ("interface-contract", "/$defs/interfaceKind"): "interface-kinds",
    ("observability-signal", "/$defs/signalKind"): "observability-signal-kinds",
    ("proof-evidence", "/$defs/proofLevel"): "proof-levels",
    ("proof-evidence", "/$defs/providerMode"): "provider-modes",
    ("proof-evidence", "/$defs/environment"): "environment-classes",
    ("provider-mode", "/$defs/providerMode"): "provider-modes",
    ("provider-mode", "/$defs/environment"): "environment-classes",
    ("schema-registry", "/$defs/schemaClass"): "schema-classes",
    ("schema-registry", "/$defs/schemaLifecycleState"): "schema-lifecycle-states",
    ("schema-registry", "/$defs/authorityLevel"): "authority-levels",
    ("source-disposition", "/properties/disposition"): "disposition-values",
    ("source-disposition", "/properties/sourceKind"): "source-kinds",
    ("source-disposition", "/properties/sourceRole"): "source-roles",
    ("source-reference", "/$defs/sourceKind"): "source-kinds",
    ("source-reference", "/$defs/sourceRole"): "source-roles",
    ("source-reference", "/$defs/disposition"): "disposition-values",
    ("source-reference", "/properties/evidenceRole"): "evidence-kinds",
    ("taxonomy", "/$defs/classificationMode"): "classification-modes",
    ("taxonomy", "/$defs/lifecycleState"): "schema-lifecycle-states",
    ("ui-semantic-model", "/$defs/uiKind"): "ui-semantic-kinds",
    ("validator-report", "/$defs/severity"): "validation-severities",
    ("validator-report", "/$defs/status"): "report-statuses",
    ("vocabulary", "/$defs/valueSetStatus"): "valueSetLifecycleStates",
    ("vocabulary", "/$defs/valueItemLifecycle"): "valueItemLifecycle",
    ("workflow", "/$defs/eventWorkflowKind"): "event-workflow-kinds",
}
# Unbound enums that are intentionally local (not vocabulary-backed); suppress the backstop.
ENUM_LOCAL_ALLOW = {("adr", "/properties/decisionStatus")}

RULES = {
    "USF-PARSE-001":    ("blocking", "Invalid JSON / unreadable file"),
    "USF-SHAPE-001":    ("blocking", "Catalogue missing a required top-level key"),
    "USF-META-001":     ("blocking", "JSON Schema meta-schema invalid"),
    "USF-META-002":     ("blocking", "$schema is not Draft 2020-12"),
    "USF-ID-001":       ("blocking", "$id is not urn:usf:schema:<name>"),
    "USF-ID-002":       ("blocking", "Duplicate $id across schemas"),
    "USF-NAME-001":     ("error",    "Schema path/name violates naming standard"),
    "USF-REQ-001":      ("blocking", "Schema file missing a required top-level key"),
    "USF-REQ-002":      ("blocking", "Description promises a field but it is not required"),
    "USF-REQ-003":      ("blocking", "Instance schema missing a governance-envelope required field"),
    "USF-CLOSE-001":    ("blocking", "Object not closed and not a declared extension point"),
    "USF-CLOSE-002":    ("error",    "required entry not present in properties"),
    "USF-REF-001":      ("blocking", "Broken local $ref"),
    "USF-REF-002":      ("error",    "Orphan $def (defined, never referenced)"),
    "USF-HOLLOW-001":   ("blocking", "Required string can be empty"),
    "USF-HOLLOW-003":   ("blocking", "String array item can be empty"),
    "USF-SET-001":      ("error",    "Set-like array missing uniqueItems"),
    "USF-FRESH-001":    ("blocking", "freshness object does not require commit"),
    "USF-ENUM-001":     ("blocking", "Bound enum differs from its vocabulary canonical set"),
    "USF-ENUM-002":     ("blocking", "Vocabulary alias accepted as a canonical enum value"),
    "USF-ENUM-003":     ("blocking", "Forbidden token present as an enum value"),
    "USF-ENUM-004":     ("blocking", "Bound enum pointer missing or has no enum (binding drift)"),
    "USF-ENUM-005":     ("error",    "Unbound enum resembles a vocabulary set; bind it explicitly"),
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
    "USF-FIXTURE-001":  ("blocking", "Negative fixture not rejected by its schema"),
    "USF-FIXTURE-002":  ("blocking", "Positive fixture unexpectedly rejected"),
    "USF-FIXTURE-003":  ("blocking", "Negative fixture has no expected-reason manifest entry"),
    "USF-FIXTURE-004":  ("blocking", "Negative fixture rejected for the wrong reason"),
    "USF-SELFTEST-001": ("blocking", "Planted defect did NOT raise its expected rule id"),
    "USF-PR-RUNTIME":   ("blocking", "PR adds implementation/runtime code"),
    "USF-PR-ACTIVE":    ("blocking", "PR marks a schema lifecycleState active"),
    "USF-PR-DELETE":    ("blocking", "PR deletes a schema file still referenced by the registry"),
    "USF-PR-TOOL":      ("blocking", "PR adds unauthorised tool/CI (not in AUTHORIZED_TOOLING)"),
}


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        sev = RULES.get(rule_id, ("error", ""))[0]
        self.items.append({"severity": sev, "ruleId": rule_id, "subject": str(subject),
                           "message": message or RULES.get(rule_id, ("", ""))[1]})

    def rule_ids(self):
        return {f["ruleId"] for f in self.items}

    def blocking_or_error(self):
        return [f for f in self.items if f["severity"] in ("blocking", "error")]


def load_json(path, F):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as e:
        F.add("USF-PARSE-001", path, f"{e.msg} at line {e.lineno} column {e.colno}")
    except OSError as e:
        F.add("USF-PARSE-001", path, str(e))
    return None


def resolve_pointer(node, pointer):
    if not pointer:
        return node
    for seg in pointer.lstrip("/").split("/"):
        seg = seg.replace("~1", "/").replace("~0", "~")
        if isinstance(node, dict) and seg in node:
            node = node[seg]
        elif isinstance(node, list) and seg.isdigit() and int(seg) < len(node):
            node = node[int(seg)]
        else:
            return None
    return node


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


CATALOGUE_KEYS = {"vocabulary": ("valueSets", "valueSetLifecycleStates", "valueLifecycleStates"),
                  "taxonomy": ("taxonomies", "taxonomyFamilies"),
                  "registry": ("schemas",)}


def build_ctx(F):
    """Parse-safe load. Returns ctx, or None if the corpus cannot be loaded (findings added)."""
    files = sorted(glob.glob("spec/schemas/*.schema.json"))
    if not files:
        F.add("USF-PARSE-001", "spec/schemas", "no schema files found")
        return None
    sd = {}
    for f in files:
        d = load_json(f, F)
        if d is not None:
            sd[os.path.basename(f).replace(".schema.json", "")] = d
    voc = load_json("spec/vocabularies/vocabulary-catalog.json", F)
    tax = load_json("spec/taxonomies/taxonomy-catalog.json", F)
    reg = load_json("spec/registries/schema-registry.json", F)
    fatal = False
    for name, obj, keys in (("vocabulary", voc, CATALOGUE_KEYS["vocabulary"]),
                            ("taxonomy", tax, CATALOGUE_KEYS["taxonomy"]),
                            ("registry", reg, CATALOGUE_KEYS["registry"])):
        if obj is None:
            fatal = True
            continue
        for k in keys:
            if k not in obj:
                F.add("USF-SHAPE-001", name, f"missing top-level key '{k}'")
                fatal = True
            elif not isinstance(obj[k], list) or not all(isinstance(x, dict) for x in obj[k]):
                F.add("USF-SHAPE-001", name, f"'{k}' must be an array of objects")
                fatal = True
    if fatal or not sd:
        return None
    canon = {vs["id"]: set(v.get("id") for v in vs.get("values", [])) for vs in voc["valueSets"]}
    aliass = {vs["id"]: set(a.get("id") for a in vs.get("aliases", [])) for vs in voc["valueSets"]}
    recog = dict(canon)
    recog["valueSetLifecycleStates"] = set(x["id"] for x in voc["valueSetLifecycleStates"])
    recog["valueLifecycleStates"] = set(x["id"] for x in voc["valueLifecycleStates"])
    recog["valueItemLifecycle"] = recog["valueLifecycleStates"] - {"alias"}
    onto = set(re.findall(r'^#+\s*5\.\d+\s+(.+?)\s*$', open("docs/architecture/ontology.md").read(), re.M))
    forbidden = {fv.get("token") for fv in voc.get("forbiddenValues", []) if isinstance(fv, dict)}
    return dict(files=files, sd=sd, voc=voc, tax=tax, reg=reg, canon=canon, aliass=aliass, recog=recog,
                onto=onto, forbidden=forbidden, vocab_ids=set(canon),
                tax_ids=set(t["id"] for t in tax["taxonomies"]),
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
            if r.startswith("#/") and resolve_pointer(d, r[1:]) is None:
                F.add("USF-REF-001", name, r)
        used = {m.group(1) for r in refs for m in [re.match(r"#/\$defs/([^/]+)$", r)] if m}
        for o in set(d.get("$defs", {})) - used:
            F.add("USF-REF-002", name, f"$defs/{o}")

        def chk(n, p, k):
            if not isinstance(n, dict):
                return
            cond = any(s in p for s in ("/if", "/then", "/else", "/not"))
            objlike = n.get("type") == "object" or "properties" in n
            closed = n.get("additionalProperties") is False or n.get("unevaluatedProperties") is False
            if objlike and not closed and not cond and (name, p) not in OPEN_EXTENSION_POINTS:
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
            if k == "freshness" and n.get("type") == "object" and "commit" not in (n.get("required") or []):
                F.add("USF-FRESH-001", name, p)
        walk(d, "", None, chk)
    for sid, names in ids_seen.items():
        if len(names) > 1:
            F.add("USF-ID-002", sid, str(names))


def binding_for(schema, pointer):
    if pointer == "/properties/lifecycleState":
        return "lifecycle-states"
    return ENUM_BINDINGS.get((schema, pointer))


def check_enums(ctx, F):
    """Explicit-binding enum fidelity (item 4). No guessing: each controlled enum is bound to a
    value set; assert exact equality, alias-disjoint, forbidden-disjoint. A fail-closed backstop
    flags any UNbound enum that resembles a non-empty value set."""
    recog, aliass, forbidden = ctx["recog"], ctx["aliass"], ctx["forbidden"]
    nonempty = {sid: vals for sid, vals in recog.items() if vals}
    for name, d in ctx["sd"].items():
        enums = []
        walk(d, "", None, lambda n, p, k: enums.append((p, list(n["enum"])))
             if isinstance(n, dict) and isinstance(n.get("enum"), list)
             and not any(s in p for s in ("/if", "/then", "/else", "/not")) else None)
        for pointer, values in enums:
            actual = set(values)
            vsid = binding_for(name, pointer)
            if vsid:
                canonical = recog.get(vsid)
                if canonical is None:
                    F.add("USF-ENUM-004", f"{name}{pointer}", f"unknown value set {vsid}")
                    continue
                if actual != canonical:
                    F.add("USF-ENUM-001", f"{name}{pointer}",
                          f"!= {vsid}: extra={sorted(actual - canonical)} missing={sorted(canonical - actual)}")
                if actual & aliass.get(vsid, set()):
                    F.add("USF-ENUM-002", f"{name}{pointer}", f"aliases {sorted(actual & aliass.get(vsid, set()))} of {vsid}")
                if actual & forbidden:
                    F.add("USF-ENUM-003", f"{name}{pointer}", f"forbidden {sorted(actual & forbidden)}")
            elif (name, pointer) not in ENUM_LOCAL_ALLOW:
                for sid, vals in nonempty.items():
                    if actual == vals or (actual > vals and len(actual & vals) >= 2) or \
                       (actual != vals and len(actual & vals) >= 2):
                        F.add("USF-ENUM-005", f"{name}{pointer}",
                              f"resembles {sid} (shared {sorted(actual & vals)}); add an explicit binding or allowlist")
                        break
    # bound pointers that no longer exist => binding drift
    for (schema, pointer), vsid in ENUM_BINDINGS.items():
        d = ctx["sd"].get(schema)
        if d is None:
            continue
        node = resolve_pointer(d, pointer)
        if not isinstance(node, dict) or "enum" not in node:
            F.add("USF-ENUM-004", f"{schema}{pointer}", f"bound to {vsid} but enum not found")


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
        if e.get("class") not in ctx["canon"]["schema-classes"]:
            F.add("USF-REG-008", e["id"], f"class {e.get('class')}")
        if e.get("lifecycleState") not in ctx["canon"]["schema-lifecycle-states"]:
            F.add("USF-REG-008", e["id"], f"lifecycle {e.get('lifecycleState')}")
        if e.get("authorityRole") not in ctx["canon"]["authority-levels"]:
            F.add("USF-REG-008", e["id"], f"authority {e.get('authorityRole')}")
        if e.get("lifecycleState") == "active" and not os.path.exists(e["path"]):
            F.add("USF-REG-003", e["id"], "active without file")
    rids = [e["id"] for e in reg["schemas"]]
    rpaths = [e["path"] for e in reg["schemas"]]
    if len(set(rids)) != len(rids):
        F.add("USF-REG-006", "registry", str([x for x in rids if rids.count(x) > 1]))
    if len(set(rpaths)) != len(rpaths):
        F.add("USF-REG-007", "registry", str([x for x in rpaths if rpaths.count(x) > 1]))


def check_catalogues(ctx, F):
    """Validate the in-context catalogue instances against their schemas + data integrity.
    Uses ctx (not a re-read) so planted-defect selftests exercise this path."""
    voc, tax = ctx["voc"], ctx["tax"]
    for n, inst in (("schema-registry", ctx["reg"]), ("taxonomy", ctx["tax"]), ("vocabulary", ctx["voc"])):
        for err in Draft202012Validator(ctx["sd"][n]).iter_errors(inst):
            F.add("USF-INSTANCE-001", n, err.message[:120])
    vsids = [vs["id"] for vs in voc["valueSets"]]
    if len(set(vsids)) != len(vsids):
        F.add("USF-VOCAB-002", "vocabulary", "duplicate value-set id")
    for vs in voc["valueSets"]:
        vids = [v["id"] for v in vs.get("values", [])]
        cset = set(vids)
        if len(set(vids)) != len(vids):
            F.add("USF-VOCAB-002", vs["id"], "duplicate value id")
        for a in vs.get("aliases", []):
            if a.get("canonical") not in cset:
                F.add("USF-VOCAB-002", vs["id"], f"alias {a.get('id')} unresolved")
            if a.get("id") in cset:
                F.add("USF-VOCAB-002", vs["id"], f"alias {a.get('id')} is also canonical")
    for t in tax["taxonomies"]:
        if t.get("family") not in ctx["fam_ids"]:
            F.add("USF-TAX-002", t["id"], f"family {t.get('family')} unknown")
        if t.get("classificationMode") not in ctx["canon"]["classification-modes"]:
            F.add("USF-TAX-002", t["id"], f"mode {t.get('classificationMode')}")
    ttids = [t["id"] for t in tax["taxonomies"]]
    if len(set(ttids)) != len(ttids):
        F.add("USF-TAX-002", "taxonomy", "duplicate taxonomy id")


def check_safety(ctx, F):
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


def load_manifest(F):
    """Parse-safe (item 4): a malformed manifest yields USF-PARSE-001, never a silent skip."""
    entries = {}
    for mf in sorted(glob.glob(f"{CORPUS}/manifests/*.json")):
        data = load_json(mf, F)
        if data is None:
            continue
        if not isinstance(data, list):
            F.add("USF-PARSE-001", mf, "manifest must be a JSON array of entries")
            continue
        for e in data:
            if isinstance(e, dict) and "path" in e:
                entries[e["path"]] = e
            else:
                F.add("USF-PARSE-001", mf, f"malformed manifest entry: {str(e)[:60]}")
    return entries


def check_fixtures(ctx, F):
    """Positive fixtures must validate; negative fixtures must be rejected FOR THE INTENDED REASON
    declared in tests/fixtures/manifest.d/*.json (item 3a)."""
    sd = ctx["sd"]
    pos = sorted(glob.glob(f"{CORPUS}/fixtures/positive/**/*.json", recursive=True))
    neg = sorted(glob.glob(f"{CORPUS}/fixtures/negative/**/*.json", recursive=True))
    if not pos and not neg:
        return "not-run"
    manifest = load_manifest(F)

    def schema_for(path):
        return os.path.basename(os.path.dirname(path))

    for p in pos:
        schema = schema_for(p)
        if schema not in sd:
            F.add("USF-FIXTURE-002", p, f"no schema '{schema}'")
            continue
        errs = list(Draft202012Validator(sd[schema]).iter_errors(load_json(p, F)))
        if errs:
            F.add("USF-FIXTURE-002", p, errs[0].message[:120])
    for p in neg:
        schema = schema_for(p)
        if schema not in sd:
            F.add("USF-FIXTURE-001", p, f"no schema '{schema}'")
            continue
        errs = list(Draft202012Validator(sd[schema]).iter_errors(load_json(p, F)))
        if not errs:
            F.add("USF-FIXTURE-001", p, "expected rejection, schema accepted it")
            continue
        rel = p.split("/fixtures/", 1)[1]
        spec = manifest.get(rel)
        if not spec:
            F.add("USF-FIXTURE-003", p, "no expected-reason manifest entry")
            continue
        kw = spec.get("keyword")
        ptr = spec.get("pointer")
        ok = any(e.validator == kw and (ptr is None or ptr == "/" + "/".join(str(x) for x in e.absolute_path))
                 for e in errs)
        if not ok:
            got = sorted({f"{e.validator}@/{'/'.join(str(x) for x in e.absolute_path)}" for e in errs})
            F.add("USF-FIXTURE-004", p, f"expected {kw}@{ptr}; got {got[:4]}")
    return "ran"


PATCH_ROOTS = {"registry": "reg", "vocabulary": "voc", "taxonomy": "tax"}


def apply_patch(ctx, patch):
    if patch["target"] == "new-schema":
        ctx["sd"][patch["value"]["name"]] = copy.deepcopy(ctx["sd"][patch["value"]["from"]])
        return
    root = ctx["sd"][patch["schema"]] if patch["target"] == "schema" else ctx[PATCH_ROOTS[patch["target"]]]
    pointer = patch.get("pointer", "")
    op = patch["op"]
    if op == "set":
        parent = resolve_pointer(root, pointer.rsplit("/", 1)[0]) if "/" in pointer.lstrip("/") else root
        last = pointer.rstrip("/").rsplit("/", 1)[-1]
        parent[last] = patch["value"]
    elif op == "remove":
        parent = resolve_pointer(root, pointer.rsplit("/", 1)[0]) if "/" in pointer.lstrip("/") else root
        last = pointer.rstrip("/").rsplit("/", 1)[-1]
        if isinstance(parent, list):
            parent.pop(int(last))
        else:
            parent.pop(last, None)
    elif op == "append":
        resolve_pointer(root, pointer).append(patch["value"])
    elif op == "removeItem":
        arr = resolve_pointer(root, pointer)
        if patch["value"] in arr:
            arr.remove(patch["value"])
    elif op == "dup":
        arr = resolve_pointer(root, pointer)
        arr.append(copy.deepcopy(arr[patch.get("index", 0)]))


def run_all_checks(ctx, F):
    check_schemas(ctx, F)
    check_enums(ctx, F)
    check_registry(ctx, F)
    check_catalogues(ctx, F)
    check_safety(ctx, F)


def check_selftest(ctx, F):
    """Apply each planted defect to an isolated copy of the corpus and assert the exact rule fires."""
    defects = sorted(glob.glob(f"{CORPUS}/planted-defects/*.json"))
    if not defects:
        return "not-run"
    for df in defects:
        patch = load_json(df, F)                      # parse-safe (item 4): bad JSON -> USF-PARSE-001
        if patch is None:
            continue
        if not isinstance(patch, dict) or "expectedRule" not in patch or "target" not in patch:
            F.add("USF-SELFTEST-001", df, "planted-defect missing target/expectedRule")
            continue
        sandbox = copy.deepcopy(ctx)
        try:
            apply_patch(sandbox, patch)
        except Exception as e:
            F.add("USF-SELFTEST-001", df, f"patch failed to apply: {e}")
            continue
        f2 = Findings()
        run_all_checks(sandbox, f2)
        if patch["expectedRule"] not in f2.rule_ids():
            F.add("USF-SELFTEST-001", df, f"expected {patch['expectedRule']}; got {sorted(f2.rule_ids())[:8]}")
    return "ran"


def git_checked(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"git {' '.join(args)} failed (exit {r.returncode})")
    return r.stdout.strip()


def check_pr(ctx, F, base, head):
    if not base or not head:
        print("ERROR: pr mode requires --base and --head", file=sys.stderr)
        sys.exit(2)
    try:
        diff = git_checked("diff", "--name-status", f"{base}...{head}")
        same = git_checked("rev-parse", base) == git_checked("rev-parse", head)
    except RuntimeError as e:
        print(f"ERROR: pr mode git failure: {e}", file=sys.stderr)
        sys.exit(2)
    if not diff and not same:
        print(f"ERROR: empty diff but {base} and {head} differ (bad refs / missing fetch?)", file=sys.stderr)
        sys.exit(2)
    reg_paths = {e["path"] for e in ctx["reg"]["schemas"]}
    for line in diff.splitlines():
        parts = line.split("\t")
        status, path = parts[0], parts[-1]
        if status.startswith("A"):
            if re.search(r"(^|/)(src|app|packages)/", path) or re.search(r"\.(ts|tsx|jsx)$", path):
                F.add("USF-PR-RUNTIME", path, "added file looks like implementation/runtime code")
            is_tooling = (re.match(r"tools/.*\.(py|mjs|js|sh)$", path)
                          or path.startswith(".github/workflows/")
                          or re.search(r"(^|/)requirements[^/]*\.txt$", path))
            if is_tooling and path not in AUTHORIZED_TOOLING:
                F.add("USF-PR-TOOL", path, "tool/CI added but not in AUTHORIZED_TOOLING (explicit authorisation required)")
        if status.startswith("D") and re.match(r"spec/schemas/.*\.schema\.json$", path) and path in reg_paths:
            F.add("USF-PR-DELETE", path, "deleted schema still in registry")
    for e in ctx["reg"]["schemas"]:
        if e["lifecycleState"] == "active":
            F.add("USF-PR-ACTIVE", e["id"], "schema marked active")


def emit_report(ctx, F, path):
    sha = git_checked("rev-parse", "HEAD") if subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True).returncode == 0 else "unknown"
    dirty = bool(subprocess.run(["git", "status", "--porcelain", *DIRTY_PATHS], cwd=ROOT, capture_output=True, text=True).stdout.strip())
    status = "fail" if F.blocking_or_error() else ("advisory" if dirty else "pass")
    vsets = {vs["id"] for vs in ctx["voc"]["valueSets"]}
    vocab_refs = [v for v in ("validation-severities", "report-statuses") if v in vsets] or sorted(vsets)[:1]
    tax_refs = sorted(ctx["tax_ids"])[:1] or ["governance"]
    report = {
        "id": "usf.validator-report.spec", "title": "USF Spec Validator Report",
        "description": "Generated validator report for the USF spec corpus produced by tools/validate-spec.py. "
                       "Rank-7 generated-report; never overrides evidence or semantics.",
        "authorityLevel": "generated-report", "status": status, "lifecycleState": "draft",
        "ontologyConcepts": ["Validator", "Generated Report"], "taxonomyRefs": tax_refs, "vocabularyRefs": vocab_refs,
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
                    choices=["schemas", "enums", "catalogues", "registry", "fixtures", "selftest", "pr", "all"])
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--report")
    ap.add_argument("--base")
    ap.add_argument("--head")
    a = ap.parse_args()

    F = Findings()
    ctx = build_ctx(F)
    if ctx is None:
        for f in F.items:
            print(f"  [{f['severity']}] {f['ruleId']} {f['subject']}: {f['message']}")
        print("USF validator: corpus could not be loaded (fail-closed).")
        sys.exit(1)

    fixtures_state = selftest_state = None
    pr_requested = a.base is not None or a.head is not None
    run = {
        "schemas": ["schemas"], "enums": ["enums"], "catalogues": ["catalogues"], "registry": ["registry"],
        "fixtures": ["fixtures"], "selftest": ["selftest"], "pr": ["pr"],
        "all": ["schemas", "enums", "catalogues", "registry", "safety", "fixtures", "selftest"]
               + (["pr"] if pr_requested else []),
    }[a.mode]
    if "schemas" in run:
        check_schemas(ctx, F)
    if "enums" in run:
        check_enums(ctx, F)
    if "catalogues" in run:
        check_catalogues(ctx, F)
    if "registry" in run:
        check_registry(ctx, F)
    if "safety" in run:
        check_safety(ctx, F)
    if "fixtures" in run:
        fixtures_state = check_fixtures(ctx, F)
    if "selftest" in run:
        selftest_state = check_selftest(ctx, F)
    if "pr" in run:
        check_pr(ctx, F, a.base or "main", a.head or "HEAD")

    if a.report:
        emit_report(ctx, F, a.report)

    if a.json:
        print(json.dumps({"mode": a.mode, "schemaCount": len(ctx["sd"]), "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(f["ruleId"] for f in F.items))
        head = f"USF validator [{a.mode}]: " + ("CLEAN" if not F.items else json.dumps(counts))
        for label, st in (("fixtures", fixtures_state), ("selftest", selftest_state)):
            if st == "not-run":
                head += f"  ({label}: none present)"
        print(head)
        for f in F.items:
            print(f"  [{f['severity']}] {f['ruleId']} {f['subject']}: {f['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
