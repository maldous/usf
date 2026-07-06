# Complete Readiness Blocker Register

| | |
|---|---|
| **Document type** | Architecture / readiness blocker register |
| **Status** | Draft / READY_FOR_V2_BOOTSTRAP marker register and NO-GO implementation register |
| **Authority level** | Reviewable readiness classification; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, and semantic instances |
| **Issue scope** | USF-39 readiness; USF-59; USF-73; USF-97; USF-98; USF-99; USF-100; USF-101; source-lineage L5 equivalence audit workstream USF-102–USF-119 |
| **Base repository state reviewed** | `fabe47b8fc70d34b34d1fc05c39da998c74a6748` |
| **Branch update scope** | Records the USF V2 foundation-completeness audit harvest, proof-anchor publication state, and final V2 readiness reconciliation; USF's own self-defined source-import baseline is frozen at commit `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767` (tag `v1-final`) as recorded source lineage only; final merged commit is determined by Git history |

This document records the current complete-readiness blocker state before implementation extraction. It creates no implementation code, implementation directory, product runtime, source import, proof evidence, generated report, schema activation, or implementation directive. It does not start USF-39.

This register is a point-in-time review pinned to the commit above. Later governance-only commits advance HEAD without changing the verdict, and current proof freshness is carried by the per-merge proof-anchor tag on the live HEAD, not by this prose.

## Current Verdict

Bootstrap marker readiness is READY_FOR_V2_BOOTSTRAP.

Complete one-pass implementation readiness is NO-GO.

USF-39 must remain Backlog because the repository does not yet have all of the following:

- a safe proof freshness publication model for current commit evidence — RESOLVED (USF-101 Done): the proof-anchor CI workflow publishes and verifies a CI-attested anchor on each merge commit;
- fresh non-stale proof evidence for every readiness claim — PARTIAL: the authentication proof substrate now has a fresh, verified, commit-pinned anchor (USF-59 Done); broader runtime proof remains bounded by pre-implementation scope (USF-99) and stronger multi-environment postures remain deferred (USF-73);
- full semantic and source-use closure for every implementation-relevant slice, or explicit scope exclusions;
- validator-checkable semantic completeness, source audit base, and aggregate provider/environment posture gates;
- a human-filled implementation directive that cites exact scope, source-use, proof evidence, validation gates, no-go rules, and stop conditions.

The current repository remains valid as a semantic-first readiness foundation and is ready for the human-friendly bootstrap marker once validation passes on `main` with the matching immutable proof-anchor tag. It is not a complete implementation-start authority.

After the bootstrap/toolchain movement (TypeScript/Node decision, ADR 0009 dev/test boundary, `tools/validate-bootstrap` clean), the agent-resolvable readiness inputs are in place. The remaining gates to a local dev/test bootstrap implementation start are exactly two, and both are human: a signed USF-100 directive, then a separate USF-39 start action (with a USF-75-equivalent revalidation rerun immediately before it). The final consolidated rollup is `docs/architecture/foundation-completeness-audit.md` section 12; the fresh revalidation is in `docs/architecture/final-pre-usf-39-readiness-revalidation.md`. USF-39 remains Backlog.

## Foundation-Completeness Audit Harvest (USF-102 workstream)

USF's own self-defined source lineage is frozen at commit `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767` (tag `v1-final`) as recorded source lineage only, and the harvest is recorded in `docs/architecture/foundation-completeness-audit.md`. That audit classifies every recorded capability, proof, source-use, build, environment, CI, operational, data, configuration, governance, hexagonal-architecture, and UI artefact against the USF V2 corpus using the controlled classification and gap vocabularies.

The harvest materially reduces and sharpens the blocker set without weakening any safety rule. The smallest truthful remaining NO-GO set is:

1. USF-101: DONE. The proof-anchor CI workflow (`.github/workflows/proof-anchor.yml`, ADR 0006 carrier lineage + ADR 0007 CI signer + ADR 0008 attested-tag amendment) is enabled, and the current reviewed main run `28286276338` on commit `fabe47b8fc70d34b34d1fc05c39da998c74a6748` emitted, verified, attested, and published a fresh CI-attested anchor (`proof-anchor-fabe47b`); it republishes a fresh anchor on every merge. USF-59 is DONE (authentication-slice fresh, verified, commit-pinned proof via the anchor). USF-73 and USF-99 remain bounded by pre-implementation proof scope: stronger multi-environment postures and broad per-slice runtime proof require the implementation that USF-39 would create, and are recorded as deferred/not-proven rather than claimed.
2. USF-100: a human-filled implementation directive. A ready-to-sign DRAFT now exists at `docs/architecture/implementation-extraction-directive.md`, scoped to the whole-platform V2 migration (all slices), validator-clean for directive text, and unaccepted. It is blocked on the authorising human's signature, USF-100 acceptance, and final USF-75 revalidation before any USF-39 start action.
3. USF-113: DONE. ADR 0005 records the hexagonal architecture carry-forward decision as language-agnostic authority.
4. USF-97: IN PROGRESS. The domain corpus is broad but not implementation-closed; per-slice source-use matrices and exact topology/file gates are still required before files are created.
5. USF-98/USF-117: IN PROGRESS/BACKLOG. The validator now checks additional readiness and directive staleness conditions, but complete equivalence-ledger and aggregate posture gates remain repository-workable follow-up.

All source-lineage L5 proof remains lineage/stale for USF; no hermetic proof is upgraded to live-external and no production-shaped evidence is upgraded to production-live.

## Dependency Graph

| Blocker | Current state | Blocks | Classification |
|---|---:|---|---|
| USF-101 proof freshness publication model | Done | — | Resolved: CI proof-anchor workflow publishes and verifies a CI-attested anchor per commit (current reviewed run 28286276338, tag proof-anchor-fabe47b) |
| USF-59 current commit-pinned proof evidence | Done | — | Resolved: authentication-slice fresh, verified, commit-pinned anchor via the proof-anchor workflow |
| USF-73 multi-environment proof evidence | Backlog | USF-99, USF-100, USF-39 | Blocked by stronger proof infrastructure and implementation/runtime substrates, not by USF-101 |
| USF-97 full semantic and source-use closure | In Progress | USF-100, USF-39 | Repository-workable, but broad and not complete |
| USF-98 one-pass readiness validator hardening | Backlog | USF-100, USF-39 | Partially advanced by PR 54, PR 58, and current validator hardening; repository-workable follow-up remains |
| USF-99 one-pass runtime proof and evidence execution | Backlog | USF-100, USF-39 | Blocked by proof publication model, runtime proof scope, and implementation prohibition |
| USF-100 human-filled implementation directive | Backlog | USF-39 | Requires human authority after blockers close |
| USF-39 implementation extraction | Backlog | Implementation start | Must not start without final GO and separate directive |

## Blocker Details

### USF-101 Proof Freshness Publication Model

The proof-only authentication harness can run against the current repository state and report a hermetic-mock, hermetic, behaviour-proven pass without writing evidence. That is useful execution signal, but it is not enough for current readiness because committed evidence records remain stale.

The current validator correctly fails closed when a record says `freshness.stale` is false but its `freshness.commit` differs from the current commit. A normal committed JSON update cannot satisfy that rule after merge if it writes the commit being claimed into the same commit, because committing the JSON changes the commit hash.

This requires an explicit publication model, such as a post-merge attestation, tag or signed evidence anchor, dedicated evidence publication workflow, or a higher-authority freshness decision that preserves proof honesty. Generated reports must not be promoted to proof authority.

`docs/architecture/proof-freshness-publication-model.md` records the post-merge evidence-anchor model and the validator guard that blocks PRs from changing evidence or generated-report JSON to claim non-stale freshness before publication. `docs/architecture/proof-freshness-anchor-carrier-decision.md` records the accepted carrier and trust model. The proof harness emits a deterministic anchor payload and the validator selftests payload invariants; local payloads are not proof authority. The carrier and signer are decided by ADR 0006, ADR 0007, and ADR 0008: the implemented carrier is an annotated tag carrying a CI-attested payload from the registered repository CI identity in `tools/validate-spec/proof-anchor-trust-root.json`, data-checked by validator rule USF-ANCHOR-008. The source-lineage L5 proof audit (`docs/architecture/foundation-completeness-audit.md`, section 5) confirms no source-lineage proof can substitute: all source-lineage proof is hermetic/local/sandbox lineage and is stale for current USF readiness. USF-101 is DONE. For the current reviewed main commit, the proof-anchor CI workflow run `28286276338` emitted the deterministic anchor payload, verified it (`validate-spec anchor`, USF-ANCHOR-001..008 including trust-root membership), attested it keyless with the repository CI identity (`actions/attest-build-provenance`), verified the attestation (`gh attestation verify`), and published the annotated tag `proof-anchor-fabe47b` on the merge commit. The workflow republishes a fresh anchor on each subsequent merge, so the live commit carries a fresh, verified anchor; committed evidence JSON remains historical/stale by design and is never the freshness carrier.

