-- Enterprise DB proof depth (USF-139). Forward-only migration.
-- Adds the remaining tenant-key guardrail that was previously represented as
-- tenant-scoped posture but not enforced by an explicit foreign key.

ALTER TABLE break_glass_grants
  ADD CONSTRAINT break_glass_grants_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES tenants (tenant_id);
