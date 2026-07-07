# CI Full Main Check Policy

| Field | Value |
| --- | --- |
| Linear issue | USF-643 |
| Status | Design artifact for full main checks |
| Scope | Mainline integration checks, artifacts, timeout budget, failure handling, and proof-ladder boundary |
| Authority posture | This document defines future CI policy expectations only. It does not redefine USF semantic authority. |

## Purpose

USF needs a full mainline CI lane that is stronger than fast PR feedback but
still does not make every PR pay for every deep or staging proof path. The main
lane should preserve current full validation expectations, publish enough
artifacts for review, and fail closed when post-merge validation contradicts
the merged state.

This issue is discovery and design only. It does not mutate workflows, branch
protection, Makefile targets, package scripts, validators, proof evidence,
artifact retention, proof-anchor behavior, or proof-cockpit machine QA.

## Non-Claims

This policy does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Mainline validation is a stronger integration gate than fast PR checks, but it
does not by itself create Test completion, staging promotion, public proof,
human acceptance, or production-live evidence.

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
- docs/architecture/proof-artifact-retention-policy.md.

## Current State

The current validate-spec workflow runs on both push and pull request. It
already includes formal spec validation, repository aggregate validation,
parity validation, foundation-substrate closure validation and selftest,
proof-cockpit acceptance validation and selftest, and the PR governance gate
for pull requests.

The proof-anchor workflow runs on pushes to main. It emits a deterministic
anchor payload, validates it against the merge commit, attests it with the CI
identity, verifies the attestation, and publishes an annotated proof-anchor tag
when needed.

USF-643 defines the future mainline lane design. It does not change the current
workflows and does not decide branch protection by itself.

## Proposed Mainline Lane

The future full main lane should run after merge to the controlled mainline
branch and should be at least as strong as the current validate-spec workflow
for repository governance.

| Check family | Candidate checks | Artifacts or reports |
| --- | --- | --- |
| Setup and dependency integrity | Checkout with history, Python setup, Node setup, Corepack enablement, frozen pnpm install, validator Python requirements install | Install logs, lockfile identity, cache state when available |
| Formal semantic validation | Formal spec validation with report emission | Validator report, strict JSON status, rule summary |
| Repository aggregate validation | Repository aggregate command covering current validator families, proof-cockpit projection check, evidence invalidation, evidence reuse, and non-ui completeness where wired | Aggregate logs and child-command failure visibility |
| Historical-lineage and parity validation | Parity validation suite while retained as current compatibility coverage | Parity report or logs, failure family |
| Closure and acceptance validators | Foundation-substrate closure validation and selftest, proof-cockpit acceptance validation and selftest | Closure validator output, proof-cockpit acceptance output |
| Evidence and artifact guardrails | Evidence invalidation validation, evidence reuse validation, projection re-pin check when not already visible in aggregate logs | Stale propagation, reuse eligibility, projection check output |
| Main-only anchor publication | Proof-anchor workflow on main push | Anchor payload, attestation verification, tag publication log |

If a later implementation introduces a separate mainline workflow from the
current validate-spec workflow, the mainline lane must preserve or explicitly
account for every current required validator and selftest expectation before
removing duplication.

## Initial Current Command Set

The current repository exposes these command candidates for a future mainline
workflow. USF-643 records the expected design only; implementation issues must
re-check commands before changing workflow syntax.

| Mainline purpose | Current command candidate | Boundary |
| --- | --- | --- |
| Frozen install | `make setup` or `corepack pnpm install --frozen-lockfile` | Install correctness is required before Node-backed checks. |
| Full foundation gate | `make foundation` or `corepack pnpm verify` | Broad local gate; expensive enough to decompose into named CI steps for observability. |
| Repository validation aggregate | `corepack pnpm repo:validate` | Preserves current validator aggregation and child-command visibility. |
| Historical parity suite | `corepack pnpm parity` | Retained compatibility coverage while parity remains in current workflow. |
| Bounded test-readiness gate | `make test-ready` or `corepack pnpm test-readiness` | Separate from proof-cockpit machine QA and from staging proof. |
| Proof-cockpit retained-evidence validation | `make proof-cockpit-validate-current` and `make proof-cockpit-projection-repin-check` | Uses retained/projection evidence only. |
| Proof-anchor publication | Existing proof-anchor workflow on main push | Main-only conservative anchor publication; not a PR fast-lane substitute. |

