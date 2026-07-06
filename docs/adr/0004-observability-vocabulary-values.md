# 0004 Observability Vocabulary Values

## Status

Accepted.

## Description

Records the initial controlled observability signal-name and attribute-name vocabulary decision for USF-38.

## Context

`docs/architecture/standards-profile.md` classifies OpenTelemetry-style observability semantic conventions as adapted principles only. USF does not claim OpenTelemetry compliance. The draft `spec/schemas/observability-signal.schema.json` already defines observability signals, and PR #6 activates `observability-signal-names` and `observability-attribute-names` in `spec/vocabularies/vocabulary-catalog.json`.

USF's own source lineage includes operational observability signals, metrics, logs, traces, runtime proof outputs, and Loki/Tempo/Sentry correlation evidence. That evidence is source lineage, not future live authority.

## Decision

USF adopts the initial `observability-signal-names` and `observability-attribute-names` value sets as active, USF-controlled, OpenTelemetry-informed vocabulary sets.

`spec/schemas/observability-signal.schema.json` constrains `name` to `observability-signal-names` and constrains declared `attributes` to `observability-attribute-names`. `tools/validate-spec/validate-spec.py` binds both enums to the vocabulary catalogue.

This decision does not claim OpenTelemetry compliance. OpenTelemetry spellings such as `service.name` remain source notes unless a future ADR adopts them directly.

## Rationale

USF needs a closed, validator-checkable observability vocabulary so arbitrary observability names and attributes are not automatically valid. The selected values cover the initial governed surface already represented by the draft schema and fixtures while leaving exhaustive source import and fuller OpenTelemetry mapping as future work.

## Semantic References

- `docs/architecture/standards-profile.md` section 8
- `docs/architecture/standards-profile.md` section 16
- `spec/vocabularies/vocabulary-catalog.json`
- `spec/schemas/observability-signal.schema.json`

## Source References

- USF's own operational-semantics definitions, held in USF's source-import registry.
- USF's own observability-correlation evidence, held in USF's source-import registry.
- USF's own recorded proof-evidence lineage, held in USF's source-import registry.

## Proof References

- None. This ADR records vocabulary authority and schema binding; runtime proof evidence remains separate.

## Validator References

- `tools/validate-spec/validate-spec.py`
- `tools/validate-spec/manifests/observability-signal.json`

## Invariants

- Observability signal names must be drawn from `observability-signal-names`.
- Declared observability attributes must be drawn from `observability-attribute-names`.
- Arbitrary OpenTelemetry attributes are not automatically valid USF values.
- USF must not claim OpenTelemetry compliance without concrete artefacts and validators that support that claim.

## Permitted Changes

- Expand either value set after exhaustive source import or a later OpenTelemetry mapping decision.
- Add aliases only where the vocabulary schema permits them and the alias values satisfy catalogue rules.
- Add observability drift checks that compare runtime or proof evidence to the controlled vocabulary.

## Forbidden Drift

- Do not accept arbitrary observability names or attributes as canonical values.
- Do not treat OpenTelemetry-inspired names as an OpenTelemetry compliance claim.
- Do not infer provider mode or environment from observability attribute names.
- Do not remove or rename observability semantics as an incidental refactor.

## Consequences

- USF-38 has a recorded decision for the initial active observability value sets.
- Observability fixtures must use canonical signal names and attribute names.
- Full OpenTelemetry mapping remains deferred and may expand or revise the set later.

## AI Alignment Rules

- Agents must treat observability names and attributes as governed vocabulary values.
- Agents must preserve source lineage when expanding the observability vocabulary.
- Agents must avoid OpenTelemetry compliance language unless a later ADR and validator substantiate it.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0004-observability-vocabulary-values.json`
