/goal Start USF-39 V2 bootstrap implementation from the signed, validated V2 bootstrap point. This prompt is the separate explicit USF-39 start action when issued by Matthew Aldous.

# USF V2 Bootstrap Goal

Repository: `maldous/usf`
Related lineage repository: `../react`
Primary tracker: Linear `USF-39`
Accepted directive: Linear `USF-100`, signed and Done
Expected model: GPT-5.5 xhigh fast
Operating mode: long-running, complete, self-validating bootstrap attempt

## 0. Non-negotiable outcome

Complete the V2 local dev/test bootstrap in one coherent pass if possible.

This is no longer a governance-only readiness pass. USF-100 is signed and accepted. The previous governance/foundation gates are green. This prompt is the human's separate USF-39 start action, subject to the immediate preflight and revalidation below.

The desired outcome is a working V2 bootstrap implementation with:

- modern TypeScript/Node monorepo scaffold;
- dev in-memory providers;
- test Docker Compose OSS provider substrate;
- Fastify API edge and committed OpenAPI contract;
- TypeBox / JSON Schema request and response validation;
- SQL-first Postgres migrations and Kysely DB-adapter usage;
- generated DB types from the migrated local Compose/Postgres schema where deterministic;
- tenant isolation at application and database layers;
- RLS and break-glass controls encoded and tested;
- audit/evidence handling and proof posture preserved;
- `make verify` or an equivalent one-command local/CI gate;
- validation/proof evidence sufficient to open a PR only when bootstrap has actually succeeded.

Do not report success unless the resulting branch is locally self-validating and ready for review.

## 1. Current authoritative state to verify

Known latest completed readiness sequence:

- PR #83 recorded `READY_FOR_V2_BOOTSTRAP` marker readiness.
- PR #84 finalized React L5 equivalence rollup and reduced blockers.
- PR #85 signed/accepted USF-100 and transitioned bootstrap validation so signed USF-100 is valid while USF-39 remains separately gated.
- PR #86 recorded final pre-extraction revalidation at the signed USF-100 point `f30f09f`.
- `v2-bootstrap` is expected to point at `f30f09fe6ccab8a72511f73c155a3fe1f05fc3a8` unless later moved after an exact-head revalidation.
- `proof-anchor-f30f09f` is expected to exist.
- USF-100 is Done.
- USF-39 is Backlog until this prompt passes preflight and records the separate start action.

Before any implementation change, verify the actual current state. Do not rely on memory.

Run:

```bash
git fetch origin --tags --force
git checkout main
git pull --ff-only origin main

CURRENT_HEAD=$(git rev-parse HEAD)
BOOTSTRAP_TAG=$(git rev-parse v2-bootstrap)
BOOTSTRAP_EXPECTED=f30f09fe6ccab8a72511f73c155a3fe1f05fc3a8

echo "CURRENT_HEAD=$CURRENT_HEAD"
echo "BOOTSTRAP_TAG=$BOOTSTRAP_TAG"
echo "BOOTSTRAP_EXPECTED=$BOOTSTRAP_EXPECTED"
git log --oneline --decorate -8
```

Use GitHub and Linear to confirm:

- PR #85 is merged.
- PR #86 is merged if present on `main`.
- USF-100 is Done.
- USF-39 is still Backlog before this run records the start action.
- `bootstrap-followup` label exists in Linear.

## 2. Exact-head revalidation and tag rule

ADR-0009 and the signed directive require final pre-extraction revalidation immediately before start.

If `CURRENT_HEAD == BOOTSTRAP_TAG`, use that commit as the start point after running the revalidation commands below.

If `CURRENT_HEAD != BOOTSTRAP_TAG`, then `main` has advanced after the current bootstrap tag. In that case:

1. Inspect the commits between `v2-bootstrap` and `HEAD`.
2. Confirm they are governance/revalidation/tracker-safe and contain no implementation/runtime/scaffold changes.
3. Run the full final gate at `CURRENT_HEAD`.
4. If and only if the gate passes cleanly, move `v2-bootstrap` to `CURRENT_HEAD` before starting USF-39.
5. Record the tag movement in Linear USF-39 and USF-100 comments.
6. If the gate fails, stop before implementation and create `bootstrap-followup` issues for each blocker.

Commands:

