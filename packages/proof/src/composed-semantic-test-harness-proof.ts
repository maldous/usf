import { fileURLToPath } from "node:url";
import {
  DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL,
  TEST_COMPOSE_TARGET,
} from "@foundation/app-api/runtime";
import {
  runRuntimeProofComposeOnTarget,
  type RuntimeProofSummary,
} from "./runtime-application-proof.ts";

const SERVICE_CATALOGUE_AUTHORITY = "spec/instances/compose-service/service-catalogue.json";
const CONTRACT_AUTHORITY = "docs/architecture/test-environment-service-contract.json";
const HARNESS_AUTHORITY = "docs/architecture/composed-semantic-test-harness.json";
const REQUIRED_SERVICE_IDS = Object.freeze([
  "postgres",
  "keycloak-db",
  "keycloak",
  "nats",
  "temporal",
  "minio",
  "openbao",
  "mailpit",
]);

export interface ComposedSemanticTestHarnessSummary {
  readonly issueId: "USF-236";
  readonly parentIssueId: "USF-234";
  readonly proofKind: "composed-semantic-test-harness";
  readonly composeTarget: typeof TEST_COMPOSE_TARGET;
  readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_AUTHORITY;
  readonly testEnvironmentContract: typeof CONTRACT_AUTHORITY;
  readonly harnessAuthority: typeof HARNESS_AUTHORITY;
  readonly runtimeMode: "dev-compose-backed";
  readonly providerMode: typeof DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL;
  readonly requiredServiceIds: readonly string[];
  readonly inMemoryServiceSubstituteAllowed: false;
  readonly composedExecutionEvidenced: true;
  readonly apiEvidence: {
    readonly healthRouteChecked: true;
    readonly readinessRouteChecked: true;
    readonly openapiRouteChecked: true;
    readonly tenantMismatchFailClosed: true;
    readonly authorizationFailClosed: true;
    readonly composedProviderBindingsActive: number;
    readonly auditEventsCaptured: number;
  };
  readonly workerEvidence: {
    readonly syntheticJobExecuted: true;
    readonly tenantBoundaryDenied: true;
    readonly authorizationDenied: true;
    readonly composedProviderEvidenceCount: number;
    readonly auditEventsCaptured: number;
  };
  readonly runtimeProof: RuntimeProofSummary;
  readonly semanticProofBoundary: "builds on confirmed dev semantic proof and executes the service-backed path against the canonical test Compose target";
  readonly devProofBoundary: "dev in-memory proof remains dev evidence only and does not satisfy service-backed test-readiness claims";
  readonly nonClaims: readonly string[];
}

function assertSummary(summary: RuntimeProofSummary): void {
  if (summary.mode !== "dev-compose-backed") {
    throw new Error("semantic test harness must execute the compose-backed runtime mode");
  }
  if (summary.providerMode !== DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL) {
    throw new Error("semantic test harness did not report composed provider mode");
  }
  if (!summary.composeBoundary.started || summary.composeBoundary.target !== TEST_COMPOSE_TARGET) {
    throw new Error("semantic test harness did not start the canonical test Compose target");
  }
  if (summary.api.composeTarget !== TEST_COMPOSE_TARGET) {
    throw new Error("API proof did not report the canonical test Compose target");
  }
  if (
    summary.api.providerMode === "dev in-memory" ||
    summary.worker.providerMode === "dev in-memory"
  ) {
    throw new Error("semantic test harness cannot use in-memory provider mode");
  }
  if (
    summary.api.deferredBoundaries.length > 0 ||
    summary.worker.deferredBoundaries.length > 0 ||
    summary.deferredBoundaries.length > 0
  ) {
    throw new Error("semantic test harness cannot carry deferred provider boundaries");
  }
  if (
    summary.api.tenantMismatchStatus < 400 ||
    summary.api.authorizationFailureStatus < 400 ||
    !summary.worker.tenantBoundaryDenied ||
    !summary.worker.authorizationDenied
  ) {
    throw new Error("semantic test harness did not prove fail-closed tenant and auth paths");
  }
  if (summary.api.auditEvents < 1 || summary.worker.auditEvents < 1) {
    throw new Error("semantic test harness did not capture audit evidence");
  }
  if (
    summary.databaseProviderEvidence.length === 0 ||
    summary.composedProviderEvidence.length === 0
  ) {
    throw new Error("semantic test harness did not capture composed provider evidence");
  }
}

export async function runComposedSemanticTestHarnessProof(): Promise<ComposedSemanticTestHarnessSummary> {
  const runtimeProof = await runRuntimeProofComposeOnTarget(TEST_COMPOSE_TARGET);
  assertSummary(runtimeProof);
  return {
    issueId: "USF-236",
    parentIssueId: "USF-234",
    proofKind: "composed-semantic-test-harness",
    composeTarget: TEST_COMPOSE_TARGET,
    serviceCatalogueAuthority: SERVICE_CATALOGUE_AUTHORITY,
    testEnvironmentContract: CONTRACT_AUTHORITY,
    harnessAuthority: HARNESS_AUTHORITY,
    runtimeMode: "dev-compose-backed",
    providerMode: DEV_COMPOSE_BACKED_PROVIDER_MODE_LABEL,
    requiredServiceIds: REQUIRED_SERVICE_IDS,
    inMemoryServiceSubstituteAllowed: false,
    composedExecutionEvidenced: true,
    apiEvidence: {
      healthRouteChecked: true,
      readinessRouteChecked: true,
      openapiRouteChecked: true,
      tenantMismatchFailClosed: true,
      authorizationFailClosed: true,
      composedProviderBindingsActive: runtimeProof.api.composedProviderBindingsActive,
      auditEventsCaptured: runtimeProof.api.auditEvents,
    },
    workerEvidence: {
      syntheticJobExecuted: true,
      tenantBoundaryDenied: true,
      authorizationDenied: true,
      composedProviderEvidenceCount:
        runtimeProof.worker.databaseProviderEvidence.length +
        runtimeProof.worker.composedProviderEvidence.length +
        runtimeProof.worker.eventBusProviderEvidence.length +
        runtimeProof.worker.objectStoreProviderEvidence.length +
        runtimeProof.worker.identityProviderEvidence.length +
        runtimeProof.worker.secretProviderEvidence.length +
        runtimeProof.worker.workflowProviderEvidence.length,
      auditEventsCaptured: runtimeProof.worker.auditEvents,
    },
    runtimeProof,
    semanticProofBoundary:
      "builds on confirmed dev semantic proof and executes the service-backed path against the canonical test Compose target",
    devProofBoundary:
      "dev in-memory proof remains dev evidence only and does not satisfy service-backed test-readiness claims",
    nonClaims: [
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
    ],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const summary = await runComposedSemanticTestHarnessProof();
  console.log(`Composed semantic test harness proof passed: ${summary.issueId}`);
  console.log(`Compose target: ${summary.composeTarget}`);
  console.log(`Provider mode: ${summary.providerMode}`);
  console.log(`Required service count: ${summary.requiredServiceIds.length}`);
  console.log(`API audit events captured: ${summary.apiEvidence.auditEventsCaptured}`);
  console.log(`Worker audit events captured: ${summary.workerEvidence.auditEventsCaptured}`);
  console.log(`In-memory service substitute allowed: ${summary.inMemoryServiceSubstituteAllowed}`);
}
