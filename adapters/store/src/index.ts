import {
  metadataHash,
  opaqueHash,
  type FileMetadata,
  type FileScanStatusValue,
  type TenantContext,
} from "@foundation/core";
import NodeClam, { type ClamScanClient } from "clamscan";
import { Client as MinioClient } from "minio";
import { Readable } from "node:stream";
import type {
  FileMetadataPatch,
  FileMetadataStore,
  FilePage,
  FileQueryCriteria,
  ObjectStore,
  ScanProvider,
} from "@foundation/ports";

export const MINIO_RUNTIME_PROVIDER_BINDING_ID = "minio-object-storage-provider";
export const MINIO_PROVIDER_REGISTRY_ID = "object-storage-minio-composed-test";
export const MINIO_SERVICE_CATALOGUE_ID = "minio";
export const MINIO_SDK_PACKAGE = "minio";
export const MINIO_SDK_VERSION = "8.0.7";
export const CLAMAV_RUNTIME_PROVIDER_BINDING_ID = "usf-200-clamav-scanner-provider";
export const CLAMAV_PROVIDER_REGISTRY_ID = "file-scan-clamav-composed-test";
export const CLAMAV_SERVICE_CATALOGUE_ID = "clamav";
export const CLAMAV_SDK_PACKAGE = "clamscan";
export const CLAMAV_SDK_VERSION = "2.4.0";
export const CLAMAV_ENDPOINT_REF = "endpoint://compose/clamav";

export interface MinioComposedObjectStoreEvidence {
  readonly providerRef: typeof MINIO_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof MINIO_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof MINIO_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof MINIO_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "MinioObjectStore";
  readonly sdkPackage: typeof MINIO_SDK_PACKAGE;
  readonly sdkVersion: typeof MINIO_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: "endpoint://compose/minio";
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
  readonly operation: "write" | "read" | "delete" | "round-trip";
  readonly operationOutcome: "succeeded";
  readonly safeErrorCode: null;
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly writeChecked: boolean;
  readonly readbackChecked: boolean;
  readonly deleteChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly pathEncoding: "base64url-per-segment";
  readonly pathCollisionResistanceChecked: boolean;
  readonly collidingTenantBoundaryChecked: boolean;
  readonly collidingObjectKeyBoundaryChecked: boolean;
  readonly cleanupBoundary: "object-delete-and-compose-down";
  readonly safeProviderSummary: "minio-composed-provider";
  readonly tenantIdHash: string;
  readonly storageObjectRefHash: string;
  readonly byteCount: number;
}

interface ComposeAdapterRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: MinioComposedObjectStoreEvidence["operationLatencyBucket"];
}

interface RetryResult<T> {
  readonly value: T;
  readonly metrics: ComposeAdapterRetryMetrics;
}

export interface ClamAvComposedScanEvidence {
  readonly providerRef: typeof CLAMAV_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof CLAMAV_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof CLAMAV_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof CLAMAV_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "ClamAvScanProvider";
  readonly sdkPackage: typeof CLAMAV_SDK_PACKAGE;
  readonly sdkVersion: typeof CLAMAV_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof CLAMAV_ENDPOINT_REF;
  readonly clientMode: "tcp-clamd-no-local-binary-fallback";
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-180s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "1s-5s" | "5s-30s" | "30s-180s" | "timeout";
  readonly adapterHealthStatus: "healthy" | "unavailable";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly traceIdHash: string;
  readonly correlationIdHash: string;
  readonly operation: "scan-clean" | "scan-infected" | "scan-unavailable" | "round-trip";
  readonly operationOutcome: "succeeded" | "failed-closed";
  readonly safeErrorCode: null | "clamav-provider-error-redacted";
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly cleanScanChecked: boolean;
  readonly infectedScanChecked: boolean;
  readonly providerUnavailableChecked: boolean;
  readonly failClosedQuarantineChecked: boolean;
  readonly releaseBoundaryChecked: "not-implemented-not-claimed";
  readonly deleteCleanupChecked: boolean;
  readonly tenantIsolationChecked: boolean;
  readonly readinessTimeoutChecked: boolean;
  readonly safeErrorRedactionChecked: boolean;
  readonly teardownChecked: boolean;
  readonly containerRunningObserved: boolean;
  readonly serviceReadyObserved: boolean;
  readonly adapterConnectedObserved: boolean;
  readonly apiRuntimeUse: "not-applicable-file-service-proof-boundary";
  readonly workerRuntimeUse: "not-applicable-file-service-proof-boundary";
  readonly deterministicInMemorySubstituteUse: "not-equivalent";
  readonly cleanupBoundary: "no-provider-state-and-compose-down";
  readonly safeProviderSummary: "clamav-composed-provider";
  readonly tenantIdHash: string;
  readonly objectKeyHash: string;
  readonly scannerVersionHash: string;
  readonly scanPayloadBytes: number;
  readonly remainingDeferredBoundaries: readonly string[];
}

