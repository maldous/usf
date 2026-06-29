# React Search/Indexing Inventory

## react-search-port-index-query

- Category: index
- Relevance: must-migrate
- Source use: rewrite-from-behaviour
- USF target: packages/ports SearchIndexPort/SearchQueryPort and adapters/search InMemorySearchIndex
- Behaviour: Bounded SearchIndexPort and SearchQueryPort separate write/lifecycle from read/query. Documents are tenant scoped, permission aware, and provider adapters stay behind ports.
- Paths: ../react/apps/platform-api/src/ports/search-repository.ts
- Tests: ../react/apps/platform-api/tests/unit/search.test.ts
- Proofs: ../react/apps/platform-api/scripts/search-runtime-proof.ts, ../react/apps/platform-api/scripts/search-isolation-runtime-proof.ts
- Notes: React used Postgres FTS as built-in local substrate; USF search slice should use local/in-memory provider only and defer live external search.

## react-search-usecase-secret-and-query-safety

- Category: query
- Relevance: must-migrate
- Source use: rewrite-from-behaviour
- USF target: packages/core search document validation and safe result view tests
- Behaviour: Search rejects empty query and documents with secret-looking metadata keys; results omit body and secret metadata.
- Paths: ../react/apps/platform-api/src/usecases/search.ts
- Tests: ../react/apps/platform-api/tests/unit/search.test.ts
- Proofs: ../react/apps/platform-api/scripts/search-runtime-proof.ts
- Notes: Extended by follow-up requirements to reject object keys, recipient addresses, raw provider payloads, and restricted fields by default.

## react-search-tenant-isolation-permission-filter

- Category: search-test
- Relevance: must-migrate
- Source use: rewrite-from-behaviour
- USF target: capabilities/search tenant/PDP checks and adapters/search tenant-scoped query
- Behaviour: Tenant A and Tenant B with same title only see their own documents; permission gated documents are hidden without required permission.
- Paths: ../react/apps/platform-api/src/adapters/postgres-search-repository.ts, ../react/apps/platform-api/scripts/search-isolation-runtime-proof.ts
- Tests: ../react/apps/platform-api/tests/unit/search.test.ts
- Proofs: ../react/apps/platform-api/scripts/search-isolation-runtime-proof.ts
- Notes: USF must also prove counts, facets, cursors, and rankings do not leak cross-tenant existence.

## react-search-routes-contracts

- Category: api-test
- Relevance: partial
- Source use: rewrite-from-behaviour
- USF target: docs/architecture/search-indexing-and-discovery-standard.md API posture; future route surface deferred unless existing API authority is extended
- Behaviour: POST /api/org/search is tenant scoped and requires tenant.search.read; admin readiness/reindex require platform.search.read/write; schemas constrain q, documentType, page, and limit.
- Paths: ../react/apps/platform-api/src/server/routes.ts, ../react/packages/contracts-admin/src/index.ts
- Tests: none
- Proofs: ../react/apps/platform-api/scripts/search-routes-runtime-proof.ts
- Notes: Current authorised USF slice may define API/OpenAPI posture without exposing broad HTTP routes.

## react-search-reindex-readiness-audit

- Category: reindex
- Relevance: must-migrate
- Source use: rewrite-from-behaviour
- USF target: capabilities/search reindex service with jobs/audit/telemetry and provider-mode-safe readiness status
- Behaviour: Operator reindex is audited and returns document count; readiness is truthful, degraded when empty, blocked if store unreachable.
- Paths: ../react/apps/platform-api/src/usecases/search.ts, ../react/apps/platform-api/src/server/routes.ts, ../react/packages/audit-events/src/index.ts
- Tests: ../react/apps/platform-api/tests/unit/search.test.ts
- Proofs: ../react/apps/platform-api/scripts/search-runtime-proof.ts, ../react/apps/platform-api/scripts/search-routes-runtime-proof.ts
- Notes: USF should use tenant-scoped jobs with concrete service actors and avoid live readiness claims.

## react-search-postgres-rls-substrate

- Category: full-text
- Relevance: covered
- Source use: lineage-only
- USF target: In-memory search adapter plus DB/RLS backstop deferred under DB depth; no new DB migration in this slice
- Behaviour: Postgres search_documents table uses tenant RLS, tsvector, optional permission_key, plainto_tsquery, rank order, limit/page, and no secret columns by design.
- Paths: ../react/apps/platform-api/src/db/migrations/026-search-documents.sql, ../react/apps/platform-api/src/adapters/postgres-search-repository.ts
- Tests: none
- Proofs: ../react/apps/platform-api/scripts/search-runtime-proof.ts, ../react/apps/platform-api/scripts/search-isolation-runtime-proof.ts
- Notes: USF already has DB/RLS slice; this search slice proves local in-memory semantics and defers persistent index storage.

## react-search-admin-ui-lineage

- Category: search-test
- Relevance: covered
- Source use: lineage-only
- USF target: foundation tests prove PDP/search semantics; no UI implementation
- Behaviour: React admin search route is permission-gated; server remains authoritative for search and reindex controls.
- Paths: ../react/apps/react-enterprise-app/src/routes/admin/search.tsx
- Tests: none
- Proofs: ../react/apps/platform-api/scripts/search-routes-runtime-proof.ts
- Notes: No UI/Playwright behaviour should disappear silently; rewritten as capability/API proof posture.

## react-search-provider-future-meilisearch

- Category: provider
- Relevance: deferred
- Source use: lineage-only
- USF target: provider registry entry and standard live-external-deferred posture for full-text/vector/external search
- Behaviour: Meilisearch/Typesense/OpenSearch appear as future or composed provider posture, not as foundation live provider requirement.
- Paths: ../react/docs/architecture/build-versus-compose-decision-framework.md, ../react/docs/architecture/environment-service-classification.md, ../react/apps/platform-api/src/adapters/postgres-search-repository.ts
- Tests: none
- Proofs: ../react/docs/v2-foundation/usf-audit/proof-evidence/_collection-report.json
- Notes: No live search provider, vector database, AI/RAG, or public search readiness claim.

## react-search-proof-registry

- Category: proof
- Relevance: must-migrate
- Source use: rewrite-from-behaviour
- USF target: packages/proof search-indexing-proof and make search-proof
- Behaviour: React registers search proofs for runtime, tenant isolation, and route guard coverage.
- Paths: ../react/packages/contracts-admin/src/proof-registry.ts, ../react/package.json
- Tests: ../react/apps/platform-api/tests/unit/search.test.ts
- Proofs: proof:search, proof:search-isolation, proof:search-routes
- Notes: Proof must be hermetic/local dev/test only and include follow-up leak scans.
