# USF Schema Authoring Standard

| | |
|---|---|
| **Document type** | Governance / foundational schema-authoring standard |
| **Status** | **Draft / Foundational** |
| **Repository** | `usf` (this repository) — the clean canonical target |
| **Follows** | [`charter.md`](./charter.md), [`authority-model.md`](./authority-model.md), [`standards-profile.md`](./standards-profile.md), [`ontology.md`](./ontology.md), [`directory-and-file-naming-standard.md`](./directory-and-file-naming-standard.md), [`../../spec/taxonomies/taxonomy-catalog.json`](../../spec/taxonomies/taxonomy-catalog.json), [`../../spec/vocabularies/vocabulary-catalog.json`](../../spec/vocabularies/vocabulary-catalog.json), [`../../spec/registries/schema-registry.json`](../../spec/registries/schema-registry.json) — and MUST be consistent with all eight |
| **Artefact kind** | `architecture-document` (vocabulary `artefact-kinds`) |
| **Authority level** | `semantic-definition` (Authority Model rank 1). It governs the **form, identity, and lifecycle** of future schema files; like the [Standards Profile](./standards-profile.md) and the [Directory and File Naming Standard](./directory-and-file-naming-standard.md) it does **not** change the authority order. It is subordinate to the constitutional layer (Charter + Authority Model). |
| **Evidence basis** | Grounded in USF's own self-defined artefacts. Source paths are held in USF's own source-import registry and introduce no external naming into USF. |

> **Normative language.** Requirement words follow **BCP 14** (RFC 2119 + RFC 8174) as defined in [`standards-profile.md`](./standards-profile.md) §6 and §4 of this document. Only the uppercase forms are normative, and they govern this Markdown standard — **not** JSON Schema keyword syntax.
>
> **Scope note.** This document defines how schema files are authored. It creates **no** schema file, ADR, validator, evidence file, import map, registry, vocabulary, taxonomy, tool, or implementation directory, and promotes no planned schema to `draft` or `active`. It creates exactly one file: itself.

---

## 1. Status

1.1 **Status: Draft / Foundational.** This document is authored governance; it is not yet validator-enforced. Its lifecycle component is `draft` (vocabulary `lifecycle-states`); its Standards Profile maturity (§21 of [`standards-profile.md`](./standards-profile.md)) is **documented**, and it names the maturity it must reach (**validator-enforced**, §24).

1.2 **It follows the eight foundational artefacts.** This document follows the [Charter](./charter.md), the [Authority Model](./authority-model.md), the [Standards Profile](./standards-profile.md), the [Ontology](./ontology.md), the [Taxonomy Catalogue](../../spec/taxonomies/taxonomy-catalog.json), the [Vocabulary Catalogue](../../spec/vocabularies/vocabulary-catalog.json), the [Schema Registry](../../spec/registries/schema-registry.json), and the [Directory and File Naming Standard](./directory-and-file-naming-standard.md). Where this document and any of those conflict, **the higher-authority artefact governs** and this document is corrected (Authority Model §3.4; AGENTS conflict order).

1.3 **It defines how future schema files are authored** — their dialect, identity, shape, required fields, controlled values, references, composition, documentation, versioning, lifecycle promotion, registry synchronisation, and review.

1.4 **It creates no schema files.** No JSON Schema file is authored by this document.

1.5 **This document promotes no planned schema to `draft` or `active`.** *(At initial authoring, all 23 Schema Registry entries were `planned` and `spec/schemas/` held only a `.gitkeep` placeholder. Superseded — see §26 Amendment A: the 23 schema files now exist at lifecycle `draft`; none are `active`.)* A schema becomes `active` only under §20.

1.6 **It becomes the standard that governs later schema creation**, before any schema file, ADR schema/template, evidence-envelope schema, validator, source-import map, or implementation is created.

---

## 2. Purpose

This standard exists to:

- **Choose the JSON Schema dialect and authoring rules** so every USF schema is written against one dialect with one set of conventions (§5).
- **Make schema authorship consistent** — identity, shape, required fields, closure, and documentation are uniform across all schemas (§6–§11, §19).
- **Prevent every schema from inventing its own metadata/envelope.** The Schema Registry's common envelope and metadata pattern are applied uniformly (§8, §9).
- **Make schemas validator-friendly** — strictly parseable, meta-schema-valid, and checkable against the registry, taxonomy, and vocabulary (§21, §24).
- **Make schemas audit-friendly** — closed objects, explicit required fields, named backing value sets, and resolvable references make a schema readable and checkable by a human or a tool (§10, §12, §13, §19).
- **Make schemas AI-safe** — an agent authors a correct schema from this standard plus the registry entry, not from source resemblance (§14, §25; Charter §7).
- **Keep schemas aligned to ontology, taxonomy, vocabulary, and the Schema Registry** (§3.4–§3.7, §12–§14, §21).
- **Prevent source-shape-driven schema creation.** A schema formalises USF semantics; it MUST NOT be inferred from source-lineage JSON shapes alone (§14, §15; Authority Model §6.4).
- **Define lifecycle promotion rules** from `planned` → `draft` → `active` (§20).
- **Prepare for validator implementation** by stating the checks a validator MUST later perform (§24).

---

## 3. Relationship to Existing Foundation

### 3.1 Relationship to the Charter

Schema authoring operationalises Charter principles:

- **Semantic-first governance (Charter §5.1).** A schema formalises an existing semantic definition's shape; it does not originate behaviour. Schemas follow semantics (§14).
- **Evidence-backed correctness (Charter §5.2).** Schemas make claims checkable: required fields, resolvable references, and controlled values are evidence a validator can verify (§11, §12, §24).
- **AI safety (Charter §5.3, §7).** Closed objects, explicit required fields, and named vocabularies remove "infer the shape from code" as a path (§10, §14, §25).
- **No knowledge loss (Charter §5.8).** Source-lineage fields are required where an artefact derives from USF's own source lineage; nothing is dropped silently (§9, §15).
- **Proof does not replace semantics (Charter §5.9).** A schema-valid instance is not thereby *proven*; proof/evidence schemas type evidence honestly and never let validity stand in for exercised behaviour (§16). The attestation recorded in USF's source lineage is explicit: *"Proofs are evidence, not substitutes for semantic definition"*.
- **Validators enforce drift control (Charter §5.10).** Schemas are the shape contract a future validator enforces, failing closed (§24). Recorded in USF's source lineage: *"Validators are enforcement; proofs are evidence; code is only the implementation of canonical semantic artefacts"*.
- **Implementation follows semantic contracts (Charter §5.12).** Schemas constrain artefact shape; they are not implementation code and create no runtime behaviour (§25).

