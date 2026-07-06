# React L5 / USF V2 Equivalence Audit

| | |
|---|---|
| Document type | Architecture / React-to-USF equivalence audit ledger |
| Status | Draft / readiness audit |
| Authority level | Reviewable planning artefact; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and source import manifests |
| Issue scope | USF-102 (umbrella); USF-103–USF-119; reduces USF-97 and USF-98; feeds USF-100; preserves USF-39 Backlog |
| Historical evidence basis | Sibling repository `../react` at commit `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767`, tag `v1-final` (rank-6 historical evidence) |
| USF base state reviewed | `fabe47b8fc70d34b34d1fc05c39da998c74a6748` (origin/main) |

This document is the consolidated React L5 to USF V2 equivalence audit. It harvests `../react` semantic, proof, source-use, build, environment, CI, operational, data, configuration, governance, hexagonal-architecture, and UI evidence and maps each to a USF V2 equivalent, an explicit gap, an explicit exclusion, or an explicit deferral.

It creates no implementation code, implementation directory, product runtime, source import, proof evidence, generated report, schema activation, or implementation directive. It does not start USF-39. It treats `../react` as historical evidence and lineage only (Authority Model rank 6), never as future live authority. It mirrors no `../react` path as a USF path. Every `../react/...` citation is a verbatim historical reference, not a USF target.

## 1. Audit method and authority discipline

The audit was produced by inspecting `../react` read-only and reconciling against the committed USF corpus (`spec/instances/`, `spec/registries/`, `evidence/`, `docs/architecture/`, `tools/validate-spec/`). Findings are classified, not asserted as proof. Per the Authority Model:

- React proof output, generated reports, CI status, and local stdout are not proof authority for USF.
- Hermetic/mock proof is never upgraded to live-external-provider; production-shaped is never upgraded to production-live.
- No React capability is treated as a USF semantic contract until a USF semantic instance and a source-use disposition exist.
- Stale evidence cannot back current readiness.

Numbers attributed to `../react` are observed/approximate and are recorded as lineage, not as USF counts. Numbers attributed to USF are taken from the committed corpus and the existing matrices.

## 2. Equivalence and gap vocabularies

Every audit row uses one equivalence classification and one gap type.

Equivalence classification:

- `v2-equivalent-current` — USF has a source-backed semantic equivalent with fresh, non-stale proof.
- `v2-equivalent-stale-proof` — USF has a source-backed semantic equivalent, but current proof is stale/hermetic-only and blocked by the freshness model.
- `v2-semantic-only` — USF has (or this audit authorises) a semantic record only; no fresh proof and, for deferred items, no completed source-backed facets yet.
- `v2-source-use-only` — carried only as source lineage/disposition evidence; no USF semantic contract yet.
- `react-only-gap` — present in React, absent from USF with no current representation.
- `deferred-post-v2` — intentionally deferred beyond whole-platform V2 scope.
- `excluded-not-applicable` — explicitly out of scope / not-applicable-final.
- `obsolete-do-not-carry` — examined and deliberately not carried forward.
- `unknown-unclassified` — not yet classifiable; requires inspection or human decision.

Gap type:

- `missing-semantic-contract`, `missing-source-use-disposition`, `missing-proof-evidence`, `stale-proof-evidence`, `missing-validator-coverage`, `missing-freshness-anchor`, `missing-human-decision`, `missing-build-toolchain-decision`, `missing-environment-posture`, `missing-hexagonal-architecture-decision`, `missing-ui-port-contract`, `excluded-by-scope`, `no-gap`.

## 3. USF-103 — React L5 audit-base inventory and freeze

The pinned audit base is already enforced by the validator (`tools/validate-spec/validate-spec.py`, `SOURCE_AUDIT_BASE`, rule `USF-IMPORT-013`): repository `../react`, commit `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767`, tag `v1-final`, entry count `1673`. The committed baseline manifest `spec/registries/source-import-manifest.json` carries those 1673 rows; the authentication-slice sub-manifest carries 159 rows (rule `USF-IMPORT-012`). This audit adopts that frozen base; it does not re-pin.

