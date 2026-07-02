# Dev Readiness Validation and Handover

| | |
|---|---|
| **Document type** | Architecture / developer handover guide |
| **Status** | Draft / USF-226 validation |
| **Issue scope** | USF-226 |
| **Authority level** | Developer handover evidence and process guidance; subordinate to semantic definitions, ADRs, validators, proof evidence, and source implementation |
| **Evidence report** | `docs/architecture/dev-readiness-validation-and-handover.json` |

This guide defines the USF local developer and AI-agent handover path after foundation-readiness closure. It does not reopen foundation parity scope and does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.

## Dev-Ready Definition

For USF-226, dev ready means a developer or AI agent can clone the repository, set it up from documented steps, run the local and composed foundation, execute proof and validation commands, understand failures, make a governed change, and submit a compliant PR without private knowledge, hidden local state, real secrets, or real tenant data.

## Prerequisites

Install these tools before running the local handover path:

| Tool | Required posture | Evidence command |
|---|---|---|
| Git | Fresh clone and branch workflow | `git status --short` |
| Node.js | Version 24.16.0 or newer, matching `package.json` engines | `node --version` |
| Corepack | Provides pinned pnpm package manager | `corepack --version` |
| pnpm | Version 11.9.0, pinned by `packageManager` | `corepack pnpm --version` |
| Python | Python 3 for repository validators | `python3 --version` |
| Docker Compose | Required for composed-provider proofs and `make verify` | `docker compose version` |

The repository uses exact dependency versions in `package.json` and a committed lockfile. Do not use floating package versions or a different package manager for the handover path.

## Fresh Clone Bootstrap

From a clean environment:

```bash
git clone https://github.com/maldous/usf.git
cd usf
make verify
```

`make verify` depends on `make install`, which runs the frozen pnpm install before executing the full local proof and validation gate. It is the supported one-command install, setup, and verification path for USF-226.

Do not require a privileged global pnpm shim for the handover path. `make verify` invokes `corepack pnpm` directly. Running `corepack enable` is optional for developers who want a global pnpm shim and whose workstation permits creating it.

If you want to separate install from proof while debugging, run:

```bash
make install
corepack pnpm verify
```

## Validation Model

Local validation is intentionally broader than the current GitHub CI workflow.

| Gate | Scope | When to run |
|---|---|---|
| `make verify` | Frozen install, formatting, lint, typecheck, tests, OpenAPI check, DB type check, dev smoke, compose validation, runtime proof, provider proofs, enterprise validation, spec validation, parity validation | Before a PR is ready for review and before marking an issue Done |
| `corepack pnpm parity` | Full parity validator suite, compose validator, runtime validator, enterprise validator | When architecture, source-use, parity, runtime, provider, or evidence files change |
| `python3 tools/validate-spec/validate-spec.py all --json` | Spec corpus and validator self-validation | For spec, ADR, command, evidence, and governance artefacts |
| `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json` | PR-scoped governance gate | Before opening or updating a PR |
| `python3 tools/validate-bootstrap/validate-bootstrap.py all --json` | Bootstrap governance checks | For bootstrap or proof-anchor posture changes |
| `python3 tools/validate-enterprise/validate-enterprise.py all --json` | Enterprise evidence and non-claim checks | For readiness, evidence, provider, and assurance changes |
| `git diff --check` and `git diff --check origin/main...HEAD` | Whitespace and diff hygiene | Before commit and before PR ready |

Current CI alignment:

- Pull requests run `.github/workflows/validate-spec.yml`, which validates the spec corpus and PR governance gate.
- Pushes to `main` run `.github/workflows/proof-anchor.yml`, which publishes the proof-freshness anchor for the merge commit.
- The repository handover gate remains the local `make verify` superset. A green GitHub spec check alone is not sufficient for Linear Done.

## Proof Command Guide

Representative proof commands:

| Command | Purpose |
|---|---|
| `corepack pnpm dev:smoke` | In-memory API smoke path with fail-closed tenant and authorization checks |
| `corepack pnpm runtime:proof` | API and worker runtime proof across in-memory and compose-backed modes |
| `corepack pnpm providers-proof` | Provider adapter proof and SDK boundary checks |
| `corepack pnpm proof:api:graphql-generated-client` | Generated client, external developer, GraphQL, and federation proof from USF-224 |
| `corepack pnpm proof:observability:browser-telemetry` | Minimal browser telemetry proof from USF-225 |
| `corepack pnpm proof:backup:operations` | Backup, restore, DR, PITR, and RPO/RTO local operations proof |
| `corepack pnpm proof:observability:operations-execution` | Alerting, dashboard, incident, and observability operation proof |

`make verify` runs the required representative proof set. If a specific proof fails, rerun the failing proof directly after checking the troubleshooting section below.

## Safe Local Configuration

USF local proof commands use synthetic fixtures and local placeholder credentials. No real provider credentials, real tenant data, production data, staging data, or live-provider access are required.

| Setting or boundary | Local handover posture |
|---|---|
| Host binding | Local services bind to loopback where exposed to the host. |
| API port | Runtime proofs use ephemeral or local-only ports where supported. |
| `USF_DEV_RUNTIME_MODE` | Explicitly selects `dev-in-memory` or `dev-compose-backed`; in-memory is not silently treated as compose-backed. |
| `USF_WORKER_RUN_ONCE` | Used by worker proof to avoid orphan long-running processes. |
| `USF_BROWSER_EXECUTABLE` | Optional local Chromium path for browser telemetry proof if the default executable discovery is unavailable. |
| Compose credentials | Local placeholders only, governed by service catalogue and adapter proof evidence. |
| Secrets | Secret-shaped fixture values are redacted from audit, log, validation, and proof outputs. |
| Tenant and actor data | Synthetic tenant and actor identifiers only. |

