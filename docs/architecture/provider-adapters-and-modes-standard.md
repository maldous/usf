# Provider Adapters And Modes Standard

| | |
| --- | --- |
| Document type | Architecture / provider trust-boundary standard |
| Status | Draft; implemented local/dev/test foundation slice under USF-156 |
| Authority level | Domain standard subordinate to the Charter, Authority Model, ADRs, validators, and runtime proof evidence |
| Scope | Provider adapters, provider modes, readiness posture, provider config/secrets, provider audit, and provider boundary evidence |

This standard is ISO 27001-supporting technical control evidence only. It is not ISO certification, SOC certification, production readiness, live-provider readiness, supplier approval, legal approval, or regulatory certification evidence.

Providers are controlled trust boundaries.

## Controlled Trust Boundaries

A provider is an external, local, in-memory, mock, composed, disabled, unavailable, or deferred service used behind a USF port.

An adapter is the implementation that translates a USF port into provider-specific behaviour.

A provider mode is the declared runtime posture: `in-memory`, `mock`, `local-test`, `composed-test`, `live-external-deferred`, `live-external-authorised`, `disabled`, or `unavailable`.

Provider readiness is a truthful statement about whether a provider is usable for the declared environment and purpose.

Provider risk is the security, privacy, availability, data residency, operational, legal, and supply-chain exposure introduced by using the provider.

Rules:

- Every provider is a trust boundary.
- Every provider has a mode, category, owner capability, data classification, and readiness posture.
- Every provider secret is a `SecretReference`.
- No test, mock, local, or composed provider implies live readiness.
- No provider readiness claim may exceed the evidence observed by proof.

## Inventory And Ownership

Every registered provider records `provider_id`, `provider_name`, `provider_category`, `provider_mode`, `owning_capability`, `owning_team_or_role`, `business_purpose`, `data_classification`, `tenant_scope`, `environment_scope`, `provider_region`, `data_residency_policy`, `subprocessor_status`, `criticality`, `availability_dependency`, `configured_by`, `approved_by`, `last_reviewed_at`, and `review_expires_at`.

Unregistered providers fail validation. Critical providers require stronger review posture. Supplier and subprocessor posture is represented, but does not claim legal approval unless separately authorised.

## Categories

Required categories are `database`, `cache`, `object-storage`, `file-scan`, `identity`, `config`, `secrets`, `audit-ledger`, `event-bus`, `workflow-engine`, `operational-job-engine`, `notification-delivery`, `api-gateway`, `observability`, `search-index`, `full-text-search`, `autocomplete`, and `vector-search`.

Out-of-scope categories are represented as disabled, unavailable, or deferred where needed. Representation is not implementation.

## Lifecycle

Lifecycle states are `proposed`, `approved-for-local-test`, `approved-for-composed-test`, `approved-for-live`, `suspended`, `deprecated`, `retired`, and `revoked`.

Lifecycle is separate from health. A healthy provider may still be unauthorised for live use. A revoked provider fails closed. Lifecycle changes are privileged and audit-recorded where represented.

## Modes

`in-memory` is hermetic and has no external dependency.

`mock` is a deterministic behaviour simulator.

`local-test` is a local developer provider and is not live readiness.

`composed-test` is a local or containerised integration proof provider and is not production readiness.

`live-external-deferred` recognises a provider class without implementation or enablement.

`live-external-authorised` requires explicit issue or ADR authority, risk posture, config, secrets, health, audit, and proof.

`disabled` is intentionally unavailable.

`unavailable` is expected but cannot be used safely.

Mode transitions require authority. Default development mode must not accidentally use live providers. Test fixtures must not look like live credentials.

## Risk Classification

Provider risk is classified as `low`, `medium`, `high`, `critical`, `regulated`, or `security-sensitive`.

Risk drivers include tenant data access, credential access, regulated data handling, availability dependency, external egress, cross-region transfer, identity/authentication function, audit/evidence function, file/object handling, notification delivery, and workflow/job execution.

Higher-risk providers require stronger config, audit, monitoring, review, and failure posture. Security-sensitive provider failures are redacted.

## Data Residency And Egress

