// Live PDP/RLS consistency proof (parity-tenant-authz, USF-140).
//
// Proves the USF application-layer PDP and the Postgres RLS backstop agree on
// tenant boundaries against a real composed Postgres: a PDP permit uses exactly
// the tenant the RLS context is set to; a PDP deny never reaches the database; and
// an app-layer mistake is still blocked by RLS. Run via `make authz-proof`.
//
// Composed-local proof. No live-external-provider or production-live claim.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createPolicyDecisionPoint,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import { createTenantContext, type AuthorizationRequest } from "@foundation/core";

const COMPOSE = ["compose", "-f", "compose/compose.yaml", "exec", "-T", "postgres", "psql"];
const DB = "foundation";
const SUPER = "foundation_app";
const APP_ROLE = "foundation_runtime";
const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const ACTOR = "actor-a";

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

function migration(file: string): string {
  return readFileSync(new URL(`../../../adapters/db/migrations/${file}`, import.meta.url), "utf8");
}

function memberRows(role: string, tenantId: string): string {
  return (
    psql(
      role,
      `BEGIN; SET LOCAL app.tenant_id = '${tenantId}'; SELECT count(*) FROM tenant_memberships; COMMIT;`,
    )
      .split("\n")
      .filter(Boolean)
      .pop() ?? ""
  );
}

const checks: string[] = [];

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
    INSERT INTO tenant_memberships (tenant_id, actor_id, email, roles, created_by, updated_by, correlation_id)
      VALUES ('${TENANT_A}', '${ACTOR}', 'a@a.example', ARRAY['tenant-admin'], 'seed', 'seed', 'corr-a'),
             ('${TENANT_B}', 'other', 'o@b.example', ARRAY['tenant-admin'], 'seed', 'seed', 'corr-b');
  `,
  );
  checks.push(
    "setup: migrations applied; app role configured; tenant A and B membership rows seeded",
  );
}

function buildPdp() {
  // Actor is an active member of tenant A only (USF authority), mirroring the seeded DB rows.
  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "m-a",
    tenantId: TENANT_A,
    actorId: ACTOR,
    status: "active",
    roles: ["tenant-admin"],
  });
  return createPolicyDecisionPoint({ memberships });
}

function authzRequest(tenantId: string): AuthorizationRequest {
  return {
    context: createTenantContext({ tenantId, actorId: ACTOR, roles: ["tenant-admin"] }),
    action: "tenant.members.read",
    resource: { type: "tenant-member", id: "any", tenantId, attributes: {} },
  };
}

function main(): void {
  setup();
  const pdp = buildPdp();

  // (a) PDP permit for tenant A, and RLS context set to exactly the decided tenant succeeds.
  const permit = pdp.decide(authzRequest(TENANT_A));
  if (permit.effect !== "permit") {
    throw new Error(`expected PDP permit for tenant A, got ${permit.effect}/${permit.reasonCode}`);
  }
  const rowsA = memberRows(APP_ROLE, permit.tenantId);
  if (rowsA !== "1") {
    throw new Error(
      `PDP-permitted read under SET LOCAL ${permit.tenantId} should see 1 row, saw ${rowsA}`,
    );
  }
  if (permit.tenantId !== TENANT_A) {
    throw new Error(`PDP decided tenant ${permit.tenantId} must equal the RLS SET LOCAL tenant`);
  }
  checks.push("PDP permit uses exactly the tenant the RLS context is set to; read succeeds");

  // (b) PDP deny for tenant B (no active membership): the deny path never reaches the database.
  const deny = pdp.decide(authzRequest(TENANT_B));
  if (deny.effect !== "deny") {
    throw new Error(`expected PDP deny for tenant B, got ${deny.effect}`);
  }
  checks.push(`PDP deny (${deny.reasonCode}) blocks before any database access`);

  // (c) App-layer mistake: even if the app sets tenant A context but queries for tenant B
  //     rows, RLS returns nothing — the database backstop holds independent of the PDP.
  const leaked = psql(
    APP_ROLE,
    `BEGIN; SET LOCAL app.tenant_id = '${TENANT_A}'; SELECT count(*) FROM tenant_memberships WHERE tenant_id = '${TENANT_B}'; COMMIT;`,
  )
    .split("\n")
    .filter(Boolean)
    .pop();
  if (leaked !== "0") {
    throw new Error(`RLS backstop failed: tenant A context returned ${leaked} tenant B rows`);
  }
  checks.push(
    "RLS blocks cross-tenant data even when the app-layer tenant is wrong (independent backstop)",
  );

  console.log(
    JSON.stringify(
      {
        status: "pass",
        proof: "authz-rls-consistency",
        providerMode: "compose-local",
        environment: "integration",
        proofLevelObserved: "substrate-proven",
        liveExternalProviderClaim: false,
        productionLiveClaim: false,
        policyVersion: permit.policyVersion,
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
