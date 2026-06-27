# Complete Readiness Blocker Register

| | |
|---|---|
| **Document type** | Architecture / readiness blocker register |
| **Status** | Draft / NO-GO register |
| **Authority level** | Reviewable readiness classification; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, and semantic instances |
| **Issue scope** | USF-39 readiness; USF-59; USF-73; USF-97; USF-98; USF-99; USF-100; USF-101; React L5 equivalence audit workstream USF-102–USF-119 |
| **Base repository state reviewed** | `badef5da0c03a1e019d3f7bb84d8268ee8bc8255` |
| **Branch update scope** | Records the React L5 / USF V2 equivalence audit harvest (`docs/architecture/react-l5-equivalence-audit.md`) and the resulting reduced blocker set; `../react` was inspected at commit `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767` (tag `v1-final`) as historical evidence only; final merged commit is determined by Git history |

This document records the current complete-readiness blocker state before implementation extraction. It creates no implementation code, implementation directory, product runtime, source import, proof evidence, generated report, schema activation, or implementation directive. It does not start USF-39.

## Current Verdict

Complete one-pass implementation readiness is NO-GO.

USF-39 must remain Backlog because the repository does not yet have all of the following:

- a safe proof freshness publication model for current commit evidence — RESOLVED (USF-101 Done): the proof-anchor CI workflow publishes and verifies a signed/attested anchor on each merge commit;
- fresh non-stale proof evidence for every readiness claim — PARTIAL: the authentication first slice now has a fresh, verified, commit-pinned anchor (USF-59 Done); broader runtime proof remains bounded by pre-implementation scope (USF-99) and stronger multi-environment postures remain deferred (USF-73);
- full semantic and source-use closure for every implementation-relevant slice, or explicit scope exclusions;
- validator-checkable semantic completeness, source audit base, and aggregate provider/environment posture gates;
- a human-filled implementation directive that cites exact scope, source-use, proof evidence, validation gates, no-go rules, and stop conditions.

The current repository remains valid as a semantic-first readiness foundation. It is not a complete implementation-start authority.

## React L5 Equivalence Audit Harvest (USF-102 workstream)

`../react` was inspected at commit `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767` (tag `v1-final`) as historical evidence only, and the harvest is recorded in `docs/architecture/react-l5-equivalence-audit.md`. That audit classifies every historical capability, proof, source-use, build, environment, CI, operational, data, configuration, governance, hexagonal-architecture, and UI artefact against the USF V2 corpus using the controlled equivalence and gap vocabularies.

The harvest materially reduces and sharpens the blocker set without weakening any safety rule. The smallest truthful remaining NO-GO set is:

1. USF-101: DONE. The proof-anchor CI workflow (`.github/workflows/proof-anchor.yml`, ADR-0006 carrier + ADR-0007 CI signer) is enabled, and its first post-merge run (run 28285948217 on commit `22db242`) emitted, verified, attested, and published a fresh signed anchor (tag `proof-anchor-22db242`); it republishes a fresh anchor on every merge. USF-59 is DONE (authentication-slice fresh, verified, commit-pinned proof via the anchor). USF-73 and USF-99 remain bounded by pre-implementation proof scope: stronger multi-environment postures and broad per-slice runtime proof require the implementation that USF-39 would create, and are recorded as deferred/not-proven rather than claimed.
2. USF-100: a human-filled implementation directive (its exact inputs are now assembled in the audit, section 11) — blocked on USF-101 classification.
3. USF-113: human ratification (ADR) of carrying the React hexagonal architecture forward as a V2 constraint.
4. USF-97: a bounded, enumerated authoring backlog (per-domain source-backed facets and per-domain source-use matrices), sequenced after the directive scopes the first domains.
5. USF-98/USF-117: a machine-readable equivalence ledger and validator rules with planted defects (repository-workable follow-up).

All React L5 proof remains lineage/stale for USF; no hermetic proof is upgraded to live-external and no production-shaped evidence is upgraded to production-live.

## Dependency Graph

