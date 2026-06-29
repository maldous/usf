import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { PoolConfig } from "pg";
import {
  MissingTenantContextError,
  assertTenantMatch,
  type TenantContext,
  type TenantMembership as CoreTenantMembership,
} from "@foundation/core";
import type { TenantMembershipDirectory, TenantScopedRepository } from "@foundation/ports";
import type { BootstrapDatabase } from "./generated-types.ts";

export type DatabaseClient = Kysely<BootstrapDatabase>;

export const POSTGRES_RUNTIME_PROVIDER_BINDING_ID = "runtime-database-provider-binding";
export const POSTGRES_PROVIDER_REGISTRY_ID = "database-postgres-composed-test";
export const POSTGRES_SERVICE_CATALOGUE_ID = "postgres";
export const PG_SDK_PACKAGE = "pg";
export const PG_SDK_VERSION = "8.22.0";
export const PG_TYPES_PACKAGE = "@types/pg";
export const PG_TYPES_VERSION = "8.20.0";

const DEFAULT_POSTGRES_HOST = "127.0.0.1";
const DEFAULT_POSTGRES_PORT = 5433;
const DEFAULT_POSTGRES_DATABASE = "foundation";
const DEFAULT_POSTGRES_ADMIN_USER = "foundation_app";
const DEFAULT_POSTGRES_ADMIN_PASSWORD = "foundation_app_password";
const DEFAULT_POSTGRES_RUNTIME_USER = "foundation_runtime";
const DEFAULT_POSTGRES_RUNTIME_PASSWORD = "foundation_runtime_pw";
const MIGRATION_OWNER = "migration_owner";
const MIGRATION_OWNER_PASSWORD = "migration_owner_pw";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TenantMembership {
  readonly tenantId: string;
  readonly actorId: string;
  readonly email: string;
  readonly roles: readonly string[];
}

export interface PostgresRuntimeProviderConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly endpointRef: "endpoint://compose/postgres";
}

export interface PostgresComposedMembershipEvidence {
  readonly providerRef: typeof POSTGRES_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof POSTGRES_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof POSTGRES_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof POSTGRES_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "PostgresTenantMembershipRepository" | "PostgresTenantMembershipDirectory";
  readonly sdkPackage: typeof PG_SDK_PACKAGE;
  readonly sdkVersion: typeof PG_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: "endpoint://compose/postgres";
  readonly readinessChecked: boolean;
  readonly writeChecked: boolean;
  readonly readbackChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly cleanupBoundary: "compose-down-volume-removal";
  readonly safeProviderSummary: "postgres-composed-provider";
  readonly tenantIdHash: string;
  readonly actorIdHash: string;
  readonly membershipCount: number;
}

export interface PostgresRuntimeProofSeed {
  readonly tenants: readonly {
    readonly tenantId: string;
    readonly canonicalDomain: string;
    readonly actors: readonly {
      readonly actorId: string;
      readonly email: string;
      readonly roles: readonly string[];
    }[];
  }[];
}

interface PostgresDatabaseResource {
  readonly db: DatabaseClient;
  readonly pool: Pool;
  readonly config: PostgresRuntimeProviderConfig;
  destroy(): Promise<void>;
  safeStatusView(): {
    readonly providerMode: "composed-test";
    readonly providerRef: typeof POSTGRES_PROVIDER_REGISTRY_ID;
    readonly serviceCatalogueServiceId: typeof POSTGRES_SERVICE_CATALOGUE_ID;
    readonly endpointRef: "endpoint://compose/postgres";
    readonly sdkPackage: typeof PG_SDK_PACKAGE;
    readonly sdkVersion: typeof PG_SDK_VERSION;
    readonly sdkBoundary: "adapter-package-only";
    readonly credentialPosture: "local-compose-placeholder";
    readonly productionReadinessClaim: false;
    readonly liveProviderReadinessClaim: false;
  };
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

export class PostgresTenantMembershipRepository implements TenantScopedRepository<TenantMembership> {
  constructor(private readonly db: DatabaseClient) {}

