import {
  stableId,
  type AuditEvent,
  type AuditIntegrityResult,
  type AuthorizationRequest,
  type TenantContext,
} from "@foundation/core";
import type {
  AuditEventLedger,
  AuditEventPage,
  AuditQueryCriteria,
  PolicyDecisionPoint,
} from "@foundation/ports";
import type { AuditEventRecorder } from "./recorder.ts";

const COMPONENT = "audit-query-service";

// Reading, verifying, or correcting audit evidence is itself a privileged action
// and is itself audited (audit-of-audit). The deny path is recorded too. The safe
// message never reveals whether a cross-tenant event exists.
export class AuditAccessDeniedError extends Error {
  readonly reasonCode: string;
  constructor(reasonCode: string) {
    super("Not authorized");
    this.name = "AuditAccessDeniedError";
    this.reasonCode = reasonCode;
  }
}

export interface AuditAccessContext {
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly traceId?: string;
  readonly requestId?: string;
}

export interface AuditQueryService {
  list(
    context: TenantContext,
    criteria: AuditQueryCriteria,
    access?: AuditAccessContext,
  ): Promise<AuditEventPage>;
  get(
    context: TenantContext,
    eventId: string,
    access?: AuditAccessContext,
  ): Promise<AuditEvent | undefined>;
  verify(context: TenantContext, access?: AuditAccessContext): Promise<AuditIntegrityResult>;
  correct(
    context: TenantContext,
    originalEventId: string,
    input: { reasonCode: string; safeMessage?: string },
    access?: AuditAccessContext,
  ): Promise<AuditEvent>;
}

export function createAuditQueryService(deps: {
  readonly ledger: AuditEventLedger;
  readonly pdp: PolicyDecisionPoint;
  readonly recorder: AuditEventRecorder;
}): AuditQueryService {
  let counter = 0;
  const nextId = (kind: string, context: TenantContext): string =>
    stableId("evt", [context.tenantId, context.actorId, kind, String(counter++)]);

  function authzRequest(
    context: TenantContext,
    action: string,
    resourceId: string,
    correlationId: string,
  ): AuthorizationRequest {
    return {
      context,
      action,
      resource: {
        // Audit records are classified security-sensitive at rest (event.dataClassification
        // and the DB column). The *retrieval* decision is governed by the explicit audit.*
        // RBAC permissions rather than ABAC escalation, so access is predictable and the
        // returned view is always the redacted safe projection.
        type: "audit-event",
        id: resourceId,
        tenantId: context.tenantId,
        attributes: {},
      },
      requestContext: { correlation_id: correlationId },
    };
  }

  function correlationFor(context: TenantContext, access: AuditAccessContext | undefined): string {
    return access?.correlationId ?? stableId("corr", [context.tenantId, context.actorId, "audit"]);
  }

  async function recordAccess(
    context: TenantContext,
    access: AuditAccessContext | undefined,
    correlationId: string,
    fields: {
      eventType: string;
      action: string;
      outcome: "success" | "denied" | "failed";
      reasonCode: string;
      subjectId: string;
      severity?: "info" | "notice" | "warning" | "critical";
      metadata?: Record<string, string>;
    },
  ): Promise<void> {
    await deps.recorder.record({
      eventId: nextId(fields.eventType, context),
      eventType: fields.eventType,
      tenantId: context.tenantId,
      actorId: context.actorId,
      action: fields.action,
      outcome: fields.outcome,
      reasonCode: fields.reasonCode,
      subjectType: "audit-event",
      subjectId: fields.subjectId,
      resourceType: "audit-event",
      resourceId: fields.subjectId,
      correlationId,
      causationId: access?.causationId ?? null,
      traceId: access?.traceId ?? null,
      requestId: access?.requestId ?? null,
      recordedByComponent: COMPONENT,
      ...(fields.severity ? { severity: fields.severity } : {}),
      ...(fields.metadata ? { metadata: fields.metadata } : {}),
    });
  }

  async function guard(
    context: TenantContext,
    access: AuditAccessContext | undefined,
    correlationId: string,
    action: string,
    resourceId: string,
  ): Promise<void> {
    const decision = deps.pdp.decide(authzRequest(context, action, resourceId, correlationId));
    if (decision.effect !== "permit") {
      await recordAccess(context, access, correlationId, {
        eventType: "audit.query.denied",
        action,
        outcome: "denied",
        reasonCode: decision.reasonCode,
        subjectId: resourceId,
        severity: "warning",
      });
      throw new AuditAccessDeniedError(decision.reasonCode);
    }
  }

  return {
    async list(context, criteria, access) {
      const correlationId = correlationFor(context, access);
      await recordAccess(context, access, correlationId, {
        eventType: "audit.query.started",
        action: "audit.search",
        outcome: "success",
        reasonCode: "query-started",
        subjectId: criteria.category ?? "all",
      });
      await guard(context, access, correlationId, "audit.search", "*");
      const page = await deps.ledger.query(context, criteria);
      await recordAccess(context, access, correlationId, {
        eventType: "audit.query.completed",
        action: "audit.search",
        outcome: "success",
        reasonCode: "query-completed",
        subjectId: criteria.category ?? "all",
        metadata: { count: String(page.events.length) },
      });
      return page;
    },

    async get(context, eventId, access) {
      const correlationId = correlationFor(context, access);
      await guard(context, access, correlationId, "audit.read", eventId);
      const event = await deps.ledger.get(context, eventId);
      await recordAccess(context, access, correlationId, {
        eventType: "audit.event.viewed",
        action: "audit.read",
        outcome: event ? "success" : "failed",
        reasonCode: event ? "viewed" : "not-found",
        subjectId: eventId,
        metadata: { found: String(Boolean(event)) },
      });
      return event;
    },

    async verify(context, access) {
      const correlationId = correlationFor(context, access);
      await guard(context, access, correlationId, "audit.verify", "*");
      const result = await deps.ledger.verify(context);
      await recordAccess(context, access, correlationId, {
        eventType: result.ok ? "audit.integrity.verified" : "audit.integrity.failed",
        action: "audit.verify",
        outcome: result.ok ? "success" : "failed",
        reasonCode: result.reason ?? "verified",
        subjectId: result.chainScope,
        severity: result.ok ? "notice" : "critical",
        metadata: {
          count: String(result.count),
          brokenAtSequence: String(result.brokenAtSequence),
        },
      });
      return result;
    },

    async correct(context, originalEventId, input, access) {
      const correlationId = correlationFor(context, access);
      await guard(context, access, correlationId, "audit.correct", originalEventId);
      const original = await deps.ledger.get(context, originalEventId);
      if (!original) {
        // Non-enumerating: a missing or cross-tenant target is reported as denied,
        // not as a distinguishable "not found".
        throw new AuditAccessDeniedError("audit-correction-target-missing");
      }
      const compensating = await deps.recorder.record({
        eventId: nextId("audit.correction.recorded", context),
        eventType: "audit.correction.recorded",
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: "audit.correct",
        outcome: "compensated",
        reasonCode: input.reasonCode,
        ...(input.safeMessage ? { safeMessage: input.safeMessage } : {}),
        correctsEventId: originalEventId,
        subjectType: "audit-event",
        subjectId: originalEventId,
        resourceType: "audit-event",
        resourceId: originalEventId,
        correlationId,
        causationId: access?.causationId ?? null,
        traceId: access?.traceId ?? null,
        requestId: access?.requestId ?? null,
        recordedByComponent: COMPONENT,
        metadata: { correctedEventType: original.eventType, reason: input.reasonCode },
      });
      return compensating;
    },
  };
}
