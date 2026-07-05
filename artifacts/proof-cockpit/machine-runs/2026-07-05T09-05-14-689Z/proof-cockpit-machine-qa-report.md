# USF-293 Proof Cockpit Machine QA Report

Cockpit issue: USF-293
Human acceptance issue: USF-290
PR: pending-usf-293
Source SHA: 4f51c1a6ce92d3e4888e7869f59867612e9a4d47
Base URL: http://127.0.0.1:12527
Generated: 2026-07-05T09:05:14.719Z

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
| pass | 1163 |
| fail | 0 |
| warn | 68 |
| reviewRequired | 0 |
| humanDecisionRequired | 1 |

## Gaps

| Status | Gap type | Category | Target | Message |
| --- | --- | --- | --- | --- |
| warn | missing-compose-service-screenshot | compose-service-evidence | postgres | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | keycloak-db | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | service-auth-unavailable | compose-service-evidence | keycloak | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | nats | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | temporal | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | service-auth-unavailable | compose-service-evidence | minio | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | service-auth-unavailable | compose-service-evidence | openbao | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | otel-collector | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | prometheus | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | service-auth-unavailable | compose-service-evidence | grafana | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | loki | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | tempo | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | service-auth-unavailable | compose-service-evidence | mailpit | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | webhook-sink | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | redis | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | meilisearch | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | clickhouse | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | service-auth-unavailable | compose-service-evidence | pgadmin | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | sonar-postgres | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | sonar-oidc-plugin | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | service-auth-unavailable | compose-service-evidence | sonarqube | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | mock-oidc | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | localstack | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | wiremock | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | service-auth-unavailable | compose-service-evidence | alertmanager | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | alloy | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | windmill-postgres | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | windmill-redis | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | service-auth-unavailable | compose-service-evidence | windmill | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | windmill-worker | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | temporal-postgres | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | service-auth-unavailable | compose-service-evidence | temporal-ui | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | pgbackrest | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | clamav | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | sentry | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | public-proof-origin | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | service-auth-unavailable | compose-service-evidence | caddy | No Compose service UI/API screenshot was captured; this remains a human/full-assurance evidence gap. |
| warn | missing-compose-service-screenshot | compose-service-evidence | platform-api | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-compose-service-screenshot | compose-service-evidence | react-app | No service UI/API URL is derivable; API or CLI evidence is required for full-assurance staging QA. |
| warn | missing-alert | matrix | /proof/alerts | Alert page does not yet expose alert name/condition as dedicated fields. |
| warn | missing-enterprise-control | enterprise | isms-scope | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | risk-register | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | statement-of-applicability | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | assets | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | suppliers | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | access-review | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | secrets-crypto | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | audit-retention | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | backup-dr | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | change-release | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | supply-chain | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | privacy-data-protection | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | tenant-isolation | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | resilience-capacity | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | observability-runbooks | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | policy-governance | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | iso-control-support | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | internal-audit | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | legal-regulatory | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | security-objectives | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | document-control | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | competence-awareness | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | physical-environmental | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | secure-sdlc | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | evidence-integrity | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | nonconformity-corrective-action | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | management-review | Enterprise page missing Evidence status. |
| warn | missing-enterprise-control | enterprise | single-operator-risk | Enterprise page missing Evidence status. |
| human-decision-required | human-decision-required | signoff | USF-293 | Machine QA can produce evidence, but Matthew must accept or reject it. |

## Screenshots

