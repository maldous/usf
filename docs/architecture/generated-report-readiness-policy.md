# Generated Report and Readiness Artefact Policy

| | |
|---|---|
| **Document type** | Architecture / generated-report and readiness artefact policy |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, and runtime proof evidence |
| **Issue scope** | USF-68 |
| **Primary inputs** | `docs/architecture/authority-model.md`, `docs/architecture/directory-and-file-naming-standard.md`, `docs/architecture/proof-and-evidence-pipeline-plan.md`, `spec/schemas/validator-report.schema.json`, `spec/registries/schema-registry.json` |

This policy records how generated reports and readiness artefacts may be used around the future USF-39 implementation extraction directive. It creates no report, emits no evidence, changes no validator rule, changes no schema lifecycle, and authorises no implementation/runtime code.

## Decision

USF-39 implementation-extraction PRs may use generated reports only as derived, evidence-backed summaries. A generated report is authority rank 7 and never becomes semantic authority, proof evidence, source-import disposition, an ADR, or a validator rule.

The only report types permitted for the first implementation-extraction gate are:

- validator reports emitted by `tools/validate-spec/validate-spec.py --report` when explicitly requested;
- readiness summary reports produced by a later authorised readiness command;
- source-import or disposition summary reports produced by a later authorised import/disposition command;
- evidence summary reports produced by a later authorised evidence validation command.

Any other generated report type requires an explicit reviewed policy or directive before it can be committed or cited as a gate.

## Authority Limits

Generated reports must follow these limits:

- a report informs review, but it decides nothing authoritative by itself;
- a pass report does not define behaviour, prove behaviour, promote schemas, or authorise implementation;
- report status must not upgrade proof level, provider mode, environment, source disposition, schema lifecycle, or readiness state;
- generated reports must not introduce canonical taxonomy categories, vocabulary values, schema IDs, semantic instance IDs, source dispositions, implementation paths, or naming rules;
- generated reports must not override source evidence, runtime proof evidence, ADRs, semantic instances, import manifests, disposition matrices, validator findings, or the Authority Model;
- a stale, unknown, partial, unverifiable, or evidence-empty report is void for readiness.

## Required Report Home and Naming

When a generated report is committed, it must live under `evidence/` or under a later approved generated-report subdirectory beneath `evidence/`.

Generated reports must not live under `spec/` or `docs/`.

Report filenames must describe the subject and report kind. A filename should include a `-report` marker and must not include status claims such as pass, green, complete, ready, final, stale, or unknown. Status and freshness belong in report content.

No new evidence subdirectory is approved by this policy. A later evidence or report directive must approve any subdirectory such as `evidence/reports/` before creating it.

## Required Report Content

Every committed generated report must be machine-readable JSON unless a later directive explicitly authorises a paired human-readable rendering. The JSON report is the governed artefact; any prose rendering is convenience only.

Every generated report must include:

- stable report identity;
- authority level `generated-report`;
- report status from `report-statuses`;
- freshness with the commit being summarised and a stale flag;
- evidence references for the evidence being summarised;
- finding records when status is fail or partial;
- ontology, taxonomy, and vocabulary grounding where the governing schema requires it;
- AI guidance stating that the report is lowest authority and cannot be treated as canonical.

Validator reports must conform to `spec/schemas/validator-report.schema.json` while that schema remains draft. A pass validator report must be fresh, non-stale, evidence-backed, and free of blocking or error findings.

## Discovery Requirements

USF-60 must implement or preserve validator discovery for generated reports before implementation extraction can rely on report gates.

The report discovery path must:

- find committed generated reports under the approved `evidence/` report homes;
- reject generated reports under `spec/` or `docs/`;
- reject report filenames that encode status claims;
- distinguish generated reports from proof evidence, validation evidence, source evidence, and raw evidence;
- treat unrecognised report homes as findings, not as silent success;
- include stable rule IDs for every report-discovery finding.

## Validation Requirements

USF-60 must implement or preserve report validation rules that fail closed on:

- invalid validator-report schema shape;
- report authority level other than `generated-report`;
- missing freshness;
- stale freshness where the report is used for current readiness;
- missing evidence references;
- pass status with blocking or error findings;
- fail or partial status without findings;
- unknown, stale, not-run, or advisory status being treated as pass;
- report evidence references that do not resolve;
- provider-mode or environment overclaim in report text or referenced evidence;
- production-shaped evidence being treated as production-live;
- hermetic-mock evidence being treated as live-external-provider evidence;
- report status being used as a proof level or schema lifecycle state;
- report status being used to hide missing, stale, or incomplete evidence.

These rules may remain advisory while the validator remains advisory under USF-67, but their findings must still be visible in PR validation and must not be ignored by USF-61.

## Readiness Use

For a future implementation PR, a generated report may support readiness review only when all of the following are true:

- the report was produced from the current commit or from the exact commit being reviewed;
- the report references the underlying evidence or validation records it summarises;
- the report itself validates against its governing schema and report rules;
- the underlying evidence remains fresh enough for the claim being made;
- any proof, provider, environment, schema, source-import, and disposition claims are independently supported by higher-authority artefacts;
- the PR also runs the required validators directly, not only by citing an older report.

USF-39 must not merge because a generated readiness report says pass. It may merge only if the governing semantics, ADRs, validators, proof/evidence gates, source dispositions, implementation guardrails, and human directive all permit the change.

## Stale, Missing, or Incomplete Evidence

Reports cannot hide evidence gaps.

If evidence is missing, the report must expose that as a finding or non-pass status. If a proof was not run, the report must not imply proof success. If a collected evidence record is absent, the report must fail closed for any claim that depends on that record. If the report references stale evidence, its pass status is void for current readiness.

Re-running a report generator without re-running or re-collecting required proof evidence does not refresh the proof claim. Freshness must be checked at the evidence level and at the report level.

## USF-60 Implementation Hook

USF-60 can implement this policy as validator rules without adding implementation/runtime code.

The minimum USF-60 rule families are:

- report home and naming validation;
- validator-report schema validation;
- report freshness validation;
- report evidence-reference resolution;
- report status and finding consistency;
- report authority-rank validation;
- provider/environment/proof overclaim detection in report-backed readiness claims;
- generated-report placement rejection under `spec/` and `docs/`;
- planted defects for stale pass, pass without evidence refs, pass with blocking finding, report under `spec/`, status-bearing report filename, and unresolved evidence reference.

## USF-61 Citation Requirement

USF-61 can cite this policy as follows:

> USF-68 records that generated reports are rank-7 convenience summaries only. USF-39 may use validator and readiness reports only when they are committed under the approved evidence home, validate against the report rules, are fresh for the reviewed commit, and reference the underlying evidence. Reports cannot define semantics, promote schemas, satisfy proof, hide stale or missing evidence, or authorise implementation by themselves.

## Non-Goals

- No generated report is created.
- No evidence record is created.
- No report subdirectory is created.
- No validator rule is changed.
- No schema lifecycle is changed.
- No ADR is created.
- No implementation/runtime code is created or imported.

## Readiness

This policy closes the USF-68 report/readiness artefact policy boundary only. It does not unblock USF-39 by itself. USF-39 remains gated by current proof evidence, implementation guardrails, schema and validator posture, USF-61 directive acceptance, final readiness validation, and a separate explicit implementation directive.
