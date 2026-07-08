import { existsSync, readFileSync } from "node:fs";

export type WebRouteClass = "private" | "public" | "operator" | "admin";
export type WebRenderingBoundary = "server-component" | "client-component" | "route-handler";

export type WebRouteMapping = {
  readonly routeId: string;
  readonly path: string;
  readonly nextRouteSegment: string;
  readonly routeClass: WebRouteClass;
  readonly renderingBoundary: WebRenderingBoundary;
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

export type WebRouteRegistry = {
  readonly artifactId: string;
  readonly ownerIssueId: string;
  readonly framework: "nextjs";
  readonly postureRef: string;
  readonly webAdapterSemanticRef: string;
  readonly routeAuthorityRef: string;
  readonly routes: readonly WebRouteMapping[];
  readonly unknownRoutePolicy: "fail-closed";
  readonly nonClaims: Readonly<Record<string, false>>;
};

export type WebRouteSemanticAuthority = {
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

export type WebRouteValidationResult = {
  readonly ok: boolean;
  readonly findings: readonly string[];
};

const REQUIRED_NON_CLAIMS = [
  "webReadiness",
  "deploymentReadiness",
  "cdnReadiness",
  "stagingReadiness",
  "productionReadiness",
  "liveProviderReadiness",
  "humanAcceptance",
  "providerSetup",
  "credentialSetup",
  "externalServiceUse",
] as const;

const REQUIRED_ROUTE_ARRAY_FIELDS = [
  "permissionRefs",
  "privacyCategoryRefs",
  "validationRefs",
  "errorRefs",
  "auditEventRefs",
  "componentFixtureRefs",
  "semanticSourceRefs",
] as const;

const REQUIRED_ROUTE_STRING_FIELDS = [
  "routeId",
  "path",
  "nextRouteSegment",
  "routeClass",
  "renderingBoundary",
  "capabilityId",
  "tenantBoundaryRef",
  "nonClaimBoundary",
] as const;

const REPOSITORY_ROOT_URL = new URL("../../../", import.meta.url);

const ROUTE_SEMANTIC_SOURCE_PATHS = [
  "docs/architecture/app-surface-local-in-memory-runtime.json",
  "docs/architecture/app-surface-shared-client-consumption-path.json",
  "docs/architecture/app-surface-web-adapter-semantics.json",
] as const;

export const WEB_ROUTE_REGISTRY = {
  artifactId: "usf.app-surface-web-bounded-local-route-registry",
  ownerIssueId: "USF-1017",
  framework: "nextjs",
  postureRef: "docs/adr/0017-nextjs-web-adapter-posture.md",
  webAdapterSemanticRef: "docs/architecture/app-surface-web-adapter-semantics.json",
  routeAuthorityRef: "docs/architecture/app-surface-web-bounded-local-scaffold.json",
  unknownRoutePolicy: "fail-closed",
  routes: [
    {
      routeId: "web-route-developer-home",
      path: "/",
      nextRouteSegment: "app/page.tsx",
      routeClass: "private",
      renderingBoundary: "server-component",
      capabilityId: "graphql-federation-generated-client-disposition",
      permissionRefs: ["developer:read"],
      tenantBoundaryRef: "tenant.dev-local-fixture",
      privacyCategoryRefs: [
        "docs/architecture/client-query-cache-privacy-semantics.json",
        "docs/architecture/app-surface-observability-privacy-semantics.json",
      ],
      validationRefs: [
        "docs/architecture/generated-client-contract-validation-semantics.json#validationSchemaGeneration",
        "typed-error-problem-details-model",
      ],
      errorRefs: ["typed-error-problem-details-model"],
      auditEventRefs: ["client-audit-event-emission", "graphql.developerProfile"],
      componentFixtureRefs: ["component-fixture-developer-profile-summary"],
      semanticSourceRefs: [
        "docs/architecture/app-surface-local-in-memory-runtime.json",
        "docs/architecture/app-surface-shared-client-consumption-path.json",
        "docs/architecture/app-surface-web-adapter-semantics.json",
      ],
      nonClaimBoundary: "local Next.js route scaffold only; no web, deployment, CDN, staging, production, live-provider, or human-acceptance readiness claim",
    },
  ],
  nonClaims: {
    webReadiness: false,
    deploymentReadiness: false,
    cdnReadiness: false,
    stagingReadiness: false,
    productionReadiness: false,
    liveProviderReadiness: false,
    humanAcceptance: false,
    providerSetup: false,
    credentialSetup: false,
    externalServiceUse: false,
  },
} as const satisfies WebRouteRegistry;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function readRepositoryJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(new URL(relativePath, REPOSITORY_ROOT_URL), "utf8"));
}

