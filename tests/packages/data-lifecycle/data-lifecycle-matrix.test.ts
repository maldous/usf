import { describe, expect, it } from "vitest";

import {
  assertServiceBackedRowsHaveComposedEvidence,
  assertSuiteInputsSafe,
  loadComposedIntegrationMatrix,
  loadFixtureLifecycle,
  loadObligationManifest,
  loadSuiteMatrix,
  readJson,
} from "./test-support";

describe("USF-250 data lifecycle matrix regression", () => {
  it("matrix maps every USF-250 semantic service and fixture obligation without overclaim", () => {
    const matrix = loadSuiteMatrix();
    const manifest = loadObligationManifest(matrix);
    const integration = loadComposedIntegrationMatrix(matrix);
    const lifecycle = loadFixtureLifecycle(matrix);

    assertSuiteInputsSafe(matrix);
    assertServiceBackedRowsHaveComposedEvidence(matrix);

    const usf250Services = manifest.serviceObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-250"),
    );
    const usf250Contracts = manifest.semanticContractObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-250"),
    );

    expect(matrix.serviceCoverageRows).toHaveLength(usf250Services.length);
    expect(matrix.semanticContractRows).toHaveLength(usf250Contracts.length);
    expect(matrix.scope.serviceCoverageCount).toBe(matrix.serviceCoverageRows.length);
    expect(matrix.scope.semanticContractCount).toBe(matrix.semanticContractRows.length);
    expect(matrix.scope.deterministicCaseCount).toBe(matrix.deterministicCases.length);
    expect(lifecycle.fixtureCorpusEvidence.seederResetterCleanupTeardownMapped).toBe(true);
    expect(lifecycle.fixtureCorpusEvidence.repeatabilityFailureRecoveryMapped).toBe(true);

    for (const service of usf250Services) {
      const row = matrix.serviceCoverageRows.find((item) => item.serviceId === service.serviceId);
      expect(row).toBeDefined();
      expect(service.obligationClassIds).toContain("data-lifecycle");
      expect(service.obligationClassIds).toContain("backup-restore-bulk-migration");
      expect(service.inMemoryServiceSubstituteAllowed).not.toBe(true);
      expect(service.validationCommands).toContain(
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
      );
      if (row?.requiresComposedServiceEvidence) {
        expect(
          integration.serviceIntegrationRows.some((item) => item.serviceId === service.serviceId),
        ).toBe(true);
      }
    }

    for (const contract of usf250Contracts) {
      const row = matrix.semanticContractRows.find(
        (item) => item.contractId === contract.contractId,
      );
      expect(row).toBeDefined();
      expect(contract.obligationClassIds).toContain("data-lifecycle");
      expect(contract.obligationClassIds).toContain("backup-restore-bulk-migration");
      expect(contract.facetKeys.length).toBeGreaterThan(0);
      expect(readJson<{ readonly id: string }>(contract.path).id).toBe(contract.contractId);
    }
  });

  it("covers required lifecycle domains and service-backed data surfaces", () => {
    const matrix = loadSuiteMatrix();
    const coveredDomains = new Set(
      matrix.deterministicCases.flatMap((row) => [row.coverageDomain, ...row.requiredOutcomes]),
    );
    const serviceDomains = new Set(
      matrix.serviceCoverageRows.flatMap((row) => row.coverageDomains),
    );

    for (const domain of matrix.requiredCoverageDomains) {
      expect(coveredDomains.has(domain) || serviceDomains.has(domain)).toBe(true);
    }

    expect([...serviceDomains]).toEqual(
      expect.arrayContaining([
        "bulk-import-export",
        "backup-restore",
        "object-file-lifecycle",
        "database-lifecycle",
        "search-analytics",
        "secrets-config",
        "event-job-notification",
        "retention-erasure",
        "migration-boundary",
        "scanning-disposition",
      ]),
    );
  });

  it("keeps owned test references current", () => {
    const matrix = loadSuiteMatrix();
    const expectedTests = new Set([
      "tests/packages/data-lifecycle/data-lifecycle-suite.test.ts",
      "tests/packages/data-lifecycle/data-lifecycle-matrix.test.ts",
    ]);

    expect(new Set(matrix.ownedTestFiles)).toEqual(expectedTests);
    for (const testCase of matrix.deterministicCases) {
      expect(expectedTests.has(testCase.testFile)).toBe(true);
      expect(testCase.testName.length).toBeGreaterThan(20);
      expect(testCase.requiredOutcomes.length).toBeGreaterThan(0);
    }
  });

  it("preserves privacy boundary and forbidden readiness claims", () => {
    const matrix = loadSuiteMatrix();
    const manifest = loadObligationManifest(matrix);

    expect(matrix.evidenceBoundary.syntheticOnly).toBe(true);
    expect(matrix.evidenceBoundary.productionDerived).toBe(false);
    expect(matrix.evidenceBoundary.realTenantDataAllowed).toBe(false);
    expect(matrix.evidenceBoundary.realSecretsAllowed).toBe(false);
    expect(matrix.evidenceBoundary.liveProviderPayloadAllowed).toBe(false);
    expect(matrix.evidenceBoundary.providerPayloadRetentionAllowed).toBe(false);
    expect(matrix.evidenceBoundary.rawSecretLoggingAllowed).toBe(false);
    expect(matrix.allowedClaims).not.toContain("test-readiness");
    expect(matrix.nonClaims).toEqual(
      expect.arrayContaining([
        "final-test-readiness",
        "test-readiness",
        "staging-readiness",
        "production-readiness",
        "deployment-readiness",
        "live-provider-readiness",
        "soc-readiness",
        "iso27001-certification",
        "enterprise-production-readiness",
        "product-ui-readiness",
        "browser-e2e-readiness",
        "full-product-readiness",
      ]),
    );
    expect(manifest.nonClaims).toEqual(
      expect.arrayContaining(matrix.nonClaims.filter((claim) => claim !== "final-test-readiness")),
    );
  });
});
