# External HTTP Behaviour Semantic Contract

Issue: USF-268
Parent: USF-267

This document defines the gateway-neutral external HTTP behaviour contract for the post-Test, pre-Staging gate. The machine-readable authority for this contract is `docs/architecture/external-http-behaviour-contract.json`.

The contract requires canonical public hosts for `1e100.network` and `aldous.info`, HTTPS proof-route delivery, same-host redirect behaviour, safe handling for GET, HEAD, OPTIONS, and unsupported methods, route-class status semantics, content-type expectations, cache-control expectations, security-header posture, CORS/OPTIONS boundaries, compression and size boundaries, provider-header treatment, and gateway neutrality.

The semantic requirement is public HTTP and HTTPS edge behaviour for declared FQDNs. Cloudflare, Caddy, Netlify, nginx, Workers, Pages, and other gateway products may be implementation or evidence sources only. None is semantic authority.

The Test environment remains local, composed, and synthetic. It does not depend on public DNS, public TLS, public HTTPS, or the public internet.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
