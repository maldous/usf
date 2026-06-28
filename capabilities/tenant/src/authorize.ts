import {
  createAuditEventDraft,
  createAuditRecord,
  stableId,
  type AuthorizationRequest,
  type PolicyDecision,
} from "@foundation/core";
import type { AuditLedger, AuditRecorder, PolicyDecisionPoint } from "@foundation/ports";

export interface Authorizer {
  authorize(request: AuthorizationRequest): Promise<PolicyDecision>;
}

// Maps a PDP decision to a rich audit event (parity-audit, USF-142). Permit and deny
// are both recorded (a denied privileged action is security-relevant evidence); a
// break-glass permit is recorded as a high-severity break_glass.used event and a
// failed break-glass attempt as break_glass.denied.
function decisionAuditDraft(decision: PolicyDecision) {
  const breakGlassUsed =
    decision.effect === "permit" && decision.reasonCode === "break-glass-permit";
  const breakGlassDenied =
    decision.effect === "deny" && decision.reasonCode.startsWith("break-glass-");
  const breakGlass = breakGlassUsed || breakGlassDenied;
  const eventType = breakGlassUsed
    ? "break_glass.used"
    : breakGlassDenied
      ? "break_glass.denied"
      : "authorization.decision";
  return createAuditEventDraft({
    eventId: stableId("evt", [decision.tenantId, decision.actorId, "authz", decision.decisionId]),
    eventType,
    category: breakGlass ? "break-glass" : "authorization",
    severity: breakGlassUsed ? "high" : decision.effect === "deny" ? "warning" : "notice",
    tenantId: decision.tenantId,
    actorId: decision.actorId,
    action: decision.action,
    outcome: decision.effect === "permit" ? "success" : "denied",
    subjectType: decision.resourceType,
    subjectId: decision.resourceId,
    resourceType: decision.resourceType,
    resourceId: decision.resourceId,
    reasonCode: decision.reasonCode,
    safeMessage: decision.safeMessage,
    policyVersion: decision.policyVersion,
    decisionId: decision.decisionId,
    obligations: decision.obligations,
    correlationId: decision.correlationId,
    causationId: decision.causationId,
    traceId: decision.traceId,
    recordedByComponent: "authorizer",
    metadata: {
      effect: decision.effect,
      evaluationContextHash: decision.evaluationContextHash,
      matchedPolicyIds: decision.matchedPolicyIds.join(","),
    },
  });
}

// Authorizer capability: makes a PDP decision and emits authorization-decision
// evidence to the audit ledger. The detailed reason code goes to audit; only the
// safe message is intended for clients. When a rich audit recorder is wired, it
// also records a structured, chained AuditEvent (decision/break-glass evidence).
export function createAuthorizer(deps: {
  readonly pdp: PolicyDecisionPoint;
  readonly auditLedger: AuditLedger;
  readonly audit?: AuditRecorder;
}): Authorizer {
  return {
    async authorize(request: AuthorizationRequest): Promise<PolicyDecision> {
      const decision = deps.pdp.decide(request);
      await deps.auditLedger.append(
        createAuditRecord({
          id: stableId("audit", [
            decision.tenantId,
            decision.actorId,
            "authz",
            decision.decisionId,
          ]),
          action: "authorization.decision",
          tenantId: decision.tenantId,
          actorId: decision.actorId,
          subject: `${decision.resourceType}:${decision.resourceId}`,
          metadata: {
            effect: decision.effect,
            reasonCode: decision.reasonCode,
            action: decision.action,
            policyVersion: decision.policyVersion,
            obligations: decision.obligations.join(","),
            correlationId: decision.correlationId,
          },
        }),
      );
      if (deps.audit) {
        await deps.audit.record(decisionAuditDraft(decision));
      }
      return decision;
    },
  };
}
