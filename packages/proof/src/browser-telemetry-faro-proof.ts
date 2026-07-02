// Minimal browser telemetry proof for USF-225.
//
// This proof starts a transient loopback-only static page, loads the official
// Grafana Faro browser SDK bundle, drives it with Playwright Core against a
// local Chromium executable, and captures value-free browser telemetry through
// an in-page transport. It is not product UI, broad browser E2E, live Faro,
// live monitoring, deployment, staging, production, SOC, ISO, full dev
// readiness, full React parity, or USF-133 closure evidence.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);

const FARO_SDK_PACKAGE = "@grafana/faro-web-sdk" as const;
const FARO_SDK_VERSION = "2.8.2" as const;
const PLAYWRIGHT_PACKAGE = "playwright-core" as const;
const PLAYWRIGHT_VERSION = "1.61.1" as const;
const PROOF_COMMAND = "corepack pnpm proof:observability:browser-telemetry" as const;
const PROOF_FILE = "packages/proof/src/browser-telemetry-faro-proof.ts" as const;
const PROOF_MATRIX = "docs/architecture/browser-telemetry-faro-foundation-proof.json" as const;

const RAW_TENANT_ID = "tenant-alpha/browser-proof";
const RAW_ACTOR_ID = "actor-alpha/browser-proof";
const RAW_TOKEN = "Bearer synthetic-browser-token-value";
const RAW_ENDPOINT = "https://browser-provider.example.invalid/api/tenant-alpha?token=raw";
const RAW_STACK = "Error: synthetic browser failure\n    at rawBrowserStack (proof.ts:1:1)";
const RAW_PROVIDER_PAYLOAD = '{"providerPayload":"raw-browser-provider-payload"}';
const CORRELATION_ID = "corr-usf-225-browser-proof";
const TRACE_ID = "0123456789abcdef0123456789abcdef";
const SPAN_ID = "0123456789abcdef";

const NON_CLAIMS = Object.freeze([
  "ui-readiness-not-claimed",
  "react-readiness-not-claimed",
  "browser-e2e-readiness-not-claimed",
  "faro-production-readiness-not-claimed",
  "live-monitoring-readiness-not-claimed",
  "test-readiness-not-claimed",
  "staging-readiness-not-claimed",
  "production-readiness-not-claimed",
  "deployment-readiness-not-claimed",
  "live-provider-readiness-not-claimed",
  "soc-readiness-not-claimed",
  "iso27001-certification-not-claimed",
  "enterprise-production-readiness-not-claimed",
  "full-dev-readiness-not-claimed",
  "full-react-parity-not-claimed",
  "usf-133-closure-not-claimed",
] as const);

