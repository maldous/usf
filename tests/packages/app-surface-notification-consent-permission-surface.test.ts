import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LOCAL_NOTIFICATION_CONSENT_PERMISSION_REGISTRY,
  describeLocalNotificationSurface,
  exerciseLocalNotificationSurface,
  getLocalNotificationSurfaceById,
  validateLocalNotificationConsentPermissionRegistry,
  type LocalNotificationAuthority,
} from "@foundation/app-surface";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const loadJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as T;

interface NotificationConsentPermissionImplementation {
  authorityInputs: Array<{ path: string }>;
  notificationConsentPermissionMappings: Array<{
    surfaceId: string;
    channel: string;
    implementationPath: string;
    capabilityRef: string;
    consentRef: string;
    permissionRef: string;
    preferenceRef: string;
    channelLifecycleRef: string;
    optOutBoundaryRef: string;
    auditRef: string;
    providerModeRef: string;
    semanticSourceRefs: string[];
    proofRefs: string[];
  }>;
  nonClaims: Record<string, boolean>;
}

const implementation = loadJson<NotificationConsentPermissionImplementation>(
  "docs/architecture/app-surface-notification-consent-permission-surface.json",
);

const surfaceRefs = implementation.notificationConsentPermissionMappings.map((surface) => surface.surfaceId);
const capabilityRefs = Array.from(
  new Set(implementation.notificationConsentPermissionMappings.map((surface) => surface.capabilityRef)),
);
const consentRefs = Array.from(
  new Set(implementation.notificationConsentPermissionMappings.map((surface) => surface.consentRef)),
);
const permissionRefs = Array.from(
  new Set(implementation.notificationConsentPermissionMappings.map((surface) => surface.permissionRef)),
);
const preferenceRefs = Array.from(
  new Set(implementation.notificationConsentPermissionMappings.map((surface) => surface.preferenceRef)),
);
const semanticSourceRefs = Array.from(
  new Set(implementation.notificationConsentPermissionMappings.flatMap((surface) => surface.semanticSourceRefs)),
);
const proofRefs = Array.from(new Set(implementation.notificationConsentPermissionMappings.flatMap((surface) => surface.proofRefs)));

const semanticAuthority: LocalNotificationAuthority = {
  surfaceRefs,
  capabilityRefs,
  consentRefs,
  permissionRefs,
  preferenceRefs,
  semanticSourceRefs,
  proofRefs,
};

const cloneRegistry = (): any => JSON.parse(JSON.stringify(LOCAL_NOTIFICATION_CONSENT_PERMISSION_REGISTRY));

