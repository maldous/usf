# Current USF Import/Export/Bulk Inventory

Before this slice, USF had no dedicated import/export/bulk capability. It had the required substrates: tenant/PDP, audit/evidence, files/storage, jobs/workflows, guardrails, observability, providers, config/secrets, API/contracts, and DB/RLS posture.

Implemented in this slice:

- Core semantic model for bulk operations, classifications, statuses, source/destination refs, formats, validation errors, row/item outcomes, evidence-package manifests, hashes, retention, legal hold, idempotency, and audit events.
- ImportExportPort and in-memory adapter.
- Bulk capability service enforcing tenant scope, PDP, guardrails, file scan/quarantine, job-backed execution, audit, telemetry, idempotency, preview/approval hash safety, and redacted safe views.
- Capability tests and proof command.
- Standard, source-use matrix, parity rows, and validator with planted defects.

Deferred:

- Broad HTTP/OpenAPI bulk route surface.
- Durable DB-backed bulk operation store and transactional resumable import applier.
- Production migration, legal/regulatory/eDiscovery export, external provider transfer, parser/decompression engines, rollback execution, and purge workflow.
