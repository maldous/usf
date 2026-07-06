# Proof Tool Contract Standard

| | |
|---|---|
| **Document type** | Architecture / proof tool contract standard |
| **Status** | Draft / proof-governance standard |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-78 |
| **Primary inputs** | `docs/architecture/proof-and-evidence-pipeline-plan.md`, `docs/architecture/production-proof-posture-matrix.md`, `docs/architecture/proof-execution-substrate-authorization.md`, `tools/validate-bootstrap/validate-bootstrap.py`, `spec/schemas/proof-evidence.schema.json`, `spec/schemas/evidence-envelope.schema.json` |

This standard defines the shared contract for proof-only tools in USF. It creates no proof evidence, runs no proof, imports no runtime/application code, creates no implementation directory, emits no generated report, and promotes no schema to `active`.

## Purpose

Future proof slices must not invent their own command shape, freshness model, evidence output, lineage treatment, or provider/environment claim rules. A proof tool is admissible only when it follows one shared contract and is separately authorized by a slice-specific substrate decision.

This standard governs proof-only tooling. It does not authorize product implementation runtime and does not start USF-39.

## Scope

This standard applies to any tool under `tools/` whose purpose is to execute a USF proof slice or emit proof/evidence records.

It covers:

- command inputs;
- claim commit handling;
- provider mode and environment fields;
- proof level claimed and proof level observed;
- emitted evidence and collected evidence;
- proof-evidence output requirements;
- evidence-envelope output requirements;
- lineage record requirements;
- generated report authority limits;
- freshness and stale handling;
- hermetic versus live and production no-go rules;
- validation gates;
- planted-defect expectations when validator rules are added.

## Command Contract

A proof tool MUST be executable as a deterministic command from the repository root.

Each proof tool MUST accept, or otherwise deterministically derive, these inputs:

- claim commit: the USF commit whose state the proof claim is about;
- write mode: whether the command writes proof/evidence records or only checks and prints a result;
- provider mode: the provider substrate used by the proof;
- environment: the execution environment represented by the proof;
- output paths: the proof-evidence record and evidence-envelope records that may be written;
- source-use policy: the historical source-lineage inputs and their permitted treatment;
- governed semantic inputs: the USF semantic instances, ADRs, standards, manifests, and evidence records used as authority or lineage.

If a tool supports a default claim commit, the default MUST be the current `HEAD` commit. If the proof claim is for any other commit, the command invocation MUST make that explicit.

A proof tool MUST fail closed when a required input is missing, malformed, unresolved, stale for the claim being made, or inconsistent with the authorized substrate.

## Command Output Contract

Every proof tool MUST print a machine-readable summary when it completes. The summary MUST include:

- status;
- claim commit;
- provider mode;
- environment;
- proof level observed;
- live external provider claim;
- production-live claim;
- whether evidence was written.

The command summary is a generated report-style convenience output. It MUST NOT be treated as the proof authority. The committed proof-evidence and evidence-envelope records remain the proof authority when evidence is written and validated.

A proof tool MAY also emit a deterministic unsigned proof freshness anchor payload when an approved publication model requires a post-merge anchor. That payload is publication input only. It is not proof authority unless a later accepted carrier and signer/trust decision binds it to a verified post-merge anchor.

## Freshness Rules

Proof freshness is commit-pinned.

Every proof-evidence record and runtime proof evidence envelope MUST carry:

- `freshness.commit`;
- `freshness.stale`.

For a current readiness claim, `freshness.commit` MUST equal the USF commit being claimed and `freshness.stale` MUST be `false`.

A record whose freshness commit differs from the commit being claimed is stale for that claim. It MAY remain historical evidence, but it MUST NOT satisfy current readiness.

Re-running validation without re-executing or re-collecting required proof evidence MUST NOT upgrade stale proof into current proof. A generated report with stale or unverifiable underlying evidence is void for readiness.

## Provider and Environment Rules

Provider mode and environment are independent proof dimensions.

A proof tool MUST record provider mode and environment separately. A provider mode MUST NOT upgrade the environment by implication. An environment MUST NOT upgrade the provider mode by implication.

Hermetic proof is valid internal proof when authorized, but:

- `hermetic-mock` MUST NOT satisfy a live-external-provider claim;
- `hermetic` MUST NOT satisfy production-live readiness;
- `production-shaped` MUST NOT satisfy production-live readiness;
- external sandbox proof MUST NOT satisfy live external provider proof;
- no proof may claim a stronger posture than its observed substrate supports.

A proof tool MUST set `liveExternalProviderClaim` to `false` unless the authorized substrate uses `live-external-provider`, the environment and proof level meet the governing posture, and fresh evidence supports the claim.

A proof tool MUST NOT make a production-live claim unless a separate directive authorizes production-live proof and the evidence records explicitly support that claim.

## Proof Level Rules

Every proof-evidence record MUST include:

- `proofLevelClaimed`;
- `proofLevelObserved`.

`proofLevelClaimed` MUST NOT exceed `proofLevelObserved`.

Above discovery level, emitted evidence and collected evidence MUST be non-empty. Missing collected evidence MUST fail closed. Proof level is not report status, and a report status MUST NOT be used as a proof level.

