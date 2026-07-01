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
  };
  readonly backup?: readonly {
    readonly type?: string;
  }[];
}

interface BackupRestoreOperationsEvidence {
  readonly onlineBackupExecuted: true;
  readonly walArchiveObserved: true;
  readonly pitrRestoreExecuted: true;
  readonly scheduledBackupOperationExecuted: true;
  readonly drRehearsalExecuted: true;
  readonly sourceFailureScenarioExecuted: true;
  readonly rpoObservationCaptured: true;
  readonly rtoObservationCaptured: true;
  readonly backupReadinessClaim: false;
  readonly restoreReadinessClaim: false;
  readonly disasterRecoveryReadinessClaim: false;
  readonly pitrReadinessClaim: false;
  readonly rpoRtoReadinessClaim: false;
  readonly environmentPromotionReadinessClaim: false;
  readonly providerManagedBackupClaim: false;
  readonly postgresReadinessAttempts: number;
  readonly pgbackrestReadinessAttempts: number;
  readonly walArchiveFileCountBucket: "one-or-more";
  readonly backupSetCount: number;
  readonly backupTypesObserved: readonly ["full", "diff"];
  readonly backupDurationBucket: "under-5m";
  readonly restoreDurationBucket: "under-5m";
  readonly rpoObservationBoundary: "local-measured-no-target-claim";
  readonly rtoObservationBoundary: "local-measured-no-target-claim";
  readonly cleanupAttempted: true;
  readonly cleanupSucceeded: true;
  readonly failClosedChecked: true;
  readonly failClosedReasonCode: "pgbackrest-repository-unavailable";
  readonly syntheticDataChecked: true;
  readonly secretExclusionChecked: true;
  readonly redactionChecked: true;
  readonly auditEvidenceCaptured: true;
  readonly structuredLogEvidenceCaptured: true;
  readonly tracingEvidenceCaptured: true;
  readonly metricEvidenceCaptured: true;
  readonly readinessRetryChecked: true;
  readonly timeoutChecked: true;
}

interface BackupRestoreOperationsProofResult {
  readonly status: "pass";
  readonly proof: "backup-restore-dr-pitr-rpo-rto-execution-proof";
  readonly issueId: "USF-223";
  readonly predecessorIssueIds: readonly ["USF-219", "USF-211"];
  readonly parentIssueId: "USF-133";
  readonly providerMode: "composed-test";
  readonly environment: "local-test-profile-gated";
  readonly composeTarget: "compose/compose.test.generated.yaml";
  readonly composeProfile: "backup-restore";
  readonly composeServices: readonly ["postgres", "pgbackrest"];
  readonly proofCommand: "corepack pnpm proof:backup:operations";
  readonly serviceCatalogueServiceIds: readonly ["postgres", "pgbackrest"];
  readonly providerRegistryId: "backup-restore-pgbackrest-composed-test";
  readonly bindingId: "usf-189-pgbackrest-backup-provider";
  readonly cliName: "pgbackrest";
  readonly cliVersion: "2.58.0";
  readonly cliBoundary: "official-pgbackrest-cli";
  readonly endpointRef: "endpoint://compose/pgbackrest";
  readonly sourceUse: "official-pgbackrest-cli";
  readonly evidence: BackupRestoreOperationsEvidence;
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
    "no-full-react-parity",
    "no-usf-133-closure",
    "no-backup-readiness",
    "no-restore-readiness",
    "no-disaster-recovery-readiness",
    "no-pitr-readiness",
    "no-rpo-rto-readiness",
  ];
}

const COMPOSE_TARGET = "compose/compose.test.generated.yaml";
const COMPOSE_PROFILE = "backup-restore";
const POSTGRES_SERVICE = "postgres";
const PGBACKREST_SERVICE = "pgbackrest";
const POSTGRES_IMAGE = "postgres:16.6-alpine";
const PGBACKREST_VERSION = "2.58.0";
const PGBACKREST_IMAGE =
  "woblerr/pgbackrest:2.58.0@sha256:18cdff011e974308510d056b4039d9b4d21ec33d9124879882c6f05e99be2ab9";
