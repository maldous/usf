# Bootstrap Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Architecture / source-use governance matrix |
| **Status** | Draft / USF-39 post-start implementation coverage |
| **Authority level** | Reviewable implementation coverage; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the signed implementation directive |
| **Issue scope** | USF-39 |
| **Source row basis** | `docs/architecture/bootstrap-readiness-governance.md`, `docs/architecture/implementation-extraction-directive.md`, `docs/architecture/target-implementation-topology-plan.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, React evidence paths cited in ADR 0009 |

This matrix records the target-file treatment for the local dev/test bootstrap implementation files created after the separate USF-39 start action. It does not authorise direct runtime import from `../react`, does not mirror React paths, does not claim staging, production, live-external-provider, deployment, or production-live readiness, and does not promote schemas.

## Treatment Rules

- `source-derived-adapt`: freshly authored implementation informed by cited historical behaviour or provider inventory. No source code or configuration is copied.
- `source-derived-rewrite`: freshly authored implementation that rewrites semantic intent from lineage. No source code or configuration is copied.
- `new-with-rationale`: freshly authored file required by the USF local dev/test bootstrap, with no direct source row driving implementation.
- `evidence-only-support`: non-runtime validation, proof, test, or configuration support. It cannot import runtime code from evidence-only rows.

## Workspace and Verification Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `package.json` | new-with-rationale | Bootstrap governance runtime/toolchain decision | Root workspace scripts and pinned tool dependencies for local verification. |
| `pnpm-workspace.yaml` | new-with-rationale | Bootstrap governance pnpm workspace decision | Workspace package discovery. |
| `tsconfig.base.json` | new-with-rationale | Bootstrap governance strict TypeScript decision | Shared strict TypeScript options and local path aliases. |
| `tsconfig.json` | new-with-rationale | Bootstrap governance strict TypeScript decision | Root typecheck entrypoint. |
| `eslint.config.js` | new-with-rationale | Bootstrap governance lint gate decision | Local lint gate. |
| `vitest.config.ts` | new-with-rationale | Bootstrap governance test gate decision | Local unit/proof test runner configuration. |
| `Makefile` | new-with-rationale | Bootstrap governance Make orchestration decision | Single local verification command. |
| `compose.yaml` | source-derived-adapt | ADR 0009 React Compose lineage and bootstrap provider targets | Freshly authored Compose substrate inventory for local test providers. |

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `apps/api/package.json` | new-with-rationale | Fastify API edge decision | Workspace metadata for the API process. |
| `apps/api/src/main.ts` | new-with-rationale | Fastify API edge decision | Local API process entrypoint. |
| `apps/api/src/runtime.ts` | new-with-rationale | Dev in-memory provider boundary required by USF-39 continuation | Local dev runtime assembly using in-memory providers only. |
| `apps/api/src/server.ts` | source-derived-adapt | Authentication slice rows 16, 18, 21, 25, 26, 27 | Fresh Fastify routes for health, login, and tenant-context checks. |
| `apps/work/package.json` | new-with-rationale | System job bootstrap requirement | Workspace metadata for worker process. |
| `apps/work/src/main.ts` | new-with-rationale | USF-39 continuation worker-dev target requirement | Minimal runnable worker dev entrypoint, exposed separately from API dev. |
| `apps/work/src/worker.ts` | new-with-rationale | Tenant-by-tenant system job requirement | Minimal worker smoke entrypoint. |
| `capabilities/audit/package.json` | new-with-rationale | Audit/evidence capability target | Workspace metadata for audit capability. |
| `capabilities/audit/src/index.ts` | source-derived-adapt | Authentication slice row 23 | Fresh append-only tenant-scoped audit ledger. |
| `capabilities/auth/package.json` | new-with-rationale | Authentication capability target | Workspace metadata for authentication capability. |
| `capabilities/auth/src/index.ts` | source-derived-adapt | Authentication slice rows 22, 24, 25, 26, 27 | Fresh login service using identity claims and audit events. |
| `capabilities/config/package.json` | new-with-rationale | Provider configuration target | Workspace metadata for provider configuration capability. |
| `capabilities/config/src/index.ts` | source-derived-adapt | ADR 0009 provider target inventory | Dev/test provider separation and required Compose providers. |
| `capabilities/files/package.json` | new-with-rationale | Object storage capability target | Workspace metadata for file capability. |
| `capabilities/files/src/index.ts` | new-with-rationale | Object-storage semantic target | Tenant-scoped object store capability wrapper. |
| `capabilities/jobs/package.json` | new-with-rationale | Workflow/job capability target | Workspace metadata for job capability. |
| `capabilities/jobs/src/index.ts` | new-with-rationale | Tenant-by-tenant system job requirement | Tenant-scoped workflow scheduling wrapper. |
| `capabilities/notify/package.json` | new-with-rationale | Notification capability target | Workspace metadata for notification capability. |
| `capabilities/notify/src/index.ts` | new-with-rationale | Notification semantic target | Tenant-scoped mail notification wrapper. |
| `capabilities/tenant/package.json` | new-with-rationale | Tenant isolation capability target | Workspace metadata for tenant capability. |
| `capabilities/tenant/src/index.ts` | source-derived-adapt | Tenant and break-glass governance requirements; authentication slice rows 14, 22 | Tenant context enforcement and two-person break-glass model. |
| `adapters/bus/package.json` | new-with-rationale | Event bus provider target | Workspace metadata for bus adapter. |
| `adapters/bus/src/index.ts` | new-with-rationale | Dev in-memory bus provider target | In-memory event bus for hermetic dev tests. |
| `adapters/db/package.json` | new-with-rationale | Postgres/Kysely adapter target | Workspace metadata for database adapter. |
| `adapters/db/migrations/0001-bootstrap.sql` | source-derived-rewrite | Authentication slice rows 9, 10, 11, 12, 13; RLS governance rules | Fresh SQL-first local baseline with tenant RLS and break-glass tables. |
| `adapters/db/src/check-generated-types.ts` | new-with-rationale | Generated DB type freshness requirement | Hash check for deterministic generated DB types. |
| `adapters/db/src/generated-types.ts` | new-with-rationale | Kysely generated-type requirement | Deterministic generated database type surface for the baseline migration. |
| `adapters/db/src/index.ts` | source-derived-adapt | Authentication slice rows 14, 116 | Tenant-scoped repository and RLS session guard. |
| `adapters/idp/package.json` | new-with-rationale | IDP adapter target | Workspace metadata for identity provider adapter. |
| `adapters/idp/src/index.ts` | source-derived-adapt | Authentication slice rows 15, 20, 24, 28, 152, 154, 157 | In-memory dev IDP plus Keycloak test provider descriptor. |
| `adapters/mail/package.json` | new-with-rationale | Mail provider target | Workspace metadata for mail adapter. |
| `adapters/mail/src/index.ts` | new-with-rationale | Dev in-memory notification target | Captured mail provider for hermetic tests. |
| `adapters/obs/package.json` | new-with-rationale | Observability adapter target | Workspace metadata for observability adapter. |
| `adapters/obs/config/loki.yaml` | new-with-rationale | Test Compose observability target | Minimal local Loki configuration. |
| `adapters/obs/config/otel-collector.yaml` | source-derived-adapt | React Compose OTel lineage | Fresh OTel collector configuration. |
| `adapters/obs/config/prometheus.yaml` | new-with-rationale | Test Compose observability target | Minimal Prometheus scrape configuration. |
| `adapters/obs/config/tempo.yaml` | new-with-rationale | Test Compose observability target | Minimal Tempo local storage configuration. |
| `adapters/obs/src/index.ts` | source-derived-adapt | Authentication slice row 19 | Captured local observability sink. |
| `adapters/secrets/package.json` | new-with-rationale | Secrets provider target | Workspace metadata for secrets adapter. |
| `adapters/secrets/src/index.ts` | new-with-rationale | Dev in-memory secrets/config target | Tenant-scoped in-memory secret store. |
| `adapters/store/package.json` | new-with-rationale | Object storage provider target | Workspace metadata for object store adapter. |
| `adapters/store/src/index.ts` | new-with-rationale | Dev in-memory object-storage target | Tenant-prefixed in-memory object store. |
| `adapters/wf/package.json` | new-with-rationale | Workflow provider target | Workspace metadata for workflow adapter. |
| `adapters/wf/src/index.ts` | new-with-rationale | Dev in-memory workflow provider target | Tenant-scoped in-memory workflow scheduler. |
| `packages/contracts/package.json` | new-with-rationale | Contract package target | Workspace metadata for JSON-schema contracts. |
| `packages/contracts/src/index.ts` | source-derived-adapt | Authentication slice row 124 | TypeBox JSON Schema contract definitions. |
| `packages/core/package.json` | new-with-rationale | Shared core package target | Workspace metadata for core primitives. |
| `packages/core/src/index.ts` | new-with-rationale | Tenant, provider, audit, and proof vocabulary requirements | Shared final-state primitives. |
| `packages/openapi/openapi.json` | new-with-rationale | Committed OpenAPI contract requirement | OpenAPI contract committed for API drift checks. |
| `packages/openapi/package.json` | new-with-rationale | OpenAPI package target | Workspace metadata for OpenAPI package. |
| `packages/openapi/src/check.ts` | new-with-rationale | OpenAPI drift hard-gate requirement | OpenAPI contract drift checker. |
| `packages/openapi/src/index.ts` | new-with-rationale | OpenAPI drift hard-gate requirement | Generated OpenAPI document source. |
| `packages/ports/package.json` | new-with-rationale | Port package target | Workspace metadata for port interfaces. |
| `packages/ports/src/index.ts` | new-with-rationale | Hexagonal boundary requirement | Provider and repository port interfaces. |
| `packages/proof/package.json` | new-with-rationale | Proof package target | Workspace metadata for proof package. |
| `packages/proof/src/bootstrap-proof.ts` | source-derived-rewrite | Authentication slice rows 2 through 8 | Fresh hermetic proof command for local bootstrap behaviour. |
| `packages/proof/src/dev-smoke.ts` | new-with-rationale | USF-39 continuation local dev entrypoint proof requirement | Controlled foreground dev runner, readiness probe, tenant mismatch check, and clean teardown. |
| `packages/proof/src/index.ts` | new-with-rationale | Proof package target | Public proof package export. |
| `packages/source/package.json` | new-with-rationale | Source-use machinery target | Workspace metadata for source-use package. |
| `packages/source/src/index.ts` | new-with-rationale | Source-use policy requirement | Runtime-readable source-use policy constants. |
| `packages/test/package.json` | new-with-rationale | Test helper package target | Workspace metadata for test helpers. |
| `packages/test/src/index.ts` | new-with-rationale | Hermetic test runtime requirement | In-memory runtime assembly for tests and proof. |
| `tests/adapters/db-rls.test.ts` | evidence-only-support | RLS governance requirements | Test for RLS and tenant-context fail-closed posture. |
| `tests/adapters/provider-substrate.test.ts` | evidence-only-support | ADR 0009 provider targets | Test provider separation and non-floating Compose images. |
| `tests/apps/api.test.ts` | evidence-only-support | Interface and workflow contracts | API route smoke and tenant mismatch tests. |
| `tests/capabilities/audit.test.ts` | evidence-only-support | Audit event contract | Append-only tenant-scoped audit test. |
| `tests/capabilities/break-glass.test.ts` | evidence-only-support | Break-glass governance requirements | Two-person JIT and tenant-scoped grant tests. |
| `tests/capabilities/tenant-isolation.test.ts` | evidence-only-support | Tenant isolation governance requirements | Tenant context and mismatch tests. |
| `tests/packages/openapi.test.ts` | evidence-only-support | OpenAPI drift hard-gate requirement | Test committed OpenAPI contract freshness. |
| `tests/packages/proof.test.ts` | evidence-only-support | Proof command requirement | Test hermetic bootstrap proof result. |

## Boundary Confirmation

No file in this matrix is copied from `../react`; no target path mirrors a historical source path; no evidence-only row produces runtime code; and no generated report is treated as semantic authority or proof evidence.
