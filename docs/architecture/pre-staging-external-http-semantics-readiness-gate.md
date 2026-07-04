# Pre-Staging External HTTP Semantics Readiness Gate

Issue: USF-267

The machine-readable parent gate is `docs/architecture/pre-staging-external-http-semantics-readiness-gate.json`.

This gate reconciles:

- USF-268 external HTTP behaviour contract
- USF-269 cache and upstream provider behaviour proof
- USF-270 observability, tracing, logging, and event evidence
- USF-271 non-destructive pre-Staging external smoke proof

Current decision: staging-specific enablement must not begin from this gate yet.

Reasons:

- The external cache/provider gate is blocked because proof/control routes declare no-store cache policy and now run through repo-owned Netlify Function responses, but provider evidence still includes low nonzero Age observations while Netlify reports Durable bypass and Edge miss and Cloudflare reports dynamic handling.
- The external smoke gate is blocked by 1e100.network serving the JSON proof route over plain HTTP instead of redirecting to HTTPS. aldous.info already redirects the same route to HTTPS.

The gate is implemented and fail-closed, but the external configuration must be corrected before this gate can allow staging-specific enablement. The required operator actions are: enable a same-host HTTP-to-HTTPS redirect or equivalent HTTPS-only rule for 1e100.network, and deploy or configure the selected origin/provider so proof/control routes are not served from provider cache when no-store semantics are declared.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
