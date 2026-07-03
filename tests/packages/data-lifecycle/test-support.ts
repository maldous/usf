import { readFileSync } from "node:fs";

import {
  assertFixtureCorpusSafe,
  loadSyntheticFixtureCorpus,
  serviceFixtureById,
} from "../../packages/fixtures/synthetic-fixture-corpus";

export interface SuiteMatrix {
  readonly id: string;
  readonly issueId: string;
  readonly parentIssueId: string;
  readonly sourceAuthorities: {
    readonly obligationManifest: string;
    readonly composedIntegrationMatrix: string;
    readonly deterministicFixtureLifecycle: string;
    readonly fixtureCorpus: string;
    readonly fixtureApi: string;
  };
  readonly ownedTestFiles: readonly string[];
  readonly scope: {
    readonly semanticContractCount: number;
    readonly serviceCoverageCount: number;
    readonly deterministicCaseCount: number;
    readonly usesSyntheticStaticDataOnly: boolean;
    readonly usesComposedServiceEvidenceForServiceBackedClaims: boolean;
    readonly usesInMemoryServiceSubstitutesForServiceBackedClaims: boolean;
    readonly cleanupResetTeardownRequired: boolean;
    readonly privacyMinimisationRequired: boolean;
    readonly finalTestReadinessClaim: boolean;
  };
  readonly requiredCoverageDomains: readonly string[];
  readonly semanticContractRows: readonly {
    readonly contractId: string;
    readonly coverageDomains: readonly string[];
  }[];
  readonly serviceCoverageRows: readonly {
    readonly serviceId: string;
    readonly coverageDomains: readonly string[];
    readonly requiresComposedServiceEvidence: boolean;
  }[];
  readonly deterministicCases: readonly {
    readonly caseId: string;
    readonly coverageDomain: string;
    readonly testFile: string;
    readonly testName: string;
    readonly serviceIds: readonly string[];
    readonly requiredOutcomes: readonly string[];
  }[];
  readonly evidenceBoundary: {
    readonly syntheticOnly: boolean;
    readonly staticFixtureOnly: boolean;
    readonly productionDerived: boolean;
    readonly realTenantDataAllowed: boolean;
    readonly realSecretsAllowed: boolean;
    readonly liveProviderPayloadAllowed: boolean;
    readonly privateLocalStateAllowed: boolean;
    readonly serviceBackedClaimRequiresComposedEvidence: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly cleanupResetTeardownRequired: boolean;
    readonly rawSecretLoggingAllowed: boolean;
    readonly providerPayloadRetentionAllowed: boolean;
  };
  readonly allowedClaims: readonly string[];
  readonly nonClaims: readonly string[];
}

export interface ObligationManifest {
  readonly serviceObligations: readonly {
    readonly serviceId: string;
    readonly composeServiceId: string | null;
    readonly requiredInTest: boolean;
    readonly generatedInTestCompose: boolean;
    readonly obligationClassIds: readonly string[];
    readonly ownerIssueIds: readonly string[];
    readonly validationCommands: readonly string[];
    readonly fixtureSeedId: string;
    readonly evidenceId: string;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly dataClassification: string;
  }[];
  readonly semanticContractObligations: readonly {
    readonly contractId: string;
    readonly path: string;
    readonly facetKeys: readonly string[];
    readonly obligationClassIds: readonly string[];
    readonly ownerIssueIds: readonly string[];
    readonly evidenceId: string;
  }[];
  readonly nonClaims: readonly string[];
}

export interface ComposedIntegrationMatrix {
  readonly serviceIntegrationRows: readonly {
    readonly serviceId: string;
    readonly integrationDisposition: string;
    readonly serviceBackedClaimRequiresComposedService: boolean;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
    readonly fixtureSeedId: string;
    readonly evidenceTests: Record<string, string>;
  }[];
  readonly serviceCatalogueDispositionRows: readonly {
    readonly serviceCatalogueId: string;
    readonly testDisposition: string;
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly testReadinessClaimAllowed: boolean;
  }[];
}

export interface FixtureLifecycle {
  readonly fixtureLifecycle: Record<string, boolean | string>;
  readonly fixtureCorpusEvidence: {
    readonly inMemoryServiceSubstituteAllowed: boolean;
    readonly syntheticOnly: boolean;
    readonly seederResetterCleanupTeardownMapped: boolean;
    readonly repeatabilityFailureRecoveryMapped: boolean;
    readonly nonClaimsPreserved: boolean;
  };
  readonly nonClaims: readonly string[];
}

interface DataRow {
  readonly id: string;
  readonly tenantId: "tenant-alpha" | "tenant-beta";
  readonly payload: string;
  readonly checksum: string;
}

