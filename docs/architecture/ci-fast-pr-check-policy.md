# CI Fast PR Check Policy

| Field | Value |
| --- | --- |
| Linear issue | USF-640 |
| Status | Design artifact for fast PR checks |
| Scope | Pull-request validation lane, affected-run fallback, skipped deep checks, escalation triggers, and assurance boundaries |
| Authority posture | This document defines future CI policy expectations only. It does not redefine USF semantic authority. |

## Purpose

USF needs a fast pull-request validation lane before UI, app-surface, cache,
and proof-pipeline work expands the repository. The lane must give early
feedback without becoming a false substitute for full validation, Test proof,
staging proof, human acceptance, or proof-cockpit machine evidence.

This issue is discovery and design only. It does not mutate GitHub workflows,
branch protection, Makefile targets, package scripts, validators, runtime code,
proof evidence, artifact retention, or proof-cockpit machine QA.

## Non-Claims

This policy does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Fast PR checks are an early fail-closed filter. Passing the fast lane does not
mean the full mainline lane, nightly lane, Compose proof, staging proof, or
human review lane has passed.

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
- Makefile.
- package.json.
- .github/workflows/validate-spec.yml.
- .github/workflows/proof-anchor.yml.
- tools/validate-evidence-invalidation/evidence-invalidation-map.json.
- tools/validate-evidence-reuse/evidence-reuse-decisions.json.

## Current State

The current validate-spec workflow runs on push and pull request. It installs
Python, Node, and pnpm dependencies, runs formal spec validation, repository
aggregate validation, parity validation, foundation-substrate closure
validation and selftest, proof-cockpit acceptance validation and selftest, and
the PR governance gate on pull requests.

That broad workflow is assurance-heavy but not yet split into fast PR, full
main, scheduled deep, manual proof, and staging-promotion lanes. It also does
not yet emit portable timing, cache, or artifact records. USF-640 defines the
future fast lane only; USF-639 remains the broader required-checks matrix.

## Proposed Fast Lane

The future fast PR lane should have three layers.

| Layer | Candidate checks | Assurance preserved |
| --- | --- | --- |
| Universal PR guard | Changed-file classification, strict JSON parsing for changed JSON, formal spec validation, PR governance validation against the PR base, evidence invalidation validation, evidence reuse validation | Shape, semantic, authority, stale-evidence, generated-report, non-claim, and fail-closed boundaries remain visible before deeper work starts. |
| Targeted affected checks | Affected validator families selected from the changed-file classifier and assurance matrix, with full-run fallback on ambiguity | Low-risk changes get proportionate checks; uncertain changes widen instead of under-validating. |
| Code and command checks | Format, lint, typecheck, unit tests, package-script checks, command-surface checks, or Compose validation only when the change class touches those inputs | Code and command changes are not allowed to pass on documentation-only validation. |

The fast lane should preserve the wrapped command exit codes and should report
which checks were selected, skipped, escalated, or deferred. A generated summary
is lower authority than validator output and raw CI logs.

## Initial Current Command Set

The current repository already exposes commands that can seed the future fast
lane. A future implementation must verify the exact command surface again
before wiring CI, because USF-640 is a design issue and does not mutate
workflow files.

