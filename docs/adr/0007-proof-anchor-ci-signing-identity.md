# 0007 Proof Anchor CI Signing Identity

## Status

Accepted.

## Description

Selects the approved trust identity for the proof-freshness anchor carrier lineage decided in ADR 0006 and amended in ADR 0008. The approved identity is the repository's CI identity using GitHub artifact attestations (OIDC/sigstore), requiring no manually managed private key. It records the trust root, the validator hookup, and the post-merge publication procedure. It does not itself publish a fresh anchor; publication is performed by a CI run on the merge commit.

## Context

This decision is made under the readiness-acceleration directive recorded in Linear USF-101, with the maintainer choosing a CI key.

ADR 0006 accepted a signed annotated Git tag verified against an approved trust root as the proof-freshness anchor carrier, and left the signer/trust root and GitHub-native attestation to a later decision. The validator already enforces unsigned anchor-payload invariants (USF-ANCHOR-001 through USF-ANCHOR-007) and a data-level signer trust-root membership check (USF-ANCHOR-008) against `tools/validate-spec/proof-anchor-trust-root.json`, which was empty (fail-closed).

The self-referential commit-hash problem means a fresh anchor cannot be produced by committing a file: it must be signed on the merge commit after that commit exists. That step is inherently a post-merge CI action.

## Decision

USF adopts the repository CI identity as the approved proof-anchor trust identity, implemented with GitHub artifact attestations (the GitHub Actions OIDC identity and sigstore), so no human-held private key is required. The trust root `tools/validate-spec/proof-anchor-trust-root.json` registers this CI identity. A post-merge proof-anchor workflow runs the hermetic proof harness against the merge commit, builds the deterministic anchor payload (already invariant-checked), attests that payload, verifies the attestation in CI, and publishes the payload as an annotated tag on that commit. Verification has two layers: cryptographic verification of the payload attestation in CI (`gh attestation verify`) and the validator's data-level check that the payload's `signerFingerprint` is in the trust root (USF-ANCHOR-008).

The publication workflow and the procedure to enable it are recorded in `docs/runbooks/proof-anchor-publication.md`. Enabling the workflow (moving it to the CI workflows path and granting the required Actions permissions) is a deliberate maintainer step, after which the first CI run publishes the fresh anchor.

## Rationale

A CI attestation identity removes the need to store or rotate a private signing key while still binding the anchor to a verifiable, repository-scoped signer, which is stronger and lower-maintenance than a manually managed GPG key. The alternative (a maintainer-held GPG key as a CI secret) was considered and is permitted by ADR 0006, but the attestation identity is preferred because it needs no secret provisioning. Producing the anchor locally was rejected because committing evidence cannot escape the self-referential commit-hash problem.

## Semantic References

- `docs/adr/0006-proof-freshness-anchor-carrier.md`
- `docs/adr/0008-proof-anchor-attested-tag-carrier-amendment.md`
- `docs/architecture/proof-freshness-anchor-carrier-decision.md`
- `docs/architecture/proof-freshness-publication-model.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/git-practices-standard.md`

## Source References

- None. The signer model is a USF governance decision; React proof is stale lineage.

## Proof References

- None. This ADR decides the signer; the fresh anchor is published by a post-merge CI run and is not asserted here.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- The proof-anchor signer is the approved CI identity registered in the trust root; an anchor whose signerFingerprint is not in the trust root is rejected (USF-ANCHOR-008).
- A fresh anchor is published on the merge commit by CI; committed evidence JSON and generated reports are never the freshness anchor.
- Cryptographic verification of the attestation/signature is performed in CI; the validator's data-level check does not replace it.
- Hermetic proof MUST NOT be presented as live-external; production-shaped MUST NOT be presented as production-live.

## Permitted Changes

- Enable the proof-anchor publication workflow per the runbook and grant the required Actions permissions.
- Add or rotate the registered CI signer identity in the trust root by an explicit change.
- Add a maintainer-held GPG signer as an additional trust-root entry under ADR 0006 if required.

## Forbidden Drift

- Do not accept an anchor whose signer is absent from the trust root, or whose attestation fails CI verification.
- Do not claim a fresh-proof readiness state before a CI-published, verified anchor exists for the target commit.
- Do not treat a generated report or a committed evidence JSON file as the freshness anchor.
- Do not weaken the freshness, posture, or PR-freshness checks to simulate a published anchor.

## Consequences

- USF-101's signer model is decided (CI attestation identity) and registered; the remaining work is enabling the publication workflow and the first CI publication run, which closes the fresh-proof step for the authentication slice (USF-59).
- USF-73 (multi-environment) and USF-99 (broad runtime) remain bounded by what can be hermetically proven before implementation extraction; they are not closed by this ADR.
- The implementation directive (USF-100) can cite the CI anchor as the readiness-evidence publication mechanism.

## AI Alignment Rules

- Agents MUST NOT mark proof evidence fresh for the current commit by committing a file; freshness comes only from a CI-published, verified anchor.
- Agents MUST NOT add or enable a signing workflow that they cannot verify without recording it as a maintainer-enabled procedure, and MUST NOT claim a published anchor that no CI run produced.
- Agents MUST preserve the hermetic-first ceiling and never infer a live-external or production-live claim from an anchor.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0007-proof-anchor-ci-signing-identity.json`
