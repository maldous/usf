# USF Directory and File Naming Standard

| | |
|---|---|
| **Document type** | Governance / foundational naming and path authority |
| **Status** | **Draft / Foundational** |
| **Repository** | `usf` (this repository) — the clean canonical target |
| **Follows** | [`charter.md`](./charter.md), [`authority-model.md`](./authority-model.md), [`standards-profile.md`](./standards-profile.md), [`ontology.md`](./ontology.md), [`../../spec/taxonomies/taxonomy-catalog.json`](../../spec/taxonomies/taxonomy-catalog.json), [`../../spec/vocabularies/vocabulary-catalog.json`](../../spec/vocabularies/vocabulary-catalog.json), [`../../spec/registries/schema-registry.json`](../../spec/registries/schema-registry.json) — and MUST be consistent with all seven |
| **Artefact kind** | `architecture-document` (vocabulary `artefact-kinds`) |
| **Authority level** | `semantic-definition` (Authority Model rank 1). It is a governance/architecture document that operationalises the existing naming rules; like the [Standards Profile](./standards-profile.md) it governs the **form and placement** of lower artefacts and **does not change the authority order**. It is subordinate to the constitutional layer (Charter + Authority Model). |
| **Evidence basis** | Grounded in USF's own self-defined artefacts. Source paths are held in USF's own source-import registry and introduce no external naming into USF. |

> **Normative language.** Requirement words follow **BCP 14** (RFC 2119 + RFC 8174) as defined in [`standards-profile.md`](./standards-profile.md) §6 and §4 of this document. Only the uppercase forms carry normative meaning.
>
> **Scope note.** This document defines naming and path policy. It creates no schema, ADR, validator, evidence file, import map, registry, vocabulary, taxonomy, tool, or implementation directory. It creates exactly one file: itself.

---

## 1. Status

1.1 **Status: Draft / Foundational.** This document is authored as governance; it is not yet validator-enforced. Its lifecycle component is `draft` (vocabulary `lifecycle-states`); its maturity on the Standards Profile ladder ([`standards-profile.md`](./standards-profile.md) §21) is currently **documented**, and it names the maturity it must reach (**validator-enforced**, §23).

1.2 **It follows the seven foundational artefacts.** This document follows the [Charter](./charter.md), the [Authority Model](./authority-model.md), the [Standards Profile](./standards-profile.md), the [Ontology](./ontology.md), the [Taxonomy Catalogue](../../spec/taxonomies/taxonomy-catalog.json), the [Vocabulary Catalogue](../../spec/vocabularies/vocabulary-catalog.json), and the [Schema Registry](../../spec/registries/schema-registry.json). Where this document and any of those conflict, **the higher-authority artefact governs** and this document is corrected (Authority Model §3.4; AGENTS conflict order).

1.3 **It consolidates and operationalises existing naming rules.** The naming and path rules of USF are currently distributed across the Charter (§1.3, §1.4, §5.7), the Standards Profile (§17 Directory and Naming Standard, §9 directory/naming and registry standards), the Ontology (§4.2, §4.3, §14), the Taxonomy Catalogue (`taxonomyDesignPrinciples`, `forbidden category naming`), the Vocabulary Catalogue (`forbiddenValues`, `vocabularyDesignPrinciples`, alias convention), the Schema Registry (`namingConventions`, `identityNotes.idPrefixNote`), and the repository AGENTS directive (`Strict Naming Rules`). This document gathers those rules into **one canonical naming and path policy** without re-ranking or redefining them.

1.4 **It does not create schemas, ADRs, validators, evidence files, import maps, or implementation code.** It defines how those artefacts MUST be named and where they MUST live when later directives authorise their creation.

1.5 **It becomes the naming/path standard for later foundational work.** Future schema files, ADR files and templates, validators and generators, evidence envelopes, generated reports, import manifests, and (only under a later explicit directive) implementation directories MUST conform to this document.

---

## 2. Purpose

This standard exists to:

- **Provide one canonical naming policy.** A single place that resolves how USF paths, directories, files, and machine-readable IDs are named, so naming is decided by recorded rule rather than by per-task judgement or imitation of a source path.
- **Prevent migration-phase naming from becoming permanent architecture.** The target-tree intent — *"reuse every proven asset, refined into clean, final-state names. NO legacy/temp/transitional naming. NO vague buckets."* recorded in USF's own source lineage — is elevated here to an enforceable USF rule (Charter §1.3, §4).
- **Prevent source-path-driven architecture.** Source paths in USF's source lineage MUST NOT dictate USF paths (AGENTS `Source Repository Policy`; Authority Model §2.5; Ontology §8.3). A historical source path is evidence, not a target.
- **Prevent accidental duplication of path conventions.** One concept gets one canonical name in one canonical home (Charter §1.4; Ontology §7.13).
- **Make future schema/ADR/evidence/validator/import paths predictable.** The Schema Registry already names planned schema paths; this document fixes the rules those and all later paths obey (§12, §19).
- **Support future validators.** This standard is written so that a validator can later enforce it: forbidden tokens, case collisions, duplicate semantic names, planned-vs-active schema files, and report placement are all machine-checkable (§23).
- **Support AI agents by removing naming ambiguity.** An agent can decide a correct path from this document instead of inferring one from source resemblance (Charter §7; Authority Model §6; Standards Profile §20; Ontology §15).
- **Preserve historical source references without copying historical names into USF.** Historical names may be cited as source references or quoted evidence; they MUST NOT be recreated as USF paths (§20; Charter §1.3; Standards Profile §17.4).

---

## 3. Relationship to Existing Foundation

### 3.1 Relationship to the Charter

This document operationalises specific Charter principles:

- **Clean final-state naming (Charter §1.3, §5.7).** The Charter requires clean, final-state naming and forbids transitional, version-suffixed, status-suffixed, and redundant-`usf` path segments. This document is the concrete rule set (§5, §9, §18) that makes that requirement actionable and checkable.
- **Canonical homes (Charter §1.4).** The Charter fixes the canonical homes: `spec/` (typed semantic corpus), `docs/adr/` (ADR canon), `docs/architecture/` (constitutional and architecture-governance documents, including this one), `docs/runbooks/` (operational procedures), `tools/` (validators and generators), and `evidence/` (proof and runtime evidence). This document defines what each home contains and what MUST NOT enter it (§6).
- **No transitional/version/status naming (Charter §1.3, §4).** Elevated to the forbidden-token policy (§18).
- **No knowledge loss (Charter §5.8).** Naming rules never delete history; historical names are preserved as source references and aliases (§17, §20). No source element disappears for naming reasons without a recorded disposition.
- **Source-aware but not source-subordinate (Charter §5.6).** Historical paths inform understanding but never define USF paths (§20).
- **Make/env/config as semantic assets (Charter §5.13).** Command and configuration files are governed semantic assets; their names and placement are governed (§16, and the command/configuration entries of §19), not incidental.
- **Implementation follows semantic contracts (Charter §5.12).** Implementation directories are not created on the basis of source resemblance; they follow semantic authority and an explicit directive (§7, §24).

### 3.2 Relationship to the Authority Model

