# CI Timeout And Retry Policy

| Field | Value |
| --- | --- |
| Linear issue | USF-657 |
| Status | Design artifact for CI timeout and retry policy |
| Scope | CI setup, validation, Compose, proof, artifact, attestation, retry, timeout, and reporting behavior |
| Authority posture | This document defines future CI operational policy expectations only. It does not redefine USF semantic authority. |

## Purpose

USF CI work needs explicit timeout and retry discipline before larger UI,
cache, artifact, and proof-pipeline work increases CI duration and failure
surface. This design defines timeout budgets, retryable failure classes,
non-retryable failure classes, failure classification, and reporting
expectations for future CI implementation issues.

This issue is discovery and design only. It does not mutate GitHub workflows,
change required checks, add retries, change command execution, alter validator
behavior, refresh proof evidence, or run proof-cockpit machine QA.

## Non-Claims

This policy does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Passing a CI retry does not erase the first failed attempt. A retry is
operational context only. It cannot convert a semantic, validator, proof,
evidence, non-claim, hash, chain-of-custody, permission, or security failure
into a transient infrastructure failure.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a later
implementation issue changes runtime proof collection behavior enough to require
earlier proof and records that proof.

## Inputs Inspected

- USF-637 CI workflow inventory issue context.
- USF-384 baseline timing and cost measurement issue context.
- USF-770 regression budget and performance thresholds.
- Makefile.
- package.json.
- .github/workflows/validate-spec.yml.
- .github/workflows/proof-anchor.yml.
- docs/architecture/current-state-command-surface.md.
- docs/architecture/test-readiness-command-surface-and-ci-gate.md.
- docs/architecture/no-regression-proof-plan.md.
- docs/architecture/rollback-proof-strategy.md.
- docs/architecture/no-regression-proof-before-after-timing-comparison.md.
- docs/architecture/proof-command-target-timing-instrumentation.md.
- docs/architecture/proof-cockpit-machine-qa-per-route-timing-instrumentation.md.
- docs/architecture/proof-cockpit-machine-qa-artifact-minimisation.md.

## Current State

The validate-spec workflow runs on push and pull request. It installs Python,
Node, pnpm dependencies, validator Python requirements, formal spec validation,
repository aggregate validation, parity validation, foundation-substrate closure
validation and selftest, proof-cockpit acceptance validation and selftest, and
the PR governance gate for pull requests. The workflow currently has no
explicit step-level timeout policy, retry policy, retained failed-attempt
artifact policy, or portable timing artifact.

The proof-anchor workflow runs on pushes to main. It emits and validates a
deterministic proof-anchor payload, attests it, verifies the attestation, and
publishes an annotated proof-anchor tag when needed. It has conservative
concurrency and uses content, identity-token, and attestation permissions.

Current CI does not run proof-cockpit machine QA by default. That boundary
should remain. Full proof-cockpit machine evidence refresh remains terminal to
USF-966 unless a later issue records a stricter proof need.

## Timeout Budgets

These proposed budgets are implementation guidance. A later workflow mutation
issue must compare them against actual GitHub Actions timing and USF-770
regression thresholds before enforcing them.

| Workflow or step class | Proposed timeout budget | Rationale |
| --- | --- | --- |
| validate-spec workflow total | 90 minutes | Leaves headroom for current broad serial validation while making hangs visible. |
| checkout and action setup | 10 minutes per setup group | Hosted-runner or action download issues should fail clearly rather than hang. |
| frozen dependency install | 15 minutes | Preserves frozen install while allowing cold cache and registry variance. |
| Python validator dependency install | 10 minutes | Pinned validator dependencies should not consume the full job. |
| formal spec validation | 10 minutes | Baseline is about 32 seconds locally; CI should have generous but bounded headroom. |
| repository aggregate validation | 20 minutes | Baseline is about 104 seconds locally; CI should allow runner variance. |
| parity validation suite | 45 minutes | Broadest current CI validation family; requires separate future timing. |
| foundation-substrate closure validation and selftest | 10 minutes combined | Baseline all-mode is short; selftest should remain explicit. |
| proof-cockpit acceptance validation and selftest | 15 minutes combined | Acceptance validation is not full machine QA. |
| PR governance gate | 10 minutes | Should remain bounded and fail closed on validation findings. |
| proof-anchor workflow total | 30 minutes | Post-merge freshness mechanism should be bounded but conservative. |
| proof-anchor emit and validate | 10 minutes combined | Deterministic payload work should not hang. |
| proof-anchor attestation and verification | 15 minutes combined | External attestation service can be slower but must not hide failures. |
| proof-anchor tag publication | 5 minutes | Tag idempotence and push should be fast and explicit. |
| future test-ready CI gate | budget defined by future issue | Do not treat current validate-spec workflow as final test-readiness. |
| explicit proof-cockpit machine QA | budget defined by USF-966 or a stricter proof issue | Not a default PR gate; the prior 120 second timeout observation is too low for a successful retained-run baseline. |

