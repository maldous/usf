import { InMemoryAuditLedger } from "@foundation/capability-audit";
import { createAuditRecord } from "@foundation/core";
import { describe, expect, it } from "vitest";

describe("audit ledger", () => {
  it("stores append-only tenant-scoped audit records", async () => {
    const ledger = new InMemoryAuditLedger();
    await ledger.append(
      createAuditRecord({
        id: "audit_1",
        action: "tenant.action",
        tenantId: "tenant-a",
        actorId: "actor-a",
        subject: "subject-a",
      }),
    );

    expect(ledger.list("tenant-a")).toHaveLength(1);
    expect(ledger.list("tenant-b")).toHaveLength(0);
  });
});
