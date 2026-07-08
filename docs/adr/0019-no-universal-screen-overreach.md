# 0019 No Universal Screen Overreach

## Status

Accepted.

## Description

Records the decision that USF does not use a universal-screen abstraction that erases platform differences or lets UI structure define product semantics.

## Context

USF supports mobile and web app surfaces, but the Authority Model requires semantics to define product meaning. A universal screen abstraction can hide platform obligations, accessibility differences, store constraints, navigation differences, and proof requirements.

## Decision

USF must not impose a universal-screen abstraction that treats mobile and web screens as identical product authority. Shared semantics may define capabilities, view models, validation, permissions, states, and evidence expectations. Platform adapters may render those semantics differently when the variance is explicit and does not contradict shared authority. This ADR does not authorise UI implementation.

## Rationale

Shared semantics are valuable, but collapsing platform surfaces into one screen model would make implementation structure look canonical and would obscure platform-specific UX, accessibility, release, and proof obligations.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/mobile-adapter-semantic-surface.json`
- `docs/architecture/app-surface-web-adapter-semantics.json`
- `docs/architecture/generated-ui-renderer-composition-semantics.json`
- `docs/architecture/generated-ui-view-model-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- Shared semantics define capability and view-model authority, not universal screen identity.
- Mobile and web adapters may differ where platform semantics require it.
- Platform variance must remain traceable to shared semantics or explicit platform requirements.
- UI implementation remains blocked until implementation gates close.

## Permitted Changes

- Define shared view-model contracts that multiple adapters render differently.
- Add platform-specific UX mappings when backed by semantic authority.

## Forbidden Drift

- Do not create a universal screen layer that overrides platform semantics.
- Do not infer product behaviour from shared UI component shape.
- Do not erase accessibility, navigation, store, or platform proof differences.

## Consequences

- Mobile and web UI work remains semantics-defined but platform-aware.
- Shared view models can exist without becoming universal screen authority.
- Future agents must preserve platform-specific proof and accessibility obligations.

## AI Alignment Rules

- Do not force mobile and web into identical screens. Share semantics and view models where valid, but keep platform renderers and proof obligations explicit.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0019-no-universal-screen-overreach.json`
