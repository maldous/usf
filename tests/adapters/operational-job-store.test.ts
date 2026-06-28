import { InMemoryDurableWorkflow, InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import type { JobRecord, WorkflowRecord } from "@foundation/core";
import { describe, expect, it } from "vitest";

const TENANT = "11111111-1111-1111-1111-111111111111";

function job(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    jobId: "job-1",
    tenantId: TENANT,
    classification: "operational-automation-job",
    jobType: "x",
    status: "queued",
    actorId: "admin",
    serviceActorId: null,
    idempotencyKey: null,
    correlationId: "c",
    priority: 0,
    runAfter: 100,
    attempt: 0,
    maxRetries: 3,
    leaseOwner: null,
    leaseExpiresAt: null,
    deadLetterReason: null,
    failureClass: null,
    safeFailureMessage: null,
    payloadRefs: {},
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

describe("InMemoryOperationalJobStore", () => {
  it("leases an exclusive job and re-acquires only after lease expiry", () => {
    const s = new InMemoryOperationalJobStore();
    s.submit(job({ runAfter: 100 }));
    const w1 = s.claim({ now: 100, leaseOwner: "w1", leaseSeconds: 50 });
    expect(w1?.leaseOwner).toBe("w1");
    expect(s.claim({ now: 100, leaseOwner: "w2", leaseSeconds: 50 })).toBeUndefined();
    const w2 = s.claim({ now: 200, leaseOwner: "w2", leaseSeconds: 50 });
    expect(w2?.leaseOwner).toBe("w2");
  });

  it("does not claim a future-dated, cancelled, expired, or terminal job", () => {
    const s = new InMemoryOperationalJobStore();
    s.submit(job({ jobId: "future", runAfter: 1000 }));
    s.submit(job({ jobId: "cancelled", status: "cancelled" }));
    s.submit(job({ jobId: "expired", status: "expired" }));
    s.submit(job({ jobId: "done", status: "succeeded" }));
    expect(s.claim({ now: 100, leaseOwner: "w", leaseSeconds: 10 })).toBeUndefined();
  });

  it("tracks idempotency keys per tenant", () => {
    const s = new InMemoryOperationalJobStore();
    s.submit(job({ idempotencyKey: "k" }));
    expect(s.hasIdempotencyKey(TENANT, "k")).toBe(true);
    expect(s.hasIdempotencyKey("other", "k")).toBe(false);
    expect(s.hasIdempotencyKey(TENANT, "nope")).toBe(false);
  });

  it("isolates jobs by tenant and lists dead-lettered jobs", () => {
    const s = new InMemoryOperationalJobStore();
    s.submit(job({ jobId: "a", tenantId: TENANT }));
    s.submit(job({ jobId: "b", tenantId: "other" }));
    s.submit(job({ jobId: "dl", status: "dead-lettered" }));
    expect(
      s
        .forTenant(TENANT)
        .map((j) => j.jobId)
        .sort(),
    ).toEqual(["a", "dl"]);
    expect(s.deadLettered().map((j) => j.jobId)).toEqual(["dl"]);
  });
});

describe("InMemoryDurableWorkflow", () => {
  it("stores and retrieves workflows scoped by tenant", () => {
    const s = new InMemoryDurableWorkflow();
    const wf: WorkflowRecord = {
      workflowId: "wf-1",
      tenantId: TENANT,
      classification: "durable-domain-workflow",
      workflowType: "t",
      workflowVersion: "1",
      status: "running",
      actorId: "a",
      serviceActorId: null,
      correlationId: "c",
      approvalRequestedBy: null,
      approvalDecidedBy: null,
      createdAt: 1,
      updatedAt: 1,
    };
    s.start(wf);
    expect(s.get("wf-1")?.status).toBe("running");
    expect(s.forTenant(TENANT)).toHaveLength(1);
    expect(s.forTenant("other")).toHaveLength(0);
  });
});
