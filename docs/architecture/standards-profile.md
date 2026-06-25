# USF Standards Profile

| | |
|---|---|
| **Document type** | Governance / foundational standards profile |
| **Status** | **Draft / Foundational** |
| **Repository** | `usf` (this repository) — the clean canonical target |
| **Created after** | [`charter.md`](./charter.md) and [`authority-model.md`](./authority-model.md), which it operationalizes and **MUST NOT** redefine |
| **Authority** | Subordinate to the constitutional layer (Charter + Authority Model). It governs the **form and quality** of lower artefacts; it does not change the authority order. |
| **Evidence basis** | Grounded in the historical repository `../react` → `/home/user/src/react` (the *historical repository*). Citations to `../react/...` reference existing historical paths and introduce no historical naming into USF. |

> **Normative language.** Requirement words follow **BCP 14** (RFC 2119 + RFC 8174) as defined in §6. Only the uppercase forms carry normative meaning.

---

## 1. Title

**USF Standards Profile.**

This document defines how USF chooses, adapts, defines, and enforces standards. Its section numbering matches the canonical structure of a USF standards profile (this Title is section 1; substantive sections follow as 2–23).

---

## 2. Status

2.1 **Initial status: Draft / Foundational.** This profile is authored, not yet validator-enforced. Its own conformance maturity (§21) is currently **documented**; it names the maturity it must reach.

2.2 **It was created after the Charter and Authority Model.** Those two documents form the USF constitutional layer ([`authority-model.md`](./authority-model.md) §1). This profile operationalizes them and **MUST** remain consistent with them. Where this profile and the constitutional layer conflict, the constitutional layer wins.

2.3 **It governs later work.** This profile is the standards reference for the later USF ontology, taxonomy, vocabulary, schemas, registries, ADR canon, evidence envelope, validators, import/disposition maps, and implementation extraction, and for future AI-guided development.

2.4 **It does not yet create those artefacts.** This profile defines *what they must look like and how they will be enforced*. It creates no schema, taxonomy, vocabulary, registry, ADR, evidence file, validator, tool, or implementation directory. Exact shapes are deferred explicitly (§23).

---

## 3. Purpose

3.1 The standards profile defines **how USF chooses, adapts, and enforces standards** so that quality and conformance are decided by recorded rules, not by individual judgement or imitation of the historical repository.

3.2 It answers the following questions, each addressed in the sections noted:

- **Which standards are normative for USF?** Internal USF-owned standards (§9) and the external standards USF has adopted or adapted (§8); normative force is governed by §6 and §7.
- **Which external standards are adopted, adapted, or only used as inspiration?** Classified honestly in §7 and §8, with no false compliance claims.
- **How do standards connect to the authority model?** Standards define the required *form and quality* at each authority level (§5); they never alter the authority order.
- **How do standards prevent AI drift?** By making the Charter's AI-safety principle enforceable: required source-references, provider-mode honesty, evidence freshness, ADR linkage, and coupled-change rules (§4, §9, §20), backed by fail-closed validators (§18).
- **How do standards preserve knowledge from `../react`?** By defining the source-evidence role (§10): every historical asset is carried only through an explicit source reference and disposition, so no semantic intent is lost (Charter §5.8).
- **How do standards become enforceable later?** Through the maturity ladder (§21): documented → structured → machine-readable (schemas) → validator-enforced → proof-backed → release-blocking.

3.3 This profile is specific to USF. It does not restate general enterprise-architecture practice; it states what USF requires and why, grounded in concrete historical evidence.

---

## 4. Relationship to the Charter

This profile operationalizes the [Charter](./charter.md). It does not repeat the principles; it states how each becomes a standard, a convention, or an acceptance criterion. (Charter principle references are to `charter.md` §5 unless noted.)

| Charter principle | How standards make it enforceable |
|---|---|
| **Semantic-first** (§5.1) | Semantic-definition standard (§9) requires behaviour to exist as a typed semantic artefact under `spec/` before implementation; validators (§18) fail when source has no semantic backing. |
| **Evidence-backed** (§5.2) | Evidence standard (§11) requires typed, source-referenced evidence; no readiness claim may exceed observed evidence. |
| **AI-safe** (§5.3) | AI agent operating standard (§20) plus required references and fail-closed validation remove "infer from code" as a permitted path. |
| **Internally provable** (§5.4) | Proof-level (§9) and provider-mode (§12) standards make hermetic, offline proof the default substrate and a recorded property of every proof. |
| **External-provider adaptable** (§5.5) | Provider-mode (§12) and environment (§13) standards add live-provider evidence as a *higher rung*, never a replacement. |
| **Source-aware but not source-subordinate** (§5.6) | Source-evidence standard (§10) defines `../react` as rank-6 lineage consulted to recover intent, never as live authority. |
| **Clean final-state naming** (§5.7) | Directory and naming standard (§17) forbids migration-phase tokens in USF paths. |
| **No knowledge loss** (§5.8) | Import/disposition standard (§9) + source-evidence standard (§10): no source element disappears without a recorded disposition. |
| **Proof does not replace semantics** (§5.9) | Evidence (§11) and ADR (§19) standards keep proof as evidence-of-fact, distinct from the semantic definition of intent. |
| **Validators enforce drift control** (§5.10) | Validator standard (§18) defines what validators must check and that they fail closed. |
| **ADRs explain and constrain future work** (§5.11) | ADR standard (§19) requires semantic/source/proof/validator references, invariants, forbidden-drift, and AI-alignment rules. |
| **Implementation follows semantic contracts** (§5.12) | Interface (§15), event (§15), and import (§9) standards require contracts to precede or be reconciled with code. |
| **Make/env/config are semantic assets** (§5.13) | Command and configuration standard (§14): every command and config key is a governed, dispositioned, validated asset. |

USF **MUST NOT** treat this table as a substitute for the Charter; the Charter remains the constitutional source of these principles.

---

## 5. Relationship to the Authority Model

This profile uses the authority order defined in [`authority-model.md`](./authority-model.md) §1 unchanged. Standards define the **form and quality expected at each level**; they do not replace the model or re-rank it.

