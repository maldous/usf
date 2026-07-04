# Self-Hosted Public Proof Origin Service

This evidence records the migration target for the public proof and control routes. It does not make Caddy, nginx, Cloudflare, Netlify, or any provider semantic authority. The repository public FQDN and external HTTP contracts remain the semantic authority.

## Current State

The self-hosted origin at 103.138.244.121 is configured with Caddy and systemd. Caddy is active, enabled, validates its configuration, and listens on ports 80 and 443. The protected SSH record remains ssh.aldous.info as DNS-only A 103.138.244.121.

The public cutover is not complete. The apex records for 1e100.network and aldous.info still resolve to Cloudflare proxy addresses, and live public proof/control route headers still show Netlify evidence. Cloudflare and Netlify credentials were not available in this session, so the DNS-only cutover could not be completed from the repository session.

## Required Cutover

To complete the migration, change only the public apex proof hostnames:

- 1e100.network must become a DNS-only A record to 103.138.244.121.
- aldous.info must become a DNS-only A record to 103.138.244.121.
- Any apex CNAME, flattened CNAME, or proxied route to Netlify must be disabled or removed.
- ssh.aldous.info must remain DNS-only A 103.138.244.121.

After DNS cutover, Caddy should be able to issue public certificates and serve HTTPS directly. The live proof evidence must show no Netlify error page, no Netlify Cache-Status, no Netlify Age, and no Cloudflare cache-hit evidence on the proof/control routes.

## Enterprise Origin Semantics

The self-hosted origin evidence covers ownership, availability, TLS lifecycle, privileged access, change control, logging and privacy, monitoring, backup and recovery, security hardening, supply chain, incident response, tenant/data boundaries, provider independence, and ISO/IEC 27001-style control-support themes.

This is control-support evidence only. It does not claim ISO/IEC 27001 certification, SOC readiness, enterprise production readiness, production readiness, staging readiness, deployment readiness, live-provider readiness, product UI readiness, browser E2E readiness, or full React parity.

## Netlify Boundary

Netlify remains historical implementation evidence from the previous public proof route work. It is not the intended long-term live serving path for these proof/control routes and is not semantic authority. Once DNS cutover is complete, Netlify headers and Netlify error pages must disappear from live proof evidence.

## Validation

Repository validation is enforced by USF-PUBLIC-FQDN-026 and USF-PUBLIC-FQDN-027 in the public FQDN validator. The validator allows the current state only as origin-configured-public-dns-cutover-blocked, with explicit operator action. It must fail if this state is represented as a completed migration while Netlify or Cloudflare proxy evidence remains.
