import { InMemoryEventBus } from "@foundation/adapter-bus";
import { InMemorySecretStore } from "@foundation/adapter-secrets";
import { InMemoryObjectStore } from "@foundation/adapter-store";
import { describe, expect, it } from "vitest";

describe("process-local adapter unit boundaries", () => {
  it("keeps local event bus data tenant-scoped and drain-idempotent", async () => {
    const bus = new InMemoryEventBus();
    await bus.publish({ tenantId: "tenant-a", subject: "proof", payload: { value: "a" } });
    await bus.publish({ tenantId: "tenant-b", subject: "proof", payload: { value: "b" } });

    expect(bus.drain("tenant-a")).toEqual([{ subject: "proof", payload: { value: "a" } }]);
    expect(bus.drain("tenant-a")).toEqual([]);
    expect(bus.drain("tenant-b")).toEqual([{ subject: "proof", payload: { value: "b" } }]);
  });

  it("keeps local object storage tenant-scoped and delete-idempotent", async () => {
    const store = new InMemoryObjectStore();
    await store.putObject({ tenantId: "tenant-a", key: "proof.txt", body: "tenant-a-body" });
    await store.putObject({ tenantId: "tenant-b", key: "proof.txt", body: "tenant-b-body" });

    expect(await store.getObject({ tenantId: "tenant-a", key: "proof.txt" })).toBe("tenant-a-body");
    expect(await store.headObject({ tenantId: "tenant-b", key: "proof.txt" })).toEqual({
      exists: true,
      sizeBytes: "tenant-b-body".length,
    });
    await store.deleteObject({ tenantId: "tenant-a", key: "proof.txt" });
    await store.deleteObject({ tenantId: "tenant-a", key: "proof.txt" });
    expect(await store.getObject({ tenantId: "tenant-a", key: "proof.txt" })).toBeUndefined();
    expect(await store.getObject({ tenantId: "tenant-b", key: "proof.txt" })).toBe("tenant-b-body");
  });

  it("keeps local secret references scoped and fail-closed by lifecycle state", async () => {
    const store = new InMemorySecretStore();
    await store.writeSecret({
      tenantId: "tenant-a",
      name: "api-key",
      value: "secret-a",
      status: "revoked",
    });
    await store.writeSecret({
      tenantId: "tenant-b",
      name: "api-key",
      value: "secret-b",
      status: "active",
    });

    const disabled = await store.describe({ tenantId: "tenant-a", name: "api-key" });
    const active = await store.describe({ tenantId: "tenant-b", name: "api-key" });
    expect(disabled?.scope).toBe("tenant-a");
    expect(active?.scope).toBe("tenant-b");
    await expect(store.resolveSecretValue(disabled!)).rejects.toThrow(/not resolvable/);
    await expect(store.resolveSecretValue(active!)).resolves.toBe("secret-b");
  });
});
