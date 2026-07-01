# Tenant Authorization Standard

| | |
|---|---|
| Document type | Architecture / authorization governance standard (normative) |
| Status | Draft / parity-tenant-authz (USF-140) implementation standard |
| Authority level | Reviewable governance standard; subordinate to the Charter, Authority Model, ADR 0010, validator rules, and runtime proof evidence |
| Follows | `docs/architecture/charter.md`, `docs/architecture/authority-model.md`, `docs/adr/0010-authorization-policy-decision-point.md`, `docs/architecture/enterprise-persistence-metadata-and-classification-standard.md` |
| Issue scope | USF-140 (parity-tenant-authz) under USF-133; enterprise depth gate USF-141 |
| Repository state | The repository already contains the authorised local dev/test bootstrap runtime and the DB/RLS substrate. This standard governs application-layer authorization; it introduces no UI, no Playwright, and no live/production claim. |

> **Normative language.** **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** carry BCP 14 intent. Items marked **(enforced now)** are implemented, tested, validated, and proven in this slice; items marked **(bounded, USF-141)** have local proof-depth or explicit reclassification in `docs/architecture/authz-enterprise-proof-depth-matrix.json`; items marked **(transferred/deferred)** remain linked to source issues and are not readiness claims.

## 1. Identity is not authorization (enforced now)

IdP / OIDC / Keycloak supply **identity, authentication, and claims**. The USF PDP makes the **final application-layer authorization** decision. Postgres RLS is the **database isolation backstop**. No capability may treat an IdP role, group, email domain, token claim, or realm permission as final authorization by itself. Every protected action flows through a USF PDP decision unless explicitly classified public or system-internal. The PDP uses USF-authoritative tenant membership (not raw claims) for role→permission mapping; an IdP claim with no active membership does not authorize.

## 2. Subject identity and account mapping (enforced now; depth transferred)

A stable internal `actorId` is mapped from `externalSubject` + `identityProvider` (an `IdentityDirectory`). Email is **not** the primary subject key. Disabled/suspended/deleted identities and inactive memberships fail closed. Email change, duplicate email across tenants, and cross-provider collision must not silently collapse or create actors. Full enrolment, token, browser-session, and live identity flows are transferred to USF-149 and are not authorization-readiness claims from USF-141.

## 3. Tenant membership lifecycle (enforced now)

Membership status is one of `pending`, `invited`, `active`, `suspended`, `revoked`, `expired`, `deleted`. **Only `active` authorizes**; all others fail closed. Deleted/revoked memberships must not authorize through cached claims (no authorization cache exists in this slice; the PDP re-evaluates every request). Invite/transfer transition flows are tracked (USF-141).

## 4. Tenant context and switching (enforced now)

Tenant context derives from authenticated claims; the request tenant (path/header/query/body) **MUST** match the context tenant or the request fails closed. A multi-tenant actor is authorized only for tenants where it has an active membership. The resource tenant **MUST** equal the context tenant (tenant-boundary deny), independent of RLS.

## 5. RBAC (enforced now)

Default deny; least privilege; no implicit global admin; no wildcard role grant. Roles map to explicit permissions (USF-owned `ROLE_PERMISSIONS`); every protected action maps to exactly one permission (`ACTION_PERMISSIONS`); an unknown action fails closed. Tenant roles do not leak across tenants (tenant-boundary + membership). Deny-permission semantics and role inheritance are **not** used in this slice; the model fails closed rather than approximating them (tracked, USF-141).

## 6. ABAC (enforced now; bounded, USF-141)

ABAC inputs in this slice: resource tenant, resource `data_classification`, and request context. A sensitive classification (`restricted`, `security-sensitive`) requires the stronger `security.restricted.read` permission. A missing `data_classification` defaults safely to `confidential` (absence never opens access). Decisions are deterministic and auditable; evaluation performs no provider-specific side effects. USF-141 proves the restricted-classification stronger-permission path and policy version/context hash evidence. Assurance level, network/device/session, relationship attributes, and broader field-level policies remain transferred or deferred to linked source issues.

## 7. Policy decision semantics (enforced now)

The PDP returns a structured `PolicyDecision`: `decisionId`, `policyVersion`, `actorId`, `tenantId`, `action`, `resourceType`, `resourceId`, `effect` (permit|deny), `reasonCode`, `safeMessage`, `obligations`, `matchedPolicyIds`, `evaluationContextHash`, `correlationId`, `causationId`, `traceId`, `evaluatedAt`. Permit is explicit; deny is default. Client-facing deny is a safe, non-enumerating `safeMessage`/`reasonCode`; detailed reasons go to audit/evidence. Obligations are returned for enforcement (e.g. `log-sensitive-access`, `audit-break-glass`).

## 8. PDP and RLS consistency (enforced now)

