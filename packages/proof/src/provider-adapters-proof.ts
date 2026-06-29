// Provider adapters/modes proof (parity-provider-adapters-modes, USF-133).
//
// Hermetic proof for provider trust-boundary posture: explicit provider modes,
// owner/category registry, SecretReference-only credentials, redacted status views,
// health/readiness separation, fail-closed disabled/deferred/unavailable providers,
// value-free provider audit metadata, and capability/provider import boundaries.
// This is local/dev/test control evidence only. It is not live-provider,
// production, supplier approval, ISO, SOC, or regulatory-certification evidence.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROVIDER_CATEGORIES,
  PROVIDER_MODES,
  PROVIDER_REGISTRY,
  assertProviderUsable,
  createAuditEventDraft,
  providerStatusViews,
  validateProviderRegistry,
  type ProviderAdapterMode,
  type ProviderRegistryEntry,
} from "@foundation/core";

interface ProviderAdaptersProofResult {
  readonly status: "pass";
  readonly proof: "provider-adapters-modes";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly liveProviderReadinessClaim: false;
  readonly liveExternalProviderReadinessClaim: false;
  readonly productionLiveClaim: false;
  readonly supplierApprovalClaim: false;
  readonly iso27001CertificationClaim: false;
  readonly socCertificationClaim: false;
  readonly providerCount: number;
  readonly categoryCount: number;
  readonly modes: readonly ProviderAdapterMode[];
  readonly checks: readonly string[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function repoRoot(): string {
  let current = process.cwd();
  while (current !== "/") {
    try {
      if (
        statSync(join(current, "package.json")).isFile() &&
        statSync(join(current, "docs")).isDirectory()
      ) {
        return current;
      }
    } catch {
      // keep walking
    }
    current = dirname(current);
  }
  return process.cwd();
}

function filesUnder(path: string): readonly string[] {
  const out: string[] = [];
  try {
    for (const name of readdirSync(path)) {
      const full = join(path, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        out.push(...filesUnder(full));
      } else if (name.endsWith(".ts")) {
        out.push(full);
      }
    }
  } catch {
    return Object.freeze(out);
  }
  return Object.freeze(out);
}

function assertNoUnauthorisedProviderSdkImports(root: string): void {
  const scanned = [
    join(root, "packages/core/src/index.ts"),
    join(root, "packages/ports/src/index.ts"),
    join(root, "apps/api/src/runtime.ts"),
    join(root, "apps/api/src/server.ts"),
    join(root, "apps/work/src/worker.ts"),
    ...filesUnder(join(root, "capabilities")),
  ];
  const forbiddenImport =
    /from\s+["'](?:pg|postgres|redis|ioredis|@aws-sdk|aws-sdk|minio|mailpit-api|nodemailer|twilio|@sendgrid|sendgrid|stripe|@temporalio|nats|keycloak-js)["']/;
  for (const path of scanned) {
    const text = readFileSync(path, "utf8");
    assert(!forbiddenImport.test(text), `unauthorised provider SDK import in ${path}`);
  }
}

function assertStatusViewsAreSafe(): void {
  const text = JSON.stringify(providerStatusViews()).toLowerCase();
  for (const forbidden of [
    "secret://",
    "bearer ",
    "private_key",
    "connection_string",
    "endpoint://compose/postgres",
    "endpoint://compose/keycloak",
    "http://",
    "https://",
    "stack trace",
  ]) {
    assert(!text.includes(forbidden), `provider status leaked ${forbidden}`);
  }
}

function mutatedProvider(
  provider: ProviderRegistryEntry,
  patch: Partial<ProviderRegistryEntry>,
): ProviderRegistryEntry {
  return Object.freeze({ ...provider, ...patch }) as ProviderRegistryEntry;
}

export async function runProviderAdaptersProof(): Promise<ProviderAdaptersProofResult> {
  const checks: string[] = [];
  const root = repoRoot();
  const validation = validateProviderRegistry();
  assert(
    validation.ok,
    `provider registry failed validation: ${JSON.stringify(validation.findings)}`,
  );
  checks.push(
    "provider registry validates explicit category, mode, owner, config, and SecretReference posture",
  );

  const categories = new Set(PROVIDER_REGISTRY.map((provider) => provider.providerCategory));
  for (const category of PROVIDER_CATEGORIES) {
    assert(categories.has(category), `provider category not represented: ${category}`);
  }
  checks.push("all required provider categories are represented truthfully");

  const modes = new Set(PROVIDER_REGISTRY.map((provider) => provider.providerMode));
  for (const mode of [
    "in-memory",
    "local-test",
    "mock",
    "composed-test",
    "live-external-deferred",
    "disabled",
    "unavailable",
  ] as const) {
    assert(modes.has(mode), `provider mode not represented: ${mode}`);
  }
  assert(
    !modes.has("live-external-authorised"),
    "live-external-authorised provider present without authority",
  );
  checks.push(
    "provider mode hard boundary covers local/test/deferred/disabled/unavailable without live-authorised entries",
  );

  assertStatusViewsAreSafe();
  checks.push(
    "provider status safe view redacts credentials, endpoints, raw failures, and stack traces",
  );

  assertNoUnauthorisedProviderSdkImports(root);
  const mailAdapter = readFileSync(join(root, "adapters/mail/src/index.ts"), "utf8");
  assert(
    /from\s+["']mailpit-api["']/.test(mailAdapter),
    "Mailpit SDK import missing from mail adapter boundary",
  );
  const dbAdapter = readFileSync(join(root, "adapters/db/src/index.ts"), "utf8");
  assert(/from\s+["']pg["']/.test(dbAdapter), "pg SDK import missing from db adapter boundary");
  const mailpitProvider = PROVIDER_REGISTRY.find(
    (provider) => provider.providerId === "notification-delivery-mailpit-composed-test",
  );
  assert(mailpitProvider, "Mailpit composed provider registry entry missing");
  assert(
    mailpitProvider.adapterName === "MailpitNotificationProvider" &&
      mailpitProvider.providerMode === "composed-test" &&
      mailpitProvider.readinessStatus === "healthy" &&
      mailpitProvider.endpointRef === "endpoint://compose/mailpit",
    "Mailpit composed provider registry entry is not SDK-backed and catalogue-linked",
  );
  const postgresProvider = PROVIDER_REGISTRY.find(
    (provider) => provider.providerId === "database-postgres-composed-test",
  );
  assert(postgresProvider, "Postgres composed provider registry entry missing");
  assert(
    postgresProvider.adapterName === "PostgresTenantMembershipRepository" &&
      postgresProvider.providerMode === "composed-test" &&
      postgresProvider.readinessStatus === "healthy" &&
      postgresProvider.endpointRef === "endpoint://compose/postgres",
    "Postgres composed provider registry entry is not SDK-backed and catalogue-linked",
  );
  checks.push("provider SDK imports remain inside adapter package boundaries");

  const deferred = PROVIDER_REGISTRY.find(
    (provider) => provider.providerMode === "live-external-deferred",
  );
  const disabled = PROVIDER_REGISTRY.find((provider) => provider.providerMode === "disabled");
  const unavailable = PROVIDER_REGISTRY.find((provider) => provider.providerMode === "unavailable");
  assert(
    deferred && disabled && unavailable,
    "deferred/disabled/unavailable provider entries missing",
  );
  for (const provider of [deferred, disabled, unavailable]) {
    let denied = false;
    try {
      assertProviderUsable(provider, "provider adapters proof");
    } catch {
      denied = true;
    }
    assert(denied, `${provider.providerId} did not fail closed`);
  }
  checks.push("disabled, unavailable, and live-external-deferred providers fail closed for use");

  const liveCandidate = mutatedProvider(PROVIDER_REGISTRY[0]!, {
    providerMode: "live-external-authorised",
    lifecycleState: "proposed",
    explicitAuthorityRef: null,
    liveReadinessClaim: true,
  });
  assert(
    !validateProviderRegistry([liveCandidate]).ok,
    "live-external-authorised provider without authority validated",
  );
  const badMode = mutatedProvider(PROVIDER_REGISTRY[0]!, {
    providerMode: "unknown-provider-mode" as ProviderAdapterMode,
  });
  assert(!validateProviderRegistry([badMode]).ok, "unknown provider mode validated");
  checks.push("unknown provider modes and unauthorised live providers fail validation");

  const audit = createAuditEventDraft({
    eventId: "provider-proof-audit",
    eventType: "provider.call.failed",
    tenantId: "tenant-alpha",
    actorId: "service-provider-proof",
    action: "provider.call.failed",
    outcome: "failed",
    resourceType: "provider",
    resourceId: "notification-delivery-in-memory",
    reasonCode: "provider-safe-failure",
    safeMessage: "provider call failed safely",
    metadata: {
      credential_ref: "secret://local-dev/provider-proof",
      credential_endpoint: "endpoint://compose/postgres",
      credential_failure: "Bearer proof-token",
      safeReason: "provider-timeout",
    },
  });
  const auditText = JSON.stringify(audit).toLowerCase();
  assert(!auditText.includes("secret://local-dev/provider-proof"), "audit leaked secret reference");
  assert(
    !auditText.includes("endpoint://compose/postgres"),
    "audit leaked provider endpoint reference",
  );
  assert(!auditText.includes("bearer proof-token"), "audit leaked raw provider failure");
  checks.push("provider audit event is value-free and redacted");

  return Object.freeze({
    status: "pass",
    proof: "provider-adapters-modes",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    liveProviderReadinessClaim: false,
    liveExternalProviderReadinessClaim: false,
    productionLiveClaim: false,
    supplierApprovalClaim: false,
    iso27001CertificationClaim: false,
    socCertificationClaim: false,
    providerCount: PROVIDER_REGISTRY.length,
    categoryCount: categories.size,
    modes: Object.freeze([...PROVIDER_MODES]),
    checks: Object.freeze(checks),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runProviderAdaptersProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      const safeMessage = error instanceof Error ? error.message : "provider adapters proof failed";
      console.error(JSON.stringify({ status: "fail", error: safeMessage }, null, 2));
      process.exitCode = 1;
    });
}
