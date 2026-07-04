# Public FQDN Proof Baseline Tag Gate

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| Issue scope         | USF-265                                                            |
| Parent gate         | USF-261                                                            |
| Tag                 | `v2-proof`                                                         |
| Tag type            | Annotated Git tag                                                  |
| Evidence record     | `docs/architecture/public-fqdn-proof-baseline-tag-gate.json`       |
| Authority exception | `docs/architecture/git-practices-standard.md` 9.6.2                |

USF-265 authorises the exact annotated tag name `v2-proof` as a one-off post-Test public-FQDN proof-baseline tag. This is a tag naming exception only. It is not a general exception for arbitrary `v2-*` tags, branches, paths, file names, package names, schema IDs, taxonomy IDs, vocabulary IDs, implementation names, or local value IDs.

The tag may be created only after:

- Dev readiness remains complete under prior merged evidence.
- Bounded Test readiness remains complete after PR #234 validator hardening.
- USF-262, USF-263, USF-264, and USF-266 are Done or explicitly bounded with approved rationale.
- The final validation suite passes on merged `main`.
- Open GitHub PR search is empty.
- Linear readiness search is clean for this gate, except future Staging work that is explicitly outside USF-261 through USF-265.
- Git status is clean in the validation checkout.
- USF-39 is not mutated.

The tag command is:

```text
git tag -a v2-proof <target-commit-sha> -m <message-preserving-usf-265-boundary>
git push origin refs/tags/v2-proof
```

The final tag object SHA, target commit SHA, tagger, timestamp, remote ref verification, and validation summary must be recorded in Linear USF-265 immediately after the tag is pushed. The annotated tag message must identify USF-265, the target commit, the completed prerequisite gates, and the non-claims below.

## Boundary

The tag means:

- Dev readiness is complete.
- Bounded Test readiness is complete after PR #234 validator hardening.
- Public FQDN semantic proof, external DNS/TLS/HTTPS JSON proof, gateway-neutral public proof origin, and public browser route telemetry bootstrap proof have passed to the agreed bounded evidence level for `1e100.network` and `aldous.info`.

The tag does not mean:

- Staging readiness.
- Production readiness.
- Deployment readiness.
- Live-provider readiness.
- SOC readiness.
- ISO certification readiness.
- Enterprise production readiness.
- Product UI readiness.
- Browser E2E readiness.
- Full React product parity.
- Caddy, Netlify, Cloudflare Worker, nginx, or any gateway product as a semantic requirement.

This gate records a baseline state for the future Staging-entry track. It does not start Staging implementation.
