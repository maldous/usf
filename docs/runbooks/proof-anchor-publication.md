# Proof Anchor Publication Runbook

| | |
|---|---|
| Document type | Runbook / operational procedure |
| Status | Active / procedure |
| Authority level | Operational procedure; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and proof evidence |
| Decision basis | `docs/adr/0006-proof-freshness-anchor-carrier.md` (carrier lineage), `docs/adr/0007-proof-anchor-ci-signing-identity.md` (repository CI attestation identity), and `docs/adr/0008-proof-anchor-attested-tag-carrier-amendment.md` (implemented carrier = annotated tag carrying a CI-attested payload) |
| Issue scope | USF-101; USF-59; USF-73; USF-99 |

This runbook records the procedure to publish a proof-freshness anchor with a CI attestation identity. The publication workflow `.github/workflows/proof-anchor.yml` is committed and active (authorised in the validator's `AUTHORIZED_TOOLING` and naming standard §6.E.1). The current reviewed main commit `fabe47b8fc70d34b34d1fc05c39da998c74a6748` has a successful proof-anchor publication run (`28286276338`) and tag (`proof-anchor-fabe47b`). This runbook does not itself publish an anchor. This runbook does not start USF-39.

## Why publication is a post-merge CI step

Committed evidence that names the current commit becomes stale the moment it is committed (committing changes the commit hash). A fresh anchor must therefore be published for the *merge commit* after that commit exists. The trust-binding step runs in CI, not locally, and binds the anchor payload to the merge commit via a CI attestation. The validator verifies (a) the attestation cryptographically in CI and (b) that the anchor payload's `signerFingerprint` is the approved CI identity in `tools/validate-spec/proof-anchor-trust-root.json` (rule USF-ANCHOR-008).

## One-time enablement (maintainer)

The workflow, its `AUTHORIZED_TOOLING` entry, and the naming standard §6.E.1 authorisation are already committed, so no further enablement edit is required. The only maintainer action is to confirm the repository permits the Actions scopes the workflow declares:

1. Confirm the repository allows the Actions permissions declared in the workflow `permissions:` block: `id-token: write` and `attestations: write` (for `actions/attest-build-provenance`) and `contents: write` (to push the annotated tag). These are granted only if the repository's Actions settings permit them; if a scope is disallowed, that step fails honestly rather than producing an unverified anchor.
2. Keep the registered CI signer identity in `tools/validate-spec/proof-anchor-trust-root.json` (`ci-github-actions:maldous/usf:proof-anchor`) aligned with the workflow's attestation identity.

## Per-publication procedure (CI, on merge to the default branch)

1. Check out the merge commit (`fetch-depth: 0`).
2. Emit the deterministic anchor payload for the merge commit: `python3 tools/validate-bootstrap/validate-bootstrap.py proof-authentication-slice --emit-anchor-payload --signer ci-github-actions:maldous/usf:proof-anchor > anchor-payload.json`. The payload carries `targetCommit` equal to the merge commit, the proof level observed, provider mode `hermetic-mock`, environment `hermetic`, the evidence references, the `signerFingerprint` set to the approved CI identity, and the canonical `payloadDigest`.
3. Verify the payload before publishing: `python3 tools/validate-spec/validate-spec.py anchor --anchor-file anchor-payload.json --head "$GITHUB_SHA" --json` (anchor-payload invariants + trust-root membership, USF-ANCHOR-001..008).
4. Attest the payload with the CI identity (`actions/attest-build-provenance`), then verify provenance: `gh attestation verify anchor-payload.json --repo "$GITHUB_REPOSITORY"`. Publish the anchor as an annotated tag on the merge commit. The tag object is not a standalone GPG-signed tag; the cryptographic trust is the verified GitHub artifact attestation for the payload.
5. Record the published tag and attestation as the freshness anchor for that commit. Do not commit a non-stale evidence JSON file (the PR-freshness gate, USF-PR-FRESHNESS, blocks that on purpose).

## Verifying the current HEAD carries a published, attested anchor

The repository asserts that the live default-branch HEAD always carries a fresh, verified proof-anchor. That assertion is only honest if it is independently checkable. Use this procedure to confirm it for the current HEAD, and treat any failed step as "current HEAD is not anchored yet" (fail closed).

Short-SHA convention: the tag name is `proof-anchor-$(git rev-parse --short HEAD)`. `git rev-parse --short` returns the repository's abbreviated SHA (commonly 7 hex characters, and longer only if needed for uniqueness). Always derive the lookup token with the same command; do not hand-truncate to 6 characters, or the tag will appear missing when it is present.

1. Derive the expected tag for the exact HEAD: `SHORT=$(git rev-parse --short HEAD); echo "proof-anchor-$SHORT"`.
2. Confirm the tag exists on origin and dereferences to HEAD: `git ls-remote --tags origin "refs/tags/proof-anchor-$SHORT"` (the `^{}` peeled line must equal `git rev-parse HEAD`).
3. Confirm the publication run for this HEAD succeeded, including its attest and verify steps: find the `proof-anchor.yml` run whose `headSha` equals HEAD and confirm the `Attest the anchor payload`, `Verify the attestation`, and `Publish the anchor` steps each report success.
4. Confirm a CI attestation exists for the exact payload artifact: re-emit the deterministic payload (`python3 tools/validate-bootstrap/validate-bootstrap.py proof-authentication-slice --emit-anchor-payload --signer ci-github-actions:maldous/usf:proof-anchor > anchor-payload.json`), take its `sha256sum`, and query `gh api repos/$GITHUB_REPOSITORY/attestations/sha256:<digest>` — at least one attestation with a verification certificate must be returned.
5. Confirm the published payload validates against HEAD: `python3 tools/validate-spec/validate-spec.py anchor --anchor-file anchor-payload.json --head "$(git rev-parse HEAD)" --json` must report zero findings, which includes the unsigned-anchor fail-closed check (USF-ANCHOR-008 now requires a trusted `signerFingerprint` on every anchor).

If any step fails, the current HEAD has no verified freshness anchor: republish via the workflow (a no-op empty commit or re-run on the default branch) or amend any readiness prose that assumes HEAD is anchored, rather than treating HEAD as fresh.

## What this closes and does not close

- Closes the publication mechanism for a fresh, CI-attested, hermetically-proven anchor on the merge commit, which is the missing step for USF-59 (authentication-slice current-commit proof).
- Does NOT upgrade hermetic proof to live-external, and does NOT make production-shaped count as production-live (USF-73 multi-environment and USF-99 broad runtime remain bounded by what can be hermetically proven before implementation extraction).
- Does NOT start USF-39.

## The active workflow

The implementation of this procedure is the committed workflow `.github/workflows/proof-anchor.yml`. It runs on push to the default branch, emits the anchor payload with the registered CI signer, verifies the payload (`validate-spec anchor`), attests it (`actions/attest-build-provenance`, keyless/sigstore), verifies the attestation (`gh attestation verify`), and publishes the annotated tag on the merge commit. The harness emits a deterministic payload and the validator checks its invariants; the cryptographic provenance is established by the attestation step in CI. Treat any run whose attestation/verify step did not succeed as not-yet-published, and never record an unverified anchor as current readiness.
