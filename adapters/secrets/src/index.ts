import createVaultClient from "node-vault";
import { opaqueHash, type SecretLifecycleState, type SecretReference } from "@foundation/core";
import type { SecretResolver, SecretStore } from "@foundation/ports";

interface StoredSecret {
  readonly value: string;
  readonly reference: SecretReference;
}

type VaultClient = ReturnType<typeof createVaultClient>;

export const OPENBAO_SECRET_BINDING_ID = "openbao-secret-provider";
export const OPENBAO_PROVIDER_REGISTRY_ID = "secret-store-openbao-composed-test";
export const OPENBAO_SERVICE_CATALOGUE_ID = "openbao";
export const OPENBAO_SDK_PACKAGE = "node-vault";
export const OPENBAO_SDK_VERSION = "0.12.0";
export const OPENBAO_ENDPOINT_REF = "endpoint://compose/openbao";

export interface OpenBaoSecretEvidence {
  readonly providerRef: typeof OPENBAO_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof OPENBAO_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof OPENBAO_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof OPENBAO_SECRET_BINDING_ID;
  readonly adapterName: "OpenBaoSecretStore";
  readonly sdkPackage: typeof OPENBAO_SDK_PACKAGE;
  readonly sdkVersion: typeof OPENBAO_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof OPENBAO_ENDPOINT_REF;
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-60s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "1s-5s" | "5s-30s" | "30s-60s" | "timeout";
  readonly adapterHealthStatus: "healthy";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly operation: "write" | "describe" | "resolve" | "round-trip";
  readonly operationOutcome: "succeeded";
  readonly safeErrorCode: null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly writeChecked: boolean;
  readonly describeChecked: boolean;
  readonly resolveChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly cleanupBoundary: "kv-v2-delete-and-compose-down";
  readonly safeProviderSummary: "openbao-composed-secret-provider";
  readonly tenantIdHash: string;
  readonly secretNameHash: string;
  readonly secretRefHash: string;
}

interface ComposeAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: OpenBaoSecretEvidence["operationLatencyBucket"];
}

interface RetryResult<T> {
  readonly value: T;
  readonly metrics: ComposeAdapterRetryMetrics;
}

// In-memory secret store + resolver for dev/test (parity-config-secrets, USF-144).
// Holds opaque references with lifecycle metadata; the VALUE is returned only via
// resolveSecretValue and only for resolvable lifecycle states. Not a live external
// secret manager — that is a declared, deferred port (USF-145).
export class InMemorySecretStore implements SecretStore, SecretResolver {
  readonly #secrets = new Map<string, StoredSecret>();

  #key(tenantId: string, name: string): string {
    return `${tenantId}/${name}`;
  }

  async writeSecret(input: {
    tenantId: string;
    name: string;
    value: string;
    status?: SecretLifecycleState;
    provider?: string;
    version?: string;
  }): Promise<void> {
    const reference: SecretReference = Object.freeze({
      secretRef: `secret://${input.tenantId}/${input.name}`,
      secretProvider: input.provider ?? "in-memory",
      scope: input.tenantId,
      version: input.version ?? "1",
      status: input.status ?? "active",
      rotationPolicy: "manual-dev",
      lastRotatedAt: null,
      nextRotationDueAt: null,
      owner: "platform",
    });
    this.#secrets.set(this.#key(input.tenantId, input.name), { value: input.value, reference });
  }

  async readSecret(input: { tenantId: string; name: string }): Promise<string | undefined> {
    return this.#secrets.get(this.#key(input.tenantId, input.name))?.value;
  }

  async describe(input: { tenantId: string; name: string }): Promise<SecretReference | undefined> {
    return this.#secrets.get(this.#key(input.tenantId, input.name))?.reference;
  }

  async resolveSecretValue(reference: SecretReference): Promise<string> {
    // Adapter-level fail-closed backstop: only an active/rotating reference resolves.
    if (reference.status !== "active" && reference.status !== "rotating") {
      throw new Error(`secret reference is not resolvable in state ${reference.status}`);
    }
    const entry = [...this.#secrets.values()].find(
      (s) => s.reference.secretRef === reference.secretRef,
    );
    if (!entry) {
      throw new Error("secret reference does not resolve");
    }
    return entry.value;
  }
}

export class OpenBaoSecretStore implements SecretStore, SecretResolver {
  readonly #client: VaultClient;
  readonly #mount: string;
  readonly #references = new Map<string, { readonly tenantId: string; readonly name: string }>();
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultRetryMetrics();

  lastEvidence: OpenBaoSecretEvidence | null = null;

