# USF Git Practices Standard

| | |
|---|---|
| **Document type** | Governance / foundational Git, commit, branch, tag, and push standard |
| **Status** | **Draft / Foundational** |
| **Repository** | `usf` (this repository) — the clean canonical target |
| **Follows** | [`charter.md`](./charter.md), [`authority-model.md`](./authority-model.md), [`standards-profile.md`](./standards-profile.md), [`ontology.md`](./ontology.md), [`directory-and-file-naming-standard.md`](./directory-and-file-naming-standard.md), [`schema-authoring-standard.md`](./schema-authoring-standard.md), and the three `spec/` catalogues — and MUST be consistent with all nine |
| **Artefact kind** | `architecture-document` (vocabulary `artefact-kinds`) |
| **Authority level** | `semantic-definition` (Authority Model rank 1) **as a governance document**. It governs *how Git lineage evidence is produced*; the Git history it governs is itself **source-lineage / change-history evidence** (it never outranks semantics, ADRs, validators, proof, or source). Subordinate to the constitutional layer; it does **not** change the authority order. |
| **Observed Git state at authoring** | Branch `main`; **0 commits**; **0 tags**; remote `origin` → `https://github.com/maldous/usf`. This standard is therefore authored **before the first commit and tag**. |

> **Normative language.** Requirement words follow **BCP 14** (RFC 2119 + RFC 8174) as defined in [`standards-profile.md`](./standards-profile.md) §6. Only the uppercase forms are normative.
>
> **Scope note.** This document defines Git practices. It does **not** commit, push, or tag; create hooks, Lefthook/Husky/commitlint/CI configuration, validators, schemas, ADRs, evidence files, or import maps; or create implementation/runtime code. It creates exactly one file: itself.

---

## 1. Status

1.1 **Status: Draft / Foundational.** Lifecycle component `draft` (vocabulary `lifecycle-states`); Standards Profile maturity (§21) is **documented**; it names the maturity it must reach (**validator-enforced**, §14).

1.2 **It follows the prior foundational artefacts.** This document follows the [Charter](./charter.md), [Authority Model](./authority-model.md), [Standards Profile](./standards-profile.md), [Ontology](./ontology.md), [Taxonomy Catalogue](../../spec/taxonomies/taxonomy-catalog.json), [Vocabulary Catalogue](../../spec/vocabularies/vocabulary-catalog.json), [Schema Registry](../../spec/registries/schema-registry.json), [Directory and File Naming Standard](./directory-and-file-naming-standard.md), and [Schema Authoring Standard](./schema-authoring-standard.md). Where this document and any of those conflict, the higher-authority artefact governs and this document is corrected (Authority Model §3.4; AGENTS conflict order).

1.3 **It defines how USF uses Git** — history, commit messages, branches, tags, and push practices — so the first commit/tag is deliberate and the resulting history is machine-readable and auditable.

1.4 **It creates no commits, tags, hooks, validators, CI configuration, or implementation code.** It is a written standard only.

1.5 **First-commit context.** The repository has **no commits and no tags** at authoring time. This standard is created before the first commit; the first commit will become the **root lineage point** of USF (§7, §9, §15).

---

## 2. Purpose

This standard exists to:

- **Make Git history semantically useful** — typed, scoped commit messages a tool or agent can parse (§4, §5, §12).
- **Make the first push/tag deliberate and auditable** — a single foundational baseline commit and an annotated baseline tag with an explicit message (§7, §9, §15).
- **Support future hooks and validators** — the format is enforceable later by Lefthook/Husky/commitlint/custom validators without being tied to any of them now (§11, §14).
- **Support future changelog/release automation** — Conventional-Commit structure and SemVer-style baseline tags enable later automation (§4, §9), without claiming such automation exists.
- **Support future AI agents reading history** — commits and tags carry machine-readable trailers (§6) an agent can read under the authority model.
- **Prevent ad hoc commit/tag naming** — types, scopes, branch and tag forms are fixed here (§4, §5, §8, §9).
- **Distinguish Git history from semantic authority** — commits/tags are lineage evidence, not semantic definitions or proof (§3, §12).
- **Preserve source lineage without treating Git tags as proof** — a tag freezes a state; it does not certify correctness (§3, §9, §13).

