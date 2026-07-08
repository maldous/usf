import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LOCAL_QUERY_LIST_DETAIL_REGISTRY,
  exerciseLocalQueryView,
  getLocalQueryViewById,
  validateLocalQueryListDetailRegistry,
  type LocalAppSurfaceRuntimeDefinition,
  type LocalQueryListDetailMapping,
  type LocalQueryListDetailRegistry,
  type LocalQueryListDetailSemanticAuthority,
} from "@foundation/app-surface";
import type { SharedClientConsumptionPath } from "@foundation/client";

type QueryListDetailImplementation = {
  ownerIssueId: string;
  implementedQueryViews: Array<{
    viewId: string;
    viewKind: "list" | "detail";
    queryRef: string;
    capabilityId: string;
    permissionRefs: string[];
    tenantBoundaryRef: string;
    cacheFreshnessRef: string;
    cachePolicyRefs: string[];
    privacyClassificationRefs: string[];
    errorRefs: string[];
    auditEventRefs: string[];
    i18nKeyRefs: string[];
    accessibilityRefs: string[];
    telemetryRefs: string[];
  }>;
  validationGuard: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

type QueryFixture = {
  fixtureId: string;
  targetRuleId: string;
  ownerIssueId: string;
  expectedFailureRuleId?: string;
  query: {
    queryRef?: string;
    cacheFreshnessRef?: string;
    privacyClassificationRef?: string;
    tenantBoundaryRef?: string;
    errorModelRef?: string;
    proofRefs?: string[];
  };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ids(values: Array<{ id: string }>): Set<string> {
  return new Set(values.map((value) => value.id));
}

function buildAuthority(): LocalQueryListDetailSemanticAuthority {
  const runtime = readJson<LocalAppSurfaceRuntimeDefinition>(
    "docs/architecture/app-surface-local-in-memory-runtime.json",
  );
  const sharedClient = readJson<SharedClientConsumptionPath>(
    "docs/architecture/app-surface-shared-client-consumption-path.json",
  );
  const conforming = readJson<QueryFixture>(
    "tools/validate-app-surface/fixtures/conforming/004-query-with-cache-privacy.json",
  );
  const queryMappings = sharedClient.mappings.filter((mapping) => mapping.behaviourClass === "queries");
  const componentFixtureIds = new Set(runtime.componentFixtures.map((fixture) => fixture.fixtureId));
  const queryRefs = ids(runtime.semanticInputs.queries);
  const capabilityIds = ids(runtime.semanticInputs.capabilities);
  const permissionIds = ids(runtime.semanticInputs.permissions);
  const tenantBoundaryIds = ids(runtime.semanticInputs.tenantContexts);
  const errorIds = ids(runtime.semanticInputs.errorRefs);
  const auditEventIds = ids(runtime.semanticInputs.auditEvents);
  const cachePolicyRefs = new Set([
    "docs/architecture/client-query-cache-privacy-semantics.json#cacheInvalidationSemantics",
    "docs/architecture/client-query-cache-privacy-semantics.json#queryViewModelMapping",
  ]);
  const privacyClassificationRefs = new Set([conforming.query.privacyClassificationRef ?? ""]);
  const telemetryRefs = new Set<string>();

  for (const mapping of queryMappings) {
    queryRefs.add(mapping.commandOrQueryOrWorkflowOrEventId);
    capabilityIds.add(mapping.capabilityId);
    mapping.permissionRefs.forEach((ref) => permissionIds.add(ref));
    mapping.errorRefs.forEach((ref) => errorIds.add(ref));
    mapping.auditEventRefs.forEach((ref) => auditEventIds.add(ref));
    mapping.privacyCategoryRefs.forEach((ref) => privacyClassificationRefs.add(ref));
    mapping.telemetryRefs.forEach((ref) => telemetryRefs.add(ref));
    cachePolicyRefs.add(mapping.offlineRetryCachePosture.cacheSemanticsRef);
  }

  return {
    queryRefs,
    capabilityIds,
    permissionIds,
    tenantBoundaryIds,
    cacheFreshnessRefs: new Set([conforming.query.cacheFreshnessRef ?? ""]),
    cachePolicyRefs,
    privacyClassificationRefs,
    errorIds,
    auditEventIds,
    componentFixtureIds,
    i18nKeyRefs: new Set([
      "docs/architecture/app-surface-i18n-localisation-semantics.json#query-list-empty-error-state-keys",
      "docs/architecture/app-surface-i18n-localisation-semantics.json#query-detail-not-found-error-state-keys",
    ]),
    accessibilityRefs: new Set([
      "docs/architecture/app-surface-accessibility-semantics.json#query-list-keyboard-focus-screen-reader-labels",
      "docs/architecture/app-surface-accessibility-semantics.json#query-detail-keyboard-focus-screen-reader-labels",
    ]),
    telemetryRefs,
    semanticSourceRefs: new Set([
      "docs/architecture/client-query-cache-privacy-semantics.json",
      "docs/architecture/app-surface-local-in-memory-runtime.json",
      "docs/architecture/app-surface-shared-client-consumption-path.json",
      "tools/validate-app-surface/fixtures/conforming/004-query-with-cache-privacy.json",
    ]),
    proofRefs: new Set([
      "tests/packages/app-surface-query-list-detail-implementation.test.ts",
      "tools/validate-app-surface/validate-app-surface.py",
    ]),
  };
}

const implementation = readJson<QueryListDetailImplementation>(
  "docs/architecture/app-surface-query-list-detail-implementation.json",
);
const conformingQueryFixture = readJson<QueryFixture>(
  "tools/validate-app-surface/fixtures/conforming/004-query-with-cache-privacy.json",
);
const plantedQueryFixture = readJson<QueryFixture>(
  "tools/validate-app-surface/planted-defects/004-query-missing-cache-privacy.json",
);
const semanticAuthority = buildAuthority();

describe("USF-1022 query list and detail implementation", () => {
  it("maps list and detail views to semantic query authority", () => {
    const validation = validateLocalQueryListDetailRegistry(LOCAL_QUERY_LIST_DETAIL_REGISTRY, semanticAuthority);

    expect(validation).toEqual({ ok: true, findings: [] });
    expect(implementation.ownerIssueId).toBe("USF-1022");
    expect(implementation.implementedQueryViews.map((view) => view.viewId)).toEqual(
      LOCAL_QUERY_LIST_DETAIL_REGISTRY.queryViews.map((view) => view.viewId),
    );
    expect(implementation.implementedQueryViews.map((view) => view.viewKind).sort()).toEqual(["detail", "list"]);
  });

  it("exercises local query views without server state providers or persistent storage", () => {
    const listOutcome = exerciseLocalQueryView(getLocalQueryViewById("query-view-developer-profile-list"), semanticAuthority);
    const detailOutcome = exerciseLocalQueryView(getLocalQueryViewById("query-view-developer-profile-detail"), semanticAuthority);

    for (const outcome of [listOutcome, detailOutcome]) {
      expect(outcome).toMatchObject({
        queryRef: "query.developerProfile",
        providerMode: "in-memory-only",
        serverStateProviderUsed: false,
        persistentSensitiveStorageUsed: false,
        realtimeSubscriptionUsed: false,
        backgroundRefreshUsed: false,
        stagingUsed: false,
        deploymentUsed: false,
      });
      expect(outcome.permissionRefsChecked).toContain("developer:read");
      expect(outcome.cacheFreshnessRefChecked).toBe("query-cache-freshness-required");
      expect(outcome.privacyClassificationRefsChecked).toContain("privacy-classification-required");
    }
  });

  it("fails closed when query authority is missing", () => {
    const registry = clone(LOCAL_QUERY_LIST_DETAIL_REGISTRY) as LocalQueryListDetailRegistry;
    registry.queryViews[0]!.queryRef = "query.missing";

    const validation = validateLocalQueryListDetailRegistry(registry, semanticAuthority);

    expect(validation.ok).toBe(false);
    expect(validation.findings).toContain("query-view-developer-profile-list:query-authority-missing:query.missing");
  });

  it("fails closed when cache and privacy mappings are missing", () => {
    const registry = clone(LOCAL_QUERY_LIST_DETAIL_REGISTRY) as LocalQueryListDetailRegistry;
    registry.queryViews[0]!.cacheFreshnessRef = "";
    registry.queryViews[0]!.cachePolicyRefs = [];
    registry.queryViews[0]!.privacyClassificationRefs = [];

    const validation = validateLocalQueryListDetailRegistry(registry, semanticAuthority);

    expect(validation.ok).toBe(false);
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        "query-view-developer-profile-list:missing-cacheFreshnessRef",
        "query-view-developer-profile-list:missing-cachePolicyRefs",
        "query-view-developer-profile-list:missing-privacyClassificationRefs",
      ]),
    );
  });

  it("fails closed for unknown query views", () => {
    expect(getLocalQueryViewById("query-view-developer-profile-list").queryRef).toBe("query.developerProfile");
    expect(() => getLocalQueryViewById("query-view-missing")).toThrow("query-view-unknown:query-view-missing");
  });

  it("fails closed when a semantically valid query view is not registered", () => {
    const queryView = clone(LOCAL_QUERY_LIST_DETAIL_REGISTRY.queryViews[0]!) as LocalQueryListDetailMapping;
    queryView.viewId = "query-view-unregistered";

    expect(() => exerciseLocalQueryView(queryView, semanticAuthority)).toThrow(
      "query-view-unregistered:query-view-unregistered",
    );
  });

  it("satisfies USF-932-style query cache and privacy validator expectations", () => {
    expect(conformingQueryFixture).toMatchObject({
      fixtureId: "query-with-cache-privacy",
      targetRuleId: "USF-APP-SURFACE-VALIDATOR-004",
      ownerIssueId: "USF-932",
    });
    expect(conformingQueryFixture.query.queryRef).toBeTruthy();
    expect(conformingQueryFixture.query.cacheFreshnessRef).toBeTruthy();
    expect(conformingQueryFixture.query.privacyClassificationRef).toBeTruthy();
    expect(conformingQueryFixture.query.tenantBoundaryRef).toBeTruthy();
    expect(conformingQueryFixture.query.errorModelRef).toBeTruthy();
    expect(conformingQueryFixture.query.proofRefs?.length).toBeGreaterThan(0);

    expect(plantedQueryFixture).toMatchObject({
      fixtureId: "query-missing-cache-privacy",
      targetRuleId: "USF-APP-SURFACE-VALIDATOR-004",
      ownerIssueId: "USF-932",
      expectedFailureRuleId: "USF-APP-SURFACE-VALIDATOR-004",
    });
    expect(plantedQueryFixture.query.cacheFreshnessRef).toBeUndefined();
    expect(plantedQueryFixture.query.privacyClassificationRef).toBeUndefined();
  });

  it("preserves proof references and non-claims", () => {
    for (const queryView of LOCAL_QUERY_LIST_DETAIL_REGISTRY.queryViews) {
      for (const proofRef of queryView.proofRefs) {
        expect(existsSync(proofRef), proofRef).toBe(true);
      }
    }
    expect(Object.values(implementation.validationGuard)).toEqual(
      Array.from({ length: Object.values(implementation.validationGuard).length }, () => true),
    );
    expect(Object.values(implementation.nonClaims)).toEqual(
      Array.from({ length: Object.values(implementation.nonClaims).length }, () => false),
    );
  });
});
