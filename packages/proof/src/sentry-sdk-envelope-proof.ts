// Sentry accepted SDK envelope proof for USF-205.
//
// The service catalogue does not generate a local Sentry service. This proof
// exercises the official Sentry Node SDK through an adapter-bound local
// transport and keeps Sentry service readiness, live monitoring, console access,
// alert handoff, and incident workflows explicitly deferred.
import {
  SentrySdkEnvelopeProofAdapter,
  type SentrySdkEnvelopeEvidence,
} from "@foundation/adapter-obs";

interface SentryAcceptedProofResult {
  readonly status: "pass";
  readonly proof: "sentry-accepted-sdk-envelope-proof";
  readonly issueId: "USF-205";
  readonly predecessorIssue: "USF-196";
  readonly parentIssue: "USF-133";
  readonly runtimeMode: "local-proof";
  readonly providerMode: "local-test";
  readonly serviceCatalogueServiceId: "sentry";
  readonly providerRegistryId: "observability-sentry-sdk-envelope-local";
  readonly proofCommand: "corepack pnpm proof:observability:sentry";
  readonly sdkPackage: "@sentry/node";
  readonly sdkVersion: "10.62.0";
  readonly evidence: SentrySdkEnvelopeEvidence;
  readonly unavailableProviderResult: "sentry-sdk-envelope-fail-closed";
  readonly checks: readonly string[];
  readonly deferredBoundaries: readonly string[];
  readonly nonClaims: readonly string[];
}

const FORBIDDEN_SAFE_OUTPUT_RE =
  /https?:\/\/|example\.invalid|Bearer synthetic-token-value|tenant-sentry-proof|actor-sentry-proof|raw_endpoint|provider_payload|raw sentry payload|syntheticFunction|stack trace|connection_string/i;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSafeOutput(result: SentryAcceptedProofResult): void {
  const text = JSON.stringify(result);
  assert(!FORBIDDEN_SAFE_OUTPUT_RE.test(text), "Sentry proof safe output leaked unsafe value");
}

export async function runSentryAcceptedProof(): Promise<SentryAcceptedProofResult> {
  const adapter = new SentrySdkEnvelopeProofAdapter();
  const evidence = await adapter.prove({
    tenantId: "tenant-sentry-proof",
    actorId: "actor-sentry-proof",
    correlationId: "corr-sentry-proof",
    traceId: "0123456789abcdef0123456789abcdef",
  });
  const unavailableProviderResult = await adapter.proveFailClosed();

  assert(evidence.eventCaptureChecked, "Sentry SDK event capture evidence missing");
  assert(evidence.sdkTransportChecked, "Sentry SDK transport evidence missing");
  assert(evidence.redactionChecked, "Sentry redaction evidence missing");
  assert(evidence.tenantSafeLabelChecked, "Sentry tenant-safe label evidence missing");
  assert(
    evidence.serviceReadinessStatus === "deferred-no-generated-compose-target",
    "Sentry service readiness boundary missing",
  );
  assert(
    evidence.eventIngestionStatus === "sdk-envelope-captured-local-transport-not-service-ingestion",
    "Sentry service ingestion non-equivalence missing",
  );
  assert(
    unavailableProviderResult === "sentry-sdk-envelope-fail-closed",
    "Sentry unavailable path did not fail closed",
  );
  assert(
    evidence.nonClaims.includes("sentry-readiness-not-claimed"),
    "Sentry readiness non-claim missing",
  );
  assert(
    evidence.nonClaims.includes("usf-133-closure-not-claimed"),
    "USF-133 closure non-claim missing",
  );

  const result: SentryAcceptedProofResult = Object.freeze({
    status: "pass",
    proof: "sentry-accepted-sdk-envelope-proof",
    issueId: "USF-205",
    predecessorIssue: "USF-196",
    parentIssue: "USF-133",
    runtimeMode: "local-proof",
    providerMode: "local-test",
    serviceCatalogueServiceId: "sentry",
    providerRegistryId: "observability-sentry-sdk-envelope-local",
    proofCommand: "corepack pnpm proof:observability:sentry",
    sdkPackage: "@sentry/node",
    sdkVersion: "10.62.0",
    evidence,
    unavailableProviderResult,
    checks: [
      "official Sentry Node SDK imported only by adapter boundary",
      "SDK captureEvent path produced an in-memory transport envelope",
      "raw tenant, actor, endpoint, token, stack, and provider payload markers were redacted",
      "tenant label was represented by opaque hash only",
      "synthetic proof data stayed value-free and production-data-free",
      "Sentry service readiness and service ingestion remain explicitly deferred",
      "unavailable transport path failed closed",
    ],
    deferredBoundaries: [
      "Sentry service readiness because service catalogue has no generated local Sentry target",
      "Sentry service ingestion and issue lifecycle",
      "Sentry operator browser console access, review cadence, and deprovisioning",
      "alert handoff and incident workflow operating evidence",
      "live monitoring and supplier/provider-managed evidence",
      "USF-193 environment promotion semantics",
    ],
    nonClaims: evidence.nonClaims,
  });
  assertSafeOutput(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSentryAcceptedProof()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : "sentry-proof-failed"}\n`);
      process.exitCode = 1;
    });
}
