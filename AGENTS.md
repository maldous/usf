# USF Agent Directive

## Status

This file is the canonical repository-level directive for AI coding agents working in this repository.

It applies to Codex, Claude, Cursor, Copilot-style agents, terminal agents, review agents, and any future AI-assisted implementation or audit tool.

Tool-specific files such as `CLAUDE.md`, `CODEX.md`, `.cursorrules`, or local agent manifests MAY exist later, but they MUST NOT redefine USF policy. They SHOULD point back to this file.

This file uses BCP 14 normative language. The words `MUST`, `MUST NOT`, `REQUIRED`, `SHALL`, `SHALL NOT`, `SHOULD`, `SHOULD NOT`, `RECOMMENDED`, `MAY`, and `OPTIONAL` are normative only when written in uppercase.

## Repository Identity

This repository is the clean Universal Service Foundation repository.

Short name: USF.

USF is self-originating and self-defined. It is not a branch, fork, or continuation of any other repository, and it claims no external repository as its lineage or authority.

USF is semantic-first, evidence-backed, internally provable, externally adaptable, AI-safe, semantics-defined (not implementation-defined), and validator-enforced.

## Mandatory Agent Bootstrap

Before performing any non-trivial task, every agent MUST read and acknowledge the foundational artefacts.

The current foundational governance artefacts are classified as follows. These are the complete current baseline; The semantic-foundation artefacts (charter, authority-model, standards-profile, ontology, naming, schema-authoring, and git-practices standards and the three `spec/` catalogues).

**Constitutional layer** (highest; amendable only by a deliberate, recorded constitutional decision):

1. `docs/architecture/charter.md`
2. `docs/architecture/authority-model.md`

**Foundational governance / semantic-definition artefacts:**

3. `docs/architecture/standards-profile.md`
4. `docs/architecture/ontology.md`
5. `spec/taxonomies/taxonomy-catalog.json`
6. `spec/vocabularies/vocabulary-catalog.json`
7. `spec/registries/schema-registry.json`
8. `docs/architecture/directory-and-file-naming-standard.md`
9. `docs/architecture/schema-authoring-standard.md`
10. `docs/architecture/git-practices-standard.md`

**Agent directive files** (process guidance, not semantic authority — see "Directive files vs semantic authority" in Conflict Handling):

11. `AGENTS.md`
12. `CLAUDE.md`
13. `CODEX.md`

**Per-task required reading.** Before a modifying task, in addition to the constitutional layer, an agent MUST read from disk the artefacts relevant to that task:

* schema work → `docs/architecture/schema-authoring-standard.md`;
* path/file creation or naming → `docs/architecture/directory-and-file-naming-standard.md`;
* commit/tag/push work → `docs/architecture/git-practices-standard.md`;
* any modifying JSON task → parse `spec/taxonomies/taxonomy-catalog.json`, `spec/vocabularies/vocabulary-catalog.json`, and `spec/registries/schema-registry.json`;
* Claude specifically → read `CLAUDE.md` first, then this `AGENTS.md`, then the artefacts above.
* Codex specifically → read `CODEX.md` first, then this `AGENTS.md`, then the artefacts above.

**Directive files vs semantic authority.** `AGENTS.md` is an **agent execution directive**: it governs *agent process*. It is **not** a semantic authority and MUST NOT override the Charter or Authority Model. `CLAUDE.md` and `CODEX.md` are a **tool-specific shim** and MUST NOT redefine USF policy.

The required creation and authority sequence is (the original seven, then the three later standards authored after the Schema Registry):

1. Charter
2. Authority Model
3. Standards Profile
4. Ontology / Meta Model
5. Taxonomy Catalogue
6. Vocabulary Catalogue
7. Schema Registry
8. Directory and File Naming Standard
9. Schema Authoring Standard
10. Git Practices Standard

An agent MUST NOT begin schema creation, ADR creation, evidence-envelope work, validator work, source-import mapping, directory standard work, or implementation work until it has read the relevant foundational artefacts.

