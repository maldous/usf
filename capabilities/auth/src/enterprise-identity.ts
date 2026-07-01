import {
  type ActorIdentity,
  type AssuranceLevel,
  createAuditEventDraft,
  createTenantContext,
  opaqueHash,
  type PolicyDecision,
  stableId,
  type TenantContext,
} from "@foundation/core";
import type { AuditRecorder, PolicyDecisionPoint } from "@foundation/ports";

export const TENANT_SSO_CONNECTION_STATUSES = Object.freeze([
  "draft",
  "requested",
  "pending-verification",
  "pending-approval",
  "active",
  "suspended",
  "disabled",
  "revoked",
  "expired",
  "failed",
] as const);
export type TenantSsoConnectionStatus = (typeof TENANT_SSO_CONNECTION_STATUSES)[number];

export const DOMAIN_VERIFICATION_METHODS = Object.freeze([
  "dns-txt",
  "well-known-http",
  "admin-approval",
  "contractual-verification",
  "manual-security-review",
] as const);
export type DomainVerificationMethod = (typeof DOMAIN_VERIFICATION_METHODS)[number];

export const IDENTITY_ENTERPRISE_ACTIONS = Object.freeze([
  "tenant_sso.request",
  "tenant_sso.configure",
  "tenant_sso.verify_domain",
  "tenant_sso.activate",
  "tenant_sso.suspend",
  "tenant_sso.revoke",
  "tenant_sso.rotate_secret",
  "tenant_sso.update_mapping",
  "tenant_sso.view_audit",
] as const);
export type IdentityEnterpriseAction = (typeof IDENTITY_ENTERPRISE_ACTIONS)[number];

export interface TenantSsoConnection {
  readonly connectionId: string;
  readonly tenantId: string;
  readonly keycloakRealm: string;
  readonly keycloakClient: string;
  readonly brokerAlias: string;
  readonly connectionName: string;
  readonly connectionStatus: TenantSsoConnectionStatus;
  readonly requestedBy: string;
  readonly approvedBy: string | null;
  readonly verifiedBy: string | null;
  readonly createdAt: string;
  readonly activatedAt: string | null;
  readonly suspendedAt: string | null;
  readonly revokedAt: string | null;
  readonly expiresAt: string | null;
  readonly allowedDomains: readonly string[];
  readonly verifiedDomains: readonly string[];
  readonly domainVerificationMethod: DomainVerificationMethod;
  readonly domainVerificationStatus: "pending" | "verified" | "conflict" | "expired" | "failed";
  readonly requiredAssuranceLevel: AssuranceLevel;
  readonly allowedRedirectUris: readonly string[];
  readonly allowedPostLogoutRedirectUris: readonly string[];
  readonly attributeMappingPolicy: readonly string[];
  readonly groupMappingPolicy: readonly string[];
  readonly jitProvisioningPolicy:
    | "disabled"
    | "pending-membership-only"
    | "active-non-privileged-membership";
}

export interface IdentityInvitation {
  readonly invitationId: string;
  readonly tenantId: string;
  readonly invitedEmailHash: string;
  readonly invitedBy: string;
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly acceptedByActorId: string | null;
  readonly brokeredIdentityRequired: boolean;
  readonly requiredDomain: string | null;
  readonly requiredAssuranceLevel: AssuranceLevel;
  readonly status: "issued" | "accepted" | "expired" | "revoked";
}

export interface LinkedIdentity {
  readonly linkId: string;
  readonly actorId: string;
  readonly externalSubjectHash: string;
  readonly linkedAt: string;
  readonly status: "active" | "unlinked";
}

export type EnterpriseIdentityOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly decision?: PolicyDecision }
  | { readonly ok: false; readonly reasonCode: string; readonly decision?: PolicyDecision };

export interface BrowserFlowPolicyInput {
  readonly state: string | null;
  readonly expectedState: string;
  readonly nonce: string | null;
  readonly expectedNonce: string;
  readonly pkceChallenge: string | null;
  readonly redirectUri: string;
  readonly allowedRedirectUris: readonly string[];
  readonly logoutRedirectUri: string;
  readonly allowedPostLogoutRedirectUris: readonly string[];
  readonly cookie: {
    readonly httpOnly: boolean;
    readonly secure: boolean;
    readonly sameSite: "strict" | "lax" | "none";
    readonly expiresAt: string;
  };
  readonly csrfTokenPresent: boolean;
}

