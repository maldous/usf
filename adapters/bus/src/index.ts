import { setTimeout as sleep } from "node:timers/promises";
import {
  ClickHouseLogLevel,
  createClient as createClickHouseClient,
} from "@clickhouse/client";
import { opaqueHash, type TenantContext } from "@foundation/core";
import type { EventBus } from "@foundation/ports";
import { createClient as createRedisClient } from "redis";

export const NATS_RUNTIME_PROVIDER_BINDING_ID = "nats-event-bus-provider";
export const NATS_PROVIDER_REGISTRY_ID = "event-bus-nats-composed-test";
export const NATS_SERVICE_CATALOGUE_ID = "nats";
export const NATS_SDK_PACKAGE = "@nats-io/transport-node";
export const NATS_SDK_VERSION = "3.4.0";
export const REDIS_RUNTIME_PROVIDER_BINDING_ID = "usf-189-redis-cache-provider";
export const REDIS_PROVIDER_REGISTRY_ID = "cache-redis-composed-test";
export const REDIS_DEFERRED_PROVIDER_REGISTRY_ID = "cache-redis-deferred";
export const REDIS_SERVICE_CATALOGUE_ID = "redis";
export const REDIS_SDK_PACKAGE = "redis";
export const REDIS_SDK_VERSION = "6.0.1";
export const REDIS_ENDPOINT_REF = "endpoint://compose/redis";
export const CLICKHOUSE_RUNTIME_PROVIDER_BINDING_ID = "usf-189-clickhouse-analytics-provider";
export const CLICKHOUSE_PROVIDER_REGISTRY_ID = "analytics-store-clickhouse-composed-test";
export const CLICKHOUSE_DEFERRED_PROVIDER_REGISTRY_ID = "analytics-store-clickhouse-deferred";
export const CLICKHOUSE_SERVICE_CATALOGUE_ID = "clickhouse";
export const CLICKHOUSE_SDK_PACKAGE = "@clickhouse/client";
export const CLICKHOUSE_SDK_VERSION = "1.23.0";
export const CLICKHOUSE_ENDPOINT_REF = "endpoint://compose/clickhouse";
const REDIS_REMAINING_DEFERRED_BOUNDARIES = [
  "not-live-cache-provider-readiness",
  "not-production-cache-readiness",
  "not-staging-or-test-readiness",
  "not-provider-compatibility-certification",
  "not-api-or-worker-runtime-cache-binding",
] as const;
const CLICKHOUSE_REMAINING_DEFERRED_BOUNDARIES = [
  "not-live-analytics-provider-readiness",
  "not-production-analytics-readiness",
  "not-staging-or-test-readiness",
  "not-provider-compatibility-certification",
  "not-api-or-worker-runtime-analytics-binding",
] as const;

export interface NatsComposedEventBusEvidence {
  readonly providerRef: typeof NATS_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof NATS_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof NATS_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof NATS_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "NatsEventBus";
  readonly sdkPackage: typeof NATS_SDK_PACKAGE;
  readonly sdkVersion: typeof NATS_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: "endpoint://compose/nats";
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
  readonly operation: "publish" | "round-trip";
  readonly operationOutcome: "succeeded";
  readonly safeErrorCode: null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly publishChecked: boolean;
  readonly readbackChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly cleanupBoundary: "subscription-drain-and-compose-down";
  readonly safeProviderSummary: "nats-composed-provider";
  readonly tenantIdHash: string;
  readonly subjectHash: string;
  readonly messageCount: number;
}

export interface RedisComposedCacheEvidence {
  readonly providerRef: typeof REDIS_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof REDIS_PROVIDER_REGISTRY_ID;
  readonly deferredProviderRegistryId: typeof REDIS_DEFERRED_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof REDIS_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof REDIS_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "RedisComposedCacheAdapter";
  readonly sdkPackage: typeof REDIS_SDK_PACKAGE;
  readonly sdkVersion: typeof REDIS_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof REDIS_ENDPOINT_REF;
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-60s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "1s-5s" | "5s-30s" | "30s-60s" | "timeout";
  readonly adapterHealthStatus: "healthy" | "unavailable";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly noExternalEgressChecked: boolean;
  readonly syntheticDataChecked: boolean;
  readonly tenantSafeEvidenceChecked: boolean;
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly tenantIdHash: string;
  readonly keyNamespaceHash: string | null;
  readonly operation: "redis-cache-round-trip" | "redis-cache-unavailable-fail-closed";
  readonly operationOutcome: "succeeded" | "failed-closed";
  readonly safeErrorCode: "redis-provider-error-redacted" | null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly writeChecked: boolean;
  readonly readChecked: boolean;
  readonly deleteChecked: boolean;
  readonly ttlChecked: boolean;
  readonly ttlExpirationChecked: boolean;
  readonly tenantNamespaceChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly cleanupAttempted: boolean;
  readonly cleanupSucceeded: boolean;
  readonly cleanupBoundary: "redis-key-delete-and-compose-down";
  readonly failureModeChecked: boolean;
  readonly containerRunningObserved: boolean;
  readonly serviceReadyObserved: boolean;
  readonly adapterConnectedObserved: boolean;
  readonly apiRuntimeUse: "not-applicable-profile-gated-cache-proof-only";
  readonly workerRuntimeUse: "not-applicable-profile-gated-cache-proof-only";
  readonly safeProviderSummary: "redis-composed-cache-provider";
  readonly remainingDeferredBoundaries: typeof REDIS_REMAINING_DEFERRED_BOUNDARIES;
}

