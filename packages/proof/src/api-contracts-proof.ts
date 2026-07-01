import { API_ROUTE_CONTRACTS } from "@foundation/contracts";
import { DEV_ACTOR_ID, DEV_TENANT_ID, createDevRuntime } from "@foundation/app-api/runtime";
import { buildApi } from "@foundation/app-api";
import { buildOpenApiDocument } from "@foundation/openapi";
import { checkOpenApiContract } from "@foundation/openapi/check";
import { fileURLToPath } from "node:url";

interface ApiContractsProofResult {
  readonly status: "pass";
  readonly proof: "api-contracts";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly publicApiReadinessClaim: false;
  readonly externalSdkReadinessClaim: false;
  readonly gatewayLiveReadinessClaim: false;
  readonly publicCompatibilityReadinessClaim: false;
  readonly browserSessionReadinessClaim: false;
  readonly graphqlFederationReadinessClaim: false;
  readonly generatedClientReadinessClaim: false;
  readonly stagingReadinessClaim: false;
  readonly productionLiveClaim: false;
  readonly socReadinessClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly fullDevReadinessClaim: false;
  readonly fullReactParityClaim: false;
  readonly usf133ClosureClaim: false;
  readonly enterpriseApiGatewayDepthProven: true;
  readonly apiGatewayDepthEvidence: ApiGatewayDepthEvidence;
  readonly routeCount: number;
  readonly operationCount: number;
  readonly checks: readonly string[];
}

interface ApiGatewayDepthEvidence {
  readonly issueId: "USF-155";
  readonly routeMetadataChecked: true;
  readonly openApiCoverageChecked: true;
  readonly safeExampleBoundaryChecked: true;
  readonly compatibilityMetadataChecked: true;
  readonly browserSessionBoundaryExplicit: true;
  readonly graphqlFederationReclassified: true;
  readonly generatedClientReclassified: true;
  readonly gatewayEdgeReclassified: true;
  readonly bulkApiTransferred: true;
  readonly tenantBoundaryChecked: true;
  readonly accessBoundaryChecked: true;
  readonly auditEvidenceCaptured: true;
  readonly secretBoundaryChecked: true;
  readonly redactionChecked: true;
  readonly publicApiReadinessClaim: false;
  readonly gatewayLiveReadinessClaim: false;
  readonly productionReadinessClaim: false;
  readonly stagingReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly fullDevReadinessClaim: false;
  readonly fullReactParityClaim: false;
  readonly usf133ClosureClaim: false;
}

