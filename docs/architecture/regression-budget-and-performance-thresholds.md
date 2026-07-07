# Regression Budget And Performance Thresholds

| Field | Value |
| --- | --- |
| Linear issue | USF-770 |
| Status | Design artifact for regression budget and performance threshold policy |
| Scope | Commands, validators, CI jobs, cache behavior, artifacts, proof paths, and future UI workload growth |
| Authority posture | This document defines future performance-budget expectations only. It does not redefine USF semantic authority. |

## Purpose

USF optimisation work needs performance guardrails before larger UI,
environment, cache, CI, and proof-pipeline work grows the command surface. This
design defines regression budget metrics, threshold bands, enforcement modes,
and owner-decision requirements for future implementation issues.

Performance budgets are operational controls. They do not replace semantic
authority, validator rules, runtime proof evidence, accepted ADRs, or the proof
ladder. A faster command is not accepted if it weakens assurance, hides a
validator failure, narrows proof evidence, skips required tests, or makes a
claim that existing evidence does not support.

This issue is discovery and design only. It does not change CI workflows,
Makefile targets, package scripts, command execution, cache behavior, command
results, proof evidence, or runtime behavior. The validator-owned changes
paired with this document are limited to a narrow evidence-invalidation
classification selector for this new architecture document and the corresponding
evidence-reuse decision hash update, so changed-file proof impact does not
remain ambiguous and validator-owned policy content-addressing remains current.

## Non-Claims

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

This design does not authorize reducing validation, deleting proof evidence,
weakening non-claims, treating generated reports as authority, collapsing
Dev/Test/Staging proof, or making staging the default proof path.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a later
implementation issue changes runtime proof collection behavior enough to require
earlier proof and records that proof.

## Inputs Inspected

- USF-384 baseline timing and cost measurement issue context.
- USF-637 CI workflow inventory issue context.
- Makefile.
- package.json.
- .github/workflows/validate-spec.yml.
- .github/workflows/proof-anchor.yml.
- docs/architecture/current-state-command-surface.md.
- docs/architecture/no-regression-proof-plan.md.
- docs/architecture/rollback-proof-strategy.md.
- docs/architecture/no-regression-proof-before-after-timing-comparison.md.
- docs/architecture/proof-command-target-timing-instrumentation.md.
- docs/architecture/no-regression-proof-before-after-validator-equivalence.md.
- docs/architecture/proof-cockpit-machine-qa-per-route-timing-instrumentation.md.
- docs/architecture/proof-artifact-retention-policy.md.
- docs/architecture/proof-cockpit-machine-qa-artifact-minimisation.md.

## Baseline Source

USF-384 is the current measured baseline for this programme. It recorded warm
workspace timings, a cold isolated install observation, artifact sizes, network
observations, and a slowest-command ranking. It also recorded failures as
blockers rather than hiding them.

The baseline is planning evidence, not semantic authority and not a readiness
claim. Future budgets should compare against USF-384 only when the command,
input set, proof level, cache state, artifact contract, and environment boundary
remain comparable. If the command contract changes, the implementation issue
must create a fresh baseline for that command before judging regression or
improvement.

The measured baseline includes these planning values:

| Command or area | Baseline observation |
| --- | --- |
| Warm install | 1 second, pass |
| Cold isolated install | 4 seconds, pass, 515 downloaded packages, about 1.1 GB file-system output |
| validate-spec | 32 seconds, pass |
| validate-spec selftest | 13 seconds, pass |
| enterprise validation | 38 seconds, pass |
| runtime validation | 6 seconds, pass |
| compose validation | 1 second, pass |
| test-readiness validation | 10 seconds, pass |
| proof-cockpit acceptance validation | 4 seconds, failed at baseline, tracked separately |
| foundation substrate closure validation | under 1 second, pass |
| lint | 4 seconds, failed at baseline, tracked separately |
| typecheck | 9 seconds, pass |
| test suite | 12 seconds, failed at baseline, tracked separately |
| repo aggregate validation | 104 seconds, failed at baseline, tracked separately |
| proof-cockpit smoke | 3 seconds, pass |
| proof-cockpit machine QA | timed out at 120 seconds, tracked by USF-961 and terminal USF-966 |
| compose smoke | 2 seconds, failed at baseline, tracked separately |
| evidence directory | about 1.8 MiB |
| artifacts directory | about 105 MiB |