Timeouts are failed evidence by default. A timed-out run may be retried only
when its logs and step category support a transient infrastructure
classification.

## Retryable Failures

Future CI implementation may retry once when all of these are true:

- the failed step is explicitly classified as retry-eligible;
- the failure is infrastructure-shaped rather than validator-shaped;
- cleanup completed or the retry starts from a clean runner state;
- the retry records the failed attempt and the retry attempt;
- the retry does not skip any required validator, proof, evidence, or PR
  governance step.

Retry-eligible examples:

| Failure class | Retry posture | Required reporting |
| --- | --- | --- |
| hosted-runner startup interruption | retry once | runner identifier, step, time, and failed-attempt log |
| checkout or action download network failure | retry once | action, ref, network failure category, retry count |
| package registry or pip transient network failure | retry once | package manager, lockfile identity, cache state, failed attempt |
| GitHub attestation service transient | retry once for proof-anchor | attestation step, service error class, verification result |
| Docker daemon or service startup transient | retry once only after cleanup succeeds | service, compose profile, cleanup status, retry count |
| artifact upload or download transient | retry once when artifact content is already generated | artifact name, size, hash where available, failed attempt |

## Non-Retryable Failures

These failures must not be automatically retried as a path to pass:

- validator findings;
- strict JSON parse failure;
- schema, taxonomy, vocabulary, registry, semantic, ADR, or authority conflict;
- lint, typecheck, test, coverage, or selftest failure;
- planted-defect failure or skipped negative control;
- stale, missing, mismatched, partial, superseded, generated-report-only, or
  human-review-required evidence;
- proof-cockpit acceptance drift, proof projection drift, warning drift, gap
  drift, route-count drift, screenshot identity drift, or non-claim drift;
- hash, artifact manifest, chain-of-custody, or commit-pin mismatch;
- permission, token, credential, or secret exposure;
- required status-check removal or workflow identity mismatch;
- generated artifact mismatch;
- any failure whose cause cannot be classified.

Ambiguity is non-retryable as a pass path. The safe fallback is to preserve the
failed result, widen validation where applicable, and require review.

## Reporting Expectations

Future CI timeout and retry implementation should record:

- workflow name, job name, step name, command ID, and source SHA;
- started time, completed time, duration, configured timeout, timeout flag, and
  queue or setup time where available;
- exit code, status, signal, failure category, and retry eligibility;
- retry count, first failed attempt status, final attempt status, and reason for
  retry;
- cache state, dependency lock identity, and restored or saved cache bytes where
  available;
- artifact and log paths for failed attempts where safe to retain;
- cleanup status before retry for Compose or service-backed steps;
- validators, proof families, evidence families, and non-claim boundaries
  covered by the step;
- validation intentionally not run, with reason.

A final passing retry must still expose the first failed attempt in the issue,
PR, or generated CI report. Generated reports remain lower authority than raw
logs, validator output, and proof evidence.

## Implementation Guardrails

Future workflow mutation must preserve these guardrails:

- do not retry semantic or proof failures into pass results;
- do not hide first-attempt failures;
- do not drop required checks to meet a timeout;
- do not make proof-cockpit machine QA a default PR gate;
- do not make staging proof the default proof path;
- do not let cache hits satisfy proof without input completeness and
  fail-closed fallback;
- do not alter proof-anchor conservatism without explicit no-regression review;
- do not claim final test-readiness from the current validate-spec workflow.

## Dependencies

- USF-637 supplies the CI workflow inventory.
- USF-384 supplies current timing context.
- USF-770 supplies regression budget and threshold policy.
- USF-415 supplies future timing-record fields.
- USF-826 supplies before and after timing comparison.
- USF-823 supplies no-regression proof expectations.
- USF-829 supplies rollback expectations.
- USF-987 supplies future proof-cockpit route timing expectations.
- USF-961 tracks the baseline proof-cockpit machine-QA timeout observation.
- USF-966 remains the terminal fresh proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should run workflow syntax validation where available,
validate-spec, repository aggregate validation, evidence invalidation
validation, evidence reuse validation, and passing PR checks. If workflow timing
records become machine-readable, strict JSON parsing and planted or synthetic
negative controls should prove that semantic failures are not retried into
passes and that first-attempt failures remain visible.

Fresh proof-cockpit machine QA is not required for this design artifact and
should remain deferred to USF-966 unless a later implementation issue records a
stricter proof requirement.

## Acceptance Mapping For USF-657

USF-657 requires timeout budgets, retryable failures, non-retryable failures,
and reporting expectations. This design satisfies that by defining:

- proposed workflow and step timeout budgets;
- retryable infrastructure-shaped failure classes;
- non-retryable semantic, validator, proof, evidence, non-claim, hash, and
  security failure classes;
- reporting fields for timeouts, retries, failed attempts, and final results;
- implementation guardrails, dependencies, validation expectations, and
  non-claims.

No CI workflow, command execution, validator behavior, proof evidence, runtime
behavior, or proof-cockpit machine evidence was changed by this issue.
