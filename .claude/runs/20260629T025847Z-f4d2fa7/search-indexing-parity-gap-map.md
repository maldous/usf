# Search/Indexing Parity Gap Map

Counts: covered=2, deferred=2, missing=4, partial=1

## react-search-port-index-query

- Classification: missing
- USF target: packages/ports SearchIndexPort/SearchQueryPort and adapters/search InMemorySearchIndex
- Linear issue: USF-164
- Notes: React used Postgres FTS as built-in local substrate; USF search slice should use local/in-memory provider only and defer live external search.

## react-search-usecase-secret-and-query-safety

- Classification: missing
- USF target: packages/core search document validation and safe result view tests
- Linear issue: USF-164
- Notes: Extended by follow-up requirements to reject object keys, recipient addresses, raw provider payloads, and restricted fields by default.

## react-search-tenant-isolation-permission-filter

- Classification: missing
- USF target: capabilities/search tenant/PDP checks and adapters/search tenant-scoped query
- Linear issue: USF-164
- Notes: USF must also prove counts, facets, cursors, and rankings do not leak cross-tenant existence.

## react-search-routes-contracts

- Classification: deferred
- USF target: docs/architecture/search-indexing-and-discovery-standard.md API posture; future route surface deferred unless existing API authority is extended
- Linear issue: USF-164
- Notes: Current authorised USF slice may define API/OpenAPI posture without exposing broad HTTP routes.

## react-search-reindex-readiness-audit

- Classification: partial
- USF target: capabilities/search reindex service with jobs/audit/telemetry and provider-mode-safe readiness status
- Linear issue: USF-164
- Notes: USF should use tenant-scoped jobs with concrete service actors and avoid live readiness claims.

## react-search-postgres-rls-substrate

- Classification: covered
- USF target: In-memory search adapter plus DB/RLS backstop deferred under DB depth; no new DB migration in this slice
- Linear issue: USF-164
- Notes: USF already has DB/RLS slice; this search slice proves local in-memory semantics and defers persistent index storage.

## react-search-admin-ui-lineage

- Classification: covered
- USF target: foundation tests prove PDP/search semantics; no UI implementation
- Linear issue: USF-164
- Notes: No UI/Playwright behaviour should disappear silently; rewritten as capability/API proof posture.

## react-search-provider-future-meilisearch

- Classification: deferred
- USF target: provider registry entry and standard live-external-deferred posture for full-text/vector/external search
- Linear issue: USF-164
- Notes: No live search provider, vector database, AI/RAG, or public search readiness claim.

## react-search-proof-registry

- Classification: missing
- USF target: packages/proof search-indexing-proof and make search-proof
- Linear issue: USF-164
- Notes: Proof must be hermetic/local dev/test only and include follow-up leak scans.
