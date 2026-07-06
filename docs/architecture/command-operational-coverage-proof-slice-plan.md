# Command Operational Coverage Proof Slice Plan

| | |
|---|---|
| **Document type** | Architecture / command coverage proof-slice plan |
| **Status** | Draft / proof-governance planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-87 |
| **Primary inputs** | `spec/schemas/command.schema.json`, `spec/instances/command/`, `docs/architecture/proof-tool-contract-standard.md`, `tools/validate-spec/validate-spec.py`, `tools/validate-bootstrap/validate-bootstrap.py`, `spec/registries/source-import-manifest.json` |

This plan records command coverage for the current pre-implementation authentication proof slice. It creates no product implementation runtime, imports no source-lineage runtime/application code, creates no implementation directory, promotes no schema to `active`, and does not start USF-39.

## Purpose

USF treats commands as governed semantic assets. Before implementation extraction, the current proof slice needs explicit command semantics for validation commands, proof commands, operational side effects, failure behaviour, and source-use boundaries.

This plan closes the current tracked USF-87 slice by mapping the live USF commands used for proof readiness and by recording that historical source-lineage commands remain evidence until a later directive authorizes narrower reuse.

## Current Live USF Command Coverage

The live command surface for the current pre-implementation proof chain is:

- `command.validate-spec-all`;
- `command.validate-spec-evidence`;
- `command.validate-spec-real-instances`;
- `command.validate-spec-selftest`;
- `command.validate-spec-pr`;
- `command.authentication-slice-proof`.

The validator command instances cover inputs, outputs, environment scope, side effects, failure semantics, and generated-output authority boundaries. They do not create proof evidence and their output remains generated validation evidence rather than semantic authority.

The authentication proof command instance covers the USF proof-only harness, its governed semantic inputs, its authorized proof/evidence outputs, its write-mode side effects, and its fail-closed provider/environment rules. The command follows the USF-78 proof-tool contract when proof evidence is claimed.

## Historical Command Treatment

Historical source-lineage commands and package scripts are source evidence only. They are not live USF commands, must not be executed as USF proof commands, and must not define USF target paths.

The relevant historical inputs for this slice are:

- `Makefile`;
- `package.json`;
- `tools/e2e/validate-e2e/src/index.mjs`;
- `apps/platform-api/scripts/auth-settings-runtime-proof.ts`;
- `apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts`;
- `apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts`;
- `apps/platform-api/tests/substrate/auth-routes.test.ts`.

Their source-use treatment is inherited from the source import manifest and the proof-tool contract: preserve or refactor as evidence/lineage where recorded, but do not import runtime/application code, mirror historical paths, or upgrade historical proof output into current USF readiness.

## Explicit Non-Applicability

The following command categories are not live USF product commands in the current repository state:

- build commands for product packages;
- runtime commands for applications, services, APIs, databases, workers, identity providers, or UI apps;
- deployment, compose, infrastructure, or production operation commands;
- source-lineage package scripts and Make targets as executable USF commands.

They remain non-applicable until a later approved directive authorizes implementation extraction or runtime substrate creation. Recording this non-applicability is part of command coverage; it prevents historical command existence from being mistaken for USF runtime readiness.

## Proof and Validation Semantics

Proof commands that emit evidence must follow `docs/architecture/proof-tool-contract-standard.md`. The current authentication proof command is bounded to:

- provider mode `hermetic-mock`;
- environment `hermetic`;
- observed proof level `behaviour-proven`;
- freshness pinned to the claimed USF commit when evidence is written;
- no live external provider claim;
- no production-live claim.

Validation commands must fail closed on malformed input, unresolved references, stale pass reports, proof overclaim, provider/environment misuse, unauthorized implementation paths, and source-path mirroring where their mode is responsible for those checks.

## Required Gates

Every PR changing command semantics, proof commands, or command coverage must run:

- `python3 tools/validate-spec/validate-spec.py all --json`;
- `python3 tools/validate-spec/validate-spec.py instances --json`;
- `python3 tools/validate-spec/validate-spec.py evidence --json`;
- `python3 tools/validate-spec/validate-spec.py real-instances --json`;
- `python3 tools/validate-spec/validate-spec.py selftest --json`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`.

Changed JSON must parse strictly.

## No-Go Rules

This command coverage plan does not authorize:

- USF-39 implementation extraction;
- product runtime/application code;
- `apps/`, `packages/`, `services/`, `src/`, `infra/`, `config/`, or `scripts/` implementation directories;
- source-lineage runtime/application code import;
- source-path mirroring;
- schema activation;
- generated reports as authority;
- live-external-provider or production-live claims from hermetic proof.

## Readiness Effect

When merged with clean validation, this plan and the command instances satisfy the current tracked USF-87 command coverage slice. They do not complete future product command coverage for implementation extraction, deployment, production operation, or live-provider proofs. Those remain gated by later explicit directives and by USF-39 remaining Backlog until separately authorized.
