import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LOCAL_ACCESSIBILITY_REGISTRY,
  describeLocalAccessibilitySurface,
  getLocalAccessibilitySurfaceById,
  validateLocalAccessibilityRegistry,
  type LocalAccessibilityAuthority,
} from "@foundation/app-surface";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const loadJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;

interface AccessibilityBaselineImplementation {
  authorityInputs: string[];
  surfaceAccessibilityMappings: Array<{
    surfaceId: string;
    implementationPath: string;
    capabilityRef: string;
    labelRefs: string[];
    roleRefs: string[];
    screenReaderRef: string;
    focusOrderRef: string;
    keyboardNavigationRef: string;
    touchTargetRef: string;
    dynamicTypeRef: string;
    contrastRef: string;
    reducedMotionRef: string;
    errorAnnouncementRef: string;
    semanticSourceRefs: string[];
    proofRefs: string[];
  }>;
  nonClaims: Record<string, boolean>;
}

const implementation = loadJson<AccessibilityBaselineImplementation>(
  "docs/architecture/app-surface-accessibility-baseline-implementation.json",
);

const surfaceRefs = implementation.surfaceAccessibilityMappings.map((surface) => surface.surfaceId);
const proofRefs = Array.from(new Set(implementation.surfaceAccessibilityMappings.flatMap((surface) => surface.proofRefs)));
const semanticSourceRefs = Array.from(
  new Set(implementation.surfaceAccessibilityMappings.flatMap((surface) => surface.semanticSourceRefs)),
);
const capabilityRefs = Array.from(new Set(implementation.surfaceAccessibilityMappings.map((surface) => surface.capabilityRef)));

const semanticAuthority: LocalAccessibilityAuthority = {
  surfaceRefs,
  capabilityRefs,
  semanticSourceRefs,
  proofRefs,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the clone is deliberately untyped so tests can plant arbitrary defects
const cloneRegistry = (): any => JSON.parse(JSON.stringify(LOCAL_ACCESSIBILITY_REGISTRY));

describe("app-surface accessibility baseline implementation", () => {
  it("maps implemented surfaces to accessibility metadata", () => {
    expect(validateLocalAccessibilityRegistry(LOCAL_ACCESSIBILITY_REGISTRY, semanticAuthority)).toEqual([]);
    expect(new Set(LOCAL_ACCESSIBILITY_REGISTRY.surfaces.map((surface) => surface.surfaceId))).toEqual(new Set(surfaceRefs));
    for (const surface of implementation.surfaceAccessibilityMappings) {
      const registered = getLocalAccessibilitySurfaceById(surface.surfaceId);
      expect(registered.implementationPath).toBe(surface.implementationPath);
      expect(registered.capabilityRef).toBe(surface.capabilityRef);
      expect(registered.labelRefs).toEqual(surface.labelRefs);
      expect(registered.roleRefs).toEqual(surface.roleRefs);
    }
  });

  it("describes bounded local accessibility surfaces without readiness claims", () => {
    const description = describeLocalAccessibilitySurface("web-route-developer-home");
    expect(description).toMatchObject({
      surfaceId: "web-route-developer-home",
      platform: "web",
      capabilityRef: "graphql-federation-generated-client-disposition",
      screenReaderRef: "screen-reader-semantics-required",
      focusOrderRef: "focus-order-required",
      keyboardNavigationRef: "keyboard-navigation-required",
      touchTargetRef: "touch-target-and-gesture-alternative-required",
      dynamicTypeRef: "dynamic-type-required",
      contrastRef: "contrast-boundary-required",
      reducedMotionRef: "reduced-motion-boundary-required",
      errorAnnouncementRef: "error-announcement-required",
      accessibilityComplianceClaimed: false,
      accessibilityCertificationClaimed: false,
      productUiReadinessClaimed: false,
      humanAcceptanceClaimed: false,
    });
  });

  it("fails closed for unknown or incomplete accessibility semantics", () => {
    expect(() => getLocalAccessibilitySurfaceById("missing-surface")).toThrow(
      /local-accessibility-surface-missing-fail-closed:missing-surface/,
    );

    const registry = cloneRegistry();
    delete registry.surfaces[0].screenReaderRef;
    registry.surfaces[1].focusOrderDefined = false;
    const findings = validateLocalAccessibilityRegistry(registry, semanticAuthority);
    expect(findings).toContain("local-accessibility-surface:web-route-developer-home:missing-screenReaderRef");
    expect(findings).toContain("local-accessibility-surface:mobile-screen-developer-home:focusOrderDefined-must-be-true");
  });

  it("wires web and mobile scaffolds to accessibility metadata", () => {
    const webSource = readFileSync(join(repoRoot, "apps/web/app/page.tsx"), "utf8");
    const mobileSource = readFileSync(join(repoRoot, "apps/mobile/App.tsx"), "utf8");
    expect(webSource).toContain("getLocalAccessibilitySurfaceById(route.routeId)");
    expect(webSource).toContain("data-usf-accessibility-screen-reader-ref");
    expect(webSource).toContain("aria-labelledby");
    expect(mobileSource).toContain("getLocalAccessibilitySurfaceById(homeScreen.screenId)");
    expect(mobileSource).toContain("accessibilityLabel");
    expect(mobileSource).toContain("accessibilityRole=\"header\"");
  });

  it("satisfies USF-938-style accessibility fixture expectations", () => {
    const conforming = loadJson<{
      targetRuleId: string;
      fixtureId: string;
      accessibility: Record<string, string | string[]>;
    }>("tools/validate-app-surface/fixtures/conforming/010-accessibility-semantics-complete.json");
    const planted = loadJson<{ expectedFailureRuleId: string; fixtureId: string }>(
      "tools/validate-app-surface/planted-defects/010-missing-accessibility-semantics.json",
    );
    expect(conforming.targetRuleId).toBe("USF-APP-SURFACE-VALIDATOR-010");
    expect(conforming.fixtureId).toBe("accessibility-semantics-complete");
    for (const field of [
      "screenReaderRef",
      "focusOrderRef",
      "keyboardNavigationRef",
      "touchTargetRef",
      "dynamicTypeRef",
      "contrastRef",
      "reducedMotionRef",
      "errorAnnouncementRef",
      "proofRefs",
    ]) {
      expect(conforming.accessibility[field]).toBeTruthy();
    }
    expect(planted.expectedFailureRuleId).toBe("USF-APP-SURFACE-VALIDATOR-010");
  });

  it("rejects audit, compliance, certification, and human-acceptance claims", () => {
    const registry = cloneRegistry();
    registry.externalAuditAllowed = true;
    registry.complianceClaimAllowed = true;
    registry.certificationClaimAllowed = true;
    registry.humanAcceptanceAllowed = true;
    registry.deviceLabClaimAllowed = true;
    const findings = validateLocalAccessibilityRegistry(registry, semanticAuthority);
    expect(findings).toContain("local-accessibility-registry:external-audit-not-authorised");
    expect(findings).toContain("local-accessibility-registry:compliance-claim-not-authorised");
    expect(findings).toContain("local-accessibility-registry:certification-claim-not-authorised");
    expect(findings).toContain("local-accessibility-registry:human-acceptance-not-authorised");
    expect(findings).toContain("local-accessibility-registry:device-lab-claim-not-authorised");
  });

  it("preserves all accessibility non-claims as false", () => {
    expect(Object.values(LOCAL_ACCESSIBILITY_REGISTRY.nonClaims).every((value) => value === false)).toBe(true);
    expect(Object.values(implementation.nonClaims).every((value) => value === false)).toBe(true);
  });
});
