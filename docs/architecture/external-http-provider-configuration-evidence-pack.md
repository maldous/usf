# External HTTP Provider Configuration Evidence Pack

This evidence pack supports USF-267, USF-269, and USF-271. It records provider observations for the pre-Staging external HTTP semantics gate without making Cloudflare, Netlify, Caddy, nginx, Workers, Pages, or any other provider semantic authority.

## Current Result

The gate remains blocked. Public reachability works and the earlier `1e100.network` same-host HTTP-to-HTTPS redirect blocker is now resolved. PR #240 also moved the proof/control routes from static Netlify deploy artifacts to repo-owned Netlify Function responses, but provider Age evidence still contradicts the pre-Staging external HTTP semantics gate.

The external provider evidence was last materially checked after the repo-owned Netlify Function route source commit `336dae9823d15da6e44c9a32731877d4746e66f4`. Later metadata-only commits must not be used to claim the provider blocker is resolved unless the external proof commands are rerun and pass or this evidence pack is regenerated.

- HTTPS proof/control routes for `1e100.network` and `aldous.info` now show dynamic Function-route evidence with `Netlify Durable` bypass and `Netlify Edge` miss on the canonical routes. They still intermittently show low nonzero `Age`, while the routes declare no-store cache policy. The existing proof remains fail-closed on that Age evidence.

Both root FQDNs now redirect HTTP to the same HTTPS host for the JSON proof endpoint. Cloudflare reports dynamic handling for the blocked cache observations, so the current evidence points to Netlify provider Age behaviour on dynamic no-store responses rather than Cloudflare edge cache as the cache source.

## Provider Access

This session could not inspect or mutate provider dashboards directly:

- Cloudflare API credentials were not present.
- Netlify CLI was installed but not logged in.
- Netlify API credentials were present through the environment. The two dedicated Netlify proof-origin sites were identified and redeployed with the repo-owned Function route source.
- Wrangler and cloudflared were not available.
- The repository now contains `netlify.toml` and Netlify Function source for the exact proof/control routes. It still does not contain `_headers`, `_redirects`, `wrangler.toml`, or Cloudflare configuration files for these domains.

Because direct Cloudflare Worker mutation was not available and the Netlify Function deploy still emits low Age on dynamic no-store responses, the repo preserves fail-closed proof behaviour and records the remaining operator or decision action instead of faking success.

## Protected Record

`ssh.aldous.info` remains protected. It was observed with DNS A record `103.138.244.121` and no AAAA record. Do not change this record while resolving the public proof routes.

## Operator Actions

1. No further redirect action is currently required for `1e100.network`; the same-host HTTPS redirect is now observed. Keep the setting in place, do not redirect to `aldous.info`, do not redirect to `www`, and do not alter `ssh.aldous.info`.

2. The static Netlify route source has been replaced by repo-owned Netlify Function responses for `/.well-known/usf-public-edge.json`, `/__proof/public-route`, and `/__proof/public-route/`. The remaining action is to provide a provider route source or setting that produces no nonzero `Age` on these no-store responses, or obtain an explicit human-approved boundary decision that Netlify `fwd=miss` plus low nonzero `Age` is acceptable evidence for this gate.

3. Verify with the commands listed in `docs/architecture/external-http-provider-configuration-evidence-pack.json`. The gate remains blocked until `corepack pnpm proof:external-http-cache` and `corepack pnpm proof:pre-staging-external-smoke` pass against the public FQDNs.

## Rollback

Rollback is provider scoped:

- Disable or remove only the redirect setting added for `1e100.network` if it causes unintended behaviour.
- Restore the prior Netlify deploy or route header configuration if Function-backed proof-route delivery regresses.
- Re-run the same proof commands after rollback and keep `ssh.aldous.info` unchanged.

## Non-Claims

This pack does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
