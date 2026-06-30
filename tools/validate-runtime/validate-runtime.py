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
    "USF-RUNTIME-SELFTEST": ("blocking", "planted runtime defect did not raise its expected rule"),
}

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path("spec/instances/runtime-proof/runtime-application-compose-parity.json")
SCHEMA_PATH = Path("spec/schemas/runtime-proof.schema.json")
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
        "followUpIssue": "USF-173",
        "boundaryRef": "usf-189-cache-provider-deferred",
        "allowedStatuses": {"unsupported-deferred"},
    },
    "usf-189-meilisearch-search-provider": {
        "serviceIds": ["meilisearch"],
        "providerIds": ["full-text-search-meilisearch-deferred"],
        "followUpIssue": "USF-174",
        "boundaryRef": "usf-189-search-provider-deferred",
        "allowedStatuses": {"unsupported-deferred"},
    },
    "usf-189-clamav-scanner-provider": {
        "serviceIds": ["clamav"],
        "providerIds": ["file-scan-clamav-deferred"],
        "followUpIssue": "USF-175",
        "boundaryRef": "usf-189-scanner-provider-deferred",
        "allowedStatuses": {"profile-gated"},
    },
    "usf-189-localstack-cloud-mock-provider": {
        "serviceIds": ["localstack"],
        "providerIds": ["provider-emulator-localstack-deferred"],
        "followUpIssue": "USF-176",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"profile-gated"},
    },
    "usf-189-wiremock-http-mock-provider": {
        "serviceIds": ["wiremock"],
        "providerIds": ["provider-mock-wiremock-deferred"],
        "followUpIssue": "USF-176",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"profile-gated"},
    },
    "usf-189-webhook-sink-capture-provider": {
        "serviceIds": ["webhook-sink"],
        "providerIds": ["notification-delivery-webhook-sink-deferred"],
        "followUpIssue": "USF-176",
        "boundaryRef": "usf-189-mock-provider-deferred",
        "allowedStatuses": {"compose-boundary-only"},
    },
    "usf-189-pgbackrest-backup-provider": {
        "serviceIds": ["pgbackrest"],
        "providerIds": ["backup-restore-pgbackrest-deferred"],
        "followUpIssue": "USF-177",
        "boundaryRef": "usf-189-backup-provider-deferred",
        "allowedStatuses": {"profile-gated"},
    },
    "usf-189-windmill-automation-provider": {
        "serviceIds": ["windmill", "windmill-worker", "windmill-postgres", "windmill-redis"],
        "providerIds": ["operational-job-engine-windmill-deferred"],
        "followUpIssue": "USF-178",
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
    r"(?:from\s+|import\()[\"'](?:pg|postgres|redis|ioredis|@aws-sdk|aws-sdk|minio|mailpit-api|nodemailer|twilio|@sendgrid|sendgrid|stripe|@temporalio/[^\"']+|@nats-io/transport-node|nats|keycloak-js|@keycloak/keycloak-admin-client|node-vault)[\"']"
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
