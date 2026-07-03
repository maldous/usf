import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface SuiteEvidence {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly sourceAuthorities: Record<string, string>;
  readonly scope: {
    readonly semanticContractCount: number;
    readonly serviceSurfaceCount: number;
    readonly serviceBackedClaimsRequireComposedEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly finalTestReadinessClaim: boolean;
    readonly enterpriseEvidenceModelEdited: boolean;
  };
  readonly semanticContractIds: readonly string[];
  readonly serviceSurfaceIds: readonly string[];
  readonly deterministicTestFiles: readonly {
    readonly path: string;
    readonly testLayer: string;
    readonly serviceBackedCoverageClaim: boolean;
  }[];
  readonly nonClaims: readonly string[];
  readonly deferredCoordinatorOwnedEnterpriseEvidenceRows: readonly {
    readonly section: string;
    readonly proposedId: string;
    readonly evidencePath: string;
    readonly ownerIssueId: string;
  }[];
}

interface ManifestSemanticRow {
  readonly contractId: string;
  readonly path: string;
  readonly capabilityDomain: string;
  readonly ownerIssueIds: readonly string[];
  readonly obligationClassIds: readonly string[];
  readonly facetKeys: readonly string[];
}

interface ManifestServiceRow {
  readonly serviceId: string;
  readonly ownerIssueIds: readonly string[];
  readonly obligationClassIds: readonly string[];
  readonly dependencyDisposition: string;
  readonly requiredInTest: boolean;
  readonly generatedInTestCompose: boolean;
  readonly inMemoryServiceSubstituteAllowed: boolean | null;
  readonly fixtureSeedId: string;
}

interface ObligationManifest {
  readonly semanticContractObligations: readonly ManifestSemanticRow[];
  readonly serviceObligations: readonly ManifestServiceRow[];
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly nonClaims: readonly string[];
}

interface FixtureCorpus {
  readonly serviceFixtures: readonly {
    readonly serviceId: string;
    readonly fixtureSeedId: string;
    readonly generatedInTestCompose: boolean;
    readonly requiredInTest: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly nonClaimBoundary: string;
  }[];
  readonly semanticContractFixtures: readonly {
    readonly contractId: string;
    readonly fixtureSeedIds: readonly string[];
    readonly semanticSeedCoverage: Record<string, string>;
    readonly nonClaimBoundary: string;
  }[];
}

interface IntegrationMatrix {
  readonly serviceIntegrationRows: readonly {
    readonly serviceId: string;
    readonly integrationDisposition: string;
    readonly proofCommand: string;
    readonly inMemoryServiceSubstituteAllowed: boolean;
  }[];
  readonly nonClaims: readonly string[];
  readonly testReadinessClaimAllowed: boolean;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function authorityPath(key: string): string {
  const path = suite.sourceAuthorities[key];
  if (path === undefined) {
    throw new Error(`Missing USF-249 source authority path: ${key}`);
  }
  return path;
}

function byService<T extends { readonly serviceId: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.serviceId, row]));
}

const suite = readJson<SuiteEvidence>(
  "docs/architecture/authn-authz-tenant-role-permission-test-suite.json",
);
const manifest = readJson<ObligationManifest>(authorityPath("obligationManifest"));
const fixtures = readJson<FixtureCorpus>(authorityPath("fixtureCorpus"));
const integration = readJson<IntegrationMatrix>(authorityPath("composedIntegrationMatrix"));

const manifestAuthContracts = manifest.semanticContractObligations.filter((row) =>
  row.ownerIssueIds.includes("USF-249"),
);
const manifestAuthServices = manifest.serviceObligations.filter((row) =>
  row.obligationClassIds.includes("auth-tenant-role-permission"),
);