- **This is part of USF semantic definitions.** As an architecture-governance document defining intended repository structure, it belongs to the rank-1 semantic-definition corpus (Authority Model §1; Ontology §3.2, which places the constitutional layer above and the semantic-definition corpus — including the ontology itself — at rank 1).
- **It governs path/name decisions.** It is authoritative on *how artefacts are named and where they live*. It is not authoritative on *what behaviour is intended* (that is the capability/semantic-contract corpus) or *what was decided* (ADRs, rank 2).
- **It does not change the authority order.** It introduces no new authority class and re-ranks nothing (Standards Profile §5.2). A naming rule that contradicted the authority order would be a defect in this document.
- **Implementation paths are lower authority than semantic definitions.** A directory name or file path (rank-5 implementation, when implementation exists) MUST NOT redefine a semantic concept (Authority Model §2.5; Ontology §14 "A path name treated as architecture — forbidden").
- **Generated reports cannot redefine naming policy.** A generated report (rank 6) MUST NOT assert, alter, or override any naming rule here (Authority Model §2.6; §15 of this document).
- **Source-lineage paths are historical evidence only.** Rank-5 source lineage; consulted, cited, never made into USF paths (Authority Model §2.5; §20 of this document).

### 3.3 Relationship to the Standards Profile

- **The Standards Profile already names directory/naming as a USF-defined standard** (Standards Profile §9 "Directory and naming standard" and §17 "Directory and Naming Standard"), grounded in USF's own directory-contracts source lineage (26 directory contracts: `path`, `responsibility`, `allowedContents`, `forbiddenContents`, `owner`, `dependencyDirection`, `architectureRule`) and the target-tree.
- **This document is the concrete directory/file naming standard** that the Standards Profile anticipated. It supplies the rules the Standards Profile described at the level of a checkable policy.
- **Validators will later enforce it.** Per Standards Profile §17.5 and §18, validators MUST detect forbidden tokens and reject reintroduction of deprecated conventions; per §21.3 a standard governing drift control and AI alignment MUST progress to at least validator-enforced. §23 of this document records those expectations without creating the validator.

### 3.4 Relationship to the Ontology

- **Names MUST map to ontology concepts.** A USF artefact is named for the stable ontology concept it instances (Ontology §5), not for a folder, a tool, or a moment in time (Ontology §4.3, §4.6).
- **Implementation names MUST NOT create new concepts.** Existence of a directory or file is rank-5/6 evidence, never rank-1 authority (Ontology §4.6, §14). A new name does not invent a capability, permission, route, event, or provider semantic (Charter §7.5).
- **UI components MUST NOT become capabilities by path name.** A UI component or page name is not a Capability unless mapped to capability semantics (Ontology §5.27, §14 "A UI component treated as a Capability — forbidden").
- **Provider mode, environment, proof level, report status, and source disposition MUST NOT be conflated in names.** These are distinct semantic dimensions (Ontology §5.8–§5.11, §9; Vocabulary `provider-modes`, `environment-classes`, `proof-levels`, `report-statuses`, `disposition-values`). A filename MUST NOT, for example, imply a live-provider claim from a hermetic proof, or treat `production-shaped` as `production-live`, or treat a report `status` as a `proof-level` (Charter §6; AGENTS `Provider, Environment, Proof, and Report Safety`).

### 3.5 Relationship to Taxonomy and Vocabulary

- **Taxonomy classifies concepts; vocabulary supplies controlled values** (AGENTS `Taxonomy and Vocabulary Rules`; Ontology §2; the two artefacts must not be collapsed).
- **Paths SHOULD use stable semantic names, not uncontrolled synonyms** (Taxonomy `taxonomyDesignPrinciples`; Vocabulary `vocabularyDesignPrinciples` "Avoid uncontrolled synonyms"). Where a controlled value exists for a concept, the path/filename SHOULD align to that concept's semantic name rather than invent a synonym.
- **Vocabulary values MAY appear in filenames only where explicitly allowed.** A controlled value (for example a `provider-modes` or `environment-classes` token) MAY appear in a filename only to distinguish evidence/proof subjects, and only once the relevant schema and this standard permit it (§14, §15). Vocabulary values MUST NOT be used to overclaim (a hermetic proof file MUST NOT carry a live-provider token; Charter §6; Vocabulary `provider-modes` AI guidance).
- **Aliases are never canonical filenames.** A historical alias (Vocabulary `aliases` arrays) MUST NOT be emitted as a canonical USF path or filename; it resolves to its canonical value (AGENTS `Agents MUST NOT treat aliases as canonical values`).

### 3.6 Relationship to the Schema Registry

- **The Schema Registry defines the schemas and their paths.** [`schema-registry.json`](../../spec/registries/schema-registry.json) lists 23 schema entries, each with an `id`, a `path` under `spec/schemas/`, a `class`, a `family`, and a `lifecycleState` — and its own `namingConventions` block. *(At initial authoring all were `planned`; the schema files now exist at `draft` — see schema-authoring-standard §26 Amendment A.)*
- **This document constrains the path and filename rules for those schemas** (§12). It is consistent with, and does not weaken, the Registry's `namingConventions` (schema dir `spec/schemas/`, filenames end `.schema.json`, lowercase semantic names, no lifecycle in path, no forbidden canonical terms, `usf.` permitted only on global IDs not paths).
- **This document MUST NOT rename registered schemas unless a conflict is found.** No schema is renamed here; the 23 registry filenames are reproduced verbatim in §12. (None were found to conflict with this standard.)
- **Schema file paths in the Registry remain `planned` until files are created.** A schema is `active` only when its file exists, parses as valid JSON Schema, and is validator-checkable (AGENTS `Schema Rules`; Vocabulary `schema-lifecycle-states`). This document creates no schema file and promotes nothing to `active`.

---

## 4. Normative Language

This document uses **BCP 14** (RFC 2119 as updated by RFC 8174). Only the uppercase forms are normative.

| Keyword | Meaning in USF |
|---|---|
| **MUST**, **REQUIRED**, **SHALL** | Absolute requirement. |
| **MUST NOT**, **SHALL NOT** | Absolute prohibition. |
| **SHOULD**, **RECOMMENDED** | Strong default; deviation permitted only with recorded rationale. |
| **SHOULD NOT**, **NOT RECOMMENDED** | Strong negative default; deviation requires recorded rationale. |
| **MAY**, **OPTIONAL** | Genuinely optional; presence or absence MUST NOT break interoperability, proof honesty, or naming integrity. |

4.1 `MUST` is reserved for requirements needed for **semantic safety, interoperability, cross-platform portability, drift control, proof/report honesty, or AI alignment** (Standards Profile §6.2). Over-use of `MUST` is itself a defect.

4.2 A deviation from a `MUST` requires either a blocking validation failure that prevents the change from landing, or an explicit, recorded ADR exception (Standards Profile §6.3). A deviation from a `SHOULD` requires a recorded rationale (Standards Profile §6.4). Silent deviation is forbidden.

---

## 5. Naming Principles

These principles govern every name this standard regulates. They are the rationale behind the concrete rules in §6–§22.

5.1 **Stable semantic purpose over lifecycle state.** A name describes what a thing *is and owns*, never its status (`draft`, `final`, `accepted`), its version, or its age (Charter §5.7; Standards Profile §17.2; Ontology §4.1).

5.2 **Final-state names over migration-phase names.** No name encodes a migration phase, a branch version, a temporary status, or a historical origin (Charter §1.3; `v2-target-tree.txt` "NO legacy/temp/transitional naming"; §18).

