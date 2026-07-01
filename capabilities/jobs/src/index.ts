import type { TenantContext } from "@foundation/core";
import type { WorkflowEngine } from "@foundation/ports";

export class JobCapability {
  constructor(private readonly workflowEngine: WorkflowEngine) {}

  scheduleTenantJob(context: TenantContext, workflow: string, payload: unknown): Promise<string> {
    return this.workflowEngine.schedule({ tenantId: context.tenantId, workflow, payload });
  }
}

// Jobs/workflows port-family services (parity-jobs-workflows, USF-133 / ADR 0011/0013).
export {
  createJobService,
  type JobHandler,
  type JobRunResult,
  type JobService,
  type JobServiceDeps,
  type SubmitOutcome,
} from "./job-service.ts";
export {
  createWorkflowService,
  type WorkflowOutcome,
  type WorkflowService,
  type WorkflowServiceDeps,
} from "./workflow-service.ts";
export {
  createEnterpriseWorkflowControlPlane,
  EnterpriseWorkflowControlPlane,
  type EnterpriseWorkflowControlEvidence,
  type EnterpriseWorkflowControlsDeps,
} from "./enterprise-workflow-controls.ts";