function addIdsFromRefs(target: Set<string>, refs: unknown): void {
  if (!Array.isArray(refs)) {
    return;
  }
  for (const ref of refs) {
    if (isRecord(ref) && isNonEmptyString(ref.id)) {
      target.add(ref.id);
    }
  }
}

function addStringRefs(target: Set<string>, refs: unknown): void {
  if (!Array.isArray(refs)) {
    return;
  }
  for (const ref of refs) {
    if (isNonEmptyString(ref)) {
      target.add(ref);
    }
  }
}

function addStringRef(target: Set<string>, ref: unknown): void {
  if (isNonEmptyString(ref)) {
    target.add(ref);
  }
}

export function buildWebRouteSemanticAuthorityFromRepository(): WebRouteSemanticAuthority {
  const localRuntime = readRepositoryJson(
    "docs/architecture/app-surface-local-in-memory-runtime.json",
  );
  const sharedClient = readRepositoryJson(
    "docs/architecture/app-surface-shared-client-consumption-path.json",
  );
  const capabilityIds = new Set<string>();
  const permissionIds = new Set<string>();
  const tenantBoundaryIds = new Set<string>();
  const privacyCategoryIds = new Set<string>();
  const validationIds = new Set<string>();
  const errorIds = new Set<string>();
  const auditEventIds = new Set<string>();
  const componentFixtureIds = new Set<string>();
  const semanticSourceRefs = new Set<string>();

  if (isRecord(localRuntime) && isRecord(localRuntime.semanticInputs)) {
    addIdsFromRefs(capabilityIds, localRuntime.semanticInputs.capabilities);
    addIdsFromRefs(permissionIds, localRuntime.semanticInputs.permissions);
    addIdsFromRefs(tenantBoundaryIds, localRuntime.semanticInputs.tenantContexts);
    addIdsFromRefs(validationIds, localRuntime.semanticInputs.validationRules);
    addIdsFromRefs(errorIds, localRuntime.semanticInputs.errorRefs);
    addIdsFromRefs(auditEventIds, localRuntime.semanticInputs.auditEvents);
  }

  if (isRecord(localRuntime) && Array.isArray(localRuntime.componentFixtures)) {
    for (const fixture of localRuntime.componentFixtures) {
      if (!isRecord(fixture)) {
        continue;
      }
      addStringRef(componentFixtureIds, fixture.fixtureId);
      addStringRef(capabilityIds, fixture.capabilityId);
      addStringRef(tenantBoundaryIds, fixture.tenantContextId);
      addStringRefs(permissionIds, fixture.requiredPermissionRefs);
      addStringRefs(validationIds, fixture.validationRefs);
      addStringRefs(errorIds, fixture.errorRefs);
      addStringRefs(auditEventIds, fixture.auditEventRefs);
    }
  }

  if (isRecord(sharedClient) && Array.isArray(sharedClient.mappings)) {
    for (const mapping of sharedClient.mappings) {
      if (!isRecord(mapping)) {
        continue;
      }
      addStringRef(capabilityIds, mapping.capabilityId);
      addStringRefs(permissionIds, mapping.permissionRefs);
      addStringRefs(privacyCategoryIds, mapping.privacyCategoryRefs);
      addStringRefs(validationIds, mapping.validationRefs);
      addStringRefs(errorIds, mapping.errorRefs);
      addStringRefs(auditEventIds, mapping.auditEventRefs);
    }
  }

  for (const sourcePath of ROUTE_SEMANTIC_SOURCE_PATHS) {
    if (existsSync(new URL(sourcePath, REPOSITORY_ROOT_URL))) {
      semanticSourceRefs.add(sourcePath);
    }
  }

  return {
    capabilityIds,
    permissionIds,
    tenantBoundaryIds,
    privacyCategoryIds,
    validationIds,
    errorIds,
    auditEventIds,
    componentFixtureIds,
    semanticSourceRefs,
  };
}

