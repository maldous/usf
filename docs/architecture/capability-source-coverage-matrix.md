# Capability and Source Coverage Matrix

| | |
|---|---|
| Document type | Architecture / semantic-source coverage matrix |
| Status | Draft / planning |
| Issue scope | USF-65 |
| Authority level | Reviewable planning artefact; subordinate to the Charter, Authority Model, ADRs, schemas, validators, proof evidence, and source import manifest |
| Historical evidence basis | `../react/docs/v2-foundation/v1-capability-closure.json`, `operational-semantics.json`, `event-semantics.json`, `cross-capability-interactions.json`, `ui-capability-model.json`, and the committed USF source import manifest |
| Repository state | No implementation/runtime code, no schema promotion, no proof execution |

## Purpose

This matrix turns the whole-platform V2 semantic-generation gap into a reviewable coverage plan. It inventories the 75 historical capability records and maps them to concrete USF semantic targets or explicit gaps so later semantic corpus expansion is driven by semantics rather than source resemblance.

This document creates no implementation files, imports no runtime code, executes no proof, emits no generated report, and promotes no schema to active.

## Coverage status reconciliation (post Wave-3)

The per-row USF-status values below were authored before the Wave-3 corpus completion and several still read `deferred` ("defer until a semantic target exists"). That predates the current corpus: every `semantic-contract` target in this matrix now has a committed instance — 64 complete-facet draft contracts (43 source-backed by manifest rows, 21 coverage-complete from the React semantic corpus; proof deferred), 1 deprecated, and 2 non-applicable (see `docs/architecture/semantic-source-use-closure-ledger.md`). Read a `deferred` row as "the semantic contract exists as a complete-facet draft; per-domain source-use disposition and fresh proof remain the open work," not as "no semantic target exists." Any `delivered-and-proven` note describes the historical `../react` state captured as lineage, not USF proof.

## Inputs

- Historical capability records: `../react/docs/v2-foundation/v1-capability-closure.json` (75 records).
- Historical operational semantic records: `../react/docs/v2-foundation/operational-semantics.json` (75 capability records and 92 command links).
- Historical event semantic records: `../react/docs/v2-foundation/event-semantics.json` (10 events).
- Historical cross-capability interaction records: `../react/docs/v2-foundation/cross-capability-interactions.json` (10 interactions).
- Historical UI capability model: `../react/docs/v2-foundation/ui-capability-model.json` (28 UI capabilities and 12 personas).
- USF baseline source import manifest: `spec/registries/source-import-manifest.json` (1673 rows).

## Coverage Summary

| Dimension | Count / status |
|---|---:|
| Historical capability domain `authentication` | 9 |
| Historical capability domain `compute-runtime` | 3 |
| Historical capability domain `configuration` | 6 |
| Historical capability domain `data-platform` | 6 |
| Historical capability domain `developer-platform` | 5 |
| Historical capability domain `entitlements-billing` | 4 |
| Historical capability domain `events-workflow` | 4 |
| Historical capability domain `foundation` | 11 |
| Historical capability domain `identity-access` | 13 |
| Historical capability domain `observability-ops` | 7 |
| Historical capability domain `search` | 1 |
| Historical capability domain `security-governance` | 3 |
| Historical capability domain `storage` | 1 |
| Historical capability domain `support-admin` | 2 |
| Source import manifest rows | 1673 |
| Slice-gated source rows selected here | 159 |
| Current authored semantic instances | 87 |

Manifest row distribution:

| Source kind | Rows |
|---|---:|
| `source-file` | 453 |
| `documentation` | 356 |
| `test` | 301 |
| `configuration-file` | 144 |
| `package` | 139 |
| `generated-report` | 118 |
| `proof-script` | 99 |
| `data-migration-artefact` | 36 |
| `semantic-artefact` | 14 |
| `e2e-journey` | 13 |

| Source role | Rows |
|---|---:|
| `behavioural-evidence` | 906 |
| `historical-lineage` | 356 |
| `configuration-evidence` | 144 |
| `generated-summary-evidence` | 118 |
| `proof-evidence` | 99 |
| `data-evidence` | 36 |
| `semantic-source` | 14 |

| Disposition | Rows |
|---|---:|
| `preserve` | 1083 |
| `replace` | 238 |
| `retire` | 227 |
| `refactor` | 104 |
| `rename` | 19 |
| `split` | 1 |
| `merge` | 1 |

Current semantic corpus inventory:

| Instance category | Files |
|---|---:|
| `ai-governance` | 2 |
| `audit-event` | 1 |
| `command` | 6 |
| `configuration` | 1 |
| `data-migration` | 1 |
| `environment` | 2 |
| `event-contract` | 1 |
| `interface-contract` | 1 |
| `observability-signal` | 1 |
| `provider-mode` | 1 |
| `semantic-contract` | 67 |
| `ui-semantic-model` | 1 |
| `workflow` | 2 |
| **Total** | **87** |

## Authentication Proof Substrate Boundary

This section records the authentication platform/login proof-substrate row set. It is not the V2 migration scope boundary. The exact source-row membership for this proof substrate is the manifest-backed set in Appendix A. Every row in that set maps to a concrete existing or planned semantic target. All implementation-relevant slices still require complete semantic/source-use closure before USF-39 can start.

Existing committed semantic targets for the current authentication proof substrate:

