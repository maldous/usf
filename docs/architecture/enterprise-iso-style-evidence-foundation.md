# Enterprise Readiness and ISO-Style Evidence Foundation

Issue: USF-272

The machine-readable foundation is `docs/architecture/enterprise-iso-style-evidence-foundation.json`.

This foundation creates ISO/IEC 27001-style control-support organisation for future enterprise readiness work. It is not ISO/IEC 27001 certification, SOC readiness, production readiness, staging readiness, deployment readiness, live-provider readiness, enterprise production readiness, product UI readiness, browser E2E readiness, or full React parity.

The track does not block Staging-specific enablement by default. A later explicit risk decision may make one or more domains block a future promotion or enterprise readiness assessment.

## Domains

- USF-273 ISMS scope, context, interested parties, risk register, and control ownership: Define ISMS-style scope, context, interested parties, assets, owners, risk treatment, review cadence, and residual risk boundaries. Blocking posture: does not block Staging-specific enablement by default; may block enterprise readiness assessment.
- USF-274 Statement of Applicability-style control evidence matrix: Map controls to purpose, risk treated, assets, owners, evidence source, validation expectation, status, deferral, and non-claims. Blocking posture: does not block Staging-specific enablement by default; may block enterprise readiness assessment.
- USF-275 Enterprise IAM, SSO, MFA, privileged access, and break-glass: Inventory IAM, SSO, MFA, privileged roles, access reviews, deprovisioning, break-glass, and audit expectations. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-276 Secrets, cryptography, certificates, and key lifecycle: Record secrets boundary, certificate ownership, key lifecycle, rotation, revocation, expiry, emergency handling, and no-real-secret evidence policy. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-277 Audit logging, evidence retention, and tamper-evident trail: Record audit event classes, tenant-safe fields, redaction, retention, export, integrity or tamper-evidence posture, and evidence owner. Blocking posture: does not block Staging-specific enablement by default; may block enterprise readiness assessment.
- USF-278 Incident response and security operations: Record detection hooks, alerting posture, escalation, response workflow, corrective action, post-incident evidence, vulnerability intake, and review cadence. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-279 Backup, restore, disaster recovery, and business continuity: Record data-bearing services, backup posture, restore proof expectations, RPO/RTO targets or non-claims, corruption scenarios, cleanup proof, DR, and continuity owner. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-280 Change, release, and deployment governance: Record change control, review evidence, approvals, rollback, deployment boundary, environment promotion boundary, artifact evidence, and approver expectations. Blocking posture: does not block Staging-specific enablement by default; may block production readiness by later gate.
- USF-281 Supply chain, SBOM, provenance, dependency, and vulnerability management: Record dependency and license expectations, SBOM posture, provenance/signing posture, advisory review, patch SLA, exception governance, and update owner. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-282 Privacy, data protection, retention, deletion, and export workflows: Record data classification, PII posture, minimisation, retention, purge, deletion, export, legal hold, residency, cross-border boundary, and owner. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-283 Supplier, cloud, Netlify, Cloudflare, GitHub, Linear, and third-party risk: Record supplier inventory, purpose, data boundary, access boundary, risk owner, contractual boundary, review cadence, provider-as-evidence-only posture, and exceptions. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-284 Tenant isolation and customer data boundary: Record tenant boundary, access and authorization controls, data separation, proof expectations, cross-tenant denial, support access boundary, and customer data constraints. Blocking posture: does not block Staging-specific enablement by default; may block production and enterprise readiness until complete.
- USF-285 Resilience, capacity, rate limiting, abuse controls, and SLOs: Record capacity assumptions, rate limits, abuse cases, throttling, fail-closed behaviour, SLO or explicit non-claim, degradation posture, and owner. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-286 Observability, alerting, dashboards, and runbooks: Record metrics, logs, traces, correlation, alerting, dashboard ownership, runbooks, escalation, retention, redaction, and provider/origin evidence boundary. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-287 Data lifecycle, migrations, integrity, and rollback safety: Record schema/data migrations, integrity checks, import/export, rollback boundaries, cleanup, recovery, data retention, and owner evidence. Blocking posture: does not block Staging-specific enablement by default; may block production or enterprise readiness by later risk decision.
- USF-288 Policy pack and governance evidence: Record policy inventory, ownership, approval cadence, review cadence, exceptions, waivers, acknowledgement boundary, evidence retention, and continual improvement handover. Blocking posture: does not block Staging-specific enablement by default; may block enterprise readiness assessment.

## Evidence Boundary

Each domain has an owner, risk owner, control owner, evidence owner, review cadence, evidence source, validation expectation, risk treatment, deferred boundary, and non-claims in the JSON file. The current status is foundation-defined; operating evidence and production-grade proof remain future work unless separately merged and validated.

## Validation

- python3 tools/validate-enterprise/validate-enterprise.py all --json
- python3 tools/validate-enterprise/validate-enterprise.py selftest --json

## Non-Claims

No ISO certification, SOC readiness, Staging readiness, Production readiness, deployment readiness, live-provider readiness, enterprise production readiness, product UI readiness, browser E2E readiness, or full React parity is claimed.
