# Search/Indexing Source-Use Disposition Matrix

This matrix records source-use disposition for the search/indexing/discovery slice under USF-133 and USF-164. USF's own self-defined source lineage is retained as behaviour evidence only. USF authors its own runtime; no external runtime/application code is copied and no external source path is mirrored.

| USF artefact | Kind | Source-use disposition | Source lineage | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `docs/architecture/search-indexing-and-discovery-standard.md` | standard | rewrite-from-behaviour | USF source lineage: search-repository port, search use case, follow-up | implemented | Defines controlled discovery semantics and deferred live provider posture. |
| `packages/core/src/index.ts` search model | runtime model | rewrite-from-behaviour | USF source lineage: search ports/usecase/tests/proofs | implemented | Adds classifications, lifecycle, source revalidation, safe projection, query validation, and cursor integrity. |
| `packages/ports/src/index.ts` `SearchIndexPort` | port | rewrite-from-behaviour | USF source lineage: search-repository port | implemented | Capability depends on port, not provider SDKs. |
| `adapters/search/src/index.ts` | adapter | rewrite-from-behaviour | USF source lineage: fake test repository and Postgres FTS behaviour | implemented | In-memory local/dev/test index; no live search provider claim. |
| `capabilities/search/src/index.ts` | service | rewrite-from-behaviour | USF source lineage: search usecase and route proof behaviour | implemented | PDP, guardrail, audit, telemetry, file, and job integration. |
| `tests/capabilities/search-indexing.test.ts` | test | rewrite-from-behaviour | USF source lineage: unit/proof behaviours plus follow-up controls | implemented | Proves tenant isolation, counts/facets/cursors, redaction, file-derived gating, stale denial, guardrails, reindex. |
| `packages/proof/src/search-indexing-proof.ts` | proof | rewrite-from-behaviour | `proof:search`, `proof:search-isolation`, `proof:search-routes` | implemented | Hermetic proof, not live Postgres/search readiness. |
| `packages/proof/src/meilisearch-composed-proof.ts` | proof | new-with-rationale | USF-199 bounded local Compose proof requirement; no React runtime/application code copied | bounded-profile-gated-proof | Proves SDK-backed local Meilisearch service semantics for synthetic adapter-level indexing, tenant-filtered query, async task visibility, update/reindex, deletion, cleanup, readiness retry, and redaction. API/worker runtime binding and readiness remain unclaimed. |
| `tools/validate-parity/validate-search.py` | validator | rewrite-from-behaviour | USF source lineage: proof registry and validator patterns | implemented | Static checks and planted defects. |
| `docs/architecture/functional-scope-classification-matrix.json` search rows | matrix | rewrite-from-behaviour | USF source lineage: search source and proof inventory | implemented | Domain-authorised rows reference USF-164. |
| Future `/v1/search` API routes | API surface | lineage-only | USF source lineage: `POST /api/org/search`, admin readiness/reindex routes | deferred | HTTP surface is defined as posture, not implemented in this slice. |
| Persistent DB-backed search index | persistence | lineage-only | USF source lineage: Postgres `search_documents` migration/RLS proof | deferred | DB/RLS foundation exists; persistent search index depth remains open under USF-164 deferred notes. |
| Live full-text, autocomplete, vector, embedding, AI/RAG providers | provider | lineage-only | USF source lineage: Meilisearch/Typesense/OpenSearch notes | deferred | Provider classes are represented/deferred; no live readiness claim. |

Runtime files in this slice have source-use disposition `rewrite-from-behaviour`. They are USF-native implementations aligned to current USF semantics, not copied React code.
