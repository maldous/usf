import { createKeycloakTokenVerifier, HermeticKeycloak } from "@foundation/adapter-idp";
import { InMemoryAuditEventStore } from "@foundation/capability-audit";
import {
  actorFromVerifiedToken,
  createKeycloakAuthService,
  createSessionService,
  InMemorySessionStore,
  resolveActorFromToken,
} from "@foundation/capability-auth";
import {
  createPolicyDecisionPoint,
  InMemoryIdentityDirectory,
  InMemoryTenantMembershipDirectory,
} from "@foundation/capability-tenant";
import { type AuditEvent, type AuditEventDraft, keycloakExternalSubject } from "@foundation/core";
import type { AuditRecorder } from "@foundation/ports";
import { describe, expect, it } from "vitest";

const NOW = 1_700_000_000;
const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

function makeKc() {
  return new HermeticKeycloak({ now: () => NOW });
}

function seededDirectory(kc: HermeticKeycloak) {
  const dir = new InMemoryIdentityDirectory();
  dir.upsert({
    actorId: "actor-alice",
    externalSubject: keycloakExternalSubject(kc.realm, "sub-alice"),
    identityProvider: "keycloak",
    email: "alice@a.example",
    emailVerified: true,
    enabled: true,
  });
  dir.upsert({
    actorId: "actor-bob",
    externalSubject: keycloakExternalSubject(kc.realm, "sub-bob"),
    identityProvider: "keycloak",
    email: "alice@a.example",
    emailVerified: true,
    enabled: true,
  });
  dir.upsert({
    actorId: "actor-disabled",
    externalSubject: keycloakExternalSubject(kc.realm, "sub-dis"),
    identityProvider: "keycloak",
    email: "dis@a.example",
    emailVerified: true,
    enabled: false,
  });
  return dir;
}

describe("identity mapping", () => {
  it("resolves a stable actor and seeds from a verified token (realm+subject key)", () => {
    const kc = makeKc();
    const verifier = createKeycloakTokenVerifier(kc.verifierConfig());
    const token = verifier.verify(
      kc.issueToken({ subject: "sub-alice", email: "alice@a.example", emailVerified: true }),
    );
    const dir = seededDirectory(kc);
    const res = resolveActorFromToken(token, dir);
    expect(res.ok && res.actor.actorId).toBe("actor-alice");
    // actorFromVerifiedToken keys by realm+subject, not email.
    expect(actorFromVerifiedToken(token, "x").externalSubject).toBe(
      keycloakExternalSubject(kc.realm, "sub-alice"),
    );
  });

  it("does not merge two actors that share an email", () => {
    const kc = makeKc();
    const verifier = createKeycloakTokenVerifier(kc.verifierConfig());
    const dir = seededDirectory(kc);
    const alice = resolveActorFromToken(
      verifier.verify(kc.issueToken({ subject: "sub-alice" })),
      dir,
    );
    const bob = resolveActorFromToken(verifier.verify(kc.issueToken({ subject: "sub-bob" })), dir);
    expect(alice.ok && bob.ok && alice.actor.actorId !== bob.actor.actorId).toBe(true);
  });

  it("treats an email change as an attribute update, not a new actor", () => {
    const kc = makeKc();
    const verifier = createKeycloakTokenVerifier(kc.verifierConfig());
    const dir = seededDirectory(kc);
    const res = resolveActorFromToken(
      verifier.verify(kc.issueToken({ subject: "sub-alice", email: "alice.new@a.example" })),
      dir,
    );
    expect(res.ok && res.actor.actorId).toBe("actor-alice");
  });

  it("fails closed for disabled and unknown identities", () => {
    const kc = makeKc();
    const verifier = createKeycloakTokenVerifier(kc.verifierConfig());
    const dir = seededDirectory(kc);
    const disabled = resolveActorFromToken(
      verifier.verify(kc.issueToken({ subject: "sub-dis" })),
      dir,
    );
    const unknown = resolveActorFromToken(
      verifier.verify(kc.issueToken({ subject: "sub-ghost" })),
      dir,
    );
    expect(!disabled.ok && disabled.reasonCode).toBe("identity-disabled");
    expect(!unknown.ok && unknown.reasonCode).toBe("unknown-identity");
  });
});

