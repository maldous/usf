# USF Jobs and Workflows Standard

| | |
|---|---|
| Document type | Architecture / domain semantic standard (normative) |
| Status | Draft / parity-jobs-workflows (USF-133) |
| Authority level | semantic-definition; subordinate to the Charter, Authority Model, Standards Profile, ADR 0010 (PDP); companion to ADR 0011 (workflow/job port family) and ADR 0013 (jobs/workflows execution model); consistent with the tenant-authorization standard, the config-and-secrets standard, the files-and-object-storage standard, and the audit-evidence standard |
| Issue scope | Jobs, workflows, scheduling, and operational automation parity under USF-133; enterprise breadth defined here, live execution deferred to named Linear child blockers |
| Evidence basis | Historical `../react` jobs / workers / schedulers / workflows / automation behaviour as lineage only; PR #92 DB/RLS; PR #93 PDP; PR #94 audit/evidence; PR #95 config/secrets; PR #96 files/storage |
| Proof basis | Hermetic only. Proven by `make jobs-proof` over `adapters/wf` and `capabilities/jobs`; no live Temporal, no live Windmill, no live external queue, no live scheduler, no live worker cluster, no production-live claim. |
| Compliance note | ISO 27001-supporting **technical control evidence** (operations security, change management, logging and monitoring, separation of duties). **No certification claim.** |

> **Normative language.** **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** carry BCP 14 (RFC 2119 / RFC 8174) intent and are normative only when written in uppercase.
>
> **Status markers.** **IMPLEMENTED** marks behaviour that is built, tested, and proven hermetically in this parity domain. **DEFERRED** marks behaviour whose semantics are defined here as normative but whose live execution is tracked to a Linear child blocker. **RESERVED** marks a value or field that is defined and present in the model but not yet emitted or enforced.

## 0. Scope, posture, and honesty boundary

This standard is the semantic authority for the jobs and workflows parity domain (USF-133). It defines the **enterprise execution control plane in full breadth** — controlled execution, classification, tenant-safe execution, lifecycle status, scheduling, idempotency, retry and dead-letter, leases and concurrency, workflow versioning and replay, human approvals and separation of duties, operational automation safety, dry-run and approval gates, transactional outbox delivery, payload and secret safety, provider configuration and egress, the job access model, audit, the failure taxonomy, observability hooks, backpressure and fairness, pause/resume/drain, backup/restore, and API surfaces — and marks each item **IMPLEMENTED**, **DEFERRED**, or **RESERVED**.

This is one authorised parity domain among many under USF-133. It defines semantics; it is **not** a claim that every capability is delivered here and **not** a production-live or live-external-provider readiness claim.

**Two USF-owned ports (ADR 0011).** USF defines **two separate ports**, and capabilities depend **only** on USF ports:

- a **durable workflow port** — for durable domain workflows, approval chains, retryable stateful processes, and audit/evidence-bearing long-running orchestration; and
- an **operational job / automation port** — for operational automation, scheduled maintenance, operator-triggered routines, internal tools, and integration glue.

A capability **MUST NOT** depend directly on **Temporal** or **Windmill**, on an external queue, on an external scheduler, or on a worker cluster. **Temporal** is the **canonical composed-test durable-workflow provider**; **Windmill** is the **canonical historical-lineage operational-automation provider**. Both are adapter/provider concerns behind the USF ports. This standard makes **no live Temporal, no live Windmill, no live external queue, no live external scheduler, no live worker-cluster, and no production-live readiness claim**.

**Hermetic honesty (Charter / Standards Profile §12–13; Authority Model proof-honesty bar).**

- This domain proves **hermetic behaviour only**. Hermetic-mock / in-memory proof **MUST NOT** be read as live-external-provider proof. Production-shaped **MUST NOT** be read as production-live.
- Where this standard defines runtime that is not executed here, it is explicitly **DEFERRED** to a Linear child blocker.
- A passing `make jobs-proof` demonstrates the defined fail-closed behaviour over the in-memory job store and durable-workflow adapters (`adapters/wf`); it does **not** upgrade any DEFERRED item to live.

