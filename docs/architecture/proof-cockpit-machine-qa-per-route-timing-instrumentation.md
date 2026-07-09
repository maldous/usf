# Proof Cockpit Machine QA Per-Route Timing Instrumentation

| Field | Value |
| --- | --- |
| Linear issue | USF-987 |
| Status | Design artifact for proof-cockpit route timing instrumentation |
| Scope | Future per-route timing fields, lower-authority timing summary, validation expectations, and no-regression path |
| Authority posture | This document defines future instrumentation expectations only. It does not redefine USF semantic authority. |

## Purpose

USF-769 found that proof-cockpit machine QA has broad route coverage and high
artifact cost, but retained machine evidence lacks per-proof-route timing. This
design defines the required future per-route timing fields, timing summary
shape, validator expectations, planted-defect expectations, and no-regression
path needed before route-level optimisation or incremental route-cost claims can
be accepted.

This issue is discovery and design only. It does not implement route timing,
change machine-QA coverage, update validators, prune artifacts, refresh machine
QA evidence, or make any readiness claim.

## Non-Claims

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Timing summaries are lower-authority generated reports. They do not replace raw
machine-run JSON, route manifests, screenshot manifests, service-evidence
manifests, evidence indexes, chain-of-custody records, accepted ADRs,
validator results, or USF semantic definitions.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless an issue
changes runtime proof collection behavior enough to require earlier proof, or
source-tree freshness rules require a re-pin and that proof is recorded.

## Inputs Inspected

- apps/staging-proof-cockpit/src/machine-qa.mjs.
- The latest retained full machine-run artifact directory recorded in
  evidence/proof-evidence/proof-cockpit/staging-evidence-store.json.
- The latest retained proof-cockpit machine-run JSON, route manifest,
  screenshot manifest, service evidence manifest, and chain-of-custody record.
- docs/architecture/proof-cockpit-machine-qa-route-coverage-profile.md.
- docs/architecture/proof-cockpit-machine-qa-artifact-minimisation.md.
- docs/architecture/proof-cockpit-screenshot-retention-and-pruning-policy.md.
- docs/architecture/proof-command-target-timing-instrumentation.md.
- docs/architecture/no-regression-proof-before-after-timing-comparison.md.
- tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py.
- Pending USF-984 evidence invalidation map design; no current-main
  evidence-invalidation map file is claimed by this document.

## Current State

The retained full machine-QA run recorded in the staging evidence store records:

- run ID, source SHA, and source tree hash in the retained machine-run JSON;
- environment local-machine-qa;
- startedAt and completedAt timestamps in the retained machine-run JSON;
- 830 route results;
- 71 declared routes;
- 94 screenshot records;
- 40 service records;
- 40 service-evidence screenshot or screenshot-equivalent records;
- 1282 pass checks, 0 fail checks, 0 warnings, and one
  human-decision-required signal.

The retained run is approximately 53 MiB. Route result records currently expose
route, status, result, plainHtml, unsafeClaim, textHash, and textLength for the
first route. Route-manifest records expose name, urlPath, protocol,
authRequirement, roleUsed, evidenceCollected, screenshotOrArtifactLink, and
gap.

Machine QA currently records run-level timing and some service targetObservation
latency values. It does not record per-route start and end time, route
navigation duration, DOM or text extraction duration, screenshot capture
duration, screenshot write duration, route artifact bytes, or browser action
count.

## Required Per-Route Timing Fields

Future per-route timing instrumentation should add an additive route timing
object to each route record or a hash-linked route timing manifest that has a
one-to-one relationship with route results.

| Field group | Required fields |
| --- | --- |
| Identity | timing schema version, route timing ID, run ID, source SHA, deployment SHA, environment, selected rerun mode, route result index |
| Route context | route, route family, route group, route pattern, concrete URL path, route source, capability ID, scenario ID, service ID, evidence ID, screenshot ID where applicable |
| Access context | role used, auth requirement, provider mode where applicable, environment class, screenshot mode, route-port adapter reference where applicable |
| Result linkage | route result, HTTP status, check status, gap type, warning state, human-decision-required state, route result hash |
| Timing | startedAt, completedAt, durationMs, navigationMs, responseReadMs, domInspectionMs, textExtractionMs, screenshotCaptureMs, screenshotWriteMs, serviceProbeMs where applicable |
| Browser activity | browser action count, navigation count, selector wait count, console error count, request count where safely measurable |
| Artifact cost | screenshot path, screenshot hash, screenshot bytes, route artifact path, route artifact hash, route artifact bytes, service-evidence artifact bytes where applicable |
| Freshness and safety | timing collected flag, not-collected reason, timeout flag, retry count, volatile-field classification, non-claim boundary, evidence freshness state |

Duration fields should be non-negative integers in milliseconds. A route timing
record should use explicit not-collected values when a sub-measurement is not
available. Missing required route timing for an instrumented run should fail
future validation once the contract becomes mandatory.

Timing fields must not alter pass, fail, warning, gap, human-review,
human-decision, non-claim, screenshot, service-authentication, source-SHA, hash,
or chain-of-custody semantics.

## Timing Summary Report Shape

Future instrumentation may generate a human-readable timing summary. That
summary must remain lower authority and must cite the raw route timing records
and retained machine-run artifacts it summarizes.

The summary should include:

- run ID, source SHA, environment, selected rerun mode, and repository state;
- route count, screenshot count, service count, evidence count, warning count,
  gap count, and human-decision-required count;
- route family timing table with count, median, p95 where meaningful, max, and
  total duration;