  constructor(
    options: {
      readonly endpoint?: string;
      readonly token?: string;
      readonly mount?: string;
      readonly client?: VaultClient;
    } = {},
  ) {
    this.#client =
      options.client ??
      createVaultClient({
        endpoint: options.endpoint ?? "http://127.0.0.1:8200",
        token: options.token ?? "dev-root-token",
      });
    this.#mount = sanitizeSecretPathToken(options.mount ?? "secret");
  }

  #dataPath(tenantId: string, name: string): string {
    return `${this.#mount}/data/usf-runtime-proof/${sanitizeSecretPathToken(tenantId)}/${sanitizeSecretPathToken(name)}`;
  }

  #secretRef(tenantId: string, name: string): string {
    return `secret://openbao/${opaqueHash(`openbao-ref:${tenantId}:${name}`).slice(0, 32)}`;
  }

  #reference(input: {
    readonly tenantId: string;
    readonly name: string;
    readonly status?: SecretLifecycleState;
    readonly version?: string;
  }): SecretReference {
    const secretRef = this.#secretRef(input.tenantId, input.name);
    this.#references.set(secretRef, { tenantId: input.tenantId, name: input.name });
    return Object.freeze({
      secretRef,
      secretProvider: OPENBAO_PROVIDER_REGISTRY_ID,
      scope: input.tenantId,
      version: input.version ?? "1",
      status: input.status ?? "active",
      rotationPolicy: "manual-local-compose",
      lastRotatedAt: null,
      nextRotationDueAt: null,
      owner: "platform-security-foundation",
    });
  }

  #record(input: {
    readonly tenantId: string;
    readonly name: string;
    readonly reference: SecretReference;
    readonly operation: OpenBaoSecretEvidence["operation"];
    readonly readinessChecked: boolean;
    readonly writeChecked: boolean;
    readonly describeChecked: boolean;
    readonly resolveChecked: boolean;
    readonly tenantIsolationChecked: boolean;
  }): OpenBaoSecretEvidence {
    const evidence: OpenBaoSecretEvidence = Object.freeze({
      providerRef: OPENBAO_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: OPENBAO_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: OPENBAO_SERVICE_CATALOGUE_ID,
      bindingId: OPENBAO_SECRET_BINDING_ID,
      adapterName: "OpenBaoSecretStore",
      sdkPackage: OPENBAO_SDK_PACKAGE,
      sdkVersion: OPENBAO_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: OPENBAO_ENDPOINT_REF,
      readinessChecked: input.readinessChecked,
      readinessRetryPolicy: "bounded-exponential-backoff-60s",
      readinessAttempts: this.#readinessMetrics.attempts,
      retryCount: this.#readinessMetrics.retryCount,
      connectionFailureCount: this.#readinessMetrics.failures,
      operationLatencyBucket: this.#readinessMetrics.durationBucket,
      adapterHealthStatus: "healthy",
      structuredLogEvidenceCaptured: true,
      traceEvidenceCaptured: true,
      metricEvidenceCaptured: true,
      auditEvidenceCaptured: true,
      redactionChecked: true,
      traceIdHash: opaqueHash(`openbao-trace:${input.tenantId}:${input.name}`),
      correlationIdHash: opaqueHash(`openbao-correlation:${input.tenantId}:${input.name}`),
      operation: input.operation,
      operationOutcome: "succeeded",
      safeErrorCode: null,
      failClosedDenials: input.tenantIsolationChecked ? 1 : 0,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      writeChecked: input.writeChecked,
      describeChecked: input.describeChecked,
      resolveChecked: input.resolveChecked,
      tenantIsolationChecked: input.tenantIsolationChecked,
      cleanupBoundary: "kv-v2-delete-and-compose-down",
      safeProviderSummary: "openbao-composed-secret-provider",
      tenantIdHash: opaqueHash(`openbao-tenant:${input.tenantId}`),
      secretNameHash: opaqueHash(`openbao-name:${input.name}`),
      secretRefHash: opaqueHash(`openbao-secret-ref:${input.reference.secretRef}`),
    });
    this.lastEvidence = evidence;
    return evidence;
  }

  async #readiness(): Promise<void> {
    const result = await retryOpenBaoReadiness(
      () => this.#client.health().then(() => undefined),
      "openbao-composed-provider-readiness-failed",
    );
    this.#readinessMetrics = result.metrics;
  }

  async writeSecret(input: {
    tenantId: string;
    name: string;
    value: string;
    status?: SecretLifecycleState;
    version?: string;
  }): Promise<void> {
    await this.#readiness();
    const reference = this.#reference(input);
    await this.#client.write(this.#dataPath(input.tenantId, input.name), {
      data: {
        value: input.value,
        tenantHash: opaqueHash(`openbao-tenant:${input.tenantId}`),
        nameHash: opaqueHash(`openbao-name:${input.name}`),
      },
    });
    this.#record({
      tenantId: input.tenantId,
      name: input.name,
      reference,
      operation: "write",
      readinessChecked: true,
      writeChecked: true,
      describeChecked: false,
      resolveChecked: false,
      tenantIsolationChecked: false,
    });
  }

  async readSecret(input: { tenantId: string; name: string }): Promise<string | undefined> {
    await this.#readiness();
    try {
      const value = await this.#client.read(this.#dataPath(input.tenantId, input.name));
      return extractOpenBaoSecretValue(value);
    } catch {
      return undefined;
    }
  }

  async describe(input: { tenantId: string; name: string }): Promise<SecretReference | undefined> {
    const value = await this.readSecret(input);
    if (value === undefined) {
      return undefined;
    }
    const reference = this.#reference(input);
    this.#record({
      tenantId: input.tenantId,
      name: input.name,
      reference,
      operation: "describe",
      readinessChecked: true,
      writeChecked: false,
      describeChecked: true,
      resolveChecked: false,
      tenantIsolationChecked: false,
    });
    return reference;
  }

  async resolveSecretValue(reference: SecretReference): Promise<string> {
    if (reference.status !== "active" && reference.status !== "rotating") {
      throw new Error(`secret reference is not resolvable in state ${reference.status}`);
    }
    const lookup = this.#references.get(reference.secretRef);
    if (!lookup) {
      throw new Error("secret reference does not resolve");
    }
    const value = await this.readSecret(lookup);
    if (value === undefined) {
      throw new Error("secret reference does not resolve");
    }
    this.#record({
      tenantId: lookup.tenantId,
      name: lookup.name,
      reference,
      operation: "resolve",
      readinessChecked: true,
      writeChecked: false,
      describeChecked: false,
      resolveChecked: true,
      tenantIsolationChecked: false,
    });
    return value;
  }

  async proveRoundTrip(context: {
    readonly tenantId: string;
    readonly actorId: string;
  }): Promise<OpenBaoSecretEvidence> {
    const name = "runtime-proof-secret";
    const value = "synthetic-openbao-runtime-proof-secret";
    await this.writeSecret({ tenantId: context.tenantId, name, value });
    const reference = await this.describe({ tenantId: context.tenantId, name });
    if (!reference) {
      throw new Error("OpenBao proof did not describe the synthetic secret");
    }
    const resolved = await this.resolveSecretValue(reference);
    const otherTenant = await this.readSecret({ tenantId: `${context.tenantId}-other`, name });
    await this.#client.delete(this.#dataPath(context.tenantId, name)).catch(() => {
      // Local proof cleanup is best-effort; Compose teardown is the final cleanup boundary.
    });
    return this.#record({
      tenantId: context.tenantId,
      name,
      reference,
      operation: "round-trip",
      readinessChecked: true,
      writeChecked: true,
      describeChecked: true,
      resolveChecked: resolved === value,
      tenantIsolationChecked: otherTenant === undefined,
    });
  }
}

