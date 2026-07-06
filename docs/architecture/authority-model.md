# Universal Service Foundation — Authority Model

| | |
|---|---|
| **Document type** | Constitutional / foundational |
| **Status** | Active. Companion to the [Charter](./charter.md); together they form the USF constitutional layer. |
| **Purpose** | Define the authority hierarchy of USF artefact classes, how each is used, and how conflicts and drift are resolved. |
| **Audience** | Every human and AI agent that reads, changes, or proves any part of USF. |
| **Evidence basis** | Self-defined. USF grounds its authority in its own semantic corpus, decisions, validators, and recorded proof evidence; it claims no external repository lineage. |

> **Normative language.** **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** carry RFC 2119 intent.

---

## 0. Purpose and how to read this document

0.1 USF is governed by **artefact classes of differing authority**. When two artefacts give different answers, this document decides which one governs, and what action is required. It exists so that change — especially AI-guided change — is resolved by **authority and evidence**, not by the most recently edited file or the most persuasive prose.

0.2 Two ideas operate together:

- **Domain of decision.** Each authority class is authoritative about a *specific kind of question* (what behaviour *is*, what is *permitted*, what *happened*, whether artefacts are *consistent*). Most apparent conflicts dissolve once you ask which class owns the question.
- **Authority order.** For genuine overlaps — where two classes answer the *same* question differently — a strict order (§1) is the tie-breaker.

0.3 Crucially, some conflicts are **not** precedence questions at all but **drift or invalidity** (§4, §5). The required response is to **stop and reconcile**, not to let the higher rank silently win and proceed. The USF validators **MUST** fail closed in these states.

---

## 1. The authority order

The **constitutional layer** — the [Charter](./charter.md) and this Authority Model — establishes the order below and stands above it. ADRs and all lower artefacts **MUST** conform to the constitutional layer. The constitutional layer is amended only by deliberate constitutional decision.

Within that constitutional frame, the operational authority order, highest first, is:

| Rank | Authority class | Owns the question | USF home |
|---|---|---|---|
| 1 | **USF semantic definitions** | *What is the intended behaviour / contract?* | `spec/` |
| 2 | **USF ADRs** | *What is permitted, decided, and forbidden — and why?* | `docs/adr/` |
| 3 | **USF validator rules** | *Are the artefacts mutually consistent? Is a claim admissible?* | `tools/` |
| 4 | **Runtime proof evidence** | *Was the defined behaviour actually exercised — at what level, on what provider class?* | `evidence/` |
| 5 | **USF source implementation** | *What does the code currently do?* | `apps/`, `packages/`, `services/`, … |
| 6 | **Generated reports** | *What is the current summary of the above?* | `evidence/` (generated) |

Read the order as: **higher ranks define and constrain; lower ranks implement, evidence, and summarize.** A lower-ranked artefact **MUST NOT** override a higher-ranked one. When a lower rank contradicts a higher rank, the lower rank is wrong, stale, or non-conformant — and the contradiction is a finding the validators **MUST** surface.

---

## 2. Authority classes in detail

Each class below is described by: **what it is**, **what it can decide**, **what it cannot decide**, **how future AI MUST use it**, **conflict behaviour**, and **evolution**.

### 2.1 USF semantic definitions — rank 1 (primary)

**What it is.** The machine-readable corpus under `spec/` that defines the platform's behaviour: capabilities and, per capability, the full facet set (for example: `lifecycle`, `stateModel`, `permissions`, `contracts`, `validation`, `errorModel`, `auditModel`, `readinessModel`, `proof`, `uiSemanticDefinition`), plus event semantics, operational semantics, cross-capability interactions, environment semantics, authorization semantics, and the proof definitions. Each definition names the validator rule that enforces it (`coverage.enforcedBy`).

**What it can decide.** The intended behaviour and contract of the platform: capabilities, states and transitions, permissions and authorization, validation and error models, events, UI semantics, environment semantics, operational semantics, proof definitions, audit and readiness models, and the source references that back each. It is the **single canonical definition of what the platform should do**.

**What it cannot decide.** It cannot decide *whether* a behaviour was actually exercised (that is proof, rank 4) or *whether* a behaviour is permitted by decision (that is an ADR, rank 2 — semantics define behaviour, ADRs constrain which behaviours may exist and how they may change). It cannot certify itself: a semantic claim of completeness is only valid when its facets cite real evidence. A capability may remain `delivered-and-proven` *only* when `semanticCompleteness.status` is complete and every facet points at authoritative evidence; otherwise it **MUST** drop to `semantic-gap`.

