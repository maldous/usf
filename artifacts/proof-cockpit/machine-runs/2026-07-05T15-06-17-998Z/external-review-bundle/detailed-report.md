# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: f2f21d3aac4b689d1fd5b43fa3897093ff6a48be
Base URL: http://127.0.0.1:2351
Generated: 2026-07-05T15:06:18.038Z

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
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-05T15:07:12.540Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/keycloak-db.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-05T15:07:12.723Z |
| http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-keycloak.png | 2026-07-05T15:07:24.761Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/nats.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-05T15:07:24.955Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/temporal.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-05T15:07:25.127Z |
| http://127.0.0.1:9001/browser | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-minio.png | 2026-07-05T15:07:28.488Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/openbao.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-05T15:07:28.676Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/otel-collector.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-05T15:07:28.869Z |
| http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-prometheus.png | 2026-07-05T15:07:29.356Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-grafana.png | 2026-07-05T15:07:34.973Z |
| http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-loki.png | 2026-07-05T15:07:50.116Z |
| http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-tempo.png | 2026-07-05T15:08:05.249Z |
| http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-mailpit.png | 2026-07-05T15:08:05.451Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/webhook-sink.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-05T15:08:05.612Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-05T15:08:05.771Z |
| http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-meilisearch.png | 2026-07-05T15:08:06.006Z |
| http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-clickhouse.png | 2026-07-05T15:08:06.065Z |
| http://127.0.0.1:5050/browser/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-pgadmin.png | 2026-07-05T15:08:11.477Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/sonar-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-05T15:08:11.606Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/sonar-oidc-plugin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-05T15:08:11.757Z |
| http://127.0.0.1:9002/projects/create | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sonarqube.png | 2026-07-05T15:08:29.243Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/mock-oidc.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-05T15:08:29.374Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/localstack.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-05T15:08:29.523Z |
| http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-wiremock.png | 2026-07-05T15:08:29.616Z |
| http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-alertmanager.png | 2026-07-05T15:08:29.700Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/alloy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-05T15:08:29.850Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/windmill-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-05T15:08:29.991Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/windmill-redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-05T15:08:30.140Z |
| http://127.0.0.1:8001/user/workspaces | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill.png | 2026-07-05T15:08:33.635Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/windmill-worker.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-05T15:08:33.770Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/temporal-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-05T15:08:33.916Z |
| http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-temporal-ui.png | 2026-07-05T15:08:34.006Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/pgbackrest.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-05T15:08:34.189Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/clamav.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-05T15:08:34.337Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/sentry.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-05T15:08:34.484Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/public-proof-origin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-05T15:08:34.645Z |
| http://127.0.0.1:8081/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-caddy.png | 2026-07-05T15:08:34.864Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/platform-api.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-05T15:08:35.024Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/service-evidence/react-app.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-05T15:08:35.175Z |
| /proof | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/home.png | 2026-07-05T15:08:46.512Z |
| /proof/foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/foundation-substrate-closure.png | 2026-07-05T15:08:47.373Z |
| /proof/capabilities | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/capabilities.png | 2026-07-05T15:08:47.808Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/first-capability-detail.png | 2026-07-05T15:08:48.185Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/first-scenario.png | 2026-07-05T15:08:48.383Z |
| /proof/roles | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/roles.png | 2026-07-05T15:08:48.515Z |
| /proof/actions | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/actions.png | 2026-07-05T15:08:48.659Z |
| /proof/actions/qa-mr7xchq3-dc9u5s | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/first-action-detail.png | 2026-07-05T15:08:48.781Z |
| /proof/machine-runs | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-runs.png | 2026-07-05T15:08:48.906Z |
| /proof/import | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-import.png | 2026-07-05T15:08:49.033Z |
| /proof/import/latest-machine-qa | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-import-run.png | 2026-07-05T15:08:49.329Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-import-capability.png | 2026-07-05T15:08:49.488Z |
| /proof/review | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-review.png | 2026-07-05T15:08:49.711Z |
| /proof/review/gaps | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-review-gaps.png | 2026-07-05T15:08:49.778Z |
| /proof/review/nonconformities | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-review-nonconformities.png | 2026-07-05T15:08:49.843Z |
| /proof/review/corrective-actions | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-review-corrective-actions.png | 2026-07-05T15:08:49.909Z |
| /proof/export | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/machine-export.png | 2026-07-05T15:08:50.036Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/first-evidence.png | 2026-07-05T15:08:50.168Z |
| /proof/evidence/usf-foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-05T15:08:50.303Z |
| /proof/audit | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/audit.png | 2026-07-05T15:08:50.532Z |
| /proof/observability | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/observability.png | 2026-07-05T15:08:50.765Z |
| /proof/fixtures | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/fixtures.png | 2026-07-05T15:08:50.947Z |
| /proof/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/alerts.png | 2026-07-05T15:08:51.508Z |
| /proof/signoff | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/signoff.png | 2026-07-05T15:08:51.902Z |
| /proof/result | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/result.png | 2026-07-05T15:08:51.960Z |
| /proof/enterprise | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise.png | 2026-07-05T15:08:52.227Z |
| /proof/enterprise/isms-scope | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-isms-scope.png | 2026-07-05T15:08:52.393Z |
| /proof/enterprise/risk-register | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-risk-register.png | 2026-07-05T15:08:52.543Z |
| /proof/enterprise/statement-of-applicability | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-05T15:08:52.695Z |
| /proof/enterprise/assets | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-assets.png | 2026-07-05T15:08:52.860Z |
| /proof/enterprise/suppliers | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-suppliers.png | 2026-07-05T15:08:53.010Z |
| /proof/enterprise/access-review | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-access-review.png | 2026-07-05T15:08:53.220Z |
| /proof/enterprise/secrets-crypto | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-secrets-crypto.png | 2026-07-05T15:08:53.384Z |
| /proof/enterprise/audit-retention | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-audit-retention.png | 2026-07-05T15:08:53.584Z |
| /proof/enterprise/backup-dr | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-backup-dr.png | 2026-07-05T15:08:53.751Z |
| /proof/enterprise/change-release | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-change-release.png | 2026-07-05T15:08:53.917Z |
| /proof/enterprise/supply-chain | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-supply-chain.png | 2026-07-05T15:08:54.076Z |
| /proof/enterprise/privacy-data-protection | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-05T15:08:54.236Z |
| /proof/enterprise/tenant-isolation | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-tenant-isolation.png | 2026-07-05T15:08:54.418Z |
| /proof/enterprise/resilience-capacity | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-resilience-capacity.png | 2026-07-05T15:08:54.577Z |
| /proof/enterprise/observability-runbooks | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-observability-runbooks.png | 2026-07-05T15:08:54.728Z |
| /proof/enterprise/policy-governance | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-policy-governance.png | 2026-07-05T15:08:54.896Z |
| /proof/enterprise/iso-control-support | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-iso-control-support.png | 2026-07-05T15:08:55.047Z |
| /proof/enterprise/internal-audit | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-internal-audit.png | 2026-07-05T15:08:55.197Z |
| /proof/enterprise/legal-regulatory | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-legal-regulatory.png | 2026-07-05T15:08:55.347Z |
| /proof/enterprise/security-objectives | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-security-objectives.png | 2026-07-05T15:08:55.511Z |
| /proof/enterprise/document-control | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-document-control.png | 2026-07-05T15:08:55.678Z |
| /proof/enterprise/competence-awareness | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-competence-awareness.png | 2026-07-05T15:08:55.845Z |
| /proof/enterprise/physical-environmental | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-physical-environmental.png | 2026-07-05T15:08:56.012Z |
| /proof/enterprise/secure-sdlc | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-secure-sdlc.png | 2026-07-05T15:08:56.177Z |
| /proof/enterprise/evidence-integrity | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-evidence-integrity.png | 2026-07-05T15:08:56.386Z |
| /proof/enterprise/nonconformity-corrective-action | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-05T15:08:56.549Z |
| /proof/enterprise/management-review | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-management-review.png | 2026-07-05T15:08:56.713Z |
| /proof/enterprise/single-operator-risk | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/enterprise-single-operator-risk.png | 2026-07-05T15:08:56.865Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T15-06-17-998Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-05T15-06-18-038Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
