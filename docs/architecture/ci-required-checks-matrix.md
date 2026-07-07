# CI Required Checks Matrix

| Field | Value |
| --- | --- |
| Linear issue | USF-639 |
| Status | Design artifact for required CI checks |
| Scope | Required checks by change class and branch context, fail-closed fallback, and proof-ladder boundary |
| Authority posture | This document defines future CI policy expectations only. It does not redefine USF semantic authority. |

## Purpose

USF needs a required-checks matrix before affected-only CI, cache reuse,
branch-protection reshaping, or UI/app-surface work can safely rely on
proportionate validation. The matrix must keep current assurance intact while
distinguishing fast PR feedback, current PR-required validation, full mainline
validation, scheduled deep validation, and manual proof or staging-adjacent
lanes.

This issue is discovery and design only. It does not mutate GitHub workflows,
branch protection, Makefile targets, package scripts, validators, runtime code,
proof evidence, artifact retention, proof-anchor behavior, or proof-cockpit
machine QA.

## Non-Claims

This matrix does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

CI pass is not proof authority by itself. Generated reports remain lower
authority than USF semantic definitions, ADRs, validators, runtime proof
evidence, and raw validation output. Fresh proof-cockpit machine evidence
remains deferred to USF-966 for the terminal orchestration proof gate.

## Inputs Inspected

- USF-386 assurance classification matrix.
- USF-427 Dev to Test to Staging ladder semantics.
- USF-637 CI workflow inventory.
- USF-640 fast PR check policy.
- USF-643 full main check policy.
- USF-645 nightly and deep check policy.
- USF-657 CI timeout and retry policy.
- USF-658 CI cost control policy.
- USF-770 regression budget and performance thresholds.
- USF-823 no-regression proof plan.
- USF-827 validator equivalence plan.
- USF-829 rollback strategy.
- .github/workflows/validate-spec.yml.
- .github/workflows/proof-anchor.yml.
- Makefile.
- package.json.
- docs/architecture/current-state-command-surface.md.
- tools/validate-evidence-invalidation/evidence-invalidation-map.json.
- tools/validate-evidence-reuse/evidence-reuse-decisions.json.

## Current CI State

The current validate-spec workflow runs on push and pull request. It installs
Python, Node, and pnpm dependencies, runs formal spec validation, repository
aggregate validation, parity validation, foundation-substrate closure
validation and selftest, proof-cockpit acceptance validation and selftest, and
the PR governance gate on pull requests.

The proof-anchor workflow runs on push to main. It emits, validates, attests,
verifies, and publishes the post-merge proof anchor payload for the target main
commit.

There is no dedicated fast PR workflow, full-main split, scheduled nightly or
deep workflow, manual proof workflow, cache-report workflow, or structured
timing workflow in the inspected workflow set. The current broad PR validation
therefore remains the conservative required PR baseline until USF-659 supplies
executable affected-run selection, USF-827 proves no-regression validator
equivalence, and USF-854 records the required-check policy decision for
affected-only PR checks plus nightly full checks.

## Branch Contexts

| Context | Required purpose | Boundary |
| --- | --- | --- |
| Fast PR lane | Early fail-closed feedback selected by change class | May be added as an early filter, but must not replace current broad PR validation until affected-run equivalence is proven. |
| Current PR baseline | Existing broad pull-request workflow | Remains required baseline for now. Ambiguity, missing selectors, or unsupported command surfaces use this lane or a stronger lane. |
| Full main lane | Post-merge integration validation and proof-anchor publication | Must preserve all current mainline validators and proof-anchor behavior before any split or de-duplication. |
| Nightly or deep lane | Expensive sweeps, timing trends, broad selftests, artifact growth, and cache trend evidence | Adds assurance but cannot retroactively satisfy a PR-time required check. |
| Manual proof lane | Public proof, proof-review, staging-adjacent checks, or proof-cockpit machine QA only when explicitly triggered | Not default CI. Staging and human acceptance remain classification-driven and issue-bound. |

## Required Checks By Change Class

