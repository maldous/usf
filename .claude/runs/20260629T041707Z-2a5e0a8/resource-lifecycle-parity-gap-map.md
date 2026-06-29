# Resource Lifecycle Parity Gap Map

Count: 8

## react.resource.package-lifecycle-metadata

- Category: 
- Status/Relevance: covered
- Summary: 
- Target: docs/architecture/react-parity-scope-classification-matrix.json and existing source-use validation; resource slice records lifecycle concepts but does not copy package metadata runtime.
- Source use: 
- Paths: none
- Notes: Historical package lifecycle is evidence for lifecycle governance terminology, not a resource runtime model.

## react.resource.import-boundary-relationship-rules

- Category: 
- Status/Relevance: covered
- Summary: 
- Target: resource relationship standard and validator rows; existing provider/API validators already enforce capability/provider boundaries.
- Source use: 
- Paths: none
- Notes: Rewritten as resource relationship and referential integrity posture, not path mirroring.

## react.resource.identity-records-and-membership-state

- Category: 
- Status/Relevance: covered
- Summary: 
- Target: capabilities/auth, capabilities/tenant, DB/RLS, PDP proof; resource slice adds generalized governed-record semantics.
- Source use: 
- Paths: none
- Notes: Identity semantics already migrated; resource lifecycle must interoperate without redefining identity authority.

## react.resource.api-mutation-and-graphql-state

- Category: 
- Status/Relevance: covered
- Summary: 
- Target: API/contracts proof plus new resource mutation service tests for schema-bound mutation and conflict handling.
- Source use: 
- Paths: none
- Notes: No React route paths copied; behaviours become capability and proof tests.

## react.resource.persistence-and-lifecycle-records

- Category: 
- Status/Relevance: migrated
- Summary: 
- Target: resource lifecycle core model, service, proof, tests, standard, and validator.
- Source use: 
- Paths: none
- Notes: Implemented by the resource lifecycle core model, in-memory store, PDP-protected service, proof, tests, standard, source-use, and validator.

## react.resource.file-and-search-derived-records

- Category: 
- Status/Relevance: covered
- Summary: 
- Target: files and search slices plus resource interaction proof for search/import/export safety.
- Source use: 
- Paths: none
- Notes: Resource slice proves it does not leak object keys and hides deleted resources from search/export posture.

## react.resource.bulk-data-movement-records

- Category: 
- Status/Relevance: covered
- Summary: 
- Target: bulk slice plus resource lifecycle import/export interaction proof.
- Source use: 
- Paths: none
- Notes: No production data migration readiness claim.

## react.resource-ui-playwright-behaviour-lineage

- Category: 
- Status/Relevance: covered
- Summary: 
- Target: resource capability/proof tests; no UI and no Playwright introduced.
- Source use: 
- Paths: none
- Notes: UI behaviour is classified and rewritten as foundation tests where relevant.