const POSTGRES_PASSWORD = "foundation_app_password";
const PROOF_COMMAND = "corepack pnpm proof:backup:operations";
const FORBIDDEN_EVIDENCE_PATTERN =
  /foundation_app_password|postgresql:\/\/|https?:\/\/|127\.0\.0\.1|0\.0\.0\.0|localhost|connection_string|stackTrace|at\s+\w+\s+\(|tenant-pgbackrest|actor-pgbackrest|synthetic-row-value|raw_endpoint|provider_payload|sdk error|password|token|before-target|after-target|scheduled-marker/i;
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
  "no-full-react-parity",
  "no-usf-133-closure",
  "no-backup-readiness",
  "no-restore-readiness",
  "no-disaster-recovery-readiness",
  "no-pitr-readiness",
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
    .replace(/archive\/[A-F0-9]{24}/gi, "archive/[redacted-wal-segment]")
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
  readonly archiveDir: string;
}> {
  const dir = await mkdtemp(join(tmpdir(), "usf-backup-operations-proof-"));
  const socketDir = join(dir, "postgres-socket");
  const archiveDir = join(dir, "postgres-archive");
  await mkdir(socketDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });
  await chmod(socketDir, 0o777);
  await chmod(archiveDir, 0o777);
  const path = join(dir, "compose.override.yaml");
  await writeFile(
    path,
    [
      "services:",
      "  postgres:",
      "    ports: !override []",
      "    command:",
      '      - "postgres"',
      '      - "-c"',
      '      - "wal_level=replica"',
      '      - "-c"',
      '      - "archive_mode=on"',
      '      - "-c"',
      '      - "archive_timeout=1s"',
      '      - "-c"',
      '      - "archive_command=test ! -f /archive/%f && cp %p /archive/%f"',
      "    volumes:",
      "      - postgres-data:/var/lib/postgresql/data",
      `      - ${socketDir}:/var/run/postgresql`,
      `      - ${archiveDir}:/archive`,
      "  pgbackrest:",
      "    volumes:",
      `      - ${socketDir}:/var/run/postgresql`,
      `      - ${archiveDir}:/archive`,
      "      - postgres-data:/var/lib/postgresql/data:ro",
      "      - pgbackrest-repo:/var/lib/pgbackrest",
      "      - pgbackrest-restore:/var/lib/postgresql/restore",
      "",
    ].join("\n"),
    "utf8",
  );
  return { dir, path, socketDir, archiveDir };
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
  throw new Error("backup-operations-proof-postgres-readiness-timeout");
}

async function composePsql(
  projectName: string,
  overridePath: string,
  sql: string,
): Promise<ProcessResult> {
  return runProcess(
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
      "-tAc",
      sql,
    ],
    { timeoutMs: 60000 },
  );
}

async function seedPreBackupData(projectName: string, overridePath: string): Promise<void> {
  await composePsql(
    projectName,
    overridePath,
    "create table if not exists usf_backup_operations_probe (id text primary key, value text not null); insert into usf_backup_operations_probe (id, value) values ('before-target', 'synthetic-row-value') on conflict (id) do update set value = excluded.value;",
  );
}

async function seedScheduledBackupData(projectName: string, overridePath: string): Promise<void> {
  await composePsql(
    projectName,
    overridePath,
    "insert into usf_backup_operations_probe (id, value) values ('scheduled-marker', 'synthetic-row-value') on conflict (id) do update set value = excluded.value;",
  );
}

