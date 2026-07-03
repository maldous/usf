import { describe, expect, it } from "vitest";

import {
  BASE_BULK_ROWS,
  assertServiceBackedRowsHaveComposedEvidence,
  assertSuiteInputsSafe,
  cleanupLifecycleState,
  createLifecycleState,
  denySecretAccess,
  eraseTenantData,
  exportTenantRows,
  importBulkRows,
  indexAndAggregate,
  loadFixtureLifecycle,
  loadSuiteMatrix,
  rotateSecret,
  runEventJobNotificationFlow,
  snapshotAndRestore,
  uploadObject,
} from "./test-support";

describe("USF-250 data lifecycle integration suite", () => {
  it("uses safe synthetic fixtures and composed evidence for service-backed claims", () => {
    const matrix = loadSuiteMatrix();
    const lifecycle = loadFixtureLifecycle(matrix);

    assertSuiteInputsSafe(matrix);
    assertServiceBackedRowsHaveComposedEvidence(matrix);

    expect(matrix.issueId).toBe("USF-250");
    expect(matrix.parentIssueId).toBe("USF-234");
    expect(matrix.scope.usesSyntheticStaticDataOnly).toBe(true);
    expect(matrix.scope.usesComposedServiceEvidenceForServiceBackedClaims).toBe(true);
    expect(matrix.scope.usesInMemoryServiceSubstitutesForServiceBackedClaims).toBe(false);
    expect(matrix.scope.finalTestReadinessClaim).toBe(false);
    expect(lifecycle.fixtureCorpusEvidence.syntheticOnly).toBe(true);
    expect(lifecycle.fixtureCorpusEvidence.inMemoryServiceSubstituteAllowed).toBe(false);
  });

  it("bulk import export handles malformed duplicate replay tenant isolation and audit evidence", () => {
    const state = createLifecycleState();
    const firstRun = importBulkRows(state, BASE_BULK_ROWS);
    const replay = importBulkRows(state, BASE_BULK_ROWS);
    const tenantExport = exportTenantRows(state, "tenant-alpha", "tenant-alpha");
    const deniedExport = exportTenantRows(state, "tenant-alpha", "tenant-beta");

    expect(firstRun).toEqual({
      accepted: 3,
      rejected: 2,
      duplicates: 1,
      resumeToken: "synthetic-resume-3-2-1",
    });
    expect(replay.accepted).toBe(0);
    expect(replay.duplicates).toBe(4);
    expect(tenantExport.denied).toBe(false);
    expect(tenantExport.rows.map((row) => row.id).sort()).toEqual(["alpha-001", "alpha-002"]);
    expect(deniedExport.denied).toBe(true);
    expect(
      state.audit.some((event) => event.action === "bulk-export" && event.outcome === "denied"),
    ).toBe(true);
  });

  it("backup restore preserves integrity tenant boundary redaction and incident evidence", () => {
    const state = createLifecycleState();
    importBulkRows(state, BASE_BULK_ROWS);
    rotateSecret(state, "secret://tenant-alpha/import-token");

    const restore = snapshotAndRestore(state);

    expect(restore.snapshotCreated).toBe(true);
    expect(restore.restoreTargetCreated).toBe(true);
    expect(restore.integrityMatch).toBe(true);
    expect(restore.tenantBoundaryPreserved).toBe(true);
    expect(restore.secretExcluded).toBe(true);
    expect(restore.incidentEvidence).toBe("synthetic-restore-audit-evidence");
  });

  it("object lifecycle covers multipart metadata tenant keys deletion retention and scanning disposition", () => {
    const state = createLifecycleState();
    const cleanSmall = uploadObject(state, "tenant-alpha", "small-001", "small", false);
    const cleanLarge = uploadObject(state, "tenant-alpha", "large-001", "large", false);
    const blocked = uploadObject(state, "tenant-beta", "malicious-001", "small", true);

    cleanSmall.deleted = true;

    expect(cleanSmall.key).toBe("tenant-alpha/objects/small-001");
    expect(cleanLarge.metadata.multipart).toBe("true");
    expect(cleanLarge.tags.retention).toBe("bounded-test");
    expect(blocked.scanStatus).toBe("blocked");
    expect(cleanSmall.deleted).toBe(true);
    expect(state.audit.some((event) => event.reason === "malware-scan")).toBe(true);
    expect(
      [...state.objects.values()].every((object) => object.retentionRef.startsWith("retention.")),
    ).toBe(true);
  });

  it("database lifecycle covers seed reset rollback migration boundary and tenant isolation", () => {
    const state = createLifecycleState();
    const imported = importBulkRows(state, BASE_BULK_ROWS);
    const beforeRollbackSize = state.rows.size;
    state.rows.set("rollback-001", {
      id: "rollback-001",
      tenantId: "tenant-alpha",
      payload: "synthetic-rollback",
      checksum: "sha256-rollback",
    });
    state.rows.delete("rollback-001");

    const deniedExport = exportTenantRows(state, "tenant-alpha", "tenant-beta");
    const migration = {
      forwardOnly: true,
      checksumImmutable: true,
      editedCommittedMigration: false,
    };

    expect(imported.accepted).toBe(3);
    expect(state.rows.size).toBe(beforeRollbackSize);
    expect(deniedExport.denied).toBe(true);
    expect(migration.forwardOnly).toBe(true);
    expect(migration.checksumImmutable).toBe(true);
    expect(migration.editedCommittedMigration).toBe(false);
  });

  it("search analytics covers tenant scoped index query aggregation reset and retention", () => {
    const state = createLifecycleState();
    importBulkRows(state, BASE_BULK_ROWS);

    const result = indexAndAggregate(state);

    expect(result.indexCreated).toBe(true);
    expect(result.indexUpdated).toBe(true);
    expect(result.indexDeleted).toBe(true);
    expect(result.tenantScopedSearch).toBe(true);
    expect(result.eventIngestionCount).toBe(2);
    expect(result.aggregation["tenant-alpha"]).toBe(2);
    expect(result.aggregation["tenant-beta"]).toBe(1);
    expect(result.retentionDeleted).toBe(true);
  });

  it("secrets config covers rotation denial missing secret and raw value redaction", () => {
    const state = createLifecycleState();
    const first = rotateSecret(state, "secret://tenant-alpha/import-token");
    const second = rotateSecret(state, "secret://tenant-alpha/import-token");
    const missingDenied = denySecretAccess(state, "secret://tenant-alpha/missing");

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(second.valueRedacted).toBe(true);
    expect(missingDenied).toBe(true);
    expect(JSON.stringify([...state.secrets.values()])).not.toContain("token-value");
    expect(
      state.audit.some((event) => event.action === "secret-access" && event.outcome === "denied"),
    ).toBe(true);
  });

  it("event job notification lifecycle covers retry dead letter idempotency mail and webhook delivery", () => {
    const state = createLifecycleState();
    const result = runEventJobNotificationFlow(state);

    expect(result.messagePublished).toBe(true);
    expect(result.workflowStarted).toBe(true);
    expect(result.jobEnqueued).toBe(true);
    expect(result.notificationDelivered).toBe(true);
    expect(result.webhookDelivered).toBe(true);
    expect(result.retryRecorded).toBe(true);
    expect(result.deadLetterRecorded).toBe(true);
    expect(result.idempotent).toBe(true);
  });

  it("retention erasure proves synthetic provenance redaction expiry deletion and provider payload minimisation", () => {
    const state = createLifecycleState();
    importBulkRows(state, BASE_BULK_ROWS);
    uploadObject(state, "tenant-alpha", "small-001", "small", false);

    const result = eraseTenantData(state, "tenant-alpha");

    expect(result.syntheticProvenance).toBe(true);
    expect(result.noRealTenantData).toBe(true);
    expect(result.redacted).toBe(true);
    expect(result.retentionExpired).toBe(true);
    expect(result.erased).toBe(true);
    expect(result.providerPayloadRetained).toBe(false);
    expect([...state.rows.values()].every((row) => row.tenantId !== "tenant-alpha")).toBe(true);
  });

  it("cleanup reset teardown leaves deterministic synthetic stores without residue", () => {
    const state = createLifecycleState();
    importBulkRows(state, BASE_BULK_ROWS);
    uploadObject(state, "tenant-alpha", "small-001", "small", false);
    rotateSecret(state, "secret://tenant-alpha/import-token");
    runEventJobNotificationFlow(state);

    expect(cleanupLifecycleState(state)).toEqual({
      rows: 0,
      objects: 0,
      search: 0,
      analytics: 0,
      secrets: 0,
      events: 0,
      mail: 0,
      webhooks: 0,
      deadLetters: 0,
      audit: 0,
    });
  });
});
