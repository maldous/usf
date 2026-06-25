# Universal Service Foundation — Charter

| | |
|---|---|
| **Document type** | Constitutional / foundational |
| **Short name** | USF |
| **Repository** | `usf` (this repository) — the clean canonical target |
| **Status** | Active. This Charter and [`authority-model.md`](./authority-model.md) form the USF constitutional layer. |
| **Evidence basis** | Derived from the historical semantic, source, and proof evidence in the sibling repository `../react` (the *historical repository*). |
| **Companion** | Precedence and conflict resolution are defined in [`authority-model.md`](./authority-model.md). |

> **Normative language.** **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** carry RFC 2119 intent throughout. Where this Charter and the Authority Model establish the *order* of authority, the operational ranking of artefact classes is defined in the Authority Model; this Charter defines the identity, purpose, and principles that order obeys.

---

## 0. Preamble and grounding

USF is a new, clean repository. It is **not** a branch, fork, or rename of the historical repository `../react`. The historical repository contains a large, internally cross-referenced body of proven work: a semantic corpus (capability definitions, state machines, permission contracts, error catalogues, event semantics, operational semantics, cross-capability interactions, UI semantic contracts, environment semantics, and proof definitions), a machine validator (`tools/v2-readiness/`, ~60 rules), an architecture-governance tool suite (`tools/architecture/`), a decision canon (74 accepted decisions with 74 evidence-backed lineage records), runbooks, environment and configuration manifests, a Make-driven proof and gate system, a stage-aware test and e2e harness, and a generated proof-evidence corpus graded on a seven-level proof ladder.

USF exists to carry the **intent, contracts, operational knowledge, and proof evidence** of that work forward into a clean foundation whose authority is **semantic and machine-enforced**, not incidental to any source file. The historical repository is treated by USF as **evidence and lineage**, never as the live authority for future behaviour (see [`authority-model.md`](./authority-model.md) §3.6).

This document is grounded in specific historical artefacts. Where it cites them, the path is relative to this repository (e.g. `../react/docs/v2-foundation/semantic-source-of-truth-transition.md`). Such citations are references to **existing historical paths** and do not introduce historical naming into USF.

---

## 1. Name and identity

1.1 The name of this foundation is the **Universal Service Foundation**. Its short name is **USF**.

1.2 USF is the **clean canonical target repository**. It is the single repository in which USF semantic definitions, ADRs, validators, proof evidence, runbooks, and the extracted implementation are authored and governed.

1.3 USF **MUST** use clean, final-state naming for every path and artefact it creates. New paths **MUST NOT** use transitional, version-suffixed, or status-suffixed names (for example: `legacy`, `old`, `new`, `temp`, `transitional`, branch-version suffixes, or a redundant `usf` segment inside this repository). This rule is inherited directly from the historical target-tree intent — *"NO legacy/temp/transitional naming. NO vague buckets"* (`../react/docs/v2-foundation/v2-target-tree.txt`) — and is elevated here to a constitutional requirement.

1.4 USF governs its artefacts in clean homes. The canonical homes in this repository are: `spec/` (the typed semantic corpus — schemas, registries, taxonomies, vocabularies), `docs/adr/` (the ADR canon), `docs/architecture/` (constitutional and architecture governance documents, including this Charter), `docs/runbooks/` (operational procedures), `tools/` (validators and generators), and `evidence/` (proof and runtime evidence). Artefacts **MUST** live in their canonical home.

---

## 2. Purpose

2.1 USF exists to become a **clean, formally defined, semantically governed enterprise platform foundation**. Its purpose is not to deliver a single application but to establish the governed substrate from which applications, UI, and services are extracted and proven.

2.2 USF is **derived from proven semantic and source evidence** in the historical repository. USF **MUST** preserve the behavioural intent, contracts, operational knowledge, Make/env/config semantics, runbooks, tests, and proof evidence that the historical repository established, and **MUST** turn that evidence into a clean authority model suitable for AI-guided implementation.

