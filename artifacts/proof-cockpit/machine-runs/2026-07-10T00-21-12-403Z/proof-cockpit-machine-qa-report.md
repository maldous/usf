# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: bde7da844ee23731c2cdf18015bb6a8d1d7af4dc
Base URL: http://127.0.0.1:13121
Generated: 2026-07-10T00:21:12.446Z

## Summary

Machine evidence produced: true
Sufficient for human acceptance without further decision: false
Reason: Machine QA produces audit evidence and explicit gaps, but USF-290 final acceptance remains a Matthew decision and final signoff controls remain disabled.

## Counts

| Metric | Count |
| --- | ---: |
| declaredRoutes | 71 |
| testedRoutes | 830 |
| capabilities | 75 |
| scenarios | 150 |
| services | 40 |
| serviceEvidenceScreenshots | 40 |
| actionsSubmitted | 7 |
| screenshots | 94 |
| pass | 1282 |
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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-10T00:22:09.024Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-10T00:22:09.248Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-keycloak.png | 2026-07-10T00:22:21.979Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-10T00:22:22.180Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-10T00:22:22.398Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-minio.png | 2026-07-10T00:22:25.818Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-10T00:22:26.053Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-10T00:22:26.258Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-prometheus.png | 2026-07-10T00:22:26.704Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-grafana.png | 2026-07-10T00:22:32.204Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-loki.png | 2026-07-10T00:22:47.345Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-tempo.png | 2026-07-10T00:23:02.477Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-mailpit.png | 2026-07-10T00:23:02.678Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-10T00:23:02.878Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-10T00:23:03.051Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-meilisearch.png | 2026-07-10T00:23:03.300Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-clickhouse.png | 2026-07-10T00:23:03.358Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-pgadmin.png | 2026-07-10T00:23:12.004Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-10T00:23:12.151Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-10T00:23:12.321Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sonarqube.png | 2026-07-10T00:23:29.838Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-10T00:23:30.005Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-10T00:23:30.171Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-wiremock.png | 2026-07-10T00:23:30.259Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-alertmanager.png | 2026-07-10T00:23:30.361Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-10T00:23:30.532Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-10T00:23:30.688Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-10T00:23:30.854Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill.png | 2026-07-10T00:23:34.263Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-10T00:23:34.417Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-10T00:23:34.598Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-temporal-ui.png | 2026-07-10T00:23:34.682Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-10T00:23:34.887Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-10T00:23:35.066Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-10T00:23:35.248Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-10T00:23:35.447Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-10T00:23:35.610Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-10T00:23:35.793Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-10T00:23:35.970Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-10T00:23:36.138Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/home.png | 2026-07-10T00:23:47.362Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/foundation-substrate-closure.png | 2026-07-10T00:23:47.925Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/capabilities.png | 2026-07-10T00:23:48.374Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/first-capability-detail.png | 2026-07-10T00:23:48.750Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/first-scenario.png | 2026-07-10T00:23:48.945Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/roles.png | 2026-07-10T00:23:49.061Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/actions.png | 2026-07-10T00:23:49.205Z |
| /proof/actions/qa-mre6xitx-a3fzom | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/first-action-detail.png | 2026-07-10T00:23:49.341Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-runs.png | 2026-07-10T00:23:49.468Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-import.png | 2026-07-10T00:23:49.595Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-import-run.png | 2026-07-10T00:23:49.891Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-import-capability.png | 2026-07-10T00:23:50.034Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-review.png | 2026-07-10T00:23:50.163Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-review-gaps.png | 2026-07-10T00:23:50.237Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-review-nonconformities.png | 2026-07-10T00:23:50.302Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-review-corrective-actions.png | 2026-07-10T00:23:50.369Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/machine-export.png | 2026-07-10T00:23:50.495Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/first-evidence.png | 2026-07-10T00:23:50.628Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-10T00:23:50.762Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/audit.png | 2026-07-10T00:23:50.992Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/observability.png | 2026-07-10T00:23:51.212Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/fixtures.png | 2026-07-10T00:23:51.391Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/alerts.png | 2026-07-10T00:23:51.955Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/signoff.png | 2026-07-10T00:23:52.358Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/result.png | 2026-07-10T00:23:52.437Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise.png | 2026-07-10T00:23:52.730Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-isms-scope.png | 2026-07-10T00:23:52.890Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-risk-register.png | 2026-07-10T00:23:53.042Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-10T00:23:53.193Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-assets.png | 2026-07-10T00:23:53.356Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-suppliers.png | 2026-07-10T00:23:53.523Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-access-review.png | 2026-07-10T00:23:53.715Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-secrets-crypto.png | 2026-07-10T00:23:53.878Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-audit-retention.png | 2026-07-10T00:23:54.077Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-backup-dr.png | 2026-07-10T00:23:54.244Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-change-release.png | 2026-07-10T00:23:54.412Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-supply-chain.png | 2026-07-10T00:23:54.573Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-10T00:23:54.733Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-tenant-isolation.png | 2026-07-10T00:23:54.912Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-resilience-capacity.png | 2026-07-10T00:23:55.074Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-observability-runbooks.png | 2026-07-10T00:23:55.228Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-policy-governance.png | 2026-07-10T00:23:55.393Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-iso-control-support.png | 2026-07-10T00:23:55.557Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-internal-audit.png | 2026-07-10T00:23:55.724Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-legal-regulatory.png | 2026-07-10T00:23:55.876Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-security-objectives.png | 2026-07-10T00:23:56.041Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-document-control.png | 2026-07-10T00:23:56.207Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-competence-awareness.png | 2026-07-10T00:23:56.360Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-physical-environmental.png | 2026-07-10T00:23:56.526Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-secure-sdlc.png | 2026-07-10T00:23:56.690Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-evidence-integrity.png | 2026-07-10T00:23:56.897Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-10T00:23:57.060Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-management-review.png | 2026-07-10T00:23:57.223Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/enterprise-single-operator-risk.png | 2026-07-10T00:23:57.377Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-10T00-21-12-403Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-10T00-21-12-446Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