An agent MUST NOT rely on memory, summary, prior chat context, or assumed repository state when current file contents matter. It MUST inspect the current files from disk.

## Required Bootstrap Acknowledgement

At the start of any task that modifies the repository, the agent MUST state:

```text
USF BOOTSTRAP ACKNOWLEDGEMENT

I have read the current USF agent directive and foundational governance artefacts from disk:
- AGENTS.md
- CLAUDE.md, if applicable to this agent
- CODEX.md, if applicable to this agent
- docs/architecture/charter.md
- docs/architecture/authority-model.md
- docs/architecture/standards-profile.md
- docs/architecture/ontology.md
- docs/architecture/directory-and-file-naming-standard.md
- docs/architecture/schema-authoring-standard.md
- docs/architecture/git-practices-standard.md
- spec/taxonomies/taxonomy-catalog.json
- spec/vocabularies/vocabulary-catalog.json
- spec/registries/schema-registry.json

I understand that validated semantic state in Stardog is the sole USF semantic authority.
I understand the distinct lifecycle roles of model, evidence, proof, contract, realisation, and validation.
I understand that ADRs record rationale, toolchains realise contracts, code is a candidate realisation, reports project outcomes, and tickets track work; none independently establish semantic truth.

I understand that USF is self-defined and claims no external repository as its authority.
I understand that generated reports are lowest authority.
I understand that AGENTS.md, CLAUDE.md and CODEX.md guide agent behaviour but do not override the USF constitutional layer.
I will not create implementation/runtime code unless explicitly instructed by an approved directive.
```

For read-only orientation, substantial read is acceptable. The agent MAY give a shorter acknowledgement, but it MUST still read the relevant artefacts before making claims.

For any modifying task, the agent MUST perform a full disk read and JSON parse as mandatory.

## Semantic Authority and Lifecycle Roles

Validated semantic state in Stardog is the sole USF semantic authority. Stardog's storage technology alone does not establish truth: the state MUST conform to the live model, constraints, evidence admission rules, proof obligations, and contract lifecycle.

The lifecycle roles are distinct:

* **Model** defines semantic truth.
* **Evidence** is an admitted observation or produced fact satisfying an evidence requirement.
* **Proof** deterministically evaluates an exact admitted evidence set against a proof obligation.
* **Contract** defines features and constraints warranted by successful proof.
* **ADR** records historical rationale for a material decision and is never semantic authority.
* **Toolchain** is a selected mechanism for satisfying an active contract.
* **Code** is a candidate realisation.
* **Validation** is execution that produces evidence about a realisation.
* **Report** is a projection of evidence and results.
* **Ticket** is a work-tracking projection.

ADRs, validators, runtime results, source code, reports, reviews, documentation, and tickets MUST NOT independently establish or retrospectively override semantic truth. Passing proof warrants a contract; it does not invent intended behaviour. Source implementation MUST NOT invent semantics.

USF is self-defined; no external repository is USF authority.

## Current Foundational File Set

At this stage, the authored foundational files are expected to be:

```text
AGENTS.md
CLAUDE.md
CODEX.md
docs/architecture/charter.md
docs/architecture/authority-model.md
docs/architecture/standards-profile.md
docs/architecture/ontology.md
docs/architecture/directory-and-file-naming-standard.md
docs/architecture/schema-authoring-standard.md
docs/architecture/git-practices-standard.md
spec/registries/schema-registry.json
spec/taxonomies/taxonomy-catalog.json
spec/vocabularies/vocabulary-catalog.json
```

The directories `docs/`, `spec/`, `evidence/`, and `tools/` may be untracked before the first commit.

`.gitkeep` files are placeholders only. They are not semantic artefacts.

## Linear Work Tracking

Linear is an external operational work-tracking system for USF agent workflows.

Linear is **not** part of the USF semantic definition corpus.

Linear is **not** USF authority.

Linear issues, projects, labels, comments, cycles, milestones, and initiatives MUST NOT override:

1. the Charter
2. the Authority Model
3. the Standards Profile
4. the Ontology / Meta Model
5. the Taxonomy Catalogue
6. the Vocabulary Catalogue
7. the Schema Registry
8. the Directory and File Naming Standard
9. the Schema Authoring Standard
10. the Git Practices Standard
11. accepted ADRs
12. validator results
13. runtime proof evidence
14. Git history and tags

Linear tracks work.
USF artefacts define truth.
Git records change.
Validators prove consistency.

### Canonical Linear Team

The canonical Linear team for USF work tracking is:

```text
https://linear.app/maldous/team/USF
```

Agents MUST use this team when inspecting or, if explicitly authorised, creating or updating USF work items.

Agents MUST NOT create or use another Linear team for USF unless explicitly instructed.

### Linear Credentials

Agents MAY use `LINEAR_API_KEY` only when explicitly instructed to inspect, create, update, or reconcile Linear issues.

Agents MUST NOT print, log, commit, expose, echo, or persist `LINEAR_API_KEY`.

Agents MUST NOT use `LINEAR_WEBHOOK_SECRET` for API writes.

`LINEAR_WEBHOOK_SECRET` is only for verifying inbound Linear webhook payloads if USF later creates webhook handling code.

Agents MUST NOT create webhook handling code unless explicitly instructed.

### No Automatic Linear Backlog Creation

Agents MUST NOT automatically create:

* Linear projects
* Linear issues
* Linear labels
* Linear milestones
* Linear cycles
* Linear initiatives
* Linear issue dependencies

Agents MUST NOT create an initial Linear backlog unless the user explicitly instructs them to do so.

Agents MAY recommend a Linear backlog structure in prose.

Agents MAY inspect Linear and report what exists if explicitly asked.

Agents MAY draft proposed Linear issues in text without creating them.

Agents MUST ask or stop before applying Linear mutations unless the user has clearly authorised Linear writes.

### Permitted Linear Modes

Agents may operate in one of these modes only.

#### Inspect-only mode

Allowed:

* list teams
* list projects
* list relevant issues
* list labels
* list statuses
* list cycles
* identify duplicates
* report gaps

Forbidden:

* creating anything
* updating anything
* deleting anything
* commenting on issues
* changing statuses
* changing dependencies

#### Draft-only mode

Allowed:

* draft proposed projects, issues, labels, dependencies, and comments in text
* produce issue bodies for review
* recommend issue ordering and dependencies

Forbidden:

* creating or updating anything in Linear

#### Apply mode

Allowed only when explicitly authorised.

Allowed:

* create or update projects
* create or update issues
* create or update labels
* add or update dependencies
* comment on issues
* mark issues blocked or done

Required:

* report every mutation
* include issue keys or URLs
* preserve USF authority references
* avoid semantic overclaiming
* avoid duplicate tracking

### Required Linear Preflight

Before making any Linear change, an agent MUST:

1. read this `AGENTS.md`
2. read the relevant tool shim, such as `CLAUDE.md` or `CODEX.md`, if applicable
3. read the current USF foundational governance artefacts from disk
4. parse the three JSON catalogues if the work involves taxonomy, vocabulary, schema registry, schemas, validators, imports, or evidence
5. inspect the canonical Linear USF team
6. inspect existing projects, labels, statuses, cycles, and related issues
7. reuse existing Linear entities where appropriate
8. avoid duplicate projects, labels, and issues
9. print the proposed Linear changes before applying them, unless the user has explicitly authorised direct mutation

### Linear Issue Content Rules

Each Linear issue SHOULD represent one independently reviewable unit of work.

Each Linear issue SHOULD include:

```markdown
## Purpose

## Scope

## Inputs

## Outputs

## Authority References

## Acceptance Criteria

## Validation

## Non-goals

## Dependencies

## Notes
```

Each Linear issue MUST include this statement unless clearly inapplicable:

```text
This issue tracks work only. It does not define USF semantic authority.
```

