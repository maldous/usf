# Authorization Permission Proof Slice Plan

| | |
|---|---|
| **Document type** | Architecture / proof-slice plan |
| **Status** | Draft / proof-slice planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and the proof tool contract standard |
| **Issue scope** | USF-79 |
| **Primary inputs** | `docs/architecture/proof-tool-contract-standard.md`, `spec/instances/semantic-contract/rbac-roles-and-permissions.json`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `spec/registries/authentication-slice-source-import-manifest.json` |

This plan defines the authorization and permission proof slice before implementation extraction. It creates no proof tool, writes no proof evidence, imports no React runtime/application code, creates no implementation directory, emits no generated report, and promotes no schema to `active`.

## Purpose

Authentication proves who the actor is. This slice defines what a known actor may do and what must happen when permission, policy, or tenant context does not authorize the action.

The slice is intentionally proof-plan only. A future proof runner may be created only after a separate substrate authorization names the exact proof tool, evidence output paths, provider mode, environment, and source-use treatment.

## Governed Semantic Inputs

The primary semantic input is `semantic-contract.rbac-roles-and-permissions`.

Supporting proof-substrate semantic inputs are:

- `semantic-contract.authentication-platform`;
- `interface.authentication-login-api`;
- `audit.authentication-login`;
- `workflow.authentication-login`;
- `ui.authentication-login`;
- `provider-mode.mock-identity-provider`;
- `environment.hermetic`.

These inputs are USF semantic authority. Historical React files are source evidence only.

## Historical Source Evidence

The source-use matrix allows the authorization runtime and authorization guard rows only as historical evidence or future adaptation behind USF semantics. It authorizes no direct copy and no source-path mirroring.

The relevant historical source evidence includes:

- `apps/platform-api/src/server/authorize-resource.ts`;
- `apps/platform-api/tests/unit/authorize-resource.test.ts`;
- `apps/platform-api/tests/unit/audit.test.ts`;
- `apps/react-enterprise-app/src/components/RequirePermission.tsx`;
- `packages/authorisation-runtime/src/index.ts`;
- `packages/authorisation-runtime/tests/authorisation-runtime.test.ts`;
- `packages/platform-errors/tests/platform-errors-auth.test.ts`;
- `packages/contracts-auth/src/index.ts`;
- `docs/adr/0021-define-identity-tenancy-roles-and-permissions-model.md`.

These files are lineage and behavioural evidence only. They MUST NOT be executed as USF proof commands, copied as runtime implementation, or used to infer behaviour absent from USF semantics.

## Behaviour Slice

The authorization proof slice must define and later prove:

- static permission allow: actor has the required permission and the guarded action is allowed;
- static permission deny: actor lacks the required permission and the guarded action is denied;
- dynamic policy allow: an enabled matching resource policy grants access;
- dynamic policy deny: a policy denial remains denied even when static permissions exist;
- missing policy fail-closed: no matching dynamic policy does not create access;
- disabled or invalid policy fail-closed: policy configuration defects do not grant access;
- token unresolved: expected token missing or unresolved returns authentication-required, not allow;
- insufficient authentication: step-up-required is distinct from allow and from generic denial;
- degraded provider fallback: unavailable or unregistered dynamic provider paths may fall back only to static permission checking;
- UI permission deny: a missing UI permission renders a forbidden state rather than hidden success;
- audit query permission: contextual audit reads require the relevant permission;
- tenant boundary: audit and authorization views must not leak another tenant's records.

## Proof Plan Under USF-78

A future proof tool for this slice must follow `docs/architecture/proof-tool-contract-standard.md`.

Required command inputs:

- claim commit;
- write mode;
- provider mode;
- environment;
- governed semantic inputs;
- source-use policy;
- exact output paths.

Required command output:

- status;
- claim commit;
- provider mode;
- environment;
- proof level observed;
- live external provider claim;
- production-live claim;
- whether evidence was written.

Required future evidence outputs, if a substrate directive authorizes proof execution:

- one proof-evidence record under `evidence/proof-evidence/`;
- one runtime proof evidence envelope under `evidence/evidence-envelope/`;
- one lineage evidence envelope under `evidence/evidence-envelope/`.

This plan does not name final evidence file paths because no authorization substrate for USF-79 proof execution exists yet. A later directive must name them before any evidence is written.

## Provider and Environment Posture

The current admissible first proof posture for this slice is hermetic only:

- providerMode: `hermetic-mock`;
- environment: `hermetic`;
- minimum proofLevelObserved: `behaviour-proven`;
- liveExternalProviderClaim: `false`;
- productionLiveClaim: `false`.

Hermetic proof cannot satisfy live-external-provider readiness. Hermetic proof cannot satisfy production-live readiness. Production-shaped and live-provider claims require separate authorization and fresh evidence.

## Evidence Rules

No evidence record is created by this plan.

Future proof evidence for this slice must be fresh for the claimed commit, must carry `freshness.stale` equal to `false`, and must include non-empty emitted evidence and collected evidence above discovery level.

Generated reports may summarize the proof, but they remain lowest authority and cannot replace proof-evidence or evidence-envelope records.

## No-Go Rules

This slice MUST NOT start USF-39.

This slice MUST NOT create product implementation/runtime code.

This slice MUST NOT create implementation directories.

This slice MUST NOT import React runtime/application code.

This slice MUST NOT mirror React source paths as USF target paths.

This slice MUST NOT promote schemas active.

This slice MUST NOT treat generated reports as authority.

This slice MUST NOT treat stale evidence as current readiness.

This slice MUST NOT upgrade hermetic proof to live-external-provider or production-live proof.

## Validation

This planning slice is complete only with clean validation:

- `python3 tools/validate-spec/validate-spec.py all --json`;
- `python3 tools/validate-spec/validate-spec.py instances --json`;
- `python3 tools/validate-spec/validate-spec.py evidence --json`;
- `python3 tools/validate-spec/validate-spec.py real-instances --json`;
- `python3 tools/validate-spec/validate-spec.py selftest --json`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`.

Every changed JSON file must parse strictly.

## Readiness Effect

This plan closes the USF-79 planning boundary when merged with the updated RBAC semantic contract and clean validation. It does not produce current proof evidence. It leaves proof execution blocked on a later USF-79-specific substrate authorization and therefore does not close USF-73, USF-61, USF-75, or USF-39.
