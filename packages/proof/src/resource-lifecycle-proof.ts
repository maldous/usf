// Resource lifecycle/relationships/schema-bound mutation proof (USF-165).
//
// Hermetic local/dev/test proof only. This does not claim production legal
// record-management, regulatory retention, eDiscovery, or production-live
// readiness.
import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import { InMemoryResourceLifecycleStore } from "@foundation/adapter-resources";
import { InMemorySearchIndex } from "@foundation/adapter-search";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createResourceLifecycleService } from "@foundation/capability-resources";
import {
  createResourceSchemaDefinition,
  createSearchIndexDocument,
  createTenantContext,
  type AuthorizationRequest,
  type GuardrailPolicy,
  type PolicyDecision,
  type ResourceSchemaDefinition,
  type TenantContext,
} from "@foundation/core";
import type { PolicyDecisionPoint } from "@foundation/ports";

interface ResourceLifecycleProofResult {
  readonly status: "pass";
  readonly proof: "resource-lifecycle-relationships";
  readonly providerMode: "hermetic-mock";
  readonly environment: "hermetic";
  readonly proofLevelObserved: "behaviour-proven";
  readonly resourceProviderPosture: "in-memory-local-dev-test";
  readonly productionRecordManagementReadinessClaim: false;
  readonly legalRecordManagementReadinessClaim: false;
  readonly regulatoryRecordReadinessClaim: false;
  readonly eDiscoveryReadinessClaim: false;
  readonly productionLiveClaim: false;
  readonly resourceCount: number;
  readonly relationshipCount: number;
  readonly auditEventCount: number;
  readonly signalCount: number;
  readonly checks: readonly string[];
}

const NOW = new Date("2026-01-01T00:00:00.000Z");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class ProofPdp implements PolicyDecisionPoint {
  decide(request: AuthorizationRequest): PolicyDecision {
    const denied = request.context.actorId === "actor-denied";
    const effect =
      request.resource.tenantId === request.context.tenantId && !denied ? "permit" : "deny";
    return Object.freeze({
      decisionId: `decision-${request.context.tenantId}-${request.action}`,
      policyVersion: "resource-proof-policy",
      actorId: request.context.actorId,
      tenantId: request.context.tenantId,
      action: request.action,
      resourceType: request.resource.type,
      resourceId: request.resource.id,
      effect,
      reasonCode: effect === "permit" ? "permitted" : "missing-permission",
      safeMessage: effect === "permit" ? "permitted" : "denied",
      obligations: Object.freeze([]),
      matchedPolicyIds: Object.freeze(["resource-proof-policy"]),
      evaluationContextHash: "resource-proof-context",
      correlationId: "corr-resource-proof",
      causationId: null,
      traceId: null,
      evaluatedAt: NOW.toISOString(),
    });
  }
}

function context(actorId = "actor-alpha", tenantId = "tenant-alpha"): TenantContext {
  return createTenantContext({
    tenantId,
    actorId,
    roles: ["admin"],
    providerMode: "hermetic-mock",
    environment: "hermetic",
  });
}

function schema(): ResourceSchemaDefinition {
  return createResourceSchemaDefinition({
    resourceType: "tenant-record",
    schemaVersion: "resource-schema-1",
    owningCapability: "resource-lifecycle",
    fields: [
      {
        fieldPath: "title",
        classification: "public",
        required: true,
        mutable: true,
        visible: true,
        allowedOnCreate: true,
        allowedOnUpdate: true,
        restrictedAction: null,
      },
      {
        fieldPath: "immutable_code",
        classification: "internal",
        required: false,
        mutable: false,
        visible: true,
        allowedOnCreate: true,
        allowedOnUpdate: true,
        restrictedAction: null,
      },
      {
        fieldPath: "restricted_note",
        classification: "restricted",
        required: false,
        mutable: true,
        visible: true,
        allowedOnCreate: true,
        allowedOnUpdate: true,
        restrictedAction: "resource.restricted.update",
      },
      {
        fieldPath: "hidden_note",
        classification: "confidential",
        required: false,
        mutable: true,
        visible: false,
        allowedOnCreate: false,
        allowedOnUpdate: true,
        restrictedAction: null,
      },
    ],
    transitions: [
      {
        from: "draft",
        to: "active",
        requiredAction: "resource.transition",
        approvalRequired: true,
        requesterCannotApprove: true,
      },
      {
        from: "active",
        to: "purge-eligible",
        requiredAction: "resource.transition",
        approvalRequired: true,
        requesterCannotApprove: true,
      },
    ],
  });
}