Observed `../react` asset classes (lineage citations; counts approximate):

| Asset class | Representative historical path (lineage) | Manifest source-kind it maps to | Coverage note |
|---|---|---|---|
| Backend source | `../react/apps/platform-api/src/**` | `source-file` (453 rows) | Sampled in baseline, not exhaustive per-file |
| Web app source | `../react/apps/react-enterprise-app/src/**` | `source-file` | Sampled |
| Packages graph | `../react/packages/*` (~40 packages) | `package` (139 rows) | Package units classified (rule `USF-IMPORT-006`) |
| Tests | `../react/apps/**/tests/**`, `../react/packages/**` | `test` (301 rows) | Sampled |
| Proof scripts | `../react/apps/platform-api/scripts/*-runtime-proof.ts` | `proof-script` (99 rows) | Proof units classified (rule `USF-IMPORT-007`) |
| Generated reports | `../react/docs/v2-foundation/usf-audit/*`, `../react/reports/` | `generated-report` (118 rows) | Rank-7 lineage only |
| Semantic docs | `../react/docs/v2-foundation/*.json` | `semantic-artefact` (14 rows) | Governance-critical schemas |
| Migrations | `../react/apps/platform-api/src/db/migrations/*.sql` | `data-migration-artefact` (36 rows) | Safety-sensitive (section 9) |
| Config | `../react/config/environments/*`, `../react/env/` | `configuration-file` (144 rows) | Section 10 |
| Make/CI | `../react/Makefile`, `../react/make/*.mk`, `../react/.github/workflows/*` | `configuration-file` | Section 8 build/CI |
| Compose substrate | `../react/compose.yaml` (~54 services), `../react/docker/`, `../react/infra/` | `configuration-file` | Substrate lineage; not authorised for USF runtime |
| E2E journeys | `../react/e2e/**`, `../react/playwright.*.config.ts` | `e2e-journey` (13 rows) | Profile split internal/build/identity/discovery/external/prod |

Audit-base classification: `v2-source-use-only` / `no-gap` for the frozen inventory itself. Candidate manifest coverage additions worth a future source-disposition decision (do not block whole-platform scope): `../react/make/*.mk` build rules, `../react/tools/semgrep/*` security rules, and `../react/services/mock-oidc/**` substrate. Environment secrets and runtime caches (`../react/.password`, `../react/.npmrc`, `*.rvf`, `*.db`) are `excluded-not-applicable` / `missing-environment-posture` and must remain exclusions, never imported.

USF-103 status: the audit-base is frozen and validator-enforced; the inventory is recorded. Remaining: optional manifest-coverage additions are a bounded source-disposition decision, not a whole-platform blocker.

## 4. USF-104 — Semantic capability equivalence ledger

All 75 historical capability records (`../react/docs/v2-foundation/v1-capability-closure.json`, with `operational-semantics.json`, `event-semantics.json`, `cross-capability-interactions.json`, `ui-capability-model.json`) are represented in the USF corpus: every `semantic-contract.*` target named by `docs/architecture/capability-source-coverage-matrix.md` has an instance (validator rule `USF-SEMANTIC-002` enforces this; baseline is clean). The committed corpus is 87 instances including 67 `semantic-contract` instances.

Classification summary (full per-capability mapping lives in `docs/architecture/capability-source-coverage-matrix.md`; this audit adds the equivalence class):

| Group | Capabilities | Equivalence class | Gap type | Note |
|---|---|---|---|---|
| Authentication/identity proof substrate | platform login+session, IdP/OIDC brokering, claim/role mapping, MFA/session/lockout, OIDC discovery/JWKS, custom-domain auth callback, tenant identity (record+FQDN), user identity+membership, RBAC, tenant host identity | `v2-equivalent-current` for authentication proof freshness; broader identity remains gated | `missing-proof-evidence` for non-auth breadth | Source-backed drafts; current authentication proof freshness is carried by `proof-anchor-fabe47b`; proof remains hermetic-only |
| Real/simulated IdP login, serverless runtime, mock providers (dev/test) | matrix `not-applicable-final` rows | `excluded-not-applicable` | `excluded-by-scope` | Preserve as exclusions; do not implement |
| All remaining historical capabilities (configuration, entitlements-billing, data-platform, events-workflow, compute-runtime, observability-ops, search, storage, security-governance, developer-platform, support-admin, foundation) | ~58 capabilities | `v2-semantic-only` (semantic captured; proof deferred) | `missing-source-use-disposition` / `missing-proof-evidence` | Represented as complete-facet draft contracts (source-backed where manifest rows exist, otherwise coverage-complete from the React semantic corpus); per-domain source-use matrices and manifest import (USF-74) remain open |

