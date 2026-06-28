// Live composed-Postgres data-isolation proof (parity-db, USF-138).
//
// Proves the Enterprise Persistence Metadata and Classification Standard against a
// real Postgres substrate, under the ACTUAL runtime application role (not a table
// owner, migration owner, superuser, or convenience role), with migration-owner /
// app-runtime role separation. Run via `make db-proof` (brings up the composed
// Postgres, runs this, tears it down). Emits deterministic catalog evidence.
//
// This is hermetic/composed-local proof. It makes no live-external-provider or
// production-live claim.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const COMPOSE = ["compose", "-f", "compose.yaml", "exec", "-T", "postgres", "psql"];
const DB = "foundation";
const SUPER = "foundation_app";
const MIGRATION_OWNER = "migration_owner";
const APP_ROLE = "foundation_runtime";
const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

interface RunOptions {
  readonly expectFailure?: boolean;
  readonly errorContains?: string;
}

function psql(role: string, sql: string, opts: RunOptions = {}): string {
  const args = [
    ...COMPOSE,
    "-U",
    role,
    "-d",
    DB,
    "-v",
    "ON_ERROR_STOP=1",
    "-X",
    "-q",
    "-A",
    "-t",
    "-f",
    "-",
  ];
  let out: string;
  try {
    out = execFileSync("docker", args, { input: sql, encoding: "utf8" });
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    const detail = (err.stderr ?? err.message ?? "").toString();
    if (opts.expectFailure) {
      if (opts.errorContains && !detail.includes(opts.errorContains)) {
        throw new Error(
          `failure had wrong reason as ${role}: wanted "${opts.errorContains}" in:\n${detail}`,
          { cause: error },
        );
      }
      return detail.trim();
    }
    throw new Error(`unexpected failure as ${role}:\n${sql}\n--- psql ---\n${detail}`, {
      cause: error,
    });
  }
  if (opts.expectFailure) {
    throw new Error(`expected failure but SQL succeeded as ${role}:\n${sql}`);
  }
  return out.trim();
}

function scalar(role: string, sql: string): string {
  return psql(role, sql);
}

function migrationFile(file: string): string {
  return readFileSync(new URL(`../../../adapters/db/migrations/${file}`, import.meta.url), "utf8");
}

const checks: string[] = [];
function pass(label: string): void {
  checks.push(label);
}

