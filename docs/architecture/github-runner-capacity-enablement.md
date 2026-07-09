# GitHub Runner Capacity Enablement

Owner issue: USF-1038

This record captures the runner-capacity slice split out of USF-1037. It is a repository-owned execution and blocker record. It does not define USF semantics and does not make GitHub settings, runner local state, callback payloads, or generated reports authoritative.

## Current Decision

Self-hosted runner enablement is blocked in this branch. The GitHub API reports zero repository self-hosted runners for `maldous/usf`, and no dedicated runner host, runner user, workspace boundary, cleanup proof, or USF-specific runner labels are available in this repository session. I did not request a runner registration token because doing so without a target host would create an unnecessary secret exposure path.

The required `validate` context remains on `ubuntu-latest`. Branch protection still requires `validate` with strict status checks, so no workflow route is moved to `self-hosted` while no matching trusted runner exists.

## Timing Signal

Recent hosted validate runs show the bottleneck USF-1038 is meant to address:

- Run `28994186922`: queue 2 seconds, validate job 377 seconds, total 380 seconds.
- Run `28991132832`: queue 3 seconds, validate job 374 seconds, total 378 seconds.
- Run `28997184304`: queue 302 seconds, validate job 374 seconds, total 677 seconds.

The latest delay is runner acquisition/queue time. It is not a semantic validation failure.

## Trust Posture

Trusted main and trusted repository PR contexts may use a trusted runner only after the runner is registered with USF-specific labels and cleanup proof exists. Untrusted fork PRs must remain on GitHub-hosted runners unless a separately proven ephemeral unprivileged runner path is implemented. Privileged CI requires a trusted ref, isolated workspace, and secret non-exposure. Unprivileged CI must not write trusted cache, evidence, repository state, or secrets.

## Required Runner Labels

The required label set is `self-hosted`, `linux`, `x64`, `usf`, `usf-ci`, and `usf-trusted`. Labels must not be weakened or reused from unrelated runner pools.

## Lifecycle Policy

An ephemeral runner is preferred. It must register for one bounded trusted run, unregister after completion, destroy its workspace, and record registration, execution, cleanup, and removal evidence. A persistent runner is allowed only with a dedicated USF runner user, minimal host privileges, no unsafe Docker socket or host mounts, pre-job and post-job cleanup, isolated caches, no secrets written to workspace, update policy, rollback path, and machine-checkable cleanup proof.

## Caddy And Callback Decision

Caddy and callback routes are not changed for USF-1038 at this point. A callback route cannot create runner capacity without a runner host or controller, and GitHub Actions API metadata already provides the current queue-time evidence. Existing Caddy proof routes remain proof/control route evidence only; they are not CI runner infrastructure.

Callback work would become relevant only if a dedicated runner controller or health service needs authenticated `workflow_job` events, runner health handoff, or registration coordination. If that happens, signature validation, replay protection, fail-closed route handling, and rollback evidence are required.

## Exact Blocker

The blocker is concrete: zero repository self-hosted runners are registered, no dedicated runner host/controller is available, no USF-specific labels exist, no cleanup proof exists, and no runner-backed after timing can be captured.

The next unblockers are a dedicated Linux x64 runner host or ephemeral controller, safe runner registration with USF labels, cleanup and secret non-exposure proof, branch-protection-compatible routing that preserves `validate`, GitHub-hosted fallback, and comparable before/after timing.

## Non-Claims

This record makes no staging, deployment, provider, credential, store, production, live-provider, compliance, monetisation, or human-acceptance readiness claim. It does not claim cache hits prove correctness, generated reports define authority, callback payloads define authority, or self-hosted runner local state is trusted authority.
