# Pre-Staging External HTTP Semantics Readiness Gate

Issue: USF-267

The machine-readable parent gate is `docs/architecture/pre-staging-external-http-semantics-readiness-gate.json`.

This gate reconciles:

- USF-268 external HTTP behaviour contract
- USF-269 cache and upstream provider behaviour proof
- USF-270 observability, tracing, logging, and event evidence
- USF-271 non-destructive pre-Staging external smoke proof

Current decision: staging-specific enablement may begin from this gate. This is not a Staging readiness claim.

Reasons:

- The external HTTP behaviour contract is defined and validator-backed.
- Proof/control routes declare no-store cache policy and run through repo-owned Netlify Function responses.
- Current provider evidence shows Netlify Durable bypass and Netlify Edge miss on canonical proof/control routes, while Cloudflare reports dynamic handling.
- Low nonzero Netlify Age is accepted only as provider metadata under the no-store, no-hit, no-stale, miss/bypass/dynamic boundary.
- Both root FQDNs redirect the JSON proof route from plain HTTP to same-host HTTPS.

The gate is implemented and fail-closed. Cache hits, stale responses, cacheable proof/control routes, missing no-store headers, unknown provider status with Age, provider-specific semantic requirements, destructive smoke checks, and readiness overclaims still fail.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
