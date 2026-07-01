# USF Authentication and Identity Standard

| | |
|---|---|
| Document type | Architecture / domain semantic standard (normative) |
| Status | Draft / parity-auth-keycloak-broker (USF-133) |
| Authority level | semantic-definition; subordinate to the Charter, Authority Model, Standards Profile, ADR 0010 (PDP), ADR 0012 (Keycloak sole IdP and local token validation); companion to the tenant-authorization standard, the config-and-secrets standard, and the audit-evidence standard |
| Issue scope | Authentication and identity parity under USF-133; USF-149 adds bounded local enterprise identity control-plane proof while live/browser/provider execution remains non-claimed |
| Evidence basis | Historical `../react` authentication/identity/OIDC/session behaviour as lineage only; PR #92 DB/RLS; PR #93 PDP; PR #94 audit/evidence; PR #95 config/secrets |
| Proof basis | Hermetic only. Proven by `make auth-proof` over `adapters/idp` and `capabilities/auth`; includes local synthetic enterprise identity controls in `capabilities/auth/src/enterprise-identity.ts`; no live Keycloak, no live external broker, no live upstream identity provider, no browser UI, no SIEM forwarding, no production-live claim. |
| Compliance note | ISO 27001-supporting **technical control evidence** (access control, authentication, identity lifecycle, session management). **No certification claim.** |

> **Normative language.** **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** carry BCP 14 (RFC 2119 / RFC 8174) intent and are normative only when written in uppercase.
>
> **Status markers.** **IMPLEMENTED** marks behaviour that is built, tested, and proven hermetically in this parity domain. **DEFERRED** marks behaviour whose semantics are defined here as normative but whose live execution is tracked to a Linear child blocker. **RESERVED** marks a value or field that is defined and present in the model but not yet emitted or enforced.

## 0. Scope, posture, and honesty boundary

This standard is the semantic authority for the Keycloak-brokered authentication and identity parity domain (USF-133). It defines the **enterprise identity control plane in full breadth** — token validation, identity semantics, sessions, assurance, tenant self-service SSO, cross-tenant access, just-in-time provisioning, domain verification, invitations, lifecycle, account linking, privileged SSO administration, attribute mapping, browser security posture, provider config, threat controls, API surfaces, and audit — and marks each item **IMPLEMENTED**, **DEFERRED**, or **RESERVED**.

This is one authorised parity domain among many under USF-133. It is **not** a claim of full React parity and **not** a production-live or live-external-provider readiness claim.

**Hermetic honesty (Charter / Standards Profile §12–13; Authority Model proof-honesty bar).**

- This domain proves **hermetic behaviour only**. Hermetic-mock proof MUST NOT be read as live-external-provider proof. Production-shaped MUST NOT be read as production-live.
- This domain makes **no live Keycloak, no live external broker, no live upstream identity provider, no browser UI, no SIEM forwarding, and no production-live readiness claim**. Where this standard defines runtime that is not executed here, it is explicitly **DEFERRED** or bounded to local synthetic proof.
- A passing `make auth-proof` demonstrates the defined fail-closed behaviour under a hermetic Keycloak-equivalent issuer and JWKS fixture (`adapters/idp/src/hermetic-keycloak.ts`); it does not upgrade any DEFERRED item to live.

**ISO posture.** This standard provides **ISO 27001-supporting technical control evidence only; no certification claim.** USF does **not** claim ISO 27001 certification or full ISO 27001 compliance. Per the Standards Profile, ISO support is **Adapted / Inspired-by**: USF follows access-control, authentication, and identity-lifecycle control principles and produces evidence consistent with them, but it does not assert conformance to the standard.

## 1. The Keycloak-broker boundary

Keycloak is the **only** USF-facing identity provider and the **only** accepted token issuer. External upstream identity providers exist **only as opaque brokered provenance behind Keycloak**. No individual upstream provider is modelled, named, configured, credentialed, or special-cased anywhere in USF; only generic terms are used: *external upstream identity provider*, *brokered upstream identity*, *broker alias*, *brokered subject*, *brokered issuer*.

The identity boundary, as a model in text:

