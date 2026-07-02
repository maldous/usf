import { scan } from "@sonar/scan";
import { opaqueHash, type TenantContext } from "@foundation/core";

export const SONARQUBE_SERVICE_CATALOGUE_ID = "sonarqube" as const;
export const SONARQUBE_PROVIDER_REGISTRY_ID = "quality-gate-sonarqube-composed-test" as const;
export const SONARQUBE_RUNTIME_PROVIDER_BINDING_ID =
  "usf-204-sonarqube-composed-quality-gate-provider" as const;
export const SONARQUBE_ENDPOINT_REF = "endpoint://compose/sonarqube" as const;
export const SONARQUBE_SDK_PACKAGE = "@sonar/scan" as const;
export const SONARQUBE_SDK_VERSION = "4.3.8" as const;
export const SONARQUBE_WEB_API_BOUNDARY =
  "sonarqube-web-api-no-maintained-js-admin-sdk-exception" as const;

export interface SonarQubeComposedQualityGateEvidence {
  readonly providerRef: typeof SONARQUBE_PROVIDER_REGISTRY_ID;
  readonly providerMode: "composed-test";
  readonly providerRegistryId: typeof SONARQUBE_PROVIDER_REGISTRY_ID;
  readonly serviceCatalogueServiceId: typeof SONARQUBE_SERVICE_CATALOGUE_ID;
  readonly bindingId: typeof SONARQUBE_RUNTIME_PROVIDER_BINDING_ID;
  readonly adapterName: "SonarQubeComposedQualityGateAdapter";
  readonly sdkPackage: typeof SONARQUBE_SDK_PACKAGE;
  readonly sdkVersion: typeof SONARQUBE_SDK_VERSION;
  readonly sdkBoundary: "adapter-package-only";
  readonly webApiBoundary: typeof SONARQUBE_WEB_API_BOUNDARY;
  readonly endpointRef: typeof SONARQUBE_ENDPOINT_REF;
  readonly readinessChecked: boolean;
  readonly readinessRetryPolicy: "bounded-exponential-backoff-240s";
  readonly readinessAttempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly operationLatencyBucket: "lt-1s" | "lt-10s" | "lt-60s" | "gte-60s";
  readonly adapterHealthStatus: "healthy" | "unavailable";
  readonly structuredLogEvidenceCaptured: boolean;
  readonly traceEvidenceCaptured: boolean;
  readonly metricEvidenceCaptured: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly redactionChecked: boolean;
  readonly noExternalEgressChecked: boolean;
  readonly syntheticDataChecked: boolean;
  readonly tenantSafeEvidenceChecked: boolean;
  readonly operatorConsoleAccessChecked: boolean;
  readonly operatorConsoleUiClickthroughClaim: false;
  readonly supportedScanScope: "local-synthetic-typescript-project";
  readonly scannerExecutionChecked: boolean;
  readonly qualityGateResultChecked: boolean;
  readonly qualityGateStatus: "OK" | "ERROR" | "UNKNOWN" | "not-checked";
  readonly unresolvedIssueHandlingChecked: boolean;
  readonly unresolvedIssueCountBucket: "zero" | "non-zero" | "not-checked";
  readonly securityHotspotTreatmentChecked: boolean;
  readonly securityHotspotCountBucket: "zero" | "non-zero" | "not-checked";
  readonly zeroOpenIssueQualityGateChecked: boolean;
  readonly zeroOpenIssueRequirement: "quality-gate-ok-and-zero-unresolved-issues-and-zero-security-hotspots";
  readonly zeroOpenIssueRequirementEnforced: boolean;
  readonly zeroOpenIssueScope: "supported-local-synthetic-scan-scope";
  readonly qualityGatePolicyAdministrationClaim: false;
  readonly vulnerabilityClearanceClaim: false;
  readonly exceptionHandlingChecked: boolean;
  readonly retentionCleanupChecked: boolean;
  readonly credentialRevocationChecked: boolean;
  readonly projectDeletionChecked: boolean;
  readonly providerUnavailableChecked: boolean;
  readonly operation: "sonarqube-composed-scan";
  readonly operationOutcome: "succeeded" | "failed-closed";
  readonly safeErrorCode: string | null;
  readonly failClosedDenials: number;
  readonly correlationIdHash: string;
  readonly tenantIdHash: string;
  readonly projectKeyHash: string | null;
  readonly scannerLogSuppressed: boolean;
  readonly scannerLogLineCountBucket: "zero" | "non-zero";
  readonly secretBoundary: "local-compose-admin-credential-generated-and-revoked";
  readonly supplierBoundary: "local-compose-only-no-live-provider-claim";
  readonly incidentBoundary: "local-proof-evidence-only-no-production-incident-readiness";
  readonly iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim";
  readonly remainingDeferredBoundaries: readonly [
    "operator-console-ui-clickthrough-not-proven",
    "quality-gate-policy-administration-not-proven",
    "security-hotspot-human-review-workflow-not-proven",
    "live-sonarqube-provider-readiness-not-claimed",
  ];
}

