# Repository CI Throughput Optimisation Realisation

Owner issue: USF-1037

This note records the repository-owned execution plan for fastest-safe GitHub CI throughput optimisation. It is process evidence for the current implementation tranche and does not override the Charter, Authority Model, semantic artefacts, ADRs, validators, runtime proof evidence, or raw evidence.

## Implemented Now

- Preserve the existing required `validate` job context in `.github/workflows/validate-spec.yml`.
- Add pull-request-only concurrency cancellation for superseded `validate-spec` runs.
- Add pnpm store and pip download cache restoration with explicit keys and no restore-key broadening.
- Keep pull-request cache use read-only and allow cache writes only on non-PR runs.
- Add a generated GitHub step summary for validate-spec timing and cache hit/miss diagnostics.
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

## Timing Record

The baseline comes from recent GitHub `validate-spec` runs observed on 2026-07-09. The representative pre-change duration is about 378 seconds, with recent successful runs clustered around 6 minutes 8 seconds to 6 minutes 20 seconds.

After timing is intentionally pending until this branch has a GitHub pull-request run with the updated workflow. The machine-readable closure state must not be marked ready until that after timing is added to `evidence/generated-reports/repository-ci-throughput-timing-evidence.json` and validations pass.

## Non-Claims

This realisation does not create runtime implementation code, does not import source code, does not change staging or deployment posture, does not create provider or credential setup, does not make production or live-provider claims, does not use generated reports as semantic authority, and does not allow cache hits to satisfy validation or proof.
