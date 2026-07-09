# Rollback Strategy

| Field | Value |
| --- | --- |
| Linear issue | USF-829 |
| Status | Design artifact for optimisation risk management |
| Scope | Repository, command, validator, CI, artifact, evidence, cache, and proof optimisation rollback planning |
| Authority posture | This document plans rollback expectations only. It does not redefine USF semantic authority. |

## Purpose

This strategy defines how USF optimisation work must be rolled back, corrected,
or paused when a change weakens assurance, breaks command compatibility,
invalidates evidence unexpectedly, creates review ambiguity, changes proof
posture, or produces a result that cannot be honestly proven.

It applies to the USF-952 orchestration programme and extends the
no-regression proof plan in `docs/architecture/no-regression-proof-plan.md`.
It is required before high-risk work such as Makefile restructuring, command
deprecation, validator refactoring, CI reshaping, cache or affected-only
execution, artifact retention changes, evidence promotion changes, and
proof-cockpit incrementalisation.

## Non-Claims

This strategy does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, compliance
certification, store readiness, release readiness, or human acceptance.

This strategy does not authorize deleting accepted proof or evidence,
downgrading validators, weakening non-claims, bypassing Dev/Test/Staging proof
ladder discipline, or treating generated reports as authority.

This strategy does not require fresh proof-cockpit machine QA for every
rollback. Fresh proof-cockpit machine evidence remains deferred to the terminal
orchestration gate tracked by USF-966 unless a specific rollback changes
runtime, provider, public proof, deployment, or human-acceptance surfaces enough
to require earlier explicit proof.

## Rollback Principles

- Preserve accepted proof and closure records.
- Prefer a forward corrective commit or revert PR over rewriting shared history.
- Restore the last known safe command, validator, evidence, and CI behavior
  before pursuing performance or cleanup again.
- Keep rollback scope narrow, but widen proof when impact cannot be isolated.
- Mark stale, unknown, partial, mismatched, superseded, generated-report-only,
  human-review-required, and terminal-refresh-deferred evidence as non-current.
- Do not convert speed improvements into assurance reductions.
- Do not make a stronger claim because a rollback passed a narrower gate.
- Record every rollback decision in the controlling Linear issue and the
  affected implementation issue.

## Rollback Triggers

Rollback, block, or pause the optimisation when any trigger applies:

| Trigger | Required response |
| --- | --- |
| Validator that previously passed now fails without an accepted authority change | Stop the optimisation, restore or repair validator behavior, and rerun the relevant validator and aggregate gate. |
| Validator rule, severity, or planted defect changes unintentionally | Revert the validator change or open an explicit rule-change issue with authority and proof expectations. |
| Make target or package script disappears unexpectedly | Restore the command, alias, exit-code contract, and artifact location unless an approved deprecation issue exists. |
| CI required-check matrix changes unintentionally | Revert CI change or restore local parity and required status checks before merge. |
| Cache or affected-only path cannot explain all correctness inputs | Disable the shortcut or force full validation on ambiguity. |
| Evidence freshness becomes stale, unknown, partial, mismatched, superseded, or generated-report-only while treated as pass | Invalidate the evidence for current-pass use and rerun the affected proof family. |
| Proof-cockpit projection output drifts from retained machine evidence | Revert projection output or rerun projection-only checks from retained evidence; do not claim fresh machine QA. |
| Proof-cockpit comparator reports normalized artifact drift outside approved volatile fields | Treat as a review finding, not a pass; restore prior artifact behavior or require explicit review. |
| Screenshot or human-review artifact pruning removes review-critical context | Restore the artifact reference and require owner decision before any destructive pruning. |
| Proof-review gate remains open after a temporary review operation | Restore the closed default posture and preserve the acceptance ledger explicitly. |
| Secret, credential, or account material appears in logs, screenshots, reports, or artifacts | Stop work, remove exposure through the approved security path, and do not continue ordinary optimisation until risk is resolved. |
| Staging, production, compliance, store, product, release, deployment, or readiness claim exceeds observed proof | Remove the claim and rerun the proof or validation required for the intended statement. |
| Accepted proof or evidence would be deleted or downgraded | Stop for owner decision; ordinary rollback cannot approve this. |

## Rollback Tiers

