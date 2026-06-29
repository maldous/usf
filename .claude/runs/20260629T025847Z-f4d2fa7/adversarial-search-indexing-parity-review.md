# Adversarial Search/Indexing Parity Review

Run: 20260629T025847Z-f4d2fa7
Issue: USF-164
Domain: parity-search-indexing-discovery

## Review Answers

Did we inventory all React search/indexing behaviour?
Yes. React route, port, use case, adapter, migration, tests, runtime proofs, contracts, and UI lineage were inventoried under this run.

Did we migrate all authorised behaviours?
Yes for the authorised local/dev/test foundation slice. Tenant-scoped in-memory indexing, query validation, allow-listed filters/sorts/facets, cursor safety, result redaction, file-derived gates, stale result denial, reindex job posture, PDP, guardrails, audit, telemetry, provider mode posture, and proof validators are migrated or proven.

Did any React tests/proofs disappear silently?
No. React search runtime proofs and UI/API behaviours are mapped into foundation tests, proof, source-use, and parity matrix rows. UI/Playwright behaviour is classified as rewritten into foundation tests, with no UI implemented.

Is every gap classified?
Yes. Matrix rows classify migrated, partial, deferred, and UI-rewritten behaviour. Live search provider, vector/embedding/AI/RAG, and broad HTTP search surfaces remain deferred or partial rather than overclaimed.

Are search results tenant-scoped?
Yes. Tests and proof show Tenant A cannot search Tenant B documents.

Are counts/facets/cursors tenant-safe?
Yes. Counts and facets are tenant-local, facet values are hashed, and cursors are opaque, tenant-bound, query-bound, and rejected cross-tenant.

Are search routes/actions PDP-protected where required?
Yes. Capability actions search.query, search.read, search.index, search.reindex, and search.delete are PDP-guarded. Broad HTTP surfaces are not added in this slice.

Are restricted fields redacted?
Yes. Restricted fields are absent from safe search results, audit, and proof output.

Are object keys absent?
Yes. Runtime/test/proof coverage asserts object-key absence from index/results/API/audit/error/test/proof output for this slice.

Are stale index results safe?
Yes. Stale results are denied after source-of-truth revalidation posture and do not return results, facets, or cursors.

Are quarantined/deleted resources excluded?
Yes. Quarantined/pending/infected file-derived content fails closed; deleted/purged resources are hidden.

Are reindex jobs tenant-scoped?
Yes. Reindex uses a tenant-scoped operational automation job with a concrete search-indexing service actor and idempotency key.

Is provider mode truthful?
Yes. Search provider status is in-memory/local-dev-test and explicitly does not claim live search, vector database, AI/RAG, public API, or production readiness.

Are guardrails represented?
Yes. Search query and reindex paths support guardrail policy evaluation, safe denial, and security telemetry.

Is audit value-free?
Yes. Audit records contain IDs, hashes, safe reason codes, counts, and correlations, not raw query payloads, restricted fields, object keys, provider internals, secrets, or raw tenant data.

Are observability signals tenant-safe?
Yes. Security signals use tenant context, safe summaries, reason codes, query hashes, and no raw payloads.

Is source-use honest?
Yes. Domain source-use and bootstrap source-use matrices classify every new runtime/proof/test/validator file as source-derived rewrite or new-with-rationale, with React as lineage only.

Does make parity pass?
Yes. Final validation log shows make parity passed, including validate-search all.

Does make verify pass?
Yes. Final validation log shows make verify passed.

Any live search/vector/AI/public API/production readiness overclaim?
No. Proof, standard, source-use, parity matrix, and validator checks preserve local/dev/test scope and explicit live-provider/vector/AI/public API/production non-claims.

## Blocking Findings

None.

## Residual Deferred Depth

Live external search providers, vector/embedding/AI/RAG providers, autocomplete implementation, broad HTTP search APIs, saved query persistence, source extraction/OCR pipelines, distributed indexing, and production/public readiness remain deferred or partial as tracked in the matrix and issue scope.