---

## 3. Relationship to USF Authority Model

3.1 **Git commits are source-lineage and change-history evidence.** A commit records *what changed and when*; it is evidence of a change, not a definition of intended behaviour.

3.2 **Git tags are named lineage anchors.** A tag names a frozen repository state (a useful anchor for evidence freshness and source references).

3.3 **Git commits/tags do not outrank** semantic definitions (rank 1), ADRs (rank 2), validator rules (rank 3), runtime proof evidence (rank 4), or source implementation (rank 5). In the authority order they function as **source-lineage / change-history evidence** — consulted and cited, never authoritative over the artefacts they version.

3.4 **A passing commit, tag, or branch name does not prove correctness.** Naming a commit `fix(...)` does not make a fix correct; tagging a state does not make it valid; a green branch is not proof (Charter §5.9; AGENTS `Passing proof MUST NOT define intended behaviour by itself`).

3.5 **Generated reports remain lower authority than the artefacts they summarise** (Authority Model §2.7). A report referencing a commit SHA is still rank 7.

3.6 **A tag can identify a frozen state but cannot itself make that state semantically valid.** Validity comes from the semantic definitions, ADRs, validators, and proof — not from the existence of a tag (§9, §13).

---

## 4. Commit Message Standard

4.1 USF adopts the **Conventional Commits** structure as the default commit message format:

```text
<type>(<scope>): <summary>

<optional body>

<optional trailers>
```

The structure is machine-readable and supports later changelog/release reasoning. **USF does not claim that Conventional Commits alone captures semantic correctness** — correctness is governed by semantics, ADRs, validators, and proof (§3).

4.2 **Allowed initial commit types** (USF extends the conventional set with governance-specific types):

| Type | Use |
|---|---|
| `docs` | Markdown governance/procedure documents (e.g. `docs/architecture/`, `docs/runbooks/`). |
| `spec` | Machine-readable USF semantic/specification artefacts under `spec/` (taxonomy, vocabulary, registry). |
| `schema` | JSON Schema files under `spec/schemas/`. |
| `adr` | ADR creation or updates under `docs/adr/`. |
| `evidence` | Evidence artefacts under `evidence/`. |
| `validator` | Validator logic (under `tools/`). |
| `tool` | Non-validator tools (generators, importers) under `tools/`. |
| `import` | Source import maps/manifests. |
| `build` | Build configuration (conventional supporting type). |
| `ci` | CI configuration (conventional supporting type). |
| `test` | Tests (conventional supporting type). |
| `refactor` | Behaviour-preserving restructuring (conventional supporting type). |
| `fix` | Corrections (conventional supporting type). |
| `chore` | Maintenance not affecting governed artefacts (conventional supporting type). |

4.3 Rules:

- The type MUST be lowercase.
- The scope SHOULD be lowercase kebab-case (§5).
- The summary SHOULD be imperative or descriptive and concise (a single line; SHOULD be ≤ ~72 characters).
- The summary MUST NOT overclaim readiness (no `complete`, `ready`, `proven`, `done` without backing — Charter §5.2).
- The body SHOULD explain **why**, not merely restate **what** (§6).
- Breaking-change markers (`!` after type/scope, or a `BREAKING CHANGE:` trailer) MUST NOT be used casually; they MUST correspond to a real, governed breaking change (and, where behaviour changes, the coupled artefacts of Authority Model §5).
- Commit messages MUST NOT include forbidden canonical path tokens (`v2`, `legacy`, `old`, `new`, `temp`, `transitional`, redundant local `usf`) as canonical names, except inside quoted historical references (e.g. citing `../react/docs/v2-foundation/...`) — Naming Standard §18.

4.4 Future hooks (commitlint or a custom validator) MAY validate type and scope against this standard or a future commit-metadata value set (§11, §14). No hook is created now.

---

## 5. Commit Scopes

5.1 **Allowed initial scopes** (each maps to a USF concept, directory, or artefact class):