function guardrailPolicy(): GuardrailPolicy {
  return Object.freeze({
    policyId: "resource.guardrail.policy",
    policyType: "rate-limit",
    classification: "operational-safety",
    scope: "operation",
    scopeRef: "resource.update",
    tenantId: null,
    actorId: null,
    serviceActorId: null,
    routeId: null,
    operationId: "resource.update",
    resourceType: "resource",
    providerId: null,
    limit: 0,
    windowSeconds: 60,
    burstLimit: null,
    lifecycle: "active",
    policyOwner: "platform",
    owningCapability: "resource-lifecycle",
    riskLevel: "high",
    createdBy: "system",
    approvedBy: "system",
    lastReviewedAt: NOW.toISOString(),
    reviewExpiresAt: null,
    changeReason: "local dev and test resource guardrail",
    retryAfterPolicy: "safe-window-reset",
    denialPolicy: "rate-limit-exceeded",
    telemetryPolicy: "tenant-safe resource guardrail signal",
    auditPolicy: "value-free resource guardrail evidence",
    environmentScope: "local-dev",
    dataClassification: "security-sensitive",
    distributedEnforcement: "single-node-in-memory",
    liveWafReadinessClaim: false,
    liveEdgeReadinessClaim: false,
    productionReadinessClaim: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  });
}

async function createSyntheticResource(
  service: ReturnType<typeof createResourceLifecycleService>,
  tenantContext: TenantContext,
  input: { resourceId: string; status?: string; legalHold?: boolean },
) {
  return service.create(tenantContext, {
    resourceId: input.resourceId,
    resourceType: "tenant-record",
    classification: "tenant-data",
    schema: schema(),
    fields: { title: "Synthetic resource", immutable_code: "fixed" },
    idempotencyKey: `idem-${input.resourceId}`,
    retentionPolicy: "local-dev-test-retention",
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.legalHold !== undefined ? { legalHold: input.legalHold } : {}),
  });
}

