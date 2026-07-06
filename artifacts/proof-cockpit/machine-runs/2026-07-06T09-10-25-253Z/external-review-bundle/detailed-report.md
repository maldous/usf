# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 9a4f4b847decaebd704894adb0899f822a6f347b
Base URL: http://127.0.0.1:32521
Generated: 2026-07-06T09:10:25.294Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-06T09:11:20.765Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-06T09:11:20.992Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-keycloak.png | 2026-07-06T09:11:33.045Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-06T09:11:33.240Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-06T09:11:33.428Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-minio.png | 2026-07-06T09:11:36.754Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-06T09:11:36.996Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-06T09:11:37.200Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-prometheus.png | 2026-07-06T09:11:37.622Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-grafana.png | 2026-07-06T09:11:43.221Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-loki.png | 2026-07-06T09:11:58.364Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-tempo.png | 2026-07-06T09:12:13.496Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-mailpit.png | 2026-07-06T09:12:13.698Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-06T09:12:13.899Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-06T09:12:14.075Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-meilisearch.png | 2026-07-06T09:12:14.305Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-clickhouse.png | 2026-07-06T09:12:14.363Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-pgadmin.png | 2026-07-06T09:12:19.592Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-06T09:12:19.750Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-06T09:12:19.903Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sonarqube.png | 2026-07-06T09:12:37.391Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-06T09:12:37.535Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-06T09:12:37.685Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-wiremock.png | 2026-07-06T09:12:37.780Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-alertmanager.png | 2026-07-06T09:12:37.865Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-06T09:12:38.037Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-06T09:12:38.202Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-06T09:12:38.369Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill.png | 2026-07-06T09:12:41.818Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-06T09:12:41.982Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-06T09:12:42.153Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-temporal-ui.png | 2026-07-06T09:12:42.238Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-06T09:12:42.430Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-06T09:12:42.624Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-06T09:12:42.805Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-06T09:12:42.999Z |
| http://127.0.0.1:8081/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-caddy.png | 2026-07-06T09:12:43.229Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-06T09:12:43.409Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-06T09:12:43.568Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/home.png | 2026-07-06T09:12:54.792Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/foundation-substrate-closure.png | 2026-07-06T09:12:55.159Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/capabilities.png | 2026-07-06T09:12:55.596Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/first-capability-detail.png | 2026-07-06T09:12:55.970Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/first-scenario.png | 2026-07-06T09:12:56.167Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/roles.png | 2026-07-06T09:12:56.282Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/actions.png | 2026-07-06T09:12:56.424Z |
| /proof/actions/qa-mr902p9v-hspjly | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/first-action-detail.png | 2026-07-06T09:12:56.563Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-runs.png | 2026-07-06T09:12:56.704Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-import.png | 2026-07-06T09:12:56.832Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-import-run.png | 2026-07-06T09:12:57.129Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-import-capability.png | 2026-07-06T09:12:57.286Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-review.png | 2026-07-06T09:12:57.517Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-review-gaps.png | 2026-07-06T09:12:57.591Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-review-nonconformities.png | 2026-07-06T09:12:57.657Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-review-corrective-actions.png | 2026-07-06T09:12:57.724Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/machine-export.png | 2026-07-06T09:12:57.850Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/first-evidence.png | 2026-07-06T09:12:57.983Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-06T09:12:58.116Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/audit.png | 2026-07-06T09:12:58.346Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/observability.png | 2026-07-06T09:12:58.580Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/fixtures.png | 2026-07-06T09:12:58.762Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/alerts.png | 2026-07-06T09:12:59.344Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/signoff.png | 2026-07-06T09:12:59.790Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/result.png | 2026-07-06T09:12:59.874Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise.png | 2026-07-06T09:13:00.170Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-isms-scope.png | 2026-07-06T09:13:00.328Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-risk-register.png | 2026-07-06T09:13:00.481Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-06T09:13:00.647Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-assets.png | 2026-07-06T09:13:00.816Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-suppliers.png | 2026-07-06T09:13:00.977Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-access-review.png | 2026-07-06T09:13:01.184Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-secrets-crypto.png | 2026-07-06T09:13:01.349Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-audit-retention.png | 2026-07-06T09:13:01.553Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-backup-dr.png | 2026-07-06T09:13:01.716Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-change-release.png | 2026-07-06T09:13:01.882Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-supply-chain.png | 2026-07-06T09:13:02.045Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-06T09:13:02.203Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-tenant-isolation.png | 2026-07-06T09:13:02.383Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-resilience-capacity.png | 2026-07-06T09:13:02.545Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-observability-runbooks.png | 2026-07-06T09:13:02.712Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-policy-governance.png | 2026-07-06T09:13:02.878Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-iso-control-support.png | 2026-07-06T09:13:03.032Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-internal-audit.png | 2026-07-06T09:13:03.195Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-legal-regulatory.png | 2026-07-06T09:13:03.348Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-security-objectives.png | 2026-07-06T09:13:03.512Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-document-control.png | 2026-07-06T09:13:03.678Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-competence-awareness.png | 2026-07-06T09:13:03.832Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-physical-environmental.png | 2026-07-06T09:13:03.996Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-secure-sdlc.png | 2026-07-06T09:13:04.147Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-evidence-integrity.png | 2026-07-06T09:13:04.351Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-06T09:13:04.514Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-management-review.png | 2026-07-06T09:13:04.678Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/enterprise-single-operator-risk.png | 2026-07-06T09:13:04.832Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-06T09-10-25-253Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-06T09-10-25-294Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
