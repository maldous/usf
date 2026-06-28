import { createHash } from "node:crypto";
import type { AuthorizationRequest, PolicyDecision } from "@foundation/core";
import type { PolicyDecisionPoint, TenantMembershipDirectory } from "@foundation/ports";
import type { BreakGlassRegistry } from "./index.ts";
import {
  DEFAULT_DATA_CLASSIFICATION,
  POLICY_VERSION,
  isSensitiveClassification,
  permissionsForRoles,
  requiredPermission,
  scopeCoversAction,
  SENSITIVE_READ_PERMISSION,
} from "./authorization-policy.ts";

export interface PdpDeps {
  readonly memberships: TenantMembershipDirectory;
  readonly breakGlass?: BreakGlassRegistry;
  readonly now?: () => Date;
}

const SAFE_DENY_MESSAGE = "Not authorized";

function evaluationContextHash(request: AuthorizationRequest): string {
  const canonical = JSON.stringify({
    actorId: request.context.actorId,
    tenantId: request.context.tenantId,
    action: request.action,
    resource: {
      type: request.resource.type,
      id: request.resource.id,
      tenantId: request.resource.tenantId,
      attributes: Object.fromEntries(
        Object.entries(request.resource.attributes).sort(([a], [b]) => a.localeCompare(b)),
      ),
    },
    breakGlassGrantId: request.breakGlassGrantId ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

// USF-owned application-layer Policy Decision Point (ADR 0010). Default deny;
// combines RBAC + ABAC over USF-authoritative tenant membership; identity claims
// alone never authorize. Break-glass is evaluated here, never as a bypass.
export function createPolicyDecisionPoint(deps: PdpDeps): PolicyDecisionPoint {
  const clock = deps.now ?? (() => new Date());
  return {
    decide(request: AuthorizationRequest): PolicyDecision {
      const now = clock();
      const hash = evaluationContextHash(request);
      const base = {
        decisionId: `decision_${hash.slice(0, 16)}`,
        policyVersion: POLICY_VERSION,
        actorId: request.context.actorId,
        tenantId: request.context.tenantId,
        action: request.action,
        resourceType: request.resource.type,
        resourceId: request.resource.id,
        evaluationContextHash: hash,
        correlationId: request.requestContext?.correlation_id ?? `decision_${hash.slice(0, 16)}`,
        causationId: request.requestContext?.causation_id ?? null,
        traceId: request.requestContext?.trace_id ?? null,
        evaluatedAt: now.toISOString(),
      } as const;

      const deny = (reasonCode: string, matched: readonly string[] = []): PolicyDecision => ({
        ...base,
        effect: "deny",
        reasonCode,
        safeMessage: SAFE_DENY_MESSAGE,
        obligations: [],
        matchedPolicyIds: matched,
      });
      const permit = (
        reasonCode: string,
        obligations: readonly string[],
        matched: readonly string[],
      ): PolicyDecision => ({
        ...base,
        effect: "permit",
        reasonCode,
        safeMessage: "permitted",
        obligations,
        matchedPolicyIds: matched,
      });

      // 1. Tenant boundary: the resource tenant must equal the context tenant.
      if (request.resource.tenantId !== request.context.tenantId) {
        return deny("tenant-boundary");
      }
      // 2. Membership authority: only an active membership authorizes. An IdP claim
      //    of a role with no active membership does not authorize (identity != authz).
      const membership = deps.memberships.membership({
        actorId: request.context.actorId,
        tenantId: request.context.tenantId,
      });
      if (!membership || membership.status !== "active") {
        return deny("inactive-or-missing-membership");
      }
      // 3. Action must be known; unknown actions fail closed.
      const permission = requiredPermission(request.action);
      if (!permission) {
        return deny("unknown-action");
      }
      // 4. ABAC: a sensitive data classification requires the stronger read permission.
      const classification =
        request.resource.attributes.data_classification ?? DEFAULT_DATA_CLASSIFICATION;
      const sensitive = isSensitiveClassification(classification);
      const effectivePermission =
        sensitive && request.action.endsWith(".read") ? SENSITIVE_READ_PERMISSION : permission;
      // 5. RBAC: USF-owned role->permission mapping over the membership roles.
      const granted = permissionsForRoles(membership.roles);
      if (granted.has(effectivePermission)) {
        return permit("rbac-permit", sensitive ? ["log-sensitive-access"] : [], [
          "rbac",
          `classification:${classification}`,
        ]);
      }
      // 6. Break-glass: an active, in-scope, unexpired grant permits with audit
      //    obligation. Out-of-scope or expired grants fail closed.
      if (request.breakGlassGrantId && deps.breakGlass) {
        try {
          const grant = deps.breakGlass.assertActive(
            request.breakGlassGrantId,
            request.context.tenantId,
            now,
          );
          // The grant elevates only its requester; another member may not reuse it.
          if (grant.requesterId !== request.context.actorId) {
            return deny("break-glass-actor-mismatch");
          }
          if (scopeCoversAction(grant.scope, request.action)) {
            return permit(
              "break-glass-permit",
              ["audit-break-glass", `expires:${grant.expiresAt.toISOString()}`],
              ["break-glass", grant.grantId],
            );
          }
          return deny("break-glass-out-of-scope");
        } catch {
          return deny("break-glass-invalid");
        }
      }
      // 7. Default deny.
      return deny("rbac-deny");
    },
  };
}
