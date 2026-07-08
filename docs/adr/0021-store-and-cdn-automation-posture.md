# 0021 Store and CDN Automation Posture

## Status

Accepted.

## Description

Records the decision that store provisioning, mobile build submission, and CDN deployment are automation-planned but blocked from execution until account, credential, provider, proof, and owner-approval gates close.

## Context

USF needs release automation semantics for mobile stores and web CDN deployment, but account ownership, credentials, provider selection, release authority, and deployment proof must remain separate from planning artefacts.

## Decision

USF may plan automated store provisioning, EAS-first mobile build and submit flows, and provider-neutral CDN deployment flows. Execution remains blocked until owner-controlled account authority, credential custody, provider selection, validator coverage, proof evidence, and explicit human release approval exist. Agents must not create accounts, credentials, DNS changes, builds, submissions, or deployments from this ADR alone.

## Rationale

Automation can make releases auditable, but release authority and credentials are high-risk external controls. Keeping automation semantics separate from execution protects USF from false readiness and unauthorised external mutations.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/app-surface-release-provisioning-semantics.json`
- `docs/architecture/app-surface-store-provisioning-semantics.json`
- `docs/architecture/app-surface-web-cdn-release-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- Store accounts and release authority remain owner-controlled.
- EAS is the preferred mobile build and submit path only after implementation authority exists.
- CDN provider selection remains separately gated.
- No external account, credential, store, DNS, build, submission, or deployment mutation is authorised by this ADR.

## Permitted Changes

- Define release automation validators and evidence envelopes under later authorised work.
- Select concrete store and CDN provider workflows after gates close.

## Forbidden Drift

- Do not create or mutate external provider accounts from semantic planning.
- Do not treat automated release scripts as release authority.
- Do not claim store, CDN, live-provider, or production readiness from this ADR.

## Consequences

- Store and CDN automation have rank-2 posture coverage.
- Implementation-ready gates still need account, credential, provider, proof, and owner approval evidence.
- Agents have explicit stop conditions for release-related external mutations.

## AI Alignment Rules

- Plan release automation only as semantics until explicit gates close. Never create credentials, accounts, DNS changes, store submissions, builds, or deployments from this ADR alone.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0021-store-and-cdn-automation-posture.json`
