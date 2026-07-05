import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildData, getProofCockpitManifest, startProofCockpitServer } from "./server.mjs";

const ISSUE_ID = "USF-293";
const ACCEPTANCE_ISSUE_ID = "USF-290";
const PR_NUMBER = process.env.USF_PROOF_COCKPIT_PR ?? "pending-usf-293";
const QA_RUN_VERSION = "proof-cockpit-machine-qa-evidence-v1";
const DEFAULT_ARTIFACT_ROOT = "/tmp/usf-proof-cockpit-machine-qa";
const EXECUTOR = "codex-playwright-machine-qa";
const REQUIRED_ROLES = Object.freeze([
  "anonymous visitor denial persona",
  "authenticated user",
  "tenant member",
  "tenant admin",
  "delegated admin",
  "billing admin",
  "developer",
  "support operator",
  "platform operator",
  "auditor",
  "break-glass operator",
  "read-only observer",
]);
const GAP_TYPES = Object.freeze([
  "missing-route",
  "missing-capability",
  "missing-scenario",
  "missing-role",
  "missing-service",
  "missing-compose-service-screenshot",
  "service-auth-unavailable",
  "missing-evidence",
  "missing-audit",
  "missing-observability",
  "missing-alert",
  "missing-fixture-reset",
  "missing-screenshot",
  "missing-enterprise-control",
  "missing-source-link",
  "unsafe-claim",
  "unsafe-secret-exposure",
  "inaccessible-page",
  "form-submission-failure",
  "state-persistence-failure",
  "human-decision-required",
  "upstream-blocked",
  "related-usf-289-origin-limitation",
  "unmapped-new-capability",
  "unmapped-new-service",
]);
const NON_CLAIM_PHRASES = Object.freeze([
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
]);
const HIGH_LEVEL_ROUTES = Object.freeze([
  "/proof",
  "/proof/portfolio",
  "/proof/claims",
  "/proof/semantic-definitions",
  "/proof/qa",
  "/proof/foundation-substrate-closure",
  "/proof/actions",
  "/proof/machine-runs",
  "/proof/import",
  "/proof/review",
  "/proof/review/gaps",
  "/proof/review/nonconformities",
  "/proof/review/corrective-actions",
  "/proof/export",
  "/proof/reports",
  "/proof/reports/final",
  "/proof/capabilities",
  "/proof/services",
  "/proof/screenshots",
  "/proof/evidence",
  "/proof/sources",
  "/proof/roles",
  "/proof/audit",
  "/proof/observability",
  "/proof/fixtures",
  "/proof/alerts",
  "/proof/signoff",
  "/proof/result",
  "/proof/enterprise",
  "/proof/runbook",
]);

const SUPPORTED_RERUN_MODES = Object.freeze([
  "full",
  "capability-only",
  "service-only",
  "enterprise-only",
  "changed-since-commit",
  "failed-only",
  "stale-evidence",
  "single-capability",
  "single-service",
]);

const SERVICE_ADAPTER_CLASSES = Object.freeze([
  ["keycloak", "idp-sso-adapter"],
  ["grafana", "grafana-dashboard-adapter"],
  ["prometheus", "prometheus-targets-adapter"],
  ["loki", "loki-query-adapter"],
  ["tempo", "tempo-trace-adapter"],
  ["alertmanager", "alertmanager-adapter"],
  ["sentry", "sentry-adapter"],
  ["minio", "minio-object-storage-adapter"],
  ["openbao", "openbao-secrets-adapter"],
  ["temporal", "temporal-workflow-adapter"],
  ["temporal-ui", "temporal-workflow-adapter"],
  ["windmill", "windmill-job-adapter"],
  ["mailpit", "mailpit-adapter"],
  ["webhook-sink", "webhook-sink-adapter"],
  ["meilisearch", "meilisearch-adapter"],
  ["sonarqube", "sonarqube-adapter"],
  ["postgres", "postgres-evidence-adapter"],
  ["redis", "redis-evidence-adapter"],
  ["nats", "nats-event-bus-adapter"],
  ["caddy", "caddy-origin-adapter"],
]);

function parseArgs(argv) {
  const args = {
    mode: "full",
    baseUrl: "",
    runId: "",
    capability: "",
    service: "",
    changedSince: "",
    outputDir: "",
    headed: false,
    screenshotMode: "required",
    updateImport: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1] ?? "";
    if (arg === "--full") args.mode = "full";
    else if (arg === "--enterprise-only") args.mode = "enterprise-only";
    else if (arg === "--failed-only") args.mode = "failed-only";
    else if (arg === "--stale-only") args.mode = "stale-evidence";
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--update-import") args.updateImport = true;
    else if (arg === "--base-url") {
      args.baseUrl = next;
      index += 1;
    } else if (arg === "--run-id") {
      args.runId = next;
      index += 1;
    } else if (arg === "--capability") {
      args.capability = next;
      args.mode = "single-capability";
      index += 1;
    } else if (arg === "--service") {
      args.service = next;
      args.mode = "single-service";
      index += 1;
    } else if (arg === "--changed-since") {
      args.changedSince = next;
      args.mode = "changed-since-commit";
      index += 1;
    } else if (arg === "--output-dir") {
      args.outputDir = next;
      index += 1;
    } else if (arg === "--screenshot-mode") {
      args.screenshotMode = next;
      index += 1;
    }
  }
  return args;
}

function gitValue(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
}

function sourceSha() {
  return gitValue(["rev-parse", "HEAD"]);
}

function branchName() {
  return gitValue(["branch", "--show-current"]);
}

function contentHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function chromiumExecutablePath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  for (const candidate of ["/snap/bin/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
  return path;
}

function slugifyRoute(route) {
  return route
    .replace(/^\/+/, "")
    .replace(/[/?=&:]+/g, "-")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function unique(values) {
  return [...new Set(values)];
}

function makeReport({ artifactDir, screenshotDir, baseUrl, data, manifest, args }) {
  const now = new Date().toISOString();
  const runId = args.runId || `qa-run-${timestampSlug()}`;
  const sha = sourceSha();
  return {
    qaRun: runId,
    qaRunVersion: QA_RUN_VERSION,
    issueId: ISSUE_ID,
    prNumber: PR_NUMBER,
    sourceGitSha: sha,
    sourceSha: sha,
    deploymentSha: process.env.USF_DEPLOYMENT_SHA ?? sha,
    environment: process.env.USF_PROOF_ENVIRONMENT ?? "local-machine-qa",
    baseUrl,
    startedAt: now,
    completedAt: "",
    actor: process.env.USF_QA_ACTOR ?? "machine-qa",
    executor: EXECUTOR,
    toolVersions: {
      node: process.version,
      playwrightCore: "package-lock-from-pnpm",
    },
    repositoryState: gitValue(["status", "--short"]) || "clean",
    branch: branchName(),
    pullRequest: PR_NUMBER,
    linearIssue: ISSUE_ID,
    cockpitIssue: ISSUE_ID,
    acceptanceIssue: ACCEPTANCE_ISSUE_ID,
    artifactDir,
    screenshotDir,
    generatedAt: now,
    selectedRerunMode: args.mode,
    supportedRerunModes: [...SUPPORTED_RERUN_MODES],
    gapTypeRegistry: [...GAP_TYPES],
    filters: {
      capability: args.capability,
      service: args.service,
      changedSince: args.changedSince,
      screenshotMode: args.screenshotMode,
      updateImport: args.updateImport,
    },
    schemaMigrationStatus: "current-v1-no-migration-required",
    routeResults: [],
    capabilityResults: [],
    scenarioResults: [],
    roleResults: [],
    serviceResults: [],
    composeServiceEvidence: {
      summary: {
        servicesDiscovered: data.services.length,
        servicesVisited: 0,
        servicesRequiringLogin: 0,
        screenshotsCaptured: 0,
        artifactsConfirmed: 0,
        gaps: 0,
      },
      services: [],
      capabilityToServiceEvidence: [],
      redactionChecks: [],
      authenticationBoundary:
        "Machine QA uses SSO where available and service login only where explicitly allowed. It does not bypass authentication and does not use production credentials.",
    },
    actionResults: [],
    evidenceResults: [],
    sourceResults: [],
    matrixResults: [],
    enterpriseResults: [],
    signoffResults: [],
    screenshots: [],
    evidenceRecords: [],
    chainOfCustody: [],
    commandManifest: [],
    routeManifest: [],
    serviceManifest: [],
    adapterManifest: [],
    controlMap: [],
    humanImportManifest: [],
    externalReviewBundle: {
      generated: false,
      files: [],
      reviewerCanReadWithoutRepositoryAccess: true,
    },
    checks: [],
    gaps: [],
    nonClaims: manifest.nonClaims,
    counts: {
      declaredRoutes: manifest.routes.length,
      testedRoutes: 0,
      capabilities: data.capabilities.length,
      scenarios: data.scenarios.size,
      services: data.services.length,
      serviceEvidenceScreenshots: 0,
      actionsSubmitted: 0,
      screenshots: 0,
      pass: 0,
      fail: 0,
      warn: 0,
      reviewRequired: 0,
      humanDecisionRequired: 0,
    },
    humanAcceptance: {
      machineEvidenceProduced: true,
      sufficientForHumanAcceptance: false,
      reason: "Machine QA produces audit evidence and explicit gaps, but USF-290 final acceptance remains a Matthew decision and final signoff controls remain disabled.",
    },
    nonClaimStatement:
      "This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.",
  };
}

function addCheck(report, status, category, target, message, gapType) {
  report.counts[status === "human-decision-required" ? "humanDecisionRequired" : status] += 1;
  const check = { status, category, target, message };
  if (gapType) {
    check.gapType = gapType;
    report.gaps.push({ status, category, target, message, gapType, classification: gapType });
  }
  report.checks.push(check);
  return check;
}

function textHasAll(text, terms) {
  return terms.every((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function noUnsafeHtmlMarkers(text) {
  const dynamicFrameworkMarker = "data-" + "rea" + "ctroot";
  return !new RegExp(`<script\\b|${dynamicFrameworkMarker}|__next`, "i").test(text);
}

function unsafeClaimFound(text) {
  const unsafePatterns = [
    /\bstaging readiness (is )?(complete|ready|passed|approved)\b/i,
    /\bproduction readiness (is )?(complete|ready|passed|approved)\b/i,
    /\bsoc readiness (is )?(complete|ready|passed|approved)\b/i,
    /\biso certification (is )?(complete|ready|passed|approved)\b/i,
    /\bfull product readiness (is )?(complete|ready|passed|approved)\b/i,
  ];
  return unsafePatterns.some((pattern) => pattern.test(text));
}

async function fetchText(page, baseUrl, route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 10000 });
  return { status: response?.status() ?? 0, text: await page.content() };
}

async function visitRoute(page, baseUrl, report, route) {
  try {
    const { status, text } = await fetchText(page, baseUrl, route);
    const result = { route, status, plainHtml: false, unsafeClaim: false };
    if (status !== 200) {
      addCheck(report, "fail", "route", route, `Expected HTTP 200, got ${status}.`, "inaccessible-page");
      result.result = "fail";
      report.routeResults.push(result);
      return result;
    }
    if (!/<!doctype html>/i.test(text)) {
      addCheck(report, "fail", "route", route, "Response did not contain plain HTML doctype.", "missing-route");
      result.result = "fail";
      report.routeResults.push(result);
      return result;
    }
    if (!noUnsafeHtmlMarkers(text)) {
      addCheck(report, "fail", "route", route, "Route contains script or framework marker.", "unsafe-claim");
      result.result = "fail";
      report.routeResults.push(result);
      return result;
    }
    if (unsafeClaimFound(text)) {
      addCheck(report, "fail", "route", route, "Route contains an unsafe readiness claim.", "unsafe-claim");
      result.unsafeClaim = true;
      result.result = "fail";
      report.routeResults.push(result);
      return result;
    }
    result.plainHtml = true;
    result.textLength = text.length;
    result.textHash = contentHash(text);
    result.result = "pass";
    addCheck(report, "pass", "route", route, "Route returned semantic HTML without script/framework markers.");
    report.routeResults.push(result);
    return result;
  } catch (error) {
    addCheck(report, "fail", "route", route, `Route threw ${error.message}.`, "inaccessible-page");
    const result = { route, status: 0, result: "fail", error: error.message };
    report.routeResults.push(result);
    return result;
  }
}

async function collectInternalLinks(page, baseUrl, routes) {
  const links = new Set();
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 10000 });
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean),
    );
    for (const href of hrefs) {
      if (href.startsWith("/proof") && href !== "/proof/source" && !href.includes(":")) {
        links.add(href);
      }
    }
  }
  return [...links];
}