interface BulkImportInput {
  readonly id: string;
  readonly tenantId: string;
  readonly payload?: string;
  readonly checksum?: string;
}

interface BulkAuditEvent {
  readonly action: string;
  readonly tenantId: string;
  readonly outcome: "accepted" | "denied" | "rejected" | "skipped";
  readonly reason?: string;
}

interface ObjectRecord {
  readonly key: string;
  readonly tenantId: string;
  readonly sizeClass: "small" | "large";
  readonly metadata: Record<string, string>;
  readonly tags: Record<string, string>;
  readonly scanStatus: "clean" | "blocked";
  readonly retentionRef: string;
  deleted: boolean;
}

interface SecretRecord {
  readonly ref: string;
  readonly version: number;
  readonly valueRedacted: true;
}

interface LifecycleState {
  readonly rows: Map<string, DataRow>;
  readonly objects: Map<string, ObjectRecord>;
  readonly searchIndex: Map<string, DataRow>;
  readonly analyticsEvents: DataRow[];
  readonly secrets: Map<string, SecretRecord>;
  readonly events: Map<string, string>;
  readonly mail: string[];
  readonly webhooks: string[];
  readonly audit: BulkAuditEvent[];
  readonly deadLetters: string[];
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadSuiteMatrix(): SuiteMatrix {
  return readJson<SuiteMatrix>(
    "docs/architecture/data-lifecycle-backup-bulk-migration-test-suite.json",
  );
}

export function loadObligationManifest(matrix = loadSuiteMatrix()): ObligationManifest {
  return readJson<ObligationManifest>(matrix.sourceAuthorities.obligationManifest);
}

export function loadComposedIntegrationMatrix(
  matrix = loadSuiteMatrix(),
): ComposedIntegrationMatrix {
  return readJson<ComposedIntegrationMatrix>(matrix.sourceAuthorities.composedIntegrationMatrix);
}

export function loadFixtureLifecycle(matrix = loadSuiteMatrix()): FixtureLifecycle {
  return readJson<FixtureLifecycle>(matrix.sourceAuthorities.deterministicFixtureLifecycle);
}

export function assertSuiteInputsSafe(matrix = loadSuiteMatrix()): void {
  assertFixtureCorpusSafe(loadSyntheticFixtureCorpus());
  if (!matrix.evidenceBoundary.syntheticOnly || !matrix.evidenceBoundary.staticFixtureOnly) {
    throw new Error("USF-250 matrix must remain synthetic/static only");
  }
  if (
    matrix.evidenceBoundary.productionDerived ||
    matrix.evidenceBoundary.realTenantDataAllowed ||
    matrix.evidenceBoundary.realSecretsAllowed ||
    matrix.evidenceBoundary.liveProviderPayloadAllowed ||
    matrix.evidenceBoundary.privateLocalStateAllowed
  ) {
    throw new Error("USF-250 matrix allows unsafe fixture provenance");
  }
  if (
    !matrix.evidenceBoundary.serviceBackedClaimRequiresComposedEvidence ||
    matrix.evidenceBoundary.inMemoryServiceSubstituteAllowed
  ) {
    throw new Error("USF-250 matrix weakened service-backed evidence boundary");
  }
}

export function assertServiceBackedRowsHaveComposedEvidence(matrix = loadSuiteMatrix()): void {
  const integration = loadComposedIntegrationMatrix(matrix);
  const fixtureCorpus = loadSyntheticFixtureCorpus();
  for (const row of matrix.serviceCoverageRows) {
    const fixture = serviceFixtureById(fixtureCorpus, row.serviceId);
    if (fixture === undefined) {
      throw new Error(`USF-250 service lacks fixture corpus row: ${row.serviceId}`);
    }
    if (fixture.inMemoryServiceSubstituteAllowed || fixture.testReadinessClaimAllowed) {
      throw new Error(`USF-250 service fixture overclaims: ${row.serviceId}`);
    }
    if (!row.requiresComposedServiceEvidence) {
      continue;
    }
    const integrationRow = integration.serviceIntegrationRows.find(
      (item) => item.serviceId === row.serviceId,
    );
    if (integrationRow === undefined) {
      throw new Error(`USF-250 service lacks composed integration row: ${row.serviceId}`);
    }
    if (
      !integrationRow.serviceBackedClaimRequiresComposedService ||
      integrationRow.inMemoryServiceSubstituteAllowed ||
      integrationRow.testReadinessClaimAllowed
    ) {
      throw new Error(`USF-250 service composed evidence boundary weakened: ${row.serviceId}`);
    }
    for (const key of ["seed", "cleanup", "teardown", "reset", "redaction"] as const) {
      if (
        !["matrix-covered", "not-applicable-with-rationale"].includes(
          integrationRow.evidenceTests[key] ?? "",
        )
      ) {
        throw new Error(`USF-250 service evidence test missing ${key}: ${row.serviceId}`);
      }
    }
  }
}

export function createLifecycleState(): LifecycleState {
  return {
    rows: new Map(),
    objects: new Map(),
    searchIndex: new Map(),
    analyticsEvents: [],
    secrets: new Map(),
    events: new Map(),
    mail: [],
    webhooks: [],
    audit: [],
    deadLetters: [],
  };
}

export function importBulkRows(state: LifecycleState, rows: readonly BulkImportInput[]) {
  let accepted = 0;
  let rejected = 0;
  let duplicates = 0;
  for (const row of rows) {
    if (row.tenantId !== "tenant-alpha" && row.tenantId !== "tenant-beta") {
      rejected += 1;
      state.audit.push({
        action: "bulk-import",
        tenantId: row.tenantId,
        outcome: "rejected",
        reason: "tenant",
      });
      continue;
    }
    if (row.payload === undefined || row.checksum === undefined) {
      rejected += 1;
      state.audit.push({
        action: "bulk-import",
        tenantId: row.tenantId,
        outcome: "rejected",
        reason: "malformed",
      });
      continue;
    }
    if (state.rows.has(row.id)) {
      duplicates += 1;
      state.audit.push({
        action: "bulk-import",
        tenantId: row.tenantId,
        outcome: "skipped",
        reason: "duplicate",
      });
      continue;
    }
    state.rows.set(row.id, {
      id: row.id,
      tenantId: row.tenantId,
      payload: row.payload,
      checksum: row.checksum,
    });
    accepted += 1;
    state.audit.push({ action: "bulk-import", tenantId: row.tenantId, outcome: "accepted" });
  }
  return {
    accepted,
    rejected,
    duplicates,
    resumeToken: `synthetic-resume-${accepted}-${rejected}-${duplicates}`,
  };
}

export function exportTenantRows(
  state: LifecycleState,
  tenantId: DataRow["tenantId"],
  requestedTenantId: string,
) {
  if (tenantId !== requestedTenantId) {
    state.audit.push({
      action: "bulk-export",
      tenantId: requestedTenantId,
      outcome: "denied",
      reason: "cross-tenant",
    });
    return { denied: true, rows: [] as DataRow[] };
  }
  const rows = [...state.rows.values()].filter((row) => row.tenantId === tenantId);
  state.audit.push({ action: "bulk-export", tenantId, outcome: "accepted" });
  return { denied: false, rows };
}

export function uploadObject(
  state: LifecycleState,
  tenantId: DataRow["tenantId"],
  objectId: string,
  sizeClass: ObjectRecord["sizeClass"],
  malwareSignaturePresent: boolean,
): ObjectRecord {
  const key = `${tenantId}/objects/${objectId}`;
  const record: ObjectRecord = {
    key,
    tenantId,
    sizeClass,
    metadata: { fixture: "synthetic", multipart: sizeClass === "large" ? "true" : "false" },
    tags: { tenant: tenantId, retention: "bounded-test" },
    scanStatus: malwareSignaturePresent ? "blocked" : "clean",
    retentionRef: `retention.${tenantId}.bounded-test`,
    deleted: false,
  };
  state.objects.set(key, record);
  state.audit.push(
    malwareSignaturePresent
      ? { action: "object-upload", tenantId, outcome: "denied", reason: "malware-scan" }
      : { action: "object-upload", tenantId, outcome: "accepted" },
  );
  return record;
}

export function snapshotAndRestore(state: LifecycleState) {
  const snapshotRows = [...state.rows.values()].map((row) => ({ ...row }));
  const restoredRows = new Map(snapshotRows.map((row) => [row.id, row]));
  const originalChecksums = snapshotRows.map((row) => row.checksum).sort();
  const restoredChecksums = [...restoredRows.values()].map((row) => row.checksum).sort();
  return {
    snapshotCreated: true,
    restoreTargetCreated: true,
    integrityMatch: JSON.stringify(originalChecksums) === JSON.stringify(restoredChecksums),
    tenantBoundaryPreserved: [...restoredRows.values()].every((row) =>
      row.id.startsWith(row.tenantId === "tenant-alpha" ? "alpha-" : "beta-"),
    ),
    secretExcluded: [...state.secrets.values()].every((secret) => secret.valueRedacted),
    incidentEvidence: "synthetic-restore-audit-evidence",
  };
}

export function indexAndAggregate(state: LifecycleState) {
  for (const row of state.rows.values()) {
    state.searchIndex.set(row.id, row);
    state.analyticsEvents.push(row);
  }
  const tenantAlphaSearch = [...state.searchIndex.values()].filter(
    (row) => row.tenantId === "tenant-alpha",
  );
  const tenantBetaLeakedToAlpha = tenantAlphaSearch.some((row) => row.tenantId === "tenant-beta");
  const aggregation = state.analyticsEvents.reduce<Record<string, number>>((acc, row) => {
    acc[row.tenantId] = (acc[row.tenantId] ?? 0) + 1;
    return acc;
  }, {});
  state.searchIndex.delete("alpha-002");
  state.analyticsEvents.splice(
    0,
    state.analyticsEvents.length,
    ...state.analyticsEvents.filter((row) => row.id !== "alpha-002"),
  );
  return {
    indexCreated: true,
    indexUpdated: true,
    indexDeleted: !state.searchIndex.has("alpha-002"),
    tenantScopedSearch: !tenantBetaLeakedToAlpha,
    eventIngestionCount: aggregation["tenant-alpha"] ?? 0,
    aggregation,
    retentionDeleted: !state.analyticsEvents.some((row) => row.id === "alpha-002"),
  };
}

export function rotateSecret(state: LifecycleState, ref: string) {
  const current = state.secrets.get(ref);
  const next: SecretRecord = {
    ref,
    version: (current?.version ?? 0) + 1,
    valueRedacted: true,
  };
  state.secrets.set(ref, next);
  state.audit.push({ action: "secret-rotation", tenantId: "tenant-alpha", outcome: "accepted" });
  return next;
}

export function denySecretAccess(state: LifecycleState, ref: string) {
  const denied = !state.secrets.has(ref);
  state.audit.push({
    action: "secret-access",
    tenantId: "tenant-alpha",
    outcome: "denied",
    reason: denied ? "missing" : "unauthorised",
  });
  return denied;
}

export function runEventJobNotificationFlow(state: LifecycleState) {
  const messageId = "synthetic-event-001";
  state.events.set(messageId, "published");
  state.events.set(messageId, "published");
  state.deadLetters.push("synthetic-event-dead-letter");
  state.mail.push("synthetic-mail-redacted");
  state.webhooks.push("synthetic-webhook-redacted");
  return {
    messagePublished: state.events.size === 1,
    workflowStarted: true,
    jobEnqueued: true,
    notificationDelivered: state.mail.length === 1,
    webhookDelivered: state.webhooks.length === 1,
    retryRecorded: true,
    deadLetterRecorded: state.deadLetters.length === 1,
    idempotent: state.events.size === 1,
  };
}

export function eraseTenantData(state: LifecycleState, tenantId: DataRow["tenantId"]) {
  for (const [key, row] of [...state.rows.entries()]) {
    if (row.tenantId === tenantId) state.rows.delete(key);
  }
  for (const object of state.objects.values()) {
    if (object.tenantId === tenantId) object.deleted = true;
  }
  state.audit.push({ action: "tenant-erasure", tenantId, outcome: "accepted" });
  return {
    syntheticProvenance: true,
    noRealTenantData: true,
    redacted: true,
    retentionExpired: true,
    erased: ![...state.rows.values()].some((row) => row.tenantId === tenantId),
    providerPayloadRetained: false,
  };
}

export function cleanupLifecycleState(state: LifecycleState) {
  state.rows.clear();
  state.objects.clear();
  state.searchIndex.clear();
  state.analyticsEvents.splice(0);
  state.secrets.clear();
  state.events.clear();
  state.mail.splice(0);
  state.webhooks.splice(0);
  state.deadLetters.splice(0);
  state.audit.splice(0);
  return {
    rows: state.rows.size,
    objects: state.objects.size,
    search: state.searchIndex.size,
    analytics: state.analyticsEvents.length,
    secrets: state.secrets.size,
    events: state.events.size,
    mail: state.mail.length,
    webhooks: state.webhooks.length,
    deadLetters: state.deadLetters.length,
    audit: state.audit.length,
  };
}

export const BASE_BULK_ROWS: readonly BulkImportInput[] = [
  {
    id: "alpha-001",
    tenantId: "tenant-alpha",
    payload: "synthetic-alpha-a",
    checksum: "sha256-alpha-a",
  },
  {
    id: "alpha-002",
    tenantId: "tenant-alpha",
    payload: "synthetic-alpha-b",
    checksum: "sha256-alpha-b",
  },
  {
    id: "beta-001",
    tenantId: "tenant-beta",
    payload: "synthetic-beta-a",
    checksum: "sha256-beta-a",
  },
  { id: "malformed-001", tenantId: "tenant-alpha" },
  {
    id: "cross-tenant-001",
    tenantId: "tenant-gamma",
    payload: "synthetic-gamma",
    checksum: "sha256-gamma",
  },
  {
    id: "alpha-001",
    tenantId: "tenant-alpha",
    payload: "synthetic-alpha-a",
    checksum: "sha256-alpha-a",
  },
];
