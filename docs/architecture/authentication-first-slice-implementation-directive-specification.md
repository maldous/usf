# Authentication First-Slice Implementation Directive Specification

| | |
|---|---|
| **Document type** | Architecture / implementation-extraction directive specification |
| **Status** | Draft / entry-gate planning |
| **Authority level** | Directive specification; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and the later human-filled implementation directive |
| **Issue scope** | USF-61 |
| **Primary inputs** | `docs/architecture/implementation-directive-template.md`, `docs/architecture/target-implementation-topology-plan.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `docs/architecture/proof-slice-readiness-rollup.md`, `docs/architecture/proof-and-evidence-pipeline-plan.md`, `docs/architecture/generated-report-readiness-policy.md`, `docs/architecture/schema-validator-posture-decision.md`, `docs/architecture/ai-agent-work-packet-and-review-contract.md` |

This specification defines the required content for a later human-filled implementation directive for the authentication first slice. It is not the filled directive. It starts no implementation, creates no implementation/runtime code, creates no implementation directory, imports no React runtime/application code, emits no proof evidence, emits no generated report, and promotes no schema.

## Directive Status

USF-39 remains Backlog. A later human implementation directive is still required before USF-39 can start.

This document resolves the directive specification and production-posture decisions for the first slice. It does not itself authorize file creation under the target implementation topology.

## First Implementation Slice

The first implementation slice is bounded to the authentication login API/audit/workflow/provider-mode slice.

In-scope semantic instances:

- `semantic-contract.authentication-platform`;
- `semantic-contract.user-identity-and-tenant-membership`;
- `semantic-contract.tenant-identity-record-and-fqdn`;
- `semantic-contract.tenant-host-identity-resolution`;
- `semantic-contract.rbac-roles-and-permissions`;
- `interface.authentication-login-api`;
- `workflow.authentication-login`;
- `workflow.authentication-identity-context`;
- `event.authentication-login-audit`;
- `audit.authentication-login`;
- `observability.authentication-login-audit`;
- `provider-mode.mock-identity-provider`;
- `configuration.provider-mode-selector`;
- `environment.hermetic`;
- `data-migration.identity-schema`;
- `ui-semantic-model.authentication-login`;
- `command.authentication-slice-proof`.

Out of scope: broad platform implementation, live external provider integration, production-live operation, product UI beyond the authentication login semantic journey, generalized storage/runtime migration execution, backup/restore execution, and any source package or directory not named by a later filled directive.

## Conditional Destination Directories

A later filled directive may authorize only these destination directories for the first slice, and only when it names exact target files before creation:

| Conditional directory | Purpose | Governing authority |
|---|---|---|
| `apps/authentication-api/` | HTTP/API entrypoint and orchestration for the authentication login slice. | `docs/architecture/target-implementation-topology-plan.md`, `interface.authentication-login-api`, `workflow.authentication-login` |
| `packages/authentication-domain/` | Authentication domain rules and session/login behaviours. | `semantic-contract.authentication-platform`, `workflow.authentication-login` |
| `packages/identity-domain/` | Tenant identity, user identity, membership, and host identity abstractions. | identity semantic contracts and identity workflow instances |
| `packages/authorization-policy/` | RBAC and authorization policy needed by the slice. | `semantic-contract.rbac-roles-and-permissions` |
| `packages/identity-provider-adapter/` | Provider-mode-aware identity provider boundary. | `provider-mode.mock-identity-provider`, `configuration.provider-mode-selector` |
| `packages/authentication-observability/` | Audit, event, and observability emission contracts. | audit, event, and observability instances |
| `config/authentication/` | Declarative authentication provider/environment configuration. | configuration and environment instances |

All other implementation-shaped directories remain forbidden unless a later reviewed topology update or filled directive explicitly authorizes them. Examples that remain blocked include `apps/platform-api/`, `apps/web/`, `services/`, `src/`, `infra/`, `scripts/`, `deploy/`, `docker/`, `k8s/`, and `terraform/`.

## Source-Use Policy

The later filled directive must assign every target file exactly one treatment:

- `source-derived-adapt`: behaviour may be adapted from cited source-use rows, but code is not copied and target paths do not mirror historical paths;
- `source-derived-rewrite`: behaviour may be rewritten from cited source-use rows, preserving semantics and lineage without copying code;
- `new-with-rationale`: no direct source row drives the file, but the directive records the semantic reason and source-disposition rationale;
- `evidence-only-support`: source rows inform review or lineage only and cannot produce runtime code.

Direct runtime/application code import from `../react` is not authorized for the first directive unless a later explicit source-import directive names a specific file, source-use treatment, proof rationale, and target file.

Every target file must cite source-use matrix row numbers from `docs/architecture/authentication-slice-source-use-disposition-matrix.md` or a reviewed `new-with-rationale` entry. A historical source path alone is never sufficient.

## Proof Floor and Production Posture

Required first-pass proof floor:

- proof posture: hermetic internal authentication first-slice proof;
- proof evidence: current authentication proof evidence under `evidence/proof-evidence/authentication-slice-proof.json` and matching evidence envelopes;
- required proof level: `behaviour-proven`;
- provider mode target: `hermetic-mock`;
- environment target: `hermetic`;
- freshness: non-stale and commit-pinned for the claim;
- live-external-provider proof required for first pass: no;
- production-live proof required for first pass: no.

The later directive must state that live-external-provider and production-live claims are out of scope for the first implementation pass. If a human raises either claim to required before first implementation, USF-73 or an equivalent proof execution issue must close first.

Hermetic proof must not be upgraded into live-external-provider or production-live readiness. Production-shaped evidence, if later authored, must not be treated as production-live evidence.

## Schema and Validator Posture

Schemas remain draft. No schema is promoted active by this specification or by the first implementation directive unless a separate active-promotion PR satisfies the active-promotion criteria.

The validator remains the required advisory gate for repository consistency. A future implementation PR must pass the implementation guard and PR diff modes that exist at the time of the PR.

## Required Validation and Proof Commands

The later filled directive must require these commands before any implementation PR merges:

- `python3 tools/validate-spec/validate-spec.py all --json`;
- `python3 tools/validate-spec/validate-spec.py imports --json`;
- `python3 tools/validate-spec/validate-spec.py instances --json`;
- `python3 tools/validate-spec/validate-spec.py evidence --json`;
- `python3 tools/validate-spec/validate-spec.py real-instances --json`;
- `python3 tools/validate-spec/validate-spec.py selftest --json`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`;
- the proof command named by the filled directive if the implementation PR makes or refreshes a proof claim.

