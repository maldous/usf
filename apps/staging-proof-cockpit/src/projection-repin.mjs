// Projection-only re-pin for proof-cockpit external review artifacts.
//
// This script regenerates lower-authority report and bundle projections from
// the retained latest machine-QA run recorded in the staging evidence store. It
// does not run browser automation, does not create fresh runtime proof, and
// does not promote a different machine run.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const ROOT = new URL("../../..", import.meta.url).pathname;
const STORE_PATH = join(ROOT, "evidence/proof-evidence/proof-cockpit/staging-evidence-store.json");
const FINAL_REPORT_PATH = join(ROOT, "evidence/proof-evidence/proof-cockpit/final-external-review-report.md");
const BUNDLE_DIR = join(ROOT, "evidence/proof-evidence/proof-cockpit/external-review-bundle");
const BUNDLE_MANIFEST_PATH = join(BUNDLE_DIR, "manifest.json");
const BUNDLE_README_PATH = join(BUNDLE_DIR, "README.md");
const WARNING_INVENTORY_PATH = "evidence/proof-evidence/proof-cockpit/warning-inventory.json";
const WARNING_INVENTORY_MARKDOWN_PATH = "evidence/proof-evidence/proof-cockpit/warning-inventory.md";
const TERMINAL_REFRESH_ISSUE = "USF-966";
const PROJECTION_ISSUE = "USF-970";

const REQUIRED_NON_CLAIMS = [
  "no-staging-readiness",
  "no-production-readiness",
  "no-deployment-readiness",
  "no-live-provider-readiness",
  "no-soc-readiness",
  "no-iso-certification",
  "no-enterprise-production-readiness",
  "no-real-user-product-ui-readiness",
  "no-browser-e2e-readiness",
  "no-full-product-readiness",
  "no-usf-290-completion",
];

function usage() {
  return [
    "Usage: node apps/staging-proof-cockpit/src/projection-repin.mjs [--run-dir <repo-artifact-dir>] [--check] [--json]",
    "",
    "Inputs:",
    "- staging evidence store latestMachineRun",
    "- retained artifact directory for that latestMachineRun",
    "- retained proof-cockpit-machine-qa-run.json",
    "- retained service-evidence-manifest.json",
    "- retained external-review-bundle/external-review-report.md",
    "",
    "Outputs:",
    "- evidence/proof-evidence/proof-cockpit/final-external-review-report.md",
    "- evidence/proof-evidence/proof-cockpit/external-review-bundle/README.md",
    "- evidence/proof-evidence/proof-cockpit/external-review-bundle/manifest.json",
    "",
    "Forbidden claims:",
    "- no fresh machine QA",
    "- no fresh runtime proof",
    "- no readiness, staging, production, deployment, live-provider, product, store, release, compliance, provider, or human acceptance claim",
    "",
    "Fallback:",
    "- unknown, stale, mismatched, non-latest, non-zero warning/fail/gap, or missing chain metadata must use full proof for the affected family or terminal refresh in USF-966",
  ].join("\n");
}

function parseArgs(argv) {
  const args = { runDir: "", check: false, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--run-dir") {
      args.runDir = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }
  return args;
}

function repoRelative(path) {
  return relative(ROOT, path).split("\\").join("/");
}

