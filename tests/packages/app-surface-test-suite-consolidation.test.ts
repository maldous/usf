import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

type CoverageEntry = {
  coverageId: string;
  testPath?: string;
  testPaths?: string[];
  supportingTestPaths?: string[];
  failClosedCoverage?: boolean;
  externalServicesRequired?: boolean;
  externalProvidersRequired?: boolean;
  credentialsRequired?: boolean;
  composeRequired?: boolean;
  stagingRequired?: boolean;
  deploymentRequired?: boolean;
  providerMode?: string;
};

type ConsolidationReport = {
  ownerIssueId: string;
  lifecycleState: string;
  authorityInputs: Array<{ path: string }>;
  packageManagedEntryPoint: {
    scriptName: string;
    command: string;
    newDependencyRequired: boolean;
    lockfileChangeRequired: boolean;
  };
  unitCoverage?: CoverageEntry[];
  contractCoverage?: CoverageEntry[];
  integrationCoverage?: CoverageEntry[];
  crossSurfaceCoverage?: CoverageEntry[];
  validationGuard: Record<string, boolean>;
  externalBoundary: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

type ValidatorPayload = {
  mode: "all" | "selftest";
  status: "pass" | "fail";
  summary: {
    ruleCount: number;
    conformingFixtureCount: number;
    plantedDefectFixtureCount: number;
    realImplementationArtifactCount: number;
    findingCount: number;
  };
  findings: unknown[];
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;
}

function allReferencedPaths(report: ConsolidationReport): string[] {
  const coverage = [
    ...(report.unitCoverage ?? []),
    ...(report.contractCoverage ?? []),
    ...(report.integrationCoverage ?? []),
    ...(report.crossSurfaceCoverage ?? []),
  ];
  return [
    ...report.authorityInputs.map((input) => input.path),
    ...coverage.flatMap((entry) => [
      ...(entry.testPath ? [entry.testPath] : []),
      ...(entry.testPaths ?? []),
      ...(entry.supportingTestPaths ?? []),
    ]),
  ];
}

function coverageIds(entries: CoverageEntry[] | undefined): Set<string> {
  return new Set((entries ?? []).map((entry) => entry.coverageId));
}

function missingCoverage(entries: CoverageEntry[] | undefined, requiredIds: string[]): string[] {
  const observed = coverageIds(entries);
  return requiredIds.filter((id) => !observed.has(id));
}

function runAppSurfaceValidator(mode: "all" | "selftest"): ValidatorPayload {
  const output = execFileSync(
    "python3",
    ["tools/validate-app-surface/validate-app-surface.py", mode, "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return JSON.parse(output) as ValidatorPayload;
}

const unitReport = readJson<ConsolidationReport>(
  "docs/architecture/app-surface-unit-test-suite-consolidation.json",
);
const contractReport = readJson<ConsolidationReport>(
  "docs/architecture/app-surface-contract-integration-test-suite-consolidation.json",
);
const packageJson = readJson<{ scripts: Record<string, string> }>("package.json");

describe("app-surface test suite consolidation", () => {
  it("uses the package-managed test entry point and references only existing repository paths", () => {
    for (const report of [unitReport, contractReport]) {
      expect(report.packageManagedEntryPoint).toMatchObject({
        scriptName: "test",
        newDependencyRequired: false,
        lockfileChangeRequired: false,
      });
      expect(packageJson.scripts.test).toBe("vitest run");
      expect(report.packageManagedEntryPoint.command).toContain("corepack pnpm test");

      for (const path of allReferencedPaths(report)) {
        expect(existsSync(join(repoRoot, path)), path).toBe(true);
      }
      expect(Object.values(report.validationGuard).every((value) => value === true)).toBe(true);
      expect(Object.values(report.externalBoundary).every((value) => value === false)).toBe(true);
      expect(Object.values(report.nonClaims).every((value) => value === false)).toBe(true);
    }
  });

  it("consolidates USF-1031 unit coverage without duplicating per-slice tests", () => {
    expect(unitReport.ownerIssueId).toBe("USF-1031");
    expect(unitReport.lifecycleState).toBe("test-unit-consolidated");

    const requiredUnitCoverage = [
      "unit-test-entry-point",
      "route-mapping",
      "command-form",
      "query-list-detail",
      "state-cache-query-client",
      "i18n",
      "accessibility",
      "auth-session",
      "notification-consent",
      "local-negative-surfaces",
    ];
    expect(missingCoverage(unitReport.unitCoverage, requiredUnitCoverage)).toEqual([]);
    expect(unitReport.unitCoverage?.every((entry) => entry.failClosedCoverage === true)).toBe(true);
    expect(unitReport.unitCoverage?.every((entry) => entry.externalServicesRequired === false)).toBe(true);

    const missingRouteCoverage = {
      ...unitReport,
      unitCoverage: unitReport.unitCoverage?.filter((entry) => entry.coverageId !== "route-mapping"),
    };
    expect(missingCoverage(missingRouteCoverage.unitCoverage, requiredUnitCoverage)).toContain("route-mapping");
  });

  it("consolidates USF-1032 contract and local integration coverage without Compose or staging", () => {
    expect(contractReport.ownerIssueId).toBe("USF-1032");
    expect(contractReport.lifecycleState).toBe("test-contract-local-integration-consolidated");

    const requiredContractCoverage = [
      "contract-test-entry-point",
      "generated-client-consumption",
      "validator-output-shape",
      "route-capability-mapping",
      "command-form-semantic-contract",
      "query-list-detail-semantic-contract",
    ];
    expect(missingCoverage(contractReport.contractCoverage, requiredContractCoverage)).toEqual([]);
    expect(contractReport.contractCoverage?.every((entry) => entry.failClosedCoverage === true)).toBe(true);
    expect(contractReport.contractCoverage?.every((entry) => entry.externalServicesRequired === false)).toBe(true);

    for (const integration of contractReport.integrationCoverage ?? []) {
      expect(integration.providerMode).toBe("in-memory-only");
      expect(integration.externalProvidersRequired).toBe(false);
      expect(integration.credentialsRequired).toBe(false);
      expect(integration.composeRequired).toBe(false);
      expect(integration.stagingRequired).toBe(false);
      expect(integration.deploymentRequired).toBe(false);
    }

    const missingGeneratedClientCoverage = {
      ...contractReport,
      contractCoverage: contractReport.contractCoverage?.filter(
        (entry) => entry.coverageId !== "generated-client-consumption",
      ),
    };
    expect(missingCoverage(missingGeneratedClientCoverage.contractCoverage, requiredContractCoverage)).toContain(
      "generated-client-consumption",
    );
  });

  it("keeps app-surface validator output shape covered in all and selftest modes", () => {
    const allPayload = runAppSurfaceValidator("all");
    const selftestPayload = runAppSurfaceValidator("selftest");

    for (const payload of [allPayload, selftestPayload]) {
      expect(payload.status).toBe("pass");
      expect(payload.findings).toEqual([]);
      expect(payload.summary.ruleCount).toBeGreaterThan(0);
      expect(payload.summary.conformingFixtureCount).toBeGreaterThan(0);
      expect(payload.summary.plantedDefectFixtureCount).toBeGreaterThan(0);
      expect(payload.summary.realImplementationArtifactCount).toBeGreaterThanOrEqual(13);
      expect(payload.summary.findingCount).toBe(0);
    }
    expect(allPayload.mode).toBe("all");
    expect(selftestPayload.mode).toBe("selftest");
  });
});