If implementation files are created, the implementation/PR guardrails must find no unauthorized directory, missing source disposition, source-path mirroring, forbidden path token, active schema promotion, or unapproved tooling.

## Per-Created-File Reconciliation

Every created implementation file must include a closure row in the PR body or a linked closure record with:

- target file;
- directive entry that authorizes it;
- allowed destination directory;
- semantic refs;
- ADR refs or explicit no-ADR-change statement;
- source-use treatment;
- source-use matrix row numbers or new-with-rationale entry;
- runtime import statement;
- validator evidence;
- proof/evidence requirement or explicit no-proof-claim statement;
- generated-report treatment;
- deferred work and why it does not weaken the current slice.

An implementation PR is incomplete if any created target file lacks this reconciliation.

## Generated-Report Policy

Generated reports may be cited only as rank-7 summaries with evidence references and freshness. They do not authorize implementation, replace proof evidence, promote schemas, define semantics, or close source-disposition gaps.

## Required PR and Work Packet Contract

Any implementation PR under the later filled directive must follow `docs/architecture/ai-agent-work-packet-and-review-contract.md` and `docs/architecture/post-extraction-closure-checklist.md`.

The PR must state:

- the accepted filled directive;
- every target file and allowed directory;
- semantic instance refs;
- source-use rows or new-with-rationale entries;
- proof/evidence records used for the claim;
- validation commands and results;
- generated-report treatment;
- no source-path mirroring;
- no direct runtime code import unless explicitly authorized;
- no schema activation unless separately authorized;
- no hermetic-as-live or production-shaped-as-production-live overclaim.

## Non-Goals

- Starting USF-39.
- Moving USF-39 out of Backlog.
- Creating implementation/runtime code.
- Creating implementation/runtime directories.
- Importing React runtime/application code.
- Copying historical source paths.
- Promoting schemas or validators to active maturity.
- Running new proof.
- Claiming live-external-provider or production-live readiness.
- Treating generated reports as authority.
- Treating this specification as the final human implementation directive.

## USF-39 Entry Requirement

Before USF-39 can start, a human must issue a separate filled implementation directive that cites this specification and answers every required field in `docs/architecture/implementation-directive-template.md`.

That filled directive must be reviewed and accepted, and USF-75 must complete final pre-USF-39 readiness revalidation. Until then, USF-39 remains Backlog.

## Validation Expectations

This specification is mergeable only when:

- `python3 tools/validate-spec/validate-spec.py all --json` passes;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD` is clean;
- git status shows no implementation directory and no schema promotion.

Strict JSON parse is required for any changed JSON. This document changes no JSON.

## Readiness Verdict

READY_WITH_NON_BLOCKING_DEFERRED_WORK for the implementation directive specification.

NOT_READY_BLOCKING_ISSUES_REMAIN for USF-39 implementation extraction. The final human directive and USF-75 revalidation are still required.