**ISO posture.** This standard provides **ISO 27001-supporting technical control evidence only; no certification claim.** USF does **not** claim ISO 27001 certification or full ISO 27001 compliance. Per the Standards Profile, ISO support is **Adapted / Inspired-by**: USF follows operations-security, change-management, logging, and separation-of-duties control principles and produces evidence consistent with them, but it does not assert conformance to the standard.

## 1. Controlled-execution model

A job or workflow is **controlled execution**, never an ambient script. Execution is governed by a fixed model. Five execution kinds are defined:

- **durable workflow** — a long-running, versioned, stateful orchestration that survives restarts where represented, advances through explicit states, may wait on signals or approvals, and bears audit/evidence. Realised on the **durable workflow port** (Temporal is the canonical composed-test provider).
- **operational job** — a discrete unit of operational work (a script, maintenance task, internal tool, or integration step) submitted, classified, leased, run once where idempotent, and audited. Realised on the **operational job / automation port** (Windmill is the canonical historical-lineage provider).
- **scheduled job** — an operational job whose execution is triggered by a deterministic schedule rather than a direct submission (§5).
- **approval workflow** — a workflow whose advance is gated on an explicit human decision recorded with separation of duties (§10).
- **event-triggered job** — a job whose submission is caused by a governed inbound event or domain event, deduplicated on the inbound boundary (§13).

**The six rules (all normative):**

1. **No job or workflow runs without classification** — execution without a classification (§2) **MUST** fail validation, fail closed, and never run.
2. **No tenant-impacting job runs without tenant scope** — tenant-impacting execution **MUST** carry exactly one concrete tenant context (§3) or fail closed.
3. **No system job runs without a concrete service actor** — system-scoped execution **MUST** carry a concrete service-actor identity (`urn:usf:service:`) with explicit permissions; a service actor is **NOT** a global bypass (§3).
4. **No privileged step proceeds without PDP authorization** — every privileged job/workflow action **MUST** flow through the PDP (ADR 0010); the PDP is the **sole** authorization authority (§16).
5. **No retry loop is unbounded** — retries **MUST** be bounded by `max_retries` with a deterministic or explicitly jittered backoff; an unbounded retry loop is forbidden (§7).
6. **No failure silently disappears** — every failure **MUST** carry a structured failure class (§18), a redacted safe message, and audit/evidence; a failure that is dropped or swallowed is forbidden (§17, §18).

## 2. Classification (IMPLEMENTED)

Every job or workflow **MUST** be **exactly one** of the following thirteen classifications:

- `durable-domain-workflow`
- `operational-automation-job`
- `scheduled-maintenance-job`
- `human-approval-flow`
- `event-triggered-job`
- `import-export-job`
- `notification-job`
- `file-processing-job`
- `audit-maintenance-job`
- `security-control-job`
- `identity-lifecycle-job`
- `provider-sync-job`
- `system-internal-job`

**Rules:**

- An **unclassified** job or workflow **MUST** fail validation and **MUST NOT** run.
- A `security-control-job` **MUST** carry stronger audit (§17) — security-control execution and its access are recorded with higher scrutiny.
- A **tenant-impacting** classification **MUST** carry a concrete tenant context (§3).
- An `import-export-job` **MUST** carry a `data_classification` and flow through the file/object-storage controls (files-and-object-storage standard); payloads reference files by `file_id`, never raw object keys (§14).
- A `provider-sync-job` **MUST** carry typed provider configuration and **secret-reference** controls (§15); it **MUST NOT** embed credentials.
- An `identity-lifecycle-job` **MUST** carry identity audit and **safe revocation** semantics (auth-and-identity standard §11); revocation **MUST** fail closed downstream.

**Status.** IMPLEMENTED in `packages/core` (the thirteen classifications) and enforced at submit in `capabilities/jobs`; unclassified execution fails validation.

## 3. Tenant-safe execution model (IMPLEMENTED)

Every job and workflow carries an execution context. **Context fields:** `job_id`, `workflow_id`, `tenant_id`, `actor_id`, `service_actor_id`, `effective_actor_id`, `requested_by`, `approved_by`, `execution_scope`, `correlation_id`, `causation_id`, `trace_id`, `request_id`.

**Rules:**

