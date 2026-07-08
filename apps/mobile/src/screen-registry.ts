export type MobileScreenClass = "private" | "public" | "operator" | "admin";
export type MobilePresentationBoundary = "expo-managed-screen" | "react-native-component";

export type MobileScreenMapping = {
  readonly screenId: string;
  readonly screenName: string;
  readonly routePath: string;
  readonly screenClass: MobileScreenClass;
  readonly presentationBoundary: MobilePresentationBoundary;
  readonly capabilityId: string;
  readonly permissionRefs: readonly string[];
  readonly tenantBoundaryRef: string;
  readonly privacyCategoryRefs: readonly string[];
  readonly validationRefs: readonly string[];
  readonly errorRefs: readonly string[];
  readonly auditEventRefs: readonly string[];
  readonly componentFixtureRefs: readonly string[];
  readonly semanticSourceRefs: readonly string[];
  readonly nonClaimBoundary: string;
};

export type MobileScreenRegistry = {
  readonly artifactId: string;
  readonly ownerIssueId: string;
  readonly framework: "expo";
  readonly postureRef: string;
  readonly mobileAdapterSemanticRef: string;
  readonly packageAuthorityRef: string;
  readonly screenAuthorityRef: string;
  readonly screens: readonly MobileScreenMapping[];
  readonly unknownScreenPolicy: "fail-closed";
  readonly nonClaims: Readonly<Record<string, false>>;
};

export type MobileScreenSemanticAuthority = {
  readonly capabilityIds: ReadonlySet<string>;
  readonly permissionIds: ReadonlySet<string>;
  readonly tenantBoundaryIds: ReadonlySet<string>;
  readonly privacyCategoryIds: ReadonlySet<string>;
  readonly validationIds: ReadonlySet<string>;
  readonly errorIds: ReadonlySet<string>;
  readonly auditEventIds: ReadonlySet<string>;
  readonly componentFixtureIds: ReadonlySet<string>;
  readonly semanticSourceRefs: ReadonlySet<string>;
};

export type MobileScreenValidationResult = {
  readonly ok: boolean;
  readonly findings: readonly string[];
};

const REQUIRED_NON_CLAIMS = [
  "expoReadiness",
  "mobileReadiness",
  "nativeReadiness",
  "storeReadiness",
  "deploymentReadiness",
  "stagingReadiness",
  "productionReadiness",
  "liveProviderReadiness",
  "humanAcceptance",
  "providerSetup",
  "credentialSetup",
  "easSetup",
  "nativeSigning",
  "storeSubmission",
  "externalServiceUse",
] as const;

const REQUIRED_SCREEN_ARRAY_FIELDS = [
  "permissionRefs",
  "privacyCategoryRefs",
  "validationRefs",
  "errorRefs",
  "auditEventRefs",
  "componentFixtureRefs",
  "semanticSourceRefs",
] as const;

const REQUIRED_SCREEN_STRING_FIELDS = [
  "screenId",
  "screenName",
  "routePath",
  "screenClass",
  "presentationBoundary",
  "capabilityId",
  "tenantBoundaryRef",
  "nonClaimBoundary",
] as const;

