# Composed Service Integration Test Matrix

USF-242 adds the machine-checkable integration matrix for generated test Compose services. The authoritative machine-readable artefact is `docs/architecture/composed-service-integration-test-matrix.json`.

The matrix records 33 generated test Compose services, 11 profile rows including the default generated-service set, and 38 service-catalogue disposition rows. It links each generated service to the canonical `compose/compose.test.generated.yaml` target, the USF-239 obligation manifest, and the USF-248 synthetic fixture corpus.

The matrix is a coverage and disposition gate. It defines required start/readiness, seed, positive operation, negative operation, degraded/unavailable, cleanup, teardown, reset, audit/observability, host-binding, redaction, and generated-Compose derivation tests for each generated service. USF-251 owns the later every-service profile orchestration and runtime exercise gate. This separation keeps USF-242 focused on exhaustive integration coverage obligations and prevents a hidden final test-readiness claim.

Service-catalogue rows that are not generated in the current test Compose target are explicitly classified as historical/dev-only, external/live out of scope, unsupported, or deferred with follow-up. No service-backed test-readiness claim may be satisfied by in-memory or process-local substitutes.

Validation is provided by `corepack pnpm test-readiness:integration` and `python3 tools/validate-test-readiness/validate-test-readiness.py all --json`.

Non-claims: this artefact does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or USF-234 closure.
