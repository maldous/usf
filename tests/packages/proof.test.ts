import { runBootstrapProof, runDevSmoke } from "@foundation/proof";
import { describe, expect, it } from "vitest";

describe("bootstrap proof", () => {
  it("proves hermetic local behaviour without live provider claims", async () => {
    await expect(runBootstrapProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      liveExternalProviderClaim: false,
      productionLiveClaim: false,
    });
  });

  it("proves the controlled dev runtime smoke path", async () => {
    await expect(runDevSmoke()).resolves.toMatchObject({
      providerMode: "dev in-memory",
      tenantAcceptedStatus: 200,
      tenantMismatchStatus: 400,
    });
  });
});