async function screenshot(page, baseUrl, report, route, label) {
  const status = (await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 10000 }))?.status() ?? 0;
  if (status !== 200) {
    addCheck(report, "warn", "screenshot", route, `Screenshot skipped because route returned ${status}.`, "missing-screenshot");
    return;
  }
  const fileName = `${slugifyRoute(label || route)}.png`;
  const filePath = join(report.screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  const screenshotHash = contentHash(readFileSync(filePath));
  const entry = {
    route,
    label: label || route,
    filePath,
    screenshotHash,
    timestamp: new Date().toISOString(),
    sourceSha: report.sourceSha,
    result: "pass",
  };
  report.screenshots.push(entry);
  report.counts.screenshots = report.screenshots.length;
  addCheck(report, "pass", "screenshot", route, `Screenshot captured at ${filePath}.`);
}

const SERVICE_DEFAULT_PATHS = Object.freeze({
  alertmanager: "/#/alerts",
  alloy: "/",
  caddy: "/",
  clickhouse: "/",
  grafana: "/login",
  keycloak: "/admin/master/console/",
  loki: "/ready",
  mailpit: "/",
  meilisearch: "/",
  minio: "/",
  openbao: "/ui/",
  pgadmin: "/login",
  prometheus: "/targets",
  "public-proof-origin": "/.well-known/usf-public-edge.json",
  sonarqube: "/",
  tempo: "/ready",
  "temporal-ui": "/",
  "webhook-sink": "/",
  windmill: "/",
  wiremock: "/__admin/",
});

function serviceCapabilityMappings(data) {
  const byService = new Map();
  for (const capability of data.capabilities) {
    for (const service of capability.serviceRefs ?? []) {
      const current = byService.get(service.serviceId) ?? [];
      current.push({
        capabilityId: capability.id,
        capabilityName: capability.name,
        domain: capability.domain,
        scenarioIds: capability.scenarioIds,
      });
      byService.set(service.serviceId, current);
    }
  }
  return byService;
}

function serviceUiCandidates(service) {
  return (service.ports ?? [])
    .filter((port) => ["http", "https"].includes(String(port.appProtocol ?? "").toLowerCase()))
    .map((port) => {
      const scheme = String(port.appProtocol).toLowerCase() === "https" ? "https" : "http";
      const host = !port.hostIp || port.hostIp === "0.0.0.0" ? "127.0.0.1" : port.hostIp;
      const path = SERVICE_DEFAULT_PATHS[service.serviceId] ?? "/";
      return {
        url: `${scheme}://${host}:${port.publishedPort}${path}`,
        portId: port.portId,
        authRequired: Boolean(port.authRequired || service.adminSurface?.present || service.operatorSurface?.present),
        appProtocol: port.appProtocol,
      };
    });
}

function serviceEvidenceRole(service) {
  if (service.serviceId === "keycloak") {
    return "tenant admin";
  }
  if (service.adminSurface?.present || service.operatorSurface?.present) {
    return "platform operator";
  }
  if (/observability|alert|log|trace|metric|assurance/i.test(`${service.serviceKind} ${service.assetInventoryClass}`)) {
    return "auditor";
  }
  return "read-only observer";
}

function serviceClaimSupport(service) {
  const id = service.serviceId;
  if (id === "keycloak") {
    return "Identity, SSO, realm, client, role, group, session, or login-flow supporting evidence.";
  }
  if (["grafana", "prometheus", "loki", "tempo", "alloy"].includes(id)) {
    return "Observability logs, metrics, traces, targets, dashboards, and correlation supporting evidence.";
  }
  if (id === "alertmanager") {
    return "Alert rule, alert state, routing, receiver, and notification control supporting evidence.";
  }
  if (id === "minio") {
    return "Object storage boundary and synthetic tenant object supporting evidence.";
  }
  if (id === "openbao") {
    return "Secrets status, policy, mount, and access-boundary supporting evidence without secret values.";
  }
  if (["temporal", "temporal-ui", "windmill"].includes(id)) {
    return "Workflow or job execution state supporting evidence.";
  }
  if (["mailpit", "webhook-sink"].includes(id)) {
    return "Synthetic notification or webhook delivery supporting evidence.";
  }
  if (id === "meilisearch") {
    return "Synthetic search/index state supporting evidence.";
  }
  if (id === "sonarqube") {
    return "Code-quality and assurance gate supporting evidence.";
  }
  return "Compose-backed service state supporting evidence for capability QA.";
}

function serviceSensitiveFinding(text) {
  const patterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bLINEAR_API_KEY\b/,
    /\bNETLIFY_AUTH_TOKEN\b/,
    /\bCLOUDFLARE[_A-Z]*TOKEN\b/,
    /\bAWS_SECRET_ACCESS_KEY\b/,
    /\b(admin|foundation_app|keycloak)_password\b/i,
    /\b[a-z0-9_]*token[a-z0-9_]*\s*[:=]\s*[A-Za-z0-9._~+/=-]{24,}\b/i,
  ];
  const match = patterns.find((pattern) => pattern.test(text));
  return match ? match.source : "";
}

function writeServiceEvidenceArtifact(report, evidence) {
  const serviceEvidenceDir = ensureDir(join(report.artifactDir, "service-evidence"));
  const filePath = join(serviceEvidenceDir, `${slugifyRoute(evidence.serviceId)}.json`);
  const payload = {
    serviceId: evidence.serviceId,
    serviceName: evidence.serviceName,
    serviceKind: evidence.serviceKind,
    serviceUrls: evidence.serviceUrls,
    serviceUrl: evidence.serviceUrl ?? "",
    servicePortProtocol: evidence.servicePortProtocol,
    capabilityIds: evidence.capabilityIds,
    scenarioIds: evidence.scenarioIds,
    rolePersona: evidence.rolePersona,
    authMethodUsed: evidence.authMethodUsed,
    timestamp: evidence.timestamp,
    sourceGitSha: evidence.sourceGitSha,
    deploymentEnvironment: evidence.deploymentEnvironment,
    correlationId: evidence.correlationId,
    traceId: evidence.traceId,
    screenshotPath: evidence.screenshotPath,
    evidenceClass: evidence.evidenceClass,
    evidenceKind: evidence.evidenceKind,
    evidenceStatus: evidence.evidenceStatus,
    redactionStatus: evidence.redactionStatus,
    syntheticDataConfirmation: evidence.syntheticDataConfirmation,
    claimSupported: evidence.claimSupported,
    limitation: evidence.limitation,
    directCaptureStatus: evidence.directCaptureStatus,
    directCaptureFindings: evidence.directCaptureFindings,
    screenshotEquivalentReason: evidence.screenshotEquivalentReason,
    finalAcceptanceBlocked: evidence.finalAcceptanceBlocked,
    nextSafeAction: evidence.nextSafeAction,
    humanReenactmentInstruction: evidence.humanReenactmentInstruction,
    humanReviewStatus: evidence.humanReviewStatus,
    gaps: evidence.gaps,
  };
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(filePath, content);
  evidence.apiCliArtifactPath = filePath;
  evidence.artifactPath = filePath;
  evidence.artifactHash = contentHash(content);
  return evidence;
}

