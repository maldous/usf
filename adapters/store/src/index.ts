import {
  metadataHash,
  type FileMetadata,
  type FileScanStatusValue,
  type TenantContext,
} from "@foundation/core";
import type {
  FileMetadataPatch,
  FileMetadataStore,
  FilePage,
  FileQueryCriteria,
  ObjectStore,
  ScanProvider,
} from "@foundation/ports";

export class InMemoryObjectStore implements ObjectStore {
  readonly #objects = new Map<string, string>();

  #key(tenantId: string, key: string): string {
    return `${tenantId}/${key}`;
  }

  async putObject(input: { tenantId: string; key: string; body: string }): Promise<void> {
    this.#objects.set(this.#key(input.tenantId, input.key), input.body);
  }

  async getObject(input: { tenantId: string; key: string }): Promise<string | undefined> {
    return this.#objects.get(this.#key(input.tenantId, input.key));
  }

  async deleteObject(input: { tenantId: string; key: string }): Promise<void> {
    this.#objects.delete(this.#key(input.tenantId, input.key));
  }

  async headObject(input: {
    tenantId: string;
    key: string;
  }): Promise<{ exists: boolean; sizeBytes: number }> {
    const body = this.#objects.get(this.#key(input.tenantId, input.key));
    return body === undefined
      ? { exists: false, sizeBytes: 0 }
      : { exists: true, sizeBytes: body.length };
  }
}

function encodeCursor(tenantId: string, offset: number): string {
  return Buffer.from(JSON.stringify({ t: tenantId, n: offset }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined, tenantId: string): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      t?: unknown;
      n?: unknown;
    };
    return parsed.t === tenantId && typeof parsed.n === "number" ? parsed.n : 0;
  } catch {
    return 0;
  }
}

// In-memory authoritative file metadata store (parity-files-storage, USF-146). Tenant
// scoping is enforced on every read/update; a cross-tenant id resolves to undefined.
// A DB-backed (Postgres) metadata store + RLS is the proven substrate (0003-files.sql,
// make files-proof); binding the runtime to it via a JS pg adapter is deferred (USF-147).
export class InMemoryFileMetadataStore implements FileMetadataStore {
  readonly #files: FileMetadata[] = [];

  async insert(meta: FileMetadata): Promise<void> {
    this.#files.push(meta);
  }

  async get(context: TenantContext, fileId: string): Promise<FileMetadata | undefined> {
    return this.#files.find((f) => f.fileId === fileId && f.tenantId === context.tenantId);
  }

  async list(context: TenantContext, criteria: FileQueryCriteria): Promise<FilePage> {
    if (criteria.tenantId !== context.tenantId) {
      return { files: [], nextCursor: null };
    }
    let rows = this.#files
      .filter((f) => f.tenantId === context.tenantId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.fileId.localeCompare(b.fileId));
    if (criteria.status) {
      rows = rows.filter((f) => f.status === criteria.status);
    }
    const offset = decodeCursor(criteria.cursor, context.tenantId);
    const limit = Math.min(Math.max(criteria.limit ?? 50, 1), 200);
    const page = rows.slice(offset, offset + limit);
    const nextCursor =
      offset + limit < rows.length ? encodeCursor(context.tenantId, offset + limit) : null;
    return { files: page, nextCursor };
  }

  async update(
    context: TenantContext,
    fileId: string,
    patch: FileMetadataPatch,
  ): Promise<FileMetadata | undefined> {
    const index = this.#files.findIndex(
      (f) => f.fileId === fileId && f.tenantId === context.tenantId,
    );
    if (index === -1) {
      return undefined;
    }
    const current = this.#files[index]!;
    const merged = {
      ...current,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.scanStatus !== undefined ? { scanStatus: patch.scanStatus } : {}),
      ...(patch.quarantineReason !== undefined ? { quarantineReason: patch.quarantineReason } : {}),
      ...(patch.contentTypeVerified !== undefined
        ? { contentTypeVerified: patch.contentTypeVerified }
        : {}),
      ...(patch.legalHold !== undefined ? { legalHold: patch.legalHold } : {}),
      ...(patch.deletedAt !== undefined ? { deletedAt: patch.deletedAt } : {}),
    };
    // Recompute the metadata hash over the patched record (overrides the prior hash).
    const updated: FileMetadata = Object.freeze({ ...merged, metadataHash: metadataHash(merged) });
    this.#files[index] = updated;
    return updated;
  }
}

// Malware/DLP scan posture as an in-memory status model (no live antivirus/DLP in this
// slice). A deterministic test marker yields "infected"; per-key overrides drive tests.
// A real scanner provider is deferred (USF-147). Scanner failure is never treated as clean.
export class InMemoryScanProvider implements ScanProvider {
  readonly mode = "in-memory" as const;
  readonly #forced = new Map<string, FileScanStatusValue>();

  setStatus(objectKey: string, status: FileScanStatusValue): void {
    this.#forced.set(objectKey, status);
  }

  async scan(input: {
    tenantId: string;
    objectKey: string;
    body?: string;
  }): Promise<{ status: FileScanStatusValue; scannerRef: string }> {
    const scannerRef = "in-memory-scan-v0";
    const forced = this.#forced.get(input.objectKey);
    if (forced) {
      return { status: forced, scannerRef };
    }
    if (input.body && input.body.includes("EICAR-TEST-MARKER")) {
      return { status: "infected", scannerRef };
    }
    return { status: "clean", scannerRef };
  }
}
