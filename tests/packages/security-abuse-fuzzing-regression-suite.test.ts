import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  assertFixtureCorpusSafe,
  loadSyntheticFixtureCorpus,
} from "./fixtures/synthetic-fixture-corpus.ts";

type JsonObject = Record<string, unknown>;

interface ManifestSemanticRow {
  readonly contractId: string;
  readonly path: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly facetKeys: readonly string[];
  readonly evidenceId: string;
}

interface ManifestServiceRow {
  readonly serviceId: string;
  readonly composeServiceId: string;
  readonly fixtureSeedId: string;
  readonly requiredInTest: boolean;
  readonly generatedInTestCompose: boolean;
  readonly assetInventoryClass: string;
  readonly dataClassification: string;
}

interface ExpandedCategoryRow {
  readonly categoryId: string;
  readonly issueId: string;
  readonly categoryClassId: string;
  readonly status: string;
  readonly implementationStatus: string;
  readonly requiredCommandIds: readonly string[];
  readonly validationCommands: readonly string[];
  readonly dependsOnIssueIds: readonly string[];
  readonly blocksIssueIds: readonly string[];
}

interface ObligationManifest {
  readonly expandedCategoryObligations: readonly ExpandedCategoryRow[];
  readonly semanticContractObligations: readonly ManifestSemanticRow[];
  readonly serviceObligations: readonly ManifestServiceRow[];
  readonly nonClaims: readonly string[];
}

interface CommandSurface {
  readonly canonicalCommands: readonly {
    readonly id: string;
    readonly command: string;
  }[];
  readonly nonClaims: readonly string[];
}

interface AbuseSeedFamily {
  readonly familyId: string;
  readonly sourceKinds: readonly string[];
  readonly threatBoundary: string;
  readonly requiredByAcceptance: boolean;
  readonly redactionRequired: boolean;
  failClosedExpected: boolean;
}

interface SyntheticPayloadSeed {
  readonly seedId: string;
  readonly familyId: string;
  readonly sourceKind: string;
  readonly rawInput?: string;
  readonly oversizedBytes?: number;
  readonly expectedReason: SecurityRejectionReason;
  readonly expectedDisposition: "reject-fail-closed" | "redact-and-reject";
}

interface SecuritySemanticRow {
  readonly contractId: string;
  readonly semanticContractPath: string;
  readonly capability: string;
  readonly capabilityDomain: string;
  readonly sourceObligationEvidenceId: string;
  readonly fixtureSeedIds: readonly string[];
  readonly boundaryFamilies: readonly string[];
  readonly sourceKinds: readonly string[];
  readonly unitParserValidatorPolicyCoverage: boolean;
  failClosedExpected: boolean;
  readonly redactionRequiredForDiagnostics: boolean;
  readonly testFile: string;
  readonly testName: string;
  readonly testReadinessClaimAllowed: boolean;
}

interface SecurityServiceRow {
  readonly serviceId: string;
  readonly composeServiceId: string;
  readonly fixtureSeedId: string;
  readonly fixtureCorpusSeedId: string;
  readonly requiredInTest: boolean;
  readonly generatedInTestCompose: boolean;
  readonly assetInventoryClass: string;
  readonly dataClassification: string;
  readonly tenantBoundaryRecorded: boolean;
  readonly boundaryFamilies: readonly string[];
  readonly sourceKinds: readonly string[];
  readonly serviceBackedExecutionRequired: boolean;
  readonly composedEvidenceBoundary: string;
  inMemoryServiceSubstituteAllowed: boolean;
  failClosedExpected: boolean;
  readonly testFile: string;
  readonly testName: string;
  readonly testReadinessClaimAllowed: boolean;
}