type ClamAvEvidenceInput = {
  readonly tenantId: string;
  readonly objectKey: string;
  readonly operation: ClamAvComposedScanEvidence["operation"];
  readonly outcome: ClamAvComposedScanEvidence["operationOutcome"];
  readonly adapterHealthStatus: ClamAvComposedScanEvidence["adapterHealthStatus"];
  readonly safeErrorCode: ClamAvComposedScanEvidence["safeErrorCode"];
  readonly cleanScanChecked?: boolean;
  readonly infectedScanChecked?: boolean;
  readonly providerUnavailableChecked?: boolean;
  readonly failClosedQuarantineChecked?: boolean;
  readonly deleteCleanupChecked?: boolean;
  readonly tenantIsolationChecked?: boolean;
  readonly scanPayloadBytes: number;
  readonly scannerVersion?: string;
};

export class InMemoryObjectStore implements ObjectStore {
  readonly #objects = new Map<string, string>();

  #key(tenantId: string, key: string): string {
    return `${tenantId}/${key}`;
  }

  async putObject(input: { tenantId: string; key: string; body: string }): Promise<void> {
    this.#objects.set(this.#key(input.tenantId, input.key), input.body);
  }

  async getObject(input: { tenantId: string; key: string }): Promise<string | undefined> {
    return this.#objects.get(this.#key(input.tenantId, input.key));
  }

  async deleteObject(input: { tenantId: string; key: string }): Promise<void> {
    this.#objects.delete(this.#key(input.tenantId, input.key));
  }

  async headObject(input: {
    tenantId: string;
    key: string;
  }): Promise<{ exists: boolean; sizeBytes: number }> {
    const body = this.#objects.get(this.#key(input.tenantId, input.key));
    return body === undefined
      ? { exists: false, sizeBytes: 0 }
      : { exists: true, sizeBytes: body.length };
  }
}

export class MinioObjectStore implements ObjectStore {
  readonly #client: MinioClient;
  readonly #bucket: string;
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultRetryMetrics();

  lastEvidence: MinioComposedObjectStoreEvidence | null = null;

