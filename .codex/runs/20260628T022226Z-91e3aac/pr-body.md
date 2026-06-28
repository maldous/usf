## Summary

Reconciles USF-120 after PR 88 by creating USF-39 child tracking for each accepted local dev/test bootstrap extraction area, fixing the post-merge v2-bootstrap marker validator invariant, and tightening local bootstrap proof coverage.

## Branch

usf-120-reconcile-usf-39-closure-20260628T022226Z-91e3aac

## Start Commit

91e3aacbfa182de25947174b459f7b0421701c96

## Changes

- Fixes the bootstrap validator so a moved v2-bootstrap marker is valid only when its peeled target descends from the recorded USF-39 start target.
- Adds a planted defect proving an out-of-ancestry moved marker still fails closed.
- Removes undocumented API route aliases so the API surface stays aligned with the committed OpenAPI paths.
- Adds direct tests for worker smoke, auxiliary in-memory capabilities, and source-use guardrail constants.
- Expands the source-use matrix for new tests and root workspace guardrail files.
- Records the USF-120 run evidence under .codex/runs/20260628T022226Z-91e3aac.

## Linear Reconciliation

USF-120 is In Progress pending this PR merge and post-merge validation.

USF-39 child issues created:

- USF-121 API runtime and dev entrypoints
- USF-122 Worker dev entrypoint
- USF-123 Auth and tenant-context capability
- USF-124 Audit and event capture capability
- USF-125 Config files jobs and notify capabilities
- USF-126 In-memory dev provider adapters
- USF-127 Compose provider substrate
- USF-128 DB RLS and migration proof
- USF-129 OpenAPI contracts and schema conformance
- USF-130 Verification and proof commands
- USF-131 Source-use disposition coverage
- USF-132 Bootstrap validators and planted defects

## Validation

- pnpm install --frozen-lockfile passed.
- make dev-smoke passed.
- make verify passed.
- Controlled make dev probe passed.
- Python validator compile passed.
- validate-spec all, imports, instances, evidence, real-instances, implementation, selftest, and pr modes passed.
- validate-bootstrap all and selftest passed.
- Strict JSON parse outside node_modules passed for 549 files.
- git diff --check passed.

## Boundary

Local dev/test bootstrap only. No staging, production, deployment, live-external-provider, or production-live readiness is claimed. No React runtime/application code was copied, and React paths were not mirrored. No schemas were activated beyond authorised scope.

