# React Resource Lifecycle Inventory

Count: 8

## react.resource.package-lifecycle-metadata

- Category: lifecycle
- Status/Relevance: covered
- Summary: Historical package metadata and generated reports classify package lifecycle stages and enforce generated-output ownership.
- Target: docs/architecture/react-parity-scope-classification-matrix.json and existing source-use validation; resource slice records lifecycle concepts but does not copy package metadata runtime.
- Source use: lineage-only
- Paths: ../react/packages/contracts-ingestion/package.json, ../react/tools/architecture/validate-pipeline-composition/package.json, ../react/tools/architecture/generate-lifecycle-reports/package.json, ../react/packages/tooling-docker/package.json, ../react/tools/architecture/generate-lifecycle-reports/tests/fixtures/valid/docs/schemas/package-json-architecture.schema.json, ../react/packages/tooling-ci/package.json, ../react/tools/architecture/generate-lifecycle-reports/tests/fixtures/valid/packages/maintenance-domain/package.json, ../react/tools/architecture/generate-lifecycle-reports/tests/fixtures/valid/packages/external-adapter/package.json
- Notes: Historical package lifecycle is evidence for lifecycle governance terminology, not a resource runtime model.

## react.resource.import-boundary-relationship-rules

- Category: relationship
- Status/Relevance: covered
- Summary: Historical architecture rules express package ownership, dependency relationships, domain boundaries, and forbidden adapter/framework imports.
- Target: resource relationship standard and validator rows; existing provider/API validators already enforce capability/provider boundaries.
- Source use: rewrite-from-behaviour
- Paths: ../react/docs/architecture/import-boundary-rules.json, ../react/docs/architecture/import-boundary-rules.md, ../react/docs/evidence/architecture/package-metadata-vocabulary-validation.md, ../react/docs/v2-foundation/shards/inventory-11.json, ../react/tools/architecture/validate-source-imports/src/index.mjs, ../react/docs/adr/0011-define-architecture-tooling-execution-model.md, ../react/docs/evidence/lifecycle/adr-act-0288-c1-deprecation.md, ../react/docs/adr/ACTION-REGISTER.md
- Notes: Rewritten as resource relationship and referential integrity posture, not path mirroring.

## react.resource.identity-records-and-membership-state

- Category: record
- Status/Relevance: covered
- Summary: Historical identity and membership behaviours rely on stable records, status changes, and tenant-scoped membership state.
- Target: capabilities/auth, capabilities/tenant, DB/RLS, PDP proof; resource slice adds generalized governed-record semantics.
- Source use: rewrite-from-behaviour
- Paths: ../react/e2e/external/tenant-prod.spec.ts, ../react/docker/caddy/Caddyfile, ../react/e2e/prod/api-contract.test.ts, ../react/e2e/prod/security-headers.test.ts, ../react/e2e/identity/broker-login.spec.ts, ../react/e2e/identity/global-setup.ts, ../react/packages/adapters-redis/package.json, ../react/packages/audit-events/tests/audit-events.test.ts
- Notes: Identity semantics already migrated; resource lifecycle must interoperate without redefining identity authority.

## react.resource.api-mutation-and-graphql-state

- Category: mutation
- Status/Relevance: covered
- Summary: Historical API and GraphQL routes include mutation posture, tenant context, request ids, and route-level authorization concerns.
- Target: API/contracts proof plus new resource mutation service tests for schema-bound mutation and conflict handling.
- Source use: rewrite-from-behaviour
- Paths: ../react/compose.yaml, ../react/e2e/ui-contract.json, ../react/docker/caddy/Caddyfile, ../react/tools/architecture/generate-lifecycle-reports/tests/fixtures/valid/packages/stable-contract/package.json, ../react/e2e/prod/admin-tools.test.ts, ../react/docker/grafana/dashboards/platform-api-red-method.json, ../react/packages/graphql-browser-client/package.json, ../react/packages/graphql-browser-client/tests/client.test.ts
- Notes: No React route paths copied; behaviours become capability and proof tests.

## react.resource.persistence-and-lifecycle-records

- Category: lifecycle
- Status/Relevance: must-migrate
- Summary: Historical persistence posture includes schema-per-tenant/RLS lineage, generated schema evidence, stateful records, and lifecycle/retention vocabulary.
- Target: resource lifecycle core model, service, proof, tests, standard, and validator.
- Source use: rewrite-from-behaviour
- Paths: ../react/compose.yaml, ../react/config/environments/dev.json, ../react/README.md, ../react/renovate.json, ../react/config/environments/staging.json, ../react/config/environments/prod.json, ../react/config/environments/test.json, ../react/config/environments/shared.json
- Notes: This slice provides the missing generic resource lifecycle and relationship foundation.

## react.resource.file-and-search-derived-records

- Category: relationship
- Status/Relevance: covered
- Summary: Historical file/search behaviours imply derived-resource relationships, redacted results, indexing lifecycle, and object-key secrecy.
- Target: files and search slices plus resource interaction proof for search/import/export safety.
- Source use: rewrite-from-behaviour
- Paths: ../react/Tiltfile, ../react/make/quality.mk, ../react/compose.yaml, ../react/README.md, ../react/make/compose.mk, ../react/make/e2e.mk, ../react/tools/architecture/validate-compose-ports/src/index.mjs, ../react/tools/architecture/validate-pipeline-composition/package.json
- Notes: Resource slice proves it does not leak object keys and hides deleted resources from search/export posture.

## react.resource.bulk-data-movement-records

- Category: mutation
- Status/Relevance: covered
- Summary: Historical bulk/import/export lineage implies high-volume resource mutation, validation, idempotency, preview, and evidence posture.
- Target: bulk slice plus resource lifecycle import/export interaction proof.
- Source use: rewrite-from-behaviour
- Paths: ../react/make/quality.mk, ../react/make/tools.mk, ../react/e2e/ui-contract.json, ../react/packages/contracts-ingestion/tests/contracts-ingestion.test.ts, ../react/docker/entrypoint-api.sh, ../react/packages/contracts-ingestion/src/index.ts, ../react/docker/keycloak/themes/platform/login/resources/css/brand-6.css, ../react/docker/caddy/Caddyfile
- Notes: No production data migration readiness claim.

## react.resource-ui-playwright-behaviour-lineage

- Category: resource-test
- Status/Relevance: covered
- Summary: Historical UI and browser tests may exercise resource mutation and state transition behaviours indirectly.
- Target: resource capability/proof tests; no UI and no Playwright introduced.
- Source use: lineage-only
- Paths: ../react/make/e2e.mk, ../react/e2e/ui-contract.json, ../react/make/test.mk, ../react/env/stage-policy.yaml, ../react/e2e/external/caddy-links.spec.ts, ../react/e2e/external/auth-negative.spec.ts, ../react/e2e/external/tool-services.spec.ts, ../react/e2e/external/smoke.test.ts
- Notes: UI behaviour is classified and rewritten as foundation tests where relevant.
