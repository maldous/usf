import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const timingPath = join(repoRoot, "docs/architecture/app-surface-timing-and-optimisation-evidence.json");
const closurePath = join(repoRoot, "docs/architecture/app-surface-proof-report-and-closure-gate.json");

type AuthorityInput = {
  path: string;
  role: string;
};

type TimingCommand = {
  commandId: string;
  status: string;
  durationMs?: number | null;
  reason?: string;
};

type TimingEvidence = {
  ownerIssueId: "USF-1035";
  parentIssueId: "USF-1012";
  lifecycleState: "timing-and-optimisation-evidence-recorded";
  authorityInputs: AuthorityInput[];
  remainingIssueClassification: Record<string, string[]>;
  timingEvidence: {
    commands: TimingCommand[];
  };
  optionEvaluations: Array<{
    optionId: string;
    considered: boolean;
    adopted: boolean;
  }>;
  proofEvidenceChurnOptimisation: Record<string, boolean | string>;
  externalBoundary: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

type ClosureGate = {
  ownerIssueId: "USF-1036";
  parentIssueId: "USF-1012";
  lifecycleState: "app-surface-tranche-closure-gate-recorded";
  authorityInputs: AuthorityInput[];
  implementedSurfaces: Array<{
    ownerIssueId: string;
    repositoryArtefact: string;
    closureDisposition: string;
  }>;
  packageAndLockfileChanges: {
    currentIssueAddedDependencies: string[];
    currentIssueChangedLockfile: boolean;
  };
  validationCommands: Array<{
    commandId: string;
    status: string;
  }>;
  proofLadderReached: Record<string, string>;
  stagingDecision: Record<string, string>;
  remainingChildIssuesAndBlockers: Record<string, string[]>;
  closureDecision: Record<string, boolean>;
  externalBoundary: Record<string, boolean>;
  nonClaims: Record<string, boolean>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function expectAuthorityInputsToExist(inputs: AuthorityInput[]): void {
  expect(inputs.length).toBeGreaterThan(0);
  for (const input of inputs) {
    expect(existsSync(join(repoRoot, input.path)), input.path).toBe(true);
    expect(input.role.length).toBeGreaterThan(0);
  }
}

function runValidatorWithFixturePayloads(timing: unknown, closure: unknown) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "usf-app-surface-"));
  try {
    const fixtureTimingPath = join(fixtureRoot, "timing.json");
    const fixtureClosurePath = join(fixtureRoot, "closure.json");
    writeFileSync(fixtureTimingPath, JSON.stringify(timing, null, 2) + "\n");
    writeFileSync(fixtureClosurePath, JSON.stringify(closure, null, 2) + "\n");
    return spawnSync("python3", ["tools/validate-app-surface/validate-app-surface.py", "all", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        USF_APP_SURFACE_TIMING_EVIDENCE_PATH: fixtureTimingPath,
        USF_APP_SURFACE_CLOSURE_GATE_PATH: fixtureClosurePath,
      },
    });
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