2.3 USF **MUST be internally provable without depending on live external providers**. The foundation's correctness **MUST** be demonstrable using hermetic and locally composed substrates (in-memory providers, composed local services, and hermetic fixtures such as a mock identity provider), so that proof can run deterministically and offline. This requirement is the basis of the Hermetic Provider Principle (§6).

2.4 USF **MUST** support later **external provider readiness without weakening hermetic proof**. Adding the ability to run against live external providers **MUST NOT** remove, downgrade, or substitute the hermetic proofs that establish the foundation. Live-provider readiness is an *addition* to the proof ladder, never a *replacement* for it.

2.5 USF exists so that **future change is governed by definitions, decisions, validators, and evidence** — not by reading and imitating source files. The foundation's purpose includes making AI-guided change *safe by construction* (§7).

---

## 3. Scope

USF governs the full lifecycle of the platform foundation. The scope of USF **MUST** include, at minimum:

- **Semantic definitions.** The machine-readable corpus that defines capabilities, lifecycle and state models, permissions, validation, error models, audit models, readiness models, events, operational semantics, cross-capability interactions, UI semantics, and environment semantics. In the historical repository this corpus is anchored by `v1-capability-closure.json` and the `capability-*.json` facet templates; USF's equivalent corpus lives under `spec/`.
- **Source references.** Stable traceability from every semantic definition to the source evidence that backs it (the historical repository uses `sourceFileRefs`/`evidence` fields for this). USF semantics **MUST** retain explicit source references.
- **Proof evidence.** Executed, recorded, commit-pinned evidence that exercises the defined behaviour, graded on an explicit proof ladder (§6), stored under `evidence/`.
- **ADR canon.** The complete set of normative architectural decisions, each traceable to semantic evidence, proof evidence, source references, and validator rules.
- **Validators.** The machine checks (`tools/`) that enforce consistency between semantics, ADRs, proofs, references, and implementation, and that detect drift. Validators **MUST** fail closed.
- **Make / env / config semantics.** Build, test, proof, validation, environment-generation, and gate commands; environment manifests; readiness gates; and typed configuration contracts — all treated as governed semantic assets (§5 principle), not incidental files.
- **Runtime and operational evidence.** Runtime-derived inventories (routes, commands, events, providers, storage operations, workflows, security boundaries, observability, audit) and operational semantics (deploy, rollback, migration, degraded mode, recovery, incident class).
- **Application extraction.** The disciplined extraction of applications and packages behind preserved contracts (the historical repository extracts a hexagonal API/BFF and a web application from proven contracts).
- **UI semantic generation.** Machine-readable UI semantics (routes, forms, tables, commands, permissions, validation, states, accessibility, telemetry) sufficient to **regenerate** the visual layer without inventing behaviour.
- **Provider modes.** The explicit classes and modes of providers (hermetic, composed-local, sandbox-external, live-external) and the rules that govern their use per environment (§6).
- **Environments.** The environment ladder (development, test, staging, production) with per-environment provider, data, proof-level, promotion, and rollback policy.
- **Observability.** The metrics, logs, traces, alert conditions, and incident semantics required of each capability.
- **Audit.** The audited-action semantics and the requirement that privileged and mutating actions are auditable.
- **Data, migration, backup, and restore.** Data ownership, tenancy isolation, migration behaviour (forward-only, checksum-immutable committed migrations), rollback, and backup/restore relationships.
- **Future AI-guided change governance.** The rules (§7 and [`authority-model.md`](./authority-model.md)) that constrain how AI agents propose, justify, prove, and land changes.

---

## 4. Non-goals

USF explicitly is **not** the following. These non-goals are normative constraints, not stylistic preferences:

- **Not a blind copy of `../react`.** USF **MUST NOT** import or replicate historical source or artefacts unexamined. Every carried asset **MUST** be justified by a semantic definition, a decision, and (where it asserts behaviour) proof evidence.
- **Not a version branch.** USF **MUST NOT** be framed, named, or operated as a continuation of any historical branch lineage. It adopts the *intent and evidence* of prior work, not its branch identity or transitional vocabulary.
- **Not a place for transitional naming.** USF **MUST NOT** contain transitional, shim, or placeholder names in its committed final state. (The historical runbook permits shims only transiently, each with a deletion condition, and fails its clean-baseline gate if any shim survives; USF inherits the cleaner end-state requirement.)
- **Not a rewrite that loses semantic intent.** USF **MUST NOT** discard hard-won behavioural contracts. Knowledge captured historically (for example, fail-closed authorization defaults, RLS-enforced tenancy, accessibility contracts on real controls) **MUST** be carried as semantic contracts, not re-derived by guesswork. (See the *no knowledge loss* principle, §5.)
- **Not a generated application without semantic proof.** USF **MUST NOT** treat a generated or scaffolded application as delivered. Generation is licensed by semantics and validated by proof; an unproven generated surface is, at most, *discovery-level* (§6).
- **Not live-provider-only validation.** USF **MUST NOT** make its foundational correctness depend on access to live external providers. Hermetic provability is mandatory (§2.3, §6).
- **Not a collection of prose documents without machine enforcement.** USF governance **MUST** be enforceable. A document that carries no machine-checkable consequence carries no governance force. (Historically: a roadmap was rejected in favour of an ADR because *"a roadmap carries no governance force"* — `../react/docs/v2-foundation/v2-decision-catalog.json`, V2-ADR-0053.)

---

## 5. Foundational principles

These principles are constitutional. Implementation, ADRs, validators, and proofs **MUST** conform to them.

5.1 **Semantic-first.** The machine-readable semantic definition of a behaviour is its primary authority. Behaviour **MUST** be defined in semantics before it is implemented, proven, or rendered. Implementation, UI, and tests follow semantics; they do not originate it.

5.2 **Evidence-backed.** Every claim of capability, completeness, or correctness **MUST** be backed by recorded evidence — source references, executed proofs, or both. Unbacked claims are forbidden. The historical standard *"the word `complete` is not permitted"* without backing (V2-ADR-0053) is adopted: USF **MUST NOT** assert readiness it cannot evidence.

5.3 **AI-safe.** USF **MUST** be structured so that an AI agent acting on it is constrained by definitions, decisions, validators, and evidence rather than by source resemblance. The foundation's safety derives from giving AI *explicit semantic inputs rather than permission to invent behaviour* (`../react/docs/v2-foundation/v2-readiness-final-attestation.md`).

5.4 **Internally provable.** USF **MUST** be provable end-to-end on a hermetic or composed-local substrate, deterministically and offline (§2.3).

5.5 **External-provider adaptable.** USF **MUST** be able to add live-external provider readiness as a higher rung of proof without weakening or replacing hermetic proof (§2.4, §6).

5.6 **Source-aware but not source-subordinate.** USF **MUST** consult the historical source to recover intent, behaviour, commands, and operational knowledge, but USF behaviour **MUST NOT** be defined or overridden by historical source once USF semantics exist. *"Historical evidence and a proof reference … not the live semantic authority"* (`../react/docs/v2-foundation/semantic-source-of-truth-transition.md`).

5.7 **Clean final-state naming.** All USF paths and artefacts **MUST** use clean, final names (§1.3).

5.8 **No knowledge loss.** The intent, lessons, rejected approaches, and binding decisions captured in the historical knowledge ledger **MUST** be preserved as USF semantics and decisions. Behaviour may be re-implemented and UI may be regenerated, but the *behavioural contract and proof semantics are the source of truth and MUST be carried forward*.

5.9 **Proof does not replace semantics.** A passing proof demonstrates that a behaviour *was exercised*; it does not define what the behaviour *should be*. *"Proofs are evidence, not substitutes for semantic definition"* (`../react/docs/v2-foundation/v2-readiness-final-attestation.md`). A green graph is *"not treated as sufficient proof"* on its own (`../react/docs/v2-foundation/universal-service-foundation-assurance.md`).

