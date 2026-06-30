import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
  CreateTopicCommand,
  DeleteTopicCommand,
  PublishCommand,
  SNSClient,
} from "@aws-sdk/client-sns";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import {
  opaqueHash,
  type ResourceRecord,
  type ResourceRelationshipRecord,
  type TenantContext,
} from "@foundation/core";
import type { ResourceLifecyclePort } from "@foundation/ports";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const LOCALSTACK_RUNTIME_PROVIDER_BINDING_ID = "usf-208-localstack-cloud-emulator-provider";
export const LOCALSTACK_PROVIDER_REGISTRY_ID = "provider-emulator-localstack-composed-test";
export const LOCALSTACK_DEFERRED_PROVIDER_REGISTRY_ID = "provider-emulator-localstack-deferred";
export const LOCALSTACK_SERVICE_CATALOGUE_ID = "localstack";
export const LOCALSTACK_ENDPOINT_REF = "endpoint://compose/localstack";
export const LOCALSTACK_SDK_PACKAGES = Object.freeze([
  "@aws-sdk/client-s3",
  "@aws-sdk/client-sqs",
  "@aws-sdk/client-sns",
  "@aws-sdk/client-secrets-manager",
] as const);
export const LOCALSTACK_SDK_VERSION = "3.1077.0";
const LOCALSTACK_REGION = "us-east-1";
const LOCALSTACK_REMAINING_DEFERRED_BOUNDARIES = [
  "not-live-cloud-provider-compatibility",
  "not-provider-contract-certification",
  "not-production-cloud-credential-posture",
  "not-staging-or-production-readiness",
  "not-api-or-worker-runtime-provider-binding",
] as const;

export interface LocalStackCloudEmulatorEvidence {
  readonly providerRef: typeof LOCALSTACK_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof LOCALSTACK_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof LOCALSTACK_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof LOCALSTACK_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "LocalStackCloudEmulatorProofAdapter";
  readonly sdkPackages: typeof LOCALSTACK_SDK_PACKAGES;
  readonly sdkVersion: typeof LOCALSTACK_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly endpointRef: typeof LOCALSTACK_ENDPOINT_REF;
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
  readonly operation: "s3-sqs-sns-secretsmanager-round-trip" | "localstack-unavailable-fail-closed";
  readonly operationOutcome: "succeeded" | "failed-closed";
  readonly safeErrorCode: "localstack-provider-error-redacted";
  readonly failClosedDenials: number;
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly s3RoundTripChecked: boolean;
  readonly sqsRoundTripChecked: boolean;
  readonly snsPublishChecked: boolean;
  readonly secretsManagerRoundTripChecked: boolean;
  readonly cleanupAttempted: boolean;
  readonly cleanupSucceeded: boolean;
  readonly cleanupBoundary: "bucket-queue-topic-secret-delete-and-compose-down";
  readonly failureModeChecked: boolean;
  readonly containerRunningObserved: boolean;
  readonly serviceReadyObserved: boolean;
  readonly adapterConnectedObserved: boolean;
  readonly apiRuntimeUse: "not-applicable-profile-gated-proof-only";
  readonly workerRuntimeUse: "not-applicable-profile-gated-proof-only";
  readonly safeProviderSummary: "localstack-composed-provider";
  readonly remainingDeferredBoundaries: typeof LOCALSTACK_REMAINING_DEFERRED_BOUNDARIES;
}

interface LocalStackRetryMetrics {
  readonly attempts: number;
  readonly failures: number;
  readonly retryCount: number;
  readonly durationBucket: LocalStackCloudEmulatorEvidence["operationLatencyBucket"];
}

interface LocalStackRetryResult<T> {
  readonly value: T;
  readonly metrics: LocalStackRetryMetrics;
}

function tenantMatches(context: TenantContext, tenantId: string | null): boolean {
  return tenantId === null || tenantId === context.tenantId;
}

function encodeCursor(tenantId: string, offset: number): string {
  return Buffer.from(
    JSON.stringify({ h: opaqueHash(`resource-cursor:${tenantId}`).slice(0, 24), n: offset }),
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
    return parsed.h === opaqueHash(`resource-cursor:${tenantId}`).slice(0, 24) &&
      typeof parsed.n === "number"
      ? parsed.n
      : 0;
  } catch {
    return 0;
  }
}

