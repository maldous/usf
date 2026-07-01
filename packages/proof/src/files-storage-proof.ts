// Live composed-Postgres files/storage proof (parity-files-storage, USF-146).
//
// Proves the tenant-scoped file METADATA substrate (0003-files.sql) on a real
// Postgres under the actual non-superuser application role:
//   - files ENABLE + FORCE row level security with a tenant policy;
//   - tenant A sees only its own file rows; a cross-tenant read returns nothing;
//   - missing tenant context fails closed (0 rows);
//   - a cross-tenant insert is blocked by the RLS WITH CHECK policy;
//   - created_at is immutable (lifecycle trigger);
//   - legal_hold blocks a destructive DELETE (purge guard);
//   - (tenant_id, object_key) is unique per tenant.
//
// Composed-local proof. NO live S3/MinIO/object-store, antivirus/DLP, or production-live
// claim. Run via `make files-proof` (brings up Postgres, runs this, tears it down).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const COMPOSE = ["compose", "-f", "compose/compose.yaml", "exec", "-T", "postgres", "psql"];
const DB = "foundation";
const SUPER = "foundation_app";
const APP_ROLE = "foundation_runtime";
const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

function psql(role: string, sql: string, opts: { expectFailure?: boolean } = {}): string {
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
  try {
    const out = execFileSync("docker", args, { input: sql, encoding: "utf8" });
    if (opts.expectFailure) {
      throw new Error(`expected failure but SQL succeeded as ${role}:\n${sql}`);
    }
    return out.trim();
  } catch (error) {
    if (opts.expectFailure) {
      return "expected-failure";
    }
    const err = error as { stderr?: string; message?: string };
    throw new Error(
      `unexpected failure as ${role}:\n${(err.stderr ?? err.message ?? "").toString()}`,
      {
        cause: error,
      },
    );
  }
}

function scalar(role: string, sql: string): string {
  return psql(role, sql).split("\n").filter(Boolean).pop() ?? "";
}

function migration(file: string): string {
  return readFileSync(new URL(`../../../adapters/db/migrations/${file}`, import.meta.url), "utf8");
}

const checks: string[] = [];
function pass(label: string): void {
  checks.push(label);
}

function setup(): void {
  psql(
    SUPER,
    `DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP ROLE IF EXISTS ${APP_ROLE};`,
  );
  psql(SUPER, migration("0001-bootstrap.sql"));
  psql(SUPER, migration("0002-enterprise-persistence-metadata.sql"));
  psql(SUPER, migration("0003-files.sql"));
  psql(SUPER, migration("0004-enterprise-db-proof-depth.sql"));
  psql(
    SUPER,
    `
    ALTER ROLE ${APP_ROLE} LOGIN PASSWORD 'foundation_runtime_pw';
    ALTER ROLE ${APP_ROLE} SET search_path = public;
    GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
    INSERT INTO tenants (tenant_id, canonical_domain, status, created_by, updated_by)
      VALUES ('${TENANT_A}', 'a.example', 'active', 'seed', 'seed'),
             ('${TENANT_B}', 'b.example', 'active', 'seed', 'seed');
    INSERT INTO files (file_id, tenant_id, owner_actor_id, object_key, filename_original, filename_safe, content_type, size_bytes, status, created_by, updated_by, correlation_id)
      VALUES ('fa1', '${TENANT_A}', 'actor-a', 'o/aa/bb/aaaa', 'a.txt', 'a.txt', 'text/plain', 5, 'available', 'seed', 'seed', 'corr-a'),
             ('fb1', '${TENANT_B}', 'actor-b', 'o/cc/dd/bbbb', 'b.txt', 'b.txt', 'text/plain', 5, 'available', 'seed', 'seed', 'corr-b');
  `,
  );
  pass("setup: 0001+0002+0003 applied; app role configured; tenant A and B file rows seeded");
}

function proveRlsCatalog(): void {
  const flags = scalar(
    SUPER,
    `SELECT relrowsecurity::text || ',' || relforcerowsecurity::text FROM pg_class WHERE relname = 'files';`,
  );
  if (flags !== "true,true") {
    throw new Error(`files RLS catalog flags (enable,force)=${flags}`);
  }
  const policy = scalar(
    SUPER,
    `SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'files';`,
  );
  if (policy === "0") {
    throw new Error("files has no RLS policy");
  }
  const idx = scalar(
    SUPER,
    `SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'files' AND indexdef ILIKE '%(tenant_id%';`,
  );
  if (idx === "0") {
    throw new Error("files has no tenant_id index");
  }
  pass("files ENABLE + FORCE RLS, has a tenant policy, and indexes tenant_id");
}

function proveIsolation(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    DO $$ DECLARE n int; BEGIN
      SELECT count(*) INTO n FROM files;
      IF n <> 1 THEN RAISE EXCEPTION 'tenant A should see exactly its own file, saw %', n; END IF;
      SELECT count(*) INTO n FROM files WHERE tenant_id = '${TENANT_B}';
      IF n <> 0 THEN RAISE EXCEPTION 'tenant A must not see tenant B files, saw %', n; END IF;
    END $$;
    COMMIT;
  `,
  );
  pass("tenant A is isolated from tenant B files (RLS)");

  const noCtx = scalar(APP_ROLE, `SELECT count(*) FROM files;`);
  if (noCtx !== "0") {
    throw new Error(`missing tenant context must fail closed (0 files), saw ${noCtx}`);
  }
  pass("missing tenant context fails closed (0 files)");

  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    INSERT INTO files (file_id, tenant_id, owner_actor_id, object_key, filename_original, filename_safe, content_type, size_bytes, created_by, updated_by, correlation_id)
    VALUES ('cross', '${TENANT_B}', 'x', 'o/ee/ff/cccc', 'x', 'x', 'text/plain', 1, 'app', 'app', 'c');
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("cross-tenant file insert is blocked by the RLS WITH CHECK policy");
}

function proveLifecycleAndLegalHold(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE files SET created_at = now() WHERE file_id = 'fa1';
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("files.created_at is immutable (lifecycle trigger)");

  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE files SET legal_hold = true WHERE file_id = 'fa1';
    DO $$ BEGIN
      BEGIN
        DELETE FROM files WHERE file_id = 'fa1';
        RAISE EXCEPTION 'legal_hold did not block destructive delete';
      EXCEPTION WHEN others THEN
        IF SQLERRM LIKE '%legal_hold did not block%' THEN RAISE; END IF;
      END;
    END $$;
    COMMIT;
  `,
  );
  pass("legal_hold blocks destructive file purge (BEFORE DELETE trigger)");
}

function proveObjectKeyUniqueness(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    INSERT INTO files (file_id, tenant_id, owner_actor_id, object_key, filename_original, filename_safe, content_type, size_bytes, created_by, updated_by, correlation_id)
    VALUES ('dup', '${TENANT_A}', 'actor-a', 'o/aa/bb/aaaa', 'd', 'd', 'text/plain', 1, 'app', 'app', 'c');
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("(tenant_id, object_key) is unique per tenant");
}

function main(): void {
  setup();
  proveRlsCatalog();
  proveIsolation();
  proveLifecycleAndLegalHold();
  proveObjectKeyUniqueness();
  console.log(
    JSON.stringify(
      {
        status: "pass",
        proof: "files-storage",
        providerMode: "compose-local",
        environment: "integration",
        proofLevelObserved: "substrate-proven",
        liveObjectStoreClaim: false,
        liveScannerClaim: false,
        liveExternalProviderClaim: false,
        productionLiveClaim: false,
        checks: checks.length,
        checkLabels: checks,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
