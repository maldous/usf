# Gateway-Neutral Public Proof Origin Service

USF-266 records a portable origin service for the public FQDN proof endpoints required by USF-263 and reserved for USF-264. The semantic requirement remains PublicHttpEdgeCapability and PublicProofOriginService. Caddy, Netlify, Cloudflare Worker, nginx, Fastify, static hosting, or another HTTP origin can be implementation evidence, but none is a semantic requirement.

The repository implementation is a minimal Node built-in HTTP service at apps/public-proof-origin/src/server.mjs. It serves GET /.well-known/usf-public-edge.json with application/json, marker usf-public-edge, the expected environment value, and an fqdn value matching 1e100.network or aldous.info. It also reserves GET /__proof/public-route as a non-product browser telemetry proof route for USF-264.

Local reproduction:

- corepack pnpm proof:public-origin
- make public-proof-origin
- docker compose -f compose/compose.staging.generated.yaml --profile public-proof-origin up -d --wait public-proof-origin

The generated Compose service is profile-gated for staging and production only. It binds loopback on 127.0.0.1 for local proof and does not make Test depend on public DNS, public TLS, or public internet.

External route proof remains a separate USF-263 requirement. The current external proof route is backed by an implementation-evidence path that serves the same response contract through the declared public FQDNs. That route proves only the public JSON endpoint contract; it does not make Netlify, Cloudflare, Caddy, or any other gateway or hosting product semantic authority. This document does not prove staging readiness, production readiness, deployment readiness, live-provider readiness, product UI readiness, browser E2E readiness, SOC readiness, ISO certification, enterprise production readiness, full React product parity, or v2-proof tag authorization.
