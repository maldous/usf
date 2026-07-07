# No-Regression Proof Before And After Validator Equivalence

| Field | Value |
| --- | --- |
| Linear issue | USF-827 |
| Status | Design artifact for validator equivalence |
| Scope | Validator outputs, rule catalogues, severity, selftests, planted defects, aggregate command wiring, and review process |
| Authority posture | This document defines future equivalence expectations only. It does not redefine USF semantic authority. |

## Purpose

USF optimisation and refactoring can make validators faster, more modular, or
more cacheable, but those changes must not silently change the assurance the
validators provide. This design defines how future work should compare
validator behavior before and after an optimisation or refactor.

This issue is discovery and design only. It does not change validator code,
validator rules, planted defects, package scripts, Make targets, CI workflows,
proof evidence, or runtime behavior.

## Non-Claims

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, validator active-promotion, or
human acceptance.

Validator equivalence does not make a generated report authoritative. It only
checks whether a proposed validator or command change preserves the current
validator contract unless a deliberate rule-change issue and authority trail
approve the difference.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a
future implementation issue changes runtime proof collection behavior enough to
require earlier proof and records that proof.

## Inputs Inspected

- Makefile.
- package.json.
- .github/workflows/validate-spec.yml.
- docs/architecture/current-state-command-surface.md.
- docs/architecture/no-regression-proof-plan.md.
- docs/architecture/rollback-proof-strategy.md.
- docs/architecture/no-regression-proof-before-after-timing-comparison.md.
- docs/architecture/validator-maturity-promotion-criteria.md.
- docs/architecture/schema-validator-posture-decision.md.
- tools/validate-spec/validate-spec.py.
- tools/validate-bootstrap/validate-bootstrap.py.
- tools/validate-runtime/validate-runtime.py.
- tools/validate-enterprise/validate-enterprise.py.
- tools/validate-test-readiness/validate-test-readiness.py.
- tools/validate-public-fqdn/validate-public-fqdn.py.
- tools/validate-compose/validate-compose.py.
- tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py.
- tools/validate-evidence-invalidation/validate-evidence-invalidation.py.
- tools/validate-evidence-reuse/validate-evidence-reuse.py.
- tools/validate-non-ui-completeness/validate-non-ui-completeness.py.
- tools/validate-parity validators and planted-defect directories.
- Validator planted-defect directories under tools.

## Current State

USF has broad validator coverage, with roughly thirty validator scripts across
the tools tree and more than one thousand planted-defect JSON fixtures under
validator-owned fixture directories. That scale is useful, but validator
outputs are not uniform enough to compare with a simple pass and fail total.
Current validators use several JSON shapes, including findings arrays, failures
arrays, ok flags, status strings, rule dictionaries, rule lists,
selftestResults arrays, and validator-specific summary fields.

The aggregate repository validation command chains many validators serially. CI
runs the formal spec validator, repository aggregate validation, parity
validation, foundation-substrate closure validation, proof-cockpit acceptance
validation, selftests for selected validators, and a PR governance gate.
Makefile exposes current-state aliases for validation, evidence, proof-cockpit,
evidence invalidation, evidence reuse, public FQDN, runtime, enterprise, and
Compose validation.

Many validator families already have planted-defect directories. These
negative controls are the strongest guard against false equivalence because a
validator can still exit successfully on the clean corpus while no longer
failing a planted defect.

The proof-cockpit acceptance validator already contains a normalized
before-and-after comparator for proof-cockpit artifact roots. That comparator is
proof-cockpit-specific. It must not be treated as generic validator-equivalence
coverage for validate-spec, parity validators, evidence validators,
test-readiness validators, runtime validators, enterprise validators, or
Compose validators. USF still needs a generic validator-equivalence contract for
validator outputs, rule catalogues, severities, fixtures, selftests, aggregate
wiring, and command behavior.

There is no generic executable validator-equivalence tool, no generic
validator-equivalence JSON schema, and no stored USF-827 machine-readable
before-and-after equivalence record yet. Validator output normalization remains
design-level until a later implementation issue creates a tool, schema, or
record format and proves it with planted defects.

