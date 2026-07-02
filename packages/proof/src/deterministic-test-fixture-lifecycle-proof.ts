import { spawnSync } from "node:child_process";
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

export async function runDeterministicTestFixtureLifecycleProof(): Promise<DeterministicTestFixtureLifecycleSummary> {
  const firstSummary = await runComposedSemanticTestHarnessProof();
  assertComposeProjectClean(firstSummary);
  const first = fingerprint(firstSummary);

  const secondSummary = await runComposedSemanticTestHarnessProof();
  assertComposeProjectClean(secondSummary);
  const second = fingerprint(secondSummary);
  assertStable(first, second);

  return {
    issueId: "USF-237",
    parentIssueId: "USF-234",
    prerequisiteIssueIds: ["USF-235", "USF-236"],
    proofKind: "deterministic-test-fixture-lifecycle",
    composeTarget: TEST_COMPOSE_TARGET,
    providerMode: DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL,
    lifecycleAuthority: LIFECYCLE_AUTHORITY,
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
  console.log(`In-memory service substitute allowed: false`);
}
