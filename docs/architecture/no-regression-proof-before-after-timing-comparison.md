# No-Regression Proof Before And After Timing Comparison

| Field | Value |
| --- | --- |
| Linear issue | USF-826 |
| Status | Design artifact for timing comparison discipline |
| Scope | Performance, cache, CI, command-surface, validation, test, proof, Compose, and artifact optimisation comparisons |
| Authority posture | This document defines future comparison expectations only. It does not redefine USF semantic authority. |

## Purpose

USF optimisation work must be measured before and after changes without
allowing speed to outrank correctness. This design defines the timing comparison
methodology, command set, variance handling, acceptance thresholds, and
assurance comparison required before future performance improvements are
accepted.

This issue is discovery and design only. It does not implement timing
instrumentation, change command execution, update validators, refresh
proof-cockpit machine QA, or make any readiness claim.

## Non-Claims

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Timing improvement is not proof improvement. A faster command is acceptable
only when the required assurance is preserved, increased, or explicitly
recorded as a risky tradeoff behind an owner decision.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a later
implementation issue changes runtime proof collection behavior enough to
require earlier proof and records that proof.

## Inputs Inspected

- USF-384 baseline timing and cost measurement issue context.
- Makefile.
- package.json.
- .github/workflows/validate-spec.yml.
- docs/architecture/proof-command-target-timing-instrumentation.md.
- docs/architecture/no-regression-proof-plan.md.
- docs/architecture/rollback-proof-strategy.md.
- docs/architecture/proof-golden-acceptance-corpus.md.
- docs/architecture/proof-cockpit-machine-qa-route-coverage-profile.md.
- docs/architecture/proof-cockpit-machine-qa-artifact-minimisation.md.
- tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py.

## Baseline Source

USF-384 is the current baseline timing source for the optimisation programme.
It measured common repository commands and identified proof-cockpit machine QA
as the slowest observed path, including a 120-second timeout observation that is
tracked separately by USF-961. That baseline is operational planning evidence,
not USF semantic authority and not a readiness claim.

A future before and after comparison should use the USF-384 baseline when the
command contract and input set are still comparable. If a command's inputs,
target wiring, proof scope, or artifact contract changed, the comparison must
create a new baseline for that command rather than comparing unlike commands.

## Measured Command Set

Future timing comparisons should cover the affected subset of these commands.
If a listed command is unavailable at the time of measurement, the report must
record it as unavailable rather than inventing a result.

| Command family | Representative commands |
| --- | --- |
| Install and setup | frozen dependency install, workspace setup, tool bootstrap |
| Spec validation | validate-spec, validate-spec selftest |
| Enterprise validation | validate-enterprise or equivalent package script |
| Runtime validation | validate-runtime or equivalent package script |
| Compose validation | validate-compose, generated Compose check, port checks |
| Test readiness | validate-test-readiness, composed semantic harness, fixture lifecycle, integration matrix, coverage, assurance scan |
| Proof cockpit | proof-cockpit smoke, proof-cockpit acceptance validation, projection re-pin, proof-cockpit machine QA when explicitly required |
| Repository aggregate | repo validation, parity, verify, foundation, dev-ready |
| Build and static quality | build, typecheck, lint, unit tests, coverage where present |
| Compose lifecycle | compose up, healthcheck wait, seeded reset, compose down |
| Artifact and cache | evidence invalidation, evidence reuse, artifact inventory, cache restore and save |

Current package-script examples include validate-spec, validate-spec selftest,
enterprise validation, runtime validation, compose validation, test-readiness
validation, proof-cockpit validation, proof-cockpit selftest, proof-cockpit
projection re-pin check, repo validation, evidence invalidation validation, and
evidence reuse validation. Proof-cockpit machine QA belongs in timing
comparisons only for USF-966 or for a future issue that explicitly records a
stricter proof requirement.