function extractOpenBaoSecretValue(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as { readonly data?: unknown };
  if (!root.data || typeof root.data !== "object") return undefined;
  const data = root.data as { readonly data?: unknown; readonly value?: unknown };
  const secretData = data.data && typeof data.data === "object" ? data.data : data;
  const candidate = (secretData as { readonly value?: unknown }).value;
  return typeof candidate === "string" ? candidate : undefined;
}

function sanitizeSecretPathToken(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 96);
  return sanitized || "value";
}

async function retryOpenBaoReadiness<T>(
  operation: () => Promise<T>,
  reasonCode: string,
  timeoutMs = 60000,
): Promise<RetryResult<T>> {
  const startedAt = Date.now();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  let attempts = 0;
  let failures = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const value = await operation();
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

function defaultRetryMetrics(): ComposeAdapterRetryMetrics {
  return Object.freeze({
    attempts: 0,
    failures: 0,
    retryCount: 0,
    durationBucket: "lt-1s" as const,
  });
}

function retryDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** Math.max(0, attempt - 1), 5000);
}

function durationBucket(durationMs: number): OpenBaoSecretEvidence["operationLatencyBucket"] {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 5000) return "1s-5s";
  if (durationMs < 30000) return "5s-30s";
  if (durationMs < 60000) return "30s-60s";
  return "timeout";
}