## Evidence Output Requirements

When a proof tool writes evidence, it MUST write only the output paths authorized by the slice-specific substrate decision.

At minimum, an executed proof that writes evidence MUST produce:

- one proof-evidence record under `evidence/proof-evidence/`;
- one runtime proof evidence envelope under `evidence/evidence-envelope/`;
- one lineage or source-use evidence envelope when historical source-lineage proof scripts, tests, reports, or source files influenced the tool design.

The proof-evidence record MUST describe the claim exercised, proof levels, provider mode, environment, live external provider claim, emitted evidence, collected evidence, freshness, and failure semantics.

The runtime evidence envelope MUST preserve provider mode, environment, freshness, source references, and evidence kind.

The lineage evidence envelope MUST preserve historical source references and state their source-use treatment. Historical source-lineage inputs MAY be lineage or design input, but they MUST NOT be treated as USF runtime authority, copied blindly, executed as USF proof commands, or mirrored as USF target paths.

For the current authentication slice authorized by USF-77 Option A, the only authorized evidence outputs are:

- `evidence/proof-evidence/authentication-slice-proof.json`;
- `evidence/evidence-envelope/authentication-slice-proof.json`;
- `evidence/evidence-envelope/authentication-slice-proof-lineage.json`.

Future proof slices MUST name their exact authorized evidence outputs before a proof tool writes them.

## Anchor Payload Output

When a proof tool emits a proof freshness anchor payload, the payload MUST bind:

- target commit;
- proof id;
- provider mode;
- environment;
- proof level claimed;
- proof level observed;
- live external provider claim;
- production-live claim;
- freshness;
- emitted evidence;
- collected evidence;
- source references;
- canonical payload digest.

The payload MUST be deterministic so a future post-merge carrier can sign or reference the same digest. The payload MUST NOT claim signer trust, signature validity, carrier validity, or publication success by itself.

## Source-Use Rules

source-lineage proof scripts, tests, runtime handlers, package graphs, source files, generated reports, and operational commands are historical evidence only unless a later source-use directive explicitly authorizes a narrower treatment.

A proof tool MAY be newly authored from USF semantics and may use historical source-lineage artefacts as lineage/design input only when the source-use treatment is recorded.

A proof tool MUST NOT:

- import source-lineage runtime/application code;
- execute historical source-lineage proof commands as USF proof commands;
- mirror source lineage paths as USF target paths;
- create product runtime, application packages, services, adapters, servers, databases, caches, identity-provider services, package manifests, compose files, or implementation directories;
- treat a generated report as authority;
- silently discard source lineage.

If a future proof tool adapts source-derived proof runner logic, the source-use treatment MUST be explicitly recorded before merge.

## Generated Report Boundary

Command stdout, validator output, and generated summaries are lower-authority reports. They may help humans review a proof run, but they MUST NOT replace proof-evidence records, evidence envelopes, semantic definitions, ADRs, or validator rules.

A generated report MUST NOT:

- define intended behaviour;
- hide missing emitted evidence;
- hide missing collected evidence;
- treat stale proof as current proof;
- promote schema lifecycle state;
- upgrade hermetic proof to live external provider proof;
- upgrade production-shaped proof to production-live proof.

## Validator and Planted-Defect Rules

This standard does not itself add validator rules.

If a future PR adds or changes validator rules for this proof-tool contract, every new rule MUST have:

- a stable rule ID;
- a positive fixture or real instance showing the accepted form where applicable;
- a planted defect or negative fixture proving the failure is caught;
- selftest coverage;
- clean `validate-spec selftest` output before merge.

Validator rules enforce this contract; they do not invent product meaning.

## Required Validation

Every PR that creates or changes a proof tool or proof evidence MUST run:

- `python3 tools/validate-spec/validate-spec.py all --json`;
- `python3 tools/validate-spec/validate-spec.py evidence --json`;
- `python3 tools/validate-spec/validate-spec.py real-instances --json`;
- `python3 tools/validate-spec/validate-spec.py selftest --json`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`.

Every changed JSON file MUST parse strictly. If changed JSON is governed by a schema or validator mode, that mode MUST pass.

## No-Go Rules

Proof tooling MUST NOT start USF-39.

Proof tooling MUST NOT create product implementation/runtime code or implementation directories.

Proof tooling MUST NOT import source-lineage runtime/application code.

Proof tooling MUST NOT mirror source lineage paths as USF target paths.

Proof tooling MUST NOT activate schemas.

Proof tooling MUST NOT treat generated reports as authority.

Proof tooling MUST NOT use stale evidence for current readiness.

Proof tooling MUST NOT treat hermetic proof as live-external-provider or production-live proof.

## Readiness Effect

This standard satisfies the USF-78 proof-tool contract boundary when merged with clean validation. It unblocks later proof-slice issues to author proof plans or proof-only tools, but only when each slice has its own semantic grounding, source-use policy, authorization decision, evidence output paths, and validation evidence.

This standard does not itself prove any slice beyond already committed proof evidence and does not authorize implementation extraction.
