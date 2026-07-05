# React Service Equivalence Matrix

This artefact supports USF-291 only. It does not claim React UI parity, product UI readiness, Staging readiness, Production readiness, SOC readiness, ISO certification, enterprise production readiness, browser E2E readiness, or full product parity.

|id|reactService|disposition|sourceStatus|usfServiceOrReplacement|
|---|---|---|---|---|
|react-service-9fe84adc4eb8|alertmanager|covered-by-existing-usf-proof|deferred|observability alert posture only|
|react-service-8d809cbaa085|alloy|covered-by-existing-usf-proof|deferred|otel-collector direct config|
|react-service-11b9636f3692|clamav|covered-by-existing-usf-proof|profile-gated-bounded-proof|ClamAV local Compose proof plus deterministic scan non-equivalence boundary|
|react-service-ce66b7447d6f|clickhouse|covered-by-existing-usf-proof|profile-gated-bounded-proof|ClickHouse local Compose proof plus explicit remaining non-equivalence boundaries|
|react-service-a656a0b92420|external-caddy|covered-by-existing-usf-proof|deferred|API security posture only|
|react-service-f519bce8b0ae|grafana|covered-by-existing-usf-proof|implemented|grafana|
|react-service-d1081e351fbe|keycloak|covered-by-existing-usf-proof|implemented|keycloak|
|react-service-d5c4bf2ab392|keycloak-postgres|replaced-by-equivalent-and-proven|implemented-equivalent|keycloak-db|
|react-service-f6ea57052eeb|localstack|covered-by-existing-usf-proof|covered-by-usf-runtime|LocalStack composed-test proof plus USF-208 non-equivalence boundary|
|react-service-a5b23f338648|loki|covered-by-existing-usf-proof|implemented|loki|
|react-service-b3283d686c21|mailpit|covered-by-existing-usf-proof|implemented|mailpit|
|react-service-46005c7d19bb|meilisearch|covered-by-existing-usf-proof|profile-gated-bounded-proof|Meilisearch local Compose proof plus in-memory non-equivalence boundary|
|react-service-30747605e1f6|minio|covered-by-existing-usf-proof|implemented|minio|
|react-service-d45a1aca32a9|mock-oidc|covered-by-existing-usf-proof|covered-by-usf-runtime|adapters/idp|
|react-service-ba2d2bfc8327|openbao|covered-by-existing-usf-proof|implemented|openbao|
|react-service-2f89797f95bf|otel-collector|covered-by-existing-usf-proof|implemented|otel-collector|
|react-service-43784e464f66|pgadmin|covered-by-existing-usf-proof|deferred|none|
|react-service-cc7e58382b20|pgbackrest|covered-by-existing-usf-proof|bounded-local-proof|pgBackRest configured local cold backup/restore proof plus explicit deferred provider class|
|react-service-41d963db60cc|platform-api|covered-by-existing-usf-proof|covered-by-usf-runtime|apps/api|
|react-service-afc848c316af|postgres|covered-by-existing-usf-proof|implemented|postgres|
|react-service-aad8f23c2fa0|prometheus|covered-by-existing-usf-proof|implemented|prometheus|
|react-service-8e3b08350689|react-app|not-applicable-with-rationale|out-of-foundation-scope|USF-134 future UI|
|react-service-b840fc02d524|redis|covered-by-existing-usf-proof|profile-gated-bounded-proof|Redis local Compose SDK-backed proof plus NATS event-bus proof; non-equivalence boundary retained|
|react-service-9cee99b66a56|sentry-cleanup|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-51631665e717|sentry-clickhouse|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-476a7cf30d1d|sentry-events-consumer|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-adae9c249802|sentry-kafka|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-83291f993602|sentry-kafka-init|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-19bfc8eb9add|sentry-memcached|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-847db439f0a5|sentry-migrate|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-b46b7d724efe|sentry-post-process-forwarder|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-c7a5ad4eec66|sentry-postgres|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-4b35e306ab24|sentry-redis|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-187f48745bc5|sentry-relay|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-7ed3aa8256df|sentry-snuba-api|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-2229c3e03726|sentry-snuba-errors|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-b099f56328ff|sentry-snuba-migrate|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-598417728553|sentry-snuba-replacer|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-8083b2fba48f|sentry-taskbroker|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-d1b132d784b4|sentry-taskscheduler|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-939e2d2f0141|sentry-taskworker|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-f62d33291cd3|sentry-web|covered-by-existing-usf-proof|deferred|observability telemetry only|
|react-service-c5f575f03ba9|sonar-oidc-plugin|covered-by-existing-usf-proof|deferred|none|
|react-service-b1fd382e74ee|sonar-postgres|covered-by-existing-usf-proof|profile-gated-bounded-proof|make verify only|
|react-service-68b3ab5f7810|sonarqube|covered-by-existing-usf-proof|profile-gated-bounded-proof|make verify|
|react-service-65e336e20c50|tempo|covered-by-existing-usf-proof|implemented|tempo|
|react-service-42d9d2622f86|temporal|covered-by-existing-usf-proof|implemented|temporal|
|react-service-d1dd7807b634|temporal-postgres|replaced-by-better-service-and-proven|substituted-partial|postgres|
|react-service-6094d44af8f8|temporal-ui|covered-by-existing-usf-proof|deferred|temporal service only|
|react-service-512c585ec88c|windmill|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill configured proof plus explicit non-equivalence boundaries|
|react-service-90f4ea92727a|windmill-postgres|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill backing store proof boundary only|
|react-service-97c4d029f95a|windmill-redis|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill queue/cache proof boundary only|
|react-service-32870f764c33|windmill-worker|covered-by-existing-usf-proof|profile-gated-bounded-proof|bounded local Compose Windmill worker execution proof with explicit non-equivalence|
|react-service-bfc63c07f74f|wiremock|covered-by-existing-usf-proof|covered-by-usf-runtime|WireMock composed-test proof plus USF-209 non-equivalence boundary|
