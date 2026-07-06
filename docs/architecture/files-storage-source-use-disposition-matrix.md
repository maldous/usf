# Files/Storage Source-Use Disposition Matrix

| | |
|---|---|
| Document type | Architecture / source-use governance matrix |
| Status | Draft / files-storage slice (USF-146) plus USF-147 bounded enterprise depth coverage |
| Authority level | Reviewable implementation coverage; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the implementation directive |
| Issue scope | USF-146 under USF-133; deferred depth tracked in USF-147 |
| Source row basis | `docs/architecture/files-and-object-storage-standard.md`, the Enterprise Persistence Metadata and Classification Standard, ADR 0010 (PDP), the audit-evidence and config-and-secrets standards, and USF's own self-defined files/storage source lineage |
| Repository state | USF authors its own runtime; no external runtime/application code is copied and no external source path is mirrored; no UI; no Playwright; bounded local MinIO and ClamAV composed-test proof/reconciliation only; no live S3/object-store, live scanner, KMS, DLP, backup/restore readiness, staging, production, SOC, ISO certification, full dev readiness, full product readiness, or USF-133 closure claim |

## Treatment Rules

`source-derived-rewrite` = behaviour authored against USF semantics with USF's own self-defined source lineage as evidence (no copy, no path mirroring). `new-with-rationale` = USF-defined. `evidence-only-support` = a test/proof artefact. Files modified in this slice that already carry a disposition row in another matrix (`packages/core`, `packages/ports`, `packages/contracts`, `packages/openapi`, `apps/api`, `adapters/store/src/index.ts`, `capabilities/files/src/index.ts`, `capabilities/tenant/src/authorization-policy.ts`, `adapters/db/src/generated-types.ts`, `adapters/db/migrations/manifest.json`) are not re-listed here.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `adapters/db/migrations/0003-files.sql` | source-derived-rewrite | source-lineage object_storage tenant-scoped metadata + isolation lineage | Tenant-scoped `files` metadata table: RLS + FORCE RLS + tenant policy, enterprise persistence metadata, soft delete/restore, legal-hold purge-block, integrity/scan fields. Adds the per-object checksum + opaque-key fields source-lineage lacked. |
| `adapters/store/src/clamscan.d.ts` | new-with-rationale | USF-200 SDK/client boundary requirement; no source-lineage runtime/application code copied | Local TypeScript declaration for the de-facto `clamscan` SDK at the adapter boundary only; does not authorise SDK imports outside adapters or claim live scanner readiness. |
| `capabilities/files/src/file-service.ts` | source-derived-rewrite | source-lineage upload/download/scan/quarantine/delete lineage | PDP-protected, tenant-scoped upload/download/get/list/delete/restore/purge/verify with scan gate, legal-hold purge-block, integrity verify, and value-free file audit. |
| `packages/proof/src/files-storage-proof.ts` | evidence-only-support | File RLS + legal-hold proof requirement | Composed-Postgres proof: files RLS isolation, FORCE RLS, legal-hold purge-block, object-key uniqueness. `make files-proof`. |
| `docs/architecture/files-storage-enterprise-proof-depth-matrix.json` | evidence-only-support | USF-147 source-depth closure requirement | Machine-readable evidence matrix mapping USF-147 controls, MinIO and ClamAV composed-test reconciliation, explicit reclassifications, enterprise evidence refs, validator command, proof command, and non-claims. |
| `packages/proof/src/clamav-composed-proof.ts` | evidence-only-support | USF-200 bounded local Compose ClamAV proof requirement; no source-lineage runtime/application code copied | Profile-gated proof for SDK-backed local ClamAV clean/infected scans, provider-unavailable fail-closed quarantine routing, quarantined download denial, deletion, tenant isolation, value-free audit evidence, redaction, and teardown. No live scanner, DLP, staging, production, SOC, ISO, full dev, or full product readiness claim. |
| `tests/capabilities/files-storage.test.ts` | evidence-only-support | Files/storage behaviour proof requirement | Hermetic object-key-safety, upload-validation, isolation, scan/quarantine, lifecycle, legal-hold, integrity-tamper tests. |
| `tests/apps/files-api.test.ts` | evidence-only-support | File surface proof requirement | API tests: upload/list/get/download/verify; redacted views (no object key); quarantine download 403; tenant mismatch; PDP deny. |

## Sub-Domain Classification