- `audit.authentication-login`
- `command.authentication-slice-proof`
- `command.validate-spec-all`
- `command.validate-spec-evidence`
- `command.validate-spec-pr`
- `command.validate-spec-real-instances`
- `command.validate-spec-selftest`
- `configuration.provider-mode-selector`
- `data.identity-schema`
- `environment.hermetic`
- `environment.production-shaped`
- `event.authentication-login-audit`
- `interface.authentication-login-api`
- `observability.authentication-login-audit`
- `provider-mode.mock-identity-provider`
- `semantic-contract.authentication-platform`
- `semantic-contract.rbac-roles-and-permissions`
- `semantic-contract.tenant-host-identity-resolution`
- `semantic-contract.tenant-identity-record-and-fqdn`
- `semantic-contract.user-identity-and-tenant-membership`
- `ui.authentication-login`
- `workflow.authentication-identity-context`
- `workflow.authentication-login`

The earlier proof-substrate semantic gap facets `stateModel`, `validation`, and `errorModel` on `semantic-contract.authentication-platform` are now marked complete in the committed semantic instance. That is semantic-normalisation progress only. Current authentication-slice proof freshness is carried by `proof-anchor-fabe47b` after USF-101 and USF-59; stronger multi-environment proof remains blocked by USF-73, and broader platform closure remains blocked by USF-97.

## Capability Matrix

