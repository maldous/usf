import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  InMemoryAuditEventStore,
  InMemoryAuditLedger,
  createAuditRecorder,
} from "@foundation/capability-audit";
import {
  InMemoryTenantMembershipDirectory,
  createAuthorizer,
  createPolicyDecisionPoint,
} from "@foundation/capability-tenant";
import { createTenantContext, stableId, type TenantContext } from "@foundation/core";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TENANT_ID = "22222222-2222-4222-8222-222222222222";
const REVIEWER_ACTOR_ID = "operator-lifecycle-reviewer";
const TENANT_ADMIN_ACTOR_ID = "operator-lifecycle-tenant-admin";
const PROOF_COMMAND = "corepack pnpm proof:operator-lifecycle";
const SERVICE_CATALOGUE_PATH = "spec/instances/compose-service/service-catalogue.json";
const OPERATOR_MATRIX_PATH = "docs/architecture/operator-access-gateway-posture-matrix.json";
const USF217_DEPTH_PATH =
  "docs/architecture/operator-admin-access-review-deprovisioning-proof-depth.json";

const REQUIRED_NON_CLAIMS = Object.freeze([
  "public-operator-exposure",
  "operator-console-readiness",
  "provider-console-readiness",
  "identity-provider-lifecycle-readiness",
  "test-readiness",
  "staging-readiness",
  "production-readiness",
  "deployment-readiness",
  "live-provider-readiness",
  "soc-readiness",
  "iso27001-certification",
  "enterprise-production-readiness",
  "full-dev-readiness",
  "full-product-readiness",
  "USF-133-closure",
] as const);

const FORBIDDEN_SAFE_OUTPUT_RE =
  /(bearer\s|client_secret|connection string|connection_string|cookie|endpoint:\/\/|http:\/\/|https:\/\/|object_key|password|private_key|raw endpoint|stack_trace|stacktrace|token)/i;

interface OperatorMatrix {
  readonly requiredServiceIds: readonly string[];
  readonly rows: readonly OperatorMatrixRow[];
}

interface OperatorMatrixRow {
  readonly id: string;
  readonly serviceId: string;
  readonly surfaceKind: string;
  readonly accessModel: string;
  readonly authRequirement: string;
  readonly auditRequirement: string;
  readonly breakGlassRelevance: string;
  readonly owner?: string;
  readonly riskOwner: string;
  readonly controlOwner: string;
  readonly accessReviewOwner: string;
}

interface DepthMatrix {
  readonly requiredServiceIds: readonly string[];
  readonly rows: readonly DepthMatrixRow[];
}

interface DepthMatrixRow {
  readonly serviceId: string;
  readonly accessReviewCadence?: { readonly followUpIssue?: string };
  readonly deprovisioningPosture?: { readonly followUpIssue?: string };
}

interface ServiceCatalogue {
  readonly services: readonly { readonly serviceId: string }[];
}

interface ServiceLifecycleEvidence {
  readonly serviceId: string;
  readonly matrixRowId: string;
  readonly serviceCatalogueRow: string;
  readonly accessModel: string;
  readonly authRequirement: string;
  readonly auditRequirement: string;
  readonly breakGlassRelevance: string;
  readonly owner: string;
  readonly riskOwner: string;
  readonly controlOwner: string;
  readonly accessReviewWorkflowExecuted: true;
  readonly tenantAdminAccessReviewDenied: true;
  readonly crossTenantAccessReviewDenied: true;
  readonly deprovisioningWorkflowExecuted: true;
  readonly revokedMembershipFailsClosed: true;
  readonly valueFreeAuditEvidence: true;
  readonly providerConsoleIntegrationClaim: false;
  readonly publicExposureClaim: false;
}