export const MOBILE_SCREEN_REGISTRY = {
  artifactId: "usf.app-surface-mobile-bounded-local-screen-registry",
  ownerIssueId: "USF-1018",
  framework: "expo",
  postureRef: "docs/adr/0016-expo-mobile-adapter-posture.md",
  mobileAdapterSemanticRef: "docs/architecture/mobile-adapter-semantic-surface.json",
  packageAuthorityRef: "docs/architecture/app-surface-package-installation-proof.json",
  screenAuthorityRef: "docs/architecture/app-surface-mobile-bounded-local-scaffold.json",
  unknownScreenPolicy: "fail-closed",
  screens: [
    {
      screenId: "mobile-screen-developer-home",
      screenName: "DeveloperHomeScreen",
      routePath: "/",
      screenClass: "private",
      presentationBoundary: "react-native-component",
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:read"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      privacyCategoryRefs: [
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-observability-privacy-semantics.json"
      ],
      validationRefs: [
        "docs/architecture/generated-client-contract-validation-semantics.json#validationSchemaGeneration",
        "typed-error-problem-details-model"
      ],
      errorRefs: ["typed-error-problem-details-model"],
      auditEventRefs: ["client-audit-event-emission", "graphql.developerProfile"],
      componentFixtureRefs: ["component-fixture-developer-profile-summary"],
      semanticSourceRefs: [
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
        "docs/architecture/mobile-adapter-semantic-surface.json",
        "docs/architecture/app-surface-package-installation-proof.json"
      ],
      nonClaimBoundary: "local Expo React Native screen scaffold only; no Expo, mobile, native, store, staging, deployment, production, live-provider, or human-acceptance readiness claim"
    }
  ],
  nonClaims: {
    expoReadiness: false,
    mobileReadiness: false,
    nativeReadiness: false,
    storeReadiness: false,
    deploymentReadiness: false,
    stagingReadiness: false,
    productionReadiness: false,
    liveProviderReadiness: false,
    humanAcceptance: false,
    providerSetup: false,
    credentialSetup: false,
    easSetup: false,
    nativeSigning: false,
    storeSubmission: false,
    externalServiceUse: false,
  },
} as const satisfies MobileScreenRegistry;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function validateNonClaims(nonClaims: unknown): string[] {
  if (!isRecord(nonClaims)) {
    return ["mobile-screen-registry:missing-non-claims"];
  }
  const findings: string[] = [];
  for (const claim of REQUIRED_NON_CLAIMS) {
    if (!(claim in nonClaims)) {
      findings.push(`mobile-screen-registry:missing-non-claim:${claim}`);
    } else if (nonClaims[claim] !== false) {
      findings.push(`mobile-screen-registry:overclaimed:${claim}`);
    }
  }
  for (const [claim, value] of Object.entries(nonClaims)) {
    if (value !== false) {
      findings.push(`mobile-screen-registry:overclaimed:${claim}`);
    }
  }
  return findings;
}

function validateAuthorityStringRef(
  findings: string[],
  screenId: string,
  ref: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  if (!isNonEmptyString(ref) || !authorityIds.has(ref)) {
    findings.push(`${screenId}:${findingPrefix}:${isNonEmptyString(ref) ? ref : "missing"}`);
  }
}

function validateAuthorityArrayRefs(
  findings: string[],
  screenId: string,
  refs: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  const values = hasNonEmptyStringArray(refs) ? refs : [];
  for (const ref of values) {
    if (!authorityIds.has(ref)) {
      findings.push(`${screenId}:${findingPrefix}:${ref}`);
    }
  }
}

function validateScreen(
  screen: unknown,
  index: number,
  semanticAuthority?: MobileScreenSemanticAuthority,
): string[] {
  if (!isRecord(screen)) {
    return [`mobile-screen-${index}:missing`];
  }
  const screenId = isNonEmptyString(screen.screenId) ? screen.screenId : `mobile-screen-${index}`;
  const findings: string[] = [];
  for (const field of REQUIRED_SCREEN_STRING_FIELDS) {
    if (!isNonEmptyString(screen[field])) {
      findings.push(`${screenId}:missing-${field}`);
    }
  }
  for (const field of REQUIRED_SCREEN_ARRAY_FIELDS) {
    if (!hasNonEmptyStringArray(screen[field])) {
      findings.push(`${screenId}:missing-${field}`);
    }
  }
  if (isNonEmptyString(screen.routePath) && !screen.routePath.startsWith("/")) {
    findings.push(`${screenId}:route-path-must-be-absolute`);
  }
  if (screen.screenClass !== "private" && screen.screenClass !== "public" && screen.screenClass !== "operator" && screen.screenClass !== "admin") {
    findings.push(`${screenId}:unknown-screen-class`);
  }
  if (screen.presentationBoundary !== "expo-managed-screen" && screen.presentationBoundary !== "react-native-component") {
    findings.push(`${screenId}:unknown-presentation-boundary`);
  }
  if (semanticAuthority) {
    if (!isNonEmptyString(screen.capabilityId) || !semanticAuthority.capabilityIds.has(screen.capabilityId)) {
      findings.push(`${screenId}:capability-authority-missing`);
    }
    validateAuthorityArrayRefs(findings, screenId, screen.permissionRefs, semanticAuthority.permissionIds, "permission-authority-missing");
    validateAuthorityStringRef(findings, screenId, screen.tenantBoundaryRef, semanticAuthority.tenantBoundaryIds, "tenant-authority-missing");
    validateAuthorityArrayRefs(findings, screenId, screen.privacyCategoryRefs, semanticAuthority.privacyCategoryIds, "privacy-authority-missing");
    validateAuthorityArrayRefs(findings, screenId, screen.validationRefs, semanticAuthority.validationIds, "validation-authority-missing");
    validateAuthorityArrayRefs(findings, screenId, screen.errorRefs, semanticAuthority.errorIds, "error-authority-missing");
    validateAuthorityArrayRefs(findings, screenId, screen.auditEventRefs, semanticAuthority.auditEventIds, "audit-authority-missing");
    validateAuthorityArrayRefs(findings, screenId, screen.componentFixtureRefs, semanticAuthority.componentFixtureIds, "component-fixture-authority-missing");
    validateAuthorityArrayRefs(findings, screenId, screen.semanticSourceRefs, semanticAuthority.semanticSourceRefs, "semantic-source-authority-missing");
  }
  return findings;
}

