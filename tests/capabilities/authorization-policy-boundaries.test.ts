import {
  DEFAULT_EFFECT,
  IDP_GRANTS_AUTHORIZATION,
  isSensitiveClassification,
  permissionsForRoles,
  requiredPermission,
  scopeCoversAction,
} from "@foundation/capability-tenant";
import { describe, expect, it } from "vitest";

describe("authorization policy pure semantic boundaries", () => {
  it("keeps identity claims subordinate to explicit PDP authorization", () => {
    expect(DEFAULT_EFFECT).toBe("deny");
    expect(IDP_GRANTS_AUTHORIZATION).toBe(false);
  });

  it("deduplicates role permissions and ignores unknown roles", () => {
    const granted = permissionsForRoles(["tenant-member", "tenant-member", "unknown-role"]);
    expect([...granted].filter((permission) => permission === "tenant.members.read")).toHaveLength(
      1,
    );
    expect(granted.has("tenant.members.write")).toBe(false);
  });

  it("fails closed for unknown actions and requires stronger sensitive reads", () => {
    expect(requiredPermission("tenant.members.read")).toBe("tenant.members.read");
    expect(requiredPermission("tenant.members.nonexistent")).toBeUndefined();
    expect(isSensitiveClassification("restricted")).toBe(true);
    expect(isSensitiveClassification("confidential")).toBe(false);
  });

  it("bounds break-glass scope matching without broad accidental prefixes", () => {
    expect(scopeCoversAction("*", "tenant.members.delete")).toBe(true);
    expect(scopeCoversAction("tenant.members.*", "tenant.members.delete")).toBe(true);
    expect(scopeCoversAction("tenant.member.*", "tenant.members.delete")).toBe(false);
    expect(scopeCoversAction("tenant.members.read", "tenant.members.delete")).toBe(false);
  });
});
