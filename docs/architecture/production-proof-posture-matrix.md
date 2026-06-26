# Production Proof Posture Matrix

| | |
|---|---|
| **Document type** | Architecture / proof posture matrix |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, and runtime proof evidence |
| **Issue scope** | USF-62 |
| **Primary inputs** | `docs/architecture/proof-and-evidence-pipeline-plan.md`, `docs/architecture/validator-maturity-promotion-criteria.md`, `spec/vocabularies/vocabulary-catalog.json` |

This document defines the proof posture required before the first implementation extraction directive can be issued and before later implementation or release gates can claim readiness. It creates no proof evidence, imports no runtime/application code, emits no generated report, and promotes no schema to `active`.

## Governing Rules

- Provider mode and environment are independent dimensions. One MUST NOT upgrade the other by implication.
- Hermetic proof is valid internal proof, but it MUST NOT satisfy a live-external-provider claim.
- Production-shaped proof is valid rehearsal proof, but it MUST NOT satisfy production-live readiness.
- Generated reports are summaries only. They MUST NOT replace emitted and collected proof evidence.
- Stale historical evidence may be cited as lineage only. It MUST NOT satisfy current readiness.
- A readiness claim MUST NOT exceed the observed proof level, provider mode, environment, or freshness of the evidence.
- Missing proof evidence, missing collected evidence, unknown report status, or stale freshness fails closed.

## Gate Types

| Gate type | Meaning |
|---|---|
| directive-blocking | Required before USF-61 can authorise a future USF-39 implementation extraction directive. |
| implementation-merge-blocking | Required before a future implementation PR for the slice may merge once implementation code exists. |
| release-blocking | Required before release, production-shaped readiness, live provider readiness, or production-live claims. |
| lineage-only | May be cited as historical or semantic lineage but cannot satisfy current readiness. |

## Proof Posture Matrix

| Posture | providerMode | environment | Required proof level | Freshness requirement | Gate type | Required for first implementation slice | Required before production-live release | Notes |
|---|---|---|---|---|---|---|---|---|
| Hermetic internal proof floor | `hermetic-mock` | `hermetic` | `behaviour-proven` minimum; `foundation-proven` target where the slice claims operational foundation readiness | Current commit for the directive or PR being claimed; stale records are lineage-only | directive-blocking | yes | no, by itself | This is the default proof floor for USF-59. It cannot be replaced by generated reports and cannot satisfy live-external-provider readiness. |
| Local composed substrate proof | `local-composed-real-service` | `integration` | `substrate-proven` minimum; `resilience-proven` when restart, retry, recovery, tenancy, or storage semantics are in scope | Current commit for any implementation PR that claims local composed readiness | implementation-merge-blocking once implementation exists | no, by itself | Required before merging implementation that depends on composed real local services. It does not imply external sandbox or production-live readiness. |
| External sandbox provider proof | `external-sandbox` | `production-shaped` | `substrate-proven` minimum; `resilience-proven` for provider failover, callback, rollback, or recovery claims | Current commit and current sandbox configuration for any sandbox readiness claim | release-blocking | no for first implementation merge | no, by itself | Required before claiming external-provider readiness in a non-production tenant. It does not satisfy live-external-provider or production-live claims. |
| Production-shaped rehearsal proof | `external-sandbox` or `local-composed-real-service` | `production-shaped` | `resilience-proven` minimum; `foundation-proven` for full operational foundation readiness | Current commit and current production-shaped topology; generated summaries must reference underlying evidence | release-blocking | no for first implementation merge | no, by itself | Required before production-shaped readiness. It must preserve rollback, observability, migration, and provider/environment distinctions. |
| Live external provider proof | `live-external-provider` | `production-live` | `substrate-proven` minimum for non-destructive smoke/contract evidence; stronger claims require matching observed proof level | Current commit and current live provider configuration; destructive proof is not permitted in production-live | release-blocking | no | yes where the capability depends on a live external provider | Not required for the first implementation slice merge, but required before any live-external-provider readiness claim. Hermetic, local, and sandbox proof cannot upgrade into this posture. |
| Production-live operational proof | `live-external-provider` where an external provider is involved; otherwise the exact provider mode used by the live path | `production-live` | Non-destructive `substrate-proven` minimum for live smoke and health; `foundation-proven` only with complete governed evidence and safe operational bounds | Current commit, current production deployment, and current live operational evidence | release-blocking | no | yes for production-live readiness | Not required before first implementation merge. It is required before production-live release or go-live claims and cannot be inferred from production-shaped rehearsal. |
| Historical source and generated-report lineage | recorded historical provider mode if known; otherwise none | recorded historical environment if known; otherwise none | none for current readiness | Stale by default unless re-collected and commit-pinned under the evidence pipeline | lineage-only | no | no | May support semantic derivation and planning only. Historical reports and source evidence cannot satisfy USF-59 current readiness. |

## First-Slice Decisions

For the first authentication implementation slice:

- Live-external-provider proof is **not required before the first implementation merge**.
- Production-live proof is **not required before the first implementation merge**.
- Hermetic proof is **directive-blocking** and must be fresh for the claim being made.
- Local composed substrate proof is **implementation-merge-blocking once implementation exists** and the PR claims composed-service behaviour.
- External sandbox, production-shaped, live-external-provider, and production-live proof are **release-blocking**, not first-merge blockers.
- Any claim above the hermetic floor must be backed by matching provider mode, environment, observed proof level, and current freshness.

## USF-59 Evidence Target

USF-59 can produce current commit-pinned proof evidence against this matrix by recording:

- the posture row being exercised;
- `providerMode`;
- `environment`;
- `proofLevelClaimed`;
- `proofLevelObserved`;
- emitted evidence;
- collected evidence;
- freshness commit and stale flag;
- failure semantics;
- source, semantic, and command references for the authentication slice.

USF-59 must fail closed if emitted or collected evidence is missing above discovery level, if the evidence is stale, if the provider mode and environment do not match the posture row, or if a generated report is offered as a substitute for proof evidence.

## Non-Goals

- No proof evidence is produced.
- No proof command is run.
- No generated report is emitted or committed.
- No implementation extraction is authorised.
- No runtime/application code is created or imported.
- No schema is promoted to `active`.

## Readiness

This matrix satisfies the USF-62 planning boundary when committed with passing repository validation. It gives USF-73 and USF-59 a proof posture target, but it does not claim that any posture has passed.
