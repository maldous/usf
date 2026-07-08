import { Buffer } from "node:buffer";

type ProofReviewGateMode = "closed-default" | "open-review";

type ProofReviewRouteId =
  "landing" | "review" | "review-item" | "screenshots" | "final-report" | "signoff";

interface RouteExpectation {
  readonly id: ProofReviewRouteId;
  readonly path: string;
  readonly expectedMarkers: readonly string[];
  readonly anyOfMarkers?: readonly string[];
  readonly minimumInlineImages?: number;
}

interface RouteEvidence {
  readonly id: ProofReviewRouteId;
  readonly path: string;
  readonly url: string;
  readonly expectedGateMode: ProofReviewGateMode;
  readonly attempted: boolean;
  readonly status: number | null;
  readonly contentTypeMatched: boolean;
  readonly closedDefaultMatched: boolean;
  readonly markerResults: Record<string, boolean>;
  readonly anyOfMarkerResults: Record<string, boolean>;
  readonly anyOfMarkerMatched: boolean;
  readonly inlineImageCount: number;
  readonly safeErrorCode: string | null;
  readonly result: "pass" | "fail";
}

interface ProofReviewPublicProofResult {
  readonly status: "pass" | "fail";
  readonly proof: "proof-review-public-human-acknowledgement-proof";
  readonly origin: string;
  readonly issueId: "USF-290";
  readonly expectedGateMode: ProofReviewGateMode;
  readonly validatesPublicHttpsAvailability: true;
  readonly validatesHumanAcknowledgementSurface: boolean;
  readonly validatesClosedOperatorGate: boolean;
  readonly openReviewCredentialConfigured: boolean;
  readonly stagingReadinessClaim: false;
  readonly productionReadinessClaim: false;
  readonly deploymentReadinessClaim: false;
  readonly liveProviderReadinessClaim: false;
  readonly socReadinessClaim: false;
  readonly isoCertificationClaim: false;
  readonly enterpriseProductionReadinessClaim: false;
  readonly productUiReadinessClaim: false;
  readonly browserE2eReadinessClaim: false;
  readonly fullProductReadinessClaim: false;
  readonly routeEvidence: readonly RouteEvidence[];
  readonly failureReasons: readonly string[];
  readonly checks: readonly string[];
  readonly nonClaims: readonly string[];
}

const DEFAULT_ORIGIN = "https://1e100.network";
const FETCH_TIMEOUT_MS = 20_000;
const CLOSED_DEFAULT_MARKER = "USF proof review surface is not currently open";
const OPEN_REVIEW_VALUES = new Set(["1", "true", "yes", "open", "open-review"]);

const ROUTES = Object.freeze<RouteExpectation[]>([
  {
    id: "landing",
    path: "/proof",
    expectedMarkers: [
      "USF Proof Review",
      "Open printable report",
      "0 warnings",
      "0 unresolved gaps",
      "Final signoff",
    ],
    anyOfMarkers: ["No review items pending", "Next review item", "Start review"],
  },
  {
    id: "review",
    path: "/proof/review",
    expectedMarkers: ["Proof review workflow"],
    anyOfMarkers: ["No current review items are pending", "Evidence summary"],
  },
  {
    id: "review-item",
    path: "/proof/review?item=0",
    expectedMarkers: [
      "Evidence summary",
      "Machine QA conclusion",
      "Risk and assurance posture",
      "Accept",
      "Reject",
      "Request retest",
      "Add note",
      "Next",
    ],
    minimumInlineImages: 1,
  },
  {
    id: "screenshots",
    path: "/proof/screenshots",
    expectedMarkers: [
      "Visual evidence gallery",
      "Screenshot gallery",
      "Hash",
      "Redaction",
      "Human review",
    ],
    minimumInlineImages: 1,
  },
  {
    id: "final-report",
    path: "/proof/reports/final",
    expectedMarkers: [
      "External Review Report",
      "Scope and non-claims",
      "Machine QA",
      "Evidence chain of custody",
      "Human acceptance result",
    ],
  },
  {
    id: "signoff",
    path: "/proof/signoff",
    expectedMarkers: ["Final signoff", "not auto-completed", "human signoff"],
  },
]);

