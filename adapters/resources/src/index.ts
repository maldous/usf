import {
  opaqueHash,
  type ResourceRecord,
  type ResourceRelationshipRecord,
  type TenantContext,
} from "@foundation/core";
import type { ResourceLifecyclePort } from "@foundation/ports";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function tenantMatches(context: TenantContext, tenantId: string | null): boolean {
  return tenantId === null || tenantId === context.tenantId;
}

function encodeCursor(tenantId: string, offset: number): string {
  return Buffer.from(
    JSON.stringify({ h: opaqueHash(`resource-cursor:${tenantId}`).slice(0, 24), n: offset }),
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
    return parsed.h === opaqueHash(`resource-cursor:${tenantId}`).slice(0, 24) &&
      typeof parsed.n === "number"
      ? parsed.n
      : 0;
  } catch {
    return 0;
  }
}

// Local/dev/test in-memory resource lifecycle store. It is not a production
// record-management system and does not provide distributed consistency.
export class InMemoryResourceLifecycleStore implements ResourceLifecyclePort {
  readonly #resources = new Map<string, ResourceRecord>();
  readonly #idempotency = new Map<string, string>();
  readonly #relationships = new Map<string, ResourceRelationshipRecord>();

  create(record: ResourceRecord): ResourceRecord {
    const existingId = this.#idempotency.get(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
    );
    if (existingId) {
      const existing = this.#resources.get(existingId);
      if (existing) return existing;
    }
    this.#resources.set(record.resourceId, record);
    this.#idempotency.set(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
      record.resourceId,
    );
    return record;
  }

  get(context: TenantContext, resourceId: string): ResourceRecord | undefined {
    const record = this.#resources.get(resourceId);
    if (!record || !tenantMatches(context, record.tenantId)) return undefined;
    return record;
  }

  put(context: TenantContext, record: ResourceRecord): ResourceRecord {
    if (!tenantMatches(context, record.tenantId)) {
      throw new Error("resource tenant mismatch");
    }
    this.#resources.set(record.resourceId, record);
    this.#idempotency.set(
      this.#idempotencyKey(record.tenantId, record.idempotencyKey),
      record.resourceId,
    );
    return record;
  }

  forTenant(
    context: TenantContext,
    input: { limit?: number; cursor?: string; includeDeleted?: boolean } = {},
  ): { readonly resources: readonly ResourceRecord[]; readonly nextCursor: string | null } {
    const rows = [...this.#resources.values()]
      .filter((record) => tenantMatches(context, record.tenantId))
      .filter((record) =>
        input.includeDeleted
          ? true
          : !["soft-deleted", "pending-delete", "purge-eligible", "purged"].includes(record.status),
      )
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.resourceId.localeCompare(b.resourceId),
      );
    const offset = decodeCursor(input.cursor, context.tenantId);
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const resources = Object.freeze(rows.slice(offset, offset + limit));
    const nextCursor =
      offset + limit < rows.length ? encodeCursor(context.tenantId, offset + limit) : null;
    return Object.freeze({ resources, nextCursor });
  }

  findByIdempotencyKey(context: TenantContext, idempotencyKey: string): ResourceRecord | undefined {
    const resourceId = this.#idempotency.get(
      this.#idempotencyKey(context.tenantId, idempotencyKey),
    );
    if (!resourceId) return undefined;
    return this.get(context, resourceId);
  }

  createRelationship(relationship: ResourceRelationshipRecord): ResourceRelationshipRecord {
    this.#relationships.set(relationship.relationshipId, relationship);
    return relationship;
  }

  relationship(
    context: TenantContext,
    relationshipId: string,
  ): ResourceRelationshipRecord | undefined {
    const record = this.#relationships.get(relationshipId);
    if (!record || !tenantMatches(context, record.tenantId)) return undefined;
    return record;
  }

  relationshipsForResource(
    context: TenantContext,
    resourceId: string,
  ): readonly ResourceRelationshipRecord[] {
    return Object.freeze(
      [...this.#relationships.values()]
        .filter((record) => tenantMatches(context, record.tenantId))
        .filter(
          (record) =>
            record.sourceResourceId === resourceId || record.targetResourceId === resourceId,
        )
        .sort((a, b) => a.relationshipId.localeCompare(b.relationshipId)),
    );
  }

  deleteRelationship(context: TenantContext, relationshipId: string): boolean {
    const record = this.relationship(context, relationshipId);
    if (!record) return false;
    return this.#relationships.delete(relationshipId);
  }

  safeStatusView(): ReturnType<ResourceLifecyclePort["safeStatusView"]> {
    return Object.freeze({
      providerMode: "in-memory",
      resourceCount: this.#resources.size,
      relationshipCount: this.#relationships.size,
      productionReadinessClaim: false,
      legalRecordManagementReadinessClaim: false,
      regulatoryRecordReadinessClaim: false,
    });
  }

  #idempotencyKey(tenantId: string | null, idempotencyKey: string): string {
    return `${tenantId ?? "global"}::${opaqueHash(idempotencyKey)}`;
  }
}
