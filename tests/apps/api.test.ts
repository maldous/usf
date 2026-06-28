import { buildApi } from "@foundation/app-api";
import { testTenant } from "@foundation/test";
import { describe, expect, it } from "vitest";

describe("api edge", () => {
  it("serves health and hermetic login", async () => {
    const app = buildApi();
    await app.ready();

    const health = await app.inject({ method: "GET", url: "/healthz" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      status: "ok",
      providerMode: "dev in-memory",
      providerClass: "hermetic-mock",
    });

    const ready = await app.inject({ method: "GET", url: "/readyz" });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ status: "ready", providerMode: "dev in-memory" });

    const openapi = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(openapi.statusCode).toBe(200);
    expect(openapi.json()).toHaveProperty("paths./v1/tenant-context");

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { tenantId: testTenant.tenantId, email: testTenant.email },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({
      tenantId: testTenant.tenantId,
      providerMode: "hermetic-mock",
    });

    await app.close();
  });

  it("accepts matching dev tenant context and captures audit", async () => {
    const app = buildApi();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: `/v1/tenant-context?tenantId=${testTenant.tenantId}`,
      headers: {
        "x-dev-tenant-id": testTenant.tenantId,
        "x-dev-actor-id": "actor-a",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      tenantId: testTenant.tenantId,
      actorId: "actor-a",
      providerMode: "dev in-memory",
      providerClass: "hermetic-mock",
      auditEvents: 1,
    });
    await app.close();
  });

  it("fails closed on tenant mismatch", async () => {
    const app = buildApi();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: `/v1/tenant-context?tenantId=${testTenant.otherTenantId}`,
      headers: { "x-dev-tenant-id": testTenant.tenantId, "x-dev-actor-id": "actor-a" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
    await app.close();
  });

  it("keeps undocumented route aliases out of the local API surface", async () => {
    const app = buildApi();
    await app.ready();

    for (const url of ["/health", "/api/openapi.json", "/tenant/context?tenantId=tenant-a"]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(404);
    }

    await app.close();
  });
});
