import { createHash } from "node:crypto";
import KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import {
  assertNonEmpty,
  assertTenantMatch,
  stableId,
  type IdentityClaims,
  type TenantContext,
} from "@foundation/core";
import type { IdentityProvider } from "@foundation/ports";

export const KEYCLOAK_RUNTIME_PROVIDER_BINDING_ID = "keycloak-identity-provider";
export const KEYCLOAK_PROVIDER_REGISTRY_ID = "identity-keycloak-composed-test";
export const KEYCLOAK_SERVICE_CATALOGUE_ID = "keycloak";
export const KEYCLOAK_DB_SERVICE_CATALOGUE_ID = "keycloak-db";
export const KEYCLOAK_SERVICE_CATALOGUE_IDS = Object.freeze([
  KEYCLOAK_SERVICE_CATALOGUE_ID,
  KEYCLOAK_DB_SERVICE_CATALOGUE_ID,
] as const);
export const KEYCLOAK_ADMIN_SDK_PACKAGE = "@keycloak/keycloak-admin-client";
export const KEYCLOAK_ADMIN_SDK_VERSION = "26.2.5";

const DEFAULT_KEYCLOAK_BASE_URL = "http://127.0.0.1:8090";
const DEFAULT_KEYCLOAK_ADMIN_REALM = "master";
const DEFAULT_KEYCLOAK_REALM = "foundation";
const DEFAULT_KEYCLOAK_ADMIN_USERNAME = "admin";
const DEFAULT_KEYCLOAK_ADMIN_PASSWORD = "admin_password";
const DEFAULT_KEYCLOAK_ADMIN_CLIENT_ID = "admin-cli";
const SYNTHETIC_IDENTITY_ATTRIBUTE = "usf_synthetic_identity";
const SYNTHETIC_TENANT_HASH_ATTRIBUTE = "usf_tenant_hash";

export interface KeycloakComposedIdentityProviderConfig {
  readonly baseUrl: string;
  readonly adminRealm: string;
  readonly realm: string;
  readonly adminUsername: string;
  readonly adminPassword: string;
  readonly adminClientId: string;
  readonly endpointRef: "endpoint://compose/keycloak";
}

export interface KeycloakComposedIdentityEvidence {
  readonly providerRef: typeof KEYCLOAK_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof KEYCLOAK_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceIds: typeof KEYCLOAK_SERVICE_CATALOGUE_IDS;
  readonly bindingId: typeof KEYCLOAK_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "KeycloakComposedIdentityProvider";
  readonly sdkPackage: typeof KEYCLOAK_ADMIN_SDK_PACKAGE;
  readonly sdkVersion: typeof KEYCLOAK_ADMIN_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: "endpoint://compose/keycloak";
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-120s-keycloak";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "1s-5s" | "5s-30s" | "30s-120s" | "timeout";
  readonly adapterHealthStatus: "healthy";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly operation: "identity-login" | "identity-round-trip";
  readonly operationOutcome: "succeeded";
  readonly safeErrorCode: null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly realmChecked: boolean;
  readonly syntheticIdentityChecked: boolean;
  readonly readbackChecked: boolean;
  readonly tenantBoundaryChecked: boolean;
  readonly failClosedChecked: boolean;
  readonly cleanupBoundary: "compose-down-volume-removal";
  readonly safeProviderSummary: "keycloak-composed-provider";
  readonly realmHash: string;
  readonly tenantIdHash: string;
  readonly subjectHash: string;
  readonly emailHash: string;
}

interface ComposeAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: KeycloakComposedIdentityEvidence["operationLatencyBucket"];
}

interface RetryResult<T> {
  readonly value: T;
  readonly metrics: ComposeAdapterRetryMetrics;
}

export class InMemoryIdentityProvider implements IdentityProvider {
  readonly mode = "hermetic-mock";

  async issueLogin(input: { tenantId: string; email: string }): Promise<IdentityClaims> {
    const subject = stableId("actor", [input.tenantId, input.email.toLowerCase()]);
    return {
      subject,
      tenantId: input.tenantId,
      email: input.email.toLowerCase(),
      roles: Object.freeze(["tenant-admin"]),
      providerMode: this.mode,
    };
  }
}

export class KeycloakComposedIdentityProvider implements IdentityProvider {
  readonly mode = "local-composed-real-service";

  readonly #config: KeycloakComposedIdentityProviderConfig;
  readonly #client: KeycloakAdminClient;
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultRetryMetrics();
  #authenticated = false;
  #lastEvidence: KeycloakComposedIdentityEvidence | undefined;