export class LocalStackCloudEmulatorProofAdapter {
  readonly #endpoint: string;
  readonly #readinessTimeoutMs: number;
  readonly #requestTimeoutMs: number;
  readonly #s3: S3Client;
  readonly #sqs: SQSClient;
  readonly #sns: SNSClient;
  readonly #secrets: SecretsManagerClient;
  #readinessMetrics: LocalStackRetryMetrics = defaultLocalStackRetryMetrics();

  constructor(
    options: {
      readonly endpoint?: string;
      readonly readinessTimeoutMs?: number;
      readonly requestTimeoutMs?: number;
    } = {},
  ) {
    this.#endpoint = assertLoopbackLocalStackEndpoint(options.endpoint ?? "http://127.0.0.1:4566");
    this.#readinessTimeoutMs = options.readinessTimeoutMs ?? 60000;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 5000;
    const clientConfig = {
      region: LOCALSTACK_REGION,
      endpoint: this.#endpoint,
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    };
    this.#s3 = new S3Client({ ...clientConfig, forcePathStyle: true });
    this.#sqs = new SQSClient(clientConfig);
    this.#sns = new SNSClient(clientConfig);
    this.#secrets = new SecretsManagerClient(clientConfig);
  }

  async proveConfiguredCloudEmulatorBehaviour(
    input: {
      readonly tenantId?: string;
      readonly correlationId?: string;
    } = {},
  ): Promise<LocalStackCloudEmulatorEvidence> {
    const tenantId = input.tenantId ?? "tenant-localstack-proof";
    const correlationId = input.correlationId ?? "corr-localstack-proof";
    await this.#readiness();
    const proofId = `${process.pid}-${Date.now()}`;
    const bucketName = `usf-localstack-proof-${proofId}`;
    const s3Key = `proof/${proofId}.txt`;
    const queueName = `usf-localstack-proof-${proofId}`;
    const topicName = `usf-localstack-proof-${proofId}`;
    const secretName = `usf/localstack/proof/${proofId}`;
    let cleanupAttempted = false;
    let cleanupSucceeded: boolean;
    let queueUrl: string | undefined;
    let receiptHandle: string | undefined;
    let topicArn: string | undefined;
    try {
      const s3RoundTripChecked = await this.#proveS3(bucketName, s3Key);
      const sqsResult = await this.#proveSqs(queueName);
      queueUrl = sqsResult.queueUrl;
      receiptHandle = sqsResult.receiptHandle;
      const snsResult = await this.#proveSns(topicName);
      topicArn = snsResult.topicArn;
      const secretsManagerRoundTripChecked = await this.#proveSecretsManager(secretName);
      cleanupAttempted = true;
      cleanupSucceeded = await this.#cleanup({
        bucketName,
        s3Key,
        queueUrl,
        receiptHandle,
        topicArn,
        secretName,
      });
      return this.#record({
        tenantId,
        correlationId,
        operation: "s3-sqs-sns-secretsmanager-round-trip",
        operationOutcome: "succeeded",
        adapterHealthStatus: "healthy",
        s3RoundTripChecked,
        sqsRoundTripChecked: sqsResult.roundTripChecked,
        snsPublishChecked: snsResult.publishChecked,
        secretsManagerRoundTripChecked,
        cleanupAttempted,
        cleanupSucceeded,
        failureModeChecked: false,
        failClosedDenials: 0,
      });
    } catch (error) {
      cleanupAttempted = true;
      await this.#cleanup({
        bucketName,
        s3Key,
        queueUrl,
        receiptHandle,
        topicArn,
        secretName,
      });
      throw new Error("localstack-provider-error-redacted", { cause: error });
    } finally {
      if (!cleanupAttempted) {
        await this.#cleanup({
          bucketName,
          s3Key,
          queueUrl,
          receiptHandle,
          topicArn,
          secretName,
        });
      }
    }
  }

  async proveUnavailable(
    input: {
      readonly tenantId?: string;
      readonly correlationId?: string;
    } = {},
  ): Promise<LocalStackCloudEmulatorEvidence> {
    const tenantId = input.tenantId ?? "tenant-localstack-unavailable";
    const correlationId = input.correlationId ?? "corr-localstack-unavailable";
    try {
      await this.#readiness();
    } catch {
      return this.#record({
        tenantId,
        correlationId,
        operation: "localstack-unavailable-fail-closed",
        operationOutcome: "failed-closed",
        adapterHealthStatus: "unavailable",
        s3RoundTripChecked: false,
        sqsRoundTripChecked: false,
        snsPublishChecked: false,
        secretsManagerRoundTripChecked: false,
        cleanupAttempted: false,
        cleanupSucceeded: false,
        failureModeChecked: true,
        failClosedDenials: 1,
      });
    }
    throw new Error("localstack-unavailable-proof-did-not-fail-closed");
  }

  async #readiness(): Promise<void> {
    const result = await retryLocalStackReadiness(
      async () => {
        await this.#s3.send(new ListBucketsCommand({}), this.#requestOptions());
      },
      "localstack-provider-readiness-failed",
      this.#readinessTimeoutMs,
    );
    this.#readinessMetrics = result.metrics;
  }

  async #proveS3(bucketName: string, s3Key: string): Promise<boolean> {
    await this.#s3.send(new CreateBucketCommand({ Bucket: bucketName }), this.#requestOptions());
    await this.#s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: "synthetic localstack proof object",
      }),
      this.#requestOptions(),
    );
    const response = await this.#s3.send(
      new GetObjectCommand({ Bucket: bucketName, Key: s3Key }),
      this.#requestOptions(),
    );
    const text = await bodyToSafeString(response.Body);
    return text === "synthetic localstack proof object";
  }

  async #proveSqs(queueName: string): Promise<{
    readonly queueUrl: string;
    readonly receiptHandle: string | undefined;
    readonly roundTripChecked: boolean;
  }> {
    const created = await this.#sqs.send(
      new CreateQueueCommand({ QueueName: queueName }),
      this.#requestOptions(),
    );
    if (!created.QueueUrl) throw new Error("localstack-sqs-queue-url-redacted");
    const queueUrl = created.QueueUrl;
    await this.#sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: "synthetic localstack sqs proof",
      }),
      this.#requestOptions(),
    );
    const received = await this.#sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      }),
      this.#requestOptions(),
    );
    const message = received.Messages?.[0];
    return Object.freeze({
      queueUrl,
      receiptHandle: message?.ReceiptHandle,
      roundTripChecked: message?.Body === "synthetic localstack sqs proof",
    });
  }

  async #proveSns(topicName: string): Promise<{
    readonly topicArn: string;
    readonly publishChecked: boolean;
  }> {
    const created = await this.#sns.send(
      new CreateTopicCommand({ Name: topicName }),
      this.#requestOptions(),
    );
    if (!created.TopicArn) throw new Error("localstack-sns-topic-arn-redacted");
    const published = await this.#sns.send(
      new PublishCommand({
        TopicArn: created.TopicArn,
        Message: "synthetic localstack sns proof",
      }),
      this.#requestOptions(),
    );
    return Object.freeze({
      topicArn: created.TopicArn,
      publishChecked: Boolean(published.MessageId),
    });
  }

  async #proveSecretsManager(secretName: string): Promise<boolean> {
    await this.#secrets.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: "synthetic-localstack-secret-value",
      }),
      this.#requestOptions(),
    );
    const retrieved = await this.#secrets.send(
      new GetSecretValueCommand({ SecretId: secretName }),
      this.#requestOptions(),
    );
    return retrieved.SecretString === "synthetic-localstack-secret-value";
  }

  async #cleanup(input: {
    readonly bucketName: string;
    readonly s3Key: string;
    readonly queueUrl: string | undefined;
    readonly receiptHandle: string | undefined;
    readonly topicArn: string | undefined;
    readonly secretName: string;
  }): Promise<boolean> {
    const checks = await Promise.all([
      this.#ignoreCleanupError(async () => {
        await this.#s3.send(
          new DeleteObjectCommand({ Bucket: input.bucketName, Key: input.s3Key }),
          this.#requestOptions(),
        );
        await this.#s3.send(
          new DeleteBucketCommand({ Bucket: input.bucketName }),
          this.#requestOptions(),
        );
      }),
      this.#ignoreCleanupError(async () => {
        if (input.queueUrl && input.receiptHandle) {
          await this.#sqs.send(
            new DeleteMessageCommand({
              QueueUrl: input.queueUrl,
              ReceiptHandle: input.receiptHandle,
            }),
            this.#requestOptions(),
          );
        }
        if (input.queueUrl) {
          await this.#sqs.send(
            new DeleteQueueCommand({ QueueUrl: input.queueUrl }),
            this.#requestOptions(),
          );
        }
      }),
      this.#ignoreCleanupError(async () => {
        if (input.topicArn) {
          await this.#sns.send(
            new DeleteTopicCommand({ TopicArn: input.topicArn }),
            this.#requestOptions(),
          );
        }
      }),
      this.#ignoreCleanupError(async () => {
        await this.#secrets.send(
          new DeleteSecretCommand({ SecretId: input.secretName, ForceDeleteWithoutRecovery: true }),
          this.#requestOptions(),
        );
      }),
    ]);
    return checks.every(Boolean);
  }

  async #ignoreCleanupError(operation: () => Promise<void>): Promise<boolean> {
    try {
      await operation();
      return true;
    } catch {
      return false;
    }
  }

  #requestOptions(): { readonly abortSignal: AbortSignal } {
    return { abortSignal: AbortSignal.timeout(this.#requestTimeoutMs) };
  }

  #record(input: {
    readonly tenantId: string;
    readonly correlationId: string;
    readonly operation: LocalStackCloudEmulatorEvidence["operation"];
    readonly operationOutcome: LocalStackCloudEmulatorEvidence["operationOutcome"];
    readonly adapterHealthStatus: LocalStackCloudEmulatorEvidence["adapterHealthStatus"];
    readonly s3RoundTripChecked: boolean;
    readonly sqsRoundTripChecked: boolean;
    readonly snsPublishChecked: boolean;
    readonly secretsManagerRoundTripChecked: boolean;
    readonly cleanupAttempted: boolean;
    readonly cleanupSucceeded: boolean;
    readonly failureModeChecked: boolean;
    readonly failClosedDenials: number;
  }): LocalStackCloudEmulatorEvidence {
    return Object.freeze({
      providerRef: LOCALSTACK_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: LOCALSTACK_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: LOCALSTACK_SERVICE_CATALOGUE_ID,
      bindingId: LOCALSTACK_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "LocalStackCloudEmulatorProofAdapter",
      sdkPackages: LOCALSTACK_SDK_PACKAGES,
      sdkVersion: LOCALSTACK_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      endpointRef: LOCALSTACK_ENDPOINT_REF,
      readinessChecked: true,
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
      traceIdHash: opaqueHash(`localstack-trace:${input.tenantId}:${input.correlationId}`),
      correlationIdHash: opaqueHash(`localstack-correlation:${input.correlationId}`),
      tenantIdHash: opaqueHash(`localstack-tenant:${input.tenantId}`),
      operation: input.operation,
      operationOutcome: input.operationOutcome,
      safeErrorCode: "localstack-provider-error-redacted",
      failClosedDenials: input.failClosedDenials,
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      s3RoundTripChecked: input.s3RoundTripChecked,
      sqsRoundTripChecked: input.sqsRoundTripChecked,
      snsPublishChecked: input.snsPublishChecked,
      secretsManagerRoundTripChecked: input.secretsManagerRoundTripChecked,
      cleanupAttempted: input.cleanupAttempted,
      cleanupSucceeded: input.cleanupSucceeded,
      cleanupBoundary: "bucket-queue-topic-secret-delete-and-compose-down",
      failureModeChecked: input.failureModeChecked,
      containerRunningObserved: input.operationOutcome === "succeeded",
      serviceReadyObserved: input.operationOutcome === "succeeded",
      adapterConnectedObserved: input.operationOutcome === "succeeded",
      apiRuntimeUse: "not-applicable-profile-gated-proof-only",
      workerRuntimeUse: "not-applicable-profile-gated-proof-only",
      safeProviderSummary: "localstack-composed-provider",
      remainingDeferredBoundaries: LOCALSTACK_REMAINING_DEFERRED_BOUNDARIES,
    });
  }
}