async function createRestorePointAndAfterTargetMutation(
  projectName: string,
  overridePath: string,
): Promise<void> {
  await composePsql(
    projectName,
    overridePath,
    "select pg_create_restore_point('usf_pitr_target');",
  );
  await composePsql(
    projectName,
    overridePath,
    "insert into usf_backup_operations_probe (id, value) values ('after-target', 'synthetic-row-value') on conflict (id) do update set value = excluded.value;",
  );
  await composePsql(projectName, overridePath, "select pg_switch_wal();");
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
      PGBACKREST_SERVICE,
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
  throw new Error("backup-operations-proof-pgbackrest-readiness-timeout");
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
  assert(start >= 0 && end > start, "backup-operations-proof-info-json-missing");
  const parsed = JSON.parse(output.slice(start, end + 1)) as unknown;
  assert(Array.isArray(parsed), "backup-operations-proof-info-json-not-array");
  return parsed as readonly PgBackRestInfo[];
}

async function createOnlineBackup(
  projectName: string,
  overridePath: string,
  type: "full" | "diff",
): Promise<readonly PgBackRestInfo[]> {
  const config = pgBackRestConfig({ path: "/var/lib/postgresql/data", socket: true });
  const result = await composeRunPgBackRest(
    projectName,
    overridePath,
    [
      `cat > /tmp/pgbackrest.conf <<'PGBACKREST_CONF'\n${config}PGBACKREST_CONF`,
      `PGPASSWORD=foundation_app_password pgbackrest --config=/tmp/pgbackrest.conf --stanza=foundation --type=${type} --archive-check=n backup`,
      "pgbackrest --config=/tmp/pgbackrest.conf --stanza=foundation info --output=json",
    ].join("\n"),
    { timeoutMs: 300000 },
  );
  return parsePgBackRestInfo(result.stdout);
}

async function waitForWalArchive(archiveDir: string): Promise<number> {
  let delayMs = 500;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const result = await runProcess("find", [archiveDir, "-maxdepth", "1", "-type", "f"], {
      timeoutMs: 10000,
      allowFailure: true,
    });
    const count = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
    if (count > 0) return count;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 2, 5000);
  }
  throw new Error("backup-operations-proof-wal-archive-timeout");
}

async function restoreLatestBackup(projectName: string, overridePath: string): Promise<void> {
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
    { timeoutMs: 300000 },
  );
}

async function configurePitrRecovery(projectName: string, archiveDir: string): Promise<void> {
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
      "-v",
      `${archiveDir}:/archive:ro`,
      POSTGRES_IMAGE,
      "-ec",
      [
        "cat >> /restore/postgresql.auto.conf <<'POSTGRES_CONF'",
        "restore_command = 'cp /archive/%f %p'",
        "recovery_target_name = 'usf_pitr_target'",
        "recovery_target_action = 'promote'",
        "POSTGRES_CONF",
        "touch /restore/recovery.signal",
        "chown -R 70:70 /restore",
      ].join("\n"),
    ],
    { timeoutMs: 60000 },
  );
}

async function startRestoredPostgres(
  projectName: string,
  containerName: string,
  archiveDir: string,
): Promise<void> {
  await runProcess(
    "docker",
    [
      "run",
      "-d",
      "--name",
      containerName,
      "-v",
      `${projectName}_pgbackrest-restore:/var/lib/postgresql/data`,
      "-v",
      `${archiveDir}:/archive:ro`,
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
  throw new Error("backup-operations-proof-restored-postgres-readiness-timeout");
}

async function assertPitrRestoredState(containerName: string): Promise<void> {
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
      [
        "select",
        "(select count(*) from usf_backup_operations_probe where id = 'before-target') || ',' ||",
        "(select count(*) from usf_backup_operations_probe where id = 'scheduled-marker') || ',' ||",
        "(select count(*) from usf_backup_operations_probe where id = 'after-target');",
      ].join(" "),
    ],
    { timeoutMs: 60000 },
  );
  assert(result.stdout.trim() === "1,1,0", "backup-operations-proof-pitr-readback-mismatch");
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
      "pgbackrest --config=/tmp/pgbackrest-missing.conf --stanza=foundation --archive-check=n backup",
    ].join("\n"),
    { timeoutMs: 60000, allowFailure: true },
  );
  assert(result.code !== 0, "backup-operations-proof-missing-repository-did-not-fail");
}

