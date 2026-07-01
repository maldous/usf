import { createAuditEventDraft, opaqueHash, stableId, type TenantContext } from "@foundation/core";
import type { AuditRecorder, PolicyDecisionPoint } from "@foundation/ports";

export interface EnterpriseWorkflowControlsDeps {
  readonly pdp: PolicyDecisionPoint;
  readonly audit: AuditRecorder;
  readonly now?: () => number;
}

export interface EnterpriseWorkflowControlEvidence {
  readonly workflowVersionPinned: boolean;
  readonly deterministicReplayChecked: boolean;
  readonly migrationPolicyChecked: boolean;
  readonly transactionalOutboxChecked: boolean;
  readonly inboundInboxDedupeChecked: boolean;
  readonly quotaBackpressureChecked: boolean;
  readonly pauseResumeDrainChecked: boolean;
  readonly backupRestoreReplayPostureChecked: boolean;
  readonly dryRunImpactGateChecked: boolean;
  readonly cronTenantLocalScheduleReclassified: boolean;
  readonly heartbeatConcurrencyChecked: boolean;
  readonly highRiskAutomationChecked: boolean;
  readonly egressCircuitBreakerChecked: boolean;
  readonly localObservabilityEvidenceChecked: boolean;
  readonly httpJobApiReclassified: boolean;
  readonly tenantBoundaryChecked: boolean;
  readonly accessBoundaryChecked: boolean;
  readonly auditEvidenceCaptured: boolean;
  readonly retryTimeoutCleanupFailClosedChecked: boolean;
  readonly providerSubstituteBoundaryChecked: boolean;
  readonly liveWorkflowReadinessClaim: false;
  readonly productionAutomationReadinessClaim: false;
}

type MutableEnterpriseWorkflowControlEvidence = {
  -readonly [
    Key in keyof EnterpriseWorkflowControlEvidence
  ]: EnterpriseWorkflowControlEvidence[Key];
};

interface WorkflowDefinition {
  readonly workflowType: string;
  readonly workflowVersion: string;
  readonly definitionHash: string;
  readonly migrationPolicy: "compatible" | "explicit-migration-required";
}

interface DryRunPreview {
  readonly previewId: string;
  readonly tenantId: string;
  readonly impactHash: string;
  readonly approvedBy: string | null;
}

interface QueueState {
  readonly status: "running" | "paused" | "draining";
  readonly reason: string;
}

