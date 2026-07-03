# Operational Resilience Failure-Mode Suite Source-Use Disposition Matrix

This matrix records source-use treatment for the USF-245 operational resilience
failure-mode suite. It uses current USF test-readiness manifests, fixture
lifecycle evidence, integration matrix evidence, and enterprise evidence as
authority. Historical React artefacts are lineage only and were not copied,
imported, mirrored, or used as active authority.

Linear source issue: USF-245.

Related issues: USF-234, USF-237, USF-239, USF-242, USF-247, USF-248,
USF-251, USF-260.

## Target Files

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `tests/packages/operational-resilience-failure-mode-suite.test.ts` | new-with-rationale | USF-245 acceptance criteria, semantic service test obligation manifest, composed service integration matrix, deterministic fixture corpus, fixture lifecycle evidence, and enterprise evidence model | Adds a bounded local Vitest proof that every USF-245-owned semantic/service/profile obligation has operational resilience, fail-closed, audit, observability, reset/cleanup, incident, privacy, and non-claim evidence. It does not perform destructive service operations or claim final test readiness. |

## Boundary Confirmation

USF-245 proves bounded local operational resilience failure-mode evidence only.
It does not prove final USF-234 test readiness, staging readiness, production
readiness, deployment readiness, live-provider readiness, SOC readiness,
ISO/IEC 27001 certification, enterprise production readiness, product UI
readiness, browser E2E readiness, full React product parity, or USF-234
closure.