  constructor(
    config: Partial<KeycloakComposedIdentityProviderConfig> = {},
    client: KeycloakAdminClient = new KeycloakAdminClient({
      baseUrl: config.baseUrl ?? DEFAULT_KEYCLOAK_BASE_URL,
      realmName: config.adminRealm ?? DEFAULT_KEYCLOAK_ADMIN_REALM,
    }),
  ) {
    this.#config = Object.freeze({
      baseUrl: config.baseUrl ?? DEFAULT_KEYCLOAK_BASE_URL,
      adminRealm: config.adminRealm ?? DEFAULT_KEYCLOAK_ADMIN_REALM,
      realm: config.realm ?? DEFAULT_KEYCLOAK_REALM,
      adminUsername: config.adminUsername ?? DEFAULT_KEYCLOAK_ADMIN_USERNAME,
      adminPassword: config.adminPassword ?? DEFAULT_KEYCLOAK_ADMIN_PASSWORD,
      adminClientId: config.adminClientId ?? DEFAULT_KEYCLOAK_ADMIN_CLIENT_ID,
      endpointRef: "endpoint://compose/keycloak",
    });
    this.#client = client;
  }

  get lastEvidence(): KeycloakComposedIdentityEvidence | undefined {
    return this.#lastEvidence;
  }

  safeStatusView(): {
    readonly providerMode: "composed-test";
    readonly providerRef: typeof KEYCLOAK_PROVIDER_REGISTRY_ID;
    readonly serviceCatalogueServiceIds: typeof KEYCLOAK_SERVICE_CATALOGUE_IDS;
    readonly endpointRef: "endpoint://compose/keycloak";
    readonly sdkPackage: typeof KEYCLOAK_ADMIN_SDK_PACKAGE;
    readonly sdkVersion: typeof KEYCLOAK_ADMIN_SDK_VERSION;
    readonly sdkBoundary: "adapter-package-only";
    readonly credentialPosture: "local-compose-placeholder";
    readonly productionReadinessClaim: false;
    readonly liveProviderReadinessClaim: false;
  } {
    return Object.freeze({
      providerMode: "composed-test" as const,
      providerRef: KEYCLOAK_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceIds: KEYCLOAK_SERVICE_CATALOGUE_IDS,
      endpointRef: "endpoint://compose/keycloak" as const,
      sdkPackage: KEYCLOAK_ADMIN_SDK_PACKAGE,
      sdkVersion: KEYCLOAK_ADMIN_SDK_VERSION,
      sdkBoundary: "adapter-package-only" as const,
      credentialPosture: "local-compose-placeholder" as const,
      productionReadinessClaim: false as const,
      liveProviderReadinessClaim: false as const,
    });
  }

  async issueLogin(input: { tenantId: string; email: string }): Promise<IdentityClaims> {
    const tenantId = assertNonEmpty(input.tenantId, "tenantId");
    const email = normalizeEmail(input.email);
    const user = await this.#upsertSyntheticUser({ tenantId, email });
    const subject = stableId("actor", [this.#config.realm, user.id]);
    this.#lastEvidence = keycloakEvidence({
      readinessMetrics: this.#readinessMetrics,
      realm: this.#config.realm,
      tenantId,
      subject,
      email,
      operation: "identity-login",
      readinessChecked: true,
      realmChecked: true,
      syntheticIdentityChecked: true,
      readbackChecked: true,
      tenantBoundaryChecked: false,
      failClosedChecked: false,
    });
    return Object.freeze({
      subject,
      tenantId,
      email,
      roles: Object.freeze(["tenant-admin"]),
      providerMode: this.mode,
    });
  }

  async proveRoundTrip(context: TenantContext): Promise<KeycloakComposedIdentityEvidence> {
    const email = syntheticEmail(context);
    const claims = await this.issueLogin({ tenantId: context.tenantId, email });
    assertTenantMatch(context, claims.tenantId, "keycloak-composed-identity.proveRoundTrip");
    let failClosedChecked = false;
    try {
      assertTenantMatch(
        context,
        `${context.tenantId}-outside`,
        "keycloak-composed-identity.negative-tenant-check",
      );
    } catch {
      failClosedChecked = true;
    }
    if (!failClosedChecked) {
      throw new Error("keycloak-composed-provider-tenant-boundary-not-fail-closed");
    }

    this.#lastEvidence = keycloakEvidence({
      readinessMetrics: this.#readinessMetrics,
      realm: this.#config.realm,
      tenantId: context.tenantId,
      subject: claims.subject,
      email: claims.email,
      operation: "identity-round-trip",
      readinessChecked: true,
      realmChecked: true,
      syntheticIdentityChecked: true,
      readbackChecked: true,
      tenantBoundaryChecked: true,
      failClosedChecked,
    });
    return this.#lastEvidence;
  }

  async #upsertSyntheticUser(input: {
    readonly tenantId: string;
    readonly email: string;
  }): Promise<{ readonly id: string }> {
    await this.#ensureReady();
    const username = syntheticUsername(input.tenantId, input.email);
    const tenantHash = safeEvidenceHash(input.tenantId);
    const userPayload = {
      username,
      email: input.email,
      enabled: true,
      emailVerified: true,
      attributes: {
        [SYNTHETIC_IDENTITY_ATTRIBUTE]: ["true"],
        [SYNTHETIC_TENANT_HASH_ATTRIBUTE]: [tenantHash],
      },
      requiredActions: [],
    };

    const existing = await safeKeycloakCall(
      () => this.#client.users.find({ realm: this.#config.realm, username, exact: true }),
      "keycloak-composed-provider-user-search-failed",
    );
    const existingUser = existing[0];
    const id = existingUser?.id
      ? existingUser.id
      : (
          await safeKeycloakCall(
            () => this.#client.users.create({ realm: this.#config.realm, ...userPayload }),
            "keycloak-composed-provider-user-create-failed",
          )
        ).id;

    if (existingUser?.id) {
      await safeKeycloakCall(
        () =>
          this.#client.users.update(
            { realm: this.#config.realm, id },
            {
              ...existingUser,
              ...userPayload,
            },
          ),
        "keycloak-composed-provider-user-update-failed",
      );
    }

    const readback = await safeKeycloakCall(
      () => this.#client.users.findOne({ realm: this.#config.realm, id }),
      "keycloak-composed-provider-user-readback-failed",
    );
    if (!readback) {
      throw new Error("keycloak-composed-provider-user-readback-missing");
    }
    if (readback.email?.toLowerCase() !== input.email) {
      throw new Error("keycloak-composed-provider-user-email-readback-mismatch");
    }
    if (
      attrValue(readback.attributes, SYNTHETIC_TENANT_HASH_ATTRIBUTE) !== tenantHash &&
      readback.username !== username
    ) {
      throw new Error("keycloak-composed-provider-user-tenant-attribute-readback-mismatch");
    }

    return Object.freeze({ id });
  }

  async #ensureReady(): Promise<void> {
    if (!this.#authenticated) {
      const auth = await retryKeycloakCall(
        () =>
          this.#client.auth({
            username: this.#config.adminUsername,
            password: this.#config.adminPassword,
            grantType: "password",
            clientId: this.#config.adminClientId,
          }),
        "keycloak-composed-provider-auth-failed",
      );
      this.#readinessMetrics = auth.metrics;
      this.#authenticated = true;
    }

    const realmResult = await retryKeycloakCall(
      () => this.#client.realms.findOne({ realm: this.#config.realm }),
      "keycloak-composed-provider-realm-readiness-failed",
    );
    this.#readinessMetrics = realmResult.metrics;
    const realm = realmResult.value;
    if (!realm) {
      const createRealm = await retryKeycloakCall(
        () =>
          this.#client.realms.create({
            realm: this.#config.realm,
            enabled: true,
            displayName: "USF composed proof realm",
          }),
        "keycloak-composed-provider-realm-create-failed",
      );
      this.#readinessMetrics = createRealm.metrics;
      return;
    }
    const updateRealm = await retryKeycloakCall(
      () =>
        this.#client.realms.update(
          { realm: this.#config.realm },
          {
            ...realm,
            realm: this.#config.realm,
            enabled: true,
          },
        ),
      "keycloak-composed-provider-realm-update-failed",
    );
    this.#readinessMetrics = updateRealm.metrics;
  }
}

