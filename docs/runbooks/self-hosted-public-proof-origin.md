# Self-Hosted Public Proof Origin Runbook

This runbook records the current self-hosted origin configuration and operating boundary for the public proof/control routes. It is implementation evidence, not semantic authority.

## Scope

Routes:

- /.well-known/usf-public-edge.json
- /__proof/public-route
- /__proof/public-route/

Hostnames:

- 1e100.network
- aldous.info

Protected record:

- ssh.aldous.info must remain DNS-only A 103.138.244.121.

## Caddy Configuration

The active origin configuration lives at /etc/caddy/Caddyfile on ssh.aldous.info. The proof-route configuration applied during USF-289 is:

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

http://1e100.network, http://aldous.info {
	import proof_no_store_headers
	redir https://{host}{uri} 308
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
		basic_auth {
			{$USF_PROOF_COCKPIT_OPERATOR_USER} {$USF_PROOF_COCKPIT_OPERATOR_BCRYPT}
		}
		reverse_proxy 127.0.0.1:18085 {
			header_up X-Forwarded-Host {host}
			header_up X-Forwarded-User {http.auth.user.id}
			header_up X-Real-IP {remote_host}
		}
	}
}

1e100.network {
	import proof_cockpit_handlers
	import proof_route_handlers staging 1e100.network
}

aldous.info {
	import proof_route_handlers production aldous.info
}

http:// {
	import proof_no_store_headers
	header Content-Type "application/json; charset=utf-8"
	respond `{"error":"host-not-authorised","proofRoute":false,"persistentMutation":false}` 404
}
```

This runbook intentionally records Caddy as implementation evidence only. Equivalent nginx, Node, or other HTTP origin implementations may satisfy the same repository contract if they preserve the same route, method, TLS, cache, header, host-mismatch, and non-claim boundaries.

## Operator Proof Cockpit Route (ADR 0015)

Per [ADR 0015](../adr/0015-operator-authenticated-staging-proof-cockpit-access-surface.md), the interactive staging proof cockpit is exposed at `https://1e100.network/proof` as a bounded operator fixture. The `proof_cockpit_handlers` snippet above is imported into the `1e100.network` (staging) host only; it MUST NOT be imported into the `aldous.info` (production) host. It requires an HTTP basic-authentication operator credential before proxying any `/proof` request, and reverse-proxies to the `staging-proof-cockpit` Compose service, published loopback-only at `127.0.0.1:18085`.

Operator credential (set on the origin host, never committed):

- `USF_PROOF_COCKPIT_OPERATOR_USER` — the operator login name (forwarded to the cockpit as `X-Forwarded-User` and recorded as the acceptance/signoff actor).
- `USF_PROOF_COCKPIT_OPERATOR_BCRYPT` — the bcrypt hash of the operator password (generate with `caddy hash-password`).

The cockpit's own write guard remains in force behind this edge: it serves write actions only when `USF_PROOF_COCKPIT_ALLOW_WRITES=yes` and a non-empty `USF_PROOF_COCKPIT_REVIEW_SECRET` are set on the service, and every write is CSRF-double-submit validated. Final signoff is never auto-completed. This route exposes hermetic, synthetic proof content to an authenticated operator; it claims no staging, deployment, production, live-provider, SOC, ISO, enterprise-production, product-UI, browser-E2E, or full-product readiness.

Bringing the fixture up (origin host): start the staging Compose profile that includes the cockpit (`docker compose --profile proof-cockpit ... up -d staging-proof-cockpit`), set the two operator-credential env vars for Caddy, validate the Caddyfile (`caddy validate`), reload Caddy, then confirm `https://1e100.network/proof` prompts for the operator credential and, once authenticated, serves the cockpit. Acceptance and signoff recorded through this route persist to the cockpit's durable volume; promoting them into the committed `evidence/` corpus is the manual reconciliation step described in the human-signoff runbook.

## Availability

Caddy is managed by systemd as caddy.service. It is expected to be active and enabled. After any change, validate the Caddyfile, reload or restart Caddy, and re-run direct origin and public proof checks.

## TLS

Caddy automatic certificate management is expected after DNS-only cutover. While 1e100.network and aldous.info still point to Cloudflare proxy records, public ACME validation cannot complete against the self-hosted origin. TLS expiry checks and certificate renewal monitoring are required after cutover.

## Access Control

SSH access to ssh.aldous.info is privileged operational access. Changes to /etc/caddy/Caddyfile require sudo. Key-only SSH, privileged access review, and command audit evidence should be recorded by the later enterprise readiness track before any production readiness claim.

## Change Control

Before editing /etc/caddy/Caddyfile, create a timestamped backup. After editing, validate the config, reload Caddy, and verify the routes. Roll back by restoring the previous Caddyfile backup and reloading Caddy.

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
