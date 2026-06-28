import {
  createAuditRecord,
  stableId,
  type AuthorizationRequest,
  type PolicyDecision,
} from "@foundation/core";
import type { AuditLedger, PolicyDecisionPoint } from "@foundation/ports";

export interface Authorizer {
  authorize(request: AuthorizationRequest): Promise<PolicyDecision>;
}

// Authorizer capability: makes a PDP decision and emits authorization-decision
// evidence to the audit ledger. The detailed reason code goes to audit; only the
// safe message is intended for clients.
export function createAuthorizer(deps: {
  readonly pdp: PolicyDecisionPoint;
  readonly auditLedger: AuditLedger;
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
      return decision;
    },
  };
}
