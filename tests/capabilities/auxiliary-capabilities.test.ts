import { InMemoryEventBus } from "@foundation/adapter-bus";
import { InMemoryMailProvider } from "@foundation/adapter-mail";
import { InMemorySecretStore } from "@foundation/adapter-secrets";
import { InMemoryObjectStore } from "@foundation/adapter-store";
import { InMemoryWorkflowEngine } from "@foundation/adapter-wf";
import { FileCapability } from "@foundation/capability-files";
import { JobCapability } from "@foundation/capability-jobs";
import { NotificationCapability } from "@foundation/capability-notify";
import { createTenantContext } from "@foundation/core";
import { describe, expect, it } from "vitest";

const tenantA = createTenantContext({
  tenantId: "tenant-a",
  actorId: "matthew",
  roles: ["tenant-admin"],
});

const tenantB = createTenantContext({
  tenantId: "tenant-b",
  actorId: "other",
  roles: ["tenant-admin"],
});

describe("auxiliary local dev capabilities", () => {
  it("stores files per tenant through the object-store port", async () => {
    const files = new FileCapability(new InMemoryObjectStore());

    await files.putTenantFile(tenantA, "report.txt", "tenant-a-report");
    await files.putTenantFile(tenantB, "report.txt", "tenant-b-report");

    await expect(files.getTenantFile(tenantA, "report.txt")).resolves.toBe("tenant-a-report");
    await expect(files.getTenantFile(tenantB, "report.txt")).resolves.toBe("tenant-b-report");
  });

  it("sends tenant notices through the captured mail provider", async () => {
    const mail = new InMemoryMailProvider();
    const notify = new NotificationCapability(mail);

    await notify.sendTenantNotice(tenantA, "Local notice", "synthetic local body");

    expect(mail.messages).toHaveLength(1);
    expect(mail.messages[0]).toMatchObject({
      tenantId: "tenant-a",
      subject: "redacted-notification-subject",
      body: "[redacted-notification-body]",
    });
    expect(mail.messages[0]?.to).toMatch(/^addr_/);
    expect(JSON.stringify(mail.messages)).not.toContain("synthetic local body");
    expect(JSON.stringify(mail.messages)).not.toContain("@example.test");
  });

  it("schedules tenant jobs through the in-memory workflow provider", async () => {
    const workflow = new InMemoryWorkflowEngine();
    const jobs = new JobCapability(workflow);

    await expect(jobs.scheduleTenantJob(tenantA, "sync", { mode: "dev" })).resolves.toBe(
      "workflow_tenant-a_sync_1",
    );
    expect(workflow.list()).toEqual(["workflow_tenant-a_sync_1"]);
  });

  it("keeps secrets tenant-scoped in memory", async () => {
    const secrets = new InMemorySecretStore();

    await secrets.writeSecret({ tenantId: tenantA.tenantId, name: "api-key", value: "a-secret" });
    await secrets.writeSecret({ tenantId: tenantB.tenantId, name: "api-key", value: "b-secret" });

    await expect(secrets.readSecret({ tenantId: tenantA.tenantId, name: "api-key" })).resolves.toBe(
      "a-secret",
    );
    await expect(secrets.readSecret({ tenantId: tenantB.tenantId, name: "api-key" })).resolves.toBe(
      "b-secret",
    );
  });

  it("drains event bus messages per tenant", async () => {
    const bus = new InMemoryEventBus();

    await bus.publish({ tenantId: tenantA.tenantId, subject: "tenant.updated", payload: { n: 1 } });
    await bus.publish({ tenantId: tenantB.tenantId, subject: "tenant.updated", payload: { n: 2 } });

    expect(bus.drain(tenantA.tenantId)).toEqual([{ subject: "tenant.updated", payload: { n: 1 } }]);
    expect(bus.drain(tenantA.tenantId)).toEqual([]);
    expect(bus.drain(tenantB.tenantId)).toEqual([{ subject: "tenant.updated", payload: { n: 2 } }]);
  });
});
