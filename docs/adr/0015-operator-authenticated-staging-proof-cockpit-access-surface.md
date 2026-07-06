# 0015 Operator-Authenticated Staging Proof Cockpit Access Surface

## Status

Accepted. 2026-07-06. Authored decision, ratified by the accountable owner as a deliberate, recorded decision. Conforms to the [Charter](../architecture/charter.md) and [Authority Model](../architecture/authority-model.md); it is an ADR-level decision, not a constitutional amendment, because it does not weaken hermetic provability (Charter §2.3, §6) or any non-claim.

## Description

Records the owner-ratified decision to expose the interactive staging proof cockpit (`apps/staging-proof-cockpit`) as a permanent, bounded staging operator fixture reachable at `https://<USF_PROOF_STAGING_FQDN>/proof` (default `https://1e100.network/proof`), served by a **composed** Caddy edge (`external-caddy`, from the committed `docker/caddy/Caddyfile`, with the staging and production FQDNs supplied as Makefile envs), gated by an operator credential (HTTP basic authentication) and reverse-proxied to a profile-gated `staging-proof-cockpit` Compose service reachable only over the compose network. It exists so the accountable operator can perform the human proof review, bulk acceptance, and final signoff described in the human-signoff runbook without any AI agent in the loop. The decision preserves every existing platform non-claim: a reachable operator proof fixture is not a platform go-live and upgrades no readiness claim.

## Context

The staging proof cockpit is served by `apps/staging-proof-cockpit/src/server.mjs`. It already implements a guarded write mode (`USF_PROOF_COCKPIT_ALLOW_WRITES`, `USF_PROOF_COCKPIT_REVIEW_SECRET`, CSRF double-submit) and derives the recorded actor either from a fronting authenticator's identity header (`USF_PROOF_COCKPIT_TRUST_FORWARD_AUTH`) or from the configured `USF_PROOF_COCKPIT_REVIEW_ACTOR`. Until now the cockpit was run only on loopback via `proof-cockpit:serve`; the public origin at `1e100.network`/`aldous.info` served only read-only proof markers (`/.well-known/usf-public-edge.json`, `/__proof/public-route`), and the operator-access gateway posture (USF-186) was `defined-only` with no operator clickthrough surface created. The accountable owner has decided that the interactive cockpit is to become a permanent staging fixture at the staging FQDN `/proof` behind operator authentication so that acceptance and signoff can be exercised in staging, and that the exposure mechanism must be **clone-and-go**: a composed Caddy edge served from the repository (`docker/caddy/Caddyfile`, mounted into the `external-caddy` Compose service), with no host `/etc/caddy` file and no systemd requirement. The proof content the cockpit renders remains hermetic and synthetic; this decision changes the access surface, not the provider class of the evidence.

## Decision

