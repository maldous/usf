import {
  AuditAccessDeniedError,
  InMemoryAuditEventStore,
  InMemoryAuditLedger,
  createAuditQueryService,
  createAuditRecorder,
  toSafeAuditEventView,
} from "@foundation/capability-audit";
import {
  InMemoryTenantMembershipDirectory,
  createAuthorizer,
  createPolicyDecisionPoint,
} from "@foundation/capability-tenant";
import {
  createAuditEventDraft,
  createTenantContext,
  redactAuditMetadata,
  verifyAuditChain,
  type AuthorizationRequest,
  type MembershipStatus,
  type TenantContext,
} from "@foundation/core";
import { describe, expect, it } from "vitest";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const ACTOR = "actor-1";

function ctx(tenantId = TENANT_A, actorId = ACTOR, roles: readonly string[] = ["tenant-admin"]) {
  return createTenantContext({ tenantId, actorId, roles });
}

function membershipDir(
  roles: readonly string[],
  status: MembershipStatus = "active",
  tenantId = TENANT_A,
  actorId = ACTOR,
) {
  const dir = new InMemoryTenantMembershipDirectory();
  dir.upsert({ membershipId: "m1", tenantId, actorId, status, roles });
  return dir;
}

function auditStack(roles: readonly string[] = ["tenant-admin"]) {
  const store = new InMemoryAuditEventStore();
  const recorder = createAuditRecorder({ ledger: store, component: "test" });
  const pdp = createPolicyDecisionPoint({ memberships: membershipDir(roles) });
  const query = createAuditQueryService({ ledger: store, pdp, recorder });
  return { store, recorder, pdp, query };
}

function authzRequest(
  context: TenantContext,
  action: string,
  resourceTenant = context.tenantId,
): AuthorizationRequest {
  return {
    context,
    action,
    resource: { type: "tenant-member", id: "m-x", tenantId: resourceTenant, attributes: {} },
  };
}

describe("audit event model", () => {
  it("requires canonical category/event_type/outcome/severity and actor/tenant/version", () => {
    const draft = createAuditEventDraft({
      eventId: "e1",
      eventType: "authorization.decision",
      tenantId: TENANT_A,
      actorId: ACTOR,
      action: "tenant.members.read",
      outcome: "success",
    });
    expect(draft.category).toBe("authorization");
    expect(draft.severity).toBe("notice");
    expect(draft.eventVersion).toBe("1");
    expect(draft.schemaVersion).toBe("audit-event-1");
    // chain-of-custody + scope defaults present
    expect(draft.recordedBy).toBe("usf-foundation");
    expect(draft.scopeType).toBe("tenant");
  });

  it("fails closed on a non-canonical outcome, severity, or unknown-typeless category", () => {
    expect(() =>
      createAuditEventDraft({
        eventId: "e",
        eventType: "authorization.decision",
        tenantId: TENANT_A,
        actorId: ACTOR,
        action: "a",
        outcome: "bogus" as never,
      }),
    ).toThrow(/outcome is not canonical/);
    expect(() =>
      createAuditEventDraft({
        eventId: "e",
        eventType: "unknown.event.type",
        tenantId: TENANT_A,
        actorId: ACTOR,
        action: "a",
        outcome: "success",
      }),
    ).toThrow(/no category/);
  });

  it("accepts an unknown event type when an explicit canonical category is supplied", () => {
    const draft = createAuditEventDraft({
      eventId: "e",
      eventType: "vendor.custom.thing",
      category: "integration",
      tenantId: TENANT_A,
      actorId: ACTOR,
      action: "a",
      outcome: "success",
    });
    expect(draft.category).toBe("integration");
  });

  it("reads a known older event version (forward/back compatibility)", () => {
    const store = new InMemoryAuditEventStore();
    return (async () => {
      const ev = await store.record(
        createAuditEventDraft({
          eventId: "old",
          eventType: "authentication.login",
          eventVersion: "0",
          tenantId: TENANT_A,
          actorId: ACTOR,
          action: "authentication.login",
          outcome: "success",
        }),
      );
      expect(ev.eventVersion).toBe("0");
      const result = await store.verify(ctx());
      expect(result.ok).toBe(true);
    })();
  });
});

describe("audit metadata redaction", () => {
  it("redacts obvious secret-looking keys and never stores their values", () => {
    const redacted = redactAuditMetadata({
      password: "hunter2",
      api_key: "sk-live-123",
      session_token: "abc",
      Authorization: "Bearer x",
      private_key: "-----BEGIN",
      note: "safe value",
    });
    expect(redacted.password).toBe("[redacted]");
    expect(redacted.api_key).toBe("[redacted]");
    expect(redacted.session_token).toBe("[redacted]");
    expect(redacted.Authorization).toBe("[redacted]");
    expect(redacted.private_key).toBe("[redacted]");
    expect(redacted.note).toBe("safe value");
    expect(JSON.stringify(redacted)).not.toContain("hunter2");
    expect(JSON.stringify(redacted)).not.toContain("sk-live-123");
  });

  it("redacts at event-creation time too", () => {
    const draft = createAuditEventDraft({
      eventId: "e",
      eventType: "system.error",
      tenantId: TENANT_A,
      actorId: ACTOR,
      action: "x",
      outcome: "error",
      metadata: { token: "leak", detail: "ok" },
    });
    expect(draft.metadata.token).toBe("[redacted]");
    expect(draft.metadata.detail).toBe("ok");
  });
});

