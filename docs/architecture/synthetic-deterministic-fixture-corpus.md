# Synthetic Deterministic Fixture Corpus

USF-248 adds the fixture corpus used by downstream test-readiness child issues.

The machine-readable corpus is `tests/packages/fixtures/service-fixture-corpus.json`. The loader API is `tests/packages/fixtures/synthetic-fixture-corpus.ts`. The corpus is derived from the USF-239 semantic service test obligation manifest and covers every service obligation row and every semantic contract obligation row.

## Scope

The corpus records deterministic seed, reset, cleanup, teardown, repeatability, failure-recovery, provenance, and validation expectations. Generated test Compose services receive concrete seeder, resetter, cleanup, and teardown identifiers. Non-generated or out-of-scope service rows receive an explicit non-test disposition instead of a hidden pass.

Semantic contract fixture rows record tenant, actor, role, permission, audit, readiness, positive path, negative fail-closed path, and data-shape seed coverage.

## API

Tests should use `loadSyntheticFixtureCorpus`, `serviceFixtureById`, and `semanticFixtureByContractId` from `tests/packages/fixtures/synthetic-fixture-corpus.ts`.

The fixture lifecycle proof also reads the corpus during `corepack pnpm test-readiness:fixtures`, so the proof fails closed if required service-backed fixture rows allow in-memory substitutes, lack lifecycle mapping, or drop required non-claims.

## Boundaries

All fixture rows are synthetic and value-free. The corpus does not permit real tenant data, real user data, production-derived data, real secrets, private local state, live provider payloads, tokens, raw endpoints, connection strings, stack traces, raw SDK errors, or provider payloads.

The corpus does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or final USF-234 acceptance.