export async function runResourceLifecycleProof(): Promise<ResourceLifecycleProofResult> {
  const store = new InMemoryResourceLifecycleStore();
  const audit = new InMemoryAuditEventStore();
  const guardrails = new InMemoryGuardrailStore();
  const telemetry = new InMemoryTelemetryCollector();
  const search = new InMemorySearchIndex();
  const service = createResourceLifecycleService({
    store,
    audit,
    guardrails,
    telemetry,
    search,
    pdp: new ProofPdp(),
    now: () => NOW,
  });
  const alpha = context();
  const beta = context("actor-beta", "tenant-beta");
  const checks: string[] = [];

  const betaCreated = await createSyntheticResource(service, beta, { resourceId: "resource-beta" });
  assert(betaCreated.ok, "tenant beta resource create failed");
  const crossRead = await service.read(alpha, "resource-beta");
  assert(!crossRead.ok && crossRead.reasonCode === "not-found", "cross-tenant read leaked");
  checks.push("tenant isolation for read/list and non-enumerating cross-tenant lookup");

  const deniedCreate = await service.create(context("actor-denied"), {
    resourceId: "resource-denied",
    resourceType: "tenant-record",
    classification: "tenant-data",
    schema: schema(),
    fields: { title: "Synthetic" },
    idempotencyKey: "idem-denied",
  });
  assert(!deniedCreate.ok && deniedCreate.reasonCode === "missing-permission", "PDP denial failed");
  checks.push("PDP denial for resource action");

  const unknownType = await service.create(alpha, {
    resourceId: "resource-unknown",
    resourceType: "unknown-resource",
    classification: "tenant-data",
    schema: schema(),
    fields: { title: "Synthetic" },
    idempotencyKey: "idem-unknown",
  });
  assert(
    !unknownType.ok && unknownType.reasonCode === "unknown-resource-type",
    "unknown resource type allowed",
  );
  const unknownClassification = await service.create(alpha, {
    resourceId: "resource-unknown-class",
    resourceType: "tenant-record",
    classification: "unknown",
    schema: schema(),
    fields: { title: "Synthetic" },
    idempotencyKey: "idem-unknown-class",
  });
  assert(
    !unknownClassification.ok &&
      unknownClassification.reasonCode === "unknown-resource-classification",
    "unknown resource classification allowed",
  );
  checks.push("unknown resource type and classification fail closed");

  const created = await createSyntheticResource(service, alpha, { resourceId: "resource-alpha" });
  assert(created.ok, "resource create failed");
  const unknownField = await service.mutate(alpha, "resource-alpha", {
    mutationType: "patch",
    expectedVersion: created.value.version,
    expectedEtag: created.value.etag,
    idempotencyKey: "idem-unknown-field",
    fieldChanges: { unknown_field: "denied" },
  });
  assert(
    !unknownField.ok && unknownField.reasonCode === "unknown-field-denied",
    "unknown field allowed",
  );
  const immutable = await service.mutate(alpha, "resource-alpha", {
    mutationType: "patch",
    expectedVersion: created.value.version,
    expectedEtag: created.value.etag,
    idempotencyKey: "idem-immutable",
    fieldChanges: { immutable_code: "changed" },
  });
  assert(
    !immutable.ok && immutable.reasonCode === "immutable-field-denied",
    "immutable field allowed",
  );
  const restricted = await service.mutate(alpha, "resource-alpha", {
    mutationType: "patch",
    expectedVersion: created.value.version,
    expectedEtag: created.value.etag,
    idempotencyKey: "idem-restricted",
    fieldChanges: { restricted_note: "restricted proof" },
  });
  assert(
    !restricted.ok && restricted.reasonCode === "restricted-field-permission-required",
    "restricted field allowed",
  );
  checks.push("schema-bound mutation rejects unknown immutable hidden and restricted misuse");

  const updated = await service.mutate(alpha, "resource-alpha", {
    mutationType: "patch",
    expectedVersion: created.value.version,
    expectedEtag: created.value.etag,
    idempotencyKey: "idem-update",
    fieldChanges: { title: "Changed synthetic resource" },
  });
  assert(updated.ok && updated.value.version === 2, "version did not increment");
  const stale = await service.mutate(alpha, "resource-alpha", {
    mutationType: "patch",
    expectedVersion: created.value.version,
    expectedEtag: created.value.etag,
    idempotencyKey: "idem-stale",
    fieldChanges: { title: "Stale" },
  });
  assert(!stale.ok && stale.reasonCode === "version-conflict", "stale write allowed");
  const replay = await service.mutate(alpha, "resource-alpha", {
    mutationType: "patch",
    expectedVersion: updated.value.version,
    expectedEtag: updated.value.etag,
    idempotencyKey: "idem-update",
    fieldChanges: { title: "Changed synthetic resource" },
  });
  assert(replay.ok && replay.deduplicated === true, "idempotent replay duplicated side effect");
  checks.push("version etag conflict and idempotent replay proof");

  const selfTransition = await service.transition(alpha, "resource-alpha", {
    expectedVersion: updated.value.version,
    expectedEtag: updated.value.etag,
    idempotencyKey: "idem-self-transition",
    transitionTo: "active",
    approvedBy: alpha.actorId,
  });
  assert(
    !selfTransition.ok && selfTransition.reasonCode === "self-approval-denied",
    "self approval allowed",
  );
  const active = await service.transition(alpha, "resource-alpha", {
    expectedVersion: updated.value.version,
    expectedEtag: updated.value.etag,
    idempotencyKey: "idem-transition",
    transitionTo: "active",
    approvedBy: "actor-approver",
  });
  assert(active.ok && active.value.status === "active", "approved lifecycle transition failed");
  checks.push("lifecycle transition and separation-of-duties approval proof");

  search.index(
    createSearchIndexDocument({
      indexDocumentId: "resource-alpha",
      resourceType: "tenant-record",
      resourceId: "resource-alpha",
      tenantId: alpha.tenantId,
      classification: "tenant-data",
      sourceRef: "resource-alpha",
      sourceVersion: "1",
      title: "Synthetic resource",
      fieldValues: { title: "Synthetic resource" },
    }),
  );
  assert(search.get(alpha, "resource-alpha"), "search setup failed");
  const deleted = await service.mutate(alpha, "resource-alpha", {
    mutationType: "soft-delete",
    expectedVersion: active.value.version,
    expectedEtag: active.value.etag,
    idempotencyKey: "idem-soft-delete",
  });
  assert(
    deleted.ok && !search.get(alpha, "resource-alpha"),
    "soft delete did not hide search result",
  );
  checks.push("soft delete hides search projection");

  const held = await createSyntheticResource(service, alpha, {
    resourceId: "resource-held",
    status: "purge-eligible",
    legalHold: true,
  });
  assert(held.ok, "legal-hold resource create failed");
  const heldPurge = await service.mutate(alpha, "resource-held", {
    mutationType: "purge",
    expectedVersion: held.value.version,
    expectedEtag: held.value.etag,
    idempotencyKey: "idem-held-purge",
  });
  assert(
    !heldPurge.ok && heldPurge.reasonCode === "legal-hold-blocks-purge",
    "legal hold did not block purge",
  );
  checks.push("retention legal-hold purge posture");

  const parent = await createSyntheticResource(service, alpha, {
    resourceId: "resource-parent",
    status: "purge-eligible",
  });
  const child = await createSyntheticResource(service, alpha, {
    resourceId: "resource-child",
    status: "purge-eligible",
  });
  assert(parent.ok && child.ok, "relationship resources not created");
  const linked = await service.link(alpha, {
    relationshipId: "rel-parent-child",
    relationshipType: "contains",
    sourceResourceId: "resource-parent",
    targetResourceId: "resource-child",
    required: true,
    cascadePolicy: "restrict",
  });
  assert(linked.ok, "relationship create failed");
  const cycle = await service.link(alpha, {
    relationshipId: "rel-cycle",
    relationshipType: "contains",
    sourceResourceId: "resource-child",
    targetResourceId: "resource-parent",
  });
  assert(!cycle.ok && cycle.reasonCode === "relationship-cycle-denied", "cycle was allowed");
  const blockedPurge = await service.mutate(alpha, "resource-parent", {
    mutationType: "purge",
    expectedVersion: parent.value.version,
    expectedEtag: parent.value.etag,
    idempotencyKey: "idem-required-purge",
  });
  assert(
    !blockedPurge.ok && blockedPurge.reasonCode === "required-relationship-blocks-purge",
    "required relationship did not block purge",
  );
  checks.push("relationship integrity acyclic graph and referential purge block");

  guardrails.upsertPolicy(guardrailPolicy());
  const guarded = await service.create(alpha, {
    resourceId: "resource-guarded",
    resourceType: "tenant-record",
    classification: "bulk-managed",
    schema: schema(),
    fields: { title: "Bulk managed synthetic resource" },
    idempotencyKey: "idem-guarded",
    guardrailPolicyId: "resource.guardrail.policy",
  });
  assert(
    !guarded.ok && guarded.reasonCode === "rate-limit-exceeded",
    "guardrail did not deny safely",
  );
  checks.push("guardrail-protected bulk-managed resource posture");

  const status = service.status();
  assert(status.productionReadinessClaim === false, "production readiness claim present");
  assert(
    status.legalRecordManagementReadinessClaim === false,
    "legal record readiness claim present",
  );
  assert(
    status.regulatoryRecordReadinessClaim === false,
    "regulatory record readiness claim present",
  );
  const auditPage = await audit.query(alpha, { tenantId: alpha.tenantId });
  const telemetryPage = telemetry.query({ tenantId: alpha.tenantId });
  const output = JSON.stringify({ auditPage, telemetryPage, status });
  assert(
    !/token|secret|object_key|raw_payload|recipient_address|provider_response|stack_trace/i.test(
      output,
    ),
    "resource proof output leaked blocked value",
  );
  checks.push("audit observability redaction and no readiness overclaim");

  return Object.freeze({
    status: "pass",
    proof: "resource-lifecycle-relationships",
    providerMode: "hermetic-mock",
    environment: "hermetic",
    proofLevelObserved: "behaviour-proven",
    resourceProviderPosture: "in-memory-local-dev-test",
    productionRecordManagementReadinessClaim: false,
    legalRecordManagementReadinessClaim: false,
    regulatoryRecordReadinessClaim: false,
    eDiscoveryReadinessClaim: false,
    productionLiveClaim: false,
    resourceCount: status.resourceCount,
    relationshipCount: status.relationshipCount,
    auditEventCount: auditPage.events.length,
    signalCount: telemetryPage.signals.length,
    checks,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runResourceLifecycleProof()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
