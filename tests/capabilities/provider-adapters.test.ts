import {
  PROVIDER_CATEGORIES,
  PROVIDER_REGISTRY,
  assertProviderUsable,
  createAuditEventDraft,
  providerStatusViews,
  validateProviderRegistry,
  type ProviderAdapterMode,
  type ProviderRegistryEntry,
} from "@foundation/core";
import { describe, expect, it } from "vitest";

function mutate(
  provider: ProviderRegistryEntry,
  patch: Partial<ProviderRegistryEntry>,
): ProviderRegistryEntry {
  return Object.freeze({ ...provider, ...patch }) as ProviderRegistryEntry;
}

describe("provider adapters and modes", () => {
  it("registers every provider with explicit category, mode, owner, and classification", () => {
    const validation = validateProviderRegistry();
    expect(validation).toMatchObject({ ok: true, findings: [] });

    const categories = new Set(PROVIDER_REGISTRY.map((provider) => provider.providerCategory));
    for (const category of PROVIDER_CATEGORIES) {
      expect(categories.has(category)).toBe(true);
    }
    for (const provider of PROVIDER_REGISTRY) {
      expect(provider.providerId).toEqual(expect.any(String));
      expect(provider.providerMode).toEqual(expect.any(String));
      expect(provider.owningCapability).toEqual(expect.any(String));
      expect(provider.dataClassification).toEqual(expect.any(String));
      expect(provider.configRef.startsWith("config://")).toBe(true);
    }
  });

  it("fails validation for unknown modes and unauthorised live providers", () => {
    const unknownMode = mutate(PROVIDER_REGISTRY[0]!, {
      providerMode: "unknown-provider-mode" as ProviderAdapterMode,
    });
    expect(validateProviderRegistry([unknownMode]).ok).toBe(false);

    const unauthorisedLive = mutate(PROVIDER_REGISTRY[0]!, {
      providerMode: "live-external-authorised",
      lifecycleState: "proposed",
      explicitAuthorityRef: null,
      liveReadinessClaim: true,
    });
    const findings = validateProviderRegistry([unauthorisedLive]).findings.map(
      (finding) => finding.ruleId,
    );
    expect(findings).toContain("live-provider-authority-missing");
  });

  it("requires provider credentials to be SecretReference objects only", () => {
    const credentialed = PROVIDER_REGISTRY.find((provider) => provider.credentialRef);
    expect(credentialed?.credentialRef).toMatchObject({
      secretRef: expect.stringMatching(/^secret:\/\//),
      secretProvider: expect.any(String),
      status: "active",
    });

    const rawCredential = mutate(PROVIDER_REGISTRY[0]!, {
      credentialRef: "raw-provider-token" as unknown as ProviderRegistryEntry["credentialRef"],
    });
    expect(validateProviderRegistry([rawCredential]).ok).toBe(false);
  });

  it("redacts provider status views and does not claim live readiness", () => {
    const views = providerStatusViews();
    const text = JSON.stringify(views).toLowerCase();
    expect(text).not.toContain("secret://");
    expect(text).not.toContain("endpoint://compose/postgres");
    expect(text).not.toContain("http://");
    expect(text).not.toContain("https://");
    expect(text).not.toContain("bearer ");
    expect(text).not.toContain("private_key");
    expect(views.every((view) => view.liveReadinessClaim === false)).toBe(true);
    expect(views.every((view) => view.productionReadinessClaim === false)).toBe(true);
  });

  it("separates health from readiness and fails closed for unusable providers", () => {
    const composedDeferred = PROVIDER_REGISTRY.find(
      (provider) =>
        provider.providerMode === "composed-test" && provider.readinessStatus === "deferred",
    );
    expect(composedDeferred).toBeDefined();
    expect(composedDeferred?.healthStatus).toBe("healthy");
    expect(composedDeferred?.readinessStatus).toBe("deferred");

    for (const mode of ["live-external-deferred", "disabled", "unavailable"] as const) {
      const provider = PROVIDER_REGISTRY.find((entry) => entry.providerMode === mode);
      expect(provider).toBeDefined();
      expect(() => assertProviderUsable(provider!, "test use")).toThrow();
    }
  });

  it("keeps provider audit evidence value-free", () => {
    const event = createAuditEventDraft({
      eventId: "provider-audit-test",
      eventType: "provider.call.failed",
      tenantId: "tenant-alpha",
      actorId: "service-provider-test",
      action: "provider.call.failed",
      outcome: "failed",
      resourceType: "provider",
      resourceId: "notification-delivery-in-memory",
      reasonCode: "provider-safe-failure",
      safeMessage: "provider call failed safely",
      metadata: {
        credential_ref: "secret://local-dev/provider-test",
        credential_endpoint: "endpoint://compose/postgres",
        credential_failure: "Bearer provider-test-token",
        safeReason: "provider-timeout",
      },
    });
    const text = JSON.stringify(event).toLowerCase();
    expect(text).not.toContain("secret://local-dev/provider-test");
    expect(text).not.toContain("endpoint://compose/postgres");
    expect(text).not.toContain("bearer provider-test-token");
    expect(event.metadata.safeReason).toBe("provider-timeout");
  });
});
