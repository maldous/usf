# Dev-Ready Foundation Baseline Tag Evidence

|                     |                                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| **Issue scope**     | USF-228                                                                         |
| **Tag**             | `v2-foundation`                                                                 |
| **Tag type**        | Annotated Git tag                                                               |
| **Tag object SHA**  | `0543288306394b6106b81dd2dca2629091a5299b`                                      |
| **Target commit**   | `4a4eb129bf8d441be512cc3a976d2d2004a4a250`                                      |
| **Tag date**        | 2026-07-02 18:01:38 +1000                                                       |
| **Evidence record** | `docs/architecture/dev-ready-foundation-baseline-tag.json`                      |
| **Authority note**  | One-off exception governed by `docs/architecture/git-practices-standard.md` 9.6 |

The `v2-foundation` tag is the one-off annotated release-baseline tag authorised for USF-228. It marks the immutable dev-ready foundation baseline before post-foundation optimisation and minimalisation starts.

The governance amendment for the exact tag name was merged in PR #196 at `4a4eb129bf8d441be512cc3a976d2d2004a4a250`. The tag points at that same validated merge commit. The local and remote tag refs were verified, including the peeled remote target.

Post-merge validation passed on the target commit before the tag was created:

- `corepack pnpm install --frozen-lockfile`
- `make verify`
- `corepack pnpm parity`
- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json`
- `python3 tools/validate-bootstrap/validate-bootstrap.py all --json`
- `python3 tools/validate-parity/validate-parity.py all --json`
- `python3 tools/validate-enterprise/validate-enterprise.py all --json`
- `git diff --check`
- `git diff --check origin/main...HEAD`

This tag is not a general exception for arbitrary `v2-*` tags, branches, paths, file names, package names, schema IDs, taxonomy IDs, vocabulary IDs, implementation names, or local value IDs.

This tag does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification readiness, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
