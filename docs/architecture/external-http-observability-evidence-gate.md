# External HTTP Observability Evidence Gate

Issue: USF-270
Parent: USF-267

The machine-readable gate is `docs/architecture/external-http-observability-evidence-gate.json`.

The gate defines external HTTP correlation, trace-context, logging, event, metrics, redaction, and retention boundaries for the public proof routes. The repository can prove safe correlation and trace-context header injection to the public proof route, plus the presence of public proof markers.

External provider or origin access logs are not available from repository access alone. That evidence is therefore explicitly bounded and must be supplied before any staging readiness claim that depends on provider log or origin log collection.

The gate records value-free evidence only. It must not retain raw provider request IDs, raw payloads, tenant data, actor identifiers, tokens, raw endpoints, stack traces, or provider payloads.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or v2-proof tag authorisation.