Reconciliation of USF-only authority instances back to React evidence: the `ai-governance` (authority-order and proof-freshness-anchor stop conditions), `command.validate-spec-*`, and `environment.*` instances are new USF-only authority (no React L5 equivalent) and are correctly marked as such — they encode USF governance, not historical behaviour.

Distinction preserved: semantic capture (a USF instance exists) is separate from proof freshness and proof breadth. Authentication current-commit freshness is anchored by `proof-anchor-fabe47b`; non-authentication proof remains missing or lineage-only. No contract is inferred from React code; every proof-substrate mapping routes through the authentication-slice source-use disposition matrix (zero direct runtime-copy permission).

Reduced USF-97 gap (smallest authoring set, ranked, post-directive):

1. Replace `v2-semantic-only` deferred facets with source-backed `lifecycle`/`stateModel`/`contracts` facets per implementation-relevant domain, beginning with identity-access, configuration, then data-platform/observability-ops.
2. Author a per-domain source-use disposition matrix (analogue of the authentication-slice matrix) for each domain entering scope, with zero direct runtime-copy.
3. Formalise the `excluded-not-applicable` rows as durable exclusions so they cannot drive generation.

USF-104 deliverable (this ledger + the reduced USF-97 list + the exclusion list) is complete as analysis; it does not author the missing facets (that is USF-97 follow-up) and does not move USF-39.

## 5. USF-105 — Proof ladder and proof-evidence equivalence

React proof ladder (lineage): L0 Discovery → L1 Executable → L2 Contract → L3 Behaviour → L4 Substrate(real-local) → L5 Resilience → L6 Foundation, with `proofLevelClaimed` vs `proofLevelObserved`, provider-usage booleans, and `liveProviderMinimumLevel: 4`. This maps 1:1 to the USF proof-level vocabulary enforced by the validator (`PROOF_LEVEL_ORDER`: `discovery-proven`…`foundation-proven`) and the USF rules `USF-PROOF-001/002`, `USF-EVIDENCE-006/007`, `USF-ANCHOR-004/005/006`.

Proof-equivalence taxonomy (proven / demonstrated / stale / missing / publication-blocked):

| React proof domain (lineage) | React observed level / provider | USF state | Equivalence class | Gap type |
|---|---|---|---|---|
| Authentication / domain-identity (`../react/apps/platform-api/scripts/auth-settings-runtime-proof.ts`, `domain-identity-matrix-runtime-proof.ts`) | L3 behaviour, hermetic/contract | current USF authentication proof freshness is carried by `proof-anchor-fabe47b`; committed JSON remains historical | `v2-equivalent-current` | `no-gap` for authentication freshness; broader identity proof still requires per-slice proof |
| Substrate/resilience/foundation (`l4-*`, `l5-*`, `l6-*-runtime-proof.ts`) | L4–L6, local-composed / sandbox | no fresh USF proof; cited as lineage only | `v2-source-use-only` | `missing-proof-evidence` |
| Data/migration/backup/PITR (`postgres-migration-*`, `backup-local-*`, `pitr-restore-drill-*`) | L3–L4, local-real | lineage only | `v2-source-use-only` | `missing-proof-evidence` (release-blocking before any prod data claim) |
| External-provider integrations (billing/Lago, workflow/Temporal, secrets/OpenBao, storage/MinIO) | L3–L4, in-memory / external-sandbox | lineage only | `v2-source-use-only` | `missing-proof-evidence`; live-external NOT proven and must not be inferred |
| UI/Playwright/a11y journeys (`../react/e2e/**`) | L3, hermetic UI | deferred until UI implementation scope | `deferred-post-v2` | `missing-proof-evidence` |