| Route | File | Timestamp |
| --- | --- | --- |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-postgres-evidence-page.png | 2026-07-05T09:05:35.010Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/keycloak-db.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-keycloak-db-evidence-page.png | 2026-07-05T09:05:35.142Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/keycloak.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-keycloak-evidence-page.png | 2026-07-05T09:05:35.277Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/nats.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-nats-evidence-page.png | 2026-07-05T09:05:35.406Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/temporal.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-temporal-evidence-page.png | 2026-07-05T09:05:35.502Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/minio.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-minio-evidence-page.png | 2026-07-05T09:05:35.621Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/openbao.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-openbao-evidence-page.png | 2026-07-05T09:05:35.757Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/otel-collector.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-otel-collector-evidence-page.png | 2026-07-05T09:05:35.878Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/prometheus.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-prometheus-evidence-page.png | 2026-07-05T09:05:36.011Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/grafana.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-grafana-evidence-page.png | 2026-07-05T09:05:36.166Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/loki.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-loki-evidence-page.png | 2026-07-05T09:05:36.333Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/tempo.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-tempo-evidence-page.png | 2026-07-05T09:05:36.478Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/mailpit.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-mailpit-evidence-page.png | 2026-07-05T09:05:36.610Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/webhook-sink.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-webhook-sink-evidence-page.png | 2026-07-05T09:05:36.742Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-redis-evidence-page.png | 2026-07-05T09:05:36.855Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/meilisearch.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-meilisearch-evidence-page.png | 2026-07-05T09:05:36.961Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/clickhouse.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-clickhouse-evidence-page.png | 2026-07-05T09:05:37.068Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/pgadmin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-pgadmin-evidence-page.png | 2026-07-05T09:05:37.175Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/sonar-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sonar-postgres-evidence-page.png | 2026-07-05T09:05:37.280Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/sonar-oidc-plugin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | 2026-07-05T09:05:37.377Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/sonarqube.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sonarqube-evidence-page.png | 2026-07-05T09:05:37.481Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/mock-oidc.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-mock-oidc-evidence-page.png | 2026-07-05T09:05:37.577Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/localstack.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-localstack-evidence-page.png | 2026-07-05T09:05:37.675Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/wiremock.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-wiremock-evidence-page.png | 2026-07-05T09:05:37.783Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/alertmanager.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-alertmanager-evidence-page.png | 2026-07-05T09:05:37.901Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/alloy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-alloy-evidence-page.png | 2026-07-05T09:05:38.019Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/windmill-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-postgres-evidence-page.png | 2026-07-05T09:05:38.110Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/windmill-redis.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-redis-evidence-page.png | 2026-07-05T09:05:38.193Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/windmill.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-evidence-page.png | 2026-07-05T09:05:38.302Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/windmill-worker.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-worker-evidence-page.png | 2026-07-05T09:05:38.397Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/temporal-postgres.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-temporal-postgres-evidence-page.png | 2026-07-05T09:05:38.503Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/temporal-ui.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-temporal-ui-evidence-page.png | 2026-07-05T09:05:38.608Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/pgbackrest.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-pgbackrest-evidence-page.png | 2026-07-05T09:05:38.701Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/clamav.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-clamav-evidence-page.png | 2026-07-05T09:05:38.799Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/sentry.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sentry-evidence-page.png | 2026-07-05T09:05:38.918Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/public-proof-origin.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-public-proof-origin-evidence-page.png | 2026-07-05T09:05:39.060Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/caddy.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-caddy-evidence-page.png | 2026-07-05T09:05:39.210Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/platform-api.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-platform-api-evidence-page.png | 2026-07-05T09:05:39.341Z |
| artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/service-evidence/react-app.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-react-app-evidence-page.png | 2026-07-05T09:05:39.461Z |
| /proof | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/home.png | 2026-07-05T09:05:40.423Z |
| /proof/foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/foundation-substrate-closure.png | 2026-07-05T09:05:40.839Z |
| /proof/capabilities | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/capabilities.png | 2026-07-05T09:05:41.133Z |
| /proof/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/first-capability-detail.png | 2026-07-05T09:05:41.467Z |
| /proof/scenarios/cap-001-tenant-identity-record-fqdn-happy-path | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/first-scenario.png | 2026-07-05T09:05:41.654Z |
| /proof/roles | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/roles.png | 2026-07-05T09:05:41.764Z |
| /proof/actions | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/actions.png | 2026-07-05T09:05:41.896Z |
| /proof/actions/qa-mr7kfxyf-jx9skq | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/first-action-detail.png | 2026-07-05T09:05:42.019Z |
| /proof/machine-runs | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-runs.png | 2026-07-05T09:05:42.140Z |
| /proof/import | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-import.png | 2026-07-05T09:05:42.246Z |
| /proof/import/latest-machine-qa | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-import-run.png | 2026-07-05T09:05:42.518Z |
| /proof/import/latest-machine-qa/capabilities/cap-001-tenant-identity-record-fqdn | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-import-capability.png | 2026-07-05T09:05:42.658Z |
| /proof/review | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-review.png | 2026-07-05T09:05:42.715Z |
| /proof/review/gaps | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-review-gaps.png | 2026-07-05T09:05:42.783Z |
| /proof/review/nonconformities | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-review-nonconformities.png | 2026-07-05T09:05:42.847Z |
| /proof/review/corrective-actions | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-review-corrective-actions.png | 2026-07-05T09:05:42.914Z |
| /proof/export | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/machine-export.png | 2026-07-05T09:05:43.039Z |
| /proof/evidence/cap-001-tenant-identity-record-fqdn-semantic-contract | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/first-evidence.png | 2026-07-05T09:05:43.159Z |
| /proof/evidence/usf-foundation-substrate-closure | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/foundation-substrate-closure-evidence.png | 2026-07-05T09:05:43.291Z |
| /proof/audit | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/audit.png | 2026-07-05T09:05:43.526Z |
| /proof/observability | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/observability.png | 2026-07-05T09:05:43.750Z |
| /proof/fixtures | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/fixtures.png | 2026-07-05T09:05:43.923Z |
| /proof/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/alerts.png | 2026-07-05T09:05:44.159Z |
| /proof/signoff | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/signoff.png | 2026-07-05T09:05:44.363Z |
| /proof/result | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/result.png | 2026-07-05T09:05:44.431Z |
| /proof/enterprise | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise.png | 2026-07-05T09:05:44.679Z |
| /proof/enterprise/isms-scope | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-isms-scope.png | 2026-07-05T09:05:44.846Z |
| /proof/enterprise/risk-register | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-risk-register.png | 2026-07-05T09:05:45.046Z |
| /proof/enterprise/statement-of-applicability | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-statement-of-applicability.png | 2026-07-05T09:05:45.247Z |
| /proof/enterprise/assets | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-assets.png | 2026-07-05T09:05:45.412Z |
| /proof/enterprise/suppliers | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-suppliers.png | 2026-07-05T09:05:45.579Z |
| /proof/enterprise/access-review | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-access-review.png | 2026-07-05T09:05:45.755Z |
| /proof/enterprise/secrets-crypto | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-secrets-crypto.png | 2026-07-05T09:05:45.906Z |
| /proof/enterprise/audit-retention | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-audit-retention.png | 2026-07-05T09:05:46.087Z |
| /proof/enterprise/backup-dr | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-backup-dr.png | 2026-07-05T09:05:46.255Z |
| /proof/enterprise/change-release | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-change-release.png | 2026-07-05T09:05:46.405Z |
| /proof/enterprise/supply-chain | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-supply-chain.png | 2026-07-05T09:05:46.562Z |
| /proof/enterprise/privacy-data-protection | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-privacy-data-protection.png | 2026-07-05T09:05:46.724Z |
| /proof/enterprise/tenant-isolation | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-tenant-isolation.png | 2026-07-05T09:05:46.903Z |
| /proof/enterprise/resilience-capacity | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-resilience-capacity.png | 2026-07-05T09:05:47.063Z |
| /proof/enterprise/observability-runbooks | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-observability-runbooks.png | 2026-07-05T09:05:47.230Z |
| /proof/enterprise/policy-governance | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-policy-governance.png | 2026-07-05T09:05:47.398Z |
| /proof/enterprise/iso-control-support | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-iso-control-support.png | 2026-07-05T09:05:47.563Z |
| /proof/enterprise/internal-audit | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-internal-audit.png | 2026-07-05T09:05:47.730Z |
| /proof/enterprise/legal-regulatory | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-legal-regulatory.png | 2026-07-05T09:05:47.897Z |
| /proof/enterprise/security-objectives | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-security-objectives.png | 2026-07-05T09:05:48.063Z |
| /proof/enterprise/document-control | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-document-control.png | 2026-07-05T09:05:48.230Z |
| /proof/enterprise/competence-awareness | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-competence-awareness.png | 2026-07-05T09:05:48.398Z |
| /proof/enterprise/physical-environmental | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-physical-environmental.png | 2026-07-05T09:05:48.563Z |
| /proof/enterprise/secure-sdlc | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-secure-sdlc.png | 2026-07-05T09:05:48.729Z |
| /proof/enterprise/evidence-integrity | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-evidence-integrity.png | 2026-07-05T09:05:48.905Z |
| /proof/enterprise/nonconformity-corrective-action | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-nonconformity-corrective-action.png | 2026-07-05T09:05:49.053Z |
| /proof/enterprise/management-review | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-management-review.png | 2026-07-05T09:05:49.199Z |
| /proof/enterprise/single-operator-risk | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/enterprise-single-operator-risk.png | 2026-07-05T09:05:49.363Z |

