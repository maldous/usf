import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import {
  MEILISEARCH_PROVIDER_REGISTRY_ID,
  MEILISEARCH_RUNTIME_PROVIDER_BINDING_ID,
  MEILISEARCH_SDK_PACKAGE,
  MEILISEARCH_SDK_VERSION,
  MEILISEARCH_SERVICE_CATALOGUE_ID,
  MeilisearchComposedSearchAdapter,
  type MeilisearchComposedSearchEvidence,
} from "@foundation/adapter-search";
import { createTenantContext } from "@foundation/core";

interface MeilisearchComposedProofResult {
  readonly status: "pass";
  readonly proof: "meilisearch-composed-search-provider";
  readonly issueId: "USF-199";
  readonly parentIssueId: "USF-133";
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "runtime-providers";
  readonly proofCommand: "corepack pnpm proof:search:meilisearch";
  readonly serviceCatalogueServiceId: typeof MEILISEARCH_SERVICE_CATALOGUE_ID;
  readonly providerRegistryId: typeof MEILISEARCH_PROVIDER_REGISTRY_ID;
  readonly bindingId: typeof MEILISEARCH_RUNTIME_PROVIDER_BINDING_ID;
  readonly sdkPackage: typeof MEILISEARCH_SDK_PACKAGE;
  readonly sdkVersion: typeof MEILISEARCH_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly sourceUse: "official-meilisearch-javascript-client";
  readonly evidence: MeilisearchComposedSearchEvidence;
  readonly checks: readonly string[];
  readonly prohibitedClaimsObserved: readonly [];
  readonly deferredBoundaries: readonly [
    "api-runtime-search-binding-deferred-until-search-port-contract-authority",
    "worker-runtime-search-binding-deferred-until-search-port-contract-authority",
    "ranking-equivalence-not-claimed",
    "vector-ai-rag-readiness-not-claimed",
    "live-provider-readiness-not-claimed",
  ];
  readonly nonClaims: readonly [
    "no-full-dev-readiness",
    "no-test-readiness",
    "no-staging-readiness",
    "no-production-readiness",
    "no-deployment-readiness",
    "no-live-provider-readiness",
    "no-soc-readiness",
    "no-iso27001-certification",
    "no-enterprise-production-readiness",
    "no-full-product-readiness",
    "no-usf-133-closure",
  ];
}

const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const COMPOSE_PROFILE = "runtime-providers";
const COMPOSE_SERVICE = "meilisearch";
const MEILISEARCH_PORT = 7700;
const PROOF_COMMAND = "corepack pnpm proof:search:meilisearch";
const FORBIDDEN_EVIDENCE_PATTERN = /https?:\/\/|token|password|stack|connection_string/i;
const PROHIBITED_CLAIMS_OBSERVED = [] as const;
const NON_CLAIMS = [
  "no-full-dev-readiness",
  "no-test-readiness",
  "no-staging-readiness",
  "no-production-readiness",
  "no-deployment-readiness",
  "no-live-provider-readiness",
  "no-soc-readiness",
  "no-iso27001-certification",
  "no-enterprise-production-readiness",
  "no-full-product-readiness",
  "no-usf-133-closure",
] as const;

function runProcess(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed code=${code} signal=${signal}: ${stderr}`));
      }
    });
  });
}

async function portIsFree(port: number): Promise<boolean> {
  const server = net.createServer();
  server.unref();
  return new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function composeUp(projectName: string): Promise<void> {
  await runProcess("docker", [
    "compose",
    "-p",
    projectName,
    "-f",
    COMPOSE_TARGET,
    "--profile",
    COMPOSE_PROFILE,
    "up",
    "-d",
    COMPOSE_SERVICE,
  ]);
}

async function composeDown(projectName: string): Promise<void> {
  const child = spawn(
    "docker",
    [
      "compose",
      "-p",
      projectName,
      "-f",
      COMPOSE_TARGET,
      "--profile",
      COMPOSE_PROFILE,
      "down",
      "--remove-orphans",
    ],
    { cwd: process.cwd(), stdio: ["ignore", "ignore", "ignore"] },
  );
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 15000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

export async function runMeilisearchComposedProof(): Promise<MeilisearchComposedProofResult> {
  if (!(await portIsFree(MEILISEARCH_PORT))) {
    throw new Error("meilisearch-proof-port-not-free");
  }

  const projectName = `usf-meilisearch-proof-${process.pid}`;
  const context = createTenantContext({
    tenantId: "tenant-meilisearch-proof",
    actorId: "actor-meilisearch-proof",
    roles: ["admin"],
    providerMode: "local-composed-real-service",
    environment: "integration",
  });

  let evidence: MeilisearchComposedSearchEvidence | undefined;
  try {
    await composeUp(projectName);
    const adapter = new MeilisearchComposedSearchAdapter({
      indexUid: `usf_runtime_proof_${process.pid}`,
    });
    evidence = await adapter.proveRoundTrip(context);
  } finally {
    await composeDown(projectName);
  }

  if (!evidence) {
    throw new Error("meilisearch-proof-missing-evidence");
  }
  for (const [field, value] of Object.entries(evidence)) {
    if (typeof value === "string" && FORBIDDEN_EVIDENCE_PATTERN.test(value)) {
      throw new Error(`meilisearch-proof-unsafe-evidence-field-${field}`);
    }
  }

  return Object.freeze({
    status: "pass",
    proof: "meilisearch-composed-search-provider",
    issueId: "USF-199",
    parentIssueId: "USF-133",
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    proofCommand: PROOF_COMMAND,
    serviceCatalogueServiceId: MEILISEARCH_SERVICE_CATALOGUE_ID,
    providerRegistryId: MEILISEARCH_PROVIDER_REGISTRY_ID,
    bindingId: MEILISEARCH_RUNTIME_PROVIDER_BINDING_ID,
    sdkPackage: MEILISEARCH_SDK_PACKAGE,
    sdkVersion: MEILISEARCH_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    sourceUse: "official-meilisearch-javascript-client",
    evidence,
    checks: [
      "container running observed by Compose startup",
      "service ready through SDK health readiness retry",
      "adapter connected through SDK client",
      "synthetic documents indexed",
      "tenant-filtered query returned only the owning tenant document",
      "async indexing visibility observed after task wait",
      "document update or reindex boundary observed",
      "document deletion observed",
      "temporary index cleanup observed",
      "safe provider error redaction observed",
      "API and worker runtime binding remain explicitly not applicable for this synchronous port boundary",
      "no prohibited readiness or certification claim emitted",
    ],
    prohibitedClaimsObserved: PROHIBITED_CLAIMS_OBSERVED,
    deferredBoundaries: evidence.remainingDeferredBoundaries,
    nonClaims: NON_CLAIMS,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMeilisearchComposedProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "meilisearch proof failed");
      process.exitCode = 1;
    });
}
