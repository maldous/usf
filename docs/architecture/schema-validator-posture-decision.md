# Schema and Validator Posture Decision

| | |
|---|---|
| **Document type** | Architecture / schema and validator posture decision |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, and runtime proof evidence |
| **Issue scope** | USF-67 |
| **Primary inputs** | `docs/architecture/validator-maturity-promotion-criteria.md`, `docs/adr/0001-validator-deferral-lift.md`, `spec/registries/schema-registry.json` |

This document records the schema and validator posture decision for the future USF-39 implementation extraction directive. It does not promote schemas, change validator maturity, change CI, create evidence, or authorise implementation/runtime code.

## Decision

For USF-39, the current required posture is:

- all 23 schema registry entries remain `draft`;
- `tools/validate-spec/validate-spec.py` remains a draft/advisory validator;
- draft schemas plus repeatable advisory validation are acceptable as a pre-implementation governance gate only when USF-61 cites this decision and all other entry gates pass;
- active schema or active validator promotion is deferred to a separate reviewed promotion PR;
- no schema lifecycle, schema registry status, standards maturity wording, or CI release-blocking posture may change inside USF-67.

This means USF-39 may not claim that schemas are active, fully accepted, release-blocking, or production-grade final solely because advisory validation passes.

## Current Registry Posture

At the time of this decision:

| Registry fact | Current value |
|---|---|
| Schema entries | 23 |
| `lifecycleState` | 23 `draft`, 0 `active` |
| `status` | 23 `draft`, 0 `active` |
| Validator maturity | draft/advisory |
| Active-promotion decision | deferred |

## Active Promotion Requirement If Later Required

If a later human directive or review requires active schema and validator promotion before implementation extraction, that promotion must be a separate reviewed change and must satisfy USF-30.

At minimum, the later promotion PR must list:

- exact schemas proposed for promotion;
- evidence that each promoted schema file exists and parses as strict JSON;
- Draft 2020-12 schema validity for each promoted schema;
- stable `$id` identity using `urn:usf:schema:<schema-name>`;
- registry synchronisation for id, path, class, family, lifecycle, status, authority role, taxonomy refs, vocabulary refs, and governed ontology concepts;
- vocabulary enum binding checks;
- taxonomy and ontology reference resolution;
- object closure and required-field review;
- safety invariant coverage for provider, environment, proof, report, source-import, and generated-report boundaries where applicable;
- positive fixture coverage;
- negative fixture or planted-defect coverage with stable rule IDs;
- real authored instance coverage for the schema where instances exist;
- reference resolution across source/import, ADR, semantic, evidence, and validator-report artefacts;
- generated-report handling that preserves rank 7 authority;
- standards, registry, ADR, validator, and CI updates made together.

No schema may be promoted only because synthetic fixtures or advisory validation pass.

## Deferred Active Promotion Risk

Keeping schemas and the validator in draft/advisory posture has residual risk:

- schema-valid instances may still miss future active-mode invariants;
- validator rule coverage may lag the full USF-30 active criteria;
- CI proves advisory consistency, not release-blocking maturity;
- future implementation PRs could cite schemas incorrectly unless USF-60 and USF-61 require explicit guardrails;
- reviewer language could overstate draft schema authority as active acceptance.

## Mitigation While Deferred

Until a promotion PR exists:

- USF-61 must describe schemas as draft and the validator as advisory;
- USF-61 must cite this decision and USF-30 before authorising any implementation extraction;
- USF-60 must harden implementation PR guards without claiming full active validator maturity;
- implementation PRs must run advisory `validate-spec` gates and any USF-60 implementation guards required at that time;
- no implementation PR may claim active schema conformance, release-blocking validator maturity, or production readiness from advisory validation alone;
- generated validator reports, if emitted later, remain generated reports and cannot override source findings or proof evidence.

## USF-61 Citation Requirement

USF-61 can cite this decision as follows:

> USF-67 records that all schema registry entries remain draft and `validate-spec` remains advisory for the first implementation extraction gate. USF-39 must not claim active schema or active validator maturity unless a separate promotion PR later satisfies USF-30 and updates the registry, standards, ADRs, validator rules, and CI together.

## Non-Goals

- No schema lifecycle is changed.
- No schema registry entry is changed.
- No validator mode is changed from advisory to active.
- No CI gate is changed.
- No ADR is created.
- No evidence record is created.
- No generated report is emitted or committed.
- No implementation/runtime code is created or imported.

## Readiness

This decision closes the USF-67 posture decision only. It does not unblock USF-39 by itself. USF-39 remains gated by proof evidence, implementation guardrails, report policy, directive acceptance, final readiness validation, and any later human decision about active promotion.