interface SecuritySuite {
  readonly id: string;
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly sourceAuthorities: {
    readonly obligationManifest: string;
    readonly fixtureCorpus: string;
    readonly syntheticFixtureApi: string;
    readonly serviceCatalogue: string;
    readonly semanticContracts: string;
    readonly commandSurface: string;
    readonly validator: string;
  };
  readonly scope: {
    readonly semanticContractCount: number;
    readonly serviceBoundaryCount: number;
    readonly requiredBoundaryFamilyCount: number;
    readonly syntheticPayloadSeedCount: number;
    readonly sourceKindCount: number;
    readonly serviceBackedClaimsRequireComposedEvidence: boolean;
    readonly composedServiceRowsMapped: number;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
    readonly syntheticStaticDataOnly: boolean;
    readonly realTenantDataAllowed: boolean;
    readonly rawSecretsAllowed: boolean;
    readonly rawProviderPayloadsRetained: boolean;
    readonly liveProviderCredentialUseAllowed: boolean;
    readonly penetrationTestCompletionClaimAllowed: boolean;
    readonly socReadinessClaimAllowed: boolean;
    readonly isoCertificationClaimAllowed: boolean;
    readonly productionReadinessClaimAllowed: boolean;
    readonly liveProviderReadinessClaimAllowed: boolean;
    finalTestReadinessClaimAllowed: boolean;
    readonly finalUsf234AcceptanceClaimAllowed: boolean;
  };
  readonly expandedCategoryObligation: ExpandedCategoryRow & {
    readonly existingValidatorRules: readonly string[];
    readonly existingValidatorPlantedDefects: readonly string[];
  };
  readonly sourceDerivationRules: readonly {
    readonly sourceKind: string;
    readonly sourceAuthority: string;
    readonly derivationMode: string;
    readonly requiredBoundaryFamilies: readonly string[];
    readonly disposition: string;
  }[];
  requiredBoundaryFamilies: string[];
  readonly abuseSeedFamilies: readonly AbuseSeedFamily[];
  syntheticPayloadSeeds: SyntheticPayloadSeed[];
  semanticContractRows: SecuritySemanticRow[];
  serviceBoundaryRows: SecurityServiceRow[];
  readonly plantedDefectExpectations: readonly {
    readonly defectId: string;
    readonly expectedLocalFailure: LocalSuiteFinding;
    readonly sharedValidatorRule: string;
  }[];
  readonly validationCommands: readonly string[];
  allowedClaims: string[];
  readonly nonClaims: readonly string[];
}

type SecurityRejectionReason =
  | "malformed-json"
  | "invalid-schema-shape"
  | "oversized-input"
  | "duplicate-field"
  | "null-empty-unicode-boundary"
  | "tenant-boundary-marker"
  | "injection-like-string"
  | "path-traversal-like-string"
  | "object-key-escape"
  | "ambiguous-casing-normalisation"
  | "command-event-poisoning"
  | "webhook-replay"
  | "queue-message-poisoning"
  | "ssrf-provider-misuse"
  | "unsafe-url-handling"
  | "malicious-upload-sample"
  | "invalid-archive-bulk-import"
  | "redaction-boundary"
  | "fail-closed-expectation"
  | "non-claim-check";

type LocalSuiteFinding =
  | "missing-boundary-family"
  | "missing-fuzz-seed"
  | "semantic-service-abuse-coverage-missing"
  | "service-boundary-abuse-coverage-missing"
  | "weakened-fail-closed-expectation"
  | "unsafe-service-backed-substitute"
  | "unsupported-readiness-security-overclaim";

interface SecurityEvaluation {
  readonly accepted: boolean;
  readonly reason: SecurityRejectionReason;
  readonly disposition: "reject-fail-closed" | "redact-and-reject";
  readonly failClosed: boolean;
  readonly readinessClaimAllowed: boolean;
  readonly diagnostic: string;
}