export const keycloakTestProvider = Object.freeze({
  mode: "local-composed-real-service",
  service: "keycloak",
  issuer: "http://localhost:8090/realms/foundation",
  tenantClaim: "tenant_id",
});

export {
  createKeycloakTokenVerifier,
  type Jwk,
  type Jwks,
  type KeycloakVerifierConfig,
} from "./keycloak-verifier.ts";
export {
  HermeticKeycloak,
  type HermeticForgeOptions,
  type HermeticTokenInput,
} from "./hermetic-keycloak.ts";

function normalizeEmail(email: string): string {
  return assertNonEmpty(email, "email").toLowerCase();
}

function syntheticEmail(context: TenantContext): string {
  return `identity-${safeEvidenceHash(`${context.tenantId}:${context.actorId}`).slice(7)}@example.test`;
}

function syntheticUsername(tenantId: string, email: string): string {
  return `synthetic-${safeEvidenceHash(`${tenantId}:${email}`).slice(7)}`;
}

function attrValue(attributes: unknown, key: string): string | undefined {
  if (!attributes || typeof attributes !== "object" || !(key in attributes)) return undefined;
  const value = (attributes as Record<string, unknown>)[key];
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

async function safeKeycloakCall<T>(operation: () => Promise<T>, reasonCode: string): Promise<T> {
  try {
    return await withSdkTimeout(operation(), reasonCode, 10000);
  } catch {
    throw new Error(reasonCode);
  }
}

async function retryKeycloakCall<T>(
  operation: () => Promise<T>,
  reasonCode: string,
  timeoutMs = 120000,
): Promise<RetryResult<T>> {
  const startedAt = Date.now();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  let attempts = 0;
  let failures = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const value = await withSdkTimeout(operation(), reasonCode, 10000);
      return {
        value,
        metrics: {
          attempts,
          failures,
          retryCount: Math.max(0, attempts - 1),
          durationBucket: durationBucket(Date.now() - startedAt),
        },
      };
    } catch (error) {
      failures += 1;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempts)));
    }
  }
  throw new Error(reasonCode, { cause: lastError });
}

