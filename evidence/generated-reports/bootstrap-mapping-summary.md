# Bootstrap Mapping Summary

| | |
|---|---|
| Document type | Generated review summary |
| Authority | Review-only generated report; per-contract JSON mappings are authoritative |
| Source | `spec/instances/bootstrap-mapping/` |
| Mapping count | 67 |

This generated Markdown summary is for human review only. It does not define USF semantic authority, does not start USF-39, does not create implementation paths, and does not claim staging, production, live-external-provider, or production-live readiness.

## Domain Counts

| Capability domain | Mappings |
|---|---:|
| `authentication` | 1 |
| `compute-runtime` | 3 |
| `configuration` | 6 |
| `data-platform` | 6 |
| `developer-platform` | 5 |
| `entitlements-billing` | 4 |
| `events-workflow` | 4 |
| `foundation` | 11 |
| `identity-access` | 13 |
| `observability-ops` | 7 |
| `search` | 1 |
| `security-governance` | 3 |
| `storage` | 1 |
| `support-admin` | 2 |

## Mapping Inventory

| Semantic contract | Domain | Mapping status | Blockers | Deferrals | Persistent object expectations |
|---|---|---|---:|---:|---:|
| `semantic-contract.authentication-platform` | `authentication` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.background-workers-job-runner` | `compute-runtime` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.runtime-secrets-management` | `compute-runtime` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.serverless-function-runtime` | `compute-runtime` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.branding-and-theming` | `configuration` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.configuration-registry-and-history` | `configuration` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.custom-domains-dns-ownership-tls-canonical` | `configuration` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-canonical-domain-set-unset` | `configuration` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-domain-activation-auth-client` | `configuration` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.write-only-secret-settings` | `configuration` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.backup-and-restore` | `data-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.data-governance-catalog-lineage-classification-pii-dsr-gdpr` | `data-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.history-read-model-read-only-projection` | `data-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.pitr-retention-legal-hold-data-residency` | `data-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.relational-storage-and-migrations-and-rls` | `data-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-data-import-export` | `data-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.api-docs-developer-portal-sdks-rate-limits` | `developer-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.mock-providers-dev-test` | `developer-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.openapi-drift-hard-gate` | `developer-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.rate-limiting-api` | `developer-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.webhooks-developer-facing` | `developer-platform` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.product-catalog-plans-prices` | `entitlements-billing` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.quota-enforcement` | `entitlements-billing` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.subscriptions-invoices-payment-methods-dunning` | `entitlements-billing` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.usage-metering-and-meter-event-ingestion` | `entitlements-billing` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.event-bus-durable-queues-dlq-redrive` | `events-workflow` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.notification-delivery-and-preferences-and-channels` | `events-workflow` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.scheduled-jobs-built-in-on-the-event-substrate` | `events-workflow` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.workflow-engine-scheduled-jobs-approvals` | `events-workflow` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.accessibility-a11y-gate` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.build-versus-compose-decision-framework` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.composed-provider-readiness-spine` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.e2e-confidence-ladder-stage-aware` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.environment-registry-and-bootstrap` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.environment-specific-vs-shared-service-model` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.i18n-runtime-and-validation` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.provider-configuration-plane` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.provider-environment-classification` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.service-catalog-and-provider-integration-model` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.universal-service-foundation-scope-and-principles` | `foundation` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.abac-policy-decision-point` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.api-keys-personal-access-tokens` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.audit-of-privileged-access` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.delegated-administration-roles` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.end-user-profile-and-preferences-self-service` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.entitlement-engine` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.rbac-roles-and-permissions` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.sub-organisations` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.support-mode-break-glass-access` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-groups` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-host-identity-resolution` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-identity-record-and-fqdn` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.user-identity-and-tenant-membership` | `identity-access` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.alerting-incident-management-on-call-status-page` | `observability-ops` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.browser-telemetry-grafana-faro-rum-and-browser-to-bff-tracing` | `observability-ops` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.internal-service-catalog-and-readiness` | `observability-ops` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.logs-aggregation-and-tenant-scoped-search` | `observability-ops` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.metrics-and-traces` | `observability-ops` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.observability-built-in-alerting-and-incidents` | `observability-ops` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-service-clickthrough-policy` | `observability-ops` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.search-and-indexing-product-search` | `search` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.code-quality-and-secret-and-dependency-scanning` | `security-governance` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.compliance-reports-access-reviews-evidence-packs` | `security-governance` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-isolation-proof` | `security-governance` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.object-storage-and-tenant-prefixes-and-signed-urls` | `storage` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.support-tickets-customer-health-announcements` | `support-admin` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
| `semantic-contract.tenant-lifecycle-provision-suspend-delete-export` | `support-admin` | `mapped-with-pre-file-blocker` | 1 | 2 | 1 |
