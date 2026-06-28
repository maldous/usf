# 0013 USF Jobs and Workflows Execution Model

## Status

Accepted. 2026-06-28. Realises [ADR 0011](./0011-workflow-and-job-port-family.md) (the workflow/job port family) and builds on [ADR 0010](./0010-authorization-policy-decision-point.md) (the USF policy decision point).

## Description

Records the human-approved execution-control model for USF jobs and workflows on the ADR 0011 port family: mandatory classification, tenant-safe execution with concrete service actors, PDP authorization, bounded retry with deterministic backoff, idempotent side effects, dead-letter with evidence, UTC deterministic scheduling with a missed-run policy, versioned tenant-bound durable workflows, approval separation of duties, structured redacted failures, and value-free lifecycle audit, with Temporal/Windmill as deferred provider concerns.

## Context

ADR 0011 decided that USF owns a workflow/job port family (a durable workflow port and a separate operational job/automation port, with in-memory dev adapters and Temporal/Windmill as lineage/composed-test providers) but recorded authority only and left the execution-control semantics to a separate authorised implementation directive. During the jobs/workflows parity pass the exact execution-control model was a requires-human-decision item under USF-133, because the Authority Model forbids inferring missing semantics from historical implementation. A human has now decided how jobs and workflows execute: classification, tenant-safe execution, service actors, authorization, bounded retry, idempotency, dead-letter, scheduling, approvals, redaction, and audit. This ADR realises ADR 0011 with rank-2 execution-model coverage and builds on ADR 0010 (the USF policy decision point).

## Decision

USF V2 treats jobs and workflows as controlled execution paths realised on the ADR 0011 port family. Every job or workflow carries exactly one classification; an unclassified job fails validation. A tenant-impacting job runs with exactly one tenant context and may not read or mutate data outside it; cross-tenant orchestration schedules tenant-by-tenant work but never crosses the tenant boundary. A system job runs under a concrete service actor (a stable `urn:usf:service:` identity with explicit permissions and audit), never a global tenant bypass. Every privileged job and workflow action is authorized by the USF PDP (ADR 0010); a role or claim never authorizes by itself. Retries are bounded with a deterministic (or explicitly jittered) backoff; on exhaustion or a non-retryable failure the job is dead-lettered with preserved, value-free evidence. Side-effecting jobs use idempotency keys so a duplicate submission does not duplicate externally visible side effects, and retries reuse the same key. Schedules store execution time in UTC with an explicit, deterministic missed-run policy and bounded catch-up; an unknown schedule fails closed. Durable workflows are versioned and tenant-bound; approval workflows enforce separation of duties so a requester cannot approve their own workflow. Failures use a structured taxonomy with a client-safe redacted message; payloads, secrets, provider credentials, and stack traces never appear in audit, errors, logs, OpenAPI, or proofs. The job and workflow lifecycle is audit-recorded. Capabilities depend only on the USF ports; Temporal and Windmill remain adapter/provider concerns with no live readiness claim.

## Rationale

