# CI Cost Control Policy

| Field | Value |
| --- | --- |
| Linear issue | USF-658 |
| Status | Design artifact for CI cost control policy |
| Scope | CI workflow cost, runner time, cache use, artifact handling, manual proof triggers, concurrency, and future scheduling |
| Authority posture | This document defines future CI cost-control expectations only. It does not redefine USF semantic authority. |

## Purpose

USF CI cost and runtime will grow as app-surface, UI, test, proof, and artifact
work expands. This design lists cost-saving candidates and the assurance that
must be preserved for each candidate before any future workflow implementation
or budget enforcement issue proceeds.

This issue is discovery and design only. It does not mutate workflows, remove
checks, add cache enforcement, change command execution, alter validator
behavior, refresh proof evidence, or run proof-cockpit machine QA.

## Non-Claims

This policy does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Cost control cannot outrank correctness. Savings are acceptable only when the
same assurance is preserved, stronger assurance is added, or a material tradeoff
is blocked behind an explicit owner decision.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a later
implementation issue changes runtime proof collection behavior enough to require
earlier proof and records that proof.

## Inputs Inspected

- USF-384 baseline timing and cost measurement issue context.
- USF-637 CI workflow inventory issue context.
- USF-770 regression budget and performance thresholds.
- USF-657 timeout and retry policy sidecar findings.
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
- docs/architecture/proof-cockpit-machine-qa-artifact-minimisation.md.
- docs/architecture/proof-artifact-retention-policy.md.

## Current State

Current CI has two workflows in the inspected inventory. The validate-spec
workflow runs on push and pull request and executes a broad serial validation
chain. The proof-anchor workflow runs on main pushes and publishes the
post-merge proof freshness anchor with attestation and tag publication.

The current validate-spec workflow does not expose a portable structured timing
artifact, cache-hit report, artifact upload policy, cancellation policy, or
cost dashboard. GitHub step durations exist, but they are not yet normalized
into repository-owned timing records.

The current CI path does not run proof-cockpit machine QA by default. That is a
cost and proof-ladder boundary worth preserving. Full machine evidence refresh
belongs to USF-966 unless a later issue records a stricter proof requirement.

## Savings Candidates

| Candidate | Savings mechanism | Assurance preserved | Prerequisites and risks |
| --- | --- | --- | --- |
| Fail-fast Python validation ordering | Run Python setup, validate-spec, and PR governance before Node setup and full pnpm install when workflow semantics allow it | Same formal validator and PR gate still run; aggregate checks still run after early gate passes | Saves failed runs only; must not drop report emission or required checks |
| Dependency caching | Cache pnpm store by lockfile identity and pip downloads by requirements identity while still running frozen installs | Frozen lockfile and pinned validator dependency checks remain authoritative | Cache keys must include lockfile and toolchain identity; cache hits do not satisfy proof |
| Duplicate all-mode validator review | Avoid separately running all-mode validators already included in repository aggregate while keeping explicit selftests where needed | Validator all-mode coverage remains through repo aggregate and selftests remain explicit | Must prove aggregate membership and report emission before removing duplicate steps |
| Superseded PR run cancellation | Cancel older in-progress PR validation for the same branch while preserving latest PR-head validation | Latest commit still validates; main and proof-anchor remain conservative | Branch protection and required-check expectations must be reviewed |
| Keep machine QA out of default CI | Preserve proof-cockpit acceptance and projection checks without running full machine QA on ordinary PRs | Terminal fresh machine evidence remains assigned to USF-966; retained evidence trace remains validator-checked | Incremental or default machine-QA changes require owner decision and full comparison |
| Artifact upload minimisation | Upload manifests, hashes, and summaries by default rather than duplicate raw proof bundles | Raw retained evidence, hashes, chain of custody, and non-claims remain authoritative | Artifact pruning or external storage is high risk and needs no-regression proof |
| Scheduled deep checks | Move explicitly expensive non-PR deep checks to scheduled or manual workflows only when PR assurance matrix permits | Fast PR checks remain proportionate; full checks still run on main or schedule | Affected-only and schedule policies need fail-closed fallback and owner-visible matrix |
| Local parity command | Define a local command that matches required CI checks for developers and agents | CI failures become reproducible without weakening CI | The command must not claim broader readiness than the checks prove |
| Sharding after command graph | Split independent validators after dependency graph and output equivalence are proven | Same validators run with same rule/severity/output expectations | Parallel execution must not hide child failures or reorder stateful proof steps |
| Remote cache decision deferral | Treat remote cache as a later owner decision, not an assumed cost control | Avoids paid provider or account ownership commitment | Requires owner decision, secret safety, and cache-key proof before adoption |