Each issue MUST reference relevant repository artefacts by path where applicable.

Each issue MUST distinguish:

* work to be done
* authority references
* validation expectations
* non-goals
* dependencies
* deferred work
* blockers

### Linear Labels

Agents SHOULD reuse existing Linear labels.

If label creation is explicitly authorised, use stable semantic labels such as:

```text
usf
foundation
schema
validator
adr
evidence
import
governance
blocked
```

Agents MUST NOT create labels using:

```text
v2
legacy
old
new
temp
transitional
```

### Linear Dependency Rules

Agents MUST model dependencies explicitly when creating or proposing issues.

Agents MUST NOT mark an issue as ready if prerequisite semantic, schema, validator, evidence, or import work is incomplete.

Agents MUST NOT create implementation/runtime work items before semantic authority, schema authority, validator expectations, and import/disposition rules allow them.

### Linear Status Rules

Agents MUST NOT mark a Linear issue complete unless:

* the repository change exists
* the relevant files were modified or created
* JSON parses where applicable
* schema validation runs where applicable
* validators or tests run where applicable
* every acceptance criterion stated in the issue is individually confirmed (see "Acceptance Criteria Confirmation" below)
* Git status was reviewed
* no implementation/runtime code was created unless explicitly authorised
* the issue does not conflict with USF authority

If work is blocked by a USF authority conflict, the issue MUST be marked blocked or equivalent and must describe the conflict.

#### Acceptance Criteria Confirmation

Before an agent marks any Linear issue complete or done, the agent MUST confirm **each** acceptance criterion listed in that issue, not merely assert that the work is finished.

* The agent MUST check off each acceptance-criteria checklist item in the issue (for example, change each `- [ ]` to `- [x]` in the issue description) so the confirmed state is visible on the issue itself.
* For any criterion that cannot be ticked, the agent MUST NOT mark the issue done: it either resolves the gap or records the criterion as unmet, leaves the issue open, and comments with the blocker.
* The confirmation MUST be truthful: a checklist item MUST NOT be ticked unless the corresponding check actually ran and passed (Authority Model §6.9 honest-completion bar). The agent MUST NOT claim a validation that did not run.
* The agent SHOULD record, in the issue comment, the evidence for confirmation (commands run, file path, commit, validation result) so the tick is auditable.
* This rule applies whether the issue is completed immediately or at the end of a batch: an issue moves to done only after its own acceptance criteria are individually confirmed.

### Linear Comments

Agents MAY add Linear comments only when explicitly authorised.

When adding comments, agents SHOULD distinguish:

```text
Observed fact
Inference
Recommendation
Decision required
```

Agents SHOULD comment when:

* a decision is needed
* scope changes
* a dependency is discovered
* an issue is blocked
* validation fails
* validation passes
* a commit, tag, or PR is created
* deferred work is identified

### Linear Request Hygiene (WAF Mitigation)

The Linear MCP endpoint is fronted by a Cloudflare Web Application Firewall that can block a request when the request body looks like code or an attack payload. This was observed in practice: comment and issue/description bodies containing Markdown code fences, backticks, shell- or SQL-looking command strings, or tokens beginning with a dollar sign were rejected with a Cloudflare "Sorry, you have been blocked" page, while the same content sent as plain text succeeded.

To mitigate, when creating or updating Linear comments, issue descriptions, or project descriptions, agents SHOULD:

* prefer plain text; avoid Markdown code fences and backticks in bodies sent to Linear;
* write commands, identifiers, and paths as plain words (for example, describe a parse step as "strict JSON parse" rather than pasting the literal command, and write code identifiers without backticks);
* avoid strings that resemble SQL or shell commands, and avoid bodies that begin a token with a dollar sign;
* keep acceptance-criteria checklist items as plain "- [x]" lines (these are safe and are the preferred confirmation form);
* on a Cloudflare block, retry once with a plain-text, shorter body rather than resending the same payload; if it still fails, treat it as a transient endpoint block, record the pending update, and do not hammer the endpoint.

