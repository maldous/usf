# Design Contract and Compose Drift Test Suite

USF-246 adds an executable drift suite for the bounded USF-234 test-readiness track.

The suite checks that semantic contract obligations, composed integration evidence, generated test Compose output, package scripts, Make targets, and command-surface documentation stay aligned. Generated Compose remains derivative evidence only; the service catalogue and semantic definitions remain authoritative.

## Evidence

- Machine-readable evidence: `docs/architecture/design-contract-compose-drift-test-suite.json`
- Test suite: `tests/packages/design-contract-compose-drift.test.ts`
- Source authorities:
  - `docs/architecture/semantic-service-test-obligation-manifest.json`
  - `docs/architecture/composed-service-integration-test-matrix.json`
  - `docs/architecture/test-readiness-command-surface-and-ci-gate.json`
  - `compose/compose.test.generated.yaml`
  - `package.json`
  - `Makefile`
  - `spec/instances/semantic-contract/`

## Covered Drift Classes

- Generated Compose derivation drift.
- Semantic contract to obligation mapping drift.
- API, event, and provider-binding semantic contract drift.
- Command-surface wiring drift across package scripts and Make targets.
- Readiness and certification overclaims.

## Planted Drift Cases

The test suite mutates in-memory copies of the evidence inputs and verifies each drift class fails closed:

- missing Compose target
- missing command
- missing contract mapping
- stale generated output
- readiness overclaim

These planted cases do not edit source files at runtime.

## Non-Claims

This suite does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or final USF-234 acceptance.
