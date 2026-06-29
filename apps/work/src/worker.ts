import { createTenantContext } from "@foundation/core";
import {
  DEV_ACTOR_ID,
  DEV_TENANT_ID,
  createDevRuntime,
  runtimeModeFromEnv,
  type DevRuntimeMode,
} from "@foundation/app-api/runtime";

export interface WorkerSmokeSummary {
  readonly workerRuntime: "apps/work";
  readonly runtimeMode: DevRuntimeMode;
  readonly providerMode: "dev in-memory";
  readonly tenantId: typeof DEV_TENANT_ID;
  readonly actorId: typeof DEV_ACTOR_ID;
  readonly jobId: string;
  readonly jobStatus: string;
  readonly auditEvents: number;
  readonly tenantBoundaryDenied: true;
  readonly authorizationDenied: true;
  readonly syntheticDataBoundary: "synthetic tenant, actor, and job payload only";
  readonly secretBoundary: "no real secrets or external provider credentials";
  readonly deferredBoundaries: readonly string[];
}

export async function runWorkerSmoke(
  options: { readonly runtimeMode?: DevRuntimeMode } = {},
): Promise<WorkerSmokeSummary> {
  const runtime = createDevRuntime({ runtimeMode: options.runtimeMode ?? runtimeModeFromEnv() });
  const context = createTenantContext({
    tenantId: DEV_TENANT_ID,
    actorId: DEV_ACTOR_ID,
    roles: ["tenant-admin"],
  });

  const submitted = await runtime.jobService.submit({
    context,
    classification: "scheduled-maintenance-job",
    jobType: "runtime-proof.synthetic-maintenance",
    payload: {
      proofMode: runtime.runtimeMode,
      synthetic: true,
    },
    idempotencyKey: `runtime-proof-${runtime.runtimeMode}`,
  });
  if (!submitted.ok) {
    throw new Error(`worker smoke job submission denied: ${submitted.reasonCode}`);
  }

  const completed = await runtime.jobService.claimAndRun("runtime-proof-worker", () => ({
    ok: true,
  }));
  if (!completed || completed.status !== "succeeded") {
    throw new Error("worker smoke job did not execute to succeeded status");
  }

  const otherTenant = createTenantContext({
    tenantId: "other-dev-tenant",
    actorId: "other-dev-actor",
    roles: ["tenant-admin"],
  });
  const crossTenantRead = await runtime.jobService.read(otherTenant, submitted.job.jobId);
  if (crossTenantRead.ok) {
    throw new Error("worker smoke cross-tenant read did not fail closed");
  }

  const unauthorized = createTenantContext({
    tenantId: DEV_TENANT_ID,
    actorId: "unauthorized-worker-actor",
    roles: ["tenant-member"],
  });
  const denied = await runtime.jobService.submit({
    context: unauthorized,
    classification: "scheduled-maintenance-job",
    jobType: "runtime-proof.synthetic-denied",
    payload: {
      proofMode: runtime.runtimeMode,
      synthetic: true,
    },
  });
  if (denied.ok) {
    throw new Error("worker smoke authorization failure did not fail closed");
  }

  const audit = await runtime.auditEvents.query(context, {
    tenantId: context.tenantId,
    limit: 100,
  });
  if (audit.events.length < 5) {
    throw new Error("worker smoke did not capture expected audit events");
  }

  return {
    workerRuntime: "apps/work",
    runtimeMode: runtime.runtimeMode,
    providerMode: runtime.providerModeLabel,
    tenantId: DEV_TENANT_ID,
    actorId: DEV_ACTOR_ID,
    jobId: submitted.job.jobId,
    jobStatus: completed.status,
    auditEvents: audit.events.length,
    tenantBoundaryDenied: true,
    authorizationDenied: true,
    syntheticDataBoundary: "synthetic tenant, actor, and job payload only",
    secretBoundary: "no real secrets or external provider credentials",
    deferredBoundaries: runtime.deferredBoundaries,
  };
}