Known baseline failures and timeouts are not budget failures by themselves for
this issue. They are existing state. A future change fails the budget when it
makes a comparable path slower, larger, less predictable, less observable, or
less assured without an accepted explanation and proof path.

## Metrics

Future budget reports should record these metrics where safely measurable:

| Metric group | Required metrics |
| --- | --- |
| Timing | wall duration, queue or setup duration where available, timeout flag, retry count, cold or warm cache state |
| Result | exit code, pass/fail status, failure category, failed step, skipped step, unavailable step |
| Resource cost | peak memory, CPU time, file IO, network IO, process count, Docker or Compose startup time where in scope |
| Cache | cache key, cache hit/miss/disabled/unknown state, restored bytes, saved bytes, cache fallback path |
| Artifacts | artifact root, file count, byte count, added bytes, removed bytes, retention class, generated-report lower-authority boundary |
| Assurance | validators run, proof family, evidence family, route count, screenshot count, service count, warning count, gap count, non-claim state |
| CI | workflow name, trigger, job duration, step duration, required-check status, artifact upload/download behavior, runner class |
| Comparison | before SHA, after SHA, baseline source, sample count, variance note, allowed difference, blocking difference |

The timing record defined by USF-415 is the preferred future raw input. The
before and after comparison model defined by USF-826 is the preferred review
shape. Generated summaries remain lower authority than raw timing records and
validator outputs.

## Threshold Bands

Thresholds are review triggers. They are not a license to skip required
assurance. Correctness, proof, evidence freshness, non-claims, and validator
behavior outrank speed.

| Command class | Warning threshold | Blocking threshold |
| --- | --- | --- |
| Commands under 5 seconds | Increase of at least 1 second and 25 percent | Increase of at least 3 seconds and 75 percent without explanation or mitigation |
| Commands from 5 to 30 seconds | Increase of at least 2 seconds and 15 percent | Increase of at least 5 seconds and 30 percent without explanation or mitigation |
| Commands from 30 to 120 seconds | Increase of at least 5 seconds and 10 percent | Increase of at least 15 seconds and 25 percent without explanation or mitigation |
| Commands over 120 seconds | Increase of at least 30 seconds or 10 percent | New timeout, repeated timeout, or increase of at least 25 percent without explicit issue linkage |
| CI validate job | Increase of at least 10 percent against comparable job history | Increase of at least 25 percent, new required-check timeout, or missing required artifact/report |
| Install and dependency setup | Increase of at least 10 percent for comparable cold or warm state | Frozen install no longer reproducible, cache key unsafe, or cold setup grows by at least 25 percent without dependency rationale |
| Compose startup or smoke | Increase of at least 15 percent or added port-conflict sensitivity | New service startup timeout, hidden healthcheck failure, or missing teardown |
| Proof-cockpit machine QA | Any increase over terminal USF-966 baseline requires investigation | New timeout, route/screenshot/evidence reduction, or hidden warning/gap; ordinary changes do not require fresh machine QA before USF-966 |
| Artifact roots under 10 MiB | Growth of at least 2 MiB | Growth of at least 5 MiB without retention or review rationale |
| Artifact roots from 10 to 200 MiB | Growth of at least 10 MiB or 5 percent | Growth of at least 50 MiB or 25 percent without retention, hash, and chain-of-custody rationale |
| Artifact roots over 200 MiB | Growth of at least 5 percent | Growth of at least 15 percent, missing prune metadata, or loss of review-critical evidence |
| Memory peak | Increase of at least 20 percent | Increase of at least 50 percent, runner OOM risk, or local developer machine pressure without mitigation |
| Network IO | New network dependency or increase of at least 25 percent | Required validation depends on non-hermetic network without approved proof boundary |

Short commands are noisy, so a one-second increase is a warning only when it is
also proportionally large. Long-running proof and CI commands are expensive, so
single-run observations may open an investigation without making a strong
regression claim until comparable samples exist.

## Correctness-First Blocking Rules

