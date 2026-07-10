# CI Nightly And Deep Check Policy

| Field | Value |
| --- | --- |
| Linear issue | USF-645 |
| Status | Design artifact for nightly and deep checks |
| Scope | Scheduled deep validation, manual deep proof boundaries, alerts, artifacts, and PR-required assurance |
| Authority posture | This document defines future CI policy expectations only. It does not redefine USF semantic authority. |

## Purpose

USF needs a scheduled or manually triggered deep-check lane for expensive
validation, proof, timing, and artifact trend analysis that should not run on
every PR. The lane must add assurance without becoming a substitute for
required PR, mainline, Test, staging, or human acceptance gates.

This issue is discovery and design only. It does not create schedules, mutate
workflows, change Makefile targets, change package scripts, alter validators,
refresh proof evidence, or run proof-cockpit machine QA.

## Non-Claims

This policy does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Nightly or deep checks cannot make a risky PR safe after the fact. When a
change class requires PR-time or mainline-time assurance, that assurance
remains required in those lanes.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a later
issue changes runtime proof collection behavior enough to require earlier proof
and records that proof.

## Inputs Inspected

- USF-384 baseline timing and cost measurement issue context.
- USF-386 assurance classification matrix issue context.
- USF-637 CI workflow inventory issue context.
- USF-657 CI timeout and retry policy.
- USF-658 CI cost control policy.
- USF-770 regression budget and performance thresholds.
- USF-823 no-regression proof plan.
- USF-827 validator equivalence plan.
- USF-829 rollback strategy.
- USF-987 proof-cockpit route timing expectations.
- Makefile.
- package.json.
- .github/workflows/validate-spec.yml.
- .github/workflows/proof-anchor.yml.
- docs/architecture/proof-artifact-retention-policy.md.

## Current State

The current repository has no dedicated scheduled deep-check workflow in the
inspected CI workflow set. Existing checks are the validate-spec workflow and
the main-only proof-anchor workflow.

The Makefile and package scripts already expose broad local commands that can
inform a future scheduled lane, including foundation validation, test-readiness
validation, composed service proof, coverage, assurance proof, Compose checks,
runtime proof, provider proof, public proof, proof-cockpit acceptance
validation, evidence invalidation, and evidence reuse.

USF-645 defines scheduling and deep-check design only. It does not make those
commands CI-required or scheduled.

## Proposed Deep Lane

The future nightly or manually triggered deep lane should be composed from
bounded check families. A later implementation issue must choose the exact
workflow syntax and runner resources.

| Deep-check family | Candidate checks | Result handling |
| --- | --- | --- |
| Full validation sweep | Full repository validation, parity validation, formal spec validation, validator selftests, evidence invalidation, evidence reuse | Blocking failure for validator, authority, evidence, or non-claim findings. |
| Test-readiness sweep | Test-readiness validator, semantic harness, deterministic fixture lifecycle, composed integration matrix, coverage, assurance proof | Blocking for test-readiness gate failures; no broader readiness claim. |
| Compose and provider sweep | Generated Compose validation, port checks, profile config checks, Compose smoke where safe, provider proof families as classified | Blocking for generated Compose drift or provider fail-closed regressions. |
| Performance and cost trend | Timing records, slowest-command ranking, cache hit or miss summary, artifact byte counts | Warning or blocking according to USF-770 thresholds and implemented budget mode. |
| Artifact and evidence review | Artifact retention checks, evidence freshness, reuse eligibility, chain-of-custody checks, proof-cockpit projection checks | Blocking for stale-as-pass, generated-report-only proof, hash, or chain-of-custody drift. |
| Manual proof lane | Public proof, staging-adjacent proof, proof-review, or proof-cockpit machine QA only when explicitly triggered by the owning issue | Not a default nightly action during orchestration; fresh machine QA remains terminal to USF-966. |

## Initial Current Command Set

The current repository exposes these command candidates for future scheduled or
manual deep checks. USF-645 does not schedule them and does not make them
required checks by itself.

