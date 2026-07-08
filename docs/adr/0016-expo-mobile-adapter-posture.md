# 0016 Expo Mobile Adapter Posture

## Status

Accepted.

## Description

Records the decision that Expo managed configuration with CNG or prebuild is the preferred USF mobile adapter posture, with bare native project ownership reserved for explicit exceptions.

## Context

USF needs a mobile app-surface posture before future mobile implementation gates can be evaluated. The mobile adapter semantics and owner decision baseline define Expo planning, CNG preference, native bridge constraints, release proof expectations, and non-claims. Linear issue USF-332 tracks the ADR set only and does not define authority.

## Decision

USF uses Expo managed configuration with CNG or prebuild as the preferred mobile adapter posture. Bare native project ownership is an exception path only when a USF semantic requirement, security requirement, native capability requirement, or proof requirement cannot be satisfied through the managed CNG path. This ADR does not authorise native project generation, dependency installation, store provisioning, credential setup, implementation, or readiness claims.

## Rationale

Expo managed CNG keeps native configuration explicit and reviewable while preserving a path to platform-specific native capability proof. Making bare native exceptional avoids implementation-shaped drift before semantic gates close.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/mobile-adapter-semantic-surface.json`
- `docs/architecture/mobile-adapter-release-compliance-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- Expo managed CNG or prebuild is the default mobile adapter posture.
- Bare native ownership requires explicit semantic, security, native capability, or proof justification.
- Mobile implementation remains blocked until the relevant implementation gate closes.
- Store readiness and production readiness are not implied by this ADR.

## Permitted Changes

- Add Expo-specific semantic mappings and validators under a later authorised directive.
- Record a bare-native exception through a superseding or companion ADR if a proof-backed need emerges.

## Forbidden Drift

- Do not generate native projects from this ADR alone.
- Do not treat bare native as the default mobile posture.
- Do not claim App Store, Google Play, live-provider, or production readiness from this ADR.

## Consequences

- Future Expo work has rank-2 ADR coverage for the mobile adapter posture.
- The Expo implementation-ready gate still requires its own closure and proof checks.
- Native capability exceptions must be made explicit before implementation.

## AI Alignment Rules

- Use Expo managed CNG as the default mobile planning posture. Do not create implementation code, native projects, credentials, or store submissions from this ADR alone.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0016-expo-mobile-adapter-posture.json`