| Blocker | Current state | Blocks | Classification |
|---|---:|---|---|
| USF-101 proof freshness publication model | Done | — | Resolved: CI proof-anchor workflow publishes+verifies a signed anchor per commit (run 28285948217, tag proof-anchor-22db242) |
| USF-59 current commit-pinned proof evidence | Done | — | Resolved: authentication-slice fresh, verified, commit-pinned anchor via the proof-anchor workflow |
| USF-73 multi-environment proof evidence | Backlog | USF-99, USF-100, USF-39 | Blocked by USF-101 and stronger proof infrastructure |
| USF-97 full semantic and source-use closure | Backlog | USF-100, USF-39 | Repository-workable, but broad and not complete |
| USF-98 one-pass readiness validator hardening | Backlog | USF-100, USF-39 | Partially advanced by PR 54, PR 58, and current validator hardening; repository-workable follow-up remains |
| USF-99 one-pass runtime proof and evidence execution | Backlog | USF-100, USF-39 | Blocked by proof publication model, runtime proof scope, and implementation prohibition |
| USF-100 human-filled implementation directive | Backlog | USF-39 | Requires human authority after blockers close |
| USF-39 implementation extraction | Backlog | Implementation start | Must not start without final GO and separate directive |

## Blocker Details

### USF-101 Proof Freshness Publication Model

The proof-only authentication harness can run against the current repository state and report a hermetic-mock, hermetic, behaviour-proven pass without writing evidence. That is useful execution signal, but it is not enough for current readiness because committed evidence records remain stale.

The current validator correctly fails closed when a record says `freshness.stale` is false but its `freshness.commit` differs from the current commit. A normal committed JSON update cannot satisfy that rule after merge if it writes the commit being claimed into the same commit, because committing the JSON changes the commit hash.

This requires an explicit publication model, such as a post-merge attestation, tag or signed evidence anchor, dedicated evidence publication workflow, or a higher-authority freshness decision that preserves proof honesty. Generated reports must not be promoted to proof authority.

`docs/architecture/proof-freshness-publication-model.md` records the preferred post-merge evidence-anchor model and the validator guard that blocks PRs from changing evidence or generated-report JSON to claim non-stale freshness before publication. `docs/architecture/proof-freshness-anchor-carrier-decision.md` records that no carrier or signer/trust model is accepted yet, while recommending a signed annotated Git tag for later authority approval. The proof harness can emit a deterministic unsigned anchor payload and the validator can selftest payload invariants, but that payload is not proof authority. This materially advances USF-101. The carrier and signer are now decided: `docs/adr/0006-proof-freshness-anchor-carrier.md` accepts a signed annotated Git tag verified against an approved trust root, and `docs/adr/0007-proof-anchor-ci-signing-identity.md` accepts the repository CI identity (GitHub artifact attestations, OIDC/sigstore) as the signer, registered in `tools/validate-spec/proof-anchor-trust-root.json` and data-checked by validator rule USF-ANCHOR-008. The React L5 proof audit (`docs/architecture/react-l5-equivalence-audit.md`, section 5) confirms no React proof can substitute: all React proof is hermetic/local/sandbox lineage and is stale for current USF readiness. USF-101 is now DONE. The proof-anchor CI workflow (`.github/workflows/proof-anchor.yml`) is enabled, and its first post-merge run (run 28285948217 on commit `22db242`) emitted the deterministic anchor payload, verified it (`validate-spec anchor`, USF-ANCHOR-001..008 incl. trust-root membership), attested it keyless with the repository CI identity (`actions/attest-build-provenance`), verified the attestation (`gh attestation verify`), and published the signed annotated tag `proof-anchor-22db242` on the merge commit. The workflow republishes a fresh anchor on each subsequent merge, so the live commit always carries a fresh, verified anchor; committed evidence JSON remains historical/stale by design and is never the freshness carrier.

### USF-59 and USF-73 Proof Evidence

Existing authentication proof records are historical hermetic evidence for their recorded claim commit. They are intentionally marked stale for current readiness. They do not claim live-external-provider readiness or production-live readiness.

