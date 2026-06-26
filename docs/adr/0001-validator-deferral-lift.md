# 0001 Validator Deferral Lift

## Status

Accepted.

## Description

Records the decision that draft schema files and the draft/advisory spec validator may exist before active validator maturity, without promoting any schema to active.

## Context

PR 2, merged at commit `801bec0`, authored the 23 JSON Schema files at draft lifecycle and added the draft/advisory `tools/validate-spec/` validator ahead of active validator maturity.

This lifts the original validator deferral only for draft/advisory governance checks. It is grounded in `docs/architecture/schema-authoring-standard.md` section 26 Amendment A, `docs/architecture/standards-profile.md` section 23 Amendment, `docs/architecture/directory-and-file-naming-standard.md` section 6.E.1, and `spec/schemas/adr.schema.json`.

## Decision

USF records that the 23 schema files may exist at draft lifecycle and that the draft/advisory validator may validate schemas, catalogues, fixtures, registry alignment, enum bindings, import manifests, and safety checks before active validator maturity.

The `jsonschema==4.10.3` package is selected for this phase only. This does not promote any schema to active.

## Rationale

Draft schemas and an advisory validator make later work repeatable and reviewable without claiming release-blocking validator maturity.

## Semantic References

- `docs/architecture/schema-authoring-standard.md` section 26 Amendment A
- `docs/architecture/standards-profile.md` section 23 Amendment
- `docs/architecture/directory-and-file-naming-standard.md` section 6.E.1
- `spec/schemas/adr.schema.json`

## Source References

- PR 2 merged commit `801bec0`

## Proof References

- None. This ADR records governance and validator maturity; it does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`
- `.github/workflows/validate-spec.yml`

## Invariants

- No schema is active unless the schema file exists, parses as JSON Schema, and is validator-checkable under an explicit promotion decision.
- The current validator remains draft/advisory until a later decision promotes its maturity.
- Validator output must not overclaim proof or readiness.
- `jsonschema==4.10.3` is a phase selection, not a permanent tooling mandate.

## Permitted Changes

- Add validator rules that enforce existing USF semantics.
- Add schema fixtures that demonstrate positive and negative validation behaviour.
- Replace the validator package in a later ADR or validator decision if compatibility requires it.

## Forbidden Drift

- Do not mark draft schemas active because the draft/advisory validator can read them.
- Do not treat advisory validation as runtime proof evidence.
- Do not weaken schema or validator checks to make a branch pass.
- Do not import runtime/application code as part of this validator lift.

## Consequences

- Future schema and vocabulary work can be checked through a committed, repeatable path.
- Active schema promotion remains deferred.
- Validator maturity and release-blocking status remain separate future work.

## AI Alignment Rules

- Agents must run and report the actual validator commands used.
- Agents must not claim validation that did not run.
- Agents must treat generated validator reports as lower authority than the artefacts and evidence they summarize.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0001-validator-deferral-lift.json`
