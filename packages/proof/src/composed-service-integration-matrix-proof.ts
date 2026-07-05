import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MATRIX_PATH = "docs/architecture/composed-service-integration-test-matrix.json";
const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const PROOF_COMMAND = "corepack pnpm test-readiness:integration";

const REQUIRED_SERVICE_COVERAGE = [
  "startReadiness",
  "seed",
  "positiveOperation",
  "negativeOperation",
  "degradedUnavailable",
  "cleanup",
  "teardown",
  "reset",
  "auditObservability",
  "composeTargetMetadata",
  "serviceSpecificReadiness",
  "hostBindingPosture",
  "generatedComposeDerivation",
  "redaction",
] as const;

const REQUIRED_PROFILE_FLAGS = [
  "mustStart",
  "mustReadinessCheck",
  "mustSeed",
  "mustExercise",
  "mustTeardown",
  "mustReset",
  "mustEvidence",
] as const;

const PROHIBITED_CLAIMS = new Set([
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
  "usf-234-closure",
]);

interface ServiceIntegrationRow {
  readonly serviceId: string;
  readonly serviceCatalogueId: string;
  readonly composeTarget: string;
  readonly generatedInTestCompose: boolean;
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly fixtureSeedId?: string;
  readonly lifecycleApi?: Record<string, string>;
  readonly proofCommand: string;
  readonly evidenceTests?: Record<string, string>;
  readonly nonClaims?: string[];
}

interface ProfileIntegrationRow {
  readonly profile: string;
  readonly composeTarget: string;
  readonly serviceIds: string[];
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly proofCommand: string;
  readonly nonClaims?: string[];
  readonly [key: string]: unknown;
}

interface CatalogueDispositionRow {
  readonly serviceCatalogueId: string;
  readonly generatedComposeServiceId?: string | null;
  readonly testDisposition: string;
  readonly boundedRationale?: string;
  readonly followUpIssueIds?: string[];
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly nonClaims?: string[];
}

interface ComposedServiceIntegrationMatrix {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly composeTarget: string;
  readonly proofCommand: string;
  readonly generatedServiceCount: number;
  readonly profileCount: number;
  readonly serviceCatalogueDispositionCount: number;
  readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly serviceIntegrationRows: ServiceIntegrationRow[];
  readonly profileIntegrationRows: ProfileIntegrationRow[];
  readonly serviceCatalogueDispositionRows: CatalogueDispositionRow[];
  readonly allowedClaims?: string[];
  readonly nonClaims?: string[];
}

export interface ComposedServiceIntegrationMatrixSummary {
  readonly status: "pass";
  readonly issueId: "USF-242";
  readonly parentIssueId: "USF-234";
  readonly composeTarget: typeof COMPOSE_TARGET;
  readonly proofCommand: typeof PROOF_COMMAND;
  readonly generatedServiceCount: number;
  readonly profileCount: number;
  readonly serviceCatalogueDispositionCount: number;
  readonly defaultProfileCovered: boolean;
  readonly inMemoryServiceSubstituteAllowed: false;
  readonly testReadinessClaimAllowed: false;
  readonly nonClaimsPreserved: true;
}

function loadMatrix(): ComposedServiceIntegrationMatrix {
  return JSON.parse(readFileSync(MATRIX_PATH, "utf8")) as ComposedServiceIntegrationMatrix;
}

function assertNonClaimsPreserved(
  subject: string,
  allowedClaims: readonly string[] = [],
  nonClaims: readonly string[] = [],
): void {
  for (const claim of allowedClaims) {
    if (PROHIBITED_CLAIMS.has(claim)) {
      throw new Error(`${subject} allowed prohibited claim ${claim}`);
    }
  }
  for (const claim of PROHIBITED_CLAIMS) {
    if (!nonClaims.includes(claim)) {
      throw new Error(`${subject} is missing non-claim ${claim}`);
    }
  }
}

function assertServiceRow(row: ServiceIntegrationRow): void {
  const subject = `service ${row.serviceId}`;
  if (row.composeTarget !== COMPOSE_TARGET || row.generatedInTestCompose !== true) {
    throw new Error(`${subject} is not tied to the canonical generated test Compose target`);
  }
  if (row.inMemoryServiceSubstituteAllowed !== false || row.testReadinessClaimAllowed !== false) {
    throw new Error(`${subject} allows an unsafe service-backed test claim`);
  }
  if (!row.fixtureSeedId || !row.lifecycleApi) {
    throw new Error(`${subject} lacks fixture seed or lifecycle API mapping`);
  }
  for (const key of ["seederId", "resetterId", "cleanupId", "teardownId"]) {
    if (!row.lifecycleApi[key]) {
      throw new Error(`${subject} lacks lifecycle API ${key}`);
    }
  }
  if (row.proofCommand !== PROOF_COMMAND) {
    throw new Error(`${subject} has stale proof command`);
  }
  for (const key of REQUIRED_SERVICE_COVERAGE) {
    if (row.evidenceTests?.[key] !== "matrix-covered") {
      throw new Error(`${subject} lacks required integration evidence test ${key}`);
    }
  }
  assertNonClaimsPreserved(subject, [], row.nonClaims ?? []);
}

