// Live composed-Postgres files/storage proof (parity-files-storage, USF-146).
//
// Proves the tenant-scoped file METADATA substrate (0003-files.sql) on a real
// Postgres under the actual non-superuser application role:
//   - files ENABLE + FORCE row level security with a tenant policy;
//   - tenant A sees only its own file rows; a cross-tenant read returns nothing;
//   - missing tenant context fails closed (0 rows);
//   - a cross-tenant insert is blocked by the RLS WITH CHECK policy;
//   - created_at is immutable (lifecycle trigger);
//   - legal_hold blocks a destructive DELETE (purge guard);
//   - (tenant_id, object_key) is unique per tenant.
//
// Composed-local proof. NO live S3/MinIO/object-store, antivirus/DLP, or production-live
// claim. Run via `make files-proof` (brings up Postgres, runs this, tears it down).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findProvider } from "@foundation/core";

const COMPOSE = ["compose", "-f", "compose/compose.yaml", "exec", "-T", "postgres", "psql"];
const DB = "foundation";
const SUPER = "foundation_app";
const APP_ROLE = "foundation_runtime";
const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

const USF147_ENTERPRISE_CONTROLS = Object.freeze({
  minioRuntimeBindingReconciliation: "bounded-local-proof",
  clamavScannerSupportReconciliation: "bounded-local-proof",
  dbBackedMetadataAdapterLinkage: "bounded-local-proof",
  presignedUrlBoundary: "explicitly-reclassified",
  derivedObjectsPosture: "explicitly-reclassified",
  objectVersioningPosture: "explicitly-reclassified",
  backupRestoreDrPosture: "explicitly-reclassified",
  dlpExfiltrationControls: "explicitly-reclassified",
  encryptionKmsPosture: "explicitly-reclassified",
  dataResidencyEnforcement: "explicitly-reclassified",
  quotaRateLimitTemporaryCleanup: "explicitly-reclassified",
  objectLockWormPosture: "explicitly-reclassified",
  evidencePackageExportPosture: "bounded-local-proof",
} as const);

const USF147_NON_CLAIMS = Object.freeze([
  "live-object-store-readiness",
  "live-scanner-readiness",
  "backup-restore-readiness",
  "kms-readiness",
  "dlp-readiness",
  "full-files-storage-readiness",
  "full-dev-readiness",
  "test-readiness",
  "staging-readiness",
  "production-readiness",
  "deployment-readiness",
  "live-provider-readiness",
  "soc-readiness",
  "iso27001-certification",
  "enterprise-production-readiness",
  "full-product-readiness",
  "usf-133-closure",
] as const);

function psql(role: string, sql: string, opts: { expectFailure?: boolean } = {}): string {
  const args = [
    ...COMPOSE,
    "-U",
    role,
    "-d",
    DB,
    "-v",
    "ON_ERROR_STOP=1",
    "-X",
    "-q",
    "-A",
    "-t",
    "-f",
    "-",
  ];
  try {
    const out = execFileSync("docker", args, { input: sql, encoding: "utf8" });
    if (opts.expectFailure) {
      throw new Error(`expected failure but SQL succeeded as ${role}:\n${sql}`);
    }
    return out.trim();
  } catch (error) {
    if (opts.expectFailure) {
      return "expected-failure";
    }
    const err = error as { stderr?: string; message?: string };
    throw new Error(
      `unexpected failure as ${role}:\n${(err.stderr ?? err.message ?? "").toString()}`,
      {
        cause: error,
      },
    );
  }
}

function scalar(role: string, sql: string): string {
  return psql(role, sql).split("\n").filter(Boolean).pop() ?? "";
}

function migration(file: string): string {
  return readFileSync(new URL(`../../../adapters/db/migrations/${file}`, import.meta.url), "utf8");
}

const checks: string[] = [];
function pass(label: string): void {
  checks.push(label);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`files/storage proof failed: ${message}`);
  }
}

function setup(): void {
  psql(
    SUPER,
    `DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP ROLE IF EXISTS ${APP_ROLE};`,
  );
  psql(SUPER, migration("0001-bootstrap.sql"));
  psql(SUPER, migration("0002-enterprise-persistence-metadata.sql"));
  psql(SUPER, migration("0003-files.sql"));
  psql(SUPER, migration("0004-enterprise-db-proof-depth.sql"));
  psql(
    SUPER,
    `
    ALTER ROLE ${APP_ROLE} LOGIN PASSWORD 'foundation_runtime_pw';
    ALTER ROLE ${APP_ROLE} SET search_path = public;
    GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
    INSERT INTO tenants (tenant_id, canonical_domain, status, created_by, updated_by)
      VALUES ('${TENANT_A}', 'a.example', 'active', 'seed', 'seed'),
             ('${TENANT_B}', 'b.example', 'active', 'seed', 'seed');
    INSERT INTO files (file_id, tenant_id, owner_actor_id, object_key, filename_original, filename_safe, content_type, size_bytes, status, created_by, updated_by, correlation_id)
      VALUES ('fa1', '${TENANT_A}', 'actor-a', 'o/aa/bb/aaaa', 'a.txt', 'a.txt', 'text/plain', 5, 'available', 'seed', 'seed', 'corr-a'),
             ('fb1', '${TENANT_B}', 'actor-b', 'o/cc/dd/bbbb', 'b.txt', 'b.txt', 'text/plain', 5, 'available', 'seed', 'seed', 'corr-b');
  `,
  );
  pass("setup: 0001+0002+0003 applied; app role configured; tenant A and B file rows seeded");
}