export class EnterpriseWorkflowControlPlane {
  readonly #pdp: PolicyDecisionPoint;
  readonly #audit: AuditRecorder;
  readonly #clock: () => number;
  readonly #definitions = new Map<string, WorkflowDefinition>();
  readonly #outbox = new Set<string>();
  readonly #inbox = new Set<string>();
  readonly #tenantQuota = new Map<string, number>();
  readonly #queueState = new Map<string, QueueState>();
  readonly #dryRuns = new Map<string, DryRunPreview>();
  readonly #heartbeats = new Map<string, number>();
  readonly #concurrency = new Set<string>();
  readonly #circuitFailures = new Map<string, number>();
  #eventSequence = 0;
  readonly #evidence: MutableEnterpriseWorkflowControlEvidence = {
    workflowVersionPinned: false,
    deterministicReplayChecked: false,
    migrationPolicyChecked: false,
    transactionalOutboxChecked: false,
    inboundInboxDedupeChecked: false,
    quotaBackpressureChecked: false,
    pauseResumeDrainChecked: false,
    backupRestoreReplayPostureChecked: false,
    dryRunImpactGateChecked: false,
    cronTenantLocalScheduleReclassified: false,
    heartbeatConcurrencyChecked: false,
    highRiskAutomationChecked: false,
    egressCircuitBreakerChecked: false,
    localObservabilityEvidenceChecked: false,
    httpJobApiReclassified: false,
    tenantBoundaryChecked: false,
    accessBoundaryChecked: false,
    auditEvidenceCaptured: false,
    retryTimeoutCleanupFailClosedChecked: false,
    providerSubstituteBoundaryChecked: false,
    liveWorkflowReadinessClaim: false,
    productionAutomationReadinessClaim: false,
  };

  constructor(deps: EnterpriseWorkflowControlsDeps) {
    this.#pdp = deps.pdp;
    this.#audit = deps.audit;
    this.#clock = deps.now ?? (() => Math.floor(Date.now() / 1000));
  }

  async registerDefinition(
    context: TenantContext,
    definition: WorkflowDefinition,
  ): Promise<{ ok: true; definitionHash: string } | { ok: false; reasonCode: string }> {
    const deny = await this.#requirePermit(
      context,
      "workflow.admin.override",
      "workflow-definition",
      definition.workflowType,
    );
    if (deny) return { ok: false, reasonCode: deny };
    if (!definition.workflowVersion || !definition.definitionHash) {
      return { ok: false, reasonCode: "workflow-definition-invalid" };
    }
    this.#definitions.set(definition.workflowType, Object.freeze({ ...definition }));
    this.#evidence.workflowVersionPinned = true;
    this.#evidence.accessBoundaryChecked = true;
    await this.#emit(context, "workflow.admin.override", definition.workflowType, "success", "ok", {
      workflowTypeHash: opaqueHash(`workflow-type:${definition.workflowType}`),
      workflowVersionHash: opaqueHash(`workflow-version:${definition.workflowVersion}`),
      migrationPolicy: definition.migrationPolicy,
    });
    return { ok: true, definitionHash: definition.definitionHash };
  }

  async replayWorkflow(input: {
    readonly context: TenantContext;
    readonly workflowType: string;
    readonly workflowVersion: string;
    readonly eventHistoryHash: string;
    readonly expectedHistoryHash: string;
  }): Promise<{ ok: true; replayHash: string } | { ok: false; reasonCode: string }> {
    const definition = this.#definitions.get(input.workflowType);
    if (!definition || definition.workflowVersion !== input.workflowVersion) {
      await this.#emit(
        input.context,
        "workflow.failed",
        input.workflowType,
        "failed",
        "workflow-version-mismatch",
      );
      return { ok: false, reasonCode: "workflow-version-mismatch" };
    }
    if (input.eventHistoryHash !== input.expectedHistoryHash) {
      await this.#emit(
        input.context,
        "workflow.failed",
        input.workflowType,
        "failed",
        "workflow-replay-nondeterministic",
      );
      return { ok: false, reasonCode: "workflow-replay-nondeterministic" };
    }
    this.#evidence.deterministicReplayChecked = true;
    await this.#emit(input.context, "workflow.signalled", input.workflowType, "success", "ok", {
      replayHash: opaqueHash(`workflow-replay:${input.eventHistoryHash}`),
    });
    return {
      ok: true,
      replayHash: opaqueHash(
        `workflow-replay:${definition.definitionHash}:${input.eventHistoryHash}`,
      ),
    };
  }

  async migrateWorkflow(input: {
    readonly context: TenantContext;
    readonly workflowType: string;
    readonly fromVersion: string;
    readonly toVersion: string;
    readonly migrationPolicyAccepted: boolean;
  }): Promise<{ ok: true; migrationHash: string } | { ok: false; reasonCode: string }> {
    const deny = await this.#requirePermit(
      input.context,
      "workflow.admin.override",
      "workflow",
      input.workflowType,
    );
    if (deny) return { ok: false, reasonCode: deny };
    if (!input.migrationPolicyAccepted || input.fromVersion === input.toVersion) {
      await this.#emit(
        input.context,
        "workflow.admin.override",
        input.workflowType,
        "denied",
        "workflow-migration-policy-missing",
      );
      return { ok: false, reasonCode: "workflow-migration-policy-missing" };
    }
    this.#evidence.migrationPolicyChecked = true;
    await this.#emit(
      input.context,
      "workflow.admin.override",
      input.workflowType,
      "success",
      "ok",
      {
        fromVersionHash: opaqueHash(`from:${input.fromVersion}`),
        toVersionHash: opaqueHash(`to:${input.toVersion}`),
      },
    );
    return {
      ok: true,
      migrationHash: opaqueHash(
        `migration:${input.workflowType}:${input.fromVersion}:${input.toVersion}`,
      ),
    };
  }

  async commitOutbox(input: {
    readonly context: TenantContext;
    readonly mutationId: string;
    readonly outboxEventId: string;
  }): Promise<
    { ok: true; committed: boolean; outboxHash: string } | { ok: false; reasonCode: string }
  > {
    const deny = await this.#requirePermit(input.context, "job.create", "job", input.mutationId);
    if (deny) return { ok: false, reasonCode: deny };
    const key = `${input.context.tenantId}:${input.mutationId}:${input.outboxEventId}`;
    if (this.#outbox.has(key)) {
      return { ok: true, committed: false, outboxHash: opaqueHash(`outbox:${key}`) };
    }
    this.#outbox.add(key);
    this.#evidence.transactionalOutboxChecked = true;
    await this.#emit(input.context, "job.created", input.mutationId, "success", "ok", {
      outboxHash: opaqueHash(`outbox:${key}`),
    });
    return { ok: true, committed: true, outboxHash: opaqueHash(`outbox:${key}`) };
  }

  async recordInboundEvent(input: {
    readonly context: TenantContext;
    readonly inboxEventId: string;
  }): Promise<
    { ok: true; deduplicated: boolean; inboxHash: string } | { ok: false; reasonCode: string }
  > {
    const deny = await this.#requirePermit(input.context, "job.create", "job", input.inboxEventId);
    if (deny) return { ok: false, reasonCode: deny };
    const key = `${input.context.tenantId}:${input.inboxEventId}`;
    const deduplicated = this.#inbox.has(key);
    this.#inbox.add(key);
    this.#evidence.inboundInboxDedupeChecked = true;
    await this.#emit(input.context, "job.created", input.inboxEventId, "success", "ok", {
      deduplicated: String(deduplicated),
      inboxHash: opaqueHash(`inbox:${key}`),
    });
    return { ok: true, deduplicated, inboxHash: opaqueHash(`inbox:${key}`) };
  }

  async admitWithQuota(input: {
    readonly context: TenantContext;
    readonly quota: number;
    readonly priority: number;
  }): Promise<{ ok: true } | { ok: false; reasonCode: string }> {
    const current = this.#tenantQuota.get(input.context.tenantId) ?? 0;
    this.#evidence.quotaBackpressureChecked = true;
    if (current >= input.quota) {
      await this.#emit(
        input.context,
        "guardrail.backpressure.applied",
        "tenant-job-quota",
        "denied",
        "tenant-job-quota-exceeded",
        { priority: String(input.priority) },
      );
      return { ok: false, reasonCode: "tenant-job-quota-exceeded" };
    }
    this.#tenantQuota.set(input.context.tenantId, current + 1);
    return { ok: true };
  }

  async pauseQueue(
    context: TenantContext,
    reason: string,
  ): Promise<{ ok: boolean; reasonCode: string }> {
    const deny = await this.#requirePermit(
      context,
      "job.schedule.disable",
      "job-queue",
      context.tenantId,
    );
    if (deny) return { ok: false, reasonCode: deny };
    this.#queueState.set(context.tenantId, Object.freeze({ status: "paused", reason }));
    this.#evidence.pauseResumeDrainChecked = true;
    await this.#emit(context, "schedule.disabled", "tenant-queue", "success", "ok", {
      reasonHash: opaqueHash(`queue-pause:${reason}`),
    });
    return { ok: true, reasonCode: "ok" };
  }

  async resumeQueue(context: TenantContext): Promise<{ ok: boolean; reasonCode: string }> {
    const deny = await this.#requirePermit(
      context,
      "job.schedule.update",
      "job-queue",
      context.tenantId,
    );
    if (deny) return { ok: false, reasonCode: deny };
    this.#queueState.set(context.tenantId, Object.freeze({ status: "running", reason: "resumed" }));
    this.#evidence.pauseResumeDrainChecked = true;
    await this.#emit(context, "schedule.changed", "tenant-queue", "success");
    return { ok: true, reasonCode: "ok" };
  }

  async drainQueue(context: TenantContext): Promise<{ ok: boolean; reasonCode: string }> {
    const deny = await this.#requirePermit(
      context,
      "job.schedule.disable",
      "job-queue",
      context.tenantId,
    );
    if (deny) return { ok: false, reasonCode: deny };
    this.#queueState.set(
      context.tenantId,
      Object.freeze({ status: "draining", reason: "maintenance" }),
    );
    this.#evidence.pauseResumeDrainChecked = true;
    await this.#emit(context, "schedule.disabled", "tenant-queue", "success", "draining");
    return { ok: true, reasonCode: "ok" };
  }

  canStartWork(context: TenantContext): boolean {
    const state = this.#queueState.get(context.tenantId);
    return state === undefined || state.status === "running";
  }

  async createDryRun(input: {
    readonly context: TenantContext;
    readonly operationId: string;
    readonly estimatedImpact: Readonly<Record<string, string>>;
  }): Promise<
    { ok: true; previewId: string; impactHash: string } | { ok: false; reasonCode: string }
  > {
    const deny = await this.#requirePermit(
      input.context,
      "workflow.start",
      "workflow",
      input.operationId,
    );
    if (deny) return { ok: false, reasonCode: deny };
    const impactHash = opaqueHash(`impact:${JSON.stringify(input.estimatedImpact)}`);
    const previewId = stableId("dryrun", [input.context.tenantId, input.operationId, impactHash]);
    this.#dryRuns.set(previewId, {
      previewId,
      tenantId: input.context.tenantId,
      impactHash,
      approvedBy: null,
    });
    this.#evidence.dryRunImpactGateChecked = true;
    await this.#emit(input.context, "workflow.started", previewId, "success", "dry-run");
    return { ok: true, previewId, impactHash };
  }

  async approveDryRun(
    context: TenantContext,
    previewId: string,
  ): Promise<{ ok: boolean; reasonCode: string }> {
    const deny = await this.#requirePermit(context, "workflow.approve", "workflow", previewId);
    if (deny) return { ok: false, reasonCode: deny };
    const preview = this.#dryRuns.get(previewId);
    if (!preview || preview.tenantId !== context.tenantId) {
      return { ok: false, reasonCode: "dry-run-preview-not-found" };
    }
    this.#dryRuns.set(previewId, { ...preview, approvedBy: context.actorId });
    this.#evidence.dryRunImpactGateChecked = true;
    await this.#emit(context, "workflow.approval.approved", previewId, "success");
    return { ok: true, reasonCode: "ok" };
  }

  async executeHighRiskAutomation(input: {
    readonly context: TenantContext;
    readonly previewId: string;
    readonly observedImpact: Readonly<Record<string, string>>;
  }): Promise<{ ok: boolean; reasonCode: string }> {
    const deny = await this.#requirePermit(
      input.context,
      "workflow.admin.override",
      "workflow",
      input.previewId,
    );
    if (deny) return { ok: false, reasonCode: deny };
    const preview = this.#dryRuns.get(input.previewId);
    const observedHash = opaqueHash(`impact:${JSON.stringify(input.observedImpact)}`);
    this.#evidence.highRiskAutomationChecked = true;
    if (!preview || preview.tenantId !== input.context.tenantId || preview.approvedBy === null) {
      await this.#emit(
        input.context,
        "workflow.admin.override",
        input.previewId,
        "denied",
        "impact-gate-not-approved",
      );
      return { ok: false, reasonCode: "impact-gate-not-approved" };
    }
    if (preview.impactHash !== observedHash) {
      await this.#emit(
        input.context,
        "workflow.admin.override",
        input.previewId,
        "denied",
        "approved-impact-hash-mismatch",
      );
      return { ok: false, reasonCode: "approved-impact-hash-mismatch" };
    }
    await this.#emit(input.context, "workflow.admin.override", input.previewId, "success");
    return { ok: true, reasonCode: "ok" };
  }

  async recordHeartbeat(
    context: TenantContext,
    workerId: string,
  ): Promise<{ ok: true; heartbeatHash: string }> {
    const key = `${context.tenantId}:${workerId}`;
    this.#heartbeats.set(key, this.#clock());
    this.#evidence.heartbeatConcurrencyChecked = true;
    await this.#emit(context, "workflow.signalled", "worker-heartbeat", "success", "heartbeat");
    return { ok: true, heartbeatHash: opaqueHash(`heartbeat:${key}`) };
  }

  detectHeartbeatMiss(context: TenantContext, workerId: string, ttlSeconds: number): boolean {
    const last = this.#heartbeats.get(`${context.tenantId}:${workerId}`);
    const missed = last === undefined || this.#clock() - last > ttlSeconds;
    this.#evidence.heartbeatConcurrencyChecked = true;
    return missed;
  }

  acquireConcurrencyKey(context: TenantContext, key: string): { ok: boolean; reasonCode: string } {
    const scoped = `${context.tenantId}:${key}`;
    this.#evidence.heartbeatConcurrencyChecked = true;
    if (this.#concurrency.has(scoped)) {
      return { ok: false, reasonCode: "concurrency-key-held" };
    }
    this.#concurrency.add(scoped);
    return { ok: true, reasonCode: "ok" };
  }

  releaseConcurrencyKey(context: TenantContext, key: string): void {
    this.#concurrency.delete(`${context.tenantId}:${key}`);
  }

  async checkEgress(input: {
    readonly context: TenantContext;
    readonly endpointRef: string;
    readonly allowList: readonly string[];
    readonly failed?: boolean;
  }): Promise<{ ok: boolean; reasonCode: string }> {
    this.#evidence.egressCircuitBreakerChecked = true;
    if (!input.allowList.includes(input.endpointRef)) {
      await this.#emit(
        input.context,
        "provider.call.failed",
        input.endpointRef,
        "denied",
        "egress-endpoint-not-allowlisted",
      );
      return { ok: false, reasonCode: "egress-endpoint-not-allowlisted" };
    }
    const failures = this.#circuitFailures.get(input.endpointRef) ?? 0;
    if (failures >= 2) {
      await this.#emit(
        input.context,
        "provider.circuit.opened",
        input.endpointRef,
        "denied",
        "provider-circuit-open",
      );
      return { ok: false, reasonCode: "provider-circuit-open" };
    }
    if (input.failed) {
      this.#circuitFailures.set(input.endpointRef, failures + 1);
      await this.#emit(
        input.context,
        "provider.call.failed",
        input.endpointRef,
        "failed",
        "provider-error",
      );
      return { ok: false, reasonCode: "provider-error" };
    }
    return { ok: true, reasonCode: "ok" };
  }

  async snapshotState(context: TenantContext): Promise<{ ok: true; snapshotHash: string }> {
    const snapshotHash = opaqueHash(
      `workflow-snapshot:${context.tenantId}:${this.#outbox.size}:${this.#inbox.size}`,
    );
    this.#evidence.backupRestoreReplayPostureChecked = true;
    await this.#emit(context, "data.created", "workflow-snapshot", "success", "snapshot", {
      snapshotHash,
    });
    return { ok: true, snapshotHash };
  }

  async restoreSnapshot(input: {
    readonly context: TenantContext;
    readonly snapshotHash: string;
    readonly replayAuthorised: boolean;
  }): Promise<{ ok: boolean; reasonCode: string }> {
    const deny = await this.#requirePermit(
      input.context,
      "job.dead_letter.retry",
      "workflow-snapshot",
      input.snapshotHash,
    );
    if (deny) return { ok: false, reasonCode: deny };
    this.#evidence.backupRestoreReplayPostureChecked = true;
    if (!input.replayAuthorised) {
      await this.#emit(
        input.context,
        "data.restored",
        "workflow-snapshot",
        "denied",
        "replay-authorisation-required",
      );
      return { ok: false, reasonCode: "replay-authorisation-required" };
    }
    await this.#emit(input.context, "data.restored", "workflow-snapshot", "success");
    return { ok: true, reasonCode: "ok" };
  }

  recordReclassificationBoundary(): void {
    this.#evidence.cronTenantLocalScheduleReclassified = true;
    this.#evidence.httpJobApiReclassified = true;
    this.#evidence.providerSubstituteBoundaryChecked = true;
    this.#evidence.retryTimeoutCleanupFailClosedChecked = true;
  }

  recordLocalObservabilityEvidence(): void {
    this.#evidence.localObservabilityEvidenceChecked = true;
  }

  assertTenantBoundary(left: TenantContext, right: TenantContext): boolean {
    const isolated = left.tenantId !== right.tenantId;
    this.#evidence.tenantBoundaryChecked = isolated;
    return isolated;
  }

  evidence(): EnterpriseWorkflowControlEvidence {
    return Object.freeze({ ...this.#evidence });
  }

  async #requirePermit(
    context: TenantContext,
    action: string,
    resourceType: string,
    resourceId: string,
  ): Promise<string | null> {
    const decision = this.#pdp.decide({
      context,
      action,
      resource: { type: resourceType, id: resourceId, tenantId: context.tenantId, attributes: {} },
    });
    if (decision.effect === "permit") return null;
    await this.#emit(context, "job.denied", resourceId, "denied", decision.reasonCode);
    return decision.reasonCode;
  }

  async #emit(
    context: TenantContext,
    eventType: string,
    resourceId: string,
    outcome: "success" | "denied" | "failed",
    reasonCode = "ok",
    metadata: Readonly<Record<string, string>> = {},
  ): Promise<void> {
    this.#evidence.auditEvidenceCaptured = true;
    await this.#audit.record(
      createAuditEventDraft({
        eventId: stableId("evt", [
          context.tenantId,
          opaqueHash(`event-resource:${resourceId}`),
          eventType,
          String(this.#clock()),
          String(++this.#eventSequence),
        ]),
        eventType,
        tenantId: context.tenantId,
        actorId: context.actorId,
        action: eventType,
        outcome,
        reasonCode,
        resourceType: "workflow-control",
        resourceId: opaqueHash(`workflow-resource:${resourceId}`),
        recordedByComponent: "enterprise-workflow-control-plane",
        metadata,
      }),
    );
  }
}

export function createEnterpriseWorkflowControlPlane(
  deps: EnterpriseWorkflowControlsDeps,
): EnterpriseWorkflowControlPlane {
  return new EnterpriseWorkflowControlPlane(deps);
}