| Scope | Maps to |
|---|---|
| `foundation` | The foundational baseline as a whole. |
| `architecture` | `docs/architecture/` governance documents. |
| `agents` | The repository agent directives (`AGENTS.md`, `CLAUDE.md`, `CODEX.md`). |
| `taxonomy` | `spec/taxonomies/` (taxonomy catalogue). |
| `vocabulary` | `spec/vocabularies/` (vocabulary catalogue). |
| `registry` | `spec/registries/` (schema registry and future registries). |
| `naming` | The Directory and File Naming Standard. |
| `schema-authoring` | The Schema Authoring Standard. |
| `schemas` | `spec/schemas/` (schema files, once authored). |
| `adr` | `docs/adr/` (ADRs and templates). |
| `evidence` | `evidence/` (evidence artefacts). |
| `validators` | `tools/` validator logic. |
| `import` | Source import maps/manifests. |
| `tools` | `tools/` non-validator tools. |
| `release` | Release/baseline-tag and versioning activity (§9). |

5.2 Rules:

- A scope MUST map to a USF concept, directory, or artefact class (§5.1).
- A scope MUST NOT be invented from implementation structure (Ontology §14; Authority Model §6.4).
- A scope MUST NOT mirror a `../react` path (Naming Standard §20).
- A scope MUST NOT use `v2`, `legacy`, `old`, `new`, `temp`, `transitional`, or a redundant local `usf` segment (Naming Standard §18; Vocabulary `forbiddenValues`).
- New scopes SHOULD be added to this list (a coupled change) rather than improvised.

5.3 Future hooks MAY validate scopes against this list or a future commit-scope value set (a candidate `spec/vocabularies/` value set, deferred). No value set is created now.

---

## 6. Commit Body and Trailers

6.1 **Recommended body for foundational commits** — four labelled sections:

```text
Purpose:
- <why this change exists>

Authority:
- <what authority level/artefact class it affects; what it does NOT do>

Validation:
- <what was actually checked: JSON parse, etc. — truthful only>

Deferred:
- <what remains, non-blocking>
```

6.2 **Optional trailers** (footer `Key: Value` lines, compatible with `git interpret-trailers`; machine-readable lineage/metadata):

```text
Authority-Level: semantic-definition
Artefact-Kind: architecture-document
USF-Stage: foundation
Validated: json-parse
Generated: false
Source-Lineage: none
```

6.3 Trailer value conventions:

- `Authority-Level:` SHOULD use an `authority-levels` value (`semantic-definition`, `adr`, `validator-rule`, `runtime-proof-evidence`, `source-implementation`, `historical-source-evidence`, `generated-report`).
- `Artefact-Kind:` SHOULD use an `artefact-kinds` value (e.g. `architecture-document`, `schema`, `adr`, `evidence`, `validator`, `generated-report`).
- `USF-Stage:` is a USF-defined trailer convention (e.g. `foundation`); it is **not** yet a controlled vocabulary set — a future commit-metadata value set MAY formalise it (deferred, §14).
- `Validated:` names checks that **actually ran** (e.g. `json-parse`).
- `Generated:` is `false` unless the artefact is generated.
- `Source-Lineage:` describes the `../react` relationship truthfully (e.g. `none`, or `../react-evidence-referenced-not-imported`).

6.4 Rules:

- Trailers MUST be truthful.
- `Validated:` MUST NOT claim a validation that did not run (AGENTS proof-honesty; Authority Model §6.9).
- `Generated:` MUST say `false` unless the artefact is genuinely generated.
- `Source-Lineage:` MUST NOT claim a direct import unless source references and dispositions exist (Standards Profile §10; Ontology §8).
- Future validators MAY enforce trailer presence and value sets (§14). Trailers are evidence/metadata; they MUST NOT overclaim proof (§3.4).

---

## 7. First Commit Policy

7.1 The first commit SHOULD be a **single foundational baseline commit** (the repository currently has no commits, §1.5). If the repository already had commits, this standard would adapt to existing history and **not** rewrite it (it currently does not).

7.2 **Recommended first commit message:**

```text
docs(foundation): establish USF foundational governance
```

7.3 **Recommended body:**

