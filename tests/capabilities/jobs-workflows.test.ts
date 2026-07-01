import { InMemoryDurableWorkflow, InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import {
  createEnterpriseWorkflowControlPlane,
  createJobService,
  createWorkflowService,
} from "@foundation/capability-jobs";
import {
  createPolicyDecisionPoint,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import {
  type BackoffPolicy,
  createTenantContext,
  isServiceActor,
  serviceActorId,
} from "@foundation/core";
import { beforeEach, describe, expect, it } from "vitest";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const BACKOFF: BackoffPolicy = {
  strategy: "fixed",
  baseSeconds: 1,
  factor: 1,
  maxRetries: 1,
  maxBackoffSeconds: 5,
  jitter: false,
};

function harness() {
  let clock = 1_700_000_000;
  const memberships = new InMemoryTenantMembershipDirectory();
  const svc = serviceActorId("worker");
  memberships.upsert({
    membershipId: "1",
    tenantId: A,
    actorId: "admin-a",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "2",
    tenantId: A,
    actorId: "admin-a2",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "3",
    tenantId: A,
    actorId: "member-a",
    status: "active",
    roles: ["tenant-member"],
  });
  memberships.upsert({
    membershipId: "3a",
    tenantId: A,
    actorId: "security-a",
    status: "active",
    roles: ["security-admin"],
  });
  memberships.upsert({
    membershipId: "4",
    tenantId: A,
    actorId: svc,
    status: "active",
    roles: ["service-worker"],
  });
  memberships.upsert({
    membershipId: "5",
    tenantId: B,
    actorId: "admin-b",
    status: "active",
    roles: ["tenant-admin"],
  });
  const pdp = createPolicyDecisionPoint({ memberships });
  const audit = new InMemoryAuditEventStore();
  const jobs = createJobService({
    jobs: new InMemoryOperationalJobStore(),
    pdp,
    memberships,
    audit,
    now: () => clock,
    defaultBackoff: BACKOFF,
  });
  const workflows = createWorkflowService({
    workflows: new InMemoryDurableWorkflow(),
    pdp,
    audit,
    now: () => clock,
  });
  const enterpriseWorkflows = createEnterpriseWorkflowControlPlane({
    pdp,
    audit,
    now: () => clock,
  });
  const ctx = (tenantId: string, actorId: string, roles: string[]) =>
    createTenantContext({ tenantId, actorId, roles });
  return { jobs, workflows, enterpriseWorkflows, svc, advance: (s: number) => (clock += s), ctx };
}

describe("job service authorization + classification", () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => (h = harness()));

  it("permits an authorized create and denies one without permission", async () => {
    const ok = await h.jobs.submit({
      context: h.ctx(A, "admin-a", ["tenant-admin"]),
      classification: "operational-automation-job",
      jobType: "x",
    });
    expect(ok.ok).toBe(true);
    const denied = await h.jobs.submit({
      context: h.ctx(A, "member-a", ["tenant-member"]),
      classification: "operational-automation-job",
      jobType: "x",
    });
    expect(denied).toMatchObject({ ok: false });
  });

  it("runs a system job under a concrete service actor", async () => {
    const r = await h.jobs.submit({
      context: h.ctx(A, h.svc, ["service-worker"]),
      classification: "system-internal-job",
      jobType: "tick",
    });
    expect(r.ok && isServiceActor(r.job.actorId) && r.job.serviceActorId !== null).toBe(true);
  });

  it("suppresses a duplicate idempotent submission", async () => {
    const ctx = h.ctx(A, "admin-a", ["tenant-admin"]);
    const a = await h.jobs.submit({
      context: ctx,
      classification: "import-export-job",
      jobType: "e",
      idempotencyKey: "k",
    });
    const b = await h.jobs.submit({
      context: ctx,
      classification: "import-export-job",
      jobType: "e",
      idempotencyKey: "k",
    });
    expect(a.ok && !a.deduplicated).toBe(true);
    expect(b.ok && b.deduplicated).toBe(true);
  });

  it("denies cross-tenant cancellation", async () => {
    const jb = await h.jobs.submit({
      context: h.ctx(B, "admin-b", ["tenant-admin"]),
      classification: "operational-automation-job",
      jobType: "x",
    });
    if (!jb.ok) throw new Error("setup");
    const res = await h.jobs.cancel(h.ctx(A, "admin-a", ["tenant-admin"]), jb.job.jobId);
    expect(res.ok).toBe(false);
  });

  it("read and list are PDP-gated and tenant-scoped", async () => {
    const ctxA = h.ctx(A, "admin-a", ["tenant-admin"]);
    const a = await h.jobs.submit({
      context: ctxA,
      classification: "operational-automation-job",
      jobType: "x",
    });
    const jb = await h.jobs.submit({
      context: h.ctx(B, "admin-b", ["tenant-admin"]),
      classification: "operational-automation-job",
      jobType: "y",
    });
    if (!a.ok || !jb.ok) throw new Error("setup");
    expect((await h.jobs.read(ctxA, a.job.jobId)).ok).toBe(true);
    expect((await h.jobs.read(ctxA, jb.job.jobId)).ok).toBe(false); // cross-tenant read denied
    const list = await h.jobs.list(ctxA);
    expect(list.ok && list.views.every((v) => v.tenantId === A)).toBe(true);
  });
});