5.10 **Validators enforce drift control.** USF validators **MUST** detect divergence between semantics, ADRs, proofs, references, Make/env/config, and implementation, and **MUST** fail closed on contradiction or ambiguity. Validators enforce the foundation; they do not, by themselves, define product behaviour.

5.11 **ADRs explain and constrain future work.** Every architectural decision **MUST** be recorded as an ADR that is traceable to evidence, aligned to semantics, and carries explicit AI-alignment constraints. ADRs are normative, not narrative.

5.12 **Implementation follows semantic contracts.** Source code **MUST** implement the semantic contracts and **MUST NOT** introduce behaviour, permissions, routes, states, validation, errors, events, or provider semantics that are not first defined in semantics (and, where they assert behaviour change, decided in an ADR and proven). Refactoring and replacement are permitted only behind preserved contracts.

5.13 **Make / env / config are semantic assets.** Build/test/proof/validate/gate commands, environment manifests, readiness gates, and configuration contracts are **governed semantic assets**, not incidental files. They **MUST** be defined, dispositioned, and validated like any other semantic artefact. (Historically, every command is dispositioned and `make all` is *"the authoritative full-confidence command"*; configuration is a typed contract catalogue and `.env` files are generated projections of manifests, never hand-edited.)

---

## 6. Hermetic provider principle

6.1 **Hermetic providers are permitted and necessary.** USF **MUST** support and rely on hermetic providers — in-memory implementations, composed-local services, and hermetic fixtures — for its internal validation. Hermetic provability is a requirement of the foundation, not a compromise (§2.3).

6.2 **A mock identity provider is valid for hermetic platform proof.** A hermetic IdP fixture (historically the `mock-oidc` service brokered by a local Keycloak) is a **legitimate substrate for proving platform behaviour** that depends on authentication and identity, including the real authentication code path exercised against the hermetic fixture. Such proof is valid *as hermetic proof*.

6.3 **Hermetic evidence MUST NOT be confused with live external-provider go-live evidence.** Proof obtained against mock, fake, or in-memory providers **MUST NOT** be presented, recorded, or relied upon as evidence that a live external provider works. This boundary is concrete and inherited:
- A capability may be *delivered-and-proven* at behaviour level (historically proof level **L3**) on hermetic substrate, but **live-provider claims require a higher rung** (historically `liveProviderMinimumLevel: 4` — proof against a real local substrate or above). USF **MUST** preserve a comparable floor separating hermetic proof from live-provider proof.
- Production readiness **MUST fail rather than substitute mock responses for unavailable real providers**, and the platform **MUST NOT report a successful real-IdP login from mock fixtures** (`../react/docs/v2-foundation/operational-semantics.json`).
- Production environments **MUST** forbid mock providers, fixture event emission, destructive proof, and test-data insertion as readiness evidence (`../react/docs/v2-foundation/environment-readiness-gates.json`).
- A hermetic substitute is admissible **only** where it is proven to have the same port interface, semantic outcomes, failure semantics, and event/audit/observability contract as its real counterpart — and proven parity **does not** promote hermetic evidence to live evidence.

6.4 **Provider classes MUST be explicitly named and governed.** USF **MUST** classify every provider into an explicit, closed set of provider classes (historically: `hermetic`, `compose-local`, `sandbox-external`, `live-external`, `none`) and **MUST** record, per recorded proof, which class of provider and substrate was used. Provider mode per environment (which classes are permitted) **MUST** be governed by environment semantics and readiness gates, and **MUST** be selectable explicitly (historically via a single `USF_PROVIDER_MODE` selector). Mislabelling a provider class is a governance violation that USF validators **MUST** be able to detect.

---

## 7. AI alignment principle

USF is built to be operated by AI agents under constraint. Any future AI agent (and any human) making changes to USF **MUST** observe the following. These rules are expanded operationally in [`authority-model.md`](./authority-model.md) §10.

