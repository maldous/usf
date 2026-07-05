import { readFileSync } from "node:fs";
import {
  assertFixtureCorpusSafe,
  loadSyntheticFixtureCorpus,
  semanticFixtureByContractId,
  serviceFixtureById,
  serviceFixtureRequiresSeeder,
} from "./synthetic-fixture-corpus.ts";
import { describe, expect, it } from "vitest";

const obligationManifest = JSON.parse(
  readFileSync("docs/architecture/semantic-service-test-obligation-manifest.json", "utf8"),
);

describe("synthetic fixture corpus", () => {
  it("covers every service obligation without allowing in-memory service substitutes", () => {
    const corpus = loadSyntheticFixtureCorpus();
    assertFixtureCorpusSafe(corpus);

    for (const obligation of obligationManifest.serviceObligations) {
      const fixture = serviceFixtureById(corpus, obligation.serviceId);
      expect(fixture, obligation.serviceId).toBeDefined();
      expect(fixture?.fixtureSeedId).toBe(obligation.fixtureSeedId);
      expect(fixture?.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(fixture?.testReadinessClaimAllowed).toBe(false);

      if (obligation.generatedInTestCompose && obligation.fixtureSeedId !== "not-applicable") {
        expect(serviceFixtureRequiresSeeder(fixture!)).toBe(true);
        expect(fixture?.lifecycleApi.seederId).toBe(`seeder.${obligation.serviceId}`);
        expect(fixture?.lifecycleApi.resetterId).toBe(`resetter.${obligation.serviceId}`);
        expect(fixture?.lifecycleApi.cleanupId).toBe(`cleanup.${obligation.serviceId}`);
        expect(fixture?.lifecycleCoverage.seed).toBe(true);
        expect(fixture?.lifecycleCoverage.reset).toBe(true);
        expect(fixture?.lifecycleCoverage.cleanup).toBe(true);
        expect(fixture?.lifecycleCoverage.repeatability).toBe(true);
        expect(fixture?.lifecycleCoverage.failureRecovery).toBe(true);
      }
    }
  });

  it("covers every semantic contract obligation with synthetic seed metadata", () => {
    const corpus = loadSyntheticFixtureCorpus();

    for (const obligation of obligationManifest.semanticContractObligations) {
      const fixture = semanticFixtureByContractId(corpus, obligation.contractId);
      expect(fixture, obligation.contractId).toBeDefined();
      expect(fixture?.path).toBe(obligation.path);
      expect(fixture?.fixtureSeedIds.length).toBeGreaterThan(0);
      expect(fixture?.provenance.syntheticOnly).toBe(true);
      expect(fixture?.provenance.productionDerived).toBe(false);
      expect(fixture?.semanticSeedCoverage).toMatchObject({
        tenant: "covered",
        actor: "covered",
        role: "covered",
        permission: "covered",
        audit: "covered",
        readiness: "covered",
        dataShape: "covered",
        positivePath: "covered",
        negativeFailClosedPath: "covered",
      });
    }
  });

  it("preserves test-readiness non-claims at corpus level", () => {
    const corpus = loadSyntheticFixtureCorpus();

    expect(corpus.allowedClaims).toEqual([
      "bounded-synthetic-fixture-corpus-defined-and-validator-enforced",
    ]);
    expect(corpus.nonClaims).toEqual(
      expect.arrayContaining([
        "final-test-readiness",
        "test-readiness",
        "staging-readiness",
        "production-readiness",
        "deployment-readiness",
        "live-provider-readiness",
        "soc-readiness",
        "iso27001-certification",
        "enterprise-production-readiness",
        "product-ui-readiness",
        "browser-e2e-readiness",
        "full-product-readiness",
      ]),
    );
  });
});
