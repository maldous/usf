import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Dirent } from "node:fs";
import { describe, expect, it } from "vitest";

interface PackageJson {
  readonly name: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly packageManager?: string;
  readonly engines?: Record<string, string>;
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
}

interface OwnerRule {
  readonly packageNamePattern?: string;
  readonly packageNames?: readonly string[];
  readonly owner: string;
}

interface ImagePolicyRow {
  readonly serviceId: string;
  readonly image: string;
  readonly owner: string;
  readonly pinningStatus: string;
  readonly provenanceStatus: string;
}

interface ComposeImageBlocker {
  readonly serviceId: string;
  readonly image: string;
  readonly blockerId: string;
}

interface SupplyChainEvidence {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly acceptanceCriteriaReadFromLinear: readonly string[];
  readonly enterpriseEvidenceRefs: Record<string, readonly string[]>;
  readonly ownedPaths: readonly string[];
  readonly claimBoundaries: Record<string, boolean>;
  readonly obligationMatrix: readonly { readonly id: string; readonly categoryId: string }[];
  readonly packageManagerPosture: {
    readonly packageManager: string;
    readonly nodeEngine: string;
    readonly pnpmEngine: string;
    readonly packageManagerPinned: boolean;
    readonly npmrcPath: string;
    readonly engineStrict: boolean;
    readonly sharedWorkspaceLockfile: boolean;
    readonly workspaceMinimumReleaseAgeExcludeRequired: readonly string[];
  };
  readonly workspaceBoundary: {
    readonly workspaceGlobs: readonly string[];
    readonly expectedPackageJsonCountIncludingRoot: number;
    readonly expectedWorkspacePackageCount: number;
    readonly workspacePackageNamePrefix: string;
  };
  readonly dependencyVersionPosture: {
    readonly expectedDependencyCount: number;
    readonly expectedDevDependencyCount: number;
    readonly dependencyOwnerRules: readonly OwnerRule[];
  };
  readonly lockfilePosture: {
    readonly lockfileVersion: string;
    readonly workspaceOverridePins: readonly {
      readonly packageName: string;
      readonly version: string;
    }[];
  } | null;
  readonly licencePosture: {
    readonly inventoryCommand: string;
    readonly freshInventoryCommitted: boolean;
    readonly licenceComplianceClearanceClaimAllowed: boolean;
    readonly knownBoundary: string;
    readonly reviewRequiredBeforeStrongerClaims: boolean;
  } | null;
  readonly advisoryPosture: {
    readonly auditCommand: string;
    readonly freshAdvisoryFixtureCommitted: boolean;
    readonly vulnerabilityClearanceClaimAllowed: boolean;
    readonly patchSlaClaimAllowed: boolean;
    readonly publicDisclosureProcessClaimAllowed: boolean;
    readonly reviewRequiredBeforeVersionChange: boolean;
  } | null;
  readonly sbomPosture: {
    readonly freshSbomGenerated: boolean;
    readonly sbomCommandPresentInPackageScripts: boolean;
    readonly freshSbomArtifactCommitted: boolean;
    readonly boundedDeferred: boolean;
    readonly issueLocalTestBacked: boolean;
    readonly sharedReadinessValidatorCategoryBacked: boolean;
    readonly freshSbomValidatorBacked: boolean;
    readonly blockerId: string;
    readonly sbomReadinessClaimAllowed: boolean;
  } | null;
  readonly provenancePosture: {
    readonly releaseArtifactProvenanceClaimAllowed: boolean;
    readonly packageSigningClaimAllowed: boolean;
    readonly containerSigningClaimAllowed: boolean;
  };
  readonly sdkGovernanceLinkage: {
    readonly requiredFields: readonly string[];
    readonly packageNamesRequiringEnterpriseRows: readonly string[];
  };
  readonly imagePinningPosture: {
    readonly composeTargetPath: string;
    readonly imageServiceCount: number;
    readonly composeImageLineCount: number;
    readonly digestPinnedServiceIds: readonly string[];
    readonly movingTagBlockers: readonly ComposeImageBlocker[];
    readonly composeTargetMissingImageBlockers: readonly ComposeImageBlocker[];
    readonly partialTagReviewRequired: readonly {
      readonly serviceId: string;
      readonly image: string;
    }[];
    readonly nonDigestImageProvenanceDeferred: boolean;
    readonly dockerComposeReadinessClaimAllowed: boolean;
  };
  readonly scriptBoundary: {
    readonly generatedArtifactAuthorityInversionAllowed: boolean;
    readonly realSecretsRequired: boolean;
    readonly realTenantDataRequired: boolean;
    readonly hiddenLocalStateRequired: boolean;
  };
  readonly plantedDefectFixture: {
    readonly path: string;
    readonly expectedFindings: readonly string[];
  };
  readonly blockers: readonly { readonly id: string }[];
  readonly nonClaims: readonly string[];
}

