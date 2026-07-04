# Non-Destructive Pre-Staging External Smoke Proof Gate

Issue: USF-271
Parent: USF-267

The machine-readable gate is `docs/architecture/pre-staging-external-smoke-proof-gate.json`.

The smoke gate is non-destructive. It uses only safe proof/control routes and safe methods. It does not use real tenant data, real secrets, live application state, or persistent staging or production data mutation.

Current decision: staging-specific enablement remains blocked.

Resolved:

- `1e100.network` and `aldous.info` both redirect `/.well-known/usf-public-edge.json` from plain HTTP to same-host HTTPS.

Remaining blocker:

- Proof/control routes currently declare `Cache-Control: no-store`, but provider evidence includes Netlify Edge stale or cache-hit observations and nonzero `Age` observations.

Required operator actions: inspect whether Netlify or the equivalent route implementation is serving the proof/control routes as static deploy artifacts, Function responses, Edge Function responses, proxy or redirect responses, another origin behind Netlify, or another provider routed through Netlify. Configure or redeploy that route source so proof/control routes are not served from provider cache when `Cache-Control` is `no-store`; purge or redeploy provider cache; then rerun the external cache proof and pre-Staging smoke proof. Alternatively, record a later explicit human-approved reclassification.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
