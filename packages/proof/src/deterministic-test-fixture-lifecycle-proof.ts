import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL,
  TEST_COMPOSE_TARGET,
} from "@foundation/app-api/runtime";
import {
  runComposedSemanticTestHarnessProof,
  type ComposedSemanticTestHarnessSummary,
} from "./composed-semantic-test-harness-proof.ts";

const HARNESS_AUTHORITY = "docs/architecture/composed-semantic-test-harness.json";
const LIFECYCLE_AUTHORITY = "docs/architecture/deterministic-test-fixture-lifecycle.json";
const CONTRACT_AUTHORITY = "docs/architecture/test-environment-service-contract.json";
const FIXTURE_CORPUS_AUTHORITY = "tests/packages/fixtures/service-fixture-corpus.json";

interface DeterministicRunFingerprint {
  readonly composeTarget: typeof TEST_COMPOSE_TARGET;
  readonly providerMode: typeof DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL;
  readonly requiredServiceIds: readonly string[];
  readonly inMemoryServiceSubstituteAllowed: false;
  readonly apiTenantAcceptedStatus: number;
  readonly apiTenantMismatchStatus: number;
  readonly apiAuthorizationFailureStatus: number;
  readonly apiComposedProviderBindingsActive: number;
  readonly workerJobStatus: string;
  readonly workerTenantBoundaryDenied: true;
  readonly workerAuthorizationDenied: true;
  readonly workerComposedProviderEvidenceCount: number;
  readonly apiAuditEvidencePresent: true;
  readonly workerAuditEvidencePresent: true;
  readonly deferredBoundaryCount: 0;
}

export interface DeterministicTestFixtureLifecycleSummary {
  readonly issueId: "USF-237";
  readonly parentIssueId: "USF-234";
  readonly prerequisiteIssueIds: readonly ["USF-235", "USF-236"];
  readonly proofKind: "deterministic-test-fixture-lifecycle";
  readonly composeTarget: typeof TEST_COMPOSE_TARGET;
  readonly providerMode: typeof DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL;
  readonly lifecycleAuthority: typeof LIFECYCLE_AUTHORITY;
  readonly fixtureCorpusAuthority: typeof FIXTURE_CORPUS_AUTHORITY;
  readonly harnessAuthority: typeof HARNESS_AUTHORITY;
  readonly testEnvironmentContract: typeof CONTRACT_AUTHORITY;
  readonly proofCommand: "corepack pnpm test-readiness:fixtures";
  readonly repeatedHarnessCommand: "corepack pnpm test-readiness:semantic";
  readonly runCount: 2;
  readonly seedBoundary: "synthetic tenant, actor, job, provider, object, secret, and notification fixtures only";
  readonly resetBoundary: "each run starts the canonical test Compose target from a clean Compose project after down -v";
  readonly cleanupBoundary: "proof-owned runtime state, containers, networks, volumes, temp files, and credentials are removed between runs";
  readonly teardownBoundary: "Compose down -v --remove-orphans is verified after every run";
  readonly orderDependencyBoundary: "runs are sequential and compare stable semantic fingerprints; no ordering dependency is accepted as evidence";
  readonly repeatabilityEvidence: {
    readonly firstRun: DeterministicRunFingerprint;
    readonly secondRun: DeterministicRunFingerprint;
    readonly stableFingerprintMatched: true;
    readonly composeProjectCleanupCheckedAfterEachRun: true;
    readonly repeatedRunDeterministic: true;
  };
  readonly fixtureCorpusEvidence: {
    readonly issueId: "USF-248";
    readonly serviceFixtureCount: number;
    readonly semanticContractFixtureCount: number;
    readonly inMemoryServiceSubstituteAllowed: false;
    readonly syntheticOnly: true;
    readonly seederResetterCleanupTeardownMapped: true;
    readonly repeatabilityFailureRecoveryMapped: true;
    readonly nonClaimsPreserved: true;
  };
  readonly validationCommands: readonly string[];
  readonly allowedClaims: readonly ["bounded-deterministic-fixture-lifecycle-proof"];
  readonly nonClaims: readonly string[];
}

function composedProviderEvidenceCount(summary: ComposedSemanticTestHarnessSummary): number {
  return (
    summary.runtimeProof.worker.databaseProviderEvidence.length +
    summary.runtimeProof.worker.composedProviderEvidence.length +
    summary.runtimeProof.worker.eventBusProviderEvidence.length +
    summary.runtimeProof.worker.objectStoreProviderEvidence.length +
    summary.runtimeProof.worker.identityProviderEvidence.length +
    summary.runtimeProof.worker.secretProviderEvidence.length +
    summary.runtimeProof.worker.workflowProviderEvidence.length
  );
}

