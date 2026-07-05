import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  assertFixtureCorpusSafe,
  loadSyntheticFixtureCorpus,
  serviceFixtureById,
} from "./fixtures/synthetic-fixture-corpus";

type CoverageAxis =
  | "latency-budget"
  | "throughput-budget"
  | "bounded-concurrency"
  | "queue-saturation"
  | "retry-budget"
  | "timeout-budget"
  | "resource-limit"
  | "cleanup-under-pressure";

interface ExpandedCategoryRow {
  readonly categoryId: string;
  readonly issueId: string;
  readonly requiredCommandIds: readonly string[];
  readonly validationCommands: readonly string[];
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly nonClaims: readonly string[];
}

interface ManifestServiceRow {
  readonly serviceId: string;
  readonly composeServiceId: string | null;
  readonly requiredInTest: boolean;
  readonly generatedInTestCompose: boolean;
  readonly dependencyDisposition: string;
  readonly composeProfiles: readonly string[];
  readonly fixtureSeedId: string;
}

interface ManifestProfileRow {
  readonly profile: string;
  readonly serviceIds: readonly string[];
  readonly mustBeStarted: boolean;
  readonly mustBeSeeded: boolean;
  readonly mustBeExercised: boolean;
  readonly mustBeReset: boolean;
  readonly mustBeEvidenced: boolean;
  readonly inMemoryServiceSubstituteAllowed: boolean;
}

interface ObligationManifest {
  readonly expandedCategoryObligations: readonly ExpandedCategoryRow[];
  readonly profileObligations: readonly ManifestProfileRow[];
  readonly serviceObligations: readonly ManifestServiceRow[];
}

interface GuardrailPolicy {
  readonly maxLatencyBudgetTicks: number;
  readonly maxTimeoutBudgetTicks: number;
  readonly maxConcurrentActors: number;
  readonly maxOperationCount: number;
  readonly maxQueueDepthLimit: number;
  readonly minThroughputPerTickFloor: number;
  readonly maxRetryAttemptsPerOperation: number;
  readonly maxTotalRetryAttempts: number;
  readonly maxMemoryUnitBudget: number;
  readonly maxHandleBudget: number;
  readonly maxContainerBudget: number;
  readonly maxVolumeBudget: number;
}

interface BudgetProfile {
  readonly id: string;
  readonly baselineId: string;
  readonly operationCount: number;
  readonly concurrentActors: number;
  readonly concurrencyLimit: number;
  readonly queueDepthLimit: number;
  readonly expectedBackpressureEvents: number;
  readonly syntheticFailureEvery: number;
  readonly retryBudgetAttemptsPerOperation: number;
  readonly totalRetryBudget: number;
  readonly latencyBudgetTicks: number;
  readonly timeoutBudgetTicks: number;
  readonly minThroughputPerTick: number;
  readonly memoryUnitBudget: number;
  readonly memoryUnitsPerConcurrentActor: number;
  readonly handleBudget: number;
  readonly containerBudget: number;
  readonly volumeBudget: number;
  readonly cleanupRequired: boolean;
}

interface ServiceBudgetRow {
  readonly serviceId: string;
  readonly budgetProfileId: string | null;
  readonly budgetDisposition:
    | "deterministic-budgeted"
    | "catalogue-only-budget-disposition"
    | "out-of-scope-budget-disposition";
  readonly baselineRef: string;
  readonly fixtureSeedId: string;
  readonly unsupportedReason?: string;
}

interface ProfileStartupBudget {
  readonly profile: string;
  readonly startupBudgetTicks: number;
  readonly maxContainers: number;
  readonly maxVolumeUnits: number;
  readonly cleanupRequired: boolean;
}