| Change class | PR-required checks | Main-required checks | Nightly or deep checks | Manual or staging-adjacent checks | Fail-closed fallback |
| --- | --- | --- | --- | --- | --- |
| Documentation or planning only | Changed-file classification, formal spec validation if governed docs are touched, PR governance gate, evidence invalidation classification when proof or CI policy paths are touched | Current repository aggregate when the path participates in validators or current workflow | Timing or artifact trend only when the path affects dashboards or reporting | None by default | Unknown doc impact widens to current broad PR validation. |
| Constitutional, authority, ADR, semantic instance, taxonomy, vocabulary, schema registry, or current-state routing | Formal spec validation, PR governance gate, relevant semantic or registry validators, strict JSON parse for changed JSON | Full current main validation and proof-anchor publication where main push applies | Validator selftests and aggregate semantic sweep | Owner review only for constitutional change or readiness claim | Ambiguous authority impact blocks shortcut and widens to full validation. |
| Validator, selftest, planted defect, proof script, evidence invalidation, or evidence reuse | Affected validator all mode, affected selftest, planted-defect regression where available, evidence invalidation and reuse checks when relevant | Repository aggregate, parity where retained, proof-cockpit projection check where relevant | Full validator sweep and equivalence comparison | Manual review for validator weakening, severity downgrade, or non-claim change | Any validator ambiguity or missing selftest widens to full affected-family validation. |
| Makefile, package script, command alias, CI workflow, dependency, lockfile, toolchain, cache policy, or command surface | Frozen install when Node-backed checks apply, command-surface review, current broad PR workflow, relevant evidence invalidation and reuse checks | Full main validation, command parity where retained, proof-anchor behavior preserved if workflow identity changes | Timing, cache hit or miss, artifact size, and before-after comparison | Owner decision only for paid cache/tooling or required-check reduction not already authorised | Missing command, changed exit contract, or uncertain cache key widens to full validation. |
| Test, fixture, coverage, or test runner configuration | Relevant unit, coverage, fixture, validator selftest, and affected test selection; full fallback when selection is ambiguous | Test-readiness aggregate when touched surface is Test-relevant | Sharding, flake, mutation, coverage, and negative-control sweeps | None by default unless public proof or staging-adjacent behavior is affected | New behavior using Test must include or require corresponding tests before stronger proof. |
| Runtime source, app, adapter, package, API, database contract, or generated client | Format, lint, typecheck, unit tests, contract checks, and lowest sufficient Dev or Test proof for the changed surface | Full main validation plus relevant runtime or test-readiness aggregate | Compose/provider sweeps and performance trend when the changed surface is service-backed | Staging proof only when the change affects staging-relevant runtime, deployment, public proof, provider integration, or human acceptance surfaces | Runtime code cannot pass on docs-only checks; ambiguity widens to full affected code and proof family. |
| Compose, provider, environment, configuration, secret, public proof, or pre-staging proof | Compose generation, compose validation, port/profile/policy checks, provider or public proof validators selected by classification | Full main validation plus affected provider or environment proof | Compose and provider sweep where safe | Public FQDN, proof-review, or staging-adjacent lane only when owning issue requires it | Provider or environment mismatch requires affected proof and cannot be treated as pass. |
| Evidence, artifacts, proof-cockpit projections, retained machine metadata, hashes, or chain of custody | Evidence invalidation, evidence reuse, proof-cockpit acceptance validation, projection re-pin check when relevant | Repository aggregate and retained-evidence validation | Artifact retention, hash, freshness, chain-of-custody, and diffability sweep | Fresh proof-cockpit machine QA remains terminal to USF-966 unless a later issue explicitly requires earlier refresh | Stale, unknown, partial, mismatched, generated-report-only, or missing evidence cannot satisfy pass. |
| Expo, Next.js, shared client SDK, UI-adapter, or app-surface semantic definition | Semantic-definition validators, contract checks, generated-client checks where applicable, UI semantic guardrails once defined | Full main validation and app-surface validator families once implemented | Accessibility, privacy, i18n, store-disclosure, bundle, and screenshot trend checks once defined | Human acceptance only for explicit app-surface acceptance issues; no store or release claim by CI alone | UI work must not invent behavior outside semantic authority; ambiguity blocks implementation gate. |
| Staging promotion or human acceptance attempt | All prerequisite PR and main checks, proof-ladder enforcement, evidence freshness, non-claim validation, and explicit owning issue context | Full main validation must already be green or repeated if stale | Deep lane may provide supporting trend evidence only | Required manual staging, proof-review, or human acceptance lane defined by the owning issue | Staging is not selected by default. Missing prerequisite evidence blocks promotion rather than widening claims. |

## Blocking And Advisory Result Classes

| Result class | Handling |
| --- | --- |
| Validator, semantic, ADR, evidence, non-claim, secret, permission, hash, chain-of-custody, provider-mode, or environment mismatch failure | Blocking. Do not retry into pass unless USF-657 classifies the failure as infrastructure and the first failed attempt remains visible. |
| Unknown changed-file classification, unsupported selector, missing dependency graph input, ambiguous cache key, or changed command with unknown exit contract | Blocking until widened to full affected-family validation or current broad PR validation. |
| Stale, unknown, partial, mismatched, generated-report-only, or terminal-refresh-deferred proof state | Blocking for proof reuse. Does not satisfy pass. |
| Performance threshold breach | Advisory until USF-770 marks the threshold blocking for the command family; then blocking. |
| Artifact size growth | Advisory or blocking according to retention class, byte growth, and review-critical context. |
| Nightly or deep failure | Blocks the owning deep lane and dependent issues, but does not silently change already-merged readiness claims. |

## Current Command Candidates

