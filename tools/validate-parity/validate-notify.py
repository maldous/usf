#!/usr/bin/env python3
"""USF notifications/messaging posture validator (parity-notifications-messaging, USF-133).

Governance tooling only. It creates no implementation/runtime files, imports no external
source, and publishes no evidence. It fails closed on controlled-communication
invariants: classified tenant-scoped notifications, PDP-guarded actions, secret-ref
provider config, safe versioned templates, recipient address redaction, consent and
suppression checks, idempotent delivery jobs, bounded retry/dead-letter evidence,
value-free audit, honest source-use, and no live-provider or certification claim.
"""
import argparse
import json
import os
import sys
from collections import Counter

RULES = {
    "USF-NOTIFY-001": ("blocking", "notification semantic model missing"),
    "USF-NOTIFY-002": ("blocking", "Notifications & Messaging Standard missing or overclaims"),
    "USF-NOTIFY-003": ("blocking", "provider abstraction/config does not use secret refs and deferred live mode"),
    "USF-NOTIFY-004": ("blocking", "notification actions are not PDP-guarded"),
    "USF-NOTIFY-005": ("blocking", "template model lacks version/hash/classification or safe renderer"),
    "USF-NOTIFY-006": ("blocking", "secret-looking notification content is not rejected/redacted"),
    "USF-NOTIFY-007": ("blocking", "recipient address safety/redaction missing"),
    "USF-NOTIFY-008": ("blocking", "consent/suppression rules missing"),
    "USF-NOTIFY-009": ("blocking", "delivery jobs lack idempotency"),
    "USF-NOTIFY-010": ("blocking", "retry/dead-letter evidence missing or unbounded"),
    "USF-NOTIFY-011": ("blocking", "notification lifecycle audit events missing"),
    "USF-NOTIFY-012": ("blocking", "notify proof missing or makes live/certification overclaim"),
    "USF-NOTIFY-013": ("blocking", "notification tests missing required behaviours"),
    "USF-NOTIFY-014": ("blocking", "notifications parity matrix row lacks authorisation/backing"),
    "USF-NOTIFY-015": ("blocking", "notifications source-use matrix missing"),
    "USF-NOTIFY-016": ("blocking", "OpenAPI contains raw notification secrets or recipient data"),
    "USF-NOTIFY-017": ("blocking", "enterprise notification control-plane helper is missing"),
    "USF-NOTIFY-018": ("blocking", "USF-153 enterprise notification proof markers are missing"),
    "USF-NOTIFY-019": ("blocking", "USF-153 enterprise notification proof-depth matrix is incomplete"),
    "USF-NOTIFY-020": ("blocking", "USF-153 enterprise evidence rows are missing"),
    "USF-NOTIFY-021": ("blocking", "notifications enterprise depth proof overclaims live, deliverability, or readiness posture"),
    "USF-NOTIFY-SELFTEST": ("blocking", "planted notifications defect did not raise its expected rule"),
}

CORE = "packages/core/src/index.ts"
PORTS = "packages/ports/src/index.ts"
NOTIFY = "capabilities/notify/src/index.ts"
ENTERPRISE_CONTROLS = "capabilities/notify/src/enterprise-messaging-controls.ts"
ADAPTER = "adapters/mail/src/index.ts"
POLICY = "capabilities/tenant/src/authorization-policy.ts"
PROOF = "packages/proof/src/notifications-messaging-proof.ts"
TESTS = "tests/capabilities/notifications-messaging.test.ts"
OPENAPI = "packages/openapi/openapi.json"
STANDARD = "docs/architecture/notifications-and-messaging-standard.md"
SOURCE_USE = "docs/architecture/notifications-messaging-source-use-disposition-matrix.md"
DEPTH_MATRIX_PATH = "docs/architecture/notifications-messaging-enterprise-proof-depth-matrix.json"
ENTERPRISE_EVIDENCE_PATH = "spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json"
MATRIX_PATH = "docs/architecture/functional-scope-classification-matrix.json"
SOURCE_FILES = (
    CORE,
    PORTS,
    NOTIFY,
    ENTERPRISE_CONTROLS,
    ADAPTER,
    POLICY,
    PROOF,
    TESTS,
    OPENAPI,
    STANDARD,
    SOURCE_USE,
    DEPTH_MATRIX_PATH,
    ENTERPRISE_EVIDENCE_PATH,
)
SELFTEST_DIR = "tools/validate-parity/notify-planted-defects"

