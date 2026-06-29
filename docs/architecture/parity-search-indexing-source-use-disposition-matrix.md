# Parity Search/Indexing Source-Use Disposition Matrix

This matrix records source-use disposition for the search/indexing/discovery parity slice under USF-133 and USF-164. The sibling repository `../react` is historical lineage and behaviour evidence only. No React runtime/application code is copied and no React paths are mirrored.

| USF artefact | Kind | Source-use disposition | React lineage | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `docs/architecture/search-indexing-and-discovery-standard.md` | standard | rewrite-from-behaviour | `../react/apps/platform-api/src/ports/search-repository.ts`, `../react/apps/platform-api/src/usecases/search.ts`, `follow-up.txt` | migrated | Defines controlled discovery semantics and deferred live provider posture. |
| `packages/core/src/index.ts` search model | runtime model | rewrite-from-behaviour | React search ports/usecase/tests/proofs | migrated | Adds classifications, lifecycle, source revalidation, safe projection, query validation, and cursor integrity. |
| `packages/ports/src/index.ts` `SearchIndexPort` | port | rewrite-from-behaviour | `../react/apps/platform-api/src/ports/search-repository.ts` | migrated | Capability depends on port, not provider SDKs. |
| `adapters/search/src/index.ts` | adapter | rewrite-from-behaviour | React fake test repository and Postgres FTS behaviour | migrated | In-memory local/dev/test index; no live search provider claim. |
| `capabilities/search/src/index.ts` | service | rewrite-from-behaviour | React search usecase and route proof behaviour | migrated | PDP, guardrail, audit, telemetry, file, and job integration. |
| `tests/capabilities/search-indexing.test.ts` | test | rewrite-from-behaviour | React unit/proof behaviours plus follow-up controls | migrated | Proves tenant isolation, counts/facets/cursors, redaction, file-derived gating, stale denial, guardrails, reindex. |
| `packages/proof/src/search-indexing-proof.ts` | proof | rewrite-from-behaviour | `proof:search`, `proof:search-isolation`, `proof:search-routes` | migrated | Hermetic proof, not live Postgres/search readiness. |
| `tools/validate-parity/validate-search.py` | validator | rewrite-from-behaviour | React proof registry and parity validator patterns | migrated | Static parity checks and planted defects. |
| `docs/architecture/react-parity-scope-classification-matrix.json` search rows | matrix | rewrite-from-behaviour | React search source and proof inventory | migrated | Domain-authorised rows reference USF-164. |
| Future `/v1/search` API routes | API surface | lineage-only | React `POST /api/org/search`, admin readiness/reindex routes | deferred | HTTP surface is defined as posture, not implemented in this slice. |
| Persistent DB-backed search index | persistence | lineage-only | React Postgres `search_documents` migration/RLS proof | deferred | DB/RLS foundation exists; persistent search index depth remains open under USF-164 deferred notes. |
| Live full-text, autocomplete, vector, embedding, AI/RAG providers | provider | lineage-only | React Meilisearch/Typesense/OpenSearch notes | deferred | Provider classes are represented/deferred; no live readiness claim. |

Runtime files in this slice have source-use disposition `rewrite-from-behaviour`. They are USF-native implementations aligned to current USF semantics, not copied React code.