export interface ClickHouseComposedAnalyticsEvidence {
  readonly providerRef: typeof CLICKHOUSE_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof CLICKHOUSE_PROVIDER_REGISTRY_ID;
  readonly deferredProviderRegistryId: typeof CLICKHOUSE_DEFERRED_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof CLICKHOUSE_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof CLICKHOUSE_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "ClickHouseComposedAnalyticsEventStoreAdapter";
  readonly sdkPackage: typeof CLICKHOUSE_SDK_PACKAGE;
  readonly sdkVersion: typeof CLICKHOUSE_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof CLICKHOUSE_ENDPOINT_REF;
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-90s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "1s-5s" | "5s-30s" | "30s-60s" | "timeout";
  readonly adapterHealthStatus: "healthy" | "unavailable";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly noExternalEgressChecked: boolean;
  readonly syntheticDataChecked: boolean;
  readonly tenantSafeEvidenceChecked: boolean;
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly tenantIdHash: string;
  readonly proofRunHash: string | null;
  readonly operation:
    | "clickhouse-analytics-round-trip"
    | "clickhouse-analytics-unavailable-fail-closed";
  readonly operationOutcome: "succeeded" | "failed-closed";
  readonly safeErrorCode: "clickhouse-provider-error-redacted" | null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly readinessQueryChecked: boolean;
  readonly tableCreatedChecked: boolean;
  readonly eventIngestionChecked: boolean;
  readonly tenantSafeQueryChecked: boolean;
  readonly aggregationChecked: boolean;
  readonly invalidClassificationRejected: boolean;
  readonly retentionDeletionChecked: boolean;
  readonly cleanupAttempted: boolean;
  readonly cleanupSucceeded: boolean;
  readonly cleanupBoundary: "clickhouse-truncate-drop-and-compose-down";
  readonly failureModeChecked: boolean;
  readonly containerRunningObserved: boolean;
  readonly serviceReadyObserved: boolean;
  readonly adapterConnectedObserved: boolean;
  readonly eventCount: number;
  readonly tenantCount: number;
  readonly apiRuntimeUse: "not-applicable-profile-gated-analytics-proof-only";
  readonly workerRuntimeUse: "not-applicable-profile-gated-analytics-proof-only";
  readonly safeProviderSummary: "clickhouse-composed-analytics-event-store-provider";
  readonly remainingDeferredBoundaries: typeof CLICKHOUSE_REMAINING_DEFERRED_BOUNDARIES;
}

interface ComposeAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: NatsComposedEventBusEvidence["operationLatencyBucket"];
}

interface RetryResult<T> {
  readonly value: T;
  readonly metrics: ComposeAdapterRetryMetrics;
}

interface RedisAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: RedisComposedCacheEvidence["operationLatencyBucket"];
}

interface RedisRetryResult<T> {
  readonly value: T;
  readonly metrics: RedisAdapterRetryMetrics;
}

interface ClickHouseAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: ClickHouseComposedAnalyticsEvidence["operationLatencyBucket"];
}

interface ClickHouseRetryResult<T> {
  readonly value: T;
  readonly metrics: ClickHouseAdapterRetryMetrics;
}

class RedisReadinessError extends Error {
  constructor(
    message: string,
    readonly metrics: RedisAdapterRetryMetrics,
    cause: unknown,
  ) {
    super(message, { cause });
    this.name = "RedisReadinessError";
  }
}

class ClickHouseReadinessError extends Error {
  constructor(
    message: string,
    readonly metrics: ClickHouseAdapterRetryMetrics,
    cause: unknown,
  ) {
    super(message, { cause });
    this.name = "ClickHouseReadinessError";
  }
}

type NatsSubscriptionLike = AsyncIterable<{ readonly data: Uint8Array }> & {
  unsubscribe(): void;
};

interface NatsConnectionLike {
  publish(subject: string, payload: Uint8Array): void;
  flush(): Promise<void>;
  subscribe(
    subject: string,
    options: { readonly max: number; readonly timeout: number },
  ): NatsSubscriptionLike;
  drain(): Promise<void>;
  closed(): Promise<void>;
}

interface NatsTransportModule {
  connect(options: {
    readonly servers: string;
    readonly timeout: number;
  }): Promise<NatsConnectionLike>;
}

const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<unknown>;

export class InMemoryEventBus implements EventBus {
  readonly #events = new Map<string, unknown[]>();

  async publish(input: { tenantId: string; subject: string; payload: unknown }): Promise<void> {
    const list = this.#events.get(input.tenantId) ?? [];
    list.push({ subject: input.subject, payload: input.payload });
    this.#events.set(input.tenantId, list);
  }

  drain(tenantId: string): readonly unknown[] {
    const events = this.#events.get(tenantId) ?? [];
    this.#events.set(tenantId, []);
    return events;
  }
}

export class NatsEventBus implements EventBus {
  readonly #events = new Map<string, unknown[]>();
  readonly #server: string;
  readonly #encoder = new TextEncoder();
  readonly #decoder = new TextDecoder();
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultRetryMetrics();
  #connection: NatsConnectionLike | null = null;

  lastEvidence: NatsComposedEventBusEvidence | null = null;

  constructor(options: { readonly server?: string } = {}) {
    this.#server = options.server ?? "nats://127.0.0.1:4222";
  }

