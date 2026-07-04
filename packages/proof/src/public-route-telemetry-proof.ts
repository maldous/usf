import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

type ProofScope = "all" | "staging" | "production";

interface ContractHost {
  readonly fqdn: string;
  readonly routeBindingId: string;
  readonly telemetryBootstrapId: string;
}

interface ContractEnvironment {
  readonly environment: "staging" | "production";
  readonly requiredHostnames: readonly ContractHost[];
}

interface PublicFqdnContract {
  readonly environments: readonly ContractEnvironment[];
  readonly publicRouteBinding: {
    readonly id: string;
    readonly route: string;
    readonly expectedMarker: string;
    readonly expectedContentType: string;
    readonly telemetryBootstrapId: string;
  };
  readonly publicTelemetryBootstrap: {
    readonly id: string;
    readonly telemetrySystems: readonly string[];
  };
}

interface BrowserLike {
  readonly close: () => Promise<void>;
  readonly newContext: (options: {
    readonly ignoreHTTPSErrors: boolean;
    readonly javaScriptEnabled: boolean;
  }) => Promise<BrowserContextLike>;
}

interface BrowserContextLike {
  readonly close: () => Promise<void>;
  readonly newPage: () => Promise<PageLike>;
}

interface ResponseLike {
  readonly status: () => number;
  readonly headers: () => Record<string, string>;
}

interface PageLike {
  readonly goto: (
    url: string,
    options: { readonly waitUntil: "networkidle"; readonly timeout: number },
  ) => Promise<ResponseLike | null>;
  readonly on: (event: string, handler: (value: unknown) => void) => void;
  readonly url: () => string;
  readonly evaluate: <T>(expression: string) => Promise<T>;
}

interface RoutePageEvidence {
  readonly title: string;
  readonly markerMeta: string | null;
  readonly telemetryMeta: string | null;
  readonly proofMarker: string | null;
  readonly proofSurface: string | null;
  readonly bootstrapScriptPresent: boolean;
  readonly bootstrap: {
    readonly marker?: string;
    readonly route?: string;
    readonly routeClass?: string;
    readonly proofSurface?: string;
    readonly issueId?: string;
    readonly environment?: string;
    readonly fqdn?: string;
    readonly telemetrySystems?: readonly string[];
    readonly telemetryBootstrapOnly?: boolean;
    readonly productUiReadinessClaim?: boolean;
    readonly browserE2eReadinessClaim?: boolean;
  } | null;
  readonly httpSubresourceCount: number;
}

interface HostRouteEvidence {
  readonly environment: "staging" | "production";
  readonly fqdn: string;
  readonly proofCommandId: string;
  readonly attemptedRoute: string;
  readonly attemptedUrlHash: string;
  readonly responseStatus: number | null;
  readonly contentTypeMatched: boolean;
  readonly finalUrlScheme: "https" | "http" | "other";
  readonly finalHostMatched: boolean;
  readonly finalHostname: string;
  readonly canonicalRouteMatched: boolean;
  readonly localhostOrPrivateHostObserved: boolean;
  readonly httpOnlyDeliveryObserved: boolean;
  readonly mixedContentObserved: boolean;
  readonly proofMarkerObserved: boolean;
  readonly telemetryBootstrapObserved: boolean;
  readonly telemetrySystemsObserved: readonly string[];
  readonly telemetryBootstrapOnlyObserved: boolean;
  readonly productUiReadinessClaimObserved: boolean;
  readonly browserE2eReadinessClaimObserved: boolean;
  readonly caddyRequiredGatewayClaimObserved: boolean;
  readonly safeErrorCode: string | null;
  readonly status: "pass" | "fail";
}

interface PublicRouteTelemetryProofResult {
  readonly status: "pass" | "fail";
  readonly proof: "public-route-telemetry-playwright-proof";
  readonly issueId: "USF-264";
  readonly parentIssueId: "USF-261";
  readonly semanticContract: typeof CONTRACT_PATH;
  readonly scope: ProofScope;
  readonly proofCommand: string;
  readonly proofFile: typeof PROOF_FILE;
  readonly route: string;
  readonly browserAutomation: {
    readonly packageName: "playwright-core";
    readonly version: "1.61.1";
    readonly executable: "local-chromium";
  };
  readonly gatewayNeutral: true;
  readonly caddyRequiredGatewayClaim: false;
  readonly productUiReadinessClaim: false;
  readonly browserE2eReadinessClaim: false;
  readonly stagingReadinessClaim: false;
  readonly productionReadinessClaim: false;
  readonly deploymentReadinessClaim: false;
  readonly liveProviderReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly isoCertificationClaim: false;
  readonly enterpriseProductionReadinessClaim: false;
  readonly fullReactParityClaim: false;
  readonly v2ProofTagAuthorizationClaim: false;
  readonly hostEvidence: readonly HostRouteEvidence[];
  readonly failureReasons: readonly string[];
  readonly checks: readonly string[];
  readonly nonClaims: readonly string[];
}

