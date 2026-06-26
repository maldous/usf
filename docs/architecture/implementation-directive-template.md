# Human Implementation Directive Template and Acceptance Contract

| | |
|---|---|
| **Document type** | Architecture / human directive template |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and the later filled implementation directive |
| **Issue scope** | USF-71 |
| **Primary inputs** | `docs/architecture/target-implementation-topology-plan.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `docs/architecture/production-proof-posture-matrix.md`, `docs/architecture/schema-validator-posture-decision.md`, `docs/architecture/generated-report-readiness-policy.md`, `tools/validate-spec/validate-spec.py` |

This document defines the human-filled directive template required before USF-39 can leave Backlog. It does not fill the directive, choose an implementation slice, create implementation files, create implementation directories, import runtime code, produce evidence, emit generated reports, or promote schemas.

## Governing Rule

USF-39 may start only after a separate explicit implementation directive is filled, reviewed, and accepted. The filled directive must answer every required field in this template. Missing, ambiguous, contradictory, or overclaiming answers are stop conditions.

The filled directive must be recorded as a reviewed artefact and cited by implementation PRs. This template alone is not that directive and does not authorise any implementation work.

## Filled Directive Header

| Field | Required answer | Acceptance criteria | Invalid examples |
|---|---|---|---|
| Directive identifier | A stable identifier for the filled directive. | Names the issue or artefact that contains the accepted directive and can be cited by PRs. | "Use this chat", "as discussed", or any untracked instruction. |
| Authorising human | The human accountable for the implementation directive. | Names a human reviewer or owner and the date of authorisation. | "AI decided", "implicit approval", or missing owner. |
| Linear record | The Linear issue or comment that records the directive. | References the exact Linear issue or comment and keeps Linear as work tracking only. | Treating Linear text as semantic authority or omitting the record. |
| Repository artefact references | The USF artefacts that govern the directive. | Cites the relevant semantic instances, ADRs, topology plan, source-use matrix, proof posture matrix, schema posture decision, report policy, and validator rules. | Citing a generated report alone or citing historical source as live authority. |
| Scope statement | The exact implementation slice. | Names the bounded slice and its non-goals. For the current first slice, this must stay within the authentication slice unless a later reviewed directive changes scope. | "Implement the platform", "port the old app", or any broad unbounded scope. |

## Required Directive Fields

| Field | Required answer | Acceptance criteria | Invalid examples |
|---|---|---|---|
| Slice | The exact semantic slice to implement. | Names semantic instance IDs and workflows, interfaces, events, audit records, observability signals, commands, provider modes, environments, and configurations in scope. | A source directory list without semantic instances; a product phrase with no spec references. |
| Destination directories | The exact target directories and target files allowed for the slice. | Every directory is listed in `docs/architecture/target-implementation-topology-plan.md` or in a later reviewed topology update. Every target file is named before creation. | `apps/platform-api/`, `apps/web/`, `services/`, `src/`, or any unlisted implementation-shaped root. |
| Source-use policy | The policy for each source row or target file. | Each target file maps to source-derived-adapt, source-derived-rewrite, new-with-rationale, or evidence-only-support. Evidence-only-support cannot produce runtime code. | "Copy the source", "mirror the package", "use all auth files", or using evidence-only rows as runtime code. |
| Source-disposition coverage | The source rows or new-with-rationale basis for every target file. | Every target file cites the source-use matrix row numbers or a reviewed new-with-rationale entry. No file is created solely because a source path exists. | A target file with no source rows, no rationale, or only a historical path as justification. |
| Source import boundary | The direct import policy for runtime code. | States that direct runtime/application code import from `../react` is not authorised unless a later directive explicitly permits a specific file with disposition and proof rationale. | Blind copy, path mirroring, package mirroring, or importing generated reports as code. |
| Proof level | The proof floor required before starting and before merging. | Names the current proof posture row. For first-slice extraction, hermetic internal proof is directive-blocking and must be fresh for the claimed commit; local composed substrate proof is merge-blocking when composed-service behaviour is claimed. | Treating stale historical proof as current, treating a generated report as proof, or omitting proof level. |
| Provider mode | The provider mode for each proof and implementation claim. | Uses controlled provider-mode values and keeps hermetic, local, sandbox, and live external claims separate. | Saying "production provider" without mode; treating hermetic mock as live external provider. |
| Environment | The environment for each proof and readiness claim. | Uses controlled environment values and keeps production-shaped separate from production-live. | Treating production-shaped as production-live, or leaving environment implicit. |
| Production/live requirements | Whether live external provider or production-live proof is in scope. | Explicitly says whether live external provider and production-live claims are out of scope, release-blocking, or required now. For the first implementation merge they are not required unless a later directive raises the bar. | "Production ready" without evidence, "live enough", or any implicit upgrade from sandbox or production-shaped evidence. |
| Schema posture | Whether schemas or validator maturity change. | States that all schemas remain draft and the validator remains advisory unless a separate promotion PR satisfying USF-30 is merged. | Marking schemas active, claiming active validator maturity, or requiring promotion without the promotion change. |
| Generated reports | Whether reports may be cited. | Reports may be used only as rank-7 summaries with freshness and evidence references. Direct validators and proof records still govern. | A report pass used as authority, proof, schema promotion, or implementation authorisation. |
| Validation commands | The exact commands required before PR and after merge. | Includes the repository validator, implementation guard, PR diff gate, evidence/proof modes where applicable, and any slice-specific proof command authorised by the directive. | "Run tests", "CI green", or relying only on a generated summary. |
| Implementation boundaries | What may and may not be created. | Names exact directories and file classes allowed; states that unlisted roots are blocked and no runtime code can be imported without disposition. | Open-ended permission for apps, packages, services, infra, scripts, or source roots. |
| Non-goals | Explicit exclusions. | Lists out-of-scope behaviours, providers, environments, schemas, generated reports, migrations, UI, services, and proof claims. | Omitting non-goals or using "later" without a stop condition. |
| Review and merge conditions | Conditions that must hold before an implementation PR merges. | Requires clean validators, fresh proof where claimed, source disposition coverage, no generated-report authority upgrade, and no live/production overclaim. | "Merge if CI passes" without authority and evidence checks. |

## Mandatory Stop Conditions

USF-39 must remain Backlog, or an implementation PR must stop, when any of these is true:

- The directive does not name the implementation slice.
- The directive does not name every destination directory and target file.
- A destination directory is outside the authorised topology.
- A target path mirrors a historical source path.
- A target file has no source-use matrix row or new-with-rationale treatment.
- A source-use row marked evidence-only is used as runtime code.
- Runtime/application code is copied from `../react` without a specific later source-import directive.
- Provider mode is missing, ambiguous, or upgraded by environment.
- Environment is missing, ambiguous, or upgraded by provider mode.
- Hermetic proof is treated as live-external-provider proof.
- Production-shaped evidence is treated as production-live evidence.
- Proof level claimed exceeds proof level observed.
- Current proof freshness is missing where the claim depends on current proof.
- A generated report is used as semantic authority, proof evidence, source disposition, or implementation authorisation.
- The directive marks any schema active or treats advisory validation as active validator maturity without a separate USF-30 promotion PR.
- Required validators or proof commands are not run, fail, or produce stale evidence.
- The directive conflicts with the Charter, Authority Model, accepted ADRs, semantic instances, source-use matrix, topology plan, proof posture matrix, schema posture decision, generated-report policy, or validator findings.

## Required PR Citation

Every future implementation PR under USF-39 must cite:

- the accepted filled implementation directive;
- the target semantic instances it implements;
- the target files authorised by the directive;
- the source-use matrix rows or new-with-rationale entries for each target file;
- the proof/evidence records used for the claim;
- the validator commands run on the PR head;
- any generated reports, only as rank-7 summaries.

The PR body must explicitly state that source-path mirroring, direct runtime code copy, schema activation, generated-report authority, hermetic-as-live proof, and production-shaped-as-production-live claims are not authorised.

## USF-61 Output Contract

USF-61 may use this template as its output contract by requiring the future implementation directive to:

- complete every field in this template;
- reject every invalid-example class listed here;
- preserve every stop condition;
- name the exact target files and allowed directories;
- cite the governing semantic instances, ADRs, evidence records, import manifests, source-use matrix rows, topology plan, and validator rules;
- keep USF-39 in Backlog until the filled directive is accepted.

## Non-Goals

- This template does not fill the directive.
- This template does not choose or start USF-39.
- This template does not create implementation/runtime files.
- This template does not create implementation/runtime directories.
- This template does not import runtime/application code.
- This template does not authorise direct copying from `../react`.
- This template does not produce proof evidence.
- This template does not emit or commit generated reports.
- This template does not promote schemas or validators to active maturity.

## Readiness

This template satisfies the USF-71 planning boundary when committed with passing repository validation. It gives USF-61 a concrete output contract, but it does not unblock USF-39 by itself. USF-39 remains gated by USF-61, final readiness validation, current proof/evidence posture, validator guards, source-use reconciliation, and a separate explicit human implementation directive.
