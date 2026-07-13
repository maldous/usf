// Deterministic promotion of a machine-QA run into the committed proof evidence.
//
// Removes the previously-bespoke, by-hand promotion step: given the run directory
// that `machine-qa.mjs` produced (default: the newest run under the machine-QA
// artifact root, e.g. /tmp/usf-proof-cockpit-machine-qa/<ts>), this copies the run
// into artifacts/proof-cockpit/machine-runs/<ts>, rewrites the durable evidence
// store's latestMachineRun, appends machineRunHistory, records the supersession of
// the prior latest run, and repoints the evidence-side external-review bundle at the
// new run. No file is copied by hand.
//
// Usage: node apps/staging-proof-cockpit/src/promote.mjs [--run-dir <path>]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = new URL("../../..", import.meta.url).pathname;
const MACHINE_QA_ARTIFACT_ROOT =
  process.env.USF_PROOF_COCKPIT_ARTIFACT_DIR || "/tmp/usf-proof-cockpit-machine-qa";
const MACHINE_RUNS_DIR = join(ROOT, "artifacts/proof-cockpit/machine-runs");
const STORE_PATH = join(ROOT, "evidence/proof-evidence/proof-cockpit/staging-evidence-store.json");
const BUNDLE_MANIFEST_PATH = join(
  ROOT,
  "evidence/proof-evidence/proof-cockpit/external-review-bundle/manifest.json",
);
const BUNDLE_README_PATH = join(ROOT, "evidence/proof-evidence/proof-cockpit/external-review-bundle/README.md");
const FINAL_REPORT_PATH = join(ROOT, "evidence/proof-evidence/proof-cockpit/final-external-review-report.md");
const SOURCE_TREE_HASH_ALGORITHM = "sha256-git-ls-tree-non-proof-evidence-v1";
const SOURCE_TREE_HASH_EXCLUDED_PREFIXES = Object.freeze([
  "artifacts/proof-cockpit/",
  "evidence/proof-evidence/proof-cockpit/",
  "v2/",
  "graph/",
  "census/",
]);

function parseArgs(argv) {
  const args = { runDir: "", projectionOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-dir") {
      args.runDir = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--projection-only") {
      args.projectionOnly = true;
    }
  }
  return args;
}