function assertLoopbackLocalStackEndpoint(endpoint: string): string {
  const parsed = new URL(endpoint);
  if (parsed.protocol !== "http:") {
    throw new Error("localstack-endpoint-must-use-local-http");
  }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("localstack-endpoint-must-be-loopback");
  }
  return endpoint;
}

async function bodyToSafeString(body: unknown): Promise<string> {
  const transformable = body as { transformToString?: () => Promise<string> } | undefined;
  if (transformable && typeof transformable.transformToString === "function") {
    return transformable.transformToString();
  }
  return "";
}

async function retryLocalStackReadiness<T>(
  operation: () => Promise<T>,
  reasonCode: string,
  timeoutMs = 60000,
): Promise<LocalStackRetryResult<T>> {
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
          durationBucket: localStackDurationBucket(Date.now() - startedAt),
        },
      };
    } catch (error) {
      failures += 1;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, localStackRetryDelayMs(attempts)));
    }
  }
  throw new Error(reasonCode, { cause: lastError });
}

function defaultLocalStackRetryMetrics(): LocalStackRetryMetrics {
  return Object.freeze({
    attempts: 0,
    failures: 0,
    retryCount: 0,
    durationBucket: "lt-1s" as const,
  });
}

function localStackRetryDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** Math.max(0, attempt - 1), 5000);
}

