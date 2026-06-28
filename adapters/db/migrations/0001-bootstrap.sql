CREATE TABLE tenants (
  tenant_id uuid PRIMARY KEY,
  canonical_domain text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'suspended'))
);

CREATE TABLE tenant_memberships (
  tenant_id uuid NOT NULL REFERENCES tenants (tenant_id),
  actor_id text NOT NULL,
  email text NOT NULL,
  roles text[] NOT NULL,
  PRIMARY KEY (tenant_id, actor_id)
);

CREATE TABLE audit_ledger (
  audit_id text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants (tenant_id),
  actor_id text NOT NULL,
  action text NOT NULL,
  subject text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE break_glass_grants (
  grant_id text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants (tenant_id),
  requester_id text NOT NULL,
  approver_id text NOT NULL,
  reason text NOT NULL,
  scope text NOT NULL,
  expires_at timestamptz NOT NULL,
  CHECK (requester_id <> approver_id)
);

ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE break_glass_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_glass_grants FORCE ROW LEVEL SECURITY;

CREATE FUNCTION app_tenant_id() RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE POLICY tenant_memberships_isolation ON tenant_memberships
  USING (tenant_id = app_tenant_id())
  WITH CHECK (tenant_id = app_tenant_id());

CREATE POLICY audit_ledger_isolation ON audit_ledger
  USING (tenant_id = app_tenant_id())
  WITH CHECK (tenant_id = app_tenant_id());

CREATE POLICY break_glass_scoped_access ON break_glass_grants
  USING (tenant_id = app_tenant_id())
  WITH CHECK (tenant_id = app_tenant_id());

CREATE ROLE foundation_runtime NOINHERIT;
GRANT SELECT, INSERT, UPDATE ON tenant_memberships TO foundation_runtime;
GRANT SELECT, INSERT ON audit_ledger TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE ON break_glass_grants TO foundation_runtime;

-- The application runtime role must never be SUPERUSER and must never have BYPASSRLS.
-- Every tenant-scoped transaction must set LOCAL app.tenant_id before data access.
