# Adversarial Dev Runtime Review

USF-39 continuation branch: issue-39-bootstrap-20260627T235923Z-f80da39

## Does make dev actually run, or only make verify?

Answer: make dev actually runs.

Evidence: controlled probe ran HOST=127.0.0.1 PORT=31317 make dev, observed startup output, and successfully probed healthz, readyz, openapi.json, a valid tenant-context request, and a mismatched tenant request.

## Does dev use in-memory providers only?

Answer: yes for the dev entrypoint.

Evidence: make dev delegates to the API dev script only. The API runtime is assembled by apps/api/src/runtime.ts with in-memory identity, config, audit, event bus, workflow, object store, mail, secrets, and captured-local observability providers. No Docker Compose command is invoked by make dev.

## Does test Compose stay separate from dev?

Answer: yes.

Evidence: make dev uses corepack pnpm dev. Compose remains behind make test-compose, compose:config, compose:smoke, and make verify.

## Are apps/api and any required runtime entrypoints real?

Answer: yes.

Evidence: apps/api/src/main.ts starts Fastify and prints API, health, OpenAPI, and provider-mode information. apps/work/src/main.ts is exposed separately by make dev.work.

## Are packages actually imported and used?

Answer: yes.

Evidence: apps/api imports contracts, core, openapi, ports through capabilities, capability modules, and in-memory adapters. packages/proof runs the dev smoke helper. packages/openapi checks the committed OpenAPI document. packages/test still supplies test helpers.

## Is tenant mismatch fail-closed tested?

Answer: yes.

Evidence: make dev-smoke expects a mismatched tenant request to return 400. The Vitest API test also checks the mismatch path.

## Are audit events captured?

Answer: yes.

Evidence: the tenant-context route appends a tenant.context.read audit record, and make dev-smoke asserts auditEvents is at least 1 for a valid request.

## Is OpenAPI served and checked?

Answer: yes.

Evidence: make dev serves openapi.json from the committed OpenAPI package. openapi:check compares the committed document with the generated contract, and make dev-smoke fetches openapi.json and checks the tenant route is present.

## Is any React code copied or path mirrored?

Answer: no.

Evidence: React was inspected for command and endpoint lineage only. The implementation is freshly authored in USF paths and does not mirror historical React runtime paths.

## Are there empty-placeholder files pretending to be implementation?

Answer: no for the local dev runtime contract.

Evidence: API, runtime assembly, in-memory providers, tenant enforcement, audit capture, dev smoke, and OpenAPI checks execute. Some capability surfaces remain intentionally minimal, but they are either wired through the dev runtime or outside the required local dev contract.

## Would a fresh developer know how to run dev?

Answer: yes.

Evidence: the required command sequence is pnpm install --frozen-lockfile followed by make dev. make dev prints the API URL, health URL, OpenAPI URL, and provider mode.

## Review outcome

No blocking bad answer remains. No bootstrap-followup issue is required from this review.