```
external upstream identity provider   (opaque; never USF-facing; token never accepted directly)
            │  (brokered behind Keycloak)
            ▼
Keycloak brokering                    (broker alias records provenance only)
            │
            ▼
Keycloak realm user / federated link  (realm + subject is the stable handle)
            │
            ▼
Keycloak-issued OIDC / JWT            (the ONLY token USF validates)
            │
   ════════ USF AUTH BOUNDARY ════════  (local validation: iss/aud/sig/exp/nbf/iat/alg/kid, fail closed)
            │
            ▼
USF actor                             (stable internal identity keyed by realm + subject)
            │
            ▼
USF tenant membership                 (USF-authoritative; authentication is not membership)
            │
            ▼
USF PDP authorization (ADR 0010)      (the SOLE authorization authority; fail closed)
```

Normative boundary rules:

- USF **MUST** accept and validate **Keycloak-issued tokens only**. A non-Keycloak issuer and a brokered-upstream issuer presented directly **MUST** be rejected (fail closed).
- A Keycloak claim, role, or group, or a broker alias, **MUST NOT** authorize on its own. Identity is **authentication input only**; the **PDP (ADR 0010) is the sole authorization authority**.
- Tenant membership is **USF-authoritative**. A brokered login authenticates an actor; tenant access still requires an **active USF membership**.
- Email is **never** the primary actor identity. The primary actor handle is **Keycloak realm + subject**.

## 2. Identity semantic model

**Concepts.** `actor`, `identity`, `keycloak_realm`, `keycloak_subject`, `keycloak_session`, `keycloak_client`, `keycloak_issuer`, `broker_alias`, `brokered_subject_ref`, `brokered_issuer_ref`, `brokered_identity_provenance`, `session`, `credential`, `claim`, `assurance_level`, `linked_identity`, `identity_status`, `session_status`.

- **actor** — the stable internal subject of authorization. Keyed by `keycloak_realm` + `keycloak_subject`, never by email.
- **identity** — a validated authentication identity bound to an actor; may carry one or more `linked_identity` records.
- **broker_alias** / **brokered_subject_ref** / **brokered_issuer_ref** / **brokered_identity_provenance** — opaque provenance describing that an actor reached Keycloak through brokered upstream identity. Provenance is **never** authorization input and **never** names an individual upstream provider.
- **credential** — authentication material held by Keycloak; USF never stores or returns raw credential material.
- **claim** — a token attribute; an **input** to identity and to the PDP, never a standalone grant.
- **assurance_level** — the level-of-assurance of the authentication event (§5); a PDP input, never a replacement for authorization.

**Identity statuses:** `pending`, `active`, `disabled`, `suspended`, `revoked`, `deleted`, `unknown`.
**Session statuses:** `created`, `active`, `expired`, `revoked`, `logged_out`, `invalid`, `unknown`.

**Stable-actor rules (IMPLEMENTED — `capabilities/auth/src/identity.ts`):**

- A `keycloak_realm` + `keycloak_subject` pair **MUST** map to a stable internal actor.
- A provider subject collision **MUST** fail closed (never silently bind to the wrong actor).
- A duplicate email across brokered identities **MUST NOT** collapse two actors into one.
- An email change **MUST** be treated as a non-authoritative attribute update, **never** as silent creation of a new actor.
- An identity whose status is `disabled`, `suspended`, `revoked`, or `deleted` **MUST** fail closed; `pending` and `unknown` **MUST NOT** authorize.

## 3. Keycloak-issued OIDC/JWT validation (IMPLEMENTED hermetically)

USF validates every Keycloak-issued token locally. Validation **MUST**:

- validate **issuer** — accept only the configured Keycloak realm issuer;
- validate **audience** — accept only the configured audience;
- validate **signature** against the realm JWKS, selecting the key by **kid**;
- validate **expiry** (`exp`), **not-before** (`nbf`), and **issued-at** (`iat`) within a bounded skew;
- enforce an **algorithm allow-list** — **RS256** only;
- **fail closed** on an unknown issuer, unknown audience, unknown/disallowed algorithm, or unknown key (`kid`);
- **reject** a non-Keycloak issuer and a brokered-upstream issuer presented directly.

