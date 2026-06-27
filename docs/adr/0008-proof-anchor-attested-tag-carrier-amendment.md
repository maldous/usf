# 0008 Proof Anchor Attested Tag Carrier Amendment

## Status

Accepted.

## Description

Amends ADR 0006 and ADR 0007 to name the implemented proof-freshness anchor carrier precisely: an annotated Git tag whose payload is attested and verified by the repository CI identity. The tag is not a GPG-signed tag; the cryptographic trust is the CI artifact attestation bound to the anchor payload and merge commit.

## Context

ADR 0006 selected a signed annotated Git tag as the proof-freshness anchor carrier. ADR 0007 then selected the repository CI identity using GitHub artifact attestations as the signer/trust model. The implemented workflow in `.github/workflows/proof-anchor.yml` emits the deterministic anchor payload, validates the payload and trust-root signer field, attests the payload with GitHub artifact attestations, verifies that attestation in CI, and publishes the payload as an annotated tag on the merge commit.

That implementation is authority-preserving, but the phrase "signed annotated Git tag" is imprecise for the committed workflow because `git tag -a` creates an annotated tag, not a cryptographically signed tag. The cryptographic verification is on the attested anchor payload and CI identity. This amendment resolves the wording mismatch without changing the proof ceiling or allowing any stale-proof, generated-report, live-external, or production-live overclaim.

## Decision

USF adopts the implemented carrier as an attested annotated Git tag:

- the anchor payload is generated for the merge commit by the proof-anchor workflow;
- the payload is validator-checked for target commit, freshness, digest, proof level, provider mode, environment, and trust-root signer membership;
- the payload is attested by the repository CI identity using GitHub artifact attestations;
- CI verifies the attestation before publication;
- the verified payload is published as the annotated tag message on the exact merge commit.

For this model, the freshness authority is the combination of the annotated tag target, the deterministic payload, the CI attestation, the attestation verification step, and the committed trust-root signer identity. A plain annotated tag without the CI-attested payload and successful attestation verification is not proof authority. A generated report or committed evidence JSON file is not a freshness anchor.

## Rationale

The implemented carrier avoids managed private keys while preserving the core invariant ADR 0006 required: the anchor is bound to the merge commit after that commit exists, and it is verifiable against an approved trust identity. The CI attestation identity is repository-scoped, visible in the workflow run, and recorded in the trust root. This is more precise than calling the tag itself signed.

## Semantic References

- `docs/adr/0006-proof-freshness-anchor-carrier.md`
- `docs/adr/0007-proof-anchor-ci-signing-identity.md`
- `docs/runbooks/proof-anchor-publication.md`
- `docs/architecture/proof-freshness-publication-model.md`
- `docs/architecture/authority-model.md`

## Source References

- None. This is a USF governance amendment; `../react` proof remains historical lineage only.

## Proof References

- `proof-anchor-fabe47b`
- `https://github.com/maldous/usf/actions/runs/28286276338`

## Validator References

- `tools/validate-spec/validate-spec.py`
- `tools/validate-spec/proof-anchor-trust-root.json`

## Invariants

- The implemented anchor carrier is an annotated Git tag with a CI-attested payload, not a standalone GPG-signed tag.
- The payload must be attested and verified by the repository CI identity before the tag is treated as a freshness anchor.
- The payload target commit and the annotated tag target must be the same merge commit.
- Committed evidence JSON and generated reports are never proof-freshness anchors.
- Hermetic proof remains hermetic; it must not be upgraded to live-external-provider or production-live.

## Permitted Changes

- Keep using the CI attestation workflow as the proof-freshness carrier.
- Add a true signed-tag carrier later only through a new ADR or amendment that records the signer, trust root, and validator checks.
- Add validator checks that verify recorded anchor evidence for a claimed merge commit.

## Forbidden Drift

- Do not describe the current workflow as producing a true signed Git tag.
- Do not accept a plain annotated tag without a verified CI attestation as proof authority.
- Do not use local stdout, CI status alone, generated reports, or committed evidence JSON as proof authority.
- Do not treat this amendment as implementation authority or as permission to move USF-39.

## Consequences

- ADR 0006 remains the carrier decision lineage, but its "signed annotated Git tag" wording is superseded for the implemented CI-attested carrier.
- ADR 0007 remains the signer/trust identity decision and is clarified by this amendment.
- The runbook, readiness register, directive, and validator wording must use "attested annotated tag" or equivalent phrasing for the implemented carrier.

## AI Alignment Rules

- Agents must distinguish a true signed tag from an annotated tag carrying a CI-attested payload.
- Agents must verify the anchor payload and CI attestation before treating an anchor as current proof freshness.
- Agents must not start USF-39, create implementation/runtime code, or move Linear state from this amendment.

## Supersession

- Supersedes: `docs/adr/0006-proof-freshness-anchor-carrier.md` wording that requires the tag itself to be cryptographically signed.
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0008-proof-anchor-attested-tag-carrier-amendment.json`
