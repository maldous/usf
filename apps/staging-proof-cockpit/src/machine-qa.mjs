import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { connect as netConnect } from "node:net";
import { join } from "node:path";
import { buildData, getProofCockpitManifest, startProofCockpitServer } from "./server.mjs";

const ISSUE_ID = "USF-293";
const ACCEPTANCE_ISSUE_ID = "USF-290";
const PR_NUMBER = process.env.USF_PROOF_COCKPIT_PR ?? "pending-usf-293";
const QA_RUN_VERSION = "proof-cockpit-machine-qa-evidence-v1";
const DEFAULT_ARTIFACT_ROOT = "/tmp/usf-proof-cockpit-machine-qa";
const EXECUTOR = "codex-playwright-machine-qa";
const REPO_ROOT = process.cwd();
const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const MACHINE_QA_ENVIRONMENT_SCOPE = "test";
const SOURCE_TREE_HASH_ALGORITHM = "sha256-git-ls-tree-non-proof-evidence-v1";
const SOURCE_TREE_HASH_EXCLUDED_PREFIXES = Object.freeze([
  "artifacts/proof-cockpit/",
  "evidence/proof-evidence/proof-cockpit/",
  "v2/",
]);
const CHROMIUM_UNSAFE_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101,
  102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 139, 143, 161, 179, 389, 427,
  465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989,
  990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666,
  6667, 6668, 6669, 6697, 10080,
]);
const COMPOSE_PROFILES_FOR_SERVICE_UI = Object.freeze([
  "runtime-providers",
  "operator-tools",
  "assurance",
  "observability",
  "workflow-provider",
  "provider-mocks",
  "public-proof-origin",
  "gateway",
]);
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

const AUTH_POSTURE_VALUES = Object.freeze([
  "auth-required",
  "intentionally anonymous/no-auth",
  "protected by gateway/forward-auth",
  "service-login required",
  "api/cli-only",
  "unsafe-to-capture",
  "unavailable",
]);

const OPENBAO_CREDENTIAL_ROOT = "secret/data/usf-proof-cockpit/screenshot";
const OPENBAO_LOGICAL_ROOT = "openbao://secret/data/usf-proof-cockpit/screenshot";
const OPENBAO_ENDPOINT = process.env.USF_PROOF_COCKPIT_OPENBAO_ADDR ?? "http://127.0.0.1:8200";
const MACHINE_QA_REVIEW_ACTOR = process.env.USF_QA_ACTOR ?? "machine-qa-authenticated-operator";
const MACHINE_QA_REVIEW_SECRET = "machine-qa-synthetic-proof-cockpit-review-secret";
function composeEnvironmentValue(serviceName, key) {
  const content = existsSync(COMPOSE_TARGET) ? readFileSync(COMPOSE_TARGET, "utf8") : "";
  const serviceMatch = content.match(new RegExp(`\\n  ${serviceName}:\\n(?<body>[\\s\\S]*?)(?=\\n  [a-zA-Z0-9_-]+:\\n|\\nvolumes:|$)`));
  const body = serviceMatch?.groups?.body ?? "";
  const environmentMatch = body.match(
    /\n {4}environment:\n(?<environment>[\s\S]*?)(?=\n {4}[a-zA-Z_]+:|\n {4}ports:|\n {4}depends_on:|\n {4}profiles:|\n {4}healthcheck:|\n {2}[a-zA-Z0-9_-]+:|$)/,
  );
  const environment = environmentMatch?.groups?.environment ?? "";
  const line = environment
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${key}:`));
  if (!line) return "";
  return line
    .slice(key.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const OPENBAO_OPERATOR_TOKEN =
  process.env.USF_PROOF_COCKPIT_OPENBAO_TOKEN || composeEnvironmentValue("openbao", "BAO_DEV_ROOT_TOKEN_ID");

const AUTH_POSTURE_OVERRIDES = Object.freeze({
  "staging-proof-cockpit": {
    authPosture: "unsafe-to-capture",
    loginMethod:
      "Staging proof cockpit is an operator-authenticated fixture reached through the edge Caddy reverse proxy per ADR 0015; it is not part of the test-target composed runtime, so the machine run records a redacted screenshot-equivalent instead of a direct authenticated UI capture.",
    configPath:
      "spec/instances/compose-service/service-catalogue.json#staging-proof-cockpit",
    capturePath: "/proof",
    expectedAuthEvidence:
      "Edge operator-authenticated reverse-proxy access recorded as a redacted screenshot-equivalent; the cockpit write guard and CSRF are exercised by proof-cockpit:smoke, not by direct machine capture.",
    firstLoginPasswordRotationRequired: false,
    screenshotEquivalentAllowed: true,
    screenshotEquivalentReason:
      "The staging proof cockpit is a staging-only, edge-authenticated operator fixture that is not started in the test-target composed runtime; a hash-addressed screenshot-equivalent records its service mapping, operator-access posture, source SHA, run ID, and reenactment path without claiming a direct authenticated capture.",
  },
  grafana: {
    authPosture: "service-login required",
    loginMethod: "Grafana local admin login through scoped QA screenshot credential",
    credentialKind: "username-password",
    credentialUsername: "admin",
    credentialComposeServiceName: "grafana",
    credentialComposeSecretKey: "GF_SECURITY_ADMIN_PASSWORD",
    credentialUserField: "username",
    configPath:
      "compose/compose.test.generated.yaml#services.grafana.environment.GF_SECURITY_ADMIN_PASSWORD",
    anonymousAccessEnabled: false,
    anonymousAccessRationale:
      "No GF_AUTH_ANONYMOUS_ENABLED=true setting is present in the generated Compose environment; the operator surface is treated as login-required.",
    capturePath: "/dashboards",
    expectedAuthEvidence: "post-login Grafana page",
    firstLoginPasswordRotationRequired: false,
  },
  keycloak: {
    authPosture: "service-login required",
    loginMethod: "Keycloak admin-console login through scoped QA screenshot credential",
    credentialKind: "username-password",
    credentialUsername: "admin",
    credentialComposeServiceName: "keycloak",
    credentialComposeSecretKey: "KEYCLOAK_ADMIN_PASSWORD",
    credentialUserField: "username",
    configPath:
      "compose/compose.test.generated.yaml#services.keycloak.environment.KEYCLOAK_ADMIN_PASSWORD",
    capturePath: "/admin/master/console/",
    expectedAuthEvidence: "post-login Keycloak admin console",
    firstLoginPasswordRotationRequired: false,
  },
  minio: {
    authPosture: "service-login required",
    loginMethod: "MinIO console login through scoped QA screenshot credential",
    credentialKind: "username-password",
    credentialUsername: "minioadmin",
    credentialComposeServiceName: "minio",
    credentialComposeSecretKey: "MINIO_ROOT_PASSWORD",
    credentialUserField: "accessKey",
    configPath: "compose/compose.test.generated.yaml#services.minio.environment.MINIO_ROOT_PASSWORD",
    capturePortId: "minio-console",
    capturePath: "/",
    expectedAuthEvidence: "post-login MinIO console",
    firstLoginPasswordRotationRequired: false,
  },
  openbao: {
    authPosture: "unsafe-to-capture",
    loginMethod:
      "OpenBao token-authenticated API seed/read/capabilities proof; UI capture is redacted to avoid secret/token exposure",
    credentialKind: "token",
    credentialUsername: "qa-operator-token",
    credentialComposeServiceName: "openbao",
    credentialComposeSecretKey: "BAO_DEV_ROOT_TOKEN_ID",
    credentialUserField: "token",
    configPath: "compose/compose.test.generated.yaml#services.openbao.environment.BAO_DEV_ROOT_TOKEN_ID",
    capturePath: "/ui/",
    expectedAuthEvidence: "OpenBao token lookup and path capabilities proof without secret values",
    firstLoginPasswordRotationRequired: false,
    screenshotEquivalentAllowed: true,
    screenshotEquivalentReason:
      "OpenBao is the credential source. Direct authenticated UI screenshots can expose token or secret metadata, so the machine run records token-authenticated API control evidence and a redacted screenshot-equivalent page.",
  },
  pgadmin: {
    authPosture: "service-login required",
    loginMethod: "pgAdmin login through scoped QA screenshot credential",
    credentialKind: "username-password",
    credentialUsername: "admin@example.com",
    credentialComposeServiceName: "pgadmin",
    credentialComposeSecretKey: "PGADMIN_DEFAULT_PASSWORD",
    credentialUserField: "email",
    configPath:
      "compose/compose.test.generated.yaml#services.pgadmin.environment.PGADMIN_DEFAULT_PASSWORD",
    capturePath: "/browser/",
    expectedAuthEvidence: "post-login pgAdmin browser page",
    firstLoginPasswordRotationRequired: false,
  },
  sonarqube: {
    authPosture: "service-login required",
    loginMethod:
      "SonarQube local admin login with first-login password rotation to a generated scoped QA screenshot credential",
    credentialKind: "username-password-rotation",
    credentialUsername: "admin",
    credentialDefaultSecretRef: "sonarqube-default-first-login-password",
    credentialUserField: "login",
    configPath: "compose/compose.test.generated.yaml#services.sonarqube",
    capturePath: "/projects",
    expectedAuthEvidence: "post-rotation SonarQube projects or system page",
    firstLoginPasswordRotationRequired: true,
  },
  windmill: {
    authPosture: "service-login required",
    loginMethod:
      "Windmill scoped synthetic QA superadmin login is bootstrapped through an OpenBao-referenced superadmin token and captured through a browser session cookie on the local CE workspace selector",
    credentialKind: "token",
    credentialUsername: "qa-proof-cockpit@synthetic.local",
    credentialComposeServiceName: "windmill",
    credentialComposeSecretKey: "SUPERADMIN_SECRET",
    credentialUserField: "token",
    configPath: "compose/compose.test.generated.yaml#services.windmill.environment.SUPERADMIN_SECRET",
    capturePath: "/user/workspaces",
    expectedAuthEvidence: "post-login Windmill workspace selector showing the scoped QA operator session",
    generateScopedPassword: true,
    anonymousAccessRationale:
      "Windmill Community Edition reserves the default admins workspace for superadmins and limits additional workspaces. The proof therefore creates a generated synthetic QA superadmin account for this local screenshot task, stores only the logical OpenBao reference, and captures the authenticated workspace selector without claiming operator-automation readiness.",
    firstLoginPasswordRotationRequired: false,
  },
  alloy: {
    authPosture: "api/cli-only",
    loginMethod:
      "Grafana Alloy exposes a local telemetry endpoint rather than a human operator UI; evidence is captured as a hash-addressed API/CLI-equivalent artifact.",
    configPath: "compose/compose.test.generated.yaml#services.alloy",
    firstLoginPasswordRotationRequired: false,
    screenshotEquivalentAllowed: true,
    screenshotEquivalentReason:
      "Alloy has no authenticated browser UI in the generated Compose target; direct capture is not required for this non-UI collector endpoint.",
  },
  "public-proof-origin": {
    authPosture: "api/cli-only",
    loginMethod:
      "Public proof origin is a route/control artifact, not an operator UI in the generated local test Compose target.",
    configPath: "spec/instances/compose-service/service-catalogue.json#public-proof-origin",
    firstLoginPasswordRotationRequired: false,
    screenshotEquivalentAllowed: true,
    screenshotEquivalentReason:
      "The proof origin is not part of the local test Compose target used for service UI screenshots; machine QA records source-linked API/route-equivalent evidence and preserves the no-staging-readiness boundary.",
  },
  "webhook-sink": {
    authPosture: "unsafe-to-capture",
    loginMethod:
      "Webhook sink echo evidence is captured as a redacted screenshot-equivalent because direct echo pages can expose request headers or token-like material.",
    configPath: "compose/compose.test.generated.yaml#services.webhook-sink",
    firstLoginPasswordRotationRequired: false,
    screenshotEquivalentAllowed: true,
    screenshotEquivalentReason:
      "The webhook sink is an echo/API endpoint with no operator UI. Direct screenshots are unsafe because echoed request material can resemble or contain credentials; the approved evidence is a redacted API-equivalent artifact.",
  },
  alertmanager: {
    authPosture: "intentionally anonymous/no-auth",
    loginMethod:
      "No service login is configured in generated local Compose; capture is bounded to loopback-only synthetic alert evidence",
    configPath: "compose/compose.test.generated.yaml#services.alertmanager",
    anonymousAccessEnabled: true,
    anonymousAccessRationale:
      "The generated local test Compose row exposes Alertmanager on 127.0.0.1 with no basic-auth, SSO, or forward-auth configuration. This is accepted only for local synthetic proof evidence and does not make a staging or production access-control claim.",
    capturePath: "/#/alerts",
    riskControlMapping: "access-control local-loopback boundary; audit/alert evidence only; no ISO certification claim",
    firstLoginPasswordRotationRequired: false,
  },
  mailpit: {
    authPosture: "intentionally anonymous/no-auth",
    loginMethod:
      "No service login is configured in generated local Compose; capture is bounded to loopback-only synthetic mailbox evidence",
    configPath: "compose/compose.test.generated.yaml#services.mailpit",
    anonymousAccessEnabled: true,
    anonymousAccessRationale:
      "Mailpit local UI is intentionally captured only for synthetic test mail on 127.0.0.1. No real tenant mailbox data may appear and no staging or production mailbox access claim is made.",
    capturePath: "/",
    riskControlMapping: "synthetic-data boundary; local-loopback only; no real mailbox evidence",
    firstLoginPasswordRotationRequired: false,
  },
  "temporal-ui": {
    authPosture: "intentionally anonymous/no-auth",
    loginMethod:
      "No service login is configured in generated local Compose; capture is bounded to loopback-only synthetic workflow evidence",
    configPath: "compose/compose.test.generated.yaml#services.temporal-ui",
    anonymousAccessEnabled: true,
    anonymousAccessRationale:
      "The generated Temporal UI service has no auth environment or gateway configuration. This anonymous local capture is accepted only for synthetic workflow inspection evidence and does not claim staging, production, or live-provider readiness.",
    capturePath: "/",
    riskControlMapping: "workflow metadata local-loopback boundary; synthetic data only",
    firstLoginPasswordRotationRequired: false,
  },
  caddy: {
    authPosture: "intentionally anonymous/no-auth",
    loginMethod:
      "Generated external-caddy service has no operator login or forward-auth configuration in local Compose; capture is bounded to gateway response evidence",
    configPath: "compose/compose.test.generated.yaml#services.external-caddy",
    anonymousAccessEnabled: true,
    anonymousAccessRationale:
      "The generated Caddy gateway profile is local loopback-only and has no Caddyfile/forward-auth configuration in this proof scope. It is evidence of local gateway container response only, not a protected staging edge claim.",
    capturePath: "/",
    riskControlMapping: "gateway local-loopback evidence only; no public route or staging readiness claim",
    firstLoginPasswordRotationRequired: false,
  },
  sentry: {
    authPosture: "api/cli-only",
    loginMethod:
      "No safe local HTTP UI candidate exists in the service catalogue; evidence remains API/CLI-equivalent until a bounded UI service exists.",
    configPath: "spec/instances/compose-service/service-catalogue.json#sentry",
    firstLoginPasswordRotationRequired: false,
    screenshotEquivalentAllowed: true,
    screenshotEquivalentReason:
      "The service catalogue has no safe HTTP UI candidate for Sentry in this repository scope.",
  },
});

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

function sourceTreeHash() {
  try {
    const output = execFileSync("git", ["ls-tree", "-r", "-z", "--full-tree", "HEAD"], { encoding: "utf8" });
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
  } catch {
    return "unavailable";
  }
}

function branchName() {
  return gitValue(["branch", "--show-current"]);
}

function contentHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function artifactHashForPath(path) {
  return path && existsSync(path) ? contentHash(readFileSync(path)) : "";
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
  const treeHash = sourceTreeHash();
  return {
    qaRun: runId,
    qaRunVersion: QA_RUN_VERSION,
    issueId: ISSUE_ID,
    prNumber: PR_NUMBER,
    sourceGitSha: sha,
    sourceSha: sha,
    sourceTreeHash: treeHash,
    sourceTreeHashAlgorithm: SOURCE_TREE_HASH_ALGORITHM,
    sourceTreeHashExcludedPrefixes: [...SOURCE_TREE_HASH_EXCLUDED_PREFIXES],
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
    redactionStatus: "redaction-status-recorded-in-machine-qa",
    syntheticDataConfirmation: "Synthetic-data posture is recorded in the machine QA manifest.",
    humanReviewStatus: "human-review-required",
    evidenceClass: "screenshot",
    authPosture: "not-applicable",
    loginMethod: "Not applicable - route screenshot",
    credentialSourceRef: "Not applicable - no credential value recorded",
    humanReenactmentInstruction:
      "Open the related proof route or service evidence, verify the screenshot hash, source SHA, run ID, redaction posture, and synthetic-data boundary, then record accept, reject, annotate, retest, corrective-action, or note.",
    finalAcceptanceBlocked: false,
    nextSafeAction:
      "Human reviewer samples the screenshot, related evidence, chain of custody, and non-claim boundary before recording a decision.",
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

function authPostureForService(service) {
  const override = AUTH_POSTURE_OVERRIDES[service.serviceId] ?? {};
  if (override.authPosture) {
    if (!AUTH_POSTURE_VALUES.includes(override.authPosture)) {
      throw new Error(`unsupported-auth-posture-${service.serviceId}-${override.authPosture}`);
    }
    return override;
  }
  const hasHttpUi = (service.ports ?? []).some((port) =>
    ["http", "https"].includes(String(port.appProtocol ?? "").toLowerCase()),
  );
  const catalogueAuthRequired = (service.ports ?? []).some((port) => port.authRequired) || service.adminSurface?.present || service.operatorSurface?.present;
  if (!hasHttpUi) {
    return {
      authPosture: "api/cli-only",
      loginMethod: "No HTTP/HTTPS UI candidate exists in the service catalogue.",
      configPath: "spec/instances/compose-service/service-catalogue.json",
      firstLoginPasswordRotationRequired: false,
      screenshotEquivalentAllowed: true,
      screenshotEquivalentReason:
        "The service catalogue has no safe HTTP or HTTPS UI/API candidate, so the machine run records CLI-equivalent catalogue evidence.",
    };
  }
  if (catalogueAuthRequired) {
    return {
      authPosture: "auth-required",
      loginMethod: "Service catalogue marks this UI as access-scoped; a scoped QA credential is required before final acceptance.",
      configPath: "spec/instances/compose-service/service-catalogue.json",
      firstLoginPasswordRotationRequired: false,
    };
  }
  return {
    authPosture: "intentionally anonymous/no-auth",
    loginMethod:
      "No service login is configured or required by the repository service catalogue for this local synthetic proof candidate.",
    configPath: "spec/instances/compose-service/service-catalogue.json",
    anonymousAccessEnabled: true,
    anonymousAccessRationale:
      "Local loopback-only proof surface with no configured auth requirement; machine QA still records synthetic-data and non-claim boundaries.",
    firstLoginPasswordRotationRequired: false,
  };
}

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
  const posture = authPostureForService(service);
  const candidates = (service.ports ?? [])
    .filter((port) => isHostPublishedPortForMachineQa(port) && ["http", "https"].includes(String(port.appProtocol ?? "").toLowerCase()))
    .map((port) => {
      const scheme = String(port.appProtocol).toLowerCase() === "https" ? "https" : "http";
      const host = !port.hostIp || port.hostIp === "0.0.0.0" ? "127.0.0.1" : port.hostIp;
      const path = port.portId === posture.capturePortId ? posture.capturePath : (SERVICE_DEFAULT_PATHS[service.serviceId] ?? posture.capturePath ?? "/");
      return {
        url: `${scheme}://${host}:${port.publishedPort}${path}`,
        portId: port.portId,
        authRequired: Boolean(port.authRequired || service.adminSurface?.present || service.operatorSurface?.present),
        accessModel: port.accessModel ?? "missing",
        exposureClass: port.exposureClass ?? "missing",
        appProtocol: port.appProtocol,
      };
    });
  if (posture.capturePortId) {
    candidates.sort((left, right) => (left.portId === posture.capturePortId ? -1 : right.portId === posture.capturePortId ? 1 : 0));
  } else if (["auth-required", "service-login required"].includes(posture.authPosture)) {
    candidates.sort((left, right) => Number(right.authRequired) - Number(left.authRequired));
  }
  return candidates;
}