Agents MUST also distinguish two failure shapes: a Cloudflare WAF block page typically means the write did NOT occur (safe to retry), whereas a generic "connection lost" error MAY have committed the write — verify with a read before retrying so a duplicate is not created.

This is request hygiene for an external endpoint. It does not change USF authority and MUST NOT be used to weaken the truthfulness of Linear content: a plainer wording still has to be accurate.

### Git and Linear Relationship

A Linear issue key MAY be referenced in a commit body or PR description once issue keys exist.

A Linear issue MUST NOT be closed solely because code was written.

A Linear issue MAY be closed only when the corresponding USF artefact, validation, and acceptance criteria are complete.

Git history and repository artefacts remain the auditable record of change.

Linear is only an external execution tracker.

### Linear Stop Conditions

Agents MUST stop before modifying Linear if:

* `LINEAR_API_KEY` is missing
* the canonical USF Linear team cannot be identified
* the requested change would duplicate existing Linear work
* the requested Linear item conflicts with USF authority
* the requested issue would require implementation work before semantic authority exists
* the requested issue would encode forbidden naming
* the requested issue would treat any external repository as USF authority
* the requested issue would treat generated reports as canonical
* issue dependencies are unresolved
* the user has not explicitly authorised Linear mutation

### Linear Reporting Requirements

After any authorised Linear mutation, agents MUST report:

* Linear team used
* project used or created
* issues created
* issues updated
* issue keys or URLs
* dependencies created or updated
* labels used
* blockers found
* assumptions
* any work intentionally not created
* whether any Linear item requires human decision

### Linear Final Rule

Linear MUST remain outside the USF semantic authority model.

Do not use Linear to define platform meaning.

Do not use Linear to override repository artefacts.

Do not use Linear to bypass validators.

Do not use Linear to justify implementation before semantic authority exists.

## External Standards Posture

USF uses external standards carefully and honestly.

Agents MUST NOT claim full compliance with any external standard unless the repository contains concrete artefacts and validators that support that claim.

USF currently uses these standards and practices as follows:

* BCP 14 / RFC 2119 / RFC 8174 style normative language for requirements.
* JSON Schema as the intended future standard for JSON artefact validation.
* OpenAPI-style principles for future HTTP/API contract descriptions.
* AsyncAPI-style principles for future event/message contract descriptions.
* OpenTelemetry-style semantic-convention principles for future observability naming and structure.
* ADR practice for future normative decision records.
* C4-style architecture-view thinking as inspiration, not formal compliance.

Agents MUST preserve this distinction between adopted standards, adapted standards, inspired-by practices, and deferred standards.

## Strict Naming Rules

Agents MUST preserve clean final-state naming.

Forbidden canonical names include:

* `v2`
* `legacy`
* `old`
* `new`
* `temp`
* `transitional`
* redundant local `usf`

These terms MUST NOT be used as canonical future path segments, package names, schema IDs, taxonomy IDs, vocabulary IDs, implementation names, or local value IDs.

Allowed exceptions:

* historical source paths
* quoted source evidence
* source notes
* historical aliases
* explanatory text describing why these terms are forbidden
* the exact annotated Git tag `v2-foundation`, only as the one-off dev-ready foundation baseline authorised by Matthew and governed by `docs/architecture/git-practices-standard.md` §9.6.1
* the exact annotated Git tag `v2-proof`, only as the one-off post-Test public-FQDN proof baseline authorised by USF-265 and governed by `docs/architecture/git-practices-standard.md` §9.6.2
* deliberate global machine-readable artefact IDs using the `usf.` namespace

Global machine-readable IDs MAY use the `usf.` namespace because they may be consumed outside the repository context.

Repository paths MUST NOT contain redundant `usf` path segments.

Expected global IDs include:

```text
usf.taxonomy-catalog
usf.vocabulary-catalog
usf.schema-registry
```

## Self-Defined Source Policy

USF is self-defined. Its semantics, contracts, decisions, validators, and proof evidence are USF's own governed artefacts, and no external repository is a USF source of authority or lineage.