| Deep-check purpose | Current command candidate | Boundary |
| --- | --- | --- |
| Full foundation sweep | `make foundation` or `corepack pnpm verify` | Expensive broad gate; failures remain blocking facts, not readiness claims. |
| Test-readiness sweep | `make test-ready` or `corepack pnpm test-readiness` | Bounded Test-readiness validation; not staging or human acceptance. |
| Validator selftests | Current selftests such as `corepack pnpm validate-spec:selftest`, `corepack pnpm test-readiness:selftest`, `corepack pnpm foundation-substrate-closure:selftest`, `corepack pnpm proof-cockpit:selftest`, `corepack pnpm evidence-invalidation:selftest`, and `corepack pnpm evidence-reuse:selftest` | Selected by implemented nightly scope and budget. |
| Compose and provider sweep | `corepack pnpm compose:validate`, `corepack pnpm test-compose`, and provider proof families selected by classification | Service-backed proof must remain environment and provider-mode honest. |
| Evidence and artifact sweep | `corepack pnpm repo:validate`, `corepack pnpm evidence-invalidation:validate`, `corepack pnpm evidence-reuse:validate`, and `corepack pnpm proof-cockpit:projection-repin` | Generated reports cannot replace raw evidence or validator output. |
| Manual public or staging-adjacent proof | Existing public-proof and proof-review commands only when an owning issue explicitly triggers them | Not default nightly work during orchestration. |

## What Remains PR-Required

Nightly checks must not replace these PR or mainline expectations:

- changed-file classification and fail-closed fallback;
- formal spec and authority validation for semantic or governance changes;
- PR governance validation;
- validator selftests and equivalence checks for validator changes;
- lint, typecheck, tests, and lowest sufficient Dev or Test proof for runtime
  changes;
- command-surface review for Makefile, package script, or CI changes;
- evidence invalidation and reuse checks for proof, artifact, or evidence
  changes;
- staging proof only when the change classification says staging proof is
  required.

If a PR depends on a nightly result to be safe, the PR is not ready for merge.
It must either run the required check in its own lane or remain blocked until
the result exists and is reviewed.

The current broad PR validation remains conservative baseline until USF-639,
USF-659, and USF-827 define and validate a narrower equivalent. Nightly results
may add confidence and trend evidence, but they cannot retroactively satisfy a
PR-time required check that was skipped.

## Alerts And Blockers

Future nightly implementation should classify results this way:

| Result | Handling |
| --- | --- |
| Validator, proof, evidence, non-claim, secret, permission, hash, or chain-of-custody failure | Blocking issue update and dependent lane blocked until resolved. |
| New timeout or repeated infrastructure failure | Blocking or needs review depending on USF-657 retry classification and cleanup evidence. |
| Performance threshold warning | Advisory issue update unless USF-770 marks the threshold blocking for that command class. |
| Artifact growth warning | Advisory or blocking according to retention class, byte growth, and review-critical context. |
| Ambiguous affected-run or cache result | Full-run fallback; cannot satisfy pass. |
| Missing report or generated-report-only summary | Does not satisfy proof; raw output or evidence is required. |

The alert should identify the owning issue, affected lane, failed command
family, source SHA, artifact root, and whether the failure blocks fast PR,
mainline, manual proof, staging promotion, or only the scheduled lane.

## Scheduling Policy

Future scheduling should follow these rules:

- nightly or scheduled deep checks add trend and broad assurance but do not
  weaken PR or main gates;
- expensive checks may be manual when they need operator context, secrets,
  public proof, staging-adjacent surfaces, or human review;
- proof-cockpit machine QA is not scheduled during orchestration before
  USF-966;
- any future incremental proof-cockpit machine QA policy requires the owner
  decision issue for incrementalization and must preserve route, screenshot,
  warning, gap, non-claim, and evidence coverage;
- scheduled runs must retain enough raw logs, reports, and manifests for
  review;
- skipped scheduled checks must record why they were skipped.

## Dependencies

- USF-386 supplies the assurance classification matrix.
- USF-639 should consume this lane when creating the broader required-checks
  matrix.
- USF-647 owns manual proof checks.
- USF-657 supplies timeout and retry rules.
- USF-658 supplies cost-control rules.
- USF-770 supplies regression budget thresholds.
- USF-987 supplies proof-cockpit route timing expectations.
- USF-966 remains the terminal proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should demonstrate:

- scheduled checks do not replace PR-required checks;
- failed deep checks update the controlling issue or dashboard visibly;
- artifact and timing outputs are retained and lower-authority where
  appropriate;
- proof-cockpit machine QA is not scheduled before USF-966 during orchestration;
- staging proof stays explicit and classification-driven;
- generated reports cannot satisfy proof without raw evidence.

## Acceptance Mapping For USF-645

USF-645 requires which checks run nightly, what blocks, what alerts, and what
remains PR-required. This design satisfies that by defining:

- proposed deep-check families;
- PR-required checks that nightly cannot replace;
- blocker and alert handling;
- scheduling boundaries;
- dependencies, validation expectations, and non-claims.

No CI workflow, schedule, required check, Makefile target, package script,
validator, runtime behavior, proof evidence, or proof-cockpit machine evidence
was changed by this issue.
