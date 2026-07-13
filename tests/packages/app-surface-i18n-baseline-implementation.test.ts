import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LOCAL_I18N_REGISTRY,
  getLocalI18nTranslationEntry,
  translateLocalAppSurfaceText,
  validateLocalI18nRegistry,
  type LocalI18nAuthority,
} from "@foundation/app-surface";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const loadJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;

interface I18nBaselineImplementation {
  authorityInputs: string[];
  fallbackPolicy: {
    defaultLocale: string;
    fallbackLocale: string;
    missingTranslationPolicy: string;
    unsupportedLocalePolicy: string;
    behaviourChangingFallbackAllowed: boolean;
    legalPrivacyConsentFallbackAllowed: boolean;
  };
  translationCatalogue: Array<{
    key: string;
    locale: string;
    surfaceRefs: string[];
    semanticSourceRefs: string[];
    behaviourChangingAllowed: boolean;
  }>;
  surfaceCoverage: Array<{
    surfaceId: string;
    implementationPath: string;
    translationKeyRefs: string[];
    proofRefs: string[];
  }>;
  nonClaims: Record<string, boolean>;
}

const implementation = loadJson<I18nBaselineImplementation>(
  "docs/architecture/app-surface-i18n-baseline-implementation.json",
);

const catalogueKeys = implementation.translationCatalogue.map((entry) => entry.key);
const surfaceRefs = Array.from(
  new Set([
    ...implementation.surfaceCoverage.map((surface) => surface.surfaceId),
    ...implementation.translationCatalogue.flatMap((entry) => entry.surfaceRefs),
  ]),
);

const semanticAuthority: LocalI18nAuthority = {
  localeRefs: ["en-US"],
  surfaceRefs,
  semanticSourceRefs: Array.from(new Set(implementation.translationCatalogue.flatMap((entry) => entry.semanticSourceRefs))),
  proofRefs: [
    "docs/architecture/app-surface-i18n-baseline-implementation.json",
    "tests/packages/app-surface-i18n-baseline-implementation.test.ts",
    "tools/validate-app-surface/validate-app-surface.py",
  ],
  translationKeyRefs: catalogueKeys,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the clone is deliberately untyped so tests can plant arbitrary defects
const cloneRegistry = (): any => JSON.parse(JSON.stringify(LOCAL_I18N_REGISTRY));

describe("app-surface i18n baseline implementation", () => {
  it("covers route and component strings with translation catalogue entries", () => {
    expect(validateLocalI18nRegistry(LOCAL_I18N_REGISTRY, semanticAuthority)).toEqual([]);
    expect(new Set(LOCAL_I18N_REGISTRY.catalogues[0].entries.map((entry) => entry.key))).toEqual(new Set(catalogueKeys));
    for (const surface of implementation.surfaceCoverage) {
      for (const key of surface.translationKeyRefs) {
        expect(catalogueKeys).toContain(key);
        expect(getLocalI18nTranslationEntry(key, "en-US").surfaceRefs).toContain(surface.surfaceId);
      }
    }
  });

  it("provides bounded local lookup output without readiness claims", () => {
    const translated = translateLocalAppSurfaceText("web.developerHome.heading");
    expect(translated).toMatchObject({
      key: "web.developerHome.heading",
      requestedLocale: "en-US",
      resolvedLocale: "en-US",
      value: "USF local app surface",
      providerMode: "in-memory-only",
      environment: "dev-local",
      fallbackUsed: false,
      localisationReadinessClaimed: false,
      translationCompletenessClaimed: false,
      storeLocaleReadinessClaimed: false,
      humanAcceptanceClaimed: false,
    });
  });

  it("fails closed for missing translations", () => {
    expect(() => translateLocalAppSurfaceText("web.developerHome.missing")).toThrow(
      /local-i18n-missing-translation-fail-closed:en-US:web\.developerHome\.missing/,
    );
    const registry = cloneRegistry();
    registry.catalogues[0].entries = registry.catalogues[0].entries.filter(
      (entry: { key: string }) => entry.key !== "web.developerHome.heading",
    );
    expect(validateLocalI18nRegistry(registry, semanticAuthority)).toContain(
      "local-i18n-surface:web-route-developer-home:translation-key-missing:web.developerHome.heading",
    );
  });

  it("fails closed for unsupported locales rather than silently falling back", () => {
    expect(() => translateLocalAppSurfaceText("web.developerHome.heading", "fr-FR")).toThrow(
      /local-i18n-unsupported-locale-fail-closed:fr-FR/,
    );
  });

  it("records an explicit local fallback policy", () => {
    expect(LOCAL_I18N_REGISTRY.fallbackPolicy).toEqual({
      defaultLocale: "en-US",
      fallbackLocale: "en-US",
      missingTranslationPolicy: "fail-closed",
      unsupportedLocalePolicy: "fail-closed",
      behaviourChangingFallbackAllowed: false,
      legalPrivacyConsentFallbackAllowed: false,
    });
    expect(implementation.fallbackPolicy.missingTranslationPolicy).toBe("fail-closed");
    expect(implementation.fallbackPolicy.unsupportedLocalePolicy).toBe("fail-closed");
  });

  it("satisfies USF-937-style i18n coverage expectations", () => {
    const conforming = loadJson<{
      targetRuleId: string;
      fixtureId: string;
      localisation: { translationKeys: string[]; fallbackPolicyRef: string; coverageValidationRef: string };
    }>("tools/validate-app-surface/fixtures/conforming/009-i18n-coverage-complete.json");
    const planted = loadJson<{ expectedFailureRuleId: string; fixtureId: string }>(
      "tools/validate-app-surface/planted-defects/009-missing-i18n-coverage.json",
    );
    expect(conforming.targetRuleId).toBe("USF-APP-SURFACE-VALIDATOR-009");
    expect(conforming.fixtureId).toBe("i18n-coverage-complete");
    expect(conforming.localisation.translationKeys.length).toBeGreaterThan(0);
    expect(conforming.localisation.fallbackPolicyRef).toBeTruthy();
    expect(conforming.localisation.coverageValidationRef).toBeTruthy();
    expect(planted.expectedFailureRuleId).toBe("USF-APP-SURFACE-VALIDATOR-009");
  });

  it("rejects behaviour-changing translations and provider or store-locale claims", () => {
    const registry = cloneRegistry();
    registry.externalTranslationProviderAllowed = true;
    registry.translationProductionClaimAllowed = true;
    registry.professionalLocalisationClaimAllowed = true;
    registry.storeLocaleMetadataAllowed = true;
    registry.catalogues[0].entries[0].behaviourChangingAllowed = true;
    const findings = validateLocalI18nRegistry(registry, semanticAuthority);
    expect(findings).toContain("local-i18n-registry:external-translation-provider-not-authorised");
    expect(findings).toContain("local-i18n-registry:translation-production-claim-not-authorised");
    expect(findings).toContain("local-i18n-registry:professional-localisation-claim-not-authorised");
    expect(findings).toContain("local-i18n-registry:store-locale-metadata-not-authorised");
    expect(findings).toContain("local-i18n-entry:web.developerHome.heading:behaviour-changing-translation-not-authorised");
  });

  it("preserves all i18n non-claims as false", () => {
    expect(Object.values(LOCAL_I18N_REGISTRY.nonClaims).every((value) => value === false)).toBe(true);
    expect(Object.values(implementation.nonClaims).every((value) => value === false)).toBe(true);
  });
});