- Tenant-scoped work **MUST** carry **exactly one** tenant context (`tenant_id`); zero or two tenant contexts **MUST** fail closed (`tenant-context-missing` / `tenant-context-mismatch`, §18).
- Cross-tenant orchestration **MAY** schedule work **tenant-by-tenant**, but it **MUST NOT** read or mutate data outside the tenant context of the unit it is executing.
- A **system actor is NOT a global bypass**: a system-scoped action **MUST** still resolve to a concrete service actor with explicit permissions and tenant-scoped data access where it touches tenant data.
- A **service actor** (`urn:usf:service:`) **MUST** have explicit permissions, **MUST** flow through the PDP for privileged actions, and **MUST** be audited; it never silently widens scope.
- The tenant context **MUST** propagate into every downstream control: the **DB/RLS** layer (PR #92), the **PDP** (PR #93), **audit/evidence** (PR #94), **config** (PR #95), **files/storage** (PR #96), and **provider calls** (§15).
- Any **leakage** of tenant context — a unit that reads or mutates outside its tenant context, or a system actor used as a global bypass — **MUST** fail validation.

**Status.** IMPLEMENTED in `capabilities/jobs`: tenant-by-tenant scoping, concrete service actors (`urn:usf:service:`) with the service-worker role (`capabilities/tenant`), and cross-tenant access denied through the PDP. Proven hermetically; no boundary collapse.

## 4. Job and workflow statuses (IMPLEMENTED)

**Job statuses:** `queued`, `scheduled`, `leased`, `running`, `waiting`, `awaiting-approval`, `succeeded`, `failed`, `retrying`, `dead-lettered`, `cancelled`, `expired`, `blocked`.

**Workflow statuses:** `running`, `waiting`, `awaiting-approval`, `completed`, `failed`, `cancelled`.

**Rules:**

- Status transitions are explicit; an unknown or unrepresented transition **MUST** fail closed.
- The **terminal** statuses `succeeded`, `dead-lettered`, `cancelled`, and `expired` are final: a job in a terminal status **MUST NEVER** run again (re-running requires an explicit, privileged, audited re-submission or dead-letter retry, §7).
- `awaiting-approval` **MUST NOT** advance without a recorded approval decision (§10); `blocked` **MUST NOT** advance until its blocking condition clears.

**Status.** IMPLEMENTED in `packages/core` and `capabilities/jobs`; terminal-status finality is enforced and proven hermetically.

## 5. Scheduling and time semantics

**Fields:** `schedule_id`, `schedule_expression`, `schedule_timezone`, `schedule_anchor`, `next_run_at`, `last_run_at`, `missed_run_policy`, `catchup_policy`, `max_catchup_runs`, `jitter_policy`, `maintenance_window`, `blackout_window`.

**Rules:**

- Stored execution times **MUST** use **UTC**.
- Tenant-local interpretation **MUST** be explicit where represented (never an implicit local-time assumption).
- **DST** behaviour **MUST** be defined where tenant-local schedules are represented.
- A **missed run MUST** be handled deterministically per `missed_run_policy`.
- **Catch-up MUST** be bounded by `max_catchup_runs`; unbounded catch-up is forbidden.
- **Overlapping runs** of the same schedule **MUST** be forbidden unless explicitly allowed (window dedupe, §6).
- Schedule changes are **privileged** and **MUST** be audited (§16, §17).

**Status.** IMPLEMENTED: deterministic UTC interval scheduling with scheduled-window deduplication and a `missed_run_policy` of **skip / run-once / fail-closed**, plus bounded catch-up (`max_catchup_runs`). **DEFERRED:** cron expressions, tenant-local / DST interpretation, and blackout / maintenance windows.

## 6. Idempotency and side-effect safety

**Fields:** `idempotency_key`, `dedupe_key`, `side_effect_id`, `side_effect_type`, `side_effect_status`, `idempotency_window`, `replay_policy`.

**Side-effect types:** database mutation, file write, notification send, provider call, audit export, identity change, config change, role/permission change.

**Rules:**

- A side-effecting job **MUST** carry an `idempotency_key`.
- A **duplicate submission MUST NOT** produce a duplicate side effect.
- A **retry MUST reuse the same** `idempotency_key` (a retry is not a new logical operation).
- **Replay** is explicit, **privileged**, and **audited**; it never happens implicitly.
- An idempotency-key **collision MUST fail closed** (`idempotency-conflict`, §18), never silently overwrite.

**Status.** IMPLEMENTED: per-tenant idempotency-key deduplication at submit and scheduled-window deduplication (`capabilities/jobs`, `adapters/wf`). **DEFERRED:** a full side-effect ledger (`side_effect_id` / `side_effect_status` lifecycle) and the replay runtime.

## 7. Retry, backoff, timeout, and dead-letter (IMPLEMENTED)

**Fields:** `retry_count`, `max_retries`, `backoff_policy`, `retry_after`, `timeout_policy`, `started_at`, `heartbeat_at`, `lease_expires_at`, `dead_letter_reason`, `failure_reason_code`, `safe_failure_message`.

**Rules:**

- Retries **MUST** be **bounded** by `max_retries`; an unbounded retry loop is forbidden (§1 rule 5).
- Backoff **MUST** be **deterministic** or **explicitly jittered** (`backoff_policy` / `jitter_policy`).
- Timeouts **MUST** be explicit (`timeout_policy`).
- **Heartbeat loss MUST** lead to a **safe lease expiry** (`lease_expires_at`), never a stuck running job (§8).
- A **dead-letter MUST preserve evidence** (`dead_letter_reason`, `failure_reason_code`) for later inspection.
- **Dead-letter retry MUST require authorization** (`job.dead_letter.retry`, §16).
- A **poison job MUST NOT block other tenants** — it is dead-lettered, not left to starve the shared substrate.
- A `safe_failure_message` returned to a client **MUST** be redacted; detailed context is evidence-scoped (§14, §18).

**Status.** IMPLEMENTED in `packages/core` and `capabilities/jobs`: bounded retries, deterministic backoff, dead-letter with preserved evidence, and value-redacted failure messages. Proven hermetically.

## 8. Leases, locks, and concurrency

**Fields:** `lease_owner`, `lease_token`, `lease_acquired_at`, `lease_expires_at`, `heartbeat_interval`, `concurrency_key`, `max_concurrency`.

**Rules:**

- Only the **lease owner** (matching `lease_token`) **MAY** complete a leased unit.
- An **expired lease MUST** be safely re-acquirable so work does not stall.
- Work sharing the same `concurrency_key` **MUST** be controlled per `max_concurrency`.
- **Tenant-level concurrency MUST** be enforceable where represented.
- A **global concurrency limit MUST NOT starve a tenant** (fairness, §20).

**Status.** IMPLEMENTED: lease exclusivity (only the lease owner completes) and safe re-acquire of an expired lease (`adapters/wf`), proven hermetically. **DEFERRED:** heartbeat interval, concurrency keys, and tenant / global concurrency limits.

## 9. Workflow versioning and deterministic replay

**Fields:** `workflow_type`, `workflow_version`, `workflow_definition_hash`, `workflow_state_version`, `event_history_version`, `migration_policy`, `replay_policy`.

**Rules:**

- A **running workflow MUST pin its version** (`workflow_version`); it does not silently adopt a new definition mid-flight.
- A **breaking change MUST** carry a migration or compatibility policy (`migration_policy`).
- **Replay MUST be deterministic** where it is represented.
- An **unknown version MUST fail safely** (never run against a mismatched definition).
- A **state migration MUST be audited**.

**Status.** **PARTIAL:** `workflow_version` is pinned on running workflows (`capabilities/jobs`). **DEFERRED:** `workflow_definition_hash`, deterministic replay, and the migration runtime.

## 10. Human approvals and separation of duties

**Fields:** `approval_id`, `approval_type`, `requested_by`, `approved_by`, `rejected_by`, `approval_reason`, `approval_expires_at`, `approval_status`, `approval_policy`.

**Rules:**

- A **requester MUST NOT approve their own** privileged workflow (`requested_by` ≠ `approved_by`).
- An **approver MUST** hold an **active membership** and the required **permission** (`workflow.approve`, §16), verified through the PDP.
- An **expired approval MUST fail closed** (`approval_expires_at`).
- Every approval **decision MUST be audited** (§17).
- An **approval MUST NOT be reusable** out of its scope (it binds to a specific workflow/decision).
- A **rejected** workflow **MUST** remain blocked unless explicitly resubmitted.

**Status.** IMPLEMENTED: requester-cannot-self-approve, PDP-gated approve/reject, and audited approval decisions (`capabilities/jobs`). **DEFERRED:** approval expiry enforcement and multi-step approval policy.

## 11. Operational automation safety

**High-risk operations:** data repair, tenant migration, bulk import, bulk export, backfill, retention purge, identity deprovision, role migration, config override, file purge, audit export.

**Rules:**

- A high-risk operation **MUST** require **stronger authorization** than ordinary work (§16, §5 assurance posture in the auth-and-identity standard).
- It **MUST** support **dry-run** (§12) or carry an explicit, recorded **no-dry-run rationale**.
- Its scope **MUST** be **bounded** (no unbounded blast radius).
- It **MUST** carry **audit evidence** and a **rollback / compensation** posture.
- A **bulk operation MUST be tenant-scoped** (cross-tenant bulk action is forbidden; cross-tenant orchestration schedules tenant-by-tenant, §3).

**Status.** The high-risk operation set and rules are **DEFINED**. **DEFERRED:** the high-risk operational-automation runtime.

## 12. Dry-run, preview, and approval gates

**Fields:** `dry_run_supported`, `dry_run_required`, `dry_run_result_hash`, `estimated_impact`, `approved_impact_hash`.

**Rules:**

- A **dry-run MUST NOT** resolve or expose secrets.
- A **dry-run MUST NOT** mutate state.
- An **approval MAY bind to a** `dry_run_result_hash` so the approver approves a specific previewed impact.
- An **execution whose impact differs** from `approved_impact_hash` **MUST fail closed** where the binding is represented.

**Status.** Dry-run / preview / approval-gate semantics are **DEFINED**. **DEFERRED:** the dry-run, preview, and impact-gate runtime.

## 13. Transactional outbox and delivery reliability

**Fields:** `outbox_event_id`, `inbox_event_id`, `delivery_status`, `delivery_attempts`, `last_delivery_error`, `provider_message_id`.

**Rules:**

- A **state mutation and its outbox commit MUST** be atomic **where practical** (the outbox is written in the same transaction as the state change).
- **Asynchronous delivery MUST** carry **durable evidence** (`delivery_status`, `delivery_attempts`).
- **Provider retries MUST be idempotent** (reuse `provider_message_id` / idempotency key, §6).
- **Inbound provider events MUST be deduplicated** on the inbox boundary (`inbox_event_id`) — an event-triggered job (§1) is submitted once per logical inbound event.
- A **delivery failure MUST be audited or dead-lettered** (§7, §17), never silently dropped.

**Status.** The transactional-outbox / inbox **port and posture are DEFINED**. **DEFERRED:** the outbox / inbox delivery runtime, tracked to a Linear child blocker.

## 14. Payload safety and data minimisation (IMPLEMENTED)

**Rules:**

- A payload **MUST carry references, not full sensitive objects**.
- **Secrets MUST NEVER be embedded** in a payload (secret references only, §15).
- A **file MUST be referenced by** `file_id`, never by raw object key (files-and-object-storage standard).
- A **large payload MUST** be carried via governed **file / object storage** or **event references**, not inlined.
- Every payload **MUST be classified** (data classification).
- A payload **MUST be redacted** in audit, errors, OpenAPI, logs, and proof output.

**Blocked patterns** (a payload, audit record, error, OpenAPI document, log line, or proof output containing these as raw values fails closed / is redacted): `password`, `secret`, `token`, `api_key`, `authorization`, `cookie`, `private_key`, `connection_string`, `credential`.

**Status.** IMPLEMENTED: payload redaction across audit, errors, and proof output (`packages/core`, reusing the PR #95 redaction substrate). Proven hermetically.

## 15. Provider configuration and egress safety

**Rules:**

- **Provider credentials MUST be secret references only** (`SecretReference`; config-and-secrets standard §5), never embedded values.
- **Provider config MUST be typed and classified** (provider-config; config-and-secrets standard §7).
- **Endpoints MUST be allow-listed** where represented.
- **Timeouts and circuit breakers MUST be explicit** where represented.
- A **provider failure MUST leak no secrets** (redacted error, §14, §18).
- **Live provider readiness MUST NOT be claimed** unless explicitly authorised.

**Status.** **PARTIAL:** secret-reference reuse and redaction (`packages/core`). **DEFERRED:** endpoint allow-listing, circuit breakers, and live provider egress.

## 16. Job access model (IMPLEMENTED core; admin override RESERVED)

**Privileged actions** (every one PDP-gated, ADR 0010):

`job.create`, `job.read`, `job.list`, `job.run`, `job.cancel`, `job.retry`, `job.dead_letter.read`, `job.dead_letter.retry`, `job.schedule.create`, `job.schedule.update`, `job.schedule.disable`, `workflow.start`, `workflow.signal`, `workflow.query`, `workflow.cancel`, `workflow.approve`, `workflow.reject`, `workflow.admin.override`.

**Rules:**

- Every privileged action **MUST** flow through the **PDP** (the PDP is the sole authorization authority; default deny).
- **Listing MUST be tenant-scoped and pagination-safe** (non-enumerating; never returns another tenant's jobs).
- **Dead-letter access** (`job.dead_letter.read`) **MUST be privileged**.
- **Retry-from-dead-letter** (`job.dead_letter.retry`) **MUST be privileged**.
- **Workflow admin override** (`workflow.admin.override`) **MUST be privileged and audited**.

**Status.** IMPLEMENTED for the core actions (`job.*` and `workflow.*` create/read/list/run/cancel/retry/schedule/start/signal/query/approve/reject) through the PDP (`capabilities/tenant`). **RESERVED:** `workflow.admin.override` — defined and present in the action set but not yet enforced or emitted.

## 17. Job audit and audit-of-job-access

**Audit events:**

`job.created`, `job.scheduled`, `job.started`, `job.completed`, `job.failed`, `job.retrying`, `job.dead_lettered`, `job.cancelled`, `job.expired`, `job.denied`, `job.leased`, `job.heartbeat_missed`, `schedule.created`, `schedule.changed`, `schedule.disabled`, `workflow.started`, `workflow.signalled`, `workflow.completed`, `workflow.failed`, `workflow.cancelled`, `workflow.approval.requested`, `workflow.approval.approved`, `workflow.approval.rejected`, `workflow.admin.override`.

**Rules:**

- An audit record **MUST include**: actor / service actor, tenant, job / workflow id, action, outcome, reason code, `correlation_id`, `causation_id`, and `trace_id`.
- An audit record **MUST exclude**: raw payloads, secrets, provider credentials, and full stack traces (§14).
- **Reading high-risk job evidence MAY itself be audited** (audit-of-access for `security-control-job` and high-risk operations, §2, §11).

**Emitted (IMPLEMENTED):** `job.created`, `job.scheduled`, `job.started`, `job.completed`, `job.failed`, `job.retrying`, `job.dead_lettered`, `job.cancelled`, `job.expired`, `job.denied`, `job.leased`, `workflow.started`, `workflow.completed`, `workflow.failed`, `workflow.cancelled`, `workflow.approval.requested`, `workflow.approval.approved`, `workflow.approval.rejected` — all value-free.

**Reserved (RESERVED / DEFERRED):** `job.heartbeat_missed` (heartbeat runtime, §8), `schedule.created` / `schedule.changed` / `schedule.disabled` (privileged schedule-mutation runtime, §5), `workflow.signalled` (signal runtime, §16), and `workflow.admin.override` (admin-override runtime, §16).

## 18. Failure taxonomy (IMPLEMENTED)

Every failure **MUST** be classified as **exactly one** of the following fifteen classes:

- `validation-failed`
- `authorization-denied`
- `tenant-context-missing`
- `tenant-context-mismatch`
- `idempotency-conflict`
- `provider-timeout`
- `provider-denied`
- `provider-error`
- `transient-error`
- `permanent-error`
- `timeout`
- `cancelled`
- `expired`
- `dead-lettered`
- `unknown`

**Rules:**

- A failure **class MUST be structured** (one of the fifteen above) and recorded.
- The **safe failure message MUST be client-safe** (redacted, non-enumerating, §14).
- **Detailed context MUST be redacted** and **evidence-scoped** (it goes to audit/evidence, never to the client).
- An **`unknown` failure MUST fail closed** (never default to success or retry-forever).

**Status.** IMPLEMENTED in `packages/core`: the fifteen-class taxonomy with redacted, evidence-scoped failure detail. Proven hermetically.

## 19. Observability hooks

The following signals are **defined** so future operations can be built on them; this standard does **not** claim live monitoring.

**Signals:** `queue_depth`, `oldest_queued_age`, `job_latency`, `job_duration`, `success_count`, `failure_count`, `retry_count`, `dead_letter_count`, `schedule_lag`, `worker_heartbeat`, `lease_expiry_count`.

**Rules:**

- Metrics **MUST be tenant-safe and carry no secrets** (§14).
- Dashboards are **future operations scope**.
- **Live alerting is DEFERRED.**

**Status.** Signal vocabulary **DEFINED** (consistent with the observability vocabulary, ADR 0004). **DEFERRED:** live metrics emission, dashboards, and alerting.

## 20. Backpressure, quotas, and fairness

**Fields:** `tenant_job_quota`, `tenant_concurrency_limit`, `global_concurrency_limit`, `priority`, `fairness_policy`, `rate_limit_policy`.

**Rules:**

- **Tenant quotas MUST be enforceable** where represented.
- **Priority MUST NOT bypass security controls** (a higher priority never weakens authorization, §16).
- **Backpressure MUST resolve to a safe failure or delayed scheduling**, never silent loss.
- **Quota failures MUST be audited** (§17).

**Status.** The quota / fairness model is **DEFINED**. **DEFERRED:** quota, concurrency-limit, priority, fairness, and rate-limit enforcement.

## 21. Pause, resume, drain, and maintenance mode

**Fields:** `pause_reason`, `paused_by`, `paused_at`, `resume_reason`, `resumed_by`, `drain_started_at`, `maintenance_mode`.

**Rules:**

- **Pause / resume / drain MUST be privileged** (§16) and audited.
- A **paused queue MUST NOT start new work**.
- **Running work MUST drain per policy** (no abrupt loss of in-flight units).
- **Maintenance mode MUST be audited**.

**Status.** The pause / resume / drain / maintenance-mode model is **DEFINED**. **DEFERRED:** the runtime.

## 22. Backup, restore, and replay

**Rules:**

- Workflow / job **state backup MUST be classified** (data classification, §14).
- **Restore MUST be privileged and audited**.
- A **restored job MUST NOT rerun side effects** unless explicitly authorised (idempotency, §6).
- **Replay MUST use idempotency and versioned definitions** (§6, §9).
- **No disaster-recovery or readiness claim MUST be made without proof** (proof honesty, §0).

**Status.** Backup / restore / replay semantics are **DEFINED**. **DEFERRED:** the runtime.

## 23. Safe future API surfaces

Possible future job/workflow routes are PDP-protected, tenant-scoped, RLS-backed where persisted, redacted, OpenAPI-covered, non-enumerating, and pagination-safe.

| Route | Purpose | Status |
|---|---|---|
| `/v1/jobs` | List/submit tenant-scoped jobs (pagination-safe, non-enumerating) | semantics DEFINED; HTTP wiring DEFERRED |
| `/v1/jobs/{id}` | Safe single-job view (redacted) | semantics DEFINED; HTTP wiring DEFERRED |
| `/v1/jobs/{id}/cancel` | Privileged cancel (`job.cancel`) | semantics DEFINED; HTTP wiring DEFERRED |
| `/v1/jobs/{id}/retry` | Privileged retry (`job.retry`) | semantics DEFINED; HTTP wiring DEFERRED |
| `/v1/workflows` | List/start tenant-scoped workflows | semantics DEFINED; HTTP wiring DEFERRED |
| `/v1/workflows/{id}` | Safe single-workflow view (redacted) | semantics DEFINED; HTTP wiring DEFERRED |
| `/v1/workflows/{id}/cancel` | Privileged cancel (`workflow.cancel`) | semantics DEFINED; HTTP wiring DEFERRED |
| `/v1/workflows/{id}/signal` | Privileged signal (`workflow.signal`) | semantics DEFINED; HTTP wiring DEFERRED |

Every surface **MUST NOT** expose: raw secrets, provider internals, worker credentials, another tenant's jobs, raw stack traces, raw sensitive payloads, or live provider internals. Every surface **MUST** redact per the config-and-secrets redaction rules (§14), **MUST NOT** enumerate other tenants' resources, and **MUST** be pagination-safe.

**Status.** Route semantics **DEFINED**. **DEFERRED:** the HTTP wiring of every route above to a Linear child blocker.

## 24. Implemented vs Deferred summary

| This domain IMPLEMENTS + PROVES hermetically | This domain DEFINES but DEFERS (Linear child blocker) |
|---|---|
| The two USF ports (durable workflow port + operational job/automation port) and their in-memory adapters — `packages/ports`, `adapters/wf` | Live Temporal (canonical composed-test durable-workflow provider) |
| Classification — exactly one of thirteen; unclassified fails validation — `packages/core` | Live Windmill (canonical historical-lineage operational-automation provider) |
| Tenant-scoped execution (exactly one tenant context; tenant-by-tenant orchestration; no leakage) — `capabilities/jobs` | Live external queue / scheduler / worker cluster |
| Concrete service actors (`urn:usf:service:`; not a global bypass) — `packages/core`, `capabilities/tenant` | Browser / admin UI (no Playwright) |
| PDP authorization for job/workflow actions (default deny) — `capabilities/tenant` | Transactional outbox / inbox delivery runtime |
| Bounded retry + deterministic backoff — `packages/core`, `capabilities/jobs` | Workflow versioning / deterministic replay / migration runtime |
| Idempotency + scheduled-window deduplication — `capabilities/jobs`, `adapters/wf` | Dry-run / preview / approved-impact gates |
| Dead-letter with preserved evidence — `capabilities/jobs` | Quotas / backpressure / fairness enforcement |
| Lease exclusivity + safe re-acquire — `adapters/wf` | Pause / resume / drain / maintenance mode |
| Deterministic UTC scheduling + missed-run policy (skip / run-once / fail-closed) + fail-closed unknown schedule + bounded catch-up — `packages/core`, `capabilities/jobs` | Backup / restore / replay of job state |
| Approval separation of duties (requester cannot self-approve; PDP-gated approve/reject) — `capabilities/jobs` | Cron + tenant-local / DST schedules; blackout / maintenance windows |
| Failure taxonomy (fifteen classes) + redaction — `packages/core` | Concurrency keys + heartbeat interval; tenant / global concurrency limits |
| Payload / secret redaction (blocked patterns) — `packages/core` | High-risk operational-automation runtime |
| Value-free lifecycle audit events (§17) — `packages/core`, `capabilities/jobs` | Provider egress allow-listing + circuit breakers; live provider egress |
| Hermetic behaviour proof of the full matrix — `packages/proof/src/jobs-workflows-proof.ts`, `make jobs-proof` | Live observability metrics / dashboards / alerting |
| | HTTP API surfaces (`/v1/jobs`, `/v1/workflows`) |

No DEFERRED item above is overclaimed as IMPLEMENTED, live, or production-live anywhere in USF while its blocker is open. Hermetic / in-memory proof never satisfies a live-external-provider claim, and production-shaped never satisfies production-live.

## Authority and amendment

This standard is **subordinate** to the Charter and the Authority Model, and is a **companion** to **ADR 0011** (USF-owned workflow/job port family) and **ADR 0013** (jobs/workflows execution model). It is consistent with **ADR 0010** (USF-owned PDP as the sole authorization authority), the tenant-authorization standard, the config-and-secrets standard, the files-and-object-storage standard, and the audit-evidence standard. Where this standard conflicts with the constitutional layer, the constitutional layer governs and the conflict **MUST** be stopped and reported.

This standard creates no schema, no ADR, and no implementation code. It defines semantics; implementation lands only under an authorised directive with its own proof. Work is tracked under **USF-133** and its child blockers (each DEFERRED item in §24 maps to a blocker); Linear tracks work only and does not define USF authority.