**How future AI MUST use it.** As the **primary input**. An agent **MUST** read the relevant semantic definitions before changing behaviour, UI, tests, or proofs, and **MUST** make implementation conform to them. An agent **MUST NOT** reconstruct intended behaviour from source code or generated reports when a USF semantic definition exists.

**Conflict behaviour.** Semantics outrank all lower classes on questions of intended behaviour. A standing contradiction between semantics and an accepted ADR (rank 2) is **drift**, not a precedence win: both cannot stand, and the agent **MUST** stop and reconcile (§5). Semantics **MUST NOT** be edited to match what the code happens to do (§4.1, §4.5).

**Evolution.** Semantics evolve **only** through a decided, coupled change: a behaviour change updates the semantic definition together with its ADR, proofs, and validator rules (§5). New facets or entities are schema-versioned. Every definition keeps explicit source references.

### 2.2 USF ADRs — rank 2

**What it is.** The canon of normative architectural decisions under `docs/adr/`, each generated from semantic and proof evidence, recording *what was decided, the alternatives considered, the rationale, what it supersedes, and explicit AI-alignment constraints*. Every accepted decision is paired with evidence-backed lineage (originating decisions, actions, evidence paths, commits).

**What it can decide.** Which option is chosen among alternatives; what is **permitted and forbidden**; the constraints under which semantics and implementation may change; ownership and boundaries; and the AI-alignment constraints that bind future work. An ADR **constrains future change** and explains *why*.

**What it cannot decide.** It cannot, by itself, *define* product behaviour absent from semantics — an ADR **MUST** align to semantic definitions, not substitute for them. It cannot be **generic prose**: a decision that carries no machine-checkable consequence carries no governance force. It cannot stand untraced: a decision that is not accepted, or that has no lineage, is invalid and rejected by the validators, and a lineage reference that does not resolve to a real decision, action, or evidence path is a finding.

**How future AI MUST use it.** As **binding constraint**. An agent **MUST** check the ADR canon before acting and **MUST NOT** take an action an ADR forbids — even if a proof passes or a source file would allow it. When an agent makes a decision, it **MUST** record it as a traceable ADR with AI-alignment constraints.

**Conflict behaviour.** ADRs outrank validators, proofs, source, and reports. An ADR that forbids a behaviour **blocks** that behaviour regardless of a passing proof (§4.2). An ADR that contradicts current semantics is drift to be reconciled (§5). An ADR **MUST NOT** be honoured if it violates the constitutional layer (Charter / this document).

**Evolution.** ADRs are added or superseded by new ADRs, never silently edited to reverse a decision; supersession is explicit and lineage is preserved. Amending an ADR that encodes a behaviour change requires the coupled semantic, proof, and validator updates (§5).

### 2.3 USF validator rules — rank 3

**What it is.** The deterministic, read-only machine checks under `tools/` that enforce consistency across semantics, ADRs, proofs, references, Make/env/config, and implementation, and detect drift. Each validator is a deterministic, read-only checker that fails closed (any contradiction is an error and exit 1), normalises no aliases, and writes no runtime file.

**What it can decide.** Whether the artefacts are mutually consistent; whether a claim is **admissible** (e.g. that a "zero-gap" or "delivered-and-proven" assertion is permitted); whether a gate passes or fails; and whether the repository is in a state safe to act on. It decides **pass/fail**, fail closed on ambiguity, with explicit exit codes (`0` pass, `1` finding, `2` bad input; `--strict` makes warnings fatal).

**What it cannot decide.** It **MUST NOT become the source of product semantics by itself.** A validator enforces semantics and ADRs; it does not invent them. A validator rule that contradicts an accepted semantic definition or ADR is a **defect in the validator**, not a new authority. It cannot certify behaviour as *exercised* (that is proof, rank 4).

**How future AI MUST use it.** As the **gate that must be green** before claiming consistency or completeness. An agent **MUST** run the validators after any change and **MUST NOT** treat a change as landed while a validator fails. An agent **MUST NOT** weaken a validator rule to make a change pass; strengthening or adding rules to cover new semantics is required (§5), weakening to hide drift is forbidden.

**Conflict behaviour.** Validators outrank proof, source, and reports: if the code or a report says "fine" but a validator finds a contradiction, the validator wins and the state is failing. Validators are **below** semantics and ADRs: a validator that disagrees with accepted semantics/ADRs is fixed to match them, not used to override them.

**Evolution.** When semantics or ADRs introduce a new class of behaviour, a validator rule **MUST** be added or extended to enforce it; the source-of-truth policy itself is enforced, and its absence fails. Validators **MUST** remain falsifiable: negative controls (deliberately broken fixtures) **MUST** demonstrate that the validators catch the violations they claim to catch.