| Selection case | Current command candidate | Notes |
| --- | --- | --- |
| Frozen dependency setup | `corepack pnpm install --frozen-lockfile` | Required before Node-backed checks. |
| Formal spec validation | `python3 tools/validate-spec/validate-spec.py all --report /tmp/usf-validator-report.json` or `corepack pnpm validate-spec` | Report output is generated, not semantic authority. |
| PR governance validation | `python3 tools/validate-spec/validate-spec.py pr --base origin/$BASE_REF --head HEAD --report /tmp/usf-pr-validator-report.json` | Pull-request context only; must fail closed when the base cannot be resolved. |
| Evidence invalidation | `corepack pnpm evidence-invalidation:validate` | Required for evidence, artifact, proof, CI policy, and invalidation-map changes. |
| Evidence reuse | `corepack pnpm evidence-reuse:validate` | Required when reuse decisions or pinned hashes can be affected. |
| Validator selftest | Affected validator selftest, for example `corepack pnpm validate-spec:selftest`, `corepack pnpm evidence-invalidation:selftest`, or `corepack pnpm evidence-reuse:selftest` | Selected by changed validator family. |
| Code quality | `corepack pnpm format:check`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test` | Required when source, package, adapter, app, or test code changes. |
| Contract generation checks | `corepack pnpm openapi:check` and `corepack pnpm db:types:check` | Required when API or database contract inputs change. |
| Compose validation | `corepack pnpm compose:check-generated`, `corepack pnpm compose:validate`, `corepack pnpm compose:policy`, or profile-specific port checks | Required when Compose, provider, profile, or environment files change. |
| Proof-cockpit retained-evidence checks | `corepack pnpm proof-cockpit:validate-current` and `corepack pnpm proof-cockpit:projection-repin:check` | Uses retained/projection evidence only; does not run fresh machine QA. |

These command candidates are not a request to create missing targets. Missing
or renamed targets must be handled by the Makefile and command-surface issues
before CI depends on them.

## Compatibility Boundary

The current validate-spec workflow already runs broad PR validation, including
repository aggregate validation and parity validation. USF-640 does not remove
or downgrade those checks. Until USF-639 defines the required-checks matrix,
USF-659 implements affected-run logic, and USF-827 validates no-regression
equivalence for validator shortcuts, existing broad PR checks remain the
conservative baseline.

The future fast lane may become a separate early filter or may replace part of
the current PR workflow only after the fallback rules are executable and
ambiguous classifications fall back to the broader checks.

## Default Exclusions

These checks should not run by default in the fast PR lane:

| Excluded by default | Why excluded | How assurance is preserved |
| --- | --- | --- |
| Full repository aggregate validation | It is broader and slower than the fast lane | Runs in full main or when fast classification is ambiguous. |
| Full parity validation | It is broad historical-lineage coverage | Runs in full main or when source-lineage, validator, or implementation impact requires it. |
| Full test-readiness suite | It includes composed and assurance paths that are not needed for every PR | Runs on main, nightly, or when Test proof is required by change class. |
| Compose smoke or service-backed proof | Service startup is expensive and environment-sensitive | Runs when provider, Compose, runtime, or Test-relevant files change. |
| Proof-cockpit machine QA | Expensive retained machine evidence refresh is terminal to USF-966 during orchestration | Fast PR may run proof-cockpit acceptance validation or projection checks when proof-cockpit metadata changes, but not fresh machine QA. |
| Public FQDN, proof-review, and staging promotion checks | They involve public proof, operator, or staging-adjacent surfaces | Trigger only when the change class requires public proof, staging, or human review gates. |
| Proof-anchor publication | It is a main-push publication mechanism | Remains main-only and conservative. |

## Escalation Triggers

The fast lane must widen to full main-equivalent validation, full affected
family validation, or a manual proof lane when any trigger applies.

| Trigger | Required escalation |
| --- | --- |
| Changed-file classifier cannot map impact | Fall back to full validation for the affected family or all families. |
| Charter, authority model, ADR, semantic instance, schema, taxonomy, vocabulary, registry, or current-state routing changes | Run semantic and authority validators, then widen on ambiguity. |
| Validator code, selftests, planted defects, aggregate validation, evidence invalidation, or evidence reuse changes | Run affected validator all mode, selftest, and before/after validator equivalence expectations. |
| Makefile, package scripts, command aliases, target help, or CI workflow files change | Require command-surface review, local parity expectations, and full or affected CI-equivalent validation. |
| Dependency, lockfile, toolchain, Node, pnpm, Python, TypeScript, Vitest, ESLint, or Compose tool config changes | Run frozen install, relevant build or quality checks, and dependency/cache safety checks. |
| Runtime source, package, adapter, app, proof script, or test file changes | Run code quality, typecheck, tests, and the lowest sufficient Dev or Test proof for the changed surface. |
| Compose, provider, environment, public proof, proof-review, or staging-adjacent files change | Run Compose or environment proof as required; staging proof only if the classification says staging is relevant. |
| Evidence, artifacts, proof-cockpit projections, retained machine-run metadata, hashes, or chain-of-custody files change | Run evidence invalidation, evidence reuse, proof-cockpit acceptance, and projection checks as applicable. |
| Any validator, proof, test, or quality failure occurs | Preserve the failure; do not retry into pass unless USF-657 classifies it as transient infrastructure. |

## Output Contract

A future fast PR report should record:

- issue key and change class;
- changed-file classification and ambiguity result;
- selected checks and skipped checks;
- escalation trigger, if any;
- commands run and command exit codes;
- validation not run, with reason;
- evidence invalidation and reuse posture;
- cache state where applicable;
- artifact paths and generated-report lower-authority boundary;
- non-claim statement.

## Dependencies

- USF-386 supplies the assurance classification matrix.
- USF-639 should consume this lane when creating the broader required-checks
  matrix.
- USF-659 owns executable affected-run logic.
- USF-657 supplies timeout and retry rules.
- USF-658 supplies CI cost-control rules.
- USF-770 supplies regression budget thresholds.
- USF-827 supplies validator equivalence expectations.
- USF-966 remains the terminal proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should prove representative change classes:

- documentation-only changes select only proportionate checks;
- semantic and authority changes widen correctly;
- validator changes run selftests and equivalence checks;
- runtime changes trigger code and proof checks;
- ambiguous changes fall back to full validation;
- staging proof is not selected unless the classification justifies it;
- generated reports do not satisfy proof without underlying evidence.

## Acceptance Mapping For USF-640

USF-640 requires exact checks, skipped checks, escalation triggers, and a
no-regression fallback. This design satisfies that by defining:

- a three-layer proposed fast PR lane;
- checks excluded from the fast lane by default;
- escalation triggers and fallback behavior;
- output and validation expectations;
- dependencies and non-claims.

No CI workflow, required check, Makefile target, package script, validator,
runtime behavior, proof evidence, or proof-cockpit machine evidence was changed
by this issue.
