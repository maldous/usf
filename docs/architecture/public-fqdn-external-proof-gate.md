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

Public DNS resolution is observable and the HTTPS edge answers through Cloudflare. The public JSON proof endpoint is not yet delivered: both required FQDNs currently return Cloudflare 521 for the proof endpoint.

USF-266 adds a gateway-neutral local proof origin service that serves the JSON proof endpoint and the reserved non-product browser route under generated staging and production Compose profiles. That local service proves the response contract only; it does not prove external Cloudflare route delivery.

That means USF-263 remains blocked for completion and the v2-proof tag remains blocked unless a later human decision explicitly accepts a bounded rationale.

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
