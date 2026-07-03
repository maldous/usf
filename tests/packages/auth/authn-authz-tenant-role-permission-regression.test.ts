import { spawnSync } from "node:child_process";
import { InMemoryAuditEventStore, InMemoryAuditLedger } from "@foundation/capability-audit";
import {
  ACTION_PERMISSIONS,
  createAuthorizer,
  createPolicyDecisionPoint,
  InMemoryTenantMembershipDirectory,
  ROLE_PERMISSIONS,
  SENSITIVE_READ_PERMISSION,
} from "@foundation/capability-tenant";
import {
  createTenantContext,
  type AuditEvent,
  type AuditEventDraft,
  type AuthorizationRequest,
  type MembershipStatus,
  type TenantContext,
} from "@foundation/core";
import type { AuditRecorder } from "@foundation/ports";
import { describe, expect, it } from "vitest";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const TENANT_C = "tenant-c";

function memberships(
  rows: readonly {
    readonly actorId: string;
    readonly tenantId: string;
    readonly status: MembershipStatus;
    readonly roles: readonly string[];
  }[],
) {
  const directory = new InMemoryTenantMembershipDirectory();
  for (const row of rows) {
    directory.upsert({
      membershipId: `membership-${row.tenantId}-${row.actorId}`,
      ...row,
    });
  }
  return directory;
}

function context(tenantId: string, actorId: string, roles: readonly string[]): TenantContext {
  return createTenantContext({ tenantId, actorId, roles });
}

function request(
  ctx: TenantContext,
  action: string,
  resourceTenantId = ctx.tenantId,
  attributes: Readonly<Record<string, string>> = {},
): AuthorizationRequest {
  return {
    context: ctx,
    action,
    resource: {
      type: "tenant-record",
      id: `resource-${resourceTenantId}`,
      tenantId: resourceTenantId,
      attributes,
    },
    requestContext: {
      correlation_id: `corr-${ctx.tenantId}-${action}`,
    },
  };
}

describe("USF-249 permission weakening regressions", () => {
  it("keeps role grants explicit, bounded, and mapped to known permissions", () => {
    const knownPermissions = new Set(Object.values(ACTION_PERMISSIONS));
    knownPermissions.add(SENSITIVE_READ_PERMISSION);

    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      expect(permissions.length, role).toBeGreaterThan(0);
      expect(new Set(permissions).size, role).toBe(permissions.length);
      expect(permissions, role).not.toContain("*");
      for (const permission of permissions) {
        expect(knownPermissions.has(permission), `${role}:${permission}`).toBe(true);
      }
    }

    expect(ROLE_PERMISSIONS["tenant-member"]).not.toContain("tenant.members.write");
    expect(ROLE_PERMISSIONS["tenant-member"]).not.toContain("tenant.members.delete");
    expect(ROLE_PERMISSIONS["tenant-member"]).not.toContain("provider.mode.change");
    expect(ROLE_PERMISSIONS["service-worker"]).not.toContain("tenant.members.delete");
  });

  it("keeps allow and deny role outcomes stable for representative actions", () => {
    const directory = memberships([
      { tenantId: TENANT_A, actorId: "tenant-admin", status: "active", roles: ["tenant-admin"] },
      { tenantId: TENANT_A, actorId: "tenant-member", status: "active", roles: ["tenant-member"] },
      { tenantId: TENANT_A, actorId: "auditor", status: "active", roles: ["auditor"] },
      {
        tenantId: TENANT_A,
        actorId: "security-admin",
        status: "active",
        roles: ["security-admin"],
      },
      {
        tenantId: TENANT_A,
        actorId: "service-worker",
        status: "active",
        roles: ["service-worker"],
      },
      {
        tenantId: TENANT_A,
        actorId: "unknown-role",
        status: "active",
        roles: ["role-not-defined"],
      },
    ]);
    const pdp = createPolicyDecisionPoint({ memberships: directory });
    const cases: readonly [string, readonly string[], string, "permit" | "deny"][] = [
      ["tenant-admin", ["tenant-admin"], "tenant.members.write", "permit"],
      ["tenant-member", ["tenant-member"], "tenant.members.write", "deny"],
      ["auditor", ["auditor"], "audit.search", "permit"],
      ["auditor", ["auditor"], "tenant.members.read", "deny"],
      ["security-admin", ["security-admin"], "provider.mode.change", "permit"],
      ["service-worker", ["service-worker"], "job.run", "permit"],
      ["service-worker", ["service-worker"], "workflow.admin.override", "deny"],
      ["unknown-role", ["role-not-defined"], "tenant.members.read", "deny"],
    ];

    for (const [actorId, roles, action, effect] of cases) {
      expect(
        pdp.decide(request(context(TENANT_A, actorId, roles), action)).effect,
        `${actorId}:${action}`,
      ).toBe(effect);
    }

    expect(
      pdp.decide(
        request(
          context(TENANT_A, "security-admin", ["security-admin"]),
          "tenant.members.read",
          TENANT_A,
          {
            data_classification: "restricted",
          },
        ),
      ).effect,
    ).toBe("permit");
  });
});

