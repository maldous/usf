// Generated DB type surface derived from the migrated schema under
// adapters/db/migrations (0001 + 0002). Freshness is pinned to the migration
// manifest SHA-256 and verified by check-generated-types.ts. Includes the
// enterprise persistence metadata columns required by
// docs/architecture/enterprise-persistence-metadata-and-classification-standard.md.

export type DataClassification =
  "public" | "internal" | "confidential" | "restricted" | "security-sensitive";

export type RetentionPolicy = "standard" | "audit" | "security" | "legal" | "transient" | "custom";

export type AuditOutcome = "success" | "failure" | "denied";

export type MigrationStatus = "applied" | "rolled-back" | "failed";

export interface TenantsTable {
  tenant_id: string;
  canonical_domain: string;
  status: "active" | "suspended";
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
  version: number;
  data_classification: DataClassification;
  retention_policy: RetentionPolicy;
}

export interface TenantMembershipsTable {
  tenant_id: string;
  actor_id: string;
  email: string;
  roles: string[];
  created_at: Date;
  created_by: string;
  created_by_subject: string | null;
  created_by_provider: string | null;
  updated_at: Date;
  updated_by: string;
  updated_by_subject: string | null;
  updated_by_provider: string | null;
  deleted_at: Date | null;
  deleted_by: string | null;
  deleted_reason: string | null;
  restored_at: Date | null;
  restored_by: string | null;
  restored_reason: string | null;
  version: number;
  row_hash: string | null;
  correlation_id: string;
  causation_id: string | null;
  trace_id: string | null;
  request_id: string | null;
  source_system: string;
  source_event_id: string | null;
  data_classification: DataClassification;
  retention_policy: RetentionPolicy;
  legal_hold: boolean;
}

export interface AuditLedgerTable {
  audit_id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  subject: string;
  occurred_at: Date;
  metadata: Record<string, string>;
  recorded_at: Date;
  subject_type: string;
  subject_id: string;
  outcome: AuditOutcome;
  correlation_id: string | null;
  causation_id: string | null;
  trace_id: string | null;
  source_system: string;
  data_classification: DataClassification;
  retention_policy: RetentionPolicy;
  row_hash: string | null;
  previous_hash: string | null;
}

export interface BreakGlassGrantsTable {
  grant_id: string;
  tenant_id: string;
  requester_id: string;
  approver_id: string;
  reason: string;
  scope: string;
  expires_at: Date;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
  version: number;
  correlation_id: string;
  trace_id: string | null;
  data_classification: DataClassification;
  retention_policy: RetentionPolicy;
  legal_hold: boolean;
}

export interface SchemaMigrationsTable {
  migration_id: string;
  checksum: string;
  applied_at: Date;
  applied_by: string;
  tool_version: string;
  status: MigrationStatus;
}

export interface BootstrapDatabase {
  tenants: TenantsTable;
  tenant_memberships: TenantMembershipsTable;
  audit_ledger: AuditLedgerTable;
  break_glass_grants: BreakGlassGrantsTable;
  schema_migrations: SchemaMigrationsTable;
}

// SHA-256 over the ordered per-file migration SHA-256 list in
// adapters/db/migrations/manifest.json. Regenerate these types and this pin when
// a new forward-only migration is added.
export const generatedFromMigrationsManifestSha256 =
  "d5a26062ad27a1d7ddc9567d4fd5a7c24036944d6479aa6ce4ce97a9b7a5396d";