| Authority level (Authority Model §1) | What standards require of it |
|---|---|
| **1 — Semantic definitions** (`spec/`) | Typed, schema-valid, identifiable, versioned; every facet carries source references and a proof reference where it asserts behaviour (§9 semantic-definition, §10, §11). |
| **2 — ADRs** (`docs/adr/`) | Normative, evidence-derived, with semantic/source/proof/validator references, invariants, permitted-change, forbidden-drift, consequences, and AI-alignment rules (§19). |
| **3 — Validator rules** (`tools/`) | Executable; fail closed on ambiguity; check schema validity, reference resolution, evidence completeness, disposition, provider-mode and environment honesty, ADR linkage, and proof-claim consistency (§18). |
| **4 — Runtime proof evidence** (`evidence/`) | Typed, source-referenced, provider-mode- and environment-declared, level-classified, fresh/stale-detectable, non-overclaiming; emitted fields preserved through collection and reporting (§11, §12). |
| **5 — USF source implementation** | Conforms to semantic contracts; introduces no behaviour, route, permission, state, error, event, or provider semantics absent from semantics; import boundaries enforced (§9, §15). |
| **6 — Historical `../react` evidence** | Used only through explicit source references and dispositions; never carried as live authority or as a new path name (§10, §17). |
| **7 — Generated reports** | Machine-readable, regenerable, lower authority than the artefacts they summarize; must not hide missing raw evidence (§11, §18). |

5.1 Standards **MUST** help resolve conflicts, not create new ones. A standard that contradicts the Authority Model is a defect in the standard. Where a standard is silent, the Authority Model's conflict-resolution (§4) and AI operating rule (§6) govern.

5.2 Standards **MUST NOT** introduce a new authority class or change precedence. New artefact *kinds* (e.g. an evidence envelope schema) take the authority of the level they belong to.

---

## 6. Normative Language Standard

6.1 USF normative documents use **BCP 14** keywords (RFC 2119 as updated by RFC 8174). The following terms have the stated meaning **only when written in uppercase**; lowercase "must", "should", "may" carry no normative force.

| Keyword | Meaning in USF |
|---|---|
| **MUST**, **REQUIRED**, **SHALL** | Absolute requirement. `SHALL` is treated as a synonym of `MUST`; USF prefers `MUST`. |
| **MUST NOT**, **SHALL NOT** | Absolute prohibition. |
| **SHOULD**, **RECOMMENDED** | Strong default; deviation is permitted only with recorded rationale (§6.4). |
| **SHOULD NOT**, **NOT RECOMMENDED** | Strong negative default; deviation requires recorded rationale. |
| **MAY**, **OPTIONAL** | Genuinely optional; presence or absence MUST NOT break interoperability or proof honesty. |

6.2 **Use `MUST` sparingly.** `MUST` is reserved for requirements needed for **semantic safety, interoperability, proof integrity, security, drift control, or AI alignment**. Over-use of `MUST` dilutes it and is itself a defect.

6.3 **A deviation from a `MUST`** requires either (a) a blocking validation failure that prevents the change from landing, or (b) an explicit, recorded ADR exception that scopes and justifies the deviation. Silent deviation is forbidden.

6.4 **A deviation from a `SHOULD`** requires a recorded rationale (in the relevant ADR, semantic artefact, or evidence record). An unexplained `SHOULD` deviation is a finding.

6.5 This standard applies retroactively as the reading convention for the Charter and Authority Model, which already use these words with RFC 2119 intent.

---

## 7. Standards Classification Model

Every standard referenced by USF **MUST** be assigned exactly one class. The class fixes its authority and how it is treated.

**Adopted standard.** *Meaning:* used directly, as published, without USF-specific modification. *Authority:* becomes binding via an ADR that records the adoption; thereafter enforced at the authority level of the artefacts it governs. *When usable:* when the published standard fits USF needs without adaptation. *Recorded in:* an ADR (§19) and, where it shapes artefacts, a schema/validator. *AI treatment:* obey as published; do not silently extend it. *Validators:* MUST enforce conformance where the standard governs an artefact shape or contract.

**Adapted standard.** *Meaning:* an external standard whose *principles* USF follows but whose form USF modifies for its needs. *Authority:* binding as the USF-adapted form, via ADR. *When usable:* when the external standard is valuable but does not fit unchanged. *Recorded in:* an ADR that states what was kept, changed, and dropped, plus the USF-defined artefact. *AI treatment:* follow the USF-adapted form, not the upstream form; do not claim upstream compliance. *Validators:* MUST enforce the USF-adapted form.

**Inspired-by practice.** *Meaning:* a practice that informs USF thinking but is not itself binding. *Authority:* none on its own; advisory. *When usable:* for orientation and vocabulary. *Recorded in:* prose in this profile or an ADR's rationale. *AI treatment:* may draw on it; MUST NOT cite it as a requirement or compliance claim. *Validators:* not enforced as such.

**USF-defined standard.** *Meaning:* a standard USF owns and defines itself (§9). *Authority:* binding at the authority level of the artefacts it governs once ratified by an ADR and/or expressed as a schema. *When usable:* where no external standard fits, or USF needs domain-specific control. *Recorded in:* this profile, an ADR, and a schema/validator. *AI treatment:* primary input alongside semantics. *Validators:* MUST enforce it as it matures (§21).

**Historical source convention.** *Meaning:* a convention observed in `../react` (e.g. a field name, a Make-target pattern, a disposition vocabulary). *Authority:* rank-6 evidence (Authority Model §2.6); informative, not binding on USF. *When usable:* to recover intent and to justify a USF-defined standard. *Recorded in:* a source reference (§10), never as a new USF path or name. *AI treatment:* consult and cite as lineage; never adopt unexamined. *Validators:* not enforced directly; the USF standard derived from it is.

**Deprecated historical convention.** *Meaning:* a historical convention USF has examined and chosen not to carry forward. *Authority:* none; retained only as documented lineage. *When usable:* never as a target form. *Recorded in:* an ADR or source reference stating why it is deprecated. *AI treatment:* MUST NOT reintroduce it. *Validators:* SHOULD detect and reject reintroduction where feasible.

**Forbidden convention.** *Meaning:* a convention USF prohibits outright (e.g. migration-phase path tokens, mislabelling hermetic proof as live). *Authority:* binding prohibition. *When usable:* never. *Recorded in:* this profile (§12, §17) and an ADR where needed. *AI treatment:* MUST NOT use; MUST stop if instructed to. *Validators:* MUST detect and fail closed on it.

---

## 8. External Standards Profile

USF does **not** claim full compliance with any external standard unless it creates artefacts and validators that substantiate the claim. The status words are those of §7. Where a standard is not yet adopted as an artefact, USF uses its *principles* and says so honestly.

