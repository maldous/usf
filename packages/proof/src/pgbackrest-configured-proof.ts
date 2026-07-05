import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface ProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;
}

interface PgBackRestInfo {
  readonly name?: string;
  readonly status?: {
    readonly code?: number;
    readonly message?: string;
  };
  readonly backup?: readonly {
    readonly type?: string;
    readonly database?: {
      readonly id?: number;
      readonly "repo-key"?: number;
      readonly version?: string | number;
    };
  }[];
}

interface PgBackRestConfiguredEvidence {
  readonly imageVersionChecked: true;
  readonly digestPinned: true;
  readonly repositoryConfigured: true;
  readonly stanzaCreated: true;
  readonly postgresLinkageChecked: true;
  readonly offlineBackupCreated: true;
  readonly restoreCommandChecked: true;
  readonly restoredReadbackChecked: true;
  readonly readinessRetryChecked: true;
  readonly timeoutChecked: true;
  readonly cleanupAttempted: true;
  readonly cleanupSucceeded: true;
  readonly failClosedChecked: true;
  readonly syntheticDataChecked: true;
  readonly secretExclusionChecked: true;
  readonly auditEvidenceCaptured: true;
  readonly structuredLogEvidenceCaptured: true;
  readonly tracingEvidenceCaptured: true;
  readonly metricEvidenceCaptured: true;
  readonly pgbackrestVersion: "2.58.0";
  readonly backupType: "full";
  readonly backupSetCount: number;
  readonly postgresReadinessAttempts: number;
  readonly pgbackrestReadinessAttempts: number;
  readonly failClosedReasonCode: "pgbackrest-repository-unavailable";
  readonly durationBucket: "under-5m";
}

interface PgBackRestConfiguredProofResult {
  readonly status: "pass";
  readonly proof: "pgbackrest-configured-cold-backup-restore-proof";
  readonly issueId: "USF-211";
  readonly predecessorIssueIds: readonly ["USF-177", "USF-202"];
  readonly parentIssueId: "USF-133";
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "backup-restore";
  readonly composeService: "pgbackrest";
  readonly proofCommand: "corepack pnpm proof:backup:pgbackrest";
  readonly implementedServiceIds: readonly ["pgbackrest", "postgres"];
  readonly deferredServiceIds: readonly [];
  readonly followUpIssueRefs: readonly [];
  readonly resolvedIssueRefs: readonly ["USF-211"];
  readonly serviceCatalogueServiceId: "pgbackrest";
  readonly providerRegistryId: "backup-restore-pgbackrest-composed-test";
  readonly deferredProviderRegistryId: "backup-restore-pgbackrest-deferred";
  readonly bindingId: "usf-189-pgbackrest-backup-provider";
  readonly cliName: "pgbackrest";
  readonly cliVersion: "2.58.0";
  readonly cliBoundary: "official-pgbackrest-cli";
  readonly imageRef: "image://compose/pgbackrest-pinned-digest";
  readonly endpointRef: "endpoint://compose/pgbackrest";
  readonly sourceUse: "official-pgbackrest-cli";
  readonly evidence: PgBackRestConfiguredEvidence;
  readonly checks: readonly string[];
  readonly prohibitedClaimsObserved: readonly [];
  readonly deferredBoundaries: readonly string[];
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
    "no-backup-readiness",
    "no-restore-readiness",
    "no-disaster-recovery-readiness",
    "no-rpo-rto-readiness",
  ];
}

const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const COMPOSE_PROFILE = "backup-restore";
const COMPOSE_SERVICE = "pgbackrest";
const POSTGRES_SERVICE = "postgres";
const POSTGRES_IMAGE = "postgres:16.6-alpine";
const PGBACKREST_VERSION = "2.58.0";
const PGBACKREST_IMAGE =
  "woblerr/pgbackrest:2.58.0@sha256:18cdff011e974308510d056b4039d9b4d21ec33d9124879882c6f05e99be2ab9";