Staging proof is required only when the change classification says staging
proof is necessary. Documentation, planning, command telemetry, and
projection-only changes must use proportionate proof and must not send every
change through staging by default.

## Methodology

Every before and after timing comparison should record:

- issue key and change class;
- before source SHA and after source SHA;
- command ID and invocation surface;
- command inputs and proof level;
- cold or warm cache classification;
- cache keys and cache hit, miss, disabled, or unknown status;
- startedAt, completedAt, wall duration, exit code, timeout flag, and retry
  count;
- CPU, memory, IO, network, and artifact byte metrics where safely measurable;
- command stdout and stderr artifact paths where retained;
- validation and proof results for the same run;
- non-claim statement and evidence freshness state.

Cold runs should be used to measure setup or cache-seeding cost. Warm runs
should be used to measure repeated developer and CI feedback. Reports must not
mix cold and warm timings into one headline number.

Recommended minimum sample size:

- one cold run for commands where cold-start cost matters;
- three warm runs for commands expected to finish quickly or moderately;
- two warm runs plus variance notes for long-running commands when a third run
  would consume disproportionate time;
- one carefully recorded run only when the issue explicitly documents why more
  runs are unsafe, unavailable, or disproportionate.

The primary comparison value is median warm wall duration where at least three
warm runs exist. For smaller samples, the report should avoid a strong
performance-improvement claim and should describe the result as observed timing
context.

## Acceptance Thresholds

Future optimisation should use these thresholds as review triggers, not as a
license to skip assurance:

| Metric | Acceptance rule |
| --- | --- |
| Correctness and proof result | Any new validator, test, proof, evidence freshness, non-claim, route-count, warning, gap, or hash failure blocks timing acceptance. |
| Commands under 5 seconds | A speedup claim requires at least 1 second and 20 percent improvement. A regression over the same band requires investigation. |
| Commands from 5 to 60 seconds | A speedup claim requires at least 2 seconds and 10 percent improvement. A regression over the same band requires investigation. |
| Commands over 60 seconds | A speedup claim requires at least 10 seconds and 10 percent improvement. A regression over the same band requires investigation. |
| Long service or proof commands | Repetition may be bounded when repeated runs are disproportionate, but the report must record timeout, failure, and variance limits and must avoid strong speed claims from a single noisy run. |
| Artifact byte growth | More than 5 percent or 10 MiB growth, whichever is greater, requires artifact-class explanation. |
| Cache hit behavior | A faster cached run is not accepted unless cache keys include all correctness inputs and ambiguity falls back to full validation. |
| Proof-cockpit route or evidence counts | Any unexplained reduction in route, screenshot, service, evidence, chain-of-custody, warning, gap, or non-claim coverage blocks acceptance. |
| CI parity | Local timing success is insufficient if the corresponding CI path changes required checks, cache behavior, artifacts, or timeouts without parity evidence. |

When timing improves but assurance changes, the issue must explicitly state
whether assurance was preserved, added, or traded off. Risky tradeoffs require
owner-decision issue linkage before implementation proceeds.

## Assurance Comparison

Every timing comparison must include an assurance comparison appropriate to the
change class:

- command-surface changes require before and after command inventory, target
  contract, exit-code, and artifact-location comparison;
- validator changes require selftest, planted-defect, severity, rule-ID, and
  false-positive or false-negative review;
- test changes require mandatory-test selection, skipped-test reason, coverage
  posture, and flake handling;
- cache or affected-only changes require input-hash completeness, stale
  evidence detection, provider and environment mismatch handling, and full-run
  fallback;
- CI changes require required-check matrix, local parity, cache keys, artifact
  upload and download policy, timeout, retry, and secret-safety review;
- proof-cockpit changes require proof-cockpit acceptance validation,
  projection checks where applicable, retained machine-evidence trace, and
  terminal-refresh boundary review;
- Compose or provider changes require Compose validation and Dev/Test proof
  ladder classification before any staging escalation.