describe("append-only ledger + hash chain", () => {
  it("records append-only, tenant-isolated, hash-chained events", async () => {
    const store = new InMemoryAuditEventStore();
    const a1 = await store.record(
      createAuditEventDraft({
        eventId: "a1",
        eventType: "tenant.context.accepted",
        tenantId: TENANT_A,
        actorId: ACTOR,
        action: "tenant.context.read",
        outcome: "success",
      }),
    );
    const a2 = await store.record(
      createAuditEventDraft({
        eventId: "a2",
        eventType: "authentication.login",
        tenantId: TENANT_A,
        actorId: ACTOR,
        action: "authentication.login",
        outcome: "success",
      }),
    );
    await store.record(
      createAuditEventDraft({
        eventId: "b1",
        eventType: "authentication.login",
        tenantId: TENANT_B,
        actorId: "actor-b",
        action: "authentication.login",
        outcome: "success",
      }),
    );

    expect(a1.sequence).toBe(0);
    expect(a1.previousHash).toBeNull();
    expect(a2.sequence).toBe(1);
    expect(a2.previousHash).toBe(a1.eventHash);
    expect(Object.isFrozen(a1)).toBe(true);
    // append-only at the surface: no public mutate/delete on the store.
    expect((store as unknown as Record<string, unknown>).update).toBeUndefined();
    expect((store as unknown as Record<string, unknown>).delete).toBeUndefined();

    const result = await store.verify(ctx());
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2); // tenant A chain only
  });

  it("verifyAuditChain detects tampered event content", async () => {
    const store = new InMemoryAuditEventStore();
    await store.record(
      createAuditEventDraft({
        eventId: "a1",
        eventType: "authentication.login",
        tenantId: TENANT_A,
        actorId: ACTOR,
        action: "authentication.login",
        outcome: "success",
      }),
    );
    await store.record(
      createAuditEventDraft({
        eventId: "a2",
        eventType: "authorization.decision",
        tenantId: TENANT_A,
        actorId: ACTOR,
        action: "tenant.members.delete",
        outcome: "denied",
      }),
    );
    const page = await store.query(ctx(), { tenantId: TENANT_A, limit: 100 });
    const tampered = page.events.map((event, index) =>
      index === 1 ? { ...event, action: "tenant.members.read" } : event,
    );
    const clean = verifyAuditChain(page.events, "tenant:tenant-a");
    const broken = verifyAuditChain(tampered, "tenant:tenant-a");
    expect(clean.ok).toBe(true);
    expect(broken.ok).toBe(false);
    expect(broken.brokenAtSequence).toBe(1);
    expect(broken.reason).toMatch(/tamper/);
  });

  it("verifyAuditChain detects a reordered/missing sequence", async () => {
    const store = new InMemoryAuditEventStore();
    for (const id of ["a1", "a2", "a3"]) {
      await store.record(
        createAuditEventDraft({
          eventId: id,
          eventType: "authentication.login",
          tenantId: TENANT_A,
          actorId: ACTOR,
          action: "authentication.login",
          outcome: "success",
        }),
      );
    }
    const page = await store.query(ctx(), { tenantId: TENANT_A, limit: 100 });
    const dropped = [page.events[0]!, page.events[2]!]; // skip sequence 1
    const broken = verifyAuditChain(dropped, "tenant:tenant-a");
    expect(broken.ok).toBe(false);
    expect(broken.reason).toMatch(/sequence|previous_hash/);
  });
});

describe("authorizer emits rich audit evidence (PR 93 integration)", () => {
  it("records an authorization.decision event for a permit", async () => {
    const { store, recorder, pdp } = auditStack(["tenant-admin"]);
    const auditLedger = new InMemoryAuditLedger();
    const authorizer = createAuthorizer({ pdp, auditLedger, audit: recorder });
    await authorizer.authorize(authzRequest(ctx(), "tenant.members.read"));
    const page = await store.query(ctx(), { tenantId: TENANT_A, limit: 100 });
    const decision = page.events.find((e) => e.eventType === "authorization.decision");
    expect(decision).toBeDefined();
    expect(decision!.outcome).toBe("success");
    expect(decision!.actorId).toBe(ACTOR);
    expect(decision!.tenantId).toBe(TENANT_A);
    expect(decision!.action).toBe("tenant.members.read");
    expect(decision!.correlationId).toBeTruthy();
    expect(decision!.decisionId).toBeTruthy();
  });

  it("records a denied privileged action as denied evidence", async () => {
    const { store, recorder, pdp } = auditStack(["tenant-member"]);
    const auditLedger = new InMemoryAuditLedger();
    const authorizer = createAuthorizer({ pdp, auditLedger, audit: recorder });
    await authorizer.authorize(
      authzRequest(ctx(TENANT_A, ACTOR, ["tenant-member"]), "tenant.members.delete"),
    );
    const page = await store.query(ctx(), { tenantId: TENANT_A, limit: 100 });
    const denied = page.events.find((e) => e.outcome === "denied");
    expect(denied).toBeDefined();
    expect(denied!.reasonCode).toBe("rbac-deny");
  });
});