describe("session lifecycle", () => {
  it("validates a fresh session and fails closed on expiry, idle, revoke, and logout", () => {
    let clock = NOW;
    const sessions = createSessionService({
      store: new InMemorySessionStore(),
      now: () => new Date(clock * 1000),
      sessionTtlSec: 100,
      idleTtlSec: 50,
    });
    const s = sessions.create({
      actorId: "actor-alice",
      keycloakRealm: "foundation",
      keycloakSubject: "sub-alice",
      assuranceLevel: "loa1-password-or-brokered-basic",
    });
    expect(sessions.validate(s.sessionId).ok).toBe(true);

    clock = NOW + 200;
    expect(sessions.validate(s.sessionId)).toMatchObject({
      ok: false,
      reasonCode: "session-expired",
    });

    clock = NOW;
    const idleSession = sessions.create({
      actorId: "a",
      keycloakRealm: "foundation",
      keycloakSubject: "sub-alice",
      assuranceLevel: "loa0-unknown",
    });
    clock = NOW + 60;
    expect(sessions.validate(idleSession.sessionId)).toMatchObject({
      ok: false,
      reasonCode: "session-idle-expired",
    });

    clock = NOW;
    const r = sessions.create({
      actorId: "a",
      keycloakRealm: "foundation",
      keycloakSubject: "sub-alice",
      assuranceLevel: "loa0-unknown",
    });
    sessions.revoke(r.sessionId, "test");
    expect(sessions.validate(r.sessionId)).toMatchObject({
      ok: false,
      reasonCode: "session-revoked",
    });

    const l = sessions.create({
      actorId: "a",
      keycloakRealm: "foundation",
      keycloakSubject: "sub-alice",
      assuranceLevel: "loa0-unknown",
    });
    sessions.logout(l.sessionId);
    expect(sessions.validate(l.sessionId)).toMatchObject({
      ok: false,
      reasonCode: "session-logged-out",
    });
  });

  it("rejects non-positive TTLs (no unbounded session)", () => {
    expect(() =>
      createSessionService({ store: new InMemorySessionStore(), sessionTtlSec: 0 }),
    ).toThrow();
  });
});

describe("keycloak auth orchestration", () => {
  function build() {
    const kc = makeKc();
    const verifier = createKeycloakTokenVerifier(kc.verifierConfig());
    const identity = seededDirectory(kc);
    identity.upsert({
      actorId: "actor-multi",
      externalSubject: keycloakExternalSubject(kc.realm, "sub-multi"),
      identityProvider: "keycloak",
      email: "multi@a.example",
      emailVerified: true,
      enabled: true,
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
    const pdp = createPolicyDecisionPoint({ memberships });
    const recorded: AuditEvent[] = [];
    const store = new InMemoryAuditEventStore();
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
    return { kc, auth, recorded };
  }

  it("authenticates a valid token, requires active membership for tenant selection, and audits value-free", async () => {
    const { kc, auth, recorded } = build();
    const token = kc.issueToken({
      subject: "sub-alice",
      email: "alice@a.example",
      emailVerified: true,
      realmRoles: ["tenant-admin"],
      groups: ["admins"],
      brokerAlias: "alias",
    });
    const login = await auth.authenticate(token);
    expect(login.ok && login.actor.actorId).toBe("actor-alice");
    if (!login.ok) throw new Error("login failed");

    const okSel = await auth.selectTenant(login.session.sessionId, TENANT_A);
    expect(okSel.ok).toBe(true);

    // No membership in B — a Keycloak role/group/broker alias does not grant access.
    const denied = await auth.selectTenant(login.session.sessionId, TENANT_B);
    expect(denied).toMatchObject({ ok: false, reasonCode: "no-active-membership" });
    expect("context" in denied).toBe(false);

    // No raw token leaked into audit evidence.
    expect(JSON.stringify(recorded).includes(token)).toBe(false);
    expect(JSON.stringify(recorded).includes("eyJ")).toBe(false);
  });

  it("rejects a non-Keycloak token at authentication and audits the denial", async () => {
    const { kc, auth, recorded } = build();
    const bad = kc.issueToken({ subject: "sub-alice", issuer: "https://nope.invalid/realms/x" });
    const res = await auth.authenticate(bad);
    expect(res).toMatchObject({ ok: false, reasonCode: "issuer-not-keycloak" });
    expect(recorded.some((e) => e.eventType === "authentication.keycloak.denied")).toBe(true);
  });

  it("supports cross-tenant SSO only with explicit active memberships", async () => {
    const { kc, auth } = build();
    const login = await auth.authenticate(
      kc.issueToken({ subject: "sub-multi", email: "multi@a.example", emailVerified: true }),
    );
    if (!login.ok) throw new Error("multi login failed");
    expect((await auth.selectTenant(login.session.sessionId, TENANT_A)).ok).toBe(true);
    expect((await auth.selectTenant(login.session.sessionId, TENANT_B)).ok).toBe(true);
  });
});
