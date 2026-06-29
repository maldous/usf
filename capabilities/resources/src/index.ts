import {
  ResourcePolicyError,
  assertResourceMutationType,
  createAuditEventDraft,
  createResourceRecord,
  createResourceRelationshipRecord,
  stableId,
  toSafeResourceView,
  updateResourceRecord,
  type AuditEventOutcome,
  type GuardrailDecision,
  type ResourceLifecycleTransitionRule,
  type ResourceRecord,
  type ResourceRelationshipRecord,
  type ResourceSchemaDefinition,
  type SafeResourceView,
  type SearchIndexDocument,
  type TenantContext,
} from "@foundation/core";
import type {
  AuditRecorder,
  GuardrailPort,
  ImportExportPort,
  PolicyDecisionPoint,
  ResourceLifecyclePort,
  SearchIndexPort,
  TelemetryPort,
} from "@foundation/ports";

const COMPONENT = "resource-lifecycle-service";

type OptionalContextIds = {
  readonly correlationId?: string | null | undefined;
  readonly requestId?: string | null | undefined;
  readonly traceId?: string | null | undefined;
};

function optionalContextIds(input: OptionalContextIds): {
  readonly correlationId?: string | null;
  readonly requestId?: string | null;
  readonly traceId?: string | null;
} {
  return {
    ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
    ...(input.traceId !== undefined ? { traceId: input.traceId } : {}),
  };
}

export type ResourceServiceOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly deduplicated?: boolean }
  | { readonly ok: false; readonly reasonCode: string; readonly guardrail?: GuardrailDecision };

export interface ResourceCreateInput {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly classification: string;
  readonly schema: ResourceSchemaDefinition;
  readonly fields: Readonly<Record<string, string>>;
  readonly idempotencyKey: string;
  readonly ownerActorId?: string | null;
  readonly stewardActorId?: string | null;
  readonly status?: string;
  readonly sourceRef?: string | null;
  readonly legalHold?: boolean;
  readonly retentionPolicy?: string;
  readonly guardrailPolicyId?: string | null;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly traceId?: string | null;
}

export interface ResourceMutationInput {
  readonly mutationType: string;
  readonly expectedVersion: number;
  readonly expectedEtag: string;
  readonly idempotencyKey: string;
  readonly fieldChanges?: Readonly<Record<string, string>>;
  readonly transitionTo?: string | null;
  readonly permittedActions?: readonly string[];
  readonly approvedBy?: string | null;
  readonly guardrailPolicyId?: string | null;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly traceId?: string | null;
}

export interface ResourceRelationshipInput {
  readonly relationshipId: string;
  readonly relationshipType: string;
  readonly sourceResourceId: string;
  readonly targetResourceId: string;
  readonly required?: boolean;
  readonly acyclic?: boolean;
  readonly cardinality?: ResourceRelationshipRecord["cardinality"];
  readonly cascadePolicy?: ResourceRelationshipRecord["cascadePolicy"];
  readonly correlationId?: string;
}

export interface ResourceLifecycleService {
  create(
    context: TenantContext,
    input: ResourceCreateInput,
  ): Promise<ResourceServiceOutcome<SafeResourceView>>;
  read(
    context: TenantContext,
    resourceId: string,
  ): Promise<ResourceServiceOutcome<SafeResourceView>>;
  list(
    context: TenantContext,
    input?: { limit?: number; cursor?: string; includeDeleted?: boolean },
  ): Promise<
    ResourceServiceOutcome<{ views: readonly SafeResourceView[]; nextCursor: string | null }>
  >;
  mutate(
    context: TenantContext,
    resourceId: string,
    input: ResourceMutationInput,
  ): Promise<ResourceServiceOutcome<SafeResourceView>>;
  transition(
    context: TenantContext,
    resourceId: string,
    input: Omit<ResourceMutationInput, "mutationType"> & { transitionTo: string },
  ): Promise<ResourceServiceOutcome<SafeResourceView>>;
  link(
    context: TenantContext,
    input: ResourceRelationshipInput,
  ): Promise<ResourceServiceOutcome<ResourceRelationshipRecord>>;
  unlink(
    context: TenantContext,
    relationshipId: string,
  ): Promise<ResourceServiceOutcome<{ deleted: boolean }>>;
  status(): ReturnType<ResourceLifecyclePort["safeStatusView"]>;
}