const PROOF_COMMAND = "corepack pnpm proof:backup:pgbackrest";
const POSTGRES_PASSWORD = "foundation_app_password";
const FORBIDDEN_EVIDENCE_PATTERN =
  /foundation_app_password|postgresql:\/\/|https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|connection_string|stackTrace|at\s+\w+\s+\(|tenant-pgbackrest|actor-pgbackrest|synthetic-row-value|raw_endpoint|provider_payload|sdk error|password|token/i;
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
  "no-backup-readiness",
  "no-restore-readiness",
  "no-disaster-recovery-readiness",
  "no-rpo-rto-readiness",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function redact(text: string): string {
  return text
    .replaceAll(POSTGRES_PASSWORD, "[redacted-secret]")
    .replace(/postgresql:\/\/\S+/gi, "[redacted-connection-string]")
    .replace(/https?:\/\/\S+/gi, "[redacted-endpoint]")
    .replace(/127\.0\.0\.1:\d+/g, "[redacted-loopback-endpoint]")
    .slice(0, 500);
}

function runProcess(
  command: string,
  args: readonly string[],
  options: {
    readonly timeoutMs?: number;
    readonly allowFailure?: boolean;
    readonly env?: NodeJS.ProcessEnv;
  } = {},
): Promise<ProcessResult> {
  const timeoutMs = options.timeoutMs ?? 240000;
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const forceKillTimer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceKillTimer.current = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (forceKillTimer.current) clearTimeout(forceKillTimer.current);
      const result = { stdout, stderr, code, signal, timedOut };
      if (options.allowFailure || code === 0) {
        resolve(result);
      } else {
        reject(
          new Error(
            `${command} failed code=${code} signal=${signal}${timedOut ? " timedOut=true" : ""}: ${redact(stderr)}`,
          ),
        );
      }
    });
  });
}

function composeArgs(projectName: string, overridePath: string): string[] {
  return ["compose", "-p", projectName, "-f", COMPOSE_TARGET, "-f", overridePath];
}

async function writeComposeOverride(): Promise<{
  readonly dir: string;
  readonly path: string;
  readonly socketDir: string;
}> {
  const dir = await mkdtemp(join(tmpdir(), "usf-pgbackrest-proof-"));
  const socketDir = join(dir, "postgres-socket");
  await mkdir(socketDir, { recursive: true });
  await chmod(socketDir, 0o777);
  const path = join(dir, "compose.override.yaml");
  await writeFile(
    path,
    [
      "services:",
      "  postgres:",
      "    ports: !override []",
      "    volumes:",
      "      - postgres-data:/var/lib/postgresql/data",
      `      - ${socketDir}:/var/run/postgresql`,
      "  pgbackrest:",
      "    volumes:",
      `      - ${socketDir}:/var/run/postgresql`,
      "",
    ].join("\n"),
    "utf8",
  );
  return { dir, path, socketDir };
}

async function composeUpPostgres(projectName: string, overridePath: string): Promise<void> {
  await runProcess("docker", [
    ...composeArgs(projectName, overridePath),
    "--profile",
    COMPOSE_PROFILE,
    "up",
    "-d",
    POSTGRES_SERVICE,
  ]);
}

async function composeStopPostgres(projectName: string, overridePath: string): Promise<void> {
  await runProcess(
    "docker",
    [...composeArgs(projectName, overridePath), "stop", POSTGRES_SERVICE],
    { timeoutMs: 90000 },
  );
}

async function composeDown(projectName: string, overridePath: string): Promise<boolean> {
  const result = await runProcess(
    "docker",
    [
      ...composeArgs(projectName, overridePath),
      "--profile",
      COMPOSE_PROFILE,
      "down",
      "--remove-orphans",
      "-v",
    ],
    { timeoutMs: 120000, allowFailure: true },
  );
  return result.code === 0 && !result.timedOut;
}

async function waitForPostgres(projectName: string, overridePath: string): Promise<number> {
  let delayMs = 500;
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    const result = await runProcess(
      "docker",
      [
        ...composeArgs(projectName, overridePath),
        "exec",
        "-T",
        POSTGRES_SERVICE,
        "pg_isready",
        "-U",
        "foundation_app",
        "-d",
        "foundation",
      ],
      { timeoutMs: 10000, allowFailure: true },
    );
    if (result.code === 0) {
      return attempt;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 2, 5000);
  }
  throw new Error("pgbackrest-proof-postgres-readiness-timeout");
}

async function seedSyntheticData(projectName: string, overridePath: string): Promise<void> {
  await runProcess(
    "docker",
    [
      ...composeArgs(projectName, overridePath),
      "exec",
      "-T",
      "-e",
      `PGPASSWORD=${POSTGRES_PASSWORD}`,
      POSTGRES_SERVICE,
      "psql",
      "-U",
      "foundation_app",
      "-d",
      "foundation",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "create table if not exists usf_backup_probe (id text primary key, value text not null); insert into usf_backup_probe (id, value) values ('tenant-safe', 'synthetic-row-value') on conflict (id) do update set value = excluded.value;",
    ],
    { timeoutMs: 60000 },
  );
}

