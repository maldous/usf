import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  exerciseLocalInMemoryAppSurfaceRuntime,
  validateLocalInMemoryAppSurfaceRuntime,
  type LocalAppSurfaceRuntimeDefinition,
} from "@foundation/app-surface";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const runtimeDefinition = readJson<LocalAppSurfaceRuntimeDefinition>(
  "docs/architecture/app-surface-local-in-memory-runtime.json",
);

describe("USF-1016 local in-memory app-surface runtime", () => {
  it("exercises governed component fixtures in memory only", () => {
    const validation = validateLocalInMemoryAppSurfaceRuntime(runtimeDefinition);
    expect(validation).toEqual({ ok: true, findings: [] });

    const outcomes = exerciseLocalInMemoryAppSurfaceRuntime(runtimeDefinition);
    expect(outcomes.map((outcome) => outcome.fixtureId).sort()).toEqual([
      "component-fixture-api-key-onboarding",
      "component-fixture-developer-profile-summary",
    ]);
    for (const outcome of outcomes) {
      expect(outcome.status).toBe("exercised-local-in-memory");
      expect(outcome.providerMode).toBe("in-memory-only");
      expect(outcome.externalProviderUsed).toBe(false);
      expect(outcome.credentialsUsed).toBe(false);
      expect(outcome.stagingUsed).toBe(false);
      expect(outcome.deploymentUsed).toBe(false);
      expect(outcome.auditEventRefsEmitted.length).toBeGreaterThan(0);
    }
  });

  it("fails closed when capability semantics are missing", () => {
    const missingCapability = clone(runtimeDefinition);
    missingCapability.semanticInputs.capabilities = [];
    const validation = validateLocalInMemoryAppSurfaceRuntime(missingCapability);
    expect(validation.ok).toBe(false);
    expect(validation.findings).toContain("semantic-inputs:capabilities-missing");
    expect(() => exerciseLocalInMemoryAppSurfaceRuntime(missingCapability)).toThrow(
      /local-in-memory-app-surface-runtime-invalid/,
    );
  });

  it("fails closed when permission semantics are missing", () => {
    const missingPermission = clone(runtimeDefinition);
    missingPermission.semanticInputs.permissions = missingPermission.semanticInputs.permissions.filter(
      (permission) => permission.id !== "developer:key:onboard",
    );
    const validation = validateLocalInMemoryAppSurfaceRuntime(missingPermission);
    expect(validation.ok).toBe(false);
    expect(validation.findings).toContain(
      "component-fixture-api-key-onboarding:unknown-permission:developer:key:onboard",
    );
    expect(() => exerciseLocalInMemoryAppSurfaceRuntime(missingPermission)).toThrow(
      /local-in-memory-app-surface-runtime-invalid/,
    );
  });

  it("rejects external provider or credential-shaped runtime configuration", () => {
    const externalProvider = clone(runtimeDefinition) as unknown as {
      adapterBoundary: Record<string, unknown>;
    };
    externalProvider.adapterBoundary.externalProviderAllowed = true;
    externalProvider.adapterBoundary.providerEndpoint = "https://provider.invalid";
    const validation = validateLocalInMemoryAppSurfaceRuntime(
      externalProvider as LocalAppSurfaceRuntimeDefinition,
    );
    expect(validation.ok).toBe(false);
    expect(validation.findings).toContain("adapter-boundary:externalProviderAllowed-must-be-false");
    expect(validation.findings).toContain("adapter-boundary:providerEndpoint-not-authorised");
  });

  it("preserves local runtime non-claims and rejects readiness overclaim", () => {
    for (const [claim, value] of Object.entries(runtimeDefinition.nonClaims)) {
      expect(value, claim).toBe(false);
    }

    const overclaimed = clone(runtimeDefinition);
    overclaimed.nonClaims.liveProviderReadiness = true;
    const validation = validateLocalInMemoryAppSurfaceRuntime(overclaimed);
    expect(validation.ok).toBe(false);
    expect(validation.findings).toContain("non-claims:liveProviderReadiness-overclaimed");
  });
});
