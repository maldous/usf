# Proof Freshness Anchor Carrier Decision

| | |
|---|---|
| **Document type** | Architecture / authority decision requirement |
| **Status** | Draft / human decision required |
| **Authority level** | Reviewable decision proposal; not an accepted ADR and not proof authority |
| **Issue scope** | USF-101; USF-98; USF-59; USF-73; USF-99; USF-100; USF-39 readiness |

This document records the missing authority decision for the proof freshness anchor carrier and trust model. It creates no implementation code, product runtime, source import, proof evidence, generated report, schema activation, accepted ADR, signed anchor, tag, or implementation directive. It does not start USF-39.

## Current Decision State

No existing USF authority currently approves a proof freshness anchor carrier or signer/trust model.

`docs/architecture/proof-freshness-publication-model.md` defines the preferred direction: a post-merge proof evidence anchor that binds a proof payload to a final target commit after that commit exists. It intentionally does not complete the carrier, signer, trust, validator, or publication decision.

The Git practices standard allows annotated tags as lineage anchors, but it does not make signed annotated tags the proof freshness carrier and does not define signer trust. Generated reports, CI status, local stdout, and unsigned payloads remain non-authoritative for proof freshness.

## Recommended Carrier

The recommended carrier for a later accepted decision is a signed annotated Git tag that targets the exact commit being claimed and carries or references the canonical proof freshness anchor payload digest.

Reasons:

- Git tags already belong to the repository lineage model.
- An annotated tag can be created after the target commit exists, avoiding the self-referential commit-hash problem.
- A signature can bind the target commit, payload digest, and signer identity without mutating the target commit.
- Repository-local validation can inspect tag target and payload digest; signer trust can be added once approved.

This recommendation is not approval. A later accepted ADR or equivalent authority decision must explicitly adopt the carrier before it can satisfy USF-101.

## Required Future Decision

The accepted decision must specify:

- accepted carrier type;
- accepted ref or tag naming convention;
- allowed signer identity or trust root;
- whether signature verification is mandatory in local validation, CI, or both;
- canonical payload shape;
- canonical payload digest algorithm;
- target commit binding;
- proof id binding;
- provider mode and environment binding;
- proof level claimed and observed binding;
- freshness semantics;
- treatment of missing, unsigned, untrusted, wrong-target, digest-mismatched, stale, generated-report-only, or CI-only anchors;
- post-merge publication procedure;
- corrective process for an incorrect published anchor.

## Current Repository-Checkable Progress

The proof-only authentication harness can emit a deterministic unsigned anchor payload with:

- target commit;
- proof id;
- provider mode;
- environment;
- proof level claimed and observed;
- live external provider claim;
- production-live claim;
- freshness;
- emitted evidence;
- collected evidence;
- source references;
- canonical payload digest.

The validator has synthetic fail-closed checks for the unsigned payload shape and invariants. These checks do not validate a real carrier or signer and do not make the payload proof authority.

## No-Go Rules

- An unsigned anchor payload is not proof authority.
- A generated report is not an anchor payload.
- CI status is not proof authority.
- Local proof stdout is not proof authority.
- A Git tag is not accepted as proof freshness authority until a later accepted decision defines carrier and trust.
- A wrong-target, digest-mismatched, unsigned, untrusted, stale, or generated-report-only anchor must fail closed.
- Hermetic proof must not satisfy live-external-provider readiness.
- Production-shaped proof must not satisfy production-live readiness.
- USF-39 remains Backlog.

## Current Classification

USF-101 is further advanced by deterministic payload support and fail-closed payload validation scaffolding, but it remains incomplete.

The remaining blocker is human or infrastructure authority: accepted carrier, accepted trust root, signature verification procedure, and actual post-merge proof publication against the target commit.
