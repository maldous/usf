# Post-Extraction Coupled Artefact Closure Checklist

| | |
|---|---|
| **Document type** | Architecture / post-extraction closure checklist |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and the future filled implementation directive |
| **Issue scope** | USF-72 |
| **Primary inputs** | `docs/architecture/implementation-directive-template.md`, `docs/architecture/proof-and-evidence-pipeline-plan.md`, `docs/architecture/production-proof-posture-matrix.md`, `docs/architecture/schema-validator-posture-decision.md`, `docs/architecture/generated-report-readiness-policy.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `tools/validate-spec/validate-spec.py` |

This document defines the closure checks required after any future implementation extraction slice. It creates no implementation code, implementation directory, proof evidence, generated report, schema promotion, or source import.

## Closure Rule

Implementation is not completion. A future implementation PR may be merged only when the implementation files, semantic instances, ADRs, validator rules, source dispositions, proof/evidence records, and generated reports remain aligned for the claim being made.

Unsupported completion language is forbidden. A PR, Linear issue, report, or review comment must not claim complete, ready, final, proven, production ready, live ready, or equivalent status unless the claim is backed by the required semantic authority, validator evidence, and fresh proof evidence.

## Required Closure Checklist

Every future implementation PR under USF-39 must complete this checklist in its PR body or in a linked closure record.

| Area | Required closure evidence | Blocking failure |
|---|---|---|
| Filled directive | The PR cites the accepted filled implementation directive and stays within its named slice, target files, directories, proof posture, provider mode, environment, schema posture, source-use policy, and non-goals. | The PR changes files or claims readiness outside the directive. |
| Implementation files | Every created implementation file is named by the directive and lives under an authorised destination directory. | A file appears outside the directive or outside the target topology. |
| Semantic instances | Every behaviour, route, event, audit action, provider mode, environment, configuration, workflow, UI semantic, or data/migration claim in source is already represented by a semantic instance or is added in the same PR under the coupled-change rule. | Source introduces behaviour absent from semantics. |
| ADR alignment | Accepted ADRs permit the implementation shape and no ADR is contradicted. Any decision reversal is handled by a new or superseding ADR in the same coupled change. | Source conflicts with ADRs or relies on an unrecorded decision. |
| Source-use treatment | Every target file maps to source-derived-adapt, source-derived-rewrite, new-with-rationale, or evidence-only-support. The source-use matrix row numbers or new-with-rationale entries are cited. | A target file lacks treatment, mirrors a source path, or uses evidence-only rows as runtime code. |
| Source import boundary | Direct runtime/application source import from USF's own source lineage is absent unless a later explicit directive authorises a specific file with disposition and proof rationale. | Runtime code is copied blindly or source paths dictate target structure. |
| Validator rules | The PR runs the required validator modes, including repository-wide validation, implementation guard validation, PR diff validation, and any later slice-specific validator. Findings are resolved or explicitly block merge. | Validators fail, are not run, or findings are ignored. |
| Proof evidence | Claims above planning level have fresh proof records for the reviewed commit, with provider mode, environment, observed proof level, emitted evidence, collected evidence, and failure semantics. | Proof is stale, missing, overclaimed, or unsupported by collected evidence. |
| Provider and environment | Provider mode and environment are recorded separately and match the proof/evidence records. | Hermetic proof is used as live-external-provider proof, or production-shaped is used as production-live. |
| Generated reports | Reports are cited only as rank-6 summaries and reference the underlying evidence. Validators and proof records remain the evidence source. | A report pass is treated as semantic authority, proof, schema promotion, or implementation authorisation. |
| Schema posture | Schema lifecycle and validator maturity remain as directed. Active promotion occurs only in a separate authorised promotion PR satisfying USF-30. | A schema is marked active or advisory validation is described as active maturity without authorisation. |
| Follow-up gaps | Any deferred gap is recorded as a follow-up issue with scope, blocker, owner, and why it does not invalidate the current slice. | A gap affects the current slice claim but is deferred as non-blocking. |

## Coupled Artefact Treatment Per File

Every created implementation file must have a closure row with these fields:

| Field | Required value |
|---|---|
| Target file | Exact repository path. |
| Directive line | The filled directive entry that authorised the file. |
| Destination directory | The authorised topology directory. |
| Semantic refs | Semantic instance IDs or paths the file implements. |
| ADR refs | ADRs governing the file or confirming no ADR change is needed. |
| Source-use treatment | One of source-derived-adapt, source-derived-rewrite, new-with-rationale, or evidence-only-support. |
| Source rows | Source-use matrix row numbers or explicit no-source rationale. |
| Runtime import statement | Confirms no direct runtime/application code copy, or cites a later explicit import directive. |
| Validator evidence | Validator modes and commit on which they passed. |
| Proof evidence | Proof/evidence records required for the claim, or a statement that no proof claim is made by that file. |
| Report evidence | Generated reports cited only as summaries, if any. |
| Deferred work | Follow-up issue, blocker, and why it does not weaken the current claim. |

An implementation PR is incomplete if any target file lacks this treatment.

## Required Reruns After Extraction

After any implementation extraction PR is assembled, the author must run the current required gates and any later directive-specific gates:

- repository-wide validator;
- implementation artefact validator mode;
- PR diff validator against the correct base;
- semantic instance validation;
- source import and source-use validation;
- evidence and proof validation when evidence is created or cited;
- real-instance validation;
- selftest for validator rule changes;
- any fresh proof command named by the filled directive;
- generated-report validation if any report is emitted or committed.

The PR must state the exact commands or gate names run, the commit they ran against, and whether each passed. A command not run must not be claimed.

## Honest Completion Language

Allowed language:

- "implemented the authorised slice files listed in the directive";
- "validators passed on commit X";
- "proof record Y observed proof level Z on provider mode A and environment B";
- "generated report R summarises evidence E and remains rank 6";
- "follow-up issue N records work outside this slice".

Forbidden language unless fully evidenced:

- "complete" when any coupled artefact is missing;
- "ready" when proof/evidence freshness is absent or stale;
- "proven" when proof level observed does not support the claim;
- "production ready" without production-live evidence and release gate authority;
- "live provider ready" without live-external-provider evidence at the required proof floor;
- "schema active" without a separate active-promotion PR;
- "CI proves readiness" when CI only ran advisory validation.

## Follow-Up Gap Rules

Follow-up work may be created only when it is outside the current implementation claim. A follow-up does not excuse drift in the slice being merged.

A follow-up gap must record:

- the affected semantic instance, source row, proof record, validator rule, or implementation path;
- the reason it is outside the current slice;
- the authority reference that allows deferral;
- the risk if deferred;
- the validation or proof required to close it;
- the issue that tracks it.

If the gap affects behaviour, proof, provider mode, environment, source disposition, schema posture, or generated-report authority for the current slice, the PR must not merge until the gap is closed or the directive is narrowed.

## USF-61 Citation Requirement

USF-61 can cite this checklist as follows:

> USF-72 requires every future USF-39 implementation PR to complete `docs/architecture/post-extraction-closure-checklist.md`. Implementation alone is not completion: every created file must have semantic, ADR, source-use, validator, proof/evidence, report, and follow-up treatment as applicable, and unsupported complete/ready/final claims remain forbidden.

## Non-Goals

- No implementation extraction is run.
- No implementation/runtime code is created.
- No implementation/runtime directory is created.
- No proof evidence is produced.
- No generated report is emitted or committed.
- No schema is promoted active.
- No Linear follow-up issue is created by this document.

## Readiness

This checklist satisfies the USF-72 planning boundary when committed with passing repository validation. It gives USF-61 a closure contract for future implementation PRs, but it does not unblock USF-39 by itself. USF-39 remains gated by USF-61, final readiness validation, current proof/evidence posture, validator guards, source-use reconciliation, and a separate explicit human implementation directive.