- slowest routes table;
- screenshot capture and screenshot byte table;
- service route and service-evidence timing table;
- route families without timing and the reason;
- timing overhead estimate for the instrumentation itself where measurable;
- changed-route or affected-route section when a future rerun mode is used;
- generated-summary lower-authority statement;
- non-claim statement;
- fallback recommendation when timing data is incomplete or ambiguous.

The summary must not say route optimisation is safe by itself. It can only
support future decisions when paired with no-regression comparison, validator
results, evidence freshness checks, and proof-ladder classification.

## Validation And Planted Defect Expectations

Future implementation should add validator or selftest coverage for these
cases:

- an instrumented run has a route result without a matching route timing record;
- a route timing record references a route that does not exist in routeResults
  or route-manifest records;
- a duration is negative, non-numeric, or completedAt precedes startedAt;
- a timing summary source SHA does not match the raw machine run;
- a timing summary route count does not match raw route timing records;
- a timing summary exists without raw timing records;
- a generated summary attempts to satisfy proof without retained machine
  evidence;
- route timing hides or removes a route failure, warning, gap,
  human-decision-required signal, or non-claim;
- route timing changes route, screenshot, service, evidence, or
  chain-of-custody counts without a no-regression explanation;
- screenshot byte metadata is missing when a screenshot path and hash exist;
- service timing loses targetObservation linkage or auth posture;
- volatile duration normalization hides non-volatile drift in source SHA,
  hashes, route identity, screenshot identity, warning counts, gap counts, or
  non-claim text;
- incremental or affected-route timing is treated as equivalent to full
  machine QA without owner decision and full-run fallback.

Planted defects should include at least one missing route timing record, one
negative duration, one mismatched source SHA, one summary-only timing report,
one dropped route, one dropped screenshot byte record, one hidden warning, and
one incremental-default overclaim.

## No-Regression Path

Future implementation should proceed in stages:

| Stage | Expected proof |
| --- | --- |
| Design | This document defines the contract. Fresh machine QA is not required for timing semantics alone, but repository source changes still require proof-cockpit freshness re-pin when validator rules demand it. |
| Additive implementation | Instrumentation is added without changing route selection, screenshot selection, evidence generation, pass/fail semantics, or non-claims. |
| Validator implementation | Validator and planted-defect coverage prove timing records are complete, linked, and lower authority. |
| Full versus instrumented comparison | Same source inputs compare route count, route IDs, screenshot count, service count, evidence count, chain-of-custody count, warning count, gap count, human-decision-required state, non-claim text, and hash linkages. |
| Performance evaluation | Timing overhead, slowest routes, screenshot cost, artifact bytes, and route family timing are reported without reducing coverage. |
| Incremental decision | Any default incremental machine-QA use waits for USF-859 owner decision and must fall back to full proof on ambiguity. |
| Terminal refresh | Fresh machine-QA evidence is collected under USF-966 after orchestration changes complete or are deliberately closed. |

An implementation issue must not mark route-level optimisation accepted when
the only evidence is a generated timing summary. It must preserve the raw
machine-run artifacts, validator output, and non-claim boundaries.

## Relationship To Controlled Issues

- USF-769 supplies the route coverage profile and identifies the missing
  per-route timing gap.
- USF-415 supplies command-level target timing expectations.
- USF-826 supplies before and after timing comparison methodology.
- USF-961 records the baseline timeout and browser-context closure blocker
  found during baseline measurement.
- USF-859 remains the owner-decision issue before proof-cockpit machine QA can
  become incremental by default.
- USF-823 supplies the no-regression proof plan.
- USF-829 supplies rollback expectations.
- USF-966 remains the terminal fresh proof-cockpit machine-evidence refresh.

## Serialization And Parallelization

Design-only work for route timing may run in parallel with command timing and
before and after timing comparison design. Future implementation must serialize
changes that touch:

- apps/staging-proof-cockpit/src/machine-qa.mjs;
- proof-cockpit route result or route manifest shape;
- screenshot manifest or service-evidence manifest shape;
- evidence index or chain-of-custody shape;
- proof-cockpit acceptance validator rules;
- evidence invalidation or evidence reuse validators;
- projection re-pin or external-review-bundle generation;
- non-claim or human-review fields.

Parallel implementation is safe only when write scopes are disjoint and no
issue consumes another issue's policy or validator output.

## Validation Expectations For Future Implementation

Future implementation should run relevant validator selftests, proof-cockpit
acceptance validation, evidence invalidation and reuse validation once those
validators exist, projection checks when generated reviewer outputs change, and
a full-versus-instrumented comparison showing no route, screenshot, evidence,
service, chain-of-custody, warning, gap, or non-claim regression.

Fresh proof-cockpit machine QA is not required for timing semantics alone.
Terminal fresh machine evidence remains deferred to USF-966 unless a later
implementation issue records a stricter proof requirement, or validator
freshness rules require a source-tree re-pin before merge.

## Acceptance Mapping For USF-987

USF-987 requires required per-route timing fields, timing summary report shape,
validation and planted-defect expectations, a no-regression path, and
relationship to USF-769, USF-415, USF-961, and USF-859. This design satisfies
that by:

- defining required fields in the Required Per-Route Timing Fields section;
- defining lower-authority report shape in the Timing Summary Report Shape
  section;
- defining validation and planted-defect expectations;
- defining no-regression stages and terminal-refresh boundaries;
- recording dependencies and relationships to USF-769, USF-415, USF-826,
  USF-961, USF-859, USF-823, USF-829, and USF-966.

No proof-cockpit machine-QA coverage was reduced. No machine-QA evidence was
refreshed. No artifact was pruned. No validator or proof script was changed.
