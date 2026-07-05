# Parity Audit/Evidence Source-Use Disposition Matrix

| | |
|---|---|
| Document type | Architecture / source-use governance matrix |
| Status | Draft / parity-audit (USF-142 core; USF-143 enterprise-depth proof coverage) |
| Authority level | Reviewable implementation coverage; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the implementation directive |
| Issue scope | USF-142 under USF-133; enterprise audit depth bounded by USF-143 |
| Source row basis | `docs/architecture/audit-evidence-standard.md`, the Enterprise Persistence Metadata and Classification Standard, ADR 0010 (PDP), and historical `../react` audit/event/evidence behaviour as lineage only |
| Repository state | No React runtime/application code copied; no React path mirroring; no UI; no Playwright; no live KMS/HSM/SIEM; no live/production claim |

## Treatment Rules

`source-derived-rewrite` means the behaviour was recovered from historical `../react` evidence and freshly authored against USF semantics (no copy, no path mirroring). `new-with-rationale` means USF-defined. `evidence-only-support` means a test/proof artefact. Files modified in this slice that already carry a disposition row in another matrix (`packages/core`, `packages/ports`, `packages/contracts`, `packages/openapi`, `apps/api`, `capabilities/tenant/src/authorize.ts`, `capabilities/tenant/src/authorization-policy.ts`, `capabilities/audit/src/index.ts`) are not re-listed here.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `capabilities/audit/src/event-store.ts` | source-derived-rewrite | React `packages/audit-events` AuditEventPort emit/query lineage | In-memory append-only, tenant-isolated, hash-chained audit event store with non-enumerating, paginated query/get and chain verify. Adds the per-tenant hash chain React lacked. |
| `capabilities/audit/src/recorder.ts` | new-with-rationale | Audit-recording capability requirement | Convenience recorder that builds validated, redacted drafts and injects the recording component (chain of custody). |
| `capabilities/audit/src/query-service.ts` | source-derived-rewrite | React audit query + admin audit-viewer lineage (deferred UI) | PDP-protected, tenant-scoped retrieval/verify/correct that records audit-of-audit access events. |
| `capabilities/audit/src/safe-view.ts` | new-with-rationale | Safe-projection requirement | Client-safe projection: redacted metadata, a safe verification surface, no internal chain plumbing. |
| `packages/proof/src/audit-evidence-proof.ts` | evidence-only-support | Append-only + tamper-evidence proof requirement | Composed-Postgres proof: append-only, valid-chain re-verification, tamper detection, RLS isolation. Run via `make audit-proof`. |
| `docs/architecture/audit-enterprise-proof-depth-matrix.json` | new-with-rationale | USF-143 enterprise audit depth gate | Maps signing/key boundary, evidence package, retention/disposal, delivery reliability, Postgres linkage, forensic refs, SIEM posture, detection mapping, multi-version readers, validators, evidence rows, and non-claims. |
| `tests/capabilities/audit-evidence.test.ts` | evidence-only-support | Audit/evidence behaviour proof requirement | Hermetic model/redaction/chain/tamper/retrieval/correction/taxonomy tests. |
| `tests/apps/audit-api.test.ts` | evidence-only-support | Audit retrieval surface proof requirement | API tests: tenant-scoped, PDP-protected, non-enumerating audit retrieval and verify, with audit-of-audit. |

## Sub-Domain Classification

