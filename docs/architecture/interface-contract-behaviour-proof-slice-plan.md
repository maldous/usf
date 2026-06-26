# Interface Contract Behaviour Proof Slice Plan

## Status

This planning note is a proof and governance artefact for USF-81. It does not create product implementation runtime, does not start USF-39, does not activate schemas, and does not create proof evidence.

## Purpose

Define the first interface behaviour proof slice for the governed authentication login API contract. Static schema validity is not sufficient for behaviour claims; claimed behaviour must be source-linked, semantically governed, and proven through authorised evidence before it is used for implementation readiness.

## Governed Interface

The in-scope interface contract is:

- `spec/instances/interface-contract/authentication-login-api.json`

Related semantic instances that govern behaviour linkage:

- `spec/instances/semantic-contract/authentication-platform.json`
- `spec/instances/workflow/authentication-login.json`
- `spec/instances/workflow/authentication-identity-context.json`
- `spec/instances/event-contract/authentication-login-audit.json`
- `spec/instances/audit-event/authentication-login.json`
- `spec/instances/observability-signal/authentication-login-audit.json`

## Historical Source Evidence

Historical React source may be used only as source evidence and design input. It is not future live authority, and its paths do not determine USF implementation paths.

Primary source lineage for this slice:

- `docs/api/openapi.json`
- `apps/platform-api/src/server/auth.ts`
- `apps/platform-api/src/server/session.ts`
- `apps/platform-api/src/usecases/auth.ts`
- `apps/platform-api/tests/substrate/auth-routes.test.ts`
- `apps/platform-api/tests/unit/auth-usecase.test.ts`
- `apps/platform-api/scripts/auth-settings-runtime-proof.ts`
- `docs/evidence/identity/keycloak-login-callback.md`
- `docs/evidence/auth/custom-domain-auth-origin.md`

## Required Interface Behaviours

A future behaviour proof for this slice must demonstrate:

- Login initiation accepts only governed provider-selection and callback-state inputs.
- Callback handling validates state binding and redirect origin before session projection.
- Session lookup and logout preserve explicit authenticated, no-session, and logout states.
- Custom-domain callback derivation follows the tenant host identity contract and rejects unsafe origins.
- Denied login, validation failure, provider failure, and absent session remain explicit fail-closed outcomes.
- Raw identity-provider tokens are not exposed through the interface response contract.
- Anonymous login attempt and authenticated session creation permissions remain bounded to this authentication boundary.
- Authentication login audit event semantics are linked to successful and denied outcomes before a proof claim is accepted.
- Workflow transitions in `workflow.authentication-login` and `workflow.authentication-identity-context` are preserved.

## Proof Posture

The proof posture for this issue is plan-only until a later authorised proof execution creates evidence.

Any future proof execution under this plan must follow `docs/architecture/proof-tool-contract-standard.md` and must emit proof evidence plus an evidence envelope only from executed authorised proof.

Required claim shape for an executed hermetic slice:

- providerMode: `hermetic-mock`
- environment: `hermetic`
- proofLevelObserved: `behaviour-proven`
- freshness.stale: `false`
- freshness.commit: current USF commit being claimed
- liveExternalProviderClaim: `false`
- productionLiveClaim: `false`

## Evidence Rules

This plan creates no evidence records because no USF-81 proof was executed in this change.

Future evidence for this slice must cite the governed interface instance, related event/audit/workflow instances, and source-use records for any adapted proof runner logic. Proof scripts, raw collected output, evidence envelopes, and generated reports remain distinct.

Generated reports are never authority for this slice.

## No-Go Rules

- No product implementation extraction.
- No product runtime code.
- No source-path mirroring.
- No React runtime or application code import.
- No runtime code import without disposition.
- No schema activation.
- No generated report treated as authority.
- No hermetic proof upgraded to live-external-provider proof.
- No hermetic proof upgraded to production-live proof.

## Validation

Before merging this planning slice, run:

- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-spec/validate-spec.py instances --json`
- `python3 tools/validate-spec/validate-spec.py evidence --json`
- `python3 tools/validate-spec/validate-spec.py real-instances --json`
- `python3 tools/validate-spec/validate-spec.py selftest --json`
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json`

Strict JSON parse is required for any changed JSON files.