**Status.** IMPLEMENTED hermetically in `adapters/idp/src/keycloak-verifier.ts` (no external dependency; `node:crypto`), proven by `make auth-proof` against the hermetic Keycloak-equivalent issuer and JWKS (`adapters/idp/src/hermetic-keycloak.ts`), including a forged-token negative matrix. **DEFERRED:** live OIDC discovery, live JWKS refresh/rotation against a running endpoint, and live Keycloak.

## 4. Session assurance and tenant-bound sessions (IMPLEMENTED hermetically)

A session binds an authenticated actor to a selected tenant for a bounded lifetime.

**Session fields:** `session_id`, `actor_id`, `keycloak_subject`, `keycloak_realm`, `keycloak_session_id_hash`, `selected_tenant_id`, `assurance_level`, `authentication_time`, `last_activity_at`, `expires_at`, `idle_expires_at`, `revoked_at`, `revocation_reason`, `risk_level`.

**Rules:**

- Sessions **MUST** expire on both an **absolute** lifetime (`expires_at`) and an **idle** lifetime (`idle_expires_at`).
- A revoked session (`revoked_at` set / status `revoked`) **MUST** fail closed.
- Tenant selection **MUST NOT** outlive membership: revoking the actor's membership for `selected_tenant_id` **MUST** invalidate tenant access even while the session token is otherwise valid (§7, §11).
- A high-`risk_level` downgrade **MUST** block privileged actions until re-assurance (§5).
- Audit and logs **MUST NEVER** store raw cookies, raw tokens, refresh tokens, or credentials; only opaque hashes (e.g. `keycloak_session_id_hash`) are recorded.

**Status.** IMPLEMENTED hermetically in `capabilities/auth/src/session.ts` (create / validate / expire / revoke / logout, all fail-closed; opaque subject and session hashes). **DEFERRED:** live browser session cookie issuance and the live login/callback/logout flow (§15).

## 5. Identity proofing and assurance levels

**Assurance ladder (exact):**

- `loa0-unknown`
- `loa1-password-or-brokered-basic`
- `loa2-mfa-or-stronger`
- `loa3-phishing-resistant-or-admin-approved`
- `loa4-high-assurance-admin`

**Rules:**

- A privileged action **MAY** require a higher assurance level than the session currently holds.
- A tenant SSO connection **MAY** require a minimum assurance level for access (§6, `required_assurance_level`).
- Break-glass **MAY** require a higher assurance level than ordinary access (tenant-authorization standard).
- A sensitive export **MAY** require step-up assurance before it proceeds.
- Assurance is a **PDP input**, **never** a replacement for authorization. A high assurance level does not by itself grant any action.

**Status.** The assurance model and the mapping from the Keycloak `acr` claim to the ladder are IMPLEMENTED (`packages/core`). USF-149 proves local step-up policy enforcement for privileged identity operations in `capabilities/auth/src/enterprise-identity.ts`. **DEFERRED:** the live step-up / MFA challenge flow.

## 6. Tenant self-service SSO governance

A tenant may govern its own brokered SSO connection. The **model** is defined here; USF-149 implements a bounded local synthetic request/approve/verify/activate control-plane proof. Live Keycloak admin API integration, external IdP broker configuration, API routes, UI, public exposure, and environment promotion remain DEFERRED.

**Connection states (exact):** `draft`, `requested`, `pending-verification`, `pending-approval`, `active`, `suspended`, `disabled`, `revoked`, `expired`, `failed`.

**Connection fields (exact):** `tenant_id`, `keycloak_realm`, `keycloak_client`, `broker_alias`, `connection_name`, `connection_status`, `requested_by`, `approved_by`, `verified_by`, `created_at`, `activated_at`, `suspended_at`, `revoked_at`, `expires_at`, `allowed_domains`, `domain_verification_method`, `domain_verification_status`, `required_assurance_level`, `allowed_redirect_uris`, `allowed_post_logout_redirect_uris`, `attribute_mapping_policy`, `group_mapping_policy`, `jit_provisioning_policy`, `default_membership_policy`, `risk_policy`, `audit_policy`.

