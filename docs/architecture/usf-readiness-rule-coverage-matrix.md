# USF Readiness Rule Coverage Matrix

| | |
|---|---|
| **Document type** | Architecture / readiness rule coverage matrix |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Reviewable planning artefact; subordinate to the Charter, Authority Model, accepted ADRs, validators, semantic instances, proof evidence, source import manifests, and any later filled implementation directive |
| **Issue scope** | USF-93 |
| **Basis** | `tools/validate-spec/validate-spec.py`, `tools/validate-spec/planted-defects/`, `spec/instances/`, `spec/registries/source-import-manifest.json`, `spec/registries/authentication-slice-source-import-manifest.json`, `evidence/`, and the architecture gate documents under `docs/architecture/` |

This matrix defines the USF readiness rule set and records, for each rule, whether current USF validator coverage, semantic/proof coverage, or an explicit gap addresses it. It imports no external validator code, creates no implementation/runtime code, creates no implementation directory, emits no generated report, promotes no schema, and does not start USF-39.

## Scope and Coverage Boundary

The USF readiness rule set is numbered R1 through R37 and R40 through R62. R38 and R39 are intentionally unassigned (see below).

Each rule is assigned one coverage status:

- **covered**: a USF validator, semantic artefact, proof/evidence record, or gate document already addresses the rule intent for the current repository scope;
- **partial**: USF covers the authentication proof-substrate slice or a governance subset, but broader platform/runtime coverage remains intentionally deferred;
- **deferred**: the rule depends on implementation/runtime artefacts, production/live posture, broad semantic expansion, or generated report families that do not yet exist in USF;
- **not applicable**: the rule addresses a concern that USF governance supersedes.

Generated reports remain lowest authority. No report's pass/fail output is treated as current USF proof or semantic authority.

## Readiness Rule Matrix