describe("tenant-safe retrieval (PDP-protected, non-enumerating)", () => {
  it("denies retrieval for an actor without audit permission, and records the denial", async () => {
    const { store, query } = auditStack(["tenant-member"]);
    await expect(
      query.list(ctx(TENANT_A, ACTOR, ["tenant-member"]), { tenantId: TENANT_A }),
    ).rejects.toBeInstanceOf(AuditAccessDeniedError);
    // the denied access is itself audited
    const page = await store.query(ctx(), { tenantId: TENANT_A, limit: 100 });
    expect(page.events.some((e) => e.eventType === "audit.query.denied")).toBe(true);
  });

  it("permits an auditor and records audit-of-audit query events", async () => {
    const { query, store } = auditStack(["auditor"]);
    const result = await query.list(ctx(TENANT_A, ACTOR, ["auditor"]), { tenantId: TENANT_A });
    expect(Array.isArray(result.events)).toBe(true);
    const all = await store.query(ctx(), { tenantId: TENANT_A, limit: 100 });
    expect(all.events.some((e) => e.eventType === "audit.query.started")).toBe(true);
    expect(all.events.some((e) => e.eventType === "audit.query.completed")).toBe(true);
  });

  it("does not let tenant A read tenant B audit events", async () => {
    const store = new InMemoryAuditEventStore();
    await store.record(
      createAuditEventDraft({
        eventId: "b-secret",
        eventType: "authentication.login",
        tenantId: TENANT_B,
        actorId: "actor-b",
        action: "authentication.login",
        outcome: "success",
      }),
    );
    // tenant A context querying for tenant B yields nothing (non-enumerating)
    const crossList = await store.query(ctx(TENANT_A), { tenantId: TENANT_B, limit: 100 });
    expect(crossList.events).toHaveLength(0);
    const crossGet = await store.get(ctx(TENANT_A), "b-secret");
    expect(crossGet).toBeUndefined();
  });

  it("verify is PDP-protected and audit-recorded", async () => {
    const { query, store } = auditStack(["auditor"]);
    const result = await query.verify(ctx(TENANT_A, ACTOR, ["auditor"]));
    expect(result.ok).toBe(true);
    const all = await store.query(ctx(), { tenantId: TENANT_A, limit: 100 });
    expect(all.events.some((e) => e.eventType === "audit.integrity.verified")).toBe(true);
  });
});

describe("corrections are compensating records, not mutations", () => {
  it("appends a compensating event referencing the original, leaving the original intact", async () => {
    const { store, recorder, query } = auditStack(["security-admin"]);
    const original = await recorder.record({
      eventId: "orig",
      eventType: "configuration.changed",
      category: "configuration",
      tenantId: TENANT_A,
      actorId: ACTOR,
      action: "configuration.change",
      outcome: "success",
    });
    const compensating = await query.correct(ctx(TENANT_A, ACTOR, ["security-admin"]), "orig", {
      reasonCode: "wrong-value",
    });
    expect(compensating.correctsEventId).toBe("orig");
    expect(compensating.outcome).toBe("compensated");
    // the original is unchanged and still present (no mutation)
    const stillThere = await store.get(ctx(), "orig");
    expect(stillThere?.eventHash).toBe(original.eventHash);
    expect(stillThere?.outcome).toBe("success");
  });
});

describe("safe view never leaks internal chain plumbing or secrets", () => {
  it("omits previous_hash/signature/recordedBy and keeps metadata redacted", async () => {
    const store = new InMemoryAuditEventStore();
    const ev = await store.record(
      createAuditEventDraft({
        eventId: "v1",
        eventType: "system.error",
        tenantId: TENANT_A,
        actorId: ACTOR,
        action: "x",
        outcome: "error",
        metadata: { secret: "leak", ok: "fine" },
      }),
    );
    const view = toSafeAuditEventView(ev) as unknown as Record<string, unknown>;
    expect(view.previousHash).toBeUndefined();
    expect(view.signature).toBeUndefined();
    expect(view.recordedBy).toBeUndefined();
    expect(view.eventHash).toBeTruthy(); // verification surface is exposed
    expect(view.verificationStatus).toBe("recorded");
    expect((view.metadata as Record<string, string>).secret).toBe("[redacted]");
  });
});
