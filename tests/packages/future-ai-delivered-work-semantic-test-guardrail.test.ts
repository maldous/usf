import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const GUARDRAIL_PATH = "docs/architecture/future-ai-delivered-work-semantic-test-guardrail.json";
const GUARDRAIL_DOC_PATH = "docs/architecture/future-ai-delivered-work-semantic-test-guardrail.md";
const MANIFEST_PATH = "docs/architecture/semantic-service-test-obligation-manifest.json";
const VALIDATOR_PATH = "tools/validate-test-readiness/validate-test-readiness.py";

const REQUIRED_CHANGE_CLASSES = [
  "semantic-contract",
  "service-catalogue",
  "generated-compose",
  "adapter",
  "capability",
  "api-route",
  "worker-job",
  "provider-binding",
  "validator",
  "command-surface",
  "seeder-fixture",
  "enterprise-evidence",
  "test-suite",
  "planted-defect",
  "coverage-gate",
] as const;

const REQUIRED_WEAKENING_CLASSES = [
  "removed-test",
  "reduced-assertion",
  "in-memory-service-backed-substitute",
  "lowered-coverage-threshold",
  "unapproved-lcov-exclusion",
  "removed-planted-defect",
  "missing-audit-evidence",
  "missing-reset-cleanup",
  "missing-non-claim",
  "generated-compose-authority-inversion",
  "stale-evidence-pass",
] as const;

const REQUIRED_NON_CLAIMS = [
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
  "full-react-product-parity",
  "full-react-parity-readiness",
  "final-usf-234-acceptance",
] as const;

const REQUIRED_RULE_IDS = [
  "USF-TEST-READINESS-102",
  "USF-TEST-READINESS-103",
  "USF-TEST-READINESS-104",
  "USF-TEST-READINESS-105",
  "USF-TEST-READINESS-106",
  "USF-TEST-READINESS-107",
  "USF-TEST-READINESS-108",
] as const;

interface ChangeImpactRow {
  readonly changedFileClass: string;
  readonly pathPatterns: readonly string[];
  readonly obligationFacets: readonly string[];
  readonly requiredUpdates: readonly string[];
  readonly serviceBackedClaimMayUseInMemorySubstitute: boolean;
  readonly diagnosticTemplate: string;
}

interface WeakeningRow {
  readonly weakeningClass: string;
  readonly expectedRuleId: string;
  readonly requiredDiagnostic: string;
  readonly failsClosed: boolean;
}