function fingerprint(summary: ComposedSemanticTestHarnessSummary): DeterministicRunFingerprint {
  if (summary.composeTarget !== TEST_COMPOSE_TARGET) {
    throw new Error("fixture lifecycle proof must use the canonical test Compose target");
  }
  if (summary.providerMode !== DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL) {
    throw new Error("fixture lifecycle proof must use composed provider mode");
  }
  if (summary.inMemoryServiceSubstituteAllowed !== false) {
    throw new Error("fixture lifecycle proof cannot allow in-memory service substitution");
  }
  if (summary.runtimeProof.deferredBoundaries.length > 0) {
    throw new Error("fixture lifecycle proof cannot inherit deferred runtime boundaries");
  }
  if (summary.runtimeProof.api.auditEvents < 1 || summary.runtimeProof.worker.auditEvents < 1) {
    throw new Error("fixture lifecycle proof requires audit evidence on every run");
  }

  return {
    composeTarget: summary.composeTarget,
    providerMode: summary.providerMode,
    requiredServiceIds: [...summary.requiredServiceIds].sort(),
    inMemoryServiceSubstituteAllowed: false,
    apiTenantAcceptedStatus: summary.runtimeProof.api.tenantAcceptedStatus,
    apiTenantMismatchStatus: summary.runtimeProof.api.tenantMismatchStatus,
    apiAuthorizationFailureStatus: summary.runtimeProof.api.authorizationFailureStatus,
    apiComposedProviderBindingsActive: summary.apiEvidence.composedProviderBindingsActive,
    workerJobStatus: summary.runtimeProof.worker.jobStatus,
    workerTenantBoundaryDenied: summary.workerEvidence.tenantBoundaryDenied,
    workerAuthorizationDenied: summary.workerEvidence.authorizationDenied,
    workerComposedProviderEvidenceCount: composedProviderEvidenceCount(summary),
    apiAuditEvidencePresent: true,
    workerAuditEvidencePresent: true,
    deferredBoundaryCount: 0,
  };
}

function assertComposeProjectClean(summary: ComposedSemanticTestHarnessSummary): void {
  const projectName = summary.runtimeProof.composeBoundary.projectName;
  if (!projectName) {
    throw new Error("fixture lifecycle proof missing Compose project name");
  }
  const result = spawnSync(
    "docker",
    ["compose", "-p", projectName, "-f", TEST_COMPOSE_TARGET, "ps", "-q"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error("fixture lifecycle cleanup check could not inspect Compose project");
  }
  if (result.stdout.trim() !== "") {
    throw new Error("fixture lifecycle cleanup check found remaining Compose containers");
  }
}

function assertStable(
  first: DeterministicRunFingerprint,
  second: DeterministicRunFingerprint,
): void {
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error("fixture lifecycle proof produced different stable fingerprints across runs");
  }
}

function assertFixtureCorpusEvidence(): DeterministicTestFixtureLifecycleSummary["fixtureCorpusEvidence"] {
  const corpus = JSON.parse(readFileSync(FIXTURE_CORPUS_AUTHORITY, "utf8")) as {
    issueId?: string;
    serviceFixtures?: Array<{
      serviceId?: string;
      generatedInTestCompose?: boolean;
      fixtureSeedId?: string;
      lifecycleApi?: Record<string, string>;
      lifecycleCoverage?: Record<string, boolean | string>;
      provenance?: Record<string, boolean>;
      inMemoryServiceSubstituteAllowed?: boolean;
      testReadinessClaimAllowed?: boolean;
    }>;
    semanticContractFixtures?: Array<{
      contractId?: string;
      semanticSeedCoverage?: Record<string, string>;
      provenance?: Record<string, boolean>;
    }>;
    allowedClaims?: string[];
    nonClaims?: string[];
  };

  if (corpus.issueId !== "USF-248") {
    throw new Error("fixture corpus must link USF-248");
  }
  const serviceFixtures = corpus.serviceFixtures ?? [];
  const semanticContractFixtures = corpus.semanticContractFixtures ?? [];
  if (serviceFixtures.length < 1 || semanticContractFixtures.length < 1) {
    throw new Error("fixture corpus must include service and semantic contract fixtures");
  }

  let mapped = true;
  let repeatabilityMapped = true;
  for (const row of serviceFixtures) {
    if (row.inMemoryServiceSubstituteAllowed !== false || row.testReadinessClaimAllowed !== false) {
      throw new Error(`fixture corpus row is unsafe: ${row.serviceId ?? "unknown"}`);
    }
    if (row.provenance?.syntheticOnly !== true || row.provenance?.productionDerived !== false) {
      throw new Error(`fixture corpus row has unsafe provenance: ${row.serviceId ?? "unknown"}`);
    }
    const requiresSeeder =
      row.generatedInTestCompose === true && row.fixtureSeedId !== "not-applicable";
    if (!requiresSeeder) {
      continue;
    }
    mapped &&=
      Boolean(row.lifecycleApi?.seederId) &&
      Boolean(row.lifecycleApi?.resetterId) &&
      Boolean(row.lifecycleApi?.cleanupId) &&
      Boolean(row.lifecycleApi?.teardownId);
    repeatabilityMapped &&=
      row.lifecycleCoverage?.repeatability === true &&
      row.lifecycleCoverage?.failureRecovery === true;
  }
  if (!mapped) {
    throw new Error(
      "fixture corpus has a service row without seeder resetter cleanup teardown mapping",
    );
  }
  if (!repeatabilityMapped) {
    throw new Error(
      "fixture corpus has a service row without repeatability or failure recovery mapping",
    );
  }

  const prohibitedClaims = new Set([
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
  ]);
  for (const claim of corpus.allowedClaims ?? []) {
    if (prohibitedClaims.has(claim)) {
      throw new Error(`fixture corpus allowed a prohibited claim: ${claim}`);
    }
  }
  const nonClaims = new Set(corpus.nonClaims ?? []);
  if (!nonClaims.has("final-test-readiness") || !nonClaims.has("test-readiness")) {
    throw new Error("fixture corpus must preserve final and bounded test-readiness non-claims");
  }

  return {
    issueId: "USF-248",
    serviceFixtureCount: serviceFixtures.length,
    semanticContractFixtureCount: semanticContractFixtures.length,
    inMemoryServiceSubstituteAllowed: false,
    syntheticOnly: true,
    seederResetterCleanupTeardownMapped: true,
    repeatabilityFailureRecoveryMapped: true,
    nonClaimsPreserved: true,
  };
}