The current repository exposes these command families that future CI
implementation issues may use after re-checking exact command availability.
Missing or renamed commands must be handled by command-surface issues before CI
depends on them.

| Purpose | Current command candidate |
| --- | --- |
| Frozen dependency install | corepack pnpm install --frozen-lockfile, make setup |
| Formal spec validation | corepack pnpm validate-spec |
| Spec validator selftest | corepack pnpm validate-spec:selftest |
| Repository aggregate validation | corepack pnpm repo:validate |
| Historical parity compatibility | corepack pnpm parity |
| Full local foundation gate | make foundation, make dev-ready, corepack pnpm verify |
| Test-readiness gate | make test-ready, corepack pnpm test-readiness |
| Runtime validation and proof | corepack pnpm runtime:validate, corepack pnpm runtime:proof:in-memory, corepack pnpm runtime:proof:compose |
| Code quality | corepack pnpm format:check, corepack pnpm lint, corepack pnpm typecheck, corepack pnpm test |
| Contract checks | corepack pnpm openapi:check, corepack pnpm db:types:check |
| Compose validation | corepack pnpm compose:check-generated, corepack pnpm compose:validate, corepack pnpm compose:policy, corepack pnpm test-compose |
| Evidence guardrails | corepack pnpm evidence-invalidation:validate, corepack pnpm evidence-reuse:validate |
| Evidence selftests | corepack pnpm evidence-invalidation:selftest, corepack pnpm evidence-reuse:selftest |
| Proof-cockpit retained-evidence checks | corepack pnpm proof-cockpit:validate, corepack pnpm proof-cockpit:selftest, corepack pnpm proof-cockpit:projection-repin:check |
| Public or pre-staging proof | corepack pnpm public-fqdn:validate, corepack pnpm proof:pre-staging-external-smoke, and related public proof commands only when classification requires them |

## Required Policy Rules

- Current broad PR validation remains the baseline until affected-run logic and
  validator equivalence are implemented and accepted.
- Affected-only selection must fall back to full affected-family validation, or
  current broad PR validation, on ambiguity.
- Staging proof is required only for change classes that affect
  staging-relevant runtime, deployment, public proof, provider integration,
  production-shaped rehearsal, or human acceptance surfaces.
- Dev evidence can hand off to Test only when the proof level, provider mode,
  environment, freshness, emitted evidence, collected evidence, service
  catalogue scope, and validators support that handoff.
- Test evidence permits staging-entry consideration only. It does not satisfy
  Staging readiness.
- Nightly and deep checks add assurance but must not replace PR-required checks.
- Generated reports do not satisfy proof without underlying evidence.
- Cache hits, skipped checks, or reused artifacts do not satisfy proof unless
  the cache key and reuse decision include every correctness-affecting input.
- Any future branch protection update must reference this matrix, the executable
  affected-run classifier, local CI parity, and no-regression evidence.

## Dependencies

- USF-386 supplies the assurance classification matrix.
- USF-427 supplies the exact Dev to Test to Staging ladder semantics.
- USF-640, USF-643, and USF-645 supply the fast PR, full main, and nightly/deep
  lane policies.
- USF-657 supplies timeout and retry rules.
- USF-658 supplies cost-control rules.
- USF-659 owns executable changed-file affected-run logic.
- USF-660 owns CI proof-ladder enforcement.
- USF-663 owns CI local parity command design.
- USF-665 owns branch protection and required status checks.
- USF-770 supplies performance threshold policy.
- USF-827 supplies validator equivalence expectations.
- USF-854 owns the affected-only PR plus nightly full-check decision.
- USF-966 remains the terminal proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should prove representative cases for each change class:

- documentation-only changes select proportionate checks and widen on ambiguity;
- authority and semantic changes run formal validators and cannot bypass
  authority review;
- validator changes run validator selftests and equivalence expectations;
- command, CI, package, dependency, and cache changes preserve exit-code,
  cache-key, and local-parity behavior;
- runtime changes trigger code quality, tests, and the lowest sufficient Dev or
  Test proof;
- provider, Compose, public proof, or staging-adjacent changes trigger the
  classified proof family;
- stale, unknown, generated-report-only, or mismatched evidence cannot pass;
- staging proof is selected only when classification justifies it.

## Acceptance Mapping For USF-639

USF-639 requires a matrix that maps change classes to required checks and falls
back to full run on ambiguity. This design satisfies that by defining:

- branch contexts for fast PR, current PR baseline, full main, nightly/deep, and
  manual proof lanes;
- required checks by change class;
- blocking and advisory result classes;
- current command candidates;
- fail-closed affected-run, staging, Test, cache, and evidence rules;
- dependencies and validation expectations.

No CI workflow, required check, branch protection rule, Makefile target, package
script, validator, runtime behavior, proof evidence, proof-anchor behavior, or
proof-cockpit machine evidence was changed by this issue.
