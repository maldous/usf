import { readFileSync } from "node:fs";

const CORPUS_URL = new URL("./service-fixture-corpus.json", import.meta.url);

export interface FixtureLifecycleApi {
  readonly seederId: string;
  readonly resetterId: string;
  readonly cleanupId: string;
  readonly teardownId: string;
  readonly apiModule: string;
}

export interface FixtureProvenance {
  readonly syntheticOnly: boolean;
  readonly productionDerived: boolean;
  readonly realTenantDataAllowed: boolean;
  readonly realSecretsAllowed: boolean;
  readonly liveProviderPayloadAllowed?: boolean;
  readonly privateLocalStateAllowed: boolean;
}

export interface ServiceFixtureRow {
  readonly serviceId: string;
  readonly fixtureSeedId: string;
  readonly generatedInTestCompose: boolean;
  readonly requiredInTest: boolean;
  readonly lifecycleApi: FixtureLifecycleApi;
  readonly lifecycleCoverage: Record<string, boolean | string>;
  readonly provenance: FixtureProvenance;
  readonly validationCommands: readonly string[];
  readonly inMemoryServiceSubstituteAllowed: boolean;
  readonly testReadinessClaimAllowed: boolean;
  readonly nonTestDisposition: null | Record<string, unknown>;
}

export interface SemanticContractFixtureRow {
  readonly contractId: string;
  readonly path: string;
  readonly fixtureSeedIds: readonly string[];
  readonly semanticSeedCoverage: Record<string, string>;
  readonly provenance: FixtureProvenance;
  readonly validationCommands: readonly string[];
}

export interface SyntheticFixtureCorpus {
  readonly id: "synthetic-deterministic-fixture-corpus";
  readonly issueId: "USF-248";
  readonly parentIssueId: "USF-234";
  readonly corpusPath: "tests/packages/fixtures/service-fixture-corpus.json";
  readonly apiModule: "tests/packages/fixtures/synthetic-fixture-corpus.ts";
  readonly serviceFixtures: readonly ServiceFixtureRow[];
  readonly semanticContractFixtures: readonly SemanticContractFixtureRow[];
  readonly validationCommands: readonly string[];
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

export function loadSyntheticFixtureCorpus(): SyntheticFixtureCorpus {
  return JSON.parse(readFileSync(CORPUS_URL, "utf8")) as SyntheticFixtureCorpus;
}

export function serviceFixtureById(
  corpus: SyntheticFixtureCorpus,
  serviceId: string,
): ServiceFixtureRow | undefined {
  return corpus.serviceFixtures.find((row) => row.serviceId === serviceId);
}

export function semanticFixtureByContractId(
  corpus: SyntheticFixtureCorpus,
  contractId: string,
): SemanticContractFixtureRow | undefined {
  return corpus.semanticContractFixtures.find((row) => row.contractId === contractId);
}

export function serviceFixtureRequiresSeeder(row: ServiceFixtureRow): boolean {
  return row.generatedInTestCompose && row.fixtureSeedId !== "not-applicable";
}

export function assertFixtureCorpusSafe(corpus: SyntheticFixtureCorpus): void {
  const prohibitedClaims = new Set([
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
    "full-react-product-parity",
  ]);
  for (const claim of corpus.allowedClaims) {
    if (prohibitedClaims.has(claim)) {
      throw new Error(`fixture corpus allowed a prohibited claim: ${claim}`);
    }
  }
  for (const row of corpus.serviceFixtures) {
    if (row.inMemoryServiceSubstituteAllowed) {
      throw new Error(`fixture row allows in-memory substitution: ${row.serviceId}`);
    }
    if (row.testReadinessClaimAllowed) {
      throw new Error(`fixture row allows test-readiness claim: ${row.serviceId}`);
    }
    if (!row.provenance.syntheticOnly || row.provenance.productionDerived) {
      throw new Error(`fixture row has unsafe provenance: ${row.serviceId}`);
    }
    if (row.provenance.realTenantDataAllowed || row.provenance.realSecretsAllowed) {
      throw new Error(`fixture row allows real tenant data or secrets: ${row.serviceId}`);
    }
  }
}
