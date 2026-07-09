# GitHub Runner Capacity Enablement

Owner issue: USF-1038

This record captures the runner-capacity slice split out of USF-1037. It is a repository-owned execution and evidence-boundary record. It does not define USF semantics and does not make GitHub settings, runner local state, callback payloads, cache contents, or generated reports authoritative.

## Current Decision

The previous blocker, no authorised Linux x64 runner host/controller, is removed. This server is now the authorised USF runner host/controller. The runner is installed outside the repository, registered to `maldous/usf`, and online as `usf-linux-x64-controller-01`.

The runner uses the required labels `self-hosted`, `linux`, `x64`, `usf`, `usf-ci`, and `usf-trusted`. It runs as the dedicated `usf-runner` user, not as root. The user is not in `sudo` or `docker`. Docker is present on the host, but the runner user is not granted Docker socket access and the workflow does not mount the Docker socket.

USF-1038 is not closure-ready yet. The remaining blocker is operational and exact: a trusted self-hosted `validate` run must complete after this routing change is pushed, with queue, duration, cleanup, cache, and secret-availability evidence captured.

## Host Inspection

The host is Ubuntu 24.04.4 LTS on Linux x86_64 with 16 CPUs, about 39 GiB memory available, and about 358 GiB disk available. systemd is present, GitHub web/API access is available, Node 24, pnpm 11.9.0 through corepack, and Python 3.12 are available to the runner user.

The runner paths are:

- runner: `/opt/usf-github-runner/actions-runner`
- work: `/var/lib/usf-github-runner/work`
- cache: `/var/cache/usf-github-runner`
- temp: `/var/tmp/usf-github-runner`
- log/evidence: `/var/log/usf-github-runner`

These paths are operational state only and do not define USF authority.

## Routing

The required `validate` context remains stable. The workflow now routes trusted main pushes and same-repository pull requests to the USF self-hosted labels. Fork pull requests route to `ubuntu-latest` unless a separately proven unprivileged ephemeral runner path is implemented.

The GitHub-hosted fallback remains available through the repository variable `USF_VALIDATE_RUNNER_TARGET=github-hosted` and through manual `workflow_dispatch` with `runnerTarget=github-hosted`.

## Hygiene

Repository-owned runner scripts live under `tools/github-runner/`, and the operator runbook is `docs/runbooks/github-actions-trusted-runner.md`.

Machine-checkable cleanup and secret-safety checks are implemented. The installed job hooks clean runner work/temp paths and check for live secret-value leakage without printing secret values. Safe tool caches may persist, but cache hits do not prove correctness.

## Timing Evidence

Before evidence remains the GitHub-hosted `validate` run `28999636766`: queue 4 seconds, validate job 391 seconds, checkout 32 seconds, pnpm install 12 seconds, pip install 4 seconds, validate-spec 45 seconds.

After evidence is pending until the pushed workflow completes on `usf-linux-x64-controller-01`. Exact latest run IDs and per-step durations are operational evidence and should be recorded in the PR body and generated step summary. They are not semantic authority.

## Caddy And Callback Decision

Caddy and callback routes remain rejected for basic runner enablement. The authorised host now provides direct runner capacity, and GitHub Actions API plus systemd/runner health checks provide the queue, timing, online-status, and cleanup evidence needed for this slice.

Callback work would become relevant only if a later queue-aware runner controller or health service needs authenticated `workflow_job` events, runner health handoff, or registration coordination. If that happens, signature validation, replay protection, fail-closed route handling, and rollback evidence are required.

## Remaining Closure Requirements

- A self-hosted trusted `validate` run completes successfully.
- Runner label, queue time, job duration, checkout duration, setup duration, pnpm install duration, pip install duration, validate-spec duration, total wall time, cache hit/miss values, cache write policy, secret availability policy, and cleanup result are recorded.
- Repository optimisation validator and selftest pass.
- validate-spec and validate-spec selftest pass.
- Proof-cockpit freshness is re-pinned and validated if source freshness changes.
- GitHub-hosted fallback is verified or explicitly recorded as manual fallback-ready.
- PR #335 and Linear USF-1038 are updated without closing the issue prematurely.

## Non-Claims

This record makes no staging, deployment, provider, credential, store, production, live-provider, compliance, monetisation, or human-acceptance readiness claim. It does not claim cache hits prove correctness, generated reports define authority, callback payloads define authority, or self-hosted runner local state is trusted authority.
