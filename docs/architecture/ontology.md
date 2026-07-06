# USF Ontology and Meta Model

| | |
|---|---|
| **Document type** | Semantic meta-model (foundational) |
| **Status** | **Draft / Foundational** |
| **Repository** | `usf` (this repository) — the clean canonical target |
| **Follows** | [`charter.md`](./charter.md), [`authority-model.md`](./authority-model.md), [`standards-profile.md`](./standards-profile.md) — and MUST be consistent with all three |
| **Authority level** | Belongs to **USF semantic definitions** (Authority Model §1, rank 1). It is the *meta-model* of the semantic corpus — it defines the concepts the concrete corpus instantiates; it is not the corpus itself. |
| **Evidence basis** | Grounded in USF's own self-defined artefacts — the semantic corpus, ADRs, validators, and recorded proof evidence held inside this repository. Source paths are held in USF's own source-import registry and introduce no external naming into USF. |

> **Normative language.** Requirement words follow BCP 14 as defined in [`standards-profile.md`](./standards-profile.md) §6. Only uppercase forms are normative.
>
> **Scope note.** This is a pragmatic, domain-specific meta-model. USF does **not** claim conformance to any formal ontology standard (OWL/RDF/etc.); "ontology" here means the catalogue of core nouns, their meanings, and their relationships.

---

## 1. Status

1.1 **Status: Draft / Foundational.**

1.2 This document **follows** the Charter, the Authority Model, and the Standards Profile, and **MUST** be consistent with them. Where it appears to conflict with any of the three, the other document governs and this ontology is corrected.

1.3 It defines the **conceptual model** that later machine-readable artefacts will formalise: taxonomy, vocabulary, schemas, registries, ADRs, validators, evidence envelopes, source-import maps, and implementation extraction.

1.4 This document **does not itself create those artefacts**. It defines the nouns, relationships, constraints, and authority roles those artefacts must follow. Initial exact shapes were deferred to §18; later, under directive, the 23 draft schema files and an advisory validator were authored and are recorded in §18 (see schema-authoring §26 Amendment A), while active maturity and real-instance validation remain deferred.

---

## 2. Purpose

2.1 The **ontology** defines the core nouns of USF — the stable concepts every later artefact and every future agent reasons over.

2.2 The **meta model** defines how those nouns relate, how they constrain one another, which are authoritative versus evidence versus implementation, and which later become taxonomy, vocabulary, schema, registry, ADR, validator, or implementation artefacts.

2.3 The ontology exists to **prevent future AI agents from guessing concepts from source files alone.** A concept is real because it is defined here and (later) in the semantic corpus — not because a directory or a class happens to exist.

2.4 The ontology **preserves USF's own source lineage** by giving that knowledge **stable USF concepts**. USF's self-defined source-import registry records a large platform; the ontology is the vocabulary into which that intent is mapped as clean semantics.

2.5 The ontology lets **source evidence be transformed into clean USF semantics**: every historical element enters USF as a referenced, dispositioned concept instance, never as an unexamined copy (Standards Profile §10).

---

## 3. Relationship to Existing Foundational Documents

### 3.1 Relationship to the Charter

The ontology is how the Charter's principles ([`charter.md`](./charter.md) §5–§7) become a usable concept system:

- **Semantic-first** — the ontology makes *Semantic Contract* and *Capability* the primary nouns; implementation nouns (*Application*, *Package*, *Adapter*) are explicitly subordinate.
- **Evidence-backed** — *Evidence* and *Proof* are first-class concepts that every authoritative claim must connect to.
- **AI safety** — §14 (forbidden inferences) and §15 (AI reasoning rules) are part of the model, not an afterthought.
- **Internal provability** — *Proof Level*, *Provider Mode*, and *Environment* make hermetic proof a recorded property of every claim.
- **External-provider adaptability** — the provider/environment meta-model (§9) treats live-provider evidence as a higher rung, never a replacement.
- **Clean final-state naming** — §4 forbids migration-phase concepts; *Disposition* + *Source Reference* keep historical names out of USF paths.
- **No knowledge loss** — *Source Reference* + *Disposition* require that no historical element disappears without a recorded treatment.
- **Source-aware but not source-subordinate** — *Source Reference* is rank-5 source lineage held in USF's own source-import registry; it grounds concepts but never defines authority.
- **Make/env/config as semantic assets** — *Command* and *Configuration* are first-class concepts, not incidental scripts.

### 3.2 Relationship to the Authority Model

The ontology fits the authority order ([`authority-model.md`](./authority-model.md) §1) by tagging each concept with the authority level it primarily belongs to:

| Authority level | Concepts primarily at this level |
|---|---|
| **1 — USF semantic definitions** | Foundation, Capability, Semantic Contract, Interface (as contract), Event (as contract), Workflow (as contract), Data Model (as contract), Migration (as contract), Configuration (as contract), Provider Mode, Environment, UI Semantic Model, Port, Registry, **and this ontology itself** |
| **2 — USF ADRs** | ADR |
| **3 — USF validator rules** | Validator |
| **4 — Runtime proof evidence** | Proof, Proof Level, Evidence (proof-evidence kind), Observability Signal (as evidence), Audit Event (as evidence) |
| **5 — USF source implementation** | Application, Package/Module, Service, Adapter, Command (as executable), Backup/Restore (as operation), Source Reference, Disposition (the act of dispositioning an entry in USF's own source-path registry) |
| **6 — Generated reports** | Generated Report |
| **cross-cutting actor** | AI Agent |

The ontology **belongs to USF semantic definitions** and is therefore **high authority** (rank 1). It does not change the order; it organises concepts within it.

### 3.3 Relationship to the Standards Profile

The ontology supplies the concepts that the Standards Profile's later artefacts will formalise:

- **Taxonomies** classify the concepts here (e.g. capability categories, provider classes, proof levels).
- **Vocabularies** fix the closed value sets the concepts reference (disposition values, provider modes, environment classes).
- **Schemas** (JSON Schema, Standards Profile §8) give each concept a machine-validatable shape.
- **Registries** index concept instances (Standards Profile §9 registry standard).
- **ADR templates** realise the *ADR* concept (Standards Profile §19).
- **Validator rules** enforce the relationships and cardinalities defined here (Standards Profile §18).
- **Source-reference rules** realise the *Source Reference* + *Disposition* concepts (Standards Profile §10).
- **Evidence envelopes** realise the *Evidence* + *Proof* concepts (Standards Profile §11).
- **Provider/environment classifications** realise the *Provider Mode* + *Environment* concepts (Standards Profile §12–§13).
- **AI agent operating rules** realise the *AI Agent* concept (Standards Profile §20).

---

## 4. Ontology Design Principles

4.1 Concepts **MUST** represent **stable semantic meaning**, not a migration phase or a moment in time.

4.2 Concept names **MUST NOT** use `v2`, `legacy`, `old`, `new`, `temp`, `transitional`, or a redundant `usf` segment (Charter §1.3, Standards Profile §17).

4.3 Concepts **SHOULD** be named by **domain meaning**, not by source path or implementation structure.

4.4 Concepts **MAY** preserve historical names **only** as source references or quoted evidence (§8), never as USF concept or path names.

4.5 Every concept recorded in USF's source-import registry **MUST** have a **Disposition** (§5.5, §8).

4.6 A concept is **not authoritative merely because a source file exists.** Existence of code is rank-5 source evidence, not rank-1 authority.

4.7 A **Proof** can demonstrate that behaviour was exercised but **MUST NOT** define intended semantics by itself (Charter §5.9).

4.8 **Generated Reports** are summaries, never canonical ontology sources (Authority Model §2.6).

4.9 **Command** and **Configuration** concepts (Make targets, package scripts, env vars, config files, compose services) are **semantic assets** (Charter §5.13).

4.10 **Provider Mode** and **Environment** are **first-class semantic dimensions**, recorded on evidence and proof claims (Standards Profile §12–§13).

4.11 Future AI **MUST NOT** invent a missing concept from implementation resemblance (§14, §15; Authority Model §6.4).

---

## 5. Core Concept Catalogue

Each concept lists: **Definition**, **Authority role**, **Source evidence role** (how USF's own source-import registry grounds it), **Future artefacts**, **Relationships**, **AI guidance**. No artefact below is created here.

### 5.1 Foundation
**Definition.** The whole USF semantic system being built: the complete set of capabilities, contracts, evidence, decisions, validators, and the extracted implementation, governed as one foundation.
**Authority role.** Rank 1 (the system the semantic definitions describe). Meta-concept; contains all others.
**Source evidence role.** Recorded in USF's own source lineage as the "Universal Service Foundation" assurance graph and the platform it governs.
**Future artefacts.** The top-level USF spec index/registry under `spec/`.
**Relationships.** Foundation **contains** Capabilities; is **governed by** the constitutional layer; is **proven by** Proof; is **summarised by** Generated Reports.
**AI guidance.** Treat the Foundation as the bounded whole; never expand its scope by importing unmapped historical surface.

### 5.2 Capability
**Definition.** A bounded platform/domain ability with semantic meaning, source lineage, proof expectations, and implementation realisation. The primary unit of the foundation.
**Authority role.** Rank 1 (authoritative semantic definition). Realised by implementation, but never defined by it.
**Source evidence role.** Historically `v1-capability-closure.json` (75 capabilities), keyed by human name, with `category` (12 values), `status` (`delivered-and-proven`, `semantic-gap`, …), and a `semanticCompleteness` block of **ten facets**: lifecycle, stateModel, permissions, contracts, validation, errorModel, auditModel, readinessModel, proof, uiSemanticDefinition.
**Future artefacts.** Capability schema + capability registry under `spec/`; per-capability ADRs; validator rules; proof evidence.
**Relationships.** A Capability **is defined by** Semantic Contracts (covering its identity, behaviour, states, permissions, validation, errors, routes/interfaces, events, and UI journeys where applicable); **carries** Source References and a **proof level**; **is realised by** Applications, Services, Packages, Ports, Adapters; **participates in** Cross-capability interactions and Workflows.
**AI guidance.** A capability remains "proven" only while every facet cites authoritative backing; if any facet lacks it, the capability is a *gap*, not delivered. Never infer a capability from a folder.

### 5.3 Semantic Contract
**Definition.** A normative statement of intended behaviour or structure — what MUST be true — independent of any particular implementation.
**Authority role.** Rank 1 (the heart of the authoritative layer).
**Source evidence role.** Historically the `capability-*.json` facet templates and the per-facet content of `semanticCompleteness`, each naming the rule that enforces it (`coverage.enforcedBy → tools/v2-readiness/src/rules/rNN`).
**Future artefacts.** Contract schemas; the semantic corpus under `spec/`.
**Relationships.** A Semantic Contract **defines** a Capability facet, Interface, Event, Data Model, or Configuration shape; **is supported by** Source References; **is constrained by** ADRs; **is enforced by** Validators; **is exercised by** Proofs; **is implemented by** source (Authority Model §2.1, §4.1).
**AI guidance.** What satisfies a contract is conforming implementation + passing proof; what *defines* it is the contract itself. Code that disagrees with a contract is non-conformant, not a redefinition.

### 5.4 Source Reference
**Definition.** A reference to historical or current source evidence that grounds a USF concept.
**Authority role.** Rank 6 (lineage/evidence). Grounds concepts; never defines authority.
**Source evidence role.** Historically the `sourceFileRefs`/`evidence` fields throughout the corpus; the bijective file inventory (`v1-file-inventory.json`, ~1673 tracked files) and path map (`v1-to-v2-path-map.json`).
**Future artefacts.** A source registry under `spec/`/`evidence/` (the `source-reference`/`source-disposition` draft schemas now exist — see schema-authoring §26 Amendment A; the registry artefact deferred).
**Relationships.** A Source Reference **points at** a source element; **carries** a Disposition; **maps to** a related USF artefact; **may carry** a Proof reference.
**AI guidance.** A Source Reference MUST be able to express: **repository**, **commit/tag**, **path**, **source kind**, **semantic role**, **evidence role**, **disposition**, **rationale**, **related USF artefact**, and **proof reference (if applicable)**. Citing a source is not adopting it.

### 5.5 Disposition
**Definition.** The declared treatment of a source element as it is mapped into (or excluded from) USF.
**Authority role.** Rank 6 act of mapping; recorded so no knowledge is lost.
**Source evidence role.** Historically a closed disposition vocabulary — files: `reuse-unchanged`, `git-move`, `split`, `merge`, `regenerate`, `archive-evidence`, `delete-after-proof`, `refactor-behind-contract`, `replace-retain-contract`; commands: `carry`/`merge`/`retire`; tests: `carry`/`retarget`/`promote-to-conformance`/`retire`.
**Future artefacts.** A disposition vocabulary + import map (deferred, §18). **Not created here.**
**Relationships.** A Disposition **belongs to** a Source Reference and **resolves to** a target USF concept (or to an explicit exclusion).
**AI guidance.** Conceptual disposition values include: **preserve, rename, refactor, merge, split, replace, retire, defer, reject.** No source element may disappear without one (§8.).

### 5.6 Evidence
**Definition.** Information used to support a semantic, proof, source, or operational claim.
**Authority role.** Rank 4 (proof evidence) down to rank 6 (reports), depending on kind.
**Source evidence role.** Recorded in USF's own source lineage as a per-domain evidence corpus (each typically machine `.json` + human `.md`) plus per-proof proof-evidence records indexed by a proof-evidence index.
**Future artefacts.** An evidence envelope schema under `evidence/` (draft `evidence-envelope.schema.json` now exists — see §26 Amendment A; evidence instances deferred).
**Relationships.** Evidence **supports** Semantic Contracts and Capabilities; **references** Source and Environment; **declares** Provider Mode; **is summarised by** Generated Reports.
**AI guidance.** Distinguish kinds and never conflate them: **raw source evidence**, **semantic evidence**, **runtime proof evidence**, **normalised evidence**, **generated report**, **attestation**, **source import evidence**. Absence of evidence is not evidence of absence (§14).

### 5.7 Proof
**Definition.** Execution-backed evidence that a claim has been exercised.
**Authority role.** Rank 4. Authority on *what happened*, not *what is intended*.
**Source evidence role.** Historically per-proof records with `proofLevelClaimed` vs `proofLevelObserved`, provider-usage booleans (`mockProviderUsed`, `inMemoryProviderUsed`, `realLocalProviderUsed`, `externalSandboxProviderUsed`, `liveSubstrateUsed`), commit-pin freshness, and a 19-case negative-control suite proving proofs can fail.
**Future artefacts.** Proof evidence records + collectors under `evidence/`/`tools/`.
**Relationships.** A Proof **exercises** a Semantic Contract / Capability; **produces** Evidence; **declares** Proof Level, Provider Mode, Environment; **has** failure semantics.
**AI guidance.** A proof MUST carry: **proof level**, **proof claim**, **observed evidence**, **provider mode**, **environment**, **freshness**, **failure semantics**. Never relabel a proof upward (§9, §10).

### 5.8 Proof Level
**Definition.** A level on the conceptual readiness/proof ladder describing how strongly a claim is proven.
**Authority role.** Rank 4 classification (a property of proof evidence).
**Source evidence role.** Historically a seven-level ladder in `capability-proof-definition.json`: **L0 Discovery → L1 Executable → L2 Contract → L3 Behaviour → L4 Substrate (real local) → L5 Resilience → L6 Foundation**, with `deliveredAndProvenMinimumLevel: 3` and `liveProviderMinimumLevel: 4`.
**Future artefacts.** A proof-level vocabulary (deferred, §18).
**Relationships.** A Proof **has** exactly one observed Proof Level; higher levels **require** lower ones; live-provider claims **require** the live floor.
**AI guidance.** The model recognises the levels *discovery, executable, contract, behaviour, substrate, resilience, foundation*; the **exact final vocabulary belongs to a later artefact** and MUST NOT be hard-frozen here. Claimed level MUST be ≤ observed level.

### 5.9 Provider
**Definition.** A service or dependency fulfilling a platform contract (a port).
**Authority role.** Spans: the *requirement* for a provider is rank 1 (semantic); a concrete provider Adapter is rank 5 (implementation).
**Source evidence role.** Historically `runtime-provider-inventory.json` (~69 providers) split into in-memory (16, e.g. `in-memory-event-bus`), real-local (`postgres-*`, `redis-*`, `s3-*`, `keycloak-*`, `clamav`, `temporal`, `windmill`, `lago`), and external/probe classes; plus `services/mock-oidc`.
**Future artefacts.** Provider registry + provider-mode vocabulary (vocabulary + draft `provider-mode.schema.json` now exist — see §26 Amendment A; provider registry deferred).
**Relationships.** A Provider **fulfils** a Port through an Adapter; **runs in** a Provider Mode; **is permitted by** Environment policy.
**AI guidance.** Mock/hermetic providers are **valid for internal proof**; a **mock IdP is valid** for hermetic platform validation; hermetic proof **MUST NOT** be mislabelled as live external proof (§9; Charter §6).

### 5.10 Provider Mode
**Definition.** The declared class of provider evidence used by a capability or proof.
**Authority role.** Rank 1 as a semantic dimension; recorded on rank-4 proof evidence.
**Source evidence role.** Historically the closed class set `hermetic` / `compose-local` / `sandbox-external` / `live-external` / `none`, selected by a single `USF_PROVIDER_MODE`, with per-environment modes (`semantic-dev`, `compose-real-local`, `prod-shaped-sandbox`, `live-readiness-only`).
**Future artefacts.** Provider-mode vocabulary + validator. *(Superseded — see schema-authoring-standard §26 Amendment A: the provider-mode value set and a draft `provider-mode.schema.json` now exist, enforced by the draft/advisory validator; selector wiring + active maturity remain deferred.)*
**Relationships.** Provider Mode **classifies** a Provider's use; **is constrained by** Environment; **is recorded on** Proof and Evidence.
**AI guidance.** First-class and proof-relevant. Never infer a stronger provider mode than the substrate actually used (§14).

### 5.11 Environment
**Definition.** The execution context in which behaviour or proof occurs.
**Authority role.** Rank 1 as a semantic dimension; recorded on rank-4 evidence.
**Source evidence role.** Historically the four-stage ladder (dev/test/staging/prod) with `environment-readiness-gates.json` (4 gates), `environment-capability-matrix.json` (70 capabilities × 4 environments), and the e2e profile split (internal/build/identity = hermetic; discovery/external/prod = live).
**Future artefacts.** Environment vocabulary + capability-environment matrix (vocabulary + draft `environment.schema.json` now exist — see §26 Amendment A; the matrix deferred).
**Relationships.** Environment **constrains** Provider Modes and **scopes** evidence/readiness claims.
**AI guidance.** Conceptual classes: **local, hermetic, integration, staging, production-shaped, production/live**. **Production-shaped is not automatically production-live.** Environment MUST be explicit in every evidence and proof claim (§9).

### 5.12 Application
**Definition.** A deployable or user-facing runtime surface.
**Authority role.** Rank 5 (implementation), realising capabilities.
**Source evidence role.** Historically two canonical apps: `apps/platform-api` (hexagonal BFF/API) and the web app (`apps/web` target, historically `apps/enterprise-app`); rule R15 fixes the canonical app roots.
**Future artefacts.** Application directory contracts; capability-coverage map.
**Relationships.** An Application **realises** Capabilities; **exposes** Interfaces and UI Semantic Models; **runs in** Environments; **has** proof requirements.
**AI guidance.** Distinguish its **semantic role** (which capabilities it serves) from its **implementation role** (how it is built). Capability coverage and environment scope MUST be explicit.

### 5.13 Package / Module
**Definition.** A reusable implementation unit with enforced boundaries.
**Authority role.** Rank 5 (implementation). Implementation structure is **not** semantic authority.
**Source evidence role.** Historically ~41 packages with `architecture` metadata and import boundaries: core leaves (`domain-identity`, `authorisation-runtime`, `platform-errors`, `platform-runtime-context`), runtimes, `contracts-*`, `adapters-*`, `platform-observability`/`platform-logging`, `ui-design-system`.
**Future artefacts.** Package directory contracts; import map.
**Relationships.** A Package **implements** parts of Capabilities/Services; **respects** dependency direction; **is bounded by** import rules.
**AI guidance.** Never treat a package boundary as a capability boundary. Implementation structure may be refactored behind preserved contracts (Authority Model §2.5).

### 5.14 Service
**Definition.** A runtime or logical service that fulfils one or more semantic contracts.
**Authority role.** Rank 5 (implementation) realising rank-1 contracts.
**Source evidence role.** Historically `services/mock-oidc` and the ~54 compose services (databases, identity, secrets, observability, workflow, antivirus, etc.).
**Future artefacts.** Service contracts; service registry.
**Relationships.** A Service **exposes** Interfaces (command/query roles); **depends on** other Services/Providers; **emits** Observability Signals and Audit Events; **has** proof expectations.
**AI guidance.** A service is authoritative only about what it *does*; what it *should do* lives in its contracts. Record interface, command/query role, dependencies, provider relationships, observability, audit, and proof expectations.

### 5.15 Port
**Definition.** A semantic boundary through which a service interacts with external or internal systems.
**Authority role.** Rank 1 (a contract boundary), realised by Adapters at rank 5.
**Source evidence role.** Historically the hexagonal `usecases → ports → adapters` model; `authorisation-runtime` is an explicit "leaf port node"; in-memory↔real parity is defined as "same **port** interface".
**Future artefacts.** Port contracts in the semantic corpus.
**Relationships.** A Port **is defined by** a Semantic Contract; **is fulfilled by** Providers **through** Adapters.
**AI guidance.** The port is the stable contract; adapters and providers behind it may change. Never let an adapter's behaviour redefine the port.

### 5.16 Adapter
**Definition.** An implementation binding a Port to a concrete provider, protocol, storage mechanism, or external dependency.
**Authority role.** Rank 5 (implementation).
**Source evidence role.** Historically the `adapters-*` packages (`adapters-postgres`, `-redis`, `-keycloak`, `-object-storage`, `-clickhouse`, `-loki`, `-brevo`, `-opentelemetry`, …) — the **only** packages permitted to import external SDKs; in-memory adapters paired to real ones by proven parity.
**Future artefacts.** Adapter directory contracts.
**Relationships.** An Adapter **fulfils** a Port; **binds** a Provider in a Provider Mode.
**AI guidance.** An adapter MUST identify the **port** and **provider mode** it fulfils. Swapping adapters MUST preserve the port contract and the parity properties.

### 5.17 Interface
**Definition.** A callable contract — an API route, command, query, event handler, CLI, or internal service boundary.
**Authority role.** Rank 1 as a contract; rank 5 as an implementation endpoint.
**Source evidence role.** Historically `api-runtime`/`graphql-api-runtime`, the runtime route inventory (~235 routes), `operational-semantics.json` `runtimeCommandLinks`, and the OpenAPI drift hard gate.
**Future artefacts.** Interface contracts (draft `interface-contract.schema.json` now exists — see §26 Amendment A; OpenAPI format deferred).
**Relationships.** An Interface **is exposed by** a Service/Application; **is defined by** a Semantic Contract; **may be** API/command/query/event/CLI/internal; **is exercised by** Proofs.
**AI guidance.** Where a semantic interface contract exists, code conforms to it; interfaces MUST NOT be inferred from handlers when a contract exists (Standards Profile §15).

### 5.18 Event
**Definition.** A semantic occurrence that can trigger, record, or communicate state.
**Authority role.** Rank 1 as an event contract; rank 4 as an emitted runtime occurrence (evidence).
**Source evidence role.** Historically `event-semantics.json` (10 events; fields `eventName`, `schema`, `schemaVersion`, `idempotencyKey`, `orderingExpectation`, `retryPolicy`, `dlqPolicy`, `retention`, `privacyClassification`, `tenantIsolation`), distinguishing **canonical** from **test-only** events; plus `cross-capability-interactions.json` (the `event` interaction type) and the `audit-events` package.
**Future artefacts.** Event contracts (draft `event-contract.schema.json` now exists — see §26 Amendment A; AsyncAPI format deferred).
**Relationships.** An Event **connects** capabilities (cross-capability interactions); **participates in** Workflows; **is recorded as** Evidence; **may produce** Audit Events.
**AI guidance.** Define the event contract (schema, ordering, idempotency, DLQ, retention) before emitting; never invent an event in code (Standards Profile §15).

### 5.19 Workflow
**Definition.** An ordered or conditional set of operations across capabilities, services, events, providers, and environments.
**Authority role.** Rank 1 as a workflow contract; rank 5 as an orchestrated implementation.
**Source evidence role.** Historically the `workflow` interaction type in `cross-capability-interactions.json`, the Temporal/Windmill workflow providers, and `runtime-workflow-inventory.json`.
**Future artefacts.** Workflow contracts.
**Relationships.** A Workflow **crosses** Capabilities and Services; **sequences** Interfaces/Events; **runs in** Environments with declared Provider Modes; **is exercised by** Proofs (incl. resilience).
**AI guidance.** A workflow's compensation, ordering, and consistency semantics are contract-level; do not infer them from orchestration code.

### 5.20 Command
**Definition.** A human- or machine-executable operation.
**Authority role.** Rank 1 as a governed semantic asset; rank 5 as an executable script.
**Source evidence role.** Historically the `Makefile` + `make/*.mk` (with `make all` the "authoritative full-confidence command"), ~110 `proof:*` scripts, 212 npm scripts, and `v2-command-map.json` (377 commands dispositioned `carry`/`merge`/`retire`), enforced by rule R11.
**Future artefacts.** A command catalogue + coverage validator.
**Relationships.** A Command **may execute** Validators, Proofs, Imports, Builds, or runtime operations; **declares** environment scope and failure semantics; **emits** Evidence.
**AI guidance.** Commands are **semantic assets, not incidental scripts** (§11). Include **Make targets, package scripts, CLI commands, proof commands, validation commands, import commands.** None may be deleted/renamed without a Disposition and semantic review.

### 5.21 Configuration
**Definition.** A declared setting that influences behaviour.
**Authority role.** Rank 1 as a config contract; rank 5 as an instantiated value (generated, not hand-edited).
**Source evidence role.** Historically `v1-config-contract-catalogue.json` (64 typed keys: `key`, `type`, `required`, `secret`, `secretTier`, `consumerProjection`, `restartOrReload`), `environment-and-config-catalog.json` (39 assets), and `.env` files **generated from `config/environments/*.json` manifests** (ADR-0072), never hand-edited.
**Future artefacts.** Config contracts + generation/validation.
**Relationships.** Configuration **influences** Services, Providers, Environments, and Proofs.
**AI guidance.** Include **env vars, config files, compose settings**, with **secret classification, provider relevance, environment relevance, proof relevance.** Regenerate from manifests; never hand-edit generated config (§11).

### 5.22 Data Model
**Definition.** Conceptual data structures, records, identifiers, relationships, and persistence contracts.
**Authority role.** Rank 1 as a data contract; rank 5 as schema/migrations in source.
**Source evidence role.** Historically `data-and-migration-plan.json`: canonical store **PostgreSQL with schema-per-tenant**, Redis/ClickHouse/MinIO as external persistent services, `connectionRoles`, `rls`/`rlsBypass` (transaction-scoped), `perTenantSchema`, and the `apps/platform-api/src/db` layout (`migrate.ts`, `seed.ts`, `reset.ts`, `migrations/`).
**Future artefacts.** Data-model contracts + tenancy invariants.
**Relationships.** A Data Model **backs** Capabilities; **is changed by** Migrations; **is protected by** tenancy isolation; **is exercised by** Proofs.
**AI guidance.** Tenancy isolation (RLS) and identifier semantics are contract-level invariants; preserve them across any refactor.

### 5.23 Migration
**Definition.** A controlled change to data shape, storage structure, or persistence semantics.
**Authority role.** Rank 1 as a migration contract/policy; rank 5 as migration files.
**Source evidence role.** Historically a **forward-only, checksum-immutable** migration chain (carry `001..034` verbatim, append `035+`), a `schemaMigrationsTable`, and `destructiveOpControls` (`checksumImmutability`, `restoreGuard`, `environmentRegistry`).
**Future artefacts.** Migration policy + checksum/immutability validator.
**Relationships.** A Migration **changes** a Data Model; **is governed by** ADR + environment policy; **must be** rehearsed (rollback) and proven.
**AI guidance.** **Never edit a committed migration**; add forward-only files. A migration is a behaviour change requiring coupled updates (Authority Model §5).

### 5.24 Backup / Restore
**Definition.** A proof-relevant operational capability that protects and recovers data.
**Authority role.** Rank 1 as an operational contract; rank 5 as the operation; rank 4 as the proof it works.
**Source evidence role.** Historically the `backupRestore` block in `data-and-migration-plan.json`, the `in-memory-backup-restore-provider` ↔ `pgbackrest` parity, and L5 backup/restore resilience evidence.
**Future artefacts.** Backup/restore contracts + resilience proofs.
**Relationships.** Backup/Restore **operates on** Data Models; **is exercised by** Proofs; **emits** Evidence.
**AI guidance.** Carry the evidence lesson (§10): **if backup/restore evidence is emitted, collection MUST preserve it; missing collected evidence MUST fail closed; generated reports MUST NOT hide missing raw evidence.**

### 5.25 Observability Signal
**Definition.** Logs, metrics, traces, spans, events, resource attributes, or runtime proof outputs used to understand behaviour.
**Authority role.** Rank 1 as an observability contract; rank 4 as emitted evidence.
**Source evidence role.** Historically `operational-semantics.json` (`observabilitySignals`, `metrics`, `logs`, `traces`, `alertConditions`), the assurance bar "0 routes without tracing/logging/metrics", and e2e observability-correlation evidence across Loki/Tempo/Sentry.
**Future artefacts.** Observability vocabulary (OTel-adapted, deferred).
**Relationships.** Observability Signals **are emitted by** Services; **support** Proof, audit, debugging, drift detection.
**AI guidance.** Observability is a **semantic asset**; removing or renaming a signal is a behaviour change requiring semantic review, never an incidental refactor (§13).

### 5.26 Audit Event
**Definition.** A semantically meaningful record of security-sensitive, state-changing, or accountability-relevant behaviour.
**Authority role.** Rank 1 as an audit requirement; rank 4 as a recorded event.
**Source evidence role.** Recorded in USF's own source lineage as the `auditAction` field on capabilities, the assurance bar "0 mutations without audit", and the audit evidence corpus.
**Future artefacts.** Audit-event contracts + coverage validator.
**Relationships.** An Audit Event **records** a privileged/mutating operation; **is required by** Capability audit models.
**AI guidance.** Every mutating or privileged action MUST have a defined audit semantic; never strip audit as a refactor (§13).

### 5.27 UI Semantic Model
**Definition.** The meaning of a user-facing interaction — journeys, states, validation, errors, permissions, accessibility requirements, and workflows — independent of visual design.
**Authority role.** Rank 1 (semantic). The visual layer is rank-5 implementation that may be regenerated.
**Source evidence role.** Historically `ui-capability-model.json` (28 UI capabilities, 12 personas; routes, forms, tables, commands, states, a11y, telemetry) conforming to `ui-definition.schema.json`, with the rule that the generator "must never read old JSX".
**Future artefacts.** UI semantic corpus + journey proofs.
**Relationships.** A UI Semantic Model **maps to** Capabilities and Proofs (e2e journeys); **relates to** commands/queries/events; **carries** accessibility requirements.
**AI guidance.** UI may be **regenerated or redesigned only if semantic behaviour and proof expectations are preserved.** Historical UI source is semantic **evidence**, not final design authority. Visual redesign is not semantic deletion (§12).

### 5.28 ADR
**Definition.** A normative decision record connected to semantics, evidence, source references, proof evidence, validators, and AI-alignment rules.
**Authority role.** Rank 2.
**Source evidence role.** Historically `v2-decision-catalog.json` (74 accepted decisions) + `v2-decision-lineage.json` (74 evidence-backed lineage records), with untraced decisions rejected (rule R13).
**Future artefacts.** `docs/adr/` ADRs + ADR schema (draft `adr.schema.json` now exists — see §26 Amendment A; ADR canon deferred).
**Relationships.** An ADR **decides/constrains** Semantic Contracts, Source Dispositions, provider strategy, environment policy, naming policy, and validator rules.
**AI guidance.** ADRs are binding (Authority Model §2.2); must carry references, invariants, permitted-change, forbidden-drift, consequences, and AI-alignment rules; never generic prose (Standards Profile §19).

### 5.29 Validator
**Definition.** Executable enforcement of semantic, evidence, ADR, registry, source-reference, provider, environment, and proof consistency.
**Authority role.** Rank 3.
**Source evidence role.** Historically `tools/v2-readiness/` (~60 rules, R1–R62; "fails closed", "normalises no aliases", "writes no runtime file"; exit codes; golden + negative-control tests) and `tools/architecture/`.
**Future artefacts.** `tools/` validators + machine-readable reports.
**Relationships.** A Validator **enforces** contracts/relationships/cardinalities; **fails closed** on ambiguity; **produces** Generated Reports.
**AI guidance.** Never weaken a rule to pass; add rules for new semantics; validators enforce but never define product semantics (Authority Model §2.3).

### 5.30 Registry
**Definition.** An index/cross-reference map that lets concepts, artefacts, schemas, source references, and evidence resolve consistently.
**Authority role.** Rank 1 (part of the semantic-definition corpus as its resolution layer).
**Source evidence role.** Historically `universal-service-foundation-registry.json` (121 capabilities, **data-only** — asserts no implementation), and the e2e `suite-registry`/`persona-registry`/`scenario-manifest`/`ui-contract` registries ("no test without a registry entry").
**Future artefacts.** `spec/registries/`.
**Relationships.** A Registry **resolves** Concepts, Artefacts, Schemas, Source References, and Evidence; **enables** bijection/coverage validation.
**AI guidance.** Register before referencing; a registry indexes — it does not by itself assert that an indexed thing is implemented or proven.

### 5.31 Generated Report
**Definition.** A derived summary from source, evidence, proof, or validator output.
**Authority role.** Rank 7 (lowest).
**Source evidence role.** Historically the `usf-audit/*-report.json` roll-ups and attestations, with the discipline that "the semantic graph is not treated as sufficient proof" and runtime-inventory closure is reported separately from formal proof readiness.
**Future artefacts.** Regenerable reports under `evidence/`.
**Relationships.** A Generated Report **summarises** Evidence/Proof/Validator output; **does not define** authority.
**AI guidance.** Reports are useful but **lowest authority**; **staleness MUST be detectable** (commit-pin); reports **MUST NEVER override** raw evidence or semantic definitions (§10, §14).

### 5.32 AI Agent
**Definition.** A future autonomous or assisted implementation/review/generation actor operating on USF.
**Authority role.** Cross-cutting actor; holds no authority — it is bound by the authority order.
**Source evidence role.** Charter §7, Authority Model §6, Standards Profile §20.
**Future artefacts.** None (governs process); its claims are checked by Validators, not trusted.
**Relationships.** An AI Agent **consumes** ontology, semantics, ADRs, validators, evidence, and source references **according to** the authority model.
**AI guidance.** Allowed reasoning sources: the constitutional layer, this ontology, semantics, ADRs, validators, evidence, source references. Forbidden inference patterns: §14. Authority-conflict behaviour: **stop/fail** (§15; Authority Model §6.8). Source-lineage obligation: preserve and cite (§8).

---

## 6. Meta Model Relationships

6.1 In prose, the core relationships are:

- The **Foundation contains Capabilities.**
- A **Capability is defined by Semantic Contracts.**
- A **Semantic Contract is supported by Source References**, **constrained by ADRs**, **enforced by Validators**, and **exercised by Proofs.**
- A **Proof produces Evidence.**
- **Evidence references Source and Environment** and **declares Provider Mode.**
- A **Capability is realised by Applications, Services, Packages, Modules, Ports, and Adapters.**
- A **Service exposes Interfaces.**
- An **Interface may be an API, command, query, event, CLI, or internal boundary.**
- An **Event may participate in Workflows.**
- A **Workflow crosses Capabilities and Services.**
- An **Application exposes UI Semantic Models.**
- A **UI Semantic Model maps to Capabilities and Proofs.**
- A **Command may execute Validators, Proofs, Imports, Builds, or runtime operations.**
- **Configuration influences Services, Providers, Environments, and Proofs.**
- A **Provider fulfils Ports through Adapters.**
- An **Environment constrains Provider Modes and evidence claims.**
- An **ADR decides or constrains** Semantic Contracts, Source Dispositions, provider strategy, environment policy, naming policy, and validation rules.
- A **Registry resolves** Concepts, Artefacts, Schemas, Source References, and Evidence.
- **Generated Reports summarise Evidence but do not define authority.**
- **AI Agents consume** ontology, semantics, ADRs, validators, evidence, and source references **according to the Authority Model.**

6.2 Relationship table (subject → relationship → object), with the authority note that governs the edge:

| Subject | Relationship | Object | Authority note |
|---|---|---|---|
| Foundation | contains | Capability | rank 1 |
| Capability | is defined by | Semantic Contract | contract is authoritative, not the code |
| Semantic Contract | is supported by | Source Reference | source grounds, never defines (rank 6) |
| Semantic Contract | is constrained by | ADR | rank 2 constrains rank 1 changes |
| Semantic Contract | is enforced by | Validator | rank 3 enforces, never defines |
| Semantic Contract | is exercised by | Proof | rank 4 evidences, never defines |
| Proof | produces | Evidence | rank 4 |
| Evidence | references | Source, Environment | freshness + environment required |
| Evidence | declares | Provider Mode | honesty required (§9) |
| Capability | is realised by | Application, Service, Package, Port, Adapter | rank 5 conforms to rank 1 |
| Service | exposes | Interface | contract-first (§15) |
| Interface | may be | API / command / query / event / CLI / internal | — |
| Event | participates in | Workflow | event + workflow contracts |
| Workflow | crosses | Capability, Service | cross-capability interaction |
| Application | exposes | UI Semantic Model | UI semantics are rank 1 |
| UI Semantic Model | maps to | Capability, Proof | regenerate, do not invent |
| Command | executes | Validator, Proof, Import, Build, runtime op | command is a semantic asset |
| Configuration | influences | Service, Provider, Environment, Proof | generated from manifests |
| Provider | fulfils (via Adapter) | Port | adapter binds provider mode |
| Environment | constrains | Provider Mode, evidence claim | production-shaped ≠ live |
| ADR | decides/constrains | Contract, Disposition, policy, Validator rule | rank 2 |
| Registry | resolves | Concept, Artefact, Schema, Source Reference, Evidence | indexing, not assertion |
| Generated Report | summarises | Evidence, Proof, Validator output | rank 6, never overrides |
| AI Agent | consumes (per Authority Model) | all of the above | bound, holds no authority |

---

## 7. Cardinality and Ownership Rules

Conceptual and precise (not JSON Schema). "Authoritative" below means "treated as rank-1 truth".

7.1 A **Capability MUST have at least one Semantic Contract** before its implementation is authoritative.
7.2 A **Semantic Contract SHOULD have one or more Source References** when derived from USF's own source lineage.
7.3 A **Semantic Contract SHOULD have one or more Validator rules** once it is enforceable.
7.4 A **Proof MUST identify the claim it exercises.**
7.5 A **Proof MUST declare its Environment and Provider Mode.**
7.6 **Evidence MUST identify its source or generation process.**
7.7 A **Generated Report MUST identify the Evidence it summarises.**
7.8 A **Source Reference MUST have a Disposition** before its import is considered complete.
7.9 An **ADR MUST relate to at least one semantic concern** (a contract, disposition, or policy).
7.10 An **implementation MAY realise multiple Capabilities, but MUST NOT erase their semantic boundaries.**
7.11 A **Provider Adapter MUST identify the Port and Provider Mode it fulfils.**
7.12 A **UI journey SHOULD map to Capability semantics and Proof evidence** where available.
7.13 A **Capability MUST own exactly one canonical identity** (one concept, one owner, one definition); duplicates are a defect.
7.14 A **Migration MUST be forward-only and MUST NOT alter a committed prior migration.**

---

## 8. Source Import Meta Model

8.1 Source elements in USF's own source-import registry become USF concepts through a recorded mapping with these conceptual fields (the `source-reference`/`source-disposition`/`import-manifest` draft schemas now exist — see §26 Amendment A; the import map deferred):

- **Source element** — the concrete recorded source thing.
- **Source reference** — repository, commit/tag, path (§5.4).
- **Source kind** — see 8.2.
- **Semantic role** — the USF meaning it carries.
- **Disposition** — preserve / rename / refactor / merge / split / replace / retire / defer / reject (§5.5).
- **Target USF concept** — the concept (and later artefact) it maps to.
- **Evidence role** — raw / semantic / proof / normalised / report / attestation / source-import (§5.6).
- **Proof relationship** — the proof that backs it, if any.
- **Import rationale** — why this disposition.
- **Conflict notes** — disagreements with other sources or with accepted USF semantics.
- **Deferred work** — what remains.

8.2 **Source kinds** conceptually include: docs, semantic artefact, source file, test, e2e journey, proof script, generated report, Make target, package script, env var, config file, compose service, runtime service, UI component/page, API route, event/workflow definition, migration/data artefact.

8.3 Rules:

- **No source element should disappear without a Disposition** (Charter §5.8; Standards Profile §10.5).
- **Source path does not dictate target path.** The target concept is named for its semantic purpose (§4.3).
- **Target concept names MUST be final-state semantic names** (§4.2).
- **Historical names MAY be retained only as Source References or quoted evidence** (§4.4).

---

## 9. Provider and Environment Meta Model

9.1 The interacting concepts are: **Provider, Provider Mode, Environment, Proof claim, Evidence, readiness claim, go-live claim.**

9.2 Rules:

- **Hermetic mock proof can satisfy internal platform proof where declared** (Charter §6.1–§6.2). A mock IdP is a valid hermetic substrate.
- **Live external proof requires live external evidence** where a capability depends on an external provider (Charter §2.4; the historical live floor is `liveProviderMinimumLevel: 4`).
- **Production-shaped is not production/live** (§5.11). A production-shaped certification proves shape and rehearsal, not live operation.
- **Future AI MUST NOT infer a stronger claim from weaker evidence** — not a stronger provider mode, environment, proof level, readiness, or go-live status (§14).

9.3 Every readiness or go-live claim MUST be decomposable into: which **Environment**, which **Provider Mode**, which **Proof Level**, and which **Evidence** supports it. A claim that cannot be so decomposed is unproven.

---

## 10. Evidence and Proof Meta Model

10.1 The chain is: **proof claim → proof script → proof execution → emitted evidence → collected evidence → normalised evidence → generated report → readiness claim**, with **failure conditions** at each step.

10.2 Rules (the historical L6 evidence lesson, binding for USF):

- **Emitted proof evidence MUST be preserved through collection and reporting.** If a proof emits a field, the collector and report carry it.
- **Missing collected evidence MUST fail closed** — absence is failure, never silent pass.
- **Readiness claims MUST NOT exceed observed evidence** — claimed level ≤ observed level.
- **Generated reports MUST NOT hide missing raw evidence** — a green summary over absent or stale raw evidence is void (Authority Model §4.3).

10.3 Freshness is commit-pinned: evidence whose pinned commit ≠ the current commit is **stale** and MUST NOT back a current readiness claim.

---

## 11. Command and Configuration Meta Model

11.1 A **Command** is modelled by: **command, command owner, inputs, outputs, environment scope, provider-mode relevance, evidence output, failure semantics, source reference.**

11.2 A **Configuration** is modelled by: **configuration key, configuration file, environment applicability, provider applicability, secret classification, default-value policy, proof relevance, source reference.**

11.3 Rules:

- **Make targets and package scripts in USF's source lineage are semantic evidence** (rank-5 source lineage), promoted into USF Command concepts via Disposition.
- **Env/config in USF's source lineage is semantic evidence**, promoted into USF Configuration concepts; generated `.env` files are projections of manifests, never authoritative.
- **Commands and Configuration cannot be deleted or renamed without a Disposition and semantic review** (Authority Model §5; Standards Profile §14).

---

## 12. UI Semantic Meta Model

12.1 UI is represented by: **UI capability, page/surface, journey, state, validation, error, permission, accessibility requirement, command/query/event relationship, proof/e2e relationship, source reference.**

12.2 Rules:

- **UI implementation may change.** The visual layer is rank-5 and regenerable.
- **UI semantics MUST be preserved unless changed through coupled semantic/ADR/proof/validator updates** (Authority Model §5).
- **Visual redesign is not semantic deletion.** Removing a journey, state, validation, permission, or accessibility requirement is a behaviour change, not a restyle.
- UI source in USF's source lineage is **semantic evidence, not final design authority**; the UI semantic model is derived from behaviour, never from styling.

---

## 13. Observability and Audit Meta Model

13.1 The concepts are: **log, metric, trace, span, event, audit event, runtime proof output, service/resource attributes, correlation/causality, evidence role.**

13.2 Rules:

- **Observability and audit are semantic assets**, governed and named through a controlled vocabulary (OTel-adapted, deferred).
- **Removal requires semantic review** — a signal, metric, trace, or audit event may not be dropped as an incidental refactor (§5.25–§5.26).
- **Proof and operations depend on observability integrity** — proofs assert emitted signals/metrics/traces and audit events; correlation (e.g. request→trace→log→audit) is part of the evidence.

---

## 14. Anti-Concepts and Forbidden Inferences

The following **MUST NOT** become USF concepts, and **MUST NOT** be inferred:

- **`v2`** as a future path or concept — forbidden (§4.2).
- **`legacy` / `new` / `old` / `temp` / `transitional`** as semantic categories — forbidden.
- **A Generated Report treated as a canonical source** — forbidden (rank 6).
- **A passing Proof treated as intended behaviour** — forbidden (proof ≠ semantics).
- **A source file treated as future authority** — forbidden (rank 5/6, not rank 1).
- **Mock/hermetic proof treated as live external proof** — forbidden (§9).
- **Implementation resemblance treated as semantic equivalence** — forbidden.
- **A UI component treated as a Capability** unless mapped to capability semantics — forbidden.
- **An environment name treated as a readiness claim** (e.g. "it's called prod, so it's production-ready") — forbidden.
- **A path name treated as architecture** — forbidden (path ≠ contract).
- **An import treated as acceptance** — importing source does not make it authoritative; only a Disposition + semantic mapping does.
- **Absence of evidence treated as evidence of absence** — a missing proof is a gap to fail closed on, not a pass.

---

## 15. AI Reasoning Rules

A future AI agent **MUST**:

15.1 **Read the Charter, Authority Model, Standards Profile, and this Ontology before major structural work.**
15.2 **Identify the concept being changed** (which §5 concept).
15.3 **Identify the authority level** of that concept (§3.2; Authority Model §1).
15.4 **Check source lineage** — what source evidence in USF's registry and what Disposition apply (§8).
15.5 **Check the Semantic Contract** that governs the concept.
15.6 **Check ADR constraints** that bind it.
15.7 **Check validator expectations** that enforce it.
15.8 **Check proof/evidence requirements** — proof level, freshness, observed vs claimed.
15.9 **Check Provider Mode and Environment** for any evidence or readiness claim.
15.10 **Do not invent concepts from source structure alone** (§14; Authority Model §6.4).
15.11 **Do not weaken source lineage** — never break or drop a Source Reference/Disposition to make a change look cleaner.
15.12 **Do not upgrade readiness claims** beyond observed evidence (§9, §10).
15.13 **Stop or fail when an authority conflict is unresolved** (Authority Model §6.8).
15.14 **Any behavioural change MUST update semantics, ADRs, validators, proofs, and tests** where applicable, in the same change (Authority Model §5).

---

## 16. Future Artefact Mapping

This table guides later work; it creates nothing. ✓ = expected, △ = likely/partial, — = not expected.

| Concept | Taxonomy | Vocabulary | Schema | Registry | ADR | Validator | Evidence | Implementation |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Foundation | — | — | △ | ✓ | ✓ | △ | △ | — |
| Capability | ✓ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Semantic Contract | △ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Source Reference | △ | △ | ✓ | ✓ | △ | ✓ | ✓ | — |
| Disposition | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | △ | — |
| Evidence | ✓ | △ | ✓ | ✓ | △ | ✓ | ✓ | — |
| Proof | ✓ | △ | ✓ | ✓ | △ | ✓ | ✓ | ✓ |
| Proof Level | ✓ | ✓ | ✓ | △ | ✓ | ✓ | ✓ | — |
| Provider | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Provider Mode | ✓ | ✓ | ✓ | △ | ✓ | ✓ | ✓ | △ |
| Environment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | △ |
| Application | △ | — | △ | ✓ | ✓ | ✓ | △ | ✓ |
| Package / Module | ✓ | — | ✓ | ✓ | ✓ | ✓ | △ | ✓ |
| Service | △ | — | ✓ | ✓ | ✓ | ✓ | △ | ✓ |
| Port | △ | △ | ✓ | ✓ | ✓ | ✓ | △ | ✓ |
| Adapter | ✓ | △ | ✓ | ✓ | ✓ | ✓ | △ | ✓ |
| Interface | ✓ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Event | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Workflow | △ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Command | ✓ | ✓ | ✓ | ✓ | △ | ✓ | ✓ | ✓ |
| Configuration | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Data Model | △ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Migration | ✓ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Backup / Restore | △ | — | ✓ | △ | ✓ | ✓ | ✓ | ✓ |
| Observability Signal | ✓ | ✓ | ✓ | ✓ | △ | ✓ | ✓ | ✓ |
| Audit Event | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| UI Semantic Model | ✓ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ADR | △ | △ | ✓ | ✓ | ✓ | ✓ | △ | — |
| Validator | ✓ | △ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Registry | △ | — | ✓ | ✓ | ✓ | ✓ | △ | △ |
| Generated Report | ✓ | — | ✓ | △ | — | ✓ | ✓ | △ |
| AI Agent | — | — | — | — | ✓ | △ | — | — |

---

## 17. Acceptance Criteria

This ontology document is acceptable when **all** hold:

- **Consistent with the Charter** (§3.1) — operationalizes, does not contradict it.
- **Consistent with the Authority Model** (§3.2) — uses the authority order unchanged; tags concepts to levels.
- **Consistent with the Standards Profile** (§3.3) — supplies concepts its standards will formalise.
- **Grounded in USF's own source lineage** — every concept cites concrete recorded source evidence (§5).
- **Defines core concepts clearly** — all required concepts present with the six fields (§5).
- **Defines relationships clearly** — prose + relationship table (§6) and cardinality rules (§7).
- **Distinguishes ontology from taxonomy/vocabulary/schema/registry** — explicitly (§2, §3.3, §18) and does not create those artefacts.
- **Preserves the source-evidence role** — Source Reference + Disposition + import meta-model (§5.4, §5.5, §8).
- **Includes provider/environment/proof/evidence distinctions** (§5.7–§5.11, §9, §10).
- **Includes command/config semantics** (§5.20–§5.21, §11).
- **Includes UI semantics** (§5.27, §12).
- **Includes observability/audit semantics** (§5.25–§5.26, §13).
- **Includes forbidden-inference rules** (§14).
- **Includes AI reasoning rules** (§15).
- **Creates only `docs/architecture/ontology.md`.**

---

## 18. Open Questions / Deferred Work

Deferred, not blockers. Later foundational artefacts in this sequence have now resolved the taxonomy catalogue, vocabulary catalogue, and schema registry as governance artefacts. The remaining deferred items MUST be resolved by a future ADR, schema, validator, or import artefact before they are enforced. *(Global note, 2026-06: the 23 schema files exist at `draft` and a draft/advisory validator exists — schema-authoring §26 Amendment A. Wherever this ontology's per-concept "Future artefacts" notes call one of those schema files or the validator "deferred", read it as resolved at draft level; the genuine deferrals are catalogue/registry/ADR-canon instances, selector/gate wiring, OpenAPI/AsyncAPI/OTel format decisions, active maturity, and implementation layout.)*

- **Actual JSON Schema files, validator tooling, and schema self-validation** *(partially resolved by directive — see schema-authoring-standard §26 Amendment A: 23 schema files at `draft`, a draft/advisory validator at `tools/validate-spec/`, and self-validation of the registry/taxonomy/vocabulary catalogues; active maturity + real-instance validation remain deferred)*; dialect selection is resolved by `schema-authoring-standard.md` as Draft 2020-12.
- **Actual JSON Schema files** for taxonomy, vocabulary, schema registry, evidence, proof, ADR, validator report, import manifest, and semantic contracts *(now exist at `draft` — see §26 Amendment A)*.
- **Exact source registry shape** (the fields of §5.4 / §8 made machine-readable) *(the `source-reference`/`source-disposition` draft schemas now exist — see schema-authoring §26 Amendment A; the registry artefact + maturity remain deferred)*.
- **Exact evidence envelope schema** (the kinds of §5.6 / §10) *(draft `evidence-envelope.schema.json` now exists — see §26 Amendment A; maturity deferred)*.
- **Exact capability-domain vocabulary values** (the value set exists as deferred; canonical values are not yet authored).
- **Exact provider-mode and environment schema wiring** (§5.10, §5.11) *(draft `provider-mode.schema.json` + `environment.schema.json` now exist — see §26 Amendment A; selector/gate wiring remains deferred)*.
- **Exact ADR schema** (§5.28) *(draft `adr.schema.json` now exists — see §26 Amendment A; ADR canon deferred)*.
- **Exact validator report schema** (§5.29, §5.31) *(draft `validator-report.schema.json` now exists — see §26 Amendment A)*.
- **Exact import manifest schema** (§8) *(draft `import-manifest.schema.json` now exists — see §26 Amendment A; the import map remains deferred)*.
- **Exact implementation package layout** (§5.12–§5.16).

---

*End of USF Ontology and Meta Model (Draft / Foundational). This document defines concepts and relationships only; it creates no taxonomy, vocabulary, schema, registry, ADR, validator, evidence file, import map, implementation directory, or runtime code.*
