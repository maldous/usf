import type { AuditRecord } from "@foundation/core";
import type { AuditLedger } from "@foundation/ports";

export class InMemoryAuditLedger implements AuditLedger {
  readonly #records: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    this.#records.push(record);
  }

  list(tenantId: string): readonly AuditRecord[] {
    return this.#records.filter((record) => record.tenantId === tenantId);
  }

  all(): readonly AuditRecord[] {
    return [...this.#records];
  }
}

export { InMemoryAuditEventStore } from "./event-store.ts";
export { createAuditRecorder, type AuditEventRecorder } from "./recorder.ts";
export {
  AuditAccessDeniedError,
  createAuditQueryService,
  type AuditAccessContext,
  type AuditQueryService,
} from "./query-service.ts";
export { toSafeAuditEventView, type SafeAuditEventView } from "./safe-view.ts";
