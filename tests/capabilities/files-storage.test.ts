import {
  InMemoryFileMetadataStore,
  InMemoryObjectStore,
  InMemoryScanProvider,
} from "@foundation/adapter-store";
import { InMemoryAuditEventStore, createAuditRecorder } from "@foundation/capability-audit";
import { FileAccessDeniedError, createFileService } from "@foundation/capability-files";
import {
  InMemoryTenantMembershipDirectory,
  createPolicyDecisionPoint,
} from "@foundation/capability-tenant";
import {
  FileValidationError,
  assertSafeObjectKey,
  createFileMetadata,
  generateObjectKey,
  objectKeyLeaksSensitive,
  type MembershipStatus,
  type TenantContext,
} from "@foundation/core";
import { createTenantContext } from "@foundation/core";
import { describe, expect, it } from "vitest";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const SALT = "test-salt";

function ctx(
  tenantId: string,
  actorId = "actor",
  roles: readonly string[] = ["tenant-admin"],
): TenantContext {
  return createTenantContext({ tenantId, actorId, roles });
}

function membership(
  roles: readonly string[],
  tenantId = TENANT_A,
  actorId = "actor",
  status: MembershipStatus = "active",
) {
  const dir = new InMemoryTenantMembershipDirectory();
  dir.upsert({ membershipId: "m", tenantId, actorId, status, roles });
  return dir;
}

function stack(roles: readonly string[] = ["tenant-admin"], tenantId = TENANT_A) {
  const objectStore = new InMemoryObjectStore();
  const metadataStore = new InMemoryFileMetadataStore();
  const scanProvider = new InMemoryScanProvider();
  const auditStore = new InMemoryAuditEventStore();
  const recorder = createAuditRecorder({ ledger: auditStore, component: "test" });
  const pdp = createPolicyDecisionPoint({ memberships: membership(roles, tenantId) });
  const fileService = createFileService({
    objectStore,
    metadataStore,
    scanProvider,
    pdp,
    audit: recorder,
    objectKeySalt: SALT,
  });
  return { objectStore, metadataStore, scanProvider, auditStore, fileService };
}

function upload(
  svc: ReturnType<typeof stack>["fileService"],
  context: TenantContext,
  over: Partial<{
    fileId: string;
    filename: string;
    contentType: string;
    body: string;
    classification: string;
  }> = {},
) {
  const body = over.body ?? "hello world";
  return svc.upload(context, {
    fileId: over.fileId ?? "f1",
    filename: over.filename ?? "report.txt",
    contentType: over.contentType ?? "text/plain",
    sizeBytes: body.length,
    body,
    ...(over.classification ? { classification: over.classification as never } : {}),
  });
}

describe("object key safety", () => {
  it("generates an opaque, deterministic, leak-free key", () => {
    const key = generateObjectKey({ tenantId: TENANT_A, fileId: "f1", salt: SALT });
    expect(key).toBe(generateObjectKey({ tenantId: TENANT_A, fileId: "f1", salt: SALT }));
    expect(() => assertSafeObjectKey(key)).not.toThrow();
    expect(
      objectKeyLeaksSensitive(key, {
        tenantId: TENANT_A,
        email: "user@school.example",
        filename: "report.txt",
      }),
    ).toBe(false);
  });

  it("rejects traversal, encoded traversal, unicode separators, and absolute keys", () => {
    for (const bad of ["o/../etc", "o/%2e%2e/x", "o/a b/x", "/abs/key", "o/a b/x", "..\\x"]) {
      expect(() => assertSafeObjectKey(bad)).toThrow(FileValidationError);
    }
  });

  it("flags a hand-built key that leaks tenant/email/filename", () => {
    expect(objectKeyLeaksSensitive("o/tenant-a/report", { tenantId: TENANT_A })).toBe(true);
    expect(objectKeyLeaksSensitive("o/user/x", { email: "user@x.example" })).toBe(true);
    expect(objectKeyLeaksSensitive("o/report/x", { filename: "report.txt" })).toBe(true);
  });
});

describe("upload validation fails closed", () => {
  it("rejects oversized, zero-byte, invalid content type, and checksum mismatch", () => {
    const big = {
      fileId: "f",
      tenantId: TENANT_A,
      ownerActorId: "a",
      salt: SALT,
      filenameOriginal: "x",
      contentType: "text/plain",
    };
    expect(() => createFileMetadata({ ...big, sizeBytes: 26 * 1024 * 1024 })).toThrow(/size-limit/);
    expect(() => createFileMetadata({ ...big, sizeBytes: 0, body: "" })).toThrow(/zero-byte/);
    expect(() =>
      createFileMetadata({ ...big, sizeBytes: 3, contentType: "application/x-evil", body: "abc" }),
    ).toThrow(/content-type/);
    expect(() =>
      createFileMetadata({ ...big, sizeBytes: 3, body: "abc", declaredChecksum: "deadbeef" }),
    ).toThrow(/checksum-mismatch/);
  });

  it("rejects an unknown classification", () => {
    expect(() =>
      createFileMetadata({
        fileId: "f",
        tenantId: TENANT_A,
        ownerActorId: "a",
        salt: SALT,
        filenameOriginal: "x",
        contentType: "text/plain",
        sizeBytes: 3,
        body: "abc",
        classification: "top-secret" as never,
      }),
    ).toThrow(/unknown-classification/);
  });
});