Lineage vs fresh-required:

- Treat as lineage (cite-only): all React L2–L3 contract/behaviour proofs and L4–L6 local/sandbox proofs. They are valid design input; they are not USF current readiness.
- Require fresh USF execution before any USF readiness claim: the proof-substrate authentication hermetic proof at the current commit is anchored by `proof-anchor-fabe47b`; any multi-environment posture (USF-73) and broad runtime proof (USF-99) still require separate proof.

USF-105 status: taxonomy and equivalence ledger complete. USF-101 and USF-59 are Done for the authentication anchor path; USF-73 and USF-99 remain open for stronger and broader proof.

## 6. USF-106 — Source-use and disposition equivalence

The baseline manifest records 1673 rows with disposition coverage (`preserve` 1083, `replace` 238, `retire` 227, `refactor` 104, `rename` 19, `split` 1, `merge` 1) and zero direct runtime-import authority. The authentication-slice sub-manifest records 159 rows, all reconciled to baseline (rule `USF-IMPORT-009`) with concrete semantic targets (rule `USF-IMPORT-011`) and target-to-instance resolution (rule `USF-IMPORT-014`).

| Source-use area | USF state | Equivalence class | Gap type |
|---|---|---|---|
| Authentication slice (159 rows) | exact per-row disposition; zero runtime-copy | `v2-source-use-only` | `no-gap` |
| All other implementation-relevant domains | covered only by broad baseline rows | `v2-source-use-only` | `missing-source-use-disposition` |
| Safety-sensitive source (migrations, RLS, secrets, break-glass, backup/restore) | lineage only; requires explicit disposition + separate authority before any use | `v2-source-use-only` | `missing-source-use-disposition` (section 9) |

USF-106 status: the authentication slice is closed; per-domain source-use matrices remain the bounded USF-97 follow-up.

## 7. Hexagonal architecture (USF-113) and UI ports/adapters (USF-114)

### 7.1 USF-113 — Hexagonal architecture decision

Evidence that `../react` was materially hexagonal (lineage): explicit `ports/` and `adapters/` directories under `../react/apps/platform-api/src/`; usecases depending on ports, not adapters; dependency-direction enforcement via `../react/.dependency-cruiser.cjs`, `../react/eslint.config.mjs`, and `../react/knip.json`; TypeScript path aliases forcing public-export-only imports; a contracts/domain/adapter/runtime package split under `../react/packages/`; and a UI layer importing only contract/design-system/i18n packages.

ADR 0005 ratifies carrying hexagonal architecture forward as an explicit architecture constraint: domain/ports/adapters separation, acyclic dependency direction, framework isolation, and public-export-only imports. This maps to USF ontology concepts Port (§5.15), Adapter (§5.16), Interface (§5.17), Application (§5.12), Package/Module (§5.13), Service (§5.14).

Classification: `v2-semantic-only` / `no-gap` for the architecture decision. Owning issue: USF-113. Decision authority: ADR 0005. Linear status reviewed as Done.

### 7.2 USF-114 — UI contract / port / adapter readiness ledger

V2 must define UI contracts (ports/adapters/access-gating/accessibility/customisation) WITHOUT defining concrete UI implementation (concrete UI remains an AI-customisation deliverable). React UI boundaries observed (lineage): permission gating (`RequirePermission`), session state (`use-session`), route guards (`_authenticated`), a11y (axe/Playwright), i18n runtime, BFF-only data access, branding/theming via a design system.

