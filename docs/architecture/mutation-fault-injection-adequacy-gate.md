# Mutation and Fault-Injection Adequacy Gate

Issue: USF-256. Parent: USF-234.

The machine-readable matrix for this issue is
`docs/architecture/mutation-fault-injection-adequacy-gate.json`.

## Scope

This issue adds a deterministic, local adequacy gate for representative
mutation and fault-injection cases. The suite mutates copied in-test data
structures only. It does not edit repository source files at runtime, does not
add mutation-test tooling dependencies, and does not modify shared validators,
package scripts, Make targets, CI workflows, Compose files, fixtures, enterprise
evidence, schemas, or the shared obligation manifest.

The matrix links USF-256 to the USF-239 obligation manifest, USF-248 fixture
corpus, USF-243 enterprise evidence model, and USF-259 expanded category row.
Each mutation maps to an expected failing test, validator rule, or planted
defect rule.

## Mutation Coverage

Representative weakening covered by the issue-owned suite:

- semantic-facet-backing-removed
- tenant-filter-removed
- permission-check-weakened
- role-mapping-weakened
- malformed-token-accepted
- audit-event-skipped
- fake-ready-state-accepted
- cleanup-mapping-removed
- stale-seed-accepted
- fixture-provenance-removed
- redaction-disabled
- service-backed-substitute-allowed
- lcov-threshold-lowered
- command-evidence-mapping-removed
- stale-command-accepted
- compose-target-linkage-removed
- enterprise-evidence-row-removed
- planted-defect-rule-removed
- non-claim-removed
- fail-closed-expectation-weakened

## Validation

Primary command:

`corepack pnpm test -- tests/packages/mutation-fault-injection-adequacy-gate.test.ts`

Supporting validation:

- `corepack pnpm test-readiness:validate`
- `python3 tools/validate-test-readiness/validate-test-readiness.py all --json`
- `git diff --check`

## Non-Claims

This suite does not claim formal verification, exhaustive proof, final test
readiness, staging readiness, production readiness, deployment readiness,
live-provider readiness, SOC readiness, ISO certification, enterprise
production readiness, product UI readiness, browser E2E readiness, full React
product parity, or final USF-234 acceptance.
