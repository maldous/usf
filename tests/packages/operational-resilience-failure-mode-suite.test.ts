import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface ManifestSemanticRow {
  readonly contractId: string;
  readonly path: string;
  readonly ownerIssueIds: readonly string[];
  readonly evidenceId: string;
}

interface ManifestServiceRow {
  readonly serviceId: string;
  readonly composeServiceId: string;
  readonly fixtureSeedId: string;
  readonly ownerIssueIds: readonly string[];
  readonly inMemoryServiceSubstituteAllowed: boolean | null;
}

interface ObligationManifest {
  readonly semanticContractObligations: readonly ManifestSemanticRow[];
  readonly serviceObligations: readonly ManifestServiceRow[];
}

interface FixtureCorpus {
  readonly serviceFixtures: readonly {
    readonly serviceId: string;
    readonly fixtureSeedId: string;
    readonly lifecycleCoverage: {
      readonly seed: boolean;
      readonly reset: boolean;
      readonly cleanup: boolean;
      readonly teardown: boolean;
      readonly failureRecovery: boolean;
      readonly deterministicSeed: string;
    };
  }[];
}

interface IntegrationMatrix {
  readonly serviceIntegrationRows: readonly {
    readonly serviceId: string;
    readonly integrationDisposition: string;
  }[];
  readonly profileIntegrationRows: readonly {
    readonly profile: string;
    readonly serviceIds: readonly string[];
    readonly proofCommand: string;
    readonly mustStart: boolean;
    readonly mustReadinessCheck: boolean;
    readonly mustSeed: boolean;
    readonly mustExercise: boolean;
    readonly mustTeardown: boolean;
    readonly mustReset: boolean;
    readonly mustEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
  }[];
}

