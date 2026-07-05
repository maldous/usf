# Operational Resilience Failure Mode Suite

USF-245 adds a bounded local operational resilience test suite for the USF-234 test-readiness track.

Machine-readable evidence is in `docs/architecture/operational-resilience-failure-mode-suite.json`.

## Scope

- Maps operational-resilience semantic obligations, every service obligation, and every composed integration profile.
- Requires fail-closed behaviour, value-free audit evidence, observability evidence, incident evidence, privacy redaction, and reset/cleanup/teardown evidence.
- Uses deterministic synthetic failure descriptors only.
- Requires composed-service evidence for service-backed claims and forbids in-memory substitutes for those claims.

## Validator Coverage

The test-readiness validator enforces USF-TEST-READINESS-088 through USF-TEST-READINESS-094 for missing suite evidence, stale semantic or service mappings, missing fail-closed/audit/observability evidence, missing reset/cleanup/teardown evidence, missing profile failure-mode evidence, missing enterprise incident/privacy evidence, and readiness overclaims.

Seven planted defects selftest those validator classes.

## Non-Claims

This suite does not claim final USF-234 test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full product readiness.
