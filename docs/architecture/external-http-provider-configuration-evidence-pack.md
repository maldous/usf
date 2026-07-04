# External HTTP Provider Configuration Evidence Pack

This evidence pack supports USF-267, USF-269, and USF-271. It records provider observations for the pre-Staging external HTTP semantics gate without making Cloudflare, Netlify, Caddy, nginx, Workers, Pages, or any other provider semantic authority.

## Current Result

The gate remains blocked. Public reachability works, but two provider configuration behaviours still contradict the pre-Staging external HTTP semantics gate:

- `http://1e100.network/.well-known/usf-public-edge.json` returns HTTP 200 instead of a same-host HTTPS redirect.
- HTTPS proof/control routes for `1e100.network` and `aldous.info` show `Cache-Status: "Netlify Edge"; hit` with nonzero `Age` while the routes declare no-store cache policy.

`aldous.info` already redirects HTTP to the same HTTPS host for the JSON proof endpoint. Cloudflare reports dynamic handling for the blocked cache observations, so the current evidence points to Netlify Edge or the route implementation/deploy cache boundary rather than Cloudflare edge cache as the cache-hit source.

## Provider Access

This session could not inspect or mutate provider dashboards directly:

- Cloudflare API credentials were not present.
- Netlify CLI was installed but not logged in.
- Netlify API credentials and site id were not present.
- Wrangler and cloudflared were not available.
- The repository does not contain `netlify.toml`, `_headers`, `_redirects`, `wrangler.toml`, or Cloudflare configuration files for these domains.

Because provider mutation was not available, the repo preserves fail-closed proof behaviour and records exact operator actions instead of faking success.

## Protected Record

`ssh.aldous.info` remains protected. It was observed with DNS A record `103.138.244.121` and no AAAA record. Do not change this record while resolving the public proof routes.

## Operator Actions

1. For `1e100.network`, enable Cloudflare Always Use HTTPS or an equivalent scoped same-host redirect rule so the JSON proof route redirects from HTTP to `https://1e100.network/.well-known/usf-public-edge.json`. Do not redirect to `aldous.info`, do not redirect to `www`, and do not alter `ssh.aldous.info`.

2. For the current Netlify or equivalent route implementation, redeploy or configure both proof/control routes so they emit ordinary `Cache-Control: no-store` and CDN no-store headers, then purge or redeploy provider cache. The routes are `/.well-known/usf-public-edge.json` and `/__proof/public-route/`.

3. Verify with the commands listed in `docs/architecture/external-http-provider-configuration-evidence-pack.json`. The gate remains blocked until `corepack pnpm proof:external-http-cache` and `corepack pnpm proof:pre-staging-external-smoke` pass against the public FQDNs.

## Rollback

Rollback is provider scoped:

- Disable or remove only the redirect setting added for `1e100.network` if it causes unintended behaviour.
- Restore the prior Netlify deploy or route header configuration if no-store proof-route delivery regresses.
- Re-run the same proof commands after rollback and keep `ssh.aldous.info` unchanged.

## Non-Claims

This pack does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