describe("app-surface timing and closure gate", () => {
  it("records fastest-safe timing evidence without non-local tooling adoption", () => {
    const timing = readJson<TimingEvidence>(timingPath);
    expect(timing.ownerIssueId).toBe("USF-1035");
    expect(timing.parentIssueId).toBe("USF-1012");
    expect(timing.lifecycleState).toBe("timing-and-optimisation-evidence-recorded");
    expectAuthorityInputsToExist(timing.authorityInputs);

    expect(timing.remainingIssueClassification.mustImplementNowForAppSurfaceClosure).toEqual(["USF-1035", "USF-1036"]);
    expect(timing.remainingIssueClassification.mustBeDeferredToLaterWork).toEqual([]);

    const commandIds = new Set(timing.timingEvidence.commands.map((command) => command.commandId));
    for (const expected of [
      "package-install",
      "typecheck",
      "unit-test-consolidation",
      "contract-local-integration-test-consolidation",
      "generated-client-validation",
      "app-surface-validate",
      "app-surface-selftest",
      "evidence-validation",
      "compose-timing",
    ]) {
      expect(commandIds.has(expected), expected).toBe(true);
    }
    for (const command of timing.timingEvidence.commands.filter((item) => item.status === "pass")) {
      expect(command.durationMs).toBeGreaterThan(0);
    }

    for (const option of timing.optionEvaluations) {
      expect(option.considered).toBe(true);
      if (["testcontainers", "task-graph-tooling", "remote-cache"].includes(option.optionId)) {
        expect(option.adopted).toBe(false);
      }
    }
    expect(timing.proofEvidenceChurnOptimisation.sourceTreeHashAnchorImplemented).toBe(true);
    expect(timing.proofEvidenceChurnOptimisation.evidenceValidationBypassed).toBe(false);
    expect(Object.values(timing.externalBoundary).every((value) => value === false)).toBe(true);
    expect(Object.values(timing.nonClaims).every((value) => value === false)).toBe(true);
  });

  it("records bounded closure without unsupported readiness claims", () => {
    const closure = readJson<ClosureGate>(closurePath);
    expect(closure.ownerIssueId).toBe("USF-1036");
    expect(closure.parentIssueId).toBe("USF-1012");
    expect(closure.lifecycleState).toBe("app-surface-tranche-closure-gate-recorded");
    expectAuthorityInputsToExist(closure.authorityInputs);

    const childIds = new Set(closure.implementedSurfaces.map((surface) => surface.ownerIssueId));
    for (let issueNumber = 1013; issueNumber <= 1036; issueNumber += 1) {
      expect(childIds.has(`USF-${issueNumber}`), `USF-${issueNumber}`).toBe(true);
    }
    for (const surface of closure.implementedSurfaces) {
      expect(existsSync(join(repoRoot, surface.repositoryArtefact)), surface.repositoryArtefact).toBe(true);
      expect(surface.closureDisposition.length).toBeGreaterThan(0);
    }

    expect(closure.packageAndLockfileChanges.currentIssueAddedDependencies).toEqual([]);
    expect(closure.packageAndLockfileChanges.currentIssueChangedLockfile).toBe(false);
    expect(closure.proofLadderReached.highestRequiredLevelReached).toBe("test-contract-local-integration");
    expect(closure.proofLadderReached.compose).toBe("not-required-by-USF-1033");
    expect(closure.proofLadderReached.staging).toBe("not-required-by-USF-1034");
    expect(closure.stagingDecision.classification).toBe("not-required");
    expect(closure.remainingChildIssuesAndBlockers.remainingRepositoryChildIssues).toEqual([]);
    expect(closure.closureDecision.unsupportedReadinessClaimsMade).toBe(false);
    expect(Object.values(closure.externalBoundary).every((value) => value === false)).toBe(true);
    expect(Object.values(closure.nonClaims).every((value) => value === false)).toBe(true);
  });

  it("fails closed when timing and closure authority are corrupted", () => {
    const timing = readJson<TimingEvidence>(timingPath);
    const closure = readJson<ClosureGate>(closurePath);
    const result = runValidatorWithFixturePayloads(
      {
        ...timing,
        authorityInputs: [],
        externalBoundary: { deploymentAllowed: false },
        optionEvaluations: timing.optionEvaluations.map((option) =>
          option.optionId === "testcontainers" ? { ...option, adopted: true } : option,
        ),
      },
      {
        ...closure,
        externalBoundary: {},
        implementedSurfaces: [],
        closureDecision: { ...closure.closureDecision, unsupportedReadinessClaimsMade: true },
      },
    );
    expect(result.status).not.toBe(0);
    const validation = JSON.parse(result.stdout) as {
      status: string;
      findings: Array<{ ruleId: string; subject: string }>;
    };
    expect(validation.status).toBe("fail");
    expect(validation.findings.some((finding) => finding.ruleId === "USF-APP-SURFACE-IMPLEMENTATION-016")).toBe(true);
    expect(validation.findings.some((finding) => finding.ruleId === "USF-APP-SURFACE-IMPLEMENTATION-017")).toBe(true);
    expect(
      validation.findings.some(
        (finding) => finding.ruleId === "USF-APP-SURFACE-IMPLEMENTATION-016" && finding.subject.includes(".externalBoundary."),
      ),
    ).toBe(true);
    expect(
      validation.findings.some(
        (finding) => finding.ruleId === "USF-APP-SURFACE-IMPLEMENTATION-017" && finding.subject.includes(".externalBoundary."),
      ),
    ).toBe(true);
  });
});
