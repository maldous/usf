# Proof Cockpit Machine QA Route Coverage Profile

| Field | Value |
| --- | --- |
| Linear issue | USF-769 |
| Status | Discovery and profiling artifact |
| Scope | Existing proof-cockpit machine-QA route coverage, artifact cost signals, assurance purpose, and safe incremental opportunities |
| Authority posture | This document profiles existing evidence only. It does not redefine USF semantic authority. |

## Purpose

Machine-QA proof exercises a broad proof-cockpit route surface. That breadth is
useful for assurance, but it is one of the slowest measured paths and produces
large artifacts. This profile maps the current retained route evidence to cost
signals, artifact classes, assurance purpose, and safe future incremental
opportunities.

This profile is discovery and profiling only. It does not run fresh
proof-cockpit machine QA, reduce coverage, prune artifacts, change
proof-cockpit logic, update validators, or promote evidence.

## Non-Claims

This profile does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

This profile does not make generated reports authoritative. Generated reports
remain lower authority than semantic definitions, accepted ADRs, validator
rules, runtime proof evidence, and retained source artifacts.

This Batch 1 branch re-pins proof-cockpit machine evidence only because the
proof-cockpit validator requires source-tree freshness after repository source
changes. That re-pin is a validation freshness claim only; it is not a staging,
readiness, live-provider, production, or human-acceptance claim.

## Inputs Inspected

- USF-384 baseline timing and cost measurement comment.
- docs/architecture/proof-artifact-retention-policy.md.
- docs/architecture/proof-cockpit-machine-qa-artifact-minimisation.md.
- docs/architecture/proof-cockpit-screenshot-retention-and-pruning-policy.md.
- docs/architecture/proof-cockpit-machine-qa-evidence-model.md.
- The latest and prior retained full machine-run artifact directories recorded
  in evidence/proof-evidence/proof-cockpit/staging-evidence-store.json.
- route-manifest.json, route-port-adapter-manifest.json,
  proof-cockpit-machine-qa-run.json, qa-run.json,
  proof-cockpit-screenshot-manifest.json,
  composed-service-screenshot-manifest.json, service-evidence-manifest.json,
  evidence-index.json, chain-of-custody.json, generated reports, and
  external-review-bundle files.
- tools/validate-proof-cockpit-acceptance planted defects that guard machine-QA
  evidence, route surfaces, screenshots, projection metadata, and non-claims.

## Current Runtime And Cost Signals

USF-384 measured proof-cockpit machine QA as the slowest baseline command. It
timed out at 120 seconds in that measurement and recorded a browser-context
closure failure as USF-961. That baseline is a failure observation, not a
coverage reduction justification.

The latest retained full run recorded in the staging evidence store records:

- Run ID in the retained machine-run JSON.
- Full rerun mode.
- Start and completion timestamps in the retained machine-run JSON.
- Approximate retained-run wall time of 160 to 165 seconds for the reviewed
  full-run class.
- Source SHA and source tree hash in the retained machine-run JSON.
- Environment local-machine-qa.
- Repository state clean.
- 71 declared routes.
- 830 tested route records.
- 75 capabilities.
- 150 scenarios.
- 40 services.
- 40 service-evidence screenshots or equivalents.
- 94 screenshot records.
- 1282 pass count, 0 fail count, 0 warning count, and one human-decision-required
  signal.

The retained run does not include precise per-proof-route duration fields in
routeResults or route-manifest records. It does include run-level timing and
some service targetObservation latency fields. Future route optimisation needs
per-route timing instrumentation before route-level cost claims can be made.

## Artifact Cost Signals

The latest retained full run is approximately 53 MiB:

| Artifact class | Count | Approximate size | Cost signal |
| --- | ---: | ---: | --- |
| Screenshot PNG files | 94 | 32.66 MiB | Largest retained artifact class and highest binary-review cost. |
| Run-root JSON and generated reports | 23 | 12.47 MiB | Includes the large aggregate machine-QA JSON. |
| External review bundle files | 26 | 6.10 MiB | Duplicates many root manifests byte-for-byte. |
| Service evidence JSON files | 40 | 0.32 MiB | Low byte cost but important auth posture and reenactment context. |

The largest individual retained files are:

| File class | Example | Approximate size | Review meaning |
| --- | --- | ---: | --- |
| Aggregate run JSON | proof-cockpit-machine-qa-run.json | 6.36 MiB | Broad run context and normalized evidence. |
| Evidence index | evidence-index.json | 2.55 MiB | Evidence record inventory and traceability. |
| External bundle evidence index copy | external-review-bundle/evidence-index.json | 2.55 MiB | Duplicate lower-authority reviewer bundle copy. |
| Screenshot PNG | screenshots/alerts.png | 1.95 MiB | Visual proof route evidence. |
| Chain of custody | chain-of-custody.json | 1.46 MiB | Claim-to-artifact custody map. |

## Route Coverage Map

