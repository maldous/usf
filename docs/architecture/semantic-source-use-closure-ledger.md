# Semantic Source-Use Closure Ledger

| | |
|---|---|
| **Document type** | Architecture / semantic-source closure ledger |
| **Status** | Draft / readiness gap ledger |
| **Authority level** | Reviewable planning artefact; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, semantic instances, and source import manifests |
| **Issue scope** | USF-97; USF-100; USF-39 readiness |
| **Base inputs** | `spec/instances/`, `spec/registries/source-import-manifest.json`, `spec/registries/authentication-slice-source-import-manifest.json`, `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `docs/architecture/regeneration-sufficiency-semantic-graph-closure.md`, `docs/architecture/react-l5-equivalence-audit.md` |

This ledger records the current closure state for semantic and source-use breadth beyond the authentication proof substrate. It creates no implementation code, implementation directory, proof evidence, generated report, source import, schema activation, or implementation directive. It does not start USF-39.

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
| `semantic-contract` | 67 | 64 are draft contracts with complete facets (43 cite verified source-import manifest rows; 21 are coverage-complete from the React semantic corpus); 1 is deprecated as superseded; 2 are non-applicable exclusions. Proof is deferred per USF-101/USF-59; per-domain source-use matrices remain open (USF-97/USF-74). |
| `ui-semantic-model` | 1 | Authentication login UI. |
| `workflow` | 2 | Authentication login and identity-context workflows. |

The authentication slice source-use matrix records 159 source rows and authorises zero direct runtime imports. The baseline source import manifest records 1673 historical rows, but those rows are lineage and disposition evidence, not extraction authority.

## Domain Closure Ledger

| Historical domain | Historical capability records | Current USF closure state | Safe next action |
|---|---:|---|---|
| `authentication` | 9 | Partially semantically authored for platform login/session, provider-mode selector, login API, audit, event, UI, workflow, and proof command. Authentication current-commit proof freshness is carried by the post-merge anchor `proof-anchor-fabe47b`; proof remains hermetic-only. | Maintain the anchor publication path, then finish USF-73 and aggregate posture gates before stronger readiness claims. |
| `identity-access` | 13 | Tenant identity, tenant host identity, user membership, and RBAC were already source-backed drafts. Eight further capabilities (end-user profile/preferences, API keys/PATs, tenant groups, sub-organisations, ABAC PDP, entitlement engine, support-mode/break-glass, audit of privileged access) are now source-backed drafts whose facets cite verified source-import manifest rows (proof is hermetic/runtime lineage, not fresh). Only delegated-administration-roles remains a deferred gap contract because its behavioural source (usecases, tests, migration) is not yet in the manifest. | Import delegated-administration source rows (USF-74), then author its source-backed facets; author UI semantic models for the gap uiSemanticDefinition facets; publish fresh proof per USF-101/USF-59. |
| `configuration` | 6 | Provider-mode selector authored for the authentication slice; all six configuration capability contracts (registry/history, branding/theming, custom-domains, write-only secret settings, tenant-domain activation, canonical-domain set/unset) are now source-backed drafts citing verified manifest rows. | Publish fresh proof per USF-101/59; author UI semantic models for gap UI facets. |
| `data-platform` | 6 | Relational-storage/migrations/RLS, backup-and-restore, and history-read-model are now source-backed drafts citing verified manifest rows. PITR/retention/legal-hold, data-governance, and tenant data import/export remain deferred gap contracts because their behavioural source is not yet in the manifest (USF-74 import). | Import the deferred capabilities' source rows, then author their facets; do not create migrations or storage runtime. |
| `developer-platform` | 5 | Two developer-platform capabilities are source-backed complete-facet drafts; API docs/developer portal/SDKs and the OpenAPI-drift gate are coverage-complete drafts; mock-providers is a non-applicable exclusion. Proof deferred. | Author per-domain source-use matrices; import manifest rows (USF-74) for the coverage-complete contracts; publish fresh proof per USF-101/59. |
| `entitlements-billing` | 4 | Two entitlements/billing capabilities are source-backed complete-facet drafts; product-catalog/plans/prices and subscriptions/invoices/payment-methods are coverage-complete drafts. Proof deferred. | Author per-domain source-use matrices; import manifest rows (USF-74) for the coverage-complete contracts; publish fresh proof per USF-101/59. |
| `events-workflow` | 4 | Authentication login workflow/event authored for the current slice; event-bus/DLQ/redrive, scheduled-jobs, and notification delivery are now source-backed drafts citing verified manifest rows. The workflow engine remains deferred (only a placeholder package is in the manifest; provider/closure proofs not yet imported, USF-74). | Import the workflow engine source/proof rows, then author its facets; publish fresh proof per USF-101/59. |
| `foundation` | 11 | Four foundation capabilities are source-backed complete-facet drafts; seven (including accessibility gate, i18n runtime, provider/environment classification, and scope/principles) are coverage-complete drafts. Proof deferred. | Author per-domain source-use matrices; import manifest rows (USF-74) for the coverage-complete contracts; publish fresh proof per USF-101/59. |
| `observability-ops` | 7 | Authentication audit signal exists; logs aggregation, metrics-and-traces, built-in alerting/incidents, internal service catalog/readiness, and tenant service-clickthrough policy are now source-backed drafts citing verified manifest rows. The on-call/status-page alerting contract (matrix row 42) is marked deprecated as superseded by the canonical built-in alerting/incidents contract. | Publish fresh proof per USF-101/59; author UI semantic models for gap UI facets. |
| `search` | 1 | Search-and-indexing is a source-backed complete-facet draft. Proof deferred. | Author the per-domain source-use matrix; publish fresh proof per USF-101/59. |
| `security-governance` | 3 | One security-governance capability is a source-backed complete-facet draft; code-quality/secret/dependency scanning and compliance-reports/access-reviews are coverage-complete drafts. Proof deferred. | Author per-domain source-use matrices; import manifest rows (USF-74) for the coverage-complete contracts; publish fresh proof per USF-101/59. |
| `storage` | 1 | Object storage is a source-backed complete-facet draft. Proof deferred. | Author the per-domain source-use matrix; publish fresh proof per USF-101/59. |
| `support-admin` | 2 | One support-admin capability is a source-backed complete-facet draft; support-tickets/customer-health/announcements is a coverage-complete draft. Proof deferred. | Author per-domain source-use matrices; import manifest rows (USF-74) for the coverage-complete contract; publish fresh proof per USF-101/59. |
| `compute-runtime` | 3 | One compute-runtime capability is a source-backed complete-facet draft; background-workers/job-runner is a coverage-complete draft; serverless-function-runtime is a non-applicable exclusion. Proof deferred. | Author per-domain source-use matrices; import manifest rows (USF-74) for the coverage-complete contract; publish fresh proof per USF-101/59. |

## Closure Classification

| Area | Current classification | Reason |
|---|---|---|
| Authentication proof-substrate semantic graph | Partially closed for reviewable semantic planning | The graph has committed semantic instances, a source-use matrix, and current authentication-slice freshness via `proof-anchor-fabe47b`; provider posture is still hermetic-only and does not define the V2 migration scope. |
| Full platform semantic corpus | Closed at the semantic-contract level; source-use and proof remain open | The 67 semantic-contract targets named by the capability matrix all have instances: 64 complete-facet drafts (43 source-backed by manifest rows, 21 coverage-complete from the React semantic corpus; proof deferred), 1 deprecated, 2 non-applicable. The open work is per-domain source-use matrices and fresh proof, not missing semantic contracts. |
| Full platform source-use closure | Blocking gap | Only the authentication slice has exact source-use row treatment. The baseline manifest is too broad to govern extraction by itself. |
| Current proof freshness | Closed for authentication-slice current-commit freshness; blocking gap for broader proof breadth | ADR 0006, ADR 0007, ADR 0008, the trust root, validator anchor rules, and `proof-anchor-fabe47b` close the current authentication anchor. Other slices still need proof commands and anchors before behaviour readiness claims. |
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

As of the Wave 3 corpus completion, all 67 semantic-contract instances are covered as semantic information: 64 are draft contracts with complete facets (43 cite manifest-verified React source rows as informational lineage; 21 are coverage-complete from React's semantic corpus via the USF coverage record and the equivalence audit), 1 is deprecated as superseded (on-call/status-page alerting), and 2 are not-applicable-final exclusions (serverless function runtime, mock providers). Coverage of everything `../react` covers is therefore complete at the semantic-contract level. `../react` is informational lineage only: no source code is imported, no source-import manifest expansion was performed, and the V2 implementation language is an open decision. Authentication proof freshness is anchored for current main by `proof-anchor-fabe47b`; broader proof remains hermetic lineage or missing until each slice has its own proof command and anchor. Per-facet detail is draft-level and is enriched before generation.

USF-97 is materially advanced by making every capability-matrix semantic-contract target validator-readable as either source-backed complete-facet draft, coverage-complete draft, deprecated, or non-applicable exclusion. The React L5 / USF V2 equivalence audit (`docs/architecture/react-l5-equivalence-audit.md`) further advances USF-97 by classifying all 75 historical capabilities against the controlled equivalence and gap vocabularies and reducing the remaining work to an enumerated, ranked authoring backlog. It is not complete. The next repository-workable step is to replace deferred gap facets with source-backed domain semantics and per-domain source-use matrices, or preserve explicit exclusions where authority says the capability is out of scope.

USF-39 remains Backlog.