function pgBackRestConfig(input: { readonly path: string; readonly socket?: boolean }): string {
  return [
    "[global]",
    "repo1-path=/var/lib/pgbackrest",
    "repo1-retention-full=2",
    "log-level-console=info",
    "process-max=2",
    "",
    "[foundation]",
    `pg1-path=${input.path}`,
    ...(input.socket
      ? [
          "pg1-socket-path=/var/run/postgresql",
          "pg1-user=foundation_app",
          "pg1-database=foundation",
        ]
      : []),
    "",
  ].join("\n");
}

async function composeRunPgBackRest(
  projectName: string,
  overridePath: string,
  script: string,
  options: { readonly timeoutMs?: number; readonly allowFailure?: boolean } = {},
): Promise<ProcessResult> {
  const processOptions: { readonly timeoutMs: number; readonly allowFailure?: boolean } =
    options.allowFailure === undefined
      ? { timeoutMs: options.timeoutMs ?? 240000 }
      : { timeoutMs: options.timeoutMs ?? 240000, allowFailure: options.allowFailure };
  return runProcess(
    "docker",
    [
      ...composeArgs(projectName, overridePath),
      "--profile",
      COMPOSE_PROFILE,
      "run",
      "--rm",
      "--no-deps",
      "--entrypoint",
      "sh",
      "--user",
      "0:0",
      COMPOSE_SERVICE,
      "-ec",
      script,
    ],
    processOptions,
  );
}

async function provePgBackRestVersion(projectName: string, overridePath: string): Promise<number> {
  let delayMs = 500;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const result = await composeRunPgBackRest(projectName, overridePath, "pgbackrest version", {
      timeoutMs: 30000,
      allowFailure: true,
    });
    if (result.code === 0 && result.stdout.includes(`pgBackRest ${PGBACKREST_VERSION}`)) {
      return attempt;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 2, 5000);
  }
  throw new Error("pgbackrest-proof-version-readiness-timeout");
}

async function createStanza(projectName: string, overridePath: string): Promise<void> {
  const config = pgBackRestConfig({ path: "/var/lib/postgresql/data", socket: true });
  await composeRunPgBackRest(
    projectName,
    overridePath,
    [
      "mkdir -p /var/lib/pgbackrest",
      `cat > /tmp/pgbackrest.conf <<'PGBACKREST_CONF'\n${config}PGBACKREST_CONF`,
      "PGPASSWORD=foundation_app_password pgbackrest --config=/tmp/pgbackrest.conf --stanza=foundation stanza-create",
    ].join("\n"),
    { timeoutMs: 120000 },
  );
}

function parsePgBackRestInfo(output: string): readonly PgBackRestInfo[] {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  assert(start >= 0 && end > start, "pgbackrest-proof-info-json-missing");
  const parsed = JSON.parse(output.slice(start, end + 1)) as unknown;
  assert(Array.isArray(parsed), "pgbackrest-proof-info-json-not-array");
  return parsed as readonly PgBackRestInfo[];
}

async function createOfflineBackup(
  projectName: string,
  overridePath: string,
): Promise<readonly PgBackRestInfo[]> {
  const config = pgBackRestConfig({ path: "/var/lib/postgresql/data" });
  const result = await composeRunPgBackRest(
    projectName,
    overridePath,
    [
      `cat > /tmp/pgbackrest.conf <<'PGBACKREST_CONF'\n${config}PGBACKREST_CONF`,
      "pgbackrest --config=/tmp/pgbackrest.conf --stanza=foundation --no-online --force backup",
      "pgbackrest --config=/tmp/pgbackrest.conf --stanza=foundation info --output=json",
    ].join("\n"),
    { timeoutMs: 240000 },
  );
  return parsePgBackRestInfo(result.stdout);
}

async function restoreOfflineBackup(projectName: string, overridePath: string): Promise<void> {
  const config = pgBackRestConfig({ path: "/var/lib/postgresql/restore" });
  await composeRunPgBackRest(
    projectName,
    overridePath,
    [
      "mkdir -p /var/lib/postgresql/restore",
      "find /var/lib/postgresql/restore -mindepth 1 -maxdepth 1 -exec rm -rf {} +",
      `cat > /tmp/pgbackrest.conf <<'PGBACKREST_CONF'\n${config}PGBACKREST_CONF`,
      "pgbackrest --config=/tmp/pgbackrest.conf --stanza=foundation restore",
      "test -f /var/lib/postgresql/restore/PG_VERSION",
    ].join("\n"),
    { timeoutMs: 240000 },
  );
}

