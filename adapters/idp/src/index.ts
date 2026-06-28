import { stableId, type IdentityClaims } from "@foundation/core";
import type { IdentityProvider } from "@foundation/ports";

export class InMemoryIdentityProvider implements IdentityProvider {
  readonly mode = "hermetic-mock";

  async issueLogin(input: { tenantId: string; email: string }): Promise<IdentityClaims> {
    const subject = stableId("actor", [input.tenantId, input.email.toLowerCase()]);
    return {
      subject,
      tenantId: input.tenantId,
      email: input.email.toLowerCase(),
      roles: Object.freeze(["tenant-admin"]),
      providerMode: this.mode,
    };
  }
}

export const keycloakTestProvider = Object.freeze({
  mode: "local-composed-real-service",
  service: "keycloak",
  issuer: "http://localhost:8090/realms/foundation",
  tenantClaim: "tenant_id",
});
