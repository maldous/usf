import {
  runAuthIdentityProof,
  runApiContractsProof,
  runBackupRestoreOperationsExecutionProof,
  runBootstrapProof,
  runDevSmoke,
  runJobsWorkflowsProof,
  runGraphqlGeneratedClientExecutionProof,
  runImportExportBulkProof,
  runBrowserTelemetryFaroProof,
  runObservabilityOperationsExecutionProof,
  runObservabilityTelemetryProof,
  runProviderAdaptersProof,
  runRateLimitsAbuseControlsProof,
  runResourceLifecycleProof,
  runSearchIndexingProof,
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
  }, 15_000);
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
      gatewayLiveReadinessClaim: false,
      enterpriseApiGatewayDepthProven: true,
      apiGatewayDepthEvidence: {
        issueId: "USF-155",
        routeMetadataChecked: true,
        browserSessionBoundaryExplicit: true,
        graphqlFederationReclassified: true,
        generatedClientReclassified: true,
        gatewayEdgeReclassified: true,
        auditEvidenceCaptured: true,
      },
      publicApiCompatibilityGovernanceProven: true,
      publicApiCompatibilityGovernanceEvidence: {
        issueId: "USF-213",
        publicApiCompatibilityScopeDefined: true,
        compatibilitySnapshotChecked: true,
        releaseGovernanceBoundaryChecked: true,
        semverPolicyBoundaryChecked: true,
        consumerContractDeferredWithOwner: true,
        externalDeveloperPlatformBoundaryExplicit: true,
        publicApiCompatibilityReadinessClaim: false,
        consumerContractReadinessClaim: false,
        releaseCompatibilityReadinessClaim: false,
        externalDeveloperPlatformReadinessClaim: false,
        usf133ClosureClaim: false,
      },
      graphqlGeneratedClientDispositionProven: true,
      graphqlGeneratedClientDispositionEvidence: {
        issueId: "USF-214",
        graphqlPostureClassified: "out-of-scope-with-rationale",
        federationPostureClassified: "out-of-scope-with-rationale",
        generatedSdkPostureClassified: "deferred-with-owner",
        generatedClientPostureClassified: "deferred-with-owner",
        externalDeveloperSurfacePostureClassified: "deferred-with-owner",
        clientDistributionPostureClassified: "deferred-with-owner",
        tenantBoundaryRecorded: true,
        accessBoundaryRecorded: true,
        auditBoundaryRecorded: true,
        secretBoundaryRecorded: true,
        privacyBoundaryRecorded: true,
        syntheticDataBoundaryRecorded: true,
        nonEquivalenceBoundaryRecorded: true,
        graphqlFederationReadinessClaim: false,
        generatedClientReadinessClaim: false,
        generatedSdkReadinessClaim: false,
        externalDeveloperPlatformReadinessClaim: false,
        usf133ClosureClaim: false,
      },
      productionLiveClaim: false,
    });
  });

  it("proves bounded generated-client, GraphQL, federation, docs, and API-key execution without readiness claims", async () => {
    await expect(runGraphqlGeneratedClientExecutionProof()).resolves.toMatchObject({
      status: "pass",
      sourceIssue: "USF-224",
      providerMode: "hermetic-mock",
      generatedSdkCreated: true,
      generatedClientCompilePassed: true,
      generatedClientRuntimePassed: true,
      packageDistributionProofPassed: true,
      externalDeveloperSurfaceProofPassed: true,
      publicDocumentationOperationProofPassed: true,
      apiKeyOnboardingSupportWorkflowProofPassed: true,
      graphqlRuntimeProofPassed: true,
      federationRuntimeProofPassed: true,
      federationGatewayProofPassed: true,
      resolverAuthorizationProofPassed: true,
      schemaStitchingProofPassed: true,
      subscriptionsProofPassed: true,
      persistedQueryProofPassed: true,
      graphqlClientCompatibilityProofPassed: true,
      tenantBoundaryChecked: true,
      accessBoundaryChecked: true,
      auditEvidenceCaptured: true,
      secretBoundaryChecked: true,
      privacyBoundaryChecked: true,
      syntheticDataBoundaryChecked: true,
      redactionChecked: true,
      generatedSdkReadinessClaim: false,
      generatedClientReadinessClaim: false,
      externalDeveloperPlatformReadinessClaim: false,
      publicApiReadinessClaim: false,
      graphqlRuntimeReadinessClaim: false,
      federationReadinessClaim: false,
      usf133ClosureClaim: false,
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
      failoverReadinessClaim: false,
      disasterRecoveryReadinessClaim: false,
      usf133ClosureClaim: false,
      providerRiskResilienceDepthReconciled: true,
    });
  });
});

