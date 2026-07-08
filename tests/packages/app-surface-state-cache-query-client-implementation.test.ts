import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY,
  exerciseLocalStateCacheBoundary,
  getLocalStateCacheBoundaryById,
  validateLocalStateCacheBoundaryMapping,
  validateLocalStateCacheQueryClientRegistry,
  type LocalStateCacheQueryClientAuthority,
} from "@foundation/app-surface";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const loadJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;

interface QueryViewImplementation {
  viewId: string;
  queryRef: string;
  capabilityId: string;
  permissionRefs: string[];
  tenantBoundaryRef: string;
  cachePolicyRefs: string[];
  privacyClassificationRefs: string[];
}

interface StateCacheImplementation {
  authorityInputs: string[];
  libraryDecisionPosture: {
    queryLibraryAdopted: boolean;
    packageDependenciesAddedByIssue: string[];
    lockfileChangedByIssue: boolean;
    repositoryDecisionGapFound: boolean;
    blockingDecisionIssueRequiredNow: boolean;
    futureLibraryWorkMustUseSeparateAuthorityIssue: boolean;
  };
  implementedStateBoundaries: Array<{ stateId: string; stateClass: string }>;
  nonClaims: Record<string, boolean>;
}

const stateCacheImplementation = loadJson<StateCacheImplementation>(
  "docs/architecture/app-surface-state-cache-query-client-implementation.json",
);
const queryImplementation = loadJson<{ implementedQueryViews: QueryViewImplementation[] }>(
  "docs/architecture/app-surface-query-list-detail-implementation.json",
);
const clientStateSemantics = loadJson<{
  implementationGate: Record<string, boolean>;
}>("docs/architecture/client-state-storage-sync-semantics.json");

const queryViews = queryImplementation.implementedQueryViews;
const flatten = (values: string[][]): string[] => Array.from(new Set(values.flat()));
const implementationAuthorityInputs = stateCacheImplementation.authorityInputs;

const semanticAuthority: LocalStateCacheQueryClientAuthority = {
  stateClasses: ["server-query-cache", "ui-ephemeral-state", "session-purge-signal"],
  queryRefs: Array.from(new Set(queryViews.map((view) => view.queryRef))),
  queryViewRefs: queryViews.map((view) => view.viewId),
  capabilityIds: Array.from(new Set(queryViews.map((view) => view.capabilityId))),
  permissionRefs: flatten(queryViews.map((view) => view.permissionRefs)),
  tenantBoundaryRefs: Array.from(new Set(queryViews.map((view) => view.tenantBoundaryRef))),
  privacyClassificationRefs: flatten(queryViews.map((view) => view.privacyClassificationRefs)),
  cachePolicyRefs: Array.from(new Set([...flatten(queryViews.map((view) => view.cachePolicyRefs)), "query-cache-freshness-required"])),
  storageLocationRefs: ["in-memory-only"],
  retentionPolicyRefs: [
    "docs/architecture/client-state-storage-sync-semantics.json#client-device-browser-retention",
    "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
  ],
  purgeTriggerRefs: [
    "docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge",
    "docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture",
  ],
  logoutPurgeRefs: ["docs/architecture/client-state-storage-sync-semantics.json#logout-session-expiry-purge"],
  sharedDevicePostureRefs: ["docs/architecture/client-state-storage-sync-semantics.json#privacy-mode-shared-device-posture"],
  failClosedRefs: [
    "missing-state-classification",
    "missing-privacy-classification",
    "missing-purge-policy",
    "partial-purge-fail-closed",
    "persistent-sensitive-storage-not-authorised",
    "query-library-setup-not-authorised",
    "ui-only-behaviour-not-authorised",
  ],
  semanticSourceRefs: implementationAuthorityInputs,
  proofRefs: [
    "docs/architecture/app-surface-state-cache-query-client-implementation.json",
    "tests/packages/app-surface-state-cache-query-client-implementation.test.ts",
    "tools/validate-app-surface/validate-app-surface.py",
  ],
};

const cloneRegistry = (): any => JSON.parse(JSON.stringify(LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY));

