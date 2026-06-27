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

## Approval-Ready Decision Text

A future human authority may approve the recommended carrier by accepting decision text equivalent to:

```text
USF accepts signed annotated Git tags as the proof freshness anchor carrier for USF-101.

The accepted tag naming convention is proof-freshness/<target-commit>/<proof-id-slug>.
The accepted signer or trust root is [exact human, bot, key, certificate, or attestation identity].
Signature verification is mandatory in [local validation, CI, or both].
The canonical payload shape is the proof-freshness-anchor-payload shape validated by USF-ANCHOR-001 through USF-ANCHOR-007, plus any later accepted carrier/signature fields.
The canonical digest algorithm is SHA-256 over the canonical JSON payload without the payloadDigest field.

The anchor must bind target commit, proof id, provider mode, environment, proof level claimed, proof level observed, freshness status, evidence references, and payload digest.

Missing, unsigned, untrusted, wrong-target, digest-mismatched, stale, generated-report-only, CI-only, or local-stdout-only anchors fail closed.

This decision does not start USF-39, does not authorize implementation/runtime code, does not upgrade hermetic proof to live-external-provider, and does not upgrade production-shaped evidence to production-live.
```

The bracketed signer/trust and enforcement-surface values are intentionally unfilled. They require human or infrastructure authority and must not be inferred by an AI agent.

## Validator-Readable Proposed Policy

Until the approval text above is accepted, validator behaviour must remain fail-closed:

- committed proof evidence with `freshness.stale` set to false is rejected unless its commit is the checked commit and an accepted post-merge anchor model exists;
- changed PR evidence or generated-report JSON cannot claim non-stale freshness;
- unsigned anchor payloads are checked only for deterministic shape, digest, target, provider, environment, proof-level, and overclaim invariants;
- unsigned payloads do not satisfy proof freshness authority;
- generated reports are rejected as anchor payloads;
- live-external-provider and production-live claims fail closed unless the provider mode, environment, and proof level support them.

After approval, validator behaviour must add carrier checks:

- verify the signed annotated tag target equals the claimed target commit;
- verify the tag name follows the accepted convention;
- verify the signer or attestation identity is trusted by the accepted trust model;
- verify the signed payload digest matches the canonical payload;
- verify the payload proof id resolves to committed proof evidence;
- verify payload provider mode, environment, proof level, freshness, emitted evidence, collected evidence, and source references match committed proof and evidence records;
- reject missing, unsigned, untrusted, wrong-target, stale, digest-mismatched, generated-report-only, and CI-only anchors with stable rule IDs and planted defects.

## Post-Approval Operating Procedure

After the carrier and trust decision is accepted, the safe publication procedure is:

1. Merge the readiness or implementation-governance commit whose proof freshness is being claimed.
2. Check out the exact merged target commit.
3. Run the authorised proof command for the claimed slice without creating product runtime or importing historical runtime code.
4. Emit the deterministic proof freshness anchor payload for that exact target commit.
5. Verify the payload locally with the validator's payload-invariant mode.
6. Create the signed annotated proof freshness tag or accepted carrier against the exact target commit.
7. Verify the carrier signature and signer/trust root according to the accepted decision.
8. Run the validator modes required by the accepted decision, including evidence, real-instances, implementation, selftest, and any anchor verification mode.
9. Publish the carrier only if validation passes.
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
