import type { Server } from "node:http";
import { request as httpRequest } from "node:http";

interface PublicProofOriginModule {
  readonly createPublicProofOriginServer: () => Server;
  readonly DEFAULT_FQDN_MAP: Readonly<Record<string, string>>;
  readonly NON_CLAIMS: readonly string[];
  readonly NO_STORE_HEADERS: Readonly<Record<string, string>>;
  readonly publicEdgePayload: (context: { readonly environment: string; readonly fqdn: string }) => Record<string, unknown>;
}

interface NetlifyPublicProofSharedModule {
  readonly HOST_ENVIRONMENT: Readonly<Record<string, string>>;
  readonly NON_CLAIMS: readonly string[];
  readonly BASE_HEADERS: Readonly<Record<string, string>>;
  readonly publicEdgePayload: (context: { readonly environment: string; readonly fqdn: string }) => Record<string, unknown>;
}

const publicProofOriginModulePath = "../../../apps/public-proof-origin/src/server.mjs";
const publicProofOrigin = (await import(
  publicProofOriginModulePath
)) as PublicProofOriginModule;
const { createPublicProofOriginServer } = publicProofOrigin;

const netlifyPublicProofSharedModulePath = "../../../netlify/functions/public-proof-shared.js";
const netlifyPublicProofShared = (await import(
  netlifyPublicProofSharedModulePath
)) as NetlifyPublicProofSharedModule;

interface ProbeResult {
  readonly fqdn: string;
  readonly environment: "staging" | "production";
  readonly jsonEndpoint: {
    readonly status: number;
    readonly contentTypeMatched: boolean;
    readonly noStoreHeadersObserved: boolean;
    readonly varyHostObserved: boolean;
    readonly markerObserved: boolean;
    readonly environmentMatched: boolean;
    readonly fqdnMatched: boolean;
    readonly nonClaimsObserved: boolean;
  };
  readonly browserRoute: {
    readonly status: number;
    readonly contentTypeMatched: boolean;
    readonly noStoreHeadersObserved: boolean;
    readonly varyHostObserved: boolean;
    readonly markerObserved: boolean;
    readonly telemetryBootstrapObserved: boolean;
    readonly nonClaimsObserved: boolean;
  };
  readonly safeMethods: {
    readonly jsonHeadStatus: number;
    readonly jsonOptionsStatus: number;
    readonly routeHeadStatus: number;
    readonly routeOptionsStatus: number;
    readonly accepted: boolean;
  };
  readonly status: "pass" | "fail";
}

const EXPECTED = [
  { fqdn: "1e100.network", environment: "staging" as const },
  { fqdn: "aldous.info", environment: "production" as const },
];

interface HttpProbeResponse {
  readonly status: number;
  readonly contentType: string;
  readonly cacheControl: string;
  readonly cdnCacheControl: string;
  readonly netlifyCdnCacheControl: string;
  readonly vary: string;
  readonly body: string;
}

interface EquivalenceResult {
  readonly hostMapMatched: boolean;
  readonly nonClaimsMatched: boolean;
  readonly noStoreHeadersMatched: boolean;
  readonly varyHostMatched: boolean;
  readonly jsonPayloadMatched: boolean;
  readonly accepted: boolean;
}

