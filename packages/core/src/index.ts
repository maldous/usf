export type ProviderMode = "hermetic-mock" | "local-composed-real-service";

export type ExecutionEnvironment = "hermetic" | "local" | "integration";

export type PersistentObjectClassification =
  | "tenant-scoped"
  | "global-reference"
  | "system-internal"
  | "cross-tenant-aggregate"
  | "audit-evidence"
  | "migration-control-plane";

export interface TenantContext {
  readonly tenantId: string;
  readonly actorId: string;
  readonly roles: readonly string[];
  readonly providerMode: ProviderMode;
  readonly environment: ExecutionEnvironment;
}

export interface IdentityClaims {
  readonly subject: string;
  readonly tenantId: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly providerMode: ProviderMode;
}

export interface AuditRecord {
  readonly id: string;
  readonly action: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly subject: string;
  readonly occurredAt: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export class TenantMismatchError extends Error {
  constructor(expectedTenant: string, observedTenant: string, location: string) {
    super(`Tenant mismatch at ${location}: expected ${expectedTenant}, observed ${observedTenant}`);
    this.name = "TenantMismatchError";
  }
}

export class MissingTenantContextError extends Error {
  constructor(location: string) {
    super(`Missing tenant context at ${location}`);
    this.name = "MissingTenantContextError";
  }
}

export function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} must be non-empty`);
  }
  return trimmed;
}

export function assertTenantMatch(
  context: TenantContext,
  observedTenantId: string,
  location: string,
): void {
  const observed = assertNonEmpty(observedTenantId, `${location}.tenantId`);
  if (context.tenantId !== observed) {
    throw new TenantMismatchError(context.tenantId, observed, location);
  }
}

export function createTenantContext(input: {
  tenantId: string;
  actorId: string;
  roles?: readonly string[];
  providerMode?: ProviderMode;
  environment?: ExecutionEnvironment;
}): TenantContext {
  return Object.freeze({
    tenantId: assertNonEmpty(input.tenantId, "tenantId"),
    actorId: assertNonEmpty(input.actorId, "actorId"),
    roles: Object.freeze([...(input.roles ?? [])]),
    providerMode: input.providerMode ?? "hermetic-mock",
    environment: input.environment ?? "hermetic",
  });
}

export function createAuditRecord(input: {
  id: string;
  action: string;
  tenantId: string;
  actorId: string;
  subject: string;
  metadata?: Readonly<Record<string, string>>;
  occurredAt?: string;
}): AuditRecord {
  return Object.freeze({
    id: assertNonEmpty(input.id, "id"),
    action: assertNonEmpty(input.action, "action"),
    tenantId: assertNonEmpty(input.tenantId, "tenantId"),
    actorId: assertNonEmpty(input.actorId, "actorId"),
    subject: assertNonEmpty(input.subject, "subject"),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

export function stableId(prefix: string, parts: readonly string[]): string {
  return `${assertNonEmpty(prefix, "prefix")}_${parts.map((part) => assertNonEmpty(part, "idPart")).join("_")}`;
}