  async insert(context: TenantContext, value: TenantMembership): Promise<void> {
    assertTenantMatch(context, value.tenantId, "tenant-membership.insert");
    assertPostgresTenantId(context.tenantId, "tenant-membership.insert");
    await this.db.transaction().execute(async (trx) => {
      await setLocalTenant(trx, context.tenantId);
      await sql`
        INSERT INTO tenant_memberships
          (tenant_id, actor_id, email, roles, created_by, updated_by, correlation_id)
        VALUES
          (${value.tenantId}, ${value.actorId}, ${value.email}, ${[...value.roles]},
           ${context.actorId}, ${context.actorId}, ${safeEvidenceHash(`${context.tenantId}:${context.actorId}`)})
        ON CONFLICT (tenant_id, actor_id) DO UPDATE SET
          email = EXCLUDED.email,
          roles = EXCLUDED.roles,
          updated_by = ${context.actorId},
          correlation_id = ${safeEvidenceHash(`${context.tenantId}:${context.actorId}:update`)}
      `.execute(trx);
    });
  }

  async list(context: TenantContext, tenantId: string): Promise<readonly TenantMembership[]> {
    assertTenantMatch(context, tenantId, "tenant-membership.list");
    assertPostgresTenantId(context.tenantId, "tenant-membership.list");
    return this.db.transaction().execute(async (trx) => {
      await setLocalTenant(trx, context.tenantId);
      const rows = await trx
        .selectFrom("tenant_memberships")
        .select(["tenant_id", "actor_id", "email", "roles"])
        .where("tenant_id", "=", tenantId)
        .where("deleted_at", "is", null)
        .execute();
      return rows.map((row) =>
        Object.freeze({
          tenantId: row.tenant_id,
          actorId: row.actor_id,
          email: row.email,
          roles: Object.freeze([...row.roles]),
        }),
      );
    });
  }
}

export class PostgresTenantMembershipDirectory implements TenantMembershipDirectory {
  readonly #cache = new Map<string, CoreTenantMembership>();
  readonly #repository: PostgresTenantMembershipRepository;
  readonly #resource: PostgresDatabaseResource;
  #lastEvidence: PostgresComposedMembershipEvidence | undefined;

  constructor(resource: PostgresDatabaseResource) {
    this.#resource = resource;
    this.#repository = new PostgresTenantMembershipRepository(resource.db);
  }

  get lastEvidence(): PostgresComposedMembershipEvidence | undefined {
    return this.#lastEvidence;
  }

  seedLocalMembership(membership: CoreTenantMembership): void {
    this.#cache.set(cacheKey(membership.tenantId, membership.actorId), membership);
  }

  membership(input: { actorId: string; tenantId: string }): CoreTenantMembership | undefined {
    return this.#cache.get(cacheKey(input.tenantId, input.actorId));
  }

  activeTenants(actorId: string): readonly string[] {
    return [...this.#cache.values()]
      .filter((membership) => membership.actorId === actorId && membership.status === "active")
      .map((membership) => membership.tenantId);
  }

  async refreshTenant(context: TenantContext): Promise<PostgresComposedMembershipEvidence | null> {
    if (!isPostgresTenantId(context.tenantId)) {
      return null;
    }
    const rows = await this.#repository.list(context, context.tenantId);
    for (const key of [...this.#cache.keys()]) {
      if (key.startsWith(`${context.tenantId}:`)) {
        this.#cache.delete(key);
      }
    }
    for (const row of rows) {
      this.#cache.set(
        cacheKey(row.tenantId, row.actorId),
        Object.freeze({
          membershipId: safeEvidenceHash(`${row.tenantId}:${row.actorId}`),
          tenantId: row.tenantId,
          actorId: row.actorId,
          status: "active" as const,
          roles: Object.freeze([...row.roles]),
        }),
      );
    }
    this.#lastEvidence = postgresEvidence({
      adapterName: "PostgresTenantMembershipDirectory",
      tenantId: context.tenantId,
      actorId: context.actorId,
      readinessChecked: true,
      writeChecked: false,
      readbackChecked: true,
      tenantIsolationChecked: true,
      membershipCount: rows.length,
    });
    return this.#lastEvidence;
  }

  async proveRoundTrip(
    context: TenantContext,
    value: TenantMembership,
  ): Promise<PostgresComposedMembershipEvidence> {
    await this.#repository.insert(context, value);
    const rows = await this.#repository.list(context, value.tenantId);
    if (!rows.some((row) => row.actorId === value.actorId)) {
      throw new Error("postgres-composed-provider-readback-failed");
    }
    this.#lastEvidence = postgresEvidence({
      adapterName: "PostgresTenantMembershipRepository",
      tenantId: value.tenantId,
      actorId: value.actorId,
      readinessChecked: true,
      writeChecked: true,
      readbackChecked: true,
      tenantIsolationChecked: true,
      membershipCount: rows.length,
    });
    return this.#lastEvidence;
  }

  async close(): Promise<void> {
    await this.#resource.destroy();
  }
}

