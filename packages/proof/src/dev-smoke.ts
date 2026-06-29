import { fileURLToPath } from "node:url";
import { runRuntimeProofInMemory } from "./runtime-application-proof.ts";

interface SmokeSummary {
  readonly api: string;
  readonly health: string;
  readonly openapi: string;
  readonly runtimeMode: "dev-in-memory";
  readonly providerMode: "dev in-memory";
  readonly tenantAcceptedStatus: number;
  readonly tenantMismatchStatus: number;
  readonly authorizationFailureStatus: number;
  readonly auditEvents: number;
  readonly workerJobStatus: string;
  readonly workerAuditEvents: number;
}

export async function runDevSmoke(): Promise<SmokeSummary> {
  const result = await runRuntimeProofInMemory();
  return {
    api: result.api.api,
    health: result.api.health,
    openapi: result.api.openapi,
    runtimeMode: "dev-in-memory",
    providerMode: "dev in-memory",
    tenantAcceptedStatus: result.api.tenantAcceptedStatus,
    tenantMismatchStatus: result.api.tenantMismatchStatus,
    authorizationFailureStatus: result.api.authorizationFailureStatus,
    auditEvents: result.api.auditEvents,
    workerJobStatus: result.worker.jobStatus,
    workerAuditEvents: result.worker.auditEvents,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runDevSmoke();
  console.log("USF V2 dev-smoke passed");
  console.log(`API: ${result.api}`);
  console.log(`Health: ${result.health}`);
  console.log(`OpenAPI: ${result.openapi}`);
  console.log(`Runtime mode: ${result.runtimeMode}`);
  console.log(`Provider mode: ${result.providerMode}`);
  console.log(`Tenant accepted: ${result.tenantAcceptedStatus}`);
  console.log(`Tenant mismatch: ${result.tenantMismatchStatus}`);
  console.log(`Authorization failure: ${result.authorizationFailureStatus}`);
  console.log(`Audit events captured: ${result.auditEvents}`);
  console.log(`Worker job status: ${result.workerJobStatus}`);
  console.log(`Worker audit events captured: ${result.workerAuditEvents}`);
}