The application-layer PDP and the DB RLS backstop agree on tenant boundaries. Proven by `make authz-proof`: a PDP permit uses exactly the tenant the RLS `SET LOCAL app.tenant_id` is set to; a PDP deny never reaches the database; and an app-layer mistake is still blocked by RLS (independent backstop). The RLS isolation itself is proven by `make db-proof` (USF-138).

## 9. Time-of-check/time-of-use and caching (bounded, USF-141)

No authorization cache exists; the PDP evaluates every request, so revocation takes effect immediately. USF-141 proves that a cached permit is not retained after membership suspension in the local membership directory. Critical mutations re-checking authorization near execution and re-checks at sensitive steps of long-running workflows are transferred to USF-151. Any future cache MUST be tenant/actor/resource/policy-version scoped, must never broaden scope, must fail closed on error, and a cache miss must evaluate the PDP (never permit by default).

## 10. Service actors and system jobs (enforced now in model; runtime tracked)

Every system action MUST have a concrete service actor identity with explicit permissions, run tenant-scoped data access under a concrete tenant context, and be audited. Cross-tenant orchestration may schedule work but tenant data access remains tenant-scoped. No silent global tenant bypass. The job-runtime integration is delivered under parity-jobs.

## 11. Delegation and impersonation (deferred with owner, USF-141)

Not implemented in this slice. USF-141 reclassifies delegation and impersonation as deferred with owner and follow-up linkage because no authorised product surface exists in the current foundation scope. When authorised: impersonation requires explicit permission, records original and effective actor, is scoped/expiring/audited, and forbids self-approval. Until then it is a non-claim.

## 12. Break-glass authorization (enforced now)

Break-glass is evaluated **inside** the PDP, never as a bypass: requester ≠ approver; approval before access; grant carries tenant/resource scope, reason, expiry; the PDP checks an active, in-scope, unexpired grant and permits with an `audit-break-glass` obligation; expired or out-of-scope grants fail closed. No permanent elevated DB role, no BYPASSRLS, no superuser, no silent admin bypass; DB-backed grants use the PR #92 `break_glass_grants` table/RLS.

## 13. Separation of duties (bounded, USF-141)

Break-glass requester ≠ approver is enforced and proven. Workflow approval SoD is covered by the jobs proof; full policy-administration SoD remains a deferred product surface and is not claimed by USF-141.

## 14. Authorization discovery surfaces (enforced now)

Safe, UI-consumable surfaces for future UI/AI-assisted UI: current tenant/actor context, the actor's effective permissions (discovery), and safe denied reason codes, via foundation contracts and OpenAPI. The foundation does not expose raw policy internals, other tenants' roles, the sensitive permission graph, security-sensitive deny details, or break-glass internals beyond the actor's own grants.

## 15. Field- and action-level authorization (partial now; field-level deferred)

Action-level authorization over read/list/create/update/delete/approve/etc. flows through the PDP action model. USF-141 proves classification-based stronger read authorization; broader field visibility/mutability and sensitive-field policy surfaces are transferred to domain source issues and are not claimed as complete.

## 16. Data-classification-aware authorization (enforced now)

Restricted/security-sensitive records require the stronger permission (ABAC). `legal_hold` and `retention_policy` (from the persistence standard) affect purge/delete/export and are enforced at the DB layer (USF-138); classification-aware export/reporting beyond read is tracked (USF-141).

## 17. Token and session validation (transferred)

Token claims are inputs, not final authorization. Issuer/audience/signature/expiry/not-before validation against a dev/test provider equivalent is tracked by auth/identity depth (USF-149). No live external IdP is implemented by this authorization depth gate.

## 18. Safe error semantics (enforced now)

401 unauthenticated; 403 authenticated-but-not-authorised with a safe reason code; 400 tenant mismatch/invalid context. Responses do not leak whether another tenant's resource exists, nor sensitive deny reasons. Denied privileged actions carry audit/evidence. 404-masking for non-enumerable resources and 409 policy/version conflict are tracked (USF-141).

## 19. Rate limiting and abuse guards (transferred)

Permission discovery is scoped and non-enumerating. Deny-heavy probing is auditable. Distributed rate-limit and abuse-control enforcement is transferred to USF-161. Production rate limiting is not implemented or claimed by this authorization depth gate.

## 20. Enforcement

`tools/validate-parity/validate-authz.py` (USF-AUTHZ-001..013) fails closed if the PDP defaults to permit, if identity claims are treated as authorization, if an action maps to an empty permission, if a role is granted a wildcard, if the authorizer does not emit decision audit, if break-glass allows self-approval, if the tenant/authz capability imports a provider adapter, if the USF-141 matrix is missing, if deferred controls lack owner/follow-up metadata, if PDP evaluation becomes async, if proof or enterprise evidence linkage is missing, if readiness/certification is overclaimed, or if a proven control lacks proof-backed evidence. Planted defects prove each rule. The hermetic tests and `make authz-proof` prove the runtime behaviour.
