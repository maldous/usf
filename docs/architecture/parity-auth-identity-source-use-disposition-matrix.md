# Parity Auth/Identity (Keycloak Broker) Source-Use Disposition Matrix

| | |
|---|---|
| **Document type** | Governance / source-use disposition gate |
| **Status** | Draft / Foundational |
| **Authority level** | semantic-definition (governs source-use of the auth/identity slice) |
| **Issue scope** | USF-133 child: Keycloak brokered authentication, identity, OIDC/JWT, and sessions |
| **Source row basis** | `../react` authentication/identity/OIDC/session lineage (evidence only) and the existing USF auth semantic corpus |
| **Repository state** | Implementation under existing authorised topology roots only (`adapters/idp`, `capabilities/auth`, `packages/{core,ports,proof}`, `apps/api`, `tests/*`); no new root introduced |
| **Decision authority** | ADR 0012 (Keycloak sole IdP and local token validation), building on ADR 0010 (PDP) |

This matrix dispositions the source-use of every runtime/test file added or extended by the
Keycloak-brokered authentication/identity slice. It is the source-use gate the spec validator
enforces (`USF-IMPL-002` / `USF-PR-DISPOSITION`): every implementation target file appears here.

ISO 27001-supporting technical control evidence only. No certification claim.

## Treatment Rules

- **source-derived-rewrite** — behaviour recovered from `../react` lineage and rewritten clean to
  USF semantics; no React runtime/application code is copied, and no React path is mirrored.
- **new-with-rationale** — no direct historical antecedent; introduced to satisfy a USF semantic
  contract / ADR (e.g. local Keycloak token validation, which `../react` did not perform).
- **evidence-only-support** — `../react` material consulted as behaviour evidence only; nothing
  carried into USF as code.

Keycloak boundary (ADR 0012): Keycloak is the only USF-facing IdP and issuer; USF validates
Keycloak-issued tokens only; upstream external IdPs are opaque brokered provenance behind
Keycloak and are never modelled, named, configured, credentialed, or accepted directly.

## Implementation Target Files

| Target file | Treatment | Source-use basis | Rationale |
|---|---|---|---|
| `adapters/idp/src/keycloak-verifier.ts` | new-with-rationale | evidence-only-support | Local Keycloak-issued OIDC/JWT verifier (iss/aud/sig/exp/nbf/alg/kid, fail-closed). `../react` trusted Keycloak via confidential exchange and did not locally verify; USF V2 validates Keycloak tokens locally (ADR 0012). No external dependency (`node:crypto`); no live JWKS fetch. |
| `adapters/idp/src/hermetic-keycloak.ts` | new-with-rationale | evidence-only-support | Hermetic Keycloak-equivalent token issuer + JWKS for tests/proof and forged-token negative matrix. Hermetic fixture only (Charter §6.2); never live-external or production-live evidence. |
| `capabilities/auth/src/identity.ts` | source-derived-rewrite | `../react` Keycloak claim→actor mapping (evidence only) | Maps a validated token to a stable actor keyed by realm+subject (never email); duplicate email no-merge; email change = attribute update; disabled/unknown fail closed; JIT deferred. |
| `capabilities/auth/src/session.ts` | source-derived-rewrite | `../react` server-side session lineage (evidence only) | Tenant-bound session lifecycle: create/validate/expire (absolute+idle)/revoke/logout, all fail closed; opaque subject/session hashes only; no raw token/cookie. |
| `capabilities/auth/src/keycloak-auth.ts` | source-derived-rewrite | `../react` login/identity-context flow (evidence only) | Orchestration: token validation → actor → session → identity-to-tenant handoff through the PDP; value-free audit. Roles come from USF membership, never token claims. |
| `packages/proof/src/auth-identity-proof.ts` | new-with-rationale | evidence-only-support | Hermetic behaviour proof of the full token-validation/identity/session/tenant matrix. `make auth-proof`. |
| `tests/adapters/keycloak-verifier.test.ts` | new-with-rationale | evidence-only-support | Unit tests of the verifier accept/deny matrix and JWKS handling. |
| `tests/capabilities/auth-identity.test.ts` | source-derived-rewrite | `../react` auth test lineage (evidence only) | Capability tests for identity mapping, session lifecycle, and identity-to-tenant handoff. Rewrites foundation behaviour from React unit/e2e tests; no Playwright. |

Extended (already source-dispositioned by prior parity matrices; no path change):
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
| Tenant self-service SSO control plane | deferred | standard doc | states/fields/rules defined; governed runtime deferred (blocker) |
| JIT provisioning | deferred | standard doc | posture defined (fail-closed default); provisioning runtime deferred |
| Domain ownership verification | deferred | standard doc | methods defined; live DNS/HTTP checks deferred (blocker) |
| Invitations / onboarding | deferred | standard doc | semantics defined; runtime deferred |
| Account linking / unlinking | deferred | standard doc | governance defined; runtime deferred |
| Identity lifecycle / deprovisioning | partial | `packages/core` (events reserved) | event model defined; deprovisioning runtime deferred |
| Privileged SSO administration | deferred | standard doc | PDP-gated actions defined; runtime deferred |
| Attribute/group mapping safety | deferred | standard doc | allow-list policy defined; mapping runtime deferred |
| Identity threat/abuse detection hooks | partial | `packages/core` (events reserved) | structured events reserved; no live SIEM |
| Safe identity API surfaces | partial | `apps/api` (if wired) / standard doc | session/logout/tenant-selection/providers; full SSO admin API deferred |
| Live Keycloak / live external broker / live upstream IdP | deferred | — | blocker; hermetic only in this slice |
| Browser login/callback (state/nonce/PKCE/cookies) | deferred | standard doc | secure semantics defined; live browser flow deferred (blocker) |

## React UI/Playwright Auth Behaviours

`../react` auth behaviour proven via UI/Playwright (login redirect, callback, logout SSO
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
