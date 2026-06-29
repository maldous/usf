# USF Resource Lifecycle Current Inventory

Count: 5

## usf.persistence-metadata-lifecycle

- Category: lifecycle
- Status/Relevance: covered
- Summary: Enterprise persistence metadata, version fields, lifecycle trigger, RLS, legal hold, and append-only audit substrate already exist.
- Target: 
- Source use: 
- Paths: ./adapters/db/migrations/0002-enterprise-persistence-metadata.sql, ./packages/proof/src/db-rls-isolation-proof.ts, ./spec/taxonomies/taxonomy-catalog.json, ./docs/architecture/persistent-object-classification-registry.json, ./docs/architecture/parity-db-source-use-disposition-matrix.md, ./spec/schemas/data-migration.schema.json, ./docs/architecture/notifications-and-messaging-standard.md, ./docs/architecture/ontology.md
- Notes: 

## usf.files-lifecycle

- Category: lifecycle
- Status/Relevance: covered
- Summary: Files provide soft delete, restore, purge, scan/quarantine, object-key safety, retention, and legal-hold proof.
- Target: 
- Source use: 
- Paths: ./packages/proof/src/files-storage-proof.ts, ./capabilities/files/src/file-service.ts, ./docs/architecture/react-parity-scope-classification-matrix.md, ./docs/architecture/parity-files-storage-source-use-disposition-matrix.md, ./tests/capabilities/files-storage.test.ts, ./docs/architecture/react-parity-scope-classification-matrix.json
- Notes: 

## usf.bulk-resource-mutation-posture

- Category: mutation
- Status/Relevance: covered
- Summary: Bulk operations provide controlled data movement, idempotency, validation, preview, guardrail, evidence package, and job execution posture.
- Target: 
- Source use: 
- Paths: ./adapters/bulk/package.json, ./adapters/bulk/src/index.ts, ./followup.txt, ./packages/proof/src/import-export-bulk-proof.ts, ./tools/validate-parity/validate-bulk.py, ./capabilities/bulk/package.json, ./capabilities/bulk/src/index.ts, ./docs/architecture/import-export-and-bulk-operations-standard.md
- Notes: 

## usf.search-derived-resource-posture

- Category: relationship
- Status/Relevance: covered
- Summary: Search indexes safe projections, source references, stale handling, tenant-safe counts/facets/cursors, and file-derived posture.
- Target: 
- Source use: 
- Paths: ./packages/proof/src/search-indexing-proof.ts, ./apps/api/src/server.ts, ./packages/proof/src/import-export-bulk-proof.ts, ./capabilities/tenant/src/pdp.ts, ./capabilities/notify/src/index.ts, ./docs/architecture/parity-search-indexing-source-use-disposition-matrix.md, ./docs/architecture/search-indexing-and-discovery-standard.md, ./docs/architecture/bootstrap-source-use-disposition-matrix.md
- Notes: 

## usf.resource-lifecycle-dedicated-capability

- Category: resource
- Status/Relevance: missing
- Summary: No dedicated generic resource lifecycle, relationship graph, schema-bound mutation, and lifecycle transition capability exists before this slice.
- Target: 
- Source use: 
- Paths: none
- Notes: 