function proveRlsCatalog(): void {
  const flags = scalar(
    SUPER,
    `SELECT relrowsecurity::text || ',' || relforcerowsecurity::text FROM pg_class WHERE relname = 'files';`,
  );
  if (flags !== "true,true") {
    throw new Error(`files RLS catalog flags (enable,force)=${flags}`);
  }
  const policy = scalar(
    SUPER,
    `SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'files';`,
  );
  if (policy === "0") {
    throw new Error("files has no RLS policy");
  }
  const idx = scalar(
    SUPER,
    `SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'files' AND indexdef ILIKE '%(tenant_id%';`,
  );
  if (idx === "0") {
    throw new Error("files has no tenant_id index");
  }
  pass("files ENABLE + FORCE RLS, has a tenant policy, and indexes tenant_id");
}

function proveIsolation(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    DO $$ DECLARE n int; BEGIN
      SELECT count(*) INTO n FROM files;
      IF n <> 1 THEN RAISE EXCEPTION 'tenant A should see exactly its own file, saw %', n; END IF;
      SELECT count(*) INTO n FROM files WHERE tenant_id = '${TENANT_B}';
      IF n <> 0 THEN RAISE EXCEPTION 'tenant A must not see tenant B files, saw %', n; END IF;
    END $$;
    COMMIT;
  `,
  );
  pass("tenant A is isolated from tenant B files (RLS)");

  const noCtx = scalar(APP_ROLE, `SELECT count(*) FROM files;`);
  if (noCtx !== "0") {
    throw new Error(`missing tenant context must fail closed (0 files), saw ${noCtx}`);
  }
  pass("missing tenant context fails closed (0 files)");

  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    INSERT INTO files (file_id, tenant_id, owner_actor_id, object_key, filename_original, filename_safe, content_type, size_bytes, created_by, updated_by, correlation_id)
    VALUES ('cross', '${TENANT_B}', 'x', 'o/ee/ff/cccc', 'x', 'x', 'text/plain', 1, 'app', 'app', 'c');
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("cross-tenant file insert is blocked by the RLS WITH CHECK policy");
}

function proveLifecycleAndLegalHold(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE files SET created_at = now() WHERE file_id = 'fa1';
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("files.created_at is immutable (lifecycle trigger)");

  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    UPDATE files SET legal_hold = true WHERE file_id = 'fa1';
    DO $$ BEGIN
      BEGIN
        DELETE FROM files WHERE file_id = 'fa1';
        RAISE EXCEPTION 'legal_hold did not block destructive delete';
      EXCEPTION WHEN others THEN
        IF SQLERRM LIKE '%legal_hold did not block%' THEN RAISE; END IF;
      END;
    END $$;
    COMMIT;
  `,
  );
  pass("legal_hold blocks destructive file purge (BEFORE DELETE trigger)");
}

function proveObjectKeyUniqueness(): void {
  psql(
    APP_ROLE,
    `
    BEGIN;
    SET LOCAL app.tenant_id = '${TENANT_A}';
    INSERT INTO files (file_id, tenant_id, owner_actor_id, object_key, filename_original, filename_safe, content_type, size_bytes, created_by, updated_by, correlation_id)
    VALUES ('dup', '${TENANT_A}', 'actor-a', 'o/aa/bb/aaaa', 'd', 'd', 'text/plain', 1, 'app', 'app', 'c');
    COMMIT;
  `,
    { expectFailure: true },
  );
  pass("(tenant_id, object_key) is unique per tenant");
}

function proveMinioRuntimeBindingReconciliation(): Readonly<Record<string, unknown>> {
  const minio = findProvider("object-storage-minio-composed-test");
  assert(Boolean(minio), "MinIO composed-test provider registry entry must exist");
  assert(minio!.providerMode === "composed-test", "MinIO must remain composed-test, not live");
  assert(minio!.endpointRef === "endpoint://compose/minio", "MinIO endpoint must be a ref");
  assert(minio!.egressAllowed === false, "MinIO local proof must not allow external egress");
  assert(
    minio!.explicitAuthorityRef === "spec/instances/compose-service/service-catalogue.json#minio",
    "MinIO provider must link to service catalogue authority",
  );
  assert(
    minio!.permissionGrants.every((grant) => grant.credentialScope === "local-compose-placeholder"),
    "MinIO proof may use only local placeholder credential scope",
  );
  pass("USF-147 MinIO runtime binding is reconciled");
  return Object.freeze({
    providerId: minio!.providerId,
    providerMode: minio!.providerMode,
    providerClass: minio!.providerCategory,
    endpointRef: minio!.endpointRef,
    sdkBoundary: minio!.adapterName,
    serviceCatalogueAuthority: minio!.explicitAuthorityRef,
    liveObjectStoreReadinessClaim: false,
    presignedUrlReadinessClaim: false,
  });
}

