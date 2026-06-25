# USF Agent Directive

## Status

This file is the canonical repository-level directive for AI coding agents working in this repository.

It applies to Codex, Claude, Cursor, Copilot-style agents, terminal agents, review agents, and any future AI-assisted implementation or audit tool.

Tool-specific files such as `CLAUDE.md`, `CODEX.md`, `.cursorrules`, or local agent manifests MAY exist later, but they MUST NOT redefine USF policy. They SHOULD point back to this file.

This file uses BCP 14 normative language. The words `MUST`, `MUST NOT`, `REQUIRED`, `SHALL`, `SHALL NOT`, `SHOULD`, `SHOULD NOT`, `RECOMMENDED`, `MAY`, and `OPTIONAL` are normative only when written in uppercase.

## Repository Identity

This repository is the clean Universal Service Foundation repository.

Short name: USF.

This repository is not a branch of `../react`.

The sibling repository `../react` is historical semantic/source evidence and lineage. It is not the future live authority.

USF is semantic-first, evidence-backed, internally provable, externally adaptable, AI-safe, source-aware but not source-subordinate, and validator-enforced.

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

I understand the USF authority order:
1. USF semantic definitions
2. USF ADRs
3. USF validator rules
4. Runtime proof evidence
5. USF source implementation
6. Historical ../react source and semantic evidence
7. Generated reports

I understand that ../react is historical semantic/source evidence, not future live authority.
I understand that generated reports are lowest authority.
I understand that AGENTS.md, CLAUDE.md and CODEX.md guide agent behaviour but do not override the USF constitutional layer.
I will not create implementation/runtime code unless explicitly instructed by an approved directive.
```

For read-only orientation, substantial read is acceptable. The agent MAY give a shorter acknowledgement, but it MUST still read the relevant artefacts before making claims.

For any modifying task, the agent MUST perform a full disk read and JSON parse as mandatory.

## Authority Order

Agents MUST apply this authority order:

1. USF semantic definitions
2. USF ADRs
3. USF validator rules
4. Runtime proof evidence
5. USF source implementation
6. Historical `../react` source and semantic evidence
7. Generated reports

A lower-authority artefact MUST NOT override a higher-authority artefact.

Generated reports MUST NOT be treated as canonical.

Passing proof MUST NOT define intended behaviour by itself.

Source implementation MUST NOT invent new semantics unless the semantic definitions, ADRs, validators, and proof expectations are updated where applicable.

Historical `../react` behaviour MUST be treated as evidence and lineage, not future live authority.

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
* deliberate global machine-readable artefact IDs using the `usf.` namespace

Global machine-readable IDs MAY use the `usf.` namespace because they may be consumed outside the repository context.

Repository paths MUST NOT contain redundant `usf` path segments.

Expected global IDs include:

```text
usf.taxonomy-catalog
usf.vocabulary-catalog
usf.schema-registry
```

## Source Repository Policy

The sibling repository `../react` is historical semantic/source evidence.

Agents MAY inspect `../react` to understand:

* source files
* semantic artefacts
* proof evidence
* runtime proof scripts
* Make targets
* package scripts
* env/config files
* compose services
* package structure
* tests
* e2e journeys
* generated reports
* readiness gates
* operational semantics
* event semantics
* cross-capability interactions
* UI semantics
* environment semantics
* data/migration semantics
* observability/audit semantics
* validation tooling

Agents MUST NOT blindly copy from `../react`.

Agents MUST NOT import runtime/application code from `../react` unless explicitly instructed by a later source-import directive.

Agents MUST preserve source lineage when deriving USF artefacts from `../react`.

No source element from `../react` should disappear without later disposition.

Source paths from `../react` MUST NOT dictate future USF paths.

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

Agents MUST NOT treat historical `../react` labels as future canonical values unless explicitly justified by the vocabulary catalogue.

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

Agents MUST NOT create implementation-shaped structure merely because similar structure exists in `../react`.

Implementation must follow semantic contracts, not source resemblance.

## Required Preflight for Modifying Tasks

Before modifying files, agents MUST run or otherwise perform the equivalent checks:

```bash
git status --short
find . -path './.git' -prune -o -type f -print | sort
```

For JSON work, agents MUST parse relevant JSON files before and after modification.

For source-grounded work, agents MUST inspect relevant parts of `../react`.

For foundational work, agents MUST read the current foundational governance artefacts first (the constitutional layer plus the foundational governance / semantic-definition set listed under "Mandatory Agent Bootstrap").

## Conflict Handling

USF distinguishes **agent execution precedence** (what an agent obeys while carrying out a task) from **USF semantic authority** (what defines and governs the platform). These are different axes and MUST NOT be conflated.

**Agent execution precedence** (process — how an agent decides what to *do*):

1. higher-priority runtime / system / developer instructions
2. explicit user instruction defining the current task scope
3. this `AGENTS.md` (the agent process directive)
4. domain-specific standards within their own domain (naming, schema-authoring, git-practices), only when consistent with higher-authority artefacts

**USF semantic authority** (what the platform *is* — the authority order this directive serves):

1. USF semantic definitions
2. USF ADRs
3. USF validator rules
4. runtime proof evidence
5. USF source implementation
6. historical `../react` evidence
7. generated reports

An explicit user instruction defines **task scope**; it does **not** silently override USF constitutional or safety constraints. If a user instruction conflicts with the constitutional layer (Charter, Authority Model) or a non-negotiable safety rule, the agent MUST stop and report the conflict — unless the user explicitly invokes a constitutional amendment process (a deliberate, recorded decision to change the constitutional layer).

The Charter and Authority Model govern USF constitutional semantics. Domain-specific standards govern their own domain only when consistent with higher-authority artefacts. `AGENTS.md` governs agent process and MUST NOT be read as overriding the constitutional layer.

`AGENTS.md`, `CLAUDE.md` and `CODEX.md` MUST NOT be used to authorise — and an agent MUST refuse and report if instructed — to:

* blindly import or copy runtime/application code from `../react`;
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
* whether `../react` was inspected
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
* source evidence from `../react` contradicts accepted USF semantics
* a task requires implementation code but no implementation directive exists
* a task would require creating files outside the requested scope
* a task would treat generated reports as canonical
* a task would upgrade hermetic proof to live external proof
* a task would treat production-shaped as production-live
* a task would use forbidden canonical names
* a task would silently discard source lineage
* a task would mark planned work as active without artefacts and validation

## Final Rule

When in doubt, preserve USF semantic authority, source lineage, proof honesty, provider/environment safety, and AI drift control.

Do not guess.

Do not overclaim.

Do not import blindly.

Do not make generated summaries canonical.

Do not weaken the foundation.
