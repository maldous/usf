# Auth/Identity (Keycloak Broker) Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Governance / source-use disposition gate |
| **Status** | Draft / Foundational |
| **Authority level** | semantic-definition (governs source-use of the auth/identity slice) |
| **Issue scope** | USF-133 child: Keycloak brokered authentication, identity, OIDC/JWT, and sessions |
| **Source row basis** | USF's own self-defined authentication/identity/OIDC/session source lineage and the existing USF auth semantic corpus |
| **Repository state** | Implementation under existing authorised topology roots only (`adapters/idp`, `capabilities/auth`, `packages/{core,ports,proof}`, `apps/api`, `tests/*`); no new root introduced |
| **Decision authority** | ADR 0012 (Keycloak sole IdP and local token validation), building on ADR 0010 (PDP) |

This matrix dispositions the source-use of every runtime/test file added or extended by the
Keycloak-brokered authentication/identity slice. It is the source-use gate the spec validator
enforces (`USF-IMPL-002` / `USF-PR-DISPOSITION`): every implementation target file appears here.

ISO 27001-supporting technical control evidence only. No certification claim.

## Treatment Rules

- **source-derived-rewrite** — behaviour authored against USF semantics with USF's own self-defined
  source lineage as evidence; USF authors its own runtime, no external runtime/application code is copied,
  and no external source path is mirrored.
