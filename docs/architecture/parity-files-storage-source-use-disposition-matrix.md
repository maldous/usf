# Parity Files/Storage Source-Use Disposition Matrix

| | |
|---|---|
| Document type | Architecture / source-use governance matrix |
| Status | Draft / parity-files-storage (USF-146) implementation coverage |
| Authority level | Reviewable implementation coverage; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the implementation directive |
| Issue scope | USF-146 under USF-133; deferred depth tracked in USF-147 |
| Source row basis | `docs/architecture/files-and-object-storage-standard.md`, the Enterprise Persistence Metadata and Classification Standard, ADR 0010 (PDP), the audit-evidence and config-and-secrets standards, and historical `../react` files/storage behaviour as lineage only |
| Repository state | No React runtime/application code copied; no React path mirroring; no UI; no Playwright; no live S3/MinIO/ClamAV/presigned-URL/DLP; no live/production claim |

## Treatment Rules

`source-derived-rewrite` = behaviour recovered from historical `../react` evidence and freshly authored against USF semantics (no copy, no path mirroring). `new-with-rationale` = USF-defined. `evidence-only-support` = a test/proof artefact. Files modified in this slice that already carry a disposition row in another matrix (`packages/core`, `packages/ports`, `packages/contracts`, `packages/openapi`, `apps/api`, `adapters/store/src/index.ts`, `capabilities/files/src/index.ts`, `capabilities/tenant/src/authorization-policy.ts`, `adapters/db/src/generated-types.ts`, `adapters/db/migrations/manifest.json`) are not re-listed here.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `adapters/db/migrations/0003-files.sql` | source-derived-rewrite | React object_storage tenant-scoped metadata + isolation lineage | Tenant-scoped `files` metadata table: RLS + FORCE RLS + tenant policy, enterprise persistence metadata, soft delete/restore, legal-hold purge-block, integrity/scan fields. Adds the per-object checksum + opaque-key fields React lacked. |
| `capabilities/files/src/file-service.ts` | source-derived-rewrite | React upload/download/scan/quarantine/delete lineage | PDP-protected, tenant-scoped upload/download/get/list/delete/restore/purge/verify with scan gate, legal-hold purge-block, integrity verify, and value-free file audit. |
| `packages/proof/src/files-storage-proof.ts` | evidence-only-support | File RLS + legal-hold proof requirement | Composed-Postgres proof: files RLS isolation, FORCE RLS, legal-hold purge-block, object-key uniqueness. `make files-proof`. |
| `tests/capabilities/files-storage.test.ts` | evidence-only-support | Files/storage behaviour proof requirement | Hermetic object-key-safety, upload-validation, isolation, scan/quarantine, lifecycle, legal-hold, integrity-tamper tests. |
| `tests/apps/files-api.test.ts` | evidence-only-support | File surface proof requirement | API tests: upload/list/get/download/verify; redacted views (no object key); quarantine download 403; tenant mismatch; PDP deny. |

## Sub-Domain Classification

| Files/storage concern | Status | Where | Notes |
| --- | --- | --- | --- |
| File metadata (authoritative, tenant-scoped) | migrated | `adapters/db/migrations/0003-files.sql`, `packages/core` (FileMetadata), `adapters/store` | RLS + FORCE RLS proven (make files-proof). |
| Object storage provider | partial | `packages/ports` (ObjectStore), `adapters/store` | In-memory adapter; live MinIO/S3 deferred (USF-147). |
| Object key safety | migrated | `packages/core` (generateObjectKey/assertSafeObjectKey/objectKeyLeaksSensitive) | Opaque, traversal-safe, no tenant/email/filename/secret leakage (tests). |
| Tenant file isolation | migrated | metadata store + RLS + PDP | Tenant A cannot read/list/download tenant B (tests + proof). |
| Upload validation | migrated | `packages/core` (validateUpload) | Size/content-type/checksum/zero-byte fail closed. |
| Download authorization | migrated | `capabilities/files` + PDP | PDP-gated; sensitive classification needs stronger auth; scan/lifecycle gate. |
| Signed URL posture | deferred | `packages/ports` (SignedUrlIssuer) | Port-only; no live presigned URLs (USF-147). |
| Checksum/integrity | migrated | `packages/core` (sha256/metadataHash), `file-service.verify` | Checksum + metadata hash; tamper detected. |
| Scan/quarantine | partial | `packages/ports` (ScanProvider), `adapters/store` (InMemoryScanProvider) | Status model + fail-closed gate; live ClamAV/DLP deferred (USF-147). |
| Derived objects | deferred | — | Preview/thumbnail/OCR/index inherit-classification rule defined in the standard; generation deferred (USF-147). |
| Retention/legal hold | migrated | DB legal-hold trigger + `file-service.purge` | Legal hold blocks purge (proof + test). |
| Object versioning | deferred | — | Fields/rules in the standard; provider versioning deferred (USF-147). |
| Backup/restore/DR | deferred | — | Defined in the standard; deferred (USF-147). |
| DLP/exfiltration hooks | deferred | — | Reserved detection events; live DLP/SIEM deferred (USF-147). |
| File audit evidence | migrated | `capabilities/files` + PR 94 audit model | file.upload/downloaded/denied/deleted/restored/purged/quarantined; value-free. |
| Provider config/secret refs | covered | PR 95 config/secrets | Provider credentials are secret references (config slice); never embedded. |
| Encryption/KMS posture | deferred | standard fields | At-rest/in-transit/key_ref reserved; live KMS deferred (USF-147). |
| Quotas/abuse | deferred | standard fields | Quota/rate fields reserved; enforcement deferred (USF-147). |

## React UI/Playwright File Behaviours

The historical `../react` files/storage inventory (`.claude/runs/.../react-files-storage-inventory.json`, 31 items) found **0 UI/Playwright-only** file behaviours: all object CRUD is API-only, and the one UI surface (an `admin-storage` readiness panel, explicitly "not a file browser") is tested with Vitest/MSW, not Playwright. All storage proof lives in Node unit tests + `*-runtime-proof.ts` scripts, re-expressed here as USF capability/port/adapter/proof tests. No UI/Playwright file test disappears silently.

## Non-goals

No React runtime/application code copy. No React path mirroring. No UI/UX. No Playwright. No live S3/MinIO/object-store, ClamAV/antivirus/DLP, presigned URLs, or KMS. No live-external-provider. No staging/production/deployment/production-live claim. No full React functional parity readiness claim.
