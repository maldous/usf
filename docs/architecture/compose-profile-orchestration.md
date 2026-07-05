# Compose Profile Orchestration and Every-Service Exercise Gate

This artefact records bounded USF-251 local test orchestration evidence. It does not make generated Compose authoritative: `spec/instances/compose-service/service-catalogue.json`, the obligation manifest, fixture corpus, and composed integration matrix remain the controlling inputs.

The machine-readable companion is `docs/architecture/compose-profile-orchestration.json`.

## Scope

- Defines canonical local commands for the default test profile, every generated test profile, and the all-profile combination.
- Requires config, port policy, start, readiness, seed, exercise, observe, reset, cleanup, teardown, and residue-check phases.
- Requires non-Compose evidence for every generated service through `docs/architecture/composed-service-integration-test-matrix.json` and `tests/packages/fixtures/service-fixture-corpus.json`.
- Guards against service omissions, accidental default-profile promotion, loopback/port drift, dependency ordering drift, stale generated Compose, missing exercise evidence, and post-run residue.

## Boundaries

The proof is local test evidence only. It does not claim final USF-234 acceptance, test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full product readiness.

The enterprise evidence model is coordinator-locked during this work. Required follow-up rows are listed in the JSON under `enterpriseEvidenceModelRowsDeferredByCoordinatorLock` and are not applied here.
