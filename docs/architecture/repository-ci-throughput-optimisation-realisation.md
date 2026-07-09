# Repository CI Throughput Optimisation Realisation

Owner issue: USF-1037

This note records the repository-owned execution plan for fastest-safe GitHub CI throughput optimisation. It is process evidence for the current implementation tranche and does not override the Charter, Authority Model, semantic artefacts, ADRs, validators, runtime proof evidence, or raw evidence.

## Implemented Now

- Preserve the existing required `validate` job context in `.github/workflows/validate-spec.yml`.
- Add pull-request-only concurrency cancellation for superseded `validate-spec` runs.
- Add pnpm store and pip download cache restoration with explicit keys and no restore-key broadening.
- Keep pull-request cache use read-only and allow cache writes only on trusted `main` runs, including manual dispatch on `main`.
- Normalize empty cache-hit outputs to explicit `false` for executed cache restore paths.
- Add a generated GitHub step summary for validate-spec timing and normalized cache hit/miss diagnostics.
- Narrow checkout from full history to a shallow checkout plus an explicit shallow fetch of the pull-request base ref needed by the PR governance gate.
- Keep affected-domain selection advisory and fail closed to full validation on unknown, workflow, package, validator, evidence, provider, or environment ambiguity.
- Record that proof-cockpit freshness requires a proof-review re-pin after the final non-proof source tree is committed.
- Reaffirm that proof-cockpit generated reports and retained machine evidence freshness are not weakened by this CI setup change.

## Deferred Or Rejected

- PR/full split is deferred because branch protection currently requires the single `validate` context.
- Validator sharding and parallelism are deferred until serial-versus-parallel equivalence, resource locks, deterministic output paths, and planted-defect coverage are recorded.
- Reusable workflow extraction is deferred because it adds status-context and naming surface without addressing the current bottleneck.
- Scheduled or manual deep jobs are deferred because required PR coverage must not move off the protected check without an owner decision.
- Caddy, callback, webhook, Compose route, and public proof route changes are rejected for this issue because they do not address the observed CI throughput bottleneck.
- Self-hosted and larger hosted runners require explicit owner decisions, cost/trust-boundary review, and before-and-after timing evidence before adoption.
- Self-hosted runner capacity is now separated into USF-1038 and is not adopted by this PR.

## Timing Record

The baseline comes from recent GitHub `validate-spec` runs observed on 2026-07-09. The representative pre-change duration is about 378 seconds, with recent successful runs clustered around 6 minutes 8 seconds to 6 minutes 20 seconds.

Exact latest after-run timing is intentionally not committed to source-tracked evidence because each exact run-id update changes the source tree, requires proof-cockpit re-pinning, and triggers another CI run. This repository record defines the timing boundary and requires the latest exact run id, duration, cache hit/miss values, and queue timing to be reported in PR or Linear operational records before Linear closure.

The repository-owned evidence is complete for this tranche after local validation and a successful PR `validate` run. Linear has not been mutated by this record and remains outside USF semantic authority.

## Cache Warm

Trusted cache writes are limited to `refs/heads/main` through main pushes and manual `workflow_dispatch` runs on main. Pull requests remain read-only for cache state. If this branch cannot prove cache writes before merge, the required evidence is a main validate-spec run using this workflow version followed by a PR run that records explicit lookup, hit, write-allowed, write-attempted, and skipped-reason values.

## Checkout Scope

The PR validator requires `HEAD` and `origin/<base>` for the `origin/<base>...HEAD` diff and changed JSON reads at `HEAD`. Bootstrap validation also requires the single recorded `v2-bootstrap` marker tag plus enough ancestry for the recorded-start check. The workflow therefore uses a shallow checkout, explicitly fetches only `v2-bootstrap` at depth 2, and explicitly fetches the PR base ref; it does not fetch all branches or all tags. If the shallow refs cannot support the PR diff, the workflow unshallows and fails if the diff still cannot be computed.

## Parallelism Plan

The largest likely future gain is validator sharding with a final required `validate` aggregator. Candidate read-only shards are spec/PR governance, repository aggregate validation, parity, foundation substrate closure, and proof-cockpit acceptance. This PR records the plan but does not activate it because sharding needs an equivalence validator, planted-defect preservation proof, skip/failure semantics, and branch-protection-compatible status mapping first.

Runner capacity is tracked separately by USF-1038. Validator sharding remains related to USF-656 until a newer dedicated sharding issue supersedes it.

## Non-Claims

This realisation does not create runtime implementation code, does not import source code, does not change staging or deployment posture, does not create provider or credential setup, does not make production or live-provider claims, does not use generated reports as semantic authority, and does not allow cache hits to satisfy validation or proof.
