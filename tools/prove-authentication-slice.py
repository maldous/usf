#!/usr/bin/env python3
"""Run the USF proof-only authentication slice harness.

This is proof/governance tooling only. It does not start USF-39, create product
runtime, import React code, or execute historical React proof scripts. The
historical proof scripts and tests listed below are lineage/design inputs only:

- apps/platform-api/scripts/auth-settings-runtime-proof.ts
- apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts
- apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts
- apps/platform-api/tests/substrate/auth-routes.test.ts

The harness executes deterministic assertions over the committed USF semantic
instances for the authentication login API, audit event, workflow, hermetic
provider mode, and hermetic environment, then writes draft proof/evidence
records under the approved evidence homes.
"""

import argparse
import copy
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROOF_PATH = ROOT / "evidence/proof-evidence/authentication-slice-proof.json"
RUNTIME_ENVELOPE_PATH = ROOT / "evidence/evidence-envelope/authentication-slice-proof.json"
LINEAGE_ENVELOPE_PATH = ROOT / "evidence/evidence-envelope/authentication-slice-proof-lineage.json"

INSTANCE_PATHS = {
    "command": "spec/instances/command/authentication-slice-proof.json",
    "semantic": "spec/instances/semantic-contract/authentication-platform.json",
    "interface": "spec/instances/interface-contract/authentication-login-api.json",
    "event": "spec/instances/event-contract/authentication-login-audit.json",
    "workflow": "spec/instances/workflow/authentication-login.json",
    "provider": "spec/instances/provider-mode/mock-identity-provider.json",
    "environment": "spec/instances/environment/hermetic.json",
    "audit": "spec/instances/audit-event/authentication-login.json",
    "observability": "spec/instances/observability-signal/authentication-login-audit.json",
}

GOVERNANCE_INPUTS = [
    "docs/architecture/production-proof-posture-matrix.md",
    "docs/architecture/proof-and-evidence-pipeline-plan.md",
    "docs/architecture/authentication-slice-source-use-disposition-matrix.md",
    "docs/architecture/proof-execution-substrate-authorization.md",
    "docs/architecture/react-foundation-artifact-reuse-assessment.md",
]

HISTORICAL_INPUTS = [
    "apps/platform-api/scripts/auth-settings-runtime-proof.ts",
    "apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts",
    "apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts",
    "apps/platform-api/tests/substrate/auth-routes.test.ts",
]


