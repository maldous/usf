import {
  canonicalAuditEventHash,
  verifyAuditChain,
  type AuditEvent,
  type AuditEventDraft,
  type AuditIntegrityResult,
  type TenantContext,
} from "@foundation/core";
import type { AuditEventLedger, AuditEventPage, AuditQueryCriteria } from "@foundation/ports";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function chainScopeFor(tenantId: string): string {
  return `tenant:${tenantId}`;
}

// Opaque forward cursor bound to a tenant. Decoding for a different tenant yields
// null (treated as no cursor), so a cursor cannot be used to probe another tenant.
function encodeCursor(tenantId: string, afterSequence: number): string {
  return Buffer.from(JSON.stringify({ t: tenantId, s: afterSequence }), "utf8").toString(
    "base64url",
  );
}

function decodeCursor(cursor: string | undefined, tenantId: string): number | null {
  if (!cursor) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      t?: unknown;
      s?: unknown;
    };
    if (parsed.t !== tenantId || typeof parsed.s !== "number") {
      return null;
    }
    return parsed.s;
  } catch {
    return null;
  }
}

// In-memory, append-only, tamper-evident audit event store. Each tenant is an
// independent hash chain (chainScope = tenant:<id>) with a monotonic sequence; the
// per-event hash binds the content, the sequence, and the previous hash, so any
// content change, reorder, or gap is detectable by verifyAuditChain. There is no
// public mutate/delete: corrections are compensating records (new appends). This
// mirrors the DB substrate (USF-138) at the application layer for dev/test and as
// the unit-provable backstop; the composed-Postgres proof (make audit-proof) proves
// the same invariants on a real substrate.
export class InMemoryAuditEventStore implements AuditEventLedger {
  readonly #events: AuditEvent[] = [];
  readonly #nextSequence = new Map<string, number>();
  readonly #lastHash = new Map<string, string | null>();

  async record(draft: AuditEventDraft): Promise<AuditEvent> {
    const chainScope = chainScopeFor(draft.tenantId);
    const sequence = this.#nextSequence.get(chainScope) ?? 0;
    const previousHash = this.#lastHash.get(chainScope) ?? null;
    const recordedAt = new Date().toISOString();
    const eventHash = canonicalAuditEventHash(draft, recordedAt, sequence, previousHash);
    const event: AuditEvent = Object.freeze({
      ...draft,
      recordedAt,
      ingestedAt: recordedAt,
      chainScope,
      sequence,
      previousHash,
      eventHash,
      signature: null,
      chainKeyId: null,
      verificationStatus: "recorded" as const,
    });
    this.#events.push(event);
    this.#nextSequence.set(chainScope, sequence + 1);
    this.#lastHash.set(chainScope, eventHash);
    return event;
  }

  #tenantChain(tenantId: string): AuditEvent[] {
    return this.#events
      .filter((event) => event.tenantId === tenantId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async query(context: TenantContext, criteria: AuditQueryCriteria): Promise<AuditEventPage> {
    // Tenant scoping: only the context tenant's events are ever returned, and a
    // criteria for any other tenant returns an empty page (non-enumerating: it
    // reveals nothing about whether another tenant has events).
    if (criteria.tenantId !== context.tenantId) {
      return { events: [], nextCursor: null };
    }
    let rows = this.#tenantChain(context.tenantId);
    if (criteria.category) {
      rows = rows.filter((event) => event.category === criteria.category);
    }
    if (criteria.eventType) {
      rows = rows.filter((event) => event.eventType === criteria.eventType);
    }
    if (criteria.action) {
      rows = rows.filter((event) => event.action === criteria.action);
    }
    if (criteria.outcome) {
      rows = rows.filter((event) => event.outcome === criteria.outcome);
    }
    if (criteria.correlationId) {
      rows = rows.filter((event) => event.correlationId === criteria.correlationId);
    }
    const after = decodeCursor(criteria.cursor, context.tenantId);
    if (after !== null) {
      rows = rows.filter((event) => event.sequence > after);
    }
    const limit = Math.min(Math.max(criteria.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor =
      last && rows.length > limit ? encodeCursor(context.tenantId, last.sequence) : null;
    return { events: page, nextCursor };
  }

  async get(context: TenantContext, eventId: string): Promise<AuditEvent | undefined> {
    // Cross-tenant ids resolve to undefined (the caller returns a non-enumerating
    // 404), never an error that confirms the event exists in another tenant.
    return this.#events.find(
      (event) => event.eventId === eventId && event.tenantId === context.tenantId,
    );
  }

  async verify(context: TenantContext): Promise<AuditIntegrityResult> {
    return verifyAuditChain(this.#tenantChain(context.tenantId), chainScopeFor(context.tenantId));
  }
}