Use the least invasive tier that restores assurance and preserves auditability.

| Tier | When to use | Expected action |
| --- | --- | --- |
| Tier 0: clarification | Issue wording, Linear linkage, or report ambiguity before merge | Correct the issue, description, comment, or draft report without touching shared code or evidence. |
| Tier 1: branch correction | Problem found on an unmerged PR branch | Add a corrective commit or replace the unmerged branch content, then rerun issue-specific validation. |
| Tier 2: merged corrective PR | Problem merged to the orchestration branch but isolated and reversible | Open a rollback or corrective PR that reverts the affected commit or files without rewriting shared history. |
| Tier 3: widened proof recovery | Rollback affects validators, proof, evidence, cache, CI, or command surface | Restore behavior and run affected proof-family validation plus aggregate validation on ambiguity. |
| Tier 4: owner-decision recovery | Rollback would delete accepted evidence, weaken validators, change authority, affect provider/account ownership, or make a readiness claim | Stop ordinary execution, record the material decision needed, and proceed only after explicit owner decision. |

## Git Protocol

USF rollback work must preserve Git as change-history evidence:

- Do not use destructive shared-history operations for ordinary rollback.
- Do not use reset or checkout to discard unrelated user work.
- For merged orchestration work, create a focused rollback branch from the
  current orchestration branch and open a PR.
- Prefer a Git revert of the offending merge commit when the rollback is a clean
  inverse and does not delete accepted evidence unexpectedly.
- Prefer a targeted corrective commit when a pure revert would remove later
  valid work or produce stale evidence references.
- Keep commit messages issue-referenced and honest about scope.
- After merge, sync the local orchestration branch, confirm a clean worktree,
  confirm stashes, and update Linear.

Git tags and commits are lineage anchors. They do not define semantic authority
and do not upgrade evidence freshness by themselves.

## Surface-Specific Rollback Checks

### Command Surface

Rollback must restore or explicitly account for:

- Makefile target names, aliases, and help output.
- Package script names and command bodies.
- Exit-code semantics.
- Inputs, environment variables, credential checks, and destructive behavior.
- Output and artifact locations.
- Compatibility aliases such as foundation, dev-ready, validate-evidence,
  proof-cockpit-compare, proof-cockpit-projection-repin, and proof-review-repin.
- Evidence validation aliases such as evidence-invalidation-validate,
  evidence-reuse-validate, and proof-cockpit-projection-repin-check.

Validation expectations include command inventory comparison, help output
inspection where applicable, validate-spec, repository aggregate validation, and
targeted command smoke tests that do not require staging by default.

### Validators

Rollback must restore or explicitly account for:

- Rule IDs and severity.
- JSON output shape.
- Selftest and planted-defect behavior.
- Aggregate command wiring.
- False-positive and false-negative expectations.
- Rule-to-authority traceability.

Validation expectations include the affected validator all mode, affected
selftest, planted-defect or negative-control checks, validate-spec, and
repository aggregate validation.

### CI And Automation

Rollback must restore or explicitly account for:

- Required check names and required status checks.
- Local parity commands.
- Cache keys and fallback behavior.
- Artifact upload and download behavior.
- Timeout, retry, and sharding policy.
- Secret safety and token exposure boundaries.

Validation expectations include local parity where available, validate-spec,
repository aggregate validation, and passing PR checks before merge.

The proof-anchor workflow publishes attested proof-anchor tags from main. A
branch-local rollback must not claim proof-anchor freshness before the relevant
merge and CI evidence exists.

### Evidence And Artifacts

Rollback must restore or explicitly account for:

- Evidence manifests, artifact manifests, hashes, and chain-of-custody rows.
- Retention classifications.
- Freshness state and stale propagation.
- Generated-report lower-authority labels.
- External-review bundle references.
- Human review and acceptance evidence.
- Artifact paths referenced by evidence records or validators.

Validation expectations include evidence invalidation validation, evidence reuse
validation, proof-cockpit acceptance validation where relevant, and repository
aggregate validation on ambiguity.

### Proof-Cockpit

Rollback must restore or explicitly account for:

- Retained machine QA artifact root references.
- Projection-only outputs generated from retained machine evidence.
- Current-run metadata alignment.
- Non-claim tokens.
- Warning, failure, and unresolved-gap counts.
- Screenshot identity and service-authentication posture.
- Human acceptance separation and proof-review gate closure.

