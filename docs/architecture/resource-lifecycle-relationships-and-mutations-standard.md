# Resource Lifecycle, Relationships, and Mutations Standard

|                |                                                                                   |
| -------------- | --------------------------------------------------------------------------------- |
| Document type  | Architecture / parity domain standard                                             |
| Status         | Draft / local-dev-test parity foundation                                          |
| Linear carrier | USF-165                                                                           |
| Authority      | Subordinate to the Charter, Authority Model, ADRs, validators, and proof evidence |

This standard defines resource lifecycle, relationship graph, and schema-bound mutation posture for the USF foundation. It is ISO 27001-supporting technical control evidence only. It does not claim ISO certification, legal record-management readiness, regulatory record-management readiness, eDiscovery readiness, production data-governance readiness, or production-live readiness.

## Resources As Governed Records

A resource is a governed USF record or aggregate root exposed through a capability. A record is its persisted or durable representation. An entity is a domain object that may be represented by one or more records. A relationship is a typed link between resources. A mutation is a controlled change to a resource or relationship. A lifecycle is the governed state path for a resource. A version is the concurrency token for optimistic mutation. A revision is a stable evidence point for a specific version and content hash. A state transition is a mutation that changes lifecycle status.

No resource exists without classification. No tenant-scoped resource exists without tenant context. No mutation exists without actor or service actor identity. No relationship exists without tenant-safe integrity checks. No destructive action bypasses PDP, audit, guardrails, retention, legal hold, and lifecycle policy.

## Resource Classification

Allowed classifications are public, tenant-data, confidential, restricted, security-sensitive, audit-sensitive, regulated, file-backed, search-indexed, bulk-managed, identity-derived, configuration-derived, provider-derived, system-internal, and test-only.

Unknown classifications fail closed. Restricted, security-sensitive, audit-sensitive, regulated, identity-derived, configuration-derived, and provider-derived records require stronger field visibility, audit, and retention posture. Test-only records must not target production-like data or live providers.

## Resource Ownership/Stewardship

Every resource type records resource_type, owning_capability, data_owner, technical_owner, classification, tenant_scope, retention_owner, lifecycle_owner, schema_owner, last_reviewed_at, and review_expires_at where represented.

Ownership is reviewable metadata, not a bypass. Expired review emits a control signal where represented and does not silently disable mandatory protections.

## Lifecycle State Machine Governance

Allowed lifecycle statuses are draft, active, suspended, archived, soft-deleted, pending-delete, purge-eligible, purged, locked, held, merged, superseded, rejected, and expired.

Lifecycle status is distinct from workflow status, job status, file scan status, search index lifecycle, and provider health. Unknown status fails closed. Invalid transitions fail closed. Purged resources cannot be mutated. Locked resources can only be unlocked or handled by explicit privileged posture. Legal hold blocks purge.

## Separation Of Duties/Approval Posture

Lifecycle transitions define from_status, to_status, allowed_actions, required_permission, guard_condition, approval_required, requester_cannot_approve, break_glass_allowed, audit_required, side_effects, and resulting_status. High-risk transitions require approval or an explicit no-approval rationale. Requesters cannot approve their own high-risk transition where approval is represented.

## Relationship Graph Integrity

Relationship types are owns, belongs-to, references, depends-on, contains, derived-from, created-by, assigned-to, linked-to, and supersedes. Relationships record relationship_id, relationship_type, source_resource_id, target_resource_id, source_resource_type, target_resource_type, tenant_id, cardinality, required, acyclic, directional, created_by, created_at, and integrity_policy.

Tenant-scoped relationships must remain within one tenant unless explicitly system-scoped and authorised. Cycles are denied where acyclic policy applies. Required relationships block destructive purge unless cascade policy explicitly allows another safe outcome.

## Referential Integrity/Cascade Posture

Cascade policies are restrict, detach, cascade-soft-delete, and cascade-purge. Restrict is the safe default. Cascade delete and purge require explicit policy, idempotency, audit evidence, and guardrails. Cascades must preserve tenant context and must not bypass PDP or legal hold.

## Schema-Bound Mutation Safety

Mutations are schema-bound. Mutation types are create, update, patch, transition, archive, restore, soft-delete, purge, lock, unlock, link, and unlink. Unknown mutation types fail closed. Unknown fields fail closed. Immutable fields cannot be changed. Hidden fields cannot be set through ordinary mutation. Restricted and security-sensitive fields require stronger permission. Validation errors expose field paths and safe reason codes only, never raw sensitive values.

## Versioning/Optimistic Concurrency

Resources carry version, revision, and etag. Mutations must provide expected version and etag where represented. Stale versions and mismatched etags fail closed with safe deterministic conflict. ETags and revision identifiers are safe hashes, not raw payload evidence.

## Mutation Idempotency/Replay

Side-effecting mutations require idempotency keys. Idempotency is tenant-scoped and actor-scoped where represented. Replay returns the same safe result or a safe deterministic conflict. Duplicate mutation submissions must not duplicate relationship, search, bulk, file, audit, or notification side effects.

## Locking/Holds/Admin Control