const headers = {
  "x-dev-tenant-id": DEV_TENANT_ID,
  "x-dev-actor-id": DEV_ACTOR_ID,
  "x-request-id": "req-api-proof",
  "x-correlation-id": "corr-api-proof",
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSafeEnvelope(body: Record<string, unknown>, status: number): void {
  for (const field of [
    "error_id",
    "code",
    "safe_message",
    "status",
    "reason_code",
    "correlation_id",
    "request_id",
  ]) {
    assert(field in body, `safe error envelope missing ${field}`);
  }
  assert(body.status === status, "safe error envelope status mismatch");
  const text = JSON.stringify(body).toLowerCase();
  for (const forbidden of ["bearer ", "private_key", "client_secret", "object_key", "@example."]) {
    assert(!text.includes(forbidden), `safe error envelope leaked ${forbidden}`);
  }
}

function countOperations(openapi: ReturnType<typeof buildOpenApiDocument>): number {
  let count = 0;
  for (const methods of Object.values(openapi.paths)) {
    count += Object.keys(methods).length;
  }
  return count;
}

function assertOpenApiSafe(openapi: ReturnType<typeof buildOpenApiDocument>): void {
  const text = JSON.stringify(openapi).toLowerCase();
  for (const forbidden of [
    "client_secret",
    "private_key",
    "api_key",
    "object_key",
    "recipientaddressref",
    "@example.com",
    "@example.test",
    "production ready",
    "public api readiness",
  ]) {
    assert(!text.includes(forbidden), `OpenAPI leaked or overclaimed ${forbidden}`);
  }
}

function assertRouteMetadataDepth(): void {
  for (const route of API_ROUTE_CONTRACTS) {
    assert(
      route.compatibilityPolicy.trim().length > 0,
      `compatibility policy missing ${route.routeId}`,
    );
    assert(route.csrfPolicy.trim().length > 0, `CSRF policy missing ${route.routeId}`);
    assert(route.gatewayPolicy.trim().length > 0, `gateway policy missing ${route.routeId}`);
    assert(
      route.securityHeadersPolicy.trim().length > 0,
      `security headers missing ${route.routeId}`,
    );
    assert(route.fieldExposurePolicy.trim().length > 0, `field exposure missing ${route.routeId}`);
  }
}

export async function runApiContractsProof(): Promise<ApiContractsProofResult> {
  checkOpenApiContract();
  const runtime = createDevRuntime();
  const app = buildApi({ runtime });
  await app.ready();
  const checks: string[] = [];
  try {
    const openapi = buildOpenApiDocument();
    assertOpenApiSafe(openapi);
    checks.push("OpenAPI validates, operation IDs are unique, and examples are synthetic/safe");
    assertRouteMetadataDepth();
    checks.push(
      "route metadata records compatibility, browser, security, field exposure, and gateway posture",
    );

    for (const route of API_ROUTE_CONTRACTS) {
      assert(
        app.hasRoute({ method: route.method, url: route.path }),
        `Fastify route missing for ${route.method} ${route.path}`,
      );
      assert(route.routeClassification, `route lacks classification: ${route.routeId}`);
      assert(route.owningCapability, `route lacks capability: ${route.routeId}`);
    }
    checks.push("all route contracts map to implemented Fastify routes and capabilities");

    const missingTenant = await app.inject({
      method: "GET",
      url: `/v1/jobs?tenantId=${DEV_TENANT_ID}`,
    });
    assert(missingTenant.statusCode === 400, "missing tenant context must fail closed");
    assertSafeEnvelope(missingTenant.json(), 400);
    checks.push("missing tenant context denied with safe error envelope");

    const noPermission = await app.inject({
      method: "GET",
      url: `/v1/jobs?tenantId=${DEV_TENANT_ID}`,
      headers: { "x-dev-tenant-id": DEV_TENANT_ID, "x-dev-actor-id": "stranger" },
    });
    assert(noPermission.statusCode === 403, "protected route without permission must deny");
    assertSafeEnvelope(noPermission.json(), 403);
    checks.push("protected route without permission denied by PDP");

    const mismatch = await app.inject({
      method: "GET",
      url: "/v1/jobs?tenantId=tenant-other",
      headers,
    });
    assert(mismatch.statusCode === 400, "tenant mismatch must fail closed");
    assertSafeEnvelope(mismatch.json(), 400);
    checks.push("tenant mismatch denied without cross-tenant enumeration");

    const jobPayload = {
      tenantId: DEV_TENANT_ID,
      classification: "operational-automation-job",
      jobType: "api-contract-proof",
      payloadRefs: { ref: "synthetic" },
    };
    const createdJob = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...headers, "idempotency-key": "idem-job-proof" },
      payload: jobPayload,
    });
    assert(createdJob.statusCode === 200, "job create failed");
    const replayedJob = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...headers, "idempotency-key": "idem-job-proof" },
      payload: jobPayload,
    });
    assert(replayedJob.statusCode === 200, "job idempotency replay failed");
    assert(
      createdJob.json().job.jobId === replayedJob.json().job.jobId,
      "idempotency replay returned a different job",
    );
    const conflict = await app.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...headers, "idempotency-key": "idem-job-proof" },
      payload: { ...jobPayload, jobType: "api-contract-proof-conflict" },
    });
    assert(conflict.statusCode === 409, "idempotency conflict must be deterministic");
    assertSafeEnvelope(conflict.json(), 409);
    checks.push("side-effecting route idempotency works and conflicts deterministically");

    const fileA = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers,
      payload: {
        tenantId: DEV_TENANT_ID,
        fileId: "api-proof-file-a",
        filename: "a.txt",
        contentType: "text/plain",
        sizeBytes: 1,
        body: "a",
      },
    });
    assert(fileA.statusCode === 200, "file A upload failed");
    const fileB = await app.inject({
      method: "POST",
      url: "/v1/files",
      headers,
      payload: {
        tenantId: DEV_TENANT_ID,
        fileId: "api-proof-file-b",
        filename: "b.txt",
        contentType: "text/plain",
        sizeBytes: 1,
        body: "b",
      },
    });
    assert(fileB.statusCode === 200, "file B upload failed");
    const firstPage = await app.inject({
      method: "GET",
      url: `/v1/files?tenantId=${DEV_TENANT_ID}&limit=1`,
      headers,
    });
    assert(firstPage.statusCode === 200, "file list page failed");
    const cursor = firstPage.json().nextCursor;
    assert(typeof cursor === "string" && cursor.length > 10, "cursor missing");
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    assert(!decoded.includes(DEV_TENANT_ID), "pagination cursor leaked tenant id");
    checks.push("pagination cursor is opaque enough for tenant-safe local proof");

    const template = await app.inject({
      method: "POST",
      url: "/v1/notification-templates",
      headers,
      payload: {
        tenantId: DEV_TENANT_ID,
        templateId: "api-proof-template",
        templateKey: "api-proof",
        templateVersion: "1",
        templateClassification: "test",
        subjectTemplate: "Hello {{displayName}}",
        bodyTemplate: "Synthetic body for {{displayName}}",
        allowedVariables: [{ name: "displayName", required: true, dataClassification: "internal" }],
      },
    });
    assert(template.statusCode === 200, "notification template create failed");
    const notification = await app.inject({
      method: "POST",
      url: "/v1/notifications",
      headers,
      payload: {
        tenantId: DEV_TENANT_ID,
        templateId: "api-proof-template",
        channel: "test",
        classification: "test",
        recipient: {
          recipientId: "recipient-api-proof",
          recipientActorId: DEV_ACTOR_ID,
          recipientTenantId: DEV_TENANT_ID,
          recipientType: "test",
          addressRef: "recipient-ref-api-proof",
          addressType: "test",
          addressVerified: true,
          addressStatus: "active",
          addressSource: "synthetic-fixture",
          addressLastVerifiedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    });
    assert(notification.statusCode === 200, "notification create failed");
    const notificationId = notification.json().notification.notificationId as string;
    const send = await app.inject({
      method: "POST",
      url: `/v1/notifications/${encodeURIComponent(notificationId)}/send`,
      headers: { ...headers, "idempotency-key": "idem-notify-proof" },
      payload: { tenantId: DEV_TENANT_ID },
    });
    assert(send.statusCode === 200, "notification send failed");
    assert(
      runtime.jobStore
        .forTenant(DEV_TENANT_ID)
        .filter((job) => job.jobType === "notification.delivery").length === 1,
      "notification delivery duplicated job side effects",
    );
    const notificationText = JSON.stringify(send.json());
    assert(!notificationText.includes("recipient-ref-api-proof"), "recipient address ref leaked");
    checks.push("notifications API uses safe views and idempotent delivery job enqueue");

    const auditPage = await runtime.auditEvents.query(
      {
        tenantId: DEV_TENANT_ID,
        actorId: DEV_ACTOR_ID,
        roles: ["tenant-admin"],
        providerMode: "hermetic-mock",
        environment: "local",
      },
      { tenantId: DEV_TENANT_ID, limit: 100 },
    );
    assert(auditPage.events.length > 0, "API proof did not capture audit evidence");
    const auditText = JSON.stringify(auditPage).toLowerCase();
    for (const forbidden of [
      "bearer ",
      "private_key",
      "client_secret",
      "object_key",
      "recipient-ref-api-proof",
      "stack trace",
    ]) {
      assert(!auditText.includes(forbidden), `API audit evidence leaked ${forbidden}`);
    }
    checks.push("API proof captures value-free tenant/access audit evidence");

    return {
      status: "pass",
      proof: "api-contracts",
      providerMode: "hermetic-mock",
      environment: "hermetic",
      proofLevelObserved: "behaviour-proven",
      publicApiReadinessClaim: false,
      externalSdkReadinessClaim: false,
      gatewayLiveReadinessClaim: false,
      publicCompatibilityReadinessClaim: false,
      browserSessionReadinessClaim: false,
      graphqlFederationReadinessClaim: false,
      generatedClientReadinessClaim: false,
      stagingReadinessClaim: false,
      productionLiveClaim: false,
      socReadinessClaim: false,
      iso27001CertificationClaim: false,
      fullDevReadinessClaim: false,
      fullReactParityClaim: false,
      usf133ClosureClaim: false,
      enterpriseApiGatewayDepthProven: true,
      apiGatewayDepthEvidence: {
        issueId: "USF-155",
        routeMetadataChecked: true,
        openApiCoverageChecked: true,
        safeExampleBoundaryChecked: true,
        compatibilityMetadataChecked: true,
        browserSessionBoundaryExplicit: true,
        graphqlFederationReclassified: true,
        generatedClientReclassified: true,
        gatewayEdgeReclassified: true,
        bulkApiTransferred: true,
        tenantBoundaryChecked: true,
        accessBoundaryChecked: true,
        auditEvidenceCaptured: true,
        secretBoundaryChecked: true,
        redactionChecked: true,
        publicApiReadinessClaim: false,
        gatewayLiveReadinessClaim: false,
        productionReadinessClaim: false,
        stagingReadinessClaim: false,
        socReadinessClaim: false,
        iso27001CertificationClaim: false,
        fullDevReadinessClaim: false,
        fullReactParityClaim: false,
        usf133ClosureClaim: false,
      },
      routeCount: API_ROUTE_CONTRACTS.length,
      operationCount: countOperations(openapi),
      checks,
    };
  } finally {
    await app.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runApiContractsProof(), null, 2));
}