**BCP 14 / RFC 2119 / RFC 8174 — normative language.**
*USF status:* **Adopted** (in force now, §6). *Scope:* requirement words in all USF normative documents. *Use for:* expressing obligations, prohibitions, defaults, options. *Will not use for:* implying obligation via lowercase prose. *Future artefacts:* none required; a linter MAY check uppercase usage. *Validator expectation:* OPTIONAL keyword-usage lint. *AI relevance:* agents MUST read uppercase keywords as binding (§20).

**JSON Schema — JSON artefact shape validation.**
*USF status:* **Adopted as the mechanism**; the **dialect is resolved** by `docs/architecture/schema-authoring-standard.md` as **JSON Schema Draft 2020-12** (`$schema`: `https://json-schema.org/draft/2020-12/schema`); validator package/tooling is **partially resolved by directive** (a draft/advisory validator with `jsonschema==4.10.3` — see §23 Amendment and schema-authoring-standard §26 Amendment A); meta-schema wiring and active maturity remain **deferred** (§23). *Scope:* every USF JSON artefact (semantics, registries, evidence envelope, validator reports). *Use for:* explicit, versioned, identifiable shape validation that a validator can execute. *Will not use for:* schemas that merely *document* structure without enforcing it — such schemas are forbidden (a schema MUST be validator-testable). *Future artefacts:* `spec/schemas/` schema files; per-artefact `$id` and `version`. *Validator expectation:* validators MUST run schema validation and fail closed on invalidity. *AI relevance:* agents MUST validate generated JSON against its schema before claiming completion.

**OpenAPI-style — synchronous HTTP/API contracts.**
*USF status:* **Adapted principle; artefact not yet adopted.** *Scope:* HTTP/API route and contract semantics. *Use for:* the principle that API interfaces are **contract-first or contract-reconciled**, not implementation-guessed (§15). *Will not use for:* claiming OpenAPI compliance or requiring OpenAPI files now; that decision is deferred (§23). *Future artefacts:* possibly OpenAPI documents or a USF interface contract artefact; an API contract-drift check (the historical repository runs an OpenAPI drift hard gate — `../react/docs/evidence/api/openapi-drift-hard-gate.md`). *Validator expectation:* once adopted, contract-vs-runtime drift MUST be checkable. *AI relevance:* agents MUST NOT infer API contracts from handlers when a semantic interface contract exists.

**AsyncAPI-style — event/message contracts.**
*USF status:* **Adapted principle; artefact not yet adopted.** *Scope:* events, messages, queues, topics. *Use for:* the principle that event/message contracts are explicit (schema, ordering, idempotency, DLQ, retention) before or during implementation (§15), grounded in `../react/docs/v2-foundation/event-semantics.json`. *Will not use for:* claiming AsyncAPI compliance or requiring AsyncAPI files now (deferred, §23). *Future artefacts:* a USF event-contract artefact, possibly AsyncAPI-shaped. *Validator expectation:* event payloads and policies MUST be checkable against the contract. *AI relevance:* events MUST NOT be invented in code without an event contract.

**OpenTelemetry-style — observability semantic conventions.**
*USF status:* **Adapted (principles only).** USF does **not** claim OpenTelemetry compliance. *Scope:* naming and shape of logs, metrics, traces, spans, attributes, events, and service/resource identity. *Use for:* informing a USF-defined, controlled, validator-checkable observability vocabulary (§16). *Will not use for:* asserting OTel conformance, or treating arbitrary OTel attributes as automatically valid. *Future artefacts:* a USF observability vocabulary/registry; an observability-correlation evidence form (the historical repository correlates Loki/Tempo/Sentry — `../react/docs/evidence/e2e/prod-observability-correlation-latest.json`). *Validator expectation:* observability names MUST be drawn from the controlled vocabulary once defined. *AI relevance:* agents MUST NOT rename or remove observability/audit semantics as an incidental refactor (§16).

**ADR practice — decision records.**
*USF status:* **Adapted.** *Scope:* all architectural decisions. *Use for:* an adapted, stronger ADR form (§19) that adds semantic/source/proof/validator references, invariants, forbidden-drift, and AI-alignment rules beyond a generic ADR. *Will not use for:* informal notes or generic prose decisions — forbidden (Charter §4). *Future artefacts:* `docs/adr/` ADRs and an ADR schema (deferred, §23). The historical repository splits decision (`v2-decision-catalog.json`) from lineage (`v2-decision-lineage.json`); USF will define its unified ADR form. *Validator expectation:* every ADR's references MUST resolve; untraced decisions fail (historical rule R13). *AI relevance:* agents MUST record decisions as ADRs and obey them as rank-2 authority.

**C4-style — architecture views.**
*USF status:* **Inspired-by.** *Scope:* architecture description. *Use for:* eventually supporting distinct view kinds — **context, container, component, code, deployment, and dynamic/runtime** views — because USF spans system context, deployable apps, packages/components, and runtime behaviour. *Will not use for:* requiring diagrams or C4 notation now; no diagrams are required by this profile. *Future artefacts:* optional architecture views under `docs/architecture/`, preferably generated from semantics rather than hand-drawn. *Validator expectation:* if generated, a view MUST be reconcilable with the semantic corpus. *AI relevance:* agents MAY use view thinking to organize understanding; views are explanatory, not normative.

---

## 9. Internal USF Standards Profile

These standards are **USF-defined** (§7) unless noted. Each lists *purpose*, *source inputs from `../react`*, *expected future artefacts*, *enforcement method*, *drift risk if absent*, and *AI alignment rule*. No artefact below is created by this document.

**Semantic definition standard.** *Purpose:* define platform behaviour as a typed, identifiable, versioned semantic corpus. *Source inputs:* `v1-capability-closure.json` (75 capabilities), the `capability-*.json` facet templates (ten facets: lifecycle, stateModel, permissions, contracts, validation, errorModel, auditModel, readinessModel, proof, uiSemanticDefinition), `operational-semantics.json`, `event-semantics.json`, `cross-capability-interactions.json`, `ui-capability-model.json`, `authentication-authorisation-matrix.json`. *Future artefacts:* `spec/schemas/` + `spec/registries/` semantic corpus. *Enforcement:* JSON Schema validation + completeness validator; a capability MUST drop from "proven" to "gap" if any facet lacks authoritative backing. *Drift risk:* behaviour defined only in code; AI guessing intent. *AI rule:* read semantics first; never invent a facet.

**Source reference standard.** *Purpose:* bind every USF artefact to the source evidence that justifies it. *Source inputs:* `sourceFileRefs`/`evidence` fields throughout the corpus; `v1-file-inventory.json` (~1673 tracked files); `v1-to-v2-path-map.json`. *Future artefacts:* a source registry (fields in §10; schema deferred, §23). *Enforcement:* reference-resolution validator (every reference resolves to a real path/commit). *Drift risk:* untraceable artefacts; lost lineage. *AI rule:* preserve and cite lineage (§20).