- **new-with-rationale** — no direct source antecedent; introduced to satisfy a USF semantic
  contract / ADR (e.g. local Keycloak token validation, which USF's own source lineage did not perform).
- **evidence-only-support** — USF's own source material consulted as behaviour evidence only; nothing
  carried into USF as code.

Keycloak boundary (ADR 0012): Keycloak is the only USF-facing IdP and issuer; USF validates
Keycloak-issued tokens only; upstream external IdPs are opaque brokered provenance behind
Keycloak and are never modelled, named, configured, credentialed, or accepted directly.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `adapters/idp/src/keycloak-verifier.ts` | new-with-rationale | evidence-only-support | Local Keycloak-issued OIDC/JWT verifier (iss/aud/sig/exp/nbf/alg/kid, fail-closed). USF's own source lineage trusted Keycloak via confidential exchange and did not locally verify; USF V2 validates Keycloak tokens locally (ADR 0012). No external dependency (`node:crypto`); no live JWKS fetch. |
| `adapters/idp/src/hermetic-keycloak.ts` | new-with-rationale | evidence-only-support | Hermetic Keycloak-equivalent token issuer + JWKS for tests/proof and forged-token negative matrix. Hermetic fixture only (Charter §6.2); never live-external or production-live evidence. |
| `capabilities/auth/src/identity.ts` | source-derived-rewrite | USF source lineage: Keycloak claim→actor mapping (evidence only) | Maps a validated token to a stable actor keyed by realm+subject (never email); duplicate email no-merge; email change = attribute update; disabled/unknown fail closed; JIT deferred. |
| `capabilities/auth/src/session.ts` | source-derived-rewrite | USF source lineage: server-side session (evidence only) | Tenant-bound session lifecycle: create/validate/expire (absolute+idle)/revoke/logout, all fail closed; opaque subject/session hashes only; no raw token/cookie. |
| `capabilities/auth/src/keycloak-auth.ts` | source-derived-rewrite | USF source lineage: login/identity-context flow (evidence only) | Orchestration: token validation → actor → session → identity-to-tenant handoff through the PDP; value-free audit. Roles come from USF membership, never token claims. |
| `capabilities/auth/src/enterprise-identity.ts` | new-with-rationale | evidence-only-support | Bounded local synthetic tenant SSO and enterprise identity control-plane proof surface for USF-149. It proves request/approve/verify/activate lifecycle, requester/approver separation, JIT policy, invitations, assurance step-up policy, account linking, attribute/group mapping, browser-flow security semantics, and local threat-signal audit posture without live provider/UI/SIEM claims. |
| `packages/proof/src/auth-identity-proof.ts` | new-with-rationale | evidence-only-support | Hermetic behaviour proof of the full token-validation/identity/session/tenant matrix plus USF-149 enterprise identity depth. `make auth-proof`. |
| `tests/adapters/keycloak-verifier.test.ts` | new-with-rationale | evidence-only-support | Unit tests of the verifier accept/deny matrix and JWKS handling. |
| `tests/capabilities/auth-identity.test.ts` | source-derived-rewrite | USF source lineage: auth tests (evidence only) | Capability tests for identity mapping, session lifecycle, and identity-to-tenant handoff. Rewrites foundation behaviour from unit/e2e test lineage; no Playwright. |

Extended (already source-dispositioned by prior source-use disposition matrices; no path change):
`packages/core/src/index.ts`, `packages/ports/src/index.ts`, `adapters/idp/src/index.ts`,
`capabilities/auth/src/index.ts` — extended with Keycloak-broker types, ports, and exports.

## Sub-Domain Classification

| Auth/identity concern | Status | Where | Notes |
|---|---|---|---|
| Keycloak-issued OIDC/JWT validation | migrated | `adapters/idp` | iss/aud/sig/exp/nbf/iat-skew/alg-allowlist/kid, fail-closed |
| Stable actor identity (realm+subject, not email) | migrated | `packages/core`, `capabilities/auth` | duplicate-email no-merge; email-change attribute update |
| Brokered identity provenance (opaque) | migrated | `packages/core`, `adapters/idp` | provenance only; never authorization |
| Session lifecycle (expiry/idle/revoke/logout) | migrated | `capabilities/auth` | fail-closed; opaque hashes; assurance level recorded |
| Identity → tenant handoff through PDP | migrated | `capabilities/auth`, `capabilities/tenant` | active membership required; claims/roles/broker alias never grant |
| Identity audit events (value-free) | migrated | `packages/core`, `capabilities/auth` | emitted events live; lifecycle/SSO events reserved |
| Keycloak provider config / secret refs | partial | `packages/core` (SecretReference), proof | client secret as opaque ref; live secret manager deferred (USF-145) |
| Cross-tenant SSO (explicit memberships) | migrated | `capabilities/auth` | two active memberships → two tenants; no boundary collapse |
| Assurance levels (LoA0–4) | partial | `packages/core` | model + acr mapping; step-up/MFA live flow deferred |
| Tenant self-service SSO control plane | migrated-with-live-boundary | `capabilities/auth/src/enterprise-identity.ts`, proof | request/approve/verify/activate lifecycle, requester/approver separation, and audit proven locally; live Keycloak admin API, API route, UI, and provider operation deferred |
| JIT provisioning | migrated-with-live-boundary | `capabilities/auth/src/enterprise-identity.ts`, proof | explicit JIT policy, no privileged role grants, pending/non-privileged posture proven locally; live unknown-user creation/SCIM deferred |
| Domain ownership verification | bounded-local-proof | `capabilities/auth/src/enterprise-identity.ts`, proof | activation-gating and cross-tenant domain claim conflict proven locally; live DNS/HTTP/registrar/certificate evidence deferred |
| Invitations / onboarding | migrated-with-live-boundary | `capabilities/auth/src/enterprise-identity.ts`, proof | invitation issue, actor-bound accept, expiry denial, required domain/assurance metadata proven locally; email delivery/UI/live IdP enrollment deferred |
| Account linking / unlinking | migrated-with-live-boundary | `capabilities/auth/src/enterprise-identity.ts`, proof | proof-of-control assurance and last-login-method denial proven locally; live upstream linking and recovery UX deferred |
| Identity lifecycle / deprovisioning | partial | `packages/core` (events reserved) | event model defined; deprovisioning runtime deferred |
| Privileged SSO administration | migrated-with-live-boundary | `capabilities/tenant/src/authorization-policy.ts`, `capabilities/auth/src/enterprise-identity.ts`, proof | tenant_sso actions are explicit PDP permissions and exercised locally; live admin API/operator console/access review execution deferred |
| Attribute/group mapping safety | migrated-with-live-boundary | `capabilities/auth/src/enterprise-identity.ts`, proof | allow-listed attributes/groups and no direct role grants proven locally; live IdP/SCIM mapping deferred |
| Identity threat/abuse detection hooks | partial | `packages/core` (events reserved) | structured events reserved; no live SIEM |
| Safe identity API surfaces | partial | `apps/api` (if wired) / standard doc | session/logout/tenant-selection/providers; full SSO admin API deferred |
| Live Keycloak / live external broker / live upstream IdP | deferred | — | hermetic only in this slice; no live provider readiness claim |
| Browser login/callback (state/nonce/PKCE/cookies) | bounded-local-proof | `capabilities/auth/src/enterprise-identity.ts`, proof | state/nonce/PKCE/CSRF/redirect/cookie policy proven locally; browser UI, HTTP callback, real cookies, refresh rotation runtime, and Playwright deferred |

## UI/Playwright Auth Behaviours

Auth behaviour in USF's own source lineage proven via UI/Playwright (login redirect, callback, logout SSO
termination, session cookie handling) is **rewritten as USF foundation behaviour** at the
capability/port/proof level — not as browser E2E. No Playwright is added. The browser-facing
login/callback/cookie flow (redirect URI allow-listing, state/nonce/PKCE, httpOnly/SameSite
cookies) has its **secure semantics defined** in the Auth & Identity Standard and its **live
execution deferred** to a Linear blocker. No UI/Playwright auth behaviour disappears silently:
each is either rewritten here or recorded as defined-and-deferred.

## Non-goals

- No live Keycloak deployment, live external broker, or live upstream IdP integration.
- No individual upstream identity provider modelled, named, configured, or special-cased.
- No upstream provider tokens accepted, and no upstream provider metadata exposed via USF APIs.
- No browser/UI implementation; no Playwright.
- No production-live or live-external-provider readiness claim.
- No schema promoted to `active`.