const NON_CLAIMS = Object.freeze([
  "no-product-ui-readiness",
  "no-real-user-staging-readiness",
  "no-production-readiness",
  "no-deployment-readiness",
  "no-live-provider-readiness",
  "no-soc-readiness",
  "no-iso-certification",
  "no-enterprise-production-readiness",
  "no-browser-e2e-readiness",
  "no-full-product-readiness",
]);

function normalizeOrigin(raw: string): string {
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:") {
    throw new Error("proof review public proof requires an https origin");
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      "proof review public proof does not accept credentials in the URL; use USF_PROOF_REVIEW_BASIC_USER and USF_PROOF_REVIEW_BASIC_PASSWORD",
    );
  }
  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function expectedGateModeFromEnv(): ProofReviewGateMode {
  const raw = (process.env.USF_PROOF_REVIEW_EXPECT_OPEN ?? "").trim().toLowerCase();
  return OPEN_REVIEW_VALUES.has(raw) ? "open-review" : "closed-default";
}

function openReviewAuthorizationHeader(): string | undefined {
  const user = process.env.USF_PROOF_REVIEW_BASIC_USER;
  const password = process.env.USF_PROOF_REVIEW_BASIC_PASSWORD;
  if (!user || !password) {
    return undefined;
  }
  return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

function safeErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    return String((error as { readonly name?: unknown }).name ?? "unknown-error")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 80);
  }
  if (error instanceof Error) {
    return error.message.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  }
  return "unknown-error";
}