**Evidence standard.** *Purpose:* make evidence typed, honest, and freshness-checkable (§11). *Source inputs:* `docs/evidence/` (267 files across 31 domains, machine `.json` + human `.md`); `usf-audit/proof-evidence/` (per-proof runtime JSON); `usf-audit/proof-evidence-index.json`. *Future artefacts:* an evidence envelope schema (deferred, §23) under `evidence/`. *Enforcement:* schema + freshness (commit-pin) + claim-vs-observed validators. *Drift risk:* overclaimed or stale readiness. *AI rule:* never claim readiness beyond observed evidence.

**Proof level standard.** *Purpose:* grade proof on an explicit ladder. *Source inputs:* `capability-proof-definition.json` (L0 Discovery → L6 Foundation), `proof-strength-matrix.json`, `deliveredAndProvenMinimumLevel: 3`, `liveProviderMinimumLevel: 4`, negative-control reports. *Future artefacts:* a USF proof-level vocabulary + per-proof level field. *Enforcement:* validator checks level ordering, claimed≤observed, and negative controls (proofs that must be able to fail). *Drift risk:* "green" that proves nothing. *AI rule:* never relabel a proof upward (§12).

**Provider mode standard.** *Purpose:* govern provider classes and honesty (§12). *Source inputs:* provider classes `hermetic`/`compose-local`/`sandbox-external`/`live-external`/`none`; `USF_PROVIDER_MODE` selector; in-memory↔real parity reports; `runtime-provider-inventory.json` (~69 providers); `services/mock-oidc`. *Future artefacts:* a provider-mode vocabulary (deferred, §23). *Enforcement:* validator rejects mislabelled provider class and hermetic-as-live. *Drift risk:* mock proof sold as live readiness. *AI rule:* record, never infer, provider mode.

**ADR standard.** *Purpose:* normative, traceable decisions (§19). *Source inputs:* `v2-decision-catalog.json` (74 accepted), `v2-decision-lineage.json` (74 evidence-backed), historical rule R13. *Future artefacts:* `docs/adr/` + ADR schema (deferred). *Enforcement:* every reference resolves; untraced/non-accepted decisions fail. *Drift risk:* decisions as vibes; unenforceable prose. *AI rule:* obey ADRs as rank-2; record new decisions as ADRs.

**Validator standard.** *Purpose:* executable enforcement that fails closed (§18). *Source inputs:* `tools/v2-readiness/` (~60 rules R1–R62; "fails closed", "normalises no aliases", "writes no runtime file"); `tools/architecture/`; golden + negative-control tests. *Future artefacts:* `tools/` validators + machine-readable reports. *Enforcement:* the validators are the enforcement; they are themselves test-covered and falsifiable. *Drift risk:* standards that are advisory only. *AI rule:* never weaken a rule to pass; add rules for new semantics.

**Registry standard.** *Purpose:* single-source-of-truth registries with no orphan entries. *Source inputs:* `docs/evidence/platform/universal-service-foundation-registry.json` (121 capabilities, data-only); e2e `suite-registry.json`/`persona-registry.json`/`scenario-manifest.json`/`ui-contract.json` (historical rule: "no test without a registry entry"). *Future artefacts:* `spec/registries/`. *Enforcement:* registry-vs-reality validator; bijection checks. *Drift risk:* untracked surfaces. *AI rule:* register before referencing.

**Directory and naming standard.** *Purpose:* clean final-state naming (§17). *Source inputs:* `v2-directory-contracts.json` (26 contracts: path, responsibility, allowedContents, forbiddenContents, owner, dependencyDirection, architectureRule), `v2-target-tree.txt` ("NO legacy/temp/transitional naming"). *Future artefacts:* USF directory contracts. *Enforcement:* contract + forbidden-token validator. *Drift risk:* migration-phase naming becoming permanent. *AI rule:* never create a forbidden-token path.

**Make/command standard.** *Purpose:* commands as governed semantic assets (§14). *Source inputs:* `Makefile` + `make/*.mk`; `make all` = "authoritative full-confidence command"; ~110 `proof:*` scripts; `v2-command-map.json` (377 commands; `carry`/`merge`/`retire`); historical rule R11. *Future artefacts:* USF Make/command catalogue. *Enforcement:* command-coverage validator (live targets ⇆ catalogue). *Drift risk:* silent command loss/rename. *AI rule:* disposition before deleting/renaming a command.

**Environment/configuration standard.** *Purpose:* environments and config as governed assets (§13, §14). *Source inputs:* `environment-readiness-gates.json` (4 gates), `environment-capability-matrix.json` (70 caps × 4 envs), `environment-and-config-catalog.json` (39 assets), `v1-config-contract-catalogue.json` (64 typed keys); `.env` generated from `config/environments/*.json` manifests (historical ADR-0072). *Future artefacts:* USF environment + config contracts. *Enforcement:* env/config audit validator; generated-vs-manifest check. *Drift risk:* hand-edited config; environment dishonesty. *AI rule:* regenerate config from manifests; never hand-edit generated env.

**Interface contract standard.** *Purpose:* contract-first/contract-reconciled interfaces (§15). *Source inputs:* `operational-semantics.json` `runtimeCommandLinks`; runtime route inventories; `validate-openapi-drift`; `contracts-*` packages. *Future artefacts:* USF interface contracts (OpenAPI-adapted, deferred). *Enforcement:* contract-vs-runtime drift validator. *Drift risk:* interfaces inferred from handlers. *AI rule:* do not infer interfaces from code when a contract exists.

**Event contract standard.** *Purpose:* explicit event/message contracts (§15). *Source inputs:* `event-semantics.json` (eventName, schema, schemaVersion, idempotencyKey, orderingExpectation, retryPolicy, dlqPolicy, retention, privacyClassification, tenantIsolation; canonical vs test-only events); historical rule R26. *Future artefacts:* USF event contracts (AsyncAPI-adapted, deferred). *Enforcement:* event-payload-vs-contract validator. *Drift risk:* undocumented events; lost DLQ/ordering semantics. *AI rule:* define the event contract before emitting an event.

