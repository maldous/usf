import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "docs/architecture/public-fqdn-semantic-contract.json";
const CACHE_GATE_PATH = "docs/architecture/external-http-cache-provider-proof-gate.json";
const FETCH_TIMEOUT_MS = 15_000;

interface HostRow {
  readonly fqdn: string;
}

interface EnvironmentRow {
  readonly environment: "staging" | "production";
  readonly requiredHostnames: readonly HostRow[];
}

interface PublicContract {
  readonly environments: readonly EnvironmentRow[];
  readonly publicJsonProofEndpoint: {
    readonly route: string;
  };
  readonly publicRouteBinding: {
    readonly route: string;
  };
}

function withTimeout(): AbortSignal {
  return AbortSignal.timeout(FETCH_TIMEOUT_MS);
}

async function probe(url: string, method: "GET" | "HEAD") {
  const response = await fetch(url, {
    method,
    redirect: "follow",
    signal: withTimeout(),
  });
  const ageHeader = response.headers.get("age") ?? "";
  const ageSeconds = Number.parseInt(ageHeader, 10);
  const cacheStatus = response.headers.get("cache-status") ?? "";
  const cfCacheStatus = response.headers.get("cf-cache-status") ?? "";
  const cdnCacheStatus = response.headers.get("cdn-cache-status") ?? "";
  const xCache = response.headers.get("x-cache") ?? "";
  const providerCacheStatuses = [cacheStatus, cfCacheStatus, cdnCacheStatus, xCache]
    .filter(Boolean)
    .join("; ");
  const providerCacheHitObserved =
    /\bhit\b/i.test(providerCacheStatuses) || (Number.isFinite(ageSeconds) && ageSeconds > 0);
  return {
    method,
    status: response.status,
    cacheControl: response.headers.get("cache-control") ?? "",
    ageHeader,
    ageSeconds: Number.isFinite(ageSeconds) ? ageSeconds : null,
    etagObserved: Boolean(response.headers.get("etag")),
    lastModifiedObserved: Boolean(response.headers.get("last-modified")),
    varyObserved: Boolean(response.headers.get("vary")),
    ageObserved: Boolean(ageHeader),
    cacheStatus,
    cfCacheStatus,
    cdnCacheStatus,
    xCache,
    providerCacheHeaderObserved: Boolean(providerCacheStatuses),
    providerCacheHitObserved,
    contentEncodingObserved: Boolean(response.headers.get("content-encoding")),
  };
}

async function main(): Promise<number> {
  const contract = JSON.parse(await readFile(resolve(CONTRACT_PATH), "utf8")) as PublicContract;
  const cacheGate = JSON.parse(await readFile(resolve(CACHE_GATE_PATH), "utf8")) as {
    readonly status?: string;
  };
  const hostEvidence = [];
  const failures: string[] = [];

  for (const environment of contract.environments) {
    for (const host of environment.requiredHostnames) {
      const jsonUrl = `https://${host.fqdn}${contract.publicJsonProofEndpoint.route}`;
      const routeUrl = `https://${host.fqdn}${contract.publicRouteBinding.route}`;
      const jsonGet = await probe(jsonUrl, "GET");
      const jsonHead = await probe(jsonUrl, "HEAD");
      const routeGet = await probe(routeUrl, "GET");
      const proofRoutesNoStore =
        jsonGet.status === 200 &&
        jsonHead.status === 200 &&
        routeGet.status === 200 &&
        jsonGet.cacheControl.includes("no-store") &&
        jsonHead.cacheControl.includes("no-store") &&
        routeGet.cacheControl.includes("no-store");
      if (!proofRoutesNoStore) {
        failures.push(`${environment.environment}-proof-route-cache-policy-not-no-store`);
      }
      const providerCacheHitObserved =
        jsonGet.providerCacheHitObserved ||
        jsonHead.providerCacheHitObserved ||
        routeGet.providerCacheHitObserved;
      if (providerCacheHitObserved) {
        failures.push(`${environment.environment}-proof-route-provider-cache-hit-observed`);
      }
      hostEvidence.push({
        environment: environment.environment,
        fqdn: host.fqdn,
        jsonGet,
        jsonHead,
        routeGet,
        proofRoutesNoStore,
        providerCacheHitObserved,
      });
    }
  }

  if (cacheGate.status !== "pass") {
    failures.push("cache-gate-static-evidence-not-pass");
  }
  const status = failures.length === 0 ? "pass" : "blocked";
  console.log(
    JSON.stringify(
      {
        status,
        proof: "external-http-cache-provider-proof",
        issueId: "USF-269",
        parentIssueId: "USF-267",
        providerHeadersObservedAsEvidenceOnly: true,
        providerHeadersSemanticAuthority: false,
        hostEvidence,
        failures,
        blockers: failures.map((failure) => ({
          id: failure,
          issueId: "USF-269",
          requiredOperatorAction:
            "Configure the public edge or origin so proof/control routes are not served from provider cache when Cache-Control is no-store, or record a later explicit human-approved bounded rationale.",
          blocksStagingSpecificEnablement: true,
        })),
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
          "no-full-react-product-parity",
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
