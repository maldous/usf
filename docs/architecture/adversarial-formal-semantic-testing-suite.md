# Adversarial Formal Semantic Testing Suite

USF-257 adds an issue-scoped adversarial semantic suite for contradiction, ambiguity, incompleteness, unsafe equivalence, authority inversion, generated-authority inversion, stale evidence pass, in-memory substitute overclaim, and future-AI drift risks.

This suite is not formal verification and does not claim mathematical proof. It uses deterministic local Vitest checks over copied repository authority data. It does not execute services, mutate shared validators, update the obligation manifest, edit generated Compose, change package scripts, change Make targets, or edit the enterprise evidence model.

## Inputs

- `docs/architecture/authority-model.md`
- `docs/architecture/semantic-service-test-obligation-manifest.json`
- `docs/architecture/design-contract-compose-drift-test-suite.json`
- `docs/architecture/composed-service-integration-test-matrix.json`
- `docs/architecture/test-readiness-command-surface-and-ci-gate.json`
- `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json`
- `spec/instances/compose-service/service-catalogue.json`
- `spec/instances/semantic-contract/`
- `tests/contract/adversarial/adversarial-semantic-cases.json`

The requested standalone input `docs/architecture/future-ai-delivered-work-semantic-test-guardrail.json` is not present on current `origin/main`. The active future-AI guardrail flags are read from `docs/architecture/semantic-service-test-obligation-manifest.json#futureAiChangeGuardrail`.

## Adversarial Cases

- `semantic-facet-contradiction`
- `complete-facet-without-authority-link`
- `duplicate-service-id-conflicting-owner`
- `same-name-changed-behaviour`
- `same-behaviour-different-name`
- `generated-compose-treated-as-authority`
- `stale-evidence-pass-accepted`
- `in-memory-service-substitute-overclaim`
- `future-ai-code-without-semantic-update`
- `future-ai-semantic-without-test-evidence`
- `deferred-work-marked-complete-without-proof`
- `non-claim-removed`

## Non-Claims

This suite does not claim formal verification, mathematical proof, final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, full React parity readiness, or final USF-234 acceptance.