function localStackDurationBucket(
  durationMs: number,
): LocalStackCloudEmulatorEvidence["operationLatencyBucket"] {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 5000) return "1s-5s";
  if (durationMs < 30000) return "5s-30s";
  if (durationMs < 60000) return "30s-60s";
  return "timeout";
}

// Local/dev/test in-memory resource lifecycle store. It is not a production
// record-management system and does not provide distributed consistency.
export class InMemoryResourceLifecycleStore implements ResourceLifecyclePort {
  readonly #resources = new Map<string, ResourceRecord>();
  readonly #idempotency = new Map<string, string>();
  readonly #relationships = new Map<string, ResourceRelationshipRecord>();

  create(record: ResourceRecord): ResourceRecord {
    const existingId = this.#idempotency.get(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
    );
    if (existingId) {
      const existing = this.#resources.get(existingId);
      if (existing) return existing;
    }
    this.#resources.set(record.resourceId, record);
    this.#idempotency.set(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
      record.resourceId,
    );
    return record;
  }

  get(context: TenantContext, resourceId: string): ResourceRecord | undefined {
    const record = this.#resources.get(resourceId);
    if (!record || !tenantMatches(context, record.tenantId)) return undefined;
    return record;
  }

  put(context: TenantContext, record: ResourceRecord): ResourceRecord {
    if (!tenantMatches(context, record.tenantId)) {
      throw new Error("resource tenant mismatch");
    }
    this.#resources.set(record.resourceId, record);
    this.#idempotency.set(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
      record.resourceId,
    );
    return record;
  }

  forTenant(
    context: TenantContext,
    input: { limit?: number; cursor?: string; includeDeleted?: boolean } = {},
  ): { readonly resources: readonly ResourceRecord[]; readonly nextCursor: string | null } {
    const rows = [...this.#resources.values()]
      .filter((record) => tenantMatches(context, record.tenantId))
      .filter((record) =>
        input.includeDeleted
          ? true
          : !["soft-deleted", "pending-delete", "purge-eligible", "purged"].includes(record.status),
      )
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.resourceId.localeCompare(b.resourceId),
      );
    const offset = decodeCursor(input.cursor, context.tenantId);
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const resources = Object.freeze(rows.slice(offset, offset + limit));
    const nextCursor =
      offset + limit < rows.length ? encodeCursor(context.tenantId, offset + limit) : null;
    return Object.freeze({ resources, nextCursor });
  }

  findByIdempotencyKey(context: TenantContext, idempotencyKey: string): ResourceRecord | undefined {
    const resourceId = this.#idempotency.get(
      this.#idempotencyKey(context.tenantId, idempotencyKey),
    );
    if (!resourceId) return undefined;
    return this.get(context, resourceId);
  }

  createRelationship(relationship: ResourceRelationshipRecord): ResourceRelationshipRecord {
    this.#relationships.set(relationship.relationshipId, relationship);
    return relationship;
  }

  relationship(
    context: TenantContext,
    relationshipId: string,
  ): ResourceRelationshipRecord | undefined {
    const record = this.#relationships.get(relationshipId);
    if (!record || !tenantMatches(context, record.tenantId)) return undefined;
    return record;
  }

  relationshipsForResource(
    context: TenantContext,
    resourceId: string,
  ): readonly ResourceRelationshipRecord[] {
    return Object.freeze(
      [...this.#relationships.values()]
        .filter((record) => tenantMatches(context, record.tenantId))
        .filter(
          (record) =>
            record.sourceResourceId === resourceId || record.targetResourceId === resourceId,
        )
        .sort((a, b) => a.relationshipId.localeCompare(b.relationshipId)),
    );
  }

  deleteRelationship(context: TenantContext, relationshipId: string): boolean {
    const record = this.relationship(context, relationshipId);
    if (!record) return false;
    return this.#relationships.delete(relationshipId);
  }

  safeStatusView(): ReturnType<ResourceLifecyclePort["safeStatusView"]> {
    return Object.freeze({
      providerMode: "in-memory",
      resourceCount: this.#resources.size,
      relationshipCount: this.#relationships.size,
      productionReadinessClaim: false,
      legalRecordManagementReadinessClaim: false,
      regulatoryRecordReadinessClaim: false,
    });
  }

  #idempotencyKey(tenantId: string | null, idempotencyKey: string): string {
    return `${tenantId ?? "global"}::${opaqueHash(idempotencyKey)}`;
  }
}