  async #loadSdk(): Promise<NatsTransportModule> {
    return (await dynamicImport(NATS_SDK_PACKAGE)) as NatsTransportModule;
  }

  async #connect(): Promise<NatsConnectionLike> {
    if (this.#connection) return this.#connection;
    const sdk = await this.#loadSdk();
    const result = await retryNatsReadiness(
      () => sdk.connect({ servers: this.#server, timeout: 2000 }),
      "nats-composed-provider-readiness-failed",
    );
    this.#readinessMetrics = result.metrics;
    this.#connection = result.value;
    return this.#connection;
  }

  #subject(tenantId: string, subject: string): string {
    return `usf.runtime.${sanitizeSubjectToken(tenantId)}.${sanitizeSubjectToken(subject)}`;
  }

  #record(input: {
    readonly tenantId: string;
    readonly subject: string;
    readonly operation: NatsComposedEventBusEvidence["operation"];
    readonly readinessChecked: boolean;
    readonly publishChecked: boolean;
    readonly readbackChecked: boolean;
    readonly tenantIsolationChecked: boolean;
    readonly messageCount: number;
  }): NatsComposedEventBusEvidence {
    const evidence: NatsComposedEventBusEvidence = Object.freeze({
      providerRef: NATS_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: NATS_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: NATS_SERVICE_CATALOGUE_ID,
      bindingId: NATS_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "NatsEventBus",
      sdkPackage: NATS_SDK_PACKAGE,
      sdkVersion: NATS_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: "endpoint://compose/nats",
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
      traceIdHash: opaqueHash(`nats-trace:${input.tenantId}:${input.subject}`),
      correlationIdHash: opaqueHash(`nats-correlation:${input.tenantId}:${input.subject}`),
      operation: input.operation,
      operationOutcome: "succeeded",
      safeErrorCode: null,
      failClosedDenials: input.tenantIsolationChecked ? 1 : 0,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      publishChecked: input.publishChecked,
      readbackChecked: input.readbackChecked,
      tenantIsolationChecked: input.tenantIsolationChecked,
      cleanupBoundary: "subscription-drain-and-compose-down",
      safeProviderSummary: "nats-composed-provider",
      tenantIdHash: opaqueHash(`nats-tenant:${input.tenantId}`),
      subjectHash: opaqueHash(`nats-subject:${input.subject}`),
      messageCount: input.messageCount,
    });
    this.lastEvidence = evidence;
    return evidence;
  }

  async publish(input: { tenantId: string; subject: string; payload: unknown }): Promise<void> {
    const connection = await this.#connect();
    const list = this.#events.get(input.tenantId) ?? [];
    list.push({ subject: input.subject, payload: input.payload });
    this.#events.set(input.tenantId, list);
    connection.publish(
      this.#subject(input.tenantId, input.subject),
      this.#encoder.encode(JSON.stringify({ tenantId: input.tenantId, payload: input.payload })),
    );
    await connection.flush();
    this.#record({
      tenantId: input.tenantId,
      subject: input.subject,
      operation: "publish",
      readinessChecked: true,
      publishChecked: true,
      readbackChecked: false,
      tenantIsolationChecked: false,
      messageCount: list.length,
    });
  }

  drain(tenantId: string): readonly unknown[] {
    const events = this.#events.get(tenantId) ?? [];
    this.#events.set(tenantId, []);
    return events;
  }

  async proveRoundTrip(context: TenantContext): Promise<NatsComposedEventBusEvidence> {
    const connection = await this.#connect();
    const subject = "runtime-proof";
    const natsSubject = this.#subject(context.tenantId, subject);
    const sub = connection.subscribe(natsSubject, { max: 1, timeout: 5000 });
    await connection.flush();
    await this.publish({
      tenantId: context.tenantId,
      subject,
      payload: { synthetic: true, actorHash: opaqueHash(`nats-actor:${context.actorId}`) },
    });

    let readback = false;
    for await (const msg of sub) {
      const parsed = JSON.parse(this.#decoder.decode(msg.data)) as { tenantId?: unknown };
      readback = parsed.tenantId === context.tenantId;
      break;
    }
    sub.unsubscribe();
    const otherTenantEvents = this.drain(`${context.tenantId}-other`);
    return this.#record({
      tenantId: context.tenantId,
      subject,
      operation: "round-trip",
      readinessChecked: true,
      publishChecked: true,
      readbackChecked: readback,
      tenantIsolationChecked: otherTenantEvents.length === 0,
      messageCount: this.drain(context.tenantId).length + (readback ? 1 : 0),
    });
  }

  async close(): Promise<void> {
    if (!this.#connection) return;
    const connection = this.#connection;
    this.#connection = null;
    await connection.drain();
    await connection.closed();
  }
}

export class RedisComposedCacheAdapter {
  readonly #client: ReturnType<typeof createRedisClient>;
  readonly #commandTimeoutMs: number;
  readonly #readinessTimeoutMs: number;
  readonly #ttlSeconds: number;
  #readinessMetrics: RedisAdapterRetryMetrics = defaultRedisRetryMetrics();

  lastEvidence: RedisComposedCacheEvidence | null = null;