The following block performance acceptance regardless of timing improvement:

- a new validator, selftest, planted-defect, test, proof, evidence, or CI
  failure appears without an accepted authority or issue-specific explanation;
- a required command exits successfully after hiding a failed child command;
- a rule ID, severity, non-claim, warning, gap, route count, screenshot count,
  service count, chain-of-custody field, artifact hash, or evidence freshness
  state regresses;
- a generated report is treated as authority over raw validator output or proof
  evidence;
- a cache hit or affected-only run cannot explain all semantic, proof,
  evidence, configuration, provider, environment, dependency, and command
  inputs;
- stale, unknown, partial, mismatched, superseded, generated-report-only,
  human-review-required, or terminal-refresh-deferred evidence is treated as a
  current pass;
- staging proof is used as the default path for a change that should have a
  lower Dev or Test proof level first;
- speed is gained by skipping required assurance, removing a required check, or
  narrowing the proof ladder without explicit owner decision.

## Enforcement Modes

Budget enforcement should be phased. USF-770 defines the policy; later issues
must implement any executable enforcement.

| Mode | Use when | Result |
| --- | --- | --- |
| Informational | Documentation, discovery, and planning-only changes | Record timing and artifact context when useful; no budget gate is imposed. |
| Advisory warning | Low-risk command telemetry, report formatting, or non-blocking dashboard changes | Warn on threshold drift and require explanation before closing the issue. |
| Required review | CI, Makefile, validator, cache, affected-only, artifact, or proof-path design changes | Issue closure must include budget comparison or a reason it is not applicable. |
| Blocking gate | Implemented performance, cache, affected-only, CI required-check, validator-core, artifact-retention, or proof-pipeline changes | Block merge or Done state on unexplained blocking threshold drift or correctness-first failures. |
| Owner-decision gate | Any material assurance tradeoff, paid runner/provider implication, accepted evidence risk, validator weakening, or readiness claim | Stop ordinary execution until an explicit owner decision issue records the choice. |

The default for future low-risk implementation should be required review before
blocking automation. Blocking automation is appropriate only after raw timing
records, variance rules, baseline comparability, local/CI parity, and failure
diagnostics exist.

## Owner Decision Requirements

An owner decision issue is required before any future implementation:

- raises a blocking threshold for a required check;
- suppresses a budget failure for reasons other than measurement error or
  documented non-comparability;
- removes or downgrades a required validator, proof check, non-claim, or
  fail-closed condition;
- turns a full required check into affected-only behavior without fail-closed
  fallback;
- makes staging proof manual or on-demand in a way that affects required proof
  for staging-relevant changes;
- moves large proof artifacts outside Git or changes accepted evidence
  retention;
- spends money, changes provider or runner account ownership, or introduces a
  paid remote cache or runner commitment;
- accepts a material architecture choice where existing USF authority and safe
  enterprise practice do not determine the choice;
- makes or implies a staging, production, product, release, store, compliance,
  deployment, live-provider, or readiness claim.

Ordinary threshold design, warning classification, issue sequencing, label
updates, and enterprise best-practice defaults do not require owner input when
they preserve or strengthen assurance.

## Command Family Budgets

Future implementation should classify every measured command into one of these
families before applying thresholds:

| Family | Examples | Budget emphasis |
| --- | --- | --- |
| Setup | frozen install, workspace setup, tool bootstrap | cold and warm separation, dependency reproducibility, cache safety |
| Syntax and semantic validation | validate-spec, enterprise, runtime, public FQDN, foundation closure | stable exit code, rule coverage, strict JSON, duration trend |
| Validator selftests and planted defects | validator selftest commands and fixture suites | no skipped negative controls, no hidden false pass |
| Repository aggregate | repo validation, parity, verify, foundation, dev-ready | critical path, child-command visibility, no hidden child failure |
| Test readiness and quality | test-readiness, unit tests, coverage, lint, typecheck | mandatory-test selection, failure visibility, memory pressure |
| Compose and provider checks | generated Compose, ports, service integration, smoke | service startup, healthcheck, teardown, port conflict behavior |
| Proof and evidence | proof-cockpit validation, projection re-pin, evidence invalidation, evidence reuse | evidence freshness, non-claims, retained-machine-evidence trace |
| CI and automation | validate workflow, proof-anchor workflow, future scheduled/manual workflows | required status checks, runner time, retry visibility, artifact behavior |
| Artifacts and cache | artifacts, evidence, screenshots, external-review bundles, package caches | byte growth, retention class, hash and chain-of-custody preservation |

