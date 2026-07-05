import { startProofCockpitServer } from "./server.mjs";

const ROUTES = Object.freeze([
  "/proof",
  "/proof/",
  "/proof/capabilities",
  "/proof/capabilities/cap-001-tenant-identity-record-fqdn",
  "/proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path",
  "/proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract",
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
  "/proof/enterprise/nonconformity-corrective-action",
  "/proof/enterprise/management-review",
  "/proof/enterprise/single-operator-risk",
]);

const server = await startProofCockpitServer({ host: "127.0.0.1", port: 0 });
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
    if (/<style\b|stylesheet|class="/i.test(text)) {
      throw new Error(`proof-cockpit-smoke-css-marker-${route}`);
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
  console.log(JSON.stringify({ outcome: "pass", checkedRoutes: results.length, listedCapabilities: listed }));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