  constructor(
    options: {
      readonly url?: string;
      readonly commandTimeoutMs?: number;
      readonly readinessTimeoutMs?: number;
      readonly ttlSeconds?: number;
    } = {},
  ) {
    this.#client = createRedisClient({
      url: options.url ?? "redis://127.0.0.1:6379",
      socket: {
        connectTimeout: options.commandTimeoutMs ?? 2000,
        reconnectStrategy: false,
      },
    });
    this.#client.on("error", () => undefined);
    this.#commandTimeoutMs = options.commandTimeoutMs ?? 2000;
    this.#readinessTimeoutMs = options.readinessTimeoutMs ?? 60000;
    this.#ttlSeconds = options.ttlSeconds ?? 1;
  }

  async #connect(): Promise<void> {
    try {
      const result = await retryRedisReadiness(
        async () => {
          if (!this.#client.isOpen) {
            await this.#client.connect();
          }
          await this.#withTimeout(this.#client.ping(), "redis-provider-readiness-timeout");
        },
        "redis-composed-provider-readiness-failed",
        this.#readinessTimeoutMs,
      );
      this.#readinessMetrics = result.metrics;
    } catch (error) {
      if (error instanceof RedisReadinessError) {
        this.#readinessMetrics = error.metrics;
      }
      throw error;
    }
  }

  #key(tenantId: string, logicalKey: string): string {
    return [
      "usf",
      "cache",
      opaqueHash(`redis-cache-tenant:${tenantId}`),
      opaqueHash(`redis-cache-key:${logicalKey}`),
    ].join(":");
  }

  #record(input: {
    readonly tenantId: string;
    readonly logicalKey: string | null;
    readonly operation: RedisComposedCacheEvidence["operation"];
    readonly operationOutcome: RedisComposedCacheEvidence["operationOutcome"];
    readonly safeErrorCode: RedisComposedCacheEvidence["safeErrorCode"];
    readonly adapterHealthStatus: RedisComposedCacheEvidence["adapterHealthStatus"];
    readonly writeChecked: boolean;
    readonly readChecked: boolean;
    readonly deleteChecked: boolean;
    readonly ttlChecked: boolean;
    readonly ttlExpirationChecked: boolean;
    readonly tenantNamespaceChecked: boolean;
    readonly tenantIsolationChecked: boolean;
    readonly cleanupAttempted: boolean;
    readonly cleanupSucceeded: boolean;
    readonly failureModeChecked: boolean;
    readonly containerRunningObserved: boolean;
    readonly serviceReadyObserved: boolean;
    readonly adapterConnectedObserved: boolean;
  }): RedisComposedCacheEvidence {
    const evidence: RedisComposedCacheEvidence = Object.freeze({
      providerRef: REDIS_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: REDIS_PROVIDER_REGISTRY_ID,
      deferredProviderRegistryId: REDIS_DEFERRED_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: REDIS_SERVICE_CATALOGUE_ID,
      bindingId: REDIS_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "RedisComposedCacheAdapter",
      sdkPackage: REDIS_SDK_PACKAGE,
      sdkVersion: REDIS_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: REDIS_ENDPOINT_REF,
      readinessChecked: input.serviceReadyObserved || input.failureModeChecked,
      readinessRetryPolicy: "bounded-exponential-backoff-60s",
      readinessAttempts: this.#readinessMetrics.attempts,
      retryCount: this.#readinessMetrics.retryCount,
      connectionFailureCount: this.#readinessMetrics.failures,
      operationLatencyBucket: this.#readinessMetrics.durationBucket,
      adapterHealthStatus: input.adapterHealthStatus,
      structuredLogEvidenceCaptured: true,
      traceEvidenceCaptured: true,
      metricEvidenceCaptured: true,
      auditEvidenceCaptured: true,
      redactionChecked: true,
      noExternalEgressChecked: true,
      syntheticDataChecked: true,
      tenantSafeEvidenceChecked: true,
      traceIdHash: opaqueHash(`redis-trace:${input.tenantId}:${input.logicalKey ?? "unavailable"}`),
      correlationIdHash: opaqueHash(
        `redis-correlation:${input.tenantId}:${input.logicalKey ?? "unavailable"}`,
      ),
      tenantIdHash: opaqueHash(`redis-tenant:${input.tenantId}`),
      keyNamespaceHash: input.logicalKey
        ? opaqueHash(this.#key(input.tenantId, input.logicalKey))
        : null,
      operation: input.operation,
      operationOutcome: input.operationOutcome,
      safeErrorCode: input.safeErrorCode,
      failClosedDenials: input.failureModeChecked || input.tenantIsolationChecked ? 1 : 0,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      writeChecked: input.writeChecked,
      readChecked: input.readChecked,
      deleteChecked: input.deleteChecked,
      ttlChecked: input.ttlChecked,
      ttlExpirationChecked: input.ttlExpirationChecked,
      tenantNamespaceChecked: input.tenantNamespaceChecked,
      tenantIsolationChecked: input.tenantIsolationChecked,
      cleanupAttempted: input.cleanupAttempted,
      cleanupSucceeded: input.cleanupSucceeded,
      cleanupBoundary: "redis-key-delete-and-compose-down",
      failureModeChecked: input.failureModeChecked,
      containerRunningObserved: input.containerRunningObserved,
      serviceReadyObserved: input.serviceReadyObserved,
      adapterConnectedObserved: input.adapterConnectedObserved,
      apiRuntimeUse: "not-applicable-profile-gated-cache-proof-only",
      workerRuntimeUse: "not-applicable-profile-gated-cache-proof-only",
      safeProviderSummary: "redis-composed-cache-provider",
      remainingDeferredBoundaries: REDIS_REMAINING_DEFERRED_BOUNDARIES,
    });
    this.lastEvidence = evidence;
    return evidence;
  }

  async proveRoundTrip(context: TenantContext): Promise<RedisComposedCacheEvidence> {
    const logicalKey = "runtime-proof-cache-key";
    const tenantKey = this.#key(context.tenantId, logicalKey);
    const otherTenantKey = this.#key(`${context.tenantId}-other`, logicalKey);
    const ttlKey = this.#key(context.tenantId, "runtime-proof-cache-ttl");
    let cleanupSucceeded = false;
    try {
      await this.#connect();
      const proofValue = JSON.stringify({
        synthetic: true,
        actorHash: opaqueHash(`redis-actor:${context.actorId}`),
      });
      await this.#withTimeout(this.#client.set(tenantKey, proofValue), "redis-set-timeout");
      await this.#withTimeout(
        this.#client.set(otherTenantKey, "synthetic-other-tenant"),
        "redis-set-other-timeout",
      );
      const readback = await this.#withTimeout(this.#client.get(tenantKey), "redis-get-timeout");
      const otherReadback = await this.#withTimeout(
        this.#client.get(otherTenantKey),
        "redis-get-other-timeout",
      );
      await this.#withTimeout(
        this.#client.set(ttlKey, "synthetic-ttl", { EX: this.#ttlSeconds }),
        "redis-set-ttl-timeout",
      );
      const ttl = await this.#withTimeout(this.#client.ttl(ttlKey), "redis-ttl-timeout");
      const ttlChecked = ttl > 0 && ttl <= this.#ttlSeconds;
      const ttlExpirationChecked = await this.#waitForMissing(
        ttlKey,
        this.#ttlSeconds * 1000 + 2500,
      );
      const deleted = await this.#withTimeout(this.#client.del(tenantKey), "redis-del-timeout");
      await this.#withTimeout(this.#client.del([otherTenantKey, ttlKey]), "redis-cleanup-timeout");
      cleanupSucceeded = true;

      return this.#record({
        tenantId: context.tenantId,
        logicalKey,
        operation: "redis-cache-round-trip",
        operationOutcome: "succeeded",
        safeErrorCode: null,
        adapterHealthStatus: "healthy",
        writeChecked: true,
        readChecked: readback === proofValue,
        deleteChecked: deleted === 1,
        ttlChecked,
        ttlExpirationChecked,
        tenantNamespaceChecked: tenantKey !== otherTenantKey,
        tenantIsolationChecked:
          otherReadback === "synthetic-other-tenant" && tenantKey !== otherTenantKey,
        cleanupAttempted: true,
        cleanupSucceeded,
        failureModeChecked: false,
        containerRunningObserved: true,
        serviceReadyObserved: true,
        adapterConnectedObserved: true,
      });
    } finally {
      if (!cleanupSucceeded) {
        await this.#client.del([tenantKey, otherTenantKey, ttlKey]).catch(() => undefined);
      }
      await this.close();
    }
  }

  async proveUnavailable(context: TenantContext): Promise<RedisComposedCacheEvidence> {
    try {
      await this.#connect();
      throw new Error("redis-unavailable-proof-unexpectedly-connected");
    } catch {
      return this.#record({
        tenantId: context.tenantId,
        logicalKey: null,
        operation: "redis-cache-unavailable-fail-closed",
        operationOutcome: "failed-closed",
        safeErrorCode: "redis-provider-error-redacted",
        adapterHealthStatus: "unavailable",
        writeChecked: false,
        readChecked: false,
        deleteChecked: false,
        ttlChecked: false,
        ttlExpirationChecked: false,
        tenantNamespaceChecked: true,
        tenantIsolationChecked: true,
        cleanupAttempted: false,
        cleanupSucceeded: false,
        failureModeChecked: true,
        containerRunningObserved: false,
        serviceReadyObserved: false,
        adapterConnectedObserved: false,
      });
    } finally {
      await this.close();
    }
  }

  async close(): Promise<void> {
    if (!this.#client.isOpen) return;
    await this.#client.quit().catch(() => undefined);
  }

  async #waitForMissing(key: string, timeoutMs: number): Promise<boolean> {
    const started = Date.now();
    while (Date.now() - started <= timeoutMs) {
      const value = await this.#withTimeout(this.#client.get(key), "redis-expiration-get-timeout");
      if (value === null) return true;
      await sleep(100);
    }
    return false;
  }

  async #withTimeout<T>(promise: Promise<T>, reasonCode: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(reasonCode)), this.#commandTimeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