async function fetchRoute(
  origin: string,
  expectation: RouteExpectation,
  expectedGateMode: ProofReviewGateMode,
  authorizationHeader: string | undefined,
): Promise<RouteEvidence> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const url = `${origin}${expectation.path}`;
  const headers: Record<string, string> = {};
  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
  }
  try {
    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    const markerResults = Object.fromEntries(
      expectation.expectedMarkers.map((marker) => [marker, body.includes(marker)]),
    );
    const anyOfMarkerResults = Object.fromEntries(
      (expectation.anyOfMarkers ?? []).map((marker) => [marker, body.includes(marker)]),
    );
    const anyOfMarkerMatched =
      !expectation.anyOfMarkers?.length || Object.values(anyOfMarkerResults).some(Boolean);
    const inlineImageCount = (body.match(/<img\b/gi) ?? []).length;
    const openReviewMatched =
      response.status === 200 &&
      contentType.includes("text/html") &&
      Object.values(markerResults).every(Boolean) &&
      anyOfMarkerMatched &&
      inlineImageCount >= (expectation.minimumInlineImages ?? 0);
    const closedDefaultMatched =
      response.status === 503 &&
      body.includes(CLOSED_DEFAULT_MARKER) &&
      !contentType.includes("text/html") &&
      !Object.values(markerResults).some(Boolean) &&
      inlineImageCount === 0;
    const result =
      expectedGateMode === "open-review"
        ? openReviewMatched
          ? "pass"
          : "fail"
        : closedDefaultMatched
          ? "pass"
          : "fail";
    return {
      id: expectation.id,
      path: expectation.path,
      url,
      expectedGateMode,
      attempted: true,
      status: response.status,
      contentTypeMatched: contentType.includes("text/html"),
      closedDefaultMatched,
      markerResults,
      anyOfMarkerResults,
      anyOfMarkerMatched,
      inlineImageCount,
      safeErrorCode: null,
      result,
    };
  } catch (error) {
    return {
      id: expectation.id,
      path: expectation.path,
      url,
      expectedGateMode,
      attempted: true,
      status: null,
      contentTypeMatched: false,
      closedDefaultMatched: false,
      markerResults: Object.fromEntries(
        expectation.expectedMarkers.map((marker) => [marker, false]),
      ),
      anyOfMarkerResults: Object.fromEntries(
        (expectation.anyOfMarkers ?? []).map((marker) => [marker, false]),
      ),
      anyOfMarkerMatched: !expectation.anyOfMarkers?.length,
      inlineImageCount: 0,
      safeErrorCode: safeErrorCode(error),
      result: "fail",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runProofReviewPublicProof(
  origin = process.env.USF_PROOF_REVIEW_ORIGIN ?? DEFAULT_ORIGIN,
): Promise<ProofReviewPublicProofResult> {
  const normalizedOrigin = normalizeOrigin(origin);
  const expectedGateMode = expectedGateModeFromEnv();
  const authorizationHeader =
    expectedGateMode === "open-review" ? openReviewAuthorizationHeader() : undefined;
  const routeEvidence = await Promise.all(
    ROUTES.map((route) =>
      fetchRoute(normalizedOrigin, route, expectedGateMode, authorizationHeader),
    ),
  );
  const routeFailureReasons = routeEvidence
    .filter((route) => route.result === "fail")
    .map((route) => {
      const missingMarkers = Object.entries(route.markerResults)
        .filter(([, observed]) => !observed)
        .map(([marker]) => marker)
        .join(",");
      const leakedMarkers = Object.entries(route.markerResults)
        .filter(([, observed]) => observed)
        .map(([marker]) => marker)
        .join(",");
      const missingAnyOf = route.anyOfMarkerMatched
        ? ""
        : Object.keys(route.anyOfMarkerResults).join("|");
      if (expectedGateMode === "closed-default") {
        return `${route.path}:status=${route.status ?? route.safeErrorCode}:closedDefault=${route.closedDefaultMatched}:contentType=${route.contentTypeMatched}:inlineImages=${route.inlineImageCount}:leakedMarkers=${leakedMarkers}`;
      }
      return `${route.path}:status=${route.status ?? route.safeErrorCode}:contentType=${route.contentTypeMatched}:inlineImages=${route.inlineImageCount}:missingMarkers=${missingMarkers}:missingAnyOf=${missingAnyOf}`;
    });
  const openReviewCredentialConfigured =
    expectedGateMode !== "open-review" || authorizationHeader !== undefined;
  const failureReasons = [
    ...(openReviewCredentialConfigured
      ? []
      : [
          "open-review mode requires USF_PROOF_REVIEW_BASIC_USER and USF_PROOF_REVIEW_BASIC_PASSWORD; credentials are intentionally not accepted in the URL",
        ]),
    ...routeFailureReasons,
  ];
  const status = failureReasons.length === 0 ? "pass" : "fail";

  return {
    status,
    proof: "proof-review-public-human-acknowledgement-proof",
    origin: normalizedOrigin,
    issueId: "USF-290",
    expectedGateMode,
    validatesPublicHttpsAvailability: true,
    validatesHumanAcknowledgementSurface: status === "pass" && expectedGateMode === "open-review",
    validatesClosedOperatorGate: status === "pass" && expectedGateMode === "closed-default",
    openReviewCredentialConfigured,
    stagingReadinessClaim: false,
    productionReadinessClaim: false,
    deploymentReadinessClaim: false,
    liveProviderReadinessClaim: false,
    socReadinessClaim: false,
    isoCertificationClaim: false,
    enterpriseProductionReadinessClaim: false,
    productUiReadinessClaim: false,
    browserE2eReadinessClaim: false,
    fullProductReadinessClaim: false,
    routeEvidence,
    failureReasons,
    checks:
      expectedGateMode === "open-review"
        ? [
            "live public proof landing route returns HTTP 200 HTML to an authenticated operator",
            "live public proof review route exposes either no-pending baseline status or a current review item to an authenticated operator",
            "live public proof review item route exposes one-item human review controls to an authenticated operator",
            "live public proof review item route renders inline screenshot evidence",
            "live public screenshot gallery renders inline image evidence",
            "live public final report route exposes printable external-review report sections",
            "live public signoff route keeps final signoff separate and non-automatic",
            "502, unavailable upstream, missing controls, hidden screenshots, missing credentials, or unauthorised access fail this proof",
          ]
        : [
            "live public HTTPS edge is reachable for every proof review route",
            "closed default /proof gate returns HTTP 503 for every proof review route",
            "closed default /proof gate does not leak review controls or inline screenshot evidence",
            "closed default /proof gate preserves the ADR 0015 operator-authenticated boundary",
            "connection refusal, 502, unauthenticated 200 HTML, leaked controls, or hidden open state fail this proof",
          ],
    nonClaims: NON_CLAIMS,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProofReviewPublicProof(process.argv[2])
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.status !== "pass") {
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "unknown proof review public proof failure";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