### 2.4 Runtime proof evidence — rank 4

**What it is.** Executed, recorded, commit-pinned evidence under `evidence/` that exercises defined behaviour, graded on an explicit proof ladder and tagged with the provider class and substrate used. USF uses a seven-level ladder **L0 Discovery → L1 Executable → L2 Contract → L3 Behaviour → L4 Substrate (real local) → L5 Resilience → L6 Foundation**, with each record carrying `proofLevelClaimed` vs `proofLevelObserved`, provider-usage booleans (`mockProviderUsed`, `inMemoryProviderUsed`, `realLocalProviderUsed`, `externalSandboxProviderUsed`, `liveSubstrateUsed`), and a master index pinned to the current commit.

**What it can decide.** Whether, and to what level, a defined behaviour was actually exercised; on which **provider class** and substrate; whether the evidence is **fresh** (its commit equals the current commit) or **stale**; and whether a claim is **overclaimed** (claimed level above observed). It is the authority on **what happened**.

**What it cannot decide.** It **does not by itself define intended behaviour** — proofs are evidence, not substitutes for semantic definition, and a green graph is not treated as sufficient proof. It cannot decide whether an exercised behaviour is *permitted* (that is an ADR). A passing proof of a forbidden or undefined behaviour is **a defect, not a justification**. Hermetic/mock evidence **cannot** decide that a live external provider works (Charter §6).

**How future AI MUST use it.** As **evidence to preserve and extend, honestly**. An agent **MUST NOT** weaken, delete, or relabel proofs; **MUST NOT** mark a proof's level, environment, provider class, or substrate to appear stronger than the evidence supports; and **MUST** re-collect and re-pin evidence when behaviour changes. An agent **MUST** classify hermetic vs live proof honestly and respect the live-provider floor (a live-provider minimum of level 4).

**Conflict behaviour.** Proof outranks source and reports as evidence of fact. Proof is **below** semantics and ADRs and validators: a proof cannot license behaviour that semantics do not define or an ADR forbids, and a proof that passes while a validator finds drift does not make the state valid. Proof that contradicts a report makes the report void if the report is stale (§4.3).

**Evolution.** Proofs climb the ladder over time; live-provider readiness adds higher rungs **without** removing hermetic proofs (Charter §2.4). Evidence is re-executed and re-pinned per commit; staleness is first-class and detectable. Production proof is deliberately limited to non-destructive health and synthetic smoke evidence; destructive proof belongs to lower environments.

### 2.5 USF source implementation — rank 5

**What it is.** The extracted application, package, and service code under `apps/`, `packages/`, `services/`, and related roots that **implements** the semantic contracts — for example a hexagonal API/BFF plus a web application and its packages with enforced import boundaries.

**What it can decide.** Only **what the code currently does**. It is authoritative about the present implementation state and nothing more.

**What it cannot decide.** It **does not define new behaviour.** New behaviour, permissions, routes, states, validation, errors, events, or provider semantics **MUST NOT** originate in source; they originate in semantics (rank 1) and are decided in ADRs (rank 2). Refactoring and replacement are permitted **only behind preserved contracts**. Source **MUST NOT** be read to *infer* missing semantics (§6).

**How future AI MUST use it.** As the thing to **make conform**, not the thing to **learn intent from**. An agent **MUST** change source to match semantics; when source and semantics disagree, the agent fixes the source (or, if the behaviour is intended, performs a coupled change to semantics/ADR/proof/validator first — §5). An agent **MUST NOT** justify a behaviour by pointing at the code that does it.

**Conflict behaviour.** Source is overridden by semantics, ADRs, validators, and proof. Source outranks only generated reports: USF's own current code is more authoritative about USF's present state than any summary. Source contradicting semantics is non-conformance (§4.1); source changing behaviour without coupled semantic update is drift (§4.6).

**Evolution.** Source evolves freely **behind preserved contracts**; any change that alters externally observable behaviour requires the coupled updates of §5.

### 2.6 Generated reports — rank 6 (lowest)

**What it is.** Human-oriented summaries generated from the artefacts above — readiness summaries, attestations, roll-ups, dashboards — produced under `evidence/` by the tooling.

**What it can decide.** Nothing authoritative. Reports **inform**; they do not govern.

**What it cannot decide.** A report **MUST NEVER override source semantic artefacts.** A report's "PASS" does not make the underlying state valid; if the evidence it summarizes is stale (its pinned commit ≠ the current commit) the PASS is **void** (§4.3). Reports **MUST NOT** be hand-edited to assert a status the artefacts do not support.

