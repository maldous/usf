import { readFileSync } from "node:fs";
import { devProviderPlan, testComposeProviders } from "@foundation/capability-config";
import { describe, expect, it } from "vitest";

describe("provider substrate", () => {
  it("keeps dev providers in memory", () => {
    expect(
      Object.values(devProviderPlan).every(
        (value) => value.includes("in-memory") || value.includes("local"),
      ),
    ).toBe(true);
  });

  it("declares test Compose OSS providers without floating latest images", () => {
    const compose = readFileSync("compose/compose.yaml", "utf8");
    for (const provider of testComposeProviders) {
      expect(compose).toContain(`${provider}:`);
    }
    expect(compose).not.toMatch(/:latest\b/);
  });
});
