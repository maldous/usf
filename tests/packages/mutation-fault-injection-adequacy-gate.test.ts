import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MATRIX_PATH = "docs/architecture/mutation-fault-injection-adequacy-gate.json";
const HUMAN_DOC_PATH = "docs/architecture/mutation-fault-injection-adequacy-gate.md";
const ISSUE_TEST_COMMAND =
  "corepack pnpm test -- tests/packages/mutation-fault-injection-adequacy-gate.test.ts";
const REQUIRED_COMMAND_ID = "test-readiness-mutation-fault-injection";
const REQUIRED_COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const REQUIRED_FACETS = [
  "auditModel",
  "contracts",
  "errorModel",
  "lifecycle",
  "permissions",
  "proof",
  "readinessModel",
  "stateModel",
  "uiSemanticDefinition",
  "validation",
] as const;
const REQUIRED_WEAKENING_DOMAINS = [
  "semantic",
  "auth",
  "data",
  "compose",
  "fixture",
  "enterprise",
  "coverage",
  "operational",
  "command",
  "non-claim",
] as const;
const REQUIRED_NON_CLAIMS = [
  "formal-verification",
  "exhaustive-proof",
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
  "full-product-readiness",
  "final-usf-234-acceptance",
] as const;

interface ExpectedFailure {
  readonly kind: "test" | "validator-rule" | "planted-defect-rule";
  readonly id: string;
  readonly existingRuleId?: string;
  readonly testFile: string;
  readonly description: string;
}

interface MutationCase {
  readonly id: string;
  readonly mutationClassId: string;
  readonly weakeningDomain: string;
  readonly linearInput: string;
  readonly sourceAuthority: string;
  readonly sourceIssueLinks: readonly string[];
  readonly simulatedMutation: string;
  readonly expectedFailure?: ExpectedFailure;
}

interface SourceAuthorities {
  readonly obligationManifest: string;
  readonly expandedCategoryPointer: string;
  readonly commandSurface: string;
  readonly enterpriseEvidenceModel: string;
  readonly enterpriseControlSuite: string;
  readonly functionalRegressionSuite: string;
  readonly semanticUnitSuite: string;
  readonly deterministicFixtureLifecycle: string;
  readonly fixtureCorpus: string;
  readonly composedIntegrationMatrix: string;
  readonly expandedCategoryOverclaimPlantedDefect: string;
}

