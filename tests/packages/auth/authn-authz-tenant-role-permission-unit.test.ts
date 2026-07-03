import { createKeycloakTokenVerifier, HermeticKeycloak } from "@foundation/adapter-idp";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import {
  createKeycloakAuthService,
  createSessionService,
  InMemorySessionStore,
} from "@foundation/capability-auth";
import {
  createPolicyDecisionPoint,
  InMemoryIdentityDirectory,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import {
  createTenantContext,
  keycloakExternalSubject,
  KeycloakTokenError,
  type AuditEvent,
  type AuditEventDraft,
  type AuthorizationRequest,
  type MembershipStatus,
  type TenantContext,
} from "@foundation/core";
import type { AuditRecorder } from "@foundation/ports";
import { describe, expect, it } from "vitest";

const NOW = 1_700_000_000;
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const TENANT_C = "tenant-c";
const UPSTREAM_ISSUER = "https://brokered-upstream.invalid/issuer";

function verifierReason(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof KeycloakTokenError) {
      return error.reasonCode;
    }
    throw error;
  }
  throw new Error("expected KeycloakTokenError");
}

function request(
  context: TenantContext,
  action: string,
  resourceTenantId = context.tenantId,
  attributes: Readonly<Record<string, string>> = {},
): AuthorizationRequest {
  return {
    context,
    action,
    resource: {
      type: "tenant-record",
      id: `resource-${resourceTenantId}`,
      tenantId: resourceTenantId,
      attributes,
    },
  };
}

function membershipDirectory() {
  const memberships = new InMemoryTenantMembershipDirectory();
  memberships.upsert({
    membershipId: "membership-a-admin",
    tenantId: TENANT_A,
    actorId: "actor-a",
    status: "active",
    roles: ["tenant-admin"],
  });
  memberships.upsert({
    membershipId: "membership-b-member",
    tenantId: TENANT_B,
    actorId: "actor-b",
    status: "active",
    roles: ["tenant-member"],
  });
  memberships.upsert({
    membershipId: "membership-a-member",
    tenantId: TENANT_A,
    actorId: "actor-member",
    status: "active",
    roles: ["tenant-member"],
  });
  memberships.upsert({
    membershipId: "membership-service-worker",
    tenantId: TENANT_A,
    actorId: "actor-service",
    status: "active",
    roles: ["service-worker"],
  });
  memberships.upsert({
    membershipId: "membership-suspended",
    tenantId: TENANT_A,
    actorId: "actor-suspended",
    status: "suspended",
    roles: ["tenant-admin"],
  });
  return memberships;
}

function context(tenantId: string, actorId: string, roles: readonly string[]): TenantContext {
  return createTenantContext({ tenantId, actorId, roles });
}

function authHarness() {
  const kc = new HermeticKeycloak({ now: () => NOW });
  const verifier = createKeycloakTokenVerifier(
    kc.verifierConfig({ brokeredUpstreamIssuers: [UPSTREAM_ISSUER] }),
  );
  const identity = new InMemoryIdentityDirectory();
  for (const [subject, actorId, enabled, emailVerified] of [
    ["sub-a", "actor-a", true, true],
    ["sub-b", "actor-b", true, true],
    ["sub-member", "actor-member", true, true],
    ["sub-service", "actor-service", true, true],
    ["sub-disabled", "actor-disabled", false, true],
    ["sub-unverified", "actor-unverified", true, false],
  ] as const) {
    identity.upsert({
      actorId,
      externalSubject: keycloakExternalSubject(kc.realm, subject),
      identityProvider: "keycloak",
      email: `${subject}@example.test`,
      emailVerified,
      enabled,
    });
  }
  const memberships = membershipDirectory();
  const pdp = createPolicyDecisionPoint({ memberships });
  const store = new InMemoryAuditEventStore();
  const recorded: AuditEvent[] = [];
  const audit: AuditRecorder = {
    async record(draft: AuditEventDraft) {
      const event = await store.record(draft);
      recorded.push(event);
      return event;
    },
  };
  const sessions = createSessionService({
    store: new InMemorySessionStore(),
    now: () => new Date(NOW * 1000),
  });
  const auth = createKeycloakAuthService({
    verifier,
    identity,
    sessions,
    memberships,
    pdp,
    audit,
  });
  return { auth, kc, recorded, verifier };
}

