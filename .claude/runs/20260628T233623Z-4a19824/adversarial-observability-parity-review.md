# Adversarial Observability Parity Review

Run: 20260628T233623Z-4a19824.

Did we inventory all React observability behaviour?

Yes for the authorised foundation slice. The inventory covers React ADRs, evidence, API usecases, ports/adapters, tests, proof scripts, compose posture, UI/admin routes, and Playwright correlation lineage.

Did we migrate all authorised observability behaviours?

Yes for local/dev/test telemetry semantics: metrics, spans, structured logs, operational/security signals, health/readiness/liveness, context propagation, tenant-safe query, redaction, provider-mode posture, API surfaces, proof, and validator.

Did any React observability test/proof disappear silently?

No. UI/Playwright foundation behaviours are classified and rewritten as API/capability/proof tests. Live/backend proofs are deferred to USF-159.

Is every observability gap classified?

Yes. Migrated, covered, and deferred rows are in the gap map and parity matrix. Deferred depth is tracked by USF-159.

Are telemetry and audit kept distinct?

Yes. Telemetry is modelled separately from audit. Observability access is audit-recorded value-free, but telemetry does not replace audit evidence.

Are metrics labels safe?

Yes. Metric labels are allow-listed and tests/proof reject unknown, high-cardinality, and secret-looking labels.

Are high-cardinality labels blocked?

Yes. High-cardinality and unknown label names fail closed.

Are traces/spans safe?

Yes. Span attributes are redacted before persistence and proof output scans for tokens, credentials, object keys, raw recipient addresses, provider responses, and stack traces.

Are logs structured and redacted?

Yes. Structured log input requires a message template and redacts sensitive keys and values before persistence.

Is context propagation proven?

Yes. Tenant-context API emits metric/span signals with propagated request, correlation, and trace IDs; the API test and controlled make dev probe verify this.

Is tenant leakage prevented?

Yes. Collector query is tenant-scoped, tests prove tenant A cannot query tenant B telemetry, and API routes require tenant context and PDP permission.

Are health, readiness, and liveness distinct?

Yes. Collector status and signals distinguish these states; provider-mode proof verifies deferred/disabled providers do not imply readiness.

Are provider modes respected?

Yes. In-memory collector and composed-test/deferred provider registry entries do not claim live monitoring readiness.

Are security/operational signals safe?

Yes. Security signals are structured and redacted; representative authorization denied and tenant mismatch posture is implemented.

Is source-use honest?

Yes. Source-use and parity matrices state rewrite-from-behaviour or lineage-only dispositions and no React copy/path mirroring.

Does make parity pass?

Yes.

Does make verify pass?

Yes.

Any live monitoring/SIEM/alerting/provider readiness overclaim?

No. The proof, OpenAPI, standard, and validator all assert no live monitoring, SIEM, alerting, SOC, ISO, provider, or production readiness claim.

Blocking findings:

None.
