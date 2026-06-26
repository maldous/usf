# 0003 Capability Domain Values

## Status

Accepted.

## Description

Records the capability-domain value-set decision and the choice to carry all 14 category values observed in the current historical source evidence.

## Context

`spec/vocabularies/vocabulary-catalog.json` previously deferred the `capability-domains` value set and described the historical capability category dimension as a 12-category source input.

The current source file `../react/docs/v2-foundation/v1-capability-closure.json` contains 75 capability records across 14 observed category values:

- `authentication`
- `compute-runtime`
- `configuration`
- `data-platform`
- `developer-platform`
- `entitlements-billing`
- `events-workflow`
- `foundation`
- `identity-access`
- `observability-ops`
- `search`
- `security-governance`
- `storage`
- `support-admin`

The observed source set includes `storage` and `support-admin`, so silently keeping a 12-value set would lose source lineage.

## Decision

USF adopts the 14 observed category values as the active canonical `capability-domains` value set.

`spec/schemas/semantic-contract.schema.json` constrains `capabilityDomain` to this value set, and `tools/validate-spec/validate-spec.py` binds that enum to the vocabulary catalogue.

## Rationale

The source file is historical evidence, not future authority, but no source category should disappear without disposition. Carrying the observed 14 values as canonical USF vocabulary preserves the source dimension while making the values explicit, reviewable, and validator-checkable.

## Semantic References

- `spec/vocabularies/vocabulary-catalog.json`
- `spec/schemas/semantic-contract.schema.json`
- `docs/architecture/ontology.md` section 5.2

## Source References

- `../react/docs/v2-foundation/v1-capability-closure.json`

## Proof References

- None. This ADR records vocabulary classification authority; runtime proof evidence is not asserted.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- `capabilityDomain` values must be drawn from `capability-domains`.
- Historical source labels are lineage only; canonical values live in the vocabulary catalogue.
- No observed source category may be dropped without a recorded disposition.

## Permitted Changes

- Add aliases if later source import finds divergent labels.
- Split, merge, rename, or retire a domain only through vocabulary and validator changes with recorded rationale.

## Forbidden Drift

- Do not use capability domains as a miscellaneous bucket.
- Do not invent free-text capability domains in semantic-contract instances.
- Do not treat source category labels outside the vocabulary as canonical values.
- Do not collapse `authentication` into `identity-access` without a later recorded decision.

## Consequences

- `capability-domains` is no longer deferred.
- Semantic-contract fixtures must use canonical capability-domain values.
- Future capability imports can validate their domain values repeatably.

## AI Alignment Rules

- Agents must preserve source lineage when classifying capabilities.
- Agents must not infer capability domains from paths or package names.
- Agents must stop or record a decision if source category evidence conflicts with the vocabulary.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0003-capability-domain-values.json`
