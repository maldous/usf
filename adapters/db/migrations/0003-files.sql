-- Files / object metadata (parity-files-storage, USF-146). Forward-only migration.
-- File metadata is the authoritative tenant-scoped record; the object store holds
-- blobs only. Tenant-scoped class (RLS + FORCE RLS), enterprise persistence metadata,
-- soft delete/restore, legal-hold purge-block, and integrity/scan posture fields. See
-- docs/architecture/files-and-object-storage-standard.md and the classification
-- registry. Reuses enforce_row_lifecycle()/enforce_legal_hold() from 0002.
CREATE TABLE files (
  file_id text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants (tenant_id),
  owner_actor_id text NOT NULL,
  object_key text NOT NULL,
  bucket text NOT NULL DEFAULT 'tenant-objects',
  provider_ref text NOT NULL DEFAULT 'in-memory',
  storage_class text NOT NULL DEFAULT 'standard',
  filename_original text NOT NULL,
  filename_safe text NOT NULL,
  content_type text NOT NULL,
  content_type_verified boolean NOT NULL DEFAULT false,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256 text,
  etag text,
  status text NOT NULL DEFAULT 'pending-upload' CHECK (status IN ('pending-upload', 'uploaded', 'available', 'quarantined', 'blocked', 'deleted', 'restored', 'purged', 'failed')),
  scan_status text NOT NULL DEFAULT 'not-required' CHECK (scan_status IN ('not-required', 'pending', 'clean', 'suspicious', 'infected', 'failed', 'quarantined', 'provider-unavailable')),
  quarantine_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system:migration',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'system:migration',
  deleted_at timestamptz,
  deleted_by text,
  deleted_reason text,
  restored_at timestamptz,
  restored_by text,
  version integer NOT NULL DEFAULT 1,
  correlation_id text NOT NULL DEFAULT 'system:migration',
  causation_id text,
  trace_id text,
  request_id text,
  source_system text NOT NULL DEFAULT 'usf-foundation',
  source_event_id text,
  data_classification text NOT NULL DEFAULT 'confidential' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted', 'security-sensitive')),
  retention_policy text NOT NULL DEFAULT 'standard' CHECK (retention_policy IN ('standard', 'audit', 'security', 'legal', 'transient', 'custom')),
  legal_hold boolean NOT NULL DEFAULT false,
  UNIQUE (tenant_id, object_key)
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;

CREATE POLICY files_isolation ON files
  USING (tenant_id = app_tenant_id())
  WITH CHECK (tenant_id = app_tenant_id());

-- Lifecycle (created_at/by immutable, version increment) and legal-hold purge-block
-- reuse the guardrail functions defined in 0002.
CREATE TRIGGER files_lifecycle BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION enforce_row_lifecycle();
CREATE TRIGGER files_legal_hold BEFORE DELETE ON files
  FOR EACH ROW EXECUTE FUNCTION enforce_legal_hold();

-- Tenant-scoped indexing (RLS predicate keyed on tenant_id); active-row partial index.
CREATE INDEX files_tenant_idx ON files (tenant_id);
CREATE INDEX files_tenant_status_idx ON files (tenant_id, status) WHERE deleted_at IS NULL;

-- The application runtime role may read/insert/update/delete its own tenant rows
-- (delete is guarded by the legal_hold BEFORE DELETE trigger). It remains a
-- non-superuser without BYPASSRLS and is not the table owner.
GRANT SELECT, INSERT, UPDATE ON files TO foundation_runtime;
GRANT DELETE ON files TO foundation_runtime;
