# External DNS TLS HTTPS Public FQDN Proof Gate

This note records the USF-263 proof gate for the public FQDNs declared by the USF-262 semantic contract.

## Scope

The proof gate checks public DNS resolution, HTTPS/TLS host coverage, HTTP status and redirect posture, and bounded proof endpoint content delivery for:

| Environment | Required FQDN |
| ----------- | ------------- |
| Staging     | 1e100.network |
| Production  | aldous.info   |

The strict proof command is expected to fail closed until each FQDN serves the non-product JSON proof endpoint:

- /.well-known/usf-public-edge.json

## Current Observation

Public DNS resolution, HTTPS/TLS host coverage, and JSON proof endpoint delivery are observable for both declared root FQDNs. The required public JSON proof endpoint returned HTTP 200 with an application/json content type and the usf-public-edge marker for 1e100.network and aldous.info.

USF-266 adds a gateway-neutral local proof origin service that serves the JSON proof endpoint and the reserved non-product browser route under generated staging and production Compose profiles. A Netlify-backed custom-domain route is recorded as implementation evidence for the external proof endpoint only. Netlify, Cloudflare, Caddy, and any other gateway or hosting product remain implementation evidence sources, not semantic requirements.

This clears the USF-263 external DNS TLS HTTPS JSON proof gate. It does not authorize the v2-proof tag by itself; USF-264 and USF-265 remain separate downstream gates.

## Commands

- corepack pnpm proof:public-fqdn
- corepack pnpm proof:public-fqdn:staging
- corepack pnpm proof:public-fqdn:production
- corepack pnpm proof:public-origin
- make public-fqdn-proof
- make public-fqdn-proof-staging
- make public-fqdn-proof-production
- make public-proof-origin

The proof commands do not require Cloudflare API credentials.

## Non-Claims

This gate does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, Caddy as a required gateway, or v2-proof tag authorization.
