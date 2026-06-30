# Parity Observability/Telemetry Source-Use Disposition Matrix

This matrix records source-use disposition for the USF-133 observability/telemetry parity slice. It uses `../react` only as historical semantic lineage and proof/test behaviour evidence. It does not copy React runtime/application code, does not mirror React paths, and does not claim live monitoring, SIEM, alerting, SOC, ISO, or production readiness.

Linear child issue: USF-158.

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `docs/architecture/observability-telemetry-and-operational-evidence-standard.md` | source-derived-rewrite | React observability ADRs, proof scripts, tenant readiness evidence, log/metric/trace tests, and USF enterprise observability controls | Defines observability as a controlled local/dev/test evidence surface with signal categories, classifications, redaction, tenant safety, access control, provider modes, and deferred live depth. |
| `docs/architecture/parity-observability-telemetry-source-use-disposition-matrix.md` | evidence-only-support | USF source-use policy | Domain-specific source-use disposition matrix for the observability/telemetry slice. |
| `packages/core/src/index.ts` | source-derived-rewrite | React observability semantics, redaction, request context, metrics cardinality, and proof lineage | Adds telemetry categories, signal classifications, metric types, context fields, redaction helpers, validation errors, safe telemetry values, and observability audit event taxonomy. |
| `packages/ports/src/index.ts` | source-derived-rewrite | React port/adapter boundary and ADR 0020 lineage | Adds TelemetryPort methods while preserving the existing ObservabilitySink compatibility path. |
| `adapters/obs/src/index.ts` | source-derived-rewrite | React in-memory observability repository and local proof lineage | Implements the bounded in-memory telemetry collector with safe metrics, spans, structured logs, operational/security signals, health/readiness/liveness, tenant query isolation, and redacted status view. |
| `capabilities/tenant/src/authorization-policy.ts` | source-derived-rewrite | React operator/admin observability guard lineage and USF PDP authority | Adds explicit observability read/export/configure/alert permissions for PDP-protected surfaces. |
| `apps/api/src/server.ts` | source-derived-rewrite | React route instrumentation, tenant readiness, correlation header, and observability route lineage | Emits safe tenant-context metric/span signals and exposes operator-only redacted observability readiness/signals surfaces. |
| `packages/contracts/src/index.ts` | source-derived-rewrite | React OpenAPI/schema and safe telemetry surface lineage | Adds redacted observability collector status, signal view, readiness, and signals response schemas. |
| `packages/contracts/src/api-surface.ts` | source-derived-rewrite | React API/contract/observability readiness route lineage | Adds observability route metadata covering classification, capability mapping, tenant/PDP posture, pagination, audit, examples, and no-live-readiness boundary. |
| `packages/openapi/src/index.ts` | source-derived-rewrite | React OpenAPI drift gate and route metadata lineage | Registers observability schemas and query fields in the generated OpenAPI surface. |
| `packages/openapi/openapi.json` | evidence-only-support | Generated OpenAPI contract output from USF metadata | Committed local/dev/test OpenAPI contract with observability surfaces and no live monitoring claim. |
| `packages/proof/src/observability-telemetry-proof.ts` | source-derived-rewrite | React observability runtime proofs rewritten as foundation proof | Hermetic proof for redaction, tenant isolation, metric labels, context propagation, health/readiness/liveness, provider mode posture, and no live monitoring claims. |
| `packages/proof/src/index.ts` | new-with-rationale | Proof package target | Exports the observability proof command. |
| `tests/capabilities/observability-telemetry.test.ts` | source-derived-rewrite | React observability unit/substrate/e2e behaviours rewritten as foundation tests | Tests metric label governance, redaction, tenant query isolation, health/readiness separation, provider mode posture, and security signals. |
| `tests/apps/api-contracts.test.ts` | source-derived-rewrite | React request instrumentation and tenant observability route behaviours rewritten as API tests | Tests PDP-protected observability API surfaces, redaction, tenant safety, and correlation/request/trace propagation. |
| `tests/packages/proof.test.ts` | evidence-only-support | Proof package test pattern | Runs observability proof in-process. |
| `tools/validate-parity/validate-observability.py` | source-derived-rewrite | Existing parity validator pattern and observability validator expectations | Static parity validator for observability/telemetry invariants. |
| `tools/validate-parity/observability-planted-defects/*.json` | evidence-only-support | Validator planted-defect pattern | Planted defects proving high-risk observability validator rules fire. |
| `package.json` | new-with-rationale | Proof and parity command wiring | Adds proof:observability, validate-observability, and verify wiring. |
| `Makefile` | new-with-rationale | Proof target pattern | Adds make observability-proof. |
| `spec/instances/observability-signal/observability-operations-posture.json` | source-derived-metadata | React ADR-0062, tenant observability readiness evidence, alerting and incident runtime proof lineage | Records Lane 4 logging, tracing, metrics, correlation, alerting, dashboard, incident, and redaction posture using the existing observability-signal schema without claiming live operations readiness. |
| `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` | lane-owned-append | Lane 1 enterprise evidence model plus USF-188/USF-179/USF-159 requirements | Appends `usf-188` enterprise evidence rows for SoA support, evidence register, threat/abuse posture, access posture, resilience/retention posture, incident/vulnerability posture, privacy posture, risk treatment, deferral boundaries, and non-claims. |
| `tools/validate-enterprise/validate-enterprise.py` | lane-scoped-validator-extension | Lane 1 enterprise validator pattern | Adds Lane 4 enterprise evidence checks for effectiveness state, deferred owner/risk/treatment metadata, redaction/leakage posture, and alert/dashboard/incident boundaries. |

