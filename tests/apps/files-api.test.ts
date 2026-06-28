import { buildApi } from "@foundation/app-api";
import { DEV_ACTOR_ID, DEV_TENANT_ID } from "@foundation/app-api/runtime";
import { describe, expect, it } from "vitest";

const devHeaders = { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": DEV_ACTOR_ID };

async function uploadFile(
  app: ReturnType<typeof buildApi>,
  over: Partial<{ fileId: string; filename: string; contentType: string; body: string }> = {},
) {
  const body = over.body ?? "hello world";
  return app.inject({
    method: "POST",
    url: "/v1/files",
    headers: devHeaders,
    payload: {
      tenantId: DEV_TENANT_ID,
      fileId: over.fileId ?? "file-1",
      filename: over.filename ?? "report.txt",
      contentType: over.contentType ?? "text/plain",
      sizeBytes: body.length,
      body,
    },
  });
}

describe("files API surface", () => {
  it("uploads, lists, gets, and downloads a file without leaking object keys", async () => {
    const app = buildApi();
    await app.ready();
    const up = await uploadFile(app);
    expect(up.statusCode).toBe(200);
    const view = up.json();
    expect(view.fileId).toBe("file-1");
    expect(view.status).toBe("available");
    expect(view).not.toHaveProperty("objectKey");
    expect(view).not.toHaveProperty("filenameOriginal");

    const list = await app.inject({
      method: "GET",
      url: `/v1/files?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().files.some((f: { fileId: string }) => f.fileId === "file-1")).toBe(true);
    expect(JSON.stringify(list.json())).not.toContain("/o/"); // no object key path

    const get = await app.inject({
      method: "GET",
      url: `/v1/files/file-1?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(get.statusCode).toBe(200);

    const dl = await app.inject({
      method: "POST",
      url: `/v1/files/file-1/download?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(dl.statusCode).toBe(200);
    expect(dl.json().body).toBe("hello world");

    const verify = await app.inject({
      method: "POST",
      url: `/v1/files/file-1/verify?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json().ok).toBe(true);
    await app.close();
  });

  it("rejects an oversized/invalid upload (400) and a tenant mismatch (400)", async () => {
    const app = buildApi();
    await app.ready();
    const bad = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers: devHeaders,
      payload: {
        tenantId: DEV_TENANT_ID,
        fileId: "bad",
        filename: "x.bin",
        contentType: "application/x-evil",
        sizeBytes: 3,
        body: "abc",
      },
    });
    expect(bad.statusCode).toBe(400);

    const mismatch = await app.inject({
      method: "GET",
      url: `/v1/files?tenantId=other-tenant`,
      headers: devHeaders,
    });
    expect(mismatch.statusCode).toBe(400);
    await app.close();
  });

  it("blocks download of a quarantined (infected) file (403)", async () => {
    const app = buildApi();
    await app.ready();
    const up = await uploadFile(app, { fileId: "infected-1", body: "EICAR-TEST-MARKER here" });
    expect(up.json().status).toBe("quarantined");
    const dl = await app.inject({
      method: "POST",
      url: `/v1/files/infected-1/download?tenantId=${DEV_TENANT_ID}`,
      headers: devHeaders,
    });
    expect(dl.statusCode).toBe(403);
    expect(dl.json().reasonCode).toBe("status-quarantined");
    await app.close();
  });

  it("denies file access for an actor without a file-bearing membership (403)", async () => {
    const app = buildApi();
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: `/v1/files?tenantId=${DEV_TENANT_ID}`,
      headers: { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": "stranger" },
    });
    expect(response.statusCode).toBe(403);
    await app.close();
  });
});
