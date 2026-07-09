# GitHub Runner Capacity Enablement

Owner issue: USF-1038

This record captures the runner-capacity slice split out of USF-1037. It is a repository-owned execution and evidence-boundary record. It does not define USF semantics and does not make GitHub settings, runner local state, callback payloads, cache contents, or generated reports authoritative.

## Current Decision

The previous blocker, no authorised Linux x64 runner host/controller, is removed. This server is now the authorised USF runner host/controller. The runner is installed outside the repository, registered to `maldous/usf`, and online as `usf-linux-x64-controller-01`.

The runner uses the required labels `self-hosted`, `linux`, `x64`, `usf`, `usf-ci`, and `usf-trusted`. It runs as the dedicated `usf-runner` user, not as root. The user is not in `sudo` or `docker`. Docker is present on the host, but the runner user is not granted Docker socket access and the workflow does not mount the Docker socket.

The trusted self-hosted `validate` run now completes on this runner. USF-1038 is no longer blocked by missing host/controller. It is now in the state: measured on a trusted runner with explicit remaining operational blocker (trusted cache-write-capable main-path evidence). PR #335 evidence is being updated and kept in progress until all acceptance criteria are confirmed individually.

## Host Inspection

The host is Ubuntu 24.04.4 LTS on Linux x86_64 with 32 logical CPUs, about 43 GiB memory available, and about 359 GiB disk available. systemd is present, GitHub web/API access is available, Node 24, pnpm 11.9.0 through corepack, and Python 3.12 are available to the runner user.

The runner paths are:

- runner: `/opt/usf-github-runner/actions-runner`
- work: `/var/lib/usf-github-runner/work`
- cache: `/var/cache/usf-github-runner`
- temp: `/var/tmp/usf-github-runner`
- log/evidence: `/var/log/usf-github-runner`

These paths are operational state only and do not define USF authority.

## Routing

The required `validate` context remains stable. The workflow now routes trusted main pushes and same-repository pull requests to the USF self-hosted labels. Fork pull requests route to `ubuntu-latest` unless a separately proven unprivileged ephemeral runner path is implemented.

The GitHub-hosted fallback remains available through the repository variable `USF_VALIDATE_RUNNER_TARGET=github-hosted` and through manual `workflow_dispatch` with `runnerTarget=github-hosted`. A live fallback probe was executed on run `29011736599`, job `86096784983`, and passed.

## Hygiene

Repository-owned runner scripts live under `tools/github-runner/`, and the operator runbook is `docs/runbooks/github-actions-trusted-runner.md`.

Machine-checkable cleanup and secret-safety checks are implemented. The installed job hooks clean runner work/temp paths and check for live secret-value leakage without printing secret values. Safe tool caches may persist, but cache hits do not prove correctness.

Generated validator, hygiene, toolchain, and timing helper reports use the GitHub runner-scoped `RUNNER_TEMP` boundary. Fixed persistent `/tmp/usf-*` report paths are rejected by the repository optimisation validator because they can collide across users or prior runs on a persistent host.

## Timing Evidence

Baseline evidence remains the GitHub-hosted `validate` run `28999636766`: queue 4 seconds, validate job 391 seconds, total run 396 seconds, checkout 32 seconds, setup 3 seconds, pnpm install 12 seconds, pip install 4 seconds, validate-spec 45 seconds.

Primary after evidence is the trusted self-hosted `validate` run `29012452458`, job `86099130372`, on `usf-linux-x64-controller-01`: queue 4 seconds, validate job 359 seconds, total run 363 seconds, checkout 61 seconds, setup 0 seconds, pnpm install 2 seconds, pip install 0 seconds, validate-spec 37 seconds, repository validation 139 seconds, parity validation 74 seconds, proof-cockpit validation 3 seconds, proof-cockpit selftest 23 seconds. The run is trusted runner-backed and passes.

The earlier trusted self-hosted PR warm run `29006497453`, job `86079216941`, on `usf-linux-x64-controller-01` is also recorded: queue 3 seconds, validate job 304 seconds, total run 308 seconds, checkout 4 seconds, setup 0 seconds, pnpm install 2 seconds, pip install 0 seconds, validate-spec 37 seconds, repository validation 138 seconds, parity validation 74 seconds, proof-cockpit validation 3 seconds, proof-cockpit selftest 23 seconds, and PR governance gate 2 seconds.

Fallback probe evidence is on GitHub-hosted `run 29011736599`, job `86096784983`: queue 3 seconds, validate job 386 seconds, total run 389 seconds, checkout 30 seconds, setup 0 seconds, pnpm install 14 seconds, pip install 2 seconds, validate-spec 45 seconds, repository validation 125 seconds, parity validation 57 seconds, proof-cockpit validation 3 seconds, proof-cockpit selftest 20 seconds, and PR governance gate 2 seconds. The run completed successfully.

