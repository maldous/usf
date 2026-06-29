# Rate Limits, Quotas, and Abuse Controls Standard

Status: draft  
Authority: USF-133 / USF-160 bounded parity implementation standard  
Scope: local/dev/test guardrail semantics and proof only

This standard defines rate limiting, quota, throttling, admission control, abuse control, tenant fairness, backpressure, and operational guardrail posture for USF. It is ISO 27001-supporting technical control evidence only. It does not claim ISO certification, SOC readiness, WAF readiness, bot-protection readiness, production abuse-prevention readiness, live gateway readiness, or live edge enforcement readiness.

## Guardrails As Security And Availability Controls

A rate limit is a maximum number of actions within a time window.

A quota is a bounded allocation of resource consumption over a longer accounting period.

A throttle is a deliberate slowdown or delay before allowing work.

Admission control is a decision to allow, delay, reject, or degrade work before execution.

Abuse control detects or blocks suspicious, excessive, unsafe, automated, or policy-violating behaviour.

Fairness control prevents one tenant, actor, provider, job class, route, or resource from starving others.

Backpressure is a controlled refusal or delay when the system cannot safely accept more work.

Authorization success does not bypass guardrails. Guardrail success does not grant authorization. Rate-limit denial is not authorization denial.

## Guardrail Classification

Every guardrail policy is classified as exactly one of:

- availability-protection
- abuse-prevention
- tenant-fairness
- cost-control
- provider-protection
- security-protection
- data-exfiltration-protection
- bulk-operation-protection
- operational-safety
- test-only

Unknown classification fails validation. Security-protection guardrails require stronger audit and telemetry posture. Provider-protection guardrails respect provider mode. Cost-control guardrails must not weaken mandatory audit or security notifications. Test-only guardrails never claim production enforcement.

## Policy Types

Canonical policy types are:

- rate-limit
- quota
- throttle
- admission-control
- concurrency-limit
- burst-limit
- backpressure
- abuse-detection
- suppression
- circuit-breaker

Unknown policy type fails closed.

## Policy Scopes

Canonical scopes are:

- global
- tenant
- actor
- service-actor
- session
- route
- operation
- resource
- provider
- job
- workflow
- notification
- file
- audit-export
- config-change
- identity-action
- ip-derived

Scope is explicit and validated. Tenant scope is never inferred from telemetry. IP-derived scope is privacy-sensitive and may be unavailable or deferred. Provider scope is tied to provider mode and owner capability.

## Policy Lifecycle

Lifecycle states are:

- draft
- active
- disabled
- shadow
- monitor-only
- deprecated
- revoked

Only active policies block normal execution. Shadow policies evaluate and can report shadow-deny without blocking. Monitor-only policies emit telemetry only. Disabled, deprecated, and revoked policies fail closed when a protected path requires them. Lifecycle changes are privileged and audited where represented.

## Policy Ownership And Review

Every policy records policy_id, policy_owner, owning_capability, classification, risk_level, created_by, approved_by, last_reviewed_at, review_expires_at, and change_reason.

High-risk policies require explicit owner posture. Policies affecting security-critical workflows or multiple tenants require review posture. Expired review emits a control signal where represented; it does not silently remove protection.

## Decision Model

Every decision records decision_id, policy_id, policy_type, scope, scope_ref, subject_ref, tenant_id, actor_id, service_actor_id, route_id, operation_id, resource_type, decision, reason_code, safe_message, limit, remaining, reset_at, retry_after, correlation_id, request_id, trace_id, and created_at.

Allowed decisions are allow, deny, delay, throttle, degrade, monitor-only, and shadow-deny.

Decision output is value-free. It contains no raw payload, secret, token, cookie, credential, object key, recipient address, raw IP, provider internals, or stack trace. Subject references exposed in evidence are opaque hashes where needed.

## Retry-After And Safe Denial

Denial semantics:

- 429 rate-limit-exceeded: retry may be safe after the reset window.
- 403 policy-denied: abuse or security denial is non-retryable unless explicitly authorised.
- 409 quota-conflict: quota/idempotency state conflict.
- 503 backpressure-applied: the service cannot safely accept more work.

Retry-after is provided only where retry is safe. Retry-after does not reveal another tenant's quota state. Safe messages are generic. Detailed policy reason remains internal unless authorised.

## Tenant Fairness

Tenant fairness posture includes tenant_quota, tenant_burst_limit, tenant_concurrency_limit, tenant_priority, tenant_fair_share, global_capacity_share, and starvation_policy.

Tenant A cannot consume Tenant B quota. Tenant A cannot infer Tenant B usage. Global limits must not permanently starve one tenant without explicit policy. Cross-tenant reporting is aggregated and redacted.

## Actor, Session, And Service-Actor Controls

Actor, session, service-actor, break-glass, and admin-action guardrails are separate from authorization. Privileged users and service actors are not exempt by default. Break-glass operations may have special policy but are audited. Session limits never replace authorization.

## API Route Guardrails

