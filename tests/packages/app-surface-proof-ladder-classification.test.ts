import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

type AuthorityInput = {
  path: string;
  role: string;
};

type ComposeClassification = {
  ownerIssueId: "USF-1033";
  lifecycleState: "compose-proof-not-required-classified";
  authorityInputs: AuthorityInput[];
  composeClassification: Record<string, boolean | string>;
  implementedSurfaceClassifications: Array<{
    surfaceId: string;
    providerSemanticsCrossed: boolean;
    proofDisposition: string;
  }>;
  conditionalCriteriaDisposition: Record<string, boolean | string>;
  validationGuard: Record<string, boolean>;
  externalBoundary: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

type StagingClassification = {
  ownerIssueId: "USF-1034";
  lifecycleState: "staging-proof-not-required-classified";
  authorityInputs: AuthorityInput[];
  stagingClassification: Record<string, boolean | string>;
  classificationEvaluations: Array<{
    criterion: string;
    requiresStaging: boolean;
    reason: string;
  }>;
  validationGuard: Record<string, boolean>;
  externalBoundary: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;
}

function expectAuthorityInputsToExist(inputs: AuthorityInput[]): void {
  expect(inputs.length).toBeGreaterThan(0);
  for (const input of inputs) {
    expect(existsSync(join(repoRoot, input.path)), input.path).toBe(true);
    expect(input.role.length).toBeGreaterThan(0);
  }
}

const composeClassification = readJson<ComposeClassification>(
  "docs/architecture/app-surface-compose-proof-classification.json",
);
const stagingClassification = readJson<StagingClassification>(
  "docs/architecture/app-surface-staging-proof-classification.json",
);
const composeClassificationPath = join(repoRoot, "docs/architecture/app-surface-compose-proof-classification.json");
const stagingClassificationPath = join(repoRoot, "docs/architecture/app-surface-staging-proof-classification.json");

describe("app-surface proof ladder classification", () => {
  it("classifies Compose proof as not required for the bounded local app surface", () => {
    expect(composeClassification.ownerIssueId).toBe("USF-1033");
    expect(composeClassification.lifecycleState).toBe("compose-proof-not-required-classified");
    expectAuthorityInputsToExist(composeClassification.authorityInputs);

    expect(composeClassification.composeClassification).toMatchObject({
      classification: "not-required",
      composeRequired: false,
      providerSemanticsCrossed: false,
      providerSemanticsRequireCompose: false,
      inMemoryProofSufficient: true,
      composeProofRun: false,
      existingComposeProfilesChanged: false,
      stagingImplicationCreated: false,
      caddyPublicProofRoutingChanged: false,
      caddyPort443Altered: false,
      testcontainersAdopted: false,
      remoteCacheAdopted: false,
      taskGraphToolingAdopted: false,
    });
    expect(composeClassification.implementedSurfaceClassifications.length).toBeGreaterThan(0);
    expect(
      composeClassification.implementedSurfaceClassifications.every(
        (surface) => surface.providerSemanticsCrossed === false && surface.proofDisposition.length > 0,
      ),
    ).toBe(true);
    expect(composeClassification.conditionalCriteriaDisposition).toMatchObject({
      composeProofDoesNotImplyStagingProof: true,
      caddyPublicProofRoutingOnPort443NotAltered: true,
    });
  });

  it("classifies staging proof as not required without public or deployment-adjacent triggers", () => {
    expect(stagingClassification.ownerIssueId).toBe("USF-1034");
    expect(stagingClassification.lifecycleState).toBe("staging-proof-not-required-classified");
    expectAuthorityInputsToExist(stagingClassification.authorityInputs);

    expect(stagingClassification.stagingClassification).toMatchObject({
      classification: "not-required",
      stagingRequired: false,
      stagingProofRun: false,
      separateStagingProofIssueRequired: false,
      separateStagingProofIssueCreated: false,
      publicExposureImplemented: false,
      deploymentAdjacentSurfaceImplemented: false,
      providerStagingRelevantSurfaceImplemented: false,
      humanAcceptanceRelevantSurfaceImplemented: false,
      deploymentPerformed: false,
      providerSetupCreated: false,
      publicProofRoutingChanged: false,
      productionReadinessClaimed: false,
    });
    expect(new Set(stagingClassification.classificationEvaluations.map((item) => item.criterion))).toEqual(
      new Set(["public-exposure", "deployment-adjacency", "provider-staging-relevance", "human-acceptance-relevance"]),
    );
    expect(stagingClassification.classificationEvaluations.every((item) => item.requiresStaging === false)).toBe(true);
    expect(stagingClassification.classificationEvaluations.every((item) => item.reason.length > 0)).toBe(true);
  });

  it("preserves local-only boundaries and false non-claims", () => {
    for (const record of [composeClassification, stagingClassification]) {
      expect(Object.values(record.validationGuard).every((value) => value === true)).toBe(true);
      expect(Object.values(record.externalBoundary).every((value) => value === false)).toBe(true);
      expect(Object.values(record.nonClaims).every((value) => value === false)).toBe(true);
    }
  });

  it("fails closed when proof-ladder classification authority inputs are empty", () => {
    const originalCompose = readFileSync(composeClassificationPath, "utf8");
    const originalStaging = readFileSync(stagingClassificationPath, "utf8");
    try {
      writeFileSync(
        composeClassificationPath,
        JSON.stringify({ ...JSON.parse(originalCompose), authorityInputs: [] }, null, 2) + "\n",
      );
      writeFileSync(
        stagingClassificationPath,
        JSON.stringify({ ...JSON.parse(originalStaging), authorityInputs: [] }, null, 2) + "\n",
      );
      const result = spawnSync("python3", ["tools/validate-app-surface/validate-app-surface.py", "all", "--json"], {
        cwd: repoRoot,
        encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
      const validation = JSON.parse(result.stdout) as {
        status: string;
        findings: Array<{ ruleId: string; message: string }>;
      };
      expect(validation.status).toBe("fail");
      expect(validation.findings.some((finding) => finding.ruleId === "USF-APP-SURFACE-IMPLEMENTATION-014")).toBe(
        true,
      );
      expect(validation.findings.some((finding) => finding.ruleId === "USF-APP-SURFACE-IMPLEMENTATION-015")).toBe(
        true,
      );
      expect(validation.findings.every((finding) => finding.message === "authorityInputs must be a non-empty array"))
        .toBe(true);
    } finally {
      writeFileSync(composeClassificationPath, originalCompose);
      writeFileSync(stagingClassificationPath, originalStaging);
    }
  });
});