The comparison must state which validators and proof checks were actually run.
It must also state which checks were not run and why. A checklist item may not
be marked complete unless the supporting command or evidence actually exists.

## Artifact Size Measures

Timing comparisons for artifact, cache, CI, proof-cockpit, evidence, or
generated-report changes should record byte size and file count for affected
artifact roots. Relevant roots include evidence, artifacts, artifacts/proof-cockpit,
each retained machine-run root, generated reports, screenshots,
service-evidence files, external-review bundles, package-manager caches when in
scope, and CI-uploaded artifacts.

Current inspected repository context records evidence at approximately 1.8 MiB
and artifacts at approximately 105 MiB. Existing proof-cockpit artifact design
records each retained proof-cockpit machine-run root at approximately 53 MiB.
Those values are baseline context only; future comparisons must measure the
actual before and after roots they assess.

## Fallback Rules

Future implementation must fall back to broader validation when:

- changed files cannot be classified;
- cache keys are incomplete or unknown;
- affected-only selection cannot explain every semantic, proof, evidence,
  configuration, provider, and environment input;
- before and after command inputs are not comparable;
- timing records are missing for a required command;
- a generated timing summary lacks raw timing records;
- proof-cockpit comparator output reports non-volatile drift;
- evidence freshness is stale, unknown, partial, mismatched, superseded,
  generated-report-only, human-review-required, or terminal-refresh-deferred;
- a new warning, gap, non-claim difference, or human-decision-required change
  appears.

Fallback does not automatically mean staging. It means the lowest sufficient
broader proof level for the change class.

## Report Shape

A future before and after timing comparison report should include:

- issue key, title, owner, and change class;
- before and after source SHAs;
- command table with cold and warm timing;
- resource cost table;
- artifact count and byte table;
- cache hit and miss table;
- validation and proof result table;
- assurance preserved, added, or traded-off statement;
- slowest-command ranking before and after;
- critical-path changes;
- variance notes;
- failed, skipped, not-collected, and unavailable measurement notes;
- rollback recommendation when thresholds fail;
- non-claim statement;
- links to raw timing records and validator outputs.

The report is a generated planning artifact. It is lower authority than raw
evidence, validator results, accepted ADRs, and USF semantic definitions.

## Dependencies

- USF-384 supplies the current baseline measurement.
- USF-415 defines command target timing instrumentation.
- USF-987 defines proof-cockpit per-route timing for route-level optimisation.
- USF-823 defines the no-regression proof plan.
- USF-825 defines the golden acceptance corpus.
- USF-829 defines rollback strategy.
- USF-859 remains the owner-decision issue before machine-QA incremental mode
  can become a default proof path.
- USF-961 tracks the baseline proof-cockpit machine-QA timeout observation.
- USF-966 remains the terminal fresh proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should validate strict JSON timing records, preserve exit
codes, run issue-specific validators and selftests, run evidence invalidation
and evidence reuse validation for cache or artifact work, run proof-cockpit
acceptance validation for proof-cockpit projection or evidence work, and run
aggregate repository validation when command or validator topology changes.

Fresh proof-cockpit machine QA should not be required for this comparison
design or for ordinary documentation and planning changes. It is reserved for
USF-966 unless a later implementation issue records a stricter proof need.

## Acceptance Mapping For USF-826

USF-826 requires a plan defining measured commands, methodology, acceptance
thresholds, and required assurance comparison. This design satisfies that by:

- defining the measured command set in the Measured Command Set section;
- defining cold and warm run methodology, sample size, and source context in
  the Methodology section;
- defining timing, artifact, cache, proof, and CI thresholds in the Acceptance
  Thresholds section;
- defining assurance comparison requirements by change class;
- defining fallback rules and report shape;
- recording dependencies and future validation expectations.

No timing implementation, command execution change, validator change,
proof-cockpit machine refresh, or readiness claim was made by this issue.
