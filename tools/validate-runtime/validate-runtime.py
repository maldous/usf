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
    "USF-RUNTIME-SELFTEST": ("blocking", "planted runtime defect did not raise its expected rule"),
}

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path("spec/instances/runtime-proof/runtime-application-compose-parity.json")
SCHEMA_PATH = Path("spec/schemas/runtime-proof.schema.json")
ANALYTICS_EVENT_STORE_MATRIX_PATH = Path("docs/architecture/analytics-event-store-provider-disposition-matrix.json")
CLICKHOUSE_PROOF_BOUNDARY_PATH = Path("docs/architecture/clickhouse-service-semantic-proof-boundary.json")
REDIS_CACHE_PROOF_BOUNDARY_PATH = Path("docs/architecture/redis-cache-service-semantic-proof-boundary.json")
CACHE_EVENTING_MATRIX_PATH = Path("docs/architecture/cache-eventing-service-disposition-matrix.json")
COMPOSED_SEARCH_PROVIDER_MATRIX_PATH = Path("docs/architecture/composed-search-provider-disposition-matrix.json")
FILE_SCANNER_PROVIDER_MATRIX_PATH = Path("docs/architecture/file-scanner-provider-disposition-matrix.json")
MOCK_PROVIDER_SUBSTRATE_MATRIX_PATH = Path("docs/architecture/mock-provider-substrate-disposition-matrix.json")
BACKUP_RESTORE_PROVIDER_MATRIX_PATH = Path("docs/architecture/backup-restore-provider-disposition-matrix.json")
OPERATOR_WORKFLOW_PROVIDER_MATRIX_PATH = Path("docs/architecture/operator-workflow-provider-disposition-matrix.json")
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
MEILISEARCH_PROOF_SOURCE_PATH = Path("packages/proof/src/meilisearch-composed-proof.ts")
CLAMAV_PROOF_SOURCE_PATH = Path("packages/proof/src/clamav-composed-proof.ts")
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
        "sdkVersion": "26.2.5",
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
    "full-react-parity",
    "test-readiness",
}
ANALYTICS_EVENT_STORE_REQUIRED_ISSUES = {"USF-172", "USF-197", "USF-189", "USF-184", "USF-192", "USF-133"}
ANALYTICS_EVENT_STORE_REQUIRED_EVIDENCE_REFS = {
    "usf-172-soa-analytics-event-store-disposition",
    "usf-172-evidence-analytics-event-store-disposition",
    "usf-172-threat-clickhouse-overclaim",
    "usf-172-access-analytics-event-store",
    "usf-172-incident-vulnerability-analytics-event-store",
    "usf-172-privacy-analytics-event-store",
}
CLICKHOUSE_BOUNDARY_REQUIRED_ISSUES = {"USF-197", "USF-206", "USF-172", "USF-189", "USF-184", "USF-192", "USF-133"}
CLICKHOUSE_BOUNDARY_REQUIRED_EVIDENCE_REFS = {
    "usf-197-soa-clickhouse-proof-boundary",
    "usf-197-evidence-clickhouse-proof-boundary",
    "usf-197-threat-clickhouse-overclaim",
    "usf-197-access-clickhouse-proof-boundary",
    "usf-197-incident-vulnerability-clickhouse-proof-boundary",
    "usf-197-privacy-clickhouse-proof-boundary",
}
REDIS_CACHE_BOUNDARY_REQUIRED_ISSUES = {"USF-198", "USF-207", "USF-173", "USF-189", "USF-184", "USF-192", "USF-133"}
REDIS_CACHE_BOUNDARY_REQUIRED_EVIDENCE_REFS = {
    "usf-198-soa-redis-cache-proof-boundary",
    "usf-198-evidence-redis-cache-proof-boundary",
    "usf-198-threat-redis-cache-overclaim",
    "usf-198-access-redis-cache-proof-boundary",
    "usf-198-incident-vulnerability-redis-cache-proof-boundary",
    "usf-198-privacy-redis-cache-proof-boundary",
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
CACHE_EVENTING_REQUIRED_ISSUES = {"USF-173", "USF-198", "USF-189", "USF-184", "USF-192", "USF-133"}
CACHE_EVENTING_REQUIRED_EVIDENCE_REFS = {
    "usf-173-soa-cache-eventing-disposition",
    "usf-173-evidence-cache-eventing-disposition",
    "usf-173-threat-redis-nats-overclaim",
    "usf-173-access-cache-eventing",
    "usf-173-incident-vulnerability-cache-eventing",
    "usf-173-privacy-cache-eventing",
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
MOCK_PROVIDER_SUBSTRATE_REQUIRED_ISSUES = {"USF-176", "USF-201", "USF-189", "USF-184", "USF-192", "USF-133"}
MOCK_PROVIDER_SUBSTRATE_REQUIRED_EVIDENCE_REFS = {
    "usf-176-soa-mock-provider-substrate-disposition",
    "usf-176-evidence-mock-provider-substrate-disposition",
    "usf-176-threat-mock-provider-overclaim",
    "usf-176-access-mock-provider-substrate",
    "usf-176-incident-vulnerability-mock-provider-substrate",
    "usf-176-privacy-mock-provider-substrate",
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
BACKUP_RESTORE_PROVIDER_REQUIRED_ISSUES = {"USF-177", "USF-202", "USF-189", "USF-184", "USF-192", "USF-133"}
BACKUP_RESTORE_PROVIDER_REQUIRED_EVIDENCE_REFS = {
    "usf-177-soa-backup-restore-provider-disposition",
    "usf-177-evidence-backup-restore-provider-disposition",
    "usf-177-threat-pgbackrest-overclaim",
    "usf-177-access-backup-restore-provider",
    "usf-177-resilience-backup-restore-provider",
    "usf-177-incident-vulnerability-backup-restore-provider",
    "usf-177-privacy-backup-restore-provider",
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
        "providerIds": ["analytics-store-clickhouse-deferred"],
        "followUpIssue": "USF-172",
        "boundaryRef": "usf-189-analytics-provider-deferred",
        "allowedStatuses": {"unsupported-deferred"},
    },
    "usf-189-redis-cache-provider": {
        "serviceIds": ["redis"],
        "providerIds": ["cache-redis-deferred"],
        "followUpIssue": "USF-198",
        "boundaryRef": "usf-189-cache-provider-deferred",
        "allowedStatuses": {"unsupported-deferred"},
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
        "providerIds": ["provider-emulator-localstack-deferred"],
        "followUpIssue": "USF-201",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"profile-gated"},
    },
    "usf-189-wiremock-http-mock-provider": {
        "serviceIds": ["wiremock"],
        "providerIds": ["provider-mock-wiremock-deferred"],
        "followUpIssue": "USF-201",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"profile-gated"},
    },
    "usf-189-webhook-sink-capture-provider": {
        "serviceIds": ["webhook-sink"],
        "providerIds": ["notification-delivery-webhook-sink-deferred"],
        "followUpIssue": "USF-201",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"compose-boundary-only"},
    },
    "usf-189-pgbackrest-backup-provider": {
        "serviceIds": ["pgbackrest"],
        "providerIds": ["backup-restore-pgbackrest-deferred"],
        "followUpIssue": "USF-202",
        "boundaryRef": "usf-189-backup-provider-deferred",
        "allowedStatuses": {"profile-gated"},
    },
    "usf-189-windmill-automation-provider": {
        "serviceIds": ["windmill", "windmill-worker", "windmill-postgres", "windmill-redis"],
        "providerIds": ["operational-job-engine-windmill-deferred"],
        "followUpIssue": "USF-203",
        "boundaryRef": "usf-189-workflow-automation-provider-deferred",
        "allowedStatuses": {"profile-gated"},
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
    r"full dev readiness|full react parity|satisfies live|(?<!non-)equivalent to live|ready for production",
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
    "full-react",
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
    r"(?:from\s+|import\()[\"'](?:pg|postgres|redis|ioredis|@aws-sdk|aws-sdk|minio|mailpit-api|meilisearch|clamscan|nodemailer|twilio|@sendgrid|sendgrid|stripe|@temporalio/[^\"']+|@nats-io/transport-node|nats|keycloak-js|@keycloak/keycloak-admin-client|node-vault)[\"']"
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
    operator_workflow_provider_matrix: Any = None
    if not defect.get("removeOperatorWorkflowProviderMatrix"):
        operator_workflow_provider_matrix = read_json(OPERATOR_WORKFLOW_PROVIDER_MATRIX_PATH)
        if defect.get("operatorWorkflowProviderMatrixPatches"):
            operator_workflow_provider_matrix = apply_manifest_patches(
                operator_workflow_provider_matrix,
                defect["operatorWorkflowProviderMatrixPatches"],
            )
    package = read_json(PACKAGE_PATH)
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
        "schema": read_json(SCHEMA_PATH),
        "analyticsEventStoreMatrix": analytics_matrix,
        "clickhouseProofBoundary": clickhouse_boundary,
        "redisCacheProofBoundary": redis_cache_boundary,
        "cacheEventingMatrix": cache_eventing_matrix,
        "composedSearchProviderMatrix": composed_search_provider_matrix,
        "fileScannerProviderMatrix": file_scanner_provider_matrix,
        "mockProviderSubstrateMatrix": mock_provider_substrate_matrix,
        "backupRestoreProviderMatrix": backup_restore_provider_matrix,
        "operatorWorkflowProviderMatrix": operator_workflow_provider_matrix,
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
    if Draft202012Validator is not None:
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
            for field in ("adapterName", "portName", "endpointRef", "sdkPackage", "sdkVersion"):
                if not binding.get(field):
                    F.add("USF-RUNTIME-020", binding_id, f"implemented provider lacks {field}")
            if binding.get("sdkBoundary") != "adapter-package-only":
                F.add("USF-RUNTIME-020", binding_id, "implemented provider lacks adapter-package-only SDK boundary")
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
        if "USF-189" not in follow_ups:
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
        "followUpIssue": "USF-197",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "serviceId": "clickhouse",
        "providerRegistryId": "analytics-store-clickhouse-deferred",
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
            "disposition": "explicit-deferral-with-owner",
            "clickhouseServiceSemanticProofPresent": False,
            "analyticsReadinessClaim": False,
            "eventStoreReadinessClaim": False,
            "providerCompatibilityClaim": False,
            "serviceCatalogueServiceId": "clickhouse",
            "providerRegistryId": "analytics-store-clickhouse-deferred",
            "followUpIssue": "USF-197",
            "owner": "platform-data-foundation",
            "riskOwner": "platform-data-risk-owner",
            "controlOwner": "platform-data-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-023", f"analyticsEventStoreDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-RUNTIME-023", f"analyticsEventStoreDisposition.{field}", "deferral field is required")

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
            "providerRegistryId": "analytics-store-clickhouse-deferred",
            "bindingStatus": "unsupported-deferred",
            "providerMode": "live-external-deferred",
            "runtimeProviderBindingActive": False,
            "sdkPackage": None,
            "sdkVersion": None,
            "endpointRef": None,
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
        if "USF-197" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "runtime manifest must link USF-197")
        if "USF-197" not in str(binding.get("deferredReason", "")):
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider.deferredReason", "runtime manifest must defer service-semantic proof to USF-197")
        if binding.get("bindingStatus") != "unsupported-deferred" or binding.get("endpointRef") is not None:
            F.add("USF-RUNTIME-023", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "ClickHouse must remain explicitly deferred without endpoint binding")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-analytics-provider-deferred")
    if not deferred or "USF-197" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-023", "deferredBoundaries.usf-189-analytics-provider-deferred", "runtime deferred boundary must link USF-197")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in ("until USF-172 closes", "followUpIssue=USF-172", "\"followUpIssue\": \"USF-172\""):
        if stale in matrix_text:
            F.add("USF-RUNTIME-023", "analytics-event-store-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_clickhouse_service_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("clickhouseProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-030", str(CLICKHOUSE_PROOF_BOUNDARY_PATH), "ClickHouse proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-197",
        "followUpIssue": "USF-206",
        "sourceDispositionIssue": "USF-172",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "status": "reclassified-deferred-with-owner",
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
    if set(boundary.get("providerRegistryIds", [])) != {"analytics-store-clickhouse-deferred"}:
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
            "from": "explicit-deferral-with-owner",
            "to": "explicit-deferred-service-proof",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": False,
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
        if len(reclassification.get("repositoryEvidence", [])) < 6:
            F.add("USF-RUNTIME-030", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-RUNTIME-030", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "USF-206",
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
        if len(remaining.get("requiredEvidence", [])) < 8:
            F.add("USF-RUNTIME-030", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    analytics = boundary.get("analyticsEventStoreBoundary", {})
    for field in (
        "eventIngestionStatus",
        "tenantSafeQueryStatus",
        "retentionDeletionStatus",
        "auditEvidenceStatus",
        "readinessRetryStatus",
        "teardownCleanupStatus",
        "providerFailureHandlingStatus",
    ):
        if analytics.get(field) != "deferred-to-USF-206":
            F.add("USF-RUNTIME-030", f"analyticsEventStoreBoundary.{field}", "analytics boundary must defer to USF-206")
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not analytics.get(field):
            F.add("USF-RUNTIME-030", f"analyticsEventStoreBoundary.{field}", "analytics boundary owner metadata is required")

    sdk = boundary.get("sdkProviderBoundary", {})
    if sdk.get("sdkSelectionStatus") != "deferred-to-USF-206":
        F.add("USF-RUNTIME-030", "sdkProviderBoundary.sdkSelectionStatus", "SDK selection must defer to USF-206")
    if sdk.get("sdkPackage") is not None or sdk.get("sdkVersion") is not None:
        F.add("USF-RUNTIME-030", "sdkProviderBoundary", "deferred ClickHouse boundary must not name an SDK package")
    if sdk.get("sdkBoundary") != "adapter-package-only-when-implemented":
        F.add("USF-RUNTIME-030", "sdkProviderBoundary.sdkBoundary", "SDK boundary must remain adapter-only when implemented")
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

    matrix = state.get("analyticsEventStoreMatrix") or {}
    if "USF-206" not in set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-030", "analyticsEventStoreMatrix.issueLinks", "analytics matrix must link USF-206")
    if matrix.get("remainingProofIssue") != "USF-206":
        F.add("USF-RUNTIME-030", "analyticsEventStoreMatrix.remainingProofIssue", "analytics matrix must carry USF-206 as remaining proof")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-clickhouse-analytics-provider")
    if not binding or "USF-206" not in binding.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-030", "providerBindingMatrix.usf-189-clickhouse-analytics-provider", "runtime manifest must link USF-206")
    if binding and "USF-206" not in str(binding.get("deferredReason", "")):
        F.add("USF-RUNTIME-030", "providerBindingMatrix.usf-189-clickhouse-analytics-provider.deferredReason", "runtime manifest must defer actual proof to USF-206")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-analytics-provider-deferred")
    if not deferred or "USF-206" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-030", "deferredBoundaries.usf-189-analytics-provider-deferred", "runtime deferred boundary must link USF-206")


def check_redis_cache_service_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("redisCacheProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-RUNTIME-031", str(REDIS_CACHE_PROOF_BOUNDARY_PATH), "Redis cache proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-198",
        "followUpIssue": "USF-207",
        "sourceDispositionIssue": "USF-173",
        "laneIssue": "USF-189",
        "parentIssue": "USF-133",
        "status": "reclassified-deferred-with-owner",
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
    if set(boundary.get("providerRegistryIds", [])) != {"cache-redis-deferred"}:
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
            "from": "explicit-deferral-with-owner",
            "to": "explicit-deferred-service-proof",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": False,
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
        if len(reclassification.get("repositoryEvidence", [])) < 6:
            F.add("USF-RUNTIME-031", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-RUNTIME-031", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "USF-207",
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
        if len(remaining.get("requiredEvidence", [])) < 8:
            F.add("USF-RUNTIME-031", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    cache_boundary = boundary.get("cacheProviderBoundary", {})
    for field in (
        "writeReadStatus",
        "expirationTtlStatus",
        "retryTimeoutStatus",
        "failClosedStatus",
        "auditEvidenceStatus",
        "readinessRetryStatus",
        "teardownCleanupStatus",
        "providerFailureHandlingStatus",
    ):
        if cache_boundary.get(field) != "deferred-to-USF-207":
            F.add("USF-RUNTIME-031", f"cacheProviderBoundary.{field}", "Redis cache boundary must defer to USF-207")
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not cache_boundary.get(field):
            F.add("USF-RUNTIME-031", f"cacheProviderBoundary.{field}", "Redis cache boundary owner metadata is required")

    sdk = boundary.get("sdkProviderBoundary", {})
    if sdk.get("sdkSelectionStatus") != "deferred-to-USF-207":
        F.add("USF-RUNTIME-031", "sdkProviderBoundary.sdkSelectionStatus", "SDK selection must defer to USF-207")
    if sdk.get("sdkPackage") is not None or sdk.get("sdkVersion") is not None:
        F.add("USF-RUNTIME-031", "sdkProviderBoundary", "deferred Redis boundary must not name an SDK package")
    if sdk.get("sdkBoundary") != "adapter-package-only-when-implemented":
        F.add("USF-RUNTIME-031", "sdkProviderBoundary.sdkBoundary", "SDK boundary must remain adapter-only when implemented")
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

    matrix = state.get("cacheEventingMatrix") or {}
    if "USF-207" not in set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-031", "cacheEventingMatrix.issueLinks", "cache/eventing matrix must link USF-207")
    if matrix.get("remainingProofIssue") != "USF-207":
        F.add("USF-RUNTIME-031", "cacheEventingMatrix.remainingProofIssue", "cache/eventing matrix must carry USF-207 as remaining proof")

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-redis-cache-provider")
    if not binding or "USF-207" not in binding.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-031", "providerBindingMatrix.usf-189-redis-cache-provider", "runtime manifest must link USF-207")
    if binding and "USF-207" not in str(binding.get("deferredReason", "")):
        F.add("USF-RUNTIME-031", "providerBindingMatrix.usf-189-redis-cache-provider.deferredReason", "runtime manifest must defer actual proof to USF-207")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-cache-provider-deferred")
    if not deferred or "USF-207" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-031", "deferredBoundaries.usf-189-cache-provider-deferred", "runtime deferred boundary must link USF-207")


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
            "providerRegistryId": "cache-redis-deferred",
            "disposition": "explicit-deferral-with-owner",
            "followUpIssue": "USF-198",
            "readinessClaim": False,
        }
        for key, expected in expected_cache.items():
            observed = cache_role.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-RUNTIME-024", f"semanticRoleClassification.cache.{key}", f"expected {expected!r}")
        if "neither NATS nor process memory" not in str(cache_role.get("nonEquivalenceBoundary", "")):
            F.add("USF-RUNTIME-024", "semanticRoleClassification.cache.nonEquivalenceBoundary", "Redis deferral must reject NATS and process-memory equivalence")
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
            "disposition": "explicit-split-with-cache-deferral",
            "cacheServiceSemanticProofPresent": False,
            "redisServiceSemanticProofPresent": False,
            "natsEventBusProofPresent": True,
            "natsRedisEquivalent": False,
            "inMemoryRedisEquivalent": False,
            "redisReadinessClaim": False,
            "cacheReadinessClaim": False,
            "eventingReadinessClaim": False,
            "redisProviderRegistryId": "cache-redis-deferred",
            "natsProviderRegistryId": "event-bus-nats-composed-test",
            "followUpIssue": "USF-198",
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
            "providerRegistryId": "cache-redis-deferred",
            "bindingStatus": "unsupported-deferred",
            "providerMode": "live-external-deferred",
            "runtimeProviderBindingActive": False,
            "sdkPackage": None,
            "sdkVersion": None,
            "endpointRef": None,
            "followUpIssue": "USF-198",
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
        if "USF-198" not in redis_binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider", "runtime manifest must link USF-198")
        if "USF-198" not in str(redis_binding.get("deferredReason", "")):
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider.deferredReason", "runtime manifest must defer service-semantic proof to USF-198")
        if redis_binding.get("bindingStatus") != "unsupported-deferred" or redis_binding.get("endpointRef") is not None:
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider", "Redis must remain explicitly deferred without endpoint binding")
        if redis_binding.get("sdkPackage") is not None or redis_binding.get("sdkVersion") is not None:
            F.add("USF-RUNTIME-024", "providerBindingMatrix.usf-189-redis-cache-provider", "deferred Redis must not name an SDK/client package")

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
        "sourceIssue": "USF-176",
        "followUpIssue": "USF-201",
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
        "provider-emulator-localstack-deferred",
        "provider-mock-wiremock-deferred",
        "notification-delivery-webhook-sink-deferred",
    }
    if required_providers - set(matrix.get("providerRegistryIds", [])):
        F.add("USF-RUNTIME-027", "providerRegistryIds", "mock provider registry ids are incomplete")
    if MOCK_PROVIDER_SUBSTRATE_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-RUNTIME-027", "issueLinks", "mock provider substrate issue links are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-RUNTIME-027", "nonClaims", "mock provider substrate non-claims are incomplete")
    if REQUIRED_PROHIBITED_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
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
            "disposition": "explicit-deferral-with-owner",
            "localstackServiceSemanticProofPresent": False,
            "wiremockServiceSemanticProofPresent": False,
            "webhookSinkProviderProofPresent": False,
            "mockOidcComposeServiceProofPresent": False,
            "hermeticMockLiveProviderEquivalent": False,
            "wiremockLiveProviderEquivalent": False,
            "localstackLiveCloudProviderEquivalent": False,
            "webhookSinkNotificationDeliveryEquivalent": False,
            "mockProviderCompletenessClaim": False,
            "liveProviderReadinessClaim": False,
            "externalProviderCompatibilityClaim": False,
            "followUpIssue": "USF-201",
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
            "providerRegistryId": "provider-emulator-localstack-deferred",
        },
        "wiremock": {
            "providerBindingId": "usf-189-wiremock-http-mock-provider",
            "providerRegistryId": "provider-mock-wiremock-deferred",
        },
        "webhook-sink": {
            "providerBindingId": "usf-189-webhook-sink-capture-provider",
            "providerRegistryId": "notification-delivery-webhook-sink-deferred",
        },
        "mock-oidc": {
            "providerBindingId": "not-runtime-compose-binding",
            "providerRegistryId": "identity-mock-oidc-catalogue-boundary",
        },
    }
    for service_id, expected in required_classifications.items():
        item = classifications.get(service_id)
        if not item:
            F.add("USF-RUNTIME-027", "mockSubstrateClassifications", f"missing {service_id}")
            continue
        if item.get("status") != "deferred-with-owner" or item.get("followUpIssue") != "USF-201":
            F.add("USF-RUNTIME-027", f"mockSubstrateClassifications.{service_id}", "classification must defer to USF-201")
        if item.get("proofPresent") is not False:
            F.add("USF-RUNTIME-027", f"mockSubstrateClassifications.{service_id}.proofPresent", "proof must not be claimed")
        for key, expected_value in expected.items():
            if item.get(key) != expected_value:
                F.add("USF-RUNTIME-027", f"mockSubstrateClassifications.{service_id}.{key}", f"expected {expected_value!r}")
        if not item.get("nonEquivalenceBoundary"):
            F.add("USF-RUNTIME-027", f"mockSubstrateClassifications.{service_id}.nonEquivalenceBoundary", "non-equivalence boundary is required")

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
            "providerRegistryId": "provider-emulator-localstack-deferred",
            "bindingStatus": "profile-gated",
            "serviceCatalogueServiceId": "localstack",
        },
        "usf-189-wiremock-http-mock-provider": {
            "providerRegistryId": "provider-mock-wiremock-deferred",
            "bindingStatus": "profile-gated",
            "serviceCatalogueServiceId": "wiremock",
        },
        "usf-189-webhook-sink-capture-provider": {
            "providerRegistryId": "notification-delivery-webhook-sink-deferred",
            "bindingStatus": "compose-boundary-only",
            "serviceCatalogueServiceId": "webhook-sink",
        },
    }
    for binding_id, expected in expected_boundaries.items():
        item = boundaries.get(binding_id)
        if not item:
            F.add("USF-RUNTIME-027", "providerBoundaries", f"missing {binding_id}")
            continue
        common = {
            "providerMode": "live-external-deferred",
            "runtimeProviderBindingActive": False,
            "sdkPackage": None,
            "sdkVersion": None,
            "endpointRef": None,
            "followUpIssue": "USF-201",
        }
        for key, expected_value in {**expected, **common}.items():
            observed = item.get(key)
            if observed is not expected_value if isinstance(expected_value, bool) or expected_value is None else observed != expected_value:
                F.add("USF-RUNTIME-027", f"providerBoundaries.{binding_id}.{key}", f"expected {expected_value!r}")

    operational = matrix.get("operationalEvidencePosture", {})
    if not isinstance(operational, dict):
        F.add("USF-RUNTIME-027", "operationalEvidencePosture", "operational evidence posture must be an object")
    else:
        expected_operational = {
            "readinessRetry": "deferred-to-USF-201",
            "timeout": "deferred-to-USF-201",
            "failClosed": "bounded-provider-registry-proof-only",
            "noExternalEgress": "required-before-mock-substrate-readiness-claim",
            "safeTeardown": "deferred-to-USF-201",
        }
        for key, expected in expected_operational.items():
            if operational.get(key) != expected:
                F.add("USF-RUNTIME-027", f"operationalEvidencePosture.{key}", f"expected {expected!r}")
        for field in (
            "structuredLogging",
            "tracingCorrelation",
            "metrics",
            "auditEvents",
            "redaction",
            "syntheticData",
        ):
            if field not in operational:
                F.add("USF-RUNTIME-027", f"operationalEvidencePosture.{field}", "operational field is required")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    if declared_evidence != MOCK_PROVIDER_SUBSTRATE_REQUIRED_EVIDENCE_REFS:
        F.add("USF-RUNTIME-027", "enterpriseEvidenceRefs", "mock provider substrate enterprise evidence refs are incomplete")

    bindings = binding_records(state["manifest"])
    for binding_id in expected_boundaries:
        binding = bindings.get(binding_id)
        if not binding:
            F.add("USF-RUNTIME-027", "providerBindingMatrix", f"mock provider disposition is missing from runtime manifest: {binding_id}")
            continue
        if "USF-201" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-027", f"providerBindingMatrix.{binding_id}", "runtime manifest must link USF-201")
        if "USF-201" not in str(binding.get("deferredReason", "")):
            F.add("USF-RUNTIME-027", f"providerBindingMatrix.{binding_id}.deferredReason", "runtime manifest must defer service-semantic proof to USF-201")
        if binding.get("endpointRef") is not None:
            F.add("USF-RUNTIME-027", f"providerBindingMatrix.{binding_id}", "deferred mock provider must not expose endpoint binding")
        if binding.get("sdkPackage") is not None or binding.get("sdkVersion") is not None:
            F.add("USF-RUNTIME-027", f"providerBindingMatrix.{binding_id}", "deferred mock provider must not name an SDK/client package")

    deferred = {
        item.get("id"): item
        for item in state["manifest"].get("deferredBoundaries", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }.get("usf-189-mock-provider-deferred")
    if not deferred or "USF-201" not in deferred.get("followUpIssueRefs", []):
        F.add("USF-RUNTIME-027", "deferredBoundaries.usf-189-mock-provider-deferred", "runtime deferred boundary must link USF-201")

    matrix_text = json.dumps(matrix, sort_keys=True)
    for stale in ("until USF-176 closes", "followUpIssue=USF-176", "\"followUpIssue\": \"USF-176\"", "linkedFollowUpIssue=USF-176"):
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
        if "USF-202" not in str(binding.get("deferredReason", "")):
            F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider.deferredReason", "runtime manifest must defer service-semantic proof to USF-202")
        if binding.get("bindingStatus") != "profile-gated" or binding.get("endpointRef") is not None:
            F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "pgBackRest must remain explicitly deferred/profile-gated without endpoint binding")
        if binding.get("sdkPackage") is not None or binding.get("sdkVersion") is not None:
            F.add("USF-RUNTIME-028", "providerBindingMatrix.usf-189-pgbackrest-backup-provider", "deferred pgBackRest must not name an SDK/client package")

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

    bindings = binding_records(state["manifest"])
    binding = bindings.get("usf-189-windmill-automation-provider")
    if not binding:
        F.add("USF-RUNTIME-029", "providerBindingMatrix", "Windmill provider disposition is missing from runtime manifest")
    else:
        if "USF-203" not in binding.get("followUpIssueRefs", []):
            F.add("USF-RUNTIME-029", "providerBindingMatrix.usf-189-windmill-automation-provider", "runtime manifest must link USF-203")
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
            check_cache_eventing_disposition,
            check_composed_search_provider_disposition,
            check_file_scanner_provider_disposition,
            check_mock_provider_substrate_disposition,
            check_backup_restore_provider_disposition,
            check_operator_workflow_provider_disposition,
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
            check_cache_eventing_disposition,
            check_composed_search_provider_disposition,
            check_file_scanner_provider_disposition,
            check_mock_provider_substrate_disposition,
            check_backup_restore_provider_disposition,
            check_operator_workflow_provider_disposition,
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
    for path in sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json")):
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
