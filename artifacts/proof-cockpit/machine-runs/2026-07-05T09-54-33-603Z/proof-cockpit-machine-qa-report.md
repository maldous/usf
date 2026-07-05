# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 228494e108b4cbc4e411e2dc1f3deb2832cfd0f7
Base URL: http://127.0.0.1:28791
Generated: 2026-07-05T09:54:33.633Z

## Summary

Machine evidence produced: true
Sufficient for human acceptance without further decision: false
Reason: Machine QA produces audit evidence and explicit gaps, but USF-290 final acceptance remains a Matthew decision and final signoff controls remain disabled.

## Counts

| Metric | Count |
| --- | ---: |
| declaredRoutes | 71 |
| testedRoutes | 781 |
| capabilities | 75 |
| scenarios | 150 |
| services | 39 |
| serviceEvidenceScreenshots | 39 |
| actionsSubmitted | 7 |
| screenshots | 93 |
| pass | 1230 |
| fail | 0 |
| warn | 0 |
| reviewRequired | 0 |
| humanDecisionRequired | 1 |

## Gaps

| Status | Gap type | Category | Target | Message |
| --- | --- | --- | --- | --- |
| pass | none | none | none | No gaps recorded. |

## Screenshots

| Route | File | Timestamp |
| --- | --- | --- |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-05T09:54:54.506Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/keycloak-db.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-05T09:54:54.636Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/keycloak.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-keycloak-evidence-page.png | 2026-07-05T09:54:54.790Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/nats.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-05T09:54:54.917Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/temporal.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-05T09:54:55.044Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/minio.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-minio-evidence-page.png | 2026-07-05T09:54:55.200Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/openbao.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-05T09:54:55.352Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/otel-collector.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-05T09:54:55.488Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/prometheus.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-prometheus-evidence-page.png | 2026-07-05T09:54:55.648Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/grafana.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-grafana-evidence-page.png | 2026-07-05T09:54:55.831Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/loki.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-loki-evidence-page.png | 2026-07-05T09:54:56.012Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/tempo.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-tempo-evidence-page.png | 2026-07-05T09:54:56.165Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/mailpit.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-mailpit-evidence-page.png | 2026-07-05T09:54:56.322Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/webhook-sink.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-05T09:54:56.471Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-05T09:54:56.599Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/meilisearch.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-meilisearch-evidence-page.png | 2026-07-05T09:54:56.734Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/clickhouse.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-clickhouse-evidence-page.png | 2026-07-05T09:54:56.877Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/pgadmin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-pgadmin-evidence-page.png | 2026-07-05T09:54:56.984Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/sonar-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-05T09:54:57.103Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/sonar-oidc-plugin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-05T09:54:57.199Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/sonarqube.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sonarqube-evidence-page.png | 2026-07-05T09:54:57.338Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/mock-oidc.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-05T09:54:57.432Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/localstack.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-05T09:54:57.536Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/wiremock.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-wiremock-evidence-page.png | 2026-07-05T09:54:57.702Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/alertmanager.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-alertmanager-evidence-page.png | 2026-07-05T09:54:57.863Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/alloy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-05T09:54:58.025Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/windmill-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-05T09:54:58.156Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/windmill-redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-05T09:54:58.249Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/windmill.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-evidence-page.png | 2026-07-05T09:54:58.398Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/windmill-worker.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-05T09:54:58.502Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/temporal-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-05T09:54:58.629Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/temporal-ui.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-temporal-ui-evidence-page.png | 2026-07-05T09:54:58.734Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/pgbackrest.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-05T09:54:58.858Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/clamav.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-05T09:54:58.988Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/sentry.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-05T09:54:59.112Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/public-proof-origin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-05T09:54:59.256Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/caddy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-05T09:54:59.406Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/platform-api.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-05T09:54:59.534Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/service-evidence/react-app.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-05T09:54:59.634Z |
| /proof | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/home.png | 2026-07-05T09:55:00.558Z |
| /proof/foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/foundation-substrate-closure.png | 2026-07-05T09:55:01.075Z |
| /proof/capabilities | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/capabilities.png | 2026-07-05T09:55:01.369Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/first-capability-detail.png | 2026-07-05T09:55:01.718Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/first-scenario.png | 2026-07-05T09:55:01.905Z |
| /proof/roles | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/roles.png | 2026-07-05T09:55:02.012Z |
| /proof/actions | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/actions.png | 2026-07-05T09:55:02.144Z |
| /proof/actions/qa-mr7m7dhs-rms1hn | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/first-action-detail.png | 2026-07-05T09:55:02.267Z |
| /proof/machine-runs | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-runs.png | 2026-07-05T09:55:02.389Z |
| /proof/import | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-import.png | 2026-07-05T09:55:02.494Z |
| /proof/import/latest-machine-qa | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-import-run.png | 2026-07-05T09:55:02.766Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-import-capability.png | 2026-07-05T09:55:02.905Z |
| /proof/review | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-review.png | 2026-07-05T09:55:02.978Z |
| /proof/review/gaps | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-review-gaps.png | 2026-07-05T09:55:03.048Z |
| /proof/review/nonconformities | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-review-nonconformities.png | 2026-07-05T09:55:03.112Z |
| /proof/review/corrective-actions | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-review-corrective-actions.png | 2026-07-05T09:55:03.180Z |
| /proof/export | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/machine-export.png | 2026-07-05T09:55:03.303Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/first-evidence.png | 2026-07-05T09:55:03.425Z |
| /proof/evidence/usf-foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-05T09:55:03.556Z |
| /proof/audit | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/audit.png | 2026-07-05T09:55:03.775Z |
| /proof/observability | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/observability.png | 2026-07-05T09:55:03.997Z |
| /proof/fixtures | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/fixtures.png | 2026-07-05T09:55:04.172Z |
| /proof/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/alerts.png | 2026-07-05T09:55:04.701Z |
| /proof/signoff | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/signoff.png | 2026-07-05T09:55:04.910Z |
| /proof/result | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/result.png | 2026-07-05T09:55:04.964Z |
| /proof/enterprise | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise.png | 2026-07-05T09:55:05.214Z |
| /proof/enterprise/isms-scope | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-isms-scope.png | 2026-07-05T09:55:05.364Z |
| /proof/enterprise/risk-register | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-risk-register.png | 2026-07-05T09:55:05.514Z |
| /proof/enterprise/statement-of-applicability | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-05T09:55:05.666Z |
| /proof/enterprise/assets | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-assets.png | 2026-07-05T09:55:05.814Z |
| /proof/enterprise/suppliers | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-suppliers.png | 2026-07-05T09:55:05.963Z |
| /proof/enterprise/access-review | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-access-review.png | 2026-07-05T09:55:06.138Z |
| /proof/enterprise/secrets-crypto | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-secrets-crypto.png | 2026-07-05T09:55:06.289Z |
| /proof/enterprise/audit-retention | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-audit-retention.png | 2026-07-05T09:55:06.471Z |
| /proof/enterprise/backup-dr | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-backup-dr.png | 2026-07-05T09:55:06.621Z |
| /proof/enterprise/change-release | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-change-release.png | 2026-07-05T09:55:06.772Z |
| /proof/enterprise/supply-chain | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-supply-chain.png | 2026-07-05T09:55:06.929Z |
| /proof/enterprise/privacy-data-protection | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-05T09:55:07.089Z |
| /proof/enterprise/tenant-isolation | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-tenant-isolation.png | 2026-07-05T09:55:07.254Z |
| /proof/enterprise/resilience-capacity | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-resilience-capacity.png | 2026-07-05T09:55:07.398Z |
| /proof/enterprise/observability-runbooks | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-observability-runbooks.png | 2026-07-05T09:55:07.550Z |
| /proof/enterprise/policy-governance | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-policy-governance.png | 2026-07-05T09:55:07.699Z |
| /proof/enterprise/iso-control-support | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-iso-control-support.png | 2026-07-05T09:55:07.848Z |
| /proof/enterprise/internal-audit | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-internal-audit.png | 2026-07-05T09:55:07.997Z |
| /proof/enterprise/legal-regulatory | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-legal-regulatory.png | 2026-07-05T09:55:08.147Z |
| /proof/enterprise/security-objectives | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-security-objectives.png | 2026-07-05T09:55:08.298Z |
| /proof/enterprise/document-control | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-document-control.png | 2026-07-05T09:55:08.448Z |
| /proof/enterprise/competence-awareness | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-competence-awareness.png | 2026-07-05T09:55:08.600Z |
| /proof/enterprise/physical-environmental | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-physical-environmental.png | 2026-07-05T09:55:08.749Z |
| /proof/enterprise/secure-sdlc | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-secure-sdlc.png | 2026-07-05T09:55:08.897Z |
| /proof/enterprise/evidence-integrity | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-evidence-integrity.png | 2026-07-05T09:55:09.072Z |
| /proof/enterprise/nonconformity-corrective-action | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-05T09:55:09.221Z |
| /proof/enterprise/management-review | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-management-review.png | 2026-07-05T09:55:09.365Z |
| /proof/enterprise/single-operator-risk | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/enterprise-single-operator-risk.png | 2026-07-05T09:55:09.516Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | api-equivalent | http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-keycloak-evidence-page.png | none |
| nats | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | api-equivalent | http://127.0.0.1:9000/, http://127.0.0.1:9001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-minio-evidence-page.png | none |
| openbao | platform operator | api-equivalent | http://127.0.0.1:8200/ui/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | cli-equivalent | http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-prometheus-evidence-page.png | none |
| grafana | platform operator | api-equivalent | http://127.0.0.1:3000/login | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-grafana-evidence-page.png | none |
| loki | auditor | cli-equivalent | http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-loki-evidence-page.png | none |
| tempo | auditor | cli-equivalent | http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-tempo-evidence-page.png | none |
| mailpit | platform operator | api-equivalent | http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-mailpit-evidence-page.png | none |
| webhook-sink | read-only observer | cli-equivalent | http://127.0.0.1:18088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | cli-equivalent | http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-meilisearch-evidence-page.png | none |
| clickhouse | read-only observer | cli-equivalent | http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-clickhouse-evidence-page.png | none |
| pgadmin | platform operator | api-equivalent | http://127.0.0.1:5050/login | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-pgadmin-evidence-page.png | none |
| sonar-postgres | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | api-equivalent | http://127.0.0.1:9002/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sonarqube-evidence-page.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | cli-equivalent | http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-wiremock-evidence-page.png | none |
| alertmanager | platform operator | api-equivalent | http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-alertmanager-evidence-page.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | api-equivalent | http://127.0.0.1:8001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-evidence-page.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | api-equivalent | http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-temporal-ui-evidence-page.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | api-equivalent | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-54-33-603Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-05T09-54-33-633Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
