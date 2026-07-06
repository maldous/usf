# Proof Freshness Publication Model

| | |
|---|---|
| **Document type** | Architecture / proof freshness publication model |
| **Status** | Draft / implemented publication model |
| **Authority level** | Reviewable model; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and runtime proof evidence |
| **Issue scope** | USF-101; USF-59; USF-73; USF-98; USF-99; USF-100; USF-39 readiness |

This document records the safest current model for publishing fresh proof evidence without weakening USF authority. It creates no implementation code, product runtime, source import, proof evidence, generated report, schema activation, or implementation directive. It does not start USF-39.

## Problem

Committed proof evidence can truthfully record historical proof for the commit named in its `freshness.commit` field. It cannot, by itself, truthfully solve current-commit freshness for the same commit that contains the evidence update when that update changes the commit hash.

The existing validator fails closed when committed evidence or generated reports claim `freshness.stale` as false for a commit other than the current repository commit. That rule is correct and must not be weakened. The missing piece is a publication mechanism that can bind proof evidence to the final commit after that commit exists.

Generated reports, local tool stdout, and CI job status are useful signals. They are not proof authority and must not be promoted above runtime proof evidence.

## Chosen Model

The implemented model is a post-merge proof evidence anchor:

- the target commit is merged first;
- the proof harness runs against exactly that target commit;
- the harness emits a deterministic proof payload for the target commit;
- an evidence anchor is published after the target commit exists;
- the anchor identifies the target commit, proof id, provider mode, environment, observed proof level, evidence references, and payload digest;
- the anchor is bound to the approved repository CI attestation identity;
- validator support checks the anchor and fails closed when the anchor is missing, unsigned, untrusted, mismatched, or inconsistent with committed evidence.

The accepted carrier is an attested annotated Git tag: `.github/workflows/proof-anchor.yml` attests the deterministic anchor payload with the repository CI identity, verifies the attestation in CI, then publishes the payload as an annotated tag on the exact merge commit. ADR 0006 records the original signed-tag carrier lineage, ADR 0007 records the CI trust identity, and ADR 0008 amends the implemented carrier wording to "attested annotated tag" so the repository does not overclaim that the Git tag object itself is a GPG-signed tag.

For the reviewed main commit `fabe47b8fc70d34b34d1fc05c39da998c74a6748`, the successful proof-anchor workflow run `28286276338` published `proof-anchor-fabe47b`. That tag targets the merge commit and carries a payload whose `freshness.commit` equals the merge commit, `providerMode` is `hermetic-mock`, `environment` is `hermetic`, `proofLevelObserved` is `behaviour-proven`, `liveExternalProviderClaim` is false, and `productionLiveClaim` is false.

## Authority Rules

- Runtime proof evidence remains above generated reports.
- Generated reports remain lowest-authority readiness summaries.
- CI status can show that a workflow ran, but it is not proof evidence by itself.
- A CI-attested post-merge anchor can carry current proof publication only when the accepted carrier, trust identity, payload shape, validator checks, attestation verification, and tag publication all succeed for the target commit.
- Committed JSON evidence remains historical unless its freshness claim is valid for the checked commit or it is referenced by an accepted post-merge anchor model.
- A PR must not claim current readiness by changing evidence or report JSON to `freshness.stale: false`; the current-commit claim belongs in the post-merge publication path.

## Validator Expectations

The validator must preserve these fail-closed checks:

- stale evidence cannot satisfy current readiness;
- non-stale committed evidence must match the checked commit;
- generated reports cannot upgrade proof authority;
- changed PR evidence/report JSON cannot carry a non-stale freshness claim before post-merge publication;
- anchor validation must verify the target commit, payload digest, proof identity, provider mode, environment, proof level, freshness, and signer or attestation trust.

Complete one-pass implementation readiness can still remain NO-GO even when a proof anchor exists, because semantic/source-use closure, per-slice proof breadth, and the human implementation directive are separate gates.

## Proof Harness Expectations

The proof harness may run without writing evidence and may emit execution signal. That signal is not committed proof authority.

Future proof publication support may emit a deterministic anchor payload for the target commit. Creating or signing the anchor is a publication step, not product implementation. It must not import source-lineage runtime code, create product runtime, or upgrade hermetic evidence to live-external-provider or production-live evidence.

The current authentication proof harness emits the deterministic payload used by the proof-anchor workflow. Local unsigned payloads remain non-authoritative; proof freshness requires the CI-attested payload and published annotated tag for the merge commit being claimed.

## No-Go Rules

- No committed JSON evidence freshness self-claim that becomes stale after merge.
- No generated report treated as proof authority.
- No local stdout treated as proof authority.
- No unattested or untrusted anchor accepted as current proof evidence.
- No wrong-target anchor accepted.
- No hermetic-mock proof upgraded to live-external-provider.
- No production-shaped proof upgraded to production-live.
- No USF-39 movement out of Backlog from this model alone.

## Current Classification

USF-101 is complete for the current repository model: ADR 0006, ADR 0007, and ADR 0008 define the carrier and trust model; `tools/validate-spec/proof-anchor-trust-root.json` registers the CI trust identity; `validate-spec anchor` enforces payload invariants and trust-root membership; the workflow verifies the attestation; and `proof-anchor-fabe47b` is published for the reviewed main commit.

This closes the authentication-slice current-commit freshness carrier for USF-59. It does not close USF-73 or USF-99 for broader multi-environment or whole-platform runtime proof, and it does not start USF-39.

USF-39 remains Backlog.