**Observability standard.** *Purpose:* observability/audit as semantic assets (§16). *Source inputs:* `operational-semantics.json` observabilitySignals/metrics/logs/traces/alertConditions; `docs/evidence/observability/`; e2e observability-correlation (Loki/Tempo/Sentry); historical assurance "0 routes without tracing/logging/metrics". *Future artefacts:* USF observability vocabulary (OTel-adapted). *Enforcement:* controlled-vocabulary + coverage validator. *Drift risk:* unobservable, unauditable behaviour. *AI rule:* never strip observability/audit as a refactor.

**Data/migration/backup/restore standard.** *Purpose:* govern data lifecycle and tenancy. *Source inputs:* `data-and-migration-plan.json`; operational-semantics migrationBehaviour/rollbackBehaviour/backupRestoreRelationship/dataLossRisk; checksum-immutable forward-only migrations; RLS-enforced tenancy; `docs/evidence/data/{retention,legal-hold}-runtime-proof.json`. *Future artefacts:* USF data/migration semantics. *Enforcement:* migration-immutability + tenancy-isolation validators + runtime proof. *Drift risk:* destructive migration; tenant data leakage. *AI rule:* never edit a committed migration; preserve tenancy invariants.

**UI semantic standard.** *Purpose:* machine-readable UI semantics sufficient to regenerate the visual layer without inventing behaviour. *Source inputs:* `ui-capability-model.json` (personas, routes, forms, tables, commands, states, a11y, telemetry), `ui-definition.schema.json`, the rule "the V2 generator … must never read old JSX". *Future artefacts:* USF UI semantic corpus. *Enforcement:* UI-semantics schema + journey proof. *Drift risk:* invented UI behaviour; lost accessibility contracts. *AI rule:* regenerate UI from semantics; never invent UI behaviour.

**Import/disposition standard.** *Purpose:* every carried asset has an explicit disposition; import boundaries enforced. *Source inputs:* `v1-to-v2-path-map.json`; file-disposition vocabulary (`reuse-unchanged`, `git-move`, `split`, `merge`, `regenerate`, `archive-evidence`, `delete-after-proof`, `refactor-behind-contract`, `replace-retain-contract`); `validate-source-imports`; `docs/evidence/import-boundaries/`; historical bijection rule R10. *Future artefacts:* USF import/disposition map under `spec/` + `evidence/`. *Enforcement:* bijection + import-boundary validators; no source element disappears without a disposition. *Drift risk:* silent knowledge loss. *AI rule:* disposition every source element before import.

**AI agent operating standard.** *Purpose:* bind agent behaviour (§20). *Source inputs:* Charter §7; Authority Model §6. *Future artefacts:* none (governs process). *Enforcement:* via the validators and gates the other standards define; an agent's claims are checked, not trusted. *Drift risk:* AI drift, cargo-cult copying, implementation-only reasoning. *AI rule:* the whole of §20.

---

## 10. Source Evidence Standard

This section is critical. It defines how `../react` is used.

10.1 **`../react` is evidence and lineage, not future live authority** (Authority Model §2.6). It is consulted to recover intent; it never overrides accepted USF semantics.

10.2 The following are all **semantic evidence** and MUST be treated as recoverable intent, not as copyable targets:

- `../react` **source files** — behavioural evidence.
- `../react` **Makefile commands** and `make/*.mk` includes — operational/command semantics.
- `../react` **package scripts** (`package.json`, the `proof:*` family) — command and proof semantics.
- `../react` **env/config files** (`config/environments/*.json`, the generated `.env` projections, the config-contract catalogue) — configuration semantics.
- `../react` **compose services** (`compose.yaml`, ~54 services including `mock-oidc`, Keycloak, OpenBao, observability, workflow engines) — substrate and provider semantics.
- `../react` **tests and e2e journeys** (`e2e/` profiles internal/build/identity/discovery/external/prod; the suite/persona/scenario/ui-contract registries) — behavioural and proof semantics, including the hermetic-vs-live profile split.
- `../react` **proof scripts** (`apps/platform-api/scripts/*-runtime-proof.*`, the `tools/v2-readiness` collectors) — proof semantics.

10.3 **`../react` generated reports are evidence but of lower authority** than source semantic artefacts and raw proof evidence. A historical report (for example a readiness summary) MUST NOT be used to override what the historical source semantics or the raw proof evidence show. This mirrors the USF authority order (ranks 6 then 7) inside the historical corpus itself.

10.4 **`../react` MUST be imported through explicit source references and dispositions.** No historical asset may enter USF by copy-paste. Each enters as a referenced, dispositioned, and (where it asserts behaviour) proof-backed USF artefact.

10.5 **No source element may disappear without a disposition.** Every historical file, command, test, config key, and proof MUST be accounted for by a disposition (drawn from the import/disposition standard, §9). Silent omission is knowledge loss and is forbidden (Charter §5.8).

10.6 **Minimum source reference fields (conceptual; no schema created here).** A USF source reference MUST be able to express at least:

- **source repository** — the originating repo (e.g. the historical repository).
- **source commit or tag** — the pinned point (the historical repository pins a freeze commit / immutable tag).
- **source path** — the file or directory referenced.
- **source kind** — e.g. source code, Make target, package script, env/config, compose service, test, e2e journey, proof script, generated report.
- **semantic role** — what intent it carries (capability, permission, route, event, config contract, etc.).
- **evidence role** — raw evidence, normalised evidence, proof evidence, generated report, or attestation (§11).
- **disposition** — how USF carries it (reuse/move/split/merge/regenerate/refactor-behind-contract/replace-retain-contract/archive/delete-after-proof).
- **rationale** — why this disposition.
- **related USF artefact** — the USF semantic/ADR/evidence artefact it maps to.
- **proof reference** — the proof that backs it, if applicable.

The exact schema for these fields is deferred (§23).

---

## 11. Evidence Standard

11.1 Evidence **MUST** be **typed** — every evidence record declares what kind it is and conforms to a schema (deferred, §23).

11.2 Evidence **MUST** carry **source references** (§10) so it is traceable to what it exercises.

11.3 Evidence **MUST distinguish** these kinds, and MUST NOT conflate them:

- **raw evidence** — directly emitted output (command output, runtime proof fields).
- **normalised evidence** — raw evidence reshaped for indexing, with the raw retained.
- **proof evidence** — evidence that exercises a defined behaviour at a stated proof level.
- **generated reports** — summaries of the above (rank 7).
- **attestations** — human-or-tool statements of status, which MUST reference the underlying evidence.

The historical repository shows this layering concretely: per-domain `docs/evidence/**` (machine `.json` + human `.md`), per-proof `usf-audit/proof-evidence/*.json`, the `proof-evidence-index.json` roll-up, and the attestation documents.