function portAppliesToMachineQaEnvironment(port) {
  const scopes = Array.isArray(port.environmentScopes) ? port.environmentScopes.map((scope) => String(scope)) : [];
  return !scopes.length || scopes.includes(MACHINE_QA_ENVIRONMENT_SCOPE);
}

function isHostPublishedPortForMachineQa(port) {
  return Boolean(port?.publishedPort) && portAppliesToMachineQaEnvironment(port);
}

function serviceEvidenceScreenshotId(serviceId) {
  return `screenshot-service-${serviceId}`;
}

function serviceEvidenceScreenshotManifestRef(serviceId) {
  return `proof-cockpit-screenshot-manifest.json#${serviceEvidenceScreenshotId(serviceId)}`;
}

function serviceEvidenceArtifactPath(report, serviceId) {
  return join(report.artifactDir, "service-evidence", `${slugifyRoute(serviceId)}.json`);
}

function catalogueAuthExpectation(service) {
  const hasHttpUi = (service.ports ?? []).some((port) =>
    ["http", "https"].includes(String(port.appProtocol ?? "").toLowerCase()),
  );
  const catalogueAuthRequired =
    (service.ports ?? []).some((port) => port.authRequired) ||
    service.adminSurface?.present ||
    service.operatorSurface?.present ||
    /auth-required|authenticated/i.test(`${service.authRequirement ?? ""} ${service.accessPosture ?? ""}`);
  if (!hasHttpUi) {
    return "api/cli-only";
  }
  return catalogueAuthRequired ? "auth-required" : "intentionally anonymous/no-auth";
}

