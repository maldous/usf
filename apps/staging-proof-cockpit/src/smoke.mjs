import { startProofCockpitServer } from "./server.mjs";

const ROUTES = Object.freeze([
  "/proof",
  "/proof/",
  "/proof/portfolio",
  "/proof/claims",
  "/proof/claims/claim-proof-cockpit-portfolio",
  "/proof/semantic-definitions",
  "/proof/semantic-definitions/semantic-contract.tenant-identity-record-and-fqdn",
  "/proof/qa",
  "/proof/foundation-substrate-closure",
  "/proof/actions",
  "/proof/machine-runs",
  "/proof/machine-runs/latest-machine-qa",
  "/proof/import",
  "/proof/import/latest-machine-qa",
  "/proof/review",
  "/proof/review/sample-human-review",
  "/proof/review/gaps",
  "/proof/review/nonconformities",
  "/proof/review/corrective-actions",
  "/proof/export",
  "/proof/reports",
  "/proof/reports/final",
  "/proof/capabilities",
  "/proof/capabilities/cap-001-tenant-identity-record-fqdn",
  "/proof/services",
  "/proof/services/postgres",
  "/proof/screenshots",
  "/proof/screenshots/screenshot-service-postgres",
  "/proof/evidence",
  "/proof/sources",
  "/proof/source?path=docs/architecture/dev-readiness-validation-and-handover.md",
  "/proof/source?path=docs/architecture/proof-cockpit-foundation-substrate-closure-import.json",
  "/proof/source?path=evidence/proof-evidence/proof-cockpit/staging-evidence-store.json",
  "/proof/source?path=evidence/proof-evidence/proof-cockpit/final-external-review-report.md",
  "/proof/source?path=docs/architecture/usf-current-state-foundation-closure-report.md",
  "/proof/source?path=docs/architecture/dev-foundation-substrate-closure.json",
  "/proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path",
  "/proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract",
  "/proof/evidence/usf-foundation-substrate-closure",
  "/proof/roles",
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
  "/proof/enterprise/iso-control-support",
  "/proof/enterprise/internal-audit",
  "/proof/enterprise/legal-regulatory",
  "/proof/enterprise/security-objectives",
  "/proof/enterprise/document-control",
  "/proof/enterprise/competence-awareness",
  "/proof/enterprise/physical-environmental",
  "/proof/enterprise/secure-sdlc",
  "/proof/enterprise/evidence-integrity",
  "/proof/enterprise/nonconformity-corrective-action",
  "/proof/enterprise/management-review",
  "/proof/enterprise/single-operator-risk",
  "/proof/runbook",
]);

const statePath = `/tmp/usf-proof-cockpit-smoke-${process.pid}.json`;
const server = await startProofCockpitServer({ host: "127.0.0.1", port: 0, statePath });
try {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("proof-cockpit-smoke-address-unavailable");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const results = [];
  for (const route of ROUTES) {
    const response = await fetch(`${baseUrl}${route}`);
    const text = await response.text();
    if (response.status !== 200) {
      throw new Error(`proof-cockpit-smoke-status-${response.status}-${route}`);
    }
    if (!text.includes("<!doctype html>")) {
      throw new Error(`proof-cockpit-smoke-non-html-${route}`);
    }
    if (/<script\b|data-reactroot|__next/i.test(text)) {
      throw new Error(`proof-cockpit-smoke-script-framework-marker-${route}`);
    }
    results.push({ route, status: response.status });
  }
  const capabilities = await fetch(`${baseUrl}/proof/capabilities`).then((response) => response.text());
  const listed = new Set(
    [...capabilities.matchAll(/href="\/proof\/capabilities\/(cap-\d{3}-[a-z0-9-]+)"/g)].map((match) => match[1]),
  ).size;
  if (listed !== 75) {
    throw new Error(`proof-cockpit-smoke-capability-count-${listed}`);
  }
  const services = await fetch(`${baseUrl}/proof/services`).then((response) => response.text());
  if (!services.includes("/proof/services/postgres")) {
    throw new Error("proof-cockpit-smoke-service-link-missing");
  }
  const foundationClosure = await fetch(`${baseUrl}/proof/foundation-substrate-closure`).then((response) => response.text());
  for (const required of [
    "USF-292",
    "ec37409ddd779661569f8e5f8e4c835695efea96",
    "USF current-state foundation closure report",
    "Dev foundation substrate closure",
    "Chain of custody",
    "Validator result",
    "no-iso-certification",
    "no-full-product-readiness",
  ]) {
    if (!foundationClosure.includes(required)) {
      throw new Error(`proof-cockpit-smoke-foundation-closure-missing-${required}`);
    }
  }
  const postResponse = await fetch(`${baseUrl}/proof/actions`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      actionType: "capability-qa",
      capabilityId: "cap-001-tenant-identity-record-fqdn",
      role: "tenant admin",
      actor: "smoke-auditor",
      tenant: "synthetic-smoke-tenant",
      actionName: "smoke QA action",
      outcome: "draft-performed",
      correlationId: "smoke-correlation",
      traceId: "smoke-trace",
      auditEventId: "smoke-audit",
      devEvidenceConfirmed: "yes",
      testEvidenceConfirmed: "yes",
      noRealTenantData: "yes",
      nonClaimsConfirmed: "yes",
      returnTo: "/proof/actions",
    }),
  });
  if (postResponse.status !== 303) {
    throw new Error(`proof-cockpit-smoke-post-status-${postResponse.status}`);
  }
  const actions = await fetch(`${baseUrl}/proof/actions`).then((response) => response.text());
  if (!actions.includes("smoke-auditor") || !actions.includes("cap-001-tenant-identity-record-fqdn")) {
    throw new Error("proof-cockpit-smoke-action-not-recorded");
  }
  console.log(JSON.stringify({ outcome: "pass", checkedRoutes: results.length, listedCapabilities: listed }));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