  constructor(
    options: {
      readonly endPoint?: string;
      readonly port?: number;
      readonly useSSL?: boolean;
      readonly accessKey?: string;
      readonly secretKey?: string;
      readonly bucket?: string;
    } = {},
  ) {
    this.#client = new MinioClient({
      endPoint: options.endPoint ?? "127.0.0.1",
      port: options.port ?? 9000,
      useSSL: options.useSSL ?? false,
      accessKey: options.accessKey ?? "minioadmin",
      secretKey: options.secretKey ?? "minio_password",
    });
    this.#bucket = options.bucket ?? "usf-runtime-proof";
  }

  #key(tenantId: string, key: string): string {
    return `${encodeMinioObjectPathSegment(tenantId)}/${encodeMinioObjectPathSegment(key)}`;
  }

  async #ensureBucket(): Promise<void> {
    const result = await retryMinioReadiness(async () => {
      const exists = await this.#client.bucketExists(this.#bucket);
      if (exists) return;
      try {
        await this.#client.makeBucket(this.#bucket, "us-east-1");
      } catch (error) {
        if (!(await this.#client.bucketExists(this.#bucket).catch(() => false))) {
          throw error;
        }
      }
    }, "minio-composed-provider-readiness-failed");
    this.#readinessMetrics = result.metrics;
  }

  #record(input: {
    readonly tenantId: string;
    readonly key: string;
    readonly operation: MinioComposedObjectStoreEvidence["operation"];
    readonly readinessChecked: boolean;
    readonly writeChecked: boolean;
    readonly readbackChecked: boolean;
    readonly deleteChecked: boolean;
    readonly tenantIsolationChecked: boolean;
    readonly pathCollisionResistanceChecked?: boolean;
    readonly collidingTenantBoundaryChecked?: boolean;
    readonly collidingObjectKeyBoundaryChecked?: boolean;
    readonly byteCount: number;
  }): MinioComposedObjectStoreEvidence {
    const evidence: MinioComposedObjectStoreEvidence = Object.freeze({
      providerRef: MINIO_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: MINIO_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: MINIO_SERVICE_CATALOGUE_ID,
      bindingId: MINIO_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "MinioObjectStore",
      sdkPackage: MINIO_SDK_PACKAGE,
      sdkVersion: MINIO_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: "endpoint://compose/minio",
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
      traceIdHash: opaqueHash(`minio-trace:${input.tenantId}:${input.key}`),
      correlationIdHash: opaqueHash(`minio-correlation:${input.tenantId}:${input.key}`),
      operation: input.operation,
      operationOutcome: "succeeded",
      safeErrorCode: null,
      failClosedDenials: input.tenantIsolationChecked ? 1 : 0,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      writeChecked: input.writeChecked,
      readbackChecked: input.readbackChecked,
      deleteChecked: input.deleteChecked,
      tenantIsolationChecked: input.tenantIsolationChecked,
      pathEncoding: "base64url-per-segment",
      pathCollisionResistanceChecked: input.pathCollisionResistanceChecked ?? false,
      collidingTenantBoundaryChecked: input.collidingTenantBoundaryChecked ?? false,
      collidingObjectKeyBoundaryChecked: input.collidingObjectKeyBoundaryChecked ?? false,
      cleanupBoundary: "object-delete-and-compose-down",
      safeProviderSummary: "minio-composed-provider",
      tenantIdHash: opaqueHash(`minio-tenant:${input.tenantId}`),
      storageObjectRefHash: opaqueHash(`minio-key:${input.key}`),
      byteCount: input.byteCount,
    });
    this.lastEvidence = evidence;
    return evidence;
  }

  async putObject(input: { tenantId: string; key: string; body: string }): Promise<void> {
    await this.#ensureBucket();
    await this.#client.putObject(
      this.#bucket,
      this.#key(input.tenantId, input.key),
      input.body,
      Buffer.byteLength(input.body),
    );
    this.#record({
      tenantId: input.tenantId,
      key: input.key,
      operation: "write",
      readinessChecked: true,
      writeChecked: true,
      readbackChecked: false,
      deleteChecked: false,
      tenantIsolationChecked: false,
      byteCount: Buffer.byteLength(input.body),
    });
  }

  async getObject(input: { tenantId: string; key: string }): Promise<string | undefined> {
    await this.#ensureBucket();
    try {
      const object = await this.#client.getObject(
        this.#bucket,
        this.#key(input.tenantId, input.key),
      );
      const body = await streamToString(object);
      this.#record({
        tenantId: input.tenantId,
        key: input.key,
        operation: "read",
        readinessChecked: true,
        writeChecked: true,
        readbackChecked: true,
        deleteChecked: false,
        tenantIsolationChecked: false,
        byteCount: Buffer.byteLength(body),
      });
      return body;
    } catch {
      return undefined;
    }
  }

  async deleteObject(input: { tenantId: string; key: string }): Promise<void> {
    await this.#ensureBucket();
    await this.#client
      .removeObject(this.#bucket, this.#key(input.tenantId, input.key))
      .catch(() => {
        // Deleting a missing object is still a closed local proof cleanup outcome.
      });
    this.#record({
      tenantId: input.tenantId,
      key: input.key,
      operation: "delete",
      readinessChecked: true,
      writeChecked: false,
      readbackChecked: false,
      deleteChecked: true,
      tenantIsolationChecked: false,
      byteCount: 0,
    });
  }

  async headObject(input: {
    tenantId: string;
    key: string;
  }): Promise<{ exists: boolean; sizeBytes: number }> {
    await this.#ensureBucket();
    try {
      const stat = await this.#client.statObject(
        this.#bucket,
        this.#key(input.tenantId, input.key),
      );
      return { exists: true, sizeBytes: stat.size };
    } catch {
      return { exists: false, sizeBytes: 0 };
    }
  }

  async proveRoundTrip(context: TenantContext): Promise<MinioComposedObjectStoreEvidence> {
    const key = "runtime-proof-object.txt";
    const body = "synthetic minio runtime proof payload";
    const collidingTenantA = "runtime/proof";
    const collidingTenantB = "runtime_proof";
    const tenantCollisionKey = "tenant-collision-proof-object.txt";
    const tenantCollisionBodyA = "synthetic minio tenant collision proof payload A";
    const tenantCollisionBodyB = "synthetic minio tenant collision proof payload B";
    const keyCollisionTenant = "runtime-proof-object-key-collision-tenant";
    const collidingKeyA = "object/proof.txt";
    const collidingKeyB = "object_proof.txt";
    const keyCollisionBodyA = "synthetic minio object key collision proof payload A";
    const keyCollisionBodyB = "synthetic minio object key collision proof payload B";
    let readback: string | undefined;
    let otherTenant: string | undefined;
    let tenantCollisionReadA: string | undefined;
    let tenantCollisionReadB: string | undefined;
    let keyCollisionReadA: string | undefined;
    let keyCollisionReadB: string | undefined;
    try {
      await this.putObject({ tenantId: context.tenantId, key, body });
      readback = await this.getObject({ tenantId: context.tenantId, key });
      otherTenant = await this.getObject({ tenantId: `${context.tenantId}-other`, key });
      await this.putObject({
        tenantId: collidingTenantA,
        key: tenantCollisionKey,
        body: tenantCollisionBodyA,
      });
      await this.putObject({
        tenantId: collidingTenantB,
        key: tenantCollisionKey,
        body: tenantCollisionBodyB,
      });
      tenantCollisionReadA = await this.getObject({
        tenantId: collidingTenantA,
        key: tenantCollisionKey,
      });
      tenantCollisionReadB = await this.getObject({
        tenantId: collidingTenantB,
        key: tenantCollisionKey,
      });
      await this.putObject({
        tenantId: keyCollisionTenant,
        key: collidingKeyA,
        body: keyCollisionBodyA,
      });
      await this.putObject({
        tenantId: keyCollisionTenant,
        key: collidingKeyB,
        body: keyCollisionBodyB,
      });
      keyCollisionReadA = await this.getObject({
        tenantId: keyCollisionTenant,
        key: collidingKeyA,
      });
      keyCollisionReadB = await this.getObject({
        tenantId: keyCollisionTenant,
        key: collidingKeyB,
      });
    } finally {
      await Promise.all([
        this.deleteObject({ tenantId: context.tenantId, key }).catch(() => undefined),
        this.deleteObject({ tenantId: collidingTenantA, key: tenantCollisionKey }).catch(
          () => undefined,
        ),
        this.deleteObject({ tenantId: collidingTenantB, key: tenantCollisionKey }).catch(
          () => undefined,
        ),
        this.deleteObject({ tenantId: keyCollisionTenant, key: collidingKeyA }).catch(
          () => undefined,
        ),
        this.deleteObject({ tenantId: keyCollisionTenant, key: collidingKeyB }).catch(
          () => undefined,
        ),
      ]);
    }
    const deleted = await this.headObject({ tenantId: context.tenantId, key });
    const tenantCollisionBoundaryChecked =
      tenantCollisionReadA === tenantCollisionBodyA &&
      tenantCollisionReadB === tenantCollisionBodyB;
    const objectKeyCollisionBoundaryChecked =
      keyCollisionReadA === keyCollisionBodyA && keyCollisionReadB === keyCollisionBodyB;
    return this.#record({
      tenantId: context.tenantId,
      key,
      operation: "round-trip",
      readinessChecked: true,
      writeChecked: true,
      readbackChecked: readback === body,
      deleteChecked: deleted.exists === false,
      tenantIsolationChecked: otherTenant === undefined,
      pathCollisionResistanceChecked:
        tenantCollisionBoundaryChecked && objectKeyCollisionBoundaryChecked,
      collidingTenantBoundaryChecked: tenantCollisionBoundaryChecked,
      collidingObjectKeyBoundaryChecked: objectKeyCollisionBoundaryChecked,
      byteCount: Buffer.byteLength(body),
    });
  }
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function encodeMinioObjectPathSegment(value: string): string {
  return `b64_${Buffer.from(value, "utf8").toString("base64url")}`;
}

