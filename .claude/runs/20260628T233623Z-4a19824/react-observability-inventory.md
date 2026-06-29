# React Observability Inventory

Run: 20260628T233623Z-4a19824.

Inventory count: 18.

React lineage was inspected under docs, apps, tests, e2e, tools, compose, package scripts, and evidence. The historical React surface covers observability primitives, structured logs, metrics, traces/spans, tenant readiness, signal registry, security signals, alerting, incidents, dashboards, provider status, browser telemetry, composed/live backend posture, observability control, API routes, Playwright correlation behaviour, and proof-output safety.

Key source evidence:

- ADR 0020 defines observability diagnostics and runtime introspection primitives.
- ADR 0062 defines observability alerting and incident architecture.
- Tenant observability readiness evidence defines tenant-safe label/query posture.
- Platform API usecases and tests cover observability, tenant observability, logs, alerting, Prometheus metrics, and provider observability.
- Proof scripts cover observability signals, metrics/traces closure, readiness routes, tenant observability, Prometheus metrics, browser telemetry, alerting, incidents, dashboards, and provider observability.
- UI and Playwright behaviours are classified as lineage only or rewritten as API/capability/proof tests; no Playwright is added.

Disposition summary:

- Must migrate: 13.
- Covered: 2.
- Deferred: 3.
- Deprecated: 0.
- Requires human decision: 0.

Deferred depth is tracked in USF-159: live observability provider integrations, SIEM/export, alert delivery, incident workflow, dashboard runtime, retention purge workflow, SLI/SLO operational measurement, cross-tenant aggregate analytics, and telemetry export provider governance.