Fresh proof-cockpit machine QA, proof-review repinning, public FQDN proof, and
staging-adjacent proof are not part of the default mainline command set during
orchestration.

## Timeout Budget And Failure Handling

USF-657 supplies the timeout policy. Mainline implementation should use these
rules:

- timeouts are failed evidence by default;
- validator, proof, evidence, non-claim, hash, permission, and security
  failures are not automatically retryable into pass;
- first failed attempts remain visible if an infrastructure retry occurs;
- aggregate command failures must expose the failed child command;
- ambiguity widens validation rather than treating missing results as pass;
- proof-anchor failure blocks proof-anchor publication posture but does not
  invent a readiness claim.

The main lane should record configured timeout, wall duration, retry count,
cache state, artifact byte counts, and generated-report lower-authority
boundaries once timing and artifact reporting exist.

## Skipped Or Deferred By Mainline

The mainline lane should not automatically include every expensive proof path.

| Deferred path | Boundary |
| --- | --- |
| Proof-cockpit machine QA | Deferred to USF-966 during orchestration; after terminal refresh, future scheduling is a separate decision. |
| Staging promotion checks | Required only for staging-relevant changes or promotion attempts; not a default consequence of every main merge. |
| Human acceptance | Cannot be automated from CI. Human acceptance stays explicit and issue-bound. |
| Public FQDN or live-provider proof | Required only when the change class or proof issue requires it. Hermetic or production-shaped evidence does not become live-provider evidence. |
| Destructive operational proof | Must stay out of ordinary mainline checks unless a safe proof issue and environment policy permit it. |

## Artifact Contract

A future full main check implementation should retain or upload:

- validator reports and raw validator output;
- aggregate child-command logs;
- parity and closure validation logs;
- proof-cockpit acceptance output;
- evidence invalidation and reuse output;
- proof-anchor payload and attestation verification output on main;
- timing records once USF-415 is implemented;
- artifact hash or manifest data where artifact reuse is in scope.

Artifact retention must follow the proof artifact policy. Generated reports
remain lower authority than raw validator output, raw proof evidence, and
accepted semantic authority.

## Dependencies

- USF-386 supplies the assurance classification matrix.
- USF-639 should consume this lane when creating the broader required-checks
  matrix.
- USF-657 supplies timeout and retry rules.
- USF-658 supplies cost-control rules.
- USF-770 supplies regression budget thresholds.
- USF-823 supplies no-regression expectations.
- USF-827 supplies validator equivalence expectations.
- USF-966 remains the terminal proof-cockpit machine-evidence refresh.

## Validation Expectations For Future Implementation

Future implementation should demonstrate:

- mainline runs preserve current full validation expectations;
- every required current validator remains present or has an approved
  equivalent;
- artifacts and logs are retained enough to explain failures;
- proof-anchor publication remains main-only and conservative;
- proof-cockpit machine QA is not pulled into ordinary mainline validation
  before USF-966;
- staging proof remains classification-driven.

## Acceptance Mapping For USF-643

USF-643 requires commands, artifacts, timeout budget, and failure handling. This
design satisfies that by defining:

- proposed mainline check families;
- artifact and report expectations;
- timeout and failure handling rules;
- skipped and deferred proof paths;
- dependencies, validation expectations, and non-claims.

No CI workflow, required check, Makefile target, package script, validator,
runtime behavior, proof evidence, proof-anchor behavior, or proof-cockpit
machine evidence was changed by this issue.