export interface OperatorAccessLifecycleProofResult {
  readonly status: "pass";
  readonly proof: "operator-access-review-deprovisioning-lifecycle";
  readonly issue: "USF-221";
  readonly parentIssue: "USF-133";
  readonly predecessorIssue: "USF-217";
  readonly proofCommand: typeof PROOF_COMMAND;
  readonly runtimeMode: "hermetic-local-proof";
  readonly providerMode: "hermetic-mock";
  readonly serviceCatalogueAuthority: typeof SERVICE_CATALOGUE_PATH;
  readonly operatorAccessMatrix: typeof OPERATOR_MATRIX_PATH;
  readonly predecessorDepthMatrix: typeof USF217_DEPTH_PATH;
  readonly requiredServiceIds: readonly string[];
  readonly checks: readonly string[];
  readonly serviceEvidence: readonly ServiceLifecycleEvidence[];
  readonly auditEvidence: {
    readonly tenantScopedAuditEventCount: number;
    readonly authorizationDecisionCount: number;
    readonly accessReviewAuditCount: number;
    readonly deprovisioningDenialCount: number;
    readonly auditChainVerified: true;
    readonly valueFreeOutputChecked: true;
  };
  readonly claims: {
    readonly accessReviewWorkflowExecuted: true;
    readonly deprovisioningWorkflowExecuted: true;
    readonly revocationFailClosedBehaviourProven: true;
    readonly providerConsoleDeprovisioningClaim: false;
    readonly publicExposureClaim: false;
    readonly operatorConsoleReadinessClaim: false;
    readonly productionReadinessClaim: false;
    readonly liveProviderReadinessClaim: false;
    readonly usf133ClosureClaim: false;
  };
  readonly nonClaims: typeof REQUIRED_NON_CLAIMS;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSafeText(value: unknown, label: string): void {
  const text = JSON.stringify(value);
  assert(!FORBIDDEN_SAFE_OUTPUT_RE.test(text), `${label} contains unsafe output`);
}

function context(actorId: string, roles: readonly string[]): TenantContext {
  return createTenantContext({
    tenantId: TENANT_ID,
    actorId,
    roles,
    providerMode: "hermetic-mock",
    environment: "hermetic",
  });
}

function assertExpectedRows(
  serviceCatalogue: ServiceCatalogue,
  operatorMatrix: OperatorMatrix,
  depthMatrix: DepthMatrix,
): OperatorMatrixRow[] {
  const catalogueIds = new Set(serviceCatalogue.services.map((service) => service.serviceId));
  const requiredServiceIds = new Set(operatorMatrix.requiredServiceIds);
  assert(requiredServiceIds.size > 0, "operator matrix has no required services");
  assert(
    requiredServiceIds.size === depthMatrix.requiredServiceIds.length &&
      depthMatrix.requiredServiceIds.every((serviceId) => requiredServiceIds.has(serviceId)),
    "USF-217 depth matrix service set differs from operator matrix",
  );
  const rows = operatorMatrix.rows.filter((row) => requiredServiceIds.has(row.serviceId));
  assert(rows.length === requiredServiceIds.size, "operator matrix row coverage is incomplete");
  for (const row of rows) {
    assert(catalogueIds.has(row.serviceId), `service catalogue row missing for ${row.serviceId}`);
    const depthRow = depthMatrix.rows.find((candidate) => candidate.serviceId === row.serviceId);
    assert(depthRow, `USF-217 depth row missing for ${row.serviceId}`);
    assert(
      depthRow.accessReviewCadence?.followUpIssue === "USF-221" &&
        depthRow.deprovisioningPosture?.followUpIssue === "USF-221",
      `USF-217 handoff to USF-221 missing for ${row.serviceId}`,
    );
  }
  return rows;
}

export async function runOperatorAccessLifecycleProof(): Promise<OperatorAccessLifecycleProofResult> {
  const serviceCatalogue = readJson<ServiceCatalogue>(SERVICE_CATALOGUE_PATH);
  const operatorMatrix = readJson<OperatorMatrix>(OPERATOR_MATRIX_PATH);
  const depthMatrix = readJson<DepthMatrix>(USF217_DEPTH_PATH);
  const rows = assertExpectedRows(serviceCatalogue, operatorMatrix, depthMatrix);

  const auditEvents = new InMemoryAuditEventStore();
  const auditLedger = new InMemoryAuditLedger();
  const auditRecorder = createAuditRecorder({
    ledger: auditEvents,
    component: "operator-access-lifecycle-proof",
  });
  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "membership-operator-lifecycle-reviewer",
    tenantId: TENANT_ID,
    actorId: REVIEWER_ACTOR_ID,
    status: "active",
    roles: ["security-admin"],
  });
  memberships.upsert({
    membershipId: "membership-operator-lifecycle-tenant-admin",
    tenantId: TENANT_ID,
    actorId: TENANT_ADMIN_ACTOR_ID,
    status: "active",
    roles: ["tenant-admin"],
  });
  const authorizer = createAuthorizer({
    pdp: createPolicyDecisionPoint({ memberships }),
    auditLedger,
    audit: auditRecorder,
  });

  const reviewer = context(REVIEWER_ACTOR_ID, ["security-admin"]);
  const tenantAdmin = context(TENANT_ADMIN_ACTOR_ID, ["tenant-admin"]);
  const checks: string[] = [];
  const serviceEvidence: ServiceLifecycleEvidence[] = [];

  for (const row of rows) {
    const resource = {
      type: "operator-admin-service",
      id: row.serviceId,
      tenantId: TENANT_ID,
      attributes: { data_classification: "security-sensitive" },
    };
    const reviewDecision = await authorizer.authorize({
      context: reviewer,
      action: "provider.readiness.read",
      resource,
      requestContext: { correlation_id: stableId("corr", ["usf-221", row.serviceId, "review"]) },
    });
    assert(reviewDecision.effect === "permit", `${row.serviceId} access review was not permitted`);

    const tenantAdminReviewDecision = await authorizer.authorize({
      context: tenantAdmin,
      action: "provider.readiness.read",
      resource,
      requestContext: {
        correlation_id: stableId("corr", ["usf-221", row.serviceId, "tenant-admin-deny"]),
      },
    });
    assert(
      tenantAdminReviewDecision.effect === "deny",
      `${row.serviceId} tenant-admin access review was permitted`,
    );

    const crossTenantDecision = await authorizer.authorize({
      context: reviewer,
      action: "provider.readiness.read",
      resource: { ...resource, tenantId: OTHER_TENANT_ID },
      requestContext: {
        correlation_id: stableId("corr", ["usf-221", row.serviceId, "cross-tenant"]),
      },
    });
    assert(
      crossTenantDecision.effect === "deny" && crossTenantDecision.reasonCode === "tenant-boundary",
      `${row.serviceId} cross-tenant review did not fail closed`,
    );

    await auditRecorder.record({
      eventId: stableId("evt", ["usf-221", row.serviceId, "access-review"]),
      eventType: "provider.readiness.checked",
      tenantId: TENANT_ID,
      actorId: REVIEWER_ACTOR_ID,
      action: "provider.readiness.read",
      outcome: "success",
      subjectType: "service",
      subjectId: row.serviceId,
      resourceType: "operator-admin-service",
      resourceId: row.serviceId,
      reasonCode: "operator-access-review-executed",
      safeMessage: "operator access review executed for local proof",
      correlationId: stableId("corr", ["usf-221", row.serviceId, "access-review-audit"]),
      dataClassification: "security-sensitive",
      retentionPolicy: "operator-access-review-proof-local",
      metadata: {
        issue: "USF-221",
        workflow: "access-review",
        service_id: row.serviceId,
        matrix_row_id: row.id,
        evidence_grade: "local-proof",
      },
    });

    const targetActorId = `deprovisioned-${row.serviceId}`;
    memberships.upsert({
      membershipId: `membership-${row.serviceId}`,
      tenantId: TENANT_ID,
      actorId: targetActorId,
      status: "active",
      roles: ["tenant-admin"],
    });
    const deprovisionDecision = await authorizer.authorize({
      context: reviewer,
      action: "tenant.members.delete",
      resource: {
        type: "tenant-membership",
        id: stableId("membership", [row.serviceId, targetActorId]),
        tenantId: TENANT_ID,
        attributes: { data_classification: "security-sensitive" },
      },
      requestContext: {
        correlation_id: stableId("corr", ["usf-221", row.serviceId, "deprovision"]),
      },
    });
    assert(
      deprovisionDecision.effect === "permit",
      `${row.serviceId} deprovisioning authorization was not permitted`,
    );
    memberships.upsert({
      membershipId: `membership-${row.serviceId}`,
      tenantId: TENANT_ID,
      actorId: targetActorId,
      status: "revoked",
      roles: ["tenant-admin"],
    });
    assert(
      memberships.activeTenants(targetActorId).length === 0,
      `${row.serviceId} revoked actor still has an active tenant`,
    );
    const revokedContext = context(targetActorId, ["tenant-admin"]);
    const revokedDecision = await authorizer.authorize({
      context: revokedContext,
      action: "provider.readiness.read",
      resource,
      requestContext: {
        correlation_id: stableId("corr", ["usf-221", row.serviceId, "revoked-deny"]),
      },
    });
    assert(
      revokedDecision.effect === "deny" &&
        revokedDecision.reasonCode === "inactive-or-missing-membership",
      `${row.serviceId} revoked membership did not fail closed`,
    );

    serviceEvidence.push({
      serviceId: row.serviceId,
      matrixRowId: row.id,
      serviceCatalogueRow: `${SERVICE_CATALOGUE_PATH}#${row.serviceId}`,
      accessModel: row.accessModel,
      authRequirement: row.authRequirement,
      auditRequirement: row.auditRequirement,
      breakGlassRelevance: row.breakGlassRelevance,
      owner: row.accessReviewOwner || row.owner || "platform-access-foundation",
      riskOwner: row.riskOwner,
      controlOwner: row.controlOwner,
      accessReviewWorkflowExecuted: true,
      tenantAdminAccessReviewDenied: true,
      crossTenantAccessReviewDenied: true,
      deprovisioningWorkflowExecuted: true,
      revokedMembershipFailsClosed: true,
      valueFreeAuditEvidence: true,
      providerConsoleIntegrationClaim: false,
      publicExposureClaim: false,
    });
  }

  const auditPage = await auditEvents.query(reviewer, { tenantId: TENANT_ID, limit: 200 });
  const authorizationDecisionCount = auditPage.events.filter(
    (event) => event.eventType === "authorization.decision",
  ).length;
  const accessReviewAuditCount = auditPage.events.filter(
    (event) => event.reasonCode === "operator-access-review-executed",
  ).length;
  const deprovisioningDenialCount = auditPage.events.filter(
    (event) =>
      event.action === "provider.readiness.read" &&
      event.reasonCode === "inactive-or-missing-membership",
  ).length;
  assert(
    authorizationDecisionCount >= rows.length * 5,
    "authorization decision audit evidence is incomplete",
  );
  assert(accessReviewAuditCount === rows.length, "access-review audit evidence is incomplete");
  assert(
    deprovisioningDenialCount === rows.length,
    "deprovisioning denial audit evidence is incomplete",
  );
  const verification = await auditEvents.verify(reviewer);
  assert(verification.ok, "operator lifecycle audit chain did not verify");

  checks.push("all operator/admin services are loaded from service catalogue and matrix authority");
  checks.push("security-admin access-review workflow is executed for each in-scope surface");
  checks.push("tenant-admin and cross-tenant access-review attempts fail closed");
  checks.push("deprovisioning authorization is executed through PDP for each in-scope surface");
  checks.push("revoked memberships lose active tenant access before the next sensitive decision");
  checks.push("value-free audit evidence is captured and hash-chain verified");

  const result: OperatorAccessLifecycleProofResult = {
    status: "pass",
    proof: "operator-access-review-deprovisioning-lifecycle",
    issue: "USF-221",
    parentIssue: "USF-133",
    predecessorIssue: "USF-217",
    proofCommand: PROOF_COMMAND,
    runtimeMode: "hermetic-local-proof",
    providerMode: "hermetic-mock",
    serviceCatalogueAuthority: SERVICE_CATALOGUE_PATH,
    operatorAccessMatrix: OPERATOR_MATRIX_PATH,
    predecessorDepthMatrix: USF217_DEPTH_PATH,
    requiredServiceIds: rows.map((row) => row.serviceId),
    checks,
    serviceEvidence,
    auditEvidence: {
      tenantScopedAuditEventCount: auditPage.events.length,
      authorizationDecisionCount,
      accessReviewAuditCount,
      deprovisioningDenialCount,
      auditChainVerified: true,
      valueFreeOutputChecked: true,
    },
    claims: {
      accessReviewWorkflowExecuted: true,
      deprovisioningWorkflowExecuted: true,
      revocationFailClosedBehaviourProven: true,
      providerConsoleDeprovisioningClaim: false,
      publicExposureClaim: false,
      operatorConsoleReadinessClaim: false,
      productionReadinessClaim: false,
      liveProviderReadinessClaim: false,
      usf133ClosureClaim: false,
    },
    nonClaims: REQUIRED_NON_CLAIMS,
  };
  assertSafeText(result, "operator access lifecycle proof result");
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runOperatorAccessLifecycleProof(), null, 2));
}
