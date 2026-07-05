# Public Route and Telemetry Bootstrap Playwright Proof Gate

USF-264 records the narrow public browser route proof for the public FQDN gate.

## Scope

The proof route is:

- /__proof/public-route

The proof may finish on `/__proof/public-route/` only when the final URL remains HTTPS, same-host, and otherwise matches the declared public FQDN. This trailing slash is provider or origin canonicalisation evidence only; it is not a separate product route and does not permit cross-host redirects or HTTP-only delivery.

The proof uses Playwright Core against local Chromium to navigate over HTTPS to the declared public FQDNs:

| Environment | Required FQDN |
| ----------- | ------------- |
| Staging     | 1e100.network |
| Production  | aldous.info   |

The proof checks final host, HTTPS delivery, same-route canonicalisation, proof marker presence, Faro and Sentry telemetry bootstrap marker/config, and absence of mixed-content, localhost/private host, product UI, browser E2E, and Caddy-required claims.

## Commands

- corepack pnpm proof:public-route
- corepack pnpm proof:public-route:staging
- corepack pnpm proof:public-route:production
- make public-route-proof
- make public-route-proof-staging
- make public-route-proof-production

The route proof does not require Cloudflare API credentials and does not send live telemetry.

## Boundary

This is public route and telemetry bootstrap proof only. It is not product UI readiness, broad browser E2E readiness, full product readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, or v2-proof tag authorization.
