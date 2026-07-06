# Route Security And Observability Proof Slice Plan

| | |
|---|---|
| **Document type** | Architecture / route assurance proof-slice plan |
| **Status** | Draft / proof-governance planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-90 |
| **Primary inputs** | `spec/instances/interface-contract/authentication-login-api.json`, `spec/instances/audit-event/authentication-login.json`, `spec/instances/observability-signal/authentication-login-audit.json`, `spec/instances/workflow/authentication-login.json`, `spec/instances/workflow/authentication-identity-context.json`, `docs/architecture/proof-tool-contract-standard.md`, `spec/registries/source-import-manifest.json` |

This plan records route-level security and observability assurance for the current authentication proof substrate. It creates no product implementation runtime, imports no source-lineage runtime/application code, creates no implementation directory, promotes no schema to `active`, makes no live or production proof claim, and does not start USF-39.

## Purpose

The authentication route must be governed before implementation extraction. Route behaviour cannot be inferred from historical handler files, OpenAPI-like artefacts, package scripts, generated reports, or test names. It must be mapped to USF interface, audit, observability, workflow, and proof semantics.

## In-Scope Route Matrix

| Route surface | Semantic interface | Security boundary | Audit | Observability | Proof boundary |
|---|---|---|---|---|---|
| Authentication login, callback, session, and logout route family | `interface.authentication-login-api` | anonymous login initiation, callback-state validation, tenant host validation, session-cookie integrity, explicit denied/error outcomes, and permission-gated follow-on access | `audit.authentication-login` through `event.authentication-login-audit` | `observability.authentication-login-audit` using request, trace, tenant, provider-mode, capability, and proof identifiers | `command.authentication-slice-proof` and `workflow.authentication-identity-context` |

Routes outside this table are not authorized for implementation extraction by this plan. Their absence is recorded rather than guessed.

## Route Security Semantics

The in-scope authentication route must:

- reject missing or invalid callback state;
- reject unsafe redirect origin and unsafe tenant host context;
- reject unknown, inactive, invalid, reserved, or other-tenant host identity before session actor projection;
- preserve session-cookie integrity and avoid provider-token exposure;
- emit explicit denied, validation-failure, provider-failure, no-session, and logout outcomes;
- keep permission-gated follow-on access separate from anonymous login initiation;
- fail closed when audit, observability, workflow, or proof correlation is missing.

## Route Observability Semantics

The route assurance slice uses the existing controlled observability attributes:

- service-name;
- deployment-environment;
- provider-mode;
- tenant-id;
- trace-id;
- request-id;
- proof-id;
- capability-id.

No route-specific attribute vocabulary is invented by this plan. Route trace, log, metric, and audit expectations are expressed as correlation requirements over the existing signal and event instances. A generated report or validator summary cannot replace collected proof evidence.

## Historical Source Treatment

Historical route, audit, observability, and security artefacts are evidence only. The relevant source-import entries include:

- `docs/api/openapi.json`;
- `apps/platform-api/src/server/routes.ts`;
- `apps/platform-api/src/server/auth.ts`;
- `apps/platform-api/src/server/session.ts`;
- `apps/platform-api/src/server/authorize-resource.ts`;
- `apps/platform-api/src/server/observability.ts`;
- `apps/platform-api/src/usecases/audit.ts`;
- `apps/platform-api/src/usecases/auth.ts`;
- `apps/platform-api/tests/substrate/auth-routes.test.ts`;
- `apps/platform-api/tests/unit/auth-usecase.test.ts`;
- `apps/platform-api/tests/unit/cookie-security.test.ts`.

These paths do not define USF route authority and must not be mirrored as future implementation paths.

## Proof Expectations

When route behaviour is claimed, the proof plan or proof tool must follow the USF-78 proof-tool contract. For the current authentication route slice, proof posture remains:

- provider mode `hermetic-mock`;
- environment `hermetic`;
- observed proof level `behaviour-proven`;
- freshness pinned to the claimed USF commit when evidence is written;
- no live external provider claim;
- no production-live claim.

The proof must fail closed if the route claim lacks request correlation, trace correlation, audit event correlation, observability signal correlation, workflow participation, or fresh proof evidence.

## Explicit Non-Applicability

The current route assurance slice does not cover:

- billing, metering, quota, subscription, invoice, or dunning routes;
- search, storage, backup, restore, data residency, support-admin, delegated-admin, workflow-engine, scheduled-job, event-redrive, and production operation routes;
- live external identity-provider route readiness;
- production-live route readiness.

Those route families remain deferred until separately represented by semantic interfaces, audit/observability records, source-use rules, proof evidence, and validation gates.

## Required Gates

Every PR changing route assurance semantics must run:

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
- source-lineage runtime/application code import;
- source-path mirroring;
- schema activation;
- generated reports as authority;
- live-external-provider or production-live claims from hermetic proof.

## Readiness Effect

When merged with clean validation, this plan and the updated route interface satisfy the current tracked USF-90 route assurance slice. They do not complete deferred route coverage outside the authentication proof substrate and do not authorize implementation extraction.