function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value ?? "";
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function publicOriginImplementationEquivalence(): EquivalenceResult {
  const context = { environment: "staging", fqdn: "1e100.network" };
  const hostMapMatched = sameJson(
    publicProofOrigin.DEFAULT_FQDN_MAP,
    netlifyPublicProofShared.HOST_ENVIRONMENT,
  );
  const nonClaimsMatched = sameJson(
    publicProofOrigin.NON_CLAIMS,
    netlifyPublicProofShared.NON_CLAIMS,
  );
  const requiredNoStoreHeaders = [
    "Cache-Control",
    "CDN-Cache-Control",
    "Netlify-CDN-Cache-Control",
  ] as const;
  const noStoreHeadersMatched = requiredNoStoreHeaders.every(
    (header) =>
      publicProofOrigin.NO_STORE_HEADERS[header] === netlifyPublicProofShared.BASE_HEADERS[header],
  );
  const varyHostMatched =
    publicProofOrigin.NO_STORE_HEADERS.Vary === "Host" &&
    netlifyPublicProofShared.BASE_HEADERS.Vary === "Host";
  const jsonPayloadMatched = sameJson(
    publicProofOrigin.publicEdgePayload(context),
    netlifyPublicProofShared.publicEdgePayload(context),
  );
  return {
    hostMapMatched,
    nonClaimsMatched,
    noStoreHeadersMatched,
    varyHostMatched,
    jsonPayloadMatched,
    accepted:
      hostMapMatched &&
      nonClaimsMatched &&
      noStoreHeadersMatched &&
      varyHostMatched &&
      jsonPayloadMatched,
  };
}