| UI contract | Required V2 port/adapter contract | Equivalence class | Gap type |
|---|---|---|---|
| Access-gating (permission → full/read-only/denied + explicit forbidden state) | port bound to `semantic-contract.rbac-roles-and-permissions` | `v2-semantic-only` | `missing-ui-port-contract` |
| Session state machine (loading/authenticated/401/error) | session-source port; states enumerated | `v2-semantic-only` | `missing-ui-port-contract` |
| Accessibility surface | a11y contract per UI capability; axe gate as proof | `v2-semantic-only` | `missing-ui-port-contract` |
| i18n keys | i18n port; keys contractual | `v2-semantic-only` | `missing-ui-port-contract` |
| Branding/customisation | branding port; tenant-aware, no domain logic in UI | `v2-source-use-only` | `missing-ui-port-contract` |
| Login UI | `ui.authentication-login` exists | `v2-equivalent-stale-proof` | `stale-proof-evidence` |

USF-114 status: ledger complete; concrete contracts are USF-97/USF-86 follow-up and must precede UI implementation. No concrete UI is defined here.

## 8. Build/toolchain (USF-107), environment/provider (USF-108), CI/validation (USF-109)

| Area | React (lineage) | USF state | Equivalence class | Gap type |
|---|---|---|---|---|
| Build entrypoint | `../react/Makefile`, `../react/make/*.mk`, `make all` | `target-implementation-topology-plan.md` records topology | `v2-source-use-only` | `missing-build-toolchain-decision` |
| TS/Node/bundler/lint toolchain | `tsconfig*`, `eslint.config.mjs`, `knip.json`, `.dependency-cruiser.cjs` | not yet decided in USF | `v2-semantic-only` | `missing-build-toolchain-decision` |
| Package graph | `../react/packages/*` (~40) | topology plan lists allowed roots only | `v2-semantic-only` | `missing-build-toolchain-decision` |
| Environments | dev/test/staging/prod (`../react/config/environments/*`) | `environment.hermetic`, `environment.production-shaped` instances; `multi-environment-proof-posture-closure.md` | `v2-semantic-only` | `missing-environment-posture` |
| Provider modes | hermetic/compose-local/sandbox-external/live-external (`USF_PROVIDER_MODE`) | `provider-mode.mock-identity-provider` only; `production-proof-posture-matrix.md` | `v2-semantic-only` | `missing-environment-posture` |
| Compose substrate | `../react/compose.yaml` (~54 services), `../react/docker/`, `../react/infra/` | not authorised; topology plan keeps service/infra roots blocked | `v2-source-use-only` | `missing-environment-posture` |
| CI gates | `../react/.github/workflows/*` (quality, architecture, CodeQL) | USF has `.github/workflows/validate-spec.yml` fail-closed gate + advisory validator | `v2-equivalent-current` (spec gate) / `v2-source-use-only` (product gates) | `no-gap` / `missing-validator-coverage` |
| React readiness rules R1–R62 | `../react/tools/v2-readiness/` | mapped by `usf-readiness-rule-coverage-matrix.md`; USF enforces its own rule set | `v2-semantic-only` | `missing-validator-coverage` (partial) |

USF-107/108/109 status: equivalence matrices complete; the concrete toolchain/environment/topology decisions are explicit human/ADR items for the all-slices migration. Authentication is only the current proof substrate, not the scope boundary for V2. Provider mode and environment remain separate dimensions; no upgrade by implication.

## 9. Operational (USF-110), data/migration/storage (USF-111), configuration/secrets/provider (USF-112), security/identity/tenancy/governance (USF-115), observability/events/workflow/reliability (USF-116)

