# Bootstrap Readiness Governance

| | |
|---|---|
| **Document type** | Architecture / bootstrap readiness governance |
| **Status** | Draft / READY_FOR_V2_BOOTSTRAP bootstrap-gate input |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, and runtime proof evidence |
| **Issue scope** | USF-100, USF-98, USF-117, USF-73, USF-99, USF-39 |
| **Primary inputs** | `.codex/goals/v2-bootstrap.md`, `docs/architecture/implementation-extraction-directive.md`, `docs/architecture/target-implementation-topology-plan.md`, `docs/architecture/semantic-source-use-closure-ledger.md`, `docs/architecture/react-l5-equivalence-audit.md`, `spec/instances/bootstrap-mapping/`, `tools/validate-bootstrap/validate-bootstrap.py` |

This record captures the human bootstrap decisions that must be true before a future `v2-bootstrap` marker may be placed. ADR 0009 (`docs/adr/0009-bootstrap-readiness-marker-and-dev-test-boundary.md`) records the normative marker and dev/test boundary decision; this document remains the detailed bootstrap governance record constrained by that ADR. It is governance only. It creates no implementation directory, runtime file, Compose file, migration file, seed fixture, package scaffold, OpenAPI skeleton, adapter stub, or generated TypeScript runtime. It does not start USF-39, sign USF-100, or claim production readiness.

As of the current repository state, bootstrap marker readiness is `READY_FOR_V2_BOOTSTRAP` when evaluated on `main` with passing validators and the matching immutable proof-anchor tag for that commit. This is not complete one-pass implementation readiness. Complete one-pass implementation readiness remains NO-GO, and USF-39 remains Backlog until a signed USF-100 directive and a separate USF-39 start action exist.

Linear comments may track these decisions, but Linear is not USF semantic authority. This repository record and its validator coverage are the authoritative bootstrap decision carrier until a later accepted ADR or signed directive supersedes it.

## Bootstrap Marker Policy

The `v2-bootstrap` tag is a movable human-friendly marker. It may point to `main` only when governance, source-use, topology, proof gates, and bootstrap validators are ready to begin V2 generation later.

The `v2-bootstrap` tag is not production readiness, not implementation completion, not USF-39 start authority, and not a substitute for immutable proof/evidence anchors. Every accepted bootstrap candidate must also have immutable proof/evidence anchors such as proof-anchor tags and their backing CI attestation or equivalent accepted carrier.

Moving `v2-bootstrap` must be explained in repository evidence and tracker comments. If blockers are discovered, do not create, move, or rely on the marker until those blockers are resolved. After `v2-bootstrap`, stop: implementation still requires separate planning, authorisation, branch, PR, review, validation, and proof. USF-39 remains Backlog until the signed USF-100 directive and a separate USF-39 start action exist.

## Scope Boundary

Bootstrap readiness is all slices, not scoped to a single capability domain. It covers the current semantic-contract corpus and the canonical bootstrap mappings under `spec/instances/bootstrap-mapping/`.

Allowed before the marker:

- governance documents;
- ADRs when explicitly authorised;
- readiness and blocker records;
- semantic, source-use, equivalence, topology, and bootstrap mappings;
- JSON Schemas for governance mappings;
- generated indexes and Markdown summaries where the source JSON remains authoritative;
- `tools/validate-bootstrap`;
- validator selftests and planted defects;
- Linear and GitHub tracking updates.

Forbidden before the marker:

- V2 runtime files;
- V2 package or workspace scaffold;
- implementation roots such as `apps/`, `capabilities/`, `adapters/`, `packages/`, or `tests/`;
- V2 Compose files;
- V2 Makefile or CI implementation scaffold;
- baseline migration files;
- seed fixtures;
- OpenAPI skeletons;
- adapter stubs;
- domain or business implementation;
- generated V2 TypeScript runtime.

Future target paths recorded in bootstrap mappings are governance strings only. They do not create directories and must not be treated as source implementation.

## Future Implementation Target

When separately authorised after bootstrap, implementation targets:

- dev environment using in-memory providers;
- test environment using Docker Compose OSS providers;
- fully locally testable dev/test proof ladder;
- no staging, production, live-external-provider, deployment, or production-live readiness in the first bootstrap implementation scope.

The intended later top-level structure is recorded as target topology only:

- `apps/`
- `capabilities/`
- `adapters/`
- `packages/`
- `tests/`

The intended later layout is:

- `apps/api`
- `apps/work`
- `capabilities/auth`
- `capabilities/tenant`
- `capabilities/audit`
- `capabilities/notify`
- `capabilities/files`
- `capabilities/jobs`
- `capabilities/config`
- `adapters/db`
- `adapters/idp`
- `adapters/store`
- `adapters/bus`
- `adapters/wf`
- `adapters/mail`
- `adapters/secrets`
- `adapters/obs`
- `packages/core`
- `packages/ports`
- `packages/contracts`
- `packages/openapi`
- `packages/test`
- `packages/proof`
- `packages/source`
- `tests/{apps,capabilities,adapters,packages}`

These are not authorised paths yet. They are planned future topology names only. They must be created only after the signed directive, per-slice topology gate, source-use disposition coverage, and validator gates authorise them.

## Tenant Isolation and Security Controls

Tenant isolation is mandatory. Future implementation must enforce tenant isolation at both the application layer and the database layer.

Application-layer rules:

- token-first tenant context;
- dev mocked IDP issues equivalent tenant-bearing claims;
- test Keycloak issues tenant-bearing OIDC claims;
- every tenant-scoped action derives tenant context from authenticated identity claims;
- any tenant in route, header, query, or body must match authenticated tenant context;
- tenant mismatch fails closed;
- application-owned RBAC and ABAC authorization;
- Keycloak is identity, not the sole authorization system;
- policies and assignments are stored in Postgres;
- all tenant-scoped actions are audited.

Postgres RLS rules:

- Postgres RLS enforces tenant isolation;
- transaction-scoped Postgres session variables such as `SET LOCAL` bind tenant, user, and security context;
- every tenant-scoped DB operation runs in an explicit transaction;
- RLS policies read `current_setting('app.tenant_id')` or an equivalent governed setting;
- missing tenant context fails closed;
- mismatched tenant context fails closed;
- pooled connection leakage must be tested;
- the app DB role must not be superuser;
- the app DB role must not have `BYPASSRLS`;
- the app DB role must not own tenant-scoped tables;
- tenant-scoped tables must use `ENABLE ROW LEVEL SECURITY`;
- tenant-scoped tables must use `FORCE ROW LEVEL SECURITY` unless formally excepted;
- dedicated per-tenant DB roles are deferred as an optional future high-assurance deployment profile.

Persistent objects must be classified before migrations or storage implementation are created. The required classifications are:

- tenant-scoped;
- global reference;
- system-internal;
- cross-tenant aggregate;
- audit/evidence;
- migration/control-plane.

Unclassified persistent objects fail validation.

## Break-Glass Controls

Controlled break-glass is allowed because React L6 proved a break-glass posture, but V2 must freshly define and prove its own model.

Break-glass requirements:

- two-person JIT approval;
- requester cannot approve their own access;
- approval required before access starts;
- reason, scope, tenant/resource boundary, expiry, requester, and approver recorded;
- access auto-expires;
- all actions audited;
- no permanent cross-tenant human access;
- no silent admin bypass;
- break-glass must be RLS-aware scoped elevation;
- break-glass must not disable RLS;
- approved grants stored in Postgres;
- grants bound to actor, tenant/resource scope, reason, approver, and expiry;
- RLS policies check active approved grants;
- access outside grant fails closed;
- no `BYPASSRLS`, no superuser, no permanent elevated DB role, and no app-only tenant bypass.

These controls are ISO 27001-supporting technical control evidence only. They are not an ISO 27001 certification claim.

## System Jobs and Cross-Tenant Aggregates

System jobs use tenant-by-tenant service execution. Orchestration may be cross-tenant, but tenant-scoped data access must execute under concrete tenant context. There is no global tenant bypass.

