# 0010 USF Authorization Policy Decision Point

## Status

Accepted.

## Description

Records the human-approved decision (tracked as USF-136) that USF V2 owns an internal application-layer policy decision point (PDP) combining RBAC and ABAC inputs and failing closed, with an external identity provider supplying identity claims only and Postgres row-level security remaining a mandatory tenant-scoped persistence isolation backstop rather than the sole authorization layer. This ADR records authority only; it creates no implementation code, no adapters, no schema activation, and no runtime proof.

## Context

USF's own source lineage expresses authorization across several layers: application-layer permission and resource-policy checks, attribute-based decisions, and database row-level security, with identity brokered through Keycloak. During the foundation-completeness readiness pass the exact USF authority for the policy decision point was recorded as a `requires-human-decision` item (scope-classification matrix; USF-136), because the Authority Model forbids inferring missing semantics from source lineage.

A human has now decided the authorization model. Under the Authority Model a decision of this weight needs rank-2 ADR coverage so it is durable repository authority, not tracker context or planning prose. Linear records the decision as work tracking only.

## Decision

USF V2 uses a USF-owned internal policy decision point for application-layer authorization.

The PDP combines RBAC inputs and ABAC inputs and fails closed by default. An identity provider (Keycloak or any IdP) supplies identity claims only and is not the sole authorization system. Final authorization decisions are owned by the USF PDP, not delegated wholly to the identity provider.

Postgres row-level security remains mandatory for tenant-scoped persistence and acts as the database isolation backstop. RLS is not the only authorization layer; it is a defence-in-depth backstop beneath the PDP, and a capability must not treat the database as its sole authorization mechanism.

Policy assignments, resource attributes, break-glass grants, and authorization evidence are represented in USF semantic contracts and persisted through authorised adapters. Capabilities must not delegate final authorization solely to the identity provider or to the database.

## Rationale

Combining RBAC and ABAC in a USF-owned PDP keeps the application-layer authorization decision inside USF semantics, where it can be defined, proven, and audited, rather than scattered across a provider and the database. Failing closed by default preserves the Charter's fail-closed posture. Keeping RLS mandatory but subordinate gives tenant isolation a database backstop without letting the database become the only place authorization is decided, which would make application-layer policy invisible and unprovable. Representing assignments, attributes, break-glass grants, and evidence in semantic contracts keeps authorization machine-readable and AI-buildable.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/full-react-parity-readiness-directive.md`
- `docs/architecture/react-parity-scope-classification-matrix.md`
- `spec/instances/semantic-contract/abac-policy-decision-point.json`
- `spec/instances/semantic-contract/rbac-roles-and-permissions.json`
- `spec/instances/semantic-contract/tenant-isolation-proof.json`
- `spec/instances/semantic-contract/relational-storage-and-migrations-and-rls.json`
- `spec/instances/semantic-contract/support-mode-break-glass-access.json`
- `spec/instances/semantic-contract/authentication-platform.json`

## Source References

- `docs/architecture/capability-source-coverage-matrix.md`
- `docs/architecture/foundation-completeness-audit.md`

## Proof References

- None. This ADR records an authority decision and does not assert runtime proof. Proof is added when the PDP is implemented under a separate authorised implementation directive.

## Validator References

- `tools/validate-spec/validate-spec.py`

## Invariants

- The application-layer policy decision point is owned by USF, not by an external identity provider.
- The PDP combines RBAC and ABAC inputs.
- The PDP fails closed by default.
- An identity provider supplies identity claims only and is not the sole authorization system.
- Postgres row-level security remains mandatory for tenant-scoped persistence.
- Row-level security is a database isolation backstop and not the only authorization layer.
- Policy assignments, resource attributes, break-glass grants, and authorization evidence are represented in USF semantic contracts and persisted through authorised adapters.
- A capability must not delegate final authorization solely to the identity provider or to the database.

## Permitted Changes

- Implement the PDP behind USF ports and adapters under a separate authorised implementation directive, with semantic contracts, tests, and proof.
- Enrich the RBAC, ABAC, tenant-isolation, break-glass, and persistence semantic contracts to reference this decision.
- Add validators and proofs that demonstrate fail-closed PDP behaviour and RLS backstop behaviour.

## Forbidden Drift

- Do not treat the identity provider as the authorization system of record.
- Do not treat row-level security as the only authorization layer or remove it as the tenant-persistence backstop.
- Do not allow a default-open authorization path; the PDP fails closed.
- Do not infer PDP behaviour from USF's own source lineage; implement against USF semantics.
- Do not copy authorization code from an external sibling repository or mirror its paths.

## Consequences

- The USF authorization model has rank-2 ADR coverage and unblocks the authorization portion of USF-136.
- The `abac-policy-decision-point` semantic contract and related RBAC, tenant, and persistence contracts reference this ADR as authority.
- A future implementation directive may author the PDP behind USF ports with fail-closed semantics and an RLS backstop, with its own proof.
- Authorization evidence becomes a represented, auditable concern in semantic contracts.

## AI Alignment Rules

- Agents must treat the USF-owned PDP as the application-layer authorization authority and must not delegate final authorization to an identity provider or the database alone.
- Agents must preserve fail-closed default behaviour and the mandatory RLS tenant backstop.
- Agents must not implement the PDP from this ADR alone; a separate authorised implementation directive is required.
- Agents must not infer authorization semantics from USF's own source-lineage code.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0010-authorization-policy-decision-point.json`
