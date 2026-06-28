// Jobs & workflows proof (parity-jobs-workflows, USF-133 / ADR 0011 / ADR 0013).
//
// Hermetic behaviour proof of controlled job/workflow execution. Exercises the REAL
// job service, workflow service, in-memory durable-workflow + operational-job adapters,
// PDP, and audit. It proves USF:
//   * classifies every job; tenant-scopes execution; uses concrete service actors;
//   * authorizes every privileged action through the PDP (deny without permission;
//     deny cross-tenant; deny missing membership);
//   * suppresses duplicate side effects via idempotency;
//   * bounds retries and dead-letters with evidence; redacts secret-looking failures;
//   * never runs cancelled/expired jobs; enforces lease ownership and safe re-acquire;
//   * fires schedules deterministically and fails closed on an unknown schedule;
//   * enforces approval separation of duties; audits the job/workflow lifecycle value-free.
//
// Hermetic-mock / hermetic. NOT live Temporal / Windmill / queue / production-live evidence.
import { fileURLToPath } from "node:url";
import { InMemoryDurableWorkflow, InMemoryOperationalJobStore } from "@foundation/adapter-wf";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createJobService, createWorkflowService } from "@foundation/capability-jobs";
import {
  createPolicyDecisionPoint,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import {
  type AuditEvent,
  type AuditEventDraft,
  type BackoffPolicy,
  assertSchedule,
  createTenantContext,
  isServiceActor,
  type ScheduleSpec,
  serviceActorId,
} from "@foundation/core";
import type { AuditRecorder } from "@foundation/ports";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const BACKOFF: BackoffPolicy = {
  strategy: "fixed",
  baseSeconds: 1,
  factor: 1,
  maxRetries: 2,
  maxBackoffSeconds: 10,
  jitter: false,
};

async function main() {
  const checks: string[] = [];
  const pass = (label: string): void => {
    checks.push(label);
  };

  let clockSec = 1_700_000_000;
  const recorded: AuditEvent[] = [];
  const store = new InMemoryAuditEventStore();
  const audit: AuditRecorder = {
    async record(draft: AuditEventDraft) {
      const event = await store.record(draft);
      recorded.push(event);
      return event;
    },
  };

  const memberships = new InMemoryTenantMembershipDirectory();
  const svcActor = serviceActorId("scheduler-maintenance");
  memberships.upsert({
    membershipId: "m-aa",
    tenantId: TENANT_A,
    actorId: "admin-a",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "m-aa2",
    tenantId: TENANT_A,
    actorId: "admin-a2",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "m-ma",
    tenantId: TENANT_A,
    actorId: "member-a",
    status: "active",
    roles: ["tenant-member"],
  });
  memberships.upsert({
    membershipId: "m-sa",
    tenantId: TENANT_A,
    actorId: svcActor,
    status: "active",
    roles: ["service-worker"],
  });
  memberships.upsert({
    membershipId: "m-ab",
    tenantId: TENANT_B,
    actorId: "admin-b",
    status: "active",
    roles: ["tenant-admin"],
  });
  const pdp = createPolicyDecisionPoint({ memberships });

  const jobStore = new InMemoryOperationalJobStore();
  const wfStore = new InMemoryDurableWorkflow();
  const jobs = createJobService({
    jobs: jobStore,
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    leaseSeconds: 100,
    defaultBackoff: BACKOFF,
  });
  const workflows = createWorkflowService({ workflows: wfStore, pdp, audit, now: () => clockSec });

  const ctxAdminA = createTenantContext({
    tenantId: TENANT_A,
    actorId: "admin-a",
    roles: ["tenant-admin"],
  });
  const ctxAdminA2 = createTenantContext({
    tenantId: TENANT_A,
    actorId: "admin-a2",
    roles: ["tenant-admin"],
  });
  const ctxMemberA = createTenantContext({
    tenantId: TENANT_A,
    actorId: "member-a",
    roles: ["tenant-member"],
  });
  const ctxAdminB = createTenantContext({
    tenantId: TENANT_B,
    actorId: "admin-b",
    roles: ["tenant-admin"],
  });
  const ctxServiceA = createTenantContext({
    tenantId: TENANT_A,
    actorId: svcActor,
    roles: ["service-worker"],
  });
  const ctxServiceB = createTenantContext({
    tenantId: TENANT_B,
    actorId: svcActor,
    roles: ["service-worker"],
  });

  // ---- Authorization, classification, tenant/service actor ----------------------
  const created = await jobs.submit({
    context: ctxAdminA,
    classification: "operational-automation-job",
    jobType: "reconcile",
  });
  if (!created.ok) throw new Error("admin-a could not create a job");
  pass("classified job created by an authorized actor (PDP permit)");

  const denied = await jobs.submit({
    context: ctxMemberA,
    classification: "operational-automation-job",
    jobType: "reconcile",
  });
  if (denied.ok) throw new Error("tenant-member without job.create was allowed to create a job");
  pass("job.create without PDP permission is denied (audited job.denied)");

  const sysJob = await jobs.submit({
    context: ctxServiceA,
    classification: "system-internal-job",
    jobType: "retention-tick",
  });
  if (!sysJob.ok || sysJob.job.serviceActorId === null || !isServiceActor(sysJob.job.actorId)) {
    throw new Error("system job did not use a concrete service actor");
  }
  pass("system job runs under a concrete service actor (not a global bypass)");

  // ---- Idempotency: duplicate submission does not duplicate side effects --------
  const first = await jobs.submit({
    context: ctxAdminA,
    classification: "import-export-job",
    jobType: "export",
    idempotencyKey: "exp-1",
  });
  const dup = await jobs.submit({
    context: ctxAdminA,
    classification: "import-export-job",
    jobType: "export",
    idempotencyKey: "exp-1",
  });
  if (
    !first.ok ||
    !dup.ok ||
    first.deduplicated ||
    !dup.deduplicated ||
    dup.job.jobId !== first.job.jobId
  ) {
    throw new Error("idempotent submission did not suppress the duplicate");
  }
  pass("idempotency suppresses a duplicate job submission (same key -> same job)");

  // ---- Retry bounded then dead-letter with evidence (isolated store) ------------
  const retryStore = new InMemoryOperationalJobStore();
  const retrySvc = createJobService({
    jobs: retryStore,
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    leaseSeconds: 50,
    defaultBackoff: BACKOFF,
  });
  await retrySvc.submit({
    context: ctxAdminA,
    classification: "provider-sync-job",
    jobType: "sync-transient",
  });
  const transientHandler = () => ({
    ok: false as const,
    failureClass: "transient-error" as const,
    message: "upstream blip",
  });
  let lastTransient = await retrySvc.claimAndRun("w-1", transientHandler);
  for (let i = 0; i < 4 && lastTransient && lastTransient.status === "retrying"; i++) {
    clockSec += 5;
    lastTransient = await retrySvc.claimAndRun("w-1", transientHandler);
  }
  if (
    !lastTransient ||
    lastTransient.status !== "dead-lettered" ||
    lastTransient.attempt <= BACKOFF.maxRetries
  ) {
    throw new Error(
      `bounded retry did not dead-letter (status=${lastTransient?.status}, attempt=${lastTransient?.attempt})`,
    );
  }
  if (!lastTransient.deadLetterReason || !lastTransient.failureClass) {
    throw new Error("dead-lettered job lacks evidence");
  }
  pass(`retry is bounded (maxRetries=${BACKOFF.maxRetries}) then dead-letters with evidence`);

  // ---- Failure redaction (isolated store) ---------------------------------------
  const fatalStore = new InMemoryOperationalJobStore();
  const fatalSvc = createJobService({
    jobs: fatalStore,
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    leaseSeconds: 50,
    defaultBackoff: BACKOFF,
  });
  await fatalSvc.submit({
    context: ctxAdminA,
    classification: "provider-sync-job",
    jobType: "sync-fatal",
  });
  const secretHandler = () => ({
    ok: false as const,
    failureClass: "permanent-error" as const,
    message: "connect failed dsn=postgres://user:p4ss@db/app and secret=sk_live_abcdef1234567890",
  });
  const fatal = await fatalSvc.claimAndRun("w-2", secretHandler);
  if (!fatal || fatal.status !== "dead-lettered") throw new Error("fatal job did not dead-letter");
  if (
    fatal.safeFailureMessage === null ||
    !fatal.safeFailureMessage.includes("[redacted-secret]") ||
    fatal.safeFailureMessage.includes("sk_live_") ||
    fatal.safeFailureMessage.includes("postgres://user:p4ss@")
  ) {
    throw new Error(`failure message not redacted: ${fatal.safeFailureMessage}`);
  }
  pass("failure message redacts secret-looking values (dsn, secret)");

  // ---- Provider credential is a redacted reference in the payload ---------------
  const provJob = await jobs.submit({
    context: ctxServiceA,
    classification: "provider-sync-job",
    jobType: "provider-call",
    payload: { endpoint: "https://api.example", client_secret: "sk_live_should_not_appear" },
  });
  if (!provJob.ok) throw new Error("provider job submit failed");
  if (
    provJob.job.payloadRefs["client_secret"] !== "[redacted-secret]" ||
    provJob.job.payloadRefs["endpoint"] !== "https://api.example"
  ) {
    throw new Error("provider credential was not redacted in the job payload");
  }
  pass("provider credentials are redacted in job payloads (secret_ref only; no raw secret)");

  // ---- Tenant isolation: A cannot cancel B's job --------------------------------
  const jobB = await jobs.submit({
    context: ctxAdminB,
    classification: "operational-automation-job",
    jobType: "b-only",
  });
  if (!jobB.ok) throw new Error("tenant B admin could not create a job");
  const crossCancel = await jobs.cancel(ctxAdminA, jobB.job.jobId);
  if (crossCancel.ok) throw new Error("tenant A cancelled a tenant B job");
  pass("tenant A cannot cancel a tenant B job (PDP tenant-boundary)");

  // ---- Authorized, tenant-scoped read/list; cross-tenant read denied -------------
  const readOwn = await jobs.read(ctxAdminA, created.job.jobId);
  if (!readOwn.ok) throw new Error("tenant A could not read its own job");
  const readCross = await jobs.read(ctxAdminA, jobB.job.jobId);
  if (readCross.ok) throw new Error("tenant A read a tenant B job");
  const memberRead = await jobs.read(ctxMemberA, created.job.jobId);
  if (!memberRead.ok) throw new Error("a tenant member with job.read could not read");
  const listed = await jobs.list(ctxAdminA);
  if (!listed.ok || listed.views.some((v) => v.tenantId !== TENANT_A)) {
    throw new Error("job list leaked another tenant or was denied");
  }
  pass("job read/list are PDP-gated and tenant-scoped (cross-tenant read denied)");

  // ---- Cross-tenant orchestration is tenant-by-tenant ---------------------------
  const sa = await jobs.submit({
    context: ctxServiceA,
    classification: "scheduled-maintenance-job",
    jobType: "cleanup",
  });
  const sbDenied = await jobs.submit({
    context: ctxServiceB,
    classification: "scheduled-maintenance-job",
    jobType: "cleanup",
  });
  if (!sa.ok) throw new Error("service actor could not run in tenant A");
  if (sbDenied.ok) throw new Error("service actor ran in tenant B without a tenant B membership");
  if (
    sa.job.tenantId !== TENANT_A ||
    jobStore.forTenant(TENANT_A).some((j) => j.tenantId === TENANT_B)
  ) {
    throw new Error("cross-tenant leakage detected");
  }
  pass(
    "cross-tenant orchestration is tenant-by-tenant (service actor needs a membership per tenant)",
  );

  // ---- Cancelled and expired jobs never run -------------------------------------
  const isolated = new InMemoryOperationalJobStore();
  const jobsIso = createJobService({
    jobs: isolated,
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    leaseSeconds: 50,
    defaultBackoff: BACKOFF,
  });
  const c = await jobsIso.submit({
    context: ctxAdminA,
    classification: "operational-automation-job",
    jobType: "to-cancel",
  });
  if (!c.ok) throw new Error("submit to-cancel failed");
  await jobsIso.cancel(ctxAdminA, c.job.jobId);
  const claimedAfterCancel = await jobsIso.claimAndRun("w-iso", () => ({ ok: true as const }));
  if (claimedAfterCancel !== undefined) throw new Error("a cancelled job was claimed and run");
  pass("a cancelled job is never claimed or run");

  // expired status is terminal: put one and prove claim skips it
  const e = await jobsIso.submit({
    context: ctxAdminA,
    classification: "operational-automation-job",
    jobType: "to-expire",
  });
  if (!e.ok) throw new Error("submit to-expire failed");
  isolated.put({ ...e.job, status: "expired" });
  if ((await jobsIso.claimAndRun("w-iso", () => ({ ok: true as const }))) !== undefined) {
    throw new Error("an expired job was claimed and run");
  }
  pass("an expired job is never claimed or run");

  // ---- Lease ownership + safe re-acquire ----------------------------------------
  const leaseStore = new InMemoryOperationalJobStore();
  const jobsLease = createJobService({
    jobs: leaseStore,
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    leaseSeconds: 50,
    defaultBackoff: BACKOFF,
  });
  const l = await jobsLease.submit({
    context: ctxAdminA,
    classification: "operational-automation-job",
    jobType: "leased-work",
  });
  if (!l.ok) throw new Error("submit leased-work failed");
  const leasedByW1 = leaseStore.claim({ now: clockSec, leaseOwner: "w1", leaseSeconds: 50 });
  if (!leasedByW1 || leasedByW1.leaseOwner !== "w1") throw new Error("w1 did not lease the job");
  const stolen = leaseStore.claim({ now: clockSec, leaseOwner: "w2", leaseSeconds: 50 });
  if (stolen !== undefined) throw new Error("w2 grabbed a job still leased by w1");
  const reacquired = leaseStore.claim({ now: clockSec + 100, leaseOwner: "w2", leaseSeconds: 50 });
  if (!reacquired || reacquired.leaseOwner !== "w2")
    throw new Error("expired lease could not be safely re-acquired");
  pass("lease is exclusive while held and safely re-acquired after expiry");

  // ---- Deterministic scheduling + fail-closed on unknown schedule ---------------
  const spec: ScheduleSpec = assertSchedule({
    scheduleId: "nightly-cleanup",
    intervalSeconds: 3600,
    timezone: "UTC",
    anchorEpochSeconds: 0,
    missedRunPolicy: "skip",
    maxCatchupRuns: 1,
  });
  const schedStore = new InMemoryOperationalJobStore();
  const jobsSched = createJobService({
    jobs: schedStore,
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    defaultBackoff: BACKOFF,
  });
  const fire1 = await jobsSched.runDueSchedule(ctxAdminA, spec, clockSec, {
    classification: "scheduled-maintenance-job",
    jobType: "cleanup",
  });
  const fire2 = await jobsSched.runDueSchedule(ctxAdminA, spec, clockSec, {
    classification: "scheduled-maintenance-job",
    jobType: "cleanup",
  });
  if (!fire1.ok || fire2.ok) throw new Error("schedule did not dedupe within the same window");
  pass("schedule fires deterministically once per window (double tick deduped)");

  let unknownScheduleFailedClosed = false;
  try {
    assertSchedule({
      scheduleId: "bad",
      intervalSeconds: 3600,
      timezone: "America/Chicago" as "UTC",
      anchorEpochSeconds: 0,
      missedRunPolicy: "skip",
      maxCatchupRuns: 1,
    });
  } catch {
    unknownScheduleFailedClosed = true;
  }
  if (!unknownScheduleFailedClosed) throw new Error("non-UTC schedule was accepted");
  pass("unknown/non-UTC schedule policy fails closed");

  // ---- Successful job for audit completeness (isolated store) -------------------
  const okStore = new InMemoryOperationalJobStore();
  const okSvc = createJobService({
    jobs: okStore,
    pdp,
    memberships,
    audit,
    now: () => clockSec,
    defaultBackoff: BACKOFF,
  });
  await okSvc.submit({
    context: ctxAdminA,
    classification: "audit-maintenance-job",
    jobType: "ok-job",
  });
  const okRun = await okSvc.claimAndRun("w-ok", () => ({ ok: true as const }));
  if (!okRun || okRun.status !== "succeeded") throw new Error("a successful job did not complete");
  pass("a successful job completes (job.completed)");

  // ---- Workflow approval separation of duties + tenant binding ------------------
  const wf = await workflows.start(ctxAdminA, {
    classification: "human-approval-flow",
    workflowType: "access-grant",
    workflowVersion: "1",
  });
  if (!wf.ok) throw new Error("workflow start failed");
  await workflows.requestApproval(ctxAdminA, wf.workflow.workflowId);
  const selfApprove = await workflows.approve(ctxAdminA, wf.workflow.workflowId);
  if (selfApprove.ok) throw new Error("requester self-approved their own workflow");
  pass("approval requester cannot self-approve (separation of duties)");
  const otherApprove = await workflows.approve(ctxAdminA2, wf.workflow.workflowId);
  if (!otherApprove.ok || otherApprove.workflow.status !== "completed")
    throw new Error("a separate approver could not approve");
  pass("a separate authorized approver can approve (audited)");
  if (workflows.canAccess(wf.workflow.workflowId, TENANT_B))
    throw new Error("workflow accessible cross-tenant");
  pass("workflow is tenant-bound (cross-tenant access denied)");

  // ---- Audit lifecycle coverage + value-free ------------------------------------
  const types = new Set(recorded.map((e) => e.eventType));
  for (const required of [
    "job.created",
    "job.started",
    "job.completed",
    "job.failed",
    "job.retrying",
    "job.dead_lettered",
    "job.cancelled",
    "job.denied",
    "workflow.started",
    "workflow.approval.requested",
    "workflow.approval.approved",
  ]) {
    if (!types.has(required)) throw new Error(`missing audit event: ${required}`);
  }
  pass(`job/workflow lifecycle audited (${recorded.length} events across ${types.size} types)`);

  const dump = JSON.stringify(recorded);
  for (const needle of ["sk_live_", "postgres://user:p4ss@", "eyJ"]) {
    if (dump.includes(needle))
      throw new Error(`secret-looking content leaked into audit: ${needle}`);
  }
  pass("audit evidence is value-free (no secret/payload/credential leakage)");

  return {
    status: "pass" as const,
    proof: "jobs-workflows",
    providerMode: "hermetic-mock" as const,
    environment: "hermetic" as const,
    proofLevelObserved: "behaviour-proven" as const,
    liveExternalProviderClaim: false,
    liveTemporalClaim: false,
    liveWindmillClaim: false,
    liveQueueClaim: false,
    productionLiveClaim: false,
    checks: checks.length,
    checkLabels: checks,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}

export { main as runJobsWorkflowsProof };
