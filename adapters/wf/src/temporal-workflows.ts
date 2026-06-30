export interface TemporalSyntheticWorkflowInput {
  readonly tenantIdHash: string;
  readonly workflowNameHash: string;
  readonly payloadHash: string;
}

export interface TemporalSyntheticWorkflowResult {
  readonly completed: true;
  readonly workflowIdObserved: boolean;
  readonly tenantIdHash: string;
  readonly workflowNameHash: string;
  readonly payloadHash: string;
}

export async function syntheticTenantWorkflow(
  input: TemporalSyntheticWorkflowInput,
): Promise<TemporalSyntheticWorkflowResult> {
  return {
    completed: true,
    workflowIdObserved: true,
    tenantIdHash: input.tenantIdHash,
    workflowNameHash: input.workflowNameHash,
    payloadHash: input.payloadHash,
  };
}
