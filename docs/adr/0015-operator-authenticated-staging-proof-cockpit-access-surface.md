# 0015 Operator-Authenticated Staging Proof Cockpit Access Surface

## Status

Accepted. 2026-07-06. Authored decision, ratified by the accountable owner as a deliberate, recorded decision. Conforms to the [Charter](../architecture/charter.md) and [Authority Model](../architecture/authority-model.md); it is an ADR-level decision, not a constitutional amendment, because it does not weaken hermetic provability (Charter §2.3, §6) or any non-claim.

## Description

Records the owner-ratified decision to expose the interactive staging proof cockpit (`apps/staging-proof-cockpit`) as a permanent, bounded staging operator fixture reachable at `https://1e100.network/proof`, gated at the edge by a Caddy operator credential (basic authentication) and reverse-proxied to a new profile-gated `staging-proof-cockpit` Compose service. It exists so the accountable operator can perform the human proof review, bulk acceptance, and final signoff described in the human-signoff runbook without any AI agent in the loop. The decision preserves every existing platform non-claim: a reachable operator proof fixture is not a platform go-live and upgrades no readiness claim.

## Context

The staging proof cockpit is served by `apps/staging-proof-cockpit/src/server.mjs`. It already implements a guarded write mode (`USF_PROOF_COCKPIT_ALLOW_WRITES`, `USF_PROOF_COCKPIT_REVIEW_SECRET`, CSRF double-submit) and derives the recorded actor either from a fronting authenticator's identity header (`USF_PROOF_COCKPIT_TRUST_FORWARD_AUTH`) or from the configured `USF_PROOF_COCKPIT_REVIEW_ACTOR`. Until now the cockpit was run only on loopback via `proof-cockpit:serve`; the public origin at `1e100.network`/`aldous.info` served only read-only proof markers (`/.well-known/usf-public-edge.json`, `/__proof/public-route`), and the operator-access gateway posture (USF-186) was `defined-only` with no operator clickthrough surface created. The accountable owner has decided that the interactive cockpit is to become a permanent staging fixture at `1e100.network/proof` behind operator authentication so that acceptance and signoff can be exercised in staging. The proof content the cockpit renders remains hermetic and synthetic; this decision changes the access surface, not the provider class of the evidence.

## Decision

USF permits, as a bounded staging operator proof fixture, exposure of the interactive staging proof cockpit at `https://1e100.network/proof`. The exposure MUST satisfy all of the following. The cockpit is realised as a profile-gated Compose service `staging-proof-cockpit` (profile `proof-cockpit`) generated for the staging Compose target, published on the loopback interface only, never with a direct host-published public port. Public reachability is provided solely by the edge reverse proxy: a Caddy `proof_cockpit_handlers` snippet on the `1e100.network` (staging) host MUST require a valid operator credential via HTTP basic authentication before proxying any `/proof` request to the service, MUST preserve the established no-store and security headers, and MUST NOT be imported on the `aldous.info` (production) host. Cockpit write actions (per-item accept, bulk "accept all", and final signoff) remain gated by the cockpit's own write policy: they are served only when `USF_PROOF_COCKPIT_ALLOW_WRITES` is `yes` and a non-empty `USF_PROOF_COCKPIT_REVIEW_SECRET` is present, and every write is CSRF-double-submit validated. The recorded actor is the configured accountable operator identity (`USF_PROOF_COCKPIT_REVIEW_ACTOR`). Final signoff is never auto-completed; it remains a deliberate human browser action requiring the four confirmations and the exact signoff phrase. The acceptance ledger persists to a durable Compose volume; promoting recorded acceptances into the committed `evidence/` corpus remains a manual operator reconciliation step and MUST NOT be performed by giving the running service repository write credentials. This decision does not claim that the live public deployment (DNS, TLS, and the origin-host Caddyfile apply) has been proven; that remains an operator step recorded in the runbook, and the platform non-claims below are preserved.

## Rationale