## Reporting Requirements

A future budget report should include:

- issue key and change class;
- budget mode selected and why;
- before and after source SHAs;
- baseline source and comparability statement;
- measured commands, samples, cold/warm state, and variance notes;
- wall time, resource cost, cache, artifact, and CI tables;
- thresholds exceeded, allowed differences, warnings, and blockers;
- assurance preserved, assurance added, or assurance traded off;
- validation run and validation not run, with reasons;
- owner decisions required or explicitly not required;
- rollback recommendation when a blocker appears;
- non-claim statement.

When timing cannot be measured safely, the report should say not collected and
explain why. It must not invent a pass, infer a speedup, or hide a failed
command behind a missing measurement.

## Future Implementation Expectations

Future executable budget enforcement should:

- consume raw timing records rather than generated summaries alone;
- validate strict JSON shape for timing and budget reports;
- preserve wrapped command exit codes exactly;
- fail closed when required timing records are missing after timing becomes
  mandatory;
- compare cold and warm runs separately;
- compare local and CI paths when CI behavior changes;
- include cache keys, input hashes, and full-run fallback behavior when cache
  or affected-only logic is involved;
- include artifact byte and file-count checks for evidence, proof-cockpit, CI,
  screenshot, and external-review bundle changes;
- report warnings without converting them into pass claims;
- avoid sending every change to staging by default.

Future implementation should include planted or synthetic negative controls for
missing timing records, changed exit codes, hidden child failures, unsafe cache
hits, generated-report-only evidence, stale evidence treated as pass, artifact
growth without retention rationale, and threshold suppression without owner
decision.

## Dependencies

- USF-384 supplies the measured baseline.
- USF-637 supplies the CI workflow inventory.
- USF-415 defines command timing record expectations.
- USF-826 defines before and after timing comparison methodology.
- USF-827 defines validator equivalence expectations.
- USF-823 defines the no-regression proof plan.
- USF-829 defines rollback strategy.
- USF-657 should use this policy when defining CI timeout and retry behavior.
- USF-658 should use this policy when defining CI cost controls.
- USF-859 and USF-860 remain owner-decision issues for proof-cockpit
  incremental mode and command timing reports when those choices become
  implementation-affecting.
- USF-966 remains the terminal fresh proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should run issue-specific tests first, then the validators
and proof gates relevant to the changed surface. Candidate validation includes
strict JSON parsing for timing and budget records, validate-spec, validate-spec
selftest when the validator surface is touched, repository aggregate
validation, evidence invalidation validation, evidence reuse validation,
proof-cockpit acceptance validation for proof-cockpit evidence or projection
changes, and local or CI parity checks for CI and command-surface changes.

Fresh proof-cockpit machine QA is not required for this design artifact and
should remain deferred to USF-966 unless a later implementation issue records a
stricter proof requirement.

## Acceptance Mapping For USF-770

USF-770 requires a budget proposal defining metrics, thresholds, enforcement
mode, and owner decision requirements. This design satisfies that by:

- defining required metrics for timing, result, resource, cache, artifact,
  assurance, CI, and comparison records;
- defining threshold bands by command duration, CI jobs, install/setup,
  Compose, proof-cockpit machine QA, artifacts, memory, and network use;
- defining correctness-first blocking rules;
- defining enforcement modes from informational to owner-decision gate;
- defining owner decision triggers;
- recording dependencies and future validation expectations.

No CI workflow, Makefile target, package script, command result, runtime
behavior, proof evidence, or proof-cockpit machine evidence was changed by this
issue. The evidence-invalidation map gained a selector for this document so the
new path fails through the existing command-surface affected-family policy
instead of the unknown-input fallback. The evidence-reuse decision artifact
updated the pinned hash for that validator-owned map and kept the terminal
USF-966 refresh boundary blocked.
