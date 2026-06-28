-- Enterprise persistence metadata and classification standard (USF-138 parity-db).
-- Forward-only migration. Adds lifecycle, actor, trace/correlation, integrity, and
-- retention metadata per persistent-object classification, a migration-control-plane
-- table, and integrity guardrail triggers. See
-- docs/architecture/enterprise-persistence-metadata-and-classification-standard.md
-- and docs/architecture/persistent-object-classification-registry.json.

-- Shared check helpers expressed inline per column.

-- global-reference: tenants
ALTER TABLE tenants ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE tenants ADD COLUMN created_by text NOT NULL DEFAULT 'system:migration';
ALTER TABLE tenants ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE tenants ADD COLUMN updated_by text NOT NULL DEFAULT 'system:migration';
ALTER TABLE tenants ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE tenants ADD COLUMN data_classification text NOT NULL DEFAULT 'internal' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted', 'security-sensitive'));
ALTER TABLE tenants ADD COLUMN retention_policy text NOT NULL DEFAULT 'standard' CHECK (retention_policy IN ('standard', 'audit', 'security', 'legal', 'transient', 'custom'));

-- tenant-scoped: tenant_memberships (full standard exemplar)
ALTER TABLE tenant_memberships ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE tenant_memberships ADD COLUMN created_by text NOT NULL DEFAULT 'system:migration';
ALTER TABLE tenant_memberships ADD COLUMN created_by_subject text;
ALTER TABLE tenant_memberships ADD COLUMN created_by_provider text;
ALTER TABLE tenant_memberships ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE tenant_memberships ADD COLUMN updated_by text NOT NULL DEFAULT 'system:migration';
ALTER TABLE tenant_memberships ADD COLUMN updated_by_subject text;
ALTER TABLE tenant_memberships ADD COLUMN updated_by_provider text;
ALTER TABLE tenant_memberships ADD COLUMN deleted_at timestamptz;
ALTER TABLE tenant_memberships ADD COLUMN deleted_by text;
ALTER TABLE tenant_memberships ADD COLUMN deleted_reason text;
ALTER TABLE tenant_memberships ADD COLUMN restored_at timestamptz;
ALTER TABLE tenant_memberships ADD COLUMN restored_by text;
ALTER TABLE tenant_memberships ADD COLUMN restored_reason text;
ALTER TABLE tenant_memberships ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE tenant_memberships ADD COLUMN row_hash text;
ALTER TABLE tenant_memberships ADD COLUMN correlation_id text NOT NULL DEFAULT 'system:migration';
ALTER TABLE tenant_memberships ADD COLUMN causation_id text;
ALTER TABLE tenant_memberships ADD COLUMN trace_id text;
ALTER TABLE tenant_memberships ADD COLUMN request_id text;
ALTER TABLE tenant_memberships ADD COLUMN source_system text NOT NULL DEFAULT 'usf-foundation';
ALTER TABLE tenant_memberships ADD COLUMN source_event_id text;
ALTER TABLE tenant_memberships ADD COLUMN data_classification text NOT NULL DEFAULT 'confidential' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted', 'security-sensitive'));
ALTER TABLE tenant_memberships ADD COLUMN retention_policy text NOT NULL DEFAULT 'standard' CHECK (retention_policy IN ('standard', 'audit', 'security', 'legal', 'transient', 'custom'));
ALTER TABLE tenant_memberships ADD COLUMN legal_hold boolean NOT NULL DEFAULT false;

-- tenant-scoped: break_glass_grants (required set; requester/approver already present)
ALTER TABLE break_glass_grants ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE break_glass_grants ADD COLUMN created_by text NOT NULL DEFAULT 'system:migration';
ALTER TABLE break_glass_grants ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE break_glass_grants ADD COLUMN updated_by text NOT NULL DEFAULT 'system:migration';
ALTER TABLE break_glass_grants ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE break_glass_grants ADD COLUMN correlation_id text NOT NULL DEFAULT 'system:migration';
ALTER TABLE break_glass_grants ADD COLUMN trace_id text;
ALTER TABLE break_glass_grants ADD COLUMN data_classification text NOT NULL DEFAULT 'security-sensitive' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted', 'security-sensitive'));
ALTER TABLE break_glass_grants ADD COLUMN retention_policy text NOT NULL DEFAULT 'security' CHECK (retention_policy IN ('standard', 'audit', 'security', 'legal', 'transient', 'custom'));
ALTER TABLE break_glass_grants ADD COLUMN legal_hold boolean NOT NULL DEFAULT false;

