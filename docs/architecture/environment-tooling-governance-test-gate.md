# Environment Tooling Governance Test Gate

Issue: USF-258. Parent: USF-234.

Machine-readable evidence lives in
`docs/architecture/environment-tooling-governance-test-gate.json`.

## Scope

USF-258 adds an issue-scoped Vitest gate for environment, tooling,
version-control, generated-artifact, local/CI parity, clean-checkout, and
private-state hygiene. The executable test is:

- `corepack pnpm test -- tests/packages/environment-tooling-governance-test-gate.test.ts`

The suite reads the existing package, workspace, lockfile, command-surface,
dev-readiness, git-practices, and expanded obligation manifest artefacts. It
does not edit package scripts, the Makefile, CI workflows, shared validators, or
the shared obligation manifest.

## Covered Checks

- Toolchain pinning for Node, pnpm via Corepack, TypeScript, Vitest, ESLint,
  Prettier, and TypeScript ESLint.
- Lockfile and workspace importer consistency against the checked-in package
  layout.
- Existing package and Make command parity through the USF-238 command surface.
- Branch and tag governance boundaries from the Git Practices Standard.
- Hidden local state prevention for `.codex`, `.claude`, environment files,
  real secrets, real tenant data, raw endpoint values, and large transient
  artefacts.
- Environment boundaries for profile selection, optional env vars,
  deterministic seeds, deterministic clock posture, locale/timezone sensitivity,
  path/case sensitivity, temporary directory cleanup, and no unintended local
  state dependency.
- Generated-artifact derivation checks for Compose, OpenAPI, DB types, schema
  registry, fixture corpus, obligation manifest, command surface, enterprise
  evidence, and planted-defect assets.
- In-memory planted defects for stale generated files, tool version drift,
  command mismatch, dirty git state, committed private artifact, secret-like
  value, missing environment boundary, and unsupported compliance overclaim.

## Shared Edit Boundary

USF-258 does not require package, Makefile, CI, shared validator, enterprise
evidence model, fixture corpus, Compose, service catalogue, schema, or shared
obligation manifest edits in this PR. If those shared surfaces need promotion
later, that is coordinator scope rather than this issue-scoped worker change.

The USF-259 expanded manifest row can remain pending until merged-evidence
reconciliation. Linear Done and final USF-234 acceptance remain coordinator
owned.

## Non-Claims

This suite does not claim final test readiness, staging readiness, production
readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC
27001 certification, enterprise production readiness, product UI readiness,
browser E2E readiness, full React product parity, regulatory compliance, or
final USF-234 acceptance.
