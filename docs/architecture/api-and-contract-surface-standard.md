# API And Contract Surface Standard

|                       |                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------ |
| Document type         | Architecture / API contract boundary standard                                        |
| Status                | Draft / parity-api-contracts implementation authority under USF-133                   |
| Authority level       | Semantic implementation standard subordinate to Charter, Authority Model, and ADRs    |
| Linear scope          | USF-154, child of USF-133                                                            |
| Provider posture      | Local/dev/test contract proof only                                                   |
| Certification posture | ISO 27001-supporting technical control evidence only; no certification claim is made  |

This standard defines APIs as security and contract boundaries. It supports technical control evidence, tenant isolation, privacy, authorization review, compatibility review, observability posture, and future UI/API readiness. This is not a production, public API, deployment, gateway, external-client SDK, external developer platform, regulatory, or ISO certification claim. Do not claim ISO certification. Do not claim public API readiness. Do not claim production readiness. Do not claim external developer platform readiness.

## API As Security And Contract Boundary

route: a concrete HTTP method/path implementation.

contract: authoritative request, response, error, auth, tenant, idempotency, pagination, lifecycle, compatibility, and data-exposure semantics.

OpenAPI surface: a machine-readable public or internal description of implemented contracts.

capability: an internal domain operation behind the route.

API readiness: local/dev/test proof that route contracts are complete, safe, validated, and future-UI ready. API readiness is not a production, public API, external SDK, deployment, gateway, or live edge claim.

Rules:

- No route without classification.
- No protected route without auth/PDP posture.
- No tenant route without tenant guard.
- No side-effecting route without idempotency semantics or an explicit exception.
- No OpenAPI route without implementation.
- No implementation route without OpenAPI coverage.
- No examples with secrets, tokens, credentials, raw object keys, raw recipient addresses, real tenant data, or real user data.

## Route Classification

Every route is classified as exactly one of: public, authenticated, tenant-scoped, system-internal, operator-only, break-glass, audit-sensitive, security-sensitive, health-readiness, future-ui-surface, deprecated.

Unknown classification fails validation. Public routes are explicitly declared public. System-internal routes must not be exposed as public API. Operator-only and break-glass routes require stronger authorization and audit. Audit-sensitive routes require audit-of-access where represented. Deprecated routes carry migration or removal policy.

## Route Ownership And Capability Mapping

Every route records route_id, method, path, owning_domain, owning_capability, route_classification, required_action, tenant_scope, auth_scheme, pdp_policy, audit_policy, idempotency_policy, pagination_policy, rate_limit_policy, data_classification, and source_use_disposition.

Every route maps to a capability or is explicitly system-internal. Routes must not call provider adapters directly unless the route itself is an authorised adapter/admin route. Routes must not bypass capability ports. Route ownership is stable and reviewable.

## Versioning, Compatibility, And Lifecycle

Versioning fields are api_version, contract_version, schema_version, operation_version, deprecation_status, sunset_at, replacement_operation_id, and compatibility_policy.

Breaking changes require a new version or explicit migration policy. Removing a field is breaking unless the field is marked internal or unstable. Changing enum values is breaking unless the enum is extension-safe. Changing error codes is breaking unless documented. Deprecated operations remain documented until removal, with replacements where known.

Lifecycle states are draft, experimental, stable, deprecated, sunset, removed, and internal-only. Stable operations cannot change incompatibly without versioning. Experimental operations are labelled and are not treated as stable. Internal-only operations are not public readiness claims. External public API versioning and consumer-driven compatibility guarantees are deferred.

## Tenant Context And Authority Propagation

Every tenant-scoped route defines tenant_source, tenant_header, tenant_path_param, tenant_body_field, selected_tenant_id, tenant_mismatch_policy, and tenant_context_required.

Tenant context is singular and explicit. Path/header/body tenant mismatch fails closed. Tenant context propagates to PDP, DB/RLS, audit, jobs, files, notifications, config, and provider boundaries where relevant. Tenant A cannot infer Tenant B resources through status code, timing-sensitive examples, pagination, errors, or counters.

## Authentication And Authorization Contract

Every protected route defines auth_required, auth_scheme, accepted_issuer, required_action, required_assurance_level, tenant_membership_required, pdp_decision_required, break_glass_allowed, and service_actor_allowed.

Identity is not authorization. Token claims alone do not authorize. Protected routes either call PDP or delegate to a capability that proves PDP use. Service actor routes require explicit service actor identity. Break-glass use is explicit, scoped, expiring, and audited. The current local/dev/test API uses synthetic dev identity headers while the contract records the future Keycloak-issued bearer posture; this is not a live Keycloak, public API, or production auth claim.

## Error Envelope And Non-Enumeration

The standard error envelope fields are error_id, status, code, reason_code, safe_message, correlation_id, request_id, trace_id, details, documentation_ref, and retry_after.