## Compose Service Evidence

| Service | Role | Evidence class | URLs | Screenshot or artifact | Gaps |
| --- | --- | --- | --- | --- | --- |
| postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-postgres-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| keycloak-db | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-keycloak-db-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| keycloak | tenant admin | blocked | http://127.0.0.1:8090/admin/master/console/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-keycloak-evidence-page.png | http://127.0.0.1:8090/admin/master/console/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8090/admin/master/console/
Call log:
  - navigating to "http://127.0.0.1:8090/admin/master/console/", waiting until "domcontentloaded"
 |
| nats | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-nats-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| temporal | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-temporal-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| minio | platform operator | blocked | http://127.0.0.1:9000/, http://127.0.0.1:9001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-minio-evidence-page.png | http://127.0.0.1:9000/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:9000/
Call log:
  - navigating to "http://127.0.0.1:9000/", waiting until "domcontentloaded"
; http://127.0.0.1:9001/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:9001/
Call log:
  - navigating to "http://127.0.0.1:9001/", waiting until "domcontentloaded"
 |
| openbao | platform operator | blocked | http://127.0.0.1:8200/ui/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-openbao-evidence-page.png | http://127.0.0.1:8200/ui/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8200/ui/
Call log:
  - navigating to "http://127.0.0.1:8200/ui/", waiting until "domcontentloaded"
 |
