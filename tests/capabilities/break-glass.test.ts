import { BreakGlassRegistry } from "@foundation/capability-tenant";
import { describe, expect, it } from "vitest";

describe("break-glass access", () => {
  it("requires separate requester and approver", () => {
    const registry = new BreakGlassRegistry();
    expect(() =>
      registry.approve({
        tenantId: "tenant-a",
        requesterId: "operator-a",
        approverId: "operator-a",
        reason: "investigation",
        scope: "tenant-a",
        ttlMs: 60_000,
      }),
    ).toThrow(/cannot approve/);
  });

  it("creates expiring tenant-scoped grants", () => {
    const registry = new BreakGlassRegistry();
    const grant = registry.approve({
      tenantId: "tenant-a",
      requesterId: "operator-a",
      approverId: "operator-b",
      reason: "investigation",
      scope: "tenant-a",
      ttlMs: 60_000,
    });

    expect(registry.assertActive(grant.grantId, "tenant-a")).toEqual(grant);
    expect(() => registry.assertActive(grant.grantId, "tenant-b")).toThrow(/tenant mismatch/);
  });
});
