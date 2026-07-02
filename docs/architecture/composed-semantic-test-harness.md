# Composed Semantic Test Harness

USF-236 adds the bounded composed semantic test harness for the test-readiness track. It builds on the confirmed dev foundation proof, but it does not reuse the in-memory path or the generated dev Compose target for service-backed test evidence.

The machine-readable authority for this harness is `docs/architecture/composed-semantic-test-harness.json`. The service inventory authority remains `spec/instances/compose-service/service-catalogue.json`, with the USF-235 service contract at `docs/architecture/test-environment-service-contract.json`.

## Proof Boundary

The proof command is `corepack pnpm test-readiness:semantic`.

The command executes the existing API and worker runtime proof path with the explicit test Compose target `compose/compose.test.generated.yaml`. It requires the compose-backed provider mode `local-composed-real-service`, forbids in-memory service substitutes, and checks:

- API health, readiness, and OpenAPI route exposure.
- Tenant mismatch and authorization failure paths fail closed.
- Worker synthetic job execution.
- API and worker audit evidence.
- Composed provider evidence for Postgres, Keycloak, NATS, Temporal, MinIO, OpenBao, and Mailpit.
- Teardown through the proof harness.

USF-237 owns repeated deterministic fixture lifecycle proof. USF-238 owns the final current-state test command surface and CI/local gate. USF-234 remains the final acceptance gate.

## Non-Claims

This harness does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
