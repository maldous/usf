import { buildApi } from "@foundation/app-api";
import {
  DEV_SECURITY_ACTOR_ID,
  DEV_TENANT_ID,
  createDevRuntime,
} from "@foundation/app-api/runtime";
import { contextFromClaims } from "@foundation/capability-tenant";
import { fileURLToPath } from "node:url";

interface OperatorAccessProofResult {
  readonly status: "pass";
  readonly proof: "operator-access-posture";
  readonly issue: "USF-169";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly operatorConsoleRuntimeReadinessClaim: false;
  readonly gatewayReadinessClaim: false;
  readonly clickthroughReadinessClaim: false;
  readonly publicExposureClaim: false;
  readonly productionLiveClaim: false;
  readonly checks: readonly string[];
  readonly auditedActions: readonly string[];
  readonly deferredBoundaries: readonly string[];
}

const securityHeaders = {
  "x-dev-tenant-id": DEV_TENANT_ID,
  "x-dev-actor-id": DEV_SECURITY_ACTOR_ID,
  "x-dev-roles": "security-admin",
  "x-request-id": "req-operator-proof",
  "x-correlation-id": "corr-operator-proof",
  "x-trace-id": "trace-operator-proof",
};

const tenantAdminHeaders = {
  "x-dev-tenant-id": DEV_TENANT_ID,
  "x-dev-actor-id": "dev-actor",
  "x-dev-roles": "tenant-admin",
  "x-request-id": "req-operator-denied",
  "x-correlation-id": "corr-operator-denied",
  "x-trace-id": "trace-operator-denied",
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSafeText(value: unknown, label: string): void {
  const text = JSON.stringify(value).toLowerCase();
  for (const forbidden of [
    "bearer ",
    "client_secret",
    "connection string",
    "connection_string",
    "cookie",
    "object_key",
    "password",
    "private_key",
    "stack_trace",
    "stacktrace",
    "token",
  ]) {
    assert(!text.includes(forbidden), `${label} leaked ${forbidden}`);
  }
}

function assertSafeError(body: Record<string, unknown>, status: number): void {
  assert(body.status === status, "safe error status mismatch");
  for (const field of [
    "error_id",
    "code",
    "safe_message",
    "reason_code",
    "correlation_id",
    "request_id",
  ]) {
    assert(field in body, `safe error missing ${field}`);
  }
  assertSafeText(body, "operator safe error");
}

function securityContext() {
  return contextFromClaims(
    {
      subject: DEV_SECURITY_ACTOR_ID,
      tenantId: DEV_TENANT_ID,
      email: "dev-security-actor@example.test",
      roles: Object.freeze(["security-admin"]),
      providerMode: "hermetic-mock",
    },
    "local",
  );
}

async function auditedActions(runtime: ReturnType<typeof createDevRuntime>): Promise<string[]> {
  const page = await runtime.auditEvents.query(securityContext(), {
    tenantId: DEV_TENANT_ID,
    limit: 100,
  });
  return page.events.map((event) => event.action);
}

export async function runOperatorAccessProof(): Promise<OperatorAccessProofResult> {
  const runtime = createDevRuntime();
  const app = buildApi({ runtime });
  await app.ready();
  const checks: string[] = [];
  try {
    const missingTenant = await app.inject({ method: "GET", url: "/v1/providers" });
    assert(missingTenant.statusCode === 400, "missing tenant context must fail closed");
    assertSafeError(missingTenant.json(), 400);
    checks.push("missing tenant context fails closed for operator provider surface");

    const tenantMismatch = await app.inject({
      method: "GET",
      url: "/v1/providers?tenantId=tenant-other",
      headers: securityHeaders,
    });
    assert(tenantMismatch.statusCode === 400, "tenant mismatch must fail closed");
    assertSafeError(tenantMismatch.json(), 400);
    checks.push("tenant mismatch fails closed for operator provider surface");

    const deniedProviderList = await app.inject({
      method: "GET",
      url: `/v1/providers?tenantId=${DEV_TENANT_ID}`,
      headers: tenantAdminHeaders,
    });
    assert(deniedProviderList.statusCode === 403, "tenant-admin must not list providers");
    assertSafeError(deniedProviderList.json(), 403);
    checks.push("provider list requires security-admin operator permission");

    const providerList = await app.inject({
      method: "GET",
      url: `/v1/providers?tenantId=${DEV_TENANT_ID}`,
      headers: securityHeaders,
    });
    assert(providerList.statusCode === 200, "security-admin provider list failed");
    const providerListBody = providerList.json();
    assert(Array.isArray(providerListBody.providers), "provider list response missing providers");
    assert(providerListBody.providers.length > 0, "provider list response is empty");
    assertSafeText(providerListBody, "provider list response");
    checks.push("security-admin can read redacted provider posture without credential leakage");

    const providerId = providerListBody.providers[0]?.providerId;
    assert(typeof providerId === "string" && providerId.length > 0, "provider id missing");
    const providerDetail = await app.inject({
      method: "GET",
      url: `/v1/providers/${encodeURIComponent(providerId)}?tenantId=${DEV_TENANT_ID}`,
      headers: securityHeaders,
    });
    assert(providerDetail.statusCode === 200, "security-admin provider detail failed");
    assertSafeText(providerDetail.json(), "provider detail response");
    checks.push("provider detail is operator-gated and redacted");

    const deniedReadiness = await app.inject({
      method: "GET",
      url: `/v1/observability/readiness?tenantId=${DEV_TENANT_ID}`,
      headers: tenantAdminHeaders,
    });
    assert(deniedReadiness.statusCode === 403, "tenant-admin must not read observability readiness");
    assertSafeError(deniedReadiness.json(), 403);
    const securitySignals = runtime.observability.list(DEV_TENANT_ID);
    assert(
      securitySignals.some((signal) => signal === "authorization.denied:security-signal"),
      "operator denial security signal missing",
    );
    checks.push("observability readiness denial emits tenant-safe security signal");

    const readiness = await app.inject({
      method: "GET",
      url: `/v1/observability/readiness?tenantId=${DEV_TENANT_ID}`,
      headers: securityHeaders,
    });
    assert(readiness.statusCode === 200, "security-admin observability readiness failed");
    const readinessBody = readiness.json();
    assert(readinessBody.liveMonitoringReadinessClaim === false, "live monitoring overclaimed");
    assert(readinessBody.productionReadinessClaim === false, "production readiness overclaimed");
    assertSafeText(readinessBody, "observability readiness response");
    checks.push("observability readiness is operator-gated and explicitly non-live");

    const signals = await app.inject({
      method: "GET",
      url: `/v1/observability/signals?tenantId=${DEV_TENANT_ID}&limit=10`,
      headers: securityHeaders,
    });
    assert(signals.statusCode === 200, "security-admin observability signals failed");
    assertSafeText(signals.json(), "observability signals response");
    checks.push("observability signals are operator-gated and redacted");

    const actions = await auditedActions(runtime);
    for (const action of [
      "provider.readiness.checked",
      "provider.health.checked",
      "observability.readiness.read",
      "observability.signal.read",
    ]) {
      assert(actions.includes(action), `missing audit action ${action}`);
    }
    checks.push("operator/security-admin reads produce value-free audit evidence");

    return {
      status: "pass",
      proof: "operator-access-posture",
      issue: "USF-169",
      providerMode: "hermetic-mock",
      environment: "hermetic",
      proofLevelObserved: "behaviour-proven",
      operatorConsoleRuntimeReadinessClaim: false,
      gatewayReadinessClaim: false,
      clickthroughReadinessClaim: false,
      publicExposureClaim: false,
      productionLiveClaim: false,
      checks,
      auditedActions: actions,
      deferredBoundaries: [
        "composed service console login and clickthrough UX remain deferred to USF-180 or service-specific source issues",
        "executed periodic access reviews and deprovisioning workflow evidence remain deferred",
        "public, LAN, staging, production, and live-provider operator access are not proven",
      ],
    };
  } finally {
    await app.close();
    await runtime.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runOperatorAccessProof(), null, 2));
}