Public routes require abuse posture. Authenticated routes require actor/session posture. Tenant-scoped routes require tenant quota posture. Operator-only and break-glass routes require stricter posture. Audit-sensitive routes require export/read guardrails. Security-sensitive routes require suspicious-pattern signals.

Side-effecting API routes have guardrail posture or an explicit exception. Idempotency replay must not double-count unless a policy explicitly says so.

## Resource-Specific Limits

Represented resource guardrails include file upload, file download, file export, audit export, notification send, bulk notification, job submit, job retry, workflow start, provider call, config change, identity action, tenant switch, and API request.

File limits align with files/storage policy. Notification send limits align with consent and suppression policy. Job limits align with jobs/workflows idempotency and concurrency. Provider limits align with provider mode and provider protection. Audit export limits are stronger than ordinary reads.

## Data Exfiltration Controls

Suspicious extraction signals include large_export, rapid_download, repeated_file_access, many_failed_authorization_attempts, bulk_audit_access, bulk_notification_attempt, tenant_enumeration_attempt, pagination_scraping, and high_volume_api_read.

Signals are tenant-safe and redacted. Live DLP, UEBA, SIEM, WAF, gateway, CDN, fraud, bot, or edge integrations are deferred unless explicitly authorised.

## Abuse And Suspicious-Behaviour Signals

Suggested signals include rate_limit.exceeded, quota.exceeded, admission.denied, abuse.suspected, tenant.enumeration.suspected, credential_stuffing.suspected, token_replay.suspected, pagination_scraping.suspected, bulk_export.suspected, provider_backpressure.applied, and guardrail.policy.unknown_denied.

Signals do not replace audit. Signals can link to audit where appropriate.

## Cost And Provider Protection

Provider protection posture includes provider_call_limit, provider_cost_classification, provider_burst_limit, provider_circuit_breaker, provider_backpressure_policy, and provider_retry_budget.

Provider quotas protect cost and availability. Provider backpressure must not bypass audit. Provider retry budgets are bounded. Provider protection respects provider mode. Live provider cost enforcement is not claimed without authority.

## Bulk Operation Safety

Bulk operations require explicit scope, idempotency, cancellation posture, audit evidence, tenant-safe quota accounting, and may require approval or dry-run where represented. Examples include bulk notification send, bulk file export, bulk audit export, bulk job submit, bulk identity update, and bulk config change.

## Backpressure And Degradation

Backpressure and degradation posture includes backpressure_policy, degraded_mode_policy, shed_load_policy, queue_delay_policy, drop_policy, and priority_policy.

Backpressure is explicit. It does not silently drop security-critical notifications or audit writes. Degraded mode does not weaken authorization. Load shedding preserves audit evidence where represented.

## Quota Accounting And Reset

Quota accounting includes usage_counter, window_start, window_end, reset_at, quota_period, quota_remaining, quota_source, and quota_consistency_policy.

Quota reset is deterministic. Quota state is scoped and isolated. Quota accounting is idempotency-aware. Accounting failure fails closed or degrades according to explicit policy. Counters do not reveal cross-tenant usage.

## Distributed Enforcement Posture

Allowed enforcement posture values are single-node-in-memory, local-test, composed-test, distributed-deferred, and live-edge-deferred.

In-memory enforcement is local/dev/test only. Single-node enforcement is not distributed production readiness. Distributed enforcement and live edge enforcement are deferred unless explicitly authorised.

## Configuration And Policy Safety

Policy config records policy_schema_version, policy_type, scope, limit, window, burst_limit, retry_after_policy, denial_policy, telemetry_policy, audit_policy, environment_scope, and classification.

Policy config is typed and classified. Unknown policy config fails closed. Examples are synthetic. Policy config cannot contain secrets. Feature flags cannot disable mandatory security guardrails without explicit authority.

## Observability And Audit Linkage

Rate-limit decisions emit safe telemetry. Quota denials may emit audit where appropriate. Policy changes are audited. Security-sensitive denials emit security signals. Telemetry includes correlation, request, and trace IDs. Audit remains value-free.

## Future API/Ops Surfaces

Possible future surfaces include:

- /v1/guardrails/policies
- /v1/guardrails/decisions
- /v1/guardrails/usage
- /v1/guardrails/status

These are deferred in this slice. If implemented later, routes are operator-only or system-internal by default, PDP-protected, tenant-safe, redacted, and non-enumerating. They must not expose raw IPs, raw actor identifiers where sensitive, provider internals, cross-tenant quota state, or live edge-provider claims.

## Current Implementation Boundary

USF-160 implements:

- core guardrail policy and decision model;
- GuardrailPort;
- in-memory single-node local/dev/test policy store;
- jobs.create API route guardrail for a side-effecting route;
- safe 429 envelope and retry-after;
- tenant-isolated quota semantics;
- idempotency-aware accounting;
- tenant-safe observability security signal;
- value-free audit evidence;
- proof command and validator.

Deferred depth includes distributed enforcement, live edge/WAF/gateway/CDN/bot/fraud provider integration, full guardrail admin API surfaces, persisted/durable counters, broad route/resource rollout, approval workflow, quota billing integration, and live alerting or SIEM integration.
