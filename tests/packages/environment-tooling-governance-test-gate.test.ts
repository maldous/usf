import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface PackageJson {
  name: string;
  packageManager: string;
  engines: Record<string, string>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface ToolPin {
  name: string;
  packageJsonField: string;
  requiredVersion: string;
  lockfileSpecifierRequired: boolean;
}

interface GeneratedArtifactCheck {
  id: string;
  artifactPath: string;
  authorityPath: string;
  validationCommand: string;
  derivedFromAuthority: boolean;
  stalenessStatus: string;
  directEditAllowed: boolean;
}

interface SourceAuthorities {
  linearIssue: string;
  obligationManifest: string;
  commandSurface: string;
  devReadinessHandover: string;
  gitPracticesStandard: string;
  packageJson: string;
  pnpmLockfile: string;
  pnpmWorkspace: string;
}

interface PlantedDefectCase {
  id: string;
  expectedFinding: FindingCode;
}

interface GateEvidence {
  id: string;
  title: string;
  issueId: string;
  parentIssueId: string;
  dependsOnIssueIds: string[];
  sourceAuthorities: SourceAuthorities;
  testCommand: {
    id: string;
    command: string;
    testFile: string;
    requiresPackageScriptChange: boolean;
    requiresMakefileChange: boolean;
    requiresCiWorkflowChange: boolean;
    claimBoundary: string;
  };
  scope: Record<string, boolean>;
  toolchainPinning: {
    nodeEngine: string;
    pnpmPackageManager: string;
    corepackRequired: boolean;
    engineStrictRequired: boolean;
    exactDependencyVersionsRequired: boolean;
    workspaceLockfileRequired: boolean;
    devTools: ToolPin[];
  };
  workspaceLockfileConsistency: {
    workspaceGlobs: string[];
    requiredRootImporter: string;
    expectedImporterCount: number;
    sharedWorkspaceLockfileRequired: boolean;
    frozenInstallCommand: string;
    lockfileVersion: string;
    requiredOverridePins: { package: string; version: string }[];
  };
  commandParity: {
    existingCommandSurface: string;
    localCanonicalCommand: string;
    ciEquivalentCommand: string;
    makeTarget: string;
    packageScript: string;
    issueScopedCommandRequiresSharedScript: boolean;
    commandsThatMustRemainAligned: string[];
  };
  environmentBoundaries: {
    profileSelectionExplicit: boolean;
    allowedEnvironmentClasses: string[];
    disallowedClaimEnvironmentClasses: string[];
    optionalEnvironmentVariables: string[];
    realSecretsRequired: boolean;
    realTenantDataRequired: boolean;
    liveProviderRequired: boolean;
    stagingAccessRequired: boolean;
    productionAccessRequired: boolean;
    offlineNoNetworkDefault: boolean;
    deterministicSeedsRequired: boolean;
    deterministicClockBoundaryRequired: boolean;
    timezoneLocaleSensitivityCovered: boolean;
    pathCaseSensitivityCovered: boolean;
    tempDirectoryCleanupRequired: boolean;
    hiddenLocalStateRequired: boolean;
    rawEndpointTokenRetentionAllowed: boolean;
  };
  generatedArtifactChecks: GeneratedArtifactCheck[];
  versionControl: {
    branchPolicy: {
      recommendedIssueBranch: string;
      linearSuggestedBranchNotUsedBecauseContainsRedundantLocalUsf: boolean;
      forbiddenTokens: string[];
      branchNameMustBeSemanticPurpose: boolean;
      draftPrRequiredUntilValidationPasses: boolean;
    };
    tagPolicy: {
      createsTag: boolean;
      tagClaimBoundary: string;
    };
    hiddenLocalState: {
      trackedPrivateStateAllowed: boolean;
      privateStatePrefixes: string[];
      gitignoreMustCoverPrivateState: boolean;
      realSecretsRequired: boolean;
      realTenantDataRequired: boolean;
      simulatedTrackedFiles: string[];
    };
    cleanCheckout: {
      freshCloneRequiredBeforeFinalAcceptance: boolean;
      freshCloneOwnerIssue: string;
      dirtyGitStatusAllowed: boolean;
      gitDiffCheckRequired: boolean;
      gitStatusReviewRequired: boolean;
    };
    secretScanning: {
      secretLikeValuesAllowed: boolean;
      rawEndpointValuesAllowed: boolean;
      prohibitedValuePatterns: string[];
      secretProbeValues: string[];
    };
    largeTransientArtifacts: {
      committedLargeTransientArtifactsAllowed: boolean;
      maxOwnedEvidenceFileBytes: number;
      blockedPathFragments: string[];
    };
  };
  complianceBoundary: Record<string, boolean>;
  validationCommands: string[];
  plantedDefectCases: PlantedDefectCase[];
  allowedClaims: string[];
  nonClaims: string[];
}

interface CommandSurface {
  ciLocalAlignment: {
    localCanonicalCommand: string;
    ciEquivalentCommand: string;
    makeTarget: string;
  };
  packageScripts: { id: string; script: string }[];
  makeTargets: { target: string; routesTo: string }[];
  validationCommands: string[];
  nonClaims: string[];
}

interface DevReadiness {
  toolchainEvidence: {
    nodeEngine: string;
    pnpmPackageManager: string;
    lockfilePosture: string;
  };
  safeLocalConfiguration: {
    realSecretsRequired: boolean;
    realTenantDataRequired: boolean;
    liveProviderRequired: boolean;
    stagingAccessRequired: boolean;
    productionAccessRequired: boolean;
    optionalEnvironmentVariables: string[];
  };
  repositoryGovernance: {
    hiddenLocalStateRequired: boolean;
    committedCodexOrClaudeArtifacts: boolean;
    realSecretsRequired: boolean;
    realTenantDataRequired: boolean;
  };
  nonClaims: string[];
}

interface ObligationManifest {
  expandedCategoryObligations: {
    issueId: string;
    categoryId: string;
    requiredCommandIds: string[];
    validationCommands: string[];
    nonClaims: string[];
    testReadinessClaimAllowed: boolean;
  }[];
}

type FindingCode =
  | "USF-258-TOOL-VERSION-DRIFT"
  | "USF-258-COMMAND-MISMATCH"
  | "USF-258-GENERATED-ARTIFACT-DRIFT"
  | "USF-258-DIRTY-GIT-STATE"
  | "USF-258-PRIVATE-STATE-LEAKAGE"
  | "USF-258-SECRET-LIKE-LEAKAGE"
  | "USF-258-ENVIRONMENT-BOUNDARY-MISSING"
  | "USF-258-UNSUPPORTED-OVERCLAIM";

const gate = readJson<GateEvidence>(
  "docs/architecture/environment-tooling-governance-test-gate.json",
);
const packageJson = readJson<PackageJson>("package.json");
const commandSurface = readJson<CommandSurface>(gate.sourceAuthorities.commandSurface);
const devReadiness = readJson<DevReadiness>(gate.sourceAuthorities.devReadinessHandover);
const obligationManifest = readJson<ObligationManifest>(gate.sourceAuthorities.obligationManifest);
const lockfileText = readFileSync(gate.sourceAuthorities.pnpmLockfile, "utf8");
const workspaceText = readFileSync(gate.sourceAuthorities.pnpmWorkspace, "utf8");
const npmrcText = readFileSync(".npmrc", "utf8");
const gitignoreText = readFileSync(".gitignore", "utf8");
const makefileText = readFileSync("Makefile", "utf8");

const expectedTestCommand =
  "corepack pnpm test -- tests/packages/environment-tooling-governance-test-gate.test.ts";
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
  "final-usf-234-acceptance",
  "regulatory-compliance",
];
const prohibitedAllowedClaims = new Set([
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
  "regulatory-compliance",
]);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function cloneGate(value: GateEvidence): GateEvidence {
  return JSON.parse(JSON.stringify(value)) as GateEvidence;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseWorkspacePackages(text: string): string[] {
  const packages: string[] = [];
  let inPackages = false;
  for (const line of text.split(/\r?\n/)) {
    if (line === "packages:") {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line)) {
      break;
    }
    const match = /^[ ]{2}- (.+)$/.exec(line);
    if (inPackages && match?.[1]) {
      packages.push(unquote(match[1]));
    }
  }
  return packages;
}