describe("USF-249 tenant boundary regressions", () => {
  it("denies tenant A/B/C resource, route, body, worker, object, event, secret, search, and analytics escapes", () => {
    const directory = memberships([
      { tenantId: TENANT_A, actorId: "actor-a", status: "active", roles: ["tenant-admin"] },
      { tenantId: TENANT_B, actorId: "actor-a", status: "active", roles: ["tenant-member"] },
    ]);
    const pdp = createPolicyDecisionPoint({ memberships: directory });
    const ctxA = context(TENANT_A, "actor-a", ["tenant-admin"]);
    const ctxB = context(TENANT_B, "actor-a", ["tenant-member"]);
    const ctxC = context(TENANT_C, "actor-a", ["tenant-admin"]);
    const escapeSurfaces = [
      "route",
      "query",
      "body",
      "worker-job",
      "object-path",
      "event-subject",
      "secret-path",
      "search-index",
      "analytics-query",
    ];

    expect(pdp.decide(request(ctxA, "tenant.members.read", TENANT_A)).effect).toBe("permit");
    for (const surface of escapeSurfaces) {
      expect(
        pdp.decide(
          request(ctxA, "tenant.members.read", TENANT_B, {
            boundary_surface: surface,
          }),
        ),
        surface,
      ).toMatchObject({ effect: "deny", reasonCode: "tenant-boundary" });
    }

    expect(pdp.decide(request(ctxB, "tenant.members.write", TENANT_B))).toMatchObject({
      effect: "deny",
      reasonCode: "rbac-deny",
    });
    expect(pdp.decide(request(ctxC, "tenant.members.read", TENANT_C))).toMatchObject({
      effect: "deny",
      reasonCode: "inactive-or-missing-membership",
    });
  });

  it("keeps every non-active membership status fail-closed", () => {
    const statuses: readonly MembershipStatus[] = [
      "pending",
      "invited",
      "suspended",
      "revoked",
      "expired",
      "deleted",
    ];
    for (const status of statuses) {
      const pdp = createPolicyDecisionPoint({
        memberships: memberships([
          { tenantId: TENANT_A, actorId: status, status, roles: ["tenant-admin"] },
        ]),
      });
      expect(
        pdp.decide(request(context(TENANT_A, status, ["tenant-admin"]), "tenant.members.read")),
        status,
      ).toMatchObject({ effect: "deny", reasonCode: "inactive-or-missing-membership" });
    }
  });
});

describe("USF-249 audit and validator regressions", () => {
  it("records permit and deny authorization decisions without raw token or secret retention", async () => {
    const directory = memberships([
      { tenantId: TENANT_A, actorId: "admin", status: "active", roles: ["tenant-admin"] },
      { tenantId: TENANT_A, actorId: "member", status: "active", roles: ["tenant-member"] },
    ]);
    const store = new InMemoryAuditEventStore();
    const recorded: AuditEvent[] = [];
    const audit: AuditRecorder = {
      async record(draft: AuditEventDraft) {
        const event = await store.record(draft);
        recorded.push(event);
        return event;
      },
    };
    const authorizer = createAuthorizer({
      pdp: createPolicyDecisionPoint({ memberships: directory }),
      auditLedger: new InMemoryAuditLedger(),
      audit,
    });

    await expect(
      authorizer.authorize(
        request(context(TENANT_A, "admin", ["tenant-admin"]), "tenant.members.write"),
      ),
    ).resolves.toMatchObject({ effect: "permit", reasonCode: "rbac-permit" });
    await expect(
      authorizer.authorize(
        request(context(TENANT_A, "member", ["tenant-member"]), "tenant.members.write"),
      ),
    ).resolves.toMatchObject({ effect: "deny", reasonCode: "rbac-deny" });

    expect(recorded.map((event) => event.eventType)).toEqual([
      "authorization.decision",
      "authorization.decision",
    ]);
    expect(recorded.map((event) => event.outcome)).toEqual(["success", "denied"]);
    expect(JSON.stringify(recorded.map((event) => event.metadata))).not.toMatch(
      /raw_payload|token|secret|credential|client_secret|bearer/i,
    );
  });

  it("keeps the test-readiness selftest covering the auth obligation planted defect", () => {
    const result = spawnSync(
      "python3",
      ["tools/validate-test-readiness/validate-test-readiness.py", "selftest", "--json"],
      {
        encoding: "utf8",
      },
    );
    expect(result.status, result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      readonly ok: boolean;
      readonly rules: Record<string, unknown>;
    };
    expect(parsed.ok).toBe(true);
    expect(Object.keys(parsed.rules)).toContain("USF-TEST-READINESS-036");
  }, 30_000);
});
