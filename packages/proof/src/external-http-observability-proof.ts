import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "docs/architecture/public-fqdn-semantic-contract.json";
const OBSERVABILITY_GATE_PATH = "docs/architecture/external-http-observability-evidence-gate.json";
const FETCH_TIMEOUT_MS = 15_000;

interface PublicContract {
  readonly environments: readonly {
    readonly environment: "staging" | "production";
    readonly requiredHostnames: readonly { readonly fqdn: string }[];
  }[];
  readonly publicJsonProofEndpoint: {
    readonly route: string;
  };
}

function traceparent(correlationId: string): string {
  const traceId = correlationId.replaceAll("-", "").padEnd(32, "0").slice(0, 32);
  return `00-${traceId}-0123456789abcdef-01`;
}

async function main(): Promise<number> {
  const contract = JSON.parse(await readFile(resolve(CONTRACT_PATH), "utf8")) as PublicContract;
  const evidence = JSON.parse(await readFile(resolve(OBSERVABILITY_GATE_PATH), "utf8")) as {
    readonly status?: string;
  };
  const failures: string[] = [];
  const hostEvidence = [];

  for (const environment of contract.environments) {
    for (const host of environment.requiredHostnames) {
      const correlationId = `usf-${randomUUID()}`;
      const response = await fetch(
        `https://${host.fqdn}${contract.publicJsonProofEndpoint.route}`,
        {
          method: "GET",
          headers: {
            "x-usf-correlation-id": correlationId,
            traceparent: traceparent(correlationId),
          },
          redirect: "follow",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      const text = await response.text();
      const markerObserved = text.includes("usf-public-edge");
      if (response.status !== 200 || !markerObserved) {
        failures.push(`${environment.environment}-observability-probe-did-not-reach-proof-route`);
      }
      hostEvidence.push({
        environment: environment.environment,
        fqdn: host.fqdn,
        status: response.status,
        markerObserved,
        correlationHeaderSent: true,
        traceparentHeaderSent: true,
        responseCorrelationEchoObserved: Boolean(response.headers.get("x-usf-correlation-id")),
        providerRequestIdValueRetained: false,
        rawPayloadRetained: false,
      });
    }
  }

  if (evidence.status !== "bounded") {
    failures.push("observability-evidence-boundary-not-explicit");
  }
  const status = failures.length === 0 ? "bounded" : "fail";
  console.log(
    JSON.stringify(
      {
        status,
        proof: "external-http-observability-boundary-proof",
        issueId: "USF-270",
        parentIssueId: "USF-267",
        hostEvidence,
        externalProviderLogsCollected: false,
        boundedReason:
          "Repository access can prove safe correlation and trace header injection to proof routes, but cannot collect external provider access logs without operator/provider access.",
        failures,
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
  return status === "fail" ? 1 : 0;
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
