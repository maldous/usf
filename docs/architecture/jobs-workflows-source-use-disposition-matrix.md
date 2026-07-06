# Jobs/Workflows Source-Use Disposition Matrix

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

- **source-derived-rewrite** — behaviour authored against USF semantics with `../react` as lineage;
  USF authors its own runtime, no external runtime/application code is copied, and no external source path is mirrored.
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
| `capabilities/jobs/src/enterprise-workflow-controls.ts` | source-derived-rewrite | `../react` workflow replay, operational automation, scheduler, outbox, backpressure, and provider-egress lineage (evidence only) | USF-151 bounded local enterprise control plane: workflow definition hash, deterministic replay, migration policy, outbox/inbox dedupe, quota/backpressure, pause/resume/drain, dry-run impact gate, heartbeat/concurrency key, high-risk admin override, provider egress/circuit breaker, snapshot replay authorization, value-free audit, and explicit live-provider/API/operator non-claims. |
| `packages/proof/src/jobs-workflows-proof.ts` | new-with-rationale | evidence-only-support | Hermetic behaviour proof of the full job/workflow matrix. `make jobs-proof`. |
| `adapters/wf/src/temporal-workflows.ts` | new-with-rationale | evidence-only-support | Minimal synthetic workflow definition for the adapter-bound Temporal local/dev/test proof. No capability or orchestration code imports the Temporal SDK. |
| `tests/adapters/operational-job-store.test.ts` | new-with-rationale | evidence-only-support | Unit tests of lease exclusivity/re-acquire, claim eligibility, idempotency, tenant isolation. |
| `tests/capabilities/jobs-workflows.test.ts` | source-derived-rewrite | `../react` job/workflow test lineage (evidence only) | Capability tests for authz, idempotency, retry/dead-letter, redaction, cancellation, approval SoD. No Playwright. |

Extended (already source-dispositioned by prior source-use disposition matrices; no path change):
`packages/core/src/index.ts` (job/workflow types, failure taxonomy, backoff, service-actor,
schedule, redaction, audit event types), `packages/ports/src/index.ts` (`OperationalJobPort`,
`DurableWorkflowPort`), `adapters/wf/src/index.ts` (in-memory job store + durable workflow
adapters plus the adapter-bound Temporal composed-test provider),
`capabilities/jobs/src/index.ts` (service exports), and
`capabilities/tenant/src/authorization-policy.ts` (job/workflow actions, explicit schedule
mutation actions, workflow admin override, and service-worker/security-admin role boundaries).

## Sub-Domain Classification

| Jobs/workflows concern | Status | Where | Notes |
|---|---|---|---|
| Durable workflow port (ADR 0011) | covered | `packages/ports`, `adapters/wf` | `DurableWorkflowPort` + in-memory adapter; Temporal local composed-test binding proven by USF-183; live Temporal remains deferred. |
| Operational job port (ADR 0011) | covered | `packages/ports`, `adapters/wf` | `OperationalJobPort` + in-memory adapter; Windmill readiness deferred |
| Job/workflow classification | covered | `packages/core` | 13 classifications; unclassified fails validation |
| Tenant-scoped execution | covered | `capabilities/jobs` | tenant context required; cross-tenant denied (PDP) |
| Concrete service actors | covered | `packages/core`, `capabilities/tenant` | `urn:usf:service:` + service-worker role; not a global bypass |
| PDP authorization for job/workflow actions | covered | `capabilities/tenant` | job.*/workflow.* actions; default-deny |
| Scheduling (deterministic, UTC, missed-run) | covered | `packages/core`, `capabilities/jobs` | window dedupe; tenant-local + cron deferred |
| Retry/backoff (bounded) + dead-letter | covered | `packages/core`, `capabilities/jobs` | bounded retries; deterministic backoff; DLQ with evidence |
| Idempotency / duplicate suppression | covered | `capabilities/jobs`, `adapters/wf` | per-tenant key; duplicate submit suppressed |
| Leases / heartbeat / concurrency | bounded-local-proof | `adapters/wf`, `capabilities/jobs/src/enterprise-workflow-controls.ts` | lease exclusivity + safe re-acquire; local heartbeat-miss and concurrency-key proof; distributed worker-cluster heartbeat/concurrency deferred |
| Failure taxonomy + safe redaction | covered | `packages/core` | 15-class taxonomy; secret-redacted messages |
| Job/workflow audit events | covered | `packages/core`, `capabilities/jobs` | lifecycle events emitted value-free |
| Human approvals / separation of duties | covered | `capabilities/jobs` | requester cannot self-approve |
| Provider config / secret refs / egress | bounded-local-proof | `packages/core`, `capabilities/jobs/src/enterprise-workflow-controls.ts` | payload redaction + secret-ref reuse; local endpoint-reference allow-list and circuit-breaker fail-closed proof; live provider egress deferred |
| Safe job/workflow API surfaces | deferred | standard doc | `/v1/jobs`, `/v1/workflows` defined; HTTP wiring deferred |
| Workflow versioning / deterministic replay | bounded-local-proof | `capabilities/jobs/src/enterprise-workflow-controls.ts`, proof | workflow definition hash, replay mismatch denial, and migration-policy gate proven locally; live Temporal replay/migration deferred |
| Transactional outbox / inbox | bounded-local-proof | `capabilities/jobs/src/enterprise-workflow-controls.ts`, proof | local outbox idempotent commit and inbound inbox dedupe proven; distributed delivery runtime deferred |
| Quotas / backpressure / fairness | bounded-local-proof | `capabilities/jobs/src/enterprise-workflow-controls.ts`, proof | tenant quota/backpressure denial proven locally; distributed fairness and global capacity deferred |
| Pause / resume / drain / maintenance mode | bounded-local-proof | `capabilities/jobs/src/enterprise-workflow-controls.ts`, proof | tenant queue pause/resume/drain admission proven; distributed maintenance/drain runtime deferred |
| Dry-run / preview / approved-impact gates | bounded-local-proof | `capabilities/jobs/src/enterprise-workflow-controls.ts`, proof | dry-run, separate approval, impact hash mismatch denial, and high-risk override gate proven locally; operator UI/API deferred |
| Backup / restore / replay of job state | bounded-local-proof | `capabilities/jobs/src/enterprise-workflow-controls.ts`, proof | local snapshot hash and replay-authorized restore gate proven; backup service, DR, RPO/RTO deferred |
| Observability hooks (queue depth, latency, lag) | deferred | standard doc | signals defined; live metrics/alerting deferred |
| Live Temporal / Windmill / external queue / worker cluster | deferred | — | blocker; USF-183 proves only local composed-test Temporal binding through the adapter boundary. |

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
