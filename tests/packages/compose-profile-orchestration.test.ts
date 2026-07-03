import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type CommandPhase =
  | "config"
  | "port-policy"
  | "start"
  | "readiness"
  | "seed"
  | "exercise"
  | "observe"
  | "reset"
  | "cleanup"
  | "teardown"
  | "residue-check";

interface OrchestrationProfileCommand {
  readonly profile: string;
  readonly projectName: string;
  readonly serviceIds: readonly string[];
  readonly profileFlags: readonly string[];
  readonly commandSequence: Record<CommandPhase, string>;
}

interface ServiceExerciseRow {
  readonly serviceId: string;
  readonly serviceCatalogueId: string;
  readonly profile: string;
  readonly fixtureSeedId: string;
}

interface ComposeProfileOrchestration {
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly composeTarget: string;
  readonly proofCommand: string;
  readonly scope: {
    readonly generatedServiceCount: number;
    readonly profileCount: number;
    readonly safeProfileCombinationCount: number;
    readonly requiresNonComposeEvidence: boolean;
    readonly treatsGeneratedComposeAsProofByItself: boolean;
    readonly finalTestReadinessClaimAllowed: boolean;
    readonly inMemoryServiceSubstituteAllowedForServiceBackedClaims: boolean;
  };
  readonly requiredExercisePhases: readonly CommandPhase[];
  readonly canonicalProfileCommands: readonly OrchestrationProfileCommand[];
  readonly safeProfileCombinations: readonly OrchestrationProfileCommand[];
  readonly serviceExerciseRows: readonly ServiceExerciseRow[];
  readonly serviceEvidencePolicy: {
    readonly requiredIntegrationEvidenceTests: readonly string[];
    readonly requiredFixtureLifecycleApiKeys: readonly string[];
    readonly requiredFixtureLifecycleCoverage: readonly string[];
    readonly nonComposeEvidenceRefs: readonly string[];
  };
  readonly profileEvidencePolicy: {
    readonly requiredProfileFlags: readonly string[];
    readonly requiresDefaultPromotionGuard: boolean;
    readonly requiresProfileOmissionGuard: boolean;
    readonly requiresDependencyDriftGuard: boolean;
    readonly requiresLoopbackOnlyHostBindings: boolean;
    readonly nonComposeEvidenceRefs: readonly string[];
  };
  readonly postRunResidueChecks: readonly {
    readonly checkId: string;
    readonly mustBeEmpty: boolean;
  }[];
  readonly failureDiagnostics: readonly {
    readonly diagnosticId: string;
    readonly findingCode: string;
    readonly action: string;
  }[];
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

interface IntegrationMatrix {
  readonly composeTarget: string;
  readonly generatedServiceCount: number;
  readonly profileCount: number;
  readonly serviceIntegrationRows: readonly {
    readonly serviceId: string;
    readonly serviceCatalogueId: string;
    readonly composeProfiles: readonly string[];
    readonly fixtureSeedId: string;
    readonly generatedInTestCompose: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly lifecycleApi: Record<string, string>;
    readonly evidenceTests: Record<string, string>;
    readonly safeOperationEvidence: Record<string, string>;
    readonly nonClaims: readonly string[];
  }[];
  readonly profileIntegrationRows: readonly {
    readonly profile: string;
    readonly composeTarget: string;
    readonly serviceIds: readonly string[];
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly proofCommand: string;
    readonly nonClaims: readonly string[];
    readonly [key: string]: unknown;
  }[];
}

interface ObligationManifest {
  readonly profileObligations: readonly {
    readonly profile: string;
    readonly composeTarget: string;
    readonly serviceIds: readonly string[];
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly [key: string]: unknown;
  }[];
  readonly serviceObligations: readonly {
    readonly serviceId: string;
    readonly composeServiceId: string;
    readonly composeProfiles: readonly string[];
    readonly generatedInTestCompose: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly ownerIssueIds: readonly string[];
  }[];
}

interface FixtureCorpus {
  readonly serviceFixtures: readonly {
    readonly serviceId: string;
    readonly composeServiceId: string;
    readonly fixtureSeedId: string;
    readonly generatedInTestCompose: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly lifecycleApi: Record<string, string>;
    readonly lifecycleCoverage: Record<string, boolean | string>;
    readonly provenance: Record<string, boolean>;
  }[];
}

interface ComposeServiceBlock {
  readonly serviceId: string;
  readonly text: string;
  readonly profiles: readonly string[];
}

const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const REQUIRED_NON_CLAIMS = [
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
  "full-react-product-parity",
  "usf-234-closure",
] as const;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function byId<T extends object>(rows: readonly T[], key: keyof T): Map<string, T> {
  return new Map(rows.map((row) => [String(row[key]), row]));
}

function parseComposeServices(composeText: string): ComposeServiceBlock[] {
  const servicesStart = composeText.indexOf("\nservices:\n");
  const volumesStart = composeText.indexOf("\nvolumes:\n");
  expect(servicesStart).toBeGreaterThanOrEqual(0);
  expect(volumesStart).toBeGreaterThan(servicesStart);

  const serviceText = composeText.slice(servicesStart, volumesStart);
  const matches = [...serviceText.matchAll(/^[ ]{2}([A-Za-z0-9_-]+):\n/gm)];
  return matches.map((match, index) => {
    const serviceId = match[1];
    if (!serviceId) {
      throw new Error("generated Compose service block did not expose a service id");
    }
    const start = match.index ?? 0;
    const nextMatch = matches[index + 1];
    const end =
      index + 1 < matches.length && nextMatch
        ? (nextMatch.index ?? serviceText.length)
        : serviceText.length;
    const text = serviceText.slice(start, end);
    const profileMatch = /profiles:\n((?:[ ]{6}- .+(?:\n|$))+)/.exec(text);
    const profileBlock = profileMatch?.[1];
    const profiles = profileBlock
      ? profileBlock
          .trim()
          .split("\n")
          .map((line) => line.replace(/^\s*-\s*/, "").trim())
      : ["default"];
    return { serviceId, text, profiles };
  });
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function commandForEveryPhase(
  row: OrchestrationProfileCommand,
  phases: readonly CommandPhase[],
): void {
  for (const phase of phases) {
    expect(row.commandSequence[phase], `${row.profile} missing ${phase}`).toBeTruthy();
  }
  expect(row.commandSequence.config).toContain(COMPOSE_TARGET);
  expect(row.commandSequence.start).toContain("up -d --wait");
  expect(row.commandSequence.reset).toContain("down --volumes --remove-orphans");
  expect(row.commandSequence.teardown).toContain("down --volumes --remove-orphans");
}

const orchestration = readJson<ComposeProfileOrchestration>(
  "docs/architecture/compose-profile-orchestration.json",
);
const integration = readJson<IntegrationMatrix>(
  "docs/architecture/composed-service-integration-test-matrix.json",
);
const manifest = readJson<ObligationManifest>(
  "docs/architecture/semantic-service-test-obligation-manifest.json",
);
const fixtures = readJson<FixtureCorpus>("tests/packages/fixtures/service-fixture-corpus.json");
const composeText = readFileSync(COMPOSE_TARGET, "utf8");
const composeServices = parseComposeServices(composeText);

describe("compose profile orchestration", () => {
  it("preserves bounded USF-251 metadata and non-claims", () => {
    expect(orchestration.issueId).toBe("USF-251");
    expect(orchestration.parentIssueId).toBe("USF-234");
    expect(orchestration.composeTarget).toBe(COMPOSE_TARGET);
    expect(orchestration.proofCommand).toBe(
      "corepack pnpm test -- tests/packages/compose-profile-orchestration.test.ts",
    );
    expect(orchestration.scope.generatedServiceCount).toBe(composeServices.length);
    expect(orchestration.scope.profileCount).toBe(integration.profileCount);
    expect(orchestration.scope.requiresNonComposeEvidence).toBe(true);
    expect(orchestration.scope.treatsGeneratedComposeAsProofByItself).toBe(false);
    expect(orchestration.scope.finalTestReadinessClaimAllowed).toBe(false);
    expect(orchestration.scope.inMemoryServiceSubstituteAllowedForServiceBackedClaims).toBe(false);
    expect(orchestration.allowedClaims).toEqual([
      "bounded-compose-profile-orchestration-evidence-defined-and-tested",
    ]);
    for (const claim of REQUIRED_NON_CLAIMS) {
      expect(orchestration.nonClaims).toContain(claim);
    }
  });

  it("defines canonical exercise commands for each generated profile and a safe all-profile run", () => {
    const composeProfiles = new Map<string, string[]>();
    for (const service of composeServices) {
      for (const profile of service.profiles) {
        composeProfiles.set(profile, [...(composeProfiles.get(profile) ?? []), service.serviceId]);
      }
    }

    const commandsByProfile = byId(orchestration.canonicalProfileCommands, "profile");
    expect(sorted([...commandsByProfile.keys()])).toEqual(sorted([...composeProfiles.keys()]));

    for (const [profile, serviceIds] of composeProfiles) {
      const command = commandsByProfile.get(profile);
      expect(command, `missing command row for profile ${profile}`).toBeDefined();
      if (!command) {
        throw new Error(`missing command row for profile ${profile}`);
      }
      expect(sorted(command?.serviceIds ?? [])).toEqual(sorted(serviceIds));
      expect(command?.projectName).toMatch(/^usf-test-compose-[a-z0-9-]+$/);
      commandForEveryPhase(command, orchestration.requiredExercisePhases);
      if (profile === "default") {
        expect(command?.profileFlags).toEqual([]);
        expect(command?.commandSequence.start).not.toContain("--profile");
      } else {
        expect(command?.profileFlags).toEqual([`--profile ${profile}`]);
        expect(command?.commandSequence.start).toContain(`--profile ${profile}`);
      }
    }

    expect(orchestration.safeProfileCombinations).toHaveLength(
      orchestration.scope.safeProfileCombinationCount,
    );
    const allProfiles = orchestration.safeProfileCombinations[0];
    expect(allProfiles).toBeDefined();
    if (!allProfiles) {
      throw new Error("missing safe all-profile combination");
    }
    commandForEveryPhase(allProfiles, orchestration.requiredExercisePhases);
    for (const profile of composeProfiles.keys()) {
      if (profile !== "default") {
        expect(allProfiles.commandSequence.start).toContain(`--profile ${profile}`);
      }
    }
  });

  it("requires non-Compose service exercise evidence for every generated service", () => {
    const rowsByService = byId(orchestration.serviceExerciseRows, "serviceId");
    const integrationByService = byId(integration.serviceIntegrationRows, "serviceId");
    const fixtureByComposeService = byId(fixtures.serviceFixtures, "composeServiceId");
    const obligationByComposeService = byId(manifest.serviceObligations, "composeServiceId");

    expect(orchestration.serviceExerciseRows).toHaveLength(composeServices.length);

    for (const composeService of composeServices) {
      const row = rowsByService.get(composeService.serviceId);
      const integrationRow = integrationByService.get(composeService.serviceId);
      const fixture = fixtureByComposeService.get(composeService.serviceId);
      const obligation = obligationByComposeService.get(composeService.serviceId);

      expect(row, `missing orchestration row for ${composeService.serviceId}`).toBeDefined();
      expect(
        integrationRow,
        `missing integration row for ${composeService.serviceId}`,
      ).toBeDefined();
      expect(fixture, `missing fixture row for ${composeService.serviceId}`).toBeDefined();
      expect(obligation, `missing obligation row for ${composeService.serviceId}`).toBeDefined();

      expect(row?.fixtureSeedId).toBe(integrationRow?.fixtureSeedId);
      expect(row?.fixtureSeedId).toBe(fixture?.fixtureSeedId);
      expect(row?.serviceCatalogueId).toBe(integrationRow?.serviceCatalogueId);
      expect(row?.profile).toBe(composeService.profiles[0]);
      expect(integrationRow?.generatedInTestCompose).toBe(true);
      expect(integrationRow?.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(integrationRow?.testReadinessClaimAllowed).toBe(false);
      expect(fixture?.generatedInTestCompose).toBe(true);
      expect(fixture?.inMemoryServiceSubstituteAllowed).toBe(false);
      expect(fixture?.testReadinessClaimAllowed).toBe(false);
      expect(fixture?.provenance.syntheticOnly).toBe(true);
      expect(fixture?.provenance.productionDerived).toBe(false);
      expect(obligation?.ownerIssueIds).toContain("USF-251");

      for (const key of orchestration.serviceEvidencePolicy.requiredIntegrationEvidenceTests) {
        expect(integrationRow?.evidenceTests[key], `${composeService.serviceId} ${key}`).toBe(
          "matrix-covered",
        );
      }
      for (const key of orchestration.serviceEvidencePolicy.requiredFixtureLifecycleApiKeys) {
        expect(
          fixture?.lifecycleApi[key],
          `${composeService.serviceId} lifecycle ${key}`,
        ).toBeTruthy();
      }
      for (const key of orchestration.serviceEvidencePolicy.requiredFixtureLifecycleCoverage) {
        expect(fixture?.lifecycleCoverage[key], `${composeService.serviceId} coverage ${key}`).toBe(
          true,
        );
      }
      expect(
        fixture?.lifecycleCoverage.deterministicSeed,
        `${composeService.serviceId} deterministic seed`,
      ).toMatch(/^usf-248-.+-seed-v1$/);
      expect(Object.values(integrationRow?.safeOperationEvidence ?? {})).not.toHaveLength(0);
    }
  });

  it("guards profile omissions, default promotion, loopback ports, and dependency ordering", () => {
    const integrationProfiles = byId(integration.profileIntegrationRows, "profile");
    const obligationProfiles = byId(manifest.profileObligations, "profile");
    const obligationByComposeService = byId(manifest.serviceObligations, "composeServiceId");

    expect(orchestration.profileEvidencePolicy.requiresDefaultPromotionGuard).toBe(true);
    expect(orchestration.profileEvidencePolicy.requiresProfileOmissionGuard).toBe(true);
    expect(orchestration.profileEvidencePolicy.requiresDependencyDriftGuard).toBe(true);
    expect(orchestration.profileEvidencePolicy.requiresLoopbackOnlyHostBindings).toBe(true);

    for (const command of orchestration.canonicalProfileCommands) {
      const integrationProfile = integrationProfiles.get(command.profile);
      const obligationProfile = obligationProfiles.get(command.profile);
      expect(integrationProfile, `missing integration profile ${command.profile}`).toBeDefined();
      expect(integrationProfile?.composeTarget).toBe(COMPOSE_TARGET);
      expect(sorted(integrationProfile?.serviceIds ?? [])).toEqual(sorted(command.serviceIds));
      expect(integrationProfile?.inMemoryServiceSubstituteAllowed).toBe(false);
      if (command.profile === "default") {
        for (const serviceId of command.serviceIds) {
          expect(obligationByComposeService.get(serviceId)?.ownerIssueIds).toContain("USF-251");
        }
      } else {
        expect(obligationProfile, `missing obligation profile ${command.profile}`).toBeDefined();
        expect(obligationProfile?.composeTarget).toBe(COMPOSE_TARGET);
        expect(sorted(obligationProfile?.serviceIds ?? [])).toEqual(sorted(command.serviceIds));
        expect(obligationProfile?.inMemoryServiceSubstituteAllowed).toBe(false);
      }
      for (const key of orchestration.profileEvidencePolicy.requiredProfileFlags) {
        expect(integrationProfile?.[key], `${command.profile} integration ${key}`).toBe(true);
      }
    }

    for (const service of composeServices) {
      if (service.profiles.includes("default")) {
        expect(service.text).not.toMatch(/\n[ ]{4}profiles:\n/);
      } else {
        expect(service.text).toMatch(/\n[ ]{4}profiles:\n/);
      }
      for (const hostIp of service.text.matchAll(/host_ip:\s*([0-9.]+)/g)) {
        expect(hostIp[1], `${service.serviceId} host_ip`).toBe("127.0.0.1");
      }
      if (service.text.includes("depends_on:")) {
        expect(service.text).toMatch(/condition: service_(healthy|started)/);
      }
    }
  });

  it("records residue checks and actionable failure diagnostics", () => {
    const requiredResidueChecks = [
      "residue.containers",
      "residue.anonymous-volumes",
      "residue.networks",
      "residue.temp-files",
      "residue.credentials",
      "residue.seeded-data",
    ];
    expect(orchestration.postRunResidueChecks.map((row) => row.checkId).sort()).toEqual(
      requiredResidueChecks.sort(),
    );
    for (const check of orchestration.postRunResidueChecks) {
      expect(check.mustBeEmpty).toBe(true);
    }

    const diagnostics = new Set(orchestration.failureDiagnostics.map((row) => row.findingCode));
    for (const findingCode of [
      "compose-profile-service-omission",
      "profile-gated-service-promoted-to-default",
      "loopback-or-port-policy-drift",
      "dependency-healthcheck-ordering-drift",
      "generated-compose-not-derivative",
      "service-exercise-evidence-missing",
      "post-run-residue-left-behind",
    ]) {
      expect(diagnostics).toContain(findingCode);
    }
    for (const diagnostic of orchestration.failureDiagnostics) {
      expect(diagnostic.action.length).toBeGreaterThan(40);
      expect(diagnostic.action).not.toContain("weaken");
    }
  });
});