| otel-collector | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-otel-collector-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| prometheus | auditor | unavailable | http://127.0.0.1:9090/targets | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-prometheus-evidence-page.png | http://127.0.0.1:9090/targets unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:9090/targets
Call log:
  - navigating to "http://127.0.0.1:9090/targets", waiting until "domcontentloaded"
 |
| grafana | platform operator | blocked | http://127.0.0.1:3000/login | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-grafana-evidence-page.png | http://127.0.0.1:3000/login unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/login
Call log:
  - navigating to "http://127.0.0.1:3000/login", waiting until "domcontentloaded"
 |
| loki | auditor | unavailable | http://127.0.0.1:3100/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-loki-evidence-page.png | http://127.0.0.1:3100/ready unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3100/ready
Call log:
  - navigating to "http://127.0.0.1:3100/ready", waiting until "domcontentloaded"
 |
| tempo | auditor | unavailable | http://127.0.0.1:3200/ready | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-tempo-evidence-page.png | http://127.0.0.1:3200/ready unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3200/ready
Call log:
  - navigating to "http://127.0.0.1:3200/ready", waiting until "domcontentloaded"
 |
| mailpit | platform operator | blocked | http://127.0.0.1:8025/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-mailpit-evidence-page.png | http://127.0.0.1:8025/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8025/
Call log:
  - navigating to "http://127.0.0.1:8025/", waiting until "domcontentloaded"
 |
| webhook-sink | read-only observer | unavailable | http://127.0.0.1:18088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-webhook-sink-evidence-page.png | http://127.0.0.1:18088/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:18088/
Call log:
  - navigating to "http://127.0.0.1:18088/", waiting until "domcontentloaded"
 |
| redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-redis-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| meilisearch | read-only observer | unavailable | http://127.0.0.1:7700/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-meilisearch-evidence-page.png | http://127.0.0.1:7700/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:7700/
Call log:
  - navigating to "http://127.0.0.1:7700/", waiting until "domcontentloaded"
 |
| clickhouse | read-only observer | unavailable | http://127.0.0.1:18123/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-clickhouse-evidence-page.png | http://127.0.0.1:18123/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:18123/
Call log:
  - navigating to "http://127.0.0.1:18123/", waiting until "domcontentloaded"
 |