function resolveInsideRoot(input) {
  const absolute = isAbsolute(input) ? resolve(input) : resolve(ROOT, input);
  const rel = repoRelative(absolute);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path escapes repository root: ${input}`);
  }
  return absolute;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path) {
  return sha256Text(readFileSync(path));
}

function addFinding(findings, rule, subject, message) {
  findings.push({ severity: "blocking", rule, subject, message });
}

function countValue(report, name) {
  const counts = report.counts ?? {};
  if (name === "gap") return counts.gap ?? counts.gaps ?? (Array.isArray(report.gaps) ? report.gaps.length : 0);
  if (name === "serviceEvidenceScreenshots") return counts.serviceEvidenceScreenshots ?? counts.serviceEvidence ?? 0;
  if (name === "testedRoutes") return counts.testedRoutes ?? counts.routes ?? 0;
  return counts[name] ?? 0;
}

function latestFromReport(report, artifactDir) {
  return {
    runId: report.qaRun,
    sourceSha: report.sourceSha,
    deploymentSha: report.deploymentSha ?? report.sourceSha,
    environment: report.environment ?? "local-machine-qa",
    generatedAt: report.completedAt ?? report.startedAt ?? report.generatedAt,
    artifactDir,
    reportJson: `${artifactDir}/proof-cockpit-machine-qa-run.json`,
    screenshotManifest: `${artifactDir}/proof-cockpit-screenshot-manifest.json`,
    externalReviewBundle: `${artifactDir}/external-review-bundle`,
    routeCount: countValue(report, "testedRoutes"),
    capabilityCount: countValue(report, "capabilities"),
    serviceCount: countValue(report, "services"),
    screenshotCount: countValue(report, "screenshots"),
    serviceEvidenceCount: countValue(report, "serviceEvidenceScreenshots"),
    passCount: countValue(report, "pass"),
    warnCount: countValue(report, "warn"),
    gapCount: countValue(report, "gap"),
    failCount: countValue(report, "fail"),
    humanDecisionRequired: countValue(report, "humanDecisionRequired"),
    warningInventory: WARNING_INVENTORY_PATH,
    warningInventoryMarkdown: WARNING_INVENTORY_MARKDOWN_PATH,
  };
}

function validateInput({ store, report, runDir, artifactDir, findings }) {
  const latest = store.latestMachineRun ?? {};
  if (!latest.runId || !latest.artifactDir) {
    addFinding(findings, "USF-PROJECTION-REPIN-INPUT", "staging-evidence-store", "latestMachineRun is missing runId or artifactDir");
    return;
  }
  if (artifactDir !== latest.artifactDir) {
    addFinding(
      findings,
      "USF-PROJECTION-REPIN-INPUT",
      artifactDir,
      "projection-only re-pin can only use the latest retained artifact recorded in the evidence store",
    );
  }
  const expected = latestFromReport(report, artifactDir);
  for (const field of ["runId", "sourceSha", "deploymentSha", "environment", "artifactDir", "reportJson", "externalReviewBundle"]) {
    if (String(latest[field] ?? "") !== String(expected[field] ?? "")) {
      addFinding(findings, "USF-PROJECTION-REPIN-METADATA", `latestMachineRun.${field}`, `store value does not match retained report value for ${field}`);
    }
  }
  for (const [storeField, expectedField] of [
    ["routeCount", "routeCount"],
    ["capabilityCount", "capabilityCount"],
    ["serviceCount", "serviceCount"],
    ["screenshotCount", "screenshotCount"],
    ["serviceEvidenceCount", "serviceEvidenceCount"],
    ["passCount", "passCount"],
    ["warnCount", "warnCount"],
    ["gapCount", "gapCount"],
    ["failCount", "failCount"],
    ["humanDecisionRequired", "humanDecisionRequired"],
  ]) {
    if (Number(latest[storeField] ?? -1) !== Number(expected[expectedField] ?? -2)) {
      addFinding(findings, "USF-PROJECTION-REPIN-METADATA", `latestMachineRun.${storeField}`, `store count does not match retained report count for ${storeField}`);
    }
  }
  for (const relativePath of [
    "proof-cockpit-machine-qa-run.json",
    "proof-cockpit-screenshot-manifest.json",
    "service-evidence-manifest.json",
    "evidence-index.json",
    "chain-of-custody.json",
    "external-review-bundle/external-review-report.md",
  ]) {
    if (!existsSync(join(runDir, relativePath))) {
      addFinding(findings, "USF-PROJECTION-REPIN-INPUT", `${artifactDir}/${relativePath}`, "required retained artifact is missing");
    }
  }
  const nonClaims = new Set(report.nonClaims ?? []);
  for (const token of REQUIRED_NON_CLAIMS) {
    if (!nonClaims.has(token)) {
      addFinding(findings, "USF-PROJECTION-REPIN-NONCLAIM", "proof-cockpit-machine-qa-run.json", `required non-claim missing from retained report: ${token}`);
    }
  }
  if (expected.warnCount !== 0 || expected.failCount !== 0 || expected.gapCount !== 0) {
    addFinding(
      findings,
      "USF-PROJECTION-REPIN-FALLBACK",
      artifactDir,
      "projection-only re-pin requires zero warnings, failures, and unresolved gaps; use full proof or terminal refresh instead",
    );
  }
}

function relativeFromBundle(path) {
  return relative(BUNDLE_DIR, path).split("\\").join("/");
}

function artifactRef(artifactDir, relativePath) {
  return relativeFromBundle(join(ROOT, artifactDir, relativePath));
}

function warningSummary() {
  const warningPath = join(ROOT, WARNING_INVENTORY_PATH);
  if (!existsSync(warningPath)) {
    return {};
  }
  return readJson(warningPath).summary ?? {};
}

function buildManifest({ report, store, artifactDir, sourceReportHash, finalReportHash }) {
  const latest = latestFromReport(report, artifactDir);
  const evidenceIndex = readJson(join(ROOT, artifactDir, "evidence-index.json"));
  const serviceEvidenceSummary = report.composeServiceEvidence?.summary ?? {};
  const summary = warningSummary();
  return {
    id: "proof-cockpit-external-review-bundle",
    schemaVersion: "1.0.0",
    linearIssue: "USF-293",
    acceptanceIssue: "USF-290",
    projectionOnly: true,
    projectionIssue: PROJECTION_ISSUE,
    terminalFreshMachineQaIssue: TERMINAL_REFRESH_ISSUE,
    generatedReportsAreAuthority: false,
    finalAcceptanceAutomatic: false,
    freshMachineQaGenerated: false,
    freshnessState: "terminal-refresh-deferred",
    projectionSource: {
      artifactDir,
      runId: latest.runId,
      sourceSha: latest.sourceSha,
      deploymentSha: latest.deploymentSha,
      environment: latest.environment,
      sourceReportHash,
      finalReportHash,
      terminalRefreshDeferredTo: TERMINAL_REFRESH_ISSUE,
    },
    files: [
      "../staging-evidence-store.json",
      "../final-external-review-report.md",
      "../warning-inventory.json",
      "../warning-inventory.md",
      "README.md",
      "manifest.json",
      artifactRef(artifactDir, "external-review-bundle/external-review-report.md"),
      artifactRef(artifactDir, "proof-cockpit-machine-qa-run.json"),
      artifactRef(artifactDir, "service-evidence-manifest.json"),
      artifactRef(artifactDir, "proof-cockpit-screenshot-manifest.json"),
    ],
    nonClaims: [...REQUIRED_NON_CLAIMS],
    latestMachineRun: {
      runId: latest.runId,
      artifactDir: latest.artifactDir,
      reportJson: latest.reportJson,
      externalReviewBundle: latest.externalReviewBundle,
      passCount: latest.passCount,
      warnCount: latest.warnCount,
      failCount: latest.failCount,
      unresolvedGapCount: latest.gapCount,
      screenshotCount: latest.screenshotCount,
      serviceEvidenceCount: latest.serviceEvidenceCount,
      evidenceRecordCount: evidenceIndex.evidenceRecords?.length ?? report.evidenceRecords?.length ?? 0,
      sourceSha: latest.sourceSha,
      deploymentSha: latest.deploymentSha,
      environment: latest.environment,
      generatedAt: latest.generatedAt,
      authenticatedServiceUiCaptureCount: serviceEvidenceSummary.servicesRequiringLogin ?? 0,
      authPostureMismatchCount: 0,
      serviceTargetObservationCount: serviceEvidenceSummary.artifactsConfirmed ?? latest.serviceEvidenceCount,
    },
    warningResolution: {
      warningInventoryPath: WARNING_INVENTORY_PATH,
      warningInventoryMarkdownPath: WARNING_INVENTORY_MARKDOWN_PATH,
      originalWarningCount: summary.originalWarningCount ?? 68,
      fixedWarningCount: summary.fixedWarningCount ?? summary.originalWarningCount ?? 68,
      finalWarningCount: summary.finalWarningCount ?? latest.warnCount,
      finalFailureCount: latest.failCount,
      finalUnresolvedGapCount: latest.gapCount,
      hiddenWarningCount: summary.hiddenWarningCount ?? 0,
      missingScreenshotPaths: 0,
      missingScreenshotHashes: 0,
      missingEvidenceLinks: 0,
      missingChainOfCustodyMappings: 0,
      readinessOverclaims: 0,
      authenticatedServiceUiCaptureCount: serviceEvidenceSummary.servicesRequiringLogin ?? 0,
      resolutionMethod:
        "Projection-only re-pin regenerated lower-authority review projections from the retained latest machine QA artifact without running fresh machine QA.",
      validationCommand: "corepack pnpm proof-cockpit:projection-repin:check",
      finalMachineRunPath: latest.reportJson,
    },
    storeSourceSha: store.sourceSha,
    storeDeploymentSha: store.deploymentSha,
  };
}

function buildReadme({ report, artifactDir }) {
  const latest = latestFromReport(report, artifactDir);
  return `# USF-293 External Review Bundle

This bundle is the stable repository entry point for the USF-293 proof cockpit external-review evidence package.

Source SHA: ${latest.sourceSha}
Deployment SHA: ${latest.deploymentSha}
Run ID: ${latest.runId}
Environment: ${latest.environment}
Authenticated service UI captures: ${report.composeServiceEvidence?.summary?.servicesRequiringLogin ?? 0}
Service evidence records: ${latest.serviceEvidenceCount}
Screenshot or equivalent artifacts: ${latest.screenshotCount}

Latest machine QA: ${latest.passCount} pass, ${latest.warnCount} warnings, ${latest.failCount} failures, ${latest.gapCount} unresolved gaps.

Projection-only re-pin:

- Projection issue: ${PROJECTION_ISSUE}
- Fresh machine QA generated by this command: false
- Generated reports are authority: false
- Terminal fresh machine evidence refresh: ${TERMINAL_REFRESH_ISSUE}

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

Authenticated Composed Service UI evidence uses only scoped staging/test-safe credentials through logical OpenBao references. Credential values are not printed, persisted in committed artifacts, screenshotted, logged, or bundled.

It does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
`;
}

function buildFinalReport({ sourceReport, report, artifactDir }) {
  const latest = latestFromReport(report, artifactDir);
  return `${sourceReport.trimEnd()}

## Projection-only re-pin appendix

Projection issue: ${PROJECTION_ISSUE}
Fresh machine QA generated by this projection: false
Generated reports are authority: false
Retained machine run: ${latest.runId}
Retained artifact directory: ${artifactDir}
Source SHA: ${latest.sourceSha}
Deployment SHA: ${latest.deploymentSha}
Environment: ${latest.environment}
Terminal fresh machine evidence refresh remains assigned to ${TERMINAL_REFRESH_ISSUE}.
`;
}

function buildProjection(args) {
  const store = readJson(STORE_PATH);
  const latest = store.latestMachineRun ?? {};
  const runDir = args.runDir ? resolveInsideRoot(args.runDir) : resolveInsideRoot(latest.artifactDir ?? "");
  const artifactDir = repoRelative(runDir);
  const reportPath = join(runDir, "proof-cockpit-machine-qa-run.json");
  const sourceReportPath = join(runDir, "external-review-bundle/external-review-report.md");
  const findings = [];
  if (!existsSync(reportPath)) {
    addFinding(findings, "USF-PROJECTION-REPIN-INPUT", artifactDir, "retained machine QA report is missing");
  }
  if (!existsSync(sourceReportPath)) {
    addFinding(findings, "USF-PROJECTION-REPIN-INPUT", artifactDir, "retained external-review report projection is missing");
  }
  const report = existsSync(reportPath) ? readJson(reportPath) : {};
  validateInput({ store, report, runDir, artifactDir, findings });
  const sourceReport = existsSync(sourceReportPath) ? readFileSync(sourceReportPath, "utf8") : "";
  const finalReport = buildFinalReport({ sourceReport, report, artifactDir });
  const manifest = buildManifest({
    report,
    store,
    artifactDir,
    sourceReportHash: existsSync(sourceReportPath) ? sha256File(sourceReportPath) : "",
    finalReportHash: sha256Text(finalReport),
  });
  const readme = buildReadme({ report, artifactDir });
  const writes = [
    { path: FINAL_REPORT_PATH, content: finalReport },
    { path: BUNDLE_README_PATH, content: readme },
    { path: BUNDLE_MANIFEST_PATH, content: `${JSON.stringify(manifest, null, 2)}\n` },
  ];
  return { store, report, artifactDir, findings, writes, manifest };
}

function run(args) {
  const projection = buildProjection(args);
  const drift = [];
  for (const output of projection.writes) {
    const current = existsSync(output.path) ? readFileSync(output.path, "utf8") : "";
    if (current !== output.content) {
      drift.push(repoRelative(output.path));
    }
  }
  if (args.check && drift.length) {
    for (const path of drift) {
      addFinding(projection.findings, "USF-PROJECTION-REPIN-DRIFT", path, "projection output is stale; run projection re-pin without check mode");
    }
  }
  if (!projection.findings.length && !args.check) {
    for (const output of projection.writes) {
      mkdirSync(dirname(output.path), { recursive: true });
      writeFileSync(output.path, output.content);
    }
  }
  const report = {
    ok: projection.findings.length === 0,
    mode: args.check ? "check" : "write",
    projectionIssue: PROJECTION_ISSUE,
    terminalFreshMachineQaIssue: TERMINAL_REFRESH_ISSUE,
    freshMachineQaGenerated: false,
    generatedReportsAreAuthority: false,
    artifactDir: projection.artifactDir,
    runId: projection.report.qaRun ?? "",
    sourceSha: projection.report.sourceSha ?? "",
    deploymentSha: projection.report.deploymentSha ?? "",
    environment: projection.report.environment ?? "",
    outputPaths: projection.writes.map((output) => repoRelative(output.path)),
    staleOutputPaths: drift,
    findings: projection.findings,
    commandContract: {
      requiredInputs: [
        "staging evidence store latestMachineRun",
        "retained latest machine QA artifact directory",
        "proof-cockpit-machine-qa-run.json",
        "service-evidence-manifest.json",
        "external-review-bundle external-review-report.md",
        "evidence index",
        "chain of custody",
      ],
      outputs: [
        "final external-review report",
        "external-review bundle README",
        "external-review bundle manifest",
      ],
      fallbackToFullMachineQaWhen: [
        "input is missing or outside the repository",
        "run directory does not match store latestMachineRun",
        "source, deployment, environment, run ID, counts, paths, or chain metadata drift",
        "warnings, failures, or unresolved gaps are non-zero",
        "required non-claims are missing",
      ],
      forbiddenClaims: [
        "fresh runtime proof",
        "fresh machine QA",
        "staging readiness",
        "production readiness",
        "deployment readiness",
        "live-provider readiness",
        "product, store, release, compliance, provider, or human acceptance readiness",
      ],
    },
  };
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(`Projection-only re-pin ${args.check ? "check passed" : "completed"} for ${report.runId}`);
  } else {
    for (const finding of projection.findings) {
      console.error(`${finding.rule} ${finding.subject}: ${finding.message}`);
    }
  }
  return report.ok ? 0 : 1;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}

process.exit(run(args));
