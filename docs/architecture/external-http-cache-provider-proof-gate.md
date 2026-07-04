# External HTTP Cache and Provider Proof Gate

Issue: USF-269
Parent: USF-267

The machine-readable gate is `docs/architecture/external-http-cache-provider-proof-gate.json`.

The gate records cache and upstream-provider behaviour for the public JSON proof endpoint and the public browser proof route. Both proof/control route classes require `Cache-Control: no-store` and must not be treated as cacheable staging or production application surfaces.

Current decision: blocked.

Blocker: the proof/control routes declare `Cache-Control: no-store`, but current provider evidence includes cache hit and nonzero `Age` observations. Provider headers are evidence only and are not semantic authority; they still block this gate because they contradict the declared no-store behaviour.

Required operator action: configure the public edge or origin so proof/control routes are not served from provider cache when `Cache-Control` is `no-store`, or record a later explicit human-approved bounded rationale.

Provider or CDN headers such as cache status, age, etag, vary, and content encoding are evidence only. They do not define USF semantics and do not make Cloudflare, Netlify, or any other provider a required gateway.

Future static, API-like, and app route classes are classified but not proven as staging-ready by this gate. They require separate staging-specific route contracts and evidence before any staging readiness claim.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