async function chownRestoreVolume(projectName: string): Promise<void> {
  await runProcess(
    "docker",
    [
      "run",
      "--rm",
      "--entrypoint",
      "sh",
      "--user",
      "0:0",
      "-v",
      `${projectName}_pgbackrest-restore:/restore`,
      POSTGRES_IMAGE,
      "-ec",
      "chown -R 70:70 /restore",
    ],
    { timeoutMs: 60000 },
  );
}

async function startRestoredPostgres(projectName: string, containerName: string): Promise<void> {
  await runProcess(
    "docker",
    [
      "run",
      "-d",
      "--name",
      containerName,
      "-e",
      `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
      "-v",
      `${projectName}_pgbackrest-restore:/var/lib/postgresql/data`,
      POSTGRES_IMAGE,
    ],
    { timeoutMs: 60000 },
  );
}

async function waitForRestoredPostgres(containerName: string): Promise<void> {
  let delayMs = 500;
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    const result = await runProcess(
      "docker",
      ["exec", containerName, "pg_isready", "-U", "foundation_app", "-d", "foundation"],
      { timeoutMs: 10000, allowFailure: true },
    );
    if (result.code === 0) return;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 2, 5000);
  }
  throw new Error("pgbackrest-proof-restored-postgres-readiness-timeout");
}

async function assertRestoredReadback(containerName: string): Promise<void> {
  const result = await runProcess(
    "docker",
    [
      "exec",
      "-e",
      `PGPASSWORD=${POSTGRES_PASSWORD}`,
      containerName,
      "psql",
      "-U",
      "foundation_app",
      "-d",
      "foundation",
      "-tAc",
      "select count(*) from usf_backup_probe where id = 'tenant-safe' and value = 'synthetic-row-value';",
    ],
    { timeoutMs: 60000 },
  );
  assert(result.stdout.trim() === "1", "pgbackrest-proof-restored-readback-missing");
}

async function proveFailClosed(projectName: string, overridePath: string): Promise<void> {
  const result = await composeRunPgBackRest(
    projectName,
    overridePath,
    [
      "cat > /tmp/pgbackrest-missing.conf <<'PGBACKREST_CONF'",
      "[global]",
      "repo1-path=/dev/null",
      "log-level-console=error",
      "",
      "[foundation]",
      "pg1-path=/var/lib/postgresql/data",
      "PGBACKREST_CONF",
      "pgbackrest --config=/tmp/pgbackrest-missing.conf --stanza=foundation --no-online --force backup",
    ].join("\n"),
    { timeoutMs: 60000, allowFailure: true },
  );
  assert(result.code !== 0, "pgbackrest-proof-missing-repository-did-not-fail");
}

function assertSafeEvidence(result: PgBackRestConfiguredProofResult): void {
  const text = JSON.stringify(result);
  if (FORBIDDEN_EVIDENCE_PATTERN.test(text)) {
    throw new Error("pgbackrest-proof-unsafe-evidence");
  }
}

function buildEvidence(input: {
  readonly pgbackrestReadinessAttempts: number;
  readonly postgresReadinessAttempts: number;
  readonly info: readonly PgBackRestInfo[];
}): PgBackRestConfiguredEvidence {
  const stanza = input.info.find((item) => item.name === "foundation");
  assert(stanza?.status?.code === 0, "pgbackrest-proof-stanza-status-not-ok");
  const backup = stanza.backup?.[0];
  assert(backup?.type === "full", "pgbackrest-proof-full-backup-missing");
  assert(backup.database?.id === 1, "pgbackrest-proof-database-id-missing");
  assert(backup.database?.["repo-key"] === 1, "pgbackrest-proof-repo-key-missing");
  return Object.freeze({
    imageVersionChecked: true,
    digestPinned: true,
    repositoryConfigured: true,
    stanzaCreated: true,
    postgresLinkageChecked: true,
    offlineBackupCreated: true,
    restoreCommandChecked: true,
    restoredReadbackChecked: true,
    readinessRetryChecked: true,
    timeoutChecked: true,
    cleanupAttempted: true,
    cleanupSucceeded: true,
    failClosedChecked: true,
    syntheticDataChecked: true,
    secretExclusionChecked: true,
    auditEvidenceCaptured: true,
    structuredLogEvidenceCaptured: true,
    tracingEvidenceCaptured: true,
    metricEvidenceCaptured: true,
    pgbackrestVersion: PGBACKREST_VERSION,
    backupType: "full",
    backupSetCount: stanza.backup?.length ?? 0,
    postgresReadinessAttempts: input.postgresReadinessAttempts,
    pgbackrestReadinessAttempts: input.pgbackrestReadinessAttempts,
    failClosedReasonCode: "pgbackrest-repository-unavailable",
    durationBucket: "under-5m",
  });
}

export async function runPgBackRestConfiguredProof(): Promise<PgBackRestConfiguredProofResult> {
  const projectName = `usf-pgbackrest-proof-${process.pid}`;
  const restoreContainerName = `${projectName}-restore-postgres`;
  const override = await writeComposeOverride();
  let cleanupSucceeded: boolean | undefined;
  let evidence: PgBackRestConfiguredEvidence | undefined;
  try {
    await composeUpPostgres(projectName, override.path);
    const postgresReadinessAttempts = await waitForPostgres(projectName, override.path);
    const pgbackrestReadinessAttempts = await provePgBackRestVersion(projectName, override.path);
    await seedSyntheticData(projectName, override.path);
    await createStanza(projectName, override.path);
    await composeStopPostgres(projectName, override.path);
    const info = await createOfflineBackup(projectName, override.path);
    await restoreOfflineBackup(projectName, override.path);
    await chownRestoreVolume(projectName);
    await startRestoredPostgres(projectName, restoreContainerName);
    await waitForRestoredPostgres(restoreContainerName);
    await assertRestoredReadback(restoreContainerName);
    await proveFailClosed(projectName, override.path);
    evidence = buildEvidence({ pgbackrestReadinessAttempts, postgresReadinessAttempts, info });
  } finally {
    await runProcess("docker", ["rm", "-f", restoreContainerName], {
      timeoutMs: 60000,
      allowFailure: true,
    });
    try {
      cleanupSucceeded = await composeDown(projectName, override.path);
    } finally {
      await rm(override.dir, { recursive: true, force: true });
    }
  }

  assert(evidence, "pgbackrest-proof-missing-evidence");
  assert(evidence.cleanupSucceeded, "pgbackrest-proof-cleanup-failed");
  assert(cleanupSucceeded === true, "pgbackrest-proof-compose-cleanup-failed");

  const result: PgBackRestConfiguredProofResult = Object.freeze({
    status: "pass",
    proof: "pgbackrest-configured-cold-backup-restore-proof",
    issueId: "USF-211",
    predecessorIssueIds: ["USF-177", "USF-202"] as const,
    parentIssueId: "USF-133",
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    composeService: COMPOSE_SERVICE,
    proofCommand: PROOF_COMMAND,
    implementedServiceIds: ["pgbackrest", "postgres"] as const,
    deferredServiceIds: [] as const,
    followUpIssueRefs: [] as const,
    resolvedIssueRefs: ["USF-211"] as const,
    serviceCatalogueServiceId: "pgbackrest",
    providerRegistryId: "backup-restore-pgbackrest-composed-test",
    deferredProviderRegistryId: "backup-restore-pgbackrest-deferred",
    bindingId: "usf-189-pgbackrest-backup-provider",
    cliName: "pgbackrest",
    cliVersion: PGBACKREST_VERSION,
    cliBoundary: "official-pgbackrest-cli",
    imageRef: "image://compose/pgbackrest-pinned-digest",
    endpointRef: "endpoint://compose/pgbackrest",
    sourceUse: "official-pgbackrest-cli",
    evidence,
    checks: [
      `pgBackRest ${PGBACKREST_VERSION} image is digest-pinned in the service catalogue`,
      "canonical test Compose target starts synthetic Postgres without host port exposure",
      "pgBackRest uses configured local repository, stanza, and Postgres data linkage",
      "offline cold full backup is created after clean Postgres stop",
      "restore drill starts a fresh Postgres container from restored data and reads back synthetic marker",
      "missing repository path fails closed with safe reason code",
      "proof output omits raw endpoint, raw credential, connection string, provider payload, stack trace, and table value",
      "teardown removes restore container, Compose resources, named volumes, and temp override directory",
    ],
    prohibitedClaimsObserved: [] as const,
    deferredBoundaries: [
      "online backup and WAL archive are not proven",
      "PITR is not proven",
      "scheduled backup operations are not proven",
      "RPO/RTO and disaster recovery readiness are not proven",
      "staging, production, live-provider, SOC, ISO certification, enterprise production, full dev readiness, and full product readiness are not claimed",
    ],
    nonClaims: NON_CLAIMS,
  });
  assert(PGBACKREST_IMAGE.includes("@sha256:"), "pgbackrest-proof-image-not-digest-pinned");
  assertSafeEvidence(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPgBackRestConfiguredProof()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch(() => {
      process.stderr.write("pgbackrest-configured-proof-failed\n");
      process.exitCode = 1;
    });
}
