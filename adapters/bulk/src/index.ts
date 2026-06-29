import {
  opaqueHash,
  type BulkItemOutcome,
  type BulkOperationRecord,
  type TenantContext,
} from "@foundation/core";
import type { ImportExportPort } from "@foundation/ports";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function encodeCursor(tenantId: string, offset: number): string {
  return Buffer.from(
    JSON.stringify({ h: opaqueHash(`bulk-cursor:${tenantId}`).slice(0, 24), n: offset }),
    "utf8",
  ).toString("base64url");
}

function decodeCursor(cursor: string | undefined, tenantId: string): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      h?: unknown;
      n?: unknown;
    };
    return parsed.h === opaqueHash(`bulk-cursor:${tenantId}`).slice(0, 24) &&
      typeof parsed.n === "number"
      ? parsed.n
      : 0;
  } catch {
    return 0;
  }
}

// In-memory import/export operation store. Dev/test adapter only; a DB-backed
// operational store is deferred. Tenant scoping is enforced on every read/update,
// and idempotency is tenant-local so one tenant cannot replay another tenant's key.
export class InMemoryImportExportStore implements ImportExportPort {
  readonly #operations = new Map<string, BulkOperationRecord>();
  readonly #idempotency = new Map<string, string>();
  readonly #outcomes = new Map<string, BulkItemOutcome[]>();

  create(record: BulkOperationRecord): BulkOperationRecord {
    const existingId = this.#idempotency.get(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
    );
    if (existingId) {
      const existing = this.#operations.get(existingId);
      if (existing) return existing;
    }
    this.#operations.set(record.operationId, record);
    this.#idempotency.set(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
      record.operationId,
    );
    return record;
  }

  get(context: TenantContext, operationId: string): BulkOperationRecord | undefined {
    const record = this.#operations.get(operationId);
    if (!record || record.tenantId !== context.tenantId) return undefined;
    return record;
  }

  put(context: TenantContext, record: BulkOperationRecord): BulkOperationRecord {
    if (record.tenantId !== context.tenantId) {
      throw new Error("bulk tenant mismatch");
    }
    this.#operations.set(record.operationId, record);
    this.#idempotency.set(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
      record.operationId,
    );
    return record;
  }

  forTenant(
    context: TenantContext,
    input: { limit?: number; cursor?: string } = {},
  ): { readonly operations: readonly BulkOperationRecord[]; readonly nextCursor: string | null } {
    const rows = [...this.#operations.values()]
      .filter((record) => record.tenantId === context.tenantId)
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.operationId.localeCompare(b.operationId),
      );
    const offset = decodeCursor(input.cursor, context.tenantId);
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const operations = Object.freeze(rows.slice(offset, offset + limit));
    const nextCursor =
      offset + limit < rows.length ? encodeCursor(context.tenantId, offset + limit) : null;
    return Object.freeze({ operations, nextCursor });
  }

  findByIdempotencyKey(
    context: TenantContext,
    idempotencyKey: string,
  ): BulkOperationRecord | undefined {
    const operationId = this.#idempotency.get(
      this.#idempotencyKey(context.tenantId, idempotencyKey),
    );
    if (!operationId) return undefined;
    return this.get(context, operationId);
  }

  appendItemOutcome(context: TenantContext, operationId: string, outcome: BulkItemOutcome): void {
    const record = this.get(context, operationId);
    if (!record) return;
    const key = this.#outcomeKey(context.tenantId, operationId);
    const rows = this.#outcomes.get(key) ?? [];
    rows.push(outcome);
    this.#outcomes.set(key, rows);
  }

  itemOutcomes(context: TenantContext, operationId: string): readonly BulkItemOutcome[] {
    const record = this.get(context, operationId);
    if (!record) return Object.freeze([]);
    return Object.freeze([
      ...(this.#outcomes.get(this.#outcomeKey(context.tenantId, operationId)) ?? []),
    ]);
  }

  #idempotencyKey(tenantId: string, idempotencyKey: string): string {
    return `${tenantId}::${opaqueHash(idempotencyKey)}`;
  }

  #outcomeKey(tenantId: string, operationId: string): string {
    return `${tenantId}::${operationId}`;
  }
}
