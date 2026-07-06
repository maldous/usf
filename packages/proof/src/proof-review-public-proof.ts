type ProofReviewRouteId = "landing" | "review" | "screenshots" | "final-report" | "signoff";

interface RouteExpectation {
  readonly id: ProofReviewRouteId;
  readonly path: string;
  readonly expectedMarkers: readonly string[];
  readonly minimumInlineImages?: number;
}

interface RouteEvidence {
  readonly id: ProofReviewRouteId;
  readonly path: string;
  readonly url: string;
  readonly attempted: boolean;
  readonly status: number | null;
  readonly contentTypeMatched: boolean;
  readonly markerResults: Record<string, boolean>;
  readonly inlineImageCount: number;
  readonly safeErrorCode: string | null;
  readonly result: "pass" | "fail";
}

interface ProofReviewPublicProofResult {
  readonly status: "pass" | "fail";
  readonly proof: "proof-review-public-human-acknowledgement-proof";
  readonly origin: string;
  readonly issueId: "USF-290";
  readonly validatesHumanAcknowledgementSurface: true;
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

const ROUTES = Object.freeze<RouteExpectation[]>([
  {
    id: "landing",
    path: "/proof",
    expectedMarkers: [
      "USF Proof Review",
      "Start review",
      "Open printable report",
      "0 warnings",
      "0 unresolved gaps",
      "Final signoff",
    ],
  },
  {
    id: "review",
    path: "/proof/review",
    expectedMarkers: [
      "Evidence summary",
      "Machine QA conclusion",
      "Risk and assurance posture",
      "Accept",
      "Reject",
      "Request retest",
      "Add note",
      "Next",
      "Previous",
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
  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
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

async function fetchRoute(origin: string, expectation: RouteExpectation): Promise<RouteEvidence> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const url = `${origin}${expectation.path}`;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    const markerResults = Object.fromEntries(
      expectation.expectedMarkers.map((marker) => [marker, body.includes(marker)]),
    );
    const inlineImageCount = (body.match(/<img\b/gi) ?? []).length;
    const result =
      response.status === 200 &&
      contentType.includes("text/html") &&
      Object.values(markerResults).every(Boolean) &&
      inlineImageCount >= (expectation.minimumInlineImages ?? 0)
        ? "pass"
        : "fail";
    return {
      id: expectation.id,
      path: expectation.path,
      url,
      attempted: true,
      status: response.status,
      contentTypeMatched: contentType.includes("text/html"),
      markerResults,
      inlineImageCount,
      safeErrorCode: null,
      result,
    };
  } catch (error) {
    return {
      id: expectation.id,
      path: expectation.path,
      url,
      attempted: true,
      status: null,
      contentTypeMatched: false,
      markerResults: Object.fromEntries(
        expectation.expectedMarkers.map((marker) => [marker, false]),
      ),
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
  const routeEvidence = await Promise.all(
    ROUTES.map((route) => fetchRoute(normalizedOrigin, route)),
  );
  const failureReasons = routeEvidence
    .filter((route) => route.result === "fail")
    .map((route) => {
      const missingMarkers = Object.entries(route.markerResults)
        .filter(([, observed]) => !observed)
        .map(([marker]) => marker)
        .join(",");
      return `${route.path}:status=${route.status ?? route.safeErrorCode}:contentType=${route.contentTypeMatched}:inlineImages=${route.inlineImageCount}:missingMarkers=${missingMarkers}`;
    });

  return {
    status: failureReasons.length === 0 ? "pass" : "fail",
    proof: "proof-review-public-human-acknowledgement-proof",
    origin: normalizedOrigin,
    issueId: "USF-290",
    validatesHumanAcknowledgementSurface: true,
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
    checks: [
      "live public proof landing route returns HTTP 200 HTML",
      "live public proof review route exposes one-item human review controls",
      "live public proof review route renders inline screenshot evidence",
      "live public screenshot gallery renders inline image evidence",
      "live public final report route exposes printable external-review report sections",
      "live public signoff route keeps final signoff separate and non-automatic",
      "502, unavailable upstream, missing controls, or hidden screenshots fail this proof",
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