Recording the execution-control model as rank-2 authority keeps the correctness, tenancy, authorization, retry, idempotency, scheduling, approval, and redaction semantics inside USF rather than scattered across providers and historical code. It realises the ADR 0011 port family with concrete invariants a validator and proof can enforce, preserves the ADR 0010 PDP-owns-authorization posture and the Charter fail-closed and hermetic-honesty rules, and keeps capabilities provider-independent so Temporal/Windmill can be added later without coupling or a live-readiness overclaim.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/adr/0010-authorization-policy-decision-point.md`
- `docs/adr/0011-workflow-and-job-port-family.md`
- `docs/architecture/jobs-and-workflows-standard.md`
- `docs/architecture/parity-jobs-workflows-source-use-disposition-matrix.md`
- `spec/instances/semantic-contract/workflow-engine-scheduled-jobs-approvals.json`
- `spec/instances/semantic-contract/background-workers-job-runner.json`
- `spec/instances/semantic-contract/scheduled-jobs-built-in-on-the-event-substrate.json`

## Source References

- `docs/architecture/capability-source-coverage-matrix.md`
- `docs/architecture/react-l5-equivalence-audit.md`

## Proof References

- `packages/proof/src/jobs-workflows-proof.ts` (hermetic jobs/workflows proof; `make jobs-proof`)

## Validator References

- `tools/validate-spec/validate-spec.py`
- `tools/validate-parity/validate-jobs.py`

## Invariants

- Every job or workflow carries exactly one classification; an unclassified job fails validation.
- A tenant-impacting job runs with exactly one tenant context and never crosses the tenant boundary.
- A system job runs under a concrete service actor, never a global tenant bypass.
- Every privileged job and workflow action is authorized by the USF PDP.
- Retries are bounded with deterministic or explicitly jittered backoff.
- Side-effecting jobs use idempotency so a duplicate submission does not duplicate side effects.
- Dead-lettering preserves value-free evidence.
- Schedules store execution time in UTC with a deterministic missed-run policy and bounded catch-up; an unknown schedule fails closed.
- Durable workflows are versioned and tenant-bound.
- Approval workflows enforce separation of duties; a requester cannot approve their own workflow.
- Failure messages are redacted; payloads, secrets, credentials, and stack traces never leak.
- Cancelled and expired jobs never run.
- Capabilities depend only on the USF workflow/job ports; Temporal and Windmill are adapter concerns with no live claim.

## Permitted Changes

- Implement live Temporal and Windmill (and any external queue/scheduler/worker) composed-test or live adapters under separate authorised directives with their own proof, never downgrading hermetic proof.
- Implement workflow versioning/replay/migration, transactional outbox/inbox, quotas/backpressure, pause/resume/drain, backup/restore/replay, dry-run gates, cron and tenant-local schedules, and the HTTP API surfaces under separate authorised directives.
- Enrich the workflow, job-runner, scheduled-jobs, and event-substrate semantic contracts to reference this decision.
- Add validators and proofs that demonstrate the execution-model invariants.

## Forbidden Drift

- Do not run an unclassified job or workflow.
- Do not let a job read or mutate tenant data outside its tenant context, or treat a system actor as a global bypass.
- Do not authorize a privileged job or workflow action outside the PDP.
- Do not allow an unbounded retry loop or a dead-letter without evidence.
- Do not duplicate side effects on a duplicate submission, or let a cancelled/expired job run.
- Do not let an approval requester approve their own workflow.
- Do not leak a payload, secret, credential, or stack trace into audit, errors, logs, OpenAPI, or proofs.
- Do not make a capability depend directly on Temporal or Windmill, or claim live provider readiness from hermetic proof.
- Do not copy react job/workflow code or mirror its paths.

## Consequences

- The USF jobs/workflows execution model has rank-2 ADR coverage and advances the jobs/workflows portion of USF-133.
- The jobs-and-workflows standard, the parity-jobs-workflows source-use disposition matrix, and the workflow/job-runner/scheduled-jobs semantic contracts reference this ADR as authority.
- Durable workflow and operational job ports, in-memory adapters, the job and workflow services, scheduling, retry/idempotency/dead-letter, approvals, and audit are implemented and proven hermetically; live Temporal/Windmill and the enterprise breadth remain deferred.
- Job and workflow lifecycle, denials, and failures become represented, auditable, value-free concerns.

## AI Alignment Rules

- Agents must classify every job/workflow, keep tenant-impacting work tenant-scoped, and run system jobs under a concrete service actor.
- Agents must authorize every privileged job/workflow action through the PDP and keep retries bounded, side effects idempotent, and dead-letters evidence-bearing.
- Agents must keep schedules UTC and deterministic, enforce approval separation of duties, and redact failures and payloads.
- Agents must not implement live Temporal/Windmill or the deferred enterprise breadth from this ADR alone; separate authorised directives are required.
- Agents must classify job/workflow proof honestly and never relabel hermetic evidence as live.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0013-jobs-and-workflows-execution-model.json`
