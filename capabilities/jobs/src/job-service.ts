import {
  assertBoundedBackoff,
  assertSchedule,
  type BackoffPolicy,
  createAuditEventDraft,
  isRetryable,
  isServiceActor,
  isTerminalJobStatus,
  type JobClassification,
  type JobFailureClass,
  type JobRecord,
  type JobStatus,
  nextBackoffSeconds,
  redactJobPayload,
  type SafeJobView,
  safeFailureMessage,
  type ScheduleSpec,
  scheduleDueKey,
  stableId,
  type TenantContext,
  toSafeJobView,
} from "@foundation/core";
import type {
  AuditRecorder,
  OperationalJobPort,
  PolicyDecisionPoint,
  TenantMembershipDirectory,
} from "@foundation/ports";

// Operational job/automation service (parity-jobs-workflows, USF-133 / ADR 0011 / ADR
// 0013). Controlled execution: every job is classified, tenant-scoped (or run by a
// concrete service actor), PDP-authorized, bounded-retry, idempotent on side effects,
// value-redacted on failure, and audited. Depends only on USF ports (never Temporal/
// Windmill). Failures dead-letter with evidence; cancelled/expired jobs never run.

const DEFAULT_BACKOFF: BackoffPolicy = Object.freeze({
  strategy: "exponential",
  baseSeconds: 5,
  factor: 2,
  maxRetries: 5,
  maxBackoffSeconds: 3600,
  jitter: false,
});

export type JobRunResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly failureClass: JobFailureClass; readonly message: string };

export type JobHandler = (job: JobRecord) => Promise<JobRunResult> | JobRunResult;

export type SubmitOutcome =
  | { readonly ok: true; readonly job: JobRecord; readonly deduplicated: boolean }
  | { readonly ok: false; readonly reasonCode: string };

export interface JobServiceDeps {
  readonly jobs: OperationalJobPort;
  readonly pdp: PolicyDecisionPoint;
  readonly memberships: TenantMembershipDirectory;
  readonly audit: AuditRecorder;
  readonly now?: () => number;
  readonly leaseSeconds?: number;
  readonly defaultBackoff?: BackoffPolicy;
}

export interface JobService {
  submit(input: {
    context: TenantContext;
    classification: JobClassification;
    jobType: string;
    payload?: Readonly<Record<string, unknown>>;
    idempotencyKey?: string;
    maxRetries?: number;
    priority?: number;
    runAfterSec?: number;
  }): Promise<SubmitOutcome>;
  claimAndRun(leaseOwner: string, handler: JobHandler): Promise<JobRecord | undefined>;
  cancel(context: TenantContext, jobId: string): Promise<{ ok: boolean; reasonCode: string }>;
  retryFromDeadLetter(
    context: TenantContext,
    jobId: string,
  ): Promise<{ ok: boolean; reasonCode: string }>;
  runDueSchedule(
    context: TenantContext,
    spec: ScheduleSpec,
    nowSec: number,
    job: { classification: JobClassification; jobType: string },
  ): Promise<SubmitOutcome | { ok: false; reasonCode: "already-enqueued-this-window" }>;
  read(
    context: TenantContext,
    jobId: string,
  ): Promise<{ ok: true; view: SafeJobView } | { ok: false; reasonCode: string }>;
  list(
    context: TenantContext,
  ): Promise<{ ok: true; views: readonly SafeJobView[] } | { ok: false; reasonCode: string }>;
}

