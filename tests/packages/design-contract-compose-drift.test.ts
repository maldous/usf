import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface ObligationClass {
  readonly id: string;
  readonly ownerIssueId: string;
}

interface SemanticContractObligation {
  readonly contractId: string;
  readonly path: string;
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
  readonly composeTarget: string;
  readonly composeProfiles: readonly string[];
  readonly obligationClassIds: readonly string[];
  readonly ownerIssueIds: readonly string[];
  readonly validationCommands: readonly string[];
  readonly inMemoryServiceSubstituteAllowed: boolean;
}

interface ObligationManifest {
  readonly testComposeTarget: string;
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly obligationClasses: readonly ObligationClass[];
  readonly semanticContractObligations: readonly SemanticContractObligation[];
  readonly serviceObligations: readonly ServiceObligation[];
  readonly nonClaims: readonly string[];
}

interface ServiceIntegrationRow {
  readonly serviceId: string;
  readonly composeTarget: string;
  readonly composeProfiles: readonly string[];
  readonly generatedInTestCompose: boolean;
  readonly proofCommand: string;
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly nonClaims: readonly string[];
}

interface ProfileIntegrationRow {
  readonly profile: string;
  readonly composeTarget: string;
  readonly serviceIds: readonly string[];
  readonly profileIntegrationDisposition: string;
  readonly mustStart: boolean;
  readonly mustReadinessCheck: boolean;
  readonly mustSeed: boolean;
  readonly mustExercise: boolean;
  readonly mustTeardown: boolean;
  readonly mustReset: boolean;
  readonly mustEvidence: boolean;
  readonly inMemoryServiceSubstituteAllowed: boolean;
}

interface ServiceCatalogueDispositionRow {
  readonly serviceCatalogueId: string;
  readonly generatedComposeServiceId: string | null;
  readonly composeTarget: string | null;
  readonly testDisposition: string;
  readonly boundedRationale: string;
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly nonClaims: readonly string[];
}

interface IntegrationMatrix {
  readonly composeTarget: string;
  readonly generatedServiceCount: number;
  readonly profileCount: number;
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly serviceIntegrationRows: readonly ServiceIntegrationRow[];
  readonly profileIntegrationRows: readonly ProfileIntegrationRow[];
  readonly serviceCatalogueDispositionRows: readonly ServiceCatalogueDispositionRow[];
  readonly nonClaims: readonly string[];
}

interface CommandSurface {
  readonly testReadinessClaimAllowed: boolean;
  readonly dependsOnIssueIds: readonly string[];
  readonly canonicalCommands: readonly {
    readonly id: string;
    readonly command: string;
    readonly makeTarget: string;
    readonly requiresComposedServices: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
  }[];
  readonly packageScripts: readonly { readonly id: string; readonly script: string }[];
  readonly makeTargets: readonly { readonly target: string; readonly routesTo: string }[];
  readonly nonClaims: readonly string[];
}

interface PackageJson {
  readonly scripts: Record<string, string>;
}

interface ContractFile {
  readonly id: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly facets: Record<string, { readonly status: string }>;
}

interface DriftSuite {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly testSuitePath: string;
  readonly expectedSemanticContractCount: number;
  readonly expectedServiceObligationCount: number;
  readonly expectedGeneratedServiceCount: number;
  readonly expectedProfileCount: number;
  readonly designContractObligationClassId: string;
  readonly forbiddenObligationClassIds: readonly string[];
  readonly requiredApiEventProviderContractIds: readonly string[];
  readonly requiredCommandIds: readonly string[];
  readonly requiredNonClaims: readonly string[];
  readonly testReadinessClaimAllowed: boolean;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly plantedDefectCases: readonly {
    readonly id: string;
    readonly expectedFindingCode: string;
  }[];
}

interface DriftInputs {
  readonly manifest: ObligationManifest;
  readonly integration: IntegrationMatrix;
  readonly commandSurface: CommandSurface;
  readonly packageJson: PackageJson;
  readonly makefileText: string;
  readonly composeText: string;
  readonly suite: DriftSuite;
}

interface Finding {
  readonly code: string;
  readonly target: string;
}

