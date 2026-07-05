# External HTTP Cache and Provider Proof Gate

Issue: USF-269
Parent: USF-267

The machine-readable gate is `docs/architecture/external-http-cache-provider-proof-gate.json`.

The gate records cache and upstream-provider behaviour for the public JSON proof endpoint and the public browser proof route. Both proof/control route classes require `Cache-Control: no-store` and must not be treated as cacheable staging or production application surfaces.

Current decision: pass.

The proof/control routes declare no-store cache policy and now run through repo-owned Netlify Function responses instead of static deploy artifacts. Current provider evidence shows Netlify Durable bypass and Netlify Edge miss on the canonical routes, while Cloudflare reports dynamic handling.

The gate accepts low nonzero Age only as provider metadata when all of these are true: proof/control routes declare no-store, provider cache status has no hit or stale directive, and provider evidence explicitly shows miss, bypass, or dynamic handling. Any cache hit, stale response, cacheable proof/control route, missing no-store header, unknown provider status with Age, or provider-specific semantic requirement remains a blocking failure. Netlify remains implementation evidence only and is not semantic authority.

Provider or CDN headers such as cache status, age, etag, vary, and content encoding are evidence only. They do not define USF semantics and do not make Cloudflare, Netlify, or any other provider a required gateway.

Future static, API-like, and app route classes are classified but not proven as staging-ready by this gate. They require separate staging-specific route contracts and evidence before any staging readiness claim.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or v2-proof tag authorisation.