| # | Domain | Capability | Slice | Semantic target | Required follow-up | Source/evidence summary |
|---:|---|---|---|---|---|---|
| 1 | `identity-access` | Tenant identity (record + FQDN) | proof-substrate | `semantic-contract.tenant-identity-record-and-fqdn; supports authentication-platform boundary` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=21; ops=yes; events=0; interactions=1; ui=0; proof=proof:domain-identity-matrix; proof:tenant-custom-domain-resolution |
| 2 | `identity-access` | User identity + tenant membership | proof-substrate | `semantic-contract.user-identity-and-tenant-membership; supports authentication-platform boundary` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=17; ops=yes; events=0; interactions=1; ui=0; proof=members unit + substrate tests |
| 3 | `identity-access` | End-user profile + preferences self-service | deferred | `semantic-contract.end-user-profile-and-preferences-self-service` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=3; ops=yes; events=0; interactions=0; ui=0; proof=proof:profile-self-service; proof:notification-dispatch |
| 4 | `identity-access` | API keys / personal access tokens | deferred | `semantic-contract.api-keys-personal-access-tokens` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=13; ops=yes; events=0; interactions=0; ui=0; proof=proof:api-keys; proof:api-key-routes |
| 5 | `identity-access` | Tenant groups | deferred | `semantic-contract.tenant-groups` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=0; ui=0; proof=proof:ui-semantic-groups (headless journey); groups unit tests |
| 6 | `identity-access` | Sub-organisations | deferred | `semantic-contract.sub-organisations` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=0; ui=0; proof=proof:ui-semantic-sub-organisations (headless journey); sub-organisations unit tests |
| 7 | `identity-access` | RBAC (roles + permissions) | proof-substrate | `semantic-contract.rbac-roles-and-permissions; supports authentication-platform boundary` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=members tests |
| 8 | `identity-access` | ABAC / Policy Decision Point | deferred | `semantic-contract.abac-policy-decision-point` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=16; ops=yes; events=0; interactions=0; ui=0; proof=authorize-resource unit tests; proof:entitlement-policy-chain |
| 9 | `identity-access` | Delegated administration roles | deferred | `semantic-contract.delegated-administration-roles` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=3; ops=yes; events=0; interactions=0; ui=0; proof=proof:delegated-admin |
| 10 | `identity-access` | Entitlement engine | deferred | `semantic-contract.entitlement-engine` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=1; ui=0; proof=proof:entitlements; proof:entitlement-policy-chain; proof:entitlements-postgres; proof:entitlements-routes |
| 11 | `identity-access` | Support-mode / break-glass access | deferred | `semantic-contract.support-mode-break-glass-access` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=6; ops=yes; events=0; interactions=1; ui=0; proof=support-mode unit tests; proof:support-approval |
| 12 | `identity-access` | Audit of privileged access | deferred | `semantic-contract.audit-of-privileged-access` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=1; ops=yes; events=0; interactions=1; ui=0; proof=audit unit tests |
| 13 | `authentication` | Platform login + session | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=7; ops=yes; events=0; interactions=0; ui=0; proof=auth-routes substrate tests; proof:auth-settings |
| 14 | `authentication` | IdP brokering + OIDC provider management | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=3; ops=yes; events=0; interactions=0; ui=0; proof=proof:auth-idps; proof:auth-oidc-enterprise |
| 15 | `authentication` | Claim mapping + group/role mapping | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=6; ops=yes; events=0; interactions=0; ui=0; proof=proof:ui-semantic-claim-mapping (headless journey); oidc-mapping unit tests |
| 16 | `authentication` | Real IdP login simulation | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=not-applicable-final; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=blocked |
| 17 | `authentication` | MFA + session policy + lockout | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=2; ops=yes; events=0; interactions=0; ui=0; proof=proof:auth-settings; test:platform-api:unit-safe; test:frontend:run |
| 18 | `configuration` | Configuration registry + history | deferred | `semantic-contract.configuration-registry-and-history` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=5; ops=yes; events=0; interactions=0; ui=0; proof=platform-config + config-contracts tests |
| 19 | `configuration` | Branding + theming | deferred | `semantic-contract.branding-and-theming` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=1; ops=yes; events=0; interactions=0; ui=0; proof=theme + platform-config tests |
| 20 | `configuration` | Custom domains, DNS ownership, TLS, canonical | deferred | `semantic-contract.custom-domains-dns-ownership-tls-canonical` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=11; ops=yes; events=0; interactions=0; ui=0; proof=proof:tenant-domains; proof:tenant-domain-canonical; proof:tenant-domain-claim-lifecycle; proof:tenant-domains-routing |
| 21 | `configuration` | Write-only secret settings | deferred | `semantic-contract.write-only-secret-settings` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=token-crypto + auth-settings-audit tests |
| 22 | `entitlements-billing` | Product catalog, plans, prices | deferred | `semantic-contract.product-catalog-plans-prices` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=9; ops=yes; events=0; interactions=0; ui=0; proof=proof:billing-catalog |
| 23 | `entitlements-billing` | Subscriptions, invoices, payment methods, dunning | deferred | `semantic-contract.subscriptions-invoices-payment-methods-dunning` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=1; ui=0; proof=proof:billing-provider; proof:lago-billing-provider |
| 24 | `entitlements-billing` | Usage metering + meter event ingestion | deferred | `semantic-contract.usage-metering-and-meter-event-ingestion` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=1; ui=0; proof=proof:metering; proof:metering-quota-routes |
| 25 | `entitlements-billing` | Quota enforcement | deferred | `semantic-contract.quota-enforcement` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=3; ops=yes; events=0; interactions=0; ui=0; proof=proof:quota-enforcement; proof:metering-quota-routes |
| 26 | `data-platform` | Relational storage + migrations + RLS | deferred | `semantic-contract.relational-storage-and-migrations-and-rls` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=postgres repository substrate tests |
| 27 | `data-platform` | Backup + restore | deferred | `semantic-contract.backup-and-restore` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:backup-local |
| 28 | `data-platform` | PITR, retention, legal hold, data residency | deferred | `semantic-contract.pitr-retention-legal-hold-data-residency` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=7; ops=yes; events=0; interactions=0; ui=0; proof=proof:pitr-restore-drill; proof:retention; proof:legal-hold; proof:data-residency |
| 29 | `data-platform` | Data governance: catalog, lineage, classification, PII, DSR/GDPR | deferred | `semantic-contract.data-governance-catalog-lineage-classification-pii-dsr-gdpr` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=2; ui=0; proof=proof:data-governance; apps/platform-api/tests/unit/data-governance.test.ts |
| 30 | `data-platform` | Tenant data import / export | deferred | `semantic-contract.tenant-data-import-export` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:data-portability |
| 31 | `search` | Search + indexing (product search) | deferred | `semantic-contract.search-and-indexing-product-search` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=0; ui=0; proof=proof:search; proof:search-isolation; proof:search-routes |
| 32 | `storage` | Object storage + tenant prefixes + signed URLs | deferred | `semantic-contract.object-storage-and-tenant-prefixes-and-signed-urls` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=8; ops=yes; events=0; interactions=1; ui=0; proof=proof:tenant-storage-objects |
| 33 | `events-workflow` | Event bus, durable queues, DLQ, redrive | deferred | `semantic-contract.event-bus-durable-queues-dlq-redrive` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=2; ui=0; proof=proof:event-bus; proof:event-redrive |
| 34 | `events-workflow` | Workflow engine, scheduled jobs, approvals | deferred | `semantic-contract.workflow-engine-scheduled-jobs-approvals` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=6; ops=yes; events=0; interactions=2; ui=0; proof=proof:workflow-provider-live |
| 35 | `events-workflow` | Scheduled jobs (built-in, on the event substrate) | deferred | `semantic-contract.scheduled-jobs-built-in-on-the-event-substrate` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=5; ops=yes; events=0; interactions=0; ui=0; proof=proof:scheduled-jobs; proof:scheduled-job-routes |
| 36 | `events-workflow` | Notification delivery + preferences + channels | deferred | `semantic-contract.notification-delivery-and-preferences-and-channels` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=5; ops=yes; events=0; interactions=1; ui=0; proof=proof:notification-preferences; proof:notification-dispatch; proof:notification-email-transport; proof:notification-webhook-transport; proof:notification-transport-routes |
| 37 | `compute-runtime` | Background workers / job runner | deferred | `semantic-contract.background-workers-job-runner` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=1; ops=yes; events=0; interactions=1; ui=0; proof=proof:event-worker |
| 38 | `compute-runtime` | Serverless / function runtime | deferred | `semantic-contract.serverless-function-runtime` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=not-applicable-final; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=not-yet-proven |
| 39 | `compute-runtime` | Runtime secrets management | deferred | `semantic-contract.runtime-secrets-management` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=5; ops=yes; events=0; interactions=0; ui=0; proof=proof:secret-store-contract; proof:secrets-openbao; proof:provider-secrets-readiness |
| 40 | `observability-ops` | Logs (aggregation + tenant-scoped search) | deferred | `semantic-contract.logs-aggregation-and-tenant-scoped-search` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=3; ops=yes; events=0; interactions=0; ui=0; proof=proof:tenant-observability; logs-usecase tests |
| 41 | `observability-ops` | Metrics + traces | deferred | `semantic-contract.metrics-and-traces` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=0; ui=0; proof=proof:metrics-prometheus; proof:dashboards |
| 42 | `observability-ops` | Alerting, incident management, on-call, status page | deferred | `semantic-contract.alerting-incident-management-on-call-status-page` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=superseded-by-proven-canonical; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:platform-services (readiness only) |
| 43 | `observability-ops` | Observability — built-in alerting + incidents | deferred | `semantic-contract.observability-built-in-alerting-and-incidents` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=6; ops=yes; events=0; interactions=0; ui=0; proof=proof:observability-signals; proof:alerting; proof:incident-foundation; proof:alert-notification-bridge |
| 44 | `observability-ops` | Internal service catalog + readiness | deferred | `semantic-contract.internal-service-catalog-and-readiness` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=5; ops=yes; events=0; interactions=1; ui=0; proof=proof:platform-services; proof:service-clickthrough-policy |
| 45 | `security-governance` | Code quality + secret + dependency scanning | deferred | `semantic-contract.code-quality-and-secret-and-dependency-scanning` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=semgrep:gate; npm audit; OSV scan |
| 46 | `security-governance` | Compliance reports, access reviews, evidence packs | deferred | `semantic-contract.compliance-reports-access-reviews-evidence-packs` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=1; ops=yes; events=0; interactions=0; ui=0; proof=proof:compliance-report |
| 47 | `security-governance` | Tenant isolation proof | deferred | `semantic-contract.tenant-isolation-proof` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:domain-identity-matrix; proof:tenant-storage isolation |
| 48 | `developer-platform` | Webhooks (developer-facing) | deferred | `semantic-contract.webhooks-developer-facing` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=12; ops=yes; events=2; interactions=1; ui=0; proof=proof:webhooks; proof:webhook-redrive |
| 49 | `developer-platform` | API docs, developer portal, SDKs, rate limits | deferred | `semantic-contract.api-docs-developer-portal-sdks-rate-limits` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=2; ops=yes; events=0; interactions=0; ui=0; proof=openapi:drift (not complete) |
| 50 | `developer-platform` | Rate limiting (API) | deferred | `semantic-contract.rate-limiting-api` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=3; ops=yes; events=0; interactions=0; ui=0; proof=proof:rate-limits; proof:rate-limits-redis; proof:api-key-routes |
| 51 | `developer-platform` | Mock providers (dev/test) | deferred | `semantic-contract.mock-providers-dev-test` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=not-applicable-final; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=service readiness |
| 52 | `support-admin` | Tenant lifecycle: provision, suspend, delete, export | deferred | `semantic-contract.tenant-lifecycle-provision-suspend-delete-export` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=1; ui=0; proof=proof:tenant-lifecycle; apps/platform-api/tests/unit/tenant-lifecycle.test.ts |
| 53 | `support-admin` | Support tickets, customer health, announcements | deferred | `semantic-contract.support-tickets-customer-health-announcements` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=support tickets / customer health tests |
| 54 | `foundation` | Universal Service Foundation scope + principles | deferred | `semantic-contract.universal-service-foundation-scope-and-principles` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=this matrix + registry + validation test |
| 55 | `foundation` | Build-versus-compose decision framework | deferred | `semantic-contract.build-versus-compose-decision-framework` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=docs/architecture/build-versus-compose-decision-framework.md |
| 56 | `foundation` | Service catalog + provider integration model | deferred | `semantic-contract.service-catalog-and-provider-integration-model` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=2; ops=yes; events=0; interactions=0; ui=0; proof=proof:platform-services; proof:service-clickthrough-policy; proof:service-catalog-registry; proof:entitlements-routes |
| 57 | `foundation` | Environment-specific vs shared service model | deferred | `semantic-contract.environment-specific-vs-shared-service-model` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=docs/architecture/environment-service-classification.md |
| 58 | `foundation` | Provider configuration plane | deferred | `semantic-contract.provider-configuration-plane` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=4; ops=yes; events=0; interactions=0; ui=0; proof=proof:provider-config; proof:provider-readiness-contract |
| 59 | `foundation` | Composed provider readiness spine | deferred | `semantic-contract.composed-provider-readiness-spine` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=1; ops=yes; events=0; interactions=1; ui=0; proof=proof:composed-provider-readiness |
| 60 | `data-platform` | History read-model (read-only projection) | deferred | `semantic-contract.history-read-model-read-only-projection` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=2; ops=yes; events=0; interactions=0; ui=0; proof=proof:history |
| 61 | `authentication` | OIDC discovery / issuer / JWKS validation | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:auth-oidc-enterprise |
| 62 | `authentication` | OIDC test connection + callback display | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:auth-oidc-enterprise |
| 63 | `authentication` | OIDC login simulation | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=not-applicable-final; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=blocked |
| 64 | `identity-access` | Tenant host identity resolution | proof-substrate | `semantic-contract.tenant-host-identity-resolution; supports authentication-platform boundary` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:domain-identity-matrix; proof:tenant-custom-domain-resolution |
| 65 | `configuration` | Tenant domain activation (auth-client) | deferred | `semantic-contract.tenant-domain-activation-auth-client` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:tenant-domain-canonical |
| 66 | `configuration` | Tenant canonical domain set/unset | deferred | `semantic-contract.tenant-canonical-domain-set-unset` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:tenant-domain-canonical (local routing only) |
| 67 | `authentication` | Tenant custom-domain auth callback | proof-substrate | `semantic-contract.authentication-platform` | USF-66 closes proof-substrate gaps; USF-58 authors missing child instances; USF-64 records per-file use policy. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:tenant-custom-domain-auth-origin |
| 68 | `observability-ops` | Tenant service clickthrough policy | deferred | `semantic-contract.tenant-service-clickthrough-policy` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=1; ops=yes; events=0; interactions=0; ui=0; proof=proof:service-clickthrough-policy; proof:clickthrough |
| 69 | `foundation` | Environment registry + bootstrap | deferred | `semantic-contract.environment-registry-and-bootstrap` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:environment-registry; proof:environment-admin-bootstrap; proof:environment-operations |
| 70 | `foundation` | Provider environment classification | deferred | `semantic-contract.provider-environment-classification` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=proof:provider-environment-classification |
| 71 | `foundation` | E2E confidence ladder (stage-aware) | deferred | `semantic-contract.e2e-confidence-ladder-stage-aware` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=1; ops=yes; events=0; interactions=0; ui=0; proof=make all (e2e gates) |
| 72 | `developer-platform` | OpenAPI drift hard gate | deferred | `semantic-contract.openapi-drift-hard-gate` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=validate-openapi-drift --strict |
| 73 | `foundation` | i18n runtime + validation | deferred | `semantic-contract.i18n-runtime-and-validation` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=validate-i18n; packages/i18n-runtime/tests/react.test.tsx |
| 74 | `foundation` | Accessibility (a11y) gate | deferred | `semantic-contract.accessibility-a11y-gate` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=e2e accessibility spec |
| 75 | `observability-ops` | Browser telemetry (Grafana Faro RUM + browser-to-BFF tracing) | deferred | `semantic-contract.browser-telemetry-grafana-faro-rum-and-browser-to-bff-tracing` | USF-58 expansion; USF-74 sub-manifest; defer implementation until semantic target exists. | status=delivered-and-proven; routes=0; ops=yes; events=0; interactions=0; ui=0; proof=e2e/discovery/browser-bff-trace.spec.ts (react-enterprise-app + platform-api in one Tempo trace, force-flushed); observability-correlation ladder (ADR-ACT-0285) |

