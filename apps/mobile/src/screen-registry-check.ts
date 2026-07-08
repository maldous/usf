import { existsSync, readFileSync } from "node:fs";
import {
  MOBILE_SCREEN_REGISTRY,
  assertMobileScreenRegistry,
  type MobileScreenSemanticAuthority,
} from "./screen-registry";

const REPOSITORY_ROOT_URL = new URL("../../../", import.meta.url);
const SCREEN_SEMANTIC_SOURCE_PATHS = [
  "docs/architecture/app-surface-local-in-memory-runtime.json",
  "docs/architecture/app-surface-shared-client-consumption-path.json",
  "docs/architecture/mobile-adapter-semantic-surface.json",
  "docs/architecture/app-surface-package-installation-proof.json",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

export function buildMobileScreenSemanticAuthorityFromRepository(): MobileScreenSemanticAuthority {
  const localRuntime = readRepositoryJson("docs/architecture/app-surface-local-in-memory-runtime.json");
  const sharedClient = readRepositoryJson("docs/architecture/app-surface-shared-client-consumption-path.json");
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

  for (const sourcePath of SCREEN_SEMANTIC_SOURCE_PATHS) {
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

if (process.argv.includes("--selftest")) {
  assertMobileScreenRegistry(MOBILE_SCREEN_REGISTRY, buildMobileScreenSemanticAuthorityFromRepository());
}
