# 0023 Internationalisation and Accessibility Baseline

## Status

Accepted.

## Description

Records the decision that app surfaces must support internationalisation and accessibility semantics from the foundation, while public launch locale and accessibility readiness claims remain separately gated.

## Context

USF needs i18n and accessibility posture before app implementation. Existing semantics define localisation, locale fallback, validation messaging, RTL and bidirectional layout, accessibility semantics, and store text constraints, while owner decisions define en-US and en-AU as planning profiles only.

## Decision

USF app surfaces must preserve internationalisation and accessibility semantics from the foundation. The initial localisation planning baseline is English with en-US and en-AU locale profiles, but this is not public launch approval. Accessibility semantics, keyboard and screen-reader support, contrast, reduced motion, validation messaging, store text, privacy text, and terms text require explicit semantic mapping and proof before readiness can be claimed. This ADR does not authorise translation production, legal-text approval, accessibility certification, store-listing readiness, or launch readiness.

## Rationale

Internationalisation and accessibility are cheaper and safer when treated as foundation semantics rather than late UI cleanup. Separating planning locales from launch approval prevents false regional, legal, and store-readiness claims.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/app-surface-i18n-localisation-semantics.json`
- `docs/architecture/app-surface-accessibility-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- I18n and accessibility requirements must be mapped before implementation readiness claims.
- en-US and en-AU are planning profiles only and do not authorise public launch.
- Legal text, privacy text, store listing, and accessibility readiness claims require separate proof and review.
- Platform-specific UX must preserve accessibility and localisation semantics.

## Permitted Changes

- Add additional locale profiles after semantic and review requirements are satisfied.
- Add accessibility validators and proof evidence under later authorised work.

## Forbidden Drift

- Do not hard-code user-facing strings without localisation semantics.
- Do not claim accessibility compliance from design intent alone.
- Do not treat planning locales as public launch approval.

## Consequences

- I18n and accessibility have rank-2 baseline posture coverage.
- Future UI work must preserve locale, message, and accessibility mapping.
- Readiness claims remain gated by proof and review.

## AI Alignment Rules

- Build future app surfaces with i18n and accessibility semantics from the start, but do not claim public locale, legal-text, store, or accessibility readiness without proof.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0023-i18n-accessibility-baseline.json`
