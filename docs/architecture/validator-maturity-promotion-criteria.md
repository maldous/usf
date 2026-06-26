# Validator Maturity and Schema Promotion Criteria

| | |
|---|---|
| **Document type** | Architecture / validator maturity planning |
| **Status** | Draft / planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter and Authority Model |
| **Issue scope** | USF-30; defines criteria only |
| **Current state preserved** | `tools/validate-spec/validate-spec.py` remains draft/advisory; all schema registry entries remain `draft` |

This document defines the criteria and governance process for moving the USF validator from advisory maturity toward active enforcement, and for deciding when a draft schema may later be promoted to active. It performs no promotion and changes no schema, registry, taxonomy, vocabulary, evidence, or implementation artefact.

## Purpose

USF currently has draft schemas and a repeatable advisory validator. That is useful, but it is not enough to mark schemas active or treat the validator as the final enforcement authority. Promotion requires documented coverage, real-instance validation, stable failure semantics, and coupled governance updates.

## Governing Rules

- The Charter requires validators to enforce drift control and fail closed on contradiction or ambiguity.
- The Authority Model ranks validators below semantics and ADRs, and above runtime proof, source, historical evidence, and generated reports.
- A validator enforces USF semantics; it does not invent product meaning.
- A schema-valid artefact keeps its existing authority rank. Schema validity does not promote a report, source file, or historical reference.
- `schema-lifecycle-states` defines `active` as existing and validator-checkable.
- The Schema Authoring Standard allows promotion only when the schema file exists, parses as valid JSON Schema, has stable identity, aligns with registry/taxonomy/vocabulary/ontology, has real instance coverage, and can be applied by validators.
- No schema may be marked active solely because synthetic fixtures pass.

## Advisory-to-Active Validator Criteria

The validator may be considered for active maturity only when all criteria below are satisfied and recorded in a later explicit promotion change.

1. Stable rule contract.
   Every blocking/error/advisory finding has a stable rule ID, severity, subject, and message shape. New rules are documented, selftested with planted defects where applicable, and not dependent on prose comments.

2. Full foundational corpus coverage.
   The validator covers schemas, catalogues, registry synchronisation, taxonomy references, vocabulary references, ontology references, fixtures, source import manifests, ADR fixtures, semantic instances, and evidence/report instances when present.

3. Real-instance coverage.
   Authored repository instances are validated separately from synthetic fixtures. The real-instance path validates ADR instances, source/import instances, semantic instances, and evidence/report instances when present.

4. Fail-closed ambiguity handling.
   Missing evidence, stale evidence, unresolved references, unknown controlled values, provider/environment mismatch, schema/registry mismatch, and source import without disposition produce findings rather than silent acceptance.

5. Repeatable CI path.
   CI runs the same committed validator commands reviewers can run locally. CI does not rely on uncommitted local files, generated summaries, or external live providers for foundational validity.

6. Report output governance.
   Validator report output validates against `validator-report.schema.json` before it is trusted as a generated report. A report remains rank 7 and cannot override the underlying findings or evidence.

7. PR diff gate.
   Pull-request validation compares the proposed branch against the correct base and rejects unsafe lifecycle promotion, unexpected tooling changes, broken JSON, or changes outside authorised scope.

8. Negative-control discipline.
   Every high-risk rule class has at least one planted defect or equivalent negative control that proves the rule fires with the expected stable ID.

9. Dependency honesty.
   Validator maturity does not outrun semantics, ADRs, proof/evidence records, or source-import coverage. A missing upstream authority is a blocker, not a reason to weaken the validator.

10. Governance approval.
   Active promotion is performed by a later reviewed change that updates the relevant standards, registry fields, and PR/CI expectations together.

## Draft-to-Active Schema Conditions

A schema may be considered for active lifecycle only when all conditions below hold for that schema.