async function request(
  port: number,
  fqdn: string,
  route: string,
  method = "GET",
): Promise<HttpProbeResponse> {
  return await new Promise<HttpProbeResponse>((resolve, reject) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        path: route,
        method,
        headers: {
          Host: fqdn,
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            contentType: headerValue(response.headers["content-type"]),
            cacheControl: headerValue(response.headers["cache-control"]),
            cdnCacheControl: headerValue(response.headers["cdn-cache-control"]),
            netlifyCdnCacheControl: headerValue(response.headers["netlify-cdn-cache-control"]),
            vary: headerValue(response.headers["vary"]),
            body,
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function probe(port: number, row: (typeof EXPECTED)[number]): Promise<ProbeResult> {
  const jsonResponse = await request(port, row.fqdn, "/.well-known/usf-public-edge.json");
  const jsonHeadResponse = await request(
    port,
    row.fqdn,
    "/.well-known/usf-public-edge.json",
    "HEAD",
  );
  const jsonOptionsResponse = await request(
    port,
    row.fqdn,
    "/.well-known/usf-public-edge.json",
    "OPTIONS",
  );
  const jsonContentType = jsonResponse.contentType;
  const jsonPayload = JSON.parse(jsonResponse.body) as {
    readonly marker?: string;
    readonly environment?: string;
    readonly fqdn?: string;
    readonly nonClaims?: readonly string[];
  };
  const routeResponse = await request(port, row.fqdn, "/__proof/public-route");
  const routeHeadResponse = await request(port, row.fqdn, "/__proof/public-route", "HEAD");
  const routeOptionsResponse = await request(port, row.fqdn, "/__proof/public-route", "OPTIONS");
  const routeContentType = routeResponse.contentType;
  const routeBody = routeResponse.body;
  const jsonNoStoreHeaders =
    jsonResponse.cacheControl.includes("no-store") &&
    jsonResponse.cdnCacheControl.includes("no-store") &&
    jsonResponse.netlifyCdnCacheControl.includes("no-store");
  const routeNoStoreHeaders =
    routeResponse.cacheControl.includes("no-store") &&
    routeResponse.cdnCacheControl.includes("no-store") &&
    routeResponse.netlifyCdnCacheControl.includes("no-store");
  const requiredNonClaims = [
    "no-staging-readiness",
    "no-production-readiness",
    "no-deployment-readiness",
    "no-live-provider-readiness",
    "no-soc-readiness",
    "no-iso-certification",
    "no-enterprise-production-readiness",
    "no-product-ui-readiness",
    "no-browser-e2e-readiness",
    "no-full-product-readiness",
    "no-v2-proof-tag-authorization",
  ];
  const jsonNonClaims = new Set(jsonPayload.nonClaims ?? []);
  const jsonNonClaimsObserved = requiredNonClaims.every((claim) => jsonNonClaims.has(claim));
  const routeNonClaimsObserved = requiredNonClaims.every((claim) => routeBody.includes(claim));
  const result = {
    fqdn: row.fqdn,
    environment: row.environment,
    jsonEndpoint: {
      status: jsonResponse.status,
      contentTypeMatched: jsonContentType.includes("application/json"),
      noStoreHeadersObserved: jsonNoStoreHeaders,
      varyHostObserved: jsonResponse.vary
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .includes("host"),
      markerObserved: jsonPayload.marker === "usf-public-edge",
      environmentMatched: jsonPayload.environment === row.environment,
      fqdnMatched: jsonPayload.fqdn === row.fqdn,
      nonClaimsObserved: jsonNonClaimsObserved,
    },
    browserRoute: {
      status: routeResponse.status,
      contentTypeMatched: routeContentType.includes("text/html"),
      noStoreHeadersObserved: routeNoStoreHeaders,
      varyHostObserved: routeResponse.vary
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .includes("host"),
      markerObserved: routeBody.includes("usf-public-route"),
      telemetryBootstrapObserved: routeBody.includes("usf-public-route-telemetry-bootstrap"),
      nonClaimsObserved: routeNonClaimsObserved,
    },
    safeMethods: {
      jsonHeadStatus: jsonHeadResponse.status,
      jsonOptionsStatus: jsonOptionsResponse.status,
      routeHeadStatus: routeHeadResponse.status,
      routeOptionsStatus: routeOptionsResponse.status,
      accepted:
        jsonHeadResponse.status === 200 &&
        jsonOptionsResponse.status === 204 &&
        routeHeadResponse.status === 200 &&
        routeOptionsResponse.status === 204,
    },
  };
  return {
    ...result,
    status:
      result.jsonEndpoint.status === 200 &&
      result.jsonEndpoint.contentTypeMatched &&
      result.jsonEndpoint.noStoreHeadersObserved &&
      result.jsonEndpoint.varyHostObserved &&
      result.jsonEndpoint.markerObserved &&
      result.jsonEndpoint.environmentMatched &&
      result.jsonEndpoint.fqdnMatched &&
      result.jsonEndpoint.nonClaimsObserved &&
      result.browserRoute.status === 200 &&
      result.browserRoute.contentTypeMatched &&
      result.browserRoute.noStoreHeadersObserved &&
      result.browserRoute.varyHostObserved &&
      result.browserRoute.markerObserved &&
      result.browserRoute.telemetryBootstrapObserved &&
      result.browserRoute.nonClaimsObserved &&
      result.safeMethods.accepted
        ? "pass"
        : "fail",
  };
}

async function main(): Promise<number> {
  const server = createPublicProofOriginServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("public-proof-origin-missing-address");
    }
    const probes = await Promise.all(EXPECTED.map((row) => probe(address.port, row)));
    const implementationEquivalence = publicOriginImplementationEquivalence();
    const status =
      probes.every((row) => row.status === "pass") && implementationEquivalence.accepted
        ? "pass"
        : "fail";
    console.log(
      JSON.stringify(
        {
          status,
          issueId: "USF-266",
          unblocksIssueId: "USF-263",
          proof: "public-proof-origin-response-contract",
          gatewayNeutral: true,
          caddyRequired: false,
          netlifyRequired: false,
          cloudflareWorkerRequired: false,
          testEnvironmentPublicInternetDependency: false,
          productUiReadinessClaim: false,
          browserE2eReadinessClaim: false,
          probes,
          implementationEquivalence,
          nonClaims: [
            "no-staging-readiness",
            "no-production-readiness",
            "no-deployment-readiness",
            "no-live-provider-readiness",
            "no-soc-readiness",
            "no-iso-certification",
            "no-enterprise-production-readiness",
            "no-product-ui-readiness",
            "no-browser-e2e-readiness",
            "no-full-product-readiness",
            "no-v2-proof-tag-authorization",
          ],
        },
        null,
        2,
      ),
    );
    return status === "pass" ? 0 : 1;
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const safeCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { readonly code?: unknown }).code).replace(/[^a-zA-Z0-9_-]/g, "-")
        : "public-proof-origin-proof-failed";
    console.error(JSON.stringify({ status: "fail", safeCode }, null, 2));
    process.exitCode = 1;
  },
);
