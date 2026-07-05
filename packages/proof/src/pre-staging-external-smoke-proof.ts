import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "docs/architecture/public-fqdn-semantic-contract.json";
const FETCH_TIMEOUT_MS = 15_000;

interface PublicContract {
  readonly environments: readonly {
    readonly environment: "staging" | "production";
    readonly requiredHostnames: readonly { readonly fqdn: string }[];
  }[];
  readonly publicJsonProofEndpoint: {
    readonly route: string;
    readonly expectedMarker: string;
  };
  readonly publicRouteBinding: {
    readonly route: string;
  };
}

async function probe(
  url: string,
  method: "GET" | "HEAD" | "OPTIONS",
  redirect: "follow" | "manual" = "manual",
) {
  const response = await fetch(url, {
    method,
    redirect,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const body = method === "GET" ? await response.text() : "";
  return {
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type") ?? "",
    cacheControl: response.headers.get("cache-control") ?? "",
    age: response.headers.get("age") ?? "",
    cacheStatus: response.headers.get("cache-status") ?? "",
    cfCacheStatus: response.headers.get("cf-cache-status") ?? "",
    cdnCacheStatus: response.headers.get("cdn-cache-status") ?? "",
    xCache: response.headers.get("x-cache") ?? "",
    body,
  };
}

function httpsRedirectObserved(response: Awaited<ReturnType<typeof probe>>, fqdn: string): boolean {
  if (response.status < 300 || response.status > 399 || !response.location) {
    return false;
  }
  try {
    const target = new URL(response.location, `http://${fqdn}`);
    return target.protocol === "https:" && target.hostname === fqdn;
  } catch {
    return false;
  }
}

function providerCacheHitObserved(response: Awaited<ReturnType<typeof probe>>): boolean {
  const ageSeconds = Number.parseInt(response.age, 10);
  const providerStatuses = [
    response.cacheStatus,
    response.cfCacheStatus,
    response.cdnCacheStatus,
    response.xCache,
  ]
    .filter(Boolean)
    .join("; ");
  const statusText = providerStatuses.toLowerCase();
  const agePresent = Number.isFinite(ageSeconds) && ageSeconds > 0;
  const hitObserved = /\bhit\b/.test(statusText);
  const staleObserved = /\bstale\b/.test(statusText);
  const explicitDynamicOrForwarded =
    /\bfwd=(miss|bypass)\b/.test(statusText) ||
    /\bdynamic\b/.test(statusText) ||
    /\bmiss\b/.test(statusText) ||
    /\bbypass\b/.test(statusText);
  return hitObserved || staleObserved || (agePresent && !explicitDynamicOrForwarded);
}

async function main(): Promise<number> {
  const contract = JSON.parse(await readFile(resolve(CONTRACT_PATH), "utf8")) as PublicContract;
  const blockers: string[] = [];
  const hostEvidence = [];

  for (const environment of contract.environments) {
    for (const host of environment.requiredHostnames) {
      const httpsJsonUrl = `https://${host.fqdn}${contract.publicJsonProofEndpoint.route}`;
      const httpsRouteUrl = `https://${host.fqdn}${contract.publicRouteBinding.route}`;
      const httpJsonUrl = `http://${host.fqdn}${contract.publicJsonProofEndpoint.route}`;
      const json = await probe(httpsJsonUrl, "GET", "follow");
      const head = await probe(httpsJsonUrl, "HEAD", "follow");
      const options = await probe(httpsJsonUrl, "OPTIONS", "manual");
      const route = await probe(httpsRouteUrl, "GET", "follow");
      const http = await probe(httpJsonUrl, "GET", "manual");
      const jsonOk =
        json.status === 200 &&
        json.contentType.includes("application/json") &&
        json.body.includes(contract.publicJsonProofEndpoint.expectedMarker);
      const routeOk = route.status === 200 && route.contentType.includes("text/html");
      const headOk = head.status === 200;
      const optionsSafe = options.status >= 200 && options.status < 500;
      const httpRedirectOk = httpsRedirectObserved(http, host.fqdn);
      const noStoreDeclared =
        json.cacheControl.includes("no-store") &&
        head.cacheControl.includes("no-store") &&
        route.cacheControl.includes("no-store");
      const providerCacheHit =
        providerCacheHitObserved(json) ||
        providerCacheHitObserved(head) ||
        providerCacheHitObserved(route);
      if (!jsonOk) {
        blockers.push(`${environment.environment}-json-proof-route-not-delivered`);
      }
      if (!routeOk) {
        blockers.push(`${environment.environment}-browser-proof-route-not-delivered`);
      }
      if (!headOk || !optionsSafe) {
        blockers.push(`${environment.environment}-safe-method-boundary-not-proven`);
      }
      if (!httpRedirectOk) {
        blockers.push(`${environment.environment}-http-does-not-redirect-to-https`);
      }
      if (!noStoreDeclared || providerCacheHit) {
        blockers.push(`${environment.environment}-proof-route-provider-cache-hit-observed`);
      }
      hostEvidence.push({
        environment: environment.environment,
        fqdn: host.fqdn,
        httpsJsonStatus: json.status,
        httpsRouteStatus: route.status,
        headStatus: head.status,
        optionsStatus: options.status,
        httpStatus: http.status,
        httpLocation: http.location,
        httpRedirectToHttpsObserved: httpRedirectOk,
        proofRoutesNoStoreDeclared: noStoreDeclared,
        providerCacheHitObserved: providerCacheHit,
        destructiveMethodsUsed: false,
        realTenantDataUsed: false,
        realSecretsUsed: false,
      });
    }
  }

  const status = blockers.length === 0 ? "pass" : "blocked";
  console.log(
    JSON.stringify(
      {
        status,
        proof: "pre-staging-external-smoke-proof",
        issueId: "USF-271",
        parentIssueId: "USF-267",
        stagingSpecificEnablementMayBegin: status === "pass",
        hostEvidence,
        blockers,
        nonDestructive: true,
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
        ],
      },
      null,
      2,
    ),
  );
  return status === "pass" ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const safeCode =
      error instanceof Error ? error.name.replace(/[^a-zA-Z0-9_-]/g, "-") : "unknown-error";
    console.error(JSON.stringify({ status: "fail", safeCode }));
    process.exitCode = 1;
  },
);
