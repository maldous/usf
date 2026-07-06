# AI Agent Work Packet and Review Contract

| | |
|---|---|
| **Document type** | Architecture / AI agent work packet and review contract |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Agent process and review guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, repository artefacts, and any later filled implementation directive |
| **Issue scope** | USF-95 |
| **Primary inputs** | `AGENTS.md`, `docs/architecture/git-practices-standard.md`, `docs/architecture/implementation-directive-template.md`, `docs/architecture/post-extraction-closure-checklist.md`, `docs/architecture/proof-and-evidence-pipeline-plan.md`, `tools/validate-spec/validate-spec.py` |

This contract defines the recurring work packet pattern for AI agents working on USF. It is process guidance only. It does not define platform semantics, start USF-39, authorize implementation/runtime code, create implementation directories, replace repository artefacts with Linear process, or weaken the USF authority order.

## Required Repository Inputs

Every work packet must name the repository inputs the agent must read from disk before acting:

- `CODEX.md` or the relevant tool shim;
- `AGENTS.md`;
- `docs/architecture/charter.md`;
- `docs/architecture/authority-model.md`;
- `docs/architecture/standards-profile.md`;
- `docs/architecture/ontology.md`;
- `docs/architecture/directory-and-file-naming-standard.md`;
- `docs/architecture/schema-authoring-standard.md`;
- `docs/architecture/git-practices-standard.md`;
- `spec/taxonomies/taxonomy-catalog.json`;
- `spec/vocabularies/vocabulary-catalog.json`;
- `spec/registries/schema-registry.json`;
- task-specific semantic instances, ADRs, evidence records, source import manifests, source-use matrices, validator files, and architecture gate documents.

The work packet must state whether USF's own source lineage may be inspected and, if so, for which evidence-only purpose. Source lineage must not become hidden authority.

## Required Linear Inputs

Every work packet must name:

- the Linear team;
- the issue key;
- issue title;
- current status;
- explicit scope;
- acceptance criteria;
- dependencies and blockers;
- permitted Linear mutations;
- forbidden Linear mutations;
- whether the issue may be marked Done and under what merge/validation conditions.

Linear remains work tracking only. The packet must not treat Linear text as USF semantic authority.

## Gold Prompt Structure

Future AI work packets should use this structure:

| Section | Required content |
|---|---|
| Goal | One bounded objective, naming the Linear issue and repository outcome. |
| Current known state | Branch, head commit, relevant PRs, issue statuses, and validation baseline. |
| Authority inputs | Repository artefacts and Linear issue text to inspect before modifying anything. |
| Allowed outputs | Exact file classes, directories, evidence records, validator fixtures, or comments allowed. |
| No-go rules | Forbidden implementation, source import, schema activation, proof overclaim, generated-report authority, provider/environment upgrade, or Linear status changes. |
| Required validation | Exact validator/proof commands, JSON parse requirements, and any post-merge reruns. |
| Review contract | What the PR body must state, what reviewers must verify, and what findings block merge. |
| Completion contract | Conditions for merging, post-merge validation, Linear acceptance checklist updates, and closure comments. |
| Human decision points | Questions that must be answered before the agent may continue. |

The Gold prompt must be concrete enough that a later agent can execute without guessing scope or authority. If the task involves implementation/runtime code, the prompt must cite the accepted filled implementation directive and exact allowed target files.

## Agent Reporting Format

The agent must report these facts at completion:

- files read;
- files modified;
- files created;
- files intentionally not modified but relevant;
- JSON parse results for changed JSON, if any;
- validation commands run and result;
- whether USF's own source lineage was inspected;
- whether any runtime/application code was imported;
- whether implementation/runtime code was created;
- whether implementation/runtime directories were created;
- whether schemas were activated;
- whether generated reports were emitted or treated as authority;
- Linear issues updated and exact status changes;
- GitHub PRs opened, merged, or left open;
- assumptions, uncertainties, blockers, deferred work, and readiness verdict.

For Linear comments and descriptions, the agent should use plain text that avoids code-fence-like payloads where possible, while preserving truthful evidence.

## Review Contract

Every PR produced from a work packet must include:

- summary of the repository change;
- issue key and scope;
- authority references;
- explicit non-goals;
- source-use treatment if source evidence influenced the change;
- proof/evidence posture if any proof or evidence claim is made;
- schema posture;
- generated-report posture;
- validation commands and outcomes;
- statement of whether implementation/runtime code or directories were created;
- statement of whether USF-39 was started or remained Backlog.

Reviewers should block merge when any of these are true:

- the PR exceeds the issue scope;
- required foundational artefacts were not inspected;
- changed JSON was not parsed or validated where required;
- validator failures are ignored;
- React source is treated as hidden authority;
- runtime/application code is imported without explicit authorization;
- target paths mirror historical source paths;
- implementation directories appear without an accepted directive;
- proof freshness, provider mode, environment, or proof level is overclaimed;
- generated reports are treated as authority;
- schemas are promoted active without separate authorization;
- Linear Done would not be backed by a merged PR and checked acceptance criteria.

## Completion Contract

An issue may be marked Done only after all of the following are true:

- the backing PR is merged to `main`;
- local `main` is fast-forwarded to the merge commit;
- required post-merge validation is rerun and passes;
- every acceptance-criteria checklist item in Linear is checked truthfully;
- a Linear closure comment records the merge commit, artefact paths, validation results, and no-go confirmations;
- git status is reviewed;
- USF-39 remains Backlog unless a separate explicit implementation directive authorizes movement.

If the backing PR cannot merge, or post-merge validation fails, the issue must not be marked Done. If the issue was already marked Done and the merge does not happen, it must be moved back out of Done.

## Stop Conditions

The agent must stop and request human decision when:

- a required foundational artefact is missing or unparsable;
- the issue scope would require implementation/runtime code but no accepted directive exists;
- the task would create an implementation-shaped directory outside authorized scope;
- a React source file would need to be copied or adapted without recorded source-use treatment;
- a generated report would be needed as authority rather than evidence summary;
- hermetic proof would need to satisfy live-external-provider or production-live readiness;
- production-shaped evidence would need to satisfy production-live readiness;
- a schema would need to be marked active without separate active-promotion authorization;
- Linear Done would be desired without merged PR evidence and checked acceptance criteria.

## USF-61 Citation

USF-61 can cite this contract as follows:

> USF-95 requires future implementation-entry work packets to follow `docs/architecture/ai-agent-work-packet-and-review-contract.md`: the packet must name repository inputs, Linear scope, Gold prompt structure, allowed outputs, no-go rules, validation, review contract, completion evidence, and human decision points. Linear Done requires merged PR evidence, post-merge validation, checked acceptance criteria, and a closure comment.

## Non-Goals

- This contract does not start USF-39.
- This contract does not authorize implementation/runtime code.
- This contract does not create implementation/runtime directories.
- This contract does not import React runtime/application code.
- This contract does not promote schemas.
- This contract does not replace repository authority with Linear process.
- This contract does not treat generated reports as authority.

## Validation Expectations

This document is mergeable only when `python3 tools/validate-spec/validate-spec.py all --json` passes on the PR head. Strict JSON parse is required for any changed JSON. This document changes no JSON.

## Readiness Verdict

READY_WITH_NON_BLOCKING_DEFERRED_WORK for the AI agent work packet and review contract.

NOT_READY_BLOCKING_ISSUES_REMAIN for implementation extraction until USF-61 and USF-75 close and a separate explicit implementation directive authorizes USF-39.