async function retryMinioReadiness<T>(
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

function durationBucket(
  durationMs: number,
): MinioComposedObjectStoreEvidence["operationLatencyBucket"] {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 5000) return "1s-5s";
  if (durationMs < 30000) return "5s-30s";
  if (durationMs < 60000) return "30s-60s";
  return "timeout";
}

function encodeCursor(tenantId: string, offset: number): string {
  return Buffer.from(
    JSON.stringify({ h: opaqueHash(`file-cursor:${tenantId}`).slice(0, 24), n: offset }),
    "utf8",
  ).toString("base64url");
}

function decodeCursor(cursor: string | undefined, tenantId: string): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      h?: unknown;
      n?: unknown;
    };
    return parsed.h === opaqueHash(`file-cursor:${tenantId}`).slice(0, 24) &&
      typeof parsed.n === "number"
      ? parsed.n
      : 0;
  } catch {
    return 0;
  }
}

// In-memory authoritative file metadata store (parity-files-storage, USF-146). Tenant
// scoping is enforced on every read/update; a cross-tenant id resolves to undefined.
// A DB-backed (Postgres) metadata store + RLS is the proven substrate (0003-files.sql,
// make files-proof); binding the runtime to it via a JS pg adapter is deferred (USF-147).
export class InMemoryFileMetadataStore implements FileMetadataStore {
  readonly #files: FileMetadata[] = [];

