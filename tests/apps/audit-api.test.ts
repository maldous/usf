import { buildApi } from "@foundation/app-api";
import { DEV_ACTOR_ID, DEV_TENANT_ID } from "@foundation/app-api/runtime";
import { describe, expect, it } from "vitest";

const devHeaders = { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": DEV_ACTOR_ID };

async function seedDecision(app: ReturnType<typeof buildApi>) {
  // A PDP decision through the authorizer records a rich authorization.decision event.
  await app.inject({
    method: "POST",
    url: "/v1/authz/check",
    headers: devHeaders,
    payload: {
      tenantId: DEV_TENANT_ID,
      action: "tenant.members.read",
      resourceType: "tenant-member",
      resourceId: "m1",
    },
  });
}

describe("audit API surface", () => {
  it("lists tenant-scoped, redacted audit events for an authorised actor", async () => {
    const app = buildApi();
    await app.ready();
    await seedDecision(app);

    const response = await app.inject({
      method: "GET",
      url: `/v1/audit/events?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tenantId).toBe(DEV_TENANT_ID);
    expect(Array.isArray(body.events)).toBe(true);
    expect(
      body.events.some((e: { eventType: string }) => e.eventType === "authorization.decision"),
    ).toBe(true);
    // audit-of-audit: querying audit records an audit.query.started event in the chain
    expect(
      body.events.some((e: { eventType: string }) => e.eventType === "audit.query.started"),
    ).toBe(true);
    // safe view: no internal chain plumbing leaked
    expect(body.events[0]).not.toHaveProperty("previousHash");
    await app.close();
  });

  it("denies retrieval (403) for an actor without an audit-bearing membership", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: `/v1/audit/events?tenantId=${DEV_TENANT_ID}`,
      headers: { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": "stranger" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toHaveProperty("reasonCode");
    await app.close();
  });

  it("rejects a tenant-context mismatch (400)", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: `/v1/audit/events?tenantId=other-tenant`,
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns a single event by id and a non-enumerating 404 for an unknown id", async () => {
    const app = buildApi();
    await app.ready();
    await seedDecision(app);
    const list = await app.inject({
      method: "GET",
      url: `/v1/audit/events?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    const first = list.json().events[0];
    const byId = await app.inject({
      method: "GET",
      url: `/v1/audit/events/${encodeURIComponent(first.eventId)}?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(byId.statusCode).toBe(200);
    expect(byId.json().eventId).toBe(first.eventId);

    const missing = await app.inject({
      method: "GET",
      url: `/v1/audit/events/does-not-exist?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });

  it("verifies audit chain integrity (PDP-protected)", async () => {
    const app = buildApi();
    await app.ready();
    await seedDecision(app);
    const response = await app.inject({
      method: "POST",
      url: "/v1/audit/verify",
      headers: devHeaders,
      payload: { tenantId: DEV_TENANT_ID },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
    await app.close();
  });
});
