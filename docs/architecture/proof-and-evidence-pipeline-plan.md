# Proof and Evidence Pipeline Plan

| | |
|---|---|
| **Document type** | Architecture / proof and evidence planning |
| **Status** | Draft / planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter and Authority Model |
| **Issue scope** | USF-57; unblocks later evidence population and real-instance validation work |
| **Primary schema inputs** | `spec/schemas/proof-evidence.schema.json`, `spec/schemas/evidence-envelope.schema.json`, `spec/schemas/validator-report.schema.json` |

This document defines the governed process for proof records, evidence records, and validator-report output before `evidence/` is populated with typed records. It creates no evidence records, imports no runtime/application code, and does not promote any schema to `active`.

## Purpose

USF must preserve the distinction between intended behaviour, executed proof, collected evidence, and generated reports. The pipeline exists so later evidence work can be repeatable, schema-grounded, freshness-aware, and honest about provider and environment claims.

## Governing Rules

- The Charter requires internal provability without depending on live external providers.
- The Authority Model ranks runtime proof evidence below semantics, ADRs, and validators, and above USF source, historical evidence, and generated reports.
- A proof record is evidence of what happened; it does not define intended behaviour.
- A generated report is a derived summary; it never upgrades or replaces the underlying evidence.
- Missing evidence, stale evidence, unknown status, provider-mode mismatch, and environment mismatch must fail closed.
- Provider mode and environment are separate dimensions. One must not upgrade the other by implication.
- Hermetic evidence may support internal platform proof, but it must not satisfy a live-external-provider claim.
- Production-shaped evidence must not satisfy production-live readiness.

## Pipeline Stages

1. Define the governed claim.
   The behaviour, command, interface, workflow, provider, environment, or readiness concern must already be represented by USF semantics, ADRs, or validator expectations. A proof cannot invent the claim it exercises.

2. Execute the proof on an explicitly classified substrate.
   The run records the proof level claimed, proof level observed, provider mode, environment, and failure semantics. Provider mode and environment are recorded independently.

3. Preserve emitted evidence.
   Evidence emitted by the proof is recorded as proof output. Above discovery level, emitted evidence must not be empty.

4. Preserve collected evidence.
   Evidence collection records what was actually retained for audit and later validation. Above discovery level, collected evidence must not be empty. Missing collected evidence fails closed.

5. Create typed evidence records.
   Later evidence population work will encode proof and evidence facts using the draft proof and evidence schemas. Runtime proof evidence records carry freshness, provider mode, and environment. Validation evidence records carry freshness and references to what was validated. Generated-report evidence records reference their underlying evidence.

6. Run validators against the current repository state.
   Validators enforce schema shape, controlled values, source/reference resolution, provider/environment safety, freshness requirements, and report/evidence boundaries. Validators enforce USF semantics; they do not create product meaning.

7. Emit validator reports only as generated summaries.
   A report may say pass only when it references evidence and is fresh for the relevant commit. Fail or partial reports must carry findings and evidence references. Reports remain lowest authority.

8. Re-run and re-pin after relevant changes.
   Behaviour-affecting changes require coupled semantic, ADR, validator, proof, and evidence updates. Carrying forward stale proof or report state is not acceptable readiness evidence.

## Required Field Mapping

### Proof Records

Future proof records must map to `proof-evidence.schema.json`:

| Pipeline concern | Schema field |
|---|---|
| Stable record identity | `id` |
| Proof artefact kind | `kind` with value `proof` |
| Human-readable name and explanation | `title`, `description` |
| Authority rank | `authorityLevel` with value `runtime-proof-evidence` |
| Lifecycle state | `lifecycleState` |
| Ontology, taxonomy, and vocabulary grounding | `ontologyConcepts`, `taxonomyRefs`, `vocabularyRefs` |
| Agent guidance | `aiGuidance` |
| Claim exercised | `claimExercised` |
| Claimed proof level | `proofLevelClaimed` |
| Observed proof level | `proofLevelObserved` |
| Provider substrate | `providerMode` |
| Execution environment | `environment` |
| Live-provider assertion | `liveExternalProviderClaim` |
| Emitted evidence | `emittedEvidence` |
| Collected evidence | `collectedEvidence` |
| Commit freshness | `freshness.commit`, `freshness.stale` |
| Failure semantics | `failureSemantics` |

