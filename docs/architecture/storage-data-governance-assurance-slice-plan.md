# Storage And Data Governance Assurance Slice Plan

| | |
|---|---|
| **Document type** | Architecture / storage and data-governance proof-slice plan |
| **Status** | Draft / proof-governance planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-91 |
| **Primary inputs** | `spec/instances/data-migration/identity-schema.json`, `spec/instances/semantic-contract/tenant-identity-record-and-fqdn.json`, `spec/instances/semantic-contract/user-identity-and-tenant-membership.json`, `spec/instances/workflow/authentication-identity-context.json`, `docs/architecture/data-migration-backup-restore-proof-slice-plan.md`, `docs/architecture/proof-tool-contract-standard.md`, `spec/registries/source-import-manifest.json` |

This plan records storage and data-governance assurance for the current authentication proof substrate. It creates no product implementation runtime, imports no React runtime/application code, creates no implementation directory, promotes no schema to `active`, runs no destructive proof, creates no evidence records, and does not start USF-39.

## Purpose

The implementation proof substrate depends on tenant-scoped identity data, not on the full storage platform. The governed data surface must still state ownership, isolation, retention, export, legal hold, deletion, audit, observability, and proof expectations before implementation extraction can rely on data safety claims.

## In-Scope Data Boundary

The in-scope data semantic record is `data.identity-schema`.

It governs:

- identity schema migration order and checksum immutability;
- tenant identity and membership storage semantics;
- row-level or equivalent tenant isolation for membership, tenant resource configuration, user projection, and external identity linkage;
- cross-tenant read and write denial for the authentication proof substrate;
- audit and observability correlation for future data-governance proof;
- proof-gated retention, export, legal hold, deletion, backup, restore, and rollback claims.

## Tenant Isolation And Governance Expectations

The proof-substrate data assurance boundary requires:

- tenant identity data remains tenant-scoped;
- membership must belong to the resolved tenant before session actor projection;
- cross-tenant reads fail closed where tenant isolation is claimed;
- cross-tenant writes fail closed where tenant isolation is claimed;
- system-bypass contexts are not implied by this slice and require separate authorization;
- migration identity is immutable after commit;
- missing migration, backup, restore, export, deletion, legal-hold, audit, or observability evidence fails closed for any claim that depends on it.

## Retention, Export, Legal Hold, And Deletion

Retention, export, legal hold, and deletion request handling are proof-gated for the current slice. This plan records the expectation but does not create proof evidence and does not authorize destructive proof.

Future proof must distinguish:

- data classification and ownership;
- emitted proof output;
- collected evidence;
- audit records;
- observability correlation;
- generated reports, which remain lower authority.

## Explicit Non-Applicability

The following are outside the current authentication proof substrate:

- object storage and signed URL operations;
- tenant storage object lifecycle;
- quota-before-write for object or metered storage;
- billing, metering, and quota enforcement data paths;
- data portability export beyond identity context proof planning;
- production backup, restore, PITR, or disaster-recovery drills;
- destructive deletion proof;
- production-live storage readiness.

Those areas remain deferred until separately represented by semantic contracts, data records, source-use rules, proof evidence, and validation gates.

## Historical Source Treatment

Historical storage and data-governance artefacts are evidence only. Relevant source-import entries include:

- `apps/platform-api/src/db/migrations/001-identity-schema.sql`;
- `apps/platform-api/src/db/migrations/004-rls-policies.sql`;
- `apps/platform-api/src/db/migrations/012-rls-current-user-check.sql`;
- `apps/platform-api/src/db/migrations/016-membership-identity-v2.sql`;
- `apps/platform-api/tests/substrate/postgres-identity-repository.test.ts`;
- `apps/platform-api/tests/substrate/session-fixture.test.ts`;
- `docs/adr/0063-data-governance-and-compliance-architecture.md`;
- `docs/adr/0064-backup-recovery-retention-and-legal-hold-architecture.md`;
- `apps/platform-api/scripts/backup-local-runtime-proof.ts`;
- `scripts/backup/postgres-backup.sh`;
- `scripts/backup/postgres-restore.sh`.

These paths do not define USF implementation authority and must not be mirrored as future implementation paths.

## Proof Expectations

When storage or data-governance behaviour is claimed, the proof plan or proof tool must follow the USF-78 proof-tool contract. For this planning slice:

- provider mode remains `hermetic-mock` unless separately authorised;
- environment remains `hermetic` unless separately authorised;
- observed proof level must not exceed executed evidence;
- freshness must be pinned to the claimed USF commit when evidence is written;
- no live external provider claim is allowed;
- no production-live claim is allowed;
- no destructive proof is allowed without separate explicit authorisation.

Evidence records are created only from executed authorised proof. This plan creates none.

## Required Gates

Every PR changing storage or data-governance assurance semantics must run:

- `python3 tools/validate-spec/validate-spec.py all --json`;
- `python3 tools/validate-spec/validate-spec.py instances --json`;
- `python3 tools/validate-spec/validate-spec.py evidence --json`;
- `python3 tools/validate-spec/validate-spec.py real-instances --json`;
- `python3 tools/validate-spec/validate-spec.py selftest --json`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`.

Changed JSON must parse strictly.

## No-Go Rules

This plan does not authorize:

- USF-39 implementation extraction;
- product runtime/application code;
- `apps/`, `packages/`, `services/`, `src/`, `infra/`, `config/`, or `scripts/` implementation directories;
- React runtime/application code import;
- source-path mirroring;
- schema activation;
- generated reports as authority;
- destructive proof without separate explicit authorization;
- missing collected backup or restore evidence treated as pass;
- live-external-provider or production-live claims from hermetic proof.

## Readiness Effect

When merged with clean validation, this plan and the updated data record satisfy the current tracked USF-91 storage and data-governance assurance slice for the authentication proof substrate. They do not complete deferred storage platform, backup, restore, legal-hold, deletion, quota, or production readiness coverage and do not authorize implementation extraction.