5.3 **One concept, one canonical name.** A concept owns exactly one canonical identity, one canonical home, and one canonical name; duplicates are a defect (Charter §1.4; Ontology §7.13). The same artefact MUST NOT exist under two equivalent names.

5.4 **No source-path-driven target naming.** A source-lineage path MUST NOT be reused or transliterated as a USF path (AGENTS `Source Repository Policy`; Ontology §8.3; §20).

5.5 **No implementation-driven semantic naming.** A directory, package, class, or file name (rank 5) MUST NOT define or rename a semantic concept (Authority Model §2.5; Ontology §14 "A path name treated as architecture").

5.6 **No generated-report-driven semantic naming.** A generated report (rank 6) MUST NOT introduce or alter a canonical name or naming rule (Authority Model §2.6; Vocabulary `Generated reports MUST NOT introduce new canonical values`).

5.7 **No case-only distinctions.** Two names MUST NOT differ only by letter case, because many developer machines and tools are case-insensitive or inconsistent (§21).

5.8 **No unnecessary abbreviations and no unexplained acronyms.** Names SHOULD be spelled out where reasonable; an acronym is acceptable only when it is the established semantic name of the concept (for example, `adr`, `ui`, `api`, `usf`) and is used consistently.

5.9 **No broad vague buckets.** Names like `misc`, `common`, `shared`, `utils`, `general`, `temp`, or equivalents MUST NOT be used as directories unless explicitly justified and governed (`v2-target-tree.txt` "NO vague buckets"; the historical tree even annotates `hooks/` as *"named, not a junk bucket"*). A bucket directory hides un-classified content and defeats classification (§18).

5.10 **No plural/singular drift for the same category.** A category is named consistently. If a directory holds many items it MAY be plural (`taxonomies/`, `vocabularies/`, `registries/`, `schemas/`); a single catalogue file describing one catalogue is singular (`taxonomy-catalog.json`). The same category MUST NOT appear as both `schema/` and `schemas/`, or `registry/` and `registries/`, across the repository.

5.11 **No silent aliases.** Two names for the same thing MUST NOT both be canonical. An alias is recorded explicitly (in the Vocabulary `aliases` arrays, or as a source reference) and resolves to one canonical value (Vocabulary alias convention; AGENTS `aliases` rule). Duplicate filenames with equivalent meaning are forbidden.

5.12 **Global IDs and local paths are different naming domains.** A global, machine-readable artefact ID (the `usf.` namespace) and a repository path are governed by different rules and MUST NOT be conflated (§17).

---

## 6. Canonical Top-Level Directories

At the current foundation stage, the approved top-level directories are exactly:

```text
docs/
spec/
evidence/
tools/
```

`.git/` is Git internals and is outside USF governance (it is neither created nor named by USF policy). The root MAY also contain the conventional files named in §9 (e.g. `AGENTS.md`, `CLAUDE.md` and `CODEX.md` as a tool-specific pointer back to `AGENTS.md`).

No top-level directory other than the four above MUST be created at this stage. Directories deferred to a later directive are listed in §7.

**6.E.1 Narrow external-tooling exception — `.github/workflows/`.** `.github/workflows/` MAY exist **solely** to hold GitHub Actions workflow files for explicitly authorised, governance-serving CI, because GitHub mandates that exact path and provides no alternative location for repository CI. Two workflow files are currently authorised: `validate-spec.yml` (the fail-closed spec-validator gate for `tools/validate-spec/`) and `proof-anchor.yml` (the proof-freshness anchor publication of ADR 0007 — it runs the hermetic proof harness, verifies and attests the anchor payload, and publishes the anchor on the merge commit; it creates no implementation/runtime code and makes no live-external or production-live claim). Both are also listed in the validator's `AUTHORIZED_TOOLING`. This is a narrow, fixed-name external-tooling exception, of the same kind as the conventional fixed-name tool files in §9 (e.g. `LICENSE`, `Makefile`, lockfiles). It authorises **only** `.github/workflows/` and **only** for GitHub Actions workflow files; it MUST NOT be generalised to any other top-level directory, and `.github/` MUST NOT hold non-CI content. Workflow file names remain governed by §16 (verb-object) and §9 where applicable. Any further workflow file or CI/automation directory requires its own explicit authorisation and a matching `AUTHORIZED_TOOLING` entry.

### `docs/`

Human-readable governance and procedure.

Current approved children:

- `docs/architecture/`
- `docs/adr/`
- `docs/runbooks/`

Rules:

- `docs/architecture/` contains foundational and architecture-governance documents (the Charter, Authority Model, Standards Profile, Ontology, and this Standard).
- `docs/adr/` contains normative ADRs and ADR templates **only after** the ADR standard permits them (AGENTS `ADR Rules`; §13). It currently holds only a `.gitkeep` placeholder.
- `docs/runbooks/` contains operational procedures. It currently holds only a `.gitkeep` placeholder.
- `docs/` MUST NOT contain machine-readable registries, taxonomies, vocabularies, or schemas that belong under `spec/` (§3.1; Charter §1.4). Human-readable governance and machine-readable specification are kept separate.

### `spec/`

Machine-readable semantic governance and formal specifications.

Current approved children:

- `spec/taxonomies/`
- `spec/vocabularies/`
- `spec/registries/`
- `spec/schemas/`
- `spec/instances/`

Rules:

- `spec/taxonomies/` contains taxonomy catalogues and future taxonomy artefacts (currently `taxonomy-catalog.json`).
- `spec/vocabularies/` contains vocabulary catalogues and future controlled value sets (currently `vocabulary-catalog.json`).
- `spec/registries/` contains registries and cross-reference/resolution maps (currently `schema-registry.json`).
- `spec/schemas/` contains JSON Schema files **only when** schema creation is explicitly authorised (AGENTS `Schema Rules`). *(Superseded — see schema-authoring-standard §26 Amendment A: it now holds the 23 schema files at lifecycle `draft`; none are `active`.)*
- `spec/instances/` contains schema-validated semantic corpus instances, grouped by the schema ID they instantiate, for example `spec/instances/semantic-contract/`. This directory is authorised for real semantic instances after the source import map and draft schema validator exist; it MUST NOT contain schemas, generated reports, or implementation/runtime code.
- `spec/` MUST NOT contain implementation source code, human-readable prose governance (which belongs under `docs/`), or generated reports (which belong under `evidence/`, §15).

### `evidence/`

Proof, runtime, validation, import, and generated evidence artefacts.

Rules:

- Evidence files MUST NOT be populated until the evidence-envelope schema and validator strategy exist, unless a later directive explicitly authorises specific evidence (AGENTS `Evidence Rules`). `evidence/` currently holds only a `.gitkeep` placeholder.
- Generated reports belong under `evidence/`, **not** under `docs/` and **not** under `spec/`, once generated-report conventions are defined (§15; Authority Model §2.6).
- Evidence MUST preserve, in its content (not necessarily its filename), provider mode, environment, source reference, freshness/staleness, and evidence kind where relevant (Standards Profile §11; AGENTS `Evidence Rules`; Vocabulary `evidence-kinds`, `provider-modes`, `environment-classes`).

### `tools/`

Executable validators, generators, import tools, and maintenance utilities.

Rules:

- Tool subdirectories MUST NOT be created until there are enough files to justify them; start flat (§16). *(Superseded — see schema-authoring-standard §26 Amendment A and §6.E.1: `tools/` now holds the draft/advisory validator and its corpus under `tools/validate-spec/`, a subdir justified by that volume.)*
- Tools MUST be executable enforcement or generation, not prose policy (prose belongs under `docs/`).
- Tools MUST NOT define product semantics by themselves (Authority Model §2.3; a validator enforces, it does not invent meaning).
- Validators MUST fail closed once implemented (Charter §5.10; Standards Profile §18.2; AGENTS `Validator Rules`).

---

## 7. Future Directories Not Yet Approved

The following directories MUST NOT be created at this stage without a later explicit, approved directive (AGENTS `Implementation Rules`; Charter §5.12; Ontology §14):

```text
apps/
packages/
services/
src/
config/
infra/
scripts/
deploy/
docker/
k8s/
terraform/
```

Explanation:

- These are implementation or runtime directories. They realise behaviour (rank 5) and presuppose semantic contracts, schemas, validators, and source-import maps that do not yet exist.
- They MUST NOT be created before semantic authority, schemas, validators, and import maps justify them (Charter §5.12; Authority Model §5; Standards Profile §20.8).
- Similar directories exist in USF's source lineage (for example `apps`, `packages`, `services`, `config`, `infra`, `scripts`, `docker`, and Terraform under `infra`). **Source existence does not authorise target creation** (AGENTS `Source Repository Policy`).
- Future implementation directories MUST be created **only** through a source-import or implementation-extraction directive that names them, justifies them against semantics, and dispositions the source they derive from (Ontology §8; Standards Profile §10).

---

## 8. Directory Pre-Creation Rules

8.1 A directory SHOULD be created only when it has an immediately planned artefact, or when it is part of the approved bootstrap structure (§6).

8.2 Empty directories MAY be retained with a `.gitkeep` placeholder **only** when the directory itself is part of an approved canonical structure (§6).

8.3 `.gitkeep` is a placeholder only; it is **not** a semantic artefact and MUST NOT be treated as one (AGENTS `Current Foundational File Set`; Taxonomy/Vocabulary/Registry `gitkeepNote`). A `.gitkeep` confers no authority, satisfies no coverage, and is not evidence of completeness.

8.4 Directories MUST NOT be pre-created to reserve possible future architecture.

8.5 Implementation directories MUST NOT be pre-created (§7).

8.6 Vague grouping directories MUST NOT be pre-created (§5.9, §18).

8.7 Directories MUST NOT be pre-created solely because they exist in USF's source lineage (§7; §20).

8.8 Generated-output directories MUST NOT be pre-created before the generators and validators that define them exist (§14, §15, §16).

8.9 Schema subdirectories MUST NOT be pre-created before the Schema Registry and this standard require them; all 23 schemas currently live directly under `spec/schemas/` (§12).

8.10 Prefer a flat directory until multiple governed artefacts justify subdivision (§16). Subdivision is a response to real volume, not a speculative scaffold.

---

## 9. General File Naming Rules

These rules apply to all USF-authored files.

9.1 USF-authored files MUST use **lowercase kebab-case** for their name stem (ASCII `[a-z0-9-]`, words separated by a single hyphen). Example: `directory-and-file-naming-standard.md`.

9.2 File names MUST describe a stable semantic purpose (§5.1), not a tool, a status, an origin, or a date (except §9.12).

9.3 Markdown governance/procedure documents MUST use the `.md` extension.

9.4 Machine-readable data artefacts MUST use the `.json` extension.

9.5 JSON Schema files MUST use the `.schema.json` extension (§12; AGENTS `Schema Rules`).

9.6 File names MUST NOT contain spaces.

9.7 File names MUST NOT use underscores unless required by an external standard or by an exact historical source reference. (The repository placeholder `.gitkeep` is a conventional fixed name, not a USF-authored semantic name.)

9.8 File names MUST NOT use camelCase or PascalCase for USF-authored artefacts unless an external tool requires that exact name (§9.13).

9.9 File names MUST NOT differ only by letter case (§5.7, §21).

9.10 File names MUST NOT use punctuation other than `-` (word separator) and `.` (extension separator).

9.11 File names MUST NOT use lifecycle/status suffixes such as `-draft`, `-final`, `-new`, `-old`, `-accepted`, `-superseded`, or `-wip`. Lifecycle belongs in artefact content/metadata, never in the filename (§10, §13, §15).

9.12 Dates MUST NOT appear in file names unless the artefact is inherently time-specific evidence or report output (and even then, freshness is commit-pinned in content, §15; Authority Model §2.6). Version numbers MUST NOT appear in file names unless governed by a future versioning standard (§12, §25).

9.13 Aliases MUST be explicit (§5.11); duplicate filenames with equivalent meaning are forbidden.

Exceptions (permitted, narrowly):

- `README.md` MAY be used where a directory genuinely requires human orientation. (Uppercase `README` is the established cross-platform convention; it is an allowed conventional name, not a USF-authored kebab artefact.)
- `AGENTS.md` is the allowed root-level AI-agent directive (it already exists). `CLAUDE.md`, `CODEX.md` and similar tool-specific manifests MAY exist as pointers back to `AGENTS.md` and MUST NOT redefine USF policy (AGENTS `Status`).
- Conventional tool files — `LICENSE`, `Makefile`, `package.json`, `tsconfig.json`, lockfiles, linter/config dotfiles, and similar — carry fixed external names and MAY be introduced **only** when their corresponding stage is authorised (for example, a Make/command stage or an implementation-extraction directive). They are allowed-exception names, not USF-authored kebab artefacts, and their introduction is itself governed (Charter §5.13; §7; §16).
- Historical source-lineage paths MAY be quoted or referenced exactly but MUST NOT be recreated as USF paths (§20).

---

## 10. Markdown Document Naming Rules

10.1 Architecture documents use lowercase kebab-case under `docs/architecture/`.

10.2 Runbooks use lowercase kebab-case under `docs/runbooks/`.

10.3 ADR files MUST follow the ADR naming policy (§13) once that policy is finalised by the ADR schema/template step.

10.4 Root-level Markdown SHOULD be minimised. `AGENTS.md` is the special, allowed root directive (§9). New governance prose SHOULD live under `docs/`, not at the root.

10.5 A document with a given purpose MUST NOT be duplicated under a different directory or a different name (§5.3, §5.11).

Current foundational Markdown documents:

```text
docs/architecture/charter.md
docs/architecture/authority-model.md
docs/architecture/standards-profile.md
docs/architecture/ontology.md
docs/architecture/directory-and-file-naming-standard.md
docs/architecture/schema-authoring-standard.md
docs/architecture/git-practices-standard.md
```

