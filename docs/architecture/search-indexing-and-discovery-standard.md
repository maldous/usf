# Search, Indexing, and Discovery Standard

This standard defines tenant-safe search and indexing for the USF search/indexing parity slice under USF-133 and USF-164. It is ISO 27001-supporting technical control evidence only. It does not claim ISO certification, live search provider readiness, live vector database readiness, AI/RAG readiness, public search API readiness, production readiness, or production-live readiness.

## Search As Controlled Discovery Surface

Search is a controlled discovery surface, not a source of authority. A source of truth remains the authoritative domain record behind DB/RLS, PDP, file controls, audit, jobs, providers, guardrails, and API contracts.

Required concepts are:

- Source of truth: authoritative domain record or file metadata.
- Index document: classified, tenant-scoped, redacted projection used for discovery.
- Search result: safe projection derived from an index document after tenant and authority checks.
- Facet: aggregation over authorised search results only.
- Count: result count over authorised search results only.
- Autocomplete suggestion: privacy-sensitive query aid, disabled by default unless explicitly authorised.
- Reindex: tenant-scoped job that rebuilds safe projections.
- Stale index: index state that may no longer match source authority.

Rules:

- No search result is authoritative by itself.
- Index documents must be classified before storage.
- Tenant-scoped index documents require tenant context.
- Unknown classifications fail closed.
- Unknown resource types fail closed.
- Stale results fail closed or require source-of-truth revalidation.
- Counts, facets, cursors, ranking, errors, and timings must not leak cross-tenant existence.

## Searchable Resource Classification

Every searchable resource is classified as exactly one of:

- public
- tenant-data
- confidential
- restricted
- security-sensitive
- audit-sensitive
- regulated
- file-derived
- identity-derived
- configuration-derived
- notification-derived
- job-derived
- provider-derived
- system-internal
- test-only

Restricted, security-sensitive, audit-sensitive, regulated, and file-derived resources require stronger redaction and revalidation posture.

## Index Document Governance

Every index document records:

- index_document_id
- resource_type
- resource_id
- tenant_id
- classification
- source_ref
- source_version
- source_hash
- schema_version
- index_version
- indexed_fields
- redacted_fields
- searchable_fields
- sortable_fields
- filterable_fields
- facetable_fields
- created_at
- updated_at
- indexed_at
- expires_at
- stale_at
- deleted_at
- purged_at
- legal_hold
- retention_policy

Index documents store safe projections only. They must not contain provider credentials, tokens, cookies, raw object keys, raw recipient addresses, raw provider responses, raw stack traces, vectors, embeddings, or AI retrieval context.

## Source-Of-Truth Revalidation

Supported revalidation policies are:

- safe-projection-only
- source-revalidated
- hybrid

Safe-projection-only is allowed only when the index contains fields that are already safe to show to the authorised tenant member. Source-revalidated and hybrid results require PDP/resource revalidation before exposure. Stale source-revalidated results fail closed.

## Query Safety

Query text is bounded by length and term count. Raw query strings are not audit-recorded unless a future classified policy explicitly authorises it. Regex, raw query-language operators, leading wildcards, and broad scraping-style operators are denied by default.

## Filtering, Sorting, Facets, And Counts

Filters, sorts, and facets are allow-listed per query contract. Unknown filter, sort, or facet fields fail closed. Counts and facets are computed only over authorised tenant-scoped results and must not include cross-tenant or denied resources.

## Pagination/Cursor Safety

Cursors are opaque, tenant-scoped, query-scoped, limit-scoped, expiring, and integrity-checked. Cursor tampering and cross-tenant cursor reuse fail closed.

## Autocomplete/Typeahead Safety

Autocomplete/typeahead is disabled by default in this slice. Any future autocomplete surface must be tenant-scoped, PDP-protected where required, minimum-length guarded, redacted, guardrail-protected, and non-enumerating.

## Ranking/Relevance Posture

Ranking may use safe projected fields only. Restricted/security-sensitive fields must not be used for ranking unless a future explicit classified policy allows it. Score details are internal and are not an authority decision.

