# USF Dev Readiness Cleanup Orchestration

Document type: Architecture / cleanup orchestration and coordinator evidence pack.
Status: Draft / cleanup-to-implementation readiness pass.
Date: 2026-06-30.

Linear tracks this work only. It does not define USF semantic authority. This pass does not
authorise runtime, source, provider, schema, validator, or semantic behaviour implementation.

## Decision Summary

The recorded USF-133 decision is that open decision-titled issues remain open. A recorded human
decision is not completion evidence. Affected issues must be re-scoped into executable
implementation, proof, validator, documentation, and evidence work before any implementation lane
starts.

Cleanup runs in two passes:

1. PR107 service-disposition issues.
2. Deferred enterprise-depth issues.

Implementation must not start until the coordinator evidence pack confirms that lane cleanup is
complete, source issues are executable, child issues are linked where needed, acceptance criteria
are evidence-based, validation is honest, boundaries are preserved, lane prompts are ready, and the
repository-level enterprise evidence model is updated for the lane.

`spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` is the shared
enterprise evidence model for all lanes. `tools/validate-enterprise/validate-enterprise.py` enforces
SoA-support mapping, evidence register rows, threat/abuse posture, SDK dependency governance,
observability evidence standards, access review posture, resilience posture, incident and
vulnerability evidence, privacy/data minimisation, done-state governance, and explicit non-claims.
This model is evidence organisation only and does not claim certification or readiness.

## Lane Map

| Lane | Scope | Source issues |
| --- | --- | --- |
| Dashboard | Cleanup lanes, implementation prompts, and final proof gate | USF-184 |
| Lane 1 | Service disposition and closure validators | USF-185 covering USF-166, USF-167, USF-182 |
| Lane 2 | Operator access and gateway | USF-186 covering USF-169, USF-180 |
| Lane 3 | Shared assurance control planes | USF-187 covering USF-170, USF-171 |
| Lane 4 | Observability operations | USF-188 covering USF-179, USF-159 |
| Lane 5 | Runtime provider semantic proof | USF-189 covering USF-172, USF-173, USF-174, USF-175, USF-176, USF-177, USF-178 |
| Lane 6 | Enterprise safety controls | USF-190 covering USF-139, USF-141, USF-143, USF-145, USF-147 |
| Lane 7 | Domain deferred depth | USF-191 covering USF-151, USF-153, USF-155, USF-157, USF-161, USF-163 |
| Coordinator | Final evidence pack, issue consistency, dependency graph, and lane implementation prompts | USF-192 plus dashboard and all lane issues |

## Issue Cleanup Template

Every cleaned source issue must include:

- Purpose: what implementation, proof, validator, documentation, or evidence work remains.
- Recorded human decision: the already recorded decision, stated as accepted context rather than
  unresolved debate.
- Required work: concrete implementation, proof, validator, documentation, matrix, or evidence
  tasks that must land before the issue can close.
- Validation requirements: expected commands, validators, proof targets, and matrix checks.
- Professional and enterprise evidence posture: asset or provider traceability, owner, control
  owner, risk owner, data classification, tenant boundary, access boundary, secret or credential
  boundary, audit evidence, retention, deletion, cleanup, incident evidence, supplier or
  subprocessor boundary, and Statement of Applicability support fields where relevant.
- Non-claims: no production readiness, staging readiness, live-provider readiness unless later
  proven, ISO or SOC certification readiness, full dev readiness, or USF-133 closure by itself.
- Acceptance criteria: checklist items tied to merged artefacts, proof output, validators, and
  matrix updates. A recorded decision alone must not satisfy closure.

## Child Issue Creation Rule

Create new child or follow-up issues only when one of these conditions is true:

- An existing issue mixes unrelated domains.
- A deferred item needs its own implementation, proof, validator, or evidence owner.
- A service or provider requires a separate proof path.
- Professional or enterprise assurance coverage is missing.
- Validator or planted-defect work is missing and should be tracked separately.

Any new issue must link back to USF-133 and the relevant source issue, state why it was created,
include non-claims, include evidence-based acceptance criteria, and remain open.

## Coordinator Approval Gate

The coordinator evidence pack must confirm:

- Dashboard issue reference.
- Lane issue references.
- Source issues touched.
- New child issues created, if any.
- Issues intentionally left unchanged and rationale.
- Unresolved human decisions found, if any.
- Validation commands run and honest results.
- Cleanup PR link and merge commit when available.
- Remaining implementation prompts per lane.
- Explicit non-claims.
- Statement that implementation must not start until coordinator approval is recorded.

## Parallel Lane Readiness

Lane 1 creates the shared service-disposition closure and enterprise evidence gate. Future lanes
may run in parallel only after explicit coordinator approval for those lanes. Each approved lane
must own its evidence rows and must not mark another lane complete. Cross-lane dependencies must be
linked explicitly through Linear and evidence references rather than implied by shared validation.

Shared files that future lanes may need to touch include
`spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json`,
`spec/schemas/enterprise-evidence.schema.json`, `tools/validate-enterprise/validate-enterprise.py`,
`tools/validate-parity/validate-parity.py`, `package.json`, `Makefile`, and the architecture/gap
register docs. These files are expected merge-conflict hotspots; future changes must preserve
existing Lane 1 checks, planted defects, done-state governance, and non-claims.

## Validation Plan

The cleanup pass should run the available repository validation ladder that is safe for docs and
Linear cleanup:

- corepack pnpm install --frozen-lockfile.
- corepack pnpm verify.
- python3 tools/validate-spec/validate-spec.py all --json.
- python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json.
- python3 tools/validate-bootstrap/validate-bootstrap.py all --json.
- python3 tools/validate-parity/validate-parity.py all --json.
- git diff --check.

If a command is unavailable or fails, record that result without claiming it passed.

## Non-Claim Language

This cleanup pass does not claim full dev readiness, staging readiness, production readiness,
deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification,
enterprise production readiness, test readiness, or full React parity. It does not close USF-133.
It does not mutate USF-39.

## Implementation Prompt Skeletons

Lane prompts must be issued only after coordinator approval. Each lane prompt must include:

- Lane issue and source issues.
- Authority references and accepted boundaries.
- Required artefact updates.
- Required proof and validator changes.
- Required planted defects where validators change.
- Professional and enterprise evidence posture.
- Enterprise evidence model updates for affected services, adapters, proofs, validators, deferred
  boundaries, and lane posture.
- Prohibited claims.
- Validation commands.
- Handoff requirements back to the coordinator.

## Coordinator Evidence Pack Snapshot

Initial cleanup branch: codex/usf-dev-readiness-cleanup-orchestration.
Dashboard issue: USF-184.
Lane issues: USF-185, USF-186, USF-187, USF-188, USF-189, USF-190, USF-191, and USF-192.
Initial source issues: USF-139, USF-141, USF-143, USF-145, USF-147, USF-151, USF-153, USF-155,
USF-157, USF-159, USF-161, USF-163, USF-166, USF-167, USF-169, USF-170, USF-171, USF-172,
USF-173, USF-174, USF-175, USF-176, USF-177, USF-178, USF-179, USF-180, and USF-182.
Additional child issues created beyond the requested dashboard and lane trackers: none.

No source or provider implementation is included in this cleanup document.