| Area | React (lineage) | USF state | Equivalence class | Gap type |
|---|---|---|---|---|
| Operational commands | `make all`, stage runners, `proof:*` (~100+) | `command.*` instances for validator/auth-proof; `command-operational-coverage-proof-slice-plan.md` | `v2-source-use-only` | `missing-semantic-contract` |
| Migrations / RLS / tenant isolation | `../react/apps/platform-api/src/db/migrations/*.sql` | `data.identity-schema` lineage; `data-migration-backup-restore-proof-slice-plan.md` | `v2-source-use-only` | `missing-semantic-contract` (safety-sensitive) |
| Backup / restore / PITR / retention / legal-hold | `../react/scripts/backup/*`, `pitr-restore-drill-*` | planning docs only | `v2-source-use-only` | `missing-proof-evidence` |
| Object storage (tenant prefixes, signed URLs, quota) | `../react/apps/platform-api/src/.../tenant-storage*` | deferred gap contract; `storage-data-governance-assurance-slice-plan.md` | `v2-semantic-only` | `missing-semantic-contract` |
| Configuration / secrets / provider settings | `../react/config/environments/*`, OpenBao, `USF_PROVIDER_MODE` | `configuration.provider-mode-selector` (non-secret proof-substrate scope) | `v2-semantic-only` | `missing-semantic-contract` |
| Security/identity/tenancy/governance | RLS, ABAC, break-glass, audit-of-privileged-access | authority-order AI stop condition + identity drafts; rest deferred | `v2-semantic-only` / `v2-equivalent-stale-proof` | `missing-semantic-contract` |
| Observability/events/workflow/reliability | observability signals, event bus/DLQ, workflow engine, resilience | `observability.authentication-login-audit`, `event.authentication-login-audit`, `workflow.*` for the slice; rest deferred | `v2-semantic-only` | `missing-semantic-contract` |

Safety-sensitive source-use notes (MUST carry explicit disposition; MUST NOT be imported as runtime without separate authority): destructive migrations and migration order/checksum-immutability; RLS policies and `bypass_rls` audit; secret generation/rotation and OpenBao routing; admin/break-glass bootstrap; backup/restore (destructive). These are `v2-source-use-only` with `missing-source-use-disposition` and are flagged here so no future pass treats them as ready.

USF-110/111/112/115/116 status: equivalence matrices complete; each names the owning USF-97 authoring follow-up. No migration, secret, storage, or runtime artefact is created.

## 10. USF-117 — Machine-readable equivalence ledger (proposed shape)

Activation is blocked (no schema for an equivalence ledger is authorised, and the validator is intentionally clean). This audit therefore records a draft/proposed ledger shape and a stable vocabulary, without activating a schema or a validator rule (consistent with USF-117 allowing draft/proposed artefacts).

Proposed per-row fields: `reactArtefactPathOrId`, `reactClaimType`, `reactProofLevelObserved`, `reactEvidenceOrSourceKind`, `sourceImportRowOrMissingMarker`, `usfSemanticEquivalent`, `usfProofOrEvidenceEquivalent`, `usfValidatorCoverage`, `equivalenceClassification` (section 2 set), `gapType` (section 2 set), `requiredNextAction`, `linkedUsfIssue`, `usf39BlockerStatus`.

Stability: the equivalence and gap vocabularies in section 2 are stable and documented. Fail-closed candidates for a FUTURE validator rule (not implemented here; each would require a planted defect and a selftest, per `USF-SELFTEST-001` discipline): a rule asserting every equivalence row carries a classification token from the controlled set; a rule asserting `liveExternalProviderClaim`/`productionLiveClaim` in any equivalence row obeys the same posture floor already enforced for proof evidence (`USF-EVIDENCE-007`, `USF-ANCHOR-005/006`). These are recorded as USF-117/USF-98 follow-up, not activated.

USF-117 status: ledger format + vocabulary defined and documented; initial stale-readiness and directive-structure validator coverage is now present, while full machine-readable equivalence-ledger coverage remains follow-up.

## 11. USF-118 — Whole-platform V2 scope and implementation-directive readiness inputs

Exact inputs a human-filled USF-100 directive can consume (this audit does not fill the directive):

- Whole-platform scope: all semantic slices in the V2 corpus. Authentication has the existing proof-substrate boundary and 159-row source-use matrix, but it is not the migration scope boundary.
- Architecture constraint: hexagonal (section 7.1) — ratified by ADR 0005; USF-113 is Done.
- Proof floor: hermetic-mock at the current commit for every slice making a behaviour claim; live-external and production-live explicitly out of whole-platform scope unless later separately authorised and proven.
- Source-use: zero direct runtime-copy; every source-derived unit dispositioned.
- Exclusions: the `not-applicable-final` capabilities (section 4) stay excluded.
- Hard stop conditions: missing per-slice proof anchor for a behaviour claim; any stale proof used as current readiness; any hermetic→live or shaped→live upgrade; any schema activation; any forbidden path token; USF-39 movement without separate authority.