describe("USF-249 token posture", () => {
  it("accepts a valid Keycloak token and rejects invalid local token variants", () => {
    const kc = new HermeticKeycloak({ now: () => NOW });
    const verifier = createKeycloakTokenVerifier(
      kc.verifierConfig({ brokeredUpstreamIssuers: [UPSTREAM_ISSUER] }),
    );
    const valid = verifier.verify(
      kc.issueToken({
        subject: "sub-a",
        email: "a@example.test",
        emailVerified: true,
        audience: [kc.audience, "account"],
      }),
    );
    expect(valid.keycloakSubject).toBe("sub-a");
    expect(valid.audience).toContain(kc.audience);

    const cases: readonly [string, string, string][] = [
      ["malformed token", "not-a-jwt", "malformed-token"],
      [
        "wrong issuer",
        kc.issueToken({ subject: "sub-a", issuer: "https://wrong.invalid" }),
        "issuer-not-keycloak",
      ],
      [
        "brokered upstream issuer",
        kc.issueToken({ subject: "sub-a", issuer: UPSTREAM_ISSUER }),
        "brokered-upstream-issuer-presented-directly",
      ],
      [
        "wrong audience",
        kc.issueToken({ subject: "sub-a", audience: "other-client" }),
        "audience-mismatch",
      ],
      ["expired", kc.issueToken({ subject: "sub-a", expiresInSec: -300 }), "expired"],
      ["not yet valid", kc.issueToken({ subject: "sub-a", notBeforeSec: 10_000 }), "not-yet-valid"],
      ["unknown key", kc.issueToken({ subject: "sub-a" }, { kid: "missing-key" }), "unknown-key"],
      [
        "unsupported algorithm",
        kc.issueToken({ subject: "sub-a" }, { alg: "HS256" }),
        "unsupported-algorithm",
      ],
    ];
    for (const [name, token, expectedReason] of cases) {
      expect(
        verifierReason(() => verifier.verify(token)),
        name,
      ).toBe(expectedReason);
    }
  });

  it("fails closed for disabled, unknown, and unverified identities", async () => {
    const { auth, kc } = authHarness();
    await expect(
      auth.authenticate(kc.issueToken({ subject: "sub-disabled" })),
    ).resolves.toMatchObject({
      ok: false,
      reasonCode: "identity-disabled",
    });
    await expect(auth.authenticate(kc.issueToken({ subject: "sub-ghost" }))).resolves.toMatchObject(
      {
        ok: false,
        reasonCode: "unknown-identity",
      },
    );

    const strict = createKeycloakAuthService({
      ...authHarness(),
      verifier: createKeycloakTokenVerifier(kc.verifierConfig()),
      identity: (() => {
        const directory = new InMemoryIdentityDirectory();
        directory.upsert({
          actorId: "actor-unverified",
          externalSubject: keycloakExternalSubject(kc.realm, "sub-unverified"),
          identityProvider: "keycloak",
          email: "unverified@example.test",
          emailVerified: false,
          enabled: true,
        });
        return directory;
      })(),
      sessions: createSessionService({
        store: new InMemorySessionStore(),
        now: () => new Date(NOW * 1000),
      }),
      memberships: membershipDirectory(),
      pdp: createPolicyDecisionPoint({ memberships: membershipDirectory() }),
      audit: {
        async record(draft: AuditEventDraft) {
          return new InMemoryAuditEventStore().record(draft);
        },
      },
      requireEmailVerified: true,
    });
    await expect(
      strict.authenticate(kc.issueToken({ subject: "sub-unverified" })),
    ).resolves.toMatchObject({
      ok: false,
      reasonCode: "email-unverified-blocked",
    });
  });

  it("does not retain raw token values in authentication audit evidence", async () => {
    const { auth, kc, recorded } = authHarness();
    const token = kc.issueToken({ subject: "sub-a", email: "a@example.test", emailVerified: true });
    expect((await auth.authenticate(token)).ok).toBe(true);
    await auth.authenticate("not-a-jwt");

    const auditJson = JSON.stringify(recorded);
    expect(auditJson).not.toContain(token);
    expect(auditJson).not.toContain("eyJ");
    expect(auditJson).not.toMatch(/client_secret|access_token|refresh_token|raw_payload/i);
  });
});

