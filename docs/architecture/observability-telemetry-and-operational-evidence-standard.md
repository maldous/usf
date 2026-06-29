# Observability, Telemetry, and Operational Evidence Standard

Status: authoritative domain standard for the USF-133 observability/telemetry parity slice.

This standard defines observability as a controlled operational evidence surface for local/dev/test proof. It supports technical control evidence, tenant isolation, privacy, security detection posture, operational resilience, and future ops/API readiness. It is not an ISO certification, SOC readiness, SIEM readiness, production monitoring readiness, live alerting readiness, incident-response certification, or live observability provider claim.

## Controlled Evidence Surface

Telemetry is a technical signal emitted by systems. A metric is a numeric measurement over time. A trace is a request or workflow execution path. A span is one timed operation within a trace. A structured log is a safe machine-readable operational record. A security signal is a structured indicator of suspicious, denied, failed, degraded, or policy-relevant behaviour. An audit event is authoritative governance evidence. Observability evidence may support debugging, reliability, incident response, or security analysis, but it does not replace audit evidence.

Rules:

- Telemetry is not audit.
- Audit is not telemetry.
- Security signals are not raw logs.
- Logs are not a dumping ground for payloads.
- No telemetry contains secrets, tokens, cookies, credentials, raw object keys, raw recipient addresses, private keys, connection strings, stack traces, or raw provider payloads.
- No observability route exposes raw logs or unrestricted telemetry.

## Signal Classification

Every signal has one classification: `operational`, `security`, `privacy-sensitive`, `tenant-sensitive`, `audit-linked`, `provider-status`, `performance`, `availability`, `debug`, or `test`.

Every signal has one category: `metric`, `trace`, `span`, `structured-log`, `operational-event`, `health-signal`, `readiness-signal`, `liveness-signal`, `security-signal`, `audit-linked-signal`, or `provider-status-signal`.

Unknown categories or classifications fail validation. Security and audit-linked signals require stronger retention and access posture. Debug signals are not a live default. Privacy-sensitive and tenant-sensitive signals require minimisation, redaction, tenant-safe labels, and controlled access.

## Observability Data Classification

Every emitted signal records signal_id, signal_name, signal_category, data_classification, tenant_scope, actor_scope, provider_scope, retention_policy, redaction_policy, access_policy, and environment_scope before persistence or exposure. Telemetry retention is explicit. Telemetry access is controlled. Telemetry export is a provider/data-egress action and is disabled unless separately authorised.

## Tenant-Safe Telemetry

Tenant IDs may be recorded only in safe canonical form. Tenant names, user emails, recipient addresses, raw object keys, and raw provider identifiers are not labels. Tenant-sensitive counts must not leak across tenant boundaries. Tenant A cannot query tenant B telemetry. Cross-tenant summaries must aggregate safely. Telemetry context cannot override PDP or RLS and cannot be used to infer another tenant resource.

## Cardinality Governance

Metric labels are allow-listed. User emails, recipient addresses, object keys, raw provider responses, stack traces, and raw IDs with unbounded cardinality are forbidden unless explicitly approved by a future authority. Metric names are stable and bounded. High-cardinality labels fail closed in the local collector.

## Redaction And Sensitive Value Blocking

Blocked values include `password`, `secret`, `token`, `api_key`, `authorization`, `cookie`, `private_key`, `connection_string`, `credential`, `jwt`, `bearer`, `object_key`, `recipient_address`, `raw_email`, `raw_phone`, `provider_response`, and `stack_trace`.

Redaction happens before signal persistence, proof output, API exposure, and test output. Redaction failure fails closed. Telemetry proofs include leak scans.

## Trace Context Propagation

Context fields include correlation_id, causation_id, request_id, trace_id, span_id, parent_span_id, tenant_id, actor_id, service_actor_id, route_id, operation_id, capability, provider_id, job_id, workflow_id, notification_id, file_id, and audit_event_id.

Context is propagated across API, capability, job, provider, notification, file, auth, and audit flows where represented. Trace context cannot create tenant context, authorize an operation, or cross tenant boundaries without explicit cross-tenant orchestration semantics. Missing request and correlation identifiers are generated safely.

## Metrics Governance

Metric metadata includes metric_name, metric_type, unit, description, owner, allowed_labels, cardinality_policy, retention_policy, and slo_related. Metric types are `counter`, `gauge`, `histogram`, and `summary`. Metric groups include api, auth, pdp, audit, files, jobs, notifications, providers, config, database, and system.

Metrics do not include raw payloads and do not imply live monitoring readiness.

## SLI, SLO, And Error Budget Posture

USF may represent SLI and SLO posture using sli_id, sli_name, sli_formula, slo_target, measurement_window, burn_rate_policy, error_budget_policy, and owner. Candidate SLIs include API availability, API latency, job success rate, notification delivery success, provider availability, auth success/denial rate, audit write success, and file upload success. SLOs are posture unless operationally measured. No production SLO claim exists without live measurement and ownership.

