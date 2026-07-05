# Gateway-Neutral Public Proof Origin Service

USF-266 records a portable origin service for the public FQDN proof endpoints required by USF-263 and reserved for USF-264. The semantic requirement remains PublicHttpEdgeCapability and PublicProofOriginService. Caddy, Netlify, Cloudflare Worker, nginx, Fastify, static hosting, or another HTTP origin can be implementation evidence, but none is a semantic requirement.

The repository implementation is a minimal Node built-in HTTP service at apps/public-proof-origin/src/server.mjs. It serves GET and HEAD /.well-known/usf-public-edge.json with application/json, marker usf-public-edge on GET, the expected environment value, and an fqdn value matching 1e100.network or aldous.info. It returns safe OPTIONS responses for the proof surfaces. It also reserves GET and HEAD /__proof/public-route as a non-product browser telemetry proof route for USF-264.

PR #240 added a provider implementation source for the Netlify-backed proof sites: netlify.toml plus Netlify Functions under netlify/functions. Those functions serve only the JSON proof endpoint and public route proof surfaces and emit the same no-store response contract. The deployed Netlify Function route source is implementation evidence only; it does not make Netlify a semantic requirement.

USF-289 supersedes Netlify as the intended live serving path for the proof/control routes. The target serving model is DNS-only public apex records to the controlled self-hosted origin at 103.138.244.121. Netlify remains historical implementation evidence until DNS cutover is complete, and live Netlify headers or Netlify error pages must fail the self-hosted origin migration evidence once the cutover is represented as complete.

Both proof surfaces emit ordinary no-store cache headers and CDN no-store cache headers. The Netlify-specific no-store header is an implementation hint for deployments that use Netlify as the current edge/origin evidence source; it does not make Netlify a semantic requirement. Other gateways or origins may satisfy the same cache semantics with equivalent configuration and evidence.

Local reproduction:

- corepack pnpm proof:public-origin
- make public-proof-origin
- docker compose -f compose/compose.staging.generated.yaml --profile public-proof-origin up -d --wait public-proof-origin

The generated Compose service is profile-gated for staging and production only. It binds loopback on 127.0.0.1 for local proof and does not make Test depend on public DNS, public TLS, or public internet.

External route proof remains separated by proof surface. USF-263 proves only the public JSON endpoint contract. USF-264 proves the reserved public browser route and Faro/Sentry telemetry bootstrap marker/config. The current external routes are backed by an implementation-evidence path that serves the same response contracts through the declared public FQDNs. Those routes do not make Netlify, Cloudflare, Caddy, or any other gateway or hosting product semantic authority. USF-269 accepts low provider Age only when paired with no-store, no hit or stale directive, and explicit miss, bypass, or dynamic provider evidence; any unsafe cache evidence still fails closed. This document does not prove staging readiness, production readiness, deployment readiness, live-provider readiness, product UI readiness, browser E2E readiness, SOC readiness, ISO certification, enterprise production readiness, full React product parity, or v2-proof tag authorization.