interface Guardrail {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly dependsOnIssueIds: readonly string[];
  readonly sourceAuthorities: Record<string, string>;
  readonly scope: Record<string, boolean>;
  readonly changeImpactDetector: readonly ChangeImpactRow[];
  readonly coupledUpdatePolicy: Record<string, boolean>;
  readonly weakeningDetectors: readonly WeakeningRow[];
  readonly generatedComposeAuthorityBoundary: Record<string, boolean>;
  readonly failureDiagnostics: Record<string, unknown>;
  readonly developerWorkflow: Record<string, unknown>;
  readonly validatorCoverage: {
    readonly ruleIds: readonly string[];
    readonly selftestCommand: string;
    readonly plantedDefectCount: number;
  };
  readonly plantedDefects: readonly { readonly path: string; readonly expectedRule: string }[];
  readonly enterpriseEvidenceRefs: Record<string, readonly string[]>;
  readonly validationCommands: readonly string[];
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

interface ObligationManifest {
  readonly obligationClasses: readonly { readonly id: string; readonly ownerIssueId: string }[];
  readonly futureAiChangeGuardrail: {
    readonly semanticDefinitionUpdateRequired: boolean;
    readonly testObligationUpdateRequired: boolean;
    readonly fixtureUpdateRequired: boolean;
    readonly coverageUpdateRequired: boolean;
    readonly evidenceUpdateRequired: boolean;
    readonly nonClaimReviewRequired: boolean;
    readonly validatorCommand: string;
    readonly ownerIssueId: string;
  };
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function globToRegExp(pattern: string): RegExp {
  const token = "__GLOBSTAR__";
  const escaped = pattern
    .replace(/\*\*/g, token)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replaceAll(token, ".*");
  return new RegExp(`^${escaped}$`);
}

function detectorsForPath(guardrail: Guardrail, path: string): ChangeImpactRow[] {
  return guardrail.changeImpactDetector.filter((row) =>
    row.pathPatterns.some((pattern) => globToRegExp(pattern).test(path)),
  );
}

function assertContainsAll(actual: readonly string[], expected: readonly string[]) {
  expect(actual).toEqual(expect.arrayContaining([...expected]));
}

const guardrail = readJson<Guardrail>(GUARDRAIL_PATH);
const manifest = readJson<ObligationManifest>(MANIFEST_PATH);
const validatorSource = readFileSync(VALIDATOR_PATH, "utf8");

describe("future AI delivered work semantic test guardrail", () => {
  it("declares USF-252 issue scope, authorities, workflow boundaries, and non-claims", () => {
    expect(existsSync(GUARDRAIL_DOC_PATH)).toBe(true);
    expect(guardrail.issueId).toBe("USF-252");
    expect(guardrail.parentIssueId).toBe("USF-234");
    expect(guardrail.dependsOnIssueIds).toEqual(
      expect.arrayContaining(["USF-239", "USF-247", "USF-259"]),
    );
    expect(guardrail.sourceAuthorities.obligationManifest).toBe(MANIFEST_PATH);
    expect(guardrail.sourceAuthorities.serviceCatalogue).toBe(
      "spec/instances/compose-service/service-catalogue.json",
    );
    expect(guardrail.sourceAuthorities.generatedTestCompose).toBe(
      "compose/compose.test.generated.yaml",
    );
    expect(guardrail.developerWorkflow.requiredPatternSummary).toContain("semantic authority");
    expect(guardrail.allowedClaims).toHaveLength(0);
    expect(guardrail.nonClaims).toEqual(expect.arrayContaining([...REQUIRED_NON_CLAIMS]));
    expect(guardrail.scope.testReadinessClaimAllowed).toBe(false);
    expect(guardrail.scope.finalUsf234AcceptanceClaimAllowed).toBe(false);
    expect(guardrail.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
  });

  it("maps representative changed paths to semantic and test evidence obligations", () => {
    const classIds = guardrail.changeImpactDetector.map((row) => row.changedFileClass);
    expect(classIds).toEqual(expect.arrayContaining([...REQUIRED_CHANGE_CLASSES]));

    const examples: readonly [string, string][] = [
      ["spec/instances/semantic-contract/audit-log.json", "semantic-contract"],
      ["spec/instances/compose-service/service-catalogue.json", "service-catalogue"],
      ["compose/compose.test.generated.yaml", "generated-compose"],
      ["adapters/store/src/index.ts", "adapter"],
      ["capabilities/audit/src/index.ts", "capability"],
      ["apps/api/src/routes/tenant.ts", "api-route"],
      ["apps/work/src/main.ts", "worker-job"],
      ["packages/core/src/index.ts", "provider-binding"],
      ["tools/validate-test-readiness/validate-test-readiness.py", "validator"],
      ["package.json", "command-surface"],
      ["tests/packages/fixtures/service-fixture-corpus.json", "seeder-fixture"],
      [
        "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json",
        "enterprise-evidence",
      ],
      ["tests/packages/core-semantic-boundaries.test.ts", "test-suite"],
      [
        "tools/validate-test-readiness/planted-defects/108-future-ai-overclaim.json",
        "planted-defect",
      ],
      ["docs/architecture/test-coverage-gate.json", "coverage-gate"],
    ];

    for (const [path, expectedClass] of examples) {
      const detectors = detectorsForPath(guardrail, path);
      const detector = detectors.find((row) => row.changedFileClass === expectedClass);
      expect(
        detectors.map((row) => row.changedFileClass),
        path,
      ).toContain(expectedClass);
      expect(detector?.requiredUpdates).toEqual(
        expect.arrayContaining([
          "semantic-authority",
          "test-obligation",
          "evidence",
          "non-claim-review",
        ]),
      );
      expect(detector?.serviceBackedClaimMayUseInMemorySubstitute).toBe(false);
      expect(detector?.diagnosticTemplate).toMatch(/update|requires|trace|keep|preserve|evidence/i);
    }
  });

  it("requires coupled semantic, test, evidence, fixture, coverage, validator, and non-claim updates", () => {
    for (const key of [
      "semanticDefinitionUpdateRequired",
      "testObligationUpdateRequired",
      "fixtureUpdateRequiredWhenServiceOrDataChanges",
      "validatorOrPlantedDefectUpdateRequiredWhenRuleChanges",
      "coverageUpdateRequiredWhenExecutableCodeChanges",
      "enterpriseEvidenceUpdateRequiredWhenRiskOrControlChanges",
      "nonClaimReviewRequiredForEveryReadinessAdjacentChange",
      "samePrRequired",
      "failureOutputMustIdentifyMissingFacet",
    ]) {
      expect(guardrail.coupledUpdatePolicy[key], key).toBe(true);
    }
  });

  it("fails closed for weakened tests, evidence, generated Compose authority inversion, and readiness overclaim", () => {
    const weakeningIds = guardrail.weakeningDetectors.map((row) => row.weakeningClass);
    expect(weakeningIds).toEqual(expect.arrayContaining([...REQUIRED_WEAKENING_CLASSES]));
    for (const row of guardrail.weakeningDetectors) {
      expect(row.expectedRuleId).toMatch(/^USF-TEST-READINESS-/);
      expect(row.requiredDiagnostic).not.toHaveLength(0);
      expect(row.failsClosed).toBe(true);
    }

    expect(guardrail.generatedComposeAuthorityBoundary.generatedComposeIsAuthority).toBe(false);
    expect(guardrail.generatedComposeAuthorityBoundary.serviceCatalogueUpdateRequired).toBe(true);
    expect(guardrail.generatedComposeAuthorityBoundary.semanticObligationUpdateRequired).toBe(true);
    expect(guardrail.generatedComposeAuthorityBoundary.integrationMatrixUpdateRequired).toBe(true);
    expect(guardrail.generatedComposeAuthorityBoundary.fixtureUpdateRequired).toBe(true);
    expect(guardrail.generatedComposeAuthorityBoundary.directGeneratedEditAllowed).toBe(false);
    expect(
      guardrail.generatedComposeAuthorityBoundary.generatedOnlyChangeMaySatisfyTestReadiness,
    ).toBe(false);
  });

  it("links the repository obligation manifest to USF-252 without upgrading final acceptance", () => {
    expect(
      manifest.obligationClasses.some(
        (row) => row.id === "future-ai-guardrail" && row.ownerIssueId === "USF-252",
      ),
    ).toBe(true);
    expect(manifest.futureAiChangeGuardrail.ownerIssueId).toBe("USF-252");
    expect(manifest.futureAiChangeGuardrail.semanticDefinitionUpdateRequired).toBe(true);
    expect(manifest.futureAiChangeGuardrail.testObligationUpdateRequired).toBe(true);
    expect(manifest.futureAiChangeGuardrail.evidenceUpdateRequired).toBe(true);
    expect(manifest.futureAiChangeGuardrail.nonClaimReviewRequired).toBe(true);
    expect(manifest.testReadinessClaimAllowed).toBe(false);
    expect(manifest.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
  });

  it("provides validator rules, planted defects, and actionable diagnostics", () => {
    assertContainsAll(guardrail.validatorCoverage.ruleIds, REQUIRED_RULE_IDS);
    expect(guardrail.validatorCoverage.selftestCommand).toBe(
      "python3 tools/validate-test-readiness/validate-test-readiness.py selftest --json",
    );
    expect(guardrail.validatorCoverage.plantedDefectCount).toBe(guardrail.plantedDefects.length);
    for (const ruleId of REQUIRED_RULE_IDS) {
      expect(validatorSource).toContain(`"${ruleId}"`);
      expect(guardrail.plantedDefects.some((row) => row.expectedRule === ruleId)).toBe(true);
    }
    for (const defect of guardrail.plantedDefects) {
      expect(existsSync(defect.path), defect.path).toBe(true);
      const defectJson = readJson<{ expectedRule: string }>(defect.path);
      expect(defectJson.expectedRule).toBe(defect.expectedRule);
    }
    for (const key of [
      "changedPath",
      "changedFileClass",
      "missingFacet",
      "requiredFix",
      "serviceOrCapability",
      "ownerIssueId",
    ]) {
      expect(guardrail.failureDiagnostics[key], key).toBe(true);
    }
    expect(guardrail.failureDiagnostics.exampleMessages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("semantic contract"),
        expect.stringContaining("service catalogue"),
        expect.stringContaining("planted defect"),
      ]),
    );
  });
});
