# Deterministic Test Fixture Lifecycle

This note records the USF-237 fixture lifecycle proof for the test-readiness track.
It builds on the USF-235 service contract and the USF-236 composed semantic
harness. It does not claim final test readiness.

## Command

Run the lifecycle proof with:

`corepack pnpm test-readiness:fixtures`

The proof executes the composed semantic harness twice in sequence against
`compose/compose.test.generated.yaml`. Each run must report
`local-composed-real-service`, reject in-memory service substitution, capture API
and worker audit evidence, and complete Compose teardown. The proof then compares
stable semantic fingerprints across the two runs.

## Fixture Lifecycle

- Seed: synthetic tenant, actor, job, provider, object, secret, and notification
  fixtures only.
- Reset: each run starts after the prior run has completed Compose down with
  volume removal.
- Cleanup: proof-owned runtime state, containers, networks, volumes, temporary
  files, and local credentials are removed between runs.
- Teardown: the proof checks the Compose project after every run and fails if
  containers remain.
- Determinism: stable semantic fingerprints must match across the two runs.
- Diagnostics: failures identify whether seed, reset, cleanup, teardown,
  provider mode, Compose target, audit evidence, or fingerprint checks failed.

## Boundaries

USF-237 proves repeatable fixture lifecycle for the bounded composed semantic
harness only. USF-238 still owns the final current-state command surface and
CI/local gate. USF-234 still owns final test-readiness acceptance.

No real tenant data, real user data, real secrets, private local state, live
provider credentials, raw endpoints, tokens, connection strings, stack traces,
raw SDK errors, provider payloads, or production data are used or retained.

Non-claims preserved: final test readiness, staging readiness, production
readiness, deployment readiness, live-provider readiness, SOC readiness, ISO
certification, enterprise production readiness, product UI readiness, browser
E2E readiness, and full React product parity.
