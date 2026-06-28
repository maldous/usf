import { MissingTenantContextError, assertTenantMatch, type TenantContext } from "@foundation/core";
import type { TenantScopedRepository } from "@foundation/ports";
import type { Kysely } from "kysely";
import type { BootstrapDatabase } from "./generated-types.ts";

export type DatabaseClient = Kysely<BootstrapDatabase>;

export interface TenantMembership {
  readonly tenantId: string;
  readonly actorId: string;
  readonly email: string;
  readonly roles: readonly string[];
}

export class RlsSession {
  constructor(private readonly context?: TenantContext) {}

  assertReady(location: string): TenantContext {
    if (!this.context) {
      throw new MissingTenantContextError(location);
    }
    return this.context;
  }

  assertTenant(tenantId: string, location: string): TenantContext {
    const context = this.assertReady(location);
    assertTenantMatch(context, tenantId, location);
    return context;
  }
}

export class InMemoryTenantMembershipRepository implements TenantScopedRepository<TenantMembership> {
  readonly #memberships = new Map<string, TenantMembership[]>();

  async insert(context: TenantContext, value: TenantMembership): Promise<void> {
    assertTenantMatch(context, value.tenantId, "tenant-membership.insert");
    const list = this.#memberships.get(context.tenantId) ?? [];
    list.push(value);
    this.#memberships.set(context.tenantId, list);
  }

  async list(context: TenantContext, tenantId: string): Promise<readonly TenantMembership[]> {
    assertTenantMatch(context, tenantId, "tenant-membership.list");
    return this.#memberships.get(tenantId) ?? [];
  }
}

export * from "./generated-types.ts";
export {
  checkGeneratedTypes,
  loadManifest,
  migrationsManifestSha256,
  verifyMigrationManifest,
} from "./check-generated-types.ts";
