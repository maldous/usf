# Data Migration Backup Restore Proof Slice Plan

## Status

This planning note is a proof and governance artefact for USF-85. It does not create product implementation runtime, does not start USF-39, does not activate schemas, does not run destructive proof, and does not create proof evidence.

## Purpose

Define the first data, migration, tenant-data, backup, restore, retention, and rollback proof slice for identity schema readiness. Migration order, checksum immutability, backup evidence, restore evidence, tenant isolation, and safe failure handling must be governed before implementation extraction can rely on data safety claims.

## Governed Instance

The in-scope data migration instance is:

- `spec/instances/data-migration/identity-schema.json`

Related semantic instances:

- `spec/instances/semantic-contract/tenant-identity-record-and-fqdn.json`
- `spec/instances/semantic-contract/user-identity-and-tenant-membership.json`
- `spec/instances/workflow/authentication-identity-context.json`

## Historical Source Evidence

Historical React source may be used only as source evidence and design input. It is not future live authority, and its paths do not determine USF implementation paths.

Primary source lineage for this slice:

- `apps/platform-api/src/db/migrations/001-identity-schema.sql`
- `apps/platform-api/src/db/migrations/004-rls-policies.sql`
- `apps/platform-api/src/db/migrations/012-rls-current-user-check.sql`
- `apps/platform-api/src/db/migrations/016-membership-identity-v2.sql`
- `apps/platform-api/tests/substrate/postgres-identity-repository.test.ts`
- `docs/evidence/identity/identity-access-baseline.md`
- `docs/evidence/identity/tenant-identity-membership-v2.md`

## Required Data Behaviours

A future proof execution for this slice must demonstrate:

- Identity schema migration order is stable and recorded.
- Migration checksum identity is immutable after commit.
- Tenant identity data remains isolated for organisations, memberships, tenant resource configuration, users, and external identities.
- Cross-tenant reads fail closed where tenant isolation is claimed.
- Cross-tenant writes fail closed where tenant isolation is claimed.
- Missing migration evidence fails closed for migration readiness.
- Missing collected backup evidence fails closed for backup readiness.
- Missing collected restore evidence fails closed for restore readiness.
- Restore proof must demonstrate collected restore evidence, not merely emitted script output or generated report status.
- Rollback or failure handling must preserve evidence and must not silently discard failed migration or restore observations.

## Backup and Restore Evidence Expectations

This plan creates no backup-evidence or restore-evidence instance because no USF-85 proof was executed in this change.

Future backup or restore evidence instances must preserve both emitted evidence and collected evidence. Collected evidence must be non-empty for any backup or restore readiness claim.

Generated reports are never authority for this slice.

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

## No-Go Rules

- No destructive proof without separate explicit authorisation.
- No product implementation extraction.
- No product runtime code.
- No source-path mirroring.
- No React runtime or application code import.
- No runtime code import without disposition.
- No schema activation.
- No generated report treated as authority.
- No missing collected evidence treated as pass.
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