```bash
git diff --name-status v2-bootstrap..HEAD

git rev-parse HEAD
python3 -m py_compile tools/validate-bootstrap/validate-bootstrap.py tools/validate-spec/validate-spec.py
python3 tools/validate-spec/validate-spec.py all --json
python3 tools/validate-spec/validate-spec.py imports --json
python3 tools/validate-spec/validate-spec.py instances --json
python3 tools/validate-spec/validate-spec.py evidence --json
python3 tools/validate-spec/validate-spec.py real-instances --json
python3 tools/validate-spec/validate-spec.py implementation --json
python3 tools/validate-spec/validate-spec.py selftest --json
python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json
python3 tools/validate-bootstrap/validate-bootstrap.py all --json
python3 tools/validate-bootstrap/validate-bootstrap.py selftest --json
git diff --check
git ls-remote --tags origin "refs/tags/proof-anchor-$(git rev-parse --short=7 HEAD)"
```

When `CURRENT_HEAD != BOOTSTRAP_TAG` and the gate passes, move the tag:

```bash
git tag -fa v2-bootstrap "$(git rev-parse HEAD)" -m "Move v2-bootstrap to exact-head validated USF-39 start point $(git rev-parse --short=7 HEAD)"
git push --force origin refs/tags/v2-bootstrap
git fetch origin --tags --force
test "$(git rev-parse v2-bootstrap)" = "$(git rev-parse HEAD)"
```

Do not start implementation if this exact-head revalidation fails.

## 3. Record the separate USF-39 start action

After the exact-head revalidation passes and `v2-bootstrap` equals the validated start commit, record the separate start action.

Linear actions:

- Comment on USF-39 that this prompt is the separate explicit USF-39 start action issued by Matthew Aldous.
- Include the start commit and `v2-bootstrap` tag target.
- Move USF-39 to In Progress only after revalidation passes.
- Do not close USF-39 until the bootstrap PR is merged and complete.

Comment template:

```text
Separate USF-39 start action issued.

Authorising human: Matthew Aldous.
Start commit / v2-bootstrap: <commit>.
Final pre-extraction revalidation: passed at this exact commit.
Boundary: local dev/test V2 bootstrap only. No staging, production, live-external-provider, deployment, or production-live readiness is claimed.
Bootstrap follow-up policy: any significant or breaking issue discovered during the attempt must be raised as a new Linear issue with label bootstrap-followup.
```

## 4. Branching and PR discipline

Do not open a PR until the bootstrap has succeeded locally.

Use a local branch from the validated bootstrap point:

```bash
RUN_ID=$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short=7 HEAD)
git checkout -b "usf-39-v2-bootstrap-$RUN_ID" "$(git rev-parse v2-bootstrap)"
mkdir -p .codex/runs/$RUN_ID
```

Work locally and commit in bounded, meaningful commits. You may create local commits before success, but do not push/open a PR until all required validation is clean.

If a significant blocker appears, do not open a partial PR. Create Linear `bootstrap-followup` issue(s), leave the local branch as evidence if useful, and stop with a retry plan.

Open a PR only when all of these are true:

- full bootstrap implementation exists for the intended local dev/test scope;
- `make verify` or equivalent passes from a clean checkout;
- repository validators pass;
- bootstrap validators pass;
- proof/test evidence is sufficient for the claims made;
- no significant unresolved `bootstrap-followup` blocker remains;
- no forbidden boundary is violated.

When opening the PR, include complete closure evidence in the PR body. Do not merge until CI and local validation agree.

## 5. Use Codex agents and workflows

Use GPT-5.5 xhigh fast reasoning. Prefer parallel agents where Codex supports them. If agent spawning is unavailable, run the same roles sequentially and save notes under `.codex/runs/$RUN_ID/`.

Spawn or simulate these roles:

1. **Authority and boundary auditor**
   - Reads USF-100, ADR-0009, bootstrap governance, topology plan, source-use ledger, blocker register, and USF-39.
   - Confirms what is now authorised and what remains forbidden.
   - Produces `.codex/runs/$RUN_ID/authority-audit.md`.

2. **Topology and package planner**
   - Designs the TS/Node monorepo structure using only authorised target topology.
   - Ensures no React path mirroring.
   - Produces a target-file manifest before implementation.

3. **Provider and environment planner**
   - Designs dev in-memory providers and test Compose OSS providers.
   - Ensures no in-memory providers are used in test mode.
   - Ensures no staging/prod/live provider claims.