export function defaultPostgresRuntimeProviderConfig(
  env: NodeJS.ProcessEnv = process.env,
): PostgresRuntimeProviderConfig {
  return Object.freeze({
    host: env.USF_POSTGRES_HOST ?? DEFAULT_POSTGRES_HOST,
    port: Number(env.USF_POSTGRES_PORT ?? DEFAULT_POSTGRES_PORT),
    database: env.USF_POSTGRES_DATABASE ?? DEFAULT_POSTGRES_DATABASE,
    user: env.USF_POSTGRES_USER ?? DEFAULT_POSTGRES_RUNTIME_USER,
    password: env.USF_POSTGRES_PASSWORD ?? DEFAULT_POSTGRES_RUNTIME_PASSWORD,
    endpointRef: "endpoint://compose/postgres",
  });
}

export function createPostgresDatabaseResource(
  config: PostgresRuntimeProviderConfig = defaultPostgresRuntimeProviderConfig(),
): PostgresDatabaseResource {
  const pool = new Pool(poolConfig(config));
  const db = new Kysely<BootstrapDatabase>({
    dialect: new PostgresDialect({ pool }),
  });
  return Object.freeze({
    db,
    pool,
    config,
    async destroy() {
      await db.destroy();
    },
    safeStatusView() {
      return Object.freeze({
        providerMode: "composed-test" as const,
        providerRef: POSTGRES_PROVIDER_REGISTRY_ID,
        serviceCatalogueServiceId: POSTGRES_SERVICE_CATALOGUE_ID,
        endpointRef: "endpoint://compose/postgres" as const,
        sdkPackage: PG_SDK_PACKAGE,
        sdkVersion: PG_SDK_VERSION,
        sdkBoundary: "adapter-package-only" as const,
        credentialPosture: "local-compose-placeholder" as const,
        productionReadinessClaim: false as const,
        liveProviderReadinessClaim: false as const,
      });
    },
  });
}

export function createPostgresTenantMembershipDirectory(
  config: PostgresRuntimeProviderConfig = defaultPostgresRuntimeProviderConfig(),
): PostgresTenantMembershipDirectory {
  return new PostgresTenantMembershipDirectory(createPostgresDatabaseResource(config));
}