describe("USF-249 tenant role and permission matrix", () => {
  it("permits only explicit active membership and denies tenant A/B/C boundary escapes", () => {
    const memberships = membershipDirectory();
    const pdp = createPolicyDecisionPoint({ memberships });

    const ctxA = context(TENANT_A, "actor-a", ["tenant-admin"]);
    const ctxB = context(TENANT_B, "actor-b", ["tenant-member"]);
    const ctxC = context(TENANT_C, "actor-a", ["tenant-admin"]);

    expect(pdp.decide(request(ctxA, "tenant.members.read", TENANT_A)).effect).toBe("permit");
    expect(pdp.decide(request(ctxA, "tenant.members.read", TENANT_B))).toMatchObject({
      effect: "deny",
      reasonCode: "tenant-boundary",
    });
    expect(pdp.decide(request(ctxB, "tenant.members.write", TENANT_B))).toMatchObject({
      effect: "deny",
      reasonCode: "rbac-deny",
    });
    expect(pdp.decide(request(ctxC, "tenant.members.read", TENANT_C))).toMatchObject({
      effect: "deny",
      reasonCode: "inactive-or-missing-membership",
    });
  });

  it("denies token role escalation and cross-tenant role replay through tenant selection", async () => {
    const { auth, kc } = authHarness();
    const login = await auth.authenticate(
      kc.issueToken({
        subject: "sub-member",
        realmRoles: ["security-admin", "tenant-admin"],
        groups: ["admins"],
      }),
    );
    if (!login.ok) {
      throw new Error("login setup failed");
    }

    await expect(
      auth.selectTenant(login.session.sessionId, TENANT_A, "tenant.members.delete"),
    ).resolves.toMatchObject({
      ok: false,
      reasonCode: "rbac-deny",
    });
    await expect(
      auth.selectTenant(login.session.sessionId, TENANT_B, "tenant.members.read"),
    ).resolves.toMatchObject({
      ok: false,
      reasonCode: "no-active-membership",
    });
  });

  it("keeps service accounts explicitly scoped and denies tenant-admin actions", () => {
    const memberships = membershipDirectory();
    const pdp = createPolicyDecisionPoint({ memberships });
    const serviceContext = context(TENANT_A, "actor-service", ["service-worker"]);

    expect(pdp.decide(request(serviceContext, "job.run", TENANT_A)).effect).toBe("permit");
    expect(pdp.decide(request(serviceContext, "tenant.members.delete", TENANT_A))).toMatchObject({
      effect: "deny",
      reasonCode: "rbac-deny",
    });
    expect(pdp.decide(request(serviceContext, "job.run", TENANT_B))).toMatchObject({
      effect: "deny",
      reasonCode: "tenant-boundary",
    });
  });

  it("fails closed for stale memberships, unknown actions, and sensitive reads", () => {
    const memberships = membershipDirectory();
    const pdp = createPolicyDecisionPoint({ memberships });
    const staleStatuses: readonly MembershipStatus[] = [
      "pending",
      "invited",
      "suspended",
      "revoked",
      "expired",
      "deleted",
    ];

    for (const status of staleStatuses) {
      const directory = new InMemoryTenantMembershipDirectory();
      directory.upsert({
        membershipId: `membership-${status}`,
        tenantId: TENANT_A,
        actorId: "actor-stale",
        status,
        roles: ["tenant-admin"],
      });
      const stalePdp = createPolicyDecisionPoint({ memberships: directory });
      expect(
        stalePdp.decide(
          request(context(TENANT_A, "actor-stale", ["tenant-admin"]), "tenant.members.read"),
        ),
        status,
      ).toMatchObject({ effect: "deny", reasonCode: "inactive-or-missing-membership" });
    }

    expect(
      pdp.decide(request(context(TENANT_A, "actor-a", ["tenant-admin"]), "unknown.action")),
    ).toMatchObject({
      effect: "deny",
      reasonCode: "unknown-action",
    });
    expect(
      pdp.decide(
        request(context(TENANT_A, "actor-a", ["tenant-admin"]), "tenant.members.read", TENANT_A, {
          data_classification: "restricted",
        }),
      ),
    ).toMatchObject({ effect: "deny", reasonCode: "rbac-deny" });
  });
});
