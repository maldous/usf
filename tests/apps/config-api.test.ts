import { buildApi } from "@foundation/app-api";
import { DEV_ACTOR_ID, DEV_TENANT_ID } from "@foundation/app-api/runtime";
import { describe, expect, it } from "vitest";

const devHeaders = { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": DEV_ACTOR_ID };

describe("config API surface", () => {
  it("returns redacted tenant config without secret values", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: `/v1/config/current?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tenantId).toBe(DEV_TENANT_ID);
    expect(body.schemaVersion).toBe("config-1");
    // a secret-reference key is present but redacted (never a value)
    expect(body.config["provider.mail.api-key-ref"]).toBe("[redacted-secret]");
    const json = JSON.stringify(body);
    for (const needle of ["dev-local-only", "Bearer ", "-----BEGIN"]) {
      expect(json).not.toContain(needle);
    }
    await app.close();
  });

  it("evaluates feature flags deterministically", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: `/v1/config/feature-flags?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.flags["audit-retrieval-ui"]).toBe(true); // seeded on
    expect(body.flags["experimental-config-editor"]).toBe(false); // safe default
    await app.close();
  });

  it("returns provider modes without credentials", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: `/v1/config/provider-status?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.providerMode).toBe("dev in-memory");
    expect(typeof body.providers).toBe("object");
    expect(JSON.stringify(body)).not.toContain("dev-local-only");
    await app.close();
  });

  it("rejects a tenant-context mismatch (400)", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: `/v1/config/current?tenantId=other-tenant`,
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
