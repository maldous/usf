# USF Audit and Evidence Standard

| | |
|---|---|
| Document type | Architecture / domain semantic standard |
| Status | Draft / parity-audit (USF-142 core; USF-143 enterprise-depth proof gate) |
| Authority level | semantic-definition; subordinate to the Charter, Authority Model, Standards Profile, and ADR 0010; consistent with the Enterprise Persistence Metadata and Classification Standard and the Tenant Authorization Standard |
| Issue scope | USF-142 under USF-133; enterprise audit depth bounded by USF-143 |
| Evidence basis | Historical `../react` audit/event/evidence behaviour as lineage only; PR 92 DB/RLS append-only ledger substrate; PR 93 authorization decision evidence |
| Compliance note | This standard provides ISO 27001-supporting **technical control evidence** (logging/monitoring, access control, integrity). It is **not** a certification claim. |

> Normative language follows BCP 14 (RFC 2119 + RFC 8174); only uppercase keywords are normative.

## 1. Audit is evidence, not logging

USF distinguishes four signal classes; they MUST NOT be conflated:

- **logs** — operational diagnostic output, mutable/rotated, not authoritative evidence.
- **audit events** — structured, append-only (or correction-recorded) evidence of security, authorization, tenant, data, admin, and system actions.
- **security events** — audit-relevant events that may indicate abuse, denial, privilege escalation, break-glass, policy violation, or suspicious access.
- **trace events** — distributed execution detail for debugging/causality, linked to audit via trace_id/correlation_id.

Rules: audit events MUST NOT be downgraded to logs; security-relevant permit/deny decisions MUST be structured audit evidence where required; logs MAY reference audit ids but are never the source of audit truth.

## 2. Audit event model and canonical taxonomy

Every audit event carries (see `packages/core` `AuditEventDraft`/`AuditEvent`): event_id, event_type, event_version, schema_version, category, severity, occurred_at, recorded_at, ingested_at, actor_id, actor_type, effective_actor_id, tenant_id, scope_type, scope_id, action, subject_type, subject_id, resource_type, resource_id, outcome, reason_code, safe_message, policy_version, decision_id, obligations, correlation_id, causation_id, trace_id, request_id, source_system, source_event_id, recorded_by, recorded_by_component, collector_version, clock_source, data_classification, retention_policy, legal_hold, corrects_event_id, metadata, and the chain fields sequence/previous_hash/event_hash/signature/chain_key_id/verification_status.

Canonical categories: authentication, authorization, tenant-context, break-glass, data-access, data-mutation, configuration, file, job, integration, security, admin, system, audit-system.
Canonical severities: debug, info, notice, warning, high, critical.
Canonical outcomes: success, denied, failed, error, partial, compensated.

Rules: every event MUST have a canonical category, event_type, outcome, and severity (`createAuditEventDraft` fails closed otherwise); security-relevant denials MUST NOT be silently dropped; privileged/admin actions MUST be audit-recorded; audit-system actions are themselves audited (section 5).

## 3. Chain of custody

Every audit event MUST identify what component recorded it (recorded_by, recorded_by_component, collector_version), preserve source identity for imported events (source_system, source_event_id), and reference the original for derived/corrected events (corrects_event_id). Provenance MUST be supportable from action to event to stored evidence to retrieval/export.

## 4. Tamper evidence and integrity

Each tenant is an independent hash chain (chain_scope = tenant:<id>) with a monotonic sequence. event_hash binds canonical event content + recorded_at + sequence + previous_hash, computed deterministically (`canonicalAuditEventHash`). `verifyAuditChain` detects changed content (hash mismatch), a broken previous_hash link, and reordered/missing sequences. The DB substrate (USF-138) carries an independent Postgres-side append-only hash chain. USF-143 adds bounded local evidence-package signing and verification over synthetic audit evidence only.

Rules: hash input MUST be canonical and deterministic; chains MUST be tenant-scoped or scope-classified; verification MUST detect content tamper and sequence reorder/gaps. signature and chain_key_id are evidence-package fields in the bounded local proof. No live KMS/HSM/external signing, key-custody operation, or certification readiness is claimed without separate authorisation.

## 5. Audit-of-audit access

Reading, exporting, verifying, or correcting audit evidence is itself a privileged action and is itself audited: audit.query.started, audit.query.completed, audit.query.denied, audit.event.viewed, audit.integrity.verified, audit.integrity.failed, audit.correction.recorded (export events reserved). Denied audit access is recorded. Tenant users MUST NOT be able to infer other tenants' audit existence.

## 6. Privacy, redaction, and sensitive metadata

Audit MUST NOT become a secret dump. `redactAuditMetadata` masks blocked keys (password, token, secret, api_key, cookie, authorization, private_key, credential, session_token, access_key, client_secret, ssn, …), bounds key count and value length, and records references/identifiers rather than full object snapshots. No passwords, tokens, secrets, cookies, private keys, or raw credentials in metadata; PII is minimised. `validate-audit` blocks regressions in the blocked-key set.

## 7. Retention, legal hold, and disposal

Fields: retention_policy, retention_until, legal_hold (plus disposal_allowed_at, purge_requested_at, purge_approved_by, purge_reason at the data layer). Legal hold blocks audit purge (DB BEFORE DELETE trigger). Audit purge requires explicit policy and is itself audit-recorded; tenant deletion does not automatically destroy audit evidence unless retention policy allows. USF-143 proves the local legal-hold/disposal decision boundary with synthetic evidence. It does not claim automated production retention, legal-hold operations, or customer purge readiness.

