# 0022 Ads, Monetisation, and Consent Posture

## Status

Accepted.

## Description

Records the decision that the initial app-surface posture is free and non-monetised, with ads, billing, and consent providers blocked until later review and proof gates close.

## Context

USF needs a monetisation and consent posture before app implementation gates can reason about ads, billing, child-directed policy, privacy, and store disclosures. The owner decision baseline records no-ads, no-billing, free app, provider-neutral CMP, and not-child-directed defaults.

## Decision

The initial app-surface posture is free and non-monetised: no ads, no paid app price, no in-app products, and no subscriptions. Consent management remains provider-neutral, and no CMP or UMP provider is selected by default. The app-surface posture is not child-directed and does not target family-program distribution. Ads, billing, CMP, UMP, children/family policy changes, and monetisation require later owner approval, external review where applicable, privacy and consent mapping, validator coverage, and proof evidence. This ADR does not authorise provider setup, SDK integration, billing, ads, or compliance claims.

## Rationale

A no-monetisation default minimises privacy, store policy, consent, and child-directed risk while semantic foundations mature. Provider-neutral consent keeps compliance claims from being inferred before external review and evidence exist.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/monetisation-ad-placement-telemetry-semantics.json`
- `docs/architecture/privacy-compliance-consent-proof-semantics.json`
- `docs/architecture/privacy-disclosure-sdk-vendor-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- Initial posture is free and non-monetised.
- Ads and billing are out of scope until separate gates close.
- Consent provider selection remains blocked until privacy, regional, and external review requirements are satisfied.
- The initial app-surface posture is not child-directed and does not target family-program distribution.

## Permitted Changes

- Introduce monetisation through a later owner decision with privacy, store, consent, validator, and proof backing.
- Select a CMP or UMP provider after provider-specific evidence and external review exist.

## Forbidden Drift

- Do not add ad SDKs, billing SDKs, CMPs, or UMP integrations from this ADR alone.
- Do not claim privacy, child-directed, family-program, store-policy, or legal readiness from this ADR.
- Do not infer consent compliance from provider-neutral semantics.

## Consequences

- Monetisation and consent have rank-2 default posture coverage.
- Ads and privacy implementation gates remain separately blocked.
- Future monetisation changes require deliberate semantic and review updates.

## AI Alignment Rules

- Default to no ads and no billing. Do not integrate monetisation or consent providers, and do not make compliance claims, without later authority and proof.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0022-ads-monetisation-and-consent-posture.json`
