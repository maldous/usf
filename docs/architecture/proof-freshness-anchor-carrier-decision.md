# Proof Freshness Anchor Carrier Decision

| | |
|---|---|
| **Document type** | Architecture / authority decision requirement |
| **Status** | Amended — carrier accepted by ADR 0006 and ADR 0008; CI trust identity accepted by ADR 0007; current proof-anchor publication complete for `fabe47b` |
| **Authority level** | Reviewable decision proposal; not an accepted ADR and not proof authority |
| **Issue scope** | USF-101; USF-98; USF-59; USF-73; USF-99; USF-100; USF-39 readiness |

This document records the proof freshness anchor carrier and trust model. It creates no implementation code, product runtime, source import, generated report, schema activation, or implementation directive. It does not start USF-39.

> **Amendment (2026-06-27).** ADR 0006 accepted the original carrier lineage, ADR 0007 accepted the repository CI identity using GitHub artifact attestations, and ADR 0008 amended the implemented carrier wording to "attested annotated Git tag." The workflow `.github/workflows/proof-anchor.yml` is active, and the post-merge run `28286276338` published `proof-anchor-fabe47b` for commit `fabe47b8fc70d34b34d1fc05c39da998c74a6748`.

## Current Decision State

USF authority now approves the implemented proof freshness anchor carrier and trust model:

- ADR 0006: carrier lineage, originally phrased as signed annotated Git tag;
- ADR 0007: repository CI attestation identity as the approved trust identity;
- ADR 0008: implemented carrier wording, an annotated Git tag carrying a CI-attested payload;
- `tools/validate-spec/proof-anchor-trust-root.json`: registered CI signer fingerprint;
- `.github/workflows/proof-anchor.yml`: post-merge payload validation, attestation, attestation verification, and tag publication.

Generated reports, CI status alone, local stdout, and unattested payloads remain non-authoritative for proof freshness.

## Recommended Carrier

The implemented carrier is an annotated Git tag that targets the exact commit being claimed and carries the canonical proof freshness anchor payload as its tag message. The payload is attested by the repository CI identity before publication.

Reasons:

- Git tags already belong to the repository lineage model.
- An annotated tag can be created after the target commit exists, avoiding the self-referential commit-hash problem.
- The CI attestation binds the target commit, payload digest, and repository workflow identity without mutating the target commit.
- Repository-local validation can inspect tag target, payload digest, and trust-root signer field; CI verifies the cryptographic attestation.

This recommendation has now been accepted by ADR lineage and implemented by the proof-anchor workflow. A future true signed-tag model remains permitted only through a later ADR or amendment.

## Accepted Decision Coverage

The accepted decision set specifies:

- accepted carrier type;
- accepted ref or tag naming convention;
- allowed signer identity or trust root;
- whether attestation verification is mandatory in CI, local validation, or both;
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

The approved tag convention is `proof-anchor-<short-target-commit>`, as implemented by `.github/workflows/proof-anchor.yml`. The approved trust identity is `ci-github-actions:maldous/usf:proof-anchor`. Missing, unattested, untrusted, wrong-target, digest-mismatched, stale, generated-report-only, CI-status-only, or local-stdout-only anchors fail closed.

## Validator-Readable Proposed Policy

- committed proof evidence with `freshness.stale` set to false is rejected unless its commit is the checked commit and an accepted post-merge anchor model exists;
- changed PR evidence or generated-report JSON cannot claim non-stale freshness;
- local anchor payloads are checked only for deterministic shape, digest, target, provider, environment, proof-level, trust-root signer membership, and overclaim invariants;
- local payloads do not satisfy proof freshness authority without a CI-attested published anchor;
- generated reports are rejected as anchor payloads;
- live-external-provider and production-live claims fail closed unless the provider mode, environment, and proof level support them.

- verify the attested annotated tag target equals the claimed target commit;
- verify the tag name follows the accepted convention;
- verify the signer or attestation identity is trusted by the accepted trust model;
- verify the payload digest matches the canonical payload;
- verify the payload proof id resolves to committed proof evidence;
- verify payload provider mode, environment, proof level, freshness, emitted evidence, collected evidence, and source references match committed proof and evidence records;
- reject missing, unattested, untrusted, wrong-target, stale, digest-mismatched, generated-report-only, and CI-status-only anchors with stable rule IDs and planted defects.

## Post-Approval Operating Procedure

The safe publication procedure is:

1. Merge the readiness or implementation-governance commit whose proof freshness is being claimed.
2. Check out the exact merged target commit.
3. Run the authorised proof command for the claimed slice without creating product runtime or importing historical runtime code.
4. Emit the deterministic proof freshness anchor payload for that exact target commit.
5. Verify the payload locally with the validator's payload-invariant mode.
6. Attest the payload with the repository CI identity.
7. Verify the attestation and trust-root signer according to the accepted decision.
8. Run the validator modes required by the accepted decision, including evidence, real-instances, implementation, selftest, and any anchor verification mode.
9. Publish the annotated tag only if validation passes.
10. Record the publication result without treating a generated report, CI status, or local stdout as proof authority.

An incorrect published anchor must be corrected by an explicit corrective record or superseding anchor under the accepted corrective process. A tag or anchor must not be silently moved to hide an incorrect claim.

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

The validator has fail-closed checks for payload shape, invariants, and trust-root signer membership. CI performs the cryptographic attestation verification before publishing the annotated tag. These checks do not make local stdout or an unattested payload proof authority.

## No-Go Rules

- An unattested local anchor payload is not proof authority.
- A generated report is not an anchor payload.
- CI status is not proof authority.
- Local proof stdout is not proof authority.
- A Git tag is not accepted as proof freshness authority unless it carries the CI-attested payload for the claimed merge commit.
- A wrong-target, digest-mismatched, unattested, untrusted, stale, or generated-report-only anchor must fail closed.
- Hermetic proof must not satisfy live-external-provider readiness.
- Production-shaped proof must not satisfy production-live readiness.
- USF-39 remains Backlog.

## Current Classification

USF-101 is complete for the implemented carrier model. For the reviewed current main commit, `proof-anchor-fabe47b` is published and the proof-anchor workflow run `28286276338` completed successfully.

Remaining blockers are outside USF-101: USF-73, USF-97, USF-98, USF-99, USF-100, and USF-39.
