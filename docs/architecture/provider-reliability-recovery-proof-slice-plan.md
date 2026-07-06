# Provider Reliability Recovery Proof Slice Plan

| | |
|---|---|
| **Document type** | Architecture / provider reliability proof-slice plan |
| **Status** | Draft / proof-governance planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-92 |
| **Primary inputs** | `spec/instances/provider-mode/mock-identity-provider.json`, `spec/instances/configuration/provider-mode-selector.json`, `spec/instances/environment/hermetic.json`, `spec/instances/workflow/authentication-login.json`, `spec/instances/workflow/authentication-identity-context.json`, `docs/architecture/proof-tool-contract-standard.md`, `spec/registries/source-import-manifest.json` |

This plan records provider reliability, degraded mode, and recovery semantics for the current authentication proof substrate. It creates no product implementation runtime, imports no source-lineage runtime/application code, creates no implementation directory, promotes no schema to `active`, creates no evidence records, makes no live provider proof claim, and does not start USF-39.

## Purpose

Provider-backed behaviour must fail closed under unavailable provider, timeout, retry exhaustion, degraded posture, failed health check, recovery ambiguity, and misconfiguration. Hermetic provider proof is valid for internal behaviour only; it cannot become live-provider or production readiness by implication.

## In-Scope Provider Boundary

The in-scope provider and configuration records are:

- `provider-mode.mock-identity-provider`;
- `configuration.provider-mode-selector`;
- `environment.hermetic`.

They govern the authentication proof substrate only. Broader provider families remain deferred until separately represented.

## Reliability Semantics

The current slice requires:

- missing provider-mode selection fails closed;
- unavailable provider fails closed;
- provider timeout fails closed;
- retry exhaustion fails closed and must not hide the denied outcome;
- degraded mode is explicit and does not satisfy readiness unless a proof records the accepted degraded posture;
- recovery requires fresh proof after recovery, not a stale generated report;
- failed provider health check blocks readiness claims;
- misconfiguration does not fall back to a stronger provider mode;
- provider mode and environment remain separate dimensions;
- hermetic proof does not satisfy live external provider or production-live claims.

## Historical Source Treatment

Historical provider reliability artefacts are evidence only. Relevant source-import entries include:

- `apps/platform-api/scripts/provider-config-runtime-proof.ts`;
- `apps/platform-api/scripts/provider-environment-classification-runtime-proof.ts`;
- `apps/platform-api/scripts/provider-readiness-contract-runtime-proof.ts`;
- `apps/platform-api/scripts/composed-provider-readiness-runtime-proof.ts`;
- `apps/platform-api/src/adapters/http-provider-readiness-probe.ts`;
- `apps/platform-api/src/ports/provider-readiness-probe.ts`;
- `apps/platform-api/src/server/auth-providers.ts`;
- `apps/platform-api/tests/unit/auth-provider-config.test.ts`;
- `apps/platform-api/tests/unit/auth-providers.test.ts`.

These paths do not define USF implementation authority and must not be mirrored as future implementation paths.

## Proof Expectations

When provider reliability behaviour is claimed, the proof plan or proof tool must follow the USF-78 proof-tool contract. For this planning slice:

- provider mode remains `hermetic-mock`;
- environment remains `hermetic`;
- observed proof level must not exceed executed evidence;
- freshness must be pinned to the claimed USF commit when evidence is written;
- no live external provider claim is allowed;
- no production-live claim is allowed;
- provider recovery cannot be claimed from stale evidence.

Evidence records are created only from executed authorised proof. This plan creates none.

## Explicit Non-Applicability

The following are outside the current authentication proof substrate:

- live identity-provider proof;
- external sandbox IdP proof;
- production-live provider readiness;
- billing, storage, search, notification, workflow-engine, and observability provider reliability;
- provider secret rotation proof;
- generated provider configuration proof.

Those areas remain deferred until separately represented by semantic contracts, provider/configuration records, source-use rules, proof evidence, and validation gates.

## Required Gates

Every PR changing provider reliability semantics must run:

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
- stale provider recovery evidence treated as current readiness;
- live-external-provider or production-live claims from hermetic proof.

## Readiness Effect

When merged with clean validation, this plan and the updated provider/configuration records satisfy the current tracked USF-92 provider reliability slice for the authentication proof substrate. They do not complete deferred live-provider, external-sandbox, production-live, or non-authentication provider coverage and do not authorize implementation extraction.