describe("tenant isolation and authorization", () => {
  it("uploads and downloads within a tenant for an authorised actor", async () => {
    const { fileService } = stack(["tenant-admin"]);
    const view = await upload(fileService, ctx(TENANT_A));
    expect(view.status).toBe("available");
    const got = await fileService.download(ctx(TENANT_A), "f1");
    expect(got.body).toBe("hello world");
    // the view never carries an object key
    expect(view as unknown as Record<string, unknown>).not.toHaveProperty("objectKey");
  });

  it("does not let tenant B read or download tenant A files", async () => {
    const { fileService, metadataStore } = stack(["tenant-admin"], TENANT_A);
    await upload(fileService, ctx(TENANT_A));
    // cross-tenant metadata read returns undefined
    expect(await metadataStore.get(ctx(TENANT_B, "b", ["tenant-admin"]), "f1")).toBeUndefined();
    // cross-tenant download (different PDP/membership) is denied non-enumerating
    const bStack = stack(["tenant-admin"], TENANT_B);
    await expect(
      bStack.fileService.download(ctx(TENANT_B, "b", ["tenant-admin"]), "f1"),
    ).rejects.toBeInstanceOf(FileAccessDeniedError);
  });

  it("denies a file action for an actor without permission, recorded", async () => {
    const { auditStore } = stack(["tenant-member"]);
    const memberStack = stack(["tenant-member"]);
    await expect(
      upload(memberStack.fileService, ctx(TENANT_A, "actor", ["tenant-member"])),
    ).rejects.toBeInstanceOf(FileAccessDeniedError);
    const events = await memberStack.auditStore.query(ctx(TENANT_A), {
      tenantId: TENANT_A,
      limit: 100,
    });
    expect(
      events.events.some((e) => e.eventType === "file.upload.failed" && e.outcome === "denied"),
    ).toBe(true);
    expect(auditStore).toBeDefined();
  });

  it("requires stronger authorization to download a restricted (sensitive) file", async () => {
    // security-admin uploads a restricted file
    const admin = stack(["security-admin"]);
    await upload(admin.fileService, ctx(TENANT_A, "actor", ["security-admin"]), {
      classification: "restricted",
    });
    // security-admin can download (has security.restricted.read)
    const ok = await admin.fileService.download(ctx(TENANT_A, "actor", ["security-admin"]), "f1");
    expect(ok.body).toBe("hello world");
    // a tenant-admin (no security.restricted.read) is denied the sensitive download
    const ta = createPolicyDecisionPoint({ memberships: membership(["tenant-admin"]) });
    const taService = createFileService({
      objectStore: admin.objectStore,
      metadataStore: admin.metadataStore,
      scanProvider: admin.scanProvider,
      pdp: ta,
      audit: createAuditRecorder({ ledger: admin.auditStore, component: "test" }),
      objectKeySalt: SALT,
    });
    await expect(
      taService.download(ctx(TENANT_A, "actor", ["tenant-admin"]), "f1"),
    ).rejects.toBeInstanceOf(FileAccessDeniedError);
  });
});

describe("scan, quarantine, lifecycle, legal hold, integrity", () => {
  it("quarantines an infected upload and blocks its download", async () => {
    const { fileService } = stack(["tenant-admin"]);
    const view = await upload(fileService, ctx(TENANT_A), { body: "EICAR-TEST-MARKER payload" });
    expect(view.status).toBe("quarantined");
    expect(view.scanStatus).toBe("infected");
    // Quarantined status is checked first in the download gate; either way it fails closed.
    await expect(fileService.download(ctx(TENANT_A), "f1")).rejects.toMatchObject({
      reasonCode: "status-quarantined",
    });
  });

  it("soft-deletes a file so it cannot be downloaded, then restores it", async () => {
    const { fileService } = stack(["tenant-admin"]);
    await upload(fileService, ctx(TENANT_A));
    await fileService.remove(ctx(TENANT_A), "f1");
    await expect(fileService.download(ctx(TENANT_A), "f1")).rejects.toMatchObject({
      reasonCode: "status-deleted",
    });
    const restored = await fileService.restore(ctx(TENANT_A), "f1");
    expect(restored.status).toBe("restored");
    expect((await fileService.download(ctx(TENANT_A), "f1")).body).toBe("hello world");
  });

  it("blocks purge of a legally-held file", async () => {
    const { fileService } = stack(["security-admin"]);
    await fileService.upload(ctx(TENANT_A, "actor", ["security-admin"]), {
      fileId: "f1",
      filename: "evidence.pdf",
      contentType: "application/pdf",
      sizeBytes: 5,
      body: "%PDF%",
      legalHold: true,
    });
    await expect(
      fileService.purge(ctx(TENANT_A, "actor", ["security-admin"]), "f1"),
    ).rejects.toMatchObject({
      reasonCode: "legal-hold",
    });
  });

  it("records upload/download audit and detects content tamper on verify", async () => {
    const { fileService, objectStore, metadataStore, auditStore } = stack(["tenant-admin"]);
    await upload(fileService, ctx(TENANT_A));
    expect((await fileService.verify(ctx(TENANT_A), "f1")).ok).toBe(true);
    // tamper the stored object behind the metadata's recorded checksum
    const meta = await metadataStore.get(ctx(TENANT_A), "f1");
    await objectStore.putObject({ tenantId: TENANT_A, key: meta!.objectKey, body: "TAMPERED" });
    const verified = await fileService.verify(ctx(TENANT_A), "f1");
    expect(verified.ok).toBe(false);
    const events = await auditStore.query(ctx(TENANT_A), { tenantId: TENANT_A, limit: 200 });
    expect(events.events.some((e) => e.eventType === "file.upload.completed")).toBe(true);
    expect(events.events.some((e) => e.eventType === "file.downloaded")).toBe(false); // we never downloaded
    expect(JSON.stringify(events.events)).not.toContain(meta!.objectKey); // object key never in audit
  });
});
