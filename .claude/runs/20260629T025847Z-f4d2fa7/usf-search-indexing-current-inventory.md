# Current USF Search/Indexing Inventory

## usf-no-current-search-capability

- Category: missing
- Status: missing
- Behaviour: No current dedicated search capability, port, adapter, proof, or tests exist in USF before this slice.
- Paths: none
- Notes: Implementation needed.

## usf-db-rls-foundation

- Category: covered
- Status: covered
- Behaviour: DB/RLS foundation and tenant context are already implemented; search persistent index storage is deferred.
- Paths: adapters/db/migrations/0001-bootstrap.sql, adapters/db/migrations/0002-enterprise-persistence-metadata.sql
- Notes: Use tenant context and avoid new DB migration in this slice.

## usf-pdp-capability-pattern

- Category: covered
- Status: covered
- Behaviour: Capabilities use PolicyDecisionPoint and tenant context rather than identity claims alone.
- Paths: packages/ports/src/index.ts, capabilities/tenant/src/pdp.ts, capabilities/bulk/src/index.ts
- Notes: Search service should call PDP for query, read, index, delete, reindex, facet, autocomplete.

## usf-audit-evidence-foundation

- Category: covered
- Status: covered
- Behaviour: Audit event model supports value-free tenant-scoped evidence and metadata.
- Paths: capabilities/audit/src/index.ts, packages/core/src/index.ts
- Notes: Add search event types to core taxonomy and emit via AuditRecorder.

## usf-jobs-reindex-foundation

- Category: covered
- Status: covered
- Behaviour: Operational job port and service actor model are available for tenant-scoped reindex work.
- Paths: capabilities/jobs/src/index.ts, adapters/wf/src/index.ts, packages/ports/src/index.ts
- Notes: Search reindex should submit a tenant-scoped operational job.

## usf-files-derived-content-foundation

- Category: partial
- Status: partial
- Behaviour: File metadata includes classification, scan/quarantine, legal hold, retention, and object-key-safe views.
- Paths: capabilities/files/src/index.ts, adapters/store/src/index.ts
- Notes: Search should refuse quarantined/pending/infected/deleted/purged file-derived documents; live extraction/OCR deferred.

## usf-observability-signals-foundation

- Category: covered
- Status: covered
- Behaviour: Telemetry supports tenant-safe security signals and redaction.
- Paths: adapters/obs/src/index.ts, packages/core/src/index.ts
- Notes: Use for search query denied, stale result denied, high-volume/pagination scraping posture.

## usf-guardrails-foundation

- Category: covered
- Status: covered
- Behaviour: Guardrail policies/evaluation provide local/dev/test fail-closed quota and rate limit decisions.
- Paths: adapters/guardrails/src/index.ts, packages/core/src/index.ts
- Notes: Use for query and reindex guardrail posture.

## usf-provider-registry-search-entry

- Category: partial
- Status: partial
- Behaviour: Provider registry already contains search provider category entry; new search slice should make posture explicit.
- Paths: packages/core/src/index.ts, docs/architecture/provider-adapters-and-modes-standard.md
- Notes: Need validate no live search/vector/AI claim.

## usf-api-contracts-foundation

- Category: covered
- Status: covered
- Behaviour: API/contracts standard exists; broad search HTTP route can be deferred while capability contracts are defined.
- Paths: packages/contracts/src/index.ts, packages/openapi/src/index.ts, docs/architecture/api-and-contract-surface-standard.md
- Notes: Update posture docs and possibly contracts if low-risk.
