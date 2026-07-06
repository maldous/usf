# Full Functional Completeness Readiness Directive

| | |
|---|---|
| Document type | Architecture / readiness directive (planning) |
| Status | Draft / planning — no implementation authorised by this document |
| Authority level | Reviewable planning directive; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and any future implementation directive |
| Follows | `docs/architecture/charter.md`, `docs/architecture/authority-model.md`, `AGENTS.md` |
| Primary inputs | `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/usf-readiness-rule-coverage-matrix.md`, `docs/architecture/foundation-completeness-audit.md`, `docs/architecture/target-implementation-topology-plan.md`, `docs/architecture/bootstrap-source-use-disposition-matrix.md`, `docs/architecture/complete-readiness-blocker-register.md`, the `spec/instances/` corpus, and USF's own recorded source lineage |
| Companions | `docs/architecture/foundation-ui-agnostic-readiness-boundary.md`, `docs/architecture/functional-scope-classification-matrix.md`, `docs/architecture/full-parity-linear-tracking-plan.md` |
| Repository state | The repository already contains the authorised local dev/test bootstrap runtime (PR #88/#89, USF-39). This directive and this pass introduce no new implementation/runtime code, no schema promotion, no proof execution, no copied source, and no source-path mirroring. |

> **Normative language.** **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** carry BCP 14 / RFC 2119 intent.

This directive establishes the **bar** for full functional completeness readiness of the USF foundation as USF defines and proves it from its own artefacts. The repository already contains the authorised local dev/test bootstrap runtime (PR #88/#89). This directive itself creates no new implementation files, imports no runtime code, executes no proof, emits no generated report, promotes no schema to active, and creates no Linear semantic authority. It is planning authority only.

## 1. Purpose

USF-39 closed the **local dev/test bootstrap** scope only (PR #88, PR #89; runtime bootstrap marker `v2-bootstrap` intentionally held at `91e3aac`). Bootstrap closure is **not** full foundation dev readiness and **not** full functional completeness of the USF non-UI foundation.

This directive defines, before any further implementation resumes, the complete coverage bar: every implementation-relevant capability, service, route, workflow, job, port, adapter, provider behaviour, validation rule, command, proof, and test-backed behaviour recorded in USF's source lineage MUST be **accounted for** and assigned exactly one disposition (§4). No foundation-relevant behaviour, and no recorded source-lineage test or proof, may be silently omitted.

## 2. Authority and scope boundary

2.1 This document is **planning/directive scope only**. It does **NOT** authorise the next runtime/product/provider implementation scope. Implementation resumes only under a separate, explicit, human-approved implementation directive that names exact roots, files, source-use treatment, proof posture, validator changes, non-goals, and acceptance criteria (per `target-implementation-topology-plan.md` and `implementation-directive-template.md`).

2.2 USF is self-defined: its source implementation sits at **rank-5 source lineage** (Authority Model §2.5), below semantics, ADRs, validators, and proof. Source paths are held in USF's own source-import registry, not an external authority. That source lineage MUST NOT be copied, path-mirrored, or treated as live authority. Behaviour is recovered into USF semantics, not imitated from source.

2.3 This directive MUST NOT be used to upgrade bootstrap proof to broader readiness, to treat `hermetic-mock` as `live-external-provider`, to treat `production-shaped` as `production-live`, or to claim staging/production/deployment/live-provider readiness. Those remain separately authorised and separately proven (Charter §6; Authority Model §4.4).

2.4 **Naming and structure conformance.** Per Charter §1.3 and the Strict Naming Rules in `AGENTS.md`, the tokens `v2`, `legacy`, `old`, `new`, `temp`, `transitional`, and a redundant `usf` segment MUST NOT appear in canonical USF path names. The artefacts named by this directive therefore use the established `source-lineage-*` convention (as in `usf-readiness-rule-coverage-matrix.md`, where `source-lineage` names the UI framework) and omit the forbidden `legacy` token from filenames. The word is retained only where this document quotes the forbidden-token list.

## 3. The foundation-vs-UI scope rule

The USF foundation has **no UI/UX runtime**. "Full functional completeness" does **NOT** mean copying or rebuilding the React SPA UI.

3.1 The USF foundation is, and MUST remain, **UI-agnostic**: it is the set of semantic contracts, capabilities, ports, adapters, API/runtime surface, schemas, proof, validation, and AI-consumable integration surface. UI/UX is a downstream consumer concern, generated or implemented later from foundation contracts and capability metadata.

3.2 Foundation readiness MUST NOT require browser UI implementation, source-lineage component migration, visual/UX migration, or Playwright/browser end-to-end testing.

3.3 React UI/UX artefacts — components, pages, browser flows, DOM behaviours, visual states, CSS, layout, interaction flows — are **NOT** foundation artefacts. They MUST be **classified**, not migrated into the foundation.

3.4 Any business, API, authorization, tenant-isolation, workflow, provider, audit, data, notification, file/storage, observability, or validation behaviour currently proven **only** through a UI or Playwright/browser test MUST be **rewritten as a foundation-level test** (API / capability / port / adapter / contract / proof). The UI assertions of such a test are out of foundation scope; the underlying behaviour is in scope.

3.5 The detailed boundary, the per-capability AI-UI integration readiness surface, and the validator expectations for this rule are defined in `docs/architecture/foundation-ui-agnostic-readiness-boundary.md`.

## 4. Disposition model (the bar)

Every implementation-relevant item recorded in USF's source lineage, and every recorded source-lineage test/proof, MUST be assigned exactly one **disposition status**. The model reuses the existing controlled coverage vocabulary (see `foundation-completeness-audit.md`, `usf-readiness-rule-coverage-matrix.md`) and adds two UI-scope statuses.

Foundation-behaviour statuses:

- `migrated` — implemented in the USF foundation behind a semantic contract, with USF tests/proofs.
- `covered` — already represented by an existing USF capability/contract/test; no new work needed.
- `partial` — partially represented; remaining work tracked by a Linear blocker.
- `missing` — foundation-relevant, not yet represented; tracked by a Linear blocker.
- `deferred` — intentionally deferred beyond this readiness scope; tracked by a Linear issue with a retry condition.
- `deprecated` — examined and deliberately not carried forward, with evidence.
- `not-applicable` — out of scope for the foundation, with rationale.
- `requires-human-decision` — semantic authority is missing/unclear; blocked pending a human semantic decision.

UI-scope statuses (new):

- `ui-ux-only-out-of-foundation-scope` — UI/UX-only artefact (rendering, layout, navigation, DOM, visual, CSS); out of foundation scope.
- `foundation-behaviour-rewritten-from-ui-test` — underlying foundation behaviour extracted from a UI/Playwright test and (to be) rewritten as a foundation-level API/capability/port/adapter/contract/proof test.

4.1 Every `partial`, `missing`, `deferred`, or `requires-human-decision` item MUST be carried by a Linear blocker; no blocker may live only in a markdown report. The carrier is scoped to the level of decomposition reached:

- **Current planning stage (this pass).** The matrix classifies at domain granularity. The domain-level `partial` set is carried, explicitly and sufficiently, by the umbrella planning blocker **USF-133**, with **USF-135** carrying completeness-coverage enforcement and **USF-136** carrying the `requires-human-decision` semantic-authority items. These three are the present blocker carriers; the absence of the 12 per-domain children does **not** make this matrix non-compliant.
- **Per-domain children are gated.** The 12 `parity-*` children that decompose the domains to item-level rows are created only **after** a human-approved implementation directive authorises the corresponding domain (see `full-parity-linear-tracking-plan.md` §2). They are enumerated now, not created now.
- **After a domain is authorised.** Once an implementation directive opens a domain, each item-level `partial`/`missing`/`requires-human-decision` row enumerated in that domain MUST have its own tracked blocker before that row may be acted on.

4.2 No item may be `migrated` without USF tests/proofs. No recorded source-lineage test/proof may be left unclassified. No `requires-human-decision` item may be treated as resolved.

4.3 **Matrix shape.** Each coverage row carries: `source_item_id`, `category` (service|port|adapter|route|job|workflow|provider|command|event|schema|migration|config|observability|audit|test|proof|ui|other), `source_paths[]`, `source_tests[]`, `source_proofs[]`, `behaviour_summary`, `usf_status` (one of §4), `usf_paths[]`, `usf_tests[]`, `usf_proofs[]`, `semantic_authority` (known|missing|unclear), `source_use_disposition` (preserve|replace|refactor|retire|rename|split|merge), `linear_issue`, `blocking_foundation_readiness` (bool), `evidence`, `retry_condition`. This shape is recorded in `functional-scope-classification-matrix.md`. Formalising it as a JSON Schema under `spec/schemas/` and wiring a validator is **deferred** to the implementation phase (§6, §7).

## 5. Inventory substrate (do not duplicate)

The source-lineage inventory required to populate the coverage model **already exists** across these artefacts, which are the authoritative substrate. This directive references them rather than re-deriving them (Charter non-goal: no duplication; AGENTS.md: reuse existing artefacts):

- `capability-source-coverage-matrix.md` — 75 recorded capabilities → USF semantic targets/gaps (67 with semantic-contract instances).
- `usf-readiness-rule-coverage-matrix.md` — 60 recorded readiness rules → USF coverage (covered/partial/deferred/not-applicable).
- `foundation-completeness-audit.md` — comprehensive per-asset-class coverage audit over USF's frozen source-lineage base (`v1-final`), using the controlled coverage vocabulary.
- `bootstrap-source-use-disposition-matrix.md` and `authentication-slice-source-use-disposition-matrix.md` — source-use disposition for the bootstrap and authentication slices.
- `semantic-source-use-closure-ledger.md`, `source-import-coverage-plan.md`, `complete-readiness-blocker-register.md` — closure ledger, import coverage, and current blocker state.
- The `spec/instances/` corpus — 66 `semantic-contract` + 66 `bootstrap-mapping` instances.

The genuinely **new** lens this directive adds — absent from the substrate above — is the **foundation-vs-UI scope classification** and the **test/proof classification** (especially Playwright/browser E2E), recorded in `functional-scope-classification-matrix.md`.

## 6. The classification questions this pass answers

This planning pass answers, at domain granularity (detail in the scope-classification matrix):

- What functionality does USF's recorded source lineage contain? — 36 packages, 2 apps (platform-api, react-enterprise-app), 1 dev service (mock-oidc), 12 foundation domains, ~15 provider integrations.
- Which services/ports/adapters/routes/jobs/workflows/provider-contracts/commands/tests/proofs exist? — inventoried per domain in the scope-classification matrix.
- Which are foundation-relevant? — the 12 domains in §6 of the scope-classification matrix.
- Which are UI/UX-only and out of foundation scope? — the `react-enterprise-app` SPA, `ui-design-system`, and the UI/visual/build E2E suites.
- Which Playwright/browser tests contain foundation behaviour to be rewritten? — the focused rewrite list in the scope-classification matrix (auth/identity broker flow, tenant isolation/RLS, authorization matrix, request instrumentation/observability, security headers, cookie security, error safety, admin authorization gates).
- Which are deprecated / not applicable? — recorded with rationale.
- Which require human semantic authority before migration? — recorded as `requires-human-decision` with a Linear blocker.
- Which Linear issues must exist before implementation resumes? — the umbrella + per-domain children in `full-parity-linear-tracking-plan.md`.

## 7. Validation expectations

7.1 For this planning pass (no runtime change), the required gates are: strict JSON parse of any changed JSON; `python3 tools/validate-spec/validate-spec.py all --json` and `selftest`; `python3 tools/validate-bootstrap/validate-bootstrap.py all --json` and `selftest`; `git diff --check`. `make verify` MUST remain green.

7.2 **Deferred validator hardening (NOT built in this pass; implementation scope).** A later authorised implementation pass MUST add completeness-coverage enforcement and a `make parity` target that fails closed when: the coverage matrix has `missing` items; has `partial`/`requires-human-decision` items without a Linear blocker; has unclassified source-lineage tests/proofs; has a `migrated` item lacking USF tests/proofs; claims foundation readiness while the matrix is incomplete; claims Playwright/browser E2E as required for foundation readiness; ignores a UI test without classification; classifies a UI test that contains foundation behaviour wholly out of scope; marks a capability UI-ready without route/port/schema/test evidence; or adds source lineage/UI/browser runtime artefacts without separate authorisation. That pass MUST add planted defects proving each failure, formalise the §4.3 matrix shape as a `spec/schemas/` schema, and make `make verify` include `make parity` before any readiness claim is admissible.

## 8. Readiness wording (mandatory)

Until the bar is met, the only truthful claim is:

> Local dev/test bootstrap exists, but full functional completeness of the USF non-UI foundation is not complete.

Foundation dev readiness, when claimed, means: **all foundation-relevant behaviours recorded in USF's source lineage are migrated, tested, proven, or explicitly classified, and every recorded source-lineage test/proof is ported, rewritten, covered, deprecated, not-applicable, or tracked.** It does **NOT** mean the UI/UX is migrated. The foundation is UI-agnostic and prepared for future AI-assisted UI development through contracts, schemas, ports, adapters, examples, and proof-backed capability surfaces.

The phrases "full application ready", "UI ready", "UX ready", "Playwright complete", "browser E2E complete", "production ready", and "live-provider ready" MUST NOT be used unless separately authorised and proven.

## 9. Stop conditions

An agent MUST stop and request human decision on: any attempt to implement runtime/product/provider scope without a new directive; any attempt to treat the local dev/test bootstrap as full dev readiness; any attempt to commit `.codex/` artefacts as source authority; any attempt to migrate React UI/UX into the foundation; any attempt to require Playwright/browser E2E for foundation readiness; a `requires-human-decision` (missing semantic authority) item; an unclassified source-lineage test/proof; or any validation failure.

## 10. Boundary statement

This directive establishes the completeness readiness bar, the foundation-vs-UI scope rule, the disposition model and matrix shape, the inventory substrate references, and the Linear tracking and validation expectations. It authorises **no** runtime, product, or provider implementation. The next implementation scope remains **awaiting human approval**.