## 8. Schema evolution and event versioning

Every event has event_version; event_type names are stable; deprecated types remain readable; unknown future versions fail safely. Breaking schema changes require a new version and a schema_version bump. USF-143 proves bounded v0/v1 local reader compatibility and fail-closed handling for an unknown future version. It does not claim complete historical customer migration or production compatibility readiness.

## 9. Reliability and delivery guarantees

Security-critical audit failure MUST NOT silently permit a privileged action. Audit write failure for a protected mutation MUST either fail the action or create durable retry evidence. Best-effort audit is allowed only for explicitly classified low-risk events. Duplicate writes are idempotent via source_event_id/causation_id; out-of-order events remain traceable. USF-143 proves bounded local outbox retry and poison-message dead-letter behaviour. It does not claim distributed event-bus, production retry, or customer delivery readiness.

## 10. Transactional consistency

Where an action mutates state and emits audit evidence, the mutation and audit record SHOULD commit atomically where practical; if audit is asynchronous there MUST be durable outbox evidence. Audit carries transaction/correlation identity and the causing command/event. This slice implements the decision/recording write path; USF-143 adds bounded local delivery evidence without claiming production outbox readiness.

## 11. Time, ordering, and clocks

Timestamps are UTC (timestamptz at the DB). recorded_at and ingested_at are assigned by trusted server/database code (clock_source = server), not client input; occurred_at MAY come from source systems but is labelled. Strong ordering relies on the per-tenant sequence, not wall-clock time alone.

## 12. Multi-tenant audit retrieval

Tenant-scoped queries require tenant context; retrieval is PDP-protected and RLS-backed. Cross-tenant access requires an explicit system/audit role and is recorded. Pagination uses an opaque per-tenant cursor and MUST NOT leak row counts across tenants; filters MUST NOT probe other tenants' event ids; 403/404 behaviour is non-enumerating.

## 13. Forensic investigation support

Investigation fields: actor_id, effective_actor_id, tenant_id, source_ip, user_agent, device_id, session_id, request_id, trace_id, correlation_id, causation_id, resource_type, resource_id, data_classification, policy_version, decision_id, reason_code. USF-143 proves synthetic value-free request/session references. It does not claim browser session, raw IP/device collection, production telemetry, or customer forensic readiness.

## 14. Security detection hooks

Reserved future event classes: repeated_denial, tenant_mismatch, break_glass_used, policy_changed, role_changed, permission_changed, audit_integrity_failed, suspicious_export, impossible_tenant_switch. These are emitted as structured/reserved event definitions. USF-143 proves local value-free detection mapping and SIEM-envelope posture. No live SIEM integration, production monitoring, alerting, or incident readiness is claimed without separate authorisation.

## 15. Export and evidence package readiness

Audit export is privileged and tenant-scoped unless explicitly system-scoped; exports include query criteria, actor, time, hash/integrity status, and an export_id, and are themselves audit-recorded; exported evidence is verifiable against event_hash. No raw secrets in exports. Export is declared as a port (`AuditExporter`) with reserved audit.export.* events. USF-143 proves bounded local evidence package generation, hashing, signing, verification, and redaction. It does not claim a public export API, customer export readiness, live SIEM export, or production export readiness.

## 16. Audit access model

Actions: audit.record (components, via the recorder), audit.read, audit.search, audit.verify (authorised readers), audit.export, audit.correct, audit.purge (privileged). Mapped in the Tenant Authorization Standard / policy: auditor and tenant-admin may read/search/verify their tenant; security-admin may also export/correct/purge. Corrections require privileged permission and create compensating events; purge requires retention/legal-hold checks.

## 17. Validator expectations

`tools/validate-parity/validate-audit.py` fails closed when: the taxonomy is not enforced as canonical; events lack actor/tenant/scope/correlation/causation; events are not versioned; metadata does not block obvious secret keys; retrieval is not PDP-protected; retrieval is not tenant-scoped/non-enumerating; audit access is not itself audited; authorization decisions or break-glass use are not recorded; a hash chain exists without verification; no tamper-evidence proof exists; SIEM/live-external/production-live readiness is overclaimed; the parity matrix audit row lacks tests/proofs; the USF-143 enterprise audit matrix is incomplete; proof/evidence linkage is missing; proven controls lack proof markers; or readiness/certification non-claims are weakened. Each rule has a planted defect under `tools/validate-parity/audit-planted-defects`.

## 18. Enterprise audit proof depth (USF-143)

USF-143 adds `docs/architecture/audit-enterprise-proof-depth-matrix.json`, extends `make audit-proof`, and adds validator rules USF-AUDIT-014 through USF-AUDIT-019. The bounded proof covers local evidence-package signing and verification, key material exclusion, value-free export package metadata, legal-hold/disposal decisions, bounded outbox retry/dead-letter behaviour, Postgres outcome mapping, synthetic forensic references, local SIEM envelope posture, detection mapping, and v0/v1 reader compatibility with fail-closed unknown versions.

These controls are bounded local evidence only. They do not claim live KMS/HSM, live SIEM, public audit export API, production retention operation, production incident response, staging readiness, production readiness, deployment readiness, SOC readiness, ISO certification, full dev readiness, full product readiness, or USF-133 closure.