**Rules:**

- Self-service SSO changes are **privileged tenant-admin actions** and **MUST** flow through the PDP (§13).
- A connection **MUST NOT** activate without domain/ownership verification where applicable (§9).
- A connection **MUST NOT** bypass USF tenant membership authority — a broker alias is **not** authorization.
- A connection **MUST NOT** grant global or system roles, and **MUST NOT** weaken any security-control configuration (config-and-secrets standard).
- Activation **MUST** require audit evidence.
- A brokered login authenticates an actor; **tenant access still requires an active USF membership**.
- Where approval is enabled, the **requester and approver MUST be separated** (`requested_by` ≠ `approved_by`).
- **No tenant admin** may configure another tenant's SSO connection.

**Status.** Connection model (states, fields, rules) IMPLEMENTED for bounded local proof in `capabilities/auth/src/enterprise-identity.ts` and exercised by `make auth-proof`. **DEFERRED:** live Keycloak/external broker administration, public API/UI, operator workflow, and environment promotion.

## 7. Cross-tenant SSO and multi-tenant actor access (IMPLEMENTED hermetically)

A single actor may hold memberships in multiple tenants while reaching USF through one brokered identity.

**Fields:** `actor_id`, `keycloak_subject`, `keycloak_realm`, `broker_alias`, `tenant_memberships`, `selected_tenant_id`, `active_tenant_context`, `tenant_switch_reason`, `tenant_switch_source`, `last_tenant_switch_at`.

**Rules:**

- An actor accesses multiple tenants **only via explicit active memberships**.
- Tenant selection **MUST** be explicit and auditable.
- A tenant switch **MUST** pass the PDP.
- USF **MUST NOT** infer tenant access from email domain, broker alias, or a token group/role alone.
- SSO across tenants **MUST NOT** create cross-tenant data visibility.
- There **MUST** be exactly **one active tenant context per request** unless the action is system-scoped.

**Status.** Cross-tenant selection with explicit memberships is IMPLEMENTED and proven hermetically (`capabilities/auth/src/session.ts`; two active memberships resolve to two tenants with no boundary collapse).

## 8. Just-in-time provisioning posture

JIT provisioning describes what may happen when a brokered identity arrives that USF has not seen before.

- JIT **actor** creation is allowed **only if** a tenant SSO connection explicitly enables it (`jit_provisioning_policy`).
- JIT **tenant membership** creation is **disabled by default**.
- JIT membership invitation **MUST** be created only as `pending` / `invited` unless policy explicitly allows `active`.
- JIT **attribute** update is allowed only for approved, non-authoritative attributes (§14).

**Rules:**

- JIT **MUST NEVER** silently grant tenant access.
- JIT **MUST NEVER** create privileged roles.
- JIT **MUST NEVER** merge actors by email.
- Every JIT action **MUST** be audit-recorded.
- JIT **MUST NEVER** overwrite USF-authoritative membership or authorization.
- An unknown brokered identity **MUST** fail closed unless a JIT policy explicitly allows a safe pending state.

**Default posture in this domain:** an **unknown identity FAILS CLOSED** during token authentication. USF-149 proves explicit tenant SSO JIT policy handling locally: privileged grants fail closed and non-privileged JIT produces bounded pending/active posture only. **DEFERRED:** live unknown-user creation, SCIM, upstream group sync, and production onboarding.

## 9. Domain ownership verification

Before a domain may be used to route tenant SSO, the tenant **MUST** prove ownership.

**Methods:** `dns-txt`, `well-known-http`, `admin-approval`, `contractual-verification`, `manual-security-review`.

**Rules:**

- Domain verification **MUST** be completed before a domain is used to route tenant SSO.
- Verification **expiry MUST** be represented (`expires_at` on the connection / verification record).
- Verification changes **MUST** be audit-recorded.
- A verified domain **does not grant membership**.
- A domain claim conflict (two tenants claiming the same domain) **MUST** fail closed and require review (§17, `domain_claim_conflict`).

