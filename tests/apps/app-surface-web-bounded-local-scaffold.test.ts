import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WEB_ROUTE_REGISTRY,
  buildWebRouteSemanticAuthorityFromRepository,
  getWebRouteByPath,
  validateWebRouteRegistry,
  type WebRouteRegistry,
} from "../../apps/web/src/route-registry";

type WebScaffoldArtifact = {
  postureVerification: {
    selectedFramework: string;
    selectedPostureArtefact: string;
    verifiedBeforeScaffoldCreation: boolean;
  };
  routeRegistry: {
    routes: Array<{
      routeId: string;
      path: string;
      capabilityId: string;
      permissionRefs: string[];
      tenantBoundaryRef: string;
      privacyCategoryRefs: string[];
      validationRefs: string[];
      errorRefs: string[];
      auditEventRefs: string[];
      componentFixtureRefs: string[];
      semanticSourceRefs: string[];
    }>;
  };
  nonClaims: Record<string, boolean>;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as T;
}

function cloneRegistry(): WebRouteRegistry {
  return structuredClone(WEB_ROUTE_REGISTRY) as WebRouteRegistry;
}

const webScaffoldArtifact = readJson<WebScaffoldArtifact>(
  "../../docs/architecture/app-surface-web-bounded-local-scaffold.json",
);
const semanticAuthority = buildWebRouteSemanticAuthorityFromRepository();

describe("app-surface web bounded local scaffold", () => {
  it("verifies the repository web posture before scaffold creation", () => {
    expect(webScaffoldArtifact.postureVerification).toMatchObject({
      selectedFramework: "nextjs",
      selectedPostureArtefact: "docs/adr/0017-nextjs-web-adapter-posture.md",
      verifiedBeforeScaffoldCreation: true,
    });
  });

  it("maps every local web route to governed capability and permission authority", () => {
    const result = validateWebRouteRegistry(WEB_ROUTE_REGISTRY, semanticAuthority);

    expect(result).toEqual({ ok: true, findings: [] });
    expect(
      webScaffoldArtifact.routeRegistry.routes.map((route) => ({
        routeId: route.routeId,
        path: route.path,
        capabilityId: route.capabilityId,
        permissionRefs: route.permissionRefs,
        tenantBoundaryRef: route.tenantBoundaryRef,
        privacyCategoryRefs: route.privacyCategoryRefs,
        validationRefs: route.validationRefs,
        errorRefs: route.errorRefs,
        auditEventRefs: route.auditEventRefs,
        componentFixtureRefs: route.componentFixtureRefs,
        semanticSourceRefs: route.semanticSourceRefs,
      })),
    ).toEqual(
      WEB_ROUTE_REGISTRY.routes.map((route) => ({
        routeId: route.routeId,
        path: route.path,
        capabilityId: route.capabilityId,
        permissionRefs: [...route.permissionRefs],
        tenantBoundaryRef: route.tenantBoundaryRef,
        privacyCategoryRefs: [...route.privacyCategoryRefs],
        validationRefs: [...route.validationRefs],
        errorRefs: [...route.errorRefs],
        auditEventRefs: [...route.auditEventRefs],
        componentFixtureRefs: [...route.componentFixtureRefs],
        semanticSourceRefs: [...route.semanticSourceRefs],
      })),
    );
  });

  it("loads repository semantic authority when no authority is supplied", () => {
    const registry = cloneRegistry();
    const [route] = registry.routes as typeof registry.routes & [typeof registry.routes[number]];
    Object.assign(route, { capabilityId: "missing.capability" });

    const result = validateWebRouteRegistry(registry);

    expect(result.ok).toBe(false);
    expect(result.findings).toContain("web-route-developer-home:capability-authority-missing");
  });

  it("fails closed when route capability authority is missing", () => {
    const registry = cloneRegistry();
    const [route] = registry.routes as typeof registry.routes & [typeof registry.routes[number]];
    Object.assign(route, { capabilityId: "missing.capability" });

    const result = validateWebRouteRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toContain("web-route-developer-home:capability-authority-missing");
  });

  it("fails closed when route permission authority is missing", () => {
    const registry = cloneRegistry();
    const [route] = registry.routes as typeof registry.routes & [typeof registry.routes[number]];
    Object.assign(route, { permissionRefs: ["missing.permission"] });

    const result = validateWebRouteRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toContain("web-route-developer-home:permission-authority-missing:missing.permission");
  });

  it("fails closed when route tenant authority is missing", () => {
    const registry = cloneRegistry();
    const [route] = registry.routes as typeof registry.routes & [typeof registry.routes[number]];
    Object.assign(route, { tenantBoundaryRef: "tenant.missing" });

    const result = validateWebRouteRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toContain("web-route-developer-home:tenant-authority-missing:tenant.missing");
  });

  it("fails closed when governed route references are missing", () => {
    const registry = cloneRegistry();
    const [route] = registry.routes as typeof registry.routes & [typeof registry.routes[number]];
    Object.assign(route, {
      privacyCategoryRefs: ["privacy.missing"],
      validationRefs: ["validation.missing"],
      errorRefs: ["error.missing"],
      auditEventRefs: ["audit.missing"],
      componentFixtureRefs: ["component-fixture.missing"],
      semanticSourceRefs: ["docs/architecture/missing-route-authority.json"],
    });

    const result = validateWebRouteRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        "web-route-developer-home:privacy-authority-missing:privacy.missing",
        "web-route-developer-home:validation-authority-missing:validation.missing",
        "web-route-developer-home:error-authority-missing:error.missing",
        "web-route-developer-home:audit-authority-missing:audit.missing",
        "web-route-developer-home:component-fixture-authority-missing:component-fixture.missing",
        "web-route-developer-home:semantic-source-authority-missing:docs/architecture/missing-route-authority.json",
      ]),
    );
  });

  it("fails closed for unknown routes", () => {
    expect(getWebRouteByPath("/").routeId).toBe("web-route-developer-home");
    expect(() => getWebRouteByPath("/unknown")).toThrow("web-route-unknown:/unknown");
  });

  it("preserves bounded local web non-claims", () => {
    expect(Object.values(WEB_ROUTE_REGISTRY.nonClaims)).toEqual(
      Array.from({ length: Object.values(WEB_ROUTE_REGISTRY.nonClaims).length }, () => false),
    );
    expect(webScaffoldArtifact.nonClaims).toMatchObject({
      webReadiness: false,
      deploymentReadiness: false,
      cdnReadiness: false,
      stagingReadiness: false,
      productionReadiness: false,
      liveProviderReadiness: false,
      providerSetup: false,
      credentialSetup: false,
      externalServiceUse: false,
      humanAcceptance: false,
    });
  });
});