function validateNonClaims(nonClaims: unknown): string[] {
  if (!isRecord(nonClaims)) {
    return ["web-route-registry:missing-non-claims"];
  }
  const findings: string[] = [];
  for (const claim of REQUIRED_NON_CLAIMS) {
    if (!(claim in nonClaims)) {
      findings.push(`web-route-registry:missing-non-claim:${claim}`);
    } else if (nonClaims[claim] !== false) {
      findings.push(`web-route-registry:overclaimed:${claim}`);
    }
  }
  for (const [claim, value] of Object.entries(nonClaims)) {
    if (value !== false) {
      findings.push(`web-route-registry:overclaimed:${claim}`);
    }
  }
  return findings;
}

function validateAuthorityStringRef(
  findings: string[],
  routeId: string,
  ref: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  if (!isNonEmptyString(ref) || !authorityIds.has(ref)) {
    findings.push(`${routeId}:${findingPrefix}:${isNonEmptyString(ref) ? ref : "missing"}`);
  }
}

function validateAuthorityArrayRefs(
  findings: string[],
  routeId: string,
  refs: unknown,
  authorityIds: ReadonlySet<string>,
  findingPrefix: string,
): void {
  const values = hasNonEmptyStringArray(refs) ? refs : [];
  for (const ref of values) {
    if (!authorityIds.has(ref)) {
      findings.push(`${routeId}:${findingPrefix}:${ref}`);
    }
  }
}

function validateRoute(
  route: unknown,
  index: number,
  semanticAuthority?: WebRouteSemanticAuthority,
): string[] {
  if (!isRecord(route)) {
    return [`web-route-${index}:missing`];
  }
  const routeId = isNonEmptyString(route.routeId) ? route.routeId : `web-route-${index}`;
  const findings: string[] = [];
  for (const field of REQUIRED_ROUTE_STRING_FIELDS) {
    if (!isNonEmptyString(route[field])) {
      findings.push(`${routeId}:missing-${field}`);
    }
  }
  for (const field of REQUIRED_ROUTE_ARRAY_FIELDS) {
    if (!hasNonEmptyStringArray(route[field])) {
      findings.push(`${routeId}:missing-${field}`);
    }
  }
  if (isNonEmptyString(route.path) && !route.path.startsWith("/")) {
    findings.push(`${routeId}:path-must-be-absolute`);
  }
  if (route.routeClass !== "private" && route.routeClass !== "public" && route.routeClass !== "operator" && route.routeClass !== "admin") {
    findings.push(`${routeId}:unknown-route-class`);
  }
  if (
    route.renderingBoundary !== "server-component" &&
    route.renderingBoundary !== "client-component" &&
    route.renderingBoundary !== "route-handler"
  ) {
    findings.push(`${routeId}:unknown-rendering-boundary`);
  }
  if (semanticAuthority) {
    if (!isNonEmptyString(route.capabilityId) || !semanticAuthority.capabilityIds.has(route.capabilityId)) {
      findings.push(`${routeId}:capability-authority-missing`);
    }
    const permissionRefs = hasNonEmptyStringArray(route.permissionRefs) ? route.permissionRefs : [];
    for (const permissionRef of permissionRefs) {
      if (!semanticAuthority.permissionIds.has(permissionRef)) {
        findings.push(`${routeId}:permission-authority-missing:${permissionRef}`);
      }
    }
    validateAuthorityStringRef(
      findings,
      routeId,
      route.tenantBoundaryRef,
      semanticAuthority.tenantBoundaryIds,
      "tenant-authority-missing",
    );
    validateAuthorityArrayRefs(
      findings,
      routeId,
      route.privacyCategoryRefs,
      semanticAuthority.privacyCategoryIds,
      "privacy-authority-missing",
    );
    validateAuthorityArrayRefs(
      findings,
      routeId,
      route.validationRefs,
      semanticAuthority.validationIds,
      "validation-authority-missing",
    );
    validateAuthorityArrayRefs(
      findings,
      routeId,
      route.errorRefs,
      semanticAuthority.errorIds,
      "error-authority-missing",
    );
    validateAuthorityArrayRefs(
      findings,
      routeId,
      route.auditEventRefs,
      semanticAuthority.auditEventIds,
      "audit-authority-missing",
    );
    validateAuthorityArrayRefs(
      findings,
      routeId,
      route.componentFixtureRefs,
      semanticAuthority.componentFixtureIds,
      "component-fixture-authority-missing",
    );
    validateAuthorityArrayRefs(
      findings,
      routeId,
      route.semanticSourceRefs,
      semanticAuthority.semanticSourceRefs,
      "semantic-source-authority-missing",
    );
  }
  return findings;
}