4. **Security and tenancy auditor**
   - Designs and later verifies token-first tenant context, app-layer checks, Postgres RLS, `SET LOCAL`, `current_setting('app.tenant_id')`, `BYPASSRLS` prohibitions, `FORCE ROW LEVEL SECURITY`, break-glass, system jobs, and persistent object classification.

5. **Implementation agents by domain**
   - Foundation/core/contracts/OpenAPI.
   - Auth/tenant/identity/authorization.
   - Audit/evidence/observability.
   - Events/workflow/jobs/notifications/files/config.
   - Data/migrations/Kysely/adapters.
   - Developer platform/test/proof/make verify.

6. **Adversarial reviewer**
   - Runs after implementation but before PR.
   - Looks for unsupported claims, direct React copy, path mirroring, missing tenant proof, weak provider separation, stale proof, generated-report authority, schema activation, unpinned supply-chain, and CI/local divergence.

7. **Linear follow-up triager**
   - Creates `bootstrap-followup` issues for significant unresolved blockers.
   - Does not create issues for transient failures that were fully fixed in the same attempt.

## 6. Authorised implementation scope

Implementation is now authorised only after the preflight/start above. The target is local dev/test V2 bootstrap, not production.

Create the intended top-level structure if needed:

- `apps/`
- `capabilities/`
- `adapters/`
- `packages/`
- `tests/`

Intended layout:

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

Rules:

- `apps` compose runtime processes only.
- `capabilities` own semantic/domain/application behaviour.
- `adapters` bind to concrete local Compose providers.
- `packages` contain shared core, ports, contracts, OpenAPI, testing, proof, and source-use machinery.
- Provider details must not leak into capabilities.
- Fastify remains at `apps/api` edge.
- Postgres, Keycloak, MinIO, NATS, Temporal, Mailpit, OpenBao, and observability code remain in adapters.
- No React path mirroring.
- No direct React runtime/application code import.

## 7. Runtime and toolchain target

Implement modern TypeScript/Node:

- modern active LTS Node;
- pnpm workspaces;
- native ESM;
- strict TypeScript;
- Vitest or equivalent;
- ESLint and Prettier;
- `tsc` gates;
- Makefile orchestration;
- Fastify API adapter edge;
- committed OpenAPI contract;
- Fastify route/schema conformance checks against OpenAPI;
- TypeBox / JSON Schema-first validation;
- SQL-first Postgres migrations;
- Kysely inside DB adapters only;
- generated Kysely DB types from real migrated Compose/Postgres schema where deterministic.

Commit lockfiles and generated deterministic artefacts needed for reproducible verification.

## 8. Provider targets

Dev mode:

- in-memory IDP;
- in-memory event/workflow providers;
- in-memory object storage;
- in-memory secrets/config;
- in-memory/captured/no-op/local console telemetry;
- in-memory notification providers.

Test mode uses Docker Compose OSS providers:

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
- Postgres as canonical database;
- append-only Postgres audit ledger as canonical audit/evidence store.

Rules:

- no in-memory providers in test;
- standard OSS services only in Compose;
- React L6 Compose is lineage and baseline inventory only;
- V2 Compose must be freshly authored;
- exclude UI-only, deprecated, not-applicable, secrets/caches/local state, staging, production, and live-only services.

## 9. Tenant isolation, RLS, break-glass, and system jobs

Tenant isolation is mandatory at application and database layers.

Application-layer rules:

- token-first tenant context;
- dev mocked IDP issues tenant-bearing claims;
- test Keycloak issues tenant-bearing OIDC claims;
- every tenant-scoped action derives tenant context from authenticated identity claims;
- any tenant in route/header/query/body must match authenticated tenant context;
- mismatch fails closed;
- application-owned RBAC/ABAC authorization;
- Keycloak is identity, not the sole authorization system;
- policies and assignments stored in Postgres;
- all tenant-scoped actions audited.

Postgres RLS rules:

- tenant-scoped tables use RLS;
- every tenant-scoped DB operation runs in an explicit transaction;
- transaction uses `SET LOCAL` or equivalent to bind tenant/user/security context;
- RLS reads `current_setting('app.tenant_id')` or equivalent;
- missing tenant context fails closed;
- mismatched tenant context fails closed;
- pooled connection leakage is tested;
- app DB role is not superuser;
- app DB role does not have `BYPASSRLS`;
- app DB role does not own tenant-scoped tables;
- tenant-scoped tables use `ENABLE ROW LEVEL SECURITY`;
- tenant-scoped tables use `FORCE ROW LEVEL SECURITY` unless formally excepted.

Persistent object classifications required before migrations/storage implementation:

- tenant-scoped;
- global reference;
- system-internal;
- cross-tenant aggregate;
- audit/evidence;
- migration/control-plane.

Unclassified persistent objects fail verification.

Break-glass requirements:

- two-person JIT approval;
- requester cannot approve own access;
- approval before access starts;
- reason, scope, tenant/resource boundary, expiry, requester, approver recorded;
- auto-expiry;
- all actions audited;
- no permanent cross-tenant human access;
- no silent admin bypass;
- RLS-aware scoped elevation;
- must not disable RLS;
- grants stored in Postgres;
- grants bound to actor, tenant/resource scope, reason, approver, expiry;
- RLS policies check active grants;
- access outside grant fails closed;
- no `BYPASSRLS`, no superuser, no permanent elevated DB role, no app-only tenant bypass.

System jobs:

- tenant-by-tenant execution;
- cross-tenant orchestration only;
- tenant-scoped data access under concrete tenant context;
- no global tenant bypass;
- each tenant operation sets RLS context and is audited;
- cross-tenant aggregates require explicit classification and non-leakage proof.

Frame these as ISO 27001-supporting technical controls, not certification claims.

## 10. Migration and data rules

- React final proven schema lineage informs fresh V2 `0001` SQL baseline.
- No direct migration copy from React.
- No real tenant/customer/user data migration in first V2 readiness.
- SQL migrations are authoritative.
- Kysely is adapter-only.
- DB types generated from real migrated Compose/Postgres schema where deterministic.
- Stale generated DB types fail verification.
- After V2 `0001` baseline is committed and anchored, migrations are immutable and forward-only.
- Destructive changes require expand/contract or documented data-safety proof.
- Migration order and checksums must be verified.
- Fixtures are synthetic deterministic data only.
- No copied React production/customer data.

## 11. React lineage policy

`../react` may be used only as lineage.

Allowed:

- runtime source as behavioural/reference lineage;
- tests as expected-behaviour lineage;
- proof scripts as proof-command lineage;
- Makefiles/package scripts as build-command lineage;
- Compose/config as dev/test substrate lineage;
- ADR/docs/semantic artefacts as semantic lineage.

Forbidden:

- direct code copy;
- direct runtime import;
- direct config copy;
- source-path mirroring;
- secrets, caches, or local state;
- treating React as future authority;
- treating generated reports as proof authority.

Every implementation PR must describe source-use treatment per created file: `source-derived-adapt`, `source-derived-rewrite`, `new-with-rationale`, or `evidence-only-support`.

## 12. Verification contract

Create or update a single command that proves local dev/test readiness.

Preferred:

```bash
make verify
```

It should run, at minimum:

- install/lockfile check;
- formatting;
- lint;
- TypeScript compile;
- unit tests;
- migrations/checksums;
- generated DB types freshness check;
- OpenAPI/schema conformance;
- dev in-memory tests;
- test Compose startup;
- provider integration tests;
- tenant isolation/RLS tests;
- break-glass tests;
- audit/evidence tests;
- event/workflow/storage/secret/notification provider tests;
- repository validators;
- bootstrap validator;
- proof commands for behaviour claims;
- source-use/path-mirroring checks.

Also run existing repo validators:

```bash
python3 tools/validate-spec/validate-spec.py all --json
python3 tools/validate-spec/validate-spec.py imports --json
python3 tools/validate-spec/validate-spec.py instances --json
python3 tools/validate-spec/validate-spec.py evidence --json
python3 tools/validate-spec/validate-spec.py real-instances --json
python3 tools/validate-spec/validate-spec.py implementation --json
python3 tools/validate-spec/validate-spec.py selftest --json
python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json
python3 tools/validate-bootstrap/validate-bootstrap.py all --json
python3 tools/validate-bootstrap/validate-bootstrap.py selftest --json
git diff --check
```

If CI is added, CI must mirror `make verify` and must not be weaker than local verification.