**Status.** Methods and rules DEFINED. USF-149 proves local domain ownership conflict detection and activation gating. **DEFERRED:** live DNS-TXT, well-known-HTTP, certificate, registrar, or email verification checks.

## 10. Invitations and onboarding

An invitation binds a prospective member to a tenant before a brokered login completes.

**Fields:** `invitation_id`, `tenant_id`, `invited_email`, `invited_by`, `expires_at`, `accepted_at`, `accepted_by_actor_id`, `brokered_identity_required`, `required_domain`, `required_assurance_level`, `status`.

**Rules:**

- Acceptance **MUST** bind to a **stable actor** (`accepted_by_actor_id`), never to an email key — there is **no merge-by-email**.
- An expired invitation **MUST** fail closed.
- The invitation tenant **MUST** match the selected tenant at acceptance.
- Acceptance **MUST** be audit-recorded.

**Status.** Invitation semantics IMPLEMENTED for local synthetic proof: issue, actor-bound accept, expiry denial, required domain, and required assurance metadata are exercised by `make auth-proof`. **DEFERRED:** email delivery, UI, live IdP enrollment, SCIM, and production onboarding operation.

## 11. Identity lifecycle and deprovisioning

**Events:** `identity.created`, `identity.linked`, `identity.unlinked`, `identity.disabled`, `identity.suspended`, `identity.revoked`, `identity.deleted`, `membership.revoked`, `session.revoked`, `tenant_sso.revoked`.

**Rules:**

- Disabling an identity **MUST** revoke or block its sessions.
- Revoking a membership **MUST** invalidate tenant access even if a session is otherwise valid (§4, §7).
- Revoking an SSO connection **MUST** block new logins through that connection.
- Deprovisioning **MUST** be audit-recorded.
- Downstream tenant access **MUST** fail closed after revocation.

**Status.** The lifecycle event model is DEFINED (events RESERVED in code where not yet emitted; §19). **DEFERRED:** the deprovisioning runtime.

## 12. Account linking and broker link governance

Linking associates an additional identity with an existing actor.

**Rules:**

- Linking **MUST** require an authenticated actor, **re-auth or step-up where appropriate**, and proof that the actor controls the target identity.
- Unlinking **MUST NOT** strand the actor without a valid login method unless explicitly allowed.
- Linking and unlinking **MUST** be audit-recorded.
- **Automatic linking by email is FORBIDDEN** unless a high-assurance policy explicitly approves it.
- A broker link override is a **privileged, audited** action.

**Status.** Linking governance IMPLEMENTED for local synthetic proof: proof-of-control assurance is required, and unlinking fails closed when it would remove the last active login method. **DEFERRED:** live upstream account linking, browser re-auth UX, support recovery, and production identity recovery.

## 13. Privileged SSO administration

**Actions (all PDP-gated):** `tenant_sso.request`, `tenant_sso.configure`, `tenant_sso.verify_domain`, `tenant_sso.activate`, `tenant_sso.suspend`, `tenant_sso.revoke`, `tenant_sso.rotate_secret`, `tenant_sso.update_mapping`, `tenant_sso.view_audit`.

**Rules:**

- Every action **MUST** flow through the PDP (ADR 0010).
- High-risk actions **MUST** require stronger permission and/or higher assurance (§5).
- Where approval is enabled, **requester and approver MUST be separated**.
- Every action **MUST** be audit-recorded.
- **No cross-tenant SSO administration** is permitted (§6).

**Status.** Action set and gating IMPLEMENTED for local synthetic proof through the synchronous PDP. Tenant SSO request, configure, verify-domain, activate, suspend, revoke, rotate-secret, update-mapping, and view-audit permissions are explicit. **DEFERRED:** operator console, live Keycloak admin API, production access review execution, and public exposure.

## 14. Attribute and group mapping safety

**Rules:**

- Only **allow-listed** attributes **MAY** be mapped into the USF actor profile.
- Mapped attributes **MUST** carry **source** and **confidence** metadata.
- Brokered **group/role claims MUST NEVER grant USF roles directly**.
- Group mapping **MAY** only **propose** membership or role changes through governed policy (never apply directly).
- Unknown attributes are ignored or fail closed per policy.
- Mapping changes are **privileged** and **audited** (§13, `tenant_sso.update_mapping`).

