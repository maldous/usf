// Live composed-Postgres audit-evidence proof (parity-audit, USF-142).
//
// Proves the append-only, tamper-evident audit ledger on a REAL Postgres substrate
// under the actual non-superuser application role:
//   - the app role cannot UPDATE or DELETE audit rows (append-only);
//   - every row carries a per-tenant hash chain (row_hash + previous_hash);
//   - the chain RE-VERIFIES: recomputing each row_hash from its content and the
//     prior row's hash matches the stored value (valid chain verifies);
//   - a content tamper (even by a privileged role that bypasses the append-only
//     trigger) is DETECTED by re-verification (tamper-evidence);
//   - audit rows are tenant-isolated by RLS and fail closed without tenant context.
//
// Run via `make audit-proof` (brings up composed Postgres, runs this, tears it down).
// This is hermetic/composed-local proof. It makes NO live-external-provider, SIEM,
// or production-live claim.
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

// Recompute the per-tenant hash chain exactly as the DB trigger does and count rows
// whose stored row_hash or previous_hash do not match. 0 == intact chain.
const VERIFY_SQL = `
WITH ordered AS (
  SELECT audit_id, tenant_id, actor_id, action, subject_type, subject_id, outcome,
         row_hash, previous_hash,
         lag(row_hash) OVER (PARTITION BY tenant_id ORDER BY recorded_at, audit_id) AS expected_prev
  FROM audit_ledger
),
recomputed AS (
  SELECT audit_id, row_hash, previous_hash, expected_prev,
    encode(sha256(convert_to(
      coalesce(audit_id, '') || '|' || coalesce(tenant_id::text, '') || '|' ||
      coalesce(actor_id, '') || '|' || coalesce(action, '') || '|' ||
      coalesce(subject_type, '') || '|' || coalesce(subject_id, '') || '|' ||
      coalesce(outcome, '') || '|' || coalesce(expected_prev, ''), 'UTF8')), 'hex') AS recomputed_hash
  FROM ordered
)
SELECT count(*) FROM recomputed
WHERE recomputed_hash <> row_hash OR previous_hash IS DISTINCT FROM expected_prev;
`;

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
  psql(
    SUPER,
    `
    ALTER ROLE ${APP_ROLE} LOGIN PASSWORD 'foundation_runtime_pw';
    ALTER ROLE ${APP_ROLE} SET search_path = public;
    GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
    INSERT INTO tenants (tenant_id, canonical_domain, status, created_by, updated_by)
      VALUES ('${TENANT_A}', 'a.example', 'active', 'seed', 'seed'),
             ('${TENANT_B}', 'b.example', 'active', 'seed', 'seed');
    -- Multi-row insert: the BEFORE INSERT chain trigger links each tenant-A row to the
    -- prior one (deterministic ids define chain order under the shared txn timestamp).
    INSERT INTO audit_ledger (audit_id, tenant_id, actor_id, action, subject, subject_type, subject_id, outcome)
      VALUES ('aud-a-1', '${TENANT_A}', 'actor-a', 'authentication.login', 'session', 'session', 's1', 'success'),
             ('aud-a-2', '${TENANT_A}', 'actor-a', 'authorization.decision', 'member', 'tenant-member', 'm1', 'denied'),
             ('aud-a-3', '${TENANT_A}', 'actor-a', 'break_glass.used', 'member', 'tenant-member', 'm1', 'success'),
             ('aud-b-1', '${TENANT_B}', 'actor-b', 'authentication.login', 'session', 'session', 's2', 'success');
  `,
  );
  pass("setup: migrations applied; app role configured; tenant A (3) and B (1) audit rows seeded");
}

function proveAppendOnly(): void {
  psql(
    APP_ROLE,
    `BEGIN; SET LOCAL app.tenant_id = '${TENANT_A}'; UPDATE audit_ledger SET action = 'tamper' WHERE audit_id = 'aud-a-1'; COMMIT;`,
    { expectFailure: true },
  );
  pass("append-only: app role cannot UPDATE audit rows");
  psql(
    APP_ROLE,
    `BEGIN; SET LOCAL app.tenant_id = '${TENANT_A}'; DELETE FROM audit_ledger WHERE audit_id = 'aud-a-1'; COMMIT;`,
    { expectFailure: true },
  );
  pass("append-only: app role cannot DELETE audit rows");
}

function proveChainPresentAndValid(): void {
  const hashes = scalar(SUPER, `SELECT bool_and(row_hash IS NOT NULL) FROM audit_ledger;`);
  if (hashes !== "t") {
    throw new Error(`every audit row must carry a row_hash, got ${hashes}`);
  }
  const linked = scalar(
    SUPER,
    `SELECT count(*) FROM audit_ledger WHERE tenant_id = '${TENANT_A}' AND previous_hash IS NOT NULL;`,
  );
  if (linked !== "2") {
    throw new Error(`tenant A (3 rows) should have 2 chained previous_hash links, got ${linked}`);
  }
  const broken = scalar(SUPER, VERIFY_SQL);
  if (broken !== "0") {
    throw new Error(`valid chain must re-verify with 0 broken rows, got ${broken}`);
  }
  pass("valid chain re-verifies: recomputed row_hash and previous_hash match for every row");
}

function proveTamperDetected(): void {
  // A privileged actor bypasses the append-only trigger and rewrites event content
  // WITHOUT recomputing the hash. Re-verification must detect the mismatch.
  psql(
    SUPER,
    `
    ALTER TABLE audit_ledger DISABLE TRIGGER audit_ledger_no_mutation;
    UPDATE audit_ledger SET action = 'authorization.permit-FORGED' WHERE audit_id = 'aud-a-2';
    ALTER TABLE audit_ledger ENABLE TRIGGER audit_ledger_no_mutation;
  `,
  );
  const brokenAfter = scalar(SUPER, VERIFY_SQL);
  if (Number(brokenAfter) < 1) {
    throw new Error(`tamper must be detected (>=1 broken row), got ${brokenAfter}`);
  }
  pass(`tamper detected: re-verification flags ${brokenAfter} broken row after a content rewrite`);
}

function proveTenantIsolation(): void {
  const seenA = scalar(
    APP_ROLE,
    `BEGIN; SET LOCAL app.tenant_id = '${TENANT_A}'; SELECT count(*) FROM audit_ledger; COMMIT;`,
  );
  if (seenA !== "3") {
    throw new Error(`tenant A app role should see its 3 audit rows, saw ${seenA}`);
  }
  const crossB = scalar(
    APP_ROLE,
    `BEGIN; SET LOCAL app.tenant_id = '${TENANT_A}'; SELECT count(*) FROM audit_ledger WHERE tenant_id = '${TENANT_B}'; COMMIT;`,
  );
  if (crossB !== "0") {
    throw new Error(`tenant A must not see tenant B audit rows, saw ${crossB}`);
  }
  const noCtx = scalar(APP_ROLE, `SELECT count(*) FROM audit_ledger;`);
  if (noCtx !== "0") {
    throw new Error(`missing tenant context must fail closed (0 audit rows), saw ${noCtx}`);
  }
  pass("audit rows are RLS tenant-isolated and fail closed without tenant context");
}

function main(): void {
  setup();
  proveAppendOnly();
  proveChainPresentAndValid();
  proveTamperDetected();
  proveTenantIsolation();
  console.log(
    JSON.stringify(
      {
        status: "pass",
        proof: "audit-evidence",
        providerMode: "compose-local",
        environment: "integration",
        proofLevelObserved: "substrate-proven",
        liveExternalProviderClaim: false,
        siemClaim: false,
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
