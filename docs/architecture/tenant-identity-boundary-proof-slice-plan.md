# Tenant Identity Boundary Proof Slice Plan

## Status

This planning note is a proof and governance artefact for USF-80. It does not create product implementation runtime, does not start USF-39, does not activate schemas, and does not create proof evidence.

## Purpose

Define the first tenant and identity boundary proof slice that must be satisfied before implementation extraction can rely on tenant, organisation, identity, membership, and custom-domain boundaries.

## Governed Slice

The slice is bounded to authentication login API, tenant host identity, tenant identity record and FQDN ownership, user identity and tenant membership, authentication identity context workflow, RBAC permission context, and authentication audit/observability linkage.

The proof-substrate semantic instances are:

- `spec/instances/interface-contract/authentication-login-api.json`
- `spec/instances/semantic-contract/tenant-identity-record-and-fqdn.json`
- `spec/instances/semantic-contract/tenant-host-identity-resolution.json`
- `spec/instances/semantic-contract/user-identity-and-tenant-membership.json`
- `spec/instances/semantic-contract/rbac-roles-and-permissions.json`
- `spec/instances/workflow/authentication-identity-context.json`
- `spec/instances/event-contract/authentication-login-audit.json`
- `spec/instances/observability-signal/authentication-login-audit.json`

## Historical Source Evidence

Historical React source may be used only as source evidence and design input. It is not future live authority, and its paths do not determine USF implementation paths.

Primary source lineage for this slice:

- `apps/platform-api/src/db/migrations/004-rls-policies.sql`
- `apps/platform-api/src/db/migrations/012-rls-current-user-check.sql`
- `apps/platform-api/src/db/migrations/016-membership-identity-v2.sql`
- `apps/platform-api/src/ports/identity-repository.ts`
- `apps/platform-api/src/usecases/auth.ts`
- `apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts`
- `apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts`
- `apps/platform-api/tests/substrate/postgres-identity-repository.test.ts`
- `apps/platform-api/tests/substrate/session-fixture.test.ts`
- `apps/platform-api/tests/unit/auth-usecase.test.ts`
- `docs/evidence/auth/custom-domain-auth-origin.md`
- `docs/evidence/identity/identity-access-baseline.md`
- `docs/evidence/identity/keycloak-login-callback.md`
- `docs/evidence/identity/tenant-identity-membership-v2.md`
- `docs/evidence/platform/domain-identity-capability-permutation-review.md`
- `docs/evidence/platform/platform-bedrock-correctness-hardening.md`

## Required Behaviours

Tenant and identity boundary proof must demonstrate these behaviours for the governed slice:

- A known tenant host resolves to the owning tenant context.
- An active owned custom domain resolves to the owning tenant context and callback origin.
- A verified-but-inactive custom domain does not produce a tenant callback origin.
- An unknown, invalid, reserved, disabled, or inactive host fails closed.
- A custom-domain ownership conflict fails closed before proof token, callback, or session material is issued.
- Cross-tenant read access is denied for tenant-scoped membership, tenant resource configuration, user projection, and external identity linkage.
- Cross-tenant write access is denied for tenant-scoped membership, tenant resource configuration, domain ownership, and callback-origin mutation.
- A user with no membership for the resolved tenant cannot be projected as a tenant session actor.
- A user with membership for a different tenant cannot be projected as a tenant session actor for the resolved tenant.
- Denied boundary outcomes remain audit-visible without leaking ownership tokens or treating generated reports as authority.

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

This plan creates no evidence records because no USF-80 proof was executed in this change.

Future evidence for this slice must be written only under authorised evidence paths, must cite the semantic instances above, must cite source-use records for any adapted proof runner logic, and must preserve the distinction between proof scripts, raw collected output, evidence envelopes, and generated reports.

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