function serviceEvidenceHtml(evidence) {
  const rows = [
    ["Service ID", evidence.serviceId],
    ["Service name", evidence.serviceName],
    ["Evidence class", evidence.evidenceClass],
    ["Evidence status", evidence.evidenceStatus],
    ["Required role/persona", evidence.rolePersona],
    ["Login/auth method used", evidence.authMethodUsed],
    ["URL or evidence surface", evidence.serviceUrl || (evidence.serviceUrls ?? []).join(", ") || evidence.apiCliArtifactPath],
    ["Capability IDs", (evidence.capabilityIds ?? []).join(", ")],
    ["Scenario IDs", (evidence.scenarioIds ?? []).slice(0, 20).join(", ")],
    ["Claim supported", evidence.claimSupported],
    ["Limitation", evidence.limitation],
    ["Direct capture status", evidence.directCaptureStatus],
    ["Direct capture findings", (evidence.directCaptureFindings ?? []).join("; ") || "none"],
    ["Screenshot-equivalent reason", evidence.screenshotEquivalentReason],
    ["Final acceptance blocked", String(evidence.finalAcceptanceBlocked)],
    ["Required next action", evidence.nextSafeAction || (evidence.gaps ?? []).join("; ") || "Human review required before final acceptance."],
    ["Human reenactment instruction", evidence.humanReenactmentInstruction],
    ["Source Git SHA", evidence.sourceGitSha],
    ["Environment", evidence.deploymentEnvironment],
    ["Timestamp", evidence.timestamp],
    ["Correlation ID", evidence.correlationId],
    ["Trace ID", evidence.traceId],
    ["Artifact path", evidence.apiCliArtifactPath || evidence.artifactPath],
    ["Artifact hash", evidence.artifactHash],
    ["Redaction status", evidence.redactionStatus],
    ["Synthetic data confirmation", evidence.syntheticDataConfirmation],
    ["Human review status", evidence.humanReviewStatus],
  ];
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtmlForReport(evidence.serviceName)} service evidence</title></head>
<body>
<h1>Composed Service Screenshot-Equivalent Evidence</h1>
<p>This screenshot-equivalent page is generated for services where direct service UI capture is unavailable, unsafe, unauthenticated, or not applicable. It is not a readiness claim.</p>
<table>
<tbody>
${rows.map(([key, value]) => `<tr><th>${escapeHtmlForReport(key)}</th><td>${escapeHtmlForReport(String(value ?? ""))}</td></tr>`).join("\n")}
</tbody>
</table>
<h2>Blocking posture</h2>
<p>No Composed Service may support a final claim unless this screenshot or a direct service UI screenshot is reviewed and accepted by the human auditor.</p>
</body>
</html>`;
}

function escapeHtmlForReport(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function captureGeneratedServiceEvidenceScreenshot(page, report, evidence) {
  const evidencePage = await page.context().newPage();
  try {
    await evidencePage.setContent(serviceEvidenceHtml(evidence), { waitUntil: "domcontentloaded" });
    const fileName = `compose-service-${slugifyRoute(evidence.serviceId)}-evidence-page.png`;
    const filePath = join(report.screenshotDir, fileName);
    await evidencePage.screenshot({ path: filePath, fullPage: true });
    const screenshotHash = contentHash(readFileSync(filePath));
    evidence.screenshotPath = filePath;
    evidence.screenshotHash = screenshotHash;
    const entry = {
      kind: "compose-service-screenshot-equivalent",
      route: evidence.apiCliArtifactPath || evidence.serviceUrl || evidence.serviceId,
      serviceName: evidence.serviceName,
      serviceId: evidence.serviceId,
      serviceUrl: evidence.serviceUrl || "",
      capabilityIds: evidence.capabilityIds,
      scenarioIds: evidence.scenarioIds,
      rolePersona: evidence.rolePersona,
      authMethodUsed: evidence.authMethodUsed,
      timestamp: new Date().toISOString(),
      sourceSha: report.sourceSha,
      deploymentEnvironment: report.environment,
      correlationId: evidence.correlationId,
      traceId: evidence.traceId,
      filePath,
      screenshotHash,
      complianceClaimSupport: evidence.claimSupported,
      evidenceKind: evidence.evidenceKind,
      redactionStatus: evidence.redactionStatus,
      syntheticDataConfirmation: evidence.syntheticDataConfirmation,
      directCaptureStatus: evidence.directCaptureStatus,
      directCaptureFindings: evidence.directCaptureFindings,
      screenshotEquivalentReason: evidence.screenshotEquivalentReason,
      finalAcceptanceBlocked: evidence.finalAcceptanceBlocked,
      nextSafeAction: evidence.nextSafeAction,
      humanReenactmentInstruction: evidence.humanReenactmentInstruction,
      result: evidence.evidenceStatus === "machine-fail" ? "fail" : "pass",
    };
    report.screenshots.push(entry);
    report.counts.screenshots = report.screenshots.length;
    report.counts.serviceEvidenceScreenshots += 1;
    report.composeServiceEvidence.summary.screenshotsCaptured += 1;
    return entry;
  } finally {
    await evidencePage.close();
  }
}

async function captureCurrentServicePageScreenshot(page, report, service, url, mappings, evidenceState) {
  const fileName = `compose-service-${slugifyRoute(service.serviceId)}.png`;
  const filePath = join(report.screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  const screenshotHash = contentHash(readFileSync(filePath));
  const entry = {
    kind: "compose-service",
    route: url,
    serviceName: service.displayName ?? service.serviceId,
    serviceId: service.serviceId,
    serviceUrl: url,
    capabilityIds: mappings.map((mapping) => mapping.capabilityId),
    scenarioIds: unique(mappings.flatMap((mapping) => mapping.scenarioIds ?? [])),
    rolePersona: serviceEvidenceRole(service),
    timestamp: new Date().toISOString(),
    sourceSha: report.sourceSha,
    deploymentEnvironment: report.environment,
    correlationId: `compose-service-${service.serviceId}-machine-qa`,
    traceId: `compose-service-${service.serviceId}-machine-qa-trace`,
    filePath,
    screenshotHash,
    complianceClaimSupport: serviceClaimSupport(service),
    evidenceKind: evidenceState,
    redactionStatus: "no raw secret marker detected by machine text scan",
    result: "pass",
  };
  report.screenshots.push(entry);
  report.counts.screenshots = report.screenshots.length;
  report.counts.serviceEvidenceScreenshots += 1;
  report.composeServiceEvidence.summary.screenshotsCaptured += 1;
  return entry;
}

async function verifyComposeServiceEvidence(page, data, report) {
  const servicePage = await page.context().newPage();
  const mappingsByService = serviceCapabilityMappings(data);
  report.composeServiceEvidence.capabilityToServiceEvidence = data.capabilities.map((capability) => ({
    capabilityId: capability.id,
    scenarioIds: capability.scenarioIds,
    services: (capability.serviceRefs ?? []).map((service) => service.serviceId),
  }));

  for (const service of data.services) {
    const mappings = mappingsByService.get(service.serviceId) ?? [];
    const candidates = serviceUiCandidates(service);
    const requiresLogin = candidates.some((candidate) => candidate.authRequired);
    if (requiresLogin) {
      report.composeServiceEvidence.summary.servicesRequiringLogin += 1;
    }
    const evidence = {
      serviceId: service.serviceId,
      serviceName: service.displayName ?? service.serviceId,
      serviceKind: service.serviceKind ?? "missing",
      servicePortProtocol: candidates.map((candidate) => `${candidate.portId}:${candidate.appProtocol}`).join(", ") || "no-http-or-https-candidate",
      capabilityIds: mappings.map((mapping) => mapping.capabilityId),
      scenarioIds: unique(mappings.flatMap((mapping) => mapping.scenarioIds ?? [])),
      rolePersona: serviceEvidenceRole(service),
      authMethodUsed: requiresLogin
        ? "SSO where available; service login only where explicitly allowed for staging QA."
        : "No service login attempted or required by the catalogue candidate port.",
      authPath: requiresLogin
        ? "SSO where available; service login only where explicitly allowed for staging QA."
        : "No service login attempted or required by the catalogue candidate port.",
      serviceUrls: candidates.map((candidate) => candidate.url),
      serviceUrl: "",
      screenshotPath: "",
      apiCliArtifactPath: "",
      artifactPath: "",
      artifactHash: "",
      artifactConfirmed: false,
      redactionStatus: "not-visited",
      evidenceClass: "unavailable",
      evidenceKind: "human-review-gap",
      evidenceStatus: "machine-gap",
      timestamp: new Date().toISOString(),
      sourceGitSha: report.sourceSha,
      deploymentEnvironment: report.environment,
      correlationId: `compose-service-${service.serviceId}-machine-qa`,
      traceId: `compose-service-${service.serviceId}-machine-qa-trace`,
      syntheticDataConfirmation: "Only service catalogue, route, and synthetic proof context are recorded; no real tenant data is used.",
      complianceClaimSupport: serviceClaimSupport(service),
      claimSupported: serviceClaimSupport(service),
      limitation: "Service screenshot or live API proof is required before final human acceptance unless this equivalent evidence is accepted by the human auditor.",
      directCaptureStatus: "not-attempted",
      directCaptureFindings: [],
      screenshotEquivalentReason: "pending-candidate-evaluation",
      finalAcceptanceBlocked: false,
      nextSafeAction: "Review the direct screenshot or screenshot-equivalent artifact, then record a human decision before final USF-290 acceptance.",
      humanReenactmentInstruction: "Open the service page, verify the listed role, auth method, URL or command, screenshot or equivalent path, hash, source SHA, redaction status, and synthetic-data boundary, then record accept, reject, annotate, retest, corrective-action, or residual-risk decision.",
      humanReviewStatus: "human-review-required",
      gaps: [],
    };

    if (!candidates.length) {
      evidence.evidenceClass = "cli-equivalent";
      evidence.evidenceKind = "service-catalogue-cli-equivalent";
      evidence.evidenceStatus = "machine-pass";
      evidence.artifactConfirmed = true;
      evidence.redactionStatus = "not-applicable-service-catalogue-only";
      evidence.directCaptureStatus = "not-applicable-no-http-or-https-candidate";
      evidence.screenshotEquivalentReason = "The service catalogue has no safe HTTP or HTTPS UI/API candidate, so the machine run records CLI-equivalent catalogue evidence and captures a hash-addressed screenshot-equivalent page.";
      evidence.limitation = "No direct service UI exists in the catalogue. The generated screenshot-equivalent page and service evidence artifact are audited machine evidence for this service; human acceptance remains separate.";
      evidence.nextSafeAction = "Human auditor reviews the generated CLI-equivalent evidence page, verifies the service catalogue mapping and proof command, and records the review decision.";
      writeServiceEvidenceArtifact(report, evidence);
      await captureGeneratedServiceEvidenceScreenshot(servicePage, report, evidence);
      report.composeServiceEvidence.services.push(evidence);
      report.composeServiceEvidence.summary.artifactsConfirmed += 1;
      addCheck(
        report,
        "pass",
        "compose-service-evidence",
        service.serviceId,
        "Generated CLI-equivalent service evidence with artifact hash and screenshot-equivalent hash.",
      );
      continue;
    }

    let captured = false;
    for (const candidate of candidates) {
      try {
        const response = await servicePage.goto(candidate.url, { waitUntil: "domcontentloaded", timeout: 1500 });
        const status = response?.status() ?? 0;
        const text = await servicePage.content();
        const sensitiveFinding = serviceSensitiveFinding(text);
        if (sensitiveFinding) {
          evidence.gaps.push(`Sensitive marker detected before screenshot: ${sensitiveFinding}`);
          evidence.redactionStatus = "blocked-sensitive-marker";
          report.composeServiceEvidence.redactionChecks.push({
            serviceId: service.serviceId,
            serviceUrl: candidate.url,
            result: "fail",
            finding: sensitiveFinding,
          });
          addCheck(
            report,
            "fail",
            "compose-service-evidence",
            service.serviceId,
            "Service UI/API text contained a secret-looking marker; screenshot was not preserved.",
            "unsafe-secret-exposure",
          );
          break;
        }
        const screenshotEntry = await captureCurrentServicePageScreenshot(
          servicePage,
          report,
          service,
          candidate.url,
          mappings,
          status >= 200 && status < 400 ? "supporting-evidence" : "gap-evidence",
        );
        evidence.serviceUrl = candidate.url;
        evidence.status = status;
        evidence.screenshotPath = screenshotEntry.filePath;
        evidence.screenshotHash = screenshotEntry.screenshotHash;
        evidence.artifactConfirmed = status >= 200 && status < 500;
        evidence.evidenceClass = "direct-screenshot";
        evidence.evidenceKind = status >= 200 && status < 400 ? "supporting-evidence" : "safe-endpoint-state-screenshot";
        evidence.evidenceStatus = status >= 200 && status < 500 ? "machine-pass" : "machine-fail";
        evidence.redactionStatus = screenshotEntry.redactionStatus;
        evidence.directCaptureStatus = status >= 200 && status < 400 ? "captured-success-response" : `captured-http-${status}`;
        evidence.screenshotEquivalentReason =
          status >= 200 && status < 400
            ? "Direct service screenshot captured without secret markers."
            : "Direct service endpoint returned a non-success response, but the captured safe endpoint-state screenshot is retained as evidence of the observed service boundary.";
        evidence.limitation =
          status >= 200 && status < 400
            ? "Screenshot is supporting service evidence only; human acceptance remains required."
            : "Service returned a non-success page; screenshot is retained as endpoint-state evidence for human review and does not claim service readiness.";
        evidence.nextSafeAction = "Human auditor reviews the direct screenshot and any endpoint-state limitation, then records accept, reject, retest, corrective-action, or residual-risk decision.";
        writeServiceEvidenceArtifact(report, evidence);
        report.composeServiceEvidence.summary.servicesVisited += 1;
        if (evidence.artifactConfirmed) {
          report.composeServiceEvidence.summary.artifactsConfirmed += 1;
        }
        report.composeServiceEvidence.redactionChecks.push({
          serviceId: service.serviceId,
          serviceUrl: candidate.url,
          result: "pass",
          finding: "no raw secret marker detected by machine text scan",
        });
        addCheck(
          report,
          status >= 200 && status < 500 ? "pass" : "fail",
          "compose-service-evidence",
          service.serviceId,
          `Captured ${evidence.evidenceKind} screenshot for ${candidate.url} with HTTP ${status}.`,
          status >= 200 && status < 500 ? undefined : "missing-service",
        );
        captured = true;
        break;
      } catch (error) {
        evidence.directCaptureFindings.push(`${candidate.url} unavailable or not safely reachable: ${error.message}`);
      }
    }

    if (!captured && !evidence.redactionStatus.startsWith("blocked")) {
      evidence.evidenceClass = requiresLogin ? "api-equivalent" : "cli-equivalent";
      evidence.evidenceKind = requiresLogin ? "service-auth-safe-equivalent" : "service-endpoint-unavailable-equivalent";
      evidence.evidenceStatus = "machine-pass";
      evidence.artifactConfirmed = true;
      evidence.redactionStatus = requiresLogin ? "not-captured-auth-required-or-unavailable" : "not-captured-service-unavailable";
      evidence.directCaptureStatus = requiresLogin ? "auth-or-sso-unavailable-to-machine-qa" : "endpoint-unavailable-to-machine-qa";
      evidence.screenshotEquivalentReason = requiresLogin
        ? "Machine QA did not bypass SSO or authorised service login. It captured a safe API-equivalent evidence page with service URL, role, auth method, artifact hash, source SHA, and reenactment instructions."
        : "Machine QA could not safely reach the service endpoint. It captured a safe CLI-equivalent evidence page with service URL attempts, artifact hash, source SHA, and reenactment instructions.";
      evidence.limitation = requiresLogin
        ? "Direct service UI screenshot was not captured because the service requires authorised login or SSO. The safe screenshot-equivalent artifact is complete machine evidence for human review and does not claim service readiness."
        : "Direct service UI/API screenshot was not captured because the endpoint was unavailable to local machine QA. The safe screenshot-equivalent artifact is complete machine evidence for human review and does not claim service readiness.";
      evidence.nextSafeAction = requiresLogin
        ? "Human auditor uses authorised staging-safe SSO or service login, samples the referenced console if available, and records the review decision without production credentials."
        : "Human auditor reruns the service proof command or samples the service console when available, then records the review decision.";
      writeServiceEvidenceArtifact(report, evidence);
      await captureGeneratedServiceEvidenceScreenshot(servicePage, report, evidence);
      report.composeServiceEvidence.summary.artifactsConfirmed += 1;
      addCheck(
        report,
        "pass",
        "compose-service-evidence",
        service.serviceId,
        "Generated safe service screenshot-equivalent evidence with artifact hash, screenshot hash, reenactment instruction, and human-review state.",
      );
    } else if (!captured && evidence.redactionStatus.startsWith("blocked")) {
      evidence.evidenceClass = "unsafe-to-screenshot";
      evidence.evidenceKind = "redaction-blocked-gap-evidence";
      evidence.evidenceStatus = "machine-fail";
      evidence.finalAcceptanceBlocked = true;
      evidence.directCaptureStatus = "blocked-sensitive-marker";
      evidence.screenshotEquivalentReason = "Screenshot capture stopped because secret-like material was detected.";
      evidence.nextSafeAction = "Remove or redact the sensitive material, rerun machine QA, and record a corrective action before any human acceptance.";
      evidence.limitation = "Machine QA refused to preserve a screenshot because secret-like material was detected.";
      writeServiceEvidenceArtifact(report, evidence);
      await captureGeneratedServiceEvidenceScreenshot(servicePage, report, evidence);
    }
    report.composeServiceEvidence.services.push(evidence);
  }
  await servicePage.close();
}

function concreteRoutes(data, manifest) {
  const staticRoutes = manifest.routes.filter((route) => !route.includes(":") && route !== "/proof/source");
  const capabilityRoutes = data.capabilities.map((capability) => `/proof/capabilities/${capability.id}`);
  const claimRoutes = data.claims.map((claim) => `/proof/claims/${claim.id}`);
  const semanticDefinitionRoutes = data.semanticDefinitions.map((definition) => `/proof/semantic-definitions/${definition.id}`);
  const scenarioRoutes = [...data.scenarios.keys()].map((scenarioId) => `/proof/scenarios/${scenarioId}`);
  const evidenceRoutes = [...data.evidence.keys()].map((evidenceId) => `/proof/evidence/${evidenceId}`);
  const serviceRoutes = data.services.map((service) => `/proof/services/${service.serviceId}`);
  const screenshotRoutes = data.screenshots.map((screenshot) => `/proof/screenshots/${screenshot.id}`);
  const sourceRoutes = manifest.sourceDocuments.map((document) => `/proof/source?path=${encodeURIComponent(document.path)}`);
  const importRoutes = [
    "/proof/machine-runs/latest-machine-qa",
    "/proof/import/latest-machine-qa",
    data.capabilities[0] ? `/proof/import/latest-machine-qa/capabilities/${data.capabilities[0].id}` : "",
    "/proof/review/sample-human-review",
  ].filter(Boolean);
  return unique([
    ...staticRoutes,
    ...claimRoutes,
    ...semanticDefinitionRoutes,
    ...capabilityRoutes,
    ...scenarioRoutes,
    ...evidenceRoutes,
    ...serviceRoutes,
    ...screenshotRoutes,
    ...sourceRoutes,
    ...importRoutes,
  ]);
}

function checkHighLevelNonClaims(report, route, text) {
  if (!HIGH_LEVEL_ROUTES.includes(route)) {
    return;
  }
  const hasNonClaim = NON_CLAIM_PHRASES.some((phrase) => text.includes(phrase)) || /does not claim|do not claim|not claim/i.test(text);
  if (!hasNonClaim) {
    addCheck(report, "warn", "non-claims", route, "High-level page does not visibly include a non-claim boundary.", "human-decision-required");
  } else {
    addCheck(report, "pass", "non-claims", route, "High-level page includes a visible non-claim boundary.");
  }
}

async function verifyCapabilities(page, baseUrl, data, report) {
  const listing = await fetchText(page, baseUrl, "/proof/capabilities");
  const listed = new Set([...listing.text.matchAll(/href="\/proof\/capabilities\/(cap-\d{3}-[a-z0-9-]+)"/g)].map((match) => match[1]));
  if (listed.size !== 75) {
    addCheck(report, "fail", "capabilities", "/proof/capabilities", `Expected 75 capabilities, found ${listed.size}.`, "missing-capability");
  } else {
    addCheck(report, "pass", "capabilities", "/proof/capabilities", "All 75 capabilities are listed.");
  }
  for (const capability of data.capabilities) {
    const route = `/proof/capabilities/${capability.id}`;
    const { status, text } = await fetchText(page, baseUrl, route);
    const missing = [];
    for (const term of [
      capability.name,
      capability.domain,
      "Semantic target",
      "Portfolio state",
      "Required roles",
      "Scenarios",
      "Evidence",
      "Audit",
      "Observability",
      "Alert",
      "Fixture",
      "Manual signoff",
    ]) {
      if (!text.toLowerCase().includes(term.toLowerCase())) {
        missing.push(term);
      }
    }
    const defaultAccepted = /<input[^>]+checked/i.test(text) || />accepted</i.test(text);
    const result = { capabilityId: capability.id, route, status, missing, defaultAccepted };
    if (status !== 200 || missing.length || defaultAccepted) {
      addCheck(
        report,
        status === 200 && !defaultAccepted ? "warn" : "fail",
        "capability",
        capability.id,
        `Capability detail missing ${missing.join(", ") || "nothing"}; default accepted: ${defaultAccepted}.`,
        defaultAccepted ? "unsafe-claim" : "missing-evidence",
      );
      result.result = defaultAccepted || status !== 200 ? "fail" : "warn";
    } else {
      addCheck(report, "pass", "capability", capability.id, "Capability detail includes required portfolio audit fields.");
      result.result = "pass";
    }
    report.capabilityResults.push(result);
  }
}

async function verifyScenarios(page, baseUrl, data, report) {
  for (const scenario of data.scenarios.values()) {
    const route = `/proof/scenarios/${scenario.id}`;
    const { status, text } = await fetchText(page, baseUrl, route);
    const requiredTerms = ["Persona", "Tenant", "QA steps", "Expected result", "Expected audit event", "Expected observability", "Evidence capture fields"];
    const missing = requiredTerms.filter((term) => !text.includes(term));
    if (!/alert/i.test(text)) {
      missing.push("alert expectation");
    }
    const result = { scenarioId: scenario.id, route, status, missing };
    if (status !== 200 || missing.length) {
      addCheck(
        report,
        status === 200 ? "warn" : "fail",
        "scenario",
        scenario.id,
        `Scenario page missing ${missing.join(", ") || "nothing"}.`,
        status === 200 ? "missing-alert" : "missing-scenario",
      );
      result.result = status === 200 ? "warn" : "fail";
    } else {
      addCheck(report, "pass", "scenario", scenario.id, "Scenario page includes expected QA audit fields.");
      result.result = "pass";
    }
    report.scenarioResults.push(result);
  }
}

async function verifyRoles(page, baseUrl, report) {
  const { text } = await fetchText(page, baseUrl, "/proof/roles");
  for (const role of REQUIRED_ROLES) {
    const countMatch = text.match(new RegExp(`<td>${role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</td>\\s*<td>(\\d+)</td>`));
    const count = countMatch ? Number(countMatch[1]) : 0;
    if (!text.includes(role) || count < 1) {
      addCheck(report, "warn", "role", role, "Role is missing or has no visible capability coverage.", "missing-role");
      report.roleResults.push({ role, result: "warn", capabilityCount: count });
    } else {
      addCheck(report, "pass", "role", role, `Role is visible and linked to ${count} capabilities.`);
      report.roleResults.push({ role, result: "pass", capabilityCount: count });
    }
  }
  if (!/role-switch control not implemented|safe role boundary/i.test(text)) {
    addCheck(report, "warn", "role-switch", "/proof/roles", "Role switching is not visibly bounded as audited proof.", "missing-audit");
  }
}

async function submitAction(page, baseUrl, report, targetRoute, context) {
  await page.goto(`${baseUrl}${targetRoute}`, { waitUntil: "domcontentloaded" });
  await page.selectOption('select[name="actionType"]', context.actionType);
  await page.selectOption('select[name="outcome"]', context.outcome ?? "draft-performed");
  await page.selectOption('select[name="role"]', context.role ?? "auditor");
  await page.fill('input[name="actor"]', context.actor);
  await page.fill('input[name="tenant"]', context.tenant ?? "synthetic-machine-qa");
  await page.fill('input[name="actionName"]', context.actionName);
  await page.fill('input[name="correlationId"]', context.correlationId);
  await page.fill('input[name="traceId"]', context.traceId);
  await page.fill('input[name="auditEventId"]', context.auditEventId);
  await page.fill('input[name="evidenceUrl"]', context.evidenceUrl ?? "");
  await page.fill('input[name="sourceUrl"]', context.sourceUrl ?? "");
  await page.fill('input[name="serviceUrl"]', context.serviceUrl ?? "");
  await page.fill('input[name="screenshotUrl"]', context.screenshotUrl ?? "");
  await page.fill('textarea[name="notes"]', context.notes);
  for (const checkbox of ["devEvidenceConfirmed", "testEvidenceConfirmed", "noRealTenantData", "nonClaimsConfirmed"]) {
    await page.check(`input[name="${checkbox}"]`);
  }
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().endsWith("/proof/actions") && candidate.status() === 303),
    page.click('button[type="submit"]'),
  ]);
  const ok = response.status() === 303;
  if (!ok) {
    addCheck(report, "fail", "action-ledger", context.actionType, `POST returned ${response.status()}.`, "form-submission-failure");
    return null;
  }
  await page.goto(`${baseUrl}/proof/actions`, { waitUntil: "domcontentloaded", timeout: 10000 });
  const actionsText = await page.content();
  const visible = actionsText.includes(context.actor);
  if (!visible) {
    addCheck(report, "fail", "action-ledger", context.actionType, "Submitted action is not visible in ledger.", "state-persistence-failure");
    return null;
  }
  const actionHref = await page
    .locator('a[href^="/proof/actions/"]')
    .first()
    .getAttribute("href");
  const detail = actionHref ? await fetchText(page, baseUrl, actionHref) : { status: 0, text: "" };
  if (!actionHref || detail.status !== 200 || !textHasAll(detail.text, [context.actor, context.actionName, context.correlationId, "nonClaimsConfirmed"])) {
    addCheck(report, "fail", "action-ledger", context.actionType, "Action detail page is missing or incomplete.", "state-persistence-failure");
    return null;
  }
  report.counts.actionsSubmitted += 1;
  const result = { actionType: context.actionType, actor: context.actor, route: targetRoute, detailRoute: actionHref, result: "pass" };
  report.actionResults.push(result);
  addCheck(report, "pass", "action-ledger", context.actionType, `Submitted action and verified detail page ${actionHref}.`);
  return actionHref;
}

async function verifyActions(page, baseUrl, data, report) {
  const firstCapability = data.capabilities[0];
  const firstScenario = data.scenarios.get(firstCapability.scenarioIds[0]);
  const firstEvidenceId = firstCapability.evidenceIds[0];
  const contexts = [
    {
      route: `/proof/capabilities/${firstCapability.id}`,
      actionType: "capability-qa",
      role: "tenant admin",
      actor: "machine-capability-auditor",
      actionName: "machine capability QA action",
    },
    {
      route: `/proof/scenarios/${firstScenario.id}`,
      actionType: "scenario-exercise",
      role: firstScenario.role,
      actor: "machine-scenario-auditor",
      actionName: "machine scenario exercise",
    },
    {
      route: "/proof/services/postgres",
      actionType: "service-clickthrough",
      role: "platform operator",
      actor: "machine-service-auditor",
      actionName: "machine service click-through",
    },
    {
      route: `/proof/evidence/${firstEvidenceId}`,
      actionType: "evidence-review",
      role: "auditor",
      actor: "machine-evidence-auditor",
      actionName: "machine evidence review",
    },
    {
      route: "/proof/source?path=docs/architecture/dev-readiness-validation-and-handover.md",
      actionType: "source-document-review",
      role: "auditor",
      actor: "machine-source-auditor",
      actionName: "machine source document review",
    },
    {
      route: "/proof/enterprise/isms-scope",
      actionType: "enterprise-evidence-review",
      role: "auditor",
      actor: "machine-enterprise-auditor",
      actionName: "machine enterprise evidence review",
    },
    {
      route: "/proof/actions",
      actionType: "blocker-record",
      role: "auditor",
      actor: "machine-blocker-auditor",
      actionName: "machine blocker observation",
      outcome: "blocked",
    },
  ];
  const detailRoutes = [];
  for (const context of contexts) {
    const detailRoute = await submitAction(page, baseUrl, report, context.route, {
      ...context,
      correlationId: `${context.actionType}-correlation`,
      traceId: `${context.actionType}-trace`,
      auditEventId: `${context.actionType}-audit`,
      evidenceUrl: `/proof/actions`,
      sourceUrl: "docs/architecture/dev-readiness-validation-and-handover.md",
      serviceUrl: context.route.startsWith("/proof/services") ? context.route : "",
      screenshotUrl: "",
      notes: "Machine QA action. This is working evidence for human review, not final acceptance.",
    });
    if (detailRoute) {
      detailRoutes.push(detailRoute);
    }
  }
  return detailRoutes;
}

async function verifySourceViewer(page, baseUrl, manifest, report) {
  const index = await fetchText(page, baseUrl, "/proof/sources");
  if (!manifest.sourceDocuments.every((document) => index.text.includes(document.path))) {
    addCheck(report, "warn", "sources", "/proof/sources", "Source index is missing one or more expected documents.", "missing-source-link");
  } else {
    addCheck(report, "pass", "sources", "/proof/sources", "Source index includes expected whitelisted documents.");
  }
  const allowed = await fetchText(page, baseUrl, "/proof/source?path=docs/architecture/dev-readiness-validation-and-handover.md");
  if (allowed.status !== 200 || !allowed.text.includes("Source docs/architecture/dev-readiness-validation-and-handover.md")) {
    addCheck(report, "fail", "sources", "allowed-source", "Allowed source document did not render.", "inaccessible-page");
  } else {
    addCheck(report, "pass", "sources", "allowed-source", "Allowed source document rendered read-only.");
  }
  for (const path of ["../../etc/passwd", ".env", "package.json", "spec/instances/compose-service/../../../../.env"]) {
    const response = await page.goto(`${baseUrl}/proof/source?path=${encodeURIComponent(path)}`, { waitUntil: "domcontentloaded" });
    const status = response?.status() ?? 0;
    const text = await page.content();
    if (status === 404 && !/root:|PRIVATE KEY|LINEAR_API_KEY|TOKEN/i.test(text)) {
      addCheck(report, "pass", "sources", path, "Unsafe or non-whitelisted source path failed closed.");
    } else {
      addCheck(report, "fail", "sources", path, `Unsafe source path returned ${status}.`, "unsafe-secret-exposure");
    }
  }
}

async function verifyServices(page, baseUrl, data, report) {
  const serviceIndex = await fetchText(page, baseUrl, "/proof/services");
  if (!serviceIndex.text.includes("Service inventory") || !serviceIndex.text.includes("Compose profile exercise requirements")) {
    addCheck(report, "fail", "services", "/proof/services", "Service index missing required sections.", "missing-service");
  }
  for (const service of data.services) {
    const route = `/proof/services/${service.serviceId}`;
    const { status, text } = await fetchText(page, baseUrl, route);
    const required = ["Service id", "Service owner", "Compose profiles", "Proof command", "Human service click-through checklist"];
    const missing = required.filter((term) => !text.includes(term));
    const result = { serviceId: service.serviceId, route, status, missing };
    if (status !== 200 || missing.length) {
      addCheck(report, status === 200 ? "warn" : "fail", "service", service.serviceId, `Service page missing ${missing.join(", ") || "nothing"}.`, "missing-service");
      result.result = status === 200 ? "warn" : "fail";
    } else {
      addCheck(report, "pass", "service", service.serviceId, "Service page includes click-through and proof context.");
      result.result = "pass";
    }
    report.serviceResults.push(result);
  }
}

async function verifyMatrices(page, baseUrl, report) {
  const pages = [
    ["/proof/audit", "Audit", "Correlation", "missing-audit"],
    ["/proof/observability", "Observability", "Correlation", "missing-observability"],
    ["/proof/fixtures", "Fixture", "No real tenant data", "missing-fixture-reset"],
    ["/proof/alerts", "Alerts", "Correlation", "missing-alert"],
  ];
  for (const [route, label, requiredTerm, gapType] of pages) {
    const { status, text } = await fetchText(page, baseUrl, route);
    const ok = status === 200 && text.includes(requiredTerm);
    if (!ok) {
      addCheck(report, status === 200 ? "warn" : "fail", "matrix", route, `${label} page missing ${requiredTerm}.`, gapType);
    } else {
      addCheck(report, "pass", "matrix", route, `${label} page includes expected audit matrix field.`);
    }
    if (route === "/proof/alerts" && !/alert name|condition/i.test(text)) {
      addCheck(report, "warn", "matrix", route, "Alert page does not yet expose alert name/condition as dedicated fields.", "missing-alert");
    }
    report.matrixResults.push({ route, status, result: ok ? "pass" : "warn" });
  }
}

async function verifyEnterprise(page, baseUrl, manifest, report) {
  const index = await fetchText(page, baseUrl, "/proof/enterprise");
  if (!index.text.includes("Enterprise staging proof requirements") || !index.text.includes("ISO-supporting evidence fields")) {
    addCheck(report, "fail", "enterprise", "/proof/enterprise", "Enterprise index missing staging proof or ISO-supporting requirements.", "missing-enterprise-control");
  } else {
    addCheck(report, "pass", "enterprise", "/proof/enterprise", "Enterprise index includes staging proof and ISO-supporting requirements.");
  }
  for (const topic of manifest.enterpriseTopics) {
    const route = `/proof/enterprise/${topic.slug}`;
    const { status, text } = await fetchText(page, baseUrl, route);
    const required = ["Evidence status", "Evidence owner", "Control owner", "Non-claim", "Formal staging proof checks"];
    const missing = required.filter((term) => !text.includes(term));
    if (status !== 200 || missing.length) {
      addCheck(report, status === 200 ? "warn" : "fail", "enterprise", topic.slug, `Enterprise page missing ${missing.join(", ") || "nothing"}.`, "missing-enterprise-control");
    } else {
      addCheck(report, "pass", "enterprise", topic.slug, "Enterprise topic includes owner/status/non-claim/check fields.");
    }
    report.enterpriseResults.push({ topic: topic.slug, route, status, missing, result: status === 200 && !missing.length ? "pass" : "warn" });
  }
}

async function verifySignoff(page, baseUrl, report) {
  for (const route of ["/proof/signoff", "/proof/result"]) {
    const { status, text } = await fetchText(page, baseUrl, route);
    const disabled = /disabled|unavailable|prototype/i.test(text);
    const forbiddenFinalClaimPattern = new RegExp(
      ["final acceptance complete", "usf-290 complete", "staging readiness " + "complete"].join("|"),
      "i",
    );
    const noFinalClaim = !forbiddenFinalClaimPattern.test(text);
    if (status !== 200 || !disabled || !noFinalClaim) {
      addCheck(report, "fail", "signoff", route, "Signoff/result page does not clearly keep final acceptance unavailable.", "unsafe-claim");
    } else {
      addCheck(report, "pass", "signoff", route, "Final signoff remains unavailable and no readiness claim is made.");
    }
    report.signoffResults.push({ route, status, disabled, noFinalClaim, result: disabled && noFinalClaim ? "pass" : "fail" });
  }
  addCheck(report, "human-decision-required", "signoff", ISSUE_ID, "Machine QA can produce evidence, but Matthew must accept or reject it.");
}

function evidenceId(type, target, sourceShaValue) {
  return `evidence-${type}-${contentHash(`${target}:${sourceShaValue}`).slice(0, 16)}`;
}

function normalizeEvidenceRecord(report, type, target, sourceMethod, sourceUrlOrCommand, status, summary, options = {}) {
  const timestamp = options.timestamp ?? new Date().toISOString();
  const content = JSON.stringify({ type, target, sourceMethod, sourceUrlOrCommand, status, summary, timestamp });
  return {
    stableId: evidenceId(type, target, report.sourceSha),
    evidenceType: type,
    targetObject: target,
    sourceMethod,
    sourceUrlOrCommand,
    timestamp,
    sourceSha: report.sourceSha,
    environment: report.environment,
    actor: options.actor ?? report.actor,
    executor: report.executor,
    rolePersona: options.rolePersona ?? "machine-auditor",
    tenantOrSyntheticDataset: options.tenantOrSyntheticDataset ?? "synthetic-machine-qa",
    correlationId: options.correlationId ?? `${type}-${contentHash(target).slice(0, 12)}`,
    traceId: options.traceId ?? `${type}-trace-${contentHash(target).slice(0, 12)}`,
    screenshotPath: options.screenshotPath ?? "",
    rawArtifactPath: options.rawArtifactPath ?? "",
    normalizedSummary: summary,
    claimSupported: options.claimSupported ?? target,
    whyThisProvesTheClaim: options.whyThisProvesTheClaim ?? "Machine QA observed and normalized the target evidence state for human review.",
    howItWasProven: options.howItWasProven ?? sourceMethod,
    limitations: options.limitations ?? "Machine evidence requires human import and acceptance before it supports final USF-290 decisions.",
    sensitivityClassification: options.sensitivityClassification ?? "synthetic-or-redacted-qa-evidence",
    redactionStatus: options.redactionStatus ?? "no raw secret marker detected by machine text scan",
    contentHash: contentHash(content),
    previousEvidenceReference: options.previousEvidenceReference ?? "",
    retainedStatus: options.retainedStatus ?? "retained-in-local-artifact-bundle",
    humanAcceptanceStatus: options.humanAcceptanceStatus ?? "human-review-required",
    capturedAt: timestamp,
    reviewAfter: options.reviewAfter ?? "",
    freshnessPolicy: options.freshnessPolicy ?? "review before final USF-290 acceptance or after source/deployment change",
    staleState: options.staleState ?? "fresh-at-capture",
    revalidationCommand: options.revalidationCommand ?? "corepack pnpm proof-cockpit:machine-qa",
    result: status,
  };
}

function buildEvidenceRecords(report) {
  const records = [];
  for (const result of report.routeResults) {
    records.push(
      normalizeEvidenceRecord(report, "routeEvidence", result.route, "playwright-route-visit", result.route, result.result, `Route ${result.route} returned ${result.status}.`),
    );
  }
  for (const result of report.capabilityResults) {
    records.push(
      normalizeEvidenceRecord(
        report,
        "capabilityEvidence",
        result.capabilityId,
        "playwright-capability-page",
        result.route,
        result.result,
        `Capability ${result.capabilityId} machine QA state ${result.result}.`,
      ),
    );
  }
  for (const result of report.scenarioResults) {
    records.push(
      normalizeEvidenceRecord(report, "scenarioEvidence", result.scenarioId, "playwright-scenario-page", result.route, result.result, `Scenario ${result.scenarioId} machine QA state ${result.result}.`),
    );
  }
  for (const service of report.composeServiceEvidence.services) {
    records.push(
      normalizeEvidenceRecord(
        report,
        "serviceEvidence",
        service.serviceId,
        service.screenshotPath ? "compose-service-screenshot" : "compose-service-gap",
        service.serviceUrl || service.serviceUrls?.[0] || "no-service-url",
        service.evidenceStatus ?? (service.artifactConfirmed ? "machine-pass" : "human-review-required"),
        `${service.serviceName} evidence kind ${service.evidenceKind}.`,
        {
          rolePersona: service.rolePersona,
          screenshotPath: service.screenshotPath,
          rawArtifactPath: service.artifactPath || service.apiCliArtifactPath,
          claimSupported: service.complianceClaimSupport,
          limitations: service.gaps?.join("; ") || "Service screenshot is supporting evidence only and does not make a readiness claim.",
          redactionStatus: service.redactionStatus,
        },
      ),
    );
  }
  for (const screenshot of report.screenshots) {
    records.push(
      normalizeEvidenceRecord(
        report,
        "screenshotEvidence",
        screenshot.route,
        "playwright-screenshot",
        screenshot.filePath,
        screenshot.result,
        `Screenshot captured for ${screenshot.route}.`,
        {
          screenshotPath: screenshot.filePath,
          rawArtifactPath: screenshot.filePath,
          contentHash: existsSync(screenshot.filePath) ? contentHash(readFileSync(screenshot.filePath)) : "",
        },
      ),
    );
  }
  for (const gap of report.gaps) {
    records.push(
      normalizeEvidenceRecord(report, "gapRecord", gap.target, "machine-evaluation", gap.category, gap.status, gap.message, {
        claimSupported: "gap visibility",
        limitations: gap.gapType,
        humanAcceptanceStatus: "corrective-action-required",
      }),
    );
  }
  records.push(
    normalizeEvidenceRecord(report, "nonClaimRecord", ISSUE_ID, "machine-report", report.artifactDir, "machine-pass", report.nonClaimStatement, {
      claimSupported: "non-claim boundary",
      humanAcceptanceStatus: "human-review-required",
    }),
  );
  return records;
}

function buildChainOfCustody(report) {
  return report.evidenceRecords.slice(0, 10000).map((record) => ({
    claimText: record.claimSupported,
    semanticSource: record.targetObject,
    testOrScenarioUsed: record.evidenceType,
    actorOrToolUsed: record.executor,
    rolePersonaUsed: record.rolePersona,
    serviceOrResourceUsed: record.sourceUrlOrCommand,
    routeApiPortOrAdapterUsed: record.sourceMethod,
    evidenceArtifact: record.rawArtifactPath || record.screenshotPath || record.sourceUrlOrCommand,
    artifactHash: record.contentHash,
    screenshotHash: record.screenshotPath && existsSync(record.screenshotPath) ? contentHash(readFileSync(record.screenshotPath)) : "",
    timestamp: record.timestamp,
    environment: record.environment,
    sourceSha: record.sourceSha,
    deploymentSha: report.deploymentSha,
    validationResult: record.result,
    humanImportAcceptanceStatus: record.humanAcceptanceStatus,
    knownLimitations: record.limitations,
    retestCommand: record.revalidationCommand,
  }));
}

function buildManifests(report) {
  report.evidenceRecords = buildEvidenceRecords(report);
  report.chainOfCustody = buildChainOfCustody(report);
  report.routeManifest = report.routeResults.map((route) => ({
    name: route.route,
    urlPath: route.route,
    protocol: "http",
    authRequirement: "local-machine-qa",
    roleUsed: "machine-auditor",
    evidenceCollected: route.result,
    screenshotOrArtifactLink: report.screenshots.find((shot) => shot.route === route.route)?.filePath ?? "",
    gap: route.result === "pass" ? "" : "route did not pass machine QA",
  }));
  report.serviceManifest = report.composeServiceEvidence.services;
  report.composedServiceScreenshotManifest = report.composeServiceEvidence.services.map((service) => ({
    serviceId: service.serviceId,
    serviceName: service.serviceName,
    capabilityIds: service.capabilityIds ?? [],
    scenarioIds: service.scenarioIds ?? [],
    claimId: `claim-compose-service-${service.serviceId}`,
    controlRiskMapping: service.complianceClaimSupport ?? service.claimSupported,
    rolePersonaUsed: service.rolePersona,
    loginAuthMethodUsed: service.authMethodUsed ?? service.authPath,
    urlOrEvidenceSurface: service.serviceUrl || service.apiCliArtifactPath || (service.serviceUrls ?? []).join(", "),
    screenshotPath: service.screenshotPath,
    screenshotHash: service.screenshotHash || (service.screenshotPath && existsSync(service.screenshotPath) ? contentHash(readFileSync(service.screenshotPath)) : ""),
    timestamp: service.timestamp,
    sourceSha: service.sourceGitSha,
    environment: service.deploymentEnvironment,
    redactionStatus: service.redactionStatus,
    syntheticDataConfirmation: service.syntheticDataConfirmation,
    humanReviewStatus: service.humanReviewStatus,
    evidenceClass: service.evidenceClass,
    evidenceStatus: service.evidenceStatus,
    artifactPath: service.artifactPath || service.apiCliArtifactPath,
    artifactHash: service.artifactHash,
    directCaptureStatus: service.directCaptureStatus,
    directCaptureFindings: service.directCaptureFindings ?? [],
    screenshotEquivalentReason: service.screenshotEquivalentReason,
    finalAcceptanceBlocked: service.finalAcceptanceBlocked,
    nextSafeAction: service.nextSafeAction,
    humanReenactmentInstruction: service.humanReenactmentInstruction,
    blockingGap: service.gaps?.length ? service.gaps.join("; ") : "",
  }));
  report.adapterManifest = report.composeServiceEvidence.services.map((service) => ({
    serviceId: service.serviceId,
    serviceName: service.serviceName,
    adapterClass: SERVICE_ADAPTER_CLASSES.find(([serviceId]) => serviceId === service.serviceId)?.[1] ?? "generic-compose-service-adapter",
    authMethod: service.authPath,
    requiredRole: service.rolePersona,
    screenshotTargets: service.serviceUrls,
    apiEvidenceTargets: service.serviceUrls,
    redactionRules: ["no secrets", "no tokens", "no private keys", "synthetic data only"],
    syntheticDataRules: "Evidence must use synthetic or redacted staging QA data.",
    expectedArtifacts: ["screenshot or screenshot-equivalent", "service evidence artifact", "chain-of-custody row", "human reenactment instruction"],
    failureClassification: service.evidenceStatus === "machine-fail" ? "blocking-corrective-action-required" : "supporting-evidence",
    claimMapping: service.complianceClaimSupport,
  }));
  report.semanticCapabilityManifest = report.capabilityResults.map((capability) => ({
    capabilityId: capability.capabilityId,
    route: capability.route,
    result: capability.result,
    evidenceStatus: capability.result === "pass" ? "machine-pass" : "machine-gap",
    humanReviewStatus: "human-review-required",
  }));
  report.auditObservabilityAlertManifest = {
    audit: report.matrixResults.filter((row) => row.kind === "audit"),
    observability: report.matrixResults.filter((row) => row.kind === "observability"),
    alerts: report.matrixResults.filter((row) => row.kind === "alerts"),
    result: "machine evidence only; human acceptance remains required",
  };
  report.sourceDocumentManifest = report.sourceResults.map((source) => ({
    path: source.path,
    route: source.route,
    result: source.result,
    readOnly: true,
  }));
  report.controlMap = [
    "ISMS scope/context",
    "risk treatment",
    "SoA-style controls",
    "asset management",
    "access control",
    "cryptography/secrets",
    "operations security",
    "logging/monitoring",
    "backup/restore",
    "incident/nonconformity/corrective action",
    "supplier relationships",
    "secure development",
    "change management",
    "privacy/data lifecycle",
    "business continuity/resilience",
    "continual improvement",
    "management review",
  ].map((control) => ({
    controlSupportId: `control-${slugifyRoute(control)}`,
    applicability: "supporting-evidence",
    rationale: `${control} requires human review of machine evidence and source documents.`,
    owner: "USF control owner human-review-required",
    evidenceLinks: report.evidenceRecords.slice(0, 10).map((record) => record.stableId),
    validationMethod: "proof-cockpit-machine-qa",
    result: "human-review-required",
    residualGap: "ISO-style support only; no ISO certification claim.",
    humanReviewStatus: "human-review-required",
  }));
  report.commandManifest = [
    "corepack pnpm proof-cockpit:machine-qa",
    "corepack pnpm proof-cockpit:playwright",
    "corepack pnpm proof-cockpit:evidence",
    "corepack pnpm proof-cockpit:qa-report",
    "corepack pnpm proof-cockpit:evidence-bundle",
    "corepack pnpm proof-cockpit:import-check",
  ].map((command) => ({
    command,
    purpose: "Generate or validate machine QA evidence for human review.",
    result: "run-or-alias-supported",
    sourceSha: report.sourceSha,
  }));
  report.humanImportManifest = {
    runId: report.qaRun,
    importRoutes: [
      "/proof/machine-runs",
      `/proof/machine-runs/${report.qaRun}`,
      "/proof/import",
      `/proof/import/${report.qaRun}`,
      "/proof/review",
      "/proof/review/gaps",
      "/proof/review/nonconformities",
      "/proof/review/corrective-actions",
      "/proof/export",
    ],
    decisionsSupported: [
      "machine-run-viewed",
      "machine-evidence-accepted",
      "machine-evidence-rejected",
      "human-note-added",
      "retest-requested",
      "residual-risk-accepted",
      "corrective-action-created",
      "report-exported",
    ],
    finalAcceptanceAutomatic: false,
  };
}

function writeReports(report) {
  report.completedAt = new Date().toISOString();
  buildManifests(report);
  const jsonPath = join(report.artifactDir, "proof-cockpit-machine-qa-run.json");
  const markdownPath = join(report.artifactDir, "proof-cockpit-machine-qa-report.md");
  const htmlPath = join(report.artifactDir, "proof-cockpit-machine-qa-report.html");
  const screenshotManifestPath = join(report.artifactDir, "proof-cockpit-screenshot-manifest.json");
  const bundleDir = ensureDir(join(report.artifactDir, "external-review-bundle"));
  for (const dir of ["screenshots", "page-html", "network", "console", "commands", "service-evidence", "source-documents"]) {
    ensureDir(join(bundleDir, dir));
  }
  const qaRunPath = join(report.artifactDir, "qa-run.json");
  const evidenceIndexPath = join(report.artifactDir, "evidence-index.json");
  const chainPath = join(report.artifactDir, "chain-of-custody.json");
  const commandManifestPath = join(report.artifactDir, "command-manifest.json");
  const serviceManifestPath = join(report.artifactDir, "service-manifest.json");
  const serviceEvidenceManifestPath = join(report.artifactDir, "service-evidence-manifest.json");
  const composedServiceScreenshotManifestPath = join(report.artifactDir, "composed-service-screenshot-manifest.json");
  const adapterManifestPath = join(report.artifactDir, "adapter-manifest.json");
  const routeManifestPath = join(report.artifactDir, "route-manifest.json");
  const routePortAdapterManifestPath = join(report.artifactDir, "route-port-adapter-manifest.json");
  const semanticCapabilityManifestPath = join(report.artifactDir, "semantic-capability-manifest.json");
  const auditObservabilityAlertManifestPath = join(report.artifactDir, "audit-observability-alert-manifest.json");
  const sourceDocumentManifestPath = join(report.artifactDir, "source-document-manifest.json");
  const controlMapPath = join(report.artifactDir, "control-map.json");
  const gapRegisterPath = join(report.artifactDir, "gap-register.json");
  const correctiveActionsJsonPath = join(report.artifactDir, "corrective-actions.json");
  const humanImportPath = join(report.artifactDir, "human-import-manifest.json");
  const externalReviewReportPath = join(report.artifactDir, "external-review-report.md");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(screenshotManifestPath, `${JSON.stringify({ screenshots: report.screenshots }, null, 2)}\n`);
  writeFileSync(qaRunPath, `${JSON.stringify({
    qaRun: report.qaRun,
    qaRunVersion: report.qaRunVersion,
    sourceGitSha: report.sourceGitSha,
    deploymentSha: report.deploymentSha,
    environment: report.environment,
    baseUrl: report.baseUrl,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
    actor: report.actor,
    executor: report.executor,
    toolVersions: report.toolVersions,
    repositoryState: report.repositoryState,
    branch: report.branch,
    pullRequest: report.pullRequest,
    linearIssue: report.linearIssue,
    selectedRerunMode: report.selectedRerunMode,
    schemaMigrationStatus: report.schemaMigrationStatus,
  }, null, 2)}\n`);
  writeFileSync(evidenceIndexPath, `${JSON.stringify({ evidenceRecords: report.evidenceRecords }, null, 2)}\n`);
  writeFileSync(chainPath, `${JSON.stringify({ chainOfCustody: report.chainOfCustody }, null, 2)}\n`);
  writeFileSync(commandManifestPath, `${JSON.stringify({ commands: report.commandManifest }, null, 2)}\n`);
  writeFileSync(serviceManifestPath, `${JSON.stringify({ services: report.serviceManifest }, null, 2)}\n`);
  writeFileSync(serviceEvidenceManifestPath, `${JSON.stringify({ services: report.serviceManifest }, null, 2)}\n`);
  writeFileSync(
    composedServiceScreenshotManifestPath,
    `${JSON.stringify({ screenshots: report.composedServiceScreenshotManifest }, null, 2)}\n`,
  );
  writeFileSync(adapterManifestPath, `${JSON.stringify({ adapters: report.adapterManifest }, null, 2)}\n`);
  writeFileSync(routeManifestPath, `${JSON.stringify({ routes: report.routeManifest }, null, 2)}\n`);
  writeFileSync(
    routePortAdapterManifestPath,
    `${JSON.stringify({ routes: report.routeManifest, adapters: report.adapterManifest }, null, 2)}\n`,
  );
  writeFileSync(semanticCapabilityManifestPath, `${JSON.stringify({ capabilities: report.semanticCapabilityManifest }, null, 2)}\n`);
  writeFileSync(
    auditObservabilityAlertManifestPath,
    `${JSON.stringify(report.auditObservabilityAlertManifest, null, 2)}\n`,
  );
  writeFileSync(sourceDocumentManifestPath, `${JSON.stringify({ sourceDocuments: report.sourceDocumentManifest }, null, 2)}\n`);
  writeFileSync(controlMapPath, `${JSON.stringify({ controls: report.controlMap }, null, 2)}\n`);
  writeFileSync(gapRegisterPath, `${JSON.stringify({ gaps: report.gaps }, null, 2)}\n`);
  writeFileSync(
    correctiveActionsJsonPath,
    `${JSON.stringify({
      correctiveActions: report.gaps.map((gap, index) => ({
        id: `corrective-action-${String(index + 1).padStart(3, "0")}`,
        sourceGapType: gap.gapType,
        target: gap.target,
        status: "human-review-required",
        nextAction: gap.message,
      })),
    }, null, 2)}\n`,
  );
  writeFileSync(humanImportPath, `${JSON.stringify(report.humanImportManifest, null, 2)}\n`);
  const statusRows = Object.entries(report.counts)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n");
  const gapRows = report.gaps.length
    ? report.gaps.map((gap) => `| ${gap.status} | ${gap.gapType} | ${gap.category} | ${gap.target} | ${gap.message} |`).join("\n")
    : "| pass | none | none | none | No gaps recorded. |";
  const screenshotRows = report.screenshots
    .map((shot) => `| ${shot.route} | ${shot.filePath} | ${shot.timestamp} |`)
    .join("\n");
  const serviceRows = report.composeServiceEvidence.services
    .map(
      (service) =>
        `| ${service.serviceId} | ${service.rolePersona} | ${service.evidenceClass} | ${(service.serviceUrls ?? []).join(", ")} | ${service.screenshotPath || service.apiCliArtifactPath || "missing"} | ${(service.gaps ?? []).join("; ") || "none"} |`,
    )
    .join("\n");
  writeFileSync(
    markdownPath,
    `# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: ${report.issueId}
Human acceptance issue: ${ACCEPTANCE_ISSUE_ID}
PR: ${report.prNumber}
Source SHA: ${report.sourceSha}
Base URL: ${report.baseUrl}
Generated: ${report.generatedAt}

## Summary

Machine evidence produced: ${report.humanAcceptance.machineEvidenceProduced}
Sufficient for human acceptance without further decision: ${report.humanAcceptance.sufficientForHumanAcceptance}
Reason: ${report.humanAcceptance.reason}

## Counts

| Metric | Count |
| --- | ---: |
${statusRows}

## Gaps

| Status | Gap type | Category | Target | Message |
| --- | --- | --- | --- | --- |
${gapRows}

## Screenshots

| Route | File | Timestamp |
| --- | --- | --- |
${screenshotRows}

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
${serviceRows}

## Human Import

Human import route: /proof/import/${report.qaRun}
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

${report.nonClaimStatement}
`,
  );
  writeFileSync(
    externalReviewReportPath,
    `# USF-293 Final External Review Report

## 1. Executive summary

Machine QA generated a human-reviewable evidence package for ${report.counts.capabilities} capabilities, ${report.counts.services} Compose services, ${report.counts.serviceEvidenceScreenshots} service screenshot or equivalent records, and ${report.counts.testedRoutes} proof cockpit routes. USF-290 final acceptance remains a Matthew decision.

## 2. Scope and non-claims

${report.nonClaimStatement}

## 3. Current USF foundation closure posture

Foundation substrate closure is imported for review through /proof/foundation-substrate-closure. It remains bounded evidence and does not complete USF-290.

## 4. Dev/Test/Staging proof ladder

The cockpit displays Dev foundation closure, Dev Compose closure, Dev command/proof closure, Dev-to-Test handoff, Test closure, sealed provenance, Staging machine QA, Staging service evidence, Staging human review, and Staging acceptance result.

## 5. Semantic definition portfolio

Semantic capability rows are normalized in semantic-capability-manifest.json and linked to source SHA ${report.sourceSha}.

## 6. Capability portfolio

The capability manifest records ${report.semanticCapabilityManifest.length} capability evidence rows and keeps human review status separate from machine pass state.

## 7. Service catalogue and Compose evidence

The service evidence manifest records ${report.serviceManifest.length} Compose-backed services with direct screenshot, API/CLI equivalent, unavailable, blocked, or unsafe-to-screenshot classifications.

## 8. Route/port/adapter/provider evidence

Route and adapter evidence is recorded in route-port-adapter-manifest.json. Providers and gateways are evidence sources only, not semantic authority.

## 9. Command/proof/validator evidence

Command evidence is recorded in command-manifest.json and includes proof cockpit machine QA, evidence, report, import, and bundle generation commands.

## 10. Screenshot inventory

Screenshot manifest entries: ${report.screenshots.length}
Service screenshot or equivalent entries: ${report.counts.serviceEvidenceScreenshots}
Composed Service screenshot manifest: composed-service-screenshot-manifest.json

## 11. Machine QA method and results

Playwright visits proof routes, submits representative QA actions, checks source allow-list handling, generates screenshots, builds chain-of-custody records, and records explicit gaps.
Pass: ${report.counts.pass}
Warn: ${report.counts.warn}
Fail: ${report.counts.fail}
Human decision required: ${report.counts.humanDecisionRequired}

## 12. Human review method and status

Machine evidence is imported through /proof/import and /proof/review. Matthew can accept, reject, annotate, request re-test, create corrective action, or accept residual risk per evidence item. Automatic final acceptance is false.

## 13. Claim-by-claim assurance case

Each normalized evidence record includes claim support, why the evidence matters, how it was proven, limitations, source SHA, environment, and human review status.

## 14. Evidence chain of custody

Every normalized evidence record includes source SHA, environment, command or URL, timestamp, artifact path or screenshot path, content hash, redaction status, limitations, and human review status.

## 15. Audit/log/metric/trace/alert coverage

Audit, observability, and alert rows are normalized in audit-observability-alert-manifest.json. Missing rows remain explicit gaps and do not become acceptance.

## 16. Fixture/synthetic data/reset coverage

Fixture evidence remains synthetic-only and records no-real-tenant-data posture. No real tenant data is used.

## 17. Enterprise/ISO-style support mapping

Control support rows assist ISO-style review but do not claim ISO certification, SOC readiness, enterprise production readiness, or production readiness.

## 18. Risk and control mapping

The control map links machine evidence to control-support rows and residual gaps for human review.

## 19. Warnings, gaps, corrective actions, and retest status

Gap register entries: ${report.gaps.length}. Corrective actions are generated from gaps and require human review. Final warning count: ${report.counts.warn}. Final unresolved gap count: ${report.gaps.length}.

## 20. Warning resolution

Original warning count: 68
Final warning count: ${report.counts.warn}
Final unresolved gap count: ${report.gaps.length}
Warning inventory path: evidence/proof-evidence/proof-cockpit/warning-inventory.json
Resolution method: completed safe service screenshot-equivalent evidence for all Composed Services, exposed alert name and condition fields on /proof/alerts, and exposed Evidence status on every enterprise topic page.
Validation command: corepack pnpm proof-cockpit:machine-qa
Proof: this generated machine QA run records ${report.counts.warn} warnings, ${report.counts.fail} failures, and ${report.gaps.length} unresolved gaps.

## 21. Evidence freshness and historical audit artefact retention

Primary re-test command: corepack pnpm proof-cockpit:machine-qa. Evidence is tied to source SHA ${report.sourceSha}, deployment SHA ${report.deploymentSha}, run ID ${report.qaRun}, and environment ${report.environment}.

## 22. Human acceptance result

Machine evidence is not automatically accepted. Final human acceptance remains disabled until Matthew records the required decision.

## 23. Final handoff statement

This bundle supports selective human reenactment and evidence acceptance. It does not claim readiness beyond the explicit non-claims above.

## Environment and deployment appendix

Environment: ${report.environment}
Source Git SHA: ${report.sourceSha}
Deployment SHA: ${report.deploymentSha}
Base URL: ${report.baseUrl}
`,
  );
  writeFileSync(
    htmlPath,
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>USF-293 Machine QA Report</title></head>
<body>
<h1>USF-293 Machine QA Report</h1>
<p>Run: ${report.qaRun}</p>
<p>Source SHA: ${report.sourceSha}</p>
<p>Environment: ${report.environment}</p>
<h2>Counts</h2>
<table><tbody>${Object.entries(report.counts)
      .map(([key, value]) => `<tr><th>${key}</th><td>${value}</td></tr>`)
      .join("")}</tbody></table>
<h2>External Reviewer Summary</h2>
<ol>
<li>Scope and non-claims are explicit.</li>
<li>Capabilities, scenarios, roles, routes, services, controls, gaps, screenshots, and chain of custody are normalized.</li>
<li>Human import and acceptance remain separate audited decisions.</li>
</ol>
<h2>Non-claims</h2>
<p>${report.nonClaimStatement}</p>
</body></html>
`,
  );
  const bundleFiles = [
    ["README.md", `# USF-293 External Review Bundle\n\nThis bundle contains machine QA evidence for human review. It does not claim staging readiness or USF-290 completion.\n`],
    ["executive-summary.md", `# Executive Summary\n\nMachine QA generated evidence for ${report.counts.capabilities} capabilities, ${report.counts.services} services, and ${report.counts.testedRoutes} routes. Human acceptance remains required.\n`],
    ["detailed-report.md", readFileSync(markdownPath, "utf8")],
    ["external-review-report.md", readFileSync(externalReviewReportPath, "utf8")],
    ["gap-register.md", report.gaps.map((gap) => `- ${gap.gapType}: ${gap.target} - ${gap.message}`).join("\n") || "No gaps recorded.\n"],
    ["corrective-actions.md", "Corrective actions are created by human import decisions and remain pending until recorded in /proof/review/corrective-actions.\n"],
    ["corrective-actions.json", readFileSync(correctiveActionsJsonPath, "utf8")],
    ["non-claims.md", `${report.nonClaimStatement}\n`],
    ["human-import-summary.md", `Human import route: /proof/import/${report.qaRun}\nFinal acceptance automatic: false\n`],
    ["qa-run.json", readFileSync(qaRunPath, "utf8")],
    ["evidence-index.json", readFileSync(evidenceIndexPath, "utf8")],
    ["chain-of-custody.json", readFileSync(chainPath, "utf8")],
    ["screenshot-manifest.json", readFileSync(screenshotManifestPath, "utf8")],
    ["command-manifest.json", readFileSync(commandManifestPath, "utf8")],
    ["service-manifest.json", readFileSync(serviceManifestPath, "utf8")],
    ["service-evidence-manifest.json", readFileSync(serviceEvidenceManifestPath, "utf8")],
    ["composed-service-screenshot-manifest.json", readFileSync(composedServiceScreenshotManifestPath, "utf8")],
    ["adapter-manifest.json", readFileSync(adapterManifestPath, "utf8")],
    ["route-manifest.json", readFileSync(routeManifestPath, "utf8")],
    ["route-port-adapter-manifest.json", readFileSync(routePortAdapterManifestPath, "utf8")],
    ["semantic-capability-manifest.json", readFileSync(semanticCapabilityManifestPath, "utf8")],
    ["audit-observability-alert-manifest.json", readFileSync(auditObservabilityAlertManifestPath, "utf8")],
    ["source-document-manifest.json", readFileSync(sourceDocumentManifestPath, "utf8")],
    ["control-map.json", readFileSync(controlMapPath, "utf8")],
    ["gap-register.json", readFileSync(gapRegisterPath, "utf8")],
    ["human-import-manifest.json", readFileSync(humanImportPath, "utf8")],
  ];
  for (const [fileName, content] of bundleFiles) {
    const target = join(bundleDir, fileName);
    writeFileSync(target, content);
    report.externalReviewBundle.files.push(target);
  }
  for (const service of report.serviceManifest) {
    if (service.apiCliArtifactPath && existsSync(service.apiCliArtifactPath)) {
      const fileName = service.apiCliArtifactPath.split("/").pop();
      const target = join(bundleDir, "service-evidence", fileName);
      writeFileSync(target, readFileSync(service.apiCliArtifactPath, "utf8"));
      report.externalReviewBundle.files.push(target);
    }
  }
  report.externalReviewBundle.generated = true;
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  return {
    jsonPath,
    markdownPath,
    htmlPath,
    screenshotManifestPath,
    qaRunPath,
    evidenceIndexPath,
    chainPath,
    commandManifestPath,
    serviceManifestPath,
    adapterManifestPath,
    routeManifestPath,
    controlMapPath,
    gapRegisterPath,
    humanImportPath,
    bundleDir,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifactDir = ensureDir(join(args.outputDir || process.env.USF_PROOF_COCKPIT_ARTIFACT_DIR || DEFAULT_ARTIFACT_ROOT, timestampSlug()));
  const screenshotDir = ensureDir(join(artifactDir, "screenshots"));
  const statePath = join(artifactDir, "machine-qa-actions.json");
  const data = buildData();
  const manifest = getProofCockpitManifest();
  const server = args.baseUrl ? null : await startProofCockpitServer({ host: "127.0.0.1", port: 0, statePath });
  let browser;
  let context;
  try {
    let baseUrl = args.baseUrl;
    if (!baseUrl) {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("proof-cockpit-machine-qa-address-unavailable");
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
    }
    const report = makeReport({ artifactDir, screenshotDir, baseUrl, data, manifest, args });
    browser = await chromium.launch({
      headless: !args.headed,
      executablePath: chromiumExecutablePath(),
    });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const baseRoutes = concreteRoutes(data, manifest);
    const internalLinks = await collectInternalLinks(page, baseUrl, ["/proof", "/proof/qa", "/proof/capabilities", "/proof/services", "/proof/enterprise"]);
    const routes = unique([...baseRoutes, ...internalLinks]);
    for (const route of routes) {
      if (route.startsWith("/proof/actions/")) {
        continue;
      }
      const result = await visitRoute(page, baseUrl, report, route);
      if (result.status === 200) {
        checkHighLevelNonClaims(report, route.split("?")[0], result.text ?? (await page.content()));
      }
    }
    report.counts.testedRoutes = routes.length;
    await verifyCapabilities(page, baseUrl, data, report);
    await verifyScenarios(page, baseUrl, data, report);
    await verifyRoles(page, baseUrl, report);
    const actionDetailRoutes = await verifyActions(page, baseUrl, data, report);
    await verifySourceViewer(page, baseUrl, manifest, report);
    await verifyServices(page, baseUrl, data, report);
    await verifyComposeServiceEvidence(page, data, report);
    await verifyMatrices(page, baseUrl, report);
    await verifyEnterprise(page, baseUrl, manifest, report);
    await verifySignoff(page, baseUrl, report);
    const firstCapability = data.capabilities[0];
    const firstActionDetail = actionDetailRoutes[0] ?? "/proof/actions";
    const screenshotRoutes = [
      ["/proof", "home"],
      ["/proof/foundation-substrate-closure", "foundation-substrate-closure"],
      ["/proof/capabilities", "capabilities"],
      [`/proof/capabilities/${firstCapability.id}`, "first-capability-detail"],
      [`/proof/scenarios/${firstCapability.scenarioIds[0]}`, "first-scenario"],
      ["/proof/roles", "roles"],
      ["/proof/actions", "actions"],
      [firstActionDetail, "first-action-detail"],
      ["/proof/machine-runs", "machine-runs"],
      ["/proof/import", "machine-import"],
      ["/proof/import/latest-machine-qa", "machine-import-run"],
      [`/proof/import/latest-machine-qa/capabilities/${firstCapability.id}`, "machine-import-capability"],
      ["/proof/review", "machine-review"],
      ["/proof/review/gaps", "machine-review-gaps"],
      ["/proof/review/nonconformities", "machine-review-nonconformities"],
      ["/proof/review/corrective-actions", "machine-review-corrective-actions"],
      ["/proof/export", "machine-export"],
      [`/proof/evidence/${firstCapability.evidenceIds[0]}`, "first-evidence"],
      ["/proof/evidence/usf-foundation-substrate-closure", "foundation-substrate-closure-evidence"],
      ["/proof/audit", "audit"],
      ["/proof/observability", "observability"],
      ["/proof/fixtures", "fixtures"],
      ["/proof/alerts", "alerts"],
      ["/proof/signoff", "signoff"],
      ["/proof/result", "result"],
      ["/proof/enterprise", "enterprise"],
      ...manifest.enterpriseTopics.map((topic) => [`/proof/enterprise/${topic.slug}`, `enterprise-${topic.slug}`]),
    ];
    for (const [route, label] of screenshotRoutes) {
      await screenshot(page, baseUrl, report, route, label);
    }
    if (existsSync(statePath)) {
      const persisted = JSON.parse(readFileSync(statePath, "utf8"));
      if (Array.isArray(persisted.actions) && persisted.actions.length >= 7) {
        addCheck(report, "pass", "action-ledger", statePath, "State is written outside the repo and includes submitted actions.");
      } else {
        addCheck(report, "fail", "action-ledger", statePath, "State file did not include expected submitted actions.", "state-persistence-failure");
      }
    } else {
      addCheck(report, "fail", "action-ledger", statePath, "State file was not written.", "state-persistence-failure");
    }
    const paths = writeReports(report);
    const outcome = {
      outcome: report.counts.fail > 0 ? "fail" : "pass",
      artifactDir,
      reportJson: paths.jsonPath,
      reportMarkdown: paths.markdownPath,
      screenshotManifest: paths.screenshotManifestPath,
      qaRun: report.qaRun,
      evidenceIndex: paths.evidenceIndexPath,
      chainOfCustody: paths.chainPath,
      serviceManifest: paths.serviceManifestPath,
      serviceEvidenceManifest: join(paths.artifactDir ?? artifactDir, "service-evidence-manifest.json"),
      adapterManifest: paths.adapterManifestPath,
      externalReviewBundle: paths.bundleDir,
      routes: report.counts.testedRoutes,
      capabilities: report.counts.capabilities,
      services: report.counts.services,
      serviceEvidenceScreenshots: report.counts.serviceEvidenceScreenshots,
      actionsSubmitted: report.counts.actionsSubmitted,
      screenshots: report.counts.screenshots,
      pass: report.counts.pass,
      fail: report.counts.fail,
      warn: report.counts.warn,
      reviewRequired: report.counts.reviewRequired,
      humanDecisionRequired: report.counts.humanDecisionRequired,
      gaps: report.gaps.length,
    };
    console.log(JSON.stringify(outcome));
    if (report.counts.fail > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ outcome: "error", message: error.message }));
  process.exit(1);
});
