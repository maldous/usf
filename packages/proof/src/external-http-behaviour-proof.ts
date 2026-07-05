import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONTRACT_PATH = "docs/architecture/external-http-behaviour-contract.json";

interface ExternalHttpBehaviourContract {
  readonly status: string;
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly canonicalHostSemantics?: {
    readonly requiredFqdns?: readonly string[];
  };
  readonly httpsSemantics?: {
    readonly httpsRequiredForProofRoutes?: boolean;
  };
  readonly gatewayNeutrality?: {
    readonly requiredGateway?: string;
    readonly requiredProvider?: string;
  };
  readonly claims?: Record<string, boolean>;
  readonly nonClaims?: readonly string[];
}

const REQUIRED_FQDNS = ["1e100.network", "aldous.info"] as const;
const REQUIRED_NON_CLAIMS = [
  "staging-readiness",
  "production-readiness",
  "deployment-readiness",
  "live-provider-readiness",
  "soc-readiness",
  "iso27001-certification",
  "enterprise-production-readiness",
  "product-ui-readiness",
  "browser-e2e-readiness",
  "full-product-readiness",
  "caddy-required-gateway",
  "v2-proof-tag-authorization",
] as const;

async function main(): Promise<number> {
  const contract = JSON.parse(
    await readFile(resolve(CONTRACT_PATH), "utf8"),
  ) as ExternalHttpBehaviourContract;
  const failures: string[] = [];

  if (
    contract.status !== "defined" ||
    contract.issueId !== "USF-268" ||
    contract.parentIssueId !== "USF-267"
  ) {
    failures.push("external-http-behaviour-contract-linkage-invalid");
  }
  const fqdns = contract.canonicalHostSemantics?.requiredFqdns ?? [];
  for (const fqdn of REQUIRED_FQDNS) {
    if (!fqdns.includes(fqdn)) {
      failures.push(`missing-required-fqdn-${fqdn}`);
    }
  }
  if (contract.httpsSemantics?.httpsRequiredForProofRoutes !== true) {
    failures.push("https-proof-route-semantics-missing");
  }
  if (
    contract.gatewayNeutrality?.requiredGateway !== "none" ||
    contract.gatewayNeutrality?.requiredProvider !== "none"
  ) {
    failures.push("gateway-or-provider-required");
  }
  for (const [claim, value] of Object.entries(contract.claims ?? {})) {
    if (value !== false) {
      failures.push(`readiness-claim-overstated-${claim}`);
    }
  }
  const nonClaims = new Set(contract.nonClaims ?? []);
  for (const claim of REQUIRED_NON_CLAIMS) {
    if (!nonClaims.has(claim)) {
      failures.push(`missing-non-claim-${claim}`);
    }
  }

  const status = failures.length === 0 ? "pass" : "fail";
  console.log(
    JSON.stringify(
      {
        status,
        proof: "external-http-behaviour-contract-proof",
        issueId: "USF-268",
        parentIssueId: "USF-267",
        contract: CONTRACT_PATH,
        networkProofPerformed: false,
        gatewayNeutral: true,
        failures,
        nonClaims: REQUIRED_NON_CLAIMS,
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
  () => {
    console.error(
      JSON.stringify({ status: "fail", safeCode: "external-http-behaviour-proof-failed" }),
    );
    process.exitCode = 1;
  },
);