The repository also contains a tools/validate-react-non-ui-parity directory
without a matching validator script or planted-defect suite in the inspected
inventory. That directory should not be counted as active validator-equivalence
coverage unless a future issue defines its command contract, fixtures, and
aggregate wiring.

## Required Equivalence Record Fields

A future validator-equivalence record should be machine-readable and should
contain these field groups:

| Field group | Required fields |
| --- | --- |
| Identity | equivalence schema version, issue ID, validator ID, validator family, command ID, invocation surface, before source SHA, after source SHA, assessed commit |
| Execution context | mode, arguments, working directory, runner type, environment class, provider mode where relevant, cache state, affected-only selector where relevant |
| Command contract | package script, Make target, CI step name, expected exit code, observed exit code, timeout flag, stdout path, stderr path, JSON output path |
| Output contract | raw output hash, strict JSON parse status, normalized output version, top-level keys, validator name, mode, ok or status field, failure count field, finding collection path, rule collection path |
| Rule catalogue | rule IDs, severity per rule, message or title per rule, rule ownership, authority references where available, lifecycle state where applicable, added rules, removed rules, renamed rules |
| Findings | normalized finding rows keyed by rule ID, severity, subject, path, finding class, message class, source reference, evidence reference, and validator-specific details |
| Counts | counts by severity, counts by rule ID, total blocking or error count, warning count, advisory count, selftest count, planted-defect count |
| Selftests | selftest command, fixture IDs, expected rule IDs, observed rule IDs, selftest pass or fail, missing fixtures, skipped fixtures |
| Planted defects | planted-defect directory, fixture file list, fixture content hashes, expected rule mapping, observed rule mapping, missing or newly unowned defect fixtures |
| Aggregate wiring | repo validation membership, parity membership, Make target wiring, package script wiring, CI step wiring, ordering where order affects failure behavior |
| Timing link | duration and resource fields by reference to the USF-826 timing comparison report, not as proof by itself |
| Review state | allowed differences, warnings, owner-review-required differences, blocking differences, reason for each difference, reviewer decision, rollback recommendation |
| Non-claims | generated-report lower-authority statement, readiness non-claim, staging non-claim, proof-cockpit terminal refresh boundary |

The normalized finding row is the core comparison unit. Equivalent pass and
fail totals are not enough; the comparator must confirm the same rule IDs,
severities, subjects, and finding classes unless an explicit approved
rule-change issue says otherwise.

## Comparison Method

Future validator equivalence should run this process:

1. Capture the before validator output from the approved base commit.
2. Capture the after validator output from the proposed change.
3. Parse both outputs as strict JSON when JSON output is expected.
4. Normalize validator-specific output shapes into a common finding table.
5. Compare command contracts and exit-code semantics.
6. Compare rule catalogues, severity, and ownership.
7. Compare normalized findings by rule ID, severity, subject, and message
   class.
8. Compare selftest and planted-defect results.
9. Compare aggregate command membership and wiring.
10. Classify differences as allowed, warning, owner-review-required, or
    blocking.
11. Record the assurance preserved, added, or deliberately changed.
12. Fall back to full validator execution on ambiguity.

The before and after runs must use the same command mode, input corpus, provider
and environment boundary, and relevant command arguments. If the input corpus
or command scope changed intentionally, the report must say that exact output
equivalence is not claimable and must compare the remaining stable parts of the
contract.

## Allowed Differences

Allowed differences must be narrow and explicitly listed in the comparison
report. Candidate allowed differences include:

- ordering of findings after stable sorting;
- absolute temporary path roots when relative subject and artifact identity are
  unchanged;
- timestamps, durations, run IDs, and generated report paths when the validator
  has already classified them as volatile;
- added non-blocking timing metadata when exit code, findings, rule IDs,
  severities, subjects, and non-claims are unchanged;
- generated summary formatting when raw validator findings and report authority
  boundaries are unchanged.

An allowed difference cannot hide a changed rule ID, changed severity, dropped
finding, dropped planted defect, weakened non-claim, stale evidence treated as
pass, or command-wiring removal.

## Blocking Differences

The future comparator should fail closed when any of these occur:

- a validator no longer emits strict JSON where strict JSON is expected;
- exit-code semantics change for pass, fail, selftest, or planted-defect modes;
- a rule ID is removed, renamed, or added without an approved rule-change issue;
- a severity changes without explicit authority and review;
- a finding subject disappears or changes class without explanation;
- a planted defect stops raising its expected rule;
- a selftest is skipped, removed, or converted to advisory without authority;
- a validator is removed from repo validation, parity, Make, package scripts, or
  CI without approved deprecation;
- a generated report is treated as authority over raw findings;
- evidence freshness, non-claim, provider, or environment fail-closed behavior
  is weakened;
- an affected-only or cached validator run cannot explain all semantic,
  evidence, proof, configuration, provider, and environment inputs;
- validator output hides warnings, gaps, owner-review states, or human-decision
  boundaries.

## Owner-Review Differences

Some differences may not be immediate failures but still require explicit
review before an optimisation can close:

- clearer finding messages with the same stable rule ID, severity, subject, and
  failure condition;
- a new stricter rule that creates additional blocking findings;
- new fixture coverage that changes selftest totals but preserves existing
  expected-rule coverage;
- output schema additions that do not alter existing consumers but need
  downstream documentation;
- a validator split where aggregate behavior remains equivalent but command
  ownership changes.

If a difference weakens validator behavior, non-claims, or fail-closed
semantics, it is not owner-review-only. It is blocking until an approved
authority and rule-change path exists.

## Review Process

Before a future validator optimisation or refactor is marked Done, its issue or
PR should record:

- validator or validator family changed;
- before and after source SHAs;
- exact commands and modes run;
- rule catalogue comparison;
- finding comparison;
- selftest and planted-defect comparison;
- aggregate command wiring comparison;
- allowed differences and reasons;
- owner-review-required differences and decision;
- blocking differences, if any;
- validation intentionally not run, with reason;
- rollback path;
- non-claim statement.

Checklist items may be checked only when the supporting command, output, or
review evidence exists.

## Validator And Planted-Defect Expectations

Future implementation of a validator-equivalence tool should include its own
negative controls. Planted defects should prove detection of:

- removed rule ID;
- changed severity;
- dropped finding subject;
- hidden blocking finding;
- invalid JSON output;
- changed exit code;
- missing selftest fixture;
- planted defect that no longer raises expected rule;
- aggregate command no longer invoking a validator;
- stale evidence treated as pass;
- generated report treated as validator authority;
- affected-only run without full-run fallback on ambiguity.

The equivalence tool should also test at least one clean-equivalent pair and one
allowed-volatile-difference pair so reviewers can distinguish safe noise from
assurance drift.

## Dependencies

- USF-823 defines the no-regression proof plan.
- USF-826 defines timing comparison discipline, which validator equivalence can
  reference for duration and resource comparison.
- USF-828 defines proof-cockpit equivalence for proof artifacts.
- USF-971 implements the proof-cockpit normalized comparator and provides a
  useful comparator pattern, but it is not a generic validator comparator.
- USF-984 defines evidence invalidation and fail-closed changed-input
  classification.
- USF-983 defines evidence reuse boundaries and terminal proof-cockpit machine
  evidence deferral.
- USF-966 remains the terminal fresh proof-cockpit machine evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should run the changed validator in all and selftest
modes where available, run every touched planted-defect suite, run
validate-spec, run repository aggregate validation, run evidence invalidation
and evidence reuse validation when evidence or cache behavior is touched, and
run proof-cockpit acceptance validation when proof-cockpit validator behavior is
touched.

Fresh proof-cockpit machine QA is not required for this design artifact and
should remain deferred to USF-966 unless a later implementation issue records a
stricter proof requirement.

## Acceptance Mapping For USF-827

USF-827 requires a plan defining comparison fields, fixtures, allowed
differences, and review process. This design satisfies that by:

- defining required equivalence record fields;
- defining the comparison method;
- defining allowed differences, blocking differences, and owner-review
  differences;
- defining the review process;
- defining validator and planted-defect expectations;
- recording dependencies and future validation expectations.

No validator behavior, command wiring, CI workflow, proof evidence, or
proof-cockpit machine evidence was changed by this issue.
