# 0011 USF Workflow and Job Port Family

## Status

Accepted.

## Description

Records the human-approved decision (tracked as USF-136) that USF defines a USF-owned workflow/job port family rather than choosing a single provider for all workflow-like work: a durable workflow port (in-memory dev adapter, Temporal as the canonical composed-test provider) and an operational job/automation port (in-memory dev adapter, Windmill as the canonical operational-automation provider). Capabilities depend only on USF ports; Temporal and Windmill are adapter/provider concerns. This ADR records authority only; it creates no implementation code, no adapters, no schema activation, and no runtime proof.

## Context

USF's own source lineage uses more than one orchestrator: Temporal for durable workflow orchestration and Windmill for operational automation. During the foundation-completeness readiness pass the question of whether USF carries one provider, both, or an abstracted port was recorded as a `requires-human-decision` item (scope-classification matrix; USF-136), because the Authority Model forbids inferring missing semantics from source lineage.

A human has now decided the workflow/job model. Under the Authority Model a decision of this weight needs rank-2 ADR coverage so it is durable repository authority, not tracker context or planning prose.

## Decision

USF V2 defines a USF-owned workflow/job port family rather than choosing a single provider for all workflow-like work.

Durable domain workflows, approval chains, retryable stateful processes, and audit/evidence-bearing long-running orchestration use the USF durable workflow port. The dev adapter is in-memory. The canonical composed-test provider adapter is Temporal.

Operational automation, scripts, internal tools, maintenance jobs, operator-triggered routines, and integration glue use the USF operational job/automation port. The dev adapter is in-memory. Windmill is the canonical provider for operational automation and may be implemented as a composed-test adapter where the operational-automation domain requires Windmill-like behaviour.

Capabilities must depend only on USF workflow/job ports. Temporal and Windmill remain adapter/provider concerns and no capability may depend directly on either provider.

Every workflow or job in USF's own source lineage must be classified as exactly one of: `durable-domain-workflow`, `operational-automation-job`, `scheduled-maintenance-job`, `human-approval-flow`, `event-triggered-job`, `not-applicable`, or `requires-human-decision`.

## Rationale

Workflow-like work in the historical stack is not homogeneous: durable, evidence-bearing domain orchestration has different correctness and audit needs than operational automation and glue. A single provider for all of it would either over-serve operational jobs or under-serve durable workflows, and would couple capabilities to a provider. A USF-owned port family keeps capabilities provider-independent (the Charter's hexagonal posture, ADR 0005), lets the dev substrate stay in-memory and hermetic, and lets composed-test proof use the real providers (Temporal; Windmill where the domain needs it) without promoting hermetic evidence to live evidence. The mandatory per-item classification ensures no historical workflow or job is silently dropped.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/full-react-parity-readiness-directive.md`
- `docs/architecture/react-parity-scope-classification-matrix.md`
- `spec/instances/semantic-contract/workflow-engine-scheduled-jobs-approvals.json`
- `spec/instances/semantic-contract/background-workers-job-runner.json`
- `spec/instances/semantic-contract/scheduled-jobs-built-in-on-the-event-substrate.json`
- `spec/instances/semantic-contract/event-bus-durable-queues-dlq-redrive.json`

## Source References

- `docs/architecture/capability-source-coverage-matrix.md`
- `docs/architecture/foundation-completeness-audit.md`

## Proof References

- None. This ADR records an authority decision and does not assert runtime proof. Proof is added when the ports and adapters are implemented under a separate authorised implementation directive.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- USF owns a workflow/job port family rather than a single provider for all workflow-like work.
- Durable domain workflows, approval chains, retryable stateful processes, and audit/evidence-bearing long-running orchestration use the USF durable workflow port.
- The durable workflow dev adapter is in-memory and the canonical composed-test durable workflow provider adapter is Temporal.
- Operational automation, scripts, internal tools, maintenance jobs, operator-triggered routines, and integration glue use the USF operational job/automation port.
- The operational job dev adapter is in-memory and Windmill is the canonical operational-automation provider.
- Capabilities depend only on USF workflow/job ports; Temporal and Windmill are adapter/provider concerns and no capability depends directly on either provider.
- Every historical workflow or job is classified as one of durable-domain-workflow, operational-automation-job, scheduled-maintenance-job, human-approval-flow, event-triggered-job, not-applicable, or requires-human-decision.

## Permitted Changes

- Author the USF durable workflow port and operational job/automation port, their in-memory dev adapters, and the Temporal and Windmill composed-test adapters under a separate authorised implementation directive, with semantic contracts, tests, and proof.
- Enrich the workflow, job-runner, scheduled-jobs, and event-substrate semantic contracts to reference this decision and the port-family split.
- Classify each historical workflow or job using the seven values above as the source-use disposition matrix decomposes the jobs/workflows domain.

## Forbidden Drift

- Do not make any capability depend directly on Temporal or Windmill.
- Do not collapse durable workflows and operational jobs into a single provider-coupled mechanism.
- Do not promote hermetic or in-memory workflow proof to a live-provider claim.
- Do not infer workflow or job semantics from USF's own source lineage; implement against USF semantics.
- Do not copy workflow or job code from an external sibling repository or mirror its paths.

## Consequences

- The USF workflow/job model has rank-2 ADR coverage and unblocks the workflow portion of USF-136.
- The workflow, job-runner, and scheduled-jobs semantic contracts reference this ADR as authority.
- The jobs/workflows domain gains a fixed classification vocabulary so no historical workflow or job is silently dropped.
- A future implementation directive may author the two ports and their adapters with their own proof.

## AI Alignment Rules

- Agents must keep capabilities dependent only on USF workflow/job ports and never on Temporal or Windmill directly.
- Agents must preserve the durable-workflow versus operational-job split and the in-memory dev / composed-test provider posture.
- Agents must not implement the ports or adapters from this ADR alone; a separate authorised implementation directive is required.
- Agents must classify every workflow or job in USF's own source lineage using the seven approved values and must not infer workflow semantics from source-lineage code.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0011-workflow-and-job-port-family.json`
