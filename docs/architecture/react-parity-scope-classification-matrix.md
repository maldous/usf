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

Each domain below is foundation-relevant. The `usf_status` reflects the **full-parity** bar (not the narrower bootstrap scope). "Bootstrap" notes record what USF-39 already migrated at local dev/test scope. At this planning stage the domain-level `partial` set is carried by the umbrella blocker **USF-133** (with **USF-135** for parity-enforcement and **USF-136** for `requires-human-decision` items); none is a markdown-only blocker. The per-domain children named in the "Planned child" column are **not created yet** — they are created only after a human-approved implementation directive (`full-parity-linear-tracking-plan.md` §2), so their absence does not make this matrix non-compliant (see directive §4.1). Exceptions: the **DB / RLS / migrations** domain (row 9) is authorised and implemented under **USF-138** (deferred depth in **USF-139**); and the **tenant isolation + RBAC/ABAC** domain (row 2) is authorised and implemented under **USF-140** (deferred authorization depth in **USF-141**). Their carriers are the item-level USF-139 / USF-141, not USF-133.

| # | Domain | category | Key historical items | usf_status | Bootstrap already migrated? | semantic_authority | Planned child (gated) | Substrate refs |
|---|---|---|---|---|---|---|---|---|
| 1 | Auth / identity | service, port, adapter, route | Keycloak/OIDC brokering, session cookies, claim/role mapping, credential lifecycle, JWKS/discovery | partial | Yes — in-memory IdP + hermetic auth proof (L3–L4) | known | parity-auth | capability-source-coverage; auth-slice disposition matrix |
| 2 | Tenant isolation + RBAC/ABAC | service, adapter, schema | Tenant context, application-layer PDP (RBAC+ABAC, default-deny), membership lifecycle, break-glass, decision audit; identity-not-authorization; RLS backstop | partial (authorised; core migrated, deferred depth in USF-141) | Yes — PDP + RBAC/ABAC + break-glass + PDP/RLS consistency proof + validate-authz (USF-140) | known (ADR 0010) | USF-140 (core) + USF-141 (deferred) | tenant-authorization-standard; ADR 0010; `tenant-*`, `abac-*` instances |
| 3 | Audit / evidence / events | service, event, adapter | audit recording, contextual query, redaction, event bus (durable queues, DLQ, redrive) | partial | Yes — audit/event capture | known | parity-audit | `audit-*`, `event-bus-*` instances |
| 4 | Config + secrets | config, adapter | runtime config registry/history, provider config plane, OpenBao secrets, write-only settings | partial | Yes — config wiring; in-memory secrets | known | parity-config | `configuration-*`, `runtime-secrets-*` instances |
| 5 | Files / storage | port, adapter | S3-compatible object storage (MinIO/AWS), tenant prefixes, signed URLs, data governance | partial | Yes — in-memory store | known | parity-files | `object-storage-*`, `data-governance-*` instances |
| 6 | Jobs / workflows / scheduling | job, workflow | Temporal + Windmill orchestration, scheduled jobs, approval workflows, state machines | partial | Yes — job/notify surface | known (jobs); unclear (workflow-engine choice parity) | parity-jobs | `workflow-engine-*`, `scheduled-jobs-*`, `background-workers-*` instances |
| 7 | Notifications | service, adapter | multi-transport (SMTP/Brevo/webhook), preferences, channels, dispatcher | partial | Yes — notify surface | known | parity-notify | `notification-delivery-*`, `webhooks-*` instances |
| 8 | API routes / controllers + OpenAPI | route, contract | 50+ REST routes, GraphQL federation, typed contracts, OpenAPI drift gate | partial | Yes — bootstrap routes + OpenAPI | known | parity-api | `openapi-drift-hard-gate`, `api-docs-*`, interface-contract instances |
| 9 | DB / RLS / migrations | schema, migration | PostgreSQL 16, forward-only checksummed migrations, per-tenant RLS, enterprise persistence metadata/classification + lifecycle/append-only/legal-hold integrity | partial (authorised; core migrated, deferred depth in USF-139) | Yes — live composed-Postgres real-app-role isolation proof + standard + validate-db (USF-138) | known | USF-138 (core) + USF-139 (deferred) | enterprise-persistence standard; classification registry; `relational-storage-and-migrations-and-rls` |
| 10 | Provider adapters / modes | adapter, provider | ~15 pluggable providers (identity, observability, workflow, billing, storage, backup, antivirus); provider-mode selector | partial | Yes — in-memory/hermetic adapters | known | parity-providers | `provider-configuration-plane`, `provider-environment-classification`, `service-catalog-*` |
| 11 | Observability | observability | OTEL traces, Prometheus metrics, Loki logs, Tempo, Grafana, Sentry, alerting/incidents | partial | Minimal at bootstrap | known | parity-observability | `metrics-and-traces`, `logs-aggregation-*`, `alerting-incident-*` instances; observability proof-slice plan |
| 12 | Developer commands + proof tooling | command, proof | confidence ladder (dev→test→staging→prod), make targets, proof scripts, readiness gates | partial | Yes — `make verify`/`dev-smoke` + validators | known | parity-commands | command-operational-coverage plan; proof-tool-contract-standard |

Domain count: **12 foundation domains, all `partial`** for the full-parity bar (semantics present; per-domain source-use, implementation, and fresh proof are the open work). No domain is `covered`/`migrated` at full-parity scope yet; none is silently `missing`. `requires-human-decision` flags are recorded inline (ABAC policy-engine specifics; workflow-engine parity choice) and carried into their domain children.

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
