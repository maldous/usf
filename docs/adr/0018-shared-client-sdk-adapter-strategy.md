# 0018 Shared Client SDK Adapter Strategy

## Status

Accepted.

## Description

Records the decision that future shared client SDK work is an adapter over USF command, query, validation, auth, cache, retry, idempotency, tenant, permission, offline, audit, and privacy semantics.

## Context

USF needs a shared client strategy before mobile and web implementations can consume common client contracts. Existing shared client semantics and the owner decision baseline define query library, UI state, and offline scope decisions without installing dependencies or creating SDK code.

## Decision

Future shared client SDK work must be a typed adapter over USF semantic contracts. TanStack Query is the preferred query and cache library for future shared TypeScript and web implementation after implementation authority exists, while mobile use remains subject to Expo compatibility and the mobile adapter gate. UI-only state defaults to local component state, route state, and explicit view-model state. USF is not globally offline-first; offline mutation queues are allowed only for capability-specific idempotent command envelopes with retention, purge, conflict, replay, tenant, permission, audit, and proof semantics. This ADR does not authorise SDK implementation or dependency installation.

## Rationale

A shared client SDK can reduce duplication only if it remains downstream of semantic contracts. Explicit query, UI-state, and offline boundaries prevent client libraries from becoming product authority.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/standards-profile.md`
- `docs/architecture/ontology.md`
- `docs/architecture/app-surface-owner-decision-baseline-semantics.json`
- `docs/architecture/shared-client-sdk-semantic-surface.json`
- `docs/architecture/client-state-storage-sync-semantics.json`
- `docs/architecture/generated-client-contract-validation-semantics.json`
- `docs/architecture/generated-ui-view-model-semantics.json`

## Source References

- None.

## Proof References

- None. This ADR records authority decisions and does not assert runtime proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- The shared client SDK is an adapter over USF semantic contracts.
- Client cache and UI state do not define product authority.
- Offline mutation requires capability-specific idempotency, retention, purge, conflict, replay, tenant, permission, audit, and proof semantics.
- Dependency installation remains blocked until implementation authority exists.

## Permitted Changes

- Implement a shared client SDK under a later authorised implementation directive.
- Refine query, cache, view-model, and offline validators as semantic artefacts mature.

## Forbidden Drift

- Do not let a query library define USF command or query semantics.
- Do not treat UI-only state as authoritative platform state.
- Do not claim global offline-first readiness from this ADR.

## Consequences

- Shared client implementation has rank-2 strategy coverage but remains separately gated.
- Query, UI-state, and offline owner decisions are tied to ADR authority.
- Future SDK validators must preserve semantic authority over client library behaviour.

## AI Alignment Rules

- Treat future client SDK code as generated or hand-written adapters over USF contracts. Do not install dependencies or implement the SDK from this ADR alone.
- Agents must not implement runtime code from this ADR alone; a separate authorised implementation directive is required.
- Agents must preserve USF semantic authority above framework, provider, store, SDK, and UI implementation choices.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0018-shared-client-sdk-adapter-strategy.json`
