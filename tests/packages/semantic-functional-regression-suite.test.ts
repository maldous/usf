import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface ManifestSemanticRow {
  readonly contractId: string;
  readonly path: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly facetKeys: readonly string[];
  readonly ownerIssueIds: readonly string[];
  readonly evidenceId: string;
}

interface ManifestServiceRow {
  readonly serviceId: string;
  readonly composeServiceId: string;
  readonly fixtureSeedId: string;
  readonly requiredInTest: boolean;
  readonly ownerIssueIds: readonly string[];
  readonly assetInventoryClass: string;
  readonly dataClassification: string;
}

interface ObligationManifest {
  readonly semanticContractObligations: readonly ManifestSemanticRow[];
  readonly serviceObligations: readonly ManifestServiceRow[];
  readonly nonClaims: readonly string[];
}

interface BehaviourCase {
  readonly caseType: string;
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly testReadinessClaimAllowed: boolean;
}

interface SemanticRegressionRow {
  readonly contractId: string;
  readonly semanticContractPath: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly facetKeysCovered: readonly string[];
  readonly sourceObligationEvidenceId: string;
  readonly testFile: string;
  readonly testName: string;
  readonly behaviourCases: readonly BehaviourCase[];
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly testReadinessClaimAllowed: boolean;
}

interface ServiceRegressionRow {
  readonly serviceId: string;
  readonly composeServiceId: string;
  readonly fixtureSeedId: string;
  readonly fixtureCorpusSeedId: string;
  readonly integrationMatrixDisposition: string;
  readonly serviceCatalogueDisposition?: string;
  readonly testFile: string;
  readonly testName: string;
  readonly ownerIssueIds: readonly string[];
  readonly assetInventoryClass: string;
  readonly dataClassification: string;
  readonly behaviourCases: readonly BehaviourCase[];
  readonly serviceBackedClaimRequiresComposedService: boolean;
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly testReadinessClaimAllowed: boolean;
}

interface RegressionSuite {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly sourceAuthorities: {
    readonly obligationManifest: string;
    readonly composedIntegrationMatrix: string;
    readonly fixtureCorpus: string;
  };
  readonly scope: {
    readonly semanticContractCount: number;
    readonly serviceRegressionCount: number;
    readonly behaviourCaseTypesRequired: readonly string[];
    readonly serviceBackedClaimsRequireComposedEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly finalTestReadinessClaim: boolean;
  };
  readonly semanticRegressionRows: readonly SemanticRegressionRow[];
  readonly serviceRegressionRows: readonly ServiceRegressionRow[];
  readonly nonClaims: readonly string[];
}

interface IntegrationMatrix {
  readonly serviceIntegrationRows: readonly {
    readonly serviceId: string;
    readonly integrationDisposition: string;
  }[];
  readonly serviceCatalogueDispositionRows: readonly {
    readonly serviceCatalogueId: string;
    readonly testDisposition: string;
  }[];
}

