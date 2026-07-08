import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MOBILE_SCREEN_REGISTRY,
  getMobileScreenById,
  validateMobileScreenRegistry,
  type MobileScreenRegistry,
} from "../../apps/mobile/src/screen-registry";
import { buildMobileScreenSemanticAuthorityFromRepository } from "../../apps/mobile/src/screen-registry-check";

type MobileScaffoldArtifact = {
  postureVerification: {
    selectedFramework: string;
    selectedPostureArtefact: string;
    packageAuthorityArtefact: string;
    verifiedBeforeScaffoldCreation: boolean;
  };
  screenRegistry: {
    screens: Array<{
      screenId: string;
      screenName: string;
      routePath: string;
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

function cloneRegistry(): MobileScreenRegistry {
  return structuredClone(MOBILE_SCREEN_REGISTRY) as MobileScreenRegistry;
}

const mobileScaffoldArtifact = readJson<MobileScaffoldArtifact>(
  "../../docs/architecture/app-surface-mobile-bounded-local-scaffold.json",
);
const semanticAuthority = buildMobileScreenSemanticAuthorityFromRepository();

describe("app-surface mobile bounded local scaffold", () => {
  it("verifies the repository mobile posture before scaffold creation", () => {
    expect(mobileScaffoldArtifact.postureVerification).toMatchObject({
      selectedFramework: "expo",
      selectedPostureArtefact: "docs/adr/0016-expo-mobile-adapter-posture.md",
      packageAuthorityArtefact: "docs/architecture/app-surface-package-installation-proof.json",
      verifiedBeforeScaffoldCreation: true,
    });
  });

  it("maps every local mobile screen to governed capability and permission authority", () => {
    const result = validateMobileScreenRegistry(MOBILE_SCREEN_REGISTRY, semanticAuthority);

    expect(result).toEqual({ ok: true, findings: [] });
    expect(
      mobileScaffoldArtifact.screenRegistry.screens.map((screen) => ({
        screenId: screen.screenId,
        screenName: screen.screenName,
        routePath: screen.routePath,
        capabilityId: screen.capabilityId,
        permissionRefs: screen.permissionRefs,
        tenantBoundaryRef: screen.tenantBoundaryRef,
        privacyCategoryRefs: screen.privacyCategoryRefs,
        validationRefs: screen.validationRefs,
        errorRefs: screen.errorRefs,
        auditEventRefs: screen.auditEventRefs,
        componentFixtureRefs: screen.componentFixtureRefs,
        semanticSourceRefs: screen.semanticSourceRefs,
      })),
    ).toEqual(
      MOBILE_SCREEN_REGISTRY.screens.map((screen) => ({
        screenId: screen.screenId,
        screenName: screen.screenName,
        routePath: screen.routePath,
        capabilityId: screen.capabilityId,
        permissionRefs: [...screen.permissionRefs],
        tenantBoundaryRef: screen.tenantBoundaryRef,
        privacyCategoryRefs: [...screen.privacyCategoryRefs],
        validationRefs: [...screen.validationRefs],
        errorRefs: [...screen.errorRefs],
        auditEventRefs: [...screen.auditEventRefs],
        componentFixtureRefs: [...screen.componentFixtureRefs],
        semanticSourceRefs: [...screen.semanticSourceRefs],
      })),
    );
  });

  it("fails closed when screen capability authority is missing", () => {
    const registry = cloneRegistry();
    const [screen] = registry.screens as typeof registry.screens & [typeof registry.screens[number]];
    Object.assign(screen, { capabilityId: "missing.capability" });

    const result = validateMobileScreenRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toContain("mobile-screen-developer-home:capability-authority-missing");
  });

  it("fails closed when screen permission authority is missing", () => {
    const registry = cloneRegistry();
    const [screen] = registry.screens as typeof registry.screens & [typeof registry.screens[number]];
    Object.assign(screen, { permissionRefs: ["missing.permission"] });

    const result = validateMobileScreenRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toContain("mobile-screen-developer-home:permission-authority-missing:missing.permission");
  });

  it("fails closed when screen tenant authority is missing", () => {
    const registry = cloneRegistry();
    const [screen] = registry.screens as typeof registry.screens & [typeof registry.screens[number]];
    Object.assign(screen, { tenantBoundaryRef: "tenant.missing" });

    const result = validateMobileScreenRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toContain("mobile-screen-developer-home:tenant-authority-missing:tenant.missing");
  });

  it("fails closed when governed screen references are missing", () => {
    const registry = cloneRegistry();
    const [screen] = registry.screens as typeof registry.screens & [typeof registry.screens[number]];
    Object.assign(screen, {
      privacyCategoryRefs: ["privacy.missing"],
      validationRefs: ["validation.missing"],
      errorRefs: ["error.missing"],
      auditEventRefs: ["audit.missing"],
      componentFixtureRefs: ["component-fixture.missing"],
      semanticSourceRefs: ["docs/architecture/missing-screen-authority.json"],
    });

    const result = validateMobileScreenRegistry(registry, semanticAuthority);

    expect(result.ok).toBe(false);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        "mobile-screen-developer-home:privacy-authority-missing:privacy.missing",
        "mobile-screen-developer-home:validation-authority-missing:validation.missing",
        "mobile-screen-developer-home:error-authority-missing:error.missing",
        "mobile-screen-developer-home:audit-authority-missing:audit.missing",
        "mobile-screen-developer-home:component-fixture-authority-missing:component-fixture.missing",
        "mobile-screen-developer-home:semantic-source-authority-missing:docs/architecture/missing-screen-authority.json",
      ]),
    );
  });

  it("fails closed for unknown screens", () => {
    expect(getMobileScreenById("mobile-screen-developer-home").screenName).toBe("DeveloperHomeScreen");
    expect(() => getMobileScreenById("mobile-screen-unknown")).toThrow("mobile-screen-unknown:mobile-screen-unknown");
  });

  it("preserves bounded local mobile non-claims", () => {
    expect(Object.values(MOBILE_SCREEN_REGISTRY.nonClaims)).toEqual(
      Array.from({ length: Object.values(MOBILE_SCREEN_REGISTRY.nonClaims).length }, () => false),
    );
    expect(mobileScaffoldArtifact.nonClaims).toMatchObject({
      expoReadiness: false,
      mobileReadiness: false,
      nativeReadiness: false,
      storeReadiness: false,
      deploymentReadiness: false,
      stagingReadiness: false,
      productionReadiness: false,
      liveProviderReadiness: false,
      providerSetup: false,
      credentialSetup: false,
      easSetup: false,
      nativeSigning: false,
      storeSubmission: false,
      externalServiceUse: false,
      humanAcceptance: false,
    });
  });
});
