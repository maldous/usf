# External HTTP Cache and Provider Proof Gate

Issue: USF-269
Parent: USF-267

The machine-readable gate is `docs/architecture/external-http-cache-provider-proof-gate.json`.

The gate records cache and upstream-provider behaviour for the public JSON proof endpoint and the public browser proof route. Both proof/control route classes require `Cache-Control: no-store` and must not be treated as cacheable staging or production application surfaces.

Current decision: blocked.

Blocker: the proof/control routes declare no-store cache policy, but current provider evidence includes Netlify Edge cache hit and nonzero Age observations. Cloudflare reports dynamic handling for the same responses, so Cloudflare is the public front door evidence but the observed cache conflict is at the Netlify edge/origin layer.

Required operator action: deploy the proof origin or an equivalent route implementation with ordinary and CDN no-store cache headers, purge or redeploy the provider cache, then rerun the external cache proof until proof/control routes no longer report provider cache hit or nonzero Age. If the selected provider is Netlify, the repository origin emits Netlify-CDN-Cache-Control no-store as an implementation hint; that does not make Netlify semantic authority.

Provider or CDN headers such as cache status, age, etag, vary, and content encoding are evidence only. They do not define USF semantics and do not make Cloudflare, Netlify, or any other provider a required gateway.

Future static, API-like, and app route classes are classified but not proven as staging-ready by this gate. They require separate staging-specific route contracts and evidence before any staging readiness claim.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
