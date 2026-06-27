#!/usr/bin/env python3
"""USF bootstrap-readiness validator.

This is governance tooling only. It does not create implementation/runtime files,
does not import React source, and does not publish evidence. It checks the
bootstrap-specific invariants that sit above the general spec corpus validator:
the implementation directive must remain human-only and unsigned, readiness
documents must remain NO-GO until authority changes, implementation-shaped roots
must not exist before bootstrap, and the semantic/source-use substrate required
for a later implementation attempt must be present.
"""
import argparse
import json
import os
import subprocess
import sys
from collections import Counter


RULES = {
    "USF-BOOTSTRAP-001": ("blocking", "required bootstrap artefact is missing"),
    "USF-BOOTSTRAP-002": ("blocking", "forbidden implementation/root scaffold exists before bootstrap"),
    "USF-BOOTSTRAP-003": ("blocking", "implementation directive is accepted/signed or lacks human-only boundary"),
    "USF-BOOTSTRAP-004": ("blocking", "readiness artefact overclaims implementation or production readiness"),
    "USF-BOOTSTRAP-005": ("blocking", "whole-platform semantic/source-use bootstrap substrate is missing"),
    "USF-BOOTSTRAP-006": ("blocking", "current main commit lacks a published proof-anchor tag"),
    "USF-BOOTSTRAP-007": ("blocking", "bootstrap validator is not wired into validate-spec"),
    "USF-BOOTSTRAP-SELFTEST": ("blocking", "planted bootstrap defect did not raise its expected rule"),
}

REQUIRED_ARTEFACTS = [
    "docs/architecture/implementation-extraction-directive.md",
    "docs/architecture/react-l5-equivalence-audit.md",
    "docs/architecture/complete-readiness-blocker-register.md",
    "docs/architecture/final-v2-readiness-reconciliation.md",
    "docs/architecture/target-implementation-topology-plan.md",
    "docs/architecture/semantic-source-use-closure-ledger.md",
    "spec/registries/source-import-manifest.json",
    "tools/validate-spec/validate-spec.py",
    ".github/workflows/proof-anchor.yml",
]

READINESS_DOCS = [
    "docs/architecture/complete-readiness-blocker-register.md",
    "docs/architecture/final-v2-readiness-reconciliation.md",
    "docs/architecture/implementation-extraction-directive.md",
]

FORBIDDEN_ROOTS = {
    "apps",
    "packages",
    "services",
    "src",
    "config",
    "infra",
    "scripts",
    "capabilities",
    "adapters",
    "tests",
}

DIRECTIVE_PATH = "docs/architecture/implementation-extraction-directive.md"
VALIDATE_SPEC_PATH = "tools/validate-spec/validate-spec.py"
SELFTEST_DIR = "tools/validate-bootstrap/planted-defects"


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append(
            {
                "severity": severity,
                "ruleId": rule_id,
                "subject": str(subject),
                "message": message or RULES.get(rule_id, ("", ""))[1],
            }
        )

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


def repo_paths():
    paths = set()
    for base, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in {".git", ".codex", "__pycache__"}]
        for name in files:
            paths.add(os.path.join(base, name).replace("\\", "/").removeprefix("./"))
    return paths


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def git_value(*args):
    completed = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        return None
    return completed.stdout.strip()


def current_branch():
    return git_value("branch", "--show-current") or ""


def current_head():
    return git_value("rev-parse", "HEAD") or ""


def remote_main_head():
    return git_value("rev-parse", "origin/main") or ""


