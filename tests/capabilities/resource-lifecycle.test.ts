import { InMemoryGuardrailStore } from "@foundation/adapter-guardrails";
import { InMemoryTelemetryCollector } from "@foundation/adapter-obs";
import { InMemoryResourceLifecycleStore } from "@foundation/adapter-resources";
import { InMemorySearchIndex } from "@foundation/adapter-search";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import { createResourceLifecycleService } from "@foundation/capability-resources";
import {
  ResourcePolicyError,
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
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-01-01T00:00:00.000Z");

class TestPdp implements PolicyDecisionPoint {
  constructor(private readonly allowed: ReadonlySet<string>) {}

  decide(request: AuthorizationRequest): PolicyDecision {
    const effect =
      request.resource.tenantId === request.context.tenantId && this.allowed.has(request.action)
        ? "permit"
        : "deny";
    return {
      decisionId: `decision-${request.context.tenantId}-${request.action}`,
      policyVersion: "resource-test-policy",
      actorId: request.context.actorId,
      tenantId: request.context.tenantId,
      action: request.action,
      resourceType: request.resource.type,
      resourceId: request.resource.id,
      effect,
      reasonCode: effect === "permit" ? "permitted" : "missing-permission",
      safeMessage: effect === "permit" ? "permitted" : "denied",
      obligations: [],
      matchedPolicyIds: ["resource-test-policy"],
      evaluationContextHash: "resource-test-context",
      correlationId: "corr-resource-test",
      causationId: null,
      traceId: null,
      evaluatedAt: NOW.toISOString(),
    };
  }
}

const allActions = new Set([
  "resource.create",
  "resource.read",
  "resource.list",
  "resource.update",
  "resource.transition",
  "resource.archive",
  "resource.restore",
  "resource.soft-delete",
  "resource.purge",
  "resource.lock",
  "resource.unlock",
  "resource.link",
  "resource.unlink",
]);

function tenant(actorId = "actor-alpha", tenantId = "tenant-alpha"): TenantContext {
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
  return {
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
  };
}

function setup(allowed: ReadonlySet<string> = allActions) {
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
    pdp: new TestPdp(allowed),
    now: () => NOW,
  });
  return { store, audit, guardrails, telemetry, search, service };
}

async function createRecord(
  service: ReturnType<typeof setup>["service"],
  context: TenantContext,
  input: {
    resourceId?: string;
    idempotencyKey?: string;
    status?: string;
    legalHold?: boolean;
  } = {},
) {
  return service.create(context, {
    resourceId: input.resourceId ?? "resource-alpha",
    resourceType: "tenant-record",
    classification: "tenant-data",
    schema: schema(),
    fields: { title: "Synthetic resource", immutable_code: "fixed" },
    idempotencyKey: input.idempotencyKey ?? `idem-${input.resourceId ?? "alpha"}`,
    retentionPolicy: "local-dev-test-retention",
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.legalHold !== undefined ? { legalHold: input.legalHold } : {}),
  });
}