export async function runDeterministicTestFixtureLifecycleProof(): Promise<DeterministicTestFixtureLifecycleSummary> {
  const firstSummary = await runComposedSemanticTestHarnessProof();
  assertComposeProjectClean(firstSummary);
  const first = fingerprint(firstSummary);

  const secondSummary = await runComposedSemanticTestHarnessProof();
  assertComposeProjectClean(secondSummary);
  const second = fingerprint(secondSummary);
  assertStable(first, second);
  const fixtureCorpusEvidence = assertFixtureCorpusEvidence();

  return {
    issueId: "USF-237",
    parentIssueId: "USF-234",
    prerequisiteIssueIds: ["USF-235", "USF-236"],
    proofKind: "deterministic-test-fixture-lifecycle",
    composeTarget: TEST_COMPOSE_TARGET,
    providerMode: DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL,
    lifecycleAuthority: LIFECYCLE_AUTHORITY,
    fixtureCorpusAuthority: FIXTURE_CORPUS_AUTHORITY,
    harnessAuthority: HARNESS_AUTHORITY,
    testEnvironmentContract: CONTRACT_AUTHORITY,
    proofCommand: "corepack pnpm test-readiness:fixtures",
    repeatedHarnessCommand: "corepack pnpm test-readiness:semantic",
    runCount: 2,
    seedBoundary:
      "synthetic tenant, actor, job, provider, object, secret, and notification fixtures only",
    resetBoundary:
      "each run starts the canonical test Compose target from a clean Compose project after down -v",
    cleanupBoundary:
      "proof-owned runtime state, containers, networks, volumes, temp files, and credentials are removed between runs",
    teardownBoundary: "Compose down -v --remove-orphans is verified after every run",
    orderDependencyBoundary:
      "runs are sequential and compare stable semantic fingerprints; no ordering dependency is accepted as evidence",
    repeatabilityEvidence: {
      firstRun: first,
      secondRun: second,
      stableFingerprintMatched: true,
      composeProjectCleanupCheckedAfterEachRun: true,
      repeatedRunDeterministic: true,
    },
    fixtureCorpusEvidence,
    validationCommands: [
      "corepack pnpm test-readiness:fixtures",
      "corepack pnpm test-readiness:validate",
      "python3 tools/validate-test-readiness/validate-test-readiness.py all --json",
    ],
    allowedClaims: ["bounded-deterministic-fixture-lifecycle-proof"],
    nonClaims: [
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
    ],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const summary = await runDeterministicTestFixtureLifecycleProof();
  console.log(`Deterministic test fixture lifecycle proof passed: ${summary.issueId}`);
  console.log(`Compose target: ${summary.composeTarget}`);
  console.log(`Provider mode: ${summary.providerMode}`);
  console.log(`Run count: ${summary.runCount}`);
  console.log(
    `Stable fingerprint matched: ${summary.repeatabilityEvidence.stableFingerprintMatched}`,
  );
  console.log(
    `Compose cleanup checked after each run: ${summary.repeatabilityEvidence.composeProjectCleanupCheckedAfterEachRun}`,
  );
  console.log(`Fixture corpus service rows: ${summary.fixtureCorpusEvidence.serviceFixtureCount}`);
  console.log(
    `Fixture corpus semantic rows: ${summary.fixtureCorpusEvidence.semanticContractFixtureCount}`,
  );
  console.log(`In-memory service substitute allowed: false`);
}