## Gap Classification

| Gap | Classification | Rationale | Downstream issue |
|---|---|---|---|
| Slice-gated authentication state model, validation, and error model are semantically normalised but not fresh-proof ready. | readiness-blocking | Current `semantic-contract.authentication-platform` marks these facets complete, but committed proof evidence is stale for current readiness and stronger provider/environment postures remain unproven. | USF-101, USF-59, USF-73, USF-98 |
| Most historical capability contracts are represented only as deferred/gap semantic-contract instances. | blocking for broad generation; deferred for proof-substrate scope | The repository currently has 67 semantic-contract instances and 87 total semantic corpus instances. The 67 semantic-contract targets named by this matrix are represented, but most non-authentication targets intentionally remain deferred gap contracts rather than source-backed complete facets. | USF-97 |
| Baseline manifest `targetUsfConcept` values are broad concepts such as Source Reference, Proof, Package / Module, and Configuration. | blocking for extraction targeting | Implementation extraction needs concrete semantic targets and per-slice row membership. | USF-74 and USF-64 |
| Source-use policy exists for the authentication slice but not for full platform closure. | blocking for broad implementation | `docs/architecture/authentication-slice-source-use-disposition-matrix.md` records 159 authentication slice rows with zero direct runtime-copy permission. Equivalent source-use ledgers do not yet exist for the remaining implementation-relevant domains. | USF-97 |
| Fresh commit-pinned proof for the future extracted slice does not yet exist. | blocking for readiness claims | Historical proof is lineage; generated reports and stale evidence cannot prove current readiness. | USF-59 / USF-73 |
| Schema and validator active posture remains a decision, not a fact. | deferred decision | No schema is active and the validator remains advisory until explicitly promoted. | USF-67 |
| Historical capabilities marked not-applicable-final are not implementation extraction targets. | non-applicable | These rows preserve historical lineage and explicit no-loss disposition, but they must not drive generated implementation until a later semantic decision changes their applicability. | USF-58 |