-- append-only-ledger: audit_ledger (audit_id is the id; occurred_at/tenant_id/actor_id/action present)
ALTER TABLE audit_ledger ADD COLUMN recorded_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE audit_ledger ADD COLUMN subject_type text NOT NULL DEFAULT 'unspecified';
ALTER TABLE audit_ledger ADD COLUMN subject_id text NOT NULL DEFAULT 'unspecified';
ALTER TABLE audit_ledger ADD COLUMN outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'denied'));
ALTER TABLE audit_ledger ADD COLUMN correlation_id text;
ALTER TABLE audit_ledger ADD COLUMN causation_id text;
ALTER TABLE audit_ledger ADD COLUMN trace_id text;
ALTER TABLE audit_ledger ADD COLUMN source_system text NOT NULL DEFAULT 'usf-foundation';
ALTER TABLE audit_ledger ADD COLUMN data_classification text NOT NULL DEFAULT 'security-sensitive' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted', 'security-sensitive'));
ALTER TABLE audit_ledger ADD COLUMN retention_policy text NOT NULL DEFAULT 'audit' CHECK (retention_policy IN ('standard', 'audit', 'security', 'legal', 'transient', 'custom'));
ALTER TABLE audit_ledger ADD COLUMN row_hash text;
ALTER TABLE audit_ledger ADD COLUMN previous_hash text;

-- migration-control-plane: schema_migrations
CREATE TABLE schema_migrations (
  migration_id text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text NOT NULL,
  tool_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('applied', 'rolled-back', 'failed'))
);

-- Integrity guardrail: created_at/created_by immutable; updated_at refreshed; version incremented.
CREATE FUNCTION enforce_row_lifecycle() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable';
  END IF;
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenants_lifecycle BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION enforce_row_lifecycle();
CREATE TRIGGER tenant_memberships_lifecycle BEFORE UPDATE ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION enforce_row_lifecycle();
CREATE TRIGGER break_glass_grants_lifecycle BEFORE UPDATE ON break_glass_grants
  FOR EACH ROW EXECUTE FUNCTION enforce_row_lifecycle();

-- Integrity guardrail: legal_hold prevents destructive delete on tenant-scoped tables.
CREATE FUNCTION enforce_legal_hold() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.legal_hold THEN
    RAISE EXCEPTION 'legal_hold prevents destructive delete';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER tenant_memberships_legal_hold BEFORE DELETE ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION enforce_legal_hold();
CREATE TRIGGER break_glass_grants_legal_hold BEFORE DELETE ON break_glass_grants
  FOR EACH ROW EXECUTE FUNCTION enforce_legal_hold();

-- Integrity guardrail: audit_ledger is append-only (no update/delete) with a per-tenant hash chain.
CREATE FUNCTION audit_ledger_append_only() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_ledger is append-only; corrections must be compensating records';
END;
$$;

CREATE TRIGGER audit_ledger_no_mutation BEFORE UPDATE OR DELETE ON audit_ledger
  FOR EACH ROW EXECUTE FUNCTION audit_ledger_append_only();

CREATE FUNCTION audit_ledger_hash_chain() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prev text;
BEGIN
  IF NEW.recorded_at IS NULL THEN
    NEW.recorded_at := now();
  END IF;
  -- Serialize chain computation per tenant so concurrent same-tenant inserts cannot
  -- both read the same previous_hash and fork the append-only chain. The advisory lock
  -- is transaction-scoped and auto-releases at commit/rollback.
  PERFORM pg_advisory_xact_lock(hashtext('audit_ledger_chain'), hashtext(NEW.tenant_id::text));
  SELECT row_hash INTO prev
  FROM audit_ledger
  WHERE tenant_id = NEW.tenant_id
  ORDER BY recorded_at DESC, audit_id DESC
  LIMIT 1;
  NEW.previous_hash := prev;
  NEW.row_hash := encode(
    sha256(convert_to(
      coalesce(NEW.audit_id, '') || '|' ||
      coalesce(NEW.tenant_id::text, '') || '|' ||
      coalesce(NEW.actor_id, '') || '|' ||
      coalesce(NEW.action, '') || '|' ||
      coalesce(NEW.subject_type, '') || '|' ||
      coalesce(NEW.subject_id, '') || '|' ||
      coalesce(NEW.outcome, '') || '|' ||
      coalesce(prev, ''),
      'UTF8')),
    'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_ledger_chain BEFORE INSERT ON audit_ledger
  FOR EACH ROW EXECUTE FUNCTION audit_ledger_hash_chain();

-- Tenant-scoped indexing: RLS predicates are keyed on tenant_id, so tenant_id must be
-- indexed; active-row paths use a partial index over non-deleted rows.
CREATE INDEX tenant_memberships_tenant_idx ON tenant_memberships (tenant_id);
CREATE INDEX tenant_memberships_active_idx ON tenant_memberships (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX audit_ledger_tenant_recorded_idx ON audit_ledger (tenant_id, recorded_at);
CREATE INDEX break_glass_grants_tenant_idx ON break_glass_grants (tenant_id);

-- Purge capability for tenant_memberships is guarded by the legal_hold trigger above.
GRANT DELETE ON tenant_memberships TO foundation_runtime;

-- The application runtime role remains non-superuser, without BYPASSRLS, and is not the
-- owner of tenant-scoped tables. Append-only ledgers grant no UPDATE/DELETE to the role.
