import {
  runAuthIdentityProof,
  runApiContractsProof,
  runBootstrapProof,
  runDevSmoke,
  runJobsWorkflowsProof,
} from "@foundation/proof";
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

describe("keycloak-brokered auth/identity proof", () => {
  it("proves hermetic Keycloak token validation, identity mapping, sessions, and tenant handoff", async () => {
    await expect(runAuthIdentityProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      keycloakSoleIssuer: true,
      liveExternalProviderClaim: false,
      liveKeycloakClaim: false,
      brokeredUpstreamAcceptedDirectly: false,
      productionLiveClaim: false,
    });
  });
});

describe("jobs/workflows proof", () => {
  it("proves tenant-safe, idempotent, bounded-retry, audited job/workflow execution", async () => {
    await expect(runJobsWorkflowsProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      liveTemporalClaim: false,
      liveWindmillClaim: false,
      liveQueueClaim: false,
      productionLiveClaim: false,
    });
  });
});

describe("api/contracts proof", () => {
  it("proves guarded, tenant-safe, idempotent API contract readiness without public API claims", async () => {
    await expect(runApiContractsProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      publicApiReadinessClaim: false,
      externalSdkReadinessClaim: false,
      productionLiveClaim: false,
    });
  });
});
