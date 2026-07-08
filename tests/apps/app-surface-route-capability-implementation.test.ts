import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WEB_ROUTE_REGISTRY,
  buildWebRouteSemanticAuthorityFromRepository,
  getWebRouteByPath,
  validateWebRouteRegistry,
} from "../../apps/web/src/route-registry";
import {
  MOBILE_SCREEN_REGISTRY,
  getMobileScreenById,
  validateMobileScreenRegistry,
} from "../../apps/mobile/src/screen-registry";
import { buildMobileScreenSemanticAuthorityFromRepository } from "../../apps/mobile/src/screen-registry-check";

type RouteCapabilityImplementation = {
  ownerIssueId: string;
  implementedTargets: Array<{
    targetId: string;
    surface: "web-route" | "mobile-screen";
    capabilityId: string;
    permissionRefs: string[];
    tenantBoundaryRef: string;
    proofRefs: string[];
    unknownTargetPolicy: "fail-closed";
  }>;
  outOfScopeSurfaces: Array<{
    surface: string;
    ownerIssueId: string;
    status: string;
  }>;
  validationGuard: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

type AppSurfaceFixture = {
  fixtureId: string;
  targetRuleId: string;
  ownerIssueId: string;
  expectedFailureRuleId?: string;
  mapping: {
    capabilityRef?: string;
    permissionRefs?: string[];
    tenantBoundaryRef?: string;
    proofRefs?: string[];
  };
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as T;
}

const implementation = readJson<RouteCapabilityImplementation>(
  "../../docs/architecture/app-surface-route-capability-implementation.json",
);
const conformingRouteFixture = readJson<AppSurfaceFixture>(
  "../../tools/validate-app-surface/fixtures/conforming/002-route-with-capability-mapping.json",
);
const plantedRouteFixture = readJson<AppSurfaceFixture>(
  "../../tools/validate-app-surface/planted-defects/002-route-without-capability-mapping.json",
);

describe("app-surface route capability implementation", () => {
  it("covers the implemented web routes and mobile screens", () => {
    const implementedTargetIds = implementation.implementedTargets.map((target) => target.targetId).sort();
    const registryTargetIds = [
      ...WEB_ROUTE_REGISTRY.routes.map((route) => route.routeId),
      ...MOBILE_SCREEN_REGISTRY.screens.map((screen) => screen.screenId),
    ].sort();

    expect(implementation.ownerIssueId).toBe("USF-1020");
    expect(implementedTargetIds).toEqual(registryTargetIds);
  });

  it("keeps every implemented target mapped to capability, permission, tenant, and proof authority", () => {
    for (const target of implementation.implementedTargets) {
      expect(target.capabilityId).toBeTruthy();
      expect(target.permissionRefs.length).toBeGreaterThan(0);
      expect(target.tenantBoundaryRef).toBeTruthy();
      expect(target.proofRefs.length).toBeGreaterThan(0);
      expect(target.unknownTargetPolicy).toBe("fail-closed");
    }
  });

  it("validates web and mobile registries against repository authority", () => {
    expect(validateWebRouteRegistry(WEB_ROUTE_REGISTRY, buildWebRouteSemanticAuthorityFromRepository())).toEqual({
      ok: true,
      findings: [],
    });
    expect(validateMobileScreenRegistry(MOBILE_SCREEN_REGISTRY, buildMobileScreenSemanticAuthorityFromRepository())).toEqual({
      ok: true,
      findings: [],
    });
  });

  it("fails closed for unknown route and screen targets", () => {
    expect(getWebRouteByPath("/").routeId).toBe("web-route-developer-home");
    expect(() => getWebRouteByPath("/missing")).toThrow("web-route-unknown:/missing");

    expect(getMobileScreenById("mobile-screen-developer-home").screenName).toBe("DeveloperHomeScreen");
    expect(() => getMobileScreenById("mobile-screen-missing")).toThrow("mobile-screen-unknown:mobile-screen-missing");
  });

  it("satisfies USF-930-style route capability validator expectations", () => {
    expect(conformingRouteFixture).toMatchObject({
      fixtureId: "route-with-capability-mapping",
      targetRuleId: "USF-APP-SURFACE-VALIDATOR-002",
      ownerIssueId: "USF-930",
    });
    expect(conformingRouteFixture.mapping.capabilityRef).toBeTruthy();
    expect(conformingRouteFixture.mapping.permissionRefs?.length).toBeGreaterThan(0);
    expect(conformingRouteFixture.mapping.tenantBoundaryRef).toBeTruthy();
    expect(conformingRouteFixture.mapping.proofRefs?.length).toBeGreaterThan(0);

    expect(plantedRouteFixture).toMatchObject({
      fixtureId: "route-without-capability-mapping",
      targetRuleId: "USF-APP-SURFACE-VALIDATOR-002",
      ownerIssueId: "USF-930",
      expectedFailureRuleId: "USF-APP-SURFACE-VALIDATOR-002",
    });
    expect(plantedRouteFixture.mapping.capabilityRef).toBeUndefined();
  });

  it("preserves later issue ownership and non-claims", () => {
    expect(implementation.outOfScopeSurfaces).toEqual(
      expect.arrayContaining([
        { surface: "command-form", ownerIssueId: "USF-1021", status: "owned-by-later-issue" },
        { surface: "query-list-detail", ownerIssueId: "USF-1022", status: "owned-by-later-issue" },
        { surface: "state-cache-query-client", ownerIssueId: "USF-1023", status: "owned-by-later-issue" },
        { surface: "auth-session-dev-identity", ownerIssueId: "USF-1024", status: "owned-by-later-issue" },
      ]),
    );
    expect(Object.values(implementation.validationGuard)).toEqual(
      Array.from({ length: Object.values(implementation.validationGuard).length }, () => true),
    );
    expect(Object.values(implementation.nonClaims)).toEqual(
      Array.from({ length: Object.values(implementation.nonClaims).length }, () => false),
    );
  });
});