function assertProfileRow(row: ProfileIntegrationRow): void {
  const subject = `profile ${row.profile}`;
  if (row.composeTarget !== COMPOSE_TARGET || row.proofCommand !== PROOF_COMMAND) {
    throw new Error(`${subject} has stale Compose target or proof command`);
  }
  if (!row.serviceIds.length) {
    throw new Error(`${subject} has no service ids`);
  }
  if (row.inMemoryServiceSubstituteAllowed !== false) {
    throw new Error(`${subject} allows in-memory substitution`);
  }
  for (const key of REQUIRED_PROFILE_FLAGS) {
    if (row[key] !== true) {
      throw new Error(`${subject} lacks ${key}`);
    }
  }
  assertNonClaimsPreserved(subject, [], row.nonClaims ?? []);
}

function assertCatalogueDisposition(row: CatalogueDispositionRow): void {
  const subject = `catalogue ${row.serviceCatalogueId}`;
  if (!row.testDisposition || !row.boundedRationale) {
    throw new Error(`${subject} lacks test disposition or rationale`);
  }
  if (row.inMemoryServiceSubstituteAllowed !== false || row.testReadinessClaimAllowed !== false) {
    throw new Error(`${subject} allows an unsafe readiness claim`);
  }
  if (
    row.testDisposition === "deferred-with-follow-up" &&
    (!row.followUpIssueIds || row.followUpIssueIds.length === 0)
  ) {
    throw new Error(`${subject} defers without a follow-up issue`);
  }
  assertNonClaimsPreserved(subject, [], row.nonClaims ?? []);
}

export function runComposedServiceIntegrationMatrixProof(): ComposedServiceIntegrationMatrixSummary {
  const matrix = loadMatrix();
  if (
    matrix.issueId !== "USF-242" ||
    matrix.parentIssueId !== "USF-234" ||
    matrix.composeTarget !== COMPOSE_TARGET ||
    matrix.proofCommand !== PROOF_COMMAND
  ) {
    throw new Error("composed service integration matrix has stale issue or command metadata");
  }
  if (
    matrix.inMemoryServiceSubstituteAllowedForServiceBackedClaims !== false ||
    matrix.testReadinessClaimAllowed !== false
  ) {
    throw new Error("matrix allows unsafe test-readiness claims");
  }
  if (matrix.generatedServiceCount !== matrix.serviceIntegrationRows.length) {
    throw new Error("generated service count does not match service rows");
  }
  if (matrix.profileCount !== matrix.profileIntegrationRows.length) {
    throw new Error("profile count does not match profile rows");
  }
  if (matrix.serviceCatalogueDispositionCount !== matrix.serviceCatalogueDispositionRows.length) {
    throw new Error("service catalogue disposition count does not match rows");
  }
  for (const row of matrix.serviceIntegrationRows) {
    assertServiceRow(row);
  }
  for (const row of matrix.profileIntegrationRows) {
    assertProfileRow(row);
  }
  for (const row of matrix.serviceCatalogueDispositionRows) {
    assertCatalogueDisposition(row);
  }
  assertNonClaimsPreserved("matrix", matrix.allowedClaims ?? [], matrix.nonClaims ?? []);
  const defaultProfileCovered = matrix.profileIntegrationRows.some(
    (row) => row.profile === "default",
  );
  if (!defaultProfileCovered) {
    throw new Error("default generated test Compose service profile is missing");
  }
  return {
    status: "pass",
    issueId: "USF-242",
    parentIssueId: "USF-234",
    composeTarget: COMPOSE_TARGET,
    proofCommand: PROOF_COMMAND,
    generatedServiceCount: matrix.generatedServiceCount,
    profileCount: matrix.profileCount,
    serviceCatalogueDispositionCount: matrix.serviceCatalogueDispositionCount,
    defaultProfileCovered,
    inMemoryServiceSubstituteAllowed: false,
    testReadinessClaimAllowed: false,
    nonClaimsPreserved: true,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const summary = runComposedServiceIntegrationMatrixProof();
  console.log(`Composed service integration matrix proof passed: ${summary.issueId}`);
  console.log(`Compose target: ${summary.composeTarget}`);
  console.log(`Generated service rows: ${summary.generatedServiceCount}`);
  console.log(`Profile rows: ${summary.profileCount}`);
  console.log(`Service catalogue disposition rows: ${summary.serviceCatalogueDispositionCount}`);
  console.log(`Default profile covered: ${summary.defaultProfileCovered}`);
  console.log("In-memory service substitute allowed: false");
}