| Rule | Readiness intent | USF coverage status | USF coverage or explicit gap |
|---|---|---|---|
| R1 placeholder | Reject unresolved placeholders in closure claims. | covered | Schema hollow-value checks, fixture/selftest coverage, and reviewable governance docs reject unsupported placeholder completion language. |
| R2 capability-integrity | Prevent delivered/proven capability claims with missing routes, contracts, permissions, readiness, proof, or open actions. | partial | Semantic-contract schema and instances cover the current authentication slice; full capability integrity across all capabilities remains deferred to future semantic expansion and USF-75. |
| R3 zero-gap-honesty | Reject false zero-gap claims while gaps remain. | covered | Authority Model, generated-report policy, closure checklist, proof posture docs, and USF validator evidence/report rules require explicit gaps and fail-closed wording. |
| R4 vocabulary | Confine controlled values to canonical vocabularies. | covered | USF enum/vocabulary binding rules USF-ENUM-* and catalogue integrity rules enforce canonical values and alias rejection. |
| R5 count-buckets | Reconcile inventory/path-map bucket counts. | covered | USF import validator rules USF-IMPORT-001 through USF-IMPORT-012 check baseline and authentication sub-manifest shape, counts, uniqueness, canonical controlled values, and target concept safety. |
| R6 package-removal | Ensure deprecated packages are removed or explicitly conditioned. | not applicable | USF is self-originating and has no target package removal cutover. Source disposition is handled by import manifests and implementation coverage matrices instead. |
| R7 soft-mapping | Ensure deletion/retirement metadata and decision refs are real. | covered | Source import manifests require canonical dispositions and coverage records; future implementation files must reconcile to a coverage treatment or new-with-rationale. |
| R8 runbook-tooling | Ensure runbook tooling exists, is scripted, and records the audited commit. | partial | USF validate-spec command instances and evidence freshness cover current validation/proof commands; broad operational runbook command coverage remains deferred. |
| R9 gate-blocker | Fail the gate while required completion, deprecated package removal, or open decisions remain. | covered | USF-39 remains Backlog until a filled directive and prerequisite gates exist; implementation validator rules USF-IMPL-* and PR guardrails fail unauthorized implementation artefacts. |
| R10 file-coverage | Prove inventory, shards, path map, and audited tree bijection. | covered | Baseline source import manifest preserves 1,673 rows and no-loss validation; authentication sub-manifest reconciles its 159-row slice to baseline. |
| R11 command-coverage | Reconcile live Make/npm commands with command catalogue and map. | partial | USF command instances cover current validation and proof commands; a full command-catalog coverage validator is deferred until broader command artefacts are authored. |
| R12 test-coverage | Reconcile live tests and proof scripts with inventories and maps. | partial | USF evidence/proof validators and authentication proof command cover the current proof-only slice; no product runtime test corpus exists yet. |
| R13 decision-governance | Require accepted decisions and lineage for platform decisions. | covered | ADR template/canon, ADR instances, real-ADR validation, and semantic reference checks cover accepted USF decision records. |
| R14 foundation | Require shaped foundation artefacts and governed contract roots. | covered | Foundational artefacts, schema registry, taxonomy/vocabulary catalogues, and validate-spec all cover the USF foundation baseline. |
| R15 app-path | Ensure application root agreement. | not applicable | Application-root layout is governed by USF implementation topology planning; no app directories are authorized or created yet. |
| R16 services | Reconcile compose services with service/clickthrough/SSO matrix. | deferred | USF has no service topology. Future service/runtime claims require USF-61 directive scope, topology authorization, source-use coverage, and proof evidence. |
| R17 migrations | Reconcile SQL migrations with data and backup/restore decisions. | partial | Data-migration instance and storage/data governance planning cover semantic intent; runtime migrations, backup, restore, PITR, and production data proof are deferred. |
| R18 environment-config | Reconcile env/config consumption and unsafe defaults. | partial | Provider-mode/environment/configuration instances and safety validators cover hermetic mock constraints; full runtime env/config consumption is deferred until implementation exists. |
| R19 executable-assets | Map executable assets to command targets. | partial | Current proof-only and validation commands are represented; broad executable asset inventory is deferred. No runtime executable tree exists in USF. |
| R20 harness-semantics | Ensure semantic reference harness definitions are consistent. | partial | USF instances and real-instances validation cover semantic references; no product UI/runtime harness exists yet. |
| R21 observability-baseline | Ensure baseline observability assets exist. | partial | USF observability vocabulary, signal instances, and observability proof evidence exist; live/current route-level observability runtime proof remains deferred. |
| R22 semantic-completeness | Require mandatory semantic assets and complete facets for delivered capabilities. | partial | USF semantic-contract schema, instances, and facet safety rules cover current instances; broad delivered-capability facet closure is not claimed. |
| R23 proof-classification | Require proof inventory classifications, environment/provider, command, and failure modes. | covered | Proof-evidence and evidence-envelope schemas, evidence validator rules, and authentication proof records enforce provider, environment, proof level, freshness, and failure semantics. |
| R24 environment-semantics | Require provider/data/tenant/secret/network/proof semantics per environment. | partial | Hermetic authentication environment/provider semantics are covered; multi-environment dev/local/sandbox/live/production semantics are deferred. |
| R25 cross-capability-semantics | Require owned interaction contracts with consistency, compensation, security/audit, source, and proof semantics. | partial | Authentication workflows and interaction graph are represented; broad cross-capability interaction closure is deferred. |
| R26 event-semantics | Require owned, versioned, idempotent, bounded, private, tenant-safe events. | partial | Authentication audit event and observability signal are represented; full event family assurance remains deferred. |
| R27 operational-semantics | Require deploy, migration, backup/restore, degraded/recovery, observability, runbook, incident, and proof semantics. | deferred | Operational assurance beyond the authentication proof/readiness slice is deferred until broader semantics and implementation-entry directives exist. |
| R28 semantic-source-of-truth | Make USF semantic artefacts the source of truth for implementation. | covered | Charter, Authority Model, source import policy, implementation coverage matrices, and implementation directive template establish USF semantics as the source of truth over any implementation. |
| R29 environment-readiness-gates | Define environment gates, proof levels, provider policy, and contradiction checks. | partial | USF proof/evidence pipeline, production proof posture matrix, provider/environment validators, and proof substrate authorization cover hermetic slice gates; stronger environments remain unproven. |
| R30 graph-integrity | Reject graph orphan nodes, dangling refs, cycles, duplicate identities, and missing ownership chains. | partial | Instance reference validation and USF-88 graph closure cover current semantic slice; complete platform graph-integrity validation is deferred. |
| R31 state-machine-soundness | Require reachable lifecycle states and valid transitions. | deferred | No broad USF lifecycle state-machine corpus exists yet; workflow semantic coverage exists only for current authentication slice. |
| R32 traceability-closure | Close traceability across capabilities, proofs, events, environments, interactions, and UI semantics. | partial | Current authentication slice has traceability through instances, evidence, implementation coverage matrices, and USF-88; broad platform traceability is deferred. |
| R33 environment-completeness | Complete capability x environment matrix. | deferred | USF intentionally does not claim complete multi-environment matrix coverage. |
| R34 constraint-satisfaction | Enforce semantic implication constraints. | partial | Existing validators enforce proof overclaim, provider/environment misuse, report/evidence boundaries, schema/value integrity, and import/source constraints; broader constraint set remains deferred. |
| R35 semantic-closure | Require runtime-discovered behaviours to have semantic representation. | partial | Current authentication proof/readiness slice is semantically represented; runtime-discovered behaviours cannot be checked until implementation/runtime exists. |
| R36 regeneration-sufficiency | Reconstruct graphs from semantic artefacts alone. | partial | USF-88 closes the current authentication slice for capability, interaction, event, environment, UI, provider, data, and command graphs; broad regeneration remains deferred. |
| R37 semantic-entropy | Reject duplicate or contradictory concepts and definitions. | partial | USF ID uniqueness, duplicate instance/evidence checks, enum binding, and reviewable governance reduce entropy; broad semantic-entropy validator is deferred. |
| R40 operational-assurance | Require complete operational assurance per capability. | deferred | No product operations runtime exists. Future implementation must satisfy USF-61 and post-extraction closure. |
| R41 observability-assurance | Require route/trace/log/metric/alert and audit coverage. | partial | Observability vocabulary/signals and proof lineage exist for current slice; route-level runtime observability assurance is deferred. |
| R42 security-assurance | Govern permissions, policy, audit, secrets, classification, and risk. | partial | Authentication/RBAC semantics and configuration secret-safety checks exist; full runtime security assurance is deferred. |
| R43 audit-assurance | Trace mutations to audit event semantics and correlation. | partial | Authentication login audit semantics exist; full mutation/audit runtime inventory assurance is deferred. |
| R44 event-assurance | Require event owner, producer, consumer, schema, retry/DLQ, retention, and privacy semantics. | partial | Authentication login audit event has producer/consumer semantics; complete event assurance is deferred. |
| R45 environment-assurance | Require provider, proof, promotion, rollback, tenant data, network, and secret policy per capability/environment. | partial | Hermetic authentication posture is represented; multi-environment assurance is deferred. |
| R46 data-assurance | Require owner, classification, retention, backup, restore, export, legal hold, DSR, lineage. | partial | Identity data semantic planning exists; runtime data governance proof is deferred. |
| R47 dependency-assurance | Require explicit owned dependencies and risks. | partial | Current authentication dependencies are explicit in workflow/provider/config instances and topology plans; broad dependency assurance is deferred. |
| R48 reliability-assurance | Require timeout/failure/retry/circuit-breaker/degraded/fallback/recovery semantics. | partial | Provider-mode selector and proof failure semantics cover current hermetic slice; runtime reliability behaviour is deferred. |
| R49 capability-coverage | Cover each capability across semantics, proofs, events, environments, operations, security, audit, observability, and governance. | partial | Current authentication slice has coverage; full 75-capability coverage is not claimed. |
| R50 runtime-alignment | Align semantics with proof and runtime evidence. | partial | Current proof evidence aligns with semantic instances; future runtime alignment waits for implementation and fresh runtime proof. |
| R51 route-observability-assurance | Require route-level trace/log/metric/correlation/proof/mutation-audit evidence. | deferred | No product routes exist in USF. Current interface semantics are not runtime route evidence. |
| R52 route-security-assurance | Prove auth, permission, tenant, policy, fail-closed, and audit boundaries at interface level. | deferred | Interface/security semantics exist for planning, but runtime route proof is deferred. |
| R53 ownership-assurance | Require explicit operational/security/data/runtime ownership evidence. | partial | Semantic/governance ownership is represented for the slice; runtime ownership evidence is deferred. |
| R54 proof-behaviour-assurance | Classify runtime proofs by behaviour, side effects, and failure modes. | covered | Proof-evidence schema and authentication proof record require claim exercised, proof levels, emitted/collected evidence, failure semantics, provider mode, environment, and freshness. |
| R55 storage-assurance | Require storage isolation, quota, lifecycle, AV, legal hold, audit, observability, and proof. | deferred | Storage/data governance planning exists; runtime storage assurance is outside the current authentication slice. |
| R56 workflow-assurance | Require workflow state, transitions, idempotency, retry, timeout, compensation, audit, observability, recovery, and proof. | partial | Authentication workflow instance exists; broad runtime workflow assurance is deferred. |
| R57 event-runtime-assurance | Require runtime emitted event proof with payload, producer/consumer, retry/DLQ, retention, privacy, correlation. | deferred | Authentication event semantics exist, but runtime event emission assurance awaits implementation/proof. |
| R58 metrics-alerts-assurance | Require metrics, thresholds, alert owners/routing, runbooks, and emission proof. | deferred | Observability vocabulary exists, but runtime metric/alert proof and runbooks are deferred. |
| R59 data-governance-runtime-assurance | Require runtime proof for data governance behaviours. | deferred | Data governance runtime proof is outside the current slice. |
| R60 provider-reliability-runtime-assurance | Require provider adapter/config/secret/failure/recovery/misconfiguration proof. | partial | Hermetic provider-mode/config semantics and proof failure rules exist; runtime adapter reliability proof is deferred. |
| R61 semantic-orphan-runtime-assurance | Reject semantic/runtime/proof/route/event/metric/audit/alert/provider/environment orphans. | partial | Instance/evidence reference checks catch current semantic/evidence orphans; runtime orphan checks wait for implementation. |
| R62 formal-proof-evidence-assurance | Require formal proof evidence references and assurance report integrity. | partial | USF evidence validators require proof/evidence shape and references; generated formal reports remain lowest authority and no current formal proof report is authority. |