OPENAPI_SECRET_NEEDLES = [
    "Bearer ",
    "sk_",
    "client_secret",
    "private_key",
    "recipientAddressRef",
    "@example.test",
]


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        severity = RULES.get(rule_id, ("error", ""))[0]
        self.items.append({
            "severity": severity,
            "ruleId": rule_id,
            "subject": str(subject),
            "message": message or RULES.get(rule_id, ("", ""))[1],
        })

    def blocking_or_error(self):
        return [f for f in self.items if f["severity"] in ("blocking", "error")]


def find_root(start):
    current = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(current, "docs")) and os.path.isdir(os.path.join(current, "spec")):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            return os.path.abspath(start)
        current = parent


ROOT = find_root(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


def read_text(path):
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def load_matrix():
    if not os.path.exists(MATRIX_PATH):
        return None
    try:
        with open(MATRIX_PATH, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001
        return None


def load_json(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:  # noqa: BLE001
        return None


def build_state(overrides=None):
    overrides = overrides or {}
    files = {path: read_text(path) for path in SOURCE_FILES}
    for path, text in overrides.get("files", {}).items():
        files[path] = text
    matrix = overrides["matrix"] if "matrix" in overrides else load_matrix()
    depth_matrix = overrides["depthMatrix"] if "depthMatrix" in overrides else load_json(DEPTH_MATRIX_PATH)
    enterprise_evidence = overrides["enterpriseEvidence"] if "enterpriseEvidence" in overrides else load_json(ENTERPRISE_EVIDENCE_PATH)
    return {
        "files": files,
        "matrix": matrix,
        "depthMatrix": depth_matrix,
        "enterpriseEvidence": enterprise_evidence,
    }


def notification_rows(matrix):
    if not isinstance(matrix, dict):
        return []
    return [
        row
        for row in matrix.get("domains", [])
        if isinstance(row, dict) and "notification" in str(row.get("source_item_id", ""))
    ]


def enterprise_rows(model, section):
    if not isinstance(model, dict):
        return {}
    rows = model.get(section, [])
    if not isinstance(rows, list):
        return {}
    return {row.get("id"): row for row in rows if isinstance(row, dict)}


def run_checks(F, state=None):
    state = state or build_state()
    files = state["files"]
    core = files.get(CORE, "")
    ports = files.get(PORTS, "")
    notify = files.get(NOTIFY, "")
    enterprise_controls = files.get(ENTERPRISE_CONTROLS, "")
    adapter = files.get(ADAPTER, "")
    policy = files.get(POLICY, "")
    proof = files.get(PROOF, "")
    tests = files.get(TESTS, "")
    openapi = files.get(OPENAPI, "")
    standard = files.get(STANDARD, "")
    source_use = files.get(SOURCE_USE, "")
    depth_matrix = state.get("depthMatrix")
    enterprise_evidence = state.get("enterpriseEvidence")

    for token in (
        "NOTIFICATION_CLASSIFICATIONS",
        '"authentication"',
        '"maintenance"',
        "NOTIFICATION_CHANNELS",
        '"provider-internal"',
        "NOTIFICATION_DELIVERY_STATUSES",
        '"provider-unknown"',
        "NotificationIntent",
        "NotificationDeliveryEvidence",
    ):
        if token not in core:
            F.add("USF-NOTIFY-001", CORE, f"missing notification semantic token {token}")

    if not standard:
        F.add("USF-NOTIFY-002", STANDARD, "Notifications & Messaging Standard must exist")
    else:
        for phrase in (
            "controlled communications",
            "notification: an intent to communicate",
            "message: a rendered channel-specific payload",
            "delivery evidence",
            "ISO 27001-supporting technical control evidence only",
            "Do not claim ISO certification",
            "No live external delivery provider readiness",
        ):
            if phrase not in standard:
                F.add("USF-NOTIFY-002", STANDARD, f"standard missing phrase: {phrase}")

    if "interface NotificationProvider" not in ports or "NotificationProviderConfig" not in ports:
        F.add("USF-NOTIFY-003", PORTS, "NotificationProvider port/config must exist")
    if "InMemoryNotificationProvider" not in adapter:
        F.add("USF-NOTIFY-003", ADAPTER, "in-memory notification provider must exist")
    for token in ("SecretReference", "credentialRef", "secretRef", "live-external-deferred"):
        if token not in core + notify + adapter:
            F.add("USF-NOTIFY-003", CORE, f"provider config secret/deferred token missing: {token}")
    if "providerMode: \"live-external-deferred\"" in adapter or "productionLiveClaim: true" in proof:
        F.add("USF-NOTIFY-003", PROOF, "live/provider readiness overclaim")

    for action in (
        '"notification.create"',
        '"notification.read"',
        '"notification.list"',
        '"notification.send"',
        '"notification.cancel"',
        '"notification.retry"',
        '"notification.template.create"',
        '"notification.template.update"',
        '"notification.preference.update"',
        '"notification.suppression.update"',
        '"notification.provider.configure"',
        '"notification.bulk.send"',
    ):
        if action not in policy:
            F.add("USF-NOTIFY-004", POLICY, f"policy missing action {action}")
    if "pdp.decide" not in notify or "notification.denied" not in notify:
        F.add("USF-NOTIFY-004", NOTIFY, "notification capability must use PDP and audit denial")

    for token in (
        "templateVersion",
        "templateHash",
        "templateClassification",
        "allowedVariables",
        "renderNotificationTemplate",
        "notificationTemplateHash",
        "immutableAfterFirstUse",
        "firstUsedAt",
    ):
        if token not in core + notify:
            F.add("USF-NOTIFY-005", CORE, f"template governance token missing: {token}")
    if "export function notificationTemplateHash" not in core:
        F.add("USF-NOTIFY-005", CORE, "template hash function must be exported")
    if "eval(" in notify + core or "new Function" in notify + core:
        F.add("USF-NOTIFY-005", NOTIFY, "template rendering must not execute arbitrary code")
    for token in ("missing-variable", "unknown-variable", "secret-like-value"):
        if token not in core + notify + tests:
            F.add("USF-NOTIFY-005", CORE, f"template fail-closed behaviour missing: {token}")

    for token in (
        "containsSecretLikeNotificationContent",
        "looksLikeSecretValue",
        "safeFailureMessage",
        "object_key",
        "connection_string",
        "bearer",
        "jwt",
    ):
        if token not in core + notify + adapter:
            F.add("USF-NOTIFY-006", CORE, f"secret-safety token missing: {token}")

    if "notificationAddressHash" not in core + notify + adapter:
        F.add("USF-NOTIFY-007", CORE, "recipient address must be represented by a hash in evidence")
    if "recipientAddressRef" not in ports or "recipientAddressHash" not in ports:
        F.add("USF-NOTIFY-007", PORTS, "provider boundary must distinguish raw address input from safe hash")
    if "recipientAddressHash" not in notify or "addressRef" not in core:
        F.add("USF-NOTIFY-007", NOTIFY, "recipient identity/address model missing")
    if "recipientAddressRef:" in adapter and "recipientAddressHash:" not in adapter:
        F.add("USF-NOTIFY-007", ADAPTER, "adapter may capture raw recipient address")

    for token in (
        "CONSENT_STATUSES",
        "SUPPRESSION_REASONS",
        "notificationRequiresConsent",
        "evaluateNotificationDeliveryPolicy",
        "consent-required",
        "do-not-contact",
        "recipient-opted-out",
    ):
        if token not in core + notify + tests:
            F.add("USF-NOTIFY-008", CORE, f"consent/suppression token missing: {token}")
    if "export function notificationRequiresConsent" not in core:
        F.add("USF-NOTIFY-008", CORE, "marketing/bulk consent policy function missing")

    for token in (
        '"notification-job"',
        '"notification.delivery"',
        "idempotencyKey",
        "notificationDeliveryIdempotencyKey",
        "deduplicated",
    ):
        if token not in core + notify + tests + proof:
            F.add("USF-NOTIFY-009", NOTIFY, f"delivery idempotency token missing: {token}")
    if "idempotencyKey: notification.idempotencyKey" not in notify:
        F.add("USF-NOTIFY-009", NOTIFY, "delivery job must reuse notification idempotency key")

    for token in (
        "DEFAULT_NOTIFICATION_BACKOFF",
        "maxRetries",
        '"dead-lettered"',
        "createNotificationDeliveryEvidence",
        "retryCount",
        "deadLetterReason",
    ):
        if token not in core + notify + tests + proof:
            F.add("USF-NOTIFY-010", CORE, f"retry/dead-letter token missing: {token}")
    if 'terminal ? "dead-lettered" : "retrying"' not in notify:
        F.add("USF-NOTIFY-010", NOTIFY, "provider failure must end in dead-letter after bounded retry")

    for event in (
        '"notification.created"',
        '"notification.rendered"',
        '"notification.queued"',
        '"notification.sent"',
        '"notification.failed"',
        '"notification.retrying"',
        '"notification.dead_lettered"',
        '"notification.suppressed"',
        '"notification.cancelled"',
        '"notification.denied"',
        '"notification.read"',
        '"notification.template.created"',
        '"notification.template.changed"',
        '"notification.template.approved"',
        '"notification.preference.changed"',
        '"notification.suppression.changed"',
        '"notification.provider.changed"',
    ):
        if event not in core:
            F.add("USF-NOTIFY-011", CORE, f"notification audit event missing: {event}")
    if "createAuditEventDraft" not in notify or "notification-service" not in notify:
        F.add("USF-NOTIFY-011", NOTIFY, "notification lifecycle must be audit-recorded")

    if not proof:
        F.add("USF-NOTIFY-012", PROOF, "notify proof must exist")
    else:
        for token in (
            "runNotificationsMessagingProof",
            "liveExternalProviderClaim: false",
            "liveEmailProviderClaim: false",
            "liveSmsProviderClaim: false",
            "livePushProviderClaim: false",
            "liveSmtpClaim: false",
            "productionLiveClaim: false",
            "deliverabilityCertificationClaim: false",
            "iso27001CertificationClaim: false",
        ):
            if token not in proof:
                F.add("USF-NOTIFY-012", PROOF, f"proof missing boundary token {token}")

    for token in (
        "tenant A from read/list/retry/cancel/send",
        "missing tenant context",
        "without PDP permission",
        "secret references",
        "missing, unknown, or secret-looking template values",
        "redacts recipient addresses",
        "marketing/bulk consent",
        "idempotency keys",
        "dead-lettered",
        "cancelled or expired",
        "lifecycle audit",
        "live provider claims",
    ):
        if token not in tests:
            F.add("USF-NOTIFY-013", TESTS, f"notification test coverage missing phrase: {token}")

    rows = notification_rows(state["matrix"])
    if not rows:
        F.add("USF-NOTIFY-014", MATRIX_PATH, "notifications parity rows missing")
    else:
        main = next((row for row in rows if row.get("source_item_id") == "notifications"), rows[0])
        if main.get("domain_authorised") is not True:
            F.add("USF-NOTIFY-014", MATRIX_PATH, "notifications row must be domain_authorised=true")
        if not main.get("usf_tests") or not main.get("usf_proofs"):
            F.add("USF-NOTIFY-014", MATRIX_PATH, "notifications row must reference tests and proofs")
        if main.get("linear_issue") != "USF-152" and main.get("blocker") != "USF-152":
            F.add("USF-NOTIFY-014", MATRIX_PATH, "notifications row must reference USF-152")

    if not source_use:
        F.add("USF-NOTIFY-015", SOURCE_USE, "domain source-use matrix must exist")
    else:
        for token in (
            "packages/core/src/index.ts",
            "capabilities/notify/src/index.ts",
            "adapters/mail/src/index.ts",
            "tests/capabilities/notifications-messaging.test.ts",
            "packages/proof/src/notifications-messaging-proof.ts",
            "no external runtime/application code is copied",
            "No live external delivery provider readiness is claimed",
        ):
            if token not in source_use:
                F.add("USF-NOTIFY-015", SOURCE_USE, f"source-use missing {token}")

    for needle in OPENAPI_SECRET_NEEDLES:
        if needle in openapi:
            F.add("USF-NOTIFY-016", OPENAPI, f"raw notification secret/address content in OpenAPI: {needle!r}")

    if not enterprise_controls:
        F.add("USF-NOTIFY-017", ENTERPRISE_CONTROLS, "enterprise notification controls file must exist")
    else:
        for token in (
            "EnterpriseNotificationControlPlane",
            "NotificationEnterpriseEvidence",
            "issueId: \"USF-153\"",
            "recordPersistence",
            "commitTransactionalOutbox",
            "ingestProviderFeedback",
            "checkAddressVerification",
            "checkRateLimit",
            "recordProviderFailure",
            "runBulkCampaign",
            "purgeNotification",
            "buildEvidence",
            "liveProviderReadinessClaim: false",
            "deliverabilityReadinessClaim: false",
            "usf133ClosureClaim: false",
        ):
            if token not in enterprise_controls:
                F.add("USF-NOTIFY-017", ENTERPRISE_CONTROLS, f"enterprise control-plane token missing: {token}")
    if "createEnterpriseNotificationControlPlane" not in notify:
        F.add("USF-NOTIFY-017", NOTIFY, "enterprise notification control-plane export missing")

    for token in (
        "createEnterpriseNotificationControlPlane",
        "enterpriseMessagingDepthProven: true",
        "dbBackedPersistenceBoundaryExplicit",
        "transactionalOutboxProven",
        "providerFeedbackIngestionProven",
        "unsubscribeIngestionProven",
        "retentionPurgeProven",
        "bulkCampaignRuntimeProven",
        "notificationRateLimitProven",
        "addressVerificationProven",
        "providerCircuitBreakerProven",
        "apiSurfaceReclassified",
        "uiSurfaceDeferred",
        "enterpriseNotificationEvidence",
        "liveProviderReadinessClaim: false",
        "deliverabilityReadinessClaim: false",
        "stagingReadinessClaim: false",
        "socReadinessClaim: false",
        "fullDevReadinessClaim: false",
        "fullProductReadinessClaim: false",
        "usf133ClosureClaim: false",
    ):
        if token not in proof:
            F.add("USF-NOTIFY-018", PROOF, f"USF-153 proof marker missing: {token}")

    required_controls = {
        "bounded-db-persistence-contract",
        "transactional-outbox",
        "provider-feedback-ingestion",
        "unsubscribe-ingestion",
        "retention-purge-legal-hold",
        "bulk-campaign-runtime",
        "rate-limit-abuse-control",
        "address-verification",
        "provider-circuit-breaker",
        "api-surface-non-equivalent-substitute",
        "ui-surface-deferred",
        "live-provider-deliverability-deferred",
    }
    if not isinstance(depth_matrix, dict):
        F.add("USF-NOTIFY-019", DEPTH_MATRIX_PATH, "USF-153 enterprise proof-depth matrix must be valid JSON object")
    else:
        if depth_matrix.get("sourceIssue") != "USF-153":
            F.add("USF-NOTIFY-019", DEPTH_MATRIX_PATH, "matrix sourceIssue must be USF-153")
        if depth_matrix.get("proofCommand") != "make notify-proof":
            F.add("USF-NOTIFY-019", DEPTH_MATRIX_PATH, "matrix proof command must be make notify-proof")
        if depth_matrix.get("validatorCommand") != "python3 tools/validate-parity/validate-notify.py all --json":
            F.add("USF-NOTIFY-019", DEPTH_MATRIX_PATH, "matrix validator command must pin validate-notify")
        controls = {
            row.get("id")
            for row in depth_matrix.get("controls", [])
            if isinstance(row, dict)
        }
        missing_controls = required_controls - controls
        if missing_controls:
            F.add("USF-NOTIFY-019", DEPTH_MATRIX_PATH, f"missing controls: {sorted(missing_controls)}")
        refs = set(depth_matrix.get("enterpriseEvidenceRefs", []))
        for required_ref in (
            "soa-usf-153-notifications-messaging-enterprise-depth",
            "evidence-usf-153-notifications-messaging-enterprise-depth",
            "threat-usf-153-notifications-messaging-enterprise-depth",
            "access-usf-153-notifications-messaging-enterprise-depth",
            "resilience-usf-153-notifications-messaging-enterprise-depth",
            "incident-usf-153-notifications-messaging-enterprise-depth",
            "privacy-usf-153-notifications-messaging-enterprise-depth",
        ):
            if required_ref not in refs:
                F.add("USF-NOTIFY-019", DEPTH_MATRIX_PATH, f"missing enterprise evidence ref {required_ref}")
        claims = depth_matrix.get("claims", {})
        for key in (
            "liveProviderReadinessClaim",
            "deliverabilityReadinessClaim",
            "uiReadinessClaim",
            "stagingReadinessClaim",
            "productionReadinessClaim",
            "socReadinessClaim",
            "iso27001CertificationClaim",
            "fullDevReadinessClaim",
            "fullProductReadinessClaim",
            "usf133ClosureClaim",
        ):
            if claims.get(key) is not False:
                F.add("USF-NOTIFY-021", DEPTH_MATRIX_PATH, f"matrix claim must be false: {key}")

    required_evidence = {
        "soaSupportMappings": "soa-usf-153-notifications-messaging-enterprise-depth",
        "evidenceRegister": "evidence-usf-153-notifications-messaging-enterprise-depth",
        "threatModelAbuseCaseRegister": "threat-usf-153-notifications-messaging-enterprise-depth",
        "accessReviewPrivilegedOperationPosture": "access-usf-153-notifications-messaging-enterprise-depth",
        "backupRestoreResiliencePosture": "resilience-usf-153-notifications-messaging-enterprise-depth",
        "incidentVulnerabilityManagementEvidence": "incident-usf-153-notifications-messaging-enterprise-depth",
        "privacyDataMinimisationPosture": "privacy-usf-153-notifications-messaging-enterprise-depth",
    }
    for section, row_id in required_evidence.items():
        row = enterprise_rows(enterprise_evidence, section).get(row_id)
        if not row:
            F.add("USF-NOTIFY-020", ENTERPRISE_EVIDENCE_PATH, f"missing enterprise evidence row {row_id}")
            continue
        if "USF-153" not in json.dumps(row, sort_keys=True):
            F.add("USF-NOTIFY-020", ENTERPRISE_EVIDENCE_PATH, f"enterprise evidence row lacks USF-153 linkage: {row_id}")
        if "validate-notify" not in json.dumps(row, sort_keys=True) and section != "privacyDataMinimisationPosture":
            F.add("USF-NOTIFY-020", ENTERPRISE_EVIDENCE_PATH, f"enterprise evidence row lacks validator linkage: {row_id}")

    overclaim_needles = (
        "liveProviderReadinessClaim: true",
        "deliverabilityReadinessClaim: true",
        "productionReadinessClaim: true",
        "stagingReadinessClaim: true",
        "socReadinessClaim: true",
        "iso27001CertificationClaim: true",
        "fullDevReadinessClaim: true",
        "fullProductReadinessClaim: true",
        "usf133ClosureClaim: true",
        "liveProviderReadinessClaim\": true",
        "deliverabilityReadinessClaim\": true",
        "productionReadinessClaim\": true",
        "stagingReadinessClaim\": true",
        "socReadinessClaim\": true",
        "iso27001CertificationClaim\": true",
        "fullDevReadinessClaim\": true",
        "fullProductReadinessClaim\": true",
        "usf133ClosureClaim\": true",
    )
    overclaim_text = proof + "\n" + files.get(DEPTH_MATRIX_PATH, "")
    for needle in overclaim_needles:
        if needle in overclaim_text:
            F.add("USF-NOTIFY-021", PROOF, f"prohibited readiness claim present: {needle}")


def apply_mutation(base, mutation):
    files = dict(base["files"])
    matrix = json.loads(json.dumps(base["matrix"])) if base["matrix"] is not None else None
    depth_matrix = json.loads(json.dumps(base["depthMatrix"])) if base.get("depthMatrix") is not None else None
    enterprise_evidence = json.loads(json.dumps(base["enterpriseEvidence"])) if base.get("enterpriseEvidence") is not None else None
    target = mutation.get("file")
    if "replace" in mutation and target in files:
        files[target] = files[target].replace(mutation["replace"]["old"], mutation["replace"]["new"])
        if target == DEPTH_MATRIX_PATH:
            try:
                depth_matrix = json.loads(files[target])
            except Exception:  # noqa: BLE001
                depth_matrix = None
        if target == ENTERPRISE_EVIDENCE_PATH:
            try:
                enterprise_evidence = json.loads(files[target])
            except Exception:  # noqa: BLE001
                enterprise_evidence = None
    if "append" in mutation and target is not None:
        files[target] = files.get(target, "") + "\n" + mutation["append"]
    if "matrixNotificationsSet" in mutation and matrix is not None:
        rows = notification_rows(matrix)
        if rows:
            for key, value in mutation["matrixNotificationsSet"].items():
                rows[0][key] = value
    if "depthMatrixClaimsSet" in mutation and isinstance(depth_matrix, dict):
        claims = depth_matrix.setdefault("claims", {})
        for key, value in mutation["depthMatrixClaimsSet"].items():
            claims[key] = value
        files[DEPTH_MATRIX_PATH] = json.dumps(depth_matrix)
    if "depthMatrixRemoveControl" in mutation and isinstance(depth_matrix, dict):
        depth_matrix["controls"] = [
            row
            for row in depth_matrix.get("controls", [])
            if not isinstance(row, dict) or row.get("id") != mutation["depthMatrixRemoveControl"]
        ]
        files[DEPTH_MATRIX_PATH] = json.dumps(depth_matrix)
    if "removeEnterpriseEvidenceId" in mutation and isinstance(enterprise_evidence, dict):
        remove_id = mutation["removeEnterpriseEvidenceId"]
        for section in (
            "soaSupportMappings",
            "evidenceRegister",
            "threatModelAbuseCaseRegister",
            "accessReviewPrivilegedOperationPosture",
            "backupRestoreResiliencePosture",
            "incidentVulnerabilityManagementEvidence",
            "privacyDataMinimisationPosture",
        ):
            enterprise_evidence[section] = [
                row
                for row in enterprise_evidence.get(section, [])
                if not isinstance(row, dict) or row.get("id") != remove_id
            ]
        files[ENTERPRISE_EVIDENCE_PATH] = json.dumps(enterprise_evidence)
    return {
        "files": files,
        "matrix": matrix,
        "depthMatrix": depth_matrix,
        "enterpriseEvidence": enterprise_evidence,
    }


def load_selftest_fixtures(F):
    fixtures = []
    if not os.path.isdir(SELFTEST_DIR):
        return fixtures
    for name in sorted(os.listdir(SELFTEST_DIR)):
        if not name.endswith(".json"):
            continue
        path = f"{SELFTEST_DIR}/{name}"
        try:
            with open(path, encoding="utf-8") as handle:
                fixtures.append((path, json.load(handle)))
        except Exception as exc:  # noqa: BLE001
            F.add("USF-NOTIFY-SELFTEST", path, f"cannot load planted defect: {exc}")
    return fixtures


def run_selftest(F):
    base = build_state()
    fixtures = load_selftest_fixtures(F)
    for path, fixture in fixtures:
        expected = fixture.get("expectedRule")
        local = Findings()
        run_checks(local, build_state(apply_mutation(base, fixture.get("mutation", {}))))
        got = {item["ruleId"] for item in local.items}
        if expected not in got:
            F.add("USF-NOTIFY-SELFTEST", path, f"expected {expected}; got {sorted(got)}")
    return "not-run" if not fixtures else "ran"


def main():
    parser = argparse.ArgumentParser(description="USF notifications/messaging posture validator.")
    parser.add_argument("mode", nargs="?", default="all", choices=["notify", "selftest", "all"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    F = Findings()
    if args.mode in {"notify", "all"}:
        run_checks(F)
    selftest_state = None
    if args.mode in {"selftest", "all"}:
        selftest_state = run_selftest(F)

    if args.json:
        print(json.dumps({"mode": args.mode, "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(item["ruleId"] for item in F.items))
        suffix = "CLEAN" if not F.items else json.dumps(counts)
        if selftest_state == "not-run":
            suffix += "  (selftest: none present)"
        print(f"USF notifications validator [{args.mode}]: {suffix}")
        for item in F.items:
            print(f"  [{item['severity']}] {item['ruleId']} {item['subject']}: {item['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
