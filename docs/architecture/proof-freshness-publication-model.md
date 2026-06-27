# Proof Freshness Publication Model

| | |
|---|---|
| **Document type** | Architecture / proof freshness publication model |
| **Status** | Draft / blocker-progress model |
| **Authority level** | Reviewable model; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-101; USF-59; USF-73; USF-98; USF-99; USF-100; USF-39 readiness |

This document records the safest current model for publishing fresh proof evidence without weakening USF authority. It creates no implementation code, product runtime, source import, proof evidence, generated report, schema activation, or implementation directive. It does not start USF-39.

## Problem

Committed proof evidence can truthfully record historical proof for the commit named in its `freshness.commit` field. It cannot, by itself, truthfully solve current-commit freshness for the same commit that contains the evidence update when that update changes the commit hash.

The existing validator fails closed when committed evidence or generated reports claim `freshness.stale` as false for a commit other than the current repository commit. That rule is correct and must not be weakened. The missing piece is a publication mechanism that can bind proof evidence to the final commit after that commit exists.

Generated reports, local tool stdout, and CI job status are useful signals. They are not proof authority and must not be promoted above runtime proof evidence.

## Chosen Model

The preferred model is a post-merge proof evidence anchor:

- the target commit is merged first;
- the proof harness runs against exactly that target commit;
- the harness emits a deterministic proof payload for the target commit;
- an evidence anchor is published after the target commit exists;
- the anchor identifies the target commit, proof id, provider mode, environment, observed proof level, evidence references, and payload digest;
- the anchor is signed or otherwise bound to an approved attestation identity;
- validator support checks the anchor and fails closed when the anchor is missing, unsigned, untrusted, mismatched, or inconsistent with committed evidence.

The anchor may be a signed annotated Git tag, a dedicated signed evidence ref, or another deliberate post-merge attestation carrier. The carrier choice still needs explicit authority and infrastructure approval before USF-101 can be marked complete.

`docs/architecture/proof-freshness-anchor-carrier-decision.md` records the current decision state: no carrier or signer/trust model is accepted yet. It recommends a signed annotated Git tag for later approval, but the recommendation is not proof authority and does not complete USF-101.

## Authority Rules

- Runtime proof evidence remains above generated reports.
- Generated reports remain lowest-authority readiness summaries.
- CI status can show that a workflow ran, but it is not proof evidence by itself.
- A signed post-merge anchor can carry current proof publication only after the repository defines the accepted carrier, signer trust, payload shape, and validator checks.
- Committed JSON evidence remains historical unless its freshness claim is valid for the checked commit or it is referenced by an accepted post-merge anchor model.
- A PR must not claim current readiness by changing evidence or report JSON to `freshness.stale: false`; the current-commit claim belongs in the post-merge publication path.

## Validator Expectations

The validator must preserve these fail-closed checks:

- stale evidence cannot satisfy current readiness;
- non-stale committed evidence must match the checked commit;
- generated reports cannot upgrade proof authority;
- changed PR evidence/report JSON cannot carry a non-stale freshness claim before post-merge publication;
- future anchor validation must verify the target commit, payload digest, proof identity, provider mode, environment, proof level, freshness, and signer or attestation trust.

Until anchor validation exists, complete one-pass readiness remains NO-GO.

## Proof Harness Expectations

The proof harness may run without writing evidence and may emit execution signal. That signal is not committed proof authority.

Future proof publication support may emit a deterministic anchor payload for the target commit. Creating or signing the anchor is a publication step, not product implementation. It must not import React runtime code, create product runtime, or upgrade hermetic evidence to live-external-provider or production-live evidence.

The current authentication proof harness can emit that deterministic unsigned payload for review and future signing. The unsigned payload is not proof authority; it becomes relevant only if a later accepted carrier/trust decision binds it to a signed post-merge anchor.

## No-Go Rules

- No committed JSON evidence freshness self-claim that becomes stale after merge.
- No generated report treated as proof authority.
- No local stdout treated as proof authority.
- No unsigned or untrusted anchor accepted as current proof evidence.
- No wrong-target anchor accepted.
- No hermetic-mock proof upgraded to live-external-provider.
- No production-shaped proof upgraded to production-live.
- No USF-39 movement out of Backlog from this model alone.

## Current Classification

USF-101 is materially advanced by this publication model, the PR freshness guard, deterministic unsigned payload support, and payload invariant selftests, but it is not complete. Completion still requires an approved anchor carrier, signer or attestation trust model, validator carrier/signature verification, planted defects for those checks, and a successful fresh proof publication against the target commit.

USF-39 remains Backlog.
