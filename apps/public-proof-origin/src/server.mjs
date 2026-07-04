import { createServer } from "node:http";

const DEFAULT_FQDN_MAP = Object.freeze({
  "1e100.network": "staging",
  "aldous.info": "production",
});

const NON_CLAIMS = Object.freeze([
  "no-staging-readiness",
  "no-production-readiness",
  "no-deployment-readiness",
  "no-live-provider-readiness",
  "no-soc-readiness",
  "no-iso-certification",
  "no-enterprise-production-readiness",
  "no-product-ui-readiness",
  "no-browser-e2e-readiness",
  "no-full-react-product-parity",
  "no-caddy-semantic-requirement",
  "no-netlify-semantic-requirement",
  "no-cloudflare-worker-semantic-requirement",
  "no-v2-proof-tag-authorization",
]);

const NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
});

function normaliseHost(hostHeader) {
  const host = String(hostHeader ?? "").trim().toLowerCase();
  if (!host) {
    return "";
  }
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end === -1 ? host : host.slice(1, end);
  }
  return host.split(":")[0] ?? "";
}

function fqdnMapFromEnvironment(environment = process.env) {
  const raw = environment.PUBLIC_PROOF_ORIGIN_FQDN_MAP;
  if (!raw) {
    return DEFAULT_FQDN_MAP;
  }
  return Object.freeze(
    Object.fromEntries(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [fqdn, env] = entry.split("=").map((part) => part.trim().toLowerCase());
          if (!fqdn || !env) {
            throw new Error("invalid-public-proof-origin-fqdn-map");
          }
          return [fqdn, env];
        }),
    ),
  );
}

function responseContext(request, fqdnMap) {
  const fqdn = normaliseHost(request.headers.host);
  const environment = fqdnMap[fqdn];
  if (!environment) {
    return {
      accepted: false,
      fqdn,
      environment: "unknown",
    };
  }
  return {
    accepted: true,
    fqdn,
    environment,
  };
}

function sendJson(response, status, payload) {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Allow": "GET, HEAD, OPTIONS",
    ...NO_STORE_HEADERS,
  });
  response.end(body);
}

function sendHtml(response, status, html) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Allow": "GET, HEAD, OPTIONS",
    ...NO_STORE_HEADERS,
    "Content-Security-Policy":
      "default-src 'none'; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  });
  response.end(html);
}

function sendHead(response, contentType) {
  response.writeHead(200, {
    "Content-Type": contentType,
    "Allow": "GET, HEAD, OPTIONS",
    ...NO_STORE_HEADERS,
  });
  response.end();
}

function sendOptions(response) {
  response.writeHead(204, {
    "Allow": "GET, HEAD, OPTIONS",
    ...NO_STORE_HEADERS,
  });
  response.end();
}

function publicEdgePayload(context) {
  return {
    marker: "usf-public-edge",
    route: "/.well-known/usf-public-edge.json",
    routeClass: "non-product-json-proof-endpoint",
    proofSurface: "public-json-proof-endpoint",
    issueId: "USF-266",
    unblocksIssueId: "USF-263",
    environment: context.environment,
    fqdn: context.fqdn,
    gatewayNeutral: true,
    requiredGateway: "none",
    caddyRequired: false,
    netlifyRequired: false,
    cloudflareWorkerRequired: false,
    usesRealTenantData: false,
    usesRealSecrets: false,
    productUiReadinessClaim: false,
    browserE2eReadinessClaim: false,
    nonClaims: NON_CLAIMS,
  };
}

function publicRouteHtml(context) {
  const bootstrap = JSON.stringify({
    marker: "usf-public-route",
    route: "/__proof/public-route",
    routeClass: "non-product-browser-telemetry-proof-route",
    proofSurface: "public-route-telemetry-bootstrap",
    issueId: "USF-264",
    environment: context.environment,
    fqdn: context.fqdn,
    telemetrySystems: ["faro", "sentry"],
    telemetryBootstrapOnly: true,
    productUiReadinessClaim: false,
    browserE2eReadinessClaim: false,
    nonClaims: NON_CLAIMS,
  });
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>USF public route proof</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="usf-public-route-marker" content="usf-public-route">
    <meta name="usf-telemetry-bootstrap" content="faro,sentry">
  </head>
  <body>
    <main data-proof-marker="usf-public-route" data-proof-surface="public-route-telemetry-bootstrap">
      <h1>USF public route proof</h1>
    </main>
    <script id="usf-public-route-telemetry-bootstrap" type="application/json">${bootstrap}</script>
  </body>
</html>
`;
}

export function createPublicProofOriginServer(options = {}) {
  const fqdnMap = options.fqdnMap ?? fqdnMapFromEnvironment(options.environment);
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const context = responseContext(request, fqdnMap);
    if (!context.accepted) {
      sendJson(response, 421, {
        marker: "usf-public-edge-host-rejected",
        reason: "host-not-in-public-proof-origin-contract",
        fqdn: context.fqdn,
        nonClaims: NON_CLAIMS,
      });
      return;
    }
    if (url.pathname === "/.well-known/usf-public-edge.json") {
      if (request.method === "GET") {
        sendJson(response, 200, publicEdgePayload(context));
        return;
      }
      if (request.method === "HEAD") {
        sendHead(response, "application/json; charset=utf-8");
        return;
      }
      if (request.method === "OPTIONS") {
        sendOptions(response);
        return;
      }
    }
    if (url.pathname === "/__proof/public-route") {
      if (request.method === "GET") {
        sendHtml(response, 200, publicRouteHtml(context));
        return;
      }
      if (request.method === "HEAD") {
        sendHead(response, "text/html; charset=utf-8");
        return;
      }
      if (request.method === "OPTIONS") {
        sendOptions(response);
        return;
      }
    }
    sendJson(response, 404, {
      marker: "usf-public-edge-route-missing",
      reason: "route-not-in-public-proof-origin-contract",
      route: url.pathname,
      nonClaims: NON_CLAIMS,
    });
  });
}

export function startPublicProofOriginServer(options = {}) {
  const host = options.host ?? process.env.PUBLIC_PROOF_ORIGIN_HOST ?? "0.0.0.0";
  const port = Number(options.port ?? process.env.PUBLIC_PROOF_ORIGIN_PORT ?? "8080");
  const server = createPublicProofOriginServer(options);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startPublicProofOriginServer().catch((error) => {
    const safeCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code).replace(/[^a-zA-Z0-9_-]/g, "-")
        : "public-proof-origin-start-failed";
    console.error(JSON.stringify({ outcome: "error", safeCode }));
    process.exit(1);
  });
}
