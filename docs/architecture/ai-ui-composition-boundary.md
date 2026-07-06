# AI-UI Composition Boundary

| | |
|---|---|
| **Document type** | Architecture governance |
| **Status** | Active. Defines what AI agents may and may not compose for the product UI layer, and the human gate that binds it. |
| **Relates to** | Non-claim `no-real-user-product-ui-readiness`; the incremental proof-acceptance loop (`evidence/proof-evidence/proof-cockpit/`). |

## Purpose

USF is designed so that AI agents can compose and evolve the product UI from governed semantics rather than by imitating source or screenshots. This document draws the boundary: the permitted inputs, the prohibited inputs, and the human decision that must gate the consequence of any AI-composed change.

## Permitted inputs for AI UI composition

An AI agent composing or changing UI **MUST** derive behaviour only from:

- `spec/instances/ui-semantic-model/` — route, form, table, command, permission, validation, state, accessibility, and telemetry semantics;
- `spec/instances/interface-contract/` and `spec/instances/semantic-contract/` — the contracts the UI binds to;
- `spec/instances/*` capability, event, workflow, provider-mode, and environment definitions;
- accepted ADRs under `docs/adr/`.

## Prohibited inputs

An AI agent **MUST NOT** derive UI behaviour from:

- visual design, JSX layout, component names, or screenshots;
- generated reports or the proof cockpit's own rendered pages;
- USF's own source-lineage structure (lineage is evidence, not a copy target).

## The human gate (binding)

AI may propose and compose UI changes, but the **consequence** of any change is gated by human acceptance, exercised through the proof cockpit's incremental acceptance loop:

1. An AI change lands in the semantic/source corpus.
2. The proof process runs (`proof-cockpit:machine-qa` then `proof-cockpit:promote`) and rebinds evidence to the new source — no manual copying.
3. The cockpit computes a per-item evidence fingerprint. Items whose evidence changed return to the review queue as the **affected subset**; unchanged items carry their prior acceptance forward automatically.
4. The accountable human (Matthew Aldous) approves only the affected subset. Approval is recorded per item in `evidence/proof-evidence/proof-cockpit/human-review-actions.json` with the item's fingerprint, and stands until that item's evidence changes again.

This makes AI-led UI change safe by construction: the human approves the consequences of changes, not the whole surface repeatedly, and no AI-composed change is accepted without a fingerprinted human decision.

## Non-claim

This boundary does not itself constitute real-user product-UI readiness. `no-real-user-product-ui-readiness` remains in force until separately proven.