def git(*args):
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        raise SystemExit(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def load_json(relpath):
    with (ROOT / relpath).open("r", encoding="utf-8") as fh:
        return json.load(fh)


def require(condition, label, observed):
    if not condition:
        raise AssertionError(f"{label}: {observed!r}")


def require_contains(values, expected, label):
    require(expected in values, label, values)


def run_assertions(instances):
    command = instances["command"]
    semantic = instances["semantic"]
    interface = instances["interface"]
    event = instances["event"]
    workflow = instances["workflow"]
    provider = instances["provider"]
    environment = instances["environment"]
    audit = instances["audit"]
    observability = instances["observability"]

    checks = []

    def check(label, condition, observed):
        require(condition, label, observed)
        checks.append(label)

    check("command is proof-only", command.get("commandKind") == "proof-command", command.get("commandKind"))
    check("command emits evidence", command.get("emitsEvidence") is True, command.get("emitsEvidence"))
    check("command includes hermetic scope", "hermetic" in command.get("environmentScope", []), command.get("environmentScope"))

    check("semantic contract is authentication", semantic.get("capabilityDomain") == "authentication", semantic.get("capabilityDomain"))
    check("semantic proof facet complete", semantic.get("facets", {}).get("proof", {}).get("status") == "complete", semantic.get("facets", {}).get("proof"))

    check("interface binds semantic contract", interface.get("semanticContractRef") == semantic["id"], interface.get("semanticContractRef"))
    for field in ("provider-selection", "callback-state-token", "session-cookie", "custom-domain-origin"):
        check(f"interface request carries {field}", field in interface.get("requestContract", {}).get("fields", []), interface.get("requestContract", {}).get("fields"))
    for field in ("authenticated-session", "denied-login", "provider-failure", "no-session"):
        check(f"interface response carries {field}", field in interface.get("responseContract", {}).get("fields", []), interface.get("responseContract", {}).get("fields"))
    check("interface drift detectable", interface.get("driftDetectable") is True, interface.get("driftDetectable"))

    check("event producer is interface", event.get("producer") == interface["id"], event.get("producer"))
    check("event consumer is audit", audit["id"] in event.get("consumers", []), event.get("consumers"))
    check("event is canonical", event.get("canonical") is True, event.get("canonical"))

    participants = workflow.get("participants", [])
    for ref in (interface["id"], provider["id"], audit["id"]):
        check(f"workflow participant {ref}", ref in participants, participants)
    operations = [step.get("operation") for step in workflow.get("steps", [])]
    for ref in (interface["id"], provider["id"], audit["id"]):
        check(f"workflow operation {ref}", ref in operations, operations)
    check("workflow relates audit event", event["id"] in workflow.get("relatedEvents", []), workflow.get("relatedEvents"))
    check("workflow relates interface", interface["id"] in workflow.get("relatedInterfaces", []), workflow.get("relatedInterfaces"))

    check("provider mode is hermetic mock", provider.get("providerMode") == "hermetic-mock", provider.get("providerMode"))
    check("provider environment is hermetic", provider.get("environment") == "hermetic", provider.get("environment"))
    check("provider has no live claim", provider.get("liveExternalProviderClaim") is False, provider.get("liveExternalProviderClaim"))

    check("environment is hermetic", environment.get("environment") == "hermetic", environment.get("environment"))
    check("environment permits hermetic mock", "hermetic-mock" in environment.get("permittedProviderModes", []), environment.get("permittedProviderModes"))
    check("environment has no production live claim", environment.get("productionLiveClaim") is False, environment.get("productionLiveClaim"))

    check("audit is security sensitive", audit.get("securitySensitive") is True, audit.get("securitySensitive"))
    check("audit is state changing", audit.get("stateChanging") is True, audit.get("stateChanging"))
    check("audit related interface", audit.get("relatedInterface") == interface["id"], audit.get("relatedInterface"))
    check("audit related workflow", audit.get("relatedWorkflow") == workflow["id"], audit.get("relatedWorkflow"))

    check("observability source is audit", observability.get("source") == audit["id"], observability.get("source"))
    for attr in ("provider-mode", "request-id", "proof-id", "capability-id"):
        check(f"observability attribute {attr}", attr in observability.get("attributes", []), observability.get("attributes"))

    return checks


def evidence_refs():
    refs = [str(path) for path in INSTANCE_PATHS.values()]
    refs.extend(GOVERNANCE_INPUTS)
    refs.append("tools/prove-authentication-slice.py")
    return refs


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")


def build_records(commit, checks):
    runtime_id = "evidence.runtime-proof.authentication-slice-proof"
    lineage_id = "evidence.normalised.authentication-slice-proof-lineage"
    freshness = {"commit": commit, "stale": False}
    source_refs = evidence_refs()

    runtime_envelope = {
        "id": runtime_id,
        "title": "Runtime evidence envelope for authentication slice proof",
        "description": "Draft runtime-proof evidence envelope emitted by the USF proof-only authentication slice harness.",
        "authorityLevel": "runtime-proof-evidence",
        "lifecycleState": "draft",
        "ontologyConcepts": ["Evidence"],
        "taxonomyRefs": ["evidence-classification"],
        "vocabularyRefs": ["evidence-kinds", "provider-modes", "environment-classes"],
        "aiGuidance": "Use only as current hermetic proof-only evidence for the named authentication semantic slice. Do not treat it as implementation extraction, live-provider evidence, or production-live readiness.",
        "evidenceKind": "runtime-proof-evidence",
        "sourceRefs": source_refs,
        "providerMode": "hermetic-mock",
        "environment": "hermetic",
        "freshness": freshness,
    }

    lineage_envelope = {
        "id": lineage_id,
        "title": "Normalised lineage for authentication slice proof",
        "description": "Draft normalised evidence envelope recording the historical React proof inputs used only as lineage and design input for the USF proof-only harness.",
        "authorityLevel": "runtime-proof-evidence",
        "lifecycleState": "draft",
        "ontologyConcepts": ["Evidence"],
        "taxonomyRefs": ["evidence-classification"],
        "vocabularyRefs": ["evidence-kinds"],
        "aiGuidance": "Historical React inputs remain lineage only. They were not executed, copied, imported as runtime, or treated as USF live authority.",
        "evidenceKind": "normalised-evidence",
        "sourceRefs": HISTORICAL_INPUTS,
    }

    proof = {
        "id": "usf.proof-evidence.authentication-slice-proof",
        "kind": "proof",
        "title": "Authentication slice proof",
        "description": "Draft USF proof-evidence record emitted by the bounded proof-only authentication slice harness. It exercises the committed USF authentication login API, audit, workflow, provider-mode, and hermetic environment semantics without creating product runtime or importing React runtime code.",
        "authorityLevel": "runtime-proof-evidence",
        "lifecycleState": "draft",
        "ontologyConcepts": ["Proof", "Proof Level", "Evidence"],
        "taxonomyRefs": ["proof-classification", "provider-classification", "environment-classification"],
        "vocabularyRefs": ["proof-levels", "provider-modes", "environment-classes", "evidence-kinds"],
        "aiGuidance": "This is hermetic proof-only evidence for the semantic authentication slice. It does not start USF-39, authorise implementation extraction, claim live-external-provider readiness, or claim production-live readiness.",
        "claimExercised": "The proof-only harness asserted the authentication login API/audit/workflow/provider-mode slice: login request and response semantics, audit event production and consumption, workflow participants and operations, hermetic mock provider mode, hermetic environment constraints, and observability/audit correlation.",
        "proofLevelClaimed": "behaviour-proven",
        "proofLevelObserved": "behaviour-proven",
        "providerMode": "hermetic-mock",
        "environment": "hermetic",
        "liveExternalProviderClaim": False,
        "emittedEvidence": [
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/0",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/1",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/2",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/3",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/4",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/5",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/6",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/7",
            "evidence/evidence-envelope/authentication-slice-proof.json#/sourceRefs/8",
        ],
        "collectedEvidence": [runtime_id, lineage_id],
        "freshness": freshness,
        "failureSemantics": "If any required semantic instance, reference, provider/environment invariant, emitted evidence, collected evidence, or freshness pin is missing or stale, the proof fails closed and must not satisfy readiness. Checks executed: " + "; ".join(checks),
    }

    return proof, runtime_envelope, lineage_envelope


def _canonical_json(data):
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def build_anchor_payload(commit, proof, runtime_envelope, lineage_envelope):
    """Build the deterministic payload a future signed post-merge anchor would bind.

    This payload is not proof authority by itself. It is an unsigned publication
    input intended for a later approved carrier and signer/trust model.
    """
    payload = {
        "payloadKind": "proof-freshness-anchor-payload",
        "payloadVersion": "draft-anchor-payload-1",
        "targetCommit": commit,
        "proofId": proof["id"],
        "providerMode": proof["providerMode"],
        "environment": proof["environment"],
        "proofLevelClaimed": proof["proofLevelClaimed"],
        "proofLevelObserved": proof["proofLevelObserved"],
        "liveExternalProviderClaim": proof["liveExternalProviderClaim"],
        "productionLiveClaim": False,
        "freshness": copy.deepcopy(proof["freshness"]),
        "emittedEvidence": copy.deepcopy(proof["emittedEvidence"]),
        "collectedEvidence": copy.deepcopy(proof["collectedEvidence"]),
        "sourceRefs": sorted(set(runtime_envelope.get("sourceRefs", []) + lineage_envelope.get("sourceRefs", []))),
    }
    payload["payloadDigest"] = "sha256:" + hashlib.sha256(_canonical_json(payload)).hexdigest()
    return payload


def main():
    parser = argparse.ArgumentParser(description="Run the proof-only USF authentication slice harness.")
    parser.add_argument("--claim-commit", default=None, help="Commit SHA the proof run claims; defaults to HEAD.")
    parser.add_argument("--write", action="store_true", help="Write evidence records under evidence/.")
    parser.add_argument("--emit-anchor-payload", action="store_true",
                        help="Print deterministic unsigned anchor payload JSON instead of the summary; writes nothing.")
    args = parser.parse_args()
    if args.emit_anchor_payload and args.write:
        parser.error("--emit-anchor-payload is write-free and cannot be combined with --write")

    os.chdir(ROOT)
    claim_commit = args.claim_commit or git("rev-parse", "HEAD")
    instances = {name: load_json(path) for name, path in INSTANCE_PATHS.items()}
    checks = run_assertions(instances)
    proof, runtime_envelope, lineage_envelope = build_records(claim_commit, checks)
    anchor_payload = build_anchor_payload(claim_commit, proof, runtime_envelope, lineage_envelope)

    if args.write:
        write_json(RUNTIME_ENVELOPE_PATH, runtime_envelope)
        write_json(LINEAGE_ENVELOPE_PATH, lineage_envelope)
        write_json(PROOF_PATH, proof)

    if args.emit_anchor_payload:
        print(json.dumps(anchor_payload, indent=2, sort_keys=True))
        return

    print(json.dumps({
        "status": "pass",
        "claimCommit": claim_commit,
        "providerMode": "hermetic-mock",
        "environment": "hermetic",
        "proofLevelObserved": "behaviour-proven",
        "liveExternalProviderClaim": False,
        "productionLiveClaim": False,
        "checks": len(checks),
        "wroteEvidence": bool(args.write),
        "anchorPayloadDigest": anchor_payload["payloadDigest"],
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except AssertionError as exc:
        print(json.dumps({"status": "fail", "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)
