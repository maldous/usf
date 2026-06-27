# Cross-Capability Interaction Proof Slice Plan

| | |
|---|---|
| **Document type** | Architecture / cross-capability proof-slice plan |
| **Status** | Draft / proof-governance planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-89 |
| **Primary inputs** | `spec/instances/workflow/authentication-identity-context.json`, `spec/instances/workflow/authentication-login.json`, `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/proof-tool-contract-standard.md`, `spec/registries/source-import-manifest.json` |

This plan records the current proof-substrate cross-capability interaction boundary. It creates no product implementation runtime, imports no React runtime/application code, creates no implementation directory, promotes no schema to `active`, and does not start USF-39.

## Purpose

The authentication proof substrate crosses authentication, identity access, RBAC, audit, observability, provider mode, environment, and proof-command semantics. Implementation extraction cannot infer those interactions from source shape, package boundaries, or generated reports.

USF already has a workflow schema kind for `cross-capability-interaction`; therefore the current slice uses `workflow.authentication-identity-context` rather than creating a new schema type.

## Governed Interaction

The governed interaction for this slice is `workflow.authentication-identity-context`.

It represents these dependencies:

- authentication login depends on tenant host identity resolution before callback or session context is trusted;
- tenant identity ownership must fail closed for unknown, inactive, invalid, reserved, or other-tenant hosts;
- user identity and tenant membership must resolve for the resolved tenant before session actor projection;
- RBAC evaluation depends on the authenticated tenant-scoped actor and must not be replaced by role-name resemblance;
- audit recording is required before proof success is claimed;
- observability correlation is required for request, provider-mode, proof, and capability traceability;
- the proof command binds the interaction to hermetic proof-only evidence and must fail closed on stale or overclaimed evidence.

## Ownership And Consistency Rules

Authentication owns the login interface and session outcome. Identity access owns tenant identity, membership, and permission semantics. Audit owns the event record. Observability owns signal naming and correlation semantics. Provider mode and environment remain independent proof dimensions. The proof command owns only the executed proof claim and emitted evidence records.

Consistency rules:

- tenant context must be resolved before session actor projection;
- membership must belong to the resolved tenant;
- permission context must not exist without authenticated membership;
- denied authentication, denied membership, and denied permission outcomes preserve audit and observability semantics;
- proof readiness requires fresh hermetic proof evidence for the claimed commit;
- generated reports do not upgrade stale or missing evidence.

## Compensation And Failure

This slice has no rollback-style business transaction. Compensation is explicit fail-closed preservation:

- invalid host or tenant conflict denies before session projection;
- absent or other-tenant membership denies before permission context;
- permission denial keeps session state unchanged and records the denied authorization semantics;
- illegal ordering denies and preserves audit/evidence failure;
- missing audit or observability correlation fails the proof claim;
- missing, stale, or overclaimed proof evidence fails workflow readiness.

## Explicit Non-Interactions

The following are non-applicable for the current proof-substrate interaction and must not be guessed from historical source:

- billing, entitlement metering, quota, subscription, invoice, and dunning interactions;
- search indexing and product search interactions;
- object storage, signed URL, backup, restore, and data residency interactions;
- background worker, scheduled job, event redrive, and workflow engine interactions;
- support-admin, delegated-admin, and break-glass interactions;
- production-live provider operation;
- live external identity-provider readiness.

Those areas remain deferred until their semantic contracts, source-use rules, proof evidence, and validation gates are separately authorized.

## Historical Source Treatment

Historical React cross-capability records, package structure, source files, tests, proof scripts, and generated reports are evidence only. They may inform semantic review through the source import manifest and capability coverage matrix, but they must not become live USF commands, implementation paths, or authority over USF semantic instances.

## Proof Expectations

When behaviour is claimed, the proof plan or proof tool must follow the USF-78 proof-tool contract. For the current authentication slice, proof posture remains:

- provider mode `hermetic-mock`;
- environment `hermetic`;
- observed proof level `behaviour-proven`;
- freshness pinned to the claimed USF commit when evidence is written;
- no live external provider claim;
- no production-live claim.

## Required Gates

Every PR changing this interaction must run:

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
- live-external-provider or production-live claims from hermetic proof.

## Readiness Effect

When merged with clean validation, this plan and the strengthened workflow satisfy the current tracked USF-89 cross-capability interaction slice. They do not complete deferred cross-domain interaction coverage outside the authentication proof substrate and do not authorize implementation extraction.