The cockpit already carries the exact primitives an operator access surface needs — a fail-closed write policy, CSRF protection, and forward-auth-or-configured actor derivation — so the smallest correct change is to authenticate at the edge and reverse-proxy, rather than to build authentication into the application or to weaken the write guard. A Caddy operator credential is the simplest mechanism that makes the fixture permanent and usable now by the single accountable operator; it is upgradeable to Keycloak OIDC single sign-on later without changing the cockpit, because the cockpit already reads a forwarded identity header. Restricting the route to the staging host, keeping the container port loopback-only, and keeping write mode behind the review secret and CSRF hold the exposure to a bounded operator fixture. Preserving the platform non-claims keeps the change honest: the surface being reachable proves operator access to hermetic proof, not that the platform is staging-, deployment-, or production-ready, and the evidence the cockpit renders stays hermetic and synthetic, so Charter §2.3/§6 hermetic provability is untouched.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/operator-access-gateway-posture-matrix.json`
- `spec/instances/compose-service/service-catalogue.json`

## Source References

- `apps/staging-proof-cockpit/src/server.mjs`
- `compose/compose.staging.generated.yaml`
- `docs/runbooks/proof-cockpit-human-signoff.md`
- `docs/runbooks/self-hosted-public-proof-origin.md`

## Proof References

- `evidence/proof-evidence/proof-cockpit/staging-evidence-store.json`

## Validator References

- `tools/validate-compose/validate-compose.py`
- `tools/validate-public-fqdn/validate-public-fqdn.py`
- `tools/validate-spec/validate-spec.py`

## Invariants

- The `/proof` cockpit route is exposed only on the `1e100.network` (staging) host and only behind a Caddy operator basic-authentication credential; it is never imported on the `aldous.info` (production) host.
- The `staging-proof-cockpit` Compose service publishes no direct public host port; public reachability is only via the authenticated edge reverse proxy.
- Cockpit write actions (accept, accept-all, final signoff) are served only with `USF_PROOF_COCKPIT_ALLOW_WRITES=yes` plus a non-empty review secret, and every write is CSRF-double-submit validated.
- Final signoff is never auto-completed; it requires the four explicit confirmations and the exact signoff phrase, recorded as a human browser action.
- The proof content the cockpit renders remains hermetic and synthetic; no real tenant data, real secrets, or live external provider is introduced.
- The public read-only proof edge (`/.well-known/usf-public-edge.json`, `/__proof/public-route`) is unchanged.
- All platform non-claims are preserved; the reachable operator fixture is not a platform go-live.

## Permitted Changes

- Upgrade the edge operator authentication from basic authentication to Keycloak OIDC single sign-on (ADR 0012) via a forward-auth proxy, without changing the cockpit, once that mechanism is proven.
- Generate the `staging-proof-cockpit` service for additional non-production environments (dev, test) as a loopback-only operator fixture if a later authorised change requires it.
- Add a live-deployment proof rung (DNS, TLS, origin Caddyfile apply) as a higher, separately-evidenced step without weakening the hermetic proof of the cockpit content.

## Forbidden Drift

- Do not expose the `/proof` cockpit route without the edge operator-authentication gate, and do not add it to the production (`aldous.info`) host.
- Do not enable cockpit write mode without a non-empty review secret and CSRF validation, and do not auto-complete final signoff.
- Do not give the running service repository write credentials to auto-commit acceptance records into `evidence/`.
- Do not present the reachable operator fixture as staging, deployment, production, live-provider, SOC, ISO, enterprise-production, product-UI, or full-product readiness.
- Do not feed real tenant data, real secrets, or live external providers into the exposed cockpit.

## Consequences

- A new profile-gated `staging-proof-cockpit` Compose service is catalogued and generated for the staging target, with a durable acceptance-ledger volume and a loopback-only container port.
- The operator-access-gateway posture matrix records the `/proof` cockpit route as an active, bounded, edge-authenticated operator fixture rather than `defined-only`.
- The human-signoff and self-hosted-origin runbooks document the Caddy `proof_cockpit_handlers` snippet, the operator credential, and the manual acceptance-record reconciliation step.
- Live public deployment (DNS, TLS, origin Caddyfile apply) remains an operator step; the platform claims no deployment, staging, or production readiness from this decision.

## AI Alignment Rules

- Agents MUST preserve the edge operator-authentication gate, the loopback-only container port, and the staging-host-only routing when changing this surface.
- Agents MUST preserve the cockpit write guard (allow-writes plus review secret plus CSRF) and the deliberate, non-auto-completed final signoff.
- Agents MUST preserve all platform non-claims and MUST NOT relabel the reachable operator fixture as any readiness claim.
- Agents MUST keep the cockpit's rendered proof content hermetic and synthetic and MUST NOT introduce real tenant data, real secrets, or a live external provider through this surface.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0015-operator-authenticated-staging-proof-cockpit-access-surface.json`