describe("resource lifecycle relationships and schema-bound mutations", () => {
  it("tenant A cannot read, list, mutate, or link tenant B resources", async () => {
    const { service } = setup();
    const alpha = tenant();
    const beta = tenant("actor-beta", "tenant-beta");
    await expect(
      createRecord(service, beta, { resourceId: "resource-beta" }),
    ).resolves.toMatchObject({ ok: true });

    await expect(service.read(alpha, "resource-beta")).resolves.toMatchObject({
      ok: false,
      reasonCode: "not-found",
    });
    const list = await service.list(alpha);
    expect(list.ok && list.value.views).toHaveLength(0);
    await expect(
      service.link(alpha, {
        relationshipId: "rel-cross",
        relationshipType: "references",
        sourceResourceId: "resource-alpha",
        targetResourceId: "resource-beta",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "relationship-target-not-found" });
  });

  it("fails closed for missing tenant context, missing PDP permission, unknown type, and unknown classification", async () => {
    expect(() => tenant("actor-alpha", "")).toThrow();
    await expect(
      createRecord(setup(new Set()).service, tenant(), { resourceId: "resource-denied" }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "missing-permission" });
    await expect(
      setup().service.create(tenant(), {
        resourceId: "resource-unknown",
        resourceType: "unknown-resource",
        classification: "tenant-data",
        schema: schema(),
        fields: { title: "Synthetic" },
        idempotencyKey: "idem-unknown-type",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "unknown-resource-type" });
    await expect(
      setup().service.create(tenant(), {
        resourceId: "resource-unknown-class",
        resourceType: "tenant-record",
        classification: "unknown",
        schema: schema(),
        fields: { title: "Synthetic" },
        idempotencyKey: "idem-unknown-class",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "unknown-resource-classification" });
  });

  it("enforces schema-bound mutation safety, version conflicts, and idempotent replay", async () => {
    const { service } = setup();
    const context = tenant();
    const created = await createRecord(service, context);
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("resource create failed");

    await expect(
      service.mutate(context, "resource-alpha", {
        mutationType: "patch",
        expectedVersion: created.value.version,
        expectedEtag: created.value.etag,
        idempotencyKey: "idem-unknown-field",
        fieldChanges: { unknown_field: "denied" },
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "unknown-field-denied" });
    await expect(
      service.mutate(context, "resource-alpha", {
        mutationType: "patch",
        expectedVersion: created.value.version,
        expectedEtag: created.value.etag,
        idempotencyKey: "idem-immutable",
        fieldChanges: { immutable_code: "changed" },
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "immutable-field-denied" });
    await expect(
      service.mutate(context, "resource-alpha", {
        mutationType: "patch",
        expectedVersion: created.value.version,
        expectedEtag: created.value.etag,
        idempotencyKey: "idem-hidden",
        fieldChanges: { hidden_note: "secret" },
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "hidden-field-denied" });
    await expect(
      service.mutate(context, "resource-alpha", {
        mutationType: "patch",
        expectedVersion: created.value.version,
        expectedEtag: created.value.etag,
        idempotencyKey: "idem-restricted",
        fieldChanges: { restricted_note: "restricted proof" },
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "restricted-field-permission-required" });

    const updated = await service.mutate(context, "resource-alpha", {
      mutationType: "patch",
      expectedVersion: created.value.version,
      expectedEtag: created.value.etag,
      idempotencyKey: "idem-update-title",
      fieldChanges: { title: "Changed synthetic resource" },
    });
    expect(updated).toMatchObject({ ok: true });
    if (!updated.ok) throw new Error("resource update failed");
    expect(updated.value.version).toBe(2);

    await expect(
      service.mutate(context, "resource-alpha", {
        mutationType: "patch",
        expectedVersion: created.value.version,
        expectedEtag: created.value.etag,
        idempotencyKey: "idem-stale",
        fieldChanges: { title: "Stale" },
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "version-conflict" });
    await expect(
      service.mutate(context, "resource-alpha", {
        mutationType: "patch",
        expectedVersion: updated.value.version,
        expectedEtag: updated.value.etag,
        idempotencyKey: "idem-update-title",
        fieldChanges: { title: "Changed synthetic resource" },
      }),
    ).resolves.toMatchObject({ ok: true, deduplicated: true });
  });

  it("enforces lifecycle transition approval, legal hold, purge posture, and search removal", async () => {
    const { service, search } = setup();
    const context = tenant();
    const created = await createRecord(service, context, { resourceId: "resource-lifecycle" });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("create failed");
    await expect(
      service.transition(context, "resource-lifecycle", {
        expectedVersion: created.value.version,
        expectedEtag: created.value.etag,
        idempotencyKey: "idem-self-transition",
        transitionTo: "active",
        approvedBy: context.actorId,
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "self-approval-denied" });
    const active = await service.transition(context, "resource-lifecycle", {
      expectedVersion: created.value.version,
      expectedEtag: created.value.etag,
      idempotencyKey: "idem-transition-active",
      transitionTo: "active",
      approvedBy: "actor-approver",
    });
    expect(active).toMatchObject({ ok: true });
    if (!active.ok) throw new Error("transition failed");

    search.index(
      createSearchIndexDocument({
        indexDocumentId: "resource-lifecycle",
        resourceType: "tenant-record",
        resourceId: "resource-lifecycle",
        tenantId: context.tenantId,
        classification: "tenant-data",
        sourceRef: "resource-lifecycle",
        sourceVersion: "1",
        title: "Synthetic resource",
        fieldValues: { title: "Synthetic resource" },
      }),
    );
    expect(search.get(context, "resource-lifecycle")).toBeDefined();
    const deleted = await service.mutate(context, "resource-lifecycle", {
      mutationType: "soft-delete",
      expectedVersion: active.value.version,
      expectedEtag: active.value.etag,
      idempotencyKey: "idem-soft-delete",
    });
    expect(deleted).toMatchObject({ ok: true });
    expect(search.get(context, "resource-lifecycle")).toBeUndefined();

    const held = await createRecord(service, context, {
      resourceId: "resource-held",
      status: "purge-eligible",
      legalHold: true,
    });
    expect(held.ok).toBe(true);
    if (!held.ok) throw new Error("held create failed");
    await expect(
      service.mutate(context, "resource-held", {
        mutationType: "purge",
        expectedVersion: held.value.version,
        expectedEtag: held.value.etag,
        idempotencyKey: "idem-held-purge",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "legal-hold-blocks-purge" });
  });

  it("enforces relationship integrity, cycle denial, required relationship purge block, and safe outputs", async () => {
    const { service, audit, telemetry } = setup();
    const context = tenant();
    const first = await createRecord(service, context, {
      resourceId: "resource-parent",
      status: "purge-eligible",
    });
    const second = await createRecord(service, context, {
      resourceId: "resource-child",
      status: "purge-eligible",
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("create failed");

    await expect(
      service.link(context, {
        relationshipId: "rel-parent-child",
        relationshipType: "contains",
        sourceResourceId: "resource-parent",
        targetResourceId: "resource-child",
        required: true,
        cascadePolicy: "restrict",
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      service.link(context, {
        relationshipId: "rel-cycle",
        relationshipType: "contains",
        sourceResourceId: "resource-child",
        targetResourceId: "resource-parent",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "relationship-cycle-denied" });
    await expect(
      service.mutate(context, "resource-parent", {
        mutationType: "purge",
        expectedVersion: first.value.version,
        expectedEtag: first.value.etag,
        idempotencyKey: "idem-required-purge",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "required-relationship-blocks-purge" });

    const auditPage = await audit.query(context, { tenantId: context.tenantId });
    const telemetryPage = telemetry.query({ tenantId: context.tenantId });
    const output = JSON.stringify({ auditPage, telemetryPage });
    expect(output).not.toMatch(
      /raw_payload|object_key|recipient_address|provider_response|stack_trace|secret|token/i,
    );
  });

  it("represents guardrail and import/export posture without live or legal readiness claims", async () => {
    const { service, guardrails } = setup();
    const context = tenant();
    guardrails.upsertPolicy(guardrailPolicy());
    await expect(
      service.create(context, {
        resourceId: "resource-guarded",
        resourceType: "tenant-record",
        classification: "bulk-managed",
        schema: schema(),
        fields: { title: "Bulk managed synthetic resource" },
        idempotencyKey: "idem-guarded-resource",
        guardrailPolicyId: "resource.guardrail.policy",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "rate-limit-exceeded" });
    const status = service.status();
    expect(status.productionReadinessClaim).toBe(false);
    expect(status.legalRecordManagementReadinessClaim).toBe(false);
    expect(status.regulatoryRecordReadinessClaim).toBe(false);
  });
});

describe("resource lifecycle core policy guards", () => {
  it("blocks unknown lifecycle status and secret-looking values", async () => {
    expect(() =>
      createResourceSchemaDefinition({
        resourceType: "tenant-record",
        schemaVersion: "resource-schema-1",
        owningCapability: "resource-lifecycle",
        fields: [],
        transitions: [
          {
            from: "draft",
            to: "not-a-status" as never,
            requiredAction: "resource.transition",
            approvalRequired: false,
            requesterCannotApprove: false,
          },
        ],
      }),
    ).toThrow(ResourcePolicyError);
    await expect(
      setup().service.create(tenant(), {
        resourceId: "resource-secret",
        resourceType: "tenant-record",
        classification: "tenant-data",
        schema: schema(),
        fields: { title: "object_key: redacted-test-fixture" },
        idempotencyKey: "idem-secret",
      }),
    ).resolves.toMatchObject({ ok: false, reasonCode: "resource-value-sensitive" });
  });
});
