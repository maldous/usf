# Regeneration Sufficiency and Semantic Graph Closure

| | |
|---|---|
| **Document type** | Architecture / regeneration sufficiency and semantic graph closure |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and any later filled implementation directive |
| **Issue scope** | USF-88 |
| **Primary inputs** | `spec/instances/`, `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `docs/architecture/proof-execution-substrate-authorization.md`, `docs/architecture/implementation-directive-template.md`, `docs/architecture/target-implementation-topology-plan.md`, `docs/architecture/post-extraction-closure-checklist.md` |

This document records the regeneration sufficiency and semantic graph closure check for the current authentication proof/readiness slice. It creates no implementation code, implementation directory, proof evidence, generated report, schema promotion, or source import.

## Closure Claim

The current authentication login API/audit/workflow/provider-mode slice has a reviewable semantic graph sufficient to inform a later filled implementation directive. This is a proof-substrate closure claim only.

This document does not claim complete platform semantic closure. It does not start USF-39. It does not authorize implementation extraction. It does not permit direct runtime/application source import from USF's own source lineage. It does not treat source lineage, historical proof, or generated reports as authority.

## Graph Inputs

The graph nodes for this closure check are committed USF semantic instances and governance artefacts:

- semantic contracts under `spec/instances/semantic-contract/`;
- interface, workflow, event, audit, observability, provider-mode, environment, configuration, data-migration, command, UI, and AI-governance instances under `spec/instances/`;
- source lineage and disposition from `spec/registries/source-import-manifest.json`, `spec/registries/authentication-slice-source-import-manifest.json`, and `docs/architecture/authentication-slice-source-use-disposition-matrix.md`;
- implementation-entry constraints from `docs/architecture/implementation-directive-template.md`, `docs/architecture/target-implementation-topology-plan.md`, and `docs/architecture/post-extraction-closure-checklist.md`;
- proof-entry constraints from `docs/architecture/proof-execution-substrate-authorization.md` and committed proof/evidence records.

USF's own recorded source artefacts remain rank-5 source lineage. They can explain why a semantic node exists, but they cannot silently fill missing USF semantics or define target source structure.

## Regeneration Target Matrix

| Target graph | Required target for the current authentication slice | Current USF artefacts | Closure result |
|---|---|---|---|
| Capability graph | The authentication capability must have semantic authority for login, identity context, tenant/user identity, RBAC dependency, provider selection, audit, and proof command boundaries. | `semantic-contract.authentication-platform`, `semantic-contract.user-identity-and-tenant-membership`, `semantic-contract.tenant-identity-record-and-fqdn`, `semantic-contract.tenant-host-identity-resolution`, `semantic-contract.rbac-roles-and-permissions`, `command.authentication-slice-proof`, `docs/architecture/capability-source-coverage-matrix.md` | Closed for the current authentication slice. Broader capability-domain closure remains deferred. |
| Interaction graph | The slice must identify caller-facing interaction, participant services/concepts, workflow operations, and the identity-context dependency chain. | `interface.authentication-login-api`, `workflow.authentication-login`, `workflow.authentication-identity-context`, `ui-semantic-model.authentication-login`, `provider-mode.mock-identity-provider`, `audit.authentication-login` | Closed for the current authentication slice. No broader route/interface inventory is claimed. |
| Event graph | Login audit/event behavior must bind audit, event contract, observability signal, and workflow references. | `audit.authentication-login`, `event.authentication-login-audit`, `observability.authentication-login-audit`, `workflow.authentication-login` | Closed for the current authentication slice. Other event families remain out of scope. |
| Environment matrix | Provider mode and environment must be separate and must not upgrade hermetic proof into live or production claims. | `environment.hermetic`, `environment.production-shaped`, `provider-mode.mock-identity-provider`, `configuration.provider-mode-selector`, `docs/architecture/proof-execution-substrate-authorization.md` | Closed for hermetic-mock and hermetic claims only. Live external provider and production-live are not closed. |
| UI semantic model | The login UI semantics must map to the interface and workflow without treating historical JSX as authority. | `ui-semantic-model.authentication-login`, `interface.authentication-login-api`, `workflow.authentication-login` | Closed for the current login semantic model. Full UI surface regeneration is not claimed. |
| Provider posture | The slice must name the allowed provider posture and prevent implicit provider/environment upgrades. | `provider-mode.mock-identity-provider`, `configuration.provider-mode-selector`, `environment.hermetic`, `docs/architecture/production-proof-posture-matrix.md`, `docs/architecture/proof-execution-substrate-authorization.md` | Closed for hermetic mock provider behavior. Local composed, sandbox, live external, and production-live postures remain gaps. |
| Data model | The identity data concepts needed by the authentication slice must be represented without authorizing migrations or storage runtime. | `data-migration.identity-schema`, `semantic-contract.user-identity-and-tenant-membership`, `semantic-contract.tenant-identity-record-and-fqdn`, `semantic-contract.tenant-host-identity-resolution` | Closed for semantic planning. Runtime storage, migrations, backup, restore, retention execution, and legal-hold proof remain gaps outside this slice. |
| Command graph | The commands required to validate and prove the slice must be represented as commands, not hidden shell knowledge. | `command.validate-spec-all`, `command.validate-spec-evidence`, `command.validate-spec-pr`, `command.validate-spec-real-instances`, `command.validate-spec-selftest`, `command.authentication-slice-proof` | Closed for current validation/proof command representation. Broader command-catalog coverage remains deferred. |

## Blocking Gaps and Deferred Scope

The following gaps are explicit and blocking for broader implementation extraction, but they do not invalidate the current authentication proof substrate graph closure:

- USF-39 remains Backlog and no accepted filled implementation directive exists in this document.
- Full platform capability closure beyond the current authentication slice is not complete.
- Route/interface/event/workflow/UI regeneration outside the authentication login slice is not complete.
- Provider modes beyond hermetic mock are not proven here.
- Production-live and live-external-provider readiness are not proven here.
- Runtime storage, migrations, backup, restore, retention execution, and legal-hold proof are not proven here.
- Generated reports, historical proof outputs, and historical React inventories remain lower-authority review aids only.
- No schema is promoted active by this closure check.

If a later task needs any of those gaps for its claim, the gap must fail closed or be recorded as a blocking dependency. It must not be silently filled from historical source structure or generated reports.

## React Source Boundary

React source is not used as hidden authority in this closure check. The historical repository may supply source evidence, proof lineage, or validator inspiration only through recorded USF artefacts.

Allowed use:

- cite source import manifest rows as lineage;
- cite source-use matrix rows as disposition;
- cite historical proof scripts as proof-command lineage where already recorded;
- use historical semantic artefacts as inputs that have been normalised into USF instances or governance documents.

Forbidden use:

- source-path mirroring;
- direct runtime/application source copy;
- treating historical package, service, app, or script structure as target topology;
- treating generated React reports as semantic authority or current proof;
- treating stale historical evidence as current readiness.

## Validator Rule Treatment

No new validator rule is introduced by this document. The current closure check is reviewable through this matrix and through existing validator modes.

If a later change makes this gate machine-enforceable, that change must add stable rule IDs and planted defects for every new rule before any issue is marked complete.

## Required Validation

This artefact is mergeable only when these commands pass on the PR head:

- `python3 tools/validate-spec/validate-spec.py all --json`;
- `python3 tools/validate-spec/validate-spec.py instances --json`;
- `python3 tools/validate-spec/validate-spec.py evidence --json`;
- `python3 tools/validate-spec/validate-spec.py real-instances --json`;
- `python3 tools/validate-spec/validate-spec.py selftest --json`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`.