export function validateMobileScreenRegistry(
  registry: MobileScreenRegistry | unknown,
  semanticAuthority?: MobileScreenSemanticAuthority,
): MobileScreenValidationResult {
  if (!isRecord(registry)) {
    return { ok: false, findings: ["mobile-screen-registry:missing"] };
  }
  const findings: string[] = [];
  if (registry.ownerIssueId !== "USF-1018") {
    findings.push("mobile-screen-registry:unexpected-owner-issue");
  }
  if (registry.framework !== "expo") {
    findings.push("mobile-screen-registry:unexpected-framework");
  }
  if (registry.postureRef !== "docs/adr/0016-expo-mobile-adapter-posture.md") {
    findings.push("mobile-screen-registry:missing-expo-posture-ref");
  }
  if (registry.mobileAdapterSemanticRef !== "docs/architecture/mobile-adapter-semantic-surface.json") {
    findings.push("mobile-screen-registry:missing-mobile-adapter-semantic-ref");
  }
  if (registry.packageAuthorityRef !== "docs/architecture/app-surface-package-installation-proof.json") {
    findings.push("mobile-screen-registry:missing-package-authority-ref");
  }
  if (registry.unknownScreenPolicy !== "fail-closed") {
    findings.push("mobile-screen-registry:unknown-screen-policy-must-fail-closed");
  }
  if (!Array.isArray(registry.screens) || registry.screens.length === 0) {
    findings.push("mobile-screen-registry:missing-screens");
  } else {
    const seenScreenIds = new Set<string>();
    registry.screens.forEach((screen, index) => {
      findings.push(...validateScreen(screen, index, semanticAuthority));
      if (isRecord(screen) && isNonEmptyString(screen.screenId)) {
        if (seenScreenIds.has(screen.screenId)) {
          findings.push(`${screen.screenId}:duplicate-screen-id`);
        }
        seenScreenIds.add(screen.screenId);
      }
    });
  }
  findings.push(...validateNonClaims(registry.nonClaims));
  return { ok: findings.length === 0, findings };
}

export function getMobileScreenById(screenId: string): MobileScreenMapping {
  const screen = MOBILE_SCREEN_REGISTRY.screens.find((candidate) => candidate.screenId === screenId);
  if (!screen) {
    throw new Error(`mobile-screen-unknown:${screenId}`);
  }
  return screen;
}

export function assertMobileScreenRegistry(
  registry: MobileScreenRegistry | unknown = MOBILE_SCREEN_REGISTRY,
  semanticAuthority?: MobileScreenSemanticAuthority,
): void {
  const result = validateMobileScreenRegistry(registry, semanticAuthority);
  if (!result.ok) {
    throw new Error(`mobile-screen-registry-invalid:${result.findings.join(",")}`);
  }
}