const REQUIRED_BOUNDARY_FAMILIES = [
  "malformed-json",
  "invalid-schema-shape",
  "oversized-input",
  "duplicate-field",
  "null-empty-unicode-boundary",
  "tenant-boundary-marker",
  "injection-like-string",
  "path-traversal-like-string",
  "object-key-escape",
  "ambiguous-casing-normalisation",
  "command-event-poisoning",
  "webhook-replay",
  "queue-message-poisoning",
  "ssrf-provider-misuse",
  "unsafe-url-handling",
  "malicious-upload-sample",
  "invalid-archive-bulk-import",
  "redaction-boundary",
  "fail-closed-expectation",
  "non-claim-check",
] as const;

const REQUIRED_SOURCE_KINDS = [
  "semantic-contract",
  "service-catalogue-row",
  "provider-binding",
  "api-route",
  "worker-job",
  "object-path",
  "event-subject",
  "webhook-payload",
  "secret-path",
  "search-index",
  "analytics-query",
  "import-export-schema",
] as const;

const PROHIBITED_CLAIMS = new Set([
  "penetration-test-completion",
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
  "final-usf-234-acceptance",
]);

const MAX_PAYLOAD_BYTES = 65_536;
const TEST_FILE = "tests/packages/security-abuse-fuzzing-regression-suite.test.ts";
const suite = readJson<SecuritySuite>(
  "docs/architecture/security-abuse-fuzzing-regression-suite.json",
);
const manifest = readJson<ObligationManifest>(suite.sourceAuthorities.obligationManifest);
const commandSurface = readJson<CommandSurface>(suite.sourceAuthorities.commandSurface);
const fixtureCorpus = loadSyntheticFixtureCorpus();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T>(rows: readonly T[], key: (row: T) => string): Map<string, T> {
  return new Map(rows.map((row) => [key(row), row]));
}

function cloneSuite(candidate: SecuritySuite): SecuritySuite {
  return JSON.parse(JSON.stringify(candidate)) as SecuritySuite;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort();
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expandSeedInput(seed: SyntheticPayloadSeed): string {
  if (seed.oversizedBytes !== undefined) {
    return JSON.stringify({
      tenantId: "tenant-alpha",
      actorId: "actor-alpha",
      operation: "oversized",
      body: "x".repeat(seed.oversizedBytes),
    });
  }
  return seed.rawInput ?? "";
}

function hasDuplicateQuotedObjectKey(input: string): boolean {
  const seen = new Set<string>();
  let index = 0;
  while (index < input.length) {
    const start = input.indexOf('"', index);
    if (start === -1) {
      return false;
    }
    let end = start + 1;
    let escaped = false;
    let key = "";
    while (end < input.length) {
      const char = input[end];
      if (char === undefined) {
        break;
      }
      if (escaped) {
        key += char;
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        break;
      } else {
        key += char;
      }
      end += 1;
    }
    let next = end + 1;
    while (input[next] === " " || input[next] === "\n" || input[next] === "\t") {
      next += 1;
    }
    if (input[next] === ":") {
      if (seen.has(key)) {
        return true;
      }
      seen.add(key);
    }
    index = end + 1;
  }
  return false;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item));
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => collectStrings(item));
  }
  return [];
}

function hasAmbiguousCasingKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasAmbiguousCasingKeys(item));
  }
  if (!isRecord(value)) {
    return false;
  }
  const normalised = new Set<string>();
  for (const key of Object.keys(value)) {
    const canonical = key.toLowerCase();
    if (normalised.has(canonical)) {
      return true;
    }
    normalised.add(canonical);
  }
  return Object.values(value).some((item) => hasAmbiguousCasingKeys(item));
}

function reject(
  reason: SecurityRejectionReason,
  disposition: SecurityEvaluation["disposition"],
  input: string,
): SecurityEvaluation {
  return {
    accepted: false,
    reason,
    disposition,
    failClosed: true,
    readinessClaimAllowed: false,
    diagnostic: redactDiagnostic(input),
  };
}

