import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SUITE_PATH = "docs/architecture/adversarial-formal-semantic-testing-suite.json";
const HUMAN_DOC_PATH = "docs/architecture/adversarial-formal-semantic-testing-suite.md";
const CASE_CORPUS_PATH = "tests/packages/adversarial/adversarial-semantic-cases.json";
const REQUIRED_TEST_COMMAND =
  "corepack pnpm test -- tests/packages/adversarial-formal-semantic-testing-suite.test.ts";
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
const REQUIRED_NON_CLAIMS = [
  "formal-verification",
  "mathematical-proof",
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
  "full-react-parity-readiness",
  "final-usf-234-acceptance",
] as const;
const ENTERPRISE_REF_SECTIONS = [
  "soaSupportMappings",
  "evidenceRegister",
  "threatModelAbuseCaseRegister",
  "accessReviewPrivilegedOperationPosture",
  "backupRestoreResiliencePosture",
  "incidentVulnerabilityManagementEvidence",
  "privacyDataMinimisationPosture",
] as const;

interface AdversarialCase {
  readonly id: string;
  readonly adversarialClass: string;
  readonly inputSurface: string;
  readonly mutation: string;
  readonly expectedFailureId: string;
}

interface Suite {
  readonly id: string;
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly dependsOnIssueIds: readonly string[];
  readonly sourceAuthorities: Record<string, string>;
  readonly inputGaps: readonly { readonly path: string; readonly fallbackAuthority: string }[];
  readonly ownedPaths: readonly string[];
  readonly issueOwnership: {
    readonly obligationClassId: string;
    readonly ownerIssueId: string;
    readonly blockingIssues: readonly string[];
  };
  readonly scope: {
    readonly testMode: string;
    readonly deterministicLocalOnly: boolean;
    readonly serviceBackedExecution: boolean;
    readonly sourceFilesEditedAtRuntime: boolean;
    readonly sharedValidatorIntegrationRequired: boolean;
    readonly manifestMutationRequired: boolean;
    readonly enterpriseEvidenceMutationRequired: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly formalVerificationClaimAllowed: boolean;
    readonly mathematicalProofClaimAllowed: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly requiredAdversarialClasses: readonly string[];
  };
  readonly gateSemantics: Record<string, boolean>;
  readonly validationCommands: readonly string[];
  readonly adversarialCases: readonly AdversarialCase[];
  readonly coverageByAdversarialClass: readonly {
    readonly adversarialClass: string;
    readonly caseIds: readonly string[];
  }[];
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

interface CaseCorpus {
  readonly id: string;
  readonly issueId: string;
  readonly sourceSuite: string;
  readonly caseIds: readonly string[];
  readonly expectedFailureIds: readonly string[];
  readonly metamorphicChecks: readonly string[];
  readonly nonClaims: readonly string[];
}

interface SemanticContractObligation {
  readonly contractId: string;
  readonly path: string;
  readonly title: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly facetKeys: readonly string[];
  readonly obligationClassIds: readonly string[];
  readonly ownerIssueIds: readonly string[];
  readonly testMappingRequired: boolean;
}

interface ServiceObligation {
  readonly serviceId: string;
  readonly composeServiceId: string;
  readonly requiredInTest: boolean;
  readonly generatedInTestCompose: boolean;
  readonly dependencyDisposition: string;
  readonly realisationMode: string;
  readonly composeTarget: string;
  readonly obligationClassIds: readonly string[];
  readonly ownerIssueIds: readonly string[];
  readonly inMemoryServiceSubstituteAllowed: boolean;
}

interface ExpandedCategory {
  readonly categoryId: string;
  readonly issueId: string;
  readonly categoryClassId: string;
  readonly dependsOnIssueIds: readonly string[];
  readonly requiredCommandIds: readonly string[];
  readonly validationCommands: readonly string[];
  readonly generatedArtifactScope: readonly string[];
  readonly futureAiGuardrailScope: readonly string[];
  readonly enterpriseEvidenceRefs: Record<string, readonly string[]>;
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly nonClaims: readonly string[];
}

interface ObligationManifest {
  readonly obligationClasses: readonly { readonly id: string; readonly ownerIssueId: string }[];
  readonly semanticContractObligations: readonly SemanticContractObligation[];
  readonly serviceObligations: readonly ServiceObligation[];
  readonly expandedCategoryObligations: readonly ExpandedCategory[];
  readonly futureAiChangeGuardrail: Record<string, boolean | string>;
  readonly nonClaims: readonly string[];
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
}

interface SemanticContractFile {
  readonly id: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly facets: Record<
    string,
    {
      status: string;
      sourceRefs?: readonly string[];
      description?: string;
    }
  >;
  readonly sourceRefs?: readonly string[];
  readonly adrRefs?: readonly string[];
}

interface IntegrationMatrix {
  readonly authorityBoundary: string;
  readonly composeTarget: string;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly serviceIntegrationRows: readonly {
    readonly serviceId: string;
    readonly composeTarget: string;
    readonly serviceBackedClaimRequiresComposedService: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly nonClaims: readonly string[];
  }[];
  readonly nonClaims: readonly string[];
}

interface DesignSuite {
  readonly generatedComposeAuthorityBoundary: string;
  readonly serviceBackedClaimRequiresComposedService: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly requiredNonClaims: readonly string[];
}

interface EnterpriseModel {
  readonly [key: string]: unknown;
}

interface FutureAiChange {
  semanticDefinitionUpdated: boolean;
  testObligationUpdated: boolean;
  fixtureUpdated: boolean;
  coverageUpdated: boolean;
  evidenceUpdated: boolean;
  nonClaimReviewed: boolean;
  implementationCodeChanged: boolean;
  deferredMarkedComplete: boolean;
  proofEvidencePresent: boolean;
  validatorBacked: boolean;
}

interface SourceState {
  semanticContract: {
    contractId: string;
    behaviouralFingerprint: string;
    facetKeys: string[];
    facets: Record<string, { status: string; sourceRefs: string[] }>;
    impossibleReadinessAccepted: boolean;
    canonicalEquivalenceId?: string;
  };
  semanticAliases: {
    contractId: string;
    behaviouralFingerprint: string;
    canonicalEquivalenceId?: string;
  }[];
  serviceObligations: {
    serviceId: string;
    composeServiceId: string;
    ownerIssueIds: string[];
    requiredInTest: boolean;
    serviceBackedClaimRequiresComposedService: boolean;
    inMemoryServiceSubstituteAllowed: boolean;
  }[];
  generatedComposeAuthorityRole: "derivative" | "semantic-authority";
  evidence: {
    freshness: "current" | "stale" | "unknown";
    reportStatus: "pass" | "fail" | "unknown";
    passAccepted: boolean;
  };
  providerBoundary: {
    providerMode: "local-composed-real-service" | "hermetic-mock" | "in-memory";
    liveProviderClaimAllowed: boolean;
    serviceBackedClaimRequiresComposedService: boolean;
    inMemoryServiceSubstituteAllowed: boolean;
  };
  futureAiChange: FutureAiChange;
  nonClaims: string[];
  allowedClaims: string[];
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

function sourceAuthority(key: keyof Suite["sourceAuthorities"]): string {
  const value = suite.sourceAuthorities[key];
  if (value === undefined) {
    throw new Error(`missing source authority: ${String(key)}`);
  }
  return value;
}

function requiredFacet(
  state: SourceState,
  facetName: "lifecycle" | "readinessModel",
): SourceState["semanticContract"]["facets"][string] {
  const facet = state.semanticContract.facets[facetName];
  if (facet === undefined) {
    throw new Error(`missing required facet: ${facetName}`);
  }
  return facet;
}

function firstServiceObligation(state: SourceState): SourceState["serviceObligations"][number] {
  const row = state.serviceObligations[0];
  if (row === undefined) {
    throw new Error("service obligation fixture is missing");
  }
  return row;
}

function expandedCategory(manifest: ObligationManifest): ExpandedCategory {
  const row = manifest.expandedCategoryObligations.find((item) => item.issueId === "USF-257");
  if (row === undefined) {
    throw new Error("USF-257 expanded category row is missing");
  }
  return row;
}

function representativeSemanticContract(manifest: ObligationManifest): {
  row: SemanticContractObligation;
  contract: SemanticContractFile;
} {
  const row = manifest.semanticContractObligations.find((item) =>
    REQUIRED_FACETS.every((facet) => item.facetKeys.includes(facet)),
  );
  if (row === undefined) {
    throw new Error("representative semantic obligation with all required facets is missing");
  }
  return {
    row,
    contract: readJson<SemanticContractFile>(row.path),
  };
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

function fingerprint(row: SemanticContractObligation): string {
  return [
    row.capability,
    row.capabilityDomain,
    ...[...row.facetKeys].sort(),
    row.testMappingRequired ? "test-mapped" : "test-missing",
  ].join("|");
}

const suite = readJson<Suite>(SUITE_PATH);
const caseCorpus = readJson<CaseCorpus>(CASE_CORPUS_PATH);
const manifest = readJson<ObligationManifest>(sourceAuthority("obligationManifest"));
const designSuite = readJson<DesignSuite>(sourceAuthority("designContractComposeDriftSuite"));
const integrationMatrix = readJson<IntegrationMatrix>(
  sourceAuthority("composedServiceIntegrationMatrix"),
);
const enterpriseModel = readJson<EnterpriseModel>(sourceAuthority("enterpriseEvidenceModel"));

function buildSourceState(): SourceState {
  const { contract, row } = representativeSemanticContract(manifest);
  const facets = Object.fromEntries(
    Object.entries(contract.facets).map(([key, value]) => [
      key,
      {
        status: value.status,
        sourceRefs: [...(value.sourceRefs ?? [])],
      },
    ]),
  );
  const serviceRows = manifest.serviceObligations
    .filter((item) => item.requiredInTest)
    .slice(0, 6)
    .map((item) => ({
      serviceId: item.serviceId,
      composeServiceId: item.composeServiceId,
      ownerIssueIds: [...item.ownerIssueIds],
      requiredInTest: item.requiredInTest,
      serviceBackedClaimRequiresComposedService: true,
      inMemoryServiceSubstituteAllowed: item.inMemoryServiceSubstituteAllowed,
    }));

  return {
    semanticContract: {
      contractId: row.contractId,
      behaviouralFingerprint: fingerprint(row),
      facetKeys: [...row.facetKeys],
      facets,
      impossibleReadinessAccepted: false,
      canonicalEquivalenceId: row.contractId,
    },
    semanticAliases: [],
    serviceObligations: serviceRows,
    generatedComposeAuthorityRole: "derivative",
    evidence: {
      freshness: "current",
      reportStatus: "pass",
      passAccepted: true,
    },
    providerBoundary: {
      providerMode: "local-composed-real-service",
      liveProviderClaimAllowed: false,
      serviceBackedClaimRequiresComposedService: true,
      inMemoryServiceSubstituteAllowed: false,
    },
    futureAiChange: {
      semanticDefinitionUpdated: true,
      testObligationUpdated: true,
      fixtureUpdated: true,
      coverageUpdated: true,
      evidenceUpdated: true,
      nonClaimReviewed: true,
      implementationCodeChanged: false,
      deferredMarkedComplete: false,
      proofEvidencePresent: true,
      validatorBacked: true,
    },
    nonClaims: [...suite.nonClaims],
    allowedClaims: [...suite.allowedClaims],
  };
}

function applyAdversarialCase(state: SourceState, caseId: string): void {
  switch (caseId) {
    case "semantic-facet-contradiction":
      state.semanticContract.impossibleReadinessAccepted = true;
      requiredFacet(state, "readinessModel").status = "complete";
      return;
    case "complete-facet-without-authority-link":
      requiredFacet(state, "lifecycle").status = "complete";
      requiredFacet(state, "lifecycle").sourceRefs = [];
      return;
    case "duplicate-service-id-conflicting-owner": {
      const [row] = state.serviceObligations;
      if (row === undefined) {
        throw new Error("service obligation fixture is missing");
      }
      state.serviceObligations.push({
        ...clone(row),
        composeServiceId: `${row.composeServiceId}-shadow`,
        ownerIssueIds: ["USF-257"],
      });
      return;
    }
    case "same-name-changed-behaviour":
      state.semanticContract.behaviouralFingerprint = `${state.semanticContract.behaviouralFingerprint}|changed-behaviour`;
      return;
    case "same-behaviour-different-name":
      state.semanticAliases.push({
        contractId: `${state.semanticContract.contractId}.shadow`,
        behaviouralFingerprint: state.semanticContract.behaviouralFingerprint,
      });
      return;
    case "generated-compose-treated-as-authority":
      state.generatedComposeAuthorityRole = "semantic-authority";
      return;
    case "stale-evidence-pass-accepted":
      state.evidence.freshness = "stale";
      state.evidence.reportStatus = "pass";
      state.evidence.passAccepted = true;
      return;
    case "in-memory-service-substitute-overclaim":
      state.providerBoundary.providerMode = "in-memory";
      state.providerBoundary.inMemoryServiceSubstituteAllowed = true;
      state.providerBoundary.liveProviderClaimAllowed = true;
      firstServiceObligation(state).inMemoryServiceSubstituteAllowed = true;
      return;
    case "future-ai-code-without-semantic-update":
      state.futureAiChange.implementationCodeChanged = true;
      state.futureAiChange.semanticDefinitionUpdated = false;
      state.futureAiChange.testObligationUpdated = false;
      state.futureAiChange.evidenceUpdated = false;
      state.futureAiChange.nonClaimReviewed = false;
      return;
    case "future-ai-semantic-without-test-evidence":
      state.futureAiChange.semanticDefinitionUpdated = true;
      state.futureAiChange.testObligationUpdated = false;
      state.futureAiChange.fixtureUpdated = false;
      state.futureAiChange.evidenceUpdated = false;
      state.futureAiChange.validatorBacked = false;
      return;
    case "deferred-work-marked-complete-without-proof":
      state.futureAiChange.deferredMarkedComplete = true;
      state.futureAiChange.proofEvidencePresent = false;
      state.futureAiChange.validatorBacked = false;
      return;
    case "non-claim-removed":
      state.nonClaims = state.nonClaims.filter((claim) => claim !== "final-test-readiness");
      return;
    default:
      throw new Error(`unhandled adversarial case: ${caseId}`);
  }
}

function evaluateState(state: SourceState): Finding[] {
  const findings: Finding[] = [];
  const add = (id: string, subject: string): void => {
    findings.push({ id, subject });
  };

  if (
    state.semanticContract.impossibleReadinessAccepted &&
    requiredFacet(state, "readinessModel").status === "complete"
  ) {
    add("USF-257-ADVERSARIAL-CONTRADICTION", state.semanticContract.contractId);
  }

  for (const [facetName, facet] of Object.entries(state.semanticContract.facets)) {
    if (facet.status === "complete" && facet.sourceRefs.length === 0) {
      add("USF-257-ADVERSARIAL-MISSING-AUTHORITY", facetName);
    }
  }

  const serviceIds = new Map<string, string>();
  for (const row of state.serviceObligations) {
    const existing = serviceIds.get(row.serviceId);
    if (existing !== undefined && existing !== row.composeServiceId) {
      add("USF-257-ADVERSARIAL-AMBIGUOUS-SERVICE", row.serviceId);
    }
    serviceIds.set(row.serviceId, row.composeServiceId);
    if (row.serviceBackedClaimRequiresComposedService && row.inMemoryServiceSubstituteAllowed) {
      add("USF-257-ADVERSARIAL-IN-MEMORY-SUBSTITUTE", row.serviceId);
    }
  }

  const baselineFingerprint = fingerprint(representativeSemanticContract(manifest).row);
  if (
    state.semanticContract.contractId === representativeSemanticContract(manifest).row.contractId &&
    state.semanticContract.behaviouralFingerprint !== baselineFingerprint
  ) {
    add("USF-257-ADVERSARIAL-UNSAFE-EQUIVALENCE", state.semanticContract.contractId);
  }

  for (const alias of state.semanticAliases) {
    if (
      alias.behaviouralFingerprint === state.semanticContract.behaviouralFingerprint &&
      alias.canonicalEquivalenceId === undefined
    ) {
      add("USF-257-ADVERSARIAL-AMBIGUOUS-EQUIVALENCE", alias.contractId);
    }
  }

  if (state.generatedComposeAuthorityRole !== "derivative") {
    add("USF-257-ADVERSARIAL-GENERATED-AUTHORITY-INVERSION", "generatedComposeAuthorityRole");
  }

  if (
    (state.evidence.freshness === "stale" || state.evidence.freshness === "unknown") &&
    state.evidence.reportStatus === "pass" &&
    state.evidence.passAccepted
  ) {
    add("USF-257-ADVERSARIAL-STALE-EVIDENCE-PASS", "evidence.freshness");
  }

  if (
    state.providerBoundary.liveProviderClaimAllowed &&
    (state.providerBoundary.providerMode === "in-memory" ||
      state.providerBoundary.providerMode === "hermetic-mock")
  ) {
    add("USF-257-ADVERSARIAL-IN-MEMORY-SUBSTITUTE", "providerBoundary.providerMode");
  }

  const futureAi = state.futureAiChange;
  if (
    (futureAi.implementationCodeChanged && !futureAi.semanticDefinitionUpdated) ||
    !futureAi.testObligationUpdated ||
    !futureAi.fixtureUpdated ||
    !futureAi.coverageUpdated ||
    !futureAi.evidenceUpdated ||
    !futureAi.nonClaimReviewed ||
    (futureAi.deferredMarkedComplete &&
      (!futureAi.proofEvidencePresent || !futureAi.validatorBacked))
  ) {
    add("USF-257-ADVERSARIAL-FUTURE-AI-DRIFT", "futureAiChange");
  }

  for (const claim of REQUIRED_NON_CLAIMS) {
    if (!state.nonClaims.includes(claim)) {
      add("USF-257-ADVERSARIAL-NON-CLAIM-REMOVED", claim);
    }
  }
  if (state.allowedClaims.some((claim) => REQUIRED_NON_CLAIMS.includes(claim as never))) {
    add("USF-257-ADVERSARIAL-NON-CLAIM-REMOVED", "allowedClaims");
  }

  return findings;
}

function expectedIds(findings: readonly Finding[]): Set<string> {
  return new Set(findings.map((finding) => finding.id));
}

describe("adversarial formal semantic testing suite", () => {
  it("is issue-scoped, deterministic, and preserves non-claims", () => {
    expect(suite.id).toBe("adversarial-formal-semantic-testing-suite");
    expect(suite.issueId).toBe("USF-257");
    expect(suite.parentIssueId).toBe("USF-234");
    expect(suite.dependsOnIssueIds).toEqual(["USF-259", "USF-252"]);
    expect(suite.issueOwnership).toMatchObject({
      obligationClassId: "adversarial-semantic-testing",
      ownerIssueId: "USF-257",
    });
    expect(suite.issueOwnership.blockingIssues).toEqual(["USF-247", "USF-260", "USF-234"]);
    expect(suite.scope).toMatchObject({
      testMode: "copy-source-authority-data-in-test-memory-only",
      deterministicLocalOnly: true,
      serviceBackedExecution: false,
      sourceFilesEditedAtRuntime: false,
      sharedValidatorIntegrationRequired: false,
      manifestMutationRequired: false,
      enterpriseEvidenceMutationRequired: false,
      testReadinessClaimAllowed: false,
      formalVerificationClaimAllowed: false,
      mathematicalProofClaimAllowed: false,
      inMemoryServiceSubstituteAllowedForServiceBackedClaims: false,
    });
    expect(suite.validationCommands).toContain(REQUIRED_TEST_COMMAND);
    expect(suite.validationCommands).toContain("corepack pnpm test-readiness:validate");
    expect(suite.validationCommands).toContain(
      "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
    );
    for (const claim of REQUIRED_NON_CLAIMS) {
      expect(suite.nonClaims, claim).toContain(claim);
      expect(caseCorpus.nonClaims, claim).toContain(claim);
    }
  });

  it("keeps source authority references bounded to readable current artifacts", () => {
    for (const reference of Object.values(suite.sourceAuthorities)) {
      expect(existsSync(sourcePath(reference)), reference).toBe(true);
    }
    expect(suite.inputGaps).toEqual([
      {
        path: "docs/architecture/future-ai-delivered-work-semantic-test-guardrail.json",
        status: "missing-on-origin-main",
        fallbackAuthority:
          "docs/architecture/semantic-service-test-obligation-manifest.json#futureAiChangeGuardrail",
        blocker: false,
        rationale:
          "The required future-AI guardrail flags are present in the obligation manifest. This suite records the missing standalone input and avoids editing the manifest or validator.",
      },
    ]);
    const [inputGap] = suite.inputGaps;
    if (inputGap === undefined) {
      throw new Error("expected one recorded input gap");
    }
    expect(existsSync(inputGap.path)).toBe(false);
    expect(existsSync(sourcePath(inputGap.fallbackAuthority))).toBe(true);
  });

  it("aligns with the USF-257 manifest row without mutating shared authorities", () => {
    const classRow = manifest.obligationClasses.find(
      (row) => row.id === "adversarial-semantic-testing",
    );
    const category = expandedCategory(manifest);
    expect(classRow?.ownerIssueId).toBe("USF-257");
    expect(category.categoryId).toBe("adversarial-semantic-testing");
    expect(category.categoryClassId).toBe("adversarial-semantic-testing");
    expect(category.requiredCommandIds).toEqual(["test-readiness-adversarial-semantic-testing"]);
    expect(category.validationCommands).toContain(REQUIRED_TEST_COMMAND);
    expect(category.testReadinessClaimAllowed).toBe(false);
    expect(category.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(category.futureAiGuardrailScope).toContain(
      "docs/architecture/semantic-service-test-obligation-manifest.json#futureAiChangeGuardrail",
    );
    expect(manifest.futureAiChangeGuardrail).toMatchObject({
      semanticDefinitionUpdateRequired: true,
      testObligationUpdateRequired: true,
      fixtureUpdateRequired: true,
      coverageUpdateRequired: true,
      evidenceUpdateRequired: true,
      nonClaimReviewRequired: true,
      ownerIssueId: "USF-252",
    });
    for (const claim of REQUIRED_NON_CLAIMS.filter(
      (claim) =>
        claim !== "formal-verification" &&
        claim !== "mathematical-proof" &&
        claim !== "final-usf-234-acceptance",
    )) {
      expect(category.nonClaims, claim).toContain(claim);
    }
  });

  it("confirms enterprise evidence row ids already exist without editing the enterprise model", () => {
    const category = expandedCategory(manifest);
    for (const section of ENTERPRISE_REF_SECTIONS) {
      const ids = enterpriseSectionIds(enterpriseModel, section);
      for (const ref of category.enterpriseEvidenceRefs[section] ?? []) {
        expect(ids.has(ref), `${section}.${ref}`).toBe(true);
      }
    }
  });

  it("keeps machine, human, and fixture case inventories synchronized", () => {
    const humanDoc = readFileSync(HUMAN_DOC_PATH, "utf8");
    expect(caseCorpus.sourceSuite).toBe(SUITE_PATH);
    expect(caseCorpus.caseIds).toEqual(suite.adversarialCases.map((row) => row.id));
    expect(new Set(caseCorpus.expectedFailureIds)).toEqual(
      new Set(suite.adversarialCases.map((row) => row.expectedFailureId)),
    );
    for (const path of suite.ownedPaths) {
      expect(existsSync(path), path).toBe(true);
    }
    for (const row of suite.adversarialCases) {
      expect(humanDoc).toContain(row.id);
      expect(row.expectedFailureId.startsWith("USF-257-ADVERSARIAL-")).toBe(true);
    }
  });

  it("covers every required adversarial class", () => {
    const casesByClass = new Map<string, string[]>();
    for (const row of suite.adversarialCases) {
      casesByClass.set(row.adversarialClass, [
        ...(casesByClass.get(row.adversarialClass) ?? []),
        row.id,
      ]);
    }
    for (const adversarialClass of suite.scope.requiredAdversarialClasses) {
      expect(casesByClass.get(adversarialClass)?.length ?? 0, adversarialClass).toBeGreaterThan(0);
      const coverage = suite.coverageByAdversarialClass.find(
        (row) => row.adversarialClass === adversarialClass,
      );
      expect(coverage?.caseIds.length ?? 0, adversarialClass).toBeGreaterThan(0);
      for (const caseId of coverage?.caseIds ?? []) {
        expect(suite.adversarialCases.some((row) => row.id === caseId)).toBe(true);
      }
    }
  });

  it("passes on the unmutated copied authority state", () => {
    expect(evaluateState(buildSourceState())).toEqual([]);
    expect(designSuite.generatedComposeAuthorityBoundary).toContain("never as semantic authority");
    expect(designSuite.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(integrationMatrix.authorityBoundary).toContain("Generated Compose is derivative");
    expect(integrationMatrix.testReadinessClaimAllowed).toBe(false);
    expect(integrationMatrix.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
  });

  it("detects each adversarial mutation with its expected failure id", () => {
    for (const row of suite.adversarialCases) {
      const mutated = buildSourceState();
      applyAdversarialCase(mutated, row.id);
      expect(expectedIds(evaluateState(mutated)).has(row.expectedFailureId), row.id).toBe(true);
    }
  });

  it("fails the gate when a listed adversarial mutation unexpectedly passes", () => {
    const row = suite.adversarialCases[0];
    if (row === undefined) {
      throw new Error("expected at least one adversarial case");
    }
    const unmutated = buildSourceState();
    expect(expectedIds(evaluateState(unmutated)).has(row.expectedFailureId)).toBe(false);
  });

  it("keeps equivalent input ordering metamorphic and rejects changed semantics", () => {
    const baseline = buildSourceState();
    const reordered = clone(baseline);
    reordered.serviceObligations = [...reordered.serviceObligations].reverse();
    expect(evaluateState(reordered)).toEqual(evaluateState(baseline));

    const changed = buildSourceState();
    applyAdversarialCase(changed, "same-name-changed-behaviour");
    expect(expectedIds(evaluateState(changed))).toContain("USF-257-ADVERSARIAL-UNSAFE-EQUIVALENCE");
  });

  it("rejects impossible states and missing non-claims fail closed", () => {
    const impossible = buildSourceState();
    applyAdversarialCase(impossible, "semantic-facet-contradiction");
    expect(expectedIds(evaluateState(impossible))).toContain("USF-257-ADVERSARIAL-CONTRADICTION");

    const missingNonClaim = buildSourceState();
    applyAdversarialCase(missingNonClaim, "non-claim-removed");
    expect(expectedIds(evaluateState(missingNonClaim))).toContain(
      "USF-257-ADVERSARIAL-NON-CLAIM-REMOVED",
    );
  });
});
