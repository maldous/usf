# Proof Anchor Publication Runbook

| | |
|---|---|
| Document type | Runbook / operational procedure |
| Status | Draft / procedure (not yet executed) |
| Authority level | Operational procedure; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, and proof evidence |
| Decision basis | `docs/adr/0006-proof-freshness-anchor-carrier.md` (carrier = signed annotated Git tag) and `docs/adr/0007-proof-anchor-ci-signing-identity.md` (signer = repository CI attestation identity) |
| Issue scope | USF-101; USF-59; USF-73; USF-99 |

This runbook records the procedure to publish a proof-freshness anchor with a CI signing identity. It does not itself publish an anchor and creates no active CI workflow. Enabling the workflow and granting the Actions permissions are deliberate maintainer steps; the first publication is performed by a CI run on the merge commit. This runbook does not start USF-39.

## Why publication is a post-merge CI step

Committed evidence that names the current commit becomes stale the moment it is committed (committing changes the commit hash). A fresh anchor must therefore be signed on the *merge commit* after that commit exists. That signing step runs in CI, not locally, and binds the anchor to the merge commit via a CI attestation. The validator verifies (a) the attestation cryptographically in CI and (b) that the anchor payload's `signerFingerprint` is the approved CI identity in `tools/validate-spec/proof-anchor-trust-root.json` (rule USF-ANCHOR-008).

## One-time enablement (maintainer)

1. Confirm the CI runner has the required GitHub Actions permissions: `id-token: write` and `attestations: write` (for `actions/attest-build-provenance`), and permission to push an annotated tag.
2. Move the workflow in the appendix to `.github/workflows/proof-anchor.yml`. Because the spec validator authorises only `.github/workflows/validate-spec.yml` by default, adding a second workflow requires, in the same change: adding `.github/workflows/proof-anchor.yml` to `AUTHORIZED_TOOLING` in `tools/validate-spec/validate-spec.py`, amending `docs/architecture/directory-and-file-naming-standard.md` section 6.E.1 to permit this second CI workflow, and adding a planted defect for the authorisation. Land that as its own reviewed PR.
3. Keep the registered CI signer identity in `tools/validate-spec/proof-anchor-trust-root.json` aligned with the workflow's attestation identity.

## Per-publication procedure (CI, on merge to the default branch)

1. Check out the merge commit.
2. Run the hermetic proof harness (for example `python3 tools/prove-authentication-slice.py`) and capture the emitted deterministic anchor payload for the merge commit. The payload carries `targetCommit` equal to the merge commit, the proof level observed, provider mode `hermetic-mock`, environment `hermetic`, the evidence references, the `signerFingerprint` set to the approved CI identity, and the canonical `payloadDigest`.
3. Create an annotated tag on the merge commit and attest it with the CI identity (`gh attestation` / `actions/attest-build-provenance`).
4. Run the validator in CI over the published anchor: cryptographic verification (`gh attestation verify` or `git verify-tag`) plus the anchor-payload invariants and trust-root membership (USF-ANCHOR-001..008).
5. Record the published tag and attestation as the freshness anchor for that commit. Do not commit a non-stale evidence JSON file (the PR-freshness gate, USF-PR-FRESHNESS, blocks that on purpose).

## What this closes and does not close

- Closes the publication mechanism for a fresh, signed, hermetically-proven anchor on the merge commit, which is the missing step for USF-59 (authentication-slice current-commit proof).
- Does NOT upgrade hermetic proof to live-external, and does NOT make production-shaped count as production-live (USF-73 multi-environment and USF-99 broad runtime remain bounded by what can be hermetically proven before implementation extraction).
- Does NOT start USF-39.

## Appendix: proof-anchor workflow (draft, to be enabled per the steps above)

This is a reviewable draft, not an active workflow. It is intentionally not placed under `.github/workflows/` by this runbook.

```yaml
name: proof-anchor
on:
  push:
    branches: [main]
permissions:
  contents: write
  id-token: write
  attestations: write
jobs:
  publish-anchor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.x"
      - name: Run hermetic proof and emit anchor payload
        run: |
          python3 tools/prove-authentication-slice.py --emit-anchor anchor-payload.json
      - name: Validate anchor payload invariants
        run: |
          python3 tools/validate-spec/validate-spec.py all --json
      - name: Attest the anchor payload
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: anchor-payload.json
      - name: Publish signed annotated tag on the merge commit
        run: |
          git config user.name "usf-ci"
          git config user.email "ci@users.noreply.github.com"
          git tag -a "proof-anchor-$(git rev-parse --short HEAD)" -F anchor-payload.json
          git push origin "proof-anchor-$(git rev-parse --short HEAD)"
```

The exact harness flag (`--emit-anchor`) and the attestation/verify steps are confirmed when the workflow is enabled; the harness currently emits a deterministic unsigned payload and the validator checks its invariants. Treat any unverified run as not-yet-published.