interface OperationalSuite {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly sourceAuthorities: {
    readonly obligationManifest: string;
    readonly composedIntegrationMatrix: string;
    readonly fixtureCorpus: string;
    readonly enterpriseEvidenceModel: string;
  };
  readonly ownedTestFile: string;
  readonly scope: {
    readonly semanticOperationalObligationCount: number;
    readonly serviceOperationalObligationCount: number;
    readonly profileOperationalFailureCount: number;
    readonly serviceBackedClaimsRequireComposedEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly destructiveOperationsAllowed: boolean;
    readonly usesDeterministicSyntheticFailureCasesOnly: boolean;
    readonly finalTestReadinessClaim: boolean;
  };
  readonly requiredFailureModes: readonly string[];
  readonly semanticOperationalRows: readonly {
    readonly contractId: string;
    readonly semanticContractPath: string;
    readonly sourceObligationEvidenceId: string;
    readonly requiredObligationClass: string;
    readonly testFile: string;
    readonly serviceBackedClaimsRequireComposedEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly testReadinessClaimAllowed: boolean;
  }[];
  readonly serviceOperationalRows: readonly {
    readonly serviceId: string;
    readonly composeServiceId: string;
    readonly fixtureSeedId: string;
    readonly fixtureLifecycleSeedId: string;
    readonly integrationDisposition: string;
    readonly failureModes: readonly string[];
    readonly failClosedRequired: boolean;
    readonly auditEvidenceRequired: boolean;
    readonly observabilityEvidenceRequired: boolean;
    readonly resetCleanupRequired: boolean;
    readonly serviceBackedClaimRequiresComposedEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly destructiveOperationAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
  }[];
  readonly profileOperationalRows: readonly {
    readonly profile: string;
    readonly serviceIds: readonly string[];
    readonly proofCommand: string;
    readonly failureModes: readonly string[];
    readonly mustStart: boolean;
    readonly mustReadinessCheck: boolean;
    readonly mustSeed: boolean;
    readonly mustExercise: boolean;
    readonly mustTeardown: boolean;
    readonly mustReset: boolean;
    readonly mustEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly destructiveOperationAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
  }[];
  readonly operationalEvidenceRequirements: Record<string, boolean>;
  readonly failureSimulationPolicy: Record<string, boolean>;
  readonly enterpriseEvidenceRefs: Record<string, readonly string[]>;
  readonly validationCommands: readonly string[];
  readonly nonClaims: readonly string[];
  readonly allowedClaims: readonly string[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T extends Record<string, unknown>>(rows: readonly T[], key: keyof T): Map<string, T> {
  return new Map(rows.map((row) => [String(row[key]), row]));
}

const suite = readJson<OperationalSuite>(
  "docs/architecture/operational-resilience-failure-mode-suite.json",
);
const manifest = readJson<ObligationManifest>(suite.sourceAuthorities.obligationManifest);
const fixtures = readJson<FixtureCorpus>(suite.sourceAuthorities.fixtureCorpus);
const integration = readJson<IntegrationMatrix>(suite.sourceAuthorities.composedIntegrationMatrix);

const requiredNonClaims = [
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
  "full-react-product-parity",
];

describe("operational resilience failure-mode suite", () => {
  it("maps USF-245 to semantic, service, and profile obligations", () => {
    expect(suite.issueId).toBe("USF-245");
    expect(suite.parentIssueId).toBe("USF-234");
    expect(suite.ownedTestFile).toBe(
      "tests/packages/operational-resilience-failure-mode-suite.test.ts",
    );

    const semanticRows = manifest.semanticContractObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-245"),
    );
    const serviceRows = manifest.serviceObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-245"),
    );

    expect(suite.semanticOperationalRows).toHaveLength(semanticRows.length);
    expect(suite.serviceOperationalRows).toHaveLength(serviceRows.length);
    expect(suite.profileOperationalRows).toHaveLength(integration.profileIntegrationRows.length);
    expect(suite.scope.semanticOperationalObligationCount).toBe(semanticRows.length);
    expect(suite.scope.serviceOperationalObligationCount).toBe(serviceRows.length);
    expect(suite.scope.profileOperationalFailureCount).toBe(
      integration.profileIntegrationRows.length,
    );
  });

  it.each(
    manifest.semanticContractObligations.filter((row) => row.ownerIssueIds.includes("USF-245")),
  )("keeps semantic operational mapping current: %s", (manifestRow) => {
    const row = suite.semanticOperationalRows.find(
      (item) => item.contractId === manifestRow.contractId,
    );
    expect(row).toBeDefined();
    expect(row?.semanticContractPath).toBe(manifestRow.path);
    expect(row?.sourceObligationEvidenceId).toBe(manifestRow.evidenceId);
    expect(row?.requiredObligationClass).toBe("operational-resilience");
    expect(row?.testFile).toBe("tests/packages/operational-resilience-failure-mode-suite.test.ts");
    expect(row?.serviceBackedClaimsRequireComposedEvidence).toBe(true);
    expect(row?.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(row?.testReadinessClaimAllowed).toBe(false);
  });

  it("requires fail-closed, audit, observability, and cleanup evidence for every service", () => {
    const fixtureRows = byId(fixtures.serviceFixtures, "serviceId");
    const integrationRows = byId(integration.serviceIntegrationRows, "serviceId");
    for (const manifestRow of manifest.serviceObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-245"),
    )) {
      const row = suite.serviceOperationalRows.find(
        (item) => item.serviceId === manifestRow.serviceId,
      );
      const fixture = fixtureRows.get(manifestRow.serviceId);
      const integrationRow = integrationRows.get(manifestRow.serviceId);

      expect(row).toBeDefined();
      expect(row?.composeServiceId).toBe(manifestRow.composeServiceId);
      expect(row?.fixtureSeedId).toBe(manifestRow.fixtureSeedId);
      expect(row?.fixtureLifecycleSeedId).toBe(fixture?.fixtureSeedId);
      expect(row?.integrationDisposition).toBe(
        integrationRow?.integrationDisposition ?? "catalogue-disposition-only",
      );
      expect(row?.failureModes).toEqual(
        expect.arrayContaining([
          "service-outage",
          "partial-dependency-failure",
          "degraded-readiness",
          "cleanup-after-failure",
          "incident-evidence",
          "privacy-redaction",
        ]),
      );
      expect(row?.failClosedRequired).toBe(true);
      expect(row?.auditEvidenceRequired).toBe(true);
      expect(row?.observabilityEvidenceRequired).toBe(true);
      expect(row?.resetCleanupRequired).toBe(true);
      expect(row?.serviceBackedClaimRequiresComposedEvidence).toBe(true);
      expect(row?.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(row?.destructiveOperationAllowed).toBe(false);
      expect(row?.testReadinessClaimAllowed).toBe(false);
      if (row?.fixtureSeedId === "not-applicable") {
        expect(fixture?.lifecycleCoverage.deterministicSeed).toBe("not-applicable");
        expect(row?.integrationDisposition).toBe("catalogue-disposition-only");
        expect(manifestRow.inMemoryServiceSubstituteAllowed).toBeNull();
      } else {
        expect(fixture?.lifecycleCoverage.seed).toBe(true);
        expect(fixture?.lifecycleCoverage.reset).toBe(true);
        expect(fixture?.lifecycleCoverage.cleanup).toBe(true);
        expect(fixture?.lifecycleCoverage.teardown).toBe(true);
        expect(fixture?.lifecycleCoverage.failureRecovery).toBe(true);
        expect(manifestRow.inMemoryServiceSubstituteAllowed).toBe(false);
      }
    }
  });

  it("maps every integration profile to operational failure evidence", () => {
    for (const integrationRow of integration.profileIntegrationRows) {
      const row = suite.profileOperationalRows.find(
        (item) => item.profile === integrationRow.profile,
      );
      expect(row).toBeDefined();
      expect(row?.serviceIds).toEqual(integrationRow.serviceIds);
      expect(row?.proofCommand).toBe(integrationRow.proofCommand);
      expect(row?.failureModes).toEqual(
        expect.arrayContaining([
          "profile-startup-degraded",
          "profile-service-unavailable",
          "profile-reset-after-failure",
          "profile-teardown-after-failure",
          "profile-evidence-redaction",
        ]),
      );
      expect(row?.mustStart).toBe(true);
      expect(row?.mustReadinessCheck).toBe(true);
      expect(row?.mustSeed).toBe(true);
      expect(row?.mustExercise).toBe(true);
      expect(row?.mustTeardown).toBe(true);
      expect(row?.mustReset).toBe(true);
      expect(row?.mustEvidence).toBe(true);
      expect(row?.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(row?.destructiveOperationAllowed).toBe(false);
      expect(row?.testReadinessClaimAllowed).toBe(false);
    }
  });

  it("preserves operational evidence boundaries and non-claims", () => {
    expect(new Set(suite.requiredFailureModes)).toEqual(
      new Set([
        "service-outage",
        "partial-dependency-failure",
        "degraded-readiness",
        "retry-backoff",
        "idempotent-retry",
        "queue-drain",
        "worker-shutdown",
        "restart-recovery",
        "cleanup-after-failure",
        "backup-restore-integrity",
        "bulk-partial-failure",
        "incident-evidence",
        "privacy-redaction",
      ]),
    );
    for (const key of [
      "failClosedBehaviour",
      "auditEvidence",
      "structuredLogs",
      "metrics",
      "traces",
      "alertsDashboards",
      "incidentEvidence",
      "privacyRedaction",
      "seedResetCleanupTeardown",
      "valueFreeEvidence",
      "rawSecretsForbidden",
      "rawEndpointsForbidden",
      "providerPayloadRetentionForbidden",
    ]) {
      expect(suite.operationalEvidenceRequirements[key]).toBe(true);
    }
    expect(suite.failureSimulationPolicy.realProviderKillAllowed).toBe(false);
    expect(suite.failureSimulationPolicy.destructiveContainerOperationAllowed).toBe(false);
    expect(suite.failureSimulationPolicy.syntheticFailureDescriptorsOnly).toBe(true);
    expect(suite.failureSimulationPolicy.serviceBackedRuntimeClaimAllowed).toBe(false);
    expect(suite.nonClaims).toEqual(expect.arrayContaining(requiredNonClaims));
    expect(suite.allowedClaims).not.toEqual(expect.arrayContaining(requiredNonClaims));
  });

  it("links enterprise incident, privacy, resilience, threat, access, SoA, and evidence rows", () => {
    expect(Object.keys(suite.enterpriseEvidenceRefs).sort()).toEqual([
      "accessReviewPrivilegedOperationPosture",
      "backupRestoreResiliencePosture",
      "evidenceRegister",
      "incidentVulnerabilityManagementEvidence",
      "privacyDataMinimisationPosture",
      "soaSupportMappings",
      "threatModelAbuseCaseRegister",
    ]);
    for (const values of Object.values(suite.enterpriseEvidenceRefs)) {
      expect(values.length).toBeGreaterThan(0);
      expect(values.every((value) => value.includes("usf-245"))).toBe(true);
    }
    expect(suite.validationCommands).toEqual(
      expect.arrayContaining([
        "corepack pnpm test -- tests/packages/operational-resilience-failure-mode-suite.test.ts",
        "corepack pnpm test-readiness:validate",
        "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
      ]),
    );
  });
});