function setup(): void {
  // Role infrastructure (created by the superuser only): a non-superuser DDL/owner
  // role and a separate non-superuser application role. The application role is a
  // real login role; it is NOT a member of the migration owner.
  psql(
    SUPER,
    `
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    DROP ROLE IF EXISTS ${APP_ROLE};
    DROP ROLE IF EXISTS ${MIGRATION_OWNER};
    CREATE ROLE ${MIGRATION_OWNER} LOGIN PASSWORD 'migration_owner_pw' NOSUPERUSER NOBYPASSRLS CREATEROLE;
    GRANT CREATE, USAGE ON SCHEMA public TO ${MIGRATION_OWNER};
  `,
  );
  // Migrations are applied by the migration owner (non-superuser), so it owns the
  // tenant-scoped tables and FORCE RLS applies even to the owner.
  psql(MIGRATION_OWNER, migrationFile("0001-bootstrap.sql"));
  psql(MIGRATION_OWNER, migrationFile("0002-enterprise-persistence-metadata.sql"));
  // Execution-environment lockdown for the application role (superuser-applied infra).
  psql(
    SUPER,
    `
    ALTER ROLE ${APP_ROLE} LOGIN PASSWORD 'foundation_runtime_pw';
    ALTER ROLE ${APP_ROLE} SET search_path = public;
    REVOKE CREATE ON SCHEMA public FROM ${APP_ROLE};
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
    INSERT INTO schema_migrations (migration_id, checksum, applied_by, tool_version, status)
    VALUES ('0001-bootstrap', 'composed-proof', '${MIGRATION_OWNER}', 'proof', 'applied'),
           ('0002-enterprise-persistence-metadata', 'composed-proof', '${MIGRATION_OWNER}', 'proof', 'applied');
  `,
  );
  // Seed cross-tenant data as the superuser (bypasses RLS) so the app-role proof can
  // demonstrate isolation. No real customer/tenant data; deterministic synthetic only.
  psql(
    SUPER,
    `
    INSERT INTO tenants (tenant_id, canonical_domain, status, created_by, updated_by)
    VALUES ('${TENANT_A}', 'tenant-a.example', 'active', 'seed', 'seed'),
           ('${TENANT_B}', 'tenant-b.example', 'active', 'seed', 'seed');
    INSERT INTO tenant_memberships (tenant_id, actor_id, email, roles, created_by, updated_by, correlation_id)
    VALUES ('${TENANT_A}', 'actor-a', 'a@tenant-a.example', ARRAY['tenant-admin'], 'seed', 'seed', 'corr-a'),
           ('${TENANT_B}', 'actor-b', 'b@tenant-b.example', ARRAY['tenant-admin'], 'seed', 'seed', 'corr-b');
    INSERT INTO audit_ledger (audit_id, tenant_id, actor_id, action, subject, subject_type, subject_id, outcome)
    VALUES ('aud-a-1', '${TENANT_A}', 'actor-a', 'login', 'session', 'session', 's-a-1', 'success'),
           ('aud-a-2', '${TENANT_A}', 'actor-a', 'logout', 'session', 'session', 's-a-1', 'success'),
           ('aud-b-1', '${TENANT_B}', 'actor-b', 'login', 'session', 'session', 's-b-1', 'success');
  `,
  );
  pass(
    "setup: migration-owner applied migrations; app role and lockdown configured; cross-tenant data seeded",
  );
}

function proveAppRolePosture(): void {
  const role = scalar(
    SUPER,
    `SELECT rolsuper::text || ',' || rolbypassrls::text || ',' || rolcreaterole::text FROM pg_roles WHERE rolname = '${APP_ROLE}';`,
  );
  if (role !== "false,false,false") {
    throw new Error(`app role posture wrong (super,bypassrls,createrole)=${role}`);
  }
  pass("app role is not superuser, has no BYPASSRLS, cannot create roles");

  const owner = scalar(
    SUPER,
    `SELECT r.rolname FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner WHERE c.relname = 'tenant_memberships';`,
  );
  if (owner === APP_ROLE) {
    throw new Error("app role must not own tenant_memberships");
  }
  pass(`tenant_memberships owned by ${owner}, not the app role`);

  // app role cannot SET ROLE into the elevated migration owner (not a member).
  psql(APP_ROLE, `SET ROLE ${MIGRATION_OWNER};`, { expectFailure: true });
  pass("app role cannot SET ROLE into the migration owner");

  // app role cannot disable RLS or run DDL.
  psql(APP_ROLE, `ALTER TABLE tenant_memberships DISABLE ROW LEVEL SECURITY;`, {
    expectFailure: true,
  });
  pass("app role cannot disable RLS");
  psql(APP_ROLE, `CREATE TABLE app_role_ddl_probe (id int);`, { expectFailure: true });
  pass("app role cannot run DDL");

  const searchPath = scalar(
    SUPER,
    `SELECT setconfig::text FROM pg_db_role_setting s JOIN pg_roles r ON r.oid = s.setrole WHERE r.rolname = '${APP_ROLE}';`,
  );
  if (!searchPath.includes("search_path=public")) {
    throw new Error(`app role search_path not locked: ${searchPath}`);
  }
  pass("app role has a fixed safe search_path");

  const secdef = scalar(
    SUPER,
    `SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef;`,
  );
  if (secdef !== "0") {
    throw new Error(`unexpected SECURITY DEFINER functions: ${secdef}`);
  }
  pass("no SECURITY DEFINER functions in public schema");
}

