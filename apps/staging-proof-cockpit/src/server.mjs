import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../../..", import.meta.url).pathname;
const MATRIX_PATH = join(ROOT, "docs/architecture/capability-source-coverage-matrix.md");
const CONTRACT_DIR = join(ROOT, "spec/instances/semantic-contract");
const SERVICE_CATALOGUE_PATH = join(ROOT, "spec/instances/compose-service/service-catalogue.json");
const COMPOSED_SERVICE_MATRIX_PATH = join(ROOT, "docs/architecture/composed-service-integration-test-matrix.json");
const LINEAR_ISSUE = "USF-290";

const NON_CLAIMS = Object.freeze([
  "no-staging-readiness",
  "no-production-readiness",
  "no-deployment-readiness",
  "no-live-provider-readiness",
  "no-soc-readiness",
  "no-iso-certification",
  "no-enterprise-production-readiness",
  "no-real-user-product-ui-readiness",
  "no-browser-e2e-readiness",
  "no-full-react-product-parity",
  "no-usf-290-completion",
]);

const ROLES = Object.freeze([
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

const ROUTES = Object.freeze([
  "/proof",
  "/proof/qa",
  "/proof/capabilities",
  "/proof/capabilities/:capabilityId",
  "/proof/services",
  "/proof/services/:serviceId",
  "/proof/scenarios/:scenarioId",
  "/proof/roles",
  "/proof/evidence/:evidenceId",
  "/proof/audit",
  "/proof/observability",
  "/proof/fixtures",
  "/proof/alerts",
  "/proof/signoff",
  "/proof/result",
  "/proof/enterprise",
  "/proof/enterprise/isms-scope",
  "/proof/enterprise/risk-register",
  "/proof/enterprise/statement-of-applicability",
  "/proof/enterprise/assets",
  "/proof/enterprise/suppliers",
  "/proof/enterprise/access-review",
  "/proof/enterprise/secrets-crypto",
  "/proof/enterprise/audit-retention",
  "/proof/enterprise/backup-dr",
  "/proof/enterprise/change-release",
  "/proof/enterprise/supply-chain",
  "/proof/enterprise/privacy-data-protection",
  "/proof/enterprise/tenant-isolation",
  "/proof/enterprise/resilience-capacity",
  "/proof/enterprise/observability-runbooks",
  "/proof/enterprise/policy-governance",
  "/proof/enterprise/nonconformity-corrective-action",
  "/proof/enterprise/management-review",
  "/proof/enterprise/single-operator-risk",
  "/proof/runbook",
]);

const ROUTE_SUMMARIES = Object.freeze([
  ["/proof", "Cockpit landing page", "Confirm warnings, source SHA, environment metadata, and route map.", "source SHA, deployment metadata, visible non-claims"],
  ["/proof/qa", "Formal human QA workflow", "Follow the per-capability confirmation sequence and stop conditions before signoff.", "human action record, screenshot, correlation id, immutable artifact"],
  ["/proof/capabilities", "All capability inventory", "Choose a capability, then open its service, scenario, evidence, audit, and observability links.", "75 capability rows, domain grouping, current prototype state"],
  ["/proof/capabilities/:capabilityId", "Capability detail", "Execute happy and negative path placeholders, verify services, and collect evidence.", "semantic contract, role, service, scenario, fixture, audit, alert, signoff placeholders"],
  ["/proof/services", "Compose service click-through inventory", "Open each required backing service page before a service-backed capability is accepted.", "service catalogue row, composed integration row, lifecycle command, proof command"],
  ["/proof/services/:serviceId", "Compose service detail", "Verify service health, seed/reset state, safe operation evidence, and operator boundary.", "catalogue ownership, profiles, fixture lifecycle, proof command, runbook gaps"],
  ["/proof/scenarios/:scenarioId", "Scenario action page", "Perform the listed persona/tenant steps and capture expected result plus evidence links.", "scenario status, expected audit event, expected observability, expected alert"],
  ["/proof/roles", "Role and persona matrix", "Verify role-switch or role-login evidence without unsafe impersonation shortcuts.", "persona, role boundary, audit placeholder"],
  ["/proof/evidence/:evidenceId", "Evidence record page", "Attach or verify proof run, audit, observability, screenshot, PR, Linear, and runbook links.", "evidence id, status, target, source SHA"],
  ["/proof/audit", "Audit evidence matrix", "Confirm every capability has auditable event evidence before acceptance.", "audit event id, actor, tenant, action, correlation id"],
  ["/proof/observability", "Logs metrics traces matrix", "Confirm trace/log/metric evidence and correlation for each exercised path.", "correlation id, trace id, metric, log, dashboard/runbook"],
  ["/proof/fixtures", "Synthetic fixture lifecycle", "Verify seed, reset, cleanup, residual-state, and no-real-tenant-data posture.", "fixture id, lifecycle API, reset evidence"],
  ["/proof/alerts", "Alert coverage matrix", "Confirm expected alert or explicit no-alert rationale per capability/service.", "alert name, condition, route/service, evidence link"],
  ["/proof/signoff", "Disabled first-pass signoff", "Review missing evidence and disabled final acceptance controls.", "final signoff unavailable marker"],
  ["/proof/result", "Result decision placeholder", "Read the eventual decision target and current unavailable state.", "no final artifact in this pass"],
  ["/proof/enterprise", "Enterprise evidence index", "Open enterprise control-support pages and record missing evidence.", "ISMS-supporting evidence placeholders"],
  ["/proof/runbook", "Auditor runbook", "Use the end-to-end audit checklist and stop conditions during formal validation.", "route map, required artefacts, blocked-state guidance"],
]);

const ENTERPRISE_TOPICS = Object.freeze([
  ["isms-scope", "ISMS scope", "Scope, context, interested parties, accountable owner, and non-certification boundary."],
  ["risk-register", "Risk register", "Risk statements, owners, treatments, review dates, and accepted-risk workflow."],
  [
    "statement-of-applicability",
    "Statement of Applicability",
    "Control support matrix, applicability, evidence source, owner, and exception posture.",
  ],
  ["assets", "Asset inventory", "Repository, domains, self-hosted origin, data classes, evidence stores, and service ownership."],
  ["suppliers", "Supplier/provider risk", "Cloudflare, GitHub, Linear, package registries, and replaceability evidence."],
  ["access-review", "Access review", "SSO, MFA, privileged access, break-glass, review cadence, and audit evidence."],
  ["secrets-crypto", "Secrets and cryptography", "Secret boundaries, certificate lifecycle, key handling, and no-secret exposure."],
  ["audit-retention", "Audit retention", "Audit events, retention, tamper evidence, redaction, and evidence immutability."],
  ["backup-dr", "Backup DR", "Backup, restore, disaster recovery, BCP, RTO/RPO-style placeholders, and restore evidence."],
  ["change-release", "Change release", "Review, PR, validation, deployment, rollback, and release governance evidence."],
  ["supply-chain", "Supply chain", "SBOM, provenance, dependency pinning, vulnerability handling, and licence posture."],
  [
    "privacy-data-protection",
    "Privacy and data protection",
    "Retention, deletion, export, residency, data minimisation, and tenant data boundary.",
  ],
  ["tenant-isolation", "Tenant isolation", "Customer data boundary, RLS, role/permission checks, and cross-tenant denial evidence."],
  ["resilience-capacity", "Resilience capacity", "Capacity, rate limiting, abuse controls, SLO posture, and degradation handling."],
  ["observability-runbooks", "Observability runbooks", "Dashboards, logs, metrics, traces, alerts, and operator runbooks."],
  ["policy-governance", "Policy governance", "Policy pack, ownership, review cadence, exception process, and AI governance."],
  ["iso-control-support", "ISO control-support map", "ISO/IEC 27001-style control support, evidence owner, applicability, and non-certification boundary."],
  ["internal-audit", "Internal audit readiness", "Audit programme placeholder, evidence sampling, findings, independence boundary, and corrective action link."],
  ["legal-regulatory", "Legal and regulatory obligations", "Applicable obligations, contractual commitments, privacy/security duties, and owner review."],
  ["security-objectives", "Security objectives and measurement", "Measurable security objectives, metrics, review cadence, trend evidence, and management visibility."],
  ["document-control", "Document control", "Controlled evidence documents, versioning, review cadence, approval, retention, and supersession handling."],
  ["competence-awareness", "Competence and awareness", "Operator competence, staging QA auditor awareness, training evidence, and role responsibility boundary."],
  ["physical-environmental", "Physical and environmental", "Self-hosted origin facility/provider posture, equipment boundary, power/network dependency, and physical access assumptions."],
  ["secure-sdlc", "Secure SDLC", "Threat-informed development, review, validation, vulnerability handling, planted defects, and release evidence."],
  ["evidence-integrity", "Evidence integrity", "Immutability, source SHA, timestamp, correlation, tamper boundary, retention, and generated-report non-authority."],
  [
    "nonconformity-corrective-action",
    "Nonconformity corrective action",
    "Findings, corrective action, validation, owner, due date, and closure evidence.",
  ],
  ["management-review", "Management review", "Management review inputs, outputs, decisions, and continual improvement."],
  ["single-operator-risk", "Single-operator risk", "Single-operator constraints, compensating controls, break-glass, and succession risk."],
]);

const DOMAIN_SERVICES = Object.freeze({
  "identity-access": ["identity provider", "tenant identity store", "relational database", "audit store"],
  authentication: ["identity provider", "auth/session service", "tenant identity store", "audit store"],
  configuration: ["configuration registry", "secrets provider", "audit store"],
  "entitlements-billing": ["billing/entitlements provider", "relational database", "event bus", "audit store"],
  "data-platform": ["relational database", "backup/restore service", "object storage", "audit store"],
  search: ["search index", "relational database", "audit store"],
  storage: ["object storage", "file scanner", "relational database", "audit store"],
  "events-workflow": ["queue/event bus", "workflow runner", "notification transport", "audit store"],
  "compute-runtime": ["worker runtime", "secrets provider", "queue/event bus", "audit store"],
  "observability-ops": ["observability stack", "alerting system", "audit store", "screenshot/artifact store"],
  "security-governance": ["assurance scanner", "evidence store", "audit store"],
  "developer-platform": ["API gateway", "developer portal", "rate-limit store", "audit store"],
  "support-admin": ["tenant administration service", "support workflow store", "audit store"],
  foundation: ["deployment metadata source", "evidence store", "validator suite"],
});

const DOMAIN_SERVICE_IDS = Object.freeze({
  "identity-access": ["keycloak", "keycloak-db", "postgres", "grafana", "loki", "tempo"],
  authentication: ["keycloak", "keycloak-db", "postgres", "grafana", "loki", "tempo"],
  configuration: ["openbao", "postgres", "grafana", "loki"],
  "entitlements-billing": ["postgres", "nats", "webhook-sink", "mailpit", "grafana", "loki"],
  "data-platform": ["postgres", "pgbackrest", "minio", "clickhouse", "redis", "grafana", "loki"],
  search: ["meilisearch", "postgres", "grafana", "loki"],
  storage: ["minio", "clamav", "postgres", "grafana", "loki"],
  "events-workflow": ["nats", "temporal", "temporal-postgres", "windmill", "mailpit", "webhook-sink", "grafana", "loki"],
  "compute-runtime": ["temporal", "temporal-postgres", "windmill", "windmill-worker", "openbao", "nats", "grafana", "loki"],
  "observability-ops": ["grafana", "prometheus", "loki", "tempo", "alertmanager", "alloy", "otel-collector", "sentry"],
  "security-governance": ["sonarqube", "sonar-postgres", "clamav", "openbao", "grafana", "loki"],
  "developer-platform": ["wiremock", "webhook-sink", "redis", "postgres", "mailpit", "public-proof-origin"],
  "support-admin": ["postgres", "grafana", "loki", "mailpit", "keycloak"],
  foundation: ["public-proof-origin", "caddy", "platform-api", "postgres", "grafana", "loki", "prometheus", "otel-collector"],
});

const HUMAN_QA_STEPS = Object.freeze([
  "Confirm source SHA, environment, deployment id, and non-claims on the cockpit landing page.",
  "Select a capability and verify its semantic contract path, domain, role set, scenario links, and evidence placeholders.",
  "Open each linked backing service page and confirm compose profile, health/readiness, fixture lifecycle, proof command, and safe-operation evidence requirements.",
  "Perform the happy path with the listed persona and synthetic tenant context.",
  "Perform the negative path, including denial, tenant mismatch, invalid input, degraded dependency, or timeout where the capability requires it.",
  "Capture audit evidence with actor, tenant, action, result, timestamp, and correlation id.",
  "Capture observability evidence with trace id, log line, metric or latency bucket, and dashboard/runbook link.",
  "Verify expected alert evidence or record an explicit no-alert rationale for the capability and service path.",
  "Confirm synthetic fixture seed, reset, cleanup, and residual-state evidence. Stop if real tenant data is required.",
  "Attach screenshot or equivalent immutable artifact, link PR and Linear evidence, then leave final signoff disabled until final proofing is implemented.",
]);

const STOP_CONDITIONS = Object.freeze([
  "SSO or authorised staging access boundary is missing for a real staging exercise.",
  "A required service-backed claim is satisfied only by an in-memory, process-local, or mock substitute.",
  "A service page is missing health, seed/reset, safe-operation, or teardown evidence needed by the capability.",
  "The scenario requires real tenant data, real secrets, private local state, or destructive persistent mutation.",
  "Audit, trace, log, metric, alert, screenshot, or immutable artifact evidence is fabricated or missing.",
  "A route, service, or provider page claims staging, production, SOC, ISO, enterprise readiness, product UI readiness, browser E2E readiness, or full React parity.",
]);

const PROOF_LADDER_LEVELS = Object.freeze([
  [
    "Dev readiness prerequisite",
    "docs/architecture/dev-readiness-validation-and-handover.md",
    "Machine-completed dev evidence must be traced to the required human work: clone, setup, local verification, governed change, PR workflow, troubleshooting, safe config, and handover.",
    "repository-prerequisite-reference",
  ],
  [
    "Test readiness prerequisite",
    "docs/architecture/test-readiness-final-acceptance-gate.md",
    "Machine-completed test evidence must be traced to the required human work: composed backing service exercise, deterministic fixture lifecycle, role/security/data/service suites, validators, planted defects, and final acceptance gates.",
    "repository-prerequisite-reference",
  ],
  [
    "Staging QA exercise",
    "/proof/capabilities/:capabilityId",
    "Human auditor performs role-specific happy path, negative path, service click-through, audit, observability, alert, fixture, screenshot, and signoff actions.",
    "first-pass-placeholder",
  ],
]);

const MACHINE_PROOF_WORK_MAP = Object.freeze([
  [
    "Dev setup and handover proof",
    "USF-226",
    "docs/architecture/dev-readiness-validation-and-handover.md",
    "Confirm a fresh operator can clone, install, bootstrap, run verification, understand failures, and submit a governed PR without private knowledge.",
  ],
  [
    "Bounded Test final acceptance proof",
    "USF-234",
    "docs/architecture/test-readiness-final-acceptance-gate.md",
    "Confirm every Test child issue and final gate maps to merged evidence before staging QA trusts service-backed claims.",
  ],
  [
    "Test environment service contract",
    "USF-235",
    "docs/architecture/test-environment-service-contract.json",
    "Confirm service-backed capabilities use composed backing services and not in-memory substitutes.",
  ],
  [
    "Composed semantic harness",
    "USF-236",
    "docs/architecture/composed-semantic-test-harness.json",
    "Confirm semantic proof was migrated into composed test-readiness evidence and is not historical scaffolding.",
  ],
  [
    "Deterministic fixtures",
    "USF-237",
    "docs/architecture/deterministic-test-fixture-lifecycle.json",
    "Confirm synthetic seed, reset, cleanup, teardown, repeatability, and no-real-tenant-data posture.",
  ],
  [
    "Command and CI gate",
    "USF-238",
    "docs/architecture/test-readiness-command-surface-and-ci-gate.json",
    "Confirm canonical commands, local/CI alignment, Sonar preservation, and command dependency mappings.",
  ],
  [
    "Obligation manifest and validator gate",
    "USF-239",
    "docs/architecture/semantic-service-test-obligation-manifest.json",
    "Confirm every required capability/test obligation is manifest-backed and validator-enforced.",
  ],
  [
    "Missing evidence planted-defect gate",
    "USF-247",
    "docs/architecture/missing-evidence-planted-defects-regression-gate.json",
    "Confirm validators fail closed when required evidence or per-rule planted defects are missing.",
  ],
  [
    "Test completion and staging-entry gate",
    "USF-260",
    "docs/architecture/test-environment-completion-and-staging-entry-gate.json",
    "Confirm Test completion is valid before staging-specific enablement or staging QA proceeds.",
  ],
  [
    "External HTTP semantics gate",
    "USF-267",
    "docs/architecture/pre-staging-external-http-semantics-readiness-gate.json",
    "Confirm external HTTP, cache, observability, and non-destructive smoke gates support starting staging-specific enablement without claiming staging readiness.",
  ],
  [
    "Enterprise control-support foundation",
    "USF-272",
    "docs/architecture/enterprise-origin-server-semantics.json",
    "Confirm ISMS-supporting control evidence exists where relevant, without treating it as ISO certification or SOC readiness.",
  ],
]);

const ENTERPRISE_STAGING_REQUIREMENTS = Object.freeze([
  ["ISMS scope and interested parties", "Scope, context, stakeholders, information assets, and proof-cockpit boundary are visible.", "/proof/enterprise/isms-scope"],
  ["Risk ownership and treatment", "Each staging proof risk has an owner, treatment, review date, and exception path.", "/proof/enterprise/risk-register"],
  ["Control applicability", "Statement of Applicability-style rows show applicable, not applicable, owner, evidence, and rationale.", "/proof/enterprise/statement-of-applicability"],
  ["Asset and supplier inventory", "Public domains, self-hosted origin, repository, CI, DNS, GitHub, Linear, and dependencies are inventory-linked.", "/proof/enterprise/assets"],
  ["Access and privileged operations", "SSO, MFA, break-glass, operator SSH, privileged access, and access-review evidence are represented.", "/proof/enterprise/access-review"],
  ["Secrets and cryptography", "Secret boundaries, certificate lifecycle, key ownership, rotation, and no-secret exposure are represented.", "/proof/enterprise/secrets-crypto"],
  ["Audit and retention", "Audit events, evidence retention, tamper boundary, redaction, and generated-report non-authority are explicit.", "/proof/enterprise/audit-retention"],
  ["Backup and recovery", "Backup, restore, DR, BCP, route/origin recovery, and restore-test evidence are visible.", "/proof/enterprise/backup-dr"],
  ["Change and release governance", "PR, review, validation, deployment, rollback, and Linear reconciliation are visible.", "/proof/enterprise/change-release"],
  ["Supply chain and vulnerability", "SBOM/provenance posture, dependency pins, licence posture, vulnerability handling, and Sonar evidence are visible.", "/proof/enterprise/supply-chain"],
  ["Privacy and tenant boundary", "No real tenant data, retention/deletion/export, residency, tenant isolation, and data minimisation boundaries are visible.", "/proof/enterprise/privacy-data-protection"],
  ["Operational resilience", "Capacity, rate limits, abuse controls, SLO posture, observability, alerting, runbooks, and incident response are represented.", "/proof/enterprise/resilience-capacity"],
  ["Continual improvement", "Nonconformity, corrective action, management review, internal audit, and improvement loop evidence are represented.", "/proof/enterprise/management-review"],
]);

const ISO_SUPPORT_FIELDS = Object.freeze([
  "scope boundary",
  "risk owner",
  "control owner",
  "evidence owner",
  "applicability rationale",
  "evidence source",
  "validation command or human action",
  "review cadence",
  "retention period",
  "exception or risk acceptance path",
  "non-claim statement",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value) {
  return String(value ?? "")
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((part) => part.trim());
}

function stripBackticks(value) {
  return String(value ?? "").replaceAll("`", "");
}

function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function parseMatrixCapabilities() {
  const matrix = readFileSync(MATRIX_PATH, "utf8");
  const capabilitySection = matrix
    .split("## Capability Matrix")[1]
    ?.split("\n## ")[0];
  if (!capabilitySection) {
    throw new Error("proof-cockpit-capability-matrix-section-missing");
  }
  return capabilitySection
    .split("\n")
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const [number, domain, capability, slice, semanticTarget, requiredFollowUp, evidenceSummary] =
        splitMarkdownRow(line);
      const rowNumber = Number(number);
      const capabilityId = `cap-${String(rowNumber).padStart(3, "0")}-${slugify(capability)}`;
      const contractMatch = String(semanticTarget).match(/semantic-contract\.([a-z0-9-]+)/);
      const semanticContractId = contractMatch ? `semantic-contract.${contractMatch[1]}` : "";
      const proofTokens = [...String(evidenceSummary).matchAll(/proof=([^|]+)/g)]
        .flatMap((match) => String(match[1]).split(";"))
        .map((token) => token.trim())
        .filter(Boolean);
      return {
        rowNumber,
        id: capabilityId,
        domain: stripBackticks(domain),
        name: capability,
        slice: stripBackticks(slice),
        semanticTarget: stripBackticks(semanticTarget),
        semanticContractId,
        requiredFollowUp,
        evidenceSummary,
        proofTokens,
      };
    });
}

function loadSemanticContracts() {
  const entries = new Map();
  for (const fileName of readdirSync(CONTRACT_DIR).filter((name) => name.endsWith(".json"))) {
    const path = join(CONTRACT_DIR, fileName);
    const data = JSON.parse(readFileSync(path, "utf8"));
    entries.set(data.id, {
      id: data.id,
      title: data.title,
      capability: data.capability,
      domain: data.capabilityDomain,
      lifecycleState: data.lifecycleState,
      path: `spec/instances/semantic-contract/${fileName}`,
      sourceRefs: data.sourceRefs ?? [],
      facets: data.facets ?? {},
    });
  }
  return entries;
}

function loadServices() {
  const catalogue = readJsonOrNull(SERVICE_CATALOGUE_PATH) ?? {};
  const integrationMatrix = readJsonOrNull(COMPOSED_SERVICE_MATRIX_PATH) ?? {};
  const integrationRows = new Map(
    (integrationMatrix.serviceIntegrationRows ?? []).map((row) => [row.serviceCatalogueId ?? row.serviceId, row]),
  );
  const services = (catalogue.services ?? []).map((service) => {
    const integration = integrationRows.get(service.serviceId) ?? {};
    const profileNames = [
      ...new Set([...(service.composeProfiles ?? []), ...(integration.composeProfiles ?? [])].filter(Boolean)),
    ].sort();
    return {
      ...service,
      integration,
      profileNames,
      firstPassClickThroughState: integration.proofCommand ? "catalogue-linked" : "needs-runtime-wiring",
    };
  });
  return {
    services,
    servicesById: new Map(services.map((service) => [service.serviceId, service])),
    profileRows: integrationMatrix.profileIntegrationRows ?? [],
  };
}

function buildData() {
  const contracts = loadSemanticContracts();
  const serviceCatalogue = loadServices();
  const capabilities = parseMatrixCapabilities().map((capability) => {
    const contract = contracts.get(capability.semanticContractId);
    const serviceRefs = servicesForCapability(capability, serviceCatalogue.servicesById);
    const scenarioIds = [`${capability.id}-happy-path`, `${capability.id}-negative-path`];
    const evidenceIds = [`${capability.id}-semantic-contract`, `${capability.id}-runtime-evidence`];
    return {
      ...capability,
      contract,
      firstPassState: contract ? "prototype-listed" : "stubbed",
      scenarioIds,
      evidenceIds,
      signoffState: "not-available-first-pass",
      roles: rolesForDomain(capability.domain),
      serviceRefs,
      serviceNames: DOMAIN_SERVICES[capability.domain] ?? ["backing services not classified in first pass"],
    };
  });
  const scenarios = new Map();
  const evidence = new Map();
  for (const capability of capabilities) {
    scenarios.set(capability.scenarioIds[0], {
      id: capability.scenarioIds[0],
      capabilityId: capability.id,
      name: `${capability.name} happy path`,
      pathType: "happy path",
      role: capability.roles[0] ?? ROLES[1],
      expectedResult: "First-pass placeholder for the successful staging exercise path.",
    });
    scenarios.set(capability.scenarioIds[1], {
      id: capability.scenarioIds[1],
      capabilityId: capability.id,
      name: `${capability.name} negative path`,
      pathType: "negative path",
      role: "anonymous visitor denial persona",
      expectedResult: "First-pass placeholder for denied, invalid, tenant mismatch, degraded, or timeout behaviour.",
    });
    evidence.set(capability.evidenceIds[0], {
      id: capability.evidenceIds[0],
      capabilityId: capability.id,
      title: "Semantic contract link",
      status: capability.contract ? "available-repository-link" : "missing",
      target: capability.contract?.path ?? capability.semanticTarget,
    });
    evidence.set(capability.evidenceIds[1], {
      id: capability.evidenceIds[1],
      capabilityId: capability.id,
      title: "Runtime staging evidence placeholder",
      status: "missing-first-pass-placeholder",
      target: "runtime route/API, audit, logs, metrics, traces, alerts, screenshots, and immutable artifact are not wired in this first pass",
    });
  }
  return { capabilities, contracts, scenarios, evidence, ...serviceCatalogue };
}

function servicesForCapability(capability, servicesById) {
  const ids = DOMAIN_SERVICE_IDS[capability.domain] ?? [];
  return ids.map((id) => servicesById.get(id)).filter(Boolean);
}

function rolesForDomain(domain) {
  const base = {
    "identity-access": ["tenant admin", "delegated admin", "auditor", "break-glass operator"],
    authentication: ["anonymous visitor denial persona", "authenticated user", "tenant admin", "platform operator"],
    "entitlements-billing": ["billing admin", "tenant admin", "auditor"],
    "data-platform": ["tenant admin", "platform operator", "auditor"],
    "events-workflow": ["developer", "platform operator", "support operator"],
    "observability-ops": ["platform operator", "support operator", "auditor", "read-only observer"],
    "security-governance": ["platform operator", "auditor", "break-glass operator"],
    "developer-platform": ["developer", "platform operator", "tenant admin"],
    "support-admin": ["support operator", "tenant admin", "auditor"],
  };
  return base[domain] ?? ["tenant member", "tenant admin", "platform operator", "auditor"];
}

function getSourceSha() {
  if (process.env.USF_SOURCE_SHA) {
    return process.env.USF_SOURCE_SHA;
  }
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body>
<header>
<h1>${escapeHtml(title)}</h1>
<nav>
<a href="/proof">Home</a> |
<a href="/proof/qa">QA</a> |
<a href="/proof/capabilities">Capabilities</a> |
<a href="/proof/services">Services</a> |
<a href="/proof/roles">Roles</a> |
<a href="/proof/audit">Audit</a> |
<a href="/proof/observability">Observability</a> |
<a href="/proof/fixtures">Fixtures</a> |
<a href="/proof/alerts">Alerts</a> |
<a href="/proof/signoff">Signoff</a> |
<a href="/proof/result">Result</a> |
<a href="/proof/enterprise">Enterprise</a> |
<a href="/proof/runbook">Runbook</a>
</nav>
</header>
<main>
${body}
</main>
</body>
</html>
`;
}

function warningsBlock() {
  return `<section>
<h2>Warnings</h2>
<ul>
<li>This is a first-pass staging proof cockpit prototype for review and feedback.</li>
<li>It is not final acceptance and it does not complete ${LINEAR_ISSUE}.</li>
<li>SSO enforcement is not wired in this local first-pass route. Staging exposure must put this route behind the authorised staging SSO boundary before any real use.</li>
<li>Runtime staging evidence, audit links, observability links, alerts, screenshots, role switching, and immutable artifacts are placeholders unless explicitly shown as repository links.</li>
<li>USF-289 is complete in live Linear, but this cockpit still treats live origin and deployment metadata as informational warnings until final USF-290 proofing wires them.</li>
</ul>
</section>`;
}

function nonClaimsBlock() {
  return `<section>
<h2>Non-claims</h2>
<ul>${NON_CLAIMS.map((claim) => `<li>${escapeHtml(claim)}</li>`).join("")}</ul>
</section>`;
}

function table(headers, rows) {
  return `<table>
<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
<tbody>${rows.join("")}</tbody>
</table>`;
}

function orderedList(items) {
  return `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function unorderedList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function serviceLink(service) {
  return `<a href="/proof/services/${escapeHtml(service.serviceId)}">${escapeHtml(service.displayName ?? service.serviceId)}</a>`;
}

function serviceSummary(service) {
  const integration = service.integration ?? {};
  return [
    serviceLink(service),
    `profiles: ${(service.profileNames ?? []).join(", ") || "missing-first-pass"}`,
    `claim: ${integration.testReadinessClaimAllowed ?? "unknown"}`,
    `state: ${service.firstPassClickThroughState}`,
  ].join(" - ");
}

function capabilityQaEvidenceRows(capability) {
  const rows = [
    ["Semantic contract", capability.contract?.path ?? capability.semanticTarget, capability.contract ? "repository-link" : "missing"],
    ["Route or API", capability.evidenceSummary, "needs-runtime-wiring"],
    ["Service click-through", `${capability.serviceRefs.length} linked service rows`, capability.serviceRefs.length ? "catalogue-linked" : "missing-first-pass"],
    ["Happy path", capability.scenarioIds[0], "first-pass placeholder"],
    ["Negative path", capability.scenarioIds[1], "first-pass placeholder"],
    ["Audit", "actor, tenant, action, result, timestamp, correlation id", "missing-first-pass"],
    ["Observability", "trace id, log, metric, dashboard or runbook link", "missing-first-pass"],
    ["Alert", "alert name, condition, route/service, evidence link", "missing-first-pass"],
    ["Fixture lifecycle", "seed, reset, cleanup, teardown, residual-state evidence", "missing-first-pass"],
    ["Screenshot or artifact", "immutable artifact link and source SHA", "missing-first-pass"],
    ["Human signoff", "Matthew confirmation after final proofing", "disabled-first-pass"],
  ];
  return rows.map(
    ([artifact, required, state]) =>
      `<tr><td>${escapeHtml(artifact)}</td><td>${escapeHtml(required)}</td><td>${escapeHtml(state)}</td></tr>`,
  );
}

function proofLadderRows(capability) {
  return PROOF_LADDER_LEVELS.map(([level, source, auditorAction, state]) => {
    const resolvedSource = source === "/proof/capabilities/:capabilityId" ? `/proof/capabilities/${capability.id}` : source;
    return `<tr>
<td>${escapeHtml(level)}</td>
<td>${escapeHtml(resolvedSource)}</td>
<td>${escapeHtml(auditorAction)}</td>
<td>${escapeHtml(state)}</td>
</tr>`;
  });
}

function machineProofWorkRows() {
  return MACHINE_PROOF_WORK_MAP.map(
    ([proofArea, issue, evidenceSource, auditorWork]) =>
      `<tr>
<td>${escapeHtml(proofArea)}</td>
<td>${escapeHtml(issue)}</td>
<td>${escapeHtml(evidenceSource)}</td>
<td>${escapeHtml(auditorWork)}</td>
</tr>`,
  );
}

function enterpriseRequirementRows() {
  return ENTERPRISE_STAGING_REQUIREMENTS.map(
    ([requirement, evidence, route]) =>
      `<tr>
<td>${escapeHtml(requirement)}</td>
<td>${escapeHtml(evidence)}</td>
<td><a href="${escapeHtml(route)}">${escapeHtml(route)}</a></td>
<td>missing-first-pass-placeholder</td>
</tr>`,
  );
}

function isoSupportRows(topicId) {
  return ISO_SUPPORT_FIELDS.map(
    (field) =>
      `<tr>
<td>${escapeHtml(field)}</td>
<td>${escapeHtml(topicId)}</td>
<td>missing-first-pass-placeholder</td>
<td>required before formal enterprise evidence acceptance</td>
</tr>`,
  );
}

function roleChecklistRows(capability) {
  return capability.roles.map((role) => `<tr>
<td>${escapeHtml(role)}</td>
<td>Perform role-appropriate happy path for ${escapeHtml(capability.name)} with synthetic tenant context.</td>
<td>Perform denial, escalation, tenant mismatch, invalid input, or read-only check appropriate to ${escapeHtml(role)}.</td>
<td>Capture actor role, tenant, action, result, audit id, correlation id, trace id, service state, and screenshot artifact.</td>
<td><label><input type="checkbox" disabled> ${escapeHtml(role)} QA not performed in first pass</label></td>
</tr>`);
}

function routeSummaryRows() {
  return ROUTE_SUMMARIES.map(
    ([route, delivers, humanAction, evidence]) =>
      `<tr><td>${routeToLink(route)}</td><td>${escapeHtml(delivers)}</td><td>${escapeHtml(humanAction)}</td><td>${escapeHtml(evidence)}</td></tr>`,
  );
}

function renderHome(data) {
  const metadata = [
    `<tr><th>Source SHA</th><td>${escapeHtml(getSourceSha())}</td></tr>`,
    `<tr><th>Environment</th><td>${escapeHtml(process.env.USF_PROOF_ENVIRONMENT ?? "local-first-pass")}</td></tr>`,
    `<tr><th>Deployment</th><td>${escapeHtml(process.env.USF_DEPLOYMENT_ID ?? "unavailable-first-pass")}</td></tr>`,
    `<tr><th>Capability rows</th><td>${data.capabilities.length}</td></tr>`,
  ].join("");
  return layout(
    "USF staging proof cockpit",
    `<p>This plain HTML cockpit is a first-pass review surface for ${LINEAR_ISSUE}. It is intended to show what will land, gather corrections, and make missing evidence visible.</p>
${warningsBlock()}
<section>
<h2>Current metadata</h2>
<table><tbody>${metadata}</tbody></table>
</section>
<section>
<h2>Route map</h2>
${table(["Route", "Delivers", "Human QA action", "Required evidence"], routeSummaryRows())}
</section>
${nonClaimsBlock()}`,
  );
}

function routeToLink(route) {
  if (route.includes(":capabilityId")) {
    return `${escapeHtml(route)} - dynamic detail from <a href="/proof/capabilities">capability list</a>`;
  }
  if (route.includes(":scenarioId")) {
    return `${escapeHtml(route)} - dynamic scenario detail from capability pages`;
  }
  if (route.includes(":evidenceId")) {
    return `${escapeHtml(route)} - dynamic evidence detail from capability pages`;
  }
  if (route.includes(":serviceId")) {
    return `${escapeHtml(route)} - dynamic service detail from <a href="/proof/services">service inventory</a>`;
  }
  return `<a href="${escapeHtml(route)}">${escapeHtml(route)}</a>`;
}

function renderQa(data) {
  const artifactRows = [
    ["Capability evidence", "semantic contract, route/API proof, role/persona, happy path, negative path, screenshot", "/proof/capabilities"],
    ["Service evidence", "compose profile, health/readiness, seed/reset/cleanup, safe operation, proof command", "/proof/services"],
    ["Audit evidence", "actor, tenant, action, result, timestamp, correlation id, immutable link", "/proof/audit"],
    ["Observability evidence", "trace id, log line, metric/latency bucket, dashboard or runbook link", "/proof/observability"],
    ["Fixture evidence", "synthetic dataset, last reset, cleanup, residual state, no real tenant data", "/proof/fixtures"],
    ["Alert evidence", "alert name, trigger condition, route/service, expected severity, evidence link", "/proof/alerts"],
    ["Enterprise evidence", "ISMS-supporting control page, owner, evidence source, exception/risk decision", "/proof/enterprise"],
    ["Result evidence", "final decision remains disabled until final proofing is implemented", "/proof/result"],
  ].map(
    ([name, required, href]) =>
      `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(required)}</td><td><a href="${escapeHtml(href)}">${escapeHtml(href)}</a></td></tr>`,
  );
  return layout(
    "Proof QA workflow",
    `<p>This page is the first-pass human confirmation workflow for staging proof preparation. It describes what the auditor must do; it does not mark anything accepted.</p>
${warningsBlock()}
<section>
<h2>Human confirmation sequence</h2>
${orderedList(HUMAN_QA_STEPS)}
</section>
<section>
<h2>Proof ladder prerequisite check</h2>
<p>Staging QA is only meaningful after the auditor has confirmed the dev and test evidence layers that the staging exercise builds on. This page exposes those prerequisite references but does not re-close or re-claim them.</p>
${table(
      ["Layer", "Evidence source", "Auditor action", "State"],
      PROOF_LADDER_LEVELS.map(
        ([layer, source, action, state]) =>
          `<tr><td>${escapeHtml(layer)}</td><td>${escapeHtml(source)}</td><td>${escapeHtml(action)}</td><td>${escapeHtml(state)}</td></tr>`,
      ),
    )}
</section>
<section>
<h2>Machine proof to human work map</h2>
<p>Machine-completed proof is not enough for staging QA signoff by itself. The auditor must connect each proof area to the human verification work below.</p>
${table(["Proof area", "Issue", "Evidence source", "Human auditor work required"], machineProofWorkRows())}
</section>
<section>
<h2>Required evidence bundle per accepted capability</h2>
${table(["Evidence area", "Required content", "Cockpit route"], artifactRows)}
</section>
<section>
<h2>Stop conditions</h2>
${unorderedList(STOP_CONDITIONS)}
</section>
<section>
<h2>Current first-pass scope</h2>
<p>${data.capabilities.length} capability rows and ${data.services.length} service catalogue rows are visible for review. Runtime evidence remains explicitly missing unless a row links to existing repository evidence.</p>
</section>
${nonClaimsBlock()}`,
  );
}

function renderCapabilities(data) {
  const rows = data.capabilities.map((capability) => {
    return `<tr>
<td><a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.name)}</a></td>
<td>${escapeHtml(capability.domain)}</td>
<td>${escapeHtml(capability.semanticTarget)}</td>
<td>${escapeHtml(capability.firstPassState)}</td>
<td>${capability.scenarioIds.length}</td>
<td>${capability.evidenceIds.length + capability.proofTokens.length}</td>
<td>${escapeHtml(capability.signoffState)}</td>
</tr>`;
  });
  const grouped = [...new Set(data.capabilities.map((capability) => capability.domain))]
    .sort()
    .map((domain) => `<li>${escapeHtml(domain)}: ${data.capabilities.filter((capability) => capability.domain === domain).length}</li>`)
    .join("");
  return layout(
    "Proof capabilities",
    `<p>Capability rows are parsed from docs/architecture/capability-source-coverage-matrix.md. First-pass states are not acceptance states.</p>
<section><h2>Domain grouping</h2><ul>${grouped}</ul></section>
${table(["Capability", "Domain", "Semantic target", "First-pass state", "Scenario count", "Evidence count", "Signoff state"], rows)}`,
  );
}

function renderServices(data) {
  const rows = data.services.map((service) => {
    const integration = service.integration ?? {};
    return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml(service.serviceOwner ?? "missing")}</td>
<td>${escapeHtml(service.assetInventoryClass ?? "missing")}</td>
<td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td>
<td>${escapeHtml(integration.integrationDisposition ?? service.environmentDisposition ?? "missing")}</td>
<td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
  });
  const profileRows = data.profileRows.map(
    (profile) => `<tr>
<td>${escapeHtml(profile.profile)}</td>
<td>${escapeHtml(profile.composeTarget)}</td>
<td>${escapeHtml(profile.serviceCount)}</td>
<td>${escapeHtml(profile.mustStart)}</td>
<td>${escapeHtml(profile.mustSeed)}</td>
<td>${escapeHtml(profile.mustExercise)}</td>
<td>${escapeHtml(profile.mustTeardown)}</td>
</tr>`,
  );
  return layout(
    "Proof services",
    `<p>Service rows come from the repository service catalogue and composed integration matrix. These links are the first-pass click-through surface for service-backed proof validation.</p>
<section>
<h2>Service inventory</h2>
${table(["Service", "Owner", "Asset class", "Profiles", "Integration disposition", "Proof command", "Click-through state"], rows)}
</section>
<section>
<h2>Compose profile exercise requirements</h2>
${table(["Profile", "Target", "Service count", "Must start", "Must seed", "Must exercise", "Must teardown"], profileRows)}
</section>`,
  );
}

function renderService(data, serviceId) {
  const service = data.servicesById.get(serviceId);
  if (!service) {
    return notFound(`Service ${serviceId} was not found.`);
  }
  const integration = service.integration ?? {};
  const lifecycle = integration.lifecycleApi ?? {};
  const evidenceTests = integration.evidenceTests ?? [];
  const qaRows = [
    ["Health/readiness", "Open authorised service health or readiness surface; record status and timestamp.", "missing-runtime-link-first-pass"],
    ["Fixture seed", `Confirm seeder ${lifecycle.seederId ?? "missing"} and fixture ${integration.fixtureSeedId ?? "missing"}.`, "missing-runtime-link-first-pass"],
    ["Safe operation", integration.safeOperationEvidence ?? "Perform one non-destructive operation and record result.", "missing-runtime-link-first-pass"],
    ["Negative/degraded path", "Exercise unavailable, denied, invalid, or timeout path where the service contract requires it.", "missing-first-pass"],
    ["Audit", service.auditRequirement ?? service.auditPosture ?? "Record audit event evidence.", "missing-first-pass"],
    ["Observability", "Capture log, metric, trace, and dashboard/runbook link.", "missing-first-pass"],
    ["Reset/cleanup", `Confirm resetter ${lifecycle.resetterId ?? "missing"} and cleanup ${lifecycle.cleanupId ?? "missing"}.`, "missing-first-pass"],
    ["Teardown", `Confirm teardown ${lifecycle.teardownId ?? "missing"}.`, "missing-first-pass"],
  ].map(
    ([area, action, status]) =>
      `<tr><td>${escapeHtml(area)}</td><td>${escapeHtml(action)}</td><td>${escapeHtml(status)}</td></tr>`,
  );
  return layout(
    service.displayName ?? service.serviceId,
    `<p><a href="/proof/services">Back to services</a></p>
<table><tbody>
<tr><th>Service id</th><td>${escapeHtml(service.serviceId)}</td></tr>
<tr><th>Purpose</th><td>${escapeHtml(service.purpose ?? "missing")}</td></tr>
<tr><th>Service owner</th><td>${escapeHtml(service.serviceOwner ?? "missing")}</td></tr>
<tr><th>Risk owner</th><td>${escapeHtml(service.riskOwner ?? "missing")}</td></tr>
<tr><th>Control owner</th><td>${escapeHtml(service.controlOwner ?? "missing")}</td></tr>
<tr><th>Provider boundary</th><td>${escapeHtml(service.providerBoundary ?? "missing")}</td></tr>
<tr><th>Data classification</th><td>${escapeHtml(service.dataClassification ?? "missing")}</td></tr>
<tr><th>Tenant boundary</th><td>${escapeHtml(service.tenantBoundary ?? "missing")}</td></tr>
<tr><th>Access posture</th><td>${escapeHtml(service.accessPosture ?? "missing")}</td></tr>
<tr><th>Auth requirement</th><td>${escapeHtml(service.authRequirement ?? "missing")}</td></tr>
<tr><th>Audit posture</th><td>${escapeHtml(service.auditPosture ?? "missing")}</td></tr>
<tr><th>Secret posture</th><td>${escapeHtml(service.secretPosture ?? "missing")}</td></tr>
<tr><th>Backup/restore posture</th><td>${escapeHtml(service.backupRestorePosture ?? "missing")}</td></tr>
<tr><th>Retention posture</th><td>${escapeHtml(service.retentionPosture ?? "missing")}</td></tr>
<tr><th>Compose profiles</th><td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td></tr>
<tr><th>Proof command</th><td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td></tr>
<tr><th>Proof script</th><td>${escapeHtml(integration.proofScript ?? "missing-first-pass")}</td></tr>
<tr><th>Test suite</th><td>${escapeHtml(integration.testSuitePath ?? "missing-first-pass")}</td></tr>
<tr><th>Runtime click-through URL</th><td>missing-first-pass; final cockpit must link only to authorised staging service surfaces or runbooks</td></tr>
</tbody></table>
<section>
<h2>Human service click-through checklist</h2>
${table(["Area", "Required human action", "First-pass status"], qaRows)}
</section>
<section>
<h2>Evidence tests</h2>
${unorderedList(evidenceTests.length ? evidenceTests : ["missing-first-pass"])}
</section>
<section>
<h2>Service stop conditions</h2>
${unorderedList(STOP_CONDITIONS)}
</section>`,
  );
}

function renderCapability(data, capabilityId) {
  const capability = data.capabilities.find((candidate) => candidate.id === capabilityId);
  if (!capability) {
    return notFound(`Capability ${capabilityId} was not found.`);
  }
  const surfaceChecklist = [
    "semantic target visible",
    "route/API references placeholder visible",
    "required roles visible",
    "required backend services visible",
    "happy path scenario placeholder visible",
    "negative path scenario placeholder visible",
    "audit evidence placeholder visible",
    "logs metrics traces placeholder visible",
    "alert evidence placeholder visible",
    "screenshot evidence placeholder visible",
    "synthetic data/reset placeholder visible",
    "manual signoff checkbox placeholder visible",
    "immutable artifact placeholder visible",
  ];
  const serviceItems = capability.serviceRefs.length
    ? capability.serviceRefs.map((service) => `<li>${serviceSummary(service)}</li>`).join("")
    : capability.serviceNames.map((service) => `<li>${escapeHtml(service)} - needs-runtime-wiring</li>`).join("");
  const qaServiceRows = capability.serviceRefs.length
    ? capability.serviceRefs.map((service) => {
        const integration = service.integration ?? {};
        return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td>
<td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td>
<td>${escapeHtml(integration.fixtureSeedId ?? "missing-first-pass")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
      })
    : [`<tr><td colspan="5">No repository service catalogue rows mapped in this first pass.</td></tr>`];
  return layout(
    capability.name,
    `<p><a href="/proof/capabilities">Back to capabilities</a></p>
<table><tbody>
<tr><th>Capability id</th><td>${escapeHtml(capability.id)}</td></tr>
<tr><th>Domain</th><td>${escapeHtml(capability.domain)}</td></tr>
<tr><th>Slice</th><td>${escapeHtml(capability.slice)}</td></tr>
<tr><th>Semantic target</th><td>${escapeHtml(capability.semanticTarget)}</td></tr>
<tr><th>Semantic contract path</th><td>${capability.contract ? escapeHtml(capability.contract.path) : "missing-first-pass"}</td></tr>
<tr><th>First-pass state</th><td>${escapeHtml(capability.firstPassState)}</td></tr>
</tbody></table>
<section><h2>Known route/API references</h2><p>${escapeHtml(capability.evidenceSummary)}</p></section>
<section><h2>Required roles</h2><ul>${capability.roles.map((role) => `<li>${escapeHtml(role)}</li>`).join("")}</ul></section>
<section><h2>Dev to Test to Staging proof ladder</h2>
${table(["Layer", "Evidence source", "Auditor action", "State"], proofLadderRows(capability))}
</section>
<section><h2>Machine proof to human work map</h2>
${table(["Proof area", "Issue", "Evidence source", "Human auditor work required"], machineProofWorkRows())}
</section>
<section><h2>Human QA action plan</h2>${orderedList(HUMAN_QA_STEPS)}</section>
<section><h2>Role-specific QA checklist placeholders</h2>
${table(["Role", "Happy path action", "Negative or permission action", "Evidence required", "First-pass state"], roleChecklistRows(capability))}
</section>
<section><h2>Required backend services</h2><ul>${serviceItems}</ul></section>
<section><h2>Compose service click-through requirements</h2>
${table(["Service", "Profiles", "Proof command", "Fixture seed", "State"], qaServiceRows)}
</section>
<section><h2>Scenarios</h2><ul>${capability.scenarioIds
      .map((id) => `<li><a href="/proof/scenarios/${escapeHtml(id)}">${escapeHtml(id)}</a> - first-pass placeholder</li>`)
      .join("")}</ul></section>
<section><h2>Evidence</h2><ul>${capability.evidenceIds
      .map((id) => `<li><a href="/proof/evidence/${escapeHtml(id)}">${escapeHtml(id)}</a></li>`)
      .join("")}</ul></section>
<section><h2>Formal evidence required before acceptance</h2>
${table(["Artifact", "Required content", "Current state"], capabilityQaEvidenceRows(capability))}
</section>
<section><h2>Capability surface inventory placeholders</h2><ul>${surfaceChecklist
      .map((item) => `<li><label><input type="checkbox" disabled> ${escapeHtml(item)}</label></li>`)
      .join("")}</ul></section>
<section><h2>Manual signoff</h2><p><label><input type="checkbox" disabled> Matthew final acceptance unavailable in first pass</label></p></section>
<p><a href="/proof/enterprise">Enterprise evidence</a></p>`,
  );
}

function renderScenario(data, scenarioId) {
  const scenario = data.scenarios.get(scenarioId);
  if (!scenario) {
    return notFound(`Scenario ${scenarioId} was not found.`);
  }
  const capability = data.capabilities.find((candidate) => candidate.id === scenario.capabilityId);
  const scenarioSteps = [
    `Open the capability page for ${capability?.name ?? scenario.capabilityId}.`,
    `Select persona ${scenario.role} and synthetic tenant context.`,
    `Perform the ${scenario.pathType} action using only synthetic data and authorised staging proof surfaces.`,
    "Capture the visible result, HTTP/API response or route state, and screenshot or equivalent artifact.",
    "Record audit event, correlation id, trace id, log/metric evidence, alert evidence, and service state.",
    "Run or record reset and cleanup evidence before any signoff decision.",
  ];
  return layout(
    scenario.name,
    `<p><a href="/proof/capabilities/${escapeHtml(scenario.capabilityId)}">Back to capability</a></p>
<table><tbody>
<tr><th>Status</th><td>first-pass placeholder</td></tr>
<tr><th>Capability</th><td>${escapeHtml(capability?.name ?? scenario.capabilityId)}</td></tr>
<tr><th>Persona</th><td>${escapeHtml(scenario.role)}</td></tr>
<tr><th>Tenant</th><td>synthetic tenant placeholder</td></tr>
<tr><th>Expected result</th><td>${escapeHtml(scenario.expectedResult)}</td></tr>
<tr><th>Expected audit event</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Expected observability</th><td>missing correlation id, trace id, log, metric, and alert links in first pass</td></tr>
<tr><th>Evidence links</th><td>generated placeholders only</td></tr>
</tbody></table>
<section><h2>Dev to Test to Staging proof ladder</h2>
${capability ? table(["Layer", "Evidence source", "Auditor action", "State"], proofLadderRows(capability)) : "<p>Capability proof ladder unavailable.</p>"}
</section>
<section><h2>QA steps</h2>${orderedList(scenarioSteps)}</section>
<section><h2>Evidence capture fields</h2>
${table(
      ["Field", "Required value", "First-pass state"],
      [
        ["Actor and role", scenario.role, "placeholder"],
        ["Tenant", "synthetic tenant id", "placeholder"],
        ["Correlation id", "proof run correlation id", "missing-first-pass"],
        ["Trace id", "distributed trace id or equivalent", "missing-first-pass"],
        ["Audit event", "event id and immutable link", "missing-first-pass"],
        ["Service state", "linked service proof state", "missing-first-pass"],
        ["Screenshot/artifact", "immutable artifact link", "missing-first-pass"],
      ].map(
        ([field, required, state]) =>
          `<tr><td>${escapeHtml(field)}</td><td>${escapeHtml(required)}</td><td>${escapeHtml(state)}</td></tr>`,
      ),
    )}
</section>`,
  );
}

function renderRoles(data) {
  const rows = ROLES.map((role) => {
    const requiringRole = data.capabilities.filter((capability) => capability.roles.includes(role)).length;
    return `<tr>
<td>${escapeHtml(role)}</td>
<td>${requiringRole}</td>
<td>first-pass placeholder</td>
<td>role-switch control not implemented; final proof must use authorised role login or safe role boundary</td>
<td>audit placeholder must record actor role, tenant, action, result, and correlation id before final proof</td>
</tr>`;
  });
  return layout(
    "Proof roles",
    `${warningsBlock()}${table(["Role", "Capabilities requiring role", "Synthetic persona state", "Role-switch proof", "Audit"], rows)}`,
  );
}

function renderEvidence(data, evidenceId) {
  const record = data.evidence.get(evidenceId);
  if (!record) {
    return notFound(`Evidence record ${evidenceId} was not found.`);
  }
  return layout(
    record.title,
    `<p><a href="/proof/capabilities/${escapeHtml(record.capabilityId)}">Back to capability</a></p>
<table><tbody>
<tr><th>Evidence id</th><td>${escapeHtml(record.id)}</td></tr>
<tr><th>Status</th><td>${escapeHtml(record.status)}</td></tr>
<tr><th>Semantic contract</th><td>${escapeHtml(record.target)}</td></tr>
<tr><th>Route/API proof</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Human QA action record</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Service click-through evidence</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Audit event</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Logs metrics traces</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Alert</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Screenshot</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Role used for QA</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Dev readiness prerequisite evidence</th><td>docs/architecture/dev-readiness-validation-and-handover.md</td></tr>
<tr><th>Test readiness prerequisite evidence</th><td>docs/architecture/test-readiness-final-acceptance-gate.md</td></tr>
<tr><th>Proof run</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Git SHA</th><td>${escapeHtml(getSourceSha())}</td></tr>
<tr><th>PR</th><td>pending draft PR</td></tr>
<tr><th>Linear issue</th><td>${LINEAR_ISSUE}</td></tr>
<tr><th>Runbook</th><td>missing-first-pass-placeholder</td></tr>
</tbody></table>`,
  );
}

function renderMatrixPage(data, kind) {
  const rows = data.capabilities.map((capability) => `<tr>
<td><a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.name)}</a></td>
<td>${escapeHtml(capability.domain)}</td>
<td>missing-first-pass-placeholder</td>
<td>needs-runtime-wiring</td>
<td>correlation id placeholder</td>
</tr>`);
  return layout(titleCase(kind), table(["Capability", "Domain", "Evidence", "Status", "Correlation"], rows));
}

function renderFixtures(data) {
  const domainRows = [...new Set(data.capabilities.map((capability) => capability.domain))]
    .sort()
    .map((domain) => `<tr>
<td>${escapeHtml(domain)}</td>
<td>synthetic-${escapeHtml(domain)}-first-pass</td>
<td>version unavailable</td>
<td>last reset unavailable</td>
<td>residual state unknown</td>
<td>no real tenant data required by final posture; first-pass placeholder only</td>
</tr>`);
  const serviceRows = data.services
    .filter((service) => service.integration?.fixtureSeedId || service.integration?.lifecycleApi)
    .map((service) => {
      const lifecycle = service.integration.lifecycleApi ?? {};
      return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml(service.integration.fixtureSeedId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.seederId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.resetterId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.cleanupId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.teardownId ?? "missing")}</td>
</tr>`;
    });
  return layout(
    "Proof fixtures",
    `<section>
<h2>Domain fixture placeholders</h2>
${table(["Domain", "Fixture set", "Fixture version", "Last reset", "Residual state", "No real tenant data"], domainRows)}
</section>
<section>
<h2>Service lifecycle click-through requirements</h2>
${table(["Service", "Fixture seed", "Seeder", "Resetter", "Cleanup", "Teardown"], serviceRows)}
</section>`,
  );
}

function renderSignoff(data) {
  const rows = data.capabilities.map((capability) => `<tr>
<td><a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.name)}</a></td>
<td>${escapeHtml(capability.firstPassState)}</td>
<td><label><input type="checkbox" disabled> final signoff unavailable</label></td>
</tr>`);
  return layout(
    "Proof signoff",
    `<p>Prototype controls are disabled. Final signoff remains unavailable until final USF-290 proofing is implemented.</p>
${table(["Capability", "State", "Signoff"], rows)}`,
  );
}

function renderResult() {
  return layout(
    "Proof result",
    `<p>Current result: first-pass prototype only.</p>
<p>Eventual target decision text: full staging UI development may begin. Current state: unavailable.</p>
<p>No final acceptance artifact is created in this pass.</p>
${nonClaimsBlock()}`,
  );
}

function renderRunbook(data) {
  const routeRows = routeSummaryRows();
  const serviceCoverageRows = data.services.map((service) => {
    const integration = service.integration ?? {};
    return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td>
<td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td>
<td>${escapeHtml(integration.safeOperationEvidence ?? "missing-first-pass")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
  });
  return layout(
    "Proof auditor runbook",
    `<p>This runbook is the first-pass route and evidence checklist for a formal staging proof audit. It is intentionally explicit about missing evidence and disabled acceptance.</p>
<section>
<h2>Audit sequence</h2>
${orderedList(HUMAN_QA_STEPS)}
</section>
<section>
<h2>Route delivery map</h2>
${table(["Route", "Delivers", "Human QA action", "Required evidence"], routeRows)}
</section>
<section>
<h2>Machine proof to human work map</h2>
${table(["Proof area", "Issue", "Evidence source", "Human auditor work required"], machineProofWorkRows())}
</section>
<section>
<h2>Service click-through coverage</h2>
${table(["Service", "Profiles", "Proof command", "Safe operation evidence", "State"], serviceCoverageRows)}
</section>
<section>
<h2>Stop conditions</h2>
${unorderedList(STOP_CONDITIONS)}
</section>
<section>
<h2>Current route completeness</h2>
<p>${ROUTES.length} route patterns are described. ${data.capabilities.length} capabilities and ${data.services.length} service catalogue rows are visible. Final evidence collection, role execution, and signoff remain unavailable in this first pass.</p>
</section>
${nonClaimsBlock()}`,
  );
}

function renderEnterpriseIndex() {
  return layout(
    "Enterprise evidence",
    `<p>First-pass enterprise pages expose expected evidence surfaces and missing evidence. They do not claim ISO certification, SOC readiness, enterprise readiness, or production readiness.</p>
<section>
<h2>Enterprise staging proof requirements</h2>
<p>These are the enterprise and ISO/IEC 27001-supporting evidence areas that a formal staging proof auditor must verify. They support an ISMS evidence foundation only; they are not certification evidence by themselves.</p>
${table(["Requirement", "Required evidence", "Cockpit route", "First-pass state"], enterpriseRequirementRows())}
</section>
<section>
<h2>ISO-supporting evidence fields</h2>
${unorderedList(ISO_SUPPORT_FIELDS)}
</section>
<section>
<h2>Enterprise topic pages</h2>
${table(
      ["Topic", "Purpose", "First-pass state"],
      ENTERPRISE_TOPICS.map(
        ([slug, title, purpose]) =>
          `<tr><td><a href="/proof/enterprise/${escapeHtml(slug)}">${escapeHtml(title)}</a></td><td>${escapeHtml(purpose)}</td><td>stubbed</td></tr>`,
      ),
    )}
</section>`,
  );
}

function renderEnterpriseTopic(slug) {
  const topic = ENTERPRISE_TOPICS.find(([candidate]) => candidate === slug);
  if (!topic) {
    return notFound(`Enterprise topic ${slug} was not found.`);
  }
  const [id, title, purpose] = topic;
  return layout(
    title,
    `<p><a href="/proof/enterprise">Back to enterprise index</a></p>
<table><tbody>
<tr><th>Topic id</th><td>${escapeHtml(id)}</td></tr>
<tr><th>Purpose</th><td>${escapeHtml(purpose)}</td></tr>
<tr><th>Evidence status</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Evidence owner</th><td>to be assigned during final proofing</td></tr>
<tr><th>Control owner</th><td>to be assigned during final proofing</td></tr>
<tr><th>Validation</th><td>not implemented in first pass</td></tr>
<tr><th>Non-claim</th><td>ISO certification, SOC readiness, enterprise production readiness, and staging readiness are not claimed.</td></tr>
</tbody></table>
<section>
<h2>Formal staging proof checks</h2>
${table(["Field", "Topic", "Current evidence", "Auditor requirement"], isoSupportRows(id))}
</section>
<section>
<h2>Enterprise stop conditions</h2>
${unorderedList([
      "No owner is assigned for a risk, control, evidence source, exception, or review cadence.",
      "A control-support row is treated as ISO certification, SOC readiness, or enterprise production readiness.",
      "Evidence depends on generated reports without raw source, validator, proof, or human confirmation evidence.",
      "Supplier, DNS, origin, CI, repository, Linear, or identity-provider dependencies are omitted from the asset or supplier boundary.",
      "A capability staging signoff lacks role, tenant, audit, observability, fixture, service, and screenshot/artifact evidence.",
    ])}
</section>`,
  );
}

function notFound(message) {
  return {
    status: 404,
    body: layout("Not found", `<p>${escapeHtml(message)}</p><p><a href="/proof">Back to proof home</a></p>`),
  };
}

function html(body) {
  return { status: 200, body };
}

function page(result) {
  return typeof result === "string" ? html(result) : result;
}

export function renderProofCockpit(pathname, data = buildData()) {
  const routePath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (routePath === "/" || routePath === "/proof") {
    return html(renderHome(data));
  }
  if (routePath === "/proof/qa") {
    return html(renderQa(data));
  }
  if (routePath === "/proof/capabilities") {
    return html(renderCapabilities(data));
  }
  if (routePath.startsWith("/proof/capabilities/")) {
    return page(renderCapability(data, decodeURIComponent(routePath.slice("/proof/capabilities/".length))));
  }
  if (routePath === "/proof/services") {
    return html(renderServices(data));
  }
  if (routePath.startsWith("/proof/services/")) {
    return page(renderService(data, decodeURIComponent(routePath.slice("/proof/services/".length))));
  }
  if (routePath.startsWith("/proof/scenarios/")) {
    return page(renderScenario(data, decodeURIComponent(routePath.slice("/proof/scenarios/".length))));
  }
  if (routePath === "/proof/roles") {
    return html(renderRoles(data));
  }
  if (routePath.startsWith("/proof/evidence/")) {
    return page(renderEvidence(data, decodeURIComponent(routePath.slice("/proof/evidence/".length))));
  }
  if (routePath === "/proof/audit") {
    return html(renderMatrixPage(data, "audit"));
  }
  if (routePath === "/proof/observability") {
    return html(renderMatrixPage(data, "observability"));
  }
  if (routePath === "/proof/fixtures") {
    return html(renderFixtures(data));
  }
  if (routePath === "/proof/alerts") {
    return html(renderMatrixPage(data, "alerts"));
  }
  if (routePath === "/proof/signoff") {
    return html(renderSignoff(data));
  }
  if (routePath === "/proof/result") {
    return html(renderResult());
  }
  if (routePath === "/proof/runbook") {
    return html(renderRunbook(data));
  }
  if (routePath === "/proof/enterprise") {
    return html(renderEnterpriseIndex());
  }
  if (routePath.startsWith("/proof/enterprise/")) {
    return page(renderEnterpriseTopic(decodeURIComponent(routePath.slice("/proof/enterprise/".length))));
  }
  return notFound(`Route ${pathname} is not part of the first-pass proof cockpit.`);
}

export function createProofCockpitServer(options = {}) {
  const data = options.data ?? buildData();
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const result = renderProofCockpit(url.pathname, data);
    response.writeHead(result.status, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(result.body);
  });
}

export function startProofCockpitServer(options = {}) {
  const host = options.host ?? process.env.PROOF_COCKPIT_HOST ?? "127.0.0.1";
  const port = Number(options.port ?? process.env.PROOF_COCKPIT_PORT ?? "3090");
  const server = createProofCockpitServer(options);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startProofCockpitServer().catch((error) => {
    console.error(JSON.stringify({ outcome: "error", message: String(error?.message ?? error) }));
    process.exit(1);
  });
}