describe("observability/telemetry proof", () => {
  it("proves redacted tenant-safe telemetry without live monitoring claims", async () => {
    await expect(runObservabilityTelemetryProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      sourceIssue: "USF-159",
      operationsDepthEvidence: {
        localOperationsDepthProven: true,
        liveBackendBoundaryReclassified: true,
        providerCredentialsSecretReferenceChecked: true,
        tenantSafeLabelsChecked: true,
        redactionChecked: true,
        retentionBoundaryExplicit: true,
        accessBoundaryChecked: true,
        auditEvidenceBoundaryChecked: true,
        alertDeliveryReclassified: true,
        dashboardRuntimeReclassified: true,
        incidentWorkflowReclassified: true,
        sliSloMeasurementReclassified: true,
        crossTenantAggregateBoundaryChecked: true,
        liveOperationsReadinessClaim: false,
      },
      liveMonitoringReadinessClaim: false,
      liveMetricsBackendClaim: false,
      liveLogBackendClaim: false,
      liveTracingBackendClaim: false,
      liveAlertingClaim: false,
      siemReadinessClaim: false,
      productionLiveClaim: false,
    });
  });

  it("proves minimal Faro browser telemetry capture without UI readiness claims", async () => {
    await expect(runBrowserTelemetryFaroProof()).resolves.toMatchObject({
      status: "pass",
      issueId: "USF-225",
      runtimeMode: "minimal-static-browser-proof",
      providerMode: "local-test",
      browserAutomation: {
        packageName: "playwright-core",
        version: "1.61.1",
      },
      browserTelemetrySdk: {
        packageName: "@grafana/faro-web-sdk",
        version: "2.8.2",
        officialOrDeFactoStatus: "official-grafana-faro-web-sdk",
      },
      minimalHarnessCreated: true,
      faroInitialized: true,
      browserAutomationProofPassed: true,
      syntheticBrowserErrorCaptured: true,
      syntheticBrowserEventCaptured: true,
      syntheticBrowserTraceCaptured: true,
      syntheticBrowserSessionCaptured: true,
      backendRootCauseCorrelationChecked: true,
      redactionChecked: true,
      noProductUiClaim: true,
      uiReadinessClaim: false,
      sourceReadinessClaim: false,
      browserE2EReadinessClaim: false,
      faroProductionReadinessClaim: false,
      liveMonitoringReadinessClaim: false,
      usf133ClosureClaim: false,
      evidence: {
        rawMarkerLeakCount: 0,
        sessionObserved: true,
      },
    });
  });
});

describe("observability operations execution proof", () => {
  it("proves bounded local alert dashboard incident retention and aggregate workflows without readiness claims", async () => {
    await expect(runObservabilityOperationsExecutionProof()).resolves.toMatchObject({
      status: "pass",
      issueId: "USF-222",
      predecessorIssueId: "USF-218",
      providerMode: "hermetic-mock",
      evidence: {
        alertRuleEvaluated: true,
        alertRoutedToSyntheticReceiver: true,
        dashboardRuntimeRendered: true,
        incidentCreated: true,
        incidentAcknowledged: true,
        incidentCorrectiveActionRecorded: true,
        incidentResolved: true,
        sliCalculated: true,
        sloEvaluated: true,
        retentionPurgeExecuted: true,
        crossTenantAggregateChecked: true,
        crossTenantAggregateTenantNamesSuppressed: true,
        tenantIsolationChecked: true,
        auditEvidenceCaptured: true,
        redactionChecked: true,
        liveProviderReadinessClaim: false,
        alertingReadinessClaim: false,
        dashboardReadinessClaim: false,
        incidentResponseReadinessClaim: false,
        serviceReadinessClaim: false,
        usf133ClosureClaim: false,
      },
    });
  });
});

