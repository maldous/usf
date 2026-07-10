#!/usr/bin/env python3
"""USF runtime proof manifest validator.

This validator enforces USF-181/USF-183 runtime proof semantics. It does not
execute runtime code and does not create evidence. It fails closed when the
bounded API and worker runtime proof model is missing, when compose-backed proof
is silently represented as in-memory proof, when required composed provider binding
evidence is missing, when SDK imports escape the adapter boundary, when proof
commands are not wired, when service catalogue traceability is absent, when
teardown representation is missing, or when a prohibited readiness/compliance/
parity claim is allowed.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
except Exception:  # pragma: no cover - jsonschema is available in normal repo validation.
    Draft202012Validator = None


RULES = {
    "USF-RUNTIME-001": ("blocking", "runtime proof manifest is missing or invalid"),
    "USF-RUNTIME-002": ("blocking", "runtime proof manifest lacks required modes"),
    "USF-RUNTIME-003": ("blocking", "compose-backed runtime proof is silently mapped to in-memory"),
    "USF-RUNTIME-004": ("blocking", "API or worker runtime proof is missing"),
    "USF-RUNTIME-005": ("blocking", "runtime proof command is not wired in package scripts or Make targets"),
    "USF-RUNTIME-006": ("blocking", "runtime proof allows a prohibited readiness claim"),
    "USF-RUNTIME-007": ("blocking", "compose-backed runtime proof lacks service-catalogue linkage"),
    "USF-RUNTIME-008": ("blocking", "runtime proof code or manifest lacks teardown representation"),
    "USF-RUNTIME-009": ("blocking", "runtime proof evidence boundaries are missing"),
    "USF-RUNTIME-010": ("blocking", "compose-backed deferred boundary is missing"),
    "USF-RUNTIME-011": ("blocking", "compose-backed provider binding is not resolved for a required runtime proof"),
    "USF-RUNTIME-012": ("blocking", "runtime provider binding matrix is missing or inconsistent"),
    "USF-RUNTIME-013": ("blocking", "provider SDK import escaped the authorised adapter boundary"),
    "USF-RUNTIME-014": ("blocking", "provider proof metadata exposes raw endpoint or credential material"),
    "USF-RUNTIME-015": ("blocking", "provider registry linkage for composed binding is missing"),
    "USF-RUNTIME-016": ("blocking", "provider SDK dependency is not exact-version pinned"),
    "USF-RUNTIME-017": ("blocking", "tenant-scoped provider paths lack collision-free encoding evidence"),
    "USF-RUNTIME-018": ("blocking", "Lane 5 runtime provider proof or explicit deferral is missing"),
    "USF-RUNTIME-019": ("blocking", "Lane 5 provider disposition hides an in-memory fallback"),
    "USF-RUNTIME-020": ("blocking", "Lane 5 provider SDK/client boundary is missing or unsafe"),
    "USF-RUNTIME-021": ("blocking", "Lane 5 provider disposition has unsafe readiness posture"),
    "USF-RUNTIME-022": ("blocking", "Lane 5 provider disposition overclaims provider readiness"),
    "USF-RUNTIME-023": ("blocking", "analytics event-store provider disposition is incomplete or unsafe"),
    "USF-RUNTIME-024": ("blocking", "cache and eventing service disposition is incomplete or unsafe"),
    "USF-RUNTIME-025": ("blocking", "composed search provider disposition is incomplete or unsafe"),
    "USF-RUNTIME-026": ("blocking", "file scanner provider disposition is incomplete or unsafe"),
    "USF-RUNTIME-027": ("blocking", "mock provider substrate disposition is incomplete or unsafe"),
    "USF-RUNTIME-028": ("blocking", "backup and restore provider disposition is incomplete or unsafe"),
    "USF-RUNTIME-029": ("blocking", "operator workflow provider disposition is incomplete or unsafe"),
    "USF-RUNTIME-030": ("blocking", "ClickHouse service proof boundary is incomplete or unsafe"),
    "USF-RUNTIME-031": ("blocking", "Redis cache service proof boundary is incomplete or unsafe"),
    "USF-RUNTIME-032": ("blocking", "pgBackRest configured proof boundary is incomplete or unsafe"),
    "USF-RUNTIME-033": ("blocking", "Windmill configured proof boundary is incomplete or unsafe"),
    "USF-RUNTIME-034": ("blocking", "backup restore DR and RPO/RTO operational depth is incomplete or overclaimed"),
    "USF-RUNTIME-035": ("blocking", "backup restore DR PITR and RPO/RTO execution proof is incomplete or overclaimed"),
    "USF-RUNTIME-036": ("blocking", "runtime product readiness map is missing, stale, or inconsistent"),
    "USF-RUNTIME-037": ("blocking", "runtime product proof rung, boot, health, readiness, or liveness boundary is incomplete"),
    "USF-RUNTIME-038": ("blocking", "route-backed operation runtime proof coverage is incomplete or projection-only"),
    "USF-RUNTIME-039": ("blocking", "runtime state, storage, migration, or data-boundary semantics are incomplete"),
    "USF-RUNTIME-040": ("blocking", "runtime auth, session, tenant, audit, or telemetry proof semantics are incomplete"),
    "USF-RUNTIME-SELFTEST": ("blocking", "planted runtime defect did not raise its expected rule"),
}

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path("spec/instances/runtime-proof/runtime-application-compose-parity.json")
RUNTIME_PRODUCT_READINESS_MAP_PATH = Path("docs/architecture/runtime-product-readiness-map.json")
SCHEMA_PATH = Path("spec/schemas/runtime-proof.schema.json")
ANALYTICS_EVENT_STORE_MATRIX_PATH = Path("docs/architecture/analytics-event-store-provider-disposition-matrix.json")
CLICKHOUSE_PROOF_BOUNDARY_PATH = Path("docs/architecture/clickhouse-service-semantic-proof-boundary.json")
REDIS_CACHE_PROOF_BOUNDARY_PATH = Path("docs/architecture/redis-cache-service-semantic-proof-boundary.json")
CACHE_EVENTING_MATRIX_PATH = Path("docs/architecture/cache-eventing-service-disposition-matrix.json")
COMPOSED_SEARCH_PROVIDER_MATRIX_PATH = Path("docs/architecture/composed-search-provider-disposition-matrix.json")
FILE_SCANNER_PROVIDER_MATRIX_PATH = Path("docs/architecture/file-scanner-provider-disposition-matrix.json")
MOCK_PROVIDER_SUBSTRATE_MATRIX_PATH = Path("docs/architecture/mock-provider-substrate-disposition-matrix.json")
BACKUP_RESTORE_PROVIDER_MATRIX_PATH = Path("docs/architecture/backup-restore-provider-disposition-matrix.json")
PGBACKREST_PROOF_BLOCKER_MATRIX_PATH = Path("docs/architecture/pgbackrest-backup-restore-proof-blocker-matrix.json")
PGBACKREST_CONFIGURED_PROOF_BOUNDARY_PATH = Path("docs/architecture/pgbackrest-configured-proof-boundary.json")
BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH = Path(
    "docs/architecture/backup-restore-dr-rpo-rto-operational-proof-depth.json"
)
BACKUP_RESTORE_EXECUTION_PROOF_PATH = Path(
    "docs/architecture/backup-restore-dr-pitr-rpo-rto-execution-proof.json"
)
OPERATOR_WORKFLOW_PROVIDER_MATRIX_PATH = Path("docs/architecture/operator-workflow-provider-disposition-matrix.json")
WINDMILL_PROOF_BLOCKER_MATRIX_PATH = Path("docs/architecture/windmill-operator-automation-proof-blocker-matrix.json")
WINDMILL_CONFIGURED_PROOF_BOUNDARY_PATH = Path("docs/architecture/windmill-configured-proof-boundary.json")
PACKAGE_PATH = Path("package.json")
MAKEFILE_PATH = Path("Makefile")
PROOF_SOURCE_PATH = Path("packages/proof/src/runtime-application-proof.ts")
RUNTIME_SOURCE_PATH = Path("apps/api/src/runtime.ts")
WORKER_SOURCE_PATH = Path("apps/work/src/worker.ts")
ADAPTER_MAIL_SOURCE_PATH = Path("adapters/mail/src/index.ts")
ADAPTER_DB_SOURCE_PATH = Path("adapters/db/src/index.ts")
ADAPTER_BUS_SOURCE_PATH = Path("adapters/bus/src/index.ts")
ADAPTER_STORE_SOURCE_PATH = Path("adapters/store/src/index.ts")
ADAPTER_IDP_SOURCE_PATH = Path("adapters/idp/src/index.ts")
ADAPTER_SECRETS_SOURCE_PATH = Path("adapters/secrets/src/index.ts")
ADAPTER_WF_SOURCE_PATH = Path("adapters/wf/src/index.ts")
ADAPTER_SEARCH_SOURCE_PATH = Path("adapters/search/src/index.ts")
ADAPTER_RESOURCES_SOURCE_PATH = Path("adapters/resources/src/index.ts")
ADAPTER_PROVIDER_MOCK_SOURCE_PATH = Path("adapters/mail/src/index.ts")
MEILISEARCH_PROOF_SOURCE_PATH = Path("packages/proof/src/meilisearch-composed-proof.ts")
CLAMAV_PROOF_SOURCE_PATH = Path("packages/proof/src/clamav-composed-proof.ts")
MOCK_PROVIDER_PROOF_SOURCE_PATH = Path("packages/proof/src/mock-provider-substrate-proof.ts")
WIREMOCK_PROOF_SOURCE_PATH = Path("packages/proof/src/wiremock-composed-proof.ts")
LOCALSTACK_PROOF_SOURCE_PATH = Path("packages/proof/src/localstack-composed-proof.ts")
CLICKHOUSE_PROOF_SOURCE_PATH = Path("packages/proof/src/clickhouse-composed-proof.ts")
REDIS_PROOF_SOURCE_PATH = Path("packages/proof/src/redis-composed-proof.ts")
PGBACKREST_PROOF_SOURCE_PATH = Path("packages/proof/src/pgbackrest-configured-proof.ts")
BACKUP_RESTORE_OPERATIONS_PROOF_SOURCE_PATH = Path(
    "packages/proof/src/backup-restore-operations-execution-proof.ts"
)
WINDMILL_PROOF_SOURCE_PATH = Path("packages/proof/src/windmill-configured-proof.ts")
PROVIDER_REGISTRY_SOURCE_PATH = Path("packages/core/src/index.ts")
SERVICE_CATALOGUE_PATH = "spec/instances/compose-service/service-catalogue.json"
COMPOSE_TARGET = "compose/compose.dev.generated.yaml"
PLANTED_DEFECT_DIR = Path("tools/validate-runtime/planted-defects")
MAILPIT_BINDING_ID = "mailpit-notification-provider"
MAILPIT_PROVIDER_ID = "notification-delivery-mailpit-composed-test"
MAILPIT_SERVICE_ID = "mailpit"
MAILPIT_SDK_PACKAGE = "mailpit-api"
MAILPIT_SDK_VERSION = "2.1.0"
POSTGRES_BINDING_ID = "runtime-database-provider-binding"
POSTGRES_PROVIDER_ID = "database-postgres-composed-test"
POSTGRES_SERVICE_ID = "postgres"
POSTGRES_SDK_PACKAGE = "pg"
POSTGRES_SDK_VERSION = "8.22.0"
POSTGRES_TYPES_PACKAGE = "@types/pg"
POSTGRES_TYPES_VERSION = "8.20.0"
REQUIRED_PROVIDER_BINDINGS = {
    POSTGRES_BINDING_ID: {
        "serviceId": POSTGRES_SERVICE_ID,
        "providerId": POSTGRES_PROVIDER_ID,
        "adapterName": "PostgresTenantMembershipRepository",
        "portName": "TenantScopedRepository,TenantMembershipDirectory",
        "sdkPackage": POSTGRES_SDK_PACKAGE,
        "sdkVersion": POSTGRES_SDK_VERSION,
        "adapterPath": ADAPTER_DB_SOURCE_PATH,
        "apiMarker": "PostgresTenantMembershipRepository",
        "workerMarker": "Postgres provider evidence",
    },
    MAILPIT_BINDING_ID: {
        "serviceId": MAILPIT_SERVICE_ID,
        "providerId": MAILPIT_PROVIDER_ID,
        "adapterName": "MailpitNotificationProvider",
        "portName": "NotificationProvider",
        "sdkPackage": MAILPIT_SDK_PACKAGE,
        "sdkVersion": MAILPIT_SDK_VERSION,
        "adapterPath": ADAPTER_MAIL_SOURCE_PATH,
        "apiMarker": MAILPIT_PROVIDER_ID,
        "workerMarker": "Mailpit provider evidence",
    },
    "nats-event-bus-provider": {
        "serviceId": "nats",
        "providerId": "event-bus-nats-composed-test",
        "adapterName": "NatsEventBus",
        "portName": "EventBus",
        "sdkPackage": "@nats-io/transport-node",
        "sdkVersion": "3.4.0",
        "adapterPath": ADAPTER_BUS_SOURCE_PATH,
        "apiMarker": "NatsEventBus",
        "workerMarker": "NATS provider evidence",
    },
    "minio-object-storage-provider": {
        "serviceId": "minio",
        "providerId": "object-storage-minio-composed-test",
        "adapterName": "MinioObjectStore",
        "portName": "ObjectStore",
        "sdkPackage": "minio",
        "sdkVersion": "8.0.7",
        "adapterPath": ADAPTER_STORE_SOURCE_PATH,
        "apiMarker": "MinioObjectStore",
        "workerMarker": "MinIO provider evidence",
    },
    "keycloak-identity-provider": {
        "serviceIds": ["keycloak", "keycloak-db"],
        "providerId": "identity-keycloak-composed-test",
        "adapterName": "KeycloakComposedIdentityProvider",
        "portName": "IdentityProvider,KeycloakVerifier",
        "sdkPackage": "@keycloak/keycloak-admin-client",
        "sdkVersion": "26.5.6",
        "adapterPath": ADAPTER_IDP_SOURCE_PATH,
        "apiMarker": "KeycloakComposedIdentityProvider",
        "workerMarker": "Keycloak provider evidence",
    },
    "openbao-secret-provider": {
        "serviceId": "openbao",
        "providerId": "secret-store-openbao-composed-test",
        "adapterName": "OpenBaoSecretStore",
        "portName": "SecretResolver,SecretStore",
        "sdkPackage": "node-vault",
        "sdkVersion": "0.12.0",
        "adapterPath": ADAPTER_SECRETS_SOURCE_PATH,
        "apiMarker": "OpenBaoSecretStore",
        "workerMarker": "OpenBao provider evidence",
    },
    "temporal-workflow-provider": {
        "serviceId": "temporal",
        "providerId": "workflow-engine-temporal-composed-test",
        "adapterName": "TemporalComposedWorkflowEngine",
        "portName": "WorkflowEngine",
        "sdkPackage": "@temporalio/client,@temporalio/worker,@temporalio/workflow",
        "sdkVersion": "1.18.1",
        "adapterPath": ADAPTER_WF_SOURCE_PATH,
        "apiMarker": "TemporalComposedWorkflowEngine",
        "workerMarker": "Temporal provider evidence",
        "dependencyPackages": ["@temporalio/client", "@temporalio/worker", "@temporalio/workflow"],
    },
}

REQUIRED_MODES = {"dev-in-memory", "dev-compose-backed"}
REQUIRED_BOUNDARY_FIELDS = {
    "syntheticDataBoundary",
    "accessBoundary",
    "auditEvidenceBoundary",
    "secretBoundary",
    "tenantBoundary",
}
REQUIRED_PROHIBITED_CLAIMS = {
    "production-readiness",
    "staging-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "full-dev-readiness",
    "full-product-readiness",
    "test-readiness",
}
RUNTIME_PRODUCT_READINESS_SCOPE = "bounded-current-main-local-and-compose-runtime-product-readiness"
RUNTIME_PRODUCT_READINESS_VALIDATOR = "validate-runtime.runtime-product-readiness-map"
RUNTIME_PRODUCT_REQUIRED_CHILD_ISSUES = {"USF-1057", "USF-1058", "USF-1059", "USF-1060"}
RUNTIME_PRODUCT_REQUIRED_TRUE_CLAIMS = {
    "runtimeProductReady",
    "localDevRuntimeReady",
    "composeRuntimeReady",
    "routeBackedOperationRuntimeProofReady",
    "runtimeStateBoundaryReady",
    "runtimeNegativePathProofReady",
}
RUNTIME_PRODUCT_FORBIDDEN_TRUE_CLAIMS = {
    "productUiReady",
    "publicDeploymentReady",
    "publicFqdnReady",
    "deploymentReady",
    "stagingReady",
    "productionReady",
    "liveProviderReady",
    "packagePublicationReady",
    "complianceReady",
    "monetisationReady",
    "appStoreReady",
    "humanAcceptanceComplete",
}
RUNTIME_PRODUCT_REQUIRED_NONCLAIMS = {
    "no-product-ui-readiness-claim",
    "no-public-deployment-claim",
    "no-public-fqdn-claim",
    "no-deployment-claim",
    "no-staging-claim",
    "no-production-claim",
    "no-live-provider-claim",
    "no-package-publication-claim",
    "no-compliance-claim",
    "no-monetisation-claim",
    "no-app-store-claim",
    "no-human-acceptance-claim",
}
RUNTIME_PRODUCT_SOURCE_ANCHOR_PATHS = {
    "docs/architecture/current-main-capability-service-realisation-map.json",
    "docs/architecture/non-ui-client-callable-contract-map.json",
    "docs/architecture/api-route-interface-contract-coverage.json",
    "docs/architecture/public-api-readiness-map.json",
    "spec/instances/runtime-proof/runtime-application-compose-parity.json",
    "packages/proof/src/runtime-application-proof.ts",
    "apps/api/src/runtime.ts",
    "apps/work/src/worker.ts",
    "tools/validate-runtime/validate-runtime.py",
}
RUNTIME_PRODUCT_REQUIRED_PLANTED_RULES = {
    "USF-RUNTIME-036",
    "USF-RUNTIME-037",
    "USF-RUNTIME-038",
    "USF-RUNTIME-039",
    "USF-RUNTIME-040",
}
RUNTIME_PRODUCT_ALLOWED_OPERATION_PROOF_STATUSES = {
    "direct-runtime-proof",
    "executable-domain-proof-bound-to-route-contract",
}
RUNTIME_PRODUCT_DIRECT_PROOF_ROUTES = {
    "healthz.get",
    "readyz.get",
    "openapi.get",
    "tenant-context.get",
    "auth-login.post",
    "authz-permissions.get",
    "files.upload",
    "files.download",
    "jobs.create",
    "notification-templates.create",
    "notifications.create",
    "notifications.send",
}
ANALYTICS_EVENT_STORE_REQUIRED_ISSUES = {"USF-172", "USF-197", "USF-206", "USF-189", "USF-184", "USF-192", "USF-133"}
ANALYTICS_EVENT_STORE_REQUIRED_EVIDENCE_REFS = {
    "usf-172-soa-analytics-event-store-disposition",
    "usf-172-evidence-analytics-event-store-disposition",
    "usf-172-threat-clickhouse-overclaim",
    "usf-172-access-analytics-event-store",
    "usf-172-incident-vulnerability-analytics-event-store",
    "usf-172-privacy-analytics-event-store",
    "usf-197-soa-clickhouse-proof-boundary",
    "usf-197-evidence-clickhouse-proof-boundary",
    "usf-197-threat-clickhouse-overclaim",
    "usf-197-access-clickhouse-proof-boundary",
    "usf-197-incident-vulnerability-clickhouse-proof-boundary",
    "usf-197-privacy-clickhouse-proof-boundary",
    "usf-206-soa-clickhouse-composed-proof",
    "usf-206-evidence-clickhouse-composed-proof",
    "usf-206-threat-clickhouse-overclaim",
    "usf-206-access-clickhouse-composed-proof",
    "usf-206-resilience-clickhouse-composed-proof",
    "usf-206-incident-vulnerability-clickhouse-composed-proof",
    "usf-206-privacy-clickhouse-composed-proof",
    "sdk-usf-189-clickhouse-analytics-provider-at-clickhouse-client",
}
CLICKHOUSE_BOUNDARY_REQUIRED_ISSUES = {"USF-197", "USF-206", "USF-172", "USF-189", "USF-184", "USF-192", "USF-133"}
CLICKHOUSE_BOUNDARY_REQUIRED_EVIDENCE_REFS = {
    "usf-197-soa-clickhouse-proof-boundary",
    "usf-197-evidence-clickhouse-proof-boundary",
    "usf-197-threat-clickhouse-overclaim",
    "usf-197-access-clickhouse-proof-boundary",
    "usf-197-incident-vulnerability-clickhouse-proof-boundary",
    "usf-197-privacy-clickhouse-proof-boundary",
    "usf-206-soa-clickhouse-composed-proof",
    "usf-206-evidence-clickhouse-composed-proof",
    "usf-206-threat-clickhouse-overclaim",
    "usf-206-access-clickhouse-composed-proof",
    "usf-206-resilience-clickhouse-composed-proof",
    "usf-206-incident-vulnerability-clickhouse-composed-proof",
    "usf-206-privacy-clickhouse-composed-proof",
    "sdk-usf-189-clickhouse-analytics-provider-at-clickhouse-client",
}
REDIS_CACHE_BOUNDARY_REQUIRED_ISSUES = {"USF-198", "USF-207", "USF-173", "USF-189", "USF-184", "USF-192", "USF-133"}
REDIS_CACHE_BOUNDARY_REQUIRED_EVIDENCE_REFS = {
    "usf-198-soa-redis-cache-proof-boundary",
    "usf-198-evidence-redis-cache-proof-boundary",
    "usf-198-threat-redis-cache-overclaim",
    "usf-198-access-redis-cache-proof-boundary",
    "usf-198-incident-vulnerability-redis-cache-proof-boundary",
    "usf-198-privacy-redis-cache-proof-boundary",
    "usf-207-soa-redis-composed-proof",
    "usf-207-evidence-redis-composed-proof",
    "usf-207-threat-redis-cache-overclaim",
    "usf-207-access-redis-composed-proof",
    "usf-207-resilience-redis-composed-proof",
    "usf-207-incident-vulnerability-redis-composed-proof",
    "usf-207-privacy-redis-composed-proof",
    "sdk-usf-189-redis-cache-provider-redis",
}
ANALYTICS_EVENT_STORE_PROHIBITED_CLAIMS = REQUIRED_PROHIBITED_CLAIMS | {
    "analytics-readiness",
    "analytics-provider-readiness",
    "event-store-readiness",
    "clickhouse-readiness",
    "provider-compatibility-readiness",
}
CLICKHOUSE_BOUNDARY_PROHIBITED_CLAIMS = ANALYTICS_EVENT_STORE_PROHIBITED_CLAIMS | {
    "usf-133-closure",
}
CACHE_EVENTING_REQUIRED_ISSUES = {"USF-173", "USF-198", "USF-207", "USF-189", "USF-184", "USF-192", "USF-133"}
CACHE_EVENTING_REQUIRED_EVIDENCE_REFS = {
    "usf-173-soa-cache-eventing-disposition",
    "usf-173-evidence-cache-eventing-disposition",
    "usf-173-threat-redis-nats-overclaim",
    "usf-173-access-cache-eventing",
    "usf-173-incident-vulnerability-cache-eventing",
    "usf-173-privacy-cache-eventing",
    *REDIS_CACHE_BOUNDARY_REQUIRED_EVIDENCE_REFS,
}
CACHE_EVENTING_PROHIBITED_CLAIMS = REQUIRED_PROHIBITED_CLAIMS | {
    "cache-readiness",
    "eventing-readiness",
    "redis-readiness",
    "nats-readiness",
    "live-cache-readiness",
    "live-eventing-readiness",
    "provider-compatibility-readiness",
}
REDIS_CACHE_BOUNDARY_PROHIBITED_CLAIMS = CACHE_EVENTING_PROHIBITED_CLAIMS | {
    "usf-133-closure",
}
COMPOSED_SEARCH_PROVIDER_REQUIRED_ISSUES = {"USF-174", "USF-199", "USF-189", "USF-184", "USF-192", "USF-133"}
COMPOSED_SEARCH_PROVIDER_REQUIRED_EVIDENCE_REFS = {
    "usf-174-soa-composed-search-provider-disposition",
    "usf-174-evidence-composed-search-provider-disposition",
    "usf-174-threat-meilisearch-overclaim",
    "usf-174-access-composed-search-provider",
    "usf-174-incident-vulnerability-composed-search-provider",
    "usf-174-privacy-composed-search-provider",
    "usf-199-soa-meilisearch-composed-proof",
    "usf-199-evidence-meilisearch-composed-proof",
    "usf-199-threat-meilisearch-runtime-overclaim",
    "usf-199-access-meilisearch-composed-proof",
    "usf-199-resilience-meilisearch-composed-proof",
    "usf-199-incident-vulnerability-meilisearch-composed-proof",
    "usf-199-privacy-meilisearch-composed-proof",
}
COMPOSED_SEARCH_PROVIDER_PROHIBITED_CLAIMS = REQUIRED_PROHIBITED_CLAIMS | {
    "search-readiness",
    "search-provider-readiness",
    "composed-search-readiness",
    "meilisearch-readiness",
    "live-search-readiness",
    "vector-search-readiness",
    "ai-search-readiness",
    "provider-compatibility-readiness",
}
FILE_SCANNER_PROVIDER_REQUIRED_ISSUES = {"USF-175", "USF-200", "USF-189", "USF-184", "USF-192", "USF-133"}
FILE_SCANNER_PROVIDER_REQUIRED_EVIDENCE_REFS = {
    "usf-175-soa-file-scanner-provider-disposition",
    "usf-175-evidence-file-scanner-provider-disposition",
    "usf-175-threat-clamav-overclaim",
    "usf-175-access-file-scanner-provider",
    "usf-175-incident-vulnerability-file-scanner-provider",
    "usf-175-privacy-file-scanner-provider",
    "usf-200-soa-clamav-composed-proof",
    "usf-200-evidence-clamav-composed-proof",
    "usf-200-threat-clamav-runtime-overclaim",
    "usf-200-access-clamav-composed-proof",
    "usf-200-resilience-clamav-composed-proof",
    "usf-200-incident-vulnerability-clamav-composed-proof",
    "usf-200-privacy-clamav-composed-proof",
}
FILE_SCANNER_PROVIDER_PROHIBITED_CLAIMS = REQUIRED_PROHIBITED_CLAIMS | {
    "scanner-readiness",
    "file-scanner-readiness",
    "composed-scanner-readiness",
    "clamav-readiness",
    "live-scanner-readiness",
    "dlp-readiness",
    "vulnerability-clearance-readiness",
    "provider-compatibility-readiness",
}
MOCK_PROVIDER_SUBSTRATE_REQUIRED_ISSUES = {
    "USF-176",
    "USF-201",
    "USF-208",
    "USF-209",
    "USF-210",
    "USF-189",
    "USF-184",
    "USF-192",
    "USF-133",
}
MOCK_PROVIDER_SUBSTRATE_REQUIRED_EVIDENCE_REFS = {
    "usf-176-soa-mock-provider-substrate-disposition",
    "usf-176-evidence-mock-provider-substrate-disposition",
    "usf-176-threat-mock-provider-overclaim",
    "usf-176-access-mock-provider-substrate",
    "usf-176-incident-vulnerability-mock-provider-substrate",
    "usf-176-privacy-mock-provider-substrate",
    "usf-201-soa-webhook-sink-composed-proof",
    "usf-201-evidence-webhook-sink-composed-proof",
    "usf-201-threat-mock-provider-execution-split",
    "usf-201-access-webhook-sink-composed-proof",
    "usf-201-resilience-webhook-sink-composed-proof",
    "usf-201-incident-vulnerability-mock-provider-split",
    "usf-201-privacy-webhook-sink-composed-proof",
    "usf-209-soa-wiremock-composed-proof",
    "usf-209-evidence-wiremock-composed-proof",
    "usf-209-threat-wiremock-overclaim",
    "sdk-usf-209-wiremock-http-mock-provider-wiremock-captain",
    "usf-209-access-wiremock-composed-proof",
    "usf-209-resilience-wiremock-composed-proof",
    "usf-209-incident-vulnerability-wiremock-composed-proof",
    "usf-209-privacy-wiremock-composed-proof",
    "usf-208-soa-localstack-composed-proof",
    "usf-208-evidence-localstack-composed-proof",
    "usf-208-threat-localstack-overclaim",
    "sdk-usf-208-localstack-cloud-emulator-aws-sdk-v3",
    "usf-208-access-localstack-composed-proof",
    "usf-208-resilience-localstack-composed-proof",
    "usf-208-incident-vulnerability-localstack-composed-proof",
    "usf-208-privacy-localstack-composed-proof",
    "usf-210-soa-mock-oidc-reclassification",
    "usf-210-evidence-mock-oidc-reclassification",
    "usf-210-threat-mock-oidc-overclaim",
    "sdk-usf-210-mock-oidc-not-selected",
    "usf-210-access-mock-oidc-reclassification",
    "usf-210-resilience-mock-oidc-reclassification",
    "usf-210-incident-vulnerability-mock-oidc-reclassification",
    "usf-210-privacy-mock-oidc-reclassification",
}
MOCK_PROVIDER_SUBSTRATE_PROHIBITED_CLAIMS = REQUIRED_PROHIBITED_CLAIMS | {
    "local-mock-completeness-readiness",
    "mock-provider-readiness",
    "external-provider-compatibility-readiness",
    "localstack-readiness",
    "wiremock-readiness",
    "webhook-delivery-readiness",
    "mock-oidc-readiness",
    "provider-compatibility-readiness",
}
BACKUP_RESTORE_PROVIDER_REQUIRED_ISSUES = {"USF-177", "USF-202", "USF-211", "USF-189", "USF-184", "USF-192", "USF-133"}
PGBACKREST_PROOF_BLOCKER_REQUIRED_ISSUES = {
    "USF-177",
    "USF-202",
    "USF-211",
    "USF-189",
    "USF-184",
    "USF-192",
    "USF-133",
}
BACKUP_RESTORE_PROVIDER_REQUIRED_EVIDENCE_REFS = {
    "usf-177-soa-backup-restore-provider-disposition",
    "usf-177-evidence-backup-restore-provider-disposition",
    "usf-177-threat-pgbackrest-overclaim",
    "usf-177-access-backup-restore-provider",
    "usf-177-resilience-backup-restore-provider",
    "usf-177-incident-vulnerability-backup-restore-provider",
    "usf-177-privacy-backup-restore-provider",
}
PGBACKREST_PROOF_BLOCKER_REQUIRED_EVIDENCE_REFS = {
    "usf-202-soa-pgbackrest-proof-blocker",
    "usf-202-evidence-pgbackrest-proof-blocker",
    "usf-202-threat-pgbackrest-proof-blocker",
    "usf-202-access-pgbackrest-proof-blocker",
    "usf-202-resilience-pgbackrest-proof-blocker",
    "usf-202-incident-vulnerability-pgbackrest-proof-blocker",
    "usf-202-privacy-pgbackrest-proof-blocker",
    "sdk-usf-202-pgbackrest-cli-blocked",
}
PGBACKREST_CONFIGURED_PROOF_REQUIRED_ISSUES = {
    "USF-177",
    "USF-202",
    "USF-211",
    "USF-189",
    "USF-184",
    "USF-192",
    "USF-133",
}
PGBACKREST_CONFIGURED_PROOF_REQUIRED_EVIDENCE_REFS = {
    "usf-211-soa-pgbackrest-configured-proof",
    "usf-211-evidence-pgbackrest-configured-proof",
    "usf-211-threat-pgbackrest-overclaim",
    "usf-211-access-pgbackrest-configured-proof",
    "usf-211-resilience-pgbackrest-configured-proof",
    "usf-211-incident-vulnerability-pgbackrest-configured-proof",
    "usf-211-privacy-pgbackrest-configured-proof",
    "sdk-usf-211-pgbackrest-official-cli",
}
BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_ISSUES = {
    "USF-219",
    "USF-223",
    "USF-211",
    "USF-202",
    "USF-177",
    "USF-139",
    "USF-147",
    "USF-193",
    "USF-184",
    "USF-192",
    "USF-133",
}
BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_EVIDENCE_REFS = {
    "soa-usf-219-backup-restore-dr-rpo-rto-depth",
    "evidence-usf-219-backup-restore-dr-rpo-rto-disposition",
    "threat-usf-219-backup-dr-rpo-rto-overclaim",
    "resilience-usf-219-backup-restore-dr-rpo-rto-boundary",
    "incident-usf-219-backup-restore-dr-boundary",
    "privacy-usf-219-backup-restore-data-boundary",
}
BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_BOUNDARIES = {
    "pgbackrest-cold-backup-restore-local-proof",
    "online-backup-and-wal-archive",
    "pitr-and-scheduled-backup-operation",
    "corruption-failure-and-dr-rehearsal",
    "rpo-rto-measurement",
    "provider-managed-backup-and-supplier-boundary",
}
BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_DATA_SERVICES = {
    "postgres",
    "keycloak-db",
    "minio",
    "openbao",
    "redis",
    "meilisearch",
    "clickhouse",
    "sonar-postgres",
    "sonar-oidc-plugin",
    "windmill-postgres",
    "windmill-redis",
    "temporal-postgres",
    "pgbackrest",
}
BACKUP_RESTORE_EXECUTION_REQUIRED_ISSUES = {
    "USF-223",
    "USF-219",
    "USF-211",
    "USF-202",
    "USF-177",
    "USF-139",
    "USF-147",
    "USF-193",
    "USF-184",
    "USF-192",
    "USF-133",
}
BACKUP_RESTORE_EXECUTION_REQUIRED_EVIDENCE_REFS = {
    "soa-usf-223-backup-restore-execution-proof",
    "evidence-usf-223-backup-restore-execution-proof",
    "evidence-proof-proof-backup-operations",
    "threat-usf-223-backup-restore-overclaim",
    "resilience-usf-223-backup-restore-execution-boundary",
    "incident-usf-223-backup-restore-execution-boundary",
    "privacy-usf-223-backup-restore-data-boundary",
}
BACKUP_RESTORE_EXECUTION_REQUIRED_BOUNDARIES = {
    "online-backup-and-wal-archive-local-proof",
    "pitr-and-scheduled-backup-operation-local-proof",
    "failure-dr-rpo-rto-local-proof",
}
BACKUP_RESTORE_EXECUTION_REQUIRED_DEFERRED_BOUNDARIES = {
    "environment-promotion-backup-gates",
    "provider-managed-backup-and-supplier-boundary",
}
BACKUP_RESTORE_PROVIDER_PROHIBITED_CLAIMS = REQUIRED_PROHIBITED_CLAIMS | {
    "backup-readiness",
    "restore-readiness",
    "backup-restore-readiness",
    "disaster-recovery-readiness",
    "dr-readiness",
    "rpo-rto-readiness",
    "pgbackrest-readiness",
    "provider-compatibility-readiness",
}
OPERATOR_WORKFLOW_PROVIDER_REQUIRED_ISSUES = {
    "USF-178",
    "USF-203",
    "USF-212",
    "USF-189",
    "USF-184",
    "USF-192",
    "USF-169",
    "USF-180",
    "USF-133",
}
OPERATOR_WORKFLOW_PROVIDER_REQUIRED_EVIDENCE_REFS = {
    "usf-178-soa-operator-workflow-provider-disposition",
    "usf-178-evidence-operator-workflow-provider-disposition",
    "usf-178-threat-windmill-overclaim",
    "usf-178-access-operator-workflow-provider",
    "usf-178-resilience-operator-workflow-provider",
    "usf-178-incident-vulnerability-operator-workflow-provider",
    "usf-178-privacy-operator-workflow-provider",
}
WINDMILL_PROOF_BLOCKER_REQUIRED_ISSUES = {
    "USF-178",
    "USF-203",
    "USF-212",
    "USF-189",
    "USF-184",
    "USF-192",
    "USF-169",
    "USF-180",
    "USF-133",
}
WINDMILL_PROOF_BLOCKER_REQUIRED_EVIDENCE_REFS = {
    "usf-203-soa-windmill-proof-blocker",
    "usf-203-evidence-windmill-proof-blocker",
    "usf-203-threat-windmill-proof-blocker",
    "usf-203-access-windmill-proof-blocker",
    "usf-203-resilience-windmill-proof-blocker",
    "usf-203-incident-vulnerability-windmill-proof-blocker",
    "usf-203-privacy-windmill-proof-blocker",
    "sdk-usf-203-windmill-client-blocked",
}
WINDMILL_CONFIGURED_PROOF_REQUIRED_ISSUES = {
    "USF-178",
    "USF-203",
    "USF-212",
    "USF-189",
    "USF-184",
    "USF-192",
    "USF-169",
    "USF-180",
    "USF-133",
}
WINDMILL_CONFIGURED_PROOF_REQUIRED_EVIDENCE_REFS = {
    "usf-212-soa-windmill-configured-proof",
    "usf-212-evidence-windmill-configured-proof",
    "usf-212-threat-windmill-overclaim",
    "usf-212-access-windmill-configured-proof",
    "usf-212-resilience-windmill-configured-proof",
    "usf-212-incident-vulnerability-windmill-configured-proof",
    "usf-212-privacy-windmill-configured-proof",
    "sdk-usf-212-windmill-client",
}
OPERATOR_WORKFLOW_PROVIDER_PROHIBITED_CLAIMS = REQUIRED_PROHIBITED_CLAIMS | {
    "operator-automation-readiness",
    "windmill-readiness",
    "workflow-automation-readiness",
    "operator-workflow-readiness",
    "privileged-operation-readiness",
    "provider-compatibility-readiness",
}
LANE5_PROVIDER_DISPOSITIONS = {
    "usf-189-clickhouse-analytics-provider": {
        "serviceIds": ["clickhouse"],
        "providerIds": ["analytics-store-clickhouse-composed-test", "analytics-store-clickhouse-deferred"],
        "followUpIssue": "USF-206",
        "boundaryRef": "usf-189-analytics-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-189-redis-cache-provider": {
        "serviceIds": ["redis"],
        "providerIds": ["cache-redis-composed-test", "cache-redis-deferred"],
        "followUpIssue": "USF-207",
        "boundaryRef": "usf-189-cache-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-189-meilisearch-search-provider": {
        "serviceIds": ["meilisearch"],
        "providerIds": ["full-text-search-meilisearch-composed-test", "full-text-search-meilisearch-deferred"],
        "followUpIssue": "USF-199",
        "boundaryRef": "usf-189-search-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-189-clamav-scanner-provider": {
        "serviceIds": ["clamav"],
        "providerIds": ["file-scan-clamav-composed-test", "file-scan-clamav-deferred"],
        "followUpIssue": "USF-200",
        "boundaryRef": "usf-189-scanner-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-189-localstack-cloud-mock-provider": {
        "serviceIds": ["localstack"],
        "providerIds": ["provider-emulator-localstack-composed-test", "provider-emulator-localstack-deferred"],
        "followUpIssue": "USF-208",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-209-wiremock-http-mock-provider": {
        "serviceIds": ["wiremock"],
        "providerIds": ["provider-mock-wiremock-composed-test", "provider-mock-wiremock-deferred"],
        "followUpIssue": "USF-208",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-189-webhook-sink-capture-provider": {
        "serviceIds": ["webhook-sink"],
        "providerIds": [
            "notification-delivery-webhook-sink-composed-test",
            "notification-delivery-webhook-sink-deferred",
        ],
        "followUpIssue": "USF-201",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-189-pgbackrest-backup-provider": {
        "serviceIds": ["pgbackrest"],
        "providerIds": ["backup-restore-pgbackrest-composed-test", "backup-restore-pgbackrest-deferred"],
        "followUpIssue": "USF-211",
        "boundaryRef": "usf-189-backup-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
    "usf-189-windmill-automation-provider": {
        "serviceIds": ["windmill", "windmill-worker", "windmill-postgres", "windmill-redis"],
        "providerIds": ["operational-job-engine-windmill-composed-test", "operational-job-engine-windmill-deferred"],
        "followUpIssue": "USF-212",
        "boundaryRef": "usf-189-workflow-automation-provider-deferred",
        "allowedStatuses": {"profile-gated-proven"},
    },
}
LANE5_RISK_TOKENS = (
    "effectivenessState=deferred-with-owner",
    "riskStatement=",
    "threatFailureScenario=",
    "affectedAssetService=",
    "impact=",
    "likelihood=",
    "owner=",
    "treatment=",
    "reviewDate=",
    "linkedFollowUpIssue=",
)
LANE5_OVERCLAIM_RE = re.compile(
    r"production-ready\b|staging-ready\b|test-ready\b|live-provider-ready\b|provider proof complete|"
    r"full dev readiness|full functional completeness|satisfies live|(?<!non-)equivalent to live|ready for production",
    re.IGNORECASE,
)
LANE5_HIDDEN_FALLBACK_RE = re.compile(
    r"(?:in-memory|process memory|nats)[^.]{0,100}\b(?:satisfies|proves|equivalent to|substitutes)\b.*"
    r"(?:composed|provider|redis|clickhouse|meilisearch|clamav|windmill)",
    re.IGNORECASE,
)
PROHIBITED_ALLOWED_MARKERS = {
    "production",
    "staging",
    "live-provider",
    "soc",
    "iso",
    "full-dev",
    "full-product-readiness",
    "test-readiness",
}
SOURCE_TEARDOWN_MARKERS = (
    "finally",
    "stopProcess",
    "SIGTERM",
    "SIGKILL",
    "docker",
    "compose",
    "down",
    "-v",
    "--remove-orphans",
    "HOST: \"127.0.0.1\"",
    "PORT: \"0\"",
    "USF_WORKER_RUN_ONCE",
)
PROVIDER_SDK_IMPORT_RE = re.compile(
    r"(?:from\s+|import\()[\"'](?:pg|postgres|redis|ioredis|@clickhouse/client|@sonar/scan|@sentry/node|@aws-sdk(?:/[^\"']+)?|aws-sdk|minio|mailpit-api|meilisearch|clamscan|wiremock-captain|windmill-client|nodemailer|twilio|@sendgrid|sendgrid|stripe|@temporalio/[^\"']+|@nats-io/transport-node|nats|keycloak-js|@keycloak/keycloak-admin-client|node-vault)[\"']"
)
FORBIDDEN_SDK_IMPORT_PATHS = (
    Path("packages/core/src/index.ts"),
    Path("packages/ports/src/index.ts"),
    Path("apps/api/src/runtime.ts"),
    Path("apps/api/src/server.ts"),
    Path("apps/work/src/worker.ts"),
)
PROVIDER_SAFE_METADATA_FORBIDDEN_RE = re.compile(
    r"https?://|secret://|bearer\s+|private_key|connection_string|postgres(?:ql)?://|redis://|amqp://|password|token",
    re.IGNORECASE,
)


class Findings:
    def __init__(self) -> None:
        self.items: list[dict[str, str]] = []

    def add(self, rule_id: str, subject: str, message: str = "") -> None:
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append(
            {
                "severity": severity,
                "ruleId": rule_id,
                "subject": str(subject),
                "message": message or RULES.get(rule_id, ("", ""))[1],
            }
        )

    def blocking_or_error(self) -> list[dict[str, str]]:
        return [f for f in self.items if f["severity"] in {"blocking", "error"}]


def read_json(path: Path) -> Any:
    with (ROOT / path).open(encoding="utf-8") as handle:
        return json.load(handle)


def read_text(path: Path) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def current_blob_sha(path: str | Path) -> str:
    data = (ROOT / path).read_bytes()
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def as_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]


def state_text(state: dict[str, Any], path: Path) -> str:
    override = state.get("sourceOverrides", {}).get(str(path))
    if isinstance(override, str):
        return override
    return read_text(path)


def ts_files_under(path: Path) -> list[Path]:
    root = ROOT / path
    if not root.exists():
        return []
    return [p.relative_to(ROOT) for p in sorted(root.rglob("*.ts"))]


def make_targets(makefile_text: str) -> set[str]:
    targets: set[str] = set()
    for line in makefile_text.splitlines():
        if not line or line.startswith(("\t", "#", ".")):
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+):", line)
        if match:
            targets.add(match.group(1))
    return targets


def json_pointer_parent(document: Any, pointer: str) -> tuple[Any, str]:
    if not pointer.startswith("/"):
        raise ValueError(f"JSON pointer must start with /: {pointer}")
    parts = [part.replace("~1", "/").replace("~0", "~") for part in pointer.strip("/").split("/")]
    current = document
    for part in parts[:-1]:
        if isinstance(current, list):
            current = current[int(part)]
        else:
            current = current[part]
    return current, parts[-1]


def apply_manifest_patches(manifest: Any, patches: list[dict[str, Any]]) -> Any:
    result = copy.deepcopy(manifest)
    for patch in patches:
        parent, key = json_pointer_parent(result, patch["path"])
        op = patch["op"]
        if op == "remove":
            if isinstance(parent, list):
                del parent[int(key)]
            else:
                parent.pop(key, None)
        elif op == "replace":
            if isinstance(parent, list):
                parent[int(key)] = patch["value"]
            else:
                parent[key] = patch["value"]
        else:
            raise ValueError(f"unsupported patch op: {op}")
    return result


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    defect = defect or {}
    manifest = read_json(MANIFEST_PATH)
    if defect.get("manifestPatches"):
        manifest = apply_manifest_patches(manifest, defect["manifestPatches"])
    runtime_product_readiness_map: Any = None
    if not defect.get("removeRuntimeProductReadinessMap"):
        runtime_product_readiness_map = read_json(RUNTIME_PRODUCT_READINESS_MAP_PATH)
        if defect.get("runtimeProductReadinessMapPatches"):
            runtime_product_readiness_map = apply_manifest_patches(
                runtime_product_readiness_map,
                defect["runtimeProductReadinessMapPatches"],
            )
    analytics_matrix: Any = None
    if not defect.get("removeAnalyticsEventStoreMatrix"):
        analytics_matrix = read_json(ANALYTICS_EVENT_STORE_MATRIX_PATH)
        if defect.get("analyticsEventStoreMatrixPatches"):
            analytics_matrix = apply_manifest_patches(analytics_matrix, defect["analyticsEventStoreMatrixPatches"])
    clickhouse_boundary: Any = None
    if not defect.get("removeClickhouseProofBoundary"):
        clickhouse_boundary = read_json(CLICKHOUSE_PROOF_BOUNDARY_PATH)
        if defect.get("clickhouseProofBoundaryPatches"):
            clickhouse_boundary = apply_manifest_patches(
                clickhouse_boundary,
                defect["clickhouseProofBoundaryPatches"],
            )
    redis_cache_boundary: Any = None
    if not defect.get("removeRedisCacheProofBoundary"):
        redis_cache_boundary = read_json(REDIS_CACHE_PROOF_BOUNDARY_PATH)
        if defect.get("redisCacheProofBoundaryPatches"):
            redis_cache_boundary = apply_manifest_patches(
                redis_cache_boundary,
                defect["redisCacheProofBoundaryPatches"],
            )
    cache_eventing_matrix: Any = None
    if not defect.get("removeCacheEventingMatrix"):
        cache_eventing_matrix = read_json(CACHE_EVENTING_MATRIX_PATH)
        if defect.get("cacheEventingMatrixPatches"):
            cache_eventing_matrix = apply_manifest_patches(cache_eventing_matrix, defect["cacheEventingMatrixPatches"])
    composed_search_provider_matrix: Any = None
    if not defect.get("removeComposedSearchProviderMatrix"):
        composed_search_provider_matrix = read_json(COMPOSED_SEARCH_PROVIDER_MATRIX_PATH)
        if defect.get("composedSearchProviderMatrixPatches"):
            composed_search_provider_matrix = apply_manifest_patches(
                composed_search_provider_matrix,
                defect["composedSearchProviderMatrixPatches"],
            )
    file_scanner_provider_matrix: Any = None
    if not defect.get("removeFileScannerProviderMatrix"):
        file_scanner_provider_matrix = read_json(FILE_SCANNER_PROVIDER_MATRIX_PATH)
        if defect.get("fileScannerProviderMatrixPatches"):
            file_scanner_provider_matrix = apply_manifest_patches(
                file_scanner_provider_matrix,
                defect["fileScannerProviderMatrixPatches"],
            )
    mock_provider_substrate_matrix: Any = None
    if not defect.get("removeMockProviderSubstrateMatrix"):
        mock_provider_substrate_matrix = read_json(MOCK_PROVIDER_SUBSTRATE_MATRIX_PATH)
        if defect.get("mockProviderSubstrateMatrixPatches"):
            mock_provider_substrate_matrix = apply_manifest_patches(
                mock_provider_substrate_matrix,
                defect["mockProviderSubstrateMatrixPatches"],
            )
    backup_restore_provider_matrix: Any = None
    if not defect.get("removeBackupRestoreProviderMatrix"):
        backup_restore_provider_matrix = read_json(BACKUP_RESTORE_PROVIDER_MATRIX_PATH)
        if defect.get("backupRestoreProviderMatrixPatches"):
            backup_restore_provider_matrix = apply_manifest_patches(
                backup_restore_provider_matrix,
                defect["backupRestoreProviderMatrixPatches"],
            )
    pgbackrest_proof_blocker_matrix: Any = None
    if not defect.get("removePgbackrestProofBlockerMatrix"):
        pgbackrest_proof_blocker_matrix = read_json(PGBACKREST_PROOF_BLOCKER_MATRIX_PATH)
        if defect.get("pgbackrestProofBlockerMatrixPatches"):
            pgbackrest_proof_blocker_matrix = apply_manifest_patches(
                pgbackrest_proof_blocker_matrix,
                defect["pgbackrestProofBlockerMatrixPatches"],
            )
    pgbackrest_configured_proof_boundary: Any = None
    if not defect.get("removePgbackrestConfiguredProofBoundary"):
        pgbackrest_configured_proof_boundary = read_json(PGBACKREST_CONFIGURED_PROOF_BOUNDARY_PATH)
        if defect.get("pgbackrestConfiguredProofBoundaryPatches"):
            pgbackrest_configured_proof_boundary = apply_manifest_patches(
                pgbackrest_configured_proof_boundary,
                defect["pgbackrestConfiguredProofBoundaryPatches"],
            )
    backup_restore_operational_depth: Any = None
    if not defect.get("removeBackupRestoreOperationalDepth"):
        backup_restore_operational_depth = read_json(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH)
        if defect.get("backupRestoreOperationalDepthPatches"):
            backup_restore_operational_depth = apply_manifest_patches(
                backup_restore_operational_depth,
                defect["backupRestoreOperationalDepthPatches"],
            )
    backup_restore_execution_proof: Any = None
    if not defect.get("removeBackupRestoreExecutionProof"):
        backup_restore_execution_proof = read_json(BACKUP_RESTORE_EXECUTION_PROOF_PATH)
        if defect.get("backupRestoreExecutionProofPatches"):
            backup_restore_execution_proof = apply_manifest_patches(
                backup_restore_execution_proof,
                defect["backupRestoreExecutionProofPatches"],
            )
    operator_workflow_provider_matrix: Any = None
    if not defect.get("removeOperatorWorkflowProviderMatrix"):
        operator_workflow_provider_matrix = read_json(OPERATOR_WORKFLOW_PROVIDER_MATRIX_PATH)
        if defect.get("operatorWorkflowProviderMatrixPatches"):
            operator_workflow_provider_matrix = apply_manifest_patches(
                operator_workflow_provider_matrix,
                defect["operatorWorkflowProviderMatrixPatches"],
            )
    windmill_proof_blocker_matrix: Any = None
    if not defect.get("removeWindmillProofBlockerMatrix"):
        windmill_proof_blocker_matrix = read_json(WINDMILL_PROOF_BLOCKER_MATRIX_PATH)
        if defect.get("windmillProofBlockerMatrixPatches"):
            windmill_proof_blocker_matrix = apply_manifest_patches(
                windmill_proof_blocker_matrix,
                defect["windmillProofBlockerMatrixPatches"],
            )
    windmill_configured_proof_boundary: Any = None
    if not defect.get("removeWindmillConfiguredProofBoundary"):
        windmill_configured_proof_boundary = read_json(WINDMILL_CONFIGURED_PROOF_BOUNDARY_PATH)
        if defect.get("windmillConfiguredProofBoundaryPatches"):
            windmill_configured_proof_boundary = apply_manifest_patches(
                windmill_configured_proof_boundary,
                defect["windmillConfiguredProofBoundaryPatches"],
            )
    package = read_json(PACKAGE_PATH)
    service_catalogue = read_json(Path(SERVICE_CATALOGUE_PATH))
    if defect.get("serviceCataloguePatches"):
        service_catalogue = apply_manifest_patches(service_catalogue, defect["serviceCataloguePatches"])
    for script_name in defect.get("removePackageScripts", []):
        package.get("scripts", {}).pop(script_name, None)
    for dep_name in defect.get("removePackageDependencies", []):
        package.get("dependencies", {}).pop(dep_name, None)
    for patch in defect.get("packageDependencyPatches", []):
        package.setdefault(patch.get("section", "dependencies"), {})[patch["name"]] = patch["value"]
    makefile = read_text(MAKEFILE_PATH)
    for target in defect.get("removeMakeTargets", []):
        makefile = re.sub(rf"^{re.escape(target)}:\n(?:\t.*\n)*", "", makefile, flags=re.MULTILINE)
    proof_source = read_text(PROOF_SOURCE_PATH)
    for replacement in defect.get("proofSourceReplacements", []):
        proof_source = proof_source.replace(replacement["old"], replacement["new"])
    source_overrides: dict[str, str] = {}
    for replacement in defect.get("sourceReplacements", []):
        source_overrides[replacement["path"]] = read_text(Path(replacement["path"])).replace(
            replacement["old"], replacement["new"]
        )
    return {
        "manifest": manifest,
        "runtimeProductReadinessMap": runtime_product_readiness_map,
        "schema": read_json(SCHEMA_PATH),
        "analyticsEventStoreMatrix": analytics_matrix,
        "clickhouseProofBoundary": clickhouse_boundary,
        "redisCacheProofBoundary": redis_cache_boundary,
        "cacheEventingMatrix": cache_eventing_matrix,
        "composedSearchProviderMatrix": composed_search_provider_matrix,
        "fileScannerProviderMatrix": file_scanner_provider_matrix,
        "mockProviderSubstrateMatrix": mock_provider_substrate_matrix,
        "backupRestoreProviderMatrix": backup_restore_provider_matrix,
        "pgbackrestProofBlockerMatrix": pgbackrest_proof_blocker_matrix,
        "pgbackrestConfiguredProofBoundary": pgbackrest_configured_proof_boundary,
        "backupRestoreOperationalDepth": backup_restore_operational_depth,
        "backupRestoreExecutionProof": backup_restore_execution_proof,
        "operatorWorkflowProviderMatrix": operator_workflow_provider_matrix,
        "windmillProofBlockerMatrix": windmill_proof_blocker_matrix,
        "windmillConfiguredProofBoundary": windmill_configured_proof_boundary,
        "serviceCatalogue": service_catalogue,
        "package": package,
        "makefile": makefile,
        "proofSource": proof_source,
        "sourceOverrides": source_overrides,
    }


def mode_records(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    for record in manifest.get("runtimeModes", []):
        if isinstance(record, dict) and isinstance(record.get("mode"), str):
            records[record["mode"]] = record
    return records


def check_manifest(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    schema = state["schema"]
    if Draft202012Validator is None:
        F.add(
            "USF-RUNTIME-001",
            "tools/validate-spec/requirements.txt",
            "jsonschema dependency unavailable; runtime schema validation cannot run",
        )
    else:
        errors = list(Draft202012Validator(schema).iter_errors(manifest))
        for err in errors:
            loc = "/".join(str(p) for p in err.path)
            F.add("USF-RUNTIME-001", f"{MANIFEST_PATH}:{loc}" if loc else str(MANIFEST_PATH), err.message[:160])
    if not isinstance(manifest, dict):
        F.add("USF-RUNTIME-001", str(MANIFEST_PATH), "manifest is not an object")
        return
    modes = mode_records(manifest)
    missing = sorted(REQUIRED_MODES - set(modes))
    if missing:
        F.add("USF-RUNTIME-002", str(MANIFEST_PATH), f"missing runtime modes: {', '.join(missing)}")
    if len(modes) != len(manifest.get("runtimeModes", [])):
        F.add("USF-RUNTIME-002", str(MANIFEST_PATH), "runtime mode ids must be unique")


def check_compose_mode(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    modes = mode_records(manifest)
    compose = modes.get("dev-compose-backed")
    if not compose:
        return
    boundary = compose.get("composeBoundary") if isinstance(compose, dict) else None
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-003", "dev-compose-backed", "compose boundary is missing")
        return
    if (
        boundary.get("required") is not True
        or boundary.get("target") != COMPOSE_TARGET
        or boundary.get("providerBinding")
        != "all-required-compose-provider-bindings-resolved"
    ):
        F.add("USF-RUNTIME-003", "dev-compose-backed", "compose-backed mode lacks resolved provider binding boundary")
    if compose.get("providerMode") == "dev in-memory":
        F.add("USF-RUNTIME-003", "dev-compose-backed", "compose-backed mode must not report dev in-memory provider mode")
    if compose.get("providerClass") == "hermetic-mock":
        F.add("USF-RUNTIME-003", "dev-compose-backed", "compose-backed mode must not report hermetic provider class")


def check_proof_surfaces(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    for mode, record in mode_records(manifest).items():
        for surface_name in ("apiProof", "workerProof"):
            surface = record.get(surface_name)
            if not isinstance(surface, dict):
                F.add("USF-RUNTIME-004", f"{mode}:{surface_name}", "proof surface is missing")
                continue
            if not surface.get("packageScript") or not surface.get("makeTarget"):
                F.add("USF-RUNTIME-004", f"{mode}:{surface_name}", "proof surface lacks command references")
            assertions = surface.get("assertions")
            if not isinstance(assertions, list) or not assertions:
                F.add("USF-RUNTIME-004", f"{mode}:{surface_name}", "proof surface lacks assertions")


def check_command_wiring(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    scripts = set((state["package"].get("scripts") or {}).keys())
    targets = make_targets(state["makefile"])
    required_pairs: set[tuple[str, str]] = set()
    for command in manifest.get("proofCommands", []):
        if isinstance(command, dict):
            required_pairs.add((str(command.get("packageScript")), str(command.get("makeTarget"))))
    for record in mode_records(manifest).values():
        for surface_name in ("apiProof", "workerProof"):
            surface = record.get(surface_name)
            if isinstance(surface, dict):
                required_pairs.add((str(surface.get("packageScript")), str(surface.get("makeTarget"))))
    for package_script, make_target in sorted(required_pairs):
        if package_script not in scripts:
            F.add("USF-RUNTIME-005", package_script, "package script is not defined")
        if make_target not in targets:
            F.add("USF-RUNTIME-005", make_target, "Make target is not defined")


def check_claims(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    top_prohibited = set(manifest.get("prohibitedClaims", []))
    non_claims = set(manifest.get("nonClaims", []))
    if REQUIRED_PROHIBITED_CLAIMS - top_prohibited:
        F.add("USF-RUNTIME-006", str(MANIFEST_PATH), "top-level prohibited claims set is incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - non_claims:
        F.add("USF-RUNTIME-006", str(MANIFEST_PATH), "non-claims set is incomplete")
    for subject, allowed in [("top-level", manifest.get("allowedClaims", []))]:
        for claim in allowed:
            if any(marker in claim for marker in PROHIBITED_ALLOWED_MARKERS):
                F.add("USF-RUNTIME-006", subject, f"allowed claim is prohibited: {claim}")
    for mode, record in mode_records(manifest).items():
        prohibited = set(record.get("prohibitedClaims", []))
        if REQUIRED_PROHIBITED_CLAIMS - prohibited:
            F.add("USF-RUNTIME-006", mode, "mode prohibited claims set is incomplete")
        for claim in record.get("allowedClaims", []):
            if any(marker in claim for marker in PROHIBITED_ALLOWED_MARKERS):
                F.add("USF-RUNTIME-006", mode, f"allowed claim is prohibited: {claim}")


def check_service_catalogue_linkage(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    top = manifest.get("serviceCatalogueDependency")
    if not isinstance(top, dict) or top.get("path") != SERVICE_CATALOGUE_PATH:
        F.add("USF-RUNTIME-007", str(MANIFEST_PATH), "top-level service catalogue dependency is missing")
    if not (ROOT / SERVICE_CATALOGUE_PATH).exists():
        F.add("USF-RUNTIME-007", SERVICE_CATALOGUE_PATH, "service catalogue path does not exist")
    if not (ROOT / COMPOSE_TARGET).exists():
        F.add("USF-RUNTIME-007", COMPOSE_TARGET, "compose target path does not exist")
    compose = mode_records(manifest).get("dev-compose-backed")
    if not compose:
        return
    boundary = compose.get("composeBoundary") if isinstance(compose, dict) else None
    if (
        compose.get("serviceCatalogueDependency") != SERVICE_CATALOGUE_PATH
        or not isinstance(boundary, dict)
        or boundary.get("serviceCataloguePath") != SERVICE_CATALOGUE_PATH
    ):
        F.add("USF-RUNTIME-007", "dev-compose-backed", "compose-backed mode lacks service catalogue linkage")


def check_teardown(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    proof_source = state["proofSource"]
    for marker in SOURCE_TEARDOWN_MARKERS:
        if marker not in proof_source:
            F.add("USF-RUNTIME-008", str(PROOF_SOURCE_PATH), f"proof source missing teardown marker: {marker}")
    for mode, record in mode_records(manifest).items():
        teardown = record.get("teardown")
        if not isinstance(teardown, dict):
            F.add("USF-RUNTIME-008", mode, "mode teardown metadata is missing")
            continue
        if not teardown.get("childProcesses"):
            F.add("USF-RUNTIME-008", mode, "child process teardown metadata is missing")
        if not teardown.get("composeResources"):
            F.add("USF-RUNTIME-008", mode, "Compose teardown metadata is missing")


def check_boundaries(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    for field in REQUIRED_BOUNDARY_FIELDS:
        if not manifest.get(field):
            F.add("USF-RUNTIME-009", str(MANIFEST_PATH), f"missing top-level boundary: {field}")
    enterprise = manifest.get("enterpriseEvidenceSupport")
    if not isinstance(enterprise, dict):
        F.add("USF-RUNTIME-009", str(MANIFEST_PATH), "enterprise evidence support is missing")
    for mode, record in mode_records(manifest).items():
        for surface_name in ("apiProof", "workerProof"):
            surface = record.get(surface_name)
            if not isinstance(surface, dict):
                continue
            for field in (
                "auditEvidence",
                "tenantBoundary",
                "accessBoundary",
                "secretBoundary",
                "syntheticDataBoundary",
                "providerBindingEvidence",
            ):
                if not surface.get(field):
                    F.add("USF-RUNTIME-009", f"{mode}:{surface_name}", f"missing proof boundary: {field}")


def check_deferred_boundaries(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    deferred = manifest.get("deferredBoundaries")
    if not isinstance(deferred, list):
        F.add("USF-RUNTIME-010", str(MANIFEST_PATH), "deferred boundaries must be an array")
        return
    deferred_ids = {item.get("id") for item in deferred if isinstance(item, dict)}
    compose = mode_records(manifest).get("dev-compose-backed")
    if not compose:
        return
    refs = set(compose.get("deferredBoundaryRefs", []))
    if not refs and not deferred:
        return
    if not refs:
        F.add("USF-RUNTIME-010", "dev-compose-backed", "compose-backed mode lacks deferred boundary refs")
    missing = sorted(refs - deferred_ids)
    if missing:
        F.add("USF-RUNTIME-010", "dev-compose-backed", f"unresolved deferred boundary refs: {', '.join(missing)}")
    for item in deferred:
        if not isinstance(item, dict):
            continue
        if item.get("mode") == "dev-compose-backed" and not item.get("claimsProhibitedUntilResolved"):
            F.add("USF-RUNTIME-010", item.get("id", "deferred-boundary"), "deferred boundary lacks prohibited claims")


def binding_records(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    for record in manifest.get("providerBindingMatrix", []):
        if isinstance(record, dict) and isinstance(record.get("bindingId"), str):
            records[record["bindingId"]] = record
    return records


def expected_service_ids(metadata: dict[str, Any]) -> list[str]:
    if "serviceIds" in metadata:
        return list(metadata["serviceIds"])
    return [str(metadata["serviceId"])]


def check_provider_bindings(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    bindings = binding_records(manifest)
    compose = mode_records(manifest).get("dev-compose-backed")
    for binding_id, metadata in REQUIRED_PROVIDER_BINDINGS.items():
        active = bindings.get(binding_id)
        if not active:
            F.add("USF-RUNTIME-011", "providerBindingMatrix", f"required active binding is missing: {binding_id}")
            continue
        expected = {
            "bindingStatus": "active",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "adapterName": metadata["adapterName"],
            "portName": metadata["portName"],
            "sdkPackage": metadata["sdkPackage"],
            "sdkVersion": metadata["sdkVersion"],
            "sdkBoundary": "adapter-package-only",
        }
        for field, value in expected.items():
            if active.get(field) != value:
                F.add("USF-RUNTIME-011", binding_id, f"{field} must be {value}")
        for service_id in expected_service_ids(metadata):
            if service_id not in active.get("serviceCatalogueServiceIds", []):
                F.add("USF-RUNTIME-011", binding_id, f"service catalogue id missing: {service_id}")
        if metadata["providerId"] not in active.get("providerRegistryIds", []):
            F.add("USF-RUNTIME-011", binding_id, "provider registry id missing")
        if not active.get("apiProofEvidence") or not active.get("workerProofEvidence"):
            F.add("USF-RUNTIME-012", binding_id, "active binding lacks API or worker proof evidence text")
        if active.get("deferredReason") is not None or active.get("followUpIssueRefs"):
            F.add("USF-RUNTIME-012", binding_id, "active binding must not carry hidden deferred work")
    if compose:
        refs = set(compose.get("providerBindingRefs", []))
        missing_refs = sorted(set(REQUIRED_PROVIDER_BINDINGS) - refs)
        if missing_refs:
            F.add("USF-RUNTIME-012", "dev-compose-backed", f"compose mode missing active binding refs: {', '.join(missing_refs)}")
        if compose.get("deferredProviderBindingRefs"):
            F.add("USF-RUNTIME-012", "dev-compose-backed", "compose mode still has deferred provider binding refs")
    proof_source = state["proofSource"]
    required_markers = [
        "composedProviderEvidence",
        "databaseProviderEvidence",
        "preparePostgresRuntimeProofDatabase",
        "assertProviderEvidenceBase",
        "readinessRetryPolicy",
        "metricEvidenceCaptured",
        "traceEvidenceCaptured",
        "auditEvidenceCaptured",
        "redactionChecked",
    ]
    required_markers.extend(str(metadata["workerMarker"]) for metadata in REQUIRED_PROVIDER_BINDINGS.values())
    for marker in required_markers:
        if marker not in proof_source:
            F.add("USF-RUNTIME-012", str(PROOF_SOURCE_PATH), f"proof source missing provider evidence marker: {marker}")


def lane5_binding_payload(binding: dict[str, Any]) -> str:
    return json.dumps(
        {
            "providerRegistryEvidence": binding.get("providerRegistryEvidence"),
            "apiProofEvidence": binding.get("apiProofEvidence"),
            "workerProofEvidence": binding.get("workerProofEvidence"),
            "deferredReason": binding.get("deferredReason"),
            "claimBoundary": binding.get("claimBoundary"),
        },
        sort_keys=True,
    )


def check_lane5_provider_dispositions(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    bindings = binding_records(manifest)
    registry_source = state_text(state, PROVIDER_REGISTRY_SOURCE_PATH)
    for binding_id, metadata in LANE5_PROVIDER_DISPOSITIONS.items():
        binding = bindings.get(binding_id)
        if not binding:
            F.add("USF-RUNTIME-018", "providerBindingMatrix", f"Lane 5 provider disposition missing: {binding_id}")
            continue
        if binding.get("bindingStatus") not in metadata["allowedStatuses"]:
            F.add("USF-RUNTIME-018", binding_id, "Lane 5 provider disposition has unexpected status")
        for service_id in metadata["serviceIds"]:
            if service_id not in binding.get("serviceCatalogueServiceIds", []):
                F.add("USF-RUNTIME-018", binding_id, f"service catalogue id missing: {service_id}")
        for provider_id in metadata["providerIds"]:
            if provider_id not in binding.get("providerRegistryIds", []):
                F.add("USF-RUNTIME-018", binding_id, f"provider registry id missing: {provider_id}")
            if provider_id not in registry_source:
                F.add("USF-RUNTIME-018", str(PROVIDER_REGISTRY_SOURCE_PATH), f"registry source missing {provider_id}")
        follow_up = metadata["followUpIssue"]
        if follow_up not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-018", binding_id, f"follow-up issue missing: {follow_up}")
        for field in (
            "providerRegistryEvidence",
            "apiProofEvidence",
            "workerProofEvidence",
            "deferredReason",
            "claimBoundary",
        ):
            if not binding.get(field):
                F.add("USF-RUNTIME-018", binding_id, f"Lane 5 disposition lacks {field}")
        deferred_reason = str(binding.get("deferredReason") or "")
        for token in LANE5_RISK_TOKENS:
            if token == "effectivenessState=deferred-with-owner":
                accepted_states = (
                    "effectivenessState=deferred-with-owner",
                    "effectivenessState=blocked-with-owner-and-follow-up",
                    "effectivenessState=proven-local",
                )
                if any(state_marker in deferred_reason for state_marker in accepted_states):
                    continue
            if token not in deferred_reason:
                F.add("USF-RUNTIME-018", binding_id, f"deferred risk metadata missing {token}")


def check_lane5_hidden_in_memory_fallback(F: Findings, state: dict[str, Any]) -> None:
    bindings = binding_records(state["manifest"])
    for binding_id in LANE5_PROVIDER_DISPOSITIONS:
        binding = bindings.get(binding_id)
        if not binding:
            continue
        if binding.get("providerMode") == "in-memory" or binding.get("providerClass") == "hermetic-mock":
            F.add("USF-RUNTIME-019", binding_id, "Lane 5 deferred provider cannot be represented as in-memory or hermetic")
        text = lane5_binding_payload(binding)
        if LANE5_HIDDEN_FALLBACK_RE.search(text):
            F.add("USF-RUNTIME-019", binding_id, "Lane 5 disposition treats a substitute as provider proof")


def check_lane5_sdk_boundary(F: Findings, state: dict[str, Any]) -> None:
    bindings = binding_records(state["manifest"])
    for binding_id in LANE5_PROVIDER_DISPOSITIONS:
        binding = bindings.get(binding_id)
        if not binding:
            continue
        implemented = binding.get("bindingStatus") == "active" or binding.get("providerMode") == "composed-test"
        if implemented:
            for field in ("adapterName", "portName", "endpointRef"):
                if not binding.get(field):
                    F.add("USF-RUNTIME-020", binding_id, f"implemented provider lacks {field}")
            protocol_exception = "protocol-exception" in lane5_binding_payload(binding) or binding.get("sdkBoundary") in {
                "official-cli-proof-boundary",
                "protocol-exception-official-cli",
            }
            allowed_sdk_boundaries = {"adapter-package-only"}
            if binding_id == "usf-189-windmill-automation-provider":
                allowed_sdk_boundaries.add("proof-provider-integration-boundary")
            if not protocol_exception and binding.get("sdkBoundary") not in allowed_sdk_boundaries:
                F.add("USF-RUNTIME-020", binding_id, "implemented provider lacks adapter-package-only SDK boundary")
            if protocol_exception and binding.get("sdkBoundary") not in {
                "adapter-package-only",
                "official-cli-proof-boundary",
                "protocol-exception-official-cli",
            }:
                F.add("USF-RUNTIME-020", binding_id, "protocol-exception provider lacks explicit CLI/protocol boundary")
            if not protocol_exception:
                for field in ("sdkPackage", "sdkVersion"):
                    if not binding.get(field):
                        F.add("USF-RUNTIME-020", binding_id, f"implemented provider lacks {field}")
            elif binding.get("sdkPackage") is not None or binding.get("sdkVersion") is not None:
                F.add("USF-RUNTIME-020", binding_id, "protocol-exception provider must not invent SDK package metadata")
        else:
            if binding.get("sdkPackage") is not None or binding.get("sdkVersion") is not None:
                F.add("USF-RUNTIME-020", binding_id, "deferred provider must not name an SDK/client package")
            if binding.get("sdkBoundary") != "not-applicable":
                F.add("USF-RUNTIME-020", binding_id, "deferred provider SDK boundary must be not-applicable")
            if binding.get("endpointRef") is not None:
                F.add("USF-RUNTIME-020", binding_id, "deferred provider must not expose an endpoint reference")


def check_lane5_readiness_posture(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    bindings = binding_records(manifest)
    compose = mode_records(manifest).get("dev-compose-backed", {})
    active_refs = set(compose.get("providerBindingRefs", []))
    deferred_provider_refs = set(compose.get("deferredProviderBindingRefs", []))
    boundary_refs = set(compose.get("deferredBoundaryRefs", []))
    expected_boundaries = {metadata["boundaryRef"] for metadata in LANE5_PROVIDER_DISPOSITIONS.values()}
    missing_boundaries = sorted(expected_boundaries - boundary_refs)
    if missing_boundaries:
        F.add("USF-RUNTIME-021", "dev-compose-backed", f"Lane 5 deferred boundary refs missing: {', '.join(missing_boundaries)}")
    deferred_boundaries = {
        item.get("id"): item
        for item in manifest.get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    for boundary_id in sorted(expected_boundaries):
        boundary = deferred_boundaries.get(boundary_id)
        if not boundary:
            F.add("USF-RUNTIME-021", boundary_id, "Lane 5 deferred boundary record missing")
            continue
        missing_claims = REQUIRED_PROHIBITED_CLAIMS - set(boundary.get("claimsProhibitedUntilResolved", []))
        if missing_claims:
            F.add("USF-RUNTIME-021", boundary_id, f"deferred boundary missing prohibited claims: {sorted(missing_claims)}")
        follow_ups = set(boundary.get("followUpIssueRefs", []))
        if "USF-189" not in follow_ups and "USF-189" not in str(boundary.get("boundary", "")):
            F.add("USF-RUNTIME-021", boundary_id, "deferred boundary lacks USF-189 traceability")
    for binding_id, metadata in LANE5_PROVIDER_DISPOSITIONS.items():
        binding = bindings.get(binding_id)
        if not binding:
            continue
        if binding_id in active_refs or binding_id in deferred_provider_refs:
            F.add("USF-RUNTIME-021", binding_id, "Lane 5 deferred provider must not be wired as a compose runtime provider binding ref")
        if binding.get("bindingStatus") == "active":
            F.add("USF-RUNTIME-021", binding_id, "Lane 5 deferred provider cannot be marked active")
        if not binding.get("deferredReason") or metadata["followUpIssue"] not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-021", binding_id, "Lane 5 deferred provider lacks follow-up risk posture")
        claim_boundary = str(binding.get("claimBoundary") or "")
        missing_claims = REQUIRED_PROHIBITED_CLAIMS - {claim for claim in REQUIRED_PROHIBITED_CLAIMS if claim in claim_boundary}
        if missing_claims:
            F.add("USF-RUNTIME-021", binding_id, f"claim boundary missing non-claims: {sorted(missing_claims)}")


def check_lane5_provider_overclaim(F: Findings, state: dict[str, Any]) -> None:
    bindings = binding_records(state["manifest"])
    for binding_id in LANE5_PROVIDER_DISPOSITIONS:
        binding = bindings.get(binding_id)
        if not binding:
            continue
        text = lane5_binding_payload(binding)
        if LANE5_OVERCLAIM_RE.search(text):
            F.add("USF-RUNTIME-022", binding_id, "Lane 5 provider disposition contains readiness overclaim language")


def check_analytics_event_store_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("analyticsEventStoreMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-RUNTIME-023", str(ANALYTICS_EVENT_STORE_MATRIX_PATH), "analytics event-store disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-172",
        "proofBoundaryIssue": "USF-197",
        "composedProofIssue": "USF-206",
        "followUpIssue": None,
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "serviceId": "clickhouse",
        "providerRegistryId": "analytics-store-clickhouse-composed-test",
        "deferredProviderRegistryId": "analytics-store-clickhouse-deferred",
        "remainingProofIssue": None,
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-RUNTIME-023", key, f"expected {expected!r}")

    if ANALYTICS_EVENT_STORE_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-023", "issueLinks", "analytics event-store issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-023", "nonClaims", "analytics event-store non-claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-023", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if ANALYTICS_EVENT_STORE_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-023", "readinessClaimsProhibited", "analytics event-store prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-RUNTIME-023", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-RUNTIME-023", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("analyticsEventStoreDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-RUNTIME-023", "analyticsEventStoreDisposition", "analytics event-store disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "profile-gated-bounded-local-compose-proof",
            "clickhouseServiceSemanticProofPresent": True,
            "analyticsReadinessClaim": False,
            "eventStoreReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "serviceCatalogueServiceId": "clickhouse",
            "providerRegistryId": "analytics-store-clickhouse-composed-test",
            "deferredProviderRegistryId": "analytics-store-clickhouse-deferred",
            "proofCommand": "corepack pnpm proof:analytics:clickhouse",
            "followUpIssue": None,
            "owner": "platform-data-foundation",
            "riskOwner": "platform-data-risk-owner",
            "controlOwner": "platform-data-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-023", f"analyticsEventStoreDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "provenEvidence", "remainingBoundaries"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-023", f"analyticsEventStoreDisposition.{field}", "proof disposition field is required")

    substitute = matrix.get("inMemorySubstituteBoundary", {})
    if not isinstance(substitute, dict):
        F.add("USF-RUNTIME-023", "inMemorySubstituteBoundary", "substitute boundary must be an object")
    else:
        if substitute.get("usedWhereSemanticallyPermitted") is not True:
            F.add("USF-RUNTIME-023", "inMemorySubstituteBoundary.usedWhereSemanticallyPermitted", "permitted in-memory use must be explicit")
        if substitute.get("clickhouseServiceEquivalent") is not False:
            F.add("USF-RUNTIME-023", "inMemorySubstituteBoundary.clickhouseServiceEquivalent", "in-memory evidence must not be ClickHouse equivalent")
        if not substitute.get("substitutionNonEquivalenceBoundary"):
            F.add("USF-RUNTIME-023", "inMemorySubstituteBoundary.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        commands = set(substitute.get("commands", []))
        for command in (
            "corepack pnpm proof:analytics:clickhouse",
            "corepack pnpm runtime:proof",
            "corepack pnpm providers-proof",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-023", "inMemorySubstituteBoundary.commands", f"missing {command}")
        if len(substitute.get("scopeCovered", [])) < 4 or len(substitute.get("limits", [])) < 6:
            F.add("USF-RUNTIME-023", "inMemorySubstituteBoundary", "substitute scope and limits are incomplete")

    provider_boundary = matrix.get("providerBoundary", {})
    if not isinstance(provider_boundary, dict):
        F.add("USF-RUNTIME-023", "providerBoundary", "provider boundary must be an object")
    else:
        expected_provider = {
            "providerBindingId": "usf-189-clickhouse-analytics-provider",
            "providerRegistryId": "analytics-store-clickhouse-composed-test",
            "deferredProviderRegistryId": "analytics-store-clickhouse-deferred",
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "runtimeProviderBindingActive": True,
            "sdkPackage": "@clickhouse/client",
            "sdkVersion": "1.23.0",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/clickhouse",
            "proofCommand": "corepack pnpm proof:analytics:clickhouse",
        }
        for key, expected in expected_provider.items():
            observed = provider_boundary.get(key)
            if observed is not expected if isinstance(expected, bool) or expected is None else observed != expected:
                F.add("USF-RUNTIME-023", f"providerBoundary.{key}", f"expected {expected!r}")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if not ANALYTICS_EVENT_STORE_REQUIRED_EVIDENCE_REFS.issubset(declared_evidence):
        F.add("USF-RUNTIME-023", "enterpriseEvidenceRefs", "analytics event-store enterprise evidence refs are incomplete")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-clickhouse-analytics-provider")
    if not binding:
        F.add("USF-RUNTIME-023", "providerBindingMatrix", "ClickHouse provider disposition is missing from runtime manifest")
    else:
        if "USF-206" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "runtime manifest must link USF-206")
        if binding.get("bindingStatus") != "profile-gated-proven" or binding.get("endpointRef") != "endpoint://compose/clickhouse":
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "ClickHouse must be profile-gated proven with redacted endpoint ref")
        if binding.get("sdkPackage") != "@clickhouse/client" or binding.get("sdkVersion") != "1.23.0":
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "ClickHouse must name exact pinned SDK/client package")
        if binding.get("proofCommand") != "corepack pnpm proof:analytics:clickhouse":
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "ClickHouse must reference proof:analytics:clickhouse")
        if "USF-206 proof:analytics:clickhouse" not in str(binding.get("proofEvidence", "")):
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider.proofEvidence", "runtime manifest must record ClickHouse proof evidence")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-analytics-provider-deferred")
    if not deferred or "USF-206" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-023", "deferredBoundaries.usf-189-analytics-provider-deferred", "runtime deferred boundary must link USF-206 lineage")
    if deferred and "USF-206 resolves bounded local Compose ClickHouse" not in str(deferred.get("boundary", "")):
        F.add("USF-RUNTIME-023", "deferredBoundaries.usf-189-analytics-provider-deferred", "runtime deferred boundary must distinguish resolved local proof from remaining readiness boundaries")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in (
        "until USF-172 closes",
        "followUpIssue=USF-172",
        "\"followUpIssue\": \"USF-172\"",
        "actual ClickHouse adapter proof remains",
        "ClickHouse SDK/client selection and adapter boundary evidence",
    ):
        if stale in matrix_text:
            F.add("USF-RUNTIME-023", "analytics-event-store-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_clickhouse_service_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("clickhouseProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-030", str(CLICKHOUSE_PROOF_BOUNDARY_PATH), "ClickHouse proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-206",
        "followUpIssue": None,
        "sourceDispositionIssue": "USF-172",
        "predecessorIssue": "USF-197",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "status": "profile-gated-bounded-proof-present",
        "serviceCatalogueAuthority": SERVICE_CATALOGUE_PATH,
        "runtimeManifest": str(MANIFEST_PATH),
        "closureMatrix": "docs/architecture/compose-service-disposition-closure-matrix.json",
        "analyticsEventStoreDispositionMatrix": str(ANALYTICS_EVENT_STORE_MATRIX_PATH),
        "enterpriseEvidenceModel": "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if boundary.get(key) != expected:
            F.add("USF-RUNTIME-030", key, f"expected {expected!r}")

    if set(boundary.get("serviceIds", [])) != {"clickhouse"}:
        F.add("USF-RUNTIME-030", "serviceIds", "ClickHouse boundary service ids are incomplete")
    if set(boundary.get("providerBindingIds", [])) != {"usf-189-clickhouse-analytics-provider"}:
        F.add("USF-RUNTIME-030", "providerBindingIds", "ClickHouse boundary provider binding ids are incomplete")
    if set(boundary.get("providerRegistryIds", [])) != {"analytics-store-clickhouse-composed-test", "analytics-store-clickhouse-deferred"}:
        F.add("USF-RUNTIME-030", "providerRegistryIds", "ClickHouse boundary provider registry ids are incomplete")
    if CLICKHOUSE_BOUNDARY_REQUIRED_ISSUES - set(boundary.get("issueLinks", [])):
        F.add("USF-RUNTIME-030", "issueLinks", "ClickHouse boundary issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(boundary.get("nonClaims", [])):
        F.add("USF-RUNTIME-030", "nonClaims", "ClickHouse boundary non-claims are incomplete")
    if CLICKHOUSE_BOUNDARY_PROHIBITED_CLAIMS - set(boundary.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-030", "readinessClaimsProhibited", "ClickHouse boundary prohibited claims are incomplete")
    if CLICKHOUSE_BOUNDARY_PROHIBITED_CLAIMS & set(boundary.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-030", "readinessClaimsAllowed", "ClickHouse boundary allows a prohibited readiness claim")

    reclassification = boundary.get("reclassification", {})
    if not isinstance(reclassification, dict):
        F.add("USF-RUNTIME-030", "reclassification", "ClickHouse reclassification must be an object")
    else:
        expected_reclassification = {
            "from": "explicit-deferred-service-proof",
            "to": "profile-gated-bounded-local-compose-proof",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": True,
            "clickhouseServiceReadinessClaim": False,
            "analyticsReadinessClaim": False,
            "eventStoreReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "inMemoryAnalyticsEquivalentToClickHouseService": False,
        }
        for key, expected in expected_reclassification.items():
            observed = reclassification.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-030", f"reclassification.{key}", f"expected {expected!r}")
        required_refs = {
            "adapters/bus/src/index.ts#ClickHouseComposedAnalyticsEventStoreAdapter",
            "packages/proof/src/clickhouse-composed-proof.ts",
            "package.json#proof:analytics:clickhouse",
            "Makefile#clickhouse-analytics-proof",
            "tools/validate-runtime/validate-runtime.py",
        }
        if required_refs - set(reclassification.get("repositoryEvidence", [])):
            F.add("USF-RUNTIME-030", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-RUNTIME-030", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "none-for-USF-206-bounded-proof",
            "owner": "platform-data-foundation",
            "riskOwner": "platform-data-risk-owner",
            "controlOwner": "platform-data-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_remaining.items():
            if remaining.get(key) != expected:
                F.add("USF-RUNTIME-030", f"remainingProofBoundary.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "requiredEvidence"):
            if remaining.get(field) in (None, "", []):
                F.add("USF-RUNTIME-030", f"remainingProofBoundary.{field}", "remaining proof field is required")
        required_remaining = {
            "environment-specific ClickHouse readiness and promotion gates before any dev/test/staging/production readiness claim",
            "live/provider-managed ClickHouse supplier and credential evidence before any live-provider claim",
            "API runtime analytics-port integration proof before any API ClickHouse runtime-use claim",
            "worker runtime analytics-port integration proof before any worker ClickHouse runtime-use claim",
        }
        if required_remaining - set(remaining.get("requiredEvidence", [])):
            F.add("USF-RUNTIME-030", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    analytics = boundary.get("analyticsEventStoreBoundary", {})
    expected_analytics = {
        "eventIngestionStatus": "proven-by-USF-206-profile-gated-local-compose",
        "tenantSafeQueryStatus": "proven-by-USF-206-profile-gated-local-compose",
        "aggregationStatus": "proven-by-USF-206-profile-gated-local-compose",
        "retentionDeletionStatus": "clickhouse-truncate-drop-and-compose-down-proven-by-USF-206",
        "auditEvidenceStatus": "value-free-audit-shaped-evidence-proven-by-USF-206",
        "readinessRetryStatus": "bounded-exponential-backoff-90s-proven-by-USF-206",
        "teardownCleanupStatus": "clickhouse-truncate-drop-and-compose-down-proven-by-USF-206",
        "providerFailureHandlingStatus": "unavailable-provider-fail-closed-proven-by-USF-206",
    }
    for field, expected in expected_analytics.items():
        if analytics.get(field) != expected:
            F.add("USF-RUNTIME-030", f"analyticsEventStoreBoundary.{field}", f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not analytics.get(field):
            F.add("USF-RUNTIME-030", f"analyticsEventStoreBoundary.{field}", "analytics boundary owner metadata is required")

    sdk = boundary.get("sdkProviderBoundary", {})
    expected_sdk = {
        "sdkSelectionStatus": "official-sdk-selected-and-pinned",
        "sdkPackage": "@clickhouse/client",
        "sdkVersion": "1.23.0",
        "sdkBoundary": "adapter-package-only",
    }
    for field, expected in expected_sdk.items():
        if sdk.get(field) != expected:
            F.add("USF-RUNTIME-030", f"sdkProviderBoundary.{field}", f"expected {expected!r}")
    if "official ClickHouse JS client" not in str(sdk.get("sdkSelectionRationale", "")):
        F.add("USF-RUNTIME-030", "sdkProviderBoundary.sdkSelectionRationale", "ClickHouse SDK rationale must name official ClickHouse JS client")
    for field in ("secretBoundary", "supplierBoundary"):
        if not sdk.get(field):
            F.add("USF-RUNTIME-030", f"sdkProviderBoundary.{field}", "SDK/provider boundary field is required")

    in_memory_gate = boundary.get("inMemoryAnalyticsGate", {})
    if in_memory_gate.get("repositoryValidationRequired") is not True:
        F.add("USF-RUNTIME-030", "inMemoryAnalyticsGate.repositoryValidationRequired", "repository validation must remain required")
    if in_memory_gate.get("clickhouseServiceEquivalent") is not False:
        F.add("USF-RUNTIME-030", "inMemoryAnalyticsGate.clickhouseServiceEquivalent", "in-memory analytics must not be ClickHouse equivalent")
    if not in_memory_gate.get("substitutionNonEquivalenceBoundary"):
        F.add("USF-RUNTIME-030", "inMemoryAnalyticsGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
    commands = set(in_memory_gate.get("commands", []))
    for command in (
        "corepack pnpm proof:analytics:clickhouse",
        "corepack pnpm runtime:proof",
        "corepack pnpm providers-proof",
        "python3 tools/validate-runtime/validate-runtime.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    ):
        if command not in commands:
            F.add("USF-RUNTIME-030", "inMemoryAnalyticsGate.commands", f"missing {command}")

    declared_evidence = set(boundary.get("enterpriseEvidenceRefs", []))
    if declared_evidence != CLICKHOUSE_BOUNDARY_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-030", "enterpriseEvidenceRefs", "ClickHouse boundary enterprise evidence refs are incomplete")

    package = state["package"]
    scripts = package.get("scripts") if isinstance(package.get("scripts"), dict) else {}
    if scripts.get("proof:analytics:clickhouse") != "tsx packages/proof/src/clickhouse-composed-proof.ts":
        F.add("USF-RUNTIME-030", "package.json#proof:analytics:clickhouse", "ClickHouse proof package script is missing or stale")
    if package.get("dependencies", {}).get("@clickhouse/client") != "1.23.0":
        F.add("USF-RUNTIME-016", "package.json#@clickhouse/client", "ClickHouse SDK dependency must be exact-version pinned")
    if "clickhouse-analytics-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-030", "Makefile#clickhouse-analytics-proof", "ClickHouse proof Make target is missing")

    adapter_source = state_text(state, ADAPTER_BUS_SOURCE_PATH)
    proof_source = state_text(state, CLICKHOUSE_PROOF_SOURCE_PATH)
    adapter_markers = (
        "@clickhouse/client",
        "ClickHouseComposedAnalyticsEventStoreAdapter",
        "retryClickHouseReadiness",
        "this.#client.ping",
        "this.#client.command",
        "this.#client.insert",
        "this.#client.query",
        "tenantSafeQueryChecked",
        "retentionDeletionChecked",
        "invalidClassificationRejected",
        "cleanupSucceeded",
        "proveUnavailable",
        "safeErrorCode",
        "endpoint://compose/clickhouse",
    )
    for marker in adapter_markers:
        if marker not in adapter_source:
            F.add("USF-RUNTIME-030", str(ADAPTER_BUS_SOURCE_PATH), f"ClickHouse adapter missing proof marker: {marker}")
    proof_markers = (
        "compose/compose.test.generated.yaml",
        "runtime-providers",
        "clickhouse",
        "host_ip: 127.0.0.1",
        "allocateFetchSafeLoopbackPort",
        "assertFetchSafeLoopbackPort",
        "CLICKHOUSE_SKIP_USER_SETUP",
        "ClickHouseComposedAnalyticsEventStoreAdapter",
        "proveRoundTrip",
        "proveUnavailable",
        "composeDown",
        "assertSafeEvidence",
    )
    for marker in proof_markers:
        if marker not in proof_source:
            F.add("USF-RUNTIME-030", str(CLICKHOUSE_PROOF_SOURCE_PATH), f"ClickHouse proof source missing marker: {marker}")

    matrix = state.get("analyticsEventStoreMatrix") or {}
    if "USF-206" not in set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-030", "analyticsEventStoreMatrix.issueLinks", "analytics matrix must link USF-206")
    if matrix.get("remainingProofIssue") is not None:
        F.add("USF-RUNTIME-030", "analyticsEventStoreMatrix.remainingProofIssue", "analytics matrix must not carry USF-206 as unresolved remaining proof")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-clickhouse-analytics-provider")
    if not binding:
        F.add("USF-RUNTIME-030", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "runtime manifest must include ClickHouse provider binding")
    else:
        expected_binding = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "adapter-package-only",
            "sourceUseDisposition": "runtime-proof-support",
            "adapterName": "ClickHouseComposedAnalyticsEventStoreAdapter",
            "portName": "AnalyticsEventStore",
            "endpointRef": "endpoint://compose/clickhouse",
            "sdkPackage": "@clickhouse/client",
            "sdkVersion": "1.23.0",
            "proofCommand": "corepack pnpm proof:analytics:clickhouse",
        }
        for field, expected in expected_binding.items():
            if binding.get(field) != expected:
                F.add("USF-RUNTIME-030", f"providerBindingMatrix.usf-189-clickhouse-analytics-provider.{field}", f"expected {expected!r}")
        if set(binding.get("providerRegistryIds", [])) != {"analytics-store-clickhouse-composed-test", "analytics-store-clickhouse-deferred"}:
            F.add("USF-RUNTIME-030", "providerBindingMatrix.usf-189-clickhouse-analytics-provider.providerRegistryIds", "ClickHouse binding must carry composed and deferred provider registry ids")
        if "USF-206" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-030", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "runtime manifest must link USF-206")
        if "USF-206 proof:analytics:clickhouse" not in str(binding.get("proofEvidence", "")):
            F.add("USF-RUNTIME-030", "providerBindingMatrix.usf-189-clickhouse-analytics-provider.proofEvidence", "runtime manifest must record ClickHouse proof evidence")
        stale_text = json.dumps(binding, sort_keys=True).lower()
        if "actual adapter proof" in stale_text or "defer actual" in stale_text:
            F.add("USF-RUNTIME-030", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "runtime manifest still carries stale ClickHouse deferral wording")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-analytics-provider-deferred")
    if not deferred or "USF-206" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-030", "deferredBoundaries.usf-189-analytics-provider-deferred", "runtime deferred boundary must link USF-206 lineage")
    if deferred and "USF-206 resolves bounded local Compose ClickHouse" not in str(deferred.get("boundary", "")):
        F.add("USF-RUNTIME-030", "deferredBoundaries.usf-189-analytics-provider-deferred", "runtime deferred boundary must distinguish resolved local proof from remaining readiness boundaries")


def check_redis_cache_service_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("redisCacheProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-031", str(REDIS_CACHE_PROOF_BOUNDARY_PATH), "Redis cache proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-207",
        "followUpIssue": None,
        "sourceDispositionIssue": "USF-173",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "status": "profile-gated-bounded-proof-present",
        "serviceCatalogueAuthority": SERVICE_CATALOGUE_PATH,
        "runtimeManifest": str(MANIFEST_PATH),
        "closureMatrix": "docs/architecture/compose-service-disposition-closure-matrix.json",
        "cacheEventingDispositionMatrix": str(CACHE_EVENTING_MATRIX_PATH),
        "enterpriseEvidenceModel": "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if boundary.get(key) != expected:
            F.add("USF-RUNTIME-031", key, f"expected {expected!r}")

    if set(boundary.get("serviceIds", [])) != {"redis"}:
        F.add("USF-RUNTIME-031", "serviceIds", "Redis boundary service ids are incomplete")
    if set(boundary.get("providerBindingIds", [])) != {"usf-189-redis-cache-provider"}:
        F.add("USF-RUNTIME-031", "providerBindingIds", "Redis boundary provider binding ids are incomplete")
    if set(boundary.get("providerRegistryIds", [])) != {"cache-redis-composed-test", "cache-redis-deferred"}:
        F.add("USF-RUNTIME-031", "providerRegistryIds", "Redis boundary provider registry ids are incomplete")
    if REDIS_CACHE_BOUNDARY_REQUIRED_ISSUES - set(boundary.get("issueLinks", [])):
        F.add("USF-RUNTIME-031", "issueLinks", "Redis boundary issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(boundary.get("nonClaims", [])):
        F.add("USF-RUNTIME-031", "nonClaims", "Redis boundary non-claims are incomplete")
    if REDIS_CACHE_BOUNDARY_PROHIBITED_CLAIMS - set(boundary.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-031", "readinessClaimsProhibited", "Redis boundary prohibited claims are incomplete")
    if REDIS_CACHE_BOUNDARY_PROHIBITED_CLAIMS & set(boundary.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-031", "readinessClaimsAllowed", "Redis boundary allows a prohibited readiness claim")

    reclassification = boundary.get("reclassification", {})
    if not isinstance(reclassification, dict):
        F.add("USF-RUNTIME-031", "reclassification", "Redis reclassification must be an object")
    else:
        expected_reclassification = {
            "from": "explicit-deferred-service-proof",
            "to": "profile-gated-bounded-local-compose-proof",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": True,
            "redisServiceReadinessClaim": False,
            "cacheReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "natsEquivalentToRedisService": False,
            "inMemoryCacheEquivalentToRedisService": False,
        }
        for key, expected in expected_reclassification.items():
            observed = reclassification.get(key)
            if observed != expected:
                F.add("USF-RUNTIME-031", f"reclassification.{key}", f"expected {expected!r}")
        required_refs = {
            "adapters/bus/src/index.ts#RedisComposedCacheAdapter",
            "packages/proof/src/redis-composed-proof.ts",
            "package.json#proof:cache:redis",
            "Makefile#redis-cache-proof",
            "tools/validate-runtime/validate-runtime.py",
        }
        if required_refs - set(reclassification.get("repositoryEvidence", [])):
            F.add("USF-RUNTIME-031", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-RUNTIME-031", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "none-for-USF-207-bounded-proof",
            "owner": "platform-workflow-foundation",
            "riskOwner": "platform-workflow-risk-owner",
            "controlOwner": "platform-workflow-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_remaining.items():
            if remaining.get(key) != expected:
                F.add("USF-RUNTIME-031", f"remainingProofBoundary.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "requiredEvidence"):
            if remaining.get(field) in (None, "", []):
                F.add("USF-RUNTIME-031", f"remainingProofBoundary.{field}", "remaining proof field is required")
        required_remaining = {
            "environment-specific Redis readiness and promotion gates before any dev/test/staging/production readiness claim",
            "live/provider-managed Redis supplier and credential evidence before any live-provider claim",
            "API runtime cache-port integration proof before any API Redis runtime-use claim",
            "worker runtime cache-port integration proof before any worker Redis runtime-use claim",
        }
        if required_remaining - set(remaining.get("requiredEvidence", [])):
            F.add("USF-RUNTIME-031", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    cache_boundary = boundary.get("cacheProviderBoundary", {})
    expected_cache = {
        "writeReadStatus": "proven-by-USF-207-profile-gated-local-compose",
        "expirationTtlStatus": "proven-by-USF-207-profile-gated-local-compose",
        "retryTimeoutStatus": "proven-by-USF-207-profile-gated-local-compose",
        "failClosedStatus": "proven-by-USF-207-profile-gated-local-compose",
        "auditEvidenceStatus": "value-free-audit-shaped-evidence-proven-by-USF-207",
        "readinessRetryStatus": "bounded-exponential-backoff-60s-proven-by-USF-207",
        "teardownCleanupStatus": "redis-key-delete-and-compose-down-proven-by-USF-207",
        "providerFailureHandlingStatus": "unavailable-provider-fail-closed-proven-by-USF-207",
    }
    for field, expected in expected_cache.items():
        if cache_boundary.get(field) != expected:
            F.add("USF-RUNTIME-031", f"cacheProviderBoundary.{field}", f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not cache_boundary.get(field):
            F.add("USF-RUNTIME-031", f"cacheProviderBoundary.{field}", "Redis cache boundary owner metadata is required")

    sdk = boundary.get("sdkProviderBoundary", {})
    expected_sdk = {
        "sdkSelectionStatus": "official-sdk-selected-and-pinned",
        "sdkPackage": "redis",
        "sdkVersion": "6.0.1",
        "sdkBoundary": "adapter-package-only",
    }
    for field, expected in expected_sdk.items():
        if sdk.get(field) != expected:
            F.add("USF-RUNTIME-031", f"sdkProviderBoundary.{field}", f"expected {expected!r}")
    if "official Node Redis client" not in str(sdk.get("sdkSelectionRationale", "")):
        F.add("USF-RUNTIME-031", "sdkProviderBoundary.sdkSelectionRationale", "Redis SDK rationale must name official Node Redis client")
    for field in ("secretBoundary", "supplierBoundary"):
        if not sdk.get(field):
            F.add("USF-RUNTIME-031", f"sdkProviderBoundary.{field}", "SDK/provider boundary field is required")

    substitute_gate = boundary.get("natsAndInMemoryGate", {})
    if substitute_gate.get("repositoryValidationRequired") is not True:
        F.add("USF-RUNTIME-031", "natsAndInMemoryGate.repositoryValidationRequired", "repository validation must remain required")
    if substitute_gate.get("redisServiceEquivalent") is not False:
        F.add("USF-RUNTIME-031", "natsAndInMemoryGate.redisServiceEquivalent", "NATS and in-memory evidence must not be Redis equivalent")
    if not substitute_gate.get("substitutionNonEquivalenceBoundary"):
        F.add("USF-RUNTIME-031", "natsAndInMemoryGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
    commands = set(substitute_gate.get("commands", []))
    for command in (
        "corepack pnpm proof:cache:redis",
        "corepack pnpm runtime:proof",
        "corepack pnpm providers-proof",
        "python3 tools/validate-runtime/validate-runtime.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    ):
        if command not in commands:
            F.add("USF-RUNTIME-031", "natsAndInMemoryGate.commands", f"missing {command}")

    declared_evidence = set(boundary.get("enterpriseEvidenceRefs", []))
    if declared_evidence != REDIS_CACHE_BOUNDARY_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-031", "enterpriseEvidenceRefs", "Redis boundary enterprise evidence refs are incomplete")

    package = state["package"]
    scripts = package.get("scripts") if isinstance(package.get("scripts"), dict) else {}
    if scripts.get("proof:cache:redis") != "tsx packages/proof/src/redis-composed-proof.ts":
        F.add("USF-RUNTIME-031", "package.json#proof:cache:redis", "Redis proof package script is missing or stale")
    if package.get("dependencies", {}).get("redis") != "6.0.1":
        F.add("USF-RUNTIME-016", "package.json#redis", "Redis SDK dependency must be exact-version pinned")
    if "redis-cache-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-031", "Makefile#redis-cache-proof", "Redis proof Make target is missing")

    adapter_source = state_text(state, ADAPTER_BUS_SOURCE_PATH)
    proof_source = state_text(state, REDIS_PROOF_SOURCE_PATH)
    adapter_markers = (
        "createClient",
        "RedisComposedCacheAdapter",
        "retryRedisReadiness",
        "this.#client.set",
        "this.#client.get",
        "this.#client.del",
        "this.#client.ttl",
        "ttlExpirationChecked",
        "tenantNamespaceChecked",
        "cleanupSucceeded",
        "proveUnavailable",
        "safeErrorCode",
        "redactionChecked",
        "endpoint://compose/redis",
    )
    for marker in adapter_markers:
        if marker not in adapter_source:
            F.add("USF-RUNTIME-031", str(ADAPTER_BUS_SOURCE_PATH), f"Redis adapter missing proof marker: {marker}")
    proof_markers = (
        "compose/compose.test.generated.yaml",
        "runtime-providers",
        "redis",
        "host_ip: 127.0.0.1",
        "allocateFetchSafeLoopbackPort",
        "assertFetchSafeLoopbackPort",
        "RedisComposedCacheAdapter",
        "proveRoundTrip",
        "proveUnavailable",
        "composeDown",
        "assertSafeEvidence",
    )
    for marker in proof_markers:
        if marker not in proof_source:
            F.add("USF-RUNTIME-031", str(REDIS_PROOF_SOURCE_PATH), f"Redis proof source missing marker: {marker}")

    matrix = state.get("cacheEventingMatrix") or {}
    if "USF-207" not in set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-031", "cacheEventingMatrix.issueLinks", "cache/eventing matrix must link USF-207")
    if matrix.get("remainingProofIssue") is not None:
        F.add("USF-RUNTIME-031", "cacheEventingMatrix.remainingProofIssue", "cache/eventing matrix must not carry USF-207 as unresolved remaining proof")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-redis-cache-provider")
    if not binding:
        F.add("USF-RUNTIME-031", "providerBindingMatrix.usf-189-redis-cache-provider", "runtime manifest must include Redis provider binding")
    else:
        expected_binding = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "adapter-package-only",
            "sourceUseDisposition": "runtime-proof-support",
            "adapterName": "RedisComposedCacheAdapter",
            "portName": "CacheProvider",
            "endpointRef": "endpoint://compose/redis",
            "sdkPackage": "redis",
            "sdkVersion": "6.0.1",
            "proofCommand": "corepack pnpm proof:cache:redis",
        }
        for field, expected in expected_binding.items():
            if binding.get(field) != expected:
                F.add("USF-RUNTIME-031", f"providerBindingMatrix.usf-189-redis-cache-provider.{field}", f"expected {expected!r}")
        if set(binding.get("providerRegistryIds", [])) != {"cache-redis-composed-test", "cache-redis-deferred"}:
            F.add("USF-RUNTIME-031", "providerBindingMatrix.usf-189-redis-cache-provider.providerRegistryIds", "Redis binding must carry composed and deferred provider registry ids")
        if "USF-207" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-031", "providerBindingMatrix.usf-189-redis-cache-provider", "runtime manifest must link USF-207")
        if "USF-207 proof:cache:redis" not in str(binding.get("proofEvidence", "")):
            F.add("USF-RUNTIME-031", "providerBindingMatrix.usf-189-redis-cache-provider.proofEvidence", "runtime manifest must record Redis proof evidence")
        stale_text = json.dumps(binding, sort_keys=True).lower()
        if "actual redis proof" in stale_text or "defer actual" in stale_text:
            F.add("USF-RUNTIME-031", "providerBindingMatrix.usf-189-redis-cache-provider", "runtime manifest still carries stale Redis deferral wording")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-cache-provider-deferred")
    if not deferred or "USF-207" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-031", "deferredBoundaries.usf-189-cache-provider-deferred", "runtime deferred boundary must link USF-207 lineage")
    if deferred and "USF-207 resolves bounded local Compose Redis adapter proof" not in str(deferred.get("boundary", "")):
        F.add("USF-RUNTIME-031", "deferredBoundaries.usf-189-cache-provider-deferred", "runtime deferred boundary must distinguish resolved local proof from remaining readiness boundaries")

def check_cache_eventing_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("cacheEventingMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-RUNTIME-024", str(CACHE_EVENTING_MATRIX_PATH), "cache/eventing disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-173",
        "followUpIssue": "USF-198",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "activeEventBusBindingId": "nats-event-bus-provider",
        "deferredCacheBindingId": "usf-189-redis-cache-provider",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-RUNTIME-024", key, f"expected {expected!r}")

    if CACHE_EVENTING_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-024", "issueLinks", "cache/eventing issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-024", "nonClaims", "cache/eventing non-claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-024", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if CACHE_EVENTING_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-024", "readinessClaimsProhibited", "cache/eventing prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-RUNTIME-024", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-RUNTIME-024", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    roles = {
        item.get("role"): item
        for item in matrix.get("semanticRoleClassification", [])
        if isinstance(item, dict) and isinstance(item.get("role"), str)
    }
    for role in ("event-bus", "cache", "in-memory-substitute"):
        if role not in roles:
            F.add("USF-RUNTIME-024", "semanticRoleClassification", f"missing semantic role: {role}")
    event_role = roles.get("event-bus", {})
    if event_role:
        expected_event = {
            "serviceCatalogueServiceId": "nats",
            "providerBindingId": "nats-event-bus-provider",
            "providerRegistryId": "event-bus-nats-composed-test",
            "disposition": "implemented-and-proven-bounded-local-compose",
            "readinessClaim": False,
        }
        for key, expected in expected_event.items():
            observed = event_role.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-024", f"semanticRoleClassification.event-bus.{key}", f"expected {expected!r}")
        if "not Redis" not in str(event_role.get("nonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-024", "semanticRoleClassification.event-bus.nonEquivalenceBoundary", "NATS non-equivalence to Redis must be explicit")
    cache_role = roles.get("cache", {})
    if cache_role:
        expected_cache = {
            "serviceCatalogueServiceId": "redis",
            "providerBindingId": "usf-189-redis-cache-provider",
            "providerRegistryId": "cache-redis-composed-test",
            "disposition": "profile-gated-bounded-local-compose-proof",
            "followUpIssue": "USF-207",
            "readinessClaim": False,
        }
        for key, expected in expected_cache.items():
            observed = cache_role.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-024", f"semanticRoleClassification.cache.{key}", f"expected {expected!r}")
        if "NATS event-bus proof" not in str(cache_role.get("nonEquivalenceBoundary", "")) or "process-memory proof" not in str(cache_role.get("nonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-024", "semanticRoleClassification.cache.nonEquivalenceBoundary", "Redis proof must preserve NATS and process-memory non-equivalence")
        if "corepack pnpm proof:cache:redis" not in set(cache_role.get("proofCommands", [])):
            F.add("USF-RUNTIME-024", "semanticRoleClassification.cache.proofCommands", "Redis cache role must reference proof:cache:redis")
    in_memory_role = roles.get("in-memory-substitute", {})
    if in_memory_role:
        if in_memory_role.get("disposition") != "allowed-only-where-semantically-permitted":
            F.add("USF-RUNTIME-024", "semanticRoleClassification.in-memory-substitute.disposition", "in-memory substitute boundary is unsafe")
        if in_memory_role.get("readinessClaim") is not False:
            F.add("USF-RUNTIME-024", "semanticRoleClassification.in-memory-substitute.readinessClaim", "in-memory substitute must not make readiness claims")
        if "not equivalent to Redis" not in str(in_memory_role.get("nonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-024", "semanticRoleClassification.in-memory-substitute.nonEquivalenceBoundary", "in-memory non-equivalence to Redis must be explicit")

    disposition = matrix.get("cacheEventingDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-RUNTIME-024", "cacheEventingDisposition", "cache/eventing disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "explicit-split-with-profile-gated-redis-proof",
            "cacheServiceSemanticProofPresent": True,
            "redisServiceSemanticProofPresent": True,
            "natsEventBusProofPresent": True,
            "natsRedisEquivalent": False,
            "inMemoryRedisEquivalent": False,
            "redisReadinessClaim": False,
            "cacheReadinessClaim": False,
            "eventingReadinessClaim": False,
            "redisProviderRegistryId": "cache-redis-composed-test",
            "natsProviderRegistryId": "event-bus-nats-composed-test",
            "followUpIssue": "USF-207",
            "owner": "platform-workflow-foundation",
            "riskOwner": "platform-workflow-risk-owner",
            "controlOwner": "platform-workflow-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-024", f"cacheEventingDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-024", f"cacheEventingDisposition.{field}", "deferral field is required")

    nats_boundary = matrix.get("natsEventBusBoundary", {})
    if not isinstance(nats_boundary, dict):
        F.add("USF-RUNTIME-024", "natsEventBusBoundary", "NATS boundary must be an object")
    else:
        expected_nats = {
            "providerBindingId": "nats-event-bus-provider",
            "providerRegistryId": "event-bus-nats-composed-test",
            "bindingStatus": "active",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkPackage": "@nats-io/transport-node",
            "sdkVersion": "3.4.0",
            "redisServiceEquivalent": False,
        }
        for key, expected in expected_nats.items():
            observed = nats_boundary.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-024", f"natsEventBusBoundary.{key}", f"expected {expected!r}")
        commands = set(nats_boundary.get("proofCommands", []))
        for command in (
            "corepack pnpm runtime:proof",
            "corepack pnpm providers-proof",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-024", "natsEventBusBoundary.proofCommands", f"missing {command}")
        if len(nats_boundary.get("scopeCovered", [])) < 4 or len(nats_boundary.get("limits", [])) < 5:
            F.add("USF-RUNTIME-024", "natsEventBusBoundary", "NATS scope and limits are incomplete")

    redis_boundary = matrix.get("redisProviderBoundary", {})
    if not isinstance(redis_boundary, dict):
        F.add("USF-RUNTIME-024", "redisProviderBoundary", "Redis provider boundary must be an object")
    else:
        expected_redis = {
            "providerBindingId": "usf-189-redis-cache-provider",
            "providerRegistryId": "cache-redis-composed-test",
            "deferredProviderRegistryId": "cache-redis-deferred",
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "runtimeProviderBindingActive": False,
            "sdkPackage": "redis",
            "sdkVersion": "6.0.1",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/redis",
            "proofCommand": "corepack pnpm proof:cache:redis",
            "followUpIssue": "USF-207",
            "remainingProofIssue": None,
        }
        for key, expected in expected_redis.items():
            observed = redis_boundary.get(key)
            if observed is not expected if isinstance(expected, bool) or expected is None else observed != expected:
                F.add("USF-RUNTIME-024", f"redisProviderBoundary.{key}", f"expected {expected!r}")

    substitute = matrix.get("inMemorySubstituteBoundary", {})
    if not isinstance(substitute, dict):
        F.add("USF-RUNTIME-024", "inMemorySubstituteBoundary", "substitute boundary must be an object")
    else:
        if substitute.get("usedWhereSemanticallyPermitted") is not True:
            F.add("USF-RUNTIME-024", "inMemorySubstituteBoundary.usedWhereSemanticallyPermitted", "permitted in-memory use must be explicit")
        for key in ("redisServiceEquivalent", "natsServiceEquivalent"):
            if substitute.get(key) is not False:
                F.add("USF-RUNTIME-024", f"inMemorySubstituteBoundary.{key}", "in-memory evidence must not be provider equivalent")
        if "not equivalent to Redis" not in str(substitute.get("substitutionNonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-024", "inMemorySubstituteBoundary.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        commands = set(substitute.get("commands", []))
        for command in (
            "corepack pnpm runtime:proof:in-memory",
            "corepack pnpm runtime:proof",
            "corepack pnpm providers-proof",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-024", "inMemorySubstituteBoundary.commands", f"missing {command}")
        if len(substitute.get("scopeCovered", [])) < 4 or len(substitute.get("limits", [])) < 6:
            F.add("USF-RUNTIME-024", "inMemorySubstituteBoundary", "substitute scope and limits are incomplete")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if declared_evidence != CACHE_EVENTING_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-024", "enterpriseEvidenceRefs", "cache/eventing enterprise evidence refs are incomplete")

    bindings = binding_records(state["manifest"])
    redis_binding = bindings.get("usf-189-redis-cache-provider")
    if not redis_binding:
        F.add("USF-RUNTIME-024", "providerBindingMatrix", "Redis provider disposition is missing from runtime manifest")
    else:
        if "USF-207" not in redis_binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider", "runtime manifest must link USF-207")
        if redis_binding.get("bindingStatus") != "profile-gated-proven" or redis_binding.get("endpointRef") != "endpoint://compose/redis":
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider", "Redis must be profile-gated proven with redacted endpoint ref")
        if redis_binding.get("sdkPackage") != "redis" or redis_binding.get("sdkVersion") != "6.0.1":
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider", "Redis must name exact pinned SDK/client package")
        if redis_binding.get("proofCommand") != "corepack pnpm proof:cache:redis":
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider", "Redis must reference proof:cache:redis")

    nats_binding = bindings.get("nats-event-bus-provider")
    if not nats_binding:
        F.add("USF-RUNTIME-024", "providerBindingMatrix", "NATS event-bus provider binding is missing from runtime manifest")
    else:
        if nats_binding.get("bindingStatus") != "active" or nats_binding.get("providerRegistryIds") != ["event-bus-nats-composed-test"]:
            F.add("USF-RUNTIME-024", "providerBindingMatrix.nats-event-bus-provider", "NATS event-bus proof linkage is inconsistent")
        if nats_binding.get("sdkPackage") != "@nats-io/transport-node" or nats_binding.get("sdkVersion") != "3.4.0":
            F.add("USF-RUNTIME-024", "providerBindingMatrix.nats-event-bus-provider", "NATS SDK evidence is inconsistent")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-cache-provider-deferred")
    if not deferred or "USF-198" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-024", "deferredBoundaries.usf-189-cache-provider-deferred", "runtime deferred boundary must link USF-198")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in ("until USF-173 closes", "followUpIssue=USF-173", "\"followUpIssue\": \"USF-173\"", "linkedFollowUpIssue=USF-173"):
        if stale in matrix_text:
            F.add("USF-RUNTIME-024", "cache-eventing-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_composed_search_provider_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("composedSearchProviderMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-RUNTIME-025", str(COMPOSED_SEARCH_PROVIDER_MATRIX_PATH), "composed search provider disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-174",
        "followUpIssue": "USF-199",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "serviceId": "meilisearch",
        "providerRegistryId": "full-text-search-meilisearch-composed-test",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-RUNTIME-025", key, f"expected {expected!r}")

    if COMPOSED_SEARCH_PROVIDER_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-025", "issueLinks", "composed search provider issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-025", "nonClaims", "composed search provider non-claims are incomplete")
    if COMPOSED_SEARCH_PROVIDER_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-025", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if COMPOSED_SEARCH_PROVIDER_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-025", "readinessClaimsProhibited", "composed search provider prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-RUNTIME-025", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-RUNTIME-025", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("searchProviderDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-RUNTIME-025", "searchProviderDisposition", "search provider disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "profile-gated-composed-proof-present",
            "meilisearchServiceSemanticProofPresent": True,
            "composedSearchProviderProofPresent": True,
            "inMemoryMeilisearchEquivalent": False,
            "liveSearchReadinessClaim": False,
            "vectorSearchReadinessClaim": False,
            "aiSearchReadinessClaim": False,
            "searchProviderReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "serviceCatalogueServiceId": "meilisearch",
            "providerRegistryId": "full-text-search-meilisearch-composed-test",
            "followUpIssue": "USF-199",
            "owner": "platform-search-foundation",
            "riskOwner": "platform-search-risk-owner",
            "controlOwner": "platform-search-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-025", f"searchProviderDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-025", f"searchProviderDisposition.{field}", "deferral field is required")

    substitute = matrix.get("inMemorySubstituteBoundary", {})
    if not isinstance(substitute, dict):
        F.add("USF-RUNTIME-025", "inMemorySubstituteBoundary", "substitute boundary must be an object")
    else:
        if substitute.get("usedWhereSemanticallyPermitted") is not True:
            F.add("USF-RUNTIME-025", "inMemorySubstituteBoundary.usedWhereSemanticallyPermitted", "permitted in-memory use must be explicit")
        for key in (
            "meilisearchServiceEquivalent",
            "rankingEquivalent",
            "filteringEquivalent",
            "asyncIndexingEquivalent",
        ):
            if substitute.get(key) is not False:
                F.add("USF-RUNTIME-025", f"inMemorySubstituteBoundary.{key}", "in-memory evidence must not be Meilisearch equivalent")
        if "not equivalent to Meilisearch" not in str(substitute.get("substitutionNonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-025", "inMemorySubstituteBoundary.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        commands = set(substitute.get("commands", []))
        for command in (
            "corepack pnpm proof:search",
            "corepack pnpm runtime:proof:in-memory",
            "corepack pnpm verify",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-025", "inMemorySubstituteBoundary.commands", f"missing {command}")
        if len(substitute.get("scopeCovered", [])) < 4 or len(substitute.get("limits", [])) < 6:
            F.add("USF-RUNTIME-025", "inMemorySubstituteBoundary", "substitute scope and limits are incomplete")

    provider_boundary = matrix.get("providerBoundary", {})
    if not isinstance(provider_boundary, dict):
        F.add("USF-RUNTIME-025", "providerBoundary", "provider boundary must be an object")
    else:
        expected_provider = {
            "providerBindingId": "usf-189-meilisearch-search-provider",
            "providerRegistryId": "full-text-search-meilisearch-composed-test",
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "runtimeProviderBindingActive": False,
            "sdkPackage": "meilisearch",
            "sdkVersion": "0.58.0",
            "endpointRef": "endpoint://compose/meilisearch",
            "followUpIssue": "USF-199",
        }
        for key, expected in expected_provider.items():
            observed = provider_boundary.get(key)
            if observed is not expected if isinstance(expected, bool) or expected is None else observed != expected:
                F.add("USF-RUNTIME-025", f"providerBoundary.{key}", f"expected {expected!r}")
        if provider_boundary.get("sdkBoundary") != "adapter-package-only":
            F.add("USF-RUNTIME-025", "providerBoundary.sdkBoundary", "Meilisearch proof must stay inside the adapter package boundary")
        if provider_boundary.get("proofCommand") != "corepack pnpm proof:search:meilisearch":
            F.add("USF-RUNTIME-025", "providerBoundary.proofCommand", "Meilisearch proof command is missing or stale")

    operational = matrix.get("operationalEvidencePosture", {})
    if not isinstance(operational, dict):
        F.add("USF-RUNTIME-025", "operationalEvidencePosture", "operational evidence posture must be an object")
    else:
        expected_operational = {
            "readinessRetry": "bounded-exponential-backoff-60s-proven-by-USF-199",
            "timeout": "sdk-request-timeout-2000ms-and-task-wait-timeout-15000ms-proven-by-USF-199",
            "safeTeardown": "temporary-index-delete-and-compose-down-proven-by-USF-199",
        }
        for key, expected in expected_operational.items():
            if operational.get(key) != expected:
                F.add("USF-RUNTIME-025", f"operationalEvidencePosture.{key}", f"expected {expected!r}")
        for field in ("failClosed", "structuredLogging", "tracingCorrelation", "metrics", "auditEvents", "redaction"):
            if field not in operational:
                F.add("USF-RUNTIME-025", f"operationalEvidencePosture.{field}", "operational field is required")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if declared_evidence != COMPOSED_SEARCH_PROVIDER_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-025", "enterpriseEvidenceRefs", "composed search provider enterprise evidence refs are incomplete")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-meilisearch-search-provider")
    if not binding:
        F.add("USF-RUNTIME-025", "providerBindingMatrix", "Meilisearch provider disposition is missing from runtime manifest")
    else:
        if "USF-199" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-025", "providerBindingMatrix.usf-189-meilisearch-search-provider", "runtime manifest must link USF-199")
        if "USF-199" not in str(binding.get("deferredReason", "")):
            F.add("USF-RUNTIME-025", "providerBindingMatrix.usf-189-meilisearch-search-provider.deferredReason", "runtime manifest must record USF-199 bounded proof and remaining runtime-binding deferral")
        expected_binding = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/meilisearch",
            "sdkPackage": "meilisearch",
            "sdkVersion": "0.58.0",
            "proofCommand": "corepack pnpm proof:search:meilisearch",
        }
        for key, expected in expected_binding.items():
            if binding.get(key) != expected:
                F.add("USF-RUNTIME-025", f"providerBindingMatrix.usf-189-meilisearch-search-provider.{key}", f"expected {expected!r}")
        if "full-text-search-meilisearch-composed-test" not in binding.get("providerRegistryIds", []):
            F.add("USF-RUNTIME-025", "providerBindingMatrix.usf-189-meilisearch-search-provider.providerRegistryIds", "composed-test provider registry id is missing")
        if "not claimed" not in str(binding.get("apiProofEvidence", "")) or "not claimed" not in str(binding.get("workerProofEvidence", "")):
            F.add("USF-RUNTIME-025", "providerBindingMatrix.usf-189-meilisearch-search-provider", "API and worker runtime binding non-claims must remain explicit")
        for marker in ("index creation", "tenant-filtered query", "async task visibility", "deletion", "cleanup", "redacted"):
            if marker not in str(binding.get("proofEvidence", "")):
                F.add("USF-RUNTIME-025", "providerBindingMatrix.usf-189-meilisearch-search-provider.proofEvidence", f"missing proof evidence marker: {marker}")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-search-provider-deferred")
    if not deferred or "USF-199" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-025", "deferredBoundaries.usf-189-search-provider-deferred", "runtime deferred boundary must link USF-199")
    elif "API and worker runtime binding" not in str(deferred.get("boundary", "")):
        F.add("USF-RUNTIME-025", "deferredBoundaries.usf-189-search-provider-deferred", "remaining API/worker runtime binding deferral must stay explicit")

    search_adapter_source = state_text(state, ADAPTER_SEARCH_SOURCE_PATH)
    for marker in (
        "MeilisearchComposedSearchAdapter",
        "retryMeilisearchReadiness",
        "bounded-exponential-backoff-60s",
        "safeErrorRedactionChecked",
        "metricEvidenceCaptured",
        "traceEvidenceCaptured",
        "auditEvidenceCaptured",
        "redactionChecked",
        "tenantIsolationChecked",
        "deleteChecked",
        "retentionCleanupChecked",
        "reindexBoundaryChecked",
        "apiRuntimeUse",
        "workerRuntimeUse",
        "meilisearch",
    ):
        if marker not in search_adapter_source:
            F.add("USF-RUNTIME-025", str(ADAPTER_SEARCH_SOURCE_PATH), f"Meilisearch adapter proof marker is missing: {marker}")

    meilisearch_proof_source = state_text(state, MEILISEARCH_PROOF_SOURCE_PATH)
    for marker in (
        "runMeilisearchComposedProof",
        "compose",
        "--profile",
        "runtime-providers",
        "corepack pnpm proof:search:meilisearch",
        "MeilisearchComposedSearchAdapter",
        "composeDown",
        "finally",
        "FORBIDDEN_EVIDENCE_PATTERN",
        "no-production-readiness",
        "no-live-provider-readiness",
        "API and worker runtime binding remain explicitly not applicable",
    ):
        if marker not in meilisearch_proof_source:
            F.add("USF-RUNTIME-025", str(MEILISEARCH_PROOF_SOURCE_PATH), f"Meilisearch proof source marker is missing: {marker}")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in ("until USF-174 closes", "followUpIssue=USF-174", "\"followUpIssue\": \"USF-174\"", "linkedFollowUpIssue=USF-174"):
        if stale in matrix_text:
            F.add("USF-RUNTIME-025", "composed-search-provider-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_file_scanner_provider_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("fileScannerProviderMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-RUNTIME-026", str(FILE_SCANNER_PROVIDER_MATRIX_PATH), "file scanner provider disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-175",
        "followUpIssue": "USF-200",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "serviceId": "clamav",
        "providerRegistryId": "file-scan-clamav-composed-test",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-RUNTIME-026", key, f"expected {expected!r}")

    if FILE_SCANNER_PROVIDER_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-026", "issueLinks", "file scanner provider issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-026", "nonClaims", "file scanner provider non-claims are incomplete")
    if FILE_SCANNER_PROVIDER_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-026", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if FILE_SCANNER_PROVIDER_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-026", "readinessClaimsProhibited", "file scanner provider prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-RUNTIME-026", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-RUNTIME-026", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("scannerProviderDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-RUNTIME-026", "scannerProviderDisposition", "scanner provider disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "profile-gated-composed-proof-present",
            "clamavServiceSemanticProofPresent": True,
            "composedScannerProviderProofPresent": True,
            "deterministicScannerClamavEquivalent": False,
            "failClosedQuarantineClaim": "profile-gated-composed-proof",
            "liveScannerReadinessClaim": False,
            "dlpReadinessClaim": False,
            "vulnerabilityClearanceClaim": False,
            "scannerProviderReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "serviceCatalogueServiceId": "clamav",
            "providerRegistryId": "file-scan-clamav-composed-test",
            "followUpIssue": "USF-200",
            "owner": "platform-files-foundation",
            "riskOwner": "platform-files-risk-owner",
            "controlOwner": "platform-files-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-026", f"scannerProviderDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-026", f"scannerProviderDisposition.{field}", "deferral field is required")

    substitute = matrix.get("deterministicScanSubstituteBoundary", {})
    if not isinstance(substitute, dict):
        F.add("USF-RUNTIME-026", "deterministicScanSubstituteBoundary", "substitute boundary must be an object")
    else:
        if substitute.get("usedWhereSemanticallyPermitted") is not True:
            F.add("USF-RUNTIME-026", "deterministicScanSubstituteBoundary.usedWhereSemanticallyPermitted", "permitted deterministic scan use must be explicit")
        for key in (
            "clamavServiceEquivalent",
            "liveMalwareScanEquivalent",
            "dlpEquivalent",
            "providerFailureEquivalent",
            "quarantineReleaseEquivalent",
        ):
            if substitute.get(key) is not False:
                F.add("USF-RUNTIME-026", f"deterministicScanSubstituteBoundary.{key}", "deterministic scan evidence must not be ClamAV equivalent")
        if "not equivalent to ClamAV" not in str(substitute.get("substitutionNonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-026", "deterministicScanSubstituteBoundary.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        commands = set(substitute.get("commands", []))
        for command in (
            "corepack pnpm proof:files",
            "corepack pnpm runtime:proof:in-memory",
            "corepack pnpm verify",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-026", "deterministicScanSubstituteBoundary.commands", f"missing {command}")
        if len(substitute.get("scopeCovered", [])) < 4 or len(substitute.get("limits", [])) < 6:
            F.add("USF-RUNTIME-026", "deterministicScanSubstituteBoundary", "substitute scope and limits are incomplete")

    provider_boundary = matrix.get("providerBoundary", {})
    if not isinstance(provider_boundary, dict):
        F.add("USF-RUNTIME-026", "providerBoundary", "provider boundary must be an object")
    else:
        expected_provider = {
            "providerBindingId": "usf-189-clamav-scanner-provider",
            "providerRegistryId": "file-scan-clamav-composed-test",
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "runtimeProviderBindingActive": False,
            "sdkPackage": "clamscan",
            "sdkVersion": "2.4.0",
            "endpointRef": "endpoint://compose/clamav",
            "followUpIssue": "USF-200",
        }
        for key, expected in expected_provider.items():
            observed = provider_boundary.get(key)
            if observed is not expected if isinstance(expected, bool) or expected is None else observed != expected:
                F.add("USF-RUNTIME-026", f"providerBoundary.{key}", f"expected {expected!r}")
        if provider_boundary.get("sdkBoundary") != "adapter-package-only":
            F.add("USF-RUNTIME-026", "providerBoundary.sdkBoundary", "ClamAV proof must stay inside the adapter package boundary")
        if provider_boundary.get("proofCommand") != "corepack pnpm proof:scanner:clamav":
            F.add("USF-RUNTIME-026", "providerBoundary.proofCommand", "ClamAV proof command is missing or stale")
        if provider_boundary.get("sourceUse") != "de-facto-clamscan-tcp-client":
            F.add("USF-RUNTIME-026", "providerBoundary.sourceUse", "ClamAV source-use rationale is missing or stale")

    operational = matrix.get("operationalEvidencePosture", {})
    if not isinstance(operational, dict):
        F.add("USF-RUNTIME-026", "operationalEvidencePosture", "operational evidence posture must be an object")
    else:
        expected_operational = {
            "readinessRetry": "bounded-exponential-backoff-180s-proven-by-USF-200",
            "timeout": "clamd-scan-timeout-30000ms-and-unavailable-timeout-proof-proven-by-USF-200",
            "safeTeardown": "compose-down-proven-by-USF-200",
        }
        for key, expected in expected_operational.items():
            if operational.get(key) != expected:
                F.add("USF-RUNTIME-026", f"operationalEvidencePosture.{key}", f"expected {expected!r}")
        for field in ("failClosed", "structuredLogging", "tracingCorrelation", "metrics", "auditEvents", "redaction"):
            if field not in operational:
                F.add("USF-RUNTIME-026", f"operationalEvidencePosture.{field}", "operational field is required")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if declared_evidence != FILE_SCANNER_PROVIDER_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-026", "enterpriseEvidenceRefs", "file scanner provider enterprise evidence refs are incomplete")

    sdk_selection = matrix.get("sdkClientSelection", {})
    if not isinstance(sdk_selection, dict):
        F.add("USF-RUNTIME-026", "sdkClientSelection", "ClamAV SDK/client selection rationale is missing")
    else:
        expected_sdk = {
            "package": "clamscan",
            "version": "2.4.0",
            "officialOrDeFactoStatus": "de-facto-maintained-client",
            "localComposeCompatibility": "Configured for clamd TCP on loopback-published ephemeral port with localFallback disabled and no local binary invocation.",
            "updateOwner": "platform-files-dependency-owner",
        }
        for key, expected in expected_sdk.items():
            if sdk_selection.get(key) != expected:
                F.add("USF-RUNTIME-026", f"sdkClientSelection.{key}", f"expected {expected!r}")
        for field in (
            "selectionRationale",
            "licencePosture",
            "maintenancePosture",
            "securityAdvisoryPosture",
            "typescriptRuntimeCompatibility",
            "alternativesRejected",
        ):
            if not sdk_selection.get(field):
                F.add("USF-RUNTIME-026", f"sdkClientSelection.{field}", "SDK/client governance field is required")

    proof_evidence = matrix.get("proofEvidence", {})
    if not isinstance(proof_evidence, dict):
        F.add("USF-RUNTIME-026", "proofEvidence", "ClamAV proof evidence metadata is missing")
    else:
        expected_proof = {
            "proofCommand": "corepack pnpm proof:scanner:clamav",
            "packageScript": "proof:scanner:clamav",
            "makeTarget": "scanner-proof-clamav",
            "proofSource": "packages/proof/src/clamav-composed-proof.ts",
            "adapterSource": "adapters/store/src/index.ts",
        }
        for key, expected in expected_proof.items():
            if proof_evidence.get(key) != expected:
                F.add("USF-RUNTIME-026", f"proofEvidence.{key}", f"expected {expected!r}")
        markers = set(proof_evidence.get("evidenceMarkers", []))
        for marker in (
            "cleanScanChecked",
            "infectedScanChecked",
            "providerUnavailableChecked",
            "failClosedQuarantineChecked",
            "readinessRetryPolicy=bounded-exponential-backoff-180s",
            "quarantinedDownloadDenied",
            "cleanDeleteBoundaryChecked",
            "tenantIsolationChecked",
            "auditRedactionChecked",
            "compose-down",
        ):
            if marker not in markers:
                F.add("USF-RUNTIME-026", "proofEvidence.evidenceMarkers", f"missing proof marker: {marker}")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-clamav-scanner-provider")
    if not binding:
        F.add("USF-RUNTIME-026", "providerBindingMatrix", "ClamAV provider disposition is missing from runtime manifest")
    else:
        if "USF-200" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-026", "providerBindingMatrix.usf-189-clamav-scanner-provider", "runtime manifest must link USF-200")
        if "USF-200" not in str(binding.get("deferredReason", "")):
            F.add("USF-RUNTIME-026", "providerBindingMatrix.usf-189-clamav-scanner-provider.deferredReason", "runtime manifest must record USF-200 bounded proof and remaining scanner deferrals")
        expected_binding = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/clamav",
            "sdkPackage": "clamscan",
            "sdkVersion": "2.4.0",
            "proofCommand": "corepack pnpm proof:scanner:clamav",
        }
        for key, expected in expected_binding.items():
            if binding.get(key) != expected:
                F.add("USF-RUNTIME-026", f"providerBindingMatrix.usf-189-clamav-scanner-provider.{key}", f"expected {expected!r}")
        if "file-scan-clamav-composed-test" not in binding.get("providerRegistryIds", []):
            F.add("USF-RUNTIME-026", "providerBindingMatrix.usf-189-clamav-scanner-provider.providerRegistryIds", "composed-test provider registry id is missing")
        if "not claimed" not in str(binding.get("apiProofEvidence", "")) or "not claimed" not in str(binding.get("workerProofEvidence", "")):
            F.add("USF-RUNTIME-026", "providerBindingMatrix.usf-189-clamav-scanner-provider", "API and worker runtime binding non-claims must remain explicit")
        for marker in ("readiness retry", "clean scan", "EICAR infected", "provider-unavailable", "fail-closed quarantine", "quarantined download denial", "deletion", "tenant isolation", "redaction", "Compose teardown"):
            if marker not in str(binding.get("proofEvidence", "")):
                F.add("USF-RUNTIME-026", "providerBindingMatrix.usf-189-clamav-scanner-provider.proofEvidence", f"missing proof evidence marker: {marker}")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-scanner-provider-deferred")
    if not deferred or "USF-200" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-026", "deferredBoundaries.usf-189-scanner-provider-deferred", "runtime deferred boundary must link USF-200")
    elif "signature database freshness" not in str(deferred.get("boundary", "")) or "DLP readiness" not in str(deferred.get("boundary", "")):
        F.add("USF-RUNTIME-026", "deferredBoundaries.usf-189-scanner-provider-deferred", "remaining scanner deferrals must stay explicit")

    adapter_source = state_text(state, ADAPTER_STORE_SOURCE_PATH)
    for marker in (
        "ClamAvScanProvider",
        "clamscan",
        "localFallback: false",
        "retryClamAvReadiness",
        "bounded-exponential-backoff-180s",
        "safeErrorRedactionChecked",
        "metricEvidenceCaptured",
        "traceEvidenceCaptured",
        "auditEvidenceCaptured",
        "redactionChecked",
        "providerUnavailableChecked",
        "failClosedQuarantineChecked",
        "releaseBoundaryChecked",
        "apiRuntimeUse",
        "workerRuntimeUse",
        "deterministicInMemorySubstituteUse",
    ):
        if marker not in adapter_source:
            F.add("USF-RUNTIME-026", str(ADAPTER_STORE_SOURCE_PATH), f"ClamAV adapter proof marker is missing: {marker}")

    clamav_proof_source = state_text(state, CLAMAV_PROOF_SOURCE_PATH)
    for marker in (
        "runClamAvComposedProof",
        "compose",
        "--profile",
        "scanning",
        "corepack pnpm proof:scanner:clamav",
        "ClamAvScanProvider",
        "composeDown",
        "finally",
        "FORBIDDEN_EVIDENCE_PATTERN",
        "providerUnavailableQuarantined",
        "quarantinedDownloadDenied",
        "cleanDeleteBoundaryChecked",
        "tenantIsolationChecked",
        "no-production-readiness",
        "no-live-provider-readiness",
    ):
        if marker not in clamav_proof_source:
            F.add("USF-RUNTIME-026", str(CLAMAV_PROOF_SOURCE_PATH), f"ClamAV proof source marker is missing: {marker}")

    scripts = state["package"].get("scripts") or {}
    if scripts.get("proof:scanner:clamav") != "tsx packages/proof/src/clamav-composed-proof.ts":
        F.add("USF-RUNTIME-026", "package.json.proof:scanner:clamav", "ClamAV proof package script is missing or stale")
    if state["package"].get("dependencies", {}).get("clamscan") != "2.4.0":
        F.add("USF-RUNTIME-026", "package.json:clamscan", "clamscan must be exact-version pinned to 2.4.0")
    if "scanner-proof-clamav" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-026", "Makefile.scanner-proof-clamav", "ClamAV proof Make target is missing")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in ("until USF-175 closes", "followUpIssue=USF-175", "\"followUpIssue\": \"USF-175\"", "linkedFollowUpIssue=USF-175"):
        if stale in matrix_text:
            F.add("USF-RUNTIME-026", "file-scanner-provider-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_mock_provider_substrate_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("mockProviderSubstrateMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-RUNTIME-027", str(MOCK_PROVIDER_SUBSTRATE_MATRIX_PATH), "mock provider substrate disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-201",
        "predecessorIssue": "USF-176",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-RUNTIME-027", key, f"expected {expected!r}")

    required_services = {"localstack", "wiremock", "webhook-sink", "mock-oidc"}
    if required_services - set(matrix.get("serviceIds", [])):
        F.add("USF-RUNTIME-027", "serviceIds", "mock provider service ids are incomplete")
    required_providers = {
        "provider-emulator-localstack-composed-test",
        "provider-emulator-localstack-deferred",
        "provider-mock-wiremock-composed-test",
        "provider-mock-wiremock-deferred",
        "notification-delivery-webhook-sink-composed-test",
        "notification-delivery-webhook-sink-deferred",
        "identity-mock-oidc-catalogue-boundary",
    }
    if required_providers - set(matrix.get("providerRegistryIds", [])):
        F.add("USF-RUNTIME-027", "providerRegistryIds", "mock provider registry ids are incomplete")
    if MOCK_PROVIDER_SUBSTRATE_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-027", "issueLinks", "mock provider substrate issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-027", "nonClaims", "mock provider substrate non-claims are incomplete")
    if MOCK_PROVIDER_SUBSTRATE_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-027", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if MOCK_PROVIDER_SUBSTRATE_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-027", "readinessClaimsProhibited", "mock provider prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-RUNTIME-027", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-RUNTIME-027", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("mockProviderSubstrateDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition", "mock provider disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "bounded-webhook-sink-wiremock-and-localstack-proof-with-mock-oidc-selected-tier-supersession",
            "localstackServiceSemanticProofPresent": True,
            "wiremockServiceSemanticProofPresent": True,
            "webhookSinkProviderProofPresent": True,
            "mockOidcComposeServiceProofPresent": False,
            "mockOidcRequiredForSelectedClosureTier": False,
            "mockOidcReclassification": "superseded-for-selected-closure-tier",
            "hermeticMockLiveProviderEquivalent": False,
            "wiremockLiveProviderEquivalent": False,
            "localstackLiveCloudProviderEquivalent": False,
            "webhookSinkNotificationDeliveryEquivalent": False,
            "mockProviderCompletenessClaim": False,
            "liveProviderReadinessClaim": False,
            "externalProviderCompatibilityClaim": False,
            "owner": "platform-integration-foundation",
            "riskOwner": "platform-integration-risk-owner",
            "controlOwner": "platform-integration-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-027", f"mockProviderSubstrateDisposition.{key}", f"expected {expected!r}")
        if required_services - set(disposition.get("serviceCatalogueServiceIds", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.serviceCatalogueServiceIds", "service ids are incomplete")
        if required_providers - set(disposition.get("providerRegistryIds", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.providerRegistryIds", "provider ids are incomplete")
        if "USF-208" in set(disposition.get("followUpIssues", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.followUpIssues", "USF-208 must not remain a deferred LocalStack follow-up")
        if "USF-209" in set(disposition.get("followUpIssues", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.followUpIssues", "USF-209 must not remain a deferred WireMock follow-up")
        if "USF-210" in set(disposition.get("followUpIssues", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.followUpIssues", "USF-210 must not remain a deferred mock OIDC follow-up")
        if "USF-208" not in set(disposition.get("resolvedIssues", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.resolvedIssues", "USF-208 LocalStack proof must be recorded as resolved")
        if "USF-209" not in set(disposition.get("resolvedIssues", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.resolvedIssues", "USF-209 WireMock proof must be recorded as resolved")
        if "USF-210" not in set(disposition.get("resolvedIssues", [])):
            F.add("USF-RUNTIME-027", "mockProviderSubstrateDisposition.resolvedIssues", "USF-210 mock OIDC reclassification must be recorded as resolved for the selected tier")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-027", f"mockProviderSubstrateDisposition.{field}", "deferral field is required")

    classifications = {
        item.get("serviceId"): item
        for item in matrix.get("mockSubstrateClassifications", [])
        if isinstance(item, dict) and isinstance(item.get("serviceId"), str)
    }
    required_classifications = {
        "localstack": {
            "providerBindingId": "usf-189-localstack-cloud-mock-provider",
            "providerRegistryId": "provider-emulator-localstack-composed-test",
            "status": "profile-gated-proven",
            "sourceIssue": "USF-208",
            "proofPresent": True,
            "proofCommand": "corepack pnpm proof:localstack",
            "makeTarget": "localstack-proof",
            "sdkPackage": "@aws-sdk/client-s3,@aws-sdk/client-sqs,@aws-sdk/client-sns,@aws-sdk/client-secrets-manager",
            "sdkVersion": "3.1077.0",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/localstack",
        },
        "wiremock": {
            "providerBindingId": "usf-209-wiremock-http-mock-provider",
            "providerRegistryId": "provider-mock-wiremock-composed-test",
            "status": "profile-gated-proven",
            "sourceIssue": "USF-209",
            "proofPresent": True,
            "proofCommand": "corepack pnpm proof:wiremock",
            "makeTarget": "wiremock-proof",
            "sdkPackage": "wiremock-captain",
            "sdkVersion": "4.1.3",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/wiremock",
        },
        "webhook-sink": {
            "providerBindingId": "usf-189-webhook-sink-capture-provider",
            "providerRegistryId": "notification-delivery-webhook-sink-composed-test",
            "status": "implemented-and-proven",
            "sourceIssue": "USF-201",
            "proofPresent": True,
            "proofCommand": "corepack pnpm proof:mock-substrate",
            "makeTarget": "mock-substrate-proof",
            "protocolBoundary": "http-protocol-exception-no-maintained-sdk",
        },
        "mock-oidc": {
            "providerBindingId": "not-runtime-compose-binding",
            "providerRegistryId": "identity-mock-oidc-catalogue-boundary",
            "status": "superseded-with-evidence",
            "sourceIssue": "USF-210",
            "proofPresent": False,
            "serviceProofRequiredForSelectedClosureTier": False,
            "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
        },
    }
    for service_id, expected in required_classifications.items():
        item = classifications.get(service_id)
        if not item:
            F.add("USF-RUNTIME-027", "mockSubstrateClassifications", f"missing {service_id}")
            continue
        for key, expected_value in expected.items():
            if item.get(key) != expected_value:
                F.add("USF-RUNTIME-027", f"mockSubstrateClassifications.{service_id}.{key}", f"expected {expected_value!r}")
        if not item.get("nonEquivalenceBoundary"):
            F.add("USF-RUNTIME-027", f"mockSubstrateClassifications.{service_id}.nonEquivalenceBoundary", "non-equivalence boundary is required")
        if service_id == "webhook-sink" and "not notification delivery" not in str(item.get("nonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-027", f"mockSubstrateClassifications.{service_id}.nonEquivalenceBoundary", "webhook capture proof must preserve delivery non-equivalence")
        if service_id == "wiremock":
            boundary = str(item.get("nonEquivalenceBoundary", ""))
            for marker in (
                "local Compose proof",
                "not live external provider compatibility",
                "provider contract certification",
            ):
                if marker not in boundary:
                    F.add("USF-RUNTIME-027", "mockSubstrateClassifications.wiremock.nonEquivalenceBoundary", f"missing WireMock non-equivalence marker: {marker}")
        if service_id == "mock-oidc":
            if item.get("followUpIssue") is not None:
                F.add("USF-RUNTIME-027", "mockSubstrateClassifications.mock-oidc.followUpIssue", "mock OIDC must not remain deferred to USF-210")
            required_superseding = {
                "packages/proof/src/auth-identity-proof.ts",
                "adapters/idp/src/hermetic-keycloak.ts",
                "adapters/idp/src/index.ts",
                "spec/instances/runtime-proof/runtime-application-compose-parity.json#keycloak-identity-provider",
            }
            if required_superseding - set(item.get("supersedingEvidenceRefs", [])):
                F.add("USF-RUNTIME-027", "mockSubstrateClassifications.mock-oidc.supersedingEvidenceRefs", "mock OIDC superseding evidence refs are incomplete")
            boundary = str(item.get("nonEquivalenceBoundary", ""))
            for marker in ("selected closure tier", "not proof", "live IdP compatibility", "SSO provider readiness"):
                if marker not in boundary:
                    F.add("USF-RUNTIME-027", "mockSubstrateClassifications.mock-oidc.nonEquivalenceBoundary", f"missing mock OIDC non-equivalence marker: {marker}")

    semantic_boundaries = {
        item.get("semanticArea"): item
        for item in matrix.get("semanticProofBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("semanticArea"), str)
    }
    mock_oidc_semantic = semantic_boundaries.get("mock-oidc-service-semantics")
    if not mock_oidc_semantic:
        F.add("USF-RUNTIME-027", "semanticProofBoundaries.mock-oidc-service-semantics", "mock OIDC semantic boundary is missing")
    else:
        if mock_oidc_semantic.get("status") != "superseded-for-selected-closure-tier":
            F.add("USF-RUNTIME-027", "semanticProofBoundaries.mock-oidc-service-semantics.status", "mock OIDC semantic boundary must be selected-tier superseded")
        if mock_oidc_semantic.get("sourceIssue") != "USF-210":
            F.add("USF-RUNTIME-027", "semanticProofBoundaries.mock-oidc-service-semantics.sourceIssue", "mock OIDC semantic boundary must link USF-210")
        if mock_oidc_semantic.get("followUpIssue") is not None:
            F.add("USF-RUNTIME-027", "semanticProofBoundaries.mock-oidc-service-semantics.followUpIssue", "mock OIDC semantic boundary must not leave USF-210 as a follow-up")
        if "service-equivalence proof" not in str(mock_oidc_semantic.get("nonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-027", "semanticProofBoundaries.mock-oidc-service-semantics.nonEquivalenceBoundary", "mock OIDC service-equivalence non-claim is required")

    wiremock_semantic = semantic_boundaries.get("wiremock-http-provider-contract-semantics")
    if not wiremock_semantic:
        F.add("USF-RUNTIME-027", "semanticProofBoundaries.wiremock-http-provider-contract-semantics", "WireMock semantic proof boundary is missing")
    else:
        expected_wiremock_semantic = {
            "status": "implemented-and-proven-for-configured-http-mocks",
            "sourceIssue": "USF-209",
            "proofCommand": "corepack pnpm proof:wiremock",
        }
        for key, expected_value in expected_wiremock_semantic.items():
            if wiremock_semantic.get(key) != expected_value:
                F.add("USF-RUNTIME-027", f"semanticProofBoundaries.wiremock-http-provider-contract-semantics.{key}", f"expected {expected_value!r}")
        boundary = str(wiremock_semantic.get("nonEquivalenceBoundary", ""))
        for marker in ("request matching", "response templating", "negative matching", "request-journal", "not external provider contract certification"):
            if marker not in boundary:
                F.add("USF-RUNTIME-027", "semanticProofBoundaries.wiremock-http-provider-contract-semantics.nonEquivalenceBoundary", f"missing WireMock semantic boundary marker: {marker}")

    substitute = matrix.get("hermeticMockSubstituteBoundary", {})
    if not isinstance(substitute, dict):
        F.add("USF-RUNTIME-027", "hermeticMockSubstituteBoundary", "substitute boundary must be an object")
    else:
        if substitute.get("usedWhereSemanticallyPermitted") is not True:
            F.add("USF-RUNTIME-027", "hermeticMockSubstituteBoundary.usedWhereSemanticallyPermitted", "permitted hermetic mock use must be explicit")
        for key in (
            "liveProviderEquivalent",
            "externalProviderCompatibilityEquivalent",
            "cloudProviderEquivalent",
            "httpProviderContractEquivalent",
            "webhookDeliveryEquivalent",
            "mockOidcServiceEquivalent",
        ):
            if substitute.get(key) is not False:
                F.add("USF-RUNTIME-027", f"hermeticMockSubstituteBoundary.{key}", "hermetic mock evidence must not be live/provider equivalent")
        if "not equivalent to LocalStack" not in str(substitute.get("substitutionNonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-027", "hermeticMockSubstituteBoundary.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        commands = set(substitute.get("commands", []))
        for command in (
            "corepack pnpm proof:providers",
            "corepack pnpm runtime:proof:in-memory",
            "corepack pnpm verify",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-027", "hermeticMockSubstituteBoundary.commands", f"missing {command}")
        if len(substitute.get("scopeCovered", [])) < 4 or len(substitute.get("limits", [])) < 6:
            F.add("USF-RUNTIME-027", "hermeticMockSubstituteBoundary", "substitute scope and limits are incomplete")

    boundaries = {
        item.get("providerBindingId"): item
        for item in matrix.get("providerBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("providerBindingId"), str)
    }
    expected_boundaries = {
        "usf-189-localstack-cloud-mock-provider": {
            "providerRegistryId": "provider-emulator-localstack-composed-test",
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "runtimeProviderBindingActive": False,
            "sdkPackage": "@aws-sdk/client-s3,@aws-sdk/client-sqs,@aws-sdk/client-sns,@aws-sdk/client-secrets-manager",
            "sdkVersion": "3.1077.0",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/localstack",
            "sourceIssue": "USF-208",
            "proofCommand": "corepack pnpm proof:localstack",
            "makeTarget": "localstack-proof",
            "serviceCatalogueServiceId": "localstack",
        },
        "usf-209-wiremock-http-mock-provider": {
            "providerRegistryId": "provider-mock-wiremock-composed-test",
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "runtimeProviderBindingActive": False,
            "sdkPackage": "wiremock-captain",
            "sdkVersion": "4.1.3",
            "sdkBoundary": "adapter-package-only",
            "endpointRef": "endpoint://compose/wiremock",
            "sourceIssue": "USF-209",
            "proofCommand": "corepack pnpm proof:wiremock",
            "makeTarget": "wiremock-proof",
            "serviceCatalogueServiceId": "wiremock",
        },
        "usf-189-webhook-sink-capture-provider": {
            "providerRegistryId": "notification-delivery-webhook-sink-composed-test",
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "runtimeProviderBindingActive": False,
            "sdkPackage": None,
            "sdkVersion": None,
            "sdkBoundary": "adapter-package-only",
            "protocolBoundary": "http-protocol-exception-no-maintained-sdk",
            "endpointRef": "endpoint://compose/webhook-sink",
            "sourceIssue": "USF-201",
            "proofCommand": "corepack pnpm proof:mock-substrate",
            "makeTarget": "mock-substrate-proof",
            "serviceCatalogueServiceId": "webhook-sink",
        },
    }
    for binding_id, expected in expected_boundaries.items():
        item = boundaries.get(binding_id)
        if not item:
            F.add("USF-RUNTIME-027", "providerBoundaries", f"missing {binding_id}")
            continue
        for key, expected_value in expected.items():
            observed = item.get(key)
            if observed is not expected_value if isinstance(expected_value, bool) or expected_value is None else observed != expected_value:
                F.add("USF-RUNTIME-027", f"providerBoundaries.{binding_id}.{key}", f"expected {expected_value!r}")

    operational = matrix.get("operationalEvidencePosture", {})
    if not isinstance(operational, dict):
        F.add("USF-RUNTIME-027", "operationalEvidencePosture", "operational evidence posture must be an object")
    else:
        expected_operational = {
            "readinessRetry": "webhook-sink-wiremock-and-localstack-bounded-exponential-backoff-60s-mock-oidc-not-runtime-binding",
            "timeout": "webhook-sink-request-timeout-5s-wiremock-client-request-timeout-5s-localstack-aws-sdk-request-timeout-5s-unavailable-proof-mock-oidc-not-runtime-binding",
            "failClosed": "webhook-sink-wiremock-and-localstack-provider-unavailable-fails-closed-mock-oidc-not-runtime-binding",
            "noExternalEgress": "webhook-sink-wiremock-and-localstack-loopback-only-proof-mock-oidc-not-runtime-binding",
            "safeTeardown": "webhook-sink-wiremock-and-localstack-compose-down-finally-mock-oidc-not-runtime-binding",
            "structuredLogging": "webhook-sink-wiremock-and-localstack-value-free-structured-evidence",
            "tracingCorrelation": "webhook-sink-wiremock-and-localstack-correlation-and-trace-hash-evidence",
            "metrics": "webhook-sink-wiremock-and-localstack-readiness-retry-latency-fail-closed-health-evidence",
            "auditEvents": "webhook-sink-wiremock-and-localstack-value-free-audit-evidence",
            "redaction": "webhook-sink-wiremock-and-localstack-safe-hashes-no-raw-endpoint-token-secret-stack-or-payload",
            "syntheticData": "webhook-sink-wiremock-and-localstack-synthetic-only-proof-data",
        }
        for key, expected in expected_operational.items():
            if operational.get(key) != expected:
                F.add("USF-RUNTIME-027", f"operationalEvidencePosture.{key}", f"expected {expected!r}")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if MOCK_PROVIDER_SUBSTRATE_REQUIRED_EVIDENCE_REFS - declared_evidence:
        F.add("USF-RUNTIME-027", "enterpriseEvidenceRefs", "mock provider substrate enterprise evidence refs are incomplete")

    bindings = binding_records(state["manifest"])
    localstack_binding = bindings.get("usf-189-localstack-cloud-mock-provider")
    if not localstack_binding:
        F.add(
            "USF-RUNTIME-027",
            "providerBindingMatrix.usf-189-localstack-cloud-mock-provider",
            "runtime manifest must include LocalStack proof provider binding",
        )
    else:
        localstack_expected = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "adapter-package-only",
            "sourceUseDisposition": "runtime-proof-support",
            "endpointRef": "endpoint://compose/localstack",
            "sdkPackage": "@aws-sdk/client-s3,@aws-sdk/client-sqs,@aws-sdk/client-sns,@aws-sdk/client-secrets-manager",
            "sdkVersion": "3.1077.0",
            "proofCommand": "corepack pnpm proof:localstack",
        }
        for key, expected_value in localstack_expected.items():
            if localstack_binding.get(key) != expected_value:
                F.add(
                    "USF-RUNTIME-027",
                    f"providerBindingMatrix.usf-189-localstack-cloud-mock-provider.{key}",
                    f"expected {expected_value!r}",
                )
        for provider_id in ("provider-emulator-localstack-composed-test", "provider-emulator-localstack-deferred"):
            if provider_id not in localstack_binding.get("providerRegistryIds", []):
                F.add(
                    "USF-RUNTIME-027",
                    "providerBindingMatrix.usf-189-localstack-cloud-mock-provider.providerRegistryIds",
                    f"LocalStack binding must link {provider_id}",
                )
        if "USF-208" not in localstack_binding.get("followUpIssueRefs", []):
            F.add(
                "USF-RUNTIME-027",
                "providerBindingMatrix.usf-189-localstack-cloud-mock-provider.followUpIssueRefs",
                "LocalStack binding must link USF-208 source proof issue",
            )
        if "not claimed" not in str(localstack_binding.get("apiProofEvidence", "")) or "not claimed" not in str(localstack_binding.get("workerProofEvidence", "")):
            F.add(
                "USF-RUNTIME-027",
                "providerBindingMatrix.usf-189-localstack-cloud-mock-provider",
                "API and worker runtime binding non-claims must remain explicit",
            )
        proof_evidence = str(localstack_binding.get("proofEvidence", ""))
        for marker in (
            "SDK-backed profile-gated local Compose proof",
            "S3 bucket object write read cleanup",
            "SQS queue send receive cleanup",
            "SNS topic publish cleanup",
            "Secrets Manager secret write read cleanup",
            "readiness retry",
            "unavailable fail-closed",
            "redaction",
            "Compose teardown",
        ):
            if marker not in proof_evidence:
                F.add(
                    "USF-RUNTIME-027",
                    "providerBindingMatrix.usf-189-localstack-cloud-mock-provider.proofEvidence",
                    f"LocalStack proof evidence marker is missing: {marker}",
                )

    wiremock_binding = bindings.get("usf-209-wiremock-http-mock-provider")
    if not wiremock_binding:
        F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-209-wiremock-http-mock-provider", "runtime manifest must include WireMock proof provider binding")
    else:
        wiremock_expected = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "adapter-package-only",
            "sourceUseDisposition": "runtime-proof-support",
            "endpointRef": "endpoint://compose/wiremock",
            "sdkPackage": "wiremock-captain",
            "sdkVersion": "4.1.3",
            "proofCommand": "corepack pnpm proof:wiremock",
        }
        for key, expected_value in wiremock_expected.items():
            if wiremock_binding.get(key) != expected_value:
                F.add("USF-RUNTIME-027", f"providerBindingMatrix.usf-209-wiremock-http-mock-provider.{key}", f"expected {expected_value!r}")
        for provider_id in ("provider-mock-wiremock-composed-test", "provider-mock-wiremock-deferred"):
            if provider_id not in wiremock_binding.get("providerRegistryIds", []):
                F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-209-wiremock-http-mock-provider.providerRegistryIds", f"WireMock binding must link {provider_id}")
        if "USF-209" not in wiremock_binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-209-wiremock-http-mock-provider.followUpIssueRefs", "WireMock binding must link USF-209")
        if "USF-208" not in wiremock_binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-209-wiremock-http-mock-provider.followUpIssueRefs", "WireMock binding must retain LocalStack follow-up linkage")
        if "not live external provider compatibility" not in str(wiremock_binding.get("claimBoundary", "")):
            F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-209-wiremock-http-mock-provider.claimBoundary", "WireMock binding must preserve live-provider non-claim")
        proof_evidence = str(wiremock_binding.get("proofEvidence", ""))
        for marker in (
            "SDK-backed profile-gated local Compose proof",
            "deterministic matching",
            "response templating",
            "negative matching",
            "request-journal evidence",
            "cleanup",
            "unavailable fail-closed",
            "redaction",
            "Compose teardown",
        ):
            if marker not in proof_evidence:
                F.add(
                    "USF-RUNTIME-027",
                    "providerBindingMatrix.usf-209-wiremock-http-mock-provider.proofEvidence",
                    f"WireMock proof evidence marker is missing: {marker}",
                )

    webhook_binding = bindings.get("usf-189-webhook-sink-capture-provider")
    if not webhook_binding:
        F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-189-webhook-sink-capture-provider", "runtime manifest must include webhook sink capture provider binding")
    else:
        webhook_expected = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "adapter-package-only",
            "sourceUseDisposition": "runtime-proof-support",
            "endpointRef": "endpoint://compose/webhook-sink",
            "sdkPackage": None,
            "sdkVersion": None,
            "proofCommand": "corepack pnpm proof:mock-substrate",
        }
        for key, expected_value in webhook_expected.items():
            observed = webhook_binding.get(key)
            if observed is not expected_value if expected_value is None else observed != expected_value:
                F.add("USF-RUNTIME-027", f"providerBindingMatrix.usf-189-webhook-sink-capture-provider.{key}", f"expected {expected_value!r}")
        if "notification-delivery-webhook-sink-composed-test" not in webhook_binding.get("providerRegistryIds", []):
            F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-189-webhook-sink-capture-provider.providerRegistryIds", "webhook binding must link composed-test provider")
        if "notification-delivery-webhook-sink-deferred" not in webhook_binding.get("providerRegistryIds", []):
            F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-189-webhook-sink-capture-provider.providerRegistryIds", "webhook binding must preserve deferred delivery provider boundary")
        if "USF-201" not in webhook_binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-189-webhook-sink-capture-provider.followUpIssueRefs", "webhook binding must link USF-201")
        if "not delivery" not in str(webhook_binding.get("claimBoundary", "")):
            F.add("USF-RUNTIME-027", "providerBindingMatrix.usf-189-webhook-sink-capture-provider.claimBoundary", "webhook binding must preserve delivery non-claim")
        proof_evidence = str(webhook_binding.get("proofEvidence", ""))
        for marker in (
            "bounded readiness retry",
            "synthetic webhook capture",
            "unavailable fail-closed",
            "tears Compose down",
        ):
            if marker not in proof_evidence:
                F.add(
                    "USF-RUNTIME-027",
                    "providerBindingMatrix.usf-189-webhook-sink-capture-provider.proofEvidence",
                    f"webhook proof evidence marker is missing: {marker}",
                )

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-mock-provider-deferred")
    if not deferred or {"USF-153", "USF-201"} - set(deferred.get("followUpIssueRefs", [])):
        F.add("USF-RUNTIME-027", "deferredBoundaries.usf-189-mock-provider-deferred", "runtime deferred boundary must link remaining webhook delivery/callback split follow-ups")
    elif {"USF-208", "USF-209", "USF-210"} & set(deferred.get("followUpIssueRefs", [])):
        F.add("USF-RUNTIME-027", "deferredBoundaries.usf-189-mock-provider-deferred", "runtime deferred boundary must not leave resolved mock substrate proofs as deferred follow-ups")
    if deferred and (
        "USF-208" not in str(deferred.get("boundary", ""))
        or "USF-209" not in str(deferred.get("boundary", ""))
        or "USF-210" not in str(deferred.get("boundary", ""))
        or "superseded" not in str(deferred.get("boundary", ""))
    ):
        F.add("USF-RUNTIME-027", "deferredBoundaries.usf-189-mock-provider-deferred.boundary", "runtime deferred boundary must record USF-210 selected-tier supersession")

    scripts = state["package"].get("scripts") or {}
    if scripts.get("proof:mock-substrate") != "tsx packages/proof/src/mock-provider-substrate-proof.ts":
        F.add("USF-RUNTIME-027", "package.json.proof:mock-substrate", "mock substrate proof package script is missing or stale")
    if "mock-substrate-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-027", "Makefile.mock-substrate-proof", "mock substrate proof Make target is missing")
    if scripts.get("proof:wiremock") != "tsx packages/proof/src/wiremock-composed-proof.ts":
        F.add("USF-RUNTIME-027", "package.json.proof:wiremock", "WireMock proof package script is missing or stale")
    if "wiremock-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-027", "Makefile.wiremock-proof", "WireMock proof Make target is missing")
    if state["package"].get("dependencies", {}).get("wiremock-captain") != "4.1.3":
        F.add("USF-RUNTIME-027", "package.json.wiremock-captain", "wiremock-captain must be exact-version pinned to 4.1.3")
    if scripts.get("proof:localstack") != "tsx packages/proof/src/localstack-composed-proof.ts":
        F.add("USF-RUNTIME-027", "package.json.proof:localstack", "LocalStack proof package script is missing or stale")
    if "localstack-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-027", "Makefile.localstack-proof", "LocalStack proof Make target is missing")
    for package_name in (
        "@aws-sdk/client-s3",
        "@aws-sdk/client-sqs",
        "@aws-sdk/client-sns",
        "@aws-sdk/client-secrets-manager",
    ):
        if state["package"].get("dependencies", {}).get(package_name) != "3.1077.0":
            F.add("USF-RUNTIME-027", f"package.json.{package_name}", f"{package_name} must be exact-version pinned to 3.1077.0")

    adapter_source = state_text(state, ADAPTER_MAIL_SOURCE_PATH)
    for marker in (
        "WebhookSinkCaptureProvider",
        "WEBHOOK_SINK_PROTOCOL_BOUNDARY",
        "WEBHOOK_SINK_ENDPOINT_REF",
        "retryWebhookSinkReadiness",
        "bounded-exponential-backoff-60s",
        "auditEvidenceCaptured",
        "metricEvidenceCaptured",
        "traceEvidenceCaptured",
        "redactionChecked",
        "noExternalEgressChecked",
        "tenantSafeEvidenceChecked",
        "failClosedDenials",
        "remainingDeferredBoundaries",
    ):
        if marker not in adapter_source:
            F.add("USF-RUNTIME-027", str(ADAPTER_MAIL_SOURCE_PATH), f"webhook sink adapter proof marker is missing: {marker}")

    proof_source = state_text(state, MOCK_PROVIDER_PROOF_SOURCE_PATH)
    for marker in (
        "runMockProviderSubstrateProof",
        "WebhookSinkCaptureProvider",
        "compose/compose.test.generated.yaml",
        "composeDown",
        "finally",
        "FORBIDDEN_EVIDENCE_PATTERN",
        "proveUnavailable",
        "providerUnavailableChecked",
        "noExternalEgressChecked",
        "corepack pnpm proof:mock-substrate",
        "USF-208",
        "USF-209",
        "USF-210",
        "supersededServiceIds",
        "resolvedIssueRefs",
        "mock-oidc-service-semantics-superseded-for-selected-closure-tier-by-USF-210",
        "no-live-provider-readiness",
    ):
        if marker not in proof_source:
            F.add("USF-RUNTIME-027", str(MOCK_PROVIDER_PROOF_SOURCE_PATH), f"mock substrate proof marker is missing: {marker}")

    wiremock_adapter_source = state_text(state, ADAPTER_PROVIDER_MOCK_SOURCE_PATH)
    for marker in (
        "WireMockHttpProviderMock",
        "wiremock-captain",
        "WIREMOCK_ENDPOINT_REF",
        "retryWireMockReadiness",
        "bounded-exponential-backoff-60s",
        "deterministicMatchingChecked",
        "responseTemplatingChecked",
        "negativeMatchingChecked",
        "requestJournalChecked",
        "cleanupSucceeded",
        "structuredLogEvidenceCaptured",
        "traceEvidenceCaptured",
        "metricEvidenceCaptured",
        "auditEvidenceCaptured",
        "redactionChecked",
        "noExternalEgressChecked",
        "tenantSafeEvidenceChecked",
    ):
        if marker not in wiremock_adapter_source:
            F.add("USF-RUNTIME-027", str(ADAPTER_PROVIDER_MOCK_SOURCE_PATH), f"WireMock adapter proof marker is missing: {marker}")

    wiremock_proof_source = state_text(state, WIREMOCK_PROOF_SOURCE_PATH)
    for marker in (
        "runWireMockComposedProof",
        "WireMockHttpProviderMock",
        "compose/compose.test.generated.yaml",
        "provider-mocks",
        "composeDown",
        "finally",
        "FORBIDDEN_EVIDENCE_PATTERN",
        "proveUnavailable",
        "providerUnavailableChecked",
        "deterministicMatchingChecked",
        "responseTemplatingChecked",
        "negativeMatchingChecked",
        "requestJournalChecked",
        "cleanupSucceeded",
        "corepack pnpm proof:wiremock",
        "USF-209",
        "USF-208",
        "no-live-provider-readiness",
    ):
        if marker not in wiremock_proof_source:
            F.add("USF-RUNTIME-027", str(WIREMOCK_PROOF_SOURCE_PATH), f"WireMock proof marker is missing: {marker}")

    localstack_adapter_source = state_text(state, ADAPTER_RESOURCES_SOURCE_PATH)
    for marker in (
        "LocalStackCloudEmulatorProofAdapter",
        "@aws-sdk/client-s3",
        "@aws-sdk/client-sqs",
        "@aws-sdk/client-sns",
        "@aws-sdk/client-secrets-manager",
        "LOCALSTACK_ENDPOINT_REF",
        "retryLocalStackReadiness",
        "bounded-exponential-backoff-60s",
        "s3RoundTripChecked",
        "sqsRoundTripChecked",
        "snsPublishChecked",
        "secretsManagerRoundTripChecked",
        "cleanupSucceeded",
        "structuredLogEvidenceCaptured",
        "traceEvidenceCaptured",
        "metricEvidenceCaptured",
        "auditEvidenceCaptured",
        "redactionChecked",
        "noExternalEgressChecked",
        "tenantSafeEvidenceChecked",
        "proveUnavailable",
    ):
        if marker not in localstack_adapter_source:
            F.add("USF-RUNTIME-027", str(ADAPTER_RESOURCES_SOURCE_PATH), f"LocalStack adapter proof marker is missing: {marker}")

    localstack_proof_source = state_text(state, LOCALSTACK_PROOF_SOURCE_PATH)
    for marker in (
        "runLocalStackComposedProof",
        "LocalStackCloudEmulatorProofAdapter",
        "compose/compose.test.generated.yaml",
        "provider-emulation",
        "composeDown",
        "finally",
        "FORBIDDEN_EVIDENCE_PATTERN",
        "proveUnavailable",
        "providerUnavailableChecked",
        "s3RoundTripChecked",
        "sqsRoundTripChecked",
        "snsPublishChecked",
        "secretsManagerRoundTripChecked",
        "cleanupSucceeded",
        "corepack pnpm proof:localstack",
        "USF-208",
        "no-live-provider-readiness",
    ):
        if marker not in localstack_proof_source:
            F.add("USF-RUNTIME-027", str(LOCALSTACK_PROOF_SOURCE_PATH), f"LocalStack proof marker is missing: {marker}")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in (
        "until USF-176 closes",
        "followUpIssue=USF-176",
        "\"followUpIssue\": \"USF-176\"",
        "linkedFollowUpIssue=USF-176",
        "\"followUpIssue\": \"USF-201\"",
        "deferred-to-USF-201",
        "\"webhookSinkProviderProofPresent\": false",
        "\"wiremockServiceSemanticProofPresent\": false",
        "\"localstackServiceSemanticProofPresent\": false",
        "localstack-service-proof-deferred",
        "LocalStack remains deferred",
        "localstack=deferred",
        "localstack-service-semantics-deferred-to-USF-208",
        "\"followUpIssue\": \"USF-208\"",
        "\"followUpIssue\": \"USF-209\"",
        "\"providerBindingId\": \"usf-189-wiremock-http-mock-provider\"",
        "wiremock-service-semantics-deferred-to-USF-209",
        "wiremock=deferred-to-USF-209",
        "\"followUpIssue\": \"USF-210\"",
        "mockOidc=deferred-to-USF-210",
        "mock-oidc-service-semantics-deferred-to-USF-210",
    ):
        if stale in matrix_text:
            F.add("USF-RUNTIME-027", "mock-provider-substrate-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_backup_restore_provider_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("backupRestoreProviderMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-RUNTIME-028", str(BACKUP_RESTORE_PROVIDER_MATRIX_PATH), "backup/restore provider disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-177",
        "followUpIssue": "USF-202",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "serviceId": "pgbackrest",
        "providerRegistryId": "backup-restore-pgbackrest-deferred",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-RUNTIME-028", key, f"expected {expected!r}")

    if BACKUP_RESTORE_PROVIDER_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-028", "issueLinks", "backup/restore provider issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-028", "nonClaims", "backup/restore provider non-claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-028", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if BACKUP_RESTORE_PROVIDER_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-028", "readinessClaimsProhibited", "backup/restore provider prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-RUNTIME-028", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-RUNTIME-028", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("backupRestoreProviderDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-RUNTIME-028", "backupRestoreProviderDisposition", "backup/restore provider disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "explicit-deferral-with-owner",
            "pgbackrestServiceSemanticProofPresent": False,
            "backupArtifactProofPresent": False,
            "restoreDrillProofPresent": False,
            "tenantBoundaryPreservationProofPresent": False,
            "classificationPreservationProofPresent": False,
            "secretExclusionProofPresent": False,
            "auditEvidenceProofPresent": False,
            "retentionProofPresent": False,
            "cleanupProofPresent": False,
            "failureBehaviourProofPresent": False,
            "backupReadinessClaim": False,
            "restoreReadinessClaim": False,
            "disasterRecoveryReadinessClaim": False,
            "rpoRtoReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "serviceCatalogueServiceId": "pgbackrest",
            "providerRegistryId": "backup-restore-pgbackrest-deferred",
            "followUpIssue": "USF-202",
            "owner": "platform-data-foundation",
            "riskOwner": "platform-data-risk-owner",
            "controlOwner": "platform-data-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-028", f"backupRestoreProviderDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-028", f"backupRestoreProviderDisposition.{field}", "deferral field is required")

    provider_boundary = matrix.get("providerBoundary", {})
    if not isinstance(provider_boundary, dict):
        F.add("USF-RUNTIME-028", "providerBoundary", "provider boundary must be an object")
    else:
        expected_provider = {
            "providerBindingId": "usf-189-pgbackrest-backup-provider",
            "providerRegistryId": "backup-restore-pgbackrest-deferred",
            "bindingStatus": "profile-gated",
            "providerMode": "live-external-deferred",
            "runtimeProviderBindingActive": False,
            "sdkPackage": None,
            "sdkVersion": None,
            "endpointRef": None,
            "followUpIssue": "USF-202",
        }
        for key, expected in expected_provider.items():
            observed = provider_boundary.get(key)
            if observed is not expected if isinstance(expected, bool) or expected is None else observed != expected:
                F.add("USF-RUNTIME-028", f"providerBoundary.{key}", f"expected {expected!r}")

    substitute = matrix.get("dbProofSubstituteBoundary", {})
    if not isinstance(substitute, dict):
        F.add("USF-RUNTIME-028", "dbProofSubstituteBoundary", "substitute boundary must be an object")
    else:
        if substitute.get("usedWhereSemanticallyPermitted") is not True:
            F.add("USF-RUNTIME-028", "dbProofSubstituteBoundary.usedWhereSemanticallyPermitted", "permitted DB proof use must be explicit")
        for key in (
            "pgbackrestServiceEquivalent",
            "backupArtifactEquivalent",
            "restoreDrillEquivalent",
            "disasterRecoveryEquivalent",
            "rpoRtoEquivalent",
        ):
            if substitute.get(key) is not False:
                F.add("USF-RUNTIME-028", f"dbProofSubstituteBoundary.{key}", "DB proof evidence must not be backup/restore equivalent")
        if "not equivalent to pgBackRest" not in str(substitute.get("substitutionNonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-028", "dbProofSubstituteBoundary.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        commands = set(substitute.get("commands", []))
        for command in (
            "corepack pnpm proof:db",
            "corepack pnpm proof:files",
            "corepack pnpm verify",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-028", "dbProofSubstituteBoundary.commands", f"missing {command}")
        if len(substitute.get("scopeCovered", [])) < 4 or len(substitute.get("limits", [])) < 7:
            F.add("USF-RUNTIME-028", "dbProofSubstituteBoundary", "substitute scope and limits are incomplete")

    operational = matrix.get("operationalEvidencePosture", {})
    if not isinstance(operational, dict):
        F.add("USF-RUNTIME-028", "operationalEvidencePosture", "operational evidence posture must be an object")
    else:
        expected_operational = {
            "readinessRetry": "deferred-to-USF-202",
            "timeout": "deferred-to-USF-202",
            "failClosed": "bounded-disposition-only",
            "safeTeardown": "deferred-to-USF-202",
            "restoreDrill": "deferred-to-USF-202",
            "rpoRto": "not-claimed-until-USF-202-proof",
        }
        for key, expected in expected_operational.items():
            if operational.get(key) != expected:
                F.add("USF-RUNTIME-028", f"operationalEvidencePosture.{key}", f"expected {expected!r}")
        for field in (
            "structuredLogging",
            "tracingCorrelation",
            "metrics",
            "auditEvents",
            "redaction",
            "retention",
            "secretExclusion",
        ):
            if field not in operational:
                F.add("USF-RUNTIME-028", f"operationalEvidencePosture.{field}", "operational field is required")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if declared_evidence != BACKUP_RESTORE_PROVIDER_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-028", "enterpriseEvidenceRefs", "backup/restore provider enterprise evidence refs are incomplete")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-pgbackrest-backup-provider")
    if not binding:
        F.add("USF-RUNTIME-028", "providerBindingMatrix", "pgBackRest provider disposition is missing from runtime manifest")
    else:
        if "USF-202" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "runtime manifest must link USF-202")
        if "USF-211" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "runtime manifest must link USF-211")
        if binding.get("bindingStatus") == "profile-gated":
            if binding.get("endpointRef") is not None:
                F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "blocked pgBackRest must not expose endpoint binding")
            if binding.get("sdkPackage") is not None or binding.get("sdkVersion") is not None:
                F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "deferred pgBackRest must not name an SDK/client package")
        elif binding.get("bindingStatus") == "profile-gated-proven":
            if binding.get("providerMode") != "composed-test" or binding.get("endpointRef") != "endpoint://compose/pgbackrest":
                F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "resolved pgBackRest binding must be bounded composed-test with redacted endpoint ref")
            if "backup-restore-pgbackrest-composed-test" not in binding.get("providerRegistryIds", []):
                F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "resolved pgBackRest binding must carry composed provider registry id")
            if binding.get("sdkPackage") is not None or binding.get("sdkVersion") is not None:
                F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "pgBackRest CLI proof boundary must not invent SDK package metadata")
        else:
            F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "pgBackRest binding has unexpected status")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-backup-provider-deferred")
    if not deferred or "USF-202" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-028", "deferredBoundaries.usf-189-backup-provider-deferred", "runtime deferred boundary must link USF-202")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in ("until USF-177 closes", "followUpIssue=USF-177", "\"followUpIssue\": \"USF-177\"", "linkedFollowUpIssue=USF-177"):
        if stale in matrix_text:
            F.add("USF-RUNTIME-028", "backup-restore-provider-stale-self-deferral", f"stale self-deferral remains: {stale}")

    blocker = state.get("pgbackrestProofBlockerMatrix")
    if not isinstance(blocker, dict):
        F.add("USF-RUNTIME-028", str(PGBACKREST_PROOF_BLOCKER_MATRIX_PATH), "pgBackRest proof blocker matrix is missing")
        return

    expected_blocker_top = {
        "sourceIssue": "USF-202",
        "predecessorIssue": "USF-177",
        "followUpIssue": "USF-211",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "serviceId": "pgbackrest",
        "providerRegistryId": "backup-restore-pgbackrest-deferred",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_blocker_top.items():
        if blocker.get(key) != expected:
            F.add("USF-RUNTIME-028", f"pgbackrestProofBlocker.{key}", f"expected {expected!r}")

    if PGBACKREST_PROOF_BLOCKER_REQUIRED_ISSUES - set(blocker.get("issueLinks", [])):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.issueLinks", "pgBackRest blocker issue links are incomplete")
    if BACKUP_RESTORE_PROVIDER_PROHIBITED_CLAIMS - set(blocker.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.readinessClaimsProhibited", "pgBackRest blocker prohibited claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(blocker.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.readinessClaimsAllowed", "pgBackRest blocker allows a prohibited readiness claim")
    if not {"backup-readiness", "restore-readiness", "disaster-recovery-readiness", "usf-133-closure"} <= set(
        blocker.get("nonClaims", [])
    ):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.nonClaims", "pgBackRest blocker non-claims are incomplete")

    decision = blocker.get("reclassificationDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted-blocked-reclassification":
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.reclassificationDecision", "blocked reclassification decision is required")
    elif decision.get("decisionIsWorkComplete") is not False or decision.get("blockedFollowUpIssue") != "USF-211":
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.reclassificationDecision", "blocked reclassification must point to USF-211 without claiming work complete")

    blockers = blocker.get("observedBlockers", {})
    if not isinstance(blockers, dict):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.observedBlockers", "observed blockers are required")
    else:
        expected_blockers = {
            "composeServiceGenerated": True,
            "catalogueImage": "woblerr/docker-pgbackrest:alpine",
            "imageReferencePinned": False,
            "repositoryConfigPresent": False,
            "stanzaConfigPresent": False,
            "postgresLinkagePresent": False,
            "mountedPgbackrestConfigPresent": False,
            "mountedBackupRepositoryPresent": False,
            "healthcheckPresent": False,
            "readinessRetryPresent": False,
            "timeoutPolicyPresent": False,
            "safeTeardownBoundaryPresent": False,
        }
        for key, expected in expected_blockers.items():
            observed = blockers.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-028", f"pgbackrestProofBlocker.observedBlockers.{key}", f"expected {expected!r}")
        probe = blockers.get("imagePullProbe", {})
        if not isinstance(probe, dict):
            F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.imagePullProbe", "image pull probe evidence is required")
        elif (
            probe.get("attempted") is not True
            or probe.get("result") != "failed-closed"
            or probe.get("safeFailureCode") != "repository-not-found-or-login-required"
            or probe.get("rawOutputRetained") is not False
            or probe.get("rawEndpointOrCredentialRetained") is not False
        ):
            F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.imagePullProbe", "image pull probe must fail closed without raw output")

    blocker_disposition = blocker.get("backupRestoreProviderDisposition", {})
    if not isinstance(blocker_disposition, dict):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.backupRestoreProviderDisposition", "blocked disposition is required")
    else:
        expected_blocked_disposition = {
            "disposition": "blocked-with-owner-and-follow-up",
            "pgbackrestServiceSemanticProofPresent": False,
            "backupArtifactProofPresent": False,
            "restoreDrillProofPresent": False,
            "tenantBoundaryPreservationProofPresent": False,
            "classificationPreservationProofPresent": False,
            "secretExclusionProofPresent": False,
            "auditEvidenceProofPresent": False,
            "retentionProofPresent": False,
            "cleanupProofPresent": False,
            "failureBehaviourProofPresent": False,
            "timeoutRetryProofPresent": False,
            "backupReadinessClaim": False,
            "restoreReadinessClaim": False,
            "disasterRecoveryReadinessClaim": False,
            "rpoRtoReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "serviceCatalogueServiceId": "pgbackrest",
            "providerRegistryId": "backup-restore-pgbackrest-deferred",
            "owner": "platform-data-foundation",
            "riskOwner": "platform-data-risk-owner",
            "controlOwner": "platform-data-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_blocked_disposition.items():
            observed = blocker_disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-028", f"pgbackrestProofBlocker.backupRestoreProviderDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "blockedEvidence"):
            if blocker_disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-028", f"pgbackrestProofBlocker.backupRestoreProviderDisposition.{field}", "blocked field is required")

    cli_boundary = blocker.get("cliProtocolBoundary", {})
    if not isinstance(cli_boundary, dict):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.cliProtocolBoundary", "CLI/protocol boundary is required")
    elif (
        cli_boundary.get("selectionStatus") != "blocked-until-USF-211"
        or cli_boundary.get("sdkPackage") is not None
        or cli_boundary.get("sdkVersion") is not None
        or cli_boundary.get("cliName") != "pgbackrest"
        or cli_boundary.get("protocolException") is not False
        or "USF-211" not in str(cli_boundary.get("cliBoundaryAllowedOnlyAfter", ""))
        or len(cli_boundary.get("alternativesRejected", [])) < 3
    ):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.cliProtocolBoundary", "CLI boundary must remain blocked with rationale and alternatives")

    operational_blocker = blocker.get("operationalEvidencePosture", {})
    if not isinstance(operational_blocker, dict):
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.operationalEvidencePosture", "blocked operational posture is required")
    else:
        expected_blocked_operational = {
            "readinessRetry": "blocked-until-USF-211-configures-pullable-service",
            "timeout": "blocked-until-USF-211-configures-proof-boundary",
            "failClosed": "USF-202-blocks-readiness-claim",
            "safeTeardown": "blocked-until-USF-211-configures-repository-and-restore-drill",
            "restoreDrill": "blocked-until-USF-211",
            "rpoRto": "not-claimed",
            "redaction": "probe-output-not-retained",
        }
        for key, expected in expected_blocked_operational.items():
            if operational_blocker.get(key) != expected:
                F.add("USF-RUNTIME-028", f"pgbackrestProofBlocker.operationalEvidencePosture.{key}", f"expected {expected!r}")
        for field in ("structuredLogging", "tracingCorrelation", "metrics", "auditEvents", "retention", "secretExclusion"):
            if field not in operational_blocker:
                F.add("USF-RUNTIME-028", f"pgbackrestProofBlocker.operationalEvidencePosture.{field}", "blocked operational field is required")

    blocker_evidence = set(blocker.get("enterpriseEvidenceRefs", []))
    if blocker_evidence != PGBACKREST_PROOF_BLOCKER_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-028", "pgbackrestProofBlocker.enterpriseEvidenceRefs", "pgBackRest blocker enterprise evidence refs are incomplete")

    if binding and "USF-211" not in binding.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "runtime manifest must link USF-211 blocker")
    if deferred and "USF-211" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-028", "deferredBoundaries.usf-189-backup-provider-deferred", "runtime deferred boundary must link USF-211 blocker")


def check_pgbackrest_configured_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("pgbackrestConfiguredProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-032", str(PGBACKREST_CONFIGURED_PROOF_BOUNDARY_PATH), "pgBackRest configured proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-211",
        "followUpIssue": None,
        "sourceDispositionIssue": "USF-177",
        "predecessorIssue": "USF-202",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "status": "profile-gated-bounded-proof-present",
        "serviceCatalogueAuthority": SERVICE_CATALOGUE_PATH,
        "runtimeManifest": str(MANIFEST_PATH),
        "closureMatrix": "docs/architecture/compose-service-disposition-closure-matrix.json",
        "backupRestoreProviderDispositionMatrix": str(BACKUP_RESTORE_PROVIDER_MATRIX_PATH),
        "enterpriseEvidenceModel": "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if boundary.get(key) != expected:
            F.add("USF-RUNTIME-032", key, f"expected {expected!r}")

    if set(boundary.get("serviceIds", [])) != {"pgbackrest", "postgres"}:
        F.add("USF-RUNTIME-032", "serviceIds", "pgBackRest boundary service ids are incomplete")
    if set(boundary.get("providerBindingIds", [])) != {"usf-189-pgbackrest-backup-provider"}:
        F.add("USF-RUNTIME-032", "providerBindingIds", "pgBackRest boundary provider binding ids are incomplete")
    if set(boundary.get("providerRegistryIds", [])) != {"backup-restore-pgbackrest-composed-test", "backup-restore-pgbackrest-deferred"}:
        F.add("USF-RUNTIME-032", "providerRegistryIds", "pgBackRest boundary provider registry ids are incomplete")
    if PGBACKREST_CONFIGURED_PROOF_REQUIRED_ISSUES - set(boundary.get("issueLinks", [])):
        F.add("USF-RUNTIME-032", "issueLinks", "pgBackRest configured proof issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(boundary.get("nonClaims", [])):
        F.add("USF-RUNTIME-032", "nonClaims", "pgBackRest configured proof non-claims are incomplete")
    if BACKUP_RESTORE_PROVIDER_PROHIBITED_CLAIMS - set(boundary.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-032", "readinessClaimsProhibited", "pgBackRest configured proof prohibited claims are incomplete")
    if BACKUP_RESTORE_PROVIDER_PROHIBITED_CLAIMS & set(boundary.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-032", "readinessClaimsAllowed", "pgBackRest configured proof allows a prohibited readiness claim")

    reclassification = boundary.get("reclassification", {})
    if not isinstance(reclassification, dict):
        F.add("USF-RUNTIME-032", "reclassification", "pgBackRest reclassification must be an object")
    else:
        expected_reclassification = {
            "from": "blocked-until-maintained-image-and-configured-repository",
            "to": "profile-gated-bounded-local-compose-proof",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": True,
            "pgbackrestServiceReadinessClaim": False,
            "backupReadinessClaim": False,
            "restoreReadinessClaim": False,
            "disasterRecoveryReadinessClaim": False,
            "rpoRtoReadinessClaim": False,
            "providerCompatibilityClaim": False,
        }
        for key, expected in expected_reclassification.items():
            observed = reclassification.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-032", f"reclassification.{key}", f"expected {expected!r}")
        required_refs = {
            "spec/instances/compose-service/service-catalogue.json#pgbackrest",
            "packages/proof/src/pgbackrest-configured-proof.ts",
            "package.json#proof:backup:pgbackrest",
            "Makefile#pgbackrest-proof",
            "tools/validate-runtime/validate-runtime.py",
        }
        if required_refs - set(reclassification.get("repositoryEvidence", [])):
            F.add("USF-RUNTIME-032", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-RUNTIME-032", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "none-for-USF-211-bounded-proof",
            "owner": "platform-data-foundation",
            "riskOwner": "platform-data-risk-owner",
            "controlOwner": "platform-data-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_remaining.items():
            if remaining.get(key) != expected:
                F.add("USF-RUNTIME-032", f"remainingProofBoundary.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "requiredEvidence"):
            if remaining.get(field) in (None, "", []):
                F.add("USF-RUNTIME-032", f"remainingProofBoundary.{field}", "remaining proof field is required")
        required_remaining = {
            "online backup and WAL archive evidence before any online backup or PITR claim",
            "RPO/RTO and disaster recovery drill proof before any DR readiness claim",
            "API runtime backup-port integration proof before any API pgBackRest runtime-use claim",
            "worker runtime backup-port integration proof before any worker pgBackRest runtime-use claim",
        }
        if required_remaining - set(remaining.get("requiredEvidence", [])):
            F.add("USF-RUNTIME-032", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    backup = boundary.get("backupRestoreBoundary", {})
    expected_backup = {
        "imageSelectionStatus": "maintained-image-selected-and-digest-pinned",
        "repositoryConfigStatus": "local-repository-configured-by-USF-211",
        "stanzaStatus": "stanza-created-by-USF-211",
        "postgresLinkageStatus": "postgres-data-and-local-socket-linkage-proven-by-USF-211",
        "backupArtifactStatus": "offline-cold-full-backup-created-by-USF-211",
        "restoreDrillStatus": "restore-readback-proven-by-USF-211",
        "secretExclusionStatus": "proof-output-redaction-and-no-real-secret-boundary-proven-by-USF-211",
        "auditEvidenceStatus": "value-free-audit-shaped-evidence-proven-by-USF-211",
        "readinessRetryStatus": "bounded-postgres-healthcheck-and-pgbackrest-version-retry-proven-by-USF-211",
        "timeoutStatus": "bounded-process-timeouts-proven-by-USF-211",
        "teardownCleanupStatus": "restore-container-compose-volume-and-temp-dir-cleanup-proven-by-USF-211",
        "providerFailureHandlingStatus": "missing-repository-fail-closed-proven-by-USF-211",
    }
    for field, expected in expected_backup.items():
        if backup.get(field) != expected:
            F.add("USF-RUNTIME-032", f"backupRestoreBoundary.{field}", f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not backup.get(field):
            F.add("USF-RUNTIME-032", f"backupRestoreBoundary.{field}", "backup boundary owner metadata is required")

    cli = boundary.get("cliProviderBoundary", {})
    expected_cli = {
        "selectionStatus": "official-cli-selected-and-pinned-image-boundary",
        "cliName": "pgbackrest",
        "cliVersion": "2.58.0",
        "sdkPackage": None,
        "sdkVersion": None,
        "protocolException": True,
    }
    for field, expected in expected_cli.items():
        observed = cli.get(field)
        if observed is not expected if isinstance(expected, bool) or expected is None else observed != expected:
            F.add("USF-RUNTIME-032", f"cliProviderBoundary.{field}", f"expected {expected!r}")
    if "@sha256:" not in str(cli.get("imageRef", "")):
        F.add("USF-RUNTIME-032", "cliProviderBoundary.imageRef", "pgBackRest image must be digest-pinned")
    if "official pgbackrest CLI" not in str(cli.get("selectionRationale", "")):
        F.add("USF-RUNTIME-032", "cliProviderBoundary.selectionRationale", "pgBackRest CLI rationale must name official CLI")
    for field in ("secretBoundary", "supplierBoundary", "forbiddenLayerImports"):
        if not cli.get(field):
            F.add("USF-RUNTIME-032", f"cliProviderBoundary.{field}", "CLI/provider boundary field is required")

    substitute = boundary.get("nonEquivalentSubstituteGate", {})
    if substitute.get("repositoryValidationRequired") is not True:
        F.add("USF-RUNTIME-032", "nonEquivalentSubstituteGate.repositoryValidationRequired", "repository validation must remain required")
    for field in ("dbProofEquivalentToPgBackRest", "filesProofEquivalentToPgBackRest"):
        if substitute.get(field) is not False:
            F.add("USF-RUNTIME-032", f"nonEquivalentSubstituteGate.{field}", "substitute proof must not be pgBackRest equivalent")
    if not substitute.get("substitutionNonEquivalenceBoundary"):
        F.add("USF-RUNTIME-032", "nonEquivalentSubstituteGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
    commands = set(substitute.get("commands", []))
    for command in (
        "corepack pnpm proof:backup:pgbackrest",
        "corepack pnpm compose:check-generated",
        "python3 tools/validate-runtime/validate-runtime.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    ):
        if command not in commands:
            F.add("USF-RUNTIME-032", "nonEquivalentSubstituteGate.commands", f"missing {command}")

    declared_evidence = set(boundary.get("enterpriseEvidenceRefs", []))
    if declared_evidence != PGBACKREST_CONFIGURED_PROOF_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-032", "enterpriseEvidenceRefs", "pgBackRest configured proof enterprise evidence refs are incomplete")

    package = state["package"]
    scripts = package.get("scripts") if isinstance(package.get("scripts"), dict) else {}
    if scripts.get("proof:backup:pgbackrest") != "tsx packages/proof/src/pgbackrest-configured-proof.ts":
        F.add("USF-RUNTIME-032", "package.json#proof:backup:pgbackrest", "pgBackRest proof package script is missing or stale")
    if "pgbackrest-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-032", "Makefile#pgbackrest-proof", "pgBackRest proof Make target is missing")

    service_catalogue = state.get("serviceCatalogue", {})
    services = service_catalogue.get("services", []) if isinstance(service_catalogue, dict) else []
    pgbackrest = next((service for service in services if isinstance(service, dict) and service.get("serviceId") == "pgbackrest"), None)
    if not isinstance(pgbackrest, dict):
        F.add("USF-RUNTIME-032", SERVICE_CATALOGUE_PATH, "pgBackRest service catalogue row is missing")
    else:
        compose_service = pgbackrest.get("composeService", {})
        if compose_service.get("image") != "woblerr/pgbackrest:2.58.0@sha256:18cdff011e974308510d056b4039d9b4d21ec33d9124879882c6f05e99be2ab9":
            F.add("USF-RUNTIME-032", "serviceCatalogue.pgbackrest.composeService.image", "pgBackRest image must be maintained version and digest-pinned")
        if set(compose_service.get("profiles", [])) != {"backup-restore"}:
            F.add("USF-RUNTIME-032", "serviceCatalogue.pgbackrest.composeService.profiles", "pgBackRest compose profile must be backup-restore")
        if "postgres-data:/var/lib/postgresql/data:ro" not in compose_service.get("volumes", []):
            F.add("USF-RUNTIME-032", "serviceCatalogue.pgbackrest.composeService.volumes", "pgBackRest must mount Postgres data read-only")
        if not any(dep.get("serviceName") == "postgres" for dep in compose_service.get("dependsOn", []) if isinstance(dep, dict)):
            F.add("USF-RUNTIME-032", "serviceCatalogue.pgbackrest.composeService.dependsOn", "pgBackRest must depend on Postgres")
        healthcheck_text = json.dumps(compose_service.get("healthcheck"), sort_keys=True)
        if "pgbackrest version" not in healthcheck_text:
            F.add("USF-RUNTIME-032", "serviceCatalogue.pgbackrest.composeService.healthcheck", "pgBackRest version healthcheck is required")
        volume_names = {volume.get("composeVolumeName") for volume in pgbackrest.get("volumes", []) if isinstance(volume, dict)}
        if {"pgbackrest-repo", "pgbackrest-restore"} - volume_names:
            F.add("USF-RUNTIME-032", "serviceCatalogue.pgbackrest.volumes", "pgBackRest repository and restore volumes are required")

    provider_source = state_text(state, PROVIDER_REGISTRY_SOURCE_PATH)
    if "backup-restore-pgbackrest-composed-test" not in provider_source or "pgBackRest CLI proof boundary" not in provider_source:
        F.add("USF-RUNTIME-032", str(PROVIDER_REGISTRY_SOURCE_PATH), "pgBackRest composed provider registry entry is missing")

    proof_source = state_text(state, PGBACKREST_PROOF_SOURCE_PATH)
    proof_markers = (
        "compose/compose.test.generated.yaml",
        "backup-restore",
        "woblerr/pgbackrest:2.58.0@sha256:",
        "--no-online",
        "--force",
        "stanza-create",
        "restore",
        "pg_isready",
        "chown -R 70:70",
        "proveFailClosed",
        "assertSafeEvidence",
        "docker",
        "down",
        "--remove-orphans",
        "-v",
    )
    for marker in proof_markers:
        if marker not in proof_source:
            F.add("USF-RUNTIME-032", str(PGBACKREST_PROOF_SOURCE_PATH), f"pgBackRest proof source missing marker: {marker}")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-pgbackrest-backup-provider")
    if not binding:
        F.add("USF-RUNTIME-032", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "runtime manifest must include pgBackRest provider binding")
    else:
        expected_binding = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "official-cli-proof-boundary",
            "sourceUseDisposition": "runtime-proof-support",
            "adapterName": "pgBackRest CLI proof boundary",
            "portName": "BackupRestoreProvider",
            "endpointRef": "endpoint://compose/pgbackrest",
            "sdkPackage": None,
            "sdkVersion": None,
            "proofCommand": "corepack pnpm proof:backup:pgbackrest",
        }
        for field, expected in expected_binding.items():
            observed = binding.get(field)
            if observed is not expected if expected is None else observed != expected:
                F.add("USF-RUNTIME-032", f"providerBindingMatrix.usf-189-pgbackrest-backup-provider.{field}", f"expected {expected!r}")
        if set(binding.get("providerRegistryIds", [])) != {"backup-restore-pgbackrest-composed-test", "backup-restore-pgbackrest-deferred"}:
            F.add("USF-RUNTIME-032", "providerBindingMatrix.usf-189-pgbackrest-backup-provider.providerRegistryIds", "pgBackRest binding must carry composed and deferred provider registry ids")
        if "USF-211" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-032", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "runtime manifest must link USF-211")
        if "USF-211" not in str(binding.get("proofEvidence", "")):
            F.add("USF-RUNTIME-032", "providerBindingMatrix.usf-189-pgbackrest-backup-provider.proofEvidence", "runtime manifest must record USF-211 proof evidence")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-backup-provider-deferred")
    if not deferred or "USF-211" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-032", "deferredBoundaries.usf-189-backup-provider-deferred", "runtime deferred boundary must link USF-211 lineage")
    if deferred and "USF-211 resolves only the bounded profile-gated local Compose cold backup/restore proof" not in str(deferred.get("boundary", "")):
        F.add("USF-RUNTIME-032", "deferredBoundaries.usf-189-backup-provider-deferred", "runtime deferred boundary must distinguish resolved local proof from remaining readiness boundaries")


def check_backup_restore_operational_depth(F: Findings, state: dict[str, Any]) -> None:
    depth = state.get("backupRestoreOperationalDepth")
    if not isinstance(depth, dict):
        F.add("USF-RUNTIME-034", str(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH), "USF-219 backup restore operational depth artefact is missing")
        return

    expected_top = {
        "sourceIssue": "USF-219",
        "followUpIssue": "USF-223",
        "parentIssue": "USF-133",
        "status": "bounded-disposition-recorded-execution-proof-deferred",
        "serviceCatalogueAuthority": SERVICE_CATALOGUE_PATH,
        "runtimeManifest": str(MANIFEST_PATH),
        "pgbackrestConfiguredProofBoundary": str(PGBACKREST_CONFIGURED_PROOF_BOUNDARY_PATH),
        "backupRestoreProviderDispositionMatrix": str(BACKUP_RESTORE_PROVIDER_MATRIX_PATH),
        "enterpriseEvidenceModel": "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json",
    }
    for key, expected in expected_top.items():
        if depth.get(key) != expected:
            F.add("USF-RUNTIME-034", key, f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not depth.get(field):
            F.add("USF-RUNTIME-034", field, "owner, risk, control, and review metadata are required")
    if BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_ISSUES - set(depth.get("issueLinks", [])):
        F.add("USF-RUNTIME-034", "issueLinks", "USF-219 issue links are incomplete")
    if BACKUP_RESTORE_PROVIDER_PROHIBITED_CLAIMS - set(depth.get("nonClaims", [])):
        F.add("USF-RUNTIME-034", "nonClaims", "backup/restore operational depth non-claims are incomplete")
    if set(depth.get("enterpriseEvidenceRefs", [])) != BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-034", "enterpriseEvidenceRefs", "USF-219 enterprise evidence refs are incomplete")
    commands = set(depth.get("validationCommands", []))
    for command in (
        "corepack pnpm proof:backup:pgbackrest",
        "python3 tools/validate-runtime/validate-runtime.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
        "python3 tools/validate-parity/validate-parity.py all --json",
    ):
        if command not in commands:
            F.add("USF-RUNTIME-034", "validationCommands", f"missing {command}")

    claims = depth.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-RUNTIME-034", "claims", "claims must be an object")
        claims = {}
    for key in (
        "boundedDispositionRecorded",
        "pgbackrestColdBackupRestoreProofAccepted",
        "operationalBackupDepthExplicitlyDeferred",
        "dataBearingPromotionImpactRecorded",
    ):
        if claims.get(key) is not True:
            F.add("USF-RUNTIME-034", f"claims.{key}", "bounded disposition marker must be true")
    for key in (
        "backupReadinessClaim",
        "restoreReadinessClaim",
        "disasterRecoveryReadinessClaim",
        "pitrReadinessClaim",
        "onlineBackupReadinessClaim",
        "scheduledBackupReadinessClaim",
        "rpoRtoReadinessClaim",
        "testReadinessClaim",
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "deploymentReadinessClaim",
        "liveProviderReadinessClaim",
        "socReadinessClaim",
        "iso27001CertificationClaim",
        "enterpriseProductionReadinessClaim",
        "fullDevReadinessClaim",
        "fullProductReadinessClaim",
        "usf133ClosureClaim",
    ):
        if claims.get(key) is not False:
            F.add("USF-RUNTIME-034", f"claims.{key}", "readiness or closure claim must remain false")

    boundaries = depth.get("boundaries", [])
    if not isinstance(boundaries, list):
        F.add("USF-RUNTIME-034", "boundaries", "boundaries must be a list")
        boundaries = []
    boundary_rows = {row.get("id"): row for row in boundaries if isinstance(row, dict)}
    missing_boundaries = BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_BOUNDARIES - set(boundary_rows)
    if missing_boundaries:
        F.add("USF-RUNTIME-034", "boundaries", f"missing boundaries: {sorted(missing_boundaries)}")
    proven = boundary_rows.get("pgbackrest-cold-backup-restore-local-proof", {})
    if proven.get("status") != "proven-local" or "USF-211" not in str(proven.get("sourceIssue", "")):
        F.add("USF-RUNTIME-034", "pgbackrest-cold-backup-restore-local-proof", "USF-211 bounded local proof must be explicitly accepted")
    for field in ("proofCommand", "validationCommand", "evidenceRefs", "nonEquivalenceBoundary", "nonClaimBoundary"):
        if not proven.get(field):
            F.add("USF-RUNTIME-034", f"pgbackrest-cold-backup-restore-local-proof.{field}", "proven local boundary field is required")
    for boundary_id, row in boundary_rows.items():
        if boundary_id == "pgbackrest-cold-backup-restore-local-proof":
            continue
        if row.get("status") != "deferred-with-owner":
            F.add("USF-RUNTIME-034", boundary_id, "stronger operational boundary must remain deferred with owner")
            continue
        for field in (
            "owner",
            "riskOwner",
            "controlOwner",
            "riskTreatment",
            "followUpIssue",
            "reviewDate",
            "promotionImpact",
            "requiredEvidence",
            "nonClaimBoundary",
        ):
            if not row.get(field):
                F.add("USF-RUNTIME-034", f"{boundary_id}.{field}", "deferred operational boundary field is required")
        if row.get("followUpIssue") != "USF-223":
            F.add("USF-RUNTIME-034", f"{boundary_id}.followUpIssue", "operational execution proof must defer to USF-223")

    dispositions = {
        row.get("serviceId"): row
        for row in depth.get("dataBearingServiceDispositions", [])
        if isinstance(row, dict) and isinstance(row.get("serviceId"), str)
    }
    missing_services = BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_DATA_SERVICES - set(dispositions)
    if missing_services:
        F.add("USF-RUNTIME-034", "dataBearingServiceDispositions", f"missing data-bearing service rows: {sorted(missing_services)}")
    for service_id, row in dispositions.items():
        for field in (
            "dataClassification",
            "tenantBoundary",
            "backupRestorePosture",
            "retentionPosture",
            "failureImpact",
            "promotionImpact",
            "owner",
            "riskOwner",
            "controlOwner",
            "reviewDate",
            "nonClaimBoundary",
        ):
            if not row.get(field):
                F.add("USF-RUNTIME-034", f"dataBearingServiceDispositions.{service_id}.{field}", "data-bearing promotion impact field is required")
        if row.get("backupRestorePosture") in {"environment-backup-required", "local-reset-only", "restore-proof-required", "deferred"} and row.get("followUpIssue") != "USF-223":
            F.add("USF-RUNTIME-034", f"dataBearingServiceDispositions.{service_id}.followUpIssue", "backup-relevant data service must link USF-223")

    text = json.dumps(depth, sort_keys=True).lower()
    for phrase in (
        "backup readiness is proven",
        "restore readiness is proven",
        "disaster recovery readiness is proven",
        "pitr readiness is proven",
        "rpo readiness is proven",
        "rto readiness is proven",
        "production readiness is proven",
        "live-provider readiness is proven",
        "usf-133 closure is proven",
    ):
        if phrase in text:
            F.add("USF-RUNTIME-034", str(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH), f"readiness overclaim present: {phrase}")


def check_backup_restore_execution_proof(F: Findings, state: dict[str, Any]) -> None:
    proof = state.get("backupRestoreExecutionProof")
    if not isinstance(proof, dict):
        F.add("USF-RUNTIME-035", str(BACKUP_RESTORE_EXECUTION_PROOF_PATH), "USF-223 backup restore execution proof artefact is missing")
        return

    expected_top = {
        "sourceIssue": "USF-223",
        "parentIssue": "USF-133",
        "status": "bounded-local-execution-proof-present",
        "serviceCatalogueAuthority": SERVICE_CATALOGUE_PATH,
        "runtimeManifest": str(MANIFEST_PATH),
        "usf219DispositionGate": str(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH),
        "pgbackrestConfiguredProofBoundary": str(PGBACKREST_CONFIGURED_PROOF_BOUNDARY_PATH),
        "enterpriseEvidenceModel": "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json",
        "proofCommand": "corepack pnpm proof:backup:operations",
        "proofSource": str(BACKUP_RESTORE_OPERATIONS_PROOF_SOURCE_PATH),
        "makeTarget": "backup-operations-proof",
    }
    for key, expected in expected_top.items():
        if proof.get(key) != expected:
            F.add("USF-RUNTIME-035", key, f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not proof.get(field):
            F.add("USF-RUNTIME-035", field, "owner, risk, control, treatment, and review metadata are required")
    if BACKUP_RESTORE_EXECUTION_REQUIRED_ISSUES - set(proof.get("issueLinks", [])):
        F.add("USF-RUNTIME-035", "issueLinks", "USF-223 issue links are incomplete")
    if set(proof.get("enterpriseEvidenceRefs", [])) != BACKUP_RESTORE_EXECUTION_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-035", "enterpriseEvidenceRefs", "USF-223 enterprise evidence refs are incomplete")
    if BACKUP_RESTORE_PROVIDER_PROHIBITED_CLAIMS - set(proof.get("nonClaims", [])):
        F.add("USF-RUNTIME-035", "nonClaims", "USF-223 backup/restore execution non-claims are incomplete")

    commands = set(proof.get("validationCommands", []))
    for command in (
        "corepack pnpm proof:backup:operations",
        "corepack pnpm proof:backup:pgbackrest",
        "python3 tools/validate-runtime/validate-runtime.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
        "python3 tools/validate-parity/validate-parity.py all --json",
    ):
        if command not in commands:
            F.add("USF-RUNTIME-035", "validationCommands", f"missing {command}")

    claims = proof.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-RUNTIME-035", "claims", "claims must be an object")
        claims = {}
    for key in (
        "boundedLocalExecutionProofPresent",
        "onlineBackupExecuted",
        "walArchiveObserved",
        "pitrRestoreExecuted",
        "scheduledBackupOperationExecuted",
        "sourceFailureScenarioExecuted",
        "drRehearsalExecuted",
        "rpoObservationCaptured",
        "rtoObservationCaptured",
    ):
        if claims.get(key) is not True:
            F.add("USF-RUNTIME-035", f"claims.{key}", "bounded local execution marker must be true")
    for key in (
        "backupReadinessClaim",
        "restoreReadinessClaim",
        "disasterRecoveryReadinessClaim",
        "pitrReadinessClaim",
        "onlineBackupReadinessClaim",
        "scheduledBackupReadinessClaim",
        "rpoRtoReadinessClaim",
        "testReadinessClaim",
        "stagingReadinessClaim",
        "productionReadinessClaim",
        "deploymentReadinessClaim",
        "liveProviderReadinessClaim",
        "providerManagedBackupClaim",
        "socReadinessClaim",
        "iso27001CertificationClaim",
        "enterpriseProductionReadinessClaim",
        "fullDevReadinessClaim",
        "fullProductReadinessClaim",
        "usf133ClosureClaim",
    ):
        if claims.get(key) is not False:
            F.add("USF-RUNTIME-035", f"claims.{key}", "readiness or closure claim must remain false")

    boundary_rows = {
        row.get("id"): row
        for row in proof.get("executionProofBoundaries", [])
        if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    missing_boundaries = BACKUP_RESTORE_EXECUTION_REQUIRED_BOUNDARIES - set(boundary_rows)
    if missing_boundaries:
        F.add("USF-RUNTIME-035", "executionProofBoundaries", f"missing boundaries: {sorted(missing_boundaries)}")
    for boundary_id, row in boundary_rows.items():
        if row.get("status") != "proven-local" or row.get("sourceIssue") != "USF-223":
            F.add("USF-RUNTIME-035", boundary_id, "execution boundary must be proven-local by USF-223")
        for field in ("proofCommand", "evidenceSource", "serviceCatalogueRows", "whatIsProven", "whatIsNotProven", "nonEquivalenceBoundary"):
            if not row.get(field):
                F.add("USF-RUNTIME-035", f"{boundary_id}.{field}", "execution boundary field is required")
        if "readiness" not in str(row.get("whatIsNotProven", "")).lower():
            F.add("USF-RUNTIME-035", f"{boundary_id}.whatIsNotProven", "negative evidence must preserve readiness non-claim")

    deferred_rows = {
        row.get("id"): row
        for row in proof.get("remainingDeferredBoundaries", [])
        if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    missing_deferred = BACKUP_RESTORE_EXECUTION_REQUIRED_DEFERRED_BOUNDARIES - set(deferred_rows)
    if missing_deferred:
        F.add("USF-RUNTIME-035", "remainingDeferredBoundaries", f"missing deferred boundaries: {sorted(missing_deferred)}")
    for boundary_id, row in deferred_rows.items():
        if row.get("status") != "deferred-with-owner":
            F.add("USF-RUNTIME-035", boundary_id, "remaining boundary must remain deferred with owner")
        for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate", "promotionImpact", "followUpIssue", "nonClaimBoundary"):
            if not row.get(field):
                F.add("USF-RUNTIME-035", f"{boundary_id}.{field}", "deferred boundary field is required")

    operational = proof.get("operationalEvidence", {})
    if not isinstance(operational, dict):
        F.add("USF-RUNTIME-035", "operationalEvidence", "operational evidence must be an object")
        operational = {}
    for field in (
        "readinessChecks",
        "retryTimeoutBehaviour",
        "failClosedMode",
        "safeTeardown",
        "structuredLogging",
        "tracingCorrelation",
        "metrics",
        "auditEvents",
        "redaction",
    ):
        if not operational.get(field):
            F.add("USF-RUNTIME-035", f"operationalEvidence.{field}", "operational evidence field is required")

    scripts = state["package"].get("scripts", {})
    if scripts.get("proof:backup:operations") != "tsx packages/proof/src/backup-restore-operations-execution-proof.ts":
        F.add("USF-RUNTIME-035", "package.json#proof:backup:operations", "backup operations proof package script is missing or stale")
    if "proof:backup:operations" not in str(scripts.get("verify", "")):
        F.add("USF-RUNTIME-035", "package.json#verify", "verify must run the backup operations proof")
    if "backup-operations-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-035", "Makefile#backup-operations-proof", "backup operations proof Make target is missing")

    proof_source = state_text(state, BACKUP_RESTORE_OPERATIONS_PROOF_SOURCE_PATH)
    for marker in (
        "runBackupRestoreOperationsExecutionProof",
        "onlineBackupExecuted",
        "walArchiveObserved",
        "pitrRestoreExecuted",
        "scheduledBackupOperationExecuted",
        "drRehearsalExecuted",
        "rpoObservationBoundary",
        "rtoObservationBoundary",
        "providerManagedBackupClaim: false",
        "failClosedReasonCode",
        "assertSafeEvidence",
        "composeDown",
        "finally",
        "FORBIDDEN_EVIDENCE_PATTERN",
    ):
        if marker not in proof_source:
            F.add("USF-RUNTIME-035", str(BACKUP_RESTORE_OPERATIONS_PROOF_SOURCE_PATH), f"proof source missing marker: {marker}")

    text = json.dumps(proof, sort_keys=True).lower()
    for phrase in (
        "backup readiness is proven",
        "restore readiness is proven",
        "disaster recovery readiness is proven",
        "pitr readiness is proven",
        "rpo readiness is proven",
        "rto readiness is proven",
        "production readiness is proven",
        "live-provider readiness is proven",
        "usf-133 closure is proven",
    ):
        if phrase in text:
            F.add("USF-RUNTIME-035", str(BACKUP_RESTORE_EXECUTION_PROOF_PATH), f"readiness overclaim present: {phrase}")


def check_windmill_configured_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("windmillConfiguredProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-033", str(WINDMILL_CONFIGURED_PROOF_BOUNDARY_PATH), "Windmill configured proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-212",
        "followUpIssue": None,
        "sourceDispositionIssue": "USF-178",
        "predecessorIssue": "USF-203",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "status": "profile-gated-bounded-proof-present",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
        "proofCommand": "corepack pnpm proof:workflow:windmill",
    }
    for key, expected in expected_top.items():
        observed = boundary.get(key)
        if observed is not expected if expected is None else observed != expected:
            F.add("USF-RUNTIME-033", key, f"expected {expected!r}")

    expected_service_ids = {"windmill", "windmill-worker", "windmill-postgres", "windmill-redis"}
    if set(boundary.get("serviceIds", [])) != expected_service_ids:
        F.add("USF-RUNTIME-033", "serviceIds", "Windmill configured proof service ids are incomplete")
    if WINDMILL_CONFIGURED_PROOF_REQUIRED_ISSUES - set(boundary.get("issueLinks", [])):
        F.add("USF-RUNTIME-033", "issueLinks", "Windmill configured proof issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(boundary.get("nonClaims", [])):
        F.add("USF-RUNTIME-033", "nonClaims", "Windmill configured proof non-claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(boundary.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-033", "readinessClaimsAllowed", "Windmill configured proof allows a prohibited readiness claim")
    if OPERATOR_WORKFLOW_PROVIDER_PROHIBITED_CLAIMS - set(boundary.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-033", "readinessClaimsProhibited", "Windmill configured proof prohibited claims are incomplete")

    reclassification = boundary.get("reclassification", {})
    if not isinstance(reclassification, dict):
        F.add("USF-RUNTIME-033", "reclassification", "Windmill reclassification must be an object")
    else:
        expected_reclassification = {
            "from": "blocked-until-USF-212",
            "to": "profile-gated-bounded-local-compose-proof",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": True,
            "windmillServiceReadinessClaim": False,
            "operatorAutomationReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "apiRuntimeBindingClaim": False,
            "workerRuntimeBindingClaim": False,
        }
        for key, expected in expected_reclassification.items():
            observed = reclassification.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-033", f"reclassification.{key}", f"expected {expected!r}")
        required_refs = {
            "spec/instances/compose-service/service-catalogue.json#windmill",
            "compose/compose.test.generated.yaml#windmill",
            "packages/proof/src/windmill-configured-proof.ts",
            "package.json#proof:workflow:windmill",
            "Makefile#windmill-workflow-proof",
            "docs/architecture/windmill-configured-proof-boundary.json",
            "tools/validate-runtime/validate-runtime.py",
        }
        if required_refs - set(reclassification.get("repositoryEvidence", [])):
            F.add("USF-RUNTIME-033", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-RUNTIME-033", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "none-for-USF-212-bounded-proof",
            "owner": "platform-workflow-foundation",
            "riskOwner": "platform-workflow-risk-owner",
            "controlOwner": "platform-workflow-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_remaining.items():
            if remaining.get(key) != expected:
                F.add("USF-RUNTIME-033", f"remainingProofBoundary.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "requiredEvidence"):
            if remaining.get(field) in (None, "", []):
                F.add("USF-RUNTIME-033", f"remainingProofBoundary.{field}", "remaining proof field is required")
        required_remaining = {
            "API runtime Windmill port integration proof before any API runtime-use claim",
            "worker runtime Windmill port integration proof before any USF worker runtime-use claim",
            "full operator approval workflow proof before any operator automation readiness claim",
        }
        if required_remaining - set(remaining.get("requiredEvidence", [])):
            F.add("USF-RUNTIME-033", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    local = boundary.get("localComposeBoundary", {})
    expected_local = {
        "imageSelectionStatus": "service-catalogue-digest-pinned",
        "serverModeStatus": "MODE=server-generated-by-service-catalogue",
        "workerModeStatus": "MODE=worker-generated-by-service-catalogue",
        "postgresReadinessStatus": "service_healthy-pg-isready-generated",
        "redisReadinessStatus": "service_healthy-redis-cli-ping-generated",
        "serverReadinessStatus": "loopback-version-healthcheck-and-SDK-health-status-proven",
        "workerReadinessStatus": "SDK-health-workers-alive-proven",
        "hostExposure": "preselected-fetch-safe-ephemeral-loopback-port-in-proof; generated fixed port remains loopback-only",
        "dataBoundary": "synthetic-workspace-only",
        "secretBoundary": "local-superadmin-placeholder-reference-redacted",
        "teardownCleanupStatus": "compose-down-volume-removal-and-temp-override-removal-proven-by-USF-212",
    }
    for field, expected in expected_local.items():
        if local.get(field) != expected:
            F.add("USF-RUNTIME-033", f"localComposeBoundary.{field}", f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not local.get(field):
            F.add("USF-RUNTIME-033", f"localComposeBoundary.{field}", "local Compose owner metadata is required")

    sdk = boundary.get("sdkClientBoundary", {})
    expected_sdk = {
        "selectionStatus": "official-sdk-selected-and-pinned",
        "sdkPackage": "windmill-client",
        "sdkVersion": "1.743.0",
        "sdkBoundary": "proof-provider-integration-boundary",
        "approvedImportBoundary": str(WINDMILL_PROOF_SOURCE_PATH),
        "protocolException": False,
    }
    for field, expected in expected_sdk.items():
        observed = sdk.get(field)
        if observed is not expected if isinstance(expected, bool) else observed != expected:
            F.add("USF-RUNTIME-033", f"sdkClientBoundary.{field}", f"expected {expected!r}")
    if "official Windmill TypeScript client" not in str(sdk.get("sdkSelectionRationale", "")):
        F.add("USF-RUNTIME-033", "sdkClientBoundary.sdkSelectionRationale", "Windmill SDK rationale must name official client")
    for field in (
        "licencePosture",
        "maintenancePosture",
        "securityAdvisoryPosture",
        "typescriptRuntimeCompatibility",
        "forbiddenLayerImports",
        "alternativesRejected",
        "supplierBoundary",
    ):
        if not sdk.get(field):
            F.add("USF-RUNTIME-033", f"sdkClientBoundary.{field}", "SDK/client governance field is required")

    operator = boundary.get("operatorAutomationBoundary", {})
    expected_operator = {
        "workspaceBootstrapStatus": "synthetic-workspace-created-by-USF-212",
        "variableRoundTripStatus": "synthetic-variable-write-read-proven",
        "scriptSeedStatus": "synthetic-script-created-by-USF-212",
        "deploymentHistoryStatus": "synthetic-script-deployment-history-update-proven",
        "scriptExecutionStatus": "synthetic-script-executed-by-hash-and-path-on-Windmill-worker",
        "approvalBoundaryStatus": "synthetic-approval-reference-validated-by-proof-script; no full approval workflow readiness claim",
        "privilegedOperationBoundaryStatus": "local-superadmin-placeholder-required-and-invalid-credential-denied",
        "tenantBoundaryStatus": "synthetic-tenant-reference-validated-by-proof-script",
        "auditEvidenceStatus": "value-free-audit-log-row-presence-proven",
        "retentionCleanupStatus": "script-and-variable-cleanup-attempted-plus-compose-volume-removal-proven",
        "providerFailureHandlingStatus": "invalid-credential-fail-closed-proven",
        "timeoutRetryStatus": "bounded-readiness-retry-safe-loopback-port-selection-and-process-timeouts-proven",
    }
    for field, expected in expected_operator.items():
        if operator.get(field) != expected:
            F.add("USF-RUNTIME-033", f"operatorAutomationBoundary.{field}", f"expected {expected!r}")

    substitute = boundary.get("temporalJobsSubstituteGate", {})
    if substitute.get("repositoryValidationRequired") is not True:
        F.add("USF-RUNTIME-033", "temporalJobsSubstituteGate.repositoryValidationRequired", "repository validation must remain required")
    if substitute.get("temporalJobsEquivalentToWindmill") is not False:
        F.add("USF-RUNTIME-033", "temporalJobsSubstituteGate.temporalJobsEquivalentToWindmill", "Temporal proof must not be Windmill equivalent")
    if "non-equivalent" not in str(substitute.get("substitutionNonEquivalenceBoundary", "")):
        F.add("USF-RUNTIME-033", "temporalJobsSubstituteGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
    commands = set(substitute.get("commands", []))
    for command in (
        "corepack pnpm proof:workflow:windmill",
        "corepack pnpm runtime:validate",
        "python3 tools/validate-runtime/validate-runtime.py all --json",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    ):
        if command not in commands:
            F.add("USF-RUNTIME-033", "temporalJobsSubstituteGate.commands", f"missing {command}")

    declared_evidence = set(boundary.get("enterpriseEvidenceRefs", []))
    if declared_evidence != WINDMILL_CONFIGURED_PROOF_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-033", "enterpriseEvidenceRefs", "Windmill configured proof enterprise evidence refs are incomplete")

    package = state["package"]
    scripts = package.get("scripts") if isinstance(package.get("scripts"), dict) else {}
    if scripts.get("proof:workflow:windmill") != "tsx packages/proof/src/windmill-configured-proof.ts":
        F.add("USF-RUNTIME-033", "package.json#proof:workflow:windmill", "Windmill proof package script is missing or stale")
    deps = package.get("dependencies") if isinstance(package.get("dependencies"), dict) else {}
    if deps.get("windmill-client") != "1.743.0":
        F.add("USF-RUNTIME-033", "package.json#windmill-client", "windmill-client must be exact-version pinned to 1.743.0")
    if "windmill-workflow-proof" not in make_targets(state["makefile"]):
        F.add("USF-RUNTIME-033", "Makefile#windmill-workflow-proof", "Windmill proof Make target is missing")

    service_catalogue = state.get("serviceCatalogue", {})
    services = service_catalogue.get("services", []) if isinstance(service_catalogue, dict) else []
    by_id = {service.get("serviceId"): service for service in services if isinstance(service, dict)}
    windmill = by_id.get("windmill")
    worker = by_id.get("windmill-worker")
    postgres = by_id.get("windmill-postgres")
    redis = by_id.get("windmill-redis")
    for service_id, service in (
        ("windmill", windmill),
        ("windmill-worker", worker),
        ("windmill-postgres", postgres),
        ("windmill-redis", redis),
    ):
        if not isinstance(service, dict):
            F.add("USF-RUNTIME-033", SERVICE_CATALOGUE_PATH, f"{service_id} service catalogue row is missing")
    if isinstance(windmill, dict):
        compose = windmill.get("composeService", {})
        if "@sha256:" not in str(compose.get("image", "")):
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill.composeService.image", "Windmill image must be digest-pinned")
        env = {item.get("name"): item.get("value") for item in compose.get("environment", []) if isinstance(item, dict)}
        if env.get("MODE") != "server" or env.get("SUPERADMIN_SECRET") != "usf-local-windmill-superadmin-placeholder":
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill.composeService.environment", "Windmill server mode and local placeholder secret must be generated")
        healthcheck_text = json.dumps(compose.get("healthcheck"), sort_keys=True)
        if "/api/version" not in healthcheck_text or "retries" not in healthcheck_text:
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill.composeService.healthcheck", "Windmill server healthcheck is required")
    if isinstance(worker, dict):
        compose = worker.get("composeService", {})
        if "@sha256:" not in str(compose.get("image", "")):
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill-worker.composeService.image", "Windmill worker image must be digest-pinned")
        if compose.get("command") != ["windmill"]:
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill-worker.composeService.command", "Windmill worker command must invoke windmill binary")
        env = {item.get("name"): item.get("value") for item in compose.get("environment", []) if isinstance(item, dict)}
        if env.get("MODE") != "worker":
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill-worker.composeService.environment", "Windmill worker mode must be generated")
        depends = {(dep.get("serviceName"), dep.get("condition")) for dep in compose.get("dependsOn", []) if isinstance(dep, dict)}
        if ("windmill", "service_healthy") not in depends:
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill-worker.composeService.dependsOn", "Windmill worker must depend on healthy Windmill server")
    if isinstance(postgres, dict):
        healthcheck_text = json.dumps(postgres.get("composeService", {}).get("healthcheck"), sort_keys=True)
        if "pg_isready -U windmill -d windmill" not in healthcheck_text:
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill-postgres.composeService.healthcheck", "Windmill Postgres healthcheck is required")
    if isinstance(redis, dict):
        healthcheck_text = json.dumps(redis.get("composeService", {}).get("healthcheck"), sort_keys=True)
        if "redis-cli" not in healthcheck_text or "ping" not in healthcheck_text:
            F.add("USF-RUNTIME-033", "serviceCatalogue.windmill-redis.composeService.healthcheck", "Windmill Redis healthcheck is required")

    provider_source = state_text(state, PROVIDER_REGISTRY_SOURCE_PATH)
    for marker in (
        "operational-job-engine-windmill-composed-test",
        "Windmill configured proof provider boundary",
        "endpoint://compose/windmill",
        "windmill-client",
        "1.743.0",
        "bounded-exponential-backoff-no-unbounded-retry",
        "healthy-for-USF-212-proof-only",
    ):
        if marker not in provider_source:
            F.add("USF-RUNTIME-033", str(PROVIDER_REGISTRY_SOURCE_PATH), f"Windmill provider registry marker is missing: {marker}")

    proof_source = state_text(state, WINDMILL_PROOF_SOURCE_PATH)
    proof_markers = (
        "windmill-client",
        "HealthService.getHealthStatus",
        "workers_alive",
        "WorkspaceService.createWorkspace",
        "VariableService.createVariable",
        "VariableService.getVariableValue",
        "ScriptService.createScript",
        "ScriptService.updateScriptHistory",
        "runScriptByHash",
        "runScriptByPath",
        "AuditService.listAuditLogs",
        "assertInvalidTokenFailsClosed",
        "assertSafeEvidence",
        "FORBIDDEN_EVIDENCE_PATTERN",
        "allocateFetchSafeLoopbackPort",
        "assertFetchSafeLoopbackPort",
        "safeLoopbackPortChecked",
        "docker",
        "down",
        "--remove-orphans",
        "-v",
    )
    for marker in proof_markers:
        if marker not in proof_source:
            F.add("USF-RUNTIME-033", str(WINDMILL_PROOF_SOURCE_PATH), f"Windmill proof source missing marker: {marker}")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-windmill-automation-provider")
    if not binding:
        F.add("USF-RUNTIME-033", "providerBindingMatrix.usf-189-windmill-automation-provider", "runtime manifest must include Windmill provider binding")
    else:
        expected_binding = {
            "bindingStatus": "profile-gated-proven",
            "providerMode": "composed-test",
            "providerClass": "local-composed-real-service",
            "sdkBoundary": "proof-provider-integration-boundary",
            "endpointRef": "endpoint://compose/windmill",
            "sdkPackage": "windmill-client",
            "sdkVersion": "1.743.0",
        }
        for field, expected in expected_binding.items():
            if binding.get(field) != expected:
                F.add("USF-RUNTIME-033", f"providerBindingMatrix.usf-189-windmill-automation-provider.{field}", f"expected {expected!r}")
        for provider_id in ("operational-job-engine-windmill-composed-test", "operational-job-engine-windmill-deferred"):
            if provider_id not in binding.get("providerRegistryIds", []):
                F.add("USF-RUNTIME-033", "providerBindingMatrix.usf-189-windmill-automation-provider.providerRegistryIds", f"missing {provider_id}")
        for field in ("providerRegistryEvidence", "apiProofEvidence", "workerProofEvidence", "proofCommand", "proofEvidence", "claimBoundary"):
            if not binding.get(field):
                F.add("USF-RUNTIME-033", f"providerBindingMatrix.usf-189-windmill-automation-provider.{field}", "binding evidence field is required")


def check_operator_workflow_provider_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("operatorWorkflowProviderMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-RUNTIME-029", str(OPERATOR_WORKFLOW_PROVIDER_MATRIX_PATH), "operator workflow provider disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-178",
        "followUpIssue": "USF-203",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "providerRegistryId": "operational-job-engine-windmill-deferred",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-RUNTIME-029", key, f"expected {expected!r}")

    service_ids = set(matrix.get("serviceIds", []))
    expected_service_ids = {"windmill", "windmill-worker", "windmill-postgres", "windmill-redis"}
    if expected_service_ids - service_ids:
        F.add("USF-RUNTIME-029", "serviceIds", "operator workflow service ids are incomplete")
    if OPERATOR_WORKFLOW_PROVIDER_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-029", "issueLinks", "operator workflow provider issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-029", "nonClaims", "operator workflow provider non-claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-029", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if OPERATOR_WORKFLOW_PROVIDER_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-029", "readinessClaimsProhibited", "operator workflow provider prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-RUNTIME-029", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-RUNTIME-029", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("operatorWorkflowProviderDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-RUNTIME-029", "operatorWorkflowProviderDisposition", "operator workflow provider disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "explicit-deferral-with-owner",
            "windmillServiceSemanticProofPresent": False,
            "operatorAccessProofPresent": False,
            "approvalWorkflowProofPresent": False,
            "privilegedOperationBoundaryProofPresent": False,
            "tenantBoundaryProofPresent": False,
            "secretBoundaryProofPresent": False,
            "auditEvidenceProofPresent": False,
            "retentionProofPresent": False,
            "cleanupProofPresent": False,
            "failureBehaviourProofPresent": False,
            "operatorAutomationReadinessClaim": False,
            "windmillReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "providerRegistryId": "operational-job-engine-windmill-deferred",
            "followUpIssue": "USF-203",
            "owner": "platform-workflow-foundation",
            "riskOwner": "platform-workflow-risk-owner",
            "controlOwner": "platform-workflow-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-029", f"operatorWorkflowProviderDisposition.{key}", f"expected {expected!r}")
        if set(disposition.get("serviceCatalogueServiceIds", [])) != expected_service_ids:
            F.add("USF-RUNTIME-029", "operatorWorkflowProviderDisposition.serviceCatalogueServiceIds", "Windmill service catalogue ids are incomplete")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-029", f"operatorWorkflowProviderDisposition.{field}", "deferral field is required")

    provider_boundary = matrix.get("providerBoundary", {})
    if not isinstance(provider_boundary, dict):
        F.add("USF-RUNTIME-029", "providerBoundary", "provider boundary must be an object")
    else:
        expected_provider = {
            "providerBindingId": "usf-189-windmill-automation-provider",
            "providerRegistryId": "operational-job-engine-windmill-deferred",
            "bindingStatus": "profile-gated",
            "providerMode": "live-external-deferred",
            "runtimeProviderBindingActive": False,
            "sdkPackage": None,
            "sdkVersion": None,
            "endpointRef": None,
            "followUpIssue": "USF-203",
        }
        for key, expected in expected_provider.items():
            observed = provider_boundary.get(key)
            if observed is not expected if isinstance(expected, bool) or expected is None else observed != expected:
                F.add("USF-RUNTIME-029", f"providerBoundary.{key}", f"expected {expected!r}")
        if set(provider_boundary.get("serviceCatalogueServiceIds", [])) != expected_service_ids:
            F.add("USF-RUNTIME-029", "providerBoundary.serviceCatalogueServiceIds", "Windmill service catalogue ids are incomplete")

    substitute = matrix.get("temporalJobsSubstituteBoundary", {})
    if not isinstance(substitute, dict):
        F.add("USF-RUNTIME-029", "temporalJobsSubstituteBoundary", "substitute boundary must be an object")
    else:
        if substitute.get("usedWhereSemanticallyPermitted") is not True:
            F.add("USF-RUNTIME-029", "temporalJobsSubstituteBoundary.usedWhereSemanticallyPermitted", "permitted Temporal/jobs proof use must be explicit")
        for key in (
            "windmillServiceEquivalent",
            "operatorAutomationEquivalent",
            "approvalWorkflowEquivalent",
            "privilegedOperationEquivalent",
            "operatorAccessEquivalent",
        ):
            if substitute.get(key) is not False:
                F.add("USF-RUNTIME-029", f"temporalJobsSubstituteBoundary.{key}", "Temporal/jobs proof evidence must not be Windmill equivalent")
        if "not equivalent to Windmill" not in str(substitute.get("substitutionNonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-029", "temporalJobsSubstituteBoundary.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        commands = set(substitute.get("commands", []))
        for command in (
            "corepack pnpm proof:jobs",
            "corepack pnpm runtime:proof",
            "corepack pnpm providers-proof",
            "corepack pnpm verify",
            "python3 tools/validate-runtime/validate-runtime.py all --json",
        ):
            if command not in commands:
                F.add("USF-RUNTIME-029", "temporalJobsSubstituteBoundary.commands", f"missing {command}")
        if len(substitute.get("scopeCovered", [])) < 4 or len(substitute.get("limits", [])) < 7:
            F.add("USF-RUNTIME-029", "temporalJobsSubstituteBoundary", "substitute scope and limits are incomplete")

    operational = matrix.get("operationalEvidencePosture", {})
    if not isinstance(operational, dict):
        F.add("USF-RUNTIME-029", "operationalEvidencePosture", "operational evidence posture must be an object")
    else:
        expected_operational = {
            "readinessRetry": "deferred-to-USF-203",
            "timeout": "deferred-to-USF-203",
            "failClosed": "bounded-disposition-only",
            "safeTeardown": "deferred-to-USF-203",
            "accessReview": "deferred-to-USF-203",
            "breakGlass": "not-claimed-until-USF-203-proof",
        }
        for key, expected in expected_operational.items():
            if operational.get(key) != expected:
                F.add("USF-RUNTIME-029", f"operationalEvidencePosture.{key}", f"expected {expected!r}")
        for field in (
            "structuredLogging",
            "tracingCorrelation",
            "metrics",
            "auditEvents",
            "redaction",
            "retention",
            "secretBoundary",
        ):
            if field not in operational:
                F.add("USF-RUNTIME-029", f"operationalEvidencePosture.{field}", "operational field is required")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if declared_evidence != OPERATOR_WORKFLOW_PROVIDER_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-029", "enterpriseEvidenceRefs", "operator workflow provider enterprise evidence refs are incomplete")

    configured_boundary = state.get("windmillConfiguredProofBoundary")
    configured_proof_present = (
        isinstance(configured_boundary, dict)
        and configured_boundary.get("sourceIssue") == "USF-212"
        and configured_boundary.get("status") == "profile-gated-bounded-proof-present"
    )

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-windmill-automation-provider")
    if not binding:
        F.add("USF-RUNTIME-029", "providerBindingMatrix", "Windmill provider disposition is missing from runtime manifest")
    else:
        if "USF-203" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "runtime manifest must link USF-203")
        if configured_proof_present:
            if "USF-212" not in binding.get("followUpIssueRefs", []):
                F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "runtime manifest must link USF-212 configured proof")
            if "USF-203" not in str(binding.get("claimBoundary", "")):
                F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider.claimBoundary", "runtime manifest must preserve USF-203 non-equivalence context")
            if binding.get("bindingStatus") != "profile-gated-proven" or binding.get("endpointRef") != "endpoint://compose/windmill":
                F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "Windmill configured proof must be profile-gated-proven with safe endpoint ref")
            if binding.get("sdkPackage") != "windmill-client" or binding.get("sdkVersion") != "1.743.0":
                F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "Windmill configured proof must name exact SDK package")
        else:
            if "USF-203" not in str(binding.get("deferredReason", "")):
                F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider.deferredReason", "runtime manifest must defer service-semantic proof to USF-203")
            if binding.get("bindingStatus") != "profile-gated" or binding.get("endpointRef") is not None:
                F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "Windmill must remain explicitly deferred/profile-gated without endpoint binding")
            if binding.get("sdkPackage") is not None or binding.get("sdkVersion") is not None:
                F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "deferred Windmill must not name an SDK/client package")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-workflow-automation-provider-deferred")
    if not deferred or "USF-203" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-029", "deferredBoundaries.usf-189-workflow-automation-provider-deferred", "runtime deferred boundary must link USF-203")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in ("until USF-178 closes", "followUpIssue=USF-178", "\"followUpIssue\": \"USF-178\"", "linkedFollowUpIssue=USF-178"):
        if stale in matrix_text:
            F.add("USF-RUNTIME-029", "operator-workflow-provider-stale-self-deferral", f"stale self-deferral remains: {stale}")

    blocker = state.get("windmillProofBlockerMatrix")
    if not isinstance(blocker, dict):
        F.add("USF-RUNTIME-029", str(WINDMILL_PROOF_BLOCKER_MATRIX_PATH), "Windmill proof blocker matrix is missing")
        return

    expected_blocker_top = {
        "sourceIssue": "USF-203",
        "predecessorIssue": "USF-178",
        "followUpIssue": "USF-212",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "providerRegistryId": "operational-job-engine-windmill-deferred",
        "runtimeManifest": str(MANIFEST_PATH),
        "serviceCatalogueAuthority": "spec/instances/compose-service/service-catalogue.json",
        "validationCommand": "python3 tools/validate-runtime/validate-runtime.py all --json",
    }
    for key, expected in expected_blocker_top.items():
        if blocker.get(key) != expected:
            F.add("USF-RUNTIME-029", f"windmillProofBlocker.{key}", f"expected {expected!r}")

    if WINDMILL_PROOF_BLOCKER_REQUIRED_ISSUES - set(blocker.get("issueLinks", [])):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.issueLinks", "Windmill blocker issue links are incomplete")
    if set(blocker.get("serviceIds", [])) != expected_service_ids:
        F.add("USF-RUNTIME-029", "windmillProofBlocker.serviceIds", "Windmill blocker service ids are incomplete")
    if OPERATOR_WORKFLOW_PROVIDER_PROHIBITED_CLAIMS - set(blocker.get("readinessClaimsProhibited", [])):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.readinessClaimsProhibited", "Windmill blocker prohibited claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(blocker.get("readinessClaimsAllowed", [])):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.readinessClaimsAllowed", "Windmill blocker allows a prohibited readiness claim")
    if not {"operator-automation-readiness", "windmill-readiness", "usf-133-closure"} <= set(blocker.get("nonClaims", [])):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.nonClaims", "Windmill blocker non-claims are incomplete")

    decision = blocker.get("reclassificationDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted-blocked-reclassification":
        F.add("USF-RUNTIME-029", "windmillProofBlocker.reclassificationDecision", "blocked reclassification decision is required")
    elif decision.get("decisionIsWorkComplete") is not False or decision.get("blockedFollowUpIssue") != "USF-212":
        F.add("USF-RUNTIME-029", "windmillProofBlocker.reclassificationDecision", "blocked reclassification must point to USF-212 without claiming work complete")

    blockers = blocker.get("observedBlockers", {})
    if not isinstance(blockers, dict):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.observedBlockers", "observed blockers are required")
    else:
        expected_blockers = {
            "composeServicesGenerated": True,
            "imageLocalInspectSucceeded": True,
            "healthcheckPresent": False,
            "readinessRetryTargetPresent": False,
            "authAdminBootstrapAuthorityPresent": False,
            "credentialBoundaryPresent": False,
            "sdkClientSelectionPresent": False,
            "proofSafeWorkflowSeedPresent": False,
            "operatorApprovalWorkflowProofPresent": False,
            "privilegedOperationBoundaryProofPresent": False,
            "tenantBoundaryProofPresent": False,
            "secretBoundaryProofPresent": False,
            "auditEvidenceProofPresent": False,
            "retentionCleanupProofPresent": False,
            "timeoutPolicyPresent": False,
            "safeTeardownBoundaryPresent": False,
            "rawConnectionValueRetained": False,
            "rawTokenOrCredentialRetained": False,
        }
        for key, expected in expected_blockers.items():
            observed = blockers.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-029", f"windmillProofBlocker.observedBlockers.{key}", f"expected {expected!r}")

    blocker_disposition = blocker.get("operatorWorkflowProviderDisposition", {})
    if not isinstance(blocker_disposition, dict):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.operatorWorkflowProviderDisposition", "blocked disposition is required")
    else:
        expected_blocked_disposition = {
            "disposition": "blocked-with-owner-and-follow-up",
            "windmillServiceSemanticProofPresent": False,
            "operatorAccessProofPresent": False,
            "approvalWorkflowProofPresent": False,
            "privilegedOperationBoundaryProofPresent": False,
            "tenantBoundaryProofPresent": False,
            "secretBoundaryProofPresent": False,
            "auditEvidenceProofPresent": False,
            "retentionProofPresent": False,
            "cleanupProofPresent": False,
            "failureBehaviourProofPresent": False,
            "timeoutRetryProofPresent": False,
            "operatorAutomationReadinessClaim": False,
            "windmillReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "providerRegistryId": "operational-job-engine-windmill-deferred",
            "followUpIssue": "USF-212",
            "owner": "platform-workflow-foundation",
            "riskOwner": "platform-workflow-risk-owner",
            "controlOwner": "platform-workflow-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_blocked_disposition.items():
            observed = blocker_disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-029", f"windmillProofBlocker.operatorWorkflowProviderDisposition.{key}", f"expected {expected!r}")
        if set(blocker_disposition.get("serviceCatalogueServiceIds", [])) != expected_service_ids:
            F.add("USF-RUNTIME-029", "windmillProofBlocker.operatorWorkflowProviderDisposition.serviceCatalogueServiceIds", "Windmill service catalogue ids are incomplete")
        for field in ("riskStatement", "treatment", "blockedEvidence"):
            if blocker_disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-029", f"windmillProofBlocker.operatorWorkflowProviderDisposition.{field}", "blocked field is required")

    sdk_boundary = blocker.get("sdkClientProtocolBoundary", {})
    if not isinstance(sdk_boundary, dict):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.sdkClientProtocolBoundary", "SDK/client boundary is required")
    elif (
        sdk_boundary.get("selectionStatus") != "blocked-until-USF-212"
        or sdk_boundary.get("sdkPackage") is not None
        or sdk_boundary.get("sdkVersion") is not None
        or sdk_boundary.get("protocolException") is not False
        or "USF-212" not in str(sdk_boundary.get("selectionAllowedOnlyAfter", ""))
        or len(sdk_boundary.get("alternativesRejected", [])) < 3
    ):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.sdkClientProtocolBoundary", "SDK/client boundary must remain blocked with rationale and alternatives")

    operational_blocker = blocker.get("operationalEvidencePosture", {})
    if not isinstance(operational_blocker, dict):
        F.add("USF-RUNTIME-029", "windmillProofBlocker.operationalEvidencePosture", "blocked operational posture is required")
    else:
        expected_blocked_operational = {
            "readinessRetry": "blocked-until-USF-212-defines-readiness-target",
            "timeout": "blocked-until-USF-212-configures-proof-boundary",
            "failClosed": "USF-203-blocks-readiness-claim",
            "safeTeardown": "blocked-until-USF-212-configures-workflow-teardown",
            "operatorWorkflowExecution": "blocked-until-USF-212",
            "accessReview": "blocked-until-USF-212",
            "breakGlass": "not-claimed",
            "redaction": "no-provider-payload-or-credential-retained",
        }
        for key, expected in expected_blocked_operational.items():
            if operational_blocker.get(key) != expected:
                F.add("USF-RUNTIME-029", f"windmillProofBlocker.operationalEvidencePosture.{key}", f"expected {expected!r}")
        for field in ("structuredLogging", "tracingCorrelation", "metrics", "auditEvents", "retention", "secretBoundary"):
            if field not in operational_blocker:
                F.add("USF-RUNTIME-029", f"windmillProofBlocker.operationalEvidencePosture.{field}", "blocked operational field is required")

    blocker_evidence = set(blocker.get("enterpriseEvidenceRefs", []))
    if blocker_evidence != WINDMILL_PROOF_BLOCKER_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-029", "windmillProofBlocker.enterpriseEvidenceRefs", "Windmill blocker enterprise evidence refs are incomplete")

    if binding and "USF-212" not in binding.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "runtime manifest must link USF-212 blocker")
    if deferred and "USF-212" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-029", "deferredBoundaries.usf-189-workflow-automation-provider-deferred", "runtime deferred boundary must link USF-212 blocker")


def check_provider_sdk_boundary(F: Findings, state: dict[str, Any]) -> None:
    for binding_id, metadata in REQUIRED_PROVIDER_BINDINGS.items():
        adapter_path = metadata["adapterPath"]
        adapter_text = state_text(state, adapter_path)
        packages = metadata.get("dependencyPackages", [metadata["sdkPackage"]])
        for package in packages:
            if package not in adapter_text:
                F.add("USF-RUNTIME-013", str(adapter_path), f"SDK/client package marker is missing for {binding_id}: {package}")
        retry_markers = {
            ADAPTER_DB_SOURCE_PATH: "retryPostgresReadiness",
            ADAPTER_MAIL_SOURCE_PATH: "retryMailpitReadiness",
            ADAPTER_BUS_SOURCE_PATH: "retryNatsReadiness",
            ADAPTER_STORE_SOURCE_PATH: "retryMinioReadiness",
            ADAPTER_IDP_SOURCE_PATH: "retryKeycloakCall",
            ADAPTER_SECRETS_SOURCE_PATH: "retryOpenBaoReadiness",
            ADAPTER_WF_SOURCE_PATH: "retryTemporalReadiness",
        }
        retry_marker = retry_markers.get(adapter_path)
        if retry_marker and retry_marker not in adapter_text:
            F.add("USF-RUNTIME-013", str(adapter_path), f"readiness retry marker is missing: {retry_marker}")
        if adapter_path == ADAPTER_IDP_SOURCE_PATH:
            for marker in ("bounded-exponential-backoff-120s-keycloak", "timeoutMs = 120000"):
                if marker not in adapter_text:
                    F.add("USF-RUNTIME-013", str(adapter_path), f"Keycloak readiness budget marker is missing: {marker}")
        for evidence_marker in (
            "structuredLogEvidenceCaptured",
            "traceEvidenceCaptured",
            "metricEvidenceCaptured",
            "auditEvidenceCaptured",
            "redactionChecked",
            "readinessRetryPolicy",
        ):
            if evidence_marker not in adapter_text:
                F.add("USF-RUNTIME-013", str(adapter_path), f"adapter evidence marker is missing: {evidence_marker}")
    forbidden_paths = list(FORBIDDEN_SDK_IMPORT_PATHS)
    forbidden_paths.extend(ts_files_under(Path("capabilities")))
    for path in forbidden_paths:
        text = state_text(state, path)
        if PROVIDER_SDK_IMPORT_RE.search(text):
            F.add("USF-RUNTIME-013", str(path), "provider SDK import is not allowed in this layer")


def check_provider_path_collision_safety(F: Findings, state: dict[str, Any]) -> None:
    adapter_requirements = {
        ADAPTER_STORE_SOURCE_PATH: {
            "required": [
                "encodeMinioObjectPathSegment",
                "base64url",
                "tenantCollisionKey",
                "tenantCollisionBoundaryChecked",
                "keyCollisionTenant",
                "objectKeyCollisionBoundaryChecked",
                "pathCollisionResistanceChecked",
                "collidingTenantBoundaryChecked",
                "collidingObjectKeyBoundaryChecked",
            ],
            "forbidden": [
                "sanitizeObjectToken",
                'replace(/[^A-Za-z0-9_.=-]/g, "_")',
                "collisionTenantBoundaryChecked",
            ],
        },
        ADAPTER_SECRETS_SOURCE_PATH: {
            "required": [
                "encodeOpenBaoPathSegment",
                "base64url",
                "tenantCollisionName",
                "tenantCollisionBoundaryChecked",
                "nameCollisionTenant",
                "secretNameCollisionBoundaryChecked",
                "pathCollisionResistanceChecked",
                "collidingTenantBoundaryChecked",
                "collidingSecretNameBoundaryChecked",
            ],
            "forbidden": [
                "sanitizeSecretPathToken",
                'replace(/[^A-Za-z0-9_-]/g, "_")',
                "collisionBoundaryChecked",
            ],
        },
    }
    for path, requirements in adapter_requirements.items():
        text = state_text(state, path)
        for marker in requirements["required"]:
            if marker not in text:
                F.add("USF-RUNTIME-017", str(path), f"missing collision-free path marker: {marker}")
        for marker in requirements["forbidden"]:
            if marker in text:
                F.add("USF-RUNTIME-017", str(path), f"lossy tenant path normalisation marker present: {marker}")
    proof_source = state["proofSource"]
    for marker in (
        "pathCollisionResistanceChecked",
        "collidingTenantBoundaryChecked",
        "collidingObjectKeyBoundaryChecked",
        "collidingSecretNameBoundaryChecked",
    ):
        if marker not in proof_source:
            F.add("USF-RUNTIME-017", str(PROOF_SOURCE_PATH), f"proof source missing collision evidence marker: {marker}")


def check_provider_safe_metadata(F: Findings, state: dict[str, Any]) -> None:
    manifest = state["manifest"]
    for binding in manifest.get("providerBindingMatrix", []):
        if not isinstance(binding, dict):
            continue
        safe_payload = {
            "endpointRef": binding.get("endpointRef"),
            "apiProofEvidence": binding.get("apiProofEvidence"),
            "workerProofEvidence": binding.get("workerProofEvidence"),
            "providerRegistryEvidence": binding.get("providerRegistryEvidence"),
            "claimBoundary": binding.get("claimBoundary"),
        }
        text = json.dumps(safe_payload, sort_keys=True)
        if PROVIDER_SAFE_METADATA_FORBIDDEN_RE.search(text):
            F.add("USF-RUNTIME-014", binding.get("bindingId", "provider-binding"), "provider proof metadata exposes raw endpoint or credential material")


def check_provider_registry_linkage(F: Findings, state: dict[str, Any]) -> None:
    registry_source = state_text(state, PROVIDER_REGISTRY_SOURCE_PATH)
    for binding_id, metadata in REQUIRED_PROVIDER_BINDINGS.items():
        for marker in (
            metadata["providerId"],
            metadata["adapterName"],
            f"endpoint://compose/{expected_service_ids(metadata)[0]}",
            "healthy",
            "bounded-exponential-backoff-no-unbounded-retry",
        ):
            if marker not in registry_source:
                F.add(
                    "USF-RUNTIME-015",
                    str(PROVIDER_REGISTRY_SOURCE_PATH),
                    f"provider registry missing marker for {binding_id}: {marker}",
                )
    runtime_source = state_text(state, RUNTIME_SOURCE_PATH)
    for marker in [
        "DEV_COMPOSE_ACTIVE_PROVIDER_BINDINGS",
        *(str(metadata["adapterName"]) for metadata in REQUIRED_PROVIDER_BINDINGS.values()),
    ]:
        if marker not in runtime_source:
            F.add("USF-RUNTIME-015", str(RUNTIME_SOURCE_PATH), f"runtime binding source missing marker: {marker}")


def check_dependency_pinning(F: Findings, state: dict[str, Any]) -> None:
    deps = state["package"].get("dependencies", {})
    for metadata in REQUIRED_PROVIDER_BINDINGS.values():
        packages = metadata.get("dependencyPackages", [metadata["sdkPackage"]])
        for package in packages:
            version = deps.get(package)
            if version != metadata["sdkVersion"]:
                F.add(
                    "USF-RUNTIME-016",
                    f"package.json:{package}",
                    f"{package} must be exact-version pinned to {metadata['sdkVersion']}",
                )
    dev_deps = state["package"].get("devDependencies", {})
    postgres_types_version = dev_deps.get(POSTGRES_TYPES_PACKAGE)
    if postgres_types_version != POSTGRES_TYPES_VERSION:
        F.add(
            "USF-RUNTIME-016",
            f"package.json:{POSTGRES_TYPES_PACKAGE}",
            "@types/pg must be exact-version pinned to 8.20.0",
        )


def _client_contract_operations_by_route_id() -> dict[str, dict[str, Any]]:
    data = read_json(Path("docs/architecture/non-ui-client-callable-contract-map.json"))
    records: dict[str, dict[str, Any]] = {}
    for record in data.get("operations", []):
        if isinstance(record, dict) and isinstance(record.get("routeId"), str):
            records[record["routeId"]] = record
    return records


def _readiness_map_operation_records(readiness_map: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    records: dict[str, list[dict[str, Any]]] = {}
    operations = readiness_map.get("operations")
    if not isinstance(operations, list):
        return records
    for record in operations:
        if isinstance(record, dict) and isinstance(record.get("routeId"), str):
            records.setdefault(record["routeId"], []).append(record)
    return records


def check_runtime_product_readiness_map(F: Findings, state: dict[str, Any]) -> None:
    readiness_map = state.get("runtimeProductReadinessMap")
    manifest = state["manifest"]
    if not isinstance(readiness_map, dict):
        F.add(
            "USF-RUNTIME-036",
            str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
            "runtime product readiness map artefact is missing or not an object",
        )
        return

    if readiness_map.get("id") != "runtime-product-readiness-map":
        F.add("USF-RUNTIME-036", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "unexpected readiness map id")
    if readiness_map.get("ownerIssueId") != "USF-1050":
        F.add("USF-RUNTIME-036", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "ownerIssueId must be USF-1050")
    child_issues = set(string_list(readiness_map.get("childIssueIds")))
    missing_child_issues = sorted(RUNTIME_PRODUCT_REQUIRED_CHILD_ISSUES - child_issues)
    if missing_child_issues:
        F.add(
            "USF-RUNTIME-036",
            str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
            f"missing child issues: {', '.join(missing_child_issues)}",
        )
    if readiness_map.get("authorityLevel") != "validator-enforced-readiness-map":
        F.add(
            "USF-RUNTIME-036",
            str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
            "authorityLevel must identify a validator-enforced readiness map",
        )
    if readiness_map.get("readinessScope") != RUNTIME_PRODUCT_READINESS_SCOPE:
        F.add(
            "USF-RUNTIME-037",
            str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
            "readinessScope is missing or exceeds the bounded local/compose runtime scope",
        )

    claims = readiness_map.get("readinessClaims")
    if not isinstance(claims, dict):
        F.add("USF-RUNTIME-036", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "readinessClaims is missing")
        claims = {}
    for field in sorted(RUNTIME_PRODUCT_REQUIRED_TRUE_CLAIMS):
        if claims.get(field) is not True:
            F.add(
                "USF-RUNTIME-036",
                str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
                f"{field} must be true for bounded current-main runtime readiness",
            )
    for field in sorted(RUNTIME_PRODUCT_FORBIDDEN_TRUE_CLAIMS):
        if claims.get(field) is True:
            F.add(
                "USF-RUNTIME-037",
                str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
                f"{field} must remain false in the runtime readiness map",
            )

    non_claims = set(string_list(readiness_map.get("nonClaims")))
    missing_non_claims = sorted(RUNTIME_PRODUCT_REQUIRED_NONCLAIMS - non_claims)
    if missing_non_claims:
        F.add(
            "USF-RUNTIME-037",
            str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
            f"missing runtime non-claims: {', '.join(missing_non_claims)}",
        )

    anchors = readiness_map.get("sourceTreeAnchors")
    if not isinstance(anchors, list):
        F.add("USF-RUNTIME-036", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "sourceTreeAnchors must be an array")
        anchors = []
    anchors_by_path: dict[str, str] = {}
    for index, anchor in enumerate(anchors):
        subject = f"{RUNTIME_PRODUCT_READINESS_MAP_PATH}:sourceTreeAnchors[{index}]"
        if not isinstance(anchor, dict):
            F.add("USF-RUNTIME-036", subject, "source-tree anchor must be an object")
            continue
        path = anchor.get("path")
        blob_sha = anchor.get("blobSha")
        if not as_nonempty_string(path) or not as_nonempty_string(blob_sha):
            F.add("USF-RUNTIME-036", subject, "source-tree anchor path and blobSha are required")
            continue
        if path in anchors_by_path:
            F.add("USF-RUNTIME-036", subject, f"duplicate source-tree anchor for {path}")
        anchors_by_path[path] = blob_sha
    for path in sorted(RUNTIME_PRODUCT_SOURCE_ANCHOR_PATHS):
        observed = anchors_by_path.get(path)
        if observed is None:
            F.add("USF-RUNTIME-036", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), f"missing source-tree anchor for {path}")
            continue
        if observed != current_blob_sha(path):
            F.add("USF-RUNTIME-036", path, "source-tree anchor does not match current worktree blob")

    validator_coverage = set(string_list(readiness_map.get("validatorCoverage")))
    for required in {
        RUNTIME_PRODUCT_READINESS_VALIDATOR,
        "runtime:validate",
        "runtime:proof",
        "runtime:proof:compose",
        "runtime:proof:in-memory",
    }:
        if required not in validator_coverage:
            F.add("USF-RUNTIME-036", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), f"validatorCoverage lacks {required}")
    planted = readiness_map.get("plantedDefectCoverage")
    if not isinstance(planted, list):
        F.add("USF-RUNTIME-036", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "plantedDefectCoverage must be an array")
    else:
        covered_rules = {item.get("ruleId") for item in planted if isinstance(item, dict)}
        missing_rules = sorted(RUNTIME_PRODUCT_REQUIRED_PLANTED_RULES - covered_rules)
        if missing_rules:
            F.add(
                "USF-RUNTIME-036",
                str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
                f"plantedDefectCoverage lacks rule coverage: {', '.join(missing_rules)}",
            )

    proof_rung = readiness_map.get("proofRung")
    if not isinstance(proof_rung, dict):
        F.add("USF-RUNTIME-037", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "proofRung is missing")
        proof_rung = {}
    if proof_rung.get("claimedRung") != "local-dev-and-dev-compose-backed":
        F.add("USF-RUNTIME-037", "proofRung.claimedRung", "runtime readiness must stay bounded to local dev and dev Compose")
    if proof_rung.get("projectionOnlyMaySatisfyRuntimeProof") is not False:
        F.add("USF-RUNTIME-038", "proofRung.projectionOnlyMaySatisfyRuntimeProof", "projection-only evidence cannot satisfy runtime proof")
    for field in ("stagingReady", "productionReady", "liveProviderReady"):
        if proof_rung.get(field) is True:
            F.add("USF-RUNTIME-037", f"proofRung.{field}", "stronger runtime proof rung must not be claimed")
    if proof_rung.get("manifestRef") != str(MANIFEST_PATH):
        F.add("USF-RUNTIME-037", "proofRung.manifestRef", "proof rung must reference the runtime proof manifest")

    modes = mode_records(manifest)
    runtime_modes = readiness_map.get("runtimeModes")
    if not isinstance(runtime_modes, list):
        F.add("USF-RUNTIME-037", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "runtimeModes must be an array")
        runtime_modes = []
    runtime_mode_records = {item.get("mode"): item for item in runtime_modes if isinstance(item, dict)}
    for mode in sorted(REQUIRED_MODES):
        source_mode = modes.get(mode)
        record = runtime_mode_records.get(mode)
        if not isinstance(source_mode, dict) or not isinstance(record, dict):
            F.add("USF-RUNTIME-037", mode, "runtime readiness mode record is missing")
            continue
        if record.get("providerMode") != source_mode.get("providerMode"):
            F.add("USF-RUNTIME-037", mode, "providerMode does not match runtime proof manifest")
        if record.get("providerClass") != source_mode.get("providerClass"):
            F.add("USF-RUNTIME-037", mode, "providerClass does not match runtime proof manifest")
        for field in ("apiBootProof", "workerBootProof", "healthProof", "readinessProof", "livenessProof"):
            if record.get(field) is not True:
                F.add("USF-RUNTIME-037", f"{mode}.{field}", "runtime mode proof flag must be true")
        if record.get("projectionOnlyEvidence") is True:
            F.add("USF-RUNTIME-038", mode, "runtime mode cannot use projection-only evidence as runtime proof")

    boot = readiness_map.get("bootHealthReadinessLiveness")
    if not isinstance(boot, dict):
        F.add("USF-RUNTIME-037", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "bootHealthReadinessLiveness is missing")
        boot = {}
    for field in (
        "apiBootBounded",
        "workerBootBounded",
        "healthzProof",
        "readyzProof",
        "livenessSemanticsDefined",
        "composeProviderBindingProof",
        "teardownProof",
        "missingProofFailsClosed",
    ):
        if boot.get(field) is not True:
            F.add("USF-RUNTIME-037", f"bootHealthReadinessLiveness.{field}", "boot and health proof field must be true")

    client_ops = _client_contract_operations_by_route_id()
    map_ops = _readiness_map_operation_records(readiness_map)
    expected_ids = set(client_ops)
    observed_ids = set(map_ops)
    for route_id in sorted(expected_ids - observed_ids):
        F.add("USF-RUNTIME-038", route_id, "runtime readiness operation record is missing")
    for route_id in sorted(observed_ids - expected_ids):
        F.add("USF-RUNTIME-038", route_id, "runtime readiness operation record targets unknown routeId")
    for route_id, rows in sorted(map_ops.items()):
        if len(rows) != 1:
            F.add("USF-RUNTIME-038", route_id, "runtime readiness operation record is duplicated")

    expected_counts = {
        "totalRouteBackedOperations": len(client_ops),
        "directRuntimeProofOperations": 0,
        "domainExecutableProofOperations": 0,
        "projectionOnlyRuntimeProofOperations": 0,
        "runtimeReadyOperations": len(client_ops),
    }
    for route_id, client_op in sorted(client_ops.items()):
        rows = map_ops.get(route_id, [])
        if len(rows) != 1:
            continue
        operation = rows[0]
        subject = f"{RUNTIME_PRODUCT_READINESS_MAP_PATH}:operations[{route_id}]"
        for field in ("method", "openapiPath", "openapiOperationId"):
            if operation.get(field) != client_op.get(field):
                F.add("USF-RUNTIME-038", subject, f"{field} does not match client contract map")
        if operation.get("clientContractRef") != f"docs/architecture/non-ui-client-callable-contract-map.json#routeId={route_id}":
            F.add("USF-RUNTIME-038", subject, "clientContractRef does not target the route record")
        if operation.get("interfaceDispositionRef") != f"docs/architecture/api-route-interface-contract-coverage.json#routeId={route_id}":
            F.add("USF-RUNTIME-038", subject, "interfaceDispositionRef does not target the interface coverage record")

        proof = operation.get("proofEvidence")
        if not isinstance(proof, dict):
            F.add("USF-RUNTIME-038", subject, "proofEvidence is missing")
            proof = {}
        status = proof.get("runtimeProofStatus")
        if status not in RUNTIME_PRODUCT_ALLOWED_OPERATION_PROOF_STATUSES:
            F.add("USF-RUNTIME-038", subject, "runtimeProofStatus is not an approved executable proof status")
        if route_id in RUNTIME_PRODUCT_DIRECT_PROOF_ROUTES and status != "direct-runtime-proof":
            F.add("USF-RUNTIME-038", subject, "directly exercised runtime proof route is not marked direct-runtime-proof")
        if route_id not in RUNTIME_PRODUCT_DIRECT_PROOF_ROUTES and status != "executable-domain-proof-bound-to-route-contract":
            F.add("USF-RUNTIME-038", subject, "route must cite executable domain proof bound to the route contract")
        if status == "direct-runtime-proof":
            expected_counts["directRuntimeProofOperations"] += 1
        elif status == "executable-domain-proof-bound-to-route-contract":
            expected_counts["domainExecutableProofOperations"] += 1
        if proof.get("projectionOnlySatisfiesRuntimeProof") is not False:
            expected_counts["projectionOnlyRuntimeProofOperations"] += 1
            F.add("USF-RUNTIME-038", subject, "projection-only evidence must not satisfy runtime proof")
        command_refs = set(string_list(proof.get("runtimeProofCommandRefs")))
        if not command_refs:
            F.add("USF-RUNTIME-038", subject, "runtime proof command refs are missing")
        if route_id in RUNTIME_PRODUCT_DIRECT_PROOF_ROUTES and "runtime:proof:compose" not in command_refs:
            F.add("USF-RUNTIME-038", subject, "direct runtime proof route must cite runtime:proof:compose")
        evidence_refs = set(string_list(proof.get("evidenceRefs")))
        if str(MANIFEST_PATH) not in evidence_refs:
            F.add("USF-RUNTIME-038", subject, "runtime proof evidence must cite the runtime proof manifest")
        readiness = operation.get("readiness")
        if not isinstance(readiness, dict) or readiness.get("runtimeRouteBackedOperationReady") is not True:
            F.add("USF-RUNTIME-038", subject, "operation must carry bounded runtime route-backed readiness")
            readiness = readiness if isinstance(readiness, dict) else {}
        for field in RUNTIME_PRODUCT_FORBIDDEN_TRUE_CLAIMS:
            if readiness.get(field) is True:
                F.add("USF-RUNTIME-038", subject, f"operation must not claim {field}")

    coverage = readiness_map.get("operationRuntimeProofCoverage")
    if not isinstance(coverage, dict):
        F.add("USF-RUNTIME-038", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "operationRuntimeProofCoverage is missing")
    else:
        for field, expected in expected_counts.items():
            if coverage.get(field) != expected:
                F.add("USF-RUNTIME-038", f"operationRuntimeProofCoverage.{field}", f"must be {expected}")

    state_boundary = readiness_map.get("stateStorageMigrationBoundary")
    if not isinstance(state_boundary, dict):
        F.add("USF-RUNTIME-039", str(RUNTIME_PRODUCT_READINESS_MAP_PATH), "stateStorageMigrationBoundary is missing")
        state_boundary = {}
    if set(string_list(state_boundary.get("providerModes"))) != REQUIRED_MODES:
        F.add("USF-RUNTIME-039", "stateStorageMigrationBoundary.providerModes", "provider modes must match runtime proof modes")
    for field in (
        "syntheticDataOnly",
        "tenantBoundaryDefined",
        "stateProviderBindingsDefined",
        "migrationPostureDefined",
        "missingBoundaryFailsClosed",
    ):
        if state_boundary.get(field) is not True:
            F.add("USF-RUNTIME-039", f"stateStorageMigrationBoundary.{field}", "state/data boundary field must be true")
    for field in ("productionDataMigrationReady", "stagingDataMigrationReady", "liveProviderDataReady"):
        if state_boundary.get(field) is not False:
            F.add("USF-RUNTIME-039", f"stateStorageMigrationBoundary.{field}", "stronger data readiness must remain false")
    data_services = state_boundary.get("dataBearingServices")
    if not isinstance(data_services, list) or len(data_services) < len(manifest.get("providerBindingMatrix", [])):
        F.add("USF-RUNTIME-039", "stateStorageMigrationBoundary.dataBearingServices", "data-bearing service dispositions are incomplete")
    else:
        for index, service in enumerate(data_services):
            subject = f"stateStorageMigrationBoundary.dataBearingServices[{index}]"
            if not isinstance(service, dict):
                F.add("USF-RUNTIME-039", subject, "data-bearing service disposition must be an object")
                continue
            if not as_nonempty_string(service.get("serviceOrProviderRef")):
                F.add("USF-RUNTIME-039", subject, "serviceOrProviderRef is required")
            if not as_nonempty_string(service.get("runtimeDataBoundary")):
                F.add("USF-RUNTIME-039", subject, "runtimeDataBoundary is required")
            if service.get("productionDataClaim") is not False or service.get("liveProviderClaim") is not False:
                F.add("USF-RUNTIME-039", subject, "data-bearing service must not claim production or live-provider data readiness")

    negative = readiness_map.get("authSessionTenantNegativePathAuditTelemetryProof")
    if not isinstance(negative, dict):
        F.add(
            "USF-RUNTIME-040",
            str(RUNTIME_PRODUCT_READINESS_MAP_PATH),
            "authSessionTenantNegativePathAuditTelemetryProof is missing",
        )
        negative = {}
    for field in (
        "apiTenantMismatchFailClosed",
        "apiAuthorizationFailureFailClosed",
        "workerTenantBoundaryDenied",
        "workerAuthorizationDenied",
        "auditEvidenceCaptured",
        "telemetryEvidenceCaptured",
        "redactionEvidenceCaptured",
        "correlationPolicyDefined",
        "missingSemanticsFailClosed",
    ):
        if negative.get(field) is not True:
            F.add("USF-RUNTIME-040", f"authSessionTenantNegativePathAuditTelemetryProof.{field}", "negative-path proof field must be true")
    proof_commands = set(string_list(negative.get("proofCommandRefs")))
    for required in ("runtime:proof:in-memory", "runtime:proof:compose"):
        if required not in proof_commands:
            F.add("USF-RUNTIME-040", "authSessionTenantNegativePathAuditTelemetryProof.proofCommandRefs", f"missing {required}")
    if not string_list(negative.get("negativePathEvidenceRefs")):
        F.add("USF-RUNTIME-040", "authSessionTenantNegativePathAuditTelemetryProof.negativePathEvidenceRefs", "negative path refs are required")
    if not string_list(negative.get("auditTelemetryEvidenceRefs")):
        F.add("USF-RUNTIME-040", "authSessionTenantNegativePathAuditTelemetryProof.auditTelemetryEvidenceRefs", "audit/telemetry refs are required")


def run_checks(mode: str, state: dict[str, Any]) -> Findings:
    F = Findings()
    selected = {
        "manifest": [
            check_manifest,
            check_compose_mode,
            check_proof_surfaces,
            check_claims,
            check_service_catalogue_linkage,
            check_boundaries,
            check_deferred_boundaries,
            check_provider_bindings,
            check_lane5_provider_dispositions,
            check_lane5_hidden_in_memory_fallback,
            check_lane5_sdk_boundary,
            check_lane5_readiness_posture,
            check_lane5_provider_overclaim,
            check_analytics_event_store_disposition,
            check_clickhouse_service_proof_boundary,
            check_redis_cache_service_proof_boundary,
            check_pgbackrest_configured_proof_boundary,
            check_backup_restore_operational_depth,
            check_backup_restore_execution_proof,
            check_cache_eventing_disposition,
            check_composed_search_provider_disposition,
            check_file_scanner_provider_disposition,
            check_mock_provider_substrate_disposition,
            check_backup_restore_provider_disposition,
            check_operator_workflow_provider_disposition,
            check_windmill_configured_proof_boundary,
            check_runtime_product_readiness_map,
            check_provider_safe_metadata,
            check_provider_registry_linkage,
            check_dependency_pinning,
        ],
        "commands": [check_command_wiring],
        "source": [check_teardown, check_provider_sdk_boundary, check_provider_path_collision_safety],
        "all": [
            check_manifest,
            check_compose_mode,
            check_proof_surfaces,
            check_command_wiring,
            check_claims,
            check_service_catalogue_linkage,
            check_teardown,
            check_boundaries,
            check_deferred_boundaries,
            check_provider_bindings,
            check_lane5_provider_dispositions,
            check_lane5_hidden_in_memory_fallback,
            check_lane5_sdk_boundary,
            check_lane5_readiness_posture,
            check_lane5_provider_overclaim,
            check_analytics_event_store_disposition,
            check_clickhouse_service_proof_boundary,
            check_redis_cache_service_proof_boundary,
            check_pgbackrest_configured_proof_boundary,
            check_backup_restore_operational_depth,
            check_backup_restore_execution_proof,
            check_cache_eventing_disposition,
            check_composed_search_provider_disposition,
            check_file_scanner_provider_disposition,
            check_mock_provider_substrate_disposition,
            check_backup_restore_provider_disposition,
            check_operator_workflow_provider_disposition,
            check_windmill_configured_proof_boundary,
            check_runtime_product_readiness_map,
            check_provider_sdk_boundary,
            check_provider_path_collision_safety,
            check_provider_safe_metadata,
            check_provider_registry_linkage,
            check_dependency_pinning,
        ],
    }[mode]
    for check in selected:
        check(F, state)
    return F


def run_selftest() -> Findings:
    F = Findings()
    planted_paths = sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json"))
    if not (ROOT / PLANTED_DEFECT_DIR).exists():
        F.add("USF-RUNTIME-SELFTEST", str(PLANTED_DEFECT_DIR), "planted defect directory is missing")
        return F
    if not planted_paths:
        F.add("USF-RUNTIME-SELFTEST", str(PLANTED_DEFECT_DIR), "planted defect directory has no JSON fixtures")
        return F
    for path in planted_paths:
        try:
            defect = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-RUNTIME-SELFTEST", str(path.relative_to(ROOT)), f"cannot read planted defect: {exc}")
            continue
        expected = defect.get("expectedRule")
        state = load_state(defect)
        findings = run_checks("all", state)
        raised = {item["ruleId"] for item in findings.items}
        if expected not in raised:
            F.add(
                "USF-RUNTIME-SELFTEST",
                str(path.relative_to(ROOT)),
                f"expected {expected}, got {', '.join(sorted(raised)) or 'no findings'}",
            )
    return F


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["manifest", "commands", "source", "selftest", "all"])
    parser.add_argument("--json", action="store_true", help="emit JSON summary")
    args = parser.parse_args()
    os.chdir(ROOT)

    F = Findings()
    if args.mode in {"manifest", "commands", "source", "all"}:
        try:
            state = load_state()
        except Exception as exc:  # noqa: BLE001
            F.add("USF-RUNTIME-001", str(MANIFEST_PATH), f"cannot load runtime validation state: {exc}")
        else:
            F.items.extend(run_checks(args.mode, state).items)
    if args.mode in {"selftest", "all"}:
        F.items.extend(run_selftest().items)

    ok = not F.blocking_or_error()
    payload = {
        "ok": ok,
        "mode": args.mode,
        "rules": RULES,
        "findings": F.items,
    }
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        if ok:
            print(f"runtime validation passed ({args.mode})")
        else:
            for finding in F.items:
                print(f"{finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
