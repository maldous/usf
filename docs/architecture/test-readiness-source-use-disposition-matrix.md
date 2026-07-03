# Test Readiness Source-Use Disposition Matrix

This matrix records source-use treatment for the current USF-234
test-readiness target files that live outside the earlier foundation test
topology. It supports USF-252 guardrail work by making future AI and developer
test changes explicit to the source-disposition validator instead of relying on
implicit test-root permission.

Historical React artefacts are lineage only. They were not copied, imported, or
mirrored for these target files. Generated Compose remains derivative; service
catalogue rows, semantic obligations, fixture corpus, and committed validators
remain the authority for test-readiness evidence.

Linear source issue: USF-252.

Related issues: USF-234, USF-247, USF-249, USF-250, USF-251, USF-255,
USF-257, USF-260.

## Target Files

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `tests/packages/data-lifecycle/data-lifecycle-suite.test.ts` | new-with-rationale | USF-250 data lifecycle acceptance, semantic service test obligation manifest, deterministic fixture corpus, and composed service integration matrix | Adds bounded integration evidence for data lifecycle, backup, bulk, migration, retention, privacy, scanning, and service-backed non-claim boundaries. |
| `tests/packages/data-lifecycle/test-support.ts` | new-with-rationale | USF-250 synthetic fixture and lifecycle requirements | Provides issue-local deterministic test helpers for the data lifecycle suite without runtime/provider implementation authority or real tenant data. |
| `tests/packages/data-lifecycle/data-lifecycle-matrix.test.ts` | new-with-rationale | USF-250 regression acceptance and data lifecycle evidence matrix | Adds regression coverage for data lifecycle obligation mapping and non-claim preservation. |
| `tests/packages/compose-profile-orchestration.test.ts` | new-with-rationale | USF-251 every-service Compose profile acceptance, generated test Compose evidence, fixture corpus, and integration matrix | Proves every generated test Compose service/profile has independent seed, exercise, reset, teardown, and evidence mapping rather than treating generated Compose as authority. |
| `tests/packages/supply-chain-sbom-licence-gate.test.ts` | new-with-rationale | USF-255 supply-chain, SBOM, licence, dependency, and package-manager posture requirements | Adds bounded repository-level tests for dependency pinning, lockfile posture, licence/advisory evidence, SBOM/provenance/signing boundaries, Compose image pinning, and supply-chain non-claims. |
| `tests/packages/supply-chain/supply-chain-planted-defects.json` | evidence-only-support | USF-255 planted-defect coverage requirement | Records deterministic supply-chain planted defects for floating dependencies, missing lockfile, licence/advisory evidence gaps, package-manager/SBOM gaps, unsupported overclaims, floating image tags, and missing image owners. |
| `tests/packages/adversarial/adversarial-semantic-cases.json` | new-with-rationale | USF-257 adversarial formal-style semantic testing acceptance and current USF semantic authorities | Records value-free adversarial semantic cases for contradiction, ambiguity, authority inversion, generated-artifact drift, non-claim preservation, and future-AI drift checks. |
| `tests/packages/adversarial-formal-semantic-testing-suite.test.ts` | new-with-rationale | USF-257 adversarial semantic suite requirements and semantic service test obligation manifest | Adds bounded formal-style semantic tests without claiming mathematical proof, ISO/SOC readiness, or final USF-234 acceptance. |
| `tests/packages/auth/authn-authz-tenant-role-permission-unit.test.ts` | new-with-rationale | USF-249 authn/authz/tenant/role/permission acceptance, fixture corpus, and semantic obligations | Adds unit evidence for token, tenant, role, permission, and fail-closed semantics without satisfying service-backed composed claims by in-memory substitution. |
| `tests/packages/auth/authn-authz-tenant-role-permission-integration.test.ts` | new-with-rationale | USF-249 composed auth service obligation mapping and integration matrix | Adds bounded integration evidence for Keycloak/Postgres/RLS-related authn/authz/tenant/role/permission obligations using synthetic data and explicit non-claims. |
| `tests/packages/auth/authn-authz-tenant-role-permission-regression.test.ts` | new-with-rationale | USF-249 auth regression acceptance and semantic obligation matrix | Adds regression evidence for cross-tenant denial, role escalation denial, issuer/audience failure, permission boundary, and non-claim preservation. |

## Boundary Confirmation

This matrix authorises target-file source-disposition coverage for bounded
test-readiness evidence only. It does not claim final USF-234 test readiness,
staging readiness, production readiness, deployment readiness, live-provider
readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production
readiness, product UI readiness, browser E2E readiness, full React product
parity, or USF-234 closure.
