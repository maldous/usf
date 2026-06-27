# 0006 Proof Freshness Anchor Carrier

## Status

Accepted.

## Description

Records the original decision that the USF proof-freshness anchor carrier is a signed annotated Git tag, verified by the validator against an approved maintainer trust root, and specifies the model that resolves the self-referential commit-hash problem without weakening proof honesty. ADR 0008 supersedes the "signed tag" wording for the implemented carrier: the current workflow publishes an annotated tag carrying a CI-attested anchor payload, rather than a standalone GPG-signed tag.

## Context

This decision is made under the readiness-acceleration directive recorded in Linear USF-101, with the carrier decision delegated to the agent and the signing identity to be supplied by the maintainer.

`docs/architecture/proof-freshness-anchor-carrier-decision.md` previously recorded that no carrier or signer trust model was accepted yet, while recommending a signed annotated Git tag. `docs/architecture/proof-freshness-publication-model.md` records the post-merge evidence-anchor model. The validator already checks unsigned anchor-payload invariants (rules USF-ANCHOR-001 through USF-ANCHOR-007) but explicitly does not accept any carrier or signer as trusted, and it fails closed when committed evidence claims non-stale freshness for a different commit than HEAD (USF-EVIDENCE-009, USF-POSTURE-002, USF-PR-FRESHNESS).

The core problem: committed JSON evidence that names the current commit changes that commit when committed, so committed evidence is stale after merge. The chosen proof ceiling is hermetic-first; live-external and production-live remain deferred and are never inferred.

## Decision

USF adopts the signed annotated Git tag as the proof-freshness anchor carrier. A proof run executes against a merge commit; after merge, a maintainer publishes a signed annotated Git tag on that exact commit whose message carries the deterministic anchor payload (the payload shape already invariant-checked by USF-ANCHOR-001 through USF-ANCHOR-007). The tag, not any committed evidence JSON and not any generated report, is the freshness anchor for that commit.

The anchor is trusted only when its tag signature verifies against an approved trust root recorded in the repository (a committed allowlist of trusted signer fingerprints). An unsigned tag, an untrusted signer, a payload-digest mismatch, or a generated report MUST NOT be accepted as proof authority.

This carrier decision preserves every existing safety rule: stale evidence cannot support current readiness, hermetic proof is never upgraded to live-external, production-shaped is never upgraded to production-live, and generated reports remain rank-7.

## Rationale

A signed annotated tag points at the exact merge commit without changing it, which resolves the self-referential commit-hash problem that a committed evidence file cannot. A signature against an approved trust root supplies the missing trust model so the anchor is verifiable rather than asserted. Alternatives considered: GitHub-native attestation (rejected as the primary carrier because it makes the trust provider external and less explicit, though it MAY be added later); a committed post-merge evidence file (rejected because it cannot escape the self-reference and would be stale on commit).

## Semantic References

- `docs/architecture/proof-freshness-anchor-carrier-decision.md`
- `docs/architecture/proof-freshness-publication-model.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/git-practices-standard.md`
- `docs/adr/0008-proof-anchor-attested-tag-carrier-amendment.md`
- `spec/schemas/proof-evidence.schema.json`

## Source References

- None. The carrier is a USF governance decision; React proof is stale lineage and cannot serve as a current anchor.

## Proof References

- None. This ADR decides the carrier; it does not itself publish fresh proof.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- The freshness anchor for a commit is a signed annotated Git tag on that exact commit; committed evidence JSON and generated reports are not freshness anchors.
- An anchor is trusted only when its signature verifies against an approved trust root recorded in the repository.
- Stale evidence MUST NOT support a current readiness claim.
- Hermetic proof MUST NOT be presented as live-external; production-shaped MUST NOT be presented as production-live.

## Permitted Changes

- Implement the validator tag-signature and trust-root verification with planted defects and a selftest under USF-98 and USF-101.
- Register an approved signer fingerprint in a committed trust-root allowlist when the maintainer supplies it.
- Add GitHub-native attestation as an additional, secondary anchor in a later ADR.
- Publish a fresh signed proof anchor for a target commit once the signer key is registered.

## Forbidden Drift

- Do not accept an unsigned tag, an untrusted signer, or a payload-digest mismatch as proof authority.
- Do not treat a generated report or a committed evidence JSON file as the freshness anchor.
- Do not weaken the freshness, posture, or PR-freshness checks to make a branch claim non-stale readiness before a published anchor exists.
- Do not upgrade hermetic or production-shaped proof to live-external or production-live by way of an anchor.

## Consequences

- USF-101 has an accepted carrier and trust model; the remaining work is the validator signature/trust verification (with planted defects), registration of a maintainer signer fingerprint, and a successful fresh signed publication.
- USF-59, USF-73, and USF-99 remain blocked only on that remaining work and on execution-substrate access, not on an undecided model.
- The implementation directive (USF-100) can cite this carrier as the readiness-evidence publication mechanism.

## AI Alignment Rules

- Agents MUST NOT mark proof evidence non-stale for the current commit by committing a JSON file; freshness comes only from a verified signed tag.
- Agents MUST NOT accept an unsigned or untrusted anchor as proof authority, and MUST stop if asked to.
- Agents MUST preserve the hermetic-first ceiling and never infer a live-external or production-live claim from an anchor.

## Supersession

- Supersedes: none
- Superseded by: `docs/adr/0008-proof-anchor-attested-tag-carrier-amendment.md` for the implemented carrier wording

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0006-proof-freshness-anchor-carrier.json`
