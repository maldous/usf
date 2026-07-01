// Keycloak-brokered authentication & identity proof (parity-auth-keycloak-broker,
// USF-133 / ADR 0012).
//
// Hermetic behaviour proof of the USF token-validation and identity boundary. It
// exercises the REAL verifier, identity mapping, session lifecycle, and identity->tenant
// handoff against a hermetic Keycloak-equivalent issuer (Charter §6.2). It proves USF:
//   * accepts a valid Keycloak-issued token and resolves a stable actor (not email);
//   * fails closed on non-Keycloak issuer, brokered-upstream issuer presented directly,
//     bad audience/signature/algorithm/key, expiry, and not-before / issued-in-future;
//   * never merges actors by email; email change is an attribute update, not a new actor;
//   * fails closed for disabled and unknown identities;
//   * expires (absolute + idle), revokes, and logs out sessions, all fail closed;
//   * requires an active USF membership for tenant selection and routes through the PDP —
//     a Keycloak claim/role/group or broker alias never authorizes on its own;
//   * records value-free audit (no token/cookie/secret).
//
// Hermetic-mock / hermetic. NOT live-external-provider or production-live evidence.
import { fileURLToPath } from "node:url";
import { createKeycloakTokenVerifier, HermeticKeycloak } from "@foundation/adapter-idp";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import {
  createEnterpriseIdentityControlPlane,
  createKeycloakAuthService,
  createSessionService,
  InMemorySessionStore,
  tenantAdminContext,
} from "@foundation/capability-auth";
import {
  createPolicyDecisionPoint,
  InMemoryIdentityDirectory,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import {
  type AuditEvent,
  type AuditEventDraft,
  createTenantContext,
  KeycloakTokenError,
  keycloakExternalSubject,
} from "@foundation/core";
import type { AuditRecorder } from "@foundation/ports";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const UPSTREAM_BROKER_ISSUER = "https://upstream.broker.invalid/op"; // opaque; never named/accepted

async function main() {
  const checks: string[] = [];
  const issuedTokens: string[] = [];
  const pass = (label: string): void => {
    checks.push(label);
  };
  const expectVerifyDeny = (
    label: string,
    token: string,
    expected: string,
    verify: (t: string) => unknown,
  ): void => {
    try {
      verify(token);
    } catch (error) {
      if (error instanceof KeycloakTokenError) {
        if (error.reasonCode !== expected) {
          throw new Error(`${label}: expected ${expected}, got ${error.reasonCode}`, {
            cause: error,
          });
        }
        pass(`${label}: denied (${expected})`);
        return;
      }
      throw error;
    }
    throw new Error(`${label}: expected denial ${expected} but verification succeeded`);
  };

  const nowSec = 1_700_000_000;
  const kc = new HermeticKeycloak({ now: () => nowSec });
  const verifier = createKeycloakTokenVerifier(
    kc.verifierConfig({ brokeredUpstreamIssuers: [UPSTREAM_BROKER_ISSUER] }),
  );

  // ---- A. Keycloak-issued token validation matrix --------------------------------
  const valid = kc.issueToken({
    subject: "kc-sub-alice",
    email: "alice@a.example",
    emailVerified: true,
    acr: "loa2",
    brokerAlias: "broker-alias-opaque",
    brokeredSubject: "brokered-subj-opaque",
    brokeredIssuer: "brokered-iss-opaque",
    realmRoles: ["tenant-admin"],
    groups: ["admins"],
  });
  issuedTokens.push(valid);
  const verified = verifier.verify(valid);
  if (verified.keycloakSubject !== "kc-sub-alice" || verified.keycloakRealm !== kc.realm) {
    throw new Error("valid token did not verify to the expected subject/realm");
  }
  if (verified.assuranceLevel !== "loa2-mfa-or-stronger") {
    throw new Error(`assurance mapping wrong: ${verified.assuranceLevel}`);
  }
  if (verified.provenance.brokerAlias !== "broker-alias-opaque") {
    throw new Error("brokered provenance not carried opaquely");
  }
  pass("valid Keycloak-issued token accepted; stable subject+realm+assurance+opaque provenance");

  expectVerifyDeny(
    "non-Keycloak issuer",
    kc.issueToken({ subject: "x", issuer: "https://not-keycloak.invalid/realms/x" }),
    "issuer-not-keycloak",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "brokered-upstream issuer presented directly",
    kc.issueToken({ subject: "x", issuer: UPSTREAM_BROKER_ISSUER }),
    "brokered-upstream-issuer-presented-directly",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "audience mismatch",
    kc.issueToken({ subject: "x", audience: "some-other-client" }),
    "audience-mismatch",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "invalid signature",
    kc.issueToken({ subject: "x" }, { signWithWrongKey: true }),
    "invalid-signature",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "expired token",
    kc.issueToken({ subject: "x", expiresInSec: -100 }),
    "expired",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "not-before in future",
    kc.issueToken({ subject: "x", notBeforeSec: 10_000 }),
    "not-yet-valid",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "issued in the future",
    kc.issueToken({ subject: "x", iatOffsetSec: 10_000 }),
    "issued-in-future",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "alg none",
    kc.issueToken({ subject: "x" }, { alg: "none" }),
    "unsupported-algorithm",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "alg HS256 (symmetric)",
    kc.issueToken({ subject: "x" }, { alg: "HS256" }),
    "unsupported-algorithm",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny(
    "unknown signing key (kid)",
    kc.issueToken({ subject: "x" }, { kid: "unknown-kid" }),
    "unknown-key",
    (t) => verifier.verify(t),
  );
  expectVerifyDeny("malformed token", "not-a-valid-jwt", "malformed-token", (t) =>
    verifier.verify(t),
  );

  // Same Keycloak subject in a different realm is NOT automatically the same actor.
  if (
    keycloakExternalSubject("foundation", "kc-sub-alice") ===
    keycloakExternalSubject("other-realm", "kc-sub-alice")
  ) {
    throw new Error("external subject key must differ across realms");
  }
  pass("same subject in a different Keycloak realm maps to a different external subject");

  // ---- Identity directory, memberships, PDP, audit -------------------------------
  const identity = new InMemoryIdentityDirectory();
  identity.upsert({
    actorId: "actor-alice",
    externalSubject: keycloakExternalSubject(kc.realm, "kc-sub-alice"),
    identityProvider: "keycloak",
    email: "alice@a.example",
    emailVerified: true,
    enabled: true,
  });
  // Duplicate email, different Keycloak subject -> a DIFFERENT actor (no merge by email).
  identity.upsert({
    actorId: "actor-bob",
    externalSubject: keycloakExternalSubject(kc.realm, "kc-sub-bob"),
    identityProvider: "keycloak",
    email: "alice@a.example",
    emailVerified: true,
    enabled: true,
  });
  identity.upsert({
    actorId: "actor-multi",
    externalSubject: keycloakExternalSubject(kc.realm, "kc-sub-multi"),
    identityProvider: "keycloak",
    email: "multi@a.example",
    emailVerified: true,
    enabled: true,
  });
  identity.upsert({
    actorId: "actor-disabled",
    externalSubject: keycloakExternalSubject(kc.realm, "kc-sub-disabled"),
    identityProvider: "keycloak",
    email: "dis@a.example",
    emailVerified: true,
    enabled: false,
  });

  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "m-a",
    tenantId: TENANT_A,
    actorId: "actor-alice",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "m-ma",
    tenantId: TENANT_A,
    actorId: "actor-multi",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "m-mb",
    tenantId: TENANT_B,
    actorId: "actor-multi",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "m-b",
    tenantId: TENANT_B,
    actorId: "actor-bob",
    status: "active",
    roles: ["tenant-admin"],
  });

  const pdp = createPolicyDecisionPoint({ memberships });
  const store = new InMemoryAuditEventStore();
  const recorded: AuditEvent[] = [];
  const recorder: AuditRecorder = {
    async record(draft: AuditEventDraft): Promise<AuditEvent> {
      const event = await store.record(draft);
      recorded.push(event);
      return event;
    },
  };
  const sessions = createSessionService({
    store: new InMemorySessionStore(),
    now: () => new Date(nowSec * 1000),
  });
  const auth = createKeycloakAuthService({
    verifier,
    identity,
    sessions,
    memberships,
    pdp,
    audit: recorder,
  });

  // ---- B. Identity mapping --------------------------------------------------------
  const aliceLogin = await auth.authenticate(valid);
  if (!aliceLogin.ok || aliceLogin.actor.actorId !== "actor-alice") {
    throw new Error("valid login did not resolve to actor-alice");
  }
  pass("valid token -> stable actor (actor-alice) + active session created");

  const bobToken = kc.issueToken({
    subject: "kc-sub-bob",
    email: "alice@a.example",
    emailVerified: true,
  });
  issuedTokens.push(bobToken);
  const bobLogin = await auth.authenticate(bobToken);
  if (!aliceLogin.ok || !bobLogin.ok || bobLogin.actor.actorId !== "actor-bob") {
    throw new Error("duplicate-email login resolved to the wrong actor");
  }
  // alice and bob share an email but are distinct actors (keyed by realm+subject).
  pass("duplicate email across two Keycloak subjects does NOT merge actors");

  const aliceNewEmail = kc.issueToken({
    subject: "kc-sub-alice",
    email: "alice.new@a.example",
    emailVerified: true,
  });
  issuedTokens.push(aliceNewEmail);
  const aliceAgain = await auth.authenticate(aliceNewEmail);
  if (!aliceAgain.ok || aliceAgain.actor.actorId !== "actor-alice") {
    throw new Error("email change created a new actor");
  }
  pass("email change is an attribute update, not a new actor (same realm+subject -> same actor)");

  const disabled = await auth.authenticate(
    kc.issueToken({ subject: "kc-sub-disabled", email: "dis@a.example" }),
  );
  if (disabled.ok || disabled.reasonCode !== "identity-disabled") {
    throw new Error("disabled identity was not denied");
  }
  pass("disabled identity fails closed (identity-disabled)");

  const unknown = await auth.authenticate(
    kc.issueToken({ subject: "kc-sub-ghost", email: "ghost@a.example" }),
  );
  if (unknown.ok || unknown.reasonCode !== "unknown-identity") {
    throw new Error("unknown identity was not denied");
  }
  pass("unknown brokered identity fails closed (no silent JIT actor creation)");

  // ---- C. Session lifecycle -------------------------------------------------------
  let clockSec = nowSec;
  const lifecycleSessions = createSessionService({
    store: new InMemorySessionStore(),
    now: () => new Date(clockSec * 1000),
    sessionTtlSec: 100,
    idleTtlSec: 50,
  });
  const s1 = lifecycleSessions.create({
    actorId: "actor-alice",
    keycloakRealm: kc.realm,
    keycloakSubject: "kc-sub-alice",
    keycloakSessionState: "kc-session-xyz",
    assuranceLevel: "loa2-mfa-or-stronger",
  });
  if (!lifecycleSessions.validate(s1.sessionId).ok) {
    throw new Error("fresh session did not validate");
  }
  pass("fresh session validates active");

  clockSec = nowSec + 200; // past absolute TTL
  const expired = lifecycleSessions.validate(s1.sessionId);
  if (expired.ok || expired.reasonCode !== "session-expired") {
    throw new Error("expired session was not denied");
  }
  pass("absolute session expiry fails closed");

  clockSec = nowSec;
  const s2 = lifecycleSessions.create({
    actorId: "actor-alice",
    keycloakRealm: kc.realm,
    keycloakSubject: "kc-sub-alice",
    assuranceLevel: "loa1-password-or-brokered-basic",
  });
  clockSec = nowSec + 60; // past idle TTL (50) but not absolute (100)
  const idle = lifecycleSessions.validate(s2.sessionId);
  if (idle.ok || idle.reasonCode !== "session-idle-expired") {
    throw new Error("idle session was not denied");
  }
  pass("idle session expiry fails closed");

  // Revoke + logout via the orchestrator (audited).
  const toRevoke = await auth.authenticate(valid);
  if (!toRevoke.ok) throw new Error("setup login for revoke failed");
  await auth.revoke(toRevoke.session.sessionId, "test-revocation");
  if (sessions.validate(toRevoke.session.sessionId).ok) {
    throw new Error("revoked session still validates");
  }
  pass("revoked session fails closed (audited)");

  const toLogout = await auth.authenticate(valid);
  if (!toLogout.ok) throw new Error("setup login for logout failed");
  await auth.logout(toLogout.session.sessionId);
  const afterLogout = sessions.validate(toLogout.session.sessionId);
  if (afterLogout.ok || afterLogout.reasonCode !== "session-logged-out") {
    throw new Error("logout did not invalidate the session");
  }
  pass("logout invalidates the session (audited)");

  // ---- D. Identity -> tenant handoff (through the PDP) ----------------------------
  const aliceSession = await auth.authenticate(valid);
  if (!aliceSession.ok) throw new Error("alice login for tenant handoff failed");
  const selA = await auth.selectTenant(aliceSession.session.sessionId, TENANT_A);
  if (!selA.ok || selA.context.tenantId !== TENANT_A) {
    throw new Error("alice could not select tenant A with active membership");
  }
  pass("actor with active membership selects its tenant (PDP permit)");

  const selB = await auth.selectTenant(aliceSession.session.sessionId, TENANT_B);
  if (selB.ok || selB.reasonCode !== "no-active-membership") {
    throw new Error("alice selected a tenant she is not a member of");
  }
  // The token carried realm roles, groups, and a broker alias; none granted access.
  pass(
    "tenant without active membership is denied — Keycloak claim/role/group/broker alias alone does NOT authorize",
  );
  if ("context" in selB) {
    throw new Error("denied tenant selection leaked a tenant context");
  }
  pass("denied tenant selection leaks no tenant context");

  const multi = await auth.authenticate(
    kc.issueToken({ subject: "kc-sub-multi", email: "multi@a.example", emailVerified: true }),
  );
  if (!multi.ok) throw new Error("multi login failed");
  const multiA = await auth.selectTenant(multi.session.sessionId, TENANT_A);
  const multiB = await auth.selectTenant(multi.session.sessionId, TENANT_B);
  if (!multiA.ok || !multiB.ok) {
    throw new Error("multi-tenant actor could not select both authorized tenants");
  }
  pass(
    "cross-tenant SSO: an actor with two active memberships selects either tenant (explicit memberships only)",
  );

  // ---- E. Enterprise identity / tenant SSO control-plane depth -------------------
  const enterpriseIdentity = createEnterpriseIdentityControlPlane({
    pdp,
    audit: recorder,
    now: () => new Date(nowSec * 1000),
  });
  const requesterContext = tenantAdminContext({ tenantId: TENANT_A, actorId: "actor-alice" });
  const approverContext = tenantAdminContext({ tenantId: TENANT_A, actorId: "actor-multi" });
  const bobTenantBContext = tenantAdminContext({ tenantId: TENANT_B, actorId: "actor-bob" });
  const ssoRequest = await enterpriseIdentity.requestSsoConnection(requesterContext, {
    tenantId: TENANT_A,
    keycloakRealm: kc.realm,
    keycloakClient: "usf-hermetic-client",
    brokerAlias: "opaque-broker-alias",
    connectionName: "tenant-a-local-sso",
    expiresAt: null,
    allowedDomains: ["example.test"],
    domainVerificationMethod: "admin-approval",
    requiredAssuranceLevel: "loa2-mfa-or-stronger",
    allowedRedirectUris: ["https://app.local.invalid/callback"],
    allowedPostLogoutRedirectUris: ["https://app.local.invalid/logout"],
    attributeMappingPolicy: ["email", "department"],
    groupMappingPolicy: ["staff", "security-reviewers"],
    jitProvisioningPolicy: "pending-membership-only",
  });
  if (!ssoRequest.ok || ssoRequest.value.connectionStatus !== "requested") {
    throw new Error("tenant SSO request was not recorded");
  }
  const selfApproval = await enterpriseIdentity.approveSsoConnection(
    requesterContext,
    requesterContext,
    ssoRequest.value.connectionId,
  );
  if (selfApproval.ok || selfApproval.reasonCode !== "requester-approver-same") {
    throw new Error("SSO requester was allowed to approve their own connection");
  }
  pass("tenant self-service SSO request recorded; requester/approver separation fails closed");

  const domainVerified = await enterpriseIdentity.verifyDomain(
    requesterContext,
    ssoRequest.value.connectionId,
    { domain: "example.test", method: "admin-approval" },
  );
  if (!domainVerified.ok || domainVerified.value.domainVerificationStatus !== "verified") {
    throw new Error("tenant SSO domain verification did not complete");
  }
  const approved = await enterpriseIdentity.approveSsoConnection(
    requesterContext,
    approverContext,
    ssoRequest.value.connectionId,
  );
  if (!approved.ok || approved.value.approvedBy !== "actor-multi") {
    throw new Error("separate approver did not approve the SSO connection");
  }
  const activated = await enterpriseIdentity.activateSsoConnection(
    approverContext,
    ssoRequest.value.connectionId,
  );
  if (!activated.ok || activated.value.connectionStatus !== "active") {
    throw new Error("verified and approved SSO connection did not activate");
  }
  pass("tenant SSO verify -> approve -> activate lifecycle is PDP-gated and audited");

  const conflicting = await enterpriseIdentity.requestSsoConnection(bobTenantBContext, {
    tenantId: TENANT_B,
    keycloakRealm: kc.realm,
    keycloakClient: "usf-hermetic-client",
    brokerAlias: "opaque-broker-alias-b",
    connectionName: "tenant-b-local-sso",
    expiresAt: null,
    allowedDomains: ["example.test"],
    domainVerificationMethod: "admin-approval",
    requiredAssuranceLevel: "loa2-mfa-or-stronger",
    allowedRedirectUris: ["https://tenant-b.local.invalid/callback"],
    allowedPostLogoutRedirectUris: ["https://tenant-b.local.invalid/logout"],
    attributeMappingPolicy: ["email"],
    groupMappingPolicy: ["staff"],
    jitProvisioningPolicy: "pending-membership-only",
  });
  if (!conflicting.ok) throw new Error("tenant B conflict setup request failed");
  const conflictCheck = await enterpriseIdentity.verifyDomain(
    bobTenantBContext,
    conflicting.value.connectionId,
    { domain: "example.test", method: "admin-approval" },
  );
  if (conflictCheck.ok || !conflictCheck.reasonCode.startsWith("domain-claim-conflict")) {
    throw new Error("cross-tenant domain ownership collision did not fail closed");
  }
  pass("domain ownership verification blocks cross-tenant domain claim collision");

  const jitActor = {
    actorId: "actor-jit",
    externalSubject: keycloakExternalSubject(kc.realm, "kc-sub-jit"),
    identityProvider: "keycloak",
    email: "jit@example.test",
    emailVerified: true,
    enabled: true,
  };
  const jitContext = createTenantContext({
    tenantId: TENANT_A,
    actorId: jitActor.actorId,
    roles: ["tenant-member"],
  });
  const jitPrivileged = await enterpriseIdentity.provisionJitMembership(
    jitContext,
    ssoRequest.value.connectionId,
    { actor: jitActor, requestedRoles: ["tenant-admin"] },
  );
  if (jitPrivileged.ok || jitPrivileged.reasonCode !== "jit-privileged-role-denied") {
    throw new Error("JIT provisioning allowed a privileged role");
  }
  const jitPending = await enterpriseIdentity.provisionJitMembership(
    jitContext,
    ssoRequest.value.connectionId,
    { actor: jitActor, requestedRoles: ["tenant-member"] },
  );
  if (!jitPending.ok || jitPending.value.membershipStatus !== "invited") {
    throw new Error("JIT provisioning did not create a pending non-privileged membership");
  }
  pass("JIT provisioning is explicit, non-privileged, and fails closed for tenant-admin grants");

  const invitation = await enterpriseIdentity.issueInvitation(requesterContext, {
    email: "invitee@example.test",
    expiresAt: new Date((nowSec + 3600) * 1000).toISOString(),
    requiredDomain: "example.test",
    requiredAssuranceLevel: "loa2-mfa-or-stronger",
  });
  if (!invitation.ok) throw new Error("invitation issue failed");
  const acceptedInvitation = await enterpriseIdentity.acceptInvitation(
    jitContext,
    invitation.value.invitationId,
    jitActor,
  );
  if (!acceptedInvitation.ok || acceptedInvitation.value.status !== "accepted") {
    throw new Error("invitation acceptance failed");
  }
  const expiredInvitation = await enterpriseIdentity.issueInvitation(requesterContext, {
    email: "late@example.test",
    expiresAt: new Date((nowSec - 60) * 1000).toISOString(),
    requiredDomain: "example.test",
    requiredAssuranceLevel: "loa2-mfa-or-stronger",
  });
  if (!expiredInvitation.ok) throw new Error("expired invitation setup failed");
  const expiredAccept = await enterpriseIdentity.acceptInvitation(
    jitContext,
    expiredInvitation.value.invitationId,
    jitActor,
  );
  if (expiredAccept.ok || expiredAccept.reasonCode !== "invitation-expired") {
    throw new Error("expired invitation did not fail closed");
  }
  pass("invitation onboarding accepts valid invitations and denies expired ones");

  const stepUpNeeded = await enterpriseIdentity.requireAssurance(requesterContext, {
    current: "loa1-password-or-brokered-basic",
    required: "loa2-mfa-or-stronger",
    action: "tenant_sso.activate",
  });
  if (stepUpNeeded.ok || stepUpNeeded.reasonCode !== "step-up-required") {
    throw new Error("low-assurance privileged SSO action did not require step-up");
  }
  const stepUpSatisfied = await enterpriseIdentity.requireAssurance(approverContext, {
    current: "loa3-phishing-resistant-or-admin-approved",
    required: "loa2-mfa-or-stronger",
    action: "tenant_sso.activate",
  });
  if (!stepUpSatisfied.ok || stepUpSatisfied.value.stepUpRequired) {
    throw new Error("sufficient assurance was not accepted");
  }
  pass("assurance ladder enforces step-up for privileged identity operations");

  const lowAssuranceLink = await enterpriseIdentity.linkIdentity(requesterContext, {
    actorId: "actor-alice",
    externalSubject: "brokered-low-assurance",
    assuranceLevel: "loa1-password-or-brokered-basic",
  });
  if (lowAssuranceLink.ok || lowAssuranceLink.reasonCode !== "step-up-required") {
    throw new Error("low-assurance account linking did not fail closed");
  }
  const firstLink = await enterpriseIdentity.linkIdentity(requesterContext, {
    actorId: "actor-alice",
    externalSubject: "brokered-link-one",
    assuranceLevel: "loa2-mfa-or-stronger",
  });
  const secondLink = await enterpriseIdentity.linkIdentity(requesterContext, {
    actorId: "actor-alice",
    externalSubject: "brokered-link-two",
    assuranceLevel: "loa2-mfa-or-stronger",
  });
  if (!firstLink.ok || !secondLink.ok) throw new Error("account linking setup failed");
  const unlinkOne = await enterpriseIdentity.unlinkIdentity(
    requesterContext,
    firstLink.value.linkId,
  );
  if (!unlinkOne.ok || unlinkOne.value.status !== "unlinked") {
    throw new Error("account unlink did not succeed with another login method retained");
  }
  const unlinkLast = await enterpriseIdentity.unlinkIdentity(
    requesterContext,
    secondLink.value.linkId,
  );
  if (unlinkLast.ok || unlinkLast.reasonCode !== "last-login-method-denied") {
    throw new Error("last login method unlink did not fail closed");
  }
  pass("account linking requires proof-of-control and unlinking preserves a login method");

  const mapped = await enterpriseIdentity.mapAttributesAndGroups(requesterContext, {
    attributes: { email: "alice@example.test", department: "security", role: "tenant-admin" },
    groups: ["staff", "tenant-admin", "security-reviewers"],
    allowedAttributes: ["email", "department"],
    allowedGroups: ["staff", "security-reviewers"],
  });
  if (
    !mapped.ok ||
    mapped.value.directRoleGrant !== false ||
    "role" in mapped.value.mappedAttributes ||
    mapped.value.proposedGroups.includes("tenant-admin")
  ) {
    throw new Error("attribute/group mapping granted direct roles or leaked unmapped attributes");
  }
  pass("attribute/group mapping is allow-listed and never grants roles directly");

  const browserOk = await enterpriseIdentity.evaluateBrowserFlow(requesterContext, {
    state: "state-opaque",
    expectedState: "state-opaque",
    nonce: "nonce-opaque",
    expectedNonce: "nonce-opaque",
    pkceChallenge: "pkce-opaque",
    redirectUri: "https://app.local.invalid/callback",
    allowedRedirectUris: ["https://app.local.invalid/callback"],
    logoutRedirectUri: "https://app.local.invalid/logout",
    allowedPostLogoutRedirectUris: ["https://app.local.invalid/logout"],
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expiresAt: new Date((nowSec + 3600) * 1000).toISOString(),
    },
    csrfTokenPresent: true,
  });
  if (!browserOk.ok || browserOk.value.liveBrowserReadinessClaim !== false) {
    throw new Error("browser flow semantic proof did not pass without live readiness claim");
  }
  const browserDeny = await enterpriseIdentity.evaluateBrowserFlow(requesterContext, {
    state: "wrong",
    expectedState: "state-opaque",
    nonce: "nonce-opaque",
    expectedNonce: "nonce-opaque",
    pkceChallenge: "pkce-opaque",
    redirectUri: "https://evil.invalid/callback",
    allowedRedirectUris: ["https://app.local.invalid/callback"],
    logoutRedirectUri: "https://evil.invalid/logout",
    allowedPostLogoutRedirectUris: ["https://app.local.invalid/logout"],
    cookie: {
      httpOnly: false,
      secure: false,
      sameSite: "none",
      expiresAt: new Date((nowSec + 3600) * 1000).toISOString(),
    },
    csrfTokenPresent: false,
  });
  if (browserDeny.ok || browserDeny.reasonCode !== "state-mismatch") {
    throw new Error("unsafe browser flow did not fail closed");
  }
  pass("browser login/callback/cookie semantics are represented and fail closed locally");

  const threat = await enterpriseIdentity.emitThreatSignal(
    requesterContext,
    "token_replay_suspected",
  );
  if (!threat.ok || threat.value.liveSiemClaim !== false) {
    throw new Error("threat signal evidence made a live SIEM claim");
  }
  pass("security threat signal is emitted as local audit evidence without SIEM readiness");

  // ---- E. Audit is value-free -----------------------------------------------------
  const dump = JSON.stringify(recorded);
  for (const token of issuedTokens) {
    if (dump.includes(token)) {
      throw new Error("a raw token leaked into audit evidence");
    }
  }
  for (const needle of ["eyJ", "Bearer ", "-----BEGIN"]) {
    if (dump.includes(needle)) {
      throw new Error(`token/secret-shaped content leaked into audit: ${needle}`);
    }
  }
  if (recorded.length === 0) {
    throw new Error("no audit events were recorded");
  }
  pass(`auth events recorded value-free (${recorded.length} events, no token/cookie/secret)`);

  return {
    status: "pass" as const,
    proof: "auth-identity-keycloak-broker",
    providerMode: "hermetic-mock" as const,
    environment: "hermetic" as const,
    proofLevelObserved: "behaviour-proven" as const,
    liveExternalProviderClaim: false,
    liveKeycloakClaim: false,
    liveExternalIdpReadinessClaim: false,
    liveBrokerReadinessClaim: false,
    liveBrowserUiReadinessClaim: false,
    siemForwardingReadinessClaim: false,
    brokeredUpstreamAcceptedDirectly: false,
    productionLiveClaim: false,
    keycloakSoleIssuer: true,
    enterpriseIdentityDepthProven: true,
    tenantSelfServiceSsoLifecycleProven: true,
    requesterApproverSeparationProven: true,
    jitProvisioningPolicyProven: true,
    domainVerificationConflictFailClosed: true,
    invitationOnboardingProven: true,
    assuranceStepUpSemanticsProven: true,
    accountLinkingProofOfControlProven: true,
    attributeGroupMappingNoDirectRoleGrantProven: true,
    privilegedSsoAdminPdpGated: true,
    browserFlowSecuritySemanticsProven: true,
    threatDetectionEventPostureProven: true,
    checks: checks.length,
    checkLabels: checks,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main().then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}

export { main as runAuthIdentityProof };