type Mutable<T> = {
  -readonly [K in keyof T]: T[K] extends readonly (infer U)[]
    ? Mutable<U>[]
    : T[K] extends object
      ? Mutable<T[K]>
      : T[K];
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function clone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

function makeTargets(makefileText: string): Set<string> {
  const targets = new Set<string>();
  for (const line of makefileText.split("\n")) {
    const match = /^([A-Za-z0-9_.:-]+):(?:\s|$)/.exec(line);
    const target = match?.[1];
    if (target) {
      targets.add(target);
    }
  }
  return targets;
}

function composeHasService(composeText: string, serviceId: string): boolean {
  return new RegExp(`^  ${serviceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`, "m").test(
    composeText,
  );
}

function collectDriftFindings(inputs: DriftInputs): Finding[] {
  const findings: Finding[] = [];
  const { commandSurface, composeText, integration, makefileText, manifest, packageJson, suite } =
    inputs;
  const obligationClassIds = new Set(manifest.obligationClasses.map((row) => row.id));
  const designClass = suite.designContractObligationClassId;

  if (!obligationClassIds.has(designClass)) {
    findings.push({ code: "missing-contract-mapping", target: designClass });
  }

  const allObligationRows = [
    ...manifest.semanticContractObligations.map((row) => ({
      id: row.contractId,
      classIds: row.obligationClassIds,
      ownerIssueIds: row.ownerIssueIds,
    })),
    ...manifest.serviceObligations.map((row) => ({
      id: row.serviceId,
      classIds: row.obligationClassIds,
      ownerIssueIds: row.ownerIssueIds,
    })),
  ];
  for (const row of allObligationRows.filter((item) => item.ownerIssueIds.includes("USF-246"))) {
    if (!row.classIds.includes(designClass)) {
      findings.push({ code: "missing-contract-mapping", target: row.id });
    }
    for (const forbidden of suite.forbiddenObligationClassIds) {
      if (row.classIds.includes(forbidden)) {
        findings.push({ code: "missing-contract-mapping", target: `${row.id}:${forbidden}` });
      }
    }
  }

  const semanticRows = manifest.semanticContractObligations.filter((row) =>
    row.ownerIssueIds.includes("USF-246"),
  );
  if (semanticRows.length !== suite.expectedSemanticContractCount) {
    findings.push({ code: "missing-contract-mapping", target: "semantic-contract-count" });
  }
  for (const row of semanticRows) {
    if (!existsSync(row.path)) {
      findings.push({ code: "missing-contract-mapping", target: row.contractId });
      continue;
    }
    const contract = readJson<ContractFile>(row.path);
    if (
      contract.id !== row.contractId ||
      contract.capability !== row.capability ||
      contract.capabilityDomain !== row.capabilityDomain ||
      new Set(Object.keys(contract.facets)).size !== row.facetKeys.length ||
      !row.facetKeys.every((facet) => Object.hasOwn(contract.facets, facet))
    ) {
      findings.push({ code: "missing-contract-mapping", target: row.contractId });
    }
    if (!row.testMappingRequired) {
      findings.push({ code: "missing-contract-mapping", target: `${row.contractId}:testMapping` });
    }
  }

  for (const requiredContractId of suite.requiredApiEventProviderContractIds) {
    if (!semanticRows.some((row) => row.contractId === requiredContractId)) {
      findings.push({ code: "api-event-provider-binding-drift", target: requiredContractId });
    }
  }

  if (!composeText.includes("Generated by tools/generate-compose/generate-compose.py")) {
    findings.push({ code: "stale-generated-output", target: "compose-generator-banner" });
  }
  if (!composeText.includes("source: spec/instances/compose-service/service-catalogue.json")) {
    findings.push({ code: "stale-generated-output", target: "compose-source-authority" });
  }

  const serviceRows = manifest.serviceObligations.filter((row) =>
    row.ownerIssueIds.includes("USF-246"),
  );
  if (serviceRows.length !== suite.expectedServiceObligationCount) {
    findings.push({ code: "missing-compose-target", target: "service-obligation-count" });
  }
  const integrationRows = new Map(
    integration.serviceIntegrationRows.map((row) => [row.serviceId, row]),
  );
  const dispositionRows = new Map(
    integration.serviceCatalogueDispositionRows.map((row) => [row.serviceCatalogueId, row]),
  );
  for (const row of serviceRows) {
    const integrationRow = integrationRows.get(row.serviceId);
    const dispositionRow = dispositionRows.get(row.serviceId);
    if (integrationRow !== undefined) {
      if (
        row.composeTarget !== integration.composeTarget ||
        integrationRow.composeTarget !== row.composeTarget ||
        row.validationCommands.length === 0 ||
        integrationRow.proofCommand.length === 0
      ) {
        findings.push({ code: "missing-compose-target", target: row.serviceId });
      }
      if (row.generatedInTestCompose && !composeHasService(composeText, row.composeServiceId)) {
        findings.push({ code: "stale-generated-output", target: row.composeServiceId });
      }
    } else if (dispositionRow !== undefined) {
      const generatedDisposition = dispositionRow.generatedComposeServiceId !== null;
      if (
        generatedDisposition &&
        (dispositionRow.composeTarget !== integration.composeTarget ||
          !composeHasService(composeText, dispositionRow.generatedComposeServiceId ?? ""))
      ) {
        findings.push({ code: "missing-compose-target", target: row.serviceId });
      }
      if (
        dispositionRow.boundedRationale.length < 20 ||
        dispositionRow.inMemoryServiceSubstituteAllowed ||
        dispositionRow.testReadinessClaimAllowed
      ) {
        findings.push({ code: "readiness-overclaim", target: row.serviceId });
      }
    } else {
      findings.push({ code: "missing-compose-target", target: row.serviceId });
    }
    if (
      row.inMemoryServiceSubstituteAllowed ||
      integrationRow?.inMemoryServiceSubstituteAllowed ||
      integration.inMemoryServiceSubstituteAllowedForServiceBackedClaims
    ) {
      findings.push({ code: "readiness-overclaim", target: row.serviceId });
    }
  }
  if (
    integration.generatedServiceCount !== suite.expectedGeneratedServiceCount ||
    integration.profileCount !== suite.expectedProfileCount ||
    integration.serviceIntegrationRows.length !== suite.expectedGeneratedServiceCount ||
    integration.profileIntegrationRows.length !== suite.expectedProfileCount
  ) {
    findings.push({ code: "stale-generated-output", target: "integration-counts" });
  }
  for (const profile of integration.profileIntegrationRows) {
    if (
      profile.composeTarget !== manifest.testComposeTarget ||
      profile.profileIntegrationDisposition.length === 0 ||
      !profile.mustStart ||
      !profile.mustReadinessCheck ||
      !profile.mustSeed ||
      !profile.mustExercise ||
      !profile.mustTeardown ||
      !profile.mustReset ||
      !profile.mustEvidence ||
      profile.inMemoryServiceSubstituteAllowed
    ) {
      findings.push({ code: "missing-compose-target", target: profile.profile });
    }
  }

  const observedMakeTargets = makeTargets(makefileText);
  for (const commandId of suite.requiredCommandIds) {
    const command = commandSurface.canonicalCommands.find((row) => row.id === commandId);
    if (!command) {
      findings.push({ code: "missing-command", target: commandId });
      continue;
    }
    const packageScriptName = command.command.replace(/^corepack pnpm /, "");
    if (packageJson.scripts[packageScriptName] === undefined) {
      findings.push({ code: "missing-command", target: packageScriptName });
    }
    if (!observedMakeTargets.has(command.makeTarget)) {
      findings.push({ code: "missing-command", target: command.makeTarget });
    }
    if (command.inMemoryServiceSubstituteAllowed) {
      findings.push({ code: "readiness-overclaim", target: command.id });
    }
  }

  const nonClaimSources = [
    ...manifest.nonClaims,
    ...integration.nonClaims,
    ...commandSurface.nonClaims,
    ...suite.requiredNonClaims,
  ];
  for (const nonClaim of suite.requiredNonClaims) {
    if (!nonClaimSources.includes(nonClaim)) {
      findings.push({ code: "readiness-overclaim", target: nonClaim });
    }
  }
  if (
    manifest.testReadinessClaimAllowed ||
    integration.testReadinessClaimAllowed ||
    commandSurface.testReadinessClaimAllowed ||
    suite.testReadinessClaimAllowed ||
    manifest.inMemoryServiceSubstituteAllowedForServiceBackedClaims ||
    suite.inMemoryServiceSubstituteAllowedForServiceBackedClaims
  ) {
    findings.push({ code: "readiness-overclaim", target: "claim-boundary" });
  }

  return findings;
}

function baseInputs(): DriftInputs {
  return {
    commandSurface: readJson<CommandSurface>(
      "docs/architecture/test-readiness-command-surface-and-ci-gate.json",
    ),
    composeText: readFileSync("compose/compose.test.generated.yaml", "utf8"),
    integration: readJson<IntegrationMatrix>(
      "docs/architecture/composed-service-integration-test-matrix.json",
    ),
    makefileText: readFileSync("Makefile", "utf8"),
    manifest: readJson<ObligationManifest>(
      "docs/architecture/semantic-service-test-obligation-manifest.json",
    ),
    packageJson: readJson<PackageJson>("package.json"),
    suite: readJson<DriftSuite>("docs/architecture/design-contract-compose-drift-test-suite.json"),
  };
}

function applyPlantedDefect(inputs: DriftInputs, defectId: string): DriftInputs {
  const mutated = clone(inputs);
  switch (defectId) {
    case "missing-compose-target": {
      const firstServiceRow = mutated.integration.serviceIntegrationRows[0];
      if (!firstServiceRow) {
        throw new Error("missing service integration row for planted defect");
      }
      mutated.integration.serviceIntegrationRows[0] = {
        ...firstServiceRow,
        composeTarget: "compose/missing.generated.yaml",
      };
      break;
    }
    case "missing-command": {
      delete mutated.packageJson.scripts["test-readiness:integration"];
      break;
    }
    case "missing-contract-mapping": {
      const firstSemanticRow = mutated.manifest.semanticContractObligations[0];
      if (!firstSemanticRow) {
        throw new Error("missing semantic contract row for planted defect");
      }
      mutated.manifest.semanticContractObligations[0] = {
        ...firstSemanticRow,
        obligationClassIds: firstSemanticRow.obligationClassIds.filter(
          (id) => id !== mutated.suite.designContractObligationClassId,
        ),
      };
      break;
    }
    case "stale-generated-output": {
      mutated.composeText = mutated.composeText.replace(
        /^ {2}postgres:\n/m,
        "  postgres_drifted:\n",
      );
      break;
    }
    case "readiness-overclaim": {
      mutated.suite = { ...mutated.suite, testReadinessClaimAllowed: true };
      break;
    }
    default:
      throw new Error(`unknown planted defect: ${defectId}`);
  }
  return mutated;
}

describe("design contract and Compose drift suite", () => {
  const inputs = baseInputs();

  it("keeps generated Compose derivative and service obligation mappings current", () => {
    const findings = collectDriftFindings(inputs);

    expect(inputs.suite.issueId).toBe("USF-246");
    expect(inputs.suite.parentIssueId).toBe("USF-234");
    expect(inputs.integration.composeTarget).toBe(inputs.manifest.testComposeTarget);
    expect(inputs.integration.generatedServiceCount).toBe(
      inputs.suite.expectedGeneratedServiceCount,
    );
    expect(inputs.integration.profileCount).toBe(inputs.suite.expectedProfileCount);
    expect(findings).toEqual([]);
  });

  it("keeps semantic contract, API, event, and provider-binding drift checks current", () => {
    const semanticRows = inputs.manifest.semanticContractObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-246"),
    );
    const serviceRows = inputs.manifest.serviceObligations.filter((row) =>
      row.ownerIssueIds.includes("USF-246"),
    );

    expect(semanticRows).toHaveLength(inputs.suite.expectedSemanticContractCount);
    expect(serviceRows).toHaveLength(inputs.suite.expectedServiceObligationCount);
    expect(
      semanticRows.every((row) =>
        row.obligationClassIds.includes(inputs.suite.designContractObligationClassId),
      ),
    ).toBe(true);
    expect(
      serviceRows.every((row) =>
        row.obligationClassIds.includes(inputs.suite.designContractObligationClassId),
      ),
    ).toBe(true);
    expect(
      semanticRows.some((row) => row.contractId === "semantic-contract.openapi-drift-hard-gate"),
    ).toBe(true);
    expect(
      inputs.suite.requiredApiEventProviderContractIds.every((contractId) =>
        semanticRows.some((row) => row.contractId === contractId),
      ),
    ).toBe(true);
  });

  it("keeps command surface wiring and non-claim boundaries current", () => {
    const targets = makeTargets(inputs.makefileText);

    for (const commandId of inputs.suite.requiredCommandIds) {
      const command = inputs.commandSurface.canonicalCommands.find((row) => row.id === commandId);
      expect(command).toBeDefined();
      expect(
        inputs.packageJson.scripts[command?.command.replace(/^corepack pnpm /, "") ?? ""],
      ).toBeDefined();
      expect(targets.has(command?.makeTarget ?? "")).toBe(true);
      expect(command?.inMemoryServiceSubstituteAllowed).toBe(false);
    }
    expect(inputs.commandSurface.dependsOnIssueIds).toContain("USF-242");
    expect(inputs.commandSurface.testReadinessClaimAllowed).toBe(false);
    expect(inputs.suite.testReadinessClaimAllowed).toBe(false);
    for (const nonClaim of inputs.suite.requiredNonClaims) {
      expect(inputs.commandSurface.nonClaims).toContain(nonClaim);
    }
  });

  it.each(
    baseInputs().suite.plantedDefectCases.map((row) => [row.id, row.expectedFindingCode] as const),
  )("detects planted drift defect: %s", (defectId, expectedFindingCode) => {
    const findings = collectDriftFindings(applyPlantedDefect(baseInputs(), defectId));

    expect(findings.some((finding) => finding.code === expectedFindingCode)).toBe(true);
  });
});