| Audit/evidence concern | Status | Where | Notes |
| --- | --- | --- | --- |
| Audit event model + canonical taxonomy (category/event_type/severity/outcome) | migrated | `packages/core` (AUDIT_CATEGORIES/SEVERITIES/OUTCOMES, AUDIT_EVENT_TYPES, createAuditEventDraft) | Fails closed on non-canonical values; event-type names stable; reserved future types defined. |
| Security event model | migrated | `packages/core` (security.* event types; denied decisions recorded denied) | Detection-hook classes (repeated_denial, impossible_tenant_switch, …) defined as reserved types. |
| Authorization decision evidence (PR 93) | migrated | `capabilities/tenant/src/authorize.ts` | Rich authorization.decision events (permit and deny) via the authorizer's optional recorder. |
| Break-glass evidence (PR 93) | migrated | `capabilities/tenant/src/authorize.ts` | break_glass.used recorded high-severity on a break-glass permit. |
| Audit recording (chain of custody) | migrated | `packages/core`, `capabilities/audit` | recordedBy/recordedByComponent/collector/source identity on every event. |
| Tenant-scoped audit retrieval | migrated | `capabilities/audit/src/event-store.ts`, `apps/api` | Tenant-scoped, paginated (opaque per-tenant cursor), non-enumerating; RLS-backed on the DB substrate. |
| Audit-of-audit access | migrated | `capabilities/audit/src/query-service.ts` | audit.query.started/completed/denied, audit.event.viewed, audit.integrity.verified/failed, audit.correction.recorded. |
| Hash/integrity verification + tamper evidence | migrated | `packages/core` (canonicalAuditEventHash, verifyAuditChain), `packages/proof` | App-layer chain + composed-Postgres tamper proof (make audit-proof). |
| Redaction / metadata safety | migrated | `packages/core` (BLOCKED_METADATA_KEYS, redactAuditMetadata) | Blocks password/token/secret/api_key/cookie/authorization/private_key…; bounds keys/value size; references not snapshots. |
| Schema evolution / event versioning | bounded-local-proof | `packages/core` (eventVersion, AUDIT_SCHEMA_VERSION), `packages/proof/src/audit-evidence-proof.ts` | USF-143 proves v0/v1 synthetic reader compatibility and fail-closed unknown future version handling. No full historical customer migration readiness claim. |
| Retention / legal-hold / disposal | bounded-local-proof | DB substrate (retention_policy, legal_hold, legal-hold purge-block) + proof lifecycle fixture | USF-143 proves legal-hold disposal blocking and audited eligible disposal locally. No automated production retention, purge, or legal-hold operations readiness claim. |
| Cryptographic signing / key management | bounded-local-proof | `packages/proof/src/audit-evidence-proof.ts`, model `signature`/`chainKeyId` | USF-143 proves local package signing/verification and forged-package rejection while excluding key material. No live KMS/HSM/custody readiness claim. |
| Audit export / evidence package | bounded-local-proof | `packages/ports` (AuditExporter), audit.export.* reserved, `packages/proof/src/audit-evidence-proof.ts` | USF-143 proves tenant-scoped, value-free, signed local evidence packages. No public export API, customer export readiness, or live SIEM export claim. |
| Durable outbox / delivery reliability | bounded-local-proof | `packages/proof/src/audit-evidence-proof.ts` | USF-143 proves bounded retry and dead-letter fail-closed behaviour locally. No distributed event-bus or production delivery readiness claim. |
| Forensic request/session capture (source_ip, user_agent, device_id, session_id) | bounded-local-proof | `packages/core` fields + `packages/proof/src/audit-evidence-proof.ts` | USF-143 proves synthetic value-free request/session refs. No browser session or production IP/device collection readiness claim. |
| SIEM forwarder | bounded-local-proof | `packages/ports` (SiemForwarder), `packages/proof/src/audit-evidence-proof.ts` | USF-143 proves local value-free SIEM envelope posture. No live SIEM, alerting, monitoring, or incident readiness claim. |
| Security detection monitoring | bounded-local-proof | `packages/core` reserved event types + `packages/proof/src/audit-evidence-proof.ts` | USF-143 proves local mapping from audit.integrity.failed to value-free detection evidence. No production monitoring or SOC readiness claim. |
| JavaScript Postgres audit adapter linkage | bounded-local-proof | composed-Postgres proof + app outcome mapping boundary | USF-143 proves app outcomes require explicit mapping before DB persistence and raw app-only outcomes are rejected by the DB constraint. No live JavaScript adapter readiness claim. |

## React UI/Playwright Audit Behaviours

The historical `../react` audit/evidence inventory (`.claude/runs/...react-audit-evidence-inventory.json`) found **no UI/Playwright-only audit behaviours**: React audit content is proven by unit tests and hermetic/live-Postgres `*-runtime-proof.ts` scripts (the Playwright layer only touches `X-Request-Id` correlation, not audit content). Therefore no audit behaviour required rewriting from a UI/Playwright test, and none disappears silently. Audit behaviours are expressed here as USF capability/port/proof tests.

## Non-goals

No React runtime/application code copy. No React path mirroring. No UI/UX. No Playwright. No live KMS/HSM/external signing. No live SIEM integration. No public audit export API readiness. No staging/production/deployment/live-external-provider/production-live claim. No full product readiness claim.