export interface AttributeMappingInput {
  readonly attributes: Readonly<Record<string, string>>;
  readonly groups: readonly string[];
  readonly allowedAttributes: readonly string[];
  readonly allowedGroups: readonly string[];
}

export interface EnterpriseIdentityControlPlane {
  requestSsoConnection(
    context: TenantContext,
    input: Omit<
      TenantSsoConnection,
      | "connectionId"
      | "connectionStatus"
      | "requestedBy"
      | "approvedBy"
      | "verifiedBy"
      | "createdAt"
      | "activatedAt"
      | "suspendedAt"
      | "revokedAt"
      | "verifiedDomains"
      | "domainVerificationStatus"
    >,
  ): Promise<EnterpriseIdentityOutcome<TenantSsoConnection>>;
  approveSsoConnection(
    requesterContext: TenantContext,
    approverContext: TenantContext,
    connectionId: string,
  ): Promise<EnterpriseIdentityOutcome<TenantSsoConnection>>;
  verifyDomain(
    context: TenantContext,
    connectionId: string,
    input: { domain: string; method: DomainVerificationMethod },
  ): Promise<EnterpriseIdentityOutcome<TenantSsoConnection>>;
  activateSsoConnection(
    context: TenantContext,
    connectionId: string,
  ): Promise<EnterpriseIdentityOutcome<TenantSsoConnection>>;
  suspendSsoConnection(
    context: TenantContext,
    connectionId: string,
  ): Promise<EnterpriseIdentityOutcome<TenantSsoConnection>>;
  revokeSsoConnection(
    context: TenantContext,
    connectionId: string,
  ): Promise<EnterpriseIdentityOutcome<TenantSsoConnection>>;
  provisionJitMembership(
    context: TenantContext,
    connectionId: string,
    input: { actor: ActorIdentity; requestedRoles: readonly string[] },
  ): Promise<
    EnterpriseIdentityOutcome<{
      readonly membershipStatus: "invited" | "active";
      readonly grantedRoles: readonly string[];
    }>
  >;
  issueInvitation(
    context: TenantContext,
    input: {
      readonly email: string;
      readonly expiresAt: string;
      readonly requiredDomain?: string | null;
      readonly requiredAssuranceLevel: AssuranceLevel;
    },
  ): Promise<EnterpriseIdentityOutcome<IdentityInvitation>>;
  acceptInvitation(
    context: TenantContext,
    invitationId: string,
    actor: ActorIdentity,
  ): Promise<EnterpriseIdentityOutcome<IdentityInvitation>>;
  linkIdentity(
    context: TenantContext,
    input: { actorId: string; externalSubject: string; assuranceLevel: AssuranceLevel },
  ): Promise<EnterpriseIdentityOutcome<LinkedIdentity>>;
  unlinkIdentity(
    context: TenantContext,
    linkId: string,
  ): Promise<EnterpriseIdentityOutcome<LinkedIdentity>>;
  mapAttributesAndGroups(
    context: TenantContext,
    input: AttributeMappingInput,
  ): Promise<
    EnterpriseIdentityOutcome<{
      readonly mappedAttributes: Readonly<Record<string, { source: string; confidence: string }>>;
      readonly proposedGroups: readonly string[];
      readonly directRoleGrant: false;
    }>
  >;
  requireAssurance(
    context: TenantContext,
    input: { current: AssuranceLevel; required: AssuranceLevel; action: string },
  ): Promise<EnterpriseIdentityOutcome<{ readonly stepUpRequired: boolean }>>;
  evaluateBrowserFlow(
    context: TenantContext,
    input: BrowserFlowPolicyInput,
  ): Promise<
    EnterpriseIdentityOutcome<{
      readonly browserFlowSecurity: "state-nonce-pkce-csrf-cookie-redirects-validated";
      readonly refreshTokenRotationRequired: true;
      readonly liveBrowserReadinessClaim: false;
    }>
  >;
  emitThreatSignal(
    context: TenantContext,
    signal:
      | "repeated_login_failure"
      | "tenant_selection_denied"
      | "impossible_tenant_switch"
      | "broker_link_collision"
      | "domain_claim_conflict"
      | "sso_connection_suspended"
      | "stale_session_used"
      | "revoked_membership_used"
      | "token_replay_suspected",
  ): Promise<EnterpriseIdentityOutcome<{ readonly signalRecorded: true; readonly liveSiemClaim: false }>>;
  getConnection(connectionId: string): TenantSsoConnection | undefined;
}

