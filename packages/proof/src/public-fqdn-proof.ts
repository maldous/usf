import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { resolve } from "node:path";
import tls from "node:tls";

type ProofScope = "all" | "staging" | "production";

interface ContractHost {
  readonly id: string;
  readonly fqdn: string;
  readonly proofCommandId: string;
}

interface ContractEnvironment {
  readonly environment: "staging" | "production";
  readonly domain: string;
  readonly requiredHostnames: readonly ContractHost[];
}

interface PublicFqdnContract {
  readonly environments: readonly ContractEnvironment[];
  readonly publicJsonProofEndpoint: {
    readonly route: string;
    readonly expectedMarker: string;
    readonly expectedContentType: string;
  };
}

interface DnsEvidence {
  readonly publicResolutionChecked: boolean;
  readonly nxdomainObserved: boolean;
  readonly privateOnlyResolutionObserved: boolean;
  readonly addressFamilies: readonly number[];
  readonly addressCount: number;
  readonly addressHashes: readonly string[];
}

interface TlsEvidence {
  readonly httpsAttempted: boolean;
  readonly validCertificateObserved: boolean;
  readonly certificateHostCoverageObserved: boolean;
  readonly issuerHash: string | null;
  readonly subjectHash: string | null;
  readonly sanCount: number;
  readonly errorCode: string | null;
}

interface RouteAttemptEvidence {
  readonly route: string;
  readonly attempted: boolean;
  readonly status: number | null;
  readonly redirected: boolean;
  readonly canonicalHostMatched: boolean;
  readonly contentTypeMatched: boolean;
  readonly expectedMarkerObserved: boolean;
  readonly cloudflareEdgeObserved: boolean;
  readonly safeErrorCode: string | null;
}

interface HostProofEvidence {
  readonly environment: "staging" | "production";
  readonly fqdn: string;
  readonly proofCommandId: string;
  readonly dns: DnsEvidence;
  readonly tls: TlsEvidence;
  readonly routeAttempts: readonly RouteAttemptEvidence[];
  readonly proofEndpointContentDelivered: boolean;
  readonly privateLocalEndpointDependencyObserved: boolean;
  readonly caddyRequiredGatewayClaimObserved: boolean;
  readonly status: "pass" | "fail";
}

interface PublicFqdnProofResult {
  readonly status: "pass" | "fail";
  readonly proof: "public-fqdn-external-dns-tls-https-proof";
  readonly issueId: "USF-263";
  readonly parentIssueId: "USF-261";
  readonly semanticContract: "docs/architecture/public-fqdn-semantic-contract.json";
  readonly scope: ProofScope;
  readonly noCloudflareApiSecretRequired: true;
  readonly gatewayNeutral: true;
  readonly caddyRequiredGatewayClaim: false;
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
  readonly hostEvidence: readonly HostProofEvidence[];
  readonly failureReasons: readonly string[];
  readonly checks: readonly string[];
  readonly nonClaims: readonly string[];
}

const CONTRACT_PATH = "docs/architecture/public-fqdn-semantic-contract.json";
const FETCH_TIMEOUT_MS = 15_000;
const TLS_TIMEOUT_MS = 10_000;

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
  "no-full-product-readiness",
  "no-v2-proof-tag-authorization",
] as const);

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { readonly code?: unknown }).code ?? "unknown");
    return code.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  }
  if (error instanceof Error && error.name) {
    return error.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  }
  return "unknown-error";
}

function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a = 0, b = 0] = address.split(".").map((part) => Number.parseInt(part, 10));
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    return (
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80:")
    );
  }
  return true;
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

async function proveDns(fqdn: string): Promise<DnsEvidence> {
  try {
    const answers = await lookup(fqdn, { all: true, verbatim: false });
    const privateOnlyResolutionObserved =
      answers.length > 0 && answers.every((answer) => isPrivateAddress(answer.address));
    return {
      publicResolutionChecked: answers.length > 0 && !privateOnlyResolutionObserved,
      nxdomainObserved: false,
      privateOnlyResolutionObserved,
      addressFamilies: Array.from(new Set(answers.map((answer) => answer.family))).sort(),
      addressCount: answers.length,
      addressHashes: answers.map((answer) => hash(answer.address)),
    };
  } catch (error) {
    return {
      publicResolutionChecked: false,
      nxdomainObserved: safeErrorCode(error) === "ENOTFOUND",
      privateOnlyResolutionObserved: false,
      addressFamilies: [],
      addressCount: 0,
      addressHashes: [],
    };
  }
}

async function proveTls(fqdn: string): Promise<TlsEvidence> {
  return new Promise<TlsEvidence>((resolveEvidence) => {
    const socket = tls.connect({
      host: fqdn,
      port: 443,
      servername: fqdn,
      rejectUnauthorized: true,
      timeout: TLS_TIMEOUT_MS,
    });

    const finish = (evidence: TlsEvidence): void => {
      socket.destroy();
      resolveEvidence(evidence);
    };

    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      const san = typeof certificate.subjectaltname === "string" ? certificate.subjectaltname : "";
      finish({
        httpsAttempted: true,
        validCertificateObserved: socket.authorized,
        certificateHostCoverageObserved:
          san.includes(`DNS:${fqdn}`) || san.includes(`DNS:*.${fqdn}`),
        issuerHash: certificate.issuer ? hash(JSON.stringify(certificate.issuer)) : null,
        subjectHash: certificate.subject ? hash(JSON.stringify(certificate.subject)) : null,
        sanCount: san ? san.split(",").length : 0,
        errorCode: socket.authorized
          ? null
          : socket.authorizationError
            ? String(socket.authorizationError)
            : "tls-not-authorized",
      });
    });
    socket.once("timeout", () => {
      finish({
        httpsAttempted: true,
        validCertificateObserved: false,
        certificateHostCoverageObserved: false,
        issuerHash: null,
        subjectHash: null,
        sanCount: 0,
        errorCode: "tls-timeout",
      });
    });
    socket.once("error", (error: unknown) => {
      finish({
        httpsAttempted: true,
        validCertificateObserved: false,
        certificateHostCoverageObserved: false,
        issuerHash: null,
        subjectHash: null,
        sanCount: 0,
        errorCode: safeErrorCode(error),
      });
    });
  });
}