## Cost-Control Rules

Future CI cost-control implementation must preserve these rules:

- required semantic, validator, proof, evidence, non-claim, and PR governance
  checks cannot be removed only to save time;
- any affected-only or path-filtered run must fall back to full validation on
  ambiguity;
- cache keys must include every correctness-affecting semantic, proof, evidence,
  configuration, provider, environment, dependency, and command input;
- generated summaries cannot satisfy proof without raw validator output or
  evidence;
- proof-anchor conservatism must remain intact unless a future no-regression
  issue proves an equivalent or stronger mechanism;
- artifact minimisation must preserve retained evidence, hashes, chain of
  custody, and review-critical context;
- cost control must not make staging proof the default path.

## Decision Requirements

Future cost-control implementation needs an owner decision before:

- adopting a paid remote cache, paid runner, or provider-managed CI service;
- moving large proof artifacts outside Git or changing accepted evidence
  retention;
- making proof-cockpit machine QA incremental or defaulting to incremental
  proof instead of full proof where full proof is required;
- replacing required PR checks with affected-only checks plus nightly checks;
- reducing branch protection or required status checks;
- accepting any assurance tradeoff for cost reasons.

Ordinary sequencing, fail-fast ordering, cache-key design, local parity
definition, and reporting improvements do not require owner input when they
preserve or strengthen assurance and create no paid or account commitment.

## Reporting Expectations

A future CI cost-control report should record:

- issue key and changed workflow or command surface;
- baseline job and step timing source;
- before and after CI duration, queue duration, retry count, and pass/fail
  coverage;
- cache hit and miss rates, cache keys, restored bytes, and saved bytes;
- artifact upload and download byte counts;
- required checks preserved, added, or intentionally unchanged;
- assurance preserved for each savings candidate adopted;
- validation run and validation not run, with reasons;
- owner decisions required or explicitly not required;
- rollback recommendation and non-claim statement.

## Dependencies

- USF-384 supplies baseline timing and cost context.
- USF-637 supplies the CI workflow inventory.
- USF-770 supplies regression budget and performance threshold policy.
- USF-657 supplies timeout and retry policy.
- USF-823 supplies no-regression proof expectations.
- USF-826 supplies before and after timing comparison.
- USF-827 supplies validator equivalence expectations.
- USF-829 supplies rollback expectations.
- USF-966 remains the terminal fresh proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should run workflow syntax validation where available,
validate-spec, repository aggregate validation, evidence invalidation
validation, evidence reuse validation, and passing PR checks. CI changes should
compare before and after job coverage and should include local parity or an
explicit reason local parity is unavailable.

Fresh proof-cockpit machine QA is not required for this design artifact and
should remain deferred to USF-966 unless a later implementation issue records a
stricter proof requirement.

## Acceptance Mapping For USF-658

USF-658 requires a cost-control proposal listing savings candidates and the
assurance preserved for each. This design satisfies that by:

- listing concrete CI savings candidates;
- recording the assurance preserved for each candidate;
- recording prerequisites, risks, and owner-decision triggers;
- recording reporting expectations, dependencies, validation expectations, and
  non-claims.

No CI workflow, required check, budget enforcement, command execution,
validator behavior, proof evidence, runtime behavior, or proof-cockpit machine
evidence was changed by this issue.