Fresh proof evidence cannot be honestly committed as current readiness evidence until USF-101 is resolved. Stronger postures remain unproven and must not be inferred from hermetic proof.

### USF-97 Semantic and Source-Use Closure

The current semantic corpus now contains validator-readable semantic-contract instances for every semantic-contract target named by the capability source coverage matrix. Five authentication/identity contracts are source-backed drafts; the remaining non-authentication targets are explicit deferred gap or non-applicable contracts. That is useful target-inventory closure, but it does not prove complete one-pass coverage for every implementation-relevant capability, route, provider, data, UI, workflow, command, storage, reliability, and cross-capability concern.

Future work must replace deferred gap facets with validated semantic/source-use records for each implementation-relevant slice, or preserve explicit scope exclusions without treating React source structure as authority. The React L5 equivalence audit (`docs/architecture/react-l5-equivalence-audit.md`, section 4) now classifies all 75 historical capabilities (source-backed-but-stale-proof, semantic-only-deferred, or excluded-not-applicable) and reduces USF-97 to an enumerated, ranked authoring backlog plus per-domain source-use matrices, sequenced after the implementation directive scopes the first domains.

### USF-98 Validator Hardening

PR 54 merged validator guardrails for generated report homes, report filenames, evidence references, stale pass claims, implementation directive content, deeper source-path mirroring, and planted defects. PR 58 added proof freshness anchor payload invariant checks and positive/negative selftests without accepting unsigned payloads as proof authority.

The current validator hardening adds fail-closed checks for complete semantic facet references, the pinned source import audit-base tuple, proof/envelope posture agreement, non-stale proof without an accepted freshness anchor, and coverage-matrix semantic-contract targets without instances. USF-98 remains open because full source-use closure outside the authentication slice, completed source-backed non-authentication facets, and complete aggregate posture classification for future implementation claims still require additional validator-readable scope artefacts and proof publication authority. The React L5 equivalence audit (`docs/architecture/react-l5-equivalence-audit.md`, section 10) defines a stable equivalence/gap vocabulary and a proposed machine-readable ledger shape, and records the specific fail-closed validator-rule candidates (each requiring a planted defect and selftest) as USF-98/USF-117 follow-up; it deliberately does not modify the currently clean validator.

### USF-99 Runtime Proof and Evidence

Complete readiness requires executed proof, or explicit classification, for every behaviour readiness claim. Current proof is not broad enough for full one-pass readiness and current committed proof evidence remains stale.

No product runtime may be created merely to satisfy this issue. If proof requires product implementation, live credentials, production infrastructure, or React runtime import, the issue remains blocked until separately authorised.

### USF-100 Human-Filled Implementation Directive

No human-filled directive currently exists. The implementation directive template and related standards define what such a directive must contain, but they do not themselves authorise implementation extraction.

The directive cannot be filled truthfully until the readiness blockers it cites are closed or explicitly classified without weakening USF authority.

## No-Go Rules Preserved

- No source-path mirroring.
- No runtime code import without explicit disposition and directive authority.
- No schema activation unless separately authorised.
- No generated report treated as authority.
- No stale proof used as current readiness.
- No hermetic proof upgraded to live-external-provider.
- No production-shaped evidence upgraded to production-live.
- No USF-39 movement out of Backlog without final GO and separate implementation-start authority.

## Required Validation Gates Before Any Future Implementation PR

Before any future implementation PR, the repository must have:

- validate-spec all passing;
- validate-spec imports passing;
- validate-spec instances passing;
- validate-spec evidence passing;
- validate-spec real-instances passing;
- validate-spec implementation passing;
- validate-spec selftest passing;
- validate-spec PR diff mode passing against the intended base;
- strict JSON parse for changed JSON;
- fresh proof publication model checks passing;
- exact source-use/disposition coverage for any source-derived implementation file;
- a human-filled directive that the implementation validator accepts.

## Final Classification

The current state is NO-GO for complete one-pass implementation readiness.

USF-39 remains Backlog.

Implementation extraction was not started.
