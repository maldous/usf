import { InMemoryAuditLedger } from "@foundation/capability-audit";
import {
  BreakGlassRegistry,
  InMemoryTenantMembershipDirectory,
  createAuthorizer,
  createPolicyDecisionPoint,
} from "@foundation/capability-tenant";
import {
  createTenantContext,
  type AuthorizationRequest,
  type MembershipStatus,
  type TenantContext,
} from "@foundation/core";
import { describe, expect, it } from "vitest";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const ACTOR = "actor-1";

function directory(status: MembershipStatus, roles: readonly string[], tenantId = TENANT_A) {
  const dir = new InMemoryTenantMembershipDirectory();
  dir.upsert({ membershipId: "m1", tenantId, actorId: ACTOR, status, roles });
  return dir;
}

function context(tenantId: string, roles: readonly string[] = ["tenant-admin"]): TenantContext {
  return createTenantContext({ tenantId, actorId: ACTOR, roles });
}

function request(
  ctx: TenantContext,
  action: string,
  resourceTenant = ctx.tenantId,
  attributes: Record<string, string> = {},
): AuthorizationRequest {
  return {
    context: ctx,
    action,
    resource: { type: "tenant-member", id: "m-x", tenantId: resourceTenant, attributes },
  };
}

describe("PDP authorization decisions", () => {
  it("permits an active member with the required permission", () => {
    const pdp = createPolicyDecisionPoint({ memberships: directory("active", ["tenant-admin"]) });
    const decision = pdp.decide(request(context(TENANT_A), "tenant.members.read"));
    expect(decision.effect).toBe("permit");
    expect(decision.policyVersion).toBe("authz-policy-1");
    expect(decision.evaluationContextHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("denies a valid context whose resource is in another tenant (tenant boundary)", () => {
    const pdp = createPolicyDecisionPoint({ memberships: directory("active", ["tenant-admin"]) });
    const decision = pdp.decide(request(context(TENANT_A), "tenant.members.read", TENANT_B));
    expect(decision.effect).toBe("deny");
    expect(decision.reasonCode).toBe("tenant-boundary");
    expect(decision.safeMessage).toBe("Not authorized");
  });

  it("denies when there is no active membership even if the IdP claim has the role", () => {
    // membership suspended; context (IdP claim) still says tenant-admin -> identity != authz
    const pdp = createPolicyDecisionPoint({
      memberships: directory("suspended", ["tenant-admin"]),
    });
    const decision = pdp.decide(
      request(context(TENANT_A, ["tenant-admin"]), "tenant.members.read"),
    );
    expect(decision.effect).toBe("deny");
    expect(decision.reasonCode).toBe("inactive-or-missing-membership");
  });

  it("denies a member whose role lacks the permission", () => {
    const pdp = createPolicyDecisionPoint({ memberships: directory("active", ["tenant-member"]) });
    const decision = pdp.decide(request(context(TENANT_A), "tenant.members.write"));
    expect(decision.effect).toBe("deny");
    expect(decision.reasonCode).toBe("rbac-deny");
  });

  it("denies an unknown action", () => {
    const pdp = createPolicyDecisionPoint({ memberships: directory("active", ["tenant-admin"]) });
    const decision = pdp.decide(request(context(TENANT_A), "tenant.unknown.action"));
    expect(decision.effect).toBe("deny");
    expect(decision.reasonCode).toBe("unknown-action");
  });

  it("requires the stronger permission for a sensitive classification (ABAC)", () => {
    const adminPdp = createPolicyDecisionPoint({
      memberships: directory("active", ["tenant-admin"]),
    });
    const denied = adminPdp.decide(
      request(context(TENANT_A), "tenant.members.read", TENANT_A, {
        data_classification: "restricted",
      }),
    );
    expect(denied.effect).toBe("deny");

    const secPdp = createPolicyDecisionPoint({
      memberships: directory("active", ["security-admin"]),
    });
    const permitted = secPdp.decide(
      request(context(TENANT_A), "tenant.members.read", TENANT_A, {
        data_classification: "restricted",
      }),
    );
    expect(permitted.effect).toBe("permit");
    expect(permitted.obligations).toContain("log-sensitive-access");
  });

  it("isolates a multi-tenant actor to active-membership tenants only", () => {
    const dir = directory("active", ["tenant-admin"], TENANT_A);
    const pdp = createPolicyDecisionPoint({ memberships: dir });
    expect(pdp.decide(request(context(TENANT_A), "tenant.members.read")).effect).toBe("permit");
    expect(pdp.decide(request(context(TENANT_B), "tenant.members.read")).effect).toBe("deny");
  });
});

describe("PDP break-glass integration", () => {
  function grant(scope: string, ttlMs = 60_000) {
    const breakGlass = new BreakGlassRegistry();
    const g = breakGlass.approve({
      tenantId: TENANT_A,
      requesterId: ACTOR,
      approverId: "approver",
      reason: "investigation",
      scope,
      ttlMs,
    });
    return { breakGlass, grantId: g.grantId };
  }

  it("rejects self-approval", () => {
    const breakGlass = new BreakGlassRegistry();
    expect(() =>
      breakGlass.approve({
        tenantId: TENANT_A,
        requesterId: "same",
        approverId: "same",
        reason: "x",
        scope: "*",
        ttlMs: 1000,
      }),
    ).toThrow(/cannot approve/);
  });

  it("permits an active in-scope grant for a member lacking RBAC, with audit obligation", () => {
    const { breakGlass, grantId } = grant("tenant.members.*");
    const pdp = createPolicyDecisionPoint({
      memberships: directory("active", ["tenant-member"]),
      breakGlass,
    });
    const decision = pdp.decide({
      ...request(context(TENANT_A), "tenant.members.delete"),
      breakGlassGrantId: grantId,
    });
    expect(decision.effect).toBe("permit");
    expect(decision.reasonCode).toBe("break-glass-permit");
    expect(decision.obligations).toContain("audit-break-glass");
  });

  it("denies reuse of another member's break-glass grant", () => {
    const { breakGlass, grantId } = grant("tenant.members.*"); // requester = ACTOR
    const dir = new InMemoryTenantMembershipDirectory();
    dir.upsert({
      membershipId: "m-other",
      tenantId: TENANT_A,
      actorId: "other-actor",
      status: "active",
      roles: ["tenant-member"],
    });
    const pdp = createPolicyDecisionPoint({ memberships: dir, breakGlass });
    const otherContext = createTenantContext({
      tenantId: TENANT_A,
      actorId: "other-actor",
      roles: ["tenant-member"],
    });
    const decision = pdp.decide({
      context: otherContext,
      action: "tenant.members.delete",
      resource: { type: "tenant-member", id: "m-x", tenantId: TENANT_A, attributes: {} },
      breakGlassGrantId: grantId,
    });
    expect(decision.effect).toBe("deny");
    expect(decision.reasonCode).toBe("break-glass-actor-mismatch");
  });

  it("denies an out-of-scope grant", () => {
    const { breakGlass, grantId } = grant("audit.*");
    const pdp = createPolicyDecisionPoint({
      memberships: directory("active", ["tenant-member"]),
      breakGlass,
    });
    const decision = pdp.decide({
      ...request(context(TENANT_A), "tenant.members.delete"),
      breakGlassGrantId: grantId,
    });
    expect(decision.effect).toBe("deny");
    expect(decision.reasonCode).toBe("break-glass-out-of-scope");
  });

  it("denies an expired grant", () => {
    const { breakGlass, grantId } = grant("tenant.members.*", 1);
    const future = () => new Date(Date.now() + 60_000);
    const pdp = createPolicyDecisionPoint({
      memberships: directory("active", ["tenant-member"]),
      breakGlass,
      now: future,
    });
    const decision = pdp.decide({
      ...request(context(TENANT_A), "tenant.members.delete"),
      breakGlassGrantId: grantId,
    });
    expect(decision.effect).toBe("deny");
    expect(decision.reasonCode).toBe("break-glass-invalid");
  });
});

describe("authorizer emits decision evidence", () => {
  it("appends an authorization-decision audit record", async () => {
    const auditLedger = new InMemoryAuditLedger();
    const pdp = createPolicyDecisionPoint({ memberships: directory("active", ["tenant-admin"]) });
    const authorizer = createAuthorizer({ pdp, auditLedger });
    const decision = await authorizer.authorize(request(context(TENANT_A), "tenant.members.read"));
    expect(decision.effect).toBe("permit");
    const records = auditLedger.list(TENANT_A);
    expect(records.some((r) => r.action === "authorization.decision")).toBe(true);
  });
});