Error messages are safe and non-secret. Validation errors expose safe field paths and reason codes, not raw sensitive values. Tenant-mismatched resources use non-enumerating 403/404 posture where appropriate. Unauthorized and forbidden are distinct. Conflict, idempotency conflict, validation failure, and tenant mismatch have stable reason codes. Raw stack traces are never returned.

## Validation And Schema Strictness

Validation posture fields are strict_body_schema, unknown_field_policy, coercion_policy, enum_policy, format_policy, max_payload_size, and content_type_policy.

Unknown fields fail closed unless the contract marks them extension-safe. Invalid enum values fail closed. Invalid formats fail closed. Payload size limit is explicit. Content type is validated. Schema coercion is explicit, not accidental. Request validation errors are safe. Response validation is tested.

## Idempotency And Safe Retries

Side-effecting routes define idempotency_required, idempotency_header, idempotency_scope, idempotency_window, replay_policy, conflict_policy, and dedupe_key.

POST, PUT, PATCH, and DELETE side effects require idempotency or a documented exception. Idempotency keys are tenant-scoped and actor-scoped where appropriate. Replay returns a deterministic response or safe conflict. Idempotency keys must not leak across tenants. Retries must not duplicate external side effects.

## Pagination, Filtering, Sorting, And Search

Pagination posture fields are pagination_type, cursor_shape, cursor_scope, default_limit, max_limit, filter_allow_list, sort_allow_list, and search_policy.

Cursors are opaque and tenant-scoped. Pagination does not leak cross-tenant counts. Filters and sorts are allow-listed. Search is non-enumerating where sensitive. Default and max limits are explicit.

## Rate Limiting, Abuse, And Availability

Posture fields are rate_limit_policy, burst_policy, tenant_quota, actor_quota, ip_quota, service_actor_quota, abuse_signal_policy, and retry_after_policy.

Rate-limit decisions are safe and auditable where represented. Quota failure is safe and non-secret. Security-sensitive routes have stricter posture. Notification, file, job, and audit export routes require abuse-control posture. Live edge, WAF, or rate-limit provider readiness is deferred unless separately authorised.

## CORS, CSRF, Browser, Security Headers, And Negotiation

CORS is explicit. No wildcard CORS is allowed for credentialed routes. CSRF posture is defined for browser session routes. Auth cookies, if represented, are httpOnly, secure, SameSite, scoped, and expiring. Redirect URIs are allow-listed where represented. Open redirects are forbidden. Browser-specific flows may be defined and deferred; they are not silently assumed.

Default security headers are cache-control, content-security-policy where applicable, x-content-type-options, referrer-policy, permissions-policy, and strict-transport-security where applicable. Sensitive responses are no-store. Error responses do not cache sensitive data. Content negotiation is explicit. Unexpected Accept or Content-Type fails safely. HSTS is not claimed for local-only proof unless deployment scope is authorised.

## Data Classification And Field Exposure

Response field classifications are public, internal, confidential, restricted, and security-sensitive.

Responses expose the minimum necessary data. Security-sensitive fields require stronger permission or are redacted. Audit, file, notification, identity, and config routes must not expose provider internals. Field visibility and mutability metadata should exist where future UI needs it and is already authorised.

## OpenAPI Example Safety

OpenAPI examples are synthetic and safe. Forbidden example content includes real tenant identifiers, real user identifiers, real emails, raw recipient addresses, tokens, cookies, passwords, client secrets, private keys, authorization headers, object keys, provider credentials, connection strings, raw stack traces, and live provider URLs.

Examples use synthetic IDs and safe placeholders. Examples must not imply production, live provider, public API, or external SDK readiness. Examples must not expose internal policy details. Examples match schemas and are validated.

## Correlation, Auditability, Observability, And Operational Evidence

Routes propagate correlation_id, causation_id, trace_id, request_id, actor_id, tenant_id, route_id, and operation_id where represented.

Correlation IDs are generated if missing. Request IDs are unique. Audit events include route/action/correlation where appropriate. Errors include safe correlation and request identifiers. Trace IDs do not expose implementation internals.

Observability signals are request_count, error_count, latency, validation_failure_count, auth_denial_count, tenant_mismatch_count, idempotency_conflict_count, rate_limit_count, p95_latency, and p99_latency. Metrics are tenant-safe, do not include raw payloads, and do not expose tenant-sensitive counts unless authorised. Live monitoring and alerting are deferred unless separately authorised.

## Backward Compatibility And Consumer Safety

Contract test posture includes openapi_diff_policy, breaking_change_policy, consumer_contract_policy, generated_client_policy, and compatibility_snapshot.

OpenAPI changes are diffed. Breaking changes require explicit approval. Generated clients are not claimed unless generated and tested. Consumer-driven contracts may be deferred. Compatibility snapshots use synthetic safe data.