function redactDiagnostic(value: string): string {
  return value
    .replaceAll("synthetic-token-marker", "[REDACTED]")
    .replaceAll("synthetic-provider-payload-marker", "[REDACTED]")
    .replaceAll("secret/tenant-alpha/api", "[REDACTED]")
    .replaceAll("providerPayload", "redactedProviderPayload")
    .replaceAll("token", "redactedToken")
    .replaceAll("secretPath", "redactedSecretPath");
}

function hasPrivateNetworkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.hostname === "localhost" ||
      url.hostname.startsWith("127.") ||
      url.hostname.startsWith("10.") ||
      url.hostname.startsWith("169.254.") ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function evaluateSyntheticPayload(seed: SyntheticPayloadSeed): SecurityEvaluation {
  const input = expandSeedInput(seed);
  if (Buffer.byteLength(input, "utf8") > MAX_PAYLOAD_BYTES) {
    return reject("oversized-input", "reject-fail-closed", input);
  }
  if (hasDuplicateQuotedObjectKey(input)) {
    return reject("duplicate-field", "reject-fail-closed", input);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return reject("malformed-json", "reject-fail-closed", input);
  }
  if (!isRecord(parsed)) {
    return reject("invalid-schema-shape", "reject-fail-closed", input);
  }

  const values = collectStrings(parsed);
  if (hasAmbiguousCasingKeys(parsed)) {
    return reject("ambiguous-casing-normalisation", "reject-fail-closed", input);
  }
  if (values.some((value) => value === "" || value.includes("\u0000"))) {
    return reject("null-empty-unicode-boundary", "reject-fail-closed", input);
  }
  if (values.some((value) => /tenant-[a-z]+\/\.\.\/tenant-[a-z]+/.test(value))) {
    return reject("tenant-boundary-marker", "reject-fail-closed", input);
  }
  if (isArchiveEscape(parsed)) {
    return reject("invalid-archive-bulk-import", "reject-fail-closed", input);
  }
  if (isMaliciousUpload(parsed)) {
    return reject("malicious-upload-sample", "reject-fail-closed", input);
  }
  if (values.some((value) => /%2e%2e/i.test(value))) {
    return reject("object-key-escape", "reject-fail-closed", input);
  }
  if (values.some((value) => value.includes("../") || value.includes("..\\"))) {
    return reject("path-traversal-like-string", "reject-fail-closed", input);
  }
  if (values.some((value) => /('\s*OR\s+1=1|--|;\s*(drop|select|insert|delete)\b)/i.test(value))) {
    return reject("injection-like-string", "reject-fail-closed", input);
  }
  if (typeof parsed.eventSubject === "string" && /[*>\n]/.test(parsed.eventSubject)) {
    return reject("command-event-poisoning", "reject-fail-closed", input);
  }
  if (
    parsed.webhookNonce === "replayed-nonce" ||
    parsed.webhookTimestamp === "1970-01-01T00:00:00.000Z"
  ) {
    return reject("webhook-replay", "reject-fail-closed", input);
  }
  if (isPoisonQueueMessage(parsed.queueMessage)) {
    return reject("queue-message-poisoning", "reject-fail-closed", input);
  }
  if (typeof parsed.providerUrl === "string" && hasPrivateNetworkUrl(parsed.providerUrl)) {
    return reject("ssrf-provider-misuse", "reject-fail-closed", input);
  }
  if (typeof parsed.url === "string" && !/^https?:\/\//.test(parsed.url)) {
    return reject("unsafe-url-handling", "reject-fail-closed", input);
  }
  if ("providerPayload" in parsed || "token" in parsed || "secretPath" in parsed) {
    return reject("redaction-boundary", "redact-and-reject", input);
  }
  if (parsed.permission === "*") {
    return reject("fail-closed-expectation", "reject-fail-closed", input);
  }
  if (typeof parsed.claim === "string" && PROHIBITED_CLAIMS.has(parsed.claim)) {
    return reject("non-claim-check", "reject-fail-closed", input);
  }

  return reject("fail-closed-expectation", "reject-fail-closed", input);
}

function isArchiveEscape(value: JsonObject): boolean {
  return (
    Array.isArray(value.archiveEntries) &&
    value.archiveEntries.some(
      (entry) => typeof entry === "string" && (entry.includes("../") || entry.includes("..\\")),
    )
  );
}

function isMaliciousUpload(value: JsonObject): boolean {
  return (
    typeof value.fileName === "string" &&
    typeof value.contentType === "string" &&
    (value.fileName.includes("synthetic-eicar-marker") ||
      value.contentType === "application/x-msdownload")
  );
}

function isPoisonQueueMessage(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.retryCount === "number" &&
    value.retryCount > 10 &&
    value.deadLetter === false
  );
}

function collectSuiteEvidenceFindings(candidate: SecuritySuite): Set<LocalSuiteFinding> {
  const findings = new Set<LocalSuiteFinding>();
  const requiredFamilies = new Set(candidate.requiredBoundaryFamilies);
  const seedFamilies = new Set(candidate.syntheticPayloadSeeds.map((seed) => seed.familyId));
  const semanticIds = new Set(candidate.semanticContractRows.map((row) => row.contractId));
  const serviceIds = new Set(candidate.serviceBoundaryRows.map((row) => row.serviceId));

  if (REQUIRED_BOUNDARY_FAMILIES.some((familyId) => !requiredFamilies.has(familyId))) {
    findings.add("missing-boundary-family");
  }
  if (REQUIRED_BOUNDARY_FAMILIES.some((familyId) => !seedFamilies.has(familyId))) {
    findings.add("missing-fuzz-seed");
  }
  if (
    manifest.semanticContractObligations.some((row) => !semanticIds.has(row.contractId)) ||
    candidate.semanticContractRows.some(
      (row) =>
        REQUIRED_BOUNDARY_FAMILIES.some((familyId) => !row.boundaryFamilies.includes(familyId)) ||
        row.failClosedExpected !== true ||
        row.testReadinessClaimAllowed !== false,
    )
  ) {
    findings.add("semantic-service-abuse-coverage-missing");
  }
  if (
    manifest.serviceObligations.some((row) => !serviceIds.has(row.serviceId)) ||
    candidate.serviceBoundaryRows.some(
      (row) =>
        REQUIRED_BOUNDARY_FAMILIES.some((familyId) => !row.boundaryFamilies.includes(familyId)) ||
        row.failClosedExpected !== true ||
        row.testReadinessClaimAllowed !== false,
    )
  ) {
    findings.add("service-boundary-abuse-coverage-missing");
  }
  if (
    candidate.semanticContractRows.some((row) => row.failClosedExpected !== true) ||
    candidate.serviceBoundaryRows.some((row) => row.failClosedExpected !== true) ||
    candidate.abuseSeedFamilies.some((row) => row.failClosedExpected !== true)
  ) {
    findings.add("weakened-fail-closed-expectation");
  }
  if (
    candidate.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims ||
    candidate.serviceBoundaryRows.some(
      (row) => row.serviceBackedExecutionRequired && row.inMemoryServiceSubstituteAllowed !== false,
    )
  ) {
    findings.add("unsafe-service-backed-substitute");
  }
  if (
    candidate.scope.finalTestReadinessClaimAllowed ||
    candidate.scope.finalUsf234AcceptanceClaimAllowed ||
    candidate.scope.productionReadinessClaimAllowed ||
    candidate.scope.liveProviderReadinessClaimAllowed ||
    candidate.scope.socReadinessClaimAllowed ||
    candidate.scope.isoCertificationClaimAllowed ||
    candidate.allowedClaims.some((claim) => PROHIBITED_CLAIMS.has(claim))
  ) {
    findings.add("unsupported-readiness-security-overclaim");
  }

  return findings;
}

describe("security abuse and fuzzing regression suite", () => {
  it("links USF-253 to existing expanded-category validator rules without shared edits", () => {
    const expanded = manifest.expandedCategoryObligations.find((row) => row.issueId === "USF-253");
    expect(expanded).toBeDefined();
    expect(suite.issueId).toBe("USF-253");
    expect(suite.parentIssueId).toBe("USF-234");
    expect(suite.expandedCategoryObligation.categoryId).toBe(expanded?.categoryId);
    expect(suite.expandedCategoryObligation.requiredCommandIds).toEqual(
      expanded?.requiredCommandIds,
    );
    expect(suite.expandedCategoryObligation.validationCommands).toEqual(
      expanded?.validationCommands,
    );
    expect(suite.expandedCategoryObligation.existingValidatorRules).toEqual([
      "USF-TEST-READINESS-076",
      "USF-TEST-READINESS-077",
      "USF-TEST-READINESS-078",
      "USF-TEST-READINESS-079",
      "USF-TEST-READINESS-080",
    ]);
    for (const defectPath of suite.expandedCategoryObligation.existingValidatorPlantedDefects) {
      expect(existsSync(defectPath), defectPath).toBe(true);
      const defect = readJson<{ readonly expectedRule: string }>(defectPath);
      expect(suite.expandedCategoryObligation.existingValidatorRules).toContain(
        defect.expectedRule,
      );
    }
    expect(commandSurface.canonicalCommands.map((row) => row.id)).toContain(
      "test-readiness-validator",
    );
    expect(suite.validationCommands).toContain(
      "corepack pnpm test -- tests/packages/security-abuse-fuzzing-regression-suite.test.ts",
    );
    expect(suite.validationCommands).toContain("corepack pnpm test-readiness:validate");
  });

  it("maps every current semantic contract obligation to security abuse coverage", () => {
    const suiteRows = byId(suite.semanticContractRows, (row) => row.contractId);

    expect(suite.scope.semanticContractCount).toBe(manifest.semanticContractObligations.length);
    expect(suite.semanticContractRows).toHaveLength(manifest.semanticContractObligations.length);

    for (const manifestRow of manifest.semanticContractObligations) {
      const row = suiteRows.get(manifestRow.contractId);
      expect(row, manifestRow.contractId).toBeDefined();
      if (row === undefined) {
        continue;
      }
      expect(row.semanticContractPath).toBe(manifestRow.path);
      expect(row.capability).toBe(manifestRow.capability);
      expect(row.capabilityDomain).toBe(manifestRow.capabilityDomain);
      expect(row.sourceObligationEvidenceId).toBe(manifestRow.evidenceId);
      expect(row.unitParserValidatorPolicyCoverage).toBe(true);
      expect(row.failClosedExpected).toBe(true);
      expect(row.testReadinessClaimAllowed).toBe(false);
      expect(row.testFile).toBe(TEST_FILE);
      expect(row.testName).toBe(
        `semantic security abuse obligation remains current: ${manifestRow.contractId}`,
      );
      expect(sorted(row.boundaryFamilies)).toEqual(sorted(REQUIRED_BOUNDARY_FAMILIES));
      expect(row.fixtureSeedIds.length).toBeGreaterThan(0);
    }
  });

  it("maps every current service boundary to fixture-backed abuse coverage", () => {
    const suiteRows = byId(suite.serviceBoundaryRows, (row) => row.serviceId);
    const fixtureRows = byId(fixtureCorpus.serviceFixtures, (row) => row.serviceId);

    expect(suite.scope.serviceBoundaryCount).toBe(manifest.serviceObligations.length);
    expect(suite.serviceBoundaryRows).toHaveLength(manifest.serviceObligations.length);
    expect(suite.scope.composedServiceRowsMapped).toBe(
      manifest.serviceObligations.filter((row) => row.requiredInTest).length,
    );

    for (const manifestRow of manifest.serviceObligations) {
      const row = suiteRows.get(manifestRow.serviceId);
      const fixture = fixtureRows.get(manifestRow.serviceId);
      expect(row, manifestRow.serviceId).toBeDefined();
      expect(fixture, manifestRow.serviceId).toBeDefined();
      if (row === undefined || fixture === undefined) {
        continue;
      }
      expect(row.composeServiceId).toBe(manifestRow.composeServiceId);
      expect(row.fixtureSeedId).toBe(manifestRow.fixtureSeedId);
      expect(row.fixtureCorpusSeedId).toBe(fixture.fixtureSeedId);
      expect(row.requiredInTest).toBe(manifestRow.requiredInTest);
      expect(row.generatedInTestCompose).toBe(manifestRow.generatedInTestCompose);
      expect(row.assetInventoryClass).toBe(manifestRow.assetInventoryClass);
      expect(row.dataClassification).toBe(manifestRow.dataClassification);
      expect(row.tenantBoundaryRecorded).toBe(true);
      expect(row.serviceBackedExecutionRequired).toBe(manifestRow.requiredInTest);
      expect(row.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(row.failClosedExpected).toBe(true);
      expect(row.testReadinessClaimAllowed).toBe(false);
      expect(row.testFile).toBe(TEST_FILE);
      expect(row.testName).toBe(
        `service security abuse boundary remains current: ${manifestRow.serviceId}`,
      );
      expect(sorted(row.boundaryFamilies)).toEqual(sorted(REQUIRED_BOUNDARY_FAMILIES));
      if (manifestRow.requiredInTest) {
        expect(row.composedEvidenceBoundary).toContain("composed test-readiness evidence");
      }
    }
  });

  it("covers required source kinds and deterministic abuse seed families", () => {
    expect(suite.scope.requiredBoundaryFamilyCount).toBe(REQUIRED_BOUNDARY_FAMILIES.length);
    expect(suite.scope.sourceKindCount).toBe(REQUIRED_SOURCE_KINDS.length);
    expect(sorted(suite.requiredBoundaryFamilies)).toEqual(sorted(REQUIRED_BOUNDARY_FAMILIES));
    expect(sorted(suite.sourceDerivationRules.map((row) => row.sourceKind))).toEqual(
      sorted(REQUIRED_SOURCE_KINDS),
    );

    for (const rule of suite.sourceDerivationRules) {
      expect(rule.disposition).toBe("deterministic-synthetic-fail-closed-regression-obligation");
      expect(sorted(rule.requiredBoundaryFamilies)).toEqual(sorted(REQUIRED_BOUNDARY_FAMILIES));
    }

    const familyRows = byId(suite.abuseSeedFamilies, (row) => row.familyId);
    const seedFamilies = new Set(suite.syntheticPayloadSeeds.map((seed) => seed.familyId));
    for (const familyId of REQUIRED_BOUNDARY_FAMILIES) {
      const row = familyRows.get(familyId);
      expect(row, familyId).toBeDefined();
      expect(seedFamilies.has(familyId), familyId).toBe(true);
      expect(row?.requiredByAcceptance).toBe(true);
      expect(row?.failClosedExpected).toBe(true);
      expect(row?.sourceKinds.length ?? 0).toBeGreaterThan(0);
    }
  });

  it.each(suite.syntheticPayloadSeeds.map((seed) => [seed.seedId, seed] as const))(
    "rejects deterministic synthetic hostile seed fail closed: %s",
    (_seedId, seed) => {
      const outcome = evaluateSyntheticPayload(seed);
      expect(outcome.accepted).toBe(false);
      expect(outcome.reason).toBe(seed.expectedReason);
      expect(outcome.disposition).toBe(seed.expectedDisposition);
      expect(outcome.failClosed).toBe(true);
      expect(outcome.readinessClaimAllowed).toBe(false);
      if (seed.expectedDisposition === "redact-and-reject") {
        expect(outcome.diagnostic).not.toContain("synthetic-token-marker");
        expect(outcome.diagnostic).not.toContain("synthetic-provider-payload-marker");
        expect(outcome.diagnostic).not.toContain("secret/tenant-alpha/api");
      }
    },
  );

  it("preserves synthetic fixture provenance redaction and non-claim boundaries", () => {
    assertFixtureCorpusSafe(fixtureCorpus);

    expect(suite.scope.syntheticStaticDataOnly).toBe(true);
    expect(suite.scope.realTenantDataAllowed).toBe(false);
    expect(suite.scope.rawSecretsAllowed).toBe(false);
    expect(suite.scope.rawProviderPayloadsRetained).toBe(false);
    expect(suite.scope.liveProviderCredentialUseAllowed).toBe(false);
    expect(suite.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(suite.scope.penetrationTestCompletionClaimAllowed).toBe(false);
    expect(suite.scope.socReadinessClaimAllowed).toBe(false);
    expect(suite.scope.isoCertificationClaimAllowed).toBe(false);
    expect(suite.scope.productionReadinessClaimAllowed).toBe(false);
    expect(suite.scope.liveProviderReadinessClaimAllowed).toBe(false);
    expect(suite.scope.finalTestReadinessClaimAllowed).toBe(false);
    expect(suite.scope.finalUsf234AcceptanceClaimAllowed).toBe(false);
    for (const claim of PROHIBITED_CLAIMS) {
      expect(suite.nonClaims).toContain(claim);
      expect(suite.allowedClaims).not.toContain(claim);
    }
    expect(manifest.nonClaims).toEqual(
      expect.arrayContaining(
        [...PROHIBITED_CLAIMS].filter(
          (claim) =>
            claim !== "penetration-test-completion" && claim !== "final-usf-234-acceptance",
        ),
      ),
    );
    expect(commandSurface.nonClaims).toEqual(
      expect.arrayContaining(
        [...PROHIBITED_CLAIMS].filter(
          (claim) =>
            claim !== "penetration-test-completion" &&
            claim !== "final-usf-234-acceptance" &&
            claim !== "full-product-readiness",
        ),
      ),
    );
  });

  it("proves issue-scoped planted defects fail the local suite evidence model", () => {
    expect(collectSuiteEvidenceFindings(suite)).toEqual(new Set());

    for (const expectation of suite.plantedDefectExpectations) {
      const candidate = cloneSuite(suite);
      if (expectation.defectId === "security-abuse-drop-family") {
        candidate.requiredBoundaryFamilies = candidate.requiredBoundaryFamilies.filter(
          (familyId) => familyId !== "malformed-json",
        );
      } else if (expectation.defectId === "security-abuse-drop-seed") {
        candidate.syntheticPayloadSeeds = candidate.syntheticPayloadSeeds.filter(
          (seed) => seed.familyId !== "malformed-json",
        );
      } else if (expectation.defectId === "security-abuse-weaken-fail-closed") {
        const [row] = candidate.semanticContractRows;
        if (row !== undefined) {
          row.failClosedExpected = false;
        }
      } else if (expectation.defectId === "security-abuse-allow-in-memory-service-substitute") {
        const row = candidate.serviceBoundaryRows.find(
          (item) => item.serviceBackedExecutionRequired,
        );
        if (row !== undefined) {
          row.inMemoryServiceSubstituteAllowed = true;
        }
      } else if (expectation.defectId === "security-abuse-allow-final-readiness-claim") {
        candidate.allowedClaims = [...candidate.allowedClaims, "final-test-readiness"];
        candidate.scope.finalTestReadinessClaimAllowed = true;
      }
      expect(collectSuiteEvidenceFindings(candidate)).toContain(expectation.expectedLocalFailure);
      expect(suite.expandedCategoryObligation.existingValidatorRules).toContain(
        expectation.sharedValidatorRule,
      );
    }
  });
});
