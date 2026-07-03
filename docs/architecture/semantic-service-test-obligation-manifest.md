# Semantic Service Test Obligation Manifest

Issue: USF-239. Parent: USF-234.

This document describes the machine-readable test obligation manifest in docs/architecture/semantic-service-test-obligation-manifest.json. The manifest is derived from semantic contracts, the Compose service catalogue, the generated test Compose target, and the USF-235 through USF-238 test-readiness gates.

USF-259 expands this manifest so USF-253 through USF-258 are repository-enforced prerequisites before USF-247, USF-260, or final USF-234 acceptance can close. USF-259 does not implement those suites. It records owner, risk owner, control owner, review date, promotion impact, command mapping, enterprise evidence refs, deferred boundary, and non-claims for each expanded category.

The manifest is a gate, not a final readiness claim. It does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or USF-234 closure.

## Coverage Summary

- Service catalogue rows covered: 38
- Semantic contract rows covered: 67
- Generated test Compose services covered: 33
- Test Compose profiles covered: 10

## Obligation Classes

- unit: Pure implementation and validator unit tests for semantic obligations Owner issue: USF-241.
- composed-integration: Composed service integration tests for service-backed obligations Owner issue: USF-242.
- enterprise-evidence: Executable enterprise and ISO-style evidence tests without certification claims Owner issue: USF-243.
- functional-regression: Functional regression tests generated from semantic definitions Owner issue: USF-244.
- operational-resilience: Failure-mode, degraded readiness, retry, recovery, audit, and observability tests Owner issue: USF-245.
- design-contract-drift: Semantic, API, provider, command, and Compose drift tests Owner issue: USF-246.
- missing-evidence-regression: Planted defects and missing-evidence regression gate Owner issue: USF-247.
- seed-reset-fixture: Synthetic seed, reset, cleanup, teardown, and deterministic fixture obligations Owner issue: USF-248.
- auth-tenant-role-permission: Authentication, authorization, tenant, role, and permission exhaustive coverage Owner issue: USF-249.
- data-lifecycle: Data lifecycle, retention, privacy, search, analytics, object storage, and secrets tests Owner issue: USF-250.
- backup-restore-bulk-migration: Backup, restore, bulk upload, import, export, and migration tests Owner issue: USF-250.
- compose-profile-exercise: Every generated test Compose service and profile exercise gate Owner issue: USF-251.
- future-ai-guardrail: Future AI work semantic test update guardrail Owner issue: USF-252.
- bounded-non-test-disposition: Required catalogue-only or deferred service must have explicit bounded disposition Owner issue: USF-234.
- out-of-scope-disposition: Historical or out-of-scope service retained only as non-test disposition Owner issue: USF-234.
- security-abuse-fuzzing: Security abuse and fuzzing regression obligations Owner issue: USF-253.
- performance-concurrency-resource: Performance, concurrency, bounded load, and resource regression obligations Owner issue: USF-254.
- supply-chain-sbom-licence: Supply-chain, dependency, SBOM, licence, advisory, and image pinning obligations Owner issue: USF-255.
- mutation-fault-injection: Mutation and fault-injection adequacy obligations Owner issue: USF-256.
- adversarial-semantic-testing: Adversarial formal-style semantic and cross-model consistency obligations Owner issue: USF-257.
- environment-tooling-governance: Environment, tooling, version-control, generated-artifact, and local/CI parity obligations Owner issue: USF-258.

## Service-Backed Rule

Every service-backed test-readiness claim must use the canonical generated test Compose target and must forbid in-memory, process-local, mock, or hermetic substitutes unless the row is explicitly classified as non-service-backed or bounded non-test disposition. Generated Compose remains derivative; the service catalogue is the service authority.

## Dependency Boundaries

- USF-239 defines obligations and validator gates only.
- USF-248 owns fixture and seeder implementation.
- USF-242 and USF-251 own composed service and profile exercise implementation.
- USF-240 owns LCOV and Sonar coverage enforcement.
- USF-247 owns the final planted-defect regression gate after all expanded children merge.
- USF-259 owns expanded obligation manifest and validator reconciliation only.
- USF-253 through USF-258 own category implementation and proof. Their manifest presence is not completion evidence.
- USF-260 owns the final Test completion and staging-entry readiness gate after all child issues are complete or explicitly bounded.
- USF-234 owns final acceptance and may not start until all child issues are reconciled.

## Non-Claims

- test-readiness
- final-test-readiness
- staging-readiness
- production-readiness
- deployment-readiness
- live-provider-readiness
- soc-readiness
- iso27001-certification
- enterprise-production-readiness
- product-ui-readiness
- browser-e2e-readiness
- full-react-product-parity
- full-react-parity-readiness