USF permits, as a bounded staging operator proof fixture, exposure of the interactive staging proof cockpit at `https://<USF_PROOF_STAGING_FQDN>/proof` (default `https://1e100.network/proof`). The exposure MUST satisfy all of the following. The public proof edge is a **composed** Caddy service (`external-caddy`) whose config is the committed `docker/caddy/Caddyfile`, mounted read-only into the container; there MUST be no host `/etc/caddy` file and no system/systemd Caddy requirement (clone-and-go). The two site addresses MUST be parameterised by env (`{$USF_PROOF_STAGING_FQDN}`, `{$USF_PROOF_PROD_FQDN}`), supplied as Makefile envs. The composed edge is the shared, always-on public proof edge: the public read-only proof routes (`/.well-known/usf-public-edge.json`, `/__proof/public-route`, and the no-store/security headers) are served independently of any operator gate. The cockpit is realised as a profile-gated Compose service `staging-proof-cockpit` (profile `proof-cockpit`) generated for the staging Compose target, published with no host port at all — reachable only over the compose network as `staging-proof-cockpit:8080`. Public reachability is provided solely by the edge reverse proxy: a Caddy `proof_cockpit_handlers` snippet MUST be imported into the staging FQDN site only and MUST NOT be imported into the production FQDN (`{$USF_PROOF_PROD_FQDN}`) site. The `/proof` gate MUST require a valid operator credential via HTTP basic authentication before proxying any `/proof` request, and MUST preserve the established no-store and security headers. The gate MUST be a reload-managed include on a writable runtime mount whose committed default is CLOSED (responds 503, no unauthenticated fallback); the operator credential MUST live only in that runtime include (written at bring-up), never committed and never set in the `external-caddy` service environment. Cockpit write actions (per-item accept, bulk "accept all", and final signoff) remain gated by the cockpit's own write policy: they are served only when `USF_PROOF_COCKPIT_ALLOW_WRITES` is `yes` and a non-empty `USF_PROOF_COCKPIT_REVIEW_SECRET` is present. Both MUST be supplied by the operator at bring-up (compose interpolation `${USF_PROOF_COCKPIT_ALLOW_WRITES:-}` / `${USF_PROOF_COCKPIT_REVIEW_SECRET:-}`); there MUST be no committed placeholder secret, so an unset secret leaves the cockpit read-only. Every write is CSRF-double-submit validated. The recorded actor is the configured accountable operator identity (`USF_PROOF_COCKPIT_REVIEW_ACTOR`), or the operator login forwarded by the edge. Final signoff is never auto-completed; it remains a deliberate human browser action requiring the four confirmations and the exact signoff phrase. The acceptance ledger persists to a durable Compose volume; promoting recorded acceptances into the committed `evidence/` corpus remains a manual operator reconciliation step and MUST NOT be performed by giving the running service repository write credentials. This decision does not claim that the live public deployment (DNS, TLS, and applying the composed edge on a public host) has been proven; that remains an operator step recorded in the runbook, and the platform non-claims below are preserved.

## Rationale

The cockpit already carries the exact primitives an operator access surface needs — a fail-closed write policy, CSRF protection, and forward-auth-or-configured actor derivation — so the smallest correct change is to authenticate at a composed edge and reverse-proxy, rather than to build authentication into the application or to weaken the write guard. Serving the edge from the committed `docker/caddy/Caddyfile` keeps it clone-and-go (no host `/etc/caddy`, no systemd), and parameterising the FQDNs by env lets the same composed edge serve the staging and production sites. A reload-managed operator basic-authentication include with a committed CLOSED default keeps the operator credential out of the repository and the service environment, decouples the always-on public edge from the transient `/proof` gate, and is upgradeable to Keycloak OIDC single sign-on later without changing the cockpit, because the cockpit already reads a forwarded identity header. Restricting the route to the staging FQDN site, keeping the cockpit reachable only over the compose network, and keeping write mode behind an operator-supplied review secret and CSRF hold the exposure to a bounded operator fixture. Preserving the platform non-claims keeps the change honest: the surface being reachable proves operator access to hermetic proof, not that the platform is staging-, deployment-, or production-ready, and the evidence the cockpit renders stays hermetic and synthetic, so Charter §2.3/§6 hermetic provability is untouched.

## Semantic References

- `docs/architecture/charter.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/operator-access-gateway-posture-matrix.json`
- `spec/instances/compose-service/service-catalogue.json`

## Source References

- `apps/staging-proof-cockpit/src/server.mjs`
- `docker/caddy/Caddyfile`
- `docker/caddy/proof-cockpit-auth.caddy`
- `compose/compose.staging.generated.yaml`
- `tools/proof-review/proof-review.sh`
- `docs/runbooks/proof-cockpit-human-signoff.md`
- `docs/runbooks/self-hosted-public-proof-origin.md`

## Proof References

- `evidence/proof-evidence/proof-cockpit/staging-evidence-store.json`

## Validator References

- `tools/validate-compose/validate-compose.py`
- `tools/validate-public-fqdn/validate-public-fqdn.py`
- `tools/validate-spec/validate-spec.py`

## Invariants

