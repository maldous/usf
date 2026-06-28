import { readFileSync } from "node:fs";
import { RlsSession } from "@foundation/adapter-db";
import {
  createTenantContext,
  MissingTenantContextError,
  TenantMismatchError,
} from "@foundation/core";
import { testTenant } from "@foundation/test";
import { describe, expect, it } from "vitest";

describe("database RLS posture", () => {
  it("fails closed without tenant context", () => {
    expect(() => new RlsSession().assertReady("unit-test")).toThrow(MissingTenantContextError);
  });

  it("rejects mismatched tenant context", () => {
    const context = createTenantContext({
      tenantId: testTenant.tenantId,
      actorId: "actor-a",
      roles: ["tenant-admin"],
    });
    expect(() =>
      new RlsSession(context).assertTenant(testTenant.otherTenantId, "unit-test"),
    ).toThrow(TenantMismatchError);
  });

  it("records SQL controls for RLS and runtime role posture", () => {
    const sql = readFileSync("adapters/db/migrations/0001-bootstrap.sql", "utf8");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("current_setting('app.tenant_id'");
    expect(sql).toContain("BYPASSRLS");
  });
});