interface Matrix {
  readonly id: string;
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly dependsOnIssueIds: readonly string[];
  readonly sourceAuthorities: SourceAuthorities;
  readonly ownedPaths: readonly string[];
  readonly issueOwnership: {
    readonly obligationClassId: string;
    readonly ownerIssueId: string;
    readonly blockingIssues: readonly string[];
  };
  readonly scope: {
    readonly safeMutationMode: string;
    readonly sourceFilesEditedAtRuntime: boolean;
    readonly mutationToolingDependencyAdded: boolean;
    readonly sharedValidatorIntegrationRequired: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly requiredWeakeningDomains: readonly string[];
    readonly requiredLinearMutationInputsCovered: readonly string[];
  };
  readonly gateSemantics: {
    readonly baselineMustPassBeforeMutation: boolean;
    readonly mutationMustProduceExpectedFailure: boolean;
    readonly expectedFailureEvidenceRequired: boolean;
    readonly unexpectedMutationPassFailsGate: boolean;
    readonly missingExpectedFailureEvidenceFailsGate: boolean;
    readonly missingSourceAuthorityFailsGate: boolean;
    readonly noSourceFileRuntimeEdits: boolean;
    readonly deterministicLocalOnly: boolean;
  };
  readonly validationCommands: readonly string[];
  readonly mutationCases: readonly MutationCase[];
  readonly coverageByWeakeningDomain: readonly {
    readonly domain: string;
    readonly caseIds: readonly string[];
  }[];
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

interface SemanticContractObligation {
  readonly contractId: string;
  readonly facetKeys: readonly string[];
}

interface ExpandedCategory {
  issueId: string;
  categoryId: string;
  categoryClassId: string;
  requiredCommandIds: string[];
  validationCommands: string[];
  generatedArtifactScope: string[];
  enterpriseEvidenceRefs: Record<string, string[]>;
  testReadinessClaimAllowed: boolean;
  inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  nonClaims: string[];
}

interface ObligationManifest {
  readonly obligationClasses: readonly { readonly id: string; readonly ownerIssueId: string }[];
  readonly expandedCategoryObligations: readonly ExpandedCategory[];
  readonly semanticContractObligations: readonly SemanticContractObligation[];
  readonly coveragePolicy: {
    readonly minimumLineCoveragePercent: number;
  };
}

interface ServiceFixtureRow {
  serviceId: string;
  fixtureSeedId: string;
  composeTarget: string;
  lifecycleApi: {
    cleanupId?: string;
  };
  lifecycleCoverage: Record<string, boolean | string>;
  provenance: {
    syntheticOnly: boolean;
    productionDerived: boolean;
    realTenantDataAllowed: boolean;
    realSecretsAllowed: boolean;
  };
  inMemoryServiceSubstituteAllowed: boolean;
}

interface FixtureCorpus {
  readonly serviceFixtures: readonly ServiceFixtureRow[];
}

interface EnterpriseModel {
  observabilityEvidenceStandard: {
    prohibitedFields: string[];
  };
  [key: string]: unknown;
}

interface SourceState {
  readonly semanticContract: {
    contractId: string;
    facetKeys: string[];
  };
  readonly expandedCategory: ExpandedCategory;
  readonly coveragePolicy: {
    minimumLineCoveragePercent: number;
  };
  readonly commandSurface: {
    followUpIssueIds: string[];
  };
  readonly serviceFixture: ServiceFixtureRow;
  readonly enterpriseModel: EnterpriseModel;
  readonly plantedDefects: Record<string, string | undefined>;
  readonly authBoundary: {
    tenantFilterRequired: boolean;
    permissionCheckMode: "explicit-action-resource" | "role-only";
    unknownRolesFailClosed: boolean;
    malformedTokensRejected: boolean;
  };
  readonly operationalBoundary: {
    auditEmissionRequired: boolean;
    fakeReadyStateAccepted: boolean;
    redactionEnabled: boolean;
  };
  readonly gatePolicy: {
    expectedFailureEvidenceRequired: boolean;
    unexpectedMutationPassFailsGate: boolean;
  };
}

interface Finding {
  readonly id: string;
  readonly subject: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sourcePath(reference: string): string {
  const [path] = reference.split("#", 1);
  if (path === undefined || path.length === 0) {
    throw new Error(`invalid source reference: ${reference}`);
  }
  return path;
}

function expandedCategory(manifest: ObligationManifest): ExpandedCategory {
  const row = manifest.expandedCategoryObligations.find((item) => item.issueId === "USF-256");
  if (row === undefined) {
    throw new Error("USF-256 expanded category row is missing");
  }
  return clone(row);
}

function representativeSemanticContract(
  manifest: ObligationManifest,
): SourceState["semanticContract"] {
  const row = manifest.semanticContractObligations.find((item) =>
    REQUIRED_FACETS.every((facet) => item.facetKeys.includes(facet)),
  );
  if (row === undefined) {
    throw new Error("representative semantic obligation with all required facets is missing");
  }
  return {
    contractId: row.contractId,
    facetKeys: [...row.facetKeys],
  };
}

function serviceFixture(corpus: FixtureCorpus): ServiceFixtureRow {
  const row = corpus.serviceFixtures.find((item) => item.serviceId === "postgres");
  if (row === undefined) {
    throw new Error("postgres fixture row is missing");
  }
  return clone(row);
}

function enterpriseSectionIds(model: EnterpriseModel, section: string): Set<string> {
  const rows = model[section];
  if (!Array.isArray(rows)) {
    return new Set();
  }
  return new Set(
    rows
      .map((row) =>
        typeof row === "object" && row !== null ? String((row as { id?: unknown }).id) : "",
      )
      .filter(Boolean),
  );
}

const matrix = readJson<Matrix>(MATRIX_PATH);
const manifest = readJson<ObligationManifest>(matrix.sourceAuthorities.obligationManifest);
const commandSurface = readJson<{ followUpIssueIds: string[] }>(
  matrix.sourceAuthorities.commandSurface,
);
const enterprise = readJson<EnterpriseModel>(matrix.sourceAuthorities.enterpriseEvidenceModel);
const fixtures = readJson<FixtureCorpus>(matrix.sourceAuthorities.fixtureCorpus);
const plantedDefect = readJson<{ expectedRule: string }>(
  matrix.sourceAuthorities.expandedCategoryOverclaimPlantedDefect,
);

function buildSourceState(): SourceState {
  return {
    semanticContract: representativeSemanticContract(manifest),
    expandedCategory: expandedCategory(manifest),
    coveragePolicy: clone(manifest.coveragePolicy),
    commandSurface: clone(commandSurface),
    serviceFixture: serviceFixture(fixtures),
    enterpriseModel: clone(enterprise),
    plantedDefects: {
      "080-expanded-category-overclaim": plantedDefect.expectedRule,
    },
    authBoundary: {
      tenantFilterRequired: true,
      permissionCheckMode: "explicit-action-resource",
      unknownRolesFailClosed: true,
      malformedTokensRejected: true,
    },
    operationalBoundary: {
      auditEmissionRequired: true,
      fakeReadyStateAccepted: false,
      redactionEnabled: true,
    },
    gatePolicy: {
      expectedFailureEvidenceRequired: matrix.gateSemantics.expectedFailureEvidenceRequired,
      unexpectedMutationPassFailsGate: matrix.gateSemantics.unexpectedMutationPassFailsGate,
    },
  };
}

function applyMutation(state: SourceState, mutationId: string): void {
  switch (mutationId) {
    case "semantic-facet-backing-removed":
      state.semanticContract.facetKeys = state.semanticContract.facetKeys.filter(
        (facet) => facet !== "auditModel",
      );
      return;
    case "tenant-filter-removed":
      state.authBoundary.tenantFilterRequired = false;
      return;
    case "permission-check-weakened":
      state.authBoundary.permissionCheckMode = "role-only";
      return;
    case "role-mapping-weakened":
      state.authBoundary.unknownRolesFailClosed = false;
      return;
    case "malformed-token-accepted":
      state.authBoundary.malformedTokensRejected = false;
      return;
    case "audit-event-skipped":
      state.operationalBoundary.auditEmissionRequired = false;
      return;
    case "fake-ready-state-accepted":
      state.operationalBoundary.fakeReadyStateAccepted = true;
      return;
    case "cleanup-mapping-removed":
      state.serviceFixture.lifecycleCoverage.cleanup = false;
      delete state.serviceFixture.lifecycleApi.cleanupId;
      return;
    case "stale-seed-accepted":
      state.serviceFixture.lifecycleCoverage.deterministicSeed = "stale-seed";
      return;
    case "fixture-provenance-removed":
      state.serviceFixture.provenance.syntheticOnly = false;
      state.serviceFixture.provenance.productionDerived = true;
      return;
    case "redaction-disabled":
      state.operationalBoundary.redactionEnabled = false;
      return;
    case "service-backed-substitute-allowed":
      state.expandedCategory.inMemoryServiceSubstituteAllowedForServiceBackedClaims = true;
      state.serviceFixture.inMemoryServiceSubstituteAllowed = true;
      return;
    case "lcov-threshold-lowered":
      state.coveragePolicy.minimumLineCoveragePercent = 80;
      return;
    case "command-evidence-mapping-removed":
      state.expandedCategory.requiredCommandIds = [];
      state.expandedCategory.validationCommands = [];
      return;
    case "stale-command-accepted":
      state.expandedCategory.validationCommands = ["corepack pnpm test -- tests/packages/stale.ts"];
      return;
    case "compose-target-linkage-removed":
      state.expandedCategory.generatedArtifactScope =
        state.expandedCategory.generatedArtifactScope.filter(
          (item) => item !== REQUIRED_COMPOSE_TARGET,
        );
      state.serviceFixture.composeTarget = "compose/stale.generated.yaml";
      return;
    case "enterprise-evidence-row-removed": {
      const rows = state.enterpriseModel.evidenceRegister;
      if (Array.isArray(rows)) {
        state.enterpriseModel.evidenceRegister = rows.filter(
          (row) =>
            !(
              typeof row === "object" &&
              row !== null &&
              (row as { id?: unknown }).id === "evidence-usf-256-mutation-fault-injection"
            ),
        );
      }
      return;
    }
    case "planted-defect-rule-removed":
      delete state.plantedDefects["080-expanded-category-overclaim"];
      return;
    case "non-claim-removed":
      state.expandedCategory.nonClaims = state.expandedCategory.nonClaims.filter(
        (claim) => claim !== "final-test-readiness",
      );
      return;
    case "fail-closed-expectation-weakened":
      state.gatePolicy.expectedFailureEvidenceRequired = false;
      state.gatePolicy.unexpectedMutationPassFailsGate = false;
      return;
    default:
      throw new Error(`unhandled mutation case: ${mutationId}`);
  }
}

function evaluateMutatedState(state: SourceState): Finding[] {
  const findings: Finding[] = [];
  const add = (id: string, subject: string): void => {
    findings.push({ id, subject });
  };

  if (!REQUIRED_FACETS.every((facet) => state.semanticContract.facetKeys.includes(facet))) {
    add("USF-256-MUTATION-SEMANTIC-FACET-REMOVED", state.semanticContract.contractId);
  }
  if (!state.authBoundary.tenantFilterRequired) {
    add("USF-256-MUTATION-TENANT-FILTER-REMOVED", "authBoundary.tenantFilterRequired");
  }
  if (state.authBoundary.permissionCheckMode !== "explicit-action-resource") {
    add("USF-256-MUTATION-PERMISSION-CHECK-WEAKENED", "authBoundary.permissionCheckMode");
  }
  if (!state.authBoundary.unknownRolesFailClosed) {
    add("USF-256-MUTATION-ROLE-MAPPING-WEAKENED", "authBoundary.unknownRolesFailClosed");
  }
  if (!state.authBoundary.malformedTokensRejected) {
    add("USF-256-MUTATION-MALFORMED-TOKEN-ACCEPTED", "authBoundary.malformedTokensRejected");
  }
  if (!state.operationalBoundary.auditEmissionRequired) {
    add("USF-256-MUTATION-AUDIT-EVENT-SKIPPED", "operationalBoundary.auditEmissionRequired");
  }
  if (state.operationalBoundary.fakeReadyStateAccepted) {
    add("USF-256-MUTATION-FAKE-READY-STATE-ACCEPTED", "operationalBoundary.fakeReadyStateAccepted");
  }
  if (
    state.serviceFixture.lifecycleCoverage.cleanup !== true ||
    state.serviceFixture.lifecycleApi.cleanupId === undefined
  ) {
    add("USF-256-MUTATION-CLEANUP-MAPPING-REMOVED", state.serviceFixture.serviceId);
  }
  if (state.serviceFixture.lifecycleCoverage.deterministicSeed === "stale-seed") {
    add("USF-256-MUTATION-STALE-SEED-ACCEPTED", state.serviceFixture.serviceId);
  }
  if (
    !state.serviceFixture.provenance.syntheticOnly ||
    state.serviceFixture.provenance.productionDerived
  ) {
    add("USF-256-MUTATION-FIXTURE-PROVENANCE-REMOVED", state.serviceFixture.serviceId);
  }
  if (
    !state.operationalBoundary.redactionEnabled ||
    enterprise.observabilityEvidenceStandard.prohibitedFields.length === 0
  ) {
    add("USF-256-MUTATION-REDACTION-DISABLED", "enterprise.observabilityEvidenceStandard");
  }
  if (
    state.expandedCategory.inMemoryServiceSubstituteAllowedForServiceBackedClaims !== false ||
    state.serviceFixture.inMemoryServiceSubstituteAllowed !== false
  ) {
    add("USF-TEST-READINESS-080", "inMemoryServiceSubstituteAllowedForServiceBackedClaims");
  }
  if (state.coveragePolicy.minimumLineCoveragePercent !== 100) {
    add("USF-256-MUTATION-LCOV-THRESHOLD-LOWERED", "coveragePolicy.minimumLineCoveragePercent");
  }
  if (
    !state.expandedCategory.requiredCommandIds.includes(REQUIRED_COMMAND_ID) ||
    state.expandedCategory.validationCommands.length === 0
  ) {
    add("USF-TEST-READINESS-078", "expandedCategory.requiredCommandIds");
  }
  if (!state.expandedCategory.validationCommands.includes(ISSUE_TEST_COMMAND)) {
    add("USF-256-MUTATION-STALE-COMMAND-ACCEPTED", "expandedCategory.validationCommands");
  }
  if (
    !state.expandedCategory.generatedArtifactScope.includes(REQUIRED_COMPOSE_TARGET) ||
    state.serviceFixture.composeTarget !== REQUIRED_COMPOSE_TARGET
  ) {
    add("USF-TEST-READINESS-078", "expandedCategory.generatedArtifactScope");
  }
  for (const [section, refs] of Object.entries(state.expandedCategory.enterpriseEvidenceRefs)) {
    const ids = enterpriseSectionIds(state.enterpriseModel, section);
    for (const ref of refs) {
      if (!ids.has(ref)) {
        add("USF-TEST-READINESS-079", `${section}.${ref}`);
      }
    }
  }
  if (state.plantedDefects["080-expanded-category-overclaim"] !== "USF-TEST-READINESS-080") {
    add(
      "USF-256-MUTATION-PLANTED-DEFECT-REMOVED",
      "planted-defects.080-expanded-category-overclaim",
    );
  }
  if (!state.expandedCategory.nonClaims.includes("final-test-readiness")) {
    add("USF-TEST-READINESS-080", "expandedCategory.nonClaims");
  }
  if (
    !state.gatePolicy.expectedFailureEvidenceRequired ||
    !state.gatePolicy.unexpectedMutationPassFailsGate
  ) {
    add("USF-256-MUTATION-FAIL-CLOSED-EXPECTATION-WEAKENED", "gatePolicy");
  }
  return findings;
}

function runAdequacyGate(
  cases: readonly MutationCase[],
  options: { readonly forceNoopMutationIds?: ReadonlySet<string> } = {},
): Finding[] {
  const gateFindings: Finding[] = [];
  for (const row of cases) {
    if (row.expectedFailure === undefined) {
      gateFindings.push({
        id: "USF-256-ADEQUACY-EXPECTED-FAILURE-EVIDENCE-MISSING",
        subject: row.id,
      });
      continue;
    }

    const baselineFindings = evaluateMutatedState(buildSourceState());
    if (baselineFindings.some((finding) => finding.id === row.expectedFailure?.id)) {
      gateFindings.push({
        id: "USF-256-ADEQUACY-BASELINE-FAILED-BEFORE-MUTATION",
        subject: row.id,
      });
      continue;
    }

    const mutated = buildSourceState();
    if (!options.forceNoopMutationIds?.has(row.id)) {
      applyMutation(mutated, row.id);
    }
    const observedIds = new Set(evaluateMutatedState(mutated).map((finding) => finding.id));
    if (!observedIds.has(row.expectedFailure.id)) {
      gateFindings.push({
        id: "USF-256-ADEQUACY-UNEXPECTED-MUTATION-PASS",
        subject: row.id,
      });
    }
  }
  return gateFindings;
}

describe("mutation and fault-injection adequacy gate", () => {
  it("is issue-scoped and linked to the USF-256 expanded obligation row", () => {
    expect(matrix.id).toBe("mutation-fault-injection-adequacy-gate");
    expect(matrix.issueId).toBe("USF-256");
    expect(matrix.parentIssueId).toBe("USF-234");
    expect(matrix.dependsOnIssueIds).toEqual(["USF-239", "USF-243", "USF-248", "USF-259"]);
    expect(matrix.issueOwnership).toMatchObject({
      obligationClassId: "mutation-fault-injection",
      ownerIssueId: "USF-256",
    });
    expect(matrix.issueOwnership.blockingIssues).toEqual(["USF-247", "USF-260", "USF-234"]);
    expect(matrix.scope.sourceFilesEditedAtRuntime).toBe(false);
    expect(matrix.scope.mutationToolingDependencyAdded).toBe(false);
    expect(matrix.scope.sharedValidatorIntegrationRequired).toBe(false);
    expect(matrix.scope.testReadinessClaimAllowed).toBe(false);
    expect(matrix.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(matrix.scope.safeMutationMode).toBe("copy-source-authority-data-in-test-memory-only");

    const classRow = manifest.obligationClasses.find(
      (row) => row.id === "mutation-fault-injection",
    );
    const categoryRow = expandedCategory(manifest);
    expect(classRow?.ownerIssueId).toBe("USF-256");
    expect(categoryRow.categoryId).toBe("mutation-fault-injection");
    expect(categoryRow.categoryClassId).toBe("mutation-fault-injection");
    expect(categoryRow.requiredCommandIds).toContain(REQUIRED_COMMAND_ID);
    expect(categoryRow.validationCommands).toContain(ISSUE_TEST_COMMAND);
    expect(categoryRow.generatedArtifactScope).toContain(REQUIRED_COMPOSE_TARGET);
    expect(Object.values(categoryRow.enterpriseEvidenceRefs).flat()).toContain(
      "evidence-usf-256-mutation-fault-injection",
    );
    expect(categoryRow.testReadinessClaimAllowed).toBe(false);
    expect(categoryRow.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
  });

  it("keeps machine and human evidence in sync with expected mutation cases", () => {
    const humanDoc = readFileSync(HUMAN_DOC_PATH, "utf8");
    expect(matrix.ownedPaths).toEqual([
      "tests/packages/mutation-fault-injection-adequacy-gate.test.ts",
      "docs/architecture/mutation-fault-injection-adequacy-gate.json",
      "docs/architecture/mutation-fault-injection-adequacy-gate.md",
    ]);
    expect(matrix.validationCommands).toContain(ISSUE_TEST_COMMAND);
    expect(matrix.validationCommands).toContain("corepack pnpm test-readiness:validate");
    expect(matrix.validationCommands).toContain(
      "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
    );
    expect(existsSync(matrix.sourceAuthorities.expandedCategoryOverclaimPlantedDefect)).toBe(true);
    expect(plantedDefect.expectedRule).toBe("USF-TEST-READINESS-080");
    for (const reference of Object.values(matrix.sourceAuthorities)) {
      expect(existsSync(sourcePath(reference)), reference).toBe(true);
    }

    for (const row of matrix.mutationCases) {
      expect(row.sourceIssueLinks).toContain("USF-256");
      expect(existsSync(sourcePath(row.sourceAuthority)), row.sourceAuthority).toBe(true);
      expect(row.expectedFailure?.id, row.id).toBeTruthy();
      expect(row.expectedFailure?.testFile, row.id).toBeTruthy();
      expect(humanDoc).toContain(row.id);
    }
  });

  it("covers every required weakening domain and Linear mutation input", () => {
    const domains = new Set(matrix.mutationCases.map((row) => row.weakeningDomain));
    for (const domain of REQUIRED_WEAKENING_DOMAINS) {
      expect(domains.has(domain), `missing domain ${domain}`).toBe(true);
      const coverage = matrix.coverageByWeakeningDomain.find((row) => row.domain === domain);
      expect(coverage?.caseIds.length ?? 0, `missing coverage row for ${domain}`).toBeGreaterThan(
        0,
      );
      for (const caseId of coverage?.caseIds ?? []) {
        expect(
          matrix.mutationCases.some((row) => row.id === caseId && row.weakeningDomain === domain),
          `${domain}.${caseId}`,
        ).toBe(true);
      }
    }

    for (const input of [
      "removed tenant filter",
      "weakened role check",
      "accepted malformed token",
      "skipped audit event",
      "fake ready state",
      "missing cleanup",
      "stale seed",
      "disabled redaction",
      "in-memory service-backed substitute",
      "lowered LCOV threshold",
      "removed planted defect",
      "stale command",
      "missing non-claim",
    ]) {
      expect(matrix.scope.requiredLinearMutationInputsCovered).toContain(input);
      expect(matrix.mutationCases.some((row) => row.linearInput === input)).toBe(true);
    }
  });

  it("catches every representative mutation with its expected failure evidence", () => {
    expect(runAdequacyGate(matrix.mutationCases)).toEqual([]);
  });

  it("fails closed when expected-failure evidence is missing", () => {
    const [first, ...rest] = matrix.mutationCases;
    if (first === undefined) {
      throw new Error("mutation matrix must include at least one case");
    }
    const { expectedFailure, ...firstWithoutExpectedFailure } = first;
    expect(expectedFailure).toBeDefined();
    const missingEvidenceCases: MutationCase[] = [firstWithoutExpectedFailure, ...rest];
    expect(runAdequacyGate(missingEvidenceCases)).toContainEqual({
      id: "USF-256-ADEQUACY-EXPECTED-FAILURE-EVIDENCE-MISSING",
      subject: first.id,
    });
  });

  it("fails closed when a mutation passes unexpectedly", () => {
    const [first] = matrix.mutationCases;
    if (first === undefined) {
      throw new Error("mutation matrix must include at least one case");
    }
    expect(
      runAdequacyGate([first], {
        forceNoopMutationIds: new Set([first.id]),
      }),
    ).toContainEqual({
      id: "USF-256-ADEQUACY-UNEXPECTED-MUTATION-PASS",
      subject: first.id,
    });
  });

  it("preserves non-claims and blocks prohibited readiness claims", () => {
    for (const nonClaim of REQUIRED_NON_CLAIMS) {
      expect(matrix.nonClaims).toContain(nonClaim);
    }
    for (const prohibited of REQUIRED_NON_CLAIMS) {
      expect(matrix.allowedClaims).not.toContain(prohibited);
    }
    expect(expandedCategory(manifest).nonClaims).toEqual(
      expect.arrayContaining([
        "test-readiness",
        "final-test-readiness",
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
        "full-product-readiness",
      ]),
    );
  });
});