- The public proof edge is a composed Caddy service (`external-caddy`) served from the committed `docker/caddy/Caddyfile`, with the site FQDNs parameterised by env; there is no host `/etc/caddy` file and no systemd requirement.
- The `/proof` cockpit route is imported only into the staging FQDN (`{$USF_PROOF_STAGING_FQDN}`) site and only behind a Caddy operator basic-authentication credential; it is never imported into the production FQDN (`{$USF_PROOF_PROD_FQDN}`) site.
- The `/proof` gate is a reload-managed include whose committed default is CLOSED (503); the operator credential lives only in the gitignored runtime include, never committed and never in the `external-caddy` service environment.
- The `staging-proof-cockpit` Compose service publishes no host port at all; it is reachable only over the compose network as `staging-proof-cockpit:8080`, and public reachability is only via the authenticated edge reverse proxy.
- Cockpit write actions (accept, accept-all, final signoff) are served only with `USF_PROOF_COCKPIT_ALLOW_WRITES=yes` plus a non-empty operator-supplied review secret (no committed placeholder), and every write is CSRF-double-submit validated.
- Final signoff is never auto-completed; it requires the four explicit confirmations and the exact signoff phrase, recorded as a human browser action.
- The proof content the cockpit renders remains hermetic and synthetic; no real tenant data, real secrets, or live external provider is introduced.
- The public read-only proof edge (`/.well-known/usf-public-edge.json`, `/__proof/public-route`) is unchanged.
- All platform non-claims are preserved; the reachable operator fixture is not a platform go-live.

## Permitted Changes

- Upgrade the edge operator authentication from basic authentication to Keycloak OIDC single sign-on (ADR 0012) via a forward-auth proxy, without changing the cockpit, once that mechanism is proven.
- Generate the `staging-proof-cockpit` service for additional non-production environments (dev, test) as a loopback-only operator fixture if a later authorised change requires it.
- Add a live-deployment proof rung (DNS, TLS, origin Caddyfile apply) as a higher, separately-evidenced step without weakening the hermetic proof of the cockpit content.

## Forbidden Drift

- Do not expose the `/proof` cockpit route without the edge operator-authentication gate (the committed include default MUST stay CLOSED), and do not import it into the production FQDN (`{$USF_PROOF_PROD_FQDN}`, default `aldous.info`) site.
- Do not bake the operator credential into the committed Caddyfile, the committed include, or the `external-caddy` service environment; it lives only in the gitignored runtime include. Do not reintroduce a host `/etc/caddy` file or a systemd Caddy for this surface.
- Do not enable cockpit write mode without a non-empty review secret and CSRF validation, and do not auto-complete final signoff.
- Do not give the running service repository write credentials to auto-commit acceptance records into `evidence/`.
- Do not present the reachable operator fixture as staging, deployment, production, live-provider, SOC, ISO, enterprise-production, product-UI, or full-product readiness.
- Do not feed real tenant data, real secrets, or live external providers into the exposed cockpit.

## Consequences

- A profile-gated `staging-proof-cockpit` Compose service is catalogued and generated for the staging target, with a durable acceptance-ledger volume and no host-published port (reachable only over the compose network).
- The composed `external-caddy` edge (from `docker/caddy/Caddyfile`) becomes the shared, always-on public proof edge with FQDN envs, a persistent `caddy-data` volume, and a writable runtime mount for the reload-managed `/proof` gate include (committed default CLOSED).
- The operator-access-gateway posture matrix records the `/proof` cockpit route as an active, bounded, edge-authenticated operator fixture rather than `defined-only`.
- The human-signoff and self-hosted-origin runbooks document the composed Caddy edge, the FQDN envs, the reload-managed operator-authenticated `/proof` gate include, the `make caddy-up` / `proof-review-up` / `proof-review-down` lifecycle, and the manual acceptance-record reconciliation step.
- Live public deployment (DNS, TLS, applying the composed edge on a public host) remains an operator step; the platform claims no deployment, staging, or production readiness from this decision.

## AI Alignment Rules

- Agents MUST preserve the edge operator-authentication gate (reload-managed include, committed default CLOSED), the compose-network-only cockpit port (no host publish), and the staging-FQDN-only routing when changing this surface, and MUST keep the composed edge served from the committed `docker/caddy/Caddyfile` with no host `/etc/caddy` or systemd dependency.
- Agents MUST preserve the cockpit write guard (allow-writes plus review secret plus CSRF) and the deliberate, non-auto-completed final signoff.
- Agents MUST preserve all platform non-claims and MUST NOT relabel the reachable operator fixture as any readiness claim.
- Agents MUST keep the cockpit's rendered proof content hermetic and synthetic and MUST NOT introduce real tenant data, real secrets, or a live external provider through this surface.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0015-operator-authenticated-staging-proof-cockpit-access-surface.json`
