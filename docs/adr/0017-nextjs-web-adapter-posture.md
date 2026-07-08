# 0017 Next.js Web Adapter Posture

## Status

Accepted.

## Description

Records the decision that Next.js is the web adapter framework posture while deployment providers remain provider-neutral until a separate CDN/provider gate closes.

## Context

USF needs a web app-surface posture before web implementation gates can be evaluated. The web adapter and CDN semantics define route, mutation, cache, provider, deployment, and proof requirements without selecting a provider or creating implementation code.

## Decision

USF uses Next.js as the planned web adapter framework posture. Next.js routes, mutations, cache behaviour, middleware, metadata, and component boundaries are adapters over USF semantics and do not create product authority. Deployment remains provider-neutral until the CDN/provider gate selects a provider with proof for runtime support, secrets handling, rollback, logs, data residency, and owner approval. This ADR does not authorise routes, deployment, provider setup, credentials, or readiness claims.

## Rationale

Next.js gives a strong web adapter model while USF preserves semantic authority above framework structure. Provider-neutral deployment prevents a hosting platform from becoming semantic authority by accident.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/app-surface-web-adapter-semantics.json`
- `docs/architecture/app-surface-web-cdn-release-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- Next.js framework structure does not define USF product semantics.
- Routes and mutations must map to USF capability authority.
- Deployment providers remain non-canonical until a provider gate closes.
- CDN readiness and production readiness are not implied by this ADR.

## Permitted Changes

- Add Next.js route and component mappings under a later implementation directive.
- Select a concrete provider only through a separate provider gate and proof process.

## Forbidden Drift

- Do not infer product semantics from Next.js file or route structure.
- Do not deploy from this ADR alone.
- Do not claim CDN, live-provider, or production readiness from this ADR.

## Consequences

- Future web work has rank-2 ADR coverage for the Next.js adapter posture.
- Provider and CDN decisions remain separately gated.
- Web implementation requires its own implementation-ready gate closure.

## AI Alignment Rules

- Use Next.js only as a web adapter over USF semantics. Do not create routes, deploy, configure providers, or claim readiness from this ADR alone.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0017-nextjs-web-adapter-posture.json`