describe("USF-249 auth integration evidence linkage", () => {
  it("keeps the owned suite inventory aligned to the obligation manifest", () => {
    expect(suite.issueId).toBe("USF-249");
    expect(suite.parentIssueId).toBe("USF-234");
    expect(suite.scope.semanticContractCount).toBe(manifestAuthContracts.length);
    expect(suite.scope.serviceSurfaceCount).toBe(manifestAuthServices.length);
    expect([...suite.semanticContractIds].sort()).toEqual(
      manifestAuthContracts.map((row) => row.contractId).sort(),
    );
    expect([...suite.serviceSurfaceIds].sort()).toEqual(
      manifestAuthServices.map((row) => row.serviceId).sort(),
    );
  });

  it("links every auth semantic contract to existing deterministic fixture coverage", () => {
    const fixtureByContract = new Map(
      fixtures.semanticContractFixtures.map((row) => [row.contractId, row]),
    );
    for (const row of manifestAuthContracts) {
      const fixture = fixtureByContract.get(row.contractId);
      expect(fixture, row.contractId).toBeDefined();
      expect(fixture?.fixtureSeedIds.length, row.contractId).toBeGreaterThan(0);
      expect(fixture?.semanticSeedCoverage.tenant, row.contractId).toBe("covered");
      expect(fixture?.semanticSeedCoverage.actor, row.contractId).toBe("covered");
      expect(fixture?.semanticSeedCoverage.role, row.contractId).toBe("covered");
      expect(fixture?.semanticSeedCoverage.permission, row.contractId).toBe("covered");
      expect(fixture?.semanticSeedCoverage.negativeFailClosedPath, row.contractId).toBe("covered");
      expect(fixture?.nonClaimBoundary, row.contractId).toMatch(
        /does not claim final test readiness/i,
      );
      expect(row.facetKeys).toContain("permissions");
      expect(row.facetKeys).toContain("auditModel");
      expect(row.facetKeys).toContain("proof");
    }
  });

  it("requires composed evidence for service-backed auth surfaces without allowing in-memory substitutes", () => {
    const fixtureByService = byService(fixtures.serviceFixtures);
    const integrationByService = byService(integration.serviceIntegrationRows);
    for (const row of manifestAuthServices) {
      expect(row.ownerIssueIds, row.serviceId).toContain("USF-249");
      expect(row.requiredInTest, row.serviceId).toBe(true);
      expect(row.inMemoryServiceSubstituteAllowed, row.serviceId).not.toBe(true);

      const fixture = fixtureByService.get(row.serviceId);
      expect(fixture, row.serviceId).toBeDefined();
      expect(fixture?.fixtureSeedId, row.serviceId).toBe(row.fixtureSeedId);
      expect(fixture?.inMemoryServiceSubstituteAllowed, row.serviceId).toBe(false);
      expect(fixture?.testReadinessClaimAllowed, row.serviceId).toBe(false);

      if (row.generatedInTestCompose) {
        const integrationServiceId = row.serviceId === "caddy" ? "external-caddy" : row.serviceId;
        const integrationRow = integrationByService.get(integrationServiceId);
        expect(integrationRow, row.serviceId).toBeDefined();
        expect(
          ["tested", "profile-gated-tested", "composed-integration-required"].includes(
            integrationRow?.integrationDisposition ?? "",
          ),
          row.serviceId,
        ).toBe(true);
        expect(integrationRow?.proofCommand, row.serviceId).toBe(
          "corepack pnpm test-readiness:integration",
        );
        expect(integrationRow?.inMemoryServiceSubstituteAllowed, row.serviceId).toBe(false);
      }
    }
  });

  it("records owned test files and preserves enterprise evidence model lock boundaries", () => {
    for (const file of suite.deterministicTestFiles) {
      expect(existsSync(file.path), file.path).toBe(true);
      expect(file.serviceBackedCoverageClaim, file.path).toBe(false);
    }
    expect(suite.scope.enterpriseEvidenceModelEdited).toBe(false);
    expect(suite.deferredCoordinatorOwnedEnterpriseEvidenceRows.length).toBeGreaterThanOrEqual(5);
    expect(
      suite.deferredCoordinatorOwnedEnterpriseEvidenceRows.every(
        (row) =>
          row.ownerIssueId === "USF-249" &&
          row.evidencePath ===
            "docs/architecture/authn-authz-tenant-role-permission-test-suite.json",
      ),
    ).toBe(true);
  });

  it("preserves non-claims across suite, manifest, and composed integration matrix", () => {
    expect(suite.scope.testReadinessClaimAllowed).toBe(false);
    expect(suite.scope.finalTestReadinessClaim).toBe(false);
    expect(suite.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(manifest.testReadinessClaimAllowed).toBe(false);
    expect(manifest.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(integration.testReadinessClaimAllowed).toBe(false);
    for (const nonClaim of suite.nonClaims.filter((claim) => claim !== "USF-234-acceptance")) {
      expect(manifest.nonClaims, nonClaim).toContain(nonClaim);
    }
    expect(integration.nonClaims).toEqual(
      expect.arrayContaining(["test-readiness", "production-readiness", "live-provider-readiness"]),
    );
  });
});