**How future AI MUST use it.** As a **convenience, never as the source of truth**. An agent **MUST NOT** treat a report as canonical; it **MUST** verify against the artefacts and re-generate the report from current state when in doubt. The runtime-inventory roll-up is *reported separately from formal proof readiness so runtime inventory closure cannot be mistaken for full proof* — USF preserves this separation.

**Conflict behaviour.** A report loses to every other class. A report that disagrees with the artefacts is regenerated, not believed.

**Evolution.** Reports are regenerated from current artefacts on each run; **staleness MUST be detectable** (commit-pinning). A report whose freshness cannot be verified **MUST** be treated as stale.

---

## 3. Cross-cutting authority rules

3.1 **Domain before order.** Resolve a conflict first by asking which class *owns the question* (§0.2). Use the numeric order (§1) only for genuine overlaps.

3.2 **Higher defines, lower conforms.** No artefact may use a lower-ranked source to override a higher-ranked one.

3.3 **Fail closed on ambiguity.** Where authority is genuinely unresolved, the state is **failing**: the validators fail closed and the agent stops (§6).

3.4 **Constitutional supremacy.** No ADR, validator, proof, source change, or report may violate the [Charter](./charter.md) or this Authority Model. Conflicts with the constitutional layer are resolved in favour of the constitutional layer.

---

## 4. Conflict resolution

For each scenario: the **ruling** (who wins) and the **required action**.

### 4.1 A source file conflicts with a semantic definition
**Ruling.** Semantics (rank 1) win; the source is **non-conformant**.
**Action.** If the semantic definition is the intended behaviour, fix the source to conform. If the source's behaviour is the genuinely intended one, do **not** edit semantics to match the code; instead perform a coupled change (§5): update the semantic definition **and** the governing ADR, proofs, and validator rules together, then bring the source into conformance. Until reconciled, the validators **MUST** fail closed.

### 4.2 A proof passes but an ADR forbids the behaviour
**Ruling.** The ADR (rank 2) wins over the proof (rank 4). A passing proof of a forbidden behaviour is **evidence of a defect**, not a justification.
**Action.** Remove or gate the forbidden behaviour (and the proof that exercises it), **or** — if the behaviour is now intended — change the ADR explicitly, with the coupled semantic, proof, and validator updates (§5). Do not keep a green proof of a forbidden behaviour.

### 4.3 A generated report says PASS but the evidence is stale
**Ruling.** The report (rank 6) is the lowest authority; **stale evidence voids the PASS**.
**Action.** Detect staleness by commit-pin (record commit ≠ current commit). Re-collect the proof evidence at the current commit and regenerate the report. Treat the prior PASS as void. Never act on a report whose freshness cannot be verified.

### 4.4 A mock/hermetic provider proof is used as live-provider evidence
**Ruling.** Forbidden (Charter §6). Hermetic evidence **cannot** satisfy a live-provider claim; the live-provider floor (a live-provider minimum of level 4) is not met by hermetic/in-memory/mock substrates.
**Action.** Relabel the evidence honestly by provider class and level; do not present it as live readiness. Production readiness **MUST fail rather than substitute mock responses for unavailable real providers.** The validators **MUST** catch a hermetic proof labelled as live (demonstrated by negative controls such as `in-memory-labelled-real-provider` and `fake-http-labelled-l4`).

### 4.5 Implementation changes without a semantic update
**Ruling.** This is **drift**. The change is non-conformant regardless of whether it compiles, passes existing tests, or produces a green report.
**Action.** Either revert the implementation to the semantics, or land the coupled change (§5): semantics + ADR + proof + validators (+ runbooks, Make/env/config as affected) in the same change. The validators **MUST** fail closed while implementation and semantics disagree.

### 4.6 General rule
Where a scenario is not listed: identify the question's owning domain (§2), apply the order (§1) for genuine overlaps, and if authority is unresolved, **stop and fail closed** (§3.3, §6).

---

## 5. Drift policy (change coupling)

A change is **drift** whenever it alters externally observable behaviour or governed semantics without updating the coupled artefacts in the **same change**. A behaviour change **MUST** update the capability definition, contracts, permissions, validation, errors, events, operational semantics, environment semantics, UI semantics, proofs, and validator rules together; USF holds this as policy.

The table states the **minimum** co-updates required by the kind of change. "✔" = MUST update; "△" = update if affected.