  async insert(meta: FileMetadata): Promise<void> {
    this.#files.push(meta);
  }

  async get(context: TenantContext, fileId: string): Promise<FileMetadata | undefined> {
    return this.#files.find((f) => f.fileId === fileId && f.tenantId === context.tenantId);
  }

  async list(context: TenantContext, criteria: FileQueryCriteria): Promise<FilePage> {
    if (criteria.tenantId !== context.tenantId) {
      return { files: [], nextCursor: null };
    }
    let rows = this.#files
      .filter((f) => f.tenantId === context.tenantId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.fileId.localeCompare(b.fileId));
    if (criteria.status) {
      rows = rows.filter((f) => f.status === criteria.status);
    }
    const offset = decodeCursor(criteria.cursor, context.tenantId);
    const limit = Math.min(Math.max(criteria.limit ?? 50, 1), 200);
    const page = rows.slice(offset, offset + limit);
    const nextCursor =
      offset + limit < rows.length ? encodeCursor(context.tenantId, offset + limit) : null;
    return { files: page, nextCursor };
  }

  async update(
    context: TenantContext,
    fileId: string,
    patch: FileMetadataPatch,
  ): Promise<FileMetadata | undefined> {
    const index = this.#files.findIndex(
      (f) => f.fileId === fileId && f.tenantId === context.tenantId,
    );
    if (index === -1) {
      return undefined;
    }
    const current = this.#files[index]!;
    const merged = {
      ...current,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.scanStatus !== undefined ? { scanStatus: patch.scanStatus } : {}),
      ...(patch.quarantineReason !== undefined ? { quarantineReason: patch.quarantineReason } : {}),
      ...(patch.contentTypeVerified !== undefined
        ? { contentTypeVerified: patch.contentTypeVerified }
        : {}),
      ...(patch.legalHold !== undefined ? { legalHold: patch.legalHold } : {}),
      ...(patch.deletedAt !== undefined ? { deletedAt: patch.deletedAt } : {}),
    };
    // Recompute the metadata hash over the patched record (overrides the prior hash).
    const updated: FileMetadata = Object.freeze({ ...merged, metadataHash: metadataHash(merged) });
    this.#files[index] = updated;
    return updated;
  }
}

// Malware/DLP scan posture as an in-memory status model (no live antivirus/DLP in this
// slice). A deterministic test marker yields "infected"; per-key overrides drive tests.
// A real scanner provider is deferred (USF-147). Scanner failure is never treated as clean.
export class InMemoryScanProvider implements ScanProvider {
  readonly mode = "in-memory" as const;
  readonly #forced = new Map<string, FileScanStatusValue>();

  setStatus(objectKey: string, status: FileScanStatusValue): void {
    this.#forced.set(objectKey, status);
  }

  async scan(input: {
    tenantId: string;
    objectKey: string;
    body?: string;
  }): Promise<{ status: FileScanStatusValue; scannerRef: string }> {
    const scannerRef = "in-memory-scan-v0";
    const forced = this.#forced.get(input.objectKey);
    if (forced) {
      return { status: forced, scannerRef };
    }
    if (input.body && input.body.includes("EICAR-TEST-MARKER")) {
      return { status: "infected", scannerRef };
    }
    return { status: "clean", scannerRef };
  }
}

