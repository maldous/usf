import { contextFromClaims, requireRequestTenant } from "@foundation/capability-tenant";
import { TenantMismatchError, type IdentityClaims } from "@foundation/core";
import { describe, expect, it } from "vitest";

describe("tenant isolation", () => {
  const claims: IdentityClaims = {
    subject: "actor-a",
    tenantId: "tenant-a",
    email: "actor@example.test",
    roles: ["tenant-admin"],
    providerMode: "hermetic-mock",
  };

  it("derives tenant context from identity claims", () => {
    const context = contextFromClaims(claims);
    expect(context.tenantId).toBe("tenant-a");
    expect(context.actorId).toBe("actor-a");
  });

  it("rejects route or query tenant mismatches", () => {
    const context = contextFromClaims(claims);
    expect(() => requireRequestTenant(context, "tenant-b")).toThrow(TenantMismatchError);
  });
});