Agents MUST NOT admit source or artefacts unexamined: every USF artefact MUST be justified by a USF semantic definition, a decision, and (where it asserts behaviour) proof evidence.

Agents MUST NOT create implementation/runtime code except under an approved implementation directive, and MUST NOT introduce new behaviour, permissions, routes, states, validation, errors, events, or provider semantics that are not first defined in USF semantics.

Agents MUST NOT infer missing semantics from implementation structure. Where a needed semantic definition is absent, an agent MUST propose the USF semantic definition (with its ADR and validator rule) rather than reconstruct it.

## Post-Baseline Current-State Routing

After the one-off `v2-foundation` baseline, agents SHOULD use
`docs/architecture/current-state-foundation-authority-index.md` and
`docs/architecture/current-state-foundation-authority-index.json` as the current
workflow router for future development and audit work.

This routing index does not override the Charter, Authority Model, accepted ADRs,
validator rules, runtime proof evidence, semantic instances, or this directive.
It identifies the current canonical entry points and classifies historical
source-use, completeness, closure, bootstrap, and generated artefacts as lineage,
transitional scaffolding, or generated projections where appropriate.

Agents MUST NOT use source-use matrices, parity migration
matrices, or closure-tier artefacts as active future authority unless the current
issue explicitly requires lineage review and the higher-authority USF artefacts
permit the use. Such lineage-adjacent artefacts remain retained evidence, not a shortcut for
copying source paths, implementation structure, readiness claims, or product
parity claims.

When a current-state command alias exists, agents SHOULD prefer the current-state
alias in human-facing instructions and keep the historical command name as an
explicit compatibility alias. Until a replacement is separately authorised and
validated, existing command names such as `verify`, `parity`, `proof:bootstrap`,
`validate-bootstrap`, and Sonar assurance targets remain valid compatibility
entry points and MUST NOT be treated as full functional completeness, staging, production,
deployment, live-provider, SOC, ISO certification, enterprise production, or
product UI readiness claims.

The current preferred Make entry points are `make foundation` for the full local
foundation gate, `make setup` for frozen dependency install, `make dev-ready` for
developer and AI-agent handover validation, and `make test-ready` for the
bounded test-readiness command gate once the test-readiness track is in scope.
Use `make validate-coverage` for the coverage validator suite,
`make validate-assurance` for enterprise assurance evidence validation, and
`make validate-evidence` for repository evidence validation. `make test-composed`
runs the composed semantic harness, deterministic fixture lifecycle proof, and
composed service integration matrix, `make test-readiness-integration` runs the
service integration matrix directly, `make test-assurance` runs the bounded
local SonarQube zero-open-issue proof, and `make sonar-zero-issue-proof` remains
the compatibility entry point for that supported synthetic scan scope. These
aliases route to existing compatibility targets and do not upgrade any readiness
claim beyond their merged evidence.

## Provider, Environment, Proof, and Report Safety

Agents MUST preserve these safety rules:

* Provider mode and environment are separate dimensions.
* `hermetic-mock` is valid for internal platform proof.
* Mock IdP is permitted for hermetic validation.
* `hermetic-mock` MUST NOT satisfy `live-external-provider`.
* `production-shaped` MUST NOT satisfy `production-live`.
* Environment MUST NOT upgrade provider mode by implication.
* Provider mode MUST NOT upgrade environment by implication.
* Proof level is not report status.
* Readiness claims MUST NOT exceed observed evidence.
* Generated reports MUST NOT upgrade raw evidence.
* Missing collected evidence MUST fail closed.
* `stale` MUST NOT satisfy `pass`.
* `unknown` MUST NOT satisfy `pass`.
* Backup/restore emitted evidence MUST be collected and preserved where a proof claim depends on it.
* Proof scripts are distinct from generated reports.

## JSON and Machine-Readable Artefact Rules

For JSON files, agents MUST:

* produce strict JSON only
* avoid comments
* avoid trailing commas
* avoid JSON5 syntax
* avoid YAML-like syntax
* preserve stable IDs
* preserve unique IDs within intended scopes
* use controlled vocabulary values where available
* use taxonomy classifications where applicable
* avoid free-text categories where a vocabulary exists
* avoid schema entries that contradict taxonomy or vocabulary
* parse JSON after editing

Agents MUST run JSON parse validation after modifying:

```text
spec/taxonomies/taxonomy-catalog.json
spec/vocabularies/vocabulary-catalog.json
spec/registries/schema-registry.json
```

## Schema Rules

Agents MUST NOT create schema files unless explicitly instructed.

The schema registry currently defines planned schemas. Planned schemas are not active.

A schema MUST NOT be marked `active` unless:

* the schema file exists
* it parses as valid JSON Schema
* it is validator-checkable
* its lifecycle state is intentionally promoted

Future schema files MUST live under:

```text
spec/schemas/
```

Schema filenames SHOULD end with:

```text
.schema.json
```

Agents MUST consult `spec/registries/schema-registry.json` before creating or modifying any schema.

## Taxonomy and Vocabulary Rules

Agents MUST distinguish ontology, taxonomy, vocabulary, schema, registry, and validator responsibilities.

Ontology defines concepts and relationships.

Taxonomy defines classification systems.

Vocabulary defines exact allowed values.

Schema defines artefact shape.

Registry defines catalogue and resolution.

Validator enforces consistency.

Agents MUST NOT collapse these layers.

Agents MUST NOT invent taxonomy categories or vocabulary values without updating the correct artefact and preserving consistency.

Agents MUST NOT treat aliases as canonical values.

Agents MUST NOT treat non-canonical or lineage-adjacent labels as future canonical values unless explicitly justified by the vocabulary catalogue.

## ADR Rules

Agents MUST NOT create ADRs unless explicitly instructed.

Future ADRs MUST be normative decision records, not generic notes.

Future ADRs MUST connect decisions to:

* semantic definitions
* source references
* proof references
* validator references
* invariants
* permitted changes
* forbidden drift
* consequences
* AI alignment rules

Agents MUST consult the foundational artefacts before drafting any ADR.

## Evidence Rules

Agents MUST NOT create evidence envelopes or evidence files unless explicitly instructed.

Future evidence artefacts MUST distinguish:

* raw source evidence
* semantic evidence
* runtime proof evidence
* normalised evidence
* generated reports
* attestations
* import evidence
* validation evidence
* operational evidence
* audit evidence

Generated reports are lower authority than raw evidence and semantic definitions.

Evidence claims MUST include provider mode and environment where relevant.

## Validator Rules

Agents MUST NOT create validators unless explicitly instructed.

Future validators MUST fail closed on ambiguity involving:

* missing evidence
* unresolved source references
* unknown controlled values
* stale reports
* unknown report status
* provider mode mismatch
* environment mismatch
* proof claims exceeding observed evidence
* generated reports without underlying evidence
* source import without disposition

Validators enforce USF semantics but do not invent product meaning.

## Implementation Rules

Agents MUST NOT create implementation/runtime code unless explicitly instructed.

Agents MUST NOT create these directories unless explicitly instructed by a later approved directive:

```text
apps/
packages/
config/
infra/
scripts/
src/
services/
```

Agents MUST NOT create implementation-shaped structure merely because a similar structure exists elsewhere.

Implementation must follow semantic contracts, not source resemblance.

## Required Preflight for Modifying Tasks

Before modifying files, agents MUST run or otherwise perform the equivalent checks:

```bash
git status --short
find . -path './.git' -prune -o -type f -print | sort
```

For JSON work, agents MUST parse relevant JSON files before and after modification.

For semantics-grounded work, agents MUST inspect the relevant USF semantic definitions, decisions, validators, and proof evidence.

For foundational work, agents MUST read the current foundational governance artefacts first (the constitutional layer plus the foundational governance / semantic-definition set listed under "Mandatory Agent Bootstrap").