### 3.2 Relationship to the Authority Model

- **Schemas belong to rank-1 USF semantic definitions** when they define the JSON artefact shape of semantic/governance artefacts (Authority Model §1; the Schema Registry assigns most schema classes `authorityRole: semantic-definition`).
- **Validators are rank 3 and enforce schemas.** A validator applies a schema and fails closed; it does not define the schema's meaning (Authority Model §2.3).
- **Runtime proof evidence is rank 4** and may be validated by the evidence/proof schemas (the registry's `evidence-schema`/`proof-schema` carry `authorityRole: runtime-proof-evidence`). Validity does not raise its authority.
- **Schema files do not make lower-authority artefacts higher authority.** A schema-valid source file (rank 5) or report (rank 6) keeps its rank; conformance to a shape is not promotion.
- **Generated reports remain lowest authority even if schema-valid** (Authority Model §2.6; the `validator-report-schema` carries `authorityRole: generated-report`). A valid report is still rank 6 and MUST NOT override evidence or semantics.

### 3.3 Relationship to the Standards Profile

- **The Standards Profile adopted JSON Schema as the future validation mechanism** for JSON artefacts (Standards Profile §8 "JSON Schema — Adopted as the mechanism; dialect and meta-schema deferred"; §9 evidence/registry standards).
- **This document settles the schema-authoring specifics** the Standards Profile deferred: the dialect (§5), `$id` policy (§7), shape (§8), closure (§10), enum policy (§12), and lifecycle (§20).
- **External standards are used honestly and without overclaiming** (Standards Profile §7, §8; AGENTS `External Standards Posture`). USF claims no full compliance with any external standard beyond the schemas and validators it actually creates (§5, §19).

### 3.4 Relationship to the Ontology

- **Every schema MUST govern one or more ontology concepts** (each Schema Registry entry already names `governsOntologyConcepts`; Ontology §5). The authored schema MUST preserve that grounding (§14).
- **Schema fields MUST map to ontology concepts or to a documented rationale** (§14). A field is not added because a source-lineage JSON happened to have it.
- **Schema authors MUST NOT create fields that invent new concepts** without updating the Ontology or recording deferred work, then stopping for acceptance (Authority Model §6.4; Ontology §15.10; §14 of this document).

### 3.5 Relationship to Taxonomy

- **Taxonomy classifies concepts** (Taxonomy Catalogue; AGENTS `Taxonomy and Vocabulary Rules`).
- **Schemas SHOULD reference taxonomy IDs where classification is needed** (the registry's `commonEnvelope` `taxonomyRefs` field; §13). References MUST resolve to `spec/taxonomies/taxonomy-catalog.json`.
- **Schemas MUST NOT define taxonomy categories independently** (§13; AGENTS `Agents MUST NOT collapse these layers`). A schema references a taxonomy; it does not invent one.

### 3.6 Relationship to Vocabulary

- **Vocabulary provides controlled values** (Vocabulary Catalogue).
- **Schemas MUST use vocabulary value sets for enums where available** (§12). A governed field with a controlled set draws its `enum` from that set's canonical IDs.
- **Schemas MUST NOT duplicate enum values independently without referencing the backing vocabulary set** (§12; the registry rule "No schema enum may contradict the vocabulary catalogue").
- **Aliases are not canonical** unless the schema explicitly models aliases (Vocabulary alias convention; AGENTS `Agents MUST NOT treat aliases as canonical values`).
- **Forbidden values MUST NOT be accepted as canonical** (Vocabulary `forbiddenValues`; §12, §15).

### 3.7 Relationship to the Schema Registry

- **Every schema file MUST have a registry entry before creation** (Schema Registry `aiAgentRules` "Do not create schema files without a registry entry"; §21).
- **The registry `path` is authoritative for planned schema files** (§6). A schema lives at the registry-declared path.
- **Planned schemas are not active** (Schema Registry `activeSchemaPolicy`; AGENTS `Schema Rules`).
- **Schema lifecycle state is updated only when file existence and validator-readiness support it** (§20). No planned schema is `active` without a parseable, meta-schema-valid, validator-applicable file.
- **This document constrains how planned schemas are authored** — it does not rename, add, or remove any registry entry, and it found no conflict requiring an edit to the registry.

### 3.8 Relationship to the Directory and File Naming Standard

- **Schema files live under `spec/schemas/`** ([`directory-and-file-naming-standard.md`](./directory-and-file-naming-standard.md) §6, §12).
- **Filenames use lowercase kebab-case and end with `.schema.json`** (Naming Standard §12.3–§12.4).
- **Schema paths MUST match the registry** unless the registry is explicitly amended (Naming Standard §12.2; §3.7).
- **No forbidden path tokens** (`v2`, `legacy`, `old`, `new`, `temp`, `transitional`, redundant local `usf`, vague buckets) appear in schema paths, filenames, or local IDs (Naming Standard §18).
- **No redundant local `usf`** in schema filenames or paths (Naming Standard §17.4–§17.5).
- **Global IDs and paths are separate naming domains** (Naming Standard §17). The Naming Standard §12.9 explicitly deferred the schema `$id` decision to this schema-authoring standard, which §7 now settles.

---

## 4. Normative Language

This document uses **BCP 14** (RFC 2119 as updated by RFC 8174). Only uppercase forms are normative **in this Markdown standard**.

| Keyword | Meaning |
|---|---|
| **MUST**, **REQUIRED**, **SHALL** | Absolute requirement. |
| **MUST NOT**, **SHALL NOT** | Absolute prohibition. |
| **SHOULD**, **RECOMMENDED** | Strong default; deviation only with recorded rationale. |
| **SHOULD NOT**, **NOT RECOMMENDED** | Strong negative default; deviation requires recorded rationale. |
| **MAY**, **OPTIONAL** | Genuinely optional. |

4.1 **JSON Schema keywords are not BCP 14 keywords.** A JSON Schema keyword such as `required`, `properties`, or `enum` is **schema syntax** with JSON-Schema-defined meaning; it is not a BCP 14 prose requirement word. Where this document writes `required` in code style it means the JSON Schema keyword; where it writes **MUST**/**REQUIRED** in prose it means the BCP 14 obligation.

4.2 **BCP 14 governs this document's requirements**, not the syntax of the schemas it describes. A schema's own validation strictness is expressed in JSON Schema keywords; the obligation to apply them is expressed here in BCP 14.

---

## 5. JSON Schema Dialect Decision

5.1 **USF schemas SHOULD use JSON Schema Draft 2020-12.**

5.2 The `$schema` for USF-authored schema files SHOULD be exactly:

```text
https://json-schema.org/draft/2020-12/schema
```

5.3 Justification:

- **Modern stable dialect.** Draft 2020-12 is the current reference dialect used by JSON Schema documentation and tooling.
- **Modular features.** It supports `$defs`, `$id`, `$anchor`, `$ref`, `unevaluatedProperties`, and vocabulary/dialect concepts useful for modular, composable schema design (§17, §18).
- **Strict validation and reuse.** It is suitable for strict closed-object validation (§10) and modular reuse (§17).
- **USF lineage.** The dialect is already established in USF's own source lineage: the one authored historical JSON Schema, `ui-definition.schema.json`, declares `"$schema": "https://json-schema.org/draft/2020-12/schema"`, as does `capability-proof-definition.json`. Adopting 2020-12 keeps continuity with proven practice without copying historical content (Authority Model §2.5).

5.4 If local tooling later cannot support Draft 2020-12, a later **ADR** MAY choose a different dialect with explicit justification. Until such an ADR exists, **Draft 2020-12 is the USF default and MUST be used** for new schema files.

5.5 Scope of this decision:

- **The exact validator package is not chosen here.** The historical readiness validator recorded in USF's source lineage is a custom, fail-closed `.mjs` rule engine (rules `rNN-*.mjs`, exit codes `0/1/2`, "fails closed", "normalises no aliases"), **not** a JSON-Schema/`ajv`-based validator; JSON Schema was used historically to *define* artefact shape (`ui-definition.schema.json`), while a custom validator *enforced* rules. USF preserves that separation: JSON Schema 2020-12 defines shape; the validator package was **deferred** to validator implementation — now partially resolved by directive (a draft/advisory validator; see §26 Amendment A).
- **Tooling selection** *(since resolved for this phase by directive — see §26 Amendment A; `jsonschema==4.10.3`)*, but **the dialect choice constrains future schemas immediately** (§23, §24).

---

## 6. Schema File Location and Naming

(Consistent with [`directory-and-file-naming-standard.md`](./directory-and-file-naming-standard.md) §12 and the Schema Registry `namingConventions`.)

6.1 All schema files MUST live under `spec/schemas/`.

6.2 Schema filenames MUST match the Schema Registry's planned `path` for the corresponding entry.

6.3 Schema filenames MUST use lowercase kebab-case.

6.4 Schema filenames MUST end with `.schema.json`.

6.5 Schema filenames MUST describe the governed concept, not the producing tool.

6.6 Schema filenames MUST NOT include a status/lifecycle suffix.

6.7 Schema filenames MUST NOT include a version number unless a future schema-versioning ADR requires it (§20).

6.8 Schema filenames MUST NOT include a redundant local `usf` segment.

6.9 Schema paths MUST NOT mirror source-lineage paths (Naming Standard §20; §15).

6.10 No schema files are created by this task.

The schema files (from [`schema-registry.json`](../../spec/registries/schema-registry.json) `schemas[]`; at initial authoring all `planned`, now authored at `lifecycleState: draft` per §26 Amendment A, none `active`):

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

## 7. Schema Identity and `$id` Policy

7.1 The naming domains MUST be kept distinct (Naming Standard §17):

- **file path** — e.g. `spec/schemas/schema-registry.schema.json` (a repository path; local, unprefixed, no redundant `usf`).
- **schema `$id`** — a stable global identifier inside the schema file.
- **JSON artefact `id`** — the global ID of a *data* artefact, e.g. `usf.schema-registry`.
- **global `usf.` artefact IDs** — the dotted namespace shared by the catalogues (`usf.taxonomy-catalog`, `usf.vocabulary-catalog`, `usf.schema-registry`).
- **vocabulary values** — controlled value IDs (e.g. `hermetic-mock`).
- **taxonomy IDs** — taxonomy/family IDs (e.g. `provider-classification`).

7.2 Schema filenames remain local and unprefixed, e.g. `spec/schemas/schema-registry.schema.json`.

7.3 **Adopted `$id` pattern (resolved).** USF schema files MUST use one canonical, URN-style `$id`:

```text
$id: urn:usf:schema:<schema-name>
```

where `<schema-name>` is the schema filename with the `.schema.json` suffix removed. This decision is **resolved**: changing away from the `urn:usf:schema:` namespace REQUIRES a future ADR.

Examples:

| File | `$id` |
|---|---|
| `spec/schemas/schema-registry.schema.json` | `urn:usf:schema:schema-registry` |
| `spec/schemas/taxonomy.schema.json` | `urn:usf:schema:taxonomy` |
| `spec/schemas/vocabulary.schema.json` | `urn:usf:schema:vocabulary` |
| `spec/schemas/proof-evidence.schema.json` | `urn:usf:schema:proof-evidence` |
| `spec/schemas/validator-report.schema.json` | `urn:usf:schema:validator-report` |

7.4 **Three distinct naming domains.** These three identifiers MUST NOT be collapsed:

1. **Repository path** — `spec/schemas/schema-registry.schema.json` — where the schema file lives (local, unprefixed, no redundant `usf`).
2. **Schema resource identifier** — `urn:usf:schema:schema-registry` — the JSON Schema `$id`.
3. **Artefact instance identifier** — `usf.schema-registry` — the ID of the JSON artefact instance validated by that schema.

Example mapping:

| Schema file path | Schema `$id` | Artefact instance ID it validates |
|---|---|---|
| `spec/schemas/schema-registry.schema.json` | `urn:usf:schema:schema-registry` | `usf.schema-registry` |
| `spec/schemas/taxonomy.schema.json` | `urn:usf:schema:taxonomy` | `usf.taxonomy-catalog` |
| `spec/schemas/vocabulary.schema.json` | `urn:usf:schema:vocabulary` | `usf.vocabulary-catalog` |
| `spec/schemas/proof-evidence.schema.json` | `urn:usf:schema:proof-evidence` | per-record proof evidence (no single catalogue instance ID) |
| `spec/schemas/validator-report.schema.json` | `urn:usf:schema:validator-report` | per-report instance (no single catalogue instance ID) |

7.5 **Rationale.**

- A JSON Schema `$id` identifies the **schema resource**; `$id` values are URI references.
- A schema `$id` is **not** the repository path.
- A schema `$id` is **not** the JSON artefact instance ID.
- A URN is a URI and can identify a schema resource **without implying a network fetch location**.
- URN-style `$id` values avoid pretending schemas are fetchable over HTTP.
- URN-style `$id` values avoid `.local` / mDNS-style resolution ambiguity.
- URN-style `$id` values avoid binding schema identity to local filesystem paths.
- URN-style `$id` values are stable, private, human-readable, and auditor-friendly.
- USF does not currently own or govern a public schema-publication domain, so an HTTPS-form `$id` would be unowned or fake; a URN avoids that.
- Historical tooling resolves schemas **by file path, not by `$id`** (the historical readiness validator loads `*.schema.json` files directly and performs no `$id`/network resolution), so a non-dereferenceable URN `$id` costs nothing operationally. The historical `ui-definition.schema.json` used a URL-form `$id` (`https://aldous.info/v2-foundation/ui-definition.schema.json`); that is rank-5 source evidence, not USF authority, and is **not** adopted.

7.6 **Namespaces.**

- `urn:usf:schema:` is the namespace for **schema resources only** (the `$id` of a schema file).
- `usf.` remains the namespace for **global machine-readable artefact instance IDs** (e.g. `usf.schema-registry`, `usf.taxonomy-catalog`, `usf.vocabulary-catalog`) — unchanged by this policy.
- `urn:usf:schema:` is a deliberate global identifier namespace, consistent with the Naming Standard §17 and the Vocabulary `forbiddenValues` `redundant-usf` exception that permits the `usf` namespace on global, machine-readable IDs. It is **not** a redundant-`usf` repository-path segment: the redundant-`usf` prohibition applies to repository paths, package/implementation names, and local value IDs, never to a global identifier namespace.
- Repository paths remain local and MUST NOT include redundant `usf` segments; schema filenames remain unprefixed and MUST match the Naming Standard and the Schema Registry planned paths.

7.7 **Rules for `$id`.**

- `$id` MUST use the `urn:usf:schema:<schema-name>` form.
- `$id` MUST be stable (never recycled or repurposed).
- `$id` MUST NOT encode lifecycle/draft/active state.
- `$id` MUST NOT encode a version unless a future schema-versioning ADR requires it (§20).
- `$id` MUST NOT use a repository file path, an implementation path, or a source-lineage path (§15).
- `$id` MUST NOT use `.local` HTTPS-style IDs (e.g. `https://usf.local/...`), a fake or unowned public domain, an `http://` or `https://` URL, or a `file://` URI.
- `$id` MUST NOT use the superseded dotted internal form `usf.schema.<name>`.
- `$id` MUST NOT collide with a JSON artefact instance ID such as `usf.schema-registry`.

7.8 **Why `urn:usf:schema:schema-registry` and `usf.schema-registry` are different:**

- `usf.schema-registry` identifies the **registry artefact instance** (the data file `spec/registries/schema-registry.json`).
- `urn:usf:schema:schema-registry` identifies the **schema that validates that artefact** (the future file `spec/schemas/schema-registry.schema.json`).

The `urn:usf:schema:` namespace is what distinguishes "the schema of X" from "the artefact instance X". This separation MUST be preserved for every schema.

7.9 **Status and ADR escape hatch.** The schema `$id` policy is **resolved**: `urn:usf:schema:<schema-name>` is canonical. Adopting any different `$id` scheme — an HTTPS-hosted URL, the superseded dotted form, or any other — REQUIRES a future ADR. This edit promotes no schema to `draft` or `active` and creates no schema file.

---

## 8. Required Top-Level Schema Shape

Every USF schema file MUST include, at minimum (grounded in the Schema Registry `commonRequirements.requiredJsonSchemaMetadata` and the historical `ui-definition.schema.json` shape):

- `$schema` — the dialect meta-schema URI (§5).
- `$id` — the schema identity (§7).
- `title` — a useful, specific human title (§19).
- `description` — a useful, USF-specific description (§19).
- `type` — typically `object` for governed artefacts.
- `required` — the explicit required-field list (§11).
- `properties` — the typed property definitions.
- `additionalProperties` **or** `unevaluatedProperties` policy — the object-closure decision (§10).
- `$defs` — **if** reusable substructures exist (§17).
- `$comment` — **only** where a non-validation explanation is needed (§19); validators MUST NOT depend on it.
- governance metadata — expressed as schema annotations or in `$comment` where it is not part of validation.

8.1 Clarifications:

- **JSON Schema is not the instance artefact.** A schema file describes the shape of instances; it is not itself a governed data instance.
- **Governance metadata for instances belongs in the instance schemas** — i.e. the schema *requires* the instance to carry `authorityLevel`, `lifecycleState`, etc. (§9). The schema file's *own* metadata (its `$schema`/`$id`/`title`) is distinct from the envelope it imposes on instances.
- **Schema metadata MUST NOT be confused with the common envelope** used by governed artefacts (§9). The envelope is what a schema requires of *instances*; the schema's top-level shape (this section) is what every *schema file* itself must contain.

---

## 9. Common Envelope Authoring Rules

The Schema Registry defines a common conceptual envelope (`commonEnvelope`) for governed artefacts. This document defines how schemas apply it. **This document does not define the envelope schema** (that is `evidence-envelope.schema.json` and the per-artefact schemas — which now exist at `draft`; see §26 Amendment A).

9.1 Schemas for governed artefacts SHOULD require the common envelope fields where applicable: `id`, `kind`, `title`, `description`, `status`, `version`, `authorityLevel`, `lifecycleState`, `ontologyConcepts`, and the conditional reference/lineage/safety fields below.

9.2 Required fields depend on artefact kind (§11). Not every schema requires every envelope field.

9.3 Deviations from the envelope MUST be recorded — in the schema's Schema Registry entry or in the schema `description` (Schema Registry `commonEnvelope` note; `commonRequirements.rules`).

9.4 Source-lineage fields (`sourceRefs`/`createdFrom`, `disposition`) are **mandatory** for artefacts derived from USF's own source lineage (Schema Registry `commonEnvelope.rules`; §15).

9.5 `providerMode` and `environment` are **mandatory** where evidence/proof/provider claims depend on them (§16).

9.6 Generated reports MUST identify the evidence they summarise (`evidenceRefs`; §16; Authority Model §2.6).

9.7 `lifecycleState` MUST use the correct vocabulary value set — `lifecycle-states` for general artefacts, `schema-lifecycle-states` for schema artefacts (§20).

9.8 `authorityLevel` MUST use the `authority-levels` value set.

9.9 `kind` MUST use the `artefact-kinds` value set.

9.10 `taxonomyRefs` MUST resolve to taxonomy catalogue IDs (§13).

9.11 `vocabularyRefs` MUST resolve to vocabulary catalogue value-set IDs (§12).

---

## 10. Object Closure Policy

10.1 Object schemas MUST be **closed by default**.

10.2 Simple object schemas SHOULD set `additionalProperties: false` (as the historical `ui-definition.schema.json` does at every object level).

10.3 Composed schemas — those using `allOf`, `$ref`, or nested composition where `additionalProperties` interacts poorly with sibling keywords — SHOULD use `unevaluatedProperties: false` instead, because it accounts for properties evaluated by the composed subschemas (§18).

10.4 Open extension points MAY be allowed **only** when explicitly named and justified in the schema `description` or its registry entry.

10.5 Any extension field MUST be typed (no untyped free-form objects).

10.6 Unknown properties in foundational governance artefacts MUST fail validation unless explicitly allowed.

10.7 Rationale:

- **Closed objects support auditability and AI safety** — an instance cannot smuggle in unreviewed fields, and an agent cannot quietly invent shape (Charter §5.3; §14).
- **Open objects risk uncontrolled schema drift** — undeclared fields evade review and the drift-control discipline (Authority Model §5).
- **Extension points may be useful but MUST be explicit** — a named, typed, justified extension is governable; an implicit one is not.

---

## 11. Required Fields Policy

11.1 Every schema MUST state `required`.

11.2 Absence of `required` is **not acceptable** for governed foundational artefacts.

11.3 Optional fields MUST be intentionally optional and documented (in `description` or `$comment`).

11.4 High-risk fields MUST be `required` where applicable to the artefact kind: `id`, `title`, `status`, `version`, `authorityLevel`, `lifecycleState`, `ontologyConcepts`, `taxonomyRefs`, `vocabularyRefs`, `sourceRefs`, `providerMode`, `environment`, `evidenceRefs`, `proofRefs`, `disposition`, `aiGuidance`.

11.5 Conditional requiredness (typically expressed with `if`/`then` or `required` within a composed branch, §18):

| Field(s) | Required when |
|---|---|
| `sourceRefs` / `createdFrom` | the artefact is derived from USF's own source lineage (§15) |
| `providerMode`, `environment` | a provider/environment claim exists (proof, evidence, provider artefacts) (§16) |
| `evidenceRefs` | the artefact is a generated report or a proof/evidence artefact (§16) |
| `disposition` | the artefact is a source-import / disposition artefact (§15) |
| `adrRefs` | a decision (ADR) governs the artefact |

11.6 A field that is "required for kind X but optional for kind Y" SHOULD be modelled by a kind-specific schema or a conditional branch, not by making the field globally optional (which would weaken the high-risk guarantee of §11.4).

---

## 12. Enum and Controlled Value Policy

12.1 Schemas MUST use vocabulary value sets for exact allowed values (§3.6).

12.2 Schemas MUST NOT duplicate enum values without referencing the backing vocabulary set (named in `description`/`$comment`, §12.8).

12.3 When using `enum`, the enum values MUST match the vocabulary's **canonical** IDs (not labels, not aliases).

12.4 Aliases MUST NOT be accepted as canonical values unless the schema explicitly models aliases (e.g. a dedicated `aliasOf` field). A historical alias resolves to its canonical value (Vocabulary alias convention).

12.5 Forbidden values MUST be rejected (Vocabulary `forbiddenValues`; §15).

12.6 Unknown values MUST fail closed unless an explicit, typed extension mechanism exists (§10.4).

12.7 Dimension-safety constraints (these MUST be enforced by the relevant schemas; §16; AGENTS `Provider, Environment, Proof, and Report Safety`):

- a `stale` or `unknown` report status MUST NOT satisfy `pass`;
- `hermetic-mock` MUST NOT satisfy `live-external-provider`;
- `production-shaped` MUST NOT satisfy `production-live`;
- a `proof-level` MUST NOT be modelled as, or substituted for, a report `status`.

12.8 Schema `description` or `$comment` SHOULD name the backing vocabulary value set for each enum field (for example, "values from `provider-modes`").

12.9 Later validators SHOULD check enum values against `spec/vocabularies/vocabulary-catalog.json` (§24).

---

## 13. Taxonomy Reference Policy

13.1 Schemas MUST reference taxonomy IDs where they classify an artefact (via `taxonomyRefs`).

13.2 Taxonomy references MUST resolve to `spec/taxonomies/taxonomy-catalog.json` (family or taxonomy IDs).

13.3 Schemas MUST NOT define new taxonomy categories.

13.4 Schemas MUST NOT use taxonomy category labels as uncontrolled free strings; a classification field references a taxonomy ID, it does not re-spell a category.

13.5 Unresolved taxonomy references MUST fail validation once validators exist (§24).

13.6 If taxonomy support is deferred for a schema, the schema MUST state why (in `description` or its registry entry).

---

## 14. Ontology Concept Reference Policy

14.1 Every schema entry in the registry already names `governsOntologyConcepts`; every actual schema MUST preserve that grounding (its `ontologyConcepts`/annotations MUST be consistent with the registry entry, §21).

14.2 Schema fields SHOULD map to ontology concepts or to a documented rationale (§9, §8).

14.3 If a schema needs a concept that is **not** in the Ontology, the author MUST stop and report (propose the ontology update + the coupled artefacts), rather than invent the concept in the schema (Authority Model §6.4; Ontology §15.10).

14.4 Implementation-shaped fields MUST NOT create semantic authority — a field named after a package, class, or directory does not make that structure a concept (Ontology §14 "A path name treated as architecture").

14.5 UI/component/source-path names MUST NOT become concepts by field naming (Ontology §5.27, §14). A UI surface field is not a Capability unless mapped to capability semantics.

---

## 15. Source Reference and Disposition Policy

15.1 Schemas involving source lineage MUST require source-reference fields (`sourceRefs`/`createdFrom`; §9.4).

15.2 Source references MUST preserve historical paths exactly (verbatim; Standards Profile §10.6; Naming Standard §20).

15.3 Source-reference values MAY include forbidden historical tokens (`v2`, `legacy`, …) **only** when clearly marked as a source reference (a source-lineage prefix and/or a `repository`/`sourceKind` field), never as a USF target (Naming Standard §18, §20).

15.4 Source path MUST NOT dictate target path or target schema shape (§3 intro; Authority Model §6.4; Schema Registry `sourceLineageLearnings` "Source path does not dictate target schema path").

15.5 `disposition` MUST use the vocabulary `disposition-values` set.

15.6 Every imported source element MUST eventually carry a disposition (Ontology §8.3; Standards Profile §10.5).

15.7 No schema may permit silent source loss — an import-manifest or disposition schema MUST require a disposition for every element (Schema Registry `import-manifest.schema.json` responsibilities; §24).

---

## 16. Evidence, Proof, Provider, Environment, and Report Safety Policy

These are authoring requirements for the relevant future schemas (evidence-envelope, proof-evidence, provider-mode, environment, validator-report). Grounded in the Charter §6, the Authority Model §2.4/§2.6/§4, AGENTS `Provider, Environment, Proof, and Report Safety`, and USF's own `capability-proof-definition` source lineage (proof ladder L0–L6; `providerClass` ∈ {hermetic, compose-local, sandbox-external, live-external, none}; `environment` ∈ {dev, test, staging, prod}; `prodSafe`/`destructive`; `deliveredAndProvenMinimumLevel: 3`; `liveProviderMinimumLevel: 4`).

16.1 Evidence schemas MUST type the evidence kind (`evidence-kinds`).

16.2 Proof schemas MUST preserve emitted and collected evidence (the proof-evidence shape MUST carry both, so collection cannot silently drop emitted fields; Standards Profile §11.4, §11.8).

16.3 Missing collected evidence MUST fail closed (a proof/evidence artefact MUST NOT validate as complete with required evidence absent).

16.4 The claimed proof level MUST NOT exceed the observed proof level (`claimed <= observed`; proof levels from `proof-levels`).

16.5 `providerMode` MUST be required where provider-dependent.

16.6 `environment` MUST be required where environment-dependent.

16.7 `hermetic-mock` MUST NOT satisfy `live-external-provider` (Charter §6.3; the live floor is `substrate-proven`/L4).

16.8 `production-shaped` MUST NOT satisfy `production-live`.

16.9 Generated reports are lowest authority (rank 6); their schema MUST carry `authorityRole: generated-report` and MUST NOT model a report as canonical.

16.10 Generated reports MUST reference the underlying evidence (`evidenceRefs`).

16.11 A `stale` report status MUST NOT satisfy `pass`; an `unknown` status MUST NOT satisfy `pass` (`report-statuses`).

16.12 A `proof-level` MUST NOT be modelled as a report `status`, and `providerMode` MUST NOT be modelled as `environment` — these are distinct dimensions (Ontology §9; §12.7).

---

## 17. `$defs`, `$ref`, Reuse, and Modularity Policy

17.1 Use `$defs` for reusable local subschemas.

17.2 Use `$ref` for reuse only when it improves consistency or removes genuine duplication.

17.3 Avoid deeply tangled `$ref` graphs before validators exist; favour readability.

17.4 Avoid circular references unless deliberately justified and validator-supported.

17.5 Common definitions SHOULD NOT be duplicated across many schemas once a shared-definitions schema exists; until then, local `$defs` are acceptable (§17.7).

17.6 Schema authors MUST prefer clarity and auditability over clever compression.

17.7 Recommended progression:

- initial schemas MAY use local `$defs` first;
- shared definitions MAY be extracted later **only** through a deliberate refactor (and, where it changes the registry, an ADR).

17.8 References MUST resolve. A broken `$ref` is a blocking error (§24).

17.9 `$dynamicRef` / dynamic vocabularies MUST NOT be used unless a future ADR requires them (they reduce auditability and complicate validation).

---

## 18. Composition Policy

18.1 `allOf`, `anyOf`, `oneOf`, `not`, and `if`/`then`/`else` MAY be used, but sparingly.

18.2 Prefer simple, explicit schemas where possible.

18.3 Use `oneOf` only when branches are genuinely mutually exclusive.

18.4 Use `anyOf` only when more than one branch may legitimately apply.

18.5 Use `allOf` with care: it interacts with object closure — prefer `unevaluatedProperties: false` over `additionalProperties: false` when composing with `allOf`/`$ref` (§10.3).

18.6 Conditional rules MUST remain understandable to an auditor; a schema whose logic cannot be followed SHOULD be split.

18.7 High-risk safety conditions MAY require `if`/`then`/`else`:

- provider mode / environment safety (e.g. *if* `providerMode` is `hermetic-mock`, *then* the artefact MUST NOT assert a `live-external-provider` readiness claim);
- generated-report status (e.g. *if* `status` is `stale` or `unknown`, *then* it MUST NOT be treated as `pass`);
- source-derived artefacts (e.g. *if* `createdFrom` references USF's source lineage, *then* `sourceRefs` and `disposition` are required).

18.8 Over-complex schemas SHOULD be rejected in review (§23) or split into simpler kind-specific schemas.

---

## 19. Annotation and Documentation Policy

19.1 Every schema MUST have a useful `title`.

19.2 Every schema MUST have a useful `description`.

19.3 Descriptions MUST be specific to USF (what the artefact is, which concepts it governs), not generic.

19.4 Descriptions MUST NOT overclaim compliance with any external standard (Standards Profile §7, §8; §5.5).

19.5 `$comment` MAY carry schema-author notes, but validators MUST NOT depend on `$comment`.

19.6 `examples` MAY be included only if they do not become canonical data; an example is illustrative, never authoritative.

19.7 Large examples SHOULD NOT be embedded unless genuinely needed.

19.8 Copied source-lineage content MUST NOT appear as an example unless explicitly marked as a historical source reference (§15; Naming Standard §20).

---

## 20. Versioning and Lifecycle Policy

20.1 Schema lifecycle is governed by the `schema-lifecycle-states` value set: `proposed`, `planned`, `draft`, `active`, `deprecated`, `retired`, `replaced`, `deferred`.

20.2 Initial actual schemas MUST be `draft` (not `active`) until validator-checkable.

20.3 A schema MAY be promoted to `active` only when **all** hold (AGENTS `Schema Rules`; Vocabulary/Registry `schema-lifecycle-states` `active`):

- the schema file exists;
- it parses as strict JSON;
- it validates as a JSON Schema under the chosen dialect (meta-schema valid);
- a validator can apply it to at least its intended target artefact;
- the registry lifecycle state is updated intentionally (§21).

20.4 Schema `version` SHOULD start at `0.1.0` unless a stronger versioning policy exists.

20.5 Breaking schema changes MUST bump the version according to a future semver policy (deferred, §26); the version is bumped on semantic change (Schema Registry `commonEnvelope` version guidance).

20.6 Schema renames REQUIRE a disposition and a registry update (§21; Naming Standard §17; disposition from `disposition-values`).

20.7 Schema deletion REQUIRES a disposition and a registry update.

20.8 Schema replacement REQUIRES `replacedBy` (or equivalent) metadata (`schema-lifecycle-states` `replaced`).

20.9 Planned schemas remain `planned` until authored. **This document promotes none.**

---

## 21. Schema Registry Synchronisation Policy

21.1 No schema file may exist without a registry entry (§3.7).

21.2 No registry entry may be marked `active` without an existing, validator-checkable file (§20.3).

21.3 A schema's filename/path MUST match its registry `path`.

21.4 A schema's class MUST match its registry `class` (from `schema-classes`).

21.5 A schema's family MUST match its registry `family` (a known `schemaFamilies` entry).

21.6 A schema's governed ontology concepts MUST match the registry entry's `governsOntologyConcepts`, or be a documented subset/extension (with rationale).

21.7 Taxonomy/vocabulary references MUST match the registry entry's `taxonomyRefs`/`vocabularyRefs`, or be documented.

21.8 The registry MUST be updated **together with** schema lifecycle changes (coupled change; Authority Model §5).

21.9 `schema-registry.schema.json` is the first self-validation target — the registry validates itself once that schema is authored (§22; Schema Registry `validationExpectations` "Schema registry validation must eventually check itself with schema-registry.schema.json").

---

## 22. Schema Creation Order

Recommended creation order **after** this document (no schema is created now):

1. `schema-registry.schema.json`
2. `taxonomy.schema.json`
3. `vocabulary.schema.json`
4. `adr.schema.json`
5. `source-reference.schema.json`
6. `source-disposition.schema.json`
7. `evidence-envelope.schema.json`
8. `proof-evidence.schema.json`
9. `provider-mode.schema.json`
10. `environment.schema.json`
11. `validator-report.schema.json`
12. remaining planned schemas (`semantic-contract`, `command`, `configuration`, `interface-contract`, `event-contract`, `workflow`, `data-migration`, `observability-signal`, `audit-event`, `ui-semantic-model`, `import-manifest`, `ai-governance`)

Rationale:

- **First validate the registry** — it is the index everything else resolves through (§21.9).
- **Then validate taxonomy and vocabulary** — the classification and controlled-value authorities that all later schemas reference (§12, §13).
- **Then enable the ADR and source/evidence/proof foundations** — ADR (so decisions are traceable), then source-reference/disposition (lineage), then evidence-envelope and proof-evidence (the highest-risk safety shapes, §16).
- **Then the validator-report shape** — so validator output is itself governed.
- **Then the domain-specific schemas** — interface, event, workflow, data, observability, audit, UI, import-manifest, ai-governance.

No schemas are created now.

---

## 23. Schema Review Checklist

Every future schema author MUST satisfy this checklist before a schema leaves `draft`:

- [ ] a Schema Registry entry exists for the schema;
- [ ] the path matches the registry;
- [ ] the filename complies with the Naming Standard (§6; kebab-case, `.schema.json`, no forbidden tokens, no redundant `usf`);
- [ ] `$schema` uses the chosen dialect (§5);
- [ ] `$id` follows the `urn:usf:schema:<name>` policy (§7);
- [ ] `title` and `description` are present, specific, and non-overclaiming (§19);
- [ ] `type`, `properties`, and `required` are present (§8, §11);
- [ ] the object-closure policy is applied (§10);
- [ ] common envelope fields are included, or a deviation is justified (§9);
- [ ] ontology concepts resolve and match the registry (§14, §21);
- [ ] taxonomy references resolve (§13);
- [ ] vocabulary references resolve (§12);
- [ ] enum values come from the backing vocabulary set (§12);
- [ ] source-lineage rules are applied where applicable (§15);
- [ ] provider/environment/proof/report safety rules are applied where applicable (§16);
- [ ] no forbidden path/name tokens are present (Naming Standard §18);
- [ ] no source-lineage path is mirrored into a USF path or `$id` (§15);
- [ ] strict JSON parse passes;
- [ ] the schema validates as a JSON Schema under the chosen dialect (meta-schema valid);
- [ ] any example instances are non-canonical (§19.6);
- [ ] the lifecycle state is `draft` until validator-checkable (§20);
- [ ] no implementation/runtime code was created.

---

## 24. Validator Expectations

A future validator (not created now) MUST be able to:

- parse all schema files as strict JSON;
- validate each schema file against the Draft 2020-12 meta-schema;
- check schema↔registry synchronisation (§21);
- check `$id` uniqueness across all schemas;
- check schema path uniqueness;
- check schema lifecycle state against file existence (no `active` without a file; §20.3);
- check enum values against `vocabulary-catalog.json`;
- check `taxonomyRefs` against `taxonomy-catalog.json`;
- check `ontologyConcepts` against the Ontology concept catalogue;
- detect forbidden canonical names in paths, filenames, and `$id`s (Naming Standard §18);
- detect any schema marked `active` without validator-readiness;
- detect generated-report schemas that would allow `stale`/`unknown` to satisfy `pass`;
- detect proof/evidence schemas that would allow overclaim (claimed > observed; missing required evidence passing);
- detect provider/environment schemas that would allow unsafe substitution (`hermetic-mock` as live; `production-shaped` as `production-live`);
- detect source-reference/import schemas that would allow silent source loss (an element without a disposition).

The validator MUST fail closed on any such finding (Charter §5.10; Standards Profile §18.2; source lineage: the readiness validator spec — "It fails closed: any contradiction is an error", exit codes `0/1/2`, "the validator normalises no aliases"). This document creates no validator; a draft/advisory validator was subsequently authorised under directive — see §26 Amendment A.

---

## 25. AI Agent Rules

Future AI agents (and humans) MUST:

25.1 Read `AGENTS.md` if present, and acknowledge it.

25.2 Read all foundational artefacts before schema work (Charter §7; Authority Model §6; Standards Profile §20; Ontology §15; Schema Registry `aiAgentRules`).

25.3 Read this Schema Authoring Standard before creating any schema.

25.4 Not create schema files without a registry entry (§3.7, §21).

25.5 Not mark schemas `active` outside the §20.3 conditions.

25.6 Not invent fields from source structure alone (§14, §15; Authority Model §6.4).

25.7 Not duplicate vocabulary enums (§12).

25.8 Not define taxonomy categories in a schema (§13).

25.9 Not use aliases as canonical values (§12).

25.10 Not overclaim external standard compliance (§5.5, §19.4).

25.11 Not create implementation/runtime code.

25.12 Stop if a schema needs unresolved ontology/taxonomy/vocabulary changes (§14; Ontology §15.13).

25.13 Stop if the JSON Schema dialect or the `$id` policy conflicts with an existing artefact (report the conflict, do not guess; Authority Model §6.8; AGENTS `Conflict Handling`).

---

## 26. Deferred Work

**Amendment A (2026-06 — validator implementation partially resolved by directive).** Under an explicit directive, the 23 planned schemas and a draft/advisory validator have since been authored and committed, partially superseding the deferrals in this section and the "no validator is created" / "tooling deferred" statements elsewhere in this document (§5 grounding notes; §24). Specifically:

- The 23 planned schema files now exist under `spec/schemas/` at lifecycle `draft` (the registry tracks them; none are `active`).
- `tools/validate-spec/validate-spec.py` is the authorised **draft/advisory** USF validator (artefact-kind validator, lifecycle `draft`).
- `jsonschema==4.10.3` is the selected JSON Schema **Draft 2020-12** validation package for this phase (pinned in `tools/validate-spec/requirements.txt`).
- It is **CI-enforced** for the current `spec/` corpus (`.github/workflows/validate-spec.yml`, per Naming Standard §6.E.1) and implements schema self-validation and schema↔registry/taxonomy/vocabulary/ontology checks.
- It is **advisory**: it promotes **no** schema to `active`; it normalises no aliases; it fails closed.
- **Still deferred:** validation of real (non-synthetic) domain instances; a formal ADR recording this lift and promoting this standard to **validator-enforced** maturity; `$id`/semver versioning policy; and any future validator expansion. The remaining bullets below stay deferred except as stated here.

Deferred, not blockers. Each MUST be resolved by a future ADR, schema, or validator before it is enforced:

- actual schema file creation (all 23 planned schemas); *(resolved at draft level — see Amendment A)*
- `schema-registry.schema.json`; *(resolved at draft level — see Amendment A)*
- `taxonomy.schema.json`; *(resolved at draft level — see Amendment A)*
- `vocabulary.schema.json`; *(resolved at draft level — see Amendment A)*
- the ADR schema and ADR template (`adr.schema.json`); *(schema resolved at draft level — see Amendment A; ADR template/canon deferred)*
- the evidence-envelope schema (`evidence-envelope.schema.json`); *(resolved at draft level — see Amendment A)*
- the proof-evidence schema (`proof-evidence.schema.json`); *(resolved at draft level — see Amendment A)*
- the validator-report schema (`validator-report.schema.json`); *(resolved at draft level — see Amendment A)*
- the provider-mode and environment schemas; *(resolved at draft level — see Amendment A; selector/gate wiring deferred)*
- validator implementation; *(partially resolved — see Amendment A)*
- schema-validation tool/package selection (the exact 2020-12 validator); *(resolved for this phase: `jsonschema==4.10.3` — see Amendment A)*
- schema self-validation (the registry validating itself); *(resolved at draft level — the registry/taxonomy/vocabulary catalogues validate against their schemas; see Amendment A)*
- schema-to-registry, schema-to-taxonomy, schema-to-vocabulary, and schema-to-ontology validators; *(resolved at advisory level — implemented in `tools/validate-spec/`; see Amendment A)*
- OpenAPI / AsyncAPI concrete artefact decisions;
- OpenTelemetry attribute vocabulary decisions;
- source import mapping (`import-manifest.schema.json` *(schema resolved at draft — see Amendment A)* and the map);
- implementation extraction;
- the schema-versioning (semver) policy detail (§20.5).

---

## 27. Acceptance Criteria

This document is acceptable only if **all** hold:

- it creates only `docs/architecture/schema-authoring-standard.md`;
- it reads all required foundational artefacts (the eight in §1.2);
- it parses the three JSON catalogues (confirmed strict-parse before authoring);
- it is consistent with the Charter;
- it is consistent with the Authority Model;
- it is consistent with the Standards Profile;
- it is consistent with the Ontology;
- it is consistent with the Taxonomy Catalogue;
- it is consistent with the Vocabulary Catalogue;
- it is consistent with the Schema Registry;
- it is consistent with the Directory and File Naming Standard;
- it chooses (or explicitly defers) a JSON Schema dialect (§5: chooses Draft 2020-12);
- it defines the `$schema` policy (§5);
- it defines the `$id` policy (§7);
- it defines the object-closure policy (§10);
- it defines the enum/vocabulary policy (§12);
- it defines the taxonomy-reference policy (§13);
- it defines the ontology-reference policy (§14);
- it defines source/evidence/proof safety rules (§15, §16);
- it defines schema lifecycle promotion rules (§20);
- it defines the schema creation order (§22);
- it creates no schema files;
- it creates no validators;
- it creates no ADRs;
- it creates no evidence files;
- it creates no import maps;
- it creates no implementation files;
- it imports no runtime/application code from any external repository.

---

*End of USF Schema Authoring Standard (Draft / Foundational). This document creates only itself; it creates no schema file, ADR, validator, evidence file, import map, registry, vocabulary, taxonomy, tool, or implementation directory, promotes no planned schema to `draft` or `active`, and imports no runtime/application code from any external repository.*