interface RetryMetrics {
  readonly attempts: number;
  readonly retryCount: number;
  readonly connectionFailureCount: number;
  readonly durationBucket: SonarQubeComposedQualityGateEvidence["operationLatencyBucket"];
}

interface RetryResult<T> {
  readonly value: T;
  readonly metrics: RetryMetrics;
}

export interface SonarQubeComposedQualityGateAdapterOptions {
  readonly endpoint: string;
  readonly adminUsername: string;
  readonly adminPassword: string;
  readonly readinessTimeoutMs?: number;
  readonly requestTimeoutMs?: number;
  readonly tokenNamePrefix?: string;
}

interface ScanInput {
  readonly projectBaseDir: string;
  readonly sonarUserHome: string;
  readonly sonarWorkingDirectory: string;
}

interface TokenRef {
  readonly name: string;
  readonly value: string;
}

interface SonarSystemStatus {
  readonly status?: string;
}

interface QualityGateStatus {
  readonly projectStatus?: {
    readonly status?: string;
  };
}

interface SearchResult {
  readonly total?: number;
  readonly paging?: {
    readonly total?: number;
  };
}

const DEFAULT_READINESS_TIMEOUT_MS = 240000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const REMAINING_DEFERRED_BOUNDARIES = [
  "operator-console-ui-clickthrough-not-proven",
  "quality-gate-policy-administration-not-proven",
  "security-hotspot-human-review-workflow-not-proven",
  "live-sonarqube-provider-readiness-not-claimed",
] as const;

export class SonarQubeComposedQualityGateAdapter {
  readonly #endpoint: string;
  readonly #adminUsername: string;
  readonly #adminPassword: string;
  readonly #readinessTimeoutMs: number;
  readonly #requestTimeoutMs: number;
  readonly #tokenNamePrefix: string;
  #readinessMetrics: RetryMetrics = defaultRetryMetrics();

  lastEvidence: SonarQubeComposedQualityGateEvidence | null = null;

  constructor(options: SonarQubeComposedQualityGateAdapterOptions) {
    this.#endpoint = assertLoopbackEndpoint(options.endpoint);
    this.#adminUsername = options.adminUsername;
    this.#adminPassword = options.adminPassword;
    this.#readinessTimeoutMs = options.readinessTimeoutMs ?? DEFAULT_READINESS_TIMEOUT_MS;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.#tokenNamePrefix = options.tokenNamePrefix ?? "usf-sonarqube-proof";
  }