| Files/storage concern | Status | Where | Notes |
| --- | --- | --- | --- |
| File metadata (authoritative, tenant-scoped) | covered | `adapters/db/migrations/0003-files.sql`, `packages/core` (FileMetadata), `adapters/store` | RLS + FORCE RLS proven (make files-proof). |
| Object storage provider | covered for bounded local proof | `packages/ports` (ObjectStore), `adapters/store`, `packages/proof/src/files-storage-proof.ts` | In-memory adapter plus bounded MinIO composed-test registry/proof reconciliation. Live S3, provider-managed object store, and presigned URL runtime readiness remain non-claims requiring separate source issues before stronger claims. |
| Object key safety | covered | `packages/core` (generateObjectKey/assertSafeObjectKey/objectKeyLeaksSensitive) | Opaque, traversal-safe, no tenant/email/filename/secret leakage (tests). |
| Tenant file isolation | covered | metadata store + RLS + PDP | Tenant A cannot read/list/download tenant B (tests + proof). |
| Upload validation | covered | `packages/core` (validateUpload) | Size/content-type/checksum/zero-byte fail closed. |
| Download authorization | covered | `capabilities/files` + PDP | PDP-gated; sensitive classification needs stronger auth; scan/lifecycle gate. |
| Signed URL posture | explicitly reclassified | `packages/ports` (SignedUrlIssuer), USF-147 matrix | Port-only; no live presigned URLs or production download readiness. |
| Checksum/integrity | covered | `packages/core` (sha256/metadataHash), `file-service.verify` | Checksum + metadata hash; tamper detected. |
| Scan/quarantine | covered for bounded local proof | `packages/ports` (ScanProvider), `adapters/store` (InMemoryScanProvider, ClamAvScanProvider), `packages/proof/src/clamav-composed-proof.ts` | Status model + fail-closed gate; USF-200 proves bounded local Compose ClamAV clean/infected and provider-unavailable quarantine behaviour for synthetic payloads; USF-147 reconciles this as bounded local scanner evidence. Live ClamAV readiness, DLP, signature freshness operation, and release workflow remain non-claims. |
| Derived objects | explicitly reclassified | USF-147 matrix | Preview/thumbnail/OCR/index inherit-classification rule defined in the standard; generation deferred to a future source issue before any readiness claim. |
| Retention/legal hold | covered | DB legal-hold trigger + `file-service.purge` | Legal hold blocks purge (proof + test). |
| Object versioning | explicitly reclassified | USF-147 matrix | Fields/rules in the standard; provider object versioning and delete-marker readiness are not claimed. |
| Backup/restore/DR | explicitly reclassified | USF-147 matrix, `docs/architecture/pgbackrest-configured-proof-boundary.json` | DB backup/restore evidence is non-equivalent to object-store backup/DR; object backup, restore, DR, RPO, and RTO readiness are not claimed. |
| DLP/exfiltration hooks | explicitly reclassified | USF-147 matrix | Reserved detection events; live DLP/SIEM and exfiltration-control readiness are not claimed. |
| File audit evidence | covered | `capabilities/files` + PR 94 audit model | file.upload/downloaded/denied/deleted/restored/purged/quarantined; value-free. |
| Provider config/secret refs | covered | PR 95 config/secrets | Provider credentials are secret references (config slice); never embedded. |
| Encryption/KMS posture | explicitly reclassified | standard fields, USF-147 matrix | At-rest/in-transit/key_ref reserved; live KMS, customer-managed key, and production encryption readiness are not claimed. |
| Quotas/abuse | explicitly reclassified | standard fields, USF-147 matrix | Size validation is proven; storage quota runtime, upload/download rate limiting, multipart, and temporary-upload cleanup remain non-claims. |

## UI/Playwright File Behaviours

USF's own self-defined files/storage source inventory (31 items) records **0 UI/Playwright-only** file behaviours: all object CRUD is API-only, and the one UI surface (an `admin-storage` readiness panel, explicitly "not a file browser") is tested with Vitest/MSW, not Playwright. All storage proof lives in Node unit tests + `*-runtime-proof.ts` scripts, re-expressed here as USF capability/port/adapter/proof tests. No UI/Playwright file test disappears silently.

## Non-goals

No external runtime/application code copy. No external source path mirroring. No UI/UX. No Playwright. No live S3/object-store, live ClamAV/antivirus/DLP, presigned URL runtime, KMS, backup/restore readiness, object-lock/WORM, storage quota runtime, staging, production, deployment, production-live, SOC, ISO certification, full dev readiness, full product readiness, enterprise production readiness, or USF-133 closure claim.