```text
Purpose:
- Establish the initial USF constitutional, semantic, taxonomy, vocabulary,
  schema-registry, naming, schema-authoring, git-practices, and agent-directive
  (AGENTS.md, CLAUDE.md, CODEX.md) governance foundation.

Authority:
- Creates the initial rank-1 / constitutional governance baseline.
- Does not create implementation/runtime code.
- Does not import application code from ../react.

Validation:
- Foundational JSON catalogues parse strictly.
- No schema files are active.
- No implementation directories are created.
- ../react remains historical semantic/source evidence only.

Deferred:
- Actual schema files.
- ADR schema and template.
- Evidence envelope.
- Validator implementation.
- Source import map.
- Implementation extraction.

Authority-Level: semantic-definition
Artefact-Kind: architecture-document
USF-Stage: foundation
Validated: json-parse
Generated: false
Source-Lineage: ../react-evidence-referenced-not-imported
```

7.4 Rules:

- Do not squash unrelated implementation work into the first commit.
- Do not commit generated reports unless explicitly approved.
- Do not commit runtime/application code (no implementation exists, §13; AGENTS `Implementation Rules`).
- Do not commit secrets.
- Do not commit local tool cache files (agent caches, scratch, editor state).
- Do not commit `.env` files unless a future configuration standard explicitly permits generated **non-secret** examples (Naming Standard §9; Charter §5.13).

7.5 This standard does **not** create the first commit; it documents it (§15).

---

## 8. Branch Policy

8.1 The default branch is **`main`** (it already is; §1).

8.2 The first push SHOULD push `main` unless repository configuration says otherwise.

8.3 Feature branches SHOULD use lowercase kebab-case.

8.4 Branch names MUST NOT use forbidden tokens (`v2`, `legacy`, `old`, `new`, `temp`, `transitional`, redundant local `usf`).

8.5 Branch names SHOULD describe a semantic purpose, not an implementation guess.

8.6 Branch names MUST NOT reuse historical `../react` branch labels (Authority Model §2.6; §13).

8.7 Do not create `v2` branches.

8.8 **Suggested future branch formats** (illustrative; not created here):

```text
foundation/<short-purpose>
schema/<short-purpose>
adr/<short-purpose>
validator/<short-purpose>
import/<short-purpose>
```

8.9 No branches are created in this task.

---

## 9. Tag Policy

9.1 USF foundational/release tags MUST be **annotated** tags (message-bearing, `git tag -a`).

9.2 Lightweight tags MUST NOT be used for foundational milestones (they MAY be used only for disposable local markers).

9.3 Tags MUST carry meaningful messages (§9.7).

9.4 A tag identifies a repository **state**; it MUST NOT be presented as proof of correctness (§3.4, §3.6).

9.5 A pushed tag MUST NOT be moved except through an explicit corrective process (§13).

9.6 Tag names MUST avoid forbidden migration-phase language (`v2`, `legacy`, `old`, `new`, `temp`, `transitional`, redundant local `usf`), except for the one-off `v2-foundation` annotated release-baseline tag authorised by §9.6.1.

9.6.1 **One-off dev-ready foundation baseline tag exception.** Matthew authorised a narrow governance amendment for the exact annotated tag name `v2-foundation` to mark the immutable dev-ready foundation baseline before post-foundation optimisation/minimalisation begins. This exception:

- applies only to the exact tag name `v2-foundation`;
- applies only to the single dev-ready foundation baseline target commit recorded by USF-228;
- does not authorise arbitrary `v2-*` tags, branches, repository paths, file names, package names, schema IDs, taxonomy IDs, vocabulary IDs, implementation names, or local value IDs;
- does not weaken the general prohibition on migration-phase naming;
- does not make the tag proof of correctness by itself;
- does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification readiness, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity;
- records a baseline state for later optimisation/minimalisation, not a permission to remove lineage, weaken validators, or reduce proof/evidence quality.

9.7 **Recommended first tag:**

```text
foundation-governance-0.1.0
```

Rationale:

- It is a **semantic/governance baseline** tag, not a product release.
- It avoids `v2`.
- It avoids a redundant local `usf` segment.
- It uses a SemVer-like `0.1.0` because this is **initial foundational development**, not a stable public API (SemVer `0.y.z` denotes initial development; USF claims no stable public API and no SemVer release readiness).
- It identifies the **governance foundation**, not implementation readiness.