function parseLockfileVersion(text: string): string {
  const match = /^lockfileVersion: (.+)$/m.exec(text);
  if (!match?.[1]) {
    throw new Error("pnpm lockfile version missing");
  }
  return unquote(match[1]);
}

function parseLockImporters(text: string): Set<string> {
  const importers = new Set<string>();
  let inImporters = false;
  for (const line of text.split(/\r?\n/)) {
    if (line === "importers:") {
      inImporters = true;
      continue;
    }
    if (inImporters && /^\S/.test(line)) {
      break;
    }
    const match = /^[ ]{2}([^ ].*?):(?: \{\})?$/.exec(line);
    if (inImporters && match?.[1]) {
      importers.add(unquote(match[1]));
    }
  }
  return importers;
}

function parseRootLockSpecifiers(text: string): Record<string, string> {
  const specifiers: Record<string, string> = {};
  let inRootImporter = false;
  let currentPackage: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (line === "  .:") {
      inRootImporter = true;
      continue;
    }
    if (inRootImporter && /^[ ]{2}[^ ]/.test(line)) {
      break;
    }
    if (!inRootImporter) {
      continue;
    }
    const packageMatch = /^[ ]{6}(.+):$/.exec(line);
    if (packageMatch?.[1]) {
      currentPackage = unquote(packageMatch[1]);
      continue;
    }
    const specifierMatch = /^[ ]{8}specifier: (.+)$/.exec(line);
    if (currentPackage && specifierMatch?.[1]) {
      specifiers[currentPackage] = unquote(specifierMatch[1]);
    }
  }
  return specifiers;
}