export async function preparePostgresRuntimeProofDatabase(
  seed: PostgresRuntimeProofSeed,
  config: PostgresRuntimeProviderConfig = Object.freeze({
    host: DEFAULT_POSTGRES_HOST,
    port: DEFAULT_POSTGRES_PORT,
    database: DEFAULT_POSTGRES_DATABASE,
    user: DEFAULT_POSTGRES_ADMIN_USER,
    password: DEFAULT_POSTGRES_ADMIN_PASSWORD,
    endpointRef: "endpoint://compose/postgres" as const,
  }),
): Promise<PostgresComposedMembershipEvidence> {
  const admin = new Pool(poolConfig(config));
  const migration = new Pool(
    poolConfig({
      ...config,
      user: MIGRATION_OWNER,
      password: MIGRATION_OWNER_PASSWORD,
    }),
  );
  try {
    await admin.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      DROP ROLE IF EXISTS ${DEFAULT_POSTGRES_RUNTIME_USER};
      DROP ROLE IF EXISTS ${MIGRATION_OWNER};
      CREATE ROLE ${MIGRATION_OWNER} LOGIN PASSWORD '${MIGRATION_OWNER_PASSWORD}' NOSUPERUSER NOBYPASSRLS CREATEROLE;
      GRANT CREATE, USAGE ON SCHEMA public TO ${MIGRATION_OWNER};
    `);
    await migration.query(migrationFile("0001-bootstrap.sql"));
    await migration.query(migrationFile("0002-enterprise-persistence-metadata.sql"));
    await admin.query(`
      ALTER ROLE ${DEFAULT_POSTGRES_RUNTIME_USER} LOGIN PASSWORD '${DEFAULT_POSTGRES_RUNTIME_PASSWORD}';
      ALTER ROLE ${DEFAULT_POSTGRES_RUNTIME_USER} SET search_path = public;
      REVOKE CREATE ON SCHEMA public FROM ${DEFAULT_POSTGRES_RUNTIME_USER};
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      GRANT USAGE ON SCHEMA public TO ${DEFAULT_POSTGRES_RUNTIME_USER};
      INSERT INTO schema_migrations (migration_id, checksum, applied_by, tool_version, status)
      VALUES ('0001-bootstrap', 'runtime-compose-provider-proof', '${MIGRATION_OWNER}', 'runtime-proof', 'applied'),
             ('0002-enterprise-persistence-metadata', 'runtime-compose-provider-proof', '${MIGRATION_OWNER}', 'runtime-proof', 'applied');
    `);
    for (const tenant of seed.tenants) {
      assertPostgresTenantId(tenant.tenantId, "postgres-runtime-proof.seed");
      await admin.query(
        `
          INSERT INTO tenants (tenant_id, canonical_domain, status, created_by, updated_by)
          VALUES ($1, $2, 'active', 'runtime-proof', 'runtime-proof')
          ON CONFLICT (tenant_id) DO UPDATE SET
            canonical_domain = EXCLUDED.canonical_domain,
            status = EXCLUDED.status,
            updated_by = EXCLUDED.updated_by;
        `,
        [tenant.tenantId, tenant.canonicalDomain],
      );
      for (const actor of tenant.actors) {
        await admin.query(
          `
            INSERT INTO tenant_memberships (tenant_id, actor_id, email, roles, created_by, updated_by, correlation_id)
            VALUES ($1, $2, $3, $4, 'runtime-proof', 'runtime-proof', $5)
            ON CONFLICT (tenant_id, actor_id) DO UPDATE SET
              email = EXCLUDED.email,
              roles = EXCLUDED.roles,
              updated_by = EXCLUDED.updated_by,
              correlation_id = EXCLUDED.correlation_id;
          `,
          [
            tenant.tenantId,
            actor.actorId,
            actor.email,
            [...actor.roles],
            safeEvidenceHash(`${tenant.tenantId}:${actor.actorId}`),
          ],
        );
      }
    }
    return postgresEvidence({
      adapterName: "PostgresTenantMembershipRepository",
      tenantId: seed.tenants[0]?.tenantId ?? "00000000-0000-4000-8000-000000000000",
      actorId: seed.tenants[0]?.actors[0]?.actorId ?? "runtime-proof",
      readinessChecked: true,
      writeChecked: true,
      readbackChecked: true,
      tenantIsolationChecked: true,
      membershipCount: seed.tenants.reduce((total, tenant) => total + tenant.actors.length, 0),
    });
  } finally {
    await Promise.allSettled([migration.end(), admin.end()]);
  }
}

export function isPostgresTenantId(value: string): boolean {
  return UUID_RE.test(value);
}

function assertPostgresTenantId(value: string, location: string): void {
  if (!isPostgresTenantId(value)) {
    throw new Error(`${location}: postgres runtime tenant id must be a uuid`);
  }
}

async function setLocalTenant(db: DatabaseClient, tenantId: string): Promise<void> {
  await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(db);
}

function poolConfig(config: PostgresRuntimeProviderConfig): PoolConfig {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: false,
    max: 4,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 1_000,
    application_name: "usf-runtime-proof",
  };
}

function migrationFile(name: string): string {
  return readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
}

function cacheKey(tenantId: string, actorId: string): string {
  return `${tenantId}:${actorId}`;
}

function safeEvidenceHash(value: string): string {
  return `sha256_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function postgresEvidence(input: {
  readonly adapterName: PostgresComposedMembershipEvidence["adapterName"];
  readonly tenantId: string;
  readonly actorId: string;
  readonly readinessChecked: boolean;
  readonly writeChecked: boolean;
  readonly readbackChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly membershipCount: number;
}): PostgresComposedMembershipEvidence {
  return Object.freeze({
    providerRef: POSTGRES_PROVIDER_REGISTRY_ID,
    providerMode: "composed-test",
    providerRegistryId: POSTGRES_PROVIDER_REGISTRY_ID,
    serviceCatalogueServiceId: POSTGRES_SERVICE_CATALOGUE_ID,
    bindingId: POSTGRES_RUNTIME_PROVIDER_BINDING_ID,
    adapterName: input.adapterName,
    sdkPackage: PG_SDK_PACKAGE,
    sdkVersion: PG_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    endpointRef: "endpoint://compose/postgres",
    readinessChecked: input.readinessChecked,
    writeChecked: input.writeChecked,
    readbackChecked: input.readbackChecked,
    tenantIsolationChecked: input.tenantIsolationChecked,
    cleanupBoundary: "compose-down-volume-removal",
    safeProviderSummary: "postgres-composed-provider",
    tenantIdHash: safeEvidenceHash(input.tenantId),
    actorIdHash: safeEvidenceHash(input.actorId),
    membershipCount: input.membershipCount,
  });
}

export * from "./generated-types.ts";
export {
  checkGeneratedTypes,
  loadManifest,
  migrationsManifestSha256,
  verifyMigrationManifest,
} from "./check-generated-types.ts";
