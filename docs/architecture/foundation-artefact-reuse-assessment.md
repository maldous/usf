# Foundation Artefact Reuse Assessment

| | |
|---|---|
| **Document type** | Architecture / source-lineage artefact reuse assessment |
| **Status** | Draft / planning |
| **Authority level** | Reviewable planning artefact; subordinate to the Charter, Authority Model, ADRs, validators, proof evidence, source import manifests, and semantic instances |
| **Issue scope** | USF-58 through USF-76 prerequisite chain; does not start USF-39 |
| **Source-lineage evidence basis** | USF's own self-defined source-import registry and semantic corpus, recorded in this repository |
| **USF repository state inspected** | `main` at `e0ec1368b33087ab5767aae4bb927f0850738773` |
| **USF frozen source-lineage baseline** | `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767` |

## Purpose

This assessment records how USF's own recorded source lineage can accelerate the remaining non-implementation prerequisites before USF-39. It treats that source lineage as rank-5 source evidence only (Authority Model §2.5): source implementation sits below semantics, ADRs, validators, and proof.

This document creates no implementation files, imports no runtime/application code, executes no proof, emits no generated report, promotes no schema to active, and does not move USF-39 out of Backlog.

## Current Gate State

The current USF repository already contains merged planning and validation artefacts for much of the prerequisite chain:

- USF-58, USF-60, USF-62, USF-63, USF-64, USF-65, USF-66, USF-67, USF-68, USF-69, USF-70, USF-71, USF-72, USF-74, and USF-76 are Done in Linear.
- USF-59, USF-61, USF-73, USF-75, and USF-39 remain Backlog.
- PR #27 is merged and records that USF-73 cannot close from the current repository state.
- PR #28 is merged and records that no current proof execution substrate is authorised for the authentication slice.
- The current validator baseline passes for `all`, `imports`, `instances`, `evidence`, `real-instances`, and `selftest`.

The remaining blocker is not lack of recorded source-lineage artefacts. It is lack of an authorised current USF proof substrate and fresh current proof evidence for the implementation proof substrate.

## Artefact Inventory

| Source-lineage artefact or family | Observed shape | Primary classification | USF reuse posture |
|---|---:|---|---|
| `v1-file-inventory.json` | 1,673 file rows | source import mapping | Already represented by `spec/registries/source-import-manifest.json`; reuse for no-loss audits and per-slice row selection. |
| `v1-to-v2-path-map.json` | 1,673 path rows | source import mapping | Already represented by baseline manifest and per-slice planning; do not mirror target paths. |
| `v1-command-catalog.json` and `v2-command-map.json` | 377 command rows each | semantic source; validator inspiration | Reuse for command semantics and future command-catalog coverage; package scripts remain historical command evidence only. |
| `v2-decision-catalog.json` and `v2-decision-lineage.json` | 74 decisions and 74 lineage rows | decision source | Reuse as ADR lineage input; do not import as USF ADRs without normalisation to the USF ADR template. |
| `v1-capability-closure.json` | 75 capability rows | semantic source | Already drives `capability-source-coverage-matrix.md`; reuse for further USF-58 semantic expansion. |
| `operational-semantics.json` | 75 capability records | semantic source | Reuse for operational semantics, commands, proof expectations, and future runbook inputs. |
| `event-semantics.json` | 10 event records | semantic source | Reuse for event-contract expansion and validator comparisons. |
| `cross-capability-interactions.json` | 10 interactions | semantic source | Reuse for workflow and cross-capability instance expansion. |
| `ui-capability-model.json` | 28 UI capability records | semantic source | Reuse for UI semantic model expansion; do not read historical JSX as UI authority. |
| `data-and-migration-plan.json` | governance plan with data, migration, backup, restore sections | semantic source; proof-lineage input | Reuse for data/migration semantic instances and backup/restore evidence expectations; do not execute migrations. |
| Environment and config catalogues | 39 config/environment assets and 70 capability/environment rows | semantic source; validator inspiration | Reuse for provider/environment constraints and configuration instances; do not generate runtime config. |
| Readiness gates and proof ladder artefacts | environment gates plus proof-level definitions and reports | semantic source; validator inspiration; generated report where applicable | Reuse rules, not report status; preserve hermetic/live and production-shaped/production-live boundaries. |
| `usf-audit/proof-evidence-index.json` | 173 proof-evidence records | evidence lineage; generated index | Reuse for proof lineage and coverage gap analysis; it is stale source-lineage evidence for USF. |
| `usf-audit/proof-evidence/**` | per-proof JSON records | source-lineage proof records | Reuse as source evidence and proof-command lineage only; not current runtime proof. |
| Runtime inventories under `usf-audit/` | 235 routes, 69 providers, 212 runtime commands, 8 events, 11 workflows, 235 observability records, 109 audit records, 16 storage operations | source evidence; generated inventory | Reuse for semantic coverage comparison and validator hardening; generated inventory remains lower authority than source semantics. |
| Formal model and graph reports | graphs, traceability matrices, assurance reports | generated report; validator inspiration | Reuse as review aids and rule inspiration only; do not treat pass summaries as authority. |
| `tools/v2-readiness/src/rules/**` | rules R1-R62 plus assurance rules | validator inspiration | Reimplement USF-native checks only; do not import rule code. |
| `tools/v2-readiness/tests/**` | golden, fixture, rule, import coverage, proof evidence tests | validator inspiration | Reuse as negative-control design input for USF selftests. |
| `package.json`, `Makefile`, `make/**` | readiness, proof, e2e, env, and quality commands | command semantics; proof lineage | Reuse as command-catalog evidence and directive inputs; do not execute proof commands as USF proof. |
| Runtime proof scripts under `apps/platform-api/scripts/**` | proof runners tied to the recorded runtime package graph | proof lineage; implementation source candidate only under future directive | Evidence-only now; future adaptation requires explicit proof-substrate or implementation directive. |

