# External HTTP Provider Configuration Evidence Pack

This evidence pack supports USF-267, USF-269, and USF-271. It records provider observations for the pre-Staging external HTTP semantics gate without making Cloudflare, Netlify, Caddy, nginx, Workers, Pages, or any other provider semantic authority.

## Current Result

The gate remains blocked. Public reachability works and the earlier `1e100.network` same-host HTTP-to-HTTPS redirect blocker is now resolved, but provider cache evidence still contradicts the pre-Staging external HTTP semantics gate.

The external provider evidence was last materially checked on PR head `5003b05d61756c0dfbea093b54bdb12ea1ae8847`. Later metadata-only commits must not be used to claim the provider blocker is resolved unless the external proof commands are rerun and pass or this evidence pack is regenerated.

- HTTPS proof/control routes for `1e100.network` and `aldous.info` show `Cache-Status: "Netlify Edge"; fwd=stale` or `hit` with nonzero `Age` while the routes declare no-store cache policy.

Both root FQDNs now redirect HTTP to the same HTTPS host for the JSON proof endpoint. Cloudflare reports dynamic handling for the blocked cache observations, so the current evidence points to Netlify Edge or the route implementation/deploy cache boundary rather than Cloudflare edge cache as the cache source.

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

1. No further redirect action is currently required for `1e100.network`; the same-host HTTPS redirect is now observed. Keep the setting in place, do not redirect to `aldous.info`, do not redirect to `www`, and do not alter `ssh.aldous.info`.

2. For the current Netlify or equivalent route implementation, redeploy or configure both proof/control routes so they emit ordinary `Cache-Control: no-store` and CDN no-store headers, then purge or redeploy provider cache. The routes are `/.well-known/usf-public-edge.json` and `/__proof/public-route/`.

3. Verify with the commands listed in `docs/architecture/external-http-provider-configuration-evidence-pack.json`. The gate remains blocked until `corepack pnpm proof:external-http-cache` and `corepack pnpm proof:pre-staging-external-smoke` pass against the public FQDNs.

## Rollback

Rollback is provider scoped:

- Disable or remove only the redirect setting added for `1e100.network` if it causes unintended behaviour.
- Restore the prior Netlify deploy or route header configuration if no-store proof-route delivery regresses.
- Re-run the same proof commands after rollback and keep `ssh.aldous.info` unchanged.

## Non-Claims

This pack does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