export function createResourceLifecycleService(deps: {
  readonly store: ResourceLifecyclePort;
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly guardrails?: GuardrailPort;
  readonly telemetry?: TelemetryPort;
  readonly search?: SearchIndexPort;
  readonly bulk?: ImportExportPort;
  readonly now?: () => Date;
}): ResourceLifecycleService {
  const now = deps.now ?? (() => new Date());
  let seq = 0;

  function authorize(
    context: TenantContext,
    action: string,
    resourceId: string,
    tenantId: string | null,
    attributes: Record<string, string> = {},
  ): string | null {
    const decision = deps.pdp.decide({
      context,
      action,
      resource: {
        type: "resource",
        id: resourceId,
        tenantId: tenantId ?? context.tenantId,
        attributes,
      },
    });
    return decision.effect === "permit" ? null : decision.reasonCode;
  }

  async function audit(
    context: TenantContext,
    input: {
      readonly eventType: string;
      readonly action: string;
      readonly outcome: AuditEventOutcome;
      readonly reasonCode: string;
      readonly resourceId: string;
      readonly resourceType?: string;
      readonly classification?: string;
      readonly status?: string;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
    },
  ): Promise<void> {
    seq += 1;
    await deps.audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [
          context.tenantId,
          input.resourceId,
          input.eventType,
          String(seq),
        ]),
        eventType: input.eventType,
        category:
          input.action.includes("read") || input.action.includes("list")
            ? "data-access"
            : "data-mutation",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: input.action,
        outcome: input.outcome,
        reasonCode: input.reasonCode,
        subjectType: "resource",
        subjectId: input.resourceId,
        resourceType: input.resourceType ?? "resource",
        resourceId: input.resourceId,
        correlationId:
          input.correlationId ?? stableId("corr", [context.tenantId, input.resourceId]),
        causationId: input.requestId ?? null,
        traceId: input.traceId ?? null,
        recordedByComponent: COMPONENT,
        metadata: {
          classification: input.classification ?? "none",
          status: input.status ?? "unknown",
        },
      }),
    );
  }

  function signal(
    context: TenantContext,
    eventName: string,
    input: {
      readonly resourceId: string;
      readonly reasonCode: string;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
    },
  ): void {
    deps.telemetry?.recordSecuritySignal({
      eventName,
      severity: "warning",
      reasonCode: input.reasonCode,
      safeSummary: eventName,
      context: {
        tenantId: context.tenantId,
        actorId: context.actorId,
        capability: "resource-lifecycle",
        correlationId: input.correlationId ?? stableId("corr", [context.tenantId, eventName]),
        requestId: input.requestId ?? stableId("req", [context.tenantId, eventName]),
        ...(input.traceId ? { traceId: input.traceId } : {}),
      },
      attributes: {
        resource_id_hash: stableId("res", [input.resourceId]),
        reason_code: input.reasonCode,
      },
      classification: "security",
    });
  }

  async function denied<T>(
    context: TenantContext,
    input: {
      readonly action: string;
      readonly resourceId: string;
      readonly reasonCode: string;
      readonly eventType?: string;
      readonly guardrail?: GuardrailDecision;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
    },
  ): Promise<ResourceServiceOutcome<T>> {
    await audit(context, {
      eventType: input.eventType ?? "resource.mutation.denied",
      action: input.action,
      outcome: "denied",
      reasonCode: input.reasonCode,
      resourceId: input.resourceId,
      correlationId: input.correlationId,
      requestId: input.requestId,
      traceId: input.traceId,
    });
    signal(context, "resource.mutation.denied", input);
    return {
      ok: false,
      reasonCode: input.reasonCode,
      ...(input.guardrail ? { guardrail: input.guardrail } : {}),
    };
  }

  function actionForMutation(mutationType: string): string {
    const type = assertResourceMutationType(mutationType);
    if (type === "update" || type === "patch") return "resource.update";
    if (type === "transition") return "resource.transition";
    return `resource.${type}`;
  }

  async function applyGuardrail(
    context: TenantContext,
    input: {
      readonly policyId?: string | null | undefined;
      readonly operationId: string;
      readonly resourceId: string;
      readonly idempotencyKey: string;
      readonly correlationId?: string | null | undefined;
      readonly requestId?: string | null | undefined;
      readonly traceId?: string | null | undefined;
    },
  ): Promise<GuardrailDecision | null> {
    if (!input.policyId || !deps.guardrails) return null;
    const decision = deps.guardrails.evaluate({
      policyId: input.policyId,
      tenantId: context.tenantId,
      subjectRef: context.actorId,
      actorId: context.actorId,
      operationId: input.operationId,
      resourceType: "resource",
      quantity: 1,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint: input.resourceId,
      ...optionalContextIds(input),
    });
    if (["allow", "monitor-only", "shadow-deny"].includes(decision.decision)) return null;
    return decision;
  }

  function requiredRelationshipBlocks(record: ResourceRecord): boolean {
    return deps.store
      .relationshipsForResource(
        {
          tenantId: record.tenantId ?? "",
          actorId: record.updatedBy,
          roles: [],
          providerMode: "hermetic-mock",
          environment: "hermetic",
        },
        record.resourceId,
      )
      .some((relationship) => relationship.required && relationship.cascadePolicy === "restrict");
  }

  async function removeFromSearch(context: TenantContext, record: ResourceRecord): Promise<void> {
    deps.search?.delete(context, record.resourceId);
  }

  return {
    async create(context, input) {
      if (input.guardrailPolicyId) {
        const guardrail = await applyGuardrail(context, {
          policyId: input.guardrailPolicyId,
          operationId: "resource.create",
          resourceId: input.resourceId,
          idempotencyKey: input.idempotencyKey,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
        if (guardrail) {
          return denied(context, {
            action: "resource.create",
            resourceId: input.resourceId,
            reasonCode: guardrail.reasonCode,
            guardrail,
            correlationId: input.correlationId,
            requestId: input.requestId,
            traceId: input.traceId,
          });
        }
      }
      const existing = deps.store.findByIdempotencyKey(context, input.idempotencyKey);
      if (existing) return { ok: true, value: toSafeResourceView(existing), deduplicated: true };
      const denyReason = authorize(context, "resource.create", input.resourceId, context.tenantId, {
        resourceType: input.resourceType,
        classification: input.classification,
      });
      if (denyReason) {
        return denied(context, {
          action: "resource.create",
          resourceId: input.resourceId,
          reasonCode: denyReason,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      try {
        const record = createResourceRecord({
          ...input,
          tenantId: context.tenantId,
          actorId: context.actorId,
          now: now().toISOString(),
        });
        const created = deps.store.create(record);
        await audit(context, {
          eventType: "resource.created",
          action: "resource.create",
          outcome: "success",
          reasonCode: "created",
          resourceId: created.resourceId,
          resourceType: created.resourceType,
          classification: created.classification,
          status: created.status,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
        return { ok: true, value: toSafeResourceView(created) };
      } catch (error) {
        if (error instanceof ResourcePolicyError) {
          return denied(context, {
            action: "resource.create",
            resourceId: input.resourceId,
            reasonCode: error.reasonCode,
            correlationId: input.correlationId,
            requestId: input.requestId,
            traceId: input.traceId,
          });
        }
        throw error;
      }
    },

    async read(context, resourceId) {
      const denyReason = authorize(context, "resource.read", resourceId, context.tenantId);
      if (denyReason) {
        return denied(context, { action: "resource.read", resourceId, reasonCode: denyReason });
      }
      const record = deps.store.get(context, resourceId);
      if (!record) return { ok: false, reasonCode: "not-found" };
      await audit(context, {
        eventType: "resource.read",
        action: "resource.read",
        outcome: "success",
        reasonCode: "read",
        resourceId,
        resourceType: record.resourceType,
        classification: record.classification,
        status: record.status,
      });
      return { ok: true, value: toSafeResourceView(record) };
    },

    async list(context, input = {}) {
      const denyReason = authorize(context, "resource.list", context.tenantId, context.tenantId);
      if (denyReason) {
        return denied(context, {
          action: "resource.list",
          resourceId: context.tenantId,
          reasonCode: denyReason,
        });
      }
      const page = deps.store.forTenant(context, input);
      return {
        ok: true,
        value: {
          views: Object.freeze(page.resources.map(toSafeResourceView)),
          nextCursor: page.nextCursor,
        },
      };
    },

    async mutate(context, resourceId, input) {
      const mutationType = assertResourceMutationType(input.mutationType);
      const action = actionForMutation(mutationType);
      const guardrail = await applyGuardrail(context, {
        policyId: input.guardrailPolicyId,
        operationId: action,
        resourceId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        requestId: input.requestId,
        traceId: input.traceId,
      });
      if (guardrail) {
        return denied(context, {
          action,
          resourceId,
          reasonCode: guardrail.reasonCode,
          guardrail,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      const existingByIdempotency = deps.store.findByIdempotencyKey(context, input.idempotencyKey);
      if (existingByIdempotency && existingByIdempotency.resourceId === resourceId) {
        return { ok: true, value: toSafeResourceView(existingByIdempotency), deduplicated: true };
      }
      const record = deps.store.get(context, resourceId);
      if (!record) return { ok: false, reasonCode: "not-found" };
      const denyReason = authorize(context, action, resourceId, record.tenantId, {
        resourceType: record.resourceType,
        classification: record.classification,
      });
      if (denyReason) {
        return denied(context, {
          action,
          resourceId,
          reasonCode: denyReason,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      if (mutationType === "purge" && requiredRelationshipBlocks(record)) {
        return denied(context, {
          action,
          resourceId,
          reasonCode: "required-relationship-blocks-purge",
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
      }
      try {
        const updated = updateResourceRecord({
          record,
          schema: schemaFromRecord(
            record,
            input.transitionTo ? transitionRule(record.status, input.transitionTo) : undefined,
          ),
          mutationType,
          actorId: context.actorId,
          expectedVersion: input.expectedVersion,
          expectedEtag: input.expectedEtag,
          idempotencyKey: input.idempotencyKey,
          fieldChanges: input.fieldChanges,
          transitionTo: input.transitionTo,
          permittedActions: input.permittedActions,
          approvedBy: input.approvedBy,
          now: now().toISOString(),
        });
        deps.store.put(context, updated);
        if (["soft-deleted", "purge-eligible", "purged"].includes(updated.status)) {
          await removeFromSearch(context, updated);
        }
        await audit(context, {
          eventType: eventTypeForMutation(mutationType),
          action,
          outcome: "success",
          reasonCode: "updated",
          resourceId,
          resourceType: updated.resourceType,
          classification: updated.classification,
          status: updated.status,
          correlationId: input.correlationId,
          requestId: input.requestId,
          traceId: input.traceId,
        });
        return { ok: true, value: toSafeResourceView(updated) };
      } catch (error) {
        if (error instanceof ResourcePolicyError) {
          return denied(context, {
            action,
            resourceId,
            reasonCode: error.reasonCode,
            correlationId: input.correlationId,
            requestId: input.requestId,
            traceId: input.traceId,
          });
        }
        throw error;
      }
    },

    transition(context, resourceId, input) {
      return this.mutate(context, resourceId, { ...input, mutationType: "transition" });
    },

    async link(context, input) {
      const denyReason = authorize(
        context,
        "resource.link",
        input.sourceResourceId,
        context.tenantId,
      );
      if (denyReason) {
        return denied(context, {
          action: "resource.link",
          resourceId: input.sourceResourceId,
          reasonCode: denyReason,
          correlationId: input.correlationId,
        });
      }
      const source = deps.store.get(context, input.sourceResourceId);
      const target = deps.store.get(context, input.targetResourceId);
      if (!source || !target) {
        return denied(context, {
          action: "resource.link",
          resourceId: input.sourceResourceId,
          reasonCode: "relationship-target-not-found",
          correlationId: input.correlationId,
        });
      }
      if (
        input.acyclic !== false &&
        deps.store
          .relationshipsForResource(context, input.targetResourceId)
          .some((relationship) => relationship.targetResourceId === input.sourceResourceId)
      ) {
        return denied(context, {
          action: "resource.link",
          resourceId: input.sourceResourceId,
          reasonCode: "relationship-cycle-denied",
          correlationId: input.correlationId,
        });
      }
      try {
        const relationship = deps.store.createRelationship(
          createResourceRelationshipRecord({
            ...input,
            tenantId: context.tenantId,
            source,
            target,
            createdBy: context.actorId,
            createdAt: now().toISOString(),
          }),
        );
        await audit(context, {
          eventType: "resource.relationship.linked",
          action: "resource.link",
          outcome: "success",
          reasonCode: "linked",
          resourceId: input.sourceResourceId,
          resourceType: source.resourceType,
          classification: source.classification,
          status: source.status,
          correlationId: input.correlationId,
        });
        return { ok: true, value: relationship };
      } catch (error) {
        if (error instanceof ResourcePolicyError) {
          return denied(context, {
            action: "resource.link",
            resourceId: input.sourceResourceId,
            reasonCode: error.reasonCode,
            correlationId: input.correlationId,
          });
        }
        throw error;
      }
    },

    async unlink(context, relationshipId) {
      const relationship = deps.store.relationship(context, relationshipId);
      const denyReason = authorize(
        context,
        "resource.unlink",
        relationship?.sourceResourceId ?? relationshipId,
        context.tenantId,
      );
      if (denyReason) {
        return denied(context, {
          action: "resource.unlink",
          resourceId: relationshipId,
          reasonCode: denyReason,
        });
      }
      const deleted = deps.store.deleteRelationship(context, relationshipId);
      return { ok: true, value: { deleted } };
    },

    status() {
      return deps.store.safeStatusView();
    },
  };
}

function schemaFromRecord(
  record: ResourceRecord,
  transition?: ResourceLifecycleTransitionRule,
): ResourceSchemaDefinition {
  return {
    resourceType: record.resourceType,
    schemaVersion: record.schemaVersion,
    schemaHash: record.schemaHash,
    owningCapability: "resource-lifecycle",
    fields: Object.freeze(
      Object.entries(record.fieldClassifications).map(([fieldPath, classification]) =>
        Object.freeze({
          fieldPath,
          classification,
          required: false,
          mutable: !record.immutableFields.includes(fieldPath),
          visible: !record.hiddenFields.includes(fieldPath),
          allowedOnCreate: true,
          allowedOnUpdate: true,
          restrictedAction:
            classification === "restricted" || classification === "security-sensitive"
              ? "resource.restricted.update"
              : null,
        }),
      ),
    ),
    transitions: Object.freeze(transition ? [transition] : []),
  };
}

function transitionRule(
  from: ResourceRecord["status"],
  to: string,
): ResourceLifecycleTransitionRule {
  return {
    from,
    to: to as ResourceLifecycleTransitionRule["to"],
    requiredAction: "resource.transition",
    approvalRequired: true,
    requesterCannotApprove: true,
  };
}

function eventTypeForMutation(mutationType: string): string {
  switch (mutationType) {
    case "transition":
      return "resource.lifecycle.transitioned";
    case "archive":
      return "resource.archived";
    case "restore":
      return "resource.restored";
    case "soft-delete":
      return "resource.soft_deleted";
    case "purge":
      return "resource.purged";
    case "lock":
      return "resource.locked";
    case "unlock":
      return "resource.unlocked";
    default:
      return "resource.mutated";
  }
}

export function resourceToSearchDocument(record: ResourceRecord): SearchIndexDocument | null {
  if (record.status === "purged" || record.status === "soft-deleted") return null;
  return null;
}