| pgadmin | platform operator | blocked | http://127.0.0.1:5050/login | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-pgadmin-evidence-page.png | http://127.0.0.1:5050/login unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5050/login
Call log:
  - navigating to "http://127.0.0.1:5050/login", waiting until "domcontentloaded"
 |
| sonar-postgres | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sonar-postgres-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| sonar-oidc-plugin | auditor | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sonar-oidc-plugin-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| sonarqube | platform operator | blocked | http://127.0.0.1:9002/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sonarqube-evidence-page.png | http://127.0.0.1:9002/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:9002/
Call log:
  - navigating to "http://127.0.0.1:9002/", waiting until "domcontentloaded"
 |
| mock-oidc | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-mock-oidc-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| localstack | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-localstack-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| wiremock | read-only observer | unavailable | http://127.0.0.1:8089/__admin/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-wiremock-evidence-page.png | http://127.0.0.1:8089/__admin/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8089/__admin/
Call log:
  - navigating to "http://127.0.0.1:8089/__admin/", waiting until "domcontentloaded"
 |
| alertmanager | platform operator | blocked | http://127.0.0.1:9093/#/alerts | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-alertmanager-evidence-page.png | http://127.0.0.1:9093/#/alerts unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:9093/#/alerts
Call log:
  - navigating to "http://127.0.0.1:9093/#/alerts", waiting until "domcontentloaded"
 |
| alloy | auditor | unavailable | http://127.0.0.1:12345/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-alloy-evidence-page.png | http://127.0.0.1:12345/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:12345/
Call log:
  - navigating to "http://127.0.0.1:12345/", waiting until "domcontentloaded"
 |
| windmill-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-postgres-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| windmill-redis | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-redis-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| windmill | platform operator | blocked | http://127.0.0.1:8001/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-evidence-page.png | http://127.0.0.1:8001/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8001/
Call log:
  - navigating to "http://127.0.0.1:8001/", waiting until "domcontentloaded"
 |
| windmill-worker | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-windmill-worker-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| temporal-postgres | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-temporal-postgres-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| temporal-ui | platform operator | blocked | http://127.0.0.1:8088/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-temporal-ui-evidence-page.png | http://127.0.0.1:8088/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8088/
Call log:
  - navigating to "http://127.0.0.1:8088/", waiting until "domcontentloaded"
 |
| pgbackrest | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-pgbackrest-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| clamav | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-clamav-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| sentry | platform operator | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-sentry-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| public-proof-origin | read-only observer | unavailable | http://127.0.0.1:18080/.well-known/usf-public-edge.json | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-public-proof-origin-evidence-page.png | http://127.0.0.1:18080/.well-known/usf-public-edge.json unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:18080/.well-known/usf-public-edge.json
Call log:
  - navigating to "http://127.0.0.1:18080/.well-known/usf-public-edge.json", waiting until "domcontentloaded"
 |
| caddy | platform operator | blocked | http://127.0.0.1:8081/, https://127.0.0.1:8443/ | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-caddy-evidence-page.png | http://127.0.0.1:8081/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8081/
Call log:
  - navigating to "http://127.0.0.1:8081/", waiting until "domcontentloaded"
; https://127.0.0.1:8443/ unavailable or not safely reachable: page.goto: net::ERR_CONNECTION_REFUSED at https://127.0.0.1:8443/
Call log:
  - navigating to "https://127.0.0.1:8443/", waiting until "domcontentloaded"
 |
| platform-api | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-platform-api-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |
| react-app | read-only observer | cli-equivalent |  | artifacts/proof-cockpit/machine-runs/2026-07-05T09-05-14-689Z/screenshots/compose-service-react-app-evidence-page.png | No HTTP or HTTPS UI/API candidate was derivable from the service catalogue. |

## Human Import

Human import route: /proof/import/qa-run-2026-07-05T09-05-14-719Z
Machine acceptance is not automatic. Evidence can be accepted, rejected, annotated, deferred, sent for re-test, or linked to corrective action by a human auditor.

## Non-claims

This machine QA pass does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