## Unassigned Rule Numbers

R38 and R39 are intentionally unassigned. Future work MUST NOT invent readiness requirements for these numbers without a new recorded decision.

## Validator Gap Routing

Current validator coverage is sufficient for the present pre-implementation gate because it covers:

- schema, catalogue, enum, registry, and fixture integrity;
- semantic instance validation and reference resolution;
- source import manifest no-loss and slice reconciliation;
- evidence/proof shape, freshness, proof overclaim, live-provider overclaim, and source/evidence reference resolution;
- real-instance ADR and validator-report checks;
- implementation/PR guardrails for unauthorized implementation paths, source disposition, source-path mirroring, forbidden names, and active schema promotion;
- selftest planted defects.

Known validator gaps are deferred rather than silently closed:

- full command-catalog coverage beyond current validation/proof command instances;
- broad semantic graph integrity, traceability closure, state-machine soundness, and semantic entropy checks;
- runtime route, storage, provider reliability, workflow, event, metric, alert, and production/live assurance;
- generated formal report validation beyond the existing report/evidence safety checks.

Those gaps route to USF-61, USF-75, USF-39, or future domain-specific semantic/proof issues depending on the claim being made. They are not blockers for this coverage matrix because this artefact records them explicitly.

## No-Go Rules

- Do not treat any generated report as current USF proof or semantic authority.
- Do not start USF-39.
- Do not create implementation/runtime code or directories.
- Do not promote schemas to active.
- Do not upgrade hermetic proof to live-external-provider or production-live readiness.

## Validation Expectations

This matrix is mergeable only when these commands pass on the PR head:

- `python3 tools/validate-spec/validate-spec.py all --json`;
- `python3 tools/validate-spec/validate-spec.py selftest --json`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`.

Strict JSON parse is required for any changed JSON. This document changes no JSON.

## Readiness Verdict

READY_WITH_NON_BLOCKING_DEFERRED_WORK for readiness rule coverage mapping.

NOT_READY_BLOCKING_ISSUES_REMAIN for implementation extraction. USF-39 remains Backlog and is not started by this matrix.