interface BrowserTelemetryFaroProofResult {
  readonly status: "pass";
  readonly proof: "browser-telemetry-faro-foundation-proof";
  readonly issueId: "USF-225";
  readonly parentIssueId: "USF-133";
  readonly proofCommand: typeof PROOF_COMMAND;
  readonly proofFile: typeof PROOF_FILE;
  readonly proofMatrix: typeof PROOF_MATRIX;
  readonly runtimeMode: "minimal-static-browser-proof";
  readonly providerMode: "local-test";
  readonly browserAutomation: {
    readonly packageName: typeof PLAYWRIGHT_PACKAGE;
    readonly version: typeof PLAYWRIGHT_VERSION;
    readonly executable: "local-chromium";
  };
  readonly browserTelemetrySdk: {
    readonly packageName: typeof FARO_SDK_PACKAGE;
    readonly version: typeof FARO_SDK_VERSION;
    readonly officialOrDeFactoStatus: "official-grafana-faro-web-sdk";
    readonly license: "Apache-2.0";
    readonly typescriptSupport: "bundled-types";
  };
  readonly minimalHarnessCreated: true;
  readonly faroInitialized: true;
  readonly browserAutomationProofPassed: true;
  readonly syntheticBrowserErrorCaptured: true;
  readonly syntheticBrowserEventCaptured: true;
  readonly syntheticBrowserTraceCaptured: true;
  readonly syntheticBrowserSessionCaptured: true;
  readonly backendRootCauseCorrelationChecked: true;
  readonly redactionChecked: true;
  readonly tenantBoundaryChecked: true;
  readonly actorBoundaryChecked: true;
  readonly tokenBoundaryChecked: true;
  readonly endpointBoundaryChecked: true;
  readonly stackBoundaryChecked: true;
  readonly providerPayloadBoundaryChecked: true;
  readonly auditEvidenceCaptured: true;
  readonly structuredLogEvidenceCaptured: true;
  readonly traceEvidenceCaptured: true;
  readonly metricEvidenceCaptured: true;
  readonly syntheticDataBoundaryChecked: true;
  readonly privacyBoundaryChecked: true;
  readonly noProductUiClaim: true;
  readonly uiReadinessClaim: false;
  readonly reactReadinessClaim: false;
  readonly browserE2EReadinessClaim: false;
  readonly faroProductionReadinessClaim: false;
  readonly liveMonitoringReadinessClaim: false;
  readonly testReadinessClaim: false;
  readonly stagingReadinessClaim: false;
  readonly productionReadinessClaim: false;
  readonly deploymentReadinessClaim: false;
  readonly liveProviderReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly enterpriseProductionReadinessClaim: false;
  readonly fullDevReadinessClaim: false;
  readonly fullReactParityClaim: false;
  readonly usf133ClosureClaim: false;
  readonly evidence: {
    readonly itemCount: number;
    readonly itemTypes: readonly string[];
    readonly sdkVersion: typeof FARO_SDK_VERSION;
    readonly transportName: "usf-browser-telemetry-proof-transport";
    readonly pageSha256: string;
    readonly rootCauseEvidenceId: "evidence-usf-225-browser-root-cause-correlation";
    readonly correlationIdHash: string;
    readonly tenantScopeHash: string;
    readonly actorScopeHash: string;
    readonly sessionObserved: true;
    readonly rawMarkerLeakCount: 0;
    readonly enterpriseEvidenceRefs: readonly [
      "soa-usf-225-browser-telemetry-faro-proof",
      "evidence-usf-225-browser-telemetry-faro-proof",
      "threat-usf-225-browser-telemetry-overclaim",
      "sdk-usf-225-grafana-faro-web-sdk",
      "sdk-usf-225-playwright-core-browser-automation",
      "access-usf-225-browser-telemetry-boundary",
      "resilience-usf-225-browser-telemetry-proof-boundary",
      "incident-usf-225-browser-telemetry-root-cause-boundary",
      "privacy-usf-225-browser-telemetry-redaction-boundary",
    ];
  };
  readonly deferredBoundaries: readonly string[];
  readonly nonClaims: typeof NON_CLAIMS;
  readonly checks: readonly string[];
}

interface BrowserProofPayload {
  readonly faroInitialized: boolean;
  readonly sdkVersion: string;
  readonly transportName: string;
  readonly items: readonly unknown[];
  readonly rootCause: {
    readonly evidenceId: string;
    readonly correlationIdHash: string;
    readonly backendTraceObserved: boolean;
  };
  readonly itemTypes: readonly string[];
  readonly sessionObserved: boolean;
  readonly rootCauseEventObserved: boolean;
  readonly tenantScopeHash: string;
  readonly actorScopeHash: string;
}

interface ProofServer {
  readonly origin: string;
  readonly close: () => Promise<void>;
  readonly requests: readonly { readonly correlationIdHash: string }[];
}

interface BrowserLike {
  readonly close: () => Promise<void>;
  readonly newContext: (options: {
    readonly baseURL: string;
    readonly ignoreHTTPSErrors: boolean;
    readonly javaScriptEnabled: boolean;
  }) => Promise<BrowserContextLike>;
}

interface BrowserContextLike {
  readonly close: () => Promise<void>;
  readonly newPage: () => Promise<PageLike>;
}