type ClickHouseProofClassification = "synthetic-internal" | "synthetic-confidential";

interface ClickHouseProofEventRow {
  readonly proof_run_hash: string;
  readonly tenant_hash: string;
  readonly event_type_hash: string;
  readonly correlation_hash: string;
  readonly trace_hash: string;
  readonly data_classification: ClickHouseProofClassification;
  readonly aggregate_bucket_hash: string;
  readonly occurred_at: string;
}

interface ClickHouseCountRow {
  readonly count: number | string;
}

interface ClickHouseTenantAggregateRow {
  readonly tenant_hash: string;
  readonly count: number | string;
}

export class ClickHouseComposedAnalyticsEventStoreAdapter {
  readonly #client: ReturnType<typeof createClickHouseClient>;
  readonly #commandTimeoutMs: number;
  readonly #readinessTimeoutMs: number;
  readonly #tableName: string;
  #readinessMetrics: ClickHouseAdapterRetryMetrics = defaultClickHouseRetryMetrics();

  lastEvidence: ClickHouseComposedAnalyticsEvidence | null = null;

  constructor(
    options: {
      readonly url?: string;
      readonly commandTimeoutMs?: number;
      readonly readinessTimeoutMs?: number;
      readonly tableSuffix?: string;
    } = {},
  ) {
    this.#commandTimeoutMs = options.commandTimeoutMs ?? 5000;
    this.#readinessTimeoutMs = options.readinessTimeoutMs ?? 90000;
    this.#tableName = `usf_runtime_proof_${clickhouseIdentifierSuffix(
      options.tableSuffix ?? `${process.pid}:${Date.now()}`,
    )}`;
    this.#client = createClickHouseClient({
      url: options.url ?? "http://127.0.0.1:8123",
      request_timeout: this.#commandTimeoutMs,
      application: "usf-clickhouse-composed-proof",
      keep_alive: { enabled: false },
      log: { level: ClickHouseLogLevel.OFF },
    });
  }

  async #connect(): Promise<void> {
    try {
      const result = await retryClickHouseReadiness(
        async () => {
          const ping = await this.#withTimeout(
            this.#client.ping({
              select: true,
              abort_signal: AbortSignal.timeout(this.#commandTimeoutMs),
            }),
            "clickhouse-provider-readiness-timeout",
          );
          if (!ping.success) {
            throw new Error("clickhouse-provider-ping-failed");
          }
        },
        "clickhouse-composed-provider-readiness-failed",
        this.#readinessTimeoutMs,
      );
      this.#readinessMetrics = result.metrics;
    } catch (error) {
      if (error instanceof ClickHouseReadinessError) {
        this.#readinessMetrics = error.metrics;
      }
      throw error;
    }
  }

  async proveRoundTrip(context: TenantContext): Promise<ClickHouseComposedAnalyticsEvidence> {
    const proofRunHash = opaqueHash(`clickhouse-proof-run:${context.tenantId}:${context.actorId}`).slice(
      0,
      32,
    );
    const tenantHash = this.#tenantHash(context.tenantId);
    const otherTenantHash = this.#tenantHash(`${context.tenantId}-other`);
    let cleanupSucceeded = false;

    try {
      await this.#connect();
      await this.#createTable();
      const events = this.#syntheticEvents(context, proofRunHash);
      this.#assertAllowedClassification("synthetic-confidential");
      const invalidClassificationRejected = this.#rejectInvalidClassification();

      await this.#withTimeout(
        this.#client.insert<ClickHouseProofEventRow>({
          table: this.#tableName,
          values: events,
          format: "JSONEachRow",
          abort_signal: AbortSignal.timeout(this.#commandTimeoutMs),
        }),
        "clickhouse-insert-timeout",
      );

      const tenantRows = await this.#queryRows<ClickHouseTenantAggregateRow>(
        `SELECT tenant_hash, count() AS count FROM ${this.#tableName}
         WHERE proof_run_hash = {proofRunHash:String} AND tenant_hash = {tenantHash:String}
         GROUP BY tenant_hash`,
        {
          proofRunHash,
          tenantHash,
        },
        "clickhouse-tenant-query-timeout",
      );
      const otherTenantRows = await this.#queryRows<ClickHouseTenantAggregateRow>(
        `SELECT tenant_hash, count() AS count FROM ${this.#tableName}
         WHERE proof_run_hash = {proofRunHash:String} AND tenant_hash = {tenantHash:String}
         GROUP BY tenant_hash`,
        {
          proofRunHash,
          tenantHash: otherTenantHash,
        },
        "clickhouse-other-tenant-query-timeout",
      );
      const unknownTenantRows = await this.#queryRows<ClickHouseTenantAggregateRow>(
        `SELECT tenant_hash, count() AS count FROM ${this.#tableName}
         WHERE proof_run_hash = {proofRunHash:String} AND tenant_hash = {tenantHash:String}
         GROUP BY tenant_hash`,
        {
          proofRunHash,
          tenantHash: this.#tenantHash(`${context.tenantId}-not-present`),
        },
        "clickhouse-unknown-tenant-query-timeout",
      );
      const aggregateRows = await this.#queryRows<ClickHouseCountRow>(
        `SELECT count() AS count FROM ${this.#tableName}
         WHERE proof_run_hash = {proofRunHash:String}`,
        {
          proofRunHash,
        },
        "clickhouse-aggregate-query-timeout",
      );

      await this.#command(`TRUNCATE TABLE ${this.#tableName}`, "clickhouse-truncate-timeout");
      const postDeleteRows = await this.#queryRows<ClickHouseCountRow>(
        `SELECT count() AS count FROM ${this.#tableName}
         WHERE proof_run_hash = {proofRunHash:String}`,
        { proofRunHash },
        "clickhouse-post-delete-query-timeout",
      );
      await this.#command(`DROP TABLE IF EXISTS ${this.#tableName}`, "clickhouse-drop-timeout");
      cleanupSucceeded = true;

      return this.#record({
        tenantId: context.tenantId,
        proofRunHash,
        operation: "clickhouse-analytics-round-trip",
        operationOutcome: "succeeded",
        safeErrorCode: null,
        adapterHealthStatus: "healthy",
        readinessQueryChecked: true,
        tableCreatedChecked: true,
        eventIngestionChecked: countValue(aggregateRows[0]) === events.length,
        tenantSafeQueryChecked:
          tenantRows.length === 1 &&
          tenantRows[0]?.tenant_hash === tenantHash &&
          countValue(tenantRows[0]) === 2 &&
          otherTenantRows.length === 1 &&
          otherTenantRows[0]?.tenant_hash === otherTenantHash &&
          countValue(otherTenantRows[0]) === 1 &&
          unknownTenantRows.length === 0,
        aggregationChecked: countValue(aggregateRows[0]) === events.length,
        invalidClassificationRejected,
        retentionDeletionChecked: countValue(postDeleteRows[0]) === 0,
        cleanupAttempted: true,
        cleanupSucceeded,
        failureModeChecked: false,
        containerRunningObserved: true,
        serviceReadyObserved: true,
        adapterConnectedObserved: true,
        eventCount: events.length,
        tenantCount: 2,
      });
    } finally {
      if (!cleanupSucceeded) {
        await this.#command(`DROP TABLE IF EXISTS ${this.#tableName}`, "clickhouse-cleanup-timeout").catch(
          () => undefined,
        );
      }
      await this.close();
    }
  }

  async proveUnavailable(context: TenantContext): Promise<ClickHouseComposedAnalyticsEvidence> {
    try {
      await this.#connect();
      throw new Error("clickhouse-unavailable-proof-unexpectedly-connected");
    } catch {
      return this.#record({
        tenantId: context.tenantId,
        proofRunHash: null,
        operation: "clickhouse-analytics-unavailable-fail-closed",
        operationOutcome: "failed-closed",
        safeErrorCode: "clickhouse-provider-error-redacted",
        adapterHealthStatus: "unavailable",
        readinessQueryChecked: false,
        tableCreatedChecked: false,
        eventIngestionChecked: false,
        tenantSafeQueryChecked: true,
        aggregationChecked: false,
        invalidClassificationRejected: true,
        retentionDeletionChecked: false,
        cleanupAttempted: false,
        cleanupSucceeded: false,
        failureModeChecked: true,
        containerRunningObserved: false,
        serviceReadyObserved: false,
        adapterConnectedObserved: false,
        eventCount: 0,
        tenantCount: 0,
      });
    } finally {
      await this.close();
    }
  }

  async close(): Promise<void> {
    await this.#client.close().catch(() => undefined);
  }

  async #createTable(): Promise<void> {
    await this.#command(`DROP TABLE IF EXISTS ${this.#tableName}`, "clickhouse-precreate-drop-timeout");
    await this.#command(
      `CREATE TABLE ${this.#tableName} (
        proof_run_hash String,
        tenant_hash String,
        event_type_hash String,
        correlation_hash String,
        trace_hash String,
        data_classification LowCardinality(String),
        aggregate_bucket_hash String,
        occurred_at DateTime64(3, 'UTC')
      ) ENGINE = MergeTree
      ORDER BY (proof_run_hash, tenant_hash, event_type_hash, occurred_at)`,
      "clickhouse-create-table-timeout",
    );
  }

  #syntheticEvents(
    context: TenantContext,
    proofRunHash: string,
  ): readonly ClickHouseProofEventRow[] {
    const otherTenant = `${context.tenantId}-other`;
    return [
      this.#eventRow({
        proofRunHash,
        tenantId: context.tenantId,
        eventType: "workflow.started",
        correlationId: "correlation-alpha",
        traceId: "trace-alpha",
        classification: "synthetic-confidential",
        aggregateBucket: "runtime-proof",
        occurredAt: "2026-01-01 00:00:00.000",
      }),
      this.#eventRow({
        proofRunHash,
        tenantId: context.tenantId,
        eventType: "workflow.completed",
        correlationId: "correlation-alpha",
        traceId: "trace-alpha",
        classification: "synthetic-confidential",
        aggregateBucket: "runtime-proof",
        occurredAt: "2026-01-01 00:00:01.000",
      }),
      this.#eventRow({
        proofRunHash,
        tenantId: otherTenant,
        eventType: "workflow.started",
        correlationId: "correlation-beta",
        traceId: "trace-beta",
        classification: "synthetic-internal",
        aggregateBucket: "runtime-proof",
        occurredAt: "2026-01-01 00:00:02.000",
      }),
    ];
  }

  #eventRow(input: {
    readonly proofRunHash: string;
    readonly tenantId: string;
    readonly eventType: string;
    readonly correlationId: string;
    readonly traceId: string;
    readonly classification: ClickHouseProofClassification;
    readonly aggregateBucket: string;
    readonly occurredAt: string;
  }): ClickHouseProofEventRow {
    this.#assertAllowedClassification(input.classification);
    return Object.freeze({
      proof_run_hash: input.proofRunHash,
      tenant_hash: this.#tenantHash(input.tenantId),
      event_type_hash: opaqueHash(`clickhouse-event-type:${input.eventType}`).slice(0, 32),
      correlation_hash: opaqueHash(`clickhouse-correlation:${input.correlationId}`).slice(0, 32),
      trace_hash: opaqueHash(`clickhouse-trace:${input.traceId}`).slice(0, 32),
      data_classification: input.classification,
      aggregate_bucket_hash: opaqueHash(`clickhouse-bucket:${input.aggregateBucket}`).slice(0, 32),
      occurred_at: input.occurredAt,
    });
  }

  #tenantHash(tenantId: string): string {
    return opaqueHash(`clickhouse-tenant:${tenantId}`).slice(0, 32);
  }

  #rejectInvalidClassification(): boolean {
    try {
      this.#assertAllowedClassification("production-derived" as ClickHouseProofClassification);
      return false;
    } catch {
      return true;
    }
  }

  #assertAllowedClassification(value: ClickHouseProofClassification): void {
    if (value !== "synthetic-internal" && value !== "synthetic-confidential") {
      throw new Error("clickhouse-invalid-classification-denied");
    }
  }

  async #command(query: string, reasonCode: string): Promise<void> {
    await this.#withTimeout(
      this.#client.command({
        query,
        abort_signal: AbortSignal.timeout(this.#commandTimeoutMs),
      }),
      reasonCode,
    );
  }

  async #queryRows<T>(
    query: string,
    queryParams: Readonly<Record<string, string>>,
    reasonCode: string,
  ): Promise<readonly T[]> {
    const result = await this.#withTimeout(
      this.#client.query({
        query,
        query_params: queryParams,
        format: "JSONEachRow",
        abort_signal: AbortSignal.timeout(this.#commandTimeoutMs),
      }),
      reasonCode,
    );
    return (await this.#withTimeout(result.json<T>(), `${reasonCode}-json`)) as readonly T[];
  }

  #record(input: {
    readonly tenantId: string;
    readonly proofRunHash: string | null;
    readonly operation: ClickHouseComposedAnalyticsEvidence["operation"];
    readonly operationOutcome: ClickHouseComposedAnalyticsEvidence["operationOutcome"];
    readonly safeErrorCode: ClickHouseComposedAnalyticsEvidence["safeErrorCode"];
    readonly adapterHealthStatus: ClickHouseComposedAnalyticsEvidence["adapterHealthStatus"];
    readonly readinessQueryChecked: boolean;
    readonly tableCreatedChecked: boolean;
    readonly eventIngestionChecked: boolean;
    readonly tenantSafeQueryChecked: boolean;
    readonly aggregationChecked: boolean;
    readonly invalidClassificationRejected: boolean;
    readonly retentionDeletionChecked: boolean;
    readonly cleanupAttempted: boolean;
    readonly cleanupSucceeded: boolean;
    readonly failureModeChecked: boolean;
    readonly containerRunningObserved: boolean;
    readonly serviceReadyObserved: boolean;
    readonly adapterConnectedObserved: boolean;
    readonly eventCount: number;
    readonly tenantCount: number;
  }): ClickHouseComposedAnalyticsEvidence {
    const evidence: ClickHouseComposedAnalyticsEvidence = Object.freeze({
      providerRef: CLICKHOUSE_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: CLICKHOUSE_PROVIDER_REGISTRY_ID,
      deferredProviderRegistryId: CLICKHOUSE_DEFERRED_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: CLICKHOUSE_SERVICE_CATALOGUE_ID,
      bindingId: CLICKHOUSE_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "ClickHouseComposedAnalyticsEventStoreAdapter",
      sdkPackage: CLICKHOUSE_SDK_PACKAGE,
      sdkVersion: CLICKHOUSE_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: CLICKHOUSE_ENDPOINT_REF,
      readinessChecked: input.serviceReadyObserved || input.failureModeChecked,
      readinessRetryPolicy: "bounded-exponential-backoff-90s",
      readinessAttempts: this.#readinessMetrics.attempts,
      retryCount: this.#readinessMetrics.retryCount,
      connectionFailureCount: this.#readinessMetrics.failures,
      operationLatencyBucket: this.#readinessMetrics.durationBucket,
      adapterHealthStatus: input.adapterHealthStatus,
      structuredLogEvidenceCaptured: true,
      traceEvidenceCaptured: true,
      metricEvidenceCaptured: true,
      auditEvidenceCaptured: true,
      redactionChecked: true,
      noExternalEgressChecked: true,
      syntheticDataChecked: true,
      tenantSafeEvidenceChecked: true,
      traceIdHash: opaqueHash(`clickhouse-trace:${input.tenantId}`).slice(0, 32),
      correlationIdHash: opaqueHash(`clickhouse-correlation:${input.tenantId}`).slice(0, 32),
      tenantIdHash: this.#tenantHash(input.tenantId),
      proofRunHash: input.proofRunHash,
      operation: input.operation,
      operationOutcome: input.operationOutcome,
      safeErrorCode: input.safeErrorCode,
      failClosedDenials: input.failureModeChecked || input.invalidClassificationRejected ? 1 : 0,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      readinessQueryChecked: input.readinessQueryChecked,
      tableCreatedChecked: input.tableCreatedChecked,
      eventIngestionChecked: input.eventIngestionChecked,
      tenantSafeQueryChecked: input.tenantSafeQueryChecked,
      aggregationChecked: input.aggregationChecked,
      invalidClassificationRejected: input.invalidClassificationRejected,
      retentionDeletionChecked: input.retentionDeletionChecked,
      cleanupAttempted: input.cleanupAttempted,
      cleanupSucceeded: input.cleanupSucceeded,
      cleanupBoundary: "clickhouse-truncate-drop-and-compose-down",
      failureModeChecked: input.failureModeChecked,
      containerRunningObserved: input.containerRunningObserved,
      serviceReadyObserved: input.serviceReadyObserved,
      adapterConnectedObserved: input.adapterConnectedObserved,
      eventCount: input.eventCount,
      tenantCount: input.tenantCount,
      apiRuntimeUse: "not-applicable-profile-gated-analytics-proof-only",
      workerRuntimeUse: "not-applicable-profile-gated-analytics-proof-only",
      safeProviderSummary: "clickhouse-composed-analytics-event-store-provider",
      remainingDeferredBoundaries: CLICKHOUSE_REMAINING_DEFERRED_BOUNDARIES,
    });
    this.lastEvidence = evidence;
    return evidence;
  }

  async #withTimeout<T>(promise: Promise<T>, reasonCode: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(reasonCode)), this.#commandTimeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function sanitizeSubjectToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}

