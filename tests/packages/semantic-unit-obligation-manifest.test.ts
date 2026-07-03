import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface SemanticContractObligation {
  readonly contractId: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly facetKeys: readonly string[];
  readonly ownerIssueIds: readonly string[];
  readonly testMappingRequired: boolean;
}

interface ServiceObligation {
  readonly serviceId: string;
  readonly obligationClassIds: readonly string[];
  readonly ownerIssueIds: readonly string[];
  readonly inMemoryServiceSubstituteAllowed?: boolean;
}

interface Manifest {
  readonly allowedClaims: readonly string[];
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly nonClaims: readonly string[];
  readonly semanticContractObligations: readonly SemanticContractObligation[];
  readonly serviceObligations: readonly ServiceObligation[];
  readonly testReadinessClaimAllowed: boolean;
}

interface SuiteInventory {
  readonly sourceManifest: {
    readonly path: string;
    readonly expectedSemanticContractCount: number;
    readonly expectedServiceRowCount: number;
    readonly expectedUsf241ServiceRowCount: number;
  };
  readonly scope: {
    readonly serviceBackedCoverageClaim: boolean;
    readonly composedServiceCoverageClaim: boolean;
    readonly finalTestReadinessClaim: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  };
  readonly facetKeysRequired: readonly string[];
  readonly domainInventory: readonly {
    readonly capabilityDomain: string;
    readonly semanticContractCount: number;
  }[];
  readonly mappedTestFiles: readonly {
    readonly path: string;
    readonly testNames: readonly string[];
    readonly mappedDomains: readonly string[];
  }[];
  readonly unitObligationMappings: readonly {
    readonly contractId: string;
    readonly capabilityDomain: string;
    readonly testFile: string;
    readonly testName: string;
    readonly facetKeysCovered: readonly string[];
    readonly serviceBackedCoverageClaim: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  }[];
  readonly coverageContribution: {
    readonly unitScopeLineCoverageTarget: string;
    readonly coverageContributionStatus: string;
    readonly finalLcovGateOwnerIssueId: string;
    readonly finalLcovGateClaimAllowed: boolean;
  };
  readonly serviceBackedRowsExcludedFromUsf241Claims: {
    readonly serviceRowCount: number;
    readonly composedIntegrationRowCount: number;
    readonly boundedOrOutOfScopeServiceIds: readonly string[];
  };
  readonly nonClaimsPreserved: readonly string[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function unitSemanticObligations(manifest: Manifest): readonly SemanticContractObligation[] {
  return manifest.semanticContractObligations.filter((row) =>
    row.ownerIssueIds.includes("USF-241"),
  );
}

function countByDomain(rows: readonly SemanticContractObligation[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.capabilityDomain] = (counts[row.capabilityDomain] ?? 0) + 1;
    return counts;
  }, {});
}

describe("semantic unit suite inventory", () => {
  const inventory = readJson<SuiteInventory>("docs/architecture/semantic-unit-test-suite.json");
  const manifest = readJson<Manifest>(inventory.sourceManifest.path);

  it("maps every USF-241 semantic contract obligation from the USF-239 manifest", () => {
    const unitRows = unitSemanticObligations(manifest);
    expect(unitRows).toHaveLength(inventory.sourceManifest.expectedSemanticContractCount);
    expect(unitRows.every((row) => row.testMappingRequired)).toBe(true);
    expect(
      unitRows.every(
        (row) =>
          row.facetKeys.length === inventory.facetKeysRequired.length &&
          inventory.facetKeysRequired.every((facet) => row.facetKeys.includes(facet)),
      ),
    ).toBe(true);

    const observedByDomain = countByDomain(unitRows);
    const expectedByDomain = Object.fromEntries(
      inventory.domainInventory.map((row) => [row.capabilityDomain, row.semanticContractCount]),
    );
    expect(observedByDomain).toEqual(expectedByDomain);

    const mappedDomains = new Set(
      inventory.mappedTestFiles.flatMap((file) =>
        file.mappedDomains.includes("all") ? Object.keys(expectedByDomain) : file.mappedDomains,
      ),
    );
    for (const domain of Object.keys(expectedByDomain)) {
      expect(mappedDomains.has(domain), `missing unit mapping for ${domain}`).toBe(true);
    }
  });

  it.each(unitSemanticObligations(manifest).map((row) => [row.contractId, row] as const))(
    "unit obligation mapping remains current: %s",
    (contractId, row) => {
      const mapping = inventory.unitObligationMappings.find(
        (item) => item.contractId === contractId,
      );
      expect(mapping).toBeDefined();
      expect(mapping?.capabilityDomain).toBe(row.capabilityDomain);
      expect(mapping?.testName).toBe(`unit obligation mapping remains current: ${contractId}`);
      expect(mapping?.facetKeysCovered).toEqual(row.facetKeys);
      expect(mapping?.serviceBackedCoverageClaim).toBe(false);
      expect(mapping?.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    },
  );

  it("keeps service-backed obligations outside USF-241 unit coverage claims", () => {
    const serviceRowsOwnedBy241 = manifest.serviceObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-241"),
    );
    expect(serviceRowsOwnedBy241).toHaveLength(
      inventory.sourceManifest.expectedUsf241ServiceRowCount,
    );
    expect(manifest.serviceObligations).toHaveLength(
      inventory.sourceManifest.expectedServiceRowCount,
    );
    expect(inventory.scope.serviceBackedCoverageClaim).toBe(false);
    expect(inventory.scope.composedServiceCoverageClaim).toBe(false);
    expect(inventory.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(manifest.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(
      manifest.serviceObligations.some((row) => row.inMemoryServiceSubstituteAllowed === true),
    ).toBe(false);

    const composedRows = manifest.serviceObligations.filter((row) =>
      row.obligationClassIds.includes("composed-integration"),
    );
    expect(composedRows).toHaveLength(
      inventory.serviceBackedRowsExcludedFromUsf241Claims.composedIntegrationRowCount,
    );

    const boundedOrOutOfScope = manifest.serviceObligations
      .filter((row) => !row.obligationClassIds.includes("composed-integration"))
      .map((row) => row.serviceId)
      .sort();
    expect(boundedOrOutOfScope).toEqual(
      [...inventory.serviceBackedRowsExcludedFromUsf241Claims.boundedOrOutOfScopeServiceIds].sort(),
    );
  });

  it("preserves manifest non-claims and allowed claim boundaries", () => {
    expect(manifest.testReadinessClaimAllowed).toBe(false);
    expect(inventory.scope.finalTestReadinessClaim).toBe(false);
    expect(inventory.coverageContribution.unitScopeLineCoverageTarget).toBe("100-percent");
    expect(inventory.coverageContribution.finalLcovGateOwnerIssueId).toBe("USF-240");
    expect(inventory.coverageContribution.finalLcovGateClaimAllowed).toBe(false);
    expect(manifest.allowedClaims).toEqual([
      "test-obligation-manifest-defined",
      "validator-gate-defined",
    ]);
    for (const nonClaim of inventory.nonClaimsPreserved) {
      expect(manifest.nonClaims).toContain(nonClaim);
    }
  });
});