The route manifest contains 830 tested route records. All records in the latest
retained route manifest have evidenceCollected pass. The following table groups
routes by route family and records screenshot-linked route counts.

| Route family | Route records | Screenshot-linked records | Cost signal | Assurance purpose |
| --- | ---: | ---: | --- | --- |
| Evidence detail | 193 | 2 | Highest route fan-out; mostly evidence-detail pages. | Confirms evidence detail routes render and remain tied to evidence inventory. |
| Scenario detail | 150 | 1 | High route fan-out; scenario detail coverage. | Confirms scenario coverage and scenario-to-capability evidence remains visible. |
| Claim detail | 117 | 0 | High text-route fan-out. | Confirms claim routes render without unsafe overclaiming. |
| Screenshot detail | 94 | 0 | High fan-out from screenshot detail routes. | Confirms screenshot metadata routes render and screenshot records remain inspectable. |
| Capability detail | 75 | 1 | Capability fan-out. | Confirms capability coverage, capability detail pages, and import detail surfaces. |
| Semantic definition detail | 67 | 0 | Semantic-definition fan-out. | Confirms semantic definition projections render without source/import shortcuts. |
| Service detail | 40 | 0 | Service route fan-out plus separate service-evidence artifacts. | Confirms service pages and service catalogue mappings render. |
| Source viewer | 32 | 0 | Source-document route fan-out with query paths. | Confirms routed source-document projections render. |
| Enterprise topic | 28 | 28 | Every enterprise topic route has a linked screenshot. | Confirms enterprise proof cockpit route state and non-claim visibility. |
| Static, index, and high-level routes | 27 | 16 | Low fan-out but high navigation value. | Confirms home, route indexes, reports, source index, actions, roles, audit, observability, fixtures, alerts, signoff, result, portfolio, QA, export, runbook, and similar surfaces. |
| Review detail | 4 | 3 | Review detail routes with visual evidence. | Confirms gap, nonconformity, corrective-action, and sample review surfaces render. |
| Import detail | 2 | 2 | Import detail routes with visual evidence. | Confirms latest machine run import and capability import review surfaces render. |
| Machine-run detail | 1 | 0 | Latest-run machine route. | Confirms detailed machine-run review surface renders. |

These families sum to 830 concrete route records. The grouping separates base
index routes from generated detail routes so future profiling can compare route
fan-out without double-counting index pages.

The route check categories in the retained run are:

| Check category | Count | Status |
| --- | ---: | --- |
| route | 830 | pass |
| scenario | 150 | pass |
| capability | 75 | pass |
| screenshot | 54 | pass |
| service | 40 | pass |
| compose-service-evidence | 40 | pass |
| non-claims | 30 | pass |
| enterprise | 29 | pass |
| role | 12 | pass |
| action-ledger | 9 | pass |
| sources | 6 | pass |
| matrix | 4 | pass |
| signoff | 2 pass, 1 human-decision-required | mixed by design |

The human-decision-required signal is not a machine failure and must not be
silently converted into acceptance.

## Screenshot And Service Evidence Coverage

The screenshot manifest contains 94 screenshot records:

| Screenshot class | Count | Assurance purpose |
| --- | ---: | --- |
| Compose service screenshots and equivalents | 40 | Service proof evidence, auth posture, target observation, and reenactment context. |
| Enterprise route screenshots | 29 | Enterprise proof route state and non-claim visibility. |
| Core proof route screenshots | 12 | Main proof cockpit navigation, result, signoff, alerts, audit, fixtures, and observability surfaces. |
| Machine-route screenshots | 9 | Machine run, import, review, gap, nonconformity, and corrective-action surfaces. |
| First-detail screenshots | 4 | Representative first capability, action, evidence, and scenario detail screens. |

The screenshot evidence and auth posture classes are:

| Evidence or posture class | Count | Assurance purpose |
| --- | ---: | --- |
| Proof-cockpit UI screenshot records | 54 | Visual proof route state and review context. |
| Compose-service screenshot records | 16 | Direct service UI evidence. |
| Compose-service screenshot-equivalent records | 24 | Safe equivalent evidence for non-UI or unsafe-to-capture services. |
| service-catalogue-cli-equivalent | 21 | API or CLI-only service evidence. |
| direct-service-ui-screenshot | 10 | Intentionally anonymous or no-auth service UI evidence. |
| authenticated-service-ui-screenshot | 6 | Credential-safe service-login UI evidence. |
| redacted-api-equivalent | 3 | Unsafe-to-capture service equivalent evidence. |
| api/cli-only auth posture | 21 | Provider or service behavior without a safe UI target. |
| service-login required auth posture | 6 | Authenticated UI capture boundary. |
| intentionally anonymous/no-auth posture | 10 | Declared anonymous surface boundary. |
| unsafe-to-capture posture | 3 | Safety boundary that requires equivalent evidence. |
| not-applicable posture | 54 | Proof-cockpit route screenshots rather than provider service screenshots. |