## Import, Export, Bulk, Gateway, And Edge Posture

Bulk APIs are high-risk. Bulk actions require stronger authorization, idempotency, audit evidence, bounded tenant scope, and schema validation. Bulk export must use file/storage and audit controls. Bulk import must validate schema and tenant context. Campaign and bulk surfaces not implemented by this slice are classified and deferred.

Gateway posture fields are gateway_required, trusted_proxy_policy, forwarded_header_policy, tls_termination_policy, waf_policy, request_size_limit, and body_timeout_policy.

Forwarded headers are trusted only from configured proxies. Client IP source is defined. TLS, edge, WAF, and gateway production readiness are deferred unless separately authorised. Local proof must not claim deployed edge controls.

## Implemented Local/Dev/Test Slice

The parity-api-contracts slice implements a metadata-backed route contract table, OpenAPI 3.1 generation and checking, safe error envelope, request/correlation ID propagation, tenant guard, PDP guard, API-level idempotency for side-effecting jobs and notification delivery enqueue, opaque cursor proof for file listing, synthetic examples, future UI/API metadata, and an API proof command.

The implemented surface connects health/readiness, tenant context, auth/session/identity, authorization/PDP, audit/evidence, config/secrets, files/storage, jobs/workflows, and notifications/messaging. It remains local/dev/test contract proof only and does not claim public API readiness, production readiness, deployment readiness, live gateway readiness, external developer platform readiness, or external SDK readiness.

## USF-155 Enterprise API/Gateway Depth Boundary

USF-155 adds a bounded enterprise-depth evidence gate for API and gateway compatibility posture. The gate is recorded in `docs/architecture/api-gateway-enterprise-proof-depth-matrix.json` and exercised by `make api-proof`.

The implemented and proven local controls are:

- route metadata for compatibility, browser posture, security headers, field exposure, gateway posture, tenant scope, PDP policy, idempotency, pagination, and observability;
- OpenAPI route coverage, unique operation IDs, synthetic safe examples, and no public readiness claim;
- tenant-context fail-closed behaviour, PDP denial, tenant mismatch denial, deterministic idempotency conflict, opaque cursor posture, and value-free audit evidence;
- explicit non-claims for public API readiness, generated SDK readiness, GraphQL or federation readiness, gateway-live readiness, WAF readiness, TLS termination readiness, staging readiness, production readiness, SOC readiness, ISO certification, full dev readiness, full React parity, and USF-133 closure.

The explicitly reclassified or deferred controls are:

- GraphQL and federation lineage are inventoried and out of current foundation runtime scope unless USF-214 authorises them.
- Generated external clients and SDK distribution remain deferred to USF-214; OpenAPI generation is not generated-client readiness.
- Browser-session cookies and CSRF runtime controls remain deferred to identity/browser-session authority and future UI/API work; route metadata is not browser session readiness.
- Public API compatibility remains deferred to USF-213. Gateway, trusted proxy, TLS termination, WAF, edge, and public exposure remain deferred to future gateway route-proof work. The service catalogue and gateway-clickthrough substrate are local/profile-gated posture only.
- Broad import/export/bulk API surface depth remains owned by USF-163.

This is ISO/IEC 27001-supporting evidence organisation only. It is not ISO certification, SOC readiness, public API readiness, gateway-live readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, full dev readiness, full React parity, or USF-133 closure.

## USF-213 Public API Compatibility And Release Governance Boundary

USF-213 adds a bounded public API compatibility and release-governance evidence gate. The gate is recorded in `docs/architecture/api-public-compatibility-release-governance-matrix.json` and exercised by `make api-proof`.

The implemented and proven local controls are:

- a deterministic local compatibility snapshot over the current route contract table;
- explicit public API compatibility scope that does not rely on route metadata alone;
- release-governance, versioning, and SemVer posture as documented boundaries;
- synthetic OpenAPI examples and contract metadata preserved as local evidence only;
- explicit non-claims for public API readiness, consumer-driven contract readiness, release compatibility readiness, external developer platform readiness, staging readiness, production readiness, deployment readiness, SOC readiness, ISO certification, full dev readiness, full React parity, and USF-133 closure.

The explicitly deferred controls are:

- consumer-driven contract suites and external customer compatibility fixtures;
- public API launch readiness, external developer portal, public API key issuance, support/SLA workflow, and public documentation operation;
- package SemVer release operation, public changelog operation, production release approval, deployment readiness, and environment promotion readiness;
- generated SDK/client distribution, GraphQL, and federation readiness, which remain under USF-214 or future authorised source issues.

This is ISO/IEC 27001-supporting evidence organisation only. It is not ISO certification, SOC readiness, public API readiness, public launch readiness, deployment readiness, staging readiness, production readiness, live-provider readiness, full dev readiness, full React parity, or USF-133 closure.