11.4 Evidence **MUST preserve emitted proof fields through collection and reporting.** If a proof emits a field, the collector and the report MUST carry it; collection MUST NOT silently drop emitted evidence.

11.5 Evidence **MUST declare provider mode** (§12) and **MUST declare environment** (§13). A proof without a recorded provider mode and environment is incomplete.

11.6 Evidence **MUST declare freshness/staleness rules.** Freshness is commit-pinned: a record whose pinned commit ≠ the current commit is **stale**, and stale evidence MUST NOT back a current readiness claim (Authority Model §4.3). Missing or stale evidence MUST be detectable.

11.7 Evidence **MUST NOT overclaim readiness.** A readiness claim MUST NOT exceed observed evidence; claimed level MUST be ≤ observed level.

11.8 **The `../react` L6 evidence lesson (binding for USF):**

- If a proof **emits** evidence, collection **MUST preserve** it (11.4).
- **Missing collected evidence MUST fail closed** — absence is a failure, never a silent pass.
- **Readiness claims MUST NOT exceed observed evidence** (11.7).
- **Generated summaries MUST NOT hide missing raw evidence** — a green report over absent or stale raw evidence is void (Authority Model §4.3). The historical practice of reporting runtime-inventory closure *separately* from formal proof readiness, so one cannot be mistaken for the other, MUST be preserved.

---

## 12. Provider Mode Standard

12.1 USF defines provider modes conceptually (the exact vocabulary is deferred, §23). At minimum:

- **hermetic mock** — in-memory or fixture providers (e.g. a mock IdP), fully local and deterministic.
- **local composed real service** — a real provider run locally via the composed substrate.
- **external sandbox** — a real external provider in a sandbox/non-production tenant.
- **live external provider** — a real external provider in production.

These map to the historical provider classes `hermetic` / `compose-local` / `sandbox-external` / `live-external` (with `none` for non-runtime/static cases).

12.2 **Mock/hermetic providers are valid for internal platform proof** (Charter §6.1). Internal provability MUST NOT depend on live providers.

12.3 **A mock IdP is permitted and necessary for hermetic validation** (Charter §6.2). The real authentication code path MAY be exercised against the hermetic IdP, and that proof is valid *as hermetic proof*.

12.4 **Hermetic proof MUST NOT be mislabelled as live external proof** (Charter §6.3; Authority Model §4.4). This is a **forbidden convention** (§7).

12.5 **Provider mode MUST be recorded** in both the **semantic evidence** (which provider class a capability uses per environment) and the **proof evidence** (which provider class/substrate a proof actually used).

12.6 **Go-live readiness requires explicit external-provider evidence** where a capability depends on an external provider. The hermetic→live boundary is a higher rung of proof (historically `liveProviderMinimumLevel: 4`); USF MUST preserve a comparable floor.

12.7 **Future AI MUST NOT "upgrade" provider claims by inference.** An agent MUST NOT conclude that a live provider works because the hermetic equivalent passed, nor relabel a hermetic proof as live (§20).

---

## 13. Environment Standard

13.1 USF defines environment classes conceptually (exact vocabulary deferred, §23):

- **local** — a developer machine; fast iteration; hermetic or composed providers.
- **hermetic** — fully isolated, deterministic, offline; the default proof substrate.
- **integration** — composed real local services exercised together (the historical "compose-real-local" shape).
- **staging** — a production-shaped rehearsal environment.
- **production-shaped** — topology mirroring production with sandbox providers; rehearses migration, rollback, observability.
- **production / live** — real tenant operation with live providers.

These align with the historical four-stage ladder (dev/test/staging/prod) and its provider modes (`semantic-dev`, `compose-real-local`, `prod-shaped-sandbox`, `live-readiness-only`) and the e2e profile split (internal/build/identity = hermetic; discovery/external/prod = live).

13.2 **Each class means a different evidence expectation.** Hermetic/local evidence proves behaviour and contracts; integration adds real-local substrate; staging/production-shaped add migration/rollback/observability rehearsal; production permits only non-destructive health and synthetic smoke evidence (destructive proof belongs to lower environments — Authority Model §2.4).

13.3 **`../react` Make/env/config semantics MUST be preserved** (§14): per-environment isolation, the manifest→generated-`.env` model, readiness gates, and the per-environment provider matrix are governed assets, not incidental files.

13.4 **Production-shaped is not automatically production-live.** A production-shaped certification (e.g. the historical `prod-shaped-certification`) demonstrates *shape and rehearsal*, not live-provider operation. USF MUST NOT treat production-shaped evidence as live go-live evidence (§12.4).

13.5 **Environment claims are validated.** A capability's per-environment provider/proof/promotion/rollback policy MUST be checkable, and an environment claim that exceeds its evidence (e.g. "production-ready" backed only by hermetic proof) MUST fail closed.

---

## 14. Command and Configuration Standard

14.1 **Make targets, package scripts, CLI commands, env vars, config files, and compose services are semantic assets** (Charter §5.13), not incidental files.

14.2 Every **command** MUST declare:

- **purpose** — what it does.
- **authority** — who/what owns it and which gate it serves.
- **inputs** — artefacts/env it consumes.
- **outputs** — artefacts/evidence it produces.
- **environment scope** — which environment classes it applies to (§13).
- **evidence outputs** — what evidence it emits, if any.
- **failure semantics** — exit behaviour, fail-closed/degraded handling.

(The historical `operational-semantics.json` `runtimeCommandLinks` already carry `purpose`, `envScope`, `failureSemantics`, `safetyControls`, and `testCoverage` — USF MUST preserve this richness.)

14.3 Every **env/config key** MUST declare:

- **source** — its source-of-truth manifest (config is generated from manifests, never hand-edited).
- **meaning** — what it controls.
- **requiredness** — required/optional per environment.
- **environment applicability** — which environment classes it applies to.
- **secret classification** — secret vs non-secret, and secret tier where applicable.
- **provider mode relevance** — whether it selects or configures a provider mode (§12).
- **proof relevance** — whether a proof depends on it.

(Grounded in `v1-config-contract-catalogue.json`: key, type, required, secret, secretTier, consumerProjection, restartOrReload.)

14.4 **No command or config key may be deleted or renamed without a source disposition** (§10) and, where it changes behaviour or governance, an ADR and semantic update (Authority Model §5). Silent command/config loss is drift.

---

## 15. Interface and Event Standards

15.1 **API routes, service calls, commands, events, messages, workflows, queues, topics, and cross-capability interactions MUST be captured as semantic contracts** before or during implementation — not inferred afterward from code.

