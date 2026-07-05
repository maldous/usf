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
| `packages/proof/src/observability-operations-execution-proof.ts` | source-derived-rewrite | React alerting and incident proof expectations rewritten as bounded foundation proof; no React runtime/application code copied | Bounded local execution proof for synthetic alert routing, dashboard runtime model, incident workflow, SLI/SLO calculation, retention purge, cross-tenant aggregate safety, and explicit non-claims for live monitoring, provider readiness, dashboard readiness, incident response readiness, and USF-133 closure. |
| `packages/proof/src/browser-telemetry-faro-proof.ts` | new-with-rationale | USF-225 accepted minimal browser telemetry proof requirement; no React runtime/application code copied | Proof-only transient loopback browser harness that initializes the official Grafana Faro browser SDK through a local static page, drives local Chromium with Playwright Core, captures synthetic browser event/log/error/trace/measurement/session evidence, correlates to a bounded backend/root-cause endpoint, proves redaction, and preserves non-claims for product UI, broad browser E2E, live Faro, live monitoring, environment readiness, full product readiness, and USF-133 closure. |
| `packages/proof/src/sentry-sdk-envelope-proof.ts` | new-with-rationale | USF-205 accepted Sentry SDK envelope proof requirement; no React runtime/application code copied | Proof-only harness for official Sentry Node SDK local envelope capture, redaction, tenant-safe opaque labels, fail-closed unavailable transport, and explicit non-equivalence to Sentry service readiness. |
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
| `docs/architecture/observability-operations-enterprise-proof-depth-matrix.json` | evidence-only-support | USF-159 source issue acceptance and existing enterprise proof-depth matrix pattern | Records bounded local observability operations proof, explicit reclassification of live/deep observability operations, service catalogue traceability, enterprise evidence rows, and non-claims. |
| `docs/architecture/browser-telemetry-faro-foundation-proof.json` | evidence-only-support | USF-225 source issue acceptance and Lane 1 enterprise evidence model | Records bounded local browser telemetry proof scope, SDK/client selection, minimal harness limits, redaction evidence, enterprise evidence refs, deferred UI/live monitoring boundaries, and explicit non-claims. |
| `docs/architecture/browser-telemetry-faro-foundation-proof.md` | evidence-only-support | USF-225 source issue acceptance and architecture note pattern | Concise note documenting the minimal browser telemetry proof boundary, SDK selection, captured evidence, deferred boundaries, and non-claims. |

## Lane 4 Operations Additions

Lane 4 uses historical React observability evidence as lineage only:

- `../react/docs/adr/0062-observability-alerting-and-incident-architecture.md` for the split between built-in alert/incident foundation and deferred composed backends/on-call/status-page providers.
- `../react/docs/evidence/observability/tenant-observability-readiness.md` for tenant-safe query, label guard, dashboard reachability, and no-fake-readiness posture.
- `../react/apps/platform-api/scripts/alerting-runtime-proof.ts` and `../react/apps/platform-api/scripts/incident-foundation-runtime-proof.ts` for alert/incident proof expectations and no secret-bearing-column checks.

Lane 4 does not copy React runtime/application code. USF-159 converts the previous Lane 4 source
issue deferral into a bounded source-issue evidence gate. The USF deliverable is local operations
evidence, validator coverage, planted defects, enterprise evidence rows, and explicit
reclassification of live telemetry backends, alert delivery, dashboard runtime, incident workflow,
SIEM export, retention purge, SLI/SLO operation, and cross-tenant aggregate analytics as unproven
and not claimed.

## Lineage Classification

| React behaviour group | Disposition | USF target |
| -------------------- | ----------- | ---------- |
| Metrics, traces, spans, and correlation propagation | rewrite-from-behaviour | Core telemetry model, in-memory collector, API tenant-context signal emission, observability proof. |
| Structured logging and redaction | rewrite-from-behaviour | Redaction helpers, structured log collector path, tests/proof. |
| Tenant observability readiness and label policy | rewrite-from-behaviour | Tenant-scoped query isolation, allow-listed metric labels, safe API routes. |
| Provider status and readiness observability | covered-and-extended | Provider registry plus telemetry readiness/status view. |
| Alerting, escalation, incident lifecycle, dashboards, SIEM export, live telemetry backends | out-of-scope-with-rationale | USF-159 records bounded local proof plus non-equivalence boundaries. Future live/deep implementation requires separate authority before any readiness claim. |
| React UI/Playwright observability behaviours | foundation-behaviour-rewritten-from-ui-test | API/capability/proof tests; UI/UX assertions remain out of scope. |
| Faro-style browser telemetry capture | proof-only-minimal-harness | USF-225 uses official Grafana Faro browser SDK and Playwright Core in a transient proof-only browser harness; product UI, React application delivery, page/component architecture, visual snapshots, accessibility journeys, broad browser E2E, and live Faro ingestion remain out of scope and non-claimed. |

## Boundary Confirmation

No runtime/application code is copied from `../react`. No USF path mirrors a React path. No OpenTelemetry, Prometheus, Loki, Tempo, Sentry, SIEM, alerting, dashboard, incident-response, external provider, staging, production, SOC, ISO, full dev readiness, full product readiness, enterprise production readiness, or live monitoring readiness is claimed.
