# Observability Parity Gap Map

Run: 20260628T233623Z-4a19824.

Gap map count: 18.

Status counts:

- Migrated: 13.
- Covered: 1.
- Partial: 0.
- Missing: 0.
- Deferred: 4.
- Deprecated: 0.
- Requires human decision: 0.

Migrated behaviours include runtime context, structured log redaction, metric governance, traces/spans, health/readiness/liveness, tenant readiness label policy, signal capture, security signals, observability control, safe API routes, Playwright foundation behaviour rewritten as API tests, and proof/OpenAPI output safety.

Covered behaviour: provider status posture is already covered by the provider adapters/modes slice and checked again by observability proof.

Deferred behaviours are carried by USF-159: alert delivery/runtime depth, incident workflow, dashboard runtime, browser telemetry, live/composed observability backend integration, telemetry export, retention purge workflow, SLI/SLO measurement, and cross-tenant aggregate analytics.

No silent gaps remain for the authorised local/dev/test observability slice.
