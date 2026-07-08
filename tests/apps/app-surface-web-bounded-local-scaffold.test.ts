import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WEB_ROUTE_REGISTRY,
  getWebRouteByPath,
  validateWebRouteRegistry,
  type WebRouteRegistry,
  type WebRouteSemanticAuthority,
} from "../../apps/web/src/route-registry";

type SemanticRef = {
  id: string;
};

type LocalRuntimeSemanticInputs = {
  capabilities: SemanticRef[];
  permissions: SemanticRef[];
};

type LocalRuntimeArtifact = {
  semanticInputs: LocalRuntimeSemanticInputs;
};

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
    }>;
  };
  nonClaims: Record<string, boolean>;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as T;
}

function semanticAuthorityFrom(runtimeArtifact: LocalRuntimeArtifact): WebRouteSemanticAuthority {
  return {
    capabilityIds: new Set(runtimeArtifact.semanticInputs.capabilities.map((ref) => ref.id)),
    permissionIds: new Set(runtimeArtifact.semanticInputs.permissions.map((ref) => ref.id)),
  };
}

function cloneRegistry(): WebRouteRegistry {
  return structuredClone(WEB_ROUTE_REGISTRY) as WebRouteRegistry;
}

const localRuntimeArtifact = readJson<LocalRuntimeArtifact>(
  "../../docs/architecture/app-surface-local-in-memory-runtime.json",
);
const webScaffoldArtifact = readJson<WebScaffoldArtifact>(
  "../../docs/architecture/app-surface-web-bounded-local-scaffold.json",
);
const semanticAuthority = semanticAuthorityFrom(localRuntimeArtifact);

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
      })),
    ).toEqual(
      WEB_ROUTE_REGISTRY.routes.map((route) => ({
        routeId: route.routeId,
        path: route.path,
        capabilityId: route.capabilityId,
        permissionRefs: [...route.permissionRefs],
      })),
    );
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