USF-118 status: readiness inputs assembled; the directive itself remains a human deliverable (USF-100).

## 12. USF-119 — Final equivalence rollup and reduced blocker set

What React L5 fully proved (lineage): contract/behaviour and local/sandbox substrate/resilience/foundation proofs across the platform. What USF has equivalently captured: the full semantic-contract corpus (64 complete-facet drafts, 1 deprecated, 2 non-applicable) plus governance, command, environment, and machine-readable bootstrap-mapping instances. What USF has equivalently proven fresh: the authentication proof-substrate freshness anchor for current main at hermetic-mock/hermetic/behaviour-proven. What is deferred/excluded: staging, production, live-external-provider, deployment, and production-live proof (ADR 0009 dev/test boundary), plus deprecated/not-applicable capabilities.

Child-audit closure (USF-102 subtree): USF-103, USF-104, USF-105, USF-106, USF-113, and USF-118 are Done; the USF-107 through USF-112 and USF-114 through USF-116 audit classifications are complete in sections 3 through 9 of this document and are closed on that basis; USF-117 (machine-readable equivalence ledger) is materially advanced by the bootstrap-mapping corpus (`spec/registries/bootstrap-mapping-index.json`, `spec/schemas/bootstrap-mapping.schema.json`, and `tools/validate-bootstrap`) and is carried forward for full per-claim validator coverage.

Decisions now recorded (removing prior blockers): the V2 runtime target is TypeScript/Node, and the local dev/test boundary, provider targets, tenant-isolation/RLS/break-glass controls, and proof deferrals are recorded in `docs/architecture/bootstrap-readiness-governance.md` and ADR 0009 and enforced by `tools/validate-bootstrap` (clean). Bootstrap marker readiness is `READY_FOR_V2_BOOTSTRAP`.

Smallest truthful remaining set to a local dev/test bootstrap implementation start (root-first), both human:

1. USF-100: the whole-platform implementation directive draft exists and is validator-clean, but it is UNSIGNED and cannot start USF-39.
2. USF-39 start: a separate explicit human start action, after a USF-75 revalidation.

Owned and deferred (not blocking the bootstrap start): USF-97 per-domain source-use disposition matrices (USF-74 manifest import is needed only if source-derived adaptation is chosen for a slice; a semantic-first, new-with-rationale generation needs none); USF-98 and USF-117 deeper validator coverage (full equivalence ledger, aggregate posture gates); USF-73 and USF-99 staging/production/live/runtime proof (accepted deferral under ADR 0009).

USF-39 remains Backlog and is not started.

## 13. No-go rules preserved

No implementation/runtime code or directories created; no React runtime/application code imported; no React path mirrored; no schema activated; no proof freshness falsified; no generated report treated as authority; no stale proof used as current readiness; no hermetic proof upgraded to live-external; no production-shaped upgraded to production-live; USF-39 remains Backlog.

## 14. Validation

This document is reviewable planning evidence only. It authorises no implementation and promotes no schema. The validator suite (`validate-spec all/imports/instances/evidence/real-instances/implementation/selftest` and PR diff mode) is run for the PR that introduces this document; results are recorded in the PR.

## 15. Current readiness verdict

Bootstrap marker readiness is `READY_FOR_V2_BOOTSTRAP` (`validate-bootstrap` clean; the current main commit carries its matching immutable proof anchor). Complete one-pass implementation readiness remains NO-GO only on the two human gates: a signed USF-100 directive and a separate USF-39 start action (after a USF-75 revalidation). The V2 runtime decision (TypeScript/Node) and the local dev/test boundary are recorded and validator-enforced; USF-101 and USF-113 are Done; USF-103 through USF-106 and USF-118 are Done and the USF-107 through USF-116 audit classifications are closed; USF-117, USF-98, and USF-97 are carried forward as owned non-blocking work; USF-73 and USF-99 are accepted deferrals. React L5 knowledge is harvested as acceleration input. USF-39 remains Backlog.
