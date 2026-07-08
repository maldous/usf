import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  validateSharedClientConsumptionPath,
  type SharedClientConsumptionPath,
} from "@foundation/client";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const consumptionPath = readJson<SharedClientConsumptionPath>(
  "docs/architecture/app-surface-shared-client-consumption-path.json",
);

describe("USF-1015 shared client SDK consumption path", () => {
  it("accepts the governed shared-client consumption mapping", () => {
    const result = validateSharedClientConsumptionPath(consumptionPath);
    expect(result).toEqual({ ok: true, findings: [] });
    expect(consumptionPath.mappings.map((mapping) => mapping.behaviourClass).sort()).toEqual([
      "commands",
      "queries",
    ]);
  });

  it("fails closed when generated-client inputs are stale", () => {
    const stale = clone(consumptionPath);
    stale.generatedClient.currentWithSemanticInputs = false;
    const result = validateSharedClientConsumptionPath(stale);
    expect(result.ok).toBe(false);
    expect(result.findings).toContain("generated-client:stale-or-not-current-with-semantic-inputs");
  });

  it("fails closed when semantic authority input is missing", () => {
    const missingSemantic = clone(consumptionPath);
    missingSemantic.mappings[0]!.semanticContractId = "";
    const result = validateSharedClientConsumptionPath(missingSemantic);
    expect(result.ok).toBe(false);
    expect(result.findings).toContain("shared-client-query-developer-profile:missing-semanticContractId");
  });

  it("fails closed when permission or audit semantics are missing", () => {
    const missingPermission = clone(consumptionPath);
    missingPermission.mappings[1]!.permissionRefs = [];
    const permissionResult = validateSharedClientConsumptionPath(missingPermission);
    expect(permissionResult.ok).toBe(false);
    expect(permissionResult.findings).toContain(
      "shared-client-command-onboard-api-key:missing-permissionRefs",
    );

    const missingAudit = clone(consumptionPath);
    missingAudit.mappings[1]!.auditEventRefs = [];
    const auditResult = validateSharedClientConsumptionPath(missingAudit);
    expect(auditResult.ok).toBe(false);
    expect(auditResult.findings).toContain(
      "shared-client-command-onboard-api-key:missing-auditEventRefs",
    );
  });

  it("rejects UI-only behaviour so product semantics cannot be invented in presentation code", () => {
    const uiOnly = clone(consumptionPath) as SharedClientConsumptionPath & {
      mappings: Array<Record<string, unknown>>;
    };
    uiOnly.mappings[0]!.uiOnlyBehaviour = "invented-client-only-rule";
    const result = validateSharedClientConsumptionPath(uiOnly);
    expect(result.ok).toBe(false);
    expect(result.findings).toContain(
      "shared-client-query-developer-profile:ui-only-behaviour-not-authorised",
    );
  });

  it("preserves all shared-client non-claims", () => {
    for (const [claim, value] of Object.entries(consumptionPath.nonClaims)) {
      expect(value, claim).toBe(false);
    }
  });
});