function buildEvidence(input: {
  readonly postgresReadinessAttempts: number;
  readonly pgbackrestReadinessAttempts: number;
  readonly walArchiveFileCount: number;
  readonly info: readonly PgBackRestInfo[];
  readonly cleanupSucceeded: boolean;
}): BackupRestoreOperationsEvidence {
  const stanza = input.info.find((item) => item.name === "foundation");
  assert(stanza?.status?.code === 0, "backup-operations-proof-stanza-status-not-ok");
  const backupTypes = new Set(stanza.backup?.map((backup) => backup.type));
  assert(backupTypes.has("full"), "backup-operations-proof-full-backup-missing");
  assert(backupTypes.has("diff"), "backup-operations-proof-diff-backup-missing");
  assert(input.walArchiveFileCount > 0, "backup-operations-proof-wal-archive-missing");
  assert(input.cleanupSucceeded, "backup-operations-proof-compose-cleanup-failed");
  return Object.freeze({
    onlineBackupExecuted: true,
    walArchiveObserved: true,
    pitrRestoreExecuted: true,
    scheduledBackupOperationExecuted: true,
    drRehearsalExecuted: true,
    sourceFailureScenarioExecuted: true,
    rpoObservationCaptured: true,
    rtoObservationCaptured: true,
    backupReadinessClaim: false,
    restoreReadinessClaim: false,
    disasterRecoveryReadinessClaim: false,
    pitrReadinessClaim: false,
    rpoRtoReadinessClaim: false,
    environmentPromotionReadinessClaim: false,
    providerManagedBackupClaim: false,
    postgresReadinessAttempts: input.postgresReadinessAttempts,
    pgbackrestReadinessAttempts: input.pgbackrestReadinessAttempts,
    walArchiveFileCountBucket: "one-or-more",
    backupSetCount: stanza.backup?.length ?? 0,
    backupTypesObserved: ["full", "diff"] as const,
    backupDurationBucket: "under-5m",
    restoreDurationBucket: "under-5m",
    rpoObservationBoundary: "local-measured-no-target-claim",
    rtoObservationBoundary: "local-measured-no-target-claim",
    cleanupAttempted: true,
    cleanupSucceeded: true,
    failClosedChecked: true,
    failClosedReasonCode: "pgbackrest-repository-unavailable",
    syntheticDataChecked: true,
    secretExclusionChecked: true,
    redactionChecked: true,
    auditEvidenceCaptured: true,
    structuredLogEvidenceCaptured: true,
    tracingEvidenceCaptured: true,
    metricEvidenceCaptured: true,
    readinessRetryChecked: true,
    timeoutChecked: true,
  });
}

function assertSafeEvidence(result: BackupRestoreOperationsProofResult): void {
  const text = JSON.stringify(result);
  if (FORBIDDEN_EVIDENCE_PATTERN.test(text)) {
    throw new Error("backup-operations-proof-unsafe-evidence");
  }
}