## Field Visibility/Snippets

Response field visibility uses public, internal, confidential, restricted, and security-sensitive classifications. Restricted and security-sensitive fields are redacted from default results. Snippets inherit the highest classification of their source fields and are suppressed for restricted or security-sensitive resources by default.

## File-Derived/Extracted Content

File-derived content inherits file classification. Quarantined, infected, pending-scan, blocked, deleted, purged, or failed file sources are not indexed. Object keys never appear in index documents, search results, audit, telemetry, API examples, tests, or proofs. OCR/extracted text providers are deferred.

## Vector/Embedding/AI/RAG Posture

Vector search, embeddings, semantic retrieval, AI/RAG providers, crawlers, and live external indexing providers are represented as deferred provider classes only. This slice does not implement or claim AI/RAG readiness.

## Index Lifecycle

Lifecycle states are:

- draft
- building
- active
- stale
- degraded
- disabled
- rebuilding
- failed
- retired
- purged

Disabled, failed, retired, purged, deleted, and stale results fail closed for ordinary search exposure.

## Reindex Jobs

Reindex runs as a tenant-scoped operational job using a concrete search-indexing service actor. Reindex is idempotent, guardrail-aware, audited, and value-free. Bulk reindex posture is represented but distributed/live indexing is deferred.

## Search Provider Posture

The implemented provider posture is in-memory local/dev/test only. Full-text external search, autocomplete provider, vector search, live external search, and public search API readiness remain deferred without live readiness claims. Provider credentials are SecretReferences only if a future provider requires credentials.

## Data Residency/Index Location

In-memory search indexes are local/dev/test only. External index residency, region restrictions, egress allowlists, and cross-region transfer controls are defined as future provider posture and deferred until explicit authority exists.

## Retention/Deletion/Purge/Legal Hold

Index retention is classification-aware. Deleted and purged resources are hidden or removed. Legal hold preserves source records where represented but does not allow broader search exposure. Purge and reindex lifecycle changes are privileged and audited where represented.

## Saved Searches/Query History

Saved searches and query history are privacy-sensitive and deferred. Query hashes may appear in audit/telemetry; raw query text is not stored by default.

## Search Audit/Audit-Of-Access

Required audit events where represented:

- search.query.executed
- search.query.denied
- search.result.access_denied
- search.index.updated
- search.index.deleted
- search.reindex.started
- search.reindex.completed
- search.reindex.failed
- search.provider.denied
- search.autocomplete.denied

Audit records are value-free and do not store raw query text, raw rows, raw snippets, object keys, provider payloads, secrets, tokens, or credentials.

## Observability/Abuse Signals

Required tenant-safe signals where represented:

- search.query.denied
- search.high_volume_query
- search.pagination_scraping.suspected
- search.tenant_enumeration.suspected
- search.reindex.failed
- search.stale_result.denied
- search.quarantined_source.denied

Signals do not replace audit and do not claim live SIEM or alerting readiness.

## Guardrails/Exfiltration Controls

Search queries, autocomplete/typeahead, high-volume query, pagination, and bulk reindex require guardrail posture. Enumeration, scraping, high-volume query, and cross-tenant cursor attempts emit safe denials or security signals where represented.

## API/OpenAPI Safety

Search API surfaces are future UI/API readiness posture in this slice. Any future route must be tenant-scoped, PDP-protected where required, guardrail-aware, OpenAPI-covered, redacted, cursor-safe, and use synthetic examples. No examples may contain raw query payloads, object keys, recipient addresses, provider internals, tenant data, secrets, tokens, credentials, vectors, embeddings, or AI/RAG context.

## Deferred Search/Indexing Depth

Deferred depth includes persistent DB-backed search indexes, source-of-truth DB revalidation beyond capability proofs, live full-text providers, vector/embedding providers, OCR/extraction providers, autocomplete HTTP surfaces, saved-search persistence, distributed reindexing, live external provider egress controls, public search API contracts, and AI/RAG readiness.
