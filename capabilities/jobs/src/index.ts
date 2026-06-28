import type { TenantContext } from "@foundation/core";
import type { WorkflowEngine } from "@foundation/ports";

export class JobCapability {
  constructor(private readonly workflowEngine: WorkflowEngine) {}

  scheduleTenantJob(context: TenantContext, workflow: string, payload: unknown): Promise<string> {
    return this.workflowEngine.schedule({ tenantId: context.tenantId, workflow, payload });
  }
}
