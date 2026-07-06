# Foundation UI-Agnostic Readiness Boundary

| | |
|---|---|
| Document type | Architecture / scope boundary (normative planning) |
| Status | Draft / planning |
| Authority level | Reviewable planning boundary; subordinate to the Charter, Authority Model, accepted ADRs, validators, and proof evidence |
| Follows | `docs/architecture/charter.md`, `docs/architecture/authority-model.md`, `docs/architecture/superseded-lineage-closure-provenance.md` |
| Primary inputs | USF's own recorded UI and test source lineage; `spec/schemas/ui-semantic-model.schema.json`; `spec/instances/ui-semantic-model/`; `docs/architecture/ui-journey-accessibility-proof-slice-plan.md` |
| Repository state | This pass introduces no UI/React/browser artefacts, no Playwright, and no new implementation code. The repository already contains the authorised local dev/test bootstrap runtime (PR #88/#89), which has no UI/browser surface. |

> **Normative language.** **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** carry BCP 14 / RFC 2119 intent.

This document fixes the boundary between the **USF foundation** (in scope) and **UI/UX** (out of foundation scope, a downstream consumer concern). It creates no UI, no browser pages, no frontend routes, no component trees, no CSS, no visual snapshots, and no browser E2E infrastructure.

## 1. The boundary

1.1 **Foundation = semantic contracts, capabilities, ports, adapters, API/runtime, proof, validation, and AI-consumable integration surface.** The foundation has no UI/UX runtime.

1.2 **UI/UX = downstream consumer concern.** UI is generated or implemented later, from foundation contracts and capability metadata, including by AI-assisted UI definition. It is not part of foundation readiness.

1.3 The foundation MUST be **agnostic to the end-user experience** while being **fully prepared for future UI development**. A future UI (human- or AI-built) MUST be able to build against the foundation because every foundation-relevant capability is callable, discoverable, testable, and documented through contracts or metadata (§3).

1.4 Foundation readiness MUST NOT require: browser UI implementation; React component migration; visual/UX migration; or Playwright/browser end-to-end testing. None of these are foundation artefacts.

## 2. Classifying React UI and Playwright artefacts

No React UI test may disappear silently. Every React UI/Playwright/browser artefact MUST be classified into exactly one outcome:

- **UI/UX-only, out of foundation scope** (`ui-ux-only-out-of-foundation-scope`) — the artefact proves UI rendering, layout, navigation, selectors, DOM, browser-only state, CSS, visual behaviour, or accessibility-of-rendered-DOM. Classified, not migrated.
- **Underlying foundation behaviour migrated and tested elsewhere** (`covered` / `migrated`) — the behaviour the UI test exercised is (or will be) proven by a foundation-level test.
- **Mixed UI/foundation behaviour split** (`foundation-behaviour-rewritten-from-ui-test`) — the UI assertions are out of scope; the underlying foundation behaviour is extracted and rewritten as a foundation-level test (API / capability / port / adapter / contract / proof). The split MUST be recorded and the foundation portion tracked.
- **Requires human decision** (`requires-human-decision`) — classification cannot be made without a human semantic decision.

2.1 **Playwright handling.** A Playwright/browser test that proves UI rendering, layout, navigation, selectors, browser-only or visual state is `ui-ux-only-out-of-foundation-scope`. A Playwright/browser test that proves business capability, authorization, tenant isolation, workflow, API, validation, audit, notification, file/storage, provider interaction, or data behaviour MUST be rewritten as a foundation-level test. A test that mixes both is split.

2.2 Playwright MUST NOT be added to the USF foundation unless a separate UI/runtime scope is explicitly authorised.

2.3 The concrete classification of USF's own recorded UI/Playwright/E2E source lineage — and the focused list of foundation behaviours currently proven only via UI/Playwright that MUST be rewritten — lives in `docs/architecture/functional-scope-classification-matrix.md`.

## 3. AI-UI integration readiness surface (per capability)

The foundation must be **ready for future UI development** without containing any UI. For each foundation-relevant capability, the foundation MUST expose or record enough machine-readable, test-backed surface for a human or AI to build UI against it later. Specifically, each capability MUST have, or have a tracked plan for:

- semantic contract (`spec/instances/semantic-contract/…`);
- API route or callable port where applicable;
- request/response schemas;
- OpenAPI coverage where externally reachable;
- validation errors and failure modes;
- permission/authorization expectations;
- tenant-context requirements;
- audit/event side effects;
- provider requirements (and provider mode);
- fixture or example payloads;
- tests proving behaviour (foundation-level, not browser);
- source-use disposition;
- parity matrix entry;
- known UI-relevant affordances or metadata where appropriate (e.g. the `ui-semantic-model` instances).

3.1 "UI-ready" for a capability means this surface exists and is test-backed. A capability MUST NOT be marked UI-ready without route/port/schema/test evidence.

## 4. Validator expectations (deferred to implementation)

A later authorised implementation pass MUST strengthen validators so they fail closed if: full foundation readiness claims Playwright/browser E2E as required; React UI tests are ignored without classification; a UI test containing foundation behaviour is classified wholly out of scope; a capability needed by a future UI has no API/port/schema/test surface; the parity matrix has unclassified UI/UX items; the foundation claims UI/UX readiness; or the foundation adds UI/React/browser artefacts without separate authorisation. That pass MUST add planted defects for: an unclassified Playwright test; a UI-only test incorrectly marked `migrated`; a mixed UI/foundation test with the foundation behaviour dropped; a capability marked UI-ready without route/port/schema/test evidence; and a foundation PR adding UI/browser artefacts without authority. These checks are **not** built in the current planning pass.

## 5. Readiness wording

The foundation is **UI-agnostic** and prepared for future AI-assisted UI development through contracts, schemas, ports, adapters, examples, and proof-backed capability surfaces. "UI ready", "UX ready", "Playwright complete", and "browser E2E complete" MUST NOT be used as foundation-readiness claims. Future UI/UX work is tracked separately and is **not** foundation-blocking (see `full-parity-linear-tracking-plan.md`).
