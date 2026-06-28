export interface TenantsTable {
  tenant_id: string;
  canonical_domain: string;
  status: "active" | "suspended";
}

export interface TenantMembershipsTable {
  tenant_id: string;
  actor_id: string;
  email: string;
  roles: string[];
}

export interface AuditLedgerTable {
  audit_id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  subject: string;
  occurred_at: Date;
  metadata: Record<string, string>;
}

export interface BreakGlassGrantsTable {
  grant_id: string;
  tenant_id: string;
  requester_id: string;
  approver_id: string;
  reason: string;
  scope: string;
  expires_at: Date;
}

export interface BootstrapDatabase {
  tenants: TenantsTable;
  tenant_memberships: TenantMembershipsTable;
  audit_ledger: AuditLedgerTable;
  break_glass_grants: BreakGlassGrantsTable;
}

export const generatedFromMigrationSha256 =
  "9920ddd66ba6be66b87a3434bd01eaafc48dfdc166cb501992b7bc36b0707af0";