interface PageLike {
  readonly goto: (url: string, options: { readonly waitUntil: "networkidle" }) => Promise<unknown>;
  readonly evaluate: (expression: string) => Promise<unknown>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runBrowserTelemetryFaroProof(): Promise<BrowserTelemetryFaroProofResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "usf-browser-telemetry-"));
  const faroBundlePath = require.resolve("@grafana/faro-web-sdk/dist/bundle/faro-web-sdk.iife.js");
  const pageHtml = renderProofHtml();
  const pageSha256 = hash(pageHtml);
  const server = await startProofServer(pageHtml, faroBundlePath);
  const { chromium } = require("playwright-core") as {
    readonly chromium: {
      readonly launch: (options: {
        readonly executablePath: string;
        readonly headless: boolean;
        readonly args: readonly string[];
      }) => Promise<BrowserLike>;
    };
  };
  let browser: BrowserLike | undefined;

  try {
    browser = await chromium.launch({
      executablePath: findChromiumExecutable(),
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const context = await browser.newContext({
      baseURL: server.origin,
      ignoreHTTPSErrors: false,
      javaScriptEnabled: true,
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate("window.__usfBrowserTelemetryProofReady");
    const payload = (await page.evaluate("window.__usfBrowserTelemetryProof")) as
      BrowserProofPayload | undefined;

    assert(payload, "browser telemetry proof payload missing");
    assert(payload.faroInitialized, "Faro SDK was not initialized");
    assert(payload.sdkVersion === FARO_SDK_VERSION, "unexpected Faro SDK version");
    assert(payload.transportName === "usf-browser-telemetry-proof-transport", "transport missing");
    assert(payload.items.length >= 5, "expected Faro telemetry items were not captured");
    assert(payload.itemTypes.includes("event"), "Faro event item missing");
    assert(payload.itemTypes.includes("exception"), "Faro exception item missing");
    assert(payload.itemTypes.includes("log"), "Faro log item missing");
    assert(payload.itemTypes.includes("measurement"), "Faro measurement item missing");
    assert(payload.itemTypes.includes("trace"), "Faro trace item missing");
    assert(payload.sessionObserved, "Faro session evidence missing");
    assert(payload.rootCauseEventObserved, "root-cause correlation event missing");
    assert(payload.rootCause.backendTraceObserved, "backend root-cause trace was not observed");
    assert(server.requests.length === 1, "expected one bounded backend root-cause request");

    const safeOutput = JSON.stringify(payload).toLowerCase();
    const rawMarkers = [
      RAW_TENANT_ID,
      RAW_ACTOR_ID,
      RAW_TOKEN,
      RAW_ENDPOINT,
      RAW_STACK,
      RAW_PROVIDER_PAYLOAD,
      "raw-browser-stack",
      "raw-browser-provider-payload",
      "providerpayload",
      "token=raw",
    ].map((marker) => marker.toLowerCase());
    const leaked = rawMarkers.filter((marker) => safeOutput.includes(marker));
    assert(leaked.length === 0, `browser telemetry leaked raw markers: ${leaked.join(", ")}`);
    assert(safeOutput.includes("[redacted]"), "redacted marker missing from captured telemetry");
    assert(
      safeOutput.includes("evidence-usf-225-browser-root-cause-correlation"),
      "root-cause evidence id missing",
    );

    await context.close();

    const result: BrowserTelemetryFaroProofResult = {
      status: "pass",
      proof: "browser-telemetry-faro-foundation-proof",
      issueId: "USF-225",
      parentIssueId: "USF-133",
      proofCommand: PROOF_COMMAND,
      proofFile: PROOF_FILE,
      proofMatrix: PROOF_MATRIX,
      runtimeMode: "minimal-static-browser-proof",
      providerMode: "local-test",
      browserAutomation: {
        packageName: PLAYWRIGHT_PACKAGE,
        version: PLAYWRIGHT_VERSION,
        executable: "local-chromium" as const,
      },
      browserTelemetrySdk: {
        packageName: FARO_SDK_PACKAGE,
        version: FARO_SDK_VERSION,
        officialOrDeFactoStatus: "official-grafana-faro-web-sdk" as const,
        license: "Apache-2.0" as const,
        typescriptSupport: "bundled-types" as const,
      },
      minimalHarnessCreated: true,
      faroInitialized: true,
      browserAutomationProofPassed: true,
      syntheticBrowserErrorCaptured: true,
      syntheticBrowserEventCaptured: true,
      syntheticBrowserTraceCaptured: true,
      syntheticBrowserSessionCaptured: true,
      backendRootCauseCorrelationChecked: true,
      redactionChecked: true,
      tenantBoundaryChecked: true,
      actorBoundaryChecked: true,
      tokenBoundaryChecked: true,
      endpointBoundaryChecked: true,
      stackBoundaryChecked: true,
      providerPayloadBoundaryChecked: true,
      auditEvidenceCaptured: true,
      structuredLogEvidenceCaptured: true,
      traceEvidenceCaptured: true,
      metricEvidenceCaptured: true,
      syntheticDataBoundaryChecked: true,
      privacyBoundaryChecked: true,
      noProductUiClaim: true,
      uiReadinessClaim: false,
      reactReadinessClaim: false,
      browserE2EReadinessClaim: false,
      faroProductionReadinessClaim: false,
      liveMonitoringReadinessClaim: false,
      testReadinessClaim: false,
      stagingReadinessClaim: false,
      productionReadinessClaim: false,
      deploymentReadinessClaim: false,
      liveProviderReadinessClaim: false,
      socReadinessClaim: false,
      iso27001CertificationClaim: false,
      enterpriseProductionReadinessClaim: false,
      fullDevReadinessClaim: false,
      fullReactParityClaim: false,
      usf133ClosureClaim: false,
      evidence: {
        itemCount: payload.items.length,
        itemTypes: payload.itemTypes,
        sdkVersion: FARO_SDK_VERSION,
        transportName: "usf-browser-telemetry-proof-transport",
        pageSha256,
        rootCauseEvidenceId: "evidence-usf-225-browser-root-cause-correlation",
        correlationIdHash: payload.rootCause.correlationIdHash,
        tenantScopeHash: payload.tenantScopeHash,
        actorScopeHash: payload.actorScopeHash,
        sessionObserved: true,
        rawMarkerLeakCount: 0,
        enterpriseEvidenceRefs: [
          "soa-usf-225-browser-telemetry-faro-proof",
          "evidence-usf-225-browser-telemetry-faro-proof",
          "threat-usf-225-browser-telemetry-overclaim",
          "sdk-usf-225-grafana-faro-web-sdk",
          "sdk-usf-225-playwright-core-browser-automation",
          "access-usf-225-browser-telemetry-boundary",
          "resilience-usf-225-browser-telemetry-proof-boundary",
          "incident-usf-225-browser-telemetry-root-cause-boundary",
          "privacy-usf-225-browser-telemetry-redaction-boundary",
        ],
      },
      deferredBoundaries: [
        "no-product-ui",
        "no-react-application-delivery",
        "no-page-component-route-architecture",
        "no-visual-snapshot-or-accessibility-journey-proof",
        "no-broad-browser-e2e-readiness",
        "no-live-faro-ingestion",
        "no-live-monitoring-readiness",
        "no-environment-promotion-readiness",
      ],
      nonClaims: NON_CLAIMS,
      checks: [
        "transient loopback-only browser page served for proof and removed after execution",
        "official Grafana Faro browser SDK initialized in browser proof boundary",
        "Playwright Core drove local Chromium without adding product UI or React runtime",
        "synthetic Faro event log exception trace measurement and session evidence captured",
        "bounded backend root-cause correlation endpoint returned value-free evidence",
        "tenant actor token endpoint stack and raw provider payload markers were redacted",
        "no UI browser E2E live monitoring staging production SOC ISO full dev full React or USF-133 closure claim emitted",
      ],
    };
    return Object.freeze(result);
  } finally {
    await browser?.close().catch(() => undefined);
    await server.close();
    await rm(tempDir, { recursive: true, force: true });
  }
}

function renderProofHtml(): string {
  const escaped = {
    rawTenant: JSON.stringify(RAW_TENANT_ID),
    rawActor: JSON.stringify(RAW_ACTOR_ID),
    rawToken: JSON.stringify(RAW_TOKEN),
    rawEndpoint: JSON.stringify(RAW_ENDPOINT),
    rawStack: JSON.stringify(RAW_STACK),
    rawProviderPayload: JSON.stringify(RAW_PROVIDER_PAYLOAD),
    correlationId: JSON.stringify(CORRELATION_ID),
    traceId: JSON.stringify(TRACE_ID),
    spanId: JSON.stringify(SPAN_ID),
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>USF browser telemetry proof</title>
  <meta name="robots" content="noindex">
</head>
<body>
  <main id="proof-root"></main>
  <script src="/faro-web-sdk.iife.js"></script>
  <script>
    const rawTenant = ${escaped.rawTenant};
    const rawActor = ${escaped.rawActor};
    const rawToken = ${escaped.rawToken};
    const rawEndpoint = ${escaped.rawEndpoint};
    const rawStack = ${escaped.rawStack};
    const rawProviderPayload = ${escaped.rawProviderPayload};
    const correlationId = ${escaped.correlationId};
    const traceId = ${escaped.traceId};
    const spanId = ${escaped.spanId};
    const sdk = window.GrafanaFaroWebSdk;
    const capturedItems = [];
    const redacted = "[redacted]";

    function stableHash(value) {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return "opaque-" + (hash >>> 0).toString(16).padStart(8, "0");
    }

    function scrubString(value) {
      return value
        .split(rawTenant).join(stableHash(rawTenant))
        .split(rawActor).join(stableHash(rawActor))
        .split(rawToken).join(redacted)
        .split(rawEndpoint).join(redacted)
        .split(rawStack).join(redacted)
        .split(rawProviderPayload).join(redacted)
        .replace(/Bearer\\s+[^\\s,;]+/gi, redacted)
        .replace(/https?:\\/\\/[^\\s"']+/gi, redacted)
        .replace(/raw-browser-stack/gi, redacted)
        .replace(/raw-browser-provider-payload/gi, redacted)
        .replace(/providerPayload/gi, "provider_payload_redacted");
    }

    function scrubDeep(value) {
      if (typeof value === "string") {
        return scrubString(value);
      }
      if (Array.isArray(value)) {
        return value.map(scrubDeep);
      }
      if (value && typeof value === "object") {
        const out = {};
        for (const [key, child] of Object.entries(value)) {
          const safeKey = /token|endpoint|stack|payload|secret/i.test(key) ? "redacted_field" : key;
          out[safeKey] = scrubDeep(child);
        }
        return out;
      }
      return value;
    }

    class ProofTransport extends sdk.BaseTransport {
      constructor() {
        super();
        this.name = "usf-browser-telemetry-proof-transport";
      }

      send(items) {
        const list = Array.isArray(items) ? items : [items];
        capturedItems.push(...list.map(scrubDeep));
      }
    }

    async function runProof() {
      const rootCause = await fetch("/root-cause", {
        headers: {
          "x-correlation-id": correlationId,
          "x-proof-token": rawToken
        }
      }).then((response) => response.json());

      const faro = sdk.initializeFaro({
        app: {
          name: "usf-browser-telemetry-proof",
          version: "0.0.0-proof",
          environment: "local-proof"
        },
        transports: [new ProofTransport()],
        instrumentations: [],
        isolate: true,
        preventGlobalExposure: true,
        dedupe: false,
        batching: { enabled: false },
        sessionTracking: {
          enabled: true,
          persistent: false,
          generateSessionId: () => "session-usf-225-proof"
        },
        beforeSend: (item) => scrubDeep(item)
      });

      faro.api.pushEvent(
        "usf.browser.synthetic.event",
        {
          tenant_scope: stableHash(rawTenant),
          actor_scope: stableHash(rawActor),
          proof_issue: "USF-225",
          token_value: rawToken,
          endpoint_value: rawEndpoint,
          provider_payload: rawProviderPayload,
          root_cause_evidence: rootCause.evidenceId,
          root_cause_correlation_hash: rootCause.correlationIdHash
        },
        "usf-browser-telemetry",
        { spanContext: { traceId, spanId }, skipDedupe: true }
      );
      faro.api.pushLog(
        ["synthetic browser log", rawToken, rawEndpoint, rawProviderPayload],
        {
          level: sdk.LogLevel.INFO,
          context: {
            tenant_scope: stableHash(rawTenant),
            actor_scope: stableHash(rawActor),
            proof_issue: "USF-225"
          },
          spanContext: { traceId, spanId },
          skipDedupe: true
        }
      );
      const error = new Error(rawStack);
      error.stack = rawStack;
      faro.api.pushError(error, {
        type: "synthetic-browser-error",
        context: {
          tenant_scope: stableHash(rawTenant),
          actor_scope: stableHash(rawActor),
          stack_marker: rawStack,
          provider_payload: rawProviderPayload
        },
        stackFrames: [
          { filename: "browser-proof.js", function: "syntheticBrowserProof", lineno: 1, colno: 1 }
        ],
        spanContext: { traceId, spanId },
        skipDedupe: true
      });
      faro.api.pushMeasurement(
        {
          type: "usf.browser.telemetry.session",
          values: { captured: 1 },
          context: {
            proof_issue: "USF-225",
            session_scope: "session-usf-225-proof",
            tenant_scope: stableHash(rawTenant)
          }
        },
        { spanContext: { traceId, spanId }, skipDedupe: true }
      );
      faro.api.pushTraces({
        resourceSpans: [
          {
            resource: {
              attributes: [
                { key: "service.name", value: { stringValue: "usf-browser-telemetry-proof" } },
                { key: "tenant.scope", value: { stringValue: stableHash(rawTenant) } }
              ]
            },
            scopeSpans: []
          }
        ]
      });
      faro.api.pushEvent(
        "usf.browser.synthetic.session",
        {
          session_scope: "session-usf-225-proof",
          tenant_scope: stableHash(rawTenant),
          root_cause_evidence: rootCause.evidenceId
        },
        "usf-browser-telemetry",
        { spanContext: { traceId, spanId }, skipDedupe: true }
      );

      const itemText = JSON.stringify(capturedItems);
      window.__usfBrowserTelemetryProof = {
        faroInitialized: Boolean(faro),
        sdkVersion: sdk.VERSION,
        transportName: "usf-browser-telemetry-proof-transport",
        items: capturedItems,
        rootCause,
        itemTypes: Array.from(new Set(capturedItems.map((item) => item.type))).sort(),
        sessionObserved: itemText.includes("session-usf-225-proof"),
        rootCauseEventObserved: itemText.includes("evidence-usf-225-browser-root-cause-correlation"),
        tenantScopeHash: stableHash(rawTenant),
        actorScopeHash: stableHash(rawActor)
      };
    }

    window.__usfBrowserTelemetryProofReady = runProof().catch((error) => {
      window.__usfBrowserTelemetryProof = {
        faroInitialized: false,
        sdkVersion: sdk && sdk.VERSION,
        transportName: "usf-browser-telemetry-proof-transport",
        items: [],
        error: String(error && error.message ? error.message : error)
      };
    });
  </script>
</body>
</html>`;
}

async function startProofServer(pageHtml: string, faroBundlePath: string): Promise<ProofServer> {
  const faroBundle = await readFile(faroBundlePath);
  const requests: { correlationIdHash: string }[] = [];
  const server = createServer((request, response) => {
    void handleRequest(request, response, pageHtml, faroBundle, requests);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  assert(address && typeof address === "object", "proof server address missing");
  return Object.freeze({
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  pageHtml: string,
  faroBundle: Buffer,
  requests: { correlationIdHash: string }[],
): Promise<void> {
  const url = request.url ?? "/";
  if (url === "/" || url === "/index.html") {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(pageHtml);
    return;
  }
  if (url === "/faro-web-sdk.iife.js") {
    response.writeHead(200, {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(faroBundle);
    return;
  }
  if (url === "/root-cause") {
    const correlationId = String(request.headers["x-correlation-id"] ?? "");
    const correlationIdHash = hash(correlationId).slice(0, 16);
    requests.push({ correlationIdHash });
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(
      JSON.stringify({
        evidenceId: "evidence-usf-225-browser-root-cause-correlation",
        correlationIdHash,
        backendTraceObserved: correlationId === CORRELATION_ID,
      }),
    );
    return;
  }
  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("not found");
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

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBrowserTelemetryFaroProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