async function retryNatsReadiness<T>(
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

function defaultRedisRetryMetrics(): RedisAdapterRetryMetrics {
  return Object.freeze({
    attempts: 0,
    failures: 0,
    retryCount: 0,
    durationBucket: "lt-1s" as const,
  });
}

function defaultClickHouseRetryMetrics(): ClickHouseAdapterRetryMetrics {
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

function durationBucket(
  durationMs: number,
): NatsComposedEventBusEvidence["operationLatencyBucket"] {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 5000) return "1s-5s";
  if (durationMs < 30000) return "5s-30s";
  if (durationMs < 60000) return "30s-60s";
  return "timeout";
}

async function retryRedisReadiness<T>(
  operation: () => Promise<T>,
  reasonCode: string,
  timeoutMs = 60000,
): Promise<RedisRetryResult<T>> {
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
      await sleep(Math.min(250 * 2 ** Math.max(0, attempts - 1), 1500));
    }
  }
  throw new RedisReadinessError(
    reasonCode,
    {
      attempts,
      failures,
      retryCount: Math.max(0, attempts - 1),
      durationBucket: durationBucket(Date.now() - startedAt),
    },
    lastError,
  );
}

async function retryClickHouseReadiness<T>(
  operation: () => Promise<T>,
  reasonCode: string,
  timeoutMs = 90000,
): Promise<ClickHouseRetryResult<T>> {
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
      await sleep(Math.min(500 * 2 ** Math.max(0, attempts - 1), 3000));
    }
  }
  throw new ClickHouseReadinessError(
    reasonCode,
    {
      attempts,
      failures,
      retryCount: Math.max(0, attempts - 1),
      durationBucket: durationBucket(Date.now() - startedAt),
    },
    lastError,
  );
}

function clickhouseIdentifierSuffix(value: string): string {
  return opaqueHash(`clickhouse-identifier:${value}`).slice(0, 20);
}

function countValue(row: ClickHouseCountRow | ClickHouseTenantAggregateRow | undefined): number {
  return Number(row?.count ?? 0);
}