| Condition | Required evidence before promotion |
|---|---|
| File exists | The registry `path` points to an existing schema file under `spec/schemas/`. |
| Strict JSON | The schema parses as strict JSON and has no comments, trailing commas, or JSON5 syntax. |
| Draft 2020-12 validity | The schema validates against the JSON Schema Draft 2020-12 meta-schema. |
| Stable identity | `$id` uses the `urn:usf:schema:<schema-name>` pattern and does not encode lifecycle state. |
| Registry synchronisation | Registry `id`, `path`, `class`, `family`, `lifecycleState`, `status`, `authorityRole`, taxonomy refs, vocabulary refs, and governed ontology concepts align with the schema. |
| Controlled values | Every vocabulary-backed enum is explicitly bound and matches canonical vocabulary values. |
| Taxonomy and ontology resolution | Taxonomy refs and governed ontology concepts resolve. |
| Closure and required fields | Objects are closed unless explicitly authorised, and required fields are present in properties. |
| Safety invariants | Provider/environment/proof/report/source-import safety rules are enforced where applicable. |
| Positive fixture coverage | Representative valid instances pass. |
| Negative fixture coverage | Representative invalid instances fail for the expected reason. |
| Real-instance coverage | Authored repository instances for the schema validate when present. |
| Reference resolution | Instance references resolve across source/import, ADR, semantic, evidence, and validator-report artefacts where applicable. |
| Reportability | Validator findings and generated reports for the schema can be emitted and validated without changing authority rank. |
| Review record | Promotion is reviewed with an explicit decision trail and no unresolved blockers. |

Promotion is per schema. One schema reaching active conditions does not imply every schema is active.

## Required Real-Instance Validation Coverage

Before any active-promotion decision, the real-instance validation corpus must cover these artefact classes as they are authored:

| Artefact class | Expected repository home | Required validation |
|---|---|---|
| ADR instances | `docs/adr/` plus machine-readable ADR fixtures or future ADR instance home | ADR structure, accepted decision status, semantic refs, source refs, proof refs, validator refs, invariants, forbidden drift, and AI alignment. |
| Source/import instances | `spec/registries/source-import-manifest.json` and future import/disposition records | Import-manifest schema validity, no-loss count, unique source paths, canonical source kind/source role/disposition values, and path safety. |
| Semantic instances | `spec/instances/` | Schema validity, duplicate-ID rejection, reference resolution, controlled values, and no schema promotion. |
| Evidence records | `evidence/` when later populated | Evidence-envelope and proof-evidence schema validity, freshness, provider mode, environment, emitted evidence, collected evidence, and missing/stale fail-closed behaviour. |
| Validator reports | Generated only when requested | Validator-report schema validity, evidence refs, freshness, pass/fail/partial constraints, and generated-report authority rank. |

Synthetic fixtures remain necessary, but they are not a substitute for real-instance coverage.

## Standards and Registry Updates Required Later

A later promotion change must update all affected governance surfaces together.

| Area | Required later update |
|---|---|
| Schema Registry | Change each promoted schema entry from `lifecycleState: draft` to `active` and update `status` consistently. Do this only for schemas that independently satisfy the promotion conditions. |
| Schema Authoring Standard | Amend the maturity notes that currently describe the validator as draft/advisory, and record which active-promotion criteria are now enforced. |
| Standards Profile | Update validator maturity/conformance wording only if the validator actually reaches the stated maturity. |
| ADR canon | Add or update an ADR if the promotion changes governance force, validator authority, or future agent obligations. |
| Validator rules | Ensure active-mode failures are stable, selftested, documented by rule ID, and wired into CI. |
| CI workflow | Make the active validator path mandatory for the relevant branches and pull requests. |
| Real-instance corpus | Keep authored instances current and make missing/invalid instances fail closed where the promoted schema requires them. |
| Evidence/report handling | Preserve generated-report rank and require evidence refs/freshness for reports used in readiness claims. |

## Current Non-Promotion State

This issue records criteria only.

- No schema registry entry is changed.
- No schema `lifecycleState` is changed.
- No schema `status` is changed.
- No validator mode is changed from advisory to active.
- No CI gate is strengthened here.
- No evidence record is created.
- No generated report is committed.
- No implementation/runtime code is created or imported.

## Validation Expectations

The current validation expectation for this planning change is:

- strict JSON parsing of the three foundational catalogues remains clean;
- `tools/validate-spec/validate-spec.py all` returns no findings;
- `tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD` returns no findings;
- git diff shows no lifecycle promotion or evidence population.

## Readiness

This document satisfies the USF-30 planning boundary when committed with passing validation. It names the path to active maturity, but the actual promotion remains gated by later real-instance coverage, evidence population, readiness review, and an explicit promotion change.