describe("job execution: retry, dead-letter, redaction, cancel", () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => (h = harness()));

  it("bounds retries then dead-letters with redacted evidence", async () => {
    const ctx = h.ctx(A, "admin-a", ["tenant-admin"]);
    await h.jobs.submit({ context: ctx, classification: "provider-sync-job", jobType: "s" });
    const handler = () => ({
      ok: false as const,
      failureClass: "transient-error" as const,
      message: "boom secret=sk_live_xyz",
    });
    let last = await h.jobs.claimAndRun("w", handler);
    for (let i = 0; i < 5 && last?.status === "retrying"; i++) {
      h.advance(10);
      last = await h.jobs.claimAndRun("w", handler);
    }
    expect(last?.status).toBe("dead-lettered");
    expect(last?.deadLetterReason).toBeTruthy();
    expect(last?.safeFailureMessage).toContain("[redacted-secret]");
    expect(last?.safeFailureMessage ?? "").not.toContain("sk_live_");
  });

  it("never runs a cancelled job", async () => {
    const ctx = h.ctx(A, "admin-a", ["tenant-admin"]);
    const j = await h.jobs.submit({
      context: ctx,
      classification: "operational-automation-job",
      jobType: "x",
    });
    if (!j.ok) throw new Error("setup");
    await h.jobs.cancel(ctx, j.job.jobId);
    expect(await h.jobs.claimAndRun("w", () => ({ ok: true as const }))).toBeUndefined();
  });
});

describe("workflow approvals (separation of duties)", () => {
  it("blocks requester self-approval and allows a separate approver", async () => {
    const h = harness();
    const ctx = h.ctx(A, "admin-a", ["tenant-admin"]);
    const wf = await h.workflows.start(ctx, {
      classification: "human-approval-flow",
      workflowType: "grant",
      workflowVersion: "1",
    });
    if (!wf.ok) throw new Error("setup");
    await h.workflows.requestApproval(ctx, wf.workflow.workflowId);
    expect(await h.workflows.approve(ctx, wf.workflow.workflowId)).toMatchObject({
      ok: false,
      reasonCode: "requester-cannot-self-approve",
    });
    const approved = await h.workflows.approve(
      h.ctx(A, "admin-a2", ["tenant-admin"]),
      wf.workflow.workflowId,
    );
    expect(approved.ok && approved.workflow.status === "completed").toBe(true);
    expect(h.workflows.canAccess(wf.workflow.workflowId, B)).toBe(false);
  });
});

describe("enterprise workflow controls", () => {
  it("requires stronger admin override for versioning and proves deterministic replay", async () => {
    const h = harness();
    const admin = h.ctx(A, "admin-a", ["tenant-admin"]);
    const security = h.ctx(A, "security-a", ["security-admin"]);
    const denied = await h.enterpriseWorkflows.registerDefinition(admin, {
      workflowType: "bulk-repair",
      workflowVersion: "1",
      definitionHash: "hash-1",
      migrationPolicy: "compatible",
    });
    expect(denied.ok).toBe(false);

    const registered = await h.enterpriseWorkflows.registerDefinition(security, {
      workflowType: "bulk-repair",
      workflowVersion: "1",
      definitionHash: "hash-1",
      migrationPolicy: "explicit-migration-required",
    });
    expect(registered.ok).toBe(true);

    await expect(
      h.enterpriseWorkflows.replayWorkflow({
        context: security,
        workflowType: "bulk-repair",
        workflowVersion: "1",
        eventHistoryHash: "history-a",
        expectedHistoryHash: "history-b",
      }),
    ).resolves.toMatchObject({
      ok: false,
      reasonCode: "workflow-replay-nondeterministic",
    });

    await expect(
      h.enterpriseWorkflows.migrateWorkflow({
        context: security,
        workflowType: "bulk-repair",
        fromVersion: "1",
        toVersion: "2",
        migrationPolicyAccepted: true,
      }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("fails closed for quota, queue draining, impact mismatch, and provider egress", async () => {
    const h = harness();
    const admin = h.ctx(A, "admin-a", ["tenant-admin"]);
    const approver = h.ctx(A, "admin-a2", ["tenant-admin"]);
    const security = h.ctx(A, "security-a", ["security-admin"]);

    await expect(
      h.enterpriseWorkflows.admitWithQuota({ context: admin, quota: 1, priority: 5 }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      h.enterpriseWorkflows.admitWithQuota({ context: admin, quota: 1, priority: 1 }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "tenant-job-quota-exceeded" });

    await h.enterpriseWorkflows.drainQueue(admin);
    expect(h.enterpriseWorkflows.canStartWork(admin)).toBe(false);

    const dryRun = await h.enterpriseWorkflows.createDryRun({
      context: admin,
      operationId: "bulk-delete-preview",
      estimatedImpact: { records: "1" },
    });
    if (!dryRun.ok) throw new Error("setup");
    await h.enterpriseWorkflows.approveDryRun(approver, dryRun.previewId);
    await expect(
      h.enterpriseWorkflows.executeHighRiskAutomation({
        context: security,
        previewId: dryRun.previewId,
        observedImpact: { records: "2" },
      }),
    ).resolves.toMatchObject({
      ok: false,
      reasonCode: "approved-impact-hash-mismatch",
    });

    await expect(
      h.enterpriseWorkflows.checkEgress({
        context: admin,
        endpointRef: "provider:unlisted",
        allowList: ["provider:allowed"],
      }),
    ).resolves.toMatchObject({
      ok: false,
      reasonCode: "egress-endpoint-not-allowlisted",
    });
  });
});