## Issue Coverage Matrix

| Issue | Source-lineage artefacts that accelerate it | Current USF representation | Remaining gap or decision |
|---|---|---|---|
| USF-58 semantic expansion | capability closure, operational semantics, event semantics, interactions, UI model, data/migration plan, environment/config catalogues | Authored semantic instances plus `capability-source-coverage-matrix.md` | Broad domain corpus is still intentionally deferred beyond the current tracked slice. Future expansion should normalise by domain, not copy JSON wholesale. |
| USF-65 capability/source coverage | file inventory, path map, capability closure, operational semantics, UI model | `docs/architecture/capability-source-coverage-matrix.md` | No immediate gap found for the current proof-substrate gate. Future work can add domain-specific matrices if scope widens. |
| USF-66 authentication gaps | auth capability rows, auth proof inputs, auth routes/tests, session and IdP source evidence | Auth semantic instances and authentication source-use matrix | Done for the tracked slice; future auth implementation still needs a current proof substrate and directive. |
| USF-74 per-domain sub-manifests | baseline inventory, path map, command catalogue, proof evidence index | `spec/registries/authentication-slice-source-import-manifest.json` with 159 rows | Current proof-substrate sub-manifest exists. Additional domain sub-manifests are deferred until new domains enter implementation scope. |
| USF-64 source-use/disposition matrix | file inventory, path map, source import manifest, auth source rows | `docs/architecture/authentication-slice-source-use-disposition-matrix.md` | Current proof-substrate matrix forbids direct runtime import and authorises zero copied rows. |
| USF-60, USF-69, USF-70 validator hardening | readiness rules R1-R62, import coverage tests, proof evidence tests, generated report rules | USF validator modes, selftests, implementation guard and source/evidence resolution hardening | No new immediate validator blocker found from this audit. Candidate future hardening: command-catalog coverage and generated report freshness coverage if those artefacts are authored. |
| USF-62 proof posture | proof ladder, provider/environment gates, proof evidence index, negative-control reports | `docs/architecture/production-proof-posture-matrix.md` | Posture is represented. Current evidence remains stale/historical for USF. |
| USF-73 proof execution | runtime proof scripts, package scripts, Make targets, proof evidence records | `docs/architecture/proof-posture-execution-assessment.md` and PR #28 decline decision | Blocked. The source-lineage artefacts require the recorded runtime package graph/source handlers/adapters/local services and cannot be executed as USF proof without a later substrate directive. |
| USF-59 fresh commit-pinned proof | proof evidence records and proof scripts | Stale historical observability proof lineage exists in USF evidence | Blocked. No fresh current authentication proof record exists or can be produced from the authorised current repository state. |
| USF-68 report policy | generated readiness reports, formal graphs, assurance reports | `docs/architecture/generated-report-readiness-policy.md` | Existing policy is sufficient: generated reports are rank 6 and cannot close proof or semantic gaps. |
| USF-71 directive template | command catalogue, source-use matrix, proof posture, topology, report policy | `docs/architecture/implementation-directive-template.md` | Template exists. It should cite this assessment as an additional input if a future filled directive is drafted. |
| USF-72 post-extraction closure | readiness validators, graph reports, source/evidence references | `docs/architecture/post-extraction-closure-checklist.md` | Closure checklist exists. Future implementation slices must prove they satisfy it after code exists. |
| USF-61 implementation directive specification | all artefact classes above | Template exists; issue remains Backlog due proof gate | Should remain Backlog unless a human explicitly narrows it to a non-authorising planning update or separately authorises a proof substrate. |
| USF-75 final readiness | all validator/proof/report artefacts | Final readiness revalidation issue remains Backlog | Cannot run honestly while USF-59, USF-61, and USF-73 remain blocked. |
| USF-39 implementation extraction | source-use matrix, topology plan, semantic instances, import manifests, proof posture | Backlog only | Must not start. Source-lineage artefacts are not an implementation directive. |

