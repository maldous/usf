# Import, Export, and Bulk Operations Standard

Status: active for the USF-162 local/dev/test parity slice.

This standard defines import, export, bulk operation, evidence package, dry-run, preview, and reconciliation posture for USF foundation work. It is ISO 27001-supporting technical control evidence only. It does not claim ISO certification, legal export readiness, eDiscovery readiness, production migration readiness, regulatory export readiness, or production-live bulk operation readiness.

## Import/Export As Governed Data Movement

An import is controlled ingestion of external or file-backed data into USF-owned records. An export is controlled extraction of USF data into a file, package, stream, evidence bundle, or downstream transfer. A bulk operation is any multi-record create, update, delete, notify, export, import, reconcile, or transform action. An evidence package is a structured export package for investigation, audit, legal, compliance, or incident review. A dry-run validates, estimates, and previews intended effects without mutation. A preview is a deterministic summary of proposed changes or exported content. Reconciliation compares expected, imported, exported, and actual state.

Rules:

- No import/export/bulk operation without classification.
- No tenant-scoped data movement without tenant context.
- No side-effecting bulk operation without explicit idempotency.
- No high-risk bulk operation without dry-run/preview or explicit no-dry-run rationale.
- No evidence package without manifest, hashes, and audit linkage.
- No import/export bypasses PDP, files, jobs, guardrails, audit, observability, config, or provider-mode boundaries.

## Bulk Operation Classification

Allowed classifications are low-risk, tenant-data, confidential, restricted, security-sensitive, audit-sensitive, regulated, destructive, high-risk, and test-only. Unknown classification fails closed. Destructive operations require rollback, compensation, or explicit irreversible rationale. Audit-sensitive exports require stronger evidence posture. Test-only operations cannot target production-like data or live providers.

## Operation Statuses

Allowed statuses are draft, queued, validating, previewed, awaiting-approval, approved, running, succeeded, partially-succeeded, failed, cancelled, expired, rejected, quarantined, dead-lettered, and purged. Cancelled, expired, rejected, quarantined, dead-lettered, and purged operations cannot run without explicit retry or recovery policy.

## Import Source/Export Destination Governance

Allowed source and destination types are uploaded-file, generated-file, tenant-file, evidence-package, provider-source, provider-destination, system-internal, local-test, and manual-operator. Imports use file_id or source_ref and never raw object keys. Exports write to file_id or package_ref and never raw object keys. Provider sources and destinations are live-external-deferred unless separately authorised. Manual operator sources require actor identity and audit.

## File Format Safety

Supported formats are csv, json, jsonl, xlsx, zip, evidence-package, and system-internal. Unknown format fails closed. CSV and spreadsheet formula injection is blocked or escaped. Archive traversal is blocked. Archive bombs, decompression bombs, malformed encodings, unsupported formats, oversized files, and parser errors fail safely with value-redacted errors. Parser adapters beyond the local helper posture are deferred.

## Schema Versioning/Mapping

Import/export schemas record schema_id, schema_version, schema_hash, mapping_id, mapping_version, mapping_hash, source_field, target_field, field_classification, required, default_policy, coercion_policy, and unknown_field_policy where represented. Unknown fields fail closed unless extension-safe. Type coercion is explicit. Mapping changes are privileged and audited. Schema and mapping hashes are included in operation evidence.

## Validation/Preview/Dry-Run

Validation, preview, and dry-run are distinct. Validation does not mutate state. Dry-run does not mutate state. Preview is deterministic and records preview_hash. Validation errors record row_number, record_ref, field_path, safe_error_code, and safe_error_message without echoing sensitive raw values. Approval may bind to preview_hash or dry_run_hash. Execution that differs from the approved preview fails closed where represented.

## Row/Item Outcome Model

Item outcomes record item_id, row_number, source_record_hash, target_record_ref, operation, outcome, safe_error_code, safe_error_message, before_hash, after_hash, and correlation_id. Raw row payloads are not stored by default. Per-row evidence is tenant-scoped and value-redacted.

## Partial Success/Failure Thresholds

Partial success is never implicit. Policies record partial_success_allowed, max_error_count, max_error_rate, failure_threshold_policy, rollback_policy, and compensation_policy. Threshold breach stops or rejects according to policy. Partial-success audit records counts and safe summaries only.

## Rollback/Compensation Posture

Destructive operations require rollback_supported, compensation_supported, or irreversible_operation with irreversible_reason. Rollback is privileged and audited. Compensation does not bypass tenant, PDP, guardrail, audit, or observability controls. No rollback readiness claim is made without proof.

## Idempotency/Duplicate Suppression