## 13. Significant/breaking issue handling

Do not hide blockers in prose.

Create a new Linear issue with label `bootstrap-followup` when an unresolved issue is significant or breaking.

Significant/breaking examples:

- repo authority conflict;
- validator contradiction;
- required semantic contract missing or contradictory;
- unavoidable source-use gap;
- provider substrate cannot be represented locally;
- tenant/RLS proof cannot pass;
- break-glass model cannot be implemented safely;
- generated DB type/migration model cannot be made deterministic;
- `make verify` cannot pass without weakening standards;
- direct React copy/path mirroring would be required;
- incomplete bootstrap after reasonable agent-resolvable repair attempts.

Do not create a Linear issue for transient compile/test failures that are fully fixed before the final PR.

Each `bootstrap-followup` issue must include:

- title prefixed with `Bootstrap:`;
- label `bootstrap-followup`;
- relation/link to USF-39;
- attempt commit/branch and `v2-bootstrap` value;
- failing command;
- observed failure;
- expected behaviour;
- affected semantic contract/provider/capability;
- required fix;
- retry condition;
- whether it blocks moving/relying on `v2-bootstrap`.

If any blocking `bootstrap-followup` issue is created:

- do not open a bootstrap PR;
- do not merge partial implementation;
- leave USF-39 In Progress with an honest blocker comment;
- leave `v2-bootstrap` at the last validated retry point unless the blocker fix is already merged and exact-head revalidation passes;
- final report completion score must be below 100%.

## 14. PR and merge criteria

Do not raise the bootstrap PR until confident the bootstrap succeeded.

Before opening a PR:

- all generated implementation is present;
- `make verify` passes;
- all repo validators pass;
- all bootstrap validators pass;
- local dev mode works;
- test Compose mode works;
- proof/evidence claims are honest and current;
- no blocking `bootstrap-followup` issues remain;
- no forbidden boundary is violated;
- adversarial review agent has reported no blocking finding.

When ready, push branch and open a PR.

PR body must include:

- start commit and `v2-bootstrap` value;
- USF-39 start action reference;
- architecture summary;
- created top-level structure;
- provider matrix;
- tenant/RLS/break-glass proof summary;
- migration/data summary;
- OpenAPI/contract summary;
- source-use treatment summary;
- validation command results;
- `make verify` result;
- proof/evidence result;
- Linear follow-up issue list, empty if none;
- completion score;
- explicit boundary statement.

Merge only after:

- CI passes;
- local and CI verification agree;
- PR review/adversarial review has no blocking findings;
- no significant unresolved bootstrap-followup issue exists.

After merge:

- record merge commit on USF-39;
- move `v2-bootstrap` to the successful merge commit if the repo policy still uses it as the active bootstrap iteration marker;
- publish/verify proof anchor for the merge commit;
- update Linear with final completion score and outcome.

## 15. Final report format

Always return this structure:

```text
USF-39 V2 bootstrap result

Completion score: <0-100>%
Phase reached: not-started | preflight | start-recorded | scaffold | dev-runtime | test-compose | proof | verify | PR-opened | merged | complete
Start commit:
v2-bootstrap before:
v2-bootstrap after:
Branch:
PR:
Merge commit:
make verify/equivalent:
Repo validators:
Bootstrap validators:
Proof/evidence result:
Linear USF-39 update:
Bootstrap-followup issues created:
Blocking bootstrap-followup issues:
Should v2-bootstrap remain, move, or be left untouched:
Exact next retry condition:
Boundary confirmation:
```

Boundary confirmation must explicitly state whether any of these happened:

- direct React runtime/application copy;
- React path mirroring;
- schema activation;
- staging/production/live readiness claim;
- unverified proof claim;
- unpinned critical runtime dependency;
- weaker CI path than local verification.

Do not use optimistic language if completion is below 100%.

## 16. Success definition

Success is not "a PR exists".

Success means:

- the V2 bootstrap implementation exists;
- local dev mode is usable;
- test Compose mode is usable;
- all critical tenant/security/provider/data/proof controls pass;
- `make verify` or equivalent passes;
- validators pass;
- evidence is honest and current;
- PR has merged cleanly;
- USF-39 has an accurate final comment;
- no significant unresolved bootstrap-followup issue remains.

If any of that is false, stop, create Linear issues for significant blockers, and give a precise retry plan.
