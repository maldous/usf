# USF V2 Implementation Extraction Directive (Whole-Platform, All Slices)

| | |
|---|---|
| **Document type** | Architecture / human implementation directive |
| **Status** | SIGNED / USF-100 ACCEPTED — authorising human Matthew Aldous, 28 June 2026 (Australia/Melbourne); does not authorise USF-39 start |
| **Authority level** | Human implementation directive once signed; subordinate to the Charter, Authority Model, accepted ADRs, validators, and runtime proof evidence |
| **Issue scope** | USF-100 (this directive); authorises USF-39 only after signature and a separate start action |
| **Drafted by** | Agent draft under delegation, for human review; the agent does not self-authorise implementation |
| **Primary inputs** | `docs/architecture/implementation-directive-template.md`, `docs/architecture/authentication-proof-substrate-implementation-directive-specification.md`, `docs/architecture/target-implementation-topology-plan.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `docs/architecture/semantic-source-use-closure-ledger.md`, `docs/architecture/react-l5-equivalence-audit.md`, `docs/architecture/final-v2-readiness-reconciliation.md`, `docs/adr/0005-hexagonal-architecture.md`, `docs/adr/0006-proof-freshness-anchor-carrier.md`, `docs/adr/0007-proof-anchor-ci-signing-identity.md`, `docs/adr/0008-proof-anchor-attested-tag-carrier-amendment.md`, `docs/architecture/complete-readiness-blocker-register.md`, `tools/validate-spec/validate-spec.py` |

This is the human-filled implementation directive for the whole USF V2 implementation extraction. It governs the entire V2 migration across all slices. It does not itself create implementation code, create implementation directories, import `../react` runtime code, mirror source paths, emit proof evidence, emit generated reports, or promote schemas. It does not move USF-39 out of Backlog. USF-39 remains Backlog until this directive is signed and a separate explicit start action is authorised.

## Directive Status and Acceptance

This document was prepared as a DRAFT for the authorising human and is now signed by Matthew Aldous on 28 June 2026 (Australia/Melbourne). This signature accepts the directive as the human-filled USF-100 artefact only. It does not start USF-39, does not move USF-39 out of Backlog, and does not create implementation authority without the separately required final revalidation and separate USF-39 start action.

USF-100 acceptance is complete when the signed directive is merged and the USF-100 Linear record records the acceptance. Implementation start still requires two separate human-gated actions:

- a USF-75-equivalent final pre-extraction revalidation immediately before start;
- a separate USF-39 start action after that revalidation passes.

## Human-Only Acceptance Boundary

This human-only acceptance boundary is deliberate: the validator can check directive structure, required scope phrases, and unsafe omissions, but it cannot sign the directive, accept USF-100, move USF-39, or decide that deferred slice gates are acceptable. This acceptance names the authorising human, the accepted date, and the residual start gates that remain after USF-100. A generated report, CI status, local proof stdout, or agent-written comment is not acceptance authority.

## Authorising Human

The authorising human accountable for this directive is Matthew Aldous. This signature supersedes the earlier unsigned draft state. No implicit, agent-made, or "as discussed" authorisation is valid; the directive is authorised only by the named human and the authorisation date in the signature block. This authorisation accepts USF-100 only and does not authorise the separate USF-39 start action.

## Linear Record

This directive is tracked on USF-100. The USF-100 Linear record is the work-tracking record for directive review and acceptance; it is not a semantic authority. The directive's authority comes from the signed document and the governing repository artefacts, not from any Linear comment text.

## Scope

The scope of this directive is the whole USF V2 implementation extraction: all slices of the Universal Service Foundation, covering every semantic capability in the current semantic corpus. The V2 migration is all slices, not a single bounded slice. The scope is the complete set of semantic-contract instances under `spec/instances/semantic-contract/` and their associated workflows, interfaces, events, audit records, observability signals, commands, provider modes, environments, configurations, and data-migration semantics, as inventoried in `docs/architecture/semantic-source-use-closure-ledger.md` and classified in `docs/architecture/react-l5-equivalence-audit.md`.

Capabilities classified `excluded-not-applicable` or `deprecated` in the closure ledger and equivalence audit are out of scope and stay out of scope unless a later signed directive revision adds them. Capabilities classified `semantic-only-deferred` are in scope for extraction but must first have their semantic facets and source-use disposition completed before their target files are created (see slice gating below).

The migration extracts the whole platform under one accepted directive, sequenced slice by slice, so that every slice is governed by identical authority, source-use, and proof rules. No slice is implemented ahead of its semantic and source-use closure, and no slice weakens the rules that govern the others.

## Whole-Platform Slice Readiness Pack

This whole-platform slice readiness pack states the slice gates that must exist before a slice creates files. It is not implementation code and it does not create target files. The pack uses the current semantic-contract corpus as the slice inventory. Every slice must satisfy its pre-file slice gate before any file is created: topology roots must be named, exact target files or an explicit pre-file hold must be recorded, a per-slice source-use disposition matrix must cover the target files, a proof command must exist for any behaviour claim, and any validator extensions required to enforce those gates must be in place.

| Slice / capability domain | Semantic contracts | Target topology and files | Source-use matrix | Proof floor and proof command | Explicit exclusions or deferrals |
|---|---:|---|---|---|---|
| `authentication` | 1 | Conditional roots are listed in `docs/architecture/target-implementation-topology-plan.md`; exact target files still require per-PR listing before creation. | `docs/architecture/authentication-slice-source-use-disposition-matrix.md`. | Hermetic-mock, hermetic, behaviour-proven; `tools/validate-bootstrap/validate-bootstrap.py` and `command.authentication-slice-proof`. | Live-external-provider and production-live remain out of scope. |
| `identity-access` | 13 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before any target file. | Hermetic proof command required before any behaviour claim. | Delegated administration and UI facets remain partly deferred as recorded in the closure ledger. |
| `configuration` | 6 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before any target file. | Hermetic proof command required before any behaviour claim. | UI facets and non-auth configuration breadth remain gated. |
| `data-platform` | 6 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before migrations, storage, retention, import/export, or governance files. | Hermetic proof command required before any behaviour claim. | Data migration/runtime artefacts remain uncreated; deferred manifest rows must be imported before use. |
| `events-workflow` | 4 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before event bus, scheduler, notification, or workflow files. | Hermetic proof command required before any behaviour claim. | Workflow engine source/proof rows remain deferred. |
| `foundation` | 11 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before any foundation runtime or configuration file. | Hermetic proof command required before any behaviour claim. | Governance documents do not authorise runtime roots by themselves. |
| `observability-ops` | 7 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before logs, metrics, alerting, service-catalogue, or ops files. | Hermetic proof command required before any behaviour claim; observability proof remains hermetic/local. | On-call/status-page alerting remains deprecated or excluded as recorded in the closure ledger. |
| `security-governance` | 3 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before any governance/security implementation file. | Hermetic proof command required before any behaviour claim. | AI stop conditions are authority controls, not runtime implementation permission. |
| `storage` | 1 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before object-storage files. | Hermetic proof command required before any behaviour claim. | Object storage remains a deferred gap contract until authored. |
| `support-admin` | 2 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before support/admin files. | Hermetic proof command required before any behaviour claim. | Support/admin targets remain deferred gap contracts until authored. |
| `compute-runtime` | 3 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before worker, function, or secret-runtime files. | Hermetic proof command required before any behaviour claim. | Runtime substrate creation is blocked until separately authorised by topology and validator gates. |
| `entitlements-billing` | 4 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before entitlement, billing, metering, or quota files. | Hermetic proof command required before any behaviour claim. | Entitlement and billing contracts remain deferred gap contracts until authored. |
| `developer-platform` | 5 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before developer-platform files. | Hermetic proof command required before any behaviour claim. | Developer-platform targets remain deferred or non-applicable until authored. |
| `search` | 1 | Pre-file slice gate: topology roots and exact target files must be added before creation. | Required before search files. | Hermetic proof command required before any behaviour claim. | Search remains a deferred gap contract until authored. |

The required validator extensions before broad implementation are: fail-closed checks that every implementation slice has topology roots, exact target files or an explicit pre-file hold, a per-slice source-use disposition matrix, proof-command coverage for any behaviour claim, and no path mirroring or implementation directory outside the authorised roots.

## Governing Repository Artefacts

The directive is governed by, and every implementation PR must remain consistent with: the Charter and Authority Model; accepted ADRs, including ADR-0005 (hexagonal architecture carried forward, language-agnostic), ADR-0006 (proof-freshness anchor carrier), and ADR-0007 (proof-anchor CI signing identity); the semantic-contract instances for the slice being implemented; `docs/architecture/target-implementation-topology-plan.md`; the per-slice source-use disposition matrices; `docs/architecture/semantic-source-use-closure-ledger.md`; `docs/architecture/production-proof-posture-matrix.md` where present; the schema/validator posture decision; the generated-report readiness policy; and the validator rules in `tools/validate-spec/validate-spec.py`. A generated report is never cited as authority, and historical `../react` evidence is never cited as live authority.

## Target Directories and Target Files

Every target file is named in the topology plan before it is created. Implementation is confined to hexagonal application/domain/adapter/configuration roots authorised in `docs/architecture/target-implementation-topology-plan.md` and enforced by the validator's authorised-implementation-roots set. The currently authorised roots are `apps/authentication-api/`, `packages/authentication-domain/`, `packages/identity-domain/`, `packages/authorization-policy/`, `packages/identity-provider-adapter/`, `packages/authentication-observability/`, and `config/authentication/`.

Because this directive authorises all slices but the topology and authorised-roots set are presently enumerated only for the identity/authentication slice, each additional slice is gated: before any of its files are created, a reviewed topology update must add that slice's exact target directories and target files, the validator's authorised-implementation-roots set must be extended to include them, and the slice's source-use disposition matrix must exist. Any implementation-shaped directory not yet listed in the topology plan and the validator remains blocked. Blocked examples include `apps/platform-api/`, `apps/web/`, `services/`, `src/`, `infra/`, `scripts/`, `deploy/`, `docker/`, `k8s/`, and `terraform/`. No target path may mirror a historical `../react` source path.

## Source-Use Policy

Every target file is assigned exactly one source-use treatment in its slice's disposition matrix:

- `source-derived-adapt`: behaviour adapted from cited source-use rows; code is not copied and target paths do not mirror historical paths;
- `source-derived-rewrite`: behaviour rewritten from cited source-use rows, preserving semantics and lineage without copying code;
- `new-with-rationale`: no source row drives the file; the directive records the semantic reason and source-disposition rationale;
- `evidence-only-support`: source rows inform review or lineage only and cannot produce runtime code.

`../react` is informational lineage only. Direct runtime or application code import from `../react` is not authorised by this directive for any slice. A specific file may be imported only if a later signed directive revision names that exact file with its source-use treatment, proof rationale, and target file. The target runtime is modern TypeScript/Node as recorded in bootstrap governance; this directive imports no `../react` source and creates no implementation or scaffold before bootstrap or before separate implementation authorisation.

## Source-Use Disposition Coverage

Every created target file cites the source-use disposition matrix row numbers for its slice or a reviewed `new-with-rationale` entry. No file is created solely because a historical source path exists. A slice whose disposition matrix does not yet cover its target files is not ready for implementation, and its files must not be created.

## Proof Floor and Production Posture

The proof floor for every slice is hermetic internal behaviour proof, fresh and commit-pinned for the claimed commit. Each slice's behaviour must be proven by the proof harness for that slice and carried by the proof-freshness anchor mechanism (ADR-0006 carrier lineage, ADR-0007 CI signer, ADR-0008 attested-tag amendment, `.github/workflows/proof-anchor.yml`), which publishes and verifies a CI-attested anchor on the merge commit. Committed evidence JSON remains historical by design and is never the freshness carrier. The required proof level is `behaviour-proven`; the provider-mode target is `hermetic-mock`; the environment target is `hermetic`.

Fresh proof is required, per slice, before that slice's implementation PR merges when the PR makes or refreshes a behaviour claim. A behaviour claim whose proof is stale, missing for the claimed commit, or absent is a stop condition.

Live-external-provider proof and production-live proof are out of scope for this directive across all slices. Hermetic proof must not be upgraded into live-external-provider or production-live readiness, and production-shaped evidence, if later authored, must not be treated as production-live evidence. If a human raises live-external-provider or production-live proof to required for any slice, USF-73 or an equivalent proof-execution issue must close first, under a separate signed directive revision.

## Provider Mode and Environment

Provider mode and environment use the controlled vocabulary values and are stated explicitly on every proof and readiness claim. Hermetic, local, sandbox, and live-external claims are kept separate, and production-shaped is kept separate from production-live. Provider mode is never upgraded by environment, and environment is never upgraded by provider mode.

## Schema and Validator Posture

All schemas remain draft. No schema is promoted to active by this directive or by any implementation PR under it unless a separate active-promotion PR satisfies the USF-30 active-promotion criteria. The validator remains the required gate for repository consistency, and every implementation PR must pass the implementation guard and PR diff modes that exist at the time of the PR. Advisory validation is not treated as active validator maturity without a separate promotion change.

## Generated Reports

Generated reports may be cited only as rank-7 summaries with freshness and evidence references. A report never authorises implementation, never replaces proof evidence, never promotes schemas, never defines semantics, and never closes a source-disposition gap. Direct validators and proof records govern.

## Validation Commands

The following commands are required on the PR head before any implementation PR merges, and after merge where applicable:

- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-spec/validate-spec.py imports --json`
- `python3 tools/validate-spec/validate-spec.py instances --json`
- `python3 tools/validate-spec/validate-spec.py evidence --json`
- `python3 tools/validate-spec/validate-spec.py real-instances --json`
- `python3 tools/validate-spec/validate-spec.py implementation --json`
- `python3 tools/validate-spec/validate-spec.py selftest --json`
- `python3 tools/validate-spec/validate-spec.py anchor --anchor-file anchor-payload.json --head HEAD` for any PR that makes or refreshes a proof claim
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`
- the slice's proof command when the PR makes or refreshes a behaviour claim

Strict JSON parse is required for any changed JSON. If implementation files are created, the implementation and PR guardrails must find no unauthorised directory, no missing source disposition, no source-path mirroring, no forbidden path token, no active schema promotion, and no unapproved tooling.

## Implementation Boundaries

Implementation is permitted only in topology-listed, validator-authorised roots, only for files named in the topology plan, and only for slices whose semantic facets and source-use disposition are complete. Unlisted roots are blocked. No runtime code is imported from `../react` without a specific signed source-import authorisation. No directory is created outside the authorised roots. No schema is activated. No proof claim exceeds the proof level observed.

## Non-Goals

- Starting USF-39 or moving USF-39 out of Backlog.
- Creating implementation or runtime code or directories from this directive.
- Importing `../react` runtime or application code.
- Mirroring historical source paths.
- Promoting any schema or the validator to active maturity.
- Claiming live-external-provider or production-live readiness.
- Treating generated reports, CI status, stdout, or unsigned anchors as authority.
- Treating this directive signature as a separate USF-39 start action.
- Creating runtime/tooling scaffold from the recorded TypeScript/Node target before separate implementation authorisation, or importing source to do so.

## Mandatory Stop Conditions

USF-39 remains Backlog, or an implementation PR must stop, when any of these is true:

- the slice being implemented is not named in scope or its semantic facets and source-use disposition are incomplete;
- a destination directory or target file is not listed in the topology plan and the validator authorised-roots set;
- a target path mirrors a historical source path;
- a target file has no source-use disposition row and no reviewed `new-with-rationale` entry;
- an `evidence-only-support` row is used to produce runtime code;
- `../react` runtime or application code is copied without a specific signed source-import authorisation;
- provider mode or environment is missing, ambiguous, or upgraded by the other;
- hermetic proof is treated as live-external-provider proof, or production-shaped evidence as production-live;
- a behaviour claim's proof is stale, missing for the claimed commit, or absent;
- the proof level claimed exceeds the proof level observed;
- a generated report is used as semantic authority, proof evidence, source disposition, or implementation authorisation;
- any schema is marked active, or advisory validation is treated as active maturity, without a separate USF-30 promotion PR;
- required validators or proof commands are not run, fail, or produce stale evidence;
- the directive conflicts with the Charter, Authority Model, accepted ADRs, semantic instances, source-use matrices, topology plan, proof posture, schema posture, generated-report policy, or validator findings.

## Per-Created-File Reconciliation

Every created implementation file includes a closure row in the PR body or a linked closure record naming: the target file; the directive entry that authorises it; the authorised destination directory; the semantic refs; the ADR refs or an explicit no-ADR-change statement; the source-use treatment; the source-use disposition row numbers or `new-with-rationale` entry; the runtime import statement; the validator evidence; the proof or evidence requirement or an explicit no-proof-claim statement; the generated-report treatment; and any deferred work with why it does not weaken the current slice. A PR is incomplete if any created target file lacks this reconciliation.

## Required PR Citation

Every implementation PR under this directive cites: this accepted directive; the target semantic instances it implements; the target files authorised by the topology plan; the source-use disposition rows or `new-with-rationale` entries for each target file; the proof and evidence records used for the claim; the validator commands run on the PR head; and any generated reports only as rank-7 summaries. The PR body states explicitly that source-path mirroring, direct runtime code copy, schema activation, generated-report authority, hermetic-as-live proof, and production-shaped-as-production-live claims are not authorised.

## Acceptance Signature Block

This block records USF-100 acceptance by the authorising human. The earlier unsigned draft state is superseded by the signed values below.

| Field | Value |
|---|---|
| Authorising human (name) | Matthew Aldous |
| Authorisation date | 28 June 2026 (Australia/Melbourne) |
| USF-100 acceptance recorded | Recorded on the USF-100 Linear issue for this signed directive; this is not USF-39 start authority. |
| USF-75 final pre-extraction revalidation passed | Pending immediate revalidation before the separate USF-39 start action. |
| Separate USF-39 start action authorised | Not authorised by this signature; must be issued separately after revalidation. |

The first three lines above complete USF-100 acceptance. Implementation remains unauthorised until final pre-extraction revalidation passes and a separate USF-39 start action is issued. USF-39 remains Backlog.