> **Naming-domain note.** A version suffix (`0.1.0`) is permitted in a **tag** name because tag versioning is governed by *this* standard — the version context that the Directory and File Naming Standard §9.12 deferred. Tag names are a distinct naming domain from repository file names; file names still carry no version (Naming Standard §17). The forbidden token is specifically `v2` (the historical branch-version); a generic SemVer `v` prefix is a separate stylistic choice (§9.8), not the forbidden `v2`.

9.8 **Alternative tag** if a later standard decides a `v` prefix is allowed:

```text
v0.1.0-foundation-governance
```

Prefer `foundation-governance-0.1.0` **unless** a later release/versioning **ADR** adopts `v`-prefixed tags.

9.9 **Recommended first annotated tag message:**

```text
USF foundational governance baseline 0.1.0

Includes:
- Charter
- Authority Model
- Standards Profile
- Ontology / Meta Model
- Taxonomy Catalogue
- Vocabulary Catalogue
- Schema Registry
- Directory and File Naming Standard
- Schema Authoring Standard
- Agent Directive (AGENTS.md)
- Claude Directive shim (CLAUDE.md)
- Codex Directive shim (CODEX.md)
- Git Practices Standard

This tag does not certify implementation readiness.
This tag does not create active schemas.
This tag does not import runtime/application code from ../react.
../react remains historical semantic/source evidence and lineage.
```

9.9.1 **Required `v2-foundation` annotated tag message shape.** The one-off `v2-foundation` tag MUST carry a message that identifies the dev-ready foundation baseline, the target commit, the USF-228 governance exception, and the non-claims in §9.6.1. The tag message MUST NOT claim staging, production, deployment, live-provider, SOC, ISO certification, enterprise production, product UI, browser E2E, or full React product parity readiness.

9.10 No tag is created in this task.

---

## 10. Push Policy

The first push sequence is **documented here but not executed** (§15). When a push is authorised:

10.1 Inspect `git status --short` before pushing.

10.2 Inspect `git diff --stat` before committing.

10.3 Run strict JSON parse on the foundational JSON files before committing:

```text
spec/taxonomies/taxonomy-catalog.json
spec/vocabularies/vocabulary-catalog.json
spec/registries/schema-registry.json
```

10.4 Run any existing validators if present (none exist yet; this step is currently a reserved no-op).

10.5 MUST NOT push if any foundational JSON does not parse.

10.6 MUST NOT push if unexpected or unintended files are staged.

10.7 MUST NOT push secrets.

10.8 Push the **commit before** the tag.

10.9 Push the **annotated tag after** the commit.

10.10 MUST NOT force-push `main` unless an explicit corrective policy exists (§13).

10.11 MUST NOT move pushed tags casually (§9.5, §13).

10.12 The configured remote is `origin` → `https://github.com/maldous/usf` (observed; recorded for the runbook, §15). This standard does not push to it.

---

## 11. Hook / Lefthook / Husky Compatibility

11.1 This standard is written to be **enforceable later by hooks**; it is hook-agnostic.

11.2 **No hook configuration is created now** (no Lefthook, Husky, commitlint, or CI config).

11.3 Future hooks MAY validate, at minimum:

- commit message type and scope (§4, §5);
- forbidden path tokens in messages, branch names, and tag names (§4.3, §8.4, §9.6);
- strict JSON parse of foundational JSON;
- schema validation once schemas exist (§ Schema Authoring Standard);
- absence of secrets;
- absence of unexpected implementation directories (Naming Standard §7);
- no planned schema marked `active` without a file (Schema Authoring Standard §20);
- no `.env` secrets.

11.4 Lefthook or Husky MAY be adopted later; the **tool choice is deferred**. `commitlint` MAY enforce §4/§5.

11.5 Custom validators MAY be used where generic hooks are insufficient (e.g. authority-aware checks).

11.6 **Hooks MUST NOT be the source of semantics; they enforce standards** (Authority Model §2.3 — validators/hooks enforce, they do not invent meaning).

---

## 12. Semantic Use of Git History

12.1 Git history MAY be used as **source-lineage evidence** (e.g. when a source reference cites a commit/tag).

12.2 Commit messages MAY be parsed by future tools (types, scopes, trailers — §4, §6).

