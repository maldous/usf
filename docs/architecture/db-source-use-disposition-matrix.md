# DB Source-Use Disposition Matrix

| | |
|---|---|
| Document type | Architecture / source-use governance matrix |
| Status | Draft / DB slice (USF-138) implementation coverage |
| Authority level | Reviewable implementation coverage; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the implementation directive |
| Issue scope | USF-138 under USF-133 |
| Source row basis | `docs/architecture/enterprise-persistence-metadata-and-classification-standard.md`, `docs/architecture/persistent-object-classification-registry.json`, ADR 0010, and USF's own self-defined DB/RLS/migration/audit source lineage |
| Repository state | USF authors its own runtime; no external runtime/application code is copied and no external source path is mirrored; no UI; no live/production database claim |

## Treatment Rules

Every implementation target file added by the DB slice is listed here with a treatment and rationale. `source-derived-rewrite` means the behaviour was authored against USF semantics with USF's own self-defined source lineage as evidence (no copy, no path mirroring). `new-with-rationale` means USF-defined with no source antecedent. `evidence-only-support` means a test/proof artefact.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `adapters/db/migrations/0002-enterprise-persistence-metadata.sql` | source-derived-rewrite | Historical react lifecycle/audit/RLS evidence; enterprise persistence standard | Forward-only migration adding classification-driven lifecycle, actor, trace, integrity, and retention metadata, the migration-control-plane table, and integrity guardrail triggers. |
| `adapters/db/migrations/0004-enterprise-db-proof-depth.sql` | new-with-rationale | USF-139 enterprise DB proof-depth acceptance and validator evidence | Forward-only migration adding the explicit tenant foreign-key guardrail for break-glass grants without editing committed migrations. |
| `adapters/db/migrations/manifest.json` | new-with-rationale | Migration order/checksum/immutability requirement | Ordered, per-file SHA-256 manifest pinning migration immutability and order. |
| `docs/architecture/db-enterprise-controls-proof-depth-matrix.json` | evidence-only-support | USF-139 closure and reclassification gate | Machine-readable mapping of implemented, bounded, and reclassified enterprise DB controls, evidence, follow-ups, validation commands, and non-claims. |
| `packages/proof/src/db-rls-isolation-proof.ts` | evidence-only-support | RLS and enterprise persistence proof requirement | Composed-Postgres data-isolation proof executed under the real application role with migration-owner separation, tenant-key/index checks, transaction rollback proof, JSON classification proof, identifier review, and catalog evidence. |
| `tests/adapters/migration-manifest.test.ts` | evidence-only-support | Migration immutability/order and generated-type freshness requirement | Hermetic tests for manifest order/checksum/immutability and generated-type freshness. |
| `tests/adapters/persistence-metadata.test.ts` | evidence-only-support | Enterprise persistence metadata and classification standard | Hermetic tests asserting classification coverage, required metadata columns, and integrity triggers in the migrations. |

## Non-goals

USF authors its own runtime; no external runtime/application code is copied and no external source path is mirrored. No UI/UX. No Playwright. No staging/production/deployment/live-external-provider/production-live claim. No backup readiness, restore readiness, disaster recovery readiness, SOC readiness, ISO certification, full dev readiness, full product readiness, or USF-133 closure claim. No real customer/tenant data; fixtures are deterministic synthetic only.