15.2 **OpenAPI-style principles** (§8) guide synchronous HTTP/API contracts; **AsyncAPI-style principles** (§8) guide event/message contracts. USF adopts the *principle* of contract-first/contract-reconciled interfaces; it does not yet require OpenAPI/AsyncAPI files (deferred, §23).

15.3 **`../react` semantic evidence MUST be mined** for these contracts: `operational-semantics.json` (operations, runtime command links), `event-semantics.json` (event schemas, idempotency, ordering, DLQ, retention), `cross-capability-interactions.json` (8 interaction types: sync-api, event, workflow, data-reference, readiness-dependency, provider-dependency, audit-dependency, lifecycle-dependency), the tests/e2e journeys, and the proof scripts.

15.4 **Interfaces and events MUST NOT be inferred from code alone when semantic artefacts exist.** Where a semantic contract exists, it is rank-1 authority; code conforms to it (Authority Model §4.1). Where none exists, the intent is recovered from `../react` and promoted to a USF contract before implementation (§20, Authority Model §6.4) — not guessed from handlers.

---

## 16. Observability, Audit, and Runtime Semantics Standard

16.1 **Logs, metrics, traces, audit events, runtime proof outputs, and operational events are semantic assets.** They are defined, controlled, and validated, not emitted ad hoc.

16.2 **OpenTelemetry-style semantic-convention principles** (§8) guide naming and shape; USF will define its own controlled, validator-checkable observability vocabulary. USF does not claim OTel compliance.

16.3 **Observability MUST support proof, auditability, debugging, and drift detection.** The historical assurance bar (0 routes without tracing/logging/metrics; observability-correlation evidence across Loki/Tempo/Sentry) is the target USF preserves.

16.4 **Audit events MUST be explicit for security-sensitive and state-changing operations.** Every mutating or privileged action MUST have a defined audit semantic (the historical bar: 0 mutations without audit).

16.5 **Future AI MUST NOT remove observability or audit semantics as a refactor.** Removing or renaming a signal, metric, trace, or audit event is a behaviour change requiring coupled updates (Authority Model §5), never an incidental cleanup.

---

## 17. Directory and Naming Standard

17.1 USF paths and artefact names **MUST NOT** contain migration-phase or status tokens. Specifically forbidden in any USF path segment:

- `v2` (or any branch-version suffix)
- `legacy`
- `old`
- `new`
- `temp`
- `transitional`
- a **redundant `usf` segment** inside the `usf` repository

17.2 Names **MUST** describe a **stable semantic purpose**, not a migration phase or origin. A directory is named for what it *is* and *owns*, not for where it came from or when it was added.

17.3 Path names **MUST** support the long-term final-state architecture. The historical directory-contract model (`v2-directory-contracts.json`: responsibility, allowedContents, forbiddenContents, owner, dependencyDirection, architectureRule) is the pattern USF will adopt for its own directory contracts.

17.4 **Historical names from `../react` MAY appear only as source references or quoted evidence** (§10), never as new USF path names. Citing `../react/docs/v2-foundation/...` is a reference; creating a `v2-foundation/` directory in USF is forbidden.

17.5 Validators MUST detect forbidden tokens and reject reintroduction of deprecated historical conventions (§7) where feasible.

---

## 18. Validator Standard

18.1 **Validators are executable enforcement of standards** — not documentation. A standard that governs semantic safety, proof integrity, security, drift, or AI alignment MUST progress to validator-enforced maturity (§21).

18.2 **Validators MUST fail closed on ambiguity.** Any contradiction, unresolved reference, or undecidable state is an error, not a pass (Authority Model §3.3). The historical validator's contract — *"fails closed: any contradiction is an error"*, *"normalises no aliases"*, *"writes no runtime file"*, explicit exit codes — is the USF baseline.

18.3 **Validators MUST check at least:**

- **schema validity** — artefacts conform to their schemas.
- **reference resolution** — every source/semantic/proof/ADR/validator reference resolves.
- **evidence completeness** — required evidence is present, not silently absent.
- **source disposition** — every imported source element has a disposition (§10).
- **provider-mode honesty** — recorded provider class matches the substrate used; no hermetic-as-live (§12).
- **environment honesty** — environment claims do not exceed their evidence (§13).
- **ADR linkage** — decisions are accepted and traced; behaviour changes have governing ADRs (§19).
- **proof-claim consistency** — claimed level/provider/environment ≤ observed; negative controls hold (§11).

18.4 **Validators MUST NOT silently downgrade or silently accept missing evidence.** A downgrade or a tolerated gap MUST be an explicit, recorded finding.

18.5 **Validators MUST produce machine-readable reports.** Reports are rank-7 (Authority Model §2.7): regenerable, freshness-stamped, and **lower authority than the evidence they summarize**. A report MUST NOT assert a status the artefacts do not support.

18.6 **Validators MUST be falsifiable.** Negative controls (deliberately broken fixtures) MUST demonstrate that each enforcement actually catches the violation it claims to catch.

---

## 19. ADR Standard

19.1 **ADRs are normative decision records**, rank-2 authority (Authority Model §2.2). They are not informal notes.

19.2 **ADRs MUST be written or generated from evidence, not from vibes.** An ADR MUST derive from semantic and proof evidence and recorded rationale.

19.3 **Every ADR MUST include:**

- **semantic references** — the semantic definitions it governs.
- **source references** — the `../react` lineage it derives from (§10).
- **proof references** — the proof evidence supporting it, where applicable.
- **validator references** — the rule(s) that enforce it.
- **invariants** — what MUST remain true.
- **permitted change** — what MAY change under it.
- **forbidden drift** — what MUST NOT change without superseding it.
- **consequences** — the trade-offs accepted.
- **AI alignment rules** — explicit constraints for future agents (§20).

19.4 **ADRs MUST NOT be generic prose.** A decision that carries no machine-checkable consequence carries no governance force (Charter §4; historically a roadmap was rejected because *"a roadmap carries no governance force"*).

19.5 **ADRs MUST be consistent** with the Authority Model and this Standards Profile. An ADR that contradicts the constitutional layer is invalid (Authority Model §3.4).

19.6 **ADRs MUST record external-standard adoption/adaptation decisions** (§7, §8). When USF adopts, adapts, deprecates, or forbids a standard, an ADR records the decision, scope, and enforcement.

19.7 The historical split of decision (`v2-decision-catalog.json`) and lineage (`v2-decision-lineage.json`) is the *evidence* for this standard; USF will define its own unified ADR form and schema (deferred, §23). The historical untraced-decision failure (rule R13) is the enforcement floor.

