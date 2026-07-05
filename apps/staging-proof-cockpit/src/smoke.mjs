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
    if (
      ["/proof", "/proof/review", "/proof/reports/final", "/proof/screenshots", "/proof/evidence", "/proof/signoff"].includes(
        route,
      ) &&
      /<t[dh][^>]*>\s*<\/t[dh]>/i.test(text)
    ) {
      throw new Error(`proof-cockpit-smoke-blank-table-cell-${route}`);
    }
    results.push({ route, status: response.status });
  }
  const home = await fetch(`${baseUrl}/proof`).then((response) => response.text());
  for (const required of [
    "USF Proof Review",
    "External-review report first",
    "Next review item",
    "Start review",
    "Open printable report",
    "Final signoff",
    "Secondary audit detail",
  ]) {
    if (!home.includes(required)) {
      throw new Error(`proof-cockpit-smoke-home-missing-${required}`);
    }
  }
  const review = await fetch(`${baseUrl}/proof/review`).then((response) => response.text());
  for (const required of [
    "review-decision-form",
    'name="decision" value="accept"',
    'name="decision" value="reject"',
    'name="decision" value="retest"',
    'name="decision" value="note"',
    "Accept",
    "Reject",
    "Request retest",
    "Inline screenshot evidence",
    "Machine QA conclusion",
  ]) {
    if (!review.includes(required)) {
      throw new Error(`proof-cockpit-smoke-review-missing-${required}`);
    }
  }
  const decisionFormCount = [...review.matchAll(/class="review-decision-form"/g)].length;
  if (decisionFormCount !== 1) {
    throw new Error(`proof-cockpit-smoke-review-decision-form-count-${decisionFormCount}`);
  }
  for (const forbidden of [
    'type="hidden" name="devEvidenceConfirmed"',
    'type="hidden" name="testEvidenceConfirmed"',
    'type="hidden" name="noRealTenantData"',
    'type="hidden" name="nonClaimsConfirmed"',
  ]) {
    if (review.includes(forbidden)) {
      throw new Error(`proof-cockpit-smoke-hidden-auto-confirmation-${forbidden}`);
    }
  }
  if (!review.includes("<img src=\"/proof/image?path=")) {
    throw new Error("proof-cockpit-smoke-review-inline-image-missing");
  }
  const screenshots = await fetch(`${baseUrl}/proof/screenshots`).then((response) => response.text());
  if (!screenshots.includes("Visual evidence gallery") || !screenshots.includes("<img src=\"/proof/image?path=")) {
    throw new Error("proof-cockpit-smoke-screenshot-gallery-inline-image-missing");
  }
  const firstImage = screenshots.match(/<img src="([^"]+)"/)?.[1];
  if (!firstImage) {
    throw new Error("proof-cockpit-smoke-image-src-missing");
  }
  const imageResponse = await fetch(`${baseUrl}${firstImage}`);
  if (imageResponse.status !== 200 || !imageResponse.headers.get("content-type")?.includes("image/png")) {
    throw new Error(`proof-cockpit-smoke-image-response-${imageResponse.status}`);
  }
  const finalReport = await fetch(`${baseUrl}/proof/reports/final`).then((response) => response.text());
  for (const required of [
    "@media print",
    "print-report",
    "USF-293 External Review Report",
    "Scope and non-claims",
    "Machine QA method and results",
    "Inline Screenshot Evidence Sample",
    "Signoff Section",
  ]) {
    if (!finalReport.includes(required)) {
      throw new Error(`proof-cockpit-smoke-final-report-missing-${required}`);
    }
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
  if (postResponse.status !== 403) {
    throw new Error(`proof-cockpit-smoke-unauthenticated-post-status-${postResponse.status}`);
  }
  const actions = await fetch(`${baseUrl}/proof/actions`).then((response) => response.text());
  if (actions.includes("smoke QA action") || actions.includes("smoke-correlation")) {
    throw new Error("proof-cockpit-smoke-unauthenticated-action-recorded");
  }
  console.log(JSON.stringify({ outcome: "pass", checkedRoutes: results.length, listedCapabilities: listed }));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
