import { InMemoryWorkflowEngine } from "@foundation/adapter-wf";
import { JobCapability } from "@foundation/capability-jobs";
import { createTenantContext } from "@foundation/core";

export async function runWorkerSmoke(): Promise<string> {
  const jobs = new JobCapability(new InMemoryWorkflowEngine());
  return jobs.scheduleTenantJob(
    createTenantContext({
      tenantId: "11111111-1111-4111-8111-111111111111",
      actorId: "system-worker",
      roles: ["system"],
    }),
    "tenant-maintenance",
    { mode: "local-dev-test" },
  );
}