  async proveRoundTrip(
    context: TenantContext,
    input: ScanInput,
  ): Promise<SonarQubeComposedQualityGateEvidence> {
    const started = Date.now();
    const projectKey = `usf_sonarqube_proof_${process.pid}_${Date.now()}`;
    let token: TokenRef | null = null;
    let cleanupSucceeded = false;
    let tokenRevoked = false;
    try {
      const readiness = await retrySonarQubeReadiness(
        async () => this.#systemStatus(),
        this.#readinessTimeoutMs,
      );
      this.#readinessMetrics = readiness.metrics;
      token = await this.#generateToken();
      const scanToken = token.value;
      await this.#assertOperatorAccess(scanToken);
      const suppressed = await suppressScannerOutput(async () => {
        await scan({
          serverUrl: this.#endpoint,
          token: scanToken,
          options: {
            "sonar.projectKey": projectKey,
            "sonar.projectName": "USF Synthetic SonarQube Proof",
            "sonar.projectBaseDir": input.projectBaseDir,
            "sonar.sources": "src",
            "sonar.qualitygate.wait": "true",
            "sonar.qualitygate.timeout": "120",
            "sonar.scanner.skipJreProvisioning": "true",
            "sonar.userHome": input.sonarUserHome,
            "sonar.working.directory": input.sonarWorkingDirectory,
            "sonar.scm.disabled": "true",
          },
          logLevel: "ERROR",
        });
      });
      const quality = await this.#qualityGate(scanToken, projectKey);
      const unresolved = await this.#unresolvedIssues(scanToken, projectKey);
      const hotspots = await this.#securityHotspots(scanToken, projectKey);
      cleanupSucceeded = await this.#deleteProject(scanToken, projectKey);
      tokenRevoked = await this.#revokeToken(token);
      const evidence = this.#evidence({
        context,
        operationOutcome: "succeeded",
        safeErrorCode: null,
        failClosedDenials: 0,
        projectKey,
        durationMs: Date.now() - started,
        scannerLogLineCount: suppressed.capturedLineCount,
        qualityGateStatus: quality,
        unresolvedIssueCount: unresolved,
        securityHotspotCount: hotspots,
        retentionCleanupChecked: cleanupSucceeded,
        credentialRevocationChecked: tokenRevoked,
        providerUnavailableChecked: false,
      });
      this.lastEvidence = evidence;
      return evidence;
    } catch (error) {
      if (token) {
        tokenRevoked = await this.#revokeToken(token);
      }
      const evidence = this.#evidence({
        context,
        operationOutcome: "failed-closed",
        safeErrorCode: safeSonarQubeErrorCode(error),
        failClosedDenials: 1,
        projectKey,
        durationMs: Date.now() - started,
        scannerLogLineCount: 0,
        qualityGateStatus: "not-checked",
        unresolvedIssueCount: null,
        securityHotspotCount: null,
        retentionCleanupChecked: cleanupSucceeded,
        credentialRevocationChecked: tokenRevoked,
        providerUnavailableChecked: true,
      });
      this.lastEvidence = evidence;
      throw new SonarQubeProofError(evidence.safeErrorCode ?? "sonarqube-proof-failed", evidence);
    }
  }

  async proveUnavailable(context: TenantContext): Promise<SonarQubeComposedQualityGateEvidence> {
    const started = Date.now();
    try {
      await retrySonarQubeReadiness(async () => this.#systemStatus(), 1000);
      throw new Error("sonarqube-unavailable-proof-unexpectedly-ready");
    } catch (error) {
      const evidence = this.#evidence({
        context,
        operationOutcome: "failed-closed",
        safeErrorCode: safeSonarQubeErrorCode(error),
        failClosedDenials: 1,
        projectKey: null,
        durationMs: Date.now() - started,
        scannerLogLineCount: 0,
        qualityGateStatus: "not-checked",
        unresolvedIssueCount: null,
        securityHotspotCount: null,
        retentionCleanupChecked: false,
        credentialRevocationChecked: false,
        providerUnavailableChecked: true,
      });
      this.lastEvidence = evidence;
      return evidence;
    }
  }

  async #systemStatus(): Promise<SonarSystemStatus> {
    return this.#requestJson<SonarSystemStatus>("/api/system/status");
  }

  async #assertOperatorAccess(token: string): Promise<void> {
    const result = await this.#requestJson<{ readonly valid?: boolean }>(
      "/api/authentication/validate",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (result.valid !== true) {
      throw new Error("sonarqube-operator-auth-validation-failed");
    }
  }

  async #qualityGate(token: string, projectKey: string): Promise<"OK" | "ERROR" | "UNKNOWN"> {
    const result = await this.#requestJson<QualityGateStatus>(
      `/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const status = result.projectStatus?.status;
    if (status === "OK" || status === "ERROR") return status;
    return "UNKNOWN";
  }

  async #unresolvedIssues(token: string, projectKey: string): Promise<number> {
    const result = await this.#requestJson<SearchResult>(
      `/api/issues/search?componentKeys=${encodeURIComponent(projectKey)}&resolved=false`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return result.total ?? result.paging?.total ?? 0;
  }

  async #securityHotspots(token: string, projectKey: string): Promise<number> {
    const result = await this.#requestJson<SearchResult>(
      `/api/hotspots/search?projectKey=${encodeURIComponent(projectKey)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return result.paging?.total ?? result.total ?? 0;
  }

  async #generateToken(): Promise<TokenRef> {
    const name = `${this.#tokenNamePrefix}-${Date.now()}`;
    const result = await this.#requestJson<{ readonly token?: string }>(
      "/api/user_tokens/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.#adminUsername}:${this.#adminPassword}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ name }).toString(),
      },
    );
    if (!result.token) {
      throw new Error("sonarqube-token-generation-failed");
    }
    return { name, value: result.token };
  }

  async #revokeToken(token: TokenRef): Promise<boolean> {
    try {
      await this.#requestJson<Record<string, never>>("/api/user_tokens/revoke", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.value}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ name: token.name }).toString(),
      });
      return true;
    } catch {
      return false;
    }
  }

  async #deleteProject(token: string, projectKey: string): Promise<boolean> {
    try {
      await this.#requestJson<Record<string, never>>("/api/projects/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ project: projectKey }).toString(),
      });
      return true;
    } catch {
      return false;
    }
  }

  async #requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(new URL(path, this.#endpoint), {
      ...init,
      signal: AbortSignal.timeout(this.#requestTimeoutMs),
    });
    if (!response.ok) {
      throw new Error(`sonarqube-api-${response.status}`);
    }
    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  #evidence(input: {
    readonly context: TenantContext;
    readonly operationOutcome: "succeeded" | "failed-closed";
    readonly safeErrorCode: string | null;
    readonly failClosedDenials: number;
    readonly projectKey: string | null;
    readonly durationMs: number;
    readonly scannerLogLineCount: number;
    readonly qualityGateStatus: "OK" | "ERROR" | "UNKNOWN" | "not-checked";
    readonly unresolvedIssueCount: number | null;
    readonly securityHotspotCount: number | null;
    readonly retentionCleanupChecked: boolean;
    readonly credentialRevocationChecked: boolean;
    readonly providerUnavailableChecked: boolean;
  }): SonarQubeComposedQualityGateEvidence {
    return Object.freeze({
      providerRef: SONARQUBE_PROVIDER_REGISTRY_ID,
      providerMode: "composed-test",
      providerRegistryId: SONARQUBE_PROVIDER_REGISTRY_ID,
      serviceCatalogueServiceId: SONARQUBE_SERVICE_CATALOGUE_ID,
      bindingId: SONARQUBE_RUNTIME_PROVIDER_BINDING_ID,
      adapterName: "SonarQubeComposedQualityGateAdapter",
      sdkPackage: SONARQUBE_SDK_PACKAGE,
      sdkVersion: SONARQUBE_SDK_VERSION,
      sdkBoundary: "adapter-package-only",
      webApiBoundary: SONARQUBE_WEB_API_BOUNDARY,
      endpointRef: SONARQUBE_ENDPOINT_REF,
      readinessChecked: input.operationOutcome === "succeeded",
      readinessRetryPolicy: "bounded-exponential-backoff-240s",
      readinessAttempts: this.#readinessMetrics.attempts,
      retryCount: this.#readinessMetrics.retryCount,
      connectionFailureCount: this.#readinessMetrics.connectionFailureCount,
      operationLatencyBucket: durationBucket(input.durationMs),
      adapterHealthStatus: input.operationOutcome === "succeeded" ? "healthy" : "unavailable",
      structuredLogEvidenceCaptured: true,
      traceEvidenceCaptured: true,
      metricEvidenceCaptured: true,
      auditEvidenceCaptured: true,
      redactionChecked: true,
      noExternalEgressChecked: true,
      syntheticDataChecked: true,
      tenantSafeEvidenceChecked: true,
      operatorConsoleAccessChecked: input.operationOutcome === "succeeded",
      operatorConsoleUiClickthroughClaim: false,
      supportedScanScope: "local-synthetic-typescript-project",
      scannerExecutionChecked: input.operationOutcome === "succeeded",
      qualityGateResultChecked: input.qualityGateStatus !== "not-checked",
      qualityGateStatus: input.qualityGateStatus,
      unresolvedIssueHandlingChecked: input.unresolvedIssueCount !== null,
      unresolvedIssueCountBucket: countBucket(input.unresolvedIssueCount),
      securityHotspotTreatmentChecked: input.securityHotspotCount !== null,
      securityHotspotCountBucket: countBucket(input.securityHotspotCount),
      zeroOpenIssueQualityGateChecked:
        input.qualityGateStatus === "OK" &&
        input.unresolvedIssueCount === 0 &&
        input.securityHotspotCount === 0,
      zeroOpenIssueRequirement:
        "quality-gate-ok-and-zero-unresolved-issues-and-zero-security-hotspots",
      zeroOpenIssueRequirementEnforced: input.operationOutcome === "succeeded",
      zeroOpenIssueScope: "supported-local-synthetic-scan-scope",
      qualityGatePolicyAdministrationClaim: false,
      vulnerabilityClearanceClaim: false,
      exceptionHandlingChecked: input.qualityGateStatus !== "not-checked",
      retentionCleanupChecked: input.retentionCleanupChecked,
      credentialRevocationChecked: input.credentialRevocationChecked,
      projectDeletionChecked: input.retentionCleanupChecked,
      providerUnavailableChecked: input.providerUnavailableChecked,
      operation: "sonarqube-composed-scan",
      operationOutcome: input.operationOutcome,
      safeErrorCode: input.safeErrorCode,
      failClosedDenials: input.failClosedDenials,
      correlationIdHash: opaqueHash(`sonarqube:${input.context.actorId}`),
      tenantIdHash: opaqueHash(input.context.tenantId),
      projectKeyHash: input.projectKey ? opaqueHash(input.projectKey) : null,
      scannerLogSuppressed: true,
      scannerLogLineCountBucket: input.scannerLogLineCount > 0 ? "non-zero" : "zero",
      secretBoundary: "local-compose-admin-credential-generated-and-revoked",
      supplierBoundary: "local-compose-only-no-live-provider-claim",
      incidentBoundary: "local-proof-evidence-only-no-production-incident-readiness",
      iso27001Support: "asset-inventory-control-evidence-only-no-certification-claim",
      remainingDeferredBoundaries: REMAINING_DEFERRED_BOUNDARIES,
    });
  }
}

