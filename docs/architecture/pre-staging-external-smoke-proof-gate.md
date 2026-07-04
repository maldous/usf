# Non-Destructive Pre-Staging External Smoke Proof Gate

Issue: USF-271
Parent: USF-267

The machine-readable gate is `docs/architecture/pre-staging-external-smoke-proof-gate.json`.

The smoke gate is non-destructive. It uses only safe proof/control routes and safe methods. It does not use real tenant data, real secrets, live application state, or persistent staging or production data mutation.

Current decision: staging-specific enablement remains blocked.

Blockers:

- `1e100.network` currently serves `/.well-known/usf-public-edge.json` over plain HTTP with HTTP 200 instead of redirecting to HTTPS. `aldous.info` redirects the same route to HTTPS. This makes the blocker specific to the staging root FQDN HTTP-to-HTTPS boundary.
- Proof/control routes currently declare `Cache-Control: no-store`, but provider evidence includes cache hit or nonzero `Age` observations.

Required operator actions: configure the public edge or origin for `1e100.network` so HTTP requests to proof/control routes redirect to the same host over HTTPS; configure the public edge or origin so proof/control routes are not served from provider cache when `Cache-Control` is `no-store`; or record a later explicit human-approved reclassification.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