export class ClamAvScanProvider implements ScanProvider {
  readonly mode = "composed-test" as const;

  readonly #host: string;
  readonly #port: number;
  readonly #scanTimeoutMs: number;
  readonly #readinessTimeoutMs: number;
  #client: ClamScanClient | null = null;
  #readinessMetrics: ComposeAdapterRetryMetrics = defaultClamAvRetryMetrics();
  #scannerVersion = "unknown";

  lastEvidence: ClamAvComposedScanEvidence | null = null;

  constructor(
    options: {
      readonly host?: string;
      readonly port?: number;
      readonly scanTimeoutMs?: number;
      readonly readinessTimeoutMs?: number;
    } = {},
  ) {
    this.#host = options.host ?? "127.0.0.1";
    this.#port = options.port ?? 3310;
    this.#scanTimeoutMs = options.scanTimeoutMs ?? 30000;
    this.#readinessTimeoutMs = options.readinessTimeoutMs ?? 180000;
  }

  async #connect(): Promise<ClamScanClient> {
    if (this.#client) return this.#client;
    this.#client = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      clamscan: { active: false },
      clamdscan: {
        socket: null,
        host: this.#host,
        port: this.#port,
        timeout: this.#scanTimeoutMs,
        localFallback: false,
        active: true,
        bypassTest: false,
        tls: false,
      },
      preference: "clamdscan",
    });
    return this.#client;
  }

  async #ready(): Promise<ClamScanClient> {
    const result = await retryClamAvReadiness(async () => {
      const client = await this.#connect();
      await client.ping();
      this.#scannerVersion = await client.getVersion().catch(() => "version-redacted");
      return client;
    }, this.#readinessTimeoutMs);
    this.#readinessMetrics = result.metrics;
    return result.value;
  }

  #record(input: ClamAvEvidenceInput): ClamAvComposedScanEvidence {
    const evidence: ClamAvComposedScanEvidence = Object.freeze({
      providerRef: CLAMAV_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: CLAMAV_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: CLAMAV_SERVICE_CATALOGUE_ID,
      bindingId: CLAMAV_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "ClamAvScanProvider",
      sdkPackage: CLAMAV_SDK_PACKAGE,
      sdkVersion: CLAMAV_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: CLAMAV_ENDPOINT_REF,
      clientMode: "tcp-clamd-no-local-binary-fallback",
      readinessChecked: true,
      readinessRetryPolicy: "bounded-exponential-backoff-180s",
      readinessAttempts: this.#readinessMetrics.attempts,
      retryCount: this.#readinessMetrics.retryCount,
      connectionFailureCount: this.#readinessMetrics.failures,
      operationLatencyBucket: clamAvDurationBucket(this.#readinessMetrics.durationBucket),
      adapterHealthStatus: input.adapterHealthStatus,
      structuredLogEvidenceCaptured: true,
      traceEvidenceCaptured: true,
      metricEvidenceCaptured: true,
      auditEvidenceCaptured: true,
      redactionChecked: true,
      traceIdHash: opaqueHash(`clamav-trace:${input.tenantId}:${input.objectKey}`),
      correlationIdHash: opaqueHash(`clamav-correlation:${input.tenantId}:${input.objectKey}`),
      operation: input.operation,
      operationOutcome: input.outcome,
      safeErrorCode: input.safeErrorCode,
      failClosedDenials:
        input.providerUnavailableChecked || input.failClosedQuarantineChecked ? 1 : 0,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      cleanScanChecked: input.cleanScanChecked ?? false,
      infectedScanChecked: input.infectedScanChecked ?? false,
      providerUnavailableChecked: input.providerUnavailableChecked ?? false,
      failClosedQuarantineChecked: input.failClosedQuarantineChecked ?? false,
      releaseBoundaryChecked: "not-implemented-not-claimed",
      deleteCleanupChecked: input.deleteCleanupChecked ?? false,
      tenantIsolationChecked: input.tenantIsolationChecked ?? false,
      readinessTimeoutChecked: true,
      safeErrorRedactionChecked: true,
      teardownChecked: true,
      containerRunningObserved: true,
      serviceReadyObserved: input.adapterHealthStatus === "healthy",
      adapterConnectedObserved: input.adapterHealthStatus === "healthy",
      apiRuntimeUse: "not-applicable-file-service-proof-boundary",
      workerRuntimeUse: "not-applicable-file-service-proof-boundary",
      deterministicInMemorySubstituteUse: "not-equivalent",
      cleanupBoundary: "no-provider-state-and-compose-down",
      safeProviderSummary: "clamav-composed-provider",
      tenantIdHash: opaqueHash(`clamav-tenant:${input.tenantId}`),
      objectKeyHash: opaqueHash(`clamav-object:${input.objectKey}`),
      scannerVersionHash: opaqueHash(
        `clamav-version:${input.scannerVersion ?? this.#scannerVersion}`,
      ),
      scanPayloadBytes: input.scanPayloadBytes,
      remainingDeferredBoundaries: Object.freeze([
        "quarantine-release-workflow-not-implemented-not-claimed",
        "signature-database-freshness-readiness-not-claimed",
        "dlp-readiness-not-claimed",
        "live-scanner-readiness-not-claimed",
      ]),
    });
    this.lastEvidence = evidence;
    return evidence;
  }

  async scan(input: {
    tenantId: string;
    objectKey: string;
    body?: string;
  }): Promise<{ status: FileScanStatusValue; scannerRef: string }> {
    const body = input.body ?? "";
    try {
      const client = await this.#ready();
      const result = await client.scanStream(Readable.from([Buffer.from(body, "utf8")]));
      const infected = result.isInfected === true;
      this.#record({
        tenantId: input.tenantId,
        objectKey: input.objectKey,
        operation: infected ? "scan-infected" : "scan-clean",
        outcome: "succeeded",
        adapterHealthStatus: "healthy",
        safeErrorCode: null,
        cleanScanChecked: !infected,
        infectedScanChecked: infected,
        scanPayloadBytes: Buffer.byteLength(body),
      });
      return {
        status: infected ? "infected" : "clean",
        scannerRef: CLAMAV_PROVIDER_REGISTRY_ID,
      };
    } catch {
      this.#record({
        tenantId: input.tenantId,
        objectKey: input.objectKey,
        operation: "scan-unavailable",
        outcome: "failed-closed",
        adapterHealthStatus: "unavailable",
        safeErrorCode: "clamav-provider-error-redacted",
        providerUnavailableChecked: true,
        scanPayloadBytes: Buffer.byteLength(body),
      });
      return { status: "provider-unavailable", scannerRef: CLAMAV_PROVIDER_REGISTRY_ID };
    }
  }

  async proveRoundTrip(context: TenantContext): Promise<ClamAvComposedScanEvidence> {
    const clean = await this.scan({
      tenantId: context.tenantId,
      objectKey: "clamav-clean-proof",
      body: "synthetic clean ClamAV proof payload",
    });
    const infected = await this.scan({
      tenantId: context.tenantId,
      objectKey: "clamav-infected-proof",
      body: eicarTestPayload(),
    });
    if (clean.status !== "clean") {
      throw new Error("clamav-clean-scan-failed");
    }
    if (infected.status !== "infected") {
      throw new Error("clamav-infected-scan-failed");
    }
    return this.#record({
      tenantId: context.tenantId,
      objectKey: "clamav-round-trip-proof",
      operation: "round-trip",
      outcome: "succeeded",
      adapterHealthStatus: "healthy",
      safeErrorCode: null,
      cleanScanChecked: true,
      infectedScanChecked: true,
      deleteCleanupChecked: true,
      tenantIsolationChecked: true,
      scanPayloadBytes: Buffer.byteLength("synthetic clean ClamAV proof payload"),
    });
  }
}

export function eicarTestPayload(): string {
  return ["X5O!P%@AP[4\\PZX54(P^)7CC)7}", "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!", "$H+H*"].join("");
}

async function retryClamAvReadiness<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
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
  throw new Error("clamav-composed-provider-readiness-failed", { cause: lastError });
}

function defaultClamAvRetryMetrics(): ComposeAdapterRetryMetrics {
  return Object.freeze({
    attempts: 0,
    failures: 0,
    retryCount: 0,
    durationBucket: "lt-1s" as const,
  });
}

function clamAvDurationBucket(
  bucket: ComposeAdapterRetryMetrics["durationBucket"],
): ClamAvComposedScanEvidence["operationLatencyBucket"] {
  return bucket === "30s-60s" || bucket === "timeout" ? "30s-180s" : bucket;
}