interface ObligationManifest {
  readonly expandedCategoryObligations: readonly {
    readonly issueId: string;
    readonly categoryId: string;
    readonly categoryClassId: string;
    readonly requiredCommandIds: readonly string[];
    readonly validationCommands: readonly string[];
    readonly enterpriseEvidenceRefs: Record<string, readonly string[]>;
    readonly testReadinessClaimAllowed: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly nonClaims: readonly string[];
  }[];
}

interface EnterpriseModel {
  readonly sdkDependencyGovernance: readonly Record<string, unknown>[];
  readonly [key: string]: unknown;
}

interface ServiceCatalogue {
  readonly services: readonly {
    readonly serviceId: string;
    readonly serviceOwner?: string;
    readonly riskOwner?: string;
    readonly controlOwner?: string;
    readonly composeService?: { readonly image?: string };
  }[];
}

interface PlantedDefect {
  readonly id: string;
  readonly expectedFinding: string;
  readonly packageJsonPatch?: Partial<PackageJson>;
  readonly evidencePatch?: Partial<SupplyChainEvidence>;
  readonly imagePolicyRow?: ImagePolicyRow;
}

interface PlantedDefects {
  readonly defects: readonly PlantedDefect[];
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

function listPackageJsonFiles(dir = ".", prefix = ""): string[] {
  const skip = new Set([".git", ".claude", "node_modules"]);
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }) as Dirent[]) {
    if (skip.has(entry.name)) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listPackageJsonFiles(fullPath, relPath));
    } else if (entry.isFile() && entry.name === "package.json") {
      files.push(relPath);
    }
  }
  return files.sort();
}

function dependencyEntries(pkg: PackageJson): [string, string][] {
  return [
    ...Object.entries(pkg.dependencies ?? {}),
    ...Object.entries(pkg.devDependencies ?? {}),
  ].sort(([left], [right]) => left.localeCompare(right));
}

function validatePackageSpecifiers(pkg: PackageJson): string[] {
  const findings: string[] = [];
  for (const [name, specifier] of dependencyEntries(pkg)) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(specifier)) {
      findings.push(`floating-dependency-specifier:${name}`);
    }
  }
  return findings;
}

function ownerForPackage(name: string, rules: readonly OwnerRule[]): string | undefined {
  for (const rule of rules) {
    if (rule.packageNames?.includes(name)) {
      return rule.owner;
    }
    if (rule.packageNamePattern !== undefined && new RegExp(rule.packageNamePattern).test(name)) {
      return rule.owner;
    }
  }
  return undefined;
}

