# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 6178026312b1493a155f74f9024e492185879c5c
Base URL: http://127.0.0.1:19489
Generated: 2026-07-05T11:10:36.906Z

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
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-05T11:11:20.067Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/keycloak-db.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-05T11:11:20.263Z |
| http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-keycloak.png | 2026-07-05T11:11:32.334Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/nats.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-05T11:11:32.529Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/temporal.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-05T11:11:32.709Z |
| http://127.0.0.1:9001/browser | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-minio.png | 2026-07-05T11:11:36.059Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/openbao.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-05T11:11:36.250Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/otel-collector.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-05T11:11:36.453Z |
| http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-prometheus.png | 2026-07-05T11:11:36.871Z |
| http://127.0.0.1:3000/?orgId=1&from=now-6h&to=now&timezone=browser | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-grafana.png | 2026-07-05T11:11:42.404Z |
| http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-loki.png | 2026-07-05T11:11:57.533Z |
| http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-tempo.png | 2026-07-05T11:12:12.665Z |
| http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-mailpit.png | 2026-07-05T11:12:12.867Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/webhook-sink.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-05T11:12:13.028Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-05T11:12:13.190Z |
| http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-meilisearch.png | 2026-07-05T11:12:13.438Z |
| http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-clickhouse.png | 2026-07-05T11:12:13.497Z |
| http://127.0.0.1:5050/browser/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-pgadmin.png | 2026-07-05T11:12:31.177Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/sonar-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-05T11:12:31.321Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/sonar-oidc-plugin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-05T11:12:31.474Z |
| http://127.0.0.1:9002/projects/create | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sonarqube.png | 2026-07-05T11:12:48.992Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/mock-oidc.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-05T11:12:49.122Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/localstack.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-05T11:12:49.274Z |
| http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-wiremock.png | 2026-07-05T11:12:49.364Z |
| http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-alertmanager.png | 2026-07-05T11:12:49.450Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/alloy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-05T11:12:49.600Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/windmill-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-05T11:12:49.740Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/windmill-redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-05T11:12:49.889Z |
| http://127.0.0.1:8001/user/workspaces | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill.png | 2026-07-05T11:12:53.302Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/windmill-worker.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-05T11:12:53.436Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/temporal-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-05T11:12:53.598Z |
| http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-temporal-ui.png | 2026-07-05T11:12:53.687Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/pgbackrest.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-05T11:12:53.871Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/clamav.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-05T11:12:54.035Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/sentry.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-05T11:12:54.182Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/public-proof-origin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-05T11:12:54.343Z |
| http://127.0.0.1:8081/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-caddy.png | 2026-07-05T11:12:54.561Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/platform-api.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-05T11:12:54.721Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/service-evidence/react-app.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-05T11:12:54.855Z |
| /proof | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/home.png | 2026-07-05T11:13:06.159Z |
| /proof/foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/foundation-substrate-closure.png | 2026-07-05T11:13:06.722Z |
| /proof/capabilities | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/capabilities.png | 2026-07-05T11:13:07.033Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/first-capability-detail.png | 2026-07-05T11:13:07.383Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/first-scenario.png | 2026-07-05T11:13:07.584Z |
| /proof/roles | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/roles.png | 2026-07-05T11:13:07.692Z |
| /proof/actions | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/actions.png | 2026-07-05T11:13:07.824Z |
| /proof/actions/qa-mr7ox6q6-6lmbfo | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/first-action-detail.png | 2026-07-05T11:13:07.947Z |
| /proof/machine-runs | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-runs.png | 2026-07-05T11:13:08.069Z |
| /proof/import | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-import.png | 2026-07-05T11:13:08.175Z |
| /proof/import/latest-machine-qa | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-import-run.png | 2026-07-05T11:13:08.466Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-import-capability.png | 2026-07-05T11:13:08.601Z |
| /proof/review | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-review.png | 2026-07-05T11:13:08.660Z |
| /proof/review/gaps | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-review-gaps.png | 2026-07-05T11:13:08.727Z |
| /proof/review/nonconformities | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-review-nonconformities.png | 2026-07-05T11:13:08.791Z |
| /proof/review/corrective-actions | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-review-corrective-actions.png | 2026-07-05T11:13:08.859Z |
| /proof/export | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/machine-export.png | 2026-07-05T11:13:08.984Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/first-evidence.png | 2026-07-05T11:13:09.106Z |
| /proof/evidence/usf-foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-05T11:13:09.240Z |
| /proof/audit | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/audit.png | 2026-07-05T11:13:09.476Z |
| /proof/observability | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/observability.png | 2026-07-05T11:13:09.706Z |
| /proof/fixtures | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/fixtures.png | 2026-07-05T11:13:09.885Z |
| /proof/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/alerts.png | 2026-07-05T11:13:10.433Z |
| /proof/signoff | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/signoff.png | 2026-07-05T11:13:10.642Z |
| /proof/result | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/result.png | 2026-07-05T11:13:10.709Z |
| /proof/enterprise | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise.png | 2026-07-05T11:13:10.960Z |
| /proof/enterprise/isms-scope | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-isms-scope.png | 2026-07-05T11:13:11.111Z |
| /proof/enterprise/risk-register | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-risk-register.png | 2026-07-05T11:13:11.260Z |
| /proof/enterprise/statement-of-applicability | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-05T11:13:11.412Z |
| /proof/enterprise/assets | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-assets.png | 2026-07-05T11:13:11.560Z |
| /proof/enterprise/suppliers | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-suppliers.png | 2026-07-05T11:13:11.709Z |
| /proof/enterprise/access-review | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-access-review.png | 2026-07-05T11:13:11.883Z |
| /proof/enterprise/secrets-crypto | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-secrets-crypto.png | 2026-07-05T11:13:12.053Z |
| /proof/enterprise/audit-retention | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-audit-retention.png | 2026-07-05T11:13:12.222Z |
| /proof/enterprise/backup-dr | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-backup-dr.png | 2026-07-05T11:13:12.371Z |
| /proof/enterprise/change-release | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-change-release.png | 2026-07-05T11:13:12.520Z |
| /proof/enterprise/supply-chain | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-supply-chain.png | 2026-07-05T11:13:12.676Z |
| /proof/enterprise/privacy-data-protection | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-05T11:13:12.836Z |
| /proof/enterprise/tenant-isolation | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-tenant-isolation.png | 2026-07-05T11:13:13.003Z |
| /proof/enterprise/resilience-capacity | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-resilience-capacity.png | 2026-07-05T11:13:13.148Z |
| /proof/enterprise/observability-runbooks | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-observability-runbooks.png | 2026-07-05T11:13:13.297Z |
| /proof/enterprise/policy-governance | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-policy-governance.png | 2026-07-05T11:13:13.446Z |
| /proof/enterprise/iso-control-support | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-iso-control-support.png | 2026-07-05T11:13:13.595Z |
| /proof/enterprise/internal-audit | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-internal-audit.png | 2026-07-05T11:13:13.744Z |
| /proof/enterprise/legal-regulatory | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-legal-regulatory.png | 2026-07-05T11:13:13.894Z |
| /proof/enterprise/security-objectives | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-security-objectives.png | 2026-07-05T11:13:14.044Z |
| /proof/enterprise/document-control | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-document-control.png | 2026-07-05T11:13:14.193Z |
| /proof/enterprise/competence-awareness | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-competence-awareness.png | 2026-07-05T11:13:14.345Z |
| /proof/enterprise/physical-environmental | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-physical-environmental.png | 2026-07-05T11:13:14.496Z |
| /proof/enterprise/secure-sdlc | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-secure-sdlc.png | 2026-07-05T11:13:14.644Z |
| /proof/enterprise/evidence-integrity | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-evidence-integrity.png | 2026-07-05T11:13:14.817Z |
| /proof/enterprise/nonconformity-corrective-action | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-05T11:13:14.984Z |
| /proof/enterprise/management-review | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-management-review.png | 2026-07-05T11:13:15.146Z |
| /proof/enterprise/single-operator-risk | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/enterprise-single-operator-risk.png | 2026-07-05T11:13:15.294Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-postgres-evidence-page.png | none |
| keycloak-db | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-keycloak-db-evidence-page.png | none |
| keycloak | tenant admin | authenticated-direct-screenshot | http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-keycloak.png | none |
| nats | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-nats-evidence-page.png | none |
| temporal | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-temporal-evidence-page.png | none |
| minio | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9001/, http://127.0.0.1:9000/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-minio.png | none |
| openbao | platform operator | unsafe-to-screenshot | http://127.0.0.1:8200/ui/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-openbao-evidence-page.png | none |
| otel-collector | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-otel-collector-evidence-page.png | none |
| prometheus | auditor | direct-screenshot | http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-prometheus.png | none |
| grafana | platform operator | authenticated-direct-screenshot | http://127.0.0.1:3000/login | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-grafana.png | none |
| loki | auditor | direct-screenshot | http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-loki.png | none |
| tempo | auditor | direct-screenshot | http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-tempo.png | none |
| mailpit | platform operator | direct-screenshot | http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-mailpit.png | none |
| webhook-sink | read-only observer | unsafe-to-screenshot | http://127.0.0.1:18088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-webhook-sink-evidence-page.png | none |
| redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-redis-evidence-page.png | none |
| meilisearch | read-only observer | direct-screenshot | http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-meilisearch.png | none |
| clickhouse | read-only observer | direct-screenshot | http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-clickhouse.png | none |
| pgadmin | platform operator | authenticated-direct-screenshot | http://127.0.0.1:5050/login | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-pgadmin.png | none |
| sonar-postgres | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sonar-postgres-evidence-page.png | none |
| sonar-oidc-plugin | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | none |
| sonarqube | platform operator | authenticated-direct-screenshot | http://127.0.0.1:9002/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sonarqube.png | none |
| mock-oidc | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-mock-oidc-evidence-page.png | none |
| localstack | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-localstack-evidence-page.png | none |
| wiremock | read-only observer | direct-screenshot | http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-wiremock.png | none |
| alertmanager | platform operator | direct-screenshot | http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-alertmanager.png | none |
| alloy | auditor | cli-equivalent | http://127.0.0.1:12345/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-alloy-evidence-page.png | none |
| windmill-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill-postgres-evidence-page.png | none |
| windmill-redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill-redis-evidence-page.png | none |
| windmill | platform operator | authenticated-direct-screenshot | http://127.0.0.1:8001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill.png | none |
| windmill-worker | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-windmill-worker-evidence-page.png | none |
| temporal-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-temporal-postgres-evidence-page.png | none |
| temporal-ui | platform operator | direct-screenshot | http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-temporal-ui.png | none |
| pgbackrest | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-pgbackrest-evidence-page.png | none |
| clamav | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-clamav-evidence-page.png | none |
| sentry | platform operator | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-sentry-evidence-page.png | none |
| public-proof-origin | read-only observer | cli-equivalent | http://127.0.0.1:18080/.well-known/usf-public-edge.json | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-public-proof-origin-evidence-page.png | none |
| caddy | platform operator | direct-screenshot | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-caddy.png | none |
| platform-api | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-platform-api-evidence-page.png | none |
| react-app | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T11-10-36-874Z/screenshots/compose-service-react-app-evidence-page.png | none |

## Human Import

Human import route: /proof/import/qa-run-2026-07-05T11-10-36-906Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