## Structured Logging

Structured logs use timestamp, severity, event_name, safe_message, reason_code, tenant_id, actor_id, service_actor_id, capability, route_id, operation_id, provider_id, job_id, workflow_id, correlation_id, request_id, trace_id, and span_id. Logs use message templates. Logs do not include raw payloads, raw errors, stack traces, secrets, tokens, cookies, credentials, object keys, recipient addresses, private keys, connection strings, or provider raw responses.

## Security Monitoring And Detection Posture

Security signal hooks include authorization.denied, tenant.context.mismatch, token.validation.failed, session.revoked.used, break_glass.used, provider.unavailable, provider.mode.violation, job.dead_lettered, notification.delivery.failed, file.quarantined, config.drift.detected, audit.chain.verification.failed, api.idempotency.conflict, and rate_limit.exceeded.

Security signals are structured, tenant-safe, and linked to audit where applicable. Live SIEM and alerting integration is deferred unless separately authorised.

## Alerting And Escalation Posture

Alert posture may record alert_id, signal_name, severity, threshold, window, dedupe_policy, suppression_policy, escalation_policy, runbook_ref, and owner. Alerts require a safe signal source, an owner, and redacted payloads. Live alert delivery is deferred unless separately authorised.

## Incident Response Evidence

Incident linkage may record incident_ref, detected_at, detected_by_signal, affected_tenant_scope, severity, evidence_refs, timeline_refs, containment_action_refs, and post_incident_review_ref. Observability supports incident timelines; audit remains authoritative governance evidence. No incident-response readiness claim exists without live process and ownership.

## Health, Readiness, And Liveness

Liveness means the local process is alive. Health means a component can answer locally for its mode. Readiness means the component is safe to serve its declared environment and purpose. Capability readiness means an owning capability can safely perform its operation using configured providers.

Liveness does not imply readiness. Health does not imply live readiness. Deferred providers report deferred. Disabled providers report disabled. Unavailable providers fail closed. Readiness output is redacted.

## Observability Provider Modes

Observability uses the provider modes from the provider standard: `in-memory`, `local-test`, `mock`, `composed-test`, `live-external-deferred`, `live-external-authorised`, `disabled`, and `unavailable`.

In-memory telemetry does not imply live monitoring. Composed-test telemetry does not imply production readiness. Live observability provider mode requires explicit authority. Telemetry export is disabled unless authorised. Provider credentials are SecretReferences only.

## Telemetry Retention And Disposal

Retention fields include retention_policy, default_retention_days, security_signal_retention_days, debug_signal_retention_days, disposal_policy, legal_hold, and purge_allowed_at. Retention is classification-aware. Debug telemetry has short retention. Security and audit-linked signals may have longer retention. Legal hold blocks purge where represented. Telemetry purge is privileged and audited where represented.

## Observability Access Control

Privileged actions are `observability.signal.read`, `observability.metric.read`, `observability.trace.read`, `observability.log.read`, `observability.health.read`, `observability.readiness.read`, `observability.security_signal.read`, `observability.export`, `observability.configure`, and `observability.alert.configure`.

Telemetry access is PDP-protected where not public health. Security signals require stronger permission. Trace and log access is privileged. Telemetry export is privileged and audited. Tenant-scoped access cannot cross tenants.

## Observability API And Ops Surfaces

Implemented local/dev/test routes are `GET /v1/observability/readiness` and `GET /v1/observability/signals`. These routes are operator-only, PDP-protected, tenant-guarded, redacted, non-enumerating, OpenAPI-covered, and safe for a future ops UI.

Raw logs, raw spans, raw metrics export, dashboards, alert delivery, and unrestricted telemetry routes are deferred. Public health remains minimal through the existing health/readiness surfaces.

## Observability And Audit Linkage

Audit events may reference telemetry IDs. Telemetry may reference audit IDs. Telemetry must not duplicate audit payloads. Audit chain verification failures emit security-signal posture where represented. Audit access may emit observability signals but does not replace audit-of-audit.

## Dashboard Posture

Dashboard posture may record dashboard_id, dashboard_name, signal_sources, owner, access_policy, tenant_scope, classification, and runbook_refs. Dashboards are future ops UI unless authorised. Dashboard definitions must not expose secrets and must respect tenant scope. Live dashboard readiness is not claimed.

## Deferred Depth

Deferred observability depth includes live OpenTelemetry/Prometheus/Loki/Tempo/Sentry provider integrations, SIEM export, alert delivery, incident management process, dashboard runtime, retention purge workflow, SLO/error-budget measurement, rate-limit telemetry, cross-tenant aggregate analytics, and external provider readiness. These require a separate directive and must not be inferred from this local/dev/test proof.