const CONTRACT_PATH = "docs/architecture/public-fqdn-semantic-contract.json" as const;
const PROOF_FILE = "packages/proof/src/public-route-telemetry-proof.ts" as const;
const FETCH_TIMEOUT_MS = 20_000;

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
  "no-v2-proof-tag-authorization",
] as const);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { readonly code?: unknown }).code ?? "unknown")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 80);
  }
  if (error instanceof Error && error.name) {
    return error.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  }
  return "unknown-error";
}

function findChromiumExecutable(): string {
  const candidates = [
    process.env.USF_BROWSER_EXECUTABLE,
    "/snap/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean) as string[];
  const executable = candidates.find((candidate) => existsSync(candidate));
  assert(executable, "local Chromium executable not found for Playwright proof");
  return executable;
}

async function loadContract(): Promise<PublicFqdnContract> {
  const raw = await readFile(resolve(CONTRACT_PATH), "utf8");
  return JSON.parse(raw) as PublicFqdnContract;
}

function selectedEnvironments(
  contract: PublicFqdnContract,
  scope: ProofScope,
): readonly ContractEnvironment[] {
  if (scope === "all") {
    return contract.environments;
  }
  return contract.environments.filter((row) => row.environment === scope);
}

function isUnsafePublicHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "127.0.0.1" ||
    lower.startsWith("127.") ||
    lower === "::1" ||
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./u.test(lower)
  );
}

function routeMatches(finalPathname: string, expectedRoute: string): boolean {
  return finalPathname === expectedRoute || finalPathname === `${expectedRoute}/`;
}

async function readPageEvidence(page: PageLike): Promise<RoutePageEvidence> {
  return await page.evaluate<RoutePageEvidence>(`(() => {
    const bootstrapScript = document.querySelector("#usf-public-route-telemetry-bootstrap");
    let bootstrap = null;
    if (bootstrapScript && bootstrapScript.textContent) {
      try {
        bootstrap = JSON.parse(bootstrapScript.textContent);
      } catch {
        bootstrap = null;
      }
    }
    const proof = document.querySelector("[data-proof-marker]");
    const resources = performance.getEntriesByType("resource");
    return {
      title: document.title,
      markerMeta: document.querySelector('meta[name="usf-public-route-marker"]')?.getAttribute("content") ?? null,
      telemetryMeta: document.querySelector('meta[name="usf-telemetry-bootstrap"]')?.getAttribute("content") ?? null,
      proofMarker: proof?.getAttribute("data-proof-marker") ?? null,
      proofSurface: proof?.getAttribute("data-proof-surface") ?? null,
      bootstrapScriptPresent: Boolean(bootstrapScript),
      bootstrap,
      httpSubresourceCount: resources.filter((entry) => String(entry.name).startsWith("http://")).length,
    };
  })()`);
}

