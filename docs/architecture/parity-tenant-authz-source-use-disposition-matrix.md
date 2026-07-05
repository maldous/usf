# Parity Tenant-Authz Source-Use Disposition Matrix

| | |
|---|---|
| Document type | Architecture / source-use governance matrix |
| Status | Draft / parity-tenant-authz (USF-140) implementation coverage |
| Authority level | Reviewable implementation coverage; subordinate to the Charter, Authority Model, accepted ADRs, validator rules, runtime proof evidence, semantic instances, and the implementation directive |
| Issue scope | USF-140 under USF-133 |
| Source row basis | ADR 0010, docs/architecture/tenant-authorization-standard.md, and historical `../react` tenant/authz/RBAC/ABAC/break-glass evidence as lineage only |
| Repository state | No React runtime/application code copied; no React path mirroring; no UI; no live/production claim |

## Treatment Rules

`source-derived-rewrite` means the behaviour was recovered from historical `../react` evidence and freshly authored against USF semantics (no copy, no path mirroring). `new-with-rationale` means USF-defined. `evidence-only-support` means a test/proof artefact. Files modified in this slice that already carry a disposition row in another matrix (packages/core, packages/ports, packages/contracts, packages/openapi, apps/api, capabilities/tenant/src/index.ts) are not re-listed here.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `capabilities/tenant/src/authorization-policy.ts` | source-derived-rewrite | React ROLE_PERMISSION_MAP and policy evaluation lineage; ADR 0010 | USF-owned default-deny RBAC/ABAC policy: role->permission, action->permission, sensitive-classification gate, break-glass scope. |
| `capabilities/tenant/src/pdp.ts` | source-derived-rewrite | React three-tier PDP lineage; ADR 0010 | USF-owned application-layer policy decision point combining RBAC and ABAC over membership, failing closed, with structured decisions and break-glass. |
| `capabilities/tenant/src/membership.ts` | source-derived-rewrite | React tenant membership and identity-mapping lineage | In-memory tenant membership directory and identity directory (stable actor mapping; only active memberships authorize). |
| `capabilities/tenant/src/authorize.ts` | source-derived-rewrite | React request-level authorization audit lineage | Authorizer capability: PDP decision plus authorization-decision audit evidence. |
| `packages/proof/src/authz-rls-consistency-proof.ts` | evidence-only-support | PDP/RLS consistency requirement | Composed-Postgres proof that the PDP and RLS agree on tenant boundaries. |
| `docs/architecture/authz-enterprise-proof-depth-matrix.json` | evidence-only-support | USF-141 enterprise authorization depth requirement | Machine-readable control disposition for synchronous PDP, membership lifecycle, cache/revalidation posture, ABAC depth, delegation/impersonation deferral, field-level boundaries, token/session transfer, rate-limit transfer, workflow revalidation transfer, and non-claims. |
| `tests/capabilities/authorization.test.ts` | evidence-only-support | Tenant/authz behaviour proof requirement | Hermetic PDP/RBAC/ABAC/membership/break-glass decision-matrix tests. |

## Non-goals

No React runtime/application code copy. No React path mirroring. No UI/UX. No Playwright. No staging/production/deployment/live-external-provider/production-live claim. No full authorization parity, full dev readiness, full product readiness, SOC readiness, ISO certification, enterprise production readiness, or USF-133 closure claim.