12.3 Tags MAY anchor evidence **freshness** (commit-pinning; a tag/commit SHA marks the state evidence was collected against — Standards Profile §11.6).

12.4 Git SHAs MAY appear in source references, evidence references, and generated reports (as lineage, §3).

12.5 Git history is **not itself semantic authority** (§3.3).

12.6 Git metadata MUST NOT replace source references or evidence envelopes; it complements them (Standards Profile §10, §11; Ontology §5.4, §5.6).

12.7 Future import maps MAY reference commits/tags (Schema Registry `import-manifest.schema.json`, planned).

---

## 13. Forbidden Git Practices

The following MUST NOT occur:

- committing implementation/runtime code before implementation extraction is authorised (AGENTS `Implementation Rules`; Charter §5.12);
- committing generated reports as proof without underlying raw evidence (Authority Model §2.7, §4.3);
- committing secrets or `.env` files (§7.4);
- committing unparsed/invalid JSON (§10.5; AGENTS `JSON ... Rules`);
- using forbidden tokens (`v2`, `legacy`, `old`, `new`, `temp`, `transitional`, redundant local `usf`) as canonical names in branch/tag/commit scopes (Naming Standard §18);
- force-pushing `main` without an explicit correction procedure (§10.10);
- moving pushed foundational tags (§9.5);
- using tags to overclaim readiness (§3.4, §3.6);
- using historical `../react` branch labels as USF branch names (§8.6);
- creating `v2` branches or tags;
- mixing unrelated changes into foundational commits (§7.4).

A corrective process for a genuinely wrong pushed tag/commit MUST be explicit, recorded (a runbook or ADR), and lineage-preserving — never a silent history rewrite.

---

## 14. Future Automation

The following automation is **anticipated, not created now**:

- commit-message validation (type/scope/summary);
- branch-name validation;
- tag-name validation;
- JSON parse validation;
- schema validation (once schemas exist);
- forbidden-path-token scanning;
- secret scanning;
- generated-report freshness checks (commit-pin staleness);
- evidence/source-reference validation;
- implementation-directory-before-authorised scanning.

These MUST fail closed once implemented (Standards Profile §18.2). **No automation is created in this task.**

---

## 15. First Push and Tag Runbook Reference

15.1 The actual first push/tag MUST be performed by a **separate runbook or directive** authored and reviewed after this standard — not by this task.

15.2 That runbook SHOULD:

- verify the clean, intended file set (`git status --short`, file inventory);
- stage only approved files;
- create the first commit with the approved message (§7);
- create the annotated baseline tag (§9);
- push `main`;
- push the tag;
- report the remote URL, commit SHA, tag SHA, and status.

15.3 A future runbook home is `docs/runbooks/` (Naming Standard §6, §10). **This task creates no runbook and performs none of these actions.**

---

## 16. Acceptance Criteria

This document is acceptable only if **all** hold:

- it creates only `docs/architecture/git-practices-standard.md`;
- it does not commit;
- it does not push;
- it does not tag;
- it reads all foundational artefacts (§1.2);
- it parses the three JSON catalogues (confirmed strict-parse before authoring);
- it is consistent with the Charter;
- it is consistent with the Authority Model;
- it is consistent with the Standards Profile;
- it is consistent with the Ontology;
- it is consistent with the Taxonomy Catalogue;
- it is consistent with the Vocabulary Catalogue;
- it is consistent with the Schema Registry;
- it is consistent with the Directory and File Naming Standard;
- it is consistent with the Schema Authoring Standard;
- it defines the commit format (§4);
- it defines commit scopes (§5);
- it defines the first commit policy (§7);
- it defines branch policy (§8);
- it defines tag policy (§9);
- it defines push policy (§10);
- it supports future Lefthook/Husky/commitlint/custom validators (§11, §14);
- it does not overclaim SemVer release readiness (§9.7);
- it does not import application/runtime code from `../react`;
- it does not create implementation directories.

---

*End of USF Git Practices Standard (Draft / Foundational). This document creates only itself; it performs no commit, push, or tag, and creates no hook, Lefthook/Husky/commitlint/CI configuration, validator, schema, ADR, evidence file, import map, or implementation directory, and imports no runtime/application code from `../react`.*
