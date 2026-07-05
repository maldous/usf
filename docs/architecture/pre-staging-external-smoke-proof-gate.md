# Non-Destructive Pre-Staging External Smoke Proof Gate

Issue: USF-271
Parent: USF-267

The machine-readable gate is `docs/architecture/pre-staging-external-smoke-proof-gate.json`.

The smoke gate is non-destructive. It uses only safe proof/control routes and safe methods. It does not use real tenant data, real secrets, live application state, or persistent staging or production data mutation.

Current decision: staging-specific enablement may begin. This is not a Staging readiness claim.

Resolved:

- `1e100.network` and `aldous.info` both redirect `/.well-known/usf-public-edge.json` from plain HTTP to same-host HTTPS.

Cache/provider boundary:

- Proof/control routes declare `Cache-Control: no-store` and run through repo-owned Netlify Function responses.
- Low nonzero Netlify `Age` is accepted only as provider metadata when no cache hit or stale directive is present and provider evidence shows miss, bypass, or dynamic handling.
- Cache hit, stale evidence, missing no-store, cacheable proof/control routes, or unknown provider status with Age still fail closed.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or v2-proof tag authorisation.