## Lane 4 Operations Additions

Lane 4 uses historical React observability evidence as lineage only:

- `../react/docs/adr/0062-observability-alerting-and-incident-architecture.md` for the split between built-in alert/incident foundation and deferred composed backends/on-call/status-page providers.
- `../react/docs/evidence/observability/tenant-observability-readiness.md` for tenant-safe query, label guard, dashboard reachability, and no-fake-readiness posture.
- `../react/apps/platform-api/scripts/alerting-runtime-proof.ts` and `../react/apps/platform-api/scripts/incident-foundation-runtime-proof.ts` for alert/incident proof expectations and no secret-bearing-column checks.

Lane 4 does not copy React runtime/application code. The USF deliverable is metadata, evidence
organisation, validator coverage, planted defects, and explicit deferral of alert delivery,
dashboard runtime, and incident workflow readiness.

## Lineage Classification

| React behaviour group | Disposition | USF target |
| -------------------- | ----------- | ---------- |
| Metrics, traces, spans, and correlation propagation | rewrite-from-behaviour | Core telemetry model, in-memory collector, API tenant-context signal emission, observability proof. |
| Structured logging and redaction | rewrite-from-behaviour | Redaction helpers, structured log collector path, tests/proof. |
| Tenant observability readiness and label policy | rewrite-from-behaviour | Tenant-scoped query isolation, allow-listed metric labels, safe API routes. |
| Provider status and readiness observability | covered-and-extended | Provider registry plus telemetry readiness/status view. |
| Alerting, escalation, incident lifecycle, dashboards, SIEM export, live telemetry backends | deferred | Standard posture and USF-158 notes; future blocker required before live/deep implementation. |
| React UI/Playwright observability behaviours | foundation-behaviour-rewritten-from-ui-test | API/capability/proof tests; UI/UX assertions remain out of scope. |

## Boundary Confirmation

No runtime/application code is copied from `../react`. No USF path mirrors a React path. No OpenTelemetry, Prometheus, Loki, Tempo, Sentry, SIEM, alerting, dashboard, external provider, production, SOC, ISO, or live monitoring readiness is claimed.