async function proveRoute(
  fqdn: string,
  route: string,
  expectedMarker: string,
  expectedContentType: string,
): Promise<RouteAttemptEvidence> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`https://${fqdn}${route}`, {
      redirect: "manual",
      signal: controller.signal,
    });
    const location = response.headers.get("location");
    const redirected = response.status >= 300 && response.status < 400;
    const canonicalHostMatched =
      !redirected || !location || new URL(location, `https://${fqdn}`).hostname === fqdn;
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    return {
      route,
      attempted: true,
      status: response.status,
      redirected,
      canonicalHostMatched,
      contentTypeMatched: contentType.includes(expectedContentType),
      expectedMarkerObserved: body.includes(expectedMarker),
      cloudflareEdgeObserved: (response.headers.get("server") ?? "")
        .toLowerCase()
        .includes("cloudflare"),
      safeErrorCode: null,
    };
  } catch (error) {
    return {
      route,
      attempted: true,
      status: null,
      redirected: false,
      canonicalHostMatched: false,
      contentTypeMatched: false,
      expectedMarkerObserved: false,
      cloudflareEdgeObserved: false,
      safeErrorCode: safeErrorCode(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function proveHost(
  environment: ContractEnvironment,
  host: ContractHost,
  contract: PublicFqdnContract,
): Promise<HostProofEvidence> {
  const dns = await proveDns(host.fqdn);
  const tlsEvidence = await proveTls(host.fqdn);
  const routeAttempts = [
    await proveRoute(
      host.fqdn,
      contract.publicJsonProofEndpoint.route,
      contract.publicJsonProofEndpoint.expectedMarker,
      contract.publicJsonProofEndpoint.expectedContentType,
    ),
  ];
  const proofEndpointContentDelivered = routeAttempts.some(
    (attempt) =>
      attempt.status === 200 &&
      attempt.canonicalHostMatched &&
      attempt.contentTypeMatched &&
      attempt.expectedMarkerObserved,
  );
  const status =
    dns.publicResolutionChecked &&
    !dns.nxdomainObserved &&
    !dns.privateOnlyResolutionObserved &&
    tlsEvidence.httpsAttempted &&
    tlsEvidence.validCertificateObserved &&
    tlsEvidence.certificateHostCoverageObserved &&
    proofEndpointContentDelivered
      ? "pass"
      : "fail";
  return {
    environment: environment.environment,
    fqdn: host.fqdn,
    proofCommandId: host.proofCommandId,
    dns,
    tls: tlsEvidence,
    routeAttempts,
    proofEndpointContentDelivered,
    privateLocalEndpointDependencyObserved: false,
    caddyRequiredGatewayClaimObserved: false,
    status,
  };
}

export async function runPublicFqdnProof(
  scope: ProofScope = "all",
): Promise<PublicFqdnProofResult> {
  const contract = await loadContract();
  const environments = selectedEnvironments(contract, scope);
  const hostEvidence: HostProofEvidence[] = [];
  for (const environment of environments) {
    for (const host of environment.requiredHostnames) {
      hostEvidence.push(await proveHost(environment, host, contract));
    }
  }

  const failureReasons = hostEvidence
    .filter((row) => row.status === "fail")
    .map((row) => {
      const statuses = row.routeAttempts
        .map((attempt) => `${attempt.route}:${attempt.status ?? attempt.safeErrorCode}`)
        .join(",");
      return `${row.environment}:${row.fqdn}:dns=${row.dns.publicResolutionChecked}:tls=${row.tls.validCertificateObserved}:route=${row.proofEndpointContentDelivered}:${statuses}`;
    });

  const status = failureReasons.length === 0 ? "pass" : "fail";
  return {
    status,
    proof: "public-fqdn-external-dns-tls-https-proof",
    issueId: "USF-263",
    parentIssueId: "USF-261",
    semanticContract: CONTRACT_PATH,
    scope,
    noCloudflareApiSecretRequired: true,
    gatewayNeutral: true,
    caddyRequiredGatewayClaim: false,
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
    hostEvidence,
    failureReasons,
    checks: [
      "public DNS lookup executed for each selected required FQDN",
      "TLS handshake executed with host validation for each selected required FQDN",
      "HTTPS proof routes attempted without Cloudflare API secrets",
      "proof evidence records status redirect canonical host content-type marker and Cloudflare edge observation",
      "proof remains gateway neutral and does not require Caddy",
      "no staging production deployment live-provider SOC ISO enterprise production product UI browser E2E full product readiness or v2-proof tag authorization claim emitted",
    ],
    nonClaims: NON_CLAIMS,
  };
}

function parseScope(argv: readonly string[]): ProofScope {
  const raw = argv[2] ?? "all";
  if (raw === "all" || raw === "staging" || raw === "production") {
    return raw;
  }
  throw new Error(`Unsupported public FQDN proof scope: ${raw}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPublicFqdnProof(parseScope(process.argv))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.status !== "pass") {
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "unknown public FQDN proof failure";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
