# USF Files and Object Storage Standard

| | |
|---|---|
| Document type | Architecture / domain semantic standard |
| Status | Draft / parity-files-storage (USF-146) |
| Authority level | semantic-definition; subordinate to the Charter, Authority Model, Standards Profile, ADR 0010; consistent with the Enterprise Persistence Metadata and Classification, audit-evidence, and config-and-secrets standards |
| Issue scope | USF-146 under USF-133; deferred depth tracked in USF-147 |
| Evidence basis | Historical `../react` files/storage behaviour as lineage only; PR 92 DB/RLS; PR 93 PDP; PR 94 audit; PR 95 config/secrets |
| Compliance note | ISO 27001-supporting **technical control evidence** (asset management, access control, integrity, malware/quarantine posture, retention). **Not** a certification claim. |

> Normative language follows BCP 14; only uppercase keywords are normative.

## 1. Files are information assets

- **file metadata** — the authoritative tenant-scoped record (ownership, classification, lifecycle, access, retention, integrity). The `files` table (0003-files.sql) is the system of record.
- **object/blob** — opaque binary content behind a provider adapter (`ObjectStore`).
- **derived object** — preview/thumbnail/OCR/extracted-text/index/conversion; inherits or strengthens source classification (deferred generation, USF-147).
- **evidence object** — audit/legal/incident/compliance object; integrity + chain-of-custody posture.
- **temporary object** — short-lived upload/staging object with explicit expiry/cleanup (reserved).

File metadata is authoritative; object storage must not become an ungoverned side channel; every object maps to metadata or is explicitly classified provider-internal/ephemeral; no object exists without a lifecycle classification.

## 2. Information-asset classification

App-layer classification (`FILE_CLASSIFICATIONS`): public, internal, confidential, restricted, security-sensitive, regulated, legal-evidence. It maps onto the 5-value DB persistence scale (regulated→restricted, legal-evidence→security-sensitive). Classification affects read/download/export/retention/purge/preview/indexing. Restricted/security-sensitive/regulated/legal-evidence require stronger authorization (a download additionally requires the ABAC-escalated read decision → the sensitive permission). Public is explicit, never default; unknown classification fails closed.

## 3. Tenant and data-residency boundary

File metadata is tenant-scoped (`files.tenant_id`, RLS + FORCE RLS, tenant policy on `app_tenant_id()`). Tenant A cannot read, list, infer, download, preview, scan, or export tenant B files (RLS proof + hermetic tests). Residency fields (region, residency_policy, storage_location, provider_region, replication_policy, cross_region_allowed, cross_tenant_shared) are reserved; cross-region replication and cross-tenant sharing are forbidden unless explicitly classified; enforcement is deferred (USF-147).

## 4. Object key and namespace safety

Object keys are opaque, non-guessable, tenant-safe, and path-traversal-safe (`generateObjectKey` = hashed hex path; `assertSafeObjectKey`; `SAFE_OBJECT_KEY`). Keys MUST NOT include tenant names, emails, original filenames, secrets, or business-revealing timestamps (`objectKeyLeaksSensitive` guards hand-built keys). Original filename is metadata only (`filename_original`), never a storage path; `filename_safe` is the sanitised display name. Key generation is deterministic in tests (salted) but non-enumerable in semantics. Tests cover `../`, encoded traversal, unicode separators, and tenant/email/filename leakage.

## 5. Encryption and key posture (reserved)

Concepts: encryption_at_rest, encryption_in_transit, key_ref, key_provider, key_scope, key_version, rotation_policy, kms_required. The storage provider MUST require TLS except local-only test providers; at-rest encryption posture is represented; tenant-specific keying may be deferred but classified. No key material in config/audit/OpenAPI/tests/docs. Live KMS/HSM is deferred (USF-147).

## 6. Provider IAM and least privilege

Provider policy distinguishes read/write/delete/list/head/copy/set-metadata/set-retention. Runtime credentials MUST NOT have broad bucket-admin privileges; list is minimised; delete/purge is separated from read/write where the provider supports it. Provider credentials are secret references only (PR 95); no root/account-level credentials in tests/docs/OpenAPI/proof. Provider mode distinguishes in-memory, local-composed-test, mock, live-external; live-external is not claimed.

## 7. Upload security

Uploads are untrusted: client filename, content_type, and checksum are untrusted until verified; size limits fail closed (`MAX_FILE_SIZE_BYTES`); the content-type allow-list is one of several checks; zero-byte uploads are rejected unless explicitly allowed; multipart/resumable + duplicate-idempotency are reserved. `validateUpload` enforces size/content-type/checksum/zero-byte; mismatch fails closed without echoing content.

## 8. Download and sharing security