function authPostureMismatchForService(service, actualAuthPosture) {
  const expected = catalogueAuthExpectation(service);
  const authSatisfyingPostures = new Set([
    "auth-required",
    "service-login required",
    "protected by gateway/forward-auth",
    "unsafe-to-capture",
  ]);
  const mismatch =
    (expected === "api/cli-only" && actualAuthPosture !== "api/cli-only") ||
    (expected === "auth-required" && !authSatisfyingPostures.has(actualAuthPosture)) ||
    (expected === "intentionally anonymous/no-auth" && actualAuthPosture !== "intentionally anonymous/no-auth");
  const catalogueFields = [
    `catalogueAuthRequirement=${service.authRequirement ?? "missing"}`,
    `catalogueAccessPosture=${service.accessPosture ?? "missing"}`,
    `catalogueExpectedPosture=${expected}`,
    `actualAuthPosture=${actualAuthPosture}`,
  ].join("; ");
  return {
    authPostureMismatch: mismatch,
    authPostureMismatchReason: mismatch
      ? `Catalogue posture and observed/declared machine QA posture differ: ${catalogueFields}. Human reviewer must inspect the rationale and non-claim boundary.`
      : `Catalogue posture and observed/declared machine QA posture are aligned: ${catalogueFields}.`,
    catalogueAuthExpectation: expected,
  };
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

// Approved local secret placeholders sourced from
// spec/instances/compose-service/service-catalogue.json#approvedLocalSecretPlaceholders.
// These are dev-only compose placeholder values; if any of them surface verbatim in a
// live service response body it means a compose env value leaked into the rendered UI,
// so machine QA must fail closed. This is detection only and never prints a real secret.
const APPROVED_LOCAL_SECRET_PLACEHOLDER_VALUES = [
  "admin_password",
  "dev-root-token",
  "foundation_app_password",
  "keycloak_password",
  "minio_password",
  "sonar_password",
  "temporal_password",
  "windmill_password",
  "usf-local-windmill-superadmin-placeholder",
];

function serviceSensitiveFinding(text) {
  const patterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bLINEAR_API_KEY\b/,
    /\bNETLIFY_AUTH_TOKEN\b/,
    /\bCLOUDFLARE[_A-Z]*TOKEN\b/,
    /\bAWS_SECRET_ACCESS_KEY\b/,
    // Known *_password families surfacing as a bare identifier in the response body.
    /\b(?:admin|foundation_app|keycloak|minio|temporal|sonar|windmill)_password\b/i,
    // Any local compose placeholder value surfacing verbatim in the response body
    // means a dev compose env value leaked into the rendered UI.
    new RegExp(
      `\\b(?:${APPROVED_LOCAL_SECRET_PLACEHOLDER_VALUES.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
    ),
    // KEY=VALUE / KEY: VALUE raw secret assignment with a literal value. Detection is
    // keyed on secret-ish key names plus a substantial literal value so that ordinary
    // login-form labels (a bare "Password:") do not trip the scan.
    /\b(?:[a-z0-9_]*(?:token|password|secret|api_?key)[a-z0-9_]*|client_secret|private_key|aws_secret_access_key)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}["']?/i,
  ];
  const match = patterns.find((pattern) => pattern.test(text));
  return match ? match.source : "";
}

const TARGET_OBSERVATION_EXCERPT_LIMIT = 500;

// Bound and redact a raw target-system response/output excerpt before it is stored on
// an evidence record. This reuses the machine QA secret-scan path (serviceSensitiveFinding)
// so that no secret, token, private key, or literal KEY=VALUE assignment can leak into the
// persisted targetObservation.outputExcerpt. It never prints a real secret: on any hit the
// offending span is replaced with a bounded [REDACTED-...] marker.
function redactObservationExcerpt(rawText) {
  const text = typeof rawText === "string" ? rawText : String(rawText ?? "");
  // Collapse whitespace so excerpts stay compact and human-readable in the artifact.
  let excerpt = text.replace(/\s+/g, " ").trim().slice(0, TARGET_OBSERVATION_EXCERPT_LIMIT);
  // Proactively mask KEY=VALUE / KEY: VALUE secret-ish assignments with a substantial
  // literal value; this mirrors the validator SECRET_ASSIGNMENT scan so a probed body
  // cannot surface a compose env value verbatim.
  excerpt = excerpt.replace(
    /\b([a-z0-9_]*(?:token|password|secret|api_?key)[a-z0-9_]*|client_secret|private_key|aws_secret_access_key)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}["']?/gi,
    "$1=[REDACTED-SECRET-ASSIGNMENT]",
  );
  excerpt = excerpt.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, "[REDACTED-PRIVATE-KEY-BLOCK]");
  // Final fail-closed check against the shared detector. If anything still matches, drop the
  // body entirely rather than risk a leak; the observation still records the real attempt.
  const residual = serviceSensitiveFinding(excerpt);
  if (residual) {
    return {
      outputExcerpt: "[REDACTED-SENSITIVE-CONTENT-DETECTED]",
      redacted: true,
      redactionFinding: residual,
    };
  }
  const redacted = excerpt !== text.slice(0, TARGET_OBSERVATION_EXCERPT_LIMIT).replace(/\s+/g, " ").trim();
  return { outputExcerpt: excerpt, redacted, redactionFinding: "" };
}

// Perform a genuine live TCP connect to a host:port and report the real outcome. This is a
// real runtime observation of the target service socket, not catalogue metadata.
function tcpConnectProbe(host, port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = netConnect({ host, port });
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve({ ...result, latencyMs: Date.now() - startedAt });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ status: "tcp-connect-ok", reason: "" }));
    socket.once("timeout", () => finish({ status: "tcp-connect-timeout", reason: `no TCP connect within ${timeoutMs}ms` }));
    socket.once("error", (error) => finish({ status: "tcp-connect-error", reason: error.message }));
  });
}

// Capture a REAL target-system observation from the composed service during the run:
//   - HTTP/HTTPS ports  -> live HTTP GET against the service, recording status + redacted body
//   - other ports (tcp/postgresql/redis/...) -> live TCP connect check
//   - no host-published port -> recorded as a real "no reachable target" attempt
// The returned object is the structured targetObservation stored on every service-evidence
// record. It always reflects a genuine attempt against the target, never fabricated data, and
// its outputExcerpt is bounded and routed through the redaction path above.
async function probeTargetObservation(service, report) {
  const observedAt = new Date().toISOString();
  const runId = report?.qaRun ?? "";
  const httpCandidates = serviceUiCandidates(service);
  if (httpCandidates.length) {
    const candidate = httpCandidates[0];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let response;
      let bodyText = "";
      try {
        response = await fetch(candidate.url, { method: "GET", redirect: "manual", signal: controller.signal });
        try {
          bodyText = await response.text();
        } catch {
          bodyText = "";
        }
      } finally {
        clearTimeout(timer);
      }
      const { outputExcerpt, redacted, redactionFinding } = redactObservationExcerpt(bodyText);
      return {
        method: "http-get",
        sourceUrlOrCommand: candidate.url,
        status: `http-${response.status}`,
        reachable: true,
        outputExcerpt,
        outputRedacted: redacted,
        redactionFinding,
        observedAt,
        runId,
      };
    } catch (error) {
      return {
        method: "http-get",
        sourceUrlOrCommand: candidate.url,
        status: "http-get-failed",
        reachable: false,
        reason: error.name === "AbortError" ? "http-get-timeout-8000ms" : error.message,
        outputExcerpt: "",
        outputRedacted: false,
        redactionFinding: "",
        observedAt,
        runId,
      };
    }
  }
  // No HTTP/HTTPS UI candidate: probe the first host-published port for the selected
  // machine-QA environment via a real TCP connect.
  const publishedPort = (service.ports ?? []).find((port) => isHostPublishedPortForMachineQa(port));
  if (publishedPort) {
    const host = !publishedPort.hostIp || publishedPort.hostIp === "0.0.0.0" ? "127.0.0.1" : publishedPort.hostIp;
    const target = `tcp://${host}:${publishedPort.publishedPort} (${publishedPort.appProtocol ?? publishedPort.protocol ?? "tcp"})`;
    const result = await tcpConnectProbe(host, Number(publishedPort.publishedPort));
    return {
      method: "tcp-connect",
      sourceUrlOrCommand: target,
      status: result.status,
      reachable: result.status === "tcp-connect-ok",
      reason: result.reason,
      latencyMs: result.latencyMs,
      outputExcerpt: `TCP connect to ${host}:${publishedPort.publishedPort} => ${result.status}`,
      outputRedacted: false,
      redactionFinding: "",
      observedAt,
      runId,
    };
  }
  return {
    method: "none",
    sourceUrlOrCommand: `service:${service.serviceId}`,
    status: "no-host-published-port",
    reachable: false,
    reason: `Service catalogue exposes no host-published port for the ${MACHINE_QA_ENVIRONMENT_SCOPE} machine QA environment to probe from the host.`,
    outputExcerpt: "",
    outputRedacted: false,
    redactionFinding: "",
    observedAt,
    runId,
  };
}

function openBaoLogicalRef(serviceId) {
  return `${OPENBAO_LOGICAL_ROOT}/${serviceId}/credential`;
}

function openBaoApiPath(serviceId) {
  return `${OPENBAO_CREDENTIAL_ROOT}/${serviceId}/credential`;
}

function redactedCredentialSummary(posture, serviceId) {
  if (!posture.credentialKind) {
    return {
      credentialRequired: false,
      credentialSourceRef: "",
      credentialScope: "",
      credentialValuePersisted: false,
    };
  }
  return {
    credentialRequired: true,
    credentialSourceRef: openBaoLogicalRef(serviceId),
    credentialScope: `qa-screenshot-${serviceId}-synthetic-loopback-only`,
    credentialValuePersisted: false,
  };
}

async function openBaoRequest(path, options = {}) {
  if (!OPENBAO_OPERATOR_TOKEN) {
    throw new Error("openbao-operator-token-unavailable");
  }
  const response = await fetch(`${OPENBAO_ENDPOINT}/v1/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "X-Vault-Token": OPENBAO_OPERATOR_TOKEN,
      "X-Bao-Token": OPENBAO_OPERATOR_TOKEN,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { parseStatus: "non-json-response", textHash: contentHash(text) };
    }
  }
  if (!response.ok) {
    throw new Error(`openbao-request-failed-${response.status}`);
  }
  return payload;
}

async function waitForOpenBaoReady(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not-started";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${OPENBAO_ENDPOINT}/v1/sys/health`);
      if ([200, 429, 472, 473].includes(response.status)) {
        return true;
      }
      lastError = `status-${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`openbao-not-ready:${lastError}`);
}

async function writeAndReadOpenBaoCredential(report, service, posture) {
  if (!posture.credentialKind) {
    return {
      credential: null,
      evidence: {
        credentialRequired: false,
        credentialSourceRef: "",
        openBaoLogicalSecretRef: "",
        openBaoPath: "",
        openBaoRolePersona: "",
        openBaoAccessTimestamp: "",
        openBaoAuditEvidence: "not-applicable-no-service-credential-required",
        credentialScope: "",
        credentialValuePersisted: false,
      },
    };
  }
  await waitForOpenBaoReady();
  const generatedRotationPassword =
    posture.firstLoginPasswordRotationRequired || posture.generateScopedPassword ? `usf-qa-${randomBytes(18).toString("base64url")}` : "";
  const composeSecretValue = posture.credentialComposeServiceName && posture.credentialComposeSecretKey
    ? composeEnvironmentValue(posture.credentialComposeServiceName, posture.credentialComposeSecretKey)
    : "";
  const bootstrapSecretValue =
    composeSecretValue || (posture.credentialDefaultSecretRef === "sonarqube-default-first-login-password" ? "admin" : "");
  if (!bootstrapSecretValue) {
    throw new Error(`credential-source-unavailable:${service.serviceId}:${posture.credentialComposeSecretKey ?? posture.credentialDefaultSecretRef ?? "missing"}`);
  }
  const secretPath = openBaoApiPath(service.serviceId);
  const logicalRef = openBaoLogicalRef(service.serviceId);
  const credential = {
    kind: posture.credentialKind,
    username: posture.credentialUsername ?? "",
    password: posture.credentialKind === "token" ? "" : bootstrapSecretValue,
    token: posture.credentialKind === "token" ? bootstrapSecretValue : "",
    rotatedPassword: generatedRotationPassword,
  };
  await openBaoRequest(secretPath, {
    method: "POST",
    body: JSON.stringify({
      data: {
        username: credential.username,
        password: credential.password,
        token: credential.token,
        rotatedPassword: credential.rotatedPassword,
        serviceId: service.serviceId,
        scope: `qa-screenshot-${service.serviceId}-synthetic-loopback-only`,
        sourceSha: report.sourceSha,
        qaRun: report.qaRun,
      },
    }),
  });
  const capabilities = await openBaoRequest("sys/capabilities-self", {
    method: "POST",
    body: JSON.stringify({ paths: [secretPath] }),
  });
  const tokenLookup = await openBaoRequest("auth/token/lookup-self", { method: "GET" });
  const readback = await openBaoRequest(secretPath, { method: "GET" });
  const values = readback?.data?.data ?? {};
  return {
    credential: {
      username: values.username ?? credential.username,
      password: values.password ?? credential.password,
      token: values.token ?? credential.token,
      rotatedPassword: values.rotatedPassword ?? credential.rotatedPassword,
    },
    evidence: {
      credentialRequired: true,
      credentialSourceRef: logicalRef,
      openBaoLogicalSecretRef: logicalRef,
      openBaoPath: `${OPENBAO_CREDENTIAL_ROOT}/${service.serviceId}/credential`,
      openBaoRolePersona: "qa-operator",
      openBaoAccessTimestamp: new Date().toISOString(),
      openBaoServiceAccessed: service.serviceId,
      openBaoAuditEvidence:
        "token lookup and sys/capabilities-self succeeded for the scoped screenshot credential path; secret values are omitted from artifacts",
      openBaoCapabilitiesHash: contentHash(JSON.stringify(capabilities?.capabilities ?? capabilities)),
      openBaoTokenPolicyHash: contentHash(JSON.stringify(tokenLookup?.data?.policies ?? [])),
      credentialScope: `qa-screenshot-${service.serviceId}-synthetic-loopback-only`,
      credentialValuePersisted: false,
    },
  };
}

function dockerComposeArgs(extraArgs) {
  return [
    "compose",
    "-f",
    COMPOSE_TARGET,
    ...COMPOSE_PROFILES_FOR_SERVICE_UI.flatMap((profile) => ["--profile", profile]),
    ...extraArgs,
  ];
}

function runDockerCompose(extraArgs, timeoutMs = 300000) {
  return execFileSync("docker", dockerComposeArgs(extraArgs), {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function startComposeUiEvidenceRuntime(report) {
  try {
    runDockerCompose(["up", "-d"], 600000);
    report.composeServiceEvidence.composeRuntime = {
      composeTarget: COMPOSE_TARGET,
      profiles: [...COMPOSE_PROFILES_FOR_SERVICE_UI],
      startedByMachineQa: true,
      startedAt: new Date().toISOString(),
    };
    return true;
  } catch (error) {
    report.composeServiceEvidence.composeRuntime = {
      composeTarget: COMPOSE_TARGET,
      profiles: [...COMPOSE_PROFILES_FOR_SERVICE_UI],
      startedByMachineQa: false,
      startError: error.message,
      startedAt: new Date().toISOString(),
    };
    addCheck(
      report,
      "fail",
      "compose-service-evidence",
      COMPOSE_TARGET,
      "Failed to start generated Compose target for authenticated service UI capture.",
      "missing-service",
    );
    return false;
  }
}

function stopComposeUiEvidenceRuntime(report) {
  try {
    runDockerCompose(["down", "--remove-orphans", "-v"], 180000);
    report.composeServiceEvidence.composeRuntime = {
      ...(report.composeServiceEvidence.composeRuntime ?? {}),
      stoppedByMachineQa: true,
      stoppedAt: new Date().toISOString(),
    };
  } catch (error) {
    report.composeServiceEvidence.composeRuntime = {
      ...(report.composeServiceEvidence.composeRuntime ?? {}),
      stoppedByMachineQa: false,
      stopError: error.message,
      stoppedAt: new Date().toISOString(),
    };
  }
}

async function gotoWithRetry(page, url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not-started";
  while (Date.now() < deadline) {
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      const status = response?.status() ?? 0;
      if (status > 0 && status < 500) {
        return { response, status };
      }
      lastError = `http-${status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`service-ui-not-ready:${lastError}`);
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function startChromiumSafeProofCockpitServer(options) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const server = await startProofCockpitServer(options);
    const address = server.address();
    if (!address || typeof address === "string") {
      await closeServer(server);
      throw new Error("proof-cockpit-machine-qa-address-unavailable");
    }
    if (!CHROMIUM_UNSAFE_PORTS.has(address.port)) {
      return server;
    }
    await closeServer(server);
  }
  throw new Error("proof-cockpit-machine-qa-safe-port-unavailable");
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: "visible", timeout: 5000 });
      await locator.fill(value, { timeout: 3000 });
      return true;
    } catch {
      // Try the next service-specific selector.
    }
  }
  return false;
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: "visible", timeout: 5000 });
      await locator.click({ timeout: 5000 });
      return true;
    } catch {
      // Try the next service-specific selector.
    }
  }
  return false;
}