export interface EnterpriseIdentityControlPlaneDeps {
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly now?: () => Date;
}

const ASSURANCE_RANK: Readonly<Record<AssuranceLevel, number>> = Object.freeze({
  "loa0-unknown": 0,
  "loa1-password-or-brokered-basic": 1,
  "loa2-mfa-or-stronger": 2,
  "loa3-phishing-resistant-or-admin-approved": 3,
  "loa4-high-assurance-admin": 4,
});

const THREAT_SIGNAL_EVENT: Readonly<Record<string, string>> = Object.freeze({
  repeated_login_failure: "security.repeated_denial",
  tenant_selection_denied: "authentication.tenant_selection.denied",
  impossible_tenant_switch: "security.impossible_tenant_switch",
  broker_link_collision: "security.broker_link_collision",
  domain_claim_conflict: "security.domain_claim_conflict",
  sso_connection_suspended: "tenant_sso.suspended",
  stale_session_used: "security.stale_session_used",
  revoked_membership_used: "security.revoked_membership_used",
  token_replay_suspected: "security.token_replay_suspected",
});

const DENIED = "denied";
const SUCCESS = "success";

function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function normalizeDomain(domain: string): string {
  const lowered = domain.trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(lowered)) {
    throw new Error("invalid domain");
  }
  return lowered;
}

function hasPrivilegedRole(roles: readonly string[]): boolean {
  return roles.some((role) => role === "tenant-admin" || role === "security-admin");
}

function deny<T>(reasonCode: string, decision?: PolicyDecision): EnterpriseIdentityOutcome<T> {
  return decision ? { ok: false, reasonCode, decision } : { ok: false, reasonCode };
}

function permit<T>(value: T, decision?: PolicyDecision): EnterpriseIdentityOutcome<T> {
  return decision ? { ok: true, value, decision } : { ok: true, value };
}