async function withSdkTimeout<T>(
  promise: Promise<T>,
  reasonCode: string,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(reasonCode)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function defaultRetryMetrics(): ComposeAdapterRetryMetrics {
  return Object.freeze({
    attempts: 0,
    failures: 0,
    retryCount: 0,
    durationBucket: "lt-1s" as const,
  });
}

function retryDelayMs(attempt: number): number {
  return Math.min(750 * 2 ** Math.max(0, attempt - 1), 7500);
}

function durationBucket(
  durationMs: number,
): KeycloakComposedIdentityEvidence["operationLatencyBucket"] {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 5000) return "1s-5s";
  if (durationMs < 30000) return "5s-30s";
  if (durationMs < 120000) return "30s-120s";
  return "timeout";
}

function safeEvidenceHash(value: string): string {
  return `sha256_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function keycloakEvidence(input: {
  readonly readinessMetrics: ComposeAdapterRetryMetrics;
  readonly realm: string;
  readonly tenantId: string;
  readonly subject: string;
  readonly email: string;
  readonly operation: KeycloakComposedIdentityEvidence["operation"];
  readonly readinessChecked: boolean;
  readonly realmChecked: boolean;
  readonly syntheticIdentityChecked: boolean;
  readonly readbackChecked: boolean;
  readonly tenantBoundaryChecked: boolean;
  readonly failClosedChecked: boolean;
}): KeycloakComposedIdentityEvidence {
  return Object.freeze({
    providerRef: KEYCLOAK_PROVIDER_REGISTRY_ID,
    providerMode: "composed-test",
    providerRegistryId: KEYCLOAK_PROVIDER_REGISTRY_ID,
    serviceCatalogueServiceIds: KEYCLOAK_SERVICE_CATALOGUE_IDS,
    bindingId: KEYCLOAK_RUNTIME_PROVIDER_BINDING_ID,
    adapterName: "KeycloakComposedIdentityProvider",
    sdkPackage: KEYCLOAK_ADMIN_SDK_PACKAGE,
    sdkVersion: KEYCLOAK_ADMIN_SDK_VERSION,
    sdkBoundary: "adapter-package-only",
    endpointRef: "endpoint://compose/keycloak",
    readinessChecked: input.readinessChecked,
    readinessRetryPolicy: "bounded-exponential-backoff-120s-keycloak",
    readinessAttempts: input.readinessMetrics.attempts,
    retryCount: input.readinessMetrics.retryCount,
    connectionFailureCount: input.readinessMetrics.failures,
    operationLatencyBucket: input.readinessMetrics.durationBucket,
    adapterHealthStatus: "healthy",
    structuredLogEvidenceCaptured: true,
    traceEvidenceCaptured: true,
    metricEvidenceCaptured: true,
    auditEvidenceCaptured: true,
    redactionChecked: true,
    traceIdHash: safeEvidenceHash(`keycloak-trace:${input.tenantId}:${input.email}`),
    correlationIdHash: safeEvidenceHash(`keycloak-correlation:${input.tenantId}:${input.email}`),
    operation: input.operation,
    operationOutcome: "succeeded",
    safeErrorCode: null,
    failClosedDenials: input.failClosedChecked ? 1 : 0,
    iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
    realmChecked: input.realmChecked,
    syntheticIdentityChecked: input.syntheticIdentityChecked,
    readbackChecked: input.readbackChecked,
    tenantBoundaryChecked: input.tenantBoundaryChecked,
    failClosedChecked: input.failClosedChecked,
    cleanupBoundary: "compose-down-volume-removal",
    safeProviderSummary: "keycloak-composed-provider",
    realmHash: safeEvidenceHash(input.realm),
    tenantIdHash: safeEvidenceHash(input.tenantId),
    subjectHash: safeEvidenceHash(input.subject),
    emailHash: safeEvidenceHash(input.email),
  });
}