Every download goes through the PDP and is audit-recorded. A deleted, quarantined, infected, pending-scan, purged, or legally-held file cannot be downloaded unless explicitly authorised (`isDownloadable` gate, fail closed). Download responses never leak object keys or credentials. Signed/presigned URLs are a declared, deferred port (`SignedUrlIssuer`, USF-147); if implemented they MUST be scoped, expiring, purpose-bound, tenant-bound, audit-recorded, and MUST NOT outlive the authorization decision without recorded rationale.

## 9. Malware, DLP, and quarantine posture

Scan is a port + status model (`ScanProvider`, `FILE_SCAN_STATUSES`); no live antivirus/DLP. Fields: scan_status, scanner_ref, scanner_version, scanned_at, scan_result, quarantine_reason, released_by/at, release_reason. An infected/suspicious upload is quarantined; quarantine blocks normal download; scanner failure never silently permits a risky file; release from quarantine is privileged and audited (reserved). Live ClamAV/DLP scanner is deferred (USF-147).

## 10. Derived objects, versioning, backup/restore (deferred)

Derived objects inherit source tenant/classification/retention/legal-hold/access and are not generated for quarantined/infected files; text extraction/OCR is classified; indexes must not leak cross-tenant content. Object versioning (object_version, delete markers respecting retention/legal-hold, authorised+audited restore) is reserved. Backup/restore/DR keeps tenant/classification/retention/legal-hold/audit linkage, restore is privileged + audited and does not bypass RLS/PDP, and backups carry no unclassified/unencrypted secrets. All three are deferred (USF-147); no DR/backup readiness is claimed.

## 11. Retention, legal hold, object lock, and purge

Deletion is not purge. Soft delete keeps the file tenant-isolated (status `deleted`); restore re-enables it; purge is privileged, audited, and removes the object + metadata (status `purged`). Legal hold blocks purge (DB BEFORE DELETE trigger + app-layer check, fail closed, proven). Retention policy and object-lock/WORM are classified; disposal proof and full retention lifecycle are deferred (USF-147).

## 12. DLP and exfiltration controls (reserved)

Bulk export/download is privileged + audited; suspicious patterns (repeated denied download, cross-tenant probing, restricted-file download, abnormal egress) emit reserved security/detection events; no live DLP/SIEM. Deferred (USF-147).

## 13. File audit and audit-of-file-access

Events (PR 94 model, category file): file.upload.started/completed/failed, file.downloaded, file.download.denied, file.metadata.viewed, file.deleted, file.restored, file.purged, file.quarantined (emitted); file.released/scan.completed/scan.failed/retention.changed/legal_hold.applied/removed/exported (reserved). Audit events carry actor/tenant/file_id/action/outcome/reason/classification/correlation/trace and NEVER file contents, object keys, or secrets. Denied file access is recorded.

## 14. Content privacy and metadata minimisation

Original filenames may contain PII (classified; redacted/minimised in audit). API responses are least-disclosure (`toSafeFileView`): no object key, bucket, provider ref, original filename, or correlation internals — only a safe verification surface (checksum + verification status). Full metadata is not exposed to download-only actors.

## 15. Integrity, non-repudiation, and evidence packages

`checksum_sha256` (canonical, deterministic) + `metadata_hash` are recorded; metadata/content mismatch fails closed (`file.verify`); ETag alone is not canonical integrity proof. Evidence export packages (export_id, query criteria, actor, tenant, integrity status, audit ids) are reserved; full evidence package export is deferred (USF-147).

## 16. Quotas and abuse control (reserved)

Fields: tenant_storage_quota, tenant_file_count_quota, max_file_size (enforced), max_upload_rate, max_download_rate, max_multipart_parts, temporary_upload_expiry. Quota failures fail closed and are auditable; rate limiting + temporary-upload cleanup are deferred (USF-147).

## 17. Validator expectations

`tools/validate-parity/validate-files.py` fails closed when: classification model missing; file metadata not tenant-scoped/FORCE-RLS; object-key safety missing; upload validation not fail-closed; downloads not scan/lifecycle gated; routes not PDP/tenant-guarded; file actions not audited; legal hold does not block purge; views expose object keys; a secret/credential appears in OpenAPI; live object-store/scanner/provider/production-live is overclaimed; integrity not verifiable; or the parity matrix files row lacks tests/proofs. Each rule has a planted defect under `tools/validate-parity/files-planted-defects`. The DB substrate is additionally enforced by `validate-db.py` (files classified tenant-scoped, RLS, tenant index).

## 18. Deferred files/storage depth (USF-147)

Live MinIO/S3 object-store adapter + presigned URLs; live ClamAV/antivirus + DLP scanner; DB-backed file-metadata runtime adapter (shares USF-139 pg adapter); derived objects (preview/thumbnail/OCR/index); object versioning; backup/restore/DR; encryption/KMS; data residency enforcement; quotas/rate limiting + temporary-upload cleanup; evidence package export; object-lock/WORM. Each has a retry condition in USF-147. None is overclaimed in the parity matrix while open.