function newestRunDir() {
  if (!existsSync(MACHINE_QA_ARTIFACT_ROOT)) return "";
  const entries = readdirSync(MACHINE_QA_ARTIFACT_ROOT)
    .map((name) => join(MACHINE_QA_ARTIFACT_ROOT, name))
    .filter((path) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
  return entries.length ? entries[entries.length - 1] : "";
}

function contentHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function currentSourceTreeHash() {
  const output = execFileSync("git", ["ls-tree", "-r", "-z", "--full-tree", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const entries = output
    .split("\0")
    .filter(Boolean)
    .filter((entry) => {
      const tabIndex = entry.indexOf("\t");
      const path = tabIndex >= 0 ? entry.slice(tabIndex + 1) : "";
      return path && !SOURCE_TREE_HASH_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
    })
    .sort()
    .join("\0");
  return contentHash(entries);
}

function pathParticipatesInSourceTreeHash(path) {
  return Boolean(path) && !SOURCE_TREE_HASH_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function dirtyProjectionSourcePaths() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const tokens = output.split("\0").filter(Boolean);
  const dirty = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const status = token.slice(0, 2);
    const path = token.slice(3);
    const paths = [path];
    if (status.includes("R") || status.includes("C")) {
      paths.push(tokens[i + 1] ?? "");
      i += 1;
    }
    for (const candidate of paths) {
      if (pathParticipatesInSourceTreeHash(candidate)) {
        dirty.push(candidate);
      }
    }
  }
  return [...new Set(dirty)].sort();
}

function latestRunDirFromStore(store) {
  const artifactDir = store.latestMachineRun?.artifactDir ?? "";
  return artifactDir ? join(ROOT, artifactDir) : "";
}

function readRunReport(runDir) {
  const reportPath = join(runDir, "proof-cockpit-machine-qa-run.json");
  if (!existsSync(reportPath)) {
    throw new Error(`Machine-QA report is missing: ${reportPath}`);
  }
  return JSON.parse(readFileSync(reportPath, "utf8"));
}

// Pure transform (unit-tested): given the current store, a run report, and the
// repo-relative artifact dir for the promoted run, return the updated store.
export function computePromotion(store, report, artifactDir) {
  const counts = report.counts ?? {};
  const generatedAt = report.completedAt ?? report.startedAt ?? store.latestMachineRun?.generatedAt;
  const newLatest = {
    runId: report.qaRun,
    sourceSha: report.sourceSha,
    sourceTreeHash: report.sourceTreeHash ?? "",
    sourceTreeHashAlgorithm: report.sourceTreeHashAlgorithm ?? "",
    sourceTreeHashExcludedPrefixes: report.sourceTreeHashExcludedPrefixes ?? [],
    deploymentSha: report.deploymentSha ?? report.sourceSha,
    environment: report.environment ?? "local-machine-qa",
    generatedAt,
    artifactDir,
    reportJson: `${artifactDir}/proof-cockpit-machine-qa-run.json`,
    screenshotManifest: `${artifactDir}/proof-cockpit-screenshot-manifest.json`,
    externalReviewBundle: `${artifactDir}/external-review-bundle`,
    routeCount: counts.testedRoutes ?? counts.routes ?? 0,
    capabilityCount: counts.capabilities ?? 0,
    serviceCount: counts.services ?? 0,
    screenshotCount: counts.screenshots ?? 0,
    serviceEvidenceCount: counts.serviceEvidenceScreenshots ?? counts.serviceEvidence ?? 0,
    passCount: counts.pass ?? 0,
    warnCount: counts.warn ?? 0,
    gapCount: counts.gap ?? counts.gaps ?? 0,
    failCount: counts.fail ?? 0,
    humanDecisionRequired: counts.humanDecisionRequired ?? 1,
    warningInventory: "evidence/proof-evidence/proof-cockpit/warning-inventory.json",
    warningInventoryMarkdown: "evidence/proof-evidence/proof-cockpit/warning-inventory.md",
  };
  const prior = store.latestMachineRun;
  const next = structuredClone(store);
  next.sourceSha = newLatest.sourceSha;
  next.sourceTreeHash = newLatest.sourceTreeHash;
  next.sourceTreeHashAlgorithm = newLatest.sourceTreeHashAlgorithm;
  next.sourceTreeHashExcludedPrefixes = newLatest.sourceTreeHashExcludedPrefixes;
  next.deploymentSha = newLatest.deploymentSha;
  next.latestMachineRun = newLatest;
  next.machineRunHistory = [...(store.machineRunHistory ?? [])];
  if (prior && prior.runId && !next.machineRunHistory.some((run) => run.runId === prior.runId)) {
    next.machineRunHistory.push(prior);
  }
  if (!next.machineRunHistory.some((run) => run.runId === newLatest.runId)) {
    next.machineRunHistory.push(newLatest);
  }
  // Retention: keep only the current and immediately-prior run payloads. Older
  // runs remain in machineRunHistory (identity, source SHA, counts, supersession
  // are preserved) but are marked payloadPruned so history never dangles.
  const keepArtifactDirs = new Set(
    [newLatest.artifactDir, prior?.artifactDir].filter(Boolean),
  );
  next.machineRunHistory = next.machineRunHistory.map((run) =>
    keepArtifactDirs.has(run.artifactDir) ? { ...run, payloadPruned: false } : { ...run, payloadPruned: true },
  );
  if (prior && prior.runId && prior.runId !== newLatest.runId) {
    next.supersessionHistory = [
      ...(store.supersessionHistory ?? []),
      {
        fromRunId: prior.runId,
        fromArtifactDir: prior.artifactDir,
        fromSourceSha: prior.sourceSha,
        fromSourceTreeHash: prior.sourceTreeHash ?? "",
        toRunId: newLatest.runId,
        toArtifactDir: newLatest.artifactDir,
        toSourceSha: newLatest.sourceSha,
        toSourceTreeHash: newLatest.sourceTreeHash,
        supersededAt: generatedAt,
        reason: "Automated promotion of a newer current-source machine QA run via promote.mjs.",
      },
    ];
  }
  return next;
}

function computeServiceEvidenceSummary(runDir) {
  const serviceEvidenceManifestPath = join(runDir, "service-evidence-manifest.json");
  if (!existsSync(serviceEvidenceManifestPath)) {
    return {};
  }

  const serviceEvidenceManifest = JSON.parse(readFileSync(serviceEvidenceManifestPath, "utf8"));
  const services = Array.isArray(serviceEvidenceManifest.services) ? serviceEvidenceManifest.services : [];

  return {
    serviceEvidenceCount: services.length,
    authenticatedServiceUiCaptureCount: services.filter(
      (service) => service.authenticatedCaptureRequired === true,
    ).length,
    authPostureMismatchCount: services.filter((service) => service.authPostureMismatch === true).length,
    serviceTargetObservationCount: services.filter(
      (service) => typeof service.targetSystemObservation === "string" && service.targetSystemObservation.length > 0,
    ).length,
  };
}

function computeBundleLatestMachineRun(existingLatest, latest, report, serviceEvidenceSummary) {
  const evidenceRecordCount = Array.isArray(report.evidenceRecords)
    ? report.evidenceRecords.length
    : Array.isArray(report.evidence)
    ? report.evidence.length
    : existingLatest?.evidenceRecordCount;

  return {
    ...(existingLatest ?? {}),
    runId: latest.runId,
    artifactDir: latest.artifactDir,
    reportJson: latest.reportJson,
    externalReviewBundle: latest.externalReviewBundle,
    passCount: latest.passCount,
    warnCount: latest.warnCount,
    failCount: latest.failCount,
    unresolvedGapCount: latest.gapCount,
    screenshotCount: latest.screenshotCount,
    serviceEvidenceCount: serviceEvidenceSummary.serviceEvidenceCount ?? latest.serviceEvidenceCount,
    evidenceRecordCount: evidenceRecordCount ?? 0,
    sourceSha: latest.sourceSha,
    sourceTreeHash: latest.sourceTreeHash,
    sourceTreeHashAlgorithm: latest.sourceTreeHashAlgorithm,
    sourceTreeHashExcludedPrefixes: latest.sourceTreeHashExcludedPrefixes,
    deploymentSha: latest.deploymentSha,
    authenticatedServiceUiCaptureCount:
      serviceEvidenceSummary.authenticatedServiceUiCaptureCount ??
      existingLatest?.authenticatedServiceUiCaptureCount ??
      0,
    authPostureMismatchCount:
      serviceEvidenceSummary.authPostureMismatchCount ?? existingLatest?.authPostureMismatchCount ?? 0,
    serviceTargetObservationCount:
      serviceEvidenceSummary.serviceTargetObservationCount ?? existingLatest?.serviceTargetObservationCount ?? 0,
  };
}

function manifestFilesForLatest(existingFiles, latest) {
  const prefix = `../../../../${latest.artifactDir}`;
  const normalized = (Array.isArray(existingFiles) ? existingFiles : [])
    .map((file) => String(file))
    .map((file) =>
      file.replace(
        /\.\.\/\.\.\/\.\.\/\.\.\/artifacts\/proof-cockpit\/machine-runs\/[^/]+/g,
        prefix,
      ),
    );
  const required = [
    "../staging-evidence-store.json",
    "../final-external-review-report.md",
    "../warning-inventory.json",
    "../warning-inventory.md",
    "README.md",
    "manifest.json",
    `${prefix}/external-review-bundle/external-review-report.md`,
    `${prefix}/proof-cockpit-machine-qa-run.json`,
    `${prefix}/service-evidence-manifest.json`,
    `${prefix}/proof-cockpit-screenshot-manifest.json`,
  ];
  return [...new Set([...normalized, ...required])];
}

function persistentBundleReadme(latest, serviceEvidenceSummary) {
  return `# USF-293 External Review Bundle

This bundle is the stable repository entry point for the USF-293 proof cockpit external-review evidence package.

Source SHA: ${latest.sourceSha}
Deployment SHA: ${latest.deploymentSha}
Source tree hash: ${latest.sourceTreeHash}
Run ID: ${latest.runId}
Authenticated service UI captures: ${serviceEvidenceSummary.authenticatedServiceUiCaptureCount ?? 0}
Service evidence records: ${serviceEvidenceSummary.serviceEvidenceCount ?? latest.serviceEvidenceCount}
Screenshot or equivalent artifacts: ${latest.screenshotCount}

Latest machine QA: ${latest.passCount} pass, ${latest.warnCount} warnings, ${latest.failCount} failures, ${latest.gapCount ?? 0} unresolved gaps.

Warning inventory:

- ../warning-inventory.json
- ../warning-inventory.md

Primary generated bundle:

- ${latest.externalReviewBundle}

Primary report paths:

- ../final-external-review-report.md
- ${latest.externalReviewBundle}/external-review-report.md
- /proof/reports/final
- /proof/portfolio

Projection-only re-pin policy:

- Command: corepack pnpm proof-cockpit:projection-repin
- Fresh machine execution: false
- Generated reports are authority: false
- Requires fresh machine QA when source changes: true
- Full machine QA command: corepack pnpm proof-cockpit:machine-qa

Authenticated Composed Service UI evidence uses only scoped staging/test-safe credentials through logical OpenBao references. Credential values are not printed, persisted in committed artifacts, screenshotted, logged, or bundled.

It does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
`;
}

function writeProjectionArtifacts(manifest, latest, runDir, serviceEvidenceSummary) {
  const generatedReportPath = join(runDir, "external-review-bundle/external-review-report.md");
  if (!existsSync(generatedReportPath)) {
    throw new Error(`Generated external-review report is missing: ${generatedReportPath}`);
  }
  manifest.latestMachineRun = latest;
  manifest.generatedReportsAreAuthority = false;
  manifest.finalAcceptanceAutomatic = false;
  manifest.files = manifestFilesForLatest(manifest.files, latest);
  manifest.projectionOnlyPolicy = {
    command: "corepack pnpm proof-cockpit:projection-repin",
    projectionOnly: true,
    freshMachineExecution: false,
    generatedReportsAreAuthority: false,
    boundedToRetainedLatestMachineRun: true,
    requiresFreshMachineQaWhenSourceChanges: true,
    fullMachineQaCommand: "corepack pnpm proof-cockpit:machine-qa",
  };
  writeFileSync(FINAL_REPORT_PATH, readFileSync(generatedReportPath, "utf8"));
  writeFileSync(BUNDLE_README_PATH, persistentBundleReadme(latest, serviceEvidenceSummary));
  writeFileSync(BUNDLE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

function assertProjectionOnlyAllowed(store, report, runDir) {
  const dirtyPaths = dirtyProjectionSourcePaths();
  if (dirtyPaths.length > 0) {
    throw new Error(`Projection-only re-pin refused because source/tooling paths are dirty: ${dirtyPaths.slice(0, 5).join(", ")}`);
  }
  const latest = store.latestMachineRun ?? {};
  if (!latest.runId || latest.runId !== report.qaRun) {
    throw new Error("Projection-only re-pin is bounded to the retained latest machine run.");
  }
  if (latest.sourceSha !== report.sourceSha || latest.deploymentSha !== (report.deploymentSha ?? report.sourceSha)) {
    throw new Error("Projection-only re-pin refused because retained machine run identity drifted.");
  }
  if (latest.sourceTreeHashAlgorithm !== SOURCE_TREE_HASH_ALGORITHM || report.sourceTreeHashAlgorithm !== SOURCE_TREE_HASH_ALGORITHM) {
    throw new Error("Projection-only re-pin refused because the source tree hash algorithm is unknown.");
  }
  if (!latest.sourceTreeHash || latest.sourceTreeHash !== report.sourceTreeHash) {
    throw new Error("Projection-only re-pin refused because retained source tree hashes do not match.");
  }
  const currentTreeHash = currentSourceTreeHash();
  if (latest.sourceTreeHash !== currentTreeHash) {
    throw new Error("Projection-only re-pin refused because source changed; run full proof-cockpit:machine-qa instead.");
  }
  const counts = report.counts ?? {};
  const unresolvedGaps = Array.isArray(report.gaps) ? report.gaps.length : counts.gap ?? counts.gaps ?? 0;
  if ((counts.warn ?? 0) > 0 || (counts.fail ?? 0) > 0 || unresolvedGaps > 0) {
    throw new Error("Projection-only re-pin refused because retained evidence has warnings, failures, or unresolved gaps.");
  }
  if (!existsSync(runDir) || !statSync(runDir).isDirectory()) {
    throw new Error(`Projection-only re-pin run directory is missing: ${runDir}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
  const runDir = args.runDir || (args.projectionOnly ? latestRunDirFromStore(store) : newestRunDir());
  if (!runDir || !existsSync(runDir)) {
    console.error(`No machine-QA run directory found (looked in ${MACHINE_QA_ARTIFACT_ROOT}). Run proof-cockpit:machine-qa first.`);
    process.exit(1);
  }
  const report = readRunReport(runDir);
  if (args.projectionOnly) {
    try {
      assertProjectionOnlyAllowed(store, report, runDir);
      const manifest = existsSync(BUNDLE_MANIFEST_PATH) ? JSON.parse(readFileSync(BUNDLE_MANIFEST_PATH, "utf8")) : {};
      const serviceEvidenceSummary = computeServiceEvidenceSummary(runDir);
      const latest = computeBundleLatestMachineRun(
        manifest.latestMachineRun,
        store.latestMachineRun,
        report,
        serviceEvidenceSummary,
      );
      writeProjectionArtifacts(manifest, latest, runDir, serviceEvidenceSummary);
      console.log(
        JSON.stringify(
          {
            projectionOnly: true,
            freshMachineExecution: false,
            generatedReportsAreAuthority: false,
            requiresFreshMachineQaWhenSourceChanges: true,
            runId: latest.runId,
            artifactDir: latest.artifactDir,
            sourceSha: latest.sourceSha,
            sourceTreeHash: latest.sourceTreeHash,
          },
          null,
          2,
        ),
      );
      return;
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }
  const ts = basename(runDir);
  const destAbs = join(MACHINE_RUNS_DIR, ts);
  const artifactDir = `artifacts/proof-cockpit/machine-runs/${ts}`;

  mkdirSync(MACHINE_RUNS_DIR, { recursive: true });
  cpSync(runDir, destAbs, { recursive: true });

  const priorArtifactTs = store.latestMachineRun?.artifactDir
    ? basename(store.latestMachineRun.artifactDir)
    : "";
  const nextStore = computePromotion(store, report, artifactDir);
  writeFileSync(STORE_PATH, `${JSON.stringify(nextStore, null, 2)}\n`);

  // Repoint the evidence-side external-review bundle at the promoted run and
  // keep its retained latest-run summary in sync with the promoted report.
  if (existsSync(BUNDLE_MANIFEST_PATH) && priorArtifactTs) {
    const manifest = JSON.parse(readFileSync(BUNDLE_MANIFEST_PATH, "utf8"));
    const serviceEvidenceSummary = computeServiceEvidenceSummary(runDir);
    const latest = computeBundleLatestMachineRun(
      manifest.latestMachineRun,
      nextStore.latestMachineRun,
      report,
      serviceEvidenceSummary,
    );
    writeProjectionArtifacts(manifest, latest, runDir, serviceEvidenceSummary);
  }

  // Retention: keep only the current and immediately-prior run payloads on disk.
  const keep = new Set([ts, priorArtifactTs].filter(Boolean));
  const pruned = [];
  for (const name of readdirSync(MACHINE_RUNS_DIR)) {
    if (keep.has(name)) continue;
    const target = join(MACHINE_RUNS_DIR, name);
    if (statSync(target).isDirectory()) {
      rmSync(target, { recursive: true, force: true });
      pruned.push(name);
    }
  }

  console.log(
    JSON.stringify(
      {
        promoted: ts,
        artifactDir,
        sourceSha: report.sourceSha,
        sourceTreeHash: report.sourceTreeHash ?? "",
        counts: report.counts,
        prunedPayloads: pruned,
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
