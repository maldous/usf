import { runWorkerSmoke } from "@foundation/app-work";
import { describe, expect, it } from "vitest";

describe("dev worker entrypoint", () => {
  it("schedules the local dev worker smoke job through in-memory workflow", async () => {
    await expect(runWorkerSmoke()).resolves.toBe(
      "workflow_11111111-1111-4111-8111-111111111111_tenant-maintenance_1",
    );
  });
});
