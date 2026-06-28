# Parity Jobs/Workflows Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Governance / source-use disposition gate |
| **Status** | Draft / Foundational |
| **Authority level** | semantic-definition (governs source-use of the jobs/workflows slice) |
| **Issue scope** | USF-133 child: jobs, workflows, scheduling, and operational automation |
| **Source row basis** | `../react` jobs/workers/schedulers/workflows/automation lineage (evidence only) and the existing USF jobs/workflows semantic corpus |
| **Repository state** | Implementation under existing authorised topology roots only (`capabilities/jobs`, `adapters/wf`, `packages/{core,ports,proof}`, `tests/*`); no new root introduced |
| **Decision authority** | ADR 0011 (workflow/job port family) and ADR 0013 (jobs/workflows execution model) |

This matrix dispositions the source-use of every runtime/test file added or extended by the
jobs/workflows slice. It is the source-use gate the spec validator enforces
(`USF-IMPL-002` / `USF-PR-DISPOSITION`): every implementation target file appears here.

ISO 27001-supporting technical control evidence only. No certification claim.

## Treatment Rules

- **source-derived-rewrite** — behaviour recovered from `../react` lineage and rewritten clean
  to USF semantics; no React runtime/application code is copied and no React path is mirrored.
- **new-with-rationale** — no direct historical antecedent; introduced to satisfy a USF
  semantic contract / ADR (the ADR 0011 two-port family realised under ADR 0013).
- **evidence-only-support** — `../react` material consulted as behaviour evidence only.

Port-family boundary (ADR 0011): capabilities depend only on the USF durable workflow port
and the USF operational job port — never on Temporal or Windmill directly. Temporal and
Windmill are lineage/composed-test provider concerns; no live provider readiness is claimed.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `capabilities/jobs/src/job-service.ts` | source-derived-rewrite | `../react` job-runner / queue / scheduled-job / DLQ lineage (evidence only) | Operational job service: classification, tenant-scope, concrete service actor, PDP authz, bounded retry + deterministic backoff, idempotency, dead-letter with evidence, deterministic scheduling, value-redacted failure, audit. Depends only on USF ports. |
| `capabilities/jobs/src/workflow-service.ts` | source-derived-rewrite | `../react` durable workflow / approval-chain lineage (evidence only) | Durable workflow + approval service: versioned, tenant-bound, PDP-authorized, separation-of-duties approvals, audited lifecycle. |
| `packages/proof/src/jobs-workflows-proof.ts` | new-with-rationale | evidence-only-support | Hermetic behaviour proof of the full job/workflow matrix. `make jobs-proof`. |
| `tests/adapters/operational-job-store.test.ts` | new-with-rationale | evidence-only-support | Unit tests of lease exclusivity/re-acquire, claim eligibility, idempotency, tenant isolation. |
| `tests/capabilities/jobs-workflows.test.ts` | source-derived-rewrite | `../react` job/workflow test lineage (evidence only) | Capability tests for authz, idempotency, retry/dead-letter, redaction, cancellation, approval SoD. No Playwright. |

Extended (already source-dispositioned by prior parity matrices; no path change):
`packages/core/src/index.ts` (job/workflow types, failure taxonomy, backoff, service-actor,
schedule, redaction, audit event types), `packages/ports/src/index.ts` (`OperationalJobPort`,
`DurableWorkflowPort`), `adapters/wf/src/index.ts` (in-memory job store + durable workflow
adapters), `capabilities/jobs/src/index.ts` (service exports), and
`capabilities/tenant/src/authorization-policy.ts` (job/workflow actions + service-worker role).

## Sub-Domain Classification

| Jobs/workflows concern | Status | Where | Notes |
|---|---|---|---|
| Durable workflow port (ADR 0011) | migrated | `packages/ports`, `adapters/wf` | `DurableWorkflowPort` + in-memory adapter; Temporal deferred |
| Operational job port (ADR 0011) | migrated | `packages/ports`, `adapters/wf` | `OperationalJobPort` + in-memory adapter; Windmill deferred |
| Job/workflow classification | migrated | `packages/core` | 13 classifications; unclassified fails validation |
| Tenant-scoped execution | migrated | `capabilities/jobs` | tenant context required; cross-tenant denied (PDP) |
| Concrete service actors | migrated | `packages/core`, `capabilities/tenant` | `urn:usf:service:` + service-worker role; not a global bypass |
| PDP authorization for job/workflow actions | migrated | `capabilities/tenant` | job.*/workflow.* actions; default-deny |
| Scheduling (deterministic, UTC, missed-run) | migrated | `packages/core`, `capabilities/jobs` | window dedupe; tenant-local + cron deferred |
| Retry/backoff (bounded) + dead-letter | migrated | `packages/core`, `capabilities/jobs` | bounded retries; deterministic backoff; DLQ with evidence |
| Idempotency / duplicate suppression | migrated | `capabilities/jobs`, `adapters/wf` | per-tenant key; duplicate submit suppressed |
| Leases / heartbeat / concurrency | partial | `adapters/wf` | lease exclusivity + safe re-acquire; full heartbeat/concurrency-key deferred |
| Failure taxonomy + safe redaction | migrated | `packages/core` | 15-class taxonomy; secret-redacted messages |
| Job/workflow audit events | migrated | `packages/core`, `capabilities/jobs` | lifecycle events emitted value-free |
| Human approvals / separation of duties | migrated | `capabilities/jobs` | requester cannot self-approve |
| Provider config / secret refs | partial | `packages/core` | payload redaction + secret-ref reuse; live provider egress deferred |
| Safe job/workflow API surfaces | deferred | standard doc | `/v1/jobs`, `/v1/workflows` defined; HTTP wiring deferred |
| Workflow versioning / deterministic replay | deferred | standard doc | version field present; replay/migration deferred |
| Transactional outbox / inbox | deferred | standard doc | port + posture defined; runtime deferred |
| Quotas / backpressure / fairness | deferred | standard doc | model defined; enforcement deferred |
| Pause / resume / drain / maintenance mode | deferred | standard doc | model defined; runtime deferred |
| Dry-run / preview / approved-impact gates | deferred | standard doc | model defined; runtime deferred |
| Backup / restore / replay of job state | deferred | standard doc | classified; runtime deferred |
| Observability hooks (queue depth, latency, lag) | deferred | standard doc | signals defined; live metrics/alerting deferred |
| Live Temporal / Windmill / external queue / worker cluster | deferred | — | blocker; hermetic/in-memory only in this slice |

## React UI/Playwright Job Behaviours

`../react` job/workflow behaviour proven via UI/admin routes or Playwright is **rewritten as
USF foundation behaviour** at the capability/port/proof level — not as browser E2E. No
Playwright is added. The operator/admin surfaces (`/v1/jobs`, `/v1/workflows`) have their
secure semantics **defined** in the Jobs & Workflows Standard and their HTTP wiring
**deferred** to a Linear blocker. No UI/Playwright job behaviour disappears silently: each is
rewritten here or recorded as defined-and-deferred.

## Non-goals

- No capability depends directly on Temporal or Windmill (ADR 0011).
- No live Temporal, live Windmill, live external queue, live scheduler, or live worker cluster.
- No browser/UI implementation; no Playwright.
- No production-live or live-external-provider readiness claim.
- No schema promoted to `active`.
