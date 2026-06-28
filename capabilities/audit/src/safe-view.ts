import type { AuditEvent } from "@foundation/core";

// Client-safe projection of an audit event. Metadata is already redacted at record
// time; this additionally drops internal chain plumbing (previous_hash, signature,
// chain key, chain scope, recordedBy) and exposes only a safe verification surface:
// the sequence, the event_hash (for export verifiability), and verification_status.
export interface SafeAuditEventView {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: string;
  readonly category: string;
  readonly severity: string;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly actorId: string;
  readonly actorType: string;
  readonly tenantId: string;
  readonly scopeType: string;
  readonly action: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly outcome: string;
  readonly reasonCode: string;
  readonly policyVersion: string | null;
  readonly decisionId: string | null;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly traceId: string | null;
  readonly dataClassification: string;
  readonly retentionPolicy: string;
  readonly legalHold: boolean;
  readonly sequence: number;
  readonly eventHash: string;
  readonly verificationStatus: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export function toSafeAuditEventView(event: AuditEvent): SafeAuditEventView {
  return {
    eventId: event.eventId,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    category: event.category,
    severity: event.severity,
    occurredAt: event.occurredAt,
    recordedAt: event.recordedAt,
    actorId: event.actorId,
    actorType: event.actorType,
    tenantId: event.tenantId,
    scopeType: event.scopeType,
    action: event.action,
    subjectType: event.subjectType,
    subjectId: event.subjectId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    outcome: event.outcome,
    reasonCode: event.reasonCode,
    policyVersion: event.policyVersion,
    decisionId: event.decisionId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    traceId: event.traceId,
    dataClassification: event.dataClassification,
    retentionPolicy: event.retentionPolicy,
    legalHold: event.legalHold,
    sequence: event.sequence,
    eventHash: event.eventHash,
    verificationStatus: event.verificationStatus,
    metadata: event.metadata,
  };
}
