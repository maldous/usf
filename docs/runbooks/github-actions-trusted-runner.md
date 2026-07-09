# GitHub Actions Trusted Runner Runbook

Owner issue: USF-1038

This runbook records the operational path for the USF trusted Linux x64 GitHub Actions runner. It is an execution artefact only. It does not define USF semantics, does not make runner local state authoritative, and does not let cache hits prove correctness.

## Host And Labels

The authorised host/controller is this Linux x64 server. The runner user is `usf-runner`. The runner name is `usf-linux-x64-controller-01`. The required route labels are `self-hosted`, `linux`, `x64`, `usf`, `usf-ci`, and `usf-trusted`.

The custom labels applied at registration are `usf`, `usf-ci`, and `usf-trusted`. GitHub supplies the standard self-hosted Linux x64 labels.

## Install

Run `tools/github-runner/install-runner.sh` from the repository. The script creates or confirms the `usf-runner` account, keeps it out of `sudo` and `docker`, installs the GitHub runner outside the repository, creates isolated work/cache/temp/log directories, and installs cleanup and secret-safety hooks.

## Register

Run `tools/github-runner/register-runner.sh`. The script obtains a short-lived repository runner registration token through GitHub CLI when available. The token is passed directly to the GitHub runner config command, is not printed, is not committed, and is treated as spent after registration.

If GitHub CLI cannot obtain the token, use the GitHub repository settings path: Settings, Actions, Runners, New self-hosted runner, Linux, x64. Provide the short-lived token through `USF_RUNNER_TOKEN` only for the command invocation.

## Start And Stop

Use `tools/github-runner/start-runner.sh` to install and start the systemd service as `usf-runner`. Use `tools/github-runner/stop-runner.sh` to stop it. Do not run the runner as root.

Use `tools/github-runner/remove-runner.sh` to stop the service, request a short-lived removal token through GitHub CLI, and unregister the runner.

## Hygiene

The runner uses `/var/lib/usf-github-runner/work` for workspaces, `/var/cache/usf-github-runner` for tool/cache state, `/var/tmp/usf-github-runner` for temp files, and `/var/log/usf-github-runner` for operational evidence. These paths are not semantic authority.

`tools/github-runner/cleanup-workspace.sh` removes transient workspace and temp contents while preserving safe tool caches. `tools/github-runner/verify-secret-safety.sh` searches only for live secret values in runner work/temp paths and does not print secret values. The installed job-start and job-completed hooks write machine-readable hygiene evidence under `/var/log/usf-github-runner/evidence`.

## Workflow Routing

The required job context remains `validate`. Trusted main pushes and trusted repository pull requests may use the self-hosted labels. Fork pull requests route to GitHub-hosted runners unless a separately proven unprivileged ephemeral runner path is implemented.

The repository variable `USF_VALIDATE_RUNNER_TARGET=github-hosted` is the manual fallback switch. `tools/github-runner/rollback-to-github-hosted.sh set` enables the fallback and `tools/github-runner/rollback-to-github-hosted.sh clear` returns routing to automatic mode.

## Caddy And Callback

Caddy and callback routes are not required for basic runner enablement. They remain rejected for USF-1038 unless runner health or workflow queue handoff later requires authenticated webhook ingestion with signature validation, replay protection, fail-closed behaviour, and rollback.

## Non-Claims

This runbook makes no staging, deployment, provider, credential, production, live-provider, store, compliance, monetisation, or human-acceptance readiness claim. It does not make generated reports, callback payloads, cache contents, or runner local state authoritative.