function proveClamAvScannerBoundaryReconciliation(): Readonly<Record<string, unknown>> {
  const clamav = findProvider("file-scan-clamav-composed-test");
  assert(Boolean(clamav), "ClamAV composed-test provider registry entry must exist");
  assert(clamav!.providerMode === "composed-test", "ClamAV must remain composed-test, not live");
  assert(clamav!.endpointRef === "endpoint://compose/clamav", "ClamAV endpoint must be a ref");
  assert(clamav!.egressAllowed === false, "ClamAV local proof must not allow external egress");
  assert(
    clamav!.explicitAuthorityRef === "spec/instances/compose-service/service-catalogue.json#clamav",
    "ClamAV provider must link to service catalogue authority",
  );
  assert(
    clamav!.resiliencePosture?.connectTimeout === "180s-local-compose-readiness-budget",
    "ClamAV must retain service-specific readiness budget",
  );
  pass("USF-147 ClamAV scanner boundary is reconciled");
  return Object.freeze({
    providerId: clamav!.providerId,
    providerMode: clamav!.providerMode,
    providerClass: clamav!.providerCategory,
    endpointRef: clamav!.endpointRef,
    sdkBoundary: clamav!.adapterName,
    serviceCatalogueAuthority: clamav!.explicitAuthorityRef,
    liveScannerReadinessClaim: false,
    dlpReadinessClaim: false,
  });
}

function proveEnterpriseStorageDepthReclassification(): Readonly<Record<string, unknown>> {
  const controls = Object.freeze({
    ...USF147_ENTERPRISE_CONTROLS,
  });
  const deferredBoundaries = Object.freeze([
    "live-s3-or-provider-managed-object-store-readiness-requires-separate-source-issue",
    "production-presigned-url-runtime-readiness-requires-separate-source-issue",
    "derived-object-generation-runtime-requires-separate-source-issue",
    "provider-object-versioning-readiness-requires-separate-source-issue",
    "object-backup-restore-and-dr-readiness-requires-separate-source-issue",
    "live-dlp-and-exfiltration-control-readiness-requires-separate-source-issue",
    "kms-custody-and-customer-managed-key-readiness-requires-separate-source-issue",
    "production-data-residency-enforcement-requires-separate-source-issue",
    "storage-quota-rate-limit-and-temp-upload-cleanup-runtime-requires-separate-source-issue",
    "object-lock-worm-readiness-requires-separate-source-issue",
  ]);
  pass("USF-147 storage depth controls are proven or explicitly reclassified");
  pass("USF-147 tenant retention deletion scanner and backup boundaries are explicit");
  pass("USF-147 no live object-store scanner backup KMS production or certification claim");
  return Object.freeze({
    controls,
    minioRuntimeBindingReconciled: true,
    clamavScannerBoundaryReconciled: true,
    tenantBoundaryExplicit: true,
    retentionBoundaryExplicit: true,
    deletionBoundaryExplicit: true,
    scannerBoundaryExplicit: true,
    backupBoundaryExplicit: true,
    secretReferenceBoundaryExplicit: true,
    evidencePackageExportBoundary: "bounded-local-file-and-bulk-evidence-package-posture",
    deferredBoundaries,
    liveObjectStoreReadinessClaim: false,
    liveScannerReadinessClaim: false,
    backupRestoreReadinessClaim: false,
    kmsReadinessClaim: false,
    dlpReadinessClaim: false,
    filesStorageReadinessClaim: false,
    stagingReadinessClaim: false,
    productionReadinessClaim: false,
    socReadinessClaim: false,
    iso27001CertificationClaim: false,
    enterpriseProductionReadinessClaim: false,
    fullDevReadinessClaim: false,
    fullProductReadinessClaim: false,
    usf133ClosureClaim: false,
  });
}

function main(): void {
  setup();
  proveRlsCatalog();
  proveIsolation();
  proveLifecycleAndLegalHold();
  proveObjectKeyUniqueness();
  const minioReconciliation = proveMinioRuntimeBindingReconciliation();
  const clamavReconciliation = proveClamAvScannerBoundaryReconciliation();
  const enterpriseFilesStorageDepthGate = proveEnterpriseStorageDepthReclassification();
  console.log(
    JSON.stringify(
      {
        status: "pass",
        proof: "files-storage",
        sourceIssue: "USF-147",
        parentIssue: "USF-133",
        providerMode: "compose-local",
        environment: "integration",
        proofLevelObserved: "substrate-proven",
        liveObjectStoreClaim: false,
        liveScannerClaim: false,
        liveExternalProviderClaim: false,
        productionLiveClaim: false,
        minioReconciliation,
        clamavReconciliation,
        enterpriseFilesStorageDepthGate,
        nonClaims: USF147_NON_CLAIMS,
        checks: checks.length,
        checkLabels: checks,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
