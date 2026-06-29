import {
  runAuthIdentityProof,
  runApiContractsProof,
  runBootstrapProof,
  runDevSmoke,
  runJobsWorkflowsProof,
  runImportExportBulkProof,
  runObservabilityTelemetryProof,
  runProviderAdaptersProof,
  runRateLimitsAbuseControlsProof,
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

describe("provider adapters/modes proof", () => {
  it("proves provider registry, mode boundaries, redaction, and import boundaries without live claims", async () => {
    await expect(runProviderAdaptersProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      liveProviderReadinessClaim: false,
      liveExternalProviderReadinessClaim: false,
      productionLiveClaim: false,
      supplierApprovalClaim: false,
    });
  });
});

describe("observability/telemetry proof", () => {
  it("proves redacted tenant-safe telemetry without live monitoring claims", async () => {
    await expect(runObservabilityTelemetryProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      liveMonitoringReadinessClaim: false,
      liveMetricsBackendClaim: false,
      liveLogBackendClaim: false,
      liveTracingBackendClaim: false,
      liveAlertingClaim: false,
      siemReadinessClaim: false,
      productionLiveClaim: false,
    });
  });
});

describe("rate-limits/abuse-controls proof", () => {
  it("proves tenant-safe fail-closed guardrails without live enforcement claims", async () => {
    await expect(runRateLimitsAbuseControlsProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      enforcementPosture: "single-node-in-memory-local-dev-test",
      liveWafReadinessClaim: false,
      liveEdgeReadinessClaim: false,
      liveGatewayReadinessClaim: false,
      liveAbuseProviderReadinessClaim: false,
      productionLiveClaim: false,
    });
  });
});

describe("import/export/bulk proof", () => {
  it("proves tenant-safe governed data movement without production or regulatory export claims", async () => {
    await expect(runImportExportBulkProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      bulkProcessingPosture: "local-dev-test-in-memory",
      productionImportExportReadinessClaim: false,
      regulatoryExportReadinessClaim: false,
      legalExportReadinessClaim: false,
      eDiscoveryReadinessClaim: false,
      liveExternalProviderReadinessClaim: false,
      productionLiveClaim: false,
    });
  });
});
