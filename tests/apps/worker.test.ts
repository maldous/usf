import { runWorkerSmoke } from "@foundation/app-work";
import { describe, expect, it } from "vitest";

describe("dev worker entrypoint", () => {
  it("executes the local dev worker smoke job with audit and fail-closed proof", async () => {
    const summary = await runWorkerSmoke();
    expect(summary).toMatchObject({
      workerRuntime: "apps/work",
      runtimeMode: "dev-in-memory",
      providerMode: "dev in-memory",
      jobStatus: "succeeded",
      tenantBoundaryDenied: true,
      authorizationDenied: true,
    });
    expect(summary.jobId).toContain("runtime-proof.synthetic-maintenance");
    expect(summary.auditEvents).toBeGreaterThanOrEqual(5);
  });
});
