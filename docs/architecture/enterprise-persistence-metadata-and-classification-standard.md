# Enterprise Persistence Metadata and Classification Standard

| | |
|---|---|
| Document type | Architecture / persistence governance standard (normative) |
| Status | Draft / parity-db (USF-138) implementation standard |
| Authority level | Reviewable governance standard; subordinate to the Charter, Authority Model, accepted ADRs (notably ADR 0010), validator rules, and runtime proof evidence |
| Follows | `docs/architecture/charter.md`, `docs/architecture/authority-model.md`, `docs/adr/0010-authorization-policy-decision-point.md` |
| Machine authority | `docs/architecture/persistent-object-classification-registry.json` (enforced by `tools/validate-parity/validate-db.py`) |
| Issue scope | USF-138 (parity-db) under USF-133 |
| Repository state | The repository already contains the authorised local dev/test bootstrap runtime. This standard governs persisted-row metadata; it introduces a forward-only migration and validator, no UI and no live/production database claim. |

> **Normative language.** **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** carry BCP 14 / RFC 2119 intent.

> **Compliance framing.** This standard defines technical control evidence that **supports** an ISO/IEC 27001-style information security management posture (access control, accountability, traceability, retention, integrity). It is **not** an ISO/IEC 27001 certification claim, and it does not assert any audit outcome.

## 1. Purpose

Define a mandatory classification and metadata-field standard for every persisted database object in the USF foundation, so persisted rows carry the accountability, traceability, lifecycle, integrity, and retention metadata an enterprise platform and its future UI require. The standard is enforced by a validator and proven against a composed Postgres substrate. USF's own self-defined source lineage informed which behaviours existed; USF defines the final standard cleanly and does not omit a mature field merely because earlier source lineage lacked it.

## 2. Persistent object classification (mandatory)

Every persistent table/object MUST be classified as exactly one of:

- `tenant-scoped` — per-tenant business records.
- `global-reference` — shared reference data, not tenant-partitioned.
- `system-internal` — platform-internal operational state.
- `cross-tenant-aggregate` — aggregates spanning tenants (no raw tenant-row exposure).
- `audit-evidence` — audit/evidence records.
- `migration-control-plane` — schema/migration control records.
- `append-only-ledger` — append-only records (audit/event ledgers).
- `ephemeral-runtime-state` — short-lived runtime state with explicit expiry.

An unclassified persistent object **MUST** fail validation. Classifications are recorded in `persistent-object-classification-registry.json`.

## 3. Canonical field vocabulary and the `updated_*` / `modified_*` decision

`updated_at` / `updated_by` are the **canonical** mutable-row fields: they change on **any** persisted row update. `modified_at` / `modified_by` / `modified_reason` are **reserved** for business-significant content/state modification and are **OPTIONAL**; a table uses them only when business-significant modification needs separate tracking from mechanical metadata updates. This slice uses `updated_*` as the canonical set; `modified_*` is documented here and not required.

## 4. Lifecycle semantics (normative)

- `created_at` — set once at insert; **immutable** thereafter.
- `created_by` — set once at insert; **immutable** thereafter.
- `updated_at` — changes on **every** mutable update.
- `version` — integer; **increments** on every mutable update; starts at 1.
- `deleted_at` — soft-deletion marker where soft delete is supported; soft-deleted rows remain tenant-isolated.
- `restored_at` — restoration after soft deletion.
- `row_hash` — covers the canonical auditable row content where applicable.

A hard-delete-only table **MUST** document why and **MUST** require audit/evidence records for deletion. Soft-deleted tenant-scoped rows remain subject to RLS.

## 5. Actor and identity metadata

Distinguish a stable internal actor id from external identity claims:

- `created_by` / `updated_by` / `deleted_by` — stable internal actor id (or a concrete service actor id for system jobs).
- `*_by_subject` — the external identity subject claim (e.g. IdP `sub`).
- `*_by_provider` — the identity provider that asserted the subject.

Actor metadata **MUST** be derived from authenticated identity or an authorised system-job context. System jobs **MUST** use a concrete service actor identity. Break-glass actions **MUST** record both requester and approver. There is **no anonymous mutation** of tenant-scoped business records. Final authorization remains the USF PDP (ADR 0010); the database is the isolation backstop, not the authorization system.

## 6. Trace and correlation

- `correlation_id` — groups all work caused by one user/business operation.
- `causation_id` — the immediate command/event/message that caused this row change.
- `trace_id` — distributed-tracing identifier.
- `request_id` — HTTP/API request-boundary identifier where applicable.
- `source_system` — the system/provider that originated the change.
- `source_event_id` — the external/internal event/message id that triggered the change.