---

## 20. AI Agent Standards

Future AI agents (and humans) working on USF **MUST**:

20.1 **Inspect the Charter, Authority Model, and this Standards Profile before major work.**

20.2 **Inspect the relevant semantic definitions before source code.** Semantics are the primary input; source is the thing made to conform (Authority Model §2.1, §6.2).

20.3 **Preserve source lineage.** Keep and cite traceability to `../react` and to USF semantics/decisions (§10; Authority Model §6.3).

20.4 **Not infer missing semantics from implementation alone.** Absent intent is recovered from `../react` and promoted via a proposed semantic definition + ADR + validator, then stopped for acceptance — never guessed from code (Authority Model §6.4).

20.5 **Not treat generated reports as canonical.** Verify against artefacts; regenerate from current state (Authority Model §6.5).

20.6 **Not confuse hermetic mock proof with live external proof.** Respect provider classes and the live-provider floor; never relabel upward (§12; Authority Model §6.6).

20.7 **Not use forbidden path names** (§17).

20.8 **Not create implementation before the semantic authority exists.** Implementation follows semantics (Charter §5.12). Building code for an undefined capability is forbidden.

20.9 **Update semantics, ADRs, validators, evidence, and tests together when changing behaviour.** A partial change is drift; validators fail closed (Authority Model §5).

20.10 **Stop or fail when an authority conflict is unresolved.** Do not proceed by preferring the convenient artefact (Authority Model §6.8).

---

## 21. Compliance and Maturity

21.1 USF standards adoption is staged. Each standard sits at one maturity level and is expected to progress:

1. **Documented** — described in prose in a USF document.
2. **Structured** — expressed in a defined, consistent, machine-parseable shape (agreed fields), but not yet schema-validated.
3. **Machine-readable** — has an explicit, versioned, identifiable schema.
4. **Validator-enforced** — a validator checks conformance and **fails closed** on violation.
5. **Proof-backed** — conformance is exercised by executed proof evidence, not only a static check.
6. **Release-blocking** — wired into the gate (the equivalent of `make all` / readiness) so a violation blocks promotion or release.

21.2 **Early USF standards MAY begin at *documented*.** This profile itself is currently at *documented* maturity.

21.3 **Standards that govern semantic safety, proof integrity, security, drift control, or AI alignment MUST progress to at least *validator-enforced*.** A standard in those domains MUST NOT remain advisory indefinitely; an unenforced safety standard is a tracked gap, not an acceptable end state.

21.4 A standard's maturity MUST be recorded (in an ADR or registry) so progression and gaps are visible.

---

## 22. Acceptance Criteria for This Standards Profile

This profile is acceptable when **all** hold:

- **Consistent with the Charter and Authority Model** — operationalizes them (§4, §5); does not redefine or contradict them.
- **Grounded in `../react`** — every internal standard cites concrete historical inputs (§9, §10).
- **No application/runtime code imported** — this document copies no source or runtime code from `../react`.
- **No extra files created** — only `docs/architecture/standards-profile.md` is created.
- **No false compliance claims** — external standards are classified honestly as adopted/adapted/inspired-by/not-yet (§7, §8); no full-compliance claim is made without substantiating artefacts.
- **Normative language defined** — §6 defines BCP 14 usage and the uppercase-only rule.
- **External standards classified honestly** — §8.
- **Source-evidence role defined** — §10, including minimum source-reference fields without creating a schema.
- **Provider and environment standards defined** — §12, §13.
- **AI alignment rules defined** — §20 (and woven through §9–§19).
- **Future artefacts identified without creating them** — schemas, registries, vocabularies, ADRs, validators, and evidence envelopes are named and located, not authored (§9, §23).

---

## 23. Open Questions / Deferred Work

The following are **deferred, not blockers** after the later taxonomy, vocabulary, and schema-registry artefacts in this foundational sequence. Resolved successors are governed by those later artefacts; the remaining items below MUST be resolved by a future ADR or schema/validator artefact before they are enforced.

> **Amendment (2026-06 — partially resolved by directive).** Under an explicit directive, the 23 JSON Schema files now exist under `spec/schemas/` at lifecycle `draft`, and a draft/advisory validator (`tools/validate-spec/validate-spec.py`, `jsonschema==4.10.3`) is CI-enforced for the `spec/` corpus (see schema-authoring-standard §26 Amendment A; Naming Standard §6.E.1). This partially resolves the bullets below at **draft schema level / advisory validator level only** — not active semantic finality. Specifically resolved-to-draft: JSON Schema validator tooling; schema self-validation of the registry/taxonomy/vocabulary catalogues; and the evidence-envelope, provider-mode, environment, validator-report, source-reference, ADR, and remaining schema *files*. **Still deferred:** ADR formalisation of this lift, real (non-synthetic) instance validation, promotion to active maturity, OpenAPI/AsyncAPI decisions, the observability attribute vocabulary, and implementation extraction.

- **JSON Schema validator tooling and schema self-validation** *(partially resolved — see Amendment above; validator is advisory)*; the dialect is resolved by `schema-authoring-standard.md` as Draft 2020-12, and the schema `$id` convention is resolved there as `urn:usf:schema:<schema-name>` (any `$id` versioning convention remains deferred).
- **Exact ADR schema** (the unified USF ADR form, superseding the historical catalog/lineage split) *(schema file exists at draft — see Amendment; ADR canon + active maturity still deferred)*.
- **Exact evidence envelope schema** (fields for raw/normalised/proof/report/attestation, provider mode, environment, freshness) *(draft schema exists — see Amendment)*.
- **Exact provider-mode schema and selector enforcement** (the value set now exists; draft schema exists — see Amendment; selector wiring remains deferred).
- **Exact environment schema and readiness-gate enforcement** (the value set now exists; draft schema exists — see Amendment; gate wiring remains deferred).
- **Exact validator report schema** (machine-readable finding shape, severity, subject) *(draft schema exists — see Amendment)*.
- **Exact OpenAPI/AsyncAPI artefact decisions** (whether to adopt the file formats or a USF-defined interface/event contract form).
- **Exact observability attribute vocabulary** (the controlled set of names for logs/metrics/traces/spans/attributes/events).
- **Exact source registry fields** (the schema for the minimum source-reference fields named in §10.6).

---

*End of USF Standards Profile (Draft / Foundational). This document creates no schema, taxonomy, vocabulary, registry, ADR, evidence file, validator, tool, or implementation directory; it defines the standards those artefacts must meet.*