### USF-59 and USF-73 Proof Evidence

Existing authentication proof records are historical hermetic evidence for their recorded claim commit. Current authentication-slice freshness is carried by the post-merge anchor (`proof-anchor-fabe47b`) rather than by mutating committed evidence JSON to claim non-stale freshness. The records do not claim live-external-provider readiness or production-live readiness.

Stronger postures remain unproven and must not be inferred from hermetic proof.

### USF-97 Semantic and Source-Use Closure

The current semantic corpus now contains validator-readable semantic-contract instances for every semantic-contract target named by the capability source coverage matrix. Five authentication/identity contracts are source-backed drafts; the remaining non-authentication targets are explicit deferred gap or non-applicable contracts. That is useful target-inventory closure, but it does not prove complete one-pass coverage for every implementation-relevant capability, route, provider, data, UI, workflow, command, storage, reliability, and cross-capability concern.

Future work must replace deferred gap facets with validated semantic/source-use records for each implementation-relevant slice, or preserve explicit scope exclusions without treating source lineage structure as authority. The source-lineage L5 equivalence audit (`docs/architecture/foundation-completeness-audit.md`, section 4) now classifies all 75 historical capabilities (source-backed-but-stale-proof, semantic-only-deferred, or excluded-not-applicable) and reduces USF-97 to an enumerated, ranked authoring backlog plus per-domain source-use matrices for the whole-platform directive.

### USF-98 Validator Hardening

PR 54 merged validator guardrails for generated report homes, report filenames, evidence references, stale pass claims, implementation directive content, deeper source-path mirroring, and planted defects. PR 58 added proof freshness anchor payload invariant checks and positive/negative selftests without accepting unsigned payloads as proof authority.

The current validator hardening adds fail-closed checks for complete semantic facet references, the pinned source import audit-base tuple, proof/envelope posture agreement, non-stale proof without an accepted freshness anchor, and coverage-matrix semantic-contract targets without instances. USF-98 remains open because full source-use closure outside the authentication slice, completed source-backed non-authentication facets, and complete aggregate posture classification for future implementation claims still require additional validator-readable scope artefacts and proof publication authority. The source-lineage L5 equivalence audit (`docs/architecture/foundation-completeness-audit.md`, section 10) defines a stable equivalence/gap vocabulary and a proposed machine-readable ledger shape, and records the specific fail-closed validator-rule candidates (each requiring a planted defect and selftest) as USF-98/USF-117 follow-up; it deliberately does not modify the currently clean validator.

### USF-99 Runtime Proof and Evidence

Complete readiness requires executed proof, or explicit classification, for every behaviour readiness claim. Current proof is not broad enough for full one-pass readiness and current committed proof evidence remains stale.

No product runtime may be created merely to satisfy this issue. If proof requires product implementation, live credentials, production infrastructure, or source-lineage runtime import, the issue remains blocked until separately authorised.

### USF-100 Human-Filled Implementation Directive

A ready-to-sign DRAFT directive now exists at `docs/architecture/implementation-extraction-directive.md`. It is scoped to the whole-platform V2 migration (all slices, every semantic-contract capability), not a single slice. It is validator-clean (USF-DIRECTIVE-001 passes, no placeholder phrases) and explicitly unaccepted: its acceptance signature block is unsigned, USF-100 is not closed, and USF-39 remains Backlog. The agent does not self-authorise; acceptance requires the authorising human to complete the signature block, record acceptance on USF-100, and issue a separate USF-39 start action after USF-75 final pre-extraction revalidation.

The draft was authorable truthfully because the readiness blockers it cites are now closed or explicitly classified: USF-101 (proof publication model) and USF-59 (fresh commit-pinned proof) are Done, and the remaining items (USF-73/USF-97/USF-98/USF-99/USF-117) are recorded as deferred or bounded per-slice gates rather than weakened. Each slice's exact target files, source-use disposition matrix, and authorised topology roots must be completed before that slice's files are created.

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

The current state is READY_FOR_V2_BOOTSTRAP for bootstrap marker readiness.

The current state is NO-GO for complete one-pass implementation readiness.

USF-39 remains Backlog.

Implementation extraction was not started.