export function createEnterpriseIdentityControlPlane(
  deps: EnterpriseIdentityControlPlaneDeps,
): EnterpriseIdentityControlPlane {
  const clock = deps.now ?? (() => new Date());
  const connections = new Map<string, TenantSsoConnection>();
  const domainOwners = new Map<string, string>();
  const invitations = new Map<string, IdentityInvitation>();
  const links = new Map<string, LinkedIdentity>();
  let sequence = 0;

  async function audit(input: {
    eventType: string;
    context: TenantContext;
    action: string;
    outcome: "success" | "denied" | "failed";
    reasonCode: string;
    resourceType: string;
    resourceId: string;
    metadata?: Readonly<Record<string, unknown>>;
    decision?: PolicyDecision;
  }): Promise<void> {
    sequence += 1;
    await deps.audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [
          input.context.tenantId,
          input.context.actorId,
          input.eventType,
          String(sequence),
        ]),
        eventType: input.eventType,
        tenantId: input.context.tenantId,
        actorId: input.context.actorId,
        action: input.action,
        outcome: input.outcome,
        reasonCode: input.reasonCode,
        recordedByComponent: "enterprise-identity-control-plane",
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        policyVersion: input.decision?.policyVersion ?? null,
        decisionId: input.decision?.decisionId ?? null,
        obligations: input.decision?.obligations ?? [],
        metadata: input.metadata ?? {},
      }),
    );
  }

  async function authorize(
    context: TenantContext,
    action: IdentityEnterpriseAction,
    resourceType: string,
    resourceId: string,
  ): Promise<PolicyDecision> {
    return deps.pdp.decide({
      context,
      action,
      resource: {
        type: resourceType,
        id: resourceId,
        tenantId: context.tenantId,
        attributes: { data_classification: "security-sensitive" },
      },
    });
  }

  async function requirePermit(
    context: TenantContext,
    action: IdentityEnterpriseAction,
    resourceType: string,
    resourceId: string,
  ): Promise<EnterpriseIdentityOutcome<PolicyDecision>> {
    const decision = await authorize(context, action, resourceType, resourceId);
    if (decision.effect !== "permit") {
      await audit({
        eventType: "tenant_sso.denied",
        context,
        action,
        outcome: DENIED,
        reasonCode: decision.reasonCode,
        resourceType,
        resourceId,
        decision,
      });
      return deny(decision.reasonCode, decision);
    }
    return permit(decision, decision);
  }

  function update(connection: TenantSsoConnection): TenantSsoConnection {
    const frozen = freeze(connection) as TenantSsoConnection;
    connections.set(connection.connectionId, frozen);
    return frozen;
  }

  function getOwnedConnection(
    context: TenantContext,
    connectionId: string,
  ): EnterpriseIdentityOutcome<TenantSsoConnection> {
    const connection = connections.get(connectionId);
    if (!connection) {
      return deny("sso-connection-not-found");
    }
    if (connection.tenantId !== context.tenantId) {
      return deny("tenant-boundary");
    }
    return permit(connection);
  }

  return {
    async requestSsoConnection(context, input) {
      const permitted = await requirePermit(context, "tenant_sso.request", "tenant-sso", "new");
      if (!permitted.ok) return permitted;
      const domains = input.allowedDomains.map(normalizeDomain);
      const now = clock().toISOString();
      const connectionId = stableId("sso", [
        context.tenantId,
        input.brokerAlias,
        input.connectionName,
        now,
      ]);
      const connection = update({
        ...input,
        connectionId,
        tenantId: context.tenantId,
        connectionStatus: "requested",
        requestedBy: context.actorId,
        approvedBy: null,
        verifiedBy: null,
        createdAt: now,
        activatedAt: null,
        suspendedAt: null,
        revokedAt: null,
        allowedDomains: freeze([...domains]) as readonly string[],
        verifiedDomains: freeze([]) as readonly string[],
        domainVerificationStatus: "pending",
      });
      await audit({
        eventType: "tenant_sso.requested",
        context,
        action: "tenant_sso.request",
        outcome: SUCCESS,
        reasonCode: "requested",
        resourceType: "tenant-sso",
        resourceId: connectionId,
        decision: permitted.value,
        metadata: { domainCount: domains.length, brokerAliasHash: opaqueHash(input.brokerAlias) },
      });
      return permit(connection, permitted.value);
    },

    async approveSsoConnection(requesterContext, approverContext, connectionId) {
      const owned = getOwnedConnection(requesterContext, connectionId);
      if (!owned.ok) return owned;
      if (requesterContext.tenantId !== approverContext.tenantId) {
        return deny("tenant-boundary");
      }
      if (owned.value.requestedBy === approverContext.actorId) {
        await audit({
          eventType: "tenant_sso.denied",
          context: approverContext,
          action: "tenant_sso.activate",
          outcome: DENIED,
          reasonCode: "requester-approver-same",
          resourceType: "tenant-sso",
          resourceId: connectionId,
        });
        return deny("requester-approver-same");
      }
      const permitted = await requirePermit(
        approverContext,
        "tenant_sso.activate",
        "tenant-sso",
        connectionId,
      );
      if (!permitted.ok) return permitted;
      const next = update({
        ...owned.value,
        approvedBy: approverContext.actorId,
        connectionStatus:
          owned.value.domainVerificationStatus === "verified" ? "pending-approval" : "pending-verification",
      });
      await audit({
        eventType: "tenant_sso.configured",
        context: approverContext,
        action: "tenant_sso.activate",
        outcome: SUCCESS,
        reasonCode: "approved",
        resourceType: "tenant-sso",
        resourceId: connectionId,
        decision: permitted.value,
      });
      return permit(next, permitted.value);
    },

    async verifyDomain(context, connectionId, input) {
      const owned = getOwnedConnection(context, connectionId);
      if (!owned.ok) return owned;
      const permitted = await requirePermit(
        context,
        "tenant_sso.verify_domain",
        "tenant-sso",
        connectionId,
      );
      if (!permitted.ok) return permitted;
      const domain = normalizeDomain(input.domain);
      if (!owned.value.allowedDomains.includes(domain)) {
        return deny("domain-not-allowed", permitted.value);
      }
      const existingTenant = domainOwners.get(domain);
      if (existingTenant && existingTenant !== context.tenantId) {
        const failed = update({
          ...owned.value,
          connectionStatus: "failed",
          domainVerificationStatus: "conflict",
        });
        await audit({
          eventType: "security.domain_claim_conflict",
          context,
          action: "tenant_sso.verify_domain",
          outcome: DENIED,
          reasonCode: "domain-claim-conflict",
          resourceType: "tenant-sso",
          resourceId: connectionId,
          decision: permitted.value,
          metadata: { domainHash: opaqueHash(domain) },
        });
        return deny(`domain-claim-conflict:${failed.connectionStatus}`, permitted.value);
      }
      domainOwners.set(domain, context.tenantId);
      const verifiedDomains = [...new Set([...owned.value.verifiedDomains, domain])].sort();
      const next = update({
        ...owned.value,
        verifiedBy: context.actorId,
        verifiedDomains: freeze(verifiedDomains) as readonly string[],
        domainVerificationMethod: input.method,
        domainVerificationStatus: "verified",
        connectionStatus: owned.value.approvedBy ? "pending-approval" : "pending-approval",
      });
      await audit({
        eventType: "tenant_sso.domain_verified",
        context,
        action: "tenant_sso.verify_domain",
        outcome: SUCCESS,
        reasonCode: input.method,
        resourceType: "tenant-sso",
        resourceId: connectionId,
        decision: permitted.value,
        metadata: { domainHash: opaqueHash(domain), method: input.method },
      });
      return permit(next, permitted.value);
    },

    async activateSsoConnection(context, connectionId) {
      const owned = getOwnedConnection(context, connectionId);
      if (!owned.ok) return owned;
      const permitted = await requirePermit(context, "tenant_sso.activate", "tenant-sso", connectionId);
      if (!permitted.ok) return permitted;
      if (!owned.value.approvedBy || owned.value.domainVerificationStatus !== "verified") {
        return deny("approval-or-domain-verification-missing", permitted.value);
      }
      const next = update({
        ...owned.value,
        connectionStatus: "active",
        activatedAt: clock().toISOString(),
      });
      await audit({
        eventType: "tenant_sso.activated",
        context,
        action: "tenant_sso.activate",
        outcome: SUCCESS,
        reasonCode: "activated",
        resourceType: "tenant-sso",
        resourceId: connectionId,
        decision: permitted.value,
      });
      return permit(next, permitted.value);
    },

    async suspendSsoConnection(context, connectionId) {
      const owned = getOwnedConnection(context, connectionId);
      if (!owned.ok) return owned;
      const permitted = await requirePermit(context, "tenant_sso.suspend", "tenant-sso", connectionId);
      if (!permitted.ok) return permitted;
      const next = update({
        ...owned.value,
        connectionStatus: "suspended",
        suspendedAt: clock().toISOString(),
      });
      await audit({
        eventType: "tenant_sso.suspended",
        context,
        action: "tenant_sso.suspend",
        outcome: SUCCESS,
        reasonCode: "suspended",
        resourceType: "tenant-sso",
        resourceId: connectionId,
        decision: permitted.value,
      });
      return permit(next, permitted.value);
    },

    async revokeSsoConnection(context, connectionId) {
      const owned = getOwnedConnection(context, connectionId);
      if (!owned.ok) return owned;
      const permitted = await requirePermit(context, "tenant_sso.revoke", "tenant-sso", connectionId);
      if (!permitted.ok) return permitted;
      const next = update({
        ...owned.value,
        connectionStatus: "revoked",
        revokedAt: clock().toISOString(),
      });
      await audit({
        eventType: "tenant_sso.revoked",
        context,
        action: "tenant_sso.revoke",
        outcome: SUCCESS,
        reasonCode: "revoked",
        resourceType: "tenant-sso",
        resourceId: connectionId,
        decision: permitted.value,
      });
      return permit(next, permitted.value);
    },

    async provisionJitMembership(context, connectionId, input) {
      const owned = getOwnedConnection(context, connectionId);
      if (!owned.ok) return owned;
      if (owned.value.connectionStatus !== "active") {
        return deny("sso-connection-not-active");
      }
      if (owned.value.jitProvisioningPolicy === "disabled") {
        return deny("jit-disabled");
      }
      if (input.actor.actorId !== context.actorId) {
        return deny("actor-boundary");
      }
      if (hasPrivilegedRole(input.requestedRoles)) {
        return deny("jit-privileged-role-denied");
      }
      const membershipStatus =
        owned.value.jitProvisioningPolicy === "active-non-privileged-membership"
          ? "active"
          : "invited";
      await audit({
        eventType: "authentication.identity.linked",
        context,
        action: "identity.jit.provision",
        outcome: SUCCESS,
        reasonCode: membershipStatus,
        resourceType: "tenant-sso",
        resourceId: connectionId,
        metadata: { externalSubjectHash: opaqueHash(input.actor.externalSubject) },
      });
      return permit({
        membershipStatus,
        grantedRoles: freeze([...input.requestedRoles]) as readonly string[],
      });
    },

    async issueInvitation(context, input) {
      const permitted = await requirePermit(context, "tenant_sso.configure", "identity-invitation", "new");
      if (!permitted.ok) return permitted;
      const invitationId = stableId("invite", [context.tenantId, input.email, input.expiresAt]);
      const invitation = freeze({
        invitationId,
        tenantId: context.tenantId,
        invitedEmailHash: opaqueHash(input.email.toLowerCase()),
        invitedBy: context.actorId,
        expiresAt: input.expiresAt,
        acceptedAt: null,
        acceptedByActorId: null,
        brokeredIdentityRequired: true,
        requiredDomain: input.requiredDomain ? normalizeDomain(input.requiredDomain) : null,
        requiredAssuranceLevel: input.requiredAssuranceLevel,
        status: "issued" as const,
      }) as IdentityInvitation;
      invitations.set(invitationId, invitation);
      await audit({
        eventType: "tenant_sso.configured",
        context,
        action: "identity.invitation.issue",
        outcome: SUCCESS,
        reasonCode: "invitation-issued",
        resourceType: "identity-invitation",
        resourceId: invitationId,
        decision: permitted.value,
      });
      return permit(invitation, permitted.value);
    },

    async acceptInvitation(context, invitationId, actor) {
      const invitation = invitations.get(invitationId);
      if (!invitation || invitation.tenantId !== context.tenantId) {
        return deny("invitation-not-found");
      }
      if (new Date(invitation.expiresAt) <= clock()) {
        const expired = freeze({ ...invitation, status: "expired" as const }) as IdentityInvitation;
        invitations.set(invitationId, expired);
        return deny("invitation-expired");
      }
      if (actor.actorId !== context.actorId) {
        return deny("actor-boundary");
      }
      const accepted = freeze({
        ...invitation,
        acceptedAt: clock().toISOString(),
        acceptedByActorId: actor.actorId,
        status: "accepted" as const,
      }) as IdentityInvitation;
      invitations.set(invitationId, accepted);
      await audit({
        eventType: "authentication.identity.linked",
        context,
        action: "identity.invitation.accept",
        outcome: SUCCESS,
        reasonCode: "accepted",
        resourceType: "identity-invitation",
        resourceId: invitationId,
        metadata: { actorExternalSubjectHash: opaqueHash(actor.externalSubject) },
      });
      return permit(accepted);
    },

    async linkIdentity(context, input) {
      if (input.actorId !== context.actorId) {
        return deny("actor-boundary");
      }
      if (ASSURANCE_RANK[input.assuranceLevel] < ASSURANCE_RANK["loa2-mfa-or-stronger"]) {
        return deny("step-up-required");
      }
      const linkId = stableId("link", [input.actorId, input.externalSubject]);
      const linked = freeze({
        linkId,
        actorId: input.actorId,
        externalSubjectHash: opaqueHash(input.externalSubject),
        linkedAt: clock().toISOString(),
        status: "active" as const,
      }) as LinkedIdentity;
      links.set(linkId, linked);
      await audit({
        eventType: "authentication.identity.linked",
        context,
        action: "identity.link",
        outcome: SUCCESS,
        reasonCode: "proof-of-control",
        resourceType: "identity-link",
        resourceId: linkId,
      });
      return permit(linked);
    },

    async unlinkIdentity(context, linkId) {
      const link = links.get(linkId);
      if (!link || link.actorId !== context.actorId) {
        return deny("identity-link-not-found");
      }
      const activeLinks = [...links.values()].filter(
        (candidate) => candidate.actorId === context.actorId && candidate.status === "active",
      );
      if (activeLinks.length <= 1) {
        return deny("last-login-method-denied");
      }
      const unlinked = freeze({ ...link, status: "unlinked" as const }) as LinkedIdentity;
      links.set(linkId, unlinked);
      await audit({
        eventType: "authentication.identity.unlinked",
        context,
        action: "identity.unlink",
        outcome: SUCCESS,
        reasonCode: "unlinked",
        resourceType: "identity-link",
        resourceId: linkId,
      });
      return permit(unlinked);
    },

    async mapAttributesAndGroups(context, input) {
      const permitted = await requirePermit(
        context,
        "tenant_sso.update_mapping",
        "tenant-sso-mapping",
        context.tenantId,
      );
      if (!permitted.ok) return permitted;
      const allowed = new Set(input.allowedAttributes);
      const mapped = Object.fromEntries(
        Object.entries(input.attributes)
          .filter(([key]) => allowed.has(key))
          .map(([key]) => [key, { source: "brokered-upstream-identity", confidence: "declared" }]),
      );
      const allowedGroups = new Set(input.allowedGroups);
      const proposedGroups = input.groups.filter((group) => allowedGroups.has(group)).sort();
      await audit({
        eventType: "tenant_sso.configured",
        context,
        action: "tenant_sso.update_mapping",
        outcome: SUCCESS,
        reasonCode: "mapping-policy-applied",
        resourceType: "tenant-sso-mapping",
        resourceId: context.tenantId,
        decision: permitted.value,
        metadata: { mappedAttributeCount: Object.keys(mapped).length, proposedGroupCount: proposedGroups.length },
      });
      return permit(
        {
          mappedAttributes: freeze(mapped) as Readonly<
            Record<string, { source: string; confidence: string }>
          >,
          proposedGroups: freeze(proposedGroups) as readonly string[],
          directRoleGrant: false as const,
        },
        permitted.value,
      );
    },

    async requireAssurance(context, input) {
      if (ASSURANCE_RANK[input.current] >= ASSURANCE_RANK[input.required]) {
        return permit({ stepUpRequired: false });
      }
      await audit({
        eventType: "tenant_sso.denied",
        context,
        action: input.action,
        outcome: DENIED,
        reasonCode: "step-up-required",
        resourceType: "assurance",
        resourceId: input.required,
      });
      return deny("step-up-required");
    },

    async evaluateBrowserFlow(context, input) {
      const failures = [
        input.state !== input.expectedState ? "state-mismatch" : null,
        input.nonce !== input.expectedNonce ? "nonce-mismatch" : null,
        !input.pkceChallenge ? "pkce-missing" : null,
        !input.allowedRedirectUris.includes(input.redirectUri) ? "redirect-not-allowed" : null,
        !input.allowedPostLogoutRedirectUris.includes(input.logoutRedirectUri)
          ? "logout-redirect-not-allowed"
          : null,
        !input.cookie.httpOnly ? "cookie-http-only-missing" : null,
        !input.cookie.secure ? "cookie-secure-missing" : null,
        input.cookie.sameSite === "none" ? "cookie-samesite-unsafe" : null,
        !input.csrfTokenPresent ? "csrf-missing" : null,
      ].filter((failure): failure is string => failure !== null);
      if (failures.length > 0) {
        return deny(failures[0] ?? "browser-flow-denied");
      }
      await audit({
        eventType: "authentication.session.created",
        context,
        action: "browser-flow.evaluate",
        outcome: SUCCESS,
        reasonCode: "browser-flow-security-validated",
        resourceType: "browser-flow",
        resourceId: "synthetic",
        metadata: { redirectUriHash: opaqueHash(input.redirectUri) },
      });
      return permit({
        browserFlowSecurity: "state-nonce-pkce-csrf-cookie-redirects-validated" as const,
        refreshTokenRotationRequired: true as const,
        liveBrowserReadinessClaim: false as const,
      });
    },

    async emitThreatSignal(context, signal) {
      await audit({
        eventType: THREAT_SIGNAL_EVENT[signal],
        context,
        action: `identity.threat.${signal}`,
        outcome: signal.includes("denied") ? DENIED : "failed",
        reasonCode: signal,
        resourceType: "identity-threat-signal",
        resourceId: stableId("threat", [context.tenantId, signal]),
      });
      return permit({ signalRecorded: true as const, liveSiemClaim: false as const });
    },

    getConnection(connectionId) {
      return connections.get(connectionId);
    },
  };
}

export function tenantAdminContext(input: { tenantId: string; actorId: string }): TenantContext {
  return createTenantContext({
    tenantId: input.tenantId,
    actorId: input.actorId,
    roles: ["tenant-admin"],
  });
}
