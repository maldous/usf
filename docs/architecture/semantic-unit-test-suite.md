# Semantic Unit Test Suite

Issue: USF-241. Parent: USF-234.

This document describes the owned semantic unit test suite inventory in `docs/architecture/semantic-unit-test-suite.json`.

The inventory is derived from `docs/architecture/semantic-service-test-obligation-manifest.json` by selecting `semanticContractObligations` where `ownerIssueIds` includes `USF-241`. The current selected set contains 67 semantic contract obligations across 14 capability domains.

## Scope

- Pure/local unit tests only.
- Core semantic helpers, capability decisions, process-local stores, adapter-safe mappings, and manifest-derived inventory checks.
- No composed-service, live-provider, final test-readiness, staging, production, deployment, SOC, ISO certification, enterprise-production, product UI, browser E2E, or full product readiness claim.

## Service-Backed Boundary

The USF-239 manifest contains 38 service rows. None assigns USF-241 as an owner. This unit suite therefore records those rows as excluded from USF-241 coverage claims.

Process-local adapters may be unit-tested for tenant scoping, idempotency, redaction, safe failure, and non-claim behavior. Those tests do not satisfy composed-service obligations and do not replace USF-242, USF-248, USF-251, or final USF-234 acceptance.

## Test Files

- `tests/packages/semantic-unit-obligation-manifest.test.ts`
- `tests/packages/core-semantic-boundaries.test.ts`
- `tests/capabilities/authorization-policy-boundaries.test.ts`
- `tests/adapters/local-adapter-boundaries.test.ts`

## Validation

The suite is expected to run through the normal repository unit command:

- `corepack pnpm test`

The test-readiness validator remains the authority for the manifest gate and must not be bypassed by this inventory.
