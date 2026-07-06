# 0002 Interface and Event Contract Format

## Status

Accepted.

## Description

Records the contract-format decision for interface and event contracts: USF-native JSON contract artefacts are canonical for this phase, while OpenAPI and AsyncAPI remain adapted principles only.

## Context

`docs/architecture/standards-profile.md` sections 8, 15, and 23 classify OpenAPI-style interface contracts and AsyncAPI-style event contracts as adapted principles with artefact adoption deferred. Draft schemas already exist at `spec/schemas/interface-contract.schema.json` and `spec/schemas/event-contract.schema.json`.

USF needs a recorded decision so future agents do not claim OpenAPI or AsyncAPI compliance from principle alignment alone.

## Decision

USF-native JSON contract artefacts are the canonical contract form for this phase:

- Interface contracts are shaped by `spec/schemas/interface-contract.schema.json`.
- Event contracts are shaped by `spec/schemas/event-contract.schema.json`.
- OpenAPI and AsyncAPI remain adapted principles only.

USF may later generate OpenAPI or AsyncAPI projections from USF-native contracts, or adopt one of those formats directly, but only through a later ADR plus validator changes.

## Rationale

The draft USF schemas already encode the governance envelope, controlled vocabulary bindings, source references, and fail-closed contract fields USF needs now. Adopting OpenAPI or AsyncAPI directly before reconciliation would risk false compliance claims and source-shape-driven contract design.

## Semantic References

- `docs/architecture/standards-profile.md` sections 8, 15, and 23
- `spec/schemas/interface-contract.schema.json`
- `spec/schemas/event-contract.schema.json`
- `spec/vocabularies/vocabulary-catalog.json`

## Source References

- USF's own OpenAPI contract-drift check requirement, held in USF's source-import registry.
- USF's own event-semantics definitions, held in USF's source-import registry.

## Proof References

- None. This ADR records contract format authority; future drift checks and proof evidence remain separate artefacts.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- Contract instances must validate against the USF-native schemas for this phase.
- OpenAPI and AsyncAPI principles may inform structure, but do not define USF contract authority.
- Future OpenAPI or AsyncAPI projections must reconcile back to the USF-native contract artefacts.

## Permitted Changes

- Add drift checks that compare runtime routes or emitted events to USF-native contracts.
- Add generated OpenAPI or AsyncAPI projections if they are explicitly non-authoritative and validator-reconciled.
- Adopt OpenAPI or AsyncAPI as an authoritative artefact form through a later ADR.

## Forbidden Drift

- Do not claim OpenAPI compliance without concrete OpenAPI artefacts and validators.
- Do not claim AsyncAPI compliance without concrete AsyncAPI artefacts and validators.
- Do not infer contracts from handlers or emitters when semantic contracts exist.
- Do not let generated projections override USF-native contracts.

## Consequences

- Interface and event contract work can proceed using the existing schemas.
- External-standard compliance claims remain honest and limited.
- Future drift checks must target USF-native contract artefacts first.

## AI Alignment Rules

- Agents must read USF-native contracts before reasoning from source code.
- Agents must avoid false compliance language.
- Agents must surface any conflict between generated projections and USF-native contracts.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0002-interface-event-contract-format.json`