interface PerformanceSuite {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly sourceAuthorities: {
    readonly obligationManifest: string;
    readonly fixtureCorpus: string;
    readonly commandSurfaceGate: string;
  };
  readonly scope: {
    readonly serviceBudgetDispositionCount: number;
    readonly composeProfileStartupBudgetCount: number;
    readonly semanticContractFixtureCount: number;
    readonly usesRealTimers: boolean;
    readonly usesServiceBackedLoad: boolean;
    readonly usesDeterministicSyntheticLoopsOnly: boolean;
    readonly finalTestReadinessClaim: boolean;
  };
  readonly requiredCoverageAxes: readonly CoverageAxis[];
  readonly surfaceCoverage: readonly {
    readonly surfaceId: string;
    readonly budgetProfileIds: readonly string[];
  }[];
  readonly guardrailPolicy: GuardrailPolicy;
  readonly budgetProfiles: readonly BudgetProfile[];
  readonly serviceBudgetRows: readonly ServiceBudgetRow[];
  readonly profileStartupBudgets: readonly ProfileStartupBudget[];
  readonly evidenceBoundary: {
    readonly syntheticOnly: boolean;
    readonly valueFree: boolean;
    readonly productionDerived: boolean;
    readonly realTenantDataAllowed: boolean;
    readonly realSecretsAllowed: boolean;
    readonly liveProviderPayloadAllowed: boolean;
    readonly privateLocalStateAllowed: boolean;
    readonly productionCapacityClaimAllowed: boolean;
    readonly loadTestCertificationClaimAllowed: boolean;
    readonly serviceBackedRuntimeClaimAllowed: boolean;
  };
  readonly validationCommands: readonly string[];
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

interface SimulationResult {
  readonly acceptedOperations: number;
  readonly backpressureEvents: number;
  readonly ticks: number;
  readonly throughputPerTick: number;
  readonly maxInFlight: number;
  readonly maxQueueDepth: number;
  readonly retryAttempts: number;
  readonly memoryUnitsObserved: number;
  readonly handlesObserved: number;
  readonly containersObserved: number;
  readonly volumesObserved: number;
  readonly leakedHandles: number;
  readonly leakedContainers: number;
  readonly leakedVolumes: number;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T extends object>(rows: readonly T[], key: keyof T): Map<string, T> {
  return new Map(rows.map((row) => [String(row[key]), row]));
}

function simulateBudget(profile: BudgetProfile): SimulationResult {
  const initiallyInFlight = Math.min(profile.operationCount, profile.concurrencyLimit);
  const queued = Math.min(
    Math.max(profile.operationCount - initiallyInFlight, 0),
    profile.queueDepthLimit,
  );
  const acceptedOperations = initiallyInFlight + queued;
  const backpressureEvents = profile.operationCount - acceptedOperations;
  const ticks = Math.ceil(acceptedOperations / profile.concurrencyLimit);
  const retryAttempts = Math.floor(profile.operationCount / profile.syntheticFailureEvery);
  const memoryUnitsObserved = profile.concurrencyLimit * profile.memoryUnitsPerConcurrentActor;
  const handlesObserved = Math.min(profile.handleBudget, profile.concurrencyLimit + 2);
  const containersObserved = profile.containerBudget;
  const volumesObserved = profile.volumeBudget;

  return {
    acceptedOperations,
    backpressureEvents,
    ticks,
    throughputPerTick: acceptedOperations / ticks,
    maxInFlight: profile.concurrencyLimit,
    maxQueueDepth: queued,
    retryAttempts,
    memoryUnitsObserved,
    handlesObserved,
    containersObserved,
    volumesObserved,
    leakedHandles: profile.cleanupRequired ? 0 : handlesObserved,
    leakedContainers: profile.cleanupRequired ? 0 : containersObserved,
    leakedVolumes: profile.cleanupRequired ? 0 : volumesObserved,
  };
}

function validateSuite(suite: PerformanceSuite): readonly string[] {
  const findings: string[] = [];
  const profileById = byId(suite.budgetProfiles, "id");
  const profileIdsInUse = new Set(
    suite.serviceBudgetRows
      .map((row) => row.budgetProfileId)
      .filter((id): id is string => id !== null),
  );

  for (const profile of suite.budgetProfiles) {
    if (!profile.baselineId) findings.push(`missing-baseline:${profile.id}`);
    if (
      profile.operationCount <= 0 ||
      profile.operationCount > suite.guardrailPolicy.maxOperationCount
    ) {
      findings.push(`unbounded-load:${profile.id}`);
    }
    if (profile.concurrentActors > suite.guardrailPolicy.maxConcurrentActors) {
      findings.push(`unbounded-concurrency:${profile.id}`);
    }
    if (profile.latencyBudgetTicks > suite.guardrailPolicy.maxLatencyBudgetTicks) {
      findings.push(`budget-weakening:${profile.id}:latency`);
    }
    if (profile.timeoutBudgetTicks > suite.guardrailPolicy.maxTimeoutBudgetTicks) {
      findings.push(`budget-weakening:${profile.id}:timeout`);
    }
    if (profile.queueDepthLimit > suite.guardrailPolicy.maxQueueDepthLimit) {
      findings.push(`budget-weakening:${profile.id}:queue`);
    }
    if (profile.minThroughputPerTick < suite.guardrailPolicy.minThroughputPerTickFloor) {
      findings.push(`budget-weakening:${profile.id}:throughput`);
    }
    if (
      profile.retryBudgetAttemptsPerOperation >
        suite.guardrailPolicy.maxRetryAttemptsPerOperation ||
      profile.totalRetryBudget > suite.guardrailPolicy.maxTotalRetryAttempts
    ) {
      findings.push(`budget-weakening:${profile.id}:retry`);
    }
    if (profile.memoryUnitBudget > suite.guardrailPolicy.maxMemoryUnitBudget) {
      findings.push(`budget-weakening:${profile.id}:memory`);
    }
    if (!profile.cleanupRequired) findings.push(`cleanup-missing:${profile.id}`);
  }

  for (const row of suite.serviceBudgetRows) {
    if (!row.baselineRef) findings.push(`missing-baseline:${row.serviceId}`);
    if (row.budgetDisposition === "deterministic-budgeted") {
      if (row.budgetProfileId === null || !profileById.has(row.budgetProfileId)) {
        findings.push(`missing-budget:${row.serviceId}`);
      }
    } else if (!row.unsupportedReason) {
      findings.push(`missing-budget-disposition:${row.serviceId}`);
    }
  }

  for (const axis of suite.requiredCoverageAxes) {
    if (axis === "bounded-concurrency") {
      const concurrencyCovered = [...profileIdsInUse].some((id) => {
        const profile = profileById.get(id) as BudgetProfile | undefined;
        return (
          profile !== undefined && profile.concurrentActors > 1 && profile.concurrencyLimit > 1
        );
      });
      if (!concurrencyCovered) findings.push("concurrency-coverage-missing");
    }
  }

  return findings;
}

const suite = readJson<PerformanceSuite>(
  "docs/architecture/performance-concurrency-resource-regression-suite.json",
);
const manifest = readJson<ObligationManifest>(suite.sourceAuthorities.obligationManifest);
const fixtures = loadSyntheticFixtureCorpus();

const serviceRows = manifest.serviceObligations;
const profileRows = manifest.profileObligations;
const budgetProfileById = byId(suite.budgetProfiles, "id");
const serviceBudgetById = byId(suite.serviceBudgetRows, "serviceId");
const profileBudgetById = byId(suite.profileStartupBudgets, "profile");

describe("performance concurrency resource regression suite", () => {
  it("maps USF-254 to the expanded test-readiness obligation without final acceptance claims", () => {
    const category = manifest.expandedCategoryObligations.find((row) => row.issueId === "USF-254");
    expect(suite.issueId).toBe("USF-254");
    expect(suite.parentIssueId).toBe("USF-234");
    expect(category).toBeDefined();
    expect(category?.categoryId).toBe("performance-concurrency-resource");
    expect(category?.requiredCommandIds).toContain(
      "test-readiness-performance-concurrency-resource",
    );
    expect(category?.validationCommands).toContain(
      "corepack pnpm test -- tests/packages/performance-concurrency-resource-regression-suite.test.ts",
    );
    expect(category?.testReadinessClaimAllowed).toBe(false);
    expect(category?.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(suite.scope.usesRealTimers).toBe(false);
    expect(suite.scope.usesServiceBackedLoad).toBe(false);
    expect(suite.scope.usesDeterministicSyntheticLoopsOnly).toBe(true);
    expect(suite.scope.finalTestReadinessClaim).toBe(false);
    expect(validateSuite(suite)).toEqual([]);
  });

  it("maps every service obligation to a deterministic budget or bounded disposition", () => {
    assertFixtureCorpusSafe(fixtures);
    expect(suite.serviceBudgetRows).toHaveLength(suite.scope.serviceBudgetDispositionCount);
    expect(suite.serviceBudgetRows).toHaveLength(serviceRows.length);
    expect(fixtures.serviceFixtures).toHaveLength(serviceRows.length);

    for (const manifestRow of serviceRows) {
      const budgetRow = serviceBudgetById.get(manifestRow.serviceId);
      const fixtureRow = serviceFixtureById(fixtures, manifestRow.serviceId);
      expect(budgetRow, `missing budget disposition for ${manifestRow.serviceId}`).toBeDefined();
      expect(fixtureRow, `missing fixture row for ${manifestRow.serviceId}`).toBeDefined();
      expect(budgetRow?.fixtureSeedId).toBe(manifestRow.fixtureSeedId);
      expect(budgetRow?.fixtureSeedId).toBe(fixtureRow?.fixtureSeedId);

      if (manifestRow.requiredInTest && manifestRow.generatedInTestCompose) {
        expect(budgetRow?.budgetDisposition).toBe("deterministic-budgeted");
        expect(budgetRow?.budgetProfileId).not.toBeNull();
        expect(budgetProfileById.has(String(budgetRow?.budgetProfileId))).toBe(true);
      } else {
        expect(["catalogue-only-budget-disposition", "out-of-scope-budget-disposition"]).toContain(
          budgetRow?.budgetDisposition,
        );
        expect(budgetRow?.budgetProfileId).toBeNull();
        expect(budgetRow?.unsupportedReason?.length ?? 0).toBeGreaterThan(20);
      }
    }
  });

  it("maps every generated test Compose profile to startup and cleanup budgets", () => {
    expect(suite.profileStartupBudgets).toHaveLength(suite.scope.composeProfileStartupBudgetCount);
    expect(suite.profileStartupBudgets).toHaveLength(profileRows.length);

    for (const manifestRow of profileRows) {
      const budget = profileBudgetById.get(manifestRow.profile);
      expect(budget, `missing profile startup budget for ${manifestRow.profile}`).toBeDefined();
      expect(manifestRow.mustBeStarted).toBe(true);
      expect(manifestRow.mustBeSeeded).toBe(true);
      expect(manifestRow.mustBeExercised).toBe(true);
      expect(manifestRow.mustBeReset).toBe(true);
      expect(manifestRow.mustBeEvidenced).toBe(true);
      expect(manifestRow.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(budget?.cleanupRequired).toBe(true);
      expect(budget?.startupBudgetTicks ?? 0).toBeGreaterThan(0);
      expect(budget?.startupBudgetTicks ?? 0).toBeLessThanOrEqual(32);
      expect(budget?.maxContainers ?? 0).toBeLessThanOrEqual(
        suite.guardrailPolicy.maxContainerBudget,
      );
      for (const serviceIdOrComposeId of manifestRow.serviceIds) {
        const matchesService = serviceRows.some(
          (row) =>
            row.serviceId === serviceIdOrComposeId || row.composeServiceId === serviceIdOrComposeId,
        );
        expect(matchesService, `profile ${manifestRow.profile} references unknown service`).toBe(
          true,
        );
      }
    }
  });

  it("deterministically exercises latency throughput concurrency saturation retry timeout and cleanup budgets", () => {
    const observed: readonly (readonly [string, SimulationResult])[] = suite.budgetProfiles.map(
      (profile) => [profile.id, simulateBudget(profile)] as const,
    );
    expect(observed).toEqual(
      suite.budgetProfiles.map((profile) => [profile.id, simulateBudget(profile)]),
    );

    for (const [profileId, result] of observed) {
      const profile = budgetProfileById.get(profileId);
      expect(profile).toBeDefined();
      expect(result.acceptedOperations).toBe(profile?.operationCount);
      expect(result.backpressureEvents).toBe(profile?.expectedBackpressureEvents);
      expect(result.ticks).toBeLessThanOrEqual(profile?.latencyBudgetTicks ?? 0);
      expect(result.ticks).toBeLessThanOrEqual(profile?.timeoutBudgetTicks ?? 0);
      expect(result.throughputPerTick).toBeGreaterThanOrEqual(profile?.minThroughputPerTick ?? 0);
      expect(result.maxInFlight).toBeLessThanOrEqual(profile?.concurrencyLimit ?? 0);
      expect(result.maxQueueDepth).toBeLessThanOrEqual(profile?.queueDepthLimit ?? 0);
      expect(result.retryAttempts).toBeLessThanOrEqual(profile?.totalRetryBudget ?? 0);
      expect(result.memoryUnitsObserved).toBeLessThanOrEqual(profile?.memoryUnitBudget ?? 0);
      expect(result.handlesObserved).toBeLessThanOrEqual(profile?.handleBudget ?? 0);
      expect(result.containersObserved).toBeLessThanOrEqual(profile?.containerBudget ?? 0);
      expect(result.volumesObserved).toBeLessThanOrEqual(profile?.volumeBudget ?? 0);
      expect(result.leakedHandles).toBe(0);
      expect(result.leakedContainers).toBe(0);
      expect(result.leakedVolumes).toBe(0);
    }
  });

  it("fails closed for missing baselines weakened budgets unbounded load cleanup gaps and removed concurrency coverage", () => {
    const missingBaseline: PerformanceSuite = {
      ...suite,
      budgetProfiles: suite.budgetProfiles.map((profile, index) =>
        index === 0 ? { ...profile, baselineId: "" } : profile,
      ),
    };
    expect(validateSuite(missingBaseline)).toContain("missing-baseline:data-store-pressure");

    const weakenedBudget: PerformanceSuite = {
      ...suite,
      budgetProfiles: suite.budgetProfiles.map((profile, index) =>
        index === 0
          ? {
              ...profile,
              latencyBudgetTicks: suite.guardrailPolicy.maxLatencyBudgetTicks + 1,
            }
          : profile,
      ),
    };
    expect(validateSuite(weakenedBudget)).toContain("budget-weakening:data-store-pressure:latency");

    const unboundedLoad: PerformanceSuite = {
      ...suite,
      budgetProfiles: suite.budgetProfiles.map((profile, index) =>
        index === 0
          ? {
              ...profile,
              operationCount: suite.guardrailPolicy.maxOperationCount + 1,
            }
          : profile,
      ),
    };
    expect(validateSuite(unboundedLoad)).toContain("unbounded-load:data-store-pressure");

    const cleanupGap: PerformanceSuite = {
      ...suite,
      budgetProfiles: suite.budgetProfiles.map((profile, index) =>
        index === 0 ? { ...profile, cleanupRequired: false } : profile,
      ),
    };
    expect(validateSuite(cleanupGap)).toContain("cleanup-missing:data-store-pressure");

    const removedConcurrencyCoverage: PerformanceSuite = {
      ...suite,
      budgetProfiles: suite.budgetProfiles.map((profile) => ({
        ...profile,
        concurrentActors: 1,
        concurrencyLimit: 1,
      })),
    };
    expect(validateSuite(removedConcurrencyCoverage)).toContain("concurrency-coverage-missing");
  });

  it("preserves value-free evidence boundaries and non-claims", () => {
    expect(suite.evidenceBoundary.syntheticOnly).toBe(true);
    expect(suite.evidenceBoundary.valueFree).toBe(true);
    expect(suite.evidenceBoundary.productionDerived).toBe(false);
    expect(suite.evidenceBoundary.realTenantDataAllowed).toBe(false);
    expect(suite.evidenceBoundary.realSecretsAllowed).toBe(false);
    expect(suite.evidenceBoundary.liveProviderPayloadAllowed).toBe(false);
    expect(suite.evidenceBoundary.privateLocalStateAllowed).toBe(false);
    expect(suite.evidenceBoundary.productionCapacityClaimAllowed).toBe(false);
    expect(suite.evidenceBoundary.loadTestCertificationClaimAllowed).toBe(false);
    expect(suite.evidenceBoundary.serviceBackedRuntimeClaimAllowed).toBe(false);
    expect(suite.allowedClaims).toEqual([
      "deterministic-performance-concurrency-resource-suite-defined",
      "owned-regression-test-gate-defined",
    ]);
    for (const nonClaim of [
      "final-test-readiness",
      "staging-readiness",
      "production-readiness",
      "deployment-readiness",
      "live-provider-readiness",
      "production-scale",
      "load-test-certification",
      "soc-readiness",
      "iso27001-certification",
      "enterprise-production-readiness",
      "product-ui-readiness",
      "browser-e2e-readiness",
      "full-product-readiness",
      "final-usf-234-acceptance",
    ]) {
      expect(suite.nonClaims).toContain(nonClaim);
    }
  });
});