The proof schema requires claimed level not to exceed observed level. Above discovery level, emitted and collected evidence must be non-empty. A live-external-provider claim requires live-external-provider mode and an observed substrate floor or stronger.

### Evidence Envelopes

Future evidence envelopes must map to `evidence-envelope.schema.json`:

| Pipeline concern | Schema field |
|---|---|
| Stable evidence identity | `id` |
| Evidence kind | `evidenceKind` |
| Authority rank | `authorityLevel` with value `runtime-proof-evidence` |
| Lifecycle and grounding | `lifecycleState`, `ontologyConcepts`, `taxonomyRefs`, `vocabularyRefs` |
| Agent guidance | `aiGuidance` |
| Historical or raw source lineage | `sourceRefs` |
| Provider substrate for runtime proof | `providerMode` |
| Environment for runtime proof | `environment` |
| Freshness | `freshness.commit`, `freshness.stale` |
| Report summary status where applicable | `reportStatus` |
| Referenced evidence | `evidenceRefs` |

Runtime proof evidence requires provider mode, environment, and freshness. Validation evidence requires freshness and at least one source or evidence reference. Generated-report evidence requires evidence references and freshness. Normalised evidence keeps references to the raw evidence it reshapes.

### Validator Reports

Validator report output must map to `validator-report.schema.json`:

| Pipeline concern | Schema field |
|---|---|
| Stable report identity | `id` |
| Authority rank | `authorityLevel` with value `generated-report` |
| Report status | `status` |
| Findings | `findings` |
| Referenced evidence | `evidenceRefs` |
| Freshness | `freshness.commit`, `freshness.stale` |
| Lifecycle and grounding | `lifecycleState`, `ontologyConcepts`, `taxonomyRefs`, `vocabularyRefs` |
| Agent guidance | `aiGuidance` |

A pass report requires freshness and non-empty evidence references, and freshness must not be stale. A fail or partial report requires evidence references and at least one finding.

## Freshness Rules

- Freshness is commit-pinned.
- A record whose commit does not match the state being claimed is stale for that claim.
- A stale proof may remain historical evidence, but it must not satisfy current readiness.
- A generated report with stale or unverifiable evidence is void for readiness.
- Unknown report status must not satisfy pass.
- Re-running validators without re-collecting required proof evidence does not upgrade stale proof.

## Provider and Environment Rules

- Provider mode records the provider substrate used by the proof.
- Environment records where the proof ran.
- `hermetic-mock` can support internal proof but not live-external-provider readiness.
- `local-composed-real-service` and `external-sandbox` are stronger than hermetic mock where the schema and proof rules allow, but neither automatically implies production-live.
- `production-shaped` preserves production-like shape without production-live authority.
- `production-live` evidence requires records that explicitly say production-live and carry an appropriate live provider mode where the claim depends on external providers.
- No environment value upgrades provider mode by implication.
- No provider mode upgrades environment by implication.

## Report Boundary

Reports are convenience summaries. A report may cite evidence, findings, and freshness, but it must not:

- define intended behaviour;
- replace proof evidence;
- hide missing emitted or collected evidence;
- treat stale evidence as pass;
- turn advisory validation into active schema promotion;
- turn hermetic evidence into live-external-provider readiness.

## Validation Expectations

The current repeatable validation path remains:

- strict JSON parsing for schemas, catalogues, fixtures, instances, imports, and validator output where emitted;
- schema validation for proof-evidence, evidence-envelope, and validator-report instances when such instances are authored;
- existing fail-closed checks for proof overclaim, provider-mode misuse, environment misuse, missing freshness, stale pass reports, and report/finding contradictions;
- `tools/validate-spec/validate-spec.py all` as the repository-wide advisory validator run;
- `tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD` as the pull-request diff gate.

Later evidence population work must add or extend real-instance validation for authored evidence records. This plan alone does not populate `evidence/`.

## Non-Goals

- No evidence records are created.
- No generated report is committed.
- No proof is re-run or claimed.
- No schema is promoted to `active`.
- No runtime/application code is created or imported.
- No historical source path becomes a USF target path.

## Readiness

This plan satisfies the USF-57 planning boundary when it is committed with passing repository validation. It unblocks later evidence population work by defining the pipeline and schema-field mappings, but it does not make any evidence or readiness claim by itself.