Do not add `.env` files with real credentials for the local proof path. If a proof needs a local override, keep it shell-local and value-free in committed evidence.

## Synthetic Fixture and Data Readiness

The local handover path exercises representative synthetic data only:

- synthetic tenant IDs such as tenant-alpha, tenant-beta, runtime-proof, and collision-test tenants;
- synthetic actor IDs and API-key onboarding records;
- synthetic jobs, workflows, notifications, imports, exports, browser telemetry events, provider events, and audit events;
- local placeholder credentials for composed services;
- redaction markers for secret-shaped fixture values.

This proves local development and proof ergonomics. It does not prove production data migration, customer data handling, live-provider tenant operation, legal hold operation, or production incident readiness.

## Diagnostics and Troubleshooting

Use the failing command as the first diagnostic boundary. Do not replace a failing proof with a weaker readiness claim.

| Symptom | Likely cause | First checks |
|---|---|---|
| Frozen install fails | Node or pnpm version mismatch, lockfile drift, missing Corepack | Check `node --version`, `corepack pnpm --version`, and rerun `corepack enable` |
| Docker Compose proof fails to start | Docker daemon unavailable, ports unavailable, previous containers still running | Check `docker compose version`, then run the failing proof again after Compose teardown completes |
| Runtime proof reports provider mismatch | `USF_DEV_RUNTIME_MODE` or composed service boundary is inconsistent | Rerun `corepack pnpm runtime:validate` and inspect the runtime proof failure |
| Validator reports stale evidence | Evidence commit pin or report freshness does not match current head | Rerun the authoritative proof or validator, then update the evidence row rather than editing a generated report |
| Browser telemetry proof cannot launch a browser | Local Chromium executable unavailable | Set `USF_BROWSER_EXECUTABLE` to a local Chromium-compatible executable and rerun `corepack pnpm proof:observability:browser-telemetry` |
| Redaction or secret leak finding | A proof, log, audit event, or validator output includes a forbidden raw value | Treat as blocking. Remove the raw value from safe output and add proof that redaction holds |

Every proof that starts child processes or Compose resources must tear them down. If a proof exits early, run Docker cleanup only for the proof project after confirming no unrelated developer containers are affected.

## Governed Human and AI-Agent Contribution Workflow

For a bounded change:

1. Read `CODEX.md`, `AGENTS.md`, the foundational governance artefacts, and issue-specific repository authority from disk.
2. Read the Linear issue and latest comments through the USF Linear MCP team.
3. Confirm the current branch, `origin/main`, open PRs, and active Linear issues.
4. Create a branch from current `origin/main`.
5. Make only the files authorised by the issue.
6. Run targeted validation during development.
7. Run the full issue-required gate before PR ready state. For USF-226, that gate is `make verify`, the spec validator, bootstrap validator, enterprise validator, parity validator, relevant proofs, and diff checks.
8. Open a draft PR with issue scope, files changed, validation summary, evidence artefacts, and explicit non-claims.
9. Mark the PR ready only after local validation passes.
10. Merge only after checks are acceptable.
11. Sync `main`, rerun post-merge validation, update Linear with PR and merge evidence, check each acceptance criterion, and only then mark Done if every criterion is satisfied.

Validation passing alone is not enough for Linear Done. Done requires merged evidence mapped to every acceptance criterion.

## Dependency, Lockfile, Vulnerability, and Licence Hygiene

Dev-readiness dependency hygiene is bounded to local development:

- `package.json` pins exact dependency versions.
- `pnpm-lock.yaml` is committed and must remain deterministic.
- `pnpm-workspace.yaml` carries the exact `protobufjs` override used to keep Temporal's transitive protobuf dependency on the patched advisory range.
- `corepack pnpm install --frozen-lockfile` is the install gate.
- Provider SDK imports stay inside adapter or proof-authorised boundaries.
- New dependencies require exact version pinning, selection rationale, licence posture, maintenance posture, and security posture evidence.
- Vulnerability and licence findings must be recorded honestly. USF-226 ran `corepack pnpm audit --audit-level low` after updating the Keycloak admin client to the patched exact version and it reported no known vulnerabilities.
- The licence inventory command is `corepack pnpm licenses list --json`. USF-226 recorded the inventory summary in the evidence report, including the remaining transitive `Unknown` metadata row, without making a compliance claim.

## Evidence Pack

The USF-226 evidence pack is `docs/architecture/dev-readiness-validation-and-handover.json`. It records:

- issue and parent tracker references;
- base commit and validation command outcomes;
- fresh clone evidence;
- local and CI validation alignment;
- safe configuration and synthetic data boundaries;
- contribution workflow proof;
- dependency and licence hygiene posture;
- open GitHub PR search;
- open Linear Backlog, Todo, and In Progress search;
- final git status expectation;
- preserved non-claims.

Because a pull request cannot contain the merge commit that will merge it, the report carries a merge-SHA recording boundary. The actual merge SHA must be recorded in the USF-226 post-merge Linear closure comment before the issue can be marked Done.

## Non-Claims

USF-226 may support a bounded dev-readiness handover claim only after its evidence passes. It does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