Providers that can receive or process data define provider region, allowed regions, egress allowed, egress destination allowlist, cross-region policy, cross-border transfer policy, and data residency status.

Unknown region fails closed for regulated or restricted data. External egress must be explicit. Live-capable providers must not accept arbitrary endpoints.

## Secrets And Credentials

Provider credential posture records credential reference, secret reference, secret classification, rotation policy, last rotation, next rotation, revocation, credential scope, and least-privilege policy.

Raw credentials are never stored in provider config. Credentials are `SecretReference` objects only. Revoked credentials fail closed. Credential use is auditable without revealing secret values.

## Transport Security

External providers require TLS and certificate validation. `insecure_skip_verify` is forbidden outside explicit local-test or composed-test posture. Minimum TLS, mTLS, CA bundle, and certificate pinning posture are represented where applicable; live transport readiness is deferred unless separately authorised.

## Health Versus Readiness

Health asks whether an adapter or provider can respond. Readiness asks whether it is safe and authorised to use for the environment and purpose. Liveness asks whether the local adapter or process is alive. Capability status asks whether the owning capability can safely use the provider.

Statuses are `healthy`, `degraded`, `unavailable`, `disabled`, `not-configured`, `deferred`, `unauthorised`, and `unknown`.

Healthy does not mean live-authorised. Unknown fails closed. Deferred is truthful, not failed. Health/readiness status must not leak provider internals.

## Resilience, Failover, And Drift

Provider calls define connect timeout, request timeout, bounded retry policy, circuit breaker posture, fallback policy, degraded-mode policy, and bulkhead posture.

Critical-provider failover posture defines primary provider reference, secondary provider reference, failover policy, failback policy, data consistency, reconciliation, RPO, and RTO where represented. No disaster-recovery or failover readiness is claimed without proof.

Provider drift posture records expected config hash, observed config hash, last drift check, drift status, reason code, and expiring approved exception reference. Security-sensitive drift fails closed or degrades safely where represented.

## Least Privilege

Provider grants record provider action, provider permission, credential scope, allowed resource scope, and tenant scope. Read, write, delete, admin, send, and execute permissions are distinct where represented. Dangerous provider permissions require stronger review.

## Audit And Chain Of Custody

Provider audit events include `provider.registered`, `provider.configured`, `provider.enabled`, `provider.disabled`, `provider.suspended`, `provider.revoked`, `provider.mode.changed`, `provider.health.checked`, `provider.readiness.checked`, `provider.call.started`, `provider.call.succeeded`, `provider.call.failed`, `provider.secret_ref.used`, `provider.drift.detected`, `provider.failover.started`, `provider.failover.completed`, `provider.circuit.opened`, and `provider.circuit.closed`.

Provider audit is value-free. It does not include raw request or response bodies, credentials, tokens, connection strings, private endpoints, stack traces, or provider internals. Failure evidence uses safe reason codes.

## Incident And Supplier Posture

Provider incident posture records incident reference, incident status, last incident time, security contact reference, escalation policy reference, and customer-impact policy. These hooks do not claim live alerting unless implemented.

Future-live providers represent supplier name reference, subprocessor status, data processing role, contract status, security review status, privacy review status, last review, and review expiry. This is posture metadata, not supplier approval.

## Capability Boundary

Capabilities depend on USF ports. Adapters may depend on provider-specific implementations only inside adapter packages. Core packages do not import provider SDKs. API routes do not call provider SDKs directly. Tests may import provider fakes or mocks only from approved test adapters.

## API Status Surface

Provider status routes are operator-only or system-internal by default, PDP-protected, redacted, non-enumerating, OpenAPI-covered, and safe for a future operations UI. Implemented local/dev/test routes are `GET /v1/providers` and `GET /v1/providers/{id}`. They expose redacted status views only and do not expose secret names, raw endpoints, credentials, raw failure payloads, stack traces, provider internals, live readiness, or production readiness.

## Deferred Depth

Deferred provider depth includes live-external-authorised providers, supplier/subprocessor approval workflow, real egress allowlist enforcement, runtime circuit breakers, runtime drift checks, provider incident response integration, failover and disaster-recovery execution, cache/search runtime providers, gateway/edge provider posture, and full composed-provider readiness aggregation.