async function visibleBodyText(page) {
  return page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
}

async function serviceLoginSucceeded(page, serviceId) {
  const text = await visibleBodyText(page);
  const url = page.url();
  if (serviceId === "sonarqube") {
    return !/log in to sonarqube|authentication failed|invalid/i.test(text) && !/sessions\/new/i.test(url);
  }
  if (serviceId === "grafana") {
    return !/log in|email or username|password/i.test(text) || /dashboards|home|welcome/i.test(text);
  }
  if (serviceId === "keycloak") {
    return !/sign in|username or email|invalid username or password/i.test(text);
  }
  if (serviceId === "minio") {
    return !/access key|secret key|login/i.test(text) || /object browser|buckets|identity/i.test(text);
  }
  if (serviceId === "pgadmin") {
    return !/login|email address/i.test(text) || /browser|servers|object explorer/i.test(text);
  }
  if (serviceId === "windmill") {
    return /\/user\/workspaces/i.test(url) && /logged in as|workspaces|list all workspaces/i.test(text) && !/sign in|log in|email.*password|invalid credentials|404 not found/i.test(text);
  }
  return true;
}

async function maybeClickVisibleText(page, patterns) {
  for (const pattern of patterns) {
    try {
      const locator = page.getByText(pattern, { exact: false }).first();
      if ((await locator.count()) > 0) {
        await locator.click({ timeout: 2500 });
        return true;
      }
    } catch {
      // Optional post-login step was not present.
    }
  }
  return false;
}

function windmillApiErrorStatus(error) {
  if (typeof error === "object" && error !== null && "status" in error) {
    return Number(error.status);
  }
  return 0;
}

function windmillAlreadyExists(error) {
  const status = windmillApiErrorStatus(error);
  if (status === 409) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return status === 400 && /already|exists/i.test(message);
}

async function ignoreWindmillAlreadyExists(promise) {
  try {
    return await promise;
  } catch (error) {
    if (windmillAlreadyExists(error)) return undefined;
    throw error;
  }
}

async function performWindmillBrowserLogin(page, posture, credential) {
  if (!credential?.token || !credential?.rotatedPassword || !credential?.username) {
    throw new Error("windmill-scoped-credential-unavailable");
  }
  const baseOrigin = new URL(page.url()).origin;
  try {
    const { UserService, setClient } = await import("windmill-client");
    setClient(credential.token, baseOrigin);
    const whoami = await UserService.globalWhoami();
    if (whoami?.super_admin !== true) {
      throw new Error("windmill-superadmin-boundary-not-active");
    }
    await ignoreWindmillAlreadyExists(
      UserService.createUserGlobally({
        requestBody: {
          email: credential.username,
          password: credential.rotatedPassword,
          super_admin: true,
          name: "USF QA Proof Cockpit",
          company: "Synthetic Proof",
          skip_email: true,
        },
      }),
    );
    await UserService.setPasswordForUser({
      user: credential.username,
      requestBody: { password: credential.rotatedPassword },
    });
    await UserService.setLoginTypeForUser({
      user: credential.username,
      requestBody: { login_type: "password" },
    });
    const loginResponse = await fetch(`${baseOrigin}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: credential.username, password: credential.rotatedPassword }),
    });
    if (!loginResponse.ok) {
      throw new Error(`windmill-scoped-login-failed-${loginResponse.status}`);
    }
    const loginToken = (await loginResponse.text()).trim().replace(/^"|"$/g, "");
    if (loginToken.length < 24) {
      throw new Error("windmill-scoped-login-token-missing");
    }
    await page.context().addCookies([
      {
        name: "token",
        value: loginToken,
        url: baseOrigin,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    await page.goto(`${baseOrigin}${posture.capturePath ?? "/user/workspaces"}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    return {
      loggedIn: await serviceLoginSucceeded(page, "windmill"),
      rotationRequired: false,
      rotationCompleted: false,
      scopedSyntheticUserCreated: true,
      apiAuthenticatedOnly: false,
    };
  } catch (error) {
    const status = windmillApiErrorStatus(error);
    throw new Error(status ? `windmill-browser-login-failed-${status}` : "windmill-browser-login-failed", { cause: error });
  }
}

async function performServiceLogin(page, service, posture, credential) {
  if (!credential || posture.authPosture === "intentionally anonymous/no-auth") {
    return { loggedIn: posture.authPosture === "intentionally anonymous/no-auth", rotationRequired: false, rotationCompleted: false };
  }
  if (service.serviceId === "openbao") {
    return { loggedIn: true, rotationRequired: false, rotationCompleted: false, apiAuthenticatedOnly: true };
  }
  if (service.serviceId === "windmill") {
    return performWindmillBrowserLogin(page, posture, credential);
  }
  if (service.serviceId === "keycloak") {
    const filled = (await fillFirstVisible(page, ["#username", "input[name='username']", "input[name='login']"], credential.username)) &&
      (await fillFirstVisible(page, ["#password", "input[name='password']", "input[type='password']"], credential.password));
    const clicked = await clickFirstVisible(page, ["#kc-login", "button[type='submit']", "input[type='submit']"]);
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    return { loggedIn: filled && clicked && (await serviceLoginSucceeded(page, service.serviceId)), rotationRequired: false, rotationCompleted: false };
  }
  if (service.serviceId === "minio") {
    const filled = (await fillFirstVisible(page, ["input[name='accessKey']", "input#accessKey", "input[type='text']"], credential.username)) &&
      (await fillFirstVisible(page, ["input[name='secretKey']", "input#secretKey", "input[type='password']"], credential.password));
    const clicked = await clickFirstVisible(page, ["button[type='submit']", "button:has-text('Login')", "button:has-text('Sign in')"]);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    return { loggedIn: filled && clicked && (await serviceLoginSucceeded(page, service.serviceId)), rotationRequired: false, rotationCompleted: false };
  }
  if (service.serviceId === "grafana") {
    const filled = (await fillFirstVisible(page, ["input[name='user']", "input[aria-label='Username']", "input[type='text']"], credential.username)) &&
      (await fillFirstVisible(page, ["input[name='password']", "input[aria-label='Password']", "input[type='password']"], credential.password));
    const clicked = await clickFirstVisible(page, ["button[type='submit']", "button:has-text('Log in')"]);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
    await maybeClickVisibleText(page, ["Skip", "Skip for now"]);
    return { loggedIn: filled && clicked && (await serviceLoginSucceeded(page, service.serviceId)), rotationRequired: false, rotationCompleted: false };
  }
  if (service.serviceId === "pgadmin") {
    const filled = (await fillFirstVisible(page, ["input[name='email']", "input[type='email']", "#email"], credential.username)) &&
      (await fillFirstVisible(page, ["input[name='password']", "input[type='password']", "#password"], credential.password));
    const clicked = await clickFirstVisible(page, ["button[type='submit']", "input[type='submit']", "button:has-text('Login')"]);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    return { loggedIn: filled && clicked && (await serviceLoginSucceeded(page, service.serviceId)), rotationRequired: false, rotationCompleted: false };
  }
  if (service.serviceId === "sonarqube") {
    const filled = (await fillFirstVisible(page, ["input[name='login']", "#login", "input[type='text']"], credential.username)) &&
      (await fillFirstVisible(page, ["input[name='password']", "#password", "input[type='password']"], credential.password));
    const clicked = await clickFirstVisible(page, ["button[type='submit']", "button:has-text('Log in')", "button:has-text('Login')"]);
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => undefined);
    await page.waitForTimeout(3000);
    const passwordInputs = await page.locator("input[type='password']").count();
    let rotationCompleted = false;
    if (passwordInputs >= 2 && credential.rotatedPassword) {
      await fillFirstVisible(page, ["input[name='oldPassword']", "input[name='previousPassword']", "input[type='password']"], credential.password);
      const inputs = page.locator("input[type='password']");
      for (let index = 1; index < passwordInputs; index += 1) {
        await inputs.nth(index).fill(credential.rotatedPassword, { timeout: 3000 }).catch(() => undefined);
      }
      await clickFirstVisible(page, ["button[type='submit']", "button:has-text('Change')", "button:has-text('Save')"]);
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => undefined);
      await page.waitForTimeout(3000);
      rotationCompleted = await serviceLoginSucceeded(page, service.serviceId);
    }
    return { loggedIn: filled && clicked && (await serviceLoginSucceeded(page, service.serviceId)), rotationRequired: passwordInputs >= 2, rotationCompleted };
  }
  return { loggedIn: false, rotationRequired: Boolean(posture.firstLoginPasswordRotationRequired), rotationCompleted: false };
}