7.1 **Use semantic definitions as primary input.** An AI agent **MUST** read and obey USF semantic definitions as the primary source of intended behaviour. It **MUST NOT** reconstruct intended behaviour from source resemblance, screenshots, or generated reports.

7.2 **Respect ADRs.** An AI agent **MUST** treat accepted ADRs as binding constraints and **MUST NOT** take actions an ADR forbids, even if a proof or a source file would permit them.

7.3 **Preserve proof contracts.** An AI agent **MUST NOT** weaken, delete, or downgrade proofs, and **MUST NOT** relabel a proof's level, environment, provider class, or substrate to make it appear stronger than the evidence supports.

7.4 **Preserve source lineage.** An AI agent **MUST** keep traceability from semantics and decisions back to their source and historical evidence. Lineage **MUST NOT** be broken to make a change look cleaner.

7.5 **MUST NOT invent semantics.** An AI agent **MUST NOT** invent behaviour, permissions, routes, states, validation, errors, events, or provider semantics. Where a needed semantic definition is missing, the agent **MUST** stop and propose the semantic definition (and the ADR and validator updates that accompany it) rather than infer it from implementation.

7.6 **Update the coupled artefacts together.** When a change alters behaviour, the agent **MUST** update the **semantic definitions, ADRs, proofs, and validators together**, in the same change, along with any affected references, runbooks, and Make/env/config. Behaviour change with stale semantics is drift, and USF validators **MUST** fail closed on it.

---

## 8. Success standard

USF is "good" — i.e. has met its foundational standard — when **all** of the following hold. This is the standard against which USF, and AI work on USF, is measured:

8.1 **Clean repository.** The repository uses clean, final-state naming throughout, with no transitional, version-suffixed, or placeholder names, and every artefact lives in its canonical home (§1).

8.2 **Typed semantic corpus.** A complete, machine-readable, schema-validated semantic corpus exists under `spec/`, defining every capability and its facets (lifecycle, state model, permissions, contracts, validation, error model, audit model, readiness model, proof, UI semantics), plus event, operational, cross-capability, environment, and authorization semantics.

8.3 **Complete ADR canon.** Every architectural decision is recorded as a normative ADR, accepted, traceable to semantic and proof evidence, carrying AI-alignment constraints, with no decision left untraced (the historical bar: a decision *"not Accepted or with no lineage"* fails the validator — R13).

8.4 **Validated evidence.** USF validators run, fail closed on contradiction, and pass; proof evidence is present, fresh (commit-pinned, not stale), honestly classified by level and provider class, and free of overclaim; the proof system is itself falsifiable (negative controls demonstrate that broken or overclaimed proofs are caught).

8.5 **Source-import traceability.** Every carried or extracted asset traces to its source and to the decision and semantics that justify it; import boundaries are enforced by a validator.

8.6 **Repeatable proofs.** The foundation's proofs run deterministically on a hermetic or composed-local substrate, offline, and reproducibly, with `make`-driven commands as the operational entrypoint and a verifiable confidence ladder.

8.7 **High-quality implementation.** The extracted implementation conforms to the semantic contracts, passes the quality and security gates, and introduces no behaviour absent from semantics.

8.8 **Future AI alignment safety.** A future AI agent can make a correct, bounded change by reading USF semantics, ADRs, validators, and proofs — and is *prevented by the foundation* from inventing behaviour, overclaiming proof, confusing hermetic evidence with live evidence, or letting implementation drift from semantics.

---

## Adoption and amendment

This Charter is a constitutional document of USF. Together with [`authority-model.md`](./authority-model.md) it stands above the ADR canon: ADRs **MUST** conform to it. It **MAY** be amended only by a deliberate, recorded decision that states what changed and why; an amendment **MUST NOT** weaken the hermetic-provability requirement (§2.3, §6) or the prohibition on inventing semantics (§5.12, §7.5) without an explicit, evidenced constitutional decision to do so.