def remote_has_tag(tag):
    completed = subprocess.run(
        ["git", "ls-remote", "--tags", "origin", f"refs/tags/{tag}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        return False
    return f"refs/tags/{tag}" in completed.stdout


def build_state(overrides=None):
    overrides = overrides or {}
    paths = set(overrides.get("paths", repo_paths()))
    directive_text = overrides.get("directiveText")
    if directive_text is None and DIRECTIVE_PATH in paths:
        directive_text = read_text(DIRECTIVE_PATH)
    readiness_texts = {}
    for path in READINESS_DOCS:
        if path in overrides.get("readinessTexts", {}):
            readiness_texts[path] = overrides["readinessTexts"][path]
        elif path in paths:
            readiness_texts[path] = read_text(path)
    semantic_contracts = sorted(p for p in paths if p.startswith("spec/instances/semantic-contract/") and p.endswith(".json"))
    semantic_domains = set()
    for path in semantic_contracts:
        if path not in paths or not os.path.exists(path):
            continue
        try:
            domain = read_json(path).get("capabilityDomain")
        except Exception:
            domain = None
        if domain:
            semantic_domains.add(domain)
    source_manifests = sorted(p for p in paths if p.startswith("spec/registries/") and p.endswith("source-import-manifest.json"))
    return {
        "paths": paths,
        "directiveText": directive_text or "",
        "readinessTexts": readiness_texts,
        "semanticContracts": overrides.get("semanticContracts", semantic_contracts),
        "semanticDomains": overrides.get("semanticDomains", sorted(semantic_domains)),
        "sourceManifests": overrides.get("sourceManifests", source_manifests),
    }


def check_required_artefacts(F, state):
    for path in REQUIRED_ARTEFACTS:
        if path not in state["paths"]:
            F.add("USF-BOOTSTRAP-001", path)


def check_no_forbidden_roots(F, state):
    roots = {path.split("/", 1)[0] for path in state["paths"]}
    for root in sorted(roots & FORBIDDEN_ROOTS):
        F.add("USF-BOOTSTRAP-002", root, "implementation-shaped root exists before bootstrap")


def check_directive_boundary(F, state):
    text = state["directiveText"]
    lower = text.lower()
    required_phrases = [
        "draft",
        "human-only acceptance boundary",
        "unsigned",
        "usf-39 remains backlog",
        "separate usf-39 start action",
    ]
    for phrase in required_phrases:
        if phrase not in lower:
            F.add("USF-BOOTSTRAP-003", DIRECTIVE_PATH, f"missing required directive boundary phrase: {phrase}")
    signed_markers = [
        "authorisation date | 202",
        "usf-100 acceptance recorded | accepted",
        "separate usf-39 start action authorised | authorised",
    ]
    for marker in signed_markers:
        if marker in lower:
            F.add("USF-BOOTSTRAP-003", DIRECTIVE_PATH, f"directive appears accepted or signed: {marker}")


def check_readiness_no_go(F, state):
    for path, text in state["readinessTexts"].items():
        lower = text.lower()
        if "usf-39 remains backlog" not in lower:
            F.add("USF-BOOTSTRAP-004", path, "readiness document does not preserve USF-39 Backlog state")
        if path != DIRECTIVE_PATH and "no-go" not in lower:
            F.add("USF-BOOTSTRAP-004", path, "readiness document does not preserve NO-GO classification")
        forbidden_claims = [
            "production-live readiness is complete",
            "live-external-provider readiness is complete",
            "complete one-pass implementation readiness is go",
            "ready to start usf-39",
        ]
        for claim in forbidden_claims:
            if claim in lower:
                F.add("USF-BOOTSTRAP-004", path, f"forbidden readiness overclaim: {claim}")


def check_mapping_substrate(F, state):
    if not state["semanticContracts"]:
        F.add("USF-BOOTSTRAP-005", "spec/instances/semantic-contract", "no semantic contract instances found")
    if not state["semanticDomains"]:
        F.add("USF-BOOTSTRAP-005", "spec/instances/semantic-contract", "no semantic capability domains found")
    if not state["sourceManifests"]:
        F.add("USF-BOOTSTRAP-005", "spec/registries", "no source import manifest found")
    if "docs/architecture/capability-source-coverage-matrix.md" not in state["paths"]:
        F.add("USF-BOOTSTRAP-005", "docs/architecture/capability-source-coverage-matrix.md")
    directive_lower = state["directiveText"].lower()
    scope_markers = ["whole-platform", "all slices", "semantic-contract corpus"]
    for marker in scope_markers:
        if marker not in directive_lower:
            F.add("USF-BOOTSTRAP-005", DIRECTIVE_PATH, f"missing all-slices bootstrap scope marker: {marker}")
    for domain in state["semanticDomains"]:
        if domain.lower() not in directive_lower:
            F.add("USF-BOOTSTRAP-005", DIRECTIVE_PATH, f"semantic capability domain missing from directive: {domain}")


def check_anchor_for_current_main(F):
    head = current_head()
    if not head:
        return
    if current_branch() != "main" or remote_main_head() != head:
        return
    tag = f"proof-anchor-{head[:7]}"
    if not remote_has_tag(tag):
        F.add("USF-BOOTSTRAP-006", tag, "origin does not expose proof-anchor tag for current main")


def check_validate_spec_wiring(F, state):
    if VALIDATE_SPEC_PATH not in state["paths"]:
        return
    text = read_text(VALIDATE_SPEC_PATH)
    for needle in ["bootstrap", "tools/validate-bootstrap/validate-bootstrap.py"]:
        if needle not in text:
            F.add("USF-BOOTSTRAP-007", VALIDATE_SPEC_PATH, f"missing validate-spec bootstrap wiring token: {needle}")


def run_checks(modes, F, state=None):
    state = state or build_state()
    if "readiness" in modes:
        check_required_artefacts(F, state)
        check_directive_boundary(F, state)
        check_readiness_no_go(F, state)
        check_mapping_substrate(F, state)
        check_anchor_for_current_main(F)
        check_validate_spec_wiring(F, state)
    if "implementation" in modes:
        check_no_forbidden_roots(F, state)


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
        except Exception as exc:
            F.add("USF-BOOTSTRAP-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        overrides = {}
        mutation = fixture.get("mutation", {})
        if mutation.get("removePath"):
            paths = set(base["paths"])
            paths.discard(mutation["removePath"])
            overrides["paths"] = paths
        if mutation.get("addPath"):
            paths = set(overrides.get("paths", base["paths"]))
            paths.add(mutation["addPath"])
            overrides["paths"] = paths
        if "directiveText" in mutation:
            overrides["directiveText"] = mutation["directiveText"]
        if "readinessText" in mutation:
            overrides["readinessTexts"] = {
                "docs/architecture/final-v2-readiness-reconciliation.md": mutation["readinessText"]
            }
        if mutation.get("emptySemanticContracts"):
            overrides["semanticContracts"] = []
            overrides["semanticDomains"] = []
        if "semanticDomains" in mutation:
            overrides["semanticDomains"] = mutation["semanticDomains"]
        local = Findings()
        run_checks(["readiness", "implementation"], local, build_state(overrides))
        if expected not in {item["ruleId"] for item in local.items}:
            F.add("USF-BOOTSTRAP-SELFTEST", path, f"expected {expected}; got {sorted({item['ruleId'] for item in local.items})}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF bootstrap-readiness validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["readiness", "implementation", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    selftest_state = None
    modes = {
        "readiness": ["readiness"],
        "implementation": ["implementation"],
        "selftest": [],
        "all": ["readiness", "implementation"],
    }[args.mode]
    if modes:
        run_checks(modes, F)
    if args.mode in {"selftest", "all"}:
        selftest_state = run_selftest(F)

    if args.json:
        print(json.dumps({"mode": args.mode, "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(item["ruleId"] for item in F.items))
        suffix = "CLEAN" if not F.items else json.dumps(counts)
        if selftest_state == "not-run":
            suffix += "  (selftest: none present)"
        print(f"USF bootstrap validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
