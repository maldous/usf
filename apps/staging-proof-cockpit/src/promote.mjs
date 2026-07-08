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

function parseArgs(argv) {
  const args = { runDir: "" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-dir") {
      args.runDir = argv[i + 1] ?? "";
      i += 1;
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

// Pure transform (unit-tested): given the current store, a run report, and the
// repo-relative artifact dir for the promoted run, return the updated store.
export function computePromotion(store, report, artifactDir) {
  const counts = report.counts ?? {};
  const generatedAt = report.completedAt ?? report.startedAt ?? store.latestMachineRun?.generatedAt;
  const newLatest = {
    runId: report.qaRun,
    sourceSha: report.sourceSha,
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
        toRunId: newLatest.runId,
        toArtifactDir: newLatest.artifactDir,
        toSourceSha: newLatest.sourceSha,
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
  const evidenceRecordCount = Array.isArray(report.evidence)
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const runDir = args.runDir || newestRunDir();
  if (!runDir || !existsSync(runDir)) {
    console.error(`No machine-QA run directory found (looked in ${MACHINE_QA_ARTIFACT_ROOT}). Run proof-cockpit:machine-qa first.`);
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(join(runDir, "proof-cockpit-machine-qa-run.json"), "utf8"));
  const ts = basename(runDir);
  const destAbs = join(MACHINE_RUNS_DIR, ts);
  const artifactDir = `artifacts/proof-cockpit/machine-runs/${ts}`;

  mkdirSync(MACHINE_RUNS_DIR, { recursive: true });
  cpSync(runDir, destAbs, { recursive: true });

  const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
  const priorArtifactTs = store.latestMachineRun?.artifactDir
    ? basename(store.latestMachineRun.artifactDir)
    : "";
  const nextStore = computePromotion(store, report, artifactDir);
  writeFileSync(STORE_PATH, `${JSON.stringify(nextStore, null, 2)}\n`);

  // Repoint the evidence-side external-review bundle at the promoted run and
  // keep its retained latest-run summary in sync with the promoted report.
  if (existsSync(BUNDLE_MANIFEST_PATH) && priorArtifactTs) {
    const manifest = JSON.parse(readFileSync(BUNDLE_MANIFEST_PATH, "utf8").split(priorArtifactTs).join(ts));
    manifest.latestMachineRun = computeBundleLatestMachineRun(
      manifest.latestMachineRun,
      nextStore.latestMachineRun,
      report,
      computeServiceEvidenceSummary(runDir),
    );
    writeFileSync(BUNDLE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
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
      { promoted: ts, artifactDir, sourceSha: report.sourceSha, counts: report.counts, prunedPayloads: pruned },
      null,
      2,
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
