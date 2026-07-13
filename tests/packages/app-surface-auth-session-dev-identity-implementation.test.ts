import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY,
  exerciseLocalAuthPermissionCheck,
  getLocalAuthSessionIdentityById,
  validateLocalAuthSessionDevIdentityRegistry,
  validateLocalAuthSessionIdentityMapping,
  type LocalAuthSessionDevIdentityAuthority,
} from "@foundation/app-surface";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const loadJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;

interface AuthStubImplementation {
  authorityInputs: string[];
  implementedIdentities: Array<{
    identityId: string;
    userRef: string;
    tenantBoundaryRef: string;
    permissionRefs: string[];
    semanticSourceRefs: string[];
    proofRefs: string[];
  }>;
  nonClaims: Record<string, boolean>;
}

const authImplementation = loadJson<AuthStubImplementation>(
  "docs/architecture/app-surface-auth-session-dev-identity-implementation.json",
);

const semanticAuthority: LocalAuthSessionDevIdentityAuthority = {
  identityRefs: ["identity.dev-local-developer"],
  userRefs: ["user.dev-local-fixture"],
  tenantBoundaryRefs: ["tenant.dev-local-fixture"],
  sessionContextRefs: ["session.dev-local-in-memory"],
  roleRefs: ["role.dev-local-developer"],
  permissionRefs: ["developer:read", "developer:key:onboard"],
  capabilityRefs: ["graphql-federation-generated-client-disposition"],
  commandRefs: ["command.onboardApiKey"],
  queryRefs: ["query.developerProfile"],
  targetRefs: ["command.onboardApiKey", "query.developerProfile"],
  auditEventRefs: ["client-audit-event-emission"],
  semanticSourceRefs: authImplementation.authorityInputs,
  proofRefs: [
    "docs/architecture/app-surface-auth-session-dev-identity-implementation.json",
    "tests/packages/app-surface-auth-session-dev-identity-implementation.test.ts",
    "tools/validate-app-surface/validate-app-surface.py",
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the clone is deliberately untyped so tests can plant arbitrary defects
const cloneRegistry = (): any => JSON.parse(JSON.stringify(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY));

describe("app-surface auth session dev identity implementation", () => {
  it("maps tenant, user, role, and permission semantics", () => {
    expect(validateLocalAuthSessionDevIdentityRegistry(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY, semanticAuthority)).toEqual([]);
    expect(authImplementation.implementedIdentities.map((identity) => identity.identityId)).toEqual(
      LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.identities.map((identity) => identity.identityId),
    );
    expect(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.identities[0].userRef).toBe("user.dev-local-fixture");
    expect(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.identities[0].tenantBoundaryRef).toBe("tenant.dev-local-fixture");
    expect(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.identities[0].roleRefs).toContain("role.dev-local-developer");
    expect(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.identities[0].permissionRefs).toEqual([
      "developer:read",
      "developer:key:onboard",
    ]);
    const implementedIdentity = authImplementation.implementedIdentities[0];
    expect(implementedIdentity).toBeDefined();
    expect(implementedIdentity?.semanticSourceRefs).toEqual(authImplementation.authorityInputs);
    expect(implementedIdentity?.proofRefs).toContain(
      "tests/packages/app-surface-auth-session-dev-identity-implementation.test.ts",
    );
  });

  it("allows semantically mapped query and command requests", () => {
    expect(
      exerciseLocalAuthPermissionCheck(
        {
          identityRef: "identity.dev-local-developer",
          userRef: "user.dev-local-fixture",
          tenantBoundaryRef: "tenant.dev-local-fixture",
          permissionRef: "developer:read",
          requestContextKind: "query",
          targetRef: "query.developerProfile",
        },
        semanticAuthority,
      ),
    ).toMatchObject({ decision: "allow", reasonCode: "permission-authorised-by-local-semantic-stub" });
    expect(
      exerciseLocalAuthPermissionCheck(
        {
          identityRef: "identity.dev-local-developer",
          userRef: "user.dev-local-fixture",
          tenantBoundaryRef: "tenant.dev-local-fixture",
          permissionRef: "developer:key:onboard",
          requestContextKind: "command",
          targetRef: "command.onboardApiKey",
        },
        semanticAuthority,
      ),
    ).toMatchObject({ decision: "allow", reasonCode: "permission-authorised-by-local-semantic-stub" });
  });

  it("fails closed for missing permission semantics", () => {
    const decision = exerciseLocalAuthPermissionCheck(
      {
        identityRef: "identity.dev-local-developer",
        userRef: "user.dev-local-fixture",
        tenantBoundaryRef: "tenant.dev-local-fixture",
        permissionRef: "developer:admin",
        requestContextKind: "query",
        targetRef: "query.developerProfile",
      },
      semanticAuthority,
    );
    expect(decision.decision).toBe("deny");
    expect(decision.reasonCode).toBe("permission-semantics-missing-fail-closed");
  });

  it("fails closed when permission and target are not an explicit mapped pair", () => {
    const decision = exerciseLocalAuthPermissionCheck(
      {
        identityRef: "identity.dev-local-developer",
        userRef: "user.dev-local-fixture",
        tenantBoundaryRef: "tenant.dev-local-fixture",
        permissionRef: "developer:key:onboard",
        requestContextKind: "query",
        targetRef: "query.developerProfile",
      },
      semanticAuthority,
    );
    expect(decision.decision).toBe("deny");
    expect(decision.reasonCode).toBe("permission-target-mapping-missing-fail-closed");
  });

  it("fails closed when semantic authority is omitted", () => {
    const decision = exerciseLocalAuthPermissionCheck({
      identityRef: "identity.dev-local-developer",
      userRef: "user.dev-local-fixture",
      tenantBoundaryRef: "tenant.dev-local-fixture",
      permissionRef: "developer:read",
      requestContextKind: "query",
      targetRef: "query.developerProfile",
    });
    expect(decision.decision).toBe("deny");
    expect(decision.reasonCode).toBe("authority-semantics-missing-fail-closed");
    expect(validateLocalAuthSessionDevIdentityRegistry(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY)).toContain(
      "identity.dev-local-developer:identity-authority-missing:identity.dev-local-developer",
    );
  });

  it("fails closed for missing tenant or user context semantics", () => {
    expect(
      exerciseLocalAuthPermissionCheck(
        {
          identityRef: "identity.dev-local-developer",
          userRef: "user.other",
          tenantBoundaryRef: "tenant.dev-local-fixture",
          permissionRef: "developer:read",
          requestContextKind: "query",
          targetRef: "query.developerProfile",
        },
        semanticAuthority,
      ),
    ).toMatchObject({ decision: "deny", reasonCode: "user-context-mismatch-fail-closed" });
    expect(
      exerciseLocalAuthPermissionCheck(
        {
          identityRef: "identity.dev-local-developer",
          userRef: "user.dev-local-fixture",
          tenantBoundaryRef: "tenant.other",
          permissionRef: "developer:read",
          requestContextKind: "query",
          targetRef: "query.developerProfile",
        },
        semanticAuthority,
      ),
    ).toMatchObject({ decision: "deny", reasonCode: "tenant-context-mismatch-fail-closed" });
  });

  it("rejects production identity, live OAuth/OIDC, credentials, and secure storage claims", () => {
    const registry = cloneRegistry();
    registry.productionIdentityProviderAllowed = true;
    registry.liveOAuthOidcAllowed = true;
    registry.keycloakProviderSetupAllowed = true;
    registry.credentialsAllowed = true;
    registry.secureStorageClaimAllowed = true;
    registry.externalProviderAllowed = true;
    registry.identities[0] = {
      ...registry.identities[0],
      productionIdentityProviderAllowed: true,
      liveOAuthOidcAllowed: true,
      credentialsAllowed: true,
      secureStorageClaimAllowed: true,
      externalProviderAllowed: true,
    };
    const findings = validateLocalAuthSessionDevIdentityRegistry(registry, semanticAuthority);
    expect(findings).toContain("local-auth-session-dev-identity-registry:production-identity-provider-not-authorised");
    expect(findings).toContain("local-auth-session-dev-identity-registry:live-oauth-oidc-not-authorised");
    expect(findings).toContain("local-auth-session-dev-identity-registry:keycloak-provider-setup-not-authorised");
    expect(findings).toContain("local-auth-session-dev-identity-registry:credentials-not-authorised");
    expect(findings).toContain("local-auth-session-dev-identity-registry:secure-storage-claim-not-authorised");
    expect(findings).toContain("local-auth-session-dev-identity-registry:external-provider-not-authorised");
    expect(findings).toContain("identity.dev-local-developer:production-identity-provider-not-authorised");
    expect(findings).toContain("identity.dev-local-developer:live-oauth-oidc-not-authorised");
  });

  it("fails closed for unknown identities and missing identity fields", () => {
    expect(() => getLocalAuthSessionIdentityById("identity.unknown")).toThrow(/local-auth-identity-unknown/);
    expect(
      exerciseLocalAuthPermissionCheck(
        {
          identityRef: "identity.unknown",
          userRef: "user.dev-local-fixture",
          tenantBoundaryRef: "tenant.dev-local-fixture",
          permissionRef: "developer:read",
          requestContextKind: "query",
          targetRef: "query.developerProfile",
        },
        semanticAuthority,
      ),
    ).toMatchObject({ decision: "deny", reasonCode: "identity-semantics-missing-fail-closed" });
    const identity = {
      ...LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.identities[0],
      permissionRefs: [],
    };
    expect(validateLocalAuthSessionIdentityMapping(identity, semanticAuthority)).toContain(
      "identity.dev-local-developer:missing-permissionRefs",
    );
  });

  it("preserves false non-claims", () => {
    expect(Object.values(LOCAL_AUTH_SESSION_DEV_IDENTITY_REGISTRY.nonClaims).every((value) => value === false)).toBe(true);
    expect(Object.values(authImplementation.nonClaims).every((value) => value === false)).toBe(true);
    const result = exerciseLocalAuthPermissionCheck(
      {
        identityRef: "identity.dev-local-developer",
        userRef: "user.dev-local-fixture",
        tenantBoundaryRef: "tenant.dev-local-fixture",
        permissionRef: "developer:read",
        requestContextKind: "query",
        targetRef: "query.developerProfile",
      },
      semanticAuthority,
    );
    expect(result.authReadinessClaimed).toBe(false);
    expect(result.providerReadinessClaimed).toBe(false);
    expect(result.productionIdentityReadinessClaimed).toBe(false);
    expect(result.liveProviderReadinessClaimed).toBe(false);
  });
});
