import {
  createAuditEventDraft,
  type JobClassification,
  stableId,
  type TenantContext,
  type WorkflowRecord,
} from "@foundation/core";
import type { AuditRecorder, DurableWorkflowPort, PolicyDecisionPoint } from "@foundation/ports";

// Durable workflow + approval service (parity-jobs-workflows, USF-133 / ADR 0011 /
// ADR 0013). Workflows are tenant-bound and versioned; every privileged action goes
// through the PDP; approvals enforce separation of duties (a requester cannot approve
// their own workflow); lifecycle is audited. Depends only on the durable workflow port.

export type WorkflowOutcome =
  | { readonly ok: true; readonly workflow: WorkflowRecord }
  | { readonly ok: false; readonly reasonCode: string };

export interface WorkflowServiceDeps {
  readonly workflows: DurableWorkflowPort;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly now?: () => number;
}

export interface WorkflowService {
  start(
    context: TenantContext,
    input: { classification: JobClassification; workflowType: string; workflowVersion: string },
  ): Promise<WorkflowOutcome>;
  signal(context: TenantContext, workflowId: string): Promise<WorkflowOutcome>;
  cancel(context: TenantContext, workflowId: string): Promise<WorkflowOutcome>;
  requestApproval(context: TenantContext, workflowId: string): Promise<WorkflowOutcome>;
  approve(context: TenantContext, workflowId: string): Promise<WorkflowOutcome>;
  reject(context: TenantContext, workflowId: string): Promise<WorkflowOutcome>;
  canAccess(workflowId: string, tenantId: string): boolean;
}

export function createWorkflowService(deps: WorkflowServiceDeps): WorkflowService {
  const clock = deps.now ?? (() => Math.floor(Date.now() / 1000));
  let seq = 0;

  async function emit(
    workflow: WorkflowRecord,
    eventType: string,
    outcome: "success" | "denied" | "failed",
    reasonCode = "ok",
  ): Promise<void> {
    seq += 1;
    await deps.audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [
          workflow.tenantId ?? "platform",
          workflow.workflowId,
          eventType,
          String(seq),
        ]),
        eventType,
        tenantId: workflow.tenantId ?? "platform",
        actorId: workflow.actorId,
        action: eventType,
        outcome,
        reasonCode,
        resourceType: "workflow",
        resourceId: workflow.workflowId,
        recordedByComponent: "workflow-service",
        metadata: {
          classification: workflow.classification,
          workflowType: workflow.workflowType,
          workflowVersion: workflow.workflowVersion,
          status: workflow.status,
        },
      }),
    );
  }

  function authorize(context: TenantContext, action: string, workflowId: string): string | null {
    const decision = deps.pdp.decide({
      context,
      action,
      resource: { type: "workflow", id: workflowId, tenantId: context.tenantId, attributes: {} },
    });
    return decision.effect === "permit" ? null : decision.reasonCode;
  }

  function loadOwned(context: TenantContext, workflowId: string): WorkflowRecord | undefined {
    const wf = deps.workflows.get(workflowId);
    // Tenant binding: a workflow is only accessible within its own tenant.
    return wf && wf.tenantId === context.tenantId ? wf : undefined;
  }

  return {
    async start(context, input) {
      const workflowId = stableId("wf", [
        context.tenantId,
        input.workflowType,
        String(clock()),
        String(seq + 1),
      ]);
      const deny = authorize(context, "workflow.start", workflowId);
      const now = clock();
      const base: WorkflowRecord = Object.freeze({
        workflowId,
        tenantId: context.tenantId,
        classification: input.classification,
        workflowType: input.workflowType,
        workflowVersion: input.workflowVersion,
        status: "running",
        actorId: context.actorId,
        serviceActorId: null,
        correlationId: workflowId,
        approvalRequestedBy: null,
        approvalDecidedBy: null,
        createdAt: now,
        updatedAt: now,
      });
      if (deny) {
        await emit(base, "workflow.started", "denied", deny);
        return { ok: false, reasonCode: deny };
      }
      deps.workflows.start(base);
      await emit(base, "workflow.started", "success");
      return { ok: true, workflow: base };
    },

    async signal(context, workflowId) {
      const deny = authorize(context, "workflow.signal", workflowId);
      if (deny) return { ok: false, reasonCode: deny };
      const wf = loadOwned(context, workflowId);
      if (!wf) return { ok: false, reasonCode: "no-workflow" };
      await emit(wf, "workflow.signalled", "success");
      return { ok: true, workflow: wf };
    },

    async cancel(context, workflowId) {
      const deny = authorize(context, "workflow.cancel", workflowId);
      if (deny) return { ok: false, reasonCode: deny };
      const wf = loadOwned(context, workflowId);
      if (!wf) return { ok: false, reasonCode: "no-workflow" };
      if (wf.status === "completed" || wf.status === "failed" || wf.status === "cancelled") {
        return { ok: false, reasonCode: "already-terminal" };
      }
      const cancelled: WorkflowRecord = Object.freeze({
        ...wf,
        status: "cancelled",
        updatedAt: clock(),
      });
      deps.workflows.put(cancelled);
      await emit(cancelled, "workflow.cancelled", "success");
      return { ok: true, workflow: cancelled };
    },

    async requestApproval(context, workflowId) {
      const deny = authorize(context, "workflow.start", workflowId);
      if (deny) return { ok: false, reasonCode: deny };
      const wf = loadOwned(context, workflowId);
      if (!wf) return { ok: false, reasonCode: "no-workflow" };
      const waiting: WorkflowRecord = Object.freeze({
        ...wf,
        status: "awaiting-approval",
        approvalRequestedBy: context.actorId,
        updatedAt: clock(),
      });
      deps.workflows.put(waiting);
      await emit(waiting, "workflow.approval.requested", "success");
      return { ok: true, workflow: waiting };
    },

    async approve(context, workflowId) {
      const deny = authorize(context, "workflow.approve", workflowId);
      if (deny) return { ok: false, reasonCode: deny };
      const wf = loadOwned(context, workflowId);
      if (!wf) return { ok: false, reasonCode: "no-workflow" };
      if (wf.status !== "awaiting-approval") {
        return { ok: false, reasonCode: "not-awaiting-approval" };
      }
      // Separation of duties: the requester cannot approve their own workflow.
      if (wf.approvalRequestedBy === context.actorId) {
        await emit(wf, "workflow.approval.rejected", "denied", "requester-cannot-self-approve");
        return { ok: false, reasonCode: "requester-cannot-self-approve" };
      }
      const approved: WorkflowRecord = Object.freeze({
        ...wf,
        status: "completed",
        approvalDecidedBy: context.actorId,
        updatedAt: clock(),
      });
      deps.workflows.put(approved);
      await emit(approved, "workflow.approval.approved", "success");
      return { ok: true, workflow: approved };
    },

    async reject(context, workflowId) {
      const deny = authorize(context, "workflow.reject", workflowId);
      if (deny) return { ok: false, reasonCode: deny };
      const wf = loadOwned(context, workflowId);
      if (!wf) return { ok: false, reasonCode: "no-workflow" };
      const rejected: WorkflowRecord = Object.freeze({
        ...wf,
        status: "failed",
        approvalDecidedBy: context.actorId,
        updatedAt: clock(),
      });
      deps.workflows.put(rejected);
      await emit(rejected, "workflow.approval.rejected", "success");
      return { ok: true, workflow: rejected };
    },

    canAccess(workflowId, tenantId) {
      const wf = deps.workflows.get(workflowId);
      return wf !== undefined && wf.tenantId === tenantId;
    },
  };
}