**Status.** Mapping safety policy IMPLEMENTED for local synthetic proof: mapped attributes and proposed groups are allow-listed and never grant roles directly. **DEFERRED:** live IdP claim mapping, SCIM group sync, production role mapping, and customer-admin UI.

## 15. Token, cookie, and browser security posture

The secure semantics are **DEFINED** and USF-149 exercises them as local policy checks; the **live browser login/callback/cookie flow is DEFERRED** to a Linear child blocker.

- Access tokens **MUST** be short-lived.
- Refresh-token handling **MUST** be explicit where represented, otherwise DEFERRED (no implicit long-lived refresh).
- Where cookies are represented they **MUST** be `httpOnly`, `secure`, `SameSite`-appropriate, scoped, expiring, and **never logged**.
- Browser session routes **MUST** carry a CSRF posture.
- `state` and `nonce` **MUST** be required for login and callback where represented.
- **PKCE MUST** be required for public clients.
- Redirect URIs **MUST** be allow-listed (`allowed_redirect_uris`); **open redirect is FORBIDDEN**.
- Logout redirects **MUST** be allow-listed (`allowed_post_logout_redirect_uris`).

**Status.** Secure semantics IMPLEMENTED for local synthetic proof: state, nonce, PKCE, CSRF, redirect allow-lists, post-logout redirect allow-lists, secure cookie flags, and refresh-rotation requirement are checked. **DEFERRED:** live browser UI, HTTP callback route, real `Set-Cookie`, refresh-token rotation runtime, Playwright journey, and production cookie operation.

## 16. Provider config and secrets

Keycloak provider configuration (issuer, audience, client, JWKS source) flows through the PR #95 config/secrets substrate (config-and-secrets standard).

**Rules:**

- Keycloak provider config is typed and classified provider config; it carries `issuer`, `audience`, `client`, and a JWKS source descriptor.
- The Keycloak **client secret** and any **JWKS private material MUST** be represented as an opaque `SecretReference`, never an embedded value.
- **No raw secret MUST appear in any outward channel** — API responses, OpenAPI, audit, errors, tests, fixtures, or proof output.

**Status.** Provider config and secret-reference semantics IMPLEMENTED on the PR #95 substrate (`SecretReference` in `packages/core`). **DEFERRED:** the live external secret manager (USF-145).

## 17. Identity threat and abuse controls

Structured audit/security detection hooks are **RESERVED** (no live SIEM in this domain):

`repeated_login_failure`, `tenant_selection_denied`, `impossible_tenant_switch`, `broker_link_collision`, `domain_claim_conflict`, `sso_connection_suspended`, `stale_session_used`, `revoked_membership_used`, `token_replay_suspected`.

These are value-free structured signals intended for downstream detection. USF-149 emits local audit threat signals without live forwarding. **DEFERRED:** there is **no live SIEM integration** in this domain.

## 18. Safe identity API surfaces

Possible future identity routes are PDP-protected, tenant-scoped, redacted, non-enumerating, and OpenAPI-covered. They **MUST NEVER** expose tokens, cookies, secrets, or broker internals.

| Route | Purpose | Status |
|---|---|---|
| `/v1/auth/session` | Safe current-session/context view (no tokens/cookies) | wired where the API app is present; otherwise DEFERRED |
| `/v1/auth/logout` | Session/logout termination | semantics IMPLEMENTED in capability; browser flow DEFERRED |
| `/v1/auth/tenant-selection` | Explicit, auditable tenant selection/switch | IMPLEMENTED in capability; route wiring per API app |
| `/v1/auth/providers` | Provider **modes only** (never upstream provider names/metadata) | DEFERRED |
| `/v1/auth/sso-connections` (+ `/{id}`, `/{id}/verify-domain`, `/{id}/activate`, `/{id}/suspend`) | Tenant self-service SSO administration | DEFERRED (model defined §6, §13) |

