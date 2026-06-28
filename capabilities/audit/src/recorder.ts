import {
  createAuditEventDraft,
  type AuditEvent,
  type CreateAuditEventInput,
} from "@foundation/core";
import type { AuditRecorder } from "@foundation/ports";

/** Convenience over an AuditRecorder: builds a validated, redacted draft, injecting
 *  the recording component (chain-of-custody) when the caller does not set it. */
export interface AuditEventRecorder {
  record(input: CreateAuditEventInput): Promise<AuditEvent>;
}

export function createAuditRecorder(deps: {
  readonly ledger: AuditRecorder;
  readonly component: string;
}): AuditEventRecorder {
  return {
    async record(input) {
      const draft = createAuditEventDraft({
        ...input,
        recordedByComponent: input.recordedByComponent ?? deps.component,
        recordedBy: input.recordedBy ?? "usf-foundation",
      });
      return deps.ledger.record(draft);
    },
  };
}
