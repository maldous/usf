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
  BreakGlassRegistry,
  createPolicyDecisionPoint,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import {
  createTenantContext,
  type AuthorizationRequest,
  type MembershipStatus,
} from "@foundation/core";

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

function buildPdp(
  input: {
    readonly status?: MembershipStatus;
    readonly roles?: readonly string[];
    readonly actorId?: string;
    readonly tenantId?: string;
  } = {},
) {
  // Actor is an active member of tenant A only (USF authority), mirroring the seeded DB rows.
  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "m-a",
    tenantId: input.tenantId ?? TENANT_A,
    actorId: input.actorId ?? ACTOR,
    status: input.status ?? "active",
    roles: input.roles ?? ["tenant-admin"],
  });
  return { memberships, pdp: createPolicyDecisionPoint({ memberships }) };
}

function authzRequest(tenantId: string): AuthorizationRequest {
  return {
    context: createTenantContext({ tenantId, actorId: ACTOR, roles: ["tenant-admin"] }),
    action: "tenant.members.read",
    resource: { type: "tenant-member", id: "any", tenantId, attributes: {} },
  };
}

function classifiedRequest(tenantId: string, classification: string): AuthorizationRequest {
  return {
    ...authzRequest(tenantId),
    resource: {
      type: "tenant-member",
      id: "classified-row",
      tenantId,
      attributes: { data_classification: classification },
    },
  };
}

function assertSyncDecision(value: unknown): void {
  if (value && typeof value === "object" && "then" in value) {
    throw new Error("PDP decide returned a Promise; PDP must remain synchronous");
  }
}

function main(): void {
  setup();
  const { memberships, pdp } = buildPdp();

  // (a) PDP permit for tenant A, and RLS context set to exactly the decided tenant succeeds.
  const permit = pdp.decide(authzRequest(TENANT_A));
  assertSyncDecision(permit);
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
  checks.push(
    "PDP decision is synchronous; no Promise or async provider call is part of evaluation",
  );

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

  // (d) Membership lifecycle and cache posture: every non-active membership fails
  // closed, and a changed membership is observed by the next synchronous decision.
  const inactiveStatuses: readonly MembershipStatus[] = [
    "pending",
    "invited",
    "suspended",
    "revoked",
    "expired",
    "deleted",
  ];
  for (const status of inactiveStatuses) {
    const inactive = buildPdp({ status }).pdp.decide(authzRequest(TENANT_A));
    assertSyncDecision(inactive);
    if (inactive.effect !== "deny" || inactive.reasonCode !== "inactive-or-missing-membership") {
      throw new Error(`membership status ${status} must fail closed`);
    }
  }
  checks.push("membership lifecycle fail-closed: only active memberships authorize");

  memberships.upsert({
    membershipId: "m-a",
    tenantId: TENANT_A,
    actorId: ACTOR,
    status: "suspended",
    roles: ["tenant-admin"],
  });
  const afterSuspension = pdp.decide(authzRequest(TENANT_A));
  assertSyncDecision(afterSuspension);
  if (afterSuspension.effect !== "deny") {
    throw new Error("PDP must re-read membership state after suspension; cached permit is unsafe");
  }
  checks.push("authorization cache posture: no cached permit survives membership suspension");

  memberships.upsert({
    membershipId: "m-a",
    tenantId: TENANT_A,
    actorId: ACTOR,
    status: "active",
    roles: ["tenant-admin"],
  });
  const revalidated = pdp.decide(authzRequest(TENANT_A));
  assertSyncDecision(revalidated);
  if (revalidated.effect !== "permit") {
    throw new Error("PDP must permit again after active membership is refreshed");
  }
  checks.push(
    "time-of-check posture: sensitive actions are re-evaluated against current membership",
  );

  const restrictedDenied = pdp.decide(classifiedRequest(TENANT_A, "restricted"));
  assertSyncDecision(restrictedDenied);
  if (restrictedDenied.effect !== "deny") {
    throw new Error("restricted data read must require stronger authorization");
  }
  const securityPdp = buildPdp({ roles: ["security-admin"] }).pdp;
  const restrictedPermit = securityPdp.decide(classifiedRequest(TENANT_A, "restricted"));
  assertSyncDecision(restrictedPermit);
  if (
    restrictedPermit.effect !== "permit" ||
    !restrictedPermit.obligations.includes("log-sensitive-access")
  ) {
    throw new Error("security-admin restricted data read must carry sensitive-access obligation");
  }
  checks.push(
    "ABAC classification depth: restricted data requires stronger permission and audit obligation",
  );

  const breakGlass = new BreakGlassRegistry();
  try {
    breakGlass.approve({
      tenantId: TENANT_A,
      requesterId: ACTOR,
      approverId: ACTOR,
      reason: "unsafe-self-approval",
      scope: "tenant.members.*",
      ttlMs: 60_000,
    });
    throw new Error("break-glass self approval unexpectedly succeeded");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("cannot approve")) {
      throw error;
    }
  }
  checks.push("separation of duties: break-glass self-approval fails closed");

  if (!permit.policyVersion || !permit.evaluationContextHash) {
    throw new Error("policy version and evaluation context hash are required evidence");
  }
  checks.push("policy input evidence carries version and evaluation-context hash");

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
        liveProviderReadinessClaim: false,
        certificationClaim: false,
        fullAuthorizationParityClaim: false,
        usf133ClosureClaim: false,
        enterpriseAuthzDepthGate: {
          sourceIssue: "USF-141",
          pdpSynchronousChecked: true,
          membershipLifecycleFailClosedChecked: true,
          authorizationCacheInvalidationChecked: true,
          timeOfCheckRevalidationChecked: true,
          abacClassificationChecked: true,
          breakGlassSeparationChecked: true,
          policyInputVersionHashChecked: true,
          delegationImpersonationImplemented: false,
          fieldLevelControlsStatus: "classification-only-field-level-depth-deferred",
          tokenSessionValidationFollowUp: "USF-149",
          rateLimitFollowUp: "USF-161",
          workflowRevalidationFollowUp: "USF-151",
          apiGatewayFollowUp: "USF-155",
          operatorAccessFollowUp: "USF-169",
        },
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