describe("app-surface notification consent and permission surface", () => {
  it("maps local notification surfaces to explicit consent and permission semantics", () => {
    expect(validateLocalNotificationConsentPermissionRegistry(LOCAL_NOTIFICATION_CONSENT_PERMISSION_REGISTRY, semanticAuthority)).toEqual([]);
    expect(new Set(LOCAL_NOTIFICATION_CONSENT_PERMISSION_REGISTRY.surfaces.map((surface) => surface.surfaceId))).toEqual(
      new Set(surfaceRefs),
    );
    for (const surface of implementation.notificationConsentPermissionMappings) {
      const registered = getLocalNotificationSurfaceById(surface.surfaceId);
      expect(surface.channel).toBe("in-app");
      expect(registered.channel).toBe("in-app");
      expect(registered.implementationPath).toBe(surface.implementationPath);
      expect(registered.capabilityRef).toBe(surface.capabilityRef);
      expect(registered.consentRef).toBe("notification-consent-required");
      expect(registered.permissionRef).toBe("platform.notifications.write");
      expect(registered.preferenceRef).toBe("notification-preference-required");
      expect(registered.providerModeRef).toBe("provider-mode-not-live-external-provider");
    }
  });

  it("describes bounded local notification surfaces without readiness claims", () => {
    expect(describeLocalNotificationSurface("notification-surface-developer-inbox")).toMatchObject({
      surfaceId: "notification-surface-developer-inbox",
      surfaceKind: "in-app-inbox",
      channel: "in-app",
      capabilityRef: "semantic-contract.notification-delivery-and-preferences-and-channels",
      consentRef: "notification-consent-required",
      permissionRef: "platform.notifications.write",
      preferenceRef: "notification-preference-required",
      providerModeRef: "provider-mode-not-live-external-provider",
      notificationReadyClaimed: false,
      pushReadyClaimed: false,
      liveProviderReadyClaimed: false,
      stagingReadyClaimed: false,
      productionReadyClaimed: false,
      humanAcceptanceClaimed: false,
    });
  });

  it("fails closed for unknown surfaces and missing consent, permission, or preference mappings", () => {
    expect(() => getLocalNotificationSurfaceById("missing-notification-surface")).toThrow(
      /local-notification-surface-missing-fail-closed:missing-notification-surface/,
    );
    expect(exerciseLocalNotificationSurface({ surfaceId: "notification-surface-developer-inbox" })).toMatchObject({
      decision: "deny",
      reasonCode: "notification-consent-mapping-missing-fail-closed",
    });
    expect(
      exerciseLocalNotificationSurface({
        surfaceId: "notification-surface-developer-inbox",
        consentRef: "notification-consent-required",
      }),
    ).toMatchObject({
      decision: "deny",
      reasonCode: "notification-permission-mapping-missing-fail-closed",
    });
    expect(
      exerciseLocalNotificationSurface({
        surfaceId: "notification-surface-developer-inbox",
        consentRef: "notification-consent-required",
        permissionRef: "platform.notifications.write",
      }),
    ).toMatchObject({
      decision: "deny",
      reasonCode: "notification-preference-mapping-missing-fail-closed",
    });
    expect(
      exerciseLocalNotificationSurface({
        surfaceId: "notification-surface-developer-inbox",
        consentRef: "notification-consent-required",
        permissionRef: "platform.notifications.write",
        preferenceRef: "notification-preference-required",
      }),
    ).toMatchObject({
      decision: "allow-local-record",
      reasonCode: "local-notification-consent-permission-mapped",
      providerMode: "local-non-live-only",
      notificationReadyClaimed: false,
      pushReadyClaimed: false,
      liveProviderReadyClaimed: false,
    });
  });

  it("rejects provider, credential, push, service-worker, deployment, and staging drift", () => {
    const registry = cloneRegistry();
    registry.externalProviderAllowed = true;
    registry.credentialsAllowed = true;
    registry.pushProviderAllowed = true;
    registry.mobilePushCredentialsAllowed = true;
    registry.serviceWorkerPushAllowed = true;
    registry.deploymentAllowed = true;
    registry.stagingAllowed = true;
    registry.providerConfig = { endpoint: "forbidden" };
    registry.surfaces[0].pushProviderAllowed = true;
    registry.surfaces[1].serviceWorkerRegistration = "forbidden";
    const findings = validateLocalNotificationConsentPermissionRegistry(registry, semanticAuthority);
    expect(findings).toContain("local-notification-consent-permission-registry:external-provider-not-authorised");
    expect(findings).toContain("local-notification-consent-permission-registry:credentials-not-authorised");
    expect(findings).toContain("local-notification-consent-permission-registry:push-provider-not-authorised");
    expect(findings).toContain("local-notification-consent-permission-registry:mobile-push-credentials-not-authorised");
    expect(findings).toContain("local-notification-consent-permission-registry:service-worker-push-not-authorised");
    expect(findings).toContain("local-notification-consent-permission-registry:deployment-not-authorised");
    expect(findings).toContain("local-notification-consent-permission-registry:staging-not-authorised");
    expect(findings).toContain("local-notification-consent-permission-registry:forbidden-providerConfig");
    expect(findings).toContain("local-notification-surface:notification-surface-developer-inbox:push-provider-not-authorised");
    expect(findings).toContain("local-notification-surface:notification-surface-developer-toast:forbidden-serviceWorkerRegistration");
  });

  it("satisfies USF-933-style notification consent fixture expectations", () => {
    const conforming = loadJson<{
      targetRuleId: string;
      fixtureId: string;
      mapping: Record<string, string>;
    }>("tools/validate-app-surface/fixtures/conforming/005-notification-with-consent-permission.json");
    const planted = loadJson<{ expectedFailureRuleId: string; fixtureId: string; mapping: Record<string, string> }>(
      "tools/validate-app-surface/planted-defects/005-notification-without-consent-permission.json",
    );
    expect(conforming.targetRuleId).toBe("USF-APP-SURFACE-VALIDATOR-005");
    expect(conforming.fixtureId).toBe("notification-with-consent-permission");
    for (const field of ["consentRef", "permissionRef", "channelLifecycleRef", "optOutBoundaryRef", "auditRef", "providerModeRef"]) {
      expect(conforming.mapping[field]).toBeTruthy();
    }
    for (const surface of LOCAL_NOTIFICATION_CONSENT_PERMISSION_REGISTRY.surfaces) {
      expect(surface.consentRef).toBe(conforming.mapping.consentRef);
      expect(surface.permissionRef).toBe(conforming.mapping.permissionRef);
      expect(surface.channelLifecycleRef).toBe(conforming.mapping.channelLifecycleRef);
      expect(surface.optOutBoundaryRef).toBe(conforming.mapping.optOutBoundaryRef);
      expect(surface.auditRef).toBe(conforming.mapping.auditRef);
      expect(surface.providerModeRef).toBe(conforming.mapping.providerModeRef);
    }
    expect(planted.fixtureId).toBe("notification-without-consent-permission");
    expect(planted.expectedFailureRuleId).toBe("USF-APP-SURFACE-VALIDATOR-005");
    expect(planted.mapping.consentRef).toBeUndefined();
  });

  it("preserves all notification non-claims as false", () => {
    expect(Object.values(LOCAL_NOTIFICATION_CONSENT_PERMISSION_REGISTRY.nonClaims).every((value) => value === false)).toBe(true);
    expect(Object.values(implementation.nonClaims).every((value) => value === false)).toBe(true);
  });
});