| Kind of change | Semantic defs (`spec/`) | ADR (`docs/adr/`) | Validators (`tools/`) | Proof evidence (`evidence/`) | Source | Runbooks (`docs/runbooks/`) | Make / env / config |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| New or changed **capability / behaviour** | ✔ | ✔ | ✔ | ✔ | ✔ | △ | △ |
| New or changed **permission / authorization** | ✔ | ✔ | ✔ | ✔ | ✔ | △ | △ |
| New or changed **route / endpoint / contract** | ✔ | △ | ✔ | ✔ | ✔ | △ | △ |
| New or changed **state / lifecycle / transition** | ✔ | △ | ✔ | ✔ | ✔ | △ | △ |
| New or changed **validation rule / error model** | ✔ | △ | ✔ | ✔ | ✔ | △ | △ |
| New or changed **event** | ✔ | △ | ✔ | ✔ | ✔ | △ | △ |
| New **provider** or **provider mode/class** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| New or changed **environment / config key / readiness gate** | ✔ | △ | ✔ | △ | △ | ✔ | ✔ |
| New or changed **command / Make target** | ✔ | △ | ✔ | △ | △ | ✔ | ✔ |
| New or changed **data ownership / migration / backup / restore** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | △ |
| New or changed **UI semantics** (for regeneration) | ✔ | △ | ✔ | ✔ | ✔ | △ | △ |
| **Decision reversal / supersession** | △ | ✔ | △ | △ | △ | △ | △ |

5.1 A change that updates only the implementation, or only a report, is **incomplete** and the validators **MUST** fail closed (§4.5).

5.2 Make/env/config changes are **semantic changes**, not incidental edits (Charter §5.13): every command **MUST** be dispositioned and validated, and generated environment artefacts **MUST** be regenerated from manifests, never hand-edited.

5.3 Proof evidence **MUST** be re-executed and re-pinned to the new commit for any behaviour-affecting change; carrying forward stale evidence is forbidden (§4.3).

5.4 ADRs are **added or superseded**, never silently rewritten to reverse a decision; supersession preserves lineage.

---

## 6. AI operating rule

Any AI agent (and any human) acting on USF **MUST** follow this protocol. It operationalizes Charter §7.

6.1 **Inspect the authority level first.** Before acting on any artefact, identify its authority class (§1) and the *domain of question* you are answering (§2). Decide which class governs **before** reading lower-ranked artefacts.

6.2 **Prefer semantic definition over source resemblance.** Derive intended behaviour from USF semantics, not from what the code, a screenshot, or a report appears to do. If semantics and source disagree, semantics define the target (§4.1).

6.3 **Preserve traceability.** Keep traceability from semantics and decisions to the USF evidence, proofs, and validator rules that back them. Never break or fabricate this traceability to make a change look cleaner.

6.4 **Never infer missing semantics from implementation alone.** If a needed semantic definition is **absent**, do **not** invent it from USF source and do **not** invent it freely. Instead **propose** the semantic definition together with its ADR and validator rule, and stop for that proposal to be accepted before implementing. Absent intent is a **stop condition**, not a guess.

6.5 **Never treat generated reports as canonical.** Verify against the underlying artefacts. Regenerate a report from current state rather than trusting a possibly-stale summary (§4.3).

6.6 **Never treat hermetic/mock proof as live external proof.** Respect provider classes and the live-provider floor. Classify evidence honestly and never relabel it upward (§4.4, Charter §6).

6.7 **Update coupled artefacts together.** Any behaviour-affecting change lands semantics + ADR + proof + validators (and affected runbooks and Make/env/config) in the **same change** (§5). A partial change is drift.

6.8 **Ask, stop, or fail when an authority conflict is unresolved.** If two classes genuinely conflict and the resolution is not determined by domain (§2) or order (§1); if a needed semantic, decision, or proof is missing; or if a required coupled update cannot be made — **stop and surface the conflict**. Do not proceed by preferring the convenient artefact. The validators **MUST** fail closed, and the agent **MUST NOT** claim completion, in an unresolved-conflict or drift state.

6.9 **The honest-completion bar.** An agent **MUST NOT** claim a change is complete, ready, or proven unless: the semantics define it, the ADRs permit it, the validators pass (fail-closed) over it, the proof evidence exercises it at an honestly-classified level and provider class with fresh commit-pinning, the source conforms, and no coupled artefact is left stale. Anything less is reported as incomplete.

---

## Adoption and amendment

This Authority Model is constitutional. With the [Charter](./charter.md) it stands above the ADR canon; ADRs **MUST** conform to it. It **MAY** be amended only by a deliberate, recorded constitutional decision that states what changed and why. An amendment **MUST NOT** lower the live-provider proof floor (§2.4, §4.4), weaken the fail-closed-on-ambiguity rule (§3.3, §6.8), or permit inference of missing semantics from implementation (§6.4) without an explicit, evidenced constitutional decision.