describe("app-surface state cache and query client setup", () => {
  it("maps explicit state classes to repository-owned semantics", () => {
    expect(validateLocalStateCacheQueryClientRegistry(LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY, semanticAuthority)).toEqual([]);
    expect(new Set(LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.stateBoundaries.map((boundary) => boundary.stateClass))).toEqual(
      new Set(["server-query-cache", "ui-ephemeral-state", "session-purge-signal"]),
    );
    expect(stateCacheImplementation.implementedStateBoundaries.map((boundary) => boundary.stateId)).toEqual(
      LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.stateBoundaries.map((boundary) => boundary.stateId),
    );
  });

  it("exercises only in-memory local boundaries without provider or deployment claims", () => {
    for (const boundary of LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.stateBoundaries) {
      const result = exerciseLocalStateCacheBoundary(boundary, semanticAuthority);
      expect(result.providerMode).toBe("in-memory-only");
      expect(result.environment).toBe("dev-local");
      expect(result.storageLocationRef).toBe("in-memory-only");
      expect(result.persistentSensitiveStorageUsed).toBe(false);
      expect(result.queryLibraryUsed).toBe(false);
      expect(result.syncEngineUsed).toBe(false);
      expect(result.offlineFirstUsed).toBe(false);
      expect(result.realtimeProviderUsed).toBe(false);
      expect(result.backgroundRefreshUsed).toBe(false);
      expect(result.externalStateServiceUsed).toBe(false);
      expect(result.stagingUsed).toBe(false);
      expect(result.deploymentUsed).toBe(false);
    }
  });

  it("fails closed when state classification is missing", () => {
    const registry = cloneRegistry();
    registry.stateBoundaries[0] = {
      ...registry.stateBoundaries[0],
      stateClass: "",
    };
    expect(validateLocalStateCacheQueryClientRegistry(registry, semanticAuthority)).toContain(
      "state-cache-developer-profile-query-result:missing-stateClass",
    );
  });

  it("fails closed when privacy, logout, or purge semantics are missing", () => {
    const registry = cloneRegistry();
    registry.stateBoundaries[0] = {
      ...registry.stateBoundaries[0],
      privacyClassificationRefs: [],
      purgeTriggerRefs: [],
      logoutPurgeRef: "",
    };
    const findings = validateLocalStateCacheQueryClientRegistry(registry, semanticAuthority);
    expect(findings).toContain("state-cache-developer-profile-query-result:missing-privacyClassificationRefs");
    expect(findings).toContain("state-cache-developer-profile-query-result:missing-purgeTriggerRefs");
    expect(findings).toContain("state-cache-developer-profile-query-result:missing-logoutPurgeRef");
  });

  it("rejects persistent sensitive storage and registry-level storage enablement", () => {
    const registry = cloneRegistry();
    registry.persistentSensitiveStorageAllowed = true;
    registry.stateBoundaries[0] = {
      ...registry.stateBoundaries[0],
      persistentSensitiveStorageAllowed: true,
    };
    const findings = validateLocalStateCacheQueryClientRegistry(registry, semanticAuthority);
    expect(findings).toContain("state-cache-query-client-registry:persistent-sensitive-storage-not-authorised");
    expect(findings).toContain("state-cache-developer-profile-query-result:persistent-sensitive-storage-not-authorised");
  });

  it("rejects query-library, sync, offline, realtime, and background flags", () => {
    const registry = cloneRegistry();
    registry.queryLibrarySetupAllowed = true;
    registry.syncEngineAllowed = true;
    registry.offlineReadinessAllowed = true;
    registry.realtimeProviderAllowed = true;
    registry.backgroundRefreshAllowed = true;
    registry.stateBoundaries[0] = {
      ...registry.stateBoundaries[0],
      queryLibraryRequired: true,
      syncAllowed: true,
      offlineAllowed: true,
      realtimeAllowed: true,
      backgroundRefreshAllowed: true,
    };
    const findings = validateLocalStateCacheQueryClientRegistry(registry, semanticAuthority);
    expect(findings).toContain("state-cache-query-client-registry:query-library-setup-not-authorised");
    expect(findings).toContain("state-cache-query-client-registry:sync-engine-not-authorised");
    expect(findings).toContain("state-cache-query-client-registry:offline-first-not-authorised");
    expect(findings).toContain("state-cache-query-client-registry:realtime-provider-not-authorised");
    expect(findings).toContain("state-cache-query-client-registry:background-refresh-not-authorised");
    expect(findings).toContain("state-cache-developer-profile-query-result:query-library-setup-not-authorised");
    expect(findings).toContain("state-cache-developer-profile-query-result:sync-engine-not-authorised");
    expect(findings).toContain("state-cache-developer-profile-query-result:offline-first-not-authorised");
    expect(findings).toContain("state-cache-developer-profile-query-result:realtime-provider-not-authorised");
    expect(findings).toContain("state-cache-developer-profile-query-result:background-refresh-not-authorised");
  });

  it("fails closed for unknown, unregistered, or drifted boundaries", () => {
    const boundary = LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.stateBoundaries[0];
    expect(() => getLocalStateCacheBoundaryById("state-cache-unknown")).toThrow(/state-cache-boundary-unknown/);
    expect(() =>
      exerciseLocalStateCacheBoundary(
        {
          ...boundary,
          stateId: "state-cache-unregistered",
        },
        semanticAuthority,
      ),
    ).toThrow(/state-cache-boundary-unregistered/);
    expect(() =>
      exerciseLocalStateCacheBoundary(
        {
          ...boundary,
          nonClaimBoundary: "drifted boundary",
        },
        semanticAuthority,
      ),
    ).toThrow(/state-cache-boundary-registry-mismatch/);
  });

  it("records that package/query-library decisions are not adopted by this issue", () => {
    expect(stateCacheImplementation.libraryDecisionPosture.queryLibraryAdopted).toBe(false);
    expect(stateCacheImplementation.libraryDecisionPosture.packageDependenciesAddedByIssue).toEqual([]);
    expect(stateCacheImplementation.libraryDecisionPosture.lockfileChangedByIssue).toBe(false);
    expect(stateCacheImplementation.libraryDecisionPosture.repositoryDecisionGapFound).toBe(false);
    expect(stateCacheImplementation.libraryDecisionPosture.blockingDecisionIssueRequiredNow).toBe(false);
    expect(stateCacheImplementation.libraryDecisionPosture.futureLibraryWorkMustUseSeparateAuthorityIssue).toBe(true);
    expect(clientStateSemantics.implementationGate.queryLibrarySetupAllowed).toBe(false);
    expect(clientStateSemantics.implementationGate.storageImplementationAllowed).toBe(false);
    expect(clientStateSemantics.implementationGate.syncEngineImplementationAllowed).toBe(false);
  });

  it("preserves false non-claims", () => {
    expect(Object.values(LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.nonClaims).every((value) => value === false)).toBe(true);
    expect(Object.values(stateCacheImplementation.nonClaims).every((value) => value === false)).toBe(true);
    expect(validateLocalStateCacheBoundaryMapping(LOCAL_STATE_CACHE_QUERY_CLIENT_REGISTRY.stateBoundaries[0], semanticAuthority)).toEqual([]);
  });
});