## Appendix A: Authentication Proof-Substrate Source Rows

These are the exact manifest-backed source rows selected by this matrix for the authentication platform/login proof-substrate scope. Each maps to a concrete semantic target; rows are not permission to import runtime code.

| # | Source path | Source kind | Source role | Disposition | Concrete semantic target |
|---:|---|---|---|---|---|
| 1 | `.claude/skills/auth-redaction-review/SKILL.md` | `documentation` | `historical-lineage` | `preserve` | `semantic-contract.authentication-platform` |
| 2 | `apps/platform-api/scripts/auth-settings-runtime-proof.ts` | `proof-script` | `proof-evidence` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 3 | `apps/platform-api/scripts/composed-provider-readiness-runtime-proof.ts` | `proof-script` | `proof-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 4 | `apps/platform-api/scripts/domain-identity-matrix-runtime-proof.ts` | `proof-script` | `proof-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 5 | `apps/platform-api/scripts/observability-signals-runtime-proof.ts` | `proof-script` | `proof-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 6 | `apps/platform-api/scripts/oidc-enterprise-runtime-proof.ts` | `proof-script` | `proof-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 7 | `apps/platform-api/scripts/provider-environment-classification-runtime-proof.ts` | `proof-script` | `proof-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 8 | `apps/platform-api/scripts/tenant-custom-domain-auth-origin-runtime-proof.ts` | `proof-script` | `proof-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 9 | `apps/platform-api/src/db/migrations/001-identity-schema.sql` | `data-migration-artefact` | `data-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 10 | `apps/platform-api/src/db/migrations/004-rls-policies.sql` | `data-migration-artefact` | `data-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 11 | `apps/platform-api/src/db/migrations/009-tenant-auth-settings-credentials.sql` | `data-migration-artefact` | `data-evidence` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 12 | `apps/platform-api/src/db/migrations/016-membership-identity-v2.sql` | `data-migration-artefact` | `data-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 13 | `apps/platform-api/src/db/migrations/017-auth-settings-credential-lifecycle.sql` | `data-migration-artefact` | `data-evidence` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 14 | `apps/platform-api/src/ports/identity-repository.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 15 | `apps/platform-api/src/server/auth-providers.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 16 | `apps/platform-api/src/server/auth.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 17 | `apps/platform-api/src/server/authorize-resource.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform permissions facet` |
| 18 | `apps/platform-api/src/server/forward-auth.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 19 | `apps/platform-api/src/server/observability.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 20 | `apps/platform-api/src/server/oidc-http-fetcher.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 21 | `apps/platform-api/src/server/routes.ts` | `source-file` | `behavioural-evidence` | `split` | `interface.authentication-login-api; planned interface.authentication-auth-admin` |
| 22 | `apps/platform-api/src/server/session.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 23 | `apps/platform-api/src/usecases/audit.ts` | `source-file` | `behavioural-evidence` | `preserve` | `audit.authentication-login / event.authentication-login-audit` |
| 24 | `apps/platform-api/src/usecases/auth-provider-config.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 25 | `apps/platform-api/src/usecases/auth-settings-readiness.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 26 | `apps/platform-api/src/usecases/auth-settings.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 27 | `apps/platform-api/src/usecases/auth.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 28 | `apps/platform-api/src/usecases/oidc-discovery.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 29 | `apps/platform-api/tests/substrate/auth-routes.test.ts` | `test` | `behavioural-evidence` | `preserve` | `interface.authentication-login-api; planned interface.authentication-auth-admin` |
| 30 | `apps/platform-api/tests/substrate/postgres-identity-repository.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 31 | `apps/platform-api/tests/substrate/session-fixture.test.ts` | `test` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 32 | `apps/platform-api/tests/unit/auth-provider-config.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 33 | `apps/platform-api/tests/unit/auth-providers.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 34 | `apps/platform-api/tests/unit/auth-settings-audit.test.ts` | `test` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 35 | `apps/platform-api/tests/unit/auth-settings-readiness.test.ts` | `test` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 36 | `apps/platform-api/tests/unit/auth-usecase.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 37 | `apps/platform-api/tests/unit/authorize-resource.test.ts` | `test` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform permissions facet` |
| 38 | `apps/platform-api/tests/unit/forward-auth.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 39 | `apps/platform-api/tests/unit/keycloak-mapper-readiness.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 40 | `apps/platform-api/tests/unit/oidc-discovery.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 41 | `apps/platform-api/tests/unit/oidc-mapping.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 42 | `apps/react-enterprise-app/src/auth/login-providers.ts` | `source-file` | `behavioural-evidence` | `preserve` | `ui.authentication-login / interface.authentication-login-api` |
| 43 | `apps/react-enterprise-app/src/components/AuthenticatedLayout.tsx` | `source-file` | `behavioural-evidence` | `replace` | `semantic-contract.authentication-platform` |
| 44 | `apps/react-enterprise-app/src/components/RequirePermission.tsx` | `source-file` | `behavioural-evidence` | `refactor` | `semantic-contract.authentication-platform permissions facet` |
| 45 | `apps/react-enterprise-app/src/features/admin-auth/AdminAuthPage.tsx` | `source-file` | `behavioural-evidence` | `replace` | `semantic-contract.authentication-platform` |
| 46 | `apps/react-enterprise-app/src/features/admin-auth/IdpManager.tsx` | `source-file` | `behavioural-evidence` | `replace` | `semantic-contract.authentication-platform` |
| 47 | `apps/react-enterprise-app/src/features/admin-auth/__tests__/AdminAuthPage.test.tsx` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 48 | `apps/react-enterprise-app/src/features/admin-auth/__tests__/IdpManager.oidc.test.tsx` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 49 | `apps/react-enterprise-app/src/features/admin-auth/admin-auth-client.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 50 | `apps/react-enterprise-app/src/features/admin-auth/use-admin-auth.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 51 | `apps/react-enterprise-app/src/hooks/use-session.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 52 | `apps/react-enterprise-app/src/msw/fixtures/session.ts` | `test` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 53 | `apps/react-enterprise-app/src/routes/__tests__/login.test.tsx` | `test` | `behavioural-evidence` | `preserve` | `interface.authentication-login-api; planned interface.authentication-auth-admin` |
| 54 | `apps/react-enterprise-app/src/routes/_authenticated.tsx` | `source-file` | `behavioural-evidence` | `preserve` | `interface.authentication-login-api; planned interface.authentication-auth-admin` |
| 55 | `apps/react-enterprise-app/src/routes/admin/auth.tsx` | `source-file` | `behavioural-evidence` | `replace` | `interface.authentication-login-api; planned interface.authentication-auth-admin` |
| 56 | `apps/react-enterprise-app/src/routes/login.tsx` | `source-file` | `behavioural-evidence` | `replace` | `interface.authentication-login-api; planned interface.authentication-auth-admin` |
| 57 | `apps/react-enterprise-app/src/tests/substrate/authenticated-layout.test.tsx` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 58 | `apps/react-enterprise-app/src/tests/use-session.test.ts` | `test` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 59 | `docker/keycloak/themes/platform/login/error.ftl` | `source-file` | `behavioural-evidence` | `preserve` | `ui.authentication-login / interface.authentication-login-api` |
| 60 | `docker/keycloak/themes/platform/login/login.ftl` | `source-file` | `behavioural-evidence` | `preserve` | `ui.authentication-login / interface.authentication-login-api` |
| 61 | `docker/keycloak/themes/platform/login/resources/css/brand-6.css` | `source-file` | `behavioural-evidence` | `rename` | `ui.authentication-login / interface.authentication-login-api` |
| 62 | `docker/keycloak/themes/platform/login/theme.properties` | `configuration-file` | `configuration-evidence` | `refactor` | `ui.authentication-login / interface.authentication-login-api` |
| 63 | `docs/adr/0021-define-identity-tenancy-roles-and-permissions-model.md` | `documentation` | `historical-lineage` | `preserve` | `semantic-contract.authentication-platform permissions facet` |
| 64 | `docs/adr/0022-define-authentication-session-and-sso-integration-boundary.md` | `documentation` | `historical-lineage` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 65 | `docs/adr/0030-define-dynamic-authorisation-and-tenant-admin-self-service.md` | `documentation` | `historical-lineage` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 66 | `docs/adr/0037-per-tenant-authentication-provider-configuration.md` | `documentation` | `historical-lineage` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 67 | `docs/adr/0038-tenant-identity-and-membership-v2.md` | `documentation` | `historical-lineage` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 68 | `docs/adr/0041-per-tenant-auth-settings-credential-provisioning.md` | `documentation` | `historical-lineage` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 69 | `docs/adr/0042-writable-mfa-policy-and-auth-settings-runtime-proof.md` | `documentation` | `historical-lineage` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 70 | `docs/adr/0044-auth-settings-credential-lifecycle.md` | `documentation` | `historical-lineage` | `preserve` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 71 | `docs/adr/0046-oidc-enterprise-hardening.md` | `documentation` | `historical-lineage` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 72 | `docs/adr/0073-composed-service-sso-via-keycloak-oidc.md` | `documentation` | `historical-lineage` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 73 | `docs/api/openapi.json` | `semantic-artefact` | `semantic-source` | `preserve` | `interface.authentication-login-api; planned interface.authentication-auth-admin` |
| 74 | `docs/evidence/auth/auth-settings-credential-lifecycle.md` | `documentation` | `historical-lineage` | `retire` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 75 | `docs/evidence/auth/custom-domain-auth-origin.md` | `documentation` | `historical-lineage` | `retire` | `semantic-contract.authentication-platform` |
| 76 | `docs/evidence/auth/oidc-enterprise-hardening.md` | `documentation` | `historical-lineage` | `retire` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 77 | `docs/evidence/auth/oidc-login-mapping-proof.md` | `documentation` | `historical-lineage` | `retire` | `ui.authentication-login / interface.authentication-login-api` |
| 78 | `docs/evidence/auth/per-tenant-auth-settings-credential-provisioning.md` | `documentation` | `historical-lineage` | `retire` | `semantic-contract.authentication-platform / configuration.provider-mode-selector` |
| 79 | `docs/evidence/auth/real-keycloak-login.md` | `documentation` | `historical-lineage` | `retire` | `ui.authentication-login / interface.authentication-login-api` |
| 80 | `docs/evidence/auth/writable-idp-management-secret-redaction.md` | `documentation` | `historical-lineage` | `retire` | `semantic-contract.authentication-platform` |
| 81 | `docs/evidence/auth/writable-mfa-policy-and-runtime-proof.md` | `documentation` | `historical-lineage` | `retire` | `planned proof-evidence.authentication-platform` |
| 82 | `docs/evidence/identity/identity-access-baseline.json` | `generated-report` | `generated-summary-evidence` | `retire` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 83 | `docs/evidence/identity/identity-access-baseline.md` | `documentation` | `historical-lineage` | `retire` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 84 | `docs/evidence/identity/keycloak-login-callback.json` | `generated-report` | `generated-summary-evidence` | `retire` | `ui.authentication-login / interface.authentication-login-api` |
| 85 | `docs/evidence/identity/keycloak-login-callback.md` | `documentation` | `historical-lineage` | `retire` | `ui.authentication-login / interface.authentication-login-api` |
| 86 | `docs/evidence/identity/keycloak-provisioning-baseline.json` | `generated-report` | `generated-summary-evidence` | `retire` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 87 | `docs/evidence/identity/keycloak-provisioning-baseline.md` | `documentation` | `historical-lineage` | `retire` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 88 | `docs/evidence/identity/tenant-identity-membership-v2.md` | `documentation` | `historical-lineage` | `rename` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 89 | `docs/evidence/infrastructure/mock-oidc-broker-tests.md` | `documentation` | `historical-lineage` | `retire` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 90 | `docs/evidence/platform/domain-identity-capability-permutation-review.md` | `documentation` | `historical-lineage` | `retire` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 91 | `docs/local-development/mock-identity.md` | `documentation` | `historical-lineage` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 92 | `docs/local-development/real-login-e2e.md` | `documentation` | `historical-lineage` | `preserve` | `ui.authentication-login / interface.authentication-login-api` |
| 93 | `docs/specs/2026-05-29-keycloak-auth-e2e.md` | `semantic-artefact` | `semantic-source` | `retire` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 94 | `e2e/discovery/persona-authz.spec.ts` | `e2e-journey` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 95 | `e2e/external/auth-negative.spec.ts` | `e2e-journey` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 96 | `e2e/external/login.spec.ts` | `e2e-journey` | `behavioural-evidence` | `preserve` | `ui.authentication-login / interface.authentication-login-api` |
| 97 | `e2e/identity/broker-login.spec.ts` | `e2e-journey` | `behavioural-evidence` | `preserve` | `ui.authentication-login / interface.authentication-login-api` |
| 98 | `e2e/identity/global-setup.ts` | `test` | `behavioural-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 99 | `e2e/identity/redirect-merge.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 100 | `e2e/identity/redirect-merge.ts` | `test` | `behavioural-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 101 | `infra/modules/ci-oidc/README.md` | `documentation` | `historical-lineage` | `replace` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 102 | `infra/modules/ci-oidc/main.tf` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 103 | `infra/modules/ci-oidc/outputs.tf` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 104 | `infra/modules/ci-oidc/variables.tf` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 105 | `infra/modules/keycloak/README.md` | `documentation` | `historical-lineage` | `replace` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 106 | `infra/modules/keycloak/main.tf` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 107 | `infra/modules/keycloak/outputs.tf` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 108 | `infra/modules/keycloak/variables.tf` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 109 | `infra/modules/keycloak/versions.tf` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 110 | `packages/adapters-keycloak/README.md` | `documentation` | `historical-lineage` | `replace` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 111 | `packages/adapters-keycloak/package.json` | `package` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 112 | `packages/adapters-keycloak/src/index.ts` | `source-file` | `behavioural-evidence` | `refactor` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 113 | `packages/adapters-keycloak/tests/.gitkeep` | `configuration-file` | `configuration-evidence` | `retire` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 114 | `packages/adapters-keycloak/tests/adapters-keycloak.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 115 | `packages/adapters-keycloak/tsconfig.json` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 116 | `packages/adapters-postgres/src/postgres-identity-repository.ts` | `source-file` | `behavioural-evidence` | `refactor` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 117 | `packages/authorisation-runtime/README.md` | `documentation` | `historical-lineage` | `replace` | `semantic-contract.authentication-platform` |
| 118 | `packages/authorisation-runtime/package.json` | `package` | `behavioural-evidence` | `refactor` | `semantic-contract.authentication-platform` |
| 119 | `packages/authorisation-runtime/src/index.ts` | `source-file` | `behavioural-evidence` | `refactor` | `semantic-contract.authentication-platform` |
| 120 | `packages/authorisation-runtime/tests/authorisation-runtime.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 121 | `packages/authorisation-runtime/tsconfig.json` | `configuration-file` | `configuration-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 122 | `packages/contracts-auth/README.md` | `documentation` | `historical-lineage` | `replace` | `semantic-contract.authentication-platform` |
| 123 | `packages/contracts-auth/package.json` | `package` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 124 | `packages/contracts-auth/src/index.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 125 | `packages/contracts-auth/tests/contracts-auth.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 126 | `packages/contracts-auth/tsconfig.json` | `configuration-file` | `configuration-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 127 | `packages/domain-identity/README.md` | `documentation` | `historical-lineage` | `replace` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 128 | `packages/domain-identity/package.json` | `package` | `behavioural-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 129 | `packages/domain-identity/src/index.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 130 | `packages/domain-identity/tests/domain-identity.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 131 | `packages/domain-identity/tsconfig.json` | `configuration-file` | `configuration-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 132 | `packages/platform-errors/tests/platform-errors-auth.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 133 | `packages/security-auth/README.md` | `generated-report` | `generated-summary-evidence` | `replace` | `semantic-contract.authentication-platform` |
| 134 | `packages/security-auth/package.json` | `package` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 135 | `packages/security-auth/src/index.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform` |
| 136 | `packages/security-auth/tests/.gitkeep` | `documentation` | `historical-lineage` | `retire` | `planned proof-evidence.authentication-platform` |
| 137 | `packages/security-auth/tests/security-auth.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned proof-evidence.authentication-platform` |
| 138 | `packages/session-runtime/README.md` | `generated-report` | `generated-summary-evidence` | `replace` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 139 | `packages/session-runtime/package.json` | `package` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 140 | `packages/session-runtime/src/index.ts` | `source-file` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 141 | `packages/session-runtime/tests/.gitkeep` | `documentation` | `historical-lineage` | `retire` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 142 | `packages/session-runtime/tests/session-runtime.test.ts` | `test` | `behavioural-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 143 | `packages/session-runtime/tsconfig.json` | `configuration-file` | `configuration-evidence` | `preserve` | `semantic-contract.authentication-platform stateModel; planned workflow.authentication-session` |
| 144 | `playwright.identity.config.ts` | `configuration-file` | `configuration-evidence` | `preserve` | `planned semantic-contract.identity-access; semantic-contract.authentication-platform` |
| 145 | `scripts/keycloak/provision-bff-authz.sh` | `proof-script` | `proof-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 146 | `scripts/sonar/provision-oidc.sh` | `proof-script` | `proof-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 147 | `scripts/tests/tests/sonar-oidc-honesty.test.mjs` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 148 | `services/mock-oidc/Dockerfile` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 149 | `services/mock-oidc/README.md` | `documentation` | `historical-lineage` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 150 | `services/mock-oidc/package-lock.json` | `generated-report` | `generated-summary-evidence` | `replace` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 151 | `services/mock-oidc/package.json` | `package` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 152 | `services/mock-oidc/src/config.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 153 | `services/mock-oidc/src/logger.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 154 | `services/mock-oidc/src/providers.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 155 | `services/mock-oidc/src/scenarios.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 156 | `services/mock-oidc/src/server.test.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 157 | `services/mock-oidc/src/server.ts` | `source-file` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 158 | `services/mock-oidc/src/users.ts` | `test` | `behavioural-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |
| 159 | `services/mock-oidc/tsconfig.json` | `configuration-file` | `configuration-evidence` | `preserve` | `planned provider-mode.identity-provider; planned interface.authentication-oidc-provider` |

## Appendix B: Matrix Rules for Downstream Work

- USF-58 may author semantic instances from this matrix, but must preserve source references and validate through `validate-spec instances` and `validate-spec real-instances`.
- USF-74 must turn the proof-substrate source rows into a per-domain sub-manifest or an equivalent exact row-membership artefact.
- USF-64 must record source-use policy per proof-substrate row; `preserve`, `refactor`, or `replace` in the baseline manifest is not by itself permission to copy or adapt code.
- USF-39 remains blocked until semantic targets, source-use policy, directory authorization, proof posture, schema posture, report policy, validator guardrails, and the implementation directive are all closed.
- Source paths remain historical evidence. They must not dictate USF target paths.

## Validation Expectations

- Strict JSON parse remains required for the source import manifest and all catalogues.
- `python3 tools/validate-spec/validate-spec.py all --json` must remain clean.
- `python3 tools/validate-spec/validate-spec.py real-instances --json` must remain clean.
- This document is reviewable planning evidence only; it is not a generated report and does not define implementation authority.
