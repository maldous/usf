# Self-Hosted Public Proof Origin Runbook

This runbook records the composed-Caddy configuration and operating boundary for the public proof/control routes and the operator-authenticated `/proof` cockpit gate. It is implementation evidence, not semantic authority.

## Scope

Routes:

- /.well-known/usf-public-edge.json
- /__proof/public-route
- /__proof/public-route/
- /proof (operator-authenticated cockpit gate, staging FQDN only — ADR 0015)

Hostnames (parameterised by env, not hard-coded in the config):

- USF_PROOF_STAGING_FQDN (default 1e100.network)
- USF_PROOF_PROD_FQDN (default aldous.info)

Protected record:

- ssh.aldous.info must remain DNS-only A 103.138.244.121.

## Composed Caddy Edge (clone-and-go, no systemd)

The public proof edge is a **composed** Caddy service (`external-caddy` in the generated staging Compose target), not a system/systemd Caddy. Its config is committed at `docker/caddy/Caddyfile` and mounted read-only at `/etc/caddy/Caddyfile` inside the container. There is no host `/etc/caddy` or systemd requirement: `make caddy-up` (`docker compose --profile gateway up -d external-caddy`) brings the edge up, publishing 127.0.0.1:80 and 127.0.0.1:443, and `make caddy-down` stops it. ACME/TLS material persists in the `caddy-data` named volume.

The two site addresses are parameterised by env — `{$USF_PROOF_STAGING_FQDN}` and `{$USF_PROOF_PROD_FQDN}` — supplied by the Makefile (`USF_PROOF_STAGING_FQDN ?= 1e100.network`, `USF_PROOF_PROD_FQDN ?= aldous.info`, both exported). The public read-only proof routes (`proof_no_store_headers`, `proof_route_handlers`, `/.well-known/usf-public-edge.json`, `/__proof/public-route`) are served always-on and are independent of the `/proof` cockpit gate.

The committed `docker/caddy/Caddyfile` is:

```caddyfile
{
	auto_https disable_redirects
}

(proof_no_store_headers) {
	header Cache-Control "no-store, no-cache, max-age=0, must-revalidate"
	header CDN-Cache-Control "no-store"
	header Pragma "no-cache"
	header Expires "0"
	header X-Content-Type-Options "nosniff"
	header Referrer-Policy "no-referrer"
	header X-Frame-Options "DENY"
	header Cross-Origin-Resource-Policy "same-origin"
	header Access-Control-Allow-Origin "https://{host}"
	header Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
	header Access-Control-Allow-Headers "traceparent, tracestate, x-correlation-id"
	header Vary "Host, Accept-Encoding"
	header -ETag
	header -Last-Modified
	header -Server
}

(proof_route_handlers) {
	@jsonOptions {
		path /.well-known/usf-public-edge.json
		method OPTIONS
	}
	handle @jsonOptions {
		import proof_no_store_headers
		header Content-Type "application/json; charset=utf-8"
		header Allow "GET, HEAD, OPTIONS"
		respond "" 204
	}

	@jsonAllowed {
		path /.well-known/usf-public-edge.json
		method GET HEAD
	}
	handle @jsonAllowed {
		import proof_no_store_headers
		header Content-Type "application/json; charset=utf-8"
		respond `{"marker":"usf-public-edge","environment":"{args.0}","fqdn":"{args.1}","gatewayNeutral":true,"requiredGateway":"none","origin":"self-hosted-public-proof-origin","netlifyLiveServingPath":false,"persistentMutation":false}` 200
	}

	@jsonUnsupported {
		path /.well-known/usf-public-edge.json
		not method GET HEAD OPTIONS
	}
	handle @jsonUnsupported {
		import proof_no_store_headers
		header Content-Type "application/json; charset=utf-8"
		header Allow "GET, HEAD, OPTIONS"
		respond `{"error":"method-not-allowed","marker":"usf-public-edge","allowedMethods":["GET","HEAD","OPTIONS"],"persistentMutation":false}` 405
	}

	@routeOptions {
		path /__proof/public-route /__proof/public-route/
		method OPTIONS
	}
	handle @routeOptions {
		import proof_no_store_headers
		header Content-Type "text/html; charset=utf-8"
		header Allow "GET, HEAD, OPTIONS"
		respond "" 204
	}

	@routeAllowed {
		path /__proof/public-route /__proof/public-route/
		method GET HEAD
	}
	handle @routeAllowed {
		import proof_no_store_headers
		header Content-Type "text/html; charset=utf-8"
		header Content-Security-Policy `default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'`
		respond `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>USF public route proof</title><meta name="usf-public-route-marker" content="usf-public-route"><meta name="usf-telemetry-bootstrap" content="faro,sentry"></head><body><main data-proof-marker="usf-public-route" data-proof-surface="public-route-telemetry-bootstrap" data-usf-environment="{args.0}" data-usf-fqdn="{args.1}">USF public route proof only.</main><script type="application/json" id="usf-public-route-telemetry-bootstrap">{"marker":"usf-public-route","route":"/__proof/public-route","routeClass":"public-proof-control-route","proofSurface":"public-route-telemetry-bootstrap","issueId":"USF-264","environment":"{args.0}","fqdn":"{args.1}","telemetrySystems":["faro","sentry"],"telemetryBootstrapOnly":true,"productUiReadinessClaim":false,"browserE2eReadinessClaim":false}</script></body></html>` 200
	}

	@routeUnsupported {
		path /__proof/public-route /__proof/public-route/
		not method GET HEAD OPTIONS
	}
	handle @routeUnsupported {
		import proof_no_store_headers
		header Content-Type "application/json; charset=utf-8"
		header Allow "GET, HEAD, OPTIONS"
		respond `{"error":"method-not-allowed","marker":"usf-public-route","allowedMethods":["GET","HEAD","OPTIONS"],"persistentMutation":false}` 405
	}

	@proofMissing path /.well-known/* /__proof/*
	handle @proofMissing {
		import proof_no_store_headers
		header Content-Type "application/json; charset=utf-8"
		respond `{"error":"not-found","proofRoute":false,"persistentMutation":false}` 404
	}
}

(proof_cockpit_handlers) {
	@proofCockpit path /proof /proof/*
	handle @proofCockpit {
		# Managed include from a writable runtime mount. The committed default is
		# CLOSED (503); make proof-review-up writes an authenticated include and
		# reloads Caddy; make proof-review-down restores the closed default.
		import /srv/caddy-runtime/proof-cockpit-auth.caddy
	}
}

http://{$USF_PROOF_STAGING_FQDN}, http://{$USF_PROOF_PROD_FQDN} {
	import proof_no_store_headers
	redir https://{host}{uri} 308
}

{$USF_PROOF_STAGING_FQDN} {
	import proof_cockpit_handlers
	import proof_route_handlers staging {$USF_PROOF_STAGING_FQDN}
}

{$USF_PROOF_PROD_FQDN} {
	import proof_route_handlers production {$USF_PROOF_PROD_FQDN}
}

http:// {
	import proof_no_store_headers
	header Content-Type "application/json; charset=utf-8"
	respond `{"error":"host-not-authorised","proofRoute":false,"persistentMutation":false}` 404
}
```

The committed CLOSED default include (`docker/caddy/proof-cockpit-auth.caddy`, seeded into the writable runtime mount on `make caddy-up`) is:

```caddyfile
respond "USF proof review surface is not currently open" 503
```

This runbook intentionally records Caddy as implementation evidence only. Equivalent nginx, Node, or other HTTP origin implementations may satisfy the same repository contract if they preserve the same route, method, TLS, cache, header, host-mismatch, and non-claim boundaries.

## Operator Proof Cockpit Route (ADR 0015)

Per [ADR 0015](../adr/0015-operator-authenticated-staging-proof-cockpit-access-surface.md), the interactive staging proof cockpit is exposed at `https://<USF_PROOF_STAGING_FQDN>/proof` (default `https://1e100.network/proof`) as a bounded operator fixture, served by the composed `external-caddy` edge. The `proof_cockpit_handlers` snippet above is imported into the staging FQDN site only; it MUST NOT be imported into the production FQDN (`{$USF_PROOF_PROD_FQDN}`) site. The snippet does not hold an inline credential: it `import`s a managed include from a writable runtime mount (`/srv/caddy-runtime/proof-cockpit-auth.caddy`). The committed default include is CLOSED (responds 503), so the `/proof` gate is fail-closed until a review session opens it. The gate reverse-proxies to the `staging-proof-cockpit` Compose service reachable only over the compose network as `staging-proof-cockpit:8080` — the service publishes no direct host port.

Opening and closing the gate is managed by `make proof-review-up` / `make proof-review-down` (see the human-signoff runbook), which write the authenticated include and reload Caddy rather than restarting the edge:

- `make proof-review-up` prompts for the operator username and password, hashes the password with the Caddy image (`docker run --rm caddy:2-alpine caddy hash-password`), and writes an include of the form `basic_auth { <operator-user> <bcrypt-hash> }` then `reverse_proxy staging-proof-cockpit:8080` to the gitignored runtime mount. The operator credential lives only in that gitignored runtime include — never committed and never set in the `external-caddy` service environment. The operator login name is forwarded to the cockpit as `X-Forwarded-User` and recorded as the acceptance/signoff actor.
- `make proof-review-down` restores the committed CLOSED (503) default include and reloads Caddy, closing the gate.

The cockpit's own write guard remains in force behind this edge: it serves write actions only when `USF_PROOF_COCKPIT_ALLOW_WRITES=yes` and a non-empty `USF_PROOF_COCKPIT_REVIEW_SECRET` are set on the service (both supplied by `make proof-review-up` at bring-up as compose interpolation, `${USF_PROOF_COCKPIT_ALLOW_WRITES:-}` / `${USF_PROOF_COCKPIT_REVIEW_SECRET:-}`, so an unset secret leaves the cockpit read-only — there is no committed placeholder secret), and every write is CSRF-double-submit validated. Final signoff is never auto-completed. This route exposes hermetic, synthetic proof content to an authenticated operator; it claims no staging, deployment, production, live-provider, SOC, ISO, enterprise-production, product-UI, browser-E2E, or full-product readiness.

Bringing the fixture up: `make caddy-up` starts the composed edge (no operator credential), then `make proof-review-up` opens the operator-authenticated `/proof` gate, brings up the cockpit, reloads Caddy, and fail-closed verifies (no credential ⇒ 401, operator credential ⇒ 200) at the staging FQDN. Acceptance and signoff recorded through this route persist to the cockpit's durable volume; promoting them into the committed `evidence/` corpus is the manual reconciliation step described in the human-signoff runbook.

## Availability

Caddy runs as the composed `external-caddy` Compose service (`make caddy-up` / `make caddy-down`), not as a systemd unit. It is expected to be up whenever the public edge should serve. After any change to `docker/caddy/Caddyfile`, regenerate the Compose targets, validate the config (`docker compose exec external-caddy caddy validate --config /etc/caddy/Caddyfile`), reload the running edge (`docker compose exec external-caddy caddy reload --config /etc/caddy/Caddyfile`, falling back to `docker compose restart external-caddy`), and re-run the public proof checks.

## TLS

Caddy automatic certificate management is expected after DNS-only cutover; certificate material persists in the `caddy-data` named volume. While the FQDNs still point to Cloudflare proxy records, public ACME validation cannot complete against the composed origin. TLS expiry checks and certificate renewal monitoring are required after cutover.

## Access Control

The composed edge config is the committed `docker/caddy/Caddyfile`; changing it is an ordinary tracked repository edit (no sudo, no host `/etc/caddy`). The only credential-bearing artefact is the gitignored `/proof` gate include on the writable runtime mount (`.proof-review/caddy`), written at runtime by `make proof-review-up` and never committed. SSH access to any staging/production host that runs the composed edge remains privileged operational access; key-only SSH, privileged access review, and command audit evidence should be recorded by the later enterprise readiness track before any production readiness claim.

## Change Control

The composed `docker/caddy/Caddyfile` is version-controlled, so change control is the repository's Git history and validators — no timestamped host backup is required. After editing the Caddyfile, regenerate the Compose targets, run the validators, then validate and reload the running edge and verify the routes. Roll back by reverting the committed change and reloading. Never edit a host `/etc/caddy/Caddyfile` for this surface; the composed edge is authoritative.

## Logging And Privacy

Proof/control routes do not require tenant data, login sessions, cookies, application state, request bodies, or secrets. Logs must not retain raw provider secrets, tenant payloads, or real customer data. Provider request identifiers may be observed for diagnostics but should not be retained as raw long-lived evidence unless a later audit policy permits it.

## Monitoring

After cutover, monitor:

- public HTTPS availability for both proof routes;
- TLS certificate expiry;
- caddy.service active state;
- port 80 and 443 listeners;
- disk, CPU, memory, and network health;
- unexpected Netlify or Cloudflare cache/proxy headers.

## Backup And Recovery

Back up the Caddyfile and any deployment artefacts needed to restore proof/control routes. Certificate material is managed by Caddy and should be handled according to the server backup and secret boundary. No production RTO or RPO is claimed here.

## Security Hardening

Open ports should be limited to SSH, HTTP, and HTTPS for this proof-origin scope. Patch cadence, package source, Caddy version tracking, fail2ban or equivalent controls, firewall posture, and privileged access evidence must be reviewed before any production readiness claim.

## Supply Chain

Caddy version observed during this work: 2.6.2. Third-party Caddy modules are not required by the proof/control route configuration.

## Incident Response

Origin-serving incidents include DNS misroute, TLS issuance failure, route mismatch, Netlify header reappearance, Cloudflare cache/proxy leakage when DNS-only is required, unexpected mutation, and proof route outage. Collect DNS, TLS, headers, Caddy status, Caddy config, and recent service logs, then roll back to the last known good config or DNS state.

## Tenant And Data Boundary

The proof/control routes must not expose tenant data, require application data, mutate persistent state, require real secrets, or imply product UI readiness.

## Non-Claims

This runbook does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full product readiness.
