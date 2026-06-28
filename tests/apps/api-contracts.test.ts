import { buildApi } from "@foundation/app-api";
import { DEV_ACTOR_ID, DEV_TENANT_ID } from "@foundation/app-api/runtime";
import { API_ROUTE_CONTRACTS } from "@foundation/contracts";
import { describe, expect, it } from "vitest";

const devHeaders = { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": DEV_ACTOR_ID };

function expectSafeErrorEnvelope(body: Record<string, unknown>, status: number) {
  expect(body).toMatchObject({
    status,
    error_id: expect.any(String),
    code: expect.any(String),
    reason_code: expect.any(String),
    safe_message: expect.any(String),
    correlation_id: expect.any(String),
    request_id: expect.any(String),
  });
  const text = JSON.stringify(body).toLowerCase();
  for (const forbidden of [
    "client_secret",
    "private_key",
    "api_key",
    "raw-provider",
    "recipient-ref-api-contract-test",
  ]) {
    expect(text).not.toContain(forbidden);
  }
}

describe("API contracts runtime surface", () => {
  it("implements every route declared in the route contract metadata", async () => {
    const app = buildApi();
    await app.ready();

    for (const route of API_ROUTE_CONTRACTS) {
      expect(app.hasRoute({ method: route.method, url: route.path })).toBe(true);
      expect(route.routeClassification).toEqual(expect.any(String));
      expect(route.owningCapability).toEqual(expect.any(String));
      expect(route.lifecycle).toEqual(expect.any(String));
    }

    await app.close();
  });

  it("denies protected and tenant-scoped routes without leaking resource existence", async () => {
    const app = buildApi();
    await app.ready();

    const missingTenant = await app.inject({
      method: "GET",
      url: `/v1/jobs?tenantId=${DEV_TENANT_ID}`,
    });
    expect(missingTenant.statusCode).toBe(400);
    expectSafeErrorEnvelope(missingTenant.json(), 400);

    const noPermission = await app.inject({
      method: "GET",
      url: `/v1/jobs?tenantId=${DEV_TENANT_ID}`,
      headers: { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": "stranger" },
    });
    expect(noPermission.statusCode).toBe(403);
    expectSafeErrorEnvelope(noPermission.json(), 403);

    const mismatch = await app.inject({
      method: "GET",
      url: "/v1/jobs?tenantId=tenant-other",
      headers: devHeaders,
    });
    expect(mismatch.statusCode).toBe(400);
    expectSafeErrorEnvelope(mismatch.json(), 400);

    await app.close();
  });

  it("enforces deterministic idempotency on side-effecting routes", async () => {
    const app = buildApi();
    await app.ready();
    const payload = {
      tenantId: DEV_TENANT_ID,
      classification: "operational-automation-job",
      jobType: "api-contract-test",
      payloadRefs: { ref: "synthetic" },
    };

    const created = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...devHeaders, "idempotency-key": "idem-api-contract-test" },
      payload,
    });
    expect(created.statusCode).toBe(200);

    const replayed = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...devHeaders, "idempotency-key": "idem-api-contract-test" },
      payload,
    });
    expect(replayed.statusCode).toBe(200);
    expect(replayed.json().job.jobId).toBe(created.json().job.jobId);

    const conflict = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...devHeaders, "idempotency-key": "idem-api-contract-test" },
      payload: { ...payload, jobType: "api-contract-test-conflict" },
    });
    expect(conflict.statusCode).toBe(409);
    expectSafeErrorEnvelope(conflict.json(), 409);

    await app.close();
  });

  it("redacts validation errors and returns safe correlation identifiers", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...devHeaders, "idempotency-key": "idem-validation-test" },
      payload: {
        tenantId: 42,
        classification: "operational-automation-job",
        jobType: "api-contract-test",
        payloadRefs: { leak: "client_secret=synthetic" },
      },
    });

    expect(response.statusCode).toBe(400);
    expectSafeErrorEnvelope(response.json(), 400);
    expect(JSON.stringify(response.json()).toLowerCase()).not.toContain("client_secret=synthetic");

    await app.close();
  });

  it("uses opaque tenant-scoped pagination cursors", async () => {
    const app = buildApi();
    await app.ready();
    for (const fileId of ["api-contract-cursor-a", "api-contract-cursor-b"]) {
      const upload = await app.inject({
        method: "POST",
        url: "/v1/files",
        headers: devHeaders,
        payload: {
          tenantId: DEV_TENANT_ID,
          fileId,
          filename: `${fileId}.txt`,
          contentType: "text/plain",
          sizeBytes: 1,
          body: "x",
        },
      });
      expect(upload.statusCode).toBe(200);
    }

    const page = await app.inject({
      method: "GET",
      url: `/v1/files?tenantId=${DEV_TENANT_ID}&limit=1`,
      headers: devHeaders,
    });
    expect(page.statusCode).toBe(200);
    const cursor = page.json().nextCursor;
    expect(typeof cursor).toBe("string");
    expect(Buffer.from(cursor, "base64url").toString("utf8")).not.toContain(DEV_TENANT_ID);

    await app.close();
  });
});
