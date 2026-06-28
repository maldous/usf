import { stableId, type JobRecord, type JobStatus, type WorkflowRecord } from "@foundation/core";
import type { DurableWorkflowPort, OperationalJobPort, WorkflowEngine } from "@foundation/ports";

export class InMemoryWorkflowEngine implements WorkflowEngine {
  readonly #scheduled: string[] = [];

  async schedule(input: { tenantId: string; workflow: string; payload: unknown }): Promise<string> {
    const id = stableId("workflow", [
      input.tenantId,
      input.workflow,
      String(this.#scheduled.length + 1),
    ]);
    this.#scheduled.push(id);
    return id;
  }

  list(): readonly string[] {
    return [...this.#scheduled];
  }
}

// In-memory operational job store + queue (parity-jobs-workflows, USF-133 / ADR 0011).
// Dev/test adapter only; a composed-test (Windmill-like) adapter is deferred. No live
// queue/worker claim. Lease selection is deterministic (priority, then runAfter, then id).
export class InMemoryOperationalJobStore implements OperationalJobPort {
  readonly #byId = new Map<string, JobRecord>();
  readonly #idempotency = new Set<string>();

  #idemKey(tenantId: string | null, key: string): string {
    return `${tenantId ?? "*"}::${key}`;
  }

  submit(record: JobRecord): void {
    if (record.idempotencyKey) {
      this.#idempotency.add(this.#idemKey(record.tenantId, record.idempotencyKey));
    }
    this.#byId.set(record.jobId, record);
  }

  get(jobId: string): JobRecord | undefined {
    return this.#byId.get(jobId);
  }

  put(record: JobRecord): void {
    this.#byId.set(record.jobId, record);
  }

  claim(input: { now: number; leaseOwner: string; leaseSeconds: number }): JobRecord | undefined {
    const fresh: JobStatus[] = ["queued", "scheduled", "retrying"];
    const claimable = (j: JobRecord): boolean => {
      const leaseExpired = j.leaseExpiresAt !== null && j.leaseExpiresAt <= input.now;
      if (fresh.includes(j.status)) {
        return j.runAfter <= input.now && (j.leaseExpiresAt === null || leaseExpired);
      }
      // An abandoned lease (leased/running past its expiry) is safely re-acquirable.
      if (j.status === "leased" || j.status === "running") {
        return leaseExpired;
      }
      return false;
    };
    const candidates = [...this.#byId.values()]
      .filter(claimable)
      .sort(
        (a, b) =>
          b.priority - a.priority || a.runAfter - b.runAfter || a.jobId.localeCompare(b.jobId),
      );
    const next = candidates[0];
    if (!next) {
      return undefined;
    }
    const leased: JobRecord = Object.freeze({
      ...next,
      status: "leased",
      leaseOwner: input.leaseOwner,
      leaseExpiresAt: input.now + input.leaseSeconds,
      updatedAt: input.now,
    });
    this.#byId.set(leased.jobId, leased);
    return leased;
  }

  forTenant(tenantId: string): readonly JobRecord[] {
    return [...this.#byId.values()].filter((j) => j.tenantId === tenantId);
  }

  deadLettered(): readonly JobRecord[] {
    return [...this.#byId.values()].filter((j) => j.status === "dead-lettered");
  }

  hasIdempotencyKey(tenantId: string | null, idempotencyKey: string): boolean {
    return this.#idempotency.has(this.#idemKey(tenantId, idempotencyKey));
  }
}

// In-memory durable workflow store (parity-jobs-workflows, USF-133 / ADR 0011).
// Dev/test adapter only; Temporal is the canonical composed-test provider (deferred —
// no live claim). Capabilities depend on the port, never on this class directly.
export class InMemoryDurableWorkflow implements DurableWorkflowPort {
  readonly #byId = new Map<string, WorkflowRecord>();

  start(record: WorkflowRecord): void {
    this.#byId.set(record.workflowId, record);
  }

  get(workflowId: string): WorkflowRecord | undefined {
    return this.#byId.get(workflowId);
  }

  put(record: WorkflowRecord): void {
    this.#byId.set(record.workflowId, record);
  }

  forTenant(tenantId: string): readonly WorkflowRecord[] {
    return [...this.#byId.values()].filter((w) => w.tenantId === tenantId);
  }
}
