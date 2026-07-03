# Missing Evidence Planted Defects Regression Gate

USF-247 adds the final planted-defect regression surface for the expanded test-readiness track. The machine-readable authority for this note is `docs/architecture/missing-evidence-planted-defects-regression-gate.json`.

The gate uses `python3 tools/validate-test-readiness/validate-test-readiness.py selftest --json`, exposed as `corepack pnpm test-readiness:selftest` and `make test-readiness-selftest`. The command loads every JSON file under `tools/validate-test-readiness/planted-defects`, applies the defect to current repository evidence, and fails unless the expected test-readiness rule appears in validator findings.

The gate prevents regressions in obligation manifests, unit tests, integration matrices, enterprise evidence, functional regression evidence, operational resilience evidence, design/contract drift coverage, LCOV and Sonar wiring, command surface wiring, composed service/profile exercise, fixture seed/reset/cleanup, auth/tenant/role coverage, data lifecycle coverage, future AI semantic update guardrails, and non-claim preservation.

This evidence is a regression gate only. It does not claim final USF-234 acceptance, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
