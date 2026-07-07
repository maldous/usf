# Proof Command Target Timing Instrumentation

| Field | Value |
| --- | --- |
| Linear issue | USF-415 |
| Status | Design artifact for target timing instrumentation |
| Scope | Make targets, package scripts, CI command steps, validators, proof commands, and aggregate command timing |
| Authority posture | This document defines future instrumentation expectations only. It does not redefine USF semantic authority. |

## Purpose

USF optimisation work needs comparable timing data for local and CI commands
without changing command semantics, proof expectations, validator severity, or
non-claim posture. This design defines the target timing contract future
Makefile, package-script, validator, proof, and CI instrumentation should
produce.

This issue is discovery and design only. It does not implement timing wrappers,
change Makefile targets, change package scripts, update validators, update CI,
refresh proof evidence, or make any readiness claim.

## Non-Claims

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Timing telemetry is lower-authority operational evidence. It does not replace
USF semantic definitions, accepted ADRs, validator rules, runtime proof
evidence, retained source artifacts, or the existing proof ladder.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a
future implementation issue explicitly changes runtime proof collection enough
to require earlier proof and records that proof.

## Inputs Inspected

- Makefile.
- package.json.
- .github/workflows/validate-spec.yml.
- .github/workflows/proof-anchor.yml.
- docs/architecture/current-state-command-surface.md.
- docs/architecture/no-regression-proof-plan.md.
- docs/architecture/rollback-proof-strategy.md.
- docs/architecture/proof-cockpit-machine-qa-route-coverage-profile.md.
- tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py.
- tools/validate-evidence-invalidation/evidence-invalidation-map.json.

## Current State

The current command surface has clear compatibility aliases and aggregate
commands, but it does not emit a repository-native structured timing report.
Makefile routes to package scripts and validators; package.json contains direct
serial chains for repo validation, parity, test readiness, proof commands, and
legacy compatibility gates; CI exposes GitHub step duration but not a portable
local timing artifact.

Current proof-cockpit machine QA records run-level start and completion
timestamps and service targetObservation latency values. It does not record
per-proof-route duration, screenshot capture duration, per-route artifact bytes,
or browser action counts. USF-987 owns that proof-cockpit route-level timing
contract.

The proof-cockpit comparator already treats run IDs, timestamps, temp paths,
ports, duration fields, latency fields, and elapsed fields as volatile. Future
timing output must therefore be kept additive and must not allow volatile timing
normalisation to hide route, screenshot, warning, gap, hash, non-claim,
source-SHA, or chain-of-custody drift.

## Timing Coverage Classes

Future instrumentation should classify each measured command into one or more
coverage classes:

| Class | Examples | Assurance boundary |
| --- | --- | --- |
| Install and setup | Dependency install, workspace setup, package-manager bootstrap | Must not hide frozen-lockfile or dependency failure. |
| Syntax and shape validation | validate-spec and validator parse checks | Must preserve validator exit codes and strict JSON failure. |
| Semantic validation | validate-enterprise, validate-runtime, current-state validators | Must preserve semantic rule IDs, severities, and fail-closed behavior. |
| Test readiness | test-readiness validation, composed semantic harness, fixture lifecycle, integration matrix, coverage, assurance scan | Must not claim broader test, UI, staging, or product readiness. |
| Compose and provider checks | compose validation, generated Compose checks, port checks, service integration | Must preserve provider and environment separation. |
| Proof and evidence checks | proof-review, proof-cockpit acceptance, evidence invalidation, evidence reuse, projection re-pin | Must preserve evidence freshness, non-claims, generated-report boundaries, and human acceptance separation. |
| Aggregate commands | repo validation, parity, verify, foundation, dev-ready | Must record child command timing without changing serial success and failure semantics. |
| Build and static quality | build, typecheck, lint, test, coverage where present | Must not treat quality tooling success as proof of semantic readiness. |
| Operational or destructive commands | clean, reset, teardown, proof-review operational actions | Must record destructive posture and require explicit safe-command policy before automation. |

## Required Timing Record Fields

A future command timing record should include these fields where measurable. If
a field cannot be collected safely, the record should use an explicit
not-collected value instead of omitting the field silently.

