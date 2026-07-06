# Workflow State Machine Proof Slice Plan

## Status

This planning note is a proof and governance artefact for USF-83. It does not create product implementation runtime, does not start USF-39, does not activate schemas, and does not create proof evidence.

## Purpose

Define the first workflow and state-machine behaviour proof slice for authentication login and authentication identity context. Normal transitions, failure transitions, compensation semantics, missing audit, and missing or stale proof evidence must be governed before implementation extraction can rely on workflow readiness claims.

## Governed Workflows

The in-scope workflow instances are:

- `spec/instances/workflow/authentication-login.json`
- `spec/instances/workflow/authentication-identity-context.json`

Related semantic instances:

- `spec/instances/interface-contract/authentication-login-api.json`
- `spec/instances/event-contract/authentication-login-audit.json`
- `spec/instances/audit-event/authentication-login.json`
- `spec/instances/observability-signal/authentication-login-audit.json`
- `spec/instances/semantic-contract/authentication-platform.json`
- `spec/instances/semantic-contract/tenant-host-identity-resolution.json`
- `spec/instances/semantic-contract/user-identity-and-tenant-membership.json`
- `spec/instances/semantic-contract/rbac-roles-and-permissions.json`

## Historical Source Evidence

Historical source-lineage source may be used only as source evidence and design input. It is not future live authority, and its paths do not determine USF implementation paths.

Primary source lineage for this slice:

- `apps/platform-api/scripts/auth-settings-runtime-proof.ts`
- `apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts`
- `apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts`
- `apps/platform-api/src/server/auth.ts`
- `apps/platform-api/src/server/session.ts`
- `apps/platform-api/src/usecases/auth.ts`
- `apps/platform-api/src/server/authorize-resource.ts`
- `apps/platform-api/tests/substrate/auth-routes.test.ts`
- `apps/platform-api/tests/unit/auth-settings-audit.test.ts`
- `apps/platform-api/tests/unit/auth-usecase.test.ts`
- `docs/evidence/identity/keycloak-login-callback.md`

## Required Workflow Behaviours

A future proof execution for this slice must demonstrate:

- Login request validation moves unauthenticated state to authenticating only when required request state is present.
- Accepted provider decision and session creation move authenticating state to authenticated.
- Denied provider decision, validation failure, missing session, missing tenant context, or missing membership move to denied.
- Session creation is rejected when provider decision, tenant identity, or membership state is missing or contradictory.
- Permission-context readiness is rejected when membership projection is absent or belongs to another tenant.
- Audit recording occurs before any proof success claim that depends on audit coverage.
- Missing audit evidence fails workflow readiness where audit coverage is claimed.
- Missing or stale proof evidence fails workflow readiness.
- Compensation for denied or illegal transitions is explicit denial with audit and evidence failure preserved, not silent retry or state repair.

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

This plan creates no evidence records because no USF-83 proof was executed in this change.

Future evidence for this slice must cite the governed workflow instances above and must preserve raw collected workflow observations separately from proof evidence, evidence envelopes, and generated reports.

Generated reports are never authority for this slice.

## No-Go Rules

- No product implementation extraction.
- No product runtime code.
- No source-path mirroring.
- No source-lineage runtime or application code import.
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