These classes are not interchangeable. Future incremental execution or artifact
minimisation must preserve their auth posture, redaction, hash, and
chain-of-custody semantics.

## Existing Rerun Modes

The latest retained run records these supported rerun modes:

- full.
- capability-only.
- service-only.
- enterprise-only.
- changed-since-commit.
- failed-only.
- stale-evidence.
- single-capability.
- single-service.

The presence of these modes is not proof that they are safe as default PR gates.
USF-859 remains the owner-decision issue for making proof-cockpit machine QA
incremental. Any future use of incremental modes must compare full and
incremental coverage before reducing required proof.

## Safe Incremental Opportunities

These are discovery findings only. They are not authorization to reduce
coverage.

| Opportunity | Why it is plausible | Required no-regression path |
| --- | --- | --- |
| Enterprise-only pass for enterprise-page-only display changes | Enterprise route family has 29 routes and 29 linked screenshots. | Full vs enterprise-only comparison showing no route, screenshot, non-claim, evidence, or custody drift outside enterprise scope. |
| Service-only pass for service catalogue or service evidence display changes | Service route family has 41 routes and 40 service-evidence records. | Full vs service-only comparison preserving service auth posture, target observation, screenshot-equivalent, and chain-of-custody fields. |
| Capability-only or single-capability pass for isolated capability projection changes | Capability and scenario route families are high fan-out and can be traced to capability IDs. | Affected-capability classifier must fall back to full on ambiguity and preserve scenario, claim, evidence, and screenshot links. |
| Failed-only rerun after a failing full run | It can reduce retest time after a known full-run failure. | The previous full run must be current for the same source inputs, and hidden warnings or gaps must remain impossible. |
| Stale-evidence rerun | It can focus on records that evidence invalidation marks stale. | Staleness classifier must fail closed, and generated reports must not upgrade stale evidence to pass. |
| Changed-since-commit run | It can target changed semantic/proof inputs. | Change classifier must include source documents, validators, route generation, screenshots, service catalogue, proof model, evidence store, and non-claim inputs; ambiguity falls back to full. |

## Serialization And Parallelization Rules

Machine-QA route profiling can run in parallel with artifact diffability design
when both are read-only. Future implementation must serialize changes that
modify any of these shared surfaces:

- proof-cockpit machine-QA route collection logic.
- proof-cockpit evidence model fields.
- route manifest or screenshot manifest schemas.
- evidence invalidation and evidence reuse validators.
- proof-cockpit acceptance validator rules.
- external-review-bundle generation.
- artifact retention or pruning behavior.
- non-claim and human-review fields.

## Missing Instrumentation Gap

Existing retained machine-QA evidence provides run-level timing and some service
targetObservation latency fields. It does not provide per-proof-route duration,
per-route screenshot capture duration, per-route artifact byte output, or
per-route browser action count. Without that data, route-level optimization
must rely on coarse cost proxies such as route fan-out, screenshot linkage,
artifact class size, and baseline command timing.

A future instrumentation issue should define per-route timing output before any
route-level performance budget or affected-only proof default is enforced.

## Validation Expectations For Future Implementation

Future implementation that changes machine-QA coverage, rerun selection,
artifact generation, or route timing should provide:

- Before and after route-family coverage counts.
- Before and after screenshot, service, evidence-index, and chain-of-custody
  counts.
- Full vs incremental comparison for every proposed incremental mode.
- Per-route and per-artifact timing when route-level optimization is claimed.
- Route-group diffing between retained runs before any route set change is
  proposed.
- Evidence invalidation and evidence reuse validation.
- Proof-cockpit acceptance validation.
- Projection checks when generated reports or reviewer bundles change.
- Planted defects for hidden warning, stale evidence treated as pass,
  generated-report-only proof, missing non-claim, screenshot hash mismatch,
  bundle metadata drift, and current-head substitution where relevant.
- Full-run fallback on ambiguity.
- Explicit owner decision before any default coverage reduction.

Fresh proof-cockpit machine QA should be reserved for issues that change runtime
proof collection behavior or for the terminal USF-966 refresh unless an earlier
issue records a stricter proof requirement.

## Acceptance Mapping For USF-769

USF-769 requires a report mapping routes to runtime, artifacts, assurance
purpose, and safe incremental opportunities. This profile satisfies that by:

- Recording baseline timing and retained-run runtime signals in the Current
  Runtime And Cost Signals section.
- Mapping route groups to counts, screenshot links, cost signals, and assurance
  purpose in the Route Coverage Map section.
- Mapping screenshot and service evidence artifact classes in the Screenshot
  And Service Evidence Coverage section.
- Listing existing rerun modes and safe future incremental opportunities.
- Recording the missing per-route timing instrumentation gap required before
  route-level performance claims or coverage reductions.

Fresh proof-cockpit machine QA is run for this Batch 1 branch only to re-pin
source-tree freshness. No route coverage was reduced by this issue.
