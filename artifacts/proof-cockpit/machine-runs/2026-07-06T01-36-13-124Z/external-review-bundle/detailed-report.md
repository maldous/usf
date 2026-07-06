# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: c5b68a5dc87532680ea5b220cdfc515c7cab8e3f
Base URL: http://127.0.0.1:27829
Generated: 2026-07-06T01:36:13.165Z

## Summary

Machine evidence produced: true
Sufficient for human acceptance without further decision: false
Reason: Machine QA produces audit evidence and explicit gaps, but USF-290 final acceptance remains a Matthew decision and final signoff controls remain disabled.

## Counts

| Metric | Count |
| --- | ---: |
| declaredRoutes | 71 |
| testedRoutes | 827 |
| capabilities | 75 |
| scenarios | 150 |
| services | 39 |
| serviceEvidenceScreenshots | 39 |
| actionsSubmitted | 7 |
| screenshots | 93 |
| pass | 1278 |
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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-06T01:37:04.224Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-06T01:37:04.464Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-keycloak.png | 2026-07-06T01:37:16.568Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-06T01:37:16.762Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-06T01:37:16.956Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-minio.png | 2026-07-06T01:37:20.298Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-06T01:37:20.503Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-06T01:37:20.730Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-prometheus.png | 2026-07-06T01:37:21.227Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-grafana.png | 2026-07-06T01:37:26.844Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-loki.png | 2026-07-06T01:37:41.987Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-tempo.png | 2026-07-06T01:37:57.120Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-mailpit.png | 2026-07-06T01:37:57.322Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-06T01:37:57.504Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-06T01:37:57.680Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-meilisearch.png | 2026-07-06T01:37:57.910Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-clickhouse.png | 2026-07-06T01:37:57.956Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-pgadmin.png | 2026-07-06T01:38:06.433Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-06T01:38:06.596Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-06T01:38:06.757Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sonarqube.png | 2026-07-06T01:38:24.231Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-06T01:38:24.391Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-06T01:38:24.554Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-wiremock.png | 2026-07-06T01:38:24.623Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-alertmanager.png | 2026-07-06T01:38:24.706Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-06T01:38:24.878Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-06T01:38:25.040Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-06T01:38:25.189Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill.png | 2026-07-06T01:38:28.408Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-06T01:38:28.559Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-06T01:38:28.740Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-temporal-ui.png | 2026-07-06T01:38:28.843Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-06T01:38:29.054Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-06T01:38:29.235Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-06T01:38:29.410Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-06T01:38:29.604Z |
| http://127.0.0.1:8081/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-caddy.png | 2026-07-06T01:38:29.833Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-06T01:38:30.006Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/service-evidence/react-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-06T01:38:30.156Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/home.png | 2026-07-06T01:38:41.382Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/foundation-substrate-closure.png | 2026-07-06T01:38:41.921Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/capabilities.png | 2026-07-06T01:38:42.368Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/first-capability-detail.png | 2026-07-06T01:38:42.743Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/first-scenario.png | 2026-07-06T01:38:42.939Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/roles.png | 2026-07-06T01:38:43.054Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/actions.png | 2026-07-06T01:38:43.199Z |
| /proof/actions/qa-mr8juiq2-t8xvob | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/first-action-detail.png | 2026-07-06T01:38:43.319Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-runs.png | 2026-07-06T01:38:43.461Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-import.png | 2026-07-06T01:38:43.589Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-import-run.png | 2026-07-06T01:38:43.884Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-import-capability.png | 2026-07-06T01:38:44.029Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-review.png | 2026-07-06T01:38:44.197Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-review-gaps.png | 2026-07-06T01:38:44.266Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-review-nonconformities.png | 2026-07-06T01:38:44.331Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-review-corrective-actions.png | 2026-07-06T01:38:44.397Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/machine-export.png | 2026-07-06T01:38:44.523Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/first-evidence.png | 2026-07-06T01:38:44.657Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-06T01:38:44.791Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/audit.png | 2026-07-06T01:38:45.019Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/observability.png | 2026-07-06T01:38:45.254Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/fixtures.png | 2026-07-06T01:38:45.436Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/alerts.png | 2026-07-06T01:38:46.001Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/signoff.png | 2026-07-06T01:38:46.391Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/result.png | 2026-07-06T01:38:46.465Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise.png | 2026-07-06T01:38:46.774Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-isms-scope.png | 2026-07-06T01:38:46.936Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-risk-register.png | 2026-07-06T01:38:47.102Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-06T01:38:47.256Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-assets.png | 2026-07-06T01:38:47.419Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-suppliers.png | 2026-07-06T01:38:47.585Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-access-review.png | 2026-07-06T01:38:47.790Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-secrets-crypto.png | 2026-07-06T01:38:47.956Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-audit-retention.png | 2026-07-06T01:38:48.156Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-backup-dr.png | 2026-07-06T01:38:48.323Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-change-release.png | 2026-07-06T01:38:48.490Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-supply-chain.png | 2026-07-06T01:38:48.652Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-06T01:38:48.824Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-tenant-isolation.png | 2026-07-06T01:38:49.005Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-resilience-capacity.png | 2026-07-06T01:38:49.168Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-observability-runbooks.png | 2026-07-06T01:38:49.322Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-policy-governance.png | 2026-07-06T01:38:49.486Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-iso-control-support.png | 2026-07-06T01:38:49.654Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-internal-audit.png | 2026-07-06T01:38:49.818Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-legal-regulatory.png | 2026-07-06T01:38:49.972Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-security-objectives.png | 2026-07-06T01:38:50.136Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-document-control.png | 2026-07-06T01:38:50.302Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-competence-awareness.png | 2026-07-06T01:38:50.470Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-physical-environmental.png | 2026-07-06T01:38:50.636Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-secure-sdlc.png | 2026-07-06T01:38:50.802Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-evidence-integrity.png | 2026-07-06T01:38:51.008Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-06T01:38:51.171Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-management-review.png | 2026-07-06T01:38:51.334Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/enterprise-single-operator-risk.png | 2026-07-06T01:38:51.489Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T01-36-13-124Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-06T01-36-13-165Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
