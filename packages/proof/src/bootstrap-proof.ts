import { buildApi } from "@foundation/app-api";
import { RlsSession } from "@foundation/adapter-db";
import { testComposeProviders } from "@foundation/capability-config";
import { createTenantContext } from "@foundation/core";
import { testTenant } from "@foundation/test";
import { fileURLToPath } from "node:url";

export async function runBootstrapProof() {
  const app = buildApi();
  await app.ready();

  const health = await app.inject({ method: "GET", url: "/healthz" });
  if (health.statusCode !== 200) {
    throw new Error(`health proof failed with status ${health.statusCode}`);
  }

  const openapi = await app.inject({ method: "GET", url: "/openapi.json" });
  if (openapi.statusCode !== 200) {
    throw new Error(`openapi proof failed with status ${openapi.statusCode}`);
  }

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { tenantId: testTenant.tenantId, email: testTenant.email },
  });
  if (login.statusCode !== 200) {
    throw new Error(`login proof failed with status ${login.statusCode}`);
  }

  const accepted = await app.inject({
    method: "GET",
    url: `/v1/tenant-context?tenantId=${testTenant.tenantId}`,
    headers: { "x-dev-tenant-id": testTenant.tenantId, "x-dev-actor-id": "actor-proof" },
  });
  if (accepted.statusCode !== 200 || Number(accepted.json().auditEvents) < 1) {
    throw new Error("tenant context proof did not capture audit evidence");
  }

  const mismatch = await app.inject({
    method: "GET",
    url: `/v1/tenant-context?tenantId=${testTenant.otherTenantId}`,
    headers: { "x-dev-tenant-id": testTenant.tenantId, "x-dev-actor-id": "actor-proof" },
  });
  if (mismatch.statusCode !== 400) {
    throw new Error("tenant mismatch did not fail closed");
  }

  const context = createTenantContext({
    tenantId: testTenant.tenantId,
    actorId: "actor-proof",
    roles: ["tenant-admin"],
  });
  new RlsSession(context).assertTenant(testTenant.tenantId, "proof");

  const requiredProviders = new Set(testComposeProviders);
  for (const provider of ["postgres", "keycloak", "nats", "temporal", "minio", "openbao"]) {
    if (!requiredProviders.has(provider as (typeof testComposeProviders)[number])) {
      throw new Error(`missing provider ${provider}`);
    }
  }

  await app.close();
  return {
    status: "pass",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    liveExternalProviderClaim: false,
    productionLiveClaim: false,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runBootstrapProof(), null, 2));
}