Side-effecting operations require idempotency_key, dedupe_key, source_fingerprint, operation_fingerprint, replay_policy, idempotency_window, and duplicate_policy where represented. Retries reuse the same idempotency key. Duplicate operation submission must not duplicate side effects. Duplicate row handling is explicit. Idempotency conflicts produce safe deterministic errors.

## Tenant Isolation/RLS Backstop

Tenant A cannot import into Tenant B, export Tenant B data, inspect Tenant B operation metadata, or infer Tenant B operation existence through errors, counters, pagination, or timing-sensitive examples. Bulk operations preserve DB/RLS tenant context where persisted. Cross-tenant administrative bulk operations require explicit system scope and stronger authority.

## Authorization/SoD

Privileged actions include bulk.create, bulk.read, bulk.list, bulk.validate, bulk.preview, bulk.approve, bulk.start, bulk.cancel, bulk.retry, bulk.rollback, import.create, import.validate, import.start, export.create, export.start, export.download, audit_export.create, and evidence_package.create. Every privileged operation goes through PDP. Requesters cannot approve their own high-risk operation where approval is represented. Break-glass use is explicit and audited.

## Guardrails/Abuse Controls

Bulk operations require guardrail posture. Represent max_rows, max_file_size, max_export_size, max_operation_rate, max_concurrent_operations, max_daily_exports, tenant_bulk_quota, actor_bulk_quota, and provider_bulk_quota where applicable. Large exports emit tenant-safe security signals where represented. Audit exports require stricter guardrails. Guardrail denial is safe and non-enumerating.

## Data Minimisation/Export Scope

Exports record export_scope, field_allowlist, field_denylist, classification_filter, date_range, resource_filter, purpose, and approved_scope_hash where represented. Default export scope is narrow. Restricted or security-sensitive fields require explicit inclusion. Export purpose is recorded. Approved scope hash is evidence-linked where represented.

## Evidence Package Model

Evidence packages record evidence_package_id, package_type, package_version, manifest_hash, content_hash, source_query_hash, included_file_ids, included_audit_event_ids, created_by, created_at, legal_hold, retention_policy, and chain_of_custody_ref. Evidence packages do not include raw secrets. Evidence package creation is privileged and audited.

## Integrity/Chain Of Custody

Bulk integrity records source_checksum, output_checksum, manifest_hash, schema_hash, mapping_hash, operation_hash, verified_at, and verification_status where represented. Import checksum is verified before processing. Export checksum is recorded. Manifest hash is deterministic. Integrity mismatch fails closed and is audit/evidence-linked.

## Retention/Legal Hold/Purge

Exports and evidence packages carry retention_policy, retain_until, legal_hold, purge_allowed_at, purged_at, purged_by, and purge_reason where represented. Legal hold blocks purge. Purge is privileged and audited. Rendered/exported payload retention is minimised. Import staging files expire or are retained according to classification.

## Import Quarantine/Rejection

Quarantined, infected, or pending-scan files cannot be imported. Unsupported schemas are rejected. High-risk validation failure may quarantine the operation. Rejected imports record safe reason codes and do not mutate state.

## Privacy/Sensitive Data Posture

PII and sensitive fields are classified. Raw rows are not logged. Validation errors do not echo PII. Preview uses hashes or safe summaries where possible. Export examples use synthetic data only. Telemetry does not contain raw import/export data.

## Provider/External Transfer Posture

External import/export providers are live-external-deferred unless separately authorised. Provider credentials are SecretReferences only. Provider endpoint details are redacted. Provider transfer failures are safe. Provider transfer does not imply production readiness.

## Observability/Security Signals

Required signals include bulk.operation.started, bulk.operation.completed, bulk.operation.failed, bulk.operation.denied, bulk.large_export.created, bulk.validation.failed, bulk.quarantined, bulk.partial_success, bulk.exfiltration.suspected, evidence_package.created, and audit_export.created. Signals are tenant-safe, redacted, and do not replace audit. Live SIEM and alerting remain deferred unless authorised.

## API/OpenAPI Safety

Future bulk routes are tenant-scoped, PDP-protected, idempotent for side effects, guardrail-protected, redacted, and non-enumerating. OpenAPI examples are synthetic and contain no raw rows, object keys, recipient addresses, provider internals, tokens, credentials, tenant data, or live provider claims. Broad HTTP surfaces are deferred in USF-162.

## Deferred Depth

Deferred depth includes broad HTTP/OpenAPI route surfaces, production data migration, external provider transfer, parser adapters, decompression-bomb enforcement, transactional resumable DB appliers, rollback execution, approval workflow, purge workflow, legal/eDiscovery/regulatory export workflow, distributed bulk orchestration, and live alerting/SIEM integration.