function parseWorkspaceGlobs(workspaceYaml: string): string[] {
  const packagesBlock = workspaceYaml.match(/^packages:\n((?: {2}- .+\n)+)/m)?.[1] ?? "";
  return [...packagesBlock.matchAll(/^\s*-\s+"([^"]+)"\s*$/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

function matchesWorkspaceGlob(path: string, glob: string): boolean {
  const base = glob.replace("/*", "");
  return new RegExp(`^${base}/[^/]+/package\\.json$`).test(path);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRootImporterBlock(lockfile: string): string {
  const marker = "\n  .:\n";
  const start = lockfile.indexOf(marker);
  expect(start, "root importer must exist in pnpm-lock.yaml").toBeGreaterThanOrEqual(0);
  const rest = lockfile.slice(start + marker.length);
  const nextImporter = rest.search(/\n {2}[^ \n][^:\n]*:\s*(?:\{\}|$|\n)/);
  return nextImporter === -1 ? rest : rest.slice(0, nextImporter);
}

function getYamlEntryBlock(parentBlock: string, indent: number, key: string): string | undefined {
  const lines = parentBlock.split("\n");
  const startPattern = new RegExp(
    `^ {${indent}}['"]?${escapeRegex(key)}['"]?:\\s*(?:\\{\\})?\\s*$`,
  );
  const nextPattern = new RegExp(`^ {${indent}}\\S.*:\\s*(?:\\{\\})?\\s*$`);
  const start = lines.findIndex((line) => startPattern.test(line));
  if (start === -1) {
    return undefined;
  }
  const end = lines.findIndex((line, index) => index > start && nextPattern.test(line));
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

function yamlScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function directDependencyLockEntry(
  rootImporterBlock: string,
  name: string,
): { specifier?: string; version?: string } {
  const block = getYamlEntryBlock(rootImporterBlock, 6, name);
  expect(block, `lockfile root importer missing ${name}`).toBeDefined();
  const specifier = block?.match(/^ {8}specifier:\s+(.+)$/m)?.[1];
  const version = block?.match(/^ {8}version:\s+(.+)$/m)?.[1];
  const entry: { specifier?: string; version?: string } = {};
  if (specifier !== undefined) {
    entry.specifier = yamlScalar(specifier);
  }
  if (version !== undefined) {
    entry.version = yamlScalar(version);
  }
  return entry;
}

function parseComposeImageRefs(composeYaml: string): string[] {
  return [...composeYaml.matchAll(/^\s+image:\s+["']?([^"'\n]+)["']?\s*$/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

function imageTag(image: string): string | undefined {
  const withoutDigest = image.split("@sha256:")[0] ?? image;
  const lastSlash = withoutDigest.lastIndexOf("/");
  const lastColon = withoutDigest.lastIndexOf(":");
  return lastColon > lastSlash ? withoutDigest.slice(lastColon + 1) : undefined;
}

function isMovingImageTag(image: string): boolean {
  const tag = imageTag(image);
  return (
    tag === undefined || ["latest", "stable", "main", "master", "edge", "nightly"].includes(tag)
  );
}

function validateImagePolicyRows(rows: readonly ImagePolicyRow[]): string[] {
  const findings: string[] = [];
  for (const row of rows) {
    if (!row.owner) {
      findings.push(`missing-owner:${row.serviceId}`);
    }
    if (isMovingImageTag(row.image) && row.pinningStatus !== "moving-tag-blocker") {
      findings.push(`floating-compose-image-without-blocker:${row.serviceId}`);
    }
  }
  return findings;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergePatch<T>(base: T, patch: unknown): T {
  if (!isObject(base) || !isObject(patch)) {
    return patch as T;
  }
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = key in merged ? mergePatch(merged[key], value) : value;
  }
  return merged as T;
}

function validateEvidenceDocument(evidence: SupplyChainEvidence): string[] {
  const findings: string[] = [];
  if (
    !evidence.packageManagerPosture.packageManagerPinned ||
    !evidence.packageManagerPosture.engineStrict ||
    !evidence.packageManagerPosture.sharedWorkspaceLockfile ||
    evidence.packageManagerPosture.workspaceMinimumReleaseAgeExcludeRequired.length === 0
  ) {
    findings.push("missing-package-manager-toolchain-posture");
  }
  if (evidence.lockfilePosture === null) {
    findings.push("missing-lockfile-evidence");
  }
  if (evidence.licencePosture === null || !evidence.licencePosture.inventoryCommand) {
    findings.push("missing-licence-posture");
  }
  if (evidence.advisoryPosture === null || !evidence.advisoryPosture.auditCommand) {
    findings.push("missing-advisory-posture");
  }
  if (
    evidence.sbomPosture === null ||
    (!evidence.sbomPosture.freshSbomGenerated &&
      (!evidence.sbomPosture.boundedDeferred || evidence.sbomPosture.blockerId.length === 0))
  ) {
    findings.push("missing-sbom-or-deferred-evidence");
  }
  if (
    Object.entries(evidence.claimBoundaries).some(
      ([key, value]) => key.endsWith("ClaimAllowed") && value,
    )
  ) {
    findings.push("unsupported-supply-chain-readiness-overclaim");
  }
  return findings;
}

function findingCode(finding: string): string {
  return finding.split(":")[0] ?? finding;
}

const evidence = readJson<SupplyChainEvidence>(
  "docs/architecture/supply-chain-sbom-licence-test-gate.json",
);
const rootPackage = readJson<PackageJson>("package.json");
const lockfile = readText("pnpm-lock.yaml");
const npmrc = readText(".npmrc");
const workspaceYaml = readText("pnpm-workspace.yaml");
const manifest = readJson<ObligationManifest>(
  "docs/architecture/semantic-service-test-obligation-manifest.json",
);
const enterprise = readJson<EnterpriseModel>(
  "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json",
);
const serviceCatalogue = readJson<ServiceCatalogue>(
  "spec/instances/compose-service/service-catalogue.json",
);

const prohibitedNonClaims = [
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
];

describe("USF-255 supply-chain SBOM licence test gate", () => {
  it("maps issue evidence to the expanded obligation and enterprise rows", () => {
    expect(evidence.issueId).toBe("USF-255");
    expect(evidence.parentIssueId).toBe("USF-234");
    expect(evidence.acceptanceCriteriaReadFromLinear).toHaveLength(6);
    expect(evidence.ownedPaths).toContain("tests/packages/supply-chain-sbom-licence-gate.test.ts");
    expect(
      evidence.obligationMatrix.every((row) => row.categoryId === "supply-chain-sbom-licence"),
    ).toBe(true);

    const manifestRow = manifest.expandedCategoryObligations.find(
      (row) => row.issueId === "USF-255",
    );
    expect(manifestRow).toBeDefined();
    expect(manifestRow?.categoryId).toBe("supply-chain-sbom-licence");
    expect(manifestRow?.categoryClassId).toBe("supply-chain-sbom-licence");
    expect(manifestRow?.requiredCommandIds).toContain("test-readiness-supply-chain-sbom-licence");
    expect(manifestRow?.validationCommands).toContain(
      "corepack pnpm test -- tests/packages/supply-chain-sbom-licence-gate.test.ts",
    );
    expect(manifestRow?.testReadinessClaimAllowed).toBe(false);
    expect(manifestRow?.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(evidence.enterpriseEvidenceRefs).toEqual(manifestRow?.enterpriseEvidenceRefs);

    for (const [section, refs] of Object.entries(evidence.enterpriseEvidenceRefs)) {
      const rows = enterprise[section];
      expect(Array.isArray(rows), `${section} must exist in enterprise evidence model`).toBe(true);
      const ids = new Set(
        (rows as readonly Record<string, unknown>[]).map((row) => String(row.id)),
      );
      for (const ref of refs) {
        expect(ids.has(ref), `${section} missing ${ref}`).toBe(true);
      }
    }

    for (const nonClaim of prohibitedNonClaims) {
      expect(evidence.nonClaims).toContain(nonClaim);
      expect(manifestRow?.nonClaims).toContain(nonClaim);
    }
    expect(evidence.nonClaims).toContain("final-usf-234-acceptance");
    expect(evidence.claimBoundaries.finalUsf234AcceptanceClaimAllowed).toBe(false);
    expect(evidence.claimBoundaries.productionSupplyChainMaturityClaimAllowed).toBe(false);
  });

  it("validates package manager pinning lockfile alignment and exact dependency ownership", () => {
    expect(rootPackage.packageManager).toBe(evidence.packageManagerPosture.packageManager);
    expect(rootPackage.engines?.node).toBe(evidence.packageManagerPosture.nodeEngine);
    expect(rootPackage.engines?.pnpm).toBe(evidence.packageManagerPosture.pnpmEngine);
    expect(evidence.packageManagerPosture.packageManagerPinned).toBe(true);
    expect(evidence.packageManagerPosture.npmrcPath).toBe(".npmrc");
    expect(evidence.packageManagerPosture.engineStrict).toBe(true);
    expect(evidence.packageManagerPosture.sharedWorkspaceLockfile).toBe(true);
    expect(npmrc).toContain("engine-strict=true");
    expect(npmrc).toContain("shared-workspace-lockfile=true");
    for (const packageVersion of evidence.packageManagerPosture
      .workspaceMinimumReleaseAgeExcludeRequired) {
      expect(workspaceYaml).toContain(packageVersion);
    }

    expect(Object.keys(rootPackage.dependencies ?? {})).toHaveLength(
      evidence.dependencyVersionPosture.expectedDependencyCount,
    );
    expect(Object.keys(rootPackage.devDependencies ?? {})).toHaveLength(
      evidence.dependencyVersionPosture.expectedDevDependencyCount,
    );
    expect(validatePackageSpecifiers(rootPackage)).toEqual([]);

    for (const [name] of dependencyEntries(rootPackage)) {
      expect(
        ownerForPackage(name, evidence.dependencyVersionPosture.dependencyOwnerRules),
        `missing dependency owner rule for ${name}`,
      ).toBeDefined();
    }

    expect(lockfile).toContain(`lockfileVersion: '${evidence.lockfilePosture?.lockfileVersion}'`);
    expect(lockfile).toContain("autoInstallPeers: true");
    for (const override of evidence.lockfilePosture?.workspaceOverridePins ?? []) {
      expect(lockfile).toContain(`${override.packageName}: ${override.version}`);
    }

    const rootImporter = getRootImporterBlock(lockfile);
    for (const [name, specifier] of dependencyEntries(rootPackage)) {
      const entry = directDependencyLockEntry(rootImporter, name);
      expect(entry.specifier).toBe(specifier);
      expect(entry.version?.startsWith(specifier), `lockfile version mismatch for ${name}`).toBe(
        true,
      );
    }
  });

  it("validates workspace package boundaries and centralised external dependencies", () => {
    const packageFiles = listPackageJsonFiles();
    const workspaceGlobs = parseWorkspaceGlobs(workspaceYaml);
    expect(workspaceGlobs).toEqual(evidence.workspaceBoundary.workspaceGlobs);
    expect(packageFiles).toHaveLength(
      evidence.workspaceBoundary.expectedPackageJsonCountIncludingRoot,
    );

    const workspacePackageFiles = packageFiles.filter((path) => path !== "package.json");
    expect(workspacePackageFiles).toHaveLength(
      evidence.workspaceBoundary.expectedWorkspacePackageCount,
    );
    for (const file of workspacePackageFiles) {
      expect(
        workspaceGlobs.some((glob) => matchesWorkspaceGlob(file, glob)),
        `${file} workspace glob`,
      ).toBe(true);
      const pkg = readJson<PackageJson>(file);
      expect(pkg.name.startsWith(evidence.workspaceBoundary.workspacePackageNamePrefix)).toBe(true);
      expect(pkg.private).toBe(true);
      expect(pkg.version).toBe("0.1.0");
      expect(pkg.dependencies ?? {}).toEqual({});
      expect(pkg.devDependencies ?? {}).toEqual({});
      expect(pkg.peerDependencies ?? {}).toEqual({});
      expect(pkg.optionalDependencies ?? {}).toEqual({});
    }
  });

  it("validates licence advisory SBOM provenance and SDK governance boundaries", () => {
    expect(evidence.licencePosture?.inventoryCommand).toBe("corepack pnpm licenses list --json");
    expect(evidence.licencePosture?.freshInventoryCommitted).toBe(false);
    expect(evidence.licencePosture?.licenceComplianceClearanceClaimAllowed).toBe(false);
    expect(evidence.licencePosture?.knownBoundary).toContain("unionfs");
    expect(evidence.licencePosture?.reviewRequiredBeforeStrongerClaims).toBe(true);

    expect(evidence.advisoryPosture?.auditCommand).toBe("corepack pnpm audit --audit-level low");
    expect(evidence.advisoryPosture?.freshAdvisoryFixtureCommitted).toBe(false);
    expect(evidence.advisoryPosture?.vulnerabilityClearanceClaimAllowed).toBe(false);
    expect(evidence.advisoryPosture?.patchSlaClaimAllowed).toBe(false);
    expect(evidence.advisoryPosture?.publicDisclosureProcessClaimAllowed).toBe(false);
    expect(evidence.advisoryPosture?.reviewRequiredBeforeVersionChange).toBe(true);

    expect(evidence.sbomPosture?.freshSbomGenerated).toBe(false);
    expect(evidence.sbomPosture?.sbomCommandPresentInPackageScripts).toBe(false);
    expect(evidence.sbomPosture?.freshSbomArtifactCommitted).toBe(false);
    expect(evidence.sbomPosture?.boundedDeferred).toBe(true);
    expect(evidence.sbomPosture?.issueLocalTestBacked).toBe(true);
    expect(evidence.sbomPosture?.sharedReadinessValidatorCategoryBacked).toBe(true);
    expect(evidence.sbomPosture?.freshSbomValidatorBacked).toBe(false);
    expect(evidence.sbomPosture?.blockerId).toBe("usf255-sbom-generation-not-wired");
    expect(evidence.sbomPosture?.sbomReadinessClaimAllowed).toBe(false);

    expect(evidence.provenancePosture.releaseArtifactProvenanceClaimAllowed).toBe(false);
    expect(evidence.provenancePosture.packageSigningClaimAllowed).toBe(false);
    expect(evidence.provenancePosture.containerSigningClaimAllowed).toBe(false);

    const sdkRows = enterprise.sdkDependencyGovernance;
    for (const field of evidence.sdkGovernanceLinkage.requiredFields) {
      expect(
        sdkRows.every((row) => row[field] !== undefined),
        `missing ${field}`,
      ).toBe(true);
    }
    for (const packageName of evidence.sdkGovernanceLinkage.packageNamesRequiringEnterpriseRows) {
      const row = sdkRows.find((candidate) =>
        String(candidate.packageName ?? "")
          .split(",")
          .map((name) => name.trim())
          .includes(packageName),
      );
      expect(row, `missing SDK governance row for ${packageName}`).toBeDefined();
      expect(String(row?.licencePosture ?? "").length).toBeGreaterThan(20);
      expect(String(row?.securityAdvisoryPosture ?? "").length).toBeGreaterThan(20);
      expect(String(row?.updateDeprecationOwner ?? "").length).toBeGreaterThan(5);
    }

    const forbiddenScriptPatterns = [
      /curl\s+[^&|;]*https?:\/\/[^&|;]*\|\s*(?:bash|sh)/i,
      /wget\s+[^&|;]*https?:\/\/[^&|;]*\|\s*(?:bash|sh)/i,
      /\bnpx\s+/i,
      /\bpnpm\s+dlx\b/i,
      /https?:\/\/\S+/i,
    ];
    for (const [name, script] of Object.entries(rootPackage.scripts ?? {})) {
      for (const pattern of forbiddenScriptPatterns) {
        expect(pattern.test(script), `${name} has unapproved remote execution pattern`).toBe(false);
      }
    }
    expect(evidence.scriptBoundary.generatedArtifactAuthorityInversionAllowed).toBe(false);
    expect(evidence.scriptBoundary.realSecretsRequired).toBe(false);
    expect(evidence.scriptBoundary.realTenantDataRequired).toBe(false);
    expect(evidence.scriptBoundary.hiddenLocalStateRequired).toBe(false);
  });

  it("validates Compose image pinning posture against catalogue and generated Compose boundaries", () => {
    const catalogueImageRows = serviceCatalogue.services
      .filter((service) => service.composeService?.image !== undefined)
      .map((service) => ({
        serviceId: service.serviceId,
        image: service.composeService?.image ?? "",
        serviceOwner: service.serviceOwner,
        riskOwner: service.riskOwner,
        controlOwner: service.controlOwner,
      }));
    expect(catalogueImageRows).toHaveLength(evidence.imagePinningPosture.imageServiceCount);

    for (const row of catalogueImageRows) {
      expect(row.serviceOwner, `${row.serviceId} missing service owner`).toBeDefined();
      expect(row.riskOwner, `${row.serviceId} missing risk owner`).toBeDefined();
      expect(row.controlOwner, `${row.serviceId} missing control owner`).toBeDefined();
    }

    const composeImages = parseComposeImageRefs(
      readText(evidence.imagePinningPosture.composeTargetPath),
    );
    expect(composeImages).toHaveLength(evidence.imagePinningPosture.composeImageLineCount);
    const missingComposeImages = catalogueImageRows
      .filter((row) => !composeImages.includes(row.image))
      .map((row) => {
        const blocker = evidence.imagePinningPosture.composeTargetMissingImageBlockers.find(
          (candidate) => candidate.serviceId === row.serviceId,
        );
        return {
          serviceId: row.serviceId,
          image: row.image,
          blockerId: blocker?.blockerId ?? "missing-documented-blocker",
        };
      });
    expect(missingComposeImages).toEqual(
      evidence.imagePinningPosture.composeTargetMissingImageBlockers,
    );

    const digestPinned = catalogueImageRows
      .filter((row) => row.image.includes("@sha256:"))
      .map((row) => row.serviceId)
      .sort();
    expect(digestPinned).toEqual([...evidence.imagePinningPosture.digestPinnedServiceIds].sort());

    const movingImageRows = catalogueImageRows
      .filter((row) => isMovingImageTag(row.image))
      .map((row) => {
        const blocker = evidence.imagePinningPosture.movingTagBlockers.find(
          (candidate) => candidate.serviceId === row.serviceId,
        );
        return {
          serviceId: row.serviceId,
          image: row.image,
          blockerId: blocker?.blockerId ?? "missing-documented-blocker",
        };
      });
    expect(movingImageRows).toEqual(evidence.imagePinningPosture.movingTagBlockers);

    for (const row of evidence.imagePinningPosture.partialTagReviewRequired) {
      expect(
        catalogueImageRows.some(
          (candidate) => candidate.serviceId === row.serviceId && candidate.image === row.image,
        ),
        `${row.serviceId} partial tag review row must exist in service catalogue`,
      ).toBe(true);
    }
    expect(evidence.imagePinningPosture.nonDigestImageProvenanceDeferred).toBe(true);
    expect(evidence.imagePinningPosture.dockerComposeReadinessClaimAllowed).toBe(false);
  });

  it("rejects issue-local planted defects for missing posture and overclaims", () => {
    const planted = readJson<PlantedDefects>(evidence.plantedDefectFixture.path);
    expect(planted.defects.map((defect) => defect.expectedFinding).sort()).toEqual(
      [...evidence.plantedDefectFixture.expectedFindings].sort(),
    );

    for (const defect of planted.defects) {
      const findings = new Set<string>();
      if (defect.packageJsonPatch !== undefined) {
        for (const finding of validatePackageSpecifiers(
          mergePatch(rootPackage, defect.packageJsonPatch),
        )) {
          findings.add(findingCode(finding));
        }
      }
      if (defect.evidencePatch !== undefined) {
        for (const finding of validateEvidenceDocument(
          mergePatch(evidence, defect.evidencePatch),
        )) {
          findings.add(findingCode(finding));
        }
      }
      if (defect.imagePolicyRow !== undefined) {
        for (const finding of validateImagePolicyRows([defect.imagePolicyRow])) {
          findings.add(findingCode(finding));
        }
      }
      expect(findings.has(defect.expectedFinding), defect.id).toBe(true);
    }
  });
});
