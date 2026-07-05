import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../../..", import.meta.url).pathname;
const MATRIX_PATH = join(ROOT, "docs/architecture/capability-source-coverage-matrix.md");
const CONTRACT_DIR = join(ROOT, "spec/instances/semantic-contract");
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
  "/proof/capabilities",
  "/proof/capabilities/:capabilityId",
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

function buildData() {
  const contracts = loadSemanticContracts();
  const capabilities = parseMatrixCapabilities().map((capability) => {
    const contract = contracts.get(capability.semanticContractId);
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
      services: DOMAIN_SERVICES[capability.domain] ?? ["backing services not classified in first pass"],
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
  return { capabilities, contracts, scenarios, evidence };
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
<a href="/proof/capabilities">Capabilities</a> |
<a href="/proof/roles">Roles</a> |
<a href="/proof/audit">Audit</a> |
<a href="/proof/observability">Observability</a> |
<a href="/proof/fixtures">Fixtures</a> |
<a href="/proof/alerts">Alerts</a> |
<a href="/proof/signoff">Signoff</a> |
<a href="/proof/result">Result</a> |
<a href="/proof/enterprise">Enterprise</a>
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
<ul>${ROUTES.map((route) => routeToLink(route)).join("")}</ul>
</section>
${nonClaimsBlock()}`,
  );
}

function routeToLink(route) {
  if (route.includes(":capabilityId")) {
    return `<li>${escapeHtml(route)} - dynamic capability detail from <a href="/proof/capabilities">capability list</a></li>`;
  }
  if (route.includes(":scenarioId")) {
    return `<li>${escapeHtml(route)} - dynamic scenario detail from capability pages</li>`;
  }
  if (route.includes(":evidenceId")) {
    return `<li>${escapeHtml(route)} - dynamic evidence detail from capability pages</li>`;
  }
  return `<li><a href="${escapeHtml(route)}">${escapeHtml(route)}</a></li>`;
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

function renderCapability(data, capabilityId) {
  const capability = data.capabilities.find((candidate) => candidate.id === capabilityId);
  if (!capability) {
    return notFound(`Capability ${capabilityId} was not found.`);
  }
  const checklist = [
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
<section><h2>Required backend services</h2><ul>${capability.services.map((service) => `<li>${escapeHtml(service)} - needs-runtime-wiring</li>`).join("")}</ul></section>
<section><h2>Scenarios</h2><ul>${capability.scenarioIds
      .map((id) => `<li><a href="/proof/scenarios/${escapeHtml(id)}">${escapeHtml(id)}</a> - first-pass placeholder</li>`)
      .join("")}</ul></section>
<section><h2>Evidence</h2><ul>${capability.evidenceIds
      .map((id) => `<li><a href="/proof/evidence/${escapeHtml(id)}">${escapeHtml(id)}</a></li>`)
      .join("")}</ul></section>
<section><h2>Requirement checklist placeholders</h2><ul>${checklist
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
  return layout(
    scenario.name,
    `<p><a href="/proof/capabilities/${escapeHtml(scenario.capabilityId)}">Back to capability</a></p>
<table><tbody>
<tr><th>Status</th><td>first-pass placeholder</td></tr>
<tr><th>Capability</th><td>${escapeHtml(capability?.name ?? scenario.capabilityId)}</td></tr>
<tr><th>Persona</th><td>${escapeHtml(scenario.role)}</td></tr>
<tr><th>Tenant</th><td>synthetic tenant placeholder</td></tr>
<tr><th>Steps</th><td>Open capability, exercise ${escapeHtml(scenario.pathType)}, verify result, collect evidence.</td></tr>
<tr><th>Expected result</th><td>${escapeHtml(scenario.expectedResult)}</td></tr>
<tr><th>Expected audit event</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Expected observability</th><td>missing correlation id, trace id, log, metric, and alert links in first pass</td></tr>
<tr><th>Evidence links</th><td>generated placeholders only</td></tr>
</tbody></table>`,
  );
}

function renderRoles() {
  const rows = ROLES.map((role) => `<tr>
<td>${escapeHtml(role)}</td>
<td>first-pass placeholder</td>
<td>role-switch control not implemented</td>
<td>audit placeholder required before final proof</td>
</tr>`);
  return layout("Proof roles", `${warningsBlock()}${table(["Role", "Synthetic persona state", "Role-switch proof", "Audit"], rows)}`);
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
<tr><th>Audit event</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Logs metrics traces</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Alert</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Screenshot</th><td>missing-first-pass-placeholder</td></tr>
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
  const rows = [...new Set(data.capabilities.map((capability) => capability.domain))]
    .sort()
    .map((domain) => `<tr>
<td>${escapeHtml(domain)}</td>
<td>synthetic-${escapeHtml(domain)}-first-pass</td>
<td>version unavailable</td>
<td>last reset unavailable</td>
<td>residual state unknown</td>
<td>no real tenant data required by final posture; first-pass placeholder only</td>
</tr>`);
  return layout(
    "Proof fixtures",
    table(["Domain", "Fixture set", "Fixture version", "Last reset", "Residual state", "No real tenant data"], rows),
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

function renderEnterpriseIndex() {
  return layout(
    "Enterprise evidence",
    `<p>First-pass enterprise pages expose expected evidence surfaces and missing evidence. They do not claim ISO certification, SOC readiness, enterprise readiness, or production readiness.</p>
${table(
      ["Topic", "Purpose", "First-pass state"],
      ENTERPRISE_TOPICS.map(
        ([slug, title, purpose]) =>
          `<tr><td><a href="/proof/enterprise/${escapeHtml(slug)}">${escapeHtml(title)}</a></td><td>${escapeHtml(purpose)}</td><td>stubbed</td></tr>`,
      ),
    )}`,
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
</tbody></table>`,
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
  if (routePath === "/proof/capabilities") {
    return html(renderCapabilities(data));
  }
  if (routePath.startsWith("/proof/capabilities/")) {
    return page(renderCapability(data, decodeURIComponent(routePath.slice("/proof/capabilities/".length))));
  }
  if (routePath.startsWith("/proof/scenarios/")) {
    return page(renderScenario(data, decodeURIComponent(routePath.slice("/proof/scenarios/".length))));
  }
  if (routePath === "/proof/roles") {
    return html(renderRoles());
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
