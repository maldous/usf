# 0020 Platform UX Behind Shared Semantics

## Status

Accepted.

## Description

Records the decision that platform-specific UX variance is permitted only behind shared USF semantics and explicit platform requirements.

## Context

USF needs mobile and web surfaces that can feel native while staying governed by common platform semantics. The mobile and web adapter artefacts allow platform-specific differences but require capability, permission, validation, accessibility, privacy, and proof mapping.

## Decision

Platform-specific UX variance is allowed only when the underlying capability, permission, validation, privacy, audit, state, and proof semantics remain shared or explicitly mapped. Native mobile affordances, web affordances, navigation differences, accessibility adaptations, and store or browser constraints must not create new product semantics. This ADR does not authorise UI implementation.

## Rationale

Users expect native-feeling surfaces, but USF cannot let surface-specific UI choices redefine platform meaning. Keeping variance behind semantics preserves adaptability without implementation-defined drift.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/mobile-adapter-semantic-surface.json`
- `docs/architecture/app-surface-web-adapter-semantics.json`
- `docs/architecture/app-surface-accessibility-semantics.json`
- `docs/architecture/app-surface-i18n-localisation-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- Platform UX differences must map to shared or explicit platform semantics.
- UI affordances do not create product authority.
- Accessibility, localisation, privacy, audit, and proof requirements remain enforceable across adapters.
- Implementation remains blocked until the relevant gate closes.

## Permitted Changes

- Define platform-specific component mappings under shared semantic contracts.
- Add platform-specific accessibility or navigation requirements when semantically backed.

## Forbidden Drift

- Do not let mobile-only or web-only UI behaviour create ungoverned semantics.
- Do not bypass shared permission, privacy, validation, or audit semantics for UX convenience.
- Do not claim accessibility or localisation readiness from this ADR alone.

## Consequences

- Platform adapters can be high-quality without weakening USF semantic authority.
- Future design and implementation work must keep semantic traceability visible.
- Accessibility and localisation remain explicit gates, not implied UI qualities.

## AI Alignment Rules

- When designing app surfaces, keep product meaning in USF semantics and use platform-specific UX only as a traceable adapter choice.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0020-platform-ux-behind-shared-semantics.json`