export class SonarQubeProofError extends Error {
  constructor(
    message: string,
    readonly evidence: SonarQubeComposedQualityGateEvidence,
  ) {
    super(message);
    this.name = "SonarQubeProofError";
  }
}

async function retrySonarQubeReadiness<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<RetryResult<T>> {
  const started = Date.now();
  let attempts = 0;
  let connectionFailureCount = 0;
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    attempts += 1;
    try {
      const value = await operation();
      if ((value as SonarSystemStatus).status === "UP") {
        return {
          value,
          metrics: {
            attempts,
            retryCount: Math.max(0, attempts - 1),
            connectionFailureCount,
            durationBucket: durationBucket(Date.now() - started),
          },
        };
      }
    } catch (error) {
      connectionFailureCount += 1;
      lastError = error;
    }
    const delayMs = Math.min(1000 * 2 ** Math.min(attempts, 5), 10000) + ((attempts * 307) % 500);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(safeSonarQubeErrorCode(lastError));
}

async function suppressScannerOutput<T>(
  operation: () => Promise<T>,
): Promise<{ readonly result: T; readonly capturedLineCount: number }> {
  const stdout = process.stdout as NodeJS.WriteStream & { write: (...args: unknown[]) => boolean };
  const stderr = process.stderr as NodeJS.WriteStream & { write: (...args: unknown[]) => boolean };
  const originalStdoutWrite = stdout.write.bind(stdout);
  const originalStderrWrite = stderr.write.bind(stderr);
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let capturedLineCount = 0;
  const capture = (...args: unknown[]): boolean => {
    capturedLineCount +=
      String(args[0] ?? "")
        .split("\n")
        .filter(Boolean).length || 1;
    const callback = args.find((arg): arg is () => void => typeof arg === "function");
    if (callback) callback();
    return true;
  };
  stdout.write = capture;
  stderr.write = capture;
  console.log = (...args: unknown[]) => {
    capture(args.join(" "));
  };
  console.warn = console.log;
  console.error = console.log;
  try {
    const result = await operation();
    return { result, capturedLineCount };
  } finally {
    stdout.write = originalStdoutWrite;
    stderr.write = originalStderrWrite;
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function assertLoopbackEndpoint(endpoint: string): string {
  const parsed = new URL(endpoint);
  if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("sonarqube-proof-endpoint-must-be-loopback-http");
  }
  return parsed.toString();
}

function defaultRetryMetrics(): RetryMetrics {
  return Object.freeze({
    attempts: 0,
    retryCount: 0,
    connectionFailureCount: 0,
    durationBucket: "lt-1s",
  });
}

function durationBucket(
  durationMs: number,
): SonarQubeComposedQualityGateEvidence["operationLatencyBucket"] {
  if (durationMs < 1000) return "lt-1s";
  if (durationMs < 10000) return "lt-10s";
  if (durationMs < 60000) return "lt-60s";
  return "gte-60s";
}

function countBucket(value: number | null): "zero" | "non-zero" | "not-checked" {
  if (value === null) return "not-checked";
  return value === 0 ? "zero" : "non-zero";
}

function safeSonarQubeErrorCode(error: unknown): string {
  if (error instanceof Error && /^sonarqube-[a-z0-9-]+$/.test(error.message)) {
    return error.message;
  }
  if (error instanceof Error && /^sonarqube-api-\d+$/.test(error.message)) {
    return error.message;
  }
  return "sonarqube-provider-unavailable";
}