Locks, legal holds, administrative holds, retention holds, security holds, and provider holds are separate concepts. Unknown hold state fails closed. Holds are privileged and audited. Legal hold blocks purge. Locks do not weaken tenant isolation or PDP.

## Soft Delete/Archive/Restore/Purge

Soft delete hides ordinary reads and search results without destroying evidence. Archive changes ordinary availability without implying disposal. Restore is privileged and audited. Purge is destructive, privileged, retention-aware, legal-hold-aware, relationship-aware, and audit-recorded. Purged resources cannot be restored unless a separate authority and proof exist.

## Retention/Disposal Posture

Resources record retention_policy, retain_until, legal_hold, purge_allowed_at, purged_at, purged_by, and purge_reason where represented. Retention is classification-aware. Disposal is privileged and audited. Legal hold blocks purge. This local/dev/test posture is not a legal or regulatory records-management readiness claim.

## Privacy/Data Minimisation

Resource views expose minimum necessary fields. Restricted and security-sensitive fields are redacted by default. Hidden and internal provider fields are not returned. Raw payloads, secrets, tokens, cookies, object keys, recipient addresses, provider responses, and stack traces are never audit, telemetry, OpenAPI, proof, or test output.

## Source Provenance/Lineage

Resources may record source_ref, source_hash, created_by_source, imported_by_operation_id, derived_from_resource_id, source_system, and source_timestamp. Source lineage is evidence metadata, not authority. Historical source-lineage paths remain lineage only and do not dictate USF paths.

## Field Visibility/Mutability

Field metadata records field_path, field_classification, visible_to_actions, mutable_by_actions, immutable_after_status, required, derived, redaction_policy, and audit_on_change where represented. Field visibility is not authorization. Authorization is PDP-backed.

## Status/Lifecycle/Workflow Separation

Lifecycle status is resource status. Workflow status is process execution. Job status is execution state. Search index lifecycle is projection state. File status and scan status are file controls. Provider health is provider status. These status families must not be substituted for one another.

## Search/Indexing Interaction

Search indexes safe resource projections only. Search is not source authority. Soft-deleted, purged, locked-sensitive, or stale resources are hidden or revalidated before exposure. Search documents inherit resource classification and must not expose object keys or restricted fields.

## Import/Export/Bulk Interaction

Bulk-managed resources require idempotency, guardrail posture, dry-run or preview where high-risk, and value-free audit. Imports cannot mutate another tenant. Exports must honor field visibility, retention, legal hold, relationship integrity, and data minimisation.

## Files/Attachments Interaction

File-backed resources use file_id, not object keys. Quarantined, infected, pending-scan, deleted, or purged files cannot be attached or indexed as ordinary safe content. File legal hold and retention posture are preserved.

## Guardrails/High-Volume Mutation Protection

High-volume create, update, delete, link, unlink, import, export, and purge operations require guardrail posture. Guardrail denial is safe and non-enumerating. In-memory guardrails are local/dev/test only and do not claim distributed enforcement or live WAF/edge/gateway readiness.

## Audit/Evidence

Required audit events include resource.created, resource.updated, resource.patch.applied, resource.lifecycle.transitioned, resource.relationship.linked, resource.relationship.unlinked, resource.archived, resource.restored, resource.soft_deleted, resource.purge_requested, resource.purged, resource.locked, resource.unlocked, resource.read, resource.listed, resource.denied, resource.schema.changed, resource.retention.changed, and resource.legal_hold.changed where represented.

Audit is value-free. It records tenant, actor or service actor, resource id, action, outcome, reason, correlation, causation, trace, classification, and status. It does not contain raw payloads or restricted values.

## Observability/Security Signals

Signals include resource.mutation.denied, resource.transition.invalid, resource.cross_tenant_relationship.denied, resource.version_conflict, resource.purge.blocked_by_hold, resource.relationship.integrity_failed, resource.high_volume_mutation, resource.bulk_mutation.started, resource.search_projection.stale, and resource.purge.completed where represented. Signals are tenant-safe, redacted, and do not replace audit.

## API/OpenAPI Safety

Future resource routes, if implemented, are tenant-scoped, PDP-protected, schema-backed, idempotent for side effects, guardrail-aware, redacted, and OpenAPI-covered with synthetic examples. No public API, production API, legal, regulatory, or production-live readiness is claimed by this standard.

## Validator Expectations

Resource parity validation fails if the semantic model, standard, port, adapter, service, tests, proof, source-use rows, parity rows, no-overclaim posture, or planted-defect coverage is missing. It also fails if resource type, classification, status, mutation type, tenant context, actor or service actor identity, idempotency, relationship integrity, schema-bound field checks, lifecycle transition checks, legal-hold/purge checks, audit evidence, search/bulk interaction, or redaction proof disappears.

## Deferred Resource Lifecycle Depth

Deferred depth includes DB-backed generic resource tables, broad HTTP resource routes, advanced workflow approvals, legal records-management certification, regulatory retention certification, eDiscovery readiness, distributed relationship graph enforcement, and production purge workflows. These require separate authority and proof.