Mutation-capable records and all audit/evidence records **MUST** support traceability and **MUST** carry `correlation_id`/`causation_id` where available.

## 7. Retention, privacy, classification

- `data_classification` ∈ { `public`, `internal`, `confidential`, `restricted`, `security-sensitive` }.
- `retention_policy` ∈ { `standard`, `audit`, `security`, `legal`, `transient`, `custom` }.
- `legal_hold` — boolean; when true it **MUST** prevent destructive purge.

Audit/evidence records use `audit`/`security` retention. Tenant data destruction **MUST** respect retention and legal hold. This slice defines and proves the **metadata model and guardrails**; it does not implement full customer-data retention workflows.

## 8. Class-specific required field sets (enforced)

The validator enforces, per class, the **required** field sets below (recommended fields are encouraged but not enforced). Field sets are also encoded in `persistent-object-classification-registry.json` and `tools/validate-parity/validate-db.py`; the two MUST agree.

- **tenant-scoped** — required: `tenant_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `version`, `correlation_id`, `data_classification`, `retention_policy`. MUST have `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` (unless a documented exception), a tenant RLS policy keyed on `app_tenant_id()`, and fail closed when tenant context is missing. SHOULD also carry `deleted_at`/`deleted_by`/`deleted_reason`, `restored_at`/`restored_by`, `row_hash`, `trace_id`, `request_id`, `source_system`, `source_event_id`, `legal_hold`.
- **global-reference** — required: `created_at`, `updated_at`, `version`, `data_classification`, `retention_policy`. MAY omit `tenant_id`. If human/admin-mutable, includes actor fields.
- **system-internal** — required: lifecycle fields appropriate to mutation (`created_at`, `updated_at`); if tenant-impacting, scope/tenant boundary fields.
- **cross-tenant-aggregate** — required: `aggregate_scope`, `aggregation_window`, `created_at`, `source_system`, `data_classification`, `retention_policy`. MUST NOT expose raw tenant rows without authorisation.
- **audit-evidence** / **append-only-ledger** — required: `id`, `occurred_at`, `recorded_at`, `tenant_id` (or scope classification), `actor_id` (or system actor), `action`, `subject_type`, `subject_id`, `outcome`, `correlation_id`, `causation_id`, `trace_id`, `source_system`, `data_classification`, `retention_policy`, `row_hash`. SHOULD carry `previous_hash` where chain integrity is implemented. Append-only by default; no silent update or delete; corrections are compensating records; legal hold respected.
- **migration-control-plane** — required: `migration_id`, `checksum`, `applied_at`, `applied_by`, `tool_version`, `status`. MAY omit tenant/actor lifecycle fields. MUST support migration order/checksum verification.
- **ephemeral-runtime-state** — required: `created_at`, `expires_at`, and `owner_scope` or `tenant_scope` where applicable. MUST be explicitly justified.

## 9. Integrity guardrails (proven)

The migration enforces, and the live proof demonstrates, the following on the composed Postgres substrate:

- `created_at`/`created_by` immutability via a `BEFORE UPDATE` trigger on mutable tenant-scoped tables.
- `updated_at` refresh and `version` increment via the same trigger.
- `row_hash` computed from canonical row content; append-only ledger chains `previous_hash` to the prior row's `row_hash` per tenant.
- `legal_hold = true` blocks destructive purge via a `BEFORE DELETE` trigger.
- append-only ledgers grant only `SELECT, INSERT` to the application role (no `UPDATE`/`DELETE` privilege).
- the application DB role is not superuser, does not hold `BYPASSRLS`, and does not own tenant-scoped tables.

## 10. Exceptions

A documented exception (recorded in the classification registry `exceptions` field with a rationale) MAY relax a `FORCE ROW LEVEL SECURITY` or field requirement for a specific object. The validator honours only registry-recorded exceptions. No exception may disable tenant RLS on a tenant-scoped table or weaken append-only semantics on a ledger.

## 12. Database RLS and execution-environment controls

These controls are normative for the foundation database. Items marked **(enforced/proven now)** are implemented, validated, and proven by catalog evidence in this slice; items marked **(tracked)** are mandated here and tracked as parity-db sub-blockers or belong to the domain that introduces the relevant tables.

### 12.1 Real-app-role RLS and role separation (enforced/proven now)

- RLS **MUST** be proven under the **actual runtime application role**, never as a table owner, migration owner, superuser, or test-convenience role.
- Two roles **MUST** exist and be separate: a **migration/DDL owner** role (`migration_owner`) that applies migrations and owns objects, and an **application runtime** role (`foundation_runtime`) that only executes application queries.
- The application role **MUST NOT** be superuser, **MUST NOT** hold `BYPASSRLS`, **MUST NOT** own tenant-scoped tables, **MUST NOT** run DDL, **MUST NOT** `SET ROLE` into an elevated role, and **MUST NOT** disable RLS or bypass policies via direct SQL.
- Catalog checks **MUST** assert this against `pg_roles`, `pg_class`, `pg_policies`, and `information_schema`.

### 12.2 SECURITY DEFINER, functions, views, triggers (enforced/proven now)

- `SECURITY DEFINER` is **forbidden** unless explicitly justified in the classification registry. Trigger/helper functions are `SECURITY INVOKER` so RLS applies to the caller.
- A justified `SECURITY DEFINER` function **MUST** set a safe `search_path` and **MUST NOT** expose cross-tenant rows.
- Views over tenant-scoped tables **SHOULD** be `security_barrier` or otherwise proven safe. Triggers **MUST NOT** write cross-tenant data without explicit classification.

### 12.3 Execution-environment lockdown (enforced/proven now)

- The application role **MUST** have a fixed safe `search_path` and **MUST NOT** be able to create functions/extensions in trusted schemas (`CREATE` revoked on `public`).
- Extensions **MUST** be explicitly listed and justified (this slice introduces none beyond the in-core `sha256`).

### 12.4 Migration integrity (enforced/proven now)

- Migrations are SQL-first, forward-only, ordered, and checksummed; the `schema_migrations` control plane records `migration_id`, `checksum`, `applied_at`, `applied_by`, `tool_version`, `status`; a manifest pins per-file SHA-256 for order/immutability/tamper detection.

### 12.5 Tenant integrity, indexing, and time (enforced/proven now)

- Tenant-scoped tables **MUST** index `tenant_id`; common active-row paths **SHOULD** use partial indexes for non-deleted rows; uniqueness **SHOULD** include `tenant_id` unless globally unique by design.
- All timestamps are `timestamptz` (UTC); audit/evidence timestamps are not stored in local time; `created_at` is immutable.

### 12.6 Deletion, purge, retention, concurrency (enforced/proven now)

- Soft delete (`deleted_at`) ≠ purge. Soft-deleted rows remain tenant-isolated. Purge is blocked by `legal_hold`. Append-only ledgers are not silently updated or deleted. `version` increments on every mutable update (optimistic-concurrency basis).

### 12.7 Controls mandated and tracked (tracked)

The following are normative for the foundation and tracked as parity-db sub-blockers or delegated to the domain that introduces the relevant tables; that domain **MUST** comply with this standard:

- Tenant-scoped foreign-key/composite-key/unique-key boundary enforcement across additional tables, with cross-tenant-link rejection tests.
- EXPLAIN-based / catalog-based index-friendliness and performance evidence for critical tenant-scoped query paths.
- Connection-pooling depth: explicit-transaction enforcement at the adapter layer, nested-transaction/savepoint context retention, and PgBouncer/transaction-pooling assumptions and proofs (documented; a JS runtime adapter is required first).
- Operational tables — outbox/inbox/idempotency, workflow/job, scheduled-job, notification, file metadata, provider sync cursors — **MUST** be classified (tenant-scoped, system-internal, cross-tenant-aggregate, audit-evidence, or another approved class) and RLS-scoped when introduced by parity-jobs / parity-notify / parity-files / observability.
- Cross-tenant aggregate tables (none exist yet) **MUST** carry `aggregate_scope`/`aggregation_window`/source classification and prove non-leakage before introduction.
- Backup/restore/export paths **MUST** respect tenant scope; restore tests **MUST NOT** bypass tenant constraints; anonymisation/scrubbing requirements apply if real data is ever introduced (not in this slice).
- Optimistic-concurrency conflict behaviour (stale-update rejection, idempotency for retries, duplicate command/event protection) at the adapter layer.
- Opaque vs sequential identifier decision and cross-tenant enumeration review; `source_event_id` global-uniqueness decision.
- JSONB/document-field classification: sensitive nested fields classified; tenant references not hidden only inside JSON; JSON does not bypass source-use/retention/audit/access rules (current JSONB: `audit_ledger.metadata`, classified `security-sensitive` with the row).

## 11. ISO 27001-supporting control evidence (framing)

The metadata model provides technical control evidence supporting common controls: access control and tenant isolation (RLS + PDP), accountability and non-repudiation (actor + append-only audit + hash), traceability (correlation/causation/trace), integrity (row_hash, immutability triggers, migration checksums), and retention/legal-hold handling. This is supporting evidence only; it is not a certification, audit result, or compliance guarantee.