async function proveHostRoute(
  browser: BrowserLike,
  environment: ContractEnvironment,
  host: ContractHost,
  contract: PublicFqdnContract,
): Promise<HostRouteEvidence> {
  const expectedRoute = contract.publicRouteBinding.route;
  const attemptedUrl = `https://${host.fqdn}${expectedRoute}`;
  const context = await browser.newContext({
    ignoreHTTPSErrors: false,
    javaScriptEnabled: true,
  });
  try {
    const page = await context.newPage();
    const mixedContentMessages: string[] = [];
    const failedHttpRequests: string[] = [];
    page.on("console", (value: unknown) => {
      const text =
        value && typeof value === "object" && "text" in value
          ? String((value as { readonly text?: unknown }).text ?? "")
          : "";
      if (text.toLowerCase().includes("mixed content")) {
        mixedContentMessages.push("mixed-content-console");
      }
    });
    page.on("requestfailed", (value: unknown) => {
      const url =
        value && typeof value === "object" && "url" in value
          ? String((value as { readonly url?: unknown }).url ?? "")
          : "";
      if (url.startsWith("http://")) {
        failedHttpRequests.push("http-subresource");
      }
    });

    const response = await page.goto(attemptedUrl, {
      waitUntil: "networkidle",
      timeout: FETCH_TIMEOUT_MS,
    });
    const finalUrl = new URL(page.url());
    const pageEvidence = await readPageEvidence(page);
    const bootstrap = pageEvidence.bootstrap;
    const telemetrySystems = Array.isArray(bootstrap?.telemetrySystems)
      ? bootstrap.telemetrySystems.map((item) => String(item)).sort()
      : [];
    const finalUrlScheme =
      finalUrl.protocol === "https:" ? "https" : finalUrl.protocol === "http:" ? "http" : "other";
    const finalHostMatched = finalUrl.hostname === host.fqdn;
    const localhostOrPrivateHostObserved = isUnsafePublicHost(finalUrl.hostname);
    const httpOnlyDeliveryObserved = finalUrlScheme !== "https";
    const mixedContentObserved =
      pageEvidence.httpSubresourceCount > 0 ||
      mixedContentMessages.length > 0 ||
      failedHttpRequests.length > 0;
    const contentType = response?.headers()["content-type"] ?? "";
    const status = response?.status() ?? null;
    const contentTypeMatched = contentType.includes(
      contract.publicRouteBinding.expectedContentType,
    );
    const proofMarkerObserved =
      pageEvidence.markerMeta === contract.publicRouteBinding.expectedMarker &&
      pageEvidence.proofMarker === contract.publicRouteBinding.expectedMarker &&
      bootstrap?.marker === contract.publicRouteBinding.expectedMarker &&
      bootstrap?.route === expectedRoute &&
      bootstrap?.issueId === "USF-264" &&
      bootstrap?.environment === environment.environment &&
      bootstrap?.fqdn === host.fqdn;
    const telemetryBootstrapObserved =
      pageEvidence.bootstrapScriptPresent &&
      pageEvidence.telemetryMeta === "faro,sentry" &&
      pageEvidence.proofSurface === "public-route-telemetry-bootstrap" &&
      bootstrap?.proofSurface === "public-route-telemetry-bootstrap" &&
      bootstrap?.telemetryBootstrapOnly === true &&
      telemetrySystems.includes("faro") &&
      telemetrySystems.includes("sentry");
    const productUiReadinessClaimObserved = bootstrap?.productUiReadinessClaim !== false;
    const browserE2eReadinessClaimObserved = bootstrap?.browserE2eReadinessClaim !== false;
    const canonicalRouteMatched = routeMatches(finalUrl.pathname, expectedRoute);
    const rowStatus =
      status === 200 &&
      contentTypeMatched &&
      finalUrlScheme === "https" &&
      finalHostMatched &&
      canonicalRouteMatched &&
      !localhostOrPrivateHostObserved &&
      !httpOnlyDeliveryObserved &&
      !mixedContentObserved &&
      proofMarkerObserved &&
      telemetryBootstrapObserved &&
      !productUiReadinessClaimObserved &&
      !browserE2eReadinessClaimObserved
        ? "pass"
        : "fail";
    return {
      environment: environment.environment,
      fqdn: host.fqdn,
      proofCommandId: `proof:public-route:${environment.environment}`,
      attemptedRoute: expectedRoute,
      attemptedUrlHash: hash(attemptedUrl),
      responseStatus: status,
      contentTypeMatched,
      finalUrlScheme,
      finalHostMatched,
      finalHostname: finalUrl.hostname,
      canonicalRouteMatched,
      localhostOrPrivateHostObserved,
      httpOnlyDeliveryObserved,
      mixedContentObserved,
      proofMarkerObserved,
      telemetryBootstrapObserved,
      telemetrySystemsObserved: telemetrySystems,
      telemetryBootstrapOnlyObserved: bootstrap?.telemetryBootstrapOnly === true,
      productUiReadinessClaimObserved,
      browserE2eReadinessClaimObserved,
      caddyRequiredGatewayClaimObserved: false,
      safeErrorCode: null,
      status: rowStatus,
    };
  } catch (error) {
    return {
      environment: environment.environment,
      fqdn: host.fqdn,
      proofCommandId: `proof:public-route:${environment.environment}`,
      attemptedRoute: expectedRoute,
      attemptedUrlHash: hash(attemptedUrl),
      responseStatus: null,
      contentTypeMatched: false,
      finalUrlScheme: "other",
      finalHostMatched: false,
      finalHostname: "unknown",
      canonicalRouteMatched: false,
      localhostOrPrivateHostObserved: false,
      httpOnlyDeliveryObserved: false,
      mixedContentObserved: false,
      proofMarkerObserved: false,
      telemetryBootstrapObserved: false,
      telemetrySystemsObserved: [],
      telemetryBootstrapOnlyObserved: false,
      productUiReadinessClaimObserved: false,
      browserE2eReadinessClaimObserved: false,
      caddyRequiredGatewayClaimObserved: false,
      safeErrorCode: safeErrorCode(error),
      status: "fail",
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function runPublicRouteTelemetryProof(
  scope: ProofScope = "all",
): Promise<PublicRouteTelemetryProofResult> {
  const contract = await loadContract();
  const { chromium } = require("playwright-core") as {
    readonly chromium: {
      readonly launch: (options: {
        readonly executablePath: string;
        readonly headless: boolean;
        readonly args: readonly string[];
      }) => Promise<BrowserLike>;
    };
  };
  const browser = await chromium.launch({
    executablePath: findChromiumExecutable(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const hostEvidence: HostRouteEvidence[] = [];
    for (const environment of selectedEnvironments(contract, scope)) {
      for (const host of environment.requiredHostnames) {
        hostEvidence.push(await proveHostRoute(browser, environment, host, contract));
      }
    }
    const failureReasons = hostEvidence
      .filter((row) => row.status === "fail")
      .map(
        (row) =>
          `${row.environment}:${row.fqdn}:status=${row.responseStatus ?? row.safeErrorCode}:host=${row.finalHostMatched}:https=${row.finalUrlScheme}:marker=${row.proofMarkerObserved}:telemetry=${row.telemetryBootstrapObserved}:mixed=${row.mixedContentObserved}`,
      );
    const status = failureReasons.length === 0 ? "pass" : "fail";
    return {
      status,
      proof: "public-route-telemetry-playwright-proof",
      issueId: "USF-264",
      parentIssueId: "USF-261",
      semanticContract: CONTRACT_PATH,
      scope,
      proofCommand:
        scope === "all"
          ? "corepack pnpm proof:public-route"
          : `corepack pnpm proof:public-route:${scope}`,
      proofFile: PROOF_FILE,
      route: contract.publicRouteBinding.route,
      browserAutomation: {
        packageName: "playwright-core",
        version: "1.61.1",
        executable: "local-chromium",
      },
      gatewayNeutral: true,
      caddyRequiredGatewayClaim: false,
      productUiReadinessClaim: false,
      browserE2eReadinessClaim: false,
      stagingReadinessClaim: false,
      productionReadinessClaim: false,
      deploymentReadinessClaim: false,
      liveProviderReadinessClaim: false,
      socReadinessClaim: false,
      isoCertificationClaim: false,
      enterpriseProductionReadinessClaim: false,
      fullReactParityClaim: false,
      v2ProofTagAuthorizationClaim: false,
      hostEvidence,
      failureReasons,
      checks: [
        "Playwright Core navigated over HTTPS to the public browser proof route for each selected FQDN",
        "final browser host matched the declared public FQDN and did not resolve to localhost private or internal hostnames",
        "HTTP-only delivery and mixed-content evidence failed closed",
        "non-product route proof marker was observed in DOM metadata and bootstrap payload",
        "Faro and Sentry telemetry bootstrap marker/config was observed without live telemetry ingestion",
        "proof remains gateway neutral and does not require Caddy Netlify Cloudflare Worker or another gateway product",
        "no staging production deployment live-provider SOC ISO enterprise production product UI browser E2E full React parity or v2-proof tag authorization claim emitted",
      ],
      nonClaims: NON_CLAIMS,
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function parseScope(argv: readonly string[]): ProofScope {
  const raw = argv[2] ?? "all";
  if (raw === "all" || raw === "staging" || raw === "production") {
    return raw;
  }
  throw new Error(`Unsupported public route proof scope: ${raw}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPublicRouteTelemetryProof(parseScope(process.argv))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.status !== "pass") {
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `${JSON.stringify({ status: "fail", safeCode: safeErrorCode(error) }, null, 2)}\n`,
      );
      process.exitCode = 1;
    });
}