## Conflict Handling

USF distinguishes **agent execution precedence** (what an agent obeys while carrying out a task) from **USF semantic authority** (what defines and governs the platform). These are different axes and MUST NOT be conflated.

**Agent execution precedence** (process — how an agent decides what to *do*):

1. higher-priority runtime / system / developer instructions
2. explicit user instruction defining the current task scope
3. this `AGENTS.md` (the agent process directive)
4. domain-specific standards within their own domain (naming, schema-authoring, git-practices), only when consistent with higher-authority artefacts

**USF semantic authority** (what the platform *is*): validated semantic state in Stardog, governed by the live model and its evidence, proof, contract, realisation, and validation constraints. ADRs, validators, runtime results, source, reports, reviews, documentation, and tickets have the distinct roles defined above and are not alternative authority levels.

An explicit user instruction defines **task scope**; it does **not** silently override USF constitutional or safety constraints. If a user instruction conflicts with the constitutional layer (Charter, Authority Model) or a non-negotiable safety rule, the agent MUST stop and report the conflict — unless the user explicitly invokes a constitutional amendment process (a deliberate, recorded decision to change the constitutional layer).

The Charter and Authority Model govern USF constitutional semantics. Domain-specific standards govern their own domain only when consistent with higher-authority artefacts. `AGENTS.md` governs agent process and MUST NOT be read as overriding the constitutional layer.

`AGENTS.md`, `CLAUDE.md` and `CODEX.md` MUST NOT be used to authorise — and an agent MUST refuse and report if instructed — to:

* blindly import or copy runtime/application code from any external repository;
* create implementation/runtime code without an approved directive;
* treat generated reports as canonical;
* treat `hermetic-mock` proof as `live-external-provider` proof;
* treat `production-shaped` as `production-live`;
* use forbidden canonical path/name tokens;
* mark a planned schema `active` without an existing, validator-checkable schema file and validator.

If a conflict cannot be resolved safely, the agent MUST stop and report:

* conflicting sources
* exact files and sections involved
* proposed safe options
* why it cannot proceed without human decision

Agents MUST NOT silently choose a policy when the authority conflict is unresolved.

## Output Requirements for Agent Tasks

At the end of any modifying task, the agent MUST report:

* files read
* files modified
* files created
* files not modified but relevant
* JSON parse results, if applicable
* validation commands run, if applicable
* whether implementation/runtime code was imported
* whether new directories were created
* assumptions
* uncertainties
* remaining deferred work
* final readiness verdict

For foundational tasks, the readiness verdict MUST be one of:

```text
READY_FOR_NEXT_FOUNDATIONAL_STEP
READY_WITH_NON_BLOCKING_DEFERRED_WORK
NOT_READY_BLOCKING_ISSUES_REMAIN
NOT_READY_HUMAN_DECISION_REQUIRED
```

## Commit Policy

Agents MUST NOT commit unless explicitly instructed.

Before any commit, agents MUST show:

```bash
git status --short
git diff --stat
```

Agents MUST explain exactly what is being committed and why.

## Non-Negotiable Stop Conditions

Agents MUST stop and ask for human decision if:

* a foundational artefact is missing
* a JSON foundational artefact cannot be parsed
* authority order is contradictory
* taxonomy and vocabulary conflict
* schema registry conflicts with vocabulary or taxonomy
* a task requires implementation code but no implementation directive exists
* a task would require creating files outside the requested scope
* a task would treat generated reports as canonical
* a task would upgrade hermetic proof to live external proof
* a task would treat production-shaped as production-live
* a task would use forbidden canonical names
* a task would silently discard artefact traceability
* a task would mark planned work as active without artefacts and validation

## Final Rule

When in doubt, preserve USF semantic authority, artefact traceability, proof honesty, provider/environment safety, and AI drift control.

Do not guess.

Do not overclaim.

Do not import blindly.

Do not make generated summaries canonical.

Do not weaken the foundation.
