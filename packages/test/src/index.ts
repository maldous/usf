import { InMemoryIdentityProvider } from "@foundation/adapter-idp";
import { InMemoryAuditLedger } from "@foundation/capability-audit";
import { createAuthService } from "@foundation/capability-auth";

export function createInMemoryAuthRuntime() {
  const auditLedger = new InMemoryAuditLedger();
  const identityProvider = new InMemoryIdentityProvider();
  const authService = createAuthService({ auditLedger, identityProvider });
  return { auditLedger, authService, identityProvider };
}

export const testTenant = Object.freeze({
  tenantId: "11111111-1111-4111-8111-111111111111",
  otherTenantId: "22222222-2222-4222-8222-222222222222",
  email: "admin@example.test",
});
