# Proof Anchor Publication Runbook

| | |
|---|---|
| Document type | Runbook / operational procedure |
| Status | Draft / procedure (not yet executed) |
| Authority level | Operational procedure; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and proof evidence |
| Decision basis | `docs/adr/0006-proof-freshness-anchor-carrier.md` (carrier = signed annotated Git tag) and `docs/adr/0007-proof-anchor-ci-signing-identity.md` (signer = repository CI attestation identity) |
| Issue scope | USF-101; USF-59; USF-73; USF-99 |

This runbook records the procedure to publish a proof-freshness anchor with a CI signing identity. The publication workflow `.github/workflows/proof-anchor.yml` is committed and active (authorised in the validator's `AUTHORIZED_TOOLING` and naming standard §6.E.1). The first publication is performed by that workflow's CI run on the merge commit, provided the repository allows the declared Actions permissions; this document does not itself publish an anchor. This runbook does not start USF-39.

## Why publication is a post-merge CI step

Committed evidence that names the current commit becomes stale the moment it is committed (committing changes the commit hash). A fresh anchor must therefore be signed on the *merge commit* after that commit exists. That signing step runs in CI, not locally, and binds the anchor to the merge commit via a CI attestation. The validator verifies (a) the attestation cryptographically in CI and (b) that the anchor payload's `signerFingerprint` is the approved CI identity in `tools/validate-spec/proof-anchor-trust-root.json` (rule USF-ANCHOR-008).

## One-time enablement (maintainer)

The workflow, its `AUTHORIZED_TOOLING` entry, and the naming standard §6.E.1 authorisation are already committed, so no further enablement edit is required. The only maintainer action is to confirm the repository permits the Actions scopes the workflow declares:

1. Confirm the repository allows the Actions permissions declared in the workflow `permissions:` block: `id-token: write` and `attestations: write` (for `actions/attest-build-provenance`) and `contents: write` (to push the annotated tag). These are granted only if the repository's Actions settings permit them; if a scope is disallowed, that step fails honestly rather than producing an unverified anchor.
2. Keep the registered CI signer identity in `tools/validate-spec/proof-anchor-trust-root.json` (`ci-github-actions:maldous/usf:proof-anchor`) aligned with the workflow's attestation identity.

## Per-publication procedure (CI, on merge to the default branch)

1. Check out the merge commit (`fetch-depth: 0`).
2. Emit the deterministic anchor payload for the merge commit: `python3 tools/prove-authentication-slice.py --emit-anchor-payload --signer ci-github-actions:maldous/usf:proof-anchor > anchor-payload.json`. The payload carries `targetCommit` equal to the merge commit, the proof level observed, provider mode `hermetic-mock`, environment `hermetic`, the evidence references, the `signerFingerprint` set to the approved CI identity, and the canonical `payloadDigest`.
3. Verify the payload before publishing: `python3 tools/validate-spec/validate-spec.py anchor --anchor-file anchor-payload.json --head "$GITHUB_SHA" --json` (anchor-payload invariants + trust-root membership, USF-ANCHOR-001..008).
4. Attest the payload with the CI identity (`actions/attest-build-provenance`), then verify provenance: `gh attestation verify anchor-payload.json --repo "$GITHUB_REPOSITORY"`. Publish the anchor as an annotated tag on the merge commit.
5. Record the published tag and attestation as the freshness anchor for that commit. Do not commit a non-stale evidence JSON file (the PR-freshness gate, USF-PR-FRESHNESS, blocks that on purpose).

## What this closes and does not close

- Closes the publication mechanism for a fresh, signed, hermetically-proven anchor on the merge commit, which is the missing step for USF-59 (authentication-slice current-commit proof).
- Does NOT upgrade hermetic proof to live-external, and does NOT make production-shaped count as production-live (USF-73 multi-environment and USF-99 broad runtime remain bounded by what can be hermetically proven before implementation extraction).
- Does NOT start USF-39.

## The active workflow

The implementation of this procedure is the committed workflow `.github/workflows/proof-anchor.yml`. It runs on push to the default branch, emits the anchor payload with the registered CI signer, verifies the payload (`validate-spec anchor`), attests it (`actions/attest-build-provenance`, keyless/sigstore), verifies the attestation (`gh attestation verify`), and publishes the annotated tag on the merge commit. The harness emits a deterministic payload and the validator checks its invariants; the cryptographic provenance is established by the attestation step in CI. Treat any run whose attestation/verify step did not succeed as not-yet-published, and never record an unverified anchor as current readiness.
