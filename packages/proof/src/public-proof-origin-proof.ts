import type { Server } from "node:http";
import { request as httpRequest } from "node:http";

interface PublicProofOriginModule {
  readonly createPublicProofOriginServer: () => Server;
}

const publicProofOriginModulePath = "../../../apps/public-proof-origin/src/server.mjs";
const { createPublicProofOriginServer } = (await import(
  publicProofOriginModulePath
)) as PublicProofOriginModule;

interface ProbeResult {
  readonly fqdn: string;
  readonly environment: "staging" | "production";
  readonly jsonEndpoint: {
    readonly status: number;
    readonly contentTypeMatched: boolean;
    readonly noStoreHeadersObserved: boolean;
    readonly markerObserved: boolean;
    readonly environmentMatched: boolean;
    readonly fqdnMatched: boolean;
  };
  readonly browserRoute: {
    readonly status: number;
    readonly contentTypeMatched: boolean;
    readonly noStoreHeadersObserved: boolean;
    readonly markerObserved: boolean;
    readonly telemetryBootstrapObserved: boolean;
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
  readonly body: string;
}

function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value ?? "";
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
  const result = {
    fqdn: row.fqdn,
    environment: row.environment,
    jsonEndpoint: {
      status: jsonResponse.status,
      contentTypeMatched: jsonContentType.includes("application/json"),
      noStoreHeadersObserved: jsonNoStoreHeaders,
      markerObserved: jsonPayload.marker === "usf-public-edge",
      environmentMatched: jsonPayload.environment === row.environment,
      fqdnMatched: jsonPayload.fqdn === row.fqdn,
    },
    browserRoute: {
      status: routeResponse.status,
      contentTypeMatched: routeContentType.includes("text/html"),
      noStoreHeadersObserved: routeNoStoreHeaders,
      markerObserved: routeBody.includes("usf-public-route"),
      telemetryBootstrapObserved: routeBody.includes("usf-public-route-telemetry-bootstrap"),
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
      result.jsonEndpoint.markerObserved &&
      result.jsonEndpoint.environmentMatched &&
      result.jsonEndpoint.fqdnMatched &&
      result.browserRoute.status === 200 &&
      result.browserRoute.contentTypeMatched &&
      result.browserRoute.noStoreHeadersObserved &&
      result.browserRoute.markerObserved &&
      result.browserRoute.telemetryBootstrapObserved &&
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
    const status = probes.every((row) => row.status === "pass") ? "pass" : "fail";
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
