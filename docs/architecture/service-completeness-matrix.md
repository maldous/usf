# USF Service Completeness Matrix

This artefact supports USF-291 only. It does not claim UI completeness, product UI readiness, Staging readiness, Production readiness, SOC readiness, ISO certification, enterprise production readiness, browser E2E readiness, or full product completeness.

|id|sourceLineageService|disposition|sourceStatus|usfServiceOrReplacement|
|---|---|---|---|---|
|source-service-9fe84adc4eb8|alertmanager|covered-by-existing-usf-proof|deferred|observability alert posture only|
|source-service-8d809cbaa085|alloy|covered-by-existing-usf-proof|deferred|otel-collector direct config|
|source-service-11b9636f3692|clamav|covered-by-existing-usf-proof|profile-gated-bounded-proof|ClamAV local Compose proof plus deterministic scan non-equivalence boundary|
|source-service-ce66b7447d6f|clickhouse|covered-by-existing-usf-proof|profile-gated-bounded-proof|ClickHouse local Compose proof plus explicit remaining non-equivalence boundaries|
|source-service-a656a0b92420|external-caddy|covered-by-existing-usf-proof|deferred|API security posture only|
|source-service-f519bce8b0ae|grafana|covered-by-existing-usf-proof|implemented|grafana|
|source-service-d1081e351fbe|keycloak|covered-by-existing-usf-proof|implemented|keycloak|
|source-service-d5c4bf2ab392|keycloak-postgres|replaced-by-equivalent-and-proven|implemented-equivalent|keycloak-db|
|source-service-f6ea57052eeb|localstack|covered-by-existing-usf-proof|covered-by-usf-runtime|LocalStack composed-test proof plus USF-208 non-equivalence boundary|
|source-service-a5b23f338648|loki|covered-by-existing-usf-proof|implemented|loki|
|source-service-b3283d686c21|mailpit|covered-by-existing-usf-proof|implemented|mailpit|
|source-service-46005c7d19bb|meilisearch|covered-by-existing-usf-proof|profile-gated-bounded-proof|Meilisearch local Compose proof plus in-memory non-equivalence boundary|
|source-service-30747605e1f6|minio|covered-by-existing-usf-proof|implemented|minio|
|source-service-d45a1aca32a9|mock-oidc|covered-by-existing-usf-proof|covered-by-usf-runtime|adapters/idp|
|source-service-ba2d2bfc8327|openbao|covered-by-existing-usf-proof|implemented|openbao|
|source-service-2f89797f95bf|otel-collector|covered-by-existing-usf-proof|implemented|otel-collector|
|source-service-43784e464f66|pgadmin|covered-by-existing-usf-proof|deferred|none|
|source-service-cc7e58382b20|pgbackrest|covered-by-existing-usf-proof|bounded-local-proof|pgBackRest configured local cold backup/restore proof plus explicit deferred provider class|
|source-service-41d963db60cc|platform-api|covered-by-existing-usf-proof|covered-by-usf-runtime|apps/api|
|source-service-afc848c316af|postgres|covered-by-existing-usf-proof|implemented|postgres|
|source-service-aad8f23c2fa0|prometheus|covered-by-existing-usf-proof|implemented|prometheus|
|source-service-8e3b08350689|web-app|not-applicable-with-rationale|out-of-foundation-scope|USF-134 future UI|
|source-service-b840fc02d524|redis|covered-by-existing-usf-proof|profile-gated-bounded-proof|Redis local Compose SDK-backed proof plus NATS event-bus proof; non-equivalence boundary retained|
|source-service-9cee99b66a56|sentry-cleanup|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-51631665e717|sentry-clickhouse|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-476a7cf30d1d|sentry-events-consumer|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-adae9c249802|sentry-kafka|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-83291f993602|sentry-kafka-init|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-19bfc8eb9add|sentry-memcached|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-847db439f0a5|sentry-migrate|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-b46b7d724efe|sentry-post-process-forwarder|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-c7a5ad4eec66|sentry-postgres|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-4b35e306ab24|sentry-redis|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-187f48745bc5|sentry-relay|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-7ed3aa8256df|sentry-snuba-api|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-2229c3e03726|sentry-snuba-errors|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-b099f56328ff|sentry-snuba-migrate|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-598417728553|sentry-snuba-replacer|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-8083b2fba48f|sentry-taskbroker|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-d1b132d784b4|sentry-taskscheduler|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-939e2d2f0141|sentry-taskworker|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-f62d33291cd3|sentry-web|covered-by-existing-usf-proof|deferred|observability telemetry only|
|source-service-c5f575f03ba9|sonar-oidc-plugin|covered-by-existing-usf-proof|deferred|none|
|source-service-b1fd382e74ee|sonar-postgres|covered-by-existing-usf-proof|profile-gated-bounded-proof|make verify only|
|source-service-68b3ab5f7810|sonarqube|covered-by-existing-usf-proof|profile-gated-bounded-proof|make verify|
|source-service-65e336e20c50|tempo|covered-by-existing-usf-proof|implemented|tempo|
|source-service-42d9d2622f86|temporal|covered-by-existing-usf-proof|implemented|temporal|
|source-service-d1dd7807b634|temporal-postgres|replaced-by-better-service-and-proven|substituted-partial|postgres|
|source-service-6094d44af8f8|temporal-ui|covered-by-existing-usf-proof|deferred|temporal service only|
|source-service-512c585ec88c|windmill|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill configured proof plus explicit non-equivalence boundaries|
|source-service-90f4ea92727a|windmill-postgres|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill backing store proof boundary only|
|source-service-97c4d029f95a|windmill-redis|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill queue/cache proof boundary only|
|source-service-32870f764c33|windmill-worker|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill worker execution proof with explicit non-equivalence|
|source-service-bfc63c07f74f|wiremock|covered-by-existing-usf-proof|covered-by-usf-runtime|WireMock composed-test proof plus USF-209 non-equivalence boundary|