export function validateWebRouteRegistry(
  registry: WebRouteRegistry | unknown,
  semanticAuthority?: WebRouteSemanticAuthority,
): WebRouteValidationResult {
  if (!isRecord(registry)) {
    return { ok: false, findings: ["web-route-registry:missing"] };
  }
  const findings: string[] = [];
  let resolvedSemanticAuthority = semanticAuthority;
  if (!resolvedSemanticAuthority) {
    try {
      resolvedSemanticAuthority = buildWebRouteSemanticAuthorityFromRepository();
    } catch (error) {
      findings.push(
        `web-route-registry:semantic-authority-unavailable:${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  if (registry.ownerIssueId !== "USF-1017") {
    findings.push("web-route-registry:unexpected-owner-issue");
  }
  if (registry.framework !== "nextjs") {
    findings.push("web-route-registry:unexpected-framework");
  }
  if (registry.postureRef !== "docs/adr/0017-nextjs-web-adapter-posture.md") {
    findings.push("web-route-registry:missing-nextjs-posture-ref");
  }
  if (registry.webAdapterSemanticRef !== "docs/architecture/app-surface-web-adapter-semantics.json") {
    findings.push("web-route-registry:missing-web-adapter-semantic-ref");
  }
  if (registry.unknownRoutePolicy !== "fail-closed") {
    findings.push("web-route-registry:unknown-route-policy-must-fail-closed");
  }
  if (!Array.isArray(registry.routes) || registry.routes.length === 0) {
    findings.push("web-route-registry:missing-routes");
  } else {
    const seenPaths = new Set<string>();
    registry.routes.forEach((route, index) => {
      findings.push(...validateRoute(route, index, resolvedSemanticAuthority));
      if (isRecord(route) && isNonEmptyString(route.path)) {
        if (seenPaths.has(route.path)) {
          findings.push(`${route.routeId ?? `web-route-${index}`}:duplicate-path`);
        }
        seenPaths.add(route.path);
      }
    });
  }
  findings.push(...validateNonClaims(registry.nonClaims));
  return { ok: findings.length === 0, findings };
}

export function getWebRouteByPath(path: string): WebRouteMapping {
  const route = WEB_ROUTE_REGISTRY.routes.find((candidate) => candidate.path === path);
  if (!route) {
    throw new Error(`web-route-unknown:${path}`);
  }
  return route;
}

export function assertWebRouteRegistry(
  registry: WebRouteRegistry | unknown = WEB_ROUTE_REGISTRY,
  semanticAuthority?: WebRouteSemanticAuthority,
): void {
  const result = validateWebRouteRegistry(registry, semanticAuthority);
  if (!result.ok) {
    throw new Error(`web-route-registry-invalid:${result.findings.join(",")}`);
  }
}

if (process.argv.includes("--selftest")) {
  assertWebRouteRegistry(WEB_ROUTE_REGISTRY, buildWebRouteSemanticAuthorityFromRepository());
}