describe("rate-limits/abuse-controls proof", () => {
  it("proves tenant-safe fail-closed guardrails without live enforcement claims", async () => {
    await expect(runRateLimitsAbuseControlsProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      enforcementPosture: "bounded-local-distributed-proof",
      localEnforcementPosture: "single-node-in-memory-local-dev-test",
      sourceIssue: "USF-161",
      distributedDepthEvidence: {
        boundedDistributedGuardrailsProven: true,
        durableDistributedCounterChecked: true,
        multiNodeConsistencyChecked: true,
        routeByRouteRolloutChecked: true,
        gatewayEdgePostureChecked: true,
        wafCdnBotFraudProviderBoundaryChecked: true,
        operatorGuardrailApiChecked: true,
        policyApprovalWorkflowChecked: true,
        costQuotaChecked: true,
        ipDerivedPrivacyChecked: true,
        tenantFairnessChecked: true,
        auditEvidenceChecked: true,
        retentionBoundaryExplicit: true,
        providerBoundaryChecked: true,
        crossDomainGuardrailLinkageChecked: true,
        unavailableProviderFailClosedChecked: true,
        liveDistributedEnforcementReadinessClaim: false,
        liveWafReadinessClaim: false,
        liveCdnReadinessClaim: false,
        liveBotFraudReadinessClaim: false,
        productionAbusePreventionReadinessClaim: false,
      },
      liveWafReadinessClaim: false,
      liveEdgeReadinessClaim: false,
      liveGatewayReadinessClaim: false,
      liveCdnReadinessClaim: false,
      liveBotFraudReadinessClaim: false,
      liveAbuseProviderReadinessClaim: false,
      productionAbusePreventionReadinessClaim: false,
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
      sourceIssue: "USF-163",
      deepRuntimePosture: "bounded-local-deep-runtime-proof",
      deepRuntimeEvidence: {
        boundedDeepRuntimeProven: true,
        transactionalResumableImportChecked: true,
        liveExternalTransferProviderBoundaryChecked: true,
        decompressionBombRejected: true,
        rollbackCompensationWorkflowChecked: true,
        approvalSeparationOfDutiesChecked: true,
        exportPurgeRetentionSchedulerChecked: true,
        legalHoldWorkflowRuntimeChecked: true,
        productionMigrationReadinessClaim: false,
        legalExportReadinessClaim: false,
        eDiscoveryReadinessClaim: false,
        regulatoryExportReadinessClaim: false,
        liveExternalProviderReadinessClaim: false,
      },
      productionImportExportReadinessClaim: false,
      regulatoryExportReadinessClaim: false,
      legalExportReadinessClaim: false,
      eDiscoveryReadinessClaim: false,
      liveExternalProviderReadinessClaim: false,
      productionLiveClaim: false,
    });
  });
});

describe("search/indexing proof", () => {
  it("proves tenant-safe redacted search without live search or AI readiness claims", async () => {
    await expect(runSearchIndexingProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      searchProviderPosture: "in-memory-local-dev-test",
      liveSearchProviderReadinessClaim: false,
      liveVectorDatabaseReadinessClaim: false,
      aiRagReadinessClaim: false,
      publicSearchApiReadinessClaim: false,
      productionLiveClaim: false,
    });
  });
});

describe("resource lifecycle proof", () => {
  it("proves tenant-safe resource lifecycle and relationships without legal or production claims", async () => {
    await expect(runResourceLifecycleProof()).resolves.toMatchObject({
      status: "pass",
      providerMode: "hermetic-mock",
      resourceProviderPosture: "in-memory-local-dev-test",
      productionRecordManagementReadinessClaim: false,
      legalRecordManagementReadinessClaim: false,
      regulatoryRecordReadinessClaim: false,
      eDiscoveryReadinessClaim: false,
      productionLiveClaim: false,
    });
  });
});

describe("backup/restore operations proof surface", () => {
  it("exports the bounded USF-223 execution proof command surface", () => {
    expect(runBackupRestoreOperationsExecutionProof).toBeTypeOf("function");
  });
});