| Field group | Required fields |
| --- | --- |
| Identity | timing schema version, command timing ID, command ID, target name, package script name, invocation surface, parent command ID, child command IDs, issue ID when known |
| Source context | source SHA, branch, repository dirty state, pull request identifier when known, workspace root, platform, runner type |
| Execution context | environment class, provider mode when relevant, proof level, cache state, cache key where applicable, cold or warm classification |
| Timing | startedAt, completedAt, wall duration in milliseconds, timeout flag, retry count, queue or setup time when available |
| Resource cost | CPU time, peak memory, file IO, network IO, process count, Docker or Compose startup time where measurable |
| Result | exit code, status, failure category, failure reason, signal, command timed out flag |
| Assurance | assurance class, validators invoked, proof family, evidence family, non-claim boundary, freshness state |
| Artifacts | stdout path, stderr path, machine-readable report path, generated artifact paths, artifact sizes, content hashes where applicable |
| Dependency graph | upstream targets, downstream targets, critical-path parent, serial or parallel execution mode |
| Safety | secret-capture status, destructive-command flag, credential check status, fallback mode on ambiguity |

The timing wrapper must preserve the wrapped command's exit code. If the wrapper
fails to write timing data after a command succeeds, the future policy should
decide whether that is a warning or a failure for the specific command class.
For validators, proof commands, and CI required checks, missing timing data
should fail closed once the timing contract becomes mandatory.

## Report Shape

Future instrumentation should produce two outputs:

1. Raw command timing records, one per measured command invocation.
2. A generated summary report for humans.

The raw records are the preferred comparison input. The generated summary is
lower authority and must cite the raw records it summarizes. A summary should
include:

- command list and command classes measured;
- source SHA and repository state;
- wall-time ranking;
- critical path by parent and child command;
- cache state distribution;
- cold and warm timing separation;
- slowest commands and slowest child steps;
- artifact count and artifact byte ranking;
- failed, timed-out, skipped, and not-collected entries;
- assurance classes covered;
- commands excluded with reasons;
- non-claim statement;
- fallback recommendation when timing is incomplete or ambiguous.

The summary must not say an optimization is accepted unless the relevant
validators, proof checks, and no-regression criteria also pass.

## Validation And Planted Defect Expectations

Future implementation should include validator or selftest coverage for these
cases:

- a wrapped command that fails must preserve the failing exit code;
- a wrapped command that times out must record timeout status and remain failed;
- a missing required timing record must fail once timing is mandatory;
- a generated summary without raw timing records must not satisfy timing
  evidence;
- stale timing for a different source SHA must not satisfy a current comparison;
- a cache hit with unknown inputs must fall back to full validation;
- a timing wrapper must not capture secrets, credential values, or token-like
  output;
- volatile timing fields must not hide route, warning, gap, non-claim, hash,
  source-SHA, or chain-of-custody drift;
- child command failure must keep the aggregate command failed;
- destructive commands must be labeled destructive before being timed or
  automated.

## Assurance Preserved

This design preserves existing assurance by requiring future timing to be
additive, exit-code preserving, lower-authority, and fail-closed once adopted.
It does not remove validators, alter proof-cockpit evidence, change proof
ladder semantics, modify CI required checks, or make staging the default proof
path.

Speed can only be credited when the same assurance is preserved or when an
explicit issue records the assurance added or traded off. Any risky timing or
cache optimisation remains blocked behind the no-regression and rollback plans.

## Dependencies

- USF-384 supplies the baseline timing and slow-command ranking.
- USF-385 supplies the command critical-path graph.
- USF-386 supplies the assurance classification matrix.
- USF-826 defines before and after timing comparison methodology.
- USF-987 defines proof-cockpit per-route timing fields.
- USF-823 and USF-829 define no-regression and rollback controls.
- USF-966 remains the terminal proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should run issue-specific tests first, then the relevant
validator and aggregate gates. Expected candidates include strict JSON parsing
for new reports, validate-spec, validate-spec selftest when touched,
repo-level validation, evidence invalidation validation, evidence reuse
validation, proof-cockpit acceptance validation for proof timing, and local or
CI parity checks for command-surface changes.

Fresh proof-cockpit machine QA is not required merely to introduce or review
this design. It should remain terminal to USF-966 unless a later implementation
changes runtime proof collection behavior.

## Acceptance Mapping For USF-415

USF-415 requires the current state to be inspected, assurance impact stated,
validation or proof expectation defined, and dependencies recorded. This design
satisfies that by:

- recording current command, CI, aggregate validation, and proof-cockpit timing
  gaps in the Current State section;
- defining timing record fields and report shape for future command
  instrumentation;
- stating assurance boundaries, non-claims, and lower-authority report status;
- defining planted-defect and validation expectations;
- recording dependencies on USF-384, USF-385, USF-386, USF-826, USF-987,
  USF-823, USF-829, and USF-966.

No Makefile, package script, CI workflow, validator, proof script, or evidence
artifact was changed by this issue.