10.6 **Status of `charter.md` and `authority-model.md` names.** `charter` and `authority-model` are **accepted canonical names**: they describe stable semantic purposes (the foundation's constitution and its precedence model), contain no forbidden token, and are final-state. They are **not** historical-short or transitional names and MUST NOT be renamed in this task or treated as provisional. The same holds for `standards-profile`, `ontology`, and this document's name.

---

## 11. JSON Artefact Naming Rules

11.1 JSON files under `spec/` are machine-readable governance artefacts.

11.2 JSON filenames use lowercase kebab-case.

11.3 A JSON filename SHOULD be singular where it defines one catalogue or registry — for example `taxonomy-catalog.json`, `vocabulary-catalog.json`, `schema-registry.json` — even when it lives under a plural directory (`spec/taxonomies/`, `spec/vocabularies/`, `spec/registries/`). The directory name reflects the collection; the file name reflects the one catalogue it is.

11.4 JSON **data** files MUST NOT use the `.schema.json` extension, which is reserved for JSON Schema shape contracts (§12).

11.5 JSON MUST parse strictly (AGENTS `JSON and Machine-Readable Artefact Rules`).

11.6 JSON MUST NOT contain comments or trailing commas, and MUST NOT use JSON5 or YAML-like syntax.

11.7 JSON artefacts MUST carry stable IDs where applicable (the existing catalogues use `usf.`-namespaced global IDs).

11.8 IDs and filenames are related but not identical: a filename is a repository path segment; an ID is a global identifier (§17). For example, the file `spec/registries/schema-registry.json` carries the ID `usf.schema-registry`.

11.9 Global IDs MAY use the `usf.` namespace (§17). Repository **paths** MUST NOT contain a redundant `usf` segment (§17, §18).

Existing JSON artefacts (MUST NOT be renamed in this task):

```text
spec/taxonomies/taxonomy-catalog.json     (id: usf.taxonomy-catalog)
spec/vocabularies/vocabulary-catalog.json (id: usf.vocabulary-catalog)
spec/registries/schema-registry.json      (id: usf.schema-registry)
```

---

## 12. Schema File Naming Rules

Schema files are not created in this task. These rules govern them when schema creation is explicitly authorised (AGENTS `Schema Rules`; Schema Registry `namingConventions`).

12.1 Schema files MUST live under `spec/schemas/`.

12.2 Schema filenames MUST match the Schema Registry's planned `path` for the corresponding entry, unless a later, explicit Registry change supersedes them. This document renames none of them (§3.6).

12.3 Schema filenames MUST end with `.schema.json`.

12.4 Schema filenames MUST use lowercase kebab-case.

12.5 Schema filenames MUST describe the governed concept (the ontology concept or contract they shape), not the producing tool.

12.6 Schema filenames MUST NOT include a lifecycle state (§9.11).

12.7 Schema filenames MUST NOT include a version number unless a future schema-versioning standard requires it (§25).

12.8 Schema filenames MUST NOT include a redundant `usf` segment (§17, §18).

12.9 A schema's `$id` MAY use a global `usf.` namespace **if** the schema-authoring standard later requires it (consistent with the Registry `idNamespacePolicy`), but schema **file paths** MUST remain local and unprefixed unless explicitly justified.

12.10 Schema files MUST NOT be created in this task, and no schema may be marked `active` without an existing, validator-checkable file (AGENTS `Schema Rules`; Vocabulary `schema-lifecycle-states`).

The planned schema filenames are the following (all `lifecycleState: planned`, none active, reproduced verbatim from [`schema-registry.json`](../../spec/registries/schema-registry.json) `schemas[]`):

```text
spec/schemas/schema-registry.schema.json
spec/schemas/taxonomy.schema.json
spec/schemas/vocabulary.schema.json
spec/schemas/semantic-contract.schema.json
spec/schemas/source-reference.schema.json
spec/schemas/source-disposition.schema.json
spec/schemas/evidence-envelope.schema.json
spec/schemas/proof-evidence.schema.json
spec/schemas/provider-mode.schema.json
spec/schemas/environment.schema.json
spec/schemas/command.schema.json
spec/schemas/configuration.schema.json
spec/schemas/interface-contract.schema.json
spec/schemas/event-contract.schema.json
spec/schemas/workflow.schema.json
spec/schemas/data-migration.schema.json
spec/schemas/observability-signal.schema.json
spec/schemas/audit-event.schema.json
spec/schemas/ui-semantic-model.schema.json
spec/schemas/adr.schema.json
spec/schemas/validator-report.schema.json
spec/schemas/import-manifest.schema.json
spec/schemas/ai-governance.schema.json
```

---

## 13. ADR File Naming Rules

No ADRs are created in this task (AGENTS `ADR Rules`). This section defines the naming policy so that ADR creation, when authorised, is predictable. Final ADR naming is confirmed by the ADR schema/template step (the planned `spec/schemas/adr.schema.json`, §12).

13.1 ADRs MUST live under `docs/adr/`.

13.2 ADR filenames SHOULD use a stable, zero-padded numeric prefix followed by a kebab-case semantic title once ADR creation begins. Suggested pattern:

```text
0001-short-semantic-title.md
```

(USF's source lineage uses `docs/adr/` with an authoritative numbering register — the target-tree shows `docs/adr/` "ADRs + ACTION-REGISTER.md (authoritative numbering)". USF adopts the *principle* of a stable numeric identity, not the historical files.)

13.3 ADR filenames MUST NOT use dates as the primary ADR ID unless a future ADR standard explicitly chooses date-based IDs.

13.4 ADR filenames MUST NOT use status suffixes such as `-draft`, `-accepted`, or `-superseded`. ADR status belongs inside the ADR's frontmatter/body (§9.11).

13.5 ADR supersession belongs inside ADR metadata (the superseding/superseded relationship), not in the filename (Authority Model §5.4 "ADRs are added or superseded ... supersession preserves lineage").

13.6 An ADR template (`template.md` under `docs/adr/`) MAY be created **only** when ADR template creation is explicitly authorised.

13.7 No ADR files and no ADR template are created in this task.

---

## 14. Evidence File Naming Rules

No evidence files are created in this task (AGENTS `Evidence Rules`). This section defines the policy for when evidence creation is authorised.

14.1 Evidence files MUST live under `evidence/`.

14.2 Evidence filenames SHOULD encode a stable subject and the evidence kind, not a status exaggeration (Vocabulary `evidence-kinds`).

14.3 Generated reports MUST be distinguishable from raw and proof evidence (Standards Profile §11.3; AGENTS `Evidence Rules`; §15). A report filename SHOULD carry a report-kind marker (for example a `-report` suffix, following USF's own `usf-audit/*-report.json` convention) so it is not mistaken for raw evidence.

14.4 Evidence filenames MUST NOT include status claims such as `pass`, `green`, `complete`, `ready`, or `final` (Charter §5.2 "the word `complete` is not permitted" without backing; AGENTS `Provider, Environment, Proof, and Report Safety`).

14.5 Freshness/staleness belongs in content metadata (commit-pinning), not in the filename (Authority Model §2.6, §4.3; Standards Profile §11.6).

14.6 Provider mode and environment MAY appear in a filename **only** when needed to distinguish evidence subjects, and **only** once the evidence schema permits it — and never to overclaim (a `hermetic-mock` proof file MUST NOT carry a `live-external-provider` token; Charter §6; §3.4).

14.7 Proof evidence MUST preserve a proof ID / subject / run identity without overclaiming the proof level or readiness (Standards Profile §11.7; Vocabulary `proof-levels`).

14.8 Source-import evidence SHOULD be separated from proof evidence once directories are approved (§14.9).

14.9 Possible future subdirectories under `evidence/` — **not approved and not created here** — include:

```text
evidence/source/
evidence/proofs/
evidence/reports/
evidence/imports/
evidence/validation/
```

These are illustrative of a likely future shape only. They are **not** approved directories until the evidence-envelope schema and the validator strategy define them. This document **prefers deferring** actual subdirectory creation: `evidence/` SHOULD remain flat (placeholder only) until the evidence-envelope work authorises a specific subdivision (§8.8, §25).

---

## 15. Generated Report Naming Rules

15.1 Generated reports are the lowest authority class (rank 6; Authority Model §2.6).

15.2 Generated report filenames MUST NOT imply canonical truth or a passing status (§14.4).

15.3 Generated report filenames SHOULD include the subject and the report kind (e.g. a `-report` marker; precedent in USF's source lineage: `usf-audit/behaviour-proof-readiness-report.json`, `proof-negative-control-report.json`).

15.4 A report's status (`pass`, `fail`, `partial`, `stale`, `not-run`, `unknown`; Vocabulary `report-statuses`) belongs **inside** the report content, never in the filename.

15.5 A report MUST identify the evidence it summarises (Authority Model §2.6; Standards Profile §11.8; Ontology §7.7).

15.6 Reports MUST be regenerable from current artefacts (Authority Model §2.6 "regenerated from current artefacts").

15.7 A stale report MUST NOT satisfy `pass` (Authority Model §4.3; AGENTS `stale MUST NOT satisfy pass`); `unknown` MUST NOT satisfy `pass` (AGENTS).

15.8 Generated reports MUST live under `evidence/` (or a later approved generated-report subdirectory, §14.9). They MUST NOT live under `spec/` and MUST NOT live under `docs/`.

15.9 Generated reports MUST NOT overwrite source evidence (raw or proof evidence is preserved; a report is derived, §14.3; Standards Profile §11.4).

15.10 No generated report files are created in this task.

---

## 16. Validator and Tool Naming Rules

No tools are created in this task (AGENTS `Validator Rules`). This section defines the policy.

16.1 Tools MUST live under `tools/`.

16.2 Tool files SHOULD use verb-object naming, e.g. `validate-foundation.mjs`.

16.3 `tools/` SHOULD start flat; subdirectories are introduced only when multiple related tools or shared libraries justify them (§8.10). (USF's `tools/` source lineage only subdivides where volume warrants it, e.g. `tools/architecture/`, `tools/e2e/`.)

16.4 Recommended verb prefixes by purpose (consistent with Vocabulary `command-kinds`):

- validators: `validate-*`
- generators: `generate-*`
- import tools: `import-*`
- collection tools: `collect-*`

16.5 A shared library directory `tools/lib/` MAY be introduced **only** after repeated shared logic actually exists.

16.6 Tools MUST NOT define product semantics by themselves (Authority Model §2.3).

16.7 Validators MUST fail closed once implemented (Standards Profile §18.2).

16.8 The file extension/runtime for USF tools (for example `.mjs` following USF's own `tools/**/*.mjs` convention, or another choice) is confirmed by the future tool/validator-authoring directive; the verb-object naming and flat-first rules above hold regardless (§25).

16.9 Future subdirectories such as `tools/validate/`, `tools/generate/`, `tools/import/`, and `tools/lib/` MAY exist later but are **not** created until justified by real volume (§8.10). No tools and no tool subdirectories are created in this task.

---

## 17. Global ID Namespace Policy

17.1 Global, machine-readable artefact IDs MAY use the `usf.` namespace.

17.2 The `usf.` prefix is allowed for global IDs precisely because they may be consumed **outside** the repository, where the bare name would be ambiguous (AGENTS `Strict Naming Rules`; Schema Registry `idNamespacePolicy`; Vocabulary `forbiddenValues` `redundant-usf` exception).

17.3 The `usf.` prefix MUST NOT be used merely as local redundancy.

17.4 Repository **paths** MUST NOT contain a redundant `usf` segment (the repository is already named `usf`).

17.5 **File names** MUST NOT contain a redundant `usf` segment.

17.6 **Local value IDs** MUST NOT contain a redundant `usf` segment unless the Vocabulary explicitly permits it.

Existing global IDs:

```text
usf.taxonomy-catalog
usf.vocabulary-catalog
usf.schema-registry
```

17.7 Future global IDs MUST be stable and documented (in the artefact that defines them and, where applicable, the Registry).

The naming domains are distinct and governed separately:

| Naming domain | Form | Governed by | `usf.` allowed? | Forbidden tokens apply? |
|---|---|---|---|---|
| Repository path | `spec/registries/` (lowercase-kebab segments, `/` separators) | §6–§9, §21 | No (redundant) | Yes |
| File name | `schema-registry.json` (lowercase-kebab + extension) | §9–§16 | No (redundant) | Yes |
| JSON object ID | `usf.schema-registry` (global) | §17 | Yes | Yes (except `usf.` namespace) |
| Schema `$id` | global URI/ID; path stays local | §12.9, §17 | Yes (on `$id`, if required) | Yes (except `usf.` namespace) |
| Vocabulary value | `hermetic-mock` (controlled value id) | Vocabulary catalogue | No (unless permitted) | Yes |
| Taxonomy ID | `provider-classification` (family/taxonomy id) | Taxonomy catalogue | No | Yes |
| ADR ID | `0001` numeric prefix (+ kebab title) | §13 | No | Yes |
| One-off baseline tag | `v2-foundation` (exact annotated tag only) | Git Practices Standard §9.6.1 | No | Exception: exact tag only |
| One-off proof-baseline tag | `v2-proof` (exact annotated tag only) | Git Practices Standard §9.6.2 | No | Exception: exact tag only |
| Source reference | exact historical path/commit, marked external | §20 | n/a (verbatim) | Allowed inside the reference as historical evidence |

---

## 18. Forbidden Path Tokens and Allowed Exceptions

The forbidden tokens below MUST NOT appear in USF **canonical** path segments, file names, package/implementation names, schema IDs, taxonomy IDs, vocabulary value IDs, or other local canonical identifiers (AGENTS `Strict Naming Rules`; Charter §1.3; Standards Profile §17; Vocabulary `forbiddenValues`).

| Token | Why forbidden | Forbidden contexts | Allowed exceptions | Allowed historical reference (example) | Forbidden new USF path/name (example) |
|---|---|---|---|---|---|
| `v2` | Encodes migration phase / branch version; USF is not a version branch of any external repository | Any canonical path, filename, ID, package, value id | Quoted historical paths; source references; source notes; explanatory text | `../external-source/docs/v2-foundation/v2-target-tree.txt` | `docs/v2-foundation/`, `schema-v2.json` |
| `legacy` | Migration-phase label; not a stable semantic category | Same as above | Same as above | "the historical (`legacy`) validator" in prose | `packages/legacy-auth/`, `legacy-config.json` |
| `old` | Relative-time label; unstable | Same as above | Same as above | quoting `-old` in a source-lineage runbook | `auth-old.md`, `old/` |
| `new` | Relative-time label; unstable | Same as above | Same as above | quoting `-new` in a source-lineage runbook | `new-architecture.md`, `new/` |
| `temp` | Transient label; not final-state | Same as above | Same as above | explaining why `temp` is forbidden | `temp/`, `temp-validator.mjs` |
| `transitional` | Migration-phase label | Same as above | Same as above | quoting "no `transitional` naming" | `transitional/`, `config-transitional.json` |
| redundant local `usf` | A repeated `usf` segment inside the `usf` repository adds no meaning | Repository path segments; package/implementation names; redundant prefixes on local value IDs | The repository/product name `usf` in prose; the **`usf.` namespace on global artefact IDs** (e.g. `usf.schema-registry`) | `id: usf.schema-registry` (global ID) | `spec/usf-schemas/`, `usf-schema-registry.schema.json`, `spec/schemas/usf-schema-registry.schema.json` |
| vague buckets — `misc`, `common`, `shared`, `utils`, `general` (and equivalents) | Hide unclassified content; defeat classification (`v2-target-tree.txt` "NO vague buckets") | Directory names, especially | Only with explicit, governed justification recorded in an ADR or this standard | source lineage annotates `hooks/` "named, not a junk bucket" | `packages/common/`, `tools/utils/`, `spec/misc/` |

Allowed exceptions (consolidated; AGENTS `Strict Naming Rules`; Vocabulary `forbiddenValues` `redundant-usf`):

- quoted historical source paths;
- source references to USF's own source lineage;
- source notes;
- historical aliases recorded in the Vocabulary catalogue;
- explanatory text (including this section);
- the exact annotated Git tag `v2-foundation`, only as the one-off dev-ready foundation baseline exception governed by [`git-practices-standard.md`](./git-practices-standard.md) §9.6.1;
- the exact annotated Git tag `v2-proof`, only as the one-off post-Test public-FQDN proof-baseline exception governed by [`git-practices-standard.md`](./git-practices-standard.md) §9.6.2;
- the `usf.` global, machine-readable artefact-ID namespace.

Crucial distinction:

- Citing a historical source path such as `../external-source/docs/v2-foundation/...` is **allowed** as a historical reference.
- Creating `docs/v2-foundation/` in USF is **forbidden**.

---

## 19. Canonical Directory Decision Table

For each artefact kind: its canonical directory, filename convention, current creation status, whether pre-creation is allowed now, authority level (Vocabulary `authority-levels`), and the controlling future schema/registry where applicable. "Now" means the current foundation stage.

| Artefact kind | Canonical directory | Filename convention | Creation status | Pre-create now? | Authority level | Controlling schema/registry |
|---|---|---|---|---|---|---|
| Architecture document | `docs/architecture/` | `kebab-name.md` | exists (5 docs) | yes (authorised) | semantic-definition | — (markdown-governed) |
| ADR | `docs/adr/` | `0001-kebab-title.md` | not yet | no | adr | `adr.schema.json` (draft, per schema-authoring §26 Amendment A) |
| ADR template | `docs/adr/` | `template.md` | not yet | no | adr | `adr.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Runbook | `docs/runbooks/` | `kebab-name.md` | not yet | no | semantic-definition | — |
| Taxonomy catalogue | `spec/taxonomies/` | `kebab-name.json` (singular catalogue) | exists | n/a (exists) | semantic-definition | `taxonomy.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Vocabulary catalogue | `spec/vocabularies/` | `kebab-name.json` (singular catalogue) | exists | n/a (exists) | semantic-definition | `vocabulary.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Registry | `spec/registries/` | `kebab-name.json` | exists (`schema-registry.json`) | n/a (exists) | semantic-definition | `schema-registry.schema.json` (draft, per schema-authoring §26 Amendment A) |
| JSON Schema | `spec/schemas/` | `concept.schema.json` | exists (23 at `draft`) | no | semantic-definition | Schema Registry `schemas[]` |
| Source reference | `spec/` and/or `evidence/` (deferred) | `kebab-name.json` | not yet | no | historical-source-evidence | `source-reference.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Source disposition | `spec/` and/or `evidence/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `source-disposition.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Evidence envelope | `evidence/` | `subject-kind.json` | not yet | no | runtime-proof-evidence | `evidence-envelope.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Proof evidence | `evidence/` (subdir deferred) | `subject[-mode][-env].json` | not yet | no | runtime-proof-evidence | `proof-evidence.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Validator report | `evidence/` (subdir deferred) | `subject-report.json` | not yet | no | generated-report | `validator-report.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Generated report | `evidence/` (subdir deferred) | `subject-report.json` | not yet | no | generated-report | `validator-report.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Command catalogue | `spec/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `command.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Configuration catalogue | `spec/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `configuration.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Import manifest | `spec/` and/or `evidence/` (deferred) | `kebab-name.json` | not yet | no | historical-source-evidence | `import-manifest.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Validator / tool | `tools/` (subdir when justified, §16.3) | `verb-object.<ext>` | exists (`tools/validate-spec/`) | no | validator-rule | draft/advisory, §26 Amendment A |
| Implementation source | `apps/`,`packages/`,`services/`,`src/` (NOT approved, §7) | per implementation-extraction directive | not yet | no | source-implementation | semantic contracts + import map |
| UI semantic model | `spec/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `ui-semantic-model.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Event contract | `spec/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `event-contract.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Workflow contract | `spec/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `workflow.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Observability signal | `spec/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `observability-signal.schema.json` (draft, per schema-authoring §26 Amendment A) |
| Audit event | `spec/` (deferred) | `kebab-name.json` | not yet | no | semantic-definition | `audit-event.schema.json` (draft, per schema-authoring §26 Amendment A) |

Notes: "deferred" home means the canonical directory under `spec/` or `evidence/` is confirmed by the relevant later schema/import directive; until then, no such file or subdirectory is created (§8, §14, §25). The exact `spec/` sub-home for contract/catalogue artefacts (for example a future `spec/contracts/` or `spec/catalogues/`) is itself deferred and MUST be set by an explicit directive before such files are created — this standard does not pre-approve it.

---

## 20. Source Reference Path Policy

20.1 Source references preserve historical paths **exactly** (verbatim), so lineage resolves (Ontology §5.4; Standards Profile §10.6).

20.2 Source reference paths are **data**, not target architecture. A reference records where evidence lives; it does not propose a USF path.

20.3 Source reference paths MAY include forbidden historical tokens (`v2`, `legacy`, etc.) because they are quoted historical evidence (§18 allowed exceptions).

20.4 Source reference paths MUST be clearly marked as historical/external — by a source-lineage prefix and/or an explicit `repository`/`source kind` field (Standards Profile §10.6; Ontology §5.4). A reader MUST be able to tell at a glance that the path is evidence, not a USF target.

20.5 No source reference path may be silently converted into a USF path (§5.4; AGENTS `Source Repository Policy`).

20.6 Every source-derived artefact later requires a disposition (Vocabulary `disposition-values`; Ontology §8.3; Standards Profile §10.5); no source element disappears for naming reasons without one.

20.7 Source path does not dictate target path (§5.4).

Examples:

- **Allowed:** referencing a historical source path such as `../external-source/docs/v2-foundation/v2-directory-contracts.json` as historical evidence.
- **Forbidden:** creating `docs/v2-foundation/` in USF.
- **Allowed:** quoting the historical `v2-target-tree.txt`.
- **Forbidden:** naming a USF directory `v2-target-tree/`.

---

## 21. Case, Portability, and Tooling Rules

21.1 File and path names MUST NOT differ only by letter case (case-only collisions break case-insensitive filesystems; §5.7).

21.2 Names MUST NOT contain spaces (§9.6).

21.3 Names MUST NOT contain shell metacharacters (for example `* ? [ ] ( ) { } $ ; & | < > ' " \``).

21.4 Names MUST NOT use Unicode lookalikes/homoglyphs; USF-authored repository file names use ASCII.

21.5 Names MUST NOT use punctuation other than `-`, `.`, and `/` (the path separator).

21.6 Repository-authored file names SHOULD prefer ASCII lowercase (§9.1), with the conventional-name exceptions of §9.

21.7 Names SHOULD avoid identifiers reserved on common operating systems (for example `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9` on Windows) where implementation assets later target cross-platform use.

21.8 Paths SHOULD be kept reasonably short and shallow; deep nesting and very long segments are avoided.

21.9 Extensions MUST be predictable: `.md` (governance/prose), `.json` (data), `.schema.json` (JSON Schema), and the tool extension confirmed by the tool directive (§16.8).

These rules are influenced by cross-platform portability practice and by URL/JSON-Pointer/Markdown safety (so paths and IDs do not require escaping); USF claims no formal compliance with any external naming standard (Standards Profile §7, §8; AGENTS `External Standards Posture`).

---

## 22. Examples

All examples below are **illustrative only and are not created** by this document.

**Good:**

```text
docs/architecture/directory-and-file-naming-standard.md
spec/schemas/schema-registry.schema.json
spec/registries/schema-registry.json
tools/validate-foundation.mjs
evidence/proofs/authentication-login-hermetic.json   # illustrative shape only; evidence/proofs/ is NOT approved or created here (§14.9)
```

**Bad:**

```text
docs/v2-foundation/                       # forbidden historical token recreated as a USF path (§18, §20)
docs/new-architecture.md                  # relative-time token in a canonical name (§5.2, §18)
spec/schemaRegistry.json                  # camelCase for a USF-authored artefact (§9.8, §11.2)
spec/schemas/usf-schema-registry.schema.json  # redundant local usf in a path/filename (§17, §18)
tools/temp-validator.mjs                  # transient/`temp` token (§18)
evidence/final-pass-report.json           # status overclaim in a filename (§14.4, §15.2)
apps/                                      # implementation directory before extraction is authorised (§7)
packages/                                  # implementation directory before extraction is authorised (§7)
```

---

## 23. Validation Expectations

These describe what a future validator MUST be able to check (Standards Profile §18). No validator is created now.

23.1 Detect forbidden path tokens (§18) in USF canonical paths, filenames, and local IDs.

23.2 Ignore forbidden tokens that appear **inside declared historical source references** (§20), so lineage is not flagged.

23.3 Detect case-only path/filename collisions (§21.1).

23.4 Detect duplicate semantic names (the same concept under two canonical names; §5.3, §5.11).

23.5 Validate that planned schema paths match the Schema Registry `schemas[]` entries (§12.2).

23.6 Validate JSON data filenames (`.json`, lowercase-kebab; §11) and schema filenames (`.schema.json`, lowercase-kebab, under `spec/schemas/`; §12).

23.7 Validate ADR naming once ADR rules are finalised (§13).

23.8 Validate that no planned schema is marked `active` without an existing, validator-checkable file (§12.10; AGENTS `Schema Rules`).

23.9 Validate that no implementation directory (§7) exists before it is authorised.

23.10 Validate that `.gitkeep` is not treated as a semantic artefact (§8.3).

23.11 Validate that generated reports are not placed under `spec/` (or `docs/`) (§15.8).

23.12 Validate that source-lineage paths are not reused as USF paths (§20.5).

23.13 Validate that global IDs (`usf.`-namespaced) and repository paths follow their separate domain rules (§17): `usf.` permitted on global IDs, forbidden as a redundant path/file segment.

---

## 24. AI Agent Rules

Future AI agents (and humans) working on USF MUST:

24.1 Read `AGENTS.md` if present, and acknowledge it (AGENTS `Mandatory Agent Bootstrap`).

24.2 Read the seven foundational artefacts before modifying repository structure (AGENTS `Required Preflight`; Ontology §15.1).

24.3 Use this naming standard before creating any file or directory.

24.4 Not create files or directories outside the approved canonical directories (§6, §7).

24.5 Not create schema files without a corresponding Schema Registry entry (§12; Schema Registry `aiAgentRules`).

24.6 Not create ADR files without the finalised ADR naming/template standard (§13).

24.7 Not create evidence files without the evidence-envelope rules (§14).

24.8 Not create tools without the validator/tool naming rules (§16).

24.9 Not create implementation directories without a source-import or implementation-extraction directive (§7; AGENTS `Implementation Rules`).

24.10 Not infer path names from USF's source lineage (§20; AGENTS `Source Repository Policy`).

24.11 Stop when this naming policy conflicts with a requested path, and report the conflict (AGENTS `Conflict Handling`, `Non-Negotiable Stop Conditions`; Authority Model §6.8).

24.12 Report ambiguity rather than inventing naming policy (Ontology §15.13; Charter §7.5).

---

## 25. Deferred Work

The following are deferred, not blockers. Each MUST be resolved by a future ADR, schema, validator, or import directive before it is enforced.

- Actual schema files and schema validators *(partially resolved by directive — see schema-authoring-standard §26 Amendment A: 23 schema files at `draft` + a draft/advisory validator under `tools/validate-spec/`)*; schema authoring and dialect policy are resolved by `schema-authoring-standard.md` (Draft 2020-12; `$id` `urn:usf:schema:<schema-name>`).
- Actual schema file creation (the 23 planned schemas; §12) *(resolved at draft level — see schema-authoring-standard §26 Amendment A)*.
- The ADR schema and ADR template, and ADR numbering finalisation (§13).
- The evidence-envelope schema (§14).
- The evidence subdirectory strategy (whether/which of `evidence/source|proofs|reports|imports|validation` become approved; §14.9).
- Validator implementation (the validator that enforces §18–§23).
- The generated-report schema and the final generated-report directory (§15).
- The source-import map / import manifest (§19, §20).
- The command, configuration, UI, event, data, and observability import catalogues and their exact `spec/` sub-homes (§19).
- Implementation-extraction directories (`apps/`, `packages/`, `services/`, `src/`, etc.; §7).
- Packaging/runtime directories (`config/`, `infra/`, `deploy/`, `docker/`, `k8s/`, `terraform/`; §7).
- The USF tool runtime and extension, and any future `tools/` subdirectory layout (§16.8, §16.9).

---

## 26. Acceptance Criteria

This document is acceptable only if **all** hold:

- It creates only `docs/architecture/directory-and-file-naming-standard.md`.
- It reads all seven foundational artefacts (§1.2).
- It parses the three JSON foundational artefacts (confirmed strict-parse before authoring).
- It is consistent with the Charter.
- It is consistent with the Authority Model.
- It is consistent with the Standards Profile.
- It is consistent with the Ontology.
- It is consistent with the Taxonomy Catalogue.
- It is consistent with the Vocabulary Catalogue.
- It is consistent with the Schema Registry.
- It preserves the `usf.` global ID namespace policy (§17).
- It forbids migration-phase path tokens (§18).
- It distinguishes historical source references from target paths (§20).
- It defines canonical directories (§6).
- It defines file naming rules (§9).
- It defines JSON naming rules (§11).
- It defines schema naming rules (§12).
- It defines ADR naming rules (§13).
- It defines evidence naming rules (§14).
- It defines generated-report naming rules (§15).
- It defines validator/tool naming rules (§16).
- It defines when not to pre-create directories (§8).
- It does not create schemas, ADRs, validators, evidence files, import maps, or implementation files.
- It does not import runtime/application code from any external repository.

---

*End of USF Directory and File Naming Standard (Draft / Foundational). This document creates only itself; it creates no schema, ADR, validator, evidence file, import map, registry, vocabulary, taxonomy, tool, or implementation directory, and imports no runtime/application code from any external repository.*