Projection-only rollback may use proof-cockpit projection checks and
proof-cockpit acceptance validation. Fresh machine QA remains terminal to
USF-966 unless the rollback itself explicitly requires earlier proof and records
that proof.

Current retained proof-cockpit context includes
`artifacts/proof-cockpit/machine-runs/2026-07-06T15-10-33-975Z`, whose retained
machine-run source SHA is `8a959501dbc1ecc0390c1e50388b94e8fbe20e8e`. Branch
HEAD changes after that retained run must not be described as fresh machine QA
evidence.

Operational proof-review commands can mutate ledger or evidence state. Treat
proof-review-down and proof-review-repin as operational recovery actions, not
read-only validation commands.

### Cache And Affected-Only Execution

Rollback must restore or explicitly account for:

- Input hashing.
- Cache-key completeness.
- Changed-file classification.
- Full-run fallback on ambiguity.
- Stale evidence detection.
- Provider and environment mismatch behavior.
- Local and CI cache parity.

Validation expectations include evidence invalidation classify mode, evidence
invalidation validation, evidence reuse validation, and full validation fallback
when classification is ambiguous.

## Owner Decision Required

Stop ordinary rollback and record an owner decision when:

- Accepted proof or evidence would be deleted, downgraded, or made
  unverifiable.
- A validator, non-claim, or fail-closed rule would be weakened.
- Constitutional authority or the authority order would change.
- Provider account ownership, paid provider use, credential custody, legal
  posture, or compliance posture is materially affected.
- A readiness, staging, production, product, compliance, store, release,
  deployment, or live-provider claim would be made.
- A rollback cannot distinguish between preserving assurance and preserving
  performance.
- A destructive artifact or evidence cleanup cannot be reversed.

Owner decisions must be explicit. They must not be inferred from a passing
validator, a green CI run, a Git merge, or a generated report.

## Rollback Acceptance Package

Before a rollback issue is marked Done, record:

- Issue key, offending change, rollback tier, and change class.
- Commit, PR, branch, or artifact set being rolled back.
- Files, commands, validators, CI workflows, artifacts, and proof families
  affected.
- Authority files inspected.
- Whether accepted proof or evidence was touched.
- Validation run and exact result.
- Validation intentionally not run, with reason.
- Evidence invalidation and reuse outcome where applicable.
- Proof-cockpit machine QA status and whether terminal refresh remains deferred.
- Non-claim review.
- Owner decision status, if any.
- Worktree, branch, PR, merge, and stash state after completion.

Checklist items in Linear may be checked only when the corresponding evidence
exists.

## Validation Defaults

The exact validation set is issue-specific. Default rollback validation is:

- Strict JSON parse when JSON was touched.
- Whitespace and diff sanity checks.
- Validate-spec.
- Repository aggregate validation when rollback touches architecture, proof,
  evidence, command routing, validators, CI, or authority-adjacent docs.
- Evidence invalidation validation and classify mode for evidence, artifact,
  command, proof, cache, CI, or authority-adjacent changes.
- Evidence reuse validation when rollback touches evidence, artifact reuse, or
  freshness.
- Proof-cockpit acceptance validation and selftest when rollback touches
  proof-cockpit artifacts, projections, or acceptance surfaces.
- PR checks before merge.
- Projection re-pin check when rollback touches proof-cockpit projections.

Staging proof is not a default rollback requirement. Escalate to staging only
when the rollback changes staging-relevant runtime, deployment, provider
integration, public proof, or human acceptance surfaces.

## Relationship To Controlled Issues

This strategy supports:

- USF-365 Optimisation risk management.
- USF-823 No-regression proof plan.
- USF-827 Before and after validator equivalence.
- USF-828 Before and after proof-cockpit equivalence.
- USF-829 Rollback strategy.
- USF-966 Terminal fresh proof-cockpit machine evidence refresh.
- USF-970 Proof-cockpit projection-only re-pin and external-review bundle check.
- USF-976 Evidence invalidation validator.
- USF-983 Evidence reuse validator.

Future rollback implementation issues may be stricter than this strategy. They
must not be weaker unless USF authority and explicit owner decision permit it.