## Reuse Decisions

Source-lineage artefacts that can be used directly as source evidence:

- file inventory and path map, via the existing source import manifests;
- capability closure, operational, event, interaction, UI, data, environment, and config semantics, after USF normalisation;
- command catalogues and package scripts as command/proof-command semantics;
- proof evidence index and per-proof records as source-lineage proof records only;
- readiness rules and tests as validator inspiration only.

Source-lineage artefacts that require normalisation before they can become USF semantics:

- decision catalogue and lineage into USF ADRs;
- capability and operational records into schema-validated semantic instances;
- runtime inventories into source-backed semantic coverage or evidence records;
- provider/environment data into USF-controlled provider-mode and environment instances;
- UI capability records into USF UI semantic model instances.

Source-lineage artefacts that require a new human/source-use decision before stronger use:

- any runtime proof script proposed for execution or adaptation;
- any source file proposed as implementation source material;
- any package, service, app, config, compose, or migration artefact proposed for USF runtime creation;
- any generated report proposed as more than a rank-6 summary.

Source-lineage artefacts that must remain lower-authority:

- generated readiness summaries, assurance reports, formal graph reports, runtime inventories, and collection reports;
- stale source-lineage proof records whose pinned commit is not the current USF commit;
- proof command outputs generated by the recorded source runtime.

## Readiness Implications

This audit does not reveal a safe way to advance USF-73 or USF-59 from the current repository state. The recorded source-lineage proof scripts and Make/package commands are useful lineage and directive inputs, but they depend on runtime implementation, package graph, service topology, and proof harnesses that USF has not authorised.

The next honest non-implementation action, if the human wants further progress before USF-39, is one of:

1. authorise a new proof-substrate planning issue or directive that defines how a current USF proof can run without blind runtime import;
2. expand semantic corpus instances for another domain using USF's own recorded source-lineage semantic artefacts, keeping implementation deferred;
3. add command-catalog or generated-report validator hardening only if a concrete USF artefact is introduced for those domains.

## No-Go Rules

- Do not start USF-39.
- Do not move USF-39 out of Backlog.
- Do not create product implementation/runtime code.
- Do not create implementation-shaped directories.
- Do not import runtime/application code from any external sibling-repository source such as `../external-source`.
- Do not mirror recorded source-lineage paths as USF target paths.
- Do not execute recorded source-lineage proof scripts as USF proof.
- Do not treat recorded source-lineage validator output as current USF proof.
- Do not treat generated reports as authority.
- Do not use stale or hermetic evidence as production/live readiness.
- Do not promote schemas to active.

## Readiness Verdict

READY_WITH_NON_BLOCKING_DEFERRED_WORK for the reuse-assessment step.

NOT_READY_BLOCKING_ISSUES_REMAIN for USF-39 implementation extraction. The blocker remains explicit and current: no authorised proof execution substrate and no fresh current authentication-slice proof evidence exist.