Every surface **MUST** redact per the config-and-secrets redaction rules, **MUST NOT** enumerate other tenants' resources, and **MUST NOT** return broker internals or any individual upstream provider identity.

## 19. Audit events

All auth audit events are **value-free**: an event **MUST NEVER** carry a token, cookie, secret, or raw credential.

**Emitted (IMPLEMENTED):**

`authentication.login`, `authentication.login.failed`, `authentication.logout`, `authentication.session.created`, `authentication.session.revoked`, `authentication.session.expired`, `authentication.token.denied`, `authentication.keycloak.denied`, `authentication.brokered_identity.denied`, `authentication.tenant_selection.denied`, `tenant.context.accepted`.

**Implemented locally by USF-149:** `tenant_sso.requested`, `tenant_sso.configured`, `tenant_sso.domain_verified`, `tenant_sso.activated`, `tenant_sso.suspended`, `tenant_sso.revoked`, `tenant_sso.denied`, `authentication.identity.linked`, `authentication.identity.unlinked`, and local security threat signals are exercised as value-free audit evidence. **Reserved / deferred:** live SIEM forwarding, production incident workflow, and live browser/provider events.

Audit records use opaque hashes (e.g. `keycloak_session_id_hash`) and reason codes; detailed deny reasons go to audit/evidence, never to the client (§4, tenant-authorization standard §18).

## 20. Implemented vs Deferred summary

| This domain IMPLEMENTS + PROVES hermetically | This domain DEFINES but DEFERS (Linear child blocker) |
|---|---|
| Local Keycloak-issued OIDC/JWT validation (iss/aud/sig/exp/nbf/iat-skew/RS256/kid, fail closed) — `adapters/idp/src/keycloak-verifier.ts` | Live Keycloak |
| Hermetic Keycloak-equivalent issuer + JWKS + forged-token matrix — `adapters/idp/src/hermetic-keycloak.ts` | Live external broker |
| Stable actor mapping (realm+subject, never email; no merge-by-email; collision fails closed) — `capabilities/auth/src/identity.ts` | Live upstream identity provider |
| Opaque brokered identity provenance (never authorization) | Live browser login / callback / cookie flow |
| Tenant-bound session lifecycle (absolute + idle expiry, revoke, logout; opaque hashes) — `capabilities/auth/src/session.ts` | Live Keycloak admin API / external broker configuration |
| Cross-tenant selection via explicit active memberships (no boundary collapse) | MFA / step-up live flow |
| Assurance-level model (LoA0–4) and `acr` mapping — `packages/core` | Live DNS / HTTP domain verification |
| Identity → tenant handoff through the PDP (claims/roles/broker alias never grant) — `capabilities/auth/src/keycloak-auth.ts` | Live browser login / callback / cookie flow |
| Value-free emitted auth audit events (§19) | Account linking runtime |
| Keycloak provider config + opaque `SecretReference` (no raw secret outward) | Attribute / group mapping runtime |
| Bounded enterprise identity control-plane proof — `capabilities/auth/src/enterprise-identity.ts`, `packages/proof/src/auth-identity-proof.ts`, `make auth-proof` | Live SIEM forwarding / production incident workflow |
| | Refresh-token rotation |
| | Live SIEM integration |

No DEFERRED item above is overclaimed as IMPLEMENTED, live, or production-live anywhere in USF while its blocker is open.

## Authority and amendment

This standard is **subordinate** to the Charter and the Authority Model, and is a **companion** to **ADR 0010** (USF-owned PDP as the sole authorization authority) and **ADR 0012** (Keycloak as the sole USF-facing identity provider with local token validation). It is consistent with the tenant-authorization standard, the config-and-secrets standard, and the audit-evidence standard. Where this standard conflicts with the constitutional layer, the constitutional layer governs and the conflict **MUST** be stopped and reported.

This standard creates no schema, no ADR, and no implementation code. It defines semantics; implementation lands only under an authorised directive with its own proof. Work is tracked under **USF-133** and its child blockers (each DEFERRED item in §20 maps to a blocker); Linear tracks work only and does not define USF authority.
