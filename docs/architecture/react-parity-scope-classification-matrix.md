# React Parity Scope Classification Matrix

| | |
|---|---|
| Document type | Architecture / parity scope-classification matrix (planning) |
| Status | Draft / planning — domain-level classification; item-level decomposition tracked in Linear |
| Authority level | Reviewable planning matrix; subordinate to the Charter, Authority Model, ADRs, validators, proof evidence, and the existing coverage matrices it references |
| Follows | `docs/architecture/full-react-parity-readiness-directive.md`, `docs/architecture/foundation-ui-agnostic-readiness-boundary.md` |
| Inventory substrate | `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/react-readiness-rule-parity-matrix.md`, `docs/architecture/react-l5-equivalence-audit.md`, `docs/architecture/bootstrap-source-use-disposition-matrix.md`, `spec/instances/` |
| Historical base | `../react` (rank-6 evidence only); frozen base recorded in `react-l5-equivalence-audit.md` |
| Repository state | Introduces no new implementation/runtime code, no proof execution, no React copy, no path mirroring. The repository already contains the authorised local dev/test bootstrap runtime (PR #88/#89). |

> This matrix adds the **foundation-vs-UI scope lens** and the **test/proof classification** that the existing coverage matrices do not carry. It does **not** re-derive capability/rule/asset coverage — those remain authoritative in the substrate matrices above. Item-level rows (per service/port/adapter/route/job/workflow/provider/command/test) are produced under the **planned** (gated) Linear children in `full-parity-linear-tracking-plan.md`; this document is the domain-level classification. The machine-readable authority is `react-parity-scope-classification-matrix.json`, enforced by `tools/validate-parity/validate-parity.py` (`make parity`); this Markdown is the human-review view and is kept consistent with it. Test/proof rows use canonical disposition statuses (`partial` for foundation tests pending port; `foundation-behaviour-rewritten-from-ui-test` for UI-derived foundation behaviour; `ui-ux-only-out-of-foundation-scope` for UI-only).

## 1. Status model

Foundation-behaviour: `migrated`, `covered`, `partial`, `missing`, `deferred`, `deprecated`, `not-applicable`, `requires-human-decision`.
UI-scope: `ui-ux-only-out-of-foundation-scope`, `foundation-behaviour-rewritten-from-ui-test`.

Row shape (per `full-react-parity-readiness-directive.md` §4.3): `react_item_id`, `category`, `react_paths[]`, `react_tests[]`, `react_proofs[]`, `behaviour_summary`, `usf_status`, `usf_paths[]`, `usf_tests[]`, `usf_proofs[]`, `semantic_authority`, `source_use_disposition`, `linear_issue`, `blocking_foundation_readiness`, `evidence`, `retry_condition`.

## 2. Historical `../react` inventory (counts)

Domain-level inventory of the historical repository (rank-6 evidence): **36 packages** (≈11 provider adapters, 8 runtimes, 6 contracts, 4 infra/tooling, 2 UI), **2 apps** (`platform-api` backend; `react-enterprise-app` SPA), **1 dev service** (`mock-oidc`), **~15 provider integrations**, **12 foundation domains**, plus a UI/UX surface (~23 admin feature modules + design system). Test/proof estimate: ~280+ foundation-behaviour test groups, ~20 mixed, ~15 UI-only, plus 7 Playwright configs and the make/proof-tooling ladder. Item-level enumeration is delegated to the planned (gated) Linear children.

## 3. Foundation-domain classification (domain-level)

Each domain below is foundation-relevant. The `usf_status` reflects the **full-parity** bar (not the narrower bootstrap scope). "Bootstrap" notes record what USF-39 already migrated at local dev/test scope. At this planning stage the domain-level `partial` set is carried by the umbrella blocker **USF-133** (with **USF-135** for parity-enforcement and **USF-136** for `requires-human-decision` items); none is a markdown-only blocker. The per-domain children named in the "Planned child" column are created only after a human-approved implementation directive. Exceptions: the **DB / RLS / migrations** domain is authorised and implemented under **USF-138** (deferred depth in **USF-139**); **tenant isolation + RBAC/ABAC** under **USF-140** (deferred depth in **USF-141**); **audit / evidence / events** under **USF-142** (deferred depth in **USF-143**); **config + secrets** under **USF-144** (deferred depth in **USF-145**); **files / storage** under **USF-146** (deferred depth in **USF-147**); **notifications / messaging** under **USF-152** (deferred depth in **USF-153**); **API routes / OpenAPI / contracts** under **USF-154** (deferred API depth in **USF-155**); and **provider adapters / modes** under **USF-156** (deferred live/risk/resilience depth in **USF-157**). Their carriers are item-level USF issues, not markdown-only blockers.

| # | Domain | category | Key historical items | usf_status | Bootstrap already migrated? | semantic_authority | Planned child (gated) | Substrate refs |
|---|---|---|---|---|---|---|---|---|
| 1 | Auth / identity | service, port, adapter, route | Keycloak/OIDC brokering, session cookies, claim/role mapping, credential lifecycle, JWKS/discovery | partial | Yes — in-memory IdP + hermetic auth proof (L3–L4) | known | parity-auth | capability-source-coverage; auth-slice disposition matrix |
| 2 | Tenant isolation + RBAC/ABAC | service, adapter, schema | Tenant context, application-layer PDP (RBAC+ABAC, default-deny), membership lifecycle, break-glass, decision audit; identity-not-authorization; RLS backstop | partial (authorised; core migrated, deferred depth in USF-141) | Yes — PDP + RBAC/ABAC + break-glass + PDP/RLS consistency proof + validate-authz (USF-140) | known (ADR 0010) | USF-140 (core) + USF-141 (deferred) | tenant-authorization-standard; ADR 0010; `tenant-*`, `abac-*` instances |
| 3 | Audit / evidence / events | service, event, adapter | Append-only, tamper-evident audit/evidence: canonical taxonomy, authorization-decision + break-glass evidence, correlation/causation/trace propagation, redaction, hash-chain integrity + tamper detection, tenant-safe PDP-protected retrieval, audit-of-audit; durable event-bus outbox/DLQ/redrive deferred | partial (authorised; core migrated, deferred depth in USF-143) | Yes — audit-evidence + audit-api tests + `make audit-proof` + validate-audit (USF-142) | known | USF-142 (core) + USF-143 (deferred) | `audit-*`, `event-bus-*` instances; `audit-evidence-standard.md`; `parity-audit-source-use-disposition-matrix.md` |
| 4 | Config + secrets | config, adapter | Typed fail-closed config control plane: classification, deterministic precedence + override policy, secret-reference vs secret-value, redaction/non-leakage, secret lifecycle + access control, feature flags (safe default), value-free config/secret audit; DB-backed config history + OpenBao/Postgres secret managers + rotation execution deferred | partial (authorised; core migrated, deferred depth in USF-145) | Yes — config-secrets + config-api tests + `make config-proof` + validate-config (USF-144) | known | USF-144 (core) + USF-145 (deferred) | `configuration-*`, `runtime-secrets-*` instances; `config-and-secrets-standard.md`; `parity-config-secrets-source-use-disposition-matrix.md` |
| 5 | Files / storage | port, adapter | Tenant-scoped file information assets: authoritative file metadata (RLS), opaque non-guessable object keys, fail-closed upload validation (size/content-type/checksum), PDP-gated download with scan/lifecycle gate, soft delete/restore, legal-hold purge-block, integrity (checksum + metadata hash + tamper detect), provider config via secret refs, value-free file audit; live MinIO/S3 + ClamAV + presigned URLs + derived objects + versioning + backup/DR + DLP deferred | partial (authorised; core migrated, deferred depth in USF-147) | Yes — files-storage + files-api tests + `make files-proof` + validate-files (USF-146) | known | USF-146 (core) + USF-147 (deferred) | `object-storage-*`, `data-governance-*` instances; `files-and-object-storage-standard.md`; `parity-files-storage-source-use-disposition-matrix.md` |
| 6 | Jobs / workflows / scheduling | job, workflow | Temporal + Windmill orchestration, scheduled jobs, approval workflows, state machines | partial | Yes — job/notify surface | known (jobs); unclear (workflow-engine choice parity) | parity-jobs | `workflow-engine-*`, `scheduled-jobs-*`, `background-workers-*` instances |
| 7 | Notifications | service, adapter, job, provider, audit | controlled communications: notification intent, templates, recipients, channels, provider abstraction, preferences, consent, suppression, delivery jobs, retry/idempotency, dead-letter, audit evidence | partial (authorised; foundation slice migrated, deferred depth in USF-152) | Yes — notify capability + tests + `make notify-proof` + validate-notify | known | USF-152 | `notification-delivery-*`, `webhooks-*` instances; `notifications-and-messaging-standard.md`; `parity-notifications-messaging-source-use-disposition-matrix.md` |
| 8 | API routes / controllers + OpenAPI | route, contract | REST routes, GraphQL/federation lineage, typed contracts, OpenAPI drift gate, route guards, tenant context, safe errors, idempotency, pagination, security headers, and API tests | partial (authorised; local/dev/test contract surface migrated, deferred depth in USF-155) | Yes — guarded foundation API routes + OpenAPI + `make api-proof` + validate-api (USF-154) | known | USF-154 (core) + USF-155 (deferred) | `openapi-drift-hard-gate`, `api-docs-*`, interface-contract instances; `api-and-contract-surface-standard.md`; `parity-api-contracts-source-use-disposition-matrix.md` |
| 9 | DB / RLS / migrations | schema, migration | PostgreSQL 16, forward-only checksummed migrations, per-tenant RLS, enterprise persistence metadata/classification + lifecycle/append-only/legal-hold integrity | partial (authorised; core migrated, deferred depth in USF-139) | Yes — live composed-Postgres real-app-role isolation proof + standard + validate-db (USF-138) | known | USF-138 (core) + USF-139 (deferred) | enterprise-persistence standard; classification registry; `relational-storage-and-migrations-and-rls` |
| 10 | Provider adapters / modes | adapter, provider | Controlled provider trust boundaries, modes, registry, ownership, config/secret refs, health/readiness, status redaction, audit, and import boundaries | partial (authorised; local/dev/test slice migrated, deferred depth in USF-157) | Yes — provider registry + safe status surface + `make providers-proof` + validate-providers (USF-156) | known | USF-156 (core) + USF-157 (deferred) | `provider-configuration-plane`, `provider-environment-classification`, `service-catalog-*` |
| 11 | Observability | observability | OTEL traces, Prometheus metrics, Loki logs, Tempo, Grafana, Sentry, alerting/incidents | partial | Minimal at bootstrap | known | parity-observability | `metrics-and-traces`, `logs-aggregation-*`, `alerting-incident-*` instances; observability proof-slice plan |
| 12 | Developer commands + proof tooling | command, proof | confidence ladder (dev→test→staging→prod), make targets, proof scripts, readiness gates | partial | Yes — `make verify`/`dev-smoke` + validators | known | parity-commands | command-operational-coverage plan; proof-tool-contract-standard |

### Notifications / Messaging Subdomain Classification

Implemented foundation rows are carried by USF-152. Partial/deferred notification depth rows are carried by USF-153.

| Item | usf_status | Evidence | Deferred depth |
| --- | --- | --- | --- |
| notification model | migrated | `NotificationIntent`, `NotificationDeliveryEvidence`, tests, `make notify-proof` | DB-backed persistent notification tables/outbox |
| template model | migrated | version/hash/classification/safe renderer tests | approval workflow runtime |
| recipient model | migrated | address_ref plus address hash tests | richer address verification workflows |
| channel model | partial | channel governance constants and in-memory provider proof | authorised live/composed channel adapters |
| provider abstraction | migrated | `NotificationProvider`, secret-ref provider config, no-live proof fields | SMTP/Brevo/SMS/push/webhook live providers |
| delivery job | migrated | notification.delivery job idempotency tests | durable outbox/inbox persistence |
| retry/dead-letter | migrated | bounded retry/dead-letter evidence tests | provider-specific backoff/circuit-breaker execution |
| consent/preferences | migrated | marketing/bulk consent fail-closed tests | self-service/API preference surfaces |
| suppression | migrated | do-not-contact/opt-out suppression tests | inbound provider feedback updates |
| bounce/complaint posture | deferred | feedback event/status posture defined | live inbound provider webhook handling |
| unsubscribe posture | partial | unsubscribe_status represented | governed unsubscribe routes and feedback ingestion |
| mandatory security notifications | migrated | explicit security classification and opt-out bypass policy tests | producer-specific recipient policies |
| bulk send posture | deferred | bulk classification/action/rate-limit posture defined | campaign runtime, quotas, cancellation |
| rate limiting/abuse controls | deferred | quota concepts defined in standard | quota runtime and abuse detection |
| retention/disposal | partial | retention/legal_hold fields defined | purge workflow and storage retention runtime |
| audit/evidence | migrated | notification lifecycle audit tests and proof | advanced audit export/API surfaces |
| future UI/API notification surfaces | deferred | behaviours rewritten as capability tests | PDP-protected redacted HTTP/OpenAPI/UI surfaces |
| React UI/Playwright behaviours | foundation-behaviour-rewritten-from-ui-test | admin email/webhook UI behaviours rewritten as foundation tests | UI/UX remains out of scope |

### API / Routes / OpenAPI / Contracts Subdomain Classification

Implemented local/dev/test contract rows are carried by USF-154. Partial/deferred API depth rows are carried by USF-155.

| Item | usf_status | Evidence | Deferred depth |
| --- | --- | --- | --- |
| route inventory | migrated | `API_ROUTE_CONTRACTS`, route implementation checks, `make api-proof` | none for implemented routes |
| route classification | migrated | canonical route classification metadata and validate-api | none for implemented routes |
| route-to-capability mapping | migrated | owning domain/capability/action/PDP metadata and tests | none for implemented routes |
| OpenAPI completeness | migrated | metadata-generated OpenAPI 3.1, checker, tests | none for implemented routes |
| request/response schemas | migrated | TypeBox contracts and schema refs | schema depth for future routes |
| error envelope | migrated | `ApiErrorResponseSchema`, safe handler tests | none for implemented routes |
| validation errors | migrated | redacted validation error tests | stricter unknown-field policy depth |
| tenant context | migrated | missing/mismatch tenant tests and proof | additional tenant-source modes |
| auth/PDP guards | migrated | protected-route denial tests and proof | stronger assurance/break-glass API depth |
| idempotency | migrated | deterministic replay/conflict tests for side-effecting routes | durable persisted idempotency store |
| pagination/filtering/sorting | partial | opaque file cursor proof and route metadata | persisted cursor/query/search semantics |
| correlation/request IDs | migrated | safe error envelope and route metadata | observability backend depth |
| security headers | migrated | API hook and OpenAPI metadata | deployment-specific HSTS/CSP depth |
| CORS/CSRF posture | partial | metadata present; no UI/browser runtime added | browser session/cookie/CSRF runtime |
| rate limiting/abuse posture | partial | `POST /v1/jobs` local guardrail, safe 429, retry-after, guardrail telemetry/audit, and `make guardrails-proof` | broad route/resource rollout, durable counters, and live edge/WAF/gateway enforcement |
| example safety | migrated | OpenAPI checker rejects unsafe examples and overclaims | none for implemented routes |
| API lifecycle/deprecation | migrated | lifecycle/version/compatibility metadata | removal/sunset runtime policy |
| compatibility snapshots | partial | OpenAPI diff/check posture | synthetic compatibility snapshots and consumer contracts |
| future UI/API readiness | migrated | tags, operation IDs, field exposure, reason codes, examples | UI runtime remains out of scope |
| bulk API safety | deferred | standard defines high-risk controls | bounded bulk/import/export runtime |
| gateway/edge posture | deferred | standard and route metadata | trusted proxy, TLS, WAF, gateway runtime |
| GraphQL/generated client posture | deferred | lineage inventoried; no SDK readiness claimed | scope decision and implementation if authorised |
| React UI/Playwright API behaviours | foundation-behaviour-rewritten-from-ui-test | API contract/security/error behaviours rewritten as API tests/proof | UI/UX assertions remain out of scope |

### Provider Adapters / Modes Subdomain Classification

Implemented local/dev/test provider rows are carried by USF-156. Deferred live/risk/resilience provider depth is carried by USF-157.

| Item | usf_status | Evidence | Deferred depth |
| --- | --- | --- | --- |
| provider registry | migrated | `PROVIDER_REGISTRY`, registry validation, `make providers-proof` | deeper sync with live provider catalogues |
| provider categories | migrated | all 15 required categories represented and tested | future category expansion by directive |
| provider modes | migrated | in-memory, local-test, mock, composed-test, live-external-deferred, disabled, unavailable represented; unknown/live-authorised-without-authority fails | live-external-authorised authority path |
| provider lifecycle | partial | local/composed approvals plus suspended placeholders represented | approval workflow and review expiry enforcement |
| provider ownership | migrated | owner capability, team/role, port, adapter, purpose | organisational workflow depth |
| provider config classification | migrated | config refs and provider-config registry values | DB-backed provider config history |
| provider secret references | migrated | raw credentials rejected; SecretReference-only tests | live secret manager adapters and rotation execution |
| health/readiness | migrated | health, readiness, liveness, and capability status separated | deep composed-provider readiness aggregation |
| provider status redaction | migrated | `/v1/providers` status views redacted and OpenAPI-covered | richer operator filtering/pagination |
| capability-provider boundary | migrated | proof scans capabilities/core/API route imports for unauthorised provider SDKs | full dependency graph validator |
| provider audit/evidence | migrated | value-free provider audit event tests and taxonomy | provider config change workflow runtime |
| provider drift posture | partial | drift fields represented | runtime drift detector and exception workflow |
| provider resilience posture | partial | timeout, retry, circuit, fallback, degraded-mode posture represented | runtime circuit breaker/bulkhead controls |
| supplier/subprocessor posture | partial | posture fields represented without approval claim | supplier review workflow |
| local/composed/live-deferred separation | migrated | test/composed providers do not claim live or production readiness | authorised live provider proof package |
| future API/provider status surfaces | migrated | operator-only PDP-protected redacted routes for list/detail | health/readiness subroutes if authorised |
| React UI/Playwright provider behaviours | foundation-behaviour-rewritten-from-ui-test | provider admin/status behaviours rewritten as capability/API/proof tests | UI/UX remains separate |
| live provider, DR, gateway, cache/search depth | deferred | USF-157 tracks live/risk/resilience depth | explicit directive required before implementation |

### Observability / Telemetry Subdomain Classification

Implemented local/dev/test observability rows are carried by USF-158. Deferred live backend and deep operational observability depth is carried by USF-159.

| Item | usf_status | Evidence | Deferred depth |
| --- | --- | --- | --- |
| observability domain | partial | controlled signal model, bounded in-memory collector, API route signal emission, PDP-protected observability routes, `make observability-proof`, and `validate-observability` | live backend/export/alert/dashboard/incident depth tracked in USF-159 |
| metrics | migrated | metric type model, allow-listed labels, secret/high-cardinality rejection tests and proof | live Prometheus/OpenTelemetry export |
| traces/spans | migrated | safe span attributes, propagated request/correlation/trace IDs, redaction proof | live trace backend and distributed propagation depth |
| structured logs | migrated | safe message templates and redacted attributes | live log backend and retention pipeline |
| operational events | migrated | local collector event records with safe context | broad per-capability event emission depth |
| security signals | migrated | authorization.denied and tenant mismatch security-signal posture represented and tested | SIEM/export/detection rule integration |
| health/readiness/liveness | migrated | collector status separates liveness, health, readiness, and live claim flags | deeper capability readiness aggregation |
| correlation propagation | migrated | tenant-context API path emits metric/span with request, correlation, and trace IDs | cross-service/composed tracing |
| tenant-safe labels | migrated | tenant-scoped query isolation and label allow-list tests | cross-tenant aggregate analytics |
| cardinality governance | migrated | high-cardinality and unknown metric labels fail closed | approval workflow for exceptional labels |
| redaction | migrated | tokens, credentials, object keys, recipient addresses, raw provider responses, and stack traces absent from telemetry output | deeper sink/export leak scanning |
| retention/disposal | partial | retention fields and posture represented in signal model and standard | purge workflow, legal hold, retention scheduler |
| access control | migrated | observability actions added to PDP and routes require security-admin permissions | granular log/trace/security-signal roles |
| provider mode observability | migrated | in-memory collector, composed-test provider deferred, no live monitoring claim | live-external-authorised observability provider authority path |
| alerting posture | deferred | standard defines alert posture without live delivery claim | alert delivery, dedupe, suppression, escalation |
| incident evidence posture | deferred | standard defines incident linkage without readiness claim | incident workflow and runbook integration |
| dashboard posture | deferred | standard defines dashboard posture without UI implementation | dashboard runtime/future ops UI |
| future API/ops surfaces | partial | `/v1/observability/readiness` and `/v1/observability/signals` implemented safely | raw log/trace/metric export routes deferred |
| React UI/Playwright observability behaviours | foundation-behaviour-rewritten-from-ui-test | request instrumentation and tenant observability behaviours rewritten as API/capability/proof tests | UI/UX assertions remain out of scope |

### Rate Limits / Abuse Controls Subdomain Classification

Implemented local/dev/test guardrail rows are carried by USF-160. Deferred distributed/live enforcement and broad resource rollout depth are tracked by USF-161.

| Item | usf_status | Evidence | Deferred depth |
| --- | --- | --- | --- |
| rate limits | migrated | `GuardrailPolicy`, `GuardrailPort`, `InMemoryGuardrailStore`, safe 429/retry-after tests, `make guardrails-proof` | distributed/persisted enforcement |
| quotas | migrated | tenant-scoped quota accounting, 409 quota-conflict posture, tenant isolation tests | durable quota accounting and billing integration |
| throttles | partial | throttle policy type and decision model represented | actual delay/admission scheduling |
| admission control | partial | unknown policy/scope fail closed; policy-denied semantics represented | broad admission-control rollout |
| tenant fairness | migrated | tenant A cannot consume or inspect tenant B quota | fair-share scheduler and starvation controls |
| actor/session/service-actor limits | partial | actor and service-actor scopes represented; privileged actors not exempt by model | session/break-glass/admin runtime rollout |
| API route guardrails | partial | `POST /v1/jobs` side-effecting route guarded with local policy and OpenAPI 429 | broad API route coverage and guardrail ops APIs |
| job guardrails | migrated | jobs.create route guard plus idempotency replay no double-count | job concurrency/retry quota depth |
| notification guardrails | partial | standard defines send/bulk notification quota posture | runtime send/bulk quota rollout |
| file guardrails | partial | standard defines upload/download/export posture | runtime file quotas and exfiltration controls |
| provider guardrails | partial | provider backpressure/protection model and tests | provider call budgets and circuit breaker integration |
| bulk operation safety | partial | bulk operation classification and quota/idempotency posture | approval/dry-run/cancellation runtime |
| data exfiltration posture | deferred | standard defines suspicious extraction signals | runtime detection/blocking rollout |
| abuse signals | partial | `rate_limit.exceeded` and policy-denial security signals emitted where represented | credential stuffing, token replay, scraping, and bulk export signals |
| backpressure/degradation | partial | 503 backpressure decision represented | queue delay, load shedding, and priority policies |
| quota accounting/reset | migrated | deterministic reset_at and scoped usage counters | distributed reset consistency |
| distributed enforcement posture | partial | single-node-in-memory, local-test, composed-test, distributed-deferred, live-edge-deferred represented | distributed/live edge enforcement authority and proof |
| policy config | migrated | typed/classified policies reject secret-looking values | approval workflow and persisted config history |
| observability/audit linkage | migrated | tenant-safe telemetry and value-free guardrail audit evidence | alerting/SIEM/export integration |
| future API/ops surfaces | deferred | `/v1/guardrails/*` posture defined and deferred | operator-only PDP-protected runtime surfaces |
| React UI/Playwright guardrail behaviours | foundation-behaviour-rewritten-from-ui-test | foundation behaviours rewritten as capability/API/proof tests | UI/UX assertions remain out of scope |

Domain count: **13 foundation domains, all `partial`** for the full-parity bar (semantics present; per-domain source-use, implementation, and fresh proof are the open work). No domain is `covered`/`migrated` at full-parity scope yet; none is silently `missing`. `requires-human-decision` flags are recorded inline (ABAC policy-engine specifics; workflow-engine parity choice) and carried into their domain children.

## 4. UI/UX scope (out of foundation scope)

| Item | category | react_paths | usf_status | Rationale |
|---|---|---|---|---|
| `react-enterprise-app` SPA | ui | `../react/apps/react-enterprise-app` | ui-ux-only-out-of-foundation-scope | React 19 SPA (TanStack Router/Query, Tailwind); downstream consumer; classified, not migrated |
| `ui-design-system` | ui | `../react/packages/ui-design-system` | ui-ux-only-out-of-foundation-scope | Component library / visual; out of foundation scope |
| Component unit tests | test, ui | `apps/react-enterprise-app/src/tests`, `packages/ui-design-system/tests` | ui-ux-only-out-of-foundation-scope | Prove component rendering; ~12 files |
| Visual/build E2E | test, ui | `playwright.build.config.ts`, `tools/ui-reference-harness` | ui-ux-only-out-of-foundation-scope | Vite build/preview + MSW-mocked semantic rendering |
| `ui-semantic-model` (metadata) | other | `spec/instances/ui-semantic-model/`, `spec/schemas/ui-semantic-model.schema.json` | covered | UI-relevant **metadata** is retained in the foundation as machine-readable affordances for future UI; this is not UI runtime |

Future UI/UX work consuming foundation contracts is tracked as a separate, **non-foundation-blocking** issue (see tracking plan §future-ui).

## 5. Test / proof classification (no test disappears silently)

| Group | react_paths | classification | Action |
|---|---|---|---|
| API/integration tests | `apps/platform-api/tests` (~70), `packages/*/tests` (~45) | partial | Foundation tests pending port; rewrite as USF foundation tests under each domain child |
| Architecture/governance tooling tests | `tools/architecture` (~47), `tools/v2-readiness`, `tools/security` | partial | Map to USF validators/proof tooling parity (parity-commands) |
| Proof scripts + evidence ladder | `tools/e2e`, `scripts/evidence`, `scripts/tests`, `tests/integration/compose-smoke` | partial | Map to USF proof tooling + compose proof (parity-commands, parity-db) |
| Playwright `identity` / `internal` | `playwright.identity.config.ts`, `playwright.internal.config.ts`, `e2e/identity`, `e2e/internal` | foundation-behaviour-rewritten-from-ui-test | Rewrite as API/contract tests (auth broker, health, session contract) |
| Playwright `discovery` / `external` / `prod` | `playwright.discovery.config.ts`, `playwright.external.config.ts`, `playwright.prod.config.ts`, `e2e/discovery`, `e2e/external`, `e2e/prod` | foundation-behaviour-rewritten-from-ui-test (mixed, split) | UI assertions out of scope; foundation portion rewritten (see §6) |
| Playwright `build`; UI reference harness | `playwright.build.config.ts`, `tools/ui-reference-harness` | ui-ux-only-out-of-foundation-scope | Classified out of scope |
| Component unit tests | `apps/react-enterprise-app/src/tests`, `packages/ui-design-system/tests` | ui-ux-only-out-of-foundation-scope | Classified out of scope |

## 6. Foundation behaviours currently proven only via UI/Playwright — MUST be rewritten

These are `foundation-behaviour-rewritten-from-ui-test`. They are the highest-value rewrites and MUST become foundation-level (API / capability / port / adapter / contract / proof) tests under their domain children:

1. **Authorization / tenant isolation** (`e2e/discovery/persona-authz`, `persona-matrix`, `e2e/external/tenant-prod`) → API + RLS contract tests (cross-tenant access → 403; SQL/RLS rejection). → parity-tenant, parity-db.
2. **Authentication / identity broker flow** (`e2e/identity/broker-login`) → API integration tests (login → IdP redirect; callback → session; claim mapping). → parity-auth.
3. **Request instrumentation / observability** (`e2e/discovery/browser-bff-trace`, `e2e/prod/cross-cutting`) → API contract tests (every response carries request/trace IDs; correlation propagation). → parity-observability.
4. **HTTP security headers** (`e2e/prod/security-headers`) → API contract tests (CSP, X-Frame-Options, etc.). → parity-api.
5. **Cookie security** (`e2e/prod/cookie-security`) → API contract tests (secure, httponly, samesite). → parity-auth/parity-api.
6. **Error handling / safety** (`e2e/prod/error-handling`) → API tests (no stack trace / secret leakage). → parity-api.
7. **API response format** (`e2e/prod/api-contract`) → consolidate with API contract tests. → parity-api.
8. **Admin authorization gates** (`e2e/prod/admin-tools`) → API authorization contract tests. → parity-tenant/parity-api.

## 7. Completeness statement

This domain-level classification has: assigned a disposition to all 12 foundation domains (all `partial`, carried now by the umbrella blocker USF-133 plus USF-135/USF-136; per-domain children gated to an implementation directive); classified the UI/UX surface and the UI/Playwright tests so none disappears silently; and named the foundation behaviours that must be rewritten out of the browser layer. It does **not** claim item-level completeness — per-service/route/adapter/test enumeration is the initial deliverable of each domain child. No foundation domain is left `unknown-unclassified`. Full foundation parity readiness is **not** complete.