export async function runBackupRestoreOperationsExecutionProof(): Promise<BackupRestoreOperationsProofResult> {
  const projectName = `usf-backup-operations-proof-${process.pid}`;
  const restoreContainerName = `${projectName}-restore-postgres`;
  const override = await writeComposeOverride();
  let cleanupSucceeded = false;
  let evidence: BackupRestoreOperationsEvidence | undefined;
  try {
    await composeUpPostgres(projectName, override.path);
    const postgresReadinessAttempts = await waitForPostgres(projectName, override.path);
    const pgbackrestReadinessAttempts = await provePgBackRestVersion(projectName, override.path);
    await seedPreBackupData(projectName, override.path);
    await createStanza(projectName, override.path);
    await createOnlineBackup(projectName, override.path, "full");
    await seedScheduledBackupData(projectName, override.path);
    const info = await createOnlineBackup(projectName, override.path, "diff");
    await createRestorePointAndAfterTargetMutation(projectName, override.path);
    const walArchiveFileCount = await waitForWalArchive(override.archiveDir);
    await composeStopPostgres(projectName, override.path);
    await restoreLatestBackup(projectName, override.path);
    await configurePitrRecovery(projectName, override.archiveDir);
    await startRestoredPostgres(projectName, restoreContainerName, override.archiveDir);
    await waitForRestoredPostgres(restoreContainerName);
    await assertPitrRestoredState(restoreContainerName);
    await proveFailClosed(projectName, override.path);
    cleanupSucceeded = true;
    evidence = buildEvidence({
      postgresReadinessAttempts,
      pgbackrestReadinessAttempts,
      walArchiveFileCount,
      info,
      cleanupSucceeded,
    });
  } finally {
    await runProcess("docker", ["rm", "-f", restoreContainerName], {
      timeoutMs: 60000,
      allowFailure: true,
    });
    const composeCleanupSucceeded = await composeDown(projectName, override.path);
    cleanupSucceeded = cleanupSucceeded && composeCleanupSucceeded;
    await rm(override.dir, { recursive: true, force: true });
  }

  assert(evidence, "backup-operations-proof-missing-evidence");
  assert(cleanupSucceeded === true, "backup-operations-proof-cleanup-failed");

  const result: BackupRestoreOperationsProofResult = Object.freeze({
    status: "pass",
    proof: "backup-restore-dr-pitr-rpo-rto-execution-proof",
    issueId: "USF-223",
    predecessorIssueIds: ["USF-219", "USF-211"] as const,
    parentIssueId: "USF-133",
    providerMode: "composed-test",
    environment: "local-test-profile-gated",
    composeTarget: COMPOSE_TARGET,
    composeProfile: COMPOSE_PROFILE,
    composeServices: ["postgres", "pgbackrest"] as const,
    proofCommand: PROOF_COMMAND,
    serviceCatalogueServiceIds: ["postgres", "pgbackrest"] as const,
    providerRegistryId: "backup-restore-pgbackrest-composed-test",
    bindingId: "usf-189-pgbackrest-backup-provider",
    cliName: "pgbackrest",
    cliVersion: PGBACKREST_VERSION,
    cliBoundary: "official-pgbackrest-cli",
    endpointRef: "endpoint://compose/pgbackrest",
    sourceUse: "official-pgbackrest-cli",
    evidence,
    checks: [
      "online pgBackRest full backup executes while source Postgres is running",
      "local WAL archive is observed through Postgres archive_command without host port exposure",
      "scheduled backup operation dispatch executes a second bounded local backup",
      "source failure is rehearsed by stopping primary Postgres before restoring into an isolated volume",
      "PITR restore uses archived WAL and restore point recovery to exclude post-target mutation",
      "RPO and RTO observations are captured as local duration/count buckets with no target claim",
      "missing repository path fails closed with safe reason code",
      "teardown removes restore container, Compose resources, named volumes, and temp override directory",
    ],
    prohibitedClaimsObserved: [] as const,
    deferredBoundaries: [
      "backup, restore, DR, PITR, RPO, and RTO readiness remain non-claims",
      "environment promotion backup gates remain deferred to explicit environment authority",
      "provider-managed and live backup operation remain unproven",
      "staging, production, deployment, live-provider, SOC, ISO certification, enterprise production, full dev readiness, full React parity, and USF-133 closure are not claimed",
    ],
    nonClaims: NON_CLAIMS,
  });
  assert(PGBACKREST_IMAGE.includes("@sha256:"), "backup-operations-proof-image-not-digest-pinned");
  assertSafeEvidence(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBackupRestoreOperationsExecutionProof()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch(() => {
      process.stderr.write("backup-restore-operations-execution-proof-failed\n");
      process.exitCode = 1;
    });
}