interface FixtureCorpus {
  readonly serviceFixtures: readonly {
    readonly serviceId: string;
    readonly fixtureSeedId: string;
  }[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T extends Record<string, unknown>>(rows: readonly T[], key: keyof T): Map<string, T> {
  return new Map(rows.map((row) => [String(row[key]), row]));
}

const suite = readJson<RegressionSuite>(
  "docs/architecture/functional-service-regression-suite.json",
);
const manifest = readJson<ObligationManifest>(suite.sourceAuthorities.obligationManifest);
const integration = readJson<IntegrationMatrix>(suite.sourceAuthorities.composedIntegrationMatrix);
const fixtures = readJson<FixtureCorpus>(suite.sourceAuthorities.fixtureCorpus);

const requiredCases = suite.scope.behaviourCaseTypesRequired;
const semanticRows = manifest.semanticContractObligations.filter((row) =>
  row.ownerIssueIds.includes("USF-244"),
);
const serviceRows = manifest.serviceObligations.filter((row) =>
  row.ownerIssueIds.includes("USF-244"),
);

describe("functional service regression suite", () => {
  it("maps every USF-244 semantic obligation to functional regression evidence", () => {
    expect(suite.issueId).toBe("USF-244");
    expect(suite.parentIssueId).toBe("USF-234");
    expect(suite.semanticRegressionRows).toHaveLength(suite.scope.semanticContractCount);
    expect(suite.serviceRegressionRows).toHaveLength(suite.scope.serviceRegressionCount);
    expect(suite.semanticRegressionRows).toHaveLength(semanticRows.length);
    expect(suite.serviceRegressionRows).toHaveLength(serviceRows.length);
    expect(suite.scope.serviceBackedClaimsRequireComposedEvidence).toBe(true);
    expect(suite.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(suite.scope.finalTestReadinessClaim).toBe(false);
  });

  it.each(semanticRows.map((row) => [row.contractId, row] as const))(
    "functional regression obligation remains current: %s",
    (contractId, manifestRow) => {
      const row = suite.semanticRegressionRows.find((item) => item.contractId === contractId);
      expect(row).toBeDefined();
      expect(row?.semanticContractPath).toBe(manifestRow.path);
      expect(row?.capability).toBe(manifestRow.capability);
      expect(row?.capabilityDomain).toBe(manifestRow.capabilityDomain);
      expect(row?.facetKeysCovered).toEqual(manifestRow.facetKeys);
      expect(row?.sourceObligationEvidenceId).toBe(manifestRow.evidenceId);
      expect(row?.testFile).toBe("tests/packages/semantic-functional-regression-suite.test.ts");
      expect(row?.testName).toBe(`functional regression obligation remains current: ${contractId}`);
      expect(row?.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
      expect(row?.testReadinessClaimAllowed).toBe(false);

      const contract = readJson<{
        readonly id: string;
        readonly capability: string;
        readonly capabilityDomain: string;
        readonly facets: Record<string, { readonly status: string; readonly description?: string }>;
      }>(manifestRow.path);
      expect(contract.id).toBe(contractId);
      expect(contract.capability).toBe(manifestRow.capability);
      expect(contract.capabilityDomain).toBe(manifestRow.capabilityDomain);
      expect(Object.keys(contract.facets).sort()).toEqual([...manifestRow.facetKeys].sort());
      for (const facet of manifestRow.facetKeys) {
        expect(["complete", "gap", "not-applicable"]).toContain(contract.facets[facet]?.status);
        if (contract.facets[facet]?.description !== undefined) {
          expect(contract.facets[facet]?.description?.length ?? 0).toBeGreaterThan(20);
        }
      }
      expect(new Set(row?.behaviourCases.map((item) => item.caseType))).toEqual(
        new Set(requiredCases),
      );
      expect(
        row?.behaviourCases.every((item) => item.inMemoryServiceSubstituteAllowed === false),
      ).toBe(true);
      expect(row?.behaviourCases.every((item) => item.testReadinessClaimAllowed === false)).toBe(
        true,
      );
    },
  );

  it.each(serviceRows.map((row) => [row.serviceId, row] as const))(
    "service functional regression boundary remains current: %s",
    (serviceId, manifestRow) => {
      const row = suite.serviceRegressionRows.find((item) => item.serviceId === serviceId);
      const integrationRow = byId(integration.serviceIntegrationRows, "serviceId").get(serviceId);
      const dispositionRow = byId(
        integration.serviceCatalogueDispositionRows,
        "serviceCatalogueId",
      ).get(serviceId);
      const fixtureRow = byId(fixtures.serviceFixtures, "serviceId").get(serviceId);
      expect(row).toBeDefined();
      expect(integrationRow ?? dispositionRow).toBeDefined();
      expect(fixtureRow).toBeDefined();
      expect(row?.composeServiceId).toBe(manifestRow.composeServiceId);
      expect(row?.fixtureSeedId).toBe(manifestRow.fixtureSeedId);
      expect(row?.fixtureCorpusSeedId).toBe(fixtureRow?.fixtureSeedId);
      if (integrationRow !== undefined) {
        expect(row?.integrationMatrixDisposition).toBe(integrationRow.integrationDisposition);
      } else {
        expect(row?.serviceCatalogueDisposition).toBe(dispositionRow?.testDisposition);
      }
      expect(row?.assetInventoryClass).toBe(manifestRow.assetInventoryClass);
      expect(row?.dataClassification).toBe(manifestRow.dataClassification);
      expect(row?.serviceBackedClaimRequiresComposedService).toBe(manifestRow.requiredInTest);
      expect(row?.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(row?.testReadinessClaimAllowed).toBe(false);
      expect(row?.testFile).toBe("tests/packages/semantic-functional-regression-suite.test.ts");
      expect(row?.testName).toBe(
        `service functional regression boundary remains current: ${serviceId}`,
      );
      expect(new Set(row?.behaviourCases.map((item) => item.caseType))).toEqual(
        new Set(requiredCases),
      );
      expect(
        row?.behaviourCases.every((item) => item.inMemoryServiceSubstituteAllowed === false),
      ).toBe(true);
      expect(row?.behaviourCases.every((item) => item.testReadinessClaimAllowed === false)).toBe(
        true,
      );
    },
  );

  it("preserves service-backed and final acceptance non-claims", () => {
    expect(suite.nonClaims).toContain("final-test-readiness");
    expect(suite.nonClaims).toContain("test-readiness");
    expect(suite.nonClaims).toContain("staging-readiness");
    expect(suite.nonClaims).toContain("production-readiness");
    expect(suite.nonClaims).toContain("live-provider-readiness");
    expect(suite.nonClaims).toContain("iso27001-certification");
    expect(manifest.nonClaims).toEqual(
      expect.arrayContaining(suite.nonClaims.filter((claim) => claim !== "final-test-readiness")),
    );
  });
});