function workspaceDirectoriesForPatterns(patterns: string[]): string[] {
  return patterns.flatMap((pattern) => {
    if (!pattern.endsWith("/*")) {
      throw new Error(`unsupported workspace pattern ${pattern}`);
    }
    const base = pattern.slice(0, -2);
    return readdirSync(base, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${base}/${entry.name}`)
      .filter((path) => existsSync(`${path}/package.json`));
  });
}

function packageVersion(name: string): string {
  const value = packageJson.dependencies[name] ?? packageJson.devDependencies[name];
  if (value === undefined) {
    throw new Error(`missing package dependency ${name}`);
  }
  return value;
}

function isExactVersion(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function parseMinimumNodeVersion(engine: string): string {
  const match = /^>=(\d+\.\d+\.\d+)$/.exec(engine);
  if (!match?.[1]) {
    throw new Error(`unsupported node engine range ${engine}`);
  }
  return match[1];
}

function versionAtLeast(actual: string, minimum: string): boolean {
  const actualParts = actual.split(".").map((value) => Number(value));
  const minimumParts = minimum.split(".").map((value) => Number(value));
  for (let index = 0; index < 3; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;
    if (actualPart > minimumPart) {
      return true;
    }
    if (actualPart < minimumPart) {
      return false;
    }
  }
  return true;
}

function makeTargetCommand(target: string): string | undefined {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}:\\n\\t([^\\n]+)$`, "m").exec(makefileText)?.[1];
}

function commandIsKnown(command: string): boolean {
  if (command.startsWith("corepack pnpm ")) {
    const script = command.slice("corepack pnpm ".length).split(/\s+/)[0];
    return script !== undefined && packageJson.scripts[script] !== undefined;
  }
  if (command.startsWith("python3 ")) {
    const script = command.slice("python3 ".length).split(/\s+/)[0];
    return script !== undefined && existsSync(script);
  }
  return command === "git diff --check";
}

function branchNameContainsForbiddenToken(branchName: string, token: string): boolean {
  return branchName
    .split(/[/. _-]+/)
    .filter(Boolean)
    .some((segment) => segment.toLowerCase() === token);
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => stringValues(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap((item) => stringValues(item));
  }
  return [];
}

function hasSecretLikeValue(value: string): boolean {
  return [
    /AKIA[0-9A-Z]{16}/,
    /gh[pousr]_[A-Za-z0-9_]{20,}/,
    /sk-[A-Za-z0-9]{20,}/,
    /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
    /https?:\/\/[^/\s]+:[^@\s]+@/,
    /(?:postgres|mysql|redis):\/\/[^@\s]+@/,
  ].some((pattern) => pattern.test(value));
}

function collectGateFindings(candidate: GateEvidence, dirtyGitStatus: string): Set<FindingCode> {
  const findings = new Set<FindingCode>();
  if (candidate.toolchainPinning.pnpmPackageManager !== packageJson.packageManager) {
    findings.add("USF-258-TOOL-VERSION-DRIFT");
  }
  for (const tool of candidate.toolchainPinning.devTools) {
    if (packageVersion(tool.name) !== tool.requiredVersion) {
      findings.add("USF-258-TOOL-VERSION-DRIFT");
    }
    if (!isExactVersion(tool.requiredVersion)) {
      findings.add("USF-258-TOOL-VERSION-DRIFT");
    }
  }
  if (candidate.testCommand.command !== expectedTestCommand) {
    findings.add("USF-258-COMMAND-MISMATCH");
  }
  if (!candidate.validationCommands.includes(expectedTestCommand)) {
    findings.add("USF-258-COMMAND-MISMATCH");
  }
  if (
    candidate.commandParity.localCanonicalCommand !==
    commandSurface.ciLocalAlignment.localCanonicalCommand
  ) {
    findings.add("USF-258-COMMAND-MISMATCH");
  }
  if (
    candidate.generatedArtifactChecks.some(
      (row) =>
        row.stalenessStatus !== "current" ||
        row.derivedFromAuthority !== true ||
        row.directEditAllowed !== false,
    )
  ) {
    findings.add("USF-258-GENERATED-ARTIFACT-DRIFT");
  }
  if (
    dirtyGitStatus.trim() !== "" &&
    candidate.versionControl.cleanCheckout.dirtyGitStatusAllowed === false
  ) {
    findings.add("USF-258-DIRTY-GIT-STATE");
  }
  const privatePrefixes = candidate.versionControl.hiddenLocalState.privateStatePrefixes;
  if (
    candidate.versionControl.hiddenLocalState.trackedPrivateStateAllowed !== false ||
    candidate.versionControl.hiddenLocalState.simulatedTrackedFiles.some((path) =>
      privatePrefixes.some((prefix) => path.startsWith(prefix)),
    )
  ) {
    findings.add("USF-258-PRIVATE-STATE-LEAKAGE");
  }
  if (
    candidate.versionControl.secretScanning.secretLikeValuesAllowed !== false ||
    candidate.versionControl.secretScanning.secretProbeValues.some(hasSecretLikeValue) ||
    stringValues(candidate).some(hasSecretLikeValue)
  ) {
    findings.add("USF-258-SECRET-LIKE-LEAKAGE");
  }
  const boundary = candidate.environmentBoundaries;
  if (
    boundary.profileSelectionExplicit !== true ||
    boundary.offlineNoNetworkDefault !== true ||
    boundary.deterministicSeedsRequired !== true ||
    boundary.deterministicClockBoundaryRequired !== true ||
    boundary.timezoneLocaleSensitivityCovered !== true ||
    boundary.pathCaseSensitivityCovered !== true ||
    boundary.tempDirectoryCleanupRequired !== true ||
    boundary.hiddenLocalStateRequired !== false ||
    boundary.realSecretsRequired !== false ||
    boundary.realTenantDataRequired !== false ||
    boundary.liveProviderRequired !== false
  ) {
    findings.add("USF-258-ENVIRONMENT-BOUNDARY-MISSING");
  }
  if (
    Object.entries(candidate.complianceBoundary).some(
      ([key, value]) => key !== "complianceAdjacentEvidenceOnly" && value !== false,
    ) ||
    candidate.allowedClaims.some((claim) => prohibitedAllowedClaims.has(claim)) ||
    requiredNonClaims.some((claim) => !candidate.nonClaims.includes(claim))
  ) {
    findings.add("USF-258-UNSUPPORTED-OVERCLAIM");
  }
  return findings;
}

function gateWithDefect(defectId: string): { candidate: GateEvidence; dirtyGitStatus: string } {
  const candidate = cloneGate(gate);
  let dirtyGitStatus = "";
  switch (defectId) {
    case "tool-version-drift": {
      const vitest = candidate.toolchainPinning.devTools.find((tool) => tool.name === "vitest");
      if (vitest) {
        vitest.requiredVersion = "0.0.0";
      }
      break;
    }
    case "command-mismatch":
      candidate.testCommand.command = "corepack pnpm test";
      break;
    case "stale-generated-artifact":
      candidate.generatedArtifactChecks[0]!.stalenessStatus = "stale";
      break;
    case "dirty-git-state":
      dirtyGitStatus = " M docs/architecture/environment-tooling-governance-test-gate.json";
      break;
    case "committed-private-artifact":
      candidate.versionControl.hiddenLocalState.simulatedTrackedFiles.push(".codex/session.json");
      break;
    case "secret-like-value":
      candidate.versionControl.secretScanning.secretProbeValues.push(
        "ghp_0123456789abcdefghijklmnop",
      );
      break;
    case "missing-environment-boundary":
      candidate.environmentBoundaries.timezoneLocaleSensitivityCovered = false;
      break;
    case "unsupported-compliance-overclaim":
      candidate.allowedClaims.push("soc-readiness");
      candidate.complianceBoundary.socReadinessClaimAllowed = true;
      break;
    default:
      throw new Error(`unhandled planted defect ${defectId}`);
  }
  return { candidate, dirtyGitStatus };
}

describe("environment tooling governance test gate", () => {
  it("maps USF-258 evidence to its expanded obligation row without shared edits", () => {
    const manifestRow = obligationManifest.expandedCategoryObligations.find(
      (row) => row.issueId === "USF-258",
    );

    expect(gate.issueId).toBe("USF-258");
    expect(gate.parentIssueId).toBe("USF-234");
    expect(gate.dependsOnIssueIds).toEqual(
      expect.arrayContaining(["USF-239", "USF-248", "USF-243", "USF-259"]),
    );
    expect(manifestRow?.categoryId).toBe("environment-tooling-governance");
    expect(manifestRow?.requiredCommandIds).toContain(gate.testCommand.id);
    expect(manifestRow?.validationCommands).toContain(gate.testCommand.command);
    expect(manifestRow?.testReadinessClaimAllowed).toBe(false);

    expect(gate.testCommand.requiresPackageScriptChange).toBe(false);
    expect(gate.testCommand.requiresMakefileChange).toBe(false);
    expect(gate.testCommand.requiresCiWorkflowChange).toBe(false);
    expect(gate.scope.sharedCommandOrValidatorEditRequired).toBe(false);
    expect(gate.scope.packageMakefileCiEditRequired).toBe(false);
  });

  it("validates Node pnpm Corepack and TypeScript Vitest ESLint Prettier pins", () => {
    const lockSpecifiers = parseRootLockSpecifiers(lockfileText);
    const nodeMinimum = parseMinimumNodeVersion(gate.toolchainPinning.nodeEngine);

    expect(packageJson.engines.node).toBe(gate.toolchainPinning.nodeEngine);
    expect(packageJson.engines.pnpm).toBe(">=11.9.0");
    expect(packageJson.packageManager).toBe(gate.toolchainPinning.pnpmPackageManager);
    expect(versionAtLeast(process.versions.node, nodeMinimum)).toBe(true);
    expect(npmrcText).toContain("engine-strict=true");
    expect(npmrcText).toContain("shared-workspace-lockfile=true");
    expect(gate.toolchainPinning.corepackRequired).toBe(true);
    expect(gate.toolchainPinning.engineStrictRequired).toBe(true);

    for (const value of Object.values({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    })) {
      expect(isExactVersion(value), `non-exact dependency version ${value}`).toBe(true);
    }

    for (const tool of gate.toolchainPinning.devTools) {
      expect(packageVersion(tool.name), tool.name).toBe(tool.requiredVersion);
      expect(lockSpecifiers[tool.name], tool.name).toBe(tool.requiredVersion);
    }

    expect(packageJson.scripts.test).toBe("vitest run");
    expect(packageJson.scripts.typecheck).toBe("tsc --noEmit");
    expect(packageJson.scripts.lint).toBe("eslint .");
    expect(packageJson.scripts["format:check"]).toContain("prettier --check");
  });

  it("keeps pnpm workspace and lockfile importers in sync with package layout", () => {
    const workspacePackages = parseWorkspacePackages(workspaceText);
    const expectedWorkspaceDirectories = workspaceDirectoriesForPatterns(workspacePackages);
    const expectedImporters = new Set([
      gate.workspaceLockfileConsistency.requiredRootImporter,
      ...expectedWorkspaceDirectories,
    ]);
    const lockImporters = parseLockImporters(lockfileText);

    expect(workspacePackages).toEqual(gate.workspaceLockfileConsistency.workspaceGlobs);
    expect(parseLockfileVersion(lockfileText)).toBe(
      gate.workspaceLockfileConsistency.lockfileVersion,
    );
    expect(lockImporters.size).toBe(gate.workspaceLockfileConsistency.expectedImporterCount);
    expect([...lockImporters].sort()).toEqual([...expectedImporters].sort());
    expect(packageJson.scripts.test).toBe("vitest run");
    expect(packageJson.scripts.test).not.toContain("--update");
    expect(gate.workspaceLockfileConsistency.frozenInstallCommand).toBe(
      "corepack pnpm install --frozen-lockfile",
    );

    for (const override of gate.workspaceLockfileConsistency.requiredOverridePins) {
      expect(workspaceText).toContain(`${override.package}: "${override.version}"`);
      expect(lockfileText).toContain(`${override.package}: ${override.version}`);
    }
  });

  it("keeps existing package Make and CI command surfaces aligned", () => {
    const packageScript = commandSurface.packageScripts.find(
      (row) => row.id === gate.commandParity.packageScript,
    );
    const makeTarget = commandSurface.makeTargets.find(
      (row) => row.target === gate.commandParity.makeTarget,
    );

    expect(commandSurface.ciLocalAlignment.localCanonicalCommand).toBe(
      gate.commandParity.localCanonicalCommand,
    );
    expect(commandSurface.ciLocalAlignment.ciEquivalentCommand).toBe(
      gate.commandParity.ciEquivalentCommand,
    );
    expect(commandSurface.ciLocalAlignment.makeTarget).toBe(gate.commandParity.makeTarget);
    expect(packageJson.scripts[gate.commandParity.packageScript]).toBe(packageScript?.script);
    expect(makeTarget?.routesTo).toBe(gate.commandParity.localCanonicalCommand);
    expect(makeTargetCommand(gate.commandParity.makeTarget)).toBe(
      gate.commandParity.localCanonicalCommand,
    );

    for (const commandId of gate.commandParity.commandsThatMustRemainAligned) {
      expect(packageJson.scripts[commandId], commandId).toBeDefined();
      expect(
        commandSurface.packageScripts.some((row) => row.id === commandId),
        commandId,
      ).toBe(true);
    }
  });

  it("records environment boundaries without hidden local state or live-provider assumptions", () => {
    expect(devReadiness.toolchainEvidence.nodeEngine).toBe(gate.toolchainPinning.nodeEngine);
    expect(devReadiness.toolchainEvidence.pnpmPackageManager).toBe(
      gate.toolchainPinning.pnpmPackageManager,
    );
    expect(devReadiness.toolchainEvidence.lockfilePosture).toContain("pnpm-lock.yaml");
    expect(devReadiness.safeLocalConfiguration.optionalEnvironmentVariables).toEqual(
      gate.environmentBoundaries.optionalEnvironmentVariables,
    );
    expect(devReadiness.safeLocalConfiguration.realSecretsRequired).toBe(false);
    expect(devReadiness.safeLocalConfiguration.realTenantDataRequired).toBe(false);
    expect(devReadiness.safeLocalConfiguration.liveProviderRequired).toBe(false);
    expect(devReadiness.repositoryGovernance.hiddenLocalStateRequired).toBe(false);
    expect(devReadiness.repositoryGovernance.committedCodexOrClaudeArtifacts).toBe(false);

    expect(gate.environmentBoundaries.profileSelectionExplicit).toBe(true);
    expect(gate.environmentBoundaries.offlineNoNetworkDefault).toBe(true);
    expect(gate.environmentBoundaries.deterministicSeedsRequired).toBe(true);
    expect(gate.environmentBoundaries.deterministicClockBoundaryRequired).toBe(true);
    expect(gate.environmentBoundaries.timezoneLocaleSensitivityCovered).toBe(true);
    expect(gate.environmentBoundaries.pathCaseSensitivityCovered).toBe(true);
    expect(gate.environmentBoundaries.tempDirectoryCleanupRequired).toBe(true);
    expect(gate.environmentBoundaries.hiddenLocalStateRequired).toBe(false);
    expect(gate.environmentBoundaries.disallowedClaimEnvironmentClasses).toEqual(
      expect.arrayContaining(["staging", "production-shaped", "production-live"]),
    );
  });

  it("guards branch tag private-state and secret hygiene", () => {
    const branchPolicy = gate.versionControl.branchPolicy;
    for (const token of branchPolicy.forbiddenTokens) {
      expect(
        branchNameContainsForbiddenToken(branchPolicy.recommendedIssueBranch, token),
        `${branchPolicy.recommendedIssueBranch} contains ${token}`,
      ).toBe(false);
    }
    expect(branchPolicy.linearSuggestedBranchNotUsedBecauseContainsRedundantLocalUsf).toBe(true);
    expect(branchPolicy.draftPrRequiredUntilValidationPasses).toBe(true);
    expect(gate.versionControl.tagPolicy.createsTag).toBe(false);
    expect(gate.versionControl.cleanCheckout.dirtyGitStatusAllowed).toBe(false);
    expect(gate.versionControl.cleanCheckout.gitDiffCheckRequired).toBe(true);
    expect(gate.versionControl.cleanCheckout.gitStatusReviewRequired).toBe(true);

    for (const ignored of [".codex/", ".claude/", ".env", ".env.*"]) {
      expect(gitignoreText).toContain(ignored);
    }

    const trackedPrivateState = execFileSync("git", ["ls-files", ".codex", ".claude", ".env"], {
      encoding: "utf8",
    }).trim();
    expect(trackedPrivateState).toBe("");
    expect(gate.versionControl.hiddenLocalState.trackedPrivateStateAllowed).toBe(false);
    expect(gate.versionControl.secretScanning.secretLikeValuesAllowed).toBe(false);
    expect(gate.versionControl.secretScanning.rawEndpointValuesAllowed).toBe(false);
    expect(stringValues(gate).filter(hasSecretLikeValue)).toEqual([]);
  });

  it("keeps generated artifact derivation checks current and document-backed", () => {
    const artifactIds = gate.generatedArtifactChecks.map((row) => row.id).sort();
    expect(artifactIds).toEqual([
      "command-surface",
      "compose-test-target",
      "db-generated-types",
      "enterprise-evidence",
      "fixture-corpus",
      "obligation-manifest",
      "openapi-contract-check",
      "schema-registry",
      "test-readiness-planted-defects",
    ]);

    for (const row of gate.generatedArtifactChecks) {
      expect(existsSync(row.artifactPath), row.artifactPath).toBe(true);
      expect(existsSync(row.authorityPath), row.authorityPath).toBe(true);
      expect(row.derivedFromAuthority).toBe(true);
      expect(row.stalenessStatus).toBe("current");
      expect(row.directEditAllowed).toBe(false);
      expect(commandIsKnown(row.validationCommand), row.validationCommand).toBe(true);
    }

    for (const ownedPath of [
      "docs/architecture/environment-tooling-governance-test-gate.json",
      "docs/architecture/environment-tooling-governance-test-gate.md",
    ]) {
      expect(statSync(ownedPath).size).toBeLessThan(
        gate.versionControl.largeTransientArtifacts.maxOwnedEvidenceFileBytes,
      );
    }
  });

  it("preserves non-claim boundaries across source authorities", () => {
    for (const claim of requiredNonClaims) {
      expect(gate.nonClaims).toContain(claim);
    }
    for (const claim of commandSurface.nonClaims) {
      if (claim !== "full-react-product-parity") {
        expect(gate.nonClaims).toContain(claim);
      }
    }
    for (const claim of devReadiness.nonClaims) {
      expect(gate.nonClaims).toContain(claim);
    }

    expect(gate.allowedClaims).toEqual([
      "bounded-environment-tooling-governance-test-gate-defined",
    ]);
    expect(gate.scope.finalTestReadinessClaimAllowed).toBe(false);
    expect(gate.complianceBoundary.complianceAdjacentEvidenceOnly).toBe(true);
    for (const [key, value] of Object.entries(gate.complianceBoundary)) {
      if (key !== "complianceAdjacentEvidenceOnly") {
        expect(value, key).toBe(false);
      }
    }
  });

  it("has no findings in the supported USF-258 evidence state", () => {
    expect([...collectGateFindings(gate, "")]).toEqual([]);
  });

  it.each(gate.plantedDefectCases.map((row) => [row.id, row.expectedFinding] as const))(
    "catches planted defect: %s",
    (defectId, expectedFinding) => {
      const { candidate, dirtyGitStatus } = gateWithDefect(defectId);
      expect(collectGateFindings(candidate, dirtyGitStatus)).toContain(expectedFinding);
    },
  );
});