Strict JSON parse is required for any changed JSON. This document changes no JSON.

## Downstream Effect

USF-88 can close for the current authentication proof/readiness slice after this artefact merges with clean validation.

This document can support USF-61 only as input to a later filled implementation directive. USF-61 must still name the exact slice, destination files, allowed directories, source-use treatment, provider mode, environment, proof floor, schema posture, generated-report policy, validation commands, and stop conditions before USF-39 can leave Backlog.

USF-75 must still revalidate the final pre-USF-39 readiness state after all required gates close.

USF-39 remains blocked until a separate explicit implementation directive is accepted and every prerequisite gate is satisfied.

## No-Go Rules

- Do not start USF-39.
- Do not move USF-39 out of Backlog.
- Do not create implementation/runtime code.
- Do not create implementation/runtime directories.
- Do not import runtime/application code from USF's own source lineage.
- Do not mirror recorded source paths as target paths.
- Do not treat generated reports as authority.
- Do not use stale historical evidence as current proof.
- Do not treat hermetic-mock proof as live-external-provider proof.
- Do not treat production-shaped evidence as production-live evidence.
- Do not promote schemas to active.

## Readiness Verdict

READY_WITH_NON_BLOCKING_DEFERRED_WORK for the current authentication proof substrate regeneration sufficiency and semantic graph closure check.

NOT_READY_BLOCKING_ISSUES_REMAIN for broad platform implementation extraction. USF-39 remains Backlog and is not started by this document.