Compared with the USF-1038 GitHub-hosted before run, the earlier trusted warm PR run `29006497453` reduced validate job duration by 87 seconds and total run duration by 88 seconds. Checkout dropped by 28 seconds, pnpm by 10 seconds, pip by 4 seconds, and validate-spec by 8 seconds. The later trusted run `29010783904` remains useful for continuity and reuse checks but shows a longer checkout on that sample. These timings are operational evidence only. They are not semantic authority, do not prove correctness, and do not let runner local state or cache state satisfy validation.

For the PR warm run `29006497453`, pnpm and pip cache lookups were attempted and both restored as misses; raw cache-hit outputs were blank and normalised to explicit `false`. Cache writes were not allowed or attempted on that pull-request run, and both were skipped with reason `pull-request-read-only`. For workflow-dispatch trusted runs on non-main refs (for example `29012452458`), cache lookups were not attempted and hits defaulted to explicit `false` with no write attempts.

Same-repository PR secrets were available by policy, but workflow postflight secret-safety checks found zero printed secret values. Workflow preflight cleanup, postflight cleanup, and secret-safety checks all passed.

The first self-hosted attempt, run `29003193370`, selected `usf-linux-x64-controller-01` and queued in 4 seconds, but failed at `actions/checkout` before validators ran. The failure was an implementation defect in the job-start cleanup hook: it removed the active GitHub workspace directory before checkout could start Node. The cleanup script now always preserves the active `GITHUB_WORKSPACE` path, and the fixed script was reinstalled into the host hook directory.

The second self-hosted attempt, run `29003495086`, selected `usf-linux-x64-controller-01` and queued in 3 seconds. Checkout, toolchain setup, pnpm install, and pip install completed, but `validate-spec` failed while writing `/tmp/usf-validator-report.json` because that fixed persistent temp path was not writable by the runner user. This was a workflow report-boundary defect, not a semantic validation failure. The workflow now writes generated reports under `RUNNER_TEMP`, verifies that boundary before preflight hygiene, and validator coverage rejects fixed `/tmp/usf-*` report paths.

The third self-hosted attempt, run `29004454797`, completed core validators and the generated timing boundary, but the PR governance gate correctly failed because the newly added runner control scripts had not yet been explicitly authorised in the validator tooling allowlist. That was fixed by authorising the specific `tools/github-runner/` scripts used by this runner-control slice. The subsequent runs `29005646991`, `29006497453`, and `29010783904` passed end to end. The latest full run `29012452458` also passed with required-path and timing evidence.

### Pending main-path evidence

Trusted cache-write-capable main-path behaviour is still pending. A direct `workflow_dispatch` attempt for main with self-hosted targeting was blocked by repository workflow policy on the main branch with HTTP 422: workflow does not have `workflow_dispatch` in its branch state at that time. The current main branch route does not yet permit main-event trusted runs until that definition is current.

## Caddy And Callback Decision

Caddy and callback routes remain rejected for basic runner enablement. The authorised host now provides direct runner capacity, and GitHub Actions API plus systemd/runner health checks provide the queue, timing, online-status, and cleanup evidence needed for this slice.

Callback work would become relevant only if a later queue-aware runner controller or health service needs authenticated `workflow_job` events, runner health handoff, or registration coordination. If that happens, signature validation, replay protection, fail-closed route handling, and rollback evidence are required.

## Remaining Closure Requirements

- PR #335 is updated with measured run evidence, fallback posture, cleanup proof, cache write policy, and non-claims.
- Linear USF-1038 is updated and remains open until acceptance criteria are checked individually.
- GitHub-hosted fallback remains documented and manually switchable; a live post-measurement fallback run `29011736599` has been executed and recorded.
- Trusted write-capable cache behaviour has not yet been observed in a trusted runner-backed main-path execution; PR and manual non-main runs confirm explicit non-main write-skip and read-only cache modes.
- A direct `workflow_dispatch` attempt for a trusted main-path self-hosted run was blocked by main-branch workflow policy (HTTP 422: workflow does not have `workflow_dispatch` trigger in that main-branch revision), so cache-write-capable main-path evidence is pending.
- Remaining deferred optimisation work is represented by precise follow-up issue IDs before Linear closure.

## Non-Claims

This record makes no staging, deployment, provider, credential, store, production, live-provider, compliance, monetisation, or human-acceptance readiness claim. It does not claim cache hits prove correctness, generated reports define authority, callback payloads define authority, or self-hosted runner local state is trusted authority.
