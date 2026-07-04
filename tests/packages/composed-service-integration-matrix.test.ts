import { describe, expect, it } from "vitest";

import { runComposedServiceIntegrationMatrixProof } from "@foundation/proof";

describe("composed service integration matrix", () => {
  it("covers every generated test Compose service and service-catalogue disposition", () => {
    const summary = runComposedServiceIntegrationMatrixProof();

    expect(summary.status).toBe("pass");
    expect(summary.issueId).toBe("USF-242");
    expect(summary.generatedServiceCount).toBe(33);
    expect(summary.profileCount).toBe(11);
    expect(summary.serviceCatalogueDispositionCount).toBe(39);
    expect(summary.defaultProfileCovered).toBe(true);
    expect(summary.inMemoryServiceSubstituteAllowed).toBe(false);
    expect(summary.testReadinessClaimAllowed).toBe(false);
    expect(summary.nonClaimsPreserved).toBe(true);
  });
});