function writeServiceEvidenceArtifact(report, evidence) {
  ensureDir(join(report.artifactDir, "service-evidence"));
  const filePath = serviceEvidenceArtifactPath(report, evidence.serviceId);
  evidence.apiCliArtifactPath ||= filePath;
  evidence.artifactPath ||= filePath;
  evidence.runId ||= report.qaRun;
  evidence.sourceSha ||= report.sourceSha;
  evidence.capturedAt ||= evidence.timestamp;
  // Every service-evidence record MUST carry the current run's runId on its structured
  // target observation as well (USF-300 per-record runId requirement).
  if (evidence.targetObservation && !evidence.targetObservation.runId) {
    evidence.targetObservation.runId = report.qaRun;
  }
  evidence.screenshotId ||= serviceEvidenceScreenshotId(evidence.serviceId);
  evidence.screenshotManifestRef ||= serviceEvidenceScreenshotManifestRef(evidence.serviceId);
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
    runId: evidence.runId,
    timestamp: evidence.timestamp,
    capturedAt: evidence.capturedAt,
    sourceSha: evidence.sourceSha,
    sourceGitSha: evidence.sourceGitSha,
    deploymentEnvironment: evidence.deploymentEnvironment,
    correlationId: evidence.correlationId,
    traceId: evidence.traceId,
    screenshotId: evidence.screenshotId,
    screenshotManifestRef: evidence.screenshotManifestRef,
    screenshotPath: evidence.screenshotPath,
    screenshotHash: evidence.screenshotHash,
    apiCliArtifactPath: evidence.apiCliArtifactPath,
    artifactPath: evidence.artifactPath,
    artifactConfirmed: evidence.artifactConfirmed,
    evidenceClass: evidence.evidenceClass,
    evidenceKind: evidence.evidenceKind,
    evidenceStatus: evidence.evidenceStatus,
    redactionStatus: evidence.redactionStatus,
    syntheticDataConfirmation: evidence.syntheticDataConfirmation,
    claimSupported: evidence.claimSupported,
    limitation: evidence.limitation,
    authPosture: evidence.authPosture,
    actualAuthPosture: evidence.actualAuthPosture,
    catalogueAuthRequirement: evidence.catalogueAuthRequirement,
    catalogueAccessPosture: evidence.catalogueAccessPosture,
    catalogueAuthExpectation: evidence.catalogueAuthExpectation,
    authPostureMismatch: evidence.authPostureMismatch,
    authPostureMismatchReason: evidence.authPostureMismatchReason,
    loginMethod: evidence.loginMethod,
    authPostureConfigPath: evidence.authPostureConfigPath,
    authPostureRationale: evidence.authPostureRationale,
    authAnonymousAccessEnabled: evidence.authAnonymousAccessEnabled,
    credentialRequired: evidence.credentialRequired,
    credentialSourceRef: evidence.credentialSourceRef,
    credentialScope: evidence.credentialScope,
    credentialValuePersisted: evidence.credentialValuePersisted,
    openBaoLogicalSecretRef: evidence.openBaoLogicalSecretRef,
    openBaoPath: evidence.openBaoPath,
    openBaoRolePersona: evidence.openBaoRolePersona,
    openBaoAccessTimestamp: evidence.openBaoAccessTimestamp,
    openBaoServiceAccessed: evidence.openBaoServiceAccessed,
    openBaoAuditEvidence: evidence.openBaoAuditEvidence,
    openBaoCapabilitiesHash: evidence.openBaoCapabilitiesHash,
    openBaoTokenPolicyHash: evidence.openBaoTokenPolicyHash,
    authenticatedCaptureRequired: evidence.authenticatedCaptureRequired,
    authenticatedCaptureStatus: evidence.authenticatedCaptureStatus,
    authenticatedCaptureMethod: evidence.authenticatedCaptureMethod,
    authenticatedUiScreenshotPath: evidence.authenticatedUiScreenshotPath,
    authenticatedUiScreenshotHash: evidence.authenticatedUiScreenshotHash,
    firstLoginPasswordRotationRequired: evidence.firstLoginPasswordRotationRequired,
    firstLoginPasswordRotationCompleted: evidence.firstLoginPasswordRotationCompleted,
    passwordChangeAuditEvidence: evidence.passwordChangeAuditEvidence,
    directCaptureStatus: evidence.directCaptureStatus,
    directCaptureFindings: evidence.directCaptureFindings,
    screenshotEquivalentReason: evidence.screenshotEquivalentReason,
    finalAcceptanceBlocked: evidence.finalAcceptanceBlocked,
    nextSafeAction: evidence.nextSafeAction,
    humanReenactmentInstruction: evidence.humanReenactmentInstruction,
    targetSystemObservation: evidence.targetSystemObservation,
    targetSystemObservationRationale: evidence.targetSystemObservationRationale,
    targetObservation: evidence.targetObservation,
    observationRationale: evidence.observationRationale,
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
    ["Run ID", evidence.runId],
    ["Source SHA", evidence.sourceSha],
    ["Captured at", evidence.capturedAt],
    ["Screenshot ID", evidence.screenshotId],
    ["Screenshot manifest reference", evidence.screenshotManifestRef],
    ["Target-system observation", evidence.targetSystemObservation],
    ["Live target probe", evidence.targetObservation
      ? `${evidence.targetObservation.method} ${evidence.targetObservation.sourceUrlOrCommand} => ${evidence.targetObservation.status} @ ${evidence.targetObservation.observedAt} (run ${evidence.targetObservation.runId})`
      : "not-probed"],
    ["Observation rationale", evidence.targetSystemObservationRationale || evidence.observationRationale],
    ["Actual auth posture", evidence.actualAuthPosture || evidence.authPosture],
    ["Auth posture mismatch", String(evidence.authPostureMismatch)],
    ["Auth posture mismatch reason", evidence.authPostureMismatchReason],
    ["Login method", evidence.loginMethod],
    ["Auth config path", evidence.authPostureConfigPath],
    ["Auth posture rationale", evidence.authPostureRationale],
    ["Credential source", evidence.credentialSourceRef || "not required"],
    ["Credential scope", evidence.credentialScope || "not required"],
    ["Credential value persisted", String(evidence.credentialValuePersisted)],
    ["OpenBao path", evidence.openBaoPath || "not required"],
    ["OpenBao access evidence", evidence.openBaoAuditEvidence || "not required"],
    ["Authenticated capture required", String(evidence.authenticatedCaptureRequired)],
    ["Authenticated capture status", evidence.authenticatedCaptureStatus],
    ["Authenticated capture method", evidence.authenticatedCaptureMethod],
    ["First-login password rotation required", String(evidence.firstLoginPasswordRotationRequired)],
    ["First-login password rotation completed", String(evidence.firstLoginPasswordRotationCompleted)],
    ["Password-change audit evidence", evidence.passwordChangeAuditEvidence],
    ["Direct capture status", evidence.directCaptureStatus],
    ["Direct capture findings", (evidence.directCaptureFindings ?? []).join("; ") || "none"],
    ["Screenshot path", evidence.screenshotPath],
    ["Screenshot hash", evidence.screenshotHash],
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
    evidence.apiCliArtifactPath ||= serviceEvidenceArtifactPath(report, evidence.serviceId);
    evidence.artifactPath ||= evidence.apiCliArtifactPath;
    evidence.screenshotId ||= serviceEvidenceScreenshotId(evidence.serviceId);
    evidence.screenshotManifestRef ||= serviceEvidenceScreenshotManifestRef(evidence.serviceId);
    const fileName = `compose-service-${slugifyRoute(evidence.serviceId)}-evidence-page.png`;
    const filePath = join(report.screenshotDir, fileName);
    evidence.screenshotPath ||= filePath;
    evidence.screenshotHash ||= "computed-after-capture-see-manifest-row";
    await evidencePage.setContent(serviceEvidenceHtml(evidence), { waitUntil: "domcontentloaded" });
    await evidencePage.screenshot({ path: filePath, fullPage: true });
    const screenshotHash = contentHash(readFileSync(filePath));
    const capturedAt = new Date().toISOString();
    evidence.screenshotPath = filePath;
    evidence.screenshotHash = screenshotHash;
    evidence.capturedAt = capturedAt;
    const entry = {
      id: evidence.screenshotId,
      screenshotId: evidence.screenshotId,
      kind: "compose-service-screenshot-equivalent",
      route: evidence.apiCliArtifactPath || evidence.serviceUrl || evidence.serviceId,
      serviceName: evidence.serviceName,
      serviceId: evidence.serviceId,
      serviceUrl: evidence.serviceUrl || "",
      capabilityIds: evidence.capabilityIds,
      scenarioIds: evidence.scenarioIds,
      rolePersona: evidence.rolePersona,
      authMethodUsed: evidence.authMethodUsed,
      runId: report.qaRun,
      timestamp: capturedAt,
      capturedAt,
      sourceSha: report.sourceSha,
      deploymentEnvironment: report.environment,
      correlationId: evidence.correlationId,
      traceId: evidence.traceId,
      filePath,
      screenshotPath: filePath,
      screenshotHash,
      screenshotManifestRef: evidence.screenshotManifestRef,
      complianceClaimSupport: evidence.claimSupported,
      evidenceKind: evidence.evidenceKind,
      redactionStatus: evidence.redactionStatus,
      syntheticDataConfirmation: evidence.syntheticDataConfirmation,
      authPosture: evidence.authPosture,
      actualAuthPosture: evidence.actualAuthPosture,
      catalogueAuthExpectation: evidence.catalogueAuthExpectation,
      authPostureMismatch: evidence.authPostureMismatch,
      authPostureMismatchReason: evidence.authPostureMismatchReason,
      loginMethod: evidence.loginMethod,
      authPostureConfigPath: evidence.authPostureConfigPath,
      authPostureRationale: evidence.authPostureRationale,
      credentialRequired: evidence.credentialRequired,
      credentialSourceRef: evidence.credentialSourceRef,
      credentialScope: evidence.credentialScope,
      credentialValuePersisted: evidence.credentialValuePersisted,
      openBaoLogicalSecretRef: evidence.openBaoLogicalSecretRef,
      openBaoPath: evidence.openBaoPath,
      openBaoRolePersona: evidence.openBaoRolePersona,
      openBaoAccessTimestamp: evidence.openBaoAccessTimestamp,
      openBaoAuditEvidence: evidence.openBaoAuditEvidence,
      authenticatedCaptureRequired: evidence.authenticatedCaptureRequired,
      authenticatedCaptureStatus: evidence.authenticatedCaptureStatus,
      authenticatedCaptureMethod: evidence.authenticatedCaptureMethod,
      authenticatedUiScreenshotPath: evidence.authenticatedUiScreenshotPath,
      authenticatedUiScreenshotHash: evidence.authenticatedUiScreenshotHash,
      firstLoginPasswordRotationRequired: evidence.firstLoginPasswordRotationRequired,
      firstLoginPasswordRotationCompleted: evidence.firstLoginPasswordRotationCompleted,
      passwordChangeAuditEvidence: evidence.passwordChangeAuditEvidence,
      directCaptureStatus: evidence.directCaptureStatus,
      directCaptureFindings: evidence.directCaptureFindings,
      screenshotEquivalentReason: evidence.screenshotEquivalentReason,
      finalAcceptanceBlocked: evidence.finalAcceptanceBlocked,
      nextSafeAction: evidence.nextSafeAction,
      humanReenactmentInstruction: evidence.humanReenactmentInstruction,
      targetSystemObservation: evidence.targetSystemObservation,
      targetSystemObservationRationale: evidence.targetSystemObservationRationale,
      targetObservation: evidence.targetObservation,
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
  const capturedAt = new Date().toISOString();
  const screenshotId = serviceEvidenceScreenshotId(service.serviceId);
  const entry = {
    id: screenshotId,
    screenshotId,
    kind: "compose-service",
    route: url,
    serviceName: service.displayName ?? service.serviceId,
    serviceId: service.serviceId,
    serviceUrl: url,
    capabilityIds: mappings.map((mapping) => mapping.capabilityId),
    scenarioIds: unique(mappings.flatMap((mapping) => mapping.scenarioIds ?? [])),
    rolePersona: serviceEvidenceRole(service),
    runId: report.qaRun,
    timestamp: capturedAt,
    capturedAt,
    sourceSha: report.sourceSha,
    deploymentEnvironment: report.environment,
    correlationId: `compose-service-${service.serviceId}-machine-qa`,
    traceId: `compose-service-${service.serviceId}-machine-qa-trace`,
    filePath,
    screenshotPath: filePath,
    screenshotHash,
    screenshotManifestRef: serviceEvidenceScreenshotManifestRef(service.serviceId),
    complianceClaimSupport: serviceClaimSupport(service),
    evidenceKind: evidenceState.evidenceKind ?? "supporting-evidence",
    redactionStatus: "no raw secret marker detected by machine text scan",
    syntheticDataConfirmation: "Only synthetic, local, redacted service UI evidence was captured.",
    result: "pass",
    authPosture: evidenceState.authPosture,
    actualAuthPosture: evidenceState.actualAuthPosture,
    catalogueAuthExpectation: evidenceState.catalogueAuthExpectation,
    authPostureMismatch: evidenceState.authPostureMismatch,
    authPostureMismatchReason: evidenceState.authPostureMismatchReason,
    authenticatedCaptureStatus: evidenceState.authenticatedCaptureStatus,
    credentialSourceRef: evidenceState.credentialSourceRef,
    openBaoLogicalSecretRef: evidenceState.openBaoLogicalSecretRef,
    targetSystemObservation: evidenceState.targetSystemObservation,
    targetSystemObservationRationale: evidenceState.targetSystemObservationRationale,
    targetObservation: evidenceState.targetObservation,
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

  const composeStarted = startComposeUiEvidenceRuntime(report);
  try {
    for (const service of data.services) {
      const mappings = mappingsByService.get(service.serviceId) ?? [];
      const posture = authPostureForService(service);
      const candidates = serviceUiCandidates(service);
      const hasCatalogueHttpCandidate = (service.ports ?? []).some((port) =>
        ["http", "https"].includes(String(port.appProtocol ?? "").toLowerCase()),
      );
      const noHostPublishedHttpCandidate = !candidates.length && hasCatalogueHttpCandidate;
      const credentialSummary = redactedCredentialSummary(posture, service.serviceId);
      const evidenceTimestamp = new Date().toISOString();
      const authPostureComparison = authPostureMismatchForService(service, posture.authPosture);
      const authenticatedCaptureRequired = ["auth-required", "service-login required"].includes(posture.authPosture);
      if (authenticatedCaptureRequired) {
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
        authMethodUsed: posture.loginMethod,
        authPath: posture.loginMethod,
        serviceUrls: candidates.map((candidate) => candidate.url),
        serviceUrl: "",
        screenshotPath: "",
        screenshotHash: "",
        screenshotId: serviceEvidenceScreenshotId(service.serviceId),
        screenshotManifestRef: serviceEvidenceScreenshotManifestRef(service.serviceId),
        apiCliArtifactPath: "",
        artifactPath: "",
        artifactHash: "",
        artifactConfirmed: false,
        redactionStatus: "not-visited",
        evidenceClass: "unavailable",
        evidenceKind: "human-review-gap",
        evidenceStatus: "machine-gap",
        runId: report.qaRun,
        timestamp: evidenceTimestamp,
        capturedAt: evidenceTimestamp,
        sourceSha: report.sourceSha,
        sourceGitSha: report.sourceSha,
        deploymentEnvironment: report.environment,
        correlationId: `compose-service-${service.serviceId}-machine-qa`,
        traceId: `compose-service-${service.serviceId}-machine-qa-trace`,
        syntheticDataConfirmation: "Only local synthetic, redacted, non-production proof data is captured; no real tenant data is used.",
        complianceClaimSupport: posture.riskControlMapping ?? serviceClaimSupport(service),
        claimSupported: serviceClaimSupport(service),
        limitation: "Service UI proof is bounded to local Compose and machine evidence for human review. It does not claim staging, production, live-provider, product UI, SOC, or ISO readiness.",
        authPosture: posture.authPosture,
        actualAuthPosture: posture.authPosture,
        catalogueAuthExpectation: authPostureComparison.catalogueAuthExpectation,
        authPostureMismatch: authPostureComparison.authPostureMismatch,
        authPostureMismatchReason: authPostureComparison.authPostureMismatchReason,
        loginMethod: posture.loginMethod,
        authPostureConfigPath: posture.configPath,
        authPostureRationale: posture.anonymousAccessRationale ?? posture.screenshotEquivalentReason ?? posture.loginMethod,
        authAnonymousAccessEnabled: Boolean(posture.anonymousAccessEnabled),
        catalogueAuthRequirement: service.authRequirement ?? "missing",
        catalogueAccessPosture: service.accessPosture ?? "missing",
        credentialRequired: credentialSummary.credentialRequired,
        credentialSourceRef: credentialSummary.credentialSourceRef,
        credentialScope: credentialSummary.credentialScope,
        credentialValuePersisted: false,
        openBaoLogicalSecretRef: "",
        openBaoPath: "",
        openBaoRolePersona: "",
        openBaoAccessTimestamp: "",
        openBaoServiceAccessed: "",
        openBaoAuditEvidence: credentialSummary.credentialRequired ? "pending-openbao-access" : "not-applicable-no-service-credential-required",
        openBaoCapabilitiesHash: "",
        openBaoTokenPolicyHash: "",
        authenticatedCaptureRequired,
        authenticatedCaptureStatus: authenticatedCaptureRequired ? "required-not-yet-captured" : "not-required",
        authenticatedCaptureMethod: posture.loginMethod,
        authenticatedUiScreenshotPath: "",
        authenticatedUiScreenshotHash: "",
        firstLoginPasswordRotationRequired: Boolean(posture.firstLoginPasswordRotationRequired),
        firstLoginPasswordRotationCompleted: !posture.firstLoginPasswordRotationRequired,
        passwordChangeAuditEvidence: posture.firstLoginPasswordRotationRequired ? "pending-first-login-rotation" : "not-required",
        directCaptureStatus: "not-attempted",
        directCaptureFindings: [],
        screenshotEquivalentReason: "pending-candidate-evaluation",
        finalAcceptanceBlocked: false,
        nextSafeAction: "Review the direct screenshot or approved screenshot-equivalent artifact, then record a human decision before final USF-290 acceptance.",
        humanReenactmentInstruction:
          "Retrieve only the scoped logical credential reference from OpenBao when required, open the listed service URL with synthetic data only, complete login or confirm documented anonymous posture, verify screenshot path and hash, chain of custody, redaction status, source SHA, and run ID, then record accept, reject, annotate, retest, corrective-action, or residual-risk decision.",
        targetSystemObservation:
          "Capture pending at service-evidence initialization; final record must replace this with the observed target URL, status, or equivalent artifact.",
        targetSystemObservationRationale:
          "Service evidence must name the target surface and explain why the captured screenshot or approved equivalent supports human review without claiming readiness.",
        observationRationale:
          "Service evidence must name the target surface and explain why the captured screenshot or approved equivalent supports human review without claiming readiness.",
        humanReviewStatus: "human-review-required",
        gaps: [],
      };

      // Real target-system observation (USF-300): a genuine live probe FROM the composed
      // service during this run, stamped with the current runId. This is distinct from the
      // descriptive targetSystemObservation narrative below; it is not a rendering of the
      // catalogue. Every branch that follows persists this structured field via
      // writeServiceEvidenceArtifact.
      evidence.targetObservation = await probeTargetObservation(service, report);
      if (evidence.targetObservation.redactionFinding) {
        evidence.redactionStatus = "target-observation-excerpt-redacted";
      }

      if (!composeStarted) {
        evidence.evidenceClass = "blocked";
        evidence.evidenceKind = "compose-runtime-unavailable";
        evidence.evidenceStatus = "machine-fail";
        evidence.finalAcceptanceBlocked = true;
        evidence.directCaptureStatus = "blocked-compose-runtime-unavailable";
        evidence.gaps.push("Generated Compose target could not be started, so service UI capture could not run.");
        evidence.nextSafeAction = "Fix local Compose startup, rerun machine QA, and capture service UI evidence before human acceptance.";
        evidence.targetSystemObservation =
          "No target-system service page was observed because the generated Compose target could not start.";
        evidence.targetSystemObservationRationale =
          "A service claim with no target observation is a blocking evidence gap until Compose can run and machine QA can capture direct or approved equivalent evidence.";
        evidence.observationRationale = evidence.targetSystemObservationRationale;
        await captureGeneratedServiceEvidenceScreenshot(servicePage, report, evidence);
        writeServiceEvidenceArtifact(report, evidence);
        report.composeServiceEvidence.services.push(evidence);
        continue;
      }

      if (!candidates.length || ["api/cli-only", "unsafe-to-capture"].includes(posture.authPosture)) {
        if (credentialSummary.credentialRequired) {
          try {
            const credentialResult = await writeAndReadOpenBaoCredential(report, service, posture);
            Object.assign(evidence, credentialResult.evidence);
          } catch (error) {
            evidence.directCaptureFindings.push(`OpenBao scoped credential access failed: ${error.message}`);
            evidence.gaps.push(`Required OpenBao credential could not be safely accessed for ${service.serviceId}.`);
          }
        }
        evidence.evidenceClass = posture.authPosture === "unsafe-to-capture" ? "unsafe-to-screenshot" : noHostPublishedHttpCandidate ? "host-unpublished-equivalent" : "cli-equivalent";
        evidence.evidenceKind = posture.authPosture === "unsafe-to-capture" ? "redacted-api-equivalent" : noHostPublishedHttpCandidate ? "service-catalogue-host-boundary-equivalent" : "service-catalogue-cli-equivalent";
        evidence.evidenceStatus = posture.screenshotEquivalentAllowed !== false && !evidence.gaps.length ? "machine-pass" : "machine-fail";
        evidence.artifactConfirmed = evidence.evidenceStatus === "machine-pass";
        evidence.redactionStatus = posture.authPosture === "unsafe-to-capture" ? "screenshot-equivalent-redacted" : noHostPublishedHttpCandidate ? "not-applicable-host-unpublished" : "not-applicable-service-catalogue-only";
        evidence.directCaptureStatus = posture.authPosture === "unsafe-to-capture" ? "not-captured-unsafe-to-screenshot" : noHostPublishedHttpCandidate ? "not-applicable-no-host-published-port" : "not-applicable-api-cli-only";
        evidence.authenticatedCaptureStatus = "not-required-approved-equivalent";
        evidence.screenshotEquivalentReason =
          noHostPublishedHttpCandidate
            ? `The ${COMPOSE_TARGET} target exposes no host-published HTTP/HTTPS candidate for ${service.serviceId} in the ${MACHINE_QA_ENVIRONMENT_SCOPE} machine QA environment, so machine QA records a hash-addressed screenshot-equivalent of the service mapping instead of inventing host reachability.`
            : posture.screenshotEquivalentReason ??
          "The service has no safe direct UI capture target in the repository catalogue, so machine QA records a hash-addressed screenshot-equivalent page.";
        evidence.nextSafeAction = noHostPublishedHttpCandidate
          ? "Human auditor reviews the equivalent evidence page, verifies that the selected generated Compose target has no host-published service URL for this environment, and records the review decision."
          : "Human auditor reviews the equivalent evidence page, verifies the service catalogue mapping and proof command, and records the review decision.";
        evidence.targetSystemObservation = noHostPublishedHttpCandidate
          ? `${evidence.serviceName} has no host-published HTTP/HTTPS target in ${COMPOSE_TARGET} for ${MACHINE_QA_ENVIRONMENT_SCOPE}; targetObservation recorded ${evidence.targetObservation.status}. Machine QA generated a hash-addressed screenshot-equivalent artifact at ${evidence.apiCliArtifactPath || serviceEvidenceArtifactPath(report, service.serviceId)}.`
          : `${evidence.serviceName} was classified as ${posture.authPosture}; machine QA generated a hash-addressed screenshot-equivalent artifact at ${evidence.apiCliArtifactPath || serviceEvidenceArtifactPath(report, service.serviceId)}.`;
        evidence.targetSystemObservationRationale = noHostPublishedHttpCandidate
          ? "The selected generated Compose target does not publish this service to the machine-QA host, so the equivalent artifact records the service mapping, environment boundary, source SHA, run ID, and reenactment path without upgrading it to direct UI evidence."
          : posture.screenshotEquivalentReason ??
            "The repository catalogue has no safe direct UI capture target for this service class, so the equivalent artifact records the service mapping, auth posture, redaction boundary, source SHA, run ID, and reenactment path for human review.";
        evidence.observationRationale = evidence.targetSystemObservationRationale;
        await captureGeneratedServiceEvidenceScreenshot(servicePage, report, evidence);
        writeServiceEvidenceArtifact(report, evidence);
        report.composeServiceEvidence.services.push(evidence);
        report.composeServiceEvidence.summary.artifactsConfirmed += evidence.artifactConfirmed ? 1 : 0;
        addCheck(report, evidence.evidenceStatus === "machine-pass" ? "pass" : "fail", "compose-service-evidence", service.serviceId, "Generated approved service screenshot-equivalent evidence.", evidence.evidenceStatus === "machine-pass" ? undefined : "missing-compose-service-screenshot");
        continue;
      }

      let credential = null;
      if (credentialSummary.credentialRequired) {
        try {
          const credentialResult = await writeAndReadOpenBaoCredential(report, service, posture);
          credential = credentialResult.credential;
          Object.assign(evidence, credentialResult.evidence);
        } catch (error) {
          evidence.directCaptureFindings.push(`OpenBao scoped credential access failed: ${error.message}`);
          evidence.gaps.push(`Required OpenBao credential could not be safely accessed for ${service.serviceId}.`);
        }
      }

      let captured = false;
      for (const candidate of candidates) {
        try {
          const { status } = await gotoWithRetry(servicePage, candidate.url, authenticatedCaptureRequired ? 240000 : 90000);
          evidence.serviceUrl = candidate.url;
          evidence.status = status;
          if (credentialSummary.credentialRequired && !credential) {
            throw new Error("credential-required-but-unavailable");
          }
          const loginResult = await performServiceLogin(servicePage, service, posture, credential);
          const currentServiceUrl = servicePage.url() || candidate.url;
          evidence.serviceUrl = currentServiceUrl;
          evidence.firstLoginPasswordRotationRequired = Boolean(loginResult.rotationRequired || posture.firstLoginPasswordRotationRequired);
          evidence.firstLoginPasswordRotationCompleted = evidence.firstLoginPasswordRotationRequired ? Boolean(loginResult.rotationCompleted) : true;
          evidence.passwordChangeAuditEvidence = evidence.firstLoginPasswordRotationRequired
            ? loginResult.rotationCompleted
              ? "first-login password rotation completed with rotated secret retained only in OpenBao logical reference"
              : "first-login password rotation was required but not completed"
            : "not-required";
          const text = await servicePage.content();
          const sensitiveFinding = serviceSensitiveFinding(text);
          if (sensitiveFinding) {
            throw new Error(`sensitive-marker-detected:${sensitiveFinding}`);
          }
          if (authenticatedCaptureRequired && !loginResult.loggedIn && !posture.screenshotEquivalentAllowed) {
            throw new Error("authenticated-ui-login-not-proven");
          }
          const authenticatedStatus = authenticatedCaptureRequired
            ? loginResult.apiAuthenticatedOnly && posture.screenshotEquivalentAllowed
              ? "not-required-approved-equivalent"
              : "captured-authenticated-ui"
            : "not-required-direct-capture";
          if (loginResult.apiAuthenticatedOnly && posture.screenshotEquivalentAllowed) {
            evidence.evidenceClass = "api-equivalent";
            evidence.evidenceKind = "authenticated-api-equivalent";
            evidence.evidenceStatus = "machine-pass";
            evidence.artifactConfirmed = true;
            evidence.redactionStatus = "redacted-authenticated-api-equivalent";
            evidence.directCaptureStatus = "not-captured-approved-api-equivalent";
            evidence.authenticatedCaptureStatus = authenticatedStatus;
            evidence.screenshotEquivalentReason = posture.screenshotEquivalentReason;
            evidence.targetSystemObservation =
              `${evidence.serviceName} target ${currentServiceUrl} was reached, but direct UI capture was replaced by an approved authenticated API-equivalent to avoid exposing secret material.`;
            evidence.targetSystemObservationRationale =
              "The service is part of the credential/security workflow, so the evidence records controlled OpenBao access, redaction posture, source SHA, run ID, and a hash-addressed screenshot-equivalent instead of exposing secret-bearing UI content.";
            evidence.observationRationale = evidence.targetSystemObservationRationale;
            await captureGeneratedServiceEvidenceScreenshot(servicePage, report, evidence);
          } else {
            const screenshotEntry = await captureCurrentServicePageScreenshot(servicePage, report, service, currentServiceUrl, mappings, {
              evidenceKind: authenticatedCaptureRequired ? "authenticated-service-ui-screenshot" : "direct-service-ui-screenshot",
              authPosture: evidence.authPosture,
              actualAuthPosture: evidence.actualAuthPosture,
              catalogueAuthExpectation: evidence.catalogueAuthExpectation,
              authPostureMismatch: evidence.authPostureMismatch,
              authPostureMismatchReason: evidence.authPostureMismatchReason,
              authenticatedCaptureStatus: authenticatedStatus,
              credentialSourceRef: evidence.credentialSourceRef,
              openBaoLogicalSecretRef: evidence.openBaoLogicalSecretRef,
              targetObservation: evidence.targetObservation,
              targetSystemObservation:
                `${evidence.serviceName} target ${currentServiceUrl} responded with HTTP ${status}; direct screenshot capture was requested.`,
              targetSystemObservationRationale:
                "The screenshot records the observed service UI state with synthetic data, redaction scan status, auth posture, source SHA, run ID, and hash for human review.",
            });
            evidence.screenshotId = screenshotEntry.screenshotId;
            evidence.screenshotManifestRef = screenshotEntry.screenshotManifestRef;
            evidence.screenshotPath = screenshotEntry.filePath;
            evidence.screenshotHash = screenshotEntry.screenshotHash;
            evidence.capturedAt = screenshotEntry.capturedAt;
            evidence.authenticatedUiScreenshotPath = authenticatedCaptureRequired ? screenshotEntry.filePath : "";
            evidence.authenticatedUiScreenshotHash = authenticatedCaptureRequired ? screenshotEntry.screenshotHash : "";
            evidence.evidenceClass = authenticatedCaptureRequired ? "authenticated-direct-screenshot" : "direct-screenshot";
            evidence.evidenceKind = authenticatedCaptureRequired ? "authenticated-service-ui-screenshot" : "direct-service-ui-screenshot";
            evidence.evidenceStatus = status >= 200 && status < 500 ? "machine-pass" : "machine-fail";
            evidence.artifactConfirmed = status >= 200 && status < 500;
            evidence.redactionStatus = screenshotEntry.redactionStatus;
            evidence.directCaptureStatus = status >= 200 && status < 400 ? "captured-success-response" : `captured-http-${status}`;
            evidence.authenticatedCaptureStatus = authenticatedStatus;
            evidence.screenshotEquivalentReason = authenticatedCaptureRequired
              ? "Authenticated service UI screenshot captured after OpenBao-scoped credential access without preserving secret values."
              : "Direct service UI screenshot captured after explicit auth-posture review without secret markers.";
            evidence.targetSystemObservation =
              `${evidence.serviceName} target ${currentServiceUrl} responded with HTTP ${status}; ${evidence.directCaptureStatus}; screenshot captured at ${evidence.screenshotPath}.`;
            evidence.targetSystemObservationRationale =
              "The browser observed the target service surface directly and stored a hash-addressed screenshot with synthetic-data and redaction posture for human review.";
            evidence.observationRationale = evidence.targetSystemObservationRationale;
          }
          evidence.limitation = "Screenshot is supporting service evidence only; human acceptance remains required and no staging, production, live-provider, SOC, ISO, product UI, or full-product readiness is claimed.";
          evidence.nextSafeAction = "Human auditor reviews the screenshot, OpenBao logical credential reference where present, chain of custody, and redaction status, then records accept, reject, retest, corrective-action, or residual-risk decision.";
          writeServiceEvidenceArtifact(report, evidence);
          report.composeServiceEvidence.summary.servicesVisited += 1;
          report.composeServiceEvidence.summary.artifactsConfirmed += evidence.artifactConfirmed ? 1 : 0;
          report.composeServiceEvidence.redactionChecks.push({
            serviceId: service.serviceId,
            serviceUrl: currentServiceUrl,
            result: "pass",
            finding: "no raw secret marker detected by machine text scan",
          });
          addCheck(report, evidence.evidenceStatus === "machine-pass" ? "pass" : "fail", "compose-service-evidence", service.serviceId, `Captured ${evidence.evidenceKind} for ${currentServiceUrl} with auth posture ${evidence.actualAuthPosture}.`, evidence.evidenceStatus === "machine-pass" ? undefined : "missing-compose-service-screenshot");
          captured = true;
          break;
        } catch (error) {
          evidence.directCaptureFindings.push(`${candidate.url} capture failed: ${error.message}`);
        }
      }

      if (!captured) {
        evidence.evidenceClass = "blocked";
        evidence.evidenceKind = "authenticated-service-ui-gap";
        evidence.evidenceStatus = "machine-fail";
        evidence.finalAcceptanceBlocked = true;
        evidence.redactionStatus = "not-captured-blocking-gap";
        evidence.directCaptureStatus = authenticatedCaptureRequired ? "blocked-authenticated-ui-not-captured" : "blocked-direct-ui-not-captured";
        evidence.authenticatedCaptureStatus = authenticatedCaptureRequired ? "blocked-authenticated-ui-not-captured" : "not-required-direct-capture-missing";
        evidence.screenshotEquivalentReason = authenticatedCaptureRequired
          ? "A generated screenshot-equivalent is not sufficient because this service is auth-required and authenticated UI capture was feasible or required."
          : "Direct UI capture was required for this service but did not complete.";
        evidence.gaps.push(
          authenticatedCaptureRequired
            ? `${service.displayName ?? service.serviceId} requires authenticated UI evidence using scoped OpenBao credential reference ${evidence.credentialSourceRef || "missing"}.`
            : `${service.displayName ?? service.serviceId} direct UI evidence could not be captured.`,
        );
        evidence.nextSafeAction = "Complete the safe service login or document a true no-UI/unsafe-to-capture exception, rerun machine QA, and do not claim final audit readiness until this gap is zero.";
        evidence.targetSystemObservation =
          `${evidence.serviceName} target capture did not complete. Attempt findings: ${(evidence.directCaptureFindings ?? []).join("; ") || "no successful target observation"}.`;
        evidence.targetSystemObservationRationale =
          "The failed observation is retained as a blocking evidence gap so a generated equivalent cannot silently satisfy an auth-required or direct-UI service claim.";
        evidence.observationRationale = evidence.targetSystemObservationRationale;
        await captureGeneratedServiceEvidenceScreenshot(servicePage, report, evidence);
        writeServiceEvidenceArtifact(report, evidence);
        addCheck(report, "fail", "compose-service-evidence", service.serviceId, evidence.gaps.join("; "), "missing-compose-service-screenshot");
      }
      report.composeServiceEvidence.services.push(evidence);
    }
  } finally {
    stopComposeUiEvidenceRuntime(report);
    await servicePage.close();
  }
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
  const navigation = await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]).then(([response]) => response);
  if (navigation && navigation.status() >= 400) {
    addCheck(report, "fail", "action-ledger", context.actionType, `POST navigation returned ${navigation.status()}.`, "form-submission-failure");
    return null;
  }
  await page.goto(`${baseUrl}/proof/actions`, { waitUntil: "domcontentloaded", timeout: 10000 });
  const actionsText = await page.content();
  const expectedActor = context.expectedActor ?? MACHINE_QA_REVIEW_ACTOR;
  const visible = actionsText.includes(expectedActor) && actionsText.includes(context.actionType);
  if (!visible) {
    addCheck(report, "fail", "action-ledger", context.actionType, "Submitted action is not visible in ledger.", "state-persistence-failure");
    return null;
  }
  const actionHref = await page
    .locator('a[href^="/proof/actions/"]')
    .first()
    .getAttribute("href");
  const detail = actionHref ? await fetchText(page, baseUrl, actionHref) : { status: 0, text: "" };
  if (!actionHref || detail.status !== 200 || !textHasAll(detail.text, [expectedActor, context.actionName, context.correlationId, "nonClaimsConfirmed"])) {
    addCheck(report, "fail", "action-ledger", context.actionType, "Action detail page is missing or incomplete.", "state-persistence-failure");
    return null;
  }
  report.counts.actionsSubmitted += 1;
  const result = { actionType: context.actionType, actor: expectedActor, route: targetRoute, detailRoute: actionHref, result: "pass" };
  report.actionResults.push(result);
  addCheck(report, "pass", "action-ledger", context.actionType, `Submitted authenticated action and verified detail page ${actionHref}.`);
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

async function verifyDefaultMutationDenied(report) {
  const statePath = join(report.artifactDir, "default-read-only-actions.json");
  const server = await startProofCockpitServer({ host: "127.0.0.1", port: 0, statePath, allowWrites: false });
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      addCheck(report, "fail", "action-ledger", "default-read-only", "Default proof cockpit server address was unavailable.", "state-persistence-failure");
      return;
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${baseUrl}/proof/actions`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        actionType: "capability-qa",
        actionName: "unauthenticated mutation should fail",
        outcome: "draft-performed",
        role: "auditor",
        tenant: "synthetic-machine-qa",
        returnTo: "/proof/actions",
      }),
    });
    if (response.status !== 403) {
      addCheck(report, "fail", "action-ledger", "default-read-only", `Unauthenticated POST returned ${response.status}.`, "form-submission-failure");
      return;
    }
    if (existsSync(statePath)) {
      addCheck(report, "fail", "action-ledger", "default-read-only", "Default unauthenticated POST wrote a state file.", "state-persistence-failure");
      return;
    }
    addCheck(report, "pass", "action-ledger", "default-read-only", "Default proof cockpit rejects unauthenticated POST writes with 403 and creates no state file.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
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
      [
        "final\\s+acceptance\\s+complete",
        "usf-290\\s+complete",
        "staging\\s+readiness\\s+complete",
      ].join("|"),
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
  const artifactPath = options.rawArtifactPath ?? options.screenshotPath ?? "";
  const artifactHash = options.artifactHash ?? artifactHashForPath(artifactPath);
  const screenshotHash = options.screenshotHash ?? artifactHashForPath(options.screenshotPath ?? "");
  const metadataHash = contentHash(content);
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
    screenshotHash,
    rawArtifactPath: options.rawArtifactPath ?? "",
    normalizedSummary: summary,
    claimSupported: options.claimSupported ?? target,
    whyThisProvesTheClaim: options.whyThisProvesTheClaim ?? "Machine QA observed and normalized the target evidence state for human review.",
    howItWasProven: options.howItWasProven ?? sourceMethod,
    limitations: options.limitations ?? "Machine evidence requires human import and acceptance before it supports final USF-290 decisions.",
    sensitivityClassification: options.sensitivityClassification ?? "synthetic-or-redacted-qa-evidence",
    redactionStatus: options.redactionStatus ?? "no raw secret marker detected by machine text scan",
    contentHash: artifactHash || metadataHash,
    metadataHash,
    artifactHash,
    hashBasis: artifactHash ? "artifact-bytes-sha256" : "normalized-metadata-sha256",
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
    artifactHash: record.artifactHash || (record.rawArtifactPath && existsSync(record.rawArtifactPath) ? contentHash(readFileSync(record.rawArtifactPath)) : ""),
    metadataHash: record.metadataHash,
    hashBasis: record.hashBasis,
    screenshotHash: artifactHashForPath(record.screenshotPath),
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
    runId: service.runId,
    capturedAt: service.capturedAt,
    screenshotId: service.screenshotId,
    screenshotManifestRef: service.screenshotManifestRef,
    screenshotPath: service.screenshotPath,
    screenshotHash: service.screenshotHash || (service.screenshotPath && existsSync(service.screenshotPath) ? contentHash(readFileSync(service.screenshotPath)) : ""),
    timestamp: service.timestamp,
    sourceSha: service.sourceSha ?? service.sourceGitSha,
    sourceGitSha: service.sourceGitSha,
    environment: service.deploymentEnvironment,
    redactionStatus: service.redactionStatus,
    syntheticDataConfirmation: service.syntheticDataConfirmation,
    humanReviewStatus: service.humanReviewStatus,
    evidenceClass: service.evidenceClass,
    evidenceStatus: service.evidenceStatus,
    authPosture: service.authPosture,
    actualAuthPosture: service.actualAuthPosture,
    catalogueAuthExpectation: service.catalogueAuthExpectation,
    authPostureMismatch: service.authPostureMismatch,
    authPostureMismatchReason: service.authPostureMismatchReason,
    loginMethod: service.loginMethod,
    authPostureConfigPath: service.authPostureConfigPath,
    authPostureRationale: service.authPostureRationale,
    authAnonymousAccessEnabled: service.authAnonymousAccessEnabled,
    catalogueAuthRequirement: service.catalogueAuthRequirement,
    catalogueAccessPosture: service.catalogueAccessPosture,
    credentialRequired: service.credentialRequired,
    credentialSourceRef: service.credentialSourceRef,
    credentialScope: service.credentialScope,
    credentialValuePersisted: service.credentialValuePersisted,
    openBaoLogicalSecretRef: service.openBaoLogicalSecretRef,
    openBaoPath: service.openBaoPath,
    openBaoRolePersona: service.openBaoRolePersona,
    openBaoAccessTimestamp: service.openBaoAccessTimestamp,
    openBaoAuditEvidence: service.openBaoAuditEvidence,
    openBaoCapabilitiesHash: service.openBaoCapabilitiesHash,
    openBaoTokenPolicyHash: service.openBaoTokenPolicyHash,
    authenticatedCaptureRequired: service.authenticatedCaptureRequired,
    authenticatedCaptureStatus: service.authenticatedCaptureStatus,
    authenticatedCaptureMethod: service.authenticatedCaptureMethod,
    authenticatedUiScreenshotPath: service.authenticatedUiScreenshotPath,
    authenticatedUiScreenshotHash: service.authenticatedUiScreenshotHash,
    firstLoginPasswordRotationRequired: service.firstLoginPasswordRotationRequired,
    firstLoginPasswordRotationCompleted: service.firstLoginPasswordRotationCompleted,
    passwordChangeAuditEvidence: service.passwordChangeAuditEvidence,
    artifactPath: service.artifactPath || service.apiCliArtifactPath,
    artifactHash: service.artifactHash,
    directCaptureStatus: service.directCaptureStatus,
    directCaptureFindings: service.directCaptureFindings ?? [],
    screenshotEquivalentReason: service.screenshotEquivalentReason,
    finalAcceptanceBlocked: service.finalAcceptanceBlocked,
    nextSafeAction: service.nextSafeAction,
    humanReenactmentInstruction: service.humanReenactmentInstruction,
    targetSystemObservation: service.targetSystemObservation,
    targetSystemObservationRationale: service.targetSystemObservationRationale,
    observationRationale: service.observationRationale,
    blockingGap: service.gaps?.length ? service.gaps.join("; ") : "",
  }));
  report.adapterManifest = report.composeServiceEvidence.services.map((service) => ({
    serviceId: service.serviceId,
    serviceName: service.serviceName,
    adapterClass: SERVICE_ADAPTER_CLASSES.find(([serviceId]) => serviceId === service.serviceId)?.[1] ?? "generic-compose-service-adapter",
    authMethod: service.authPath,
    authPosture: service.actualAuthPosture ?? service.authPosture,
    credentialSourceRef: service.credentialSourceRef,
    openBaoLogicalSecretRef: service.openBaoLogicalSecretRef,
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

Every normalized evidence record includes source SHA, environment, command or URL, timestamp, artifact path or screenshot path, content hash, screenshot hash where image evidence exists, redaction status, limitations, and human review status.

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

Primary re-test command: corepack pnpm proof-cockpit:machine-qa. Evidence is tied to source SHA ${report.sourceSha}, deployment SHA ${report.deploymentSha}, source tree hash ${report.sourceTreeHash}, run ID ${report.qaRun}, and environment ${report.environment}.

## 22. Human acceptance result

Machine evidence is not automatically accepted. Final human acceptance remains disabled until Matthew records the required decision.

## 23. Final handoff statement

This bundle supports selective human reenactment and evidence acceptance. It does not claim readiness beyond the explicit non-claims above.

## Environment and deployment appendix

Environment: ${report.environment}
Source Git SHA: ${report.sourceSha}
Deployment SHA: ${report.deploymentSha}
Source tree hash: ${report.sourceTreeHash}
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
    [
      "README.md",
      `# USF-293 External Review Bundle

This bundle contains machine QA evidence for human review. It does not claim staging readiness or USF-290 completion.

Source SHA: ${report.sourceSha}
Deployment SHA: ${report.deploymentSha}
Source tree hash: ${report.sourceTreeHash}
Run ID: ${report.qaRun}

Latest machine QA: ${report.counts.pass} pass, ${report.counts.warn} warnings, ${report.counts.fail} failures, ${report.gaps.length} unresolved gaps.
`,
    ],
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
  if (!args.baseUrl) {
    process.env.USF_PROOF_COCKPIT_ALLOW_WRITES = "yes";
    process.env.USF_PROOF_COCKPIT_REVIEW_SECRET = MACHINE_QA_REVIEW_SECRET;
    process.env.USF_PROOF_COCKPIT_REVIEW_ACTOR = MACHINE_QA_REVIEW_ACTOR;
  }
  const server = args.baseUrl
    ? null
    : await startChromiumSafeProofCockpitServer({
        host: "127.0.0.1",
        port: 0,
        statePath,
        allowWrites: true,
        reviewSecret: MACHINE_QA_REVIEW_SECRET,
        actor: MACHINE_QA_REVIEW_ACTOR,
      });
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
    await verifyDefaultMutationDenied(report);
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
      await closeServer(server);
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ outcome: "error", message: error.message }));
  process.exit(1);
});
