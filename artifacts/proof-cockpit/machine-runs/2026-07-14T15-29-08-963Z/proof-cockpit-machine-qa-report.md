# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 78bbfe15c4a9b6a5bad3551cc66b3685498539fb
Base URL: http://127.0.0.1:20459
Generated: 2026-07-14T15:29:09.005Z

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
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-14T15:30:04.457Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/keycloak-db.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-14T15:30:04.717Z |
| http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-keycloak.png | 2026-07-14T15:30:16.878Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/nats.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-14T15:30:17.069Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/temporal.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-14T15:30:17.282Z |
| http://127.0.0.1:9001/browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-minio.png | 2026-07-14T15:30:20.684Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/openbao.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-14T15:30:20.959Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/otel-collector.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-14T15:30:21.175Z |
| http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-prometheus.png | 2026-07-14T15:30:21.619Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-grafana.png | 2026-07-14T15:30:27.155Z |
| http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-loki.png | 2026-07-14T15:30:42.298Z |
| http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-tempo.png | 2026-07-14T15:30:57.447Z |
| http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-mailpit.png | 2026-07-14T15:30:57.651Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/webhook-sink.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-14T15:30:57.852Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-14T15:30:58.024Z |
| http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-meilisearch.png | 2026-07-14T15:30:58.271Z |
| http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-clickhouse.png | 2026-07-14T15:30:58.331Z |
| http://127.0.0.1:5050/browser/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-pgadmin.png | 2026-07-14T15:31:08.510Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/sonar-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-14T15:31:08.658Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/sonar-oidc-plugin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-14T15:31:08.827Z |
| http://127.0.0.1:9002/projects/create | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sonarqube.png | 2026-07-14T15:31:26.308Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/mock-oidc.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-14T15:31:26.461Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/localstack.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-14T15:31:26.626Z |
| http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-wiremock.png | 2026-07-14T15:31:26.715Z |
| http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-alertmanager.png | 2026-07-14T15:31:26.800Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/alloy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-14T15:31:26.972Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/windmill-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-14T15:31:27.143Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/windmill-redis.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-14T15:31:27.310Z |
| http://127.0.0.1:8001/user/workspaces | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill.png | 2026-07-14T15:31:30.751Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/windmill-worker.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-14T15:31:30.906Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/temporal-postgres.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-14T15:31:31.084Z |
| http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-temporal-ui.png | 2026-07-14T15:31:31.170Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/pgbackrest.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-14T15:31:31.373Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/clamav.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-14T15:31:31.538Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/sentry.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-14T15:31:31.702Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/public-proof-origin.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-14T15:31:31.885Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/staging-proof-cockpit.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | 2026-07-14T15:31:32.065Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/caddy.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-14T15:31:32.251Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/platform-api.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-14T15:31:32.425Z |
| /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/service-evidence/web-app.json | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-web-app-evidence-page.png | 2026-07-14T15:31:32.593Z |
| /proof | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/home.png | 2026-07-14T15:31:43.801Z |
| /proof/foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/foundation-substrate-closure.png | 2026-07-14T15:31:45.009Z |
| /proof/capabilities | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/capabilities.png | 2026-07-14T15:31:45.445Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/first-capability-detail.png | 2026-07-14T15:31:45.819Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/first-scenario.png | 2026-07-14T15:31:46.015Z |
| /proof/roles | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/roles.png | 2026-07-14T15:31:46.131Z |
| /proof/actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/actions.png | 2026-07-14T15:31:46.260Z |
| /proof/actions/qa-mrkt4kc8-98yzqn | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/first-action-detail.png | 2026-07-14T15:31:46.395Z |
| /proof/machine-runs | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-runs.png | 2026-07-14T15:31:46.519Z |
| /proof/import | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-import.png | 2026-07-14T15:31:46.634Z |
| /proof/import/latest-machine-qa | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-import-run.png | 2026-07-14T15:31:46.929Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-import-capability.png | 2026-07-14T15:31:47.087Z |
| /proof/review | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-review.png | 2026-07-14T15:31:47.219Z |
| /proof/review/gaps | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-review-gaps.png | 2026-07-14T15:31:47.292Z |
| /proof/review/nonconformities | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-review-nonconformities.png | 2026-07-14T15:31:47.357Z |
| /proof/review/corrective-actions | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-review-corrective-actions.png | 2026-07-14T15:31:47.426Z |
| /proof/export | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/machine-export.png | 2026-07-14T15:31:47.551Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/first-evidence.png | 2026-07-14T15:31:47.683Z |
| /proof/evidence/usf-foundation-substrate-closure | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-14T15:31:47.817Z |
| /proof/audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/audit.png | 2026-07-14T15:31:48.046Z |
| /proof/observability | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/observability.png | 2026-07-14T15:31:48.278Z |
| /proof/fixtures | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/fixtures.png | 2026-07-14T15:31:48.463Z |
| /proof/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/alerts.png | 2026-07-14T15:31:49.029Z |
| /proof/signoff | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/signoff.png | 2026-07-14T15:31:49.427Z |
| /proof/result | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/result.png | 2026-07-14T15:31:49.493Z |
| /proof/enterprise | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise.png | 2026-07-14T15:31:49.786Z |
| /proof/enterprise/isms-scope | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-isms-scope.png | 2026-07-14T15:31:49.945Z |
| /proof/enterprise/risk-register | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-risk-register.png | 2026-07-14T15:31:50.112Z |
| /proof/enterprise/statement-of-applicability | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-14T15:31:50.279Z |
| /proof/enterprise/assets | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-assets.png | 2026-07-14T15:31:50.431Z |
| /proof/enterprise/suppliers | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-suppliers.png | 2026-07-14T15:31:50.595Z |
| /proof/enterprise/access-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-access-review.png | 2026-07-14T15:31:50.801Z |
| /proof/enterprise/secrets-crypto | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-secrets-crypto.png | 2026-07-14T15:31:50.966Z |
| /proof/enterprise/audit-retention | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-audit-retention.png | 2026-07-14T15:31:51.167Z |
| /proof/enterprise/backup-dr | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-backup-dr.png | 2026-07-14T15:31:51.332Z |
| /proof/enterprise/change-release | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-change-release.png | 2026-07-14T15:31:51.499Z |
| /proof/enterprise/supply-chain | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-supply-chain.png | 2026-07-14T15:31:51.661Z |
| /proof/enterprise/privacy-data-protection | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-14T15:31:51.833Z |
| /proof/enterprise/tenant-isolation | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-tenant-isolation.png | 2026-07-14T15:31:52.014Z |
| /proof/enterprise/resilience-capacity | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-resilience-capacity.png | 2026-07-14T15:31:52.179Z |
| /proof/enterprise/observability-runbooks | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-observability-runbooks.png | 2026-07-14T15:31:52.331Z |
| /proof/enterprise/policy-governance | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-policy-governance.png | 2026-07-14T15:31:52.495Z |
| /proof/enterprise/iso-control-support | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-iso-control-support.png | 2026-07-14T15:31:52.649Z |
| /proof/enterprise/internal-audit | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-internal-audit.png | 2026-07-14T15:31:52.813Z |
| /proof/enterprise/legal-regulatory | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-legal-regulatory.png | 2026-07-14T15:31:52.965Z |
| /proof/enterprise/security-objectives | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-security-objectives.png | 2026-07-14T15:31:53.129Z |
| /proof/enterprise/document-control | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-document-control.png | 2026-07-14T15:31:53.295Z |
| /proof/enterprise/competence-awareness | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-competence-awareness.png | 2026-07-14T15:31:53.451Z |
| /proof/enterprise/physical-environmental | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-physical-environmental.png | 2026-07-14T15:31:53.614Z |
| /proof/enterprise/secure-sdlc | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-secure-sdlc.png | 2026-07-14T15:31:53.785Z |
| /proof/enterprise/evidence-integrity | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-evidence-integrity.png | 2026-07-14T15:31:53.985Z |
| /proof/enterprise/nonconformity-corrective-action | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-14T15:31:54.149Z |
| /proof/enterprise/management-review | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-management-review.png | 2026-07-14T15:31:54.312Z |
| /proof/enterprise/single-operator-risk | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/enterprise-single-operator-risk.png | 2026-07-14T15:31:54.466Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| staging-proof-cockpit | platform operator | unsafe-to-screenshot |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-staging-proof-cockpit-evidence-page.png | none |
| caddy | platform operator | host-unpublished-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-caddy-evidence-page.png | none |
| platform-api | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| web-app | read-only observer | cli-equivalent |  | /tmp/usf-proof-cockpit-machine-qa/2026-07-14T15-29-08-963Z/screenshots/compose-service-web-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-14T15-29-09-005Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
