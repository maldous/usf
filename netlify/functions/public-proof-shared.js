export const HOST_ENVIRONMENT = Object.freeze({
  "1e100.network": "staging",
  "aldous.info": "production",
});

export const NON_CLAIMS = Object.freeze([
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

export const BASE_HEADERS = Object.freeze({
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Host",
});

export function normaliseHost(hostHeader) {
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

export function responseContext(event) {
  const fqdn = normaliseHost(event.headers.host);
  const environment = HOST_ENVIRONMENT[fqdn];
  return {
    accepted: Boolean(environment),
    environment: environment ?? "unknown",
    fqdn,
  };
}

export function publicEdgePayload(context) {
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

export function publicRouteHtml(context) {
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

export function methodAllowed(method) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export function hostRejected(context) {
  return jsonResponse(421, {
    marker: "usf-public-edge-host-rejected",
    reason: "host-not-in-public-proof-origin-contract",
    fqdn: context.fqdn,
    nonClaims: NON_CLAIMS,
  });
}

export function methodRejected() {
  return {
    statusCode: 405,
    headers: {
      ...BASE_HEADERS,
      "Allow": "GET, HEAD, OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: `${JSON.stringify({
      marker: "usf-public-edge-method-rejected",
      reason: "method-not-in-public-proof-origin-contract",
      nonClaims: NON_CLAIMS,
    }, null, 2)}\n`,
  };
}

export function optionsResponse() {
  return {
    statusCode: 204,
    headers: {
      ...BASE_HEADERS,
      "Allow": "GET, HEAD, OPTIONS",
    },
    body: "",
  };
}

export function jsonResponse(statusCode, payload, method = "GET") {
  return {
    statusCode,
    headers: {
      ...BASE_HEADERS,
      "Allow": "GET, HEAD, OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: method === "HEAD" ? "" : `${JSON.stringify(payload, null, 2)}\n`,
  };
}

export function htmlResponse(statusCode, html, method = "GET") {
  return {
    statusCode,
    headers: {
      ...BASE_HEADERS,
      "Allow": "GET, HEAD, OPTIONS",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
    body: method === "HEAD" ? "" : html,
  };
}
