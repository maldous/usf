# Public FQDN Semantic Contract

This note records the USF-262 semantic contract for public FQDNs required before the later proof tag gate can be considered.

## Scope

The semantic requirement is public HTTP and HTTPS edge capability for declared FQDNs. Gateway products are implementation or evidence boundaries only. Caddy is not a semantic requirement.

The minimum mandatory public FQDN scope is:

| Environment | Required FQDN | Mandatory scope |
|---|---:|---|
| Staging | 1e100.network | Root FQDN |
| Production | aldous.info | Root FQDN |

Additional hostnames such as www, app, api, auth, telemetry, or health are not required until a later issue explicitly declares them with environment, purpose, protocol, proof command, owner, risk owner, and control owner. Additional staging hostnames must be 1e100.network or subdomains of 1e100.network. Additional production hostnames must be aldous.info or subdomains of aldous.info.

## Semantic Boundaries

Public DNS resolution, TLS certificate host coverage, HTTPS delivery, public route binding, and public telemetry bootstrap are semantic requirements for later proof gates. This issue defines those semantics only. It does not prove external delivery.

The non-product JSON proof endpoint for USF-263 is:

- /.well-known/usf-public-edge.json

The distinct non-product browser telemetry proof route for USF-264 is:

- /__proof/public-route

The semantic route is the no-trailing-slash path. A same-host HTTPS final URL with `/__proof/public-route/` is accepted only as provider or origin canonicalisation evidence for this proof route. Cross-host redirects, localhost/private redirects, HTTP-only delivery, or any different path are not accepted.

The JSON proof endpoint and browser telemetry route are separate proof surfaces. Neither route is product UI.

## Provider Boundary

Cloudflare is the declared DNS and edge hosting provider boundary according to the human operator. This records a supplier and provider boundary only. It does not claim live-provider readiness and does not require a Cloudflare API secret for the basic semantic contract.

Generated Compose, generated gateway configuration, Caddy configuration, and historical react configuration are derivative evidence sources only. They are not semantic authority.

## Test Boundary

The Test environment remains local, composed, and synthetic. Test readiness does not depend on public DNS, public TLS, public HTTPS, Cloudflare, Caddy, public internet, real tenant data, or live provider credentials.

## Downstream Gates

USF-263 must prove external DNS, TLS, HTTPS, and JSON proof endpoint delivery. USF-264 must prove public browser route delivery and Faro or Sentry telemetry bootstrap through the narrow Playwright boundary. USF-265 must authorise any proof tag only after the public FQDN gates are merged and reconciled under repository tag policy.

## Non-Claims

This contract does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or Caddy as a required gateway.