function proveRlsCatalog(): void {
  for (const table of ["tenant_memberships", "audit_ledger", "break_glass_grants"]) {
    const flags = scalar(
      SUPER,
      `SELECT relrowsecurity::text || ',' || relforcerowsecurity::text FROM pg_class WHERE relname = '${table}';`,
    );
    if (flags !== "true,true") {
      throw new Error(`${table} RLS catalog flags (enable,force)=${flags}`);
    }
  }
  pass("catalog confirms ENABLE + FORCE row level security on tenant-scoped/ledger tables");
}

function proveIsolationAndNoLeak(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    DO $$ DECLARE n int; BEGIN
      SELECT count(*) INTO n FROM tenant_memberships;
      IF n <> 1 THEN RAISE EXCEPTION 'tenant A should see exactly its own row, saw %', n; END IF;
      SELECT count(*) INTO n FROM tenant_memberships WHERE tenant_id = '${TENANT_B}';
      IF n <> 0 THEN RAISE EXCEPTION 'tenant A must not see tenant B rows, saw %', n; END IF;
    END $$;
    COMMIT;
    DO $$ DECLARE n int; BEGIN
      SELECT count(*) INTO n FROM tenant_memberships;
      IF n <> 0 THEN RAISE EXCEPTION 'SET LOCAL context leaked after commit, saw %', n; END IF;
    END $$;
  `,
  );
  pass(
    "tenant A is isolated from tenant B; SET LOCAL context does not leak after commit (no pooled-connection leak)",
  );

  // Missing tenant context fails closed (zero rows, not an error that exposes data).
  const noCtx = scalar(APP_ROLE, `SELECT count(*) FROM tenant_memberships;`);
  if (noCtx !== "0") {
    throw new Error(`missing tenant context must fail closed (0 rows), saw ${noCtx}`);
  }
  pass("missing tenant context fails closed (0 rows)");

  // Cross-tenant write blocked by WITH CHECK.
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    INSERT INTO tenant_memberships (tenant_id, actor_id, email, roles, created_by, updated_by, correlation_id)
    VALUES ('${TENANT_B}', 'cross', 'x@evil.example', ARRAY['x'], 'app', 'app', 'corr-x');
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("cross-tenant insert is blocked by the RLS WITH CHECK policy");
}

function proveLifecycle(): void {
  // created_at immutable.
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE tenant_memberships SET created_at = now() WHERE actor_id = 'actor-a';
    COMMIT;
  `,
    { expectFailure: true, errorContains: "created_at is immutable" },
  );
  pass("created_at is immutable (trigger blocks update)");

  // version increments on mutable update.
  const version =
    scalar(
      APP_ROLE,
      `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE tenant_memberships SET email = 'a2@tenant-a.example' WHERE actor_id = 'actor-a';
    SELECT version FROM tenant_memberships WHERE actor_id = 'actor-a';
    COMMIT;
  `,
    )
      .split("\n")
      .filter(Boolean)
      .pop() ?? "";
  if (version !== "2") {
    throw new Error(`version should increment to 2 on update, saw ${version}`);
  }
  pass("version increments on mutable update (optimistic-concurrency basis)");

  // soft delete remains tenant-isolated.
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE tenant_memberships SET deleted_at = now(), deleted_by = 'app', deleted_reason = 'test' WHERE actor_id = 'actor-a';
    DO $$ DECLARE n int; BEGIN
      SELECT count(*) INTO n FROM tenant_memberships WHERE deleted_at IS NOT NULL;
      IF n <> 1 THEN RAISE EXCEPTION 'soft-deleted row should remain visible to its tenant, saw %', n; END IF;
    END $$;
    COMMIT;
  `,
  );
  pass("soft-deleted tenant rows remain tenant-isolated and visible to their tenant");
}

function proveAppendOnlyAndChain(): void {
  // append-only ledger: app role has no UPDATE/DELETE privilege.
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE audit_ledger SET action = 'tamper' WHERE audit_id = 'aud-a-1';
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("audit ledger is append-only: app role cannot UPDATE audit rows");
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    DELETE FROM audit_ledger WHERE audit_id = 'aud-a-1';
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("audit ledger is append-only: app role cannot DELETE audit rows");

  // hash chain present and linked for tenant A's two audit rows.
  const chain =
    scalar(
      APP_ROLE,
      `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    SELECT bool_and(row_hash IS NOT NULL) FROM audit_ledger;
    COMMIT;
  `,
    )
      .split("\n")
      .filter(Boolean)
      .pop() ?? "";
  if (chain !== "t") {
    throw new Error(`audit rows should all carry row_hash, got ${chain}`);
  }
  const linked = scalar(
    SUPER,
    `SELECT count(*) FROM audit_ledger WHERE tenant_id = '${TENANT_A}' AND previous_hash IS NOT NULL;`,
  );
  if (linked !== "1") {
    throw new Error(
      `exactly one tenant-A audit row should chain to a previous_hash, got ${linked}`,
    );
  }
  pass("audit rows carry a row_hash and chain previous_hash per tenant");
}

function proveLegalHold(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE tenant_memberships SET legal_hold = true WHERE actor_id = 'actor-a';
    DO $$ BEGIN
      BEGIN
        DELETE FROM tenant_memberships WHERE actor_id = 'actor-a';
        RAISE EXCEPTION 'legal_hold did not block destructive delete';
      EXCEPTION WHEN others THEN
        IF SQLERRM LIKE '%legal_hold did not block%' THEN RAISE; END IF;
      END;
    END $$;
    COMMIT;
  `,
  );
  pass("legal_hold blocks destructive purge (BEFORE DELETE trigger)");
}