Each tenant operation sets RLS context and is audited. Cross-tenant aggregates require explicit classification and non-leakage proof.

## Provider Targets

Dev provider targets:

- in-memory IDP;
- in-memory event/workflow providers;
- in-memory object storage;
- in-memory secrets/config;
- in-memory, captured, no-op, or local console telemetry;
- in-memory notification providers.

Test Compose OSS provider targets:

- Keycloak for OIDC;
- NATS for event bus;
- Temporal for workflow orchestration;
- MinIO for S3-compatible object storage;
- OpenBao for secrets/config;
- OpenTelemetry Collector;
- Prometheus;
- Grafana;
- Loki or equivalent logs;
- Tempo or equivalent traces;
- Mailpit for email;
- webhook sink/sync provider;
- other OSS-compatible local providers where notification channels are semantically in scope;
- Postgres as canonical database;
- append-only Postgres audit ledger as canonical audit/evidence store.

Rules:

- no in-memory providers in test;
- standard OSS services only in Compose;
- React L6 Compose is source/proof lineage and baseline inventory, but V2 Compose must be freshly authored later;
- carry forward equivalent OSS services where they support non-UI semantic ports or proof;
- exclude UI-only, deprecated, not-applicable, secrets/caches/local state, staging, production, and live-only services.

## Migration and Data Targets

React final proven schema lineage informs a fresh V2 `0001` SQL baseline. No migration file is created before bootstrap.

Migration and data rules:

- include deterministic seed/reference data for local dev/test proof after implementation is authorised;
- no real tenant, customer, or user data migration in first V2 readiness;
- SQL migrations are authoritative;
- Kysely is adapter-only;
- DB types are generated from real migrated Compose/Postgres schema;
- deterministic generated DB types are committed when authorised;
- stale generated DB types fail verification;
- after the V2 `0001` baseline is committed and anchored, migrations are immutable and forward-only;
- edits to committed migrations fail verification;
- destructive changes require expand/contract or documented data-safety proof;
- migration order and checksums must be verified;
- fixtures are synthetic deterministic data only;
- no copied React production/customer data.

## Supply-Chain and Verification Targets

Future implementation must:

- commit a pnpm lockfile;
- pin Node and pnpm versions;
- pin Docker images by version and preferably digest where practical;
- use no floating `latest` images for critical runtime services;
- generate an SBOM or dependency inventory;
- run dependency, license, and security checks where locally available;
- make future `make verify` fail on lockfile drift or unpinned critical runtime images;
- ensure CI mirrors future `make verify`;
- prevent any weaker CI path from claiming V2 readiness.

## Required Bootstrap Validator Coverage

`tools/validate-bootstrap` must fail closed when:

- this decision record is missing;
- the record omits the `v2-bootstrap` marker policy;
- the record treats the marker as production readiness, implementation completion, or USF-39 start authority;
- the record omits immutable proof/evidence anchors;
- the record omits USF-39 Backlog and separate-start boundaries;
- tenant isolation, Postgres RLS, `SET LOCAL`, `current_setting('app.tenant_id')`, `BYPASSRLS`, and `FORCE ROW LEVEL SECURITY` controls are missing;
- break-glass two-person JIT approval, requester/approver separation, and RLS-aware scoped elevation are missing;
- dev in-memory providers or test Compose OSS providers are missing;
- staging, production, live-external-provider, and production-live proof are not explicitly deferred;
- persistent object classifications are missing;
- migration, seed, supply-chain, or verification targets are omitted.

## Readiness Verdict

Bootstrap marker readiness is `READY_FOR_V2_BOOTSTRAP`.

This readiness is limited to placing or moving the human-friendly `v2-bootstrap` marker after validation passes on `main` and the commit has the required immutable proof/evidence anchors. It is not implementation readiness, production readiness, live-external-provider readiness, deployment readiness, or USF-39 start authority. After the marker is placed, stop: implementation still requires separate planning, authorisation, branch, PR, review, validation, proof, a signed USF-100 directive, and a separate USF-39 start action.
