# Test Readiness Command Surface and CI Gate

USF-238 adds the current-state command surface for the test-readiness track. It
builds on the USF-235 service contract, the USF-236 composed semantic harness,
and the USF-237 deterministic fixture lifecycle proof.

Machine-readable evidence lives in
`docs/architecture/test-readiness-command-surface-and-ci-gate.json`.

## Canonical Commands

| Command | Make target | Purpose |
| ------- | ----------- | ------- |
| `corepack pnpm test-readiness` | `make test-ready` and `make test` | Runs the bounded local test-readiness command gate. |
| `corepack pnpm test-readiness:composed` | `make test-composed` | Runs the composed semantic harness and deterministic fixture lifecycle proof. |
| `corepack pnpm test-readiness:assurance` | `make test-assurance` | Runs the bounded local SonarQube zero-open-issue proof from USF-233. |
| `corepack pnpm test-readiness:validate` | `make test-readiness-validate` | Runs the test-readiness validator and planted-defect selftests. |

The full package command runs the validator, the composed semantic harness, the
deterministic fixture lifecycle proof, and the Sonar assurance proof. It uses the
existing proof commands instead of changing runtime or provider behaviour.

## CI and Local Alignment

The local canonical command is `corepack pnpm test-readiness`, exposed as
`make test-ready`. CI may run the same package command or the Make target. The
current GitHub spec workflow remains narrower and must not be treated as
test-readiness completion by itself.

USF-238 records the command surface and CI/local gate. USF-234 remains the final
acceptance gate and must reconcile merged evidence before any final
test-readiness claim is made.

## Boundaries

- Required service-backed test paths use `compose/compose.test.generated.yaml`.
- In-memory service substitutes are not allowed for service-backed
  test-readiness claims.
- The Sonar gate remains bounded to the USF-233 local synthetic scan scope.
- No real tenant data, real secrets, private local state, live-provider
  credentials, staging data, production data, raw endpoints, tokens, connection
  strings, stack traces, raw SDK errors, or provider payloads are required or
  retained.

## Non-Claims

USF-238 does not claim final test readiness, staging readiness, production
readiness, deployment readiness, live-provider readiness, SOC readiness,
ISO/IEC 27001 certification, enterprise production readiness, product UI
readiness, browser E2E readiness, full React product parity, or USF-234
closure.