function emitCatalogEvidence(): Record<string, unknown> {
  const tables = scalar(
    SUPER,
    `SELECT string_agg(relname, ',' ORDER BY relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r';`,
  );
  const rlsTables = scalar(
    SUPER,
    `SELECT string_agg(relname, ',' ORDER BY relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relrowsecurity;`,
  );
  const forceTables = scalar(
    SUPER,
    `SELECT string_agg(relname, ',' ORDER BY relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relforcerowsecurity;`,
  );
  const policies = scalar(SUPER, `SELECT count(*) FROM pg_policies WHERE schemaname = 'public';`);
  const secdef = scalar(
    SUPER,
    `SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef;`,
  );
  const tenantIndexes = scalar(
    SUPER,
    `SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexdef ILIKE '%(tenant_id%';`,
  );
  const migrations = scalar(
    SUPER,
    `SELECT string_agg(migration_id || ':' || status, ',' ORDER BY migration_id) FROM schema_migrations;`,
  );
  return {
    persistentTables: tables,
    rlsEnabledTables: rlsTables,
    forceRlsTables: forceTables,
    policyCount: Number(policies),
    securityDefinerFunctions: Number(secdef),
    tenantIdIndexes: Number(tenantIndexes),
    migrationControlPlane: migrations,
  };
}

function main(): void {
  setup();
  proveAppRolePosture();
  proveRlsCatalog();
  proveIsolationAndNoLeak();
  proveLifecycle();
  proveAppendOnlyAndChain();
  proveLegalHold();
  const catalog = emitCatalogEvidence();
  console.log(
    JSON.stringify(
      {
        status: "pass",
        proof: "db-rls-isolation",
        providerMode: "compose-local",
        environment: "integration",
        proofLevelObserved: "substrate-proven",
        liveExternalProviderClaim: false,
        productionLiveClaim: false,
        appRole: APP_ROLE,
        migrationRole: MIGRATION_OWNER,
        checks: checks.length,
        checkLabels: checks,
        catalog,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
