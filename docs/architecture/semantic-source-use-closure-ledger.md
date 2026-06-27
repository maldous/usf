# Semantic Source-Use Closure Ledger

| | |
|---|---|
| **Document type** | Architecture / semantic-source closure ledger |
| **Status** | Draft / readiness gap ledger |
| **Authority level** | Reviewable planning artefact; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, semantic instances, and source import manifests |
| **Issue scope** | USF-97; USF-100; USF-39 readiness |
| **Base inputs** | `spec/instances/`, `spec/registries/source-import-manifest.json`, `spec/registries/authentication-slice-source-import-manifest.json`, `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `docs/architecture/regeneration-sufficiency-semantic-graph-closure.md`, `docs/architecture/react-l5-equivalence-audit.md` |

This ledger records the current closure state for semantic and source-use breadth beyond the authentication-centered slice. It creates no implementation code, implementation directory, proof evidence, generated report, source import, schema activation, or implementation directive. It does not start USF-39.

## Current Corpus State

The committed semantic corpus currently contains 87 instance files:

| Instance category | Files | Closure note |
|---|---:|---|
| `ai-governance` | 2 | Authority-order and proof-freshness-anchor approval stop conditions. |
| `audit-event` | 1 | Authentication login audit slice. |
| `command` | 6 | Validator and authentication proof commands. |
| `configuration` | 1 | Provider-mode selector for authentication slice. |
| `data-migration` | 1 | Identity schema semantic lineage. |
| `environment` | 2 | Hermetic and production-shaped environment semantics; not production-live proof. |
| `event-contract` | 1 | Authentication login audit event. |
| `interface-contract` | 1 | Authentication login API. |
| `observability-signal` | 1 | Authentication login audit signal. |
| `provider-mode` | 1 | Mock identity provider only. |
| `semantic-contract` | 67 | Five authentication/identity contracts are source-backed drafts; 62 additional capability-matrix targets are explicit deferred or non-applicable gap contracts. |
| `ui-semantic-model` | 1 | Authentication login UI. |
| `workflow` | 2 | Authentication login and identity-context workflows. |

The authentication slice source-use matrix records 159 source rows and authorises zero direct runtime imports. The baseline source import manifest records 1673 historical rows, but those rows are lineage and disposition evidence, not extraction authority.

## Domain Closure Ledger

| Historical domain | Historical capability records | Current USF closure state | Safe next action |
|---|---:|---|---|
| `authentication` | 9 | Partially semantically authored for platform login/session, provider-mode selector, login API, audit, event, UI, workflow, and proof command. Current proof evidence remains stale and hermetic-only. | Finish USF-101, USF-59, USF-73, and aggregate posture gates before using as current readiness. |
| `identity-access` | 13 | Tenant identity, tenant host identity, user membership, and RBAC were already source-backed drafts. Eight further capabilities (end-user profile/preferences, API keys/PATs, tenant groups, sub-organisations, ABAC PDP, entitlement engine, support-mode/break-glass, audit of privileged access) are now source-backed drafts whose facets cite verified source-import manifest rows (proof is hermetic/runtime lineage, not fresh). Only delegated-administration-roles remains a deferred gap contract because its behavioural source (usecases, tests, migration) is not yet in the manifest. | Import delegated-administration source rows (USF-74), then author its source-backed facets; author UI semantic models for the gap uiSemanticDefinition facets; publish fresh proof per USF-101/USF-59. |
| `configuration` | 6 | Provider-mode selector authored for the authentication slice; all six configuration capability contracts (registry/history, branding/theming, custom-domains, write-only secret settings, tenant-domain activation, canonical-domain set/unset) are now source-backed drafts citing verified manifest rows. | Publish fresh proof per USF-101/59; author UI semantic models for gap UI facets. |
| `data-platform` | 6 | Relational-storage/migrations/RLS, backup-and-restore, and history-read-model are now source-backed drafts citing verified manifest rows. PITR/retention/legal-hold, data-governance, and tenant data import/export remain deferred gap contracts because their behavioural source is not yet in the manifest (USF-74 import). | Import the deferred capabilities' source rows, then author their facets; do not create migrations or storage runtime. |
| `developer-platform` | 5 | Developer-platform targets are explicit deferred or non-applicable semantic-contract instances. | Replace deferred facets with source-backed contracts or preserve non-applicable exclusions before generation. |
| `entitlements-billing` | 4 | Entitlement and billing targets are explicit deferred gap contracts. | Author entitlement, billing, metering, and quota contracts before generation. |
| `events-workflow` | 4 | Authentication login workflow/event authored for the current slice; event-bus/DLQ/redrive, scheduled-jobs, and notification delivery are now source-backed drafts citing verified manifest rows. The workflow engine remains deferred (only a placeholder package is in the manifest; provider/closure proofs not yet imported, USF-74). | Import the workflow engine source/proof rows, then author its facets; publish fresh proof per USF-101/59. |
| `foundation` | 11 | Foundation targets are represented by existing governance instances or explicit deferred gap contracts. | Add scoped foundation contracts and posture classifications without promoting reports or stale proof. |
| `observability-ops` | 7 | Authentication audit signal exists; logs aggregation, metrics-and-traces, built-in alerting/incidents, internal service catalog/readiness, and tenant service-clickthrough policy are now source-backed drafts citing verified manifest rows. The on-call/status-page alerting contract (matrix row 42) is marked deprecated as superseded by the canonical built-in alerting/incidents contract. | Publish fresh proof per USF-101/59; author UI semantic models for gap UI facets. |
| `search` | 1 | Search is represented as an explicit deferred gap contract. | Author or keep excluded before implementation use. |
| `security-governance` | 3 | Authority-order AI stop condition exists; remaining security-governance targets are explicit deferred gap contracts. | Author governance, audit, and security contracts before implementation use. |
| `storage` | 1 | Object storage is represented as an explicit deferred gap contract. | Author or keep excluded before implementation use. |
| `support-admin` | 2 | Support-admin targets are explicit deferred gap contracts. | Author or keep excluded before implementation use. |
| `compute-runtime` | 3 | Compute-runtime targets are explicit deferred or non-applicable semantic-contract instances beyond proof-command representation. | Author or preserve exclusions for worker, function, and secret-runtime semantics before implementation use. |

## Closure Classification

| Area | Current classification | Reason |
|---|---|---|
| Authentication-centered semantic graph | Partially closed for reviewable semantic planning | The graph has committed semantic instances and a source-use matrix, but current proof evidence remains stale and provider posture is hermetic-only. |
| Full platform semantic corpus | Blocking gap narrowed | The 67 semantic-contract targets named by the capability matrix now have instances. Most non-authentication instances are deferred gaps or non-applicable exclusions, not completed source-backed facets. |
| Full platform source-use closure | Blocking gap | Only the authentication slice has exact source-use row treatment. The baseline manifest is too broad to govern extraction by itself. |
| Current proof freshness | Blocking gap | The proof freshness publication model exists, but accepted anchor carrier, trust model, anchor validator, and fresh publication are not complete. |
| Implementation directive readiness | Blocking gap | No human-filled directive exists and USF-39 remains Backlog. |

## No-Go Rules

- Do not start USF-39.
- Do not move USF-39 out of Backlog.
- Do not create implementation/runtime code.
- Do not create implementation/runtime directories.
- Do not import runtime/application code from `../react`.
- Do not mirror historical source paths as target paths.
- Do not treat the baseline source manifest as implementation permission.
- Do not treat generated reports as authority.
- Do not use stale historical evidence as current proof.
- Do not upgrade hermetic proof to live-external-provider.
- Do not upgrade production-shaped evidence to production-live.
- Do not promote schemas to active.

## Validation

This ledger is reviewable planning evidence only. The accompanying validator rule makes capability-matrix semantic-contract target coverage repeatable, but the ledger itself does not authorize implementation or promote schemas.

## Current Readiness Verdict

Complete one-pass implementation readiness remains NO-GO.

As of the Wave 3 corpus harvest, 43 of the 67 semantic-contract instances are source-backed drafts whose facets cite manifest-verified React source rows (identity-access, configuration, data-platform partial, events-workflow partial, observability-ops partial, entitlements-billing partial, developer-platform partial, security-governance partial, foundation partial, compute-runtime partial, storage, search, support-admin partial); the remainder are honest deferred gaps (behavioural source not yet in the manifest, pending USF-74 import), governance/decision-framework concepts, or not-applicable-final exclusions.

USF-97 is materially advanced by making every capability-matrix semantic-contract target validator-readable as either source-backed draft, deferred gap, or non-applicable exclusion. The React L5 / USF V2 equivalence audit (`docs/architecture/react-l5-equivalence-audit.md`) further advances USF-97 by classifying all 75 historical capabilities against the controlled equivalence and gap vocabularies and reducing the remaining work to an enumerated, ranked authoring backlog. It is not complete. The next repository-workable step is to replace deferred gap facets with source-backed domain semantics and per-domain source-use matrices, or preserve explicit exclusions where authority says the capability is out of scope.

USF-39 remains Backlog.