export function createJobService(deps: JobServiceDeps): JobService {
  const clock = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const leaseSeconds = deps.leaseSeconds ?? 300;
  const backoff = assertBoundedBackoff(deps.defaultBackoff ?? DEFAULT_BACKOFF);
  let seq = 0;

  async function emit(input: {
    eventType: string;
    job: JobRecord;
    outcome: "success" | "denied" | "failed";
    reasonCode?: string;
  }): Promise<void> {
    seq += 1;
    await deps.audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [
          input.job.tenantId ?? "platform",
          input.job.jobId,
          input.eventType,
          String(seq),
        ]),
        eventType: input.eventType,
        tenantId: input.job.tenantId ?? "platform",
        actorId: input.job.actorId,
        action: input.eventType,
        outcome: input.outcome,
        reasonCode: input.reasonCode ?? "ok",
        resourceType: "job",
        resourceId: input.job.jobId,
        recordedByComponent: "job-service",
        metadata: {
          classification: input.job.classification,
          jobType: input.job.jobType,
          status: input.job.status,
          attempt: String(input.job.attempt),
          serviceActor: input.job.serviceActorId ?? "none",
          ...(input.job.failureClass ? { failureClass: input.job.failureClass } : {}),
        },
      }),
    );
  }

  // Authorize against the RESOURCE tenant. For an existing job we pass the job's own
  // tenant, so the PDP tenant-boundary rule (resource.tenantId must equal the context
  // tenant) is a real cross-tenant backstop, not a tautology.
  function authorize(
    context: TenantContext,
    action: string,
    jobId: string,
    resourceTenantId: string = context.tenantId,
  ): string | null {
    const decision = deps.pdp.decide({
      context,
      action,
      resource: { type: "job", id: jobId, tenantId: resourceTenantId, attributes: {} },
    });
    return decision.effect === "permit" ? null : decision.reasonCode;
  }

  return {
    async submit(input) {
      const now = clock();
      const jobId = stableId("job", [
        input.context.tenantId,
        input.jobType,
        String(now),
        String(seq + 1),
      ]);
      const denyReason = authorize(input.context, "job.create", jobId);
      if (denyReason) {
        await emit({
          eventType: "job.denied",
          job: skeletonJob(input, jobId, now, input.context, "blocked"),
          outcome: "denied",
          reasonCode: denyReason,
        });
        return { ok: false, reasonCode: denyReason };
      }

      // Idempotency: a duplicate submission does not create a second job (no duplicate
      // externally visible side effect). Retries reuse the same key.
      if (
        input.idempotencyKey &&
        deps.jobs.hasIdempotencyKey(input.context.tenantId, input.idempotencyKey)
      ) {
        const existing = deps.jobs
          .forTenant(input.context.tenantId)
          .find((j) => j.idempotencyKey === input.idempotencyKey);
        if (existing) {
          return { ok: true, job: existing, deduplicated: true };
        }
      }

      const runAfter = input.runAfterSec ?? now;
      const status: JobStatus = runAfter > now ? "scheduled" : "queued";
      const job: JobRecord = Object.freeze({
        ...skeletonJob(input, jobId, now, input.context, status),
        runAfter,
        maxRetries: input.maxRetries ?? backoff.maxRetries,
        priority: input.priority ?? 0,
      });
      deps.jobs.submit(job);
      await emit({ eventType: "job.created", job, outcome: "success" });
      if (status === "scheduled") {
        await emit({ eventType: "job.scheduled", job, outcome: "success" });
      }
      return { ok: true, job, deduplicated: false };
    },

    async claimAndRun(leaseOwner, handler) {
      const now = clock();
      const leased = deps.jobs.claim({ now, leaseOwner, leaseSeconds });
      if (!leased) {
        return undefined;
      }
      await emit({ eventType: "job.leased", job: leased, outcome: "success" });
      const running: JobRecord = Object.freeze({ ...leased, status: "running", updatedAt: now });
      deps.jobs.put(running);
      await emit({ eventType: "job.started", job: running, outcome: "success" });

      let result: JobRunResult;
      try {
        result = await handler(running);
      } catch (error) {
        result = {
          ok: false,
          failureClass: "unknown",
          message: error instanceof Error ? error.message : "handler threw",
        };
      }

      if (result.ok) {
        const done: JobRecord = Object.freeze({
          ...running,
          status: "succeeded",
          leaseOwner: null,
          updatedAt: clock(),
        });
        deps.jobs.put(done);
        await emit({ eventType: "job.completed", job: done, outcome: "success" });
        return done;
      }

      const attempt = running.attempt + 1;
      const safeMsg = safeFailureMessage(result.message);
      if (isRetryable(result.failureClass, attempt, running.maxRetries)) {
        const retrying: JobRecord = Object.freeze({
          ...running,
          status: "retrying",
          attempt,
          leaseOwner: null,
          leaseExpiresAt: null,
          runAfter: clock() + nextBackoffSeconds(backoff, attempt),
          failureClass: result.failureClass,
          safeFailureMessage: safeMsg,
          updatedAt: clock(),
        });
        deps.jobs.put(retrying);
        await emit({
          eventType: "job.failed",
          job: retrying,
          outcome: "failed",
          reasonCode: result.failureClass,
        });
        await emit({
          eventType: "job.retrying",
          job: retrying,
          outcome: "success",
          reasonCode: result.failureClass,
        });
        return retrying;
      }

      // Bounded retries exhausted or non-retryable failure: dead-letter WITH evidence.
      const dead: JobRecord = Object.freeze({
        ...running,
        status: "dead-lettered",
        attempt,
        leaseOwner: null,
        leaseExpiresAt: null,
        failureClass: result.failureClass,
        safeFailureMessage: safeMsg,
        deadLetterReason: result.failureClass,
        updatedAt: clock(),
      });
      deps.jobs.put(dead);
      await emit({
        eventType: "job.failed",
        job: dead,
        outcome: "failed",
        reasonCode: result.failureClass,
      });
      await emit({
        eventType: "job.dead_lettered",
        job: dead,
        outcome: "failed",
        reasonCode: result.failureClass,
      });
      return dead;
    },

    async cancel(context, jobId) {
      const job = deps.jobs.get(jobId);
      if (!job) {
        return { ok: false, reasonCode: "no-job" };
      }
      // Authorize against the job's tenant: a cross-tenant context fails the PDP
      // tenant-boundary rule (the real backstop). The explicit equality check below is
      // defence in depth for the null-tenant (system) case.
      const denyReason = authorize(context, "job.cancel", jobId, job.tenantId ?? context.tenantId);
      if (denyReason) {
        return { ok: false, reasonCode: denyReason };
      }
      if (job.tenantId !== context.tenantId) {
        return { ok: false, reasonCode: "tenant-boundary" };
      }
      if (isTerminalJobStatus(job.status)) {
        return { ok: false, reasonCode: "already-terminal" };
      }
      const cancelled: JobRecord = Object.freeze({
        ...job,
        status: "cancelled",
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: clock(),
      });
      deps.jobs.put(cancelled);
      await emit({ eventType: "job.cancelled", job: cancelled, outcome: "success" });
      return { ok: true, reasonCode: "cancelled" };
    },

    async retryFromDeadLetter(context, jobId) {
      const job = deps.jobs.get(jobId);
      if (!job || job.tenantId !== context.tenantId) {
        return { ok: false, reasonCode: "no-job" };
      }
      const denyReason = authorize(
        context,
        "job.dead_letter.retry",
        jobId,
        job.tenantId ?? context.tenantId,
      );
      if (denyReason) {
        return { ok: false, reasonCode: denyReason };
      }
      if (job.status !== "dead-lettered") {
        return { ok: false, reasonCode: "not-dead-lettered" };
      }
      const requeued: JobRecord = Object.freeze({
        ...job,
        status: "queued",
        attempt: 0,
        runAfter: clock(),
        deadLetterReason: null,
        updatedAt: clock(),
      });
      deps.jobs.put(requeued);
      await emit({
        eventType: "job.created",
        job: requeued,
        outcome: "success",
        reasonCode: "dead-letter-retry",
      });
      return { ok: true, reasonCode: "requeued" };
    },

    async runDueSchedule(context, spec, nowSec, jobSpec) {
      // Defence in depth: an unknown/non-UTC schedule fails closed in the service path,
      // not only at the caller's construction site.
      assertSchedule(spec);
      // Same window -> same idempotency key -> a double tick never double-enqueues.
      const dueKey = scheduleDueKey(spec, nowSec);
      if (deps.jobs.hasIdempotencyKey(context.tenantId, dueKey)) {
        return { ok: false, reasonCode: "already-enqueued-this-window" };
      }
      return this.submit({
        context,
        classification: jobSpec.classification,
        jobType: jobSpec.jobType,
        idempotencyKey: dueKey,
        runAfterSec: nowSec,
      });
    },

    async read(context, jobId) {
      const job = deps.jobs.get(jobId);
      if (!job) {
        return { ok: false, reasonCode: "no-job" };
      }
      // Tenant-scoped, PDP-gated read: authorize against the job's tenant so a
      // cross-tenant read is denied by the PDP tenant-boundary rule.
      const denyReason = authorize(context, "job.read", jobId, job.tenantId ?? context.tenantId);
      if (denyReason || job.tenantId !== context.tenantId) {
        return { ok: false, reasonCode: denyReason ?? "tenant-boundary" };
      }
      return { ok: true, view: toSafeJobView(job) };
    },

    async list(context) {
      const denyReason = authorize(context, "job.list", `tenant:${context.tenantId}`);
      if (denyReason) {
        return { ok: false, reasonCode: denyReason };
      }
      // Tenant-scoped projection (redacted, no payload/lease internals).
      return { ok: true, views: deps.jobs.forTenant(context.tenantId).map(toSafeJobView) };
    },
  };
}

function skeletonJob(
  input: {
    classification: JobClassification;
    jobType: string;
    payload?: Readonly<Record<string, unknown>>;
    idempotencyKey?: string;
  },
  jobId: string,
  now: number,
  context: TenantContext,
  status: JobStatus,
): JobRecord {
  return {
    jobId,
    tenantId: context.tenantId,
    classification: input.classification,
    jobType: input.jobType,
    status,
    actorId: context.actorId,
    serviceActorId: isServiceActor(context.actorId) ? context.actorId : null,
    idempotencyKey: input.idempotencyKey ?? null,
    correlationId: jobId,
    priority: 0,
    runAfter: now,
    attempt: 0,
    maxRetries: DEFAULT_BACKOFF.maxRetries,
    leaseOwner: null,
    leaseExpiresAt: null,
    deadLetterReason: null,
    failureClass: null,
    safeFailureMessage: null,
    payloadRefs: redactJobPayload(input.payload ?? {}),
    createdAt: now,
    updatedAt: now,
  };
}
